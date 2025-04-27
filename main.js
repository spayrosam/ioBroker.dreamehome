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
    20: 'Clean add water',
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
    20: 'Reinigen, Wasser hinzufügen',
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
    1: 'Standart',
    2: 'Intensive',
    3: 'Deep',
    546: 'Intelligent',
	    512: 'Unknown1',
	    768: 'Unknown2'
  },
  'DE': {
    '-1': 'Unbekannt',
    1: 'Standart',
    2: 'Intensiv',
    3: 'Tief',
    546: 'Intelligent',
	    512: 'Unbekannt1',
	    768: 'Unbekannt2'
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
    5: 'Clean Add Water',
    6: 'Adding Water'
  },
  'DE': {
    '-1': 'Unbekannt',
    0: 'Leerlauf',
    1: 'Waschen',
    2: 'Trocknen',
    3: 'Rücklauf',
    4: 'Pausiert',
    5: 'Reinigen Wasser hinzufügen',
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
  'S6A1': [{'piid': 2,'value': '{"req_type":1,"frame_type":"I","force_type":1}'}], // Request map
  'S6A2': [{'piid': 4,'value':'{"customeClean":[[1,2,27,2,2,2]]}'}], // Update map data | Room Settings | 1: Segment, 2: Suction Level, 27 Water volume, 2: Cleaning Times, 2: Cleaning Mode, 2: ??
  'S6A2C1': [{'piid': 4,'value': '{"sm":{},"mapid":map_id}'}], // Update map data | Change map:
  'S6A2C2': [{'piid': 4,'value': '{"nrism":{"map_id":{"name":"New_name"}}}'}],  // Update map data | Rename map: "{\"nrism\":{\"292\":{\"name\":\"Test\"}}}"
  'S6A2C3': [{'piid': 4,'value': '{"cm":{},"mapid":map_id}'}], // Update map data | Delete map
  'S6A2C4': [{'piid': 4,'value': '{"smra":{"map_id":{"ra":90}}}'}], // Update map data | Rotate map
  'S6A2C5': [{'piid': 4,'value':'{"cleanOrder":[[1,2,3]]}'}], // Update map data | cleanOrder
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
  'S7P1E1': {'EN': {0: 'Min', 100: 'Max'}, 'DE': {0: 'Min', 100: 'Max'}}, //Volume 1 to 100
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
const DH_Map = {}, DH_MapIDs = [];
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
  DH_MapID = '',
  DH_CurMap = 0,
  DH_Host = '';
const canvas = createCanvas();
const context = canvas.getContext('2d');
canvas.height = 1024;
canvas.width = 1024;
let DH_UpdateMapInterval = null;
let DH_UpdateTheMap = true;

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
        def: 'speakOnBoth'
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
      await this.setObjectNotExists(In_path + 'vishtml0', {
        type: 'state',
        common: {
          name: 'HTML for VIS Map 1',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: ''
        },
        native: {},
      });
      await this.setObjectNotExists(In_path + 'vishtml1', {
        type: 'state',
        common: {
          name: 'HTML for VIS Map 2',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: ''
        },
        native: {},
      });
      await this.setObjectNotExists(In_path + 'Perspective1', {
        type: 'state',
        common: {
          name: 'Perspective1 for VIS Map 1',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: '0,0,0.75,0,1,0,0,90'
        },
        native: {},
      });
      await this.setObjectNotExists(In_path + 'Perspective2', {
        type: 'state',
        common: {
          name: 'Perspective2 for VIS Map 2',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: '0,0,0.75,0,1,0,0,90'
        },
        native: {},
      });
      await this.setObjectNotExists(In_path + 'PosHistory0', {
        type: 'state',
        common: {
          name: 'Dreame Position History for Map 1',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: '{}'
        },
        native: {},
      });
      await this.setObjectNotExists(In_path + 'CharHistory0', {
        type: 'state',
        common: {
          name: 'Dreame Charger History for Map 1',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: '{}'
        },
        native: {},
      });

      await this.setObjectNotExists(In_path + 'PosHistory1', {
        type: 'state',
        common: {
          name: 'Dreame Position History for Map 2',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: '{}'
        },
        native: {},
      });
      await this.setObjectNotExists(In_path + 'CharHistory1', {
        type: 'state',
        common: {
          name: 'Dreame Charger History for Map 2',
          type: 'mixed',
          role: 'state',
          write: false,
          read: true,
          def: '{}'
        },
        native: {},
      });



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
          name: 'gnew Map',
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


  }

  async DH_CloudLogin() {
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
        DH_Did = GetListData[0].did;
        DH_Model = GetListData[0].model;
        DH_Mac = GetListData[0].mac;
        DH_BDomain = GetListData[0].bindDomain;
        DH_Host = DH_BDomain.split('.')[0];

        await this.DH_PropObject(GetListData[0], DH_Did + '.general.', 'Get listV2: ');

        SETURLData = {
          did: DH_Did,
          keys: '6.8',
        };
        const GetCloudRequestObjName = await this.DH_URLRequest(DH_URLPROP, SETURLData);
        const GetObjNameData = JSON.parse(JSON.stringify(GetCloudRequestObjName.data))[0].value;
        DH_filename = JSON.parse(GetObjNameData).obj_name;
        this.log.info('Fetching obj_name: ' + DH_filename);
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
              if (SPkey == 'S4P7') {
                await this.DH_getType(RetPointValue, path.replace('.state.', '.vis.'), SPkey);
                await this.DH_setState(path.replace('.state.', '.vis.'), RetPointValue, true);
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

  async DH_RequestNewMap() {

    /*try { //Test decrypted Map..
            var TSETURLData = {
                did: DH_Did,
                model: DH_Model,
                filename: "ali_dreame/...", // Get Raw and Key
                region: DH_Region
            };
            var TGetCloudRequestMap = await this.DH_URLRequest(DH_URLDOWNURL, TSETURLData);
            this.log.warn("Get ====> " + JSON.stringify(TGetCloudRequestMap));
            var TRetFileData = await this.DH_getFile(TGetCloudRequestMap.data);
            var Traw_map = TRetFileData.replace("_", "/").replace("-", "+");
            this.log.warn("File ====> " + Traw_map);
            Traw_map = Buffer.from(Traw_map, 'base64');
		    this.log.warn("Base64 ====> " + Traw_map);
            var iv = "";
            try {
                const hashedKey = createHash('sha256').update("xxxx").digest().slice(0, 32);
                const decipher = createDecipheriv('aes-256-cbc', hashedKey, Buffer.from(iv, 'utf8'));
                let decrypted = decipher.update(Traw_map, 'binary', 'utf8');
                decrypted += decipher.final('utf8');
                this.log.warn("Decrypted =====> " + decrypted);
				var TDH_decode = zlib.inflateSync(decrypted).toString()
                this.log.warn("Zlib ====> " + TDH_decode);
            } catch (ex) {
                this.log.error(`Map data decryption failed: ${ex}. Private key might be missing`);
            }

        } catch (error) {
            this.log.warn(`Unable to decrypt file at ${DH_URLDOWNURL}: ${error}`);
        }*/

    try {
      const SETURLData = {
        did: DH_Did,
        model: DH_Model,
        filename: DH_filename,
        region: DH_Region
      };
      const GetCloudRequestMap = await this.DH_URLRequest(DH_URLDOWNURL, SETURLData);
      if (GetCloudRequestMap) {
        const RetFileData = await this.DH_getFile(GetCloudRequestMap.data);
        await this.setObjectNotExists(DH_Did + '.map.CloudData', {
          type: 'state',
          common: {
            name: 'Map object. Only available when cloud connection is present',
            type: 'json',
            role: 'array',
            write: false,
            read: true,
            def: ''
          },
          native: {},
        });

        //await this.setState(In_path + 'map.CloudData', JSON.stringify(DH_Map[DH_CurMap]), true);
        await this.setState(DH_Did + '.map.CloudData', JSON.stringify(RetFileData), true);
        //const DH_DecodeMap = JSON.stringify(RetFileData["mapstr"][0]["map"]).toString();

        await this.setObjectNotExists(DH_Did + '.map.MapNumber', {
          type: 'state',
          common: {
            name: 'Map Number. Only available when cloud connection is present',
            type: 'number',
            role: 'level',
            states: {
              0: "Map N' 1",
              1: "Map N' 2"
            },
            write: true,
            read: true,
            def: 0
          },
          native: {},
        });

        try {
          const DH_CurMapOb = await this.getStateAsync(DH_Did + '.map.MapNumber');
          DH_CurMap = DH_CurMapOb.val;
          this.log.info(DreameInformation[UserLang][0] + DH_CurMap);
        } catch (error) {
          this.log.warn(DreameInformation[UserLang][1] + error);
          DH_CurMap = 0;
        }

        let DH_DecodeMap = '';
        //let AddMapLevel = {}; //FoundedMap = false,
        for (const [MAkey, MAvalue] of Object.entries(RetFileData)) {
          if (MAkey == 'mapstr') { // && (FoundedMap == false)) {
            for (const [MBkey, MBvalue] of Object.entries(MAvalue)) {
              if (parseInt(MBkey) == DH_CurMap) {
                DH_DecodeMap = JSON.stringify(RetFileData[MAkey][MBkey]['map']).toString();
                //FoundedMap = true;
                //break;
              }
              // AddMapLevel[MBkey] = ": Map N' " + (parseInt(MBkey) + 1);
            }
          }
          if (MAkey == 'curr_id') {
            DH_MapIDs.push(MAvalue);
            DH_MapID = MAvalue;
          }
        }
        /*AddMapLevel = JSON.parse(JSON.stringify(AddMapLevel));
                await this.setState(DH_Did + '.map.MapNumber', {
                    states: AddMapLevel
                });*/

        await this.setObjectNotExists(DH_Did + '.map.MapID', {
          type: 'state',
          common: {
            name: 'Map ID. Only available when cloud connection is present',
            type: 'number',
            role: 'value',
            write: false,
            read: true,
            def: DH_MapID
          },
          native: {},
        });
        await this.setState(DH_Did + '.map.MapID', DH_MapID, true);
        if (LogData) {
	   this.log.info('Decode Map response: ' + JSON.stringify(DH_DecodeMap));
        }


        if (DH_DecodeMap !== '') {
          let DH_input_Raw = DH_DecodeMap.replace(/-/g, '+').replace(/_/g, '/');
          let DH_decode = zlib.inflateSync(Buffer.from(DH_input_Raw, 'base64')).toString();
          let DH_jsondecode = DH_decode.toString().match(/[{\[]{1}([,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis);
          let DH_jsonread = (_ => {
            try {
              return JSON.parse(DH_jsondecode);
            } catch (err) {
              this.log.info('Error:' + err);
              return undefined;
            }
          })();
          if (LogData) {
            this.log.info('Decode Map response: ' + JSON.stringify(DH_jsonread));
          }
          if (!DH_jsonread) {
            this.log.warn(DreameInformation[UserLang][2] + DH_CurMap + DreameInformation[UserLang][3]);
          } else {
            DH_Map[DH_CurMap] = DH_jsonread;
            await this.setObjectNotExists(DH_Did + '.mqtt.robot', {
              type: 'state',
              common: {
                name: 'Dreame Robot Position',
                type: 'json',
                role: 'array',
                write: false,
                read: true,
                def: JSON.stringify(DH_Map[DH_CurMap]['robot'])
              },
              native: {},
            });
            await this.setObjectNotExists(DH_Did + '.mqtt.charger', {
              type: 'state',
              common: {
                name: 'Dreame Charger Position',
                type: 'json',
                role: 'array',
                write: false,
                read: true,
                def: JSON.stringify(DH_Map[DH_CurMap]['charger'])
              },
              native: {},
            });
          }

          //await this.setState(DH_Did + '.map.CloudData', JSON.stringify(DH_Map[DH_CurMap]), true);
          DH_input_Raw = null;
          DH_jsonread = null;
          DH_jsondecode = null;
          DH_decode = null;
          DH_DecodeMap = null;

          this.log.info(DreameInformation[UserLang][5]);
        }
      }
    } catch (error) {
      this.log.warn(`Unable to get file at ${DH_URLDOWNURL}: ${error}`);
    }
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

		 // 1. Create MapSize object (if it does not exist)
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

      // 2. Get existing value or set default
      const mapSizeState = await this.getStateAsync(mapSizeObjName);
      if (mapSizeState && mapSizeState.val) {
        canvasSize = parseInt(mapSizeState.val);
      } else {
        await this.setStateAsync(mapSizeObjName, canvasSize, true);
      }

      // 3. Reset NewMap flag
      await this.setStateAsync(`${DH_Did}.map.NewMap`, false, true);

      // 4. Rest of the original function with the dynamic canvasSize
      //await this.DH_RequestNewMap();


      const currentMap = DH_Map[DH_CurMap];
      const wallsInfo = currentMap?.walls_info?.storeys?.[0] || {};
      const elements = {
        rooms: Array.isArray(wallsInfo.rooms) ? wallsInfo.rooms : [],
        carpets: typeof currentMap.carpet_info === 'object' ? currentMap.carpet_info : {},
        charger: currentMap.charger || []
      };

      // Precise center point calculation
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

      // 2. Canvas Setup
      // Default value: 1024, will be changed dynamically later


      // 3. Calculate scaling
      const { minX, maxX, minY, maxY } = elements.rooms.reduce((acc, room) => {
        room.walls?.forEach(wall => {
          acc.minX = Math.min(acc.minX, wall.beg_pt_x || 0, wall.end_pt_x || 0);
          acc.maxX = Math.max(acc.maxX, wall.beg_pt_x || 0, wall.end_pt_x || 0);
          acc.minY = Math.min(acc.minY, wall.beg_pt_y || 0, wall.end_pt_y || 0);
          acc.maxY = Math.max(acc.maxY, wall.beg_pt_y || 0, wall.end_pt_y || 0);
        });
        return acc;
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

      const scale = Math.min(
        canvasSize / Math.max(maxX - minX, 1),
        canvasSize / Math.max(maxY - minY, 1)
      ) * 0.9;
      const offsetX = (canvasSize - (maxX - minX) * scale) / 2 - minX * scale;
      const offsetY = (canvasSize - (maxY - minY) * scale) / 2 - minY * scale;

      // 4. Transformation function
      function toCanvas(x, y) {
        return [
          Math.round(x * scale + offsetX),
          Math.round(y * scale + offsetY)
        ];
      }

      // 5. Prepare color mappings
      const colorMappings = {
        rooms: {},
        carpets: {}
      };

      // 6. Prepare rooms mappings
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

      // 7. HTML with all features
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
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: #ff0000;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 12px rgba(255,0,0,0.8);
                    transform: translate(-10px, -10px);
                    z-index: 110;
                    display: none;
                    animation: pulse-robot 1s infinite alternate;
                }
                @keyframes pulse-robot {
                    0% { transform: translate(-10px, -10px) scale(1); }
                    100% { transform: translate(-10px, -10px) scale(1.3); }
                }
                .cleaned-area {
                    opacity: 0.7;
                    transition: all 1s ease;
                }
                #robot-path {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
				    opacity: 0.3;
                    pointer-events: none;
                    z-index: 101;
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
                /* Quantum Menu Effects */
                /* ==================== */

                .main-menu-button {
					top: 5px;
                    right: 90px;
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
                    font-size: 18px;
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

                /* Particle Effects */
                .menu-particle {
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: white;
                    border-radius: 50%;
                    pointer-events: none;
                    opacity: 0;
                    z-index: 200;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .menu-level {
                        right: 75px;
                        min-width: 200px;
                    }
                }
                /* End Quantum Menu Effects */


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


                /* Status-specific animations for the mini version */
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

                .status-text {
                    position: absolute;
                    bottom: -20px;
                    left: 0px;
                    width: 100%;
                    text-align: center;
                    font-size: 8px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    transform: scale(1.5);
                    transform-origin: top center;
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
    //const center = walls.reduce((a, b) => [a[0]+b[0], a[1]+b[1]], [0, 0]).map(v => v/walls.length);

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

                    ${Object.entries(elements.carpets).map(([id, rect]) => {
    const color = ColorsCarpet[id % ColorsCarpet.length];
    colorMappings.carpets[color] = id;
    const [x1, y1, x2, y2] = rect;
    const [tx1, ty1] = toCanvas(x1, y1);
    return `
                        <div class="carpet" id="carpet-${id}"
                             style="left:${tx1}px;top:${ty1}px;width:${(x2-x1)*scale}px;height:${(y2-y1)*scale}px;background:${color}33;border:2px solid ${color}">
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
                            <div class="status-text">Idle</div>
                        </div>
                    ` : ''}

                    <svg id="robot-path"
                        <path d="M" stroke="rgba(255,0,0,0.5)" stroke-width="2" fill="none" />
                        <circle cx="" r="4" fill="blue" />
                    </svg>

                    <!-- CURRENT ROBOT POSITION (as red dot) -->
                    <div id="robot-position"
                            style="display:none;
                                width:20px;
                                height:20px;
                                background:#ff0000;
                                border-radius:50%;
                                border:2px solid white;
                                box-shadow:0 0 10px rgba(255,0,0,0.7);
                                position:absolute;
                                transform:translate(-10px,-10px);
                                z-index:110;
                                display:none;">
                    </div>
                </div>

				<!-- Cascading Menu System -->
                <div class="control-panel">
                    <button class="main-menu-button" id="main-menu-btn">=</button>

                    <!-- Main Menu Level 1 -->
                    <div class="menu-level" id="main-menu">
                        <div class="menu-title">Main Menu</div>
                        <button class="menu-item" data-next="view-menu">
                            <i>
							    <svg width="24" height="24" style="shape-rendering:geometricPrecision;text-rendering:geometricPrecision;image-rendering:optimizeQuality;fill-rule:evenodd;clip-rule:evenodd" viewBox="0 0 24 24">
									<path style="opacity:.797" fill="#2bb4e2" d="M24.5.5a18.4 18.4 0 0 1 6 .5q9.311 10.884 19 0Q61.632-.87 60 11.499q5.247 8.445 15.5 8.001 4.645 8.104-2.5 14-24.593-35.424-59-10a52.2 52.2 0 0 0-7 10l-5-5q-1-2.5 0-5 1.565-1.684 2-4 17 1 16-16 2.114-1.921 4.5-3" transform="scale(.3)"/>
									<path style="opacity:.886" fill="#fefffe" d="M34.5 15.5q25.845-1.131 37.5 22Q67.647 57.362 47.5 63 19.87 67.292 7 42.5q-.875-4.134 1-8 9.357-15.132 26.5-19m2 12q20.17 1.404 12.5 20-11.982 10.142-21-3-2.844-12.314 8.5-17" transform="scale(.3)"/>
									<path style="opacity:.769" fill="#2bb4e2" d="M37.5 31.5q3.49-.38 6 2-3.71 2.397 0 4.5 1.573.739 3-.5 2.698 6.038-3 9.5-13.627 2.374-11-11 1.963-3.037 5-4.5" transform="scale(.3)"/>
									<path style="opacity:.798" fill="#2bb4e2" d="M5.5 46.5q5.28 5.67 11 11.5 19.167 14.438 41 4a108 108 0 0 0 16-15.501q6.677 5.565 2 13-16.84.59-17 17.5a19.7 19.7 0 0 1-6.5 1.5q-5.834-3.54-12.5-6-5.499 1.244-9 5.5-5.556 1.206-10.5-1.5.799-16.703-16-17-5.445-7.245 1.5-13" transform="scale(.3)"/>
                                </svg>
							</i> View settings
                        </button>
                        <button class="menu-item" data-next="clean-menu">
                            <i>??</i> Cleaning
                        </button>
                        <button class="menu-item" id="toggle-robot-path">
                            Hide Robot Path
                        </button>

						<button class="menu-item" id="toggle-room-label">
                            Show room labels
                        </button>

                		<button class="menu-item" id="reset-selection-btn">
                            Reset Selection
                        </button>

						<button class="menu-item" data-next="spectacle-menu">
                            <i>&#128171;</i>Spectacle
                        </button>


                    </div>

                    <!-- View Menu Level 2 -->
                    <div class="menu-level" id="view-menu">

                        <div class="menu-title">View Settings</div>

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
                            <input type="range" id="x-position" min="-500" max="500" value="0" step="5">
                            <span class="slider-value" id="x-position-value">0px</span>
                        </div>

                        <div class="slider-container">
                            <label for="y-position">Vertical:</label>
                            <input type="range" id="y-position" min="-500" max="500" value="0" step="5">
                            <span class="slider-value" id="y-position-value">0px</span>
                        </div>

						<div class="slider-container">
                            <label for="map-size-range">Map Size:</label>
                            <input type="range" id="map-size-range" min="256" max="2048" value="${canvasSize}" step="64">
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
                        <div class="menu-title">Cleaning Mode</div>
                        <button class="menu-item" id="start-cleaning">
                            <i>??</i> Sweeping
                        </button>
                        <button class="menu-item" id="spot-cleaning">
                            <i>??</i> Mopping
                        </button>
                        <button class="menu-item" id="zone-cleaning">
                            <i>??</i> Sweeping and mopping
                        </button>
                        <button class="menu-item" id="mop-cleaning">
                            <i>??</i> Mopping after sweeping
                        </button>
                        <button class="menu-item" id="vacuum-cleaning">
                            <i>??</i> Custom room cleaning
                        </button>
                        <button class="back-button" data-back="main-menu">&#128072; Back</button>
                    </div>

					<!-- Cleaning Menu Level 2 -->
                    <div class="menu-level" id="spectacle-menu">
                        <div class="menu-title">Visual Spectacle</div>
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
                </div>
                <!-- End Cascading Menu System -->

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
                            <div>Current Cleaned: <span id="current-CleanedArea">0</span>m²</div>
                            <div>Current Room: <span id="current-room">-</span></div>
                        </div>
                    </div>
                </div>

                <canvas id="click-layer" width="${canvasSize}" height="${canvasSize}"></canvas>

                <script>
                    // Global variables for the script part
					const prefix = '${prefix}';
                    const colorMappings = ${JSON.stringify(colorMappings, null, 2)};
                    const roomData = ${JSON.stringify(roomData, null, 2)};
                    const scale = ${scale};
                    const offsetX = ${offsetX};
                    const offsetY = ${offsetY};
                    const roomDataMap = ${JSON.stringify(roomDataMap, null, 2)};
					const roomNameNumberMap = getRoomNameNumberMap();
                    let posHistory = ${JSON.stringify(posHistoryForScript, null, 2)};

                    let selectedRooms = [];
                    let selectedCarpets = [];
                    const mapContent = document.querySelector('.map-content');
                    const canvasSize = ${canvasSize};
                    let robotPathPoints = [];
                    let showRobotPath = true;
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
                      20: "Clean add water",
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

                    function getStatusColor(status) {
                        if (status.includes('charging')) return '#4a90e2';
                        if (status.includes('returning')) return '#f39c12';
                        if (status.includes('error')) return '#e74c3c';
                        if (status.includes('paused')) return '#95a5a6';
                        return '#000000';
                    }

					// Function to update the charging station status
                    function updateChargerStatus(status) {
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
                                statusAbove.textContent = status;

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
                                        <div class="status-effect sweep-mop-effect">
                                            <div class="combo-beam"></div>
                                            <div class="combo-water"></div>
                                            <svg class="combo-icon" viewBox="0 0 24 24">
                                                <path d="M19 11h-5V6h5m-6-1l-4 4l4 4m-7-3H5V6h3m0 11H5v-2h3m6 1l4-4l-4-4m7 3h-5v-2h5m-6-1l-4 4l4 4"/>
                                            </svg>
                                        </div>\`;
                                    effectsCSS = \`
                                        .sweep-mop-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                        }
                                        .combo-beam {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: conic-gradient(
                                                from 0deg at 50% 50%,
                                                rgba(52,152,219,0.8) 0deg,
                                                rgba(46,204,113,0.4) 180deg,
                                                transparent 360deg
                                            );
                                            animation: combo-rotate 3s linear infinite;
                                            border-radius: 50%;
                                        }
                                        .combo-water {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            background: radial-gradient(circle, rgba(46,204,113,0.3) 0%, transparent 70%);
                                            animation: water-pulse 2s infinite;
                                        }
                                        .combo-icon {
                                            position: absolute;
                                            width: 60%;
                                            height: 60%;
                                            top: 20%;
                                            left: 20%;
                                            fill: white;
                                            animation: combo-spin 4s infinite linear;
                                        }
                                        @keyframes combo-rotate {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes water-pulse {
                                            0% { transform: scale(0.8); opacity: 0.5; }
                                            50% { transform: scale(1.1); opacity: 0.8; }
                                            100% { transform: scale(0.8); opacity: 0.5; }
                                        }
                                        @keyframes combo-spin {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
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

                        		case 'clean-add-water':
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
                                            <div class="moon"></div>
                                            <div class="stars">
                                                <div class="star star1"></div>
                                                <div class="star star2"></div>
                                                <div class="star star3"></div>
                                            </div>
                                            <div class="sleep-z"></div>
                                        </div>\`;
                                    effectsCSS = \`
                                        .sleep-effect {
                                            position: absolute;
                                            width: 100%;
                                            height: 100%;
                                            top: 0;
                                            left: 0;
                                            background: rgba(25, 42, 86, 0.7);
                                            border-radius: 50%;
                                        }
                                        .moon {
                                            position: absolute;
                                            width: 50%;
                                            height: 50%;
                                            top: 25%;
                                            left: 25%;
                                            background: #f5f5dc;
                                            border-radius: 50%;
                                            box-shadow: 0 0 15px #f5f5dc;
                                            animation: moon-glow 4s infinite alternate;
                                        }
                                        .star {
                                            position: absolute;
                                            background: white;
                                            border-radius: 50%;
                                            animation: twinkle 2s infinite alternate;
                                        }
                                        .star1 { width: 3px; height: 3px; top: 20%; left: 30%; animation-delay: 0s; }
                                        .star2 { width: 4px; height: 4px; top: 60%; left: 20%; animation-delay: 0.5s; }
                                        .star3 { width: 2px; height: 2px; top: 40%; left: 70%; animation-delay: 1s; }
                                        .sleep-z {
                                            position: absolute;
                                            width: 30%;
                                            height: 10%;
                                            top: 70%;
                                            left: 35%;
                                            color: white;
                                            font-size: 12px;
                                            text-align: center;
                                            animation: z-fade 3s infinite;
                                        }
                                        @keyframes moon-glow {
                                            0% { box-shadow: 0 0 10px #f5f5dc; opacity: 0.8; }
                                            100% { box-shadow: 0 0 30px #f5f5dc; opacity: 1; }
                                        }
                                        @keyframes twinkle {
                                            0% { opacity: 0.3; transform: scale(0.8); }
                                            100% { opacity: 1; transform: scale(1.2); }
                                        }
                                        @keyframes z-fade {
                                            0%, 100% { opacity: 0; content: 'z'; }
                                            25% { opacity: 1; content: 'zz'; }
                                            50% { opacity: 1; content: 'zzz'; }
                                            75% { opacity: 0.5; content: 'zz'; }
                                        }\`;
                                    break;

                        		case 'paused':
                                    effectsHTML = \`
                                        <div class="status-effect paused-effect">
                                            <div class="pause-indicator">
                                                <div class="bar bar1"></div>
                                                <div class="bar bar2"></div>
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
                                            background: white;
                                            top: 50%;
                                            left: 30%;
                                            transform-origin: left center;
                                            animation: clock-tick 4s infinite linear;
                                        }
                                        @keyframes bar-blink {
                                            0%, 100% { opacity: 1; }
                                            50% { opacity: 0.3; }
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
    const [tx1, ty1] = toCanvas(x1, y1);
    const width = (x2-x1)*scale;
    const height = (y2-y1)*scale;

    return `
                                colorMapCtx.fillStyle = '${color}';
                                colorMapCtx.fillRect(${tx1}, ${ty1}, ${width}, ${height});`;
  }).join('')}
					}

                    // Transformation function for the script part
                    function toCanvas(x, y) {
                        return [
                            Math.round(x * scale + offsetX),
                            Math.round(y * scale + offsetY)
                        ];
                    }

                    // Update robot position
                    function updateRobotPosition(x, y) {
                        const [canvasX, canvasY] = toCanvas(x, y);
                        const robotPos = document.getElementById('robot-position');

                        if (!robotPos) {
                            console.error('Robot position element not found');
                            return;
                        }

                        robotPos.style.left = canvasX + 'px';
                        robotPos.style.top = canvasY + 'px';
                        robotPos.style.display = 'block';

                        // Add new point only if it is significantly different
                        if (robotPathPoints.length === 0 ||
                            Math.abs(robotPathPoints[robotPathPoints.length - 1][0] - canvasX) > 5 ||
                            Math.abs(robotPathPoints[robotPathPoints.length - 1][1] - canvasY) > 5) {
                            robotPathPoints.push([canvasX, canvasY]);
                            updateRobotPath();
                        }
                    }

                    // Draw robot path
                    function updatePathFromHistory(historyData) {
                        robotPathPoints = [];

                        if (!historyData || Object.keys(historyData).length === 0) {
                            console.log('Empty history data received');
                            hideRobotPosition();
                            return;
                        }

                        try {
                            // Process all history entries
                            Object.values(historyData).forEach(entry => {
                                try {
                                    let x, y;

                                    // Handle both old [x,y] format and new object format
                                    if (Array.isArray(entry)) {
                                        x = entry[0];
                                        y = entry[1];
                                    } else if (typeof entry === 'object' && entry.position) {
                                        x = entry.position.x;
                                        y = entry.position.y;
                                    } else if (typeof entry === 'string') {
                                        // Fallback for old string format
                                        const matches = entry.match(/\\[([^,]+),([^\\]]+)\\]/);
                                        if (matches && matches.length === 3) {
                                            x = parseFloat(matches[1]);
                                            y = parseFloat(matches[2]);
                                        }
                                    }

                                    if (!isNaN(x) && !isNaN(y)) {
                                        const [canvasX, canvasY] = toCanvas(x, y);
                                        robotPathPoints.push([canvasX, canvasY]);
                                    }
                                } catch (e) {
                                    console.error('Error processing position:', entry, e);
                                }
                            });

                            // Redraw the path
                            updateRobotPath();

                            // Set the last robot position
                            if (robotPathPoints.length > 0) {
                                const lastPoint = robotPathPoints[robotPathPoints.length - 1];
                                const robotPos = document.getElementById('robot-position');

                                if (robotPos) {
                                    robotPos.style.left = lastPoint[0] + 'px';
                                    robotPos.style.top = lastPoint[1] + 'px';
                                    robotPos.style.display = 'block';
                                    console.log('Robot position set to:', lastPoint);
                                }
                            } else {
                                hideRobotPosition();
                            }

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
                        const pathElement = document.getElementById('robot-path');
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

                    // Notification helper function
                    function showNotification(message, type = 'success') {
                        const existingNotif = document.querySelector('.size-change-notification');
                        if (existingNotif) existingNotif.remove();

                        const notification = document.createElement('div');
                        notification.className = 'size-change-notification';
                        notification.textContent = message;
                        notification.style.position = 'fixed';
                        notification.style.bottom = '20px';
                        notification.style.right = '20px';
                        notification.style.padding = '10px 20px';
                        notification.style.background = type === 'error' ? '#ff4444' : '#4CAF50';
                        notification.style.color = 'white';
                        notification.style.borderRadius = '5px';
                        notification.style.zIndex = '10000';
                        notification.style.transition = 'opacity 0.5s';
                        document.body.appendChild(notification);

                        setTimeout(() => {
                            notification.style.opacity = '0';
                            setTimeout(() => notification.remove(), 500);
                        }, 3000);
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
                            if (index === -1) {
                                selectedRooms.push(roomId);
                                element.classList.add('selected');
                            } else {
                                selectedRooms.splice(index, 1);
                                element.classList.remove('selected');
                            }
                            updateCurrentRoomDisplay(roomId);
                        }
                        else if (colorMappings.carpets[hex]) {
                            const carpetId = colorMappings.carpets[hex];
                            const element = document.getElementById('carpet-' + carpetId);
                            const index = selectedCarpets.indexOf(carpetId);
                            if (index === -1) {
                                selectedCarpets.push(carpetId);
                                element.classList.add('selected');
                            } else {
                                selectedCarpets.splice(index, 1);
                                element.classList.remove('selected');
                            }
                        }
                    }

                    // Update current room display
                    function updateCurrentRoomDisplay(roomId) {
                        document.getElementById('current-room').textContent = roomId;
                    }

					// WebSocket for real-time updates
                    function setupUpdates() {
                        console.log('Initializing robot updates...');
                        let lastStatusPoll = 0;

                        // 1. Polling as fallback
						const pollInterval = setInterval(() => {
							// Check status more often
							fetchLiveStatus()
								.then(processStatusUpdate)
								.catch(console.error);

                            // Query position less frequently
                            if (Date.now() - lastStatusPoll > 3000) {
								fetchRobotStatus().then(data => {
                                    if (data?.position) {
                                        updateRobotPosition(data.position.x, data.position.y);
                                        updateRoomInfo(data);
                                    }
                                }).catch(console.error);
                                lastStatusPoll = Date.now();
                            }
                        }, 2000);

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

                    // Helper functions
                    function processPositionUpdate(update) {
                        const {x, y} = update.position;
                        updateRobotPosition(x, y);

                        const [canvasX, canvasY] = toCanvas(x, y);
                        const lastPoint = robotPathPoints[robotPathPoints.length - 1];

                        if (!lastPoint ||
                            Math.abs(lastPoint[0] - canvasX) > 5 ||
                            Math.abs(lastPoint[1] - canvasY) > 5) {
                            robotPathPoints.push([canvasX, canvasY]);
                            if (robotPathPoints.length > 4000) robotPathPoints.shift();
                            updateRobotPath();
                        }

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

					// Function for the room name to find out which number belongs to it
					function getRoomNameNumberMap() {
                        const nameNumberMap = {};
						for (const [roomNumber, roomData] of Object.entries(roomDataMap)) {
                            nameNumberMap[roomData.name] = Number(roomNumber);
						}
                      return nameNumberMap;
                    }

					// Update room information
                    function updateRoomInfo(data) {
                        // Update basic info display
                        if (data.currentRoom) {
                            document.getElementById('current-room').textContent = data.currentRoom;
                        }

                        if (data.TotalArea) {
                            const cleanedArea = typeof data.CleanedArea === 'number' ? data.CleanedArea : '0';
                            document.getElementById('current-CleanedArea').textContent = cleanedArea;
                        }

                        // Optimized label update
                        const currentRoomId = data.currentRoom;
                        if (!currentRoomId) return;

                        const fixedLabels = document.querySelectorAll('.room-label-fixed');
                        if (!fixedLabels.length) return;

                        // Prepare room data (fallback to empty object if not available)
                        const roomData = {
                            TotalArea: data.TotalArea,
                            CoveragePercent: data.CoveragePercent,
                            CleanedArea: data.CleanedArea,
                            ...(data[currentRoomId] || {}) // Merge with room-specific data if available
                        };

                        fixedLabels.forEach(fixedLabel => {
                            try {
                                const labelId = fixedLabel.id.replace('room-label-', '').replace('-fixed', '');
                                const roomInfo = roomDataMap[labelId];

                                if (roomInfo && roomInfo.name === currentRoomId) {
                                    fixedLabel.innerHTML =
		                                '<div class="label-content">' +
		                                    '<strong style="font-size: 14px">' + roomInfo.name + '</strong>' +
		                                    (roomData.TotalArea ? ' <span style="font-size: 12px">' + roomData.TotalArea + ' m²</span>' : '') +
		                                    '<br>' +
		                                    (roomData.CoveragePercent ? roomData.CoveragePercent + '% covered' : 'No data') + '<br>' +
		                                    (roomData.CleanedArea ? roomData.CleanedArea + ' m² cleaned' : '') +
		                                '</div>';

									const roomElement = document.getElementById('room-' + roomNameNumberMap[roomInfo.name]);
		                            if (roomElement) {;

										// Calculate visual properties based on cleaning progress
										const coverage = roomData.CoveragePercent || 0;
										const coverageRatio = coverage / 100;

										// Visual feedback - color and opacity
										roomElement.style.opacity = 0.3 + (coverageRatio * 0.7);
										const hue = 120 * coverageRatio; // Green (120) when clean
										roomElement.querySelector('path').style.fill = 'hsla(' + hue + ', 100%, 50%, 0.5)';
									}
								}
                            } catch (e) {
                                console.error('Error updating room label:', e);
                            }
                        });
                    }

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
                        selectedRooms.forEach(id => document.getElementById('room-' + id)?.classList.remove('selected'));
                        selectedCarpets.forEach(id => document.getElementById('carpet-' + id)?.classList.remove('selected'));
                        selectedRooms = [];
                        selectedCarpets = [];
                        document.getElementById('current-room').textContent = '-';
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

                    document.getElementById('toggle-robot-path').addEventListener('click', function() {
                        showRobotPath = !showRobotPath;
                        document.getElementById('robot-path').style.display = showRobotPath ? 'block' : 'none';
                        this.textContent = showRobotPath ? 'Hide Robot Path' : 'Show Robot Path';
                    });

                    document.getElementById('toggle-room-label').addEventListener('click', function() {
                        areHiddenState = !areHiddenState;
                        stabilizeLabels();
                        this.textContent = areHiddenState ? 'Hide room labels' : 'Show room labels';
                    });

                    function debounce(func, delay) {
                        let timeout;
                        return function(...args) {
                            clearTimeout(timeout);
                            timeout = setTimeout(() => func.apply(this, args), delay);
                        };
                    }

                    const debouncedStabilizeLabels = debounce(stabilizeLabels, 500); // e.g. 300ms delay

                    clickLayer.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const event = new MouseEvent('click', {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                        });
                        handleClick(event);
                    }, { passive: false });

                    // Helper function RGB to Hex
                    function rgbToHex(r, g, b) {
                        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
                    }

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

                        // 3. Initialization
                        initializeColorMap();
                        updateSliderValues();
                        updateTransformation();
                        setupUpdates();
                        stabilizeLabels();

                        console.log('Initialization completed');
                    }


					// 1. CSS for contained labels
                    var fixLabelCSS =
                        "#map-labels-container {" +
                            "position: absolute;" +
                            "top: 0;" +
                            "left: 0;" +
                            "width: 100%;" +
                            "height: 100%;" +
                            "pointer-events: none;" +
                            "overflow: hidden;" +
                            "z-index: 103;" +
                        "}" +
                        "" +
                        ".room-label-fixed {" +
                            "position: absolute;" +
                            "transform: translate(-50%, -50%) scale(var(--scale, 1));" +
                            "transition: transform 0.2s ease-out, opacity 0.2s ease;" +
                            "will-change: transform;" +
                            "background: rgba(255, 255, 255, 0.5);" +
                            "padding: 4px 8px;" +
                            "border-radius: 4px;" +
                            "box-shadow: 0 2px 8px rgba(0,0,0,0.15);" +
                            "border: 1px solid rgba(0,0,0,0.1);" +
                            "font-size: 10px;" +
                            "font-weight: bold;" +
                            "white-space: nowrap;" +
                            "backdrop-filter: blur(2px);" +
                            "max-width: 200px;" +
                            "text-align: center;" +
                    		"color: #000000;" +
                            "contain: content;" +
                        "}" +
                        "" +
                        ".room-label-fixed .label-content {" +
                            "white-space: normal;" +
                            "word-break: break-word;" +
                        "}";

                    // 2. Updated label stabilization function
                    function stabilizeLabels() {
                        // Extract latest room data from history
                        const latestRoomData = getLatestRoomDataFromHistory(posHistory);

                        // If labels are not hidden, clean up
                        if (!areHiddenState) {
                            updatePositionCallbacks.forEach(function(cb) {
                                window.removeEventListener("resize", cb);
                                window.removeEventListener("scroll", cb);
                            });
                            updatePositionCallbacks = [];
                            document.querySelectorAll(".room-label-fixed").forEach(function(el) {
                                el.remove();
                            });
                            const container = document.getElementById("map-labels-container");
                            if (container) container.remove();
                            return;
                        }

                        // Remove old elements
                        document.querySelectorAll(".room-label-fixed").forEach(function(el) {
                            el.remove();
                        });
                        let container = document.getElementById("map-labels-container");

                        // Create container if it doesn't exist
                        if (!container) {
                            container = document.createElement("div");
                            container.id = "map-labels-container";
                            document.querySelector(".map-container").appendChild(container);
                        }

                        // Insert CSS
                        const style = document.createElement("style");
                        style.textContent = fixLabelCSS;
                        document.head.appendChild(style);

                        // For each existing label
                        document.querySelectorAll(".room-label").forEach(function(origLabel) {
                            const roomId = roomDataMap[origLabel.id.replace("room-label-", "")].name;
                            const roomData = latestRoomData[roomId] || {};

                            // Create new fixed label
                            const fixedLabel = document.createElement("div");
                            fixedLabel.className = "room-label-fixed";

							fixedLabel.innerHTML =
                                '<div class="label-content">' +
                                    '<strong style="font-size: 14px">' + roomId + '</strong>' +
                                    (roomData.TotalArea ? ' <span style="font-size: 12px">' + roomData.TotalArea + ' m²</span>' : '') +
                                    '<br>' +
                                    (roomData.CoveragePercent ? roomData.CoveragePercent + '% covered' : 'No data') + '<br>' +
                                    (roomData.CleanedArea ? roomData.CleanedArea + ' m² cleaned' : '') +
                                '</div>';
                            fixedLabel.id = origLabel.id + "-fixed";

                            // Add to container
                            container.appendChild(fixedLabel);

                            // Update position function with boundary checks
                            const updatePosition = function() {
                                const mapRect = document.querySelector(".map-container").getBoundingClientRect();
                                const labelRect = origLabel.getBoundingClientRect();

                                // Calculate relative position within map container
                                const relX = labelRect.left - mapRect.left + labelRect.width/2;
                                const relY = labelRect.top - mapRect.top + labelRect.height/2;

                                // Check if label would overlap with control panel (right 300px)
                                const panelRightEdge = mapRect.width - 100;
                                const adjustedX = relX > panelRightEdge ? panelRightEdge - 20 : relX;

                                // Ensure label stays within container bounds
                                const boundedX = Math.max(20, Math.min(mapRect.width - 20, adjustedX));
                                const boundedY = Math.max(20, Math.min(mapRect.height - 20, relY));

                                // Calculate scale based on perspective
                                const scale = Math.min(1, 1200 / (window.innerHeight * 0.5));

                                // Apply styles
                                fixedLabel.style.setProperty("--scale", scale);
                                fixedLabel.style.left = boundedX + "px";
                                fixedLabel.style.top = boundedY + "px";
                                fixedLabel.style.opacity = (scale > 0.3) ? "1" : "0";
                                fixedLabel.style.display = (labelRect.width === 0 || labelRect.height === 0) ? "none" : "block";
                            };

                            // Set up updates
                            const observer = new MutationObserver(updatePosition);
                            observer.observe(origLabel, { attributes: true });

                            window.addEventListener("resize", updatePosition);
                            window.addEventListener("scroll", updatePosition);
							// Save callback for later removal
                            updatePositionCallbacks.push(updatePosition);

                            // Initial update
                            updatePosition();
                        });
                    }

                    function updateFixedLabelsWithNewData(newPosHistory) {
                        const latestRoomData = getLatestRoomDataFromHistory(newPosHistory || posHistory);

                        document.querySelectorAll('.room-label-fixed').forEach(fixedLabel => {
                            const roomId = roomDataMap[fixedLabel.id.replace('room-label-', '').replace('-fixed', '')].name;
                            const roomData = latestRoomData[roomId] || {};

							fixedLabel.innerHTML =
                                '<div class="label-content">' +
                                    '<strong style="font-size: 14px">' + roomId + '</strong>' +
                                    (roomData.TotalArea ? ' <span style="font-size: 12px">' + roomData.TotalArea + ' m²</span>' : '') +
                                    '<br>' +
                                    (roomData.CoveragePercent ? roomData.CoveragePercent + '% covered' : 'No data') + '<br>' +
                                    (roomData.CleanedArea ? roomData.CleanedArea + ' m² cleaned' : '') +
                                '</div>';
                        });
                    }

                    function getLatestRoomDataFromHistory(posHistory) {
                        const roomData = {};

                        posHistory?.forEach(entry => {
                            if (entry.room) {
                                const key = entry.room; // Use room name directly as key
                                if (!roomData[key] || (roomData[key].timestamp < entry.timestamp)) {
									//console.log("Processing entry for room:", key, "with data:", entry); // Debug
                                    roomData[key] = {
                                        CleanedArea: entry.CleanedArea,
                                        CoveragePercent: entry.CoveragePercent,
										TotalArea: entry.TotalArea,
                                        timestamp: entry.timestamp
                                    };
                                }
                            }
                        });
						//console.log("Processed roomData:", roomData); // Debug
                        return roomData;
                    }

					// =============================================
                    // Start Menu Animation System
                    // =============================================
                    // Global variables
                    let menuTimeout;
                    const MENU_TIMEOUT_DURATION = 15000; // 5 seconds
                    let isMenuInteracting = false;
                    let lastInteractionTime = Date.now();
                    let isClosing = false;

                    // Particle System
                    class MenuParticles {
                        constructor() {
                            this.particles = [];
                            this.container = document.createElement('div');
                            this.container.className = 'menu-particles';
                            document.body.appendChild(this.container);
                        }

                        createParticle(x, y) {
                            const p = document.createElement('div');
                            p.className = 'menu-particle';
                            p.style.left = x + 'px';
                            p.style.top = y + 'px';
                            p.style.opacity = '0.8';

                            // Randomize properties
                            const size = Math.random() * 3 + 2;
                            const angle = Math.random() * Math.PI * 2;
                            const velocity = Math.random() * 2 + 1;
                            const life = Math.random() * 1000 + 500;

                            p.style.width = size + 'px';
                            p.style.height = size + 'px';
                            p.style.background = 'hsl(' + (Math.random() * 60 + 250) + ', 100%, ' + (Math.random() * 30 + 70) + '%)';

                            this.container.appendChild(p);

                            const particle = {
                                element: p,
                                x, y,
                                vx: Math.cos(angle) * velocity,
                                vy: Math.sin(angle) * velocity,
                                life,
                                born: Date.now()
                            };

                            this.particles.push(particle);
                            return particle;
                        }

                        update() {
                            const now = Date.now();
                            this.particles = this.particles.filter(p => {
                                const alive = now - p.born < p.life;
                                if (!alive) {
                                    p.element.remove();
                                    return false;
                                }

                                // Apply physics
                                p.x += p.vx;
                                p.y += p.vy;
                                p.vy += 0.05; // gravity

                                // Fade out
                                const progress = (now - p.born) / p.life;
                                p.element.style.opacity = 1 - progress;

                                // Update position
                                p.element.style.transform = 'translate(' + (p.vx * 2) + 'px, ' + (p.vy * 2) + 'px)';
                                p.element.style.left = p.x + 'px';
                                p.element.style.top = p.y + 'px';

                                return true;
                            });

                            requestAnimationFrame(() => this.update());
                        }
                    }

                    const particles = new MenuParticles();
                    particles.update();

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

                    // Animated closing with particles (for auto-close)
                    function closeAllMenusWithAnimation() {
                        if (isClosing) return;
                        isClosing = true;

                        const activeMenus = document.querySelectorAll('.menu-level.active');
                        if (activeMenus.length === 0) {
                            isClosing = false;
                            return;
                        }

                        // Particle explosion from main button
                        createCloseParticles();

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
                                isClosing = false;
                            }, 500);
                        });

                        const mainBtn = document.getElementById('main-menu-btn');
                        mainBtn.classList.remove('active');
                        mainBtn.style.transform = 'rotate(0) scale(1)';
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

                    // Create particles when opening menu
                    function createOpenParticles(element) {
                        const rect = element.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;

                        for (let i = 0; i < 15; i++) {
                            particles.createParticle(centerX, centerY);
                        }
                    }

                    // Create particles when closing menu
                    function createCloseParticles() {
                        const btn = document.getElementById('main-menu-btn');
                        const rect = btn.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;

                        for (let i = 0; i < 20; i++) {
                            particles.createParticle(centerX, centerY);
                        }
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
                                }, 500);
                            }
                        });

                        const menu = document.getElementById(menuId);
                        if (menu) {
                            menu.classList.add('active');
                            setTimeout(() => {
                                menu.style.transform = 'translateX(0) rotateY(0)';
                                menu.style.opacity = '1';
                                createOpenParticles(menu);
								// Automatically scroll up
								menu.scrollTo(0, 0);
                            }, 10);
                        }
                    }

                    // Event listeners for menu items
                    document.querySelectorAll('.menu-level, .menu-item, .back-button, .slider-container, input, label').forEach(element => {
                        element.addEventListener('mouseenter', handleInteraction);
                        element.addEventListener('mouseleave', () => {
                            isMenuInteracting = false;
                            resetMenuTimer();
                        });
                        element.addEventListener('click', handleInteraction);
                    });

                    // Improved touch support
                    document.querySelectorAll('.menu-item, .back-button, .slider-container, input').forEach(item => {
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
                            createCloseParticles();
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
                        if (!e.target.closest('.control-panel')) {
                            manuallyCloseAllMenus();
                        }
                    });

                    // Hover effects for menu items
                    document.querySelectorAll('.menu-item').forEach(item => {
                        item.addEventListener('mouseenter', function() {
                            const rect = this.getBoundingClientRect();
                            for (let i = 0; i < 3; i++) {
                                setTimeout(() => {
                                    particles.createParticle(
                                        rect.left + Math.random() * rect.width,
                                        rect.top + Math.random() * rect.height
                                    );
                                }, i * 100);
                            }
                        });
                    });

                    // Initialize
                    resetMenuTimer();
                    // =============================================
                    // End Menu Animation System
                    // =============================================

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
                                    document.getElementById('toggle-room-label').textContent = 'Show room labels';
                                    AnimationMaster.start();
                                    event.target.textContent = 'Stop Map Spectacle';
                                }
                            }
                        };

                        // Event listeners
                        document.getElementById('animation-toggle').addEventListener('click', AnimationMaster.toggle);
                        document.getElementById('animation-speed').addEventListener('input', (e) => {
                            AnimationMaster.speed = e.target.value * 0.0005;
                            document.getElementById('speed-value').textContent = e.target.value + 'x';
                        });
                    }

                    // Start the application
                    setTimeout(function() {
                        console.log('DOM fully loaded');
                        initAllInteractions();

                        // Wait briefly until everything is loaded
                        setTimeout(() => {
                            startSpectacularAnimation();
                            document.querySelector('.map-container').classList.add('animation-active');
                        }, 1500);
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
      await this.setState(DH_Did + '.vis.CharHistory' + DH_CurMap, '{}', true);
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

        await this.updateRoomStates(roomPath, {
          Name: currentSegment.Name,
          TotalArea: parseFloat((roomData[roomName].totalArea / 10000).toFixed(2)),
          CleanedArea: parseFloat((cleanedArea / 10000).toFixed(2)),
          CoveragePercent: parseFloat(coveragePercent.toFixed(1)),
          LastUpdate: new Date().toISOString()
        });


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
 * Handles coordinate system wrapping for angular values (>180� cases)
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

  async DH_connectMqtt() {
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
      DH_NowStatus = JSON.parse(JSON.stringify(InSetvalue));
      InSetvalue = DreameStatus[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P4' /*"Suction level"*/ ) {
      InSetvalue = DreameSuctionLevel[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P5' /*"Water volume"*/ ) {
      InSetvalue = DreameWaterVolume[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P6' /*"Water tank"*/ ) {
      InSetvalue = DreameWaterTank[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P7' /*"Task status"*/ ) {
      DH_NowTaskStatus = JSON.parse(JSON.stringify(InSetvalue));
      InSetvalue = DreameTaskStatus[UserLang][parseInt(InSetvalue)];
    }
    if (InSetPropSPID == 'S4P23' /*"Cleaning mode"*/ ) {
      InSetvalue = DreameCleaningMode[UserLang][parseInt(InSetvalue)];
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
      InSetvalue = DreamePureWaterTank[UserLang][parseInt(InSetvalue)];
    }


    return InSetvalue;
  }

  async DH_uncompress(In_Compressed, In_path) {
    let input_Raw = In_Compressed.replace(/-/g, '+').replace(/_/g, '/');
    let decode = zlib.inflateSync(Buffer.from(input_Raw, 'base64')).toString();
    let jsondecode = decode.toString().match(/[{\[]{1}([,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis);
    let jsonread = (_ => {
      try {
        return JSON.parse(jsondecode);
      } catch (err) {
        this.log.warn('Unable to parse Map-Data: DH_uncompress | Uncompress error response: ' + err);
        return 'undefined';
      }
    })();
    if (!jsonread) {
      return;
    }

    await this.DH_PropMQTTObject(jsonread, DH_Did + '.mqtt.', 'Decode map: ');
    input_Raw = null;
    decode = null;
    jsondecode = null;
    jsonread = null;
  }

  async DH_PropMQTTObject(InData, InPath, InLog) {
    const validTaskStatuses = [1, 2, 3, 4, 5]; // List of valid task statuses for robot
    const validNowStatuses = [2, 4, 18, 19, 20]; // List of valid current statuses for robot

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
              this.log.info('Call DH_GetRobotPosition: ' + JSON.stringify(robotData));
              if (robotData) {
				  this.log.info('Pass DH_GetRobotPosition... | ' + validTaskStatuses.includes(DH_NowTaskStatus) + ' | ' + validNowStatuses.includes(DH_NowStatus));
                // Update history with the complete object
				  // If the current task status is one of the valid values and the robot is in one of the valid statuses
                if (validTaskStatuses.includes(DH_NowTaskStatus) && validNowStatuses.includes(DH_NowStatus)) {
                  await this.DH_SetHistory(robotData, DH_Did + '.vis.PosHistory' + DH_CurMap);
                  this.log.info('Call DH_SetHistory..');
                  DH_CleanStatus = true;
                  DH_SetLastStatus = false;
                }
              }
            } catch (SRPerror) {
              this.log.error(`Failed to update robot position for value: ${valueCopy}. Error: ${SRPerror.message}`);
            }

            // Check the task completion status and handle history updates
            if (DH_CompletStatus === 100) {
            // If the task is complete, reset cleaning and status flags
              DH_CleanStatus = false;
              DH_SetLastStatus = false;
              await this.resetVariables();
            }

            // If cleaning is in progress but not yet complete, record history
            if (DH_CompletStatus < 100 && DH_CleanStatus && !DH_SetLastStatus) {
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
            this.log.info("DH_SetHistory (if (typeof parsed === 'object' && parsed.position)) Set Variable : " + historyEntry);
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
        this.log.info("DH_SetHistory (if (typeof NewRobVal === 'object' && NewRobVal.position)) Set Variable : " + historyEntry);
      } else {
        throw new Error(`Invalid position format: ${typeof NewRobVal}`);
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

      this.log.info('DH_SetHistory Set: ' + historyEntry);
      // 6. Send live update with all data
      await this.setStateAsync(`${DH_Did}.vis.robotUpdate`, {
        val: JSON.stringify(historyEntry),
        ack: true
      });

      this.log.info(`Updated history: Index ${newIndex} with ${JSON.stringify(historyEntry)}`);

    } catch (error) {
      this.log.error(`SetHistory failed: ${error.message}`);
    }
  }

  async OldDH_SetHistory(NewRobVal, InRobPath) {
    try {
    // Get Robot X Y History (current robot position history)
      let RobPosOb = await this.getStateAsync(InRobPath);
      let OldObjectRobPos = JSON.parse(RobPosOb.val);

      // Get Charger New X Y (current charger position)
      let NewObjCharVal = await this.getStateAsync(DH_Did + '.mqtt.charger');
      let NewCharVal = NewObjCharVal.val;

      // Get Object Index (the last index of the robot's position history)
      const lastRobIndex = Object.keys(OldObjectRobPos).length - 1;

      // Check if the last index is valid
      if (lastRobIndex === -1 || isNaN(lastRobIndex)) {
      // If no previous history, create new entry
        OldObjectRobPos = { '0': JSON.stringify(NewRobVal) };
        await this.setState(InRobPath, JSON.stringify(OldObjectRobPos), true);

        // Create charger history entry
        const OldObjectCharPos = { '0': JSON.stringify(NewCharVal) };
        await this.setState(DH_Did + '.vis.CharHistory' + DH_CurMap, JSON.stringify(OldObjectCharPos), true);
      } else {
      // Add new robot position to the history
        OldObjectRobPos[lastRobIndex + 1] = JSON.stringify(NewRobVal);
        await this.setState(InRobPath, JSON.stringify(OldObjectRobPos), true);

      // Optionally, you can handle charger history as well:
      // OldObjectCharPos[lastRobIndex + 1] = JSON.stringify(NewCharVal);
      // await this.setState(DH_Did + ".vis.CharHistory" + DH_CurMap, JSON.stringify(OldObjectCharPos), true);
      }

      // Clean up references to avoid memory leaks
      RobPosOb = null;
      OldObjectRobPos = null;
      NewObjCharVal = null;
      NewCharVal = null;

    } catch (error) {
    // Log any error that occurs
      this.log.error('DH_SetHistory Error: ' + error.message);
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
        if (VarPointValue !== 'Infinity') {
          VarPointValue = JSON.parse(VarPointValue);
        } else {
          VarPointValue = 0;
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
          this.log.info(`Checking cleaning status => Room: ${roomName} (${roomNumber}) => ${cleaningState.val}`);
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

    // Wait until washing starts: status is "Washing", "Clean Add Water" oder "Adding Water"
    const activeWashStatuses = [
      DreameSelfWashBaseStatus[UserLang][1], // "Washing"
      DreameSelfWashBaseStatus[UserLang][5], // "Clean Add Water"
      DreameSelfWashBaseStatus[UserLang][6]  // "Adding Water"
    ];

    // Wait until washing process starts ("Washing", "Clean Add Water" oder "Adding Water")
    let washStatus;
    do {
      await this.wait(2000);
      washStatus = (await this.getStateAsync(`${DH_Did}.state.SelfWashBaseStatus`))?.val;
	  this.log.info(`Current Self-Wash-Base Status: ${washStatus}`);  // Add logging to monitor status changes
    } while (!activeWashStatuses.includes(washStatus));

    // Wait until washing process is complete (status is NOT "Washing", "Clean Add Water" oder "Adding Water" anymore)
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

  /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
  onUnload(callback) {
    try {
      this.log.info('cleaned everything up...');
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

        if (id.endsWith('.alexaSpeakMode')) {
          await this.updateSpeakMode(state?.val);
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