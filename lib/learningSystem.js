// ==================== LEARNING SYSTEM CONFIGURATION ====================
const LEARNING_CONFIG = {
  Enabled: true,                    // Enable or disable the learning system
  MinCoverageForLearn: 80,          // Minimum coverage (%) required to start learning
  MinCleaningsForConfidence: 3,     // Minimum number of cleanings required to reach high confidence
  MaxHistoryEntriesPerRoom: 50,     // Maximum number of historical entries stored per room
  MaxCoverageHistory: 100,          // Maximum number of coverage history records kept
  SaveIntervalSec: 30,              // Interval (in seconds) for persisting learning data
  AutoCompleteMinConfidence: 60,    // Minimum confidence (%) required for auto-completion
  EnableTimeContext: true,          // Consider time of day when generating recommendations
  DebugMode: false                  // Enable debug logging for the learning system
};

// ==================== DYNAMIC LEARNING SYSTEM ====================
// Generic room categories for intelligent defaults
const roomCategories = {
  EN: {
    wet_room: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Wet rooms need intensive cleaning',
      keywords: ['bath', 'bathroom', 'full bathroom', 'half bathroom', 'shower', 'shower room', 'toilet', 'restroom', 'washroom', 'powder room', 'guest bathroom', 'ensuite', 'ensuite bathroom', 'wc']
    },

    kitchen_area: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Kitchens have high dirt and moisture',
      keywords: ['kitchen', 'main kitchen', 'open kitchen', 'cooking area', 'cooking space', 'dining kitchen', 'kitchenette', 'pantry', 'scullery', 'galley']
    },

    living_area: {
      suction: 'standard',
      mopping: 'medium',
      typicalMode: 5120,
      description: 'Living areas medium usage',
      keywords: ['living room', 'living area', 'lounge', 'family room', 'sitting room', 'tv room', 'media room', 'great room', 'reception room']
    },

    sleeping_area: {
      suction: 'quiet',
      mopping: 'low',
      typicalMode: 5120,
      description: 'Sleeping areas need quiet cleaning',
      keywords: ['bedroom', 'master bedroom', 'guest room', 'guest bedroom', 'sleeping room', 'nursery bedroom']
    },

    work_area: {
      suction: 'standard',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Work areas mainly vacuuming',
      keywords: ['office', 'home office', 'study', 'study room', 'workspace', 'work room', 'desk room']
    },

    passage_area: {
      suction: 'standard',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Passage areas frequent vacuuming',
      keywords: ['corridor', 'hallway', 'hall', 'inner hall', 'passage', 'landing', 'stair hall', 'gallery']
    },

    entrance_area: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Entrance areas require intensive cleaning due to high foot traffic',
      keywords: ['entrance', 'main entrance', 'entryway', 'entry hall', 'entry foyer', 'foyer', 'vestibule', 'lobby', 'front door area', 'reception entrance']
    },

    outdoor_area: {
      suction: 'strong',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Outdoor areas high dirt',
      keywords: ['balcony', 'terrace', 'roof terrace', 'patio', 'deck', 'veranda', 'porch', 'courtyard', 'outdoor area']
    },

    storage_area: {
      suction: 'standard',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Storage areas rarely cleaned',
      keywords: ['storage', 'storage room', 'closet', 'walk-in closet', 'utility room', 'box room', 'cellar', 'basement storage', 'attic', 'loft storage']
    },

    kids_room: {
      suction: 'standard',
      mopping: 'medium',
      typicalMode: 5120,
      description: 'Kids rooms often have small messes',
      keywords: ['kids room', 'children room', 'childrens room', 'playroom', 'nursery', 'toddler room']
    },

    gym_room: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Gyms require intensive cleaning',
      keywords: ['gym', 'home gym', 'fitness room', 'fitness area', 'workout room', 'exercise room', 'training room']
    },

    garage: {
      suction: 'strong',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Garages often have coarse dirt and dust',
      keywords: ['garage', 'double garage', 'carport', 'workshop', 'bike garage']
    }
  },

  DE: {
    feuchtraum: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Feuchträume benötigen intensive Reinigung',
      keywords: ['bad', 'badezimmer', 'gäste wc', 'wc', 'toilette', 'dusche', 'duschraum', 'waschraum']
    },

    küchenbereich: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Küchen haben hohe Verschmutzung',
      keywords: ['küche', 'hauptküche', 'kochbereich', 'essküche', 'küchenzeile', 'küchenecke', 'speisekammer']
    },

    wohnbereich: {
      suction: 'standard',
      mopping: 'medium',
      typicalMode: 5120,
      description: 'Wohnbereiche mittlere Nutzung',
      keywords: ['wohnzimmer', 'wohnraum', 'aufenthaltsraum', 'stube', 'fernsehzimmer', 'tv zimmer']
    },

    schlafbereich: {
      suction: 'quiet',
      mopping: 'low',
      typicalMode: 5120,
      description: 'Schlafbereiche benötigen leise Reinigung',
      keywords: ['schlafzimmer', 'gästezimmer', 'elternschlafzimmer', 'ruhezimmer']
    },

    arbeitsbereich: {
      suction: 'standard',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Arbeitsbereiche hauptsächlich saugen',
      keywords: ['arbeitszimmer', 'büro', 'homeoffice', 'arbeitsraum', 'arbeitsplatz']
    },

    durchgangsbereich: {
      suction: 'standard',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Durchgangsbereiche häufige Reinigung',
      keywords: ['flur', 'korridor', 'diele', 'durchgang', 'zwischenflur', 'treppenflur', 'hausflur']
    },

    eingangsbereich: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Eingangsbereiche hohe Nutzung',
      keywords: ['eingang', 'eingangsbereich', 'haupteingang', 'nebeneingang', 'vorraum', 'empfang', 'windfang']
    },

    außenbereich: {
      suction: 'strong',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Außenbereiche hohe Verschmutzung',
      keywords: ['balkon', 'terrasse', 'dachterrasse', 'loggia', 'veranda', 'außenbereich', 'hof', 'innenhof']
    },

    speicherbereich: {
      suction: 'standard',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Speicher- und Lagerräume selten gereinigt',
      keywords: ['abstellraum', 'kammer', 'keller', 'speicher', 'lagerraum', 'abstellkammer', 'dachboden']
    },

    kinderzimmer: {
      suction: 'standard',
      mopping: 'medium',
      typicalMode: 5120,
      description: 'Kinderzimmer haben häufig kleine Verschmutzungen',
      keywords: ['kinderzimmer', 'spielzimmer', 'babyzimmer', 'jugendzimmer']
    },

    fitnessraum: {
      suction: 'strong',
      mopping: 'high',
      typicalMode: 5120,
      description: 'Fitnessräume benötigen intensive Reinigung',
      keywords: ['fitnessraum', 'sportraum', 'trainingsraum', 'fitnessbereich', 'kraftraum']
    },

    garage: {
      suction: 'strong',
      mopping: 'low',
      typicalMode: 5122,
      description: 'Garagen haben groben Schmutz',
      keywords: ['garage', 'doppelgarage', 'carport', 'werkstatt', 'fahrradgarage']
    }
  }
};

// ==================== NATURAL LANGUAGE COMMANDS ====================
// Natural language commands with predefined settings
const naturalCleaningCommands = {
  'EN': {
    // Standard commands
    'clean thoroughly': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 1 },
    'thorough clean': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 1 },
    'clean': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },

    // Repetition-related commands
    'clean twice': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'clean three times': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 3 },
    'clean multiple times': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },

    'clean thoroughly twice': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 2 },
    'thorough clean twice': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 2 },
    'deep clean twice': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 2 },
    'deep clean three times': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 3 },

    // Vacuuming with repetitions
    'vacuum twice': { mode: 5122, suction: 'standard', mopping: null, repetitions: 2 },
    'vacuum three times': { mode: 5122, suction: 'standard', mopping: null, repetitions: 3 },
    'vacuum multiple times': { mode: 5122, suction: 'standard', mopping: null, repetitions: 2 },
    'vacuum thoroughly twice': { mode: 5122, suction: 'strong', mopping: null, repetitions: 2 },

    // Mopping with repetitions
    'mop twice': { mode: 5121, suction: null, mopping: 'medium', repetitions: 2 },
    'mop three times': { mode: 5121, suction: null, mopping: 'medium', repetitions: 3 },
    'mop multiple times': { mode: 5121, suction: null, mopping: 'medium', repetitions: 2 },
    'wet mop twice': { mode: 5121, suction: null, mopping: 'high', repetitions: 2 },

    // Combined commands
    'vacuum and mop twice': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'sweep and mop twice': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'vacuum then mop twice': { mode: 5123, suction: 'standard', mopping: 'medium', repetitions: 2 },

    // Special intensity levels with repetitions
    'light cleaning twice': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 2 },
    'gentle clean twice': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 2 },
    'normal clean twice': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'intensive clean twice': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 2 },

    // Commands without repetitions
    'just quick vacuum': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'quick vacuum': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'quick mop': { mode: 5121, suction: null, mopping: 'medium', repetitions: 1 },
    'dry mop': { mode: 5121, suction: null, mopping: 'low', repetitions: 1 },
    'wet mop': { mode: 5121, suction: null, mopping: 'high', repetitions: 1 },
    'deep clean': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 1 },
    'light cleaning': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 1 },
    'gentle clean': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 1 },
    'normal clean': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'vacuum only': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'vacuum': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'mop only': { mode: 5121, suction: null, mopping: 'medium', repetitions: 1 },
    'mop': { mode: 5121, suction: null, mopping: 'medium', repetitions: 1 },
    'intensive clean': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 1 },
    'quick clean': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'deep clean corners': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 1 },
    'daily vacuum': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'daily clean': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'just dusting': { mode: 5121, suction: null, mopping: 'low', repetitions: 1 },
    'intensive vacuum and mop': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 1 },
    'light mop': { mode: 5121, suction: null, mopping: 'low', repetitions: 1 }
  },

  'DE': {
    // Standard commands
    'gründlich sauber machen': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 1 },
    'gründlich reinigen': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 1 },
    'sauber machen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'reinigen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'putzen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },

    // Repetition-related commands
    'zweimal reinigen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'dreimal reinigen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 3 },
    'mehrmals reinigen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },

    'zweimal gründlich reinigen': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 2 },
    'dreimal gründlich reinigen': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 3 },
    'zweimal tiefenreinigung': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 2 },
    'dreimal tiefenreinigung': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 3 },

    // Vacuuming with repetitions
    'zweimal saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 2 },
    'dreimal saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 3 },
    'mehrmals saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 2 },
    'zweimal staubsaugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 2 },
    'zweimal gründlich saugen': { mode: 5122, suction: 'strong', mopping: null, repetitions: 2 },

    // Mopping with repetitions
    'zweimal wischen': { mode: 5121, suction: null, mopping: 'medium', repetitions: 2 },
    'dreimal wischen': { mode: 5121, suction: null, mopping: 'medium', repetitions: 3 },
    'mehrmals wischen': { mode: 5121, suction: null, mopping: 'medium', repetitions: 2 },
    'zweimal nass wischen': { mode: 5121, suction: null, mopping: 'high', repetitions: 2 },

    // Combined commands
    'zweimal saugen und wischen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'zweimal staubsaugen und wischen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'zweimal wischen nach saugen': { mode: 5123, suction: 'standard', mopping: 'medium', repetitions: 2 },

    // Special intensity levels with repetitions
    'zweimal leichte reinigung': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 2 },
    'zweimal sanft reinigen': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 2 },
    'zweimal normal reinigen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 2 },
    'zweimal intensiv reinigen': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 2 },

    // Commands without repetitions
    'nur schnell saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'schnell saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'schnell wischen': { mode: 5121, suction: null, mopping: 'medium', repetitions: 1 },
    'trocken wischen': { mode: 5121, suction: null, mopping: 'low', repetitions: 1 },
    'nass wischen': { mode: 5121, suction: null, mopping: 'high', repetitions: 1 },
    'tiefenreinigung': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 1 },
    'leichte reinigung': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 1 },
    'sanft reinigen': { mode: 5120, suction: 'quiet', mopping: 'low', repetitions: 1 },
    'normal reinigen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'nur saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'staubsaugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'nur wischen': { mode: 5121, suction: null, mopping: 'medium', repetitions: 1 },
    'wischen': { mode: 5121, suction: null, mopping: 'medium', repetitions: 1 },
    'intensiv reinigen': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 1 },
    'schnelle reinigung': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'intensiv saugen und wischen': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 1 },
    'komplett sauber machen': { mode: 5120, suction: 'strong', mopping: 'high', repetitions: 1 },
    'gründlich saugen': { mode: 5122, suction: 'strong', mopping: null, repetitions: 1 },
    'täglich saugen': { mode: 5122, suction: 'standard', mopping: null, repetitions: 1 },
    'täglich reinigen': { mode: 5120, suction: 'standard', mopping: 'medium', repetitions: 1 },
    'leicht wischen': { mode: 5121, suction: null, mopping: 'low', repetitions: 1 },
    'ecken intensiv reinigen': { mode: 5120, suction: 'turbo', mopping: 'high', repetitions: 1 },
    'nur staubwischen': { mode: 5121, suction: null, mopping: 'low', repetitions: 1 }
  }
};

// ==================== DETAILED-INFORMATION-CONTEXT KEYWORDS ====================

