// ============== CONSTANTS & CONFIGURATION ==============
const WATER_TRACKING = {
  MAX_ML: 4500,                 // Maximum tank capacity in milliliters => Will be overwritten by detectModel()
  DEFAULT_ML_PER_SQM: 26,       // Default water consumption in milliliters per square meter
  LEARNING_SAMPLES: 20,         // Number of stored consumption values for learning
  MOPPING_MODES: [5120, 5121, 5123, 3840], // Mopping modes from dreamehome
  MIN_AREA_DELTA: 0.5,          // Minimum area progress (m�)
  ROOM_COOLDOWN: 30000,         // 30 seconds (no updates in the same room)

  // AI LEARNING COMPONENT
  LEARNING: {
    MIN_SAMPLES_PER_LEVEL: 5,   // Minimum samples per level for valid learning
    MAX_SAMPLES_PER_LEVEL: 100, // Maximum stored samples
    CONFIDENCE_THRESHOLD: 0.7,  // Minimum confidence for adjustment
    ADJUSTMENT_RATE: 0.3,       // How strong adjustments are (0.1 = slow, 0.5 = fast)
    DECAY_RATE: 0.95,           // Forgetting curve (older data loses weight)

    // Feature weighting for prediction
    FEATURE_WEIGHTS: {
      tank_size: 0.35,          // Tank size
      wash_level: 0.25,         // Wash level
      hot_wash: 0.15,           // Hot water wash
      super_wash: 0.10,         // Super wash
      auto_wash: 0.10,          // Auto wash level
      room_type: 0.05           // Room type (optional)
    }
  },

  // MOP WASH SETTINGS
  MOP_WASH: {
    BASE_BY_TANK: {
      2000: 50,
      2500: 60,
      3000: 70,
      4000: 90,
      4500: 110,
      5000: 130
    },
    MIN_WATER: 30
  }
};

// ============== TANK CAPACITY DEFINITIONS ==============
const CAPACITIES = {
  TANK_2L: 2000,
  TANK_2_5L: 2500,
  TANK_3L: 3000,
  TANK_4L: 4000,
  TANK_4_5L: 4500,
  TANK_5L: 5000,
  DEFAULT: 4500
};

// ============== MODEL DATABASE ==============
const MODEL_WATER_CAPACITIES = {
  // ==================== MATRIX / X-SERIES (5.0L) ====================
  'dreame.vacuum.r25135': CAPACITIES.TANK_5L,   // Matrix 10 Ultra
  'dreame.vacuum.r2415': CAPACITIES.TANK_5L,    // Matrix 10
  'dreame.vacuum.r2416': CAPACITIES.TANK_5L,    // Matrix 10 Pro
  'dreame.vacuum.r2417': CAPACITIES.TANK_5L,    // Matrix 10 Ultra (old)
  'dreame.vacuum.r2410': CAPACITIES.TANK_5L,    // Matrix
  'dreame.vacuum.r2411': CAPACITIES.TANK_5L,    // Matrix Pro
  'dreame.vacuum.r2412': CAPACITIES.TANK_5L,    // Matrix Ultra
  'dreame.vacuum.r2310': CAPACITIES.TANK_5L,    // X30 Ultra
  'dreame.vacuum.r2311': CAPACITIES.TANK_5L,    // X30
  'dreame.vacuum.r2312': CAPACITIES.TANK_5L,    // X30 Global
  'dreame.vacuum.r2315': CAPACITIES.TANK_5L,    // X40 Ultra
  'dreame.vacuum.r2320': CAPACITIES.TANK_5L,    // X30 Pro
  'dreame.vacuum.r2322': CAPACITIES.TANK_5L,    // X40
  'dreame.vacuum.r2350': CAPACITIES.TANK_5L,    // X30 Ultra (new HW)
  'dreame.vacuum.r2356': CAPACITIES.TANK_5L,    // X40 Ultra (new HW)

  // ==================== L20 / L30 SERIES (4.5L) ====================
  'dreame.vacuum.r2235': CAPACITIES.TANK_4_5L,  // L20 Ultra
  'dreame.vacuum.r2240': CAPACITIES.TANK_4_5L,  // L20s Ultra
  'dreame.vacuum.r2242': CAPACITIES.TANK_4_5L,  // L20 Global
  'dreame.vacuum.r2245': CAPACITIES.TANK_4_5L,  // L30 Ultra
  'dreame.vacuum.r2246': CAPACITIES.TANK_4_5L,  // L30
  'dreame.vacuum.r2261': CAPACITIES.TANK_4_5L,  // L20 Ultra Global
  'dreame.vacuum.r2262': CAPACITIES.TANK_4_5L,  // L20 Ultra EU
  'dreame.vacuum.r2263': CAPACITIES.TANK_4_5L,  // L20s Ultra
  'dreame.vacuum.r2316': CAPACITIES.TANK_4_5L,  // L20 Ultra (new version)

  // ==================== L10s WITH STATION (4.0L) ====================
  'dreame.vacuum.r2215o': CAPACITIES.TANK_4L,   // L10s Ultra (Pro?)
  'dreame.vacuum.r2216': CAPACITIES.TANK_4L,    // L10s Ultra China
  'dreame.vacuum.r2231': CAPACITIES.TANK_4L,    // L10s Plus
  'dreame.vacuum.r2232': CAPACITIES.TANK_4L,    // L10s Plus EU
  'dreame.vacuum.r2233': CAPACITIES.TANK_4L,    // L10s Pro China
  'dreame.vacuum.r2250': CAPACITIES.TANK_4L,    // L10s Ultra Global
  'dreame.vacuum.r2251': CAPACITIES.TANK_4L,    // L10s Ultra EU
  'dreame.vacuum.r2253': CAPACITIES.TANK_4L,    // L10s Pro Global
  'dreame.vacuum.r2254': CAPACITIES.TANK_4L,    // L10s Pro EU
  'dreame.vacuum.r2257': CAPACITIES.TANK_4L,    // L10s Pro US

  // ==================== L10 / L10s WITHOUT STATION (2.5L) ====================
  'dreame.vacuum.r2225': CAPACITIES.TANK_2_5L,  // L10 Pro
  'dreame.vacuum.r2228': CAPACITIES.TANK_2_5L,  // L10 Pro Global
  'dreame.vacuum.r2229': CAPACITIES.TANK_2_5L,  // L10 (no station)
  'dreame.vacuum.r2255': CAPACITIES.TANK_2_5L,  // L10s (no station)
  'dreame.vacuum.r2256': CAPACITIES.TANK_2_5L,  // L10s EU (no station)

  // ==================== Z-SERIES (5.0L) ====================
  'dreame.vacuum.r2285': CAPACITIES.TANK_5L,
  'dreame.vacuum.r2288': CAPACITIES.TANK_5L,
  'dreame.vacuum.r2290': CAPACITIES.TANK_5L,
  'dreame.vacuum.r2291': CAPACITIES.TANK_5L,
  'dreame.vacuum.r2295': CAPACITIES.TANK_5L,
  'dreame.vacuum.r2296': CAPACITIES.TANK_5L,
  'dreame.vacuum.r2297': CAPACITIES.TANK_5L,

  // ==================== W-SERIES (4.0L) ====================
  'dreame.vacuum.r2266': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2267': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2269': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2270': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2271': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2272': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2275': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2276': CAPACITIES.TANK_4L,
  'dreame.vacuum.r2277': CAPACITIES.TANK_4L,

  // ==================== D-SERIES (2.0�2.5L) ====================
  'dreame.vacuum.r2104': CAPACITIES.TANK_2L,
  'dreame.vacuum.r2105': CAPACITIES.TANK_2L,
  'dreame.vacuum.r2108': CAPACITIES.TANK_2_5L,
  'dreame.vacuum.r2109': CAPACITIES.TANK_2_5L,
  'dreame.vacuum.r2115': CAPACITIES.TANK_2_5L,
  'dreame.vacuum.r2116': CAPACITIES.TANK_2_5L,
  'dreame.vacuum.r2205': CAPACITIES.TANK_2L,
  'dreame.vacuum.r2206': CAPACITIES.TANK_2L,
  'dreame.vacuum.r2209': CAPACITIES.TANK_2_5L,
  'dreame.vacuum.r2210': CAPACITIES.TANK_2_5L,

  // ==================== F-SERIES (3.0L) ====================
  'dreame.vacuum.r2301': CAPACITIES.TANK_3L,
  'dreame.vacuum.r2302': CAPACITIES.TANK_3L,
  'dreame.vacuum.r2303': CAPACITIES.TANK_3L,
  'dreame.vacuum.r2305': CAPACITIES.TANK_3L,
  'dreame.vacuum.r2306': CAPACITIES.TANK_3L,
  'dreame.vacuum.r2307': CAPACITIES.TANK_3L,

  // ==================== DEFAULT ====================
  'default': CAPACITIES.DEFAULT
};

// Models with washing station (used for L10s detection)
const MODELS_WITH_STATION = new Set([
  'r2215o', 'r2216', 'r2231', 'r2232', 'r2233',
  'r2250', 'r2251', 'r2253', 'r2254', 'r2257'
]);

// ============== WATER TRACKING MODULE CLASS ==============
class WaterTrackingModule {

  firstStartWaterTrack = true;
	  lastCleanedArea = 0;
  lastWaterUpdateTime = 0;
  // Initialize the water tracking module
  constructor(adapter, deviceId, deviceModel, DreameMopWashLevel = null, UserLang = 'EN') {
    this.adapter = adapter;
    this.deviceId = deviceId;
    this.deviceModel = deviceModel;
	   this.DreameMopWashLevel = DreameMopWashLevel;
    this.UserLang = UserLang;

    // Core tracking state
    this.waterTracking = null;
    this.isCleaningActive = false;
    this.firstWaterTrackingActive = false;

    // Initialize detergent module
    this.detergentModule = new DetergentTrackingModule(
      adapter,           // Adapter instance for communication
      deviceId,          // Unique device identifier
      deviceModel,       // Device model string
      DreameMopWashLevel, // Mop wash level definitions
      UserLang           // User language
    );


    // Caches
    this.waterTrackingCache = {
      mode: null,
      waterLevel: null
    };

    this.consumptionDataCache = {
      data: null,
      lastUpdate: 0,
      cacheTTL: 60000 // 1 minute cache validity
    };

    // Auto-save controller
    this.autoSaveInterval = null;


    // AI instance
    this.washWaterAI = null;
  }

  // ============== INITIALIZATION ==============

  // Initialize the module
  async initialize() {
    try {
      // Detect model capacity
      await this.detectModelCapacity(this.deviceModel);

      // Initialize water tracking
      await this.initWaterTracking();

      // Initialize AI system
      await this.initAI();

      // Restore any persisted data
      await this.restorePersistedData();

      // Initialize direct mop tracker for models without API support
      await this.initDirectMopTracker();

      // Initialize detergent module (if available)

      if (this.detergentModule) {
        await this.detergentModule.initialize();
      }


      this.adapter.log.info('[WaterTracking] Module initialized successfully');
      return true;
    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Initialization failed: ${error.message}`);
      return false;
    }
  }

  // Initialize water tracking state

  async initWaterTracking() {
    this.waterTracking = {
      currentMl: WATER_TRACKING.MAX_ML,
      initialMl: WATER_TRACKING.MAX_ML,
      roomData: {},
      isMopping: false,
      lastRoom: null,
      lastUpdate: Date.now()
    };

    // Create state objects
    const states = [
      { id: 'ConsumptionData', name: 'Water consumption data', type: 'string', role: 'json', def: '{}' },
      { id: 'CurrentMlPerSqm', name: 'Current water consumption', type: 'number', role: 'value', unit: 'ml/m²', def: WATER_TRACKING.DEFAULT_ML_PER_SQM },
      { id: 'PureWaterTank', name: 'Current pure water tank level', type: 'number', role: 'value.percent', unit: '%', def: 100, min: 0, max: 100 },
      { id: 'BeforeRemoval', name: 'Water level before tank removal', type: 'number', role: 'value', unit: 'ml', def: 0, min: 0, max: WATER_TRACKING.MAX_ML },
      { id: 'RoomConsumption', name: 'Water consumption by room', type: 'string', role: 'json' },
      { id: 'LastRemovalTime', name: 'Last water tank removal time', type: 'number', role: 'value.time', def: 0 },
      { id: 'Current', name: 'Current water level', type: 'number', role: 'value.water', unit: 'ml', min: 0, max: WATER_TRACKING.MAX_ML, def: WATER_TRACKING.MAX_ML },
      { id: 'LearningStats', name: 'Water consumption statistics', type: 'string', role: 'json' },
      { id: 'LastError', name: 'Last water tracking error', type: 'string', role: 'json' },
	  { id: 'ResetPureWaterTank', name: 'Reset pure water tank', type: 'number', role: 'value.percent', unit: '%', def: 100, min: 0, max: 100, write: true }
    ];

    for (const state of states) {
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.water.${state.id}`, {
        type: 'state',
        common: {
          name: state.name,
          type: state.type,
          role: state.role,
          read: true,
          write: state.id !== 'RoomConsumption' && state.id !== 'LearningStats',
          def: state.def,
          ...(state.unit && { unit: state.unit }),
          ...(state.min !== undefined && { min: state.min }),
          ...(state.max !== undefined && { max: state.max })
        },
        native: {}
      });
    }

