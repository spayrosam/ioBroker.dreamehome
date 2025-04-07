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
const DreameLevel = {
  0: 'Silent',
  1: 'Basic',
  2: 'Strong',
  3: 'Full Speed'
};
const DreameSetCleaningMode = {
  0: 'Sweeping',
  1: 'Mopping',
  2: 'Sweeping and Mopping'
};


const DreameRoute = {
  1: 'Standart',
  2: 'Intensive',
  3: 'Deep',
  546: 'Intelligent'
};
const DreameRoomClean = {
  0: 'No',
  1: 'Yes'
};
const UpdateCleanset = true;
let CheckRCObject = false;
let CheckSCObject = false;
let CheckUObject = true;
const IsRoomsSettings = [];
//=======================>Start Map Color
const ColorsItems = ['#abc7f8', '#E6B3ff', '#f9e07d', '#b8e3ff', '#b8d98d', '#FFB399', '#99FF99', '#4DB3FF', '#80B388', '#E6B3B3', '#FF99E6', '#99E6E6', '#809980', '#E6FF80', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D', '#80B300', '#809900', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC', '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#1AB399', '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#1AFF33', '#999933', '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D', '#6666FF'];
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
let fullQuality = '';
const DH_ScaleValue = 20; // Min 14 | Default 14.5
//<=================End Map Settings
//=================>Start Global
let DH_OldTaskStatus = -1, DH_NewTaskStatus = -1, DH_NowTaskStatus = -1, DH_NowStatus = -1, DH_CleanStatus = false, DH_SetLastStatus = false, DH_CompletStatus = 0;
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

const DreameSetWaterVolume = {'EN': { '-1': 'Unknown'},'DE': {'-1': 'Unbekannt'}};
for (let i = 1; i < 33; i++) {
  ((i < 33) ? DreameSetWaterVolume['EN'][i] = 'Ultra ' + i : '') && (DreameSetWaterVolume['DE'][i] = 'Ultra ' + i);
  ((i < 28) ? DreameSetWaterVolume['EN'][i] = 'Height ' + i : '') && (DreameSetWaterVolume['DE'][i] = 'Hoch ' + i);
  ((i < 17) ? DreameSetWaterVolume['EN'][i] = 'Middle ' + i : '') && (DreameSetWaterVolume['DE'][i] = 'Mittel ' + i);
  ((i < 6) ? DreameSetWaterVolume['EN'][i] = 'Low ' + i : '') && (DreameSetWaterVolume['DE'][i] = 'Niedrig ' + i);
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
  '-1': 'Current room cleaning number'
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
const Alexanumbers = {
  'one': 1,
  'two': 2,
  'three': 3,
  'ein': 1,
  'zwei': 2,
  'drei': 3
};
const suctionLevels = {
  'EN': ['light', 'medium', 'strong', 'maximum'],
  'DE': ['leicht', 'mittel', 'stark', 'maximal']
};

const suctionSynonyms = {
  'EN': {
    'light': 'light',
    'quiet': 'light',
    'silent': 'light',
    'low': 'light',
    'soft': 'light',
    'eco': 'light',
    'gentle': 'light',
    'whisper': 'light',

    'medium': 'medium',
    'normal': 'medium',
    'standard': 'medium',
    'regular': 'medium',
    'default': 'medium',

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
    'leicht': 'leicht',
    'leise': 'leicht',
    'ruhig': 'leicht',
    'niedrig': 'leicht',
    'sanft': 'leicht',
    'eco': 'leicht',
    'schonend': 'leicht',
    'flüsterleise': 'leicht',

    'mittel': 'mittel',
    'normal': 'mittel',
    'standard': 'mittel',
    'regulär': 'mittel',
    'default': 'mittel',

    'stark': 'stark',
    'hoch': 'stark',
    'kraftvoll': 'stark',
    'intensiv': 'stark',
    'tief': 'stark',

    'maximal': 'maximal',
    'turbo': 'maximal',
    'boost': 'maximal',
    'max': 'maximal',
    'voll': 'maximal',
    'ultra': 'maximal',
    'höchste': 'maximal'
  }
};

const moppingLevels = {
  'EN': ['dry', 'halfwet', 'wet'],
  'DE': ['trocken', 'halbnass', 'nass']
};

const moppingSynonyms = {
  'EN': {
    'dry': 'dry',
    'low': 'dry',
    'minimal': 'dry',
    'barely': 'dry',
    'light': 'dry',
    'soft': 'dry',

    'halfwet': 'halfwet',
    'medium': 'halfwet',
    'damp': 'halfwet',
    'moist': 'halfwet',
    'slightly wet': 'halfwet',
    'mid': 'halfwet',

    'wet': 'wet',
    'high': 'wet',
    'max': 'wet',
    'soaked': 'wet',
    'very wet': 'wet',
    'deep clean': 'wet',
    'intense': 'wet'
  },
  'DE': {
    'trocken': 'trocken',
    'niedrig': 'trocken',
    'minimal': 'trocken',
    'kaum': 'trocken',
    'leicht': 'trocken',
    'sanft': 'trocken',

    'halbnass': 'halbnass',
    'mittel': 'halbnass',
    'feucht': 'halbnass',
    'leicht feucht': 'halbnass',
    'mäßig nass': 'halbnass',

    'nass': 'nass',
    'hoch': 'nass',
    'max': 'nass',
    'durchnässt': 'nass',
    'sehr nass': 'nass',
    'tiefenreinigung': 'nass',
    'intensiv': 'nass'
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
    43: 'at'


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
    43: 'bei'
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
      await this.setObjectNotExists(In_path + 'map.Update', {
        type: 'state',
        common: {
          name: 'Update cleanset Path',
          type: 'boolean',
          role: 'switch',
          write: true,
          read: true,
          def: true
        },
        native: {},
      });
      try {
        const CheckUObjectOb = await this.getStateAsync(In_path + 'map.Update');
        CheckUObject = CheckUObjectOb.val;
      } catch (error) {
        this.log.error(error);
        if (CheckUObject == null) {
          CheckUObject = true;
        }
      }
      await this.setObjectNotExists(In_path + 'map.Start-Clean', {
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
      try {
        const CheckSCObjectOb = await this.getStateAsync(In_path + 'map.Start-Clean');
        CheckSCObject = CheckSCObjectOb.val;
      } catch (error) {
        this.log.error(error);
        if (CheckSCObject == null) {
          CheckSCObject = false;
        }
      }
      await this.setObjectNotExists(In_path + 'map.Restart', {
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
      try {
        const CheckRCObjectOb = await this.getStateAsync(In_path + 'map.Restart');
        CheckRCObject = CheckRCObjectOb.val;
      } catch (error) {
        this.log.error(error);
        if (CheckRCObject == null) {
          CheckRCObject = false;
        }
      }

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
  }




  async DH_setRoomPath(SegSPath, SegSState, SegSName) {
    await this.extendObject(SegSPath,{
      type: 'state',
      common: {
        name: SegSName,
        type: 'number',
        role: 'level',
        states: SegSState,
        write: true,
        read: true,
        def: -1
      },
      native:
			{},
    });
  }
  async DH_setCarpetPath(CarpSPath, CarpSName, CarpSnative) {
    await this.extendObject(CarpSPath,{
      type: 'state',
      common: {
        name: CarpSName,
        type: 'boolean',
        role: 'switch',
        write: true,
        read: true,
        def: false,
      },
      native: CarpSnative
    });
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
    await this.DH_RequestNewMap();
    if (!DH_Map) {
      this.log.warn(DreameInformation[UserLang][3] + DH_CurMap + DreameInformation[UserLang][4]);
      return;
    }
    const canvas = createCanvas();
    const context = canvas.getContext('2d');
    canvas.height = 1024;
    canvas.width = 1024;
    let ExportHTML = '<html> <head> </head> <body>  <div id="Cam" class="CamPer">';
    const DH_FillRooms = false;
    const DH_RoomsNumberState = [];
    const rooms = DH_Map[DH_CurMap]['walls_info'].storeys[0].rooms; //First Map
    //alert(JSON.stringify(rooms));
    const doors = DH_Map[DH_CurMap]['walls_info'].storeys[0].doors;
    //alert(JSON.stringify(doors));
    const carpet = DH_Map[DH_CurMap]['carpet_info'];
    //alert(JSON.stringify(carpet));
    const funiture = DH_Map[DH_CurMap]['funiture_info'];
    const charger = DH_Map[DH_CurMap]['charger'];
    const origin = DH_Map[DH_CurMap]['origin'];
    const CenterCoordinateRoom = [];
    //==================>Get Zero X and Y
    let costXMin = Number.POSITIVE_INFINITY,
      costXMax = Number.NEGATIVE_INFINITY,
      tmpcostXMin = 0,
      tmpcostXMax = 0,
      costYMin = Number.POSITIVE_INFINITY,
      costYMax = Number.NEGATIVE_INFINITY,
      tmpcostYMin = 0,
      tmpcostYMax = 0;
    for (const iRoom in rooms) {
      const walls = rooms[iRoom]['walls'];
      //this.log.info(JSON.stringify(walls));
      for (const iWall in walls) {
        //=======================Get X
        tmpcostXMin = walls[iWall]['beg_pt_x'];
        if (tmpcostXMin < costXMin) {
          costXMin = tmpcostXMin;
        }
        tmpcostXMin = walls[iWall]['end_pt_x'];
        if (tmpcostXMin < costXMin) {
          costXMin = tmpcostXMin;
        }
        tmpcostXMax = walls[iWall]['beg_pt_x'];
        if (tmpcostXMax > costXMax) {
          costXMax = tmpcostXMax;
        }
        tmpcostXMax = walls[iWall]['end_pt_x'];
        if (tmpcostXMax > costXMax) {
          costXMax = tmpcostXMax;
        }
        //=======================Get Y
        tmpcostYMin = walls[iWall]['beg_pt_y'];
        if (tmpcostYMin < costYMin) {
          costYMin = tmpcostYMin;
        }
        tmpcostYMin = walls[iWall]['end_pt_y'];
        if (tmpcostYMin < costYMin) {
          costYMin = tmpcostYMin;
        }
        tmpcostYMax = walls[iWall]['beg_pt_y'];
        if (tmpcostYMax > costYMax) {
          costYMax = tmpcostYMax;
        }
        tmpcostYMax = walls[iWall]['end_pt_y'];
        if (tmpcostYMax > costYMax) {
          costYMax = tmpcostYMax;
        }
      }
    }
    const ScaleXZero = (DH_ScaleValue / 10);
    const ScaleYZero = ((DH_ScaleValue / 10) - 0.5);
    origin[0] = 0 - (((canvas.width - Math.round(costXMax + costXMin)) + Math.round(costXMax)) * ScaleXZero);
    origin[1] = 0 - (((canvas.height - Math.round(costYMax + costYMin)) + Math.round(costYMax)) * ScaleYZero);
    if (LogData) {
      this.log.info('Max X Cordinate Segment ' + (Math.round(costXMax) / DH_ScaleValue));
      this.log.info('Min X Cordinate Segment ' + (Math.round(costXMin) / DH_ScaleValue));
      this.log.info('Max Y Cordinate Segment ' + (Math.round(costYMax) / DH_ScaleValue));
      this.log.info('Min Y Cordinate Segment ' + (Math.round(costYMin) / DH_ScaleValue));
      this.log.info('Zero X Cordinate Segment ' + (origin[0] / DH_ScaleValue));
      this.log.info('Zero Y Cordinate Segment ' + (origin[1] / DH_ScaleValue));
    }
    //==================>Create Wall Canvas
    const iWallcanvas = createCanvas(canvas.width, canvas.height);
    const Wallcontext = iWallcanvas.getContext('2d');
    Wallcontext.clearRect(0, 0, canvas.width, canvas.height);
    Wallcontext.fillStyle = WallColor;
    Wallcontext.lineWidth = WallLineWidth;
    Wallcontext.strokeStyle = WallStrokeColor;
    //==================>Split Rooms Canvas
    context.strokeStyle = RoomsStrokeColor;
    //==================>Draw graphics Wall
    const RoomsContext = [];
    context.lineWidth = RoomsLineWidth;
    for (const iRoom in rooms) {
      //==================>Declare Room State
      DH_RoomsNumberState.push(rooms[iRoom]['room_id']);
      DH_RoomsNumberState[rooms[iRoom]['room_id']] = 0;
      //<=====================Declare Room State
      //==================>Split Rooms Canvas
      const iRoomcanvas = createCanvas(canvas.width, canvas.height);
      const Tempcontext = iRoomcanvas.getContext('2d');
      Tempcontext.clearRect(0, 0, canvas.width, canvas.height);
      Tempcontext.lineWidth = 6;
      const iRoomID = rooms[iRoom]['room_id'];
      const NewColorSegment = await this.DH_hexToRgbA(ColorsItems[iRoomID]);
      Tempcontext.fillStyle = NewColorSegment.RGBA;
      //<==================End Split Rooms Canvas
      context.fillStyle = NewColorSegment.RGBA;
      const walls = rooms[iRoom]['walls'];
      context.beginPath();
      Wallcontext.beginPath();
      Tempcontext.beginPath();
      for (const iWall in walls) {
        const point1 = {
          x: (walls[iWall]['beg_pt_x'] + (origin[0] * -1)) / DH_ScaleValue,
          y: (walls[iWall]['beg_pt_y'] + (origin[1] * -1)) / DH_ScaleValue,
        };
        Wallcontext.lineTo(point1.x, point1.y);
        const point2 = {
          x: (walls[iWall]['end_pt_x'] + (origin[0] * -1)) / DH_ScaleValue,
          y: (walls[iWall]['end_pt_y'] + (origin[1] * -1)) / DH_ScaleValue,
        };
        //==================>Add Map Canvas
        context.lineTo(point2.x, point2.y);
        //==================>Add Wall Canvas
        Wallcontext.lineTo(point2.x, point2.y);
        //==================>Add Room Canvas
        Tempcontext.lineTo(point2.x, point2.y);
      }
      context.closePath();
      context.fill();
      Wallcontext.stroke();
      Wallcontext.closePath();
      Tempcontext.closePath();
      Tempcontext.fill();
      fullQuality = iRoomcanvas.toDataURL('image/png', 1.0);
      if (LogData) {
        this.log.info('Room N: ' + iRoomID + ': ' + fullQuality);
      }
      ExportHTML += ' <img id="Room' + iRoomID + '" class="DH_Mapimages"' + 'onclick="DH_SelectTheRoom(' + iRoomID + ')" src="' + fullQuality + '" >';
      const CenterW = await this.CalculateRoomCenter(walls);
      let ExportRoomName = '';
      for (const iCHroomID in CheckArrayRooms) {
        if (CheckArrayRooms[iCHroomID].Id == rooms[iRoom]['room_id']) {
          ExportRoomName = CheckArrayRooms[iCHroomID].Name;
          break;
        }
      }
      CenterCoordinateRoom.push({'RN' :rooms[iRoom]['room_id'], 'X': (((CenterW.Rx * -1) + (origin[0] * -1)) / DH_ScaleValue) , 'y': (((CenterW.Ry * -1) + (origin[1] * -1)) / DH_ScaleValue), 'RM': ExportRoomName});
    }
    //Doors
    context.globalAlpha = 1.0;
    Wallcontext.fillStyle = DoorsColor;
    Wallcontext.lineWidth = DoorsLineWidth;
    Wallcontext.strokeStyle = DoorsStrokeColor;
    for (const iDoors in doors) {
      Wallcontext.beginPath();
      //context.beginPath();
      //alert(JSON.stringify(doors[iDoors]["beg_pt_x"]));
      const point1 = {
        x: (doors[iDoors]['beg_pt_x'] + (origin[0] * -1)) / DH_ScaleValue,
        y: (doors[iDoors]['beg_pt_y'] + (origin[1] * -1)) / DH_ScaleValue,
      };
      const point2 = {
        x: (doors[iDoors]['end_pt_x'] + (origin[0] * -1)) / DH_ScaleValue,
        y: (doors[iDoors]['end_pt_y'] + (origin[1] * -1)) / DH_ScaleValue,
      };
      Wallcontext.globalCompositeOperation = 'destination-out';
      Wallcontext.moveTo(point1.x, point1.y);
      Wallcontext.lineTo(point2.x, point2.y);
      Wallcontext.stroke();
      Wallcontext.fill();
      Wallcontext.closePath();
    }
    //Charger
    context.beginPath();
    context.lineWidth = ChargerLineWidth;
    context.strokeStyle = ChargerStrokeColor;
    context.globalAlpha = 0.2;
    context.rect((charger[0] + (origin[0] * -1)) / DH_ScaleValue, (charger[1] + (origin[1] * -1)) / DH_ScaleValue, 40 * (10 / DH_ScaleValue), 40 * (10 / DH_ScaleValue));
    context.stroke();
    context.closePath();
    //carpet
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 0.1;
    context.fillStyle = CarpetColor;
    context.beginPath();
    context.lineWidth = CarpetLineWidth;
    context.strokeStyle = CarpetStrokeColor;
    //carpet Map
    const iCarpetMapcanvas = createCanvas(canvas.width, canvas.height);
    const iCarpetMapcontext = iCarpetMapcanvas.getContext('2d');
    for (const icarpet in carpet) {
      const iCarpetcanvas = createCanvas(canvas.width, canvas.height);
      const Tempcontext = iCarpetcanvas.getContext('2d');
      Tempcontext.clearRect(0, 0, canvas.width, canvas.height);
      Tempcontext.globalAlpha = 0.2;
      Tempcontext.beginPath();
      Tempcontext.rect(((carpet[icarpet][0]) + (origin[0] * -1)) / DH_ScaleValue, ((carpet[icarpet][1]) + (origin[1] * -1)) / DH_ScaleValue,
        (Math.max(carpet[icarpet][0], carpet[icarpet][2]) - Math.min(carpet[icarpet][0], carpet[icarpet][2])) / DH_ScaleValue, (carpet[icarpet][3] - carpet[icarpet][1]) / DH_ScaleValue);
      Tempcontext.stroke();
      Tempcontext.fill();
      Tempcontext.closePath();
      //carpet Map
      iCarpetMapcontext.beginPath();
      const iCarpetID = parseInt(icarpet);
      const NewColorCarpet = await this.DH_hexToRgbA(ColorsCarpet[iCarpetID]);
      iCarpetMapcontext.fillStyle = NewColorCarpet.RGBA;

      iCarpetMapcontext.rect(((carpet[icarpet][0]) + (origin[0] * -1)) / DH_ScaleValue, ((carpet[icarpet][1]) + (origin[1] * -1)) / DH_ScaleValue,
        (Math.max(carpet[icarpet][0], carpet[icarpet][2]) - Math.min(carpet[icarpet][0], carpet[icarpet][2])) / DH_ScaleValue, (carpet[icarpet][3] - carpet[icarpet][1]) / DH_ScaleValue);
      //iCarpetMapcontext.stroke();
      iCarpetMapcontext.fill();
      iCarpetMapcontext.closePath();

      fullQuality = iCarpetcanvas.toDataURL('image/png', 1.0);
      if (LogData) {
        this.log.info("Carpet N': " + carpet[icarpet][4] + ': ' + fullQuality);
      }
      ExportHTML += ' <img id="Carpet' + icarpet + '" class="DH_Carpetimages"' + 'onclick="DH_SelectTheCarpet(' + icarpet + ')" src="' + fullQuality + '" >';
    }
    fullQuality = iCarpetMapcanvas.toDataURL('image/png', 1.0);
    if (LogData) {
      this.log.info('Carpet Map: ' + fullQuality);
    }
    ExportHTML += ' <img id="CarpetMap" class="DH_CarpetMap" src="' + fullQuality + '" >';

    fullQuality = canvas.toDataURL('image/png', 1.0);
    if (LogData) {
      this.log.info('BG: ' + fullQuality);
    }
    ExportHTML += ' <img id="BG" class="DH_BGMapimages" src="' + fullQuality + '" >';
    fullQuality = iWallcanvas.toDataURL('image/png', 1.0);
    if (LogData) {
      this.log.info('Walls: ' + fullQuality);
    }
    ExportHTML += ' <img id="Walls" class="DH_Wallapimages" src="' + fullQuality + '" >' +
            ' <canvas id="DHMapcanvas" width="1024" height="1024" class="MapDHcanvas" onclick="DH_SelectTheRoom(1)"></canvas>' +
            ' <canvas id="DHRobotcanvas" width="1024" height="1024" class="RobotDHcanvas" onclick="DH_SelectTheRoom(1)"></canvas>' +
		    ' <canvas id="ChargerPos" width="1024" height="1024" class="DHCharger"></canvas>' +
		    ' <canvas id="ChargerAN" width="1024" height="1024" class="DHChargerAN" onclick="DH_SelectTheRoom(1)"></canvas>' +
		    ' <canvas id="SettingsCanvas" width="1024" height="1024" class="DHCharger" onclick="DH_SelectTheRoom(1)"></canvas>' +
            ' </div>' +
            ' <div id="DVViewControl" class="ViewControl">' +
            ' <img id="DreameRotate" class="MapRotate" onclick="DH_RotateMap()" src="data:image/png;base64,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">' +
            ' <img id="DreameCarpet" class="MapCarpet" onclick="DH_Carpet()" src="data:image/png;base64,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">' +
            ' <img id="DreameMove" class="MapMoveMap" onclick="DH_MoveMap()" src="data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAsRQTFRFAAAA////////////////////////////////////////////////////////////xMTEr6+v////////b29vAAAAWlpa////WVlZCwsL0dHRrq6ux8fH////////wMDAAQEBsLCw////////////////a2trvr6+cHBw////xcXFy8vLBQUF////SkpK////////RUVFubm5////////ZWVl////////////////9PT0Li4u////////aWlp////FhYW3Nzc////5eXl////////Hx8ftra2////////////tLS0////dnZ2////WFhYX19f4+PjHR0d////////////7+/v9vb2zc3NXFxcOjo6q6ur1NTU////////////VFRU////////ZmZm////1tbW7u7u////////////////////////////////////////////////////////////4eHh////////////goKC8PDwGxsb39/fmZmZVlZW////RkZG6+vrJSUlJycn/v7+ODg4lpaWv7+/zs7OCAgI////////jo6O////R0dH/////////////////////////Pz8NjY2////bW1tGRkZTExMICAg29vb////////QkJC5ubm////////YWFhKSkpXV1d////////////////////////////uLi4vLy8////////////////////CgoKxsbGnZ2dLCws0NDQ////Tk5O8vLyMzMzUlJS+fn5w8PD6Ojo7Ozs0tLS////////+/v7////////FRUV+Pj4MjIy////PDw8////////////////////////////////////////////////////////////7e3tMDAwoaGhysrK////SUlJ////cXFx////Pz8/////tbW1////////////AbjgUgAAAOx0Uk5TACGSu+f/VlPEW0OwtE0Yif//Sd7///9k//////8Bcv////QuPMf///+3////Uf9uEf//w9f/gmUzpP//Y/n/XP//Xv8xov//YSv3//H/nP////9aFNr/////////6iSF/5Wu/77//7a/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">' +
            ' <img id="DreameReset" class="MapPerspective" onclick="DH_PerspectiveMap()" src="data:image/png;base64,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">' +
            ' <img id="DreameUp" class="MapPerspective" onclick="DH_PerspectiveMap()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAXEgAAFxIBZ5/SUgAAAtxQTFRFAAAA/////////////////////////////////////////////////////////////////////////////////////v7+////5+fnqampODg4AAAAPT09rq6u7+/v////////////////////xMTEKSkpz8/P////////////XV1dCQkJenp6////////////srKywcHB////QEBA////////////ioqKmZmZ////////YWFhcHBw////////tra2xcXF////////////TExMvb295ubmYmJiQUFBWFhYDg4O////////////QkJC1NTU////////s7Ozf39/////////////Xl5eDw8P////////////+fn5MzMz1dXV////////////gICA////////DAwM////+vr6NDQ00tLS////////ysrKBAQEfX19////////////dXV1////////////////Tk5O////////////xsbGmpqa////////////cXFxJCQk////RERE6urq////4+PjHR0dlZWV////////jo6OGhoa////////4ODg////2NjYEhISi4uL////////////g4ODOjo6////////////UlJSq6ur////////////////////SkpKw8PD////u7u77Ozs////////5OTk////////////o6OjAQEBcnJym5ubyMjI3d3d7u7u8vLy9PT03NzckpKSaWlpZGRkjY2Nx8fHvr6+hoaGWVlZgoKCubm5////n5+fLi4uGxsbjIyM////////////////////////////////////////////r6+vFRUVMDAwoaGh4eHh////////////29vb9vb2////////////////VFRU////////T09P////////////UFBQ////////////////////////////////////////////////MUMtnwAAAPR0Uk5TAAQtldLy//DPjygDAUS79vS1PAZn9/9c//////////6JAnn6////+Gol////HAWi//80/+wqdf//Zqz//53K///UxdX/////////hBmI//+r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">' +
            ' <img id="DreameDown" class="MapPerspective" onclick="DH_PerspectiveMap()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAXEgAAFxIBZ5/SUgAAAtxQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////vb29////////////SUlJ6urq/////////////////////////Pz8aGhoAAAA////S0tLJCQklZWV8PDw////////////////////////+fn5p6enNjY2QkJC+vr6////urq6Kioqm5ub7+/v////////////////////////////////pKSkMzMzqqqq////KSkpmpqa4eHh////////////////////////////////////////////7Ozsq6urOjo6GxsbjIyMtbW10dHR////////////////////////////////////2NjYwMDAl5eXJiYmCwsLfHx8paWlra2tsrKyrKysg4ODEhISWFhYgYGB1dXV6Ojo9fX1+Pj46enp19fXtra2hoaGXV1dhISEW1tbHR0dsLCwvr6+TU1N4+Pjjo6O////////////////t7e3////////////5+fnr6+v////////////4ODg////////FRUV29vb////////RkZGZmZm////////u7u7////////////////////bGxsnp6e////wcHBLS0t8/Pz////9/f3MTEx////////////////////////////////oqKi////////X19f////kJCQ////5eXlHx8f////////////////////mJiY////7e3tJycn////UFBQcHBw////////xcXF////V1dXPT09YGBgYmJi09PT////xsbG////ZWVl5OTk////////1tbWEBAQGhoa////e3t7CgoKb29v////0NDQxMTE////////////////////////////////SLanMQAAAPR0Uk5TACJJAUG3OxvQ8I8REG7v/9wmHMjbL8rgIxrP/L0CMqH9/9cxA///nDwEK5Ho////B//////7wko/s/X//////0X/////7qJaHRJTmuH///9V////47J+UioXChYoea3/////////7N7Mo5igser6/////////////////////////////////////////+R7f83/SBj+///2UB//Bar//4dw///LFP+bavc4NP//u////5T///H0CQ26ie0G/4NG/+n/kv//PucTFcb/l///Zv//Dt//v///////Qv85//9xwf///0f///9l///z5ktbtLlnCHrHLNQAAAU1SURBVHic7Zt/TNRlHMffnx1SqzPzmJRzFiVRSCuK7Mcqq0krhbYKMQ5LJAtJK5JqsVNIctko2irBguUSAmK4jDQEi4rmlrqSqOZaAk7H2qIFZkHrGFnPfe+k+/HluFvP1ufbPq8/+D7Pc58Pz+fFPXx/7fsl/E+g/7oAXYgIN0SEGyLCDRHhhohwQ0S4ISLcEBFuiAg3RIQbIsINEeGGiHBDRLghItwQEW6ICDdEhBsiwg0R4YaIcENEuCEi3BARbogIN0SEGyLCDRHhhohwQ0S4ISLcEBFuiAg3RIQbIsINEeGGiHBDRLghItwQEW6ICDdEhBsiwg0R4YaIcENEuCEi3BARbogIN0SEGyLCDRHhhohwQ0S4ISLcEBFuiAg3RIQbIsINEeGGiHBDRLghItwQEW6ICDc0ihDRn9HExxCNaZxd2286Q4nQaMThdk84ndA2vTYRB40D034ZjzB8FrnVzzPpR13z6xKZ7f0y7PTTeQNTR19gfBeOYcRRv6YCNIkk/vEbEE+DwJgq8ruwsclqSQ0YMseAs+N79FSgSWTez8DFp2xEvUASkXvy6ubOIToMXE70K2ZQD5IP6KlAk8itX+HqYbWNI/pCba5Vf/QOk7DFanyfp7GQjns2CV24rVVPBZpF1PdC1Kk2SRcaeyVq8gWkplDTctpz0RHVvpuo2zvKWQRIU/W3GC17BtHXqaSOMC2nnFRnjK1Un358Oo23iCJdVVtjElaoxtv8+uxFPGTSmDpGvuLrrTMWWktQmiVEIkFEQhGRQERERIIRkUBERESCEZFA/EUy6azwUzZPNDmLOIfNTnsDcBE1eFuMRZwxmyKJ3+A1YSyy4jk8e+CG8FNSGdY3Gk3GIqtKU5yPTRFcRa4XvOuPsUhhSQWtniK49mlUVhktxiLZLyHO9VDY2NxFxdi0zWgyFimiJ/BqadibjXUjLmx52WgyFkHROuRtDXcH+PzselRVetucRRDTh2paPmnkXLcbr1f4OqxFbCODeMM5WaCtUe0Krjzp67EWga0ftbRsksAdA+XYNnHM5C2CsgcxbUG7aVzy8/nYvnGiy1yknFbg7bWme65lt7gaaP1El7kIyvPQVL3HJGx+pROPfvBPn7sIlmzFzWsXh0R1qH+d1Xv9BtiLZIxuR25ayAH+w2zg3m6/AfYiyKhGXkrwOdeOc5cGLCwriBjnXD+4A2I6C4awszhgyAIinnOu+fv9RxJr74H/HsuDBUQ851z2Mv/F9emSWLxfFJhmBRHP4tr1fcFEN7drFLuDL7ksIeJZXLkf9Z3u7stEG60JSrOEiGdx1f6V4+t83lyHkubgNGuIoHSVOgRebzQP0u3oDL1wtIgINq7E7+3pqmE7uAifUH5IgFVEcAwz37tKba+zHcZneaGfW0akfiFyRhvwDd2EpV+apFlGBI034tLhkvgHkD7jkMnH1hFRi2tz3Vs1ddhvevFrIZFm317rPtM0C4mghbIcSU+ae1hKJCwiEoqIBNJ7DRznRJ9WWIIXp7p3HyGaRHLa8fiu6NPeTUP3PD0VaBLpHCooHX8n6jRHt/3kiJ4KdD3AvDMfZfXRJqnzsOr7NRWgS2RL/ZEF049GmdSaOrMrQVMBukSSO67At5QZVc4zj8DZoGll6XvI/7LjsTiUFUVC22s1SGqdo2t+bSK2u3pOoPhhujPC+L27n8Jm+4YI3giIDI0vwgwmxKoDyiWRBfclAv1rgh+f/RfofDWp946haMKP0qyo3gAKj9Z3rN7MotmxkYVWOImm65z7b3INvdhr6YjrAAAAAElFTkSuQmCC">' +
            ' <img id="DreameLeft" class="MapPerspective" onclick="DH_PerspectiveMap()" src="data:image/png;base64,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">' +
            ' <img id="DreameRight" class="MapPerspective" onclick="DH_PerspectiveMap()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAXEgAAFxIBZ5/SUgAAAtNQTFRFAAAA////////////////////////////////////////////////////////////////////////v7+/5OTk////////////////tra2AAAAHh4ej4+P5+fn////////////////YWFhISEhkpKS////////////zMzMBgYGWFhY////////////d3d3TU1N////////////////Pz8/hYWF////////ubm5XFxc////////ZGRksbGx////t7e3ZWVl1tbW+/v7n5+fdnZ2BQUF////YmJiy8vL////i4uLsLCw////////////eXl5CAgI////6+vrJSUlW1tb////////////////zs7OlpaWhISE////////////////////tbW1////////////////YGBg////Xl5e////iYmJ////s7Oz////////////////////Y2Nj////rq6u////////uLi4////WVlZ+Pj4////goKC////////////vr6+MjIy////////4eHh////qqqqOTk5////8fHx/////////Pz8////Ghoa////////////4ODg////////////////////////tLS0////////////gYGB////////EBAQ////////////////7+/v////////2NjYEhIS////3t7e////////g4OD////vLy8////9PT0Li4u////k5OT////6OjoIiIi////////7u7uKCgo////mZmZ////xsbG////////KSkpnZ2d////mpqa8vLyLCws////Q0ND////////kJCQ////NjY2////5eXlHx8f////////////////ampqw8PD////iIiI1NTU/f39l5eXbm5u////X19f////////Ojo6////////cXFx////////////////zc3N/////////////////////7P5GwAAAPF0Uk5TAAVswtXOtoVHDQZ1//zARAMHkv//qwii+////////sgYkP///6YMqv///38S3v//5htf9///epv//90m//9y/////////+z//3T//++P9f//FP///5UEYOr/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">' +
            ' <img id="DreameZoomOut" class="MapPerspective" onclick="DH_PerspectiveMap()" src="data:image/png;base64,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">' +
            ' <img id="DreameZoomIn" class="MapPerspective" onclick="DH_PerspectiveMap()" src=" data:image/png;base64,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">' +
            ' <img id="DreamePerspective" class="MapPerspectiveBG" onclick="DH_PerspectiveMap()" src="data:image/png;base64,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">' +
            ' </div>';
    ExportHTML += ' <script> ' +
            '       var Offline = false;' +
            '       var PerspectivePX = 2000,' +
            '         RotAngleXVar = 0,' +
            '         RotAngleYVar = 0,' +
            '         ScaleVar = 0.75,' +
            '         TranslatePX = 0,' +
            '         LastView = 1,' +
            '         CamStyleLeft = 0,' +
            '         CamStyleTop = 0,' +
            '         angle = 90;' +
            '       var CamDown = false;' +
            '       var CheckCarpet = false;' +
            '       var CheckMoveMap = false;' +
            '       var Countdown, CSeconds = 10;' +
            '       var UpdateSelectedRoomsInterval;' +
            '       var RoomCleanSettings = {};' +
            '       var RCSRotate = [0, 0, 0], VarRCSRotate = 0, RCSFactor = 1, DH_WLevel, DH_SLevel;' +
            '       var ContextSettings = document.getElementById("SettingsCanvas").getContext("2d");' +
            '       var DH_WLevel0 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAppQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////a+nmkQAAAN50Uk5TACGSu+f/H+X3sESg+vErkPatQZv4nLnVRgE5ysQb4fmyFSCV/m+M64MFDmfymLHXSQLNyQNcsx0mmXSF6HkLEGET2fs4BDKrXYTvERiGtttRBwhOyyUpdrfjdWDYwWI3MGyL5hRp3cM9Pq9e6RkceOK6vkIGrmUWcdw/x8xypXcP/NpkDF/9EoCf7O1WUoLGZripGuBw5B4tjsJLR7XzY9J/fTSa6tFZI+6R9G0sqPXfNjyngbQviDVPz/AJMc5Yj36i0I2eUFWqoSe8kyK/xdaH0w29o0AXSHyWwGuU6XFEOgAABZdJREFUeJyt2HtUU3UcAPDfr5moiAingA08DBVjIBypgwhOpuJ0Og6ejSMNjhKCD8RsWlCiqEynMPB5dlRAC5t2ClagmaEHOLwSEx0SSwhSAcMpGiAE8ihcmy/G7uvHtu8fO/d+791nd/f3/kGAEBBCrVaLcqfuXpR7aLq7tMNoIgr4Fk3/OfzcUuB4+Cp6LATaPrPWc91Tn1gIdOiy14OPHdssA07Ta83TIWxl/mkRcJYea/CEsNFDbRHQR/8Kb7HamWofeNMCoF+t7XR4HdBdoXrQr8oC4PxqfwgrAODAew+dW8wHF0H41K7jFgBcCO+2Bl82G1xezL28/JL+KKS7q5F30WwwtN4LwgL9kRA2q1febjATXHiV5uOqfHHItWvo0QhzzQRFN/3gg/KXxxwXmCs6ax4Y9S1tqV31q7/J8ldO7F6dYxYYU8FpsLv0+mwdhDm+1WaB7L94sPxNOQgdoWJww3EzwLmdvGKu/M0pfRWExz8+Yjq4Ods2CsKDIwmhg02eZlu6ySBznNMHE2SGmZDZ8GDYd6aCvBJG0LTCW4YpgaPuESMUpoH0mNyWgEDZ6OQWFUcpGjiI/w0KcFea9awptx+OTgqur8tv3CExBUw5Ga/r+pON0/zA/kn1XkkmgGmn25NVeZg0fYFq406yfpEQzJDw5lXlY/OesQ9ODJP0i0Qgzc1JKG/Gu+I/nq3cvG2s4NFEmuyPk7iXWN3bdw58ljY2UA47Bly6MCXyMlK7ipvS4aYxgTEVtM59cQRf8XUPLvO2Fo8FlEonH4CHCXt74QoIN2avRQelLprHvpWniTxde5maPVurLUUGFbHvOa9eQ+wBrvMSuMe9EBlkW8VCJU4VHIkge5tCEVuECDLH7YcqGTZvGP7dnxwOPYwG8kqs9rUdIvcAq31mYmT0KSTwmLwloKOeAgSp7ufd9w6jgDkbGG15YVQeAEvjYHjGVgRwVvOBnt8LqMGUd50TBBnU4IVa8K8LURsxDHrWk70aRQQleFGY9/ZXpFXmdbhJyhWyTynBS2K/NStQPODbGHZtC7ZFG4H7UyR1gwhvUB8hHepBbIs2AgtDg9hkQ5BhcOd5RLs1UYDOjxlZPEQQXIH8cf0UYEH4z3AJKlhyrNC7hgK0672yGNUDIaVDWzE1cTRYuhQk7UUGE0Kq9mBq4mjwJwEo5iCDQIFTE0eDFcEAYSnyJrbzF5eySUG7XsA/jw4u7Gwom08Kxp8C5YHo4LXQp5XzSMHEo2N6Ql7KgpIgUvA6G1BNyg3jOGtZ0UJSUHwCzL2K7NETs+5h+tjRoKBVnRmLDHoOMsswo4BRS5nap1Qg9Yb6qF7W++E5CvDM+rx2lP76Rcyh1S3/kQK0fZZ8DmXvQx8JbmKIKRNj0KtJcpSN+J9P7p6kwY57xkPAjUCtmGqUf/WAd25MbMaOzMbgzQDb+Ikkk/yRUPnJduDUMWNQJX40JMMOjtgQhDtWwvvYOR9moFfE0nyY2OUEJqI39az4Mgqbx4BSF6mk5G45lRcyY9IE1zacWTh2siSVJNewmihKms/1WavBbfY488PPjzD++z6ddHAWPt+9uA9/twBvBrvt4t/Wcdhl3khwUiarDyh9ca/hrgJq/RiSyXLC98iZPVPyThROCROCHHa6VZoDLbMI72LCzICMSo0KeuP/Gv7Chx4hl/ySnmpvhVlqCzSh6vf7pd6uRO+YaPG4/gxgJC6qy/e6avCY3Ade8eN3VbkA/n3CMiNc3jICL0jS+69F5nvx/+HWgPhfizI9kyqrwsPrpF+Q7REQbxGwfFZ+5PqI2TNQJM5s7PlaVKqaMqeqxalV9UOfaXsOuuXNqW9yh1MjDRIVgCW3JygNBFAXq/b32ni+PhGdnT90g/x+pI3xO/DQsEfNb31BVBtzqODY4n9lusNgTQThAgAAAABJRU5ErkJggg==";' +
            '       var DH_WLevel1 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAr5QTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////0dICkAAAAOp0Uk5TACGSu+f/H+X3sESg+vErkPatQZv4nLnVRgE5ysQb4fmyFSCV/m+M64MFDmfymLHXSQLNyQNcsx0mmXSF6HkLEGET2fs4BDKrXYTvERiGtttRBwhOyyUpdrfjdWDYwWI3MGyL5hRp3cM9Pq9e6Rkc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";' +
            '       var DH_WLevel2 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAs1QTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////7ITCiAAAAO90Uk5TACGSu+f/H+X3sESg+vErkPatQZv4nLnVRgE5ysQb4fmyFSCV/m+M64MFDmfymLHXSQLNyQNcsx0mmXSF6HkLEGET2fs4BDKrXYTvERiGtttRBwhOyyUpdrfjdWDYwWI3MGyL5hRp3cM9Pq9e6RkceOK6vkIGrmUWcdw/x8xypXcP/NpkDF/9EoCf7O1WUoLGZripGuBw5B4tjsJLR7XzY9J/fTSa6tFZI+6R9G0sqPXfNjyngbQviCo1pKxPz/AJF1gKMc5r049+ezOeonzA0CRzjWhQSt5VqkChDcW/J1eH1LxUSJMoIkyjRda9lpQIwHgvAAAHB0lEQVR4nK2Ye1xMWRzAzzHRC5VFZoopih60taRiNPowTI8Pn8mnjLxSXouELc+xNRlUVGxLD2yMdlf12ciroqRSqEY0aMvqQca7mlaSlfbe9Jjm3jtza/r90ZzzO+d+u/c8fi8ISAiEsL29ncxMZC6ZORRkVnsbOSIZ4CAK+rft60ABh8BOaRogoM5HbRQn1X07QMDRDSNQ4Bv9uoEBjkVp1eMhrDV6MiDAiSis3ALCCjPxgACt0CUsNX9tJLaCJQMAtL2vMx7eBVQ6FLfaFg4AcGaRHYR5ADBh1UuDGtWBThA26r0vBYAF4dPaORkqA52zWBnOV9CWm7Shgn1JZeCCx5YQnkdb7rBavPBRuYrA2QUUK3pKR5OlV94kcU9SEcgtsYUvcr+1mYYwiXtWNeCKPynz9Io6P9PcLkVTuixBJaBPHrNc70pXbzWECTZFKgEZz9kwt3sf3PWhsHXtMRWA0+vZWazo7i7VA8Jjm6L6D9wYr7MCwsM9CvfRw5IlW8P7DTRSGzNVI0xW4zYZHl50rr9AdjbNcWx6qayKo4+84hJh/4BUn6QahxlhvZV+ImYK99Nh/CeUAPeGak8c/uhlbyXn7urUit38/gCDYzYgpp8nr3ad0aL12HJXP4ChJ1/zRMkYNXWWaN0eRXaREHiIz7YvTMXqLXxfHG9TYBeJgBTjMe7R1XgjdkMYKRu39hV4JJAS9ncM7pC5dOeeTz+F9g0YDd9/MmzA7Mg3OdiQVRkOf+wT0CePUr9vPcEjNqZzbk7R9u8LUCAYegBGElp7dxcI18WvIg8UGEre2OSfJOIh90U3fnJ7ew5poNB3ksGy5cQ8wDKYC4NM00kDGeq+MAXnCPaI44hh6VwGlyTQSG0/FIVh9bJiJ90cuSCSHJCdrb6vLkIxD5i/Ngn08j5BCng0usbh/WMlQHDQ9IJpSBsZYMJaWl3yImU8AOath56HtpAATqw+0PTwvHJg8CiDAM4h5cC0++A/Q6I7IivUuLchEuESpcBL7smDf1N4ZLrEmJ8rDNumFHjF33a5CxkesKlYdNsPe6PlgPuD+WWtJFYQFbf34lbsjZYDpi9wZBC5IFe/NOdUtZ4rzrI38zauVAI0eEOLn49H47jQ79R/ue+Vuamm2wxlQbZaixLgec9M6ISh2UTB6jVdHfr2ioWOHa38Q+lT7ikB6n3IYWB4flzh761Izsd2FK10aQYgM1G7I4Jyy/m8BXMSewNz54JdIXIzmLNjWxEKdUsGp8Y51eKjvjegOdahxjBgUU4Q5iT2Bl7mgHx7tGGnFgkTNcEf9vOsV1UAQDsqDe5yged2NjYDq4YqpCnEOYm9gSUOoMPl2py8LJgUrwE+7nxVi3SLvlKseybl6ZyI47mtRqKonYuni6wUAvU+ANcLyC/12qzmLh0v/vD2ob38S8CgGEr+PCTqmV1fXmirELjhBCidjDamndmmkbHGwac00yzpQSmQl6u3rqF5ZLljo9hMITDwyLc3RL+6MSlhi1T0i6JMh31kyu1pCoGVlkBZUC4rx753ynNQCPQ/DqYXED5P1TV8KBsvUgPjqjA2tjeQUyuO9cWn5Wj/uvHrysi8xFzTLpVFq9FNjBeQuym6zSlCPGs4behJy3PlQYD+7kPF9r86lVVTPyxOVAI8vSb5NdZeG9+wr0d/1cEY9FjGGvA6agXWlDLni0qAOh95iXK1D+o4ZsTgNkD/fMo0drCe2jgPQM8uRC9cgLE/xOyJPNCykn+EgX7zTYPOpfIMX1iLHHI7BvfC5RJg0zr8XLEXYOlnvAQxP2tJsH5P3gU8m9DuHwGoRU+kz530wI7ipIsCJPLgZE4N7p6iZT83SKNsxtJ/ijWrsZ5ZHvjCSGeD5i6bfWVB3SrayM0tcbK3RWK9cbDV3qsGYbtxzpg88KXHq89hS0Csy4RORbKa7f7bves1VM0k3w2ZnmOz4TNszIdx9EJfipURkk5UpduF3BEn+MQTBMbeu+vmn1qB1WOAAkMBP/tpLj6lR9wmaGnQ63D+GTZYEvB598wrlfh6V9a0pRLca48TH26Pon3J2q3QObt/jZjajF8twItgt156p70em+b1CDPEOOtAhgnuGG4W8JZG4w+NJlxH5mQT/sgVODtMCGQywtVDR1Nir+MNBpiwefmS3FGmeINEiQ91STT/ltB/hDom1eZIFoh/aBFMoROtMVHyuOY0oAV63Ei1LJB5TdYLy01aOwoNgeszwj0jTG9pM9L44S2PXdPMXP9l3QN+Bdf5TrvyCz09ywQ7FNUIiEsE5lYLV9JfGTV9KvJOFDWd4eaIhlsX1oypzc1s7l/NATEyUWlJbQe9ZBR5wDz+O4LdIAFExCO2UWrX1eGenfm5WPF8UoXxAnNem9m9B82OygpzZIF9k/8Be/Rab/tCSSoAAAAASUVORK5CYII=";' +
            '       var DH_WLevel3 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAtZQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////E/HvlQAAAPJ0Uk5TACGSu+f/H+X3sESg+vErkPatQZv4nLnVRgE5ysQb4fmyFSCV/m+M64MFDmfymLHXSQLNyQNcsx0mmXSF6HkLEGET2fs4BDKrXYTvERiGtttRBwhOyyUpdrfjdWDYwWI3MGyL5hRp3cM9Pq9e6RkceOK6vkIGrmUWcdw/x8xypXcP/NpkDF/9EoCf7O1WUoLGZripGuBw5B4tjsJLR7XzY9J/fTRrlJ5uKJrq0VlVI+6RTGioWvR7fBdtLN9+8Fgz9bQ2L79TPKeBj4gqNaSsT88JCjHO06LA0CRzjVBK3qpAoQ3FJ1eH1LxUSJMio0XWvZaXS8UqAAAHrUlEQVR4nK2YeVhTxxbAZwgaFhWwfkBiMKAsAkKNBUHBRFtjQfh8QNUiCi64sDxBWrCi9EFsSlkUFz6NIi0VqAp+4PaU+BDZBBRF0FgDPCvEhwFRQSgIWFPevaxJ7r1JWM4fZObcMz/unZmzzECggkAI+/v7VbFEbFWxISFW/RLViKoA1UjoX8nfkwWcCoekc5KAOu+1UVyH7utJAuq3z0SBrQZNkwM0QmkNcyEUGf93UoDmKExoBWHdfMGkAG3RKay2fGUssIUPJgFoX6MzF94DFDoU9NmXTwLQqdIBwhIAWPB58+zGiQNXQPhO7201AGwI/xB9wZ8w0PUWm+96HW25d7TXuVybMHDNU2sIL6EtL9gg+MfvwgkCl5eRbOkXB5psPWGn2CtrgkDvB/bwZfFgm0WDWd4ZEwP6nSet0qsc+kxLh4uaHZvSJgTcVsIS6l0f7m2HMI1ROSGg8/9cYPHIOngZwPS+nScmAFzc5nKLnTzSpayD8MQ/j4wfGJyi4wfhoVGFl/70bHFYwriBxuqGn2nES2vcF8BDX10YL9ClgMo0yquWVnkaIK+4IX18QMq2rMYlS+NllburWBe9ew/hj1AC/D5O23zG782ySs9723Pr9nPGA4zhBSGhP0pe7ba0R+updeQ4gHGpr6KqsjFqyrKqXQcUxUVCYCLHxbE8F6u38n95UqIgLhIBSSaGXskNeE8cpjpfDA4bK/BoBCm+lof7yLJj34Heb+PGBkyGb3tp7ZgVGZSf2m/VJ8DAMQG3lZDafgggGMIw+6LIRjt0LEAud1osTCKM9l6rIdyVslV1IJcmbmWUphLxEH/RTVnQ31+oMjDd32L2Jl+MZQbsPbYPwvhqwJ7tCveb5akMdCYHwHMyW9DOcGuoRclAM+oZ63Ukc+b0PO/PvVQEGqsnwgqZoBCiM7MneqRHlmx+QOoISVqTpBrQpYD8Q9NhKQVL7BsrQbb6thnz9CGMrAMc3TkRr0yjPbacUQl4LLlxyVuLyyYa5GpAWWLGu/AccQvqvIiawYjA/9rmHohSa3XPMDsoUQWYtpPalLf52yY34Uce4IUtvNyLzNtftytGzgBsgc9VER/CrunsxD0qAM0bYjufNGq9EgF6CzAUoSqrj50G0pXh3DR/YKa22jzQM1E5sKQQ/EULAKVw+bRZCI2c8dJG/dAlOaMQ07Ci9TnCg+Lza5UCK5j5Ggm5aGjedPXsqqXuNElwM2YQEhabgQmnOD3+G6XAYn/7oGWDTUavW0E1ZsCIMOq+qtiN9Wg54I8xnMd98l9IIO5vBX1Yj5YDVjoxnYlSkFvML74p6qMuzna02WhSrwQ4u5WaY4dH81y96Hrbxxqfm9FVI2GoGtqr9ygBFrH5sz7F0Bg/TX2xY7hD31u32XagJTiQZ/NQCVCvq3oBhrfbofS3PuTM58KsCnHqRpzlN+2BCsq98MMezE6UBd7+EkQelLNgLT/Vh1Aoe/iejStuWL2nbQRUZhMaDMPXFURjdqIs8O4ykLcSbTioH9C8pAnOOa7Sjq1DXDlVHDOcAnO/edcNbNufI810nJ0oC3z6KRhIuYzYSq5FlhqQBLSgzidomGsxavRY4/jpqMX7kS26b4vNUzOFQL0u4HYZ+aWc9use1kWlHAubJpNfwtV4pPRdiAMtbxOe9VEIDDoDhKZowy4rSIO/g+krvOJ08hHWXUrz/oNGi5yAd/UmCoERRwffEP3qd79kf9dQe1zRSceFZ/7ISiFQZAqUFeXScoLFuOOgEBh6EiwuIxxP0aU9kQ49lIjTzzExVhboKRKc8senPWpL8/7ENz038+6cYZVVn3ERJgvIeYpu9w0eTg0H7KZlmN4sjwb0N11FR3KGlE02XV9nKgH+uiO/FlvTmNxZ1Ib+kgdzwinbwIGMsJD02PWqEqDO+6hMubsPyhzW4SkSQP9w2fD4FD11y9WAXlqGOly4SSjErIk80Lqec9QZ/Wa+1dBUrT/qKkI2uYPz1vP/fgAYfTNyqz0A24DfDHj/0hJj8558Cmgx6g89DCg1T0iPjR1B2P2rWVwAmJ43P4sZMdFyXBmtUWu38dl9zQZsZpYHvqbqBGlGMni3R0sP6qyQntPS3nIhJHjK54H5+vH7cfaYPPCNR8uHpLXglIfRkCKf3HqrQva+hqLJjQu6uXF+DnyBrfkwiT7dn2RrjBwnmq6s2HdXeGbnSYLCeAvnmcvPflg9BsilcWP5fxTjU0bFfZ6WBr0J559hiyUuJ+qhZT3e7pYSN/ZKNzGu2+PUh3uPUD8ez1SYnL3+Dnfvxr8twKtgw6690Q7AHvNGhRVtdSO20Aj3Ge4poF2fyqHEEs4ja4EpZ5YfzgoTAlnOCeQ4mlZiPt7DcNM1e0vFNdPn4D0kOvhQNiRz7pwLnknGHLU9xWsEi3q4NnSiOSY6PO74FVAjNhRmWZdJvSb7pXVgS2o5Dbi9IFwzwuMtdekVTkJPwXa+iduf7Icg+lp+pGtkafn6XcXc7xTdERBfEVjarvWhtxh39tb4ZNeKznoXVs1YWN5oKKrJ7h7fnQMSZCIrsiTHPKQUJcAyyZxgNVQAIrIuVfCJ7XDHO8Ppw33F9ipdjGfCMsn8h4+6mcou5lQFjk3+D6k/nm/ZNJz3AAAAAElFTkSuQmCC";' +
            '       var DH_SLevel0 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAmpQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////xH3ReQAAAM50Uk5TAAEFCg0TFRkbGhcSCQIxS1yBlZ6us8DHxburknBJDhhTqsvW4+n0+Pr7/Pn38OKJHA9attnv/f/ulB8QaKfX5v7z8ezo2CJSdfXl8n8nBgM3UI3R59qcg3tuaU9hcYex214RVnS36+SYZD0yHhQLFj7cIQfegkMMoChgxu2viCAEMIWTK3ngmWc1CGPSsvbTfDPEqB2LJHetVyyX6m/fkCOlRkTDLuFNXdRYv6yAlqEtQcjCzTm6OEx+KmqM1aZ6bUif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";' +
            '       var DH_SLevel1 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAtlQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////F3uooQAAAPN0Uk5TAAECAwUICwwGDhYfJCUgGxEKBxAyQ05QSkA3LSIXHDhXcoSJgnVoXDopEw0JK1J7nbK7tqmcknAwIxo2YpG3z9rSyMG4kHRHJwQZZJPV4+fl4uDc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";' +
            '       var DH_SLevel2 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAvpQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Oov7nAAAAP50Uk5TAAEFCQQGCAsDEhoiKzVDUV1jW0YqDgoTHSg2T2Zwe4WOkpGJFhAfMm6AkJ+str3Cx8m/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";' +
            '       var DH_SLevel3 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAwBQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Bz0LCAAAAQB0Uk5TAAECAwUIDBEVGh8iKDY8Py4dDwYLFCAvQ1Vlc3yFjZGTeFgEDhgkNEhggJuz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";' +
            ' ' +
            '       document.getElementById("Cam").addEventListener("mousedown", function(event) {' +
            '         if (CheckMoveMap) { CamDown = true; }' +
            '         StartCountdown();' +
            '       }, true);' +
            '       document.getElementById("Cam").addEventListener("touchstart", function(event) {' +
            '         if (CheckMoveMap) { CamDown = true; }' +
            '         StartCountdown();' +
            '       }, true);' +
            '       window.addEventListener("mouseup", function(event) {' +
            '         CamDown = false;' +
            '         StartCountdown();' +
            '         vis.conn._socket.emit("setState", "dreamehome.0.' + DH_Did + '.vis.Perspective' + DH_CurMap + '", RotAngleXVar + "," + RotAngleYVar + "," + ScaleVar + "," + TranslatePX + "," + LastView + "," + CamStyleLeft + "," + CamStyleTop + "," + angle);' +
            '       }, true);' +
            '       window.addEventListener("touchend", function(event) {' +
            '         CamDown = false;' +
            '         StartCountdown();' +
            '         CamStyleLeft = (event.changedTouches[0].pageX - ((1024 * ScaleVar) / 2)), CamStyleTop = (event.changedTouches[0].pageY - ((1024 * ScaleVar) / 2));' +
            '         vis.conn._socket.emit("setState", "dreamehome.0.' + DH_Did + '.vis.Perspective' + DH_CurMap + '", RotAngleXVar + "," + RotAngleYVar + "," + ScaleVar + "," + TranslatePX + "," + LastView + "," + CamStyleLeft + "," + CamStyleTop + "," + angle);' +
            '       }, true);' +
            '       document.addEventListener("mousemove", function(event) {' +
            '         StartCountdown();' +
            '         if (CamDown) {' +
            '           document.getElementById("Cam").style.left = (event.pageX - ((1024 * ScaleVar) / 2)) + "px";' +
            '           document.getElementById("Cam").style.top = (event.pageY - ((1024 * ScaleVar) / 2)) + "px";' +
            '           CamStyleLeft = (event.pageX - ((1024 * ScaleVar) / 2)), CamStyleTop = (event.pageY - ((1024 * ScaleVar) / 2));' +
            '         }' +
            '       }, true);' +
            '       document.addEventListener("touchmove", function(event) {' +
            '         StartCountdown();' +
            '         if (CamDown) {' +
            '           document.getElementById("Cam").style.left = (event.touches[0].pageX - ((1024 * ScaleVar) / 2)) + "px";' +
            '           document.getElementById("Cam").style.top = (event.touches[0].pageY - ((1024 * ScaleVar) / 2)) + "px";' +
            '           CamStyleLeft = (event.changedTouches[0].pageX - ((1024 * ScaleVar) / 2)), CamStyleTop = (event.changedTouches[0].pageY - ((1024 * ScaleVar) / 2));' +
            '         }' +
            '       }, true);' +
            ' ' +
            '       document.getElementById("DVViewControl").addEventListener("mousedown", function(event) {' +
            '         StartCountdown();' +
            '       }, true);' +
            '       document.getElementById("DVViewControl").addEventListener("touchstart", function(event) {' +
            '         StartCountdown();' +
            '       }, true);' +
            ' ' +
            '       FadeIn("DVViewControl");' +
            ' ' +
            '   var ColorsItems = ' + JSON.stringify(ColorsItems) + '; ';
    const RoomsIDVis = Object.keys(rooms).map(function(key) {
      return 'Room' + rooms[key]['room_id'];
    });
    ExportHTML += '   var ColorsCarpet = ' + JSON.stringify(ColorsCarpet) + '; ';
    let CarpetIDVis = [];
    if (Object.prototype.toString.call(carpet) === '[object Object]') {
      CarpetIDVis = Object.keys(carpet).map(function(key) {
        return 'Carpet' + key;
      });
	    }
    ExportHTML += ' RoomsIDVis = ' + JSON.stringify(RoomsIDVis) + '; ';
    ExportHTML += ' CarpetIDVis = ' + JSON.stringify(CarpetIDVis) + '; ';
    ExportHTML += ' CenterCoordinateRoom = ' + JSON.stringify(CenterCoordinateRoom) + '; ';
    ExportHTML += ' DH_RoomsNumberState = ' +
            JSON.stringify(DH_RoomsNumberState) + '; ' +
            '       document.querySelector(".MapCarpet").style.setProperty("--CarpetOpacityVariable", "0.4");' +
            '	    for (let i = 0; i < CarpetIDVis.length; i++) {' +
            '         document.getElementById(CarpetIDVis[i]).style.visibility = "hidden";' +
            '       }' +
            '	    document.querySelector(".MapMoveMap").style.setProperty("--MoveMapOpacityVariable", "0.4");' +
            '       var canvas = document.getElementById("DHMapcanvas");' +
            '       var context = canvas.getContext("2d");' +
            '       context.lineWidth = 5;' +
            '       context.fillStyle = "#ffffff";' +
            '       context.strokeStyle = "#ffffff";' +
            '       var TempRx, TempRy;' +
            '       var canvas2 = document.getElementById("DHRobotcanvas");' +
            '       var context2 = canvas2.getContext("2d");' +
            '       RobotImage = new Image();' +
            '       RobotImage.src = "data:image/png;base64,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";' +
            '       var DH_Map = {' +
            '         "robot": [0, 0],' +
            '         "charger": [0, 0],' +
            '         "origin": [0, 0],' +
			'         "PosHistory": [0, 0]' +
            '       };' +
            '       var charger = DH_Map["charger"], origin = DH_Map["origin"], PosHistory = DH_Map["PosHistory"];' +
			'       var DH_ScaleValue = ' + DH_ScaleValue + ';' +
            '       var ScaleXZero = (DH_ScaleValue / 10);' +
            '       var ScaleYZero = ((DH_ScaleValue / 10) - 0.5);' +
            '       origin[0] = 0 - (((canvas.width - Math.round(' + costXMax + ' + ' + costXMin + ')) + Math.round(' + costXMax + ')) * ScaleXZero);' +
            '       origin[1] = 0 - (((canvas.height - Math.round(' + costYMax + ' + ' + costYMin + ')) + Math.round(' + costYMax + ')) * ScaleYZero);' +
            '       var DH_IconW = 30;' +
            '       var DH_IconH = 30;' +
            '       document.body.style.setProperty("--RotateVariable", "rotate(" + angle + "deg)");' +
            ' ' +
            '       if (!Offline) {' +
            '         new Promise((resolve, reject) => {' +
            '           vis.conn._socket.emit("getState", "dreamehome.0.' + DH_Did + '.mqtt.charger", function(err, res) {' +
            '             if (!err && res) {' +
            '               resolve(res);' +
            '             } else {' +
            '               resolve("{val: [0, 0]}");' +
            '             }' +
            '           });' +
            '         }).then(function(result) {' +
			'                charger = eval(result.val);' +
            '         });' +
			'	         new Promise((resolve, reject) => {' +
            '	             vis.conn._socket.emit("getState", "dreamehome.0.' + DH_Did + '.vis.PosHistory' + DH_CurMap + '", function(err, res) {' +
            '	                 if (!err && res) {' +
			'	                     resolve(res);' +
            '	                 } else {' +
            '	                     resolve("{val: [0, 0]}");' +
            '	                 }' +
            '	             });' +
            '	         }).then(function(result) {' +
            '	             PosHistory = JSON.parse(result.val);' +
			'	             new Promise((resolve, reject) => {' +
            '	                 vis.conn._socket.emit("getState", "dreamehome.0.' + DH_Did + '.vis.CharHistory' + DH_CurMap + '", function(err, res) {' +
            '	                     if (!err && res) {' +
            '	                         resolve(res);' +
            '	                     } else {' +
            '	                         resolve("{val: [0, 0]}");' +
            '	                     }' +
            '	                 });' +
            '	             }).then(function(Charesult) {' +
            '	                 PosCharHistory = JSON.parse(Charesult.val);' +
            '	                 for (var [key, value] of Object.entries(PosHistory)) {' +
			'	                     var GetHistoryArray = JSON.parse(JSON.parse(value));' +
            '						 var GetCharHistoryArray = JSON.parse(JSON.parse(PosCharHistory[0]));' +
            '	                     var RovalX = (GetCharHistoryArray[0] + GetHistoryArray[0] + (origin[0] * -1)) / DH_ScaleValue;' +
            '	                     var RovalY = (GetCharHistoryArray[1] + GetHistoryArray[1] + (origin[1] * -1)) / DH_ScaleValue;' +
            '	                     point(RovalX, RovalY  + DH_IconW, context);' +
			'	                 }' +
            '	             });' +
			'	         });' +
            '       }' +
			' ' +
			'       new Promise((resolve, reject) => {' +
            '         vis.conn._socket.emit("getState", "dreamehome.0.' + DH_Did + '.vis.Perspective' + DH_CurMap + '", function(err, res) {' +
            '           if (!err && res) {' +
            '             resolve(res);' +
            '           } else {' +
             '            resolve("{val: [0,0,0.75,0,1,0,0,90]}");' +
            '           }' +
            '         });' +
            '       }).then(function(result) {' +
            '         let PerspectiveArrayStr = result.val;' +
            '         let PerspectiveArraySpl = PerspectiveArrayStr.split(",");' +
            '         var PerspectiveArray = [];' +
            '         PerspectiveArray.push(...PerspectiveArraySpl);' +
	      //'         console.log(PerspectiveArray);' +
            '         RotAngleXVar = PerspectiveArray[0];' +
            '         RotAngleYVar = PerspectiveArray[1];' +
            '         ScaleVar = PerspectiveArray[2];' +
            '         TranslatePX = PerspectiveArray[3];' +
            '         LastView = PerspectiveArray[4];' +
            '         CamStyleLeft = PerspectiveArray[5];' +
            '         CamStyleTop = PerspectiveArray[6];' +
            '         angle = PerspectiveArray[7] - 90;' +
            '         document.body.style.setProperty("--YPersRotVariable", "rotateY(" + RotAngleYVar + "deg)");' +
            '         document.body.style.setProperty("--XPersRotVariable", "rotateX(" + RotAngleXVar + "deg)");' +
            '         document.body.style.setProperty("--PersScaleVariable", "scale(" + ScaleVar + ")");' +
            '         document.body.style.setProperty("--PerspectivePXVariable", "perspective(" + PerspectivePX + "px)");' +
            '         document.body.style.setProperty("--PersTranslateVariable", "translate(" + TranslatePX + "px)");' +
            '         document.getElementById("Cam").style.left = CamStyleLeft + "px";' +
            '         document.getElementById("Cam").style.top = CamStyleTop + "px";' +
            '         DH_RotateMap();' +
            '       });' +
            ' ' +
            '       async function DHgetStateAsync(id) {' +
            '         if (Offline) {' +
            '           let X = "[" + getRandomArbitrary(' + costXMin + ', ' + costXMax + ', 50) + "," + getRandomArbitrary(' + costYMin + ', ' + costYMax + ', 50) + "]";' +
            '           return new Promise(function(resolve, reject) {' +
            '             if (X) {' + '               resolve({' +
            '                 val: X' + '               });' +
            '             } else {' +
            '               reject(Error("It broke"));' +
            '             }' +
            '           });' +
            '         } else {' +
            '           return new Promise((resolve, reject) => {' +
            '             vis.conn._socket.emit("getState", id, function(err, res) {' +
            '               if (!err && res) {' +
            '                 resolve(res);' +
            '               } else {' +
            '                 resolve("{val: [0, 0]}");' +
            '               }' +
            '             });' +
            '           });' +
            '         }' +
            '       }' +
            ' ' +
			'       var Charcanvas = document.getElementById("ChargerPos");' +
			'       var Charcontext = Charcanvas.getContext("2d");' +
			'       Charcontext.globalAlpha = 1;' +
			'       var DH_imageCharger = new Image();' +
			'       var DH_IconC = 80 * (10 / DH_ScaleValue);' +
			'       var ChrgXPoint = ((charger[0] + (origin[0] * -1)) / DH_ScaleValue) - (DH_IconC / 2);' +
			'       var ChrgYPoint = ((charger[1] + (origin[1] * -1)) / DH_ScaleValue) - DH_IconC;' +
			'       DH_imageCharger.onload = function() {' +
			'         Charcontext.drawImage(DH_imageCharger, ChrgXPoint, ChrgYPoint, DH_IconC, DH_IconC);' +
			'       };' +
			'       DH_imageCharger.src = "data:image/png;base64,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";' +
            ' ' +
			'       var CharANcanvas = document.getElementById("ChargerAN");' +
			'       var CharANcontext = CharANcanvas.getContext("2d");' +
			'       var DH_CHAnimation = new Image();' +
			'       Charcontext.globalAlpha = 1;' +
			'       var DH_imageCharger = new Image();' +
			'       var DH_imageChargerTMP = new Image();' +
			'       var DH_IconC = 80 * (10 / DH_ScaleValue);' +
			'       var ChrgXPoint = ((charger[0] + (origin[0] * -1)) / DH_ScaleValue) - (DH_IconC / 2);' +
			'       var ChrgYPoint = ((charger[1] + (origin[1] * -1)) / DH_ScaleValue) - DH_IconC;' +
			'       DH_imageCharger.onload = function() {' +
			'           Charcontext.drawImage(DH_imageCharger, ChrgXPoint, ChrgYPoint, DH_IconC, DH_IconC);' +
			'       };' +
			'       DH_imageCharger.src = "data:image/png;base64,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";' +
			'       var CharANcanvas = document.getElementById("ChargerAN");' +
			'       var CharANcontext = CharANcanvas.getContext("2d");' +
			'       var DH_CHAnimation = new Image();' +
			' ' +
			'       var DH_CHSAnimation = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAC7IEhfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAANtQTFRF////////////AAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+CUfmwAAAEl0Uk5THUAwAGOAAWdgWv9VUU1KSEZEPHhtXk4yIiM9AgMYaCQGG1YXBAU/Ug8JWTMNZictHj5FBxklcWUMLBU0E2ohQlMcNTdQbkkOR7o6TIYAAAFuSURBVHicvdTdS8JQFADwc1pLy1wapihMaA+C9EFJBVEQ9BD909Fb9BIJiUWBghUrZvXQaqbOuvvCu7OV96n7Mu65P865d7tnCAgCAxGnhSCTiZEgTNqCcHYIIE9QAwem+oJw/ksQpnuCULEE4cJn/KJMYebjlzQygVlzImSOwcV3f6qwiZk2sjL7rgYPHcfWZpbw248Y3sNOWXxG182ZKNGSJdQ5N/Bj9xFYfuC36DoVsQ0EaixEnYYtdnHCsIJ3lLHYrXPBQjCfu4m46qu7ZR5K1SZX1mOq0vUcByvJRiTdGtaD5QBK6503mg42dB0ILNrqJXU1W38CAretZqTs6lQdIAwl7bEXcVvdFhC4nL8YjZnnMoVrAAKDt8K7nec2ULiP5xzz3G5Lpw7w4Izm2+t3HFdMlOElh4Cs8RubQzw6jSSMGyW3FcK3PnasuKUF4CGBY0natYC1K8EfgNPXQjB8mD/g8YkgJIf5R/gDQyB3vsJGCtEAAAAASUVORK5CYII=";' +
			'       var DH_CHHAnimation = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAC7IEhfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAQ5QTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////L98hwgAAAFp0Uk5TAAsJA2kaRqQEBbqDT/deCvA2Ofriiv/TAua/K6xan4+Vs9Ci1cHA6CeJ/W1ByRTrZTX1gQjlVvhmDdKmh6pAG+CpFdT5+4YX/kogKcZZX/EOeq3ZRJwBYSISTO2kGAAAAa1JREFUeJxdlFsrRUEYhr8X7RyTs+wkckhISrQjyo2iXEj+InfEhXIjSbmRTZEcImmTyDm2HZmZtab1zTs3q+fp6as1M2tBzAL+JFgkLMI8i4FC0JFwaMMU8B2EJByasAz4DDoSEZqwEngLQhIRQqoLKTzrjkSMkFrgNXgXEjFCGgDc65BEjGjGb0lOdyQ8Il2Q1K0OSXhEa15Kb3RIwiPavqT8WockPKL9k0ISHtHxIVWXOiThEZ1vUn2uQxIe0f0iNThVIQmP6H2SehyrkIRH9D+INOEoCUl4RNHAnUhLNglJeLRnLfLXokaSiBEyBHNCrftJSCJGyPCTub9t+WQkiRjN3BFcmX3dS0aSiNCEGVyIdO0mIYkI7Vc4fibSs6O2koRDG06cUkjCoQ0ncSJ9Wyok4dCGU8B7Nq9CEg5deJyuw6YOQ+HQhtPZdCM2VEjCoQ1nDmpyg9sqJOHQhrM/hyMbvyok4dCG5iaNrquOhUMbzu1lsKpDEg5tWFExtqI7Fg5tOI/H7SAk4dBdivq1oCMRoQkXsB7+mUlECFkEloOORIwmLF6SMAxFjP+ipttdd3ZvDQAAAABJRU5ErkJggg==";' +
			'       var DH_CHCAnimation = "data:image/jpeg;base64,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";' +
			'       var DH_CHFAnimation = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAKoAAACqCAMAAAAKqCSwAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAwBQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Bz0LCAAAAQB0Uk5TAAEDBAUGBwgCDA4SFRcWFBMQCSpDU2R1foOBe3NoWEElDRghKTNEYZqyydbd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";' +
			'       var DH_CHWAnimation = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAwBQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Bz0LCAAAAQB0Uk5TAGwQBP1xAQfmBadGles77fFnAyWQ7v/+3A120DPYLg8WDAqRKiZzix7SGJPU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";' +
			'       var DH_CHMAnimation = "data:image/jpeg;base64,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";' +
			'       var DH_CHVAnimation = "data:image/jpeg;base64,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";' +
			'       var DH_CHEAnimation = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAE5QTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////kJcbLQAAABp0Uk5TAJnW/1wKM60fFLg9KetS9UeP4GbMhcJ6o3DvXc2sAAAGcUlEQVR4nM2ce1/iOBSGG7lZqAg66uz3/3A719V1cERZ2qWltLmfW4b6/jGj/kp4SE+S856kqMyRypRy//rHVFXZ6D+XQddEKeeKs2i8H2/13w2s6UBQtarxu/abhpWrt7PD6Jqpl+7nHqv4fc6I8mmunk8/dijjahgWQ10QnbAW29ClZ1XZdk6LtXwJX3pWjctd/d8RazHeDAqj6eqp/rfBKtTvYVk0zau6hxqs9TNw7Tk1q7uoxpruh0YxVA/HGuti6AnLVFU2WPk7fOlZdeiuA9bNv0NzWJr/OmAVr0NjOFo8q+z2aWgKR8tHlX16HJrC0fqH+mCzw1Gjj4p198/QDB7dKHUxNINHZSqsqqozJZXIM6XCWp6Gc5pVv1SjBK0UVQ+zVClSN3X/U97IUp/6Hn7IG7xNcROrmbF+JfigSWLLMr0J3EoSLHtClodrqeT+sLRbkH9SlWDx+QNYI1WMpAPawRLfgGqUILFJ31t3X5R8nrn9Zv1BjLX6qRIMnOQjcV9bDHH9YWzWxcTz1qevjU+8klr9qT7L51fCWf5gfBoscSZ4+7jTWpXWFG++H7EuJ9Lu0m7j51fhhDPfbdvSyOfvspYO8bk93sf8Upxv3X3JTvWtBElXef81e/iWIKdsxvUR6wP5jJvmzh2x5CtQKhX7hqS1BClSyiQ6zFm1WqwPU0xqp8APVgA/Jbqdr0thNcTqVv1UuxjV+m2TFbNHmX11djGyfCHJu9Yvrwlb0beiJNHVW7L8TdBfl10uozUiKDjf/939+JedFOJVl5hbaSj8BpvVtZVg3dc+nN5D7Kx+rU/GSVrRsdhp6kzvIHbNZqG90IgnboV+pc953Mq1kXobWNwlKAnWRJ8JzNE34+3sp8AyfYqJxXT+CbD0wZzZWMx4TYC1NMevhcXbAEqAlZt5qD2zs4y6HMuuY9hYrElajGVFlovFMmcGFmfJb0yYLgeLE10GFsfd5bbDcbMGxhIkxWp9hSZPMkOvlJgfloxV10IsebDoXtachMlYV+4g8WBN9tR8UIZVjXbO33wE5CEuw1p5PJe3Y6jmTITllF5rebGo5szEIna29zyiFyvPafmgBOv61TdR+qObNndpjqUWDWvhzVkCg44UXdY6S8KyPtJJASzSwibBCpx0DU1RlO4SYDkbM61CWJT6IB+rrf25Ck7ohPK6hUUYL7PQ8hvEIkSXfSfw8+k0lEWFlz+8OWNjjYN3JIyFN2fsHbJR0C5HkgW0OeNiLcNFlAgWOn3mYjmpcq9YaoXNB5lY4ciKY2ELjjysahoZ69E3RtYHeVha7c9VFAvpZW0sVBHWcayG4i3gtoJsLFTBwJ/QdE3EX4wxZ6wDBx4TZjQRfzVmMLKOZ9zEawoAFia6OFg+E2Y0AbweEV0cLNfeW01ADcCj3cFCrKbQFSAWvAQxsC6hlAyeYsD0mY7ldayGYKxVfCh7KhsglqcWYgnGmlwA+aAz1iGs9hGjmBDrBJQ+k28iGFkoLCi6qBMEHFk4LOA8sGOM40t10ITpQmVUgDmbmHcZ2NAKmjBdKCwguqy7ApTQEZGFxIJWbGMpAZarWKrcC1kmjS9B1299Dyxm8doYzuYhsaDVt7sz5Nkk8H6oq+D64LiabrLiHXoC2l/7Y2MhEpxiku3AoQ8lNCdhsdKcpLIO/IeF3hlIck4vasJ0obHkp0AhE6YLv4+S4FEZbGRRsIqp9PFKwITpIuw6iY9k4zuLgiV9dDdQgveK8k6Co1m14FS5F6kDRM9HrClHW0lYouiK10Is0cJFcAoUkyr3omGB5iwsSmRRsejb2CchTJgu4tuwT4GiUuVe1E/PfBCBFll0LN5JqnlJHMPkWGGd0wNqf67IWJwEB5/QnEQfWYzocs5BgWIMePqJI/pBSAYW+Zwe0oQZ70F+BfkxF6wJ08WZtYlPiRGyv04cLKI5C25IR8Ra40jmDG3CdPGWXkL6TEmVe/GwCCepeN/LxsPCn6TqH0YhiZk/oQ+skFLlXty0DhldvMjiYyHNGS1V7sV2pChzRjJhuthYqHwwcgAjLr5/R1Rw6AnNSYKyAphJMDKHrm32K0F3RvRghkRFmOgswZ0bGomwYpM9J8vqJStZFZNQ3N9tRI9ES7/T6GHn67DrCSP10yX+qqV8tbEd2rx4kn5fXIJvgCq2pd5K9fBL/kh7Aqxa4/1dXfoqPd/Wy9L/opvm9ZYjafEAAAAASUVORK5CYII=";' +
			'       var DH_CHBAnimation = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAArVQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////fETyYQAAAOd0Uk5TAAIEBggKDBASFhgaHA4UICYqLjI0NjhASE5SVlhaJDA+TGZweH6ChIaIHjpgcpSgrLK2ury+uELI1uLq8PL09iJ8mtL/99FiSqbG8c1o4fr85a6Kauf+6bAsRF4oPNrfolRQnPnAkmSM+Ovz3tDE4MKqkNzdds6Y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";' +
			'       var DH_CHPAnimation = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAANtQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////3q0SpgAAAEl0Uk5TAA4cJzM/SFRdZm53gIePlJqhp7G2wMXIy8/T1djd4ufp7O3w8fLo4PP29/n6+/z1+P7/u9v0rOTXr+7RxoM53tzl/XTUvi2ee2JJM7cAAAxQSURBVHiczZwJc9TIFYBbtzQz9tjYgDEQX4AD3kB2k91KUqkkW5tj/3LupFKppGpTBMga1hw+FjDGi7HHnhldLSnvdUsazYw0Fx6N2jCA0FN/0/369Xutfi2Q0YqAvwQh/mCXAvgM8Cf+YJdGe/woQkiTLByTYQRthWHmgRURifgjtsBCrKj4foA/Edt4sUImkRX8Q0q2F28rxYYPz0cuVkYhGwoLoTgM/pYqligqLSZeQjLX9/W6h3AccEiwIbDCdpIk+MU+ZM0TpJRnYP1eINkUsLzwd9hm544V9h0SyVO2pDKkXtIBoPm+42l11/OpF/bm+WJFDSWvvL526qnQVglJKpz4tuOfkmlRV8SZQE6i+Z4rmnRxh0ZNdn5YIZQsSYoszzUlKZIyayfNVInSTNWI0DyvdESpu7JFBwcbAAsUWhSgodZ31GvvVFkOZZzKV15POenTusrBCKXO/Ct3eYv35QDK3x8rbClZAihNkrnA6SurryAW/WqVk1HPBjaPhi32wVgh1Oqb6+80mfee8+ZoICZefnqqMTCP2vMvr2xzsH4N1gcLmwr6T1aqc8cya6ng22GYeLmwxCQpnT2quRSVv1+D9cbiTaVImlz1OVTpn0NDYVm4wsHEGnWoy3tyZCym6oqsKmrFx1EfvDkYCQrLzxtYFajY3LcAxlV/JCzWgbIia7LB+i94Vh8ZCkvlJj7Ecy3XZg3WqyOzsYAKtEpRZqiu4l21Fx8EheVnOHwDx5ZOlp6AhvXgysRCtQJVV9VLFjYVrf7jg6kIKa/JqGH6oWuD6vdQsCws3oFrB4qhoFZtn5wDFJbpG/BBoSMvv+AdORQWp1KW1CY6ePTpYMZzkPKLE2wwp+rsuT240rEYlarMeroCN0hfnRsUlptTwOVa0rHrZHKlYiGVoqhaSUG1OtiP70vcHSQ+sx+cKnDlCiqY27QdVLBUrjQsRqUqyzWkCh76PKQgQvvNQfyT9tSeAuI9ARVf3HUdN729UrBYD2qKdtkGLaCPklFOJMAir0Rw0wXVT+AuPlp7a2dxdWNxvVKXfaRyvo7cUgx0WDUwlJ7zSngM0eVBDSTwkYpc4q6Trl/dWDDhQA/qrK38B6FfI0m3trGe1pfHOlafRm56O9UgAj8UWXtZoPe02652YfExeEFQgcp7iP9GF2J9V5YWj11hgbzFmy6Tg0CZ3fcoenZe+/Q2qMA9iE6oExzz9uqDhbZduXmoGaDtzW9is7o/7ciy5sZKDPqhgF+nnrq0w/oMLvCpB3pvWZeeO7Rr3u7AwnlQ0XTNAHtlb4aNp9w4kNUyD74SBWKuhkMXnrtt33YIAejHgDZty3FwfuyBxUzDnVe6AZMzjEG8ApXcfqkasih19TeEztR0rj+BahJYQwjAeAzcpnXtcddw7MBCg6VNyxrYlQfsPrQV6qyvfd1ZBS8f2eKxA3GqH18ZSuBjqCdonjq226FebVioWKqmz2Kk94ALQp9uvNKq/qP0Wu6KNfvapuu1YqDhBD7BeXt6x3HcjnGT/LsgosGqGUCl/SsEBc7lmi7/N72Wj6lV3bVBZ6NnDilQXQMusxo8c9pnoTYsGISgWCVQ9+Od8BJ2iVFW5PuE/PKALJBtAg96QVYJ/OPv8G2p2zCxU2KsIQU+r0XqRf10LAHtqKaXQbHc/8W1KJpWLQkC1LJeTkzNINfYglpANWo2qEYwqgCY+8BuWDBtJ0djAgsVC74o2tFHtFWLruslNaolWXgtTtOyrDas4QRw2qYOtCBarxQsHIWazrrw5XfxRQnaz4Br2CdneCWIpaawT6AHTPiqCawhBciPAtaNVttobGHhpKOtnEEXHr5qsUqqri+f8lpOWeQSBNDb+LdpXsv0rmW1YQ0nQMj35qEbp3ZsJ2FnYizUd83QS2DhEoNIxD5ZPpOxluvz6CV5ri8quBQRvHsZ1+LGDxxagDDrRZuWaSe0XmgByJoGmiVwbzRRC7KGtUCUZ9NAAG9MEqJaTMvswBpKAMriAjj3DdNOmOUIi9kbYwG8GZo0hKKkbrwOa/lVTYBnyjVfrFKYM4Pq38Jarm46CawhBbDAJES1AzNh/4T4cQo2Fuj702Ts3FELROln7uq2MiUp8kBY/QWwVG6B1mNzxY0oJBvrgtim7121EA/9NlAVcBIlMgDWAAKsoNb77xPNJURPk2FcY2PdT97eVsuPp4+Ze+SLNw51XZ49/U8frIEEePmENZcVa1cYN8HTtNICFcjZs4lgQewYyAcQooW2i2OJImpWBRrroTcRLOkeNFcdtYub+hBLVjb2KzDtmE/a7s4Ni9w2YAqqL26C7YqxBDTwpVkInx53LDbkhqXfAYfwuImmPoiw0DoYRrm7sfLDYs3VMM3QRrC4F56lz4m6QHaOJ4Y1u0ICyz+yuNILvA/BOlQgzr3fcW+OWOg/O3VmI0IsNo8ZMEl3WId8scBG0KYZTpeIJUV9OPvnCWJ9cRz1osew4j4MusOCHLHQv4l7EbHA0SphH9afThTrVgV7sQluF8PCWbpU0Tunw9yxcGK06mi62EKfCP5fqaIWAssBLBvcCAFVCwKLsoJLbJPFgtjMbUCwAcoloGpBqAKRtPrvCWP9xIEIG+IiUC4Bp2mdqVYcHE4KS77LlAuwfMBS1FuyLaSqVr5YqFyBRp86ri8IgGUYUwpfZZss1oZG3DPTZFjoPazUZXK0N3GspTlCKzvoRQgYBjON30t72Zsv1twS13nHQ6dmw3fFdI3PGQt13lfETYalafNiuo3PG4vZef+dbXsYIK5nDsQJYMFQ3HIouvH6rJrqPuSPhU6Ec2wxLE0vgX3ocuMngQUOvXvWBN8G7YNehhkx/Q15zlhrVZgVG5btskXFVTBb1b8WAOvzGhiubctiWEYJYrELfyoA1q/fQ1SGkzX6D3oZXNO5PxYA6zdH4KA2LI5llAArfUtBzlgzq4AVtZZRhrnnm9Rtazljlb4Ps08jiZVqTfPGAnvagVXA1iqmbrGR2HpzMUGsi9ejkRjZrbQAI3csDDK43SqslS/mnFgkD+KOHnsQxfS3CuqdFtWXL2bkU9A4sahRdTHXIAq6YtNa35r/w4Sxfvsusb4VrwYmX51PBGtxIbEaGK+dpilXrlioWq2102KuNLN1+Sw7n/u6PNh4vi7feouRYrnyxEKrlXiLUdB3PviGbL2OvfjEnCCWcRv7sLIVvSHj7xPRRJw+nyDWjenQPETvEwv69rX1rvri7yeG9bvvOt9VF/TNPtsHoRsF2AcBrlZiH0RBd40UdY9NQXckkXD/VpeNyAsLrUP3/q1J73a7fjF9txtp7Q3camRijWtvYHk9Y29gYidlvJ85pZZgPDspf6Bk7aTk2qXjvtP9RG5kLvtOFxZx36llpew7DXfpGsaEdumaZvouXcL2NBu4LT0Ra+Sxpxk36doNM31Pc7gDHL9olFpActkB/hmFJp3azdoBzvbL3zxErW91I65hakbv7e+m3bFffigB1oXawaVnGfvlk9kF8b6W8WcXYLIPXsrMLghzMVAx4gVegStc79SKaPvjKAJoSN3pvavZuRg8c+XmoY6ZK+Hbg3Fnrnx5iIlkjUu9Mlcwz0dR1ZVTzMIN58Ywd0vOStuhoCh2R57PEAKYf2T1yfMJR6Oqz4BDOPMXdoVlUF7w9KwkJ0t673ZlRQ0sgNlawYlt986KCnPIXmuYJ8InIQGitX4pYZiZ1nrEEAKYTAOKZTluZwpsSsadquoazB7EekyiBLo3ilJJS6Cru+6V1Iy7gQTAIw2oObPbN+MuTCNj7pHAXmyEeftKlG7YSs7smZ84iMBalRDXAovfPz+Rf1tVnWXZnBjOji2bE8JVlmU6UDYnpq7KwMXzhCHiEIjYL5XVJ+2DaCAB6MEoJ3eQ3Nc4U9jCdEB7c0yZwhsaHjSjZ2VWZ+RVY7Y3y2CG8TiOvGpw/JBqzxk4r5pbe5lxSWPMQvc0zELPyI5Pw4q4xp6zn0nV44QDRRn7CQduRsZ+FlYO50G8tIY/DyLiWnur6EU6PYOM56yRL/fjs0bA2I9w1ggJT2a5vVesk1lIQc+xwf8s4qk/hBT0jCRS0BOlSNRgH3D+1meN8z9/i5D008pSX2ynFPHaPPvz3E8rY/NuAc92I5EHVbCT8BJgxTo3sAXWOmURvM/Jn7IYgfEjasTinEnJby7gCZ4RWOHOO02SFep02JhszGfp/h9NL7se1bIZJAAAAABJRU5ErkJggg==";' +
			'       var CharCurrentY = ChrgYPoint,' +
			'           CharCurrentX = ChrgXPoint;' +
			'       var ChrgAnimMode = 0, ChrgAnimICIW = (DH_IconC / 2), ChrgAnimICIH = (DH_IconC / 2), ChrgScale = 1, CHRGFlip = 0, ChrgAlpha = 1, ChrgAngleF = 0, ChrgAngleW = 0;' +
			' ' +
			'       setInterval(DrawSleep, 50);' +
            ' ' +
			'       setInterval(DH_RotateSettings, 2000);' +
            ' ' +
			'       setInterval(function() {' +
			'       RCSFactor = (RCSFactor < 1) ? 1 : 0.999;' +
			'       }, 400);' +
			' ' +
			'       setInterval(function() {' +
            '         UpdateMap();' +
            '       }, 1500);' +
            ' ' +
			'       function DrawSleep() {' +
            '         CharANcontext.clearRect(0, 0, 1024, 1024);' +
			'         CharANcontext.globalCompositeOperation = "destination-over";' +
			'         CharCurrentY = ((CharCurrentY - ChrgYPoint) >= 30) ? ChrgYPoint : CharCurrentY += 1;' +
			'         ChrgAlpha = 1 - ((1 / 30) * (CharCurrentY - ChrgYPoint));' +
			'         document.getElementById("ChargerAN").style.visibility = "hidden";' +
			'         if (ChrgAnimMode == 0) {' +
			'             return;' +
			'         } else if (ChrgAnimMode == 1) {' +
			'             ChrgAnimICIW = (DH_IconC / 1.5);' +
			'             ChrgAnimICIH = (DH_IconC / 2);' +
			'             CharCurrentX = ChrgXPoint;' +
			'             DH_CHAnimation.src = DH_CHSAnimation;' +
			'             CharANcontext.globalAlpha = ChrgAlpha;' +
			'         } else if (ChrgAnimMode == 2) {' +
			'             CharANcontext.fillStyle = "rgb(" + 245 + ", " + 66 + ", " + (220 - Math.floor((ChrgAlpha * 30) * 4)) + ")";' +
			'             CharANcontext.fillRect(ChrgXPoint, ChrgYPoint, 150, 150);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             ChrgAnimICIW = (DH_IconC) - ((ChrgAlpha * 30) / 5);' +
			'             ChrgAnimICIH = (DH_IconC / 2);' +
			'             CharCurrentX = ChrgXPoint;' +
			'             DH_CHAnimation.src = DH_CHHAnimation;' +
			'             CharANcontext.globalAlpha = 1 - (1 / (ChrgAlpha * 20));' +
			'         } else if (ChrgAnimMode == 3) {' +
			'             CharANcontext.fillStyle = "rgb(" + 66 + ", " + (240 - Math.floor((ChrgAlpha * 30) * 4)) + ", " + 245 + ")";' +
			'             CharANcontext.fillRect(ChrgXPoint - 100, ChrgYPoint - 100, 250, 250);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             DH_CHAnimation.src = DH_CHCAnimation;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             CharANcontext.globalAlpha = 1 - (1 / (ChrgAlpha * 20));' +
			'         } else if (ChrgAnimMode == 4) {' +
			'             CharANcontext.fillStyle = "rgb(" + 66 + ", " + (240 - Math.floor((ChrgAlpha * 30) * 2)) + ", " + 245 + ")";' +
			'             CharANcontext.fillRect(ChrgXPoint, ChrgYPoint, 150, 150);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             DH_CHAnimation.src = DH_CHWAnimation;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             CharANcontext.globalAlpha = 1;' +
			'         } else if (ChrgAnimMode == 5) {' +
			'             CharANcontext.fillStyle = "rgb(" + 235 + ", " + (230 - Math.floor((ChrgAlpha * 30) * 2)) + ", " + 77 + ")";' +
			'             CharANcontext.fillRect(ChrgXPoint, ChrgYPoint, 150, 150);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             DH_CHAnimation.src = DH_CHFAnimation;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             CharANcontext.globalAlpha = 1;' +
			'         } else if (ChrgAnimMode == 6) {' +
			'             CharANcontext.globalAlpha = 1;' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             CharANcontext.save();' +
			'             CharANcontext.fillStyle = "rgb(" + 66 + ", " + (240 - Math.floor((ChrgAlpha * 30) * 2)) + ", " + 245 + ")";' +
			'             CharANcontext.fillRect(ChrgXPoint, ChrgYPoint, 150, 150);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             DH_imageChargerTMP.src = DH_CHWAnimation;' +
			'             ChrgAngleW = (ChrgAngleW > 358) ? 0 : ChrgAngleW += 2;' +
			'             CharANcontext.translate(ChrgXPoint + ChrgAnimICIW / 2, ChrgYPoint + ChrgAnimICIH / 2);' +
			'             CharANcontext.rotate(ChrgAngleW * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_imageChargerTMP, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW, ChrgAnimICIH);' +
			'             CharANcontext.restore();' +
			'             CharANcontext.fillStyle = "rgb(" + 66 + ", " + (150 - Math.floor((ChrgAlpha * 30) * 1)) + ", " + 245 + ")";' +
			'             CharANcontext.fillRect(ChrgXPoint, ChrgYPoint, 150, 150);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             DH_CHAnimation.src = DH_CHFAnimation;' +
			'         } else if (ChrgAnimMode == 7) {' +
			'             CharANcontext.globalAlpha = 1;' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             CharANcontext.save();' +
			'             DH_CHAnimation.src = DH_CHMAnimation;' +
			'             ChrgAngleW = (ChrgAngleW > 355) ? 0 : ChrgAngleW += 5;' +
			'             CharANcontext.translate(ChrgXPoint - (ChrgAnimICIW / 15) / 2, ChrgYPoint + (ChrgAnimICIH * 2) / 2);' +
			'             CharANcontext.rotate(ChrgAngleW * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_CHAnimation, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW, ChrgAnimICIH);' +
			'             CharANcontext.restore();' +
			'         } else if (ChrgAnimMode == 8) {' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             DH_CHAnimation.src = DH_CHVAnimation;' +
			'             CharANcontext.globalAlpha = 1;' +
			'         } else if (ChrgAnimMode == 9) {' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             CharANcontext.save();' +
			'             DH_imageChargerTMP.src = DH_CHMAnimation;' +
			'             ChrgAngleW = (ChrgAngleW > 355) ? 0 : ChrgAngleW += 5;' +
			'             CharANcontext.translate(ChrgXPoint - (ChrgAnimICIW / 15) / 2, ChrgYPoint + (ChrgAnimICIH * 2) / 2);' +
			'             CharANcontext.rotate(ChrgAngleW * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_imageChargerTMP, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW, ChrgAnimICIH);' +
			'             CharANcontext.restore();' +
			'             CharANcontext.save();' +
			'             ChrgAngleF = (ChrgAngleF < 5) ? 360 : ChrgAngleF -= 5;' +
			'             CharANcontext.translate(ChrgXPoint + ChrgAnimICIW + (ChrgAnimICIW / 15) / 2, ChrgYPoint + (ChrgAnimICIH * 2) / 2);' +
			'             CharANcontext.rotate(ChrgAngleF * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_imageChargerTMP, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW, ChrgAnimICIH);' +
			'             CharANcontext.restore();' +
			'             DH_CHAnimation.src = DH_CHVAnimation;' +
			'         } else if ((ChrgAnimMode == 10) || (ChrgAnimMode == 11)) {' +
			'             if (ChrgAnimMode == 10) {' +
			'                CharANcontext.fillStyle = "rgb(" + 245 + ", " + 66 + ", " + (220 - Math.floor((ChrgAlpha * 30) * 4)) + ")";' +
			'             } else if (ChrgAnimMode == 11) {' +
			'                CharANcontext.fillStyle = "rgb(" + 66 + ", " + (240 - Math.floor((ChrgAlpha * 30) * 4)) + ", " + 245 + ")";' +
			'             }' +
			'             CharANcontext.fillRect(ChrgXPoint, ChrgYPoint, 150, 150);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH =  DH_IconC;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             DH_CHAnimation.src = DH_CHEAnimation;' +
			'             CharANcontext.globalAlpha = 1 - (1 / (ChrgAlpha * 20));' +
			'         } else if ((ChrgAnimMode == 12) || (ChrgAnimMode == 13) || (ChrgAnimMode == 14) || (ChrgAnimMode == 15)) {' +
			'             if (ChrgAnimMode == 12) {' +
			'                CharANcontext.fillStyle = "rgb(" + 66 + ", " + (240 - Math.floor((ChrgAlpha * 40) * 4)) + ", " + 245 + ")";' +
			'             } else if (ChrgAnimMode == 13) {' +
			'                CharANcontext.fillStyle = "rgb(" + 245 + ", " + (235 - Math.floor((ChrgAlpha * 20) * 4)) + ", " + 5 + ")";' +
			'             } else if (ChrgAnimMode == 14) {' +
			'                CharANcontext.fillStyle = "rgb(" + 92 + ", " + (90 - Math.floor((ChrgAlpha * 20) * 1.5)) + ", " + 4 + ")";' +
			'             } else if (ChrgAnimMode == 15) {' +
			'                CharANcontext.fillStyle = "rgb(" + (194 - Math.floor((ChrgAlpha * 20) * 2)) + ", " + (194 - Math.floor((ChrgAlpha * 20) * 2)) + ", " + (194 - Math.floor((ChrgAlpha * 20) * 2)) + ")";' +
			'             }' +
			'             CharANcontext.fillRect(ChrgXPoint - 100, ChrgYPoint - 100, 250, 250);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             ChrgAnimICIW = (DH_IconC * 2);' +
			'             ChrgAnimICIH = (DH_IconC * 2);' +
			'             DH_CHAnimation.src = DH_CHBAnimation;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             CharANcontext.globalAlpha = 1;' +
			'         } else if ((ChrgAnimMode == 16) || (ChrgAnimMode == 17)) {' +
			'             if (ChrgAnimMode == 16) {' +
			'                CharANcontext.fillStyle = "rgb(" + 235 + ", " + (230 - Math.floor((ChrgAlpha * 30) * 2)) + ", " + 77 + ")";' +
			'             } else if (ChrgAnimMode == 17) {' +
			'                CharANcontext.fillStyle = "rgb(" + 66 + ", " + (240 - Math.floor((ChrgAlpha * 40) * 4)) + ", " + 245 + ")";' +
			'             }' +
			'             CharANcontext.fillRect(ChrgXPoint, ChrgYPoint, 150, 150);' +
			'             CharANcontext.globalCompositeOperation = "destination-in";' +
			'             ChrgAnimICIW = DH_IconC;' +
			'             ChrgAnimICIH = DH_IconC;' +
			'             CharCurrentX = ChrgXPoint;' +
			'             DH_CHAnimation.src = DH_CHPAnimation;' +
			'             CharANcontext.globalAlpha = 1 - (1 / (ChrgAlpha * 20));' +
			'         }' +
			'         document.getElementById("ChargerAN").style.visibility = "visible";' +
			'         CharANcontext.save();' +
			'         if (ChrgAnimMode == 1) {' +
			'             for (var i = 0; i < 40; i += 20) {' +
			'                 CharANcontext.drawImage(DH_CHAnimation, CharCurrentX + i, CharCurrentY + i + (DH_IconC / 2), ChrgAnimICIW, ChrgAnimICIH);' +
			'             }' +
			'         } else if ((ChrgAnimMode == 2) || (ChrgAnimMode == 10) || (ChrgAnimMode == 11) || (ChrgAnimMode == 16) || (ChrgAnimMode == 17)) {' +
			'             CharANcontext.drawImage(DH_CHAnimation, CharCurrentX, CharCurrentY + (DH_IconC / 2), ChrgAnimICIW, ChrgAnimICIH);' +
			'         } else if ((ChrgAnimMode == 3) || (ChrgAnimMode == 4)) {' +
			'             let scale = (CharCurrentY - ChrgYPoint) * (3 / ChrgAnimMode);' +
			'             CharANcontext.drawImage(DH_CHAnimation, ChrgXPoint - scale, ChrgYPoint - scale, ChrgAnimICIW + (scale * 2), ChrgAnimICIH + (scale * 2));' +
			'         } else if (ChrgAnimMode == 5) {' +
			'             ChrgAngleF = (ChrgAngleF < 20) ? 360 : ChrgAngleF -= 20;' +
			'             CharANcontext.translate(ChrgXPoint + ChrgAnimICIW / 2, ChrgYPoint + ChrgAnimICIH / 2);' +
			'             CharANcontext.rotate(ChrgAngleF * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_CHAnimation, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW, ChrgAnimICIH);' +
			'         } else if (ChrgAnimMode == 6) {' +
			'             ChrgAngleF = (ChrgAngleF < 10) ? 360 : ChrgAngleF -= 10;' +
			'             CharANcontext.translate(ChrgXPoint + ChrgAnimICIW / 2, ChrgYPoint + ChrgAnimICIH / 2);' +
			'             CharANcontext.rotate(ChrgAngleF * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_CHAnimation, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW, ChrgAnimICIH);' +
			'         } else if (ChrgAnimMode == 7) {' +
			'             ChrgAngleF = (ChrgAngleF < 5) ? 360 : ChrgAngleF -= 5;' +
			'             CharANcontext.translate(ChrgXPoint + ChrgAnimICIW + (ChrgAnimICIW / 15) / 2, ChrgYPoint + (ChrgAnimICIH * 2) / 2);' +
			'             CharANcontext.rotate(ChrgAngleF * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_CHAnimation, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW, ChrgAnimICIH);' +
			'         } else if ((ChrgAnimMode == 8) || (ChrgAnimMode == 9)) {' +
			'             CHRGFlip = (CHRGFlip > 180) ? -180 : CHRGFlip += 180;' +
			'             ChrgScale = (ChrgScale > 1) ? 0.8 : ChrgScale += 0.1;' +
			'             CharANcontext.translate(ChrgXPoint + ChrgAnimICIW / 2, ChrgYPoint + ChrgAnimICIH / 2);' +
			'             CharANcontext.rotate(CHRGFlip * Math.PI / 180);' +
			'             CharANcontext.drawImage(DH_CHAnimation, -ChrgAnimICIW / 2, -ChrgAnimICIH / 2, ChrgAnimICIW + ChrgScale, ChrgAnimICIH);' +
			'         } else if ((ChrgAnimMode == 12) || (ChrgAnimMode == 13) || (ChrgAnimMode == 14) || (ChrgAnimMode == 15)) {' +
			'             let scale = (CharCurrentY - ChrgYPoint) * (6 / ChrgAnimMode);' +
			'             CharANcontext.drawImage(DH_CHAnimation, ChrgXPoint - (ChrgAnimICIW / 6) + scale, ChrgYPoint - (ChrgAnimICIH / 8) + scale, ChrgAnimICIW - (scale * 3), ChrgAnimICIH - (scale * 3));' +
			'         }' +
			'         CharANcontext.restore();' +
			'       }' +
			' ' +
            '       async function UpdateMap() {' +
            '         let GetBaseStatus = DHgetStateAsync("dreamehome.0.' + DH_Did + '.vis.State");' +
            '    	  let BaseStatus = await GetBaseStatus.then(result => eval(result.val));' +
            '   	  let BaseStatusString = ""' +
            '  		  switch (parseInt(BaseStatus)) {' +
            '            case 1:' +
            '                BaseStatusString = "Sweeping";' +
            '				 ChrgAnimMode = 8;' +
			'                DH_RegisterUpdateSR();' +
            '                break;' +
            '            case 2:' +
            '                BaseStatusString = "Idle";' +
            '				 ChrgAnimMode = 1;' +
            '                break;' +
            '            case 3:' +
            '                BaseStatusString = "Paused";' +
            '				 ChrgAnimMode = 16;' +
            '                break;' +
            '            case 4:' +
            '                BaseStatusString = "Error";' +
            '				 ChrgAnimMode = 10;' +
            '                break;' +
            '            case 5:' +
            '                BaseStatusString = "Returning";' +
            '				 ChrgAnimMode = 15;' +
            '                break;' +
            '            case 6:' +
            '                BaseStatusString = "Charging";' +
            '				 ChrgAnimMode = 3;' +
            '                break;' +
            '            case 7:' +
            '                BaseStatusString = "Mopping";' +
            '				 ChrgAnimMode = 7;' +
			'                DH_RegisterUpdateSR();' +
            '                break;' +
            '            case 8:' +
            '                BaseStatusString = "Drying";' +
            '				 ChrgAnimMode = 2;' +
            '                break;' +
            '            case 9:' +
            '                BaseStatusString = "Washing";' +
            '				 ChrgAnimMode = 6;' +
            '                break;' +
            '            case 10:' +
            '                BaseStatusString = "Returning to wash";' +
            '				 ChrgAnimMode = 12;' +
            '                break;' +
            '            case 11:' +
            '                BaseStatusString = "Building";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 12:' +
            '                BaseStatusString = "Sweeping and mopping";' +
            '				 ChrgAnimMode = 9;' +
			'                DH_RegisterUpdateSR();' +
            '                break;' +
            '            case 13:' +
            '                BaseStatusString = "Charging completed";' +
            '				 ChrgAnimMode = 1;' +
            '                break;' +
            '            case 14:' +
            '                BaseStatusString = "Upgrading";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 15:' +
            '                BaseStatusString = "Clean summon";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 16:' +
            '                BaseStatusString = "Station reset";' +
            '				 ChrgAnimMode = 10;' +
            '                break;' +
            '            case 17:' +
            '                BaseStatusString = "Returning install mop";' +
            '				 ChrgAnimMode = 14;' +
            '                break;' +
            '            case 18:' +
            '                BaseStatusString = "Returning remove mop";' +
            '				 ChrgAnimMode = 14;' +
            '                break;' +
            '            case 19:' +
            '                BaseStatusString = "Water check";' +
            '				 ChrgAnimMode = 11;' +
            '                break;' +
            '            case 20:' +
            '                BaseStatusString = "Clean add water";' +
            '				 ChrgAnimMode = 4;' +
            '                break;' +
            '            case 21:' +
            '                BaseStatusString = "Washing paused";' +
            '				 ChrgAnimMode = 17;' +
            '                break;' +
            '            case 22:' +
            '                BaseStatusString = "Auto emptying";' +
            '				 ChrgAnimMode = 5;' +
            '                break;' +
            '            case 23:' +
            '                BaseStatusString = "Remote control";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 24:' +
            '                BaseStatusString = "Smart charging";' +
            '				 ChrgAnimMode = 3;' +
            '                break;' +
            '            case 25:' +
            '                BaseStatusString = "Second cleaning";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 26:' +
            '                BaseStatusString = "Human following";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 27:' +
            '                BaseStatusString = "Spot cleaning";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 28:' +
            '                BaseStatusString = "Returning auto empty";' +
            '				 ChrgAnimMode = 13;' +
            '                break;' +
            '            case 97:' +
            '                BaseStatusString = "Shortcut";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 98:' +
            '                BaseStatusString = "Monitoring";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '            case 99:' +
            '                BaseStatusString = "Monitoring paused";' +
            '				 ChrgAnimMode = 0;' +
            '                break;' +
            '        }' +
            ' ' +
            '         let PromDreamePos = DHgetStateAsync("dreamehome.0.' + DH_Did + '.mqtt.robot");' +
            '         ArrDreamePos = await PromDreamePos.then(result => eval(result.val));' +
            '         var RovalX = (charger[0] + ArrDreamePos[0] + (origin[0] * -1)) / DH_ScaleValue;' +
            '         var RovalY = (charger[1] + ArrDreamePos[1] + (origin[1] * -1)) / DH_ScaleValue;' +
            '         let GetNewCoordinates = [RovalX, RovalY];' +
            '         let RobotNewX = 0,' +
            '           RobotNewY = 0;' +
            '         switch (angle) {' +
            '           case 0:' +
            '             RobotNewX = (GetNewCoordinates[0] - (DH_IconW / 2));' +
            '             RobotNewY = (GetNewCoordinates[1] - (DH_IconH / 2));' +
            '             break;' +
            '           case 90:' +
            '             RobotNewX = (GetNewCoordinates[0] - (DH_IconW / 2));' +
            '             RobotNewY = (GetNewCoordinates[1] + (DH_IconH / 2));' +
            '             break;' +
            '           case 180:' +
            '             RobotNewX = (GetNewCoordinates[0] + (DH_IconW / 2));' +
            '             RobotNewY = (GetNewCoordinates[1] + (DH_IconH / 2));' +
            '             break;' +
            '           case 270:' +
            '             RobotNewX = (GetNewCoordinates[0] - (DH_IconW / 2));' +
            '             RobotNewY = (GetNewCoordinates[1] + (DH_IconH / 2));' +
            '             break;' +
            '         }' +
            '         await point(RobotNewX, RobotNewY, context);' +
            '         context2.clearRect(0, 0, canvas2.width, canvas2.height);' +
            '         context2.drawImage(RobotImage, RobotNewX, RobotNewY, DH_IconW, DH_IconH);' +
            '       }' +
            ' ' +
    //           '       DH_RegisterUpdateSR();' +
            '       function DH_RegisterUpdateSR() {' +
            '           UpdateSelectedRoomsInterval = setInterval(function() {' +
            '               DH_UpdateSelectedRooms();' +
            '           }, 2000);' +
            '       }' +
            '       async function DH_UpdateSelectedRooms(UpdateIcon = false) {' +
            '           let PromDreameTaskStatus = DHgetStateAsync("dreamehome.0.' + DH_Did + '.vis.TaskStatus");' +
            '           var ArrDreameTaskStatus = await PromDreameTaskStatus.then(result => result.val);' +
            '           if ((ArrDreameTaskStatus == 1) || (ArrDreameTaskStatus == 2) || (ArrDreameTaskStatus == 3) || (ArrDreameTaskStatus == 4) || (ArrDreameTaskStatus == 5)  || (UpdateIcon = true)) {' +
            '               let PromDreameSA = DHgetStateAsync("dreamehome.0.' + DH_Did + '.mqtt.sa");' +
            '               var ArrDreameSA = await PromDreameSA.then(result => eval(result.val));' +
            '               let PromDreameCleanset = DHgetStateAsync("dreamehome.0.' + DH_Did + '.mqtt.cleanset");' +
            '               var ArrDreameCleanset = await PromDreameCleanset.then(result => JSON.parse(result.val));' +
            '               if ((ArrDreameSA !== "undefined") && (ArrDreameCleanset !== "undefined") && (ArrDreameTaskStatus !== "undefined")) {' +
            '                   RoomCleanSettings = {};' +
            '                   for (var r in ArrDreameSA) {' +
            '                       for (var s in ArrDreameSA[r]) {' +
    //sa Path; 1: DreameRoomNumber, 2: DreameRepeat 3: DreameLevel, 4: DreameSetWaterVolume, 5: DreameRoomOrder, 6: DreameCleaningMode
    //cleanset Patht; 1: DreameLevel, 2: DreameSetWaterVolume, 3: DreameRepeat, 4: DreameRoomNumber, 5: DreameCleaningMode, 6: Route
            '                           RoomCleanSettings["Room" + ArrDreameSA[r][0]] = {' +
            '                               "Number": ArrDreameSA[r][4],' +
            '                               "Repeat": ArrDreameCleanset[ArrDreameSA[r][0]][2],' +
            '                               "Level": ArrDreameCleanset[ArrDreameSA[r][0]][0],' +
            '                               "Water": ArrDreameCleanset[ArrDreameSA[r][0]][1],' +
            '                               "Order": ArrDreameSA[r][4],' +
            '                               "Mode": ArrDreameCleanset[ArrDreameSA[r][0]][4],' +
            '                               "Route": ArrDreameCleanset[ArrDreameSA[r][0]][5],' +
            '                               "AIMode": ArrDreameSA[r][5]' +
            '                           };' +
            '                       }' +
            '                   }' +
    //console.log(JSON.stringify(RoomCleanSettings));
			'					if (!UpdateIcon) {' +
            '                       for (var ar in RoomsIDVis) {' +
            '                           let MapImage = document.getElementById(RoomsIDVis[ar]);' +
            '                           let RGBRM = DH_hexToRgbA(ColorsItems[RoomsIDVis[ar].replace("Room", "")]).RGBA;' +
            '                           if (RoomCleanSettings.hasOwnProperty(RoomsIDVis[ar])) {' +
            '                               MapImage.setAttribute("style", " filter: contrast(100%) saturate(4) drop-shadow(0 0 0.75rem " + RGBRM + ") drop-shadow(0 0 0.5rem rgb(0, 0, 0)) drop-shadow(0 0 0.2rem rgb(255, 255, 255));");' +
            '                           } else {' +
            '                               MapImage.setAttribute("style", "");' +
            '                           }' +
            '                       }' +
			'					}' +
            '               }' +
            '           } else if (ArrDreameTaskStatus == 0) {' +
            '               for (var ar in RoomsIDVis) {' +
            '                   let MapImage = document.getElementById(RoomsIDVis[ar]);' +
            '                   MapImage.setAttribute("style", "");' +
            '               }' +
            '               clearInterval(UpdateSelectedRoomsInterval);' +
            '           }' +
            '       }' +
            ' ' +
            '       function DH_PerspectiveCommand(Elem, Var1, Var2) {' +
            '         document.getElementById(Elem).style.transform = "scale(0.9)";' +
            '         document.body.style.setProperty(Var1, Var2);' +
            '         setTimeout(function() {' +
            '           document.getElementById(Elem).style.transform = "scale(1)";' +
            '         }, 200);' +
            '       }' +
            ' ' +
            '       function DH_PerspectiveMap() {' +
            '         var PerColor = ["#ff0000", "#01ff00", "#0000ff", "#01ffff", "#ff00ff", "#ffff00", "#006600"];' +
            '         if (RotAngleXVar > 90) {' +
            '           RotAngleXVar = 0;' +
            '         }' +
            '         if (RotAngleXVar < 0) {' +
            '           RotAngleXVar = 0;' +
            '         }' +
            '         if (RotAngleYVar > 175) {' +
            '           RotAngleYVar = 175;' +
            '           LastView = 3;' +
            '           console.log("maximum Y rotation achieved: " + RotAngleYVar);' +
            '         }' +
            '         if ((RotAngleYVar < 90) && (LastView == 3)) {' +
            '           TranslatePX += 65;' +
            '           DH_PerspectiveCommand("DreameLeft", "--PersTranslateVariable", "translate(" + TranslatePX + "px)")' + '         }' +
            '         if ((RotAngleYVar == 0) && ((LastView == 3) || (LastView == 2))) {' +
            '           LastView = 1;' +
            '           console.log("Zero Position: " + RotAngleYVar)' +
            '         }' +
            '         if ((RotAngleYVar > 85) && (RotAngleYVar < 175)) {' +
            '           if (LastView == 1) {' +
            '             TranslatePX -= 65;' +
            '             DH_PerspectiveCommand("DreameLeft", "--PersTranslateVariable", "translate(" + TranslatePX + "px)")' +
            '           }' +
            '         }' +
            '         if (RotAngleYVar < -175) {' +
            '           RotAngleYVar = -175;' +
            '           LastView = 2;' +
            '           console.log("minimal Y rotation achieved: " + RotAngleYVar);' +
            '         }' +
            '         if ((RotAngleYVar < -90) && (RotAngleYVar > -175) && (LastView == 1)) {' +
            '           if (LastView == 1) {' +
            '             TranslatePX -= 65;' +
            '             DH_PerspectiveCommand("DreameRight", "--PersTranslateVariable", "translate(" + TranslatePX + "px)")' +
            '           }' +
            '         }' + '         if ((LastView == 2) && (RotAngleYVar > -90) && (RotAngleYVar < 0)) {' +
            '           TranslatePX += 65;' +
            '           DH_PerspectiveCommand("DreameRight", "--PersTranslateVariable", "translate(" + TranslatePX + "px)")' +
            '         }' +
            '         if (ScaleVar < 0.2) {' +
            '           ScaleVar = 0.2;' +
            '           DH_PerspectiveCommand("DreameZoomIn", "--PersScaleVariable", "scale(" + ScaleVar + ")");' +
            '         }' +
            '         if (ScaleVar > 3) {' +
            '           ScaleVar = 3;' +
            '           DH_PerspectiveCommand("DreameZoomOut", "--PersScaleVariable", "scale(" + ScaleVar + ")");' +
            '         }' +
            '         var Tmpimg = document.getElementById("DreamePerspective");' +
            '         var canvasEvent = document.createElement("canvas");' +
            '         canvasEvent.width = Tmpimg.width;' +
            '         canvasEvent.height = Tmpimg.height;' +
            '         canvasEvent.getContext("2d").drawImage(Tmpimg, 0, 0, Tmpimg.width, Tmpimg.height);' +
            '         var pixelData = canvasEvent.getContext("2d").getImageData(event.offsetX, event.offsetY, 1, 1).data;' +
            '         var StepRotate = 5' +
            '         for (let i = 0; i < 7; i++) {' +
            '           var DH_GetConvertedRoomBG = DH_hexToRgbA(PerColor[i]);' +
            '           var DH_ConvertetRoomBG = [DH_GetConvertedRoomBG.R, DH_GetConvertedRoomBG.G, DH_GetConvertedRoomBG.B, DH_GetConvertedRoomBG.A];' +
            '           if ((pixelData[0] == DH_GetConvertedRoomBG.R) && (pixelData[1] == DH_GetConvertedRoomBG.G) && (pixelData[2] == DH_GetConvertedRoomBG.B)) {' +
            '             switch (i) {' +
            '               case 0:' +
            '                 RotAngleXVar = 0;' +
            '                 RotAngleYVar = 0;' +
            '                 ScaleVar = 0.75;' +
            '                 TranslatePX = 0;' +
            '                 LastView = 1;' +
            '                 document.getElementById("Cam").style.left = "0px";' +
            '                 document.getElementById("Cam").style.top = "0px";' +
            '                 DH_PerspectiveCommand("DreameReset", "--XPersRotVariable", "rotateX(0deg)");' +
            '                 DH_PerspectiveCommand("DreameReset", "--YPersRotVariable", "rotateY(0deg)");' +
            '                 DH_PerspectiveCommand("DreameReset", "--PersScaleVariable", "scale(0.75)");' +
            '                 DH_PerspectiveCommand("DreameRight", "--PersTranslateVariable", "translate(" + TranslatePX + "px)");' +
            '                 break;' +
            '               case 1:' +
            '                 RotAngleXVar += 1;' +
            '                 DH_PerspectiveCommand("DreameUp", "--XPersRotVariable", "rotateX(" + RotAngleXVar + "deg)");' +
            '                 break;' +
            '               case 2:' +
            '                 RotAngleXVar -= 1;' +
            '                 DH_PerspectiveCommand("DreameDown", "--XPersRotVariable", "rotateX(" + RotAngleXVar + "deg)");' +
            '                 break;' +
            '               case 3:' +
            '                 RotAngleYVar += StepRotate;' +
            '                 DH_PerspectiveCommand("DreameLeft", "--YPersRotVariable", "rotateY(" + RotAngleYVar + "deg)");' +
            '                 break;' +
            '               case 4:' +
            '                 RotAngleYVar -= StepRotate;' +
            '                 DH_PerspectiveCommand("DreameRight", "--YPersRotVariable", "rotateY(" + RotAngleYVar + "deg)");' +
            '                 break;' +
            '               case 5:' +
            '                 ScaleVar += 0.1;' +
            '                 DH_PerspectiveCommand("DreameZoomIn", "--PersScaleVariable", "scale(" + ScaleVar + ")");' +
            '                 break;' +
            '               case 6:' +
            '                 ScaleVar -= 0.1;' +
            '                 DH_PerspectiveCommand("DreameZoomOut", "--PersScaleVariable", "scale(" + ScaleVar + ")");' +
            '                 break;' +
            '             }' +
            '             break;' +
            '           }' +
            '         }' +
		  //'         console.log("RotAngleYVar: " + RotAngleYVar + " LastView: " + LastView);' +
			'         vis.conn._socket.emit("setState", "dreamehome.0.' + DH_Did + '.vis.Perspective' + DH_CurMap + '", RotAngleXVar + "," + RotAngleYVar + "," + ScaleVar + "," + TranslatePX + "," + LastView + "," + CamStyleLeft + "," + CamStyleTop + "," + angle);' +
            '       }' +
            ' ' +
            '       function point(Rx, Ry, context) {' +
            '         var point1 = {' +
            '           x: Rx,' +
            '           y: Ry,' +
            '         };' +
            '         var point2 = {' +
            '           x: TempRx,' +
            '           y: TempRy,' +
            '         };' +
            '         TempRx = Rx * 1;' +
            '         TempRy = Ry * 1;' +
            '         context.beginPath();' +
            '         context.lineCap = "round"' +
            '         context.lineJoin = "round"' +
            '         context.lineWidth = 3;' +
            '         context.moveTo(point1.x, point1.y);' +
            '         context.lineTo(point2.x, point2.y);' +
            '         context.stroke();' +
            '       }' +
            ' ' +
            '       function DH_RotateMap() {' +
            '         angle += 90;' +
            '         if (angle == 360) {' +
            '           angle = 0;' +
            '         }' +
            '         let PromDreamePos = DHgetStateAsync("dreamehome.0.' + DH_Did + '.mqtt.robot");' +
            '         ArrDreamePos = PromDreamePos.then(result => eval(result.val));' +
            '         var RovalX = (charger[0] + ArrDreamePos[0] + (origin[0] * -1)) / DH_ScaleValue;' +
            '         var RovalY = (charger[1] + ArrDreamePos[1] + (origin[1] * -1)) / DH_ScaleValue;' +
            '         document.body.style.setProperty("--RotateVariable", "rotate(" + angle + "deg)");' +
            '         var GetNewCoordinates = rotate(RovalX, RovalY, ((canvas.width / 2) - 20), ((canvas.height / 2) - 20), angle);' +
            '       }' +
            ' ' +
            '       function DH_ColoriseIcon(CtxIcon, CtxColor, CtxW, CtxH, CtxR = 0) {' +
            '         const Tmpcanvas = document.createElement("canvas");' +
            '         Tmpcanvas.width = CtxW;' +
            '         Tmpcanvas.height = CtxH;' +
            '         const Tmpcontext = Tmpcanvas.getContext("2d");' +
            '         Tmpcontext.clearRect(0, 0, CtxW, CtxH);' +
            '         Tmpcontext.globalCompositeOperation = "destination-over";' +
            '         Tmpcontext.save();' +
            '         Tmpcontext.fillStyle = CtxColor;' +
            '         Tmpcontext.fillRect(0, 0, CtxW, CtxH);' +
            '         Tmpcontext.globalCompositeOperation = "destination-in";' +
            '         Tmpcontext.filter = "drop-shadow(-1px 1px 1px rgb(255, 255, 255))";' +
            '         if (CtxR > 0) {' +
            '           switch (CtxR) {' +
            '              case 30:' +
            '                 RCSRotate[2] = (RCSRotate[2] > (360 - CtxR)) ? 0 : RCSRotate[2] += CtxR;' +
            '                 VarRCSRotate = RCSRotate[2];' +
            '                 break;' +
            '              case 20:' +
            '                 RCSRotate[1] = (RCSRotate[1] > (360 - CtxR)) ? 0 : RCSRotate[1] += CtxR;' +
            '                 VarRCSRotate = RCSRotate[1];' +
            '                 break;' +
            '              case 5:' +
            '                  RCSRotate[0] = (RCSRotate[0] > (360 - CtxR)) ? 0 : RCSRotate[0] += CtxR;' +
            '                  VarRCSRotate = RCSRotate[0];' +
            '                  break;' +
            '           }' +
            '           Tmpcontext.translate(40, 40);' +
            '           Tmpcontext.rotate(VarRCSRotate * Math.PI / 180);' +
            '           Tmpcontext.drawImage(CtxIcon, -80 / 2, -80 / 2, 80, 80);' +
            '         } else {' +
            '              Tmpcontext.scale(RCSFactor, RCSFactor);' +
            '              if (RCSFactor == 1) {' +
            '                 Tmpcontext.translate(CtxW, 0);' +
            '                 Tmpcontext.scale(-1, 1);' +
            '              } else {' +
            '                 Tmpcontext.scale(1, 1);' +
            '              }' +
            '              Tmpcontext.drawImage(CtxIcon, CtxW - (CtxW * RCSFactor), CtxH - (CtxH * RCSFactor), CtxW * RCSFactor, CtxH * RCSFactor);' +
            '         }' +
            '         Tmpcontext.restore();' +
            '         return Tmpcanvas;' +
            '       }' +
            ' ' +
            '       function DH_RotateSettings() {' +
            '           DH_UpdateSelectedRooms(true);' +
            '           ContextSettings.clearRect(0, 0, 1024, 1024);' +
            '           for (var ar in CenterCoordinateRoom) {' +
            '               let ObjNRoomC = JSON.parse(JSON.stringify(CenterCoordinateRoom[ar]));' +
            '               let VarRead = RoomCleanSettings["Room" + Object.values(ObjNRoomC)[0]];' +
            '               let VarLevel = 0;' +
            '               let VarRepeat = 1;' +
            '               let VarWater = 0;' +
            '               if (VarRead) {' +
            '                   VarWater = VarRead["Water"];' +
            '                   VarRepeat = VarRead["Repeat"];' +
            '                   VarLevel = VarRead["Level"];' +
            '               }' +
            '               let LevelColor = "rgb(" + 245 + ", " + (250 - Math.floor((VarLevel / 32 * 32) * 40)) + ", " + 66 + ")";' +
            '               DH_SLevel = new Image();' +
            '               let RotVarLevel = 0;' +
            '               if (VarLevel == 3) {' +
            '                   DH_SLevel.src = DH_SLevel3;' +
            '                   RotVarLevel = 30;' +
            '               } else if (VarLevel == 2) {' +
            '                   DH_SLevel.src = DH_SLevel2;' +
            '                   RotVarLevel = 20;' +
            '               } else if (VarLevel == 1) {' +
            '                   DH_SLevel.src = DH_SLevel1;' +
            '                   RotVarLevel = 5;' +
            '               } else {' +
            '                   DH_SLevel.src = DH_SLevel0;' +
            '                   RotVarLevel = 0;' +
            '               }' +
            '               var TmpScanvas = DH_ColoriseIcon(DH_SLevel, LevelColor, 80, 80, RotVarLevel);' +
            '               let WaterColor = "rgb(" + 60 + ", " + (200 - Math.floor((VarWater / 32 * 32) * 40)) + ", " + 255 + ")";' +
            '               DH_WLevel = new Image();' +
            '               if (VarWater > 27) {' +
            '                   DH_WLevel.src = DH_WLevel3;' +
            '               } else if (VarWater > 16) {' +
            '                   DH_WLevel.src = DH_WLevel2;' +
            '               } else if (VarWater > 5) {' +
            '                   DH_WLevel.src = DH_WLevel1;' +
            '               } else {' +
            '                   DH_WLevel.src = DH_WLevel0;' +
            '               }' +
            '               var TmpWcanvas = DH_ColoriseIcon(DH_WLevel, WaterColor, 80, 80);' +
            '                   ContextSettings.save();' +
            '                   let RIconW = 40, RIconH = 5, WIcon = 20;' +
            '                   ContextSettings.translate(Object.values(ObjNRoomC)[1] + RIconW / 2, Object.values(ObjNRoomC)[2] + RIconH / 2);' +
            '                   ContextSettings.scale(1, -1);' +
            '                   ContextSettings.rotate(angle * Math.PI / 180);' +
            '                   ContextSettings.globalAlpha = 0.3;' +
            '                   ContextSettings.beginPath();' +
            '                   ContextSettings.lineWidth = "1";' +
            '                   ContextSettings.strokeStyle = "#000000";' +
            '                   ContextSettings.shadowBlur = 3;' +
            '                   ContextSettings.shadowColor = "#aaaaaa";' +
            '                   ContextSettings.shadowOffsetX = 1;' +
            '                   ContextSettings.shadowOffsetY = 2;' +
            '                   ContextSettings.roundRect((-WIcon - 50) / 2, (-WIcon + 20) / 2, 70, 23, [70, 30, 30, 70]);' +
            '                   ContextSettings.fillStyle = "#ffffff";' +
            '                   ContextSettings.fill();' +
            '                   ContextSettings.stroke();' +
            '                   ContextSettings.globalAlpha = 1;' +
            '                   ContextSettings.shadowBlur = 1;' +
            '                   ContextSettings.shadowColor = "#bbbbbb";' +
            '                   ContextSettings.shadowOffsetX = 1;' +
            '                   ContextSettings.shadowOffsetY = 1;' +
            '                   ContextSettings.fillStyle = "#000000";' +
            '                   ContextSettings.font = "16px Tahoma";' +
            '                   ContextSettings.fillText(Object.values(ObjNRoomC)[3], -RIconW / 2, -RIconH / 2, RIconW, RIconH);' +
            ' ' +
            '                   ContextSettings.shadowColor = "#000000";' +
            '                   ContextSettings.shadowBlur = 2;' +
            '                   ContextSettings.shadowOffsetX = 1;' +
            '                   ContextSettings.shadowOffsetY = 1;' +
            '                   ContextSettings.fillStyle = "#ffffff";' +
            '                   ContextSettings.font = "22px Arial";' +
            '                   ContextSettings.fillText("x" + VarRepeat, (-WIcon - 35) / 2, (-WIcon + 59) / 2, WIcon, WIcon);' +
            ' ' +
            '                   ContextSettings.shadowBlur = 2;' +
            '                   ContextSettings.shadowColor = WaterColor;' +
            '                   ContextSettings.shadowOffsetX = 2;' +
            '                   ContextSettings.shadowOffsetY = -2;' +
            '                   ContextSettings.drawImage(TmpWcanvas, (-WIcon + 5) / 2, (-WIcon + 23) / 2, WIcon, WIcon);' +
            ' ' +
            '                   ContextSettings.shadowBlur = 1;' +
            '                   ContextSettings.shadowColor = "#000000";' +
            '                   ContextSettings.shadowOffsetX = 0.4;' +
            '                   ContextSettings.shadowOffsetY = -0.4;' +
            '                   ContextSettings.drawImage(TmpScanvas, (-WIcon + 45) / 2, (-WIcon + 23) / 2, WIcon, WIcon);' +
            ' ' +
            '                   ContextSettings.restore();' +
            '                   TmpWcanvas = null;' +
            '                   TmpScanvas = null;' +
            '           }' +
            '       }' +
            ' ' +
            '       function rotate(x, y, xm, ym, SetAngle) {' +
            '         var cos = Math.cos;' +
            '         var sin = Math.sin;' +
            '         var angle = SetAngle * Math.PI / 180;' +
            '         var rx = (x - xm) * cos(angle) - (y - ym) * sin(angle) + xm;' +
            '         var ry = (x - xm) * sin(angle) + (y - ym) * cos(angle) + ym;' +
            '         console.log("rotate: " + angle);' +
            '         return [rx, ry];' +
            '       }' +
            ' ' +
            '       function getRandomArbitrary(min, max) {' +
            '         return Math.random() * (max - min) + min;' +
            '       }' +
            ' ' +
            '       function FadeOut(Element) {' +
            '         let NowOpac = parseFloat(window.getComputedStyle(document.getElementById(Element)).opacity);' +
            '         document.getElementById(Element).style.opacity = NowOpac + 0.1;' +
            '         document.getElementById(Element).style.display = "block";' +
            '         if (NowOpac + 0.1 < 1) {' +
            '           setTimeout(() => {' +
            '             FadeOut(Element);' +
            '           }, 70);' +
            '         }' +
            '       }' +
            ' ' +
            '       function FadeIn(Element) {' +
            '         let NowOpac = parseFloat(window.getComputedStyle(document.getElementById(Element)).opacity);' +
            '         document.getElementById(Element).style.opacity = NowOpac - 0.1;' +
            '         if (NowOpac - 0.1 > 0) {' +
            '           setTimeout(() => {' +
            '             FadeIn(Element);' +
            '           }, 70);' +
            '         } else {' +
            '           document.getElementById(Element).style.display = "none";' +
            '         }' +
            '       }' +
            ' ' +
            '       function StartCountdown() {' +
            '         clearInterval(Countdown);' +
            '         CSeconds = 10;' +
            '         Countdown = setInterval(function() {' +
            '           if (CSeconds == 10) {' +
            '             FadeOut("DVViewControl");' +
            '           }' +
            '           CSeconds--;' +
            '           if (CSeconds == 0) {' +
            '             FadeIn("DVViewControl");' +
            '           }' +
            '           if (CSeconds <= 0) clearInterval(Countdown);' +
            '         }, 1000)' +
            '       }' +
            ' ' +
            '       function DH_Carpet() {' +
            '         CheckCarpet = (!CheckCarpet);' +
            '          if (CheckCarpet) {' +
            '           document.querySelector(".MapCarpet").style.setProperty("--CarpetOpacityVariable", "1");' +
            '			for (let i = 0; i < CarpetIDVis.length; i++) {' +
            '			  document.getElementById(CarpetIDVis[i]).style.visibility = "visible";' +
            '			}' +
            '		  } else {' +
            '           document.querySelector(".MapCarpet").style.setProperty("--CarpetOpacityVariable", "0.4");' +
            '			for (let i = 0; i < CarpetIDVis.length; i++) {' +
            '              document.getElementById(CarpetIDVis[i]).style.visibility = "hidden";' +
            '           }' +
            '          }' +
            '       }' +
            ' ' +
            '       function DH_MoveMap() {' +
            '         CheckMoveMap = (!CheckMoveMap);' +
            '         if (CheckMoveMap) {' +
            '           document.querySelector(".MapMoveMap").style.setProperty("--MoveMapOpacityVariable", "1");' +
            '         } else {' +
            '           document.querySelector(".MapMoveMap").style.setProperty("--MoveMapOpacityVariable", "0.4");' +
            '         }' +
            '       }' +
            ' ' +
            '       function DH_SelectTheCarpet(id) {' +
            '         if (!CheckCarpet) {return;}' +
            '         var iCarpetMapCanvas = document.getElementById("CarpetMap");' +
            '         var iCarpetMapcanvasEvent = document.createElement("canvas");' +
            '         iCarpetMapcanvasEvent.width = iCarpetMapCanvas.width;' +
            '         iCarpetMapcanvasEvent.height = iCarpetMapCanvas.height;' +
            '         iCarpetMapcanvasEvent.getContext("2d").drawImage(iCarpetMapCanvas, 0, 0, iCarpetMapCanvas.width, iCarpetMapCanvas.height);' +
            '         var pixelData = iCarpetMapcanvasEvent.getContext("2d").getImageData(event.offsetX, event.offsetY, 1, 1).data;' +
            '         for (let i = 0; i < CarpetIDVis.length; i++) {' +
            '           var DH_GetConvertedCarpetBG = DH_hexToRgbA(ColorsCarpet[CarpetIDVis[i].replace("Carpet", "")]);' +
            '           var DH_ConvertetRoomBG = [DH_GetConvertedCarpetBG.R, DH_GetConvertedCarpetBG.G, DH_GetConvertedCarpetBG.B, DH_GetConvertedCarpetBG.A];' +
            '           if ((pixelData[0] == DH_GetConvertedCarpetBG.R) && (pixelData[1] == DH_GetConvertedCarpetBG.G) && (pixelData[2] == DH_GetConvertedCarpetBG.B)) {' +
            '             MapImage = document.getElementById(CarpetIDVis[i]);' +
            '             if (DH_RoomsNumberState[CarpetIDVis[i].replace("Carpet", "")] == 0) {' +
            '               DH_RoomsNumberState[CarpetIDVis[i].replace("Carpet", "")] = 1;' +
            '               MapImage.setAttribute("style", " filter: contrast(100%) saturate(4) drop-shadow(0 0 0.75rem rgba(" + pixelData + ")) drop-shadow(0 0 0.5rem rgb(0, 0, 0));");' +
            '             } else {' +
            '               DH_RoomsNumberState[CarpetIDVis[i].replace("Carpet", "")] = 0;' +
            '               MapImage.setAttribute("style", "");' +
            '             }' +
            '             break;' +
            '           }' +
            '         }' +
            '       }' +
            ' ' +
            '       function DH_SelectTheRoom(id) {' +
            '         if (CheckCarpet) {' +
            '    		DH_SelectTheCarpet(1);' +
            '           return;' +
            '         }' +
            '         var iBGCanvas = document.getElementById("BG");' +
            '         var iBGcanvasEvent = document.createElement("canvas");' +
            '         iBGcanvasEvent.width = iBGCanvas.width;' +
            '         iBGcanvasEvent.height = iBGCanvas.height;' +
            '         iBGcanvasEvent.getContext("2d").drawImage(iBGCanvas, 0, 0, iBGCanvas.width, iBGCanvas.height);' +
            '         var pixelData = iBGcanvasEvent.getContext("2d").getImageData(event.offsetX, event.offsetY, 1, 1).data;' +
			'         let CleanRoomIs = "2";' +
            '         for (let i = 0; i < RoomsIDVis.length; i++) {' +
            '           var DH_GetConvertedRoomBG = DH_hexToRgbA(ColorsItems[RoomsIDVis[i].replace("Room", "")]);' +
            '           var DH_ConvertetRoomBG = [DH_GetConvertedRoomBG.R, DH_GetConvertedRoomBG.G, DH_GetConvertedRoomBG.B, DH_GetConvertedRoomBG.A];' +
            '           if ((pixelData[0] == DH_GetConvertedRoomBG.R) && (pixelData[1] == DH_GetConvertedRoomBG.G) && (pixelData[2] == DH_GetConvertedRoomBG.B)) {' +
            '             MapImage = document.getElementById(RoomsIDVis[i]);' +
            '             if (DH_RoomsNumberState[RoomsIDVis[i].replace("Room", "")] == 0) {' +
            '               DH_RoomsNumberState[RoomsIDVis[i].replace("Room", "")] = 1;' +
            '               MapImage.setAttribute("style", " filter: contrast(100%) saturate(4) drop-shadow(0 0 0.75rem rgba(" + pixelData + ")) drop-shadow(0 0 0.5rem rgb(0, 0, 0)) drop-shadow(0 0 0.2rem rgb(255, 255, 255));");' +
            '               CleanRoomIs = "1";' +
			'             } else {' +
            '               DH_RoomsNumberState[RoomsIDVis[i].replace("Room", "")] = 0;' +
            '               MapImage.setAttribute("style", "");' +
            '             }' +
			'             for (var ar in CenterCoordinateRoom) {' +
            '               let ObjNRoomC = JSON.parse(JSON.stringify(CenterCoordinateRoom[ar]));' +
            '               if (Object.values(ObjNRoomC)[0] == RoomsIDVis[i].replace("Room", "")) {' +
		    '                 vis.conn._socket.emit("setState", "dreamehome.0.' + DH_Did + '.map.' + DH_CurMap + '." + CenterCoordinateRoom[ar].RM + ".Cleaning", CleanRoomIs);' +
			'             	  break;' +
		    '               }' +
			'             }' +
            '             break;' +
            '           }' +
            '         }' +
            '       }' +
            ' ' +
            '       function DH_hexToRgbA(hex) {' +
            '         var Color;' +
            '         Color = hex.substring(1).split("");' +
            '         if (Color.length == 3) {' +
            '           Color = [Color[0], Color[0], Color[1], Color[1], Color[2], Color[2]];' +
            '         }' +
            '         Color = "0x" + Color.join("");' +
            '         let ColR = (Color >> 16) & 255;' +
            '         let ColG = (Color >> 8) & 255;' +
            '         let ColB = Color & 255;' +
            '         let ColA = 255;' +
            '         let RGBA = "rgba(" + [ColR, ColG, ColB, ColA].join(",") + ")";' +
            '         return {' + '           RGBA: RGBA,' +
            '           R: ColR,' +
            '           G: ColG,' +
            '           B: ColB,' +
            '           A: ColA' +
            '         };' +
            '       }' +
            ' ';
    ExportHTML += ' <';
    ExportHTML += '/script> <style>' +
            '       body {' +
            '         height: 100%;' +
            '         overflow-y: hidden;' +
            '         overflow-x: hidden;' +
            '       }' +
            ' ' +
            '       .ViewControl {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '       }' +
            ' ' +
            '       .CamPer {' +
            '         position: absolute;' +
            '         transform: var(--PerspectivePXVariable) var(--XPersRotVariable) var(--YPersRotVariable) var(--PersScaleVariable) var(--PersTranslateVariable);' +
            '         top: 0;' +
            '         left: 0;' +
            '       }' +
            ' ' +
            '       .DH_Mapimages {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         cursor: pointer;' +
            '         z-index: 3;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '       }' +
            ' ' +
            '       .DH_BGMapimages {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         z-index: 2;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '       }' +
            ' ' +
            '       .DH_Carpetimages {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         z-index: 5;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .DH_CarpetMap {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         z-index: 0;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .DH_Wallapimages {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         cursor: pointer;' +
            '         z-index: 4;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '       }' +
            ' ' +
            '       .MapDHcanvas {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         z-index: 10;' +
            '         opacity: 0.5;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .RobotDHcanvas {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         z-index: 11;' +
            '         opacity: 1;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .DHCharger {' +
            '         position: absolute;' +
            '         top: 0;' +
            '         left: 0;' +
            '         z-index: 10;' +
            '         opacity: 1;' +
            '         transform: scale(1, -1) var(--RotateVariable);' +
            '         cursor: pointer;' +
            '        }' +
            ' ' +
            '        .DHChargerAN {' +
            '          position: absolute;' +
            '          top: 0;' +
            '          left: 0;' +
            '          z-index: 12;' +
            '          transform: scale(1, -1) var(--RotateVariable);' +
            '          cursor: pointer;' +
            '        }' +
            ' ' +
            '       .MapRotate {' +
            '         position: absolute;' +
            '         width: 4rem;' +
            '         height: 4rem;' +
            '         top: 0.5rem;' +
            '         left: 10rem;' +
            '         right: 0;' +
            '         bottom: 0;' +
            '         z-index: 19;' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.15rem 0 #000000);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .MapRotate:hover {' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.25rem 0 #000000);' +
            '       }' +
            ' ' +
            '       .MapRotate:active {' +
            '         transform: translateY(0.2rem);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.45rem 0 #000000);' +
            '       }' +
            ' ' +
            '      .MapMoveMap {' +
            '         position: absolute;' +
            '         width: 4rem;' +
            '         height: 4rem;' +
            '         top: 4rem;' +
            '         left: 10rem;' +
            '         right: 0;' +
            '         bottom: 0;' +
            '         z-index: 19;' +
            '         opacity: var(--MoveMapOpacityVariable);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.15rem 0 #000000);' +
            '         cursor: pointer;' +
            '      }' +
            ' ' +
            '      .MapMoveMap:hover {' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.25rem 0 #000000);' +
            '      }' +
            ' ' +
            '      .MapMoveMap:active {' +
            '         transform: translateY(0.2rem);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.45rem 0 #000000);' +
            '      }' +
            ' ' +
            '       .MapCarpet {' +
            '         position: absolute;' +
            '         width: 4rem;' +
            '         height: 4rem;' +
            '         top: 4.5rem;' +
            '         left: 14.5rem;' +
            '         right: 0;' +
            '         bottom: 0;' +
            '         z-index: 19;' +
            '         opacity: var(--CarpetOpacityVariable);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.15rem 0 #000000);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .MapCarpet:hover {' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.25rem 0 #000000);' +
            '       }' +
            ' ' +
            '       .MapCarpet:active {' +
            '         transform: translateY(0.2rem);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.45rem 0 #000000);' +
            '       }' +
            ' ' +
            '       .MapPerspective {' +
            '         position: absolute;' +
            '         width: 7rem;' +
            '         height: 7rem;' +
            '         top: 1rem;' +
            '         left: 1rem;' +
            '         right: 0;' + '         bottom: 0;' + '         z-index: 19;' +
            '         filter: drop-shadow(0.05rem 0 0 #000000) drop-shadow(0 0.05rem 0 #000000) drop-shadow(-0.05rem 0 0 #ffffff) drop-shadow(0 -0.05rem 0 #ffffff);' +
            '         cursor: pointer;' +
            '         opacity: 1;' +
            '       }' +
            ' ' +
            '       .MapPerspectiveBG {' +
            '         position: absolute;' +
            '         width: 7rem;' +
            '         height: 7rem;' +
            '         top: 10rem;' +
            '         left: 58rem;' +
            '         right: 0;' +
            '         bottom: 0;' +
            '         z-index: 18;' +
            '         opacity: 0;' +
            '       }' +
            ' </style></body></html>';
    if (LogData) {
      this.log.info('VIS HTML: ' + ExportHTML);
    }
    this.setStateAsync(DH_Did + '.vis.vishtml' + DH_CurMap, ExportHTML, true);
    this.log.info(DreameInformation[UserLang][6] + DH_Did + '.vis.vishtml' + DH_CurMap + DreameInformation[UserLang][7]);
    ExportHTML = '';
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

  async DH_GetRobotPosition(Position, SegmentObject) {
    //this.log.info("Robot Position: " + JSON.stringify(Position) + " Rooms Array: " + JSON.stringify(SegmentObject));
    let Inside = 0;
    for (const iSegCoor in SegmentObject) {
      let a = 0, b = SegmentObject[iSegCoor].X.length - 1;
      const CoordX = SegmentObject[iSegCoor].X;
      const CoordY = SegmentObject[iSegCoor].Y;
      for (a = 0; a < SegmentObject[iSegCoor].X.length; a++) {
        if ((CoordY[a] < Position[1] && CoordY[b] >= Position[1] || CoordY[b] < Position[1] && CoordY[a] >= Position[1]) &&
                    (CoordX[a] <= Position[0] || CoordX[b] <= Position[0])) {
          Inside ^= (CoordX[a] + (Position[1] - CoordY[a]) * (CoordX[b] - CoordX[a]) / (CoordY[b] - CoordY[a])) < Position[0];
        }
        b = a;
      }
      if (Inside == 1) {
        if (LogData) {this.log.info(Inside + ': Room Number: ' + SegmentObject[iSegCoor].Id + ' Room Name: ' + SegmentObject[iSegCoor].Name);
        }
        //this.log.info(Inside + ": Room Number: " + SegmentObject[iSegCoor].Id + " Room Name: " + SegmentObject[iSegCoor].Name);
        await this.setState(DH_Did + '.state.CurrentRoomCleaningName', SegmentObject[iSegCoor].Name, true);
        await this.setState(DH_Did + '.state.CurrentRoomCleaningNumber', SegmentObject[iSegCoor].Id, true);

        Inside = 0;
        break;
      }
    }
  }

  async CalculateRoomCenter(WAr) {
    const x0 = WAr.map(m => (m['beg_pt_x']));
    const x1 = WAr.map(m => (m['end_pt_x']));
    const x = x0.concat(x1);
    const minx = Math.min(...x);
    const maxx = Math.max(...x);
    let Rx = (minx + maxx) / 2;

    const y0 = WAr.map(m => (m['beg_pt_y']));
    const y1 = WAr.map(m => (m['end_pt_y']));
    let y = y0.concat(y1);
    let miny = Math.min(...y);
    let maxy = Math.max(...y);

    if (maxy - miny > 180) {
      y = y.map(val => val < maxy - 180 ? val + 360 : val);
      miny = Math.min(...y);
      maxy = Math.max(...y);
    }
    let Ry = (miny + maxy) / 2;
    if (Ry > 180) {
      Ry -= 360;
    }
    Rx = Rx * -1, Ry = Ry * -1;
    return {
      Rx,
      Ry
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
      this.log.debug(topic.toString());
      this.log.debug(message.toString());
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

    /*for (var [key, value] of Object.entries(jsonread)) {
            //this.log.info(' decode Map JSON:' + `${key}: ${value}`);
            if (Object.prototype.toString.call(value) !== '[object Object]') {
                if (value != null) {
                    let pathMap = In_path + key;
                    this.getType(value, pathMap);
                    if (typeof value === 'object' && value !== null) {
                        this.setState(pathMap, JSON.stringify(value), true);
                    } else {
                        this.setState(pathMap, value, true);
                    }
                }
            }
            if (typeof value === 'object' && value !== null) {
                if (Object.prototype.toString.call(value) === '[object Object]') {
                    for (var [Subkey, Subvalue] of Object.entries(value)) {
                        //this.log.info(' decode subkey ' + key + ' ==> ' + `${Subkey}: ${Subvalue}`);
                        if (value != null) {
                            let pathMap = In_path + key + '.' + Subkey;
                            if (pathMap.toString().indexOf('.cleanset') != -1) {
                                //this.log.info(' Long subkey ' + Subvalue.length + ' / ' + Subvalue[3]);
                                if (Subvalue.length == 6) {
                                    if (UpdateCleanset) {
                                        for (let i = 0; i < Subvalue.length; i += 1) {
                                            //1: DreameLevel, 2: DreameSetWaterVolume, 3: DreameRepeat, 4: DreameRoomNumber, 5: DreameCleaningMode, 6: Route
                                            //map-req[{"piid": 2,"value": "{\"req_type\":1,\"frame_type\":I,\"force_type\":1}"}]
                                            let pathMap = In_path + key + '.' + Subkey + '.RoomSettings';
                                            this.getType(JSON.stringify(Subvalue), pathMap);
                                            this.setState(pathMap, JSON.stringify(Subvalue), true);
                                            pathMap = In_path + key + '.' + Subkey + '.RoomOrder';
                                            this.getType(parseFloat(Subvalue[3]), pathMap);
                                            this.setState(pathMap, parseFloat(Subvalue[3]), true);
                                            pathMap = In_path + key + '.' + Subkey + '.Level';
                                            this.setcleansetPath(pathMap, DreameLevel);
                                            this.setState(pathMap, Subvalue[0], true);
                                            pathMap = In_path + key + '.' + Subkey + '.CleaningMode';
                                            this.setcleansetPath(pathMap, DreameSetCleaningMode);
                                            this.setState(pathMap, Subvalue[4], true);
                                            pathMap = In_path + key + '.' + Subkey + '.WaterVolume';
                                            this.setcleansetPath(pathMap, DreameSetWaterVolume);
                                            this.setState(pathMap, Subvalue[1], true);
                                            pathMap = In_path + key + '.' + Subkey + '.Repeat';
                                            this.setcleansetPath(pathMap, DreameRepeat);
                                            this.setState(pathMap, Subvalue[2], true);
                                            pathMap = In_path + key + '.' + Subkey + '.Route';
                                            this.setcleansetPath(pathMap, DreameRoute);
                                            this.setState(pathMap, Subvalue[5], true);
                                            pathMap = In_path + key + '.' + Subkey + '.Cleaning';
                                            await this.setcleansetPath(pathMap, DreameRoomClean);
                                            const Cleanstates = await this.getStateAsync(pathMap);
                                            if (Cleanstates == null) {
                                                this.setStateAsync(pathMap, 0, true);
                                            }
                                        }
                                    }
                                }
                            } else {
                                this.getType(Subvalue, pathMap);
                                this.setState(pathMap, JSON.stringify(Subvalue), true);
                            }
                        }
                    }
                }
            }
        }*/
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
              await this.DH_GetRobotPosition(JSON.parse(valueCopy), CheckArrayRooms);
            } catch (SRPerror) {
              this.log.error(`Failed to update robot position for value: ${valueCopy}. Error: ${SRPerror.message}`);
            }

            // Check the task completion status and handle history updates
            if (DH_CompletStatus === 100) {
            // If the task is complete, reset cleaning and status flags
              DH_CleanStatus = false;
              DH_SetLastStatus = false;
            }

            // If the current task status is one of the valid values and the robot is in one of the valid statuses
            if (validTaskStatuses.includes(DH_NowTaskStatus) && validNowStatuses.includes(DH_NowStatus)) {
              await this.DH_SetHistory(valueCopy, DH_Did + '.vis.PosHistory' + DH_CurMap);
              DH_CleanStatus = true;
              DH_SetLastStatus = false;
            }

            // If cleaning is in progress but not yet complete, record history
            if (DH_CompletStatus < 100 && DH_CleanStatus && !DH_SetLastStatus) {
              DH_SetLastStatus = true;
            // Optionally, uncomment this line if needed to set history back to base position
            // await this.DH_SetHistory("[-1,-1]", DH_Did + ".vis.PosHistory" + DH_CurMap);
            }
          }
        }
      }
    }
  }


  async DH_SetHistory(NewRobVal, InRobPath) {
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
        VarPointValue = JSON.parse(VarPointValue);
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
    const normalizedLevel = suctionSynonyms[language]?.[levelName.toLowerCase()] || levelName;

    for (const [number, name] of Object.entries(DreameSuctionLevel[language])) {
      if (name.toLowerCase() === normalizedLevel.toLowerCase()) {
        return number;
      }
    }
    return -1;
  }


  async DH_AlexamoppingLevel(language, levelName) {
    const normalizedLevel = moppingSynonyms[language]?.[levelName.toLowerCase()] || levelName;

    for (const [number, name] of Object.entries(DreameWaterVolume[language])) {
      if (name.toLowerCase() === normalizedLevel.toLowerCase()) {
        return number;
      }
    }
    return -1;
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
    return {
      suctionLevel,
      moppingLevel,
      alexaUserSettings
    };
  };

  async applyCleaningSettings(alexaUserSettings, suctionLevel, moppingLevel) {
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
  };

  async setCleaningModeWithRetry(robot, roomAction, AlexaID, maxRetries = 5, delay = 500) {
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
      await this.speakToAlexa(AlexaInfo[UserLang][17](roomAction.cleaningModes, maxRetries, lastValidMode), AlexaID);
      //await this.setStateAsync(`${robot}.control.CleaningMode`, lastValidMode);
    }
  }

  // Checks the cleaning status and waits for completion or an error
  async checkCleaningStatus(robot, roomNumber, roomName, cleaningStatusKey, errorStatusKey, PausedStatusKey, AlexaID, callback) {
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
          this.speakToAlexa(AlexaInfo[UserLang][18], AlexaID);
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
            this.speakToAlexa(AlexaInfo[UserLang][24](roomNumber), AlexaID);
            isMonitorCleaningState = false; // Reset the Monitor for cleaning status
			            isAbortCommandReceived = false; // Reset Flag to track if the abort command has been received
            callback(true); // Abort cleaning
            return;
          }
        } else {
          // If the cleaning is no longer paused, reset the timer
          if (pausedStartTime) {
            this.log.info(AlexaInfo[UserLang][23](roomNumber)); // Cleaning resumed
            this.speakToAlexa(AlexaInfo[UserLang][23](roomNumber), AlexaID);
            pausedStartTime = null; // Reset the timer
          }
        }

        // Check if an error has occurred
        if (errorState && errorState.val !== 0) {
          if (!errorStartTime) {
            errorStartTime = Date.now(); // Store the error timestamp
            this.log.info(AlexaInfo[UserLang][19](roomNumber)); // Log error
            this.speakToAlexa(AlexaInfo[UserLang][19](roomNumber), AlexaID);
          }

          // If the error persists for more than 5 minutes, cancel cleaning
          if (Date.now() - errorStartTime > 300000) { // 300,000ms = 5 minutes
            this.log.info(AlexaInfo[UserLang][20](roomNumber)); // Log error
            this.speakToAlexa(AlexaInfo[UserLang][20](roomNumber), AlexaID);
            isMonitorCleaningState = false; // Reset the Monitor for cleaning status
			            isAbortCommandReceived = false; // Reset Flag to track if the abort command has been received
            callback(true); // Abort cleaning
            return;
          }
        } else {
          // If the error is resolved, reset the timer
          if (errorStartTime) {
            this.log.info(AlexaInfo[UserLang][21](roomNumber)); // Error fixed
            this.speakToAlexa(AlexaInfo[UserLang][21](roomNumber), AlexaID);
            errorStartTime = null; // Reset the timer
          }
        }

        // Check if cleaning is complete
        if (cleaningState.val === 100) {
          this.log.info(AlexaInfo[UserLang][22](roomNumber)); // Cleaning completed
          this.speakToAlexa(AlexaInfo[UserLang][22](roomNumber), AlexaID);
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
  async startNextRoomCleaning(robot, selectedRooms, roomActions, currentIndex, AlexaID) {
    // If all rooms have been cleaned, log a message and notify Alexa, then exit
    if (currentIndex >= selectedRooms.length) {
      this.log.info(AlexaInfo[UserLang][11]); // "All rooms cleaned"
      this.speakToAlexa(AlexaInfo[UserLang][11]);
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
    await this.setCleaningModeWithRetry(robot, roomAction, AlexaID, 5, 600);

    // Log the current cleaning action and notify Alexa
    const cleaningModeText = AlexacleanModes[UserLang][roomAction.cleaningModes] || roomAction.cleaningModes;
    const message = AlexaInfo[UserLang][13](roomNumber, roomAction.name, cleaningModeText); // Start cleaning the room ${roomNumber} (${roomAction.name}) with mode ${cleaningModeText}
    this.log.info(message);
    this.speakToAlexa(message, AlexaID);

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

    await this.applyCleaningSettings(alexaUserSettings, suctionLevel, moppingLevel);

    // Start the cleaning process with custom commands if necessary
    await this.wait(waitingvalue);
    await this.setStateAsync(`${robot}.control.StartCustom`, JSON.stringify(roomAction.customCommand));

    // Monitor the cleaning status to handle errors or completion
    this.checkCleaningStatus(robot, roomNumber, roomAction.name,
      `${robot}.state.CleaningCompleted`, // Status key indicating cleaning completion
      `${robot}.state.Faults`, // Status key for error detection
      `${robot}.state.CleaningPaused`, // Status key for paused state
      AlexaID,
      (errorOccurred) => {
        if (errorOccurred) {
          // If an error occurs and cleaning cannot continue, log it and notify Alexa
          this.log.info(AlexaInfo[UserLang][14](roomNumber, roomAction.name)); // Cleaning of room ${roomNumber} (${roomAction.name}) was aborted due to an error.
          this.speakToAlexa(AlexaInfo[UserLang][14](roomNumber, roomAction.name), AlexaID);
        } else {
          // If cleaning was successful, proceed to the next room
          this.startNextRoomCleaning(robot, selectedRooms, roomActions, currentIndex + 1, AlexaID);
        }
      }
    );
  }

  // Starts the entire cleaning process for all rooms in `selectedRooms`
  async startCleaning(robot, selectedRooms, roomActions, AlexaID) {
    isMonitorCleaningState = true;
    this.startNextRoomCleaning(robot, selectedRooms, roomActions, 0, AlexaID);
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

  // Helper function to wait until robot is docked (either during cleaning or after returning)
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

  async speakToAlexa(message, AlexaID) {
    if (AlexaID) {
      this.log.info('Speak: ' + message);
      await this.setForeignStateAsync(`alexa2.0.Echo-Devices.${AlexaID}.Commands.speak`, message);
    }
  };

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

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
        if (id.toString().indexOf('.CleanCarpet') != -1) {
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

        if (id.toString().indexOf('.Start-Clean') != -1) {
          if (state.val) {
            /*try
							{
								var GetRoomIdOb, GetCleaningModeOb, GetCleaningRouteOb, GetRepeatOb, GetSuctionLevelOb, GetWaterVolumeOb;
								let GetCleanRoomState = await this.getStatesAsync('*.' + DH_CurMap + '.*.Cleaning');
								dreamehome.0.XXX.map.1.Roomxx.CleaningMode
								dreamehome.0.XXX.map.1.Roomxx.CleaningRoute
								dreamehome.0.XXX.map.1.Roomxx.Repeat
								dreamehome.0.XXX.map.1.Roomxx.SuctionLevel
								dreamehome.0.XXX.map.1.Roomxx.WaterVolume
								var ToGetString = '{\"selects\":[';
								for (let idx in GetCleanRoomState)
								{
									if (GetCleanRoomState[idx].val == 1)
									{
										ToGetString += GetMultiId === 0 ? '[' : ',[';
										GetMultiId += 1;
										var RIdx = idx.lastIndexOf(".");
										var RPath = idx.substring(0, RIdx);
										//start-clean[{"piid": 1,"value": 18},{"piid": 10,"value": "{\"selects\": [[3,1,3,2,1]]}"}]
										//Room ID, Repeats, Suction Level, Water Volume, Multi Room Id
										GetRoomIdOb = await this.getStateAsync(RPath + ".RoomOrder");
										GetRoomId = GetRoomIdOb.val;
										GetRepeatsOb = await this.getStateAsync(RPath + ".Repeat");
										GetRepeats = GetRepeatsOb.val;
										GetSuctionLevelOb = await this.getStateAsync(RPath + ".SuctionLevel");
										GetSuctionLevel = GetSuctionLevelOb.val;
										GetWaterVolumeOb = await this.getStateAsync(RPath + ".WaterVolume");
										GetWaterVolume = GetWaterVolumeOb.val;
										ToGetString += GetRoomId + ',' + GetRepeats + ',' + GetSuctionLevel + ',' + GetWaterVolume + ',' + GetMultiId +
											']';
									}
								}
							}
                        */
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
        let ambiguousCommand = false; // Flag to track ambiguous commands
        const roomsWithCommands = {}; // Object to track rooms with commands
        let currentRoom = null;
        let singleRoomName = '';
        const missingCleaningModeRooms = [];

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
            await this.setStateAsync(`${DH_Did}.control.Charge`, true); // Send the robot to charging station
            this.speakToAlexa(AlexaInfo[UserLang][3], LastAlexaID); // Notify Alexa that cleaning was aborted
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

        // Check for missing suction or mopping levels based on the selected cleaning mode
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
              await this.speakToAlexa(clarificationMessage, LastAlexaID);
            } else {
              const roomMessages = missingCleaningModeRooms.map(room => `${room.name}: ${room.missing}`).join('; ');
              const clarificationMessage = AlexaInfo[UserLang][26](roomMessages);
              this.log.info('Speak: ' + clarificationMessage);
              await this.speakToAlexa(clarificationMessage, LastAlexaID);
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
            await this.speakToAlexa(AlexaInfo[UserLang][2] + ' ' + readableLog, LastAlexaID);
            // Stop the current cleaning
            await this.setStateAsync(DH_Did + '.control.Stop', true);

            await this.wait(waitingvalue);


            // Prevent starting a new cleaning if `isMonitorCleaningState` is true
            if (!isMonitorCleaningState) {
						    this.startCleaning(DH_Did, selectedRooms, roomActions, LastAlexaID);
              this.log.info('Cleaning stopped and a new cleaning process started.');
            } else {
              this.log.info(AlexaInfo[UserLang][2]); //Cannot start a new cleaning process as a cleaning process is being monitored.
              await this.speakToAlexa(AlexaInfo[UserLang][27], LastAlexaID);
            }
          } else {
            await this.speakToAlexa(AlexaInfo[UserLang][2], LastAlexaID);
            this.log.info('Cleaning is active, waiting for user to cancel the cleaning.');
          }
        } else {
          // Prevent starting a new cleaning if `isMonitorCleaningState` is true
          if (!isMonitorCleaningState) {
					    await this.speakToAlexa(readableLog, LastAlexaID);
					    this.startCleaning(DH_Did, selectedRooms, roomActions, LastAlexaID);
					    this.log.info('Started a new cleaning process without checking for cancel command.');
          } else {
            this.log.info(AlexaInfo[UserLang][2]); //Cannot start a new cleaning process as a cleaning process is being monitored.
            await this.speakToAlexa(AlexaInfo[UserLang][27], LastAlexaID);
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