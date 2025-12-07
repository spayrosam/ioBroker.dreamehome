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

const DH_GenerateMap = require('./lib/generateMap.js');

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
    1: 'Cleaning',
    2: 'Standby',
    3: 'Paused',
    4: 'Paused',
    5: 'Returning to charge',
    6: 'Charging',
    7: 'Mopping',
    8: 'Mop Drying',
    9: 'Mop Washing',
    10: 'Returning to wash',
    11: 'Mapping',
    12: 'Cleaning',
    13: 'Charging Completed',
    14: 'Upgrading',
    15: 'Summon to clean',
    16: 'Self-Repairing',
    17: 'Returning to install the mop pad',
    18: 'Returning to remove the mop pad',
    19: 'Automatic water supply and drainage self testing',
    20: 'Cleaning Mop Pad and Adding Water',
    21: 'Cleaning paused',
    22: 'Auto-Emptying',
    23: 'Remote Controlled Cleaning',
    24: 'The robot is charging intelligently.',
    25: 'The second cleaning underway',
    26: 'Following',
    27: 'Spot cleaning',
    28: 'Returning for dust collection',
    29: 'Waiting for tasks',
    30: 'Cleaning the washboard base',
    33: 'Automatic Water Supply and Drainage Emptying now',
    35: 'Dust Box & Bag Drying in Process',
    36: 'Dust Box & Bag Drying Paused',
    37: 'Heading to the extra cleaning area',
    38: 'Extra Cleaning in Progress',
    97: 'Shortcut running',
    98: 'Camera Monitoring',
    99: 'Camera monitoring paused',
    101: 'Initial Deep Cleaning in Process',
    102: 'Initial Deep Cleaning Paused',
    103: 'Sanitizing',
    104: 'Sanitizing',
    105: 'Switching mop.',
    106: 'Mop Switching Paused',
    107: 'Care in progress',
    108: 'Paused'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Reinigung',
    2: 'Standby',
    3: 'Pausiert',
    4: 'Pausiert',
    5: 'Zurück zum Aufladen',
    6: 'Laden',
    7: 'Wischen',
    8: 'Mopp-Trocknung',
    9: 'Mopp-Reinigung',
    10: 'Rückkehr zum Reinigen',
    11: 'Eine Karte wird erstellt.',
    12: 'Beim Reinigen',
    13: 'Laden beendet',
    14: 'Aktualisieren',
    15: 'Reinigung rufen',
    16: 'Bei der automatischen Reparatur der Basisstation',
    17: 'Zurückkehren zum Installieren des Wischmopps',
    18: 'Zurückkehren, um das Wischpad zu entfernen',
    19: 'Selbsttest der automatischen Wasserzufuhr und -abfluss läuft',
    20: 'Wischmopp reinigen und Wasser nachfüllen',
    21: 'Reinigung pausiert',
    22: 'Automatische Entleerung',
    23: 'Ferngesteuerte Reinigung',
    24: 'Der Roboter lädt intelligent auf.',
    25: 'Die zweite Reinigung wird durchgeführt',
    26: 'Folgend',
    27: 'Partielle Reinigung',
    28: 'Rückfahrt zur Staubsammlung',
    29: 'Auf Aufgaben warten',
    30: 'Reinigung der Waschplattenbasis',
    33: 'Automatische Wasserzufuhr und -ableitung Jetzt entleeren',
    35: 'Trocknung von Staubbehälter und -beutel',
    36: 'Trocknen von Staubbehälter und -beutel angehalten',
    37: 'Weiter zum zusätzlichen Reinigungsbereich',
    38: 'Zusätzliche Reinigung läuft',
    97: 'Shortcut läuft gerade',
    98: 'Die Kameraüberwachung läuft.',
    99: 'Kameraüberwachung pausiert',
    101: 'Anfängliche Tiefenreinigung wird ausgeführt',
    102: 'Anfängliche Tiefenreinigung pausiert',
    103: 'Desinfizieren',
    104: 'Desinfizieren',
    105: 'Wischmopp wird gewechselt',
    106: 'Umschalten des Wischmopps pausiert',
    107: 'Pflege im Gange',
    108: 'Pausiert'
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

const DreameDustBagStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Installed',
    1: 'Not installed',
    2: 'Check'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Installiert',
    1: 'Nicht installiert',
    2: 'Prüfen'
  }
};

const DreameStationDrainageStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Idle',
    1: 'Draining'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leerlauf',
    1: 'Entleeren'
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

const DreameDetergentStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Installed',
    1: 'Disabled',
    2: 'Low detergent'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Installiert',
    1: 'Deaktiviert',
    2: 'Reinigungsmittel niedrig'
  }
};

const DreameMopWashLevel = {
  'EN': {
    '-1': 'Unknown',
    0: 'Light',
    1: 'Standard',
    2: 'Deep',
    3: 'Ultra washing'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leicht',
    1: 'Standard',
    2: 'Tief',
    3: 'Ultra Reinigung'
  }
};

const DreameHotWaterStatus = {
  'EN': {
    '-1': 'Unknown',
    0: 'Disabled',
    1: 'Enabled'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Deaktiviert',
    1: 'Aktiviert'
  }
};

const DreameWaterTemperature = {
  'EN': {
    '-1': 'Unknown',
    0: 'Normal',
    1: 'Mild',
    2: 'Warm',
    3: 'Hot'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Normal',
    1: 'Mild',
    2: 'Warm',
    3: 'Heiß'
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
    1: 'Not installed or full',
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Installiert',
    1: 'Nicht installiert oder voll',
  }
};