    this.adapter.log.info('[WaterTracking] Water tracking initialized');
  }

  // Initialize AI system
  async initAI() {
    try {
    // 1. Create state if it does not exist yet
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.water.WashLearningAI`, {
        type: 'state',
        common: {
          name: 'Wash AI Learning Data',
          type: 'string',
          role: 'json',
          read: true,
          write: false,
          def: '{"version":1,"models":{},"features":{},"predictions":[],"lastTraining":0,"totalSamples":0}'
        },
        native: {}
      });

      // 2. Create WashWaterAI instance
      this.washWaterAI = new WashWaterAI(this.adapter, this.deviceId);

      // 3. Initialize WashWaterAI (this method contains createDefaultLearningData)
      await this.washWaterAI.initialize();

      // 4. Create AI status state
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.water.AIStatus`, {
        type: 'state',
        common: {
          name: 'AI Learning Status',
          type: 'string',
          role: 'json',
          read: true,
          write: false
        },
        native: {}
      });

      // Build the AI status info object
      const aiStatus = {
        initialized: true,
        version: 1,
        totalSamples: this.washWaterAI.learningData?.totalSamples || 0,
        trainedModels: Object.keys(this.washWaterAI.learningData?.models || {}).length,
        lastTraining: this.washWaterAI.learningData?.lastTraining || 0,
        status: 'active'
      };

      // Store the AI status
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.AIStatus`, {
        val: JSON.stringify(aiStatus),
        ack: true
      });

      this.adapter.log.info(
        `[WaterTracking-AI] Initialized with ${aiStatus.totalSamples} samples, ${aiStatus.trainedModels} trained models`
      );

    } catch (error) {
      this.adapter.log.error(`[WaterTracking-AI] Initialization failed: ${error.message}`);

      // Disable AI, but allow the rest of the module to continue operating
      this.washWaterAI = null;
    }
  }

  // Initialize direct mop tracker for models without API support
  async initDirectMopTracker() {
    try {
      this.directMopTracker = new DirectMopTracker(
        this.adapter,
        this.deviceId,
        this.deviceModel,
        //this.DreameMopWashLevel,
        //this.UserLang
      );

      if (this.directMopTracker.needsTracking) {
        // Set water tracking reference
        this.directMopTracker.setWaterTracking(this.waterTracking);

        await this.directMopTracker.createMopApiStates();
        await this.directMopTracker.restoreMopData(); // Restore saved data

        this.adapter.log.info(`[WaterTracking] DirectMopTracker initialized for ${this.deviceModel}`);
      }
    } catch (error) {
      this.adapter.log.error(`[WaterTracking] DirectMopTracker initialization failed: ${error.message}`);
      this.directMopTracker = null;
    }
  }

  // ============== MODEL DETECTION ==============

  // Detect robot model and adjust water tracking parameters
  async detectModelCapacity(model) {
    if (!model) return null;

    try {
      const modelStr = model.toString().trim();
      const modelLower = modelStr.toLowerCase();

      let capacity = MODEL_WATER_CAPACITIES.default;
      let defaultMlPerSqm = 16;
      let modelId = null;

      // Extract model ID
      const idMatch = modelLower.match(/[rp]\d+[a-z]?/);
      if (idMatch) modelId = idMatch[0];

      // 1. Exact match
      if (MODEL_WATER_CAPACITIES[modelStr]) {
        capacity = MODEL_WATER_CAPACITIES[modelStr];
      }
      // 2. Match by model ID only
      else if (modelId && MODEL_WATER_CAPACITIES[`dreame.vacuum.${modelId}`]) {
        capacity = MODEL_WATER_CAPACITIES[`dreame.vacuum.${modelId}`];
      }
      // 3. Pattern-based series detection
      else {
        if (
          modelLower.includes('matrix') ||
          modelLower.includes('x30') ||
          modelLower.includes('x40') ||
          (modelId &&
           (modelId.startsWith('r241') ||
            modelId.startsWith('r251') ||
            modelId.startsWith('r235')))
        ) {
          capacity = CAPACITIES.TANK_5L;
        }
        else if (
          modelLower.includes('l20') ||
          modelLower.includes('l30') ||
          (modelId &&
           (modelId.startsWith('r2235') ||
            modelId.startsWith('r224') ||
            modelId === 'r2316'))
        ) {
          capacity = CAPACITIES.TANK_4_5L;
        }
        else if (modelLower.includes('l10s')) {
          // Determine if washing station exists
          capacity = (modelId && MODELS_WITH_STATION.has(modelId))
            ? CAPACITIES.TANK_4L
            : CAPACITIES.TANK_2_5L;
        }
        else if (modelLower.includes('l10')) {
          capacity = CAPACITIES.TANK_2_5L;
        }
        else if (
          modelLower.includes('z10') ||
          modelLower.includes('z20') ||
          (modelId &&
           (modelId.startsWith('r228') || modelId.startsWith('r229')))
        ) {
          capacity = CAPACITIES.TANK_5L;
        }
        else if (
          modelLower.includes('w10') ||
          modelLower.includes('w20') ||
          modelLower.includes('w30') ||
          (modelId &&
           (modelId.startsWith('r226') || modelId.startsWith('r227')))
        ) {
          capacity = CAPACITIES.TANK_4L;
        }
        else if (
          modelLower.includes('d9') ||
          (modelId && (modelId === 'r2104' || modelId === 'r2205'))
        ) {
          capacity = CAPACITIES.TANK_2L;
        }
        else if (
          modelLower.includes('d10') ||
          modelLower.includes('d20') ||
          (modelId &&
           (modelId === 'r2108' || modelId === 'r2209'))
        ) {
          capacity = CAPACITIES.TANK_2_5L;
        }
        else if (
          modelLower.includes('f9') ||
          modelLower.includes('f10') ||
          (modelId && modelId.startsWith('r230'))
        ) {
          capacity = CAPACITIES.TANK_3L;
        }
      }

      // Determine default water consumption per sqm (dependent on tank size)
      if (capacity >= CAPACITIES.TANK_5L) {
        defaultMlPerSqm = 18;
      } else if (capacity >= CAPACITIES.TANK_4L) {
        defaultMlPerSqm = 16;
      } else if (capacity >= CAPACITIES.TANK_2_5L) {
        defaultMlPerSqm = 14;
      } else {
        defaultMlPerSqm = 12;
      }

      // Update configuration
      WATER_TRACKING.MAX_ML = capacity;
      WATER_TRACKING.DEFAULT_ML_PER_SQM = defaultMlPerSqm;

      // Create info state
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.water`, {
        type: 'channel',
        common: { name: 'Water Information', read: true },
        native: {}
      });

      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.water.DetectedCapacity`, {
        type: 'state',
        common: {
          name: 'Detected tank capacity',
          type: 'number',
          role: 'value.volume',
          unit: 'ml',
          read: true,
          write: false
        },
        native: {}
      });

      await this.adapter.setStateAsync(`${this.deviceId}.state.water.DetectedCapacity`, {
        val: capacity,
        ack: true
      });

      this.adapter.log.info(
        `[WaterTracking] ${modelStr} ? ${capacity}ml (${(capacity / 1000).toFixed(1)}L), ${defaultMlPerSqm}ml/m²`
      );

      return { capacity, defaultMlPerSqm };

    } catch (error) {
      this.adapter.log.warn(`[WaterTracking] Model detection error for ${model}: ${error.message}`);
      return null;
    }
  }

  // ============== CORE WATER TRACKING FUNCTIONS ==============

  // Update water consumption based on cleaning progress
  async updateWaterConsumption(currentAreaM2, currentRoom) {
    const now = Date.now();
    if (now - this.lastWaterUpdateTime < 10000) { // 10 seconds cooldown
      //this.adapter.log.info(`[WaterTracking] Skipping - update called too frequently`);
      return;
    }
    this.lastWaterUpdateTime = now;
    try {
      if (!this.waterTracking) await this.initWaterTracking();

      // ===== Update wash level cache =====
      await this.updateWaterTrackingCache();

      // Validation
      if (!this.waterTracking.isMopping || !currentRoom || currentAreaM2 <= 0) {
        this.adapter.log.info('[WaterTracking] Water tracking skipped - invalid conditions');
        return;
      }

      // Initialize room data
      if (!this.waterTracking.roomData[currentRoom]) {
        this.waterTracking.roomData[currentRoom] = {
          lastRecordedArea: 0,
          consumedMl: 0,
          firstContactArea: null,
          maxCleanedArea: 0,
          lastUpdateTime: Date.now(),
          consumptionRates: []
        };
      }

      const room = this.waterTracking.roomData[currentRoom];

      if (!room.consumptionRates) {
        room.consumptionRates = [];
      }

      // Recognize room changes
      if (room.firstContactArea === null || this.waterTracking.lastRoom !== currentRoom) {
        room.firstContactArea = currentAreaM2;
        room.lastRecordedArea = currentAreaM2;
        this.waterTracking.lastRoom = currentRoom;
        this.adapter.log.info(`[WaterTracking] New room: ${currentRoom} | Area: ${currentAreaM2.toFixed(2)}m²`);

        // ===== Update mop tracking on room change =====
        if (this.directMopTracker && this.directMopTracker.needsTracking) {
          await this.directMopTracker.updateMopTracking(currentAreaM2);
        }
        return;
      }

      // ===== Start or update mop tracking =====
      if (this.directMopTracker && this.directMopTracker.needsTracking) {
      // Start tracking if not active
        if (!this.directMopTracker.mopTracking?.isActive) {
          await this.directMopTracker.startMopTracking();
		  // Update immediately after startup with parameter
		  await this.directMopTracker.updateMopTracking(currentAreaM2);
        } else {
        // Update existing tracking
          await this.directMopTracker.updateMopTracking(currentAreaM2);
        }
      }

      // Calculate area progress
      const newArea = currentAreaM2 - room.lastRecordedArea;
      if (newArea < WATER_TRACKING.MIN_AREA_DELTA) {
      // ===== Update mop tracking anyway =====
        if (this.directMopTracker && this.directMopTracker.needsTracking &&
          this.directMopTracker.mopTracking?.isActive) {
          await this.directMopTracker.updateMopTracking(currentAreaM2);
        }
        return;
      }

      // Get AI-optimized consumption rate
      const aiPrediction = await this.getAIWaterConsumption(newArea, currentRoom);
      const mlPerSqm = Math.min(150, Math.max(10, aiPrediction.rate || WATER_TRACKING.DEFAULT_ML_PER_SQM));

      const estimatedConsumption = newArea * mlPerSqm;
      const actualConsumption = Math.min(estimatedConsumption, this.waterTracking.currentMl);
      const consumptionAccuracy = await this.calculateConsumptionAccuracy(
        estimatedConsumption, actualConsumption, newArea);

      // Update tracking
      this.waterTracking.currentMl -= actualConsumption;
      room.consumedMl += actualConsumption;
      room.lastRecordedArea = currentAreaM2;
      room.maxCleanedArea = Math.max(room.maxCleanedArea, currentAreaM2);
      room.lastUpdateTime = Date.now();
      this.waterTracking.lastUpdate = Date.now();

      // Save consumption rate
      if (actualConsumption > 0 && newArea > 0.1) {
        const actualMlPerSqm = actualConsumption / newArea;
        room.consumptionRates.push({
          rate: actualMlPerSqm,
          area: newArea,
          timestamp: Date.now(),
          confidence: consumptionAccuracy
        });

        if (room.consumptionRates.length > 10) {
          room.consumptionRates.shift();
        }
      }

      // Update learning model
      if (actualConsumption > 0) {
        const adjustedRate = mlPerSqm * (actualConsumption / estimatedConsumption);
        await this.updateConsumptionData(adjustedRate, {
          confidence: consumptionAccuracy,
          area: newArea,
          room: currentRoom,
          isPartial: actualConsumption < estimatedConsumption
        });
      }

      // Update states
      await this.updateWaterLevelState();

      // ===== Update mop states =====
      if (this.directMopTracker && this.directMopTracker.needsTracking) {
        await this.directMopTracker.updateMopStates();
      }

      // ===== Log all information =====
      const logParts = [
        `[WaterTracking] Room: ${currentRoom}`,
        `Area: +${newArea.toFixed(2)}m² (total ${currentAreaM2.toFixed(2)}m²)`,
        `Water: ${actualConsumption}ml (est ${estimatedConsumption.toFixed(1)}ml)`,
        `Rate: ${mlPerSqm.toFixed(1)}ml/m²`,
        `Accuracy: ${(consumptionAccuracy*100).toFixed(0)}%`,
        `Remaining Water: ${this.waterTracking.currentMl}ml/${WATER_TRACKING.MAX_ML}ml`,
        `AI-optimized: ${aiPrediction.isAIAdjusted ? 'Yes' : 'No'}`
      ];

      // Detergent info
      if (this.detergentModule && this.detergentModule.hasDetergentTank) {
        const detergentCurrent = this.detergentModule.detergentTracking?.currentMl || 0;
        const detergentCapacity = this.detergentModule.officialTankMl || 520;
        const detergentPercent = Math.round((detergentCurrent / detergentCapacity) * 100);
        logParts.push(`Detergent: ${detergentCurrent}ml (${detergentPercent}%)`);
      }

      // Mop info
      if (this.directMopTracker && this.directMopTracker.needsTracking) {
        const mopPercent = Math.round(100 - (this.directMopTracker.mopTracking.usedHours / 300 * 100));
        const activeType = this.directMopTracker.mopTracking.currentType || 'unknown';
        logParts.push(`Mop: ${mopPercent}% (${activeType})`);
      }

      this.adapter.log.info(logParts.join(' | '));

      // Auto-save when significant progress is made
      if (newArea > 1.0) {
        await this.saveWaterData();

        // ===== Save mop data as well =====
        if (this.directMopTracker && this.directMopTracker.needsTracking) {
          await this.directMopTracker.saveMopData();
        }

        // ===== Save detergent data as well =====
        if (this.detergentModule && this.detergentModule.hasDetergentTank) {
          await this.detergentModule.saveDetergentData();
        }
      }

    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Water calculation error: ${error.stack || error.message}`);
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.LastError`, {
        val: JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        }),
        ack: true
      });
    }
  }

  // Updates the internal cache and status of the water tracking module
  async updateWaterTrackingCache() {
    try {
    // 1. Read wash level from state
      const washLevelState = await this.adapter.getStateAsync(`${this.deviceId}.state.MopWashLevel`);
      if (washLevelState?.val !== undefined && washLevelState.val !== null) {
        const level = parseInt(washLevelState.val);
        if (!isNaN(level)) {
          this.waterTrackingCache.waterLevel = level;
        }
      }

      // 2. Read mode from state
      const modeState = await this.adapter.getStateAsync(`${this.deviceId}.state.CleaningMode`);
      if (modeState?.val !== undefined && modeState.val !== null) {
        const mode = parseInt(modeState.val);
        if (!isNaN(mode)) {
          this.waterTrackingCache.mode = mode;

          // 3. Set isMopping based on mode
          if (WATER_TRACKING.MOPPING_MODES.includes(mode)) {
            this.waterTracking.isMopping = true;
          } else {
            this.waterTracking.isMopping = false;
          }
        }
      }

      // 4. Update mop type for matrix models
      if (this.directMopTracker && this.directMopTracker.needsTracking) {
        await this.directMopTracker.updateCurrentMopType();
      }

    } catch (error) {
      this.adapter.log.warn(`[WaterTracking] Cache update error: ${error.message}`);
    }
  }

  // Retrieves the current wash level
  async getCurrentWashLevel() {
    try {
    // Try to read the wash level from state
      const washLevelState = await this.adapter.getStateAsync(`${this.deviceId}.state.MopWashLevel`);
      if (washLevelState?.val !== undefined && washLevelState.val !== null) {
        const level = parseInt(washLevelState.val);
        if (!isNaN(level)) {
          return level;
        }
      }

      // Fallback: use cache
      if (this.waterTrackingCache.waterLevel !== null) {
        return this.waterTrackingCache.waterLevel;
      }

      return 1; // Default: Standard (Level 1)

    } catch (error) {
      this.adapter.log.warn(`[WaterTracking] Failed to get wash level: ${error.message}`);
      return 1; // Default: Standard
    }
  }

  // Get AI-optimized water consumption rate
  async getAIWaterConsumption(area, room) {
    try {
      if (!this.washWaterAI) {
        await this.initAI();
      }

      const washLevel = this.waterTrackingCache.waterLevel || 0;
      const tankSize = WATER_TRACKING.MAX_ML;
      const availableWater = this.waterTracking.currentMl;

      const features = {
        hotWash: await this.hasFeature('HotWash'),
        superWash: await this.hasFeature('SuperWash'),
        autoWashLevel: await this.getAutoWashLevel()
      };

      const baseWater = area * WATER_TRACKING.DEFAULT_ML_PER_SQM;

      const prediction = await this.washWaterAI.predictOptimalWater({
        baseWater: baseWater,
        washLevel: washLevel,
        features: features,
        tankSize: tankSize,
        availableWater: availableWater,
        roomType: this.getRoomType(room)
      });

      return {
        rate: prediction.water / area,
        isAIAdjusted: prediction.isAIAdjusted,
        confidence: prediction.confidence,
        adjustment: prediction.adjustment
      };

    } catch (error) {
      this.adapter.log.warn(`[WaterTracking-AI] Prediction failed: ${error.message}`);
      return {
        rate: WATER_TRACKING.DEFAULT_ML_PER_SQM,
        isAIAdjusted: false,
        confidence: 0,
        adjustment: 1.0
      };
    }
  }

  // ============== LEARNING FUNCTIONS ==============

  // Update consumption data with new learning sample ( mlPerSqm - Milliliters per square meter, context - Learning context)
  async updateConsumptionData(mlPerSqm, context = {}) {
    try {
      const { confidence = 1.0, area = 0, room = 'unknown', isPartial = false } = context;

      // Validation
      if (typeof mlPerSqm !== 'number' || isNaN(mlPerSqm)) {
        this.adapter.log.warn(`[WaterTracking] Invalid consumption value: ${mlPerSqm}`);
        return;
      }

      // Limit value range
      const clampedMl = Math.max(5, Math.min(200, mlPerSqm));

      // Generate learning key
      const mode = this.waterTrackingCache.mode;
      const waterLevel = this.waterTrackingCache.waterLevel;

      const key = `${room}_${mode}_${waterLevel}`;
      const globalKey = `global_${mode}_${waterLevel}`;

      // Load data
      const data = await this.getConsumptionData();
      data[key] = data[key] || [];
      data[globalKey] = data[globalKey] || [];

      // Create new entry
      const newEntry = {
        value: clampedMl,
        weight: confidence * (isPartial ? 0.7 : 1.0),
        area: area,
        timestamp: Date.now(),
        remainingMl: this.waterTracking.currentMl,
        room: room
      };

      // Add entries
      data[key].push(newEntry);
      data[globalKey].push({ ...newEntry, weight: newEntry.weight * 0.6 });

      // Clean up data
      [key, globalKey].forEach(k => {
        if (data[k]) {
          data[k] = data[k]
            .sort((a, b) => b.weight - a.weight || b.timestamp - a.timestamp)
            .slice(0, WATER_TRACKING.LEARNING_SAMPLES);
        }
      });

      // Statistical analysis
      const stats = await this.calculateConsumptionStats(data[key]);
      if (stats && stats.stdDev > 30 && data[key].length > 5) {
        data[key] = data[key].filter(entry =>
          Math.abs(entry.value - stats.median) < 2 * stats.mad
        );
      }

      // Update LearningStats
      await this.updateLearningStats();

      // Save
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.ConsumptionData`, {
        val: JSON.stringify(data),
        ack: true
      });

      // Update average
      await this.updateWeightedAverage(data[key]);

      // Invalidate cache after successful update
      this.consumptionDataCache = {
        data: null,
        lastUpdate: 0
      };

    } catch (error) {
      this.adapter.log.error(`[WaterTracking] updateConsumptionData failed: ${error.stack}`);
    }
  }

  // Update learning statistics
  async updateLearningStats() {
    try {
      const data = await this.getConsumptionData();

      // Collect ALL consumption data
      const allSamples = [];
      Object.values(data).forEach(entries => {
        if (Array.isArray(entries)) {
          entries.forEach(entry => {
            if (entry && typeof entry.value === 'number') {
              allSamples.push(entry.value);
            }
          });
        }
      });

      // Calculate statistical key figures
      const stats = {
        lastUpdated: new Date().toISOString(),
        avgConsumption: allSamples.length > 0
          ? parseFloat((allSamples.reduce((a, b) => a + b, 0) / allSamples.length).toFixed(1))
          : null,
        minConsumption: allSamples.length > 0
          ? Math.min(...allSamples).toFixed(1)
          : null,
        maxConsumption: allSamples.length > 0
          ? Math.max(...allSamples).toFixed(1)
          : null,
        totalSamples: allSamples.length,
        roomsTracked: Object.keys(data).filter(k => k.includes('room_')).length
      };

      // Save the statistics
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.LearningStats`, {
        val: JSON.stringify(stats),
        ack: true
      });

    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Failed to update learning stats: ${error.message}`);
    }
  }

  // ============== TANK MANAGEMENT ==============

  // Handle water tank status changes status - Tank status (0=inserted, 1=removed, 2=processing, 3=water level too low)
  async handleTankStatusChange(status) {

	    if (this.firstStartWaterTrack) {
      this.adapter.log.info(`[WaterTracking] Initial tank status ignored (startup): ${status}`);
      return;
    }

    if (status == 1) {
      // Tank removed
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.BeforeRemoval`, {
        val: this.waterTracking.currentMl,
        ack: true
      });
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.LastRemovalTime`, {
        val: Date.now(),
        ack: true
      });
      this.adapter.log.info(`[WaterTracking] Water tank removed. Saved level: ${this.waterTracking.currentMl}ml`);
    }
    else if ((status == 0 || status == 2)){ // || status == 3)) { // 3=water level too low
      // Tank inserted
      const beforeRemoval = await this.getStateValue(`${this.deviceId}.state.water.BeforeRemoval`) || 0;
      const lastRemovalTime = await this.getStateValue(`${this.deviceId}.state.water.LastRemovalTime`) || 0;

      const removalDuration = Date.now() - lastRemovalTime;
      const MIN_REMOVAL_TIME = 5000;
      const MAX_REMOVAL_TIME = 3600000;

      if (removalDuration >= MIN_REMOVAL_TIME && removalDuration <= MAX_REMOVAL_TIME) {
        const refillRatio = await this.calculateSmartRefillRatio(beforeRemoval, lastRemovalTime);
        this.waterTracking.currentMl = Math.min(
          WATER_TRACKING.MAX_ML,
          beforeRemoval + (WATER_TRACKING.MAX_ML - beforeRemoval) * refillRatio
        );

        await this.updateWaterLevelState();
        this.adapter.log.info(`[WaterTracking] Tank refilled: ${this.waterTracking.currentMl}ml (${Math.round(refillRatio * 100)}%)`);
      }
    }
  }

  // ============== MANUAL RESET FOR WATER TANK ==============
  async handleManualWaterTankReset(newPercent) {
    this.adapter.log.info(`[WaterTracking] Manual reset to ${newPercent}%`);

    // Calculate new volume in ml
    const maxMl = WATER_TRACKING.MAX_ML;
    const newMl = Math.round((newPercent / 100) * maxMl);

    // Reset removal tracking (since the tank was manually refilled)
    await this.adapter.setStateAsync(`${this.deviceId}.state.water.BeforeRemoval`, {
      val: this.waterTracking.currentMl,
      ack: true
    });
    await this.adapter.setStateAsync(`${this.deviceId}.state.water.LastRemovalTime`, {
      val: Date.now(),
      ack: true
    });

    // Update current water level
    this.waterTracking.currentMl = newMl;
    await this.updateWaterLevelState();

    // Update cache values
    this.waterTrackingCache.currentMl = newMl;

    this.adapter.log.info(`[WaterTracking] Manual reset completed: ${newMl}ml (${newPercent}%)`);
  }

  // ============== CLEANING LIFECYCLE ==============

  // Handle cleaning start
  async handleCleaningStart() {
    this.waterTracking.initialMl = await this.getCurrentWater();
    this.waterTracking.roomData = {};
    this.isCleaningActive = true;
    this.waterTracking.lastRoom = null;

    // Start mop tracking if available
    if (this.directMopTracker && this.directMopTracker.needsTracking) {
      await this.directMopTracker.startMopTracking();
    }

    await this.startAutoSave();
    this.adapter.log.info('[WaterTracking] Water tracking initialized for new cleaning job');
  }

  // Handle cleaning completion
  async handleCleaningComplete() {
    this.isCleaningActive = false;
    this.stopAutoSave();

    // Stop mop tracking
    if (this.directMopTracker && this.directMopTracker.needsTracking) {
      await this.directMopTracker.stopMopTracking();
    }

    // Final detergent tracking for completed job
    if (this.detergentModule) {
      const washLevel = this.waterTrackingCache.waterLevel || 1;
      await this.detergentModule.doseDetergentForMopWash(washLevel);
    }


    try {
      if (!this.waterTracking?.isMopping || !this.waterTracking.roomData) return;

      // Calculate total consumption
      const totalConsumed = await this.calculateTotalConsumption();
      const totalArea = await this.getTotalCleanedArea();

      if (totalArea > 1 && totalConsumed > 1) {
        await this.updateWaterConsumptionStats(totalConsumed, totalArea);
      }

      await this.updateLearningStats();
      this.waterTracking.roomData = {};

    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Cleaning completion handler failed: ${error.message}`);
    }
  }

  // Handle mop wash completion with AI optimization
  async handleMopWashComplete() {
    try {
      // Ensure AI is initialized
      if (!this.washWaterAI) {
        await this.initAI();
      }

      // Collect context
      const washLevel = await this.getLegacyWashLevel();
      const tankSize = WATER_TRACKING.MAX_ML;
      const availableWater = this.waterTracking?.currentMl || 0;

      const features = {
        hotWash: await this.hasFeature('HotWash'),
        superWash: await this.hasFeature('SuperWash'),
        autoWashLevel: await this.getAutoWashLevel()
      };

      // Calculate base water (pre-AI)
      const baseWater = this.getBaseWashWaterByTank();
      const preAIWater = this.calculateWashWaterByLevel(baseWater, washLevel);

      // Get AI prediction
      const prediction = await this.washWaterAI.predictOptimalWater({
        baseWater: preAIWater,
        washLevel,
        features,
        tankSize,
        availableWater,
        roomType: this.getCurrentRoomType()
      });

      let washWater = prediction.water;
      const usedAI = prediction.isAIAdjusted;

      // Manual adjustment if AI doesn't have enough data
      if (!usedAI || prediction.confidence < 0.3) {
        washWater = this.adjustForAvailableWater(preAIWater, availableWater, washLevel);
      }

      // Check minimum water
      if (washWater < WATER_TRACKING.MOP_WASH.MIN_WATER) {
        this.adapter.log.warn(`[WaterTracking-AI] Not enough water for wash level ${washLevel}`);
        return;
      }

      // Process wash with AI
      const actualUsed = await this.processMopWashWithAI(washWater, washLevel, {
        predicted: prediction.water,
        confidence: prediction.confidence,
        usedAI,
        baseWater: preAIWater
      });

      const multipliers = { 0: 0.8, 1: 1.0, 2: 1.2, 3: 1.4 };
	  this.adapter.log.info(`[WaterTracking-MATH] Wash calculation:`);
      this.adapter.log.info(`  - Tank size: ${tankSize}ml`);
      this.adapter.log.info(`  - Base water (by tank): ${baseWater}ml`);
      this.adapter.log.info(`  - Wash level: ${washLevel} -> Multiplier: ${multipliers[washLevel] || 1.0}`);
      this.adapter.log.info(`  - Pre-AI water: ${preAIWater}ml`);
      this.adapter.log.info(`  - AI prediction: ${prediction.water}ml (Confidence: ${(prediction.confidence*100).toFixed(0)}%)`);
      this.adapter.log.info(`  - Final used: ${actualUsed}ml`);

      // Let AI learn from this wash cycle
      if (actualUsed > 0) {
        await this.washWaterAI.learnFromWashCycle({
          expectedWater: preAIWater,
          actualWater: actualUsed,
          washLevel,
          features,
          tankSize,
          confidence: 0.9,
          roomType: this.getCurrentRoomType()
        });

        this.adapter.log.info(`[WaterTracking-AI] Learning completed. Confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
      }

    } catch (error) {
      this.adapter.log.warn(`[WaterTracking-AI] Failed: ${error.message}`);
      // Fallback to non-AI version
    }
  }

  // ============== HELPER FUNCTIONS ==============

  // Calculate consumption accuracy (Estimated milliliters, Actual milliliters, Area in square meters)
  async calculateConsumptionAccuracy(estimatedMl, actualMl, areaM2) {
    if (actualMl <= 0 || areaM2 < 0.1 || estimatedMl <= 0) return 0.3;

    const actualRate = actualMl / areaM2;
    const expectedRate = estimatedMl / areaM2;
    const rateDeviation = Math.abs(actualRate - expectedRate) / expectedRate;
    const absErrorNorm = Math.abs(actualMl - estimatedMl) / WATER_TRACKING.MAX_ML;

    const accuracy = 1 - Math.min(0.7, (rateDeviation * 0.6 + absErrorNorm * 0.4));
    return Math.max(0.3, Math.min(1.0, accuracy));
  }

  // Update weighted average consumption
  async updateWeightedAverage(entries) {
    if (!entries || !entries.length) return;

    const now = Date.now();
    const weightedValues = entries.map(entry => {
      const ageHours = (now - entry.timestamp) / (1000 * 60 * 60);
      const timeWeight = Math.max(0.2, 1 - Math.pow(ageHours / 72, 2));
      return {
        value: entry.value,
        weight: entry.weight * timeWeight
      };
    });

    const totalWeight = weightedValues.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight === 0) return;

    const weightedAvg = weightedValues.reduce((sum, e) =>
      sum + (e.value * e.weight), 0) / totalWeight;

    if (entries.length >= 5) {
      const prevValue = await this.getStateValue(`${this.deviceId}.state.water.CurrentMlPerSqm`)
      || WATER_TRACKING.DEFAULT_ML_PER_SQM;
      const learningRate = Math.min(0.9, 0.3 + (0.6 * (entries.length / WATER_TRACKING.LEARNING_SAMPLES)));
      const smoothedValue = (weightedAvg * learningRate) + (prevValue * (1 - learningRate));

      await this.adapter.setStateAsync(`${this.deviceId}.state.water.CurrentMlPerSqm`, {
        val: Math.round(smoothedValue * 10) / 10,
        ack: true
      });
    }
  }

  // Calculate consumption statistics  {Array} entries - Consumption entries
  async calculateConsumptionStats(entries) {
    if (!entries || !entries.length) return null;

    const values = entries.map(e => e.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    const sorted = values.sort((a,b) => a-b);
    const median = sorted[Math.floor(sorted.length/2)];
    const mad = values.reduce((s, v) => s + Math.abs(v - median), 0) / values.length;

    return {
      mean, stdDev, median, mad,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  // Calculate smart refill ratio
  async calculateSmartRefillRatio(beforeRemoval, lastRemovalTime) {
    const removalDuration = (Date.now() - lastRemovalTime) / 1000;

    if (beforeRemoval < WATER_TRACKING.MAX_ML * 0.1) return 1.0;
    if (removalDuration < 30) return 0.0;
    if (removalDuration < 60) return 0.8;

    return 1.0;
  }

  // Update water level state
  async updateWaterLevelState() {

    if (this.firstStartWaterTrack) {
      this.adapter.log.info(`[WaterTracking] update Water Level State ignored (startup)`);
      return;
    }
    const percent = Math.round((this.waterTracking.currentMl / WATER_TRACKING.MAX_ML) * 100);
    await this.adapter.setStateAsync(`${this.deviceId}.state.water.PureWaterTank`, {
      val: percent,
      ack: true
    });

    await this.adapter.setStateAsync(`${this.deviceId}.state.water.Current`, {
      val: this.waterTracking.currentMl,
      ack: true
    });
  }

  // Get current water consumption rate
  async getWaterConsumptionRate() {
    const rate = await this.getStateValue(`${this.deviceId}.state.water.CurrentMlPerSqm`);
    return rate ?? WATER_TRACKING.DEFAULT_ML_PER_SQM;
  }

  // Get consumption data with caching
  async getConsumptionData() {
    const now = Date.now();

    // Use cache if available and valid
    if (this.consumptionDataCache.data &&
        now - this.consumptionDataCache.lastUpdate < this.consumptionDataCache.cacheTTL) {
      return this.consumptionDataCache.data;
    }

    try {
      // Query state if cache is invalid
      const state = await this.adapter.getStateAsync(`${this.deviceId}.state.water.ConsumptionData`);
      let data = {};

      if (state?.val) {
        try {
          data = JSON.parse(state.val);

          // Data cleaning
          data = Object.entries(data).reduce((acc, [key, entries]) => {
            if (Array.isArray(entries)) {
              const filtered = entries.filter(entry =>
                entry && typeof entry.value === 'number' && entry.value > 0 && entry.value < 200
              );
              if (filtered.length) acc[key] = filtered.slice(-WATER_TRACKING.LEARNING_SAMPLES);
            }
            return acc;
          }, {});

        } catch (e) {
          this.adapter.log.warn('[WaterTracking] Consumption data parse error - using empty set');
        }
      }

      // Refresh cache
      this.consumptionDataCache = {
        data: data,
        lastUpdate: now
      };

      return data;

    } catch (e) {
      this.adapter.log.error(`[WaterTracking] Failed to get consumption data: ${e.message}`);
      return this.consumptionDataCache.data || {};
    }
  }

  // Save all water tracking data
  async saveWaterData() {
    try {
      // Save roomData
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.RoomConsumption`, {
        val: JSON.stringify(this.waterTracking.roomData),
        ack: true
      });

      // Save consumptionData
      const consumptionData = await this.getConsumptionData();
      if (Object.keys(consumptionData).length > 0) {
        await this.adapter.setStateAsync(`${this.deviceId}.state.water.ConsumptionData`, {
          val: JSON.stringify(consumptionData),
          ack: true
        });
      }

      this.adapter.log.info('[WaterTracking] All water tracking data saved');
    } catch (e) {
      this.adapter.log.error('[WaterTracking] Error saving data: ' + e.message);
    }
  }

  // Calculate total consumption
  async calculateTotalConsumption() {
    if (!this.waterTracking.roomData) return 0;

    const total = Object.values(this.waterTracking.roomData)
      .reduce((sum, room) => sum + (room.consumedMl || 0), 0);
    return Math.round(total * 1000) / 1000;
  }

  // Get total cleaned area
  async getTotalCleanedArea() {
    if (!this.waterTracking.roomData) return 0;

    const totalArea = Object.values(this.waterTracking.roomData)
      .reduce((sum, room) => sum + (room.maxCleanedArea || 0), 0);

    return Math.round(totalArea * 100) / 100;
  }

  // Update water consumption statistics
  async updateWaterConsumptionStats(totalConsumed, totalArea) {
    if (totalArea <= 0 || totalConsumed <= 0) {
      this.adapter.log.warn(`[WaterTracking] Invalid consumption data: Area=${totalArea}m², Consumed=${totalConsumed}ml`);
      return;
    }

    const actualMlPerSqm = totalConsumed / totalArea;
    await this.updateConsumptionData(actualMlPerSqm);

    const litersConsumed = (totalConsumed / 1000).toFixed(2);
    this.adapter.log.info(`[WaterTracking] Cleaning completed: ${totalArea.toFixed(2)}m², ${litersConsumed}L, ${actualMlPerSqm.toFixed(2)}ml/m²`);
  }

  // ============== AUTO-SAVE MANAGEMENT ==============

  // Start auto-save interval
  async startAutoSave() {
    await this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      if (this.isCleaningActive) {
        this.saveWaterData().catch(e =>
          this.adapter.log.error('[WaterTracking] Autosave failed: ' + e.message)
        );
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  // Stop auto-save interval
  async stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // ============== DATA RESTORATION ==============

  // Restore persisted data
  async restorePersistedData() {
    //if (!this.isCleaningActive) return;

    try {
      // Restore water tank data first
      await this.restoreWaterTankData();

      // Restore room consumption data
      const roomData = await this.getStateValue(`${this.deviceId}.state.water.RoomConsumption`);
      if (roomData) {
        try {
          this.waterTracking.roomData = JSON.parse(roomData);

          // Validate room data structure
          Object.keys(this.waterTracking.roomData).forEach(room => {
            if (!this.waterTracking.roomData[room].consumedMl) {
              this.waterTracking.roomData[room].consumedMl = 0;
            }
            if (!this.waterTracking.roomData[room].maxCleanedArea) {
              this.waterTracking.roomData[room].maxCleanedArea =
              this.waterTracking.roomData[room].lastRecordedArea || 0;
            }
          });

          this.adapter.log.info(`[WaterTracking] Restored room data for ${Object.keys(this.waterTracking.roomData).length} rooms`);

          // Set the last active room
          if (this.waterTracking.roomData) {
            const rooms = Object.keys(this.waterTracking.roomData);
            this.waterTracking.lastRoom = rooms[rooms.length - 1];
          }
        } catch (e) {
          this.adapter.log.warn('[WaterTracking] Failed to parse room data: ' + e.message);
          this.waterTracking.roomData = {};
        }
      }

    } catch (e) {
      this.adapter.log.warn('[WaterTracking] Persisted data restoration failed - starting fresh: ' + e.message);
      this.waterTracking.roomData = {};
      this.waterTracking.currentMl = WATER_TRACKING.MAX_ML;
      await this.updateWaterLevelState();
    }
  }

  // Restore water tank data from persisted states
  async restoreWaterTankData() {
    try {
      const beforeRemoval = await this.getStateValue(`${this.deviceId}.state.water.BeforeRemoval`) || 0;
      const tankPercent = await this.getStateValue(`${this.deviceId}.state.water.PureWaterTank`);
      const currentMl = await this.getStateValue(`${this.deviceId}.state.water.Current`);

      // Priority order for restoration
      this.waterTracking.currentMl = currentMl !== null ? currentMl :
        beforeRemoval > 0 ? beforeRemoval :
          tankPercent !== null ? (tankPercent / 100) * WATER_TRACKING.MAX_ML :
            WATER_TRACKING.MAX_ML;

      // Restore learning data
      const consumptionData = await this.getStateValue(`${this.deviceId}.state.water.ConsumptionData`);
      if (consumptionData) {
        try {
          const parsedData = JSON.parse(consumptionData);
          Object.keys(parsedData).forEach(key => {
            if (!Array.isArray(parsedData[key])) {
              delete parsedData[key];
            } else {
              parsedData[key] = parsedData[key].filter(entry =>
                entry && typeof entry.value === 'number' && entry.value > 0 && entry.value < 200
              );
            }
          });
          await this.adapter.setStateAsync(`${this.deviceId}.state.water.ConsumptionData`, {
            val: JSON.stringify(parsedData),
            ack: true
          });
        } catch (e) {
          this.adapter.log.warn('[WaterTracking] Failed to parse persisted consumption data: ' + e.message);
        }
      }

      // Update the water level display
      await this.updateWaterLevelState();

      this.adapter.log.info(`[WaterTracking] Restored water level: ${this.waterTracking.currentMl}ml`);

    } catch (e) {
      this.adapter.log.error('[WaterTracking] Water tank data restoration failed - resetting to default: ' + e.message);
      this.waterTracking.currentMl = WATER_TRACKING.MAX_ML;
      await this.updateWaterLevelState();
    }
  }

  // ============== UTILITY FUNCTIONS ==============

  // Get current water level
  async getCurrentWater() {
    const current = await this.getStateValue(`${this.deviceId}.state.water.Current`);
    return current ?? WATER_TRACKING.MAX_ML;
  }

  // Get state value {string} stateId - State identifier
  async getStateValue(stateId) {
    try {
      const state = await this.adapter.getStateAsync(stateId);
      return state?.val;
    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Failed to get state ${stateId}: ${error.message}`);
      return null;
    }
  }

  // Get room type {string} room - Room identifier
  getRoomType(room) {
    if (!room) return 'unknown';

    const roomLower = room.toLowerCase();
    if (roomLower.includes('kitchen') || roomLower.includes('k�che')) return 'kitchen';
    if (roomLower.includes('bath') || roomLower.includes('bad')) return 'bathroom';
    if (roomLower.includes('living') || roomLower.includes('wohnen')) return 'living_room';
    if (roomLower.includes('bedroom') || roomLower.includes('schlafen')) return 'bedroom';
    return 'other';
  }

  // Legacy support for models without MopWashLevel
  async getLegacyWashLevel() {
    try {
    // 1. FIRST: Read directly from AutoSwitchSettings (most reliable)
      const settingsState = await this.adapter.getStateAsync(`${this.deviceId}.state.AutoSwitchSettings`);

      if (settingsState?.val) {
        try {
          const settings = JSON.parse(settingsState.val);

          // Extract relevant values
          const smartAutoWash = this.getSettingValue(settings, 'SmartAutoWash');
          const hotWash = this.getSettingValue(settings, 'HotWash');
          const superWash = this.getSettingValue(settings, 'SuperWash');
          const cleanRoute = this.getSettingValue(settings, 'CleanRoute');

          this.adapter.log.info(`[WaterTracking] AutoSwitchSettings analysis:`);
          this.adapter.log.info(`  - SmartAutoWash: ${smartAutoWash} (0=off, 1=deep only, 2=routine+deep)`);
          this.adapter.log.info(`  - HotWash: ${hotWash} (0=off, 1=on)`);
          this.adapter.log.info(`  - SuperWash: ${superWash} (0=off, 1=on)`);
          this.adapter.log.info(`  - CleanRoute: ${cleanRoute} (1=standard, 2=intensive, 3=deep, 4=quick)`);

          // WASH LEVEL DETERMINATION (matching Dreame app logic):

          // Level 3 (Ultra): SuperWash active
          if (superWash === 1) {
            this.adapter.log.info(`[WaterTracking] Wash level 3 (Ultra) - SuperWash active`);
            return 3;
          }

          // Level 2 (Deep): HotWash active OR CleanRoute = 3 (Deep)
          if (hotWash === 1 || cleanRoute === 3) {
            this.adapter.log.info(`[WaterTracking] Wash level 2 (Deep) - HotWash: ${hotWash}, CleanRoute: ${cleanRoute}`);
            return 2;
          }

          // Level 1 (Standard): SmartAutoWash active OR standard CleanRoute
          if (smartAutoWash > 0 || [1, 2, 4].includes(cleanRoute)) {
            this.adapter.log.info(`[WaterTracking] Wash level 1 (Standard) - SmartAutoWash: ${smartAutoWash}`);
            return 1;
          }

          // Level 0 (Light): All features off
          this.adapter.log.info(`[WaterTracking] Wash level 0 (Light) - all features off`);
          return 0;

        } catch (parseError) {
          this.adapter.log.warn(`[WaterTracking] Failed to parse AutoSwitchSettings: ${parseError.message}`);
        }
      }

      // 2. FALLBACK: Use cache (set in main.js when MopWashLevel updates)
      if (this.waterTrackingCache.waterLevel !== null) {
        const cachedLevel = this.waterTrackingCache.waterLevel;
        this.adapter.log.info(`[WaterTracking] Using cached wash level: ${cachedLevel}`);
        return cachedLevel;
      }

      // 3. FALLBACK: Read from MopWashLevel state (might be a STRING!)
      const washLevelState = await this.adapter.getStateAsync(`${this.deviceId}.state.MopWashLevel`);

      if (washLevelState?.val !== undefined && washLevelState.val !== null) {
        const val = washLevelState.val;

        // Check if it's already a number
        if (!isNaN(val) && val !== '' && !isNaN(parseFloat(val))) {
          const level = parseInt(val);
          if (!isNaN(level) && level >= 0 && level <= 3) {
            this.adapter.log.info(`[WaterTracking] Parsed numeric wash level: ${level}`);
            return level;
          }
        }

        // It's a string like "Deep" or "Tief" - convert using DreameMopWashLevel
        if (this.DreameMopWashLevel && this.UserLang) {
          const level = this.convertWashLevelStringToNumber(val);
          if (level !== null) {
            this.adapter.log.info(`[WaterTracking] Converted "${val}" to level ${level}`);
            return level;
          }
        }
      }

      // 4. FINAL FALLBACK: Default to Standard (1)
      this.adapter.log.warn(`[WaterTracking] Could not determine wash level, using default: 1 (Standard)`);
      return 1;

    } catch (error) {
      this.adapter.log.error(`[WaterTracking] getLegacyWashLevel error: ${error.message}`);
      return 1; // Default: Standard
    }
  }

  // Helper to get integer value from settings array
  getSettingValue(settings, key) {
    try {
      const setting = settings.find(s => s && s.k === key);
      return setting ? parseInt(setting.v) : 0;
    } catch {
      return 0;
    }
  }

  // Convert wash level string to number using DreameMopWashLevel mapping
  convertWashLevelStringToNumber(str) {
    try {
      if (!this.DreameMopWashLevel || !this.UserLang) {
        return null;
      }

      const mapping = this.DreameMopWashLevel[this.UserLang];
      if (!mapping) {
        return null;
      }

      const searchStr = String(str).trim().toLowerCase();

      // Search through the mapping object
      for (const [key, value] of Object.entries(mapping)) {
        const compareStr = String(value).toLowerCase();

        // Exact match
        if (compareStr === searchStr) {
          return parseInt(key);
        }

        // Partial match (e.g., "Ultra" vs "Ultra washing")
        if (searchStr.includes(compareStr) || compareStr.includes(searchStr)) {
          return parseInt(key);
        }
      }

      return null;

    } catch (error) {
      this.adapter.log.warn(`[WaterTracking] String conversion failed: ${error.message}`);
      return null;
    }
  }


  // Check if device has a specific feature
  async hasFeature(featureName) {
    try {
      const settingsState = await this.adapter.getStateAsync(`${this.deviceId}.state.AutoSwitchSettings`);

      if (settingsState?.val) {
        try {
          const settings = JSON.parse(settingsState.val);
          const feature = settings.find(s => s.k === featureName);
          return feature && feature.v > 0;
        } catch {
          return false;
        }
      }
    } catch {
      // Ignore errors
    }

    return false;
  }

  // Get auto wash level
  async getAutoWashLevel() {
    try {
      const settingsState = await this.adapter.getStateAsync(`${this.deviceId}.state.AutoSwitchSettings`);

      if (settingsState?.val) {
        try {
          const settings = JSON.parse(settingsState.val);
          const autoWash = settings.find(s => s.k === 'SmartAutoWash');
          return autoWash ? parseInt(autoWash.v) : 0;
        } catch {
          return 0;
        }
      }
    } catch {
      // Ignore errors
    }

    return 0;
  }

  // Get current room type
  getCurrentRoomType() {
    if (this.waterTracking.lastRoom) {
      return this.getRoomType(this.waterTracking.lastRoom);
    }
    return 'unknown';
  }

  // Get base wash water by tank size
  getBaseWashWaterByTank() {
    const tankSize = WATER_TRACKING.MAX_ML;
    const baseConfig = WATER_TRACKING.MOP_WASH.BASE_BY_TANK;

    // Find largest matching tank size
    const tankSizes = Object.keys(baseConfig).map(Number).sort((a, b) => b - a);

    for (const size of tankSizes) {
      if (tankSize >= size) {
        return baseConfig[size];
      }
    }

    return 100; // Default fallback
  }

  // Calculate wash water by level
  calculateWashWaterByLevel(baseWater, level) {
    const multipliers = {
      0: 0.8,  // Light
      1: 1.0,  // Standard
      2: 1.2,  // Deep
      3: 1.4   // Ultra
    };

    const multiplier = multipliers[level] || multipliers[1];
    return Math.round(baseWater * multiplier);
  }

  // Adjust water for availability
  adjustForAvailableWater(water, availableWater, washLevel) {
    if (availableWater >= water) return water;

    const MIN_WATER = WATER_TRACKING.MOP_WASH.MIN_WATER;

    if (availableWater < MIN_WATER) {
      return 0;
    }

    const reductionRatio = availableWater / water;

    // Always reduce, never completely stop
    if (reductionRatio < 0.7) {
      // Reduce appropriately
      const reducedWater = Math.max(
        MIN_WATER,
        Math.round(water * reductionRatio * 0.8)
      );
      return Math.min(reducedWater, availableWater);
    }


    // Normal reduction
    const reducedWater = Math.max(
      MIN_WATER,
      Math.round(water * reductionRatio)
    );
    return Math.min(reducedWater, availableWater);
  }


  // Process mop wash with AI
  async processMopWashWithAI(washWater, washLevel, aiContext) {
    if (!this.waterTracking) {
      await this.initWaterTracking();
    }

    const availableWater = this.waterTracking.currentMl;
    const actualUsed = Math.min(washWater, availableWater);

    if (actualUsed <= 0) return 0;

    // Deduct water
    this.waterTracking.currentMl -= actualUsed;

    // Update water level
    await this.updateWaterLevelState();

    // Persist
    await this.saveWaterData();

    // AI-specific logging
    if (aiContext.usedAI) {
      const improvement = aiContext.baseWater > 0 ?
        ((aiContext.baseWater - actualUsed) / aiContext.baseWater * 100).toFixed(1) : 0;

      this.adapter.log.info(`[WaterTracking-AI] AI-optimized wash (Level ${washLevel}):`);
      this.adapter.log.info(`  AI prediction: ${aiContext.predicted}ml (Confidence: ${(aiContext.confidence * 100).toFixed(0)}%)`);
      this.adapter.log.info(`  Actual used: ${actualUsed}ml (${improvement}% ${actualUsed < aiContext.baseWater ? 'saved' : 'more'})`);
      this.adapter.log.info(`  Base (without AI): ${aiContext.baseWater}ml`);

      // Save AI performance
      await this.saveAIPerformance({
        predicted: aiContext.predicted,
        actual: actualUsed,
        base: aiContext.baseWater,
        confidence: aiContext.confidence,
        level: washLevel,
        timestamp: Date.now()
      });

    } else {
      this.adapter.log.info(`[WaterTracking] Wash (without AI): ${actualUsed}ml`);
    }

    return actualUsed;
  }

  // Save AI performance metrics
  async saveAIPerformance(performance) {
    try {
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.water.AIPerformance`, {
        type: 'state',
        common: {
          name: 'AI Performance Tracking',
          type: 'string',
          role: 'json',
          read: true,
          write: false
        },
        native: {}
      });

      const currentState = await this.adapter.getStateAsync(`${this.deviceId}.state.water.AIPerformance`);
      let performances = [];

      if (currentState?.val) {
        try {
          performances = JSON.parse(currentState.val);
        } catch {
          performances = [];
        }
      }

      // Calculate metrics
      const error = Math.abs(performance.predicted - performance.actual);
      const errorPercent = performance.predicted > 0 ? (error / performance.predicted * 100) : 0;
      const improvement = performance.base > 0 ?
        ((performance.base - performance.actual) / performance.base * 100) : 0;

      performances.push({
        ...performance,
        metrics: {
          absoluteError: error,
          relativeError: errorPercent,
          improvement: improvement,
          accuracy: Math.max(0, 100 - errorPercent)
        }
      });

      // Keep only the last 50 entries
      if (performances.length > 50) {
        performances = performances.slice(-50);
      }

      // Calculate overall statistics
      const stats = this.calculateAIStats(performances);

      await this.adapter.setStateAsync(`${this.deviceId}.state.water.AIPerformance`, {
        val: JSON.stringify({
          performances,
          statistics: stats,
          lastUpdate: Date.now()
        }),
        ack: true
      });

    } catch (error) {
      this.adapter.log.warn(`[WaterTracking-AI] Failed to save performance: ${error.message}`);
    }
  }

  // Calculate AI statistics
  calculateAIStats(performances) {
    if (!performances || performances.length === 0) return null;

    const errors = performances.map(p => p.metrics.relativeError);
    const improvements = performances.filter(p => p.metrics.improvement > 0).map(p => p.metrics.improvement);

    return {
      totalRuns: performances.length,
      avgError: errors.reduce((a, b) => a + b, 0) / errors.length,
      avgImprovement: improvements.length > 0 ? improvements.reduce((a, b) => a + b, 0) / improvements.length : 0,
      successRate: (performances.filter(p => p.metrics.accuracy >= 80).length / performances.length * 100),
      avgConfidence: performances.reduce((a, b) => a + b.confidence, 0) / performances.length,
      lastCalculated: Date.now()
    };
  }

  // Clean up resources
  async destroy() {
    await this.stopAutoSave();
    await this.saveWaterData();
	  	  if (this.directMopTracker && this.directMopTracker.needsTracking) {
      await this.directMopTracker.cleanup();
    }

    // Clean up detergent module
    if (this.detergentModule) {
      await this.detergentModule.destroy();
    }
    this.adapter.log.info('[WaterTracking] Module destroyed');
  }
}

// ============== WASH WATER AI CLASS ==============
class WashWaterAI {
  constructor(adapter, deviceId) {
    this.adapter = adapter;
    this.deviceId = deviceId;
    this.learningData = null;
    this.predictionModel = null;
  }

  // Initialize or load learning data
  async initialize() {
    try {
      const dataState = await this.adapter.getStateAsync(`${this.deviceId}.state.water.WashLearningAI`);

      if (dataState?.val) {
        try {
          this.learningData = JSON.parse(dataState.val);
          this.adapter.log.info('[WashAI] AI learning data loaded');
        } catch (error) {
          this.adapter.log.warn('[WashAI] Failed to parse learning data, creating new');
          this.learningData = this.createDefaultLearningData();
        }
      } else {
        this.learningData = this.createDefaultLearningData();
        this.adapter.log.info('[WashAI] New AI learning data created');
      }

      // Initialize prediction model
      this.initPredictionModel();

    } catch (error) {
      this.adapter.log.error(`[WashAI] AI initialization failed: ${error.message}`);
      this.learningData = this.createDefaultLearningData();
    }
  }

  // Learn from a wash cycle
  async learnFromWashCycle(context) {
    try {
      const {
        expectedWater,      // Expected consumption
        actualWater,        // Actual consumption
        washLevel,          // Wash level (0-3)
        features,           // { hotWash: bool, superWash: bool, autoWashLevel: int }
        tankSize,           // Tank size in ml
        roomType,           // Room type (optional)
        confidence          // Measurement confidence (0-1)
      } = context;

      // Create unique learning key
      const modelKey = this.createModelKey(tankSize, washLevel, features);

      // Initialize model data if needed
      if (!this.learningData.models[modelKey]) {
        this.learningData.models[modelKey] = {
          samples: [],
          statistics: null,
          lastUpdated: Date.now(),
          adjustmentFactor: 1.0
        };
      }

      const model = this.learningData.models[modelKey];

      // Calculate deviation
      const deviation = expectedWater > 0 ? actualWater / expectedWater : 1.0;

      // Add sample (weighted based on confidence)
      model.samples.push({
        timestamp: Date.now(),
        expected: expectedWater,
        actual: actualWater,
        deviation: deviation,
        confidence: confidence || 0.8,
        features: { ...features, tankSize, washLevel }
      });

      // Keep only the newest samples
      if (model.samples.length > WATER_TRACKING.LEARNING.MAX_SAMPLES_PER_LEVEL) {
        model.samples = model.samples.slice(-WATER_TRACKING.LEARNING.MAX_SAMPLES_PER_LEVEL);
      }

      // Update statistics
      this.updateModelStatistics(model);

      // Update feature correlations
      this.updateFeatureCorrelations(context);

      // Update prediction model
      this.updatePredictionModel();

      // Save learning data
      await this.saveLearningData();

      // Check if adjustment is needed
      const shouldAdjust = this.shouldAdjustModel(model);

      if (shouldAdjust) {
        const newFactor = this.calculateAdjustmentFactor(model);
        model.adjustmentFactor = newFactor;

        this.adapter.log.info(`[WashAI] AI adjustment for ${modelKey}: Factor ${model.adjustmentFactor.toFixed(3)}`);

        // Log the adjustment
        await this.logAdjustment({
          modelKey,
          oldFactor: model.adjustmentFactor,
          newFactor,
          samples: model.samples.length,
          confidence: model.statistics?.confidence || 0
        });
      }

      this.learningData.totalSamples++;
      this.learningData.lastTraining = Date.now();

      return model.adjustmentFactor;

    } catch (error) {
      this.adapter.log.error(`[WashAI] AI learning failed: ${error.message}`);
      return 1.0; // No adjustment
    }
  }

  // Predict optimal water consumption
  async predictOptimalWater(context) {
    try {
      const {
        baseWater,          // Base water amount
        washLevel,          // Wash level (0-3)
        features,           // Feature flags
        tankSize,           // Tank size
        availableWater      // Available water
      } = context;

      // 1. Model-based prediction
      const modelKey = this.createModelKey(tankSize, washLevel, features);

      // Initialize model if it doesn't exist
      if (!this.learningData.models[modelKey]) {
        this.learningData.models[modelKey] = {
          samples: [],
          statistics: null,
          adjustmentFactor: 1.0
        };
      }

      const model = this.learningData.models[modelKey];

      let predictedWater = baseWater;

      if (model.adjustmentFactor && model.samples.length >= WATER_TRACKING.LEARNING.MIN_SAMPLES_PER_LEVEL) {
        // Use learned adjustment factor
        predictedWater = Math.round(baseWater * model.adjustmentFactor);

        // Consider confidence
        const confidence = model.statistics?.confidence || 0;
        if (confidence < WATER_TRACKING.LEARNING.CONFIDENCE_THRESHOLD) {
          // Mixed prediction at low confidence
          const blendFactor = confidence / WATER_TRACKING.LEARNING.CONFIDENCE_THRESHOLD;
          predictedWater = Math.round(
            (baseWater * (1 - blendFactor)) + (predictedWater * blendFactor)
          );
        }
      }

      // 2. Feature-based corrections
      predictedWater = this.applyFeatureCorrections(predictedWater, features);

      // 3. Availability adjustment
      predictedWater = this.adjustForAvailability(predictedWater, availableWater, washLevel);

      // 4. Save prediction for later learning
      this.learningData.predictions.push({
        timestamp: Date.now(),
        predicted: predictedWater,
        base: baseWater,
        context: context,
        modelKey: modelKey
      });

      // Keep only recent predictions
      if (this.learningData.predictions.length > 50) {
        this.learningData.predictions = this.learningData.predictions.slice(-50);
      }

      return {
        water: predictedWater,
        confidence: model.statistics?.confidence || 0,
        adjustment: model.adjustmentFactor || 1.0,
        samples: model.samples?.length || 0,
        isAIAdjusted: model.adjustmentFactor !== 1.0
      };

    } catch (error) {
      this.adapter.log.error(`[WashAI] AI prediction failed: ${error.message}`);
      return {
        water: context.baseWater,
        confidence: 0,
        adjustment: 1.0,
        samples: 0,
        isAIAdjusted: false
      };
    }
  }

  // Initialize prediction model
  initPredictionModel() {
    // Simple linear regression model
    this.predictionModel = {
      weights: { ...WATER_TRACKING.LEARNING.FEATURE_WEIGHTS },
      bias: 0,
      trained: false
    };
  }

  // Update prediction model with new data
  updatePredictionModel() {
    try {
      // Collect all training data
      const trainingData = [];

      Object.values(this.learningData.models).forEach(model => {
        if (model.samples && model.samples.length > 0) {
          model.samples.forEach(sample => {
            trainingData.push({
              features: this.extractFeatures(sample.features),
              target: sample.deviation
            });
          });
        }
      });

      if (trainingData.length < 10) return; // Not enough data

      // Simple Gradient Descent (simplified)
      const learningRate = 0.01;

      trainingData.forEach(data => {
        // Prediction
        const prediction = this.predictWithModel(data.features);

        // Error
        const error = data.target - prediction;

        // Adjust weights
        Object.keys(this.predictionModel.weights).forEach(feature => {
          if (data.features[feature] !== undefined) {
            this.predictionModel.weights[feature] += learningRate * error * data.features[feature];
          }
        });

        // Adjust bias
        this.predictionModel.bias += learningRate * error;
      });

      this.predictionModel.trained = true;

    } catch (error) {
      this.adapter.log.error(`[WashAI] Model training failed: ${error.message}`);
    }
  }

  // Make prediction with current model
  predictWithModel(features) {
    let prediction = this.predictionModel.bias;

    Object.keys(this.predictionModel.weights).forEach(feature => {
      if (features[feature] !== undefined) {
        prediction += this.predictionModel.weights[feature] * features[feature];
      }
    });

    return prediction;
  }

  // Extract features for ML model
  extractFeatures(rawFeatures) {
    return {
      tank_size: (rawFeatures.tankSize || 4500) / 5000, // Normalized
      wash_level: (rawFeatures.washLevel || 1) / 3,     // Normalized
      hot_wash: rawFeatures.hotWash ? 1 : 0,
      super_wash: rawFeatures.superWash ? 1 : 0,
      auto_wash: (rawFeatures.autoWashLevel || 0) / 2,  // Normalized
      room_type: rawFeatures.roomType === 'kitchen' ? 1 :
        rawFeatures.roomType === 'bathroom' ? 0.5 : 0
    };
  }

  // ===== HELPER FUNCTIONS =====

  createModelKey(tankSize, washLevel, features) {
    const featureHash = [
      features.hotWash ? 'H' : 'h',
      features.superWash ? 'S' : 's',
      features.autoWashLevel || 0
    ].join('');

    return `${tankSize}_L${washLevel}_${featureHash}`;
  }

  updateModelStatistics(model) {
    if (!model.samples || model.samples.length === 0) return;

    const samples = model.samples;
    const weightedDeviations = samples.map(s => s.deviation * (s.confidence || 0.8));
    const totalWeight = samples.reduce((sum, s) => sum + (s.confidence || 0.8), 0);

    if (totalWeight === 0) return;

    // Weighted average
    const meanDeviation = weightedDeviations.reduce((sum, d) => sum + d, 0) / totalWeight;

    // Weighted standard deviation
    const variance = samples.reduce((sum, s) => {
      const diff = s.deviation - meanDeviation;
      return sum + (diff * diff * (s.confidence || 0.8));
    }, 0) / totalWeight;

    const stdDev = Math.sqrt(variance);

    // Confidence based on sample size and variance
    const sampleConfidence = Math.min(1, model.samples.length / 20);
    const varianceConfidence = Math.max(0, 1 - (stdDev / 0.5));
    const confidence = (sampleConfidence * 0.6) + (varianceConfidence * 0.4);

    model.statistics = {
      meanDeviation,
      stdDev,
      confidence,
      lastCalculated: Date.now(),
      sampleCount: samples.length
    };
  }

  updateFeatureCorrelations(context) {
    // Analyze feature correlations
    const { features, deviation } = context;

    Object.keys(features).forEach(feature => {
      if (!this.learningData.features[feature]) {
        this.learningData.features[feature] = {
          samples: [],
          meanImpact: 1.0
        };
      }

      const featureData = this.learningData.features[feature];
      featureData.samples.push({
        value: features[feature],
        deviation: deviation,
        timestamp: Date.now()
      });

      // Keep only the newest samples
      if (featureData.samples.length > 50) {
        featureData.samples = featureData.samples.slice(-50);
      }

      // Calculate average impact
      if (featureData.samples.length >= 5) {
        const avgDeviation = featureData.samples.reduce((sum, s) => sum + s.deviation, 0) / featureData.samples.length;
        featureData.meanImpact = avgDeviation;
      }
    });
  }

  shouldAdjustModel(model) {
    if (!model.statistics || !model.samples || model.samples.length < WATER_TRACKING.LEARNING.MIN_SAMPLES_PER_LEVEL) {
      return false;
    }

    const { confidence, meanDeviation } = model.statistics;

    // Adjustment only with sufficient confidence and significant deviation
    return confidence >= WATER_TRACKING.LEARNING.CONFIDENCE_THRESHOLD &&
           Math.abs(meanDeviation - 1.0) > 0.1; // >10% deviation
  }

  calculateAdjustmentFactor(model) {
    const { meanDeviation } = model.statistics;
    const currentFactor = model.adjustmentFactor || 1.0;

    // Exponential moving average
    const targetFactor = meanDeviation > 0 ? 1.0 / meanDeviation : 1.0;
    const learningRate = WATER_TRACKING.LEARNING.ADJUSTMENT_RATE;

    // Smooth adjustment
    const newFactor = currentFactor * (1 - learningRate) + targetFactor * learningRate;

    // Limit to reasonable range (0.5 - 2.0)
    return Math.max(0.5, Math.min(2.0, newFactor));
  }

  applyFeatureCorrections(water, features) {
    let correctedWater = water;

    // Apply learned feature corrections
    Object.keys(features).forEach(feature => {
      const featureData = this.learningData?.features?.[feature];
      if (featureData?.meanImpact && featureData.samples.length >= 3) {
        correctedWater = Math.round(correctedWater * featureData.meanImpact);
      }
    });

    return correctedWater;
  }

  adjustForAvailability(water, availableWater, washLevel) {
    if (availableWater >= water) return water;

    const MIN_WATER = WATER_TRACKING.MOP_WASH.MIN_WATER;

    if (availableWater < MIN_WATER) {
      return 0; // No sensible cleaning possible
    }

    // AI decision: Reduce or cancel?
    const reductionRatio = availableWater / water;

    if (reductionRatio < 0.5 && washLevel >= 2) {
      // For Deep/Ultra with less than 50% water: better cancel
      return 0;
    }

    // Reduced amount
    const reducedWater = Math.max(MIN_WATER, Math.round(water * reductionRatio * 0.8));

    return Math.min(reducedWater, availableWater);
  }

  async saveLearningData() {
    try {
      await this.adapter.setStateAsync(`${this.deviceId}.state.water.WashLearningAI`, {
        val: JSON.stringify(this.learningData),
        ack: true
      });
    } catch (error) {
      this.adapter.log.error(`[WashAI] Saving AI data failed: ${error.message}`);
    }
  }

  async logAdjustment(adjustment) {
    try {
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.water.AIAdjustments`, {
        type: 'state',
        common: {
          name: 'AI Adjustments',
          type: 'string',
          role: 'json',
          read: true,
          write: false
        },
        native: {}
      });

      const currentState = await this.adapter.getStateAsync(`${this.deviceId}.state.water.AIAdjustments`);
      let adjustments = [];

      if (currentState?.val) {
        try {
          adjustments = JSON.parse(currentState.val);
        } catch {
          adjustments = [];
        }
      }

      adjustments.push({
        ...adjustment,
        timestamp: Date.now()
      });

      // Keep only the last 20 adjustments
      if (adjustments.length > 20) {
        adjustments = adjustments.slice(-20);
      }

      await this.adapter.setStateAsync(`${this.deviceId}.state.water.AIAdjustments`, {
        val: JSON.stringify(adjustments),
        ack: true
      });

    } catch (error) {
      this.adapter.log.warn(`[WashAI] Failed to log adjustment: ${error.message}`);
    }
  }

  createDefaultLearningData() {
    return {
      version: 1,
      models: {},
      features: {},
      predictions: [],
      lastTraining: 0,
      totalSamples: 0
    };
  }
}

