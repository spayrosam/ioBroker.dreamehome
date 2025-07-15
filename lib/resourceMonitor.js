const { monitorEventLoopDelay, PerformanceObserver, performance } = require('perf_hooks');
const { setImmediate } = require('timers/promises');
const { writeHeapSnapshot } = require('v8');
const { EventEmitter } = require('events');

// ==============================================
// Central Configuration Manager
// ==============================================

class MonitoringConfig {
  constructor(adapter) {
    this.adapter = adapter;

    // Default configuration values
    this.defaults = {
      intervalMs: 30,          // Default monitoring interval: 30 seconds
      heapLimitMb: 150,           // Default heap limit: 150 MB
      lagLimitMs: 50,             // Default event loop lag limit: 50ms
      gcEnabled: true,            // GC enabled by default
      profilingEnabled: false,    // Profiling disabled by default
      memoryCleaner: {
        enabled: false,           // Memory cleaner disabled by default
        thresholdMB: 300,         // Cleanup threshold: 300MB
        intervalSec: 30,          // Check every 30 seconds
        priority: 'medium',       // Default cleanup priority
        heapLimitMB: 100          // Heap limit for restart logic
      }
    };

    // Load initial configuration
    this.loadConfig();
  }

  // Load configuration from adapter settings
  loadConfig() {
    const adapterConfig = this.adapter.config || {};

    this.current = {
      intervalMs: adapterConfig.intervalMs || this.defaults.intervalMs,
      heapLimitMb: adapterConfig.heapLimitMb || this.defaults.heapLimitMb,
      lagLimitMs: adapterConfig.eventLoopLagLimitMs || this.defaults.lagLimitMs,
      gcEnabled: adapterConfig.gcEnabled !== false, // Default true
      profilingEnabled: adapterConfig.profilingEnabled || this.defaults.profilingEnabled,
      memoryCleaner: {
        enabled: adapterConfig.memoryCleanerEnabled || this.defaults.memoryCleaner.enabled,
        thresholdMB: adapterConfig.memoryCleanerThresholdMB || this.defaults.memoryCleaner.thresholdMB,
        intervalSec: adapterConfig.memoryCleanerIntervalSec || this.defaults.memoryCleaner.intervalSec,
        priority: adapterConfig.memoryCleanerPriority || this.defaults.memoryCleaner.priority,
        heapLimitMB: adapterConfig.heapLimitMB || this.defaults.memoryCleaner.heapLimitMB
      }
    };
  }

  // Update configuration with new values
  updateConfig(newConfig) {
    // Deep merge for memoryCleaner settings
    if (newConfig.memoryCleaner) {
      this.current.memoryCleaner = {
        ...this.current.memoryCleaner,
        ...newConfig.memoryCleaner
      };
      delete newConfig.memoryCleaner;
    }

    // Merge remaining config
    Object.assign(this.current, newConfig);
    this.saveToAdapter();
  }

  // Save current configuration back to adapter
  saveToAdapter() {
    this.adapter.config = {
      ...this.adapter.config,
      intervalMs: this.current.intervalMs,
      heapLimitMb: this.current.heapLimitMb,
      eventLoopLagLimitMs: this.current.lagLimitMs,
      gcEnabled: this.current.gcEnabled,
      profilingEnabled: this.current.profilingEnabled,
      memoryCleanerEnabled: this.current.memoryCleaner.enabled,
      memoryCleanerThresholdMB: this.current.memoryCleaner.thresholdMB,
      memoryCleanerIntervalSec: this.current.memoryCleaner.intervalSec,
      memoryCleanerPriority: this.current.memoryCleaner.priority,
      heapLimitMB: this.current.memoryCleaner.heapLimitMB
    };
  }

  // Get current configuration (deep copy)
  getConfig() {
    return JSON.parse(JSON.stringify(this.current));
  }
}

// ==============================================
// Resource Monitoring Class
// ==============================================

class ResourceMonitor {
  constructor(adapter, config) {
    this.adapter = adapter;
    this.config = config; // Use centralized config

    // Initialize event loop delay monitoring
    this.delayMonitor = monitorEventLoopDelay();
    this.interval = null;
    this.isRunning = false;
  }