const detailKeywords = {
  'EN': [
    'detailed', 'in-depth', 'analysis', 'report',
    'comprehensive', 'complete', 'full', 'thorough',
    'professional', 'expert', 'advanced', 'extended'
  ],
  'DE': [
    'detailliert', 'ausführlich', 'analyse', 'bericht',
    'umfassend', 'vollständig', 'voll', 'gründlich',
    'professionell', 'experte', 'erweitert', 'ausgedehnt'
  ]
};

const connectors = {
  'EN': ' Also, ',
  'DE': ' Außerdem ',
  'FR': ' En outre, ',
  'ES': ' Además, ',
  'IT': ' Inoltre, ',
  'default': ' '
};

// ==================== FLEXIBLE KEYWORD-BASED COMMANDS ====================
const learningKeywords = {
  'EN': {
    'show_learning': ['learned', 'learn', 'knowledge', 'know', 'understood'],
    'show_stats': ['statistics', 'stats', 'numbers', 'data', 'info'],
    'room_stats': ['often', 'frequency', 'times', 'history', 'cleaned', ...detailKeywords['EN']],
    'recommendation': ['recommend', 'suggest', 'advise', 'best', 'optimal'],
    'clear_learning': ['clear', 'delete', 'erase', 'forget', 'reset'],
    'reset_learning': ['reset', 'restart', 'reboot', 'reload', 'refresh'],
    'learned_rooms': ['rooms', 'spaces', 'areas', 'known', 'familiar'],
    'confidence_info': ['confidence', 'certainty', 'trust', 'reliability'],
    'optimal_settings': ['settings', 'configuration', 'setup', 'options'],
    'room_detection': ['detect', 'identify', 'recognize', 'determine'],
    'detection_info': ['detection', 'recognition', 'how detect', 'method'],
    'typical_repetitions': ['repetitions', 'repeats', 'times', 'passes', 'typical'],
    'repetitions_info': ['how many', 'number of', 'count', 'how often'],
    'repeat_info': ['repeat', 'again', 'another', 'more', 'redo']
  },
  'DE': {
    'show_learning': ['gelernt', 'lernte', 'kennt', 'wei�', 'verstanden'],
    'show_stats': ['statistik', 'statistiken', 'zahlen', 'daten'],
    'room_stats': ['oft', 'häufigkeit', 'mal', 'verlauf', 'gereinigt', 'history', 'historie', ...detailKeywords['DE']],
    'recommendation': ['empfehlung', 'vorschlag', 'rat', 'beste', 'optimal'],
    'clear_learning': ['löschen', 'entfernen', 'vergessen', 'zurücksetzen'],
    'reset_learning': ['zurücksetzen', 'neu starten', 'reboot', 'neu laden'],
    'learned_rooms': ['räume', 'bereiche', 'bekannte', 'vertraut'],
    'confidence_info': ['vertrauen', 'sicherheit', 'zuverlässigkeit'],
    'optimal_settings': ['einstellungen', 'konfiguration', 'setup'],
    'room_detection': ['erkennen', 'identifizieren', 'bestimmen'],
    'detection_info': ['erkennung', 'identifikation', 'wie erkennen'],
    'typical_repetitions': ['wiederholungen', 'wiederholen', 'mal', 'typisch'],
    'repetitions_info': ['wie viele', 'anzahl', 'menge', 'wie oft'],
    'repeat_info': ['wiederholen', 'nochmal', 'erneut', 'weitere']
  }
};

// ==================== ROBOTER-CONTEXT KEYWORDS ====================
const robotContexts = {
  'EN': {
    'robot': ['robot', 'robotic', 'robo', 'dreame'],
    'vacuum': ['vacuum', 'suction', 'dust', 'cleaner', 'cleaning'],
    'action': ['mop', 'sweep', 'scrub', 'wipe', 'clean']
  },
  'DE': {
    'robot': ['roboter', 'roboter-', 'dreame'],
    'vacuum': ['staubsauger', 'sauger', 'staub', 'reiniger', 'reinigung'],
    'action': ['wischen', 'wisch', 'saugen', 'kehren', 'reinigen']
  }
};

// ==================== LEARNING SYSTEM CLASS ====================
class LearningSystem {
  constructor(adapter, deviceId, UserLang = 'EN', config = {}) {
    this.adapter = adapter;
    this.deviceId = deviceId;
    this.UserLang = UserLang;
    this.config = { ...LEARNING_CONFIG, ...config };

    // Data structures
    this.roomProfiles = {};           // Room learning profiles
    this.currentSession = null;       // Current cleaning session
    this.statistics = {               // System statistics
      totalCleaningsTracked: 0,
      successfulLearnings: 0,
      totalRoomsLearned: 0,
      lastSaveTime: 0,
      lastProfileHash: '',
      initialized: false
    };

    // External constants (set externally)
    this.constants = {
      suctionSynonyms: null,
      moppingSynonyms: null,
      AlexaRoomsNameSynonyms: null,
      AlexaRoomsName: null,
      Alexarooms: null,
      suctionLevels: null,
      moppingLevels: null,
	 AlexacleanModes: null
    };

    // AlexaInfo for messages (loaded in initialize())
    //this.AlexaInfo = null;

    this.log = adapter.log;

    // Session management
    this.cleanupInterval = null;
    this.saveInterval = null;

	        // Timer references
    this.saveInterval = null;
    this.cleanupInterval = null;
    this.recommendationInterval = null;
    this.monitoringActive = false;
  }

  // ==================== INITIALIZATION ====================
  async initialize(constants) {
    try {
      this.log.info('[LEARNING-SYSTEM] Initializing...');

      // Store external constants
      this.constants = constants;

      // Load AlexaInfo from constants
      if (constants.AlexaInfo) {
        this.AlexaInfo = constants.AlexaInfo;
        //this.log.info('[LEARNING-SYSTEM] AlexaInfo loaded from constants');
      }

      // Load saved data
      await this.loadPersistentData();

      // Create necessary states
      await this.createStates();

	          // 2. Config LADEN (aus States)
      await this.loadConfigFromStates();  // ? Jetzt erst!

      // Start periodic tasks
      this.startLearrningMonitoring();

      this.statistics.initialized = true;

      // Initialization message
      const lang = this.UserLang || 'EN';
      if (this.AlexaInfo[lang] && this.AlexaInfo[lang][813]) {
        this.log.info(`[LEARNING-SYSTEM] ${this.AlexaInfo[lang][813]}`);
      } else {
        this.log.info('[LEARNING-SYSTEM] Initialized successfully');
      }

      return true;

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Initialization failed: ${error.message}`);
      this.statistics.initialized = false;
      return false;
    }
  }

  // ==================== NATURAL LANGUAGE PROCESSING ====================
  processNaturalCommand(command, language) {
    const naturalCommands = naturalCleaningCommands[language] || naturalCleaningCommands['EN'];
    const commandLower = command.toLowerCase();

    // First: Check for exact matches in natural commands
    for (const [naturalCmd, settings] of Object.entries(naturalCommands)) {
      if (commandLower.includes(naturalCmd.toLowerCase())) {
        // Extract explicit numbers (e.g., "clean 4 times")
        const explicitRepetitions = this.extractExplicitRepetitions(commandLower, language);

        const result = {
          ...settings,
          found: true,
          naturalCommand: naturalCmd
        };

        // Override repetitions if explicit number found
        if (explicitRepetitions !== null) {
          result.repetitions = explicitRepetitions;
          result.repetitionsSource = 'explicit_number';
        } else {
          result.repetitionsSource = 'natural_command';
        }

        return result;
      }
    }

    // Second: Try to extract repetitions from general commands
    const extractedRepetitions = this.extractRepetitionsFromCommand(command, language);
    if (extractedRepetitions > 1) {
      // Try to detect mode from command
      const detectedMode = this.detectModeFromCommand(command, language);
      const detectedSuction = this.detectSuctionFromCommand(command, language);
      const detectedMopping = this.detectMoppingFromCommand(command, language);

      return {
        mode: detectedMode || 5120,
        suction: detectedSuction || 'standard',
        mopping: detectedMopping || 'medium',
        repetitions: extractedRepetitions,
        found: true,
        repetitionsSource: 'extracted'
      };
    }

    return { found: false };
  }

  // Extract explicit numbers like "clean 4 times"
  extractExplicitRepetitions(command, language) {
    const patterns = {
      'EN': [
        { pattern: /(\d+)\s+times?\b/i, group: 1 },
        { pattern: /(\d+)\s+repetitions?\b/i, group: 1 },
        { pattern: /(\d+)\s+passes?\b/i, group: 1 }
      ],
      'DE': [
        { pattern: /(\d+)\s+mal\b/i, group: 1 },
        { pattern: /(\d+)\s+wiederholungen?\b/i, group: 1 },
        { pattern: /(\d+)\s+durchgänge?\b/i, group: 1 }
      ]
    };

    const langPatterns = patterns[language] || patterns['EN'];

    for (const { pattern, group } of langPatterns) {
      const match = command.match(pattern);
      if (match && match[group]) {
        const repetitions = parseInt(match[group]);
        if (repetitions > 0 && repetitions <= 10) {
          return repetitions;
        }
      }
    }

    return null;
  }

  // Extract repetitions from command (general)
  extractRepetitionsFromCommand(command, language) {
    const patterns = {
      'EN': [
        { pattern: /(\d+)\s+times?\b/i, multiplier: 1 },
        { pattern: /twice\b/i, multiplier: 2 },
        { pattern: /three\s+times?\b/i, multiplier: 3 },
        { pattern: /multiple\s+times?\b/i, multiplier: 2 },
        { pattern: /several\s+times?\b/i, multiplier: 3 },
        { pattern: /few\s+times?\b/i, multiplier: 2 },
        { pattern: /repeatedly\b/i, multiplier: 2 }
      ],
      'DE': [
        { pattern: /(\d+)\s+mal\b/i, multiplier: 1 },
        { pattern: /einmal\b/i, multiplier: 1 },
        { pattern: /eins?\s+mal\b/i, multiplier: 1 },
        { pattern: /zweimal\b/i, multiplier: 2 },
        { pattern: /zwei\s+mal\b/i, multiplier: 2 },
        { pattern: /dreimal\b/i, multiplier: 3 },
        { pattern: /drei\s+mal\b/i, multiplier: 3 },
        { pattern: /mehrmals\b/i, multiplier: 2 },
        { pattern: /mehrfach\b/i, multiplier: 2 },
        { pattern: /h�ufig\b/i, multiplier: 2 },
        { pattern: /wiederholt\b/i, multiplier: 2 }
      ]
    };

    const langPatterns = patterns[language] || patterns['EN'];
    const commandLower = command.toLowerCase();

    // First check for explicit numbers
    for (const { pattern, multiplier } of langPatterns) {
      const match = commandLower.match(pattern);
      if (match) {
        if (match[1]) {
        // Explicit number found (e.g., "3 times")
          const repetitions = parseInt(match[1]);
          if (repetitions > 0 && repetitions <= 10) {
            return repetitions;
          }
        } else {
        // Word found (e.g., "twice", "zweimal")
          return multiplier;
        }
      }
    }

    return 1; // Default
  }

  detectModeFromCommand(command, language) {
    const commandLower = command.toLowerCase();

    if (commandLower.includes('vacuum') || commandLower.includes('sweep') ||
        commandLower.includes('saugen') || commandLower.includes('staubsaugen')) {
      if (commandLower.includes('mop') || commandLower.includes('wisch')) {
        return 5120; // Both
      }
      return 5122; // Vacuum only
    }

    if (commandLower.includes('mop') || commandLower.includes('wisch')) {
      if (commandLower.includes('after') || commandLower.includes('nach')) {
        return 5123; // Mop after vacuum
      }
      return 5121; // Mop only
    }

    return 5120; // Default to both
  }

  detectSuctionFromCommand(command, language) {
    const commandLower = command.toLowerCase();
    const suctionSynonyms = this.constants.suctionSynonyms?.[language] ||
                           this.constants.suctionSynonyms?.['EN'] || {};

    for (const [synonym, level] of Object.entries(suctionSynonyms)) {
      if (commandLower.includes(synonym.toLowerCase())) {
        return level;
      }
    }

    // Heuristic detection
    if (commandLower.includes('quiet') || commandLower.includes('leise') ||
        commandLower.includes('gentle') || commandLower.includes('light')) {
      return 'quiet';
    }

    if (commandLower.includes('strong') || commandLower.includes('stark') ||
        commandLower.includes('powerful') || commandLower.includes('intense')) {
      return 'strong';
    }

    if (commandLower.includes('turbo') || commandLower.includes('maximum') ||
        commandLower.includes('max') || commandLower.includes('boost')) {
      return 'maximum';
    }

    return 'standard';
  }

  detectMoppingFromCommand(command, language) {
    const commandLower = command.toLowerCase();
    const moppingSynonyms = this.constants.moppingSynonyms?.[language] ||
                           this.constants.moppingSynonyms?.['EN'] || {};

    for (const [synonym, level] of Object.entries(moppingSynonyms)) {
      if (commandLower.includes(synonym.toLowerCase())) {
        return level;
      }
    }

    // Heuristic detection
    if (commandLower.includes('low') || commandLower.includes('niedrig') ||
        commandLower.includes('dry') || commandLower.includes('trocken') ||
        commandLower.includes('light')) {
      return 'low';
    }

    if (commandLower.includes('high') || commandLower.includes('hoch') ||
        commandLower.includes('wet') || commandLower.includes('nass') ||
        commandLower.includes('soaked') || commandLower.includes('intense')) {
      return 'high';
    }

    return 'medium';
  }

  // ==================== SESSION MANAGEMENT ====================
  startSession(source = 'mqtt', initialSettings = null) {
    if (this.currentSession && this.currentSession.isActive) {
      this.log.info('[LEARNING-SYSTEM] Session already active');
      return;
    }
    const settings = initialSettings || {};

    this.currentSession = {
      isActive: true,
      startTime: Date.now(),
      source: source,
      sessionId: this.generateSessionId(),
      settings: initialSettings || {},
      roomProgress: {},
      learnedRooms: new Set(),
      mqttData: {
        mode: settings.mode || null,
        suction: settings.suction || null,
        water: settings.water || null
      }
    };

    // Start monitoring timers when the session begins
    this.startLearrningMonitoring();

    this.log.info(`[LEARNING-SYSTEM] Session started (${source})`);
    this.updateSessionState();
  }

  stopSession() {
    if (!this.currentSession || !this.currentSession.isActive) {
      return;
    }

    const duration = Date.now() - this.currentSession.startTime;
    const roomsCleaned = Object.keys(this.currentSession.roomProgress).length;
    const roomsLearned = this.currentSession.learnedRooms.size;

    this.log.info(`[LEARNING-SYSTEM] Session ended: ${Math.round(duration / 1000)}s, ` +
                  `rooms: ${roomsCleaned}, learned: ${roomsLearned}`);

    // Update statistics
    this.statistics.totalCleaningsTracked++;

    // Save session summary
    this.saveSessionSummary(duration, roomsCleaned, roomsLearned);

    // End session
    this.currentSession.isActive = false;

    // Stop monitoring timers when the session ends
    this.stopLearrningMonitoring();

    // Save data one final time
    this.saveData();

    this.updateSessionState();

    // Recalculate recommendations
    this.calculateAllRecommendations();
  }

  // Set repetitions for specific room
  setRepetitionsForRoom(roomName, repetitions, source = 'command') {
    if (!this.currentSession || !this.currentSession.isActive) {
      this.log.warn(`[LEARNING-SYSTEM] Cannot set repetitions: no active session`);
      return false;
    }

    if (!this.currentSession.roomProgress[roomName]) {
      this.currentSession.roomProgress[roomName] = {
        repetitions: repetitions,
        maxCoverage: 0,
        totalArea: 0,
        lastUpdate: Date.now(),
        repetitionsSource: source
      };
    } else {
      this.currentSession.roomProgress[roomName].repetitions = repetitions;
      this.currentSession.roomProgress[roomName].repetitionsSource = source;
    }

    this.log.info(`[LEARNING-SYSTEM] Set ${repetitions} repetitions for ${roomName} (source: ${source})`);

    // Log if repetitions are unusually high
    if (repetitions > 3) {
      this.log.info(`[LEARNING-SYSTEM] High repetitions detected: ${repetitions} for ${roomName}`);
    }

    return true;
  }

  // ==================== UPDATE SESSION FROM MQTT ====================
  // Function to update the current session with new data received from MQTT
  updateSessionFromMQTT(data) {
    if (!this.currentSession || !this.currentSession.isActive) {
      this.log.debug('[LEARNING-SYSTEM] Cannot update MQTT: no active session');
      return;
    }

    // Update session properties with the new MQTT data
    if (data.mode !== undefined && data.mode !== null) {
      this.currentSession.mqttData.mode = data.mode;
      this.currentSession.settings.mode = data.mode;
    }
    if (data.suction !== undefined && data.suction !== null) {
      this.currentSession.mqttData.suction = data.suction;
		 this.currentSession.settings.suction = data.suction;
    }
    if (data.water !== undefined && data.water !== null) {
      this.currentSession.mqttData.water = data.water;
		 this.currentSession.settings.water = data.water;
    }

    this.log.info(`[LEARNING-SYSTEM] MQTT updated: mode=${data.mode}, suction=${data.suction}, water=${data.water}`);
  }

  async updateRoomProgress(roomName, coverage, cleanedArea, repetitions = null) {
    if (!this.currentSession || !this.currentSession.isActive) {
      return;
    }

    if (!this.currentSession.roomProgress[roomName]) {
      this.currentSession.roomProgress[roomName] = {
        maxCoverage: 0,
        totalArea: 0,
        lastUpdate: Date.now(),
        repetitions: repetitions || 1
      };
    }

    const progress = this.currentSession.roomProgress[roomName];
    progress.maxCoverage = Math.max(progress.maxCoverage, coverage);
    progress.totalArea += cleanedArea;
    progress.lastUpdate = Date.now();

    // Update repetitions if provided
    if (repetitions !== null) {
      progress.repetitions = repetitions;
    }

    // Trigger learning if coverage reaches threshold
    if (coverage >= this.config.MinCoverageForLearn &&
        !this.currentSession.learnedRooms.has(roomName)) {

      await this.learnFromRoom(roomName, coverage, cleanedArea, progress.repetitions);
    }
  }

  // ==================== SESSION MANAGEMENT ====================
  async startLearningSession() {
    try {
      if (this.config.DebugMode) {
        this.log.info('[LEARNING-SYSTEM] Starting learning session...');
      }

      // Wait for a short period to allow states to update
      await new Promise(resolve => setTimeout(resolve, 800));

      // DEBUG 1: Which states actually exist?
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] Device ID: ${this.deviceId}`);
        this.log.info(`[DEBUG] Looking for states:`);
        this.log.info(`[DEBUG] 1. ${this.deviceId}.state.CleaningMode`);
        this.log.info(`[DEBUG] 2. ${this.deviceId}.state.SuctionLevel`);
        this.log.info(`[DEBUG] 3. ${this.deviceId}.state.WaterVolume`);
      }