// ============== DIRECT MOP TRACKER ==============
// For models that do NOT provide mop data via API (Matrix, X50, etc.)

class DirectMopTracker {
  constructor(adapter, deviceId, deviceModel, DreameMopWashLevel = null, UserLang = 'EN') {
    this.adapter = adapter;
    this.deviceId = deviceId;
    this.deviceModel = deviceModel;
    this.DreameMopWashLevel = DreameMopWashLevel;
    this.UserLang = UserLang;

    // Models that do NOT provide mop data via API
    this.NO_API_SUPPORT_MODELS = [
      // Matrix series
      'dreame.vacuum.r25135',   // Matrix 10 Ultra
      'dreame.vacuum.r2415',    // Matrix 10
      'dreame.vacuum.r2416',    // Matrix 10 Pro
      'dreame.vacuum.r2417',    // Matrix 10 Ultra (old)
      'dreame.vacuum.r2410',    // Matrix
      'dreame.vacuum.r2411',    // Matrix Pro
      'dreame.vacuum.r2412',    // Matrix Ultra

      // X series
      'dreame.vacuum.r2310',    // X30 Ultra
      'dreame.vacuum.r2311',    // X30
      'dreame.vacuum.r2312',    // X30 Global
      'dreame.vacuum.r2315',    // X40 Ultra
      'dreame.vacuum.r2320',    // X30 Pro
      'dreame.vacuum.r2322',    // X40
      'dreame.vacuum.r2350',    // X30 Ultra (new HW)
      'dreame.vacuum.r2356',    // X40 Ultra (new HW)

      /*// Z series
            'dreame.vacuum.r2285',
            'dreame.vacuum.r2288',
            'dreame.vacuum.r2290',
            'dreame.vacuum.r2291',
            'dreame.vacuum.r2295',
            'dreame.vacuum.r2296',
            'dreame.vacuum.r2297',

            // W series
            'dreame.vacuum.r2266',
            'dreame.vacuum.r2267',
            'dreame.vacuum.r2269',
            'dreame.vacuum.r2270',
            'dreame.vacuum.r2271',
            'dreame.vacuum.r2272',
            'dreame.vacuum.r2275',
            'dreame.vacuum.r2276',
            'dreame.vacuum.r2277',

            // F series
            'dreame.vacuum.r2301',
            'dreame.vacuum.r2302',
            'dreame.vacuum.r2303',
            'dreame.vacuum.r2305',
            'dreame.vacuum.r2306',
            'dreame.vacuum.r2307'*/
    ];

    // Check if this model requires manual tracking
    this.needsTracking = this.NO_API_SUPPORT_MODELS.includes(deviceModel);

    // For Matrix models
    this.isMatrix = deviceModel.includes('r241') || deviceModel.includes('r251');



    // Variables for area-based tracking
    this.lastTrackedArea = null;
    this.lastAreaUpdateTime = 0;
    this.areaStale = false;

    // Initialize mop tracking state
    this.mopTracking = {
      usedHours: 0,
      totalActiveMs: 0,          // Total active time in milliseconds
      trackingStartTime: 0,      // When current tracking session started
      lastActiveType: null,      // Matrix only: last active mop type
      lastUpdate: Date.now(),
      isActive: false,
      currentType: 'unknown',
      lastLogTime: 0             // Time of last consolidated log output
    };

    // Reference to water tracking (will be set later)
    this.waterTracking = null;

    // Matrix mop types configuration
    this.matrixMopTypes = {
      'A': { lifetimeHours: 300, name: 'Type A' },
      'B': { lifetimeHours: 300, name: 'Type B' },
      'C': { lifetimeHours: 300, name: 'Type C' }
    };

    // Initialize Matrix mop types if needed
    if (this.needsTracking) {
      // Create separate objects for each mop type
      this.mopTracking.A = {
        usedHours: 0,
        totalActiveMs: 0,
        isActive: false,
        trackingStartTime: 0,
        lastUpdate: Date.now()
      };
      this.mopTracking.B = {
        usedHours: 0,
        totalActiveMs: 0,
        isActive: false,
        trackingStartTime: 0,
        lastUpdate: Date.now()
      };
      this.mopTracking.C = {
        usedHours: 0,
        totalActiveMs: 0,
        isActive: false,
        trackingStartTime: 0,
        lastUpdate: Date.now()
      };
    }

    // Only initialize if tracking is required
    if (!this.needsTracking) {
      this.adapter.log.info(`[MopTracker] ${deviceModel} provides API data - no tracking required`);
      return;
    }

    this.adapter.log.info(`[MopTracker] Initialized for ${deviceModel} - manual tracking required`);
  }