  // Format uptime seconds to human-readable string
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const result = [];
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);
    result.push(`${secs}s`);

    return result.join(' ');
  }

  // Start the monitoring interval
  async start() {
    if (this.isRunning) return;

    this.delayMonitor.enable();
    this.isRunning = true;

    this.adapter.log.info(`Resource monitor started (interval: ${this.config.intervalMs / 1000}s)`);

    // Start monitoring interval
    this.interval = setInterval(() => this.monitor(), this.config.intervalMs * 1000);
    return this.monitor(); // Initial immediate run
  }

  // Stop the monitoring
  stop() {
    if (!this.isRunning) return;

    clearInterval(this.interval);
    this.delayMonitor.disable();
    this.isRunning = false;
    this.adapter.log.info('Resource monitor stopped');
  }

  // Main monitoring function that collects all metrics
  async monitor() {
    try {
      // Collect all metrics in parallel
      const [mem, cpu, uptime] = await Promise.all([
        this.getMemoryUsage(),
        this.getCpuUsage(),
        this.getUptime()
      ]);

      // Calculate event loop lag (mean in milliseconds)
      const eventLoopLag = this.delayMonitor.mean / 1e6;
      this.delayMonitor.reset();

      // Prepare status object
      const status = {
        memory: {
          heapUsed: mem.heapUsed,
          rss: mem.rss,
          status: this.getHeapStatus(mem.heapUsed)
        },
        cpu: {
          user: cpu.user,
          system: cpu.system
        },
        eventLoop: {
          lag: eventLoopLag,
          status: this.getLagStatus(eventLoopLag)
        },
        uptime
      };

      // Save metrics and check for warnings
      await this.saveMetrics(status);
      await this.checkWarnings(status);

      // Run manual GC if enabled
      if (this.config.gcEnabled && global.gc) {
        await setImmediate();
        global.gc();
        this.adapter.log.debug('Manual GC executed');
      }
    } catch (err) {
      this.adapter.log.error(`Monitoring error: ${err.message}`);
    }
  }

  // Get current memory usage in MB
  async getMemoryUsage() {
    const mem = process.memoryUsage();
    return {
      heapUsed: +(mem.heapUsed / 1024 / 1024).toFixed(2),
      rss: +(mem.rss / 1024 / 1024).toFixed(2)
    };
  }

  // Get CPU usage in milliseconds
  async getCpuUsage() {
    const cpu = process.cpuUsage();
    return {
      user: +(cpu.user / 1000).toFixed(2),
      system: +(cpu.system / 1000).toFixed(2)
    };
  }

  // Get process uptime in seconds
  async getUptime() {
    return process.uptime();
  }

  // Determine heap usage status based on configured limits (Mb)
  getHeapStatus(heapUsed) {
    if (heapUsed > this.config.heapLimitMb * 1.5) return 'Critical';
    if (heapUsed > this.config.heapLimitMb) return 'High';
    if (heapUsed > this.config.heapLimitMb * 0.5) return 'Moderate';
    return 'OK';
  }

  // Determine event loop lag status (ms)
  getLagStatus(lag) {
    if (lag > this.config.lagLimitMs * 2) return 'Critical';
    if (lag > this.config.lagLimitMs) return 'High';
    if (lag > this.config.lagLimitMs * 0.6) return 'Moderate';
    if (lag > this.config.lagLimitMs * 0.3) return 'Slight';
    return 'OK';
  }

  // Save all metrics to ioBroker states
  async saveMetrics(metrics) {
    try {
      await Promise.all([
        this.adapter.setStateAsync('resources.memory.heapUsedMB', { val: metrics.memory.heapUsed, ack: true }),
        this.adapter.setStateAsync('resources.memory.rssMB', { val: metrics.memory.rss, ack: true }),
        this.adapter.setStateAsync('resources.cpu.userMs', { val: metrics.cpu.user, ack: true }),
        this.adapter.setStateAsync('resources.cpu.systemMs', { val: metrics.cpu.system, ack: true }),
        this.adapter.setStateAsync('resources.eventLoopLagMs', { val: metrics.eventLoop.lag, ack: true }),
        this.adapter.setStateAsync('resources.uptimeSec', {
          val: metrics.uptime,
          ack: true
        }),
        this.adapter.setStateAsync('resources.uptimeFormatted', {
          val: this.formatUptime(metrics.uptime),
          ack: true
        }),
        this.adapter.setStateAsync('resources.eventLoopLagStatus', { val: metrics.eventLoop.status, ack: true }),
        this.adapter.setStateAsync('resources.memory.heapUsedStatus', { val: metrics.memory.status, ack: true })
      ]);
    } catch (err) {
      this.adapter.log.error(`Failed to save metrics: ${err.message}`);
    }
  }

  // Check for warning conditions and log them
  async checkWarnings(metrics) {
    const warnings = [];

    if (metrics.memory.heapUsed > this.config.heapLimitMb) {
      warnings.push(`Heap usage: ${metrics.memory.heapUsed} MB > ${this.config.heapLimitMb} MB`);
    }

    if (metrics.eventLoop.lag > this.config.lagLimitMs) {
      warnings.push(`Event loop lag: ${metrics.eventLoop.lag.toFixed(2)} ms > ${this.config.lagLimitMs} ms`);
    }

    if (warnings.length > 0) {
      await this.adapter.setStateAsync('resources.log', {
        val: warnings.join('\n'),
        ack: true
      });
      warnings.forEach(warning => this.adapter.log.warn(warning));
    }
  }
}

// ==============================================
// Function Profiler Class
// ==============================================

class FunctionProfiler {
  constructor(adapter) {
    this.adapter = adapter;
    this.profilingEnabled = false;
    this.trackedMethods = new Map();
    this.executionStats = {
      totalCalls: 0,
      totalDuration: 0,
      startTime: Date.now()
    };
  }

  // Enable or disable profiling
  setEnabled(enabled) {
    if (this.profilingEnabled === enabled) return;

    this.profilingEnabled = enabled;
    this.adapter.log.info(`Profiling ${enabled ? 'ENABLED' : 'DISABLED'}`);

    if (!enabled) {
      this.clearProfilingData();
    }
  }

  // Clear all collected profiling data
  clearProfilingData() {
    this.trackedMethods.clear();
    this.executionStats = {
      totalCalls: 0,
      totalDuration: 0,
      startTime: Date.now()
    };
    this.adapter.log.info('Profiling data cleared');
  }

  // Profile a function call ( name - Function name / fn - Function to profile)
  async profile(name, fn) {
    if (!this.profilingEnabled) return fn();

    const startMem = process.memoryUsage();
    const startCpu = process.cpuUsage();
    const startTime = process.hrtime.bigint();

    try {
      return await fn();
    } finally {
      const durationNs = Number(process.hrtime.bigint() - startTime);
      const durationMs = durationNs / 1e6;

      // Update global stats
      this.executionStats.totalCalls++;
      this.executionStats.totalDuration += durationMs;

      // Get or create method stats
      const methodStats = this.trackedMethods.get(name) || {
        callCount: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        memoryUsage: [],
        cpuUsage: []
      };

      // Update method stats
      methodStats.callCount++;
      methodStats.totalDuration += durationMs;
      methodStats.minDuration = Math.min(methodStats.minDuration, durationMs);
      methodStats.maxDuration = Math.max(methodStats.maxDuration, durationMs);

      // Track memory changes
      methodStats.memoryUsage.push({
        heapUsed: process.memoryUsage().heapUsed - startMem.heapUsed,
        rss: process.memoryUsage().rss - startMem.rss,
        timestamp: Date.now()
      });

      // Track CPU changes
      methodStats.cpuUsage.push({
        user: process.cpuUsage(startCpu).user,
        system: process.cpuUsage(startCpu).system,
        timestamp: Date.now()
      });

      // Store updated stats
      this.trackedMethods.set(name, methodStats);

      // Periodically update states
      if (this.executionStats.totalCalls % 10 === 0) {
        await this.updateProfilingStates();
      }
    }
  }