      // Retrieve current device states
      const modeState = await this.adapter.getStateAsync(`${this.deviceId}.state.CleaningMode`);
      const suctionState = await this.adapter.getStateAsync(`${this.deviceId}.state.SuctionLevel`);
      const waterState = await this.adapter.getStateAsync(`${this.deviceId}.state.WaterVolume`);

      // DEBUG 2: What did we get?
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] Mode State: ${JSON.stringify(modeState)}`);
        this.log.info(`[DEBUG] Suction State: ${JSON.stringify(suctionState)}`);
        this.log.info(`[DEBUG] Water State: ${JSON.stringify(waterState)}`);

        this.log.info(`[DEBUG] Mode State.val: ${modeState?.val} (type: ${typeof modeState?.val})`);
        this.log.info(`[DEBUG] Suction State.val: ${suctionState?.val} (type: ${typeof suctionState?.val})`);
        this.log.info(`[DEBUG] Water State.val: ${waterState?.val} (type: ${typeof waterState?.val})`);

        // DEBUG 3: Check if constants exist
        this.log.info(`[DEBUG] DreameCleaningMode exists: ${!!this.constants?.DreameCleaningMode}`);
        this.log.info(`[DEBUG] DreameSuctionLevel exists: ${!!this.constants?.DreameSuctionLevel}`);
        this.log.info(`[DEBUG] DreameWaterVolume exists: ${!!this.constants?.DreameWaterVolume}`);

        if (this.constants?.DreameCleaningMode) {
          this.log.info(`[DEBUG] DreameCleaningMode keys: ${Object.keys(this.constants.DreameCleaningMode)}`);
          if (this.constants.DreameCleaningMode[this.UserLang]) {
            this.log.info(`[DEBUG] DreameCleaningMode[${this.UserLang}]: ${JSON.stringify(this.constants.DreameCleaningMode[this.UserLang])}`);
          }
        }
      }

      // Parse device state values using internal parsers
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] Calling parseCleaningMode("${modeState?.val}")`);
      }
      const mode = this.parseCleaningMode(modeState?.val);
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] parseCleaningMode result: ${mode} (type: ${typeof mode})`);
      }

      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] Calling parseSuctionLevel("${suctionState?.val}")`);
      }
      const suction = this.parseSuctionLevel(suctionState?.val);
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] parseSuctionLevel result: ${suction} (type: ${typeof suction})`);
      }

      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] Calling parseWaterVolume("${waterState?.val}")`);
      }
      const water = this.parseWaterVolume(waterState?.val);
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] parseWaterVolume result: ${water} (type: ${typeof water})`);
      }

      // DEBUG 4: Check for null/undefined
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] Mode is null/undefined: ${mode === null || mode === undefined}`);
        this.log.info(`[DEBUG] Suction is null/undefined: ${suction === null || suction === undefined}`);
        this.log.info(`[DEBUG] Water is null/undefined: ${water === null || water === undefined}`);
      }

      // FALLBACK: If any value is null/undefined, use defaults
      const finalMode = (mode !== null && mode !== undefined) ? mode : 5120;
      const finalSuction = (suction !== null && suction !== undefined) ? suction : 1;
      const finalWater = (water !== null && water !== undefined) ? water : 2;

      if (this.config.DebugMode) {
        this.log.info(`[DEBUG] Final values after fallback: mode=${finalMode}, suction=${finalSuction}, water=${finalWater}`);
      }

      // Start a new learning session with the parsed values
      this.startSession('device_properties', {
        mode: finalMode,
        suction: finalSuction,
        water: finalWater
      });

      if (this.config.DebugMode) {
        this.log.info(`[LEARNING-SYSTEM] Learning session started: mode=${finalMode}, suction=${finalSuction}, water=${finalWater}`);
      }
      return true;

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Learning session failed: ${error.message}`);
      if (this.config.DebugMode) {
        this.log.error(`[LEARNING-SYSTEM] Stack trace: ${error.stack}`);
      }
      return false;
    }
  }

  // ==================== PARSER FUNCTIONS ====================
  // Function to parse cleaning mode property
  parseCleaningMode(modeValue) {
    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseCleaningMode] Input: "${modeValue}" (type: ${typeof modeValue})`);
    }
    const result = this.parseDeviceProperty(
      modeValue,
      this.constants?.DreameCleaningMode, // Map for cleaning modes
      5120 // Default cleaning mode value
    );
    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseCleaningMode] Result: ${result}`);
    }
    return result;
  }

  // Function to parse suction level property
  parseSuctionLevel(suctionValue) {
    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseSuctionLevel] Input: "${suctionValue}" (type: ${typeof suctionValue})`);
    }
    const result = this.parseDeviceProperty(
      suctionValue,
      this.constants?.DreameSuctionLevel, // Map for suction levels
      1 // Default suction level: Standard
    );
    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseSuctionLevel] Result: ${result}`);
    }
    return result;
  }

  // Function to parse water volume property
  parseWaterVolume(waterValue) {
    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseWaterVolume] Input: "${waterValue}" (type: ${typeof waterValue})`);
    }
    const result = this.parseDeviceProperty(
      waterValue,
      this.constants?.DreameWaterVolume, // Map for water volume
      2 // Default water volume: Medium
    );
    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseWaterVolume] Result: ${result}`);
    }
    return result;
  }

  // Function to parse a generic device property value
  parseDeviceProperty(value, propertyMap, defaultValue = null) {
    const language = this.UserLang || 'EN';

    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseDeviceProperty] START`);
      this.log.info(`[DEBUG parseDeviceProperty] Input value: "${value}" (type: ${typeof value})`);
      this.log.info(`[DEBUG parseDeviceProperty] Default value: ${defaultValue}`);
      this.log.info(`[DEBUG parseDeviceProperty] Property map exists: ${!!propertyMap}`);
      this.log.info(`[DEBUG parseDeviceProperty] Language: ${language}`);
    }

    if (value === undefined || value === null || value === '') {
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG parseDeviceProperty] Value is empty, returning default: ${defaultValue}`);
      }
      return defaultValue;
    }

    // 1. Try parsing as a number
    const num = parseInt(value);
    if (this.config.DebugMode) {
      this.log.info(`[DEBUG parseDeviceProperty] Parsed as number: ${num} (isNaN: ${isNaN(num)})`);
    }

    if (!isNaN(num) && propertyMap && propertyMap[language] &&
      propertyMap[language][num] !== undefined) {
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG parseDeviceProperty] Found in propertyMap[${language}][${num}]: ${propertyMap[language][num]}`);
        this.log.info(`[DEBUG parseDeviceProperty] Returning number: ${num}`);
      }
      return num; // Return parsed number if valid
    } else {
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG parseDeviceProperty] Not found as number in map or map missing`);
      }
    }

    // 2. Try parsing as a string
    if (typeof value === 'string' && propertyMap && propertyMap[language]) {
      const cleanText = value.trim().toLowerCase();
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG parseDeviceProperty] Checking as string: "${cleanText}"`);
      }

      const langMap = propertyMap[language];
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG parseDeviceProperty] Language map entries: ${Object.entries(langMap).length}`);
      }

      // Exact match search
      const exactEntry = Object.entries(langMap)
        .find(([key, val]) => {
          const match = val.toLowerCase() === cleanText;
          if (match && this.config.DebugMode) {
            this.log.info(`[DEBUG parseDeviceProperty] Exact match found: "${val}" -> key ${key}`);
          }
          return match;
        });

      if (exactEntry) {
        const result = parseInt(exactEntry[0]);
        if (this.config.DebugMode) {
          this.log.info(`[DEBUG parseDeviceProperty] Returning from exact match: ${result}`);
        }
        return result;
      }

      // Partial match search (for longer texts)
      if (cleanText.length > 3) {
        const partialEntry = Object.entries(langMap)
          .find(([key, val]) => {
            const valLower = val.toLowerCase();
            const contains = valLower.includes(cleanText) || cleanText.includes(valLower);
            if (contains && this.config.DebugMode) {
              this.log.info(`[DEBUG parseDeviceProperty] Partial match: "${val}" contains "${cleanText}"`);
            }
            return contains;
          });

        if (partialEntry) {
          const result = parseInt(partialEntry[0]);
          if (this.config.DebugMode) {
            this.log.info(`[DEBUG parseDeviceProperty] Returning from partial match: ${result}`);
          }
          return result;
        }
      }

      if (this.config.DebugMode) {
        this.log.info(`[DEBUG parseDeviceProperty] No string match found`);
      }
    } else {
      if (this.config.DebugMode) {
        this.log.info(`[DEBUG parseDeviceProperty] Cannot check as string: value is ${typeof value}, propertyMap: ${!!propertyMap}, propertyMap[language]: ${!!propertyMap?.[language]}`);
      }
    }

    // 3. Fallback: Log unknown value and return default value
    if (this.config.DebugMode) {
      this.log.warn(`[DEBUG parseDeviceProperty] Unknown value "${value}", returning default: ${defaultValue}`);
    }
    return defaultValue;
  }

  // ==================== UPDATE ROOM COVERAGE ====================
  async updateRoomCoverage(roomName, coverage, cleanedArea) {
    try {
    // Abort if the learning system is disabled or if statistics have not been initialized yet.
      if (!this.config.Enabled || !this.statistics.initialized) {
        return false;
      }

      // Only allow updates if the room was already learned during the current session.
      if (!this.currentSession?.learnedRooms?.has(roomName)) {
        return false; // Not learned in this session -> no update allowed
      }

      // Normalize room name
      const normalizedRoom = this.normalizeRoomName(roomName);

      // Retrieve the existing room profile
      const profile = this.roomProfiles[normalizedRoom];

      // If the room profile does not exist, abort safely
      if (!profile) return false;

      // Store old coverage value for logging/debugging purposes
      const oldCoverage = profile.lastCoverage;


      // UPDATE ONLY COVERAGE AND AREA VALUES
      profile.lastCoverage = coverage;     // Latest measured coverage (%)
      profile.lastArea = cleanedArea;      // Latest cleaned area (m�)
      profile.lastCleaned = Date.now();    // Update timestamp

      // Add the new coverage value to the history array.
      profile.coverageHistory.push(coverage);

      if (profile.coverageHistory.length > this.config.MaxCoverageHistory) {
      // Limit the history size to avoid uncontrolled memory growth: Keep only the most recent N entries
        profile.coverageHistory = profile.coverageHistory.slice(
          -this.config.MaxCoverageHistory
        );
      }

      // Log the update for transparency and debugging
      if (this.config.DebugMode) {
        this.log.info(`[LEARNING-SYSTEM] Updated ${normalizedRoom}: coverage ${oldCoverage.toFixed(1)}% -> ${coverage.toFixed(1)}%`);
      }

      // Persist updated data to storage
      this.saveData();

      return true;

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Update failed: ${error.message}`);
      return false;
    }
  }

  // ==================== LEARNING FROM CLEANINGS ====================
  async learnFromRoom(roomName, coverage, cleanedArea, repetitions = 1, mode = null, suctionNum = null, waterNum = null) {
    try {
      if (!this.config.Enabled || !this.statistics.initialized) {
        return false;
      }

      // IMPORTANT: Check whether we have already learned from this room during the current session
      if (this.currentSession && this.currentSession.learnedRooms.has(roomName)) {
        if (this.config.DebugMode) {
          this.log.info(`[LEARNING-SYSTEM] Already learned from ${roomName} in this session, skipping...`);
        }
        return false; // Already learned from this room
      }

      if (coverage < this.config.MinCoverageForLearn) {
        const lang = this.UserLang || 'EN';
        this.log.info(`[LEARNING-SYSTEM] ${this.AlexaInfo[lang][817]}`);
        return false;
      }

      if (!this.currentSession || !this.currentSession.isActive) {
        this.log.info('[LEARNING-SYSTEM] Skip learning: no active session');
        return false;
      }

      if (this.currentSession.learnedRooms.has(roomName)) {
        this.log.info(`[LEARNING-SYSTEM] Already learned from ${roomName}`);
        return false;
      }

      // Normalize room name
      const normalizedRoom = this.normalizeRoomName(roomName);

      // Use provided parameters OR session data
      const effectiveMode = mode !== null ? mode : this.currentSession.mqttData.mode;
      const effectiveSuctionNum = suctionNum !== null ? suctionNum : this.currentSession.mqttData.suction;
      const effectiveWaterNum = waterNum !== null ? waterNum : this.currentSession.mqttData.water;

      if (effectiveMode === null || effectiveMode === undefined) {
        this.log.info('[LEARNING-SYSTEM] Skip learning: no mode data');
        return false;
      }

      // Convert numeric values to text labels
      const suction = effectiveSuctionNum !== null ?
        this.convertSuctionLevel(effectiveSuctionNum, this.UserLang) : null;
      const water = effectiveWaterNum !== null ?
        this.convertWaterVolume(effectiveWaterNum, this.UserLang) : null;

      // DEBUG LOG
      this.log.info(`[LEARNING-SYSTEM] Learning parameters: mode=${effectiveMode}, ` +
                 `suctionNum=${effectiveSuctionNum}->${suction}, ` +
                 `waterNum=${effectiveWaterNum}->${water}, ` +
                 `coverage=${coverage}%, room=${normalizedRoom}`);

      // Learning
      const learned = await this.learnCleaningSettings(
        normalizedRoom,
        effectiveMode,
        suction,
        water,
        coverage,
        cleanedArea,
        repetitions
      );

      if (learned) {

	  // Remember that we have learned from this room in this session
        this.currentSession.learnedRooms.add(roomName);
        this.statistics.successfulLearnings++;

        // Success message with AlexaInfo
        const lang = this.UserLang || 'EN';
        this.log.info(`[LEARNING-SYSTEM] ${this.AlexaInfo[lang][818]}`);

        this.log.info(`[LEARNING-SYSTEM] Learned from ${normalizedRoom}: mode=${effectiveMode}, ` +
                   `suction=${suction}, water=${water}, coverage=${coverage.toFixed(1)}%`);

        // Auto-save
        this.saveData();

        return true;
      }

      return false;

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Learning failed: ${error.message}`);
      return false;
    }
  }

  async learnCleaningSettings(roomName, mode, suction, water, coverage, cleanedArea, repetitions = 1) {
    try {
      const now = Date.now();
      const timeSlot = this.getTimeSlot(new Date(now).getHours());

      // Initialize or fetch profile
      if (!this.roomProfiles[roomName]) {
        this.roomProfiles[roomName] = this.createNewRoomProfile(roomName);
        this.statistics.totalRoomsLearned++;
      }

      const profile = this.roomProfiles[roomName];

      // Update statistics
      profile.totalCleanings++;
      profile.successfulCleanings++;
      profile.totalAreaCleaned += (cleanedArea || 0);
      profile.averageCoverage = (profile.averageCoverage * (profile.successfulCleanings - 1) + coverage) / profile.successfulCleanings;
      profile.lastCleaned = now;
      profile.lastMode = mode;
      profile.lastSuction = suction;
      profile.lastWater = water;
      profile.lastCoverage = coverage;
      profile.lastRepetitions = repetitions;

      // Update history
      profile.modeHistory[mode] = (profile.modeHistory[mode] || 0) + 1;
      if (suction) profile.suctionHistory[suction] = (profile.suctionHistory[suction] || 0) + 1;
      if (water) profile.waterHistory[water] = (profile.waterHistory[water] || 0) + 1;
      profile.timeSlotHistory[timeSlot] = (profile.timeSlotHistory[timeSlot] || 0) + 1;

      // Update repetition history
      profile.repetitionHistory[repetitions] = (profile.repetitionHistory[repetitions] || 0) + 1;

      // Coverage History
      profile.coverageHistory.push(coverage);
      if (profile.coverageHistory.length > this.config.MaxCoverageHistory) {
        profile.coverageHistory = profile.coverageHistory.slice(-this.config.MaxCoverageHistory);
      }

      // Detailed history
      profile.learningHistory.unshift({
        timestamp: now,
        mode: mode,
        suction: suction,
        water: water,
        coverage: coverage,
        area: cleanedArea,
        repetitions: repetitions,
        timeSlot: timeSlot,
        sessionId: this.currentSession?.sessionId
      });

      if (profile.learningHistory.length > this.config.MaxHistoryEntriesPerRoom) {
        profile.learningHistory = profile.learningHistory.slice(0, this.config.MaxHistoryEntriesPerRoom);
      }

      // Update typical repetitions based on learned data
      this.updateTypicalRepetitions(profile);

      // Recalculate preferred settings
      this.updatePreferredSettings(profile);

      // Assess data quality
      profile.dataQuality = this.assessDataQuality(profile);

      return true;

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] learnCleaningSettings failed: ${error.message}`);
      throw error;
    }
  }

  createNewRoomProfile(roomName) {
    return {
      name: roomName,                     // Room name
      totalCleanings: 0,                  // Total number of cleaning runs
      successfulCleanings: 0,             // Number of successful cleanings
      totalAreaCleaned: 0,                // Total cleaned area (e.g. m?)
      averageCoverage: 0,                 // Average coverage percentage
      preferredMode: 5120,                // Default / preferred cleaning mode
      preferredSuction: 'standard',       // Preferred suction level
      preferredMopping: 'medium',         // Preferred mopping (water) level
      typicalRepetitions: 1,              // Most common repetition count
      lastCleaned: 0,                     // Timestamp of last cleaning
      lastMode: null,                     // Last used cleaning mode
      lastSuction: null,                  // Last used suction level
      lastWater: null,                    // Last used water level
      lastCoverage: 0,                    // Coverage of the last cleaning run
      lastRepetitions: 1,                 // Last used repetitions

      learningHistory: [],                // Full learning history entries
      modeHistory: {},                    // Usage frequency per mode
      suctionHistory: {},                 // Usage frequency per suction level
      waterHistory: {},                   // Usage frequency per water level
      repetitionHistory: {},              // Usage frequency per repetition count
      coverageHistory: [],                // Historical coverage values
      timeSlotHistory: {},                // Cleaning frequency per time slot

      dataQuality: 'new',                 // Profile maturity indicator
      synonyms: [],                       // Alternative room names
      originalNames: [roomName]           // Initially detected room names
    };
  }

  updateTypicalRepetitions(profile) {
    // Update only if repetition history exists
    if (Object.keys(profile.repetitionHistory).length > 0) {
      const mostUsed = Object.entries(profile.repetitionHistory)
        .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

      profile.typicalRepetitions = parseInt(mostUsed);
    }
  }

  updatePreferredSettings(profile) {
    // Mode
    if (Object.keys(profile.modeHistory).length > 0) {
      const mostUsedMode = Object.entries(profile.modeHistory)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      profile.preferredMode = parseInt(mostUsedMode);
    }

    // Suction level
    if (Object.keys(profile.suctionHistory).length > 0) {
      const mostUsedSuction = Object.entries(profile.suctionHistory)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      profile.preferredSuction = mostUsedSuction;
    }

    // Mopping level
    if (Object.keys(profile.waterHistory).length > 0) {
      const mostUsedWater = Object.entries(profile.waterHistory)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      profile.preferredMopping = mostUsedWater;
    }
  }

  // ==================== RECOMMENDATIONS ====================
  async getRecommendation(roomInput, language = 'EN') {
    try {
      // Normalize room name
      const roomDetection = this.detectRoom(roomInput, language);
      const roomName = roomDetection.name;

      // Check if profile exists
      if (!this.roomProfiles[roomName]) {
        return this.getDefaultRecommendation(roomName, language);
      }

      const profile = this.roomProfiles[roomName];

      // Check minimum number of cleanings
      if (profile.successfulCleanings < this.config.MinCleaningsForConfidence) {
        return this.getDefaultRecommendation(roomName, language);
      }

      // Calculate recommendation
      const recommendation = this.calculateRecommendation(profile, language);
      recommendation.detectionSource = roomDetection.source;
      recommendation.detectionConfidence = roomDetection.confidence;
      recommendation.normalizedName = roomName;

      return recommendation;

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Recommendation failed: ${error.message}`);
      return this.getDefaultRecommendation(roomInput, language);
    }
  }

  calculateRecommendation(profile, language) {
    const now = Date.now();
    const hoursSinceLast = (now - profile.lastCleaned) / (1000 * 60 * 60);
    const currentTimeSlot = this.getTimeSlot(new Date(now).getHours());

    const recommendation = {
      mode: profile.preferredMode,
      suction: profile.preferredSuction,
      mopping: profile.preferredMopping,
      repetitions: profile.typicalRepetitions || 1,
      confidence: 0,
      factors: [],
      dataQuality: profile.dataQuality,
      lastCleanedHours: Math.round(hoursSinceLast),
      successfulCleanings: profile.successfulCleanings
    };

    // CONFIDENCE CALCULATION
    // 1. Number of cleanings
    const cleaningsFactor = Math.min(profile.successfulCleanings * 8, 40);
    recommendation.confidence += cleaningsFactor;
    recommendation.factors.push(`cleanings:${profile.successfulCleanings}`);

    // 2. Consistency
    const suctionConsistency = this.calculateConsistency(profile.suctionHistory);
    const waterConsistency = this.calculateConsistency(profile.waterHistory);
    const consistencyScore = ((suctionConsistency + waterConsistency) / 2) * 30;
    recommendation.confidence += consistencyScore;

    if (consistencyScore > 20) {
      recommendation.factors.push('consistent');
    }

    // 3. Repetition consistency
    const repetitionConsistency = this.calculateConsistency(profile.repetitionHistory);
    if (repetitionConsistency > 0.7) {
      recommendation.confidence += 5;
      recommendation.factors.push('consistent_repetitions');
    }

    // 4. Coverage quality
    const coverageScore = Math.min(profile.averageCoverage / 100 * 15, 15);
    recommendation.confidence += coverageScore;

    if (profile.averageCoverage > 85) {
      recommendation.factors.push('high_coverage');
    }

    // 5. Recency
    let recencyScore = 0;
    if (hoursSinceLast < 6) {
      recencyScore = 5;
      recommendation.factors.push('very_recent');
    } else if (hoursSinceLast < 24) {
      recencyScore = 10;
      recommendation.factors.push('recent');
    } else if (hoursSinceLast < 168) {
      recencyScore = 8;
    } else {
      recencyScore = 5;
    }
    recommendation.confidence += recencyScore;

    // 6. Time of day context
    if (this.config.EnableTimeContext && profile.timeSlotHistory[currentTimeSlot]) {
      const timeSlotCount = profile.timeSlotHistory[currentTimeSlot];
      const totalInTimeSlot = Object.values(profile.timeSlotHistory).reduce((a, b) => a + b, 0);
      const timeSlotRatio = timeSlotCount / totalInTimeSlot;

      if (timeSlotRatio > 0.5) {
        recommendation.confidence += 10;
        recommendation.factors.push(`time_context:${currentTimeSlot}`);
      }
    }

    // Limit confidence
    recommendation.confidence = Math.min(100, Math.max(0, Math.round(recommendation.confidence)));

    // Time-based adjustments
    if (hoursSinceLast > 48) {
      if (recommendation.suction === 'quiet') recommendation.suction = 'standard';
      if (recommendation.mopping === 'low') recommendation.mopping = 'medium';
      recommendation.factors.push('long_time_since_last');
    } else if (hoursSinceLast < 3) {
      if (recommendation.suction === 'strong') recommendation.suction = 'quiet';
      if (recommendation.mopping === 'high') recommendation.mopping = 'low';
      recommendation.factors.push('very_recent_clean');
    }

    // Adjust repetitions based on last cleaning time
    if (hoursSinceLast > 72 && recommendation.repetitions === 1) {
      recommendation.repetitions = 2;
      recommendation.factors.push('increased_repetitions_for_long_interval');
    }

    return recommendation;
  }

  getDefaultRecommendation(roomName, language) {
    // Dynamic category detection
    const category = this.detectRoomCategory(roomName, language);

    if (category) {
      // Log category detection
      const categoryMessage = this.AlexaInfo[language][821](roomName, category.id);
      this.log.info(`[LEARNING-SYSTEM] ${categoryMessage}`);

      return {
        mode: category.typicalMode,
        suction: category.suction,
        mopping: category.mopping,
        repetitions: 1, // Default for category-based
        confidence: 35,
        factors: ['room_category'],
        dataQuality: 'category_based',
        category: category.id,
        lastCleanedHours: null,
        successfulCleanings: 0,
        categoryMessage: this.AlexaInfo[language][822]
      };
    }

    // Heuristic detection
    const roomLower = roomName.toLowerCase();

    if (roomLower.includes('bath') || roomLower.includes('shower') ||
        roomLower.includes('toilet')) {
      return {
        mode: 5120,
        suction: 'strong',
        mopping: 'high',
        repetitions: 1,
        confidence: 30,
        factors: ['heuristic_wet_room'],
        dataQuality: 'heuristic',
        lastCleanedHours: null,
        successfulCleanings: 0
      };
    }

    if (roomLower.includes('kitchen') || roomLower.includes('cook')) {
      return {
        mode: 5120,
        suction: 'strong',
        mopping: 'high',
        repetitions: 1,
        confidence: 30,
        factors: ['heuristic_kitchen'],
        dataQuality: 'heuristic',
        lastCleanedHours: null,
        successfulCleanings: 0
      };
    }

    // Global fallback
    return {
      mode: 5120,
      suction: 'standard',
      mopping: 'medium',
      repetitions: 1,
      confidence: 10,
      factors: ['global_default'],
      dataQuality: 'unknown',
      lastCleanedHours: null,
      successfulCleanings: 0
    };
  }

  getRecommendedRepetitions(roomName) {
    const profile = this.roomProfiles[roomName];

    // Return default if no profile exists
    if (!profile) return 1;

    // Calculate typical repetitions based on historical data
    const history = profile.learningHistory;
    if (history.length < 3) return 1;

    // Count how often each repetition value occurs
    const repCounts = {};
    history.forEach(entry => {
      const reps = entry.repetitions || 1;
      repCounts[reps] = (repCounts[reps] || 0) + 1;
    });

    // Determine the most frequently used repetition count
    let maxRep = 1;
    let maxCount = 0;

    for (const [reps, count] of Object.entries(repCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxRep = parseInt(reps);
      }
    }

    return maxRep;
  }

  learnRepetitionPattern(roomName, repetitions, coverage) {
    const normalizedRoom = this.normalizeRoomName(roomName);
    const profile = this.roomProfiles[normalizedRoom];

    if (!profile) return;

    // If coverage is high and the room was cleaned multiple times, assume that repeated cleaning is intentional
    if (coverage > 80 && repetitions > 1) {
      // Store repetitions in history
      profile.repetitionHistory[repetitions] = (profile.repetitionHistory[repetitions] || 0) + 1;

      // Update typical repetitions
      this.updateTypicalRepetitions(profile);

      this.log.info(`[LEARNING-SYSTEM] Learned repetition pattern for ${roomName}: ${repetitions} repetitions with ${coverage}% coverage`);
    }
  }

  // ==================== AUTO-COMPLETION FOR VOICE COMMANDS ====================
  async autoCompleteCommand(roomActions, language, alexaId, speakMode) {
    const completedRooms = [];

    for (const [roomNumber, roomAction] of Object.entries(roomActions)) {
      const roomName = roomAction.name;

      // Check if command contains natural language repetitions
      if (roomAction.originalCommand) {
        const repetitions = this.extractRepetitionsFromCommand(roomAction.originalCommand, language);
        if (repetitions > 1) {
          roomAction.repetitions = repetitions;
          roomAction.repetitionsSource = 'voice_command';

          const repetitionsMessage = this.AlexaInfo[language][824](repetitions);
          this.log.info(`[LEARNING-SYSTEM] ${repetitionsMessage}`);

          if (speakMode) {
            await this.adapter.speakToAlexa(repetitionsMessage, alexaId, speakMode);
          }
        }
      }

      // 1. Get recommendation from the learning system
      const recommendation = await this.getRecommendation(roomName, language);

	      // Check if confidence is high enough for auto-complete
      if (recommendation.confidence < this.config.AutoCompleteMinConfidence) {
        this.log.info(
          `[LEARNING-SYSTEM] Confidence too low for auto-complete: ` +
        `${recommendation.confidence}% < ${this.config.AutoCompleteMinConfidence}%`
        );

        // Continue without auto-completing parameters
        completedRooms.push({
          roomNumber,
          roomName,
          settings: roomAction,
          recommendation,
          autoCompleted: false,
          reason: 'confidence_too_low'
        });
        continue;
      }
      // 2. Auto-complete missing parameters
      let autoCompleted = false;

      // Auto-complete SUCTION: if not set AND not pure mopping mode
      if (!roomAction.suction && roomAction.cleaningModes !== 5121) {
      // Additional confidence check for suction level
        if (recommendation.confidence >= this.config.AutoCompleteMinConfidence) {
          roomAction.suction = recommendation.suction;
          roomAction.suctionSource = 'learned';
          roomAction.suctionConfidence = recommendation.confidence;
          autoCompleted = true;
        }
      }

      // Auto-complete MOPPING: if not set AND not pure vacuum mode
      if (!roomAction.mopping && roomAction.cleaningModes !== 5122) {
        // Additional confidence check for mopping level
        if (recommendation.confidence >= this.config.AutoCompleteMinConfidence) {
          roomAction.mopping = recommendation.mopping;
          roomAction.moppingSource = 'learned';
          roomAction.moppingConfidence = recommendation.confidence;
          autoCompleted = true;
        }
      }

      // Auto-complete REPETITIONS: if not set
      if (!roomAction.repetitions && recommendation.repetitions) {
        // NEW: Additional confidence check for repetitions
        if (recommendation.confidence >= this.config.AutoCompleteMinConfidence) {
          roomAction.repetitions = recommendation.repetitions;
          roomAction.repetitionsSource = 'learned';
          autoCompleted = true;
		          const typicalRepetitionsMessage = this.AlexaInfo[language][823](roomName, recommendation.repetitions);
          this.log.info(`[LEARNING-SYSTEM] ${typicalRepetitionsMessage}`);
        }
      }

      // 3. Log message including Alexa information
      if (autoCompleted) {
        let autoCompleteMessage = this.AlexaInfo[language][804](roomAction.suction, roomAction.mopping, roomName);
        this.log.info(`[LEARNING-SYSTEM] ${autoCompleteMessage}`);

        // Add repetitions info if applicable
        if (roomAction.repetitions > 1) {
          const repetitionsMessage = this.AlexaInfo[language][606](roomAction.repetitions);
          autoCompleteMessage += ` ${this.AlexaInfo[language][10]}: ${repetitionsMessage}`;
        }

        if (speakMode) {
          await this.adapter.speakToAlexa(autoCompleteMessage, alexaId, speakMode);
        }
      }

      // 4. Debug logging
      this.log.info(`[LEARNING-SYSTEM] Auto-complete for ${roomName}: ` +
                  `suction=${roomAction.suction} (${recommendation.confidence}%), ` +
                  `mopping=${roomAction.mopping} (${recommendation.confidence}%), ` +
                  `repetitions=${roomAction.repetitions || 1}`);

      // 5. Store result for return value
      completedRooms.push({
        roomNumber,
        roomName,
        settings: roomAction,
        recommendation
      });
    }

    return completedRooms;
  }

  // ==================== ROOM RECOGNITION ====================
  detectRoom(roomInput, language) {
	  //this.log.info(`[LEARNING-SYSTEM] ROOM RECOGNITION ${roomInput}`);
    const inputLower = roomInput.toLowerCase().trim();

    // 1. Direct match with official names
    const officialRooms = this.constants.AlexaRoomsName?.[language] || this.constants.AlexaRoomsName?.['EN'] || [];
    for (const officialName of officialRooms) {
      if (inputLower === officialName.toLowerCase()) {
		  //this.log.info(`[LEARNING-SYSTEM] Direct match with official names ${officialName}`);
        return {
          name: officialName,
          confidence: 100,
          source: 'direct_match'
        };
      }
    }

    // 2. Synonym match
    const synonyms = this.constants.AlexaRoomsNameSynonyms?.[language] || this.constants.AlexaRoomsNameSynonyms?.['EN'] || {};
    for (const [synonym, officialName] of Object.entries(synonyms)) {
      if (inputLower === synonym.toLowerCase()) {
		  //this.log.info(`[LEARNING-SYSTEM] Synonym match ${officialName}`);
        return {
          name: officialName,
          confidence: 95,
          source: 'synonym_exact'
        };
      }
    }

    // 3. Partial match
    let bestPartialMatch = null;
    let bestPartialScore = 0;

    for (const [synonym, officialName] of Object.entries(synonyms)) {
      if (inputLower.includes(synonym.toLowerCase()) || synonym.toLowerCase().includes(inputLower)) {
        const score = this.calculateStringSimilarity(inputLower, synonym.toLowerCase());
        if (score > bestPartialScore && score > 60) {
          bestPartialScore = score;
          bestPartialMatch = {
            name: officialName,
            confidence: Math.min(90, score),
            source: 'synonym_partial'
          };
        }
      }
    }

    if (bestPartialMatch) {
      //this.log.info(`[LEARNING-SYSTEM] Partial match ${bestPartialMatch.name}`);
      return bestPartialMatch;
    }

    // 4. Heuristic detection
    const heuristicMatch = this.detectRoomHeuristically(inputLower, language);
    if (heuristicMatch) {
      //this.log.info(`[LEARNING-SYSTEM] Heuristic detection ${heuristicMatch.name}`);
      return heuristicMatch;
    }

    // 5. Fallback
    //this.log.info(`[LEARNING-SYSTEM] Fallback ${roomInput}`);
    return {
      name: roomInput,
      confidence: 10,
      source: 'unknown'
    };
  }

  detectRoomCategory(roomName, language) {
  // Get categories for the requested language
    const categories = roomCategories[language] || roomCategories['EN'];
    const roomLower = roomName.toLowerCase();
    const allMatches = [];

    for (const [categoryId, category] of Object.entries(categories)) {
      for (const keyword of category.keywords) {
        allMatches.push({
          categoryId,
          category,
          keyword
        });
      }
    }

    // Sort keywords by length (descending). Example: "master bedroom" before "bedroom"
    allMatches.sort((a, b) => b.keyword.length - a.keyword.length);

    for (const match of allMatches) {
      if (roomLower.includes(match.keyword.toLowerCase())) {
      // Return the matched category including its configuration
        return { id: match.categoryId, ...match.category };
      }
    }

    // Return null if no matching category was found
    return null;
  }

  detectRoomHeuristically(input, language) {
    const commonPatterns = {
      'EN': [
        { pattern: /living|lounge|salon/i, name: 'Living Room', confidence: 80 },
        { pattern: /bed|sleep|night/i, name: 'Bedroom', confidence: 80 },
        { pattern: /kitchen|cook/i, name: 'Kitchen', confidence: 85 },
        { pattern: /bath|shower|toilet|wc/i, name: 'Bathroom', confidence: 85 },
        { pattern: /dining|eat|meal/i, name: 'Dining Room', confidence: 75 },
        { pattern: /office|study|work/i, name: 'Office', confidence: 75 },
        { pattern: /hall|corridor|passage/i, name: 'Corridor', confidence: 80 },
        { pattern: /balcony|terrace|patio/i, name: 'Balcony', confidence: 85 },
        { pattern: /children|kids|baby|play/i, name: 'Children\'s Room', confidence: 80 },
        { pattern: /guest|visitor/i, name: 'Guest Room', confidence: 75 }
      ],
      'DE': [
        { pattern: /wohn|salon|stube/i, name: 'Wohnzimmer', confidence: 80 },
        { pattern: /schlaf|bed|nacht/i, name: 'Schlafzimmer', confidence: 80 },
        { pattern: /küch|koch/i, name: 'küche', confidence: 85 },
        { pattern: /bad|dusch|wc|toilette/i, name: 'Badezimmer', confidence: 85 },
        { pattern: /ess|speise/i, name: 'Esszimmer', confidence: 75 },
        { pattern: /arbeits|büro|office/i, name: 'Arbeitszimmer', confidence: 75 },
        { pattern: /flur|diele|korridor/i, name: 'Flur', confidence: 80 },
        { pattern: /balkon|terrasse|loggia/i, name: 'Balkon', confidence: 85 },
        { pattern: /kinder|baby|spiel/i, name: 'Kinderzimmer', confidence: 80 },
        { pattern: /gäste|besucher/i, name: 'Gästezimmer', confidence: 75 },
        { pattern: /eingang|vorraum/i, name: 'Eingang', confidence: 75 },
        { pattern: /garderobe|garderoben/i, name: 'Garderobe', confidence: 70 },
        { pattern: /abstell|kammer|lager/i, name: 'Abstellraum', confidence: 70 },
        { pattern: /wasch|wäsche/i, name: 'Waschraum', confidence: 75 },
        { pattern: /hobby|werkstatt|bastel/i, name: 'Hobbyraum', confidence: 70 }
      ]
    };

    const patterns = commonPatterns[language] || commonPatterns['EN'];

    for (const item of patterns) {
      if (item.pattern.test(input)) {
        return {
          name: item.name,
          confidence: item.confidence,
          source: 'heuristic_pattern'
        };
      }
    }

    return null;
  }

  normalizeRoomName(roomName) {

    const lang = this.UserLang || 'EN';
    const detection = this.detectRoom(roomName, lang);

    // Log the recognition for debugging
    if (this.config.DebugMode && detection.confidence < 100) {
      const detectionMessage = this.AlexaInfo[lang][819](roomName, detection.name, detection.confidence);
      this.log.info(`[LEARNING-SYSTEM] ${detectionMessage}`);
    }

    return detection.name;
  }

  // ==================== HELPER FUNCTIONS ====================
  convertSuctionLevel(level, language) {
    const suctionMap = {
      'EN': ['quiet', 'standard', 'strong', 'maximum'],
      'DE': ['quiet', 'standard', 'strong', 'turbo']
    };

    const map = suctionMap[language] || suctionMap['EN'];
    return level >= 0 && level < map.length ? map[level] : 'standard';
  }

  convertWaterVolume(level, language) {
    const waterMap = {
      'EN': ['low', 'medium', 'high'],
      'DE': ['low', 'medium', 'high']
    };

    const map = waterMap[language] || waterMap['EN'];
    return level >= 0 && level < map.length ? map[level] : 'medium';
  }

  getTimeSlot(hour) {
    if (hour >= 5 && hour < 9) return 'early_morning';    // 5-9 AM = Key 858
    if (hour >= 9 && hour < 12) return 'morning';         // 9 AM - 12 PM = Key 859
    if (hour >= 12 && hour < 14) return 'midday';         // 12-2 PM = Key 860
    if (hour >= 14 && hour < 17) return 'afternoon';      // 2-5 PM = Key 861
    if (hour >= 17 && hour < 20) return 'evening';        // 5-8 PM = Key 862
    if (hour >= 20 && hour < 23) return 'late_evening';   // 8-11 PM = Key 863
    return 'night';                                       // 11 PM - 5 AM = Key 864
  }



  calculateConsistency(history) {
    if (!history || Object.keys(history).length === 0) return 0;

    const total = Object.values(history).reduce((a, b) => a + b, 0);
    const max = Math.max(...Object.values(history));

    return max / total;
  }

  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    const distance = this.levenshteinDistance(longer, shorter);
    return Math.round((1 - distance / longer.length) * 100);
  }

  levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  assessDataQuality(profile) {
    if (profile.successfulCleanings >= 10 && profile.averageCoverage >= 85) {
      return 'excellent';
    } else if (profile.successfulCleanings >= 5 && profile.averageCoverage >= 80) {
      return 'good';
    } else if (profile.successfulCleanings >= 3) {
      return 'fair';
    } else if (profile.successfulCleanings >= 1) {
      return 'limited';
    } else {
      return 'unknown';
    }
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ==================== PERSISTENCE ====================
  async loadPersistentData() {
    try {
      const basePath = `${this.deviceId}.state.learning`;

      // Load profiles
      const profilesState = await this.adapter.getStateAsync(`${basePath}.Profiles`);
      if (profilesState && profilesState.val) {
        this.roomProfiles = JSON.parse(profilesState.val);
        this.log.info(`[LEARNING-SYSTEM] Loaded ${Object.keys(this.roomProfiles).length} room profiles for device ${this.deviceId}`);
        this.validateProfiles();
      }

      // Load statistics
      const statsState = await this.adapter.getStateAsync(`${basePath}.Statistics`);
      if (statsState && statsState.val) {
        const stats = JSON.parse(statsState.val);
        this.statistics = { ...this.statistics, ...stats };
      }

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Load failed for device ${this.deviceId}: ${error.message}`);
      this.roomProfiles = {};
    }
  }

  async createStates() {
    const basePath = `${this.deviceId}.state.learning`;
    const states = [
      { path: 'Profiles', name: 'Learning Profiles', def: '{}' },
      { path: 'Statistics', name: 'Learning Statistics', def: '{}' },
      { path: 'Recommendations', name: 'Room Recommendations', def: '{}' },
      { path: 'CurrentSession', name: 'Current Session', def: '{}' },
      { path: 'SessionHistory', name: 'Session History', def: '[]' },
	  { path: 'config', name: 'Learning Configuration', def: '{}' }
    ];

    for (const state of states) {
      await this.adapter.setObjectNotExistsAsync(`${basePath}.${state.path}`, {
        type: 'state',
        common: {
          name: state.name,
          type: 'string',
          role: 'json',
          write: false,
          read: true,
          def: state.def
        },
        native: {}
      });
    }
	 await this.createConfigStates();
  }

  async createConfigStates() {
    const configPath = `${this.deviceId}.state.learning.config`;

    // Create channel for configuration
    await this.adapter.setObjectNotExistsAsync(configPath, {
      type: 'channel',
      common: {
        name: 'Learning Configuration',
        role: 'info'
      },
      native: {}
    });

    // Individual config values as states
    const configStates = [
      { id: 'Enabled', name: 'Learning System Enabled', type: 'boolean', role: 'switch', def: this.config.Enabled },
      { id: 'MinCoverageForLearn', name: 'Minimum Coverage for Learning (%)', type: 'number', role: 'value', def: this.config.MinCoverageForLearn, unit: '%' },
      { id: 'MinCleaningsForConfidence', name: 'Minimum Cleanings for Confidence', type: 'number', role: 'value', def: this.config.MinCleaningsForConfidence },
      { id: 'MaxHistoryEntriesPerRoom', name: 'Max History Entries per Room', type: 'number', role: 'value', def: this.config.MaxHistoryEntriesPerRoom },
	    { id: 'MaxCoverageHistory', name: 'Max Coverage History Entries', type: 'number', role: 'value', def: this.config.MaxCoverageHistory },
      { id: 'SaveIntervalSec', name: 'Save Interval (ms)', type: 'number', role: 'value', def: this.config.SaveIntervalSec, unit: 'sec' },
      { id: 'AutoCompleteMinConfidence', name: 'Auto-Complete Min Confidence (%)', type: 'number', role: 'value', def: this.config.AutoCompleteMinConfidence, unit: '%' },
      { id: 'EnableTimeContext', name: 'Enable Time Context', type: 'boolean', role: 'switch', def: this.config.EnableTimeContext },
      { id: 'DebugMode', name: 'Debug Mode', type: 'boolean', role: 'switch', def: this.config.DebugMode }
    ];

    for (const state of configStates) {
      await this.adapter.setObjectNotExistsAsync(`${configPath}.${state.id}`, {
        type: 'state',
        common: {
          name: state.name,
          type: state.type,
          role: state.role,
          read: true,
          write: true, // Can be modified by the user
          def: state.def,
          unit: state.unit || ''
        },
        native: {}
      });

      // Set initial value -> Only set if State does NOT YET have a value!
      const existingState = await this.adapter.getStateAsync(`${configPath}.${state.id}`);
      if (!existingState || existingState.val === null || existingState.val === undefined) {
        await this.adapter.setStateAsync(`${configPath}.${state.id}`, {
          val: state.def,  // Only for new states!
          ack: true
        });
      }
    }

    // Load previously stored configuration (if available)
    await this.loadConfigFromStates();
  }

  async loadConfigFromStates() {
    try {
      const configPath = `${this.deviceId}.state.learning.config`;

      // Load each config value from states
      const loadedConfig = { ...this.config };

      for (const key of Object.keys(this.config)) {
        const state = await this.adapter.getStateAsync(`${configPath}.${key}`);
        if (state && state.val !== null && state.val !== undefined) {
        // Convert value depending on data type
          if (typeof this.config[key] === 'boolean') {
            loadedConfig[key] = Boolean(state.val);
          } else if (typeof this.config[key] === 'number') {
            loadedConfig[key] = Number(state.val);
          } else {
            loadedConfig[key] = state.val;
          }
        }
      }

      // Update config object
      this.config = loadedConfig;

      this.log.info('[LEARNING-SYSTEM] Config loaded from states');

      // subscribe to config states
      await this.adapter.subscribeStatesAsync(`${this.deviceId}.state.learning.config.*`);

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Failed to load config: ${error.message}`);
    }
  }

  // This method is called by the adapter
  async handleConfigChange(id, state) {
    try {
      if (!state || state.ack) return; // Process only unacknowledged changes

      const parts = id.split('.');
      const configKey = parts[parts.length - 1];

      // Check if this is a valid config key
      if (!(configKey in this.config)) {
        return;
      }

      const oldValue = this.config[configKey];
      const newValue = state.val;

      // Type-safe conversion
      let convertedValue;
      if (typeof oldValue === 'boolean') {
        convertedValue = Boolean(newValue);
      } else if (typeof oldValue === 'number') {
        convertedValue = Number(newValue);
      } else {
        convertedValue = newValue;
      }

      // Update config
      this.config[configKey] = convertedValue;

      // Acknowledge the state change
      await this.adapter.setStateAsync(id, { val: newValue, ack: true });

      this.log.info(
        `[LEARNING-SYSTEM] Config updated: ${configKey}=${convertedValue} (was: ${oldValue})`
      );

      // Persist updated configuration
      await this.saveData();

      // Special handling for DebugMode
      if (configKey === 'DebugMode') {
        this.log.info(
          `[LEARNING-SYSTEM] Debug mode is now ${convertedValue ? 'ENABLED' : 'DISABLED'}`
        );
      }

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Config change failed: ${error.message}`);
    }
  }


  async saveData() {
    try {
      const basePath = `${this.deviceId}.state.learning`;

      // Save profiles
      await this.adapter.setStateAsync(`${basePath}.Profiles`, {
        val: JSON.stringify(this.roomProfiles),
        ack: true
      });

      // Save statistics
      await this.adapter.setStateAsync(`${basePath}.Statistics`, {
        val: JSON.stringify(this.statistics),
        ack: true
      });

      // Save config
      await this.adapter.setStateAsync(`${this.deviceId}.state.learning.config`, {
        val: JSON.stringify(this.config),
        ack: true
      });

	  // Save States
      for (const key of Object.keys(this.config)) {
        await this.adapter.setStateAsync(`${basePath}.config.${key}`, {
          val: this.config[key],
          ack: true
        });
      }

      this.log.info(`[LEARNING-SYSTEM] Data saved for device ${this.deviceId}: ${Object.keys(this.roomProfiles).length} profiles`);

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Save failed for device ${this.deviceId}: ${error.message}`);
    }
  }

  async calculateAllRecommendations() {
    try {
      const basePath = `${this.deviceId}.state.learning`;
      const recommendations = {};
      const language = this.UserLang || 'EN';

      // For all learned rooms
      for (const [roomName, profile] of Object.entries(this.roomProfiles)) {
        const recommendation = this.calculateRecommendation(profile, language);
        recommendations[roomName] = recommendation;
      }

      // For all official rooms (for VIS)
      const officialRooms = this.constants.Alexarooms || [];
      for (const room of officialRooms) {
        if (!recommendations[room.RM]) {
          recommendations[room.RM] = this.getDefaultRecommendation(room.RM, language);
        }
      }

      await this.adapter.setStateAsync(`${basePath}.Recommendations`, {
        val: JSON.stringify(recommendations),
        ack: true
      });

      this.log.info(`[LEARNING-SYSTEM] Calculated ${Object.keys(recommendations).length} recommendations for device ${this.deviceId}`);

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Calculate recommendations failed for device ${this.deviceId}: ${error.message}`);
    }
  }

  async updateSessionState() {
    try {
      const basePath = `${this.deviceId}.state.learning`;
      await this.adapter.setStateAsync(`${basePath}.CurrentSession`, {
        val: JSON.stringify(this.currentSession),
        ack: true
      });
    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Update session state failed for device ${this.deviceId}: ${error.message}`);
    }
  }

  async saveSessionSummary(duration, roomsCleaned, roomsLearned) {
    try {
      const basePath = `${this.deviceId}.state.learning`;
      const summary = {
        timestamp: Date.now(),
        duration: duration,
        roomsCleaned: roomsCleaned,
        roomsLearned: roomsLearned,
        mode: this.currentSession?.mqttData?.mode,
        suction: this.currentSession?.mqttData?.suction,
        water: this.currentSession?.mqttData?.water,
        source: this.currentSession?.source,
        sessionId: this.currentSession?.sessionId
      };

      // Load existing history
      const historyState = await this.adapter.getStateAsync(`${basePath}.SessionHistory`);
      let history = [];

      if (historyState && historyState.val) {
        try {
          history = JSON.parse(historyState.val);
          if (!Array.isArray(history)) history = [];
        } catch (e) {
          history = [];
        }
      }

      // Add new session
      history.unshift(summary);
      if (history.length > this.config.MaxHistoryEntriesPerRoom) history = history.slice(0, this.config.MaxHistoryEntriesPerRoom);

      await this.adapter.setStateAsync(`${basePath}.SessionHistory`, {
        val: JSON.stringify(history),
        ack: true
      });

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Save session summary failed for device ${this.deviceId}: ${error.message}`);
    }
  }

  startLearrningMonitoring() {
    if (this.monitoringActive) {
      this.log.debug('[LEARNING-SYSTEM] Monitoring already active');
      return;
    }

    this.log.debug('[LEARNING-SYSTEM] Starting monitoring timers');

    // 1. AUTOSAVE � every 30 seconds
    this.saveInterval = setInterval(() => {
      if (this.currentSession?.isActive) { // Extra safety check
        this.saveData();
      }
    }, this.config.SaveIntervalSec * 1000);

    // 2. SESSION CLEANUP � every 60 seconds (important for zombie sessions)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60000);

    // 3. RECOMMENDATIONS � every 60 minutes (used for VIS)
    this.recommendationInterval = setInterval(() => {
      if (this.statistics.initialized) {
        this.calculateAllRecommendations();
      }
    }, 3600000);

    this.monitoringActive = true;
    this.log.debug('[LEARNING-SYSTEM] Monitoring timers started');
  }

  stopLearrningMonitoring() {
    if (!this.monitoringActive) {
      return;
    }

    this.log.debug('[LEARNING-SYSTEM] Stopping monitoring timers');

    // Clean up ALL timers
    const timers = [
      { name: 'save', ref: this.saveInterval },
      { name: 'cleanup', ref: this.cleanupInterval },
      { name: 'recommendation', ref: this.recommendationInterval }
    ];

    timers.forEach(timer => {
      if (timer.ref) {
        clearInterval(timer.ref);
        this.log.debug(`[LEARNING-SYSTEM] ${timer.name} timer stopped`);
      }
    });

    // Clear references
    this.saveInterval = null;
    this.cleanupInterval = null;
    this.recommendationInterval = null;
    this.monitoringActive = false;

    this.log.debug('[LEARNING-SYSTEM] Monitoring timers stopped');
  }

  cleanupOldSessions() {
    // Remove inactive sessions older than 1 hour
    if (this.currentSession && !this.currentSession.isActive) {
      const hoursSinceEnd = (Date.now() - this.currentSession.startTime) / (1000 * 60 * 60);
      if (hoursSinceEnd > 1) {
        this.currentSession = null;
        this.updateSessionState();
      }
    }
  }

  validateProfiles() {
    let validCount = 0;
    let removedCount = 0;

    for (const roomName in this.roomProfiles) {
      const profile = this.roomProfiles[roomName];

      // Validate required fields
      if (!profile.name || !profile.totalCleanings || profile.successfulCleanings > profile.totalCleanings) {
        delete this.roomProfiles[roomName];
        removedCount++;
        continue;
      }

      // Validate arrays
      if (!Array.isArray(profile.learningHistory)) profile.learningHistory = [];
      if (!Array.isArray(profile.coverageHistory)) profile.coverageHistory = [];

      // Ensure repetition history exists
      if (!profile.repetitionHistory) profile.repetitionHistory = {};
      if (!profile.typicalRepetitions) profile.typicalRepetitions = 1;

      validCount++;
    }

    if (removedCount > 0) {
      this.log.warn(`[LEARNING-SYSTEM] Removed ${removedCount} invalid profiles, kept ${validCount}`);
    }
  }

  // ==================== COMMAND HANDLER ====================

  async handleLearningCommand(fullCommand, language, responseCallback) {
    try {
      const command = fullCommand.toLowerCase().trim();
      const lang = language || this.UserLang;

      // 1. Check whether the command is intended for the robot
      if (!this.isRobotRelated(command, lang)) {
        return false;
      }

      // 2. Remove robot-related keywords
      const cleanCommand = this.removeRobotWords(command, lang);

      // 3. Analyze the cleaned command
      const analysis = this.analyzeCommand(cleanCommand, lang);

      // 4. Extract room parameter from the command
      const roomName = this.detectRoom(command, lang).name;
      // Abort if no clear command type or confidence is too low
      if (!analysis.commandType || analysis.confidence < 40) {
        return false;
      }

      // 5. Execute the flexible command
      return await this.executeFlexibleCommand(analysis.commandType, command, roomName, lang, responseCallback);

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Flexible command failed: ${error.message}`);
      return false;
    }
  }

  isRobotRelated(command, language) {
    const contexts = robotContexts[language] || robotContexts['EN'];
    const words = command.split(/\s+/);

    let robotScore = 0;

    // Check all robot context keywords
    for (const [category, keywords] of Object.entries(contexts)) {
      for (const keyword of keywords) {
      // Exact word match
        if (words.includes(keyword)) {
          robotScore += 2;
        }
        // Partial match inside the command string
        else if (command.includes(keyword) && keyword.length > 3) {
          robotScore += 1;
        }
      }
    }

    // At least 1 point is required to be considered robot-related
    return robotScore >= 1;
  }

  removeRobotWords(command, language) {
    const contexts = robotContexts[language] || robotContexts['EN'];
    let cleanCommand = command;

    // Collect all robot-related keywords
    const allKeywords = [];
    for (const keywords of Object.values(contexts)) {
      allKeywords.push(...keywords);
    }

    // Remove robot keywords from the command
    for (const keyword of allKeywords) {
      if (keyword.length > 3) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        cleanCommand = cleanCommand.replace(regex, '');
      }
    }

    // Normalize whitespace and trim
    return cleanCommand.replace(/\s+/g, ' ').trim();
  }

  analyzeCommand(command, language) {
    const keywords = learningKeywords[language] || learningKeywords['EN'];
    const words = command.split(/\s+/);

    let bestMatch = null;
    let bestScore = 0;

    // Evaluate each command type
    for (const [commandType, keywordList] of Object.entries(keywords)) {
      let score = 0;

      for (const keyword of keywordList) {
        if (keyword.length < 4) continue;

        // Exact word match
        if (words.includes(keyword)) {
          score += 3;
        }
        // Partial match
        else if (command.includes(keyword)) {
          score += 2;
        }
      }

      // Normalize score to avoid bias from long keyword lists
      const normalizedScore = score / Math.min(keywordList.length, 3);

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = commandType;
      }
    }

    return {
      commandType: bestMatch,
      confidence: Math.min(bestScore * 100, 100)
    };
  }

  async executeFlexibleCommand(commandType, originalCommand, roomName, language, responseCallback) {
    this.log.info(`[LEARNING-SYSTEM] Command: ${originalCommand}`);
    switch (commandType) {
      case 'show_learning':
        await this.handleShowLearning(responseCallback, language);
        return true;

      case 'show_stats':
        await this.handleShowStats(responseCallback, language);
        return true;

      case 'room_stats':
        await this.handleRoomStats(roomName, responseCallback, language);
        return true;

      case 'recommendation':
        await this.handleRecommendationCmd(roomName, responseCallback, language);
        return true;

      case 'clear_learning':
        await this.handleClearLearning(responseCallback, language);
        return true;

      case 'reset_learning':
        await this.handleResetLearning(responseCallback, language);
        return true;

      case 'learned_rooms':
        await this.handleLearnedRooms(responseCallback, language);
        return true;

      case 'confidence_info':
        await this.handleConfidenceInfo(responseCallback, language);
        return true;

      case 'ignore_last':
        await this.handleIgnoreLast(responseCallback, language);
        return true;

      case 'typical_repetitions':
        await this.handleTypicalRepetitions(roomName, responseCallback, language);
        return true;

      case 'repetitions_info':
        await this.handleRepetitionsInfo(responseCallback, language);
        return true;

      case 'repeat_info':
        await this.handleRepeatInfo(responseCallback, language);
        return true;
    }

    return false;
  }

  async handleShowLearning(callback, language) {
    const stats = this.getStatistics();
    const message = this.AlexaInfo[language][814](stats.totalCleanings, stats.successfulLearnings);

    if (callback) callback(message);
  }

  async handleShowStats(callback, language) {
    const stats = [];

    for (const [roomName, profile] of Object.entries(this.roomProfiles)) {
      const qualityMessage = this.AlexaInfo[language][816](profile.dataQuality);
      stats.push(`${roomName}: ${profile.successfulCleanings}x (${qualityMessage})`);
    }

    let message;
    if (stats.length > 0) {
      message = `${this.AlexaInfo[language][827]} ${stats.join(', ')}`;
    } else {
      message = this.AlexaInfo[language][812];
    }

    if (callback) callback(message);
  }

  async handleRoomStats(command, callback, language) {
    try {
    // Room recognition
      const roomDetection = this.detectRoom(command, language);

      if (roomDetection.confidence < 50) {
        const message = this.AlexaInfo[language][815]; // "Room not found..."
        if (callback) callback(message);
        return;
      }

      const roomName = roomDetection.name;
      const normalizedRoom = this.normalizeRoomName(roomName);
      const profile = this.roomProfiles[normalizedRoom];

      if (!profile || profile.successfulCleanings === 0) {
        const message = this.AlexaInfo[language][808](roomName); // "Not enough history..."
        if (callback) callback(message);
        return;
      }

      // Log detection information for debugging
      if (this.config.DebugMode && roomDetection.confidence < 100) {
        this.log.info(`[LEARNING-SYSTEM] Room detected: "${command}" -> "${roomName}" ` +
                   `(confidence: ${roomDetection.confidence}%, source: ${roomDetection.source})`);
      }

      // Show detailed analysis if enough data (= 3 cleanings)
      if (profile.successfulCleanings >= 3) {
        const infoLevel = this.determineInfoLevel(profile);
        const response = this.buildDetailedAnalysisSpokenResponse(
          normalizedRoom,
          profile,
          infoLevel,
          language
        );

        if (callback) callback(response);
      } else {
      // Simple basic statistics for limited data
        const stats = this.getRoomStats(normalizedRoom);

        if (!stats) {
          const message = this.AlexaInfo[language][808](roomName);
          if (callback) callback(message);
          return;
        }

        const message =
        this.AlexaInfo[language][805](stats.successfulCleanings, normalizedRoom) +
        ' ' +
        this.AlexaInfo[language][816](stats.dataQuality);

        if (callback) callback(message);
      }

    } catch (error) {
      this.log.error(`[LEARNING-SYSTEM] Room stats failed: ${error.message}`);
      const message = this.AlexaInfo[language][815]; // "Room not found..."
      if (callback) callback(message);
    }
  }

  // ==================== STATISTICS ====================
  getStatistics() {
    return {
      totalRooms: Object.keys(this.roomProfiles).length,
      totalCleanings: this.statistics.totalCleaningsTracked,
      successfulLearnings: this.statistics.successfulLearnings,
      initialized: this.statistics.initialized,
      currentSession: this.currentSession ? {
        isActive: this.currentSession.isActive,
        duration: this.currentSession.isActive ?
          Math.round((Date.now() - this.currentSession.startTime) / 1000) : 0,
        rooms: Object.keys(this.currentSession.roomProgress || {}).length,
        learned: this.currentSession.learnedRooms?.size || 0
      } : null
    };
  }

  getRoomStats(roomName) {
    const normalizedRoom = this.normalizeRoomName(roomName);
    const profile = this.roomProfiles[normalizedRoom];

    if (!profile) {
      return null;
    }

    return {
      name: profile.name,
      totalCleanings: profile.totalCleanings,
      successfulCleanings: profile.successfulCleanings,
      averageCoverage: profile.averageCoverage,
      typicalRepetitions: profile.typicalRepetitions || 1,
      preferredMode: profile.preferredMode,
      preferredSuction: profile.preferredSuction,
      preferredMopping: profile.preferredMopping,
      lastCleaned: new Date(profile.lastCleaned).toLocaleString(),
      dataQuality: profile.dataQuality,
      modeDistribution: profile.modeHistory,
      suctionDistribution: profile.suctionHistory,
      waterDistribution: profile.waterHistory,
      repetitionDistribution: profile.repetitionHistory
    };
  }

  determineInfoLevel(profile) {
    if (profile.successfulCleanings < 3) return 'basic';
    if (profile.successfulCleanings < 10) return 'intermediate';
    return 'advanced';
  }

  getCoverageQualityText(coverage, language) {
    const messages = this.AlexaInfo[language];

    if (coverage >= 90) return messages[845]; // 'excellent'
    if (coverage >= 85) return messages[846]; // 'very good'
    if (coverage >= 80) return messages[847]; // 'good'
    if (coverage >= 75) return messages[848]; // 'acceptable'
    return messages[849]; // 'needs improvement'
  }

  getSuctionText(level, language) {
    const messages = this.AlexaInfo[language];
    const map = {
      'quiet': messages[850],    // 'quiet'
      'standard': messages[851], // 'standard'
      'strong': messages[852],   // 'strong'
      'turbo': messages[853],    // 'turbo'
      'maximum': messages[854]   // 'maximum'
    };

    return map[level] || level;
  }

  getMoppingText(level, language) {
    const messages = this.AlexaInfo[language];
    const map = {
      'low': messages[855],     // 'low'
      'medium': messages[856],  // 'medium'
      'high': messages[857]     // 'high'
    };

    return map[level] || level;
  }

  getTimePatternText(timeSlot, language) {
    const messages = this.AlexaInfo[language];
    const map = {
      'early_morning': messages[858] || 'in the early morning',
      'morning': messages[859] || 'in the morning',
      'midday': messages[860] || 'around midday',
      'afternoon': messages[861] || 'in the afternoon',
      'evening': messages[862] || 'in the evening',
      'late_evening': messages[863] || 'in the late evening',
      'night': messages[864] || 'at night'
    };

    return map[timeSlot] || messages[865] || 'at various times';
  }

  calculateSuccessRate(profile) {
    if (profile.totalCleanings === 0) return 0;
    return Math.round((profile.successfulCleanings / profile.totalCleanings) * 100);
  }

  calculateSettingsConfidence(profile) {
    const suctionConsistency = this.calculateConsistency(profile.suctionHistory);
    const waterConsistency = this.calculateConsistency(profile.waterHistory);
    const avgConsistency = (suctionConsistency + waterConsistency) / 2;
    return Math.round(avgConsistency * 100);
  }

  calculateConsistencyScore(profile) {
    const suctionConsistency = this.calculateConsistency(profile.suctionHistory);
    const waterConsistency = this.calculateConsistency(profile.waterHistory);
    const modeConsistency = this.calculateConsistency(profile.modeHistory);

    const avg = (suctionConsistency + waterConsistency + modeConsistency) / 3;
    return Math.round(avg * 10); // 0�10 scale
  }

  getMostCommonTimeSlot(profile) {
    if (!profile.timeSlotHistory || Object.keys(profile.timeSlotHistory).length === 0) {
      return 'morning';
    }

    let mostCommon = null;
    let maxCount = 0;

    for (const [timeSlot, count] of Object.entries(profile.timeSlotHistory)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = timeSlot;
      }
    }

    return mostCommon || 'morning';
  }

  getTimeAgoText(timestamp, language) {
    const now = Date.now();
    const diffMs = now - timestamp;

    // Special case: never cleaned or invalid timestamp
    if (!timestamp || timestamp === 0 || diffMs < 0) {
      return this.AlexaInfo[language]?.[882] || 'never';
    }

    // Convert milliseconds into various time units
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const messages = this.AlexaInfo[language] || this.AlexaInfo['EN'];

    // Time logic
    if (diffMinutes < 1) return messages[870]; // 'just now'
    if (diffMinutes < 60) return messages[871](diffMinutes); // 'X minutes ago'
    if (diffHours < 24) return messages[872](diffHours); // 'X hours ago'
    if (diffDays === 0) return messages[873]; // 'today'
    if (diffDays === 1) return messages[874]; // 'yesterday'
    if (diffDays < 7) return messages[875](diffDays); // 'X days ago'
    if (diffWeeks === 1) return messages[876]; // '1 week ago'
    if (diffWeeks < 4) return messages[877](diffWeeks); // 'X weeks ago'
    if (diffMonths === 1) return messages[878]; // '1 month ago'
    if (diffMonths < 12) return messages[879](diffMonths); // 'X months ago'
    if (diffYears === 1) return messages[880]; // '1 year ago'
    return messages[881](diffYears); // 'X years ago'
  }



  getModeText(mode, language) {
    const AlexacleanModes = this.constants.AlexacleanModes;
    const text = this.constants?.AlexacleanModes?.[language]?.[mode]
            || this.constants?.AlexacleanModes?.['EN']?.[mode];
    if (text) return text;

    return this.AlexaInfo?.[language]?.[883]?.(mode)
      || this.AlexaInfo?.['EN']?.[883]?.(mode)
      || `Mode ${mode}`;
  }

  calculateCoverageTrend(coverageHistory) {
    if (!coverageHistory || coverageHistory.length < 3) {
      return 'stable';
    }

    const recent = coverageHistory.slice(-Math.min(5, coverageHistory.length));
    const older = coverageHistory.slice(0, -recent.length);

    if (older.length === 0) return 'stable';

    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;

    if (avgRecent - avgOlder > 5) return 'improving';
    if (avgOlder - avgRecent > 5) return 'declining';
    return 'stable';
  }

  shouldGiveRecommendations(profile) {
    return profile.successfulCleanings >= 3;
  }

  hasConsistentSettings(profile) {
    const confidence = this.calculateSettingsConfidence(profile);
    return confidence >= 60;
  }

  optimizeForSpeech(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\s,/g, ',')
      .trim()
      .replace(/\./g, '.\n');
  }

  generateRecommendations(profile, language) {
    const messages = this.AlexaInfo[language];
    const recommendations = [];

    // Low coverage (866)
    if (profile.averageCoverage < 80) {
      recommendations.push(messages[866]); // Suggest increasing repetitions
    }

    // Too many repetitions (867)
    if (profile.typicalRepetitions > 2) {
      recommendations.push(messages[867]); // Suggest using stronger suction
    }

    // Night cleaning with low coverage (868)
    const timeSlot = this.getMostCommonTimeSlot(profile);
    if (timeSlot === 'night' && profile.averageCoverage < 85) {
      recommendations.push(messages[868]); // Suggest cleaning during daytime
    }

    // Everything is optimal (869)
    if (recommendations.length === 0 && profile.averageCoverage >= 85) {
      recommendations.push(messages[869]); // Suggest maintaining current settings
    }

    return recommendations;
  }

  buildDetailedAnalysisSpokenResponse(roomName, profile, infoLevel, language) {
    const messages = this.AlexaInfo[language];

	  // 0. ZEIT-BEREICHUNG F�R LETZTE REINIGUNG
    const timeAgo = this.getTimeAgoText(profile.lastCleaned, language);
    const lastCoverage = Math.round(profile.lastCoverage || 0);
    const lastModeText = this.getModeText(profile.lastMode || 5120, language);

    // 1. INTRODUCTION (828)
    let response = messages[828](roomName, profile.successfulCleanings, timeAgo, lastCoverage, lastModeText);

    // 2. PERFORMANCE DATA (830, 831)
    const avgCoverage = Math.round(profile.averageCoverage);
    const coverageQuality = this.getCoverageQualityText(avgCoverage, language);
    const successRate = this.calculateSuccessRate(profile);

    response += messages[830](avgCoverage, coverageQuality);
    response += messages[831](successRate);

    // 3. OPTIMAL SETTINGS (832, 833, 834, 835)
    if (this.hasConsistentSettings(profile)) {
      const suctionText = this.getSuctionText(profile.preferredSuction, language);
      const moppingText = this.getMoppingText(profile.preferredMopping, language);
      const confidence = this.calculateSettingsConfidence(profile);

      response += messages[832](suctionText, moppingText);

      if (confidence >= 80) {
        response += messages[833];
      } else if (confidence >= 60) {
        response += messages[834];
      }

      if (profile.typicalRepetitions > 1) {
        response += messages[835](profile.typicalRepetitions);
      }
    }

    // 4. CLEANING PATTERNS (836, 837, 838, 839, 840)
    if (infoLevel !== 'basic') {
      const commonTime = this.getMostCommonTimeSlot(profile);
      const timeText = this.getTimePatternText(commonTime, language);
      const consistency = this.calculateConsistencyScore(profile);
      const trend = this.calculateCoverageTrend(profile.coverageHistory);

      if (timeText) {
        response += messages[836](timeText);
      }

      if (consistency >= 8) {
        response += messages[837];
      } else if (consistency >= 6) {
        response += messages[838];
      }

      if (trend === 'improving') {
        response += messages[839];
      } else if (trend === 'declining') {
        response += messages[840];
      }
    }

    // 5. RECOMMENDATIONS (841, 842)
    if (this.shouldGiveRecommendations(profile)) {
      const recommendations = this.generateRecommendations(profile, language);

      if (recommendations.length === 1) {
        // Message 841 is used for a single recommendation
        response += messages[841](recommendations[0]);
      } else if (recommendations.length > 1) {
        // Message 842 is used for multiple recommendations, joined with the language-specific connector
        response += messages[842](recommendations.join(connectors[language]));
      }
    }

    // 6. CLOSING FOR LIMITED DATA (829)
    if (infoLevel === 'basic') {
      response += messages[829];
    }

    return this.optimizeForSpeech(response);
  }

  async handleRecommendationCmd(command, callback, language) {
    //this.log.info(`[LEARNING-DEBUG] Input command: "${command}"`);
    // Extract room name
    let roomName = null;
    const officialRooms = this.constants.AlexaRoomsName?.[language] || this.constants.AlexaRoomsName?.['EN'] || [];

    for (const room of officialRooms) {
      const roomLower = room.toLowerCase();
      //this.log.info(`[LEARNING-DEBUG] Checking room: "${room}" (lowercase: "${roomLower}")`);
      //this.log.info(`[LEARNING-DEBUG] Command includes "${roomLower}"? ${command.includes(roomLower)}`);
      if (command.toLowerCase().includes(room.toLowerCase())) {
        roomName = room;
        //this.log.info(`[LEARNING-DEBUG] FOUND! Room name: "${roomName}"`);
        break;
      }
    }

    if (!roomName) {
      const message = this.AlexaInfo[language][815];
      if (callback) callback(message);
      return;
    }

    const recommendation = await this.getRecommendation(roomName, language);

    if (recommendation.confidence < 40) {
      const message = this.AlexaInfo[language][812];
      if (callback) callback(message);
      return;
    }

    let message = this.AlexaInfo[language][806](
      roomName,
      recommendation.suction,
      recommendation.mopping,
      recommendation.confidence
    );

    // Add repetitions info if not 1
    if (recommendation.repetitions > 1) {
      message += ` ${this.AlexaInfo[language][10]}: ${this.AlexaInfo[language][606](recommendation.repetitions)}`;
    }

    if (callback) callback(message);
  }

  async handleClearLearning(callback, language) {
    this.roomProfiles = {};
    this.statistics.totalCleaningsTracked = 0;
    this.statistics.successfulLearnings = 0;
    this.statistics.totalRoomsLearned = 0;

    await this.saveData();

    const message = this.AlexaInfo[language][807];
    if (callback) callback(message);
  }

  async handleResetLearning(callback, language) {
    await this.initialize(this.constants);

    const message = this.AlexaInfo[language][809];
    if (callback) callback(message);
  }

  async handleLearnedRooms(callback, language) {
    const rooms = Object.keys(this.roomProfiles);

    if (rooms.length === 0) {
      const message = this.AlexaInfo[language][812];
      if (callback) callback(message);
      return;
    }

    const message = this.AlexaInfo[language][811](rooms.join(', '));
    if (callback) callback(message);
  }

  async handleConfidenceInfo(callback, language) {
    const message = this.AlexaInfo[language][801];
    if (callback) callback(message);
  }

  async handleIgnoreLast(callback, language) {
    const message = this.AlexaInfo[language][810];
    if (callback) callback(message);
  }

  async handleTypicalRepetitions(command, callback, language) {
    // Extract room name
    let roomName = null;
    const officialRooms = this.constants.AlexaRoomsName?.[language] || this.constants.AlexaRoomsName?.['EN'] || [];

    for (const room of officialRooms) {
      if (command.toLowerCase().includes(room.toLowerCase())) {
        roomName = room;
        break;
      }
    }

    if (!roomName) {
      const message = this.AlexaInfo[language][815];
      if (callback) callback(message);
      return;
    }

    const profile = this.roomProfiles[roomName];
    if (!profile) {
      const message = this.AlexaInfo[language][808](roomName);
      if (callback) callback(message);
      return;
    }

    const typicalRepetitions = profile.typicalRepetitions || 1;
    const message = this.AlexaInfo[language][826](roomName, typicalRepetitions);

    if (callback) callback(message);
  }

  async handleRepetitionsInfo(callback, language) {
    const message = this.AlexaInfo[language][825];
    if (callback) callback(message);
  }

  async handleRepeatInfo(callback, language) {
    const message = this.AlexaInfo[language][825];
    if (callback) callback(message);
  }

  // ==================== DESTROY ====================
  destroy() {
    this.stopMonitoring();  // Proper cleanup

    this.log.info('[LEARNING-SYSTEM] Destroyed');
  }
}

// Export
module.exports = LearningSystem;