  // Set water tracking reference
  setWaterTracking(waterTracking) {
    this.waterTracking = waterTracking;
  }

  async createMopApiStates() {
    // Standard mop states for all models
    await this.createStandardMopStates();

    // ADDITIONAL Matrix-specific states
    if (this.needsTracking) {
      await this.createMatrixSpecificStates();
    }
  }

  async createStandardMopStates() {
    // Standard states for ALL models
    const standardStates = [
      {
        id: 'MopPadLeft',
        path: `${this.deviceId}.state.MopPadLeft`,
        name: 'Mop pad left',
        type: 'number',
        role: 'value.percent',
        unit: '%',
        def: 100,
        min: 0,
        max: 100,
        read: true,
        write: false
      },
      {
        id: 'MopPadTimeLeft',
        path: `${this.deviceId}.state.MopPadTimeLeft`,
        name: 'Mop pad time left',
        type: 'number',
        role: 'value',
        unit: 'h',
        def: 300,
        min: 0,
        max: 500,
        read: true,
        write: false
      }
    ];

    const standardControl = [
      {
        id: 'ResetMopPad',
        path: `${this.deviceId}.control.ResetMopPad`,
        name: 'Reset mop pad',
        type: 'boolean',
        role: 'button',
        def: false,
        read: true,
        write: true
      }
    ];

    for (const obj of standardStates) {
      await this.adapter.setObjectNotExistsAsync(obj.path, {
        type: 'state',
        common: {
          name: obj.name,
          type: obj.type,
          role: obj.role,
          read: true,
          write: false,
          def: obj.def,
          ...(obj.unit && { unit: obj.unit }),
          ...(obj.min !== undefined && { min: obj.min }),
          ...(obj.max !== undefined && { max: obj.max })
        },
        native: {}
      });
    }

    for (const obj of standardControl) {
      await this.adapter.setObjectNotExistsAsync(obj.path, {
        type: 'state',
        common: {
          name: obj.name,
          type: obj.type,
          role: obj.role,
          read: true,
          write: true,
          def: obj.def
        },
        native: {}
      });
    }
  }