  // Format bytes to KB/MB - Memory bytes
  formatMemory(bytes) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  }

  // Format milliseconds to ms/s
  formatDuration(ms) {
    return ms > 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(2)} ms`;
  }

  // Calculate statistics from values
  calculateStats(values) {
    if (values.length === 0) return null;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      avg: parseFloat(avg.toFixed(2)),
      min: parseFloat(sorted[0].toFixed(2)),
      max: parseFloat(sorted[sorted.length - 1].toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      samples: values.length
    };
  }

  // Update ioBroker states with profiling data
  async updateProfilingStates() {
    try {
      const now = Date.now();
      const hoursRunning = (now - this.executionStats.startTime) / (1000 * 60 * 60);

      // Prepare method details
      const methodDetails = Array.from(this.trackedMethods.entries()).map(([name, stats]) => {
        const heapStats = this.calculateStats(stats.memoryUsage.map(m => m.heapUsed));
        const rssStats = this.calculateStats(stats.memoryUsage.map(m => m.rss));
        const cpuUserStats = this.calculateStats(stats.cpuUsage.map(c => c.user / 1000));
        const cpuSystemStats = this.calculateStats(stats.cpuUsage.map(c => c.system / 1000));

        return {
          name,
          calls: stats.callCount,
          duration: {
            total: this.formatDuration(stats.totalDuration),
            avg: this.formatDuration(stats.totalDuration / stats.callCount),
            min: this.formatDuration(stats.minDuration),
            max: this.formatDuration(stats.maxDuration)
          },
          memory: {
            heap: heapStats ? {
              avg: this.formatMemory(heapStats.avg),
              min: this.formatMemory(heapStats.min),
              max: this.formatMemory(heapStats.max),
              samples: heapStats.samples
            } : null,
            rss: rssStats ? {
              avg: this.formatMemory(rssStats.avg),
              min: this.formatMemory(rssStats.min),
              max: this.formatMemory(rssStats.max),
              samples: rssStats.samples
            } : null
          },
          cpu: {
            user: cpuUserStats ? {
              avg: this.formatDuration(cpuUserStats.avg),
              min: this.formatDuration(cpuUserStats.min),
              max: this.formatDuration(cpuUserStats.max),
              samples: cpuUserStats.samples
            } : null,
            system: cpuSystemStats ? {
              avg: this.formatDuration(cpuSystemStats.avg),
              min: this.formatDuration(cpuSystemStats.min),
              max: this.formatDuration(cpuSystemStats.max),
              samples: cpuSystemStats.samples
            } : null
          },
          lastCalled: new Date(Math.max(...stats.memoryUsage.map(m => m.timestamp))).toISOString()
        };
      });

      // Prepare summary
      const summary = {
        enabled: this.profilingEnabled,
        runtime: this.formatDuration(now - this.executionStats.startTime),
        hoursRunning: parseFloat(hoursRunning.toFixed(2)),
        totalMethodsTracked: this.trackedMethods.size,
        totalCalls: this.executionStats.totalCalls,
        callsPerHour: parseFloat((this.executionStats.totalCalls / hoursRunning).toFixed(1)),
        avgCallDuration: this.formatDuration(this.executionStats.totalDuration / this.executionStats.totalCalls),
        lastUpdated: new Date().toISOString()
      };

      // Identify top performance issues
      const topIssues = [...methodDetails]
        .sort((a, b) => b.duration.avg.localeCompare(a.duration.avg))
        .slice(0, 10)
        .map(method => ({
          method: method.name,
          calls: method.calls,
          avgDuration: method.duration.avg,
          memoryImpact: method.memory.heap?.avg || 'N/A',
          cpuImpact: method.cpu.user?.avg || 'N/A',
          lastCalled: method.lastCalled
        }));

      // Save all data to states
      await Promise.all([
        this.adapter.setStateAsync('resources.profiling.enabled', {
          val: this.profilingEnabled,
          ack: true
        }),
        this.adapter.setStateAsync('resources.profiling.stats', {
          val: JSON.stringify({ summary, methods: methodDetails }, null, 2),
          ack: true
        }),
        this.adapter.setStateAsync('resources.profiling.topIssues', {
          val: JSON.stringify({
            timestamp: new Date().toISOString(),
            issues: topIssues
          }, null, 2),
          ack: true
        }),
        this.adapter.setStateAsync('resources.profiling.trackedMethodsCount', {
          val: this.trackedMethods.size,
          ack: true
        })
      ]);

    } catch (err) {
      this.adapter.log.error(`Failed to update profiling states: ${err.message}`);
    }
  }

  // Automatically wrap all methods in an object for profiling
  autoWrapAll(target) {
    const WHITELIST = [
      'DH_CloudLogin',
      'DH_PropObject',
      'DH_URLRequest',
      'decryptDreameMap',
      'decodeMapToJSON',
      'DH_RequestNewMap',
      'parseRoboMap',
      'drawBackground',
      'drawRooms',
      'drawWalls',
      'updateFloorsBasedOnMaps',
      'createFloorStates',
      'DH_getFile',
      'DH_GetSetRooms',
      'processRooms',
      'DH_setPath',
      'DH_setRoomPath',
      'DH_setRoomIDPath',
      'DH_setCarpetPath',
      'DH_RequestControlState',
      'DH_GenerateMap',
      'DH_getMapFromCanvas',
      'DH_getCenterCoordsFromCanvas',
      'DH_hexToRgbA',
      'DH_Clean',
      'DH_Base64DecodeUnicode',
      'DH_GetRobotPosition',
      'calculateTotalCoverage',
      'createRoomStates',
      'updateRoomStates',
      'resetVariables',
      'getPointsBetween',
      'calculateCoveragePercent',
      'calculatePolygonArea',
      'CalculateRoomCenter',
      'DH_GetControl',
      'DH_URLSend',
      'DH_connectMqtt',
      'DH_connectMqttOld',
      'DH_SetPropSPID',
      'DH_uncompress',
      'DH_PropMQTTObject',
      'DH_SetHistory',
      'initWaterTracking',
      'updateWaterConsumption',
      'updateConsumptionData',
      'updateLearningStats',
      'handleTankStatusChange',
      'calculateConsumptionAccuracy',
      'updateWeightedAverage',
      'calculateConsumptionStats',
      'calculateSmartRefillRatio',
      'updateWaterLevelState',
      'getWaterConsumptionRate',
      'getConsumptionData',
      'saveWaterData',
      'handleCleaningStart',
      'handleCleaningComplete',
      'calculateTotalConsumption',
      'getTotalCleanedArea',
      'updateWaterConsumptionStats',
      'startAutoSave',
      'stopAutoSave',
      'checkInitialCleaningStatus',
      'restoreWaterTankData',
      'restorePersistedData',
      'getCurrentWater',
      'getStateValue',
      'setcleansetPath',
      'jsonFromString',
      'DH_GetSetRoomCleanSettings',
      'DH_GSRCS',
      'DH_CleanZonePoint',
      'DH_SendActionCleanCarpet',
      'DH_refreshToken',
      'DH_AlexasuctionLevel',
      'DH_AlexamoppingLevel',
      'normalizeAlexaRoomsNameSynonyms',
      'processCommand',
      'determineCleaningSettings',
      'applyCleaningSettings',
      'setCleaningModeWithRetry',
      'checkCleaningStatus',
      'startNextRoomCleaning',
      'startCleaning',
      'startAutoEmpty',
      'tryResumeCleaning',
      'startAutoWash',
      'waitUntilDocked',
      'checkSingleComponentStatus',
      'matchComponentBySynonym',
      'checkRobotStatus',
      'speakStatusInParts',
      'estimateWaitTime',
      'resetSingleComponent',
      'resetAllComponents',
      'updateSpeakMode',
      'speakToAlexa',
      'buildCleanDataFromObjects',
      'getValidRoomSelect',
      'groupAndSortRoomsByModeAndOrder',
      'checkForMissingCleaningAttributes',
      'onUnload'
    ];

    const EXCLUDE_ALL = [
      'findStartPixel',
      'traceContourSafe',
      'createExactRoomPolygon',
      'buildPixelMap',
      'findAllContoursSafe',
      'findHoleSeeds',
      'isValidHole',
      'getPolygonCentroid',
      'MapcalculatePolygonArea',
      'getContourBounds',
      'isPointInsidePolygon',
      'createOptimizedRoomPolygon',
      'createCompletePolygonStructure',
      'on',
      'subscribe',
      'unsubscribe',
      'config',
      'log',
      'setState',
      'setStateAsync',
      'getState',
      'getStateAsync',
      'getObjectAsync',
      'setForeignState',
      'setForeignStateAsync',
      'getForeignState',
      'getForeignStateAsync',
      'sendTo',
      'sendToAsync',
      'subscribeStates',
      'unsubscribeStates',
      'terminate',
      'ready',
      'on',
      'DH_requestClient',
      'traceContourSafe',
      'createExactRoomPolygon',
      'findStartPixel',
      'createExactRoomPolygon',
      'DH_setState',
      'DH_getType',
      'DH_CheckTaskStatus',
      'DH_SearchIID',
      'main',
      'resources',
      '_stateChange',
      'emit',
      'constructor',
      'toJSON',
    ];

    // Get all methods from prototype and own properties
    Object.getOwnPropertyNames(Object.getPrototypeOf(target))
      .concat(Object.keys(target))
      .filter(key =>
        typeof target[key] === 'function' &&
        WHITELIST.includes(key) &&
        !EXCLUDE_ALL.includes(key)
      )
      .forEach(key => {
        const original = target[key];
        target[key] = async (...args) => {
          return this.profile(key, () => original.apply(target, args));
        };
        this.adapter.log.debug(`[Profiler] Whitelisted: ${key}`);
      });

    this.adapter.log.info(`Profiling ${WHITELIST.length} whitelisted methods`);
  }
}

// ==============================================
// RestartManager Class
// ==============================================

class RestartManager {

  constructor(adapter, config = {}) {
    this.adapter = adapter;
    this.cooldownMs = config.cooldownMs || 3600000; // 1 hour default
    this.maxAttempts = config.maxAttempts || 1; // Max attempts within cooldown
    this.lastAttemptTime = 0;
  }

  /**
   * Execute a controlled restart
   * @param {string} reason - Reason for restart
   * @param {boolean} [force=false] - Bypass cooldown restriction
   * @returns {Promise<{success: boolean, nextAttempt: number}>}
   */
  async execute(reason, force = false) {
    const now = Date.now();

    try {
      const state = await this.adapter.getStateAsync('resources.system.lastRestartAttempt');
      if (state?.val) {
        this.lastAttemptTime = new Date(state.val).getTime();
      }
    } catch (err) {
      this.adapter.log.warn(`Failed to read lastRestartAttempt: ${err.message}`);
    }

    this.adapter.log.debug(`Restart check: now=${now} | lastAttempt=${this.lastAttemptTime} | cooldown=${this.cooldownMs}`);

    if (!force && this._isInCooldown(now)) {
      const nextAt = this._nextPossibleAttempt();
      this.adapter.log.warn(
        `Restart blocked. Last attempt: ${new Date(this.lastAttemptTime).toISOString()}. ` +
        `Next attempt: ${new Date(nextAt).toISOString()}`
      );
      return { success: false, nextAttempt: nextAt };
    }

    try {
      await this._prepareRestart(reason, now);
      this.lastAttemptTime = now;

      const mem = process.memoryUsage();
      this.adapter.log.warn(
        `Initiating restart (Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB) - ` +
        `Reason: ${reason}`
      );

      await this._performRestart();
      return { success: true, nextAttempt: 0 };

    } catch (error) {
      this.adapter.log.error(`Restart failed: ${error.message}`);
      await this._handleError(error, now);
      return { success: false, nextAttempt: now + this.cooldownMs };
    }
  }

  // Prepare for restart (state updates and cleanup)
  async _prepareRestart(reason, timestamp) {
    // Update essential states only
    await Promise.all([
      this.adapter.setStateAsync('resources.system.lastRestartReason', reason, true),
      this.adapter.setStateAsync('resources.system.lastRestartAttempt', timestamp, true),
	  this.adapter.setStateAsync('resources.memoryCleaner.triggerCleanup', false, true)
    ]);

    // Perform resource cleanup
    await this._cleanupResources();
  }

  // Clean up resources before restart
  async _cleanupResources() {
    try {
      const cleanupTasks = [];

      // Add all cleanup operations
      if (typeof this.adapter.unsubscribeAll === 'function') {
        cleanupTasks.push(this.adapter.unsubscribeAll());
      }

      if (typeof this.adapter.stopAllTimers === 'function') {
        cleanupTasks.push(this.adapter.stopAllTimers());
      }

      // Execute all cleanup tasks in parallel
      await Promise.allSettled(cleanupTasks);

    } catch (cleanupError) {
      this.adapter.log.warn(`Resource cleanup encountered errors: ${cleanupError.message}`);
    }
  }

  // Perform the actual restart
  async _performRestart() {
    await new Promise(resolve => setTimeout(resolve, 500));

    return new Promise((resolve) => {
      setTimeout(() => {
        if (typeof this.adapter.restartAdapter === 'function') {
          this.adapter.restartAdapter(parseInt(process.env.INSTANCE));
        } else {
          process.exit(1);
        }
        resolve();
      }, 3000); // Graceful delay
    });
  }

  // Check if in cooldown period
  _isInCooldown(currentTime) {
    return (currentTime - this.lastAttemptTime) < this.cooldownMs;
  }

  // Calculate next possible attempt time
  _nextPossibleAttempt() {
    return this.lastAttemptTime + this.cooldownMs;
  }

  // Handle restart errors
  async _handleError(error, timestamp) {
    await this.adapter.setStateAsync('resources.system.restartError', {
      val: JSON.stringify({
        timestamp,
        error: error.message,
        stack: error.stack
      }),
      ack: true
    });
  }
}
// ==============================================
// SafeMemoryManager Class
// ==============================================

const MAX_DRAIN_CYCLES = 500; // Safety limit for event loop draining
const DRAIN_REPORT_INTERVAL = 25; // Log progress every 25 cycles

class SafeMemoryManager extends EventEmitter {
  constructor(adapter = console) {
    super();
    this.adapter = adapter;
    this.log = (adapter.log || adapter);
    if (typeof this.log.info !== 'function') {
      this.log = console;
    }

    // Initialize RestartManager
    this.restartManager = new RestartManager(adapter, {
      cooldownMs: 3600000, // 1 hour
      maxAttempts: 3
    });

    // Internal state
    this.history = [];
    this.gcStats = [];
    this._isCleaning = false;
    this._gcObserver = null;
    this._autoCleanupInterval = null;
    this._protectedModules = new Set(['node_modules']);
    this._gcWarningShown = false;

    // Check GC availability
    this.gcAvailable = (typeof global.gc === 'function');
    if (!this.gcAvailable && !this._gcWarningShown) {
      this.log.warn('GC not exposed. Start Node with "--expose-gc" for full functionality');
      this._gcWarningShown = true;
    }

    // Cleanup settings (adjusted for non-GC environments)
    this.settings = this._validateSettings({
      low:    { gcRuns: this.gcAvailable ? 3 : 0,  drainTimeMs: 50,  gcTimeoutMs: 2000 },
      medium: { gcRuns: this.gcAvailable ? 5 : 0,  drainTimeMs: 100, gcTimeoutMs: 3000 },
      high:   { gcRuns: this.gcAvailable ? 7 : 0,  drainTimeMs: 200, gcTimeoutMs: 5000 }
    });

    this._setupGCObserver();
  }

  // Perform comprehensive memory cleanup - Cleanup priority ('low', 'medium', 'high')
  async comprehensiveClean(priority = 'medium') {
    const baseResult = {
      success: false,
      freedBytes: 0,
      durationMs: 0,
      methods: [],
      memoryBefore: this._getSafeMemoryStats(),
      memoryAfter: null,
      error: null,
      timestamp: Date.now(),
      restartAttempted: false,
      restartDetails: null
    };

    if (this._isCleaning) {
      baseResult.error = 'Memory cleanup already in progress';
      this.log.warn(baseResult.error);
      return baseResult;
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      priority = 'medium';
      this.log.warn(`Invalid priority '${priority}', defaulting to 'medium'`);
    }

    const config = this.settings[priority] || this.settings.medium;
    this._isCleaning = true;
    const startTime = performance.now();

    this.log.debug(`Cleanup started (GC available: ${this.gcAvailable}, priority: ${priority})`);

    try {
      this.emit('cleanupStart', { priority });

      // Step 1: Drain event loop
      const drainResult = await this._drainEventLoop(config.drainTimeMs);
      baseResult.methods.push(drainResult);

      // Step 2: Run GC if available, otherwise alternative methods
      if (this.gcAvailable) {
        const gcResult = await this._runGarbageCollection(
          config.gcRuns,
          config.gcTimeoutMs
        );
        baseResult.methods.push(gcResult);
        baseResult.gcEvents = this._getRecentGCEvents(config.gcRuns);
      } else {
        const altResult = await this._runAlternativeCleanup();
        baseResult.methods.push(altResult);
      }

      // Step 3: Final measurement
      baseResult.memoryAfter = this._getSafeMemoryStats();
      baseResult.freedBytes = baseResult.memoryBefore.heapUsed - baseResult.memoryAfter.heapUsed;
      baseResult.durationMs = performance.now() - startTime;
      baseResult.success = true;

      // High Priority Restart Logic using RestartManager
      if (priority === 'high') {
        const heapUsedMB = baseResult.memoryAfter.heapUsed / (1024 * 1024);
        const heapLimitMB = this.adapter.config?.heapLimitMb || 100;

        if (baseResult.freedBytes < (1024 * 1024) && heapUsedMB > heapLimitMB * 1) {
          const restartResult = await this.restartManager.execute(
            `Critical memory state: Freed only ${(baseResult.freedBytes/(1024*1024)).toFixed(2)}MB, heap at ${heapUsedMB.toFixed(2)}MB (Limit: ${heapLimitMB}MB)`
          );

          baseResult.restartAttempted = restartResult.success;
          baseResult.restartDetails = restartResult;
        }
      }

      this._checkForMemoryLeaks(baseResult);
      this._storeResults(baseResult);
      this._logCleanupSummary(baseResult);
      this.emit('cleanupComplete', baseResult);

    } catch (error) {
      baseResult.error = error.message;
      baseResult.memoryAfter = this._getMemoryStats();
      baseResult.durationMs = performance.now() - startTime;
      this._handleCleanupError(error);
    } finally {
      this._isCleaning = false;
    }

    return baseResult;
  }

  // Safely get memory stats with fallback
  _getSafeMemoryStats() {
    try {
      const mem = process.memoryUsage();
      return {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
        timestamp: Date.now()
      };
    } catch (err) {
      this.log.silly('Memory stats error:', err);
      return {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
        timestamp: Date.now()
      };
    }
  }

  // Alternative cleanup methods when GC is not available.
  async _runAlternativeCleanup() {
    // 1. Manual cache cleanup
    const cacheInfo = this._clearOptionalCaches();

    // 2. Suggest memory release
    await this._suggestMemoryRelease();

    return {
      success: true,
      freedBytes: 0, // Can't measure without GC
      actions: ['cache_cleanup', 'memory_release_suggested']
    };
  }

  // Clears optional caches (excluding protected modules).
  _clearOptionalCaches() {
    const protectedPatterns = [/node_modules/, /core-js/, /adapter\.js/];
    let cleared = 0;

    Object.keys(require.cache).forEach(modulePath => {
      if (!protectedPatterns.some(regex => regex.test(modulePath))) {
        delete require.cache[modulePath];
        cleared++;
      }
    });

    this.log.debug(`Cleared ${cleared} module caches`);
    return { cleared };
  }

  // Suggests memory release by inducing idle time.
  async _suggestMemoryRelease() {
    // Try to release memory by introducing idle time
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms pause
    this.emit('memoryReleaseSuggested');
  }

  // Drains the event loop for a short period.
  async _drainEventLoop(durationMs) {
    const start = Date.now();
    let cycles = 0;
    let lastReport = start;

    try {
      this.log.debug(`Draining event loop for ${durationMs}ms (max ${MAX_DRAIN_CYCLES} cycles)`);

      while ((Date.now() - start < durationMs) && (cycles < MAX_DRAIN_CYCLES)) {
        await new Promise(resolve => setTimeout(resolve, 0)); // Short pause (0ms)

        cycles++;

        if ((Date.now() - lastReport) > DRAIN_REPORT_INTERVAL) {
          this.log.silly(`Drain progress: ${cycles} cycles, ${Date.now() - start}ms elapsed`);
          lastReport = Date.now();
        }
      }

      const actualDuration = Date.now() - start;
      const warning = (cycles >= MAX_DRAIN_CYCLES) ? 'max_cycles_reached' : null;

      if (warning) {
        this.log.warn(`Drain stopped early: max cycles (${MAX_DRAIN_CYCLES}) reached.`);
      }

      this.log.debug(`Drain completed: ${cycles} cycles in ${actualDuration}ms`);

      return {
        success: true,
        cycles,
        durationMs: actualDuration,
        warning
      };

    } catch (err) {
      const elapsed = Date.now() - start;
      this.log.error(`Drain error after ${cycles} cycles (${elapsed}ms): ${err.message}`);
      return {
        success: false,
        error: err.message,
        cycles,
        durationMs: elapsed
      };
    }
  }

  // Repeatedly triggers garbage collection with fallback timeout (only when available).
  _runGarbageCollection(maxRuns, timeoutMs) {
    if (!this.gcAvailable) {
      return {
        method: 'multi_gc',
        success: false,
        error: 'GC not available'
      };
    }

    return Promise.race([
      new Promise((resolve, reject) => {
        let runs = 0;
        let freedTotal = 0;
        const gcDurations = [];
        let lastHeap = this._getMemoryStats().heapUsed;

        const runGC = async () => {
          try {
            const gcStart = performance.now();
            global.gc();
            const gcDuration = performance.now() - gcStart;

            const currentHeap = this._getMemoryStats().heapUsed;
            const freed = lastHeap - currentHeap;

            runs++;
            freedTotal += freed;
            lastHeap = currentHeap;
            gcDurations.push(gcDuration);

            if (runs < maxRuns && (freed > 1 * 1024 * 1024 || runs < 3)) {
              setImmediate(runGC);
            } else {
              resolve({
                method: 'multi_gc',
                success: true,
                runs,
                freedBytes: freedTotal,
                avgDurationMs: gcDurations.reduce((sum, d) => sum + d, 0) / gcDurations.length
              });
            }
          } catch (err) {
            reject({ method: 'multi_gc', success: false, error: err.message });
          }
        };

        runGC(); // Start the GC process
      }),
      new Promise(resolve => setTimeout(() => resolve({
        method: 'multi_gc',
        success: false,
        error: `GC timeout after ${timeoutMs}ms`
      }), timeoutMs))
    ]);
  }


  // Adds a module path to the protection list to avoid being cleared.
  protectModule(modulePath) {
    if (typeof modulePath === 'string') {
      this._protectedModules.add(modulePath);
    }
  }

  // Clears the require cache, optionally forcing it completely.
  clearModuleCache(options = {}) {
    const { force = false } = options;

    if (!force && this._protectedModules.size === 0) {
      throw new Error('No modules protected. Use force=true to clear all');
    }

    let cleared = 0;
    Object.keys(require.cache).forEach(key => {
      if (force || !this._isProtectedModule(key)) {
        delete require.cache[key];
        cleared++;
      }
    });

    return { cleared, retained: Object.keys(require.cache).length };
  }

  // Enables automatic cleanup based on memory thresholds.
  enableAutoCleanup(options = {}) {
    this.disableAutoCleanup();

    const config = {
      thresholdMB: 300,
      intervalMinutes: 5,
      priority: 'medium',
      ...options
    };

    this._autoCleanupInterval = setInterval(async () => {
      if (this._isCleaning) return;

      const currentHeapMB = this._getMemoryStats().heapUsed / 1048576;
      if (currentHeapMB > config.thresholdMB) {
        try {
          await this.comprehensiveClean(config.priority);
        } catch (error) {
          this.log.error(`Auto-cleanup failed: ${error.message}`);
        }
      }
    }, config.intervalMinutes * 60000);

    this.log.info(`Auto-cleanup enabled (threshold: ${config.thresholdMB}MB)`);
  }

  disableAutoCleanup() {
    if (this._autoCleanupInterval) {
      clearInterval(this._autoCleanupInterval);
      this._autoCleanupInterval = null;
    }
  }

  // Starts a GC performance observer to track recent GC events.
  _setupGCObserver() {
    if (!this.gcAvailable) return;

    this._gcObserver = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        this.gcStats.push({
          kind: entry.kind,
          duration: entry.duration,
          timestamp: performance.now()
        });

        if (this.gcStats.length > 100) {
          this.gcStats = this.gcStats.slice(-100);
        }
      });
    });

    this._gcObserver.observe({ entryTypes: ['gc'], buffered: true });
  }

  // Returns a snapshot of memory usage with heap utilization.
  _getMemoryStats() {
    try {
      const mem = process.memoryUsage();
      return {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
        timestamp: Date.now()
      };
    } catch (err) {
      this.log.error('Memory stats failed:', err);
      return {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
        timestamp: Date.now()
      };
    }
  }

  // Emits an event if memory was not reduced significantly.
  _checkForMemoryLeaks(results) {
    const { memoryBefore, memoryAfter } = results;
    if (memoryAfter.heapUsed > memoryBefore.heapUsed * 0.9) {
      this.emit('potentialLeak', results);
    }
  }

  // Stores a limited number of cleanup history results.
  _storeResults(results) {
    this.history.push(results);
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
  }

  // Logs the summary of the last cleanup operation.
  _logCleanupSummary(results) {
    const freedMB = (results.memoryBefore.heapUsed - results.memoryAfter.heapUsed) / 1048576;
    this.log.info(`Freed ${freedMB.toFixed(2)}MB in ${results.durationMs.toFixed(1)}ms`);
  }

  // Handles cleanup errors via logging and events.
  _handleCleanupError(error) {
    this.emit('cleanupError', error);
    this.log.error(`Cleanup failed: ${error.message}`);
  }

  // Checks if a module path is in the protected list.
  _isProtectedModule(modulePath) {
    return Array.from(this._protectedModules).some(
      protectedPath => modulePath.includes(protectedPath)
    );
  }

  // Ensures that all settings are filled with defaults.
  _validateSettings(settings) {
    const defaults = { gcRuns: 3, drainTimeMs: 20, gcTimeoutMs: 2000 };
    return Object.fromEntries(
      Object.entries(settings).map(([key, config]) => [
        key,
        { ...defaults, ...config }
      ])
    );
  }

  // Returns the latest GC events (up to N).
  _getRecentGCEvents(count) {
    return this.gcStats.slice(-count);
  }

  // Calculates average memory reduction per cleanup in MB.
  getAverageMemoryReduction() {
    if (this.history.length === 0) return 0;

    const totalFreed = this.history.reduce((sum, entry) => {
      return sum + (entry.memoryBefore.heapUsed - entry.memoryAfter.heapUsed);
    }, 0);

    return (totalFreed / this.history.length / 1048576).toFixed(2);
  }

  // Returns the last cleanup result object.
  // Retrieves the most recent cleanup result object, or null if no cleanup has occurred yet.
  getLastCleanupResult() {
    return this.history[this.history.length - 1] || null;
  }
}

// ==============================================
// Initialization Function
// ==============================================

// Initialize all monitoring components
async function initMonitoring(adapter) {
  // Create central configuration
  const config = new MonitoringConfig(adapter);

  // Create all required objects
  const objects = [
    // Resource monitoring objects
    {
      id: 'resources.memory.heapUsedMB',
      common: {
        name: 'Heap Used (MB)',
        type: 'number',
        role: 'value',
        unit: 'MB',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.memory.heapUsedStatus',
      common: {
        name: 'Heap Usage Status',
        type: 'string',
        role: 'text',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.memory.rssMB',
      common: {
        name: 'RSS Memory (MB)',
        type: 'number',
        role: 'value',
        unit: 'MB',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.cpu.userMs',
      common: {
        name: 'CPU User Time (ms)',
        type: 'number',
        role: 'value',
        unit: 'ms',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.cpu.systemMs',
      common: {
        name: 'CPU System Time (ms)',
        type: 'number',
        role: 'value',
        unit: 'ms',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.eventLoopLagMs',
      common: {
        name: 'Event Loop Lag (ms)',
        type: 'number',
        role: 'value',
        unit: 'ms',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.eventLoopLagStatus',
      common: {
        name: 'Event Loop Lag Status',
        type: 'string',
        role: 'text',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.uptimeSec',
      common: {
        name: 'Uptime (s)',
        type: 'number',
        role: 'value',
        unit: 's',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.uptimeFormatted',
      common: {
        name: 'Uptime (s)',
        type: 'string',
        role: 'text',
        unit: '',
        read: true,
        write: false
      }
    },
    // Profiling control objects
    {
      id: 'resources.profiling.enabled',
      common: {
        name: 'Enable Profiling',
        type: 'boolean',
        role: 'switch',
        read: true,
        write: true,
        def: false
      }
    },
    {
      id: 'resources.profiling.stats',
      common: {
        name: 'Profiling Statistics',
        type: 'string',
        role: 'json',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.profiling.topIssues',
      common: {
        name: 'Top Performance Issues',
        type: 'string',
        role: 'json',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.profiling.trackedMethodsCount',
      common: {
        name: 'Tracked Methods Count',
        type: 'number',
        role: 'value',
        read: true,
        write: false
      }
    },
    // Memory cleaner objects
    {
      id: 'resources.memoryCleaner.triggerCleanup',
      common: {
        name: 'Trigger Memory Cleanup',
        type: 'boolean',
        role: 'button',
        read: false,
        write: true,
        def: false
      }
    },
    {
      id: 'resources.memoryCleaner.enabled',
      common: {
        name: 'Enable Memory Cleaner',
        type: 'boolean',
        role: 'switch',
        read: true,
        write: true,
        def: false
      }
    },
    {
      id: 'resources.memoryCleaner.thresholdMB',
      common: {
        name: 'Memory Threshold (MB)',
        type: 'number',
        role: 'value',
        unit: 'MB',
        read: true,
        write: true,
        def: 300
      }
    },
    {
      id: 'resources.memoryCleaner.intervalSec',
      common: {
        name: 'Check Interval (s)',
        type: 'number',
        role: 'value',
        unit: 's',
        read: true,
        write: true,
        def: 30
      }
    },
    {
      id: 'resources.memoryCleaner.priority',
      common: {
        name: 'Cleanup Priority',
        type: 'string',
        role: 'value',
        read: true,
        write: true,
        def: 'medium',
        states: {
		  'low': 'Low',
		  'medium': 'Medium',
		  'high': 'High'
        }
      }
    },
    {
      id: 'resources.memoryCleaner.heapLimitMB',
      common: {
        name: 'Heap Memory Limit (MB)',
        type: 'number',
        role: 'value.memory',
        unit: 'MB',
        min: 50,
        max: 1000,
        def: 100,
        read: true,
        write: true
      }
    },
    {
      id: 'resources.memoryCleaner.lastCleanup',
      common: {
        name: 'Last Cleanup',
        type: 'string',
        role: 'text',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.memoryCleaner.lastFreedMB',
      common: {
        name: 'Last Freed Memory (MB)',
        type: 'number',
        role: 'value',
        unit: 'MB',
        read: true,
        write: false
      }
    },
    // RestartManager objects
    {
      id: 'resources.system.lastRestartReason',
      common: {
        name: 'Last restart reason',
        type: 'string',
        role: 'text',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.system.restartError',
      common: {
        name: 'Last restart error',
        type: 'string',
        role: 'text',
        read: true,
        write: false
      }
    },
    {
      id: 'resources.system.lastRestartAttempt',
      common: {
        name: 'Last restart attempt timestamp',
        type: 'number',
        role: 'value.time',
        read: true,
        write: false
      }
    }
  ];

  // Create all objects
  for (const obj of objects) {
    await adapter.setObjectNotExistsAsync(obj.id, {
      type: 'state',
      common: obj.common,
      native: {}
    });
  }

  // Create monitor and profiler instances
  const monitor = new ResourceMonitor(adapter, config.getConfig());
  const profiler = new FunctionProfiler(adapter);
  profiler.setEnabled(config.current.profilingEnabled);
  profiler.autoWrapAll(adapter);

  const memoryManager = new SafeMemoryManager(adapter);

  // Memory Cleaner Auto-Start if enabled
  if (config.current.memoryCleaner.enabled) {
    memoryManager.enableAutoCleanup({
      thresholdMB: config.current.memoryCleaner.thresholdMB,
      intervalMinutes: config.current.memoryCleaner.intervalSec / 60,
      priority: config.current.memoryCleaner.priority
    });
  }

  // Start monitoring
  monitor.start();

  return {
    monitor,
    profiler,
    memoryManager,
    config  // Return config for external access
  };
}

module.exports = {
  MonitoringConfig,
  ResourceMonitor,
  FunctionProfiler,
  RestartManager,
  SafeMemoryManager,
  initMonitoring
};