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
const zlib = require("node:zlib");
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
let Waterstr = ''
for (let i = 1; i < 6; i++) {
    Waterstr = Waterstr + i + ':Low ' + i + ',';
}
for (let i = 6; i < 17; i++) {
    Waterstr = Waterstr + i + ':Middle ' + i + ',';
}
for (let i = 17; i < 28; i++) {
    Waterstr = Waterstr + i + ':Height ' + i + ',';
}
for (let i = 28; i < 33; i++) {
    Waterstr = Waterstr + i + ':Ultra ' + i + ',';
}
const DreameSetWaterVolume = Object.fromEntries(Waterstr.replace(/,.$/, '').split(',').map(i => i.split(':')));
const DreameRepeat = {
    1: '1',
    2: '2',
    3: '3'
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
var UpdateCleanset = true;
var CheckRCObject = false;
var CheckSCObject = false;
var CheckUObject = true;
var IsRoomsSettings = [];
//=======================>Start Map Color
var ColorsItems = ['#abc7f8', '#E6B3ff', '#f9e07d', '#b8e3ff', '#b8d98d', '#FFB399', '#99FF99', '#4DB3FF', '#80B388', '#E6B3B3', '#FF99E6', '#99E6E6', '#809980', '#E6FF80', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D', '#80B300', '#809900', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC', '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#1AB399', '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#1AFF33', '#999933', '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D', '#6666FF'];
var ColorsCarpet = ['#004080', '#003366', '#00264d', '#000080', '#000066', '#00004d', '#800080', '#660066', '#4d004d', '#602020', '#4d1919', '#391313', '#804000', '#663300', '#4d2600', '#008000', '#006600', '#004d00'];
var RoomsStrokeColor = "black";
var RoomsLineWidth = 4;
var WallColor = "black";
var WallStrokeColor = "black";
var WallLineWidth = 4;
var DoorsColor = "black";
var DoorsStrokeColor = "black";
var DoorsLineWidth = 2;
var ChargerColor = "green";
var ChargerStrokeColor = "white";
var ChargerLineWidth = 3;
var CarpetColor = "black";
var CarpetStrokeColor = "blue";
var CarpetLineWidth = 3;
//<=================End Map Color
//=================>Start Map Settings
var fullQuality = "";
var DH_ScaleValue = 20; // Min 14 | Default 14.5
//<=================End Map Settings
//=================>Start Global
var DH_OldTaskStatus = -1, DH_NewTaskStatus = -1, DH_NowTaskStatus = -1, DH_NowStatus = -1;
var UserLang = "EN";
//<=================End Global
const SegmentToName = {
    "EN": {
        0: "Room",
        1: "Living Room",
        2: "Primary Bedroom",
        3: "Study",
        4: "Kitchen",
        5: "Dining Hall",
        6: "Bathroom",
        7: "Balcony",
        8: "Corridor",
        9: "Utility Room",
        10: "Closet",
        11: "Meeting Room",
        12: "Office",
        13: "Fitness Area",
        14: "Recreation Area",
        15: "Secondary Bedroom"
    },
    "DE": {
        0: "Raum",
        1: "Wohnzimmer",
        2: "Hauptschlafzimmer",
        3: "Arbeitszimmer",
        4: "Küche",
        5: "Speisesaal",
        6: "Badezimmer",
        7: "Balkon",
        8: "Korridor",
        9: "Hauswirtschaftsraum",
        10: "Schrank",
        11: "Besprechungsraum",
        12: "Büro",
        13: "Fitnessbereich",
        14: "Erholungsgebiet",
        15: "Zweites Schlafzimmer"
    }
};

const DreameInformation = {
	"EN": {
		0: 'The currently set default Map number is set to ',
        1: 'The default Map number is missing! Forced the default Map number to be set to 0 : Error Result ',
        2: 'Unable to decode Map from MapID "',
		3: 'Unable to genarate Map from MapID "',
        4: '"! please set a valid MapId',
        5: 'The map was successfully downloaded from the cloud',
		6: 'The map was successfully downloaded from the cloud and the creation was successful. Format the file contents of ',
		7: ' and paste it into the vis HTML widget',
	},
    "DE": {
		0: 'Die aktuell eingestellte Standard-Kartennummer ist eingestellt auf ',
        1: 'Die Standardkartennummer fehlt! Die standardmäßige Kartennummer wurde auf 0 gesetzt: Fehlerergebnis ',
        2: 'Die Karte kann nicht aus MapID dekodiert werden; MapID "',
		3: 'Die Karte kann nicht aus MapID erstellt werden; MapID "' ,
        4: '"! Bitte legen Sie eine gültige MapId fest',
        5: 'Die Karte wurde erfolgreich aus der Cloud heruntergeladen',
	    6: 'Die Karte wurde erfolgreich aus der Cloud heruntergeladen und die Erstellung war erfolgreich. Formatieren Sie den Dateiinhalt von ',
		7: ' und fügen Sie ihn in das vis-HTML-Widget ein',
    }
}

const DreameVacuumErrorCode = {
    "EN": {
        "-1": "Unknown",
        0: "No error",
        1: "Drop",
        2: "Cliff",
        3: "Bumper",
        4: "Gesture",
        5: "Bumper repeat",
        6: "Drop repeat",
        7: "Optical flow",
        8: "Box",
        9: "Tankbox",
        10: "Waterbox empty",
        11: "Box full",
        12: "Brush",
        13: "Side brush",
        14: "Fan",
        15: "Left wheel motor",
        16: "Right wheel motor",
        17: "Turn suffocate",
        18: "Forward suffocate",
        19: "Charger get",
        20: "Battery low",
        21: "Charge fault",
        22: "Battery percentage",
        23: "Heart",
        24: "Camera occlusion",
        25: "Move",
        26: "Flow shielding",
        27: "Infrared shielding",
        28: "Charge no electric",
        29: "Battery fault",
        30: "Fan speed error",
        31: "Leftwhell speed",
        32: "Rightwhell speed",
        33: "Bmi055 acce",
        34: "Bmi055 gyro",
        35: "Xv7001",
        36: "Left magnet",
        37: "Right magnet",
        38: "Flow error",
        39: "Infrared fault",
        40: "Camera fault",
        41: "Strong magnet",
        42: "Water pump",
        43: "Rtc",
        44: "Auto key trig",
        45: "P3v3",
        46: "Camera idle",
        47: "Blocked",
        48: "Lds error",
        49: "Lds bumper",
        50: "Water pump 2",
        51: "Filter blocked",
        54: "Edge",
        55: "Carpet",
        56: "Laser",
        57: "Edge 2",
        58: "Ultrasonic",
        59: "No go zone",
        61: "Route",
        62: "Route 2",
        63: "Blocked 2",
        64: "Blocked 3",
        65: "Restricted",
        66: "Restricted 2",
        67: "Restricted 3",
        68: "Remove mop",
        69: "Mop removed",
        70: "Mop removed 2",
        71: "Mop pad stop rotate",
        72: "Mop pad stop rotate 2",
        75: "Unknown warning",
        101: "Bin full",
        102: "Bin open",
        103: "Bin open 2",
        104: "Bin full 2",
        105: "Water tank",
        106: "Dirty water tank",
        107: "Water tank dry",
        108: "Dirty water tank 2",
        109: "Dirty water tank blocked",
        110: "Dirty water tank pump",
        111: "Mop pad",
        112: "Wet mop pad",
        114: "Clean mop pad",
        116: "Clean tank level",
        117: "Station disconnected",
        118: "Dirty tank level",
        119: "Washboard level",
        120: "No mop in station",
        121: "Dust bag full",
        122: "Unknown warning 2",
        124: "Washboard not working",
        1000: "Return to charge failed"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Kein Fehler",
        1: "Tropfen",
        2: "Klippe",
        3: "Sto�stange",
        4: "Geste",
        5: "Sto�stange wiederholen",
        6: "Fallwiederholung",
        7: "Optischer Fluss",
        8: "Box",
        9: "Tankbox",
        10: "Wasserkasten leer",
        11: "Kasten voll",
        12: "Bürste",
        13: "Seitenbürste",
        14: "Gebläse",
        15: "Linker Radmotor",
        16: "Rechter Radmotor",
        17: "Drehung ersticken",
        18: "Vorwärts ersticken",
        19: "Ladegerät holen",
        20: "Batterie schwach",
        21: "Fehler beim Aufladen",
        22: "Prozentsatz der Batterie",
        23: "Herz",
        24: "Kamera verdeckt",
        25: "Bewegung",
        26: "Strömungsabschirmung",
        27: "Infrarot-Abschirmung",
        28: "Keine elektrische Ladung",
        29: "Batteriefehler",
        30: "Lüfterdrehzahlfehler",
        31: "Geschwindigkeit des linken Rades",
        32: "Geschwindigkeit des rechten Rades",
        33: "Bmi055 acce",
        34: "Bmi055 Kreisel",
        35: "Xv7001",
        36: "Linker Magnet",
        37: "Rechter Magnet",
        38: "Durchflussfehler",
        39: "Infrarot-Fehler",
        40: "Kamerafehler",
        41: "Starker Magnet",
        42: "Wasserpumpe",
        43: "Rtc",
        44: "Automatische Tastenauslösung",
        45: "P3v3",
        46: "Kamera im Leerlauf",
        47: "Blockiert",
        48: "Lds-Fehler",
        49: "Lds-Sto�stange",
        50: "Wasserpumpe 2",
        51: "Filter blockiert",
        54: "Rand",
        55: "Teppich",
        56: "Laser",
        57: "Kante 2",
        58: "Ultraschall",
        59: "Verbotszone",
        61: "Route",
        62: "Route 2",
        63: "Gesperrt 2",
        64: "Gesperrt 3",
        65: "Eingeschränkt",
        66: "Eingeschränkt 2",
        67: "Eingeschränkt 3",
        68: "Mopp entfernen",
        69: "Mopp entfernt",
        70: "Wischmopp entfernt 2",
        71: "Mop-Pad stoppt Drehung",
        72: "Mop-Pad stoppt Drehung 2",
        75: "Unbekannte Warnung",
        101: "Behälter voll",
        102: "Behälter offen",
        103: "Behälter offen 2",
        104: "Behälter voll 2",
        105: "Wassertank",
        106: "Wassertank verschmutzt",
        107: "Wassertank trocken",
        108: "Wassertank verschmutzt 2",
        109: "Schmutzwassertank blockiert",
        110: "Schmutzwassertankpumpe",
        111: "Wischmopp",
        112: "Wischmopp nass",
        114: "Mop-Pad reinigen",
        116: "Tankfüllstand reinigen",
        117: "Station abgekoppelt",
        118: "Füllstand des verschmutzten Tanks",
        119: "Füllstand Waschbrett",
        120: "Kein Mopp in Station",
        121: "Staubsaugerbeutel voll",
        122: "Unbekannte Warnung 2",
        124: "Waschtisch funktioniert nicht",
        1000: "Rückkehr zur Ladung fehlgeschlagen"
    }
};
const DreameVacuumState = {
    "EN": {
        "-1": "Unknown",
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
    },
    "DE": {
        "-1": "Unbekannt",
        1: "Staubsaugen",
        2: "Leerlauf",
        3: "Pausiert",
        4: "Fehler",
        5: "Zurückkehrend",
        6: "Aufladen",
        7: "Wischen",
        8: "Trocknen",
        9: "Waschen",
        10: "Zurückkehren zum Waschen",
        11: "Bauen",
        12: "Staubsaugen und Wischen",
        13: "Aufladen abgeschlossen",
        14: "Aufrüsten",
        15: "Saubere Aufforderung",
        16: "Station zurücksetzen",
        17: "Rückgabe Mopp installieren",
        18: "Rückgabe Mopp entfernen",
        19: "Wasser prüfen",
        20: "Reinigen, Wasser hinzufügen",
        21: "Waschen pausiert",
        22: "Automatische Entleerung",
        23: "Fernsteuerung",
        24: "Intelligentes Laden",
        25: "Zweite Reinigung",
        26: "Menschliches Folgen",
        27: "Punktuelle Reinigung",
        28: "Automatisch leer zurückkehren",
        97: "Abkürzung",
        98: "Überwachung",
        99: "Überwachung pausiert"
    }
};
const DreameTaskStatus = {
    "EN": {
        "-1": "Unknown",
        0: "Completed",
        1: "Auto cleaning",
        2: "Zone cleaning",
        3: "Segment cleaning",
        4: "Spot cleaning",
        5: "Fast mapping",
        6: "Auto cleaning paused",
        7: "Zone cleaning paused",
        8: "Segment cleaning paused",
        9: "Spot cleaning paused",
        10: "Map cleaning paused",
        11: "Docking paused",
        12: "Mopping paused",
        13: "Segment mopping paused",
        14: "Zone mopping paused",
        15: "Auto mopping paused",
        16: "Auto docking paused",
        17: "Segment docking paused",
        18: "Zone docking paused",
        20: "Cruising path",
        21: "Cruising path paused",
        22: "Cruising point",
        23: "Cruising point paused",
        24: "Summon clean paused",
        25: "Returning install mop",
        26: "Returning remove mop"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Abgeschlossen",
        1: "Automatische Reinigung",
        2: "Zonenreinigung",
        3: "Segment-Reinigung",
        4: "Punktuelle Reinigung",
        5: "Schnelles Mapping",
        6: "Automatische Reinigung pausiert",
        7: "Zonenreinigung unterbrochen",
        8: "Segmentreinigung unterbrochen",
        9: "Punktuelle Reinigung unterbrochen",
        10: "Kartenreinigung pausiert",
        11: "Andocken unterbrochen",
        12: "Wischen pausiert",
        13: "Segmentwischen pausiert",
        14: "Zonenwischen pausiert",
        15: "Automatisches Wischen pausiert",
        16: "Automatisches Andocken pausiert",
        17: "Segment Andocken pausiert",
        18: "Zonendocking pausiert",
        20: "Kreuzfahrtstrecke",
        21: "Fahrtroute pausiert",
        22: "Kreuzungspunkt",
        23: "Kreuzungspunkt pausiert",
        24: "Saubere Beschwörung pausiert",
        25: "Rückgabe Mopp installieren",
        26: "Rückgabe Mopp entfernen"
    }
};
const DreameStatus = {
    "EN": {
        "-1": "Unknown",
        0: "Idle",
        1: "Paused",
        2: "Cleaning",
        3: "Back home",
        4: "Part cleaning",
        5: "Follow wall",
        6: "Charging",
        7: "Ota",
        8: "Fct",
        9: "Wifi set",
        10: "Power off",
        11: "Factory",
        12: "Error",
        13: "Remote control",
        14: "Sleeping",
        15: "Self test",
        16: "Factory funcion test",
        17: "Standby",
        18: "Segment cleaning",
        19: "Zone cleaning",
        20: "Spot cleaning",
        21: "Fast mapping",
        22: "Cruising path",
        23: "Cruising point",
        24: "Summon clean",
        25: "Shortcut",
        26: "Person follow",
        1501: "Water check"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Leerlauf",
        1: "Pausiert",
        2: "Reinigung",
        3: "Zurück nach Hause",
        4: "Teilreinigung",
        5: "Wand folgen",
        6: "Aufladen",
        7: "Ota",
        8: "Fct",
        9: "Wifi einstellen",
        10: "Ausschalten",
        11: "Werk",
        12: "Fehler",
        13: "Fernsteuerung",
        14: "Schlafend",
        15: "Selbsttest",
        16: "Werksfunktionstest",
        17: "Bereitschaft",
        18: "Segment-Reinigung",
        19: "Zonenreinigung",
        20: "Punktuelle Reinigung",
        21: "Schnelles Mapping",
        22: "Fahrtroute",
        23: "Kreuzungspunkt",
        24: "Bereinigung herbeirufen",
        25: "Abkürzung",
        26: "Person folgen",
        1501: "Wasserprüfung"
    }
};
const DreameSuctionLevel = {
    "EN": {
        "-1": "Unknown",
        0: "Quiet",
        1: "Standard",
        2: "Strong",
        3: "Turbo"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Leise",
        1: "Standard",
        2: "Stark",
        3: "Turbo"
    }
};
const DreameWaterVolume = {
    "EN": {
        "-1": "Unknown",
        1: "Low",
        2: "Medium",
        3: "High"
    },
    "DE": {
        "-1": "Unbekannt",
        1: "Niedrig",
        2: "Mittel",
        3: "Hoch"
    }
};
const DreameCarpetSensitivity = {
	"EN": {
        "-1": "Unknown",
        1: "Low",
        2: "Medium",
        3: "High"
    },
    "DE": {
        "-1": "Unbekannt",
        1: "Niedrig",
        2: "Mittel",
        3: "Hoch"
    }
};
const DreameAutoDustCollecting = {
    "EN": {
        "-1": "Unknown",
        0: "Inactive",
        1: "Standard",
        2: "High frequency",
        3: "Low frequency"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Inaktiv",
        1: "Standard",
        2: "Hohe Frequenz",
        3: "Niedrige Frequenz"
    }
};
const DreameAutoEmptyStatus = {
    "EN": {
        "-1": "Unknown",
        0: "Idle",
        1: "Active",
        2: "Not Performed"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Leerlauf",
        1: "Aktiv",
        2: "Nicht ausgeführt"
    }
};
const DreameSelfWashBaseStatus = {
    "EN": {
        "-1": "Unknown",
        0: "Idle",
        1: "Washing",
        2: "Drying",
        3: "Returning",
        4: "Paused",
        5: "Clean Add Water",
        6: "Adding Water"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Leerlauf",
        1: "Waschen",
        2: "Trocknen",
        3: "Rücklauf",
        4: "Pausiert",
        5: "Reinigen Wasser hinzufügen",
        6: "Wasser zugeben"
    }
};
const DreameMopWashLevel = {
    "EN": {
        "-1": "Unknown",
        0: "Light",
        1: "Standard",
        2: "Deep"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Leicht",
        1: "Standard",
        2: "Tief"
    }
};
const DreameCarpetAvoidance = {
    "EN": {
        "-1": "Unknown",
        1: "Avoid",
        2: "Lifting the mop",
        3: "Remove mop",
        5: "Vacuum and Mop",
        6: "Ignore"
    },
    "DE": {
        1: "Vermeiden",
        2: "Mopp anheben",
        3: "Mopp entfernen",
        5: "Saugen und wischen",
        6: "Ignorieren"
    }
};
const DreameCleaningMode = {
    "EN": {
        "-1": "Unknown",
        0: "Sweeping",
        1: "Mopping",
        2: "Sweeping and mopping",
        3: "Mopping after sweeping",
        3840: "Customize room cleaning"
    },
    "DE": {
        0: "Staubsaugen",
        1: "Wischen",
        2: "Saugen und Wischen",
        3: "Wischen nach dem Saugen",
        3840: "Raumreinigung anpassen"
    }
};
const DreameChargingStatus = {
    "EN": {
        "-1": "Unknown",
        1: "Charging",
        2: "Not charging",
        3: "Charging completed",
        5: "Return to charge"
    },
    "DE": {
        1: "Aufladen",
        2: "Nicht geladen",
        3: "Aufladung abgeschlossen",
        5: "Rückkehr zum Laden"
    }
};
const DreameWaterTank = {
    "EN": {
        "-1": "Unknown",
        0: "Not installed",
        1: "Installed",
        10: "Mop installed",
        99: "Mop in station"
    },
    "DE": {
        0: "Nicht installiert",
        1: "Installiert",
        10: "Mopp installiert",
        99: "Mopp in Station"
    }
};

const DreameDirtyWaterTank = {
    "EN": {
        "-1": "Unknown",
		0: "Installed",
        1: "Not installed",
    },
    "DE": {
		0: "Installiert",
        1: "Nicht installiert",
    }
};

const DreamePureWaterTank = {
    "EN": {
        "-1": "Unknown",
		0: "Tank not installed",
        2: "No water left",
		3: "No warning",
    },
    "DE": {
		0: "Tank nicht installiert",
        2: "Kein Wasser mehr",
		3: "Keine Warnung",
    }
};

const DreameLowWaterWarning = {
    "EN": {
        "-1": "Unknown",
        0: "No warning",
        1: "No water left dismiss",
        2: "No water left",
        3: "No water left after clean",
        4: "No water for clean",
        5: "Low water",
        6: "Tank not installed"
    },
    "DE": {
        "-1": "Unbekannt",
        0: "Keine Warnung",
        1: "Kein Wasser übrig, verwerfen",
        2: "Kein Wasser mehr",
        3: "Nach der Reinigung ist kein Wasser mehr übrig",
        4: "Kein Wasser zum Reinigen",
        5: "Niedrigwasser",
        6: "Tank nicht installiert"
    }
};
const DreameStateCustomProperties = {
	"Unknown": "Current room cleaning name",
	"-1": "Current room cleaning number"
};
const DreameStateProperties = {
    "S2P1": "State",
    "S2P2": "Error",
    "S3P1": "Battery level",
    "S3P2": "Charging status",
    "S4P1": "Status",
    "S4P2": "Cleaning time",
    "S4P3": "Cleaned area",
    "S4P4": "Suction level",
    "S4P5": "Water volume",
    "S4P6": "Water tank",
    "S4P7": "Task status",
    "S4P8": "Cleaning start time",
    "S4P9": "Clean log file name",
    "S4P10": "Cleaning properties",
    "S4P11": "Resume cleaning",
    "S4P12": "Carpet boost",
    "S4P13": "Clean log status",
    "S4P14": "Serial number",
    "S4P15": "Remote control",
    "S4P16": "Mop cleaning remainder",
    "S4P17": "Cleaning paused",
    "S4P18": "Faults",
    "S4P19": "Nation matched",
    "S4P20": "Relocation status",
    "S4P21": "Obstacle avoidance",
    "S4P22": "Ai detection",
    "S4P23": "Cleaning mode",
    "S4P24": "Upload map",
    "S4P25": "Self wash base status",
    "S4P26": "Customized cleaning",
    "S4P27": "Child lock",
    "S4P28": "Carpet sensitivity",
    "S4P29": "Tight mopping",
    "S4P30": "Cleaning cancel",
    "S4P31": "Y clean",
    "S4P32": "Water electrolysis",
    "S4P33": "Carpet recognition",
    "S4P34": "Self clean",
    "S4P35": "Warn status",
    "S4P36": "Carpet avoidance",
    "S4P37": "Auto add detergent",
    "S4P38": "Capability",
    "S4P39": "Save water tips",
    "S4P40": "Drying time",
    "S4P41": "Low water warning",
    "S4P45": "Auto mount mop",
    "S4P46": "Mop wash level",
    "S4P47": "Scheduled clean",
    "S4P48": "Quick command",
    "S4P49": "Intelligent recognition",
    "S4P50": "Auto switch settings",
    "S4P51": "Auto water refilling",
    "S4P52": "Mop in station",
    "S4P53": "Mop pad installed",
    "S4P63": "Cleaning completed",
    "S4P64": "Current charging",
    "S4P99": "Combined data",
    "S5P1": "Dnd",
    "S5P2": "Dnd start",
    "S5P3": "Dnd end",
    "S5P4": "Dnd task",
    "S5P58": "Mop retracted extended",
    "S6P1": "Map data",
    "S6P2": "Frame info",
    "S6P3": "Object name",
    "S6P4": "Map extend data",
    "S6P5": "Robot time",
    "S6P6": "Result code",
    "S6P7": "Multi floor map",
    "S6P8": "Map list",
    "S6P9": "Recovery map list",
    "S6P10": "Map recovery",
    "S6P11": "Map recovery status",
    "S6P13": "Old map data",
    "S6P14": "Backup map status",
    "S6P15": "Wifi map",
    "S7P1": "Volume",
    "S7P2": "Voice packet id",
    "S7P3": "Voice change status",
    "S7P4": "Voice change",
    "S8P1": "Timezone",
    "S8P2": "Schedule",
    "S8P3": "Schedule id",
    "S8P4": "Schedule cancel reason",
    "S8P5": "Cruise schedule",
    "S9P1": "Main brush time left",
    "S9P2": "Main brush left",
    "S10P1": "Side brush time left",
    "S10P2": "Side brush left",
    "S11P1": "Filter left",
    "S11P2": "Filter time left",
    "S12P1": "First cleaning date",
    "S12P2": "Total cleaning time",
    "S12P3": "Cleaning count",
    "S12P4": "Total cleaned area",
    "S13P1": "Map saving",
    "S15P1": "Auto dust collecting",
    "S15P2": "Auto empty frequency",
    "S15P3": "Dust collection",
    "S15P5": "Auto empty status",
    "S16P1": "Sensor dirty left",
    "S16P2": "Sensor dirty time left",
    "S18P1": "Mop pad left",
    "S18P2": "Mop pad time left",
    "S19P1": "Silver ion time left",
    "S19P2": "Silver ion left",
    "S20P1": "Detergent left",
    "S20P2": "Detergent time left",
    "S27P1": "Pure water tank",
    "S27P2": "Dirty water tank",
    "S28P2": "Clean carpet first",
    "S99P98": "Cleaning towards the floor",
    "S10001P1": "Stream status",
    "S10001P2": "Stream audio",
    "S10001P4": "Stream record",
    "S10001P5": "Take photo",
    "S10001P6": "Stream keep alive",
    "S10001P7": "Stream fault",
    "S10001P9": "Camera brightness",
    "S10001P10": "Camera light",
    "S10001P101": "Stream cruise point",
    "S10001P99": "Stream property",
    "S10001P103": "Stream task",
    "S10001P1003": "Stream upload",
    "S10001P1100": "Stream code",
    "S10001P1101": "Stream set code",
    "S10001P1102": "Stream verify code",
    "S10001P1103": "Stream reset code",
    "S10001P2003": "Stream space"
};
const DreameActionProperties = {
    "S2A1": "Start",
    "S2A2": "Pause",
    "S3A1": "Charge",
    "S4A1": "Start custom",
	"S4A1C1": "Fast mapping",
    "S4A2": "Stop",
    "S4A3": "Clear warning",
    "S4A4": "Start washing",
    //"S4A6": "Get photo info",
    "S4A8": "Shortcuts",
	"S4P50C1": "Auto switch settings",
    "S6A1": "Request map",
    "S6A2": "Update map data",
	"S6A2C1": "Change map",
	"S6A2C2": "Rename map",
	"S6A2C3": "Delete map",
	"S6A2C4": "Rotate map",
    "S6A3": "Backup map",
    "S6A4": "Wifi map",
    "S7A1": "Locate",
    "S7A2": "Test sound",
    "S8A1": "Delete schedule",
    "S8A2": "Delete cruise schedule",
    "S9A1": "Reset main brush",
    "S10A1": "Reset side brush",
    "S11A1": "Reset filter",
    "S16A1": "Reset sensor",
    "S15A1": "Start auto empty",
    "S17A1": "Reset secondary filter",
    "S18A1": "Reset mop pad",
    "S19A1": "Reset silver ion",
    "S20A1": "Reset detergent",
    //"S10001A1": "Stream video",
    //"S10001A2": "Stream audio",
    //"S10001A3": "Stream property",
    //"S10001A4": "Stream code"
};
const DreameActionParams = {
    "S2A1": "false", // Start
    "S2A2": "false", // Pause
    "S3A1": "false", // Charge
    "S4A1": [{"piid": 1,"value": 18},{"piid": 10,"value": "{\"selects\": [[1,1,3,2,1]]}"}], //Start custom
	"S4A1C1": [{"value": 21}], // Fast mapping
    "S4A2": "false", // Stop
    "S4A3": "false", // Clear warning
    "S4A4": "false", // Start washing
    //"S4A6": "false", // Get photo info
    "S4A8": "false", // Shortcuts
	"S4P50C1": ["{\"k\":\"AutoDry\",\"v\":1},{\"k\":\"SmartAutoWash\",\"v\":2},{\"k\":\"CarpetOnlyClean\",\"v\":1},{\"k\":\"MopEffectSwitch\",\"v\":1},{\"k\":\"FluctuationTestResult\",\"v\":0},{\"k\":\"CleanRoute\",\"v\":1},{\"k\":\"SuperWash\",\"v\":0},{\"k\":\"MopScalable\",\"v\":2},{\"k\":\"SuctionMax\",\"v\":0},{\"k\":\"LessColl\",\"v\":1},{\"k\":\"CarpetFineClean\",\"v\":1},{\"k\":\"FillinLight\",\"v\":1},{\"k\":\"MonitorHumanFollow\",\"v\":0},{\"k\":\"MopScalableVersion\",\"v\":0},{\"k\":\"SmartDrying\",\"v\":0},{\"k\":\"LacuneMopScalable\",\"v\":1},{\"k\":\"HotWash\",\"v\":1},{\"k\":\"CleanType\",\"v\":0},{\"k\":\"DetergentNote\",\"v\":1},{\"k\":\"MeticulousTwist\",\"v\":-7},{\"k\":\"MopEffectState\",\"v\":3},{\"k\":\"MaterialDirectionClean\",\"v\":0},{\"k\":\"PetPartClean\",\"v\":0},{\"k\":\"RobotCarpetPressEnable\",\"v\":1},{\"k\":\"MopScalable2\",\"v\":1},{\"k\":\"MonitorPromptLevel\",\"v\":1},{\"k\":\"UVLight\",\"v\":0},{\"k\":\"MopFullyScalable\",\"v\":0},{\"k\":\"StainIdentify\",\"v\":1},{\"k\":\"SmartAutoMop\",\"v\":2},{\"k\":\"SmartCharge\",\"v\":1},{\"k\":\"FluctuationConfirmResult\",\"v\":0},{\"k\":\"SmartHost\",\"v\":0}"],//"Auto switch settings",
    "S6A1": [{"piid": 2,"value": "{\"req_type\":1,\"frame_type\":\"I\",\"force_type\":1}"}], // Request map
    "S6A2": [{"piid": 4,"value":"{\"customeClean\":[[1,2,27,2,2,2]]}"}], // Update map data | Room Settings
	"S6A2C1": [{"piid": 4,"value": "{\"sm\":{},\"mapid\":map_id}"}], // Update map data | Change map:
	"S6A2C2": [{"piid": 4,"value": "{\"nrism\":{\"map_id\":{\"name\":\"New_name\"}}}"}],  // Update map data | Rename map: "{\"nrism\":{\"292\":{\"name\":\"Test\"}}}"
	"S6A2C3": [{"piid": 4,"value": "{\"cm\":{},\"mapid\":map_id}"}], // Update map data | Delete map
	"S6A2C4": [{"piid": 4,"value": "{\"smra\":{\"map_id\":{\"ra\":90}}}"}], // Update map data | Rotate map
    "S6A3": "false", // Backup map
    "S6A4": "false", // Wifi map
    "S7A1": "false", // Locate
    "S7A2": "false", // Test sound
    "S8A1": "false", // Delete schedule
    "S8A2": "false", // Delete cruise schedule
    "S9A1": "false", // Reset main brush
    "S10A1": "false", // Reset side brush
    "S11A1": "false", // Reset filter
    "S16A1": "false", // Reset sensor
    "S15A1": "false", // Start auto empty
    "S17A1": "false", // Reset secondary filter
    "S18A1": "false", // Reset mop pad
    "S19A1": "false", // Reset silver ion
    "S20A1": "false", // Reset detergent
    //"S10001A1": "false", // Stream video
    //"S10001A2": "false", // Stream audio
    //"S10001A3": "false", // Stream property
    //"S10001A4": "false", // Stream code
};

var LogData; // = false;
var URLTK = "aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLWF1dGgvb2F1dGgvdG9rZW4=";
var DH_URLTK = new Buffer.from(URLTK, 'base64');
var URLLST = "aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHVzZXJiaW5kL2RldmljZS9saXN0VjI=";
var DH_URLLST = new Buffer.from(URLLST, 'base64');
var URLINF = "aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHVzZXJiaW5kL2RldmljZS9pbmZv";
var DH_URLINF = new Buffer.from(URLINF, 'base64');
var URLOTCINF = "aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHN0YXR1cy9kZXZPVENJbmZv";
var DH_URLOTCINF = new Buffer.from(URLOTCINF, 'base64');
var URLPROP = "aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdHN0YXR1cy9wcm9wcw==";
var DH_URLPROP = new Buffer.from(URLPROP, 'base64');
var URLDOWNURL = "aHR0cHM6Ly9ldS5pb3QuZHJlYW1lLnRlY2g6MTMyNjcvZHJlYW1lLXVzZXItaW90L2lvdGZpbGUvZ2V0RG93bmxvYWRVcmw=";
var DH_URLDOWNURL = new Buffer.from(URLDOWNURL, 'base64');
var URLUSA = "RHJlYW1lX1NtYXJ0aG9tZS8xLjUuNTkgKGlQaG9uZTsgaU9TIDE2LjA7IFNjYWxlLzMuMDAp";
var DH_URLUSA = new Buffer.from(URLUSA, 'base64');
var URLDRLC = "MWM4MGIzNzg3YjIyNjY3NzZiY2RjNDgxZjM3ZDhmYTQyYmExMGEzMGFmODFhNmRmLTE=";
var DH_URLDRLC = new Buffer.from(URLDRLC, 'base64');
var URLAUTH = "QmFzaWMgWkhKbFlXMWxYMkZ3Y0hZeE9rRlFYbVIyUUhwQVUxRlpWbmhPT0RnPQ==";
var DH_URLAUTH = new Buffer.from(URLAUTH, 'base64');
var DHURLSENDA = "L2RyZWFtZS1pb3QtY29tLQ==";
var DH_DHURLSENDA = new Buffer.from(DHURLSENDA, 'base64');
var DHURLSENDB = "L2RldmljZS9zZW5kQ29tbWFuZA==";
var DH_DHURLSENDB = new Buffer.from(DHURLSENDB, 'base64');
var DH_Auth = "",
    DH_AuthRef = "",
    DH_Expires = "",
    DH_Tenant = "000000",
    DH_Country = "DE",
    DH_Uid = "",
    DH_Lang = "de",
    DH_Region = "eu",
    DH_Islogged = false,
    DH_Did = "",
    DH_Model = "",
    DH_Mac = "",
    DH_BDomain = "",
	DH_Domain = "",
    DH_filename = "",
    DH_Map = "",
	DH_MapID = "",
	DH_MapIDs = [],
	DH_CurMap = 0,
	DH_Host = "";
var canvas = createCanvas();
var context = canvas.getContext("2d");
canvas.height = 1024;
canvas.width = 1024;
var DH_UpdateMapInterval = null;
var DH_UpdateTheMap = true;

//================> Global Get Robot position (Segment)
var CheckArrayRooms = [];
var Mrooms = [];

class Dreame extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'dreame',
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


        this.subscribeStates('*.remote.*');
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
            var LogDataObjectOb = await this.getStateAsync('settings.showlog');
            LogData = LogDataObjectOb.val;
            this.log.info("Log status is set to " + LogData);
        } catch (error) {
            this.log.error(error);
            if (LogData == null) {
                LogData = false;
            }
        }
        this.subscribeStates('settings.showlog');
        await this.DH_CloudLogin();
        if (DH_Auth) {
            var In_path = DH_Did + ".vis.";
            await this.setObjectNotExists(In_path + 'vishtml0', {
                type: 'state',
                common: {
                    name: 'HTML for VIS Map 1',
                    type: 'mixed',
                    role: 'state',
                    write: false,
                    read: true,
                    def: ""
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
                    def: ""
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
                    def: "{}"
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
                    def: "{}"
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
                    def: "{}"
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
                    def: "{}"
                },
                native: {},
            });

			try {
				var RobTaskStatusOb = await this.getStateAsync(DH_Did + ".state.TaskStatus");
				var RobTaskStatus = RobTaskStatusOb.val;
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
				var DH_CurMapOb = await this.getStateAsync(DH_Did + '.map.MapNumber');
				DH_CurMap = DH_CurMapOb.val;
				this.log.info(DreameInformation[UserLang][0] + DH_CurMap);
			} catch (error) {
				this.log.warn(DreameInformation[UserLang][1] + error);
				DH_CurMap = 0;
			}

			var In_path = DH_Did + ".";
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
                var CheckUObjectOb = await this.getStateAsync(In_path + 'map.Update');
                CheckUObject = CheckUObjectOb.val;
            } catch (error) {
                this.log.error(error);
                if (CheckUObject == null) {
                    //this.setStateAsync(In_path + 'map.Update', true, true);
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
                var CheckSCObjectOb = await this.getStateAsync(In_path + 'map.Start-Clean');
                CheckSCObject = CheckSCObjectOb.val;
            } catch (error) {
                this.log.error(error);
                if (CheckSCObject == null) {
                    //this.setStateAsync(In_path + 'map.Start-Clean', false, true);
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
                var CheckRCObjectOb = await this.getStateAsync(In_path + 'map.Restart');
                CheckRCObject = CheckRCObjectOb.val;
            } catch (error) {
                this.log.error(error);
                if (CheckRCObject == null) {
                    //this.setStateAsync(In_path + 'map.Restart', false, true);
                    CheckRCObject = false;
                }
            }

            /* for (var ikey in Dreameproperties) {
                 var GetUseriiD = Dreameproperties[ikey].siid + "-" + Dreameproperties[ikey].piid;
                 await this.SearchIID(GetUseriiD, GetUserDevice);
             }*/
            await this.DH_connectMqtt();
            this.refreshTokenInterval = setInterval(async () => {
                    await this.DH_refreshToken();
                },
                (DH_Expires - 100 || 3500) * 1000, );
            this.subscribeStates('*.map.*');

			if (DH_Map) {
                Mrooms = DH_Map["walls_info"].storeys[0].rooms;
                for (var iRoom in Mrooms) {
                    var walls = Mrooms[iRoom]["walls"];
                    var CheckArrayRoomsX = [],
                        CheckArrayRoomsY = [];
                    //this.log.info(JSON.stringify(walls));
                    for (var iWall in walls) {
                        CheckArrayRoomsX.push(walls[iWall]["beg_pt_x"]);
                        CheckArrayRoomsX.push(walls[iWall]["end_pt_x"]);
                        CheckArrayRoomsY.push(walls[iWall]["beg_pt_y"]);
                        CheckArrayRoomsY.push(walls[iWall]["end_pt_y"]);

                    }
                    var SortiRoom = {};
                    SortiRoom.Id = Mrooms[iRoom]["room_id"];
                    var SegmentType = DH_Map["seg_inf"][Mrooms[iRoom]["room_id"]].type;
                    if (SegmentType == 0) {
                        SortiRoom.Name = await this.DH_Base64DecodeUnicode(DH_Map["seg_inf"][Mrooms[iRoom]["room_id"]].name);
                    } else {
                        SortiRoom.Name = SegmentToName[UserLang][SegmentType];
                    }
                    SortiRoom.X = CheckArrayRoomsX;
                    SortiRoom.Y = CheckArrayRoomsY;
                    CheckArrayRooms.push(SortiRoom);
                }
            }
        }
    }

    async DH_CloudLogin() {
        await this.DH_requestClient({
            method: 'post',
            maxBodyLength: Infinity,
            url: DH_URLTK,
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Language": "en-US;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "User-Agent": DH_URLUSA,
                "Dreame-Rlc": DH_URLDRLC,
                "Authorization": DH_URLAUTH,
                "Tenant-Id": DH_Tenant,
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
            var RetObject = JSON.parse(JSON.stringify(responseData));

            await this.DH_PropObject(RetObject, "login.", "Login: ");
            this.setState('info.connection', true, true);
            DH_Auth = responseData["access_token"];
            DH_AuthRef = responseData["refresh_token"];
            DH_Expires = responseData["expires_in"];
            DH_Tenant = responseData["tenant_id"];
            DH_Country = responseData["country"];
            DH_Uid = responseData["uid"];
			DH_Domain = responseData["domain"];
            DH_Lang = responseData["lang"];
            DH_Region = responseData["region"];
            DH_Islogged = true;
			if (DH_Lang.toUpperCase() == "DE") { UserLang = DH_Lang.toUpperCase(); } /*Translate function*/
            var SETURLData = {};
            var GetCloudRequestList = await this.DH_URLRequest(DH_URLLST, SETURLData);
            if (GetCloudRequestList) {
                var GetListData = JSON.parse(JSON.stringify(GetCloudRequestList.data.page.records));
                if (LogData) {
                    this.log.info("Split " + DH_URLLST + " response: " + JSON.stringify(GetListData));
                }
                DH_Did = GetListData[0].did;
                DH_Model = GetListData[0].model;
                DH_Mac = GetListData[0].mac;
                DH_BDomain = GetListData[0].bindDomain;
				DH_Host = DH_BDomain.split(".")[0];

                await this.DH_PropObject(GetListData[0], DH_Did + ".general.", "Get listV2: ");

                SETURLData = {
                    did: DH_Did,
                    keys: "6.8",
                };
                var GetCloudRequestObjName = await this.DH_URLRequest(DH_URLPROP, SETURLData);
                var GetObjNameData = JSON.parse(JSON.stringify(GetCloudRequestObjName.data))[0].value;
                DH_filename = JSON.parse(GetObjNameData).obj_name;
                this.log.info("Fetching obj_name: " + DH_filename);
            }

			for (var [CPkey, CPvalue] of Object.entries(DreameStateCustomProperties)) {
				let Cpath = DH_Did + ".state." + CPvalue.replace(/\w\S*/g, function(CPName) {
                            return CPName.charAt(0).toUpperCase() + CPName.substr(1).toLowerCase();
                        }).replace(/\s/g, '');

				if (CPkey == "-1") {
					CPkey = -1;
				}
				await this.DH_getType(CPkey, Cpath);
				await this.DH_setState(Cpath, CPkey, true);
			}

			for (var [SPkey, SPvalue] of Object.entries(DreameStateProperties)) {
            // this.log.info('=====> ' + SPkey + " => " + ToFindVar);
	            var GetSIID = (SPkey.split("S")[1] ||"").split("P")[0];
				var GetPIID = SPkey.replace("S" + GetSIID + "P", "");
	            var GetSIIDPIID = GetSIID + "." + GetPIID;
                SETURLData = {
                    did: DH_Did,
					keys: GetSIIDPIID
                };

                try {
			        var GetCloudRequestDeviceData = await this.DH_URLRequest(DH_URLPROP, SETURLData);
				    var RetPointValue = JSON.parse(JSON.stringify(GetCloudRequestDeviceData.data))[0].value;

				    if (RetPointValue) {
					    //this.log.info("============Get " + SPvalue + " response: " + JSON.stringify(GetCloudRequestDeviceData));
                        let path = DH_Did + ".state." + SPvalue.replace(/\w\S*/g, function(SPName) {
                            return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                        }).replace(/\s/g, '');
						 this.log.info("Get and update " + SPvalue + " value to: " + JSON.stringify(RetPointValue));
                        if (path) {
                            if (Object.prototype.toString.call(RetPointValue).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                                RetPointValue = JSON.stringify(RetPointValue);
                            }
							RetPointValue = await this.DH_SetPropSPID(SPkey, RetPointValue)
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
            var GetCloudRequestOTCInfo = await this.DH_URLRequest(DH_URLOTCINF, SETURLData);
            await this.DH_PropObject(GetCloudRequestOTCInfo.data, DH_Did + ".general.", "Get OTCInfo: ");
            //return responseData;
        }).catch((error) => {
            this.log.warn('Unable to login to device over cloud: DH_CloudLogin | Login error response: ' + JSON.stringify(error));
            error.response && this.log.error('Login error response: ' + JSON.stringify(error.response.data));
            this.setState('info.connection', false, true);
        });
        await this.DH_RequestNewMap();
		//await this.DH_GetControl();


		for (var [SPkey, SPvalue] of Object.entries(DreameActionProperties)) {
            try {
                let path = DH_Did + ".control." + SPvalue.replace(/\w\S*/g, function(SPName) {
                    return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                }).replace(/\s/g, '');

                var RetPointValue = DreameActionParams[SPkey];
                if (path) {
					var GetobjExist = await this.getObjectAsync(path);
					if (!GetobjExist) {
						if (Object.prototype.toString.call(RetPointValue).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                            RetPointValue = JSON.stringify(RetPointValue);
						} else {
							RetPointValue = JSON.parse(RetPointValue);
						}
						await this.DH_getType(RetPointValue, path, SPkey);
						this.log.info("Set and update " + SPvalue + " value to: " + JSON.stringify(RetPointValue));
						await this.setState(path, RetPointValue, true);
					}
				}
            } catch (err) {
                this.log.warn('Setting "' + SPvalue + '" State failed: ' + err);
            }
        }
    }

    async DH_PropObject(InData, InPath, InLog) {
        for (var [key, value] of Object.entries(InData)) {
            var path = InPath + key;
            if (path) {
                if (value != null) {
                    if (typeof value === 'object') {
                        await this.DH_PropObject(value, path + ".", InLog);
                    }
                    if (Object.prototype.toString.call(value) !== '[object Object]') {
                        if (LogData) {
                            this.log.info(InLog + " Set " + path + " to " + value);
                        }
                        if (Object.prototype.toString.call(value).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                            value = JSON.stringify(value);
                        }
                        await this.DH_getType(value, path);
                        await this.DH_setState(path, value, true);

                    }
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
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Language": "en-US;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "User-Agent": DH_URLUSA,
                "Authorization": DH_URLAUTH,
                "Tenant-Id": DH_Tenant,
                "Content-Type": "application/json",
                "Dreame-Auth": DH_Auth,
            },
            data: SetData,
        }).then(async (response) => {
            if (LogData) {
                this.log.info(DHurl + " response: " + JSON.stringify(response.data));
            }
            return response.data;
        }).catch((error) => {
            this.log.warn(JSON.stringify(error));
        });
    }

	async DH_RequestNewMap() {
        try {
            var SETURLData = {
                did: DH_Did,
                model: DH_Model,
                filename: DH_filename,
                region: DH_Region
            };
            var GetCloudRequestMap = await this.DH_URLRequest(DH_URLDOWNURL, SETURLData);
            if (GetCloudRequestMap) {
                var RetFileData = await this.DH_getFile(GetCloudRequestMap.data);
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

                //await this.setState(In_path + 'map.CloudData', JSON.stringify(DH_Map), true);
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
                    var DH_CurMapOb = await this.getStateAsync(DH_Did + '.map.MapNumber');
                    DH_CurMap = DH_CurMapOb.val;
                    this.log.info(DreameInformation[UserLang][0] + DH_CurMap);
                } catch (error) {
                    this.log.warn(DreameInformation[UserLang][1] + error);
                    DH_CurMap = 0;
                }

                var DH_DecodeMap = "",
                    AddMapLevel = {}; //FoundedMap = false,
                for (var [MAkey, MAvalue] of Object.entries(RetFileData)) {
                    if (MAkey == "mapstr") { // && (FoundedMap == false)) {
                        for (var [MBkey, MBvalue] of Object.entries(MAvalue)) {
                            if (parseInt(MBkey) == DH_CurMap) {
                                DH_DecodeMap = JSON.stringify(RetFileData[MAkey][MBkey]["map"]).toString();
                                //FoundedMap = true;
                                //break;
                            }
                           // AddMapLevel[MBkey] = ": Map N' " + (parseInt(MBkey) + 1);
                        }
                    }
                    if (MAkey == "curr_id") {
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
                    var DH_input_Raw = DH_DecodeMap.replace(/-/g, '+').replace(/_/g, '/');
                    var DH_decode = zlib.inflateSync(Buffer.from(DH_input_Raw, 'base64')).toString()
                    var DH_jsondecode = DH_decode.toString().match(/[{\[]{1}([,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis);
                    var DH_jsonread = (_ => {
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
						DH_Map = DH_jsonread;
					}

                    //await this.setState(DH_Did + '.map.CloudData', JSON.stringify(DH_Map), true);
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
        const session = require('axios').create();
        let DH_Retries = 0;
        let DH_RetryCount = 2;
        let DH_FetchState = false;
        const now = Math.round(Date.now() / 1000);
        do {
            try {
                const response5 = await session.get(url, {
                    timeout: 3000
                });
                if (response5 && response5.status === 200) {
                    //this.log.info('5.1 get Map Data response: ' + JSON.stringify(response5.data));
                    return response5.data;
                    DH_FetchState = true;
                    break;
                }
            } catch (error) {
                this.log.warn(`Unable to get file at ${url}: ${error}`);
            }
            DH_Retries++;
        } while ((DH_Retries < DH_RetryCount) || (DH_FetchState == false));
        return null;
    }
    async DH_GenerateMap() {
		await this.DH_RequestNewMap()
		if (!DH_Map) {
			this.log.warn(DreameInformation[UserLang][3] + DH_CurMap + DreameInformation[UserLang][4]);
			return;
		}
        var canvas = createCanvas();
        var context = canvas.getContext("2d");
        canvas.height = 1024;
        canvas.width = 1024;
        var ExportHTML = '<html> <head> </head> <body>  <div id="Cam" class="CamPer">';
        var DH_FillRooms = false;
        var DH_RoomsNumberState = [];
        var rooms = DH_Map["walls_info"].storeys[0].rooms; //First Map
        //alert(JSON.stringify(rooms));
        var doors = DH_Map["walls_info"].storeys[0].doors;
        //alert(JSON.stringify(doors));
        var carpet = DH_Map["carpet_info"];
        //alert(JSON.stringify(carpet));
        var funiture = DH_Map["funiture_info"];
        var charger = DH_Map["charger"];
        var origin = DH_Map["origin"];
        //==================>Get Zero X and Y
        var costXMin = Number.POSITIVE_INFINITY,
            costXMax = Number.NEGATIVE_INFINITY,
            tmpcostXMin = 0,
            tmpcostXMax = 0,
            costYMin = Number.POSITIVE_INFINITY,
            costYMax = Number.NEGATIVE_INFINITY,
            tmpcostYMin = 0,
            tmpcostYMax = 0;
        for (var iRoom in rooms) {
            var walls = rooms[iRoom]["walls"];
            //this.log.info(JSON.stringify(walls));
            for (var iWall in walls) {
                //=======================Get X
                tmpcostXMin = walls[iWall]["beg_pt_x"];
                if (tmpcostXMin < costXMin) {
                    costXMin = tmpcostXMin;
                }
                tmpcostXMin = walls[iWall]["end_pt_x"];
                if (tmpcostXMin < costXMin) {
                    costXMin = tmpcostXMin;
                }
                tmpcostXMax = walls[iWall]["beg_pt_x"];
                if (tmpcostXMax > costXMax) {
                    costXMax = tmpcostXMax;
                }
                tmpcostXMax = walls[iWall]["end_pt_x"];
                if (tmpcostXMax > costXMax) {
                    costXMax = tmpcostXMax;
                }
                //=======================Get Y
                tmpcostYMin = walls[iWall]["beg_pt_y"];
                if (tmpcostYMin < costYMin) {
                    costYMin = tmpcostYMin;
                }
                tmpcostYMin = walls[iWall]["end_pt_y"];
                if (tmpcostYMin < costYMin) {
                    costYMin = tmpcostYMin;
                }
                tmpcostYMax = walls[iWall]["beg_pt_y"];
                if (tmpcostYMax > costYMax) {
                    costYMax = tmpcostYMax;
                }
                tmpcostYMax = walls[iWall]["end_pt_y"];
                if (tmpcostYMax > costYMax) {
                    costYMax = tmpcostYMax;
                }
            }
        }
        var ScaleXZero = (DH_ScaleValue / 10);
        var ScaleYZero = ((DH_ScaleValue / 10) - 0.5);
        origin[0] = 0 - (((canvas.width - Math.round(costXMax + costXMin)) + Math.round(costXMax)) * ScaleXZero);
        origin[1] = 0 - (((canvas.height - Math.round(costYMax + costYMin)) + Math.round(costYMax)) * ScaleYZero);
        if (LogData) {
            this.log.info("Max X Cordinate Segment " + (Math.round(costXMax) / DH_ScaleValue));
            this.log.info("Min X Cordinate Segment " + (Math.round(costXMin) / DH_ScaleValue));
            this.log.info("Max Y Cordinate Segment " + (Math.round(costYMax) / DH_ScaleValue));
            this.log.info("Min Y Cordinate Segment " + (Math.round(costYMin) / DH_ScaleValue));
            this.log.info("Zero X Cordinate Segment " + (origin[0] / DH_ScaleValue));
            this.log.info("Zero Y Cordinate Segment " + (origin[1] / DH_ScaleValue));
        }
        //==================>Create Wall Canvas
        var iWallcanvas = createCanvas(canvas.width, canvas.height);
        var Wallcontext = iWallcanvas.getContext("2d");
        Wallcontext.clearRect(0, 0, canvas.width, canvas.height);
        Wallcontext.fillStyle = WallColor;
        Wallcontext.lineWidth = WallLineWidth;
        Wallcontext.strokeStyle = WallStrokeColor;
        //==================>Split Rooms Canvas
        context.strokeStyle = RoomsStrokeColor;
        //==================>Draw graphics Wall
        var RoomsContext = [];
        context.lineWidth = RoomsLineWidth;
        for (var iRoom in rooms) {
            //==================>Declare Room State
            DH_RoomsNumberState.push(rooms[iRoom]["room_id"]);
            DH_RoomsNumberState[rooms[iRoom]["room_id"]] = 0;
            //<=====================Declare Room State
            //==================>Split Rooms Canvas
            var iRoomcanvas = createCanvas(canvas.width, canvas.height);
            var Tempcontext = iRoomcanvas.getContext("2d");
            Tempcontext.clearRect(0, 0, canvas.width, canvas.height);
            Tempcontext.lineWidth = 6;
            var iRoomID = rooms[iRoom]["room_id"];
            var NewColorSegment = await this.DH_hexToRgbA(ColorsItems[iRoomID]);
            Tempcontext.fillStyle = NewColorSegment.RGBA;
            //<==================End Split Rooms Canvas
            context.fillStyle = NewColorSegment.RGBA;
            var walls = rooms[iRoom]["walls"];
            context.beginPath();
            Wallcontext.beginPath();
            Tempcontext.beginPath();
            for (var iWall in walls) {
                var point1 = {
                    x: (walls[iWall]["beg_pt_x"] + (origin[0] * -1)) / DH_ScaleValue,
                    y: (walls[iWall]["beg_pt_y"] + (origin[1] * -1)) / DH_ScaleValue,
                };
                Wallcontext.lineTo(point1.x, point1.y);
                var point2 = {
                    x: (walls[iWall]["end_pt_x"] + (origin[0] * -1)) / DH_ScaleValue,
                    y: (walls[iWall]["end_pt_y"] + (origin[1] * -1)) / DH_ScaleValue,
                };
                //==================>Add Map Canvas
                context.lineTo(point2.x, point2.y);
                //==================>Add Wall Canvas
                Wallcontext.lineTo(point2.x, point2.y);
                //==================>Add Room Canvas
                Tempcontext.lineTo(point2.x, point2.y);
            }
            context.closePath()
            context.fill();
            Wallcontext.stroke();
            Wallcontext.closePath()
            Tempcontext.closePath()
            Tempcontext.fill();
            fullQuality = iRoomcanvas.toDataURL("image/png", 1.0);
            if (LogData) {
                this.log.info("Room N: " + iRoomID + ": " + fullQuality);
            }
            ExportHTML += ' <img id="Room' + iRoomID + '" class="DH_Mapimages"' + 'onclick="DH_SelectTheRoom(' + iRoomID + ')" src="' + fullQuality + '" >';
        }
        //Doors
        context.globalAlpha = 1.0;
        Wallcontext.fillStyle = DoorsColor;
        Wallcontext.lineWidth = DoorsLineWidth;
        Wallcontext.strokeStyle = DoorsStrokeColor;
        for (var iDoors in doors) {
            Wallcontext.beginPath();
            //context.beginPath();
            //alert(JSON.stringify(doors[iDoors]["beg_pt_x"]));
            var point1 = {
                x: (doors[iDoors]["beg_pt_x"] + (origin[0] * -1)) / DH_ScaleValue,
                y: (doors[iDoors]["beg_pt_y"] + (origin[1] * -1)) / DH_ScaleValue,
            };
            var point2 = {
                x: (doors[iDoors]["end_pt_x"] + (origin[0] * -1)) / DH_ScaleValue,
                y: (doors[iDoors]["end_pt_y"] + (origin[1] * -1)) / DH_ScaleValue,
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
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 0.1;
        context.fillStyle = CarpetColor;
        context.beginPath();
        context.lineWidth = CarpetLineWidth;
        context.strokeStyle = CarpetStrokeColor;
        //carpet Map
        var iCarpetMapcanvas = createCanvas(canvas.width, canvas.height);
        var iCarpetMapcontext = iCarpetMapcanvas.getContext("2d");
        for (var icarpet in carpet) {
            var iCarpetcanvas = createCanvas(canvas.width, canvas.height);
            var Tempcontext = iCarpetcanvas.getContext("2d");
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
            var iCarpetID = parseInt(icarpet);
            var NewColorCarpet = await this.DH_hexToRgbA(ColorsCarpet[iCarpetID]);
            iCarpetMapcontext.fillStyle = NewColorCarpet.RGBA;

            iCarpetMapcontext.rect(((carpet[icarpet][0]) + (origin[0] * -1)) / DH_ScaleValue, ((carpet[icarpet][1]) + (origin[1] * -1)) / DH_ScaleValue,
                (Math.max(carpet[icarpet][0], carpet[icarpet][2]) - Math.min(carpet[icarpet][0], carpet[icarpet][2])) / DH_ScaleValue, (carpet[icarpet][3] - carpet[icarpet][1]) / DH_ScaleValue);
            //iCarpetMapcontext.stroke();
            iCarpetMapcontext.fill();
            iCarpetMapcontext.closePath();

            fullQuality = iCarpetcanvas.toDataURL("image/png", 1.0);
            if (LogData) {
                this.log.info("Carpet N': " + carpet[icarpet][4] + ": " + fullQuality);
            }
            ExportHTML += ' <img id="Carpet' + icarpet + '" class="DH_Carpetimages"' + 'onclick="DH_SelectTheCarpet(' + icarpet + ')" src="' + fullQuality + '" >';
        }
        fullQuality = iCarpetMapcanvas.toDataURL("image/png", 1.0);
        if (LogData) {
            this.log.info("Carpet Map: " + fullQuality);
        }
        ExportHTML += ' <img id="CarpetMap" class="DH_CarpetMap" src="' + fullQuality + '" >';

        fullQuality = canvas.toDataURL("image/png", 1.0);
        if (LogData) {
            this.log.info("BG: " + fullQuality);
        }
        ExportHTML += ' <img id="BG" class="DH_BGMapimages" src="' + fullQuality + '" >';
        fullQuality = iWallcanvas.toDataURL("image/png", 1.0);
        if (LogData) {
            this.log.info("Walls: " + fullQuality);
        }
        ExportHTML += ' <img id="Walls" class="DH_Wallapimages" src="' + fullQuality + '" >' +
            ' <canvas id="DHMapcanvas" width="1024" height="1024" class="MapDHcanvas" onclick="DH_SelectTheRoom(1)"></canvas>' +
            ' <canvas id="DHRobotcanvas" width="1024" height="1024" class="RobotDHcanvas" onclick="DH_SelectTheRoom(1)"></canvas>' +
            ' </div>' +
            ' <div id="Control" class="CommandPer">' +
            ' <img id="DreameRotate" class="MapRotate" onclick="DH_RotateMap()" src="data:image/png;base64,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">' +
            ' <img id="DreameCarpet" class="MapCarpet" onclick="DH_Carpet()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAXEgAAFxIBZ5/SUgAAQMxJREFUeJztXQeYVdXVfdJ7lya9DWVAQGAApVcLIEWlCYiKwqggVUTFgqigRqNGo7HEEjVqEjWWJArGGGP5jcaeqGjUmCiJGkssqPs/a+9zzt33vjcFgXlvZs76vv29KW/u3HfvWXfXs3cqFRAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEJALIKIqRuobaWWki5EBRkYaGWdklJECI3lG2hhpZKRqts85IGCPwizyGpYQhxi5yMgDRl4x8pGRz438z8gX9hXf/9fIW0YeNXKZkZlG2uE42f4sAQG7BWYxVzPSy8hJRn5j5F9GvqHvh2+NfGiJtdRqnirZ/owBATsNs3BrGxli5BIjr1rN8J1e7W+++Sa999579Nprr9HTTz9NW7dupd/99ne0ZcsWeuKJJ+jVV1+ld955h1544YUkUb6zWuYvRtYY6RZMsIByAbNQ9zLSx8gN9mkfIwUW/69//Wu6cPOF1LZtG6pataqXKlXMa5Uq5jWSvarsRQ0aNKD169fTrbfeSg899FAmrQICLgIps/35AwIywhKjs5ErjGzXK/iTTz6hyy67jAoLC6l69eos1SDV7NfVqikxJKmmSMPEiRPm+OOPZ5IlsMPIfUb2D2ZXQE4B5o2R0Ub+ZBeqPNq//ZZuuOEG6t+/P9WsWZNq1KzBr/x1jRpUvUZ1kepxiRFGaZiqVRRZ9qpCCxYsoD/+8Y9JbfISiTNfPdvXJSDAOeGzjPxDr9Q77riDhg0bRrVq1SpSatas5QkjUoOJU6N6jYgw1eKEyUSWk08+mT7++OOY0jJyXDC5ArIKkvzEOUY+dSvzgw8+oF75+VSndh2qDalT27wWLTHSxMhipAY0jdIumijKDKtatQrlm/+ZcOYRJj7fSJ1sX6eASgiSfMaPSKJJjBdffJFaNG9O9erVpbp16/pXJ3UgdeqkiyYMXmNapmbcLHPaRWkWR5RGDRvRY489pkkCtbIqmFsBZQqz4NobeZBUPmPDhg3UsmVLql+/fkapV78e1a8nUk9JXQgTKCJM7TpW+yS0TM1aNb0vI2SJ+yyOKMtOXqZJAu12aHDcA/Y4SMpDDjLyMqnw7eGHH86h2AYNGsprQ/V1RslAoHr1I+LUrZcgTGaiiFapmWaCgSQPPPCAJsk2IyOyff0CKjBIykRmG3lDr7xp06ZRo0aNipWGkIYNzdcN+dVJg4ZJEmnSWA0DstSpm2aOJf2WmEapLkRBAtICZL7HSONsX8eACgg4ukZWktRGMZDh7tWzFzVu0oSalEYaN6HGLI2pMROncZxEjjRK83iyaJPM+THOb0n4K9pPadWqFf373/92p/wlSXnKXtm+ngEVCNYZv5FUfgPOeNu2balp06YxadasmXk1Yl6bsZif4XfNmqa9N0mgiDiRxmnYMJ0s9eoniFLH+iq1nFaJ/BSQZMniJVrhIRTdOdvXNKACgCQz3t3Ir4x87VbYww8/TM32bkZ7s+y909IM4gnUzJIqnTiNG2fSLgmysFZBdEwRpXY8x1LdaBScszK11lKoBg7YVZhFNNTI89oZX7ZsKTVv3pxatIC0SEhLatES0kJE/zz53uYtaG9znObNFXEcWZplIkvjOFmsGRYnSr24RrF+Ckhy1FFHaS2CTHv3bF/fgHIK64wvMPKuXlWTJ0/hMK6XVi3Zxt9p0cdQRGoOMaSJNI3VMJos8GGs79KwYSOvVepbsrgIWB3j1Ne2RBFHvpau3UJoenW2r3NAOYRZOA2xeIx84FYTCg1HjhjpF3jr1q297LPPPkbca/HSGu9rvY/6+1Ys7riONE7jxMjSbO/IFGvSNK5VYkSJNIrzUZw2OfbYYzXfsS+lbravd0A5Asn2V2TGv3Kr6LnnnqN27drJ4rYLvU0bSBsuVYejnibt9Pft0n7fBmL+vs0+bSLyKOLECJORLBIEcFoFkbGkn6IjX9rsUrmR943kZfuaB5QDWGe8t5GHSGXG4dgKISIigCxe2kPaU/udkXbt48dwBGoD4oAwbSxhFFlatrKaRUyxvS1ZkuaX0yhJZ15rk6uuusp9PDwECrN97QNyHCSZ8RFGniQpFWecvHy51wZYyFjY0ULvQB06WOnYgTp27EgdO3WkTh07mddO1MkKvu5oftYJv7fi/w5ijuOOCaI50jgylkQWTRQOLTuiNIoTRcwu0Sao+lXRrJ9S2IUYUBRIytSnG/m7XzXffUdTpkwRUphF2wFiFnPHDkIEt/g7de5EnTt3TkgX6tLFiHu1gp935tfovfj7GJGSpLGaRrSLNsWEKC1bRURpHtMozeJml5EGyuwCSf7w6KPu4z5FodI3IBOsv3E6yb4JxocffkgjR470T3hNCLew9cLv2qUrde0q0q1bN//arZv5WTf1NX7eNXpvF0iMQJY0jjBK07S3mqWtJUsbpVXSiaJ8lCLMLpAEn9MCKfYm2b4XATkGsyhakDRS+MytlDfeeIP69u3rSZEkhFvc0cLPozxIXh517969VJKXh1f5GzlGN08sFkUYp2EcWdobcWZYW+vka6Kw6WVDxS7qhXwKk6RJkxhJ8Fkt0ESiS7bvR0AOgaQJ2y2kMuMPPvigkMISQ0jRVWmEbnEi9OhOPXr08NKzZ89SSw+I+9vuPaJjKtKkkaVTZ/Zl0rRKBqJkMrsibSIm15NPPqkd9SHZvicBOQAbqRpo5BlSmfGlS5daUhjp2iVGiu55jhBxIqBAsVcvK/n5lN87n3qb1969exch+Sz5+b0pv1e+/9uePXtFxLH/w2mapHZhP8aaYR07phNlHxCldUQUzug3b5HR5PrDH/6gCTIy2/cmIMsgyYwfZuSvpLBw4UJ2njUx8iwpeMH2FFK4BZ3PZHCLvg/16eNkX9rXvO67774liP6biEA4bkSaSMtozaJ9F0cUMb3ax4mSQZsg2oWsvCtfUU0eQJDh2b4/AVmEWQA1jRxD0s1QDO8vvqBDJk2yPoX4E0KK7l5TMCGMyNO/t1/Y0WLvyz4LS79+1K9UEv3Nvn0VceyxnbaJkYWJImTBeeJ8ERzo3KVznCgxs0uy+62YKJKZ1ybXM8884y4Fyt8HZfseBWQJJGUjl5LKjL/++uu0X//+HFViM8ppix7G1OnV02sKRwq3iGVhy0LvDzHH6L/ffrSfkgEDBnjZT33N3yfei7/v11+O50lj/k8fSIIsYoZFJpholG4+hKx9FE+UNgltApJYB/6tt97STnqnbN+ngDKG9TfQivNOTY5nn3028i8sMXr2gE/Rk30DIUVvNoUcKdzTHws6ToSBNHCgkkEDadCgQUUKfj9w4CD//og8ljQgDJOlnyfLvsZ0621NMZwfE6VHzwRRMphdJZhcIcxbiUGSGe9rZAupzPjGjRs5EgUfowfI0TNJjIgUffv1jZECC3kgxCzsQQPtoi8YRAUFBTS4YDANHqxkiLwOGTyEhpivhwwxr4Pj78HfFXjiDIoRhrWLEUdMr1msVsln86unj4LlaR+li9MmHTnh2K5de5+Rb22I4kiiup78mULBYuUBSWYce8Z9ZhyYM2dOXGtYHyNJjDRS2Ke9EKLAL3Be9JChQ2mol/1p//2LEv0+I0OG+mPwMc2xBw0qEMKALJYw3hTLQJS4j1KyNkE4GCQ55ZRT9KVBuLtatu9bQBmAJDN+Kqky9W+++YamT5sukSlNDONjsCnVRxGjX5wYYhoVWG0gpHAL3C38Aw44wAs6KIoMp2HDh9PwYRDz/XD3c/Me9X53DHdMIYwQENppkNIscaKIT+RML0cUDg93t9oETnxGkrSl6667TkewTsz2fQsoA5gbvbeRDaQauGFsABZS0VrDOt3904mBJ/rgIREpoAE8IXjRm8XPMoJGjFAycgSXqiRlBGTESP++4SPc3w8zxxyWRhjRLEOoYHBBRqIgaoYoWKRN8jNqE08SY3I5kqjOi3BE+mf73gXsYZB0U7+fVJk6xgN0yxOTih1bRKYQrk2YU+nEgA8xhE2g/YdGpIAG0IRwC3/UqFFWRtNoyGgrYyIZM2YMjbE/j94/So5hSTMcYo6P/+PIwkSBDBYzLEmUmNnVuw/nZ3r1jLSJN7lQMmP9Evzfjz76yF0mOCINsn3/AvYQrL+BNv/PaHKsXLkyRg6tNfqaxdSvL/wMRI4yaQwQA09y0RRYtCMUKUZZUowePUYWvpGxY8d6GTcOMs6K+lq9B+L+VpOGNY3SLpFWAVGso19giTJgIEe/+u9nzK6ifBOQJE87753olltu8dankbMptP+pmCAZNTCNpPmAx5FHHik1UwmTCom4NK2BsKyx9cXpFj/gACbGAUIMpynsAoYWcISISDCOxo8fT+MnjKcJ5nXChAnFiLxnvBVHIk0YaKIYWUAUr1WGeqe+gLXJoIzaJE4SiXKBJPh/SnvATwsZ9IoIc2NrGUEoxt9t7Bk/8MADubrW+RucBVcmVf/+/Xz+Ak/hgsHaxxBTShMjIyns4naLfuLEifx/nRx00EGZRb1nIsT8nTsGE2acEMaRxWmWGFGMrxL3UUSbIOIFbQhfKiJJHxXlMs67MbcwmUrhJxTCuxUPJNNdL9bO+LZt29hUwpNSO+OS8HPk6B/3NSw5iiMGkwKiSBERIlr8Bx98MMshh0AOKVIOPuRg/96DIOZvPWkmRmQZNx4mmSHLmLHGhxmTgShiesE/cREv55v0VyRhvyQ/ct6feuopd8lQ4j88mFcVDCTd1G8nlRnfsuVhKTLkUnRHjsgZd/4GFg9rDbOYtNZA2HU4R5+cbwFijGHTZ/x4MZ8mmMUr2gFiyXCwkGHSpEk0afJkmqwEuxHTJfr9pEkQRRxHFksY/L8J4w1ZxlmijI00ikTDhrMZ6LUJol0FEu1ik8tFuRxJbIQL9WckVczo2hCG6lQUWH9jgJEXSZWpwxkHOfJsoWGkOaxZxf6GaA5kvwsKIpOKI1MxrRE3pcaz+TPRm01CikO4wHHypDgRDj30UJapkKlTixT3Poj7WybMZEMypWGcZplo/RZteo0aHWmTYcOtb6JMroGD4n6JOO8SBr7rrrtw2bAH5nKSYZ9JOa6InyffU9L7SvOePfX/0NcIk766UmXYa09Spj6PZIKrx/z587lE3WXHYw45NAcSf/tFmmPw4II0k2qkWWSsNcaMjohhTakYMVhTRKTgRT5VyDBt6jTu7D5t+jSaPn06zZhhhF9nsEyfbl6t4Pf8Xoj5OyaNJY4mS0yrQKM408sRZbQhykgQJWFyDRnCftUg57wbzQkN6hz3888/312+HZYoFVVgfqOSAlG6htlew3sMJM74iaTK1L/88kt+issW2CLI0TceqUr6GzBRvK8xZkyMGPAxYsQwC3ayMY8OPVSIwaQwCxzZ+emWBDMOm0GHHXYYC2aEZBT7eyeOQI4wXsNMMWSZbMgyKU6UiZooTptY3wRhYU0S1iSWJDoMjOuDYs1KBBAFXbsrniYxH6olyZ5x300dGWAQwu0Pz3MZcpfn2LdPzCHPqDkSJpUjx0SnNSwxsEDhN0xhUkBAimmiDWbMiJHhiCOOYJl5xEyaOdPIrFk0i19n0izIzFnm53jPTP9e+duILCDbdCbLVNZOU5gok9nHwfl4s8sQ2GkTTRLkamIksfkSIcl+1nHv4zXJ7bffznLbbbdxdAuCHImTm2+6mW666SaWG2+8kX7605+yXH/99Vyq4l6vu+5auvbaa+knkJ/8hK655hq6+uqrY/LjH/84o6A/V1G/0+8p6X36Pfh/P/vZzzRJ/mmkVbbX824DSZl6L5JBL94Zf/zxx7m3FEonxCnvxuFLDufm2yQg5zkcOQZymUZEDkn6YTGxIz7GmVSGGBMjc2rSIZO8KSU+BUynaYoUh3lSzDQLf5Yhw+xZs2n27EhQGDln9hz/OnsOJPr9rFmz+e9AICHLETGyeI0yNTK94tpkIudT2OSyIWHvlwzLTBKXJ+Fkoo9sSfjXl6T4chRs33Ul8nZHIjZa2XZCrvlD1JCuTqxJthsHV7VqNapStQrttRdkL8LtLSv5/e9/75YOTK5+ZbR89ywoKlN/glSZ+rp167jgDl0+oD1ifkd+L47UOL8DphVCngWDhBxDtc/hyGH9De1rOHNqCptTkSmltYWQYqaQQpPByNy5c70gWZmUuRD3Hvs3s0EeRxalWdKI4nwUo00OPviQmG/i/JKIJGJuDbVJRUS3OATskok2457fK16S4iqAXWGj20eCHYkoj8duRL+vHW2EVAuhuvVc/99asSlXbgwcRlSXNUEeeeQRTZC+ZbSE9xxIykbmGvFb3QAsELS7kTY81rSy+Y64U97Xk4NNKybH0Dg5Rgk5xmtyOJPKOeDmqT3NmVKKGDCZZilS8EK3i3+ekfnz5nHgQGSBvC4wrwvm04IFC/zv5s2DzLPEEcIIWWbz8UFATZTpiigxbXLQwekkMdrkiiuuoHvvvZebMjz66KP0e4h5mmLBQLZu3cqyZcsWbqsKQd3a7373Oy+//e1v6Te/+Q0Lur08+OAD3M8Xcv/997Pcd999LOgWD8H/hNxzzz1e7r77bi+/+tWvdllg+p122mncQjVVDDkKCwv1EnrTSIssLu1dB0mZ+jpSZeo7duzghcCdDTtY06qL3SLrMuXKtPLhXJsEdKFcTY4xaZojTg7WGsqcOuKIw/nJ7jSGIwaTQhECBDhqwVE8fwOycKERfl1ovl/of85i3of3L1jgCCNkiRHF/D/nryS1SZwkkSbBe15++eXSOq/lGn/5y1+KJAk0mAISP2BL+XXSSRq4bbQfhoHRZlD5KM3GrjhoD7Tk6eaiVlZ79GHtIfVVA5xpxeQQvwOl5CNsKNc55I4cB1uzCovNmVTwNbQ5VRwxmBSWBJCjj4YcQ8ccU4yY3x+98Gj/N/h7rV0yE0W0CSJl06ZP9yaXJgnI8+67sTEmME+/qaDCeTBoklQGcqhmFHjffVSeB5aak+9CMqPCV+JCpcP2hQ0M7dFRO+bduolp1TOKWkWm1QDe8aed8jRyGMc2aVZhsSEnMX3G9Igc1s+YYxapI4YzmY46aoHXDo4QmLkBWbRoUYmC9znCHG1EyCLaZYExzWCCRURx/slMZXIZkkyLSIL3qgYMAELi6OAypQIKdoq+gg8JcyuVIEhipyTyZuWzYyRFzjj2Q3tnfEnhEo6cYGsoa48OTnt04XafsvHJOuZcup4M6aabVlJTJaHcA22OI11zCDmOOPwIjixFWgMaQ8ixwBDjqIVCDCbFMYYQihTHHXccHQ85/vhi5Dh+H4T/joklZFloNAubY1ajzDtyHvs4TpvgvBDtEpNLNAlI9K9//UsviveMTMX1zfY93t2wawYTvz7HB0WYOaXIgYeoAqwRJJfLX60ZiTN+uHsSOEybNp0bCsS1RwffBtRpD7Tl0dly55gP1qbVsOG8EWn06FESseIkoE0AenKIzzHDkYMdcWtSKa2hTSmnLWKkMAt/8WLIElqyZAkVGgHRC5cUsrOIV/w8ksX8fvwdkwVaRWkWbXrNc2bXnLnW5Ir8Emi3hFn1tpGZVJ7t7WJAUmr0jvuwq1evjhHk/fffd7/CAxcDkMpfrRlOmmRGtx/aDWccuQiEEnmcWZt9eCITugX6yJXVHq4QMT3nIVEr1CQN40x5EX6HMa0mcyhXyIFsuGiOw73mQAjWkwNa4yiYUkcbjXGMeeIv4gV93HFCCrfomQgnFNIJJ5zg5cQTTqQTTzzRfH1i7OeFkEKQppBHMx9//GI+3qLjLFHY9DJ+ivm/zj/RJMF5wpdJmFW4npOogjZfIOlt5sdiPf300xxGTllyIEqmACekTbbPeadBsmd8M0knPwb2jENDIBElc//24TkYcfPK+R7duY9tJu3BjvkQmFb7R1ErW1813vsdB0kSkBOAUbQKtr1zxrEII3Kkaw2nMZKkABEgJ514Ep209CTu9ZtJTjrJ/P4kRxxDmMITROMsWeI1yqI0bRInCcj6z3/+Uy8IfDO9AmuO6iRBHK6oQEUy7n3KkgNmpsJ2I6PLnWlF4oz/klQ3dcTmkXhqvndzbtnfyg7DzOScI++BroKuUhddPbTv4Rxz7OeOtIeEdFFCkvQ7XAIQ5EDeIak5kiYVtIaYUouN+WRIATlRiIFFj8W/bNmySE4+mac4OVm27OTY74UsS4VYTJRCPu7ixY4o6SaXO69333lHLwjYWHMqMDlQVTHRyH/cB8Y9S2UO6YJA6GhTfvwvEseqn5HnSJWpY9EgIwuCQHs486qNIQhPdVLOuc6a53OrnqgYkbWHLWE/YH+tPex+jgnjvWk1SZtW02dEfgeiVTFyLPDkWLTo2DSt4TTGUqMpli2VBe+IsHz58khWLKcVK1aYVyv25xFplvHfn7R0qdcoYnpF2uTYRRFJQKKEWYVFM7WimlWA+WwdjfzFfeCLL764uJAu5luXn8pdEmccTuNr+q6i+A5zvkEQ1Pc482ofQxDWHta88onBjFnzfhkjV057oD5pPGuPKGo1RWkPF84Vcsy20ar5HEHy5DjWkWMxL9oTjDmFp73WGI4UK5avYDKsXLGS96isWrUqXVauohXmdysUYRxRli4T84uJkiAJ/B4Q57333tOXEaGrIyqq5gBIKrmvdQ/Wd4zmxPpIZQ7pbjPSK9vnXGqQOONrtWr8+uuv+emOQjcUvEF7gCAtHUGKMK8wn8MRxDnnMK/QBlTnPeJh3bEJx3wyl5FnNK2MDYtSkQUxcsT9DSxaNqeYGEsjYpiFvkIRApEVkTW0Zs1qI2v4e3ztfufeu9KRRRHFkaTQ+iYgJ8y6d+Jm1T9IQpgVmRzYIIfNT35bNe5pypIDloXCZ/Z6lA/TiiQzvomUv/HSSy9Ra0MCVIBi+qojCArg2Lwyv8PcPVSRFmVeOe3RNy20G9ceY8bayNVE7XtMiec7MppWR3H0SPscojmcSaW0hjWfoBVWr3KEgJzCTzYvaxPfn7LGk2b1aiFKkiRLlcmFnyfMKjR6m1GRzSrAfL7BpEK6uC4pFdL94ANfkQTtgpBujSyfculgTjTPyIOk9nCgoA0l0aj8ZII0bmz9j715+pH3P9q0jaJXqmpXtEfPzObVkMHeOcfuQFep6yJX4ntAe0yhach5eO0RZcnnz5/H9VHQHpz80+SwmkOTY4UhhzOjRDussYt/La09dS2deuqpVtbRunWnqu9PpbVr13qyOKI4bbLcmGmaJPg6YVZhVcyuyJoDMJ+vqZE/OdMKg35Sihy/+MUv9DXBHLm2WT7lkmFV4iAjz5NyxhGSRFEZSqJBEJhXGCaZ7n+IeYUBlR076OhVunmFhgQD2DkflG5e6bzHQQdylxEXuYprj9mR9kAi0EesxLSCWVPozCpj9mjNISaSmE2nrBEtwQQwZEBZ/mmQ007LIOv49+scWU4Rsqwx2kdIsorJt/zk5fz/EmYVQrlHVQJy1CHZJstr6NNPP+UHY8qSA1o/8cAYle1zLhEk/gZswFg39bHjxvIegXr14gSBeYXJq8X5H12c/xGLXvXhraOZzKvhKjGI/lIutItGCC5ylcn3EO0hvofkOsTvKHSmFRxy63OISbUypjUiTWFJcfrpdLqXM+gM83pG7Gen8/vwfvnbtXFtYo6P79988019KdH7Cw559Wzf6z0JkpDuLGtGMuAzpiw5sJYwv94C5jvGd+e2qUky2mwzqQZun3/+OTcNqFWrtiVIPSGIMa9iDrr1PxxB2qnsuZhXXdP8D1e1O2iQIojNffi9Hsq8QtY8mffQvgeKA3VIF7VUYlpFfodzyNmsMn6DJocjhlv8Z5xxBq1fD1lPZ64/k1/XnymvZ0DM7z1R1kVEcSTB6z/+8Q9Nju1UwR1yB5IuJL6rNq5RSpHjueee09flV5TrPYVJelRdR8oZ//Of/2zI0IBq1qzFWzA1QRpagjRt0jRGECkvSS9OZP+je9H+R2ReDfM7BdFDykWvIvNqKpeJO/PKR67mzfORKxQMesfc5jqQyIOpI9Eq8TkicqyNkYOJcYYhhSED5KyzzkoT9ztNlEibiCZ5++239SJAKPfYnH9K7gaYz1iXZBIYF64+//zzvG5SliC4RgoI6fbO9jkXC3OC/Y38jpS/gSchPlSNmjWoVoIgzkFv1LiR+B+IYOkEYZIgXNqeF/c/9t3Xhneln25x/ofPfUyJolfY883m1ZzZdORcFbk62kauoD0WL+EQK7SHdsqdQ44o1Nq1p6aT48z1nhhnn322l3PU12dBHFESJIGGSZhVH5NkyCu0WQWQlJIs0g9a3M+UJQfWhMJn9rrkZkiXxBkfS5L882Xq6LSB/ccoIEOGE5v3mSBw0C1BGjVSESznoDuCsIMeJQjR70pvq9W7BkEQ7LMeiuy561LiChPHj+Nz4ejVpEM4eoW9E0WaV4YgYl7Fw7onLY20x8qVKzgky9oDDjmccUUOIYaRs4Uc55xzjpUNtGED5Bz/MyaL0iiOJIloFQoPF1YGzQGQ1E55/zUZ0lXXBuvtGiO1snzKmUESYTie1LbYr776ih1mbMzPRBCOYNWrbzVII97sLxokPYIlW2s7RAnC7nkyXFNV7xaX/3D+x0RVWuL9j8NmxKNXyrw6xmXMFx/vI1fO90CGPNIekd8RkWO91xrnnHM2bTAkOPfcc5VspI32a0eWs8+xGsX8HTRPwqz6wF7jCu9zAOZzNjey1X34ZEgXe98VHqdcbd9DUm6MHlWfuLNFRSnMIXSsKA1BGqkcSCzEW1QGPVl/lSlBOMwSJEP+IypM1P7HLIlezZNSdmx/jcyrxVJO4s0rmwy0vsdaQxCEaJ1pxY64N6vOMeTYwETAoFCW886j84xs3HiefK+IAjJBoySSgP81cmRlMKsAko6Zvu8Z9nPg3qcsOWD+KiCyNS7b55wR5sRgBN5FKvmHjhn4FVq5lESQej7E21BCvKUiiM6g56vy9gHcexYEwawMV73rEoRo+CwEsZW7Uw/lZmzoaniED+9G/scxNnMeM69s3oPNqxVRWHet0x6GIJFpZbXHhnM8Oc6DGGKcf/553KDt/PPO5+/PO0+Ig/fB/EpEq7AAKoVDDpCEdLF/xZeSwF9MZa7ShW+yKue0qv0Qw4w8SsoZxwJK2Q9SLEHq1M6YA2lWHEE6deQNUt0UQfL1/g8fwRKCDFcEQfWudtAnT4l2DB5+2OHc2TCdIBn8D02QlUWYV057WJ/j3HM3sIZgIoAURi644AIr8j0EWuVcQ5KEWYVQbmFlIQdAUYU3A9cpVXSV7r2Ua40XrPoDw2N7OhElSikbsWiCGAe9tgrxZkgStmjRUhGkHRMEnf3QvaRrhhqsKAeiIljDVIg3EcGKCGId9Jmq9mrB/CIcdJ37WEEr2f+I8h4+crVe+x5Ke5x3nifHpk2bWC6AmO/xc/w+YVbBZIUtUT5qiXYDSFo83eYeupjtgmhmKnOV7utGemb7nGMwJ1TPyEpSGc0PP/yQF2wq0UVCEwSLD4sF2x/Rt+jvf/87+ynbt2+n//znP1xgBrPitdde481S6OOKi8EEaecI4ho0ZCbIfsXlQHyJSTzEq+uvZiuCoAGDJkhRDvoaR5B1QpAzTpewbpIgTA5jTl1wviGHIcTmzZu9bLpASJIwq5BcXVzJNAeskuVkWzyhwht5rZRdT/AxFWB+5VbjBZJtsUj+fe7OMslwJyAFFhAaGCcKyHYKiFygM98ll1zCkapis+gZdhBKDiRdgyQJEgvxQoP4DHpmgixPc9Al9xHzPxC52rBBolUbxe9w2gPEuPDCC4UgmzfxA0MBodyTKiE5UKW73V0E+H8ptaYQFbVAG6jLKFdCuiQ7/9AwGj2qvL+BVpOpBDFgHsGcePLJJzOtd8Sq8SmR0MHjEvkSDL1BESPa/sG+wJPzS1K9sBygXUA4+BWlIUjmIsWiNUisvD1BEOeDaBNrVREm1nplYiF0e+5GY2IZJxwa5Hz2OzbFNEii+8inJH2rKo1ZBZjP29bIb91FQHtT3a8XD0mFPxhpne1zZlhmH0qJSlw8YVOKGMh2X3TRRbyIE8Df/Md++DPssfYlKUVpRaKVUMKMmHcbkpJ4JBsx9+NWS6Rv9QFhmqHVPhZ+RoIMthpEbZJyZSZFaRBk0XUFb9IHKSyMCII95CuKI8gZpfNBNhvJkCE/gSqR5gBIsuWXko2EokoX99QRBA8sBeSCUKmRfdOKxN9ABGW7PkPkGFKKHFg0icgLSAFNgL0fC+2ir/89/n9NS6TDSGpxtmuSoikantaRD7Kf3WYbN7Ews3yc3UV4ENdhWYIcOpWbrCEP4qp40TC62CiWyqKvWrUyFsVCyboQxJpZZ5/FBNmwweU/ovAuolcZ9pCjpKJS5DkcSB7A6IPmfVo8xFzHd5jvqkoXlscayoVSEvtEP88+1RjQDjChUpYYSAQ+9thjlACIgQkl0BR77w6m24vYiKSDxQ32f/irhtkgcYIM5s7tkgcZGSUKJ2TIg3Ch4uHcDJoJMneuqsM6plR5kFOMH3KqqsFiP2T9mZm1yEZJECYeKEgCwjmtuet3rnyBJI/2srufuF5uJAKimPBx1UMXFsXe2T5n9+S+ilSPKrTGTymtAT8g0dYS6vGPRg7ckzeaJMQ8gWRXmfdTQF4QYpDKpA/LUGpSfCZdVfImMum8Scptr/WFiitUFe/atFDvmWdKXZWUmUSZ9Ndff11fNzwVl1U2zQGQVGBc6S4Eus8jUewIAlNU4Q3KhSpdkm4R2GziqycRwUkpcmAxKYDZ8BMwRbRJGZ7n3vap6xs//Pe//2WforharAMz1GIdNsPuJLT9r9D3Vpe6LyqyFivdzJJkYYZsOgoSjcO+bdsb+tpBEy6ppORAYSsy4D5bjnvjhuqgCFUBgQvk3bLrd9iTRhc+3/oT4c+UIgeetgp4gqNIbEw2bjKJpkProL+SMrngN6APLzopYjZf1GZ0vAzhRBfFSdIHa9rOhHqX2L0gSyMza0WimnfdulNjpe6eJGednXTIkQRcTbkSqixjmM9dYLUCA5paT5366CO/xw5Rz6spF8xPcxJ9SKJVDOQvUoocMEsSmuMOI92yfM7wT4aTKk34+OOPWSOUfj+Iy6an12NJJ5NFvmDRaZFlS6Ottr7kBDmRtRk2Sxl/5K9//au+dsgjQftVqlCuA4k/+Qf3UMNICz2WDZOrFDArrX22z9nt2kLUiUOq6IuL0o+UJQfMEgX4Jj+k77Gt0S5ohPUQIUNnPDRzGEVS14WRB5heCzOv1OrUHrMHqVA0FiQ0h549GN9RGC9YLHZH4TGyH32xNbPQVnSp1iIxXyR9u22CHAh6nFiJyYF1ttGts88++4wrsJkghhzQJApoRnFAts/ZmVaYrcAp/m+//ZY3HaUsOZCUU4DKw8aURjv5P6pbQmDj/cX2yYAhJmjPAW8fO1/esov8RpIoWKnND0uSEaQ6NaKq2O1JHzW6JD9kBo9US5pZ6N7uzKzjXIvREzLtSTemVoZtt4m8EMyqtTvzuSoS7D06jNRce3SurGUHe2JXaWKdrciJBwnJhnh/J5OzFVBrZeFCbaUeemjJ19M+Nd4mNbq5BCC6Axu91LanvQHYM+ENWDjI4qiLmTV+vGpYPemQRD/eRFeTefOVs57eME63/GFTa1W8qwka4inAGV2TEzc8SyAJ6XpTGJXLKFxFAWujho24Rk+tM4wzqJPtc3Zh04vtSaXNVlApfvweodVSpfjtYsUFQWe790k50cALL7zATiv+H4oTUXOFzfjb3tim34Yn7k5thCExz9DFm1U44ujQGJJRH+PL3rkvVizcG5lZs2brrbdR0vDYRem+iG8atzzeTTFBDpfnqMzkgEn9S1ImPJKAbnY6fDUF1LPnZ/ucGeZE9ifpBMHQG+ITKX5U08FPKNE3IDGnUC4CR2yHPshtt91GZ515Fncu4U1TicYNaEiNUcOKlAg579RmGJISFv+kcvVbmVr/TJokfXmnxlr/xHtjLYj1xiqus+JybuKAm68ATXgalceJRrsJdj2gosLn1TCLBfcfBEEzwMRDMTdGNpAUIf6EbMLtmmuuifkdyrTCBytVip/EpEJOJFaBd9ddd7HDnNa4wRGkftTZBOUjCujju1O1SSTa6wi7ODkBhcYNyalSurM7j3jWWiRTb17b4QTTnvzIgxPiJLnxxhv1ucOngzarlD6Hg/n8B5DMI2fAN8N9dwRRVQV4IF6aMw8TcyLdyOY8EBpFdWzKEuTHP/6xvtG3G2laiuOhiyIcK18Oj8LCzp07UZWqVahatapUzRAEDhkcs2RvLDSPQwM2nIsFtA82DO10gogkWuJ39f/oRz9S0ayxPNYt3t19StHd3W1Eyznsxx4bzQUpVJrkL/HmZZ/aa5H9+H0WQRKV/L1d/PR///d//CB0BElYC6hbKrNkc7Eg0R5r3YmjBCKlNqao2nuovBJNKxI1Op9UZht1WnvxxqkqfuMUmsBt3ryJ7r33Xt4ghMpN/C8Iok4JPGuk4y58xoX2Kc6+VGy6FAZ3ToznRCJfxJDEzUGHFrH1WXoEgu/Ta+eDwKdSgOZaT7ngZGYRJP4t6kW+cg9hVFxjq3WdOrW5fEcBEcyDsn3OHiTFiH92ZwdTImUJcvPNN2tWI2pVYpbcvGccqf5FSP6446EqEzU2KLdQxWfF4Vt7wQ4oiZglnFN7I0/hgP/+979ZMzgtMtaYWePVjBB0edcl8MWZWsk5ITfccIM+dxASHmdlN6tg5o4nZU3getavX8+QQ3oRKMBSQBAj+36HA0ltCz9d77nnHr+Y0WlEhduQqOlfimNh5ofPwEONwoxyx4Tv8corsanOAEKxT5PkPM4n6eH7Eysose+0K+Sw54UpVme6f3jHHXeoKVNjuZHchFLOKJwzNzNJsDVYAWbVKZWdHABJ4wW/kK688kpq0KC+D8hgjVjgIYwncu6MRyMxhzbZk4t1jUD2V+GOkm42iRpdT9bRR6c7NHhzx0skGQF4/tjbgbqVfUjCfzWsoPlc3d31JCF5io1z5/bUU0/FMuuxZnKqmQP363WmltuvnphyC5Kg17ACnpRozV93d5x7eQZJ44Ub3XWHH4riQ2gNEASVBgrIv+Vl+5xjIDGvUJqetqf8lltucSeOxNbsUhwLu7t8ZhRPYXcsOGMqEsb/jmQCUpnZ5iS5mPcdeQ8oYU66HuaJUdB+XmGCJFdddZX+XIjynUW5En3JIuxDqdCuHz9aD1oDbWZRoZF4WB6V7XNOgzmpkW7RbN261S9o+Amqbgi2e7HTeUg00Q/dH8B3SSlyqGTZd/Z4UCdlWrJMkjhk8w+BgKiAMd5xMTkOegpyI2osm3faDUkuv/xyfZPhkKO9eDCrhBxDSFWDo7oAa6GB1R6ovbKAdjk3J6+bOamTyUYW9OhcdOBQ+EFJJ0/SyOFlt/gQ/XLHQpm3AmzRUiUZdzfsTUMR5nfYuumH6ugq37HjhCQTD0zzR6ZOnRabPvXkU0/pz/U/e5PrlfXnykWY69DOyD3u4iCKiX5nrD0MQRJVugjpZr9KNwm7YK53Z6lbqyCZp9g9rRTHWuaI9oMf/MAfB9tfv/jiC3csOOPYc5y1fcSkxgX7lkDO1BqZydRKkkQiW2g9pPCVJUelDuU6kARE4Nf6xgtDhg4R7WEIgom8CkgFFGTjgVki7AfhnjxorZJSRYlvvOH3r6B2qFMJx6nqnsz4A5RguOMkssk/yPYiIlVrVmB3GzpTi/es6+m3RZAEDwAFOOQI5VZ6nwOwD92ZpIpE8UCB9gBBEKhJNF5YlZPkAEiiRDwBEvZgShHkf//zux9fK+nmk2x5ZUYhG6qPgwJEtZAG7PlPVTzMOVzkCOKbOihTa8TIkVECUZPEmlvoXaUA1Yiw9E53aamoIAnJ+8YL6NqCTv0NGwk51MBR/B5RoOw3XigKJFEdDi2hmjalFjay2xYo4S22/omkhJ2Lz+CMu2PAEUNVrsUfs6097Lle7W7ewIHonVXAI6IjkoywoV/ZM+LyIyAJKgwUYFYhM1zpQ7kOJLsDr3HXF3VvmAbmtMdll12mrx+6VWS/8UJxMCe4n1VznKxJ2YWNeiMFRKaK9BlIVOpU92a9NRc76Cw4SlFWn6uEc32AH19GzQ+wM0TcmOihxtRyoV+dH4EmwZNQAer17FwgfK6AxMw+xWpVBvw1aA/Me8FIPAWULKHjTW6aVg4k0ST+QI8++qhf2OjVpHBKCcfAojvJvfnSSy/1x/nZz37mfgztMqssPlMJ54oCSlZpX375pblptgPjwEHGHynwTvsBBwxTmmQ0l8Uo4LNcSMGsioESWyUw4BTbtJ32QFNyi9xpvFASSDLL3NJHO+lKFeLJf0IJx0Cho9/hgq4d7jiqJy/8j0Fl8ZlKOFeEHjmR+d4/35NRbebJBpK4YTs6sgWSJDbv4Fqhd1NuzaDIMkhMq4fImlYI4TZp2tT7Hg899JC+hjC1u2T7nEsFc6IHkQ3F3XfffX5hq5oiLIijSzgGCHKW+wOYZ+44qvwCBOlXFp+pmPN0BXO8iw27FtGmFCTpb0wt18u3QJEkkb/BtcD+hOBzKJAkX89y1xX9yPY3/pzTHtiOrIB2sSMo100rB3OiB1stwSXgqe9PED/JBOaZO87DDz/sfgybfXRZfKZizhP1XZvcCd10003Uu4+aJ+JIAp/EmFuJedswqxAezp0iuhyAfeig8YYf1orCTcy3b9y4Ec9z+eYb3/DSNV4oP43x7BOVTSyoxZRd2FdccYX7UNAuS0o4Bi6S789y9dVX++NgV6K6OMeUxWcq5jw7ky3pxxBION88Fbd3H08Sp0nWrFmd1BywmXNj804OgWRMgY/j4+GIEiVMKEaH/5fj5UXYDbXTraGyCpImaxyeRbOElF3YKpyJD7a2FMcZ5f5gy5Yt/jhogaOO81PKUgbdkvhkS3i6/vrrqUcPNxm3l9Ekfay51Y+bvSXIgadFKB9JgKTaGtOQ2LSSkG57b1olQuIIjOyb7XPeaZDU6WPfAvsLKbuwUaGqcElJC9v8vgtJxp17P7njYHPUn/70J3ccVD42K4vPleH80LjBF07BfMrL60Y97OAdlF9jvjq2+CpA6yHEvVM9vyoDSMzVo0m1bUKVc5Mm4pjjmipgXczM1sNxl0CS9eSSAJSWpFSiEBunLNCepaREIaIYLzuiYfO9Ow6iYxZ4epf5/GoSHwnlDKwpsZWXZxt27UrdQBKrSdDXSgHnivFyJe69r4ww12Uoqd5piPSxaWW1h5qvCMsBrZ7KZ2CDJC/AHUdQWpJSBFEFhn+jkit5YcIg6cHqFmaKOw7yIgp3l/WiI5lg5YPwaAvauVOniCTd8rQp6MiBLhUhz5EBJGVFW8k1XnjmGZ4T48iBUXyKHNDaWbEadgtIihXZydJRLIiaWwEV2bkUx4JdxuYaylTccbCjEJuTLPD7MpvWStIl0t8x7HfhGesdO3qSJMKQMBngc4Q8RwaQmFab7XWiTz75hMPhTI7Gjej4447T1/JNIxOzfc67BBLzw6e7sX00ZRc28iIWcFRL7DBBUtflp7rrfAja4ChgUOceTxqa/9GAZE87O+YIN6K9aDs7RrpDxw5cdayAeCQ6LuRu8VwWYdcK8ma+DxPucVPrdyR66WLNIPRffkK6RYGkCRyHelFvlLKLGmOJFRCSKLZVJkX5EDaz7r///phGQimLxXeWSG324GcCOa4jNfgHG514znrbtkwStAtV2GHJVL7CkGUIkg1x3qxAKsCFdGFaPR4FY3B/0WegYgQ3SNqC8mBOXaqOxaTmdWPHV4l9eEkGdPqLiGYGKUWSzz//XF9EeO+9aTdmVUl8oe5WE/g2p9AU2GvfulUr/lyJHkw4KWwqD3mOImCuTTOS0nT2O1Cynp+fT42bCDnQoFsBPmvXbJ/zbgPJuGVuA4iGZ9gOmbILGlrAAiXxB5biWPBpEDHi9CnmFmK4pzsecg0KuNiPkBRM7nIIkKSaFL2ztpCaV4h2PHAiW7RowSSZH69UxvvgkDff1f9fUUFRFPBTd9FQ+u+cclQgKCAievzufOhlHSSjy37kPiFCdim7oDHrXAELqcQWPCStex5zTxuEVVNKi+Diqh1lAIIAKHra5/sQxRIDWmOzvokAOpPADEBzbJAEGi1BDlRlhvKRIkCikbEd1kcB4U8WUaX7rb0Hudd4YVdBksjhyMStt97qFzPKBVQzYZQyl2rEGsmcwr+5P9SFkBBUzSZaAMFX+LMlCjYOwIfI6ODZmwZSo10ROrIgmQezzptUaGuJwkPcRNxMkCTRnR61YdcEchQPkm6UvgcsTHBNDhXIAdBzt122z3mPgKROiR0O5D9Ql5SyixlDZyywAE8v5fHQAgiq1vd1QS/blCIJtl8mmmK7p9CbJCUM6FqHyVIjSEazDSYpz59LUnS4lWy7Ig2UkaCeyo1QwM1MVAbgf6DspeUevKTlHiRVumhtw+Yq/EeM1nbkSIxH+5DKU5XuzoLEd8CTmG0fNFpI2YWM/k8K2FBcqvYsJE95VP35coRkrgWC1jp4MqkG2cnFjAw4HGk89b9256iBXrt33303d2qvqzrEIxGY6D6C491E5Tl5VQYg0dKwR33jBTTOc+RA/ghN4Cxwb9AesfyVkuwMzAccQNaGf/HFF/kJnLKLGNtoLbA4UftfKjuTJFN/rn3CCMPeeYdDrakEUeDsodncL3/5y0xEScNzzz1HjzzyCHc1RC0VylswwqtO7TpMEjReeOutt/SfQJtdF8hRMkh8OlVKsj5GDjXCGusBbWsqfkkOiUr1u8IwuCalFrACTLHhO3Fc9GZFHNAnmDAYFI3p4BukEkSBoGMhtrmCLCABdiai6BF1XSARig2hJTAmmGeMqEE87dq1pc0XXpgMBGAP9MZAjpJhrhEyfje5dYDaOgQ5XE8rNBdUgF+a1Y1wZQqSSUy8kPH0bd26tV+0if6zyGGUuhyDJNI0kcSZ9isXrU2RnEQINpWBKJkEFcJ7VcGMkao8YwQkwaQqaBHsRVH9vJiLJO2I0L2+/Gd19zBITG0UpvmAx8QDJxpiNOSpX4mQLjQymo5XbNNKg6Qq9053BdADKmUXZl5eng7puQbNpV50JPH0PiTh4g80UbCo4StgvkaqlCTBEB6MVUCSCjM54Ico4NhIfiKM27tS3cRdAEkpibdLEdJt2FBahdarX48++si7JHAYkRqofINISbbh+nwCunqkFEkUcLXG7uziIzG5ppGED7+kBLDBH5u3EI0699xzeeyZ+//IY2zatIlD0WhI91S8N64DnEYkC6dQaMtTaphr1YSkoQI/uLBd2vXRhTmLe6KAb0osYK2QIPFFfHM1PR0K8sMf/lBfKGyCQruX7zs3ECoaTYDhxH9DRQARKpXVzwSYBAj5YvjKiECMnQNJMAX7EriODoEUhOEdOTCUVAHXOSvNx3MGJHkRX1OFia4pSxCUimMIioWbl/69OuSRhBNBlL5GltoFjo3MMME+y0Aa/D/EF+F0o4YeyUUk/BCSxDa2ipfF3cMgMX1n22vKgNbG/A6QA4EUBWh8lGZXbn/OLlx0oPCmlp6ZDpKo6bN46sCkKXZ+SCn/J/Y5ozYMe+UXkMTX0d4TyQx0jEbIGHVByPwjLI2ttLnfgCyHQeKj+W0KiB6CGBi/B3KoEXy4z7+isJFMQFLu8VP71ObSEKjdlCUJtqkmQqmwgXb7+CxLHJbdfezKDhLT6k6nqVGs2rx5cyYHRjMnZtRDs5eq1KjSgGRHnn+EJAsPUVOlgCfMU/bJHhZzjoMk9I66fy5hwMMOyVU3szzRSxcFpXPDfU3APrnhkPmap+R4g4kTJ+oLCZWCRCKiVMEfyFHY+4qtAb67wooVK3heOciBigR0SFQPPjQnLp+NF/Y0SJw4FB76RAOiSilFEszVUE0eADgoKH1uGZ46uQeSrQUPupuF8WggRu1atbkaQVXp4oGHGc2hAqE4kBQeYsSan6qj8xMQVACroZ/ADntxJ1BlTCjlKOwDD5NHudoQwZZ+ffsxMWrWrMWtQxWgYYZm+5zLBUgiTKdqkuiRCRBEPRLDPwHkOLAFFr5J5Q4PZhmWHCi78SFdjJQTctRMhnRxn9FjYLfMqa8UIKnV2UCq8PBvf/sbF7OlFFEmTZpE7777rr7YUNXIvF9oiRLs2SyApErXq/mLLryQiVGjRk1q0rQJV3Gr+4WCxbChbGdBkmlfrEkCNY2wb0qRBJ1DMOwy4ZvA4YMvA/t3DkkTsjLpkVXZQVKle6Nd/Fyyjm0H1avX4GJPzHVRQJVu5Swl2R0gaSCGsWt/J1V0iDJ0hAlTCd8EG7ASRAEQXvybvWnzSQoZQRjE5mtabYVoSxUrwdn/nrDXD125/Q5PhHRBDFRD4x4pQNPPDNd7F2EXL+qwtpIqCcFGpiRJUooo+H0RgF2MX6JNProhok0pkljYQfUL+/UdRm43citJGxqUpiCZCR8Hm6EwAx2lJ6glu8oKJkKh8hSOKQrJXFYeGxvQleJCK4i6YSsv5s9h7wiy9jAnEeLEvuOz1OvpVrAtGINE4JudYmWtFeymRDfs5VYQ5FhqZZkVNARGg64lJFoZ0UK0J8R+1kX2e7zCc15gZb4RtGbBPuK59msIykWwXeEwI9NJQu14iKFoE6U4292FxvZn3ktjBFsGMOHYYoe9PsFX3B0gIUlru9C88w5gQA2STakEUUAeaBpsfMLg0D2A73ZRvi1D+WY3y44ixD/A0BbWEQOCYlQFPJw6ZHVRVUSQNGmAT/GkvfEMDMq87rrrqHfv3hn3dej9HKj5+eCDD7iJNv5ux44dnN3F7kNIoqwlKyjtduBcBbYIwCkHMbCfBkWoCtAwaPETTKs9AYq0CUwUZN49UT799FMugsNW2lQpdw5mS3jHIu9alE1ZLPZpC5k7Zy6HsiHYr4JBMZisdMEFm3ivygUXXMCC1q3YnnrJJZfSpZdcwoNRk3L55ZfTlVdeybs10eEFOyIxlevaa6/lMXj4Hq94gMA8hUAzQ/vecsstPEX45ptu5p9hj8zPf/5zuvPOO7mHAASERlIXe2vwIKpRs4b/TGiip8ajQfvDHAwby/Y0SGp8sDcTtr+vV3DATcNi0IWPuSieKFbcwqpatYonS7Wq1bwtX6267I+vrsVoyBrVa7CmrAlBSNVIze8jNeQ4LMn/A6mmzqVaROgqVatERDeCzwJyqK3JUM3w68IUrbIESSQK1Yxwnt/WGgVAdTB2BOLptnr1ar7JqRwgRibJRBQmS5WILG5/fJrw4s2woDNIjRolv6caR56qx/5HVUUIMZ+qRoSoInv43fnj86APgMKzVB7Ho1UUWNOrG0nEBzfjE8rQ2wr2MUwxFMlh7zP2v2Of+fbt21ngn2D4JgQ9f7FpC3NHkJDUgt1wEHSERPNtCBpQIO7vZNu2bSx4ikIwCwWC8XFIfGpB+Qzk1VdfZXnllVdYMJPPyUsvvcTy4osv+a8hKB9//vnn2b9C9A7y7LPPcqcQ9zN8brd9GN1bnnjiCe7g8vjjj3P1NKoVIO5rbH2FoNsL5p1gizIGsELQ9QWvDz7wIN1//wPchwxOOcwsmF/wB2GmKVS+xgu5CpJYPPY9ozoYLUYRwvo4SZSAMgOiWwh1h5BuroFEq6CDykCS2D6mOv2GpJEDtvBiXwm202IvyvP29QWS4TuYhfgqSckEmpvBmN5m5U2SrhxIYMKsQydI1Lxgey72Cf/LCoII2Na73Qqy+2jZ8pEVEPe/VqDxsLMST1vX4fELK19aQdLzayo6zFqc7O5QL6SosLILZeMzIi8URj6UF5D4LOgM38CSB9oG1XPNrCDL3txKC5JSemy53Schbaxghnc7K+1JJmA56Wilk5XOVjCtt2tCulnJs9LdSg8lPa30Sgi2s6JCAHMf+lpB2rq/+tlAK+g/jDAr/LYhJIMyoW2HW3Ffj7CCxt0Yv43OMhOsjLev2KRzIEmHmkNIzCgkEJEwPNKeU9ivExAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBBQ2fD/SVItK+k3AqkAAAAASUVORK5CYII=">' +
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
            '         LastView = 1;' +
            '       var CamDown = false;' +
            '       var CheckCarpet = false;' +
            ' ' +
            '       document.body.style.setProperty("--YPersRotVariable", "rotateY(" + RotAngleYVar + "deg)");' +
            '       document.body.style.setProperty("--XPersRotVariable", "rotateX(" + RotAngleXVar + "deg)");' +
            '       document.body.style.setProperty("--PersScaleVariable", "scale(" + ScaleVar + ")");' +
            '       document.body.style.setProperty("--PerspectivePXVariable", "perspective(" + PerspectivePX + "px)");' +
            '       document.body.style.setProperty("--PersTranslateVariable", "translate(" + TranslatePX + "px)");' +
            ' ' +
            '       document.getElementById("Cam").addEventListener("mousedown", function(event) {' +
            '         CamDown = true;' +
            '       }, true);' +
            '       document.getElementById("Cam").addEventListener("touchstart", function(event) {' +
            '         CamDown = true;' +
            '       }, true);' +
            '       window.addEventListener("mouseup", function(event) {' +
            '         CamDown = false;' +
            '       }, true);' +
            '       window.addEventListener("touchend", function(event) {' +
            '         CamDown = false;' +
            '       }, true);' +
            '       document.addEventListener("mousemove", function(event) {' +
            '         if (CamDown) {' +
            '           document.getElementById("Cam").style.left = (event.pageX - ((1024 * ScaleVar) / 2)) + "px";' +
            '           document.getElementById("Cam").style.top = (event.pageY - ((1024 * ScaleVar) / 2)) + "px";' +
            '         }' +
            '       }, true);' +
            '       document.addEventListener("touchmove", function(event) {' +
            '         if (CamDown) {' +
            '           document.getElementById("Cam").style.left = (event.touches[0].pageX - ((1024 * ScaleVar) / 2)) + "px";' +
            '           document.getElementById("Cam").style.top = (event.touches[0].pageY - ((1024 * ScaleVar) / 2)) + "px";' +
            '         }' +
            '       }, true);' +
            ' ' +
            '   var ColorsItems = ' + JSON.stringify(ColorsItems) + '; ';
        let RoomsIDVis = Object.keys(rooms).map(function(key) {
            return "Room" + rooms[key]["room_id"];
        });
        ExportHTML += '   var ColorsCarpet = ' + JSON.stringify(ColorsCarpet) + '; ';
        let CarpetIDVis = Object.keys(carpet).map(function(key) {
            return "Carpet" + key;
        });
        ExportHTML += ' RoomsIDVis = ' + JSON.stringify(RoomsIDVis) + '; ';
        ExportHTML += ' CarpetIDVis = ' + JSON.stringify(CarpetIDVis) + '; ';
        ExportHTML += ' DH_RoomsNumberState = ' +
            JSON.stringify(DH_RoomsNumberState) + '; ' +
            '       document.querySelector(".MapCarpet").style.setProperty("--CarpetOpacityVariable", "0.4");' +
            '	    for (let i = 0; i < CarpetIDVis.length; i++) {' +
            '         document.getElementById(CarpetIDVis[i]).style.visibility = "hidden";' +
            '       }' +
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
            '       var angle = 90;' +
            '       var DH_IconW = 30;' +
            '       var DH_IconH = 30;' +
            '       document.body.style.setProperty("--RotateVariable", "rotate(" + angle + "deg)");' +
            ' ' +
            '       if (!Offline) {' +
            '         new Promise((resolve, reject) => {' +
            '           vis.conn._socket.emit("getState", "dreame.0.' + DH_Did + '.mqtt.charger", function(err, res) {' +
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
            '	             vis.conn._socket.emit("getState", "dreame.0.' + DH_Did + '.vis.PosHistory' + DH_CurMap + '", function(err, res) {' +
            '	                 if (!err && res) {' +
			'	                     resolve(res);' +
            '	                 } else {' +
            '	                     resolve("{val: [0, 0]}");' +
            '	                 }' +
            '	             });' +
            '	         }).then(function(result) {' +
            '	             PosHistory = JSON.parse(result.val);' +
			'	             new Promise((resolve, reject) => {' +
            '	                 vis.conn._socket.emit("getState", "dreame.0.' + DH_Did + '.vis.CharHistory"' + DH_CurMap + ', function(err, res) {' +
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
            '       setInterval(function() {' +
            '         UpdateMap();' +
            '       }, 1500);' +
            ' ' +
            '       async function UpdateMap() {' +
            '         let PromDreamePos = DHgetStateAsync("dreame.0.' + DH_Did + '.mqtt.robot");' +
            '         ArrDreamePos = await PromDreamePos.then(result => eval(result.val));' +
            '         let GetNewCoordinates = [RovalX, RovalY];' +
            '         var RovalX = (charger[0] + ArrDreamePos[0] + (origin[0] * -1)) / DH_ScaleValue;' +
            '         var RovalY = (charger[1] + ArrDreamePos[1] + (origin[1] * -1)) / DH_ScaleValue;' +
            '         let RobotNewX = 0,' +
            '           RobotNewY = 0;' +
            '         switch (angle) {' +
            '           case 0:' +
            '             RobotNewX = (GetNewCoordinates[0] - (DH_IconW / 2));' +
            '             RobotNewY = (GetNewCoordinates[1] - (DH_IconH / 2));' +
            '             break;' +
            '           case 90:' +
            '             RobotNewX = (GetNewCoordinates[0] + (DH_IconW / 2));' +
            '             RobotNewY = (GetNewCoordinates[1] - (DH_IconH / 2));' +
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
            '         await point(RovalX, RovalY, context);' +
            '         context2.clearRect(0, 0, canvas2.width, canvas2.height);' +
            '         context2.drawImage(RobotImage, RovalX - (DH_IconH / 2), RovalY - (DH_IconH / 2), 30, 30);' +
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
            '         console.log("RotAngleYVar: " + RotAngleYVar + " LastView: " + LastView);' +
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
            '         context.lineWidth = 7;' +
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
            '         let PromDreamePos = DHgetStateAsync("dreame.0.' + DH_Did + '.mqtt.robot");' +
            '         ArrDreamePos = PromDreamePos.then(result => eval(result.val));' +
            '         var RovalX = (charger[0] + ArrDreamePos[0] + (origin[0] * -1)) / DH_ScaleValue;' +
            '         var RovalY = (charger[1] + ArrDreamePos[1] + (origin[1] * -1)) / DH_ScaleValue;' +
            '         document.body.style.setProperty("--RotateVariable", "rotate(" + angle + "deg)");' +
            '         var GetNewCoordinates = rotate(RovalX, RovalY, ((canvas.width / 2) - 20), ((canvas.height / 2) - 20), angle);' +
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
            '         for (let i = 0; i < RoomsIDVis.length; i++) {' +
            '           var DH_GetConvertedRoomBG = DH_hexToRgbA(ColorsItems[RoomsIDVis[i].replace("Room", "")]);' +
            '           var DH_ConvertetRoomBG = [DH_GetConvertedRoomBG.R, DH_GetConvertedRoomBG.G, DH_GetConvertedRoomBG.B, DH_GetConvertedRoomBG.A];' +
            '           if ((pixelData[0] == DH_GetConvertedRoomBG.R) && (pixelData[1] == DH_GetConvertedRoomBG.G) && (pixelData[2] == DH_GetConvertedRoomBG.B)) {' +
            '             MapImage = document.getElementById(RoomsIDVis[i]);' +
            '             if (DH_RoomsNumberState[RoomsIDVis[i].replace("Room", "")] == 0) {' +
            '               DH_RoomsNumberState[RoomsIDVis[i].replace("Room", "")] = 1;' +
            '               MapImage.setAttribute("style", " filter: contrast(100%) saturate(4) drop-shadow(0 0 0.75rem rgba(" + pixelData + ")) drop-shadow(0 0 0.5rem rgb(0, 0, 0)) drop-shadow(0 0 0.2rem rgb(255, 255, 255));");' +
            '             } else {' +
            '               DH_RoomsNumberState[RoomsIDVis[i].replace("Room", "")] = 0;' +
            '               MapImage.setAttribute("style", "");' +
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
            '       .CommandPer {' +
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
            '       .MapRotate {' +
            '         position: absolute;' +
            '         width: 4rem;' +
            '         height: 4rem;' +
            '         top: 1rem;' +
            '         left: 10rem;' +
            '         right: 0;' +
            '         bottom: 0;' +
            '         z-index: 19;' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.15rem 0 #000000) drop-shadow(-0.15rem 0 0 #ffffff) drop-shadow(0 -0.15rem 0 #ffffff);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .MapRotate:hover {' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.25rem 0 #000000) drop-shadow(-0.15rem 0 0 #ffffff) drop-shadow(0 -0.15rem 0 #ffffff);' +
            '       }' +
            ' ' +
            '       .MapRotate:active {' +
            '         transform: translateY(0.2rem);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.45rem 0 #000000) drop-shadow(-0.25rem 0 0 #ffffff) drop-shadow(0 -0.15rem 0 #ffffff);' +
            '       }' +
            ' ' +
            '       .MapCarpet {' +
            '         position: absolute;' +
            '         width: 4rem;' +
            '         height: 4rem;' +
            '         top: 4.5rem;' +
            '         left: 10rem;' +
            '         right: 0;' +
            '         bottom: 0;' +
            '         z-index: 19;' +
            '         opacity: var(--CarpetOpacityVariable);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.15rem 0 #000000) drop-shadow(-0.15rem 0 0 #ffffff) drop-shadow(0 -0.15rem 0 #ffffff);' +
            '         cursor: pointer;' +
            '       }' +
            ' ' +
            '       .MapCarpet:hover {' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.25rem 0 #000000) drop-shadow(-0.15rem 0 0 #ffffff) drop-shadow(0 -0.15rem 0 #ffffff);' +
            '       }' +
            ' ' +
            '       .MapCarpet:active {' +
            '         transform: translateY(0.2rem);' +
            '         filter: drop-shadow(0.15rem 0 0 #000000) drop-shadow(0 0.45rem 0 #000000) drop-shadow(-0.25rem 0 0 #ffffff) drop-shadow(0 -0.15rem 0 #ffffff);' +
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
            this.log.info("VIS HTML: " + ExportHTML);
        }
        this.setStateAsync(DH_Did + ".vis.vishtml" + DH_CurMap, ExportHTML, true);
		this.log.info(DreameInformation[UserLang][6] + DH_Did + ".vis.vishtml" + DH_CurMap + DreameInformation[UserLang][7]);
        ExportHTML = "";
    }
    async DH_getMapFromCanvas(Color, RoomNumber) {
        //this.log.info("Color: " + JSON.stringify(Color));
        var DH_OffsetCutMap = false;
        var DH_CutMapBox = await this.DH_getCenterCoordsFromCanvas({
            red: Color.R,
            green: Color.G,
            blue: Color.B,
            alpha: Color.A
        }, DH_OffsetCutMap);
        //this.log.info(JSON.stringify(DH_CutMapBox));
        DH_OffsetCutMap = true;
        var DH_CutMapCoord = await this.DH_getCenterCoordsFromCanvas({
            red: Color.R,
            green: Color.G,
            blue: Color.B,
            alpha: Color.A
        }, DH_OffsetCutMap);
        //this.log.info(JSON.stringify(DH_CutMapCoord));
        var offsetX = DH_CutMapCoord.offsetX;
        var offsetY = DH_CutMapCoord.offsetY;
        var boxWidth = DH_CutMapBox.x * 2;
        var boxHeight = DH_CutMapBox.y * 2;
        return {
            segment: RoomNumber,
            x: boxWidth,
            y: boxHeight,
            offX: offsetX,
            offY: offsetY
        }
        /*var imageData = context.getImageData(offsetX, offsetY, boxWidth, boxHeight);
        document.getElementById('canvas').height = boxHeight;
        document.getElementById('canvas').width = boxWidth;
        context.putImageData(imageData, 0, 0);*/
    }
    async DH_getCenterCoordsFromCanvas(colors, relativeToCanvas) {
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var len = imageData.data.length;
        var minX = Infinity;
        var minY = Infinity;
        var maxX = 0;
        var maxY = 0;
        var xCor = 0;
        var yCor = 0;
        var pixelFound = 0;
        for (var i = 0; i < len; i += 4) {
            xCor = (i / 4) % canvas.width;
            yCor = Math.floor((i / 4) / canvas.width);
        }
        var middleX = (maxX - minX) / 2;
        var middleY = (maxY - minY) / 2;
        imageData = null;
        return {
            x: (relativeToCanvas ? minX : 0) + middleX,
            y: (relativeToCanvas ? minY : 0) + middleY,
            offsetX: relativeToCanvas ? minX : 0,
            offsetY: relativeToCanvas ? minY : 0
        }
    }
    async DH_hexToRgbA(hex) {
        var Color;
        Color = hex.substring(1).split('');
        if (Color.length == 3) {
            Color = [Color[0], Color[0], Color[1], Color[1], Color[2], Color[2]];
        }
        Color = '0x' + Color.join('');
        let ColR = (Color >> 16) & 255;
        let ColG = (Color >> 8) & 255;
        let ColB = Color & 255;
        let ColA = 255;
        let RGBA = 'rgba(' + [ColR, ColG, ColB, ColA].join(',') + ')';
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
    }

    async DH_SearchIID(ToFindVar) {
        var RetSPKey = false;
        for (var [SPkey, SPvalue] of Object.entries(DreameStateProperties)) {
            // this.log.info('=====> ' + SPkey + " => " + ToFindVar);
            if (SPvalue != null) {
                if (SPkey == ToFindVar) {
                    RetSPKey = SPvalue;
                    break;
                }
            }
        }
        return RetSPKey;
    }

    async DH_createStates() {
        for (var [SPkey, SPvalue] of Object.entries(DreameStateProperties)) {
            await this.DH_getType(Setvalue, path, SPkey);
            await this.DH_setState(path, Setvalue, true);
        }
    }

    async DH_CheckTaskStatus() {
        try {
            var RobTaskStatusOb = await this.getStateAsync(DH_Did + ".state.TaskStatus");
            var RobTaskStatus = RobTaskStatusOb.val;

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
            await this.setState(DH_Did + ".vis.PosHistory" + DH_CurMap, "{}", true);
            await this.setState(DH_Did + ".vis.CharHistory" + DH_CurMap, "{}", true);
            DH_OldTaskStatus = DH_NewTaskStatus;
            //if (LogData) {
            this.log.info('A new cleaning was initiated, the object state PosHistory was reset to :' + DH_OldTaskStatus);
            //}
        }
    }

		async DH_Base64DecodeUnicode(str) {
        return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
    }

	async DH_GetRobotPosition(Position, SegmentObject) {
		//this.log.info("==========> " + JSON.stringify(Position) + " Rooms " + JSON.stringify(SegmentObject));
        var Inside = 0;
        for (var iSegCoor in SegmentObject) {
            var a = 0, b = SegmentObject[iSegCoor].X.length - 1;
            var CoordX = SegmentObject[iSegCoor].X;
            var CoordY = SegmentObject[iSegCoor].Y;
            for (a = 0; a < SegmentObject[iSegCoor].X.length; a++) {
                if ((CoordY[a] < Position[1] && CoordY[b] >= Position[1] || CoordY[b] < Position[1] && CoordY[a] >= Position[1]) &&
                    (CoordX[a] <= Position[0] || CoordX[b] <= Position[0])) {
                    Inside ^= (CoordX[a] + (Position[1] - CoordY[a]) * (CoordX[b] - CoordX[a]) / (CoordY[b] - CoordY[a])) < Position[0];
                }
                b = a;
            }
            if (Inside == 1) {
				if (LogData) {
                }

                //this.log.info(Inside + ": Room Number: " + SegmentObject[iSegCoor].Id + " Room Name: " + SegmentObject[iSegCoor].Name);
				await this.setState(DH_Did + ".state.CurrentRoomCleaningName", SegmentObject[iSegCoor].Name, true);
				await this.setState(DH_Did + ".state.CurrentRoomCleaningNumber", SegmentObject[iSegCoor].Id, true);

                Inside = 0;
                break;
            }
        }
    }

    async DH_GetControl() {

        const requestId = Math.floor(Math.random() * 9000) + 1000;
        for (var [SPkey, SPvalue] of Object.entries(DreameActionProperties)) {
			var PiidAction = DreameActionParams[SPkey];
			if (Object.prototype.toString.call(DreameActionParams[SPkey]).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
				PiidAction = JSON.parse(DreameActionParams[SPkey]);
			}
			//JSON.parse(JSON.stringify(DreameActionParams[SPkey]))

            var GetSIID = parseInt((SPkey.split("S")[1] || "").split("A")[0]);
            var GetAIID = parseInt(SPkey.replace("S" + GetSIID + "A", ""));
			if ((SPkey.indexOf("P") !== -1) && (SPkey.indexOf("C") !== -1)) {
				GetAIID = (SPkey.split("P")[1] || "").split("C")[0];
			}
            var GetSIIDAIID = GetSIID + "." + GetAIID;
            var SETURLData = {
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
                var GetCloudRequestDeviceData = await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, SETURLData);
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
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Language": "en-US;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "User-Agent": DH_URLUSA,
                "Authorization": DH_URLAUTH,
                "Tenant-Id": DH_Tenant,
                "Content-Type": "application/json",
                "Dreame-Auth": DH_Auth,
            },
            data: SetData,
        }).then(async (response) => {
            this.log.info(DHurl + " | " + JSON.stringify(SetData) + " | Response: " + JSON.stringify(response.data));
            if (LogData) {
                this.log.info(DHurl + " | " + JSON.stringify(SetData) + " | Response: " + JSON.stringify(response.data));
            }
            return response.data;
        }).catch((error) => {
            this.log.warn("unable to send Command: DH_URLSend | " + SetData + " | Error: " + JSON.stringify(error));
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
                        let mappath = DH_Did + '.mqtt.';
                        this.DH_uncompress(encode, mappath);
						encode = null;
						DH_UpdateTheMap = false;
                    }
                    var ObjectPoint = await this.DH_SearchIID("S" + element.siid + 'P' + element.piid);
                    if (ObjectPoint) {
                        let path = DH_Did + ".state." + ObjectPoint.replace(/\w\S*/g, function(SPName) {
                            return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                        }).replace(/\s/g, '');
                        if (path) {
                            var Setvalue = element.value;
                            if (Object.prototype.toString.call(Setvalue).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                                Setvalue = JSON.stringify(Setvalue);
                            }
							Setvalue = await this.DH_SetPropSPID("S" + element.siid + 'P' + element.piid, Setvalue);

                            await this.DH_getType(Setvalue, path, "S" + element.siid + 'P' + element.piid);
                            await this.DH_setState(path, Setvalue, true);
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
        if (InSetPropSPID == "S2P1" /*"State"*/ ) {
            InSetvalue = DreameVacuumState[UserLang][parseInt(InSetvalue)];
        }
        if (InSetPropSPID == "S2P2" /*"Error"*/ ) {
            InSetvalue = DreameVacuumErrorCode[UserLang][parseInt(InSetvalue)];
        }
        if (InSetPropSPID == "S3P2" /*"Charging status"*/ ) {
            InSetvalue = DreameChargingStatus[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P1" /*"Status"*/ ) {
            DH_NowStatus = JSON.parse(JSON.stringify(InSetvalue));
            InSetvalue = DreameStatus[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P4" /*"Suction level"*/ ) {
            InSetvalue = DreameSuctionLevel[UserLang][parseInt(InSetvalue)];
        }
        if (InSetPropSPID == "S4P5" /*"Water volume"*/ ) {
            InSetvalue = DreameWaterVolume[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P6" /*"Water tank"*/ ) {
            InSetvalue = DreameWaterTank[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P7" /*"Task status"*/ ) {
            DH_NowTaskStatus = JSON.parse(JSON.stringify(InSetvalue));
            InSetvalue = DreameTaskStatus[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P23" /*"Cleaning mode"*/ ) {
            InSetvalue = DreameCleaningMode[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P25" /*"Self wash base status"*/ ) {
            InSetvalue = DreameSelfWashBaseStatus[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P28" /*"Carpet sensitivity"*/ ) {
            InSetvalue = DreameCarpetSensitivity[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P35" /*"Warn status"*/ ) {
            InSetvalue = DreameVacuumErrorCode[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P36" /*"Carpet avoidance"*/ ) {
            InSetvalue = DreameCarpetAvoidance[UserLang][parseInt(InSetvalue)];
        }
        if (InSetPropSPID == "S4P41" /*"Low water warning"*/ ) {
            InSetvalue = DreameLowWaterWarning[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S4P46" /*"Mop wash level"*/ ) {
            InSetvalue = DreameMopWashLevel[UserLang][parseInt(InSetvalue)];
        }
        if (InSetPropSPID == "S15P1" /*"Auto dust collecting"*/ ) {
            InSetvalue = DreameAutoDustCollecting[UserLang][parseInt(InSetvalue)];
        }
        if (InSetPropSPID == "S15P5" /*"Auto empty status"*/ ) {
            InSetvalue = DreameAutoEmptyStatus[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S27P2" /*"Dirty water tank"*/ ) {
			if (InSetvalue == 1) {/*"Reset the Warn status Object"*/
			    let DWpath = DH_Did + ".state." + DreameStateProperties["S4P35"].replace(/\w\S*/g, function(SPName) {
					return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
				}).replace(/\s/g, '');
				await this.DH_setState(DWpath, DreameVacuumErrorCode[UserLang][0], true);
			}
            InSetvalue = DreameDirtyWaterTank[UserLang][parseInt(InSetvalue)];
        }
		if (InSetPropSPID == "S27P1" /*"Pure water tank"*/ ) {
			let DWpath = DH_Did + ".state." + DreameStateProperties["S4P41"].replace(/\w\S*/g, function(SPName) { /*"Change Low water warning Object"*/
					return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
				}).replace(/\s/g, '');
			if (InSetvalue == 0) {
				await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][6], true);
			} else if (InSetvalue == 2) {
				await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][2], true);
			} else if (InSetvalue == 3) {
				await this.DH_setState(DWpath, DreameLowWaterWarning[UserLang][0], true);
			}
			DWpath = DH_Did + ".state." + DreameStateProperties["S4P6"].replace(/\w\S*/g, function(SPName) { /*"Change Water tank Object"*/
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
        var input_Raw = In_Compressed.replace(/-/g, '+').replace(/_/g, '/');
		var decode = zlib.inflateSync(Buffer.from(input_Raw, 'base64')).toString()

        //this.log.info(' Zlib inflate  : ' + decode);
        /*csvar mapHeader = decode.toString().split("{");
    let GetHeader = mapHeader[0];
	this.log.info(' decode Header 1: ' + GetHeader);
	try {
		var encodedDataH = Buffer.from(GetHeader, 'base64');
		this.log.info(' Base64 decode Header : ' + encodedDataH);
		var decodeHeader = zlib.inflateSync(encodedDataH);
		} catch (e) {
        this.log.info(' Error decode Header 2: ' + e);
        } finally {
        this.log.info(' decode Header 2: ' + decodeHeader);
        }
    */
        var jsondecode = decode.toString().match(/[{\[]{1}([,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis);
        var jsonread = (_ => {
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

		await this.DH_PropMQTTObject(jsonread, DH_Did + ".mqtt.", "Decode map: ");
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
        for (var [key, value] of Object.entries(InData)) {
            var path = InPath + key;
            if (path) {
                if (value != null) {
					 if ((path.toString().lastIndexOf('.cleanset') != -1) && typeof (value === 'object')) {
						// await this.DH_PropMQTTObject(value, path + ".", InLog);
						if (LogData) {
						    this.log.info("==> cleanset Path found | typeof: " + typeof(value));
						}
						value = JSON.stringify(value);
					 }
                    if (Object.prototype.toString.call(value) !== '[object Object]')  {
                        if (LogData) {
                            this.log.info(InLog + " Set " + path + " to " + value);
                        }
                        if (Object.prototype.toString.call(value).match(/\s([\w]+)/)[1].toLowerCase() == 'array') {
                            value = JSON.stringify(value);
                        }
                        await this.DH_getType(value, path);
                        await this.DH_setState(path, value, true);

						if (path.toString().lastIndexOf('.robot') != -1) {
							//Get Room
							await this.DH_GetRobotPosition(JSON.parse(value), CheckArrayRooms)
							//this.log.info("==> DH_NowTaskStatus is |" + DH_NowTaskStatus + "|");
							if (((DH_NowTaskStatus == 1) || (DH_NowTaskStatus == 2) || (DH_NowTaskStatus == 3) || (DH_NowTaskStatus == 4) || (DH_NowTaskStatus == 5)) &&
							((DH_NowStatus == 2) || (DH_NowStatus == 4) || (DH_NowStatus == 18) || (DH_NowStatus == 19) || (DH_NowStatus == 20))){
							    await this.DH_SetHistory(value, DH_Did + ".vis.PosHistory" + DH_CurMap);
							}
						}

                    }
                }
            }
        }
    }
    async DH_SetHistory(NewRobVal, InRobPath) {
        try {
            //Get Robot X Y History
            var RobPosOb = await this.getStateAsync(InRobPath);
            var OldObjectRobPos = JSON.parse(RobPosOb.val);
            //Get Charger X Y History
            /*var CharPosOb = await this.getStateAsync(DH_Did + ".vis.CharHistory" + DH_CurMap);
            var OldObjectCharPos = JSON.parse(CharPosOb.val);*/
            // Get Charger New X Y
            var NewObjCharVal = await this.getStateAsync(DH_Did + ".mqtt.charger");
            var NewCharVal = NewObjCharVal.val
            //Get Object Index
            var lastRobIndex = Object.keys(OldObjectRobPos)[Object.keys(OldObjectRobPos).length - 1];

            if ((lastRobIndex == 'undefined') || (lastRobIndex == 'NaN')) {
                OldObjectRobPos = {"0": JSON.stringify(NewRobVal)};
                await this.setState(InRobPath, JSON.stringify(OldObjectRobPos), true);
                //Charger History
                var OldObjectCharPos = {};
                OldObjectCharPos[0] = JSON.stringify(NewCharVal);
                await this.setState(DH_Did + ".vis.CharHistory" + DH_CurMap, JSON.stringify(OldObjectCharPos), true);

            } else {
                OldObjectRobPos[parseInt(lastRobIndex) + 1] = JSON.stringify(NewRobVal);
                await this.setState(InRobPath, JSON.stringify(OldObjectRobPos), true);
                //Charger
                /*OldObjectCharPos[parseInt(lastRobIndex) + 1] = JSON.stringify(NewCharVal);
                await this.setState(DH_Did + ".vis.CharHistory" + DH_CurMap, JSON.stringify(OldObjectCharPos), true);*/

                //Clean
                RobPosOb = null, OldObjectRobPos = null, /*CharPosOb = null,*/ OldObjectCharPos = null, NewObjCharVal = null, NewCharVal = null;

            }
        } catch (error) {
            this.log.error("DH_SetHistory Error: " + error);
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
    async DH_getType(element, createpath, SetSPiid = '') {
		if ((element == 'undefined') || (element == null)) {element = "";}
		try {
            element = JSON.parse(element);
        } catch (StGer) {
		    if (LogData) {
			    this.log.info('Test DH_getType value: ' + element + " return " + StGer);
		    }
		}
        var setrolT = ['string', 'text'];
        var Typeof = Object.prototype.toString.call(element).match(/\s([\w]+)/)[1].toLowerCase();
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

        let Stwrite = false, Stname = '', Stunit = '', Stnative = {}, Stsiid = '', Stpiid = '';
		Stname = createpath.split(/[\s.]/).pop().replace(/(?<!^)([A-Z])/g, ' $1');

		if (SetSPiid != ''){
			var Delimiter = "P";
			if (SetSPiid.indexOf("A") !== -1) {
				Delimiter = "A";
				Stwrite = true;
			}
			if (SetSPiid.indexOf("C") !== -1) {
				Delimiter = "C";
				Stwrite = true;
			}
			if (Delimiter == "C") {
			    Stsiid = (SetSPiid.split("S")[1] || "").split("A")[0];
				if ((SetSPiid.indexOf("P") !== -1) && (SetSPiid.indexOf("C") !== -1)) {
					Stsiid = (SetSPiid.split("S")[1] || "").split("P")[0];
				}
			} else {
			    Stsiid = (SetSPiid.split("S")[1] || "").split(Delimiter)[0];
			}
			Stpiid = SetSPiid.replace("S" + Stsiid + Delimiter, "");
			if (Delimiter == "A") {
			    Stnative = {siid: Stsiid, aiid: Stpiid, did: DH_Did, model: DH_Model};
			} else if (Delimiter == "P") {
				Stnative = {siid: Stsiid, piid: Stpiid, did: DH_Did, model: DH_Model};
			} else if (Delimiter == "C") {
				if ((SetSPiid.indexOf("P") !== -1) && (SetSPiid.indexOf("C") !== -1)) {
					Stpiid = (SetSPiid.split("P")[1] || "").split("C")[0];
				    Stnative = {siid: Stsiid, Piid: Stpiid, did: DH_Did, model: DH_Model};
				} else {
				    Stpiid = (SetSPiid.split("A")[1] || "").split("C")[0];
				    Stnative = {siid: Stsiid, aiid: Stpiid, did: DH_Did, model: DH_Model};
			    }
			}
		}

		if (createpath.match(/left|batterylevel$/gi)){
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

        await this.extendObject(createpath, {
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
        });

		if (LogData) {
            this.log.info('common Type is: ' + setrolT + " | common Role is: " + setrolT[1] + " | " + Typeof + " is: " + element);
		}
    }
	async DH_setState(VarPath, VarPointValue, VarBool) {
		if ((VarPointValue == 'undefined') || (VarPointValue == null)) {VarPointValue = "";}
		try {
            VarPointValue = JSON.parse(VarPointValue);
        } catch (StSer) {
		    if (LogData) {
			    this.log.info('Test DH_setState value: ' + VarPointValue + " return " + StSer);
		    }
		}

        var Typeof = Object.prototype.toString.call(VarPointValue).match(/\s([\w]+)/)[1].toLowerCase();
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
                VarPointValue = VarPointValue;
                break;
            case 'json':
                VarPointValue = JSON.stringify(VarPointValue);
                break;
        }

		if (LogData) {
            this.log.info('Send action | to set Path is:' + VarPath + " | to set Data is: " + VarPointValue);
		}
		await this.setState(VarPath, VarPointValue, VarBool);
	}
    async jsonFromString(str) {
        const matches = str.match(/[{\[]{1}([,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis);
        return Object.assign({}, ...matches.map((m) => m)); //JSON.parse(m)));
    }

    async UpdateRoomSettings(RoomInd, ChangeType, ChangeVal) {
        //this.log.info('Changed:' + ChangeType + ' to ' + ChangeVal);
        var stateSuctionLevel, stateWaterVolume, stateRepeats, stateCleaningMode, stateRoute, stateSuctionLevelOb, stateWaterVolumeOb, stateRepeatsOb,
            stateCleaningModeOb, stateRouteOb;
        var RoomIdOb = await this.getStateAsync(RoomInd + ".RoomOrder");
        const RoomId = RoomIdOb.val;
        var TosRetString = '{\"customeClean\":[[' + RoomId;
        switch (ChangeType) {
            case 1:
                stateSuctionLevel = ChangeVal;
                stateWaterVolumeOb = await this.getStateAsync(RoomInd + ".WaterVolume");
                stateWaterVolume = stateWaterVolumeOb.val;
                stateRepeatsOb = await this.getStateAsync(RoomInd + ".Repeat");
                stateRepeats = stateRepeatsOb.val;
                stateCleaningModeOb = await this.getStateAsync(RoomInd + ".CleaningMode");
                stateCleaningMode = stateCleaningModeOb.val;
                stateRouteOb = await this.getStateAsync(RoomInd + ".Route");
                stateRoute = stateRouteOb.val;
                TosRetString += "," + stateSuctionLevel + "," + stateWaterVolume + "," + stateRepeats + "," + stateCleaningMode + "," + stateRoute + ']]}';
                break;
            case 2:
                stateSuctionLevelOb = await this.getStateAsync(RoomInd + ".Level");
                stateSuctionLevel = stateSuctionLevelOb.val;
                stateWaterVolume = ChangeVal;
                stateRepeatsOb = await this.getStateAsync(RoomInd + ".Repeat");
                stateRepeats = stateRepeatsOb.val;
                stateCleaningModeOb = await this.getStateAsync(RoomInd + ".CleaningMode");
                stateCleaningMode = stateCleaningModeOb.val;
                stateRouteOb = await this.getStateAsync(RoomInd + ".Route");
                stateRoute = stateRouteOb.val;
                TosRetString += "," + stateSuctionLevel + "," + stateWaterVolume + "," + stateRepeats + "," + stateCleaningMode + "," + stateRoute + ']]}';
                break;
            case 3:
                stateSuctionLevelOb = await this.getStateAsync(RoomInd + ".Level");
                stateSuctionLevel = stateSuctionLevelOb.val;
                stateWaterVolumeOb = await this.getStateAsync(RoomInd + ".WaterVolume");
                stateWaterVolume = stateWaterVolumeOb.val;
                stateRepeats = ChangeVal;
                stateCleaningModeOb = await this.getStateAsync(RoomInd + ".CleaningMode");
                stateCleaningMode = stateCleaningModeOb.val;
                stateRouteOb = await this.getStateAsync(RoomInd + ".Route");
                stateRoute = stateRouteOb.val;
                TosRetString += "," + stateSuctionLevel + "," + stateWaterVolume + "," + stateRepeats + "," + stateCleaningMode + "," + stateRoute + ']]}';
                break;
            case 4:
                stateSuctionLevelOb = await this.getStateAsync(RoomInd + ".Level");
                stateSuctionLevel = stateSuctionLevelOb.val;
                stateWaterVolumeOb = await this.getStateAsync(RoomInd + ".WaterVolume");
                stateWaterVolume = stateWaterVolumeOb.val;
                stateRepeatsOb = await this.getStateAsync(RoomInd + ".Repeat");
                stateRepeats = stateRepeatsOb.val;
                stateCleaningMode = ChangeVal;
                stateRouteOb = await this.getStateAsync(RoomInd + ".Route");
                stateRoute = stateRouteOb.val;
                TosRetString += "," + stateSuctionLevel + "," + stateWaterVolume + "," + stateRepeats + "," + stateCleaningMode + "," + stateRoute + ']]}';
                break;
            case 5:
                stateSuctionLevelOb = await this.getStateAsync(RoomInd + ".Level");
                stateSuctionLevel = stateSuctionLevelOb.val;
                stateWaterVolumeOb = await this.getStateAsync(RoomInd + ".WaterVolume");
                stateWaterVolume = stateWaterVolumeOb.val;
                stateRepeatsOb = await this.getStateAsync(RoomInd + ".Repeat");
                stateRepeats = stateRepeatsOb.val;
                stateCleaningModeOb = await this.getStateAsync(RoomInd + ".CleaningMode");
                stateCleaningMode = stateCleaningModeOb.val;
                stateRoute = ChangeVal;
                TosRetString += "," + stateSuctionLevel + "," + stateWaterVolume + "," + stateRepeats + "," + stateCleaningMode + "," + stateRoute + ']]}';
                break;
        }
        //this.log.info(' ======> Command:' + TosRetString);
        return TosRetString.toString();
    }
    async DH_refreshToken() {

        await this.DH_requestClient({
            method: 'post',
            maxBodyLength: Infinity,
            url: DH_URLTK,
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Language": "en-US;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "User-Agent": DH_URLUSA,
                "Dreame-Rlc": DH_URLDRLC,
                "Authorization": DH_URLAUTH,
                "Tenant-Id": DH_Tenant,
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
            var RetObject = JSON.parse(JSON.stringify(responseData));

            await this.DH_PropObject(RetObject, "login.", "Refresh Token: ");

            DH_Auth = responseData["access_token"];
            DH_AuthRef = responseData["refresh_token"];
            DH_Expires = responseData["expires_in"];
            DH_Tenant = responseData["tenant_id"];
            DH_Country = responseData["country"];
            DH_Uid = responseData["uid"];
            DH_Lang = responseData["lang"];
            DH_Region = responseData["region"];
            DH_Islogged = true;
            this.DH_connectMqtt();
            this.setState('info.connection', true, true);
        }).catch((error) => {
            this.log.warn('Refresh Token error: ' + JSON.stringify(error));
            error.response && this.log.error('Refresh Token error response: ' + JSON.stringify(error.response.data));
            this.setState('info.connection', false, true);
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
			this.log.info("cleaned everything up...");
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
                let command = id.split('.')[4];
				if (LogData) {
                    this.log.info("Receive command: " + command + " | Device: " + deviceId + " | folder: " + folder + " | value " + state.val);
                }
                if (id.indexOf(".NewMap") !== -1) {
                    this.log.info("Generate Map");
                    await this.DH_GenerateMap();
					this.setStateAsync(id, false, true);
					return;
                }
				if (id.toString().indexOf('.control.') != -1) {
                    for (var [SPkey, SPvalue] of Object.entries(DreameActionProperties)) {
                        var ControlObject = SPvalue.replace(/\w\S*/g, function(SPName) {
                            return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                        }).replace(/\s/g, '');
                        if (id.split('.').pop() == ControlObject) {
                            const requestId = Math.floor(Math.random() * 9000) + 1000;
                            this.log.info("Send Command: " + SPvalue);
                            var GetSIID = parseInt((SPkey.split("S")[1] || "").split("A")[0]);
                            var GetAIID = '';
							if (SPkey.indexOf("C") !== -1) {
                                GetAIID = parseInt((SPkey.split("A")[1] || "").split("C")[0]);
							} else {
							    GetAIID = parseInt(SPkey.replace("S" + GetSIID + "A", ""));
							}
							if (SPkey.indexOf("P") !== -1) {
				                GetAIID = parseInt((SPkey.split("P")[1] || "").split("C")[0]);
			                }

                            var GetSIIDAIID = GetSIID + "." + GetAIID;
							var PiidAction = '[1]'
							if (DreameActionParams[SPkey] !== "false") {
								PiidAction = state.val;
								if (Object.prototype.toString.call(PiidAction).match(/\s([\w]+)/)[1].toLowerCase() !== 'boolean') {
									try {
										PiidAction = JSON.parse(PiidAction);
										//this.log.info('Validate ' + PiidAction);
                                    } catch (errJS) {
									   this.log.warn('Error! ' + PiidAction + ' value is not json');
									}
							    }
                            }

                            var SETURLData = {
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
                                var GetCloudRequestDeviceData = await this.DH_URLSend(DH_Domain + DH_DHURLSENDA + DH_Host + DH_DHURLSENDB, SETURLData);
                                let path = DH_Did + ".control." + SPvalue.replace(/\w\S*/g, function(SPName) {
                                    return SPName.charAt(0).toUpperCase() + SPName.substr(1).toLowerCase();
                                }).replace(/\s/g, '');
								var GetobjTypeC = await this.getObjectAsync(path);
								if (GetobjTypeC.common.type == "boolean") {
                                   await this.setState(path, false, true);
								}
                            } catch (err) {
                                this.log.warn('Setting "' + SPvalue + '" State failed: ' + err);
                            }
                            break;
                            return;
                        }
                    }
                }
                if (id.indexOf(".showlog") !== -1) {
                    LogData = state.val;
                    if (LogData) {
                        this.log.info("Show log has been activated");
                    } else {
                        this.log.info("Show log has been disabled");
                    }
                    return;
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
    module.exports = (options) => new Dreame(options);
} else {
    // otherwise start the instance directly
    new Dreame();
}