  async createMatrixSpecificStates() {
    // MATRIX MODELS ONLY
    this.adapter.log.info(`[WaterTracking] Creating Matrix-specific states for ${this.deviceModel}`);

    const matrixStates = [
      {
        id: 'ActiveMopType',
        path: `${this.deviceId}.state.ActiveMopType`,
        name: 'Active mop type (Matrix only)',
        type: 'string',
        role: 'state',
        def: 'unknown',
        read: true,
        write: false,
        states: {
          'A': 'Type A',
          'B': 'Type B',
          'C': 'Type C',
          'unknown': 'Unknown'
        }
      },
      // Type A
      {
        id: 'MopPadALeft',
        path: `${this.deviceId}.state.MopPadALeft`,
        name: 'Mop pad A left (Matrix only)',
        type: 'number',
        role: 'value.percent',
        unit: '%',
        def: 100,
        min: 0,
        max: 100,
        read: true,
        write: false
      },
      {
        id: 'MopPadATimeLeft',
        path: `${this.deviceId}.state.MopPadATimeLeft`,
        name: 'Mop pad A time left (Matrix only)',
        type: 'number',
        role: 'value',
        unit: 'h',
        def: 300,
        min: 0,
        max: 500,
        read: true,
        write: false
      },
      // Type B
      {
        id: 'MopPadBLeft',
        path: `${this.deviceId}.state.MopPadBLeft`,
        name: 'Mop pad B left (Matrix only)',
        type: 'number',
        role: 'value.percent',
        unit: '%',
        def: 100,
        min: 0,
        max: 100,
        read: true,
        write: false
      },
      {
        id: 'MopPadBTimeLeft',
        path: `${this.deviceId}.state.MopPadBTimeLeft`,
        name: 'Mop pad B time left (Matrix only)',
        type: 'number',
        role: 'value',
        unit: 'h',
        def: 300,
        min: 0,
        max: 500,
        read: true,
        write: false
      },
      // Type C
      {
        id: 'MopPadCLeft',
        path: `${this.deviceId}.state.MopPadCLeft`,
        name: 'Mop pad C left (Matrix only)',
        type: 'number',
        role: 'value.percent',
        unit: '%',
        def: 100,
        min: 0,
        max: 100,
        read: true,
        write: false
      },
      {
        id: 'MopPadCTimeLeft',
        path: `${this.deviceId}.state.MopPadCTimeLeft`,
        name: 'Mop pad C time left (Matrix only)',
        type: 'number',
        role: 'value',
        unit: 'h',
        def: 300,
        min: 0,
        max: 500,
        read: true,
        write: false
      }
    ];

    const matrixControl = [
      {
        id: 'ResetMopPadA',
        path: `${this.deviceId}.control.ResetMopPadA`,
        name: 'Reset Mop Pad A (Matrix only)',
        type: 'boolean',
        role: 'button',
        def: false,
        read: true,
        write: true
      },
      {
        id: 'ResetMopPadB',
        path: `${this.deviceId}.control.ResetMopPadB`,
        name: 'Reset Mop Pad B (Matrix only)',
        type: 'boolean',
        role: 'button',
        def: false,
        read: true,
        write: true
      },
      {
        id: 'ResetMopPadC',
        path: `${this.deviceId}.control.ResetMopPadC`,
        name: 'Reset Mop Pad C (Matrix only)',
        type: 'boolean',
        role: 'button',
        def: false,
        read: true,
        write: true
      }
    ];

    // Create Matrix states
    for (const obj of matrixStates) {
      await this.adapter.setObjectNotExistsAsync(obj.path, {
        type: 'state',
        common: {
          name: obj.name,
          type: obj.type,
          role: obj.role,
          read: true,
          write: false,
          def: obj.def,
          ...(obj.unit && { unit: obj.unit }),
          ...(obj.min !== undefined && { min: obj.min }),
          ...(obj.max !== undefined && { max: obj.max }),
          ...(obj.states && { states: obj.states })
        },
        native: {}
      });
    }

    // Create Matrix control buttons
    for (const obj of matrixControl) {
      await this.adapter.setObjectNotExistsAsync(obj.path, {
        type: 'state',
        common: {
          name: obj.name,
          type: obj.type,
          role: obj.role,
          read: true,
          write: true,
          def: obj.def
        },
        native: {}
      });
    }
  }

  async updateMopStates() {
    // Standard states for ALL models
    let remainingHours = Math.max(0, 300 - this.mopTracking.usedHours);
    let percentLeft = (remainingHours / 300) * 100;

    // For Matrix models, use the minimum of all types
    if (this.needsTracking && this.isMatrix) {
      const allRemainingHours = ['A', 'B', 'C'].map(type => {
        const mopData = this.mopTracking[type];
        if (!mopData) return 300;
        const lifetimeHours = this.matrixMopTypes[type]?.lifetimeHours || 300;
        return Math.max(0, lifetimeHours - (mopData.usedHours || 0));
      });

      remainingHours = Math.min(...allRemainingHours);
      percentLeft = (remainingHours / 300) * 100;
    }

    // Update general states
    await this.adapter.setStateAsync(`${this.deviceId}.state.MopPadLeft`, {
      val: Math.round(percentLeft),
      ack: true
    });

    await this.adapter.setStateAsync(`${this.deviceId}.state.MopPadTimeLeft`, {
      val: Math.round(remainingHours),
      ack: true
    });

    // Update Matrix-specific states if needed
    if (this.needsTracking && this.isMatrix) {
      await this.updateMatrixMopStates();
    }
  }

