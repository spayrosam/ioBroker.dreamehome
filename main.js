'use strict';
/*
 * Created with @iobroker/create-adapter v2.6.3
 */
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const axios = require('axios').default;
const Json2iob = require('json2iob');
const crypto = require('crypto');
const mqtt = require('mqtt');
const zlib = require('node:zlib');
const { createCipheriv, createDecipheriv, randomBytes, createHash } = require('crypto');
const {
  createCanvas,
  Canvas
} = require('canvas');
const {
  Image
} = require('canvas');

const {
  ResourceMonitor,
  FunctionProfiler,
  SafeMemoryManager,
  RestartManager,
  initMonitoring
} = require('./lib/resourceMonitor');

/**============> Check if canvas is installed using the following command:
cd /opt/iobroker/
npm list canvas
***============> If canvas is not installed, run the following command to install it:
cd /opt/iobroker/
npm install canvas
***============> Then, check again by running the first command to ensure that canvas is properly installed.*/

//=======================>Start Map Color
const ColorsItems = ['#abc7f8', '#e6b3ff', '#f9e07d', '#b8e3ff', '#b8d98d', '#ffb399', '#99ff99', '#4db3ff', '#80b388', '#e6b3b3', '#ff99e6', '#99e6e6', '#809980', '#e6ff80', '#ff33ff', '#ffff99', '#00b3e6', '#e6b333', '#3366e6', '#999966', '#99ff99', '#b34d4d', '#80b300', '#809900', '#6680b3', '#66991a', '#ff99e6', '#ccff1a', '#ff1a66', '#e6331a', '#33ffcc', '#66994d', '#b366cc', '#4d8000', '#b33300', '#cc80cc', '#66664d', '#991aff', '#e666ff', '#1ab399', '#e666b3', '#33991a', '#cc9999', '#b3b31a', '#00e680', '#4d8066', '#1aff33', '#999933', '#ff3380', '#cccc00', '#66e64d', '#4d80cc', '#9900b3', '#e64d66', '#4db380', '#ff4d4d', '#6666ff'];
const ColorsCarpet = ['#004080', '#003366', '#00264d', '#000080', '#000066', '#00004d', '#800080', '#660066', '#4d004d', '#602020', '#4d1919', '#391313', '#804000', '#663300', '#4d2600', '#008000', '#006600', '#004d00'];
const RoomsStrokeColor = 'black';
const RoomsLineWidth = 4;
const WallColor = 'black';
const WallStrokeColor = 'black';
const WallLineWidth = 4;
const DoorsColor = 'black';
const DoorsStrokeColor = 'black';
const DoorsLineWidth = 4;
const ChargerColor = 'green';
const ChargerStrokeColor = 'white';
const ChargerLineWidth = 3;
const CarpetColor = 'black';
const CarpetStrokeColor = 'blue';
const CarpetLineWidth = 3;
//<=================End Map Color
//=================>Start Map Settings
const fullQuality = '';
const DH_ScaleValue = 20; // Min 14 | Default 14.5
//<=================End Map Settings
//=================>Start Global
let DH_OldTaskStatus = -1, DH_NewTaskStatus = -1, DH_NowTaskStatus = -1, DH_NowStatus = -1, DH_CleanStatus = false, DH_SetLastStatus = false, DH_CompletStatus = 0;

let visitedPointsPerSegment = {}; // Memory structure: { segmentId: Set("x,y", ...) }
let lastPosition = null; // Vacuum last known position
let roomData = {}; // Stores data per room name

const WATER_TRACKING = {
  MAX_ML: 4500,                // Maximum tank capacity in milliliters
  DEFAULT_ML_PER_SQM: 26,     // Default water consumption in milliliters per square meter
  LEARNING_SAMPLES: 20,         // Number of stored consumption values for learning
  MOPPING_MODES: [5120, 5121, 5123, 3840], // Mopping modes: 5120 = Vacuum + Mop, 5121 = Mop only, 5123 = Mop after Vacuum, 3840 = Customize room cleaning
  MIN_AREA_DELTA: 0.5, // Minimum area progress (m�)
  ROOM_COOLDOWN: 30000 // 30 seconds (no updates in the same room)
};

const waterTrackingCache = {
  mode: null,
  waterLevel: null
};

// Cache for consumptionData
let consumptionDataCache = {
  data: null,
  lastUpdate: 0,
  cacheTTL: 60000 // 1 minute cache validity
};

let waterTracking = null;
let isCleaningActive = false;
let autoSaveInterval; // Autosave Controller
let firstWaterTrackingActive = false;
let firstStartWaterTrack = false;

let UserLang = 'EN';
//<=================End Global

const SegmentToName = {
  'EN': {
    0: 'Room',
    1: 'Living Room',
    2: 'Primary Bedroom',
    3: 'Study',
    4: 'Kitchen',
    5: 'Dining Hall',
    6: 'Bathroom',
    7: 'Balcony',
    8: 'Corridor',
    9: 'Utility Room',
    10: 'Closet',
    11: 'Meeting Room',
    12: 'Office',
    13: 'Fitness Area',
    14: 'Recreation Area',
    15: 'Secondary Bedroom'
  },
  'DE': {
    0: 'Raum',
    1: 'Wohnzimmer',
    2: 'Hauptschlafzimmer',
    3: 'Arbeitszimmer',
    4: 'Küche',
    5: 'Speisesaal',
    6: 'Badezimmer',
    7: 'Balkon',
    8: 'Korridor',
    9: 'Hauswirtschaftsraum',
    10: 'Schrank',
    11: 'Besprechungsraum',
    12: 'Büro',
    13: 'Fitnessbereich',
    14: 'Erholungsgebiet',
    15: 'Zweites Schlafzimmer'
  }
};

const DreameInformation = {
  'EN': {
    0: 'The currently set default Map number is set to ',
    1: 'The default Map number is missing! Forced the default Map number to be set to 0 : Error Result ',
    2: 'Unable to decode Map from MapID "',
    3: 'Unable to genarate Map from MapID "',
    4: '"! please set a valid MapId',
    5: 'The map was successfully downloaded from the cloud',
    6: 'The map was successfully downloaded from the cloud and the creation was successful. Format the file contents of ',
    7: ' and paste it into the vis HTML widget',
  },
  'DE': {
    0: 'Die aktuell eingestellte Standard-Kartennummer ist eingestellt auf ',
    1: 'Die Standardkartennummer fehlt! Die standardmäßige Kartennummer wurde auf 0 gesetzt: Fehlerergebnis ',
    2: 'Die Karte kann nicht aus MapID dekodiert werden; MapID "',
    3: 'Die Karte kann nicht aus MapID erstellt werden; MapID "' ,
    4: '"! Bitte legen Sie eine gültige MapId fest',
    5: 'Die Karte wurde erfolgreich aus der Cloud heruntergeladen',
	    6: 'Die Karte wurde erfolgreich aus der Cloud heruntergeladen und die Erstellung war erfolgreich. Formatieren Sie den Dateiinhalt von ',
    7: ' und fügen Sie ihn in das vis-HTML-Widget ein',
  }
};

const DreameVacuumErrorCode = {
  'EN': {
    '-1': 'Unknown',
    0: 'No error',
    1: 'Drop',
    2: 'Cliff',
    3: 'Bumper',
    4: 'Gesture',
    5: 'Bumper repeat',
    6: 'Drop repeat',
    7: 'Optical flow',
    8: 'Box',
    9: 'Tankbox',
    10: 'Waterbox empty',
    11: 'Box full',
    12: 'Brush',
    13: 'Side brush',
    14: 'Fan',
    15: 'Left wheel motor',
    16: 'Right wheel motor',
    17: 'Turn suffocate',
    18: 'Forward suffocate',
    19: 'Charger get',
    20: 'Battery low',
    21: 'Charge fault',
    22: 'Battery percentage',
    23: 'Heart',
    24: 'Camera occlusion',
    25: 'Move',
    26: 'Flow shielding',
    27: 'Infrared shielding',
    28: 'Charge no electric',
    29: 'Battery fault',
    30: 'Fan speed error',
    31: 'Leftwhell speed',
    32: 'Rightwhell speed',
    33: 'Bmi055 acce',
    34: 'Bmi055 gyro',
    35: 'Xv7001',
    36: 'Left magnet',
    37: 'Right magnet',
    38: 'Flow error',
    39: 'Infrared fault',
    40: 'Camera fault',
    41: 'Strong magnet',
    42: 'Water pump',
    43: 'Rtc',
    44: 'Auto key trig',
    45: 'P3v3',
    46: 'Camera idle',
    47: 'Blocked',
    48: 'Lds error',
    49: 'Lds bumper',
    50: 'Water pump 2',
    51: 'Filter blocked',
    54: 'Edge',
    55: 'Carpet',
    56: 'Laser',
    57: 'Edge 2',
    58: 'Ultrasonic',
    59: 'No go zone',
    61: 'Route',
    62: 'Route 2',
    63: 'Blocked 2',
    64: 'Blocked 3',
    65: 'Restricted',
    66: 'Restricted 2',
    67: 'Restricted 3',
    68: 'Remove mop',
    69: 'Mop removed',
    70: 'Mop removed 2',
    71: 'Mop pad stop rotate',
    72: 'Mop pad stop rotate 2',
    75: 'Unknown warning',
    101: 'Bin full',
    102: 'Bin open',
    103: 'Bin open 2',
    104: 'Bin full 2',
    105: 'Water tank',
    106: 'Dirty water tank',
    107: 'Water tank dry',
    108: 'Dirty water tank 2',
    109: 'Dirty water tank blocked',
    110: 'Dirty water tank pump',
    111: 'Mop pad',
    112: 'Wet mop pad',
    114: 'Clean mop pad',
    116: 'Clean tank level',
    117: 'Station disconnected',
    118: 'Dirty tank level',
    119: 'Washboard level',
    120: 'No mop in station',
    121: 'Dust bag full',
    122: 'Unknown warning 2',
    124: 'Washboard not working',
    1000: 'Return to charge failed'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Kein Fehler',
    1: 'Tropfen',
    2: 'Klippe',
    3: 'Stoßstange',
    4: 'Geste',
    5: 'Stoßstange wiederholen',
    6: 'Fallwiederholung',
    7: 'Optischer Fluss',
    8: 'Box',
    9: 'Tankbox',
    10: 'Wasserkasten leer',
    11: 'Kasten voll',
    12: 'Bürste',
    13: 'Seitenbürste',
    14: 'Gebläse',
    15: 'Linker Radmotor',
    16: 'Rechter Radmotor',
    17: 'Drehung ersticken',
    18: 'Vorwärts ersticken',
    19: 'Ladegerät holen',
    20: 'Batterie schwach',
    21: 'Fehler beim Aufladen',
    22: 'Prozentsatz der Batterie',
    23: 'Herz',
    24: 'Kamera verdeckt',
    25: 'Bewegung',
    26: 'Strömungsabschirmung',
    27: 'Infrarot-Abschirmung',
    28: 'Keine elektrische Ladung',
    29: 'Batteriefehler',
    30: 'Lüfterdrehzahlfehler',
    31: 'Geschwindigkeit des linken Rades',
    32: 'Geschwindigkeit des rechten Rades',
    33: 'Bmi055 acce',
    34: 'Bmi055 Kreisel',
    35: 'Xv7001',
    36: 'Linker Magnet',
    37: 'Rechter Magnet',
    38: 'Durchflussfehler',
    39: 'Infrarot-Fehler',
    40: 'Kamerafehler',
    41: 'Starker Magnet',
    42: 'Wasserpumpe',
    43: 'Rtc',
    44: 'Automatische Tastenauslösung',
    45: 'P3v3',
    46: 'Kamera im Leerlauf',
    47: 'Blockiert',
    48: 'Lds-Fehler',
    49: 'Lds-Stoßstange',
    50: 'Wasserpumpe 2',
    51: 'Filter blockiert',
    54: 'Rand',
    55: 'Teppich',
    56: 'Laser',
    57: 'Kante 2',
    58: 'Ultraschall',
    59: 'Verbotszone',
    61: 'Route',
    62: 'Route 2',
    63: 'Gesperrt 2',
    64: 'Gesperrt 3',
    65: 'Eingeschränkt',
    66: 'Eingeschränkt 2',
    67: 'Eingeschränkt 3',
    68: 'Mopp entfernen',
    69: 'Mopp entfernt',
    70: 'Wischmopp entfernt 2',
    71: 'Mop-Pad stoppt Drehung',
    72: 'Mop-Pad stoppt Drehung 2',
    75: 'Unbekannte Warnung',
    101: 'Behälter voll',
    102: 'Behälter offen',
    103: 'Behälter offen 2',
    104: 'Behälter voll 2',
    105: 'Wassertank',
    106: 'Wassertank verschmutzt',
    107: 'Wassertank trocken',
    108: 'Wassertank verschmutzt 2',
    109: 'Schmutzwassertank blockiert',
    110: 'Schmutzwassertankpumpe',
    111: 'Wischmopp',
    112: 'Wischmopp nass',
    114: 'Mop-Pad reinigen',
    116: 'Tankfüllstand reinigen',
    117: 'Station abgekoppelt',
    118: 'Füllstand des verschmutzten Tanks',
    119: 'Füllstand Waschbrett',
    120: 'Kein Mopp in Station',
    121: 'Staubsaugerbeutel voll',
    122: 'Unbekannte Warnung 2',
    124: 'Waschtisch funktioniert nicht',
    1000: 'Rückkehr zur Ladung fehlgeschlagen'
  }
};
const DreameVacuumState = {
  'EN': {
    '-1': 'Unknown',
    1: 'Sweeping',
    2: 'Idle',
    3: 'Paused',
    4: 'Error',
    5: 'Returning',
    6: 'Charging',
    7: 'Mopping',
    8: 'Drying',
    9: 'Washing',
    10: 'Returning to wash',
    11: 'Building',
    12: 'Sweeping and mopping',
    13: 'Charging completed',
    14: 'Upgrading',
    15: 'Clean summon',
    16: 'Station reset',
    17: 'Returning install mop',
    18: 'Returning remove mop',
    19: 'Water check',
    20: 'Add clean water',
    21: 'Washing paused',
    22: 'Auto emptying',
    23: 'Remote control',
    24: 'Smart charging',
    25: 'Second cleaning',
    26: 'Human following',
    27: 'Spot cleaning',
    28: 'Returning auto empty',
    97: 'Shortcut',
    98: 'Monitoring',
    99: 'Monitoring paused'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Staubsaugen',
    2: 'Leerlauf',
    3: 'Pausiert',
    4: 'Fehler',
    5: 'Zurückkehrend',
    6: 'Aufladen',
    7: 'Wischen',
    8: 'Trocknen',
    9: 'Waschen',
    10: 'Zurückkehren zum Waschen',
    11: 'Bauen',
    12: 'Staubsaugen und Wischen',
    13: 'Aufladen abgeschlossen',
    14: 'Aufrüsten',
    15: 'Saubere Aufforderung',
    16: 'Station zurücksetzen',
    17: 'Rückgabe Mopp installieren',
    18: 'Rückgabe Mopp entfernen',
    19: 'Wasser prüfen',
    20: 'Sauberes Wasser hinzufügen',
    21: 'Waschen pausiert',
    22: 'Automatische Entleerung',
    23: 'Fernsteuerung',
    24: 'Intelligentes Laden',
    25: 'Zweite Reinigung',
    26: 'Menschliches Folgen',
    27: 'Punktuelle Reinigung',
    28: 'Automatisch leer zurückkehren',
    97: 'Abkürzung',
    98: 'Überwachung',
    99: 'Überwachung pausiert'
  }
};
const DreameTaskStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Completed',
    1: 'Auto cleaning',
    2: 'Zone cleaning',
    3: 'Segment cleaning',
    4: 'Spot cleaning',
    5: 'Fast mapping',
    6: 'Auto cleaning paused',
    7: 'Zone cleaning paused',
    8: 'Segment cleaning paused',
    9: 'Spot cleaning paused',
    10: 'Map cleaning paused',
    11: 'Docking paused',
    12: 'Mopping paused',
    13: 'Segment mopping paused',
    14: 'Zone mopping paused',
    15: 'Auto mopping paused',
    16: 'Auto docking paused',
    17: 'Segment docking paused',
    18: 'Zone docking paused',
    20: 'Cruising path',
    21: 'Cruising path paused',
    22: 'Cruising point',
    23: 'Cruising point paused',
    24: 'Summon clean paused',
    25: 'Returning install mop',
    26: 'Returning remove mop'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Abgeschlossen',
    1: 'Automatische Reinigung',
    2: 'Zonenreinigung',
    3: 'Segment-Reinigung',
    4: 'Punktuelle Reinigung',
    5: 'Schnelles Mapping',
    6: 'Automatische Reinigung pausiert',
    7: 'Zonenreinigung unterbrochen',
    8: 'Segmentreinigung unterbrochen',
    9: 'Punktuelle Reinigung unterbrochen',
    10: 'Kartenreinigung pausiert',
    11: 'Andocken unterbrochen',
    12: 'Wischen pausiert',
    13: 'Segmentwischen pausiert',
    14: 'Zonenwischen pausiert',
    15: 'Automatisches Wischen pausiert',
    16: 'Automatisches Andocken pausiert',
    17: 'Segment Andocken pausiert',
    18: 'Zonendocking pausiert',
    20: 'Kreuzfahrtstrecke',
    21: 'Fahrtroute pausiert',
    22: 'Kreuzungspunkt',
    23: 'Kreuzungspunkt pausiert',
    24: 'Saubere Beschwörung pausiert',
    25: 'Rückgabe Mopp installieren',
    26: 'Rückgabe Mopp entfernen'
  }
};
const DreameStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Idle',
    1: 'Paused',
    2: 'Cleaning',
    3: 'Back home',
    4: 'Part cleaning',
    5: 'Follow wall',
    6: 'Charging',
    7: 'Ota',
    8: 'Fct',
    9: 'Wifi set',
    10: 'Power off',
    11: 'Factory',
    12: 'Error',
    13: 'Remote control',
    14: 'Sleeping',
    15: 'Self test',
    16: 'Factory funcion test',
    17: 'Standby',
    18: 'Segment cleaning',
    19: 'Zone cleaning',
    20: 'Spot cleaning',
    21: 'Fast mapping',
    22: 'Cruising path',
    23: 'Cruising point',
    24: 'Summon clean',
    25: 'Shortcut',
    26: 'Person follow',
    1501: 'Water check'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leerlauf',
    1: 'Pausiert',
    2: 'Reinigung',
    3: 'Zurück nach Hause',
    4: 'Teilreinigung',
    5: 'Wand folgen',
    6: 'Aufladen',
    7: 'Ota',
    8: 'Fct',
    9: 'Wifi einstellen',
    10: 'Ausschalten',
    11: 'Werk',
    12: 'Fehler',
    13: 'Fernsteuerung',
    14: 'Schlafend',
    15: 'Selbsttest',
    16: 'Werksfunktionstest',
    17: 'Bereitschaft',
    18: 'Segment-Reinigung',
    19: 'Zonenreinigung',
    20: 'Punktuelle Reinigung',
    21: 'Schnelles Mapping',
    22: 'Fahrtroute',
    23: 'Kreuzungspunkt',
    24: 'Bereinigung herbeirufen',
    25: 'Abkürzung',
    26: 'Person folgen',
    1501: 'Wasserprüfung'
  }
};
const DreameSuctionLevel = {
  'EN': {
    '-1': 'Unknown',
    0: 'Quiet',
    1: 'Standard',
    2: 'Strong',
    3: 'Turbo'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leise',
    1: 'Standard',
    2: 'Stark',
    3: 'Turbo'
  }
};

const DreameSetWaterVolume = {
  'EN': { '-1': 'Unknown' },
  'DE': { '-1': 'Unbekannt' }
};

// Define water volume levels with upper limits and corresponding labels
const waterLevels = [
  { limit: 6, EN: 'Low', DE: 'Niedrig' },
  { limit: 17, EN: 'Middle', DE: 'Mittel' },
  { limit: 28, EN: 'Height', DE: 'Hoch' },
  { limit: 33, EN: 'Ultra', DE: 'Ultra' }
];

// Assign readable values for each water volume index
for (let i = 1; i < 33; i++) {
  for (const level of waterLevels) {
    if (i < level.limit) {
      DreameSetWaterVolume['EN'][i] = `${level.EN} ${i}`;
      DreameSetWaterVolume['DE'][i] = `${level.DE} ${i}`;
      break; // Stop checking further levels once a match is found
    }
  }
}

const DreameSetRoute = {
  'EN': {
    '-1': 'Unknown',
    1: 'Standard',
    2: 'Intensive',
    3: 'Deep',
    4: 'Quick',
    546: 'Standard2',
    512: 'Quick2',
    768: 'Deep2'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Standard',
    2: 'Intensiv',
    3: 'Tief',
    4: 'Schnell',
    546: 'Standard2',
    512: 'Schnell2',
    768: 'Tief2'
  }
};

const DreameSetCleanRoom = {
  'EN': {
    '-1': 'Unknown',
    1: 'Yes',
    2: 'No'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Ja',
    2: 'Nein'
  }
};

const DreameSetRepeat = {
  'EN': {
    '-1': 'Unknown',
    1: '1',
    2: '2',
    3: '3'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: '1',
    2: '2',
    3: '3'
  }
};
const DreameWaterVolume = {
  'EN': {
    '-1': 'Unknown',
    1: 'Low',
    2: 'Medium',
    3: 'High'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Niedrig',
    2: 'Mittel',
    3: 'Hoch'
  }
};
const DreameCarpetSensitivity = {
  'EN': {
    '-1': 'Unknown',
    1: 'Low',
    2: 'Medium',
    3: 'High'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Niedrig',
    2: 'Mittel',
    3: 'Hoch'
  }
};
const DreameAutoDustCollecting = {
  'EN': {
    '-1': 'Unknown',
    0: 'Inactive',
    1: 'Standard',
    2: 'High frequency',
    3: 'Low frequency'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Inaktiv',
    1: 'Standard',
    2: 'Hohe Frequenz',
    3: 'Niedrige Frequenz'
  }
};
const DreameAutoEmptyStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Idle',
    1: 'Active',
    2: 'Not Performed'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leerlauf',
    1: 'Aktiv',
    2: 'Nicht ausgeführt'
  }
};
const DreameSelfWashBaseStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Idle',
    1: 'Washing',
    2: 'Drying',
    3: 'Returning',
    4: 'Paused',
    5: 'Add clean water',
    6: 'Adding Water'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leerlauf',
    1: 'Waschen',
    2: 'Trocknen',
    3: 'Rücklauf',
    4: 'Pausiert',
    5: 'Sauberes Wasser hinzufügen',
    6: 'Wasser zugeben'
  }
};
const DreameMopWashLevel = {
  'EN': {
    '-1': 'Unknown',
    0: 'Light',
    1: 'Standard',
    2: 'Deep'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leicht',
    1: 'Standard',
    2: 'Tief'
  }
};
const DreameCarpetAvoidance = {
  'EN': {
    '-1': 'Unknown',
    1: 'Avoid',
    2: 'Lifting the mop',
    3: 'Remove mop',
    5: 'Vacuum and Mop',
    6: 'Ignore'
  },
  'DE': {
    1: 'Vermeiden',
    2: 'Mopp anheben',
    3: 'Mopp entfernen',
    5: 'Saugen und wischen',
    6: 'Ignorieren'
  }
};
const DreameCleaningMode = {
  'EN': {
    '-1': 'Unknown',
    5122: 'Sweeping',
    5121: 'Mopping',
    5120: 'Sweeping and mopping',
    5123: 'Mopping after sweeping',
    3840: 'Customize room cleaning'
  },
  'DE': {
    '-1': 'Unbekannt',
    5122: 'Staubsaugen',
    5121: 'Wischen',
    5120: 'Saugen und Wischen',
    5123: 'Wischen nach dem Saugen',
    3840: 'Raumreinigung anpassen'
  }
};
// Map the values as per the user's defined cleaning modes
const modeMapping = {
  0: 5122, // Sweeping
  1: 5121, // Mopping
  2: 5120, // Sweeping and mopping
  3: 5123  // Mopping after sweeping
};

const DreameChargingStatus = {
  'EN': {
    '-1': 'Unknown',
    1: 'Charging',
    2: 'Not charging',
    3: 'Charging completed',
    5: 'Return to charge'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Aufladen',
    2: 'Nicht geladen',
    3: 'Aufladung abgeschlossen',
    5: 'Rückkehr zum Laden'
  }
};
const DreameWaterTank = {
  'EN': {
    '-1': 'Unknown',
    0: 'Not installed',
    1: 'Installed',
    10: 'Mop installed',
    99: 'Mop in station'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Nicht installiert',
    1: 'Installiert',
    10: 'Mopp installiert',
    99: 'Mopp in Station'
  }
};

const DreameDirtyWaterTank = {
  'EN': {
    '-1': 'Unknown',
    0: 'Installed',
    1: 'Not installed',
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Installiert',
    1: 'Nicht installiert',
  }
};

const DreamePureWaterTank = {
  'EN': {
    '-1': 'Unknown',
    0: 'Tank not installed',
    2: 'No water left',
    3: 'No warning',
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Tank nicht installiert',
    2: 'Kein Wasser mehr',
    3: 'Keine Warnung',
  }
};

const DreameLowWaterWarning = {
  'EN': {
    '-1': 'Unknown',
    0: 'No warning',
    1: 'No water left dismiss',
    2: 'No water left',
    3: 'No water left after clean',
    4: 'No water for clean',
    5: 'Low water',
    6: 'Tank not installed'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Keine Warnung',
    1: 'Kein Wasser übrig, verwerfen',
    2: 'Kein Wasser mehr',
    3: 'Nach der Reinigung ist kein Wasser mehr übrig',
    4: 'Kein Wasser zum Reinigen',
    5: 'Niedrigwasser',
    6: 'Tank nicht installiert'
  }
};
const DreameStateCustomProperties = {
  'Unknown': 'Current room cleaning name',
  '-1': 'Current room cleaning number',
  '0': 'Current room coverage percent'
};
const DreameStateProperties = {
  'S2P1': 'State',
  'S2P2': 'Error',
  'S3P1': 'Battery level',
  'S3P2': 'Charging status',
  'S4P1': 'Status',
  'S4P2': 'Cleaning time',
  'S4P3': 'Cleaned area',
  'S4P4': 'Suction level',
  'S4P5': 'Water volume',
  'S4P6': 'Water tank',
  'S4P7': 'Task status',
  'S4P8': 'Cleaning start time',
  'S4P9': 'Clean log file name',
  'S4P10': 'Cleaning properties',
  'S4P11': 'Resume cleaning',
  'S4P12': 'Carpet boost',
  'S4P13': 'Clean log status',
  'S4P14': 'Serial number',
  'S4P15': 'Remote control',
  'S4P16': 'Mop cleaning remainder',
  'S4P17': 'Cleaning paused',
  'S4P18': 'Faults',
  'S4P19': 'Nation matched',
  'S4P20': 'Relocation status',
  'S4P21': 'Obstacle avoidance',
  'S4P22': 'Ai detection',
  'S4P23': 'Cleaning mode',
  'S4P24': 'Upload map',
  'S4P25': 'Self wash base status',
  'S4P26': 'Customized cleaning',
  'S4P27': 'Child lock',
  'S4P28': 'Carpet sensitivity',
  'S4P29': 'Tight mopping',
  'S4P30': 'Cleaning cancel',
  'S4P31': 'Y clean',
  'S4P32': 'Water electrolysis',
  'S4P33': 'Carpet recognition',
  'S4P34': 'Self clean',
  'S4P35': 'Warn status',
  'S4P36': 'Carpet avoidance',
  'S4P37': 'Auto add detergent',
  'S4P38': 'Capability',
  'S4P39': 'Save water tips',
  'S4P40': 'Drying time',
  'S4P41': 'Low water warning',
  'S4P45': 'Auto mount mop',
  'S4P46': 'Mop wash level',
  'S4P47': 'Scheduled clean',
  'S4P48': 'Quick command',
  'S4P49': 'Intelligent recognition',
  'S4P50': 'Auto switch settings',
  'S4P51': 'Auto water refilling',
  'S4P52': 'Mop in station',
  'S4P53': 'Mop pad installed',
  'S4P63': 'Cleaning completed',
  'S4P64': 'Current charging',
  'S4P99': 'Combined data',
  'S5P1': 'Dnd',
  'S5P2': 'Dnd start',
  'S5P3': 'Dnd end',
  'S5P4': 'Dnd task',
  'S5P58': 'Mop retracted extended',
  'S6P1': 'Map data',
  'S6P2': 'Frame info',
  'S6P3': 'Object name',
  'S6P4': 'Map extend data',
  'S6P5': 'Robot time',
  'S6P6': 'Result code',
  'S6P7': 'Multi floor map',
  'S6P8': 'Map list',
  'S6P9': 'Recovery map list',
  'S6P10': 'Map recovery',
  'S6P11': 'Map recovery status',
  'S6P13': 'Old map data',
  'S6P14': 'Backup map status',
  'S6P15': 'Wifi map',
  'S7P1': 'Volume',
  'S7P2': 'Voice packet id',
  'S7P3': 'Voice change status',
  'S7P4': 'Voice change',
  'S8P1': 'Timezone',
  'S8P2': 'Schedule',
  'S8P3': 'Schedule id',
  'S8P4': 'Schedule cancel reason',
  'S8P5': 'Cruise schedule',
  'S9P1': 'Main brush time left',
  'S9P2': 'Main brush left',
  'S10P1': 'Side brush time left',
  'S10P2': 'Side brush left',
  'S11P1': 'Filter left',
  'S11P2': 'Filter time left',
  'S12P1': 'First cleaning date',
  'S12P2': 'Total cleaning time',
  'S12P3': 'Cleaning count',
  'S12P4': 'Total cleaned area',
  'S13P1': 'Map saving',
  'S15P1': 'Auto dust collecting',
  'S15P2': 'Auto empty frequency',
  'S15P3': 'Dust collection',
  'S15P5': 'Auto empty status',
  'S16P1': 'Sensor left',
  'S16P2': 'Sensor time left',
  'S18P1': 'Mop pad left',
  'S18P2': 'Mop pad time left',
  'S19P1': 'Silver ion time left',
  'S19P2': 'Silver ion left',
  'S20P1': 'Detergent left',
  'S20P2': 'Detergent time left',
  'S27P1': 'Pure water tank',
  'S27P2': 'Dirty water tank',
  'S28P2': 'Clean carpet first',
  'S99P98': 'Cleaning towards the floor',
  'S10001P1': 'Stream status',
  'S10001P2': 'Stream audio',
  'S10001P4': 'Stream record',
  'S10001P5': 'Take photo',
  'S10001P6': 'Stream keep alive',
  'S10001P7': 'Stream fault',
  'S10001P9': 'Camera brightness',
  'S10001P10': 'Camera light',
  'S10001P101': 'Stream cruise point',
  'S10001P99': 'Stream property',
  'S10001P103': 'Stream task',
  'S10001P1003': 'Stream upload',
  'S10001P1100': 'Stream code',
  'S10001P1101': 'Stream set code',
  'S10001P1102': 'Stream verify code',
  'S10001P1103': 'Stream reset code',
  'S10001P2003': 'Stream space'
};
const DreameActionProperties = {
  'S2A1': 'Start',
  'S2A2': 'Pause',
  'S3A1': 'Charge',
  'S3P3C1': 'Off-peack Charging',
  'S4A1': 'Start custom',
  'S4A1C1': 'Start zone cleaning',
  'S4A1C2': 'Start points cleaning',
  'S4A1C3': 'Fast mapping',
  'S4A2C1': 'Stop',
  'S4A3': 'Clear warning',
  'S4A4': 'Start washing',
  'S4P4E1': 'Suction level',
  'S4P5E1': 'Water volume',
  //"S4A6": "Get photo info",
  'S4A8': 'Shortcuts',
  'S4P11E1': 'Resume Cleane Mode',
  'S4P23E1': 'Cleaning mode',
  'S4P27E1': 'Child lock',
  'S4P37E1': 'Auto add detergent',
  'S4P45E1': 'Auto mount mop',
  'S4P49E1': 'Map Switching methode',
  'S4P50C1': 'Auto switch settings',
  'S4P50E2': 'Clean Genius',
  'S4P50E3': 'Auto Rewashing',
  'S4P50E4': 'Auto recleaning',
  'S4P50E5': 'Carpet Boost',
  'S4P50E6': 'Intensive Carpet cleaning',
  'S4P50E7': 'AI driven MopExtend',
  'S4P50E8': 'Mop Extension for Gap cleaning',
  'S4P50E9': 'Intensive Cleaning for Furniture Legs',
  'S4P50E10': 'Fill Light',
  'S4P50E11': 'Collision-Avoidance Mode',
  'S4P50E12': 'Clean Route',
  'S4P50E13': 'Live Video Prompts',
  'S4P50E14': 'Suction Max Plus',
  'S6A1': 'Request map',
  'S6A2': 'Update map data',
  'S6A2C1': 'Change map',
  'S6A2C2': 'Rename map',
  'S6A2C3': 'Delete map',
  'S6A2C4': 'Rotate map',
  'S6A2C5': 'Clean Order',
  'S6A3': 'Backup map',
  'S6A4': 'Wifi map',
  'S7A1': 'Locate',
  'S7P1E1': 'Volume',
  'S7A2': 'Test sound',
  'S8A1': 'Delete schedule',
  'S8A2': 'Delete cruise schedule',
  'S9A1': 'Reset main brush',
  'S10A1': 'Reset side brush',
  'S11A1': 'Reset filter',
  'S16A1': 'Reset sensor',
  'S15A1': 'Start auto empty',
  'S17A1': 'Reset secondary filter',
  'S18A1': 'Reset mop pad',
  'S19A1': 'Reset silver ion',
  'S20A1': 'Reset detergent',
  //"S10001A1": "Stream video",
  //"S10001A2": "Stream audio",
  //"S10001A3": "Stream property",
  //"S10001A4": "Stream code"
};

const DreameActionParams = {
  'S2A1': 'false', // Start
  'S2A2': 'false', // Pause
  'S3A1': 'false', // Charge
  'S3P3C1': [{'siid':3,'piid':3,'value':'{"enable":false,"startTime":"22:00","endTime":"08:00"}'}],// Off-peack Charging
  'S4A1': [{'piid': 1,'value': 18},{'piid': 10,'value': '{"selects": [[1,1,3,2,1]]}'}], //Start custom
  'S4A1C1': [{'piid': 1,'value': 19},{'piid': 10,'value': '{"areas": [[-525,475,1225,3025,3,0,2]]}'}], //Start zone cleaning X1,Y1,X2,Y2,Repeat,SuctionLevel,WaterVolume => X -525,1225 Y 475,3025 W 1750 H 2550
  'S4A1C2': [{'piid': 1,'value': 19},{'piid': 10,'value': '{"points": [[-525,475,3,0,2]]}'}], //Start points cleaning X,Y,Repeat,SuctionLevel,WaterVolume => X -525 Y 1225
  'S4A1C3': [{'value': 21}], // Fast mapping
  'S4A2C1': 'false', // Stop
  'S4A3': 'false', // Clear warning
  'S4A4': 'false', // Start washing
  'S4P4E1': [{'siid':4,'piid':4,'value': 2}], //Suction level   0: "Quiet" 1: "Standard" 2: "Strong" 3: "Turbo"
  'S4P5E1': [{'siid':4,'piid':5,'value': 2}], //Water volume  1: "Low" 2: "Medium" 3: "High"
  //"S4A6": "false", // Get photo info
  'S4A8': 'false', // Shortcuts
  'S4P11E1': [{'siid':4,'piid':11,'value': 1}], //Resume Cleane Mode 0: off 1: on
  'S4P23E1': [{'siid':4,'piid':23,'value':5123}], //Cleaning mode 5120: vac & mop 5121: mop 5122: vacuum 5123: mop after Vac [{"siid":4,"piid":26,"value":1}] Customize room cleaning 1 On 0: off
  'S4P27E1': [{'siid':4,'piid':27,'value': 1}], //Child lock 0: off 1: on
  'S4P37E1':  [{'siid':4,'piid':37,'value': 1}], //Auto add detergent  0: off 1: on
  'S4P45E1': [{'siid':4,'piid':45,'value': 1}], //Auto mount mop 0: off 1: on
  'S4P49E1': [{'siid':4,'piid':49,'value':1}], // Map Switching methode: 0: Manual 1: intelligent
  'S4P50C1': [{'siid':4,'piid':50,'value': '{"k":"AutoDry","v":1},{"k":"SmartAutoWash","v":2},{"k":"CarpetOnlyClean","v":1},{"k":"MopEffectSwitch","v":1},{"k":"FluctuationTestResult","v":0},{"k":"CleanRoute","v":1},{"k":"SuperWash","v":0},{"k":"MopScalable","v":2},{"k":"SuctionMax","v":0},{"k":"LessColl","v":1},{"k":"CarpetFineClean","v":1},{"k":"FillinLight","v":1},{"k":"MonitorHumanFollow","v":0},{"k":"MopScalableVersion","v":0},{"k":"SmartDrying","v":0},{"k":"LacuneMopScalable","v":1},{"k":"HotWash","v":1},{"k":"CleanType","v":0},{"k":"DetergentNote","v":1},{"k":"MeticulousTwist","v":-7},{"k":"MopEffectState","v":3},{"k":"MaterialDirectionClean","v":0},{"k":"PetPartClean","v":0},{"k":"RobotCarpetPressEnable","v":1},{"k":"MopScalable2","v":1},{"k":"MonitorPromptLevel","v":1},{"k":"UVLight","v":0},{"k":"MopFullyScalable","v":0},{"k":"StainIdentify","v":1},{"k":"SmartAutoMop","v":2},{"k":"SmartCharge","v":1},{"k":"FluctuationConfirmResult","v":0},{"k":"SmartHost","v":0}'}],// Auto switch settings
  'S4P50E2': [{'siid':4,'piid':50,'value': '{"k":"SmartHost","v":1}'}], //"Clean Genius",
  'S4P50E3': [{'siid':4,'piid':50,'value': '{"k":"SmartAutoWash","v":1}'}], //SmartAutoWash 0: off 1: works in Deep Mode 2: Works in Routine & Deep Mode
  'S4P50E4': [{'siid':4,'piid':50,'value': '{"k":"SmartAutoMop","v":1}'}], //SmartAutoMop 0: off 1: works in Deep Mode 2: Works in Routine & Deep Mode
  'S4P50E5': [{'siid':4,'piid':50,'value': '{"k":"RobotCarpetPressEnable","v":1}'}], //Carpet Boost / RobotCarpetPressEnable 0: Off 1: On
  'S4P50E6': [{'siid':4,'piid':50,'value': '{"k":"CarpetFineClean","v":1}'}], //Intensive Carpet cleaning / CarpetFineClean 0: Off 1: On
  'S4P50E7': [{'siid':4,'piid':50,'value': '{"k":"MopScalable","v":1}'}], //MopScalable 1: Intelligence 7: Standard 2: High frequency
  'S4P50E8': [{'siid':4,'piid':50,'value': '{"k":"LacuneMopScalable","v":1}'}], //Mop Extension for Gap cleaning / LacuneMopScalable 0: off 1: on
  'S4P50E9': [{'siid':4,'piid':50,'value': '{"k":"MopScalable2","v":1}'}], //Intensive Cleaning for Furniture Legs / MopScalable2 0: off 1: on
  'S4P50E10': [{'siid':4,'piid':50,'value': '{"k":"FillinLight","v":1}'}], //FillinLight 0: off 1: on
  'S4P50E11': [{'siid':4,'piid':50,'value': '{"k":"LessColl","v":1}'}], //Collision-Avoidance Mode / LessColl 0: off 1: on
  'S4P50E12': [{'siid':4,'piid':50,'value': '{"k":"CleanRoute","v":1}'}], //CleanRoute 0: off 1: on
  'S4P50E13': [{'siid':4,'piid':50,'value': '{"k":"MonitorPromptLevel","v":1}'}], //Live Video Prompts 0: Weak 1: Strong
  'S4P50E14': [{'siid':4,'piid':50,'value': '{"k":"SuctionMax","v":1}'}], //Suction Max Plus 0: off 1: on
  'S6A1': [{'piid': 2,'value': '{"req_type":1,"frame_type":"I","force_type":1}'}], // Request map
  'S6A2': [{'piid': 4,'value':'{"customeClean":[[1,2,27,2,2,2]]}'}], // Update map data | Room Settings | 1: Segment, 2: Suction Level, 27 Water volume, 2: Cleaning Times, 2: Cleaning Mode, 2: Route
  'S6A2C1': [{'piid': 4,'value': '{"sm":{},"mapid":map_id}'}], // Update map data | Change map:
  'S6A2C2': [{'piid': 4,'value': '{"nrism":{"map_id":{"name":"New_name"}}}'}],  // Update map data | Rename map: "{\"nrism\":{\"292\":{\"name\":\"Test\"}}}"
  'S6A2C3': [{'piid': 4,'value': '{"cm":{},"mapid":map_id}'}], // Update map data | Delete map
  'S6A2C4': [{'piid': 4,'value': '{"smra":{"map_id":{"ra":90}}}'}], // Update map data | Rotate map
  'S6A2C5': [{'piid': 4,'value':'{"cleanOrder":[1,2,3]}'}], // Update map data | cleanOrder
  'S6A3': 'false', // Backup map
  'S6A4': 'false', // Wifi map
  'S7A1': 'false', // Locate
  'S7P1E1': [{'siid':7,'piid':1,'value': 60}], //Volume 1 to 100
  'S7A2': 'false', // Test sound
  'S8A1': 'false', // Delete schedule
  'S8A2': 'false', // Delete cruise schedule
  'S9A1': 'false', // Reset main brush
  'S10A1': 'false', // Reset side brush
  'S11A1': 'false', // Reset filter
  'S16A1': 'false', // Reset sensor
  'S15A1': 'false', // Start auto empty
  'S17A1': 'false', // Reset secondary filter
  'S18A1': 'false', // Reset mop pad
  'S18A1C1': [{'piid': 1,'value': 19},{'piid': 21,'value': '-525,475,1225,3025'}], //Start zone cleaning \"areas\": [[-525,475,1225,3025,3,0,2]]
  'S19A1': 'false', // Reset silver ion
  'S20A1': 'false', // Reset detergent
  //"S10001A1": "false", // Stream video
  //"S10001A2": "false", // Stream audio
  //"S10001A3": "false", // Stream property
  //"S10001A4": "false", // Stream code
};

const DreameActionExteParams = {
  'S4P4E1': {'EN': {0: 'Quiet', 1: 'Standard', 2: 'Strong', 3: 'Turbo' }, 'DE': {0: 'Leise', 1: 'Standard', 2: 'Stark', 3: 'Turbo'}}, //Suction level   0: "Quiet" 1: "Standard" 2: "Strong" 3: "Turbo"
  'S4P5E1': {'EN': {1: 'Low', 2: 'Medium', 3: 'High'}, 'DE': {1: 'Niedrig', 2: 'Mittel', 3: 'Hoch'}}, //Water volume  1: "Low" 2: "Medium" 3: "High"
  'S4P11E1': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}},//Resume Cleane Mode 0: off 1: on
  'S4P23E1': {'EN': {1: 'Customize room cleaning', 5120: 'Sweeping and mopping', 5121: 'Mopping', 5122: 'Sweeping', 5123: 'Mopping after sweeping'},
	    'DE': {1: 'Raumreinigung anpassen', 5120: 'Saugen und Wischen', 5121: 'Wischen', 5122: 'Staubsaugen', 5123: 'Wischen nach dem Saugen'}}, //Cleaning mode 5120: vac & mop 5121: mop 5122: vacuum 5123: mop after Vac [{"siid":4,"piid":26,"value":1}] Customize room cleaning 1 On 0: off
  'S4P27E1': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Child lock 0: off 1: on
  'S4P37E1':  {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Auto add detergent  0: off 1: on
  'S4P45E1': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Auto mount mop 0: off 1: on
  'S4P49E1': {'EN': {0: 'Manually', 1: 'intelligent'}, 'DE': {0: 'Manuell', 1: 'intelligent'}}, // Map Switching methode: 0: Manually 1: intelligent
  'S4P50E2': {'EN': {0: 'Off', 1: 'Routine Cleaning', 2: 'Deep Cleaning'}, 'DE': {0: 'Aus', 1: 'Routinereinigungsmodus', 2: 'Tiefenreinigungsmodus'}}, //"Clean Genius",
  'S4P50E3': {'EN': {0: 'Off', 1: 'active in deep cleaning mode', 2: 'active in deep and routine cleaning mode'}, 'DE': {0: 'Aus', 1: 'aktiv im Tiefenreinigungsmodus',
    2: 'aktiv im Tiefen- und Routinereinigungsmodus'}}, //SmartAutoWash 0: off 1: works in Deep Mode 2: Works in Routine & Deep Mode
  'S4P50E4': {'EN': {0: 'Off', 1: 'active in deep cleaning mode', 2: 'active in deep and routine cleaning mode'}, 'DE': {0: 'Aus', 1: 'aktiv im Tiefenreinigungsmodus',
    2: 'aktiv im Tiefen- und Routinereinigungsmodus'}}, //SmartAutoMop 0: off 1: works in Deep Mode 2: Works in Routine & Deep Mode
  'S4P50E5': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Carpet Boost / RobotCarpetPressEnable 0: Off 1: On
  'S4P50E6': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Intensive Carpet cleaning / CarpetFineClean 0: Off 1: On
  'S4P50E7': {'EN': {0: 'Intelligence', 7: 'Standard', 2: 'High frequency'}, 'DE': {0: 'Intelligenz', 7: 'Standard', 2: 'Hochfrequenz'}}, //MopScalable 1: Intelligence 7: Standard 2: High frequency
  'S4P50E8': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Mop Extension for Gap cleaning / LacuneMopScalable 0: off 1: on
  'S4P50E9': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Intensive Cleaning for Furniture Legs / MopScalable2 0: off 1: on
  'S4P50E10': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //FillinLight 0: off 1: on
  'S4P50E11': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Collision-Avoidance Mode / LessColl 0: off 1: on
  'S4P50E12': {'EN': {0: 'Off', 1: 'Standard', 2: 'Intensive', 3: 'Deep', 4: 'Quick'}, 'DE': {0: 'Aus', 1: 'Standard', 2: 'Intensiv', 3: 'Tief', 4: 'Schnell'}}, //CleanRoute 01: Standard 2: Intensive 3: Deep, 4: Quick
  'S4P50E13': {'EN': {0: 'The camera is blinking', 1: 'Voice prompts'}, 'DE': {0: 'Die Kameraanzeige blinkt', 1: 'Sprachansagen'}}, //Live Video Prompts 0: Weak 1: Strong
  'S4P50E14': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Suction Max Plus 0: off 1: on
  'S7P1E1': {'EN': {0: 'Min', 100: 'Max'}, 'DE': {0: 'Min', 100: 'Max'}}, //Volume 1 to 100
};

const DreameDropdownCommands = {
  'EN': {
    'Start': 'Start cleaning',
    'Stop': 'Stop',
    'Pause': 'Pause',
    'Charge': 'Return to charge'
  },
  'DE': {
    'Start': 'Reinigung starten',
    'Stop': 'Stopp',
    'Pause': 'Pause',
    'Charge': 'Zurück zur Ladestation'
  }
};

let LogData; // = false;
let AlexaIsPresent = false;
const waitingvalue = 500; //Variable to store the time difference when waiting for the next command
let lastCommandTime = 0;  // Variable to store the timestamp of the last processed command
let currentTime = Date.now();
let timeDiff = currentTime - lastCommandTime;  // Calculate the time difference
let isAbortCommandReceived = false; // Flag to track if the abort command has been received
let isMonitorCleaningState = false; // Monitor the cleaning status
let isComponentsSayState = false; // Monitor the components status
let isComponentsResetAllState = false; // Monitor whether all reset components are active
let isComponentsResetOneState = false; // Monitor whether a reset component is active
const Alexarooms = [];
let IsalexaSpeakMode = 3;
const Alexanumbers = {
  'one': 1,
  'two': 2,
  'three': 3,
  'ein': 1,
  'zwei': 2,
  'drei': 3
};
const suctionLevels = {
  'EN': ['quiet', 'standard', 'strong', 'maximum'],
  'DE': ['leise', 'standard', 'stark', 'turbo']
};

const suctionSynonyms = {
  'EN': {
    'light': 'quiet',
    'quiet': 'quiet',
    'silent': 'quiet',
    'low': 'quiet',
    'soft': 'quiet',
    'eco': 'quiet',
    'gentle': 'quiet',
    'whisper': 'quiet',

    'medium': 'standard',
    'normal': 'standard',
    'standard': 'standard',
    'regular': 'standard',
    'default': 'standard',

    'strong': 'strong',
    'high': 'strong',
    'powerful': 'strong',
    'intense': 'strong',
    'deep': 'strong',

    'maximum': 'maximum',
    'turbo': 'maximum',
    'boost': 'maximum',
    'max': 'maximum',
    'full': 'maximum',
    'ultra': 'maximum',
    'highest': 'maximum'
  },
  'DE': {
    'leicht': 'leise',
    'leise': 'leise',
    'ruhig': 'leise',
    'niedrig': 'leise',
    'sanft': 'leise',
    'eco': 'leise',
    'schonend': 'leise',
    'flüsterleise': 'leise',

    'mittel': 'standard',
    'normal': 'standard',
    'standard': 'standard',
    'regulär': 'standard',
    'default': 'standard',

    'stark': 'stark',
    'hoch': 'stark',
    'kraftvoll': 'stark',
    'intensiv': 'stark',
    'tief': 'stark',

    'maximal': 'turbo',
    'turbo': 'turbo',
    'boost': 'turbo',
    'max': 'turbo',
    'voll': 'turbo',
    'ultra': 'turbo',
    'höchste': 'turbo'
  }
};

const moppingLevels = {
  'EN': ['low', 'medium', 'high'],
  'DE': ['niedrig', 'mittel', 'hoch']
};

const moppingSynonyms = {
  'EN': {
    'dry': 'low',
    'low': 'low',
    'minimal': 'low',
    'barely': 'low',
    'light': 'low',
    'soft': 'low',

    'halfwet': 'medium',
    'medium': 'medium',
    'damp': 'medium',
    'moist': 'medium',
    'slightly wet': 'medium',
    'mid': 'medium',

    'wet': 'high',
    'high': 'high',
    'max': 'high',
    'soaked': 'high',
    'very wet': 'high',
    'deep clean': 'high',
    'intense': 'high'
  },
  'DE': {
    'trocken': 'niedrig',
    'niedrig': 'niedrig',
    'minimal': 'niedrig',
    'kaum': 'niedrig',
    'leicht': 'niedrig',
    'sanft': 'niedrig',

    'halbnass': 'mittel',
    'mittel': 'mittel',
    'feucht': 'mittel',
    'leicht feucht': 'mittel',
    'mäßig nass': 'mittel',

    'nass': 'hoch',
    'hoch': 'hoch',
    'max': 'hoch',
    'durchnässt': 'hoch',
    'sehr nass': 'hoch',
    'tiefenreinigung': 'hoch',
    'intensiv': 'hoch'
  }
};
const AlexaRoomsName = {
  'EN': [
    'Room',
    'Living Room',
    'Primary Bedroom',
    'Secondary Bedroom',
    "Children's Room",
    'Study',
    'Kitchen',
    'Dining Hall',
    'Bathroom',
    'Balcony',
    'Terrace',
    'Corridor',
    'Utility Room',
    'Closet',
    'Meeting Room',
    'Office',
    'Fitness Area',
    'Recreation Area'
  ],
  'DE': [
    'Raum',
    'Wohnzimmer',
    'Hauptschlafzimmer',
    'Schlafzimmer',
    'Gästezimmer',
    'Kinderzimmer',
    'Arbeitszimmer',
    'Küche',
    'Esszimmer',
    'Badezimmer',
    'Balkon',
    'Terrasse',
    'Flur',
    'Hauswirtschaftsraum',
    'Abstellraum',
    'Besprechungsraum',
    'Büro',
    'Fitnessraum',
    'Freizeitraum'
  ]
};
const AlexaRoomsNameSynonyms = {
  'EN': {
    'room': 'Room',
    'chamber': 'Room',

    'living': 'Living Room',
    'livingroom': 'Living Room',
    'lounge': 'Living Room',
    'salon': 'Living Room',

    'primary bedroom': 'Primary Bedroom',
    'main bedroom': 'Primary Bedroom',
    'master bedroom': 'Primary Bedroom',

    'secondary bedroom': 'Secondary Bedroom',
    'guest room': 'Secondary Bedroom',
    'extra bedroom': 'Secondary Bedroom',
    'spare bedroom': 'Secondary Bedroom',

    "children's room": "Children's Room",
    'kids room': "Children's Room",
    'nursery': "Children's Room",
    'baby room': "Children's Room",
    'playroom': "Children's Room",

    'study': 'Study',
    'workspace': 'Study',
    'library': 'Study',

    'kitchen': 'Kitchen',
    'cooking area': 'Kitchen',
    'pantry': 'Kitchen',

    'dining': 'Dining Hall',
    'dining room': 'Dining Hall',
    'meal area': 'Dining Hall',

    'bath': 'Bathroom',
    'washroom': 'Bathroom',
    'restroom': 'Bathroom',
    'toilet': 'Bathroom',

    'balcony': 'Balcony',
    'terrace': 'Terrace',
    'veranda': 'Terrace',
    'patio': 'Terrace',

    'corridor': 'Corridor',
    'hallway': 'Corridor',
    'passage': 'Corridor',

    'utility': 'Utility Room',
    'storage': 'Utility Room',
    'laundry': 'Utility Room',

    'closet': 'Closet',
    'wardrobe': 'Closet',

    'meeting': 'Meeting Room',
    'conference': 'Meeting Room',
    'boardroom': 'Meeting Room',

    'office': 'Office',
    'workroom': 'Office',

    'fitness': 'Fitness Area',
    'gym': 'Fitness Area',
    'workout room': 'Fitness Area',

    'recreation': 'Recreation Area',

    'leisure room': 'Recreation Area'
  },
  'DE': {
    'raum': 'Raum',
    'zimmer': 'Raum',

    'wohnzimmer': 'Wohnzimmer',
    'stube': 'Wohnzimmer',
    'salon': 'Wohnzimmer',

    'hauptschlafzimmer': 'Hauptschlafzimmer',
    'elternschlafzimmer': 'Hauptschlafzimmer',
    'masterzimmer': 'Hauptschlafzimmer',

    'schlafzimmer': 'Schlafzimmer',
    'schlafraum': 'Schlafzimmer',

    'gästezimmer': 'Gästezimmer',
    'besucherzimmer': 'Gästezimmer',
    'zusätzliches schlafzimmer': 'Gästezimmer',

    'kinderzimmer': 'Kinderzimmer',
    'babyzimmer': 'Kinderzimmer',
    'spielzimmer': 'Kinderzimmer',
    'jugendzimmer': 'Kinderzimmer',

    'arbeitszimmer': 'Arbeitszimmer',
    'büro': 'Arbeitszimmer',
    'studierzimmer': 'Arbeitszimmer',
    'homeoffice': 'Arbeitszimmer',

    'küche': 'Küche',
    'kochnische': 'Küche',

    'esszimmer': 'Esszimmer',
    'speisezimmer': 'Esszimmer',
    'speisesaal': 'Esszimmer',

    'badezimmer': 'Badezimmer',
    'bad': 'Badezimmer',
    'waschraum': 'Badezimmer',
    'toilette': 'Badezimmer',
    'wc': 'Badezimmer',

    'balkon': 'Balkon',
    'terrasse': 'Terrasse',
    'veranda': 'Terrasse',
    'patio': 'Terrasse',

    'flur': 'Korridor',
    'gang': 'Korridor',
    'diele': 'Korridor',
    'korridor': 'Korridor',

    'hauswirtschaftsraum': 'Hauswirtschaftsraum',
    'wirtschaftsraum': 'Hauswirtschaftsraum',
    'abstellkammer': 'Hauswirtschaftsraum',

    'abstellraum': 'Abstellraum',
    'kammer': 'Abstellraum',
    'lagerschrank': 'Abstellraum',

    'besprechungsraum': 'Besprechungsraum',
    'konferenzraum': 'Besprechungsraum',
    'tagungsraum': 'Besprechungsraum',


    'arbeitsraum': 'Büro',

    'fitnessraum': 'Fitnessraum',
    'gym': 'Fitnessraum',
    'trainingsraum': 'Fitnessraum',

    'freizeitraum': 'Freizeitraum',
    'lounge': 'Freizeitraum'
  }
};
const AlexacleanModes = {
  'EN': {
    1: 'Customize room cleaning',
    5120: 'Sweeping and mopping',
    5121: 'Mopping',
    5122: 'Sweeping',
    5123: 'Mopping after sweeping'
  },
  'DE': {
    1: 'Raumreinigung anpassen',
    5120: 'Saugen und Wischen',
    5121: 'Wischen',
    5122: 'Staubsaugen',
    5123: 'Wischen nach dem Saugen'
  }
};

const AlexacancelKeywords = {
  'EN': [
    'cancel cleaning', 'stop cleaning', 'robot off', 'please cancel cleaning',
    'end cleaning', 'halt cleaning', 'abort cleaning', 'terminate cleaning',
    'cease cleaning', 'stop the robot', 'shut down robot', 'turn off robot',
    'stop vacuum', 'cancel vacuuming', 'halt vacuuming', 'end vacuuming',
    'shut off vacuum', 'deactivate robot', 'stop floor cleaning', 'turn off vacuum',
    'disengage cleaning', 'disable cleaning', 'halt Dreame', 'Dreame stop'
  ],
  'DE': [
    'reinigung abbrechen', 'reinigung stoppen', 'stop reinigung', 'roboter aus',
    'reinigung bitte abbrechen', 'reinigung beenden', 'reinigung unterbrechen',
    'reinigung anhalten', 'saugvorgang stoppen', 'staubsauger aus',
    'roboter abschalten', 'staubsaugen beenden', 'putzen stoppen',
    'staubsaugen stoppen', 'staubsaugen deaktivieren', 'bodenreinigung stoppen',
    'staubsauger ausschalten', 'sauger aus', 'roboter deaktivieren',
    'dreame stoppen', 'dreame aus', 'dreame reinigen beenden'
  ]
};

const AlexamissingMessages = {
  'EN': {
    'mopping': 'Mopping Level',
    'suction': 'Suction Level',
    'and': ' and '
  },
  'DE': {
    'mopping': 'Wasserlevel',
    'suction': 'Sauglevel',
    'and': ' und '
  }
};

const robotKeywords = {
  'EN': ['robot', 'dreame', 'vacuum', 'vacuum cleaner', 'cleaning robot', 'robot cleaner', 'vacuum bot', 'robovac'],
  'DE': ['roboter', 'dreame', 'staubsauger', 'saugroboter', 'putzroboter', 'staubi', 'saug-bot', 'reinigungsroboter']
};


const emptyActionWords = {
  'EN': ['empty', 'auto empty', 'clean bin', 'empty bin', 'empty dustbin'],
  'DE': ['leeren', 'entleeren', 'staubbehälter leeren', 'behälter leeren']
};

const washActionWords = {
  'EN': ['wash', 'auto wash', 'clean mop', 'wash mop', 'mop cleaning'],
  'DE': ['waschen', 'mopp reinigen', 'moppreinigung', 'wischmodul reinigen']
};

const statusCheckWords = {
  'EN': ['robot status', 'check robot', 'status robot', 'robot condition', 'check', 'condition'],
  'DE': ['roboter status', 'status roboter', 'roboter zustand', 'roboter prüfen', 'status', 'status prüfen', 'zustand', 'prüfen']
};

const resetComponentWords = {
  'EN': {
    'Sensor': ['sensor', 'sensors'],
    'MainBrush': ['main brush', 'main roller', 'brush'],
    'SideBrush': ['side brush', 'side roller'],
    'Filter': ['filter', 'dust filter'],
    'SecondaryFilter': ['secondary filter', 'hepa filter', 'extra filter', 'backup filter'],
    'SensorDirty': ['sensor', 'dirty sensor', 'clean sensor'],
    'MopPad': ['mop pad', 'mopping pad', 'mop', 'cloth'],
    'SilverIon': ['silver ion', 'ion cartridge'],
    'Detergent': ['detergent', 'cleaning solution', 'soap'],
    'PureWaterTank': ['pure water tank', 'clean water tank', 'fresh water'],
    'DirtyWaterTank': ['dirty water tank', 'waste water', 'used water']
  },
  'DE': {
    'Sensor': ['sensor', 'sensoren'],
    'MainBrush': ['hauptbürste', 'bürste', 'hauptrolle'],
    'SideBrush': ['seitenbürste', 'seitenrolle'],
    'Filter': ['filter', 'staubfilter'],
    'SecondaryFilter': ['sekundärfilter', 'hepa-filter', 'zusatzfilter', 'ersatzfilter'],
    'SensorDirty': ['sensor', 'sensoren', 'verschmutzter sensor'],
    'MopPad': ['wischpad', 'moppad', 'mop', 'wischtuch', 'wischtücher', 'pad'],
    'SilverIon': ['silberionen', 'ionenkartusche'],
    'Detergent': ['reinigungsmittel', 'seife', 'putzmittel'],
    'PureWaterTank': ['frischwassertank', 'sauberer wassertank', 'reines wasser'],
    'DirtyWaterTank': ['schmutzwassertank', 'abwasser', 'benutztes wasser']
  }
};


const resetAllKeywords = {
  'EN': ['reset all', 'reset everything', 'reset all components', 'reset the robot', 'reset all parts', 'reset full maintenance', 'reset maintenance'],
  'DE': ['alles zurücksetzen', 'alle komponenten zurücksetzen', 'roboter zurücksetzen', 'alle teile zurücksetzen', 'wartung zurücksetzen', 'wartung komplett zurücksetzen', 'alles resetten', 'alle komponenten resetten', 'roboter resetten', 'wartung resetten']
};



const resetOneKeywords = {
  'EN': ['reset', 'clear', 'restore'],
  'DE': ['zurücksetzen', 'löschen', 'resetten', 'wiederherstellen']
};


const components = {
  'Sensor': {
    id: 'Sensor',
    label: {
      'EN': 'Sensor',
      'DE': 'Sensor',
    }
  },
  'MainBrush': {
    id: 'MainBrush',
    label: {
      'EN': 'Main Brush',
      'DE': 'Hauptbürste',
    }
  },
  'SideBrush': {
    id: 'SideBrush',
    label: {
      'EN': 'Side Brush',
      'DE': 'Seitenbürste',
    }
  },
  'Filter': {
    id: 'Filter',
    label: {
      'EN': 'Filter',
      'DE': 'Filter',
    }
  },
  'SecondaryFilter': {
    id: 'SecondaryFilter',
    label: {
      'EN': 'Secondary Filter',
      'DE': 'Sekundärfilter',
    }
  },
  'MopPad': {
    id: 'MopPad',
    label: {
      'EN': 'Mop Pad',
      'DE': 'Mopp-Pad',
    }
  },
  'SilverIon': {
    id: 'SilverIon',
    label: {
      'EN': 'Silver Ion',
      'DE': 'Silberionen',
    }
  },
  'Detergent': {
    id: 'Detergent',
    label: {
      'EN': 'Detergent',
      'DE': 'Reinigungsmittel',
    }
  },
  'PureWaterTank': {
    id: 'PureWaterTank',
    label: {
      'EN': 'Pure Water Tank',
      'DE': 'Reines Wasser Tank',
    }
  },
  'DirtyWaterTank': {
    id: 'DirtyWaterTank',
    label: {
      'EN': 'Dirty Water Tank',
      'DE': 'Schmutzwasser Tank',
    }
  },
  'Error': {
    id: 'Error',
    label: {
      'EN': 'Error message',
      'DE': 'Fehlermeldung',
    }
  },
  'CurrentRoomCleaningName': {
    id: 'CurrentRoomCleaningName',
    label: {
      'EN': 'The vacuum is currently in the',
      'DE': 'Der Saugroboter befindet sich derzeit im',
    }
  },
  'State': {
    id: 'State',
    label: {
      'EN': 'Vacuum status',
      'DE': 'Saugroboter-Status',
    }
  },
  'BatteryLevel': {
    id: 'BatteryLevel',
    label: {
      'EN': 'Battery level',
      'DE': 'Batteriestand',
    }
  },

  'SensorLeft': {
    id: 'SensorLeft',
    label: {
      'EN': 'Left Sensor',
      'DE': 'Linker Sensor',
    }
  },
  'SensorRight': {
    id: 'SensorRight',
    label: {
      'EN': 'Right Sensor',
      'DE': 'Rechter Sensor',
    }
  },
  'SensorTimeLeft': {
    id: 'SensorTimeLeft',
    label: {
      'EN': 'Sensor Time Left',
      'DE': 'Sensor verbleibende Zeit',
    }
  },
  'MopPadLeft': {
    id: 'MopPadLeft',
    label: {
      'EN': 'Mop Pad Left',
      'DE': 'Mopp-Pad verbleibend',
    }
  },
  'MopPadTimeLeft': {
    id: 'MopPadTimeLeft',
    label: {
      'EN': 'Mop Pad Time Left',
      'DE': 'Mopp-Pad verbleibende Zeit',
    }
  },
  'SilverIonLeft': {
    id: 'SilverIonLeft',
    label: {
      'EN': 'Silver Ion Left',
      'DE': 'Silberionen verbleibend',
    }
  },
  'SilverIonTimeLeft': {
    id: 'SilverIonTimeLeft',
    label: {
      'EN': 'Silver Ion Time Left',
      'DE': 'Silberionen verbleibende Zeit',
    }
  },
  'DetergentLeft': {
    id: 'DetergentLeft',
    label: {
      'EN': 'Detergent Left',
      'DE': 'Reinigungsmittel verbleibend',
    }
  },
  'DetergentTimeLeft': {
    id: 'DetergentTimeLeft',
    label: {
      'EN': 'Detergent Time Left',
      'DE': 'Reinigungsmittel verbleibende Zeit',
    }
  },
  'FilterLeft': {
    id: 'FilterLeft',
    label: {
      'EN': 'Filter Left',
      'DE': 'Filter verbleibend',
    }
  },
  'FilterTimeLeft': {
    id: 'FilterTimeLeft',
    label: {
      'EN': 'Filter Time Left',
      'DE': 'Filter verbleibende Zeit',
    }
  },
  'SecondaryFilterLeft': {
    id: 'SecondaryFilterLeft',
    label: {
      'EN': 'Secondary Filter Left',
      'DE': 'Sekundärfilter verbleibend',
    }
  },
  'SecondaryFilterTimeLeft': {
    id: 'SecondaryFilterTimeLeft',
    label: {
      'EN': 'Secondary Filter Time Left',
      'DE': 'Sekundärfilter verbleibende Zeit',
    }
  },
  'MainBrushLeft': {
    id: 'MainBrushLeft',
    label: {
      'EN': 'Main Brush Left',
      'DE': 'Hauptbürste verbleibend',
    }
  },
  'MainBrushTimeLeft': {
    id: 'MainBrushTimeLeft',
    label: {
      'EN': 'Main Brush Time Left',
      'DE': 'Hauptbürste verbleibende Zeit',
    }
  },
  'SideBrushLeft': {
    id: 'SideBrushLeft',
    label: {
      'EN': 'Side Brush Left',
      'DE': 'Seitenbürste verbleibend',
    }
  },
  'SideBrushTimeLeft': {
    id: 'SideBrushTimeLeft',
    label: {
      'EN': 'Side Brush Time Left',
      'DE': 'Seitenbürste verbleibende Zeit',
    }
  }
};


const knownComponentSynonyms = {
  'EN': {
    'Sensor': ['sensor', 'sensors'],
    'MainBrush': ['main brush', 'brush', 'mainbristle', 'main roller', 'roller brush'],
    'SideBrush': ['side brush', 'sidebristle', 'side roller'],
    'Filter': ['filter', 'dust filter', 'air filter'],
    'SecondaryFilter': ['secondary filter', 'hepa filter', 'extra filter', 'backup filter'],
    'MopPad': ['mop', 'mop pad', 'cloth', 'mopping pad', 'pad'],
    'SilverIon': ['silver ion', 'ion', 'silver', 'ion cartridge'],
    'Detergent': ['detergent', 'cleaning liquid', 'soap', 'cleaner', 'cleaning solution'],
    'PureWaterTank': ['pure water tank', 'clean water', 'water tank', 'fresh water tank'],
    'DirtyWaterTank': ['dirty water tank', 'waste water', 'used water', 'dirty tank'],
    'BatteryLevel': ['battery', 'battery level', 'charge', 'battery status'],
    'Error': ['error', 'error message', 'problem', 'issue', 'alert'],
    'State': ['current state'],
    'CurrentRoomCleaningName': ['current room', 'room', 'cleaning room', 'room being cleaned'],
    'SensorLeft': ['left sensor', 'sensor left', 'left side sensor'],
    'SensorRight': ['right sensor', 'sensor right', 'right side sensor'],
    'SensorTimeLeft': ['sensor time', 'sensor time left', 'remaining sensor time'],
    'MopPadLeft': ['mop left', 'mop remaining', 'pad remaining'],
    'MopPadTimeLeft': ['mop time left', 'mop pad time', 'remaining mop time'],
    'SilverIonLeft': ['silver ion left', 'ion left', 'remaining silver ion'],
    'SilverIonTimeLeft': ['silver ion time left', 'ion time', 'silver ion duration'],
    'DetergentLeft': ['detergent left', 'soap left', 'remaining detergent'],
    'DetergentTimeLeft': ['detergent time left', 'soap time', 'detergent duration'],
    'FilterLeft': ['filter left', 'dust filter left', 'remaining filter'],
    'FilterTimeLeft': ['filter time left', 'filter duration'],
    'SecondaryFilterLeft': ['secondary filter time left', 'secondary filter duration'],
    'SecondaryFilterTimeLeft': ['secondary filter time left', 'secondary filter duration'],
    'MainBrushLeft': ['main brush left', 'brush left', 'remaining main brush'],
    'MainBrushTimeLeft': ['main brush time left', 'brush time', 'main brush duration'],
    'SideBrushLeft': ['side brush left', 'remaining side brush'],
    'SideBrushTimeLeft': ['side brush time left', 'side brush duration']
  },
  'DE': {
    'Sensor': ['sensor', 'sensoren'],
    'MainBrush': ['hauptbürste', 'bürste', 'hauptbuerste', 'hauptrolle', 'bürstenrolle'],
    'SideBrush': ['seitenbürste', 'seitenbuerste', 'seitenrolle'],
    'Filter': ['filter', 'staubfilter', 'luftfilter'],
    'SecondaryFilter': ['sekundärfilter', 'hepa-filter', 'zusatzfilter', 'ersatzfilter'],
    'MopPad': ['mopp', 'mopp-pad', 'wischtuch', 'wischpad', 'pad'],
    'SilverIon': ['silberionen', 'ionen', 'silber', 'ionenkartusche'],
    'Detergent': ['reinigungsmittel', 'seife', 'reiniger', 'putzmittel', 'reinigungslösung'],
    'PureWaterTank': ['frischwassertank', 'reines wasser', 'wassertank', 'sauberwassertank'],
    'DirtyWaterTank': ['schmutzwassertank', 'dreckwasser', 'gebrauchtes wasser', 'abwassertank'],
    'BatteryLevel': ['akku', 'batterie', 'batteriestand', 'akkustand'],
    'Error': ['fehler', 'fehlermeldung', 'problem', 'störung', 'meldung'],
    'State': ['aktueller stand'],
    'CurrentRoomCleaningName': ['raum', 'aktueller raum', 'gereinigter raum', 'momentaner raum'],
    'SensorLeft': ['linker sensor', 'sensor links', 'sensor auf der linken seite'],
    'SensorRight': ['rechter sensor', 'sensor rechts', 'sensor auf der rechten seite'],
    'SensorTimeLeft': ['sensorzeit', 'sensor verbleibende zeit', 'sensor restzeit'],
    'MopPadLeft': ['mopp verbleibend', 'wischtuch übrig', 'wischpad rest'],
    'MopPadTimeLeft': ['mopp zeit', 'wischtuchzeit', 'pad restzeit'],
    'SilverIonLeft': ['silberionen verbleibend', 'ionen übrig'],
    'SilverIonTimeLeft': ['silberionen zeit', 'verbleibende silberionenzeit'],
    'DetergentLeft': ['reinigungsmittel übrig', 'seife verbleibend', 'mittelrest'],
    'DetergentTimeLeft': ['reinigungsmittel zeit', 'reinigungsmittel restzeit'],
    'FilterLeft': ['filter verbleibend', 'staubfilter übrig', 'filterrest'],
    'FilterTimeLeft': ['filter zeit', 'filter restzeit'],
    'SecondaryFilterLeft': ['sekundärfilter verbleibend', 'sekundärstaubfilter übrig', 'sekundärfilterrest'],
    'SecondaryFilterTimeLeft': ['sekundärfilter zeit', 'sekundärfilter restzeit'],
    'MainBrushLeft': ['hauptbürste übrig', 'hauptbürstenrest'],
    'MainBrushTimeLeft': ['hauptbürstenzeit', 'hauptbürste restzeit'],
    'SideBrushLeft': ['seitenbürste übrig', 'seitenbürstenrest'],
    'SideBrushTimeLeft': ['seitenbürstenzeit', 'seitenbürste restzeit']
  }
};


// List of all recognizable component names per language
const componentKeywords = {
  'DE': Object.values(components).map(c => c.label?.DE.toLowerCase()),
  'EN': Object.values(components).map(c => c.label?.EN.toLowerCase()),
};

// Define known abbreviations and speech characteristics per language
const knownAbbreviations = {
  EN: {
    baseCharSpeed: 16,
    numberSpeedPerDigit: 250,
    numberSpeakTime: [500, 800, 1100, 1400],
    abbreviations: ['e.g.', 'i.e.', 'Mr.', 'Mrs.', 'Dr.', 'etc.', 'vs.', 'approx.'],
    units: {
      hours: 'hours',
      percent: '%'
    }
  },
  DE: {
    baseCharSpeed: 18,
    numberSpeedPerDigit: 270,
    numberSpeakTime: [600, 900, 1200, 1500],
    abbreviations: ['z.B.', 'u.a.', 'bzw.', 'd.h.', 'ca.', 'Dr.', 'Hr.', 'Fr.', 'Nr.', 'min.', 'max.'],
    units: {
      hours: 'Stunden',
      percent: '%'
    }
  },
  FR: {
    baseCharSpeed: 15,
    numberSpeedPerDigit: 260,
    numberSpeakTime: [550, 850, 1150, 1450],
    abbreviations: ['p. ex.', 'env.', 'Mme.', 'M.', 'Dr.'],
    units: {
      hours: 'heures',
      percent: '%'
    }
  },
  IT: {
    baseCharSpeed: 15,
    numberSpeedPerDigit: 250,
    numberSpeakTime: [550, 850, 1150, 1450],
    abbreviations: ['es.', 'sig.', 'sig.ra', 'dott.', 'ecc.'],
    units: {
      hours: 'ore',
      percent: '%'
    }
  }
};

const AlexaInfo = {
  'EN': {
    0: 'Alexa is active, and the robot accepts voice commands. You can simply say: "Alexa, vacuum the living room twice on high," or "Alexa, mop the living room once," or "Alexa, vacuum and mop the living room three times turbo and damp," or "Alexa, vacuum then mop the living room light and wet." The robot will then clean the living room as requested.',
    1: 'The Alexa adapter was not found, and the robot does not accept voice commands. To resolve this, please install the Alexa adapter.',
    2: "Cleaning is active, please give your command with 'Cancel cleaning'.",
    3: 'Cleaning stopped due to abort command.',
    4: 'Multiple distinct cleaning modes detected, please specify the cleaning mode for each room clearly.',
    5: (room) => `Please specify the cleaning mode for ${room}. You forgot to define the clean mode, suction level, or water level.`,
    6: ' sweeping',
    7: ' mopping',
    8: 'sweeping and mopping',
    9: 'mopping after sweeping',
    10: 'times',
    11: 'All rooms were cleaned.',
    12: (Roomattempt, Roommode) => `Try ${Roomattempt}: Set CleaningMode to ${Roommode}`,
    13: (Roomnumber, Roomname, Roommode) => `Start cleaning the room ${Roomnumber} (${Roomname}) with mode ${Roommode}`,
    14: (Roomnumber, Roomname) => `Cleaning of room ${Roomnumber} (${Roomname}) was aborted due to an error.`,
    15: (Roommode) => `CleaningMode: ${Roommode} successfully set.`,
    16: (Roomattempt) => `Setting CleaningMode failed (attempt ${Roomattempt}). Try again...`,
    17: (Roommode, RoomMRetries, RoomNewmode) => `Error: CleaningMode could not be set to ${Roommode} after ${RoomMRetries} attempts. Set CleaningMode to the last valid value: ${RoomNewmode}`,
    18: 'Error retrieving error status:',
    19: (Roomerror) => `Error detected while cleaning room ${Roomerror}. Waiting for fix...`,
    20: (RoomTimeOut) => `An error has occurred in room ${RoomTimeOut} for over 5 minutes. Cleaning will be aborted.`,
    21: (RoomTimeReset) => `Room ${RoomTimeReset} error fixed. Cleaning continues.`,
    22: (RoomFinished) => `Cleaning in room ${RoomFinished} completed.`,
    23: (RoomResume) => `Cleaning in room ${RoomResume} has resumed.`,
    24: (RoomTOPause) => `The pause in room ${RoomTOPause} has been going on for over 5 minutes. Cleaning is aborted.`,
    25: (Roomname, Roommissing) => `For ${Roomname}, the following is missing: ${Roommissing}. Please specify the missing level.`,
    26: (RoomMessages) => `For the following rooms, information is missing: ${RoomMessages}. Please specify the missing values.`,
    27: "A new cleaning process cannot be started because a cleaning process is being monitored. Please give your command with 'Cancel cleaning'",
    28: 'The robot is emptying the dustbin.',
    29: 'Dustbin emptying completed.',
    30: 'The robot is washing the mop.',
    31: 'Mop washing completed.',
    32: 'Cleaning is paused. Executing resume.',
    33: 'Resume not possible',
    34: (RoomcompId) => `${RoomcompId} reset triggered.`,
    35: (RoomcompId) => `Reset failed for ${RoomcompId}.`,
    36: 'All components have been reset.',
    37: 'No reset action found for this component.',
    38: (RoomcompId) => `${RoomcompId} has been reset.`,
    39: (RoomcompId) => `Reset not available for ${RoomcompId}.`,
    40: 'Here is the status of the robot components: ',
    41: 'Suggest reset',
    42: 'All components with value 0 have been reset.',
    43: 'at',
    44: (RoomList) => `Please check the settings. The following rooms have an invalid cleaning mode: ${RoomList}.`


  },
  'DE': {
    0: 'Alexa ist aktiv, und der Roboter akzeptiert Sprachbefehle. Du kannst einfach sagen: "Alexa, Wohnzimmer 2 mal stark saugen" oder "Alexa, Wohnzimmer 1 mal nass wischen" oder "Alexa, Wohnzimmer 3 mal saugen und wischen turbo und feucht" oder "Alexa, Wohnzimmer wischen nach saugen leicht und nass." Der Roboter wird dann wie gewünscht das Wohnzimmer reinigen.',
    1: 'Der Alexa-Adapter wurde nicht gefunden, und der Roboter akzeptiert keine Sprachbefehle. Um dies zu ändern, installiere bitte den Alexa-Adapter.',
    2: "Reinigung ist aktiv, bitte gebe deinen Befehl mit 'Reinigung abbrechen'.",
    3: 'Reinigung gestoppt, da Abbruchbefehl empfangen wurde.',
    4: 'Mehrere unterschiedliche Reinigungsmodi erkannt, bitte gib für jeden Raum den Reinigungsmodus klar an.',
    5: (room) => `Bitte gib den Reinigungsmodus für ${room} an. Du hast den Reinigungsmodus, das Sauglevel oder den Wasserlevel vergessen zu definieren.`,
    6: ' saugen',
    7: ' wischen',
    8: 'saugen und wischen',
    9: 'wischen nach saugen',
    10: 'mal',
    11: 'Alle Räume wurden gereinigt.',
    12: (Roomattempt, Roommode) => `Versuch ${Roomattempt}: Setze CleaningMode auf ${Roommode}`,
    13: (Roomnumber, Roomname, Roommode) => `Starte die Reinigung von Raum ${Roomnumber} (${Roomname}) mit Modus ${Roommode}`,
    14: (Roomnumber, Roomname) => `Die Reinigung von Raum ${Roomnumber} (${Roomname}) wurde aufgrund eines Fehlers abgebrochen.`,
    15: (Roommode) => `CleaningMode: ${Roommode} erfolgreich gesetzt.`,
    16: (Roomattempt) => `CleaningMode setzen fehlgeschlagen (Versuch ${Roomattempt}). Erneuter Versuch...`,
    17: (Roommode, RoomMRetries, RoomNewmode) => `Fehler: CleaningMode konnte nach ${RoomMRetries} Versuchen nicht auf ${Roommode} gesetzt werden. Setze CleaningMode stattdessen auf den letzten gültigen Wert: ${RoomNewmode}`,
    18: 'Fehler beim Abrufen des Fehlerstatus:',
    19: (Roomerror) => `Fehler erkannt beim Reinigen von Raum ${Roomerror}. Warte auf Fehlerbehebung...`,
    20: (RoomTimeOut) => `Fehler in Raum ${RoomTimeOut} besteht seit über 5 Minuten. Reinigung wird abgebrochen.`,
    21: (RoomTimeReset) => `Fehler in Raum ${RoomTimeReset} behoben. Reinigung läuft weiter.`,
    22: (RoomFinished) => `Reinigung in Raum ${RoomFinished} abgeschlossen.`,
    23: (RoomResume) => `Die Reinigung im Raum ${RoomResume} wurde fortgesetzt.`,
    24: (RoomTOPause) => `Pause in Raum ${RoomTOPause} besteht seit über 5 Minuten. Reinigung wird abgebrochen.`,
    25: (Roomname, Roommissing) => `Für ${Roomname} fehlt: ${Roommissing}. Bitte gib das fehlende Level an.`,
    26: (RoomMessages) => `Für folgende Räume fehlen Angaben: ${RoomMessages}. Bitte definiere die fehlenden Werte.`,
    27: "Ein neuer Reinigungsvorgang kann nicht gestartet werden, da ein Reinigungsvorgang überwacht wird, bitte gebe deinen Befehl mit 'Reinigung abbrechen'",
    28: 'Der Roboter entleert den Staubbehälter.',
    29: 'Entleerung abgeschlossen.',
    30: 'Der Roboter wäscht den Mopp.',
    31: 'Wischmopp-Wäsche abgeschlossen.',
    32: 'Die Reinigung ist angehalten. Fortsetzung wird ausgeführt.',
    33: 'Fortsetzen nicht möglich.',
    34: (RoomcompId) => `${RoomcompId} zurückgesetzt.`,
    35: (RoomcompId) => `Zurücksetzen für ${RoomcompId} fehlgeschlagen.`,
    36: 'Alle Komponenten wurden zurückgesetzt.',
    37: 'Für diese Komponente wurde keine Zurücksetz-Aktion gefunden.',
    38: (RoomcompId) => `${RoomcompId} wurde zurückgesetzt.`,
    39: (RoomcompId) => `Zurücksetzen für ${RoomcompId} nicht verfügbar.`,
    40: 'Hier ist der Status der Roboterkomponenten: ',
    41: 'Vorschlag zum Zurücksetzen',
    42: 'Alle Komponenten mit dem Wert 0 wurden zurückgesetzt.',
    43: 'bei',
    44: (RoomList) => `Bitte prüfe die Einstellungen. Die folgenden Räume haben einen ungültigen Reinigungsmodus: ${RoomList}.`
  }
};

const URLTK = 'aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLWF1dGgvb2F1dGgvdG9rZW4=';
let DH_URLTK = new Buffer.from(URLTK, 'base64');
const URLLST = 'aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHVzZXJiaW5kL2RldmljZS9saXN0VjI=';
let DH_URLLST = new Buffer.from(URLLST, 'base64');
const URLINF = 'aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHVzZXJiaW5kL2RldmljZS9pbmZv';
let DH_URLINF = new Buffer.from(URLINF, 'base64');
const URLOTCINF = 'aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHN0YXR1cy9kZXZPVENJbmZv';
let DH_URLOTCINF = new Buffer.from(URLOTCINF, 'base64');
const URLPROP = 'aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHN0YXR1cy9wcm9wcw==';
let DH_URLPROP = new Buffer.from(URLPROP, 'base64');
const URLDOWNURL = 'aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdGZpbGUvZ2V0RG93bmxvYWRVcmw=';
let DH_URLDOWNURL = new Buffer.from(URLDOWNURL, 'base64');
const URLUSA = 'RHJlYW1lX1NtYXJ0aG9tZS8xLjUuNTkgKGlQaG9uZTsgaU9TIDE2LjA7IFNjYWxlLzMuMDAp';
let DH_URLUSA = new Buffer.from(URLUSA, 'base64');
const URLDRLC = 'MWM4MGIzNzg3YjIyNjY3NzZiY2RjNDgxZjM3ZDhmYTQyYmExMGEzMGFmODFhNmRmLTE=';
let DH_URLDRLC = new Buffer.from(URLDRLC, 'base64');
const URLAUTH = 'QmFzaWMgWkhKbFlXMWxYMkZ3Y0hZeE9rRlFYbVIyUUhwQVUxRlpWbmhPT0RnPQ==';
let DH_URLAUTH = new Buffer.from(URLAUTH, 'base64');
const DHURLSENDA = 'L2RyZWFtZS1pb3QtY29tLQ==';
let DH_DHURLSENDA = new Buffer.from(DHURLSENDA, 'base64');
const DHURLSENDB = 'L2RldmljZS9zZW5kQ29tbWFuZA==';
let DH_DHURLSENDB = new Buffer.from(DHURLSENDB, 'base64');
const DHURLSENDDOM = 'LmlvdC5kcmVhbWUudGVjaDoxMzI2Nw==';
let DH_DHURLSENDDOM = new Buffer.from(DHURLSENDDOM, 'base64');
let DH_Map = {};
let In_path = '';
let DH_Auth = '',
  DH_AuthRef = '',
  DH_Expires = '',
  DH_Tenant = '000000',
  DH_Country = 'DE',
  DH_Uid = '',
  DH_Lang = 'de',
  DH_Region = 'eu',
  DH_Islogged = false,
  DH_Did = '',
  DH_Model = '',
  DH_Mac = '',
  DH_BDomain = '',
  DH_Domain = '',
  DH_filename = '',
  DH_CurMap = 0,
  DH_Host = '';
const canvas = createCanvas();
const context = canvas.getContext('2d');
canvas.height = 1024;
canvas.width = 1024;
let DH_UpdateMapInterval = null;
let DH_UpdateTheMap = true;

const DREAME_IVs = {
  'dreame.vacuum.p2114a': '6PFiLPYMHLylp7RR',
  'dreame.vacuum.p2114o': '6PFiLPYMHLylp7RR',
  'dreame.vacuum.p2140o': '8qnS9dqgT3CppGe1',
  'dreame.vacuum.p2140p': '8qnS9dqgT3CppGe1',
  'dreame.vacuum.p2149o': 'RNO4p35b2QKaovHC',
  'dreame.vacuum.r2209': 'qFKhvoAqRFTPfKN6',
  'dreame.vacuum.r2211o': 'dndRQ3z8ACjDdDMo',
  'dreame.vacuum.r2216o': '4sCv3Q2BtbWVBIB2',
  'dreame.vacuum.r2228o': 'dndRQ3z8ACjDdDMo',
  'dreame.vacuum.r2235': 'NRwnBj5FsNPgBNbT',
  'dreame.vacuum.r2254': 'wRy05fYLQJMRH6Mj',
};
//================> Global Get Robot position (Segment)
const CheckArrayRooms = [];

class Dreamehome extends utils.Adapter {
  /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
  constructor(options) {
    super({
      ...options,
      name: 'dreamehome',
    });
    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.json2iob = new Json2iob(this);
    this.DH_requestClient = axios.create({
      withCredentials: true,
      timeout: 3 * 60 * 1000,
    });

    //setInterval(async () => {await this.DH_CheckTaskStatus();}, 1000);
  }
  /**
     * Is called when databases are connected and adapter received configuration.
     */

  async onReady() {
    this.setState('info.connection', false, true);

    if (!this.config.username || !this.config.password) {
      this.log.error('Please set username and password in the instance settings');
      return;
    }

    DH_UpdateMapInterval = setInterval(function(){DH_UpdateTheMap = true;}, 1000);

    this.subscribeStates('*.control.*');
    this.log.info('Login and request Dreame data from cloud');

    // Check if we're recovering from a restart
    const lastRestart = await this.getStateAsync('resources.system.lastRestartAttempt');

    if (lastRestart && lastRestart.val) {
      this.log.info(`Recovered from restart at ${new Date(lastRestart.val).toISOString()}`);
    }

    try {
    // 1. Initialize configuration with mandatory defaults
      this.config = {
        intervalMs: this.config.intervalMs || 60000,
        heapLimitMb: this.config.heapLimitMb || 100,
        heapLimitMB: this.config.heapLimitMB || 150,
        eventLoopLagLimitMs: this.config.eventLoopLagLimitMs || 50,
        gcEnabled: this.config.gcEnabled !== undefined ? this.config.gcEnabled : true,
        memoryCleanerEnabled: this.config.memoryCleanerEnabled !== undefined ? this.config.memoryCleanerEnabled : true,
        memoryCleanerThresholdMB: this.config.memoryCleanerThresholdMB || 300,
        memoryCleanerIntervalSec: this.config.memoryCleanerIntervalSec || 30,
        memoryCleanerPriority: this.config.memoryCleanerPriority || 'medium',
        ...this.config
      };

      // 2. Initialize monitoring system
      const { monitor, profiler, memoryManager } = await initMonitoring(this);
      this.monitor = monitor;
      this.profiler = profiler;
      this.memoryManager = memoryManager;

	  // Synchronize configuration with states
      await this.syncConfigWithStates();

      // 3. Force initial state synchronization
      await Promise.all([
        this.setStateAsync('resources.memoryCleaner.heapLimitMB', {
          val: this.config.heapLimitMB, // Set the restart threshold
          ack: true
        }),
        this.setStateAsync('resources.memoryCleaner.enabled', {
          val: this.config.memoryCleanerEnabled,
          ack: true
        })
      ]);

      // 4. Start services
      this.subscribeStatesAsync('resources.profiling.enabled');
      this.subscribeStatesAsync('resources.memoryCleaner.*');

      if (this.config.memoryCleanerEnabled) {
        this.memoryManager.enableAutoCleanup({
          thresholdMB: this.config.memoryCleanerThresholdMB,
          intervalMinutes: this.config.memoryCleanerIntervalSec / 60,
          priority: this.config.memoryCleanerPriority
        });
      }

      // 5. Initial status log
      await this.logFullConfig();

    } catch (err) {
      this.log.error(`Initialization failed: ${err.stack}`);
    }

    if (typeof global.gc !== 'function') {
      this.log.warn('GARBAGE COLLECTION NOT AVAILABLE! Start Node.js with --expose-gc for proper memory management');
      this.log.warn('Current memory cleanup will be very limited in effectiveness');
    }

    // Create the setting object
    await this.setObjectNotExists('settings.alexaSpeakMode', {
      type: 'state',
      common: {
        name: 'Alexa Voice Output',
        type: 'string',
        role: 'level',
        read: true,
        write: true,
        states: {
	  0: 'No voice output',
          1: 'Only on voice commands',
          2: 'Only on input commands',
          3: 'On both voice and input commands'
        },
        def: 3
      },
      native: {}
    });
    this.subscribeStates('settings.alexaSpeakMode');

    await this.setObjectNotExists('settings.showlog', {
      type: 'state',
      common: {
        name: 'Show Dreame Log',
        type: 'boolean',
        role: 'switch',
        write: true,
        read: true,
        def: false
      },
      native: {},
    });
    try {
      const LogDataObjectOb = await this.getStateAsync('settings.showlog');
      LogData = LogDataObjectOb.val;
      this.log.info('Log status is set to ' + LogData);
    } catch (error) {
      this.log.error(error);
      if (LogData == null) {
        LogData = false;
      }
    }
    this.subscribeStates('settings.showlog');

    await this.DH_CloudLogin();
    if (DH_Auth) {
      In_path = DH_Did + '.vis.';

      // Create a generic dropdown object
      await this.setObjectNotExistsAsync(DH_Did + '.control.Command', {
        type: 'state',
        common: {
          name: 'Robot Command',
          type: 'string',
          role: 'level',
          write: true,
          read: true,
          states: DreameDropdownCommands[UserLang],
          desc: 'Control robot via dropdown (' + UserLang + ')'
        },
        native: {}
      });

      // Create state variable perspectives for floor 1 by default (even if no cards exist yet)
	  await this.createFloorStates(1);

      try {
        const RobTaskStatusOb = await this.getStateAsync(DH_Did + '.state.TaskStatus');
        const RobTaskStatus = RobTaskStatusOb.val;
        switch (RobTaskStatus) {
          case DreameTaskStatus[UserLang][0]: /*'Completed':*/
	       DH_OldTaskStatus = 0;
	       break;
          case DreameTaskStatus[UserLang][1]: /*'Auto cleaning':*/
	       DH_OldTaskStatus = 1;
	       break;
          case DreameTaskStatus[UserLang][2]: /*'Zone cleaning':*/
	       DH_OldTaskStatus = 2;
	       break;
          case DreameTaskStatus[UserLang][3]: /*'Segment cleaning':*/
            DH_OldTaskStatus = 3;
	       break;
          case DreameTaskStatus[UserLang][4]: /*'Spot cleaning':*/
	       DH_OldTaskStatus = 4;
	       break;
          case DreameTaskStatus[UserLang][5]: /*'Fast mapping':*/
	       DH_OldTaskStatus = 5;
	       break;
        }
		    } catch (error) {
        this.log.error(error);
      }
      //DH_OldTaskStatus = 0;

      try {
        const DH_CurMapOb = await this.getStateAsync(DH_Did + '.map.MapNumber');
        DH_CurMap = DH_CurMapOb.val;
        this.log.info(DreameInformation[UserLang][0] + DH_CurMap);
      } catch (error) {
        this.log.warn(DreameInformation[UserLang][1] + error);
        DH_CurMap = 0;
      }

	  In_path = DH_Did + '.';

      await this.setObjectNotExists(In_path + 'map.UserCustomMap', {
        type: 'state',
        common: {
          name: 'Dreame Custom Map Configuration',
          type: 'string',
          role: 'json',
          write: true,  // Allow user modifications
          read: true,
          def: JSON.stringify({
            '_comment': 'This is a user-defined map configuration for the Dreame robot.',
            'CustomMap': 0,  // Enable custom mapping (1 = enabled, 0 = disabled)
            'storeys': [{
              '_comment': 'List of floors (storeys) in the house.',
              'rooms': [{
                '_comment': 'Each room contains an ID and wall structure.',
                'room_id': 1,
                'walls': [
                  { 'beg_pt_x': 0, 'beg_pt_y': 0, 'end_pt_x': 10, 'end_pt_y': 0 },
                  { 'beg_pt_x': 10, 'beg_pt_y': 0, 'end_pt_x': 10, 'end_pt_y': 10 },
                  { 'beg_pt_x': 10, 'beg_pt_y': 10, 'end_pt_x': 0, 'end_pt_y': 10 },
                  { 'beg_pt_x': 0, 'beg_pt_y': 10, 'end_pt_x': 0, 'end_pt_y': 0 }
                ]
              }]
            }],
            'seg_inf': {
              '_comment': 'Room segment information with ID and type.',
              '1': { 'type': 0, 'name': 'Living Room' }
            },
            'robot': {
              '_comment': 'Current robot position on the map.',
              'x': 5,
              'y': 5,
              'angle': 0
            }
          }, null, 2)  // Pretty-print JSON
        },
        native: {}
      });

      await this.setObjectNotExists(In_path + 'map.NewMap', {
        type: 'state',
        common: {
          name: 'Create new map for vis',
          type: 'boolean',
          role: 'switch',
          write: true,
          read: true,
          def: false
        },
        native: {},
      });

      await this.setObjectNotExists(In_path + 'map.StartCleaningByRoomConfig', {
        type: 'state',
        common: {
          name: 'start cleaning for the selected rooms',
          type: 'boolean',
          role: 'switch',
          write: true,
          read: true,
          def: false
        },
        native: {},
      });
      await this.setObjectNotExists(In_path + 'map.ForceRoomConfigOverride', {
        type: 'state',
        common: {
          name: 'stop ongoing cleaning and start new cleaning',
          type: 'boolean',
          role: 'switch',
          write: true,
          read: true,
          def: true
        },
        native: {},
      });

      await this.DH_connectMqtt();
      this.refreshTokenInterval = setInterval(async () => {
        await this.DH_refreshToken();
      },
      (DH_Expires - 100 || 3500) * 1000, );
      this.subscribeStates('*.map.*');
      await this.DH_GetSetRooms();
      await this.DH_GetSetRoomCleanSettings();
    }
    try {
      const Alexaobj = await this.getForeignStateAsync('alexa2.0.History.summary');
      if (Alexaobj) {
        const AlexaVal = Alexaobj.val;
		        this.subscribeForeignStates('alexa2.0.History.summary');
        this.log.info(AlexaInfo[UserLang][0]);
        AlexaIsPresent = true;
      }
    } catch (error) {
      this.log.error(error);
      if (LogData == null) {
        AlexaIsPresent = false;
        this.log.info(AlexaInfo[UserLang][1]);
      }
    }
    // Read and normalize current value
    const state = await this.getStateAsync('settings.alexaSpeakMode');
    await this.updateSpeakMode(state?.val);

    // Restoring the water tank level
    this.restoreWaterTankData();

    firstStartWaterTrack = true; // Set status to true to track the tank, false to prevent cloud reset.
  }

  async DH_CloudLogin() {

    const selectedDeviceIndex = this.config.selectedDeviceIndex || 0;
    await this.DH_requestClient({
      method: 'post',
      maxBodyLength: Infinity,
      url: DH_URLTK,
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': 'en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': DH_URLUSA,
        'Dreame-Rlc': DH_URLDRLC,
        'Authorization': DH_URLAUTH,
        'Tenant-Id': DH_Tenant,
      },
      data: {
        grant_type: 'password',
        scope: 'all',
        platform: 'IOS',
        type: 'account',
        username: this.config.username,
        password: crypto.createHash('md5').update(this.config.password + 'RAylYC%fmSKp7%Tq').digest('hex'),
      },
    }).then(async (response) => {
      const responseData = response.data;
      if (LogData) {
        this.log.info('Login response: ' + JSON.stringify(response.data));
      }
      const RetObject = JSON.parse(JSON.stringify(responseData));

      await this.DH_PropObject(RetObject, 'login.', 'Login: ');
      this.setState('info.connection', true, true);
      DH_Auth = responseData['access_token'];
      DH_AuthRef = responseData['refresh_token'];
      DH_Expires = responseData['expires_in'];
      DH_Tenant = responseData['tenant_id'];
      DH_Country = responseData['country'];
      DH_Uid = responseData['uid'];
      DH_Domain = responseData['domain'];
      DH_Lang = responseData['lang'];
      DH_Region = responseData['region'];
      if (DH_Domain == undefined) {
        DH_Domain = 'https://' + DH_Region + DH_DHURLSENDDOM;
      }
      DH_Islogged = true;
      if (DH_Lang.toUpperCase() == 'DE') { UserLang = DH_Lang.toUpperCase(); } /*Translate function*/
      let SETURLData = {};
      const GetCloudRequestList = await this.DH_URLRequest(DH_URLLST, SETURLData);
      if (GetCloudRequestList) {
        const GetListData = JSON.parse(JSON.stringify(GetCloudRequestList.data.page.records));
        if (LogData) {
          this.log.info('Split ' + DH_URLLST + ' response: ' + JSON.stringify(GetListData));
        }

        // Check if the selected index is within the list bounds
        if (selectedDeviceIndex >= 0 && selectedDeviceIndex < GetListData.length) {

          // Log the valid device index
          this.log.info(`Selected device index is valid: ${selectedDeviceIndex}`);

			 // Log device details - access DH_Model directly from the selectedDevice
          const selectedDevice = GetListData[selectedDeviceIndex];
			 // Log device details - access DH_Model directly from the selectedDevice
          this.log.info(`====> Device details: Model = ${selectedDevice.model}, DID = ${selectedDevice.did}, MAC = ${selectedDevice.mac} <====`);

          DH_Did = selectedDevice.did;
          DH_Model = selectedDevice.model;
          DH_Mac = selectedDevice.mac;
          DH_BDomain = selectedDevice.bindDomain;
          DH_Host = DH_BDomain.split('.')[0];

          await this.DH_PropObject(selectedDevice, DH_Did + '.general.', 'Get listV2: ');
        } else {
          this.log.warn('Invalid device index: ' + selectedDeviceIndex);
        }

        SETURLData = {
          did: DH_Did,
          keys: '6.8',
        };
        const GetCloudRequestObjName = await this.DH_URLRequest(DH_URLPROP, SETURLData);
        const GetObjNameData = JSON.parse(JSON.stringify(GetCloudRequestObjName.data))[0].value;
        DH_filename = JSON.parse(GetObjNameData).obj_name;
        this.log.info('Fetching obj_name: ' + DH_filename);

        // Initialize water tracking
        await this.initWaterTracking();
      }

      for (const [CPkeyRaw, CPvalue] of Object.entries(DreameStateCustomProperties)) {
        const CPkey = CPkeyRaw === '-1' ? -1 : CPkeyRaw;
        const Cpath = `${DH_Did}.state.${CPvalue.replace(/\w\S*/g, CPName =>
          CPName.charAt(0).toUpperCase() + CPName.substr(1).toLowerCase()
        ).replace(/\s/g, '')}`;

        await this.DH_getType(CPkey, Cpath);
        await this.DH_setState(Cpath, CPkey, true);
      }


      for (const [SPkey, SPvalue] of Object.entries(DreameStateProperties)) {
        // this.log.info('=====> ' + SPkey + " => " + ToFindVar);
	            const GetSIID = (SPkey.split('S')[1] ||'').split('P')[0];
        const GetPIID = SPkey.replace('S' + GetSIID + 'P', '');
	            const GetSIIDPIID = GetSIID + '.' + GetPIID;
        SETURLData = {
          did: DH_Did,
          keys: GetSIIDPIID
        };

        try {
          const GetCloudRequestDeviceData = await this.DH_URLRequest(DH_URLPROP, SETURLData);
          let RetPointValue = JSON.parse(JSON.stringify(GetCloudRequestDeviceData.data))[0].value;
          if (RetPointValue) {
		   //this.log.info("============Get " + SPvalue + " response: " + JSON.stringify(GetCloudRequestDeviceData));
            const path = DH_Did + '.state.' + SPvalue.replace(/\w\S*/g, function(SPName) {
              return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
            }).replace(/\s/g, '');
            this.log.info('Get and update ' + SPvalue + ' value to: ' + JSON.stringify(RetPointValue));
            if (path) {
              if (Object.prototype.toString.call(RetPointValue).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                RetPointValue = JSON.stringify(RetPointValue);
              }
              if (SPkey == 'S2P1') {
                await this.DH_getType(RetPointValue, path.replace('.state.', '.vis.'), SPkey);
                await this.DH_setState(path.replace('.state.', '.vis.'), RetPointValue, true);
              }
              if (SPkey == 'S4P7' /*"Task status"*/ ) {
                await this.DH_getType(RetPointValue, path.replace('.state.', '.vis.'), SPkey);
                await this.DH_setState(path.replace('.state.', '.vis.'), RetPointValue, true);
                DH_NowTaskStatus = isNaN(+RetPointValue) ? 0 : +RetPointValue; // Change State
				  this.log.info(`=======> DH_NowTaskStatus (${SPkey}) Set to : ${RetPointValue}`);
              }
			  if (SPkey == 'S4P1' /*"Status"*/ ) {
                DH_NowStatus = isNaN(+RetPointValue) ? 0 : +RetPointValue; // Change State
				  this.log.info(`=======> DH_NowStatus (${SPkey}) Set to : ${RetPointValue}`);
              }
              RetPointValue = await this.DH_SetPropSPID(SPkey, RetPointValue);
              await this.DH_getType(RetPointValue, path, SPkey);
              await this.DH_setState(path, RetPointValue, true);
            }
		  }
        } catch (err) {
          this.log.warn('Getting "' + SPvalue + '" State from cloud failed: ' + err);
        }
      }

      //Get Net Settings
      SETURLData = {
        did: DH_Did
      };
      const GetCloudRequestOTCInfo = await this.DH_URLRequest(DH_URLOTCINF, SETURLData);
      await this.DH_PropObject(GetCloudRequestOTCInfo.data, DH_Did + '.general.', 'Get OTCInfo: ');
      //return responseData;
    }).catch((error) => {
      this.log.warn('Unable to login to device over cloud: DH_CloudLogin | Login error response: ' + JSON.stringify(error));
      error.response && this.log.error('Login error response: ' + JSON.stringify(error.response.data));
      this.setState('info.connection', false, true);
    });
    await this.DH_RequestNewMap();
    //await this.DH_GetControl();
    await this.DH_RequestControlState();

    await this.logFullConfig();

  }

  async DH_PropObject(InData, InPath, InLog) {
    for (const [key, value] of Object.entries(InData)) {
      const path = `${InPath}${key}`;

      if (value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          await this.DH_PropObject(value, `${path}.`, InLog);
        } else {
          if (InLog) {
            this.log.info(`${InLog} Set ${path} to ${JSON.stringify(value)}`);
          }
          await this.DH_getType(value, path);
          await this.DH_setState(path, Array.isArray(value) ? JSON.stringify(value) : value, true);
        }
      }
    }
  }

  async DH_URLRequest(DHurl, SetData) {
    return await this.DH_requestClient({
      method: 'post',
      maxBodyLength: Infinity,
      url: DHurl,
      headers: {
        'Accept': '*/*',
        //'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': 'en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': DH_URLUSA,
        'Authorization': DH_URLAUTH,
        'Tenant-Id': DH_Tenant,
        'Content-Type': 'application/json',
        'Dreame-Auth': DH_Auth,
      },
      data: SetData,
    }).then(async (response) => {
      if (LogData) {
        this.log.info(DHurl + ' response: ' + JSON.stringify(response.data));
      }
      return response.data;
    }).catch((error) => {
      this.log.warn(JSON.stringify(error));
    });
  }

  async decryptDreameMap(encryptedData, model, enckey) {
    const iv = DREAME_IVs[model];
    if (!iv) throw new Error(`IV for model ${model} not in the database!`);

    try {
      const key = crypto.createHash('sha256').update(enckey).digest().slice(0, 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'utf8'));
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted;
    } catch (err) {
      throw new Error(`AES decryption failed: ${err.message}`);
    }
  }


  // Decodes a Base64-encoded map string to JSON
  async decodeMapToJSON(mapDataStr) {
    try {
    // 1. Prepare Base64 data
      let encodedData = mapDataStr;

      // If AES key is present (when string contains comma)
      if (mapDataStr.includes(',')) {
        const [data, key] = mapDataStr.split(',');
        encodedData = data.replace(/-/g, '+').replace(/_/g, '/');

        // Perform AES decryption
        const aesKey = crypto.SHA256(key).toString().substr(0, 32);
        const decrypted = crypto.AES.decrypt(
          encodedData,
          crypto.enc.Utf8.parse(aesKey),
          {
            iv: crypto.enc.Utf8.parse(''),
            mode: crypto.mode.CBC,
            padding: crypto.pad.Pkcs7
          }
        );
        encodedData = decrypted.toString(crypto.enc.Base64);
      } else {
        encodedData = mapDataStr.replace(/-/g, '+').replace(/_/g, '/');
      }

      // 2. Base64 decode
      const buffer = Buffer.from(encodedData, 'base64');

      // 3. Unpack with zlib (synchronous)
      const inflated = zlib.inflateSync(buffer);

      // 4. Read map dimensions
      const mapWidth = inflated.readInt16LE(19);
      const mapHeight = inflated.readInt16LE(21);

      // 5. Extract JSON part (starting from position 27 + map data)
      const jsonStart = 27 + (mapWidth * mapHeight);
      const jsonString = inflated.slice(jsonStart).toString('utf8');

      return JSON.parse(jsonString);
    } catch (error) {
      this.log.error('Error decoding map:', error);
      return null;
    }
  }

  // Requesting and processing new map data
  async DH_RequestNewMap() {

    // Variable declarations
    let DH_jsonread = null;
    let DH_jsondecode = null;
    let DH_decode = null;
    let DH_DecodeMap = null;
    let mymapData = null;
    let Mapcanvas = null;
    let Mapctx = null;
    let enckey = null;
    let filename = null;
    let currentMap = null;

    try {
      // 1. Request map URL from cloud service
      const SETURLData = {
        did: DH_Did,
        model: DH_Model,
        filename: DH_filename,
        region: DH_Region
      };

      const GetCloudRequestMap = await this.DH_URLRequest(DH_URLDOWNURL, SETURLData);
      if (!GetCloudRequestMap) {
        this.log.warn('No map data received from cloud');
        return;
      }

      // 2. Download and parse map data
      const RetFileData = await this.DH_getFile(GetCloudRequestMap.data);

      // 3. Store raw data in state
      await this.setObjectNotExistsAsync(DH_Did + '.map.CloudData', {
        type: 'state',
        common: {
          name: 'Map object',
          type: 'json',
          role: 'array',
          write: false,
          read: true,
          def: ''
        },
        native: {},
      });
      await this.setStateAsync(DH_Did + '.map.CloudData', JSON.stringify(RetFileData), true);

      // 4. Process available maps
      let mapKeys = [];
      if (RetFileData?.mapstr) {
        mapKeys = Object.keys(RetFileData.mapstr);
        const dynamicStates = {};
        mapKeys.forEach((mapKey) => {
          dynamicStates[mapKey] = `Map ${parseInt(mapKey)+1}`;
        });

        // 5. Create/update map selection object
        const mapNumberPath = DH_Did + '.map.MapNumber';
        if (!await this.objectExists(mapNumberPath)) {
          await this.setObjectNotExistsAsync(mapNumberPath, {
            type: 'state',
            common: {
              name: 'Map Number',
              type: 'number',
              role: 'level',
              states: dynamicStates,
              write: true,
              read: true,
              def: mapKeys[0] || 0
            },
            native: {},
          });
        } else {
          await this.extendObjectAsync(mapNumberPath, {
            common: { states: dynamicStates }
          });
        }

        // 6. Determine current map
        try {
          const DH_CurMapOb = await this.getStateAsync(mapNumberPath);
          currentMap = (DH_CurMapOb && DH_CurMapOb.val !== null) ? DH_CurMapOb.val : (mapKeys[0] || 0);

          if (mapKeys.length > 0 && !mapKeys.includes(currentMap.toString())) {
            currentMap = mapKeys[0];
            await this.setStateAsync(mapNumberPath, currentMap, true);
            this.log.warn('Invalid map number, reset to default');
          }

          await this.updateFloorsBasedOnMaps(currentMap);

          // 7. Process selected map data
          if (RetFileData?.mapstr && currentMap.toString() in RetFileData.mapstr) {
            DH_DecodeMap = JSON.stringify(RetFileData.mapstr[currentMap.toString()].map);
          }

          if (LogData) {
            this.log.info('Decode Map response: ' + JSON.stringify(DH_DecodeMap));
          }

          if (DH_DecodeMap) {
            try {
              mymapData = await this.parseRoboMap(DH_DecodeMap, DH_Model);
              DH_decode = mymapData.jsonData;

              if (!DH_Map) DH_Map = {};

              // Store map with polygon data in original mm coordinates
              const polygonData = this.createCompletePolygonStructure(mymapData);
              DH_Map[currentMap] = {
                ...mymapData.jsonData,
                header: mymapData.header,
                polygons: polygonData,
                coordinateSystem: {
                  gridSize: mymapData.header.gridSize,
                  origin: {
                    x: mymapData.header.origin.x,
                    y: mymapData.header.origin.y,
                    left: mymapData.header.origin.left,
                    top: mymapData.header.origin.top
                  },
                  mapDimensions: {
                    width: mymapData.header.width,
                    height: mymapData.header.height
                  }
                }
              };

              if (LogData) {this.log.info('Map with polygon data saved: ' + JSON.stringify(DH_Map[currentMap]));}

              // Create visual representation
              Mapcanvas = createCanvas(mymapData.header.width, mymapData.header.height);
              Mapctx = Mapcanvas.getContext('2d');

              // Draw map layers
              await this.drawBackground(Mapctx, Mapcanvas);
              await this.drawRooms(Mapctx, DH_Map[currentMap].polygons, DH_Map[currentMap].coordinateSystem);
              await this.drawWalls(Mapctx, DH_Map[currentMap].polygons, DH_Map[currentMap].coordinateSystem);

              // Save map image
              const imageBase64 = Mapcanvas.toDataURL('image/png');
              await this.setObjectNotExistsAsync(DH_Did + '.map.' + currentMap + '.MapImage', {
                type: 'state',
                common: {
                  name: 'Map Image',
                  type: 'string',
                  role: 'image',
                  write: false,
                  read: true
                },
                native: {},
              });
              await this.setState(DH_Did + '.map.' + currentMap + '.MapImage', imageBase64, true);

              // Store robot and charger positions
              if (DH_decode) {
                DH_jsonread = typeof DH_decode === 'string' ? JSON.parse(DH_decode) : DH_decode;

                await Promise.all([
                  this.setObjectNotExistsAsync(DH_Did + '.mqtt.robot', {
                    type: 'state',
                    common: {
                      name: 'Robot Position',
                      type: 'json',
                      role: 'array',
                      write: false,
                      read: true,
                      def: JSON.stringify(DH_jsonread.robot || {})
                    },
                    native: {},
                  }),
                  this.setObjectNotExistsAsync(DH_Did + '.mqtt.charger', {
                    type: 'state',
                    common: {
                      name: 'Charger Position',
                      type: 'json',
                      role: 'array',
                      write: false,
                      read: true,
                      def: JSON.stringify(DH_jsonread.charger || {})
                    },
                    native: {},
                  })
                ]);
              }

            } catch (error) {
              this.log.error('Error processing map:' + error);
            }
          }
        } catch (error) {
          this.log.error('Error processing map number:' + error);
        }
      }
    } catch (error) {
      this.log.error(`Map request failed: ${error}`);
    } finally {
      // Cleanup
      DH_jsondecode = null;
      DH_DecodeMap = null;
      enckey = null;
      filename = null;

      // Release canvas resources
      if (Mapcanvas) {
        Mapcanvas.width = 1;
        Mapcanvas.height = 1;
        Mapctx = null;
        Mapcanvas = null;
      }

      // Clean up mymapData
      if (mymapData) {
        mymapData.header = null;
        if (mymapData.rooms) {
          Object.values(mymapData.rooms).forEach(room => {
            room.pixels = null;
            room.borders = null;
          });
        }
        mymapData = null;
      }

      // Manual garbage collection
      if (global.gc) {
        global.gc();
        this.log.info('Manual garbage collection performed');
      }
    }
  }

  // Parses robot map data with advanced polygon handling
  async parseRoboMap(mapDataStr, deviceModel) {
    try {
      // 1. Prepare and decode data
      const [encodedData, aesKey] = mapDataStr.includes(',')
        ? [mapDataStr.split(',')[0].replace(/-/g, '+').replace(/_/g, '/'), mapDataStr.split(',')[1]]
        : [mapDataStr.replace(/-/g, '+').replace(/_/g, '/'), null];

      // 2. Base64 decode
      let buffer = Buffer.from(encodedData, 'base64');

      // 3. Perform AES decryption if needed
      if (aesKey && deviceModel && DREAME_IVs[deviceModel]) {
        const key = crypto.SHA256(aesKey).toString().substr(0, 32);
        const iv = crypto.enc.Utf8.parse(DREAME_IVs[deviceModel]);

        const decrypted = crypto.AES.decrypt(
          encodedData,
          crypto.enc.Utf8.parse(key),
          { iv, mode: crypto.mode.CBC, padding: crypto.pad.Pkcs7 }
        );

        buffer = Buffer.from(decrypted.toString(crypto.enc.Base64), 'base64');
      }

      // 4. Decompress data
      const inflated = zlib.inflateSync(buffer);

      // 5. Parse header information
      const header = {
        mapId: inflated.readInt16LE(0),
        frameType: inflated.readUInt8(4),
        robot: {
          x: inflated.readInt16LE(5),
          y: inflated.readInt16LE(7),
          angle: inflated.readInt16LE(9)
        },
        charger: {
          x: inflated.readInt16LE(11),
          y: inflated.readInt16LE(13),
          angle: inflated.readInt16LE(15)
        },
        gridSize: inflated.readInt16LE(17), // mm per pixel
        width: inflated.readInt16LE(19),
        height: inflated.readInt16LE(21),
        origin: {
          x: inflated.readInt16LE(23),
          y: inflated.readInt16LE(25),
          left: '',
          top: ''
        }
      };

      // 6. Calculate origin position in pixel coordinates
      header.origin.left = Math.round(header.origin.x / header.gridSize) * -1;
      header.origin.top = Math.round(header.origin.y / header.gridSize) * -1;

      // 7. Extract pixel data
      const mapStart = 27;
      const mapEnd = mapStart + header.width * header.height;
      const mapData = inflated.slice(mapStart, mapEnd);

      // 8. Parse JSON metadata
      const jsonData = JSON.parse(inflated.slice(mapEnd).toString());

      // 9. Process room pixels and create polygons
      const rooms = {};
      for (let y = 0; y < header.height; y++) {
        for (let x = 0; x < header.width; x++) {
          const pos = y * header.width + x;
          const val = mapData.readUInt8(pos);
          const areaId = val & 0x3f;
          const isBorder = (val >> 7) === 1;

          if (areaId > 0) {
            if (!rooms[areaId]) {
              rooms[areaId] = {
                pixels: [],
                borders: [],
                minX: x,
                maxX: x,
                minY: y,
                maxY: y
              };
            }

            const room = rooms[areaId];
            room.pixels.push({x, y});

            if (isBorder) room.borders.push({x, y});
            if (x < room.minX) room.minX = x;
            if (x > room.maxX) room.maxX = x;
            if (y < room.minY) room.minY = y;
            if (y > room.maxY) room.maxY = y;
          }
        }
      }

      // 10. Convert to mm and create precise polygons
      Object.keys(rooms).forEach(id => {
        const room = rooms[id];
        const gridSize = header.gridSize;
        const origin = header.origin;

        // Convert bounds to mm
        room.minX *= gridSize;
        room.maxX *= gridSize;
        room.minY *= gridSize;
        room.maxY *= gridSize;

        // Create exact polygon matching pixel shape
        const polygonWithHoles = this.createExactRoomPolygon(room.pixels, gridSize, origin);
        room.polygon = polygonWithHoles.outer;
        room.holes = polygonWithHoles.holes;

        // Calculate center in mm
        room.center = {
          x: (room.minX + room.maxX) / 2,
          y: (room.minY + room.maxY) / 2
        };
      });

      return {
        header,
        rooms,
        jsonData
      };

    } catch (error) {
      this.log.error('Error parsing map:' + error);
      return null;
    }
  }

  // Creates a polygon from room pixel data, including holes
  createExactRoomPolygon(roomPixels, gridSize, origin) {
    if (!roomPixels?.length) return [];

    const offsetX = -origin.left;
    const offsetY = -origin.top;
    const pixelMap = this.buildPixelMap(roomPixels);

    // Find contours with protection against infinite loops
    const { outerContour, holes } = this.findAllContoursSafe(pixelMap);

    // Convert to world coordinates
    const convertToWorld = (contour) =>
      contour.map(({ x, y }) => ({
        x: (x - origin.left) * gridSize,
        y: (y - origin.top) * gridSize
      }));

    return {
      outer: convertToWorld(outerContour),
      holes: holes.map(hole => convertToWorld(hole))
    };
  }

  // Creates a binary pixel map for O(1) lookups
  buildPixelMap(pixels) {
    const map = new Map();
    for (const { x, y } of pixels) {
      map.set(`${x},${y}`, true);
    }
    return map;
  }

  // Robust hole detection with geometric validation
  findAllContoursSafe(pixelMap) {
    const visited = new Set();
    const outerContour = this.traceContourSafe(pixelMap, visited);
    if (!outerContour.length) return { outerContour: [], holes: [] };

    // 1. Determine boundaries for scanline algorithm
    const bounds = this.getContourBounds(outerContour);
    const [minX, maxX, minY, maxY] = bounds;

    // 2. Find potential hole starting points with scanline
    const holeSeeds = this.findHoleSeeds(outerContour, pixelMap, visited, minX, maxX, minY, maxY);

    // 3. Validate and trace holes
    const holes = [];
    for (const seed of holeSeeds) {
      if (!visited.has(`${seed.x},${seed.y}`)) {
        const hole = this.traceContourSafe(pixelMap, visited, seed, true);

        if (hole.length >= 3 &&
                this.isValidHole(hole, outerContour)) {
          holes.push(hole);
        }
      }
    }

    return { outerContour, holes };
  }

  // Contour tracing with protection against infinite loops
  traceContourSafe(pixelMap, visited, startPixel = null) {
    const contour = [];
    startPixel = startPixel || this.findStartPixel(pixelMap);
    if (!startPixel) return [];

    let current = { ...startPixel };
    let prevDir = 0; // Starting direction: right
    let iterations = 0;
    const MAX_ITERATIONS = 1000; // Prevents infinite loops

    // Clockwise movement directions (8-neighborhood)
    const directions = [
      { dx: 1, dy: 0 },   // Right
      { dx: 1, dy: -1 },  // Top-Right
      { dx: 0, dy: -1 },   // Top
      { dx: -1, dy: -1 }, // Top-Left
      { dx: -1, dy: 0 },   // Left
      { dx: -1, dy: 1 },   // Bottom-Left
      { dx: 0, dy: 1 },    // Bottom
      { dx: 1, dy: 1 }      // Bottom-Right
    ];

    do {
      contour.push(current);
      visited.add(`${current.x},${current.y}`);
      iterations++;

      // Find next pixel in clockwise direction
      let found = false;
      for (let i = 0; i < 8; i++) {
        const dir = (prevDir + 6 + i) % 8; // Start left of previous direction
        const next = {
          x: current.x + directions[dir].dx,
          y: current.y + directions[dir].dy
        };

        if (pixelMap.has(`${next.x},${next.y}`)) {
          prevDir = dir;
          current = next;
          found = true;
          break;
        }
      }

      if (!found || iterations >= MAX_ITERATIONS) break;
    } while (current.x !== startPixel.x || current.y !== startPixel.y);

    // Close polygon if needed
    if (contour.length > 1 && (contour[0].x !== contour[contour.length-1].x ||
                               contour[0].y !== contour[contour.length-1].y)) {
      contour.push({ ...contour[0] });
    }

    return contour;
  }

  // Scanline algorithm for hole seed detection
  findHoleSeeds(outerContour, pixelMap, visited, minX, maxX, minY, maxY) {
    const seeds = [];
    const contourSet = new Set(outerContour.map(p => `${p.x},${p.y}`));

    // Scanline with 2px step for performance
    for (let y = minY; y <= maxY; y += 2) {
      let inside = false;
      let prevOnContour = false;

      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`;
        const onContour = contourSet.has(key);

        // Edge transition detection
        if (onContour && !prevOnContour) {
          inside = !inside;
        }
        prevOnContour = onContour;

        if (inside && !visited.has(key) && !pixelMap.has(key)) {
          // Check for new unique starting point
          if (!seeds.some(s => Math.abs(s.x - x) < 2 && Math.abs(s.y - y) < 2)) {
            seeds.push({ x, y });
          }
        }
      }
    }
    return seeds;
  }

  // Checks if a hole is valid
  isValidHole(hole, outerContour) {
    try {
      // 1. Basic validation
      if (!hole?.length || !outerContour?.length) return false;

      // 2. Calculate center
      let holeCenter;
      try {
        holeCenter = this.getPolygonCentroid(hole);
      } catch (e) {
        // Fallback for simple midpoint calculation
        holeCenter = {
          x: hole.reduce((sum, p) => sum + p.x, 0) / hole.length,
          y: hole.reduce((sum, p) => sum + p.y, 0) / hole.length
        };
      }

      // 3. Area calculation
      const holeArea = this.MapcalculatePolygonArea(hole);
      const outerArea = this.MapcalculatePolygonArea(outerContour);

      // 4. Validation criteria
      return (
        this.isPointInsidePolygon(holeCenter, outerContour) &&
            holeArea < (outerArea * 0.5) &&
            holeArea > 0
      );
    } catch (error) {
      this.log.error('Hole validation error:', error);
      return false;
    }
  }

  // Calculates the true geometric centroid
  getPolygonCentroid(polygon) {
    if (!polygon?.length || polygon.length < 3)
      return polygon?.[0] || { x: 0, y: 0 };

    let area = 0, cx = 0, cy = 0;
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const cross = (xi * yj) - (xj * yi);
      area += cross;
      cx += (xi + xj) * cross;
      cy += (yi + yj) * cross;
    }

    area /= 2;
    const factor = 1 / (6 * area);

    return {
      x: Math.abs(cx * factor),
      y: Math.abs(cy * factor)
    };
  }

  // Calculates polygon area
  MapcalculatePolygonArea(polygon) {
    if (!polygon?.length || polygon.length < 3) return 0;

    let area = 0;
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }

    return Math.abs(area / 2);
  }

  // Gets contour boundaries
  getContourBounds(contour) {
    if (!contour?.length) return [0, 0, 0, 0];

    let minX = Infinity, maxX = -Infinity,
      minY = Infinity, maxY = -Infinity;

    for (const point of contour) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return [minX, maxX, minY, maxY];
  }

  // Finds top-left pixel as starting point
  findStartPixel(pixelMap) {
    const pixels = [...pixelMap.keys()].map(k => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    });
    if (!pixels.length) return null;

    // Sort by Y (top) then X (left)
    pixels.sort((a, b) => a.y - b.y || a.x - b.x);
    return pixels[0];
  }

  // Point-in-polygon test using raycasting
  isPointInsidePolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Creates an optimized polygon from pixel data
  createOptimizedRoomPolygon(pixels, gridSize) {
    if (!pixels.length) return [];

    // Simple bounding box with rounded corners
    const minX = Math.min(...pixels.map(p => p.x)) * gridSize;
    const maxX = Math.max(...pixels.map(p => p.x)) * gridSize;
    const minY = Math.min(...pixels.map(p => p.y)) * gridSize;
    const maxY = Math.max(...pixels.map(p => p.y)) * gridSize;

    // Create rectangle polygon with slight rounding
    const radius = gridSize * 2; // Rounding radius
    return [
      { x: minX + radius, y: minY },
      { x: maxX - radius, y: minY },
      { x: maxX, y: minY + radius },
      { x: maxX, y: maxY - radius },
      { x: maxX - radius, y: maxY },
      { x: minX + radius, y: maxY },
      { x: minX, y: maxY - radius },
      { x: minX, y: minY + radius },
      { x: minX + radius, y: minY } // Close polygon
    ];
  }

  // Creates complete polygon structure from parsed data
  createCompletePolygonStructure(parsedData) {
    const wallsInfo = parsedData.jsonData?.walls_info?.storeys?.[0];
    const pixelRooms = parsedData.rooms || {};

    return {
      meta: {
        gridSize: parsedData.header.gridSize,
        origin: {
          x: parsedData.header.origin.x,
          y: parsedData.header.origin.y
        },
        mapDimensions: {
          width: parsedData.header.width,
          height: parsedData.header.height
        }
      },
      rooms: Object.entries(pixelRooms).map(([id, room]) => ({
        id: parseInt(id),
        floorType: room.floorType || 0,
        polygon: room.polygon || [],
        holes: room.holes || [],
        center: room.center,
        bounds: {
          minX: room.minX,
          maxX: room.maxX,
          minY: room.minY,
          maxY: room.maxY
        },
        pixelData: {
          center: {
            x: room.center.x / parsedData.header.gridSize,
            y: room.center.y / parsedData.header.gridSize
          },
          bounds: {
            minX: room.minX / parsedData.header.gridSize,
            maxX: room.maxX / parsedData.header.gridSize,
            minY: room.minY / parsedData.header.gridSize,
            maxY: room.maxY / parsedData.header.gridSize
          }
        }
      })),
      walls: wallsInfo?.rooms?.map(room => ({
        id: room.room_id,
        walls: room.walls?.map(wall => ({
          type: wall.type,
          beg: { x: wall.beg_pt_x, y: wall.beg_pt_y },
          end: { x: wall.end_pt_x, y: wall.end_pt_y }
        })) || []
      })) || [],
      doors: wallsInfo?.doors?.map(door => ({
        id: door.door_id,
        type: door.door_type,
        beg: { x: door.beg_pt_x, y: door.beg_pt_y },
        end: { x: door.end_pt_x, y: door.end_pt_y }
      })) || []
    };
  }

  // Draws background
  async drawBackground(ctx, canvas) {
    ctx.fillStyle = '#FFFFFF00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draws rooms with polygons and holes
  async drawRooms(ctx, polygonData, coordinateSystem) {
    if (!polygonData?.rooms) {
      this.log.warn('No room information available for drawing');
      return;
    }

    const { gridSize, origin } = coordinateSystem;
    const offsetX = -origin.x;
    const offsetY = -origin.y;

    // Draw each room with holes
    polygonData.rooms.forEach(room => {
      if (!room.polygon?.length) return;

      // Consistent color based on room ID
      const hue = (room.id * 137) % 360;
      ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.5)`;
      ctx.strokeStyle = `hsl(${hue}, 80%, 30%)`;
      ctx.lineWidth = 1;

      // Begin path for room with holes
      ctx.beginPath();

      // Draw main polygon (clockwise)
      const first = room.polygon[0];
      ctx.moveTo(
        (first.x + offsetX) / gridSize,
        (first.y + offsetY) / gridSize
      );

      for (let i = 1; i < room.polygon.length; i++) {
        const point = room.polygon[i];
        ctx.lineTo(
          (point.x + offsetX) / gridSize,
          (point.y + offsetY) / gridSize
        );
      }
      ctx.closePath();

      // Draw holes (counter-clockwise)
      if (room.holes?.length) {
        room.holes.forEach(hole => {
          if (hole.length < 3) return; // Minimum 3 points for a hole

          const holeFirst = hole[0];
          ctx.moveTo(
            (holeFirst.x + offsetX) / gridSize,
            (holeFirst.y + offsetY) / gridSize
          );

          // Draw hole in reverse order for proper cutout
          for (let i = hole.length - 1; i >= 0; i--) {
            const point = hole[i];
            ctx.lineTo(
              (point.x + offsetX) / gridSize,
              (point.y + offsetY) / gridSize
            );
          }
          ctx.closePath();
        });
      }

      // Fill complete shape and outline
      ctx.fill('evenodd'); // Important for holes!
      ctx.stroke();

      // Draw room ID
      if (room.center) {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          room.id.toString(),
          room.center.x / gridSize,
          room.center.y / gridSize
        );
      }
    });
  }

  // Draws walls and doors with coordinate transformation
  async drawWalls(ctx, polygonData, coordinateSystem) {
    if (!polygonData?.walls || !polygonData.doors) {
      this.log.warn('Incomplete wall/door data for drawing');
      return;
    }

    const { gridSize, origin } = coordinateSystem;
    const offsetX = -origin.x;
    const offsetY = -origin.y;

    // Transformation function
    const toCanvas = (x, y) => ({
      x: (x + offsetX) / gridSize,
      y: (y + offsetY) / gridSize
    });

    // 1. Draw walls
    ctx.strokeStyle = '#1a1a1a'; // Dark gray for walls
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    polygonData.walls.forEach(room => {
      if (!room.walls?.length) return;

      room.walls.forEach(wall => {
        const start = toCanvas(wall.beg.x, wall.beg.y);
        const end = toCanvas(wall.end.x, wall.end.y);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      });
    });

    // 2. Draw doors
    ctx.strokeStyle = '#FFA500'; // Orange for doors
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]); // Dashed pattern

    polygonData.doors.forEach(door => {
      const start = toCanvas(door.beg.x, door.beg.y);
      const end = toCanvas(door.end.x, door.end.y);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    // Reset line style
    ctx.setLineDash([]);
    this.log.debug(`Drawn: ${polygonData.walls.length} rooms with walls and ${polygonData.doors.length} doors`);
  }

  // Updates floor states based on available maps
  async updateFloorsBasedOnMaps(currentMapNumber) {
    const In_path = DH_Did + '.vis.';

    // 1. Ensure base floor exists
    if (!await this.objectExists(`${In_path}ViewSettings0`)) {
      await this.createFloorStates(1);
      this.log.info('Created base floor states');
    }

    // 2. Get available floors from MapNumber states
    const mapObj = await this.getObjectAsync(DH_Did + '.map.MapNumber');
    let availableFloors = [1]; // Default to Floor 1

    if (mapObj?.common?.states) {
      availableFloors = Object.keys(mapObj.common.states)
        .map(Number)
        .sort((a,b) => a - b)
        .map(n => n + 1); // Convert to 1-based numbering
    }

    // 3. Create missing floor states
    for (const floor of availableFloors) {
      const storageNumber = floor - 1;
      if (!await this.objectExists(`${In_path}ViewSettings${storageNumber}`)) {
        await this.createFloorStates(floor);
        this.log.info(`Created floor states for floor ${floor}`);
      }
    }
  }

  // Creates state objects for a floor
  async createFloorStates(requestedFloor) {
    const actualFloor = requestedFloor - 1;
    const In_path = DH_Did + '.vis.';

    const defaultPerspective = {
      perspective: {
        xRotation: 0,
        yRotation: 0,
        zRotation: 0,
        perspective: 1200,
        zoom: 100,
        xPosition: 0,
        yPosition: 0,
        bgColor: '#ffffff'
      },
      visibility: {
        showRobotPath: true,
        showHistoryPath: true,
        labelsHidden: false
      },
      selections: {
        rooms: [],
        carpets: []
      }
    };

    await Promise.all([
      this.setObjectNotExistsAsync(`${In_path}ViewSettings${actualFloor}`, {
        type: 'state',
        common: {
          name: `Map Perspective Settings Floor ${requestedFloor}`,
          type: 'object',
          role: 'json',
          write: true,
          read: true,
          def: JSON.stringify(defaultPerspective)
        },
        native: {}
      }),
      this.setObjectNotExistsAsync(`${In_path}PosHistory${actualFloor}`, {
        type: 'state',
        common: {
          name: `Map Position History Floor ${requestedFloor}`,
          type: 'mixed',
          role: 'state',
          write: true,
          read: true,
          def: '{}'
        },
        native: {}
      }),
      this.setObjectNotExists(`${In_path}vishtml${actualFloor}`, {
        type: 'state',
        common: {
          name: `HTML file for floor ${requestedFloor}`,
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: ''
        },
        native: {}
      })
    ]);
  }

  async DH_getFile(url) {
    if (LogData) {this.log.info(`[INFO] DH_getFile called with URL: ${url}`);}

    // Validate the URL
    if (!url || typeof url !== 'string') {
      this.log.error(`[ERROR] Invalid URL provided: ${url}`);
      return null;
    }

    const DH_RetryCount = 2;
    let DH_Retries = 0;

    while (DH_Retries < DH_RetryCount) {
      if (LogData) {this.log.info(`[INFO] Attempt ${DH_Retries + 1}/${DH_RetryCount} - Fetching file from: ${url}`);}

      try {
        const response = await this.DH_requestClient.get(url, { timeout: 3000 });

        if (LogData) {this.log.info(`[INFO] Response status: ${response.status}`);}

        if (response?.status === 200) {
          const responseData = JSON.stringify(response.data);
          this.log.info(`[SUCCESS] Received data: ${responseData.substring(0, 100)}...`);
          return response.data;
        } else {
          this.log.warn(`[WARNING] Unexpected response status (${response.status}) while fetching file.`);
        }
      } catch (error) {
        this.log.warn(`[WARNING] Error fetching file (${url}): ${error.message}`);
      }

      DH_Retries++;
    }

    this.log.error(`[ERROR] All ${DH_RetryCount} attempts failed. Could not retrieve the file.`);
    return null; // Return null if all retries fail
  }

  async DH_GetSetRooms() {
    // First, check DH_Map
    if (DH_Map) {
      const Mrooms = DH_Map[DH_CurMap]?.['walls_info']?.storeys?.[0]?.rooms;
      if (Mrooms) {
        this.processRooms(Mrooms, DH_Map[DH_CurMap]);  // customMapData
        return; // Exit function if DH_Map contains valid data
      } else {
        this.log.warn('No rooms found in DH_Map.');
      }
    }

    // If DH_Map is empty or unavailable, try Robot.Map.UserCustomMap
    const GetUserCustomMap = await this.getStateAsync(DH_Did + `.map.UserCustomMap`);
    if (GetUserCustomMap && GetUserCustomMap.val) {
      const customMapData = JSON.parse(GetUserCustomMap.val);

      if (customMapData.CustomMap === 1) {  // Use data only if CustomMap is set to 1
        const Mrooms = customMapData.storeys?.[0]?.rooms;
        if (Mrooms) {
          this.processRooms(Mrooms, customMapData);  // Process rooms from UserCustomMap
          return; // Exit function if UserCustomMap is valid
        } else {
          this.log.warn('No rooms found in UserCustomMap.');
        }
      } else {
        this.log.warn('CustomMap is not set to 1.');
      }
    } else {
      this.log.warn('Robot.Map.UserCustomMap is empty or unavailable.');
    }
  }

  async processRooms(Mrooms, customMapData) {
    if (!customMapData) {
      this.log.warn('customMapData is undefined. Cannot process rooms.');
      return;
    }

    // Clear arrays before populating them
    CheckArrayRooms.length = 0;
    Alexarooms.length = 0;

    // Iterate through rooms
    for (const iRoom of Mrooms) {
      const { walls } = iRoom;
      const CheckArrayRoomsX = [];
      const CheckArrayRoomsY = [];

      // Collect wall points into arrays
      for (const iWall of walls) {
        CheckArrayRoomsX.push(iWall['beg_pt_x'], iWall['end_pt_x']);
        CheckArrayRoomsY.push(iWall['beg_pt_y'], iWall['end_pt_y']);
      }

      const SortiRoom = {
        Id: iRoom['room_id'],
        X: CheckArrayRoomsX,
        Y: CheckArrayRoomsY
      };

      // Extract segment type from seg_inf
      const SegmentType = customMapData.seg_inf?.[iRoom['room_id']]?.type;
      SortiRoom.Name = SegmentType === 0
        ? await this.DH_Base64DecodeUnicode(customMapData.seg_inf[iRoom['room_id']].name)
        : SegmentToName[UserLang]?.[SegmentType] || `Room_${SortiRoom.Id}`;

      // Add room to CheckArrayRooms
      CheckArrayRooms.push(SortiRoom);

      // Set room parameters
      await this.DH_setRoomPath(DH_Did + `.map.${DH_CurMap}.${SortiRoom.Name}.SuctionLevel`, DreameSuctionLevel[UserLang], `${SortiRoom.Name} Suction Level`);
      await this.DH_setRoomPath(DH_Did + `.map.${DH_CurMap}.${SortiRoom.Name}.WaterVolume`, DreameSetWaterVolume[UserLang], `${SortiRoom.Name} Water Volume`);
      await this.DH_setRoomPath(DH_Did + `.map.${DH_CurMap}.${SortiRoom.Name}.Repeat`, DreameSetRepeat[UserLang], `${SortiRoom.Name} Repeat`);
      await this.DH_setRoomPath(DH_Did + `.map.${DH_CurMap}.${SortiRoom.Name}.CleaningMode`, DreameCleaningMode[UserLang], `${SortiRoom.Name} Cleaning Mode`);
      await this.DH_setRoomPath(DH_Did + `.map.${DH_CurMap}.${SortiRoom.Name}.CleaningRoute`, DreameSetRoute[UserLang], `${SortiRoom.Name} Cleaning Route`);
      await this.DH_setRoomPath(DH_Did + `.map.${DH_CurMap}.${SortiRoom.Name}.Cleaning`, DreameSetCleanRoom[UserLang], `${SortiRoom.Name} Cleaning`);
	  await this.DH_setRoomIDPath(DH_Did + `.map.${DH_CurMap}.${SortiRoom.Name}.RoomID`, SortiRoom.Id, `${SortiRoom.Name} ID`);

      // Add room to Alexa rooms list
      Alexarooms.push({ 'RN': SortiRoom.Id, 'RM': SortiRoom.Name });
    }

    // Check if customMapData and carpet_info are available
    if (!customMapData || !customMapData.carpet_info) {
      this.log.warn('customMapData or customMapData.carpet_info is not available.');
      return;
    }

    if (LogData) { this.log.warn('Test customMapData: ' + JSON.stringify(customMapData)); }

    // Access the carpet data
    const carpetInfo = customMapData.carpet_info;
    if (typeof carpetInfo === 'object') {  // Ensure it is an object
      for (const carpetKey in carpetInfo) {  // Iterate through carpets
        const carpetData = carpetInfo[carpetKey];

        // Check if carpet data has the expected structure
        if (Array.isArray(carpetData) && carpetData.length >= 4) {
          const [beg_x, beg_y, end_x, end_y, roomIds, extraInfo] = carpetData;

          // Example: Use the room identifiers (roomIds) and process the carpet accordingly
          for (const roomId of roomIds) {
            // Process carpet data based on room ID
            for (const room of CheckArrayRooms) {
              if (room.Id === roomId) {
                const CarpetCord = { Cord: [beg_x, beg_y, end_x, end_y] };
                await this.DH_setCarpetPath(
                  DH_Did + `.map.${DH_CurMap}.${room.Name}.CleanCarpet${carpetKey}`,
                  `${room.Name} Carpet${carpetKey}`,
                  CarpetCord
                );
                await this.DH_setRoomPath(
                  DH_Did + `.map.${DH_CurMap}.${room.Name}.CarpetRepetition${carpetKey}`,
                  DreameSetRepeat[UserLang],
                  `${room.Name} Carpet Repeat`
                );
                await this.DH_setRoomPath(
                  DH_Did + `.map.${DH_CurMap}.${room.Name}.CarpetSuctionLevel${carpetKey}`,
                  DreameSuctionLevel[UserLang],
                  `${room.Name} Carpet Suction Level`
                );
                this.log.info(`Found Carpet ${carpetKey} in room ${room.Name}`);
                break;
              }
            }
          }
        } else {
          this.log.warn(`Invalid carpet data for carpet ${carpetKey}: ${JSON.stringify(carpetData)}`);
        }
      }
    } else {
      this.log.warn('customMapData.carpet_info is not defined as an object.');
    }
    //this.log.warn(JSON.stringify(CheckArrayRooms));
  }

  async DH_setPath(SegSPath, SegSState, SegSName, typeValue = 'number', role = 'level', defValue = -1, writeValue = true, nativeProps = {}) {
    await this.extendObject(SegSPath, {
      type: 'state',
      common: {
        name: SegSName,
        type: typeValue,
        role: role,
        states: SegSState,
        write: writeValue,
        read: true,
        def: defValue,
      },
      native: nativeProps,
    });
  }

  async DH_setRoomPath(SegSPath, SegSState, SegSName) {
    await this.DH_setPath(SegSPath, SegSState, SegSName, 'number', 'level', -1, true);
  }

  async DH_setRoomIDPath(SegSPath, SegSState, SegSName) {
    await this.DH_setPath(SegSPath, {'value': SegSState}, SegSName, 'number', 'value', SegSState, false);
  }

  async DH_setCarpetPath(CarpSPath, CarpSName, CarpSnative) {
    await this.DH_setPath(CarpSPath, {}, CarpSName, 'boolean', 'switch', false, true, CarpSnative);
  }

  async DH_RequestControlState() {
    for (const [SPkey, SPvalue] of Object.entries(DreameActionProperties)) {
      try {
        const path = DH_Did + '.control.' + SPvalue.replace(/\w\S*/g, function(SPName) {
          return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
        }).replace(/\s/g, '');

        let RetPointValue = DreameActionParams[SPkey];
        if (path) {
          const GetobjExist = await this.getObjectAsync(path);
          if ((!GetobjExist) || (SPkey.indexOf('E') !== -1)) {
            if (Object.prototype.toString.call(RetPointValue).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
              RetPointValue = JSON.stringify(RetPointValue);
            } else {
              RetPointValue = JSON.parse(RetPointValue);
            }

            if ((SPkey.indexOf('P') !== -1) && (SPkey.indexOf('E') !== -1)) {
              RetPointValue = DreameActionExteParams[SPkey][UserLang];
            }
            await this.DH_getType(RetPointValue, path, SPkey, DreameActionParams[SPkey][0]['value']);

            if ((SPkey.indexOf('P') !== -1) && (SPkey.indexOf('E') !== -1)) {
              const Readpath = DH_Did + '.state.' + (DreameStateProperties[SPkey.split('E')[0]]).replace(/\w\S*/g, function(SPName) {
                return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
              }).replace(/\s/g, '');

              try {
                const ReadRetPointValue = await this.getStateAsync(Readpath);
                if (SPkey == 'S4P23E1') {
                  for (const CLMK in DreameCleaningMode[UserLang]) {
                    if (DreameCleaningMode[UserLang][CLMK] == ReadRetPointValue.val) {
                      RetPointValue = CLMK;
                    }
                  }
						   const VariableSIIDReadpath = DH_Did + '.state.' + (DreameStateProperties['S4P26']).replace(/\w\S*/g, function(SPName) {
                    return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                  }).replace(/\s/g, '');
                  try {
                    const ReadRVariableSIID = await this.getStateAsync(VariableSIIDReadpath);
							   if (ReadRVariableSIID.val == 1) {
                      RetPointValue = ReadRVariableSIID.val;
							   }
                  } catch (error1) {
						       if (LogData) {
						           this.log.warn('Failed to split Cleaning Mode | State failed: ' + error1);
						       }
                  }
                } else if ((SPkey == 'S4P4E1') || (SPkey == 'S4P5E1')) {
                  for (const key in DreameActionExteParams[SPkey][UserLang]) {
                    if(DreameActionExteParams[SPkey][UserLang][key] == ReadRetPointValue.val){
                      RetPointValue =  key;
                    }
                  }
                } else {
                  RetPointValue = Object.keys(DreameActionExteParams[SPkey][UserLang])[ReadRetPointValue.val];
                  const ExtendToSearch = JSON.stringify(JSON.parse(DreameActionParams[SPkey][0]['value'])['k']);
						   if (ExtendToSearch !== 'undefined') {
							   const jsonExtendData = JSON.parse(ReadRetPointValue.val);
							   for (const Ex in jsonExtendData) {
                      if (JSON.stringify(jsonExtendData[Ex]['k']) == ExtendToSearch) {
									   RetPointValue = jsonExtendData[Ex]['v'];
									   break;
								   }
                    }
						   }
                }
                if (SPkey == 'S7P1E1'){
                  RetPointValue = ReadRetPointValue.val;
                }
                RetPointValue = parseInt(RetPointValue);
                if ((RetPointValue < 0) && (RetPointValue > -3)) {RetPointValue = 0;} // Fix negative Value

              } catch (error) {
                RetPointValue = parseInt(Object.keys(DreameActionExteParams[SPkey][UserLang])[0]);
                if (LogData) {
						   this.log.warn('Failed to split "' + SPvalue + '" State failed: ' + error);
                }
              }
            }
            if (LogData) {
			   this.log.info('Set and update ' + SPvalue + ' value to: ' + JSON.stringify(RetPointValue));
            }
            await this.setState(path, RetPointValue, true);
          }
        }
      } catch (err) {
        this.log.warn('Setting "' + SPvalue + '" State failed: ' + err);
      }
    }
  }

  async DH_GenerateMap() {
    try {
      // 1. Prepare data
      await this.DH_RequestNewMap();
      // Load robot position history from the object
      const GetAdapterPathObjects = await this.getStatesAsync(`*.vis.PosHistory${DH_CurMap}`);
      const anyKey = Object.keys(GetAdapterPathObjects)[0];
      if (!anyKey) {
        this.log.warn('Adapter path could not be determined');
        return;
      }
      const GetAdapterPath = anyKey.split('.')[1]; // e.g. "0"

      const prefix = `dreamehome.${GetAdapterPath}.${DH_Did}`;

      let posHistory = [];
      try {
        const historyData = await this.getStateAsync(prefix + '.vis.PosHistory' + DH_CurMap);
        if (historyData && historyData.val) {
          const parsedData = JSON.parse(historyData.val);
          posHistory = Object.values(parsedData).map(entry => {
            if (Array.isArray(entry)) {
              return {
                x: entry[0],
                y: entry[1]
              };
            } else if (typeof entry === 'object' && entry.position) {
              return {
                x: entry.position.x,
                y: entry.position.y,
                room: entry.currentRoom,
                id: entry.currentId,
                CleanedArea: entry.CleanedArea,
                CoveragePercent: entry.CoveragePercent,
                TotalArea: entry.TotalArea,
                timestamp: entry.timestamp
              };
            }
            return { x: -1, y: -1 };
          }).filter(pos => pos.x !== -1 && pos.y !== -1);
        }
      } catch (e) {
        this.log.error('Failed to load position history: ' + e.message);
      }

      const posHistoryForScript = posHistory;
      const roomDataMap = {}; // Global map for room data

      if (!DH_Map || !DH_Map[DH_CurMap]) {
        this.log.error('Invalid map data');
        return;
      }

		 // 1. Create MapSize and Rotation objects (if it does not exist)
      const mapSizeObjName = `${DH_Did}.map.MapSize${DH_CurMap}`;
      let canvasSize = 1024; // Default value

      await this.setObjectNotExistsAsync(mapSizeObjName, {
        type: 'state',
        common: {
          name: 'Dreame Map Size for ' + DH_CurMap,
          type: 'number',
          role: 'value',
          write: true,
          read: true,
          def: 1024,
          min: 256,
          max: 2048,
          unit: 'px'
        },
        native: {},
      });

      const rotationStateName = `${DH_Did}.map.Rotation${DH_CurMap}`;
      await this.setObjectNotExistsAsync(rotationStateName, {
        type: 'state',
        common: {
          name: 'Map Rotation Angle',
          type: 'number',
          role: 'level',
          def: 0,
          min: 0,
          max: 360,
          unit: '°',
          read: true,
          write: true,
          states: {
            0: '0',
            90: '90',
            180: '180',
            270: '270',
            360: '360'
          }
        },
        native: {}
      });


      // 2. Read current value and normalize to valid angle
      let rotationAngle = 0;
      const rotationState = await this.getStateAsync(rotationStateName);
      if (rotationState && rotationState.val !== null) {
        const angle = Number(rotationState.val);
        rotationAngle = [0, 90, 180, 270, 360].includes(angle) ? angle : 0;
        await this.setStateAsync(rotationStateName, rotationAngle, true); // Corrects invalid values
      }

      // 3. Get existing value or set default
      const mapSizeState = await this.getStateAsync(mapSizeObjName);
      if (mapSizeState && mapSizeState.val) {
        canvasSize = parseInt(mapSizeState.val);
      } else {
        await this.setStateAsync(mapSizeObjName, canvasSize, true);
      }

      // 4. Reset NewMap flag
      await this.setStateAsync(`${DH_Did}.map.NewMap`, false, true);

      // 5. Rest of the original function with the dynamic canvasSize
      //await this.DH_RequestNewMap();


      const currentMap = DH_Map[DH_CurMap];
      const wallsInfo = currentMap?.walls_info?.storeys?.[0] || {};
      const elements = {
        rooms: Array.isArray(wallsInfo.rooms) ? wallsInfo.rooms : [],
        carpets: typeof currentMap.carpet_info === 'object' ? currentMap.carpet_info : {},
        charger: currentMap.charger || []
      };

      // 6. Precise center point calculation
      function CalculateRoomCenter(WAr) {
        const x0 = WAr.map(m => m.beg_pt_x);
        const x1 = WAr.map(m => m.end_pt_x);
        const x = x0.concat(x1);

        const minx = Math.min(...x);
        const maxx = Math.max(...x);
        const Rx = (minx + maxx) / 2;

        const y0 = WAr.map(m => m.beg_pt_y);
        const y1 = WAr.map(m => m.end_pt_y);
        let y = y0.concat(y1);
        let miny = Math.min(...y);
        let maxy = Math.max(...y);

        if (maxy - miny > 180) {
          y = y.map(val => val < maxy - 180 ? val + 360 : val);
          miny = Math.min(...y);
          maxy = Math.max(...y);
        }

        let Ry = (miny + maxy) / 2;
        if (Ry > 180) Ry -= 360;

        return {
          x: Rx, // * -1, // Inverted for correct display
          y: Ry //* -1
        };
      }

      // 7. Canvas Setup
      // Default value: 1024, will be changed dynamically later

      // 8. Calculate scaling
      // a. Temporary rotation of all points (before scaling calculation)
      const allPoints = [];
      elements.rooms.forEach(room => {
        room.walls?.forEach(wall => {
          allPoints.push({ x: wall.beg_pt_x, y: wall.beg_pt_y });
          allPoints.push({ x: wall.end_pt_x, y: wall.end_pt_y });
        });
      });

      // b. Calculate rotated bounding box
      const angleRad = rotationAngle * Math.PI / 180;
      let rotMinX = Infinity, rotMaxX = -Infinity, rotMinY = Infinity, rotMaxY = -Infinity;

      allPoints.forEach(point => {
        const rotX = point.x * Math.cos(angleRad) - point.y * Math.sin(angleRad);
        const rotY = point.x * Math.sin(angleRad) + point.y * Math.cos(angleRad);

        rotMinX = Math.min(rotMinX, rotX);
        rotMaxX = Math.max(rotMaxX, rotX);
        rotMinY = Math.min(rotMinY, rotY);
        rotMaxY = Math.max(rotMaxY, rotY);
      });

      // c. Scaling based on rotated dimensions
      const scale = Math.min(
        canvasSize / Math.max(rotMaxX - rotMinX, 1),
        canvasSize / Math.max(rotMaxY - rotMinY, 1)
      ) * 0.9;

      // d. Offset for centered display
      const offsetX = (canvasSize - (rotMaxX - rotMinX) * scale) / 2 - rotMinX * scale;
      const offsetY = (canvasSize - (rotMaxY - rotMinY) * scale) / 2 - rotMinY * scale;

      // 9. Transformation function
      function toCanvas(x, y, customAngle = null) {
        const angle = customAngle !== null ? customAngle : rotationAngle;
        const angleRad = angle * Math.PI / 180;

        const rotatedX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
        const rotatedY = x * Math.sin(angleRad) + y * Math.cos(angleRad);
        return [
          Math.round(rotatedX * scale + offsetX),
          Math.round(rotatedY * scale + offsetY)
        ];
      }


      // 10. Prepare color mappings
      const colorMappings = {
        rooms: {},
        carpets: {}
      };

      // 11. Prepare rooms mappings
      function PrepareRoomsMappings(RoomID) {
		    let ExportRoomName = '';
        for (const iCHroomID in CheckArrayRooms) {
          if (CheckArrayRooms[iCHroomID].Id == RoomID) {
            ExportRoomName = CheckArrayRooms[iCHroomID].Name;
            break;
          }
        }
		    return ExportRoomName;
	    }

      // Retrieve polygon shapes for each room
      const roomPolygons = currentMap?.polygons?.rooms || [];

      // 12. HTML with all features
      const html = `<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    touch-action: manipulation;
                }
				:root {
                    --map-background-color: white; /* Default value */
				}
                .map-container {
                    position: relative;
                    width: ${canvasSize}px;
                    height: ${canvasSize}px;
                    background: var(--map-background-color);
                    overflow: hidden;
                    perspective: 1200px;
                    margin: 0 0;
                }
                .map-content {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    transition: transform 0.55s ease;
                    transform-style: preserve-3d;
                }
                .room, .carpet {
                    position: absolute;
                    transition: all 0.3s;
                }
                .room svg {
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                .door line {
                    pointer-events: none;
                    stroke-width: 4px;
                    stroke-dasharray: 5,2;
                }
                .selected {
                    filter: drop-shadow(0 0 12px lime);
                    animation: pulse-selected 1s infinite;
                }
                @keyframes pulse-selected {
                    0% { opacity: 0.8; }
                    50% { opacity: 1; }
                    100% { opacity: 0.8; }
                }
                #color-map {
                    display: none;
                    visibility: hidden;
                    position: absolute;
                    left: -9999px;
                }
                #click-layer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                    z-index: 100;
                }
                .room.selected path {
                    stroke-width: 3px;
                    stroke-dasharray: 5,2;
                }
                .carpet.selected {
                    box-shadow: 0 0 0 3px rgba(0,255,0,0.7);
                }
                #click-layer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                    z-index: 100;
                }
                #robot-position {
                    transition: transform 0.3s ease-out;
                    will-change: transform;
                }

				#robot-path-history {
				position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.3;
                    pointer-events: none;
                    z-index: 101;
                }

                #robot-path-current {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.7;
                    pointer-events: none;
                    z-index: 102;
                }

                #robot-path-current path {
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0% { stroke-width: 3px; }
                    50% { stroke-width: 5px; }
                    100% { stroke-width: 3px; }
                }

                .cleaned-area {
                    opacity: 0.7;
                    transition: all 1s ease;
                }
                .room-label-fixed {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                .labels-hidden .room-label-fixed {
                    transform: scale(1.1); /* !important;*/
                }
				.coverage-info {
				    position: absolute !important;
				    text-align: left;
				    font-size: 14px;
				    font-weight: 500;
				    color: #000000;
				    z-index: 110;
				    left: 15px !important;
				    top: 15px !important;
				    width: fit-content;
				    height: fit-content;
				    background: rgba(255, 255, 255, 0.2);
				    backdrop-filter: blur(5px);
				    padding: 15px;
				    border-radius: 12px;
				    gap: 10px;
				    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
				    border: 1px solid rgba(255,255,255,0.15);
				    max-width: 400px;
				    margin-left: 0 !important; /* Against possible margin overwrites */
				}
                .control-panel {
				    position: absolute;
                    top: 15px;
                    right: 15px;
                    z-index: 120;
                }
				.colorinput-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    color: white;
					min-width: 280px;
					flex-wrap: wrap; /* For very small screens */
                }
                .colorinput-container label {
                    width: 30%;
                    font-size: 14px;
                    font-weight: 600;
                    color: #ffffff;
                }
				.colorinput-container input {
                    width: 60%;
                }
                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    color: white;
					min-width: 280px;
					flex-wrap: wrap; /* For very small screens */
                }
                .slider-container label {
                    width: 25%;
                    font-size: 14px;
                    font-weight: 600;
                    color: #ffffff;
                }
                .slider-container input[type="range"] {
                    width: 50%;
                    flex-grow: 1;
                    height: 6px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 3px;
                    outline: none;
                }
                .slider-container input[type="range"]::-webkit-slider-thumb {
                    width: 20px;
                    height: 18px;
                    background: white;
                    border-radius: 50%;
                    border: 2px solid #3498db;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .slider-value {
                    width: 15%;
                    text-align: center;
                    font-size: 14px;
                    font-weight: 500;
                    background: rgba(255,255,255,0.1);
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: #ffffff;
                }

				/* ==================== */
                /* Main Menu Effects */
                /* ==================== */

                .main-menu-button {
					top: 5px;
                    right: 15px;
                    width: 65px;
                    height: 65px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 65% 35%, #35a3de, #05354f);
                    color: white;
                    border: none;
                    font-size: 26px;
                    cursor: pointer;
					box-shadow: 0 5px 15px rgba(43, 180, 226, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.4s cubic-bezier(0.68, -0.6, 0.32, 1.6);
                    position: relative;
                    overflow: hidden;
                    z-index: 200;
                }

                .main-menu-button::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(circle at center,
                                rgba(255,255,255,0.8) 0%,
                                rgba(255,255,255,0) 70%);
                    opacity: 0;
                    transition: opacity 0.3s;
                }

                .main-menu-button:hover {
                    transform: scale(1.1) rotate(90deg);
                    box-shadow: 0 8px 30px rgba(43, 180, 226, 0.6);
                }

                .main-menu-button:hover::before {
                    opacity: 1;
                }

                .menu-level {
                    position: absolute;
                    right: 85px;
                    top: 0;
                    background: rgba(20, 20, 30, 0.9);
                    backdrop-filter: blur(15px);
                    border-radius: 20px;
                    padding: 20px;
                    box-shadow: 0 10px 35px rgba(0,0,0,0.3);
                    display: none;
                    flex-direction: column;
                    gap: 12px;
                    min-width: 240px;
                    transform-origin: right center;
                    transform: translateX(30px) rotateY(-40deg); /* Stronger initial transformation */
                    opacity: 0;
                    transition:
                        transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                        box-shadow 0.3s ease;
                    border: 1px solid rgba(255,255,255,0.1);
                    z-index: 150;
                    overflow: hidden;
                    perspective: 1000px; /* Important for 3D effect */
                    will-change: transform, opacity; /* GPU optimization */
					/* Scrollability properties */
					max-height: 70vh;
					overflow-y: auto;
					scrollbar-width: thin;
					scrollbar-color: rgba(43, 180, 226, 0.8) transparent;
                }

                .menu-level.active {
                    display: flex;
                    transform: translateX(0) rotateY(0);
                    opacity: 1;
                    animation: menuGlow 5s infinite alternate;
                }

				/* Scrollbar styling for Webkit browsers */
                .menu-level::-webkit-scrollbar {
                    width: 6px;
                }

                .menu-level::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 3px;
                }

                .menu-level::-webkit-scrollbar-thumb {
                    background-color: rgba(43, 180, 226, 0.8);
                    border-radius: 3px;
                }

				@media (max-width: 768px) {
                    .menu-level {
                        right: 75px;
                        min-width: 200px;
                        max-height: 60vh; /* Slightly less height on very small devices */
                    }

                    .slider-container {
                        min-width: 250px !important; /* Ensure sliders remain visible */
                    }
                }

                @keyframes menuGlow {
                    0% { box-shadow: 0 10px 35px rgba(43, 180, 226, 0.5); }
                    50% { box-shadow: 0 15px 45px rgba(47, 214, 247, 0.8); }
                    100% { box-shadow: 0 10px 35px rgba(43, 180, 226, 0.5); }
                }

				.current-selection {
					font-weight: 500;
                    color: #2bb4e2;
                    padding: 8px 12px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    font-size: 0.6em;
				}

                .menu-level::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg,
                                rgba(43, 180, 226, 0.1) 0%,
                                rgba(93, 0, 255, 0.05) 100%);
                    pointer-events: none;
                }

                .menu-item {
                    padding: 12px 18px;
                    border-radius: 12px;
                    background: rgba(255,255,255,0.05);
                    border: none;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 15px;
                    color: #f0f0f0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                    z-index: 150;
					min-width: 240px;
                }

                .menu-item::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg,
                                transparent,
                                rgba(255,255,255,0.1),
                                transparent);
                    transition: all 0.6s;
                }

                .menu-item:hover {
                    background: rgba(43, 180, 226, 0.2);
                    transform: translateX(5px);
                    box-shadow: 0 5px 15px rgba(43, 180, 226, 0.3);
                }

                .menu-item:hover::before {
                    left: 100%;
                }

                .menu-item i {
                    font-size: 18px;
                    min-width: 24px;
                    text-align: center;
                    color: #2bb4e2;
                }

                .menu-title {
                    font-weight: 600;
                    margin-bottom: 10px;
                    color: #2bb4e2;
                    padding: 8px 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    font-size: 0.9em;
                }

                .back-button {
                    color: #2bb4e2;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 13px;
                    text-align: left;
                    padding: 8px 12px;
                    margin-top: 10px;
                    transition: all 0.3s;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .back-button:hover {
                    background: rgba(43, 180, 226, 0.1);
                    transform: translateX(-3px);
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .menu-level {
                        right: 75px;
                        min-width: 200px;
                    }
                }

				/* ==================== */
				/* info: Charger station and current room  */
				/* ==================== */

				.charger-station-mini {
                    width: 40px;
                    height: 40px;
                    transform: scale(1);
                    display: inline-block;
                    position: relative;
                }

                .charger-station-mini .charger-base {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: #4a90e2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 5px rgba(0,0,0,0.2);
                }

                .charger-station-mini .charger-icon {
                    width: 100%;
                    height: 100%;
                    fill: rgba(0,255,255,0.5);
                }

                .charger-mini-container {
                    display: inline-block;
                    text-align: center;
                    margin-right: 15px;
                }

                .mini-status-text {
                    font-size: 14px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 0 1px 1px rgba(0,0,0,0.5);
                    margin-top: 3px;
                    white-space: nowrap;
                    background: rgba(0,0,0,0.3);
                    padding: 2px 5px;
                    border-radius: 3px;
                    display: none;
                }

                .status-text-above {
                    font-size: 15px;
                    font-weight: bold;
                    color: white;
                    height: 15px;
                    margin-bottom: 5px;
                }

                .room-info {
                    position: relative;
                }

				/* ==================== */
                /* Base Status-specific animations for the mini version */
				/* ==================== */

                .charger-station-mini[data-status="charging"] .charger-base {
                    animation: pulse-blue 2s infinite;
                }

                .charger-station-mini[data-status="smart-charging"] .charger-base {
                    animation: pulse-blue 2s infinite;
                }

                .charger-station-mini[data-status="returning"] .charger-base {
                    background: #f39c12;
                    animation: pulse-orange 2s infinite;
                }

				.charger-station-mini[data-status="sweeping"] .charger-base {
                    background: #3498db;
                    animation: pulse-sweeping 1.5s infinite;
                }

                .charger-station-mini[data-status="mopping"] .charger-base {
                    background: #2ecc71;
                    animation: water-drops 2s infinite;
                }

                .charger-station-mini[data-status="error"] .charger-base {
                    background: #e74c3c;
                    animation: error-alert 0.8s infinite, pulse-red 1.5s infinite;
                }

                .charger-station-mini[data-status="returning"] .charger-base {
                    background: #f39c12;
                    animation: radar-sweep 3s linear infinite;
                }

                .charger-station-mini[data-status="emptying"] .charger-base {
                    background: #e67e22;
                    animation: dust-cloud 2s infinite;
                }

                .charger-station-mini[data-status="paused"] .charger-base {
                    background: #95a5a6;
                    animation: blink 1.5s infinite;
                }

				/* ==================== */
				/* Base Status-specific animations*/
				/* ==================== */

                .charger-station {
                    position: absolute;
                    width: 36px; /* 60% of 60px */
                    height: 36px;
                    transform: translate(-50%, -50%) scale(1.2);
                    transform-origin: center center;
                    z-index: 110;
                    pointer-events: none;
                }

                .charger-base {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: #4a90e2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 10px rgba(0,0,0,0.3);
                }

                .charger-icon {
                    width: 80%;
                    height: 80%;
                    fill: rgba(0,255,255,0.5);
                }

				/* Base styles for all statuses */
                .charger-station .status-indicator {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Status-specific animations */
                .charger-station[data-status="charging"] .charger-base {
                    animation: pulse-blue 2s infinite;
                }

                .charger-station[data-status="smart-charging"] .charger-base {
                    animation: pulse-blue 2s infinite;
                }

                .charger-station[data-status="returning"] .charger-base {
                    background: #f39c12;
                    animation: pulse-orange 2s infinite;
                }

				.charger-station[data-status="sweeping"] .charger-base {
                    background: #3498db;
                    animation: pulse-sweeping 1.5s infinite;
                }

                .charger-station[data-status="mopping"] .charger-base {
                    background: #2ecc71;
                    animation: water-drops 2s infinite;
                }

                .charger-station[data-status="error"] .charger-base {
                    background: #e74c3c;
                    animation: error-alert 0.8s infinite, pulse-red 1.5s infinite;
                }

                .charger-station[data-status="returning"] .charger-base {
                    background: #f39c12;
                    animation: radar-sweep 3s linear infinite;
                }

                .charger-station[data-status="emptying"] .charger-base {
                    background: #e67e22;
                    animation: dust-cloud 2s infinite;
                }

                .charger-station[data-status="paused"] .charger-base {
                    background: #95a5a6;
                    animation: blink 1.5s infinite;
                }

				/* Animation Keyframes */
                @keyframes pulse-blue {
                    0% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.7); }
                    70% { box-shadow: 0 0 0 25px rgba(74, 144, 226, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0); }
                }

                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(231, 76, 60, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
                }

                @keyframes pulse-orange {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                @keyframes pulse-sweeping {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }

                @keyframes water-drops {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                @keyframes error-alert {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-5px); }
                    40% { transform: translateX(5px); }
                    60% { transform: translateX(-5px); }
                    80% { transform: translateX(5px); }
                }

                @keyframes radar-sweep {
                    from { background: conic-gradient(transparent 0deg, rgba(255,255,255,0.8) 30deg, transparent 60deg); }
                    to { background: conic-gradient(transparent 360deg, rgba(255,255,255,0.8) 390deg, transparent 420deg); }
                }

                @keyframes dust-cloud {
                    0% { opacity: 0; transform: scale(0.5); }
                    50% { opacity: 0.8; transform: scale(1); }
                    100% { opacity: 0; transform: scale(1.2); }
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

				/* ==================== */
				/* Main menu Buttons - Compact icon buttons next to each other */
				/* ==================== */

				.icon-hide-show-menu {
                    display: flex;
                    gap: 3px;
                    padding: 2px;
                    justify-content: flex-start;
                					scrollbar-width: thin;
                					scrollbar-color: rgba(43, 180, 226, 0.8) transparent;
                					width: 100%;
                                    color: white;
                					flex-wrap: wrap; /* For very small screens */
                }
				.hide-show-option {
                    border: 1px solid rgba(255,255,255,1);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 55px;
                    height: 55px;
                    position: relative;
                	border-radius: 50% !important;
                	background: radial-gradient(circle at center,
                                                rgba(255,255,255,0.8) 0%,
                                                rgba(255,255,255,0) 70%);
                	transition: opacity 0.3s;
                }

				.hide-show-option-svg {
					transition: all 0.4s ease !important;
					fill: rgba(255, 255, 255,1) !important;
                	stroke: rgba(43, 180, 226,0) !important;
                	transition: all 0.4s ease !important;
					filter: drop-shadow(#000000 0.10rem 0 1px) drop-shadow(#000000 0 0.25rem 1px) !important;
                }
                .hide-show-option svg {
                    width: 85%;
                    height: 85%;
                }

                .hide-show-option:hover .hide-show-option-svg {
                  fill: rgba(43, 180, 226,1);
                  stroke: rgba(43, 180, 226,0.5);
                }

                .hide-show-option:hover {
                box-shadow: 0 0 20px rgba(255, 255, 255, 1);
                }

                .hide-show-option.active .path1 {
                  fill: rgba(43, 180, 226, 0.5) !important;
                  stroke: rgba(43, 180, 226, 1) !important;
                  transform: scale(1.05) !important;
                }

                .hide-show-option.active {
                	background: radial-gradient(circle at center,
                                                rgba(43, 180, 226,0) 0%,
                                                rgba(43, 180, 226,1) 100%);
                	transition: all 0.6s;
                	box-shadow: 0 0 15px rgba(43, 180, 226, 0.9);
                }

				/* ==================== */
                /* Cleaning menu - Compact icon buttons next to each other */
				/* ==================== */

                .icon-clean-menu {
                    display: flex;
                    gap: 3px;
                    padding: 2px;
                    justify-content: flex-start;
                					scrollbar-width: thin;
                					scrollbar-color: rgba(43, 180, 226, 0.8) transparent;
                					width: 100%;
                                    color: white;
                					min-width: 300px;
                					flex-wrap: wrap; /* For very small screens */
                }

                .mode-option {
                    border: 1px solid rgba(255,255,255,1);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 55px;
                    height: 55px;
                    position: relative;
                	border-radius: 50%;
                	background: radial-gradient(circle at center,
                                                rgba(255,255,255,0.8) 0%,
                                                rgba(255,255,255,0) 70%);
                	transition: opacity 0.3s;
                }

                .mode-option i {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 45px;
                    height: 45px;
                	cursor: pointer;
                }

                .mode-option-svg {
					transition: all 0.4s ease !important;
					fill: rgba(255, 255, 255,1) !important;
                	stroke: rgba(43, 180, 226,0) !important;
                	transition: all 0.4s ease !important;
					filter: drop-shadow(#000000 0.10rem 0 1px) drop-shadow(#000000 0 0.25rem 1px) !important;
                }
                .mode-option svg {
                    width: 90%;
                    height: 90%;
                }

                .mode-option:hover .mode-option-svg {
                  fill: rgba(43, 180, 226,1);
                  stroke: rgba(43, 180, 226,0.5);
                }

                .mode-option:hover {
                box-shadow: 0 0 20px rgba(255, 255, 255, 1);
                }

                .mode-option.active .mode-option-svg path {
                  fill: rgba(43, 180, 226, 0.5) !important;
                  stroke: rgba(43, 180, 226, 1) !important;
                  transform: scale(1.05) !important;
                }

                .mode-option.active {
                	background: radial-gradient(circle at center,
                                                rgba(43, 180, 226,0) 0%,
                                                rgba(43, 180, 226,1) 100%);
                	transition: all 0.6s;
                	box-shadow: 0 0 15px rgba(43, 180, 226, 0.9);
                }

				/* ==================== */
                /* Cleaning menu extensions - Styling for the options */
				/* ==================== */

                .option-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    margin-bottom: 15px;
                }

                .option-title {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    font-weight: 600;
                    color: #2bb4e2;
                    font-size: 10px;
                    text-transform: uppercase;
                }

                .option-buttons-container {
                    display: flex;
                    gap: 3px;
                    flex-wrap: wrap;
                }

                .option-group.visible {
                    display: flex;
                	flex-direction: column;
                    gap: 8px;
                }


                .mode-option-buttons {
                    border: 1px solid rgba(255,255,255,1);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 55px;
                    height: 55px;
                    position: relative;
                	border-radius: 50%;
                	background: radial-gradient(circle at center,
                                                rgba(255,255,255,0.8) 0%,
                                                rgba(255,255,255,0) 70%);
                	transition: opacity 0.3s;
                }

                .mode-option-buttons i {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 45px;
                    height: 45px;
                	cursor: pointer;
                }

                .mode-option-buttons-svg {
                	fill: rgba(255, 255, 255,1) !important;
                	stroke: rgba(0, 0, 0,0.5) !important;
                	transition: all 0.4s ease !important;
					filter: drop-shadow(#000000 0.05rem 0 1px) drop-shadow(#000000 0 0.25rem 1px) !important;
                }
                .mode-option-buttons svg {
                    width: 75%;
                    height: 75%;
                }

                .mode-option-buttons:hover .mode-option-buttons-svg {
                  fill: rgba(43, 180, 226,1);
                  stroke: rgba(43, 180, 226,0.5);
                }

                .mode-option-buttons:hover {
                box-shadow: 0 0 20px rgba(255, 255, 255, 1);
                }

                .mode-option-buttons.active .mode-option-buttons-svg path {
                  fill: rgba(43, 180, 226, 0.5) !important;
                  stroke: rgba(43, 180, 226, 1) !important;
                  transform: scale(1.05) !important;
                }

                .mode-option-buttons.active {
                	background: radial-gradient(circle at center,
                                                rgba(43, 180, 226,0) 0%,
                                                rgba(43, 180, 226,1) 100%);
                	transition: all 0.6s;
                	box-shadow: 0 0 15px rgba(43, 180, 226, 0.9);
                }

                .option-label {
                    font-size: 12px;
                    text-align: center;
                    color: white;
                }

				/* ==================== */
                /* Summary tooltip */
				/* ==================== */

                .summary-tooltip {
                	transition: opacity 0.3s ease, transform 0.3s ease;
                    position: absolute;
                    top: 80px;  /* Below the status display */
                    left: 20px;
                    z-index: 130;
                    background: rgba(43, 180, 226, 0.15);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    border: 1px solid rgba(43, 180, 226, 0.3);
                    max-width: 300px;
                    transform: translateY(-10px);
                    opacity: 0;
                    transition: all 0.3s ease;
                    pointer-events: none;
                    display: none;
                }

                .summary-tooltip.active {
                    display: block;
                    transform: translateY(0);
                    opacity: 1;
                }

                .selection-summary {
                	background: rgba(43, 180, 226, 0.1);
                    border-radius: 12px;
                    padding: 8px;
                    margin: 0 0 10px 0;
                    border: 1px solid rgba(43, 180, 226, 0.3);
                    font-size: 13px;
                    line-height: 1.4;
                	color: #000000;
                }

                .selection-summary div {
                    margin: 3px 0;
                    display: flex;
                    justify-content: space-between;
                }

                .selection-summary strong {
                    color: #2bb4e2;
                    margin-bottom: 5px;
                    display: block;
                    text-align: center;
                }

				/* ==================== */
                /* Clean Command menu */
				/* ==================== */

				/* === Command Clean Interface Menu === */
				.command-interface {
				  position: absolute;
				  top: 90px;
				  right: 15px;
				  z-index: 200;
				  display: flex;
				  justify-content: center;
				}

				.command-main-btn {
				  position: relative;
				  width: 65px;
				  height: 65px;
				  border-radius: 50%;
				  background: radial-gradient(circle at 65% 35%, #35a3de, #05354f);
				  box-shadow: 0 5px 15px rgba(43, 180, 226, 0.6);
				  transition: all 0.4s cubic-bezier(0.68, -0.6, 0.32, 1.6);
				  display: flex;
				  align-items: center;
				  justify-content: center;
				  cursor: pointer;
				  border: none;
				  color: white;
				  font-size: 22px;
				  z-index: 200;
				}

				.command-options {
				  position: absolute;
				  display: none;
				  gap: 15px;
				  top: 0;
				  right: 70px;
				  opacity: 0;
				  flex-direction: row-reverse;
				  transform-origin: right center;
				  transform: translateX(30px) rotateY(-40deg);
				  transition:
				    transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275),
				    opacity 0.3s ease;
				}

				.command-interface:hover .command-options {
				  display: flex;
				  opacity: 1;
				  transform: translateX(0) rotateY(0);
				}

				.cmd-btn {
				  width: 50px;
				  height: 50px;
				  border-radius: 50%;
				  background: radial-gradient(circle at 65% 35%, #35a3de, #05354f);
				  box-shadow: 0 5px 15px rgba(43, 180, 226, 0.6);
				  transition: all 0.4s cubic-bezier(0.68, -0.6, 0.32, 1.6);
				  color: white;
				  font-size: 18px;
				  cursor: pointer;
				  transition: all 0.3s ease;
				  display: flex;
				  flex-direction: column;
				  align-items: center;
				  justify-content: center;
				  gap: 5px;
				  border: none;
				}

				.cmd-btn span {
				  font-size: 10px;
				}

				.cmd-btn:hover {
				  background: rgba(0, 150, 255, 0.5);
				  transform: translateY(-5px);
				  box-shadow: 0 5px 15px rgba(0, 200, 255, 0.3);
				}

				/* === Command Base Interface Menu === */
				.command-Base-interface {
				  position: absolute;
				  top: 180px;
				  right: 15px;
				  z-index: 200;
				  display: flex;
				  justify-content: center;
				}

				.command-Base-interface:hover .command-Base-options {
				  display: flex;
				  opacity: 1;
				  transform: translateX(0) rotateY(0);
				}

				.command-Base-options {
				  position: absolute;
				  display: none;
				  gap: 15px;
				  top: 0;
				  right: 70px;
				  opacity: 0;
				  flex-direction: row-reverse;
				  transform-origin: right center;
				  transform: translateX(30px) rotateY(-40deg);
				  transition:
				    transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275),
				    opacity 0.3s ease;
				}

				.command-Base-main-btn {
				  position: relative;
				  width: 65px;
				  height: 65px;
				  border-radius: 50%;
				  background: radial-gradient(circle at 65% 35%, #35a3de, #05354f);
				  box-shadow: 0 5px 15px rgba(43, 180, 226, 0.6);
				  transition: all 0.4s cubic-bezier(0.68, -0.6, 0.32, 1.6);
				  display: flex;
				  align-items: center;
				  justify-content: center;
				  cursor: pointer;
				  border: none;
				  color: white;
				  font-size: 22px;
				  z-index: 200;
				}

				.cmd-Base-btn {
				  width: 50px;
				  height: 50px;
				  border-radius: 50%;
				  background: radial-gradient(circle at 65% 35%, #35a3de, #05354f);
				  box-shadow: 0 5px 15px rgba(43, 180, 226, 0.6);
				  transition: all 0.4s cubic-bezier(0.68, -0.6, 0.32, 1.6);
				  color: white;
				  font-size: 18px;
				  cursor: pointer;
				  transition: all 0.3s ease;
				  display: flex;
				  flex-direction: column;
				  align-items: center;
				  justify-content: center;
				  gap: 5px;
				  border: none;
				}

				.cmd-Base-btn.active {
				  background: radial-gradient(circle at 65% 35%, #ff6b6b, #8b0000);
				  box-shadow: 0 5px 15px rgba(255, 0, 0, 0.3);
				}

				.cmd-Base-btn span {
				  font-size: 10px;
				}

				.cmd-Base-btn:hover {
				  background: rgba(0, 150, 255, 0.5);
				  transform: translateY(-5px);
				  box-shadow: 0 5px 15px rgba(0, 200, 255, 0.3);
				}

				/* === SVG Icons === */
				.base-main-icon {
				  width: 36px;
				  height: 36px;
				  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
				}
				.base-icon {
				  width: 24px;
				  height: 24px;
				  transition: all 0.3s ease;
				}

				.base-wash-icon {
				  width: 36px !important;
				  height: 36px !important;
				}

				.base-all-icon {
				  width: 24px;
				  height: 24px;
				  transition: all 0.3s ease;
				}


				.lock-icon {
				  width: 24px;
				  height: 24px;
				  transition: all 0.3s ease;
				}

				/* Update existing CSS for SVG support */
				.cmd-Base-btn {
				  /* existing styles... */
				  padding: 8px; /* Add padding for better touch area */
				}

				.cmd-Base-btn.active .lock-icon {
				  color: #ff6b6b; /* Red color for active state */
				}

				/* Add animation for lock/unlock transition */
				@keyframes lockAnimation {
				  0% { transform: scale(1); }
				  50% { transform: scale(1.2); }
				  100% { transform: scale(1); }
				}

				.lock-animate {
				  animation: lockAnimation 0.3s ease;
				}

				/* === Keyframe animations === */
				@keyframes commandPulse {
				  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
				  70% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
				  100% { opacity: 0; }
				}

				/* ==================== */
                /* Batterry indicator */
				/* ==================== */
				/* Battery indicator (charging bar with animation) */
				.battery-indicator {
				  margin-top: 15px;
				  display: flex;
				  align-items: center;
				}

				.battery-level {
				  height: 10px;
				  background: linear-gradient(90deg, #00ffaa, #00ddff);
				  border-radius: 5px;
				  width: 70%;
				  animation: battery-pulse 2s infinite;
				}

				.low-battery {
				  background: linear-gradient(90deg, #ff3300, #ff9900) !important;
				  animation: battery-pulse 1s infinite !important;
				}

				#battery-percent {
				  margin-left: 10px;
				  color: #00ffaa;
				  font-weight: bold;
				}
				@keyframes battery-pulse {
				  0%, 100% { opacity: 1; }
				  50% { opacity: 0.7; }
				}

				/* ==================== */
                /* Component status */
				/* ==================== */
				.compact-component {
				    transition: all 0.2s ease;
				}
				.compact-component:hover {
				    background: rgba(0, 255, 170, 0.1) !important;
				    transform: scale(1.05);
				}

				.critical-level {
				    filter: drop-shadow(0 0 2px red);
				    opacity: 0.9;
				}

			    .component-detail-overlay {
			        position: fixed;
			        top: 0;
			        left: 0;
			        right: 0;
			        bottom: 0;
			        background: rgba(0,0,0,0.3);
			        display: flex;
			        justify-content: center;
			        align-items: center;
			        z-index: 1000;
			        opacity: 0;
			        pointer-events: none;
			        transition: opacity 0.4s ease;
			        backdrop-filter: blur(8px);
			    }

			    .component-detail-overlay.active {
			        opacity: 1;
			        pointer-events: all;
			    }

			    .component-detail-container {
			        background: rgba(255, 255, 255, 1);
			        backdrop-filter: blur(12px);
			        border-radius: 20px;
			        padding: 25px;
			        max-width: 450px;
			        width: 90%;
			        border: 1px solid rgba(0, 0, 0, 0.2);
			        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
			        text-align: center;
			        position: absolute;
			        top: 2%;
			        left: 20%;
			        transform: translateX(-50%);
			    }

			    .component-detail-svg-container {
			        margin: 0 auto 20px;
			        width: 160px;  /* 4x size of the original SVGs (original ~40px) */
			        height: 160px;
			        display: flex;
			        justify-content: center;
			        align-items: center;
			        background: rgba(43, 180, 226,0.1);
			        border-radius: 12px;
			        padding: 15px;
			        box-sizing: border-box;
			    }

			    .component-detail-svg {
			        width: 100%;
			        height: 100%;
			        transform: scale(1.5); /* Additional scaling for better details */
			    }

			    .component-detail-name {
			        font-size: 22px;
			        font-weight: bold;
			        margin-bottom: 15px;
			        color: #000;
			    }

			    .component-detail-info {
			        margin-bottom: 12px;
			        font-size: 16px;
			        color: rgba(0,0,0,0.9);
			        display: flex;
			        justify-content: space-between;
			        max-width: 300px;
			        margin-left: auto;
			        margin-right: auto;
			    }

			    .component-detail-info span {
			        font-weight: 500;
			        color: #000;
			    }

			    .component-detail-reset {
			        background: linear-gradient(135deg, rgba(0,150,255,0.6) 0%, rgba(0,100,200,0.8) 100%);
			        border: none;
			        color: white;
			        padding: 10px 20px;
			        border-radius: 10px;
			        cursor: pointer;
			        font-size: 15px;
			        transition: all 0.3s ease;
			        margin-top: 20px;
			        font-weight: 500;
			        box-shadow: 0 4px 15px rgba(0,100,200,0.3);
			    }

			    .component-detail-reset:hover {
			        background: linear-gradient(135deg, rgba(0,170,255,0.7) 0%, rgba(0,120,220,0.9) 100%);
			        transform: translateY(-2px);
			        box-shadow: 0 6px 20px rgba(0,120,220,0.4);
			    }

			    .component-detail-reset:active {
			        transform: translateY(1px);
			    }

			    .component-detail-close {
			        position: absolute;
			        top: 15px;
			        right: 15px;
			        background: rgba(0,0,0,0.15);
			        border: none;
			        color: #000;
			        width: 32px;
			        height: 32px;
			        border-radius: 50%;
			        cursor: pointer;
			        font-size: 18px;
			        display: flex;
			        align-items: center;
			        justify-content: center;
			        transition: all 0.4s ease;
			    }

			    .component-detail-close:hover {
			        background: rgba(0,0,0,0.25);
			        transform: rotate(90deg);
			    }

			    /* Animation for the opening of the detail view */
			    @keyframes componentDetailFadeIn {
			        from { opacity: 0; transform: scale(0.95); }
			        to { opacity: 1; transform: scale(1); }
			    }

			    .component-detail-overlay.active .component-detail-container {
			        animation: componentDetailFadeIn 0.4s ease-out forwards;
			    }

				#pureWaterTankFill {
			        visibility: visible !important;
			        display: block !important;
			    }

				.Component-with-outline {
					text-shadow: 1px 1px 2px black;
				}

				/* ==================== */
                /* customeClean Room setting menu */
				/* ==================== */
				.settings-button {
				    position: absolute;
				    top: 0;
				    right: 0;
				    width: 20px;
				    height: 20px;
				    cursor: pointer;
				    opacity: 0.7;
				    transition: all 0.2s;
				    z-index: 145;
				    pointer-events: all;
				    display: flex;
				    align-items: center;
				    justify-content: center;
				    background: rgba(0,0,0,0.05);
				    border-radius: 50%;
				}

				.settings-button:hover {
				    opacity: 1;
				    background: rgba(43, 180, 226, 0.2);
				    transform: scale(1.1);
				}

				.room-label-fixed.active-menu .settings-button {
				    opacity: 1;
				    background: rgba(43, 180, 226, 0.3);
				}

				.settings-icon {
				    pointer-events: none;
				    width: 16px;
				    height: 16px;
				}

				.radial-menu {
				  position: fixed;
				  z-index: 140;
				  display: none;
				  pointer-events: none;
				  width: 140px;
				  height: 140px;
				  transform: translate(-50%, -50%);
				  left: 0;
				  top: 0;
				  transform-origin: center;
				  will-change: transform;
				}

				.radial-menu.active {
				  display: block;
				  animation: radialMenuFadeIn 0.3s ease-out forwards;
				}

				@keyframes radialMenuFadeIn {
				  0% {
				    opacity: 0;
				    transform: translate(-50%, -50%) scale(0.5);
				  }
				  100% {
				    opacity: 1;
				    transform: translate(-50%, -50%) scale(1);
				  }
				}

				.main-option {
				  position: absolute;
				  width: 50px;
				  height: 50px;
				  border-radius: 50%;
				  background: rgba(43, 180, 226, 0.9);
				  display: flex !important;
				  align-items: center !important;
				  justify-content: center !important;
				  color: white;
				  font-size: 20px;
				  cursor: pointer;
				  pointer-events: all;
				  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
				  transition: all 0.3s ease;
				  border: 2px solid white;
				  opacity: 0;
				  transform: translate(-50%, -50%) scale(0.5);
				  margin-left: -25px;
				  margin-top: -25px;
				  transform-origin: center !important;
				  will-change: transform;
				}

				.main-option > svg {
				    width: 32px;
				    height: 32px;
				    display: block;
				    margin: 0;
				    padding: 0;
				    transform: translate(0, 0);
				}

				.main-option:hover > svg {
				    transform: scale(1.15);
				}

				.main-option.active > svg {
				    transform: scale(1.3);
				}

				.radial-menu.active .main-option {
				  display: block;
				  animation: radialMenuAppear 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
				}

				@keyframes radialMenuAppear {
				  0% {
				    opacity: 0;
				    transform: translate(-50%, -50%) scale(0.5);
				  }
				  100% {
				    opacity: 1;
				    transform: translate(var(--tx), var(--ty)) scale(1);
				  }
				}

				.radial-menu.closing {
				  animation: radialMenuDisappear 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
				  pointer-events: none;
				}

				@keyframes radialMenuDisappear {
				  0% {
				    opacity: 1;
				    transform: translate(var(--tx), var(--ty)) scale(1);
				  }
				  100% {
				    opacity: 0;
				    transform: translate(-50%, -50%) scale(0.5);
				  }
				}

				.main-option:hover {
				  transform: translate(var(--tx), var(--ty)) scale(1.1);
				  background: rgba(43, 180, 226, 1);
				}

				.main-option.active {
				  transform: translate(-50%, -50%) scale(1.2) !important;
				  z-index: 140;
				    animation: optionCenter 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
				  box-shadow: 0 0 0 4px rgba(255,255,255,0.8),
				              0 8px 25px rgba(43, 180, 226, 0.5);
				}

				@keyframes optionCenter {
				  0% {
				    transform: translate(var(--tx), var(--ty)) scale(1);
				  }
				  60% {
				    transform: translate(-50%, -50%) scale(1.3);
				  }
				  100% {
				    transform: translate(-50%, -50%) scale(1.25);
				  }
				}

				.main-option.hidden {
				  pointer-events: none;

				  animation: optionHide 0.35s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards !important;

				  opacity: 0 !important;
				}

				@keyframes optionHide {
				  0% {
				    transform: translate(var(--tx), var(--ty)) scale(1) rotate(0deg);
				    opacity: 1;
				    filter: blur(0);
				    box-shadow: 0 4px 15px rgba(0,0,0,0.25);
				  }
				  50% {
				    transform: translate(
				      calc(-50% + (var(--tx) + 50%) * 0.5),
				      calc(-50% + (var(--ty) + 50%) * 0.5)
				    ) scale(0.7) rotate(-15deg);
				    opacity: 0.5;
				  }
				  100% {
				    transform: translate(-50%, -50%) scale(0.4) rotate(30deg);
				    opacity: 0;
				    filter: blur(2px);
				    box-shadow: 0 0 0 rgba(0,0,0,0);
				  }
				}

				.sub-options {
				  position: absolute;
				  display: none;
				  pointer-events: none;
				  width: 100%;
				  height: 100%;
				  top: 0;
				  left: 0;
				  will-change: transform;
				}

				.sub-options.active {
				  display: block;
				  pointer-events: all;
				}

				.sub-option {
				  position: absolute;
				  width: 40px;
				  height: 40px;
				  border-radius: 50%;
				  background: rgba(255, 255, 255, 0.9);
				  display: flex;
				  align-items: center;
				  justify-content: center;
				  color: #2bb4e2;
				  font-size: 16px;
				  cursor: pointer;
				  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
				  transition: all 0.3s ease;
				  border: 2px solid #2bb4e2;
				  opacity: 0;
				  transform: translate(-50%, -50%) scale(0.5);
				  margin-left: -20px;
				  margin-top: -20px;
				}

				.sub-options.active .sub-option {
				   animation: subOptionEnter 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.4) forwards;
				  animation-delay: calc(var(--index) * 0.08s + 0.15s);
				}

				@keyframes subOptionEnter {
				  0% {
				    opacity: 0;
				    transform: translate(-50%, -50%) scale(0) rotate(15deg);
				  }
				  80% {
				    opacity: 0.9;
				    transform: translate(var(--tx), var(--ty)) scale(1.08);
				  }
				  100% {
				    opacity: 1;
				    transform: translate(var(--tx), var(--ty)) scale(1);
				  }
				}

				.sub-option:hover {
				  transform: translate(var(--tx), var(--ty)) scale(1.1);
				  background: white;
				}

				.room-polygon {
				  pointer-events: bounding-box;
				  transition: fill-opacity 0.5s !important;
				}

				.room-polygon path {
				  fill-opacity: 0.7 !important;
				  stroke-width: 1.5 !important;
				}

            </style>
        </head>
        <body>
            <div class="map-container">
                <div class="map-content">
                    <div style="position:absolute;width:100%;height:100%;background:var(--map-background-color)"></div>
                    <canvas id="color-map" width="${canvasSize}" height="${canvasSize}"></canvas>

                    ${elements.rooms.map(room => {
    const color = ColorsItems[room.room_id % ColorsItems.length];
    colorMappings.rooms[color] = room.room_id;
    const walls = room.walls.map(w => toCanvas(w.beg_pt_x, w.beg_pt_y));
    const pathData = walls.map(([x,y], i) => (i === 0 ? 'M' : 'L') + x + ' ' + y).join(' ') + ' Z';

    // Precise center point calculation
    const center = CalculateRoomCenter(room.walls);
    const [canvasX, canvasY] = toCanvas(center.x, center.y);

    // Store room data in the map
    const getroomname = PrepareRoomsMappings(room.room_id);
    roomDataMap[room.room_id] = {
      name: getroomname || 'Room ' + room.room_id,
      center: center,
      color: color,
      pathData: pathData
    };

    return `
                        <div class="room" id="room-${room.room_id}" style="width:100%;height:100%">
                            <svg>
                                <path d="${pathData}" fill="${color}33" stroke="${color}" stroke-width="4"/>
                            </svg>
                            <div class="room-label" id="room-label-${room.room_id}" style="position:absolute;left:${canvasX}px;top:${canvasY}px;transform:translate(-50%,-50%);color:black;font-weight:bold">
                                ${room.room_id}
                            </div>
                        </div>`;
  }).join('')}


                    ${roomPolygons.map(room => {
    const color = ColorsItems[room.id % ColorsItems.length];

    // Convert the main polygon to canvas coordinates using toCanvas
    const mainPath = room.polygon.map(p => {
      const [x, y] = toCanvas(p.x, p.y);
      return `${x},${y}`;
    }).join(' ');

    // Apply transformation to holes
    const holes = room.holes.map(hole =>
      `M ${hole.map(p => {
        const [x, y] = toCanvas(p.x, p.y);
        return `${x},${y}`;
      }).join(' L')} Z`
    ).join(' ');

    return `
                      <svg class="room-polygon" id="polygon-${room.room_id}" style="position:absolute;top:0;left:0;width:100%;height:100%">
                        <path d="M ${mainPath} Z ${holes}"
                              fill="${color}33"
                              stroke="${color}"
                              stroke-width="1.5"
                              fill-rule="evenodd"/>
                      </svg>`;
  }).join('')}


                    ${Object.entries(elements.carpets).map(([id, rect]) => {
    const color = ColorsCarpet[id % ColorsCarpet.length];
    colorMappings.carpets[color] = id;
    const [x1, y1, x2, y2] = rect;

    // Transform all 4 corner points
    const [tx1, ty1] = toCanvas(x1, y1);
    const [tx2, ty2] = toCanvas(x2, y1);
    const [tx3, ty3] = toCanvas(x2, y2);
    const [tx4, ty4] = toCanvas(x1, y2);

    // Calculate the bounding box of the transformed points
    const left = Math.min(tx1, tx2, tx3, tx4);
    const top = Math.min(ty1, ty2, ty3, ty4);
    const width = Math.max(tx1, tx2, tx3, tx4) - left;
    const height = Math.max(ty1, ty2, ty3, ty4) - top;

    return `
                            <div class="carpet" id="carpet-${id}"
                                style="left:${left}px;top:${top}px;width:${width}px;height:${height}px; background:${color}33;border:2px solid ${color}">
                            </div>`;
  }).join('')}

                    ${wallsInfo.doors.map(door => {
    const [x1, y1] = toCanvas(door.beg_pt_x, door.beg_pt_y);
    const [x2, y2] = toCanvas(door.end_pt_x, door.end_pt_y);
    return `
                        <svg class="door" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none">
                            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                                  stroke="#ffffff" stroke-width="6" stroke-dasharray="8,4"/>
                        </svg>`;
  }).join('')}

					${elements.charger && elements.charger.length === 2 ? `
                        <div class="charger-station"
                             style="left:${toCanvas(elements.charger[0], elements.charger[1])[0]}px;
                                    top:${toCanvas(elements.charger[0], elements.charger[1])[1]}px;"
                             data-status="idle">
                            <div class="charger-base">
                                <div class="status-indicator">
                                    <svg class="charger-icon" viewBox="0 0 24 24">
                                        <path d="M12 2L1 21h22L12 2zm0 3.5L18.5 19h-13L12 5.5z"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ` : ''}

					<svg id="robot-path-history">
						<path d="M" stroke="rgba(0,150,255,0.5)" stroke-width="2" fill="none" />
					</svg>

					<svg id="robot-path-current">
						<path d="M" stroke="rgba(255,50,50,0.8)" stroke-width="3" fill="none" />
					</svg>

                    <!-- CURRENT ROBOT POSITION (as red dot) -->
                    <svg id="robot-position"
                          style="position:absolute;width:64px;height:64px;transform:translate(-32px,-32px);z-index:110;display:none;"
                          viewBox="0 0 200 200" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <!--Robot body-->
                          <circle cx="100" cy="100" r="80" fill="#f8f8f8" stroke="#333" stroke-width="4" opacity="0.5">
                            <animate attributeName="cy" values="100;98;100;102;100" dur="2s" repeatCount="indefinite"/>
                          </circle>
                        <!--Radar scanner-->
                          <g transform="translate(100,60)">
                        <!--Static radar background-->
                            <circle r="15" fill="none" stroke="#aaa" stroke-width="3" opacity="1"/>
                        <!--Pulsating radar rings-->
                            <circle r="3" fill="none" stroke="#ff0000" stroke-width="3.5" opacity="0">
                              <animate attributeName="r" values="3;35" dur="3.5s" begin="0s" repeatCount="indefinite"/>
                              <animate attributeName="opacity" values="1;0.5" dur="3.5s" begin="0s" repeatCount="indefinite"/>
                            </circle>
                        <!--Radar center-->
                            <circle r="12" fill="#000000" opacity="0.5"/>
                          </g>
                        <!--Wheels-->
                          <rect x="12" y="85" width="12" height="30" rx="6" fill="#444" opacity="0.9">
                            <animate attributeName="y" values="85;82;85;88;85" dur="2.4s" repeatCount="indefinite"/>
                          </rect>
                          <rect x="176" y="85" width="12" height="30" rx="6" fill="#444" opacity="0.9">
                            <animate attributeName="y" values="85;88;85;82;85" dur="2.4s" repeatCount="indefinite"/>
                          </rect>
                        <!--Brush animation-->
                          <g transform="translate(145,39)">
                            <circle r="8" fill="#777" opacity="1"/>
                            <g transform="rotate(0,0,0)">
                              <line x1="-8" y1="0" x2="-23" y2="0" stroke="#000" stroke-width="2"/>
                              <line x1="0" y1="-8" x2="0" y2="-23" stroke="#000" stroke-width="2"/>
                              <line x1="8" y1="0" x2="23" y2="0" stroke="#000" stroke-width="2"/>
                              <line x1="0" y1="8" x2="0" y2="23" stroke="#000" stroke-width="2"/>
                              <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="5s" repeatCount="indefinite"/>
                            </g>
                          </g>
					</svg>

				</div>

				<!-- Cascading Menu System -->
                <div class="control-panel">
                    <button class="main-menu-button" id="main-menu-btn">=</button>

                    <!-- Main Menu Level 1 -->
                    <div class="menu-level" id="main-menu">
                        <div class="menu-title">Main Menu</div>
                        <button class="menu-item" data-next="view-menu">
                            <i>
							    <svg width="24" height="24" style="fill-rule:evenodd" viewBox="0 0 24 24">
								<path style="opacity:.6" fill="#fff" d="M8.46.18a.3.3 0 0 1 .24.06q2.095 2.804 5.28 1.32.78-.54 1.32-1.32 1.266.302 2.46.9-.247 5.123 4.86 4.68.417 1.195.84 2.4l-.06.24q-.832.443-1.38 1.2-2.162-3.032-5.4-4.86Q8.983 1.782 3.48 7.86q-.666.974-1.5 1.8-.518-.728-1.32-1.14a.6.6 0 0 1-.12-.3 16 16 0 0 1 .9-2.28q5.04.24 4.8-4.8A58 58 0 0 0 8.46.18"/>
								<path style="opacity:.964" fill="#fff" d="M10.74 4.98q7.629-.191 10.86 6.72.117.557-.12 1.08-4.157 7.674-12.66 5.82-4.667-1.727-6.66-6.3-.105-.496.12-.96 2.702-5.261 8.46-6.36m.24 3.24q4.159-.282 4.8 3.84-.608 4.06-4.68 3.78-3.31-1.128-2.94-4.62.649-2.239 2.82-3"/>
								<path style="opacity:.6" fill="#fff" d="M11.58 9.78q.614-.045 1.2.12l.12.18q-.764.843.12 1.56.603.07 1.2-.06.008 2.902-2.88 2.58-1.805-.76-1.5-2.7.382-1.373 1.74-1.68"/>
								<path style="opacity:.6" fill="#fff" d="M1.86 14.34q.212-.04.36.12 5.065 7.573 13.8 4.98 3.673-1.732 5.94-5.1a12 12 0 0 0 1.5 1.38 22 22 0 0 1-.96 2.4q-5.08-.41-4.8 4.74-1.203.631-2.52.78-1.473-2.172-4.08-1.68-1.493.357-2.28 1.68-1.317-.149-2.52-.78.188-2.117-1.08-3.78-1.696-1.262-3.78-1.02a41 41 0 0 1-.9-2.34 22 22 0 0 0 1.32-1.38"/>
								</svg>
							</i> View settings
                        </button>

						<button class="menu-item" data-next="clean-menu">
							Cleaning Mode
							<span class="current-selection" id="current-mode-display">Not selected</span>
						</button>
                        <div class="icon-hide-show-menu">
							<button class="hide-show-option" id="toggle-robot-path">
    					        <i>
    					    		<svg class="hide-show-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
    								<path class="path1" style="opacity:.929" d="M25.3 5.3a4.3 4.3 0 0 1 1.8.3 1373 1373 0 0 0 12.4 4.5l.2.6a1426 1426 0 0 0-1.5 11.8 360 360 0 0 1-.5 16.2A708 708 0 0 0 26.3 36a49.4 49.4 0 0 0-7.4-.2 39 39 0 0 1-5.3 1.3A453 453 0 0 1 .5 34.7a219 219 0 0 1 1.6-13.5A322 322 0 0 1 .3 6.9a531 531 0 0 0 10.6-.8 555 555 0 0 0 9.2 1.6 23 23 0 0 0 5.2-2.4m6.2 5q-3.633.614-2.2 4.1-.372 1.144-1.2 2a17 17 0 0 1-4 1q-2.019.766-2 2.9a12.6 12.6 0 0 0 .4 2.4 2.1 2.1 0 0 1-.3.8q-3.328 1.377-5.3 4.4a13 13 0 0 0-2.6-2.1q-2.439-.619-4.8.3-1.454-2.412-4-1.3-2.113 2.332.4 4.2 1.92.619 3.2-1a15.5 15.5 0 0 1 4.4-.4 9 9 0 0 1 1.7 1.5q-.149 4.254 3.9 3.1 1.984-2.038 0-4.1 1.028-1.429 2.6-2.2 1.151 1.964 3.4 1.3 2.11-1.432.9-3.7-.659-.729-1.6-1-.722-1.507-.1-3a2.5 2.5 0 0 1 .8-.5q4.499.356 6-3.8 3.318-.485 2.3-3.7a4 4 0 0 1-.7-.8 37 37 0 0 1 3.6 1.1.8.8 0 0 1 .2.4 254 254 0 0 0-1.4 12.2 103 103 0 0 1 .1 10.7q-7.753-2.11-15.8-2.2a427 427 0 0 0-5.7 1 187 187 0 0 0-10.2-1.4 232 232 0 0 1 1.6-11.9 486 486 0 0 0-2-10.5 99 99 0 0 1 7.6-1 143 143 0 0 1 10.4 2 61 61 0 0 1 5.1-2.6 49 49 0 0 1 5.3 1.8"/>
    								<path style="opacity:.6" fill="#2bb4e2" d="M31.5 10.3h.4q.103.252.4.2.103.252.4.2a4 4 0 0 0 .7.8q1.018 3.215-2.3 3.7-1.501 4.156-6 3.8a2.5 2.5 0 0 0-.8.5q-.622 1.493.1 3 .941.271 1.6 1 1.21 2.268-.9 3.7-2.249.664-3.4-1.3-1.572.771-2.6 2.2 1.984 2.062 0 4.1-4.049 1.154-3.9-3.1a9 9 0 0 0-1.7-1.5 15.5 15.5 0 0 0-4.4.4q-1.28 1.619-3.2 1-2.513-1.868-.4-4.2 2.546-1.112 4 1.3 2.361-.919 4.8-.3a13 13 0 0 1 2.6 2.1q1.972-3.023 5.3-4.4a2.1 2.1 0 0 0 .3-.8 12.6 12.6 0 0 1-.4-2.4q-.019-2.134 2-2.9a17 17 0 0 0 4-1q.828-.856 1.2-2-1.433-3.486 2.2-4.1"/>
    								</svg>
    					    	</i>
                            </button>

    						<button class="hide-show-option" id="toggle-history-path">
                                <i>
                                    <svg class="hide-show-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                                    <path style="opacity:.4" fill="#ff0000" d="M31.5 10.3h.4q.103.252.4.2.103.252.4.2a4 4 0 0 0 .7.8q1.018 3.215-2.3 3.7-1.501 4.156-6 3.8a2.5 2.5 0 0 0-.8.5q-.622 1.493.1 3 .941.271 1.6 1 1.21 2.268-.9 3.7-2.249.664-3.4-1.3-1.572.771-2.6 2.2 1.984 2.062 0 4.1-4.049 1.154-3.9-3.1a9 9 0 0 0-1.7-1.5 15.5 15.5 0 0 0-4.4.4q-1.28 1.619-3.2 1-2.513-1.868-.4-4.2 2.546-1.112 4 1.3 2.361-.919 4.8-.3a13 13 0 0 1 2.6 2.1q1.972-3.023 5.3-4.4a2.1 2.1 0 0 0 .3-.8 12.6 12.6 0 0 1-.4-2.4q-.019-2.134 2-2.9a17 17 0 0 0 4-1q.828-.856 1.2-2-1.433-3.486 2.2-4.1"/>
                                    <path fill="#2bb4e2" d="M21.146 29.774a.774.774 90 01.202 1.534 10 10 90 01-2.024.062 10 10 90 01-6.392-2.908A10 10 90 0110 21.386c0-2.762 1.12-5.262 2.93-7.072A9.98 9.98 90 0122.784 11.776 10 10 90 0124.88 12.652L24.682 12.136A.84.84 90 0126.248 11.54l.836 2.182a.8.8 90 01.054.258.84.84 90 01-.582.932l-2.232.682a.836.836 90 01-.486-1.598l.184-.056a8.4 8.4 90 00-1.666-.682A8.4 8.4 90 0020.004 12.93a8.4 8.4 90 00-5.98 2.478 8.44 8.44 90 00-2.478 5.98c0 2.336.946 4.45 2.478 5.98A8.44 8.44 90 0019.354 29.82c.594.046 1.204.03 1.792-.046M18.474 17.318a.772.772 90 011.546 0v4.706l3.222 1.416a.772.772 90 01-.622 1.414l-3.644-1.602a.78.78 90 01-.502-.724zM23.84 28.948a.774.774 90 00.7 1.38q.75-.378 1.426-.878a.774.774 90 00-.92-1.242 8 8 90 01-1.204.74m3.154-2.77a.774.774 90 001.284.862q.47-.696.816-1.46a.774.774 90 00-1.41-.638 8 8 90 01-.69 1.236m1.42-3.964a.772.772 90 101.54.146q.08-.834.024-1.672a.776.776 90 00-1.544.108q.048.708-.02 1.418m-.644-4.162a.772.772 90 101.42-.612 10 10 90 00-.784-1.478.774.774 90 00-1.3.836q.384.598.664 1.25"/>
                                    <path class="path1" style="opacity:.929" d="M 25.3 5.3 a 4.3 4.3 0 0 1 1.8 0.3 a 1373 1373 0 0 0 12.4 4.5 l 0.2 0.6 a 1426 1426 0 0 0 -1.5 11.8 a 360 360 0 0 1 -0.5 16.2 A 708 708 0 0 0 26.3 36 a 49.4 49.4 0 0 0 -7.4 -0.2 a 39 39 0 0 1 -5.3 1.3 A 453 453 0 0 1 0.5 34.7 a 219 219 0 0 1 1.6 -13.5 A 322 322 0 0 1 0.3 6.9 a 531 531 0 0 0 10.6 -0.8 a 555 555 0 0 0 9.2 1.6 z a 37 37 0 0 1 1.7 3.7 M 36 12 a 254 254 0 0 0 -1.4 12.2 a 103 103 0 0 1 0.1 10.7 q -7.753 -2.11 -15.8 -2.2 a 427 427 0 0 0 -5.7 1 a 187 187 0 0 0 -10.2 -1.4 a 232 232 0 0 1 1.6 -11.9 a 486 486 0 0 0 -2 -10.5 a 99 99 0 0 1 7.6 -1 a 143 143 0 0 1 10.4 2 a 61 61 0 0 1 6.4 -1.9 Z z"/>
                                    </svg>
                                </i>
    						</button>


    						<button class="hide-show-option" id="toggle-room-label">
    						    <i>
    						        <svg class="hide-show-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
    						            <path class="path1" style="opacity:.929" d="M 25.3 5.3 a 4.3 4.3 0 0 1 1.8 0.3 a 1373 1373 0 0 0 12.4 4.5 l 0.2 0.6 a 1426 1426 0 0 0 -1.5 11.8 a 360 360 0 0 1 -0.5 16.2 A 708 708 0 0 0 26.3 36 a 49.4 49.4 0 0 0 -7.4 -0.2 a 39 39 0 0 1 -5.3 1.3 A 453 453 0 0 1 0.5 34.7 a 219 219 0 0 1 1.6 -13.5 A 322 322 0 0 1 0.3 6.9 a 531 531 0 0 0 10.6 -0.8 a 555 555 0 0 0 9.2 1.6 z a 37 37 0 0 1 1.7 3.7 M 36 12 a 254 254 0 0 0 -1.4 12.2 a 103 103 0 0 1 0.1 10.7 q -7.753 -2.11 -15.8 -2.2 a 427 427 0 0 0 -5.7 1 a 187 187 0 0 0 -10.2 -1.4 a 232 232 0 0 1 1.6 -11.9 a 486 486 0 0 0 -2 -10.5 a 99 99 0 0 1 7.6 -1 a 143 143 0 0 1 10.4 2 a 61 61 0 0 1 6.4 -1.9 Z z"/>
    						            <rect x="9" y="14" width="20" height="14" rx="2" fill="none" stroke="#2bb4e2" stroke-width="1.5"/><line x1="20" y1="32" x2="20" y2="28" style="stroke:#2bb4e2;stroke-width:2" />
    						            <text x="16" y="26" font-family="Arial" font-size="14" text-anchor="middle" fill="#2bb4e2">A</text>
    						            <text x="24" y="16" font-family="Arial" font-size="14" text-anchor="middle" fill="#2bb4e2" dy="10">1</text>
    						        </svg>
    						    </i>
    						</button>

							<button class="hide-show-option" id="reset-selection-btn">
	    						    <i>
	    						        <svg class="hide-show-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
										    <path class="path1" style="opacity:.929" d="M 25.3 5.3 a 4.3 4.3 0 0 1 1.8 0.3 a 1373 1373 0 0 0 12.4 4.5 l 0.2 0.6 a 1426 1426 0 0 0 -1.5 11.8 a 360 360 0 0 1 -0.5 16.2 A 708 708 0 0 0 26.3 36 a 49.4 49.4 0 0 0 -7.4 -0.2 a 39 39 0 0 1 -5.3 1.3 A 453 453 0 0 1 0.5 34.7 a 219 219 0 0 1 1.6 -13.5 A 322 322 0 0 1 0.3 6.9 a 531 531 0 0 0 10.6 -0.8 a 555 555 0 0 0 9.2 1.6 z a 37 37 0 0 1 1.7 3.7 M 36 12 a 254 254 0 0 0 -1.4 12.2 a 103 103 0 0 1 0.1 10.7 q -7.753 -2.11 -15.8 -2.2 a 427 427 0 0 0 -5.7 1 a 187 187 0 0 0 -10.2 -1.4 a 232 232 0 0 1 1.6 -11.9 a 486 486 0 0 0 -2 -10.5 a 99 99 0 0 1 7.6 -1 a 143 143 0 0 1 10.4 2 a 61 61 0 0 1 6.4 -1.9 Z z"/>
										    <rect x="6" y="11" width="12" height="18" rx="1" fill="none" stroke="lime" stroke-width="1.5"/>
										    <rect x="21" y="20" width="18" height="12" rx="1" fill="#32CD32" stroke="lime" stroke-width="1.5"/>
										    <path  fill="#2bb4e2" d="M30 22.44V19.359c0-1.519-.209-2.633-.911-3.43-.719-.814-1.816-1.165-3.541-1.092H24.017V13.461Q24.003 13.187 23.832 13.073c-.286-.191-.57.036-.776.219C22.462 13.822 20.504 15.327 20.172 15.615a.454.454 0 000 .713c.326.275 2.214 1.715 2.826 2.27.216.194.523.479.834.273q.171-.114.185-.389V16.93h1.576c1.058-.049 1.65.074 1.925.387.298.339.387 1.028.387 2.047V22.44Z"/>
	    						        </svg>
	    						    </i>
	                        </button>
						</div>

						<button class="menu-item" data-next="spectacle-menu">
                            <i>&#128171;</i>Spectacle
                        </button>


                    </div>

                    <!-- View Menu Level 2 -->
                    <div class="menu-level" id="view-menu">

                        <div class="menu-title">View Menu</div>

                        <div class="slider-container">
                            <label for="x-rotation">X-Rotation:</label>
                            <input type="range" id="x-rotation" min="-180" max="180" value="0" step="1">
                            <span class="slider-value" id="x-rotation-value">0�</span>
                        </div>

                        <div class="slider-container">
                            <label for="y-rotation">Y-Rotation:</label>
                            <input type="range" id="y-rotation" min="-180" max="180" value="0" step="1">
                            <span class="slider-value" id="y-rotation-value">0�</span>
                        </div>

                        <div class="slider-container">
                            <label for="z-rotation">Z-Rotation:</label>
                            <input type="range" id="z-rotation" min="-180" max="180" value="0" step="1">
                            <span class="slider-value" id="z-rotation-value">0�</span>
                        </div>

                        <div class="slider-container">
                            <label for="perspective">Perspective:</label>
                            <input type="range" id="perspective" min="500" max="2000" value="1200" step="100">
                            <span class="slider-value" id="perspective-value">1200</span>
                        </div>

                        <div class="slider-container">
                            <label for="zoom-level">Zoom:</label>
                            <input type="range" id="zoom-level" min="25" max="300" value="100" step="5">
                            <span class="slider-value" id="zoom-value">100%</span>
                        </div>

                        <div class="slider-container">
                            <label for="x-position">Horizontal:</label>
                            <input type="range" id="x-position" min="-700" max="700" value="0" step="5">
                            <span class="slider-value" id="x-position-value">0px</span>
                        </div>

                        <div class="slider-container">
                            <label for="y-position">Vertical:</label>
                            <input type="range" id="y-position" min="-700" max="700" value="0" step="5">
                            <span class="slider-value" id="y-position-value">0px</span>
                        </div>

						<div class="slider-container">
                            <label for="map-size-range">Map Size:</label>
                            <input type="range" id="map-size-range" min="256" max="2048" value="${canvasSize}" step="32">
                            <span class="slider-value" id="map-size-value">${canvasSize}px</span>
                        </div>

						<div class="colorinput-container">
                            <label for="bg-color-picker">Background:</label>
                            <input type="color" id="bg-color-picker" value="#ffffff">
						</div>

						<button class="menu-item" id="reset-view-btn">
                            <i></i> Reset View
                        </button>

                        <button class="back-button" data-back="main-menu">&#128072; Back</button>
                    </div>

					<!-- Cleaning Menu Level 2 -->
					<div class="menu-level" id="clean-menu">
					    <div class="menu-title">Cleaning Menu</div>

					    <!-- Mode selection -->
					    <div class="icon-clean-menu">
						    <button class="mode-option" data-mode="Sweeping">
						        <i>
						    		<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
									<path fill="#fff" d="M29.1 2.9q1.69.338 1.3 2A32.6 32.6 0 0 0 26 9.3a26.3 26.3 0 0 0-2.2 6q-1.246.851-2.2-.4.488-8.084 7.5-12"/>
									<path fill="#fff" d="M29.7 8.1q1.423-.138 2.4.9 4.23 3.51 5.3 8.9a6.1 6.1 0 0 1 0 2.2q-.847.921-2 .4-.955-6.514-6.2-10.4-.567-1.176.5-2"/>
									<path fill="#fff" d="M16.3 9.7q2.594-.207 1.7 2.2-7.31 4.714-8.4 13.4-.875 1.244-2.1.4-.441-.508-.4-1.2 1.266-9.542 9.2-14.8"/>
									<path fill="#fff" d="M17.7 16.3q.707-.049 1.4.1 5.711 2.212 11.4-.1 1.825.249 1.2 2-2.285 1.447-5 1.7l-3.4.2q5.261 5.458 4.8 12.9-1.212.535-2.1-.4-.597-5.597-4-10a39.3 39.3 0 0 0-4.8-4.4q-.342-1.176.5-2"/>
									<path fill="#fff" d="M1.7 27.9q.707-.049 1.4.1 8.117 3.338 16.3.1 1.321.072 1.3 1.4.033.562-.4.9-9.595 3.961-19-.4-.507-1.211.4-2.1"/>
									</svg>
						    	</i>
						    </button>

						    <button class="mode-option" data-mode="Mopping">
						        <i>
						    		<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
									<path fill="#fff" d="M15.1 1.9q.846-.076 1.6.3A75 75 0 0 1 23 9.7q.888 2.477-1.7 2.1l-5.5-6.7q-5.93 6.254-9.8 14-3.723 7.738 2.7 13.5 6.843 5.237 13.8.2a22 22 0 0 1 2.6-2.4q1.47-.315 2 1.1-2.597 4.441-7.6 5.9-10.942 2.203-16.3-7.5-2.153-4.894-.6-10 4.564-10.207 12.5-18"/>
									<path fill="#fff" d="M28.5 6.9q1.149-.075 2 .7 4.055 4.457 6.7 9.9 2.28 7.486-4.5 11.3-6.091 2.183-10.5-2.5-3.775-5.66 0-11.4 2.547-4.494 6.3-8m.4 3.4q.873.522 1.5 1.4a63 63 0 0 1 4.4 7q1.395 5.56-3.9 7.9-5.527 1.161-7.7-4.1-.701-2.999 1-5.6a46.3 46.3 0 0 1 4.7-6.6"/>
									</svg>
						    	</i>
						    </button>

						    <button class="mode-option" data-mode="SweepingAndMopping">
						        <i>
						    		<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
									<path fill="#fff" d="M15.1 1.9q1.177 -0.129 2.1 0.6a99.2 99.2 0 0 1 4.8 5.8 14.8 14.8 0 0 1 1.9 3.1q-0.443 1.522 -2 1.2A172.2 172.2 0 0 1 15.8 5.1q-6.842 7.244 -10.8 16.4 -1.313 7.223 4.5 11.7 8.574 4.946 15.1 -2.5a20.08 20.08 0 0 1 1.9 -2.7q1.656 -0.398 2 1.3 -4.77 9.986 -15.8 8.3 -8.38 -2.28 -10.5 -10.7 -0.974 -6.303 2.6 -11.6 4.288 -7.381 10.3 -13.4"/>
									<path fill="#fff" d="M28.5 8.9q2.181 -0.139 1.7 2 -3.774 2.605 -5.3 6.9a28.4 28.4 0 0 0 -0.9 3.5q-0.995 1.082 -2.2 0.2 -0.132 -8.134 6.7 -12.6"/>
									<path fill="#fff" d="M29.5 14.3q1.542 -0.228 2.6 0.9 5.465 4.579 5.3 11.7 -1.274 1.172 -2.4 -0.2 -0.396 -4.996 -3.8 -8.6a15.68 15.68 0 0 1 -2.2 -2q-0.261 -1.048 0.5 -1.8"/>
									<path fill="#fff" d="M18.1 22.5a120.4 120.4 0 0 1 3.8 1.1q4.539 0.885 8.8 -0.9 1.186 0.186 1.4 1.4 -0.907 1.608 -2.8 1.9 -5.993 1.714 -11.6 -1 -1.167 -1.454 0.4 -2.5"/>
									</svg>
						    	</i>
						    </button>

						    <button class="mode-option" data-mode="MoppingAfterSweeping">
						        <i>
						    		<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
									<path fill="#fff" d="M23.1 4.7q.868-.137 1.5.4a66.5 66.5 0 0 1-.2 10.2q-.8.4-1.6 0l-.2-8a.73.73 0 0 0-.3-.2q-.87.735-2 .8-.105-1.069.4-2 1.144-.772 2.4-1.2"/>
									<path fill="#fff" d="M12.7 5.5q1.856-.19 1.9 1.6a44 44 0 0 0-3.4 3.6 19 19 0 0 0-2 5.4q-.979.773-2 0-.435-4.199 2.2-7.6 1.529-1.681 3.3-3"/>
									<path fill="#fff" d="M14.3 10.5q1.423-.138 2.4.9 4.072 3.393 4.6 8.7-.437 1.989-2.3 1.2a26 26 0 0 0-1.8-5.2L16 14.5a18.7 18.7 0 0 1-2.4-2.2q-.306-1.184.7-1.8"/>
									<path style="opacity:.902" fill="#fff" d="M4.5 17.1q.728.007 1.4.3 2.545 1.736 5.6 1.2a21 21 0 0 0 3.4-1.3q1.94.529 1 2.3-6.148 3.821-12.2-.2-.826-1.572.8-2.3"/>
									<path style="opacity:.6" fill="#fff" d="M28.3 17.1q.945-.087 1.8.3 3.445 3.244 5.5 7.5 2.276 6.373-3.7 9.5-6.714 1.967-9.7-4.3-.669-2.436.2-4.8 2.202-4.65 5.9-8.2m.4 3.8q1.141.384 1.9 1.4 1.602 2.002 2.6 4.4.402 5.698-5.3 5.1-3-.95-3.2-4.1 1.136-3.929 4-6.8"/>
									<path style="opacity:.6" fill="#fff" d="M14.7 24.7q4.731-.219 3.7 4.4a29 29 0 0 1-3.5 4.4q1.882.046 3.8.1.8.9 0 1.8-3 .2-6 0-.774-.444-.5-1.3a28.2 28.2 0 0 1 3.8-4.2q1.011-1.232.8-2.8-.899-.829-2.1-.5a79 79 0 0 1-1.7.9q-1.162-.341-.4-1.4.946-.904 2.1-1.4"/>
									</svg>
						    	</i>
						    </button>

						    <button class="mode-option" data-mode="CustomRoomCleaning">
						        <i>
						    		<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
									<path fill="#fff" d="M8.7 3.5q5.061-.283 6.9 4.4 1.478 4.481 1.1 9.2-3.954.209-7.8-.7-7.3-2.05-5.1-9.3 1.649-2.944 4.9-3.6m.4 2q4.611.16 5.1 4.8a28 28 0 0 1 .7 4.8q-4.183-.027-8-1.7-2.64-2.71-.9-6.1 1.199-1.572 3.1-1.8"/>
									<path fill="#fff" d="M28.1 3.7q8.944-.207 7.5 8.6-1.285 2.873-4.3 3.9-4.208 1.29-8.6 1-.681-4.746.9-9.3 1.358-3.11 4.5-4.2m.4 2q6.546-.203 5.1 6.2-.674 1.564-2.3 2.1a27.6 27.6 0 0 1-7 1.3q.102-4.207 1.9-8 .945-1.143 2.3-1.6"/>
									<path fill="#fff" d="M13.1 22.3a16 16 0 0 1 3.5.2q.621 5.434-1.6 10.4-3.533 4.767-8.9 2.1-3.55-2.556-2.7-6.9.788-3.388 4.1-4.5 2.76-1.007 5.6-1.3m1.4 1.8q.399 4.258-1.5 8.2-1.892 2.131-4.7 1.5-4.123-1.757-2.7-6.1 1.156-2.053 3.5-2.5a59 59 0 0 1 5.4-1.1"/>
									<path fill="#fff" d="M22.5 22.5q4.616-.354 9 1.1 5.308 2.064 4.3 7.7-2.011 5.631-7.9 4.5-3.214-.913-4.3-4.1-1.478-4.481-1.1-9.2m2 1.8q4.078.245 7.8 1.9 2.647 2.701.9 6.1-3.235 3.214-6.8.4-1.111-1.631-1.4-3.6-.591-2.413-.5-4.8"/>
									</svg>
						    	</i>
						    </button>
					    </div>

					    <!-- Dynamic settings -->
					    <div class="settings-container"></div>

					    <button class="back-button" data-back="main-menu">&#128072; Back</button>
					</div>

					<!-- Spectacle Menu Level 2 -->
                    <div class="menu-level" id="spectacle-menu">
                        <div class="menu-title">Spectacle Menu</div>
						<div class="slider-container">
                            <label for="animation-speed">Speed:</label>
                            <input type="range" id="animation-speed" min="1" max="10" value="5" step="0.1">
                            <span class="slider-value" id="speed-value">5.0x</span>
                        </div>
                        <button class="menu-item" id="animation-toggle">
                            Start Map Spectacle
                        </button>
                        <button class="menu-item" id="Base-station-toggle">
                            Start Base Spectacle
                        </button>
                        <button class="back-button" data-back="main-menu">&#128072; Back</button>
                    </div>


					<!-- Command cleaning menu -->
                    <div class="command-interface">
                      <!-- Main command button -->
                      <button class="command-main-btn" id="command-trigger">
                        <svg width="64" height="64" viewBox="0 0 200 200" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <!--Robot body-->
                          <circle cx="100" cy="100" r="80" fill="#f8f8f8" stroke="#333" stroke-width="4" opacity="0.5">
                            <animate attributeName="cy" values="100;98;100;102;100" dur="2s" repeatCount="indefinite"/>
                          </circle>
                        <!--Radar scanner-->
                          <g transform="translate(100,60)">
                        <!--Static radar background-->
                            <circle r="15" fill="none" stroke="#aaa" stroke-width="3" opacity="0.9"/>
                        <!--Pulsating radar rings-->
                            <circle r="3" fill="none" stroke="#fff" stroke-width="3.5" opacity="0">
                              <animate attributeName="r" values="3;35" dur="3.5s" begin="0s" repeatCount="indefinite"/>
                              <animate attributeName="opacity" values="1;0.5" dur="3.5s" begin="0s" repeatCount="indefinite"/>
                            </circle>
                        <!--Radar center-->
                            <circle r="12" fill="#000000" opacity="0.3"/>
                          </g>
                        <!--Wheels-->
                          <rect x="12" y="85" width="12" height="30" rx="6" fill="#444" opacity="0.9">
                            <animate attributeName="y" values="85;82;85;88;85" dur="2.4s" repeatCount="indefinite"/>
                          </rect>
                          <rect x="176" y="85" width="12" height="30" rx="6" fill="#444" opacity="0.9">
                            <animate attributeName="y" values="85;88;85;82;85" dur="2.4s" repeatCount="indefinite"/>
                          </rect>
                        <!--Play button-->
                          <polygon points="90,77 125,97 90,117" fill="#fff">
                            <animate attributeName="opacity" values="1;0.7;1" dur="1.5s" repeatCount="indefinite"/>
                            <animate attributeName="points" values="90,77 125,97 90,117; 85,77 125,97 85,117; 90,77 125,97 90,117" dur="2s" repeatCount="indefinite"/>
                          </polygon>
                        <!--Stop button-->
                          <rect x="34" y="77" width="40" height="40" fill="#fff" rx="5">
                            <animate attributeName="fill" values="#fff;#fff" dur="2s" repeatCount="indefinite"/>
                            <animate attributeName="width" values="40;35;40" dur="1.5s" repeatCount="indefinite"/>
                            <animate attributeName="height" values="40;35;40" dur="1.5s" repeatCount="indefinite"/>
                          </rect>
                        <!--Pause button-->
                          <rect x="140" y="77" width="12" height="40" fill="#fff" rx="2">
                            <animate attributeName="height" values="40;30;40" dur="1s" repeatCount="indefinite"/>
                          </rect>
                          <rect x="155" y="77" width="12" height="40" fill="#fff" rx="2">
                            <animate attributeName="height" values="40;30;40" dur="1s" begin="0.5s" repeatCount="indefinite"/>
                          </rect>
                        <!--Brush animation-->
                          <g transform="translate(145,39)">
                            <circle r="8" fill="#bbb" opacity="0.9"/>
                            <g transform="rotate(0,0,0)">
                              <line x1="-8" y1="0" x2="-13" y2="0" stroke="#fff" stroke-width="2"/>
                              <line x1="0" y1="-8" x2="0" y2="-13" stroke="#fff" stroke-width="2"/>
                              <line x1="8" y1="0" x2="13" y2="0" stroke="#fff" stroke-width="2"/>
                              <line x1="0" y1="8" x2="0" y2="13" stroke="#fff" stroke-width="2"/>
                              <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="5s" repeatCount="indefinite"/>
                            </g>
                          </g>
                        </svg>
                      </button>

                      <!-- Floating Command Menu -->
                      <div class="command-options">
                        <button class="cmd-btn" data-command="Start">
                          <svg class="base-all-icon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M8 5v14l11-7z"/>
						  </svg>
                          <span>Start</span>
                        </button>
                        <button class="cmd-btn" data-command="Pause">
                          <svg class="base-all-icon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
						  </svg>
                          <span>Pause</span>
                        </button>
                        <button class="cmd-btn" data-command="Stop">
                          <svg class="base-all-icon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M6 6h12v12H6z"/>
						  </svg>
                          <span>Stop</span>
                        </button>
						 <button class="cmd-btn" data-command="CustomCleanSelected">
						  <svg viewBox="0 0 64 64" width="32" height="32">
						    <rect x="4" y="4" width="15" height="15" fill="none" stroke="#fff" stroke-width="2">
						      <animate attributeName="opacity" values="0;1" dur="1s" begin="0.5s" fill="freeze"/>
						      <animate attributeName="stroke-dasharray" values="1,0.5;1" dur="8s" repeatCount="indefinite"/>
						    </rect>
						    <rect x="24" y="4" width="36" height="18" fill="none" stroke="#fff" stroke-width="2"/>
						    <rect x="4" y="26" width="14" height="24" fill="none" stroke="#fff" stroke-width="2" opacity="1"/>
						    <rect x="22" y="26" width="38" height="34" fill="#fff" stroke="#fff" stroke-width="2" fill-opacity="0.7" stroke-opacity="0.9">
						      <animate attributeName="opacity" values="0;1" dur="1s" begin="0.5s" fill="freeze"/>
						      <animate attributeName="stroke-dasharray" values="3,1;3,5" dur="8s" repeatCount="indefinite"/>
						    </rect>
						    <polygon points="32,16 50,32 32,48" fill="#fff" fill-opacity="1" stroke="#fff" stroke-width="8" stroke-opacity="0.8">
						      <animate attributeName="stroke-width" values="10;6;10" dur="2s" repeatCount="indefinite"/>
						    </polygon>
						  </svg>
                          <span>Selected</span>
						 </button>
                        <button class="cmd-btn" data-command="Charge">
						  <svg class="base-all-icon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/>
						  </svg>
                          <span>Charge</span>
                        </button>
                      </div>
                    </div>

					<!-- Command Charging Station menu -->
					<div class="command-Base-interface">
					  <!-- Main command button -->
					  <button class="command-Base-main-btn" id="command-Base-trigger">
						<svg class="base-main-icon" viewBox="0 0 64 64">
							<path style="opacity:0.4" fill="#fff" d="M32,12c-6.6,0-12,5.4-12,12v8h-6v-8c0-9.9,8.1-18,18-18s18,8.1,18,18v8h-6v-8C44,17.4,38.6,12,32,12z"/>
							<circle style="opacity:0.8" fill="#fff" cx="32" cy="24" r="14"/>
							<circle style="opacity:1" fill="#fff" cx="32" cy="17" r="4"/>
							<path fill="#fff" d="M56,30H8c-2.2,0-4,1.8-4,4v20c0,2.2,1.8,4,4,4h48c2.2,0,4-1.8,4-4V34C60,31.8,58.2,30,56,30z M52,50H12V34h40V50z"/>
					        <rect style="opacity:0.7" fill="#fff" x="12" y="35" width="40" height="14"/>
							<g><path style="opacity:0.978" fill="#FFD700" d="M 37.425 14.785 C 37.6459 14.7536 37.8559 14.7886 38.055 14.89 C 36.0604 20.139 34.1704 25.424 32.385 30.745 C 35.535 30.745 38.685 30.745 41.835 30.745 C 41.7397 31.2994 41.4946 31.7894 41.1 32.215 C 35.64 39.0751 30.18 45.9349 24.72 52.795 C 24.4716 53.0535 24.2266 53.0535 23.985 52.795 C 25.9163 47.7012 27.8063 42.5911 29.655 37.465 C 26.4053 37.3571 23.1853 37.1821 19.995 36.94 C 25.855 29.5773 31.665 22.1922 37.425 14.785 Z"/></g>
						</svg>
					  </button>

					  <!-- Floating Command Menu -->
					  <div class="command-Base-options">
					    <button class="cmd-Base-btn" data-base-type="StartAutoEmpty" data-base-value="true">
					      <svg class="base-icon" viewBox="0 0 24 24">
					        <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M9,8H11V17H9V8M13,8H15V17H13V8Z"/>
					      </svg>
					      <span>Empty</span>
					    </button>
					    <button class="cmd-Base-btn" data-base-type="StartWashing" data-base-value="true">
					      <svg class="base-wash-icon" viewBox="0 0 24 24" width="36" height="36">
					        <path d="M 0.95 8.065 c 1.425 -3.51 2.1375 -5.265 6.4125 -7.02 h 8.55 c 2.85 0 5.7 3.51 7.8375 7.02 Z" style="opacity:0.9" fill="#fff" stroke="#fff" stroke-width="0.6"/>
					        <path style="opacity:0.9" fill="#fff" stroke="#fff" stroke-width="0.6" d="M 6 15.75 c -1.125 0 -2.25 -0.75 -2.25 -1.875 s 2.25 -3.375 2.25 -3.375 s 2.25 2.25 2.25 3.375 s -1.125 1.875 -2.25 1.875"/>
					        <path style="opacity:0.9" fill="#fff" stroke="#fff" stroke-width="0.6" d="M13 18.75c-1.125 0 -2.25 -0.75 -2.25 -1.875s2.25 -3.375 2.25 -3.375 2.25 2.25 2.25 3.375 -1.125 1.875 -2.25 1.875"/>
					        <path style="opacity:0.9" fill="#fff" stroke="#fff" stroke-width="0.6" d="M 19 15.75 c -1.125 0 -2.25 -0.75 -2.25 -1.875 s 2.25 -3.375 2.25 -3.375 s 2.25 2.25 2.25 3.375 s -1.125 1.875 -2.25 1.875"/>
						  </svg>
					      <span>Wash</span>
					    </button>
					    <button class="cmd-Base-btn" id="child-lock-btn" data-base-type="ChildLock" data-base-value="1">
					      <svg class="lock-icon" viewBox="0 0 24 24">
					        <path fill="currentColor" d="M12,3A4,4 0 0,0 8,7V8H6V7A6,6 0 0,1 12,1A6,6 0 0,1 18,7V8H16V7A4,4 0 0,0 12,3M12,5A2,2 0 0,1 14,7V8H10V7A2,2 0 0,1 12,5M19,10A1,1 0 0,0 18,9H6A1,1 0 0,0 5,10V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V10Z"/>
					      </svg>
					      <span>Lock</span>
					    </button>
					  </div>
					</div>

                </div>

                <div class="coverage-info">
                    <div class="coverage-content">
                        <!-- Charging station on the left side -->
                        <div class="charger-mini-container" style="display: inline-block; vertical-align: top; margin-right: 15px;">
                            <div class="charger-station-mini" data-status="idle">
                                <div class="charger-base">
                                    <div class="status-indicator">
                                        <svg class="charger-icon" viewBox="0 0 24 24">
                                            <path d="M12 2L1 21h22L12 2zm0 3.5L18.5 19h-13L12 5.5z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div class="mini-status-text">Idle</div>
                        </div>

                        <!-- Room information on the right side -->
                        <div class="room-info" style="display: inline-block; vertical-align: top;">
                            <div class="status-text-above" style="margin-bottom: 5px;"></div>
                            <div><span id="currentCleanedLabel"></span> <span id="current-CleanedArea">0</span>m²</div>
                            <div><span id="currentRoomLabel"></span> <span id="current-room">-</span></div>
                        </div>

						<!-- Battery indicator -->
						<div class="battery-indicator">
                            <div class="battery-level" id="battery-level"></div>
                            <span id="battery-percent">0%</span>
						</div>

				        <!-- Component status section -->
				        <div class="component-status" style="margin-top: 12px;">
				            <div id="component-list" style="display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 8px; padding: 5px 0;">
				                <!-- Components will be dynamically inserted here -->
				            </div>
				        </div>


                    </div>
                </div>

                <!-- Summary Tooltip -->
                <div id="summary-tooltip" class="summary-tooltip">
                    <div class="selection-summary">
                        <div><strong>Current Selection:</strong></div>
                        <div>Mode: <span id="mode-summary">-</span></div>
                        <div>Suction: <span id="suction-summary">-</span></div>
                        <div>Water: <span id="water-summary">-</span></div>
                        <div>Route: <span id="route-summary">-</span></div>
                        <div>Repeat: <span id="repeat-summary">-</span></div>
                    </div>
                </div>

                <!-- Overlay for component detail view -->
                <div class="component-detail-overlay" id="component-detail-overlay">
                    <div class="component-detail-container">
                        <button class="component-detail-close" id="component-detail-close">&times;</button>
                        <div class="component-detail-svg-container">
                            <div class="component-detail-svg" id="component-detail-svg"></div>
                        </div>
                        <div class="component-detail-name" id="component-detail-name"></div>

                        <div class="component-detail-info">
                            <div>Status:</div>
                            <div id="component-detail-status">-</div>
                        </div>
                        <div class="component-detail-info">
                            <div>Remaining:</div>
                            <div id="component-detail-remaining">-</div>
                        </div>
                        <div class="component-detail-info">
                            <div id="component-detail-remaining-String">Remaining Time:</div>
                            <div id="component-detail-time">-</div>
                        </div>

						<div class="component-detail-info">
                            <div id="component-detail-currentMlPerSqm-Label">Consumption:</div>
                            <div id="component-detail-currentMlPerSqm">-</div>
                        </div>

						<div class="component-detail-info">
                            <div id="component-detail-currentMlMaxMin-Label">Average:</div>
                            <div id="component-detail-currentMlMaxMin" style="font-size: 15px;">-</div>
                        </div>

                        <button class="component-detail-reset" id="component-detail-reset">
                            <i class="fas fa-sync-alt"></i> Reset Component
                        </button>
                    </div>
                </div>

                <canvas id="click-layer" width="${canvasSize}" height="${canvasSize}"></canvas>

                <script>
                    // Global variables for the script part
					const prefix = '${prefix}';
                    const colorMappings = ${JSON.stringify(colorMappings, null, 2)};
                    const roomData = ${JSON.stringify(roomData, null, 2)};
					const rotationAngle = ${rotationAngle};
                    const scale = ${scale};
                    const offsetX = ${offsetX};
                    const offsetY = ${offsetY};
                    const roomDataMap = ${JSON.stringify(roomDataMap, null, 2)};
					const roomNameNumberMap = getRoomNameNumberMap();
                    let posHistory = {}; //  { JSON.stringify(posHistoryForScript, null, 2)};


                    let selectedRooms = [];
                    let selectedCarpets = [];
                    const mapContent = document.querySelector('.map-content');
                    const canvasSize = ${canvasSize};
                    let robotPathPoints = [];
                    let showRobotPath = true;
					let showHistoryPath = true;
					let historyPathPoints = [];
					let currentPathPoints = [];
                    let lastRobotPosition = null;
                    let xRotation = 0;
                    let yRotation = 0;
                    let zRotation = 0;
                    let perspective = 1200;
                    let zoomLevel = 100;
                    let xPosition = 0;
                    let yPosition = 0;
                    let areHiddenState = false;
                    let updatePositionCallbacks = [];

                    // Get canvas elements
                    const colorMap = document.getElementById('color-map');
                    const clickLayer = document.getElementById('click-layer');
                    const colorMapCtx = colorMap.getContext('2d');
                    const clickLayerCtx = clickLayer.getContext('2d');

					let stopStatusLoop = true; // Set this to true to stop the loop
                    let currentStatusIndex = 0; // Keeps track of the current status index
					let statusLoopTimeout; // To store the timeout reference

					const UserLang = '${UserLang}';

					const statusList = [
                      'Sweeping',
                      'Mopping',
                      'sweeping-and-mopping',
                      'Charging',
                      'smart-charging',
                      'charging-completed',
                      'Auto-emptying',
                      'drying',
                      'Returning',
                      'returning-to-wash',
                      'returning-auto-empty',
                      'clean-add-water',
                      'washing-paused',
                      'returning-remove-mop',
                      'returning-install-mop',
                      'sleep',
                      'paused',
                      'remote-control',
                      'water-check',
                      'monitoring',
                      'monitoring-paused',
                      'Error'
                    ];

					const statusMapping = {
                      1: "Sweeping",
                      2: "Idle",
                      3: "Paused",
                      4: "Error",
                      5: "Returning",
                      6: "Charging",
                      7: "Mopping",
                      8: "Drying",
                      9: "Washing",
                      10: "Returning to wash",
                      11: "Building",
                      12: "Sweeping and mopping",
                      13: "Charging completed",
                      14: "Upgrading",
                      15: "Clean summon",
                      16: "Station reset",
                      17: "Returning install mop",
                      18: "Returning remove mop",
                      19: "Water check",
                      20: "Add clean water",
                      21: "Washing paused",
                      22: "Auto emptying",
                      23: "Remote control",
                      24: "Smart charging",
                      25: "Second cleaning",
                      26: "Human following",
                      27: "Spot cleaning",
                      28: "Returning auto empty",
                      97: "Shortcut",
                      98: "Monitoring",
                      99: "Monitoring paused"
                    };

                    const translations = {
                      'EN': {
                        'currentCleaned': 'Current Cleaned:',
                        'currentRoom': 'Current Room:',
                      },
                      'DE': {
                        'currentCleaned': 'Gereinigte Fläche:',
                        'currentRoom': 'Aktueller Raum:',
                      },
                    };

					document.getElementById('currentCleanedLabel').textContent = translations[UserLang].currentCleaned;
					document.getElementById('currentRoomLabel').textContent = translations[UserLang].currentRoom;

					// =============================================
                    // Base station logic
                    // =============================================
					  let isChildLockActive = false;

					  function initBaseControl() {
					    // Load initial lock state
					    getChildLockStatus();

					    document.querySelectorAll(".cmd-Base-btn").forEach(btn => {
					      btn.addEventListener("click", function() {
					        const commandType = this.getAttribute("data-base-type");
					        let commandValue = this.getAttribute("data-base-value");

					        // Special treatment for ChildLock
					        if (commandType === "ChildLock") {
					          commandValue = isChildLockActive ? "0" : "1";
					          this.setAttribute("data-base-value", commandValue);
					        }

					        sendBaseCommand(commandType, commandValue);

					        // Button animation
					        this.style.transform = "scale(0.9)";
					        setTimeout(() => this.style.transform = "scale(1)", 200);
					      });
					    });

					    // Toggle for Command-Options
					    document.getElementById("command-Base-trigger")?.addEventListener("click", function() {
					      const options = document.querySelector(".command-Base-options");
					      const isVisible = options.style.display === "flex";
					      options.style.display = isVisible ? "none" : "flex";
					      options.style.opacity = isVisible ? "0" : "1";
					    });
					  }

					  async function getChildLockStatus() {
					    try {
					      const response = await getState('${prefix}.control.ChildLock');
					      isChildLockActive = response === 1;
					      updateLockButton();
					    } catch (err) {
					      console.error('Error getting ChildLock status:', err);
					    }
					  }

					  // Update the updateLockButton function
					  function updateLockButton() {
					    const lockBtn = document.getElementById("child-lock-btn");
					    if (!lockBtn) return;

					    const lockIcon = lockBtn.querySelector(".lock-icon");
					    const lockText = lockBtn.querySelector("span");

					    if (isChildLockActive) {
					      lockBtn.classList.add("active");
					      lockIcon.innerHTML = '<path fill="currentColor" d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>';
					      lockText.textContent = "Unlock";
					      lockIcon.classList.add("lock-animate");
					      setTimeout(() => lockIcon.classList.remove("lock-animate"), 300);
					    } else {
					      lockBtn.classList.remove("active");
					      lockIcon.innerHTML = '<path fill="currentColor" d="M12,3A4,4 0 0,0 8,7V8H6V7A6,6 0 0,1 12,1A6,6 0 0,1 18,7V8H16V7A4,4 0 0,0 12,3M12,5A2,2 0 0,1 14,7V8H10V7A2,2 0 0,1 12,5M19,10A1,1 0 0,0 18,9H6A1,1 0 0,0 5,10V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V10Z"/>';
					      lockText.textContent = "Lock";
					      lockIcon.classList.add("lock-animate");
					      setTimeout(() => lockIcon.classList.remove("lock-animate"), 300);
					    }
					  }

					  async function sendBaseCommand(commandType, value) {
					    try {
					      const fullId = '${prefix}.control.' + commandType;
					      await setState(fullId, commandType === "ChildLock" ? parseInt(value) : value === "true");

					      if (commandType === "ChildLock") {
					        isChildLockActive = value === "1";
					        updateLockButton();
					      }

					      console.log('Command sent: ' + commandType + ' = ' + value);
					    } catch (err) {
					      console.error('Error setting ' + commandType + ':', err);
					    }
					  }

					  // initialization
					  initBaseControl();

					// =============================================
                    // Cleaning logic
                    // =============================================

                    function initRobotControl() {
                      document.querySelectorAll(".cmd-btn").forEach(btn => {
                        btn.addEventListener("click", function() {
                          const command = this.getAttribute("data-command");
							if (command !== "CustomCleanSelected") {
                             sendCommand(command);
							} else {
							startCustomCleanSelected();
							}
                          this.style.transform = "scale(0.9)";
                          setTimeout(() => {
                            this.style.transform = "scale(1)";
                          }, 200);
                        });
                      });

                      document.getElementById("command-trigger")?.addEventListener("click", function() {
                        const options = document.querySelector(".command-options");
                        options.style.display = options.style.display === "flex" ? "none" : "flex";
                        options.style.opacity = options.style.opacity === "1" ? "0" : "1";
                      });
                      pollStatus();
                    }

                    async function sendCommand(command) {
                      try {
                        await setState('${prefix}.control.Command', command);
                        console.log('Command sent: ' + command);
                      } catch (err) {
                        console.error('Error at ' + command + ':', err);
                      }
                    }

					// =============================================
                    // update Battery Status
                    // =============================================
                    function pollStatus() {
                      updateBatteryStatus();
                      updateComponentStatus();
					  setTimeout(pollStatus, 5000);
                    }

                    async function setState(id, value) {
                      return new Promise((resolve, reject) => {
                        try {
                          vis.conn._socket.emit('setState', id, {
                            val: value,
                            ack: false,
                            from: 'vis'
                          }, function(err) {
                            if (err) reject(err);
                            else resolve();
                          });
                        } catch (e) {
                          reject(e);
                        }
                      });
                    }

                    function updateBatteryStatus() {
                      getState('${prefix}.state.BatteryLevel')
                        .then(function(level) {
                          const batteryLevel = document.getElementById("battery-level");
                          const batteryPercent = document.getElementById("battery-percent");

                          batteryLevel.style.width = level + "%";
                          batteryPercent.textContent = level + "%";

                          if (level < 20) {
                            batteryLevel.classList.add('low-battery');
                            batteryPercent.style.color = '#ff3300';
                          } else {
                            batteryLevel.classList.remove('low-battery');
                            batteryPercent.style.color = '#00ffaa';
                          }
                        })
                        .catch(err => console.error('Battery status error:', err));
                    }

					// =============================================
                    // update components
                    // =============================================
                    const components = [
                        {
                            id: 'MainBrushLeft',
                    		timeId: 'MainBrushTimeLeft',
                            label: 'MainBrush',
                            svg: \`<svg width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 64 64">
                                    <style> .mainBrushCoverAnimation { animation:  coverMove 1.5s ease-in-out forwards, coverFade 1.5s ease-in-out forwards; } .mainBrushAnimation { animation: brushPulse 6s ease-in-out 1s infinite; }
                    					@keyframes coverMove { 0% { transform: translate(2px, 15px); } 100% { transform: translate(-10px, -5px); } }
                    					@keyframes coverFade { 0%, 70% { opacity: 0.6; } 100% { opacity: 0; } }
                    					@keyframes brushPulse { 0%, 100% { transform: translateY(-10px); } 50% { transform: translateX(-15px) scale(1.5); } }
                                    </style>
                                    <path class="mainBrushCoverAnimation" style="opacity:.27" d="M17.882 6.588q13.37 -0.188 26.729 0.376 1.235 0.407 2.447 0.753 0.466 2.096 -0.188 4.141 -0.684 0.503 -1.506 0 -3.371 0.422 -6.776 0.565 -0.753 1.129 -1.506 0l-6.024 -0.188a32 32 0 0 0 -6.588 0.753 38.776 38.776 0 0 0 -7.529 -1.129q-0.698 0.629 -1.318 0 -0.654 -2.045 -0.188 -4.141 1.485 -0.203 2.447 -1.129m-1.506 1.129h1.129q-0.266 3.668 -1.129 0m28.612 0a1.856 1.856 0 0 1 1.129 0.188q-0.976 3.415 -1.129 -0.188m-29.365 0.376a22.965 22.965 0 0 1 0.753 2.071L15.812 10.729a9.412 9.412 0 0 1 -0.188 -2.635m30.871 0q0.638 1.202 0.188 2.635 -0.491 -0.343 -0.565 -0.941 0.366 -0.813 0.376 -1.694m-25.976 0.753q1.037 0.079 0.376 0.753 -0.45 -0.258 -0.376 -0.753m4.894 0q1.037 0.079 0.376 0.753 -0.45 -0.258 -0.376 -0.753m2.635 0a27.482 27.482 0 0 1 6.4 0.376l-3.2 0.376q-1.836 -0.011 -3.2 -0.753m8.282 0q1.037 0.079 0.376 0.753 -0.45 -0.258 -0.376 -0.753m4.894 0a11.859 11.859 0 0 0 1.694 0.753q0.749 -0.144 1.129 -0.753 0.281 1.495 0.188 3.012 -12.989 0.094 -25.976 -0.188 11.481 -0.282 22.965 -0.188zm-19.576 0.753q0.835 -0.148 1.506 0.376l-0.753 0.376q-0.685 -0.139 -0.753 -0.753m17.694 0q0.835 -0.148 1.506 0.376l-0.753 0.376q-0.685 -0.139 -0.753 -0.753m-22.212 0.376q0.527 0.603 0.376 1.506a3.162 3.162 0 0 1 -1.506 -0.188 5.534 5.534 0 0 0 1.129 -1.318m1.129 0h3.012v1.129h-3.012zm6.024 0q1.037 0.079 0.376 0.753 -0.45 -0.258 -0.376 -0.753m1.129 0h11.671v1.129h-11.671zm12.047 0q1.037 0.079 0.376 0.753 -0.45 -0.258 -0.376 -0.753m7.153 0q3.422 1.473 0 1.506z"/>
                                    <path style="opacity:.4" d="M16 26.165q0.663 -0.124 1.129 0.376a138.918 138.918 0 0 0 -1.506 4.706 354.635 354.635 0 0 1 16.188 -1.694q9.753 0.373 19.2 2.824 4.417 1.219 7.718 4.329a15.435 15.435 0 0 1 0.941 2.071 158.871 158.871 0 0 1 -0.941 10.729q-3.352 3.608 -8.094 5.082 -18.022 4.663 -36.141 0.376 -5.671 -1.538 -9.6 -5.835a32.376 32.376 0 0 1 -0.565 -6.4 22.965 22.965 0 0 1 0.565 -5.647A20.593 20.593 0 0 1 9.6 33.506a2455.341 2455.341 0 0 1 -5.647 -3.2l0.376 -0.376a27.972 27.972 0 0 1 5.271 2.447q2.421 1.186 4.518 -0.565a99.765 99.765 0 0 0 1.882 -5.647m15.812 3.765q0.682 0.414 1.506 0.376v1.882h-2.635v-1.882q0.729 0.134 1.129 -0.376m-5.271 0.376q2.748 -0.191 0.376 1.318a4.706 4.706 0 0 1 -2.635 0 1.374 1.374 0 0 1 -0.376 -0.565 92.612 92.612 0 0 0 2.635 -0.753m9.035 0.376q0.236 -0.352 0.753 -0.376 2.43 0.401 4.894 0.565 -2.931 1.958 -5.647 -0.188m-6.776 0q2.034 1.124 0 0.941 -0.62 -0.435 0 -0.941m6.024 0q0.446 0.16 0.753 0.565 -0.872 0.67 -1.882 0.376a30.871 30.871 0 0 0 1.129 -0.941m-13.553 0.753q2.335 0.101 4.518 0.753 1.962 -0.536 3.765 0.188 3.025 0.383 6.024 -0.188 1.879 0.309 3.765 0.565l-15.059 0.376q-0.512 0.96 -0.376 2.071 0.835 -0.148 1.506 0.376a25.299 25.299 0 0 1 -7.529 0.188q2.284 -0.154 3.953 -1.694 0.339 -1.466 -0.565 -2.635m19.2 0q6.656 0.46 13.553 3.953a23.718 23.718 0 0 0 -5.459 0.188q-3.672 -2.481 -8.094 -3.2 -0.62 -0.435 0 -0.941m-20.329 0.753q2.277 0.491 0.753 2.071A41.976 41.976 0 0 1 15.059 35.953q-0.469 8.274 -0.565 0a14.381 14.381 0 0 1 -4.141 -0.753 12.198 12.198 0 0 1 1.694 -1.129q3.025 2.598 4.706 -0.941 1.831 -0.23 3.388 -0.941m19.576 1.129q4.428 -0.206 8.282 2.447 -4.717 0.47 -9.412 -0.188 0.671 -0.524 1.506 -0.376 0.16 -1.081 -0.376 -1.882m-26.729 0h1.882v1.129h-1.882zm-7.529 4.518q0.397 -1.251 1.506 -2.071l3.388 -1.882q0.565 -0.376 1.129 0 -3.318 1.561 -6.024 3.953m18.824 -4.141h15.059v1.129h-15.059zm29.741 0.753q2.412 0.642 4.141 2.447l-0.565 0.565a81.694 81.694 0 0 0 -3.576 -3.012m-27.106 0.753q4.908 -0.187 9.788 0.376l-4.894 0.376q-2.667 -0.005 -4.894 -0.753m-16.188 0.753h1.129q0.429 2.005 -0.188 4.141a1.856 1.856 0 0 1 -0.188 -1.129q-0.928 0.12 -1.694 -0.376a6.927 6.927 0 0 1 -0.188 -2.259q0.729 0.134 1.129 -0.376m47.435 3.388q-2.734 -1.905 -5.647 -0.376 -0.691 -0.214 -0.376 -3.012 4.235 -0.333 6.024 3.388m-42.165 -2.259q0.835 -0.148 1.506 0.376l-0.753 0.376q-0.685 -0.139 -0.753 -0.753m1.882 0q14.123 -0.188 28.235 0.376l-14.118 0.376q-7.258 -0.001 -14.118 -0.753m-12.047 2.259q0.236 -2.222 1.129 -0.565zm40.659 -1.506q1.01 -0.161 1.882 0.376l-0.941 0.376q-0.777 -0.104 -0.941 -0.753m-28.612 0.376h28.235v1.506q-15.064 0.188 -30.118 -0.376 1.217 -0.283 1.882 -1.129m-9.412 0.376 2.259 1.129q-0.544 1.124 -1.506 0.376 -0.638 -0.634 -0.753 -1.506m46.306 0q0.798 2.043 -1.506 1.694a1.374 1.374 0 0 1 -0.376 -0.565q1.154 -0.319 1.882 -1.129m-8.282 0.376q0.835 -0.148 1.506 0.376l-0.753 0.376q-0.685 -0.139 -0.753 -0.753m-40.659 0.376a20.706 20.706 0 0 1 1.506 2.071 4.292 4.292 0 0 0 -0.565 1.318 8.809 8.809 0 0 1 -1.694 -2.447q0.078 -0.734 0.753 -0.941m1.882 0q1.491 0.73 0 1.506 -1.374 -0.93 0 -1.506m47.812 0q1.733 0.261 0.565 1.506a3.576 3.576 0 0 0 -0.941 -0.565q0.425 -0.379 0.376 -0.941m2.635 0q0.863 0.01 0.565 0.753 -0.405 -0.307 -0.565 -0.753m-1.506 3.388q-0.023 -1.652 0.941 -3.012a4.066 4.066 0 0 1 0.941 1.129 6.739 6.739 0 0 1 -1.882 1.882m-45.176 -2.259h6.024v1.882q-3.557 -0.591 -7.153 -1.129a16.565 16.565 0 0 0 1.129 -0.753m6.4 0h28.235a12.235 12.235 0 0 1 -0.188 3.012q-2.602 1.78 -1.694 -1.129h-5.271v1.882h-13.929v-2.259h-5.271q-0.136 1.111 0.376 2.071 -1.01 0.294 -1.882 -0.376 -0.533 -1.535 -0.376 -3.2m28.612 0q3.018 -0.094 6.024 0.188a2.56 2.56 0 0 1 1.129 0.565 122.729 122.729 0 0 0 -7.153 1.129zm-38.024 0.753h1.506a4.856 4.856 0 0 1 -0.188 1.882q-1.058 0.332 -1.882 -0.753 -0.135 -0.727 0.565 -1.129m45.553 0q1.424 -0.21 2.259 0.941 -2.2 2.121 -2.259 -0.941m-48.941 0.376q3.566 3.672 8.659 5.082 17.459 4.615 35.012 0.376 5.888 -1.201 9.976 -5.459 2.202 7.245 -4.329 10.729 -7.872 3.662 -16.565 4.141 -11.46 0.96 -22.588 -1.882 -6.161 -1.333 -9.976 -6.212 -0.282 -3.383 -0.188 -6.776m5.647 1.129q1.11 0.355 2.259 0.753 2.127 -0.926 4.518 -0.753 -0.154 1.102 0.753 1.694 13.741 0.376 27.482 0 0.868 -0.627 0.753 -1.694a9.788 9.788 0 0 1 4.141 0.753q1.801 -1.669 3.012 0.376 -7.512 4.048 -15.812 3.012v1.129h-11.671v-1.129q-7.999 0.963 -15.435 -2.635 -0.636 -0.739 0 -1.506m9.412 0q1.919 -0.181 3.765 0.376l-1.882 0.376q-1.208 -0.032 -1.882 -0.753m19.2 0a22.965 22.965 0 0 1 4.141 0.188q-0.753 0.376 0 0.753a22.965 22.965 0 0 1 -4.141 0.188z"/>
                                    <path style="opacity:.212" d="M9.976 46.118q8.011 2.901 16.565 3.576 -1.183 0.314 -0.188 0.565 0.534 -0.229 0.753 -0.753l0.376 0.753q1.442 -0.718 3.2 -0.753 1.905 0.238 3.576 0 0.462 2.99 0.565 0 2.223 0.166 4.329 -0.376 0.462 2.99 0.565 0 7.052 -0.281 13.553 -3.012l0.376 0.941a60.235 60.235 0 0 0 -0.565 4.706q-5.836 3.049 -12.047 3.765l-0.376 -0.753q-0.953 0.872 -2.259 1.129l-0.376 -0.753q-0.861 0.689 -2.071 0.753 -1.209 -0.064 -2.071 -0.753 -1.056 0.702 -2.447 0.753 -1.391 -0.051 -2.447 -0.753 -0.861 0.689 -2.071 0.753 -1.209 -0.064 -2.071 -0.753l-0.376 0.753q-6.735 -0.907 -13.365 -3.576a3.576 3.576 0 0 1 -0.565 -0.941 316.988 316.988 0 0 1 -0.565 -5.271"/>
                                    <path id="mainbrush-SVG-level" class="mainBrushAnimation" style="opacity:1" fill="#0095fe" d="M26.918 17.882a71.906 71.906 0 0 1 12.8 0.753 21.082 21.082 0 0 0 3.576 -0.376 5.308 5.308 0 0 0 2.824 0.753 10.24 10.24 0 0 0 0.753 2.071 2.748 2.748 0 0 1 -0.753 1.318q-1.918 0.412 -2.259 2.259a53.835 53.835 0 0 1 -4.329 0.376 193.129 193.129 0 0 1 -8.282 -1.129A13.384 13.384 0 0 0 25.788 24.847a19.878 19.878 0 0 1 -7.153 -0.376q-0.817 -1.732 -2.635 -2.447l-0.376 -0.941a10.24 10.24 0 0 0 0.753 -2.071q1.542 0.015 2.824 -0.753 1.868 0.312 3.765 0.376 2.149 0.111 3.953 -0.753m0.753 2.635q7.051 -0.161 13.929 1.318A228.518 228.518 0 0 1 31.247 20.894 227.765 227.765 0 0 1 20.894 21.835a164.141 164.141 0 0 1 6.776 -1.318m11.671 -1.129q2.145 -0.555 4.518 -0.376v1.506a15.736 15.736 0 0 1 -4.518 -1.129m-21.082 -0.376q9.601 -0.27 0 1.506z"/>
                                    </svg>\`,
                            type: 'wear'
                        },
                        {
                            id: 'SideBrushLeft',
                    		timeId: 'SideBrushTimeLeft',
                            label: 'Sidebrush',
                            svg: \`<svg width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                    				<style> .sideBrushAnimation { transform-origin: 51% 62%; transform-box: fill-box; opacity: 1; animation: sidebrushRotate 2s infinite; }
                    					@keyframes sidebrushRotate { 0% { transform: rotate(0deg) scale(0.9); } 100% { transform: rotate(360deg) scale(1.2); } }
                    				</style>
                    				<path style="opacity:.5" d="M18.384 0.553q13.321 -0.095 19.031 11.802 1.605 3.82 1.328 7.967a1.459 1.459 90 0 0 -0.885 0.148q0.676 0.729 0.59 1.77 -1.579 11.018 -11.802 15.343 -13.306 4.268 -22.277 -6.344 -2.927 -4.28 -3.688 -9.442a3.224 3.224 90 0 1 0.885 -1.328 1.459 1.459 90 0 0 -0.885 -0.148q-0.338 -3.761 1.033 -7.376 0.295 -0.885 1.18 -1.18l0.295 0.885q0.128 -0.683 0.59 -1.18A27.529 27.529 90 0 1 2.746 15.306q0.718 -0.062 1.033 0.59a2.478 2.478 90 0 0 0.148 -1.18h4.131v1.475h23.31v-1.475h4.131a2.478 2.478 90 0 0 0.148 1.18 6.965 6.965 90 0 1 1.033 -0.885q-2.505 -8.037 -10.18 -11.507l-0.885 1.18a15.294 15.294 90 0 1 -0.443 2.803 4.8 4.8 90 0 1 -2.36 0 4.518 4.518 90 0 1 -0.443 -1.328q-0.931 2.642 -3.688 1.918 -1.497 -0.611 -1.623 -2.213a6.024 6.024 90 0 1 -0.443 1.623 4.8 4.8 90 0 1 -2.36 0 15.294 15.294 90 0 1 -0.443 -2.803l-0.885 -1.18A19.082 19.082 90 0 0 8.647 6.159l-0.295 -0.295q1.314 -0.517 0.295 -1.18 0.354 -1.165 1.475 -1.623Q14.101 1.111 18.384 0.553m-1.475 1.18q1.092 -0.502 2.36 -0.148 -1.179 0.67 -2.36 0.148m3.246 0q1.092 -0.502 2.36 -0.148 -0.338 0.418 -0.885 0.443a5.953 5.953 90 0 0 -1.475 -0.295m-6.491 1.475q1.173 -0.847 2.656 -0.738a8.918 8.918 90 0 1 -2.656 0.738m3.246 -0.885h5.606a5.459 5.459 90 0 0 0.148 1.77q2.051 0.438 0 0.885 -1.491 -2.994 -4.573 -1.623a6.4 6.4 90 0 0 -1.18 1.918 4.635 4.635 90 0 0 -1.18 -0.738q0.561 -0.137 1.033 -0.443 0.219 -0.873 0.148 -1.77m6.196 0.295q1.348 -0.3 2.656 0.59l-0.148 0.295a12.706 12.706 90 0 0 -2.508 -0.885M16.024 2.913q0.24 0.027 0.295 0.295 -1.447 1.088 -0.295 -0.295m7.081 0q0.824 0.153 0.738 0.885 -0.627 -0.256 -0.738 -0.885m3.836 0q0.824 0.153 0.738 0.885 -0.627 -0.256 -0.738 -0.885M14.253 3.504q1.107 0.005 0.148 0.59a0.718 0.718 90 0 1 -0.148 -0.59m10.327 0.295q0.255 -0.564 0.59 0 -0.208 0.426 -0.59 0M10.122 4.389q0.125 -0.349 0.443 -0.59 0.234 0.582 -0.443 0.59m8.852 -0.59q2.529 -0.268 2.36 2.065 -1.016 -1.279 -2.656 -0.738a3.365 3.365 90 0 1 -0.59 0.738l-0.295 -0.295q0.428 -1.014 1.18 -1.77m10.327 0.59q-0.676 -0.008 -0.443 -0.59 0.318 0.241 0.443 0.59m0 0q0.676 -0.032 0.885 0.59 -0.676 0.032 -0.885 -0.59m0.885 0.59q0.843 0.105 1.18 0.885 -0.843 -0.105 -1.18 -0.885M18.974 5.274q2.575 -0.208 1.475 1.918 -2.652 0.359 -1.475 -1.918m-4.131 0.295H16.024v1.475h-1.18zm8.557 0h1.18v1.475H23.4zm10.327 2.656q0.623 0.209 0.59 0.885 -0.623 -0.209 -0.59 -0.885M2.746 13.24a32.235 32.235 90 0 1 -1.18 4.131L1.271 17.224q0.506 -2.116 1.475 -3.983m2.36 1.77a9.553 9.553 90 0 1 2.36 0.148 7.388 7.388 90 0 1 -2.065 0.148 18.847 18.847 90 0 1 0 5.606q-0.679 -1.531 -0.59 -3.246a13.576 13.576 90 0 1 0.295 -2.656m10.327 0q0.813 0.062 0.295 0.59 -0.353 -0.202 -0.295 -0.59m7.967 0q1.107 0.005 0.148 0.59a0.718 0.718 90 0 1 -0.148 -0.59m8.557 0q1.305 -0.123 2.508 0.295a21.412 21.412 90 0 1 0 5.016q-0.314 0.652 -1.033 0.59 0.007 -2.695 0.59 -5.311 -1.278 0.226 -2.065 -0.59m5.311 0q0.754 1.041 0.443 2.36a5.6 5.6 90 0 1 -0.443 -2.36M3.041 16.191q0.565 0.392 0 0.885 -0.47 -0.409 0 -0.885m3.836 0q0.813 0.062 0.295 0.59 -0.353 -0.202 -0.295 -0.59m29.211 0q0.811 0.283 0.295 0.885 -0.392 -0.365 -0.295 -0.885M8.647 16.486h1.18A32.706 32.706 90 0 1 9.532 22.682a47.529 47.529 90 0 0 -0.885 -6.196m1.475 0h2.951v1.18H10.122zm3.246 0h2.951v1.18h-2.951zm3.246 0h2.656v1.18H16.614zm2.951 0H21.925v1.18H19.564zm2.951 0h2.656v1.18H22.515zm2.951 0h2.951v1.18h-2.951zm3.246 0a3.866 3.866 90 0 1 2.065 0.295l-0.443 0.885 -0.295 4.721q-0.6 0.389 -1.328 0.295zm-21.834 0.59q0.813 0.062 0.295 0.59 -0.353 -0.202 -0.295 -0.59m-3.541 7.672q-0.314 0.4 -0.885 0.295 0.071 0.752 -0.148 1.475A27.153 27.153 90 0 1 1.271 22.24q0.913 -1.531 1.033 -3.393 1.5 0.274 1.475 -1.475 0.173 2.37 0.443 4.721h0.885v2.656zM30.776 17.371q0.511 2.723 0.148 5.606 -0.491 -1.018 -0.443 -2.213 0.114 -1.703 0.295 -3.393m6.491 3.541q1.058 0.082 0.885 1.18a17.459 17.459 90 0 1 -1.033 4.131q-0.049 -1.039 -1.033 -1.328 -2.208 -0.221 -4.426 -0.148a18 18 90 0 1 -0.148 3.246 3.388 3.388 90 0 1 -1.328 1.033q-10.622 0.295 -21.244 0 -0.812 -0.221 -1.033 -1.033a11.929 11.929 90 0 1 0.148 -4.131 5.435 5.435 90 0 1 1.77 0.148q-0.951 1.554 -0.295 3.246 2.208 0.221 4.426 0.148 0.128 -1.596 -0.295 -3.098a124.235 124.235 90 0 1 12.097 0q-0.423 1.502 -0.295 3.098h4.426V24.158q1.305 -0.352 4.426 0v-2.065h0.885q0.3 -2.346 0.443 -4.721 -0.025 1.75 1.475 1.475 0.22 1.022 0.148 2.065M8.352 17.666q0.452 1.756 0.59 3.688 0.034 0.907 -0.443 1.623 -0.221 -2.651 -0.148 -5.311M1.271 17.961q0.388 -0.058 0.59 0.295Q0.591 21.192 1.271 17.961m5.901 0q0.564 0.255 0 0.59 -0.426 -0.208 0 -0.59m30.981 1.475q-0.912 -0.554 -0.295 -1.475 0.421 0.684 0.295 1.475m-22.424 -0.885q0.388 -0.058 0.59 0.295 -2.912 1.633 -6.196 0.885a1.318 1.318 90 0 1 0.59 -0.443 54.353 54.353 90 0 0 5.016 -0.738m0.885 0q1.107 0.005 0.148 0.59a0.718 0.718 90 0 1 -0.148 -0.59m5.901 0a132.706 132.706 90 0 0 5.606 0.738q0.202 0.183 0.295 0.443 -2.834 0.403 -5.606 -0.443 -0.333 -0.296 -0.295 -0.738M7.172 18.847q0.564 0.255 0 0.59 -0.426 -0.208 0 -0.59m11.212 0.295q1.909 -0.101 3.541 0.885 -1.331 0.591 -2.508 -0.295 -1.325 0.903 -2.803 0.295 0.86 -0.575 1.77 -0.885m-11.507 0.885q1.107 0.005 0.148 0.59a0.718 0.718 90 0 1 -0.148 -0.59m-2.36 0.59q0.428 0.578 1.18 0.59a9.553 9.553 90 0 0 0.148 2.36q0.95 0.271 1.918 0.59a4.988 4.988 90 0 1 -2.36 0.295V21.797h-0.885zm2.36 0.295q1.107 0.005 0.148 0.59a0.718 0.718 90 0 1 -0.148 -0.59m27.736 0q0.4 0.314 0.295 0.885 -0.585 -0.075 -1.033 0.295 0.22 0.897 -0.148 1.77a6.235 6.235 90 0 1 -0.295 -2.656q0.708 0.118 1.18 -0.295M10.122 21.502q0.505 1.094 1.77 0.885v-0.885h3.836v0.885h1.18v-0.885h4.721v0.885h1.18v-0.885h3.836v0.885h1.18q-0.097 -0.52 0.295 -0.885a2.908 2.908 90 0 1 0.295 1.77h-2.065v-1.475a14.871 14.871 90 0 0 -2.951 0.148q-0.59 0.295 0 0.59 -3.981 0.221 -7.967 0.148v-0.885H12.188V22.682H10.122zm26.26 0q0.565 0.392 0 0.885 -0.26 -0.325 0 -0.885m-29.506 0.295q0.813 0.062 0.295 0.59 -0.353 -0.202 -0.295 -0.59m5.606 0.59q0.473 -0.413 1.18 -0.295v1.18h-0.885q0.105 -0.571 -0.295 -0.885m12.392 -0.295q0.654 -0.116 1.18 0.295 -0.255 0.907 -1.18 0.885zm-22.129 0.885q0.763 0.152 0.443 0.885 -0.46 -0.329 -0.443 -0.885m6.196 0q0.52 -0.097 0.885 0.295 -0.541 0.493 -1.18 0.148 0.246 -0.17 0.295 -0.443m19.769 0a2.908 2.908 90 0 1 1.77 0.295l-0.885 0.295q-0.677 -0.062 -0.885 -0.59m-18.884 1.77h3.541v2.36H9.827zm15.933 0h3.836v2.36h-3.836zm-20.949 0.295h2.656a2.478 2.478 90 0 1 -0.148 1.18q-2.127 -0.509 -1.475 1.77 1.621 0.243 2.803 1.328 11.065 0.295 22.129 0 1.182 -1.085 2.803 -1.328 0.652 -2.28 -1.475 -1.77a2.478 2.478 90 0 1 -0.148 -1.18q1.216 -0.139 2.36 0.295 -0.197 2.019 0.885 3.836 -7.918 11.626 -21.539 7.819 -6.121 -2.211 -9.442 -7.819l1.18 -3.246q-0.492 -0.339 -0.59 -0.885m-1.77 0.295h0.885q-0.197 1.268 0.59 2.213 -1.317 0.335 -1.623 -1.033 -0.256 -0.632 0.148 -1.18m32.456 0q0.817 -0.123 1.18 0.59 -0.192 1.191 -1.18 1.77 -1.095 -0.016 -0.148 -0.59 0.219 -0.873 0.148 -1.77m-28.916 0.885q0.788 0.66 0.59 1.77h-0.885q-0.077 -0.938 0.295 -1.77m25.965 0q0.788 0.66 0.59 1.77h-0.885q-0.077 -0.938 0.295 -1.77M8.057 4.389q0.24 0.027 0.295 0.295 -1.323 2.029 -3.098 3.836 -0.472 1.371 -1.475 2.36 -0.672 -0.196 -1.033 0.59l-0.295 -0.295q2.077 -4.013 5.606 -6.786m6.491 5.901q5.018 -0.074 10.032 0.148 0.836 1.698 0.59 3.688a101.176 101.176 90 0 1 -10.917 -0.295q-0.654 -1.85 0.295 -3.541m0 0.59h10.327v2.951H14.548z"/>
                    				<path id="sidebrush-SVG-level" class="sideBrushAnimation" style="opacity:1" fill="#6cc1ff" d="M 9.648 0.912 q 0.1718 0.0677 0.192 0.288 C 10.208 3.12 10.56 5.28 10.56 6.72 c 0 0.48 0.064 1.344 0.096 2.016 q 1.0642 1.3435 0.288 2.88 a 1.8048 1.8048 90 0 1 -0.528 0.432 q 0.5813 0.1258 1.152 0.288 q 2.953 1.3603 6.144 2.064 l -0.912 0 l 0.96 0.48 L 16.8 14.88 l 0.96 0.48 a 2.2752 2.2752 90 0 0 -0.48 0 a 87.552 87.552 90 0 0 -5.28 -2.016 a 0.3504 0.3504 90 0 0 -0.048 -0 A 18.048 18.048 90 0 1 9.696 12.384 q -2.147 0.4133 -2.688 -1.728 q -0.672 0.624 -1.488 1.2 a 56.832 56.832 90 0 0 -4.128 3.744 l 0.528 -0.72 L 1.44 15.36 L 1.92 14.4 L 0.96 15.36 l 0.48 -0.96 L 0.48 14.88 l 3.84 -3.072 q 1.392 -1.056 2.496 -1.92 q 0.8462 -2.0294 2.976 -1.728 a 98.016 98.016 90 0 0 -1.296 -7.248 q 0.3696 -0.0317 0.48 0.96 L 9.12 0.96 L 9.6 1.92 L 9.6 0.96"/>
                    			</svg>\`,
                            type: 'wear'
                        },
                        {
                            id: 'FilterLeft',
                    		timeId: 'FilterTimeLeft',
                            label: 'Filter',
                            svg: \`<svg width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 64 64">
                                   <style> .filter-body { animation: filterPulse 2s ease-in-out infinite; }   @keyframes filterPulse { 0% { transform: translate(4px, 4px); opacity: 0; } 20% { opacity: 0.6; } 100% { transform: translate(0px, 0px); opacity: 1; } } </style>
                                   <path style="opacity:1" fill="#8d8d8d" d="m56.659 34.824.376-1.506q.753-.188 0-.376v-.753q.376 0 .376-.376.56.097.753-.376.56.097.753-.376a12 12 0 0 0 2.259-.753 90 90 0 0 0 .565-10.918 254 254 0 0 1-14.87 5.834q-.497.766-.376 1.694-.401.51-1.129.376-.193.473-.753.376-.133-.337-.565-.376a165 165 0 0 0-6.965 2.635q-.45.258-.376.753-.193.473-.753.376.148-.835-.376-1.506l-19.2 7.529a109 109 0 0 0 1.129 12.047 39 39 0 0 0 6.776-2.635v.753a2234 2234 0 0 0-4.141 1.694q2.122.177 4.141-.565h.753v.753a99 99 0 0 1-7.718 1.129 31.5 31.5 0 0 1-8.094-4.518 88 88 0 0 0-5.459-9.412q-.934-3.663-2.824-6.776.18-.648.753-.941a1040 1040 0 0 0 21.082-7.153q1.231-.236 2.447.188a44 44 0 0 1 3.2-.753v-1.506a819 819 0 0 0 18.824-6.024 535 535 0 0 1 15.059 5.271l.376 1.694a235 235 0 0 0-.565 10.353q-3 .642-4.141 3.388a7 7 0 0 1-1.318.753m-7.529-19.953a98 98 0 0 1 12.047 4.329 1093 1093 0 0 0-15.059 5.835 12 12 0 0 0-2.259-.753q-4.942 1.455-9.412 3.765.333.733 1.129.941a1856 1856 0 0 1-19.576 7.718 130 130 0 0 1-11.671-6.212 3121 3121 0 0 0 44.8-15.624m9.788 16.188a32 32 0 0 0-.188-4.894l-.376-.376a7 7 0 0 1-1.318.753V23.15a92 92 0 0 0-10.541 3.765q-.12-.928.376-1.694a254 254 0 0 0 14.872-5.833 90 90 0 0 1-.565 10.918 12 12 0 0 1-2.259.753M29.929 19.765q2.748.377.188 1.129a1.86 1.86 0 0 1-.188-1.129M23.153 22.4q.898-.633 1.882.188-.997.361-1.882-.188m22.212 4.894q-4.468-.117-8.471 2.259-.368-1.256-1.694-1.318a73 73 0 0 1 8.659-3.576q1.029.704 2.259.753.076 1.16-.753 1.882-.461.747-1.318.753a107 107 0 0 1-7.906 3.012q-.073-.495.376-.753a165 165 0 0 1 6.965-2.635q-.723.808-1.882.753"/>
                                   <path id="filter-SVG-level" class="filter-body" style="opacity:1" fill="#5696fe" d="M56.659 27.294v3.765q.047 2.166-.753 4.141a427 427 0 0 0-30.871 13.929v-.753q-.314-4.896-.753-9.788l.376-2.259a828 828 0 0 1 32-12.424zm-1.882-1.882a98 98 0 0 1 .565 8.659 36.3 36.3 0 0 0-.188-9.035q-.343.07-.376.376m-1.129 1.129a216 216 0 0 1-7.153 3.2 63 63 0 0 0 .753 2.447l6.4-2.824q.742-1.471 0-2.824m-9.412 3.765h1.129q.151 1.48-.376 2.824a210 210 0 0 0-7.719 3.2q-.462-1.54.188-3.012 3.572-1.224 6.776-3.012m9.412.376q.742 1.353 0 2.824l-6.4 2.824q-.721-1.431 0-2.824a64 64 0 0 0 6.4-2.824m-13.929.753q-.723.808-1.882.753.723-.808 1.882-.753m-1.882.753q-.723.808-1.882.753.723-.808 1.882-.753m-1.882.753q-.723.808-1.882.753.723-.808 1.882-.753m-1.882.753q-.723.808-1.882.753.723-.808 1.882-.753m1.129.376a37 37 0 0 1 .753 2.447 87 87 0 0 1-8.472 3.955q-.672-1.521-.188-3.012a143 143 0 0 0 7.906-3.388m-3.012.376q-.723.808-1.882.753.723-.808 1.882-.753m12.424 0q.692.368.753 1.318a3.7 3.7 0 0 1-.376 1.506 216 216 0 0 0-7.718 3.576q-.439-1.654.188-3.2a216 216 0 0 0 7.153-3.2m-14.306.753q-.723.808-1.882.753.723-.808 1.882-.753m-1.882.753q-.723.808-1.882.753.723-.808 1.882-.753m-2.259 1.129q.209 3.653.565 7.529.028 1.267.941 1.882-.796.75-1.318-.376a180 180 0 0 0-.565-7.341q.005-.964.376-1.694m9.412 1.129q.744 1.542 0 3.2a229 229 0 0 1-8.094 3.576q-.439-1.654.188-3.2a99 99 0 0 0 7.906-3.576"/>
                                   <path style="opacity:1" fill="#7291c3" d="M57.035 26.541q.097.56-.376.753v-3.388a828 828 0 0 0-32 12.424l-.376 2.259q.439 4.893.753 9.788h-.753v-1.882a138 138 0 0 1-.565-10.165 176 176 0 0 1 12.235-5.271q.56.097.753-.376a107 107 0 0 0 7.906-3.012q.56.097.753-.376.729.134 1.129-.376a92 92 0 0 1 10.541-3.765z"/>
                    			</svg>\`,
                            type: 'wear'
                        },
                        {
                            id: 'MopPadLeft',
                    		timeId: 'MopPadTimeLeft',
                            label: 'MoppPad',
                            svg: \`<svg width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                    			  <style> .MopleftAnimation { transform-origin: 50% 50%; transform-box: fill-box; opacity: 1; animation: mop1Rotate 2s infinite; } @keyframes mop1Rotate {  0%, 100%  { transform: rotate(0deg); } 50% { transform: rotate(360deg) scale(0.95); } }
                    			    .MopRightAnimation { transform-origin: 50% 50%; transform-box: fill-box; opacity: 1; animation: mop2Rotate 2s infinite; } @keyframes mop2Rotate { 0%, 100% { transform: rotate(360deg); } 50% { transform: rotate(0deg) scale(0.95); } }
                    			  </style>
                    			  <g fill="#646464">
                    			    <path opacity=".9" d="M 4.192 10 q 6.072 -10.399 19.8 -8.844 Q 36.279 4.203 38.908 16.6 a 11.2 11.2 90 0 1 0 3.432 Q 38.043 5.841 24.52 1.684 Q 18.224 0.409 12.376 3.004 l 0.264 0.264 a 1420 1420 90 0 0 -3.168 5.28 q 1.056 1.452 0 2.904 a 12 12 90 0 1 0.792 1.452 a 783 783 90 0 0 20.328 0.396 q 1.075 0.346 1.056 1.452 a 25.6 25.6 90 0 0 4.224 -0.264 v 1.32 q 2.517 0.077 1.584 2.508 q -0.891 0.342 -1.452 -0.396 a 30 30 90 0 0 -0.132 3.96 h -0.792 v 2.376 h -3.432 q 0.066 -2.512 -0.132 -5.016 a 2.5 2.5 90 0 1 -0.396 0.66 a 444 444 90 0 1 -21.648 0 a 2.5 2.5 90 0 1 -0.396 -0.66 q -0.198 2.504 -0.132 5.016 q -2.258 -0.14 -1.452 2.112 q 3.288 -3.976 8.316 -2.508 q 2.525 1.144 4.488 3.036 q 1.35 -0.754 2.376 -1.98 q 7.414 -4.038 11.484 3.3 a 9 9 90 0 0 1.584 1.32 a 10 10 90 0 0 1.584 -2.64 q 0.259 -0.474 0.396 0 q -1.453 3.433 -4.092 6.072 q -0.264 -0.264 0 -0.528 q 1.038 -1.218 1.98 -2.508 q -1.958 -1.167 -2.772 -3.3 q -6.035 -5.939 -11.748 0.396 q -1.11 0.3 -2.112 -0.264 q -5.764 -6.12 -11.484 0.132 q -0.751 2.002 -2.508 3.168 a 8.5 8.5 90 0 0 1.98 2.376 q 0.272 0.33 -0.132 0.528 q -2.383 -2.32 -3.696 -5.412 l 0.396 -1.188 a 14 14 90 0 0 1.584 2.904 q 1.213 -0.554 1.584 -1.848 a 20 20 90 0 1 0.396 -2.904 a 2.6 2.6 90 0 0 -1.584 -0.264 V 21.88 H 4.456 v -3.432 q -1.612 0.393 -1.584 -1.188 q -0.127 -1.708 1.584 -1.452 q -0.084 -0.65 0.264 -1.188 q 2.099 0.077 4.224 0.132 q -0.046 -0.785 0.528 -1.32 q -0.785 -1.943 -2.904 -1.98 q -0.73 -1.415 -2.376 -1.452 m 6.6 -6.336 a 0.64 0.64 90 0 1 0.528 0.132 a 88 88 90 0 0 -2.508 3.828 Q 6.7 7.555 5.908 9.472 a 3 3 90 0 1 -0.66 -0.528 q 2.28 -3.205 5.544 -5.28 m 9.24 1.584 q 0.611 0.317 1.32 0.264 a 4.46 4.46 90 0 1 -0.264 2.112 q -0.792 0.528 -1.584 0 a 4.46 4.46 90 0 1 -0.264 -2.112 q 0.51 0.094 0.792 -0.264 m -0.264 -2.112 q 0.32 0.71 0.396 1.584 q 0.195 -0.647 0.132 -1.32 q 2.81 0.379 1.98 3.168 q -0.331 -1.583 -1.98 -1.584 q -1.255 0.153 -2.112 1.056 q -0.358 -2.057 1.584 -2.904 m -3.432 0 h 1.056 q -0.659 1.994 -1.056 0 m 8.448 0.264 q 0.935 0.069 1.848 0.264 v 0.792 q -1.387 0.168 -1.848 -1.056 m -5.808 5.016 q 1.258 0.04 2.64 -0.132 q -1.276 0.72 -2.64 0.132 M 7.36 8.68 q 0.465 -0.087 0.792 0.264 q -0.568 0.29 -0.924 0.792 q -0.628 -0.533 0.132 -1.056 m 1.32 0.528 q 0.455 0.115 0.528 0.66 l -0.264 0.66 q -0.377 -0.613 -0.264 -1.32 M 4.984 9.472 L 9 12 L 2 10 q -1 -0 -2 0 L 0 9 L 5.908 10 z m 2.904 0 q 0.895 0.292 0.132 0.792 q -0.684 -0.338 -0.132 -0.792 m 7.392 0 h 10.032 q 0.116 1.559 -0.264 3.036 a 91 91 90 0 1 -9.768 0 q -0.515 -1.518 0 -3.036 m -8.448 0.792 l 1.584 0.396 q -1.1 1.33 -1.584 -0.396 m 2.112 1.32 q -0.313 -0.112 -0.528 -0.396 q 0.521 -0.209 0.528 0.396 m 2.112 2.112 h 2.64 v 0.792 h -2.64 z m 2.904 0 h 2.904 v 0.792 H 13.96 z m 3.168 0 h 2.64 v 0.792 h -2.64 z m 2.904 0 h 2.376 v 0.792 h -2.376 z m 2.904 0 h 2.904 v 0.792 h -2.904 z m 3.168 0 h 2.904 v 0.792 h -2.904 z m 3.168 0.528 q 0.65 -0.085 1.188 0.264 a 19 19 90 0 1 0 4.488 q -0.537 0.348 -1.188 0.264 z M 10 14.488 q 0.286 0.165 0.396 0.528 a 17 17 90 0 1 0 4.224 q -0.575 -2.303 -0.396 -4.752 m 1.584 0.264 a 19 19 90 0 1 3.168 0.132 q -1.428 0.524 -2.904 0.528 q -0.298 -0.265 -0.264 -0.66 m 5.016 0 q 0.215 0.024 0.264 0.264 q -1.64 0.758 -3.432 0.66 q 1.633 -0.473 3.168 -0.924 m 0.528 0 q 1.327 -0.065 2.64 0.132 a 5.2 5.2 90 0 1 -1.716 0.396 q -0.665 -0.042 -0.924 -0.528 m 2.904 0.264 q 1.13 -0.516 2.376 0 q -1.177 0.4 -2.376 0 m -15.048 0 q 1.867 -0.13 3.696 0.264 a 5.6 5.6 90 0 1 -2.376 0.264 v 8.184 a 8.6 8.6 90 0 1 2.112 0.132 q -1.188 0.264 -2.376 0 q -0.374 -1.077 -0.264 -2.244 h -0.792 z m 20.328 0.528 q -1.247 0.115 -2.376 -0.396 q 1.275 -0.127 2.376 0.396 m 6.6 -0.528 h 3.696 v 6.6 h -1.056 a 8.6 8.6 90 0 1 -0.132 2.112 l -0.264 -8.184 q -0.288 0.656 -0.924 0.396 l 0.528 -0.264 q -1.133 0.012 -1.848 -0.66 m -5.28 0.528 q 0.977 -0.449 2.112 -0.132 q 0.48 0.354 0 0.66 a 4.8 4.8 90 0 0 -2.112 -0.528 m -9.24 0 a 10.8 10.8 90 0 1 2.376 0.132 q -1.262 0.352 -2.508 0.66 q -0.186 -0.426 0.132 -0.792 m 2.64 0.264 q 1.104 -0.387 2.376 -0.264 a 1.3 1.3 90 0 1 -0.132 0.792 a 20 20 90 0 0 -2.244 -0.528 m -4.752 0 a 2.6 2.6 90 0 1 1.584 0.264 q -2.955 1.006 -6.072 0.66 a 198 198 90 0 0 4.488 -0.924 m 7.656 0 q 3.058 0.29 6.072 0.924 q -2.653 0.22 -5.28 -0.264 q -0.641 -0.094 -0.792 -0.66 m -19.272 0.264 q 0.486 0.259 0.528 0.924 q 0.075 0.781 -0.528 1.188 q -0.483 -0.153 -0.528 -0.66 a 14 14 90 0 1 0.528 -1.452 m 32.736 0 q 0.395 -0.034 0.66 0.264 a 7.4 7.4 90 0 0 0.396 1.32 q -0.132 0.396 -0.528 0.528 q -1 -0.888 -0.528 -2.112 m -16.632 0.264 a 30 30 90 0 0 2.112 0.924 a 17 17 90 0 1 -4.224 0 q 1.138 -0.374 2.112 -0.924 m 13.464 0.264 q 0.281 -0.358 0.792 -0.264 v 0.792 q -1.226 0.034 -0.264 -0.396 a 0.64 0.64 90 0 0 -0.528 -0.132 m -16.632 0 q 0.504 0.273 0 0.66 a 19 19 90 0 1 -4.488 0 q 2.33 -0.124 4.488 -0.66 m 0.528 0 q 1.482 -0.016 0.132 0.528 a 0.64 0.64 90 0 1 -0.132 -0.528 m 5.808 0 a 32 32 90 0 0 4.488 0.66 a 17 17 90 0 1 -4.224 0 q -0.298 -0.265 -0.264 -0.66 m -12.144 1.848 q 0.656 0.256 1.32 0.528 q 0.454 -0.125 0.66 -0.528 q 0.195 0.647 0.132 1.32 h -2.112 z m 2.904 0 q 0.777 0.177 0.264 0.792 q -0.351 -0.327 -0.264 -0.792 m 0.792 0 h 1.056 v 1.056 h -1.056 z m 3.96 0 q 2.492 -0.263 4.488 1.188 q -3.036 0.264 -6.072 0 q 0.935 -0.492 1.584 -1.188 m 5.28 0 q 0.506 0.351 0 0.792 q -0.421 -0.366 0 -0.792 m 0.792 0 h 1.056 v 1.056 H 24.52 z m 1.32 0 q 0.726 0.253 0.264 0.792 q -0.351 -0.327 -0.264 -0.792 m 0.792 0 q 0.433 0.429 1.056 0.528 q 0.616 -0.415 1.32 -0.528 v 1.32 h -2.376 z m -17.16 0.528 q 0.396 0.132 0.528 0.528 q -0.528 0 -0.528 -0.528"/>
                    			    <path d="M16.336 2.608q1.535-.248 1.452 1.32 2.266-2.417 4.752-.264 1.369 2.567-.396 4.884l-1.056.528 4.488.264q.447 1.616.132 3.3a73 73 90 0 1-10.692.132 12.7 12.7 90 0 1-.264-3.564q2.38.066 4.752-.132-1.221-.311-1.716-1.452-.627-1.708-.264-3.432-.712.502-1.452 0-1.339 1.276-2.64.132 1.312.432 2.376-.528-.302-.374-.792-.396-.796.342-1.584.396 1.07-.953 2.376-.66.405-.141.528-.528m3.696 2.64q-.281.358-.792.264a4.46 4.46 90 0 0 .264 2.112q.792.528 1.584 0a4.46 4.46 90 0 0 .264-2.112q-.709.053-1.32-.264m-.264-2.112q-1.942.849-1.584 2.904.857-.903 2.112-1.056 1.649.001 1.98 1.584.83-2.79-1.98-3.168a3.4 3.4 90 0 1-.132 1.32q-.075-.874-.396-1.584m-3.432 0q.397 1.994 1.056 0zm2.64 5.28q1.364.587 2.64-.132-1.382.173-2.64.132M15.28 9.472q-.515 1.518 0 3.036 4.884.264 9.768 0 .38-1.477.264-3.036zm9.504-6.6a5.9 5.9 90 0 1 2.112.66q.598 1.102-.66 1.452-2.216-.115-1.452-2.112m0 .528q.46 1.224 1.848 1.056v-.792a14 14 90 0 0-1.848-.264M11.848 6.832h1.056q-.013 2.187-1.32.528.144-.27.264-.528m15.84 0h1.056q-.013 2.187-1.32.528.144-.27.264-.528M1.816 9.736H.496v-.792q1.226-.034.264.396.618.083 1.056.396m0 0a2.2 2.2 90 0 1 1.056.132q-.62.302-1.056-.132M4.192 10a.64.64 90 0 1-.132.528q-.275-.37.132-.528M3.4 11.056q.236.092.264.396l-1.188 3.036q.013-1.823.924-3.432m-1.32 3.696q.236.092.264.396-.183 1.06-.66 1.98a6.3 6.3 90 0 1 .396-2.376m-.528 3.432q.425.297.132.792a1.3 1.3 90 0 1-.132-.792m36.696 1.848q.528.264 0 0M2.344 24.256q-.156-1.114-.792-1.98.139-1.229.396.132.327-.871-.396-1.452.071-.871 0-1.716.582.349.66 1.056a16 16 90 0 0 .66 3.828.64.64 90 0 1-.528.132m36.168-2.904q.157-.407.528-.132a.64.64 90 0 1-.528.132m-.264 2.64q.528.264 0 0m-35.904.264a.64.64 90 0 1-.132.528q-.275-.37.132-.528m.264.792a.64.64 90 0 1 .132-.528q.275.37-.132.528m0 0a.64.64 90 0 1-.132.528q-.275-.37.132-.528m2.904-.264q1.668 1.288-.528 1.32-.053-.813.528-1.32m28.776.264h1.32v1.056h-1.32zm3.432.528q.85.078.132.792a1.3 1.3 90 0 1-.132-.792m-35.112.528q.528.264 0 0M13.96 37.456q.024-.215.264-.264 6.018 2.105 12.012 0l.132.264q-6.212 2.096-12.408 0"/>
                    			  </g>
                    			    <path id="mopppad1-SVG-level" class="MopRightAnimation" style="opacity:.9" fill="#3498db" d="M 27.5525 20.5225 q 5.8796 -0.8692 9.4525 3.8 a 9.804 9.804 90 0 1 1.33 3.135 q 1.0269 5.9479 -3.7525 9.5475 q -5.7038 3.3402 -11.02 -0.57 Q 18.9161 32.027 21.045 25.9375 q 1.9399 -4.3044 6.5075 -5.415 m 2.185 5.605 q -0.2195 0.114 -0.475 0.095 q -0.1197 -0.2679 -0.095 -0.57 h 0.57 z m -1.235 0.19 q -0.1719 0.1045 -0.38 0.095 q -0.2042 -0.1824 -0.19 -0.475 q 0.5766 -0.2812 0.57 0.38 m 2.185 -0.38 q 0.8274 0.0712 0.19 0.57 q -0.4227 -0.1805 -0.19 -0.57 m -3.325 0.95 q -0.247 0.1055 -0.285 0.38 q -0.7153 -0.3372 -0.0475 -0.76 q 0.094 0.2603 0.3325 0.38 m 4.655 0.475 a 0.8493 0.8493 90 0 1 -0.285 -0.38 q 0.4322 -0.4493 0.665 0.1425 q -0.1387 0.2109 -0.38 0.2375 m -5.51 0.57 q -0.0693 0.2128 -0.19 0.38 q -0.6602 -0.1453 -0.1425 -0.57 q 0.208 0.0437 0.3325 0.19 m 6.175 0.665 q -0.1748 -0.2565 -0.19 -0.57 q 0.5938 -0.2128 0.57 0.475 q -0.208 -0.0095 -0.38 0.095 m -6.555 0.57 v 0.475 h -0.475 q -0.1548 -0.7011 0.475 -0.475 m 6.65 0.475 v -0.475 q 0.5595 -0.1805 0.475 0.475 z m -6.46 0.57 v 0.285 q -0.037 0.2945 -0.3325 0.38 a 6.365 6.365 90 0 1 -0.2375 -0.57 a 0.9367 0.9367 90 0 1 0.57 -0.095 m 6.27 0.19 q 0.798 0.1719 0.19 0.665 a 0.6507 0.6507 90 0 0 -0.38 -0.095 q 0.1748 -0.2565 0.19 -0.57 m -5.795 0.95 q 0.0617 0.1719 0.19 0.285 q -0.2726 0.7524 -0.57 0 q 0.1548 -0.2042 0.38 -0.285 m 5.035 0.38 q 0.7324 0.2299 0 0.57 q -0.2299 -0.1168 -0.19 -0.38 q 0.0475 -0.1425 0.19 -0.19 m -3.895 0.665 q 0.1824 0.0399 0.285 0.19 q -0.113 0.627 -0.57 0.095 q 0.0541 -0.2442 0.285 -0.285 m 2.945 0.095 a 1.9665 1.9665 90 0 1 0.095 0.475 a 0.6507 0.6507 90 0 0 -0.38 0.095 q -0.2299 -0.1168 -0.19 -0.38 q 0.1824 -0.209 0.475 -0.19 m -1.805 0.19 q 0.2375 0.19 0.475 0 v 0.475 h -0.475 z"/>
                    			    <path style="opacity:0.4" fill="#2d2d2d" d="M 28.7825 24.2775 q 4.3007 -0.0437 5.7475 3.99 q 0.6004 3.3811 -2.0425 5.5575 q -4.3339 2.5118 -7.4575 -1.3775 q -1.8363 -2.9764 0.095 -5.89 a 1.7765 1.7765 90 0 0 0.5225 -0.665 a 3.0685 3.0685 90 0 0 0.855 -0.7125 q 1.1048 -0.5833 2.28 -0.9025 m 0.855 1.9 q -0.2195 0.114 -0.475 0.095 q -0.1197 -0.2679 -0.095 -0.57 h 0.57 z m -1.235 0.19 q -0.1719 0.1045 -0.38 0.095 q -0.2042 -0.1824 -0.19 -0.475 q 0.5766 -0.2812 0.57 0.38 m 2.185 -0.38 q -0.2327 0.3895 0.19 0.57 q 0.6374 -0.4987 -0.19 -0.57 m -3.325 0.95 q -0.247 0.1055 -0.285 0.38 q -0.7153 -0.3372 -0.0475 -0.76 q 0.094 0.2603 0.3325 0.38 m 4.655 0.475 a 0.8493 0.8493 90 0 1 -0.285 -0.38 q 0.4322 -0.4493 0.665 0.1425 q -0.1387 0.2109 -0.38 0.2375 m -5.51 0.57 q -0.0693 0.2128 -0.19 0.38 q -0.6602 -0.1453 -0.1425 -0.57 q 0.208 0.0437 0.3325 0.19 m 6.175 0.665 q -0.1748 -0.2565 -0.19 -0.57 q 0.5938 -0.2128 0.57 0.475 q -0.208 -0.0095 -0.38 0.095 m -6.555 0.57 v 0.475 h -0.475 q -0.1548 -0.7011 0.475 -0.475 m 6.65 0.475 v -0.475 q 0.5595 -0.1805 0.475 0.475 z m -6.46 0.57 v 0.285 q -0.037 0.2945 -0.3325 0.38 a 6.365 6.365 90 0 1 -0.2375 -0.57 a 0.9367 0.9367 90 0 1 0.57 -0.095 m 6.27 0.19 q 0.798 0.1719 0.19 0.665 a 0.6507 0.6507 90 0 0 -0.38 -0.095 q 0.1748 -0.2565 0.19 -0.57 m -5.795 0.95 q 0.0617 0.1719 0.19 0.285 q -0.2726 0.7524 -0.57 0 q 0.1548 -0.2042 0.38 -0.285 m 5.035 0.38 q 0.7324 0.2299 0 0.57 q -0.2299 -0.1168 -0.19 -0.38 q 0.0475 -0.1425 0.19 -0.19 m -3.895 0.665 q 0.1824 0.0399 0.285 0.19 q -0.113 0.627 -0.57 0.095 q 0.0541 -0.2442 0.285 -0.285 m 2.945 0.095 a 1.9665 1.9665 90 0 1 0.095 0.475 a 0.6507 0.6507 90 0 0 -0.38 0.095 q -0.2299 -0.1168 -0.19 -0.38 q 0.1824 -0.209 0.475 -0.19 m -1.805 0.19 q 0.2375 0.19 0.475 0 v 0.475 h -0.475 z"></path>
                    			    <path id="mopppad2-SVG-level" class="MopleftAnimation" style="opacity:.9" fill="#3498db" d="M 9.5525 20.5225 q 5.8796 -0.8692 9.4525 3.8 a 9.804 9.804 90 0 1 1.33 3.135 q 1.0269 5.9479 -3.7525 9.5475 q -5.7038 3.3402 -11.02 -0.57 Q 0.9161 32.027 3.045 25.9375 q 1.9399 -4.3044 6.5075 -5.415 m 2.185 5.605 q -0.2195 0.114 -0.475 0.095 q -0.1197 -0.2679 -0.095 -0.57 h 0.57 z m -1.235 0.19 q -0.1719 0.1045 -0.38 0.095 q -0.2042 -0.1824 -0.19 -0.475 q 0.5766 -0.2812 0.57 0.38 m 2.185 -0.38 q 0.8274 0.0712 0.19 0.57 q -0.4227 -0.1805 -0.19 -0.57 m -3.325 0.95 q -0.247 0.1055 -0.285 0.38 q -0.7153 -0.3372 -0.0475 -0.76 q 0.094 0.2603 0.3325 0.38 m 4.655 0.475 a 0.8493 0.8493 90 0 1 -0.285 -0.38 q 0.4322 -0.4493 0.665 0.1425 q -0.1387 0.2109 -0.38 0.2375 m -5.51 0.57 q -0.0693 0.2128 -0.19 0.38 q -0.6602 -0.1453 -0.1425 -0.57 q 0.208 0.0437 0.3325 0.19 m 6.175 0.665 q -0.1748 -0.2565 -0.19 -0.57 q 0.5938 -0.2128 0.57 0.475 q -0.208 -0.0095 -0.38 0.095 m -6.555 0.57 v 0.475 h -0.475 q -0.1548 -0.7011 0.475 -0.475 m 6.65 0.475 v -0.475 q 0.5595 -0.1805 0.475 0.475 z m -6.46 0.57 v 0.285 q -0.037 0.2945 -0.3325 0.38 a 6.365 6.365 90 0 1 -0.2375 -0.57 a 0.9367 0.9367 90 0 1 0.57 -0.095 m 6.27 0.19 q 0.798 0.1719 0.19 0.665 a 0.6507 0.6507 90 0 0 -0.38 -0.095 q 0.1748 -0.2565 0.19 -0.57 m -5.795 0.95 q 0.0617 0.1719 0.19 0.285 q -0.2726 0.7524 -0.57 0 q 0.1548 -0.2042 0.38 -0.285 m 5.035 0.38 q 0.7324 0.2299 0 0.57 q -0.2299 -0.1168 -0.19 -0.38 q 0.0475 -0.1425 0.19 -0.19 m -3.895 0.665 q 0.1824 0.0399 0.285 0.19 q -0.113 0.627 -0.57 0.095 q 0.0541 -0.2442 0.285 -0.285 m 2.945 0.095 a 1.9665 1.9665 90 0 1 0.095 0.475 a 0.6507 0.6507 90 0 0 -0.38 0.095 q -0.2299 -0.1168 -0.19 -0.38 q 0.1824 -0.209 0.475 -0.19 m -1.805 0.19 q 0.2375 0.19 0.475 0 v 0.475 h -0.475 z"/>
									<path style="opacity:0.4" fill="#2d2d2d" d="M 10.7825 24.2775 q 4.3007 -0.0437 5.7475 3.99 q 0.6004 3.3811 -2.0425 5.5575 q -4.3339 2.5118 -7.4575 -1.3775 q -1.8363 -2.9764 0.095 -5.89 a 1.7765 1.7765 90 0 0 0.5225 -0.665 a 3.0685 3.0685 90 0 0 0.855 -0.7125 q 1.1048 -0.5833 2.28 -0.9025 m 0.855 1.9 q -0.2195 0.114 -0.475 0.095 q -0.1197 -0.2679 -0.095 -0.57 h 0.57 z m -1.235 0.19 q -0.1719 0.1045 -0.38 0.095 q -0.2042 -0.1824 -0.19 -0.475 q 0.5766 -0.2812 0.57 0.38 m 2.185 -0.38 q -0.2327 0.3895 0.19 0.57 q 0.6374 -0.4987 -0.19 -0.57 m -3.325 0.95 q -0.247 0.1055 -0.285 0.38 q -0.7153 -0.3372 -0.0475 -0.76 q 0.094 0.2603 0.3325 0.38 m 4.655 0.475 a 0.8493 0.8493 90 0 1 -0.285 -0.38 q 0.4322 -0.4493 0.665 0.1425 q -0.1387 0.2109 -0.38 0.2375 m -5.51 0.57 q -0.0693 0.2128 -0.19 0.38 q -0.6602 -0.1453 -0.1425 -0.57 q 0.208 0.0437 0.3325 0.19 m 6.175 0.665 q -0.1748 -0.2565 -0.19 -0.57 q 0.5938 -0.2128 0.57 0.475 q -0.208 -0.0095 -0.38 0.095 m -6.555 0.57 v 0.475 h -0.475 q -0.1548 -0.7011 0.475 -0.475 m 6.65 0.475 v -0.475 q 0.5595 -0.1805 0.475 0.475 z m -6.46 0.57 v 0.285 q -0.037 0.2945 -0.3325 0.38 a 6.365 6.365 90 0 1 -0.2375 -0.57 a 0.9367 0.9367 90 0 1 0.57 -0.095 m 6.27 0.19 q 0.798 0.1719 0.19 0.665 a 0.6507 0.6507 90 0 0 -0.38 -0.095 q 0.1748 -0.2565 0.19 -0.57 m -5.795 0.95 q 0.0617 0.1719 0.19 0.285 q -0.2726 0.7524 -0.57 0 q 0.1548 -0.2042 0.38 -0.285 m 5.035 0.38 q 0.7324 0.2299 0 0.57 q -0.2299 -0.1168 -0.19 -0.38 q 0.0475 -0.1425 0.19 -0.19 m -3.895 0.665 q 0.1824 0.0399 0.285 0.19 q -0.113 0.627 -0.57 0.095 q 0.0541 -0.2442 0.285 -0.285 m 2.945 0.095 a 1.9665 1.9665 90 0 1 0.095 0.475 a 0.6507 0.6507 90 0 0 -0.38 0.095 q -0.2299 -0.1168 -0.19 -0.38 q 0.1824 -0.209 0.475 -0.19 m -1.805 0.19 q 0.2375 0.19 0.475 0 v 0.475 h -0.475 z"></path>
                    			</svg>\`,
                            type: 'wear'
                        },
                        {
                            id: 'DetergentLeft',
                    		timeId: 'DetergentTimeLeft',
                            label: 'Detergent',
                            svg: \`<svg width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                                    <style> .Detergent { animation: detergentPulse 2s ease-in-out infinite; }  @keyframes detergentPulse { 0%, 100% { transform: translate(0px, 5px); opacity: 0.5; } 50% { transform: translate(0px, 6px); opacity: 1; } } </style>
                                    <path id="detergent-SVG-level" class="Detergent" fill="#5ebdff" opacity=".6" d="M13 15 16 15 19 14 30 10 23 9 18 10 12 12 9 13M9 13 11 14 13 15 16 15l14-5L30 17 30 22 30 25 29 26v0L24 29 20 32C19 32 19 33 17 32.5L15 32 12 31 9 30 9 26z"> </path>
                                    <path style="opacity:1" fill="#000000" d="M29.675 3.063q0.492 0.281 0.61 0.845 0.094 13.516 0 27.032 -0.157 0.694 -0.704 1.126v-0.188q0.344 -0.416 0.516 -0.939 0.094 -12.906 0 -25.811 -0.349 0.327 -0.798 0.469 -0.094 0 -0.094 -0.094 0.504 -0.241 0.892 -0.657 0.262 -1.019 -0.516 -1.689 0 -0.094 0.094 -0.094m-0.469 2.44q0 0.094 0.094 0.094a581.722 581.722 90 0 1 -1.877 1.22 51.333 51.333 90 0 0 -0.141 3.097q-0.1 1.521 -1.267 2.487a45.5 45.5 90 0 1 -3.003 1.783q-0.889 0.099 -1.079 -0.798l-0.094 -3.191a46.833 46.833 90 0 0 -1.736 1.032v-0.188a261.5 261.5 90 0 0 1.783 -1.126q-0.097 -1.368 -1.361 -1.877a101.278 101.278 90 0 1 -2.487 1.549 2.233 2.233 90 0 1 -0.751 0.141 162.944 162.944 90 0 1 -6.664 -2.018q-0.458 -0.157 -0.751 -0.516a167.944 167.944 90 0 0 7.509 2.44 33.222 33.222 90 0 0 2.91 -1.643q-0.744 -0.477 -0.282 -1.22a45.611 45.611 90 0 1 3.379 -1.971q1.22 -0.263 2.44 -0.188l2.253 -1.314q0.272 -0.19 0.375 -0.516 0.188 0.235 0 0.469a44.611 44.611 90 0 0 -2.346 1.502q1.158 0.578 1.267 1.877a56.5 56.5 90 0 1 1.83 -1.126M24.325 4.753q1.472 -0.192 2.487 0.845a1.922 1.922 90 0 1 0.282 0.751q0.094 1.83 0 3.661 -0.16 1.14 -0.892 2.018a26.944 26.944 90 0 1 -3.426 2.018q-0.782 -0.268 -0.751 -1.126a44.889 44.889 90 0 0 -0.188 -3.942q-0.532 -0.914 -1.549 -1.267 -0.49 -0.381 -0.094 -0.845a40.444 40.444 90 0 1 3.191 -1.877 12.667 12.667 90 0 0 0.939 -0.235m-5.444 0a5.239 5.239 90 0 1 1.502 0.141q0.629 0.674 -0.282 0.939 -0.81 0.12 -1.596 -0.094 -0.364 -0.215 -0.235 -0.61 0.283 -0.246 0.61 -0.376m0 0.188a4.311 4.311 90 0 1 1.408 0.141q0.389 0.408 -0.188 0.563a3.667 3.667 90 0 0 -0.657 0.141 3.667 3.667 90 0 0 -0.657 -0.141q-0.757 -0.443 0.094 -0.704m10.794 -1.877q-0.094 0 -0.094 0.094 -1.067 -0.568 -2.253 -0.892l-4.881 -1.502q-1.049 -0.308 -2.065 0.094a67 67 90 0 0 -2.91 1.689Q16.7 3.133 16.817 4.096q0.53 -0.03 0.939 -0.375 0.171 0.109 0 0.235a51.278 51.278 90 0 0 -2.534 1.502 4.6 4.6 90 0 1 -1.126 0.141 11.944 11.944 90 0 0 -1.502 -0.047 29.556 29.556 90 0 0 -2.722 1.643l-0.375 0.094q-0.094 0 -0.094 -0.094a4834.056 4834.056 90 0 1 2.91 -1.736q0.915 -0.241 1.83 0.047 1.379 -0.22 2.44 -1.126 -0.147 -1.157 0.704 -1.924a27.389 27.389 90 0 1 3.379 -1.877q1.089 -0.269 2.159 0.094l6.007 1.877q0.518 0.123 0.845 0.516M9.402 7.193q0 0.094 0.094 0.094 -0.754 0.615 -0.845 1.596 0.098 0.497 0.563 0.704a206.667 206.667 90 0 0 6.664 2.159 6.478 6.478 90 0 0 1.877 0.235q-0.392 0.138 -0.845 0.094a3.167 3.167 90 0 1 -1.032 -0.141 389.222 389.222 90 0 1 -6.476 -2.065 2.667 2.667 90 0 1 -0.704 -0.422q-0.07 1.172 -0.047 2.346h-0.094q-0.023 -1.784 0.047 -3.567 0.218 -0.663 0.798 -1.032m10.7 3.848v0.188a2.911 2.911 90 0 1 -0.422 0.282 128.5 128.5 90 0 0 0 6.946q0.136 -0.559 0.61 -0.892a6.944 6.944 90 0 1 1.173 -0.61q0.178 0.036 0.282 0.188a20.611 20.611 90 0 1 0.094 3.848q-0.079 0.511 -0.422 0.892 0.203 0.053 0.282 0.235 -0.094 0 -0.094 0.094a4.111 4.111 90 0 1 -0.188 -0.094 10.7 10.7 90 0 0 -1.361 0.939 6.806 6.806 90 0 0 -0.375 1.032q-0.07 3.754 -0.047 7.509 0 0.094 -0.094 0.094 -0.028 -9.997 -0.188 -19.992 -1.188 0.558 -2.44 0.375 0.452 0.044 0.845 -0.094 1.284 -0.196 2.346 -0.939m1.22 6.101q0.269 0.01 0.329 0.282 0.094 1.83 0 3.661 -0.085 0.429 -0.422 0.704a13.167 13.167 90 0 1 -1.126 0.704 0.681 0.681 90 0 1 -0.235 -0.188 39.444 39.444 90 0 1 0 -3.848q0.145 -0.428 0.516 -0.704a7.056 7.056 90 0 0 0.939 -0.61m-1.689 5.256a2.556 2.556 90 0 0 0.469 0.329q-0.337 0.275 -0.422 0.704a5.722 5.722 90 0 1 -0.047 -1.032M8.557 11.792h0.094q0.123 11.756 0.235 23.559 0.158 0.741 0.798 1.126 0 0.094 -0.094 0.094 -0.826 -0.382 -0.892 -1.314a3237.5 3237.5 90 0 1 -0.141 -23.465m13.14 10.325q0.102 0.059 0.141 0.188 0.117 7.139 -0.047 14.267 0.064 0.112 0.188 0.094 0 0.094 0.094 0.094 -0.323 0.303 -0.751 0.469 0 -0.094 -0.094 -0.094a6 6 90 0 0 0.422 -0.751q0.117 -7.096 -0.047 -14.173 0 -0.094 0.094 -0.094m-2.065 9.48q0.094 2.511 0.188 5.068l1.408 -0.892q0.16 -0.106 0.282 0.047 -0.837 0.629 -1.783 1.032a21 21 90 0 1 -0.047 1.22 13.167 13.167 90 0 1 1.549 -0.939q0.094 0 0.094 0.094a17.556 17.556 90 0 1 -0.235 1.408q-1.233 0.894 -2.628 0.282 -0.731 0.278 -1.455 0.094 0.182 0.033 0.282 -0.094 1.022 0.049 1.877 -0.516 0.256 -0.253 0.329 -0.61 0.07 -3.05 0.047 -6.101 0.094 0 0.094 -0.094m1.22 5.913q0.178 0.143 0.188 0.422 0.05 0.451 -0.282 0.751 -0.95 0.5 -1.971 0.188a51.444 51.444 90 0 0 2.065 -1.361m8.729 -5.632v0.188a292.278 292.278 90 0 1 -7.509 4.693q-0.094 0 -0.094 -0.094a463.944 463.944 90 0 1 7.603 -4.787m-19.898 4.599a285.444 285.444 90 0 0 6.758 2.3 6.667 6.667 90 0 0 0.845 0.141q-0.1 0.127 -0.282 0.094a133.833 133.833 90 0 1 -7.133 -2.206q-0.203 -0.053 -0.282 -0.235 0.094 0 0.094 -0.094"/>
                    			</svg>\`,
                            type: 'consumable'
                        },
                        {
                            id: 'SensorLeft',
                    		timeId: 'SensorTimeLeft',
                            label: 'Sensor',
                            svg: \`<svg width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                                    <style> .Sensorpath { animation: blinkSensorPath 1.5s infinite; animation-delay: calc(var(--order) * 0.2s); transition: fill 0.3s ease; }
                                    @keyframes blinkSensorPath {  0%, 100% { opacity: 1; }  50% { opacity: 0.2; } }
                                    </style>
                                    <path style="opacity:1" fill="#8d8d8d" d="m32.9 27.1 -0.4 -0.6q-0.1 -0.3 -0.4 -0.4v-1.2q-0.76 0.072 -1 -0.6 0 -0.2 0.2 -0.2 0.085 0.237 0.3 0.4 0.19 -0.917 -0.1 -1.8v-0.4q-1.529 -5.454 -6.7 -7.8 -0.823 1.213 -0.9 2.7 -1.281 0.397 -1.9 -0.7 -0.898 1.759 -2.7 0.9 -1.726 -1.841 0.4 -3.2 1.904 -0.372 2.5 1.5a1.396 1.396 0 0 1 0.7 -0.5 2.28 2.28 0 0 1 -0.7 -0.3 3.7 3.7 0 0 1 -0.1 -1.2h-3.6a3.68 3.68 0 0 1 -0.1 1.2 2.28 2.28 0 0 1 -0.7 0.3q0.275 0.112 0.5 0.3 0.149 0.895 0.1 1.8 -0.884 0.083 -1.7 -0.2 0.058 -1.456 -0.8 -2.6a19.4 19.4 0 0 0 -2.8 1.8 4.08 4.08 0 0 1 -0.3 1.1q0.48 0.082 0.9 0.3 0.461 0.992 0.2 2l2.4 2q0.145 0.284 0.1 0.6 -1.739 -0.782 -3.1 -2.2 -0.852 0.601 -1.9 0.3 -0.55 -0.15 -0.7 -0.7 -0.875 0.755 -1.3 1.8 -0.2 0 -0.2 -0.2 0.461 -1.644 -0.6 -0.4v-0.2q-0.1 -0.4 -0.2 0h-0.6q-0.066 -0.352 0.2 -0.6a3.8 3.8 0 0 0 1 -0.6q1.357 -2.613 3.7 -4.4 0.204 -0.609 0.2 -1.2 -0.43 0.582 -1.1 0.8h-0.2a11.5 11.5 0 0 0 1.8 -1.8v0.4q-0.033 0.185 -0.2 0.3 0.44 0.329 0.5 0.9 2.968 -1.905 6.5 -1.8v-2.8h5.2q0.241 -6.291 6.5 -6.8 5.96 0.41 6.5 6.4 -1.231 7.569 -8.8 6.1 -3.73 -1.51 -4.2 -5.5h-5q-0.089 1.28 0.2 2.5 10.944 0.944 12.6 11.8a3.84 3.84 0 0 1 -0.4 1.3q-0.269 -0.302 -0.4 0 0.706 0.524 0.6 1.4m3.4 -19.6q0.218 -0.804 0.5 -1.6 0.195 0.963 -0.5 1.6m-8.2 -3q5.141 1.536 -0.1 3 -1.012 -0.111 -1.7 -0.8 0.585 -1.382 1.8 -2.2m5.6 -0.8q1.814 0.412 2.8 2 -1.25 3.9 -5.2 5.1a19.08 19.08 0 0 1 -5.4 0.9l-0.4 -2.2q0.003 -1.459 1.2 -0.7 2.113 0.384 4 -0.6 0.668 -0.486 0.8 -1.3 -0.276 -0.74 -0.5 -1.4 1.485 -0.741 2.7 -1.8m-3 -0.4q1.43 -0.093 2.8 0.3a29.8 29.8 0 0 1 -2.8 1.7q-0.865 -0.783 -2 -1.1 0.961 -0.601 2 -0.9m0 3.2q0.553 0.211 0.3 0.8a3.34 3.34 0 0 1 -0.8 0.8q-0.15 -0.55 -0.7 -0.7 0.782 -0.238 1.2 -0.9m6.6 0.8q0.74 3.776 -2.6 5.9 -2.658 1.753 -5.8 1.8 -1.485 -0.785 -2.4 -2.2 5.641 -0.079 9.9 -3.7 0.618 -0.836 0.9 -1.8m-11.4 0.2q1.805 1.022 3.7 0.2 0.185 0.285 -0.1 0.5 -1.5 0.6 -3 0 -0.578 -0.127 -0.6 -0.7m10 0.6q0.022 0.458 -0.4 0.6 -0.022 -0.458 0.4 -0.6m1.8 1.2q0.091 5.072 -5 6.3 -1.417 0.187 -2.8 -0.2 4.521 -0.733 7.3 -4.3a3.98 3.98 0 0 0 0.5 -1.8m-2.4 0.2q-0.142 0.422 -0.6 0.4 0.142 -0.422 0.6 -0.4m-1.2 0.8q-0.142 0.422 -0.6 0.4 0.142 -0.422 0.6 -0.4m-1 0.6q-0.384 0.429 -1 0.4 0.384 -0.429 1 -0.4m-2.2 0.8q-2.189 0.864 -4.6 0.7a127.4 127.4 0 0 0 4.6 -0.7m-4.6 2.8q-0.397 -0.051 -0.7 0.2 -2.215 -1.566 -4.9 -1.3a0.89 0.89 0 0 0 -0.4 -0.3q-0.931 0.661 -2 0.2a71 71 0 0 0 -4 1.2q4.535 -2.504 9.6 -1.1 1.294 0.412 2.4 1.1m-8.6 -0.8q0.842 0.464 0.2 1.1 -1.166 0.783 -1.8 -0.4a8.48 8.48 0 0 1 1.6 -0.7m4.8 0a17.6 17.6 0 0 0 1.8 0.4q0.175 0.828 -0.6 1 -1.554 -0.044 -1.2 -1.4m-8.2 0.8q0.066 0.352 -0.2 0.6a2.188 2.188 0 0 0 -0.9 0.6q0.045 -0.998 1.1 -1.2m12 0q2.571 1.371 4.2 3.8 -1.397 -0.941 -2.6 -2.3 -1.164 -0.42 -1.6 -1.5m-6.4 0.2q1.749 -0.102 1.5 1.6 -0.089 -1.009 -1.1 -0.8 -0.817 -0.136 -1.1 0.6 -0.127 -0.946 0.7 -1.4m0 1q1.545 0.046 0.8 1.3 -1.597 0.054 -0.8 -1.3m-10.4 3.6q0.183 -0.58 0.6 -1 0.875 -1.327 2.1 -2.4 0.221 1.427 -1.2 1.8a21.2 21.2 0 0 0 -0.5 1.3 8.6 8.6 0 0 1 -1 0.3m7.6 -3.4h0.8v0.8h-1q-0.02 -0.438 0.2 -0.8m5.6 0h0.8v0.8h-0.8zm-10 2q0.388 -0.343 0.7 0.2 0.242 0.624 -0.1 1.2 -0.142 -0.815 -0.6 -1.4m-1 0.2a0.486 0.486 0 0 1 0.4 0.1 1.396 1.396 0 0 0 -0.5 0.7q-0.476 -0.404 0.1 -0.8m18.8 0.2q1.739 2.412 2.2 5.4h-0.6q-0.181 -2.394 -1.5 -4.4a2.58 2.58 0 0 1 -0.1 -1m-18.4 0.2q0.382 0.173 0 0.4 -0.289 -0.141 0 -0.4m-1 1q0.705 0.565 1.5 0.2l0.3 0.3q-1.219 0.721 -1.8 -0.5m6 -0.2q3.202 -0.05 6.4 0.1 0.335 0.922 0.1 1.9a35.74 35.74 0 0 1 -6.5 0.1q-0.389 -1.05 0 -2.1m15.2 4.8q0.358 0.141 0.4 0.6l-0.1 0.6q-0.396 -0.525 -0.3 -1.2m0.4 -16.4q1.472 0.516 0 1.3l-2.2 1.1q-0.915 -0.149 -0.6 -0.9a29 29 0 0 1 2.8 -1.5m-8.2 1.6q0.308 0.119 0.1 0.4a0.486 0.486 0 0 1 -0.1 -0.4m-9.8 7.4q1.338 0.164 0.3 1 -0.753 -0.346 -0.3 -1m10.6 0q1.365 0.13 0.3 1 -0.753 -0.346 -0.3 -1m-15.2 1.6q0.742 0.134 0.1 0.6a0.986 0.986 0 0 1 -0.1 -0.6m6.6 0.8q3.601 -0.05 7.2 0.1 0.338 1.123 0.1 2.3a45 45 0 0 1 -7.3 0.1q-0.391 -1.25 0 -2.5m0.4 0.2q-0.389 1.05 0 2.1 3.273 0.246 6.5 -0.1 0.235 -0.978 -0.1 -1.9a102.6 102.6 0 0 0 -6.4 -0.1m-3.8 -6v-0.4q-1.108 -0.574 -2.4 -0.3 -1.379 0.997 -3 0.9a0.73 0.73 0 0 1 0.2 -0.3 11 11 0 0 0 1.8 -0.8q-3.381 -0.724 -6.2 -2.6a9.04 9.04 0 0 1 -1.5 -1.7q-0.404 6.546 6.1 7.4a9.42 9.42 0 0 0 3.2 -0.8h0.2q-2.075 1.334 -4.6 1v6.4q0.493 0.064 0.9 -0.2l0.3 -1.2h0.2v0.2l-0.6 2.8h0.6q0.025 -1.301 0.6 -2.4 0 0.2 0.2 0.2 -0.461 0.615 0.2 1a2.28 2.28 0 0 0 0.4 -0.5 8.5 8.5 0 0 1 2.6 0q0.272 0.51 0.2 1.1a80.8 80.8 0 0 1 4.8 -0.3q-0.264 -0.407 -0.2 -0.9 1.237 0.067 0.4 0.9 2.6 0.2 5.2 0 -0.837 -0.833 0.4 -0.9 0.064 0.493 -0.2 0.9a23.48 23.48 0 0 0 4.8 0.3v-1a5.7 5.7 0 0 0 1.9 -0.2q0.748 0.099 1.3 0.6 0.205 -0.109 0.4 -0.2v0.4q-0.414 0.139 -0.4 0.6a68.8 68.8 0 0 1 0.2 0.8q-0.2 0 -0.2 0.2 -0.363 1.235 -0.4 2.6 -1.07 0.078 -0.8 1.2h0.8q0.13 -0.8 0.3 -1.6 0.433 -0.497 1.1 -0.4a23.8 23.8 0 0 1 -0.4 2.7 1.9 1.9 0 0 1 0.3 0.5 7 7 0 0 0 0.5 -2.8l0.4 0.6q-2.838 11.824 -15 10.7 -8.788 -2.072 -10.2 -11 0.1 -0.652 0.6 -1.1 -0.131 -0.302 -0.4 0 -0.718 -1.645 0 -3.3a2.58 2.58 0 0 0 -1 -0.1q0.05 -3.301 -0.1 -6.6 -5.872 -2.042 -4.8 -8.2Q3.997 2.375 9.5 3 15.14 4.625 14.6 10.5q-0.258 1.614 -1.3 2.8m-4.2 -4.6a64.4 64.4 0 0 0 5.4 0.5q-2.794 0.308 -5.4 -0.5m-4 -1q4.459 2.061 9.4 2a8.48 8.48 0 0 1 -0.8 2.4q-4.542 0.502 -8.5 -1.8a17 17 0 0 1 -0.1 -2.6m0.6 -0.2q0.822 0.062 1.4 0.6 -0.822 -0.062 -1.4 -0.6m-2.8 -1.4q0.776 0.738 1.8 1a9.98 9.98 0 0 1 -0.2 2.8q-1.293 -0.743 -2.1 -2 0.062 -0.932 0.5 -1.8m10 -0.4q0.299 -0.026 0.5 0.2 0.781 1.192 0.9 2.6 -2.014 0.041 -4 -0.3 -0.987 -0.076 -1.8 -0.6 1.019 -0.575 2.2 -0.6 1.119 -0.658 2.2 -1.3m-5.6 -2.6q3.352 -0.221 5.6 2.2 -2.411 1.91 -5.4 2.1 -2.11 -0.754 -3.6 -2.4 1.46 -1.429 3.4 -1.9m3.2 19.2a6.5 6.5 0 0 1 1.6 0.1 3.7 3.7 0 0 1 -1.2 0.1 10.86 10.86 0 0 1 0 3.6q-0.471 -0.364 -0.5 -1 -0.232 -1.426 0.1 -2.8m18 0.2q0.819 -0.395 1.7 0a13.44 13.44 0 0 1 -0.1 3.6h-0.6q0.001 -1.807 0.2 -3.6zm-19.4 0.2q0.727 0.812 0 1.8 -0.303 -0.892 0 -1.8m2.2 0.6q0.551 0.042 0.2 0.4 -0.239 -0.137 -0.2 -0.4m1.6 0.2q0.32 -0.28 0.8 -0.2 0.05 2.003 -0.1 4 -0.387 -1.748 -0.4 -3.6 -0.115 -0.167 -0.3 -0.2m1.2 -0.2h1.8v0.6h-1.8zm2 0h2v0.6h-2zm2.2 0h1.6v0.6h-1.6zm1.8 0h1.8v0.6h-1.8zm2 0h1.8v0.6h-1.8zm2.2 0h1.8v0.6h-1.8zm2 0q0.707 -0.049 1.4 0.1l-0.3 0.3 -0.2 3.4q-0.407 0.264 -0.9 0.2zm-15 0.6q0.551 0.042 0.2 0.4 -0.239 -0.137 -0.2 -0.4m1.4 0q0.436 0.965 0.4 2.1 0.033 0.81 -0.3 1.5 -0.15 -1.797 -0.1 -3.6m15 0q0.346 1.746 0.1 3.6 -0.334 -0.741 -0.3 -1.6a17.6 17.6 0 0 1 0.2 -2m-19.8 0.2q0.743 0.486 0.1 1.2a3.68 3.68 0 0 1 -0.1 -1.2m0.6 2q-0.049 -0.707 0.1 -1.4 0.581 0.408 1 -0.2a34.4 34.4 0 0 1 0.3 2.4q1.07 0.078 0.8 1.2h-0.8a33.6 33.6 0 0 0 -0.3 -1.6q-0.433 -0.497 -1.1 -0.4m2.8 -1.6q0.551 0.042 0.2 0.4 -0.239 -0.137 -0.2 -0.4m6.6 0q0.382 0.173 0 0.4 -1.85 0.759 -3.8 0.4a0.892 0.892 0 0 1 0.4 -0.3 36.8 36.8 0 0 0 3.4 -0.5m0.4 0q0.75 0.003 0.1 0.4a0.486 0.486 0 0 1 -0.1 -0.4m3 0.2q0.266 -0.383 0.6 0 -0.22 0.176 -0.6 0m0.8 0.2q0.388 -0.197 0.9 -0.2l2.7 0.3a0.892 0.892 0 0 1 0.4 0.3q-2.043 0.262 -4 -0.4m-10.8 0.2q0.551 0.042 0.2 0.4 -0.239 -0.137 -0.2 -0.4m7.2 0a22.6 22.6 0 0 1 3 0.1 0.892 0.892 0 0 1 0.4 0.3q-1.002 0.412 -1.9 -0.2 -0.798 0.6 -1.7 0.2 0.109 -0.205 0.2 -0.4m-8.4 0.6q0.271 0.213 0.2 0.6h0.8v1.6a3.7 3.7 0 0 1 1.2 0.1q-0.693 0.149 -1.4 0.1v-1.4q-1.023 0.035 -0.8 -1m1.2 0q0.237 0.085 0.4 0.3 -0.395 0.158 -0.4 -0.3m19 0q0.532 0.953 -0.6 1v1.4a5 5 0 0 1 -1.4 -0.1 3.7 3.7 0 0 1 1.2 -0.1v-1.6h0.8zm-21.8 0.4q0.151 1.255 0.4 2.5a2.2 2.2 0 0 1 -0.2 0.7q-0.762 -1.384 -0.5 -3 0.115 -0.167 0.3 -0.2m2.8 0.2q0.237 0.085 0.4 0.3 -0.395 0.158 -0.4 -0.3m-2.4 0.2q0.375 0.023 0.5 0.4 0.227 0.681 -0.1 1.3l22.2 0.2q-11.2 0.15 -22.4 0.1zm6.2 0a14.48 14.48 0 0 1 2.4 0.1q0.335 0.568 1 0.5v-0.6h3v0.6h1v-0.6h2.4v0.6q0.597 0.052 1 -0.4 0.286 0.464 0.2 1h-1.4v-1h-2v0.6h-5.4v-0.6h-2v0.6h-1.2a0.986 0.986 0 0 1 0.1 -0.6q0.315 0.482 0.9 0.4zm16.2 0q0.345 0.087 0.4 0.5a2.2 2.2 0 0 1 -0.4 1.1q-0.334 -0.797 0 -1.6m-2.4 0.2q0.75 0.003 0.1 0.4a0.486 0.486 0 0 1 -0.1 -0.4m-17.6 0.2q0.237 0.085 0.4 0.3 -0.395 0.158 -0.4 -0.3m4.4 0h0.6v0.8h-0.6zm8 0h0.8v0.8h-0.8zm-14 1.8q0.213 0.718 0.4 1.5a1.9 1.9 0 0 0 -0.5 0.3q-0.512 -0.723 -0.5 -1.6 0.387 0.071 0.6 -0.2m0.8 0q9.802 -0.1 19.6 0.2l-0.2 0.4q0.242 1.129 0.8 2.1 -6.294 8.799 -16.2 4.4 -2.743 -1.593 -4.4 -4.3l0.4 -0.6a17 17 0 0 0 0 -2.2m20.2 0q1.646 0.442 0.3 1.8 -0.418 -0.833 -0.3 -1.8m-19.2 0.8q0.635 0.476 0.2 1.2 -0.672 -0.49 -0.2 -1.2m17.4 0q0.635 0.476 0.2 1.2 -0.672 -0.49 -0.2 -1.2m-17.6 -0.2q1.428 0.157 0.8 1.5 -0.49 0.148 -1 0.1 -0.066 -0.834 0.2 -1.6m0.2 0.2q-0.472 0.71 0.2 1.2 0.435 -0.724 -0.2 -1.2m17.2 -0.2h0.8q0.703 1.597 -1 1.6 -0.066 -0.834 0.2 -1.6m0.2 0.2q-0.472 0.71 0.2 1.2 0.435 -0.724 -0.2 -1.2m-12 6.2q1.098 -0.045 0.6 0.9 -0.285 0.185 -0.5 -0.1a1.688 1.688 0 0 1 -0.1 -0.8m6.2 0q1.098 -0.045 0.6 0.9 -0.285 0.185 -0.5 -0.1a1.68 1.68 0 0 1 -0.1 -0.8"/>
                    				<g id="sensor-SVG-level">
                    				    <path class="Sensorpath" style="--order: 1;" d="M30.5 5.7q0.675 0.695 0.8 1.7 -0.473 0.623 -1.2 0.9 -0.414 -0.15 -0.4 -0.6a6.24 6.24 0 0 1 0.7 -1.2 1.68 1.68 0 0 0 0.1 -0.8"/>
                                	    <path class="Sensorpath" style="--order: 2;" style="opacity:1" fill="#cee9ff" d="M30.7 6.7q0.322 0.225 0.1 0.6l-0.6 0.6q-0.2 -0.3 0 -0.6a2.1 2.1 0 0 0 0.5 -0.6"/>
                                	    <path class="Sensorpath" style="--order: 3;" d="M7.3 8.5q2.17 0.232 1.5 2.4 -1.804 0.919 -1.9 -1.2 0.033 -0.664 0.4 -1.2"/>
                                	    <path class="Sensorpath" style="--order: 4;" style="opacity:1" fill="#cae7ff" d="M7.3 8.9q0.667 -0.097 1.1 0.4 0.149 0.794 0.1 1.6 -0.667 0.097 -1.1 -0.4a6.48 6.48 0 0 1 -0.1 -1.6"/>
                                	    <path class="Sensorpath" style="--order: 5;" d="M36.3 8.7h0.6q0.524 1.883 -0.4 3.6 -0.392 -0.424 -0.5 -1a5.36 5.36 0 0 1 -0.7 1.5 11.86 11.86 0 0 1 -2.6 1.3q-0.344 -0.095 -0.5 -0.4 -0.245 -1.039 0.2 -2 0.7 -0.3 1 -1 0.452 0.31 0.9 -0.1 0.523 -0.333 0.8 -0.9 0.665 0.427 0.9 1.2 0.072 -1.126 0.3 -2.2"/>
                                	    <path class="Sensorpath" style="--order: 6;" style="opacity:1" fill="#c2e4ff" d="M36.5 8.9q0.414 1.181 -0.1 2.4a5.64 5.64 0 0 1 0.1 -2.4"/>
                                	    <path class="Sensorpath" style="--order: 7;" style="opacity:1" fill="#d3ebff" d="M35.3 10.5q0.206 1.136 -0.6 1.9l-1.9 1.1a5 5 0 0 1 -0.1 -1.4q0.136 -0.287 0.4 -0.5z"/>
                                	    <path class="Sensorpath" style="--order: 8;" style="opacity:1" fill="#aedbff" d="M32.7 12.1q-0.049 0.707 0.1 1.4l1.9 -1.1q0.806 -0.764 0.6 -1.9 0.403 0.681 0 1.8 -1.164 1.182 -2.8 1.4 -0.092 -0.866 0.2 -1.6"/>
                                	    <path class="Sensorpath" style="--order: 9;" d="M30.3 12.1q0.59 -0.072 1.1 0.2a6.1 6.1 0 0 1 0 2.2q-0.725 0.654 -1.6 0.2a5.04 5.04 0 0 1 0 -2q0.209 -0.357 0.5 -0.6"/>
                                	    <path class="Sensorpath" style="--order: 10;" style="opacity:1" fill="#9cd4ff" d="M30.5 12.5q0.266 -0.383 0.6 0 0.418 1.022 -0.1 2 -0.387 0.387 -0.7 0 0.299 0.026 0.5 -0.2l0.1 -0.9q-0.021 -0.596 -0.4 -0.9"/>
                                	    <path class="Sensorpath" style="--order: 11;" style="opacity:1" fill="#d3ebff" d="M30.5 12.5q0.379 0.304 0.4 0.9l-0.1 0.9q-0.201 0.226 -0.5 0.2 -0.341 -0.841 -0.1 -1.8 0.115 -0.167 0.3 -0.2"/>
                                	    <path class="Sensorpath" style="--order: 12;" d="M21.7 13.7q0.018 -0.163 0.2 -0.2a38.8 38.8 0 0 0 2.6 0.8q0.091 0.82 -0.7 1a6.86 6.86 0 0 1 -1.5 -0.6q-0.137 -0.629 -0.6 -1"/>
                                	    <path class="Sensorpath" style="--order: 13;" style="opacity:1" fill="#cbe8ff" d="M22.5 14.1q0.795 0.297 1.6 0.6 -0.701 0.304 -1.4 -0.1 -0.226 -0.201 -0.2 -0.5"/>
                                	    <path class="Sensorpath" style="--order: 14;" d="M17.9 13.7q1.059 0.333 0.2 1.1 -1.248 0.838 -2.6 0.2l0.6 -0.6q0.965 -0.27 1.8 -0.7"/>
                                	    <path class="Sensorpath" style="--order: 15;" style="opacity:1" fill="#cbe7ff" d="M17.7 14.1q0.615 0.062 0.2 0.5 -0.699 0.404 -1.4 0.1 0.674 -0.212 1.2 -0.6"/>
                                	    <path class="Sensorpath" style="--order: 16;" style="opacity:.561" fill="#a3d5ff" d="M9.7 23.5q0.08 0.48 -0.2 0.8 -0.248 -0.25 -0.5 0.2 -0.06 -0.905 0.2 -1.8a10.2 10.2 0 0 1 0.5 0.8"/>
                                	    <path class="Sensorpath" style="--order: 17;" d="M31.1 22.5h0.8a6.4 6.4 0 0 0 0.2 1.7q-0.491 1.35 -1.1 -0.1 -0.217 -0.828 0.1 -1.6"/>
                                	    <path class="Sensorpath" style="--order: 18;" style="opacity:1" fill="#c3e4ff" d="M31.3 22.7q0.732 0.774 -0.2 0.8 -0.02 -0.438 0.2 -0.8"/>
                                	    <path class="Sensorpath" style="--order: 19;" d="M9.7 23.5a10.2 10.2 0 0 0 -0.5 -0.8q-0.26 0.895 -0.2 1.8 0.252 -0.45 0.5 -0.2 -0.233 0.742 -0.9 0.4a7.6 7.6 0 0 1 0.2 -2q1.26 -0.449 0.9 0.8"/>
                                	    <path class="Sensorpath" style="--order: 20;" d="M31.3 26.1q0.734 -0.125 0.8 0.6a17.2 17.2 0 0 1 -0.4 1.6q-0.357 0.279 -0.8 0.2 -0.126 -1.273 0.4 -2.4"/>
                                	    <path class="Sensorpath" style="--order: 21;" style="opacity:.345" fill="#a6d6ff" d="M9.5 26.5q0.28 0.32 0.2 0.8a14.2 14.2 0 0 0 -0.4 0.8q-0.497 -0.777 -0.2 -1.6 0.345 0.728 0.4 0"/>
                    					<path class="Sensorpath" style="--order: 22;" style="opacity:1" fill="#c7e6ff" d="M31.3 26.5q0.326 0.036 0.4 0.4a4.12 4.12 0 0 1 -0.4 1.2q-0.212 -0.777 0 -1.6"/>
                                	    <path class="Sensorpath" style="--order: 23;" d="M9.5 26.5q-0.055 0.728 -0.4 0 -0.297 0.823 0.2 1.6a14.2 14.2 0 0 1 0.4 -0.8q0.463 0.812 -0.4 1.2 -0.344 -0.095 -0.5 -0.4a8.16 8.16 0 0 1 -0.2 -1.8q0.575 -0.425 0.9 0.2"/>
                                	</g>
                    			</svg>\`,
                            type: 'status'
                        },
						{
                            id: 'WaterTank',
							timeId: 'WaterTankLeft',
                            label: 'WaterTank',
                            svg: \`<svg width="40" height="40" viewBox="0 0 40 40" style="fill-rule:evenodd">
									    <defs>
									        <clipPath id="pureWaterTankWave">
									            <path style="opacity:.585" d="M0 24q11-1 10 0t10 0 10 0 10 0v36H0Z">
									                <animateTransform  attributeName="transform"  type="translate" values="0 -20;2 -20;-2 -20;0 -20" dur="2s" repeatCount="indefinite" />
									            </path>
									        </clipPath>
									    </defs>
									    <path style="opacity:1" fill="#8d8d8d" d="M6.3-.1h25a17 17 0 0 1 .2 1.5 11.2 11.2 0 0 0-.4 3.3q1.002.117 2 .3.786.788-.1 1.5a3.8 3.8 0 0 0-.3 1.6q-.585-.082-.9.4-.005 2.209-.5 4.3a16626 16626 0 0 0 0 13.4 431 431 0 0 0-.4 8.5 11.3 11.3 0 0 0 .2 2q-.14.49-.6.7a61 61 0 0 0-6.6.4 1.9 1.9 0 0 0-.5.3 6.1 6.1 0 0 0-.3 1.8H11.3c-.267-.267-.3-.1-.8 0h-.6q-2.041-.592-2.6-2.7a1697 1697 0 0 0-1-29.1h-1v-.8q2.354.221 4.6.8l.6-.3c3.799-.1 7.599-.133 19.9-.2 0 .2-.2.6 0 .8-9.494.233-10.494.333-11.2.4-.62.357-.4-.2-1 0s-.8 0-.8 0c-.8 0-.8.2-1.6.2H11c-2.2-.4-1.4-.4-3.6-.6.2 4.2 0 5.2 0 6.4.2.897.066 1.631.1 2.4.123 3.189.389 6.356.3 9.6v1.8c0 2.7-.4 1.3.4 8.5-.2-.7 0 .1.3.3q.035.569.4 1a9.8 9.8 0 0 0 2.6.8 116 116 0 0 0 10.4.3 13.6 13.6 0 0 1 .4-3.2 4.6 4.6 0 0 0-.2-1.2.9.9 0 0 1 .3-.4q.15-2.998.1-6c-.213-.27.054-.403.1-1.2a469 469 0 0 1 .4-14.6 1.4 1.4 0 0 1 .5-.7 20 20 0 0 1 1.8-.5c.3-.3.9-.3.9-.3.2.2.2-.2.5.1h1.8a15 15 0 0 1-.2-2q.63.007 1.1-.4a.8.8 0 0 1 .4.2q.15 1.196.1 2.4.733.114.4-.4a1.46 1.46 0 0 0 .4-.6 134 134 0 0 0-.4-3q.917-.131 1.6-.7-.794-.386-.6-1.3-1.552.123-3-.4-.306-.58-.1-1.2.104.504.6.6.432-.194.9-.2.06-.738.4-1.4a.9.9 0 0 1 .3.4 13 13 0 0 0-.2-3q-.544-.378-1.1 0-.126 1.051-.5 2.2-.514 1.361-1.9.9.892-.938 1.4-2.1-.693-.438 0-1.1a344 344 0 0 0-16.6 0l.3.3q.922-.335 1.9-.1c-.744.203-1.477.436-4.5.2-1.6 1.4-1.6 1.8-.8 2.8.6.6 1.2.6 4.2.4 3.6 0 7.2.2 11-.4 3.3.1 4.7.1 3.7-.1 1.4-1.2.8 1 1.2 1.6-.1-.7-.7.1-4.6.1.8.067 1.6.133 4.3 0-4.2 0-6.2-.2-9 .3a750 750 0 0 1-11.7.3l-.3.3q-1.353-1.033-1.7.6a4.2 4.2 0 0 1-.2-1.8h.8a42 42 0 0 0 .2-5m21.8 1.6q-.076-.698.4-1.2l.2.1q-.219.617-.6 1.1M7.3.5q1.284-.305 1.4 1a4 4 0 0 0-.7.8.73.73 0 0 0-.3-.2 21 21 0 0 1-.3 2.6q-.323-.485-.3-1.1A20.5 20.5 0 0 0 7.3.5m.8 3q.75.003.1.4a.5.5 0 0 1-.1-.4m0 .8q.745.069.3.4-.309-.101-.3-.4m20.8 8q.867.271 1.8.2-.335 12.03-.6 24a48 48 0 0 0-4.2-.2 10.5 10.5 0 0 0-2.8.4 2.96 2.96 0 0 1 .4-1.3 3.6 3.6 0 0 1-.4-.7q.315-10.791.7-21.6 1.372-.505 2.9-.6a1842 1842 0 0 0 .6 10.4q.24-4.754-.2-9.5-.002-.544.4-.9a945 945 0 0 0 .9 13.8 926 926 0 0 1-.3-13.8q.48.08.8-.2"/>
									    <g clip-path="url(#pureWaterTankWave)">
									        <path id="pureWaterTankFill" style="opacity:.585" fill="#1d3679" d="M6.2 7.8c26.584-.787 25.2-1.2 25.2 0-.492 27.577-.426 28.244-.3 28.9q-.14.49-.6.7a61 61 0 0 0-6.6.4 1.9 1.9 0 0 0-.5.3 6.1 6.1 0 0 0-.3 1.8H11.3c-.267-.267-.3-.1-.8 0h-.6q-2.041-.592-2.6-2.7c-.25-9.705-.584-19.405-1.1-29.4 5.2.8 12.6.4 24.6 0 .111-.188.645-.421 1.1-.8Z"/>
									    </g>
									</svg>\`,
                            type: 'status'
						}
                    ];

					const ComponentStatusText = {
                        EN: {
                            general: [
                                { min: 95, text: "Perfect",    color: "#1B5E20" },
                                { min: 90, text: "Excellent",  color: "#2E7D32" },
                                { min: 80, text: "Great",      color: "#43A047" },
                                { min: 70, text: "Very Good",  color: "#4CAF50" },
                                { min: 55, text: "Good",       color: "#7CB342" },
                                { min: 40, text: "Fair",       color: "#EEFF41" },
                                { min: 25, text: "Worn",       color: "#FFC107" },
                                { min: 15, text: "Poor",       color: "#FF9800" },
                                { min: 5,  text: "Very Poor", color: "#FF5722" },
                                { min: 0,  text: "Replace",   color: "#C62828" }
                            ],
                            refill: [
                                { min: 95, text: "Completely Full", color: "#1B5E20" },
                                { min: 85, text: "Full",            color: "#2E7D32" },
                                { min: 75, text: "High",            color: "#4CAF50" },
                                { min: 60, text: "Medium High",     color: "#7CB342" },
                                { min: 45, text: "Medium",          color: "#8BC34A" },
                                { min: 30, text: "Medium Low",      color: "#CDDC39" },
                                { min: 20, text: "Low",             color: "#FFC107" },
                                { min: 10, text: "Very Low",        color: "#FF9800" },
                                { min: 3,  text: "Critical",        color: "#FF5722" },
                                { min: 0,  text: "Refill Now",      color: "#C62828" }
                            ],
                            sensor: [
                                { min: 97, text: "Flawless",        color: "#1B5E20" },
                                { min: 93, text: "Perfect",         color: "#2E7D32" },
                                { min: 85, text: "Excellent",       color: "#43A047" },
                                { min: 75, text: "Very Clean",      color: "#4CAF50" },
                                { min: 65, text: "Clean",          color: "#7CB342" },
                                { min: 55, text: "Slightly Dusty", color: "#8BC34A" },
                                { min: 45, text: "Dusty",          color: "#CDDC39" },
                                { min: 35, text: "Quite Dirty",    color: "#FFC107" },
                                { min: 25, text: "Dirty",          color: "#FF9800" },
                                { min: 15, text: "Very Dirty",      color: "#FF7043" },
                                { min: 5,  text: "Extremely Dirty", color: "#F44336" },
                                { min: 1,  text: "Critical",        color: "#D32F2F" },
                                { min: 0,  text: "Error",           color: "#B71C1C" }
                            ],
                            battery: [
                                { min: 95, text: "Fully Charged",  color: "#1B5E20" },
                                { min: 80, text: "High",           color: "#4CAF50" },
                                { min: 65, text: "Medium High",    color: "#7CB342" },
                                { min: 50, text: "Medium",         color: "#CDDC39" },
                                { min: 35, text: "Medium Low",     color: "#FFC107" },
                                { min: 20, text: "Low",            color: "#FF9800" },
                                { min: 10, text: "Very Low",       color: "#FF5722" },
                                { min: 5,  text: "Critical",       color: "#F44336" },
                                { min: 0,  text: "Depleted",       color: "#C62828" }
                            ]
                        },
                        DE: {
                            general: [
                                { min: 95, text: "Perfekt",      color: "#1B5E20" },
                                { min: 90, text: "Ausgezeichnet", color: "#2E7D32" },
                                { min: 80, text: "Großartig",    color: "#43A047" },
                                { min: 70, text: "Sehr Gut",     color: "#4CAF50" },
                                { min: 55, text: "Gut",          color: "#7CB342" },
                                { min: 40, text: "Akzeptabel",   color: "#EEFF41" },
                                { min: 25, text: "Abgenutzt",    color: "#FFC107" },
                                { min: 15, text: "Schlecht",     color: "#FF9800" },
                                { min: 5,  text: "Sehr Schlecht", color: "#FF5722" },
                                { min: 0,  text: "Ersetzen",     color: "#C62828" }
                            ],
                            refill: [
                                { min: 95, text: "Vollständig voll", color: "#1B5E20" },
                                { min: 85, text: "Voll",             color: "#2E7D32" },
                                { min: 75, text: "Hoch",             color: "#4CAF50" },
                                { min: 60, text: "Mittel Hoch",      color: "#7CB342" },
                                { min: 45, text: "Mittel",           color: "#8BC34A" },
                                { min: 30, text: "Mittel Niedrig",   color: "#CDDC39" },
                                { min: 20, text: "Niedrig",         color: "#FFC107" },
                                { min: 10, text: "Sehr Niedrig",     color: "#FF9800" },
                                { min: 3,  text: "Kritisch",         color: "#FF5722" },
                                { min: 0,  text: "Jetzt nachfüllen", color: "#C62828" }
                            ],
                            sensor: [
                                { min: 97, text: "Makellos",       color: "#1B5E20" },
                                { min: 93, text: "Perfekt",        color: "#2E7D32" },
                                { min: 85, text: "Ausgezeichnet",  color: "#43A047" },
                                { min: 75, text: "Sehr Sauber",    color: "#4CAF50" },
                                { min: 65, text: "Sauber",         color: "#7CB342" },
                                { min: 55, text: "Leicht Staubig", color: "#8BC34A" },
                                { min: 45, text: "Staubig",        color: "#CDDC39" },
                                { min: 35, text: "Ziemlich Schmutzig", color: "#FFC107" },
                                { min: 25, text: "Schmutzig",      color: "#FF9800" },
                                { min: 15, text: "Sehr Schmutzig", color: "#FF7043" },
                                { min: 5,  text: "Extrem Schmutzig", color: "#F44336" },
                                { min: 1,  text: "Kritisch",       color: "#D32F2F" },
                                { min: 0,  text: "Fehler",         color: "#B71C1C" }
                            ]
                        }
                    };

                    // Language texts for the component detail overlay
                    const ComponentDetailTexts = {
                        EN: {
                            status: "Status:",
                            remaining: "Remaining:",
                            remainingTime: "Remaining Time:",
                            remainingLiter: "Remaining Liter",
                            consumption: "Consumption:",
                            average: "Average:",
                            resetButton: "Reset",
							resetText: "Reset",
							resetConfirm: "Click to Confirm",
							reseStart: "Resetting...",
							reseSuccessfully: "Successfully Reset!",
                            notAvailable: "N/A",
                            dataNotAvailable: "Data not available",
                            units: {
                                consumption: "ml/m²",
                                averageFormat: "ø {avg} ml/m² (\u2193 {min} | \u2191 {max})"
                            }
                        },
                        DE: {
                            status: "Status:",
                            remaining: "Verbleibend:",
                            remainingTime: "Verbleibende Zeit:",
                            remainingLiter: "Verbleibende Liter",
                            consumption: "Verbrauch:",
                            average: "Durchschnitt:",
                            resetButton: "Zurücksetzen",
							resetText: "zurücksetzen",
							resetConfirm: "Klicken zum Bestätigen",
							reseStart: "Wird zurückgesetzt...",
							reseSuccessfully: "Erfolgreich zurückgesetzt!",
                            notAvailable: "Nicht verfügbar",
                            dataNotAvailable: "Daten nicht verfügbar",
                            units: {
                                consumption: "ml/m²",
                                averageFormat: "ø {avg} ml/m² (\u2193 {min} | \u2191 {max})"
                            }
                        }
                    };


                    const ComponentNames = {
                        "EN": {
                          "MainBrush": "Main Brush",
                          "Sidebrush": "Side Brush",
                          "MoppPad": "Mop Pad",
                          "Detergent": "Detergent",
                          "Sensor": "Sensors",
                          "WaterTank": "Water Tank",
						  "Filter": "Filter"
                        },
                        "DE": {
                          "MainBrush": "Hauptbürste",
                          "Sidebrush": "Seitenbürste",
                          "MoppPad": "Wischpad",
                          "Detergent": "Reinigungsmittel",
                          "Sensor": "Sensoren",
                          "WaterTank": "Wassertank",
						  "Filter": "Filter"
                        }
                    }


                    initializeComponents();

                    // Initialize components display
                    function initializeComponents() {
                        const componentList = document.getElementById('component-list');
                        if (!componentList) return;

                        components.forEach(component => {
                            const componentElement = document.createElement('div');
                            componentElement.className = 'compact-component';
                            componentElement.style = 'display: inline-flex; flex-direction: column; align-items: center; ' +
                                                     'min-width: 25px; padding: 1px; border-radius: 1px; ' +
                                                     'background: rgba(255,255,255,0.05); cursor: pointer; ' +
                                                     'transition: transform 0.2s ease;';

                            componentElement.innerHTML =
                                '<div style="margin-bottom: 3px; transition: transform 0.2s ease;">' + component.svg + '</div>' +
                                '<div id="' + component.id + '-value" style="font-size: 12px; font-weight: bold; margin-top: 3px;">-</div>' +
                                (component.timeId ?
                                    '<div id="' + component.timeId + '-value" style="font-size: 12px; margin-top: 2px; color: #aaa;">-</div>'
                                    : '');

                            // Hover effect
                            componentElement.addEventListener('mouseenter', () => {
                                componentElement.style.transform = 'scale(1.05)';
                                componentElement.querySelector('div').style.transform = 'scale(1.1)';
                            });

                            componentElement.addEventListener('mouseleave', () => {
                                componentElement.style.transform = 'scale(1)';
                                componentElement.querySelector('div').style.transform = 'scale(1)';
                            });

                            // Click event to show component details
                            componentElement.addEventListener('click', () => {
                                showComponentDetail(component);
                            });

                            componentList.appendChild(componentElement);
                        });
                    }

                    // Status update for both values
                    function updateComponentStatus() {
						let componentPercentages = {}; // An object to store the percentage for each component
                        components.forEach(component => {

							// Special case for Water Tank
                            if (component.id === 'WaterTank') {
                                getState('${prefix}.state.water.PureWaterTank')
                                    .then(value => {
                                        updateComponentValue(component.label, component.id, value, '%');
                                        //updateWaterLevel(value);
                                    })
                                    .catch(err => console.error('Error with WaterTank:', err));
                            } else {
                                // Get the remaining lifespan in %
                                getState('${prefix}.state.' + component.id)
                                    .then(value => {
										componentPercentages[component.label] = value;
                                        updateComponentValue(component.label, component.id, value, '%');
                                    })
                                    .catch(err => console.error('Error with ' + component.id + ':', err));

                                // Get the remaining time (if available)
                                if (component.timeId) {
                                    getState('${prefix}.state.' + component.timeId)
                                        .then(value => {
											const percentage = componentPercentages[component.label] ?? 80;
                                            const hours = value;
											const maxTime = calculateMaxTime(hours, percentage);
											updateComponentValue(component.label, component.timeId, hours, 'h', maxTime);

                                        })
                                        .catch(err => console.error('Error with ' + component.timeId + ':', err));
							    }
						    }


                        });
						componentPercentages = {}; // Empty the componentPercentages object after each new update
                    }

                    // Helper function to update the component value
                    function updateComponentValue(elementLabel, elementId, value, unit, maxTime = 24) {
                        const element = document.getElementById(elementId + '-value');
                        if (!element) return;

                        let displayValue, color, isYellowRange = false;

                        // Handling percentage unit
                        if (unit === '%') {
                            displayValue = Math.max(0, Math.min(100, value)) + '%';
							const retCalculatedHSL = getComponentValueColor(value);
                            color = retCalculatedHSL.HSL;
							isYellowRange = retCalculatedHSL.isYellow;
                        }
                        // Handling hours unit
                        else if (unit === 'h') {
                            displayValue = value + 'h';
							const ratio = Math.min(value / maxTime, 1); // Normalize to 0�1 for up to 24h
							const hue = ratio * 120;
                            color = color = 'hsl(' + hue + ', 100%, 50%)';
							isYellowRange = hue >= 50 && hue <= 65;
                        }
                        // Default case for unknown unit
                        else {
                            displayValue = value ? value : '?';
                            color = value ? '#4CAF50' : '#F44336';
                        }

                        // Set the display value and apply the color
                        element.textContent = displayValue;
                        element.style.color = color;

						if (isYellowRange) {
							element.classList.add("Component-with-outline");
						} else {
							element.classList.remove("Component-with-outline");
						}

                    	updateSVGFillColor(elementLabel, value, unit);

                    	if (elementLabel === 'Sensor' && unit === '%') {
                            updateSensorPathColor(value);
                        }

                    	if (elementLabel === 'MoppPad' && unit === '%') {
                            updateMoppPadPathColor(value);
                        }

						if (elementLabel === 'WaterTank' && unit === '%') {
                            updateWaterLevel(value);
							getTankWaterLevel();
                        }

                    }

					function getComponentValueColor(value) {
                        // Clamp between 0�100
                        value = Math.max(0, Math.min(100, value));
                        const ratio = value / 100;       // Normalize 0�1
                        const hue = ratio * 120;         // 0 (red) to 120 (green)
						const isYellowRange = hue >= 50 && hue <= 65;
                        return {
								HSL: 'hsl(' + hue + ', 100%, 50%)',
                                isYellow: isYellowRange
                               };
                    }

					function calculateMaxTime(hours, percentage) {
                      return (hours / percentage) * 100;
                    }

                    // Function to handle SVG color updates based on element label and value
                    function updateSVGFillColor(elementLabel, value, unit) {

                        if (typeof value !== 'number' || value < 0 || value > 100 || unit !== '%') {
                            return;
                        }

                        const elementConfig = {
                            'Detergent': { id: 'detergent-SVG-level', reverseHue: false },
                            'Sidebrush': { id: 'sidebrush-SVG-level', reverseHue: false },
                    		'Filter': {id: 'filter-SVG-level', reverseHue: false },
                    		'MainBrush': {id: 'mainbrush-SVG-level', reverseHue: false },

                        };

                        if (!elementConfig[elementLabel]) return;

                        // Get configuration for this element
                        const config = elementConfig[elementLabel];
                        const svgElement = document.getElementById(config.id);

                        if (!svgElement) {
                            return;
                        }

                        let hue = (value / 100) * 120; // Calculate hue (0-120 from red to green)

                        // Reverse hue if configured (green to red)
                        if (config.reverseHue) {
                            hue = 120 - hue;
                        }

                        const color = 'hsl(' + hue + ', 100%, 50%)';

                        svgElement.setAttribute('fill', color);

                    	// Add class for extreme values
                        svgElement.classList.toggle('critical-level', value < 5);
                    }

                    function updateSensorPathColor(value) {
                        // Select all sensor path elements
                        const sensorPaths = document.querySelectorAll('.Sensorpath');

                        if (typeof value !== 'number' || value < 0 || value > 100) {
                            return;
                        }

                        // Color calculation (Red for low values, Green for high values)
                        const hue = (value / 100) * 120; // HSL color value from 0 (red) to 120 (green)
                        const color = 'hsl(' + hue + ', 100%, 50%)';

                        // Temporarily disable animation while changing the color
                        sensorPaths.forEach(path => {
                            path.style.animation = 'none';
                            path.setAttribute('fill', color);

                            // Re-enable animation after a short delay
                            setTimeout(() => {
                                path.style.animation = '';
                            }, 50);
                        });

                    	const svgElement = document.getElementById('sensor-SVG-level');
                        svgElement.classList.toggle('critical-level', value < 5); // Add class for extreme values
                    }

                    function updateMoppPadPathColor(value) {

                        if (typeof value !== 'number' || value < 0 || value > 100) {
                            return;
                        }

                        const leftMop = document.getElementById('mopppad2-SVG-level');
                        const rightMop = document.getElementById('mopppad1-SVG-level');

                        if (!leftMop || !rightMop) return;

                        // Color calculation (Red for low values, green for high values)
                        const hue = (value / 100) * 120; // HSL color value from 0 (red) to 120 (green)
                        const color = 'hsl(' + hue + ', 100%, 50%)';

                        [leftMop, rightMop].forEach(mop => {
                            mop.setAttribute('fill', color);
                            mop.style.opacity = '0.9';
                    	    mop.classList.toggle('critical-level', value < 5); // Add class for extreme values
                        });
                    }

					function updateWaterLevel(level) {
					    // Convert the percentage value (0-100) to a Y offset (0 to 32)
					    const maxHigh = 0;
					    const minHigh = 32;
					    const y = minHigh + (maxHigh - minHigh) * (level / 100);

					    // Find all wave elements (also in the detail view)
					    document.querySelectorAll('#pureWaterTankWave').forEach(wave => {
					        wave.setAttribute("transform", 'translate(0, ' + y + ')');
					    });

					    // Change water color based on fill level
					    const waterFillElements = document.querySelectorAll('#pureWaterTankFill');
					    const hue = 120 * (level / 100); // Green (120) to Red (0)
					    waterFillElements.forEach(el => {
					        el.setAttribute('fill', 'hsl(' + hue + ', 100%, 50%)');
					    });
					}

					function getTankWaterLevel() {
						const element = document.getElementById('WaterTankLeft-value');
                        getState('${prefix}.state.water.current')
                            .then(value => {
                                // Handle invalid values (null, undefined or NaN)
                                if (value === null || value === undefined || isNaN(value)) {
                                    console.warn('Invalid water level value received');
                                    element.textContent = '-- L';
                                    element.style.color = '#9E9E9E';
                                    return;
                                }

                                // Convert ml to liters
                                const liters = (value / 1000).toFixed(2);

                                let color;
                                const percentFull = (value / 4500) * 100;
								const retCalculatedHSL = getComponentValueColor(percentFull);
								color = retCalculatedHSL.HSL;

                                // Apply directly to UI elements
                                element.textContent = liters + ' L';
                                element.style.color = color;
								if (retCalculatedHSL.isYellow) {
									element.classList.add("Component-with-outline");
                                } else {
									element.classList.remove("Component-with-outline");
                                }

                            })
                            .catch(err => {
                                console.error('Error fetching water level:', err);
                                element.textContent = '-- L';
                                element.style.color = '#9E9E9E';
                            });
                    }


                    // Initialize the detail view
                    const detailOverlay = document.getElementById('component-detail-overlay');
                    const detailClose = document.getElementById('component-detail-close');
                    const detailSvgContainer = document.getElementById('component-detail-svg');
                    const detailName = document.getElementById('component-detail-name');
                    const detailStatus = document.getElementById('component-detail-status');
                    const detailRemaining = document.getElementById('component-detail-remaining');
                    const detailTime = document.getElementById('component-detail-time');
                    const detailReset = document.getElementById('component-detail-reset');
					const detailcurrentMlPerSqmLabel = document.getElementById('component-detail-currentMlPerSqm-Label');
					const detailcurrentMlPerSqm = document.getElementById('component-detail-currentMlPerSqm');
					const detailcurrentMlMaxMinLabel = document.getElementById('component-detail-currentMlMaxMin-Label');
					const detailcurrentMlMaxMin = document.getElementById('component-detail-currentMlMaxMin');

                    // Helper function to update all UI texts when language changes
					updateComponentDetailLanguage();
                    function updateComponentDetailLanguage() {
                        const texts = ComponentDetailTexts[UserLang] || ComponentDetailTexts.EN;

                        // Update static labels
                        document.querySelectorAll('.component-detail-info div:nth-child(1)')[0].textContent = texts.status;
                        document.querySelectorAll('.component-detail-info div:nth-child(1)')[1].textContent = texts.remaining;
                        document.getElementById('component-detail-currentMlPerSqm-Label').textContent = texts.consumption;
                        document.getElementById('component-detail-currentMlMaxMin-Label').textContent = texts.average;
                    }

                    // Updated showComponentDetail function with multilingual support
                    function showComponentDetail(component) {
                        currentComponent = component;
                        const texts = ComponentDetailTexts[UserLang] || ComponentDetailTexts.EN;

                        // Copy and enlarge the SVG
                        const originalSvg = document.querySelector('#' + component.id + '-value').previousElementSibling.querySelector('svg');
                        const clonedSvg = originalSvg.cloneNode(true);

                        // Adjust SVG attributes for size
                        clonedSvg.removeAttribute('width');
                        clonedSvg.removeAttribute('height');
                        clonedSvg.style.width = '100%';
                        clonedSvg.style.height = '100%';

                        // Insert the SVG into the container
                        detailSvgContainer.innerHTML = '';
                        detailSvgContainer.appendChild(clonedSvg);

                        // Set values
                        detailName.textContent = ComponentNames[UserLang][component.label];

                        const valueElement = document.getElementById(component.id + '-value');
                        const statusText = updateComponentStatusText(component.label, parseFloat(valueElement.textContent), UserLang);
                        detailStatus.textContent = statusText.text;
                        detailStatus.style.color = statusText.color;

                        if (statusText.isYellow) {
                            detailStatus.classList.add("Component-with-outline");
                        } else {
                            detailStatus.classList.remove("Component-with-outline");
                        }

                        detailRemaining.textContent = valueElement.textContent;
                        detailRemaining.style.color = valueElement.style.color;

                        if (component.timeId) {
                            const timeElement = document.getElementById(component.timeId + '-value');
                            detailTime.textContent = timeElement.textContent || texts.notAvailable;
                            detailTime.style.color = timeElement.style.color || '#aaa';
                        } else {
                            detailTime.textContent = texts.notAvailable;
                            detailTime.style.color = '#aaa';
                        }

                        // Special case for Water Tank
                        if (component.id === 'WaterTank') {
                            detailReset.style.display = 'none';
                            document.getElementById('component-detail-remaining-String').textContent = texts.remainingLiter;
                            detailcurrentMlPerSqmLabel.style.display = 'block';
                            detailcurrentMlPerSqm.style.display = 'block';
                            detailcurrentMlMaxMinLabel.style.display = 'block';
                            detailcurrentMlMaxMin.style.display = 'block';

                            // Fetch the values for current milliliters per square meter and learning statistics
                            getState('${prefix}.state.water.currentMlPerSqm')
                                .then(currentVal => {
                                    return getState('${prefix}.state.water.learningStats')
                                        .then(statsVal => {
                                            const stats = JSON.parse(statsVal || '{}');

                                            // Format the values
                                            const current = (currentVal && !isNaN(currentVal)) ? currentVal : '--';
                                            const min = stats.minConsumption || '--';
                                            const max = stats.maxConsumption || '--';
                                            const avg = stats.avgConsumption || '--';

                                            detailcurrentMlPerSqm.textContent = current + ' ' + texts.units.consumption;
                                            detailcurrentMlMaxMin.textContent =
                                                texts.units.averageFormat
                                                    .replace('{avg}', avg)
                                                    .replace('{min}', min)
                                                    .replace('{max}', max);

                                            // Check if current value is a number before applying color
                                            if (typeof current === 'number') {
                                                if (current > max) {
                                                    detailcurrentMlPerSqm.style.color = '#ff5722';
                                                    detailcurrentMlMaxMin.style.color = '#2196f3';
                                                } else if (current < min) {
                                                    detailcurrentMlPerSqm.style.color = '#4caf50';
                                                    detailcurrentMlMaxMin.style.color = '#2196f3';
                                                } else {
                                                    detailcurrentMlPerSqm.style.color = '#2196f3';
                                                    detailcurrentMlMaxMin.style.color = '#2196f3';
                                                }
                                            } else {
                                                detailcurrentMlPerSqm.style.color = '#9e9e9e';
                                            }
                                        });
                                })
                                .catch(err => {
                                    console.error('Error loading data:', err);
                                    detailcurrentMlPerSqm.textContent = texts.dataNotAvailable;
                                    detailcurrentMlPerSqm.style.color = '#9e9e9e';
                                });

                        } else {
                            // For other components
                            detailReset.style.display = 'block';
                            detailcurrentMlPerSqmLabel.style.display = 'none';
                            detailcurrentMlPerSqm.style.display = 'none';
                            detailcurrentMlMaxMinLabel.style.display = 'none';
                            detailcurrentMlMaxMin.style.display = 'none';
                            document.getElementById('component-detail-remaining-String').textContent = texts.remainingTime;
                        }

                        // Update reset button text
                        detailReset.innerHTML = '<i class="fas fa-sync-alt"></i> ' + (UserLang === "DE" ? ComponentNames[UserLang][currentComponent.label] + ' ' + ComponentDetailTexts[UserLang].resetText :
						ComponentDetailTexts[language].resetText + ' ' + ComponentNames[UserLang][currentComponent.label]);
                        detailReset.style.background = 'linear-gradient(135deg, rgba(0,150,255,0.6) 0%, rgba(0,100,200,0.8) 100%)';

                        // Show the overlay
                        detailOverlay.classList.add('active');

                        // Restart SVG animations
                        restartSvgAnimations(clonedSvg);
                    }

                    let currentComponent = null;

                    // Close the overlay when the close button is clicked
                    detailClose.addEventListener('click', () => {
                        detailOverlay.classList.remove('active');
                    });

                    // Close the overlay when clicking outside the overlay
                    detailOverlay.addEventListener('click', (e) => {
                        if (e.target === detailOverlay) {
                            detailOverlay.classList.remove('active');
                        }
                    });


                	// 2-step reset confirmation process
                    let resetPending = false;

                    detailReset.addEventListener('click', () => {
                        // If no component is currently selected, exit the function
                        if (!currentComponent) return;

                        if (!resetPending) {
                            // 1. First click - Request confirmation
                            resetPending = true;
                            detailReset.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + ComponentDetailTexts[UserLang].resetConfirm;
                            detailReset.style.background = 'linear-gradient(135deg, rgba(255,179,0,0.6) 0%, rgba(255,145,0,0.8) 100%)';

                            // Reset button reverts to original state after 5 seconds if not confirmed
                            const resetTimeout = setTimeout(() => {
                                if (resetPending) {
                                    resetPending = false;
                                    detailReset.innerHTML = '<i class="fas fa-sync-alt"></i> Reset ' + ComponentNames[UserLang][currentComponent.label];
                                    detailReset.style.background = 'linear-gradient(135deg, rgba(0,150,255,0.6) 0%, rgba(0,100,200,0.8) 100%)';
                                }
                            }, 5000);

                			// Cleanup when the component is changed
                            const cleanup = () => {
                                clearTimeout(resetTimeout);
                                document.removeEventListener('componentChanged', cleanup);
                            };
                            document.addEventListener('componentChanged', cleanup);

                        } else {
                            // 2. Second click - Confirmation received
                            resetPending = false;
                            detailReset.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' + ComponentDetailTexts[UserLang].reseStart;
                            detailReset.disabled = true;

                            setTimeout(() => {
                                //3. Reset logic
                				(async () => {
                					try {
                						await setState('${prefix}.control.Reset' + currentComponent.id.replace('Left', ''), true);
                					    console.log('Reset ' + currentComponent.label + ' confirmed');
                						// 4. Wait a moment before updating (adjust time as needed)
                						setTimeout(() => {
                						    // 5. Update all components
                						    updateComponentStatus()
                							// 6. Refresh detail view
                							showComponentDetail(currentComponent);
                						    // 7. Show success state
                						    showResetSuccess();
                						}, 1500);
                					} catch (err) {
                					    console.error('Error resetting the ' + currentComponent.label + ' component', err);
                						showResetError();
                					}
                				})();
                            }, 800);
                        }
                    });

                    function showResetSuccess() {
                        detailReset.innerHTML = '<i class="fas fa-check"></i> ' +ComponentDetailTexts[UserLang].reseSuccessfully;
                        detailReset.style.background = 'linear-gradient(135deg, rgba(0,200,83,0.6) 0%, rgba(0,170,50,0.8) 100%)';

                        setTimeout(resetButtonToDefault, 2000);
                    }

                	function showResetError() {
                		detailReset.innerHTML = '<i class="fas fa-times"></i> Failed!';
                        detailReset.style.background = 'linear-gradient(135deg, rgba(255,50,50,0.6) 0%, rgba(200,0,0,0.8) 100%)';
                        detailReset.disabled = false;

                        setTimeout(resetButtonToDefault, 2000);
                    }

                	function resetButtonToDefault() {
                        detailReset.innerHTML = '<i class="fas fa-sync-alt"></i> ' + (UserLang === "DE" ? ComponentNames[UserLang][currentComponent.label] + ' ' +ComponentDetailTexts[UserLang].resetText :
						ComponentDetailTexts[language].resetText + ' ' + ComponentNames[UserLang][currentComponent.label]);
                        detailReset.style.background = 'linear-gradient(135deg, rgba(0,150,255,0.6) 0%, rgba(0,100,200,0.8) 100%)';
                		resetPending = false;
                		detailReset.disabled = false;
                    }

                    function updateComponentStatusText(elementLabel, value, language = "EN") {
                        // Validate language input
                        const lang = ComponentStatusText[language] ? language : "EN";
                        const levels = ComponentStatusText[lang];

                        // Determine the category based on element label
                        let category;

                        if (elementLabel === "Sensor") {
                            category = "sensor";
                        } else if (elementLabel === "WaterTank" || elementLabel === "Detergent") {
                            category = "refill";
                        } else {
                            category = "general";
                        }

                        // Find the matching level (fallback to unknown if not found)
                        const matchedLevel = levels[category].find(level => value >= level.min) ||
                                            { text: lang === "DE" ? "Unbekannt" : "Unknown",
                                              color: "#9E9E9E" };

                        // Define which colors should be considered "yellow" for outline
                        const yellowColors = [
                            "#FFC107", // Material Amber 500 (main yellow)
                            "#FFA000", // Amber 700
                            "#FFD740", // Amber 300
                            "#FFAB00", // Amber 600
                            "#FFC400", // Amber 400
                            "#FFD600", // Amber A400
                            "#FFAB40", // Deep Orange 200 (yellow-orange)
                            "#FF9800", // Orange 500
                            "#EEFF41", // Lime A200 (yellowish)
                            "#CDDC39", // Lime 500
                            "#FFEB3B"  // Yellow 500
                        ];

                        return {
                            text: matchedLevel.text,
                            color: matchedLevel.color,
                            isYellow: yellowColors.includes(matchedLevel.color.toUpperCase())
                        };
                    }


                    // Restart SVG animations
                    function restartSvgAnimations(svgElement) {
                        const animatedElements = svgElement.querySelectorAll('*[style*="animation"]');
                        animatedElements.forEach(el => {
                            const style = el.getAttribute('style');
                            el.setAttribute('style', '');
                            void el.offsetWidth; // Trigger reflow
                            el.setAttribute('style', style);
                        });
                    }

					// =============================================
                    // Clean selected logic
                    // =============================================

                    async function startCustomCleanSelected() {
                        try {
                            // Check if any rooms are selected
                            if (selectedRooms.length === 0) {
                                console.log('No rooms selected - starting full cleaning');
                                return await startFullCleaning();
                            }

                            console.log('Starting custom cleaning for selected rooms:', selectedRooms);

                    		let cleanOrder = 0

                            // Process all selected rooms with their individual settings
                            const roomCommands = await Promise.all(selectedRooms.map(async (roomId) => {
                                const roomLabel = document.querySelector('#room-label-' + roomId + '-fixed .label-content');

                    			cleanOrder += 1;

                                if (!roomLabel) {
                                    console.warn('No label found for room ' + roomId + ', using defaults');
                                    return [
                                        parseInt(roomId, 10),
                    				    1,  // Default repeat
                                        1,  // Default suction
                                        20, // Default water
                    				    cleanOrder
                                    ];
                                }

                                // Handle suction MaxPlus special case
                                let suctionValue = parseInt(roomLabel.dataset.suction, 10);
                                if (suctionValue === 4 || suctionValue === 3) {
                                    const suctionMaxPlus = (suctionValue === 4) ? 1 : 0;
                                    await setState('${prefix}.control.SuctionMaxPlus', suctionMaxPlus);
                                    suctionValue = 3; // Normalize to Max
                                }

                                return [
                                    parseInt(roomId, 10),
                    				parseInt(roomLabel.dataset.repeat, 10),
                                    suctionValue,
                                    parseInt(roomLabel.dataset.water, 10),
                    			    cleanOrder
                                ];
                            }));

                            // Build complete command structure
                            const customeClean = [
                                {
                                    piid: 1,
                                    value: 18
                                },
                                {
                                    piid: 10,
                                    value: JSON.stringify({
                                        selects: roomCommands
                                    })
                                }
                            ];

                            // Send the complete command
                            await setState('${prefix}.control.StartCustom', JSON.stringify(customeClean));

                            console.log('Complete custom clean command sent:', {
                                command: 'customeClean',
                                data: customeClean,
                                rooms: selectedRooms.length
                            });

                            showNotification('Started cleaning ' + selectedRooms.length + ' selected rooms', 'success');

                        } catch (error) {
                            console.error('Error in startCustomCleanSelected:', {
                                error: error,
                                rooms: selectedRooms,
                                stack: error.stack
                            });
                            showNotification('Failed to start cleaning: ' + error.message, 'error');
                        }
                    }

                    async function startFullCleaning() {
                        try {
                            // Find all room label containers (not the content divs)
                            const roomContainers = document.querySelectorAll('[id^="room-label-"]');

                            if (roomContainers.length === 0) {
                                throw new Error('No room labels found');
                            }

                            // Process all rooms with their individual settings
                            const roomCommands = [];
                            let globalSuctionMaxPlus = 0;
                    		let cleanOrder = 0

                            for (const container of roomContainers) {
                                // Extract room ID from container ID
                                const idMatch = container.id.match(/room-label-(\\d+)-fixed/);
                                if (!idMatch) continue;

                                const roomId = idMatch[1];
                                const label = container.querySelector('.label-content');
                                if (!label) continue;

                                // Get settings from label (with fallback to defaults)
                                const suction = parseInt(label.dataset.suction || '1', 10);
                                const water = parseInt(label.dataset.water || '20', 10);
                                const repeat = parseInt(label.dataset.repeat || '1', 10);
                    			cleanOrder += 1

                                // Handle MaxPlus suction
                                let normalizedSuction = suction;
                                if (suction === 4 || suction === 3) {
                                    if (suction === 4) globalSuctionMaxPlus = 1;
                                    normalizedSuction = 3;
                                }

                                roomCommands.push([
                                    parseInt(roomId, 10),
                    			    repeat,
                                    normalizedSuction,
                                    water,
                                    cleanOrder
                                ]);
                            }

                            if (roomCommands.length === 0) {
                                throw new Error('No valid room configurations found');
                            }

                            // Set SuctionMaxPlus if needed
                            if (globalSuctionMaxPlus === 1) {
                                await setState('${prefix}.control.SuctionMaxPlus', '1');
                            }

                            // Build complete command structure
                            const customeClean = [
                                {
                                    piid: 1,
                                    value: 18
                                },
                                {
                                    piid: 10,
                                    value: JSON.stringify({
                                        selects: roomCommands
                                    })
                                }
                            ];

                    		// Send the complete command
                            await setState('${prefix}.control.StartCustom', JSON.stringify(customeClean));
                            console.log('Full cleaning command sent for all rooms:', customeClean);
                            showNotification('Starting full cleaning for ' + roomCommands.length + ' rooms', 'success');

                        } catch (error) {
                            console.error('Error in startFullCleaning:', error);
                            showNotification('Failed to start full cleaning: ' + error.message, 'error');
                        }
                    }


					// =============================================
                    // Cleaning mode logic
                    // =============================================
                    // Global state for cleaning settings
                    const VisCleaningState = {
                        mode: null,
                        Suction: null,
                        Water: null,
                        Route: null,
                        Repeat: null
                    };
					// Global variable to store button references
					const modeOptionButtons = {};

                    // SVG icon library
                    const iconLibrary = {
                        Sweeping: {
                            svg: \`<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                  					<path fill="#fff" d="M29.1 2.9q1.69.338 1.3 2A32.6 32.6 0 0 0 26 9.3a26.3 26.3 0 0 0-2.2 6q-1.246.851-2.2-.4.488-8.084 7.5-12"/>
                  					<path fill="#fff" d="M29.7 8.1q1.423-.138 2.4.9 4.23 3.51 5.3 8.9a6.1 6.1 0 0 1 0 2.2q-.847.921-2 .4-.955-6.514-6.2-10.4-.567-1.176.5-2"/>
                  					<path fill="#fff" d="M16.3 9.7q2.594-.207 1.7 2.2-7.31 4.714-8.4 13.4-.875 1.244-2.1.4-.441-.508-.4-1.2 1.266-9.542 9.2-14.8"/>
                  					<path fill="#fff" d="M17.7 16.3q.707-.049 1.4.1 5.711 2.212 11.4-.1 1.825.249 1.2 2-2.285 1.447-5 1.7l-3.4.2q5.261 5.458 4.8 12.9-1.212.535-2.1-.4-.597-5.597-4-10a39.3 39.3 0 0 0-4.8-4.4q-.342-1.176.5-2"/>
                  					<path fill="#fff" d="M1.7 27.9q.707-.049 1.4.1 8.117 3.338 16.3.1 1.321.072 1.3 1.4.033.562-.4.9-9.595 3.961-19-.4-.507-1.211.4-2.1"/>
                  					</svg>\`
                        },
                        Mopping: {
                            svg: \`<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                  					<path fill="#fff" d="M15.1 1.9q.846-.076 1.6.3A75 75 0 0 1 23 9.7q.888 2.477-1.7 2.1l-5.5-6.7q-5.93 6.254-9.8 14-3.723 7.738 2.7 13.5 6.843 5.237 13.8.2a22 22 0 0 1 2.6-2.4q1.47-.315 2 1.1-2.597 4.441-7.6 5.9-10.942 2.203-16.3-7.5-2.153-4.894-.6-10 4.564-10.207 12.5-18"/>
                  					<path fill="#fff" d="M28.5 6.9q1.149-.075 2 .7 4.055 4.457 6.7 9.9 2.28 7.486-4.5 11.3-6.091 2.183-10.5-2.5-3.775-5.66 0-11.4 2.547-4.494 6.3-8m.4 3.4q.873.522 1.5 1.4a63 63 0 0 1 4.4 7q1.395 5.56-3.9 7.9-5.527 1.161-7.7-4.1-.701-2.999 1-5.6a46.3 46.3 0 0 1 4.7-6.6"/>
                  					</svg>\`
                  	  },
                        SweepingAndMopping: {
                            svg: \`<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                  					<path fill="#fff" d="M15.1 1.9q1.177 -0.129 2.1 0.6a99.2 99.2 0 0 1 4.8 5.8 14.8 14.8 0 0 1 1.9 3.1q-0.443 1.522 -2 1.2A172.2 172.2 0 0 1 15.8 5.1q-6.842 7.244 -10.8 16.4 -1.313 7.223 4.5 11.7 8.574 4.946 15.1 -2.5a20.08 20.08 0 0 1 1.9 -2.7q1.656 -0.398 2 1.3 -4.77 9.986 -15.8 8.3 -8.38 -2.28 -10.5 -10.7 -0.974 -6.303 2.6 -11.6 4.288 -7.381 10.3 -13.4"/>
                  					<path fill="#fff" d="M28.5 8.9q2.181 -0.139 1.7 2 -3.774 2.605 -5.3 6.9a28.4 28.4 0 0 0 -0.9 3.5q-0.995 1.082 -2.2 0.2 -0.132 -8.134 6.7 -12.6"/>
                  					<path fill="#fff" d="M29.5 14.3q1.542 -0.228 2.6 0.9 5.465 4.579 5.3 11.7 -1.274 1.172 -2.4 -0.2 -0.396 -4.996 -3.8 -8.6a15.68 15.68 0 0 1 -2.2 -2q-0.261 -1.048 0.5 -1.8"/>
                  					<path fill="#fff" d="M18.1 22.5a120.4 120.4 0 0 1 3.8 1.1q4.539 0.885 8.8 -0.9 1.186 0.186 1.4 1.4 -0.907 1.608 -2.8 1.9 -5.993 1.714 -11.6 -1 -1.167 -1.454 0.4 -2.5"/>
                  					</svg>\`
                        },
                        MoppingAfterSweeping: {
                            svg: \`<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                  					<path fill="#fff" d="M23.1 4.7q.868-.137 1.5.4a66.5 66.5 0 0 1-.2 10.2q-.8.4-1.6 0l-.2-8a.73.73 0 0 0-.3-.2q-.87.735-2 .8-.105-1.069.4-2 1.144-.772 2.4-1.2"/>
                  					<path fill="#fff" d="M12.7 5.5q1.856-.19 1.9 1.6a44 44 0 0 0-3.4 3.6 19 19 0 0 0-2 5.4q-.979.773-2 0-.435-4.199 2.2-7.6 1.529-1.681 3.3-3"/>
                  					<path fill="#fff" d="M14.3 10.5q1.423-.138 2.4.9 4.072 3.393 4.6 8.7-.437 1.989-2.3 1.2a26 26 0 0 0-1.8-5.2L16 14.5a18.7 18.7 0 0 1-2.4-2.2q-.306-1.184.7-1.8"/>
                  					<path style="opacity:.902" fill="#fff" d="M4.5 17.1q.728.007 1.4.3 2.545 1.736 5.6 1.2a21 21 0 0 0 3.4-1.3q1.94.529 1 2.3-6.148 3.821-12.2-.2-.826-1.572.8-2.3"/>
                  					<path style="opacity:.6" fill="#fff" d="M28.3 17.1q.945-.087 1.8.3 3.445 3.244 5.5 7.5 2.276 6.373-3.7 9.5-6.714 1.967-9.7-4.3-.669-2.436.2-4.8 2.202-4.65 5.9-8.2m.4 3.8q1.141.384 1.9 1.4 1.602 2.002 2.6 4.4.402 5.698-5.3 5.1-3-.95-3.2-4.1 1.136-3.929 4-6.8"/>
                  					<path style="opacity:.6" fill="#fff" d="M14.7 24.7q4.731-.219 3.7 4.4a29 29 0 0 1-3.5 4.4q1.882.046 3.8.1.8.9 0 1.8-3 .2-6 0-.774-.444-.5-1.3a28.2 28.2 0 0 1 3.8-4.2q1.011-1.232.8-2.8-.899-.829-2.1-.5a79 79 0 0 1-1.7.9q-1.162-.341-.4-1.4.946-.904 2.1-1.4"/>
                  					</svg>\`
                        },
                        CustomRoomCleaning: {
                            svg: \`<svg class="mode-option-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
                  					<path fill="#fff" d="M8.7 3.5q5.061-.283 6.9 4.4 1.478 4.481 1.1 9.2-3.954.209-7.8-.7-7.3-2.05-5.1-9.3 1.649-2.944 4.9-3.6m.4 2q4.611.16 5.1 4.8a28 28 0 0 1 .7 4.8q-4.183-.027-8-1.7-2.64-2.71-.9-6.1 1.199-1.572 3.1-1.8"/>
                  					<path fill="#fff" d="M28.1 3.7q8.944-.207 7.5 8.6-1.285 2.873-4.3 3.9-4.208 1.29-8.6 1-.681-4.746.9-9.3 1.358-3.11 4.5-4.2m.4 2q6.546-.203 5.1 6.2-.674 1.564-2.3 2.1a27.6 27.6 0 0 1-7 1.3q.102-4.207 1.9-8 .945-1.143 2.3-1.6"/>
                  					<path fill="#fff" d="M13.1 22.3a16 16 0 0 1 3.5.2q.621 5.434-1.6 10.4-3.533 4.767-8.9 2.1-3.55-2.556-2.7-6.9.788-3.388 4.1-4.5 2.76-1.007 5.6-1.3m1.4 1.8q.399 4.258-1.5 8.2-1.892 2.131-4.7 1.5-4.123-1.757-2.7-6.1 1.156-2.053 3.5-2.5a59 59 0 0 1 5.4-1.1"/>
                  					<path fill="#fff" d="M22.5 22.5q4.616-.354 9 1.1 5.308 2.064 4.3 7.7-2.011 5.631-7.9 4.5-3.214-.913-4.3-4.1-1.478-4.481-1.1-9.2m2 1.8q4.078.245 7.8 1.9 2.647 2.701.9 6.1-3.235 3.214-6.8.4-1.111-1.631-1.4-3.6-.591-2.413-.5-4.8"/>
                  					</svg>\`
                        }
                    };

					// Cleaning mode definitions with default settings
					const VisCleaningModes = {
					    Sweeping: {
					        name: "Sweeping",
					        options: ['Suction', 'Route', 'Repeat'],
					        activeModes: ["SuctionQuit", "SuctionStandard", "SuctionTurbo", "SuctionMax", "SuctionMaxPlus", "RouteQuick", "RouteStandard", "Repeat1", "Repeat2", "Repeat3"],
					        icon: iconLibrary.Sweeping.svg,
					        lastSettings: { Suction: "Standard", Route: "Standard", Repeat: "1" }
					    },
					    Mopping: {
					        name: "Mopping",
					        options: ['Water', 'Route', 'Repeat'],
					        activeModes: ["WaterLow", "WaterMiddle", "WaterHigh", "WaterUltra", "RouteQuick", "RouteStandard", "RouteIntensive", "RouteDeep", "Repeat1", "Repeat2", "Repeat3"],
					        icon: iconLibrary.Mopping.svg,
					        lastSettings: { Water: "Middle", Route: "Standard", Repeat: "1" }
					    },
					    SweepingAndMopping: {
					        name: "Sweeping and mopping",
					        options: ['Suction', 'Water', 'Route', 'Repeat'],
					        activeModes: ["SuctionQuit", "SuctionStandard", "SuctionTurbo", "SuctionMax", "WaterLow", "WaterMiddle", "WaterHigh", "WaterUltra", "RouteQuick", "RouteStandard", "Repeat1", "Repeat2", "Repeat3"],
					        icon: iconLibrary.SweepingAndMopping.svg,
					        lastSettings: { Suction: "Standard", Water: "Middle", Route: "Standard", Repeat: "1" }
					    },
					    MoppingAfterSweeping: {
					        name: "Mopping after sweeping",
					        options: ['Suction', 'Water', 'Route', 'Repeat'],
					        activeModes: ["SuctionQuit", "SuctionStandard", "SuctionTurbo", "SuctionMax", "SuctionMaxPlus", "WaterLow", "WaterMiddle", "WaterHigh", "WaterUltra", "RouteQuick", "RouteStandard", "RouteIntensive", "RouteDeep", "Repeat1", "Repeat2", "Repeat3"],
					        icon: iconLibrary.MoppingAfterSweeping.svg + '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="red"/>',
					        lastSettings: { Suction: "Standard", Water: "Middle", Route: "Standard", Repeat: "1" }
					    },
					    CustomRoomCleaning: {
					        name: "Custom room cleaning",
					        options: ['Suction', 'Water', 'Route', 'Repeat'],
					        activeModes: ["SuctionQuit", "SuctionStandard", "SuctionTurbo", "SuctionMax", "SuctionMaxPlus", "WaterLow", "WaterMiddle", "WaterHigh", "WaterUltra", "RouteQuick", "RouteStandard", "RouteIntensive", "RouteDeep", "Repeat1", "Repeat2", "Repeat3"],
					        icon: iconLibrary.CustomRoomCleaning.svg + '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="red"/>',
					        lastSettings: { Suction: "Standard", Water: "Middle", Route: "Standard", Repeat: "1" }
					    }
					};

                    // Available options for each setting
                    const VisCleaningOptions = {
                        Suction: [
                            { value: "Quit", label: "Quit", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								<style> .icon-suction-spin { animation: none; /* Disabled by default */ transform-origin: center; } @keyframes icon-suction-spinIt { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } </style>
								<g class="icon-suction-spin">
								<g><path fill="#fff" d="M17.7 2.7q11.254 -0.699 17.1 8.8 5.655 12.425 -4.3 21.7 -10.096 7.033 -20.6 0.6Q0.561 26.384 3.4 14.7q3.74 -10.092 14.3 -12m0.2 2.8q10.505 -0.575 15.1 8.8 3.88 12.565 -7.7 18.7 -9.984 3.438 -16.9 -4.5 -5.448 -8.111 -0.6 -16.6 3.738 -5.293 10.1 -6.4"/></g>
								<g><path fill="#fff" d="M12.1 18.1a593 593 0 0 1 15.4 0.1q1.571 0.982 0.7 2.7 -0.447 0.451 -1.1 0.5 -7.3 0.2 -14.6 0 -2.002 -0.467 -1.3 -2.5 0.419 -0.471 0.9 -0.8"/></g>
								</g>
								</svg>\` },
                            { value: "Standard", label: "Standard", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								<style> .icon-suction-spin { animation: none; /* Disabled by default */ transform-origin: center; } @keyframes icon-suction-spinIt { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } </style>
								<g class="icon-suction-spin">
								<g><path fill="#fff" d="M11.5 3.3q11.028 1.677 15.3 12a11.5 11.5 0 0 1 0.7 2.7q-0.029 1.579 -1.6 1.7 -0.783 -0.017 -1.3 -0.6 -1.652 -5.159 -5.5 -8.9a36 36 0 0 0 -3 -2A193.4 193.4 0 0 1 10.8 5.9q-0.7 -1.595 0.7 -2.6"/></g>
								<g><path fill="#fff" d="M15.1 15.9q2.612 -0.139 2.1 2.4 -7.225 7.8 -4.6 18.2 -0.15 0.55 -0.7 0.7 -1.794 0.578 -2.5 -1.1 -3.129 -11.855 5.7 -20.2"/></g>
								<g><path fill="#fff" d="M36.5 17.9q2.804 -0.05 2.1 2.6 -6.001 6.636 -15 6.4a20.26 20.26 0 0 1 -5.7 -0.7q-1.6 -1.4 0 -2.8 4.198 0.077 8.4 0 6.137 -0.9 10.2 -5.5"/></g>
								</g>
								</svg>\`},
                            { value: "Turbo", label: "Turbo", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								<style> .icon-suction-spin { animation: none; /* Disabled by default */ transform-origin: center; } @keyframes icon-suction-spinIt { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } </style>
								<g class="icon-suction-spin">
								<path fill="#fff" d="M23.9 1.9q1.638-.119 3.2.3 1.363 1.659-.4 2.8-7.819.132-11.9 6.7a70 70 0 0 0-2 5.6q-2.443 1.154-2.7-1.5Q12.047 3.903 23.9 1.9"/>
								<path fill="#fff" d="M22.5 10.5q11.479.726 14.7 11.8.7 2.59.2 5.2-1.223 1.06-2.6.2a65 65 0 0 0-1.4-6.2q-3.21-6.988-10.9-8.1-1.531-1.436 0-2.9"/>
								<path fill="#fff" d="M2.9 11.7q.83.089 1.5.6.393 3.965 2 7.6 1.75 2.95 4.7 4.7a35 35 0 0 0 5.6 2q1.447 2.161-1.1 2.9-11.87-1.97-14-13.8a9.9 9.9 0 0 1 0-2.8q.431-.883 1.3-1.2"/>
								<path fill="#fff" d="M26.7 22.3q2.88-.268 2.3 2.6-2.286 10.787-13.1 12.9a12.6 12.6 0 0 1-3.8-.1q-1.054-1.182-.2-2.5a50 50 0 0 0 6.6-1.6q6.339-3.214 7.5-10.3a5.4 5.4 0 0 1 .7-1"/>
								</g>
								</svg>\` },
                            { value: "Max", label: "Max", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								<style> .icon-suction-spin { animation: none; /* Disabled by default */ transform-origin: center; } @keyframes icon-suction-spinIt { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } </style>
								<g class="icon-suction-spin">
								<g><path fill="#fff" d="M22.1 0.5q1.936 -0.125 3.8 0.3 0.579 0.977 0.3 2.1 -0.396 0.596 -1.1 0.7Q18.302 3.872 14.6 9.5a130.8 130.8 0 0 0 -2 5.4q-1.139 0.787 -2.3 0 -0.459 -0.662 -0.4 -1.5 1.077 -8.55 9 -12a29.2 29.2 0 0 1 3.2 -0.9"/></g>
								<g><path fill="#fff" d="M2.9 6.5q1.918 -0.268 2.2 1.6 -1.975 6.472 2.1 11.8a47.2 47.2 0 0 0 4.6 3.6q0.692 2.908 -2.3 2.3Q2.571 22.504 1.2 14.9q-0.379 -3.565 0.6 -7 0.29 -0.936 1.1 -1.4"/></g>
								<g><path fill="#fff" d="M22.7 9.3q11.873 -0.694 15.9 10.4 0.3 2.599 -2.3 2.1A179.6 179.6 0 0 1 33.4 16.9Q30.544 13.647 26.3 12.8a39.6 39.6 0 0 1 -5.4 -0.4q-1.276 -1.399 0.2 -2.6 0.843 -0.235 1.6 -0.5"/></g>
								<g><path fill="#fff" d="M26.9 18.9q0.846 -0.076 1.6 0.3 3.057 4.48 2.3 9.9 -0.958 6.27 -6.1 9.9 -3.122 1.071 -2.5 -2.1 3.714 -2.908 5 -7.4a11.88 11.88 0 0 0 0.2 -3.8 59.8 59.8 0 0 0 -1.5 -5.3q0.099 -1.044 1 -1.5"/></g>
								<g><path fill="#fff" d="M19.5 27.3q2.434 -0.414 2.3 2 -4.225 5.287 -11.1 5.4 -4.784 -0.045 -8.6 -2.9 -1.577 -1.523 0 -3l0.6 -0.1a54.6 54.6 0 0 0 5.8 2.3q3.862 0.734 7.4 -1a24.28 24.28 0 0 0 3.6 -2.7"/></g>
								</g>
								</svg>\`},
                            { value: "MaxPlus", label: "Max Plus", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								<style> .icon-suction-spin { animation: none; /* Disabled by default */ transform-origin: center; } @keyframes icon-suction-spinIt { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } </style>
								<g class="icon-suction-spin">
								<g><path fill="#fff" d="M22.1 0.5q1.936 -0.125 3.8 0.3 0.579 0.977 0.3 2.1 -0.396 0.596 -1.1 0.7Q18.302 3.872 14.6 9.5a130.8 130.8 0 0 0 -2 5.4q-1.139 0.787 -2.3 0 -0.459 -0.662 -0.4 -1.5 1.077 -8.55 9 -12a29.2 29.2 0 0 1 3.2 -0.9"/></g>
								<g><path fill="#fff" d="M2.9 6.5q1.918 -0.268 2.2 1.6 -1.975 6.472 2.1 11.8a47.2 47.2 0 0 0 4.6 3.6q0.692 2.908 -2.3 2.3Q2.571 22.504 1.2 14.9q-0.379 -3.565 0.6 -7 0.29 -0.936 1.1 -1.4"/></g>
								<g><path fill="#fff" d="M22.7 9.3q11.873 -0.694 15.9 10.4 0.3 2.599 -2.3 2.1A179.6 179.6 0 0 1 33.4 16.9Q30.544 13.647 26.3 12.8a39.6 39.6 0 0 1 -5.4 -0.4q-1.276 -1.399 0.2 -2.6 0.843 -0.235 1.6 -0.5"/></g>
								<g><path fill="#fff" d="M26.9 18.9q0.846 -0.076 1.6 0.3 3.057 4.48 2.3 9.9 -0.958 6.27 -6.1 9.9 -3.122 1.071 -2.5 -2.1 3.714 -2.908 5 -7.4a11.88 11.88 0 0 0 0.2 -3.8 59.8 59.8 0 0 0 -1.5 -5.3q0.099 -1.044 1 -1.5"/></g>
								<g><path fill="#fff" d="M19.5 27.3q2.434 -0.414 2.3 2 -4.225 5.287 -11.1 5.4 -4.784 -0.045 -8.6 -2.9 -1.577 -1.523 0 -3l0.6 -0.1a54.6 54.6 0 0 0 5.8 2.3q3.862 0.734 7.4 -1a24.28 24.28 0 0 0 3.6 -2.7"/></g>
								</g>
								<g><path style="opacity:0.9" fill="#ff0000" d="M36.9 15.7a19.4 19.4 0 0 0 -2.5 -0.2q-1.171 0.004 -2.1 0.4a4.14 4.14 0 0 0 -1 -0.2q0.05 3.002 -0.1 6 -0.209 0.625 -0.7 1 -1.741 1.205 -3.8 0.6 -1.103 -0.453 -1.5 -1.6a11.4 11.4 0 0 1 -0.3 -2.4 18.8 18.8 0 0 0 0.1 -3.6q-3.03 0.083 -6.1 -0.3 -2.559 -1.268 -1.9 -4.1 0.42 -1.021 1.3 -1.7a39 39 0 0 1 6.6 -0.3v-5.6a11.86 11.86 0 0 1 1.4 -2.2q4.069 -1.565 5.1 2.6 -0.151 2.605 0.1 5.2 2.411 0.081 4.8 -0.2 3.966 0.827 2.9 4.8a7.2 7.2 0 0 1 -0.7 0.9 48.8 48.8 0 0 0 -1.6 0.9m-7.2 -5.6q-1.577 -0.367 -3 -1 -0.05 -2.702 0.1 -5.4 0.74 -1.313 2.1 -0.7 0.596 0.396 0.7 1.1 0.097 3.03 0.1 6m-9.4 1q0.05 1.057 1 1.5 2.913 0.053 5.8 0.4 1.514 0.309 2.8 1.1a5.52 5.52 0 0 0 -0.3 1q-0.15 2.698 -0.1 5.4a12.6 12.6 0 0 1 -1 -1.3q-0.886 -0.516 -1.8 -0.1 -0.167 -2.397 -0.3 -4.8 -1.392 -0.617 -2.9 -0.2a27.6 27.6 0 0 1 -4.2 -0.5q-1.694 -1.466 0.2 -2.6 0.428 -0.174 0.8 0.1m11.2 -0.2a44.8 44.8 0 0 1 5.6 0.3q1.298 1.513 -0.4 2.6 -0.49 0.148 -1 0.1a47.6 47.6 0 0 0 -4.2 -3"/></g>
								</svg>\` }
                        ],
                        Water: [
                            { value: "Low", label: "Low", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-drop-container { animation: none; /* Disabled by default */ transform-origin: center 10%; }
								    @keyframes icon-drop-wobble { 0%, 100% { transform: rotate(0.5deg) translateY(0); } 25% { transform: rotate(-0.7deg) translateY(-0.8px); } 50% { transform: rotate(2.3deg) translateY(0.5px); } 75% { transform: rotate(-2.2deg) translateY(0.4px); } }
								  </style>
								  <defs> <clipPath id="dropClip"> <path d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/> </clipPath> </defs>
								  <g class="icon-drop-container" clip-path="url(#dropClip)">
								    <path fill="#fff" d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/>
								  </g>
								</svg>\` },
							{ value: "Middle", label: "Middle", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-drop-container { animation: none; /* Disabled by default */ transform-origin: center 10%; }
									.icon-drop-wave { animation: none; /* Disabled by default */ } .icon-drop-wave-1 { animation-delay: -0.5s; }
								    @keyframes icon-drop-wobble { 0%, 100% { transform: rotate(0.5deg) translateY(0); } 25% { transform: rotate(-0.7deg) translateY(-0.8px); } 50% { transform: rotate(2.3deg) translateY(0.5px); } 75% { transform: rotate(-2.2deg) translateY(0.4px); } }
								    @keyframes icon-drop-wave { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-1px) scaleY(1.2); } }
								  </style>
								  <defs> <clipPath id="dropClip"> <path d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/> </clipPath> </defs>
								  <g class="icon-drop-container" clip-path="url(#dropClip)">
								    <path fill="#fff" d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/>
								    <path class="icon-drop-wave icon-drop-wave-1" fill="#fff" d="M21.3 28.5q3.568-.294 6.1 2.2.832 1.609-.9 1.5-1.775-1.687-4.2-2.1a380 380 0 0 1-6.6 2.5q-2.357.682-4.5-.5-.327-.924.5-1.4 1.664.538 3.4.3a2269 2269 0 0 1 6.2-2.5"/>
								  </g>
								</svg>\` },
                            { value: "High", label: "High", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-drop-container { animation: none; /* Disabled by default */ transform-origin: center 10%; }
									.icon-drop-wave { animation: none; /* Disabled by default */ } .icon-drop-wave-1 { animation-delay: -0.5s; } .icon-drop-wave-2 { animation-delay: -1.0s; }
								    @keyframes icon-drop-wobble { 0%, 100% { transform: rotate(0.5deg) translateY(0); } 25% { transform: rotate(-0.7deg) translateY(-0.8px); } 50% { transform: rotate(2.3deg) translateY(0.5px); } 75% { transform: rotate(-2.2deg) translateY(0.4px); } }
								    @keyframes icon-drop-wave { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-1px) scaleY(1.2); } }
								  </style>
								  <defs> <clipPath id="dropClip"> <path d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/> </clipPath> </defs>
								  <g class="icon-drop-container" clip-path="url(#dropClip)">
								    <path fill="#fff" d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/>
								    <path class="icon-drop-wave icon-drop-wave-1" fill="#fff" d="M21.3 22.7q3.805-.249 6.3 2.6.395 1.088-.7 1.4a30 30 0 0 0-2.4-1.7 9.2 9.2 0 0 0-2.2-.7 41 41 0 0 0-5 2.1q-2.137.808-4.4.6-.959-.119-1.7-.7-.223-.582.1-1.1 1.995.092 4 0a124 124 0 0 0 6-2.5"/>
								    <path class="icon-drop-wave icon-drop-wave-2" fill="#fff" d="M21.3 28.5q3.568-.294 6.1 2.2.832 1.609-.9 1.5-1.775-1.687-4.2-2.1a380 380 0 0 1-6.6 2.5q-2.357.682-4.5-.5-.327-.924.5-1.4 1.664.538 3.4.3a2269 2269 0 0 1 6.2-2.5"/>
								  </g>
								</svg>\` },
							{ value: "Ultra", label: "Ultra", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-drop-container { animation: none; /* Disabled by default */ transform-origin: center 10%; }
									.icon-drop-wave { animation: none; /* Disabled by default */ } .icon-drop-wave-1 { animation-delay: -0.5s; } .icon-drop-wave-2 { animation-delay: -1.0s; } .icon-drop-wave-3 { animation-delay: -1.5s; }
								    @keyframes icon-drop-wobble { 0%, 100% { transform: rotate(0.5deg) translateY(0); } 25% { transform: rotate(-0.7deg) translateY(-0.8px); } 50% { transform: rotate(2.3deg) translateY(0.5px); } 75% { transform: rotate(-2.2deg) translateY(0.4px); } }
								    @keyframes icon-drop-wave { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-1px) scaleY(1.2); } }
								  </style>
								  <defs> <clipPath id="dropClip"> <path d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/> </clipPath> </defs>
								  <g class="icon-drop-container" clip-path="url(#dropClip)">
								    <path fill="#fff" d="M18.5-.1h1q.71.385 1.3 1a146 146 0 0 0 3.2 8l6.6 11.6q2.994 7.552-1.6 14.2-2.553 2.854-6.2 4a1.26 1.26 0 0 1-.6-.2 3.2 3.2 0 0 1-1.1.7q-9.865.742-13.9-8.3-1.509-5.164.4-10.2l6.2-10.8a59.5 59.5 0 0 0 3.6-8.8q.408-.757 1.1-1.2m.6 1.6a179 179 0 0 0 4.1 9.6 359 359 0 0 1 5.8 9.8q3.413 8.19-2.9 14.3-6.727 4.882-13.6.2-6.855-6.473-2.9-15.1a150 150 0 0 0 7.2-12.8 318 318 0 0 1 2.3-6"/>
								    <path class="icon-drop-wave icon-drop-wave-1" fill="#fff" d="M21.9 16.9q3.432.041 5.7 2.6-.188 2.486-1.9.5-2.234-1.879-5-1-3.665 2.389-8 2.2-1.893-.083-1.4-1.8 1.416-.081 2.8.3a26 26 0 0 1 1.4-.3q3.138-1.523 6.4-2.5"/>
								    <path class="icon-drop-wave icon-drop-wave-2" fill="#fff" d="M21.3 22.7q3.805-.249 6.3 2.6.395 1.088-.7 1.4a30 30 0 0 0-2.4-1.7 9.2 9.2 0 0 0-2.2-.7 41 41 0 0 0-5 2.1q-2.137.808-4.4.6-.959-.119-1.7-.7-.223-.582.1-1.1 1.995.092 4 0a124 124 0 0 0 6-2.5"/>
								    <path class="icon-drop-wave icon-drop-wave-3" fill="#fff" d="M21.3 28.5q3.568-.294 6.1 2.2.832 1.609-.9 1.5-1.775-1.687-4.2-2.1a380 380 0 0 1-6.6 2.5q-2.357.682-4.5-.5-.327-.924.5-1.4 1.664.538 3.4.3a2269 2269 0 0 1 6.2-2.5"/>
								  </g>
								</svg>\` }

                        ],
                        Route: [
                            { value: "Quick", label: "Quick", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-route-path { animation: none; /* Disabled by default */  stroke: #fff; stroke-width: 0.5; }
								    .icon-route-path1 { animation-delay: 0.5s; }
								    @keyframes icon-route-draw { 0% { stroke-dashoffset: 1000; fill-opacity: 0; } 30% { stroke-dashoffset: 0; fill-opacity: 1; } 100% { stroke-dashoffset: 0; fill-opacity: 1; } }
								  </style>
								  <path class="icon-route-path1 icon-route-path" fill="#fff" d="M23.5 5.9q3.876-.657 6.7 2a12 12 0 0 1 1 1.8 486 486 0 0 1 .3 23.8h-2.2a625 625 0 0 1 .2-22.3q-.853-3.2-4.2-3.5-3.033.186-4.1 3L21 27.9q-.1 4.251-4.1 5.7-4.413 1.262-7.5-2.1-.791-1.072-1-2.4a1300 1300 0 0 1-.1-22.8h2.2q-.05 11 .1 22 1.109 4.781 5.9 3.5 1.668-.769 2.3-2.5.005-5.348-.1-10.7-.03-4.16.3-8.3 1.029-3.479 4.5-4.4"/>
								</svg>\` },
                            { value: "Standard", label: "Standard", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-route-path { animation: none; /* Disabled by default */  stroke: #fff; stroke-width: 0.5; }
								    .icon-route-path1 { animation-delay: 0.5s; }
								    .icon-route-path2 { animation-delay: 1s; }
								    @keyframes icon-route-draw { 0% { stroke-dashoffset: 1000; fill-opacity: 0; } 30% { stroke-dashoffset: 0; fill-opacity: 1; } 100% { stroke-dashoffset: 0; fill-opacity: 1; } }
								  </style>
								  <path class="icon-route-path1 icon-route-path" fill="#fff" d="M6.1 4.5q13.7-.05 27.4.1 1.257.357 1.3 1.7.2 13.4 0 26.8-.07.971-.9 1.5-14 .2-28 0a1.4 1.4 0 0 1-.7-.5A508 508 0 0 1 5 5.7q.408-.757 1.1-1.2m.6 1.6h26.4v27H6.7z"/>
								  <path class="icon-route-path2 icon-route-path" fill="#fff" d="M24.1 7.1q6.728.229 6.4 7a420 420 0 0 0-.2 18h-2q.05-10.501-.1-21-2.971-4.009-6.6-.6a4.1 4.1 0 0 0-.6 1.6l-.2 15.6q-.759 4.757-5.6 4.8-4.433.066-5.6-4.2Q9.45 18 9.5 7.7h2q-.05 10.1.1 20.2.645 2.83 3.6 3 2.336-.238 3.6-2.2l.2-16.6q.737-4.387 5.1-5"/>
								</svg>\` },
                            { value: "Intensive", label: "Intensive", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-route-path { animation: none; /* Disabled by default */  stroke: #fff; stroke-width: 0.5; }
								    .icon-route-path1 { animation-delay: 0.5s; }
								    .icon-route-path2 { animation-delay: 1s; }
								    @keyframes icon-route-draw { 0% { stroke-dashoffset: 1000; fill-opacity: 0; } 30% { stroke-dashoffset: 0; fill-opacity: 1; } 100% { stroke-dashoffset: 0; fill-opacity: 1; } }
								  </style>
								  <path class="icon-route-path1 icon-route-path" fill="#fff" d="M5.9 4.1q13.8-.05 27.6.1.549.082.9.5.664 10.681.7 21.4l-.1 6.8q-.02 1.519-1.5 1.7a701 701 0 0 1-26.8.4q-1.196-.07-1.7-1.1a1409 1409 0 0 1-.5-21.7q-.009-3.458.3-6.9.408-.757 1.1-1.2m.8 2h26.2v26.8H6.7z"/>
								  <path class="icon-route-path2 icon-route-path" fill="#fff" d="M19.7 6.9q2.454-.123 4.2 1.6a4.7 4.7 0 0 1 .5 1.2 308 308 0 0 1 .6 18.8q.634 2.644 3 1.4a7.3 7.3 0 0 0 .8-2.2L29 8.1q.8-1.2 2-.4a304 304 0 0 1 .2 20.6 6 6 0 0 1-.6 2.4l-2.3 1.5q-4.466.996-5.7-3.3a795 795 0 0 1-.4-16.8q-.003-2.108-1.7-3.2-1.924.575-1.9 2.6l-.2 17q-.69 4.079-4.9 4-2.049-.372-3.8-1.6a5.2 5.2 0 0 1-.7-1 32 32 0 0 1-.6-6 167 167 0 0 1 .2-16.2q1.434-.768 2.6.4l.2 19.2q.121 1.691 1.3 2.9 2.083.717 3.3-1.1.239-9.911.8-19.8a3 3 0 0 1 .3-.9q1.231-.914 2.6-1.5"/>
								</svg>\` },
                            { value: "Deep", label: "Deep", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .icon-route-path { animation: none; /* Disabled by default */  stroke: #fff; stroke-width: 0.5; }
								    .icon-route-path1 { animation-delay: 0.5s; }
								    .icon-route-path2 { animation-delay: 1s; }
									.icon-route-path3 { animation-delay: 1.6s; }
								    @keyframes icon-route-draw { 0% { stroke-dashoffset: 1000; fill-opacity: 0; } 30% { stroke-dashoffset: 0; fill-opacity: 1; } 100% { stroke-dashoffset: 0; fill-opacity: 1; } }
								  </style>
								  <path class="icon-route-path1 icon-route-path" fill="#fff" d="M6.3 4.3q13.7-.05 27.4.1a2.3 2.3 0 0 1 .9.7 615 615 0 0 1 .5 21.5l-.1 6.7q-.155.76-.7 1.3a1190 1190 0 0 1-24.5.5L6.7 35q-.887-.069-1.5-.7a530 530 0 0 1-.4-28.2q.274-1.322 1.5-1.8m.4 1.8h26.4v27H6.7z"/>
								  <path class="icon-route-path2 icon-route-path" fill="#fff" d="M20 7q4 0 4.3 3.8.012 9.112.4 18.2 1.394 2.673 3.8.8.623-1.018.7-2.2h1.6a18 18 0 0 1-.5 2.6q-1.3 1.8-3.4 2-3.639-.718-4-4.4l-.2-16.6Q22.366 9.733 21 9q-2.531-.508-3 2v18.1q0 2.9-4.3 3.4-2.7-.5-3.9-2a10 10 0 0 1-.6-1.8A299 299 0 0 1 9 8.1q.9-.8 1.8 0l.2 19.8q2 4.1 5 1.1a3.6 3.6 0 0 0 0-1V11a8.6 8.6 0 0 1 1-3q1-1 3-1"/>
								  <path class="icon-route-path3 icon-route-path" fill="#fff" d="M29.9 7.7q.493-.064.9.2c.067 4.467.133 8.933.2 13.7h1.6c.2 0 .2 0 0 .4s-.4 1-.8 1.8l-.6 1.2c-1.2 1.6-1.2.4-1.7 0-.5-.8-.9-1.8-1.3-2.6-.2-.4-.2-.6-.3-.9h1.6q-.05-6.701.1-13.4q.215-.163.3-.4"/>
								</svg>\` }
                        ],
                        Repeat: [
                            { value: "1", label: "1x", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .repeatpath3 { animation: none; /* Disabled by default */ }
								    .repeatpath2 { animation: none; /* Disabled by default */ }
								    .repeatpath1 { animation: none; /* Disabled by default */ }
								    .repeatnumber { fill: #fff; animation: none; /* Disabled by default */ transform-origin: center; }
								    @keyframes draw-and-hide { 0% { stroke-dashoffset: 40; opacity: 0; } 25% { stroke-dashoffset: 40; opacity: 0; } 50% { stroke-dashoffset: 80; opacity: 1; } 75% { stroke-dashoffset: 80; opacity: 1; fill: #fff; } 100% { stroke-dashoffset: 40; opacity: 1; fill: none; } }
								    @keyframes repeatfloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-2px) rotate(0.3deg); } 50% { transform: translateY(1px) rotate(-0.2deg); } 75% { transform: translateY(-1px) rotate(0.1deg); } }
								  </style>
								  <g>
								    <path class="repeatpath1" fill="#fff" stroke="#fff" stroke-width="0.7" d="M24.5 2.9q1.718-.234 2 1.5-.472 1.573-2 2.2a194 194 0 0 0 12 .4l.3.3a27.7 27.7 0 0 1 0 8q-.873.868-2.1.5a2.3 2.3 0 0 1-.7-.9q-.15-2.698-.1-5.4-4.704-.027-9.4-.1 1.266.816 2 2.1-.653 2.015-2.4.9a41 41 0 0 1-3.5-3.3q-.437-.86-.2-1.8a42.5 42.5 0 0 0 4.1-4.4"/>
								    <path class="repeatpath2" fill="#fff" stroke="#fff" stroke-width="0.7" d="M34.9 23.3q.707-.049 1.4.1.35.15.5.5a59 59 0 0 1-.1 8.4q-.463.374-.9 0l.3.3q-3.6.2-7.2 0-2.043-1.403.2-2.6 2.698-.15 5.4-.1-.05-2.802.1-5.6.308-.656.9-1"/>
								    <path class="repeatpath3" fill="#fff" stroke="#fff" stroke-width="0.7" d="M3.7 25.9a8.2 8.2 0 0 1 1.8.1l.3.3q.15 1.797.1 3.6 6.601.05 13.2-.1-1.284-.733-1.8-2.1.348-1.677 2-1.1a51 51 0 0 1 3.9 3.7q.6 1 0 2a50 50 0 0 0-3.7 3.9q-2.81.608-1.9-2.1.672-.871 1.7-1.3l-15.2-.2a1.46 1.46 0 0 0-.6-.4 29.5 29.5 0 0 1-.1-5.9q.215-.163.3-.4"/>
								    <path class="repeatnumber" fill="#fff" d="M11.3 1.7q.493-.064.9.2l.2 19.8a24 24 0 0 0 3.9.6v1.6h-12a3.1 3.1 0 0 1 .2-1.4 236 236 0 0 0 3.9-1q.25-8.002-.1-16a49 49 0 0 0-4.2-.3q-.323-.518-.1-1.1 1.437-.88 3.1-1.3a99 99 0 0 1 4.2-1.1"/>
								  </g>
								</svg>\` },
                            { value: "2", label: "2x", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .repeatpath3 { animation: none; /* Disabled by default */ }
								    .repeatpath2 { animation: none; /* Disabled by default */ }
								    .repeatpath1 { animation: none; /* Disabled by default */ }
								    .repeatnumber { fill: #fff; animation: none; /* Disabled by default */ transform-origin: center; }
								    @keyframes draw-and-hide { 0% { stroke-dashoffset: 40; opacity: 0; } 25% { stroke-dashoffset: 40; opacity: 0; } 50% { stroke-dashoffset: 80; opacity: 1; } 75% { stroke-dashoffset: 80; opacity: 1; fill: #fff; } 100% { stroke-dashoffset: 40; opacity: 1; fill: none; } }
								    @keyframes repeatfloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-2px) rotate(0.3deg); } 50% { transform: translateY(1px) rotate(-0.2deg); } 75% { transform: translateY(-1px) rotate(0.1deg); } }
								  </style>
								  <g>
								    <path class="repeatpath1" fill="#fff" stroke="#fff" stroke-width="0.7" d="M24.5 2.9q1.718-.234 2 1.5-.472 1.573-2 2.2a194 194 0 0 0 12 .4l.3.3a27.7 27.7 0 0 1 0 8q-.873.868-2.1.5a2.3 2.3 0 0 1-.7-.9q-.15-2.698-.1-5.4-4.704-.027-9.4-.1 1.266.816 2 2.1-.653 2.015-2.4.9a41 41 0 0 1-3.5-3.3q-.437-.86-.2-1.8a42.5 42.5 0 0 0 4.1-4.4"/>
								    <path class="repeatpath2" fill="#fff" stroke="#fff" stroke-width="0.7" d="M34.9 23.3q.707-.049 1.4.1.35.15.5.5a59 59 0 0 1-.1 8.4q-.463.374-.9 0l.3.3q-3.6.2-7.2 0-2.043-1.403.2-2.6 2.698-.15 5.4-.1-.05-2.802.1-5.6.308-.656.9-1"/>
								    <path class="repeatpath3" fill="#fff" stroke="#fff" stroke-width="0.7" d="M3.7 25.9a8.2 8.2 0 0 1 1.8.1l.3.3q.15 1.797.1 3.6 6.601.05 13.2-.1-1.284-.733-1.8-2.1.348-1.677 2-1.1a51 51 0 0 1 3.9 3.7q.6 1 0 2a50 50 0 0 0-3.7 3.9q-2.81.608-1.9-2.1.672-.871 1.7-1.3l-15.2-.2a1.46 1.46 0 0 0-.6-.4 29.5 29.5 0 0 1-.1-5.9q.215-.163.3-.4"/>
								    <path class="repeatnumber" fill="#fff" d="M10.5 1.7q4.267-.497 6.9 2.8 1.528 3.686-.4 7.2l-1.6 2.4A105 105 0 0 1 7.9 22a68 68 0 0 0 7.4 0 51 51 0 0 0 1.7-3.3q.852-.601 1.9-.3a1 1 0 0 1 .2.5 103 103 0 0 0-.5 5.2q-7.682.596-15.5.4a6.4 6.4 0 0 1 .3-2.4 149 149 0 0 0 8.8-9.6q2.071-2.808 1.4-6.2-1.489-2.866-4.7-2.1-.38.093-.7.3-1.051 2.155-2.1 4.3a12 12 0 0 1-2.2.1q.018-2.521.4-5 2.899-1.766 6.2-2.2"/>
								  </g>
								</svg>\` },
                            { value: "3", label: "3x", svg: \`<svg class="mode-option-buttons-svg" width="40" height="40" style="fill-rule:evenodd" viewBox="0 0 40 40">
								  <style>
								    .repeatpath3 { animation: none; /* Disabled by default */ }
								    .repeatpath2 { animation: none; /* Disabled by default */ }
								    .repeatpath1 { animation: none; /* Disabled by default */ }
								    .repeatnumber { fill: #fff; animation: none; /* Disabled by default */ transform-origin: center; }
								    @keyframes draw-and-hide { 0% { stroke-dashoffset: 40; opacity: 0; } 25% { stroke-dashoffset: 40; opacity: 0; } 50% { stroke-dashoffset: 80; opacity: 1; } 75% { stroke-dashoffset: 80; opacity: 1; fill: #fff; } 100% { stroke-dashoffset: 40; opacity: 1; fill: none; } }
								    @keyframes repeatfloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-2px) rotate(0.3deg); } 50% { transform: translateY(1px) rotate(-0.2deg); } 75% { transform: translateY(-1px) rotate(0.1deg); } }
								  </style>
								  <g>
								    <path class="repeatpath1" fill="#fff" stroke="#fff" stroke-width="0.7" d="M24.5 2.9q1.718-.234 2 1.5-.472 1.573-2 2.2a194 194 0 0 0 12 .4l.3.3a27.7 27.7 0 0 1 0 8q-.873.868-2.1.5a2.3 2.3 0 0 1-.7-.9q-.15-2.698-.1-5.4-4.704-.027-9.4-.1 1.266.816 2 2.1-.653 2.015-2.4.9a41 41 0 0 1-3.5-3.3q-.437-.86-.2-1.8a42.5 42.5 0 0 0 4.1-4.4"/>
								    <path class="repeatpath2" fill="#fff" stroke="#fff" stroke-width="0.7" d="M34.9 23.3q.707-.049 1.4.1.35.15.5.5a59 59 0 0 1-.1 8.4q-.463.374-.9 0l.3.3q-3.6.2-7.2 0-2.043-1.403.2-2.6 2.698-.15 5.4-.1-.05-2.802.1-5.6.308-.656.9-1"/>
								    <path class="repeatpath3" fill="#fff" stroke="#fff" stroke-width="0.7" d="M3.7 25.9a8.2 8.2 0 0 1 1.8.1l.3.3q.15 1.797.1 3.6 6.601.05 13.2-.1-1.284-.733-1.8-2.1.348-1.677 2-1.1a51 51 0 0 1 3.9 3.7q.6 1 0 2a50 50 0 0 0-3.7 3.9q-2.81.608-1.9-2.1.672-.871 1.7-1.3l-15.2-.2a1.46 1.46 0 0 0-.6-.4 29.5 29.5 0 0 1-.1-5.9q.215-.163.3-.4"/>
								    <path class="repeatnumber" fill="#fff" d="M10.1 1.7q3.863-.598 6.7 2 2.777 4.927-1.5 8.6 4.408 2.319 3.1 7.2-1.265 4.063-5.5 4.7-4.41.698-8.2-1.6a2.3 2.3 0 0 1-.7-.9 371 371 0 0 0-.3-3.5 4 4 0 0 1 .2-1.2q.978-.235 1.9.1L8 21.5q2.087.912 4.3.3 2.779-1.524 2.1-4.7-.314-2.614-2.9-3.1l-2.4-.2q-.382-1.228.2-2.4 2.189.209 3.9-1.1 1.643-3.113-.7-5.7-1.733-.718-3.6-.4a69 69 0 0 0-2.4 4.4q-1.077.237-2.1-.1.032-2.417.5-4.8 2.425-1.54 5.2-2"/>
								  </g>
								</svg>\` }
                        ]
                    };

					// Initialize cleaning UI (runs once on page load)
					function initializeCleaningUI() {
					    const container = document.querySelector('.settings-container');
					    container.innerHTML = '';

					    // Create all possible option groups and buttons initially
					    Object.keys(VisCleaningOptions).forEach(optionType => {
					        const group = document.createElement('div');
					        group.className = 'option-group';
					        group.dataset.optionType = optionType;
					        group.style.display = 'none'; // Hide by default

					        // Add option title
					        const title = document.createElement('div');
					        title.className = 'option-title';
					        title.textContent = optionType.toUpperCase();
					        group.appendChild(title);

					        // Create button container div
					        const buttonContainer = document.createElement('div');
					        buttonContainer.className = 'option-buttons-container';

					        // Store button container reference
					        modeOptionButtons[optionType] = buttonContainer;

					        // Create all possible buttons for this option type
					        VisCleaningOptions[optionType].forEach(opt => {
					            const btn = document.createElement('button');
					            btn.className = 'mode-option-buttons';
					            btn.dataset.optionType = optionType;
					            btn.dataset.value = opt.value;
					            btn.style.display = 'none'; // Hide by default

					            btn.innerHTML = '<i> ' + opt.svg + '</i>';
					            buttonContainer.appendChild(btn);

					            btn.addEventListener('click', handleOptionClick);
					        });

					        group.appendChild(buttonContainer);
					        container.appendChild(group);
					    });

					    // Set initial mode
					    switchCleaningMode(VisCleaningState.mode || "Sweeping");
					}

					// Switch between cleaning modes
					function switchCleaningMode(newMode) {
					    VisCleaningState.mode = newMode;
					    const modeConfig = VisCleaningModes[newMode];

					    // Show/hide option groups based on current mode
					    Object.keys(VisCleaningOptions).forEach(optionType => {
					        const shouldShow = modeConfig.options.includes(optionType);
					        document.querySelector('.option-group[data-option-type="' + optionType + '"]')
					            .style.display = shouldShow ? 'flex' : 'none';
					    });

					    // Show/hide individual buttons based on activeModes
					    Object.keys(VisCleaningOptions).forEach(optionType => {
					        const buttonContainer = modeOptionButtons[optionType];
					        Array.from(buttonContainer.children).forEach(btn => {
					            const optionValue = btn.dataset.value;
					            const optionKey = optionType + optionValue;
					            const shouldShow = modeConfig.activeModes.includes(optionKey);
					            btn.style.display = shouldShow ? 'block' : 'none';
					        });
					    });

					    // Restore last settings for this mode
					    Object.keys(modeConfig.lastSettings).forEach(opt => {
					        VisCleaningState[opt] = modeConfig.lastSettings[opt];
					    });

					    updateButtonStates();
					    updateSummaryDisplay();
					}

                    // Handle option button clicks
                    function handleOptionClick(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        const btn = e.currentTarget;
                        const optionType = btn.dataset.optionType;
                        const value = btn.dataset.value;

                        // Update state
                        VisCleaningState[optionType] = value;
                        VisCleaningModes[VisCleaningState.mode].lastSettings[optionType] = value;

                        // Update UI
                        updateButtonStates();
                        updateSummaryDisplay();
                        handleInteraction(); // Reset menu timeout
                    }

                    // Update active states of all buttons
                    function updateButtonStates() {
                        document.querySelectorAll('.mode-option-buttons').forEach(btn => {
                            const optionType = btn.dataset.optionType;
                            const isActive = VisCleaningState[optionType] === btn.dataset.value;
                            btn.classList.toggle('active', isActive);
                        });
                    }

                    // Update the summary display
                    function updateSummaryDisplay() {
                        const modeName = VisCleaningState.mode ? VisCleaningModes[VisCleaningState.mode].name : "-";
                        document.getElementById('mode-summary').textContent = modeName;
                        document.getElementById('suction-summary').textContent = VisCleaningState.Suction || "-";
                        document.getElementById('water-summary').textContent = VisCleaningState.Water || "-";
                        document.getElementById('route-summary').textContent = VisCleaningState.Route || "-";
                        document.getElementById('repeat-summary').textContent = VisCleaningState.Repeat || "-";

                        // Automatically display summary tooltip when settings change
                        if (document.getElementById('clean-menu').classList.contains('active')) {
                            document.getElementById('summary-tooltip').classList.add('active');
                        }
						console.log("Selected cleaning Mode:", VisCleaningState);
						document.getElementById('current-mode-display').textContent = VisCleaningState.mode ? VisCleaningModes[VisCleaningState.mode].name : "Not selected";
                    }

                    // Initialize menu
                    function initCleaningMenu() {
                        initializeCleaningUI();

                    	// Mode selection buttons
                        document.querySelectorAll('[data-mode]').forEach(btn => {
                            btn.addEventListener('click', function() {
                                switchCleaningMode(this.dataset.mode);

                                // Highlight active mode
                                document.querySelectorAll('.mode-option').forEach(b => {
                                    b.classList.remove('active');
                                });
                                this.classList.add('active'); // IMPORTANT: Activates the clicked button
                            });
                        });

                        // Set first button as active (sweeping)
                        const sweepingBtn = document.querySelector('[data-mode="Sweeping"]');
                        if (sweepingBtn) sweepingBtn.classList.add('active');
                    }

					// =============================================
                    // Changing the map settings
                    // =============================================
                    // Initialize color map for click detection
                    function initializeColorMap() {
                        // Clear canvas
                        colorMapCtx.clearRect(0, 0, canvasSize, canvasSize);

                        // Draw rooms with their unique colors
                        ${elements.rooms.map(room => {
    const color = ColorsItems[room.room_id % ColorsItems.length];
    const walls = room.walls.map(w => toCanvas(w.beg_pt_x, w.beg_pt_y));
    const pathData = walls.map(([x,y], i) => (i === 0 ? 'M' : 'L') + x + ' ' + y).join(' ') + ' Z';

    return `
                                colorMapCtx.fillStyle = '${color}';
                                colorMapCtx.beginPath();
                                ${walls.map(([x,y], i) => (i === 0 ? 'colorMapCtx.moveTo(' + x + ',' + y + ');' : 'colorMapCtx.lineTo(' + x + ',' + y + ');')).join(' ')}
                                colorMapCtx.closePath();
                                colorMapCtx.fill();`;
						    }).join('')}

                        // Draw carpets with their unique colors
                        ${Object.entries(elements.carpets).map(([id, rect]) => {
    const color = ColorsCarpet[id % ColorsCarpet.length];
    const [x1, y1, x2, y2] = rect;

    // Transform all four corners
    const [tx1, ty1] = toCanvas(x1, y1);
    const [tx2, ty2] = toCanvas(x2, y1);
    const [tx3, ty3] = toCanvas(x2, y2);
    const [tx4, ty4] = toCanvas(x1, y2);

    // Draw as polygon to handle rotation correctly
    return `
                                colorMapCtx.fillStyle = '${color}';
                                colorMapCtx.beginPath();
                                colorMapCtx.moveTo(${tx1}, ${ty1});
                                colorMapCtx.lineTo(${tx2}, ${ty2});
                                colorMapCtx.lineTo(${tx3}, ${ty3});
                                colorMapCtx.lineTo(${tx4}, ${ty4});
                                colorMapCtx.closePath();
                                colorMapCtx.fill();`;
  }).join('')}

					}

					// Change and reloading map size
					document.getElementById('map-size-range').addEventListener('change', function() {
                        const newSize = Math.min(2048, Math.max(256, parseInt(this.value)));
						const minSize = 256;
						const maxSize = 2048;

						if (isNaN(newSize) || newSize < minSize || newSize > maxSize) {
							console.error('Invalid size:', newSize);
							showNotification('Reload failed', 'Invalid size ' + newSize + '. Keeping current.');
                            return;
						}
                        // Save new map size
                        vis.conn._socket.emit('setState', '${prefix}.map.MapSize${DH_CurMap}', {
                            val: newSize,
                            ack: false,
                            from: 'vis'
                        }, (err) => {
                            if (err) {
                                console.error('Size save error:', err);
                                showNotification('Save failed', 'error');
                                return;
                            }

                            // Trigger map reload
                            vis.conn._socket.emit('setState', '${prefix}.map.NewMap', {
                                val: true,
                                ack: false,
                                from: 'vis'
                            }, (reloadErr) => {
                                if (reloadErr) {
                                    console.error('Reload error:', reloadErr);
                                    showNotification('Reload failed', 'error');
                                    return;
                                }

                                showNotification('Reloading map...');
                            });
                        });
                    });

                    // Centered notification helper function
                    function showNotification(message, type = 'success', options = {}) {
                        // Remove existing notifications
                        const existingNotifs = document.querySelectorAll('.centered-notification');
                        if (options.removeExisting !== false && existingNotifs.length > 0) {
                            existingNotifs.forEach(notif => {
                                notif.style.opacity = '0';
                                setTimeout(() => notif.remove(), 300);
                            });
                        }

                        // Create notification element
                        const notification = document.createElement('div');
                        notification.className = 'centered-notification ' + type;

                        const typeStyles = {
                            success: { bg: '#4CAF50', icon: '&#10004;' },
                            error: { bg: '#ff4444', icon: '&#10008;' },
                            warning: { bg: '#FF9800', icon: '&#9888;' },
                            info: { bg: '#2196F3', icon: 'i' }
                        };

                        const style = typeStyles[type] || typeStyles.success;

                        Object.assign(notification.style, {
                            position: 'fixed',
                            bottom: '20px',
                            left: '50%',
                            transform: 'translateX(-50%) translateY(20px)',
                            padding: '12px 24px',
                            background: style.bg,
                            color: 'white',
                            borderRadius: '5px',
                            zIndex: '10000',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            opacity: '0',
                            maxWidth: '90%',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        });

                        notification.innerHTML =
                            '<span class="notification-icon" style="' +
                                'font-weight: bold;' +
                                'font-size: 16px;' +
                            '">' + style.icon + '</span>' +
                            '<span class="notification-text" style="' +
                                'flex: 1;' +
                                'overflow: hidden;' +
                                'text-overflow: ellipsis;' +
                            '">' + message + '</span>' +
                            (options.persistent ? '' : (
                                '<span class="notification-close" style="' +
                                    'margin-left: 15px;' +
                                    'cursor: pointer;' +
                                    'font-size: 18px;' +
                                    'opacity: 0.8;' +
                                    'transition: opacity 0.2s;' +
                                '">&times;</span>'
                            ));

                        document.body.appendChild(notification);

                        // Trigger animation
                        setTimeout(() => {
                            notification.style.opacity = '1';
                            notification.style.transform = 'translateX(-50%) translateY(0)';
                        }, 10);

                        const closeBtn = notification.querySelector('.notification-close');
                        if (closeBtn) {
                            closeBtn.addEventListener('click', () => {
                                notification.style.opacity = '0';
                                setTimeout(() => notification.remove(), 300);
                            });
                            closeBtn.addEventListener('mouseover', () => {
                                closeBtn.style.opacity = '1';
                            });
                            closeBtn.addEventListener('mouseout', () => {
                                closeBtn.style.opacity = '0.8';
                            });
                        }

                        // Automatic closing
                        if (!options.persistent) {
                            const duration = options.duration || 3000;
                            setTimeout(() => {
                                notification.style.opacity = '0';
                                setTimeout(() => notification.remove(), 300);
                            }, duration);
                        }

                        if (options.onClick) {
                            notification.style.cursor = 'pointer';
                            notification.addEventListener('click', options.onClick);
                        }
                    }

					document.getElementById('map-size-range').addEventListener('input', function() {
                        document.getElementById('map-size-value').textContent = parseInt(this.value) + 'px';
                    });

                    // Update slider values
                    function updateSliderValues() {
                        document.getElementById('x-rotation-value').textContent = xRotation + '°';
                        document.getElementById('y-rotation-value').textContent = yRotation + '°';
                        document.getElementById('z-rotation-value').textContent = zRotation + '°';
                        document.getElementById('perspective-value').textContent = perspective;
                    }

					// Update CSS 3D transformation
                    function updateTransformation() {
                        const zoomScale = zoomLevel / 100;
                        let transform = '';
                        transform += 'perspective(' + perspective + 'px) ';
                        transform += 'rotateX(' + xRotation + 'deg) ';
                        transform += 'rotateY(' + yRotation + 'deg) ';
                        transform += 'rotateZ(' + zRotation + 'deg)';
                        transform += 'scale(' + zoomScale + ')';
                        transform += 'translate(' + xPosition + 'px, ' + yPosition + 'px)';
                        mapContent.style.transform = transform;
                    }

                    const debouncedStabilizeLabels = debounce(stabilizeLabels, 500); // e.g. 500ms delay

					function debounce(func, delay) {
                        let timeout;
                        return function(...args) {
                            clearTimeout(timeout);
                            timeout = setTimeout(() => func.apply(this, args), delay);
                        };
                    }

					// Change background color
					document.getElementById('bg-color-picker').addEventListener('input', function(e) {
                        document.documentElement.style.setProperty('--map-background-color', e.target.value);
					});

					// Set default value
					document.documentElement.style.setProperty('--map-background-color', '#ffffff');

                    document.getElementById('x-rotation').addEventListener('input', function() {
                        xRotation = parseInt(this.value);
                        updateTransformation();
                        updateSliderValues();
						debouncedStabilizeLabels();
                    });

                    document.getElementById('y-rotation').addEventListener('input', function() {
                        yRotation = parseInt(this.value);
                        updateTransformation();
                        updateSliderValues();
						debouncedStabilizeLabels();
                    });

                    document.getElementById('z-rotation').addEventListener('input', function() {
                        zRotation = parseInt(this.value);
                        updateTransformation();
                        updateSliderValues();
						debouncedStabilizeLabels();
                    });

                    document.getElementById('perspective').addEventListener('input', function() {
                        perspective = parseInt(this.value);
                        updateTransformation();
                        updateSliderValues();
						debouncedStabilizeLabels();
                    });

					document.getElementById('zoom-level').addEventListener('input', function() {
                        zoomLevel = parseInt(this.value);
                        updateTransformation();
                        document.getElementById('zoom-value').textContent = zoomLevel + '%';
						debouncedStabilizeLabels();
					});

					document.getElementById('x-position').addEventListener('input', function() {
                        xPosition = parseInt(this.value);
                        updateTransformation();
                        document.getElementById('x-position-value').textContent = xPosition + 'px';
						debouncedStabilizeLabels();
					});

					document.getElementById('y-position').addEventListener('input', function() {
                        yPosition = parseInt(this.value);
                        updateTransformation();
                        document.getElementById('y-position-value').textContent = yPosition + 'px';
						debouncedStabilizeLabels();
					});

                    document.getElementById('reset-selection-btn').addEventListener('click', () => {
						document.getElementById('reset-selection-btn').classList.toggle('active', true);
                        selectedRooms.forEach(id => document.getElementById('room-' + id)?.classList.remove('selected'));
                        selectedCarpets.forEach(id => document.getElementById('carpet-' + id)?.classList.remove('selected'));
                        selectedRooms = [];
                        selectedCarpets = [];
                        document.getElementById('current-room').textContent = '-';
						debouncedSaveSettings();

                        setTimeout(() => {
                            document.getElementById('reset-selection-btn').classList.toggle('active', false);
                        }, 300); // 500ms Animation
                    });

                    document.getElementById('reset-view-btn').addEventListener('click', function() {
                        xRotation = 0;
                        yRotation = 0;
                        zRotation = 0;
                        perspective = 1200;
                        zoomLevel = 100;
                        xPosition = 0;
                        yPosition = 0;

                        document.getElementById('x-rotation').value = 0;
                        document.getElementById('y-rotation').value = 0;
                        document.getElementById('z-rotation').value = 0;
                        document.getElementById('perspective').value = 1200;
                        document.getElementById('zoom-level').value = 100;
                        document.getElementById('zoom-value').textContent = '100%';
                        document.getElementById('x-position').value = 0;
                        document.getElementById('y-position').value = 0;
                        document.getElementById('x-position-value').textContent = '0px';
                        document.getElementById('y-position-value').textContent = '0px';

                        updateTransformation();
                        updateSliderValues();
                        debouncedStabilizeLabels();
                    });

					function sendStartCleaning() {
					    if (selectedRooms.length > 0) {
					        console.log("Start cleaning in rooms:", selectedRooms);
					    }
					    if (selectedCarpets.length > 0) {
					        console.log("Consider carpets:", selectedCarpets);
					    }
					}


					// =============================================
					// customeClean Room Settings Radial Menu logic
					// =============================================

					// Global variables
					let currentRoomId = null;
					let activeMainOption = null;
					let isMenuOpen = false;
					let radialMenu = null;
					let lastRoomId = null;
					let autoCloseTimeout = null; // for automatic closing
					let actionDetected = false; // Flag to track if any action has been detected
					const orderIconsCache = {}; // Global cache object for order icons
					let mainOptions = [];

					// Initialize menu with Order options
					async function initializeMenu() {
					    try {
					        const options = await getMainOptions();
					        mainOptions = options;
					    } catch (error) {
					        console.error('Menu initialization failed:', error);
					    }
					}

					// Get all main options including Order
					async function getMainOptions() {
					    const orderOptions = await getOrderOptions();

					    return [
					        {
					            name: 'Order',
					            icon: generateOrderIcon(1, orderOptions.length),
					            options: orderOptions
					        },
					        {
					            name: 'Mode',
					            icon: '',
					            options: Object.keys(VisCleaningModes).map(key => ({
					                value: key,
					                label: VisCleaningModes[key].name,
					                svg: VisCleaningModes[key].icon
					            }))
					        },
					        { name: 'Suction', icon: '', options: VisCleaningOptions.Suction },
					        { name: 'Water', icon: '', options: VisCleaningOptions.Water },
					        { name: 'Route', icon: '', options: VisCleaningOptions.Route },
					        { name: 'Repeat', icon: '', options: VisCleaningOptions.Repeat }
					    ];
					}

					// Toggle menu visibility
					function toggleRadialMenu(x, y, roomId) {
					    if (isMenuOpen && currentRoomId === roomId) {
					        closeRadialMenu();
					    } else {
					        currentRoomId = roomId;
					        updateRadialMenu(roomId);
					        openRadialMenu(x, y);
					    }
					}

					// Open the radial menu
					function openRadialMenu(x, y) {
					    radialMenu.style.left = x + 'px';
					    radialMenu.style.top = y + 'px';
					    radialMenu.classList.add('active');
					    isMenuOpen = true;
						actionDetected = false; // Timer reset when opening

					    // Start the timeout for auto-closing
					    startAutoCloseTimeout();

					    // Add event listener for clicks outside the menu
					    document.addEventListener('click', outsideClickListener);
					    radialMenu.addEventListener('click', menuClickListener); // Reset timeout if clicked inside the menu
					}

					// Close the radial menu
					function closeRadialMenu() {
					    clearTimeout(autoCloseTimeout); // Stop the timeout if the menu is manually closed
						actionDetected = false; // Timer reset when closing
						isMenuOpen = false;

					    // Hide all sub-options
					    document.querySelectorAll('.sub-options').forEach(el => el.classList.remove('active'));

					    // Deactivate the current main option
					    if (activeMainOption) {
					        activeMainOption.classList.remove('active');
					        activeMainOption = null;
					    }

					    // Remove the menu
					    if (radialMenu) {
					        radialMenu.classList.remove('active');
					        radialMenu.classList.add('closing');
					        setTimeout(() => {
					            radialMenu.classList.remove('closing');
					        }, 300);
					    }

					    isMenuOpen = false;

					    // Remove the listener for clicks outside the menu
					    document.removeEventListener('click', outsideClickListener);
					    radialMenu?.removeEventListener('click', menuClickListener); // Remove reset listener
					}

					// Open a sub-menu for a main option
					function openSubMenu(mainBtn, subOptions) {
					    document.querySelectorAll('.sub-options').forEach(el => el.classList.remove('active'));
					    document.querySelectorAll('.main-option').forEach(btn => {
					        if (btn !== mainBtn) btn.classList.add('hidden');
					    });

					    mainBtn.classList.add('active');
					    activeMainOption = mainBtn;

					    setTimeout(() => subOptions.classList.add('active'), 300);
					    actionDetected = true; // Mark as "Action Detected"
					    startAutoCloseTimeout(); // Restart the timer
					}

					// Close the sub-menu
					function closeSubMenu() {
					    document.querySelectorAll('.sub-options').forEach(el => el.classList.remove('active'));

					    if (activeMainOption) {
					        activeMainOption.classList.remove('active');
					        activeMainOption = null;
					    }

					    setTimeout(() => {
					        document.querySelectorAll('.main-option').forEach(btn => btn.classList.remove('hidden'));
							actionDetected = false; // Reset after closing the submenu
							startAutoCloseTimeout(); // Restart the timer
					    }, 150);
					}

					// Function only for debugging all elements from the fixed label
					function getAllIconClasses(roomId) {
					    const label = document.querySelector('#room-label-' + roomId + '-fixed');
					    if (!label) {
					        console.error('Label not found for room:', roomId);
					        return [];
					    }

					    // 1. Collect all elements with classes
					    const allElements = label.querySelectorAll('*[class]');
					    const iconClasses = new Set();

					    // 2. Browse classes
					    allElements.forEach(el => {
					        try {
					            if (el.classList) { // Ensure that classList exists
					                el.classList.forEach(className => {
					                   // if (className.startsWith('icon-')) {
					                        iconClasses.add(className);
					                   // }
					                });
					            }
					        } catch (e) {
					            console.warn('Error reading classes of Element:', el, e);
					        }
					    });

					    console.log('Found icon Classes:', Array.from(iconClasses));
					    return Array.from(iconClasses);
					}

					function updateRadialMenu(roomId) {
					    try {
					        if (!roomId) throw new Error("No room ID provided");

					        const labelContent = document.querySelector('#room-label-' + roomId + '-fixed .label-content');
					        if (!labelContent) throw new Error("Label content not found");

					        // Set default mode if not already set
					        if (!labelContent.dataset.mode) {
					            labelContent.dataset.mode = 'Sweeping'; // Default mode
					        }

					        // Re-create the menu
					        if (radialMenu) radialMenu.remove();

					        radialMenu = document.createElement('div');
					        radialMenu.className = 'radial-menu';
					        document.body.appendChild(radialMenu);
					        lastRoomId = roomId;

			                // 1. Create Mode Button FIRST
			                createModeButton(roomId, labelContent);

			        		// 1. Then create Order Button
			                const orderOption = mainOptions.find(opt => opt.name === 'Order');
			                if (orderOption) {
			                    createMainButton(orderOption, 1, mainOptions.length, roomId, labelContent, false);
			                }

			                // 3. Then create other buttons based on current mode
			                createModeSpecificButtons(roomId, labelContent);

					    } catch (error) {
					        console.error("Error updating radial menu:", error);
					    }
					}

					function createModeButton(roomId, labelContent) {
					    const modeOption = {
					        name: 'Mode',
					        icon: '',
					        options: Object.keys(VisCleaningModes).map(key => ({
					            value: key,
					            label: VisCleaningModes[key].name,
					            svg: VisCleaningModes[key].icon
					        }))
					    };

					    createMainButton(modeOption, 0, 4, roomId, labelContent, true);
					}

					function createMainButton(option, index, totalOptions, roomId, labelContent, isModeButton) {
					    const angle = (index / totalOptions) * Math.PI * 2;
					    const radius = 70;
					    const tx = Math.cos(angle) * radius - 50 + 'px';
					    const ty = Math.sin(angle) * radius - 50 + 'px';

					    const btn = document.createElement('div');
					    btn.className = 'main-option';
					    btn.style.setProperty('--tx', tx);
					    btn.style.setProperty('--ty', ty);
					    btn.dataset.optionType = option.name;

				       // SPECIAL HANDLING FOR ORDER BUTTON
				       if (option.name === 'Order') {
				           const currentOrder = getCurrentOrder(roomId);
				           const maxOrder = option.options?.length || 1;
				              // Use cached icon or generating new one
				       btn.innerHTML = orderIconsCache[currentOrder] || generateOrderIcon(currentOrder, maxOrder);
				       }
				       else {
				           const currentValue = labelContent.dataset[option.name.toLowerCase()];
				           const matchedOption = option.options?.find(opt => opt.value.toString() === currentValue);
				           //btn.innerHTML = matchedOption?.svg || '';
				   		const labelIcon = document.querySelector('#room-label-' + roomId + '-fixed .icon-' + option.name.toLowerCase() + ' svg');
				   		btn.innerHTML = labelIcon ? labelIcon.outerHTML : (matchedOption ? matchedOption.svg : '');
				       }

					    const subOptions = document.createElement('div');
					    subOptions.className = 'sub-options';

					    if (option.options) {
					        option.options.forEach((subOpt, subIndex) => {
					            const subAngle = (subIndex / option.options.length) * Math.PI * 2;
					            const subRadius = 70;
					            const subTx = Math.cos(subAngle) * subRadius - 25 + 'px';
					            const subTy = Math.sin(subAngle) * subRadius - 25 + 'px';

					            const subBtn = document.createElement('div');
					            subBtn.className = 'sub-option';
					            //subBtn.innerHTML = subOpt.svg || subOpt.label[0];
					            subBtn.style.setProperty('--tx', subTx);
					            subBtn.style.setProperty('--ty', subTy);
					            subBtn.dataset.value = subOpt.value;
					            subBtn.title = subOpt.label;

		            			// SPECIAL HANDLING FOR ORDER SUB-OPTIONS
		                        if (option.name === 'Order') {
		                            subBtn.innerHTML = generateOrderIcon(subOpt.value, option.options.length);
		                        } else {
		                            subBtn.innerHTML = subOpt.svg || subOpt.label[0];
		                        }

					            subBtn.addEventListener('click', function(e) {
					                e.stopPropagation();
					                actionDetected = true;

					                if (option.name === 'Order') {
										handleOrderChange(subOpt.value, roomId);
									}
									else if (isModeButton) {
					                    // Handle mode change
										const commandModeName = subOpt.value;
										const commandModeCode = getModeCode(commandModeName);
					                    labelContent.dataset.mode = commandModeCode;
										//console.log("Mode change -> name: " + commandModeName + ", code: " + commandModeCode + ", old: " + labelContent.dataset.mode + ", labelContent:", labelContent);

					                    // Update icon
					                    const labelIconContainer = document.querySelector('#room-label-' + roomId + '-fixed .icon-mode');
					                    if (labelIconContainer) {
					                        labelIconContainer.innerHTML = subOpt.svg;
					                    }

					                    // Update button
					                    btn.innerHTML = subOpt.svg;

					                    // Recreate other buttons for new mode
					                    recreateModeSpecificButtons(roomId, labelContent);

										// Send commands to (.control.UpdateMapData)
										sendCleaningCommand(roomId, labelContent);

					                } else {
					                    // Handle other options
					                    handleOptionSelection(option.name, subOpt.value, roomId, labelContent, btn);
					                }

					                closeSubMenu();
					            });

					            subOptions.appendChild(subBtn);
					        });
					    }

					    btn.addEventListener('click', function(e) {
					        e.stopPropagation();
					        actionDetected = true;
					        if (activeMainOption === btn) {
					            closeSubMenu();
					        } else {
					            openSubMenu(btn, subOptions);
					        }
					    });

					    radialMenu.appendChild(btn);
					    radialMenu.appendChild(subOptions);
					}

					function recreateModeSpecificButtons(roomId, labelContent) {
				        // Update the order icon IMMEDIATELY
				        const orderBtn = radialMenu.querySelector('.main-option[data-option-type="Order"]');
				        if (orderBtn) {
				            const currentOrder = getCurrentOrder(roomId);
				            const maxOrder = mainOptions.find(opt => opt.name === 'Order')?.options?.length || 1;
				            orderBtn.innerHTML = orderIconsCache[currentOrder] || generateOrderIcon(currentOrder, maxOrder);
				        }
					    // Remove existing buttons (except mode and order buttons)
					    const buttons = radialMenu.querySelectorAll('.main-option');
					    buttons.forEach((btn, index) => {
					        if (index > 1) { // Keep mode button (index 0) and room oder (index 1)
					            btn.remove();
					            // Remove corresponding sub-options
					            const subOptions = radialMenu.querySelectorAll('.sub-options')[index];
					            if (subOptions) subOptions.remove();
					        }
					    });

					    // Create new buttons for current mode
					    createModeSpecificButtons(roomId, labelContent);
					}

					function createModeSpecificButtons(roomId, labelContent) {
					    const currentMode = getModeNameFromCode(labelContent.dataset.mode);
					    const availableOptions = getAvailableOptionsForMode(currentMode);

					    availableOptions.forEach((option, index) => {
					        createMainButton(option, index + 2, availableOptions.length + 2, roomId, labelContent, false);
					    });
					}

					function getAvailableOptionsForMode(modeName) {
					    const mode = VisCleaningModes[modeName];
					    if (!mode) return [];

					    return mode.options.map(optionName => {
					        const fullOptions = {
					            'Suction': VisCleaningOptions.Suction,
					            'Water': VisCleaningOptions.Water,
					            'Route': VisCleaningOptions.Route,
					            'Repeat': VisCleaningOptions.Repeat
					        }[optionName];

					        return {
					            name: optionName,
					            icon: '',
					            options: fullOptions.filter(opt =>
					                mode.activeModes.includes(optionName + opt.value)
					            )
					        };
					    });
					}

					// Get room order options
					async function getOrderOptions() {
					    try {
					        const saData = await getState('${prefix}.mqtt.sa');
					        let roomOrder = JSON.parse(saData).map(room => room[0]);

					        if (roomOrder.length === 0) {
					            const currentOrder = await getState('${prefix}.control.CleanOrder');
					            roomOrder = currentOrder ? JSON.parse(JSON.parse(currentOrder)[0].value).cleanOrder : [];
					        }

							// Update cache if necessary
					        updateOrderIconsCache(roomOrder.length);

					        return roomOrder.map((_, index) => {
					            const order = index + 1;
					            return {
					                value: order,
					                label: order + '. Position',
					                svg: orderIconsCache[order] // Use cached icon
					            };
					        });
					    } catch (error) {
					        console.error('Error getting order options:', error);
					        // Fallback with caching
					        const fallbackLength = 5;
					        if (Object.keys(orderIconsCache).length !== fallbackLength) {
					            generateAllOrderIcons(fallbackLength);
					        }
					        return Array.from({ length: fallbackLength }, (_, i) => ({
					            value: i + 1,
					            label: (i + 1) + '. Position',
					            svg: orderIconsCache[i + 1] // Use cached icon
					        }));
					    }
					}

					// Generate all possible order icons once
					function generateAllOrderIcons(maxRooms) {
					    for (let order = 1; order <= maxRooms; order++) {
					        orderIconsCache[order] = generateOrderIcon(order, maxRooms);
					    }
					}

					// Updates the icon cache if the maximum number of rooms has changed
					function updateOrderIconsCache(newMaxRooms) {
					    if (newMaxRooms !== Object.keys(orderIconsCache).length) {
					        console.log('Updating Order-Icons-Cache for ' + newMaxRooms + ' rooms.');
					        generateAllOrderIcons(newMaxRooms); // Generate new
					    }
					}
					// Helper function to get current order for a room
					function getCurrentOrder(roomId) {
					    const orderIcon = document.querySelector('#room-label-' + roomId + '-fixed .icon-order');
					    return orderIcon?.dataset.order || 1;
					}

					// Generate order icon SVG
					function generateOrderIcon(order, maxOrder) {
					    const hue = (order * 360 / maxOrder) % 360;
					    const color = 'hsl(' + hue + ', 80%, 50%)';

					    // Adjust font size based on number of digits
					    const fontSize = order.toString().length > 2 ? '16' : '24';
					    const yPosition = order.toString().length > 2 ? '26' : '28'; // Adjust vertical position

					    return '<svg class="mode-option-svg" width="40" height="40" viewBox="0 0 40 40" style="fill-rule:evenodd">' +
					                '<circle cx="20" cy="20" r="17" fill="none" stroke="#fff" stroke-width="2"/>' +
					                '<text x="20" y="' + yPosition + '" text-anchor="middle" font-size="' + fontSize + '" fill="none" stroke="#fff" stroke-width="2">' + order + '</text>' +
					                '<text x="20" y="' + yPosition + '" text-anchor="middle" font-size="' + fontSize + '" fill="' + color + '">' + order + '</text>' +
					            '</svg>';
					}


					// Handle order changes
					async function handleOrderChange(newOrder, roomId) {
					    try {
					        const saData = await getState('${prefix}.mqtt.sa');
					        let roomOrder = JSON.parse(saData).map(room => room[0]);

					        if (roomOrder.length === 0) {
					            const currentOrder = await getState('${prefix}.control.CleanOrder');
					            roomOrder = currentOrder ? JSON.parse(JSON.parse(currentOrder)[0].value).cleanOrder : [];
					        }

					        const currentIndex = roomOrder.indexOf(parseInt(roomId));
					        if (currentIndex === -1) return;

					        newOrder = Math.max(1, Math.min(newOrder, roomOrder.length));
					        const newIndex = newOrder - 1;

					        const [movedRoom] = roomOrder.splice(currentIndex, 1);
					        roomOrder.splice(newIndex, 0, movedRoom);

					        await sendCleanOrder(roomOrder);
					        await updateAllRoomOrders(roomOrder);

					        // Update the order button in the menu (if open)
					        if (isMenuOpen && currentRoomId === roomId) {
					            const orderBtn = radialMenu.querySelector('.main-option[data-option-type="Order"]');
					            if (orderBtn) {
					                orderBtn.innerHTML = generateOrderIcon(newOrder, roomOrder.length);
					            }
					        }

					    } catch (error) {
					        console.error('Error changing room order:', error);
					    }
					}

					// Update all room orders in UI
					async function updateAllRoomOrders(roomOrder) {
					    roomOrder.forEach((roomId, index) => {
					        const order = index + 1;
					        const label = document.querySelector('#room-label-' + roomId + '-fixed .icon-order');
					        if (label) {
					            label.innerHTML = generateOrderIcon(order, roomOrder.length);
					            label.dataset.order = order;
					        }
					    });
					}

					// Generates the CleanOrder command
					function buildCleanOrderCommand(roomOrderArray) {
					    return [{
					        piid: 4,
					        value: JSON.stringify({
					            cleanOrder: roomOrderArray
					        })
					    }];
					}

					// Sends the CleanOrder command
					async function sendCleanOrder(roomOrderArray) {
					    const command = buildCleanOrderCommand(roomOrderArray);
					    try {
					        await setState('${prefix}.control.CleanOrder', JSON.stringify(command));
					        console.log('CleanOrder sent:', command);
					    } catch (error) {
					        console.error('Error sending CleanOrder:', error);
					    }
					}

					function handleOptionSelection(optionName, value, roomId, labelContent, btn) {
					    let convertedValue = value;

					    if (optionName === 'Suction') {
					        convertedValue = getSuctionCode(value);
					    } else if (optionName === 'Water') {
					        convertedValue = getWaterCode(value);
					    } else if (optionName === 'Route') {
					        convertedValue = getRouteCode(value);
					    }

					    labelContent.dataset[optionName.toLowerCase()] = convertedValue;

					    const labelIconContainer = document.querySelector('#room-label-' + roomId + '-fixed .icon-' + optionName.toLowerCase());
					    if (labelIconContainer) {
					        const selectedOption = VisCleaningOptions[optionName].find(opt => opt.value === value);
					        if (selectedOption) {
					            labelIconContainer.innerHTML = selectedOption.svg;
					        }
					    }

					    btn.innerHTML = VisCleaningOptions[optionName].find(opt => opt.value === value)?.svg || '';

						// Send commands to (.control.UpdateMapData)
						sendCleaningCommand(roomId, labelContent);


					}

					// Function to send commands (.control.UpdateMapData)
					function sendCleaningCommand(roomId, labelContent) {
						// Log current settings
					    console.log('Updated settings:', {
							room: roomId,
					        suction: labelContent.dataset.suction,
					        water: labelContent.dataset.water,
					        repeat: labelContent.dataset.repeat,
					        mode: labelContent.dataset.mode,
							route: labelContent.dataset.route,
					    });

						// Adjusting the suction power Max Plus
					    let normalizeSuctionValue = parseInt(labelContent.dataset.suction, 10);
					    let suctionMaxPlus = 0;
					    if ((normalizeSuctionValue == 4) || (normalizeSuctionValue == 3)) {
					        suctionMaxPlus = (normalizeSuctionValue === 4) ? 1 : 0;
					        (async () => {
					            try {
					                await setState('${prefix}.control.SuctionMaxPlus', suctionMaxPlus);
					                console.log('Suction Power Max Plus has been changed to ', suctionMaxPlus);
					            } catch (err) {
					                console.error('Error setting the suction power Max Plus', err);
					            }
					        })();
					        normalizeSuctionValue = 3;
					    }

						// Push the extracted values into the result array (converting strings to numbers)
					    const result = [];
					    result.push([
					        parseInt(roomId, 10),
					        normalizeSuctionValue,
					        parseInt(labelContent.dataset.water, 10),
					        parseInt(labelContent.dataset.repeat, 10),
					        parseInt(labelContent.dataset.mode, 10),
					        parseInt(labelContent.dataset.route, 10)
					    ]);

					    const updateData = [{
					        piid: 4,
					        value: JSON.stringify({
					            customeClean: result
					        })
					    }];

					    (async () => {
					        try {
					            const fullId = '${prefix}.control.UpdateMapData';
					            await setState(fullId, JSON.stringify(updateData));
					            console.log('Command sent:', JSON.stringify(updateData));
					        } catch (err) {
					            console.error('Error setting UpdateMapData:', err);
					        }
					    })();

						//closeSubMenu();
						//updateButtonStates();
						//updateSummaryDisplay();
					}

					// Close the menu if clicked outside
					function outsideClickListener(e) {
					    if (!radialMenu.contains(e.target)) {
					        closeRadialMenu();
							document.removeEventListener('click', outsideClickListener);
					    }
					}

					function menuClickListener(e) {
					    actionDetected = true;
					    startAutoCloseTimeout(); // Timer restart on click
					}

					// Function to reset the timeout
					function startAutoCloseTimeout() {
						clearTimeout(autoCloseTimeout); // Always delete old timeout first
					    console.log("Timeout started");
					    autoCloseTimeout = setTimeout(() => {
					        console.log("Timeout expired, actionDetected:", actionDetected);
					        if (!actionDetected) {
					            console.log("Menu closes");
					            closeRadialMenu();
					        }
					    }, 15000); // Menu will close after 15 seconds if no action is detected
					}

					// Function: =============> Reverse mapping functions for Suction
					function getSuctionCode(name) {
					    const suctionReverseMap = {
					        'Quiet': 0,
					        'Standard': 1,
					        'Turbo': 2,
					        'Max': 3,
					        'MaxPlus': 4
					    };

					    return (name in suctionReverseMap) ? suctionReverseMap[name] : 2;
					}

					// Function: =============> Reverse mapping functions for Water
					function getWaterCode(name) {
					    const waterReverseMap = {
					        'Low': 10,
					        'Middle': 20,
					        'High': 30,
					        'Ultra': 31
					    };

					    return (name in waterReverseMap) ? waterReverseMap[name] : 20;
					}

					// Function: =============> Reverse mapping functions for Route
					function getRouteCode(name) {
					    const routeReverseMap = {
					        'Standard': 1, // 'Standard': 546 ?? Intelligent
					        'Intensive': 2,
					        'Deep': 3, // 'Deep': 768
					        'Quick': 4 // 'Quick': 512 ?? Intelligent
					    };

					    return (name in routeReverseMap) ? routeReverseMap[name] : 2;
					}

					// Function: =============> Reverse mapping functions for Mode
					function getModeCode(name) {
					    const modeReverseMap = {
					        'Sweeping': 0,
					        'Mopping': 1,
					        'SweepingAndMopping': 2,
					        'MoppingAfterSweeping': 3,
					        'CustomRoomCleaning': 4
					    };

					    return (name in modeReverseMap) ? modeReverseMap[name] : 1;
					}

					// Function: =============> Reverse mapping functions for Mode
					function getModeNameFromCode(code) {
					    const modeMap = {
					        0: 'Sweeping',
					        1: 'Mopping',
					        2: 'SweepingAndMopping',
					        3: 'MoppingAfterSweeping',
					        4: 'CustomRoomCleaning'
					    };

					    return (code in modeMap) ? modeMap[code] : 'Sweeping';
					}


					// =============================================
                    // Changing the robot vacuum position
                    // =============================================
                    // Transformation function for the script part
                    function toCanvas(x, y, customAngle = null) {
						const angle = customAngle !== null ? customAngle : rotationAngle;
                        const angleRad = angle * Math.PI / 180;

                        const rotatedX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
                        const rotatedY = x * Math.sin(angleRad) + y * Math.cos(angleRad);

                        return [
                            Math.round(rotatedX * scale + offsetX),
                            Math.round(rotatedY * scale + offsetY)
                        ];
                    }

					// Variables to virtualize the rotation of the robot
                    let lastPosition = { x: null, y: null };
                    let lastAngle = 0;
                    const BRUSH_ANGLE = 270; //Brush points in SVG at 45� to the top right

                    function updateRobotPosition(x, y) {
                        const [canvasX, canvasY] = toCanvas(x, y);
                        const robotSvg = document.getElementById('robot-position');

                        if (!robotSvg) return;

                        // Only calculate if we have a previous position
                        if (lastPosition.x !== null && lastPosition.y !== null) {
                            const deltaX = canvasX - lastPosition.x;
                            const deltaY = canvasY - lastPosition.y;
                            const distanceMoved = Math.sqrt(deltaX*deltaX + deltaY*deltaY);

                            // Only when movement is noticeable (>2 pixels)
                            if (distanceMoved > 2) {
                                let movementDirection = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                                let robotRotation = movementDirection - BRUSH_ANGLE;

                                // Normalize angles (0-360�)
                                robotRotation = (robotRotation + 360) % 360;

                                // Smooth rotation (80% new angle, 20% previous)
                                lastAngle = 0.8 * robotRotation + 0.2 * lastAngle;

                                // Apply with correct centering
                                robotSvg.style.transform = 'translate(-32px, -32px) rotate(' + lastAngle + 'deg)';
                            }
                        }

                        // Update position
                        lastPosition = { x: canvasX, y: canvasY };
                        robotSvg.style.left = canvasX + 'px';
                        robotSvg.style.top = canvasY + 'px';
                        robotSvg.style.display = 'block';

                        // Path update
                        currentPathPoints.push([canvasX, canvasY]);
                        updateCurrentPath();

                    	if (currentPathPoints.length > 4000) {
                            historyPathPoints = historyPathPoints.concat(currentPathPoints.slice(0, -2000));
                            currentPathPoints = currentPathPoints.slice(-2000);
                            updateHistoryPath();
                        }
                    }

                    function updateCurrentPath() {
                        const pathElement = document.getElementById('robot-path-current');
                        if (!pathElement || currentPathPoints.length === 0) return;

                        let pathData = 'M ' + currentPathPoints[0][0] + ' ' + currentPathPoints[0][1];
                        for (let i = 1; i < currentPathPoints.length; i++) {
                            pathData += ' L ' + currentPathPoints[i][0] + ' ' + currentPathPoints[i][1];
                        }

                        pathElement.innerHTML =
                            '<path d="' + pathData + '" ' +
                            'stroke="rgba(0,150,255,0.2)" ' +
                            'stroke-width="10" ' +
                            'stroke-linecap="round" ' +
                            'stroke-linejoin="round" ' +
                            'fill="none" />' +
                            '<path d="' + pathData + '" ' +
                            'stroke="rgba(0,150,255,0.8)" ' +
                            'stroke-width="4" ' +
                            'stroke-linecap="round" ' +
                            'stroke-linejoin="round" ' +
                            'fill="none" />';
                    }

                    function updateHistoryPath() {
                        const pathElement = document.getElementById('robot-path-history');
                        if (!pathElement || historyPathPoints.length === 0) return;

                        let pathData = 'M ' + historyPathPoints[0][0] + ' ' + historyPathPoints[0][1];
                        for (let i = 1; i < historyPathPoints.length; i++) {
                            pathData += ' L ' + historyPathPoints[i][0] + ' ' + historyPathPoints[i][1];
                        }

                        pathElement.innerHTML =
                            '<path d="' + pathData + '" ' +
                            'stroke="rgba(255,50,50,0.4)" ' +
                            'stroke-width="20" ' +
                    		'stroke-linecap="round" ' +
                    		'stroke-linejoin="round" ' +
                            'fill="none" />' +
                            '<path d="' + pathData + '" ' +
                            'stroke="rgba(255,50,50,0.6)" ' +
                            'stroke-width="4" ' +
						    'stroke-linecap="round" ' +
                            'stroke-linejoin="round" ' +
                            'fill="none" />';
                    }

                    // Draw robot path
                    function updatePathFromHistory(historyData) {
                        historyPathPoints = [];
                        currentPathPoints = [];

                        if (!historyData || Object.keys(historyData).length === 0) {
                            hideRobotPosition();
                            return;
                        }
                        try {
                            Object.values(historyData).forEach(entry => {
                                try {
                                    let x, y;
                                    if (Array.isArray(entry)) {
                                        x = entry[0];
                                        y = entry[1];
                                    } else if (typeof entry === 'object' && entry.position) {
                                        x = entry.position.x;
                                        y = entry.position.y;
                                    }
                                    if (!isNaN(x) && !isNaN(y)) {
                                        const [canvasX, canvasY] = toCanvas(x, y);
                                        historyPathPoints.push([canvasX, canvasY]);
                                    }
                                } catch (e) {
                                    console.error('Error processing position:', entry, e);
                                }
                            });

                            updateHistoryPath();
                        } catch (e) {
                            console.error('Failed to process history:', e);
                            hideRobotPosition();
                        }
                    }

                    function hideRobotPosition() {
                        const robotPos = document.getElementById('robot-position');
                        if (robotPos) robotPos.style.display = 'none';
                    }

                    // Helper function for path update
                    function updateRobotPath() {
                        const pathElement = document.getElementById('robot-path-current');
                        if (!pathElement) return;

                        pathElement.innerHTML = '';

                        if (robotPathPoints.length === 0 && (!posHistory || posHistory.length === 0)) {
                            return;
                        }

                        if (robotPathPoints.length > 0) {
                            let pathData = 'M ' + robotPathPoints[0][0] + ' ' + robotPathPoints[0][1];
                            for (let i = 1; i < robotPathPoints.length; i++) {
                                pathData += ' L ' + robotPathPoints[i][0] + ' ' + robotPathPoints[i][1];
                            }

                            pathElement.innerHTML += '<path d="' + pathData + '" ' +
                                                    'stroke="rgba(255,0,0,0.7)" ' +
                                                    'stroke-width="4" ' +
                                                    'fill="none" />';
                        }
                    }

					document.getElementById('toggle-history-path').addEventListener('click', function() {
                        showHistoryPath = !showHistoryPath;
                        document.getElementById('robot-path-history').style.display = showHistoryPath ? 'block' : 'none';
						this.classList.toggle('active', showHistoryPath);
                        //this.textContent = showHistoryPath ? 'Hide History Path' : 'Show History Path';
						debouncedSaveSettings();
                    });

                    document.getElementById('toggle-robot-path').addEventListener('click', function() {
                        showRobotPath = !showRobotPath;
                        document.getElementById('robot-path-current').style.display = showRobotPath ? 'block' : 'none';
                        //this.textContent = showRobotPath ? 'Hide Robot Path' : 'Show Robot Path';
						this.classList.toggle('active', showRobotPath);
						debouncedSaveSettings();
                    });

                    document.getElementById('toggle-room-label').addEventListener('click', function() {
                        areHiddenState = !areHiddenState;
                        stabilizeLabels();
                        //this.textContent = areHiddenState ? 'Hide room labels' : 'Show room labels';
						this.classList.toggle('active', areHiddenState);
						debouncedSaveSettings();
                    });

					// =============================================
                    // Update and change room and carpet settings
                    // =============================================

                    // Precise click detection with 3D transformation
                    function handleClick(event) {
                        const rect = clickLayer.getBoundingClientRect();
                        let x = event.clientX - rect.left;
                        let y = event.clientY - rect.top;

                        // 1. Get the current transformation matrix of the map container
                        const style = window.getComputedStyle(mapContent);
                        const matrix = new WebKitCSSMatrix(style.transform);

                        // 2. Create inverse matrix for the back transformation
                        let det = matrix.a * matrix.d - matrix.b * matrix.c;
                        if (det === 0) return; // No inverse possible

                        // Inverse of the 2D components
                        const inv = {
                            a: matrix.d / det,
                            b: -matrix.b / det,
                            c: -matrix.c / det,
                            d: matrix.a / det,
                            e: (matrix.c * matrix.f - matrix.d * matrix.e) / det,
                            f: (matrix.b * matrix.e - matrix.a * matrix.f) / det
                        };

                        // 3. Transform click position back
                        const tx = x - canvasSize/2;
                        const ty = y - canvasSize/2;
                        x = inv.a * tx + inv.c * ty + inv.e + canvasSize/2;
                        y = inv.b * tx + inv.d * ty + inv.f + canvasSize/2;

                        // 4. Check boundaries
                        x = Math.max(0, Math.min(canvasSize-1, x));
                        y = Math.max(0, Math.min(canvasSize-1, y));

                        // Original color query
                        const pixel = colorMapCtx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
                        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

                        // Rest of the existing logic
                        if (colorMappings.rooms[hex]) {
                            const roomId = colorMappings.rooms[hex];
                            const element = document.getElementById('room-' + roomId);
                            const index = selectedRooms.indexOf(roomId);
							const fixedLabel = document.getElementById('room-label-' + roomId + '-fixed');
                            if (index === -1) {
                                selectedRooms.push(roomId); // Add room
                                element.classList.add('selected');
								labelManager.activateLabelAnimations(fixedLabel); // Enables animations for a specific label
                            } else {
                                selectedRooms.splice(index, 1); // Remove room
                                element.classList.remove('selected');
								labelManager.deactivateLabelAnimations(fixedLabel); // Disables animations for a specific label
                            }
                            updateCurrentRoomDisplay(roomId);
                        }
                        else if (colorMappings.carpets[hex]) {
                            const carpetId = colorMappings.carpets[hex];
                            const element = document.getElementById('carpet-' + carpetId);
                            const index = selectedCarpets.indexOf(carpetId);
                            if (index === -1) {
                                selectedCarpets.push(carpetId); // Add carpet
                                element.classList.add('selected');
                            } else {
                                selectedCarpets.splice(index, 1); // Remove carpet
                                element.classList.remove('selected');
                            }
                        }
                        console.log("Selected rooms:", selectedRooms);
                        console.log("Selected carpets:", selectedCarpets);
						debouncedSaveSettings();
                    }

					// Helper function RGB to Hex
                    function rgbToHex(r, g, b) {
                        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
                    }

                    // Update current room display
                    function updateCurrentRoomDisplay(roomId) {
                        document.getElementById('current-room').textContent = roomId;
                    }

					// Function for the room name to find out which number belongs to it
					function getRoomNameNumberMap() {
                        const nameNumberMap = {};
						for (const [roomNumber, roomData] of Object.entries(roomDataMap)) {
                            nameNumberMap[roomData.name] = Number(roomNumber);
						}
                      return nameNumberMap;
                    }

					clickLayer.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const event = new MouseEvent('click', {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                        });
                        handleClick(event);
                    }, { passive: false });

					// =============================================
                    // Show and update room settings
                    // =============================================
                    // Global style ID for label CSS
                    // 1. CSS for contained labels
                    var fixLabelCSS = \`
                    #map-labels-container {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        overflow: hidden;
                        z-index: 110;
                        display: flex;
                        justify-content: center;
                        align-items: center;  /* Centers the content both horizontally and vertically */
                    }

                    .room-label-fixed {
                        position: absolute;
                        transform: translate(-50%, -50%) scale(var(--scale, 1));
                        transition: transform 0.2s ease-out, opacity 0.2s ease;
                        will-change: transform;
                        background: rgba(255, 255, 255, 0.2);
                        padding: 4px 8px;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                        border: 1px solid rgba(0,0,0,0.1);
                        font-size: 10px;
                        font-weight: bold;
                        white-space: nowrap;
                        backdrop-filter: blur(1px);
                        min-width: 170px;
                        max-width: 195px;
                        min-height: 80px;
                        text-align: center;
                        color: #000000;
                        contain: content;
                    }

                    .room-label-fixed .label-content {
                        white-space: normal;
                        word-break: break-word;
						z-index: 110;
                    }

                    .icon-scale {
                        width: 18px;
                        height: 18px;
                        transform: scale(0.65);
                        flex-shrink: 0;
                    }

                    .setting-item {
                        display: flex;
                        align-items: center;
                        font-size: 8px;
                        margin: 0 5px; /* Additional horizontal spacing */
                        margin-left: 5px;
                    }

                    .icon-container {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;  /* Centers the icons horizontally */
                        align-items: center;
                        margin-top: 2px;
                        margin-bottom: 10px; /* Space below the icons to separate from the progress bar */
                    }

                    .progress-container {
                        display: flex;
                        flex-direction: column;  /* Ensures the progress bar is vertically below the icons */
                        align-items: center;  /* Centers the progress bar horizontally */
                        margin-top: 19px;
                    }

                    .progress-bar {
                        background: rgba(0,0,0,0.1);
                        height: 5px;
                        border-radius: 2px;
                        width: 100%;
                    }

                    .progress-fill {
                        background: #4CAF50;
                        height: 100%;
                        border-radius: 2px;
                    }

                    .progress-text {
                        font-size: 10px;
                        text-align: center;
                        font-weight: 400;
                    }

                    .last-update-text {
                        font-size: 10px;
                        text-align: center;
                        font-weight: 600;
                    }
                    \`;

                    // =============================================
                    // Room Label Management System
                    // =============================================

                    // Reads cleaning data for defined rooms from the Dreame structure
                    async function getRoomCleaningData(roomDataMap) {
                        try {
                            const roomData = {};

                            // Retrieve data for each room
                            await Promise.all(Object.keys(roomDataMap).map(async (roomId) => {
                                const roomName = roomDataMap[roomId].name;
                                const basePath = '${prefix}.state.cleaninginfo.${DH_CurMap}.' + roomName;

                                roomData[roomId] = {
                                    ...roomDataMap[roomId],
                                    stats: await getRoomStats(basePath)
                                };
                            }));

                            return roomData;
                        } catch (error) {
                            console.error('Error loading room data:', error);
                            return {};
                        }
                    }

                    // Get statistics for a specific room
                    async function getRoomStats(basePath) {
                        const stats = {};
                        const properties = ['CleanedArea', 'TotalArea', 'CoveragePercent', 'LastUpdate'];

                        await Promise.all(properties.map(async (prop) => {
                            const stateId = basePath + '.' + prop;
                            stats[prop] = await getStateValue(stateId, prop);
                        }));

                        // Add calculated metric
                        stats.cleaningRatio = stats.TotalArea > 0
                            ? (stats.CleanedArea / stats.TotalArea * 100).toFixed(1)
                            : 0;

                        return stats;
                    }

                    // Gets a single state value with type conversion
                    async function getStateValue(stateId, property) {
                        try {
                            const value = await getState(stateId);

                            if (property === 'LastUpdate') {
                                return value ? new Date(value) : null;
                            }

                            const numValue = parseFloat(value);
                            return isNaN(numValue) ? 0 : numValue;
                        } catch (error) {
                            console.error('Error reading from ' + stateId + ': ', error);
                            return 0;
                        }
                    }

                    // ioBroker State Helper with Promise
                    function getState(stateId) {
                        return new Promise((resolve) => {
                            vis.conn._socket.emit('getState', stateId, (err, res) => {
                                resolve(err ? null : res?.val);
                            });
                        });
                    }

                    // Format time manually
                    function formatDate(date) {
                        if (!date) return 'Never';

                        // Format Date
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = String(date.getFullYear()).slice(-2);

                        // Format time
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');

                        return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes;
                    }

                    // Cache for frequently used elements and data
                    const labelCache = {
                      container: null,
                      styleElement: null,
                      roomSettings: {},
                      roomStats: {},
                      routeTypes: {}
                    };

                    // Shared utility functions
                    const utils = {
                      // Get element with caching
                      getElement: function(id) {
                        return labelCache.elements && labelCache.elements[id]
                          ? labelCache.elements[id]
                          : document.getElementById(id);
                      },

                      // Safe JSON parsing
                      parseJSON: function(data) {
                        try {
                          return typeof data === 'string' ? JSON.parse(data) : data;
                        } catch (e) {
                          console.error('JSON parse error:', e);
                          return null;
                        }
                      },

                      // Throttle function to limit execution rate
                      throttle: function(fn, delay) {
                        let lastCall = 0;
                        return function() {
                          const now = Date.now();
                          if (now - lastCall >= delay) {
                            lastCall = now;
                            fn.apply(this, arguments);
                          }
                        };
                      }
                    };

                    // =============================================
                    // Data Service Module
                    // =============================================
                    const dataService = {
                      // Get multiple states in one request
                      getStates: function(stateIds) {
                        return new Promise(function(resolve) {
                          vis.conn._socket.emit('getStates', stateIds, function(err, res) {
                            resolve(err ? {} : res);
                          });
                        });
                      },

                      // Get cleaning stats for a room
                      getRoomStats: async function(basePath) {
                        const properties = ['CleanedArea', 'TotalArea', 'CoveragePercent', 'LastUpdate'];
                        const stateIds = properties.map(function(prop) {
                          return basePath + '.' + prop;
                        });

                        const results = await this.getStates(stateIds);
                        const stats = {};

                        properties.forEach(function(prop, index) {
                          const stateId = stateIds[index];
                          const value = results[stateId] ? results[stateId].val : null;

                          if (prop === 'LastUpdate') {
                            stats[prop] = value ? new Date(value) : null;
                          } else {
                            const numValue = parseFloat(value);
                            stats[prop] = isNaN(numValue) ? 0 : numValue;
                          }
                        });

                        stats.cleaningRatio = stats.TotalArea > 0
                          ? (stats.CleanedArea / stats.TotalArea * 100).toFixed(1)
                          : 0;

                        return stats;
                      },

                      // Fetch room settings from server
                      fetchRoomSettings: async function() {
                        try {
                          const [saData, cleansetData] = await Promise.all([
                            new Promise(function(resolve) {
                              vis.conn._socket.emit('getState', '${prefix}.mqtt.sa', function(err, res) {
                                resolve(err ? null : res ? res.val : null);
                              });
                            }),
                            new Promise(function(resolve) {
                              vis.conn._socket.emit('getState', '${prefix}.mqtt.cleanset', function(err, res) {
                                resolve(err ? null : res ? res.val : null);
                              });
                            })
                          ]);

                          return this.parseRoomSettings(saData, cleansetData);
                        } catch (error) {
                          console.error('Error fetching room settings:', error);
                          return {};
                        }
                      },

                      // Parse room settings from different sources
                      parseRoomSettings: function(saData, cleansetData) {
                        const settings = {};

                        // Process sa data (original format)
                        const parsedSa = utils.parseJSON(saData);
                        if (Array.isArray(parsedSa)) {
                          parsedSa.forEach(function(room) {
                            if (Array.isArray(room) && room.length >= 6) {
                              settings[room[0]] = {
                                water: room[1],
                                repeat: room[2],
                                order: room[4],
                                route: room[5],
                                source: 'sa'
                              };
                            }
                          });
                        }

                        // Process cleanset data (room ID as key)
                        const parsedCleanset = utils.parseJSON(cleansetData);
                        if (parsedCleanset && typeof parsedCleanset === 'object') {
                          Object.entries(parsedCleanset).forEach(function([roomId, clean]) {
                            if (Array.isArray(clean) && clean.length >= 6) {
                              roomId = parseInt(roomId);
                              settings[roomId] = settings[roomId] || {};
                              Object.assign(settings[roomId], {
                                suction: clean[0],
                                preciseWater: clean[1],
                                preciseRepeats: clean[2],
                                mode: clean[4],
                                preciseRoute: clean[5],
                                source: 'cleanset'
                              });
                            }
                          });
                        }

                        return settings;
                      }
                    };

                    // =============================================
                    // Label Manager Module
                    // =============================================

                    const labelManager = {
                      trackedLabels: [],  // Saves all active labels
                      callbacks: [],     // Event listener callbacks
                      observer: null,    // Mutation observer
                      observers: [], // For Mutation observer


                      // Function: =============> Initialize label container
                      initContainer: function() {
                        if (!labelCache.container) {
                          const container = document.createElement('div');
                          container.id = 'map-labels-container';
                          document.querySelector('.map-container').appendChild(container);
                          labelCache.container = container;

                          if (!utils.getElement(fixLabelCSS)) {
                            const style = document.createElement('style');
                            style.id = fixLabelCSS;
                            style.textContent = fixLabelCSS;
                            document.head.appendChild(style);
                            labelCache.styleElement = style;
                          }
                        }
                        return labelCache.container;
                      },

                      // Function: =============> Create label HTML content
                     createLabelContent: function(roomId, roomInfo, settings, stats) {
                         // Settings SVG Icon
                         const settingsIcon = \`
                             <svg class="settings-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                 <circle cx="12" cy="12" r="3"></circle>
                                 <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                             </svg>
                         \`;

                         // Get all values with defaults
                         const values = {
                             suction: this.getSuctionLevel(settings.suction || 1),
                             water: this.getWaterLevel(settings.preciseWater || settings.water || 0),
                             route: this.getRouteType(settings.preciseRoute || settings.route || 2),
                             repeat: settings.preciseRepeats || settings.repeat || 1,
                             mode: settings.mode || 0
                         };

                         // Get icons
                         const icons = {
                             mode: this.getModeIcon(values.mode),
                             suction: this.getSettingIcon('Suction', values.suction),
                             water: this.getSettingIcon('Water', values.water),
                             route: this.getSettingIcon('Route', values.route),
                             repeat: this.getSettingIcon('Repeat', values.repeat)
                         };

                        // Create data attributes string with converted values
                        const dataAttributes = Object.entries(values)
                            .map(function([key, value]) {
                                // Convert only the corresponding values ??for the data attributes
                                let convertedValue = value;

                                if (key === 'suction') {
                                    convertedValue = getSuctionCode(value);
                                } else if (key === 'water') {
                                    convertedValue = getWaterCode(value);
                                } else if (key === 'route') {
                                    convertedValue = getRouteCode(value);
                                }

                                return 'data-' + key + '="' + convertedValue + '"';
                            })
                            .join(' ');

                        // Default values for RoomOrder
                        let orderDisplay = '-';
                        let orderColor = '#cccccc';

                        // RoomOrder SVG generator
                        const getOrderIcon = function() {
							// Adjust font size based on number of digits
                            const fontSize = orderDisplay.toString().length > 2 ? '16' : '24';
                            const yPosition = orderDisplay.toString().length > 2 ? '26' : '28'; // Adjust vertical position
                            return  '<svg class="mode-option-svg" width="40" height="40" viewBox="0 0 40 40" style="fill-rule:evenodd">' +
        					            '<circle cx="20" cy="20" r="17" fill="none" stroke="#fff" stroke-width="2"/>' +
        					            '<text x="20" y="' + yPosition + '" text-anchor="middle" font-size="' + fontSize + '" fill="none" stroke="#fff" stroke-width="2">' + orderDisplay + '</text>' +
        					            '<text x="20" y="' + yPosition + '" text-anchor="middle" font-size="' + fontSize + '" fill="' + orderColor + '">' + orderDisplay + '</text>' +
        							'</svg>';
                        };

                        // Process SA data
                        getState('${prefix}.mqtt.sa')
                            .then(function(saData) {
                                try {
                                    if (!saData) {
                                        return; // No SA data received
                                    }

                                    const rooms = JSON.parse(saData);

                                    if (!Array.isArray(rooms)) {
                                        return; // SA data is not an array
                                    }

                                    const foundRoom = rooms.find(function(r) {
                                        const currentId = parseInt(r[0]);
                                        return currentId == roomId; // Comparing: currentId with roomId
                                    });

                                    //console.log('Found room:', foundRoom, 'for ID:', roomId);

                                    if (foundRoom) {
                                        orderDisplay = parseInt(foundRoom[4]) || '-';
                                        if (orderDisplay !== '-') {
                                            const maxOrder = rooms.length;
                                            const hue = Math.round((orderDisplay / maxOrder) * 360);
                                            orderColor = 'hsl(' + hue + ', 80%, 50%)';
                                        }

                                        const label = document.querySelector('#room-label-' + roomId + '-fixed .icon-order');
                                        if (label) {
                                            label.innerHTML = getOrderIcon();
                                            label.dataset.order = orderDisplay;
                                        }
                                    }
                                } catch (e) {
                                    console.error('SA processing error:', e);
                                }
                            })
                            .catch(function(e) {
                                console.error('Failed to load SA data:', e);
                            });

                        // Assemble HTML with data attributes
                        return '<div class="label-content" ' + dataAttributes + '>' +
                          '<div class="label-header">' +
                            '<strong>' + (roomInfo.name || 'Unknown') + '</strong>' +
                            '<span> ' + (stats.TotalArea || '0') + ' m²</span>' +
                            '<div class="settings-button"> ' + settingsIcon + '</div>' +
                          '</div>' +
                          '<div class="icon-container">' +
                            // Order icon with data attribute
                            '<div class="setting-item" title="CleanOrder" data-setting="order">' +
                            '<div class="icon-scale icon-order" data-order="-">' + getOrderIcon() + '</div>' +
                            '</div>' +
                            // Mode icon with data attribute
                            '<div class="setting-item" title="Mode" data-setting="mode">' +
                              '<div class="icon-scale icon-mode">' + icons.mode + '</div>' +
                            '</div>' +
                            // Other icons with data attributes
                            this.createIconItem('Suction', values.suction, 0, icons.suction) +
                            this.createIconItem('Water', values.water, 1, icons.water) +
                            this.createIconItem('Route', values.route, 2, icons.route) +
                            this.createIconItem('Repeat', values.repeat, 3, icons.repeat) +
                          '</div>' +
                          '<div class="progress-container">' +

                            '<div class="progress-bar">' +
                              '<div class="progress-fill" style="width:' + stats.CoveragePercent + '%"></div>' +
                            '</div>' +
                            '<div class="progress-text">' + stats.CleanedArea + ' m² ' + stats.CoveragePercent + '% covered</div>' +
                            '<div class="last-update-text">' + formatDate(stats.LastUpdate) + '</div>' +
                          '</div>' +
                        '</div>';

                     },

                     // Function: =============> Get icon for a specific setting
                     getSettingIcon: function(settingType, value) {
                         const iconSets = {
                             Suction: VisCleaningOptions.Suction,
                             Water: VisCleaningOptions.Water,
                             Route: VisCleaningOptions.Route,
                             Repeat: VisCleaningOptions.Repeat
                         };

                         const iconSet = iconSets[settingType];
                         if (!iconSet) return '';

                         const icon = iconSet.find(item => item.value === value);
                         return icon ? icon.svg : '';
                     },

                     // Updated createIconItem function with data attributes
                     createIconItem: function(title, value, index, iconSvg) {
                         return '<div class="setting-item" title="' + title + '" data-setting="' + title.toLowerCase() + '">' +
                                '<div class="icon-scale icon-' + title.toLowerCase() + '">' + iconSvg + '</div>' +
                                '</div>';
                     },

					  // Function: =============> Update label content and progress
                      updateLabelContent: function(roomId, stats, shouldAnimate = true) {
                        const fixedLabel = document.getElementById('room-label-' + roomId + '-fixed');
                        if (!fixedLabel) return;

						// Control animations
                        if (shouldAnimate) {
                            labelManager.activateLabelAnimations(fixedLabel);
                        } else {
                            labelManager.deactivateLabelAnimations(fixedLabel);
                        }

                        // Update progress bar
                        const progressFill = fixedLabel.querySelector('.progress-fill');
                        if (progressFill) {
                          progressFill.style.width = stats.CoveragePercent + '%';
                        }

                        // Update progress text
                        const progressText = fixedLabel.querySelector('.progress-text');
                        if (progressText) {
                          progressText.textContent = stats.CleanedArea + ' m² ' + stats.CoveragePercent + '% covered';
                        }

                        // Update last update text
                        const lastUpdateText = fixedLabel.querySelector('.last-update-text');
                        if (lastUpdateText) {
                          lastUpdateText.textContent = formatDate(stats.LastUpdate);
                        }
                      },

                      // Function: =============> Create icon HTML element
                      createIconItem: function(title, value, index) {
                        const iconSets = [
                          VisCleaningOptions.Suction,
                          VisCleaningOptions.Water,
                          VisCleaningOptions.Route,
                          VisCleaningOptions.Repeat
                        ];
                        const icon = iconSets[index] ? iconSets[index].find(function(item) {
                          return item.value == value;
                        }) : null;

                        return '<div class="setting-item" title="' + title + '">' +
                          '<div class="icon-scale icon-' + title.toLowerCase() + '">' + (icon ? icon.svg : '') + '</div>' +
                        '</div>';
                      },

					  // Function: =============> Enables animations for a specific label
                      activateLabelAnimations: function(labelElement) {
						if (!labelElement) return;
                          // Suction (icon-suction-spin)
                          labelElement.querySelectorAll('.icon-suction-spin').forEach(el => {
                              el.style.animation = 'icon-suction-spinIt 2s linear infinite';
                          });

                          // Water (icon-drop-container and icon-drop-wave)
                          labelElement.querySelectorAll('.icon-drop-container').forEach(el => {
                              el.style.animation = 'icon-drop-wobble 4s ease-in-out infinite';
                          });

                          labelElement.querySelectorAll('.icon-drop-wave').forEach((el, i) => {
                              el.style.animation = 'icon-drop-wave 4s ease-in-out ' + (i * -0.5) + 's infinite';
							  el.style.fill = '#4287f5';
                          });

                          // Route (icon-route-path with different delays)
                          labelElement.querySelectorAll('.icon-route-path1').forEach(el => {
                              el.style.animation = 'icon-route-draw 7s ease-in-out 0.5s infinite';
                              el.style.strokeDashoffset = '1000';
                              el.style.opacity = '1';
                          });
                          labelElement.querySelectorAll('.icon-route-path2').forEach(el => {
                              el.style.animation = 'icon-route-draw 7s ease-in-out 1s infinite';
							  el.style.strokeDasharray = '1000';
                              el.style.strokeDashoffset = '1000';
                              el.style.opacity = '1';
                          });
                          labelElement.querySelectorAll('.icon-route-path3').forEach(el => {
                              el.style.animation = 'icon-route-draw 7s ease-in-out 1.6s infinite';
                              el.style.strokeDashoffset = '1000';
                              el.style.opacity = '1';
                          });

                          // Repeat paths
                          labelElement.querySelectorAll('.repeatpath1').forEach(el => {
                              el.style.animation = 'draw-and-hide 5s ease-in-out 1s infinite';
                              el.style.strokeDashoffset = '40';
							  el.style.strokeDasharray = '40';
							  el.style.fill = 'none';
                          });
                          labelElement.querySelectorAll('.repeatpath2').forEach(el => {
                              el.style.animation = 'draw-and-hide 5s ease-in-out 0.5s infinite';
                              el.style.strokeDashoffset = '40';
							  el.style.strokeDasharray = '40';
							  el.style.fill = 'none';
                          });
                          labelElement.querySelectorAll('.repeatpath3').forEach(el => {
                              el.style.animation = 'draw-and-hide 5s ease-in-out 0s infinite';
                              el.style.strokeDashoffset = '40';
							  el.style.strokeDasharray = '40';
							  el.style.fill = 'none';
                          });

                          // Repeat number
                          labelElement.querySelectorAll('.repeatnumber').forEach(el => {
                              el.style.animation = 'repeatfloat 4s ease-in-out infinite';
                          });
                      },

                      // Function: =============> Disables animations for a specific label
                      deactivateLabelAnimations: function(labelElement){
                          if (!labelElement) return;
                          const allAnimated = labelElement.querySelectorAll(
                              '.icon-suction-spin, ' +
                              '.icon-drop-container, ' +
                              '.icon-drop-wave, ' +
                              '.icon-route-path1, ' +
                              '.icon-route-path2, ' +
                              '.icon-route-path3, ' +
                              '.repeatpath1, ' +
                              '.repeatpath2, ' +
                              '.repeatpath3, ' +
                              '.repeatnumber'
                      		);

                          allAnimated.forEach(el => {
                              el.style.animation = 'none';

							  if (el.classList.contains('icon-drop-wave')) {
							     el.style.fill = '#fff';
							  }

                              // Reset specific properties
                              if (el.classList.contains('icon-route-path1') ||
                                  el.classList.contains('icon-route-path2') ||
                                  el.classList.contains('icon-route-path3')) {
								  el.style.strokeDasharray = '1000';
                                  el.style.strokeDashoffset = '1000';
                                  el.style.opacity = '1';
                                  el.style.fillOpacity = '1';
                              }

                              if (el.classList.contains('repeatpath1') ||
                                  el.classList.contains('repeatpath2') ||
                                  el.classList.contains('repeatpath3')) {
                                  el.style.strokeDasharray = '40';
                                  el.style.strokeDashoffset = '40';
                                  el.style.opacity = '1';
								  el.style.fill = '#fff';
                              }
                          });
                      },

                      // Function: =============> Update position of a single label
                      updateLabelPosition: function(origLabel, fixedLabel) {
                        const mapRect = labelCache.container.getBoundingClientRect();
                        const labelRect = origLabel.getBoundingClientRect();

                        const relX = labelRect.left - mapRect.left + labelRect.width / 2;
                        const relY = labelRect.top - mapRect.top + labelRect.height / 2;

                        const scale = Math.min(1, 1200 / (window.innerHeight * 0.5));
                        fixedLabel.style.setProperty('--scale', scale);
                        fixedLabel.style.left = Math.max(20, Math.min(mapRect.width - 20, relX)) + 'px';
                        fixedLabel.style.top = Math.max(20, Math.min(mapRect.height - 20, relY)) + 'px';
                        fixedLabel.style.opacity = scale > 0.3 ? '1' : '0';
                      },

                      // Function: =============> Clean up all labels and event listeners
                      cleanup: function() {
                        this.callbacks.forEach(function(cb) {
                          window.removeEventListener('resize', cb);
                          window.removeEventListener('scroll', cb);
                        });
                        this.callbacks = [];

                        if (this.observer) {
                          this.observer.disconnect();
                          this.observer = null;
                        }

                        document.querySelectorAll('.room-label-fixed').forEach(function(el) {
                          el.remove();
                        });

                        if (labelCache.container) {
                          labelCache.container.remove();
                          labelCache.container = null;
                        }
                      },

                      // Function: =============> Get suction level description
                      getSuctionLevel: function(code) {
                        return ['Quiet', 'Standard', 'Turbo', 'Max'][code] || 'Standard';
                      },

                      // Function: =============> Get water level description
                      getWaterLevel: function(code) {
                        if (!code && code !== 0) return 'Low';
                        return code > 30 ? 'Ultra' :
                               code > 20 ? 'High' :
                               code > 10 ? 'Middle' : 'Low';
                      },

					  // Function: =============> Get mode information from mode code
                      getModeIcon: function(modeCode) {
                          // Convert modeCode to string if it's a number
                          const code = typeof modeCode === 'number' ? modeCode.toString() : modeCode;

                          // Map of mode codes to cleaning modes
                          const modeMap = {
                              '0': VisCleaningModes.Sweeping,
                              '1': VisCleaningModes.Mopping,
                              '2': VisCleaningModes.SweepingAndMopping,
                              '3': VisCleaningModes.MoppingAfterSweeping,
                              '4': VisCleaningModes.CustomRoomCleaning
                          };

                          return modeMap[code] ? modeMap[code].icon : '';
                      },

                      // Function: =============> Get route type description
                      getRouteType: function(code) {
                        if (code in labelCache.routeTypes) {
                          return labelCache.routeTypes[code];
                        }

                        const routeMap = {
						  1: 'Standard', 546: 'Standard',
						  2: 'Intensive',
						  3: 'Deep',  768: 'Deep',
						  4: 'Quick', 512: 'Quick'
                        };

                        labelCache.routeTypes[code] = routeMap[code] || 'Standard';
                        return labelCache.routeTypes[code];
                      }

                    };

                    // =============================================
                    // Main Functions
                    // =============================================
                    // 1. stabilizeLabels - Main function to create and position labels
                    function stabilizeLabels() {

                      // 0. Remember currently animated room
                      const currentlyAnimatedRoomId = lastRoomAnimationsId;
                      // 1. Cleaning up old labels
                      labelManager.cleanup();

                      // 2. Only continue if labels should be visible
                      if (!areHiddenState) return;

                      // 3. Load data asynchronously
                      Promise.all([
                        dataService.fetchRoomSettings(),
                        getRoomCleaningData(roomDataMap)
                      ]).then(function(results) {
                        const [roomSettings, roomStats] = results;

                        // 4. Initialize containers
                        const container = labelManager.initContainer();
                        const mapContainer = document.querySelector('.map-container');

						// 5. Remove any existing fixed labels before adding new ones
						document.querySelectorAll('.room-label-fixed').forEach(el => el.remove());

                        // 6. For each label in the DOM
                        document.querySelectorAll('.room-label').forEach(function(origLabel) {
                          const roomId = origLabel.id.replace('room-label-', '');
                          const roomInfo = roomDataMap[roomId];

                          if (!roomInfo) return;

                          // 7. Create fixed label
                          const fixedLabel = document.createElement('div');
                          fixedLabel.className = 'room-label-fixed';
                          //fixedLabel.id = origLabel.id + '-fixed';
						  fixedLabel.id = 'room-label-' + roomId + '-fixed';  // Unique based on roomId

                          // 8. INSERT GENERATED CONTENT (most important part!)
                          fixedLabel.innerHTML = labelManager.createLabelContent(
							roomId,
                            roomInfo,
                            roomSettings[roomId] || {},
                            roomStats[roomId]?.stats || {}
                          );

                          container.appendChild(fixedLabel);

                          // 9. Initialize positioning
                          const updatePosition = function() {
                            const mapRect = mapContainer.getBoundingClientRect();
                            const labelRect = origLabel.getBoundingClientRect();

                            const relX = labelRect.left - mapRect.left + labelRect.width/2;
                            const relY = labelRect.top - mapRect.top + labelRect.height/2;

                            fixedLabel.style.left = relX + 'px';
                            fixedLabel.style.top = relY + 'px';
                          };

                          // 10. Add event listeners
                          const throttledUpdate = utils.throttle(updatePosition, 50);
                          window.addEventListener('resize', throttledUpdate);
                          window.addEventListener('scroll', throttledUpdate);
                          labelManager.callbacks.push(throttledUpdate);

                          // 11. Observer for changes to the original label
                          const observer = new MutationObserver(throttledUpdate);
                          observer.observe(origLabel, { attributes: true });
                          labelManager.observers.push(observer);

                          // 12. Set initial position
                          updatePosition();

                          // 13. Restore animation if necessary
                          if (currentlyAnimatedRoomId) {
                              const newLabel = document.getElementById('room-label-' + currentlyAnimatedRoomId + '-fixed');
                              if (newLabel) {
                                  labelManager.activateLabelAnimations(newLabel);
                                  lastRoomAnimationsId = currentlyAnimatedRoomId; // Update state
                              }
                          }
                        });

                        // Here the radial menu is called when you press Settings in the room-label-x-fixed
                        document.querySelectorAll('.room-label-fixed').forEach(label => {
                            const settingsBtn = label.querySelector('.settings-button');
                            if (!settingsBtn) return;

                            settingsBtn.addEventListener('click', function(e) {
                                e.stopPropagation();
                                e.preventDefault();

                                const roomId = label.id.replace('room-label-', '').replace('-fixed', '');
                                const labelRect = label.getBoundingClientRect();
                                const x = labelRect.left + (labelRect.width * 1.2); // Adjusting position horizontally
                                const y = labelRect.top + (labelRect.height * 2); // Adjusting position vertically

                                const menuSize = 70; // Diameter of the menu

                                // Get the inner layout area of the window
                                const screenWidth = document.documentElement.clientWidth;  // Width of the inner layout area
                                const screenHeight = document.documentElement.clientHeight; // Height of the inner layout area

                                // Calculate the theoretical menu boundaries around the click point
                                const menuLeft = x - (menuSize * 4);
                                const menuRight = x + menuSize / 2;
                                const menuTop = y - (menuSize * 4);
                                const menuBottom = y + menuSize / 2;

                                // Adjusted position (start with the original position)
                                let adjustedX = x;
                                let adjustedY = y;

                                // Adjust horizontally if the menu would be too far right or left
                                if (menuRight > screenWidth) {
                                    adjustedX = screenWidth - 10; // Right edge padding
                                } else if (menuLeft < 0) {
                                    adjustedX = 230; // Left edge padding
                                }

                                // Adjust vertically if the menu would be too far down or up
                                if (menuBottom > screenHeight) {
                                    adjustedY = screenHeight - 10; // Bottom edge padding
                                } else if (menuTop < 0) {
                                    adjustedY = 230; // Top edge padding
                                }

                                // Call the function to toggle the radial menu
                                toggleRadialMenu(adjustedX, adjustedY, roomId);
                            });

                        });

                      }).catch(function(error) {
                        console.error('Error loading label data:', error);
                      });
                    };

					let lastRoomAnimationsId = null; // save animations for the previous label
                    // 2. updateRoomInfo - Room info updater
                    const updateRoomInfo = (function() {
                      const roomElementsCache = new Map();

                      return utils.throttle(function(data) {
                        if (!data || !data.currentRoom) return;



                        const currentRoom = data.currentRoom;
                        const coverage = data.CoveragePercent || 0;


                        if (!roomElementsCache.has(currentRoom)) {
                          const roomNumber = roomNameNumberMap ? roomNameNumberMap[currentRoom] : null;
                          if (roomNumber) {
                            const element = document.getElementById('room-' + roomNumber);
                            if (element) roomElementsCache.set(currentRoom, element);

						        if (lastRoomAnimationsId !== roomNumber) {
						            const fixedLabel = document.getElementById('room-label-' + roomNumber + '-fixed');
						            if (fixedLabel) {
						                // Disables animations of the previous label, if one exists
						                if (lastRoomAnimationsId !== null) {
						                    const previousLabel = document.getElementById('room-label-' + lastRoomAnimationsId + '-fixed');
						                    if (previousLabel) {
						                        labelManager.deactivateLabelAnimations(previousLabel); // Disables animations for the previous label
						                    }
						                }
						                // Enables animations for the new label
						                labelManager.activateLabelAnimations(fixedLabel);
						            }
						            lastRoomAnimationsId = roomNumber;
						        }
						  }
						}

						updateRoomProgress(roomNameNumberMap[currentRoom]).then(roomStats => {
						const coverageRatio = roomStats.CoveragePercent / 100;

						  const roomElement = roomElementsCache.get(currentRoom);
						  document.getElementById('current-room').textContent = currentRoom + ' ' + roomStats.CoveragePercent + ' %';
						  document.getElementById('current-CleanedArea').textContent = roomStats.CleanedArea + ' m² / ' + roomStats.TotalArea + ' ';

                          if (roomElement) {
                            const path = roomElement.querySelector('path');
                            if (path) {
                              roomElement.style.opacity = 0.3 + (coverageRatio * 0.5);
                              path.style.fill = 'hsla(' + (120 * coverageRatio) + ', 100%, 50%, 0.3)'; // Calculate the cleaned area in the room and update the room color accordingly
                            }
                          }

						});


                      }, 100);
                    })();

                    // 3. updateFixedLabelsWithNewData - Update labels with new position data
                    function updateFixedLabelsWithNewData(newPosHistory) {
                      const latestRoomData = getLatestRoomDataFromHistory(newPosHistory || posHistory);

                      document.querySelectorAll('.room-label-fixed').forEach(function(fixedLabel) {
                        const roomId = fixedLabel.id.replace('room-label-', '').replace('-fixed', '');
                        const roomName = roomDataMap[roomId] ? roomDataMap[roomId].name : null;
                        const roomData = latestRoomData[roomName] || {};

                        fixedLabel.innerHTML = '<div class="label-content">' +
                          '<strong style="font-size: 14px">' + roomName + '</strong>' +
                          (roomData.TotalArea ? ' <span style="font-size: 12px">' + roomData.TotalArea + ' m²</span>' : '') +
                          '<br>' +
                          (roomData.CoveragePercent ? roomData.CoveragePercent + '% covered' : 'No data') + '<br>' +
                          (roomData.CleanedArea ? roomData.CleanedArea + ' m² cleaned' : '') +
                        '</div>';
                      });
                    }

                    // 4. getLatestRoomDataFromHistory - Process position history
                    function getLatestRoomDataFromHistory(posHistory) {
                      const roomData = {};

                      if (!Array.isArray(posHistory)) {
                        return roomData;
                      }

                      posHistory.forEach(function(entry) {
                        if (entry.room) {
                          const key = entry.room;
                          if (!roomData[key] || (roomData[key].timestamp < entry.timestamp)) {
                            roomData[key] = {
                              CleanedArea: entry.CleanedArea,
                              CoveragePercent: entry.CoveragePercent,
                              TotalArea: entry.TotalArea,
                              timestamp: entry.timestamp
                            };
                          }
                        }
                      });

                      return roomData;
                    }

                    // Function to update progress and labels
					async function updateRoomProgress(roomId) {
                        try {
                            const roomInfo = roomDataMap[roomId];
                            if (!roomInfo) return getDefaultStats(); // Return defaults if room not found
                            const basePath = '${prefix}.state.cleaninginfo.${DH_CurMap}.' + roomInfo.name;

                            const stats = await getRoomStats(basePath);

                            // Update visual label with new data
                            labelManager.updateLabelContent(roomId, stats);

                            return {
                                ...getDefaultStats(), // Default values as base
                                ...stats              // Override with actual values
                            };
                        } catch (error) {
                            console.error('Error updating room progress:', error);
                            return getDefaultStats();
                        }
                    }

                    function getDefaultStats() {
                        return {
                            CleanedArea: 0,         // Already cleaned area in m�
                            TotalArea: 0,           // Total room area in m�
                            CoveragePercent: 0,     // Percentage of area covered
                            cleaningRatio: 0,       // Cleaned/Total ratio
                            LastUpdate: null        // Timestamp of last update
                        };
                    }



                    // Clean up on window unload
                    window.addEventListener('beforeunload', function() {
                      labelManager.cleanup();
                    });

					// =============================================
                    // WebSocket
                    // =============================================

					// WebSocket for real-time updates
                    function setupUpdates() {
                        console.log('Initializing robot updates...');
                        let lastStatusPoll = 0;
						let lastPositionPoll = 0;
						let lastHistoryPoll = 0;

                        // 1. Polling as fallback
						const pollInterval = setInterval(() => {
							// Query status less frequently
							if (Date.now() - lastStatusPoll > 2000) {
							fetchLiveStatus()
								.then(processStatusUpdate)
								.catch(console.error);
								lastStatusPoll = Date.now();
							}


                            // Check position more often
                            if (Date.now() - lastPositionPoll > 2000) {
								fetchRobotStatus().then(data => {
                                    if (data?.position) {
                                        updateRobotPosition(data.position.x, data.position.y);
                                        updateRoomInfo(data);
                                    }
                                }).catch(console.error);
                                lastPositionPoll = Date.now();
                            }

							// Query History less frequently
                            if (Date.now() - lastHistoryPoll > 120000) {
								//fetchInitialHistory().catch(() => null)
								fetchInitialHistory().then(updatePathFromHistory);
                                lastHistoryPoll = Date.now();
                            }
                        }, 1000);

                        // 2. WebSocket Listener
                        if (typeof vis !== 'undefined' && vis.conn && vis.conn._socket) {
                            console.log('WebSocket connection established');

                            // Position updates
                            vis.conn._socket.on('${prefix}.vis.robotUpdate', (data) => {
                                try {
                                    const update = typeof data === 'string' ? JSON.parse(data) : data;
                                    if (update?.position) {
                                        processPositionUpdate(update);
                                    }
                                } catch (e) {
                                    console.error('Position update error:', e);
                                }
                            });

                            // History updates
                            vis.conn._socket.on('${prefix}.vis.PosHistory${DH_CurMap}', (data) => {
                                try {
                                    const history = typeof data === 'string' ? JSON.parse(data) : data;
                                    posHistory = Object.values(history);
                                    updatePathFromHistory(history);
                                    updateFixedLabelsWithNewData(posHistory);
                                } catch (e) {
                                    console.error('History update error:', e);
                                }
                            });

                            // Status updates
                            vis.conn._socket.on('${prefix}.vis.State', (data) => {
                                try {
                                    processStatusUpdate(data);
                                } catch (e) {
                                    console.error('Status update error:', e);
                                }
                            });

                            // Connection handling
                            vis.conn._socket.on('connect', () => {
                                console.log('WebSocket reconnected');
                                fetchInitialHistory().then(updatePathFromHistory);
                            });

                            vis.conn._socket.on('disconnect', () => {
                                console.warn('WebSocket disconnected');
                            });
                        }

                        // Initial data load
                        fetchInitialData();
                    }

                    // Helper functions for Position updates
					function processPositionUpdate(update) {
                        const {x, y} = update.position;
                        updateRobotPosition(x, y);

                        if (update.currentRoom || update.TotalArea) {
                            updateRoomInfo(update);
                        }
                    }


                    function processStatusUpdate(state) {
                        if (!state) return;

                        const statusUpdate = typeof state === 'string' ? JSON.parse(state) : state;
                        const statusNumber = parseInt(statusUpdate?.val ?? statusUpdate);

                        if (!isNaN(statusNumber)) {
                            const statusText = statusMapping[statusNumber] || "Unknown";
                            updateChargerStatus(statusText);
                        } else {
                            console.warn('Invalid status number received:', statusUpdate);
                        }
                    }

                    async function fetchInitialData() {
                        try {
                            const [positionData, history] = await Promise.all([
                                fetchRobotStatus().catch(() => null),
                                fetchInitialHistory().catch(() => null)
                            ]);

                            if (positionData?.position) {
                                updateRobotPosition(positionData.position.x, positionData.position.y);
                                updateRoomInfo(positionData);
                            }

                            if (history) {
                                updatePathFromHistory(history);
                            } else {
                                hideRobotPosition();
                            }

                            // Initial status
                            const status = await fetchLiveStatus().catch(() => null);
                            processStatusUpdate(status);
                        } catch (e) {
                            console.error('Initial data loading error:', e);
                        }
                    }

                    // Helper function to fetch Robot position
                    function fetchRobotStatus() {
                        return new Promise((resolve) => {
                            if (typeof vis !== 'undefined' && vis.conn && vis.conn._socket) {
                                vis.conn._socket.emit('getState', '${prefix}.vis.robotUpdate', (err, res) => {
                                    if (!err && res && res.val) {
                                        try {
                                            resolve(typeof res.val === 'string' ? JSON.parse(res.val) : res.val);
                                        } catch (e) {
                                            console.error('Parsing error:', e);
                                            resolve({});
                                        }
                                    } else {
                                        resolve({});
                                    }
                                });
                            }
                        });
                    }

                    // Helper function to fetch live Status
                    function fetchLiveStatus() {
                        return new Promise((resolve) => {
                            if (typeof vis !== 'undefined' && vis.conn && vis.conn._socket) {
                                vis.conn._socket.emit('getState', '${prefix}.vis.State', (err, res) => {
                                    if (!err && res && res.val) {
                                        try {
                                            resolve(typeof res.val === 'string' ? JSON.parse(res.val) : res.val);
                                        } catch (e) {
                                            console.error('Parsing error:', e);
                                            resolve({});
                                        }
                                    } else {
                                        resolve({});
                                    }
                                });
                            }
                        });
                    }

					// Helper function to fetch Robot History
                    function fetchInitialHistory() {
                        return new Promise((resolve) => {
                            if (typeof vis !== 'undefined' && vis.conn && vis.conn._socket) {
                                vis.conn._socket.emit('getState', '${prefix}.vis.PosHistory${DH_CurMap}', (err, res) => {
                                    if (!err && res && res.val) {
                                        try {
                                            const historyData = typeof res.val === 'string' ? JSON.parse(res.val) : res.val;
                                            updatePathFromHistory(historyData);
                                            console.log('Initial history loaded'+ JSON.stringify(historyData));
                                            resolve(historyData);
                                        } catch (e) {
                                            console.error('Error parsing history data:', e);
                                            resolve(null);
                                        }
                                    } else {
                                        console.error('Error fetching history:', err);
                                        resolve(null);
                                    }
                                });
                            } else {
                                console.error('Socket connection not available');
                                resolve(null);
                            }
                        });
                    }

					// =============================================
                    // Load, save and apply the settings
                    // =============================================
					let debouncedSaveSettings;

					// 1. Define debounce function in global scope
					function debounce(func, delay) {
					    let timeout;
					    return function(...args) {
					        clearTimeout(timeout);
					        timeout = setTimeout(() => func.apply(this, args), delay);
					    };
					}

					async function setupPerspectiveSettings() {
                        console.log('Initializing all view settings...');
                        let lastSaveTime = 0;

                        // 1. Polling as a fallback
                        const pollInterval = setInterval(() => {
                            if (Date.now() - lastSaveTime > 30000) { // Synchronize every 30 seconds
                                fetchAllSettings()
                                    .then(applyAllSettings)
                                    .catch(console.error);
                                lastSaveTime = Date.now();
                            }
                        }, 1000);

                        // 2. WebSocket Listener
                        if (typeof vis !== 'undefined' && vis.conn && vis.conn._socket) {
                            vis.conn._socket.on('${prefix}.vis.ViewSettings${DH_CurMap}', (data) => {
                                try {
                                    const settings = typeof data === 'string' ? JSON.parse(data) : data;
                                    applyAllSettings(settings);
                                } catch (e) {
                                    console.error('View settings update error:', e);
                                }
                            });

                            vis.conn._socket.on('connect', () => {
                                console.log('WebSocket reconnected, loading view settings');
                                fetchAllSettings().then(applyAllSettings);
                            });
                        }

                        // 3. Initial load
                        fetchAllSettings()
                            .then(applyAllSettings)
                            .catch(console.error);

                        // Helper functions
                        async function fetchAllSettings() {
                            return new Promise((resolve) => {
                                if (typeof vis !== 'undefined' && vis.conn && vis.conn._socket) {
                                    vis.conn._socket.emit('getState', '${prefix}.vis.ViewSettings${DH_CurMap}', (err, res) => {
                                        if (!err && res && res.val) {
                                            try {
                                                resolve(typeof res.val === 'string' ? JSON.parse(res.val) : res.val);
                                            } catch (e) {
                                                console.error('Parsing error:', e);
                                                resolve(getDefaultSettings());
                                            }
                                        } else {
                                            resolve(getDefaultSettings());
                                        }
                                    });
                                } else {
                                    resolve(getDefaultSettings());
                                }
                            });
                        }

						let lastSettings = null;
                        function applyAllSettings(settings) {
                            if (!settings) return;

							if (JSON.stringify(settings) === JSON.stringify(lastSettings)) {
								return
							}
							lastSettings = settings;

                            console.log('Applying all view settings:', settings);

                            // 1. Apply perspective settings
                            if (settings.perspective) {
                                xRotation = settings.perspective.xRotation || 0;
                                yRotation = settings.perspective.yRotation || 0;
                                zRotation = settings.perspective.zRotation || 0;
                                perspective = settings.perspective.perspective || 1200;
                                zoomLevel = settings.perspective.zoom || 100;
                                xPosition = settings.perspective.xPosition || 0;
                                yPosition = settings.perspective.yPosition || 0;

                                // Update UI elements
                                document.getElementById('x-rotation').value = xRotation;
                                document.getElementById('y-rotation').value = yRotation;
                                document.getElementById('z-rotation').value = zRotation;
                                document.getElementById('perspective').value = perspective;
                                document.getElementById('zoom-level').value = zoomLevel;
                                document.getElementById('x-position').value = xPosition;
                                document.getElementById('y-position').value = yPosition;

                                if (settings.perspective.bgColor) {
                                    document.getElementById('bg-color-picker').value = settings.perspective.bgColor;
                                    document.documentElement.style.setProperty('--map-background-color', settings.perspective.bgColor);
                                }

                                // Apply transformation
                                updateTransformation();
                                updateSliderValues();
                            }

                            // 2. Visibility settings
                            if (settings.visibility) {
                                showRobotPath = settings.visibility.showRobotPath !== false;
                                showHistoryPath = settings.visibility.showHistoryPath !== false;
                                areHiddenState = settings.visibility.labelsHidden || false;

								document.getElementById('toggle-robot-path').classList.toggle('active', showRobotPath);
                                //document.getElementById('toggle-robot-path').textContent = showRobotPath ? 'Hide Robot Path' : 'Show Robot Path';
								document.getElementById('toggle-history-path').classList.toggle('active', showHistoryPath);
                                //document.getElementById('toggle-history-path').textContent = showHistoryPath ? 'Hide History Path' : 'Show History Path';
								document.getElementById('toggle-room-label').classList.toggle('active', areHiddenState);
                                //document.getElementById('toggle-room-label').textContent = areHiddenState ? 'Hide Room Labels' : 'Show Room Labels';

								stabilizeLabels();

                                document.getElementById('robot-path-current').style.display = showRobotPath ? 'block' : 'none';
                                document.getElementById('robot-path-history').style.display = showHistoryPath ? 'block' : 'none';
                            }

                            // 3. Choice states
                            if (settings.selections) {
                                selectedRooms = settings.selections.rooms || [];
                                selectedCarpets = settings.selections.carpets || [];

                                // Mark rooms
                                selectedRooms.forEach(id => {
                                    const el = document.getElementById('room-' + id);
                                    if (el) el.classList.add('selected');
                                });

                                // Mark carpets
                                selectedCarpets.forEach(id => {
                                    const el = document.getElementById('carpet-' + id);
                                    if (el) el.classList.add('selected');
                                });

                                if (selectedRooms.length > 0) {
                                    updateCurrentRoomDisplay(selectedRooms[0]);
                                }
                            }

                            // Update UI
                            updateSliderValues();
                            updateTransformation();
                            document.documentElement.style.setProperty('--map-background-color', settings.perspective?.bgColor || '#ffffff');
                            stabilizeLabels();
                        }

                        function getDefaultSettings() {
                            return {
                                perspective: {
                                    xRotation: 0,
                                    yRotation: 0,
                                    zRotation: 0,
                                    perspective: 1200,
                                    zoom: 100,
                                    xPosition: 0,
                                    yPosition: 0,
                                    bgColor: '#ffffff'
                                },
                                visibility: {
                                    showRobotPath: true,
                                    showHistoryPath: true,
                                    labelsHidden: false
                                },
                                selections: {
                                    rooms: [],
                                    carpets: []
                                }
                            };
                        }

                        // Debounced Save function
                        debouncedSaveSettings = debounce(async () => {
                            const settings = {
                                perspective: {
                                    xRotation: parseInt(document.getElementById('x-rotation').value),
                                    yRotation: parseInt(document.getElementById('y-rotation').value),
                                    zRotation: parseInt(document.getElementById('z-rotation').value),
                                    perspective: parseInt(document.getElementById('perspective').value),
                                    zoom: parseInt(document.getElementById('zoom-level').value),
                                    xPosition: parseInt(document.getElementById('x-position').value),
                                    yPosition: parseInt(document.getElementById('y-position').value),
                                    bgColor: document.getElementById('bg-color-picker').value
                                },
                                visibility: {
                                    showRobotPath: showRobotPath,
                                    showHistoryPath: showHistoryPath,
                                    labelsHidden: areHiddenState
                                },
                                selections: {
                                    rooms: selectedRooms,
                                    carpets: selectedCarpets
                                }
                            };

                            if (typeof vis !== 'undefined' && vis.conn && vis.conn._socket) {
                                vis.conn._socket.emit('setState', '${prefix}.vis.ViewSettings${DH_CurMap}', {
                                    val: JSON.stringify(settings),
                                    ack: true
                                }, (err) => {
                                    if (!err) {
                                        lastSaveTime = Date.now();
                                        console.log('All view settings saved');
                                    } else {
                                        console.error('Error saving view settings:', err);
                                    }
                                });
                            }
                        }, 1000);

                        // Event listener for all changes
                        function setupChangeListeners() {
                            // Perspective elements
                            const perspectiveElements = [
                                'x-rotation', 'y-rotation', 'z-rotation',
                                'perspective', 'zoom-level', 'x-position',
                                'y-position', 'bg-color-picker'
                            ];

                            perspectiveElements.forEach(id => {
                                const element = document.getElementById(id);
                                if (element) element.addEventListener('change', debouncedSaveSettings);
                            });

                            // Visibility buttons
                            ['toggle-robot-path', 'toggle-history-path', 'toggle-room-label'].forEach(id => {
                                const element = document.getElementById(id);
                                if (element) element.addEventListener('click', debouncedSaveSettings);
                            });

                            // Room/Carpet Selection
                            clickLayer.addEventListener('click', debouncedSaveSettings);
                        }

                        // initialization
                        setupChangeListeners();
                    }


					// =============================================
                    // Start Menu Animation System
                    // =============================================

                    // Global variables
                    let menuTimeout;
                    const MENU_TIMEOUT_DURATION = 120000; // 120 seconds
                    let isMenuInteracting = false;
                    let lastInteractionTime = Date.now();
                    let isClosing = false;



                    // Improved timer system
                    function resetMenuTimer() {
                        clearTimeout(menuTimeout);
                        lastInteractionTime = Date.now();

                        menuTimeout = setTimeout(() => {
                            const inactiveDuration = Date.now() - lastInteractionTime;
                            if (inactiveDuration >= MENU_TIMEOUT_DURATION - 100 && !isClosing) {
                                closeAllMenusWithAnimation();
                            }
                        }, MENU_TIMEOUT_DURATION);
                    }

                    // Closing (for auto-close)
                    function closeAllMenusWithAnimation() {
                        if (isClosing) return;
                        isClosing = true;

                        const activeMenus = document.querySelectorAll('.menu-level.active');
                        if (activeMenus.length === 0) {
                            isClosing = false;
                            return;
                        }

                        // Animation for each active menu
                        activeMenus.forEach(menu => {
                            menu.style.transform = 'translateX(20px) rotateY(20deg)';
                            menu.style.opacity = '0';

                            setTimeout(() => {
                                menu.classList.remove('active');
                                isClosing = false;
                            }, 500);
                        });

                        // Reset main button
                        const mainBtn = document.getElementById('main-menu-btn');
                        mainBtn.classList.remove('active');
                        mainBtn.style.transform = 'rotate(0) scale(1)';
                    }

                    // Manual closing function
                    function manuallyCloseAllMenus() {
                        if (isClosing) return;
                        isClosing = true;

                        const activeMenus = document.querySelectorAll('.menu-level.active');
                        if (activeMenus.length === 0) {
                            isClosing = false;
                            return;
                        }

                        activeMenus.forEach(menu => {
                            menu.style.transform = 'translateX(20px) rotateY(20deg)';
                            menu.style.opacity = '0';

                            setTimeout(() => {
                                menu.classList.remove('active');
                                // Hide the summary tooltip regardless of which menu is closed
                                document.getElementById('summary-tooltip').classList.remove('active');

                                isClosing = false;
                            }, 500);
                        });

                        const mainBtn = document.getElementById('main-menu-btn');
                        mainBtn.classList.remove('active');
                        mainBtn.style.transform = 'rotate(0) scale(1)';

						document.getElementById('summary-tooltip').classList.remove('active');
                    }

                    // Interaction handler
                    function handleInteraction() {
                        isMenuInteracting = true;
                        lastInteractionTime = Date.now();
                        resetMenuTimer();

                        setTimeout(() => {
                            isMenuInteracting = false;
                        }, 300);
                    }

                    // Show menu function
                    function showMenu(menuId) {
                        handleInteraction();

                        // Close only other menus
                        document.querySelectorAll('.menu-level').forEach(menu => {
                            if (menu.id !== menuId && menu.classList.contains('active')) {
                                menu.style.transform = 'translateX(20px) rotateY(20deg)';
                                menu.style.opacity = '0';
                                setTimeout(() => {
                                    menu.classList.remove('active');
                                    // Hide the summary when we leave the clean menu
                                    if (menu.id === 'clean-menu') {
										hideSummaryTooltip();
                                    }
                                }, 500);
                            }
                        });

                        const menu = document.getElementById(menuId);
                        if (menu) {
                            menu.classList.add('active');
                            setTimeout(() => {
                                menu.style.transform = 'translateX(0) rotateY(0)';
                                menu.style.opacity = '1';

								// Show the summary only for the Clean menu
								if (menuId === 'clean-menu') {
                                    document.getElementById('summary-tooltip').style.display = 'block';
                                    setTimeout(() => {
										document.getElementById('summary-tooltip').classList.add('active');
										positionSummaryTooltip();
                                    }, 10);
								}
								// Automatically scroll up
								menu.scrollTo(0, 0);
                            }, 10);
                        }
                    }

					// Function to position the summary
					function positionSummaryTooltip() {
                        const tooltip = document.getElementById('summary-tooltip');
                        const coverageInfo = document.querySelector('.coverage-info');
                    	tooltip.style.opacity = '1';
                        if (tooltip && coverageInfo) {
                            const rect = coverageInfo.getBoundingClientRect();
                            tooltip.style.top = (rect.bottom + 10) + 'px';
                            tooltip.style.left = rect.left + 'px';
                        }
                    }

                    function hideSummaryTooltip() {
                        const tooltip = document.getElementById('summary-tooltip');
                        if (tooltip) {
                            tooltip.style.opacity = '0';
                            setTimeout(() => {
                                tooltip.classList.remove('active');
                            }, 300); // Match the transition duration
                        }
                    }

                    // Event listener for the summary resize:
                    window.addEventListener('resize', positionSummaryTooltip);


                    // Event listeners for menu items
                    document.querySelectorAll('.menu-level, .menu-item, .back-button, .slider-container, input, label, button, .icon-hide-show-menu, .hide-show-option, hide-show-option-svg, .icon-clean-menu, .mode-option-buttons, .mode-option, mode-option-svg, .option-label, .selection-summary, .mode-option-svg').forEach(element => {
                        element.addEventListener('mouseenter', handleInteraction);
                        element.addEventListener('mouseleave', () => {
                            isMenuInteracting = false;
                            resetMenuTimer();
                        });
                        element.addEventListener('click', handleInteraction);
                    });

                    // Improved touch support
                    document.querySelectorAll('.menu-level, .menu-item, .back-button, .slider-container, input, label, button, .icon-hide-show-menu, .hide-show-option, hide-show-option-svg, .icon-clean-menu, .mode-option-buttons, .mode-option, mode-option-svg, .option-label, .selection-summary, .mode-option-svg').forEach(item => {
                        item.addEventListener('touchstart', handleInteraction, { passive: true });
                        item.addEventListener('touchend', () => {
                            isMenuInteracting = false;
                            resetMenuTimer();
                        }, { passive: true });
                    });

                    // Main button event handler
                    document.getElementById('main-menu-btn').addEventListener('click', function(e) {
                        e.stopPropagation();
                        handleInteraction();

                        const mainMenu = document.getElementById('main-menu');
                        const wasActive = mainMenu.classList.contains('active');

                        if (wasActive) {
                            manuallyCloseAllMenus();
                        } else {
                            showMenu('main-menu');
                            this.style.transform = 'rotate(135deg) scale(1.1)';
                        }
                        this.classList.toggle('active');
                    });

                    // Menu navigation
                    document.querySelectorAll('[data-next]').forEach(button => {
                        button.addEventListener('click', function() {
                            handleInteraction();
                            setTimeout(() => {
                                const nextMenu = this.getAttribute('data-next');
                                showMenu(nextMenu);
                            }, 200);
                        });
                    });

                    document.querySelectorAll('[data-back]').forEach(button => {
                        button.addEventListener('click', function() {
                            handleInteraction();
                            setTimeout(() => {
                                const backMenu = this.getAttribute('data-back');
                                showMenu(backMenu);
                            }, 200);
                        });
                    });

                    // Click outside closes menu
                    document.addEventListener('click', function(e) {
						// Close the menu ONLY when clicked outside
                        if (
						    !e.target.closest('.control-panel') &&
						    !e.target.closest('.mode-option') &&
						    !e.target.closest('.mode-option-buttons')
						    ) {
                                manuallyCloseAllMenus();
								hideSummaryTooltip();
                        }
                    });

                    function startSpectacularAnimation() {

                        // PREPARE ELEMENTS
                        const controls = {
                            xRotation: document.getElementById('x-rotation'),
                            yRotation: document.getElementById('y-rotation'),
                            zRotation: document.getElementById('z-rotation'),
                            perspective: document.getElementById('perspective'),
                            zoom: document.getElementById('zoom-level'),
                            xPos: document.getElementById('x-position'),
                            yPos: document.getElementById('y-position')
                        };

                        // ANIMATION CONTROLLER
                        const AnimationMaster = {
                            phase: 0,
                            speed: 0.002,
                            running: false,
                            requestId: null,
                            startTime: null,

                            // Spectacular effect compositions
                            effects: {
                                // 1. "Orbit" flight around the map
                                orbitalFlight: (progress) => {
                                    const angle = progress * Math.PI * 2;
                                    return {
                                        x: Math.sin(angle * 1.3) * 45,
                                        y: progress * 360,
                                        z: Math.cos(angle * 0.7) * 20,
                                        perspective: 800 + Math.sin(angle * 2) * 600,
                                        zoom: 80 + Math.sin(angle * 4) * 20,
                                        xPos: Math.sin(angle * 1.5) * 150,
                                        yPos: Math.cos(angle * 0.5) * 100
                                    };
                                },

                                // 2. "Drone flight" simulation
                                droneFlight: (progress) => {
                                    const angle = progress * Math.PI * 4;
                                    return {
                                        x: 15 + Math.sin(angle) * 10,
                                        y: progress * 720,
                                        z: Math.cos(angle * 0.3) * 5,
                                        perspective: 500 + Math.sin(angle * 3) * 400,
                                        zoom: 60 + Math.sin(angle * 2) * 40,
                                        xPos: Math.sin(angle * 2) * 200,
                                        yPos: Math.cos(angle) * 80
                                    };
                                },

                                // 3. "Action cam" mode
                                actionCam: (progress) => {
                                    const angle = progress * Math.PI * 8;
                                    return {
                                        x: Math.sin(angle * 2) * 60,
                                        y: progress * 1440,
                                        z: Math.cos(angle * 3) * 15,
                                        perspective: 300 + Math.sin(angle * 5) * 700,
                                        zoom: 30 + Math.sin(angle * 8) * 70,
                                        xPos: Math.sin(angle * 4) * 300,
                                        yPos: Math.cos(angle * 2) * 150
                                    };
                                }
                            },

                            // Main animation loop
                            animate: (timestamp) => {
                                if (!AnimationMaster.startTime) AnimationMaster.startTime = timestamp;
                                const elapsed = timestamp - AnimationMaster.startTime;
                                AnimationMaster.phase = (AnimationMaster.phase + AnimationMaster.speed) % 1;

                                // Dynamic effect switching
                                let effect;
                                if (AnimationMaster.phase < 0.33) {
                                    effect = AnimationMaster.effects.orbitalFlight(AnimationMaster.phase * 3);
                                } else if (AnimationMaster.phase < 0.66) {
                                    effect = AnimationMaster.effects.droneFlight((AnimationMaster.phase - 0.33) * 3);
                                } else {
                                    effect = AnimationMaster.effects.actionCam((AnimationMaster.phase - 0.66) * 3);
                                }

                                // Apply values
                                controls.xRotation.value = effect.x;
                                controls.yRotation.value = effect.y;
                                controls.zRotation.value = effect.z;
                                controls.perspective.value = effect.perspective;
                                controls.zoom.value = effect.zoom;
                                controls.xPos.value = effect.xPos;
                                controls.yPos.value = effect.yPos;

                                // Trigger events
                                Object.values(controls).forEach(control => {
                                    control.dispatchEvent(new Event('input'));
                                });

                                // Special effects
                                if (AnimationMaster.phase > 0.5 && AnimationMaster.phase < 0.55) {
                                    document.querySelector('.map-content').style.filter = 'brightness(1.5)';
                                } else {
                                    document.querySelector('.map-content').style.filter = '';
                                }

                                AnimationMaster.requestId = requestAnimationFrame(AnimationMaster.animate);
                            },

                            start: () => {
                                if (!AnimationMaster.running) {
                                    AnimationMaster.running = true;
                                    AnimationMaster.startTime = null;
                                    AnimationMaster.requestId = requestAnimationFrame(AnimationMaster.animate);
                                }
                            },

                            stop: () => {
                                if (AnimationMaster.running) {
                                    cancelAnimationFrame(AnimationMaster.requestId);
                                    AnimationMaster.running = false;
                                    document.querySelector('.map-content').style.filter = '';
                                }
                            },

                            toggle: function(event) {
                                if (AnimationMaster.running) {
                                    AnimationMaster.stop();
                                    event.target.textContent = 'Start Map Spectacle';
                                } else {
                                    areHiddenState = false;
                                    stabilizeLabels();
                                    //document.getElementById('toggle-room-label').textContent = 'Show room labels';
									document.getElementById('toggle-room-label').classList.toggle('active', areHiddenState);
                                    AnimationMaster.start();
                                    event.target.textContent = 'Stop Map Spectacle';
                                }
                            }
                        };

                        // Event listeners for Animation
                        document.getElementById('animation-toggle').addEventListener('click', AnimationMaster.toggle);
                        document.getElementById('animation-speed').addEventListener('input', (e) => {
                            AnimationMaster.speed = e.target.value * 0.0005;
                            document.getElementById('speed-value').textContent = e.target.value + 'x';
                        });
                    }

					// =============================================
                    // Update the charging station status system
                    // =============================================

                    // Function that loops through all statuses continuously with delay
                    function loopChargerStatus() {
                        if (stopStatusLoop) {
                            console.log('Status loop stopped');
                            return; // Exit the function if stop flag is set
                        }
                        updateChargerStatus(statusList[currentStatusIndex]);
                        // Move to the next status or restart from beginning
                        currentStatusIndex = (currentStatusIndex + 1) % statusList.length;
                        statusLoopTimeout = setTimeout(loopChargerStatus, 5000);
                    }

                    // Event handler for the toggle button
                    document.getElementById('Base-station-toggle').addEventListener('click', function() {
                        const button = this;
                        const robotPos = document.getElementById('robot-position');

                        if (stopStatusLoop) {
                            // Reset index when starting fresh
                            //currentStatusIndex = 0;
                            stopStatusLoop = false;
                            console.log('Starting status loop');
                            button.textContent = 'Stop Base Spectacle';
                            if (robotPos) robotPos.style.opacity = 0;
                            loopChargerStatus();
                        } else {
                            // Stop the loop
                            stopStatusLoop = true;
                            clearTimeout(statusLoopTimeout); // Clear any pending timeout
                            console.log('Stopping status loop');
                            button.textContent = 'Start Base Spectacle';
                            if (robotPos) robotPos.style.opacity = 1;
                        }
                    });

                    const statusTranslations = {
                      'EN': {
                        'sweeping': 'Sweeping',
                        'mopping': 'Mopping',
                        'sweeping-and-mopping': 'Sweeping and mopping',
                        'charging': 'Charging',
                        'smart-charging': 'Smart Charging',
                        'charging-completed': 'Charging Completed',
                        'auto-emptying': 'Auto-Emptying',
                        'drying': 'Drying',
                        'returning': 'Returning',
                        'returning-to-wash': 'Returning to Wash',
                        'returning-auto-empty': 'Returning to Empty',
                        'clean-add-water': 'Adding Water',
                        'washing-paused': 'Washing Paused',
                        'returning-remove-mop': 'Removing Mop',
                        'returning-install-mop': 'Installing Mop',
                        'sleep': 'Sleeping',
                        'paused': 'Paused',
                        'remote-control': 'Remote Control',
                        'water-check': 'Checking Water',
                        'monitoring': 'Monitoring',
                        'monitoring-paused': 'Monitoring Paused',
                        'error': 'Error',
                        'idle': 'Idle',
                        'building': 'Building',
                        'upgrading': 'Upgrading',
                        'clean-summon': 'Clean summon',
                        'station-reset': 'Station reset',
                        'second-cleaning': 'Second cleaning',
                        'human-following': 'Human following',
                        'spot-cleaning': 'Spot cleaning',
                        'shortcut': 'Shortcut',
                        'washing': 'Washing',
                        'add-clean-water': 'Add clean water'
                      },
                      'DE': {
                        'sweeping': 'Staubsaugen',
                        'mopping': 'Wischen',
                        'sweeping-and-mopping': 'Staubsaugen und Wischen',
                        'charging': 'Laden',
                        'smart-charging': 'Intelligentes Laden',
                        'charging-completed': 'Laden abgeschlossen',
                        'auto-emptying': 'Automatisches Entleeren',
                        'drying': 'Trocknen',
                        'returning': 'Zurückkehren',
                        'returning-to-wash': 'Zurück zum Waschen',
                        'returning-auto-empty': 'Zurück zum Entleeren',
                        'clean-add-water': 'Wasser nachfüllen',
                        'washing-paused': 'Waschen pausiert',
                        'returning-remove-mop': 'Mopp entfernen',
                        'returning-install-mop': 'Mopp installieren',
                        'sleep': 'Schlafen',
                        'paused': 'Pausiert',
                        'remote-control': 'Fernsteuerung',
                        'water-check': 'Wasser prüfen',
                        'monitoring': 'Überwachen',
                        'monitoring-paused': 'Überwachung pausiert',
                        'error': 'Fehler',
                        'idle': 'Inaktiv',
                        'building': 'Bauen',
                        'upgrading': 'Upgrading',
                        'clean-summon': 'Reinigungsruf',
                        'station-reset': 'Station zurücksetzen',
                        'second-cleaning': 'Zweite Reinigung',
                        'human-following': 'Folge der Person',
                        'spot-cleaning': 'Spot-Reinigung',
                        'shortcut': 'Verknüpfung',
                        'washing': 'Waschen',
                        'add-clean-water': 'Sauberes Wasser nachfüllen'
                      }
                    };

					function getTranslatedStatus(status) {
                      const lang = UserLang || 'EN';
                      const translations = statusTranslations[lang] || statusTranslations['EN'];
                      return translations[status] || status;
                    }

                    function getStatusColor(status) {
                        if (status.includes('charging')) return '#4a90e2';
                        if (status.includes('returning')) return '#f39c12';
                        if (status.includes('error')) return '#e74c3c';
                        if (status.includes('paused')) return '#95a5a6';
                        return '#000000';
                    }

					// Function to update the charging station status

					let lastChargerStatus  =  "Unknown"; // To keep track of the last known charger status
					let timestamp = Date.now(); // To store the timestamp when the status is changed to 'Charging Completed'
					let totalTimeSwitch = 60;

					function updateChargerStatus(status) {

						if (status === "Charging completed") {
                            if (Date.now() - timestamp >= (totalTimeSwitch * 2 * 1000)) timestamp = Date.now();
                            if (Date.now() - timestamp >= (totalTimeSwitch * 1000)) status = "sleep";
                        } else {
							timestamp = Date.now();
						}

//status = 'drying';
                        if (status === lastChargerStatus) return;
						lastChargerStatus = status;

                        const chargers = document.querySelectorAll('.charger-station, .charger-station-mini');

                        chargers.forEach(charger => {
                            const statusSlug = status.toLowerCase().replace(/\\s+/g, '-');
                            charger.setAttribute('data-status', statusSlug);

                            // Find all relevant text elements
                            const container = charger.closest('.charger-mini-container');
                            const miniText = container?.querySelector('.mini-status-text');
                            const statusAbove = container?.closest('.coverage-content')?.querySelector('.status-text-above');

                            if (miniText && statusAbove) {
                                miniText.textContent = status;
                                statusAbove.textContent = getTranslatedStatus(statusSlug);

                                // Set colors based on status
                                const color = getStatusColor(statusSlug);
                                miniText.style.color = color;
                                statusAbove.style.color = color;

                                // Show only the top text when not idle
                                if (statusSlug !== 'idle') {
                                    statusAbove.style.display = 'block';
                                    miniText.style.display = 'none';
                                } else {
                                    statusAbove.style.display = 'none';
                                    miniText.style.display = 'block';
                                }
                            }

                            // Clear previous effects
                            charger.querySelectorAll('.status-effect, style').forEach(el => el.remove());

                            let effectsHTML = '';
                            let effectsCSS = '';
                            switch(statusSlug) {
                                case 'sweeping':
                                    effectsHTML = \`
                                        <div class="status-effect sweeping-effect">
                                            <div class="sweep-beam"></div>
                                            <svg class="sweep-icon" viewBox="0 0 24 24">
                                                <path d="M19 11h-5V6h5m-6-1l-4 4l4 4m-7-3H5V6h3m0 11H5v-2h3m6 1l4-4l-4-4m7 3h-5v-2h5"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .sweeping-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .sweep-beam {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: conic-gradient(
                                                from 0deg at 50% 50%,
                                                rgba(52, 152, 219, 0.8) 0deg,
                                                rgba(52, 152, 219, 0.4) 90deg,
                                                transparent 180deg
                                            );
                                            animation: sweep-rotate 2s linear infinite;
                                            border-radius: 50%;
                                        }
                                        .sweep-icon {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            fill: white;
                                            animation: sweep-bounce 0.5s infinite alternate;
                                        }
                                        @keyframes sweep-rotate {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes sweep-bounce {
                                            from { transform: translateY(0); }
                                            to { transform: translateY(-5px); }
                                        }\`;
                                    break;

                                case 'mopping':
                                    effectsHTML = \`
                                        <div class="status-effect mopping-effect">
                                            <div class="water-wave"></div>
                                            <svg class="mop-icon" viewBox="0 0 24 24">
                                                <path d="M15.5 14.5c0-2.8 2.2-5 5-5 .36 0 .71.04 1.05.11L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7L12 21.5l3.5-4.36V14.5z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .mopping-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                            overflow: hidden;
                                        }
                                        .water-wave {
                                            position: absolute;
                                            width: 200%;
                                            height: 200%;
                                            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
                                            animation: water-pulse 3s infinite linear;
                                        }
                                        .mop-icon {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            fill: white;
                                            animation: mop-swing 1s ease-in-out infinite alternate;
                                        }
                                        @keyframes water-pulse {
                                            0% { transform: scale(0.5); opacity: 0.7; }
                                            100% { transform: scale(1); opacity: 0; }
                                        }
                                        @keyframes mop-swing {
                                            0% { transform: rotate(-15deg); }
                                            100% { transform: rotate(15deg); }
                                        }\`;
                                    break;

                                case 'sweeping-and-mopping':
                                    effectsHTML = \`
                                        <div class="status-effect extreme-effect">
                                            <!-- 3D depth container -->
                                            <div class="depth-container">
                                                <!-- Energy beams -->
                                                <div class="energy-beam beam-1"></div>
                                                <div class="energy-beam beam-2"></div>

                                                <!-- Particles -->
                                                <div class="particle-emitter">
                                                    ${Array.from({ length: 12 }).map(function(_, i) {
    return '<div class="particle" style="--i:' + i + '"></div>';
  }).join('')}
                                                </div>

                                                <!-- Animated tools -->
                                                <div class="animated-tools">
                                                    <svg class="broom-tool" viewBox="0 0 24 24">
                                                        <path fill="#3498db" d="M19 11h-5V6h5m-6-1l-4 4 4 4m-7-3H5V6h3m0 11H5v-2h3m6 1l4-4-4-4m7 3h-5v-2h5m-6-1l-4 4 4 4"/>
                                                    </svg>
                                                    <svg class="mop-tool" viewBox="0 0 24 24">
                                                        <path fill="#2ecc71" d="M15.5 14.5c0-2.8 2.2-5 5-5 .36 0 .71.04 1.05.11L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7L12 21.5l3.5-4.36V14.5z"/>
                                                    </svg>
                                                </div>

                                                <!-- Water ripples -->
                                                <div class="water-ripples">
                                                    <div class="ripple r1"></div>
                                                    <div class="ripple r2"></div>
                                                </div>

                                                <!-- Dust clouds -->
                                                <div class="dust-cloud d1"></div>
                                                <div class="dust-cloud d2"></div>
                                            </div>

                                            <!-- Light flare -->
                                            <div class="light-flare"></div>
                                        </div>\`;

                                    effectsCSS = \`
                                        .extreme-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                            overflow: hidden;
                                            background: transparent;
                                        }

                                        .depth-container {
                                            position: relative;
                                            width: 100%;
                                            height: 100%;
                                            transform-style: preserve-3d;
                                            animation: container-tilt 8s infinite alternate ease-in-out;
                                        }

                                        /* Energy beams */
                                        .energy-beam {
                                            position: absolute;
                                            width: 150%;
                                            height: 4px;
                                            background: linear-gradient(90deg, transparent, rgba(52, 152, 219, 0.8), transparent);
                                            top: 50%;
                                            left: -25%;
                                            transform-origin: center;
                                            filter: blur(1px);
                                        }
                                        .beam-1 { transform: rotate(30deg); animation: beam-sweep 3s infinite linear; }
                                        .beam-2 { transform: rotate(-30deg); animation: beam-sweep 3s infinite linear reverse; }

                                        /* Particle system */
                                        .particle-emitter {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .particle {
                                            position: absolute;
                                            width: 6px;
                                            height: 6px;
                                            background: rgba(52, 152, 219, 0.7);
                                            border-radius: 50%;
                                            top: 50%;
                                            left: 50%;
                                            filter: blur(0.5px);
                                            animation:
                                                particle-move 4s infinite linear,
                                                particle-fade 4s infinite ease-out;
                                            animation-delay: calc(var(--i) * 0.2s);
                                        }

                                        /* Tools */
                                        .animated-tools {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .broom-tool, .mop-tool {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                        }
                                        .broom-tool {
                                            color: #3498db;
                                            filter: drop-shadow(0 0 10px rgba(52, 152, 219, 0.9));
                                            animation:
                                                broom-swing 2.3s infinite ease-in-out,
                                                tool-float 5s infinite ease-in-out;
                                        }
                                        .mop-tool {
                                            color: #2ecc71;
                                            filter: drop-shadow(0 0 10px rgba(46, 204, 113, 0.9));
                                            animation:
                                                mop-swing 3.1s infinite ease-in-out,
                                                tool-float 7s infinite ease-in-out reverse;
                                        }

                                        /* Water effects */
                                        .water-ripples { position: absolute; width: 100%; height: 100%; }
                                        .ripple {
                                            position: absolute;
                                            border: 2px solid rgba(46, 204, 113, 0.6);
                                            border-radius: 50%;
                                            top: 30%;
                                            left: 30%;
                                            width: 40%;
                                            height: 40%;
                                            animation: ripple 3s infinite;
                                        }
                                        .r2 { animation-delay: 1.5s; }

                                        /* Dust effects */
                                        .dust-cloud {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            background: radial-gradient(circle, rgba(149, 165, 166, 0.8) 0%, transparent 70%);
                                            filter: blur(3px);
                                            animation: dust-dissipate 4s infinite;
                                        }
                                        .d1 { top: 10%; left: 10%; }
                                        .d2 { top: 60%; left: 60%; animation-delay: 2s; }

                                        /* Light effects */
                                        .light-flare {
                                            position: absolute;
                                            width: 50%;
                                            height: 50%;
                                            top: 25%;
                                            left: 25%;
                                            background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
                                            animation: flare-pulse 3s infinite alternate;
                                            mix-blend-mode: overlay;
                                        }

                                        /* Keyframes */
                                        @keyframes container-tilt {
                                            0%, 100% { transform: rotateX(-5deg) rotateY(-5deg); }
                                            50% { transform: rotateX(5deg) rotateY(5deg); }
                                        }
                                        @keyframes beam-sweep {
                                            0% { transform: rotate(30deg) translateX(-100%); }
                                            100% { transform: rotate(30deg) translateX(100%); }
                                        }
                                        @keyframes particle-move {
                                            0% { transform: translate(-50%, -50%) rotate(calc(var(--i) * 30deg)) translateY(0) scale(1); }
                                            100% { transform: translate(-50%, -50%) rotate(calc(var(--i) * 30deg + 360deg)) translateY(100px) scale(0.3); }
                                        }
                                        @keyframes particle-fade {
                                            0%, 100% { opacity: 0; }
                                            10%, 80% { opacity: 0.7; }
                                        }
                                        @keyframes broom-swing {
                                            0%, 100% { transform: translate(-50%, -50%) rotate(-20deg); }
                                            50% { transform: translate(-50%, -50%) rotate(20deg); }
                                        }
                                        @keyframes mop-swing {
                                            0%, 100% { transform: translate(-50%, -50%) rotate(15deg) translateY(0); }
                                            50% { transform: translate(-50%, -50%) rotate(-15deg) translateY(-10px); }
                                        }
                                        @keyframes tool-float {
                                            0%, 100% { transform: translateY(0); }
                                            50% { transform: translateY(-10px); }
                                        }
                                        @keyframes ripple {
                                            0% { transform: scale(0.5); opacity: 1; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }
                                        @keyframes dust-dissipate {
                                            0% { transform: scale(0.5); opacity: 0; }
                                            20% { transform: scale(1); opacity: 0.7; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }
                                        @keyframes flare-pulse {
                                            0% { transform: scale(0.8); opacity: 0.5; }
                                            100% { transform: scale(1.2); opacity: 0.8; }
                                        }\`;
                                    break;

								case 'washing':
                                    effectsHTML = \`
                                        <div class="status-effect washing-effect">
                                            <div class="water-bubbles">
                                                <div class="bubble bubble1"></div>
                                                <div class="bubble bubble2"></div>
                                                <div class="bubble bubble3"></div>
                                            </div>
                                            <div class="water-ripples">
                                                <div class="ripple ripple1"></div>
                                                <div class="ripple ripple2"></div>
                                            </div>
                                            <svg class="washing-icon" viewBox="0 0 24 24">
                                                <path d="M18.5 12A3.5 3.5 0 0 0 22 8.5V6a4 4 0 0 0-4-4h-3a4 4 0 0 0-4 4v2.5A3.5 3.5 0 0 0 13.5 12h5zM5 12a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h1zm14-4h-5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 1-1.5 1.5H19zM5 10H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .washing-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                            overflow: hidden;
                                        }
                                        .water-bubbles {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .bubble {
                                            position: absolute;
                                            background: white;
                                            border-radius: 50%;
                                            opacity: 0.6;
                                            animation: bubble-rise 3s infinite;
                                        }
                                        .bubble1 {
                                            width: 8px;
                                            height: 8px;
                                            left: 20%;
                                            bottom: 10%;
                                            animation-delay: 0s;
                                        }
                                        .bubble2 {
                                            width: 6px;
                                            height: 6px;
                                            left: 50%;
                                            bottom: 15%;
                                            animation-delay: 1s;
                                        }
                                        .bubble3 {
                                            width: 4px;
                                            height: 4px;
                                            left: 70%;
                                            bottom: 5%;
                                            animation-delay: 2s;
                                        }
                                        .water-ripples {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .ripple {
                                            position: absolute;
                                            border: 2px solid rgba(255,255,255,0.7);
                                            border-radius: 50%;
                                            animation: ripple-expand 2s infinite;
                                        }
                                        .ripple1 {
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            animation-delay: 0s;
                                        }
                                        .ripple2 {
                                            width: 80%;
                                            height: 80%;
                                            top: 10%;
                                            left: 10%;
                                            animation-delay: 1s;
                                        }
                                        .washing-icon {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            fill: white;
                                            animation: washing-shake 0.5s infinite alternate;
                                        }
                                        @keyframes bubble-rise {
                                            0% { transform: translateY(0) scale(1); opacity: 0.6; }
                                            100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
                                        }
                                        @keyframes ripple-expand {
                                            0% { transform: scale(0.5); opacity: 1; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }
                                        @keyframes washing-shake {
                                            0% { transform: rotate(-5deg); }
                                            100% { transform: rotate(5deg); }
                                        }\`;
                                    break;

                        		case 'charging':
                                    effectsHTML = \`
                                        <div class="status-effect charging-effect">
                                            <div class="energy-orb"></div>
                                            <div class="lightning-bolt"></div>
                                            <div class="sparks">
                                                <div class="spark spark1"></div>
                                                <div class="spark spark2"></div>
                                                <div class="spark spark3"></div>
                                            </div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .charging-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .energy-orb {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: radial-gradient(circle, rgba(74,144,226,0.8) 0%, rgba(74,144,226,0) 70%);
                                            border-radius: 50%;
                                            animation: energy-pulse 2s infinite;
                                        }
                                        .lightning-bolt {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.85 0 .8.75.8.75z'/%3E%3C/svg%3E");
                                            background-repeat: no-repeat;
                                            animation: bolt-flicker 0.5s infinite alternate;
                                        }
                                        .spark {
                                            position: absolute;
                                            width: 6px;
                                            height: 6px;
                                            background: white;
                                            border-radius: 50%;
                                            filter: blur(1px);
                                        }
                                        .spark1 {
                                            top: 10%;
                                            left: 50%;
                                            animation: spark-fly 1s infinite;
                                        }
                                        .spark2 {
                                            top: 30%;
                                            left: 20%;
                                            animation: spark-fly 1.2s infinite 0.3s;
                                        }
                                        .spark3 {
                                            top: 70%;
                                            left: 80%;
                                            animation: spark-fly 0.8s infinite 0.5s;
                                        }
                                        @keyframes energy-pulse {
                                            0% { transform: scale(0.8); opacity: 0.7; }
                                            50% { transform: scale(1.1); opacity: 1; }
                                            100% { transform: scale(0.8); opacity: 0.7; }
                                        }
                                        @keyframes bolt-flicker {
                                            0% { opacity: 0.7; transform: scale(1); }
                                            100% { opacity: 1; transform: scale(1.1); }
                                        }
                                        @keyframes spark-fly {
                                            0% { transform: translate(0, 0); opacity: 0; }
                                            20% { opacity: 1; }
                                            100% { transform: translate(${Math.random() * 40 - 20}px, ${Math.random() * 40 - 20}px); opacity: 0; }
                                        }\`;
                                    break;

                                case 'smart-charging':
                                    effectsHTML = \`
                                        <div class="status-effect smart-charging-effect">
                                            <div class="brain-circuit">
                                                <div class="circuit-line line1"></div>
                                                <div class="circuit-line line2"></div>
                                                <div class="circuit-line line3"></div>
                                            </div>
                                            <div class="energy-pulses">
                                                <div class="pulse pulse1"></div>
                                                <div class="pulse pulse2"></div>
                                            </div>
                                            <svg class="brain-icon" viewBox="0 0 24 24">
                                                <path d="M12 3a9 9 0 0 1 9 9c0 1.65-.5 3.19-1.35 4.5l1.21 1.22a1 1 0 0 1 0 1.41 1 1 0 0 1-1.42 0l-1.22-1.21A8.94 8.94 0 0 1 12 21a8.94 8.94 0 0 1-7.22-3.68l-1.22 1.21a1 1 0 1 1-1.42-1.41l1.21-1.22A8.94 8.94 0 0 1 3 12a9 9 0 0 1 9-9m0 2a7 7 0 0 0-7 7c0 1.28.39 2.47 1.06 3.46l1.45-1.46A4.98 4.98 0 0 1 7 12a5 5 0 0 1 5-5 5 5 0 0 1 5 5c0 .83-.21 1.6-.56 2.29l1.45 1.46A6.93 6.93 0 0 0 19 12a7 7 0 0 0-7-7m0 2a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .smart-charging-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .brain-circuit {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0%;
                                            left: 0%;
                                        }
                                        .circuit-line {
                                            position: absolute;
                                            background: rgba(74, 144, 226, 0.7);
                                            animation: circuit-flow 3s infinite;
                                        }
                                        .line1 {
                                            width: 60%;
                                            height: 2px;
                                            top: 20%;
                                            left: 20%;
                                            animation-delay: 0s;
                                        }
                                        .line2 {
                                            width: 2px;
                                            height: 40%;
                                            top: 20%;
                                            left: 50%;
                                            animation-delay: 0.5s;
                                        }
                                        .line3 {
                                            width: 60%;
                                            height: 2px;
                                            top: 60%;
                                            left: 20%;
                                            animation-delay: 1s;
                                            transform: rotate(180deg);
                                        }
                                        .energy-pulses {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .pulse {
                                            position: absolute;
                                            width: 20px;
                                            height: 20px;
                                            background: radial-gradient(circle, rgba(74, 144, 226, 0.8) 0%, rgba(74, 144, 226, 0) 70%);
                                            border-radius: 50%;
                                            animation: energy-transfer 2s infinite;
                                        }
                                        .pulse1 { top: 30%; left: 30%; }
                                        .pulse2 { top: 70%; left: 70%; animation-delay: 1s; }
                                        .brain-icon {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            fill: white;
                                            animation: brain-glow 2s infinite alternate;
                                        }
                                        @keyframes circuit-flow {
                                            0% { opacity: 0.3; }
                                            50% { opacity: 1; box-shadow: 0 0 10px rgba(74, 144, 226, 0.8); }
                                            100% { opacity: 0.3; }
                                        }
                                        @keyframes energy-transfer {
                                            0% { transform: scale(0.5); opacity: 0; }
                                            50% { transform: scale(1); opacity: 1; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }
                                        @keyframes brain-glow {
                                            0% { filter: drop-shadow(0 0 5px rgba(255,255,255,0.3)); }
                                            100% { filter: drop-shadow(0 0 15px rgba(255,255,255,0.8)); }
                                        }\`;
                                    break;

                                case 'charging-completed':
                                    effectsHTML = \`
                                        <div class="status-effect charge-complete-effect">
                                            <div class="complete-ring"></div>
                                            <div class="check-mark"></div>
                                            <div class="sparkles">
                                                <div class="sparkle sparkle1"></div>
                                                <div class="sparkle sparkle2"></div>
                                                <div class="sparkle sparkle3"></div>
                                            </div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .charge-complete-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .complete-ring {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                        					top: ;
                                            left: 0;
                                            border: 3px solid #2ecc71;
                                            border-radius: 50%;
                                            animation: ring-glow 2s infinite;
                                        }
                                        .check-mark {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E");
                                            background-repeat: no-repeat;
                                        }
                                        .sparkle {
                                            position: absolute;
                                            width: 6px;
                                            height: 6px;
                                            background: white;
                                            border-radius: 50%;
                                            filter: blur(0.5px);
                                            animation: sparkle-pop 1.5s infinite;
                                        }
                                        .sparkle1 { top: 20%; left: 20%; animation-delay: 0s; }
                                        .sparkle2 { top: 70%; left: 70%; animation-delay: 0.5s; }
                                        .sparkle3 { top: 30%; left: 80%; animation-delay: 1s; }
                                        @keyframes ring-glow {
                                            0%, 100% { box-shadow: 0 0 0 0 rgba(46,204,113,0.7); }
                                            50% { box-shadow: 0 0 20px 10px rgba(46,204,113,0.5); }
                                        }
                                        @keyframes sparkle-pop {
                                            0%, 100% { transform: scale(0); opacity: 0; }
                                            50% { transform: scale(1.5); opacity: 1; }
                                        }\`;
                                    break;

                                case 'auto-emptying':
                                    effectsHTML = \`
                                        <div class="status-effect emptying-effect">
                                            <div class="vacuum-vortex"></div>
                                            <div class="debris-particle"></div>
                                            <div class="debris-particle"></div>
                                            <div class="debris-particle"></div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .emptying-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .vacuum-vortex {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: conic-gradient(
                                                from 0deg at 50% 50%,
                                                rgba(230,126,34,0.8) 0deg,
                                                rgba(230,126,34,0.4) 180deg,
                                                transparent 360deg
                                            );
                                            animation: vortex-spin 1s linear infinite;
                                            border-radius: 50%;
                                        }
                                        .debris-particle {
                                            position: absolute;
                                            width: 6px;
                                            height: 6px;
                                            background: white;
                                            border-radius: 50%;
                                            filter: blur(0.5px);
                                            animation: debris-suck 2s infinite;
                                        }
                                        .debris-particle:nth-child(2) {
                                            top: 20%;
                                            left: 70%;
                                            animation-delay: 0.3s;
                                        }
                                        .debris-particle:nth-child(3) {
                                            top: 60%;
                                            left: 20%;
                                            animation-delay: 0.6s;
                                        }
                                        .debris-particle:nth-child(4) {
                                            top: 80%;
                                            left: 60%;
                                            animation-delay: 0.9s;
                                        }
                                        @keyframes vortex-spin {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes debris-suck {
                                            0% { transform: translate(0, 0) scale(1); opacity: 1; }
                                            100% { transform: translate(${Math.random() * 30 - 15}px, ${Math.random() * 30 - 15}px) scale(0); opacity: 0; }
                                        }\`;
                                    break;

                        		case 'drying':
                                    effectsHTML = \`
                                        <div class="status-effect drying-effect">
                                            <div class="heat-waves">
                                                <div class="wave wave1"></div>
                                                <div class="wave wave2"></div>
                                            </div>
                                            <svg class="dry-icon" viewBox="0 0 24 24">
                                                <path d="M19 12h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2m0-2a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H9m-3 0h12"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .drying-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .heat-waves {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .wave {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            border-radius: 50%;
                                            border: 2px solid rgba(255,0,0,0.5);
                                            animation: heat-pulse 3s infinite;
                                        }
                                        .wave2 { animation-delay: 1.5s; }
                                        .dry-icon {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            fill: rgba(255,0,0,0.3);
                                            animation: icon-pulse 2s infinite;
                                        }
                                        @keyframes heat-pulse {
                                            0% { transform: scale(0.8); opacity: 0; }
                                            50% { transform: scale(1.2); opacity: 0.7; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }
                                        @keyframes icon-pulse {
                                            0%, 100% { transform: scale(1); }
                                            50% { transform: scale(1.1); }
                                        }\`;
                                    break;

                                case 'returning':
                                    effectsHTML = \`
                                        <div class="status-effect returning-effect">
                                            <div class="homing-beacon"></div>
                                            <div class="direction-arrow"></div>
                                            <div class="distance-rings">
                                                <div class="ring ring1"></div>
                                                <div class="ring ring2"></div>
                                            </div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .returning-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .homing-beacon {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: conic-gradient(
                                                from 0deg at 50% 50%,
                                                rgba(243,156,18,0.8) 0deg,
                                                rgba(243,156,18,0.4) 60deg,
                                                transparent 120deg
                                            );
                                            animation: beacon-sweep 2s linear infinite;
                                            border-radius: 50%;
                                        }
                                        .direction-arrow {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E");
                                            background-repeat: no-repeat;
                                            animation: arrow-bounce 0.8s infinite alternate;
                                        }
                                        .ring {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            border: 2px solid rgba(243,156,18,0.6);
                                            border-radius: 50%;
                                            animation: ring-expand 2s infinite;
                                        }
                                        .ring2 { animation-delay: 0.5s; }
                                        @keyframes beacon-sweep {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes arrow-bounce {
                                            from { transform: translateY(0); }
                                            to { transform: translateY(-5px); }
                                        }
                                        @keyframes ring-expand {
                                            0% { transform: scale(0.5); opacity: 1; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }\`;
                                    break;

                                case 'returning-to-wash':
                                    effectsHTML = \`
                                        <div class="status-effect returning-wash-effect">
                                            <div class="water-trail"></div>
                                            <div class="droplet"></div>
                                            <svg class="wash-icon" viewBox="0 0 24 24">
                                                <path d="M12 20a6 6 0 0 1-6-6c0-4 6-10 6-10s6 6 6 10a6 6 0 0 1-6 6z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .returning-wash-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .water-trail {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: radial-gradient(circle, rgba(52,152,219,0.3) 0%, transparent 70%);
                                            animation: trail-expand 2s infinite;
                                        }
                                        .droplet {
                                            position: absolute;
                                            width: 15px;
                                            height: 15px;
                                            background: white;
                                            border-radius: 50% 50% 50% 0;
                                            top: 20%;
                                            left: 50%;
                                            transform: rotate(-45deg);
                                            animation: droplet-fall 1.5s infinite;
                                        }
                                        .wash-icon {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            fill: white;
                                            animation: wash-bounce 0.8s infinite alternate;
                                        }
                                        @keyframes trail-expand {
                                            0% { transform: scale(0.5); opacity: 1; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }
                                        @keyframes droplet-fall {
                                            0% { transform: translateY(0) rotate(-45deg); opacity: 1; }
                                            100% { transform: translateY(30px) rotate(-45deg); opacity: 0; }
                                        }
                                        @keyframes wash-bounce {
                                            0% { transform: translateY(0); }
                                            100% { transform: translateY(-5px); }
                                        }\`;
                                    break;

                        		case 'returning-auto-empty':
                                    effectsHTML = \`
                                        <div class="status-effect auto-empty-effect">
                                            <div class="vacuum-vortex"></div>
                                            <div class="dust-particles">
                                                <div class="particle p1"></div>
                                                <div class="particle p2"></div>
                                                <div class="particle p3"></div>
                                            </div>
                                            <svg class="vacuum-icon" viewBox="0 0 24 24">
                                                <path d="M12 3a9 9 0 0 1 9 9h-2a7 7 0 0 0-7-7V3m-7 9a7 7 0 0 0 7 7v-2a5 5 0 0 1-5-5H5m7 5a5 5 0 0 1-5-5H5a7 7 0 0 0 7 7v-2m0-2a3 3 0 0 0 3-3h-2a1 1 0 0 1-1 1v2m0-4a1 1 0 0 1 1 1h2a3 3 0 0 0-3-3v2z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .auto-empty-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .vacuum-vortex {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: conic-gradient(
                                                from 0deg at 50% 50%,
                                                rgba(230, 126, 34, 0.8) 0deg,
                                                rgba(230, 126, 34, 0.4) 180deg,
                                                transparent 360deg
                                            );
                                            animation: vortex-spin 1.5s linear infinite;
                                            border-radius: 50%;
                                        }
                                        .dust-particles {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .particle {
                                            position: absolute;
                                            width: 8px;
                                            height: 8px;
                                            background: white;
                                            border-radius: 50%;
                                            filter: blur(0.5px);
                                            animation: particle-suck 2s infinite;
                                        }
                                        .p1 { top: 20%; left: 20%; animation-delay: 0s; }
                                        .p2 { top: 60%; left: 30%; animation-delay: 0.4s; }
                                        .p3 { top: 40%; left: 70%; animation-delay: 0.8s; }
                                        .vacuum-icon {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            fill: white;
                                            animation: vacuum-shake 0.5s infinite alternate;
                                        }
                                        @keyframes vortex-spin {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes particle-suck {
                                            0% { transform: translate(0, 0) scale(1); opacity: 1; }
                                            100% { transform: translate(${Math.random() * 40 - 20}px, ${Math.random() * 40 - 20}px) scale(0); opacity: 0; }
                                        }
                                        @keyframes vacuum-shake {
                                            from { transform: translateX(-2px); }
                                            to { transform: translateX(2px); }
                                        }\`;
                                    break;

                        		case 'add-clean-water':
                                    effectsHTML = \`
                                        <div class="status-effect add-water-effect">
                                            <div class="filling-water"></div>
                                            <div class="falling-drops">
                                                <div class="drop drop1"></div>
                                                <div class="drop drop2"></div>
                                                <div class="drop drop3"></div>
                                            </div>
                                            <svg class="add-icon" viewBox="0 0 24 24">
                                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .add-water-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                            overflow: hidden;
                                        }
                                        .filling-water {
                                            position: absolute;
                                            width: 100%;
                                            height: 0%;
                                            bottom: 0;
                                            background: rgba(52,152,219,0.6);
                                            animation: water-fill 3s forwards;
                                            border-radius: 0 0 50% 50%;
                                        }
                                        .drop {
                                            position: absolute;
                                            width: 6px;
                                            height: 6px;
                                            background: white;
                                            border-radius: 50%;
                                            animation: drop-fall 1s infinite;
                                        }
                                        .drop1 { top: -10px; left: 30%; animation-delay: 0s; }
                                        .drop2 { top: -10px; left: 50%; animation-delay: 0.3s; }
                                        .drop3 { top: -10px; left: 70%; animation-delay: 0.6s; }
                                        .add-icon {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            fill: white;
                                            animation: add-pulse 1.5s infinite;
                                        }
                                        @keyframes water-fill {
                                            0% { height: 0%; }
                                            100% { height: 60%; }
                                        }
                                        @keyframes drop-fall {
                                            0% { transform: translateY(0); opacity: 0; }
                                            10% { opacity: 1; }
                                            90% { opacity: 1; }
                                            100% { transform: translateY(60px); opacity: 0; }
                                        }
                                        @keyframes add-pulse {
                                            0%, 100% { transform: scale(1); }
                                            50% { transform: scale(1.2); }
                                        }\`;
                                    break;

                        		case 'washing-paused':
                                    effectsHTML = \`
                                        <div class="status-effect washing-paused-effect">
                                            <div class="paused-water"></div>
                                            <div class="pause-symbol">
                                                <div class="pause-bar bar1"></div>
                                                <div class="pause-bar bar2"></div>
                                            </div>
                                            <svg class="wash-icon" viewBox="0 0 24 24">
                                                <path d="M12 20a6 6 0 0 1-6-6c0-4 6-10 6-10s6 6 6 10a6 6 0 0 1-6 6z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .washing-paused-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .paused-water {
                                            position: absolute;
                                            width: 100%;
                                            height: 50%;
                                            bottom: 0;
                                            background: rgba(52, 152, 219, 0.5);
                                            border-radius: 0 0 50% 50%;
                                            animation: water-sway 4s infinite ease-in-out;
                                        }
                                        .pause-symbol {
                                            position: absolute;
                                            width: 30%;
                                            height: 30%;
                                            top: 35%;
                                            left: 35%;
                                            display: flex;
                                            justify-content: space-between;
                                        }
                                        .pause-bar {
                                            width: 30%;
                                            height: 100%;
                                            background: white;
                                            animation: pause-blink 1.5s infinite;
                                        }
                                        .bar2 { animation-delay: 0.75s; }
                                        .wash-icon {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            fill: white;
                                            opacity: 0.7;
                                        }
                                        @keyframes water-sway {
                                            0%, 100% { transform: translateX(0) scaleY(1); }
                                            50% { transform: translateX(5px) scaleY(0.95); }
                                        }
                                        @keyframes pause-blink {
                                            0%, 100% { opacity: 1; }
                                            50% { opacity: 0.3; }
                                        }\`;
                                    break;

                                case 'returning-remove-mop':
                                    effectsHTML = \`
                                        <div class="status-effect remove-mop-effect">
                                            <div class="radar-sweep-alert"></div>
                                            <div class="mop-eject-animation">
                                                <div class="mop-outline-alert"></div>
                                                <div class="eject-arrow"></div>
                                            </div>
                                            <svg class="remove-icon" viewBox="0 0 24 24">
                                                <path d="M19 13H5v-2h14v2z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .remove-mop-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .radar-sweep-alert {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: conic-gradient(
                                                from 0deg at 50% 50%,
                                                rgba(231, 76, 60, 0.3) 0deg,
                                                rgba(231, 76, 60, 0.1) 60deg,
                                                transparent 120deg
                                            );
                                            animation: radar-rotate-alert 2s linear infinite;
                                            border-radius: 50%;
                                        }
                                        .mop-eject-animation {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                        }
                                        .mop-outline-alert {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            border: 2px dashed rgba(255,255,255,0.7);
                                            border-radius: 20%;
                                            animation: outline-alert 2s infinite;
                                        }
                                        .eject-arrow {
                                            position: absolute;
                                            width: 40%;
                                            height: 10%;
                                            top: 45%;
                                            left: 100%;
                                            background: white;
                                            clip-path: polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%);
                                            animation: arrow-eject 1s infinite;
                                        }
                                        .remove-icon {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            fill: white;
                                            animation: remove-alert 0.8s infinite;
                                        }
                                        @keyframes radar-rotate-alert {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes outline-alert {
                                            0%, 100% { opacity: 0.7; transform: scale(0.95); border-color: rgba(255,255,255,0.7); }
                                            50% { opacity: 1; transform: scale(1.05); border-color: rgba(231, 76, 60, 0.9); }
                                        }
                                        @keyframes arrow-eject {
                                            0% { transform: translateX(0); opacity: 0; }
                                            30%, 70% { opacity: 1; }
                                            100% { transform: translateX(20px); opacity: 0; }
                                        }
                                        @keyframes remove-alert {
                                            0%, 100% { transform: scale(1); opacity: 0.9; }
                                            50% { transform: scale(1.3); opacity: 1; }
                                        }\`;
                                    break;

                                case 'returning-install-mop':
                                    effectsHTML = \`
                                        <div class="status-effect mop-change-effect">
                                            <div class="mop-swirl"></div>
                                            <svg class="mop-change-icon" viewBox="0 0 24 24">
                                                <path d="M16 9h4v2h-4v4h-2v-4h-4V9h4V5h2v4m-6 10v-2H6v-2h4v-2h2v4h4v2h-4v2h-2z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .mop-change-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .mop-swirl {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: conic-gradient(
                                                from 0deg at 50% 50%,
                                                rgba(155,89,182,0.8) 0deg,
                                                rgba(155,89,182,0.4) 180deg,
                                                transparent 360deg
                                            );
                                            animation: swirl-spin 2s linear infinite;
                                            border-radius: 50%;
                                        }
                                        .mop-change-icon {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            fill: white;
                                            animation: change-bounce 0.8s infinite alternate;
                                        }
                                        @keyframes swirl-spin {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes change-bounce {
                                            0% { transform: translateY(0); }
                                            100% { transform: translateY(-5px); }
                                        }\`;
                                    break;

                        		case 'sleep':
                                    effectsHTML = \`
                                      <div class="status-effect sleep-effect">
                                        <div class="moon">
                                          <div class="crater crater1"></div>
                                          <div class="crater crater2"></div>
                                          <div class="crater crater3"></div>
                                        </div>
                                        <div class="stars">
                                          <div class="star star1"></div>
                                          <div class="star star2"></div>
                                          <div class="star star3"></div>
                                          <div class="star star4"></div>
                                        </div>
                                        <div class="zzz-container">
                                          <div class="zzz">z</div>
                                          <div class="zzz">z</div>
                                          <div class="zzz">z</div>
                                        </div>
                                      </div>\`;

                                    effectsCSS = \`
                                      .sleep-effect {
                                        position: absolute;
                                        width: 100%;
                                        height: 100%;
                                        top: 0;
                                        left: 0;
                                        background: rgba(10, 20, 40, 0.8);
                                        border-radius: 50%;
                                        overflow: hidden;
                                      }
                                      .moon {
                                        position: absolute;
                                        width: 50%;
                                        height: 50%;
                                        top: 25%;
                                        left: 25%;
                                        background: #f5f5dc;
                                        border-radius: 50%;
                                        box-shadow: 0 0 20px #f5f5dc;
                                        animation: moon-glow 6s infinite ease-in-out;
                                      }
                                      .moon::before {
                                        content: '';
                                        position: absolute;
                                        width: 100%;
                                        height: 100%;
                                        background: rgba(10, 20, 40, 0.8);
                                        border-radius: 50%;
                                        right: 30%;
                                        animation: moon-phase 30s infinite linear;
                                      }
                                      .crater {
                                        position: absolute;
                                        background: rgba(180, 180, 150, 0.6);
                                        border-radius: 50%;
                                      }
                                      .crater1 { width: 15%; height: 15%; top: 20%; left: 20%; }
                                      .crater2 { width: 10%; height: 10%; top: 60%; left: 30%; }
                                      .crater3 { width: 8%; height: 8%; top: 40%; left: 70%; }
                                      .star {
                                        position: absolute;
                                        background: white;
                                        border-radius: 50%;
                                        animation: twinkle 3s infinite alternate;
                                        filter: drop-shadow(0 0 2px white);
                                      }
                                      .star1 { width: 2px; height: 2px; top: 15%; left: 20%; animation-delay: 0s; }
                                      .star2 { width: 3px; height: 3px; top: 30%; left: 70%; animation-delay: 1s; }
                                      .star3 { width: 2px; height: 2px; top: 60%; left: 40%; animation-delay: 2s; }
                                      .star4 { width: 3px; height: 3px; top: 75%; left: 80%; animation-delay: 1.5s; }
                                      .zzz-container {
                                        position: absolute;
                                        width: 60%;
                                        height: 20%;
                                        bottom: 15%;
                                        left: 20%;
                                        display: flex;
                                        justify-content: space-around;
                                      }
                                      .zzz {
                                        color: white;
                                        font-size: 14px;
                                        font-weight: bold;
                                        opacity: 0;
                                        animation: zzz-fade 2s infinite;
                                      }
                                      .zzz:nth-child(1) { animation-delay: 0.5s; }
                                      .zzz:nth-child(2) { animation-delay: 1s; }
                                      .zzz:nth-child(3) { animation-delay: 1.5s; }
                                      @keyframes moon-glow {
                                        0%, 100% { box-shadow: 0 0 15px #f5f5dc; }
                                        50% { box-shadow: 0 0 30px #f5f5dc; }
                                      }
                                      @keyframes moon-phase {
                                        0% { right: 30%; }
                                        50% { right: -30%; }
                                        100% { right: 30%; }
                                      }
                                      @keyframes twinkle {
                                        0% { opacity: 0.3; transform: scale(0.8); }
                                        100% { opacity: 1; transform: scale(1.2); }
                                      }
                                      @keyframes zzz-fade {
                                        0%, 100% { opacity: 0; transform: translateY(0); }
                                        50% { opacity: 1; transform: translateY(-5px); }
                                      }\`;
                                    break;

                        		case 'paused':
                                    effectsHTML = \`
                                        <div class="status-effect paused-effect">
                                            <div class="pause-indicator">
                                                <div class="bar bar1"></div>
                                                <div class="bar bar2"></div>
                                            </div>
									           <div class="clock-face">
									                <div class="tick top"></div>
									                <div class="tick right"></div>
									                <div class="tick bottom"></div>
									                <div class="tick left"></div>
									            </div>
                                            <div class="clock-hand"></div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .paused-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .pause-indicator {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            display: flex;
                                            justify-content: space-between;
                                        }
                                        .bar {
                                            width: 25%;
                                            height: 100%;
                                            background: white;
                                            animation: bar-blink 1.5s infinite;
                                        }
                                        .bar2 { animation-delay: 0.75s; }
                                        .clock-hand {
                                            position: absolute;
                                            width: 40%;
                                            height: 2px;
                                            background: #878787;
                                            top: 50%;
                                            left: 50%;
                                            transform-origin: left center;
                                            animation: clock-tick 4s infinite linear;
                                        }
									        .clock-face {
									            position: absolute;
									            top: 50%;
									            left: 50%;
									            width: 100%;
									            height: 100%;
									            border-radius: 50%;
									            border: 2px solid #878787;
									            transform: translate(-50%, -50%);
												animation: face-blink 4s infinite linear;
									        }
									        .tick {
									            position: absolute;
									            width: 4px;
									            height: 4px;
									            background: #878787;
												border-radius: 50%;
									        }
									        .top {
									            top: 0;
									            left: 50%;
									            transform: translateX(-50%);
									        }
									        .right {
									            top: 50%;
									            right: 0;
									            transform: translateY(-50%);
									        }
									        .bottom {
									            bottom: 0;
									            left: 50%;
									            transform: translateX(-50%);
									        }
									        .left {
									            top: 50%;
									            left: 0;
									            transform: translateY(-50%);
									        }
                                        @keyframes bar-blink {
                                            0%, 100% { opacity: 1; }
                                            50% { opacity: 0.3; }
                                        }
										@keyframes face-blink {
                                            0%, 100% { opacity: 0.3; }
                                            50% { opacity: 1; }
                                        }
                                        @keyframes clock-tick {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
                                        }\`;
                                    break;

                        		case 'remote-control':
                                    effectsHTML = \`
                                        <div class="status-effect remote-control-effect">
                                            <div class="signal-waves">
                                                <div class="wave wave1"></div>
                                                <div class="wave wave2"></div>
                                            </div>
                                            <svg class="remote-icon" viewBox="0 0 24 24">
                                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-13h-2v6h2V7zm0 8h-2v2h2v-2z"/>
                                            </svg>
                                            <div class="cursor"></div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .remote-control-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .signal-waves {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                        }
                                        .wave {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            border: 2px solid rgba(155, 89, 182, 0.5);
                                            border-radius: 50%;
                                            animation: signal-pulse 3s infinite;
                                        }
                                        .wave2 { animation-delay: 1.5s; }
                                        .remote-icon {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            fill: white;
                                        }
                                        .cursor {
                                            position: absolute;
                                            width: 10px;
                                            height: 10px;
                                            background: #ff5722;
                                            border-radius: 50%;
                                            top: 50%;
                                            left: 50%;
                                            animation: cursor-move 4s infinite;
                                            filter: drop-shadow(0 0 5px #ff5722);
                                        }
                                        @keyframes signal-pulse {
                                            0% { transform: scale(0.5); opacity: 0; }
                                            50% { transform: scale(1); opacity: 0.7; }
                                            100% { transform: scale(1.5); opacity: 0; }
                                        }
                                        @keyframes cursor-move {
                                            0% { transform: translate(0, 0); }
                                            25% { transform: translate(20px, -15px); }
                                            50% { transform: translate(-10px, 10px); }
                                            75% { transform: translate(15px, 5px); }
                                            100% { transform: translate(0, 0); }
                                        }\`;
                                    break;

                                case 'water-check':
                                    effectsHTML = \`
                                        <div class="status-effect water-check-effect">
                                            <div class="water-level"></div>
                                            <div class="check-droplets">
                                                <div class="droplet droplet1"></div>
                                                <div class="droplet droplet2"></div>
                                            </div>
                                            <svg class="check-icon" viewBox="0 0 24 24">
                                                <path d="M12 3L1 21h22L12 3zm0 3.5L18.5 19h-13L12 5.5zM12 16c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm0-4c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .water-check-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .water-level {
                                            position: absolute;
                                            width: 100%;
                                            height: 50%;
                                            bottom: 0;
                                            background: rgba(52,152,219,0.5);
                                            border-radius: 0 0 50% 50%;
                                            animation: level-sway 3s infinite ease-in-out;
                                        }
                                        .droplet {
                                            position: absolute;
                                            width: 8px;
                                            height: 8px;
                                            background: white;
                                            border-radius: 50%;
                                            animation: droplet-check 1.5s infinite;
                                        }
                                        .droplet1 { top: 30%; left: 40%; animation-delay: 0s; }
                                        .droplet2 { top: 40%; left: 60%; animation-delay: 0.75s; }
                                        .check-icon {
                                            position: absolute;
                                            width: 80%;
                                            height: 80%;
                                            top: 10%;
                                            left: 10%;
                                            fill: white;
                                        }
                                        @keyframes level-sway {
                                            0%, 100% { transform: translateX(0) scaleY(1); }
                                            50% { transform: translateX(5px) scaleY(0.9); }
                                        }
                                        @keyframes droplet-check {
                                            0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
                                            50% { transform: translateY(-10px) scale(1.2); opacity: 0.7; }
                                        }\`;
                                    break;

                        		case 'monitoring':
                                    effectsHTML = \`
                                        <div class="status-effect monitoring-effect">
                                            <div class="radar-dish"></div>
                                            <div class="scan-line"></div>
                                            <svg class="eye-icon" viewBox="0 0 24 24">
                                                <path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .monitoring-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .radar-dish {
                                            position: absolute;
                                            width: 80%;
                                            height: 80%;
                                            top: 10%;
                                            left: 10%;
                                            border: 2px solid rgba(52, 152, 219, 0.5);
                                            border-radius: 50% 50% 0 0;
                                            clip-path: polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%);
                                        }
                                        .scan-line {
                                            position: absolute;
                                            width: 80%;
                                            height: 2px;
                                            top: 10%;
                                            left: 10%;
                                            background: rgba(52, 152, 219, 0.7);
                                            transform-origin: left center;
                                            animation: radar-scan 4s infinite linear;
                                        }
                                        .eye-icon {
                                            position: absolute;
                                            width: 80%;
                                            height: 80%;
                                            top: 10%;
                                            left: 10%;
                                            fill: white;
                                            animation: eye-blink 6s infinite;
                                        }
                                        @keyframes radar-scan {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
                                        }
                                        @keyframes eye-blink {
                                            0%, 96%, 100% { transform: scaleY(1); }
                                            98% { transform: scaleY(0.1); }
                                        }\`;
                                    break;

                        		case 'monitoring-paused':
                                    effectsHTML = \`
                                        <div class="status-effect monitoring-paused-effect">
                                            <div class="paused-radar">
                                                <div class="dish"></div>
                                                <div class="scan-line"></div>
                                            </div>
                                            <div class="pause-overlay">
                                                <div class="bar bar1"></div>
                                                <div class="bar bar2"></div>
                                            </div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .monitoring-paused-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .paused-radar {
                                            position: absolute;
                                            width: 80%;
                                            height: 80%;
                                            top: 10%;
                                            left: 10%;
                                        }
                                        .dish {
                                            width: 100%;
                                            height: 100%;
                                            border: 2px solid rgba(149, 165, 166, 0.5);
                                            border-radius: 50% 50% 0 0;
                                            clip-path: polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%);
                                        }
                                        .scan-line {
                                            position: absolute;
                                            width: 80%;
                                            height: 2px;
                                            top: 10%;
                                            left: 10%;
                                            background: rgba(149, 165, 166, 0.7);
                                            transform-origin: left center;
                                            transform: rotate(45deg);
                                            opacity: 0.5;
                                        }
                                        .pause-overlay {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            display: flex;
                                            justify-content: space-between;
                                        }
                                        .bar {
                                            width: 30%;
                                            height: 100%;
                                            background: white;
                                            animation: pause-blink 1.5s infinite;
                                        }
                                        .bar2 { animation-delay: 0.75s; }
                                        @keyframes pause-blink {
                                            0%, 100% { opacity: 1; }
                                            50% { opacity: 0.3; }
                                        }\`;
                                    break;

                        		case 'error':
                                    effectsHTML = \`
                                        <div class="status-effect error-effect">
                                            <div class="alert-pulse"></div>
                                            <div class="warning-symbol"></div>
                                            <div class="error-rays">
                                                <div class="ray ray1"></div>
                                                <div class="ray ray2"></div>
                                                <div class="ray ray3"></div>
                                            </div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .error-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .alert-pulse {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: radial-gradient(circle, rgba(231,76,60,0.8) 0%, rgba(231,76,60,0) 70%);
                                            border-radius: 50%;
                                            animation: alert-throb 0.8s infinite;
                                        }
                                        .warning-symbol {
                                            position: absolute;
                                            width: 40%;
                                            height: 40%;
                                            top: 30%;
                                            left: 30%;
                                            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M12 2L1 21h22L12 2zm0 3.5L18.5 19h-13L12 5.5zM12 16c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm0-4c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1z'/%3E%3C/svg%3E");
                                            background-repeat: no-repeat;
                                            animation: warning-shake 0.2s infinite;
                                        }
                                        .ray {
                                            position: absolute;
                                            width: 4px;
                                            height: 30px;
                                            background: white;
                                            border-radius: 2px;
                                            top: 35%;
                                            left: 48%;
                                            transform-origin: 50% 100%;
                                        }
                                        .ray1 { transform: rotate(0deg); animation: ray-spin 3s infinite; }
                                        .ray2 { transform: rotate(120deg); animation: ray-spin 3s infinite 1s; }
                                        .ray3 { transform: rotate(240deg); animation: ray-spin 3s infinite 2s; }
                                        @keyframes alert-throb {
                                            0%, 100% { transform: scale(1); opacity: 0.7; }
                                            50% { transform: scale(1.2); opacity: 1; }
                                        }
                                        @keyframes warning-shake {
                                            0%, 100% { transform: translateX(0); }
                                            25% { transform: translateX(-3px); }
                                            75% { transform: translateX(3px); }
                                        }
                                        @keyframes ray-spin {
                                            0% { transform: rotate(0deg) scaleY(0); opacity: 0; }
                                            20% { transform: rotate(0deg) scaleY(1); opacity: 1; }
                                            30% { transform: rotate(120deg) scaleY(1); }
                                            50% { transform: rotate(120deg) scaleY(0); opacity: 0; }
                                            100% { transform: rotate(120deg) scaleY(0); opacity: 0; }
                                        }\`;
                                    break;

                                default:
                                    // Standard-Idle-Animation
                                    effectsHTML = \`
                                        <div class="status-effect idle-effect">
                                            <div class="idle-pulse"></div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .idle-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .idle-pulse {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            border: 2px solid rgba(255,255,255,0.3);
                                            border-radius: 50%;
                                            animation: idle-breath 3s infinite;
                                        }
                                        @keyframes idle-breath {
                                            0%, 100% { transform: scale(0.95); opacity: 0.5; }
                                            50% { transform: scale(1.05); opacity: 0.8; }
                                        }\`;
                            }

                            if (effectsHTML) {
                                charger.insertAdjacentHTML('beforeend', effectsHTML);
                                if (effectsCSS) {
                                    const style = document.createElement('style');
                                    style.textContent = effectsCSS;
                                    document.head.appendChild(style);
                                }
                            }

                        });
                    }

                    // =============================================
                    // Initialization and start the application
                    // =============================================

                    // Initialization
                    function initAllInteractions() {
                        console.log('Initiate interactions...');

                        // 1. Click layer for room/carpet selection
                        const clickLayer = document.getElementById('click-layer');
                        if (clickLayer) {
                            clickLayer.addEventListener('click', handleClick);
                            console.log('Click layer listener registered');
                        } else {
                            console.error('Click layer not found!');
                        }

						setupPerspectiveSettings();
                        // 3. Initialization
                        initializeColorMap();
                        updateSliderValues();
                        updateTransformation();
                        setupUpdates();
                        //stabilizeLabels();
                        initCleaningMenu();
                        initRobotControl();


                        console.log('Initialization completed');
                    }

					// Initialize
                    resetMenuTimer();

                    setTimeout(function() {
                        console.log('DOM fully loaded');
                        initAllInteractions();
                        // Initialize Cleaning Menu on load
                        initCleaningMenu();
                        // Position initial for summary
                        positionSummaryTooltip();

						initializeMenu(); // Initialize the radial menu when the page loads


                        // Wait briefly until everything is loaded
                        setTimeout(() => {
                            startSpectacularAnimation();
                            document.querySelector('.map-container').classList.add('animation-active');
							stabilizeLabels();
                        }, 1500);

						setTimeout(() => {
							debouncedStabilizeLabels(); // Wait 3 seconds to update all label positions to avoid the slippery view
							//
                        }, 3000);
                    }, 0);

                </script>
            </div>
        </body>
        </html>`;

	    this.setStateAsync(`${DH_Did}.vis.vishtml${DH_CurMap}`, '', true);
      this.log.info(`Reset map for ${DH_CurMap}`);
      this.setStateAsync(`${DH_Did}.vis.vishtml${DH_CurMap}`, html, true);
      this.log.info(`Interactive map with robot tracking generated for ${DH_CurMap}`);

    } catch (e) {
      this.log.error(`Error: ${e.message}`);
      throw e;
    }
  }

  async DH_getMapFromCanvas(Color, RoomNumber) {
    //this.log.info("Color: " + JSON.stringify(Color));
    let DH_OffsetCutMap = false;
    const DH_CutMapBox = await this.DH_getCenterCoordsFromCanvas({
      red: Color.R,
      green: Color.G,
      blue: Color.B,
      alpha: Color.A
    }, DH_OffsetCutMap);
    //this.log.info(JSON.stringify(DH_CutMapBox));
    DH_OffsetCutMap = true;
    const DH_CutMapCoord = await this.DH_getCenterCoordsFromCanvas({
      red: Color.R,
      green: Color.G,
      blue: Color.B,
      alpha: Color.A
    }, DH_OffsetCutMap);
    //this.log.info(JSON.stringify(DH_CutMapCoord));
    const offsetX = DH_CutMapCoord.offsetX;
    const offsetY = DH_CutMapCoord.offsetY;
    const boxWidth = DH_CutMapBox.x * 2;
    const boxHeight = DH_CutMapBox.y * 2;
    return {
      segment: RoomNumber,
      x: boxWidth,
      y: boxHeight,
      offX: offsetX,
      offY: offsetY
    };
    /*var imageData = context.getImageData(offsetX, offsetY, boxWidth, boxHeight);
        document.getElementById('canvas').height = boxHeight;
        document.getElementById('canvas').width = boxWidth;
        context.putImageData(imageData, 0, 0);*/
  }
  async DH_getCenterCoordsFromCanvas(colors, relativeToCanvas) {
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const len = imageData.data.length;
    const minX = Infinity;
    const minY = Infinity;
    const maxX = 0;
    const maxY = 0;
    let xCor = 0;
    let yCor = 0;
    const pixelFound = 0;
    for (let i = 0; i < len; i += 4) {
      xCor = (i / 4) % canvas.width;
      yCor = Math.floor((i / 4) / canvas.width);
    }
    const middleX = (maxX - minX) / 2;
    const middleY = (maxY - minY) / 2;
    imageData = null;
    return {
      x: (relativeToCanvas ? minX : 0) + middleX,
      y: (relativeToCanvas ? minY : 0) + middleY,
      offsetX: relativeToCanvas ? minX : 0,
      offsetY: relativeToCanvas ? minY : 0
    };
  }
  async DH_hexToRgbA(hex) {
    let Color;
    Color = hex.substring(1).split('');
    if (Color.length == 3) {
      Color = [Color[0], Color[0], Color[1], Color[1], Color[2], Color[2]];
    }
    Color = '0x' + Color.join('');
    const ColR = (Color >> 16) & 255;
    const ColG = (Color >> 8) & 255;
    const ColB = Color & 255;
    const ColA = 255;
    const RGBA = 'rgba(' + [ColR, ColG, ColB, ColA].join(',') + ')';
    return {
      RGBA: RGBA,
      R: ColR,
      G: ColG,
      B: ColB,
      A: ColA
    };
  }
  async DH_Clean() {
    DH_URLTK = null;
    DH_URLLST = null;
    DH_URLINF = null;
    DH_URLOTCINF = null;
    DH_URLPROP = null;
    DH_URLDOWNURL = null;
    DH_URLUSA = null;
    DH_URLDRLC = null;
    DH_URLAUTH = null;
    DH_DHURLSENDA = null;
    DH_DHURLSENDB = null;
    DH_DHURLSENDDOM = null;
  }

  async DH_SearchIID(ToFindVar) {
    let RetSPKey = false;
    for (const [SPkey, SPvalue] of Object.entries(DreameStateProperties)) {
      //this.log.info('=====> ' + SPkey + " => " + ToFindVar);
      if (SPvalue != null) {
        if (SPkey == ToFindVar) {
          RetSPKey = SPvalue;
          break;
        }
      }
    }
    return RetSPKey;
  }

  async DH_CheckTaskStatus() {
    try {
      const RobTaskStatusOb = await this.getStateAsync(DH_Did + '.state.TaskStatus');
      const RobTaskStatus = RobTaskStatusOb.val;

      switch (RobTaskStatus) {
        case DreameTaskStatus[UserLang][0]: /*'Completed':*/
          DH_NewTaskStatus = 0;

          break;
        case DreameTaskStatus[UserLang][1]: /*'Auto cleaning':*/
          DH_NewTaskStatus = 1;
          break;
        case DreameTaskStatus[UserLang][2]: /*'Zone cleaning':*/
          DH_NewTaskStatus = 2;
          break;
        case DreameTaskStatus[UserLang][3]: /*'Segment cleaning':*/
          DH_NewTaskStatus = 3;
          break;
        case DreameTaskStatus[UserLang][4]: /*'Spot cleaning':*/
          DH_NewTaskStatus = 4;
          break;
        case DreameTaskStatus[UserLang][5]: /*'Fast mapping':*/
          DH_NewTaskStatus = 5;
          break;
      }
      //this.log.info('Get the last task status :' + DH_NewTaskStatus);
    } catch (error) {
      this.log.error(error);
    }
    //Reset PosHistory
    if ((DH_OldTaskStatus == 0) &&
            ((DH_NewTaskStatus == 1) || (DH_NewTaskStatus == 2) || (DH_NewTaskStatus == 3) || (DH_NewTaskStatus == 4) || (DH_NewTaskStatus == 5))) {
      //1: "Auto cleaning"---------2: "Zone cleaning"----------3: "Segment cleaning"-----4: "Spot cleaning"----------5: "Fast mapping"
      await this.setState(DH_Did + '.vis.PosHistory' + DH_CurMap, '{}', true);
      DH_CleanStatus = false;
      DH_SetLastStatus = false;
      DH_OldTaskStatus = DH_NewTaskStatus;
      //if (LogData) {
      this.log.info('A new cleaning was initiated, the object state PosHistory was reset to :' + DH_OldTaskStatus);
      //}
    }
  }

  async DH_Base64DecodeUnicode(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  // Helper functions outside of DH_GenerateMap
  async DH_GetRobotPosition(Position, SegmentObject) {
    let currentSegment = null;
    let result = null;

    for (const segment of Object.values(SegmentObject)) {
      let inside = false;
      const { X: xCoords, Y: yCoords } = segment;

      for (let i = 0, j = xCoords.length - 1; i < xCoords.length; j = i++) {
        const xi = xCoords[i], yi = yCoords[i];
        const xj = xCoords[j], yj = yCoords[j];

        const intersect = ((yi > Position[1]) !== (yj > Position[1])) &&
                (Position[0] < ((xj - xi) * (Position[1] - yi) / (yj - yi) + xi));
        if (intersect) inside = !inside;
      }

      if (inside) {
        currentSegment = segment;
        break;
      }
    }

    if (currentSegment) {
      const roomName = currentSegment.Name;
      const roomPath = `${DH_Did}.state.cleaninginfo.${DH_CurMap}.${roomName}`;

      if (!roomData[roomName]) {
        roomData[roomName] = {
          points: new Set(),
          totalArea: await this.calculatePolygonArea(currentSegment.X, currentSegment.Y) / 100,
          lastUpdated: 0
        };
        await this.createRoomStates(roomPath, currentSegment.Name);
      }

      const roundedX = Math.round(Position[0] * 10) / 10;
      const roundedY = Math.round(Position[1] * 10) / 10;
      roomData[roomName].points.add(`${roundedX},${roundedY}`);

      if (lastPosition) {
        const pointsBetween = await this.getPointsBetween(lastPosition, Position);
        pointsBetween.forEach(([x, y]) => {
          const roundedX = Math.round(x * 10) / 10;
          const roundedY = Math.round(y * 10) / 10;
          roomData[roomName].points.add(`${roundedX},${roundedY}`);
        });
      }

      const now = Date.now();
      if (now - roomData[roomName].lastUpdated > 2000) {
        const cleanedArea = roomData[roomName].points.size;
        const coveragePercent = (cleanedArea / roomData[roomName].totalArea) * 100;
        //this.log.info(parseFloat((cleanedArea / 10000).toFixed(2)));
        if (parseFloat((cleanedArea / 10000).toFixed(2)) > 0.5) {
          await this.updateRoomStates(roomPath, {
            Name: currentSegment.Name,
            TotalArea: parseFloat((roomData[roomName].totalArea / 10000).toFixed(2)),
            CleanedArea: parseFloat((cleanedArea / 10000).toFixed(2)),
            CoveragePercent: parseFloat(coveragePercent.toFixed(1)),
            LastUpdate: new Date().toISOString()
          });
        }


        await this.setState(`${DH_Did}.state.CurrentRoomCleaningName`, currentSegment.Name, true);
        await this.setState(`${DH_Did}.state.CurrentRoomCleaningNumber`, currentSegment.Id, true);
        await this.setState(`${DH_Did}.state.CurrentRoomCoveragePercent`, parseFloat(coveragePercent.toFixed(1)), true);

        await this.setObjectNotExistsAsync(`${DH_Did}.vis.robotUpdate`, {
          type: 'state',
          common: {
            name: 'RobotUpdate',
            type: 'mixed',
            role: 'state',
            write: false,
            read: true,
            def: ''
          },
          native: {},
        });

        // Create the complete object for history and live update
        result = {
          position: { x: Position[0], y: Position[1] },
          currentRoom: currentSegment.Name,
          currentId: currentSegment.Id,
          TotalArea: parseFloat((roomData[roomName].totalArea / 10000).toFixed(2)),
          CleanedArea: parseFloat((cleanedArea / 10000).toFixed(2)),
          CoveragePercent: parseFloat(coveragePercent.toFixed(1)),
          timestamp: now
        };

        // Set the complete object for live update
        await this.setStateAsync(`${DH_Did}.vis.robotUpdate`, {
          val: JSON.stringify(result),
          ack: true
        });

        roomData[roomName].lastUpdated = now;
      }
    }

    lastPosition = Position;
    // return the complete object for history
    return result;
  }

  async calculateTotalCoverage() {
    let totalArea = 0;
    let totalCleaned = 0;

    for (const room in roomData) {
      totalArea += roomData[room].totalArea;
      totalCleaned += roomData[room].points.size;
    }

    return totalArea > 0 ? (totalCleaned / totalArea) * 100 : 0;
  }

  /**
 * Creates all required ioBroker states for a room
 * @param {string} roomPath - The base path for the room's channel
 * @param {string} roomName - The display name of the room
 */
  async createRoomStates(roomPath, roomName) {
  // Create channel object
    await this.setObjectNotExistsAsync(roomPath, {
      type: 'channel',
      common: {
        name: roomName,
        role: 'info'
      },
      native: {}
    });

    // Define all state objects to be created
    const states = {
      'Name': { type: 'string', role: 'text' },
      'TotalArea': { type: 'number', unit: 'm²', role: 'value' },
      'CleanedArea': { type: 'number', unit: 'm²', role: 'value' },
      'CoveragePercent': { type: 'number', unit: '%', role: 'value' },
      'LastUpdate': { type: 'string', role: 'date' }
    };

    // Create each state object
    for (const [state, config] of Object.entries(states)) {
      await this.setObjectNotExistsAsync(`${roomPath}.${state}`, {
        type: 'state',
        common: {
          ...config,
          name: `${roomName} ${state}`,
          read: true,
          write: false
        },
        native: {}
      });
    }
  }

  /**
 * Updates all states for a room
 * @param {string} roomPath - The base path for the room's channel
 * @param {object} data - Key-value pairs of state updates
 */
  async updateRoomStates(roomPath, data) {
    for (const [key, value] of Object.entries(data)) {
      await this.setStateAsync(`${roomPath}.${key}`, { val: value, ack: true });
    }
  }

  /**
 * Resets all tracking variables
 */
  async resetVariables() {
    visitedPointsPerSegment = {}; // Clear visited points tracking
    lastPosition = null; // Reset last known position
    roomData = {}; // Clear all room data
  }

  /**
 * Bresenham's line algorithm to get all points between two coordinates
 * @param {Array} [x0, y0] - Starting coordinate
 * @param {Array} [x1, y1] - Ending coordinate
 * @returns {Array} Array of all points between the coordinates
 */
  async getPointsBetween([x0, y0], [x1, y1]) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      points.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return points;
  }

  /**
 * Calculates coverage percentage for a room
 * @param {object} segment - Room segment data
 * @param {Set} visitedPointsSet - Set of visited points
 * @returns {number} Coverage percentage (0-100)
 */
  async calculateCoveragePercent(segment, visitedPointsSet) {
  // 1. Calculate total area of the segment in dm�
    const totalArea = (await this.calculatePolygonArea(segment.X, segment.Y)) / 100;

    // 2. Calculate covered area (1 point = 1dm�)
    const coveredArea = (visitedPointsSet.size / 100);

    // 3. Calculate percentage (capped at 100%)
    const percent = Math.min(100, (coveredArea / totalArea) * 100);

    return parseFloat(percent.toFixed(2));
  }

  /**
 * Calculates area of a polygon using the shoelace formula
 * @param {Array} xCoords - Array of X coordinates
 * @param {Array} yCoords - Array of Y coordinates
 * @returns {number} Area in original units squared (typically cm�)
 */
  async calculatePolygonArea(xCoords, yCoords) {
    let area = 0;
    for (let i = 0, j = xCoords.length - 1; i < xCoords.length; j = i++) {
      area += (xCoords[j] + xCoords[i]) * (yCoords[j] - yCoords[i]);
    }
    return Math.abs(area / 2); // Absolute value of area
  }

  /**
 * Calculates the geometric center of a room based on wall coordinates
 * Handles coordinate system wrapping for angular values (>180�cases)
 *
 * @param {Array<Object>} WAr - Array of wall objects containing start/end coordinates
 * @param {number} WAr[].beg_pt_x - X-coordinate of wall start point
 * @param {number} WAr[].end_pt_x - X-coordinate of wall end point
 * @param {number} WAr[].beg_pt_y - Y-coordinate of wall start point
 * @param {number} WAr[].end_pt_y - Y-coordinate of wall end point
 * @returns {Object} Object containing inverted center coordinates
 * @property {number} Rx - Inverted X-coordinate of room center
 * @property {number} Ry - Inverted Y-coordinate of room center
 */
  async CalculateRoomCenter(WAr) {
    // Extract and combine all x-coordinates from wall segments
    const x0 = WAr.map(m => m['beg_pt_x']);
    const x1 = WAr.map(m => m['end_pt_x']);
    const x = x0.concat(x1);

    // Calculate x-axis boundaries and center point
    const minx = Math.min(...x);
    const maxx = Math.max(...x);
    let Rx = (minx + maxx) / 2; // Midpoint calculation for x-axis

    // Extract and combine all y-coordinates from wall segments
    const y0 = WAr.map(m => m['beg_pt_y']);
    const y1 = WAr.map(m => m['end_pt_y']);
    let y = y0.concat(y1);
    let miny = Math.min(...y);
    let maxy = Math.max(...y);

    // Special handling for angular coordinate systems (wrapping around 180�)
    if (maxy - miny > 180) {
      // Adjust values that cross the 180� boundary
      y = y.map(val => val < maxy - 180 ? val + 360 : val);
      miny = Math.min(...y);
      maxy = Math.max(...y);
    }

    let Ry = (miny + maxy) / 2; // Midpoint calculation for y-axis

    // Normalize y-coordinate if it exceeds 180�
    if (Ry > 180) {
      Ry -= 360; // Bring back into standard range
    }

    // Invert coordinates (common in robotic systems where origin is at center)
    Rx = Rx * -1; // Invert x-axis
    Ry = Ry * -1; // Invert y-axis

    return {
      Rx, // Inverted x-coordinate of room center
      Ry  // Inverted y-coordinate of room center
    };
  }

  async DH_GetControl() {

    const requestId = Math.floor(Math.random() * 9000) + 1000;
    for (const [SPkey, SPvalue] of Object.entries(DreameActionProperties)) {
      let PiidAction = DreameActionParams[SPkey];
      if (Object.prototype.toString.call(DreameActionParams[SPkey]).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
        PiidAction = JSON.parse(DreameActionParams[SPkey]);
      }
      //JSON.parse(JSON.stringify(DreameActionParams[SPkey]))

      const GetSIID = parseInt((SPkey.split('S')[1] || '').split('A')[0]);
      let GetAIID = parseInt(SPkey.replace('S' + GetSIID + 'A', ''));
      if ((SPkey.indexOf('P') !== -1) && (SPkey.indexOf('C') !== -1)) {
        GetAIID = (SPkey.split('P')[1] || '').split('C')[0];
      }
      const GetSIIDAIID = GetSIID + '.' + GetAIID;
      const SETURLData = {
        did: DH_Did,
        id: requestId,
        data: {
          did: DH_Did,
          id: requestId,
          method: 'action',
          params: {
            did: DH_Did,
            siid: GetSIID,
            aiid: GetAIID,
            in: PiidAction
          },
        },

      };
      try {
        const GetCloudRequestDeviceData = await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, SETURLData);
      } catch (err) {
        this.log.warn('Getting "' + SPvalue + '" State from cloud failed: ' + err);
      }
    }
  }

  async DH_URLSend(DHurl, SetData) {
    return await this.DH_requestClient({
      method: 'post',
      maxBodyLength: Infinity,
      url: DHurl,
      headers: {
        'Accept': '*/*',
        //'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': 'en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': DH_URLUSA,
        'Authorization': DH_URLAUTH,
        'Tenant-Id': DH_Tenant,
        'Content-Type': 'application/json',
        'Dreame-Auth': DH_Auth,
      },
      data: SetData,
    }).then(async (response) => {
      this.log.info(DHurl + ' | ' + JSON.stringify(SetData) + ' | Response: ' + JSON.stringify(response.data));
      if (LogData) {
        this.log.info(DHurl + ' | ' + JSON.stringify(SetData) + ' | Response: ' + JSON.stringify(response.data));
      }
      return response.data;
    }).catch((error) => {
      this.log.warn('unable to send Command: DH_URLSend | ' + SetData + ' | Error: ' + JSON.stringify(error));
    });
  }

  // Optimized for minimal resource consumption
  async DH_connectMqtt() {
  // If an MQTT client already exists, close the old connection and remove listeners
    if (this.mqttClient) {
      this.mqttClient.removeAllListeners(); // Remove all old listeners
      this.mqttClient.end(true); // Immediately close the connection and clean up resources
    }

    // Create a new MQTT client
    this.mqttClient = mqtt.connect('mqtts://' + DH_BDomain, {
      clientId: 'p_' + crypto.randomBytes(8).toString('hex'),
      username: DH_Uid,
      password: DH_Auth,
      rejectUnauthorized: false,
      reconnectPeriod: 10000,
    });

    // On connection success
    this.mqttClient.on('connect', () => {
      this.log.info('Connection to MQTT successfully established');
      this.mqttClient.subscribe(`/status/${DH_Did}/${DH_Uid}/${DH_Model}/${DH_Region}/`);
      this.DH_CheckTaskStatus();
    });

    // On receiving a message
    this.mqttClient.on('message', async (topic, message) => {
    // Message is received as a Buffer, convert it to a string
      if (LogData) {
        this.log.info(topic.toString());
        this.log.info(message.toString());
      }

      try {
        message = JSON.parse(message.toString());
        if (LogData) {
          this.log.info('Get Message from the device:' + JSON.stringify(message));
        }
      } catch (error) {
        this.log.error(error);
        return;
      }

      if (message.data && message.data.method === 'properties_changed') {
      // Check task status
        this.DH_CheckTaskStatus();

        for (const element of message.data.params) {
        // Update map data if necessary
          if ((JSON.stringify(element.siid) === '6' && JSON.stringify(element.piid) === '1') && DH_UpdateTheMap == true) {
            if (LogData) {
              this.log.info('Map data:' + JSON.stringify(element.value));
            }
            let encode = JSON.stringify(element.value);
            const mappath = DH_Did + '.mqtt.';
            this.DH_uncompress(encode, mappath);
            encode = null; // Reset the map data buffer to free up memory
            DH_UpdateTheMap = false;
          }

          const ObjectPoint = await this.DH_SearchIID('S' + element.siid + 'P' + element.piid);
          if (ObjectPoint) {
            const path = DH_Did + '.state.' + ObjectPoint.replace(/\w\S*/g, function(SPName) {
              return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
            }).replace(/\s/g, '');

            if (path) {
              let Setvalue = element.value;
              if (Object.prototype.toString.call(Setvalue).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                Setvalue = JSON.stringify(Setvalue);
              }

              if ('S' + element.siid + 'P' + element.piid == 'S2P1') {
                await this.DH_getType(Setvalue, path.replace('.state.', '.vis.'), 'S' + element.siid + 'P' + element.piid);
                await this.DH_setState(path.replace('.state.', '.vis.'), Setvalue, true);
              }

              Setvalue = await this.DH_SetPropSPID('S' + element.siid + 'P' + element.piid, Setvalue);
              await this.DH_getType(Setvalue, path, 'S' + element.siid + 'P' + element.piid);
              await this.DH_setState(path, Setvalue, true);

              if (('S' + element.siid + 'P' + element.piid == 'S4P26') && (Setvalue == 1)) {
                this.log.info('Set and update Cleaning Mode value to: ' + JSON.stringify(Setvalue));
                const ReadpathCM = DH_Did + '.control.' + (DreameStateProperties['S4P23']).replace(/\w\S*/g, function(SPName) {
                  return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                }).replace(/\s/g, '');
                await this.setState(ReadpathCM, Setvalue, true);
              }

              let AppChanged = false;
              for (const ex in DreameActionExteParams) {
                if (ex.indexOf('S' + element.siid + 'P' + element.piid) !== -1) {
                  AppChanged = true;
                  break;
                }
              }
              if (AppChanged) {
                await this.DH_RequestControlState();
              }
            }
          }
        }
      }
    });

    // Error handling for MQTT
    this.mqttClient.on('error', async (error) => {
      this.log.error(error);
      if (error.message && error.message.includes('Not authorized')) {
        this.log.error('Not authorized to connect to MQTT');
        this.setState('info.connection', false, true);
        await this.DH_refreshToken();
      }
    });

    // When the connection is closed
    this.mqttClient.on('close', () => {
      this.log.info('MQTT Connection closed');
    });
  }


  async DH_connectMqttOld() {
    if (this.mqttClient) {
      this.mqttClient.end();
    }
    this.mqttClient = mqtt.connect('mqtts://' + DH_BDomain, {
      clientId: 'p_' + crypto.randomBytes(8).toString('hex'),
      username: DH_Uid,
      password: DH_Auth,
      rejectUnauthorized: false,
      reconnectPeriod: 10000,
    });
    this.mqttClient.on('connect', () => {
      this.log.info('Connection to MQTT successfully established');
      this.mqttClient.subscribe(`/status/${DH_Did}/${DH_Uid}/${DH_Model}/${DH_Region}/`);
      this.DH_CheckTaskStatus();
    });
    this.mqttClient.on('message', async (topic, message) => {
      // message is Buffer
      if (LogData) {
        this.log.info(topic.toString());
        this.log.info(message.toString());
      }
      try {
        message = JSON.parse(message.toString());
        if (LogData) {
          this.log.info('Get Message from the device:' + JSON.stringify(message));
        }
      } catch (error) {
        this.log.error(error);
        return;
      }
      if (message.data && message.data.method === 'properties_changed') {

        //Check Dreame Task Status
        this.DH_CheckTaskStatus();

        for (const element of message.data.params) {
          if ((JSON.stringify(element.siid) === '6' && JSON.stringify(element.piid) === '1') && DH_UpdateTheMap == true) {
            if (LogData) {
              this.log.info('Map data:' + JSON.stringify(element.value));
            }
            let encode = JSON.stringify(element.value);
            const mappath = DH_Did + '.mqtt.';
            this.DH_uncompress(encode, mappath);
            encode = null;
            DH_UpdateTheMap = false;
          }
          const ObjectPoint = await this.DH_SearchIID('S' + element.siid + 'P' + element.piid);
          if (ObjectPoint) {
            const path = DH_Did + '.state.' + ObjectPoint.replace(/\w\S*/g, function(SPName) {
              return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
            }).replace(/\s/g, '');
            if (path) {
              let Setvalue = element.value;
              //this.log.info('===> path: ' + path + "value: " + JSON.stringify(Setvalue) + " element: " + JSON.stringify(element));
              if (Object.prototype.toString.call(Setvalue).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                Setvalue = JSON.stringify(Setvalue);
              }
              if ('S' + element.siid + 'P' + element.piid == 'S2P1') {
                await this.DH_getType(Setvalue, path.replace('.state.', '.vis.'), 'S' + element.siid + 'P' + element.piid);
                await this.DH_setState(path.replace('.state.', '.vis.'), Setvalue, true);
              }

              Setvalue = await this.DH_SetPropSPID('S' + element.siid + 'P' + element.piid, Setvalue);
              await this.DH_getType(Setvalue, path, 'S' + element.siid + 'P' + element.piid);
              await this.DH_setState(path, Setvalue, true);

              if (('S' + element.siid + 'P' + element.piid == 'S4P26') && (Setvalue == 1)) {
                this.log.info('Set and update Cleaning Mode value to: ' + JSON.stringify(Setvalue));
                const ReadpathCM = DH_Did + '.control.' + (DreameStateProperties['S4P23']).replace(/\w\S*/g, function(SPName) {
                  return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                }).replace(/\s/g, '');
			       await this.setState(ReadpathCM, Setvalue, true);
              }

              let AppChanged = false;
              for (const ex in DreameActionExteParams) {
                if (ex.indexOf('S' + element.siid + 'P' + element.piid) !== -1) {
					   AppChanged = true;
					   break;
                }
              }
              if (AppChanged) {
                await this.DH_RequestControlState();
		       }
            }
          }
        }
      }
    });
    this.mqttClient.on('error', async (error) => {
      this.log.error(error);
      if (error.message && error.message.includes('Not authorized')) {
        this.log.error('Not authorized to connect to MQTT');
        this.setState('info.connection', false, true);
        await this.DH_refreshToken();
      }
    });
    this.mqttClient.on('close', () => {
      this.log.info('MQTT Connection closed');
    });
  }

  async DH_SetPropSPID(InSetPropSPID, InSetvalue) {
    if (InSetPropSPID == 'S2P1' /*"State"*/ ) {
      InSetvalue = DreameVacuumState[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S2P2' /*"Error"*/ ) {
      InSetvalue = DreameVacuumErrorCode[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S3P2' /*"Charging status"*/ ) {
      InSetvalue = DreameChargingStatus[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P1' /*"Status"*/ ) {
      DH_NowStatus = isNaN(+InSetvalue) ? 0 : +InSetvalue;
      if (LogData) {
        this.log.info(`=======> from DH_SetPropSPID: DH_NowStatus is ${DH_NowStatus}  (${InSetPropSPID}) Set to : ${InSetvalue}`);
      }
      InSetvalue = DreameStatus[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P4' /*"Suction level"*/ ) {
      InSetvalue = DreameSuctionLevel[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P5' /*"Water volume"*/ ) {

      // Invalidate cache after successful update
      consumptionDataCache = {
        data: null,  // Clear cache
        lastUpdate: 0 // Reset timestamp
      };
      InSetvalue = DreameWaterVolume[UserLang][parseInt(InSetvalue)];
	  waterTrackingCache.waterLevel = InSetvalue;
    }

    if (InSetPropSPID == 'S4P6' /*"Water tank"*/ ) {
      InSetvalue = DreameWaterTank[UserLang][parseInt(InSetvalue)];
    }

    if (InSetPropSPID == 'S4P7' /*"Task status"*/ ) {

      DH_NowTaskStatus = isNaN(+InSetvalue) ? 0 : +InSetvalue;
      if (LogData) {
	  this.log.info(`=======> from DH_SetPropSPID: DH_NowTaskStatus is ${DH_NowTaskStatus} (${InSetPropSPID}) Set to : ${InSetvalue}`);
      }
      InSetvalue = DreameTaskStatus[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P23' /*"Cleaning mode"*/ ) {

      // Invalidate cache after successful update
      consumptionDataCache = {
        data: null,  // Clear cache
        lastUpdate: 0 // Reset timestamp
      };
      // Check Mopp Mode to calculate water consumption
      waterTracking.isMopping = WATER_TRACKING.MOPPING_MODES.includes(parseInt(InSetvalue));
	  if (LogData) {
        this.log.info(`=======> from DH_SetPropSPID: isMopping is : ${waterTracking.isMopping} => ${InSetvalue}`);
      }

      InSetvalue = DreameCleaningMode[UserLang][parseInt(InSetvalue)];

	  waterTrackingCache.mode = InSetvalue;


    }
    if (InSetPropSPID == 'S4P25' /*"Self wash base status"*/ ) {
      InSetvalue = DreameSelfWashBaseStatus[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P28' /*"Carpet sensitivity"*/ ) {
      InSetvalue = DreameCarpetSensitivity[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P35' /*"Warn status"*/ ) {
      InSetvalue = DreameVacuumErrorCode[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P36' /*"Carpet avoidance"*/ ) {
      InSetvalue = DreameCarpetAvoidance[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P41' /*"Low water warning"*/ ) {
      InSetvalue = DreameLowWaterWarning[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P46' /*"Mop wash level"*/ ) {
      InSetvalue = DreameMopWashLevel[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S15P1' /*"Auto dust collecting"*/ ) {
      InSetvalue = DreameAutoDustCollecting[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P63' /*"Cleaning completed"*/ ) {
      DH_CompletStatus = JSON.parse(JSON.stringify(InSetvalue));
    }
    if (InSetPropSPID == 'S15P5' /*"Auto empty status"*/ ) {
      InSetvalue = DreameAutoEmptyStatus[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S27P2' /*"Dirty water tank"*/ ) {
      if (InSetvalue == 1) {/*"Reset the Warn status Object"*/
        const DWpath = DH_Did + '.state.' + DreameStateProperties['S4P35'].replace(/\w\S*/g, function(SPName) {
          return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
        }).replace(/\s/g, '');
        await this.DH_setState(DWpath, DreameVacuumErrorCode[UserLang][0], true);
      }
      InSetvalue = DreameDirtyWaterTank[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S27P1' /*"Pure water tank"*/ ) {
      let DWpath = DH_Did + '.state.' + DreameStateProperties['S4P41'].replace(/\w\S*/g, function(SPName) { /*"Change Low water warning Object"*/
        return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
      }).replace(/\s/g, '');
      if (InSetvalue == 0) {
        await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][6], true);
      } else if (InSetvalue == 2) {
        await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][2], true);
      } else if (InSetvalue == 3) {
        await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][0], true);
      }
      DWpath = DH_Did + '.state.' + DreameStateProperties['S4P6'].replace(/\w\S*/g, function(SPName) { /*"Change Water tank Object"*/
        return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
      }).replace(/\s/g, '');
      if (InSetvalue == 0) {
        await this.DH_setState(DWpath, DreameWaterTank[UserLang][0], true);
      } else if (InSetvalue == 2) {
        await this.DH_setState(DWpath, DreameWaterTank[UserLang][1], true);
      } else if (InSetvalue == 3) {
        await this.DH_setState(DWpath, DreameWaterTank[UserLang][1], true);
      }

      //this.log.warn(`Water tank removed. InSetvalue: ${InSetvalue} and firstStartWaterTrack: ${firstStartWaterTrack}`);
      // Handle tank status changes
      await this.handleTankStatusChange(InSetvalue);

      InSetvalue = DreamePureWaterTank[UserLang][parseInt(InSetvalue)];
    }


    return InSetvalue;
  }

  // Optimized for minimal resource consumption
  async DH_uncompress(In_Compressed, In_path) {
  // Replace URL-safe characters with the standard Base64 characters
    let input_Raw = In_Compressed.replace(/-/g, '+').replace(/_/g, '/');

    let decode;
    try {
    // Decompress the data synchronously using inflateSync and convert the buffer to a string
      decode = zlib.inflateSync(Buffer.from(input_Raw, 'base64')).toString();
    } catch (err) {
    // Log a warning if decompression fails
      this.log.warn('Error during decompression: ' + err);
      return; // Exit if decompression fails
    }

    // Use a regular expression to extract the JSON-like structure from the decompressed string
    let jsondecode = decode.match(/[{\[]{1}([,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis);

    let jsonread;
    try {
    // Try to parse the extracted JSON string
      jsonread = JSON.parse(jsondecode);
    } catch (err) {
    // Log a warning if JSON parsing fails
      this.log.warn('Unable to parse Map-Data: DH_uncompress | Uncompress error response: ' + err);
      return; // Exit if JSON parsing fails
    }

    // If JSON is valid, proceed to process it further
    if (!jsonread) {
      return; // Exit if no valid JSON found
    }

    // Call another method to handle the decoded JSON data
    await this.DH_PropMQTTObject(jsonread, DH_Did + '.mqtt.', 'Decode map: ');

    // Nullify variables to release memory after processing
    input_Raw = null;
    decode = null;
    jsondecode = null;
    jsonread = null;
  }

  async DH_PropMQTTObject(InData, InPath, InLog) {
    const validTaskStatuses = [1, 2, 3, 4, 5]; // List of valid task statuses for robot
    const validNowStatuses = [2, 4, 18, 19, 20, 25]; // List of valid current statuses for robot

    for (const [key, value] of Object.entries(InData)) {
      let valueCopy = value;
      const path = InPath + key;
      if (path && valueCopy != null) {

        // Check if the path contains '.cleanset' and if the value is an object
        if (path.endsWith('.cleanset') && typeof valueCopy === 'object') {
          if (LogData) {
            this.log.info('==> cleanset Path found | typeof: ' + typeof valueCopy);
          }
          valueCopy = JSON.stringify(valueCopy);  // Serialize the object to a JSON string for transmission
        }

        // Handle non-object values, including arrays (arrays should also be serialized)
        if (typeof valueCopy !== 'object' || Array.isArray(valueCopy)) {
          if (LogData) {
            this.log.info(`${InLog} Set ${path} to ${valueCopy}`);
          }

          // If the value is an array, serialize it into a JSON string
          if (Array.isArray(valueCopy)) {
            valueCopy = JSON.stringify(valueCopy);
          }

          // Set the value and its type in the state
          await this.DH_getType(valueCopy, path);
          await this.DH_setState(path, valueCopy, true);

          // Handle logic specific to paths related to robot states
          if (path.includes('.robot')) {
            try {
            // Parse the value and update the robot's position
              const robotData = await this.DH_GetRobotPosition(JSON.parse(valueCopy), CheckArrayRooms);
              if (LogData) {
                this.log.info('Call DH_GetRobotPosition: ' + JSON.stringify(robotData));
              }
              if (robotData) {
				  if (LogData) {
				  this.log.info('Pass DH_GetRobotPosition... | ' + validTaskStatuses.includes(DH_NowTaskStatus) + ' | ' + validNowStatuses.includes(DH_NowStatus));
				  }
                // Update history with the complete object
				  // If the current task status is one of the valid values and the robot is in one of the valid statuses
                if (validTaskStatuses.includes(DH_NowTaskStatus) && validNowStatuses.includes(DH_NowStatus)) {
                  await this.DH_SetHistory(robotData, DH_Did + '.vis.PosHistory' + DH_CurMap);
                  DH_CleanStatus = true;
                  DH_SetLastStatus = false;
                }
              }
            } catch (SRPerror) {
              this.log.error(`Failed to update robot position for value: ${valueCopy}. Error: ${SRPerror.message}`);
            }

            // Check the task completion status and handle history updates
            if ((DH_CompletStatus === 100) || (DH_NowStatus == 14)) {
            // If the task is complete, reset cleaning and status flags
              DH_CleanStatus = false;
              DH_SetLastStatus = false;
              await this.resetVariables();

			  // Water level tracking at the end of cleaning
			    if (waterTracking.isMopping) {
                await this.handleCleaningComplete();
                waterTracking.isMopping = false; // Reset Mopping-Flag
              }
            }

            // If cleaning is in progress but not yet complete, record history
            if (DH_CompletStatus < 100 && DH_CleanStatus && !DH_SetLastStatus) {

              // Update water level state when cleaning starts
              if (waterTracking.isMopping && DH_CompletStatus == 0) {
                await this.handleCleaningStart();
              }

              DH_SetLastStatus = true;
            // Optionally, uncomment this line if needed to set history back to base position
            // await this.DH_SetHistory("{}", DH_Did + ".vis.PosHistory" + DH_CurMap);
            }
          }
        }
      }
    }
  }

  async DH_SetHistory(NewRobVal, InRobPath) {
    try {
      // 1. Clean data format and create extended object
      let historyEntry;
      if (Array.isArray(NewRobVal)) {
        // When passed as array [x,y]
        historyEntry = {
          position: { x: NewRobVal[0], y: NewRobVal[1] },
          timestamp: Date.now()
        };
      } else if (typeof NewRobVal === 'string') {
        // When passed as JSON string
        try {
          const parsed = JSON.parse(NewRobVal);
          if (Array.isArray(parsed)) {
            historyEntry = {
              position: { x: parsed[0], y: parsed[1] },
              timestamp: Date.now()
            };
          } else if (typeof parsed === 'object' && parsed.position) {
            // Take complete object with all fields
            historyEntry = {
              position: parsed.position,
              currentRoom: parsed.currentRoom,
              currentId: parsed.currentId,
              TotalArea: parsed.TotalArea,
              CleanedArea: parsed.CleanedArea,
              CoveragePercent: parsed.CoveragePercent,
              timestamp: parsed.timestamp || Date.now()
            };
          }
        } catch (e) {
          this.log.warn(`Could not parse history value: ${NewRobVal}`);
          historyEntry = {
            position: { x: -1, y: -1 },
            timestamp: Date.now()
          };
        }
      } else if (typeof NewRobVal === 'object' && NewRobVal.position) {
        // When passed directly as object with position
        historyEntry = {
          position: NewRobVal.position,
          currentRoom: NewRobVal.currentRoom,
          currentId: NewRobVal.currentId,
          TotalArea: NewRobVal.TotalArea,
          CleanedArea: NewRobVal.CleanedArea,
          CoveragePercent: NewRobVal.CoveragePercent,
          timestamp: NewRobVal.timestamp || Date.now()
        };
      } else {
        throw new Error(`Invalid position format: ${typeof NewRobVal}`);
      }

	  // Update water consumption if mopping is active
      if (waterTracking.isMopping && historyEntry.CleanedArea && historyEntry.currentRoom) {
        isCleaningActive = true;
        await this.updateWaterConsumption(historyEntry.CleanedArea, historyEntry.currentRoom);

        // Check the current robot status at startup
        if (!firstWaterTrackingActive) {
          await this.checkInitialCleaningStatus();
        }
      }

      // 2. Load existing history data
      let history = {};
      const historyState = await this.getStateAsync(InRobPath);
      if (historyState?.val) {
        try {
          history = JSON.parse(historyState.val);
          if (typeof history !== 'object') history = {};
        } catch (e) {
          this.log.warn(`Resetting corrupt history: ${e.message}`);
          history = {};
        }
      }

      // 3. Add new entry to history
      const newIndex = Object.keys(history).length;
      history[newIndex] = historyEntry;

      // 4. Maintain history size limit (4000 entries)
      const MAX_HISTORY = 4000;
      if (newIndex >= MAX_HISTORY) {
        delete history[newIndex - MAX_HISTORY];
      }

      // 5. Save updated history
      await this.setStateAsync(InRobPath, {
        val: JSON.stringify(history),
        ack: true
      });

      // 6. Send live update with all data
      await this.setStateAsync(`${DH_Did}.vis.robotUpdate`, {
        val: JSON.stringify(historyEntry),
        ack: true
      });

      if (LogData) {
	  this.log.info(`Updated history: Index ${newIndex} with ${JSON.stringify(historyEntry)}`);
      }

      // 8. Clear historyEntry from RAM to save resources (important if historyEntry is large)
      historyEntry = null; // Optimized for minimal resource consumption

    } catch (error) {
      this.log.error(`SetHistory failed: ${error.message}`);
    }
  }

  //==================> Initialization
  async initWaterTracking() {
    waterTracking = {
      currentMl: WATER_TRACKING.MAX_ML,
      initialMl: WATER_TRACKING.MAX_ML,
      roomData: {},
      isMopping: false,
      lastRoom: null,
      lastUpdate: Date.now()
    };

    // Create state objects
    const states = [
      { id: 'consumptionData', name: 'Water consumption data', type: 'string', role: 'json', def: '{}' },
      { id: 'currentMlPerSqm', name: 'Current water consumption', type: 'number', role: 'value', unit: 'ml/m²', def: WATER_TRACKING.DEFAULT_ML_PER_SQM },
      { id: 'PureWaterTank', name: 'Current pure water tank level', type: 'number', role: 'value.percent', unit: '%', def: 100, min: 0, max: 100 },
      { id: 'beforeRemoval', name: 'Water level before tank removal', type: 'number', role: 'value', unit: 'ml', def: 0, min: 0, max: WATER_TRACKING.MAX_ML },
      { id: 'roomConsumption', name: 'Water consumption by room', type: 'string', role: 'json' },
      { id: 'lastRemovalTime', name: 'Last water tank removal time', type: 'number', role: 'value.time', def: 0 },
      { id: 'current', name: 'Current water level', type: 'number', role: 'value.water', unit: 'ml', min: 0, max: WATER_TRACKING.MAX_ML, def: WATER_TRACKING.MAX_ML },
      { id: 'learningStats', name: 'Water consumption statistics', type: 'string', role: 'json' },
      { id: 'lastError', name: 'Last water tracking error', type: 'string', role: 'json' }
    ];

    for (const state of states) {
      await this.setObjectNotExistsAsync(`${DH_Did}.state.water.${state.id}`, {
        type: 'state',
        common: {
          name: state.name,
          type: state.type,
          role: state.role,
          read: true,
          write: state.id !== 'roomConsumption' && state.id !== 'learningStats',
          def: state.def,
          ...(state.unit && { unit: state.unit }),
          ...(state.min !== undefined && { min: state.min }),
          ...(state.max !== undefined && { max: state.max })
        },
        native: {}
      });
    }
  }

  //==================> Core functions
  async updateWaterConsumption(currentAreaM2, currentRoom) {
    try {
      if (!waterTracking) await this.initWaterTracking();

      // Validation
      if (!waterTracking.isMopping || !currentRoom || currentAreaM2 <= 0) {
        //if (LogData) this.log.debug('Water tracking skipped - invalid conditions');
        this.log.debug('Water tracking skipped - invalid conditions');
        return;
      }

      // Initialize room data
      waterTracking.roomData[currentRoom] ??= {
        lastRecordedArea: 0,
        consumedMl: 0,
        firstContactArea: null,
        maxCleanedArea: 0,
        lastUpdateTime: Date.now(),
        consumptionRates: []
      };
      const room = waterTracking.roomData[currentRoom];

      if (!room.consumptionRates) {
        room.consumptionRates = [];
      }


      // Recognize room changes
      if (room.firstContactArea === null || waterTracking.lastRoom !== currentRoom) {
        room.firstContactArea = currentAreaM2;
        room.lastRecordedArea = currentAreaM2;
        waterTracking.lastRoom = currentRoom;
        //if (LogData) this.log.info(`New room: ${currentRoom} | Area: ${currentAreaM2.toFixed(2)}m²`);
        this.log.info(`New room: ${currentRoom} | Area: ${currentAreaM2.toFixed(2)}m²`);
        return;
      }

      // Calculate area progress
      const newArea = currentAreaM2 - room.lastRecordedArea;
      if (newArea < WATER_TRACKING.MIN_AREA_DELTA) {
        if (LogData) this.log.info(`Area delta too small: ${newArea.toFixed(3)}m²`);
        return;
      }

      // Calculate consumption
      const mlConsumptionRate = await this.getWaterConsumptionRate();
      const mlPerSqm = Math.min(150, Math.max(10, mlConsumptionRate || WATER_TRACKING.DEFAULT_ML_PER_SQM));

      const estimatedConsumption = newArea * mlPerSqm;
      const actualConsumption = Math.min(estimatedConsumption, waterTracking.currentMl);
      const consumptionAccuracy = await this.calculateConsumptionAccuracy(
        estimatedConsumption, actualConsumption, newArea);

      // Update tracking
      waterTracking.currentMl -= actualConsumption;
      room.consumedMl += actualConsumption;
      room.lastRecordedArea = currentAreaM2;
      room.maxCleanedArea = Math.max(room.maxCleanedArea, currentAreaM2);
      room.lastUpdateTime = Date.now();
      waterTracking.lastUpdate = Date.now();

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

      // if (LogData) {
      this.log.info([
        `[WATER] Room: ${currentRoom}`,
        `Area: +${newArea.toFixed(2)}m² (total ${currentAreaM2.toFixed(2)}m²)`,
        `Used: ${actualConsumption}ml (est ${estimatedConsumption.toFixed(1)}ml)`,
        `Rate: ${mlPerSqm.toFixed(1)}?${(actualConsumption/newArea).toFixed(1)}ml/m²`,
        `Accuracy: ${(consumptionAccuracy*100).toFixed(0)}%`,
        `Remaining: ${waterTracking.currentMl}ml/${WATER_TRACKING.MAX_ML}ml`
      ].join(' | '));
      //}

      // Autosave when significant progress is made
      if (newArea > 1.0) {
        await this.saveWaterData();
      }

    } catch (error) {
      this.log.error(`Water calculation error: ${error.stack || error.message}`);
      await this.setStateAsync(`${DH_Did}.state.water.lastError`, {
        val: JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        }),
        ack: true
      });
    }
  }

  //==================> Learning functions
  async updateConsumptionData(mlPerSqm, context = {}) {
    try {
      const { confidence = 1.0, area = 0, room = 'unknown', isPartial = false } = context;

      // Validation
      if (typeof mlPerSqm !== 'number' || isNaN(mlPerSqm)) {
        this.log.warn(`Invalid consumption value: ${mlPerSqm}`);
        return;
      }

      // Limit value range
      const clampedMl = Math.max(5, Math.min(200, mlPerSqm));

      // Generate learning key
      const mode = waterTrackingCache.mode; //await this.getStateValue(`${DH_Did}.state.CleaningMode`) || 0;
      const waterLevel = waterTrackingCache.waterLevel; //await this.getStateValue(`${DH_Did}.state.WaterVolume`) || 0;

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
        remainingMl: waterTracking.currentMl,
        room: room
      };

      // Add entries
      data[key].push(newEntry);
      data[globalKey].push({ ...newEntry, weight: newEntry.weight * 0.6 });

      // Clean up data
      [key, globalKey].forEach(k => {
        data[k] = data[k]
          .sort((a, b) => b.weight - a.weight || b.timestamp - a.timestamp)
          .slice(0, WATER_TRACKING.LEARNING_SAMPLES);
      });

      // Statistical analysis
      const stats = await this.calculateConsumptionStats(data[key]);
      if (stats.stdDev > 30 && data[key].length > 5) {
        data[key] = data[key].filter(entry =>
          Math.abs(entry.value - stats.median) < 2 * stats.mad
        );
      }

      // Update LearningStats
      await this.updateLearningStats();

      // Save
      await this.setStateAsync(`${DH_Did}.state.water.consumptionData`, {
        val: JSON.stringify(data),
        ack: true
      });

      // Update average
      await this.updateWeightedAverage(data[key]);

      // Invalidate cache after successful update
      consumptionDataCache = {
        data: null,  // Clear cache
        lastUpdate: 0 // Reset timestamp
      };


    } catch (error) {
      this.log.error(`updateConsumptionData failed: ${error.stack}`);
    }
  }

  //=================> Historical averages
  async updateLearningStats() {
    try {
      const data = await this.getConsumptionData();

      // 1. Collect ALL consumption data (global + per room)
      const allSamples = Object.values(data).flatMap(entries =>
        entries.map(entry => entry.value)
      );

      // 2. Calculate statistical key figures
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
        roomsTracked: Object.keys(data).filter(k => k.startsWith('room_')).length
      };

      // 3. Save the statistics
      await this.setStateAsync(`${DH_Did}.state.water.learningStats`, {
        val: JSON.stringify(stats),
        ack: true
      });

    } catch (error) {
      this.log.error(`Failed to update learning stats: ${error.message}`);
    }
  }
  //=================> Tank management
  async handleTankStatusChange(InSetvalue) {
    if (InSetvalue == 0 && firstStartWaterTrack) { // Tank removed
      await this.setStateAsync(`${DH_Did}.state.water.beforeRemoval`, {
        val: waterTracking.currentMl,
        ack: true
      });
      await this.setStateAsync(`${DH_Did}.state.water.lastRemovalTime`, {
        val: Date.now(),
        ack: true
      });
      this.log.info(`Water tank removed. Saved level: ${waterTracking.currentMl}ml`);
    }
    else if ((InSetvalue == 2 || InSetvalue == 3) && firstStartWaterTrack) { // Tank inserted
      const beforeRemoval = await this.getStateValue(`${DH_Did}.state.water.beforeRemoval`) || 0;
      const lastRemovalTime = await this.getStateValue(`${DH_Did}.state.water.lastRemovalTime`) || 0;

      const removalDuration = Date.now() - lastRemovalTime;
      const MIN_REMOVAL_TIME = 5000;
      const MAX_REMOVAL_TIME = 3600000;

      if (removalDuration >= MIN_REMOVAL_TIME && removalDuration <= MAX_REMOVAL_TIME) {
        const refillRatio = await this.calculateSmartRefillRatio(beforeRemoval, lastRemovalTime);
        waterTracking.currentMl = Math.min(
          WATER_TRACKING.MAX_ML,
          beforeRemoval + (WATER_TRACKING.MAX_ML - beforeRemoval) * refillRatio
        );

        await this.updateWaterLevelState();
        this.log.info(`Tank refilled: ${waterTracking.currentMl}ml (${Math.round(refillRatio * 100)}%)`);
      }
    }
  }

  //=================> Helper function for the water consumption
  async calculateConsumptionAccuracy(estimatedMl, actualMl, areaM2) {
    if (actualMl <= 0 || areaM2 < 0.1 || estimatedMl <= 0) return 0.3;

    const actualRate = actualMl / areaM2;
    const expectedRate = estimatedMl / areaM2;
    const rateDeviation = Math.abs(actualRate - expectedRate) / expectedRate;
    const absErrorNorm = Math.abs(actualMl - estimatedMl) / WATER_TRACKING.MAX_ML;

    const accuracy = 1 - Math.min(0.7, (rateDeviation * 0.6 + absErrorNorm * 0.4));
    return Math.max(0.3, Math.min(1.0, accuracy));
  }

  async updateWeightedAverage(entries) {
    if (!entries?.length) return;

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
    const weightedAvg = weightedValues.reduce((sum, e) =>
      sum + (e.value * e.weight), 0) / totalWeight;

    if (entries.length >= 5) {
      const prevValue = await this.getStateValue(`${DH_Did}.state.water.currentMlPerSqm`)
      || WATER_TRACKING.DEFAULT_ML_PER_SQM;
      const learningRate = Math.min(0.9, 0.3 + (0.6 * (entries.length / WATER_TRACKING.LEARNING_SAMPLES)));
      const smoothedValue = (weightedAvg * learningRate) + (prevValue * (1 - learningRate));

      await this.setStateAsync(`${DH_Did}.state.water.currentMlPerSqm`, {
        val: Math.round(smoothedValue * 10) / 10,
        ack: true
      });
    }
  }

  async calculateConsumptionStats(entries) {
    const values = entries.map(e => e.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    const median = values.sort((a,b) => a-b)[Math.floor(values.length/2)];
    const mad = values.reduce((s, v) => s + Math.abs(v - median), 0) / values.length;

    return {
      mean, stdDev, median, mad,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  async calculateSmartRefillRatio(beforeRemoval, lastRemovalTime) {
    const removalDuration = (Date.now() - lastRemovalTime) / 1000;

    if (beforeRemoval < WATER_TRACKING.MAX_ML * 0.1) return 1.0;
    if (removalDuration < 30) return 0.0;
    if (removalDuration < 60) return 0.8;

    return 1.0;
  }

  async updateWaterLevelState() {
    const percent = Math.round((waterTracking.currentMl / WATER_TRACKING.MAX_ML) * 100);
    await this.setStateAsync(`${DH_Did}.state.water.PureWaterTank`, {
      val: percent,
      ack: true
    });

    await this.setStateAsync(`${DH_Did}.state.water.current`, {
      val: waterTracking.currentMl,
      ack: true
    });
  }

  async getWaterConsumptionRate() {
    const rate = await this.getStateValue(`${DH_Did}.state.water.currentMlPerSqm`);
    return rate ?? WATER_TRACKING.DEFAULT_ML_PER_SQM;
  }

  async getConsumptionData() {
    const now = Date.now();

    // Use cache if available and valid
    if (consumptionDataCache.data &&
        now - consumptionDataCache.lastUpdate < consumptionDataCache.cacheTTL) {
      return consumptionDataCache.data;
    }

    try {
      // Only query state if cache is invalid
      const state = await this.getStateAsync(`${DH_Did}.state.water.consumptionData`);
      let data = {};

      // Only parse data if available
      if (state?.val) {
        try {
          data = JSON.parse(state.val);

          // Data cleaning
          data = Object.entries(data).reduce((acc, [key, entries]) => {
            if (Array.isArray(entries)) {
              const filtered = entries.filter(entry =>
                entry?.value > 0 && entry.value < 200
              );
              if (filtered.length) acc[key] = filtered.slice(-WATER_TRACKING.LEARNING_SAMPLES);
            }
            return acc;
          }, {});

        } catch (e) {
          this.log.warn('Consumption data parse error - using empty set');
        }
      }

      // Refresh cache
      consumptionDataCache = {
        data: data,
        lastUpdate: now
      };

      return data;

    } catch (e) {
      this.log.error(`Failed to get consumption data: ${e.message}`);
      return consumptionDataCache.data || {}; // Fallback to cache or empty object
    }
  }

  async saveWaterData() {
    try {
    // Save roomData (Room-specific consumption)
      await this.setStateAsync(`${DH_Did}.state.water.roomConsumption`, {
        val: JSON.stringify(waterTracking.roomData),
        ack: true
      });

      // Save consumptionData (Learning algorithm values)
      const consumptionData = await this.getConsumptionData();
      if (Object.keys(consumptionData).length > 0) {
        await this.setStateAsync(`${DH_Did}.state.water.consumptionData`, {
          val: JSON.stringify(consumptionData),
          ack: true
        });
      }

      this.log.debug('All water tracking data saved');
    } catch (e) {
      this.log.error('Error saving data: ' + e.message);
    }
  }

  //=================> Cleaning Lifecycle
  async handleCleaningStart() {
    waterTracking.initialMl = await this.getCurrentWater();
    waterTracking.roomData = {}; // Reset room-specific data
    isCleaningActive = true;
    waterTracking.lastRoom = null;
    await this.startAutoSave();
    this.log.info('Water tracking initialized for new cleaning job');
  }

  async handleCleaningComplete() {
    isCleaningActive = false;
    this.stopAutoSave();
    try {
      if (!waterTracking?.isMopping || !waterTracking.roomData) return;

      // Calculate total consumption from room data
      const totalConsumed = await this.calculateTotalConsumption();
      const totalArea = await this.getTotalCleanedArea();

      if (totalArea > 1 && totalConsumed > 1) {
        await this.updateWaterConsumptionStats(totalConsumed, totalArea);
      }

      await this.updateLearningStats(); // Generate new statistics
      waterTracking.roomData = {}; // Reset tracking for next job

    } catch (error) {
      this.log.error(`Cleaning completion handler failed: ${error.message}`);
    }
  }

  async calculateTotalConsumption() {
    const total = Object.values(waterTracking.roomData)
      .reduce((sum, room) => sum + room.consumedMl, 0);
    return Math.round(total * 1000) / 1000; // Round to 3 decimal places
  }

  async getTotalCleanedArea() {
    if (!waterTracking.roomData) return 0;

    const totalArea = Object.values(waterTracking.roomData)
      .reduce((sum, room) => sum + (room.maxCleanedArea || 0), 0);

    return Math.round(totalArea * 100) / 100;
  }

  async updateWaterConsumptionStats(totalConsumed, totalArea) {
    if (totalArea <= 0 || totalConsumed <= 0) {
      this.log.warn(`Invalid consumption data: Area=${totalArea}m², Consumed=${totalConsumed}ml`);
      return;
    }

    const actualMlPerSqm = totalConsumed / totalArea;
    await this.updateConsumptionData(actualMlPerSqm);

    const litersConsumed = (totalConsumed / 1000).toFixed(2);
    this.log.info(`Cleaning completed: ${totalArea.toFixed(2)}m², ${litersConsumed}L, ${actualMlPerSqm.toFixed(2)}ml/m²`);
  }

  //=================> AutoSave Management
  async startAutoSave() {
    await this.stopAutoSave(); // Stop to be on the safe side
    autoSaveInterval = setInterval(() => {
      if (isCleaningActive) {
        this.saveWaterData().catch(e =>
          this.log.error('Autosave failed: ' + e.message)
        );
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  async stopAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
  }

  //=================> Initialization Check
  async checkInitialCleaningStatus() {
    try {
      await this.restorePersistedData();
      await this.startAutoSave();
      this.log.info('Active cleaning session detected - restored water tracking data');
    } catch (e) {
      this.log.error('Initial status check failed: ' + e.message);
    }
    firstWaterTrackingActive = true;
  }

  //=================> Tank Data Restoration
  async restoreWaterTankData() {
    try {
    // 1. Restoration of water levels from persisted states
      const beforeRemoval = await this.getStateValue(`${DH_Did}.state.water.beforeRemoval`) || 0;
      const tankPercent = await this.getStateValue(`${DH_Did}.state.water.PureWaterTank`);
      const currentMl = await this.getStateValue(`${DH_Did}.state.water.current`);

      // Priority order for restoration:
      // 1. Current ml value if available
      // 2. Before removal value if available
      // 3. Calculated from percentage if available
      // 4. Default to MAX_ML
      waterTracking.currentMl = currentMl !== null ? currentMl :
        beforeRemoval > 0 ? beforeRemoval :
          tankPercent !== null ? (tankPercent / 100) * WATER_TRACKING.MAX_ML :
            WATER_TRACKING.MAX_ML;

      // 2. Restoration of learning data
      const consumptionData = await this.getStateValue(`${DH_Did}.state.water.consumptionData`);
      if (consumptionData) {
        try {
          const parsedData = JSON.parse(consumptionData);
          // Validate and clean the restored data
          Object.keys(parsedData).forEach(key => {
            if (!Array.isArray(parsedData[key])) {
              delete parsedData[key];
            } else {
              parsedData[key] = parsedData[key].filter(entry =>
                entry && typeof entry.value === 'number' && entry.value > 0 && entry.value < 200
              );
            }
          });
          await this.setStateAsync(`${DH_Did}.state.water.consumptionData`, {
            val: JSON.stringify(parsedData),
            ack: true
          });
        } catch (e) {
          this.log.warn('Failed to parse persisted consumption data: ' + e.message);
        }
      }

      // 3. Update the water level display
      await this.updateWaterLevelState();

      this.log.info(`Restored water level: ${waterTracking.currentMl}ml` +
      (beforeRemoval > 0 ? ` (from beforeRemoval: ${beforeRemoval}ml)` :
        tankPercent !== null ? ` (from tankPercent: ${tankPercent}%)` :
          currentMl !== null ? ` (from currentMl: ${currentMl}ml)` :
            ' (using default)'));

    } catch (e) {
      this.log.error('Water tank data restoration failed - resetting to default: ' + e.message);
      waterTracking.currentMl = WATER_TRACKING.MAX_ML;
      await this.updateWaterLevelState();
    }
  }

  async restorePersistedData() {
    if (!isCleaningActive) return;
    try {
    // 1. Restore water tank data first
      await this.restoreWaterTankData();

      // 2. Restore room consumption data
      const roomData = await this.getStateValue(`${DH_Did}.state.water.roomConsumption`);
      if (roomData) {
        waterTracking.roomData = JSON.parse(roomData);

        // Validate room data structure
        Object.keys(waterTracking.roomData).forEach(room => {
          if (!waterTracking.roomData[room].consumedMl) {
            waterTracking.roomData[room].consumedMl = 0;
          }
          if (!waterTracking.roomData[room].maxCleanedArea) {
            waterTracking.roomData[room].maxCleanedArea =
            waterTracking.roomData[room].lastRecordedArea || 0;
          }
        });

        this.log.info(`Restored room data for ${Object.keys(waterTracking.roomData).length} rooms`);

        // Set the last active room (if available)
        if (waterTracking.roomData) {
          const rooms = Object.keys(waterTracking.roomData);
          waterTracking.lastRoom = rooms[rooms.length - 1];
        }
      }

    } catch (e) {
      this.log.warn('Persisted data restoration failed - starting fresh: ' + e.message);
      waterTracking.roomData = {};
      waterTracking.currentMl = WATER_TRACKING.MAX_ML;
      await this.updateWaterLevelState();
    }
  }

  //=================> Helper Functions
  async getCurrentWater() {
    const current = await this.getStateValue(`${DH_Did}.state.water.current`);
    return current ?? WATER_TRACKING.MAX_ML;
  }

  // Helper function to safely get state values
  async getStateValue(stateId) {
    try {
      const state = await this.getStateAsync(stateId);
      return state?.val;
    } catch (error) {
      this.log.error(`Failed to get state ${stateId}: ${error.message}`);
      return null;
    }
  }

  async setcleansetPath(createpath, CsetS) {
    //let jsonString = `{${Object.entries(CsetS).map(([key, value]) => `"${key}":"${value}"`).join(', ')}}`;
    await this.extendObject(createpath, {
      type: 'state',
      common: {
        name: createpath,
        type: 'number',
        role: 'level',
        states: CsetS,
        write: true,
        read: true,
      },
      native: {},
    });
  }

  async DH_getType(element, createpath, SetSPiid = '', SetExtendVal = '') {
    if ((element == 'undefined') || (element == null)) {element = '';}
    try {
      element = JSON.parse(element);
    } catch (StGer) {
		    if (LogData) {
        this.log.info('Test DH_getType value: ' + element + ' return ' + StGer);
		    }
    }
    const setrolT = ['string', 'text'];
    const Typeof = Object.prototype.toString.call(element).match(/\s([\w]+)/)[1].toLowerCase();
    switch (Typeof) { //number, string, boolean, array, object, mixed, json
      case 'object':
        setrolT[0] = 'object';
        setrolT[1] = 'json';
        break;
      case 'array':
        setrolT[0] = 'json';
        setrolT[1] = 'array';
        break;
      case 'boolean':
        setrolT[0] = 'boolean';
        setrolT[1] = 'switch';
        break;
      case 'number':
        setrolT[0] = 'number';
        setrolT[1] = 'value';
        break;
      case 'undefined':
        setrolT[0] = 'string';
        setrolT[1] = 'text';
        break;
      case 'json':
        setrolT[0] = 'json';
        setrolT[1] = 'json';
        break;
    }

    let Stwrite = false, Stname = '', Stunit = '', Stnative = {}, Sstates = {}, Stsiid = '', Stpiid = '';
    Stname = createpath.split(/[\s.]/).pop().replace(/(?<!^)([A-Z])/g, ' $1');

    let Delimiter = 'P';
    if (SetSPiid != ''){
      if (SetSPiid.indexOf('A') !== -1) {
        Delimiter = 'A';
        Stwrite = true;
      }
      if (SetSPiid.indexOf('C') !== -1) {
        Delimiter = 'C';
        Stwrite = true;
      }
      if (SetSPiid.indexOf('E') !== -1) {
        Delimiter = 'E';
        Stwrite = true;
      }
      if (Delimiter == 'C') {
        Stsiid = (SetSPiid.split('S')[1] || '').split('A')[0];
        if ((SetSPiid.indexOf('P') !== -1) && (SetSPiid.indexOf('C') !== -1)) {
          Stsiid = (SetSPiid.split('S')[1] || '').split('P')[0];
        }
      } else if (Delimiter == 'E') {
        Stsiid = (SetSPiid.split('S')[1] || '').split('P')[0];
      } else {
        Stsiid = (SetSPiid.split('S')[1] || '').split(Delimiter)[0];
      }
      Stpiid = SetSPiid.replace('S' + Stsiid + Delimiter, '');
      if (Delimiter == 'A') {
        Stnative = {siid: Stsiid, aiid: Stpiid, did: DH_Did, model: DH_Model};
      } else if (Delimiter == 'P') {
        Stnative = {siid: Stsiid, piid: Stpiid, did: DH_Did, model: DH_Model};
      } else if (Delimiter == 'C') {
        if ((SetSPiid.indexOf('P') !== -1) && (SetSPiid.indexOf('C') !== -1)) {
          Stpiid = (SetSPiid.split('P')[1] || '').split('C')[0];
	   Stnative = {siid: Stsiid, Piid: Stpiid, did: DH_Did, model: DH_Model};
        } else {
	   Stpiid = (SetSPiid.split('A')[1] || '').split('C')[0];
	   Stnative = {siid: Stsiid, aiid: Stpiid, did: DH_Did, model: DH_Model};
        }
      } else if (Delimiter == 'E') {
        Stpiid = (SetSPiid.split('P')[1] || '').split('E')[0];
        Stnative = {siid: Stsiid, piid: Stpiid, value: SetExtendVal, did: DH_Did, model: DH_Model};
        setrolT[0] = 'number';
        setrolT[1] = 'level';
        if (SetSPiid !== 'S7P1E1') {
	   Sstates = element;
        } else {
          setrolT[1] = 'value';
        }
      }
    }

    if (createpath.match(/left|batterylevel|CleaningCompleted|CameraBrightness$/gi) || (createpath.split(/[\s.]/).pop() == 'Volume')){
      Stunit = '%';
    }

    if (createpath.match(/timeleft|time$/gi)){
      Stunit = 'hours';
    }
    if (createpath.match(/CleaningTime$/gi)){
      Stunit = 'minutes';
    }
    if (createpath.match(/area$/gi)){
      Stunit = 'm²';
    }

    const ExtendObjectProp = {
      type: 'state',
      common: {
        name: Stname,
        type: setrolT[0].toString(),
        role: setrolT[1].toString(),
        unit: Stunit,
        write: Stwrite,
        read: true,
      },
      native: Stnative,
    };
    if (Delimiter == 'E') {
      if (SetSPiid == 'S7P1E1') {
        ExtendObjectProp['common']['min'] = 0;
        ExtendObjectProp['common']['max'] = 100;
      } else {
        ExtendObjectProp['common']['states'] = Sstates;
      }
    }
    await this.extendObject(createpath, ExtendObjectProp);
    if (LogData) {
      this.log.info('common Type is: ' + setrolT + ' | common Role is: ' + setrolT[1] + ' | ' + Typeof + ' is: ' + element);
    }
  }

  async DH_setState(VarPath, VarPointValue, VarBool) {
    if ((VarPointValue == 'undefined') || (VarPointValue == null)) {VarPointValue = '';}
    try {
      VarPointValue = JSON.parse(VarPointValue);
    } catch (StSer) {
		    if (LogData) {
        this.log.info('Test DH_setState value: ' + VarPointValue + ' return ' + StSer);
		    }
    }

    const Typeof = Object.prototype.toString.call(VarPointValue).match(/\s([\w]+)/)[1].toLowerCase();
    switch (Typeof) { //number, string, boolean, array, object, mixed, json
      case 'object':
        VarPointValue = JSON.stringify(VarPointValue);
        break;
      case 'array':
        VarPointValue = JSON.stringify(VarPointValue);
        break;
      case 'boolean':
        VarPointValue = JSON.parse(VarPointValue);
        break;
      case 'number':
        if (VarPointValue === 'Infinity' || VarPointValue === Infinity) {
          VarPointValue = 0;
        } else {
          VarPointValue = JSON.parse(VarPointValue);
        }
        break;
      case 'undefined':
        //VarPointValue = VarPointValue;
        break;
      case 'json':
        VarPointValue = JSON.stringify(VarPointValue);
        break;
    }

    if (LogData) {
      this.log.info('Send action | to set Path is:' + VarPath + ' | to set Data is: ' + VarPointValue);
    }
    await this.setState(VarPath, VarPointValue, VarBool);
  }

  async jsonFromString(str) {
    const matches = str.match(/[{\[]{1}([,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis);
    return Object.assign({}, ...matches.map((m) => m)); //JSON.parse(m)));
  }

  async DH_GetSetRoomCleanSettings() {
    const PromDreameCleanset = await this.getStateAsync(DH_Did + '.mqtt.cleanset');
    const ArrDreameCleanset = (PromDreameCleanset !== null && typeof PromDreameCleanset === 'object') ? JSON.parse(PromDreameCleanset.val) : 'undefined';

    if (ArrDreameCleanset !== 'undefined') {
      if (LogData) {
        this.log.info('ArrDreameCleanset ' +  JSON.stringify(ArrDreameCleanset));
        this.log.info('CheckArrayRooms ' +  JSON.stringify(CheckArrayRooms));
      }

      for (const r in ArrDreameCleanset) {
        //1: DreameLevel, 2: DreameSetWaterVolume, 3: DreameRepeat, 4: DreameRoomNumber, 5: DreameCleaningMode, 6: Route
        for (const iCHroomID in CheckArrayRooms) {
	   if (CheckArrayRooms[iCHroomID].Id == r) {
            this.log.info('Get ' + CheckArrayRooms[iCHroomID].Name + ' Settings = ' +
	       ' Number: ' + r +
	       ' Repeat: ' + ArrDreameCleanset[r][2] +
	       ' Level: ' +  ArrDreameCleanset[r][0] +
						' Water: ' +  ArrDreameCleanset[r][1] +
	       ' Order: ' + ArrDreameCleanset[r][3] +
	       ' Mode: ' +  ArrDreameCleanset[r][4] +
	       ' Route: ' +  ArrDreameCleanset[r][5]
            );
		   await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.SuctionLevel', ArrDreameCleanset[r][0]);
            await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.WaterVolume', ArrDreameCleanset[r][1]);
            await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.Repeat', ArrDreameCleanset[r][2]);
            await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.CleaningMode', ArrDreameCleanset[r][4]);
            await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.CleaningRoute', ArrDreameCleanset[r][5]);
            await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.Cleaning', 2);
            await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.CarpetRepetition', ArrDreameCleanset[r][2]);
            await this.DH_GSRCS(DH_Did + '.map.' + DH_CurMap + '.' + CheckArrayRooms[iCHroomID].Name + '.CarpetSuctionLevel', ArrDreameCleanset[r][0]);
		   break;
	   }
        }
      }
    }
  }

  async DH_GSRCS(GSRCSObj, GSRCSVal) {
    if ((GSRCSObj.split(/[\s.]/).pop() == 'CarpetRepetition') || (GSRCSObj.split(/[\s.]/).pop() == 'CarpetSuctionLevel')) {
      const TmpObstates = await this.getStatesAsync(GSRCSObj + '*');
      if (TmpObstates) {
        for (const iObN in TmpObstates) {
          this.log.info('The carpet name ' + iObN.split(/[\s.]/).pop() + ' has been found, setting the ' + GSRCSObj.split(/[\s.]/).pop().replace('Carpet', '') + ' status to ' + GSRCSVal );
          await this.DH_GSRCS(iObN, GSRCSVal);
        }
      }
      return;
    }
    const iGSRCSObj = await this.getStateAsync(GSRCSObj);
    const iGSRCSVal = (iGSRCSObj !== null) ? iGSRCSObj.val : 'undefined';
    if ((iGSRCSVal == 'undefined') || (iGSRCSVal == '-1')) {
      if (LogData) {
        this.log.info('Set ' + GSRCSObj + ' to ' + GSRCSVal);
		    }
      await this.setState(GSRCSObj, GSRCSVal, true);
    }
  }

  async DH_CleanZonePoint(ClPZType, ClPZones, ClPZRepeat, ClPZSucLevel, ClPZWatVol) {
    if (!(typeof ClPZRepeat === 'number' && ClPZRepeat > -1)) {  return false; }
    if (!(typeof ClPZSucLevel === 'number' && ClPZSucLevel > -1)) {  return false; }
    if (!(typeof ClPZWatVol === 'number' && ClPZWatVol > -1)) {  return false; }
    const SetClPZType = (ClPZType === 1) ? 'areas' : 'points';
    const ClPZRet = {};
    const ClPZAction = [];
    for (const ClPZone of ClPZones) {
      if ((!Array.isArray(ClPZone) || ClPZone.length !== 4) && (SetClPZType == 'areas')) {
        this.log.warn('Invalid zone coordinates: ' + ClPZone);
        return false;

      }
      if ((!Array.isArray(ClPZone) || ClPZone.length !== 2) && (SetClPZType == 'points')) {
        this.log.warn('Invalid points coordinates: ' + ClPZone);
        return false;

      }
      if (SetClPZType == 'areas') {
        const X_Cor = [ClPZone[0], ClPZone[2]].sort((a, b) => a - b);
        const Y_Cor = [ClPZone[1], ClPZone[3]].sort((a, b) => a - b);
        const W_Cor = (X_Cor[1] - X_Cor[0]);
        const H_Cor = (Y_Cor[1] - Y_Cor[0]);
        if (LogData) {
          this.log.info('Send Clean-Zone action | X ' + X_Cor + ' Y ' + Y_Cor + ' W ' + W_Cor + ' H ' + H_Cor + ' Repeat ' + ClPZRepeat + ' SuctionLevel ' + ClPZSucLevel + ' WaterVolume ' + ClPZWatVol);
        }
        ClPZAction.push([
          Math.round(ClPZone[0]),
          Math.round(ClPZone[1]),
          Math.round(ClPZone[2]),
          Math.round(ClPZone[3]),
          Math.max(1, ClPZRepeat),
          ClPZSucLevel,
          ClPZWatVol,
        ]);
      } else if (SetClPZType == 'points') {
        if (LogData) {
          this.log.info('Send Clean-Points action | X ' + ClPZone[0] + ' Y ' + ClPZone[1] + ' Repeat ' + ClPZRepeat + ' SuctionLevel ' + ClPZSucLevel + ' WaterVolume ' + ClPZWatVol);
        }
        ClPZAction.push([
          Math.round(ClPZone[0]),
          Math.round(ClPZone[1]),
          Math.max(1, ClPZRepeat),
          ClPZSucLevel,
          ClPZWatVol,
        ]);
      }

    }
    ClPZRet[SetClPZType] = ClPZAction;
    return JSON.stringify(ClPZRet);
  }

  async DH_SendActionCleanCarpet(CarpetAction, SPvalue) {
    const requestId = Math.floor(Math.random() * 9000) + 1000;
    const AiidAction = [{
      'piid': 1,
      'value': 19
    }, {
      'piid': 10,
      'value': CarpetAction
    }];
    const SETURLData = {
      did: DH_Did,
      id: requestId,
      data: {
        did: DH_Did,
        id: requestId,
        method: 'action',
        params: {
          did: DH_Did,
          siid: 4,
          aiid: 1,
          in: AiidAction
        },
      },

    };
    try {
      await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, SETURLData);
    } catch (err) {
      this.log.warn('Setting "' + SPvalue + '" State failed: ' + err);
    }

  }

  async DH_refreshToken() {
    await this.DH_requestClient({
      method: 'post',
      maxBodyLength: Infinity,
      url: DH_URLTK,
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': 'en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': DH_URLUSA,
        'Dreame-Rlc': DH_URLDRLC,
        'Authorization': DH_URLAUTH,
        'Tenant-Id': DH_Tenant,
      },
      data: {
        grant_type: 'password',
        scope: 'all',
        platform: 'IOS',
        type: 'account',
        username: this.config.username,
        password: crypto.createHash('md5').update(this.config.password + 'RAylYC%fmSKp7%Tq').digest('hex'),
      },
    }).then(async (response) => {
      const responseData = response.data;
      if (LogData) {
        this.log.info('Refresh Token response: ' + JSON.stringify(response.data));
      }
      const RetObject = JSON.parse(JSON.stringify(responseData));

      await this.DH_PropObject(RetObject, 'login.', 'Refresh Token: ');

      DH_Auth = responseData['access_token'];
      DH_AuthRef = responseData['refresh_token'];
      DH_Expires = responseData['expires_in'];
      DH_Tenant = responseData['tenant_id'];
      DH_Country = responseData['country'];
      DH_Uid = responseData['uid'];
      DH_Lang = responseData['lang'];
      DH_Region = responseData['region'];
      DH_Islogged = true;
      this.DH_connectMqtt();
      this.setState('info.connection', true, true);
    }).catch((error) => {
      this.log.warn('Refresh Token error: ' + JSON.stringify(error));
      error.response && this.log.error('Refresh Token error response: ' + JSON.stringify(error.response.data));
      this.setState('info.connection', false, true);
    });
  }

  async DH_AlexasuctionLevel(language, levelName) {
    // Normalize the level name using synonyms
    const normalizedLevel = suctionSynonyms[language]?.[levelName.toLowerCase()] || levelName;
    //this.log.info(`Normalized Suction Level: ${normalizedLevel}`);

    // Iterate through all possible suction levels (DreameSuctionLevel) and find the corresponding value
    for (const [number, name] of Object.entries(DreameSuctionLevel[language])) {
      // Compare the names (case-insensitive)
      if (name.toLowerCase() === normalizedLevel.toLowerCase()) {
        //this.log.info(`Suction Level Match found: ${name} -> ${number}`);
        return parseInt(number, 10); // Return the numeric value as a number
      }
    }
    //this.log.info(`No match found for ${normalizedLevel}`);
    return -1; // Return -1 if no matching level is found
  }

  async DH_AlexamoppingLevel(language, levelName) {
    // Normalize the level name using synonyms
    const normalizedLevel = moppingSynonyms[language]?.[levelName.toLowerCase()] || levelName;
    //this.log.info(`Normalized mopping Level: ${normalizedLevel}`);

    // Iterate through all possible mopping levels (DreameWaterVolume) and find the corresponding value
    for (const [number, name] of Object.entries(DreameWaterVolume[language])) {
      // Compare the names (case-insensitive)
      if (name.toLowerCase() === normalizedLevel.toLowerCase()) {
        this.log.info(`Mopping Level Match found: ${name} -> ${number}`); // Debugging-Log
        //return parseInt(number, 10);  // Return the numeric value as a number
      }
    }
    //this.log.info(`No match found for ${normalizedLevel}`);
    return -1; // Return -1 if no matching level is found
  }

  // Process the command by splitting it into words and checking each word for synonyms
  async normalizeAlexaRoomsNameSynonyms(synonyms) {
    const normalizedRooms = {};
    Object.keys(synonyms).forEach(language => {
      normalizedRooms[language] = {};
      Object.keys(synonyms[language]).forEach(synonym => {
        const normalizedRoomName = synonyms[language][synonym].toLowerCase();
        normalizedRooms[language][synonym.toLowerCase()] = normalizedRoomName;
      });
    });
    return normalizedRooms;
  }

  async processCommand(command, language) {
    // Normalize synonyms for room names
    const normalizedSynonyms = await this.normalizeAlexaRoomsNameSynonyms(AlexaRoomsNameSynonyms);

    let roomCommands = ''; // Store the final processed command
    let currentCommand = ''; // Temporary variable to store the current command being processed
    const words = command.split(' '); // Split the input command into words

    // Define the separator word ("und" for German, "and" for English)
    const separator = language === 'DE' ? 'und' : 'and';

    // Iterate over each word in the command
    for (let i = 0; i < words.length; i++) {
      let word = words[i].toLowerCase(); // Convert to lowercase

      // Check if the word has a synonym for a room name (considering the normalized synonyms)
      let isRoomName = false;

      // Check if the word is a synonym, and if so, use the normalized synonym
      if (normalizedSynonyms[language] && normalizedSynonyms[language][word]) {
        word = normalizedSynonyms[language][word].toLowerCase(); // Replace with normalized synonym
        words[i] = normalizedSynonyms[language][word]; // Replace with normalized synonym
        isRoomName = Alexarooms.some(room => room.RM.toLowerCase() === word); // Check if the synonym matches a room
      } else {
        // If no synonym, check if it's a direct room name
        isRoomName = Alexarooms.some(room => room.RM.toLowerCase() === word);
      }

      // Check if the word is "und" or "and" and it's followed by a room name
      if ((words[i].toLowerCase() === 'und' && isRoomName) || (words[i].toLowerCase() === 'and' && isRoomName)) {
        // If there's an existing command, add it to the final result
        if (currentCommand) {
          roomCommands += currentCommand.trim(); // Trim spaces and add the current command
        }
        // Start a new command with the "und" or "and" as the separator
        currentCommand = words[i]; // This will begin a new segment of the command
      } else {
        // If the word is a room name, add the separator ('und' or 'and') if it's not the first part of the command
        if (isRoomName && currentCommand) {
          currentCommand += ' ' + separator; // Add 'und' or 'and' between commands
        }
        // Add the word to the current command, except for "und" or "and"
        currentCommand += (words[i].toLowerCase() === 'und' || words[i].toLowerCase() === 'and' ? '' : ' ' + words[i]);
      }
    }

    // Add the last command segment if it exists
    if (currentCommand.trim()) {
      roomCommands += currentCommand.trim();
    }

    return roomCommands; // Return the final processed command
  }

  async determineCleaningSettings(cleanMode, suctionVal, moppingVal) {
    let suctionLevel = -1,
      moppingLevel = -1,
      alexaUserSettings = 0;

    switch (cleanMode) {
      case 1: // Custom room cleaning
      case 5120: // Sweeping and mopping
        suctionLevel = await this.DH_AlexasuctionLevel(UserLang, suctionVal);
        moppingLevel = await this.DH_AlexamoppingLevel(UserLang, moppingVal);
        alexaUserSettings = 3;
        break;
      case 5121: // Mopping
        moppingLevel = await this.DH_AlexamoppingLevel(UserLang, moppingVal);
        alexaUserSettings = 2;
        break;
      case 5122: // Sweeping
        suctionLevel = await this.DH_AlexasuctionLevel(UserLang, suctionVal);
        alexaUserSettings = 1;
        break;
      case 5123: // Mopping after sweeping
        suctionLevel = await this.DH_AlexasuctionLevel(UserLang, suctionVal);
        moppingLevel = await this.DH_AlexamoppingLevel(UserLang, moppingVal);
        alexaUserSettings = 3;
        break;
    }
    this.log.info(`Parsed values => Suction: ${suctionVal}, Mopping: ${moppingVal}, Mode: ${cleanMode}`);
    this.log.info(`Resolved levels => suctionLevel: ${suctionLevel}, moppingLevel: ${moppingLevel}, alexaUserSettings: ${alexaUserSettings}`);

    return {
      suctionLevel,
      moppingLevel,
      alexaUserSettings
    };
  };

  async applyCleaningSettings(alexaUserSettings, suctionLevel, moppingLevel, SpeakMode) {
    if (alexaUserSettings === 1 || alexaUserSettings === 3) {
      await this.wait(waitingvalue);
      await this.setStateAsync(DH_Did + '.control.SuctionLevel', suctionLevel, false);
      this.log.info('Change Suction Level to ' + suctionLevel);
    }
    if (alexaUserSettings === 2 || alexaUserSettings === 3) {
      await this.wait(waitingvalue);
      await this.setStateAsync(DH_Did + '.control.WaterVolume', moppingLevel, false);
      this.log.info('Change Water Volume to ' + moppingLevel);
    }
    this.log.info(`applyCleaningSettings => Settings: ${alexaUserSettings}, suction: ${suctionLevel}, mopping: ${moppingLevel}`);

  };

  async setCleaningModeWithRetry(robot, roomAction, AlexaID, maxRetries = 5, delay = 500, SpeakMode) {
    let attempt = 0;
    let success = false;
    let lastValidMode = null;

    while (attempt < maxRetries && !success) {
      attempt++;
      this.log.info(AlexaInfo[UserLang][12](attempt, roomAction.cleaningModes));

      // Set cleaning mode
      await this.setStateAsync(`${robot}.control.CleaningMode`, roomAction.cleaningModes);
      await this.wait(delay); // Wait a moment before checking the status

      // Get status and check if setting was successful
      const currentMode = await this.getStateAsync(`${robot}.state.CleaningMode`);

      if (currentMode) {
        this.log.info(`Current CleaningMode: ${currentMode.val}`);
      }

      // Convert the expected mode to its string representation
      const expectedModeStr = AlexacleanModes[UserLang][roomAction.cleaningModes];

      if (currentMode && currentMode.val === expectedModeStr) {
        this.log.info(AlexaInfo[UserLang][15](expectedModeStr));
        success = true;
      } else {
        this.log.warn(AlexaInfo[UserLang][16](attempt));
        lastValidMode = currentMode.val;
      }
    }

    // If after all attempts the mode is still wrong -> correct and set CleaningMode to the last valid value
    if (!success) {
      this.log.error(AlexaInfo[UserLang][17](roomAction.cleaningModes, maxRetries, lastValidMode));
      await this.speakToAlexa(AlexaInfo[UserLang][17](roomAction.cleaningModes, maxRetries, lastValidMode), AlexaID, SpeakMode, SpeakMode);
      //await this.setStateAsync(`${robot}.control.CleaningMode`, lastValidMode);
    }
  }

  // Checks the cleaning status and waits for completion or an error
  async checkCleaningStatus(robot, roomNumber, roomName, cleaningStatusKey, errorStatusKey, PausedStatusKey, AlexaID, SpeakMode, callback) {
    const checkInterval = 5000; // Check every 5 seconds
    let errorStartTime = null; // Store the time of the first error
    let pausedStartTime = null; // Store the time of the first pause

    const checkStatus = async () => {
      try {
        // If the abort command was received, stop monitoring
        if (isAbortCommandReceived) {
          isMonitorCleaningState = false; // Reset the Monitor for cleaning status
          isAbortCommandReceived = false; // Reset Flag to track if the abort command has been received
          callback(true); // Abort cleaning
          return; // Exit the loop and stop further processing
        }
        // Retrieve the cleaning status
        const cleaningState = await this.getStateAsync(`${cleaningStatusKey}`);
        //this.log.info('Cleaning State:', cleaningState);

        // Retrieve the error status
        const errorState = await this.getStateAsync(`${errorStatusKey}`);

        // Check if the cleaning status exists
        if (!cleaningState || cleaningState.val === undefined) {
          this.log.error(AlexaInfo[UserLang][18]); // Error retrieving cleaning status
          this.speakToAlexa(AlexaInfo[UserLang][18], AlexaID, SpeakMode);
          //throw new Error(`Cleaning state for ${cleaningStatusKey} is null or undefined`);
          return;
        }

        // Check if the cleaning is paused for more than 5 minutes
        const cleaningPaused = await this.getStateAsync(`${PausedStatusKey}`);
        if (cleaningPaused && cleaningPaused.val === 1) {
          if (!pausedStartTime) {
            pausedStartTime = Date.now(); // Store the pause timestamp
          }

          // If the pause lasts more than 5 minutes, cancel cleaning
          if (Date.now() - pausedStartTime > 300000) { // 300,000ms = 5 minutes
            this.log.info(AlexaInfo[UserLang][24](roomNumber)); // Log cleaning pause timeout
            this.speakToAlexa(AlexaInfo[UserLang][24](roomNumber), AlexaID, SpeakMode);
            isMonitorCleaningState = false; // Reset the Monitor for cleaning status
            isAbortCommandReceived = false; // Reset Flag to track if the abort command has been received
            callback(true); // Abort cleaning
            return;
          }
        } else {
          // If the cleaning is no longer paused, reset the timer
          if (pausedStartTime) {
            this.log.info(AlexaInfo[UserLang][23](roomNumber)); // Cleaning resumed
            this.speakToAlexa(AlexaInfo[UserLang][23](roomNumber), AlexaID, SpeakMode);
            pausedStartTime = null; // Reset the timer
          }
        }

        // Check if an error has occurred
        if (errorState && errorState.val !== 0) {
          if (!errorStartTime) {
            errorStartTime = Date.now(); // Store the error timestamp
            this.log.info(AlexaInfo[UserLang][19](roomNumber)); // Log error
            this.speakToAlexa(AlexaInfo[UserLang][19](roomNumber), AlexaID, SpeakMode);
          }

          // If the error persists for more than 5 minutes, cancel cleaning
          if (Date.now() - errorStartTime > 300000) { // 300,000ms = 5 minutes
            this.log.info(AlexaInfo[UserLang][20](roomNumber)); // Log error
            this.speakToAlexa(AlexaInfo[UserLang][20](roomNumber), AlexaID, SpeakMode);
            isMonitorCleaningState = false; // Reset the Monitor for cleaning status
            isAbortCommandReceived = false; // Reset Flag to track if the abort command has been received
            callback(true); // Abort cleaning
            return;
          }
        } else {
          // If the error is resolved, reset the timer
          if (errorStartTime) {
            this.log.info(AlexaInfo[UserLang][21](roomNumber)); // Error fixed
            this.speakToAlexa(AlexaInfo[UserLang][21](roomNumber), AlexaID, SpeakMode);
            errorStartTime = null; // Reset the timer
          }
        }

        // Check if cleaning is complete
        if (cleaningState.val === 100) {
          this.log.info(AlexaInfo[UserLang][22](roomNumber)); // Cleaning completed
          this.speakToAlexa(AlexaInfo[UserLang][22](roomNumber), AlexaID, SpeakMode);
          callback(false); // Success, start next room
        } else {
          // If cleaning is not complete, check again
          setTimeout(checkStatus, checkInterval);
          //this.log.info(`Checking cleaning status => Room: ${roomName} (${roomNumber}) => ${cleaningState.val}`);
        }
      } catch (error) {
        this.log.error(`Error in checkCleaningStatus: ${error}`); // Log error
      }
    };

    checkStatus(); // Start the first check
  }

  // Starts cleaning a room based on `selectedRooms` & `roomActions`
  async startNextRoomCleaning(robot, selectedRooms, roomActions, currentIndex, AlexaID, SpeakMode) {
    // If all rooms have been cleaned, log a message and notify Alexa, then exit
    if (currentIndex >= selectedRooms.length) {
      this.log.info(AlexaInfo[UserLang][11]); // "All rooms cleaned"
      this.speakToAlexa(AlexaInfo[UserLang][11], SpeakMode);
      isMonitorCleaningState = false; // Reset the Monitor for cleaning status
      isAbortCommandReceived = false; // Reset Flag to track if the abort command has been received
      return;
    }

    // Retrieve the current room number and its associated cleaning settings
    const roomNumber = selectedRooms[currentIndex];
    const roomAction = roomActions[roomNumber];

    // Set the "CleanGenius" mode before starting the cleaning
    await this.wait(waitingvalue);
    await this.setStateAsync(`${robot}.control.CleanGenius`, roomAction.cleanGenius);

    // Set the cleaning mode (e.g., Sweeping, mopping, Sweeping and mopping, etc.)
    await this.wait(waitingvalue);
    await this.setCleaningModeWithRetry(robot, roomAction, AlexaID, 5, 600, SpeakMode);

    // Log the current cleaning action and notify Alexa
    const cleaningModeText = AlexacleanModes[UserLang][roomAction.cleaningModes] || roomAction.cleaningModes;
    const message = AlexaInfo[UserLang][13](roomNumber, roomAction.name, cleaningModeText); // Start cleaning the room ${roomNumber} (${roomAction.name}) with mode ${cleaningModeText}
    this.log.info(message);
    this.speakToAlexa(message, AlexaID, SpeakMode);

    // Determine and apply additional cleaning settings (suction level, mopping intensity, etc.)
    await this.wait(waitingvalue);
    const {
      suctionLevel,
      moppingLevel,
      alexaUserSettings
    } = await this.determineCleaningSettings(
      roomAction.cleaningModes,
      roomAction.suction,
      roomAction.mopping
    );

    await this.applyCleaningSettings(alexaUserSettings, suctionLevel, moppingLevel, SpeakMode);

    // Start the cleaning process with custom commands if necessary
    await this.wait(waitingvalue);
    await this.setStateAsync(`${robot}.control.StartCustom`, JSON.stringify(roomAction.customCommand));

    // Monitor the cleaning status to handle errors or completion
    this.checkCleaningStatus(robot, roomNumber, roomAction.name,
      `${robot}.state.CleaningCompleted`, // Status key indicating cleaning completion
      `${robot}.state.Faults`, // Status key for error detection
      `${robot}.state.CleaningPaused`, // Status key for paused state
      AlexaID,
	  SpeakMode,
      (errorOccurred) => {
        if (errorOccurred) {
          // If an error occurs and cleaning cannot continue, log it and notify Alexa
          this.log.info(AlexaInfo[UserLang][14](roomNumber, roomAction.name)); // Cleaning of room ${roomNumber} (${roomAction.name}) was aborted due to an error.
          this.speakToAlexa(AlexaInfo[UserLang][14](roomNumber, roomAction.name), AlexaID, SpeakMode);
        } else {
          // If cleaning was successful, proceed to the next room
          this.startNextRoomCleaning(robot, selectedRooms, roomActions, currentIndex + 1, AlexaID, SpeakMode);
        }
      }
    );
  }

  // Starts the entire cleaning process for all rooms in `selectedRooms`
  async startCleaning(robot, selectedRooms, roomActions, AlexaID, SpeakMode) {
    isMonitorCleaningState = true;
    this.startNextRoomCleaning(robot, selectedRooms, roomActions, 0, AlexaID, SpeakMode);
  }

  // Function to handle Auto-Empty process
  async startAutoEmpty(AlexaID) {
    // Start Auto-Emptying command
    await this.setStateAsync(`${DH_Did}.control.StartAutoEmpty`, true);
    this.log.info('Robot sent for auto-emptying.');
    await this.speakToAlexa(AlexaInfo[UserLang][28], AlexaID); // Notify Alexa

    // Wait for the robot to start returning to dock (or until the robot is docked)
    await this.waitUntilDocked();

    // Wait until Auto-Empty process starts (status changes to "Active")
    let autoEmptyStatus;
    do {
      await this.wait(2000);  // Check every 2 seconds
      autoEmptyStatus = (await this.getStateAsync(`${DH_Did}.state.AutoEmptyStatus`))?.val;
      this.log.info(`Current Auto-Empty Status: ${autoEmptyStatus}`);  // Add logging to monitor status changes
    } while (autoEmptyStatus !== DreameAutoEmptyStatus[UserLang][1]); // Wait for "Active"

    // Wait until Auto-Empty process is completed (status changes to "Idle")
    do {
      await this.wait(2000);  // Check every 2 seconds
      autoEmptyStatus = (await this.getStateAsync(`${DH_Did}.state.AutoEmptyStatus`))?.val;
      this.log.info(`Current Auto-Empty Status: ${autoEmptyStatus}`);  // Add logging to monitor status changes
    } while (autoEmptyStatus === DreameAutoEmptyStatus[UserLang][1]); // Wait until it's not "Active" anymore (i.e., "Idle")

    // Now, once auto-emptying is done, resume cleaning
    this.log.info(AlexaInfo[UserLang][29]); //Auto-emptying completed. Resuming cleaning
    await this.speakToAlexa(AlexaInfo[UserLang][29], AlexaID); // Notify Alexa

    // Safely try to resume cleaning
    await this.tryResumeCleaning(AlexaID);
  }

  async tryResumeCleaning(AlexaID) {
    const statePath = `${DH_Did}.state.State`;
    const pausedPath = `${DH_Did}.state.CleaningPaused`;

    const state = (await this.getStateAsync(statePath))?.val;
    const paused = (await this.getStateAsync(pausedPath))?.val;

    const readableState = DreameStatus[UserLang]?.[state] ?? 'Unbekannt';

    // Only resume cleaning if the robot is paused
    if (state === DreameStatus[UserLang][1] || paused !== 0) {
      this.log.info(AlexaInfo[UserLang][32]);
      await this.setStateAsync(`${DH_Did}.control.Start`, true);
      //await this.speakToAlexa(`${readableState}. ${AlexaInfo[UserLang][32]}.`, AlexaID);
    } else {
      this.log.warn(`Resume aborted: current status is '${readableState}' (${state}).`);
      //await this.speakToAlexa(`${readableState}. ${AlexaInfo[UserLang][33]}.`, AlexaID);
    }
  }

  // Function to handle Auto-Wash process
  async startAutoWash(AlexaID) {
  // Send robot to wash the mop
    await this.setStateAsync(`${DH_Did}.control.StartWashing`, true);
    this.log.info('Robot sent for mop washing.');
    await this.speakToAlexa(AlexaInfo[UserLang][30], AlexaID); // Notify Alexa

    // Wait until the robot is docked
    await this.waitUntilDocked();

    // Wait until washing starts: status is "Washing", "Add clean water" oder "Adding Water"
    const activeWashStatuses = [
      DreameSelfWashBaseStatus[UserLang][1], // "Washing"
      DreameSelfWashBaseStatus[UserLang][5], // "Add clean water"
      DreameSelfWashBaseStatus[UserLang][6]  // "Adding Water"
    ];

    // Wait until washing process starts ("Washing", "Add clean water" oder "Adding Water")
    let washStatus;
    do {
      await this.wait(2000);
      washStatus = (await this.getStateAsync(`${DH_Did}.state.SelfWashBaseStatus`))?.val;
	  this.log.info(`Current Self-Wash-Base Status: ${washStatus}`);  // Add logging to monitor status changes
    } while (!activeWashStatuses.includes(washStatus));

    // Wait until washing process is complete (status is NOT "Washing", "Add clean water" oder "Adding Water" anymore)
    do {
      await this.wait(2000);
      washStatus = (await this.getStateAsync(`${DH_Did}.state.SelfWashBaseStatus`))?.val;
	  this.log.info(`Current Self-Wash-Base Status: ${washStatus}`);  // Add logging to monitor status changes
    } while (activeWashStatuses.includes(washStatus)); // Still "Washing"

    this.log.info(AlexaInfo[UserLang][31], AlexaID); // Mop washing completed. Resuming cleaning
    await this.speakToAlexa(AlexaInfo[UserLang][31], AlexaID); // Notify Alexa

    // Safely try to resume cleaning
    await this.tryResumeCleaning(AlexaID);
  }

  // Function to wait until robot is docked (either during cleaning or after returning)
  async waitUntilDocked() {
    const dockedStates = [
      DreameChargingStatus[UserLang][1], // Charging
      DreameChargingStatus[UserLang][3]  // Charging completed
    ];

    const returnToChargeState = DreameChargingStatus[UserLang][5]; // "Return to charge"
    let chargingStatus = (await this.getStateAsync(`${DH_Did}.state.ChargingStatus`))?.val;

    // If the robot isn't docked yet, wait for it to return and dock
    if (!dockedStates.includes(chargingStatus)) {
      // Wait until robot starts returning to charge
      do {
        await this.wait(2000);
        chargingStatus = (await this.getStateAsync(`${DH_Did}.state.ChargingStatus`))?.val;
      } while (chargingStatus !== returnToChargeState);

      // Wait until robot is actually docked
      do {
        await this.wait(2000);
        chargingStatus = (await this.getStateAsync(`${DH_Did}.state.ChargingStatus`))?.val;
      } while (!dockedStates.includes(chargingStatus));
    }
  }

  async checkSingleComponentStatus(componentKey, AlexaID) {
    const lang = knownAbbreviations[UserLang] ? UserLang : 'EN';
    const units = knownAbbreviations[lang]?.units || { hours: 'h', percent: '%' };

    const comp = components[componentKey];
    if (!comp) return;

    const label = comp.label?.[lang] || componentKey;
    const valueParts = [];

    // Read base value from state (e.g. 100 or 'OK')
    const stateID = `${DH_Did}.state.${componentKey}`;
    const val = (await this.getStateAsync(stateID))?.val;

    if (val !== undefined && val !== null) {
      if (typeof val === 'number') {
        const unit = componentKey.toLowerCase().includes('time') ? units.hours : units.percent;
        valueParts.push(`${val}${unit}`);
      } else {
        valueParts.push(val.toString());
      }

      // Suggest reset if value is 0
      if (val === 0) {
        const resetHint = AlexaInfo[UserLang][41].replace('{component}', label);
        valueParts.push(`(${resetHint})`);
      }
    }

    // Add time left and percent left from sub states if available
    const timeVal = (await this.getStateAsync(`${DH_Did}.state.${componentKey}TimeLeft`))?.val;
    const percentVal = (await this.getStateAsync(`${DH_Did}.state.${componentKey}Left`))?.val;

    if (percentVal !== undefined) valueParts.push(`${percentVal}${units.percent}`);
    if (timeVal !== undefined) valueParts.push(`${timeVal} ${units.hours}`);

    // Build final spoken report
    const report = `${label}: ${valueParts.join(` ${AlexaInfo[UserLang][43]} `)}`.trim();

    this.log.info('[SingleComponentStatus] ' + report);
    await this.speakStatusInParts(report, AlexaID);
    isComponentsSayState = false;
  }

  // Return: Component or null
  async matchComponentBySynonym(input, Lang = 'EN') {
    const synonyms = knownComponentSynonyms[Lang];
    input = input.toLowerCase();

    for (const [key, values] of Object.entries(synonyms)) {
      for (const synonym of values) {
        if (input.includes(synonym.toLowerCase())) {
          return key; // e.g. "MainBrush"
        }
      }
    }

    return null; // no match
  }

  // Function to check robot status and speak it
  async checkRobotStatus(command, AlexaID) {
    const report = AlexaInfo[UserLang][40] + '\n'; // Intro text for the component status report
    const lang = knownAbbreviations[UserLang] ? UserLang : 'EN'; // Fallback to 'EN' if UserLang is invalid
    const units = knownAbbreviations[lang]?.units || { hours: 'h', percent: '%' };

    // Iterate through components
    const tempData = {};

    for (const comp of Object.values(components)) {
      const stateID = `${DH_Did}.state.${comp.id}`; // Create state ID dynamically
      const state = (await this.getStateAsync(stateID))?.val;

      if (state === undefined || state === null) continue; // Skip if no state is found

      const label = comp.label?.[lang] || comp.id || 'Unknown'; // Fallback to 'Unknown' if label is undefined

      const isTime = comp.id.toLowerCase().includes('time');
      if (isTime && state === 0) continue; // Skip Time if state = 0

      let valueText = '';

      if (typeof state === 'number') {
        if (isTime) {
          valueText = `${state} ${units.hours}`;
        } else {
          valueText = `${state}${units.percent}`;
        }

      } else {
        valueText = state.toString();
      }

      // If value is 0, append reset suggestion in parentheses
      if (state === 0) {
        const resetHint = AlexaInfo[UserLang][41].replace('{component}', label);
        valueText += ` (${resetHint})`;
      }

      // Check if the component is part of a group (e.g. MainBrush and MainBrushTimeLeft)
      if (comp.id.endsWith('TimeLeft') || comp.id.endsWith('Left')) {
      // Find the main component name (e.g. MainBrush for MainBrushTimeLeft or MainBrushLeft)
        const mainComp = components[comp.id.replace(/(TimeLeft|Left)$/, '')];

        // Add the value to the main component in tempData
        if (mainComp) {
          const mainLabel = mainComp.label?.[lang] || mainComp.id || 'Unknown';
          if (tempData[mainLabel]) {
            tempData[mainLabel] += ` ${AlexaInfo[UserLang][43]} ${valueText}`;  // Combine time and percent values
          } else {
            tempData[mainLabel] = valueText;
          }
        }
      } else {
      // Add regular components directly
        if (tempData[label]) {
          tempData[label] += ` ${AlexaInfo[UserLang][43]} ${valueText}`;  // Combine time and percent values
        } else {
          tempData[label] = valueText;
        }
      }
    }

    // Create the final report
    let finalReport = '';
    for (const name in tempData) {
      finalReport += `${name}: ${tempData[name]}\n`;
    }

    this.log.info('[RobotStatus Final Report]\n' + finalReport.trim());

    // Speak the report in multiple parts
    await this.speakStatusInParts(finalReport, AlexaID);
    isComponentsSayState = false; // Reset or update the flag after speaking
  }


  // Function to speak the report in parts with waiting time in between
  async speakStatusInParts(report, AlexaID) {
    const parts = report.split('\n'); // Split the report into parts by lines

    // Loop through each part and speak it one by one
    for (const part of parts) {
      if (part.trim()) { // Skip empty lines
        await this.speakToAlexa(part, AlexaID); // Speak the part
        const waitTime = await this.estimateWaitTime(part); // Await the estimated time
        await this.wait(waitTime); // Wait for the estimated time before continuing
      }
    }
  }


  // Function to estimate wait time based on the length of the text
  async estimateWaitTime(text) {
    const langConfig = knownAbbreviations[UserLang] || knownAbbreviations['EN'];
    const {
      baseCharSpeed,
      numberSpeedPerDigit,
      numberSpeakTime,
      abbreviations,
      units
    } = langConfig;

    let totalTime = 0;
    let processedText = text;

    // === 1. Replace abbreviations with placeholders ===
    const abbrPlaceholders = [];
    abbreviations.forEach((abbr, index) => {
      const placeholder = `__ABBR${index}__`;
      const regex = new RegExp(abbr.replace('.', '\\.'), 'g');
      processedText = processedText.replace(regex, placeholder);
      abbrPlaceholders.push(placeholder);
    });

    // === 2. Count and calculate numeric durations ===
    const numberRegex = /\b\d+([.,]\d+)?\b/g;
    const numbers = processedText.match(numberRegex) || [];
    let numberTime = 0;
    numbers.forEach(num => {
      const digitCount = num.replace(/[^\d]/g, '').length;
      const time = numberSpeakTime?.[digitCount - 1] ?? digitCount * numberSpeedPerDigit;
      numberTime += time;
      totalTime += time;
    });

    // === 3. Count punctuation marks ===
    const periodCount = (processedText.match(/[.!?]/g) || []).length;
    const commaCount = (processedText.match(/[,;:]/g) || []).length;
    const lineBreaks = (processedText.match(/\n/g) || []).length;
    const punctuationTime = periodCount * 800 + commaCount * 350 + lineBreaks * 200;
    totalTime += punctuationTime;

    // === 4. Count units ===
    const unitPatterns = Object.values(units).map(u => u.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const unitRegex = new RegExp(`\\b(${unitPatterns.join('|')})\\b`, 'gi');
    const unitCount = (processedText.match(unitRegex) || []).length;
    const unitTime = unitCount * 200;
    totalTime += unitTime;

    // === 5. Add time for abbreviations ===
    const abbrTime = abbrPlaceholders.length * 300;
    totalTime += abbrTime;

    // === 6. Calculate base time for remaining characters ===
    const cleanText = processedText
      .replace(numberRegex, '')
      .replace(unitRegex, '')
      .replace(/\s+/g, ' ')
      .replace(/[.,!?]/g, '')
      .replace(/\n/g, '')
      .trim();
    const charCount = cleanText.length;
    const baseTextTime = charCount * baseCharSpeed;
    totalTime += baseTextTime;

    // === 7. Clamp total time ===
    const minTime = 1500;
    const maxTime = 15000;
    const finalTime = Math.max(minTime, Math.min(totalTime, maxTime));

    // === 8. Detailed debug output ===
    const debugDetails = {
      text,
      language: UserLang,
      baseCharSpeed,
      charCount,
      baseTextTime,
      numbers,
      numberTime,
      periodCount,
      commaCount,
      lineBreaks,
      punctuationTime,
      unitCount,
      unitTime,
      abbreviationCount: abbrPlaceholders.length,
      abbrTime,
      totalUnclamped: totalTime,
      totalClamped: finalTime
    };

    this.log?.debug?.(`[estimateWaitTime] Detailed calculation:\n${JSON.stringify(debugDetails, null, 2)}`);
    return finalTime;
  }

  // Function to reset a single component
  async resetSingleComponent(compId, AlexaID) {
    const resetId = `${DH_Did}.control.Reset${compId}`; // Component ID for reset
    //this.log.info(`ID Reset${compId} => Path ${resetId}`);
    const exists = await this.getObjectAsync(resetId); // Check if reset command exists for this component getObjectAsync

    if (exists) {
      await this.setStateAsync(resetId, true);  // Trigger the reset
      await this.speakToAlexa(AlexaInfo[UserLang][38](compId), AlexaID); // ${compId} has been reset.
      this.log.info(AlexaInfo[UserLang][38](compId));
    } else {
      await this.speakToAlexa(AlexaInfo[UserLang][39](compId), AlexaID); // Reset not available for ${compId}
      this.log.info(AlexaInfo[UserLang][39](compId));
    }
    isComponentsResetOneState = false;
  }

  // Function to reset all components and log the action
  async resetAllComponents(AlexaID) {
    const allComponents = [
      'MainBrush',
      'SideBrush',
      'Filter',
      'SensorDirty',
      'MopPad',
      'SilverIon',
      'Detergent',
      'PureWaterTank',
      'DirtyWaterTank'
    ];

    const resetPromises = allComponents.map(comp => {
      return this.resetSingleComponent(comp, AlexaID);  // Reset each component
    });

    await Promise.all(resetPromises);  // Wait for all resets to finish
    // Log and notify Alexa about all components reset
    this.log.info(AlexaInfo[UserLang][36]);
    await this.speakToAlexa(AlexaInfo[UserLang][36], AlexaID);
    isComponentsResetAllState = false;
  }

  async updateSpeakMode(val) {
    const mode = val?.toString();
    switch (mode) {
      case '0':
        this.log.info('Alexa speaking is disabled.');
        IsalexaSpeakMode = 0;
        break;
      case '1':
        this.log.info('Speak only on voice command - Alexa will speak.');
        IsalexaSpeakMode = 1;
        break;
      case '2':
        this.log.info('Speak only on input command - Alexa will speak.');
        IsalexaSpeakMode = 2;
        break;
      case '3':
        this.log.info('Speak on both voice and input - Alexa will speak.');
        IsalexaSpeakMode = 3;
        break;
      default:
        this.log.info('Speak mode not matched - Alexa remains silent.');
        IsalexaSpeakMode = 0;
    }
  }

  async speakToAlexa(message, AlexaID, SpeakMode = 3) {
    const allowed =
        SpeakMode === 3 ||               // Caller wants unconditional speak
        IsalexaSpeakMode === 3 ||        // Global setting allows all types
        IsalexaSpeakMode === SpeakMode;  // Match between global and current input type

    if (allowed && AlexaID) {
      this.log.info('Speak: ' + message);
      await this.setForeignStateAsync(`alexa2.0.Echo-Devices.${AlexaID}.Commands.speak`, message);
    } else {
      this.log.debug(`Alexa output skipped (SpeakMode: ${SpeakMode}, Global: ${IsalexaSpeakMode})`);
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  async buildCleanDataFromObjects(prefix, Returntype) {
    const mapData = {
      rooms: [],
      carpets: [],
      station: null
    };

    // Room-specific state types
    const RoomObjectsWords = ['CleaningMode', 'CleaningRoute', 'Repeat', 'SuctionLevel', 'WaterVolume', 'Cleaning', 'RoomID'];

    // Collect all state object IDs
    const objKeys = await this.getObjectViewAsync('system', 'state', {
      startkey: `${prefix}.`,
      endkey: `${prefix}.\u9999`
    });

    const keys = objKeys.rows.map(r => r.id);

    if (Returntype === 'Room') {
      const roomMap = {};

      for (const key of keys) {
        const parts = key.split('.');
        const roomId = parts[parts.length - 2];
        const stateType = parts[parts.length - 1];

        if (RoomObjectsWords.includes(stateType)) {
          const state = await this.getStateAsync(key);
          if (!roomMap[roomId]) {
            roomMap[roomId] = { id: roomId };
          }
          roomMap[roomId][stateType] = state?.val ?? null;
        }
      }

      mapData.rooms = Object.values(roomMap);
    }

    if (Returntype === 'Carpet') {
      for (const key of keys) {
        if (key.includes('CleanCarpet')) {
          const obj = await this.getObjectAsync(key);
          const coords = obj?.native?.Cord;
          if (coords && coords.length === 4) {
            mapData.carpets.push({
              id: key.split('.').slice(-2, -1)[0],  // room name
              name: obj.common.name,
              x: coords[0],
              y: coords[1],
              width: coords[2] - coords[0],
              height: coords[3] - coords[1]
            });
          }
        }
      }
    }

    return mapData;
  }

  async getValidRoomSelect(room, cleanset, prefix, roomId) {
    // room = room object with states like SuctionLevel, WaterVolume, Repeat, Cleaning
    // cleanset = fallback settings object (from JSON)
    // prefix = base path for room state (e.g. dreamehome.0.X.map.1)
    // roomId = current room ID (used in final output)

    let suction = room.SuctionLevel;
    let water = room.WaterVolume;
    let repeat = room.Repeat;
    let roomOrder = null;
    let cleaningMode = room.CleaningMode;
    let cleaningRoute = room.CleaningRoute;
    let cleanOrder = null;


    // Log the initial values
    this.log.info(`Validating room: ${room.id} | Cleaning: ${room.Cleaning}, SuctionLevel: ${suction}, WaterVolume: ${water}, Repeat: ${repeat}, CleaningMode: ${cleaningMode}, CleaningRoute: ${cleaningRoute}`);

    // Try to get the roomOrder (original RoomID from map object)
    const roomOrderState = await this.getStateAsync(`${prefix}.${room.id}.RoomID`);
    if (roomOrderState && roomOrderState.val !== undefined && roomOrderState.val !== null) {
      roomOrder = roomOrderState.val;
    }

    // Check if any required value is missing
    const invalid = [suction, water, repeat, roomOrder, cleaningMode, cleaningRoute].some(v => v === -1 || v === null || v === undefined);

    for (const key in cleanset) {
      if (cleanset[key][3] === roomId) {
        cleanOrder = parseInt(key);
        break;
      }
    }

    // If invalid, try fallback from cleanset
    if (invalid) {
      // Search for the correct room in cleanset by matching roomId with cleanset[key][3]
      let fallback = null;
      for (const key in cleanset) {
        if (cleanset[key][3] === roomId) {
          fallback = cleanset[key]; // Found the matching roomId
          break;
        }
      }

      if (fallback && fallback.length >= 6) {
        // Mapping of the fallback values
        suction = fallback[0]; // SuctionLevel from cleanset
        water = fallback[1]; // WaterVolume from cleanset
        repeat = fallback[2]; // Repeat from cleanset
        roomOrder = fallback[3]; // Room ID from cleanset
        cleaningMode = fallback[4]; // CleaningMode from cleanset
        cleaningRoute = fallback[5]; // CleaningRoute from cleanset
        // Convert the incoming CleaningMode (0-3) to the appropriate mapped value
        const mappedCleaningMode = modeMapping[cleaningMode] || -1; // Default to -1 if not found

        this.log.info(`Using fallback for room "${room.id}" [${roomId}] from .mqtt.cleanset object | SuctionLevel: ${suction}, WaterVolume: ${water}, Repeat: ${repeat}, Room Order: ${roomOrder}, Room cleaning order: ${cleanOrder}, CleaningMode: ${cleaningMode}, CleaningRoute: ${cleaningRoute}`);

        // Update state objects if necessary
        if (room.SuctionLevel === -1) {
          await this.setStateAsync(`${prefix}.${room.id}.SuctionLevel`, suction, true); // Using fallback SuctionLevel
          this.log.info(`Updated "${prefix}.${room.id}.SuctionLevel" to fallback: ${suction}`);
        }
        if (room.WaterVolume === -1) {
          await this.setStateAsync(`${prefix}.${room.id}.WaterVolume`, water, true); // Using fallback WaterVolume
          this.log.info(`Updated "${prefix}.${room.id}.WaterVolume" to fallback: ${water}`);
        }
        if (room.Repeat === -1) {
          await this.setStateAsync(`${prefix}.${room.id}.Repeat`, repeat, true); // Using fallback Repeat
          this.log.info(`Updated "${prefix}.${room.id}.Repeat" to fallback: ${repeat}`);
        }
        if (room.CleaningMode === -1) {
          await this.setStateAsync(`${prefix}.${room.id}.CleaningMode`, mappedCleaningMode, true); // Using fallback CleaningMode
          this.log.info(`Updated "${prefix}.${room.id}.CleaningMode" to fallback value: ${mappedCleaningMode}`);
        }
        if (room.CleaningRoute === -1) {
          await this.setStateAsync(`${prefix}.${room.id}.CleaningRoute`, cleaningRoute, true); // Using fallback CleaningRoute
          this.log.info(`Updated "${prefix}.${room.id}.CleaningRoute" to fallback value: ${cleaningRoute}`);
        }
      } else {
        this.log.warn(`Missing valid settings and no fallback for room "${room.id}" [${roomId}] from .mqtt.cleanset object. The cleanset data is invalid or missing. Please manually adjust the missing cleaning parameters.`);

        // No automatic updates to -1, just a hint for manual adjustments
        if (room.SuctionLevel === -1) {
          this.log.warn(`Please manually adjust the SuctionLevel for room "${room.id}" [${roomId}] as it is missing in the cleanset data.`);
        }
        if (room.WaterVolume === -1) {
          this.log.warn(`Please manually adjust the WaterVolume for room "${room.id}" [${roomId}] as it is missing in the cleanset data.`);
        }
        if (room.Repeat === -1) {
          this.log.warn(`Please manually adjust the Repeat for room "${room.id}" [${roomId}] as it is missing in the cleanset data.`);
        }
        if (room.CleaningMode === -1) {
          this.log.warn(`Please manually adjust the CleaningMode for room "${room.id}" [${roomId}] as it is missing in the cleanset data.`);
        }
        if (room.CleaningRoute === -1) {
          this.log.warn(`Please manually adjust the CleaningRoute for room "${room.id}" [${roomId}] as it is missing in the cleanset data.`);
        }
      }
    }

    // Final validation of all values before returning
    const validateFinalValues = (suction, water, repeat, roomOrder, cleaningMode, cleaningRoute) => {
      const validationErrors = [];

      // Check for any unexpected standard values (-1 or null)
      if (suction === -1 || suction === null) validationErrors.push('SuctionLevel');
      if (water === -1 || water === null) validationErrors.push('WaterVolume');
      if (repeat === -1 || repeat === null) validationErrors.push('Repeat');
      if (roomOrder === null) validationErrors.push('RoomOrder (Room ID)');
      if (cleaningMode === -1 || cleaningMode === null) validationErrors.push('CleaningMode');
      if (cleaningRoute === -1 || cleaningRoute === null) validationErrors.push('CleaningRoute');

      if (validationErrors.length > 0) {
        this.log.warn(`Invalid values detected for the following parameters: ${validationErrors.join(', ')}. Please check the data.`);
        return false; // Return false if validation fails
      }

      return true; // Return true if all values are valid
    };

    // Check final values before returning
    const isValid = validateFinalValues(suction, water, repeat, roomOrder, cleaningMode, cleaningRoute);
    if (!isValid) {
      this.log.warn(`One or more values are invalid for room "${room.id}" [${roomId}]. Please ensure the data is correctly set.`);
      // return false; // Return values with possible invalid ones
    }

    const roomSentence = `${room.id} ` +
        `${suction !== -1 ? DreameSuctionLevel[UserLang][suction] + AlexaInfo[UserLang][6] : ''} ` +
        `${water !== -1 ? (DreameSetWaterVolume[UserLang][water]).replace(/\s|[0-9]/g, '') + AlexaInfo[UserLang][7] : ''} ` +
        `${repeat !== -1 ? DreameSetRepeat[UserLang][repeat] + ' ' + AlexaInfo[UserLang][10] : ''}`;

    const roomObject = {
      ValidCommandState: isValid,
      ValidRoomId: roomId,
      ValidCustomCommand: [roomId, repeat, suction, water, cleanOrder],
      ValidCommand: {
        name: room.id,
        suction: DreameSuctionLevel[UserLang][suction],
        mopping: (DreameSetWaterVolume[UserLang][water]).replace(/\s|[0-9]/g, ''),
        repetitions: repeat,
        cleaningModes: cleaningMode,
        cleanGenius: 0,
        customCommand: [{piid: 1, value: 18},{piid: 10, value: JSON.stringify({selects: [[roomId, repeat, suction, water, cleanOrder]]})}],
        AlexaSpeakSentence: roomSentence
      }
    };

    // Final values are valid, return the cleaned values
    this.log.info(`Final values for room "${room.id}": SuctionLevel: ${suction}, WaterVolume: ${water}, Repeat: ${repeat}, Room Order: ${roomOrder}, Room cleaning order: ${cleanOrder}`);
    this.log.info(`Final Object for room "${room.id}": ` + JSON.stringify(roomObject));

    return roomObject; //[roomId, repeat, suction, water, cleanOrder]; // Return final values
  }

  // Function to groups and sorts rooms by their cleaning mode and cleanOrder. Also detects if any room has an invalid mode (-1) and reports room IDs and names.
  async groupAndSortRoomsByModeAndOrder(selectedRooms, roomActions) {
    const groupedRooms = {};
    const invalidRooms = [];

    for (const roomId of selectedRooms) {
      const action = roomActions[roomId];
      const mode = action?.cleaningModes ?? 'Unknown';

      // Track invalid mode (-1)
      if (mode === -1) {
        const name = action?.name || `Room ${roomId}`;
        invalidRooms.push({roomId, name });
      }

      // Extract cleanOrder from customCommand
      let cleanOrder = 9999;
      try {
        const value = action?.customCommand?.find(c => c.piid === 10)?.value;
        const parsed = JSON.parse(value);
        const selects = parsed?.selects?.[0];
        cleanOrder = selects?.[4] ?? 9999;
      } catch (err) {
        cleanOrder = 9999;
      }

      // Group rooms by mode
      if (!groupedRooms[mode]) {
        groupedRooms[mode] = [];
      }

      groupedRooms[mode].push({roomId, cleanOrder});
    }


    // Sort each group by cleanOrder
    const sortedGroupedRooms = {};
    for (const [mode, rooms] of Object.entries(groupedRooms)) {
      sortedGroupedRooms[mode] = rooms
        .sort((a, b) => a.cleanOrder - b.cleanOrder)
        .map(entry => entry.roomId);
    }

    const allSameMode = Object.keys(sortedGroupedRooms).length === 1;
    const hasInvalidMode = invalidRooms.length > 0;

    // Create Alexa warning sentence if invalid modes exist
    let AlexaSpeakSentence = '';
    if (hasInvalidMode) {
      const roomList = invalidRooms.map(r => r.name || `Room ${r.roomId}`).join(', ');
      AlexaSpeakSentence = AlexaInfo[UserLang][44](roomList);
    }

    return {
      groupedRooms: sortedGroupedRooms,
      allSameMode,
      hasInvalidMode,
      AlexaSpeakSentence
    };
  }

  // Function to check for missing suction or mopping levels based on the selected cleaning mode
  async checkForMissingCleaningAttributes(selectedRooms, roomActions) {
    let ambiguousCommand = false;
    const missingCleaningModeRooms = [];

    for (const room of selectedRooms) {
      if (roomActions[room] && roomActions[room].cleaningModes) {
        const mode = roomActions[room].cleaningModes;
        const missingAttributes = [];

        // If the cleaning mode requires mopping but the mopping level is missing
        if ((mode === 5121 || mode === 5123 || mode === 5120) && !roomActions[room].mopping) {
          missingAttributes.push(AlexamissingMessages[UserLang].mopping);
        }

        // If the cleaning mode requires suction but the suction level is missing
        if ((mode === 5122 || mode === 5123 || mode === 5120) && !roomActions[room].suction) {
          missingAttributes.push(AlexamissingMessages[UserLang].suction);
        }

        // If any required attributes are missing, mark the command as ambiguous
        if (missingAttributes.length > 0) {
          ambiguousCommand = true;
          missingCleaningModeRooms.push({
            name: roomActions[room].name,
            missing: missingAttributes.join(AlexamissingMessages[UserLang].and) // "Suction Level and Mopping Level"
          });
        }
      }
    }

    if (ambiguousCommand) {
      return { ambiguousCommand, missingCleaningModeRooms };
    }

    return { ambiguousCommand: false };
  }

  async handleManualCleanup() {
    const MAX_RESET_ATTEMPTS = 3;
    let resetAttempts = 0;

    const safeReset = async () => {
      while (resetAttempts < MAX_RESET_ATTEMPTS) {
        try {
          await this.setStateAsync('resources.memoryCleaner.triggerCleanup', {
            val: false,
            ack: true
          });
          return;
        } catch (err) {
          resetAttempts++;
          if (resetAttempts >= MAX_RESET_ATTEMPTS) {
            throw new Error(`Failed to reset trigger after ${MAX_RESET_ATTEMPTS} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    try {
      this.log.info('Starting manual cleanup...');
      const memBefore = process.memoryUsage();
      this.log.debug(`Memory before: ${JSON.stringify(memBefore)}`);

      const priorityState = await this.getStateAsync('resources.memoryCleaner.priority');
      const priority = priorityState?.val || 'medium';
      this.log.debug(`Starting cleanup with priority: ${priority}`);

      const result = await this.memoryManager.comprehensiveClean(priority);
      if (result.restartAttempted) {
        this.log.info('Adapter restart was initiated due to memory pressure');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      const freedMB = result.freedBytes / (1024 * 1024);
      this.log.info(`Cleanup completed. Freed: ${freedMB.toFixed(2)}MB`);

      await Promise.all([
        this.setStateAsync('resources.memoryCleaner.lastFreedMB', {
          val: freedMB,
          ack: true
        }),
        this.setStateAsync('resources.memoryCleaner.lastCleanup', {
          val: new Date().toISOString(),
          ack: true
        }),
        safeReset()
      ]);

    } catch (err) {
      this.log.error(`Cleanup failed: ${err.message}`);
      try {
        await safeReset();
      } catch (finalErr) {
        this.log.error('CRITICAL: Final reset failed: ' + finalErr.message);
      }
    }
  }

  async handleMemoryCleanerToggle(enabled) {
    if (enabled) {
      this.log.info('Memory cleanup process has been enabled');
      await this.updateMemoryCleanerSettings();
    } else {
      this.log.info('Memory cleanup process has been disabled');
      this.memoryManager.disableAutoCleanup();
    }
  }

  async updateMemoryCleanerSettings() {
    if (await this.getStateAsync('resources.memoryCleaner.enabled')?.val) {
      this.memoryManager.disableAutoCleanup();
      await this.memoryManager.enableAutoCleanup({
        thresholdMB: await this.getStateAsync('resources.memoryCleaner.thresholdMB')?.val || 300,
        intervalMinutes: (await this.getStateAsync('resources.memoryCleaner.intervalSec')?.val || 30) / 60,
        priority: await this.getStateAsync('resources.memoryCleaner.priority')?.val || 'medium'
      });
    }
  }

  async syncConfigWithStates() {
    try {
      await Promise.all([
        // Memory Cleaner Settings
        this.setStateAsync('resources.memoryCleaner.enabled', {
          val: this.config.memoryCleanerEnabled,
          ack: true
        }),
        this.setStateAsync('resources.memoryCleaner.thresholdMB', {
          val: this.config.memoryCleanerThresholdMB,
          ack: true
        }),
        this.setStateAsync('resources.memoryCleaner.intervalSec', {
          val: this.config.memoryCleanerIntervalSec,
          ack: true
        }),
        this.setStateAsync('resources.memoryCleaner.priority', {
          val: this.config.memoryCleanerPriority,
          ack: true
        }),

        // Monitoring Settings
        this.setStateAsync('resources.profiling.enabled', {
          val: this.config.profilingEnabled,
          ack: true
        })
      ]);
      this.log.debug('Configuration successfully synchronized with states');
    } catch (err) {
      this.log.error(`State synchronization failed: ${err.message}`);
    }
  }

  async logFullConfig() {
    const mem = process.memoryUsage();
    const uptime = process.uptime();

    const lastRestartReasonState = await this.getStateAsync('resources.system.lastRestartReason');
    const lastRestartErrorState = await this.getStateAsync('resources.system.restartError');

    let lastRestartFormatted = 'Never';
    let restartDetails = 'No restart attempts';

    if (lastRestartReasonState && lastRestartReasonState.val) {
      const lastAttemptTime = lastRestartReasonState.ts;
      lastRestartFormatted = new Date(lastAttemptTime).toISOString();

      restartDetails = `Last attempt: ${lastRestartFormatted} - Reason: ${lastRestartReasonState.val}`;

      if (lastRestartErrorState && lastRestartErrorState.val) {
        try {
          const errorObj = JSON.parse(lastRestartErrorState.val);
          restartDetails += ` - Error: ${errorObj.error}`;
        } catch (e) {
          restartDetails += ` - Error: ${lastRestartErrorState.val}`;
        }
      }
    }

    const cleanerEnabledState = await this.getStateAsync('resources.memoryCleaner.enabled');
    const heapUsedState = await this.getStateAsync('resources.memory.heapUsedMB');
    const heapStatusState = await this.getStateAsync('resources.memory.heapUsedStatus');

    this.log.info(`
===== SYSTEM CONFIGURATION SNAPSHOT =====
[Admin Configuration]
  - Cleaner Enabled: ${this.config.memoryCleanerEnabled}
  - Threshold: ${this.config.memoryCleanerThresholdMB} MB
  - Interval: ${this.config.memoryCleanerIntervalSec} sec
  - Priority: ${this.config.memoryCleanerPriority}
  - Heap Limit: ${this.config.heapLimitMB} MB

[Runtime States]
  - Cleaner Active: ${cleanerEnabledState?.val ?? false}
  - Current Heap: ${heapUsedState?.val?.toFixed(2) || '0.00'} MB
  - Heap Status: ${heapStatusState?.val || 'OK'}

[Restart Manager]
  - ${restartDetails}

[Process Metrics]
  - Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB
  - RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB
  - Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s
========================================`);
  }

  /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
  onUnload(callback) {
    try {
      this.log.info('Cleaning up resources...');

      // Cleanup monitoring
      if (this.monitor) {
        this.monitor.stop();
        this.log.info('Resource monitoring stopped');
      }

      // Cleanup memory manager
      if (this.memoryManager) {
        this.memoryManager.disableAutoCleanup();
        this.log.info('Memory manager stopped');
      }

      this.DH_Clean();

      callback();
    } catch (e) {
      callback();
    }
  }

  /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
  async onStateChange(id, state) {
    if (state) {
      if (!state.ack) {
        const deviceId = id.split('.')[2];
        const folder = id.split('.')[3];
        const command = id.split('.')[4];
        if (LogData) {
          this.log.info('Receive command: ' + command + ' | Device: ' + deviceId + ' | folder: ' + folder + ' | value ' + state.val);
        }
        if (id.indexOf('.NewMap') !== -1) {
          this.log.info('Generate Map');
          await this.DH_GenerateMap();
          this.setStateAsync(id, false, true);
          return;
        }
        if (id.toString().indexOf('.map.MapNumber') != -1) {
          if (DH_Auth !== '') {
            await this.DH_RequestNewMap();
            await this.DH_GetSetRooms();
          }
        }

        // Handle map size changes
        if ((id.toString().indexOf('.map.MapSize' + DH_CurMap) != -1) && state.val){
          const newSize = parseInt(state.val);
          const minSize = 256;
          const maxSize = 2048;

          if (isNaN(newSize) || newSize < minSize || newSize > maxSize) {
            this.log.warn(`Invalid size ${newSize}. Keeping current.`);
            return;
          }
          // Trigger reload
          this.log.info('New map size received: ' + state.val + 'px. Apply settings and generate new map');
          await this.DH_GenerateMap();

        }

        // Handle map rotation changes
        if ((id.toString().indexOf('.map.Rotation' + DH_CurMap) != -1) && (state.val || state.val === 0)){
          const newRotation = parseInt(state.val);
          // Trigger reload
          this.log.info('New map rotation received: ' + newRotation + '°. Apply settings and generate new map');
          await this.DH_GenerateMap();
        }

        if (id.toString().includes('.StartCleaningByRoomConfig') && state.val) {
          await this.setStateAsync(DH_Did + '.map.StartCleaningByRoomConfig', false, true);

          // Dynamically get the adapter instance (e.g. "0")
          const GetAdapterPathObjects = await this.getStatesAsync(`*.${DH_CurMap}.*.Cleaning`);
          const anyKey = Object.keys(GetAdapterPathObjects)[0];
          if (!anyKey) {
            this.log.warn('Adapter path could not be determined');
            return;
          }
          const GetAdapterPath = anyKey.split('.')[1]; // e.g. "0"

          const prefix = `dreamehome.${GetAdapterPath}.${DH_Did}.map.${DH_CurMap}`;

          // Get the last Alexa device used
          const LastAlexa = await this.getForeignStateAsync('alexa2.0.History.serialNumber');
          const LastAlexaID = LastAlexa?.val || '';

          // Load room cleaning configuration
          const mapData = await this.buildCleanDataFromObjects(prefix, 'Room');
          //this.log.info('Get all Rooms: ' + JSON.stringify(mapData));

          // Load cleanset fallback data
          const cleansetState = await this.getStateAsync(`dreamehome.${GetAdapterPath}.${DH_Did}.mqtt.cleanset`);
          let cleanset = {};
          if (cleansetState?.val && typeof cleansetState.val === 'string' && cleansetState.val.trim() !== '') {
            try {
              cleanset = JSON.parse(cleansetState.val);
            } catch (e) {
              this.log.warn('cleanset JSON could not be parsed');
            }
          }

          const selects = [];
          const roomActions = {};
          const selectedRooms = [];
          const readableLog = [];

          // Collect selected rooms and build cleaning instructions
          for (const room of mapData.rooms) {
            const cleaningState = await this.getStateAsync(`${prefix}.${room.id}.Cleaning`);
            if (room.Cleaning === 1 && cleaningState?.val === 1) {
              const GetRoomId = room.RoomID;
              selectedRooms.push(GetRoomId);
              const selectEntry = await this.getValidRoomSelect(room, cleanset, prefix, GetRoomId);
              if (selectEntry) {
                if (selectEntry.ValidCommandState) {
                  selects.push(selectEntry.ValidCustomCommand);
                }
                roomActions[selectEntry.ValidRoomId] = selectEntry.ValidCommand;
              }
            }
          }

          if (selectedRooms.length === 0) {
            this.log.warn('No rooms selected for cleaning. Aborting.');
            return;
          }

          // Build and send cleaning command = StartCleaningByRoomConfig[{"piid": 1,"value": 18},{"piid": 10,"value": "{\"selects\": [[3,1,3,2,1]]}"}] => Room ID, Repeats, Suction Level, Water Volume, Multi Room Id
          const ToGetString = JSON.stringify({ selects });
          const startClean = [
            { piid: 1, value: 18 },
            { piid: 10, value: ToGetString }
          ];

          // check if all cleaning modes are the same and sorts rooms by cleaning mode and cleanOrder
          const result = await this.groupAndSortRoomsByModeAndOrder(selectedRooms, roomActions);
          //this.log.info(`Grouped and sorted rooms: ${JSON.stringify(result)}`);
          this.log.info(`Grouped and sorted rooms: ${JSON.stringify(result.groupedRooms)}`);
          this.log.info(`All same mode: ${result.allSameMode}`);
          if (result.hasInvalidMode) {
            this.log.warn(result.AlexaSpeakSentence);
            await this.speakToAlexa(result.AlexaSpeakSentence, LastAlexaID, 2);
            return;
          }

          // Check for missing cleaning attributes (like suction, mop etc.)
          const {ambiguousCommand, missingCleaningModeRooms} = await this.checkForMissingCleaningAttributes(selectedRooms, roomActions);

          // If ambiguity is detected, ask for clarification
          if (ambiguousCommand) {
            if (missingCleaningModeRooms.length === 1) {
              const { name, missing } = missingCleaningModeRooms[0];
              const clarificationMessage = AlexaInfo[UserLang][25](name, missing);
              this.log.info('Speak: ' + clarificationMessage);
              await this.speakToAlexa(clarificationMessage, LastAlexaID, 2);
            } else {
              const roomMessages = missingCleaningModeRooms.map(room => `${room.name}: ${room.missing}`).join('; ');
              const clarificationMessage = AlexaInfo[UserLang][26](roomMessages);
              this.log.info('Speak: ' + clarificationMessage);
              await this.speakToAlexa(clarificationMessage, LastAlexaID, 2);
            }
            return; // Exit early if ambiguity is found
          }

          this.log.info('DH_SendAction(startClean): ' + JSON.stringify(startClean));
          this.log.info('DH_SendAction(roomAction): ' + JSON.stringify(roomActions));

          // Create readable logs for each room
          for (const roomNumber of Object.keys(roomActions)) {
            const roomAction = roomActions[roomNumber];
            const repetitions = roomAction.repetitions || 1;
            const logEntry = `${roomAction.name} ${roomAction.suction ? roomAction.suction +  AlexaInfo[UserLang][6] : ''} ${roomAction.mopping ? roomAction.mopping +  AlexaInfo[UserLang][7] : ''} ${repetitions}  ${AlexaInfo[UserLang][10]}`;
            readableLog.push(logEntry.trim());
          }


          // Check current cleaning status
          const cleaningCompleted = await this.getStateAsync(DH_Did + '.state.CleaningCompleted');
          const cleaningPaused = await this.getStateAsync(DH_Did + '.state.CleaningPaused');
          const isCleaningActive = (cleaningCompleted.val > 0 && cleaningCompleted.val !== null) || cleaningPaused.val === 1;

          // Check if user explicitly wants to override cleaning
          const ForceRoomConfigOverride = await this.getStateAsync(DH_Did + '.map.ForceRoomConfigOverride');
          const cancelCommandGiven = ForceRoomConfigOverride?.val === true;
          if (cancelCommandGiven) {
            await this.setStateAsync(DH_Did + '.map.ForceRoomConfigOverride', false, true);
          }

          // Cleaning is active, handle override
          if (isCleaningActive) {
            if (cancelCommandGiven) { // Cancel cleaning and restart
              isAbortCommandReceived = true; // Set abort flag
              await this.speakToAlexa(AlexaInfo[UserLang][3], LastAlexaID, 2); // Notify Alexa that cleaning was aborted
              this.log.info(AlexaInfo[UserLang][3]); // Abort command received. Stopping the loop and halting the process.
              await this.setStateAsync(`${DH_Did}.control.Stop`, true); // Stop the robot
              await this.wait(waitingvalue);
              await this.setStateAsync(`${DH_Did}.control.Charge`, true); // Send the robot to charging station
              await this.wait(waitingvalue);

              if (!isMonitorCleaningState) {
                this.startCleaning(DH_Did, selectedRooms, roomActions, LastAlexaID, 2);
                this.log.info('Cleaning stopped and a new cleaning process started.');
              } else {
                this.log.info(AlexaInfo[UserLang][2]); //Cannot start a new cleaning process as a cleaning process is being monitored.
                await this.speakToAlexa(AlexaInfo[UserLang][27], LastAlexaID, 2);
              }
            } else {
              await this.speakToAlexa(AlexaInfo[UserLang][2], LastAlexaID, 2);
              this.log.info('Cleaning is active, waiting for user to cancel the cleaning.');
            }
          } else {
            if (!isMonitorCleaningState) { // No cleaning active, start new session
              await this.speakToAlexa(readableLog, LastAlexaID, 2);
              this.startCleaning(DH_Did, selectedRooms, roomActions, LastAlexaID, 2);
              this.log.info('Started a new cleaning process without checking for cancel command.');
            } else {
              this.log.info(AlexaInfo[UserLang][2]); //Cannot start a new cleaning process as a cleaning process is being monitored.
              await this.speakToAlexa(AlexaInfo[UserLang][27], LastAlexaID, 2);
            }
          }
        }

        if (id.toString().indexOf('.CleanCarpet') != -1) {
          //let mapData = await this.buildCleanDataFromObjects(`dreamehome.${GetAdapterPath}.${DH_Did}.map.${DH_CurMap}`, 'Carpet');
          //this.log.info('Get all Carpet: ' + JSON.stringify(mapData));
          if (state.val) {
            const stateObj = await this.getObjectAsync(id);
            if (stateObj && stateObj.native.Cord) {
              const SCarpetCrdAction = [];
              SCarpetCrdAction.push(stateObj.native.Cord);
              const stateObjCR = await this.getStateAsync(id.replace('.CleanCarpet', '.CarpetRepetition'));
              const stateCR = (stateObjCR !== null && typeof stateObjCR === 'object') ? stateObjCR.val : 1;
              const stateObjCSV = await this.getStateAsync(id.replace('.CleanCarpet', '.CarpetSuctionLevel'));
              const stateCSV = (stateObjCSV !== null && typeof stateObjCSV === 'object') ? stateObjCSV.val : 0;
              const RetCom = await this.DH_CleanZonePoint(1, SCarpetCrdAction, stateCR, stateCSV, 0);
              if (RetCom) {
                await this.DH_SendActionCleanCarpet(RetCom, stateObj.common.name);
                this.log.info('Clean Carpet: ' + stateObj.common.name + ' | Coordinates: ' + JSON.stringify(stateObj.native.Cord) + ' | Repetition: ' + stateCR + ' | Suction Level: ' + stateCSV);
              }

            }
          }
        }

        if (id.toString().indexOf('.control.') != -1) {
          let SETURLData;
          for (const [SPkey, SPvalue] of Object.entries(DreameActionProperties)) {
            const ControlObject = SPvalue.replace(/\w\S*/g, function(SPName) {
              return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
            }).replace(/\s/g, '');
            if (id.split('.').pop() == ControlObject) {
              let PropertiesMethod = false;
              const requestId = Math.floor(Math.random() * 9000) + 1000;
              this.log.info('Send Command: ' + SPvalue);
              const GetSIID = parseInt((SPkey.split('S')[1] || '').split('A')[0]);
              let GetAIID = '';
              if (SPkey.indexOf('C') !== -1) {
                GetAIID = parseInt((SPkey.split('A')[1] || '').split('C')[0]);
              } else {
                GetAIID = parseInt(SPkey.replace('S' + GetSIID + 'A', ''));
              }
              if (SPkey.indexOf('P') !== -1) {
                GetAIID = parseInt((SPkey.split('P')[1] || '').split('C')[0]);
                PropertiesMethod = true;
              }

              let PiidAction = '[1]';
              if (DreameActionParams[SPkey] !== 'false') {
                PiidAction = state.val;
                if (Object.prototype.toString.call(PiidAction).match(/\s([\w]+)/)[1].toLowerCase() !== 'boolean') {
                  try {
                    PiidAction = JSON.parse(PiidAction);
                  } catch (errJS) {
                    this.log.warn('Error! ' + PiidAction + ' value is not json');
                  }
				   }

                if (SPkey.indexOf('E') !== -1) {
                  PropertiesMethod = true;
                  const stateObj = await this.getObjectAsync(id);
                  if (stateObj && stateObj.native.value) {
                    let PiidActionValue = state.val;
                    try {
                      const PiidActionTmpValue = JSON.parse(stateObj.native.value);
                      PiidActionTmpValue['v'] = state.val;
                      PiidActionValue = JSON.stringify(PiidActionTmpValue);
                    } catch (errUS) {
                      //this.log.warn('Error! Update ' + SPvalue + ' value is not json');
                    }
                    let TSSIID = parseInt(stateObj.native.siid);
                    let TSPIID = parseInt(stateObj.native.piid);
                    if ((SPkey == 'S4P23E1') && (PiidActionValue == 1)) {
                      TSSIID = 4; TSPIID = 26;
                    } else if ((SPkey == 'S4P23E1') && (PiidActionValue !== 1)) { // Change Costum Mode to 0
                      const CMSETURLData = {
                        did: DH_Did,
                        id: requestId,
                        data: {
                          did: DH_Did,
                          id: requestId,
                          method: 'set_properties',
                          params: {},
                        },
                      };
                      CMSETURLData.data.params.did = DH_Did;
                      CMSETURLData.data.params = [{siid: 4, piid: 26, 'value': 0}];
                      this.log.info('Send Extended Command: ' + JSON.stringify(CMSETURLData));
                      try {
                        await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, CMSETURLData);
                      } catch (err) {
                        this.log.warn('Setting "' + SPvalue + '" State failed: ' + err);
                      }
                    }
                    PiidAction = [{siid: TSSIID,
                      piid: TSPIID,
                      'value': PiidActionValue
                    }];
                    this.log.info('Send Extended Command: ' + JSON.stringify(PiidAction));
			           }
				   }
              }

              if (PropertiesMethod) {
                SETURLData = {
                  did: DH_Did,
                  id: requestId,
                  data: {
                    did: DH_Did,
                    id: requestId,
                    method: 'set_properties',
                    params: {},
                  },
                };
                SETURLData.data.params.did = DH_Did;
                SETURLData.data.params = PiidAction;
              } else {
                SETURLData = {
                  did: DH_Did,
                  id: requestId,
                  data: {
                    did: DH_Did,
                    id: requestId,
                    method: 'action',
                    params: {
                      did: DH_Did,
                      siid: GetSIID,
                      aiid: GetAIID,
                      in: PiidAction
                    },
                  },

                };
              }
              try {
                if ((SPkey == 'S4A1') || (SPkey == 'S4A1C1') || (SPkey == 'S4A1C2') || (SPkey == 'S18A1C1')) {
                  PiidAction = [{siid: 4,piid: 50, 'value': '{"k":"SmartHost","v":0}'}];
                  const RESETCData = {
                    did: DH_Did,
                    id: requestId,
                    data: {
                      did: DH_Did,
                      id: requestId,
                      method: 'set_properties',
                      params: {},
                    },
                  };
                  RESETCData.data.params.did = DH_Did;
                  RESETCData.data.params = PiidAction;
                  await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, RESETCData);
                }
                const GetCloudRequestDeviceData = await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, SETURLData);
                const path = DH_Did + '.control.' + SPvalue.replace(/\w\S*/g, function(SPName) {
                  return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                }).replace(/\s/g, '');
                const GetobjTypeC = await this.getObjectAsync(path);
                if (GetobjTypeC.common.type == 'boolean') {
                  await this.setState(path, false, true);
                }
              } catch (err) {
                this.log.warn('Setting "' + SPvalue + '" State failed: ' + err);
              }
              return;
            }
          }
        }
        if (id.indexOf('.showlog') !== -1) {
          LogData = state.val;
          if (LogData) {
            this.log.info('Show log has been activated');
          } else {
            this.log.info('Show log has been disabled');
          }
          return;
        }

        // Handle manual cleanup trigger
        if (id.endsWith('resources.memoryCleaner.triggerCleanup') && state.val === true) {
          await this.handleManualCleanup();
          return;
        }

        // Handle profiling enable/disable
        if (id.endsWith('resources.profiling.enabled')) {
          this.log.info(`Profiling ${state.val ? 'enabled' : 'disabled'}`);
          this.profiler.setEnabled(state.val);
          return;
        }

        // Handle memory cleaner enable/disable
        if (id.endsWith('resources.memoryCleaner.enabled')) {
          await this.handleMemoryCleanerToggle(state.val);
          return;
        }

        // Handle memory cleaner settings changes
        if (id.endsWith('resources.memoryCleaner.thresholdMB') ||
    id.endsWith('resources.memoryCleaner.intervalSec') ||
    id.endsWith('resources.memoryCleaner.priority')) {

          await this.updateMemoryCleanerSettings();
          return;
        }
        if (id.endsWith('.alexaSpeakMode')) {
          await this.updateSpeakMode(state?.val);
        }

        if (id.endsWith('.control.Command')) {
          const command = state.val; // "Start", "Stop", ..
          const targetObj = DH_Did + '.control.' + command;

			 try {
            await this.setStateAsync(targetObj, true);
            this.log.info('Command executed: ' + command);

          } catch (e) {
            this.log.error('Failed to execute command ' + command + ': ' + e);
          }
        }

      }

      if ((id.indexOf('.summary') !== -1) && AlexaIsPresent) {
        const command = state.val;

        if (command == '') { //Check if the event is triggered only when the state actually changes and is not empty
          return;
        }
        currentTime = Date.now();
        timeDiff = currentTime - lastCommandTime;  // Calculate the time difference
        if (timeDiff < 3000) { // If the command is received within 3 seconds
          this.log.info('Command ignored: Repeated command within 3 seconds');
          return;
        }

        const LastAlexa = await this.getForeignStateAsync('alexa2.0.History.serialNumber');
        let LastAlexaID = '';
        if (LastAlexa) {
          LastAlexaID = LastAlexa.val;
        }

        const commandLower = command.toLowerCase(); // Convert the command to lowercase for consistent comparison
        const hasRobotKeyword = robotKeywords[UserLang].some(word => commandLower.includes(word)); // Check if the command includes any robot-related keyword
        const hasEmptyKeyword = emptyActionWords[UserLang].some(word => commandLower.includes(word)); // Check if the command includes any emptying-related keyword
        const hasWashKeyword = washActionWords[UserLang].some(word => commandLower.includes(word)); // Check if the command includes any washing-related keyword

        // Trigger auto-empty only if both robot and emptying keywords are present
        if (hasRobotKeyword && hasEmptyKeyword) {
          //Reset alexa2.0.History.summary
          await this.setForeignStateAsync(id, '');
          await this.startAutoEmpty(LastAlexaID);
        }

        // Trigger auto-wash only if both robot and washing keywords are present
        if (hasRobotKeyword && hasWashKeyword) {
          //Reset alexa2.0.History.summary
          await this.setForeignStateAsync(id, '');
          await this.startAutoWash(LastAlexaID);
        }

        // Trigger Status only if both robot and Status keywords are present
        const hasStatusKeyword = statusCheckWords[UserLang].some(word => commandLower.includes(word));

        // Try to detect a specific component in the command
        const componentKey = await this.matchComponentBySynonym(commandLower, UserLang);

        if (hasRobotKeyword && componentKey && hasStatusKeyword && !isComponentsSayState) {
          isComponentsSayState = true;
          await this.setForeignStateAsync(id, ''); // Reset spoken text
          await this.checkSingleComponentStatus(componentKey, LastAlexaID);
          return;
        } else if (hasRobotKeyword && hasStatusKeyword && !isComponentsSayState) {
		  isComponentsSayState = true;
          await this.setForeignStateAsync(id, ''); // Reset summary
          await this.checkRobotStatus(commandLower, LastAlexaID);
        }


        // Try to detect reset all command
        const checkResetAllKeyword = (commandLower, UserLang) => {
          return resetAllKeywords[UserLang].some(synonym => commandLower.includes(synonym));
        };
        // Try to detect reset one command
        const checkResetKeyword = (commandLower, UserLang) => {
          return resetOneKeywords[UserLang].some(synonym => commandLower.includes(synonym));
        };

        // Check if the command is for "Reset All" or "Reset Component"
        const hasResetAllKeyword = checkResetAllKeyword(commandLower, UserLang);
        // Trigger Reset-Component only if "Reset All" is not detected
        const hasResetKeyword = hasResetAllKeyword ? false : checkResetKeyword(commandLower, UserLang);


        // If "Reset All" is detected, reset all components
        if (hasRobotKeyword && hasResetAllKeyword && !isComponentsResetAllState) {
          isComponentsResetAllState = true;
          await this.setForeignStateAsync(id, '');  // Confirm the Reset-All command
          await this.resetAllComponents(LastAlexaID);  // Reset all components
          this.log.info(AlexaInfo[UserLang][36]);  // Log the command
        }

        // Trigger Reset-Component only if "Reset All" is not detected
        if (hasRobotKeyword && hasResetKeyword && !isComponentsResetOneState) {
          isComponentsResetOneState = true;
          let matchedComp = null;
          const langComponents = resetComponentWords[UserLang];

          // Check which component matches the user's command
          for (const [compKey, synonyms] of Object.entries(langComponents)) {
            if (synonyms.some(word => commandLower.includes(word))) {
              matchedComp = compKey;
              break;
            }
          }

          if (matchedComp) {
            await this.setForeignStateAsync(id, '');  // Confirm the Reset command
            await this.resetSingleComponent(matchedComp, LastAlexaID);  // Reset the matched component
          }
        }


        lastCommandTime = currentTime; // Store the new timestamp => Proceed with command processing if the time difference is >= 3 seconds
        const processedCommands = await this.processCommand(commandLower, UserLang);

        const selectedRooms = [];
        const roomActions = {}; // Stores actions per room
        const readableLog = [];
        let cleaningMode = 1; // Default mode set to 1 (Saugen und Wischen / Vacuum and Mop)
        let cleanGeniusValue = 1; // Default value for CleanGenius
        let isCleaningCommand = false;
        let roomFound = false;
        //ambiguousCommand = false; // Flag to track ambiguous commands
        const roomsWithCommands = {}; // Object to track rooms with commands
        let currentRoom = null;
        let singleRoomName = '';

        // Split the command into parts based on 'and', 'und', or commas
        const commandParts = processedCommands.split(/and|und|,/); //command.split(/\b(?:and|und|,)\b/i).map(p => p.trim());

        // Check if the command includes any cancel-related keywords
        if (isMonitorCleaningState) {
          // Check if the command contains any cancel-related keywords
          const cancelCommandGiven = AlexacancelKeywords[UserLang]?.some(keyword => processedCommands.toLowerCase().includes(keyword));
          if (cancelCommandGiven) {
            isAbortCommandReceived = true; // Set abort flag
            this.log.info(AlexaInfo[UserLang][3]); // Abort command received. Stopping the loop and halting the process.
            await this.setStateAsync(`${DH_Did}.control.Stop`, true); // Stop the robot
            await this.wait(waitingvalue);
            await this.setStateAsync(`${DH_Did}.control.Charge`, true); // Send the robot to charging station
            this.speakToAlexa(AlexaInfo[UserLang][3], LastAlexaID, 1); // Notify Alexa that cleaning was aborted
          }
        }

        // Iterate through command parts asynchronously
        for (const part of commandParts) {
          let roomNumber = null;
          let foundInThisPart = false;

          // Check if each part has a room name
          for (const Alexaroom of Alexarooms) {
            if (part.toLowerCase().includes(Alexaroom.RM.toLowerCase())) {
              roomNumber = Alexaroom.RN;
              currentRoom = Alexaroom.RN; // Found room
              singleRoomName = Alexaroom.RM;
              selectedRooms.push(roomNumber);
              roomActions[roomNumber] = {
                name: Alexaroom.RM,
                suction: null,
                mopping: null,
                repetitions: 1,
                cleaningModes: 1,
                cleanGenius: 0,
                customCommand: '',
                AlexaSpeakSentence: ''
              };

              foundInThisPart = true;
              break; // Exit once the room is found
            }
          }

          if (foundInThisPart) roomFound = true; //Only set it if this part has actually found something
          if (!foundInThisPart) continue; //If no room is found in this part, move on to the next part

          if (!roomNumber && currentRoom) {
            roomNumber = currentRoom;
          }

          if (currentRoom) {

            if (part.toLowerCase().includes('saugen') || part.toLowerCase().includes('staubsaugen') || part.toLowerCase().includes('sweeping')) {
              suctionLevels[UserLang].forEach(level => {
                if (part.toLowerCase().includes(level)) {
                  roomActions[roomNumber].suction = level;
                  isCleaningCommand = true;
                }
              });
              for (const [synonym, mappedLevel] of Object.entries(suctionSynonyms[UserLang])) {
                if (part.toLowerCase().includes(synonym)) {
                  roomActions[roomNumber].suction = mappedLevel;
                  isCleaningCommand = true;
                  break;
                }
              }
            }

            if (part.toLowerCase().includes('wischen') || part.toLowerCase().includes('mopping')) {
              moppingLevels[UserLang].forEach(level => {
                if (part.toLowerCase().includes(level)) {
                  roomActions[roomNumber].mopping = level;
                  isCleaningCommand = true;
                }
              });

              for (const [synonym, mappedLevel] of Object.entries(moppingSynonyms[UserLang])) {
                if (part.toLowerCase().includes(synonym)) {
                  roomActions[roomNumber].mopping = mappedLevel;
                  isCleaningCommand = true;
                  break;
                }
              }
            }

            const repetitionMatch = part.match(/\b(one|two|three|ein|zwei|drei)\s*(times|mal)\b/i);
            if (repetitionMatch) {
              roomActions[roomNumber].repetitions = Alexanumbers[repetitionMatch[1]] || 1;
            }

            // Check if any cleaning mode keywords are mentioned
            if (part.toLowerCase().includes('saugen') || part.toLowerCase().includes('staubsaugen') || part.toLowerCase().includes('sweeping')) {
              cleaningMode = 5122;
              cleanGeniusValue = 0;
              isCleaningCommand = true;
            }
            if (part.toLowerCase().includes('wischen') || part.toLowerCase().includes('mopping')) {
              cleaningMode = 5121;
              cleanGeniusValue = 0;
              isCleaningCommand = true;
            }

            if ((part.toLowerCase().includes('saugen') || part.toLowerCase().includes('staubsaugen') || part.toLowerCase().includes('sweeping')) &&
                            (part.toLowerCase().includes('wischen') || part.toLowerCase().includes('mopping'))) {
              cleaningMode = 5120;
              cleanGeniusValue = 0;
              isCleaningCommand = true;
            }
            if (part.toLowerCase().includes('wischen nach saugen') || part.toLowerCase().includes('mopping after sweeping')) {
              cleaningMode = 5123;
              cleanGeniusValue = 0;
              isCleaningCommand = true;
            }

            roomActions[roomNumber].cleaningModes = cleaningMode;
            roomActions[roomNumber].cleanGenius = cleanGeniusValue;
            roomsWithCommands[roomNumber] = roomActions[roomNumber].cleaningModes; // Store cleaning modes for the room

            const roomSentence = `${roomActions[roomNumber].name} ${roomActions[roomNumber].suction ? roomActions[roomNumber].suction + AlexaInfo[UserLang][6] : ''}
						${roomActions[roomNumber].mopping ? roomActions[roomNumber].mopping + AlexaInfo[UserLang][7] : ''} ${roomActions[roomNumber].repetitions} ${AlexaInfo[UserLang][10]}`;
            roomActions[roomNumber].AlexaSpeakSentence = roomSentence;
          }
        }

        // If no room was found, exit early
        if ((!roomFound) || (!isCleaningCommand)) {
          this.log.info('No rooms detected, no cleaning process started.');
          return;
        }
        //Reset alexa2.0.History.summary
        await this.setForeignStateAsync(id, '');

        // Check for missing cleaning attributes
        const { ambiguousCommand, missingCleaningModeRooms } = await this.checkForMissingCleaningAttributes(selectedRooms, roomActions);

        // If ambiguity is detected, ask for clarification
        if (ambiguousCommand) {
          if (LastAlexaID) {
            if (missingCleaningModeRooms.length === 1) {
              const {
                name,
                missing
              } = missingCleaningModeRooms[0];
              const clarificationMessage = AlexaInfo[UserLang][25](name, missing);
              this.log.info('Speak: ' + clarificationMessage);
              await this.speakToAlexa(clarificationMessage, LastAlexaID, 1);
            } else {
              const roomMessages = missingCleaningModeRooms.map(room => `${room.name}: ${room.missing}`).join('; ');
              const clarificationMessage = AlexaInfo[UserLang][26](roomMessages);
              this.log.info('Speak: ' + clarificationMessage);
              await this.speakToAlexa(clarificationMessage, LastAlexaID, 1);
            }
          }
          return; // Exit early if ambiguity is found
        }

        // If no mode was explicitly set, keep it 1 (Saugen und Wischen / Vacuum and Mop)
        if (cleaningMode === 1 && !commandParts.some(part => part.toLowerCase().includes('saugen') || part.toLowerCase().includes('wischen') || part.toLowerCase().includes('sweeping') || part.toLowerCase().includes('mopping'))) {
          cleanGeniusValue = 1; // If no specific cleaning mode is mentioned, CleanGenius should be true
        }

        this.log.info(`Get command: ${commandLower} => processed command: ${processedCommands} | Rooms ${JSON.stringify(selectedRooms)} | Found ==> ${JSON.stringify(roomActions)} |
                roomFound: ${roomFound}, isCleaningCommand: ${isCleaningCommand} | cleaning mode: ${JSON.stringify(roomsWithCommands)} |
                Cleaning mode set to: ${cleaningMode} (${AlexacleanModes[UserLang][cleaningMode]}) | CleanGenius set to: ${cleanGeniusValue ? 'On' : 'Off'}
                `);

        // Ensure valid suction and mopping values are set
        selectedRooms.forEach(roomNumber => {
          const roomAction = roomActions[roomNumber];
          if (!roomAction.suction) roomAction.suction = suctionLevels[UserLang][0]; // Set to minimum suction level
          if (!roomAction.mopping) roomAction.mopping = moppingLevels[UserLang][0]; // Set to minimum mopping level
        });

        const selectsArray = [];
        let multiRoomId = 1;

        // Prepared StartClean data structure
        const startClean = [{
          'piid': 1,
          'value': 18
        },
        {
          'piid': 10,
          'value': ''
        } // Value will be set later
        ];

        // Prepare actions for each room
        for (const roomNumber of selectedRooms) {
          const roomAction = roomActions[roomNumber];
          const repetitions = roomAction.repetitions || 1;

          // Ensure valid suction and mopping values are selected
          const suctionValue = suctionLevels[UserLang].indexOf(roomAction.suction) >= 0 ? suctionLevels[UserLang].indexOf(roomAction.suction) : 0;
          const moppingValue = moppingLevels[UserLang].indexOf(roomAction.mopping) >= 0 ? moppingLevels[UserLang].indexOf(roomAction.mopping) : 0;

          // Prepare action array for each room
          selectsArray.push([roomNumber, repetitions, suctionValue, moppingValue, multiRoomId]);

          const logEntry = `${roomAction.name} ${roomAction.suction ? roomAction.suction +  AlexaInfo[UserLang][6] : ''} ${roomAction.mopping ? roomAction.mopping +  AlexaInfo[UserLang][7] : ''} ${repetitions}  ${AlexaInfo[UserLang][10]}`;
          readableLog.push(logEntry.trim());

          multiRoomId++;
          roomAction.customCommand = [{'piid': 1, 'value': 18}, {'piid': 10,'value': JSON.stringify({selects: [[roomNumber, repetitions, suctionValue, moppingValue, 1]]})}];
          //this.log.info("============Set Custom Command: " + roomAction.customCommand);
        }

        // Final action for all rooms
        startClean[1].value = JSON.stringify({selects: selectsArray});


        // Check if cleaning is active or paused and if we should interrupt
        const cleaningCompleted = await this.getStateAsync(DH_Did + '.state.CleaningCompleted');
        const cleaningPaused = await this.getStateAsync(DH_Did + '.state.CleaningPaused');

        const isCleaningActive = (cleaningCompleted.val > 0 && cleaningCompleted.val !== null) || cleaningPaused.val === 1;
        const cancelCommandGiven = AlexacancelKeywords[UserLang]?.some(keyword => processedCommands.toLowerCase().includes(keyword));

        if (isCleaningActive) {
          if (cancelCommandGiven) {
            await this.speakToAlexa(AlexaInfo[UserLang][2] + ' ' + readableLog, LastAlexaID, 1);
            // Stop the current cleaning
            await this.setStateAsync(DH_Did + '.control.Stop', true);

            await this.wait(waitingvalue);


            // Prevent starting a new cleaning if `isMonitorCleaningState` is true
            if (!isMonitorCleaningState) {
              this.startCleaning(DH_Did, selectedRooms, roomActions, LastAlexaID, 1);
              this.log.info('Cleaning stopped and a new cleaning process started.');
            } else {
              this.log.info(AlexaInfo[UserLang][2]); //Cannot start a new cleaning process as a cleaning process is being monitored.
              await this.speakToAlexa(AlexaInfo[UserLang][27], LastAlexaID, 1);
            }
          } else {
            await this.speakToAlexa(AlexaInfo[UserLang][2], LastAlexaID, 1);
            this.log.info('Cleaning is active, waiting for user to cancel the cleaning.');
          }
        } else {
          // Prevent starting a new cleaning if `isMonitorCleaningState` is true
          if (!isMonitorCleaningState) {
            await this.speakToAlexa(readableLog, LastAlexaID, 1);
            this.startCleaning(DH_Did, selectedRooms, roomActions, LastAlexaID, 1);
            this.log.info('Started a new cleaning process without checking for cancel command.');
          } else {
            this.log.info(AlexaInfo[UserLang][2]); //Cannot start a new cleaning process as a cleaning process is being monitored.
            await this.speakToAlexa(AlexaInfo[UserLang][27], LastAlexaID, 1);
          }
        }


      }

    }
  }
}

if (require.main !== module) {
  // Export the constructor in compact mode
  /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
  module.exports = (options) => new Dreamehome(options);
} else {
  // otherwise start the instance directly
  new Dreamehome();
}