const DreamePureWaterTank = {
  'EN': {
    '-1': 'Unknown',
    0: 'Installed',        // INSTALLED
    1: 'Not installed',    // NOT_INSTALLED
    2: 'Low water',        // LOW_WATER
    3: 'Active',           // ACTIVE
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Installiert',
    1: 'Nicht installiert',
    2: 'Wasser niedrig',
    3: 'Aktiv',
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
  'S27P3': 'Dust Bag Staus',
  'S27P4': 'Detergent Status',
  'S27P5': 'Station Drainage Status',
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
  //'S27P17': 'Dust Box Bag Drying',
  'S27P18E1': 'Start Mopp Drying',
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
  //'S27P17E1': [{'siid':27,'piid':17,'value': 0}], // drying duration of 3 hours (10800 seconds) when activated
  'S27P18E1': [{'siid':27,'piid':18,'value': 0}], // Start Mopp Drying  1: "on" 0: "off',
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
  'S27P18E1': {'EN': {0: 'Off', 1: 'On'}, 'DE': {0: 'Aus', 1: 'An'}}, //Start Mopp Drying  1: "on" 0: "off'  //'S27P17E1': drying duration of 3 hours (10800 seconds) when activated
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
let AlexaIsPresent = false; // Global variables to track Alexa service availability
let TelegramPresent = false; // Global variables to track Telegram service availability
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

const {
  Alexanumbers,
  suctionLevels,
  suctionSynonyms,
  moppingLevels,
  moppingSynonyms,
  AlexaRoomsName,
  AlexaRoomsNameSynonyms,
  carpetKeywords,
  carpetCleanActions,
  intensityParams,
  diningTableKeywords,
  diningTableActions,
  diningTableIntensityParams,
  AlexacleanModes,
  AlexacancelKeywords,
  AlexamissingMessages,
  robotKeywords,
  emptyActionWords,
  washActionWords,
  statusCheckWords,
  resetComponentWords,
  resetAllKeywords,
  resetOneKeywords,
  components,
  knownComponentSynonyms,
  componentKeywords,
  knownAbbreviations,
  AlexaInfo,
  TelegramInfo,
  Helpwords
} = require('./lib/keywordsSynonyms.js');


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

    this.DH_GenerateMap = DH_GenerateMap.bind(this);
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

      await this.setObjectNotExists(DH_Did + '.control.NaturalLanguageCommand', {
        type: 'state',
        common: {
          name: 'Natural language command for robot',
          type: 'string',
          role: 'text',
          write: true,
          read: true,
          def: AlexaInfo[UserLang][91].replace(/^\s*[-��]?\s*"?Alexa,?\s*/i, '').replace(/"/g, '')
        },
        native: {},
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
    // Check Alexa service availability
    try {
      const Alexaobj = await this.getForeignStateAsync('alexa2.0.History.summary');
      if (Alexaobj) {
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
	  // Check Telegram service availability
    try {
      const TelegramObj = await this.getForeignStateAsync('telegram.0.communicate.request');
      if (TelegramObj) {
        this.subscribeForeignStates('telegram.0.communicate.request');
        this.log.info(TelegramInfo[UserLang][0]);
        TelegramPresent = true;
      }
    } catch (error) {
      this.log.info(TelegramInfo[UserLang][1]);
      TelegramPresent = false;
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
    const deviceListautoFallback = this.config.deviceListautoFallback !== false;  // Enabled by default

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


        // DEVICE SELECTION PHASE WITH FALLBACK LOGIC
        let selectedDevice;
        let effectiveIndex = selectedDeviceIndex;
        let usedFallback = false;

        // First try: Use configured device index
        if (effectiveIndex >= 0 && effectiveIndex < GetListData.length) {
          selectedDevice = GetListData[effectiveIndex];

          // Validate device structure
          if (!this.isValidDevice(selectedDevice)) {
            this.log.warn(`Configured device at index ${effectiveIndex} is invalid`);
            if (deviceListautoFallback) {
              effectiveIndex = 0;
              selectedDevice = GetListData[0];
              usedFallback = true;
              this.log.warn(`Automatically falling back to first device (index 0)`);
            }
          }
        }
        // Fallback if index is invalid
        else if (deviceListautoFallback) {
          effectiveIndex = 0;
          selectedDevice = GetListData[0];
          usedFallback = true;
          this.log.warn(`Invalid device index ${selectedDeviceIndex}, using first device`);
        }

        // Final validation
        if (!selectedDevice || !this.isValidDevice(selectedDevice)) {
          throw new Error(`No valid device found at index ${effectiveIndex}`);
        }

        // DEVICE INITIALIZATION
        this.log.info(`Selected device [${effectiveIndex}]: ${selectedDevice.model} (DID: ${selectedDevice.did})`);

        // Store device properties
        DH_Did = selectedDevice.did;
        DH_Model = selectedDevice.model;
        DH_Mac = selectedDevice.mac;
        DH_BDomain = selectedDevice.bindDomain;
        DH_Host = DH_BDomain.split('.')[0];

        // Update config if we used fallback
        if (usedFallback) {
          this.config.selectedDeviceIndex = 0;
          this.log.info('Updated configuration to use first device');
        }

        // DEVICE PROPERTIES LOADING
        await this.DH_PropObject(selectedDevice, DH_Did + '.general.', 'Get listV2: ');

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

  // Validates device object structure
  isValidDevice(device) {
    return device && device.did && device.model && device.mac;
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

    // Check if customMapData is available
    if (!customMapData) {
      this.log.warn('customMapData is not available.');
      return;
    }

    if (LogData) { this.log.warn('Test customMapData: ' + JSON.stringify(customMapData)); }

    // Process both carpet structures
    await this.processCarpetData(customMapData, 'carpet_info');
    await this.processCarpetData(customMapData, 'carpet_polygon');
    await this.processFurnitureZones(customMapData);
  }

  // Process both carpet structures
  async processCarpetData(customMapData, carpetType) {
    const carpetInfo = customMapData[carpetType];
    if (!carpetInfo || typeof carpetInfo !== 'object') {
      if (LogData) { this.log.warn(`customMapData.${carpetType} is not available.`); }
      return;
    }

    for (const carpetKey in carpetInfo) {
      const carpetData = carpetInfo[carpetKey];

      // Old structure: [beg_x, beg_y, end_x, end_y, roomIds, extraInfo]
      if (carpetType === 'carpet_info' && Array.isArray(carpetData) && carpetData.length >= 4) {
        const [beg_x, beg_y, end_x, end_y, roomIds, extraInfo] = carpetData;

        if (Array.isArray(roomIds)) {
          for (const roomId of roomIds) {
            for (const room of CheckArrayRooms) {
              if (room.carpet_info === undefined) {
                room.carpet_info = false;
              }
              if (room.Id === roomId) {
                room.carpet_info = true;
                const CarpetCord = {
                  Cord: [beg_x, beg_y, end_x, end_y],
                  type: 'rectangle',
                  sourceType: 'carpet_info'
                };
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
        }

      // New structure: [polygonPoints, material, flags]
      } else if (carpetType === 'carpet_polygon' && Array.isArray(carpetData) && carpetData.length === 3 && Array.isArray(carpetData[0])) {
        const [polygonPoints, material, flags] = carpetData;

        // Calculate bounding box and center point
        const boundingBox = await this.calculatePolygonBoundingBox(polygonPoints);
        const [minX, minY, maxX, maxY] = boundingBox;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Find room that contains the center point
        const targetRoom = await this.findRoomForPoint(centerX, centerY);

        if (targetRoom) {
          if (targetRoom.carpet_info === undefined) { // If carpet_info is not defined, set it to false
            targetRoom.carpet_info = false; // Default value if not provided
          }
          targetRoom.carpet_info = true; // Set carpet_info to true if the room has a carpet
          const CarpetCord = {
            Cord: boundingBox,
            polygonPoints: polygonPoints,
            type: 'polygon',
            material: material,
            flags: flags,
            sourceType: 'carpet_polygon'
          };
          await this.DH_setCarpetPath(
            DH_Did + `.map.${DH_CurMap}.${targetRoom.Name}.CleanCarpet${carpetKey}`,
            `${targetRoom.Name} Carpet${carpetKey}`,
            CarpetCord
          );
          await this.DH_setRoomPath(
            DH_Did + `.map.${DH_CurMap}.${targetRoom.Name}.CarpetRepetition${carpetKey}`,
            DreameSetRepeat[UserLang],
            `${targetRoom.Name} Carpet Repeat`
          );
          await this.DH_setRoomPath(
            DH_Did + `.map.${DH_CurMap}.${targetRoom.Name}.CarpetSuctionLevel${carpetKey}`,
            DreameSuctionLevel[UserLang],
            `${targetRoom.Name} Carpet Suction Level`
          );
          this.log.info(`Found Polygon Carpet ${carpetKey} in room ${targetRoom.Name}`);
        } else {
          this.log.warn(`Polygon Carpet ${carpetKey} could not be assigned to any room`);
        }
      } else {
        this.log.warn(`Invalid ${carpetType} data for carpet ${carpetKey}: ${JSON.stringify(carpetData)}`);
      }
    }
  }

  // Helper function to calculate bounding box
  async calculatePolygonBoundingBox(polygonPoints) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < polygonPoints.length; i += 2) {
      const x = polygonPoints[i];
      const y = polygonPoints[i + 1];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return [minX, minY, maxX, maxY];
  }

  // Helper function to find room for a point
  async findRoomForPoint(x, y) {
    for (const room of CheckArrayRooms) {
      if (await this.isPointInRoomBoundingBox(x, y, room)) {
        return room;
      }
    }
    return null;
  }

  // Simple bounding box check for room
  async isPointInRoomBoundingBox(x, y, room) {
    if (!room.X.length || !room.Y.length) return false;

    const minX = Math.min(...room.X);
    const maxX = Math.max(...room.X);
    const minY = Math.min(...room.Y);
    const maxY = Math.max(...room.Y);

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }


  // Function to process furniture zones based on the given custom map data
  async processFurnitureZones(customMapData) {
    const furnitureInfo = customMapData.funiture_info; // Accessing the furniture information from customMapData
    if (!Array.isArray(furnitureInfo)) {
      if (LogData) { this.log.warn('No furniture info available'); }
      return;
    }

    // Possible table types based on size and type
    const possibleTables = [];

    for (const furniture of furnitureInfo) {
      if (Array.isArray(furniture) && furniture.length >= 9) {
        const [furnitureId, type, subtype, width, height, rotation, posX, posY, angle] = furniture;

        // Criteria for tables:
        // - Type 6
        // - Minimum size of 600mm (to exclude chairs)
        // - Not too large (under 2200mm)
        // - Height between 600mm and 1000mm
        if ([6].includes(type) && width >= 600 && width <= 2200 && height >= 600 && height <= 1000) {
          possibleTables.push({
            id: furnitureId,
            type: type,
            subtype: subtype,
            width: width,
            height: height,
            posX: posX,
            posY: posY,
            angle: angle
          });

          await this.createTableZone(furnitureId, type, width, height, posX, posY, angle);
        }
      }
    }

    if (LogData) {
      this.log.warn(`Found ${possibleTables.length} possible tables: ${JSON.stringify(possibleTables)}`); // Log the number of possible tables found
    }
  }

  // Async function to create a dining table zone around a table for cleaning purposes
  async createTableZone(furnitureId, type, width, height, posX, posY, angle) {
    // Define padding around the table for the cleaning zone (10 cm buffer)
    const zonePadding = 100; // 10cm buffer around the table
    const zoneWidth = width + zonePadding * 2; // Total width of the cleaning zone (table width + padding)
    const zoneHeight = height + zonePadding * 2; // Total height of the cleaning zone (table height + padding)

    // Calculate the coordinates of the rotated zone based on position, size, and rotation angle
    const zoneCoordinates = await this.calculateRotatedZone(posX, posY, zoneWidth, zoneHeight, angle);

    // Find the room that contains the table based on its position
    const targetRoom = await this.findRoomForPoint(posX, posY);

    // If a valid room is found, create the zone configuration
    if (targetRoom) {
      const zoneConfig = {
        type: 'dining_table_zone', // Zone type is a dining table
        furnitureType: type, // Type of furniture (table type)
        furnitureId: furnitureId, // Unique furniture ID
        coordinates: zoneCoordinates, // Coordinates of the rotated zone
        center: [posX, posY], // The center position of the table
        dimensions: [zoneWidth, zoneHeight], // The width and height of the zone
        originalSize: [width, height], // Original size of the table
        rotation: angle, // Rotation angle of the table
        padding: zonePadding // Padding around the table for cleaning
      };

      // Save the created zone using the DH_setCarpetPath method
      await this.DH_setCarpetPath(
        DH_Did + `.map.${DH_CurMap}.${targetRoom.Name}.DiningTableZone`, // Constructing the zone path
        `${targetRoom.Name} Dining Table Zone`,
        zoneConfig // The zone configuration object containing all necessary data
      );

		 await this.DH_setRoomPath(
        DH_Did + `.map.${DH_CurMap}.${targetRoom.Name}.DiningTableSuctionLevel`,
        DreameSuctionLevel[UserLang],
        `${targetRoom.Name} Dining Table Suction Level`
      );

      await this.DH_setRoomPath(
        DH_Did + `.map.${DH_CurMap}.${targetRoom.Name}.DiningTableWaterVolume`,
        DreameSetWaterVolume[UserLang],
        `${targetRoom.Name} Dining Table Water Volume`
      );

      await this.DH_setRoomPath(
        DH_Did + `.map.${DH_CurMap}.${targetRoom.Name}.DiningTableRepeat`,
        DreameSetRepeat[UserLang],
        `${targetRoom.Name} Dining Table Repeat`
      );

      // Log the creation of the dining table zone in the specified room
      this.log.info(`Created dining table zone in room ${targetRoom.Name} at (${posX}, ${posY})`);
    }
  }

  // Function to calculate the coordinates of a rotated zone (rectangle) based on the given center, size, and rotation angle
  async calculateRotatedZone(centerX, centerY, width, height, angle) {
    // Convert the angle from degrees to radians for use in trigonometric functions
    const angleRad = angle * Math.PI / 180;

    // Calculate half the width and half the height to define the corners relative to the center
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Define the 4 corners of the zone (rectangle) relative to the center before rotation
    const corners = [
      { x: -halfWidth, y: -halfHeight }, // Top-left corner
      { x: halfWidth, y: -halfHeight },  // Top-right corner
      { x: halfWidth, y: halfHeight },   // Bottom-right corner
      { x: -halfWidth, y: halfHeight }   // Bottom-left corner
    ];

    // Rotate each corner around the center by the given angle
    const rotatedCorners = corners.map(corner => {
      // Rotate the corner point using the rotation matrix
      const rotatedX = corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad); // X coordinate after rotation
      const rotatedY = corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad); // Y coordinate after rotation
      // Translate the rotated corner back to the original center position
      return [centerX + rotatedX, centerY + rotatedY];
    });

    // Return the flattened array of rotated corner coordinates
    return rotatedCorners.flat();
  }

  // Automatically find the room with a dining table
  async findRoomWithDiningTable() {
    try {
      const zonePattern = `${DH_Did}.map.${DH_CurMap}.*.DiningTableZone`;
      this.log.info(`[DiningTable] Searching for: ${zonePattern}`);

      // Simply search for states and parse the path
      const zoneStates = await this.getStatesAsync(zonePattern);
      this.log.info(`[DiningTable] Found ${Object.keys(zoneStates).length} matching states`);

      for (const [path, state] of Object.entries(zoneStates)) {
        this.log.info(`[DiningTable] Checking path: ${path}`);

        if (state) {
          const pathParts = path.split('.');
          const roomName = pathParts[pathParts.length - 2]; // Example: kitchen
          this.log.info(`[DiningTable] SUCCESS: Found dining table in room: "${roomName}"`);
          return roomName;
        }
      }

      this.log.warn('[DiningTable] No dining table zones found');
      return null;
    } catch (error) {
      this.log.error(`[DiningTable] Error: ${error.message}`);
      return null;
    }
  }

  //Debug function to check all available states for DiningTableZone
  async debugDiningTableStates() {
    try {
      // Check all possible patterns
      const patterns = [
        `${DH_Did}.map.${DH_CurMap}.*.DiningTableZone`,
        `${DH_Did}.map.${DH_CurMap}.*.*`
      ];

      for (const pattern of patterns) {
        this.log.info(`[Debug] Checking pattern: ${pattern}`);
        const states = await this.getStatesAsync(pattern);
        this.log.info(`[Debug] Found ${Object.keys(states).length} states for pattern: ${pattern}`);

        for (const [path, state] of Object.entries(states)) {
          if (path.includes('DiningTable') || path.includes('Esstisch')) {
            this.log.info(`[Debug] Relevant path: ${path} - state: ${JSON.stringify(state)}`);
          }
        }
      }
    } catch (error) {
      this.log.error(`[Debug] Error debugging states: ${error.message}`);
    }
  }

  async cleanDiningTableZone(roomName) {
    try {
      // Load the dining table zone OBJECT based on the room name and current map configuration
      const zonePath = `${DH_Did}.map.${DH_CurMap}.${roomName}.DiningTableZone`;
      const zoneObject = await this.getObjectAsync(zonePath);

      if (!zoneObject || !zoneObject.native) {
        this.log.warn(`No dining table zone object found for room: ${roomName}`);
        return false;
      }

      // Load the cleaning parameters
      const suctionLevelState = await this.getStateAsync(`${DH_Did}.map.${DH_CurMap}.${roomName}.DiningTableSuctionLevel`);
      const waterVolumeState = await this.getStateAsync(`${DH_Did}.map.${DH_CurMap}.${roomName}.DiningTableWaterVolume`);
      const repeatState = await this.getStateAsync(`${DH_Did}.map.${DH_CurMap}.${roomName}.DiningTableRepeat`);

      // Default values in case they are not set
      const suctionLevel = suctionLevelState?.val !== undefined ? suctionLevelState.val : 1;
      const waterVolume = waterVolumeState?.val !== undefined ? waterVolumeState.val : 1;
      const repeat = repeatState?.val !== undefined ? repeatState.val : 1;

      // Determine dynamic cleaning mode based on settings
      let cleaningMode;
      if (waterVolume === -1) {
        // Only sweeping if water volume is -1
        cleaningMode = 5122; // Sweeping
        this.log.info(`[DiningTable] Water volume is 0 - using Sweeping mode only`);
      } else if (suctionLevel === -1) {
        // Only mopping if suction level is -1
        cleaningMode = 5121; // Mopping
        this.log.info(`[DiningTable] Suction level is 0 - using Mopping mode only`);
      } else {
        // Both sweeping and mopping if suction level > 0 AND water volume > 0
        cleaningMode = 5120; // Sweeping and mopping
        this.log.info(`[DiningTable] Using Sweeping and Mopping mode`);
      }


      const zoneConfig = zoneObject.native;

      // Calculate the bounding box of the polygon representing the dining table area
      const boundingBox = await this.calculatePolygonBoundingBox(zoneConfig.coordinates);

      // Start cleaning the zone by sending a cleaning command
      const cleanCommand = await this.DH_CleanZonePoint(
        1, // cleaning areas (not individual points)
        [boundingBox], // The array containing the bounding box of the zone to be cleaned
        1, // repeat count (hardcoded for now)
        0, // suction level (hardcoded for now - will be dynamic later)
        0  // water volume (hardcoded for now - will be dynamic later)
      );

      if (cleanCommand) {
        // Set the vacuum cleaning mode with dynamic mode selection
        let modeSetSuccessfully = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Use dynamically determined cleaning mode
            await this.setStateAsync(`${DH_Did}.control.CleaningMode`, cleaningMode);
            await this.wait(300);

            // Verify if the cleaning mode was set correctly
            const currentMode = await this.getStateAsync(`${DH_Did}.state.CleaningMode`);
            if (currentMode?.val === AlexacleanModes[UserLang][cleaningMode]) {
              modeSetSuccessfully = true;
              break;
            }
          } catch (err) {
            this.log.error(`[DiningTable] Mode setting attempt ${attempt} failed: ${err.message}`);
          }
          await this.wait(500 * attempt);
        }

        // If mode setting failed after 3 attempts, log an error and return false
        if (!modeSetSuccessfully) {
          this.log.info(`[DiningTable] ${AlexaInfo[UserLang][46]}`);
          return false;
        }

        const requestId = Math.floor(Math.random() * 9000) + 1000;
        const AiidAction = [{
          'piid': 1,
          'value': 19
        }, {
          'piid': 10,
          'value': cleanCommand  // Pass the cleanCommand to be executed
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
          // Send the request to the device URL to start the cleaning process
          await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, SETURLData);
          this.log.info(`Started dining table zone cleaning in ${roomName} with mode ${cleaningMode}: ${JSON.stringify(boundingBox)}`);
          return true;
        } catch (err) {
          this.log.warn('Dining table zone cleaning failed: ' + err);
          return false;
        }
      }

      // If no clean command was issued, return false
      return false;

    } catch (error) {
      this.log.error(`Error cleaning dining table zone: ${error.message}`);
      return false;
    }
  }

  // Function to set the dining table cleaning parameters
  async setDiningTableCleaningParams(roomName, params) {
    const { suctionLevel, waterVolume, repetitions } = params;

    // Set the parameters for the dining table cleaning
    await this.setStateAsync(
      `${DH_Did}.map.${DH_CurMap}.${roomName}.DiningTableSuctionLevel`,
      suctionLevel
    );
    await this.setStateAsync(
      `${DH_Did}.map.${DH_CurMap}.${roomName}.DiningTableWaterVolume`,
      waterVolume
    );
    await this.setStateAsync(
      `${DH_Did}.map.${DH_CurMap}.${roomName}.DiningTableRepeat`,
      repetitions
    );

    this.log.info(`[DiningTable] Parameters set for ${roomName}: suction=${suctionLevel}, water=${waterVolume}, repetitions=${repetitions}`);
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
              if (SPkey === 'S27P18E1') {
                try {
                  const S2P1Readpath = DH_Did + '.state.' + DreameStateProperties['S2P1'];
                  const S2P1State = await this.getStateAsync(S2P1Readpath);
                  RetPointValue = (S2P1State && S2P1State.val === DreameVacuumState[UserLang][35]) ? 1 : 0;
                  if (LogData) {
                    this.log.info(`Drying status for ${SPkey} set to ${RetPointValue} based on S2P1 = ${S2P1State.val}`);
                  }
                } catch (err) {
                  RetPointValue = 0; // fallback
                  if (LogData) this.log.warn(`Failed reading S2P1 for drying: ${err}`);
                }
              } else {
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

  // Creates all required ioBroker states for a room
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

  // Updates all states for a room
  async updateRoomStates(roomPath, data) {
    for (const [key, value] of Object.entries(data)) {
      await this.setStateAsync(`${roomPath}.${key}`, { val: value, ack: true });
    }
  }

  // Resets all tracking variables
  async resetVariables() {
    visitedPointsPerSegment = {}; // Clear visited points tracking
    lastPosition = null; // Reset last known position
    roomData = {}; // Clear all room data
  }

  // Bresenham's line algorithm to get all points between two coordinates
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

  // Calculates coverage percentage for a room
  async calculateCoveragePercent(segment, visitedPointsSet) {
  // 1. Calculate total area of the segment in dm�
    const totalArea = (await this.calculatePolygonArea(segment.X, segment.Y)) / 100;

    // 2. Calculate covered area (1 point = 1dm�)
    const coveredArea = (visitedPointsSet.size / 100);

    // 3. Calculate percentage (capped at 100%)
    const percent = Math.min(100, (coveredArea / totalArea) * 100);

    return parseFloat(percent.toFixed(2));
  }

  // Calculates area of a polygon using the shoelace formula
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

      //this.log.info(`=======> from mqttClient.on: Topic = ${topic.toString()} | Message = ${message.toString()}`);

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


  async DH_SetPropSPID(InSetPropSPID, InSetvalue) {

	  //if ((InSetPropSPID !== 'S6P3' /*"Status"*/ ) && (InSetPropSPID !== 'S6P1' /*"Status"*/ )) { this.log.info(`=======> from DH_SetPropSPID: (${InSetPropSPID}) Set to : ${InSetvalue}`);}
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

	  const fixedValue  = parseInt(InSetvalue);
	  // Log only if the value was changed from -1
      if (fixedValue === -1) {
        this.log.warn(`Water volume value was -1 and has been changed to the highest level (3)`);
      }
      InSetvalue = DreameWaterVolume[UserLang][fixedValue === -1 ? 3 : fixedValue];
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
    if (InSetPropSPID == 'OLDS27P1' /*"Pure water tank"*/ ) {
      let DWpath = DH_Did + '.state.' + DreameStateProperties['S4P41'].replace(/\w\S*/g, function(SPName) { /*"Change Low water warning Object"*/
        return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
      }).replace(/\s/g, '');
      if (InSetvalue == 1) {
        await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][6], true);
      } else if (InSetvalue == 2) {
        await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][2], true);
      } else if (InSetvalue == 3) {
        await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][0], true);
      }
      DWpath = DH_Did + '.state.' + DreameStateProperties['S4P6'].replace(/\w\S*/g, function(SPName) { /*"Change Water tank Object"*/
        return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
      }).replace(/\s/g, '');
      if (InSetvalue == 1) {
        await this.DH_setState(DWpath, DreameWaterTank[UserLang][0], true);
      } else if (InSetvalue == 2) {
        await this.DH_setState(DWpath, DreameWaterTank[UserLang][1], true);
      } else if (InSetvalue == 3) {
        await this.DH_setState(DWpath, DreameWaterTank[UserLang][1], true);
      }

      this.log.warn(`Water tank removed. InSetvalue: ${InSetvalue} and firstStartWaterTrack: ${firstStartWaterTrack}`);
      // Handle tank status changes
      await this.handleTankStatusChange(InSetvalue);

      InSetvalue = DreamePureWaterTank[UserLang][parseInt(InSetvalue)];
    }

    if (InSetPropSPID == 'S27P1' /* "Pure water tank" */) {
      const statusCode = parseInt(InSetvalue);

      // 1. Low Water Warning Status
      // Build the state path for the low water warning property.
      let DWpath = DH_Did + '.state.' + DreameStateProperties['S4P41']
        .replace(/\w\S*/g, function(SPName) {
          return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
        })
        .replace(/\s/g, ''); // Remove all spaces

      // Expected meanings of statusCode:
      // 0 = Tank installed
      // 1 = Tank not installed
      // 2 = Low water
      // 3 = Active (working state)

      let lowWarningValue;
      if (statusCode === 0) { // INSTALLED
        // No warning when the tank is properly installed
        lowWarningValue = DreameLowWaterWarning[UserLang][0];
      } else if (statusCode === 1) { // NOT_INSTALLED
        // Warning: The tank is missing
        lowWarningValue = DreameLowWaterWarning[UserLang][6];
      } else if (statusCode === 2) { // LOW_WATER
        // Warning: Water is empty
        lowWarningValue = DreameLowWaterWarning[UserLang][2];
      } else if (statusCode === 3) { // ACTIVE
        // No warning while tank is active and functioning
        lowWarningValue = DreameLowWaterWarning[UserLang][0];
      } else {
        // Unexpected statusCode ? Unknown state
        lowWarningValue = DreameLowWaterWarning[UserLang]['-1'];
      }

      // Write the low-water warning state
      await this.DH_setState(DWpath, lowWarningValue, true);

      // 2. Water Tank Status
      // Build the state path for the general water tank status.
      DWpath = DH_Did + '.state.' + DreameStateProperties['S4P6']
        .replace(/\w\S*/g, function(SPName) {
          return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
        })
        .replace(/\s/g, '');

      // Get textual status from DreamePureWaterTank mapping.
      const waterTankValue = DreamePureWaterTank[UserLang][statusCode.toString()] ||
                        DreamePureWaterTank[UserLang]['-1'];  // Fallback to "-1" ("Unknown") if the status code does not exist.

      // Write the water tank state
      await this.DH_setState(DWpath, waterTankValue, true);

      // Log tank status for debugging
      this.log.info(`Water tank status: ${statusCode} = ${waterTankValue}, firstStartWaterTrack: ${firstStartWaterTrack}`);

      // Handle tank status changes
      await this.handleTankStatusChange(statusCode);

      // Do not overwrite InSetvalue � only log the interpreted value
      this.log.info(`Pure water tank: ${DreamePureWaterTank[UserLang][statusCode.toString()]}`);
    }

	    if (InSetPropSPID == 'S27P3' /*Dust Bag Staus"*/ ) {
      InSetvalue = DreameDustBagStatus[UserLang][parseInt(InSetvalue)];
    }
		    if (InSetPropSPID == 'S27P4' /*"Detergent Status"*/ ) {
      InSetvalue = DreameDetergentStatus[UserLang][parseInt(InSetvalue)];
    }
		    if (InSetPropSPID == 'S27P5' /*"Station Drainage Status"*/ ) {
      InSetvalue = DreameStationDrainageStatus[UserLang][parseInt(InSetvalue)];
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
    if (InSetvalue == 1 && firstStartWaterTrack) { // Tank removed
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
    else if ((InSetvalue == 0 || InSetvalue == 2 || InSetvalue == 3) && firstStartWaterTrack) { // Tank inserted
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

	              // Set vacuum mode with retry logic
    let modeSetSuccessfully = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.setStateAsync(`${DH_Did}.control.CleaningMode`, 5122);
        await this.wait(300); // Short delay for mode change

        // Verify mode was set correctly
        const currentMode = await this.getStateAsync(`${DH_Did}.state.CleaningMode`);
        if (currentMode?.val === AlexacleanModes[UserLang][5122]) {
          modeSetSuccessfully = true;
          break;
        }
      } catch (err) {
        this.log.error(`[Carpet] Mode setting attempt ${attempt} failed: ${err.message}`);
      }
      await this.wait(500 * attempt); // Progressive backoff
    }

    if (!modeSetSuccessfully) {
      this.log.info(`[Carpet] ${AlexaInfo[UserLang][46]}`);
      return;
    }

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

  async findCarpetObject(roomName) {
    const GetAdapterPath = this.config.selectedDeviceIndex;


    const prefix = `dreamehome.${GetAdapterPath}.${DH_Did}.map.${DH_CurMap}`;
    const pattern = `dreamehome.${GetAdapterPath}.${DH_Did}.map.${DH_CurMap}.${roomName}.CleanCarpet*`;
    const objects = await this.getObjectViewAsync('system', 'state', {
      startkey: pattern.replace('*', ''),
      endkey: pattern.replace('*', '\u9999')
    });

    return objects?.rows[0]?.value;
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

  // Helper function to handle all message sources
  async notifyUser(message, AlexaID, source) {
    switch (source) {
      case 'alexa':
        await this.speakToAlexa(message, AlexaID);
        break;
      case 'telegram':
        await this.setForeignStateAsync('telegram.0.communicate.requestResponse', message.toString(), false);
        break;
      case 'nspanel':
      // NSPanel
        break;
      default:
        this.log.info(`Notification: ${message}`);
    }
  }

  // Helper function to handle different response types
  async sendResponse(message, AlexaID, source) {
	  // this.log.info(JSON.stringify(CheckArrayRooms));
  // Get a valid room name based on requirements
    const getValidRoom = (requireCarpet = false) => {
      if (!Array.isArray(CheckArrayRooms)) return '{ROOM}';

      const validRooms = requireCarpet
        ? CheckArrayRooms.filter(room => room?.carpet_info)
        : CheckArrayRooms;

      return validRooms.length
        ? validRooms[Math.floor(Math.random() * validRooms.length)]?.Name
        : '{ROOM}';
    };

    // Process message by replacing placeholders
    const processMessage = (text) => {
      const isCarpetCommand = /carpet|Teppich/i.test(text);
      let processed = text;

      // Replace all {ROOM} placeholders (different rooms in combined commands)
      processed = processed.replace(/\{ROOM\}/g, () => getValidRoom(isCarpetCommand));

      // Replace all {NUMBER} placeholders
      processed = processed.replace(/\{NUMBER\}/g, () => Math.floor(Math.random() * 3) + 1);

      return processed;
    };

    try {
      switch (source) {
        case 'alexa':
          await this.speakStatusInParts(message, AlexaID);
          break;

        case 'telegram': {
        // Remove Alexa prefix and process placeholders
          let telegramMsg = message.replace(/Alexa,\s*/gi, '');
          telegramMsg = processMessage(telegramMsg);
          await this.setForeignStateAsync(
            'telegram.0.communicate.requestResponse',
            telegramMsg.toString(),
            false
          );
          break;
        }

        case 'nspanel':
        // NSPanel
          break;

        default:
          this.log.warn(`Unknown response target: ${source}`);
      }
    } catch (error) {
      this.log.error(`Error in sendResponse: ${error}`);
    }
  }

  // Function to handle Auto-Empty process
  async startAutoEmpty(AlexaID, source) {
    // Start Auto-Emptying command
    await this.setStateAsync(`${DH_Did}.control.StartAutoEmpty`, true);
    this.log.info('Robot sent for auto-emptying.');
    //await this.speakToAlexa(AlexaInfo[UserLang][28], AlexaID); // Notify Alexa

    await this.notifyUser(AlexaInfo[UserLang][28], AlexaID, source);

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
    await this.notifyUser(AlexaInfo[UserLang][29], AlexaID, source);

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
  async startAutoWash(AlexaID, source) {
  // Send robot to wash the mop
    await this.setStateAsync(`${DH_Did}.control.StartWashing`, true);
    this.log.info('Robot sent for mop washing.');
    await this.notifyUser(AlexaInfo[UserLang][30], AlexaID, source);


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
    await this.notifyUser(AlexaInfo[UserLang][31], AlexaID, source);

    // Safely try to resume cleaning
    await this.tryResumeCleaning(AlexaID);
  }

  //  Waits until the robot is successfully docked. 1: Skips unnecessary steps if already docked. 2: Handles "Return to charge" status efficiently.
  async waitUntilDocked() {
  // Possible states when the robot is considered "docked"
    const dockedStates = [
      DreameChargingStatus[UserLang][1], // "Charging"
      DreameChargingStatus[UserLang][3]  // "Charging completed"
    ];

    const returnToChargeState = DreameChargingStatus[UserLang][5]; // "Return to charge"
    let chargingStatus = (await this.getStateAsync(`${DH_Did}.state.ChargingStatus`))?.val;

    // If already docked, exit early
    if (dockedStates.includes(chargingStatus)) {
      this.log.info('Robot is already docked.');
      return;
    }

    // If not docked, wait for it to return and dock
    this.log.info('Robot is not docked. Waiting for return to dock...');

    // Wait until robot starts returning (if not already in "Return to charge" state)
    if (chargingStatus !== returnToChargeState) {
      do {
        await this.wait(2000); // Check every 2 seconds
        chargingStatus = (await this.getStateAsync(`${DH_Did}.state.ChargingStatus`))?.val;
      } while (chargingStatus !== returnToChargeState);
    }

    // Wait until docking is confirmed (status changes to "Charging" or "Charging completed")
    do {
      await this.wait(2000);
      chargingStatus = (await this.getStateAsync(`${DH_Did}.state.ChargingStatus`))?.val;
    } while (!dockedStates.includes(chargingStatus));

    this.log.info('Robot successfully docked.');
  }

  async checkSingleComponentStatus(componentKey, AlexaID, source) {
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
    await this.sendResponse(report, AlexaID, source);

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
  async checkRobotStatus(command, AlexaID, source) {
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
    await this.sendResponse(finalReport, AlexaID, source);

    isComponentsSayState = false; // Reset or update the flag after speaking
  }


  // Function to speak the report in parts with waiting time in between
  async speakStatusInParts(report, AlexaID) {
  // Get a random room name from CheckArrayRooms: returns rooms with carpets if true
    const getRandomRoom = (requireCarpet = false) => {
    // Validate rooms array exists and has items
      if (!Array.isArray(CheckArrayRooms)) return '{ROOM}';

      // Filter rooms by carpet requirement
      const availableRooms = requireCarpet
        ? CheckArrayRooms.filter(room => room?.carpet_info)
        : CheckArrayRooms;

      // Return random room name or placeholder if none available
      return availableRooms.length
        ? availableRooms[Math.floor(Math.random() * availableRooms.length)]?.Name
        : '{ROOM}';
    };

    // Replace placeholders in text with actual values
    const replacePlaceholders = (text) => {
      try {
      // Check if this is a carpet-related command
        const isCarpetCommand = /carpet|Teppich/i.test(text);

        // Replace all {ROOM} placeholders
        let result = text.replace(/{ROOM}/g, () => getRandomRoom(isCarpetCommand));

        // Replace all {NUMBER} placeholders with random 1-3
        result = result.replace(/{NUMBER}/g, () => Math.floor(Math.random() * 3) + 1);

        return result;
      } catch (error) {
        this.log.error(`Placeholder replacement failed: ${error}`);
        return text; // Return original text if replacement fails
      }
    };

    // Split report into individual lines
    const parts = report.split('\n');

    // Process each line separately
    for (const part of parts) {
    // Skip empty lines
      if (!part.trim()) continue;

      // Remove list prefix if present
      const cleanPart = part.replace(/^- /, '');

      // Replace placeholders in the text
      const processedText = replacePlaceholders(cleanPart);

      // Send the processed text to Alexa
      await this.speakToAlexa(processedText, AlexaID);

      // Calculate and wait appropriate delay between messages
      const waitTime = await this.estimateWaitTime(processedText);
      await this.wait(waitTime); // Wait for the estimated time before continuing
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
    const minTime = 1000;
    const maxTime = 25000;
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

    // Handle missing cleanOrder
    if (cleanOrder === null) {
      this.log.warn(AlexaInfo[UserLang][45](roomId));
		  cleanOrder = 1;
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

  // Check: contains at least one device-related word AND one help-related word
  async containsHelpAndDevice(commandLower) {
    const words = Helpwords[UserLang] || Helpwords['EN']; // Fallback zu DE

    const hasHelpWord = words.helpWords.some(word => commandLower.includes(word));
    const hasDeviceWord = words.deviceWords.some(word => commandLower.includes(word));

    return hasHelpWord && hasDeviceWord;
  }

  async normalizeCommand(command) {
    let normalized = command.toLowerCase();

		  const numberWordMap = {
      // German
      'eins': '1',
      'zwei': '2',
      'drei': '3',
      'vier': '4',
      'fünf': '5',
      'sechs': '6',
      'ein': '1',

      // English
      'one': '1',
      'two': '2',
      'three': '3',
      'four': '4',
      'five': '5',
      'six': '6',
    };

    for (const [word, number] of Object.entries(numberWordMap)) {
      const regex = new RegExp(`\\b${word}\\b`, 'g'); // replace whole words only
      normalized = normalized.replace(regex, number);
    }

    return normalized;
  }


  // ====================== SYNONYM SUBMENU DISPLAY ======================
  // Displays the complete synonym submenu with all categories. Source - The source of the command ('alexa' or 'telegram')
  async sendSynonymSubmenu(AlexaID, source) {
    const submenu = [
      AlexaInfo[UserLang][104], // "Which synonym category would you like?"
      AlexaInfo[UserLang][105], // "1 Room names"
      AlexaInfo[UserLang][106], // "2 Suction levels"
      AlexaInfo[UserLang][107], // "3 Mopping levels"
      AlexaInfo[UserLang][108], // "4 Emptying commands"
      AlexaInfo[UserLang][109], // "5 Mop washing commands"
      AlexaInfo[UserLang][110], // "6 Status check commands"
      AlexaInfo[UserLang][111], // "7 Reset commands"
      AlexaInfo[UserLang][112], // "8 All synonym categories"
	  await this.generateSynonymExamples(),
      AlexaInfo[UserLang][113],  // "Say the number or name"
	  AlexaInfo[UserLang][128] // "Say 'back' to return to main menu"
    ].join('\n');

    await this.sendResponse(submenu, AlexaID, source);
  }

  // ====================== SYNONYM SUBMENU PROCESSING ======================
  async handleSynonymSubmenu(command, AlexaID, source) {
  // Map user inputs to corresponding handler functions
    const responses = {
      '1': () => this.sendRoomSynonyms(AlexaID, source),
      '2': () => this.sendSuctionSynonyms(AlexaID, source),
      '3': () => this.sendMoppingSynonyms(AlexaID, source),
      '4': () => this.sendEmptyingSynonyms(AlexaID, source),
      '5': () => this.sendWashingSynonyms(AlexaID, source),
      '6': () => this.sendStatusSynonyms(AlexaID, source),
      '7': () => this.sendResetSynonyms(AlexaID, source),
      '8': () => this.sendAllSynonyms(AlexaID, source),
      'room': () => this.sendRoomSynonyms(AlexaID, source),
      'suction': () => this.sendSuctionSynonyms(AlexaID, source),
      'mopping': () => this.sendMoppingSynonyms(AlexaID, source),
      'empty': () => this.sendEmptyingSynonyms(AlexaID, source),
      'wash': () => this.sendWashingSynonyms(AlexaID, source),
      'status': () => this.sendStatusSynonyms(AlexaID, source),
      'reset': () => this.sendResetSynonyms(AlexaID, source),
      'all': () => this.sendAllSynonyms(AlexaID, source),
      'example': () => this.sendAdditionalExamples(AlexaID, source),
      'beispiel': () => this.sendAdditionalExamples(AlexaID, source)
    };

    // Execute matching handler
    for (const [key, handler] of Object.entries(responses)) {
      if (command.includes(key)) {
        await handler();
        // IMPORTANT: Do NOT return to main menu here - submenu stays active
        return true;
      }
    }

    // No match found - send error response
    await this.sendResponse(AlexaInfo[UserLang][102], AlexaID, source);
    return false;
  }

  // ====================== CATEGORY-SPECIFIC SYNONYM HANDLERS ======================
  async sendRoomSynonyms(AlexaID, source) {
    const allSynonyms = [];

    for (const [synonym, official] of Object.entries(AlexaRoomsNameSynonyms[UserLang])) {
      if (synonym.toLowerCase() !== official.toLowerCase() && official !== 'Room') {
        allSynonyms.push(`"${synonym}"`);
      }
    }

    const shuffled = [...allSynonyms].sort(() => Math.random() - 0.5);
    const examples = shuffled.slice(0, 5).join(', ');

    await this.sendResponse(`${AlexaInfo[UserLang][114]} ${examples}`, AlexaID, source);
  }

  async sendSuctionSynonyms(AlexaID, source) {
    const allSynonyms = [];

    for (const [synonym, official] of Object.entries(suctionSynonyms[UserLang])) {
      if (synonym.toLowerCase() !== official.toLowerCase()) {
        allSynonyms.push(`"${synonym}"`);
      }
    }

    const shuffled = [...allSynonyms].sort(() => Math.random() - 0.5);
    const examples = shuffled.slice(0, 5).join(', ');

    await this.sendResponse(`${AlexaInfo[UserLang][115]} ${examples}`, AlexaID, source);
  }

  async sendMoppingSynonyms(AlexaID, source) {
    const allSynonyms = [];

    for (const [synonym, official] of Object.entries(moppingSynonyms[UserLang])) {
      if (synonym.toLowerCase() !== official.toLowerCase()) {
        allSynonyms.push(`"${synonym}"`);
      }
    }

    const shuffled = [...allSynonyms].sort(() => Math.random() - 0.5);
    const examples = shuffled.slice(0, 5).join(', ');

    await this.sendResponse(`${AlexaInfo[UserLang][116]} ${examples}`, AlexaID, source);
  }

  async sendEmptyingSynonyms(AlexaID, source) {
    const examples = emptyActionWords[UserLang]
      .slice(0, 5)
      .map(command => `"${command}"`)
      .join(', ');

    await this.sendResponse(`${AlexaInfo[UserLang][117]} ${examples}`, AlexaID, source);
  }

  async sendWashingSynonyms(AlexaID, source) {
    const examples = washActionWords[UserLang]
      .slice(0, 5)
      .map(command => `"${command}"`)
      .join(', ');

    await this.sendResponse(`${AlexaInfo[UserLang][118]} ${examples}`, AlexaID, source);
  }

  async sendStatusSynonyms(AlexaID, source) {
    const examples = statusCheckWords[UserLang]
      .slice(0, 5)
      .map(command => `"${command}"`)
      .join(', ');

    await this.sendResponse(`${AlexaInfo[UserLang][119]} ${examples}`, AlexaID, source);
  }

  async sendResetSynonyms(AlexaID, source) {
    const examples = [
      ...resetOneKeywords[UserLang],
      ...resetAllKeywords[UserLang]
    ].slice(0, 5).map(command => `"${command}"`).join(', ');

    await this.sendResponse(`${AlexaInfo[UserLang][120]} ${examples}`, AlexaID, source);
  }

  async sendAdditionalExamples(AlexaID, source) {
    try {
      const examples = await this.generateSynonymExamples();
      await this.sendResponse(examples, AlexaID, source);
    } catch (error) {
      this.log.error('Failed to generate examples:', error);
      await this.sendResponse(AlexaInfo[UserLang][93], AlexaID, source); // Fallback
    }
  }

  async sendAllSynonyms(AlexaID, source) {
    const getRandomFromCategory = (synonymDict, count = 2) => {
      const all = [];
      for (const [synonym, official] of Object.entries(synonymDict)) {
        if (synonym.toLowerCase() !== official.toLowerCase()) {
          all.push(`"${synonym}"`);
        }
      }
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).join(', ');
    };

    const response = [
      `${AlexaInfo[UserLang][121]} ${getRandomFromCategory(AlexaRoomsNameSynonyms[UserLang], 2)}`,
      `${AlexaInfo[UserLang][122]} ${getRandomFromCategory(suctionSynonyms[UserLang], 2)}`,
      `${AlexaInfo[UserLang][123]} ${getRandomFromCategory(moppingSynonyms[UserLang], 2)}`,
      `${AlexaInfo[UserLang][124]} ${emptyActionWords[UserLang].slice(0, 2).map(cmd => `"${cmd}"`).join(', ')}`,
      `${AlexaInfo[UserLang][125]} ${washActionWords[UserLang].slice(0, 2).map(cmd => `"${cmd}"`).join(', ')}`,
      `${AlexaInfo[UserLang][126]} ${statusCheckWords[UserLang].slice(0, 2).map(cmd => `"${cmd}"`).join(', ')}`,
      `${AlexaInfo[UserLang][127]} ${[...resetOneKeywords[UserLang], ...resetAllKeywords[UserLang]].slice(0, 2).map(cmd => `"${cmd}"`).join(', ')}`
    ].join('. ');

    await this.sendResponse(response, AlexaID, source);
  }

  async generateSynonymExamples() {
    try {
      const lang = UserLang || 'EN';

      const getRandomSynonyms = (synonymDict, count = 2, filterFn = () => true) => {
        const allSynonyms = [];

        for (const [synonym, official] of Object.entries(synonymDict)) {
          if (synonym.toLowerCase() !== official.toLowerCase() && filterFn(synonym, official)) {
            allSynonyms.push(`"${synonym}"`);
          }
        }

        const shuffled = [...allSynonyms].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length)).join(', ');
      };

      const roomExamples = getRandomSynonyms(AlexaRoomsNameSynonyms[lang], 3,
        (_, official) => official !== 'Room');

      const suctionExamples = getRandomSynonyms(suctionSynonyms[lang], 2);
      const mopExamples = getRandomSynonyms(moppingSynonyms[lang], 2);

      return [
        AlexaInfo[lang][91],
        roomExamples ? `${AlexaInfo[lang][94]} ${roomExamples}` : AlexaInfo[lang][93],
        suctionExamples ? `${AlexaInfo[lang][95]} ${suctionExamples}` : '',
        mopExamples ? `${AlexaInfo[lang][96]} ${mopExamples}` : '',
        AlexaInfo[lang][92]
      ].filter(Boolean).join('\n');

    } catch (error) {
      this.log.error('Synonym example generation failed:', error);
      return AlexaInfo[UserLang][93];
    }
  }

  // ====================== MAIN HELP COMMAND PROCESSOR ======================
  async processHelpCommand(commandLower, AlexaID, source = 'alexa') {
	  try {
      // DETECT HELP END COMMANDS - SEPARATE FROM NAVIGATION
      if (commandLower.includes('ende') || commandLower.includes('beenden') || commandLower.includes('end') ||
        commandLower.includes('stop') || commandLower.includes('exit') ||
        commandLower.includes('quit') || commandLower.includes('schließen')) {

        if (this.helpState?.active) {
          clearTimeout(this.helpState.timeout);
          this.helpState.active = false;
          await this.sendResponse(AlexaInfo[UserLang][103], AlexaID, source); // "Help session ended"
          return true;
        }
      }


      // INITIAL HELP REQUEST
      if (await this.containsHelpAndDevice(commandLower)) {
        this.helpState = {
          active: true,
          currentStep: 'main', // Main menu state
          timeout: setTimeout(() => {
            this.helpState.active = false;
            this.sendResponse(AlexaInfo[UserLang][103], AlexaID, source);
          }, 180000) // 3-minute timeout
        };

        // Build main help menu with navigation hint
        const mainHelp = [
          AlexaInfo[UserLang][60], // Main question
          AlexaInfo[UserLang][61], // Option 1: Emptying
          AlexaInfo[UserLang][62], // Option 2: Washing
          AlexaInfo[UserLang][63], // Option 3: Status
          AlexaInfo[UserLang][64], // Option 4: Resetting
          AlexaInfo[UserLang][65], // Option 5: Room cleaning
          AlexaInfo[UserLang][66], // Option 6: Carpet cleaning
          AlexaInfo[UserLang][135], // Option 7: Dining table cleaning
          AlexaInfo[UserLang][67], // Option 8: Synonyms

          //await this.generateSynonymExamples(), // Dynamic synonym examples
          AlexaInfo[UserLang][68] // Instructions
        ].join('\n');

        await this.sendResponse(mainHelp, AlexaID, source);
        return true;
      }

      // PROCESS FOLLOW-UP COMMANDS IN ACTIVE HELP MODE
      if (this.helpState?.active) {
        clearTimeout(this.helpState.timeout);
        this.helpState.timeout = setTimeout(() => {
          this.helpState.active = false;
          this.sendResponse(AlexaInfo[UserLang][103], AlexaID, source);
        }, 180000);

        const normalizedCommand = await this.normalizeCommand(commandLower);

        // RETURN TO MAIN MENU COMMANDS
        if (normalizedCommand.includes('zurück') || normalizedCommand.includes('back') ||
          normalizedCommand.includes('haupt') || normalizedCommand.includes('main')) {
          await this.sendResponse(AlexaInfo[UserLang][129], AlexaID, source);

          this.helpState.currentStep = 'main'; // Switch back to main menu

          // Redisplay main menu
          const mainHelp = [
            AlexaInfo[UserLang][60],
            AlexaInfo[UserLang][61],
            AlexaInfo[UserLang][62],
            AlexaInfo[UserLang][63],
            AlexaInfo[UserLang][64],
            AlexaInfo[UserLang][65],
            AlexaInfo[UserLang][66],
			  AlexaInfo[UserLang][135],
            AlexaInfo[UserLang][67],
            //await this.generateSynonymExamples(),
            AlexaInfo[UserLang][68]
          ].join('\n');

          await this.sendResponse(mainHelp, AlexaID, source);
          return true;
        }

        // HELP END COMMANDS (COMPLETE EXIT)
        if (normalizedCommand.includes('ende') || normalizedCommand.includes('beenden') || normalizedCommand.includes('end') ||
          normalizedCommand.includes('stop') || normalizedCommand.includes('exit') ||
          normalizedCommand.includes('quit') || normalizedCommand.includes('schließen')) {

          clearTimeout(this.helpState.timeout);
          this.helpState.active = false;
          await this.sendResponse(AlexaInfo[UserLang][103], AlexaID, source);
          return true;
        }

        // SYNONYM SUBMENU HANDLING
        if (this.helpState.currentStep === 'synonym_submenu') {
          return this.handleSynonymSubmenu(normalizedCommand, AlexaID, source);
        }

        // MAIN MENU OPTIONS PROCESSING
        if (this.helpState.currentStep === 'main') {

          // OPTION 8 - SWITCH TO SYNONYM SUBMENU
          if (normalizedCommand.includes('8') || normalizedCommand.includes('synonym')) {
            this.helpState.currentStep = 'synonym_submenu'; // Activate submenu
            await this.sendSynonymSubmenu(AlexaID, source);
            return true;
          }

          // OPTION 1 - EMPTYING
          if (normalizedCommand.includes('1') || normalizedCommand.includes('empty') ||
          normalizedCommand.includes('entleer') || normalizedCommand.includes('leer')) {
            const response = [
              AlexaInfo[UserLang][69], // Emptying introduction
              AlexaInfo[UserLang][70], // Emptying example 1
              AlexaInfo[UserLang][71]  // Emptying example 2
            ].join('\n');
            await this.sendResponse(response + '\n' + AlexaInfo[UserLang][101], AlexaID, source);
            return true;
          }

          // OPTION 2 - WASHING
          if (normalizedCommand.includes('2') || normalizedCommand.includes('wash') ||
          normalizedCommand.includes('wasch') || normalizedCommand.includes('mop')) {
            const response = [
              AlexaInfo[UserLang][72], // Washing introduction
              AlexaInfo[UserLang][73], // Washing example 1
              AlexaInfo[UserLang][74]  // Washing example 2
            ].join('\n');
            await this.sendResponse(response + '\n' + AlexaInfo[UserLang][101], AlexaID, source);
            return true;
          }

          // OPTION 3 - STATUS
          if (normalizedCommand.includes('3') || normalizedCommand.includes('status') ||
          normalizedCommand.includes('zustand') || normalizedCommand.includes('prüf')) {
            const response = [
              AlexaInfo[UserLang][75], // Status introduction
              AlexaInfo[UserLang][76], // Status example 1
              AlexaInfo[UserLang][77]  // Status example 2
            ].join('\n');
            await this.sendResponse(response + '\n' + AlexaInfo[UserLang][101], AlexaID, source);
            return true;
          }

          // OPTION 4 - RESET
          if (normalizedCommand.includes('4') || normalizedCommand.includes('reset') ||
          normalizedCommand.includes('zurücksetz') || normalizedCommand.includes('rücksetz')) {
            const response = [
              AlexaInfo[UserLang][78], // Reset introduction
              AlexaInfo[UserLang][79], // Reset example 1
              AlexaInfo[UserLang][80]  // Reset example 2
            ].join('\n');
            await this.sendResponse(response + '\n' + AlexaInfo[UserLang][101], AlexaID, source);
            return true;
          }

          // OPTION 5 - ROOM CLEANING
          if (normalizedCommand.includes('5') || normalizedCommand.includes('room') ||
          normalizedCommand.includes('raum') || normalizedCommand.includes('clean') ||
          normalizedCommand.includes('reinigung')) {
            const response = [
              AlexaInfo[UserLang][81], // Room cleaning patterns
              AlexaInfo[UserLang][82], // Vacuum example
              AlexaInfo[UserLang][83], // Mopping example
              AlexaInfo[UserLang][84], // Combined example
              AlexaInfo[UserLang][88], // Suction levels
              AlexaInfo[UserLang][89]  // Mopping levels
            ].join('\n');
            await this.sendResponse(response + '\n' + AlexaInfo[UserLang][101], AlexaID, source);
            return true;
          }

          // OPTION 6 - CARPET CLEANING
          if (normalizedCommand.includes('6') || normalizedCommand.includes('carpet') ||
          normalizedCommand.includes('teppich') || normalizedCommand.includes('shampoo')) {
            const response = [
              AlexaInfo[UserLang][85], // Carpet cleaning patterns
              AlexaInfo[UserLang][86], // Shampoo example
              AlexaInfo[UserLang][87], // Alternative example
              AlexaInfo[UserLang][90]  // Carpet intensities
            ].join('\n');
            await this.sendResponse(response + '\n' + AlexaInfo[UserLang][101], AlexaID, source);
            return true;
          }

          // OPTION 7 - DINING TABLE CLEANING
          if (normalizedCommand.includes('7') || normalizedCommand.includes('dining') ||
    normalizedCommand.includes('esstisch') || normalizedCommand.includes('tisch') ||
    normalizedCommand.includes('table')) {
            const response = [
              AlexaInfo[UserLang][136], // Dining table introduction
              AlexaInfo[UserLang][137], // Dining table example 1
              AlexaInfo[UserLang][138], // Dining table example 2 (sweeping only)
              AlexaInfo[UserLang][139], // Dining table example 3 (mopping only)
              AlexaInfo[UserLang][140], // Dining table example 4 (both)
              AlexaInfo[UserLang][141]  // Dining table modes
            ].join('\n');
            await this.sendResponse(response + '\n' + AlexaInfo[UserLang][101], AlexaID, source);
            return true;
          }

	    // FOR "MORE EXAMPLES" COMMAND
          if (normalizedCommand.includes('example') || normalizedCommand.includes('beispiel')) {
            const examples = await this.generateSynonymExamples();
            await this.sendResponse(examples, AlexaID, source);
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      this.log.error('Help command error: ' + err);
      await this.sendResponse(AlexaInfo[UserLang][102], AlexaID, source);
      return false;
    }
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
          await this.DH_GenerateMap(DH_CurMap, DH_Did, DH_Map, UserLang, fullQuality, DH_ScaleValue, CheckArrayRooms, roomData, canvas, context, ColorsItems, ColorsCarpet, RoomsStrokeColor, RoomsLineWidth, WallColor, WallStrokeColor, WallLineWidth, DoorsColor, DoorsStrokeColor, DoorsLineWidth, ChargerColor, ChargerStrokeColor, ChargerLineWidth, CarpetColor, CarpetStrokeColor, CarpetLineWidth);

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
          await this.DH_GenerateMap(DH_CurMap, DH_Did, DH_Map, UserLang, fullQuality, DH_ScaleValue, CheckArrayRooms, roomData, canvas, context, ColorsItems, ColorsCarpet, RoomsStrokeColor, RoomsLineWidth, WallColor, WallStrokeColor, WallLineWidth, DoorsColor, DoorsStrokeColor, DoorsLineWidth, ChargerColor, ChargerStrokeColor, ChargerLineWidth, CarpetColor, CarpetStrokeColor, CarpetLineWidth);


        }

        // Handle map rotation changes
        if ((id.toString().indexOf('.map.Rotation' + DH_CurMap) != -1) && (state.val || state.val === 0)){
          const newRotation = parseInt(state.val);
          // Trigger reload
          this.log.info('New map rotation received: ' + newRotation + '°. Apply settings and generate new map');
          await this.DH_GenerateMap(DH_CurMap, DH_Did, DH_Map, UserLang, fullQuality, DH_ScaleValue, CheckArrayRooms, roomData, canvas, context, ColorsItems, ColorsCarpet, RoomsStrokeColor, RoomsLineWidth, WallColor, WallStrokeColor, WallLineWidth, DoorsColor, DoorsStrokeColor, DoorsLineWidth, ChargerColor, ChargerStrokeColor, ChargerLineWidth, CarpetColor, CarpetStrokeColor, CarpetLineWidth);

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

        if ((id.toString().includes('.control.')) && (!id.toString().endsWith('.control.NaturalLanguageCommand'))) {
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

                  if (SPkey == 'S27P18E1') {
                    const value = state.val ? '3,1' : '3,0';
                    const paramsIn = [{ piid: 10, value: value }];

                    // drying duration of 3 hours (10800 seconds) when activated
                    if (state.val) {
                      //paramsIn.push({ siid: 27, piid: 17, value: 10800 }); // 3 hours
                    }

                    const CMSETURLData = {
                      did: DH_Did,
                      id: requestId,
                      data: {
                        did: DH_Did,
                        id: requestId,
                        method: 'action',
                        params: {
                          did: DH_Did,
                          siid: 4,
                          aiid: 4,
                          'in': paramsIn
                        }
                      }
                    };

                    //this.log.info(`Set Mopp Drying to ${state.val ? 'ON (3h)' : 'OFF'}`);
                    this.log.info('Send Extended Command (Mopp Drying): ' + JSON.stringify(CMSETURLData));

                    try {
                      await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, CMSETURLData);
                    } catch (err) {
                      this.log.warn('Setting "' + SPvalue + '" State failed: ' + err);
                    }
                    return;
                  }
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
        if (id.toString().indexOf('.showlog') !== -1) {
          LogData = state.val;
          if (LogData) {
            this.log.info('Show log has been activated');
          } else {
            this.log.info('Show log has been disabled');
          }
          return;
        }

        // Handle manual cleanup trigger
        if (id.toString().endsWith('resources.memoryCleaner.triggerCleanup') && state.val === true) {
          await this.handleManualCleanup();
          return;
        }

        // Handle profiling enable/disable
        if (id.toString().endsWith('resources.profiling.enabled')) {
          this.log.info(`Profiling ${state.val ? 'enabled' : 'disabled'}`);
          this.profiler.setEnabled(state.val);
          return;
        }

        // Handle memory cleaner enable/disable
        if (id.toString().endsWith('resources.memoryCleaner.enabled')) {
          await this.handleMemoryCleanerToggle(state.val);
          return;
        }

        // Handle memory cleaner settings changes
        if (id.toString().endsWith('resources.memoryCleaner.thresholdMB') || id.toString().endsWith('resources.memoryCleaner.intervalSec') || id.toString().endsWith('resources.memoryCleaner.priority')) {
          await this.updateMemoryCleanerSettings();
          return;
        }
        if (id.toString().endsWith('.alexaSpeakMode')) {
          await this.updateSpeakMode(state?.val);
        }

        if (id.toString().endsWith('.control.Command')) {
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


      if (id.toString().endsWith('.DiningTableZone')) {
        if (state.val) {
          this.setStateAsync(id, false, true);
		  const roomName = id.toString().split('.').slice(-2, -1)[0];
          if (roomName) await this.cleanDiningTableZone(roomName);
        }

	  }


      if ((id.toString().endsWith('.summary') && AlexaIsPresent) || id.toString().endsWith('.communicate.request') || id.toString().endsWith('.control.NaturalLanguageCommand')) {
        let command = state.val;

        if (!command || command == '') { //Check if the event is triggered only when the state actually changes and is not empty
          return;
        }

	    const isAlexaCommand = id.indexOf('.summary') !== -1;
        const isTelegramCommand = id.indexOf('.communicate.request');
		 const isNSPCommand = id.indexOf('.control.NaturalLanguageCommand');
        // Determine command source
        const commandSource = isAlexaCommand ? 'alexa' : isTelegramCommand ? 'telegram' : 'nspanel';

        currentTime = Date.now();
        timeDiff = currentTime - lastCommandTime;  // Calculate the time difference
        if (timeDiff < 3000) { // If the command is received within 3 seconds
          this.log.info('Command ignored: Repeated command within 3 seconds');
          return;
        }

        let LastAlexaID = '';
        if (isAlexaCommand) {
          const LastAlexa = await this.getForeignStateAsync('alexa2.0.History.serialNumber');
          if (LastAlexa) {
            LastAlexaID = LastAlexa.val;
          }
        }
        else if (isTelegramCommand) {
          // Telegram-specific processing
          command = String(command).replace(/^(\[.*?\]|\/\w+)\s*/, '').trim();
          // No Alexa response for Telegram commands
          LastAlexaID = null;
        }
        else if (isNSPCommand) {
          // No Alexa response for NSP commands
          LastAlexaID = null;
        }

        const commandLower = command.toLowerCase(); // Convert the command to lowercase for consistent comparison
        const hasRobotKeyword = robotKeywords[UserLang].some(word => commandLower.includes(word)); // Check if the command includes any robot-related keyword
        const hasEmptyKeyword = emptyActionWords[UserLang].some(word => commandLower.includes(word)); // Check if the command includes any emptying-related keyword
        const hasWashKeyword = washActionWords[UserLang].some(word => commandLower.includes(word)); // Check if the command includes any washing-related keyword

        await this.processHelpCommand(commandLower, LastAlexaID, commandSource);

        // Trigger auto-empty only if both robot and emptying keywords are present
        if (hasRobotKeyword && hasEmptyKeyword) {
          //Reset alexa2.0.History.summary
          await this.setForeignStateAsync(id, '');
          await this.startAutoEmpty(LastAlexaID, commandSource);
        }

        // Trigger auto-wash only if both robot and washing keywords are present
        if (hasRobotKeyword && hasWashKeyword) {
          //Reset alexa2.0.History.summary
          await this.setForeignStateAsync(id, '');
          await this.startAutoWash(LastAlexaID, commandSource);
        }

        // Trigger Status only if both robot and Status keywords are present
        const hasStatusKeyword = statusCheckWords[UserLang].some(word => commandLower.includes(word));

        // Try to detect a specific component in the command
        const componentKey = await this.matchComponentBySynonym(commandLower, UserLang);

        if (hasRobotKeyword && componentKey && hasStatusKeyword && !isComponentsSayState) {
          isComponentsSayState = true;
          await this.setForeignStateAsync(id, ''); // Reset spoken text
          await this.checkSingleComponentStatus(componentKey, LastAlexaID, commandSource);
          return;
        } else if (hasRobotKeyword && hasStatusKeyword && !isComponentsSayState) {
		  isComponentsSayState = true;
          await this.setForeignStateAsync(id, ''); // Reset summary
          await this.checkRobotStatus(commandLower, LastAlexaID, commandSource);
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

        // Carpet cleaning command processing
        let hasCarpetKeyword = null;
        if (roomFound) {
          try {
            // Log the original command for debugging
            this.log.info(`[Carpet] Processing command: "${commandLower}"`);

            // Check if command contains carpet-related keywords
            hasCarpetKeyword = carpetKeywords[UserLang]?.some(word => commandLower.includes(word));
            const hasCarpetAction = carpetCleanActions[UserLang]?.some(word => commandLower.includes(word));

            if (hasCarpetKeyword && hasCarpetAction) {
              this.log.info('[Carpet] Valid carpet cleaning command detected');

              // Prepare cleaning parameters
              const combinedAreas = [];
              const cleaningDetails = [];
              let successfulRooms = 0;

              // Split command into room-specific sections
              const roomSections = commandLower.split(/\s+(?:und|and)\s+/i);

              // Process each room individually
              for (const roomNumber of selectedRooms) {
                const roomName = Alexarooms.find(r => r.RN === roomNumber)?.RM;
                if (!roomName) continue; // Skip if room name not found

                // Find the command section specific to this room
                const roomCommand = roomSections.find(section =>
                  section.includes(roomName.toLowerCase()));

                if (!roomCommand) {
                  this.log.warn(`[Carpet] No command found for ${roomName}`);
                  continue;
                }

                // Detect cleaning intensity for this specific room
                let detectedIntensity = null;
                for (const [intensityKey, params] of Object.entries(intensityParams)) {
                  // Use word boundaries for exact matching
                  const regex = new RegExp(`(^|\\s)(${params.keywords[UserLang].join('|')})(\\s|$)`, 'i');
                  if (regex.test(roomCommand)) {
                    detectedIntensity = intensityKey;
                    break;
                  }
                }

                this.log.info(`[Carpet] ${roomName} intensity: ${detectedIntensity || 'none'}`);

                // Handle missing intensity specification
                if (!detectedIntensity) {
                  const message = AlexaInfo[UserLang][50](roomName);
                  this.log.info(`[Carpet] ${message}`);
                  await this.speakToAlexa(message, LastAlexaID, 1);
                  continue;
                }

                // Verify carpet exists in this room
                const carpetObject = await this.findCarpetObject(roomName);
                if (!carpetObject) {
                  this.log.warn(`[Carpet] No carpet found in ${roomName}`);
                  continue;
                }

                // Get cleaning parameters for detected intensity
                const { suctionLevel, repetitions } = intensityParams[detectedIntensity];

                // Add to combined cleaning areas
                combinedAreas.push([
                  ...carpetObject.native.Cord, // Coordinates [X1,Y1,X2,Y2]
                  repetitions,                 // Number of cleaning passes
                  suctionLevel,                // Power level
                  0                           // Reserved =>  Water Volume
                ]);

                // Store cleaning details for reporting
                cleaningDetails.push(`${roomName} (${detectedIntensity})`);
                successfulRooms++;
              }

              // Abort if no valid rooms found
              if (successfulRooms === 0) {
                this.log.info(`[Carpet] ${AlexaInfo[UserLang][49]}`);
                await this.speakToAlexa(AlexaInfo[UserLang][49], LastAlexaID, 1);
                return;
              }

              // Set vacuum mode with retry logic
              let modeSetSuccessfully = false;
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  await this.setStateAsync(`${DH_Did}.control.CleaningMode`, 5122);
                  await this.wait(300); // Short delay for mode change

                  // Verify mode was set correctly
                  const currentMode = await this.getStateAsync(`${DH_Did}.state.CleaningMode`);
                  if (currentMode?.val === AlexacleanModes[UserLang][5122]) {
                    modeSetSuccessfully = true;
                    break;
                  }
                } catch (err) {
                  this.log.error(`[Carpet] Mode setting attempt ${attempt} failed: ${err.message}`);
                }
                await this.wait(500 * attempt); // Progressive backoff
              }

              if (!modeSetSuccessfully) {
                this.log.info(`[Carpet] ${AlexaInfo[UserLang][46]}`);
                await this.speakToAlexa(AlexaInfo[UserLang][46], LastAlexaID, 1);
                return;
              }

              // Execute cleaning command
              try {
                const manualCommand = { areas: combinedAreas };
                // Send the cleaning command to initiate the carpet cleaning process
                await this.DH_SendActionCleanCarpet(JSON.stringify(manualCommand), cleaningDetails);

                // Group rooms by cleaning intensity
                const roomsByIntensity = {};
                cleaningDetails.forEach(detail => {
                  const [roomName, intensity] = detail.split(' ('); // Split room name and intensity
                  const cleanIntensity = intensity.replace(')', ''); // Clean up intensity (remove closing parenthesis)
                  // Group rooms by their intensity level
                  roomsByIntensity[cleanIntensity] = roomsByIntensity[cleanIntensity] || [];
                  roomsByIntensity[cleanIntensity].push(roomName); // Add room to the corresponding intensity group
                });

                // Prepare data for AlexaInfo[51] (the message format)
                const intensityGroups = Object.entries(roomsByIntensity)
                  .map(([intensity, rooms]) => [rooms.join(', '), intensity]); // Format groups as [rooms, intensity]

                // Generate the message using the prepared data and AlexaInfo[51] format
                const combinedMessage = AlexaInfo[UserLang][51](
                  cleaningDetails.map(d => d.split(' (')[0]).join(', '),  // Extract room names from cleaning details
                  intensityGroups  // Grouped rooms by intensity
                );

                this.log.info(`[Carpet] ${combinedMessage}`);

                // Send the generated message to Alexa (via speech or display)
                await this.speakToAlexa(combinedMessage, LastAlexaID, 1);

              } catch (execError) {
                // If any error occurs during the cleaning execution, log it and notify via Alexa
                this.log.error(`[Carpet] Cleaning execution failed: ${execError.message}`);

                // Notify the user of failure with a specific message from AlexaInfo
                await this.speakToAlexa(AlexaInfo[UserLang][46], LastAlexaID, 1); // Example: "Carpet cleaning failed"
              }

            }

          } catch (err) {
            this.log.error(`[Carpet] General processing error: ${err.message}`);
            if (hasCarpetKeyword) {
              await this.speakToAlexa(AlexaInfo[UserLang][46], LastAlexaID, 1);
            }
            throw err;
          } finally {
            if (hasCarpetKeyword) {
              await this.setForeignStateAsync(id, '');
            }
          }
        }

        // Check for dining table cleaning
        const hasDiningTableKeyword = diningTableKeywords[UserLang]?.some(word => commandLower.includes(word));
        const hasDiningTableAction = diningTableActions[UserLang]?.some(word => commandLower.includes(word));

        if (hasDiningTableKeyword && hasDiningTableAction) {
          this.log.info('[DiningTable] Voice command for dining table cleaning detected');

          // Debug function to check all available states for DiningTableZone
          //await this.debugDiningTableStates();
          try {
            // Find room with dining table (automatically or from the command)
            let targetRoom = null;

            // Check if a specific room was mentioned in the command
            for (const Alexaroom of Alexarooms) {
              if (commandLower.includes(Alexaroom.RM.toLowerCase())) {
                targetRoom = Alexaroom.RM;
                this.log.info(`[DiningTable] Specific room found in the command: ${targetRoom}`);
                break;
              }
            }

            // If no room is specified, automatically find the room with a dining table
            if (!targetRoom) {
              targetRoom = await this.findRoomWithDiningTable();
              if (targetRoom) {
                this.log.info(`[DiningTable] Automatically found room: ${targetRoom}`);
              } else {
                this.log.warn('[DiningTable] No room with dining table found (automatically find the room with a dining table)');
              }
            }

            if (targetRoom) {
            // Detect intensity from the command
              let intensity = 'standard'; // Default
              for (const [intensityKey, params] of Object.entries(diningTableIntensityParams)) {
                if (params.keywords[UserLang].some(word => commandLower.includes(word))) {
                  intensity = intensityKey;
                  break;
                }
              }

              this.log.info(`[DiningTable] Cleaning intensity: ${intensity}`);

              // Set parameters and start cleaning
              await this.setDiningTableCleaningParams(targetRoom, diningTableIntensityParams[intensity]);
              const success = await this.cleanDiningTableZone(targetRoom);

              if (success) {
                await this.speakToAlexa(AlexaInfo[UserLang][130](targetRoom), LastAlexaID, 1);
                this.log.info(`[DiningTable] Cleaning successfully started in ${targetRoom}`);
              } else {
                await this.speakToAlexa(AlexaInfo[UserLang][133], LastAlexaID, 1);
                this.log.error('[DiningTable] Cleaning could not be started');
              }
            } else {
              await this.speakToAlexa(AlexaInfo[UserLang][131], LastAlexaID, 1);
              this.log.warn('[DiningTable] No room with dining table found (Detect intensity from the command)');
            }
          } catch (error) {
            this.log.error(`[DiningTable] Error in dining table cleaning: ${error.message}`);
            await this.speakToAlexa(AlexaInfo[UserLang][133], LastAlexaID, 1);
          }

          await this.setForeignStateAsync(id, '');
          return; // Important: return early!
        }

        // If no room was found or carpet cleaning detected, exit early
        if ((!roomFound) || (!isCleaningCommand) || (hasCarpetKeyword)) {
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