  async updateMatrixMopStates() {
    // MATRIX MODELS ONLY
    const currentType = this.mopTracking.currentType;

    if (!currentType || currentType === 'unknown') {
      await this.adapter.setStateAsync(`${this.deviceId}.state.ActiveMopType`, {
        val: 'unknown',
        ack: true
      });
      return;
    }

    // Set active mop type state
    await this.adapter.setStateAsync(`${this.deviceId}.state.ActiveMopType`, {
      val: currentType,
      ack: true
    });

    // Update all types (A, B, C) with their individual values
    for (const type of ['A', 'B', 'C']) {
      const mopData = this.mopTracking[type];
      if (!mopData) {
        // Initialize if missing
        this.mopTracking[type] = {
          usedHours: 0,
          totalActiveMs: 0,
          isActive: false,
          trackingStartTime: 0,
          lastUpdate: Date.now()
        };
        continue;
      }

      const lifetimeHours = this.matrixMopTypes[type]?.lifetimeHours || 300;
      const remainingHours = Math.max(0, lifetimeHours - (mopData.usedHours || 0));
      const percentLeft = lifetimeHours > 0 ? (remainingHours / lifetimeHours) * 100 : 0;

      await this.adapter.setStateAsync(`${this.deviceId}.state.MopPad${type}Left`, {
        val: Math.round(percentLeft),
        ack: true
      });

      await this.adapter.setStateAsync(`${this.deviceId}.state.MopPad${type}TimeLeft`, {
        val: Math.round(remainingHours),
        ack: true
      });
    }

    // Also update the general MopPadTimeLeft to show the minimum of all types
    const allRemainingHours = ['A', 'B', 'C'].map(type => {
      const mopData = this.mopTracking[type];
      if (!mopData) return 300;
      const lifetimeHours = this.matrixMopTypes[type]?.lifetimeHours || 300;
      return Math.max(0, lifetimeHours - (mopData.usedHours || 0));
    });

    const minRemainingHours = Math.min(...allRemainingHours);
    const minPercentLeft = (minRemainingHours / 300) * 100;

    // Update general states
    await this.adapter.setStateAsync(`${this.deviceId}.state.MopPadLeft`, {
      val: Math.round(minPercentLeft),
      ack: true
    });

    await this.adapter.setStateAsync(`${this.deviceId}.state.MopPadTimeLeft`, {
      val: Math.round(minRemainingHours),
      ack: true
    });
  }

  async updateMopTracking(currentAreaM2 = null) {
    try {
      const now = Date.now();
      const AREA_STALE_THRESHOLD = 120000; // 2 minutes without area change
      const LOG_INTERVAL = 30000; // 30 seconds for consolidated logging

      // ===== AREA MONITORING (for all models) =====
      if (currentAreaM2 !== null) {
        // First measurement or significant area change?
        if (
          this.lastTrackedArea === null ||
                Math.abs(currentAreaM2 - this.lastTrackedArea) > 0.05
        ) {
          // Area changed ? robot is actively cleaning
          this.lastTrackedArea = currentAreaM2;
          this.lastAreaUpdateTime = now;
          this.areaStale = false;
        }
        // Area unchanged for too long?
        else if ((now - this.lastAreaUpdateTime) > AREA_STALE_THRESHOLD) {
          this.areaStale = true;
        }
      }

      // ===== BASIC ACTIVITY DETECTION =====
      // Robot is considered INACTIVE if:
      // 1. No area change (areaStale = true)
      // 2. OR waterTracking.isMopping = false
      const isMoppingActive = this.waterTracking?.isMopping && !this.areaStale;

      // ===== GENERAL MOP TRACKING (for all models) =====
      if (!isMoppingActive) {
        // STOP tracking if it was active
        if (this.mopTracking.isActive) {
          // Calculate active time of this session
          const sessionActiveTime = now - this.mopTracking.trackingStartTime;
          this.mopTracking.totalActiveMs += sessionActiveTime;

          // Convert to hours
          this.mopTracking.usedHours =
                    this.mopTracking.totalActiveMs / (1000 * 60 * 60);

          this.mopTracking.isActive = false;

          // Debug log
          //this.adapter.log.info(`[MopTracker] Stopped. Total active: ${(this.mopTracking.usedHours * 60).toFixed(1)}min`);
          // Trigger log output when stopping
          this.logConsolidatedStatus(now, currentAreaM2, isMoppingActive);
        }
      } else {
        // START or RESUME tracking
        if (!this.mopTracking.isActive) {
          this.mopTracking.isActive = true;
          this.mopTracking.trackingStartTime = now;
          this.mopTracking.lastUpdate = now;

          this.adapter.log.info('[MopTracker] Started tracking');
        }

        // CALCULATE active time
        const currentSessionTime = now - this.mopTracking.trackingStartTime;
        const totalActiveTime =
                this.mopTracking.totalActiveMs + currentSessionTime;
        this.mopTracking.usedHours =
                totalActiveTime / (1000 * 60 * 60);

        this.mopTracking.lastUpdate = now;
      }

      // ===== MATRIX-SPECIFIC TRACKING (Matrix models only) =====

      // This ensures Matrix states are always updated
      if (this.needsTracking && this.isMatrix) {
        // First update internal tracking
        await this.updateMatrixMopTypeTracking(isMoppingActive);
        // Then update ALL states
        await this.updateMatrixMopStates();
      } else {
        // For non-Matrix models, just update standard states
        await this.updateMopStates();
      }

      // ===== CONSOLIDATED LOGGING EVERY 30 SECONDS =====
      if (now - this.mopTracking.lastLogTime >= LOG_INTERVAL) {
        this.logConsolidatedStatus(now, currentAreaM2, isMoppingActive);
        this.mopTracking.lastLogTime = now;
      }

    } catch (error) {
      this.adapter.log.error(
        `[WaterTracking] Mop tracking error: ${error.message}`
      );
    }
  }

  async updateMatrixMopTypeTracking(isMoppingActive = false) {
    // MATRIX MODELS ONLY
    try {
      // 1. Read current mop type from MQTT
      await this.updateCurrentMopType();

      const now = Date.now();
      const currentType = this.mopTracking.currentType;

      // 2. Track only if active AND mop type is known
      if (!isMoppingActive || !currentType || currentType === 'unknown') {
        // If inactive but a type was active before ? pause it
        if (
          this.mopTracking.lastActiveType &&
                this.mopTracking[this.mopTracking.lastActiveType]?.isActive
        ) {
          const typeData =
                    this.mopTracking[this.mopTracking.lastActiveType];
          const sessionActiveTime =
                    now - typeData.trackingStartTime;
          typeData.totalActiveMs += sessionActiveTime;
          typeData.usedHours =
                    typeData.totalActiveMs / (1000 * 60 * 60);
          typeData.isActive = false;

          this.adapter.log.info(
            `[MopTracker-Matrix] Type ${this.mopTracking.lastActiveType} paused`
          );
        }
        return;
      }

      // 3. Initialize type-specific data if needed
      if (!this.mopTracking[currentType]) {
        this.mopTracking[currentType] = {
          usedHours: 0,
          totalActiveMs: 0,
          isActive: false,
          trackingStartTime: 0,
          lastUpdate: 0
        };
      }

      const typeData = this.mopTracking[currentType];

      // ENSURE ALL FIELDS EXIST
      if (!typeData.usedHours) typeData.usedHours = 0;
      if (!typeData.totalActiveMs) typeData.totalActiveMs = 0;
      if (typeData.isActive === undefined) typeData.isActive = false;
      if (!typeData.trackingStartTime) typeData.trackingStartTime = 0;
      if (!typeData.lastUpdate) typeData.lastUpdate = 0;

      // 4. Detect and handle mop type changes
      if (currentType !== this.mopTracking.lastActiveType) {
        // Pause previous type
        if (
          this.mopTracking.lastActiveType &&
                this.mopTracking[this.mopTracking.lastActiveType]?.isActive
        ) {
          const oldTypeData =
                    this.mopTracking[this.mopTracking.lastActiveType];
          const oldSessionTime =
                    now - oldTypeData.trackingStartTime;
          oldTypeData.totalActiveMs += oldSessionTime;
          oldTypeData.usedHours =
                    oldTypeData.totalActiveMs / (1000 * 60 * 60);
          oldTypeData.isActive = false;

          this.adapter.log.info(
            `[MopTracker-Matrix] Switched from ${this.mopTracking.lastActiveType} to ${currentType}`
          );
        }

        // Start new type
        typeData.trackingStartTime = now;
        typeData.isActive = true;
        this.mopTracking.lastActiveType = currentType;

        this.adapter.log.info(
          `[MopTracker-Matrix] Type ${currentType} started`
        );
      }
      // Same type, resume if needed
      else if (!typeData.isActive) {
        typeData.trackingStartTime = now;
        typeData.isActive = true;
        this.mopTracking.lastActiveType = currentType;
      }

      // 5. Calculate active time for this mop type
      if (typeData.isActive) {
        const currentSessionTime =
                now - typeData.trackingStartTime;
        const totalActiveTime =
                typeData.totalActiveMs + currentSessionTime;
        typeData.usedHours =
                totalActiveTime / (1000 * 60 * 60);
        typeData.lastUpdate = now;
      }

		        // 6. AFTER ALL CALCULATIONS - UPDATE STATES IMMEDIATELY
      await this.updateMatrixMopStates();

    } catch (error) {
      this.adapter.log.error(
        `[WaterTracking] Matrix mop tracking error: ${error.message}`
      );
    }
  }


  async startMopTracking() {
    if (!this.needsTracking) return;

    try {
      // Start tracking for the current mop type
      this.mopTracking.isActive = true;
      this.mopTracking.lastUpdate = Date.now();

      // Start tracking for current mop type
      const currentType = this.mopTracking.currentType || 'A';
      this.mopTracking[currentType].lastUpdate = Date.now();

      this.adapter.log.info(`[WaterTracking] Mop tracking started for type ${currentType}`);
    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Failed to start mop tracking: ${error.message}`);
    }
  }

  // Consolidated logging
  logConsolidatedStatus(now, currentAreaM2, isMoppingActive) {
    const currentType = this.mopTracking.currentType || 'unknown';

    // Build consolidated log message using logParts array
    const logParts = [];

    logParts.push(`[MopTracker-Consolidated] === STATUS UPDATE (${new Date(now).toISOString()}) ===`);
    logParts.push(`General Tracking:`);
    logParts.push(`Area: ${currentAreaM2 !== null ? currentAreaM2.toFixed(2) + 'm²' : 'N/A'}, Stale: ${this.areaStale}`);
    logParts.push(`Water tracking active: ${this.waterTracking?.isMopping || false}`);
    logParts.push(`Mop tracking active: ${this.mopTracking.isActive}`);
    logParts.push(`Is mopping active: ${isMoppingActive}`);
    logParts.push(`Total hours: ${this.mopTracking.usedHours.toFixed(4)}`);
    logParts.push(`Total active ms: ${this.mopTracking.totalActiveMs}`);
    logParts.push(`Current type: ${currentType}`);

    // Matrix-specific info
    if (this.needsTracking) {
      logParts.push(`Matrix Type Tracking:`);
      logParts.push(`Current type: ${currentType}, Last active: ${this.mopTracking.lastActiveType || 'none'}`);

      // Current type data
      const typeData = this.mopTracking[currentType];
      if (typeData) {
        logParts.push(`Current type (${currentType}) data:`);
        logParts.push(`usedHours: ${typeData.usedHours?.toFixed(4) || 'null'}`);
        logParts.push(`totalActiveMs: ${typeData.totalActiveMs || 0}`);
        logParts.push(`isActive: ${typeData.isActive || false}`);
        if (typeData.trackingStartTime) {
          logParts.push(`trackingStartTime: ${new Date(typeData.trackingStartTime).toISOString()}`);
        }
      }

      // All types summary
      logParts.push(`All types summary:`);
      ['A', 'B', 'C'].forEach(type => {
        const data = this.mopTracking[type];
        if (data) {
          logParts.push(`${type}: ${data.usedHours?.toFixed(4) || 'null'} hrs, active: ${data.isActive || false}, totalMs: ${data.totalActiveMs || 0}`);
        }
      });
    }

    // Output the consolidated log
    this.adapter.log.info(logParts.join(' | '));
  }

  async stopMopTracking() {
    if (!this.needsTracking) return;

    try {
      // Just finalize current tracking without area update
      const now = Date.now();

      // Stop general tracking
      if (this.mopTracking.isActive) {
        const sessionTime = now - this.mopTracking.trackingStartTime;
        this.mopTracking.totalActiveMs += sessionTime;
        this.mopTracking.usedHours =
                this.mopTracking.totalActiveMs / (1000 * 60 * 60);
        this.mopTracking.isActive = false;
      }

      // Stop Matrix-specific type tracking
      if (this.needsTracking && this.mopTracking.lastActiveType) {
        const type = this.mopTracking.lastActiveType;
        if (this.mopTracking[type]?.isActive) {
          const sessionTime = now - this.mopTracking[type].trackingStartTime;
          this.mopTracking[type].totalActiveMs += sessionTime;
          this.mopTracking[type].usedHours =
                    this.mopTracking[type].totalActiveMs / (1000 * 60 * 60);
          this.mopTracking[type].isActive = false;
        }
      }

      // Reset tracking state
      this.areaStale = true;
      this.lastTrackedArea = null;

      // Save current state
      await this.saveMopData();

      this.adapter.log.info('[WaterTracking] Mop tracking stopped (finalized)');
    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Failed to stop mop tracking: ${error.message}`);
    }
  }

  // ============== UPDATE CURRENT MOP TYPE ==============

  async updateCurrentMopType() {
    try {
      // Read mop type from MQTT state
      const activeTypeState = await this.adapter.getStateAsync(`${this.deviceId}.mqtt.moptype`);

      if (activeTypeState?.val !== undefined && activeTypeState.val !== null) {
        const typeValue = parseInt(activeTypeState.val);

        // Map numeric values to letter codes
        switch (typeValue) {
          case 0:
            this.mopTracking.currentType = 'A';
            break;
          case 1:
            this.mopTracking.currentType = 'B';
            break;
          case 2:
            this.mopTracking.currentType = 'C';
            break;
          default:
            this.mopTracking.currentType = 'unknown';
            this.adapter.log.warn(`[WaterTracking] Unknown mop type value: ${typeValue}`);
        }

        //this.adapter.log.info(`[WaterTracking] Mop type updated from MQTT: ${typeValue} -> ${this.mopTracking.currentType}`);
      } else {
        // Fallback: Set default value
        this.mopTracking.currentType = 'A';
        this.adapter.log.info('[WaterTracking] No mop type from MQTT, using default: A');
      }

      // Write active mop type to state (optional)
      if (this.mopTracking.currentType !== 'unknown') {
        await this.adapter.setStateAsync(`${this.deviceId}.state.ActiveMopType`, {
          val: this.mopTracking.currentType,
          ack: true
        });
      }

    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Failed to update mop type: ${error.message}`);
      this.mopTracking.currentType = 'unknown';
    }
  }

  async handleStateChange(stateId, value) {
    // ResetMopPad - for ALL models
    if (stateId === `${this.deviceId}.control.ResetMopPad` && value === true) {
      await this.resetMopPad();
    }

    // Matrix-specific reset buttons
    if (this.needsTracking) {
      await this.handleMatrixResetButtons(stateId, value);
    }
  }

  async resetMopPad() {
    // Standard reset for ALL models
    this.mopTracking.usedHours = 0;
    this.mopTracking.lastUpdate = Date.now();

    // Additionally reset Matrix types
    if (this.needsTracking) {
      for (const type of ['A', 'B', 'C']) {
        this.mopTracking[type].usedHours = 0;
        this.mopTracking[type].lastUpdate = Date.now();
      }
    }

    await this.updateMopStates();
    await this.saveMopData();

    // Reset button state
    await this.adapter.setStateAsync(`${this.deviceId}.control.ResetMopPad`, {
      val: false,
      ack: true
    });

    this.adapter.log.info('[WaterTracking] Mop pad reset');
  }

  async handleMatrixResetButtons(stateId, value) {
    // MATRIX MODELS ONLY
    if (value !== true) return;

    if (stateId.includes('ResetMopPadA')) {
      await this.resetMatrixMopType('A');
    } else if (stateId.includes('ResetMopPadB')) {
      await this.resetMatrixMopType('B');
    } else if (stateId.includes('ResetMopPadC')) {
      await this.resetMatrixMopType('C');
    }
  }

  async resetMatrixMopType(type) {
    if (this.mopTracking[type]) {
      this.mopTracking[type].usedHours = 0;
	  this.mopTracking[type].totalActiveMs = 0;
      this.mopTracking[type].lastUpdate = Date.now();

      if (this.mopTracking.currentType === type) {
        this.mopTracking.totalActiveMs = 0;
        this.mopTracking.usedHours = 0;
        this.adapter.log.info(`[WaterTracking] Active mop type ${type} was reset`);
      }

      await this.updateMopStates();
      await this.saveMopData();

      // Reset specific reset button
      await this.adapter.setStateAsync(`${this.deviceId}.control.ResetMopPad${type}`, {
        val: false,
        ack: true
      });

      this.adapter.log.info(`[WaterTracking] Matrix mop type ${type} reset`);
    }
  }

  async saveMopData() {
    try {
      if (this.isMatrix) {
        // Debug logging for Matrix models
        this.adapter.log.info(`[MopTracker] Saving MATRIX mop data:`);
        this.adapter.log.info(`  - Total usedHours: ${this.mopTracking.usedHours}`);
        this.adapter.log.info(`  - Type A usedHours: ${this.mopTracking.A?.usedHours || 0}`);
        this.adapter.log.info(`  - Type B usedHours: ${this.mopTracking.B?.usedHours || 0}`);
        this.adapter.log.info(`  - Type C usedHours: ${this.mopTracking.C?.usedHours || 0}`);

        const remainingA = 300 - (this.mopTracking.A?.usedHours || 0);
        const remainingB = 300 - (this.mopTracking.B?.usedHours || 0);
        const remainingC = 300 - (this.mopTracking.C?.usedHours || 0);

        this.adapter.log.info(`  - Remaining A: ${remainingA}, B: ${remainingB}, C: ${remainingC}`);
        this.adapter.log.info(`  - Minimum remaining: ${Math.min(remainingA, remainingB, remainingC)}`);
      } else {
        this.adapter.log.debug(`[MopTracker] Saving mop data for ${this.deviceModel}`);
      }

      // Copy data and sanitize it for X-series devices
      const dataToSave = { ...this.mopTracking };

      // REMOVE A/B/C data for X-series devices
      if (!this.isMatrix) {
        delete dataToSave.A;
        delete dataToSave.B;
        delete dataToSave.C;
        delete dataToSave.currentType;
        delete dataToSave.lastActiveType;

        // Add model information
        dataToSave._model = this.deviceModel;
        dataToSave._isMatrix = false;
      } else {
        // For Matrix devices: add model information
        dataToSave._model = this.deviceModel;
        dataToSave._isMatrix = true;
      }

      dataToSave._savedAt = Date.now();
      dataToSave._version = '2.0';

      // Save mop tracking data to persistent state
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.MopTracking`, {
        type: 'state',
        common: {
          name: 'Mop Tracking Data',
          type: 'string',
          role: 'json',
          read: true,
          write: false,
          def: '{}'
        },
        native: {}
      });

      // Save the SANITIZED data
      await this.adapter.setStateAsync(`${this.deviceId}.state.MopTracking`, {
        val: JSON.stringify(dataToSave),  // SANITIZED data!
        ack: true
      });

      this.adapter.log.info('[WaterTracking] Mop tracking data saved');
    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Failed to save mop data: ${error.message}`);
    }
  }


  async restoreMopData() {
    try {
      const mopDataState = await this.adapter.getStateAsync(`${this.deviceId}.state.MopTracking`);

      if (mopDataState?.val) {
        try {
          const savedData = JSON.parse(mopDataState.val);

          // Debug logging
          this.adapter.log.info(`[MopTracker] Restoring data for ${this.deviceModel}`);

          if (this.isMatrix) {
            this.adapter.log.info(
              `  - Matrix data found: A=${savedData.A?.usedHours}, B=${savedData.B?.usedHours}, C=${savedData.C?.usedHours}`
            );
          }

          // VALIDATION: Ensure the saved data is a valid object
          if (!savedData || typeof savedData !== 'object') {
            throw new Error('Invalid mop data format');
          }

          // CHECK model consistency
          if (savedData._model && savedData._model !== this.deviceModel) {
            this.adapter.log.warn(
              `Model changed: ${savedData._model} -> ${this.deviceModel}. Resetting.`
            );
            await this.resetMopTrackingData();
            return;
          }

          // Ensure all required main tracking fields exist
          const requiredFields = ['usedHours', 'totalActiveMs', 'isActive', 'lastUpdate'];

          // Repair missing main tracking fields
          requiredFields.forEach(field => {
            if (savedData[field] === undefined || savedData[field] === null) {
              savedData[field] = field === 'isActive' ? false : 0;
            }
          });

          // MATRIX ONLY: Handle A/B/C mop type data
          if (this.isMatrix) {
            const typeFields = [
              'usedHours',
              'totalActiveMs',
              'isActive',
              'trackingStartTime',
              'lastUpdate'
            ];

            ['A', 'B', 'C'].forEach(type => {
              if (savedData[type] && typeof savedData[type] === 'object') {
                // Repair missing fields for existing type
                typeFields.forEach(field => {
                  if (savedData[type][field] === undefined || savedData[type][field] === null) {
                    savedData[type][field] = field === 'isActive' ? false : 0;
                  }
                });
              } else {
                // Create missing type object for Matrix devices
                savedData[type] = {
                  usedHours: 0,
                  totalActiveMs: 0,
                  isActive: false,
                  trackingStartTime: 0,
                  lastUpdate: Date.now()
                };
              }
            });
          } else {
            // X-SERIES ONLY: Remove A/B/C data if present
            delete savedData.A;
            delete savedData.B;
            delete savedData.C;
            delete savedData.currentType;
            delete savedData.lastActiveType;
          }

          // Restore mop tracking data
          this.mopTracking = {
            ...this.mopTracking, // Keep default structure
            ...savedData,        // Override with restored data
            lastUpdate: Date.now() // Reset last update timestamp
          };

          this.adapter.log.info('[WaterTracking] Mop tracking data restored');

          // Update states with restored mop data
          await this.updateMopStates();

        } catch (error) {
          this.adapter.log.warn(
            '[WaterTracking] Failed to parse saved mop data, resetting'
          );
          await this.resetMopTrackingData();
        }
      }
    } catch (error) {
      this.adapter.log.error(
        `[WaterTracking] Failed to restore mop data: ${error.message}`
      );
      await this.resetMopTrackingData();
    }
  }


  async resetMopTrackingData() {
    // Reset mop tracking to default values
    this.mopTracking = {
      usedHours: 0,
      totalActiveMs: 0,
      trackingStartTime: 0,
      lastActiveType: null,
      lastUpdate: Date.now(),
      isActive: false,
      currentType: 'unknown'
    };

    // MATRIX ONLY: Reset A/B/C mop type data
    if (this.isMatrix) {
      ['A', 'B', 'C'].forEach(type => {
        this.mopTracking[type] = {
          usedHours: 0,
          totalActiveMs: 0,
          isActive: false,
          trackingStartTime: 0,
          lastUpdate: Date.now()
        };
      });
    }

    // Persist reset data
    await this.saveMopData();
    await this.updateMopStates();

    this.adapter.log.info(
      `[MopTracker] Reset tracking data for ${this.deviceModel} ` +
        `(isMatrix: ${this.isMatrix})`
    );
  }


  async cleanup() {
    try {
      // Save current mop tracking data
      await this.saveMopData();

      this.adapter.log.info(`[WaterTracking] DirectMopTracker cleaned up for ${this.deviceModel}`);
    } catch (error) {
      this.adapter.log.error(`[WaterTracking] Error cleaning up mop tracker: ${error.message}`);
    }
  }
}

// ============== DETERGENT CONFIGURATION ==============
const DETERGENT_TRACKING = {
  // Tank capacities (in milliliters)
  TANK_CAPACITIES: {
    // L10 / L10s series: EXACTLY 290 ml
    L10_SERIES: 290,

    // L20 / L30 / Matrix / X / W / Z series: EXACTLY 520 ml
    STANDARD: 520,

    // Models WITHOUT detergent tank
    NONE: 0,

    DEFAULT: 520
  },

  // Detergent consumption values
  CONSUMPTION: {
    // Consumption per cleaning cycle (ml)
    PER_CYCLE: {
      LIGHT: 2,      // 2 ml per light cleaning (Matrix)
      STANDARD: 3,   // 3 ml per standard cleaning (Matrix)
      DEEP: 4,       // 4 ml per deep cleaning (Matrix)
      ULTRA: 5       // 5 ml per ultra cleaning (Matrix)
    },

    // AUTO MODE: Intelligent dosing (Matrix specific)
    AUTO: {
      MIN: 1,        // Minimum in auto mode for Matrix
      MAX: 4         // Maximum in auto mode for Matrix
    },

    DEFAULT: 3       // Default for Matrix
  },

  // Cycles per tank fill
  CYCLES_PER_TANK: {
    // L10 / L10s series (290 ml tank) - 3ml Standard
    L10_SERIES: {
      LIGHT: 145,    // 290 ml / 2 ml = 145 cycles
      STANDARD: 97,  // 290 ml / 3 ml = ~97 cycles
      DEEP: 73,      // 290 ml / 4 ml = ~73 cycles
      ULTRA: 58      // 290 ml / 5 ml = 58 cycles
    },

    // Standard series (520 ml tank) - Matrix/L20/X series
    STANDARD: {
      LIGHT: 260,    // 520 ml / 2 ml = 260 cycles
      STANDARD: 173, // 520 ml / 3 ml = ~173 cycles
      DEEP: 130,     // 520 ml / 4 ml = 130 cycles
      ULTRA: 104     // 520 ml / 5 ml = 104 cycles
    }
  },

  // Model-specific configuration
  MODEL_CONFIG: {
    // ==================== MATRIX / X SERIES (520 ml, ~173 cycles with 3ml) ====================
    'dreame.vacuum.r25135': {
      tank: 'STANDARD',
      hasDetergent: true,
      officialCycles: 173, // ~173 cleaning cycles with 3ml/cycle
      officialMl: 520     // 520 ml tank
    },
    'dreame.vacuum.r2415': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2416': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2417': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2410': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2411': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2412': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },

    // X series
    'dreame.vacuum.r2310': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2311': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2312': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2315': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2320': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2322': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2350': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2356': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },

    // ==================== L20 / L30 SERIES (520 ml, ~173 cycles) ====================
    'dreame.vacuum.r2235': {
      tank: 'STANDARD',
      hasDetergent: true,
      officialCycles: 173, // ~173 cleaning cycles
      officialMl: 520
    },
    'dreame.vacuum.r2240': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2242': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2245': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2246': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2261': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2262': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2263': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },
    'dreame.vacuum.r2316': { tank: 'STANDARD', hasDetergent: true, officialCycles: 173, officialMl: 520 },

    // ==================== L10s SERIES WITH STATION (290 ml, ~97 cycles) ====================
    'dreame.vacuum.r2215o': {
      tank: 'L10_SERIES',
      hasDetergent: true,
      officialCycles: 97, // ~97 cleaning cycles with 3ml/cycle
      officialMl: 290
    },
    'dreame.vacuum.r2216': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2231': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2232': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2233': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2250': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2251': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2253': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2254': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },
    'dreame.vacuum.r2257': { tank: 'L10_SERIES', hasDetergent: true, officialCycles: 97, officialMl: 290 },

    // ==================== DEFAULT ====================
    'default': {
      tank: 'DEFAULT',
      hasDetergent: true,
      officialCycles: 173,
      officialMl: 520
    }
  },

  // Cleaning modes
  CLEANING_MODES: {
    // Matches the updated consumption values
    0: { name: 'Light', consumption: 2, desc: 'Light cleaning (2ml/cycle)' },
    1: { name: 'Standard', consumption: 3, desc: 'Standard cleaning (3ml/cycle)' },
    2: { name: 'Deep', consumption: 4, desc: 'Deep cleaning (4ml/cycle)' },
    3: { name: 'Ultra', consumption: 5, desc: 'Ultra cleaning (5ml/cycle)' }
  }
};


// ============== DETERGENT TRACKING MODULE ==============
class DetergentTrackingModule {
  constructor(adapter, deviceId, deviceModel, DreameMopWashLevel = null, UserLang = 'EN') {
    this.adapter = adapter;
    this.deviceId = deviceId;
    this.deviceModel = deviceModel;

    this.DreameMopWashLevel = DreameMopWashLevel;
    this.UserLang = UserLang;

    this.detergentTracking = null;
    this.modelConfig = null;
    this.hasDetergentTank = false;
    this.officialCycles = 0;
    this.officialTankMl = 0;
  }

  async initialize() {
    try {
      await this.detectModelConfig();

      if (!this.hasDetergentTank) {
        this.adapter.log.info(`[DetergentTracking] ${this.deviceModel} has no detergent tank`);
        return true;
      }

      await this.initDetergentTracking();
      await this.createDetergentStates();
      await this.restorePersistedData();

      // Log official information
      this.adapter.log.info(
        `[DetergentTracking] ${this.deviceModel}: ` +
        `OFFICIAL: ${this.officialTankMl}ml tank, ${this.officialCycles} cycles (Standard mode)`
      );

      return true;

    } catch (error) {
      this.adapter.log.error(`[DetergentTracking] Initialization failed: ${error.message}`);
      return false;
    }
  }

  async detectModelConfig() {
    const modelStr = this.deviceModel.toString().trim();

    // 1. Exact match with official data
    if (DETERGENT_TRACKING.MODEL_CONFIG[modelStr]) {
      this.modelConfig = DETERGENT_TRACKING.MODEL_CONFIG[modelStr];
    }
    // 2. Pattern matching with defaults
    else {
      if (
        modelStr.includes('matrix') || modelStr.includes('x30') || modelStr.includes('x40') ||
        modelStr.includes('l20') || modelStr.includes('l30') ||
        modelStr.includes('w10') || modelStr.includes('w20') || modelStr.includes('w30') ||
        modelStr.includes('z10') || modelStr.includes('z20')
      ) {
        // L20 default configuration
        this.modelConfig = DETERGENT_TRACKING.MODEL_CONFIG['dreame.vacuum.r2235'];
      }
      else if (
        modelStr.includes('l10s') &&
        (modelStr.includes('ultra') || modelStr.includes('pro') || modelStr.includes('plus'))
      ) {
        // L10s default configuration
        this.modelConfig = DETERGENT_TRACKING.MODEL_CONFIG['dreame.vacuum.r2215o'];
      }
      else {
        // Generic default configuration
        this.modelConfig = DETERGENT_TRACKING.MODEL_CONFIG.default;
      }
    }

    this.hasDetergentTank = this.modelConfig.hasDetergent;
    this.officialCycles = this.modelConfig.officialCycles || 52;
    this.officialTankMl = this.modelConfig.officialMl || 520;

    return this.modelConfig;
  }

  async initDetergentTracking() {
    if (!this.hasDetergentTank) return;

    this.detergentTracking = {
      // Values
      currentMl: this.officialTankMl,
      tankCapacity: this.officialTankMl,
      initialMl: this.officialTankMl,
      officialCycles: this.officialCycles,

      // Consumption based on wash level
      consumptionPerCycle: DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.STANDARD, // 10ml standard

      // Tracking
      totalCycles: 0,
      totalDetergentUsed: 0,
      cyclesByMode: {
        light: 0,
        standard: 0,
        deep: 0,
        ultra: 0
      },

      // Timestamps
      lastRefillTime: Date.now(),
      firstUseTime: Date.now(),
      lastUpdate: Date.now(),

      // Settings
      currentMode: 'standard',
      autoAdjustment: false,
      lowLevelWarningSent: false,
      criticalLevelWarningSent: false
    };
  }

  async createDetergentStates() {
    if (!this.hasDetergentTank) return;

    // Channel
    await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.detergent`, {
      type: 'channel',
      common: { name: 'Detergent Information', read: true },
      native: {}
    });

    // States
    const states = [
      {
        id: 'CurrentMl',
        name: 'Current detergent (ml)',
        type: 'number',
        role: 'value.volume',
        unit: 'ml',
        def: this.officialTankMl,
        min: 0,
        max: this.officialTankMl,
        read: true,
        write: false
      },
      {
        id: 'TankCapacity',
        name: 'Tank capacity (official)',
        type: 'number',
        role: 'value.volume',
        unit: 'ml',
        def: this.officialTankMl,
        read: true,
        write: false,
        desc: `Official: ${this.officialTankMl}ml`
      },
      {
        id: 'OfficialCycles',
        name: 'Official cycles per tank',
        type: 'number',
        role: 'value',
        unit: 'cycles',
        def: this.officialCycles,
        read: true,
        write: false,
        desc: `Official: ${this.officialCycles} cycles (Standard mode)`
      },
      {
        id: 'Percent',
        name: 'Detergent level (%)',
        type: 'number',
        role: 'value.percent',
        unit: '%',
        def: 100,
        min: 0,
        max: 100,
        read: true,
        write: false
      },
      {
        id: 'RemainingCycles',
        name: 'Remaining cycles',
        type: 'number',
        role: 'value',
        unit: 'cycles',
        def: this.officialCycles,
        min: 0,
        max: this.officialCycles,
        read: true,
        write: false
      },
      {
        id: 'TotalCycles',
        name: 'Total cycles performed',
        type: 'number',
        role: 'value',
        def: 0,
        read: true,
        write: false
      },
      {
        id: 'CyclesByMode',
        name: 'Cycles by cleaning mode',
        type: 'string',
        role: 'json',
        def: JSON.stringify({ light: 0, standard: 0, deep: 0, ultra: 0 }),
        read: true,
        write: false
      },
      {
        id: 'ConsumptionMode',
        name: 'Current consumption mode',
        type: 'string',
        role: 'state',
        def: 'standard',
        read: true,
        write: true,
        states: {
          light: `Light (${DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.LIGHT}ml/cycle)`,
          standard: `Standard (${DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.STANDARD}ml/cycle)`,
          deep: `Deep (${DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.DEEP}ml/cycle)`,
          ultra: `Ultra (${DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.ULTRA}ml/cycle)`,
          auto: `Auto (${DETERGENT_TRACKING.CONSUMPTION.AUTO.MIN}-${DETERGENT_TRACKING.CONSUMPTION.AUTO.MAX}ml/cycle)`
        }
      },
      {
        id: 'LastRefillTime',
        name: 'Last refill timestamp',
        type: 'number',
        role: 'value.time',
        def: Date.now(),
        read: true,
        write: false
      },
      {
        id: 'FirstUseTime',
        name: 'First use timestamp',
        type: 'number',
        role: 'value.time',
        def: Date.now(),
        read: true,
        write: false
      },
      {
        id: 'AverageCyclesPerDay',
        name: 'Average cycles per day',
        type: 'number',
        role: 'value',
        unit: 'cycles/day',
        def: 0,
        read: true,
        write: false
      },
      {
        id: 'EstimatedRefillDate',
        name: 'Estimated refill date',
        type: 'string',
        role: 'value.date',
        def: '',
        read: true,
        write: false
      }
    ];

    for (const state of states) {
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.detergent.${state.id}`, {
        type: 'state',
        common: {
          name: state.name,
          type: state.type,
          role: state.role,
          read: state.read,
          write: state.write || false,
          def: state.def,
          ...(state.unit && { unit: state.unit }),
          ...(state.min !== undefined && { min: state.min }),
          ...(state.max !== undefined && { max: state.max }),
          ...(state.states && { states: state.states }),
          ...(state.desc && { desc: state.desc })
        },
        native: {}
      });
    }
  }

  async doseDetergentForMopWash(washLevel = 1) {
    if (!this.hasDetergentTank || !this.detergentTracking) return null;

    try {
      // ===== 1. WASH LEVEL DETECTION =====
      const currentWashLevelState = await this.adapter.getStateAsync(`${this.deviceId}.state.MopWashLevel`);
      let actualWashLevel = washLevel;
      let washLevelName = 'Standard';

      if (currentWashLevelState?.val !== undefined && currentWashLevelState.val !== null) {
        const stateValue = String(currentWashLevelState.val).trim();
        if (String(washLevel) !== stateValue) {
          actualWashLevel = parseInt(stateValue) || 1;
          this.adapter.log.info(
            `[Detergent] Wash level mismatch: param=${washLevel}, state=${stateValue}, using state`
          );
        }

        if (this.DreameMopWashLevel && this.UserLang) {
          const washLevelKey = String(actualWashLevel);
          washLevelName = this.DreameMopWashLevel[this.UserLang][washLevelKey] || 'Standard';
        }
      }

      const normalizedWashLevel =
            washLevel === -1 ? 1 : Math.max(0, Math.min(3, washLevel));

      // ===== 2. SMART AUTO-WASH DETECTION =====
      const isAutoMode = await this.isSmartAutoWashEnabled();
      const autoWashLevel = await this.getSmartAutoWashLevel();

      // ===== 3. MOP WASH CONSUMPTION VALUES =====
      const mopWashConsumption = {
        0: 1,   // Light mop wash: 1 ml
        1: 2,   // Standard mop wash: 2 ml
        2: 3,   // Deep mop wash: 3 ml
        3: 4   // Ultra mop wash: 4 ml
      };

      let consumptionMl = mopWashConsumption[normalizedWashLevel] || 5;
      let modeName =
            ['light', 'standard', 'deep', 'ultra'][normalizedWashLevel] || 'standard';

      // ===== 4. AUTO MODE CALCULATION =====
      if (isAutoMode) {
        consumptionMl = this.calculateAutoModeConsumption(
          normalizedWashLevel,
          autoWashLevel
        );

        // Additionally: 30% less for mop wash
        // (only washing mop pads, not a full cleaning cycle)
        consumptionMl = Math.max(2, Math.round(consumptionMl * 0.7));
        modeName = `auto_${autoWashLevel}`;

        this.adapter.log.info(
          `[Detergent] SmartAutoWash level ${autoWashLevel} active: ` +
                `${consumptionMl} ml calculated for mop wash`
        );
      }

      // ===== 5. COOLDOWN FOR MOP WASH =====
      const now = Date.now();
      const lastWashTime = this.detergentTracking.lastMopWashTime || 0;
      if (now - lastWashTime < 10 * 60 * 1000) { // 10-minute cooldown
        this.adapter.log.info('[Detergent] Skipping -> mop wash too recent');
        return null;
      }

      // ===== 6. UPDATE TRACKING =====
      this.detergentTracking.currentMl -= consumptionMl;

      // UPDATE BOTH COUNTERS (for compatibility)
      this.detergentTracking.totalMopWashes =
            (this.detergentTracking.totalMopWashes || 0) + 1;
      this.detergentTracking.totalCycles =
            (this.detergentTracking.totalCycles || 0) + 1; // Compatibility

      this.detergentTracking.totalDetergentUsed += consumptionMl;
      this.detergentTracking.cyclesByMode[modeName] =
            (this.detergentTracking.cyclesByMode[modeName] || 0) + 1;

      // STORE ALL "LAST" VALUES
      this.detergentTracking.lastMopWashTime = now;
      this.detergentTracking.lastWashLevel = normalizedWashLevel;
      this.detergentTracking.lastWashLevelName = washLevelName;
      this.detergentTracking.lastUpdate = now;

      if (this.detergentTracking.currentMl < 0) {
        this.detergentTracking.currentMl = 0;
      }

      // ===== 7. UPDATE STATES =====
      await this.updateDetergentStates();
      await this.checkWarnings();
      await this.saveDetergentData();

      // ===== 8. LOGGING =====
      const remainingWashes = Math.floor(
        this.detergentTracking.currentMl / consumptionMl
      );
      const remainingCycles = this.calculateRemainingCycles(modeName);
      const percent =
            (this.detergentTracking.currentMl / this.officialTankMl) * 100;

      this.adapter.log.info(
        `[Detergent] MOP WASH: ${washLevelName} (${modeName}) | ` +
            `${consumptionMl} ml dosed | ` +
            `Remaining: ${Math.round(this.detergentTracking.currentMl)} ml ` +
            `(${Math.round(percent)}%) | ` +
            `~${remainingWashes} mop washes left | ` +
            `~${remainingCycles} full cycles left`
      );

      // ===== 9. RETURN VALUE =====
      return {
        type: 'mop_wash',
        washLevel: normalizedWashLevel,
        washLevelName,
        consumptionMl,
        mode: modeName,
        remainingMl: this.detergentTracking.currentMl,
        remainingPercent: percent,
        estimatedCyclesLeft: remainingCycles,
        remainingWashes,
        isAutoMode,
        autoWashLevel
      };

    } catch (error) {
      this.adapter.log.error(
        `[Detergent] Mop wash dosing error: ${error.message}`
      );
      return null;
    }
  }

  // Check whether SmartAutoWash is enabled in device settings
  async isSmartAutoWashEnabled() {
    try {
      const settingsState =
        await this.adapter.getStateAsync(
          `${this.deviceId}.state.AutoSwitchSettings`
        );

      if (settingsState?.val) {
        try {
          const settings = JSON.parse(settingsState.val);
          const autoWash = settings.find(s => s.k === 'SmartAutoWash');

          // SmartAutoWash values:
          // 0 = Disabled (fixed wash level)
          // 1 = Auto Level 1 (basic)
          // 2 = Auto Level 2 (intelligent)
          return autoWash && parseInt(autoWash.v, 10) > 0;
        } catch {
          return false;
        }
      }
    } catch {
      // Ignore read errors
    }

    return false;
  }

  // Get the configured SmartAutoWash level / returns 0, 1 or 2
  async getSmartAutoWashLevel() {
    try {
      const settingsState =
        await this.adapter.getStateAsync(
          `${this.deviceId}.state.AutoSwitchSettings`
        );

      if (settingsState?.val) {
        try {
          const settings = JSON.parse(settingsState.val);
          const autoWash = settings.find(s => s.k === 'SmartAutoWash');
          return autoWash ? parseInt(autoWash.v, 10) : 0;
        } catch {
          return 0;
        }
      }
    } catch {
      // Ignore read errors
    }

    return 0;
  }

  // Calculate detergent consumption for SmartAutoWash mode, based on Dreame's auto-wash logic / baseWashLevel - Selected wash level (0�3) / autoLevel - SmartAutoWash level (1 or 2)
  calculateAutoModeConsumption(baseWashLevel, autoLevel = 2) {
    // Base consumption per wash level
    const baseConsumptions = {
      0: DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.LIGHT,     // 5 ml
      1: DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.STANDARD, // 10 ml
      2: DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.DEEP,     // 12 ml
      3: DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.ULTRA     // 15 ml
    };

    const baseConsumption = baseConsumptions[baseWashLevel] || 10;

    // SmartAutoWash level adjustments
    if (autoLevel === 1) {
      // Level 1: Simple reduction (approx. 10�20%)
      return Math.round(baseConsumption * 0.85); // ~15% less
    }
    else if (autoLevel === 2) {
      // Level 2: Intelligent adjustment (sensor-based in real devices)
      // Here simulated with controlled variability

      // Simulated scenarios:
      // - Maintenance cleaning: 70�90%
      // - Normal cleaning: 90�110%
      // - Heavy cleaning: 110�130%
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8�1.2
      const calculated = Math.round(baseConsumption * randomFactor);

      // Enforce official auto mode limits
      const minConsumption = DETERGENT_TRACKING.CONSUMPTION.AUTO.MIN; // 3 ml
      const maxConsumption = DETERGENT_TRACKING.CONSUMPTION.AUTO.MAX; // 12 ml

      return Math.min(
        maxConsumption,
        Math.max(minConsumption, calculated)
      );
    }

    // Fallback: auto mode disabled
    return baseConsumption;
  }


  // Calculate remaining cycles based on the selected mode / mode - light | standard | deep | ultra
  calculateRemainingCycles(mode = 'standard') {
    if (!this.detergentTracking || this.detergentTracking.currentMl <= 0) return 0;

    let consumptionPerCycle;
    switch (mode) {
      case 'light':
        consumptionPerCycle = DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.LIGHT;
        break;
      case 'standard':
        consumptionPerCycle = DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.STANDARD;
        break;
      case 'deep':
        consumptionPerCycle = DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.DEEP;
        break;
      case 'ultra':
        consumptionPerCycle = DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.ULTRA;
        break;
      default:
        consumptionPerCycle = DETERGENT_TRACKING.CONSUMPTION.PER_CYCLE.STANDARD;
    }

    return Math.floor(this.detergentTracking.currentMl / consumptionPerCycle);
  }

  async updateDetergentStates() {
    if (!this.hasDetergentTank) return;

    const tracking = this.detergentTracking;
    const percent = Math.round((tracking.currentMl / this.officialTankMl) * 100);
    const remainingCycles = this.calculateRemainingCycles(tracking.currentMode);
    const hoursLeft = remainingCycles; // 1 cycle = 1 hour

    // Update all relevant states
    const updates = [
      { id: 'CurrentMl', val: Math.round(tracking.currentMl) },
      { id: 'Percent', val: percent },
      { id: 'RemainingCycles', val: remainingCycles },
      { id: 'TotalCycles', val: tracking.totalCycles },
      { id: 'CyclesByMode', val: JSON.stringify(tracking.cyclesByMode) },
      { id: 'LastRefillTime', val: tracking.lastRefillTime },
      { id: 'FirstUseTime', val: tracking.firstUseTime }
    ];

    for (const update of updates) {
      await this.adapter.setStateAsync(
        `${this.deviceId}.state.detergent.${update.id}`,
        { val: update.val, ack: true }
      );
    }

    // Same list as used in DirectMopTracker
    const NO_API_SUPPORT_MODELS = [
      // Matrix series
      'dreame.vacuum.r25135',   // Matrix 10 Ultra
      'dreame.vacuum.r2415',    // Matrix 10
      'dreame.vacuum.r2416',    // Matrix 10 Pro
      'dreame.vacuum.r2417',    // Matrix 10 Ultra (old)
      'dreame.vacuum.r2410',    // Matrix
      'dreame.vacuum.r2411',    // Matrix Pro
      'dreame.vacuum.r2412',    // Matrix Ultra

      // X series
      'dreame.vacuum.r2310',    // X30 Ultra
      'dreame.vacuum.r2311',    // X30
      'dreame.vacuum.r2312',    // X30 Global
      'dreame.vacuum.r2315',    // X40 Ultra
      'dreame.vacuum.r2320',    // X30 Pro
      'dreame.vacuum.r2322',    // X40
      'dreame.vacuum.r2350',    // X30 Ultra (new HW)
      'dreame.vacuum.r2356',    // X40 Ultra (new HW)

      /*// Z series
            'dreame.vacuum.r2285',
            'dreame.vacuum.r2288',
            'dreame.vacuum.r2290',
            'dreame.vacuum.r2291',
            'dreame.vacuum.r2295',
            'dreame.vacuum.r2296',
            'dreame.vacuum.r2297',

            // W series
            'dreame.vacuum.r2266',
            'dreame.vacuum.r2267',
            'dreame.vacuum.r2269',
            'dreame.vacuum.r2270',
            'dreame.vacuum.r2271',
            'dreame.vacuum.r2272',
            'dreame.vacuum.r2275',
            'dreame.vacuum.r2276',
            'dreame.vacuum.r2277',

            // F series
            'dreame.vacuum.r2301',
            'dreame.vacuum.r2302',
            'dreame.vacuum.r2303',
            'dreame.vacuum.r2305',
            'dreame.vacuum.r2306',
            'dreame.vacuum.r2307'*/
    ];

    if (NO_API_SUPPORT_MODELS.includes(this.deviceModel)) {
    // S20P1: DetergentLeft
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.DetergentLeft`, {
        type: 'state',
        common: {
          name: 'Detergent left',
          type: 'number',
          role: 'value.percent',
          unit: '%',
          read: true,
          write: false,
          def: 100,
          min: 0,
          max: 100,
          desc: `Calculated for ${this.deviceModel}`
        },
        native: {}
      });

      // S20P2: DetergentTimeLeft
      await this.adapter.setObjectNotExistsAsync(`${this.deviceId}.state.DetergentTimeLeft`, {
        type: 'state',
        common: {
          name: 'Detergent time left',
          type: 'number',
          role: 'value',
          unit: 'h',
          read: true,
          write: false,
          def: this.officialCycles,
          min: 0,
          max: this.officialCycles * 2,
          desc: `Calculated for ${this.deviceModel}`
        },
        native: {}
      });

      // Set compatibility state values
      await this.adapter.setStateAsync(`${this.deviceId}.state.DetergentLeft`, {
        val: percent,
        ack: true
      });

      await this.adapter.setStateAsync(`${this.deviceId}.state.DetergentTimeLeft`, {
        val: hoursLeft,
        ack: true
      });
    }

    // Update statistical values
    await this.updateStatistics();

    // Debug log
    this.adapter.log.debug(`[DETERGENT] States updated: ${percent}%, ${hoursLeft}h`);
  }


  async updateStatistics() {
    if (!this.hasDetergentTank) return;

    try {
      const tracking = this.detergentTracking;
      const now = Date.now();

      // Calculate days since first detergent usage
      const daysSinceFirstUse =
        (now - tracking.firstUseTime) / (1000 * 60 * 60 * 24);

      // Only calculate statistics after a meaningful runtime
      if (daysSinceFirstUse > 0.5) { // At least half a day
        const averageCyclesPerDay = tracking.totalCycles / daysSinceFirstUse;

        await this.adapter.setStateAsync(
          `${this.deviceId}.state.detergent.AverageCyclesPerDay`,
          {
            val: Math.round(averageCyclesPerDay * 10) / 10,
            ack: true
          }
        );

        // Estimate the next refill date
        const remainingCycles = this.calculateRemainingCycles(tracking.currentMode);
        if (averageCyclesPerDay > 0) {
          const daysUntilRefill = remainingCycles / averageCyclesPerDay;
          const refillDate = new Date(
            now + daysUntilRefill * 24 * 60 * 60 * 1000
          );

          await this.adapter.setStateAsync(
            `${this.deviceId}.state.detergent.EstimatedRefillDate`,
            {
              //val: refillDate.toISOString().split('T')[0], // YYYY-MM-DD
              val: refillDate.toISOString().split('T')[0].split('-').reverse().join('.'), // // DD-MM-YYYY
              ack: true
            }
          );
        }
      }

    } catch (error) {
      this.adapter.log.error(
        `[DetergentTracking] Statistics update error: ${error.message}`
      );
    }
  }

  // Check detergent level thresholds and emit warnings
  async checkWarnings() {
    if (!this.hasDetergentTank) return;

    const percent =
      (this.detergentTracking.currentMl / this.officialTankMl) * 100;
    const remainingCycles =
      this.calculateRemainingCycles(this.detergentTracking.currentMode);

    // Level-based warnings derived from cycle data
    if (percent <= 10 && !this.detergentTracking.lowLevelWarningSent) {
      this.adapter.log.warn(
        `[DetergentTracking] LOW LEVEL: ${Math.round(percent)}% remaining ` +
        `(~${remainingCycles} ${this.detergentTracking.currentMode} cycles)`
      );
      this.detergentTracking.lowLevelWarningSent = true;

      // Reset low-level warning if the level rises again
    } else if (percent > 15) {
      this.detergentTracking.lowLevelWarningSent = false;
    }

    if (percent <= 5 && !this.detergentTracking.criticalLevelWarningSent) {
      this.adapter.log.error(
        `[DetergentTracking] CRITICAL: Only ${Math.round(percent)}% remaining ` +
        `(~${remainingCycles} ${this.detergentTracking.currentMode} cycles) - REFILL SOON!`
      );
      this.detergentTracking.criticalLevelWarningSent = true;

      // Reset critical warning if the level recovers
    } else if (percent > 10) {
      this.detergentTracking.criticalLevelWarningSent = false;
    }

    // Empty tank warning
    if (percent <= 1) {
      this.adapter.log.error(
        '[DetergentTracking] EMPTY: Detergent tank is empty!'
      );
    }
  }

  // Handle a detergent refill action / refillType - full | half | quarter
  async handleDetergentRefill(refillType = 'full') {
    if (!this.hasDetergentTank) return 0;

    try {
      const tankCapacity = this.officialTankMl;
      const currentAmount = this.detergentTracking.currentMl;

      let refillAmountMl;
      switch (refillType) {
        case 'half':
          refillAmountMl = tankCapacity / 2;
          break;
        case 'quarter':
          refillAmountMl = tankCapacity / 4;
          break;
        case 'full':
        default:
          refillAmountMl = tankCapacity;
      }

      const newAmount = Math.min(
        tankCapacity,
        currentAmount + refillAmountMl
      );
      const refilledAmount = newAmount - currentAmount;

      if (refilledAmount > 0) {
        this.detergentTracking.currentMl = newAmount;
        this.detergentTracking.lastRefillTime = Date.now();

        // Reset warning flags after refill
        this.detergentTracking.lowLevelWarningSent = false;
        this.detergentTracking.criticalLevelWarningSent = false;

        await this.updateDetergentStates();
        await this.saveDetergentData();

        const remainingCycles =
          this.calculateRemainingCycles(this.detergentTracking.currentMode);

        this.adapter.log.info(
          `[DetergentTracking] REFILL: +${refilledAmount}ml ` +
          `| New: ${newAmount}ml/${tankCapacity}ml ` +
          `| ~${remainingCycles} ${this.detergentTracking.currentMode} cycles`
        );
      }

      return refilledAmount;

    } catch (error) {
      this.adapter.log.error(
        `[DetergentTracking] Refill error: ${error.message}`
      );
      return 0;
    }
  }

  // Detergent tracking data
  async saveDetergentData() {
    if (!this.hasDetergentTank) return;

    try {
      const dataToSave = {
        detergentTracking: this.detergentTracking,
        modelConfig: this.modelConfig,
        officialData: {
          tankMl: this.officialTankMl,
          cycles: this.officialCycles
        },
        lastSaved: Date.now(),
        version: '2.0' // Data format version
      };

	          await this.adapter.setObjectNotExistsAsync(
        `${this.deviceId}.state.detergent.PersistentData`,
        {
          type: 'state',
          common: {
            name: 'Persistent Detergent Data',
            type: 'string',
            role: 'json',
            read: true,
            write: false,
            def: '{}'
          },
          native: {}
        }
      );

      await this.adapter.setStateAsync(
        `${this.deviceId}.state.detergent.PersistentData`,
        {
          val: JSON.stringify(dataToSave),
          ack: true
        }
      );

    } catch (error) {
      this.adapter.log.error(
        `[DetergentTracking] Save error: ${error.message}`
      );
    }
  }

  // Restore persisted detergent tracking data
  async restorePersistedData() {
    if (!this.hasDetergentTank) return;

    try {
      const dataState = await this.adapter.getStateAsync(
        `${this.deviceId}.state.detergent.PersistentData`
      );

      if (dataState?.val) {
        try {
          const savedData = JSON.parse(dataState.val);

          // Version check
          if (savedData.version === '2.0') {
            // Data format
            this.detergentTracking = {
              ...this.detergentTracking,
              ...savedData.detergentTracking,
              lastUpdate: Date.now()
            };

            this.adapter.log.info(
              '[DetergentTracking] Data restored'
            );
          } else {
            // Legacy data format � migrate
            this.migrateLegacyData(savedData);
          }

          await this.updateDetergentStates();

        } catch (error) {
          this.adapter.log.warn(
            '[DetergentTracking] Failed to parse saved data'
          );
        }
      }

    } catch (error) {
      this.adapter.log.error(
        `[DetergentTracking] Restore error: ${error.message}`
      );
    }
  }

  // Migrate legacy detergent tracking data to the format
  migrateLegacyData(legacyData) {
    // Convert legacy fields to the tracking structure
    this.detergentTracking.totalCycles =
      legacyData.totalCycles || 0;
    this.detergentTracking.totalDetergentUsed =
      legacyData.totalDetergentUsed || 0;

    this.adapter.log.info(
      '[DetergentTracking] Migrated legacy data to format'
    );
  }

  // Cleanup hook for module shutdown
  async destroy() {
    if (!this.hasDetergentTank) return;

    try {
      await this.saveDetergentData();
      this.adapter.log.info(
        '[DetergentTracking] Module destroyed'
      );
    } catch (error) {
      this.adapter.log.error(
        `[DetergentTracking] Destroy error: ${error.message}`
      );
    }
  }
}

// Export everything
module.exports = WaterTrackingModule;
module.exports.WATER_TRACKING = WATER_TRACKING;
module.exports.DETERGENT_TRACKING = DETERGENT_TRACKING;
module.exports.CAPACITIES = CAPACITIES;
module.exports.MODEL_WATER_CAPACITIES = MODEL_WATER_CAPACITIES;
module.exports.MODELS_WITH_STATION = MODELS_WITH_STATION;
module.exports.DetergentTrackingModule = DetergentTrackingModule;