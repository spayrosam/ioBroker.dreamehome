const zlib = require('zlib');
const crypto = require('crypto');

class DreameHistory {
  constructor(adapter, deviceId, userLang, cloudConfig) {
    this.adapter = adapter;
    this.deviceId = deviceId;
    this.userLang = userLang || 'EN';
    this.cloudConfig = cloudConfig;

    // Cloud credentials
    this.DH_Region = cloudConfig.region || 'eu';
    this.DH_Uid = cloudConfig.uid;
    this.DH_Model = cloudConfig.model;
    this.DH_NormalizedModel = cloudConfig.normalizedModel;
    this.DH_Auth = cloudConfig.authKey;
    this.DH_Tenant = cloudConfig.tenantId || '000000';
    this.DREAME_IVs = cloudConfig.DREAME_IVs || {};

    // URLs
    this.DH_URLDOWNURL = cloudConfig.urlDown;
    this.DH_URLUSA = cloudConfig.urlUsa;
    this.DH_URLAUTH = cloudConfig.urlAuth;
    this.DH_URLDRLC = cloudConfig.urlDreameRlc;
    this.DH_DHURLHIS = cloudConfig.urlDreameHis;
    this.DH_DHURLGDF = cloudConfig.urlDreameGDF;

    this.DH_RobotAesKey = cloudConfig.robotAesKey;
    this.refreshTokenMethod = cloudConfig.refreshTokenMethod;

    this._aesKey = null;
    this._aesKeyFetching = false;
    this._aesKeyPromise = null;

    // Statistics
    this.stats = {
      totalCleanings: 0,
      totalCruising: 0,
      totalArea: 0,
      totalTime: 0,
      firstCleaning: null,
      lastCleaning: null,
      lastUpdate: null,
      totalPaths: 0,
      totalObstacles: 0
    };

    // Update interval (5 minutes)
    this.updateInterval = 300000;
    this.updateTimer = null;

    // Cache for map files
    this.mapCache = new Map();
    this.imageCache = new Map();

    // Translations
    this.translations = this.getTranslations();

    // Flags for update handling
    this.isWaitingForUpdate = false;
    this.updateCheckInterval = 10000; // 10 seconds
    this.maxUpdateAttempts = 24; // Maximum 24 attempts (4 minutes)
    this.updateAttempts = 0;
    this.targetDate = null;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  // Initialize the history module
  async initialize() {
    this.adapter.log.info('[HISTORY] ========================================');
    this.adapter.log.info('[HISTORY] HISTORY MODULE INITIALIZING');
    this.adapter.log.info('[HISTORY] ========================================');

    try {
      // Create all required states in the adapter
      await this.createAllStates();

      // 1. Check if data already exists in states
      const existingCount = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.count`);

      if (existingCount && existingCount.val > 0) {
        this.adapter.log.info(`[HISTORY] Found ${existingCount.val} existing cleanings in states`);
        await this.loadStatistics();
      } else {
        this.adapter.log.info('[HISTORY] No existing history found, loading from cloud...');

        // 2. Load history from cloud
        const result = await this.fetchAllHistory(25);

        if (result && result.found) {
          this.adapter.log.info(`[HISTORY] Loaded ${result.newCleanings} cleanings from cloud`);
        } else {
          this.adapter.log.info('[HISTORY] No history available from cloud');
        }

        // 3. Update statistics
        await this.updateStatistics();
      }

      this.adapter.log.info('[HISTORY] Module successfully initialized');
      this.adapter.log.info(`[HISTORY]    - ${this.stats.totalCleanings} cleanings available`);
      this.adapter.log.info(`[HISTORY]    - ${this.stats.totalCruising} trips available`);
      this.adapter.log.info('[HISTORY] ========================================');

      return true;
    } catch (error) {
      this.adapter.log.error(`[HISTORY] Initialization failed: ${error.message}`);
      return false;
    }
  }

  // Create all necessary states for history data
  async createAllStates() {
    const basePath = `${this.deviceId}.history`;

    // Channels
    const channels = [
      { path: 'cleaning', name: 'Cleaning History' },
      { path: 'cruising', name: 'Cruising History' },
      { path: 'statistics', name: 'History Statistics' },
      { path: 'raw', name: 'Raw History Data' }
    ];

    for (const channel of channels) {
      await this.adapter.setObjectNotExistsAsync(`${basePath}.${channel.path}`, {
        type: 'channel',
        common: { name: channel.name },
        native: {}
      });
    }

    // Cleaning States
    const cleaningStates = [
      { id: 'cleaning.list', name: 'Cleaning History List (Formatted)', type: 'string', role: 'json', def: '{}', write: false },
      { id: 'cleaning.raw', name: 'Raw Cleaning History', type: 'string', role: 'json', def: '[]', write: false },
      { id: 'cleaning.latest', name: 'Latest Cleaning', type: 'string', role: 'json', def: '{}', write: false },
      { id: 'cleaning.count', name: 'Number of Cleanings', type: 'number', role: 'value', def: 0, write: false },
      { id: 'cleaning.byDate', name: 'Cleanings by Date', type: 'string', role: 'json', def: '{}', write: false },
      { id: 'cleaning.lastFile', name: 'Last Map File', type: 'string', role: 'text', def: '', write: false },
      { id: 'cleaning.lastKey', name: 'Last Map Key', type: 'string', role: 'text', def: '', write: false },
      { id: 'cleaning.paths', name: 'Cleaning Paths (tr data)', type: 'string', role: 'json', def: '[]', write: false },
      { id: 'cleaning.mapData', name: 'Full Map Data', type: 'string', role: 'json', def: '[]', write: false },
      { id: 'cleaning.completeMapData', name: 'Complete Map Data (all fields)', type: 'string', role: 'json', def: '{}', write: false },
	  { id: 'cleaning.sync', name: 'Trigger Cloud Sync', type: 'boolean', role: 'button', def: false, write: true },
	  { id: 'cleaning.loadDate', name: 'Load Cleaning by Date', type: 'string', role: 'text', def: '', write: true }
    ];

    for (const state of cleaningStates) {
      await this.adapter.setObjectNotExistsAsync(`${basePath}.${state.id}`, {
        type: 'state',
        common: {
          name: state.name,
          type: state.type,
          role: state.role,
          read: true,
          write: state.write !== false,
          def: state.def
        },
        native: {}
      });
    }

    // Cruising States
    const cruisingStates = [
      { id: 'cruising.list', name: 'Cruising History List', type: 'string', role: 'json', def: '{}', write: false },
      { id: 'cruising.latest', name: 'Latest Cruising', type: 'string', role: 'json', def: '{}', write: false },
      { id: 'cruising.count', name: 'Number of Cruising Trips', type: 'number', role: 'value', def: 0, write: false },
      { id: 'cruising.paths', name: 'Cruising Paths', type: 'string', role: 'json', def: '[]', write: false }
    ];

    for (const state of cruisingStates) {
      await this.adapter.setObjectNotExistsAsync(`${basePath}.${state.id}`, {
        type: 'state',
        common: {
          name: state.name,
          type: state.type,
          role: state.role,
          read: true,
          write: state.write !== false,
          def: state.def
        },
        native: {}
      });
    }

    // Statistics States
    const statsStates = [
      { id: 'statistics.totalCleanings', name: 'Total Cleanings', type: 'number', role: 'value', def: 0, write: false },
      { id: 'statistics.totalArea', name: 'Total Cleaned Area', type: 'number', role: 'value', unit: 'm²', def: 0, write: false },
      { id: 'statistics.totalTime', name: 'Total Cleaning Time', type: 'number', role: 'value', unit: 'min', def: 0, write: false },
      { id: 'statistics.averageArea', name: 'Average Area per Cleaning', type: 'number', role: 'value', unit: 'm²', def: 0, write: false },
      { id: 'statistics.averageTime', name: 'Average Time per Cleaning', type: 'number', role: 'value', unit: 'min', def: 0, write: false },
      { id: 'statistics.firstCleaning', name: 'First Cleaning Date', type: 'string', role: 'date', def: '', write: false },
      { id: 'statistics.lastCleaning', name: 'Last Cleaning Date', type: 'string', role: 'date', def: '', write: false },
      { id: 'statistics.lastUpdate', name: 'Last Statistics Update', type: 'string', role: 'date', def: '', write: false },
      { id: 'statistics.totalPaths', name: 'Total Paths', type: 'number', role: 'value', def: 0, write: false },
      { id: 'statistics.totalObstacles', name: 'Total Obstacles', type: 'number', role: 'value', def: 0, write: false }
    ];

    for (const state of statsStates) {
      await this.adapter.setObjectNotExistsAsync(`${basePath}.${state.id}`, {
        type: 'state',
        common: {
          name: state.name,
          type: state.type,
          role: state.role,
          unit: state.unit || '',
          read: true,
          write: state.write !== false,
          def: state.def
        },
        native: {}
      });
    }

    // Raw Events
    await this.adapter.setObjectNotExistsAsync(`${basePath}.raw.events`, {
      type: 'state',
      common: {
        name: 'Raw History Events',
        type: 'string',
        role: 'json',
        read: true,
        write: false,
        def: '{"cleaning":[],"cruising":[],"mapFiles":[]}'
      },
      native: {}
    });

    // Obstacle Images Channel
    await this.adapter.setObjectNotExistsAsync(`${basePath}.cleaning.obstacleImages`, {
      type: 'channel',
      common: { name: 'Obstacle Images from History' },
      native: {}
    });

    this.adapter.log.info('[HISTORY] All states have been created/checked');
  }

  // Loads ONLY statistics, not the complete history data
  async loadStatistics() {
    try {
      const basePath = `${this.deviceId}.history.statistics`;

      const [
        totalCleanings,
        totalCruising,
        totalArea,
        totalTime,
        averageArea,
        averageTime,
        firstCleaning,
        lastCleaning,
        lastUpdate,
        totalPaths,
        totalObstacles
      ] = await Promise.all([
        this.adapter.getStateAsync(`${basePath}.totalCleanings`),
        this.adapter.getStateAsync(`${basePath}.totalCruising`),
        this.adapter.getStateAsync(`${basePath}.totalArea`),
        this.adapter.getStateAsync(`${basePath}.totalTime`),
        this.adapter.getStateAsync(`${basePath}.averageArea`),
        this.adapter.getStateAsync(`${basePath}.averageTime`),
        this.adapter.getStateAsync(`${basePath}.firstCleaning`),
        this.adapter.getStateAsync(`${basePath}.lastCleaning`),
        this.adapter.getStateAsync(`${basePath}.lastUpdate`),
        this.adapter.getStateAsync(`${basePath}.totalPaths`),
        this.adapter.getStateAsync(`${basePath}.totalObstacles`)
      ]);

      this.stats = {
        totalCleanings: totalCleanings?.val || 0,
        totalCruising: totalCruising?.val || 0,
        totalArea: totalArea?.val || 0,
        totalTime: totalTime?.val || 0,
        averageArea: averageArea?.val || 0,
        averageTime: averageTime?.val || 0,
        firstCleaning: firstCleaning?.val ? new Date(firstCleaning.val) : null,
        lastCleaning: lastCleaning?.val ? new Date(lastCleaning.val) : null,
        lastUpdate: lastUpdate?.val ? new Date(lastUpdate.val) : new Date(),
        totalPaths: totalPaths?.val || 0,
        totalObstacles: totalObstacles?.val || 0
      };

      this.adapter.log.info(`[HISTORY] Statistics loaded: ${this.stats.totalCleanings} cleanings`);
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not load statistics: ${error.message}`);
    }
  }

  // Updates counters from states without loading the complete data
  async updateCountsFromStates() {
    try {
      const cleaningCount = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.count`);
      const cruisingCount = await this.adapter.getStateAsync(`${this.deviceId}.history.cruising.count`);

      this.stats.totalCleanings = cleaningCount?.val || 0;
      this.stats.totalCruising = cruisingCount?.val || 0;

      this.adapter.log.debug(`[HISTORY] Counts updated: ${this.stats.totalCleanings} cleanings, ${this.stats.totalCruising} trips`);
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not update counts: ${error.message}`);
    }
  }

  // Gets the most recent cleaning from state without loading the entire array
  async getLatestCleaning() {
    try {
      const latestState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.latest`);
      return latestState?.val ? JSON.parse(latestState.val) : null;
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not get latest cleaning: ${error.message}`);
      return null;
    }
  }

  // ============================================
  // LOAD HISTORY (ON-DEMAND, NOT STORED IN MEMORY)
  // ============================================

  async fetchAllHistory(limit = 50, checkForNewOnly = false) {
    this.adapter.log.info('[HISTORY] LOADING HISTORY FROM CLOUD');

    try {
      let startTime = 0;

      // If checking for new entries only, get timestamp of last cleaning
      if (checkForNewOnly) {
        const lastCleaning = await this.getLatestCleaning();
        if (lastCleaning && lastCleaning.timestamp) {
          startTime = Math.floor(lastCleaning.timestamp / 1000) + 1;
          this.adapter.log.info(`[HISTORY] Checking for new entries since: ${new Date(startTime * 1000).toLocaleString()}`);
        }
      } else {
        const firstCleaning = await this.getFirstCleaningDate();
        startTime = firstCleaning ? Math.floor(firstCleaning / 1000) : 0;
        this.adapter.log.info(`[HISTORY] Full reload from: ${new Date(startTime * 1000).toLocaleString()}`);
      }

      // Fetch cleaning history (S4P1 - STATUS events)
      const cleaningEvents = await this.getDeviceEvents('4.1', limit, startTime);

      // If we have new events, they must be processed
      if (cleaningEvents && cleaningEvents.length > 0) {
        this.adapter.log.info(`[HISTORY] ${cleaningEvents.length} new cleaning events received`);

        // Process and save events (without keeping them in memory)
        await this.processCleaningEvents(cleaningEvents);
      }

      // Same for cruising events
      const cruisingEvents = await this.getDeviceEvents('4.5', limit, startTime);
      if (cruisingEvents && cruisingEvents.length > 0) {
        this.adapter.log.info(`[HISTORY] ${cruisingEvents.length} new cruising events received`);
        await this.processCruisingEvents(cruisingEvents);
      }

      // Save raw events
      await this.saveRawEvents(cleaningEvents, cruisingEvents);

      // Update statistics
      await this.updateStatistics();

      const result = {
        found: cleaningEvents?.length > 0 || cruisingEvents?.length > 0,
        newCleanings: cleaningEvents?.length || 0,
        newCruising: cruisingEvents?.length || 0
      };

      return result;

    } catch (error) {
      this.adapter.log.error(`[HISTORY] Error loading: ${error.message}`);
      return false;
    }
  }

  // ============================================
  // PROCESS CLEANING EVENTS
  // ============================================

  // Processes incoming cleaning events and persists new entries into the state storage
  async processCleaningEvents(events) {
    this.adapter.log.info(`[HISTORY] Processing ${events.length} cleaning events`);

    // 1. LOAD EXISTING HISTORY (for deduplication)
    let existingHistory = [];
    try {
      const existingState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (existingState && existingState.val) {
        existingHistory = JSON.parse(existingState.val);
      }
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not load existing history: ${error.message}`);
      existingHistory = [];
    }

    // Set of already known map files for duplicate detection
    const existingMapFiles = new Set(
      existingHistory.map(entry => entry.mapFileBase).filter(Boolean)
    );

    const seenInThisBatch = new Set();
    const newEntries = [];
    let mapLoadCount = 0;
    let duplicateCount = 0;

    // 2. PROCESS INCOMING EVENTS
    for (const event of events) {
      try {
        const historyStr = event.history || event.value;
        if (!historyStr) continue;

        const historyData = JSON.parse(historyStr);
        const eventId = event.id || event.time;

        // Extract map file name for duplicate detection
        let mapFileName = null;
        let eventKey = null;

        if (Array.isArray(historyData)) {
          const fileNameItem = historyData.find(item => item && item.piid === 9);
          if (fileNameItem?.value) {
            const raw = String(fileNameItem.value);
            if (raw.includes(',')) {
              const [file, key] = raw.split(',');
              mapFileName = file;
              eventKey = key;
            } else {
              mapFileName = raw;
            }
          }
        }

        // Skip events with already known map files (map-based deduplication)
        if (mapFileName && (existingMapFiles.has(mapFileName) || seenInThisBatch.has(mapFileName))) {
          duplicateCount++;
          this.adapter.log.debug(`[HISTORY] Skipping duplicate map: ${mapFileName}`);
          continue;
        }

        // Ensure mapFileName is tracked
        if (mapFileName) {
          seenInThisBatch.add(mapFileName);
        }

        // Resolve timestamp (event timestamp or embedded start time)
        let timestamp = event.time || event.createTime;
        const startTimeItem = Array.isArray(historyData)
          ? historyData.find(item => item && item.piid === 8)
          : null;

        if (startTimeItem && startTimeItem.value) {
          timestamp = startTimeItem.value;
        }

        // Parse basic cleaning data
        const cleaning = this.parseBasicCleaning(historyData, timestamp);

        if (cleaning && cleaning.date && !isNaN(cleaning.date.getTime())) {

          // Register map file to prevent future duplicates
          if (cleaning.mapFileBase) {
            existingMapFiles.add(cleaning.mapFileBase);
          }

          // ========== Load FULL map details ==========
          if (cleaning.mapObjectName) {
            mapLoadCount++;
            this.adapter.log.debug(`[HISTORY] Loading map ${cleaning.mapFileBase}`);

            const fullData = await this.loadMapFileWithDetails(
              cleaning.mapObjectName,
              cleaning.key
            );

            if (fullData) {
              await this.enrichCleaningWithMapData(cleaning, fullData);

              // Debug: Log what was loaded
              this.adapter.log.debug(`[HISTORY] Enriched ${cleaning.mapFileBase}: path=${!!cleaning.parsedTr}, obstacles=${cleaning.obstacles?.length || 0}, sa=${!!cleaning.sa}`);
            } else {
              this.adapter.log.warn(`[HISTORY] Could not load map details for ${cleaning.mapFileBase}`);
            }
          }

          newEntries.push(cleaning);
        }
      } catch (err) {
        this.adapter.log.debug(`[HISTORY] Error processing event: ${err.message}`);
      }
    }

    // 3. PERSIST NEW DATA (only if new entries exist)
    if (newEntries.length > 0) {
    // Merge new and existing history
      const combined = [...newEntries, ...existingHistory];

      // Sort by timestamp (newest first)
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Persist updated history to state storage
      await this.saveCleaningHistory(combined);

      // Recalculate statistics based on updated dataset
      await this.updateStatistics();

      // Clear caches to ensure fresh data on next access
      this.mapCache.clear();
      this.imageCache.clear();
    }

    // 4. PROCESSING SUMMARY
    this.adapter.log.info(`[HISTORY] ===== PROCESSING SUMMARY =====`);
    this.adapter.log.info(`[HISTORY] Total events received: ${events.length}`);
    this.adapter.log.info(`[HISTORY] New events processed: ${newEntries.length}`);
    this.adapter.log.info(`[HISTORY] Duplicates skipped: ${duplicateCount}`);
    this.adapter.log.info(`[HISTORY] Maps loaded: ${mapLoadCount}`);
    this.adapter.log.info(`[HISTORY] Final history size: ${existingHistory.length + newEntries.length}`);

    return newEntries;
  }

  async NewprocessCleaningEvents(events) {
    this.adapter.log.info(`[HISTORY] Processing ${events.length} cleaning events`);

    // ========== 1. LOAD KNOWN MAP FILES (USED FOR DEDUPLICATION) ==========
    const knownMapFiles = new Set();
    let existingHistorySize = 0;

    try {
    // Load the most recent cleaning entry
      const latestState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.latest`);
      if (latestState?.val) {
        const latest = JSON.parse(latestState.val);
        if (latest.mapFileBase) knownMapFiles.add(latest.mapFileBase);
      }

      // Load all known map file names from stored history (avoid loading heavy data)
      const rawState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (rawState?.val) {
        const history = JSON.parse(rawState.val);
        existingHistorySize = history.length;

        for (const entry of history) {
          if (entry.mapFileBase) knownMapFiles.add(entry.mapFileBase);
        }
      }
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Failed to load existing history: ${error.message}`);
    }

    // ========== 2. PROCESS EVENTS WITH DUPLICATE FILTERING ==========
    const seenInBatch = new Set(); // Tracks duplicates within the current batch
    const newEntries = [];
    let mapLoadCount = 0;
    let duplicateCount = 0;

    for (const event of events) {
      try {
        const historyStr = event.history || event.value;
        if (!historyStr) continue;

        const historyData = JSON.parse(historyStr);

        // Extract map file name (primary deduplication key)
        let mapFileName = null;
        let eventKey = null;

        if (Array.isArray(historyData)) {
          const fileNameItem = historyData.find(item => item?.piid === 9);
          if (fileNameItem?.value) {
            const raw = String(fileNameItem.value);

            if (raw.includes(',')) {
              const [file, key] = raw.split(',');
              mapFileName = file;
              eventKey = key;
            } else {
              mapFileName = raw;
            }
          }
        }

        const timestamp = event.time || event.createTime;

        // Skip event if already processed (either historically or in this batch)
        if (mapFileName && (knownMapFiles.has(mapFileName) || seenInBatch.has(mapFileName))) {
          duplicateCount++;

          // Log only in debug mode to avoid log spam
          if (this.adapter.log.isDebugEnabled()) {
            this.adapter.log.debug(`[HISTORY] Skipping duplicate map: ${mapFileName}`);
          }
          continue;
        }

        // Mark as seen in this batch
        if (mapFileName) seenInBatch.add(mapFileName);

        // Parse basic cleaning information
        const cleaning = this.parseBasicCleaning(historyData, timestamp);

        // Skip invalid or malformed entries early
        if (!cleaning || !cleaning.date || isNaN(cleaning.date.getTime())) {
          continue;
        }

        // Mark map as known to prevent further duplicates in this run
        if (cleaning.mapFileBase) {
          knownMapFiles.add(cleaning.mapFileBase);
        }

        // Optionally enrich entry with detailed map data
        if (cleaning.mapObjectName) {
          mapLoadCount++;
          this.adapter.log.debug(`[HISTORY] Loading map ${cleaning.mapFileBase}`);

          const fullData = await this.loadMapFileWithDetails(
            cleaning.mapObjectName,
            cleaning.key
          );

          if (fullData) {
            await this.enrichCleaningWithMapData(cleaning, fullData);
          }
        }

        newEntries.push(cleaning);

      } catch (err) {
        this.adapter.log.debug(`[HISTORY] Error processing event: ${err.message}`);
      }
    }

    // ========== 3. PERSIST RESULTS (ONLY IF NEW ENTRIES EXIST) ==========
    if (newEntries.length > 0) {
      await this.appendToCleaningHistory(newEntries);
      await this.updateStatistics();

      // Clear caches to free memory and avoid stale data
      this.mapCache?.clear();
      this.imageCache?.clear();
    }

    // ========== 4. SUMMARY LOGGING ==========
    this.adapter.log.info(`[HISTORY] ===== PROCESSING SUMMARY =====`);
    this.adapter.log.info(`[HISTORY] Total events received: ${events.length}`);
    this.adapter.log.info(`[HISTORY] New events added: ${newEntries.length}`);
    this.adapter.log.info(`[HISTORY] Duplicates skipped: ${duplicateCount}`);
    this.adapter.log.info(`[HISTORY] Maps loaded: ${mapLoadCount}`);
    this.adapter.log.info(`[HISTORY] Final history size: ${existingHistorySize + newEntries.length}`);

    return newEntries;
  }

  async appendToCleaningHistory(newEntries) {
    if (newEntries.length === 0) return;

    try {
    // Load existing history
      let existingHistory = [];
      const existingState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (existingState?.val) {
        existingHistory = JSON.parse(existingState.val);
      }

      // Extra safety: filter out duplicates again (based on mapFileBase)
      const existingMapFiles = new Set(
        existingHistory.map(e => e.mapFileBase).filter(Boolean)
      );

      const trulyNew = newEntries.filter(
        entry => !existingMapFiles.has(entry.mapFileBase)
      );

      if (trulyNew.length === 0) {
        this.adapter.log.debug('[HISTORY] No new entries after deduplication');
        return;
      }

      // Merge and sort (newest first)
      const combined = [...trulyNew, ...existingHistory];
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Persist updated history
      await this.saveCleaningHistory(combined);

      this.adapter.log.info(
        `[HISTORY] Appended ${trulyNew.length} new entries ` +
      `(${newEntries.length - trulyNew.length} duplicates skipped)`
      );

    } catch (error) {
      this.adapter.log.error(`[HISTORY] Error appending history: ${error.message}`);
    }
  }

  // Processes new cleaning events and saves them to states
  async OriginalprocessCleaningEvents(events) {
    this.adapter.log.info(`[HISTORY] Processing ${events.length} cleaning events`);

    // 1. LOAD EXISTING DATA (only when needed for merging)
    let existingHistory = [];
    try {
      const existingState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (existingState && existingState.val) {
        existingHistory = JSON.parse(existingState.val);
      }
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not load existing history: ${error.message}`);
      existingHistory = [];
    }

    const existingIds = new Set(existingHistory.map(c => c.id || c.timestamp));
    const newEntries = [];
    let mapLoadCount = 0;

    // 2. PROCESS NEW EVENTS
    for (const event of events) {
      try {
        const historyStr = event.history || event.value;
        if (!historyStr) continue;

        const historyData = JSON.parse(historyStr);
        const eventId = event.id || event.time;

        if (!eventId || existingIds.has(eventId)) continue;

        // Determine timestamp
        let timestamp = event.time || event.createTime;
        const startTimeItem = Array.isArray(historyData)
          ? historyData.find(item => item && item.piid === 8)
          : null;

        if (startTimeItem && startTimeItem.value) {
          timestamp = startTimeItem.value;
        }

        // Parse basic cleaning data
        const cleaning = this.parseBasicCleaning(historyData, timestamp);

        if (cleaning && cleaning.date && !isNaN(cleaning.date.getTime())) {

          // Load map data
          if (cleaning.mapObjectName) {
            mapLoadCount++;
            this.adapter.log.debug(`[HISTORY] Loading map ${cleaning.mapFileBase}`);

            const fullData = await this.loadMapFileWithDetails(
              cleaning.mapObjectName,
              cleaning.key
            );

            if (fullData) {
              await this.enrichCleaningWithMapData(cleaning, fullData);
            }
          }

          newEntries.push(cleaning);
        }
      } catch (err) {
        this.adapter.log.debug(`[HISTORY] Error processing event: ${err.message}`);
      }
    }

    // 3. IF THERE ARE NEW ENTRIES, SAVE THEM
    if (newEntries.length > 0) {
      // Combine with existing entries
      const combined = [...newEntries, ...existingHistory];

      // Sort (newest first)
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Save to states (NOT in this.cleaningHistory)
      await this.saveCleaningHistory(combined);

      // Update statistics (calculated from saved data)
      await this.updateStatistics();

      // Clear caches
      this.mapCache.clear();
      this.imageCache.clear();
    }

    this.adapter.log.info(`[HISTORY] ===== PROCESSING SUMMARY =====`);
    this.adapter.log.info(`[HISTORY] Total events received: ${events.length}`);
    this.adapter.log.info(`[HISTORY] New events found: ${newEntries.length}`);
    this.adapter.log.info(`[HISTORY] Maps loaded: ${mapLoadCount}`);
    this.adapter.log.info(`[HISTORY] Final history size: ${existingHistory.length + newEntries.length}`);

    return newEntries;
  }

  // Loads a specific cleaning by index from state
  async getCleaningByIndex(index) {
    try {
      const rawState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (!rawState || !rawState.val) return null;

      const history = JSON.parse(rawState.val);
      return history[index] || null;
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not get cleaning by index ${index}: ${error.message}`);
      return null;
    }
  }

  // Loads a specific cleaning by date from state  - Date string in YYYY-MM-DD format
  async getCleaningByDate(dateStr) {
    try {
      const byDateState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.byDate`);
      if (!byDateState || !byDateState.val) return null;

      const byDate = JSON.parse(byDateState.val);
      return byDate[dateStr] || null;
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not get cleaning by date ${dateStr}: ${error.message}`);
      return null;
    }
  }

  // ============================================
  // PROCESS CRUISING EVENTS
  // ============================================

  // Processes new cruising events and saves them to states
  async processCruisingEvents(events) {
    let existingHistory = [];
    try {
      const existingState = await this.adapter.getStateAsync(`${this.deviceId}.history.cruising.list`);
      if (existingState && existingState.val) {
        existingHistory = Object.values(JSON.parse(existingState.val));
      }
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not load existing cruising history: ${error.message}`);
    }

    const seenDates = new Set(existingHistory.map(e => e.date?.split('T')[0]));
    const newEntries = [];

    for (const event of events) {
      try {
        const historyStr = event.history || event.value;
        if (!historyStr) continue;

        const historyData = JSON.parse(historyStr);

        let timestamp = event.time || event.createTime;
        if (!timestamp || timestamp <= 0) {
          timestamp = Math.floor(Date.now() / 1000) - 3600;
        }

        const cruising = this.parseCruising(historyData, timestamp);

        if (cruising && cruising.date && !isNaN(cruising.date.getTime())) {
          const dateKey = cruising.date.toISOString().split('T')[0];
          if (!seenDates.has(dateKey)) {
            seenDates.add(dateKey);
            newEntries.push(cruising);
          }
        }
      } catch (err) {
        // Silently skip invalid entries
      }
    }

    if (newEntries.length > 0) {
      const combined = [...newEntries, ...existingHistory];
      combined.sort((a, b) => b.date - a.date);
      await this.saveCruisingHistory(combined);
    }

    return newEntries;
  }

  // Parses raw cruising event data into a structured object
  parseCruising(historyData, timestamp) {
    const entry = {
      date: new Date(timestamp * 1000),
      timestamp: timestamp * 1000,
      cleaningTime: 0,
      status: null,
      statusCode: null,
      cruiseType: null,
      mapIndex: null,
      mapName: null,
      completed: false
    };

    if (!Array.isArray(historyData)) return entry;

    for (const item of historyData) {
      if (!item || typeof item !== 'object') continue;

      const pid = item.piid;
      const value = item.value;

      switch (pid) {
        case 1: entry.statusCode = value; entry.status = this.getStatusName(value); break;
        case 2: entry.cleaningTime = parseInt(value) || 0; break;
        case 13: entry.completed = (value === 1 || value === true); break;
        case 42: entry.mapIndex = value; break;
        case 43: entry.mapName = String(value); break;
        case 44: entry.cruiseType = value; break;
      }
    }

    return entry;
  }

  // ============================================
  // SAVE FUNCTIONS
  // ============================================

  // Saves cleaning history to all related state objects - Creates formatted lists, raw data, paths, and map data
  async saveCleaningHistory(history) {
    const formatted = {};
    const rawList = [];
    const byDate = {};
    const allPaths = [];
    const allMapData = [];
    const completeMapData = {};

    for (let i = 0; i < history.length; i++) {
      const c = history[i];

      let dateObj = c.date;
      if (typeof dateObj === 'string') {
        dateObj = new Date(dateObj);
      }

      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        this.adapter.log.warn(`[HISTORY] Invalid date for entry ${i}, skipping`);
        continue;
      }

      // ISO-String einmalig berechnen
      const isoDateString = dateObj.toISOString();

      const dateStr = this.formatDateForDisplay(dateObj);
      const dateKey = isoDateString.split('T')[0];

      let key = dateStr;
      let counter = 1;
      while (formatted[key]) {
        key = `${dateStr} (${counter})`;
        counter++;
      }

      // Store complete map data if available
      if (c.mapObjectName) {
        completeMapData[c.mapObjectName] = {
          mapFileBase: c.mapFileBase,
          key: c.key,
          timestamp: c.timestamp,
          timestamp_ms: c.timestamp_ms,
          curid: c.curid,
          mtid: c.mtid,
          cmi: c.cmi,
          mis: c.mis,
          nar: c.nar,
          rss: c.rss,
          dustCollectionCount: c.dustCollectionCount,
          mopWashCount: c.mopWashCount,
          cleanedArea: c.cleanedArea,
          cleaningTime: c.cleaningTime,
          remainingBattery: c.remainingBattery,
          cleanupMethodCode: c.cleanupMethodCode,
          cleanupMethod: c.cleanupMethod,
          startupMethodCode: c.startupMethodCode,
          startupMethod: c.startupMethod,
          taskEndTypeCode: c.taskEndTypeCode,
          taskEndType: c.taskEndType,
          moppingMode: c.moppingMode,
          customizedCleaning: c.customizedCleaning,
          robotMode: c.robotMode,
          wbs: c.wbs,
          mopType: c.mopType,
          maintenanceTaskType: c.maintenanceTaskType,
          mapRotation: c.mapRotation,
          frameMap: c.frameMap,
          savedMapStatus: c.savedMapStatus,
          docked: c.docked,
          completed: c.completed,
          isCleanLog: c.isCleanLog,
          robotPosition: c.robotPosition,
          chargerPosition: c.chargerPosition,
          mapOrigin: c.mapOrigin,
          roomSequence: c.roomSequence,
          cleanset: c.cleanset,
          carpetCleanset: c.carpetCleanset,
          segmentInfo: c.segmentInfo,
          rels: c.rels,
          psr: c.psr,
          naviPs: c.naviPs,
          aiObstacle: c.aiObstacle,
          obstacles: c.obstacles,
          hasObstacles: c.hasObstacles,
          laserObstacle: c.laserObstacle,
          bump: c.bump,
          timeline: c.timeline,
          carpetPressTimes: c.carpetPressTimes,
          backhomeFailTimes: c.backhomeFailTimes,
          sneakAreas: c.sneakAreas,
          sneakAreasEnd: c.sneakAreasEnd,
          motionStats: c.motionStats,
          aiModelInUse: c.aiModelInUse,
          carpetLevel: c.carpetLevel,
          robotBreakPointEnable: c.robotBreakPointEnable,
          breakPointStartClean: c.breakPointStartClean,
          robotMultiMapEnable: c.robotMultiMapEnable,
          multiMapCount: c.multiMapCount,
          mapUsedTimes: c.mapUsedTimes,
          slamMapSize: c.slamMapSize,
          robotFinemopSwitch: c.robotFinemopSwitch,
          tr: c.tr,
          parsedTr: c.parsedTr,
          taskInterruptReasonCode: c.taskInterruptReasonCode,
          taskInterruptReason: c.taskInterruptReason,
          segmentSkipDetails: c.segmentSkipDetails,
          blockedSegments: c.blockedSegments,
          bt: c.bt,
          completeFlag: c.completeFlag
        };
      }

      // Collect path data if available
      if (c.parsedTr && c.parsedTr.fullPath && c.parsedTr.fullPath.length > 0) {
        allPaths.push({
          date: isoDateString,
          timestamp: c.timestamp,
          path: c.parsedTr,
          mapFile: c.mapFileBase,
          points: c.parsedTr.pointCount,
          cleaningPoints: c.parsedTr.cleaningPointCount
        });
      }

      // Collect map data summary
      if (c.tr || c.aiObstacle || c.sa) {
        allMapData.push({
          date: isoDateString,
          timestamp: c.timestamp,
          mapFile: c.mapFileBase,
          hasPath: !!(c.parsedTr && c.parsedTr.pointCount > 0),
          pathPoints: c.parsedTr?.pointCount || 0,
          obstacleCount: c.obstacles?.length || 0,
          hasSa: !!c.sa,
          hasTl: !!c.tl,
          hasSneakAreas: !!c.sneakAreasEnd,
          robot: c.robotPosition,
          charger: c.chargerPosition,
          rotation: c.mapRotation,
          dustCollectionCount: c.dustCollectionCount,
          mopWashCount: c.mopWashCount,
          hasInterruptReason: !!c.taskInterruptReason,
          interruptReason: c.taskInterruptReason,
          blockedSegmentsCount: c.blockedSegments ? Object.keys(c.blockedSegments).length : 0
        });
      }

      // Create formatted display entry
      formatted[key] = {
        id: i,
        timestamp: c.timestamp,
        date: isoDateString,
        cleaningTime: c.cleaningTime,
        cleaningTimeFormatted: `${c.cleaningTime} min`,
        cleanedArea: parseFloat((c.cleanedArea || 0).toFixed(1)),
        cleanedAreaFormatted: `${(c.cleanedArea || 0).toFixed(1)} m²`,
        completed: c.completed,
        status: c.status || 'Unknown',
        statusCode: c.statusCode,
        suctionLevel: c.suctionLevel || 'Unknown',
        suctionCode: c.suctionCode,
        waterTank: c.waterTank || 'Unknown',
        waterTankCode: c.waterTankCode,
        fileName: c.fileName,
        mapObjectName: c.mapObjectName,
        mapFileBase: c.mapFileBase,
        batteryAfterCleaning: c.remainingBattery ? `${c.remainingBattery}%` : '?%',
        key: c.key,
        dustCollectionCount: c.dustCollectionCount || 0,
        mopWashCount: c.mopWashCount || 0,
        cleanupMethod: c.cleanupMethod || '-',
        cleanupMethodCode: c.cleanupMethodCode,
        startupMethod: c.startupMethod || '-',
        taskEndType: c.taskEndType || '-',
        mopAfterSweep: c.mopAfterSweep,
        secondCleaning: c.secondCleaning,
        secondMopping: c.secondMopping,
        tr: c.tr,
        parsedTr: c.parsedTr,
        hasPath: !!(c.parsedTr && c.parsedTr.pointCount > 0),
        obstacles: c.obstacles || [],
        hasObstacles: c.hasObstacles,
        obstacleCount: c.obstacles ? c.obstacles.length : 0,
        sa: c.sa,
        tl: c.tl,
        sneak_areas_end: c.sneakAreasEnd,
        motion_action_statistics: c.motionStats,
        robot: c.robotPosition,
        charger: c.chargerPosition,
        origin: c.mapOrigin,
        fsm: c.frameMap,
        mra: c.mapRotation,
        ris: c.savedMapStatus,
        cleanset: c.cleanset,
        carpetcleanset: c.carpetCleanset,
        taskInterruptReason: c.taskInterruptReason,
        taskInterruptReasonCode: c.taskInterruptReasonCode,
        blockedSegments: c.blockedSegments,
        segmentSkipDetails: c.segmentSkipDetails
      };

      // Create raw data entry
      rawList.push({
        date: isoDateString,
        timestamp: c.timestamp,
        cleaningTime: c.cleaningTime,
        cleanedArea: c.cleanedArea,
        status: c.status,
        statusCode: c.statusCode,
        suctionLevel: c.suctionLevel,
        suctionCode: c.suctionCode,
        waterTank: c.waterTank,
        waterTankCode: c.waterTankCode,
        completed: c.completed,
        fileName: c.fileName,
        mapObjectName: c.mapObjectName,
        key: c.key,
        hasPath: !!(c.parsedTr && c.parsedTr.pointCount > 0),
        pathPoints: c.parsedTr?.pointCount || 0,
        hasObstacles: c.hasObstacles,
        obstacleCount: c.obstacles ? c.obstacles.length : 0,
        dustCollectionCount: c.dustCollectionCount || 0,
        mopWashCount: c.mopWashCount || 0,
        hasInterruptReason: !!c.taskInterruptReason,
        interruptReason: c.taskInterruptReason,
        blockedSegmentsCount: c.blockedSegments ? Object.keys(c.blockedSegments).length : 0
      });

      // Group by date
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push({
        time: dateObj.toLocaleTimeString(),
        cleaningTime: c.cleaningTime,
        cleanedArea: c.cleanedArea,
        completed: c.completed,
        fileName: c.fileName,
        mapObjectName: c.mapObjectName,
        key: c.key,
        hasPath: !!(c.parsedTr && c.parsedTr.pointCount > 0),
        hasObstacles: c.hasObstacles,
        hasInterruptReason: !!c.taskInterruptReason,
        interruptReason: c.taskInterruptReason
      });
    }

    // Save all states
    await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.list`, JSON.stringify(formatted, null, 2), true);
    await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.raw`, JSON.stringify(rawList, null, 2), true);
    await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.byDate`, JSON.stringify(byDate, null, 2), true);
    await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.count`, history.length, true);
    await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.paths`, JSON.stringify(allPaths, null, 2), true);
    await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.mapData`, JSON.stringify(allMapData, null, 2), true);
    await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.completeMapData`, JSON.stringify(completeMapData, null, 2), true);

    // Save latest entry data
    if (history.length > 0) {
      await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.latest`, JSON.stringify(history[0], null, 2), true);

      if (history[0].fileName) {
        await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.lastFile`, history[0].fileName, true);
      }

      if (history[0].key) {
        await this.adapter.setStateAsync(`${this.deviceId}.history.cleaning.lastKey`, history[0].key, true);
      }
    }

    this.adapter.log.info(`[HISTORY] ${history.length} cleanings saved with ALL details`);
  }

  // Saves cruising history to states - Complete cruising history array
  async saveCruisingHistory(history) {
    const formatted = {};

    for (const entry of history) {
      const dateStr = this.formatDateForDisplay(entry.date);
      formatted[dateStr] = {
        timestamp: entry.timestamp,
        cruisingTime: `${entry.cleaningTime} min`,
        status: entry.status || 'Unknown',
        cruiseType: entry.cruiseType,
        mapIndex: entry.mapIndex,
        mapName: entry.mapName,
        completed: entry.completed
      };
    }

    await this.adapter.setStateAsync(`${this.deviceId}.history.cruising.list`, JSON.stringify(formatted), true);
    await this.adapter.setStateAsync(`${this.deviceId}.history.cruising.count`, history.length, true);

    if (history.length > 0) {
      await this.adapter.setStateAsync(`${this.deviceId}.history.cruising.latest`, JSON.stringify(history[0]), true);
    }
  }

  // Saves raw event data for debugging purposes - cleaningEvents and cruisingEvent
  async saveRawEvents(cleaningEvents, cruisingEvents) {
    const raw = {
      cleaning: cleaningEvents || [],
      cruising: cruisingEvents || [],
      mapFiles: [],
      lastUpdate: Date.now()
    };

    await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.history.raw.events`, {
      type: 'state',
      common: {
        name: 'Raw History Events',
        type: 'string',
        role: 'json',
        read: true,
        write: false,
        def: '{"cleaning":[],"cruising":[],"mapFiles":[]}'
      },
      native: {}
    });

    await this.adapter.setStateAsync(
      `${this.deviceId}.history.raw.events`,
      JSON.stringify(raw, null, 2),
      true
    );

    this.adapter.log.info(`[HISTORY] ${cleaningEvents?.length || 0} raw events saved`);
  }

  // ============================================
  // STATISTICS (CALCULATED FROM STATES)
  // ============================================

  // Updates all statistics by reading from states and calculating aggregates - Saves results back to statistics states
  async updateStatistics() {
    try {
      const rawState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (!rawState || !rawState.val) {
        this.adapter.log.warn('[HISTORY] No cleanings available for statistics');
        return;
      }

      const cleaningHistory = JSON.parse(rawState.val);

      if (cleaningHistory.length === 0) {
        this.adapter.log.warn('[HISTORY] No cleanings available for statistics');
        return;
      }

      let totalArea = 0;
      let totalTime = 0;
      let totalPaths = 0;
      let totalObstacles = 0;

      // Calculate aggregates
      for (const c of cleaningHistory) {
        totalArea += c.cleanedArea || 0;
        totalTime += c.cleaningTime || 0;
        if (c.hasPath) totalPaths++;
        if (c.obstacleCount) totalObstacles += c.obstacleCount;
      }

      // Get first and last cleaning dates
      const sorted = [...cleaningHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      this.stats = {
        totalCleanings: cleaningHistory.length,
        totalCruising: this.stats.totalCruising, // Keep last value
        totalArea: parseFloat(totalArea.toFixed(1)),
        totalTime: totalTime,
        averageArea: cleaningHistory.length > 0
          ? parseFloat((totalArea / cleaningHistory.length).toFixed(1))
          : 0,
        averageTime: cleaningHistory.length > 0
          ? Math.round(totalTime / cleaningHistory.length)
          : 0,
        firstCleaning: first ? new Date(first.date) : null,
        lastCleaning: last ? new Date(last.date) : null,
        lastUpdate: new Date(),
        totalPaths: totalPaths,
        totalObstacles: totalObstacles
      };

      // Save all statistics to states
      await this.adapter.setStateAsync(`${this.deviceId}.history.statistics.totalCleanings`, this.stats.totalCleanings, true);
      await this.adapter.setStateAsync(`${this.deviceId}.history.statistics.totalArea`, this.stats.totalArea, true);
      await this.adapter.setStateAsync(`${this.deviceId}.history.statistics.totalTime`, this.stats.totalTime, true);
      await this.adapter.setStateAsync(`${this.deviceId}.history.statistics.averageArea`, this.stats.averageArea, true);
      await this.adapter.setStateAsync(`${this.deviceId}.history.statistics.averageTime`, this.stats.averageTime, true);
      await this.adapter.setStateAsync(`${this.deviceId}.history.statistics.totalPaths`, this.stats.totalPaths, true);
      await this.adapter.setStateAsync(`${this.deviceId}.history.statistics.totalObstacles`, this.stats.totalObstacles, true);

      if (this.stats.firstCleaning) {
        await this.adapter.setStateAsync(
          `${this.deviceId}.history.statistics.firstCleaning`,
          this.stats.firstCleaning.toISOString().split('T')[0],
          true
        );
      }

      if (this.stats.lastCleaning) {
        await this.adapter.setStateAsync(
          `${this.deviceId}.history.statistics.lastCleaning`,
          this.stats.lastCleaning.toISOString().split('T')[0],
          true
        );
      }

      await this.adapter.setStateAsync(
        `${this.deviceId}.history.statistics.lastUpdate`,
        this.stats.lastUpdate.toISOString(),
        true
      );

      this.adapter.log.info('[HISTORY] Statistics updated:');
      this.adapter.log.info(`   - Cleanings: ${this.stats.totalCleanings}`);
      this.adapter.log.info(`   - Total area: ${this.stats.totalArea} m²`);
      this.adapter.log.info(`   - Total time: ${this.stats.totalTime} min`);
      this.adapter.log.info(`   - Paths: ${totalPaths}`);
      this.adapter.log.info(`   - Obstacles: ${totalObstacles}`);
    } catch (error) {
      this.adapter.log.error(`[HISTORY] Error updating statistics: ${error.message}`);
    }
  }

  // ============================================
  // CLOUD API
  // ============================================

  // Fetches device events from Dreame cloud API
  async getDeviceEvents(key, limit, timeStart = 0) {
    const [siid, eiid] = key.split('.');

    const params = {
      uid: this.DH_Uid,
      did: this.deviceId,
      from: timeStart || 0,
      limit: limit || 25,
      siid: parseInt(siid),
      eiid: parseInt(eiid),
      region: this.DH_Region,
      type: 3
    };

    try {
      const response = await this.adapter.DH_URLRequest(this.DH_DHURLHIS, params);

      if (response && response.data && Array.isArray(response.data.list)) {
        return response.data.list;
      }
      return [];
    } catch (error) {
      this.adapter.log.debug(`[HISTORY] API error: ${error.message}`);
      return [];
    }
  }

  // Downloads a device file from Dreame cloud - fileName and fileType
  async getDeviceFile(fileName, fileType) {
    try {
      const response = await this.adapter.DH_requestClient.post(
        this.DH_DHURLGDF,
        {
          did: this.deviceId,
          uid: this.DH_Uid,
          fileinfo: JSON.stringify({
            filename: fileName,
            type: fileType
          }, null, 0)
        },
        {
          headers: {
            'Accept': '*/*',
            'Accept-Language': 'en-US;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'User-Agent': this.DH_URLUSA,
            'Authorization': this.DH_URLAUTH,
            'Tenant-Id': '000000',
            'Content-Type': 'application/json',
            'Dreame-Auth': this.DH_Auth,
            'Dreame-Rlc': this.DH_URLDRLC
          },
          timeout: 15000,
          responseType: 'arraybuffer'
        }
      );

      if (response?.status === 200 && response?.data) {
        return Buffer.from(response.data);
      }

      if (response?.status === 401) {
        this.adapter.log.warn(`[HISTORY-IMG] Token expired, refreshing...`);
        await this.refreshTokenMethod?.();
        return this.getDeviceFile(fileName, fileType);
      }

      return null;

    } catch (error) {
      this.adapter.log.error(`[HISTORY-IMG] getDeviceFile failed: ${error.message}`);
      if (error.response) {
        this.adapter.log.error(`Status: ${error.response.status}`);
        this.adapter.log.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  // ============================================
  // LOAD MAP FILE
  // ============================================

  // Loads and parses a map file from cloud
  async loadMapFileWithDetails(objectName, key) {
    try {
      // Check cache first
      if (this.mapCache.has(objectName)) {
        return this.mapCache.get(objectName);
      }

      // Get download URL
      const urlCommand = {
        did: this.deviceId,
        model: this.DH_Model,
        filename: objectName,
        region: this.DH_Region
      };

      const urlResponse = await this.adapter.DH_URLRequest(this.DH_URLDOWNURL, urlCommand);
      if (!urlResponse || !urlResponse.data) return null;

      // Download file
      const fileData = await this.adapter.DH_getFile(urlResponse.data);
      if (!fileData) return null;

      // Convert to buffer
      let buffer = null;
      if (typeof fileData === 'string') {
        const cleanBase64 = fileData.replace(/[-_]/g, match => match === '-' ? '+' : '/');
        buffer = Buffer.from(cleanBase64, 'base64');
      } else if (Buffer.isBuffer(fileData)) {
        buffer = fileData;
      } else {
        return null;
      }

      // Decompress
      buffer = zlib.inflateSync(buffer);

      // Parse header
      const header = {
        width: buffer.readInt16LE(19),
        height: buffer.readInt16LE(21)
      };

      const mapStart = 27;
      const mapEnd = mapStart + header.width * header.height;

      // Extract JSON data after map pixels
      if (buffer.length > mapEnd) {
        const jsonStr = buffer.toString('utf8', mapEnd);
        const jsonData = JSON.parse(jsonStr);
        this.mapCache.set(objectName, jsonData);
        return jsonData;
      }
      return null;
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Error loading map ${objectName}: ${error.message}`);
      return null;
    }
  }

  // ============================================
  // PARSE FUNCTIONS
  // ============================================

  // Parses basic cleaning data from raw history
  parseBasicCleaning(historyData, timestamp) {
    const cleaning = {
      date: timestamp ? new Date(timestamp * 1000) : new Date(),
      timestamp: timestamp ? timestamp * 1000 : Date.now(),
      cleaningTime: 0,
      cleanedArea: 0,
      completed: false,
      status: null,
      statusCode: null,
      suctionLevel: null,
      suctionCode: null,
      waterTank: null,
      waterTankCode: null,
      fileName: null,
      key: null,
      mapObjectName: null,
      mapFileBase: null,
      tr: null,
      parsedTr: null,
      ai_obstacle: null,
      obstacles: [],
      hasObstacles: false,
      sa: null,
      tl: null,
      sneak_areas_end: null,
      motion_action_statistics: null,
      robot: null,
      charger: null,
      origin: null,
      fsm: null,
      mra: null,
      ris: null,
      cleanset: null,
      carpetcleanset: null,
      raw: historyData
    };

    if (Array.isArray(historyData)) {
      for (const item of historyData) {
        if (!item || typeof item !== 'object') continue;

        const pid = item.piid;
        const value = item.value;

        if (value === undefined || value === null) continue;

        switch (pid) {
          case 1: cleaning.statusCode = value; cleaning.status = this.getStatusName(value); break;
          case 2: cleaning.cleaningTime = parseInt(value) || 0; break;
          case 3: cleaning.cleanedArea = parseFloat(value) || 0; break;
          case 4: cleaning.suctionCode = value; cleaning.suctionLevel = this.getSuctionLevelName(value); break;
          case 6: cleaning.waterTankCode = value; cleaning.waterTank = this.getWaterTankName(value); break;
          case 9:
            cleaning.fileName = String(value);
            cleaning.mapObjectName = String(value);
            if (cleaning.mapObjectName && cleaning.mapObjectName.includes('/')) {
              const parts = cleaning.mapObjectName.split('/');
              cleaning.mapFileBase = parts[parts.length - 1];
            }
            if (cleaning.fileName && cleaning.fileName.includes(',')) {
              const parts = cleaning.fileName.split(',');
              cleaning.fileName = parts[0];
              cleaning.key = parts[1];
            }
            break;
          case 13: cleaning.completed = (value === 1 || value === true); break;
          case 10:
            try {
              const props = typeof value === 'string' ? JSON.parse(value) : value;
              if (props.wt !== undefined) cleaning.mopWashCount = props.wt;
              if (props.ds !== undefined) cleaning.dustCollectionCount = props.ds;
              if (props.cmc !== undefined) {
                const cmcValue = parseInt(props.cmc);
                cleaning.cleanupMethodCode = cmcValue;
                cleaning.cleanupMethod = this.getCleanupMethodName(cmcValue);
              }
              if (props.clt !== undefined) cleaning.mopAfterSweep = props.clt;
              if (props.ismultiple !== undefined) cleaning.secondCleaning = props.ismultiple;
              if (props.ctyo !== undefined) cleaning.secondMopping = props.ctyo;
            } catch (e) {
              // Silently skip parsing errors
            }
            break;
        }
      }
    }

    return cleaning;
  }

  // Parses obstacle data from map JSON
  parseObstacles(obstacleArray) {
    if (!Array.isArray(obstacleArray)) return [];

    return obstacleArray.map((obstacle, idx) => {
      const baseObstacle = {
        x: parseFloat(obstacle[0] || 0),
        y: parseFloat(obstacle[1] || 0),
        type: parseInt(obstacle[2] || 0),
        typeName: this.getObstacleTypeName(parseInt(obstacle[2] || 0)),
        probability: parseFloat(obstacle[3] || 0),
        hasImage: false,
        index: idx
      };

      // Extended obstacle data (7+ elements)
      if (obstacle.length >= 7) {
        baseObstacle.id = obstacle[4];
        baseObstacle.imagePath = obstacle[5];
        baseObstacle.key = obstacle[6];

        const hasValidImage = !!(obstacle[5] &&
                               typeof obstacle[5] === 'string' &&
                               obstacle[5].length > 0 &&
                               obstacle[6]);

        baseObstacle.hasImage = hasValidImage;

        // Image position data (11+ elements)
        if (obstacle.length >= 11) {
          baseObstacle.imagePos = {
            x: parseFloat(obstacle[7] || 0),
            y: parseFloat(obstacle[8] || 0),
            width: parseFloat(obstacle[9] || 0),
            height: parseFloat(obstacle[10] || 0)
          };
        }

        // Additional status flags
        if (obstacle.length >= 12) {
          baseObstacle.pictureStatus = parseInt(obstacle[11] || 0);
        }
        if (obstacle.length >= 13) {
          baseObstacle.ignoreStatus = parseInt(obstacle[12] || 0);
        }
        if (obstacle.length >= 14) {
          baseObstacle.extra = parseInt(obstacle[13] || 0);
        }
      }

      return baseObstacle;
    });
  }

  // Parses TR path string into structured path data
  parseTrPath(trString) {
    try {
      if (!trString || typeof trString !== 'string' || trString === '') {
        return { fullPath: [], cleaningSegments: [], rawString: trString };
      }

      // Regex to match path commands: Mx,y, Sx,y, Wx,y, Lx,y, lx,y
      const regex = /(?<operator>[MWSLl])(?<x>-?\d+),(?<y>-?\d+)/g;
      const matches = [...trString.matchAll(regex)];

      let currentPosition = { x: 0, y: 0 };
      const pathPoints = [];
      const cleaningSegments = [];
      let currentSegment = null;

      for (const match of matches) {
        const operator = match.groups.operator;
        const x = parseInt(match.groups.x);
        const y = parseInt(match.groups.y);

        let point;
        let pathType;
        let isCleaning = false;

        // Handle relative (l) vs absolute commands
        if (operator === 'L' || operator === 'l') {
          currentPosition = {
            x: currentPosition.x + x,
            y: currentPosition.y + y
          };
          point = { x: currentPosition.x, y: currentPosition.y };
          pathType = 'LINE';
          isCleaning = false;
        } else {
          currentPosition = { x, y };
          point = { x, y };

          switch(operator) {
            case 'M':
              pathType = 'MOP';
              isCleaning = true;
              break;
            case 'S':
              pathType = 'SWEEP';
              isCleaning = true;
              break;
            case 'W':
              pathType = 'SWEEP_AND_MOP';
              isCleaning = true;
              break;
            default:
              pathType = 'UNKNOWN';
              isCleaning = false;
          }
        }

        const pathPoint = {
          x: point.x,
          y: point.y,
          type: pathType,
          operator: operator,
          isCleaning: isCleaning
        };

        pathPoints.push(pathPoint);

        // Group cleaning points into segments
        if (isCleaning) {
          if (!currentSegment || currentSegment.type !== pathType) {
            if (currentSegment) cleaningSegments.push(currentSegment);
            currentSegment = {
              type: pathType,
              operator: operator,
              points: [point]
            };
          } else {
            currentSegment.points.push(point);
          }
        }
      }

      // Add last segment
      if (currentSegment) cleaningSegments.push(currentSegment);

      return {
        fullPath: pathPoints,
        cleaningSegments: cleaningSegments,
        rawString: trString,
        pointCount: pathPoints.length,
        cleaningPointCount: pathPoints.filter(p => p.isCleaning).length
      };
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Error parsing tr: ${error.message}`);
      return { fullPath: [], cleaningSegments: [], rawString: trString };
    }
  }

  // Enriches a cleaning object with detailed map data
  async enrichCleaningWithMapData(cleaning, fullData) {
    // Basic metadata
    if (fullData.timestamp_ms) cleaning.timestamp_ms = fullData.timestamp_ms;
    if (fullData.curid) cleaning.curid = fullData.curid;
    if (fullData.mtid) cleaning.mtid = fullData.mtid;
    if (fullData.cmi) cleaning.cmi = fullData.cmi;
    if (fullData.mis) cleaning.mis = fullData.mis;
    if (fullData.nar) cleaning.nar = fullData.nar;
    if (fullData.rss) cleaning.rss = fullData.rss;

    // Cleaning stats
    if (fullData.ds !== undefined) cleaning.dustCollectionCount = fullData.ds;
    if (fullData.wt !== undefined) cleaning.mopWashCount = fullData.wt;
    if (fullData.cs !== undefined) cleaning.cleanedArea = fullData.cs;
    if (fullData.ct !== undefined) cleaning.cleaningTime = fullData.ct;
    if (fullData.clean_finish_remain_electricity !== undefined) {
      cleaning.remainingBattery = fullData.clean_finish_remain_electricity;
    }

    // Task configuration
    if (fullData.cmc !== undefined) {
      cleaning.cleanupMethodCode = fullData.cmc;
      cleaning.cleanupMethod = this.getCleanupMethodName(fullData.cmc);
    }
    if (fullData.smd !== undefined) {
      cleaning.startupMethodCode = fullData.smd;
      cleaning.startupMethod = this.getStartupMethodName(fullData.smd);
    }
    if (fullData.ctyi !== undefined) {
      cleaning.taskEndTypeCode = fullData.ctyi;
      cleaning.taskEndType = this.getTaskEndTypeName(fullData.ctyi);
    }
    if (fullData.mooClean !== undefined) cleaning.moppingMode = fullData.mooClean;
    if (fullData.customeClean !== undefined) cleaning.customizedCleaning = fullData.customeClean;
    if (fullData.robot_mode !== undefined) cleaning.robotMode = fullData.robot_mode;
    if (fullData.wbs !== undefined) cleaning.wbs = fullData.wbs;
    if (fullData.moptype !== undefined) cleaning.mopType = fullData.moptype;
    if (fullData.MaintenanceTaskType !== undefined) cleaning.maintenanceTaskType = fullData.MaintenanceTaskType;

    // Map configuration
    if (fullData.mra !== undefined) cleaning.mapRotation = fullData.mra;
    if (fullData.fsm !== undefined) cleaning.frameMap = fullData.fsm;
    if (fullData.ris !== undefined) cleaning.savedMapStatus = fullData.ris;
    if (fullData.oc !== undefined) cleaning.docked = fullData.oc;
    if (fullData.cf !== undefined) cleaning.completed = fullData.cf;
    if (fullData.iscleanlog !== undefined) cleaning.isCleanLog = fullData.iscleanlog;

    // Positions
    if (fullData.robot) cleaning.robotPosition = { x: fullData.robot[0], y: fullData.robot[1] };
    if (fullData.charger) cleaning.chargerPosition = { x: fullData.charger[0], y: fullData.charger[1] };
    if (fullData.origin) cleaning.mapOrigin = { x: fullData.origin[0], y: fullData.origin[1] };

    // Room and segment data
    if (fullData.sa) cleaning.roomSequence = fullData.sa;
    if (fullData.cleanset) cleaning.cleanset = fullData.cleanset;
    if (fullData.carpetcleanset) cleaning.carpetCleanset = fullData.carpetcleanset;
    if (fullData.seg_inf) cleaning.segmentInfo = fullData.seg_inf;
    if (fullData.rels) cleaning.rels = fullData.rels;
    if (fullData.psr) cleaning.psr = fullData.psr;
    if (fullData.navi_ps) cleaning.naviPs = fullData.navi_ps;

    // Obstacle data
    if (fullData.ai_obstacle && Array.isArray(fullData.ai_obstacle)) {
      cleaning.aiObstacle = fullData.ai_obstacle;
      cleaning.obstacles = this.parseObstacles(fullData.ai_obstacle);
      cleaning.hasObstacles = cleaning.obstacles.length > 0;
    }
    if (fullData.laser_obstacle) cleaning.laserObstacle = fullData.laser_obstacle;
    if (fullData.bump) cleaning.bump = fullData.bump;

    // Timeline and stats
    if (fullData.tl) cleaning.timeline = fullData.tl;
    if (fullData.carpet_press_times) cleaning.carpetPressTimes = fullData.carpet_press_times;
    if (fullData.backhome_fail_times !== undefined) cleaning.backhomeFailTimes = fullData.backhome_fail_times;

    // Sneak areas
    if (fullData.sneak_areas) cleaning.sneakAreas = fullData.sneak_areas;
    if (fullData.sneak_areas_end) cleaning.sneakAreasEnd = fullData.sneak_areas_end;

    // Motion statistics
    if (fullData.motion_action_statistics) {
      cleaning.motionStats = fullData.motion_action_statistics;
    }

    // Advanced features
    if (fullData.ai_model_inuse) cleaning.aiModelInUse = fullData.ai_model_inuse;
    if (fullData.carpet_level !== undefined) cleaning.carpetLevel = fullData.carpet_level;

    // Multi-map support
    if (fullData.RobotBreakPointEnable !== undefined) cleaning.robotBreakPointEnable = fullData.RobotBreakPointEnable;
    if (fullData.break_point_start_clean) cleaning.breakPointStartClean = fullData.break_point_start_clean;
    if (fullData.RobotMultiMapEnable !== undefined) cleaning.robotMultiMapEnable = fullData.RobotMultiMapEnable;
    if (fullData.multi_map_cnt !== undefined) cleaning.multiMapCount = fullData.multi_map_cnt;
    if (fullData.map_used_times !== undefined) cleaning.mapUsedTimes = fullData.map_used_times;
    if (fullData.slam_map_size !== undefined) cleaning.slamMapSize = fullData.slam_map_size;
    if (fullData.robot_finemop_switch !== undefined) cleaning.robotFinemopSwitch = fullData.robot_finemop_switch;

    // Path data
    if (fullData.tr) {
      cleaning.tr = fullData.tr;
      cleaning.parsedTr = this.parseTrPath(fullData.tr);
    }

    // Interrupt reasons
    if (fullData.abnormal_end) {
      cleaning.taskInterruptReasonCode = fullData.abnormal_end;
      cleaning.taskInterruptReason = this.getTaskInterruptReasonName(fullData.abnormal_end);
    }
    if (fullData.cleaning_properties && fullData.cleaning_properties.abnormal_end) {
      cleaning.taskInterruptReasonCode = fullData.cleaning_properties.abnormal_end;
      cleaning.taskInterruptReason = this.getTaskInterruptReasonName(fullData.cleaning_properties.abnormal_end);
    }

    // Blocked segments
    if (fullData.area_clean_detail) {
      cleaning.segmentSkipDetails = fullData.area_clean_detail;
      cleaning.blockedSegments = {};

      for (const detail of fullData.area_clean_detail) {
        const segmentId = detail[0];
        const reasonCode = detail[1];
        const reasonText = this.getSegmentSkipReasonName(reasonCode);

        cleaning.blockedSegments[segmentId] = {
          reasonCode: reasonCode,
          reasonText: reasonText,
          x: detail[2] || null,
          y: detail[3] || null
        };
      }
    }

    // Additional flags
    if (fullData.bt) cleaning.bt = fullData.bt;
    if (fullData.completeFlag !== undefined) cleaning.completeFlag = fullData.completeFlag;
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  // Gets the timestamp of the first cleaning from device state - Timestamp in milliseconds
  async getFirstCleaningDate() {
    try {
      const state = await this.adapter.getStateAsync(`${this.deviceId}.state.FirstCleaningDate`);
      if (state?.val) {
        const val = state.val;

        // If val is a string that looks like a valid date
        if (typeof val === 'string' && !isNaN(Date.parse(val))) {
          return Date.parse(val);
        }

        // If val is a number
        if (typeof val === 'number') {
        // If the value is less than 10^10, assume it's in seconds
          if (val < 10000000000) {
            return val * 1000;
          }
          return val;
        }
      }

      return null;

    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not get first cleaning date: ${error.message}`);
      return null;
    }
  }

  // Formats a date for display in history lists
  formatDateForDisplay(date) {
    // Stelle sicher, dass date ein Date-Objekt ist
    let dateObj = date;
    if (typeof dateObj === 'string') {
      dateObj = new Date(dateObj);
    }
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const d = dateObj;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (now.getFullYear() === d.getFullYear()) {
      return `${day}.${month}. ${hours}:${minutes}`;
    } else {
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
  }

  // ============================================
  // AUTO UPDATE
  // ============================================

  // Starts periodic automatic update of history - Checks for new data at regular intervals
  startAutoUpdate() {
    if (this.updateTimer) clearInterval(this.updateTimer);
    this.updateTimer = setInterval(async () => {
      this.adapter.log.debug('[HISTORY] Automatic update...');
      await this.fetchAllHistory(10, true); // Only check for new entries
      await this.updateStatistics();
    }, this.updateInterval);
    this.adapter.log.info(`[HISTORY] Auto-update active (${this.updateInterval / 1000}s interval)`);
  }

  // Stops the periodic auto-update
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // Load cleaning history for a specific date based on a timestamp
  async loadHistoryByDate(targetTimestamp) {
    this.adapter.log.info(`[HISTORY] Loading history for date: ${new Date(targetTimestamp).toISOString()}`);

    // Calculate start and end of the day in seconds
    const startOfDaySec = Math.floor(targetTimestamp / 1000);
    const endOfDaySec = startOfDaySec + (24 * 60 * 60) - 1;

    // Fetch events starting from the beginning of the day
    const events = await this.getDeviceEvents('4.1', 150, startOfDaySec);

    // Exit early if no events returned
    if (!events || events.length === 0) {
      this.adapter.log.info(`[HISTORY] No events from API for ${new Date(targetTimestamp).toISOString()}`);
      return;
    }

    // Filter events belonging to the requested day
    const dayEvents = events.filter(event => {
      const eventTimeSec = Math.floor((event.time || event.createTime) / 1000);
      return eventTimeSec >= startOfDaySec && eventTimeSec <= endOfDaySec;
    });

    this.adapter.log.info(`[HISTORY] Found ${dayEvents.length} events for ${new Date(targetTimestamp).toISOString()}`);

    // Exit if no events match the requested date
    if (dayEvents.length === 0) {
      this.adapter.log.info(`[HISTORY] No events found for ${new Date(targetTimestamp).toISOString()}`);
      return;
    }

    // ========== 1. Load EXISTING completeMapData (full map details) ==========
    let existingCompleteMapData = {};
    let existingHistory = [];

    try {
    // Load full map data
      const completeState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.completeMapData`);
      if (completeState && completeState.val) {
        existingCompleteMapData = JSON.parse(completeState.val);
        this.adapter.log.info(`[HISTORY] Loaded ${Object.keys(existingCompleteMapData).length} existing complete map entries`);
      }

      // Load existing history
      const existingState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (existingState && existingState.val) {
        existingHistory = JSON.parse(existingState.val);
        this.adapter.log.info(`[HISTORY] Loaded ${existingHistory.length} existing history entries`);
      }
    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Could not load existing data: ${error.message}`);
    }

    // ========== 2. Process new events and load FULL map data ==========
    const newEntries = [];
    let mapLoadCount = 0;

    for (const event of dayEvents) {
      try {
        const historyStr = event.history || event.value;
        if (!historyStr) continue;

        const historyData = JSON.parse(historyStr);
        let timestamp = event.time || event.createTime;

        // Extract start time from history data
        const startTimeItem = Array.isArray(historyData)
          ? historyData.find(item => item && item.piid === 8)
          : null;
        if (startTimeItem && startTimeItem.value) {
          timestamp = startTimeItem.value;
        }

        // Parse basic cleaning data
        const cleaning = this.parseBasicCleaning(historyData, timestamp);

        if (cleaning && cleaning.date && !isNaN(cleaning.date.getTime())) {

          // Check if this entry already exists (by mapFileBase)
          const alreadyExists = existingHistory.some(e => e.mapFileBase === cleaning.mapFileBase);

          if (!alreadyExists) {
          // Load full map details ONLY for new entries
            if (cleaning.mapObjectName) {
              mapLoadCount++;
              this.adapter.log.debug(`[HISTORY] Loading map ${cleaning.mapFileBase} for date ${cleaning.date.toISOString()}`);

              const fullData = await this.loadMapFileWithDetails(
                cleaning.mapObjectName,
                cleaning.key
              );

              if (fullData) {
                await this.enrichCleaningWithMapData(cleaning, fullData);
                this.adapter.log.debug(`[HISTORY] Successfully enriched: path=${!!cleaning.parsedTr}, obstacles=${cleaning.obstacles?.length || 0}`);
              } else {
                this.adapter.log.warn(`[HISTORY] Could not load map data for ${cleaning.mapFileBase}`);
              }
            }
            newEntries.push(cleaning);
          } else {
            this.adapter.log.debug(`[HISTORY] Skipping duplicate entry: ${cleaning.mapFileBase}`);
          }
        }
      } catch (err) {
        this.adapter.log.debug(`[HISTORY] Error processing event: ${err.message}`);
      }
    }

    // ========== 3. Restore full data for ALL old entries ==========
    const restoredHistory = existingHistory.map(oldEntry => {
      if (oldEntry.mapObjectName && existingCompleteMapData[oldEntry.mapObjectName]) {
        const fullData = existingCompleteMapData[oldEntry.mapObjectName];
        // Only add missing fields
        return {
          ...oldEntry,
          parsedTr: fullData.parsedTr || oldEntry.parsedTr,
          obstacles: fullData.obstacles || oldEntry.obstacles,
          sa: fullData.sa || oldEntry.sa,
          cleanset: fullData.cleanset || oldEntry.cleanset,
          blockedSegments: fullData.blockedSegments || oldEntry.blockedSegments,
          aiObstacle: fullData.aiObstacle || oldEntry.aiObstacle,
          tr: fullData.tr || oldEntry.tr,
          motionStats: fullData.motionStats || oldEntry.motionStats
        };
      }
      return oldEntry;
    });

    // ========== 4. Combine old (restored) and new entries ==========
    if (newEntries.length > 0) {
      const combined = [...newEntries, ...restoredHistory];

      // Sort by timestamp (newest first)
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Save the complete history with all details
      await this.saveCleaningHistory(combined);
      await this.updateStatistics();

      this.adapter.log.info(`[HISTORY] ===== DATE LOAD SUMMARY =====`);
      this.adapter.log.info(`[HISTORY] New entries added: ${newEntries.length}`);
      this.adapter.log.info(`[HISTORY] Maps loaded: ${mapLoadCount}`);
      this.adapter.log.info(`[HISTORY] Total history size: ${combined.length}`);
      this.adapter.log.info(`[HISTORY] Complete map entries preserved: ${Object.keys(existingCompleteMapData).length}`);
    } else {
      this.adapter.log.info(`[HISTORY] No new entries found for this date`);
    }

    // Clear caches to free memory
    this.mapCache?.clear();
    this.imageCache?.clear();

    // Trigger UI update via state
    await this.adapter.setStateAsync(`${this.deviceId}.vis.history.sync`, {
      val: true,
      ack: false
    });

    // Reset sync state after a short delay
    setTimeout(async () => {
      await this.adapter.setStateAsync(`${this.deviceId}.vis.history.sync`, {
        val: false,
        ack: true
      });
    }, 1000);
  }

  // Load cleaning history for a specific date based on a timestamp
  async OLDloadHistoryByDate(targetTimestamp) {
    this.adapter.log.info(`[HISTORY] Loading history for date: ${new Date(targetTimestamp).toISOString()}`);

    // Calculate start and end of the day (in seconds)
    const startOfDaySec = Math.floor(targetTimestamp / 1000);
    const endOfDaySec = startOfDaySec + (24 * 60 * 60) - 1;

    // Fetch events starting from the beginning of the day
    const events = await this.getDeviceEvents('4.1', 150, startOfDaySec);

    // If no events returned from API → exit early
    if (!events || events.length === 0) {
      this.adapter.log.info(`[HISTORY] No events from API for ${new Date(targetTimestamp).toISOString()}`);
      return;
    }

    // Filter events that belong to the requested day
    const dayEvents = events.filter(event => {
      const eventTimeSec = Math.floor((event.time || event.createTime) / 1000);
      return eventTimeSec >= startOfDaySec && eventTimeSec <= endOfDaySec;
    });

    this.adapter.log.info(`[HISTORY] Found ${dayEvents.length} events for ${new Date(targetTimestamp).toISOString()}`);

    // If no events match the requested date → exit
    if (dayEvents.length === 0) {
      this.adapter.log.info(`[HISTORY] No events found for ${new Date(targetTimestamp).toISOString()}`);
      return;
    }

    // ========== Process each event with FULL details ==========
    const enrichedEntries = [];
    let mapLoadCount = 0;

    for (const event of dayEvents) {
      try {
        const historyStr = event.history || event.value;
        if (!historyStr) continue;

        const historyData = JSON.parse(historyStr);
        let timestamp = event.time || event.createTime;

        // Extract start time
        const startTimeItem = Array.isArray(historyData)
          ? historyData.find(item => item && item.piid === 8)
          : null;
        if (startTimeItem && startTimeItem.value) {
          timestamp = startTimeItem.value;
        }

        // Parse basic cleaning data
        const cleaning = this.parseBasicCleaning(historyData, timestamp);

        if (cleaning && cleaning.date && !isNaN(cleaning.date.getTime())) {
        // CRITICAL: Load FULL map data with all details (path, obstacles, rooms, etc.)
          if (cleaning.mapObjectName) {
            mapLoadCount++;
            this.adapter.log.debug(`[HISTORY] Loading map ${cleaning.mapFileBase} for date ${cleaning.date.toISOString()}`);

            const fullData = await this.loadMapFileWithDetails(
              cleaning.mapObjectName,
              cleaning.key
            );

            if (fullData) {
              await this.enrichCleaningWithMapData(cleaning, fullData);
              this.adapter.log.debug(`[HISTORY] Successfully enriched: path=${!!cleaning.parsedTr}, obstacles=${cleaning.obstacles?.length || 0}`);
            } else {
              this.adapter.log.warn(`[HISTORY] Could not load map data for ${cleaning.mapFileBase}`);
            }
          }
          enrichedEntries.push(cleaning);
        }
      } catch (err) {
        this.adapter.log.debug(`[HISTORY] Error processing event: ${err.message}`);
      }
    }

    // Save enriched entries to history
    if (enrichedEntries.length > 0) {
    // Load existing history
      let existingHistory = [];
      const existingState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
      if (existingState && existingState.val) {
        existingHistory = JSON.parse(existingState.val);
      }

      // Deduplicate by mapFileBase
      const existingMapFiles = new Set(existingHistory.map(e => e.mapFileBase).filter(Boolean));
      const trulyNew = enrichedEntries.filter(entry => !existingMapFiles.has(entry.mapFileBase));

      if (trulyNew.length > 0) {
        const combined = [...trulyNew, ...existingHistory];
        combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        await this.saveCleaningHistory(combined);
        await this.updateStatistics();

        this.adapter.log.info(`[HISTORY] Added ${trulyNew.length} entries with FULL details (${mapLoadCount} maps loaded)`);
      } else {
        this.adapter.log.info(`[HISTORY] No new entries after deduplication`);
      }
    }

    // Clear caches to free memory
    this.mapCache?.clear();
    this.imageCache?.clear();

    // Trigger UI update via state
    await this.adapter.setStateAsync(`${this.deviceId}.vis.history.sync`, {
      val: false,
      ack: false
    });
  }

  // Waits for a new cleaning to be available after a trigger
  async waitForNewCleaning(triggerTimestamp = null) {
    if (this.isWaitingForUpdate) {
      this.adapter.log.debug('[HISTORY] Already waiting for update');
      return;
    }

    this.isWaitingForUpdate = true;
    this.updateAttempts = 0;

    let lastCleaningTimestamp = 0;

    try {
    // 1. Try reading from `.latest`
      const latestState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.latest`);
      if (latestState?.val) {
        const latest = typeof latestState.val === 'string'
          ? JSON.parse(latestState.val)
          : latestState.val;

        if (latest.timestamp) {
          lastCleaningTimestamp = latest.timestamp;
          this.adapter.log.info(`[HISTORY] Last cleaning timestamp from .latest: ${new Date(lastCleaningTimestamp).toISOString()}`);
        }
      }

      // 2. Fallback: try reading from `.raw`
      if (!lastCleaningTimestamp) {
        const rawState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
        if (rawState?.val) {
          const raw = JSON.parse(rawState.val);
          if (raw.length > 0 && raw[0].timestamp) {
            lastCleaningTimestamp = raw[0].timestamp;
            this.adapter.log.info(`[HISTORY] Last cleaning timestamp from .raw[0]: ${new Date(lastCleaningTimestamp).toISOString()}`);
          }
        }
      }

      // 3. If no cleaning exists use triggerTimestamp if available, otherwise fallback to last 24 hours
      if (!lastCleaningTimestamp) {
        if (triggerTimestamp && triggerTimestamp > 0) {
          lastCleaningTimestamp = triggerTimestamp;
          this.adapter.log.info(`[HISTORY] Using triggerTimestamp as fallback: ${new Date(lastCleaningTimestamp).toISOString()}`);
        } else {
        // No history at all → load last 24 hours
          lastCleaningTimestamp = Date.now() - (24 * 60 * 60 * 1000);
          this.adapter.log.info(`[HISTORY] No history found, loading last 24h from: ${new Date(lastCleaningTimestamp).toISOString()}`);
        }
      }

    } catch (error) {
      this.adapter.log.warn(`[HISTORY] Failed to get last cleaning timestamp: ${error.message}`);
      lastCleaningTimestamp = triggerTimestamp || (Date.now() - (24 * 60 * 60 * 1000));
    }

    // Store the starting timestamp (milliseconds)
    this.targetDate = lastCleaningTimestamp;

    this.adapter.log.info(`[HISTORY] Starting intelligent update check from: ${new Date(this.targetDate).toISOString()}`);
    this.adapter.log.info(`[HISTORY] Checking every ${this.updateCheckInterval / 1000}s (max ${this.maxUpdateAttempts} attempts)`);

    this.intelligentUpdateInterval = setInterval(async () => {
      await this.checkForNewData();
    }, this.updateCheckInterval);
  }

  // Checks for new data during intelligent update - Compares latest map file with stored one
  async checkForNewData() {
    try {
      this.updateAttempts++;

      this.adapter.log.info(
        `[HISTORY] Checking for new data (attempt ${this.updateAttempts}/${this.maxUpdateAttempts})`
      );

      // Load last known map file and map key from state storage
      const lastMapFile = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.lastFile`);
      const lastMapKey = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.lastKey`);

      // Fetch latest cleaning events starting from the last known timestamp
      const startTime = this.targetDate ? Math.floor(this.targetDate / 1000) + 1 : 0;
      const cleaningEvents = await this.getDeviceEvents('4.1', 1, startTime);

      // No new events available → exit early or stop update loop if retry limit reached
      if (!cleaningEvents || cleaningEvents.length === 0) {
        this.adapter.log.info('[HISTORY] No new events from API');
        if (this.updateAttempts >= this.maxUpdateAttempts) {
          this.stopIntelligentUpdate();
        }
        return;
      }

      // Extract map metadata from the most recent event
      const newestEvent = cleaningEvents[0];
      let newestMapFile = null;
      let newestMapKey = null;

      if (newestEvent && newestEvent.value) {
        try {
          const historyData = JSON.parse(newestEvent.value);

          const fileNameItem = Array.isArray(historyData)
            ? historyData.find(item => item && item.piid === 9)
            : null;

          if (fileNameItem && fileNameItem.value) {
            const raw = String(fileNameItem.value);

            // Ignore invalid or empty map values
            if (raw === 'null' || raw === '' || raw === 'undefined') {
              this.adapter.log.debug(`[HISTORY] Skipping invalid map file: ${raw}`);
              newestMapFile = null;
              newestMapKey = null;
            } else {
            // Split combined value into file name and key (if available)
              if (raw.includes(',')) {
                const parts = raw.split(',');
                newestMapFile = parts[0];
                newestMapKey = parts[1];
              } else {
                newestMapFile = raw;
              }
            }
          }
        } catch (e) {
          this.adapter.log.info(`[HISTORY] Could not parse map info: ${e.message}`);
        }
      }

      // EARLY EXIT (important!)
      if (!newestMapFile || newestMapFile === 'null' || newestMapFile === '') {
        this.adapter.log.info(`[HISTORY] No valid map in event, stopping update loop`);
        this.stopIntelligentUpdate();
        return;
      }

      // ===== MAP COMPARISON LOGIC =====
      if (newestMapFile && lastMapFile?.val) {

        // Normalize file names (remove path, keep only filename)
        const newestFileClean = newestMapFile.split('/').pop() || newestMapFile;
        const lastFileClean = lastMapFile.val.split('/').pop() || lastMapFile.val;

        // Stop update loop if both map file and key are unchanged
        if (newestFileClean === lastFileClean && newestMapKey === lastMapKey?.val) {
          this.adapter.log.info(
            `[HISTORY] Same map detected, stopping update loop: ${newestFileClean}`
          );
          this.stopIntelligentUpdate();
          return;
        }

      } else {
      // Skip comparison if required map data is missing
        this.adapter.log.info( `[HISTORY] Comparison skipped: newestMapFile=${!!newestMapFile}, lastMapFile=${!!lastMapFile?.val}`);
      }

      // No match → assume new cleaning data is available
      this.adapter.log.info(`[HISTORY] New map detected, loading full history...`);

      const result = await this.fetchAllHistory(5, true);

      if (result && result.found) {
        this.adapter.log.info(`[HISTORY] New data found! +${result.newCleanings} cleanings`);

        await this.updateStatistics();

        // Validate latest stored cleaning against previous map file
        const latestCleaning = await this.getLatestCleaning();
        if (latestCleaning) {
          const newMapClean =
          latestCleaning.mapFileBase?.split('/').pop() || latestCleaning.mapFileBase;

          const lastFileClean =
          lastMapFile?.val?.split('/').pop() || lastMapFile?.val;

          if (newMapClean === lastFileClean) {
            this.adapter.log.warn(`[HISTORY] WARNING: Still same map after reload!`);
          } else {
            this.adapter.log.info(`[HISTORY] New cleaning confirmed: ${newMapClean}`);
          }
        }

        this.stopIntelligentUpdate();
      }

    } catch (error) {
      this.adapter.log.error(`[HISTORY] Check failed: ${error.message}`);

      // Stop update loop if retry limit is exceeded
      if (this.updateAttempts >= this.maxUpdateAttempts) {
        this.stopIntelligentUpdate();
      }
    }
  }
  // Stops the intelligent update polling
  stopIntelligentUpdate() {
    if (this.intelligentUpdateInterval) {
      clearInterval(this.intelligentUpdateInterval);
      this.intelligentUpdateInterval = null;
      this.isWaitingForUpdate = false;
      this.updateAttempts = 0;
      this.adapter.log.info('[HISTORY] Update stopped');
    }
  }

  async removeDuplicateHistoryEntries() {
    const rawState = await this.adapter.getStateAsync(`${this.deviceId}.history.cleaning.raw`);
    if (!rawState?.val) return;

    const history = JSON.parse(rawState.val);

    // Deduplicate by mapFileBase
    const uniqueMap = new Map();
    for (const entry of history) {
      const key = entry.mapFileBase;
      // Keep the newest entry (based on timestamp) for each mapFileBase
      if (!uniqueMap.has(key) || (uniqueMap.get(key).timestamp < entry.timestamp)) {
        uniqueMap.set(key, entry);
      }
    }

    const deduplicated = Array.from(uniqueMap.values());

    // Sort by timestamp (newest first)
    deduplicated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    await this.saveCleaningHistory(deduplicated);

    this.adapter.log.info(`[HISTORY] Deduplicated: ${history.length} -> ${deduplicated.length} entries`);
  }

  // ============================================
  // TRANSLATIONS
  // ============================================
  getTranslations() {
    return {
      EN: {
        status: {
          0: 'Idle', 1: 'Paused', 2: 'Cleaning', 3: 'Back home',
          4: 'Part cleaning', 5: 'Follow wall', 6: 'Charging',
          7: 'OTA', 8: 'FCT', 9: 'WiFi setup', 10: 'Power off',
          11: 'Factory', 12: 'Error', 13: 'Remote control',
          14: 'Sleeping', 15: 'Self test', 16: 'Factory test',
          17: 'Standby', 18: 'Segment cleaning', 19: 'Zone cleaning',
          20: 'Spot cleaning', 21: 'Fast mapping', 22: 'Cruising path',
          23: 'Cruising point', 24: 'Summon clean', 25: 'Shortcut',
          26: 'Person follow', 1501: 'Water check'
        },
        suction: { 0: 'Quiet', 1: 'Standard', 2: 'Strong', 3: 'Turbo' },
        waterTank: { 0: 'Not installed', 1: 'Installed', 10: 'Mop installed', 99: 'Mop in station' },
        cleanupMethod: { '-1': 'Other', 0: 'Default', 1: 'Customized', 2: 'Cleangenius', 3: 'Water stain' },
        startupMethod: { '-1': 'Other', 0: 'Button', 1: 'App', 2: 'Schedule', 3: 'Voice' },
        taskEndType: { 0: 'Other', 1: 'Manual dock', 2: 'Normal recharge', 3: 'Abnormal dock', 4: 'Stop' },
        obstacleTypes: {
          0: 'Unknown', 128: 'Base', 129: 'Scale', 130: 'Thread',
          131: 'Wire', 132: 'Toy', 133: 'Shoes', 134: 'Sock',
          135: 'Poo', 136: 'Trash can', 137: 'Fabric', 138: 'Power strip',
          139: 'Liquid stain', 142: 'Obstacle', 157: 'Person', 158: 'Pet',
          160: 'Dark furniture leg', 163: 'Cleaning tools', 169: 'Detected stain',
          200: 'Blocked room', 201: 'Stuck furniture', 202: 'Mixed stain',
          204: 'Leg', 205: 'Large particles', 206: 'Dried stain',
          209: 'Food bowl', 210: 'Pet bed', 214: 'Cleaned stain',
          215: 'Cleaned mixed', 216: 'Cleaned dried', 217: 'Cleaned large'
        },
        segmentSkipReason: {
          2: 'Blocked by virtual wall',
          3: 'Blocked by door',
          4: 'Blocked by threshold',
          5: 'Blocked by obstacle',
          6: 'Blocked by carpet',
          7: 'Blocked by detected carpet',
          8: 'Blocked by hidden obstacle',
          9: 'Blocked by dynamic obstacle',
          10: 'Passage too low',
		  11: 'Stuck on obstacle',
          27: 'Step too low',
          33: 'Failed to cross threshold'
        },
        taskInterruptReason: {
          0: 'Task completed',
          11: 'Robot lifted',
          12: 'Robot fallen',
          13: 'Cliff sensor error',
          14: 'Mop pad removed',
          15: 'Mop pad fallen off',
          16: 'Mop pad stuck',
          17: 'Mop pad fallen off by table',
          18: 'Mop pad fallen off by obstacle',
          19: 'Mop pad abnormally removed',
          20: 'Mop pad fallen off crossing obstacle',
          21: 'Brush entangled by obstacle',
          22: 'Brush entangled by carpet',
          23: 'Brush entangled by object',
          24: 'Laser distance sensor error',
          25: 'Robot is stuck on step',
          26: 'Robot is stuck on obstacle',
          27: 'Base station powered off',
          101: 'Abnormal docking',
          102: 'Cannot find base station'
        }
      },
      DE: {
        status: {
          0: 'Bereit', 1: 'Pausiert', 2: 'Reinigung', 3: 'Rückfahrt',
          4: 'Teilreinigung', 5: 'Wandfolge', 6: 'Laden',
          7: 'OTA', 8: 'FCT', 9: 'WiFi-Setup', 10: 'Ausgeschaltet',
          11: 'Werkseinstellungen', 12: 'Fehler', 13: 'Fernsteuerung',
          14: 'Schlafend', 15: 'Selbsttest', 16: 'Werktest',
          17: 'Bereitschaft', 18: 'Raumreinigung', 19: 'Zonenreinigung',
          20: 'Punktreinigung', 21: 'Kartierung', 22: 'Fahrtroute',
          23: 'Zielpunkt', 24: 'Rufreinigung', 25: 'Schnellbefehl',
          26: 'Person folgen', 1501: 'Wasserprüfung'
        },
        suction: { 0: 'Leise', 1: 'Standard', 2: 'Stark', 3: 'Turbo' },
        waterTank: { 0: 'Nicht installiert', 1: 'Installiert', 10: 'Mopp installiert', 99: 'Mopp in Station' },
        cleanupMethod: { '-1': 'Andere', 0: 'Standard', 1: 'Benutzerdefiniert', 2: 'Cleangenius', 3: 'Wasserfleck' },
        startupMethod: { '-1': 'Andere', 0: 'Taste', 1: 'App', 2: 'Zeitgesteuert', 3: 'Sprache' },
        taskEndType: { 0: 'Andere', 1: 'Manuelles Andocken', 2: 'Normales Laden', 3: 'Abnormales Andocken', 4: 'Stopp' },
        obstacleTypes: {
          0: 'Unbekannt', 128: 'Basis', 129: 'Waage', 130: 'Faden',
          131: 'Kabel', 132: 'Spielzeug', 133: 'Schuhe', 134: 'Socke',
          135: 'Kot', 136: 'Mülleimer', 137: 'Stoff', 138: 'Steckdosenleiste',
          139: 'Flüssigkeit', 142: 'Hindernis', 157: 'Person', 158: 'Haustier',
          160: 'Dunkles Möbelbein', 163: 'Reinigungswerkzeug', 169: 'Fleck',
          200: 'Blockierter Raum', 201: 'Schwierige Möbel', 202: 'Gemischter Fleck',
          204: 'Bein', 205: 'Große Partikel', 206: 'Eingetrockneter Fleck',
          209: 'Napf', 210: 'Haustierbett', 214: 'Gereinigter Fleck',
          215: 'Gereinigt gemischt', 216: 'Gereinigt trocken', 217: 'Gereinigt groß'
        },
        segmentSkipReason: {
          2: 'Blockiert durch virtuelle Wand',
          3: 'Blockiert durch Tür',
          4: 'Blockiert durch Schwelle',
          5: 'Blockiert durch Hindernis',
          6: 'Blockiert durch Teppich',
          7: 'Blockiert durch erkannten Teppich',
          8: 'Blockiert durch verstecktes Hindernis',
          9: 'Blockiert durch dynamisches Hindernis',
          10: 'Durchgang zu niedrig',
		  11: 'Steckt am Hindernis fest',
          27: 'Stufe zu niedrig',
          33: 'Schwelle überqueren fehlgeschlagen'
        },
        taskInterruptReason: {
          0: 'Aufgabe abgeschlossen',
          11: 'Roboter angehoben',
          12: 'Roboter gefallen',
          13: 'Kantensensor-Fehler',
          14: 'Mopp-Pad entfernt',
          15: 'Mopp-Pad abgefallen',
          16: 'Mopp-Pad stecken geblieben',
          17: 'Mopp-Pad abgefallen vom Tisch',
          18: 'Mopp-Pad abgefallen durch Hindernis',
          19: 'Mopp-Pad abnormal entfernt',
          20: 'Mopp-Pad abgefallen beim Hindernisüberqueren',
          21: 'Bürste verheddert durch Hindernis',
          22: 'Bürste verheddert durch Teppich',
          23: 'Bürste verheddert durch Objekt',
          24: 'Laserdistanzsensor-Fehler',
          25: 'Roboter steckt auf Stufe fest',
          26: 'Roboter steckt an Hindernis fest',
          27: 'Basisstation ausgeschaltet',
          101: 'Abnormales Andocken',
          102: 'Basisstation nicht gefunden'
        }
      }
    };
  }

  // Translation getter methods
  getStatusName(value) { return (this.translations[this.userLang] || this.translations.EN).status[value] || `Unknown (${value})`; }
  getSuctionLevelName(value) { return (this.translations[this.userLang] || this.translations.EN).suction[value] || `Unknown (${value})`; }
  getWaterTankName(value) { return (this.translations[this.userLang] || this.translations.EN).waterTank[value] || `Unknown (${value})`; }
  getCleanupMethodName(value) { return (this.translations[this.userLang] || this.translations.EN).cleanupMethod[value] || `Unknown (${value})`; }
  getStartupMethodName(value) { return (this.translations[this.userLang] || this.translations.EN).startupMethod[value] || `Unknown (${value})`; }
  getTaskEndTypeName(value) { return (this.translations[this.userLang] || this.translations.EN).taskEndType[value] || `Unknown (${value})`; }
  getObstacleTypeName(value) { return (this.translations[this.userLang] || this.translations.EN).obstacleTypes[value] || `Unknown (${value})`; }
  getSegmentSkipReasonName(value) { return (this.translations[this.userLang] || this.translations.EN).segmentSkipReason[value] || `Unknown (${value})`; }
  getTaskInterruptReasonName(value) { return (this.translations[this.userLang] || this.translations.EN).taskInterruptReason[value] || `Unknown (${value})`; }

  // ============================================
  // CLEANUP
  // ============================================

  destroy() {
    this.stopAutoUpdate();
    this.mapCache.clear();
    this.imageCache.clear();
    this.adapter.log.info('[HISTORY] Module destroyed');
  }
}

module.exports = DreameHistory;