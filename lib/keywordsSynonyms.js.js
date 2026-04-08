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
    'durchgang': 'Korridor',
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

// Extended Synonyms for Carpet Cleaning
const carpetKeywords = {
  'EN': ['carpet', 'rug', 'carpeting', 'floor mat', 'area rug', 'persian rug', 'doormat'],
  'DE': ['teppich', 'teppichboden', 'vorleger', 'wohnfläche', 'läufer', 'fußmatte', 'orientteppich'],
  'FR': ['tapis', 'moquette', 'descente de lit'],
  'ES': ['alfombra', 'tapete', 'felpudo'],
  'IT': ['tappeto', 'stuoia'],
  'NL': ['tapijt', 'kleed', 'deurmat']
};

const carpetCleanActions = {
  'EN': ['clean', 'wash', 'refresh', 'shampoo', 'vacuum', 'deep clean', 'sanitize', 'freshen up'],
  'DE': ['reinigen', 'säubern', 'waschen', 'pflegen', 'staubsaugen', 'grundreinigung', 'sanieren', 'auffrischen', 'saugen'],
  'FR': ['nettoyer', 'laver', 'shampooing'],
  'ES': ['limpiar', 'lavar', 'aspirar'],
  'IT': ['pulire', 'lavare', 'shampoo'],
  'NL': ['schoonmaken', 'wassen', 'reinigen']
};

// Universal intensity parameters with language-specific keywords
const intensityParams = {
  'quiet': {
    suctionLevel: 1,
    repetitions: 1,
    keywords: {
      'EN': ['light', 'quiet', 'silent', 'low', 'soft', 'eco', 'gentle', 'whisper'],
      'DE': ['leicht', 'leise', 'ruhig', 'niedrig', 'sanft', 'schonend', 'flüsterleise'],
      'FR': ['léger', 'silencieux', 'doux', 'bas', 'calme'],
      'ES': ['ligero', 'silencioso', 'bajo', 'suave', 'eco'],
      'IT': ['leggero', 'silenzioso', 'basso', 'morbido', 'eco'],
      'NL': ['licht', 'stil', 'zacht', 'laag', 'eco']
    }
  },
  'standard': {
    suctionLevel: 2,
    repetitions: 1,
    keywords: {
      'EN': ['medium', 'normal', 'standard', 'regular', 'default'],
      'DE': ['mittel', 'normal', 'standard', 'regulär', 'default'],
      'FR': ['moyen', 'normal', 'standard', 'régulier'],
      'ES': ['medio', 'normal', 'estándar', 'regular'],
      'IT': ['medio', 'normale', 'standard', 'regolare'],
      'NL': ['gemiddeld', 'normaal', 'standaard', 'regulier']
    }
  },
  'strong': {
    suctionLevel: 3,
    repetitions: 2,
    keywords: {
      'EN': ['strong', 'high', 'powerful', 'intense', 'deep'],
      'DE': ['stark', 'hoch', 'kraftvoll', 'intensiv', 'tief'],
      'FR': ['fort', 'élevé', 'puissant', 'intense', 'profond'],
      'ES': ['fuerte', 'alto', 'potente', 'intenso', 'profundo'],
      'IT': ['forte', 'alto', 'potente', 'intenso', 'profondo'],
      'NL': ['sterk', 'hoog', 'krachtig', 'intens', 'diep']
    }
  },
  'turbo': {
    suctionLevel: 4,
    repetitions: 3,
    keywords: {
      'EN': ['maximum', 'turbo', 'boost', 'max', 'full', 'ultra', 'highest'],
      'DE': ['maximal', 'turbo', 'boost', 'max', 'voll', 'ultra', 'höchste'],
      'FR': ['maximum', 'turbo', 'boost', 'max', 'plein', 'ultra'],
      'ES': ['máximo', 'turbo', 'boost', 'max', 'completo', 'ultra'],
      'IT': ['massimo', 'turbo', 'boost', 'max', 'completo', 'ultra'],
      'NL': ['maximaal', 'turbo', 'boost', 'max', 'vol', 'ultra']
    }
  }
};

// Keywords for dining table cleaning
const diningTableKeywords = {
  'EN': ['dining table', 'diningtable', 'table', 'kitchen table', 'eating table', 'dinner table'],
  'DE': ['esstisch', 'esszimmertisch', 'küchentisch', 'tischt', 'speisetisch'],
  'FR': ['table à manger', 'table de salle à manger'],
  'ES': ['mesa de comedor', 'mesa del comedor'],
  'IT': ['tavolo da pranzo', 'tavolo della sala da pranzo'],
  'NL': ['eettafel', 'tafel']
};

// Keywords for dining table actions (cleaning actions)
const diningTableActions = {
  'EN': ['clean', 'vacuum', 'mop', 'clean under', 'clean around', 'wipe'],
  'DE': ['reinigen', 'säubern', 'saugen', 'wischen', 'putzen', 'sauber machen'],
  'FR': ['nettoyer', 'laver', 'aspirer'],
  'ES': ['limpiar', 'aspirar', 'trapear'],
  'IT': ['pulire', 'aspirare', 'lavare'],
  'NL': ['schoonmaken', 'stofzuigen', 'dweilen']
};

// Extended cleaning parameters for dining tables with separate modes
const diningTableIntensityParams = {
  'sweep_only': {
    suctionLevel: 3,
    waterVolume: -1,
    repetitions: 1,
    keywords: {
      'EN': ['sweep', 'sweeping', 'vacuum', 'vacuuming', 'dry clean', 'suck'],
      'DE': ['saugen', 'staubsaugen', 'trocken', 'trocken reinigen', 'aufsaugen'],
      'FR': ['balayer', 'aspirer', 'nettoyer à sec'],
      'ES': ['barrer', 'aspirar', 'limpiar en seco'],
      'IT': ['spazzare', 'aspirare', 'pulire a secco'],
      'NL': ['vegen', 'stofzuigen', 'droog reinigen']
    }
  },
  'mop_only': {
    suctionLevel: -1,
    waterVolume: 28,
    repetitions: 1,
    keywords: {
      'EN': ['mop', 'mopping', 'wet clean', 'wipe', 'wash'],
      'DE': ['wischen', 'nass', 'nass reinigen', 'abwischen', 'feucht'],
      'FR': ['serpillère', 'nettoyer humide', 'laver'],
      'ES': ['trapear', 'limpiar húmedo', 'fregar'],
      'IT': ['pulire umido', 'lavare', 'strofinare'],
      'NL': ['dweilen', 'nat reinigen', 'wassen']
    }
  },
  'quick': {
    suctionLevel: 2,
    waterVolume: 16,
    repetitions: 1,
    keywords: {
      'EN': ['quick', 'fast', 'light', 'brief'],
      'DE': ['schnell', 'kurz', 'leicht', 'flüchtig'],
      'FR': ['rapide', 'court', 'léger'],
      'ES': ['rápido', 'corto', 'ligero'],
      'IT': ['veloce', 'breve', 'leggero'],
      'NL': ['snel', 'kort', 'licht']
    }
  },
  'standard': {
    suctionLevel: 3,
    waterVolume: 28,
    repetitions: 1,
    keywords: {
      'EN': ['standard', 'normal', 'regular'],
      'DE': ['standard', 'normal', 'regulär'],
      'FR': ['standard', 'normal', 'régulier'],
      'ES': ['estándar', 'normal', 'regular'],
      'IT': ['standard', 'normale', 'regolare'],
      'NL': ['standaard', 'normaal', 'regulier']
    }
  },
  'thorough': {
    suctionLevel: 4,
    waterVolume: 32,
    repetitions: 2,
    keywords: {
      'EN': ['thorough', 'deep', 'intensive', 'complete'],
      'DE': ['gründlich', 'tief', 'intensiv', 'vollständig'],
      'FR': ['approfondi', 'complet', 'intensif'],
      'ES': ['completo', 'profundo', 'intensivo'],
      'IT': ['completo', 'profondo', 'intensivo'],
      'NL': ['grondig', 'diep', 'intensief']
    }
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
	  'MopPadA': ['mop pad a', 'mop a', 'cloth a', 'pad a'],
    'MopPadB': ['mop pad b', 'mop b', 'cloth b', 'pad b'],
    'MopPadC': ['mop pad c', 'mop c', 'cloth c', 'pad c'],
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
    'MopPadA': ['wischpad a', 'moppad a', 'mop a', 'wischtuch a', 'wischtücher a', 'pad a'],
    'MopPadB': ['wischpad b', 'moppad b', 'mop b', 'wischtuch b', 'wischtücher b', 'pad b'],
    'MopPadC': ['wischpad c', 'moppad c', 'mop c', 'wischtuch c', 'wischtücher c', 'pad c'],
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
  'BatteryLevel': {
    id: 'BatteryLevel',
    label: {
      'EN': 'Battery level',
      'DE': 'Batteriestand',
    }
  },
  'CurrentRoomCleaningName': {
    id: 'CurrentRoomCleaningName',
    label: {
      'EN': 'The vacuum is currently in the',
      'DE': 'Der Saugroboter befindet sich derzeit im',
    }
  },
  'Detergent': {
    id: 'Detergent',
    label: {
      'EN': 'Detergent',
      'DE': 'Reinigungsmittel',
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
  'Filter': {
    id: 'Filter',
    label: {
      'EN': 'Filter',
      'DE': 'Filter',
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
  'MainBrush': {
    id: 'MainBrush',
    label: {
      'EN': 'Main Brush',
      'DE': 'Hauptbürste',
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
  'MopPad': {
    id: 'MopPad',
    label: {
      'EN': 'Mop Pad',
      'DE': 'Mopp-Pad',
    }
  },
  'MopPadA': {
    id: 'MopPadA',
    label: {
      'EN': 'Mop Pad A',
      'DE': 'Mopp-Pad A',
    }
  },
  'MopPadALeft': {
    id: 'MopPadALeft',
    label: {
      'EN': 'Mop Pad A Left',
      'DE': 'Mopp-Pad A verbleibend',
    }
  },
  'MopPadATimeLeft': {
    id: 'MopPadATimeLeft',
    label: {
      'EN': 'Mop Pad A Time Left',
      'DE': 'Mopp-Pad A verbleibende Zeit',
    }
  },
  'MopPadB': {
    id: 'MopPadB',
    label: {
      'EN': 'Mop Pad B',
      'DE': 'Mopp-Pad B',
    }
  },
  'MopPadBLeft': {
    id: 'MopPadBLeft',
    label: {
      'EN': 'Mop Pad B Left',
      'DE': 'Mopp-Pad B verbleibend',
    }
  },
  'MopPadBTimeLeft': {
    id: 'MopPadBTimeLeft',
    label: {
      'EN': 'Mop Pad B Time Left',
      'DE': 'Mopp-Pad B verbleibende Zeit',
    }
  },
  'MopPadC': {
    id: 'MopPadC',
    label: {
      'EN': 'Mop Pad C',
      'DE': 'Mopp-Pad C',
    }
  },
  'MopPadCLeft': {
    id: 'MopPadCLeft',
    label: {
      'EN': 'Mop Pad C Left',
      'DE': 'Mopp-Pad C verbleibend',
    }
  },
  'MopPadCTimeLeft': {
    id: 'MopPadCTimeLeft',
    label: {
      'EN': 'Mop Pad C Time Left',
      'DE': 'Mopp-Pad C verbleibende Zeit',
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
  'PureWaterTank': {
    id: 'PureWaterTank',
    label: {
      'EN': 'Pure Water Tank',
      'DE': 'Reines Wasser Tank',
    }
  },
  'SecondaryFilter': {
    id: 'SecondaryFilter',
    label: {
      'EN': 'Secondary Filter',
      'DE': 'Sekundärfilter',
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
  'Sensor': {
    id: 'Sensor',
    label: {
      'EN': 'Sensor',
      'DE': 'Sensor',
    }
  },
  'SensorLeft': {
    id: 'SensorLeft',
    label: {
      'EN': 'Left Sensor',
      'DE': 'Linker Sensor',
    }
  },
  'SensorTimeLeft': {
    id: 'SensorTimeLeft',
    label: {
      'EN': 'Sensor Time Left',
      'DE': 'Sensor verbleibende Zeit',
    }
  },
  'SideBrush': {
    id: 'SideBrush',
    label: {
      'EN': 'Side Brush',
      'DE': 'Seitenbürste',
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
  },
  'SilverIon': {
    id: 'SilverIon',
    label: {
      'EN': 'Silver Ion',
      'DE': 'Silberionen',
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
  'State': {
    id: 'State',
    label: {
      'EN': 'Vacuum status',
      'DE': 'Saugroboter-Status',
    }
  }
};

const knownComponentSynonyms = {
  'EN': {
    'Sensor': ['sensor', 'sensors'],
    'SensorLeft': ['left sensor', 'sensor left', 'left side sensor'],
    'SensorTimeLeft': ['sensor time', 'sensor time left', 'remaining sensor time'],

    'MainBrush': ['main brush', 'brush', 'mainbristle', 'main roller', 'roller brush'],
    'MainBrushLeft': ['main brush left', 'brush left', 'remaining main brush'],
    'MainBrushTimeLeft': ['main brush time left', 'brush time', 'main brush duration'],

    'SideBrush': ['side brush', 'sidebristle', 'side roller'],
    'SideBrushLeft': ['side brush left', 'remaining side brush'],
    'SideBrushTimeLeft': ['side brush time left', 'side brush duration'],

    'Filter': ['filter', 'dust filter', 'air filter'],
    'FilterLeft': ['filter left', 'dust filter left', 'remaining filter'],
    'FilterTimeLeft': ['filter time left', 'filter duration'],

    'SecondaryFilter': ['secondary filter', 'hepa filter', 'extra filter', 'backup filter'],
    'SecondaryFilterLeft': ['secondary filter time left', 'secondary filter duration'],
    'SecondaryFilterTimeLeft': ['secondary filter time left', 'secondary filter duration'],

    // Mop Pads - General (non-Matrix) and Matrix-specific
    'MopPad': ['mop', 'mop pad', 'cloth', 'mopping pad', 'pad'],
    'MopPadLeft': ['mop left', 'mop remaining', 'pad remaining'],
    'MopPadTimeLeft': ['mop time left', 'mop pad time', 'remaining mop time'],

    // Matrix-specific Mop Pads
    'MopPadA': ['mop pad a', 'mop a', 'cloth a', 'pad a', 'mopa'],
    'MopPadALeft': ['mop a left', 'mop a remaining', 'pad a remaining'],
    'MopPadATimeLeft': ['mop a time left', 'mop pad a time', 'remaining mop a time'],

    'MopPadB': ['mop pad b', 'mop b', 'cloth b', 'pad b', 'mopb'],
    'MopPadBLeft': ['mop b left', 'mop b remaining', 'pad b remaining'],
    'MopPadBTimeLeft': ['mop b time left', 'mop pad b time', 'remaining mop b time'],

    'MopPadC': ['mop pad c', 'mop c', 'cloth c', 'pad c', 'mopc'],
    'MopPadCLeft': ['mop c left', 'mop c remaining', 'pad c remaining'],
    'MopPadCTimeLeft': ['mop c time left', 'mop pad c time', 'remaining mop c time'],

    // Other components
    'SilverIon': ['silver ion', 'ion', 'silver', 'ion cartridge'],
    'SilverIonLeft': ['silver ion left', 'ion left', 'remaining silver ion'],
    'SilverIonTimeLeft': ['silver ion time left', 'ion time', 'silver ion duration'],

    'Detergent': ['detergent', 'cleaning liquid', 'soap', 'cleaner', 'cleaning solution'],
    'DetergentLeft': ['detergent left', 'soap left', 'remaining detergent'],
    'DetergentTimeLeft': ['detergent time left', 'soap time', 'detergent duration'],

    'PureWaterTank': ['pure water tank', 'clean water', 'water tank', 'fresh water tank'],
    'DirtyWaterTank': ['dirty water tank', 'waste water', 'used water', 'dirty tank'],
    'BatteryLevel': ['battery', 'battery level', 'charge', 'battery status'],
    'Error': ['error', 'error message', 'problem', 'issue', 'alert'],
    'State': ['current state'],
    'CurrentRoomCleaningName': ['current room', 'room', 'cleaning room', 'room being cleaned']
  },
  'DE': {
    'Sensor': ['sensor', 'sensoren'],
    'SensorLeft': ['linker sensor', 'sensor links', 'sensor auf der linken seite'],
    'SensorTimeLeft': ['sensorzeit', 'sensor verbleibende zeit', 'sensor restzeit'],

    'MainBrush': ['hauptbürste', 'bürste', 'hauptbuerste', 'hauptrolle', 'bürstenrolle'],
    'MainBrushLeft': ['hauptbürste übrig', 'hauptbürstenrest'],
    'MainBrushTimeLeft': ['hauptbürstenzeit', 'hauptbürste restzeit'],

    'SideBrush': ['seitenbürste', 'seitenbuerste', 'seitenrolle'],
    'SideBrushLeft': ['seitenbürste übrig', 'seitenbürstenrest'],
    'SideBrushTimeLeft': ['seitenbürstenzeit', 'seitenbürste restzeit'],

    'Filter': ['filter', 'staubfilter', 'luftfilter'],
    'FilterLeft': ['filter verbleibend', 'staubfilter übrig', 'filterrest'],
    'FilterTimeLeft': ['filter zeit', 'filter restzeit'],

    'SecondaryFilter': ['sekundärfilter', 'hepa-filter', 'zusatzfilter', 'ersatzfilter'],
    'SecondaryFilterLeft': ['sekundärfilter verbleibend', 'sekundärstaubfilter übrig', 'sekundärfilterrest'],
    'SecondaryFilterTimeLeft': ['sekundärfilter zeit', 'sekundärfilter restzeit'],

    // Moppads - Allgemein (nicht-Matrix) und Matrix-spezifisch
    'MopPad': ['mopp', 'mopp-pad', 'wischtuch', 'wischpad', 'pad'],
    'MopPadLeft': ['mopp verbleibend', 'wischtuch übrig', 'wischpad rest'],
    'MopPadTimeLeft': ['mopp zeit', 'wischtuchzeit', 'pad restzeit'],

    // Matrix-spezifische Moppads
    'MopPadA': ['wischpad a', 'moppad a', 'mop a', 'wischtuch a', 'pad a', 'mopa'],
    'MopPadALeft': ['mopp a verbleibend', 'wischtuch a übrig', 'wischpad a rest'],
    'MopPadATimeLeft': ['mopp a zeit', 'wischtuch a zeit', 'pad a restzeit'],

    'MopPadB': ['wischpad b', 'moppad b', 'mop b', 'wischtuch b', 'pad b', 'mopb'],
    'MopPadBLeft': ['mopp b verbleibend', 'wischtuch b übrig', 'wischpad b rest'],
    'MopPadBTimeLeft': ['mopp b zeit', 'wischtuch b zeit', 'pad b restzeit'],

    'MopPadC': ['wischpad c', 'moppad c', 'mop c', 'wischtuch c', 'pad c', 'mopc'],
    'MopPadCLeft': ['mopp c verbleibend', 'wischtuch c übrig', 'wischpad c rest'],
    'MopPadCTimeLeft': ['mopp c zeit', 'wischtuch c zeit', 'pad c restzeit'],

    // Andere Komponenten
    'SilverIon': ['silberionen', 'ionen', 'silber', 'ionenkartusche'],
    'SilverIonLeft': ['silberionen verbleibend', 'ionen übrig'],
    'SilverIonTimeLeft': ['silberionen zeit', 'verbleibende silberionenzeit'],

    'Detergent': ['reinigungsmittel', 'seife', 'reiniger', 'putzmittel', 'reinigungslösung'],
    'DetergentLeft': ['reinigungsmittel übrig', 'seife verbleibend', 'mittelrest'],
    'DetergentTimeLeft': ['reinigungsmittel zeit', 'reinigungsmittel restzeit'],

    'PureWaterTank': ['frischwassertank', 'reines wasser', 'wassertank', 'sauberwassertank'],
    'DirtyWaterTank': ['schmutzwassertank', 'dreckwasser', 'gebrauchtes wasser', 'abwassertank'],
    'BatteryLevel': ['akku', 'batterie', 'batteriestand', 'akkustand'],
    'Error': ['fehler', 'fehlermeldung', 'problem', 'störung', 'meldung'],
    'State': ['aktueller stand'],
    'CurrentRoomCleaningName': ['raum', 'aktueller raum', 'gereinigter raum', 'momentaner raum']
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
    // General functions (0-99)
    0: 'Alexa is active, and the robot accepts voice commands. You can simply say: "Alexa, help with the robot" or "Alexa, support for the vacuum" or "Alexa, manual for the robot vacuum" or "Alexa, guide for the cleaning robot".',
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
    28: 'at',
    29: (RoomList) => `Please check the settings. The following rooms have an invalid cleaning mode: ${RoomList}.`,
    30: (roomId) => [
      `Fallback data for room "${roomId}" is incomplete - "cleanOrder" is null. It was automatically set to 1.`,
      `Please check and fix it manually in the Dreame app:`,
      `1. Open Dreame app`,
      `2. Go to "Map management"`,
      `3. Select "Cleaning order"`,
      `4. Drag and drop rooms into the desired order`,
      `5. Save changes`,
      `6. Start a short cleaning and stop it immediately (updates cleanset object)`
    ].join('\n'),

    // Emptying the dustbin (100-199)
    100: 'Emptying the dustbin',
    101: 'The robot is emptying the dustbin.',
    102: 'Dustbin emptying completed.',
    103: 'EMPTYING',
    104: 'To empty the dustbin, use the following commands:',
    105: ' - "Alexa, empty the robot\'s dustbin"',
    106: ' - "Alexa, clean the robot\'s dust container"',
    107: 'Available emptying commands:',

    // Washing the mop (200-299)
    200: 'Washing the mop',
    201: 'The robot is washing the mop.',
    202: 'Mop washing completed.',
    203: 'MOP WASHING',
    204: 'To wash the mop, use the following commands:',
    205: ' - "Alexa, wash the robot\'s mop"',
    206: ' - "Alexa, clean the robot\'s mopping pad"',
    207: 'Available mop washing commands:',

    // Checking component status (300-399)
    300: 'Checking component status',
    301: 'Cleaning is paused. Executing resume.',
    302: 'Resume not possible',
    303: 'Here is the status of the robot components: ',
    304: 'STATUS CHECK',
    305: 'To check the status, use the following commands:',
    306: ' - "Alexa, what\'s the robot\'s status?"',
    307: ' - "Alexa, check the robot\'s filter status"',
    308: 'Available status commands:',

    // Resetting components (400-499)
    400: 'Resetting components',
    401: (RoomcompId) => `${RoomcompId} reset triggered.`,
    402: (RoomcompId) => `Reset failed for ${RoomcompId}.`,
    403: 'All components have been reset.',
    404: 'No reset action found for this component.',
    405: (RoomcompId) => `${RoomcompId} has been reset.`,
    406: (RoomcompId) => `Reset not available for ${RoomcompId}.`,
    407: 'Suggest reset',
    408: 'All components with value 0 have been reset.',
    409: 'RESET',
    410: 'To reset components, use the following commands:',
    411: ' - "Alexa, reset all robot components"',
    412: ' - "Alexa, reset the robot\'s side brush"',
    413: 'Available reset commands:',

    // Room cleaning (500-599)
    500: 'Room cleaning',
    501: 'All rooms were cleaned.',
    502: (Roomnumber, Roomname) => `Cleaning of room ${Roomnumber} (${Roomname}) was aborted due to an error.`,
    503: (RoomFinished) => `Cleaning in room ${RoomFinished} completed.`,
    504: (RoomResume) => `Cleaning in room ${RoomResume} has resumed.`,
    505: 'For room cleaning, use these patterns:',
    506: ' - "Alexa, vacuum {ROOM} on {quiet, standard, strong or turbo}"',
    507: ' - "Alexa, mopping {ROOM} {low, medium or high}"',
    508: ' - "Alexa, {ROOM} {NUMBER} times quiet vacuum and {ROOM} {NUMBER} times high mopping"',
    509: 'Available suction levels: quiet, standard, strong or turbo',
    510: 'Available mopping levels: low (dry), medium (damp) or high (wet)',

    // Carpet cleaning (600-699)
    600: 'Carpet cleaning',
    601: 'Carpet cleaning could not be started',
    602: '',
    603: 'No valid carpet areas found',
    604: (rooms) => `No intensity specified for carpet cleaning in ${rooms}. Please specify cleaning intensity: light, medium or strong`,
    605: (rooms, intensities) => {
      const [mainRooms, mainIntensity] = intensities.shift();
      if (intensities.length === 0) {
        return `Starting ${mainIntensity} carpet cleaning in ${mainRooms}`;
      }
      const otherParts = intensities.map(([rooms, intensity]) =>
        `${rooms} with ${intensity}`
      );
      return `Starting ${mainIntensity} carpet cleaning in ${mainRooms} and ${otherParts.join(' and ')}`;
    },
    606: reps => `${reps} times`,
    607: 'For carpet cleaning, use these patterns:',
    608: ' - "Alexa, clean the carpet in the {ROOM} on {light, medium or strong} mode"',
    609: ' - "Alexa, shampoo {ROOM} carpet on {intensity}"',
    610: 'Available carpet intensities: light, medium or strong',

    // Dining table cleaning (700-799)
    700: 'Dining table cleaning',
    701: (roomName) => `Starting dining table cleaning in ${roomName}`,
    702: 'No dining table found in any room. Please set up a dining table zone first.',
    703: 'Dining table cleaning completed successfully.',
    704: 'Dining table cleaning could not be started.',
    705: 'Dining table zone found in',
    706: 'For dining table cleaning, use these patterns:',
    707: ' - "Alexa, clean the dining table in the {ROOM}"',
    708: ' - "Alexa, vacuum under the kitchen table" (sweeping only)',
    709: ' - "Alexa, mop around the dining table" (mopping only)',
    710: ' - "Alexa, clean dining table thoroughly" (sweeping & mopping)',
    711: 'Available modes: sweeping only, mopping only, quick, standard or thorough',

    // Learning system (800-899)
    800: 'Learning system',
    801: 'Learning system is active and learning from cleanings.',
    802: 'I have automatically completed missing settings based on previous cleanings.',
    803: 'Auto-completed: ',
    804: (suction, mopping, room) => `Based on previous cleanings, I'm using ${suction} suction and ${mopping} mopping for ${room}.`,
    805: (count, room) => `I have learned from ${count} cleanings for ${room}.`,
    806: (room, suction, mopping, confidence) => `Recommendation for ${room}: ${suction} vacuuming, ${mopping} mopping (Confidence: ${confidence}%).`,
    807: 'Learning history has been cleared.',
    808: (room) => `Not enough history available for ${room}.`,
    809: 'Learning system has been reset.',
    810: 'Last cleaning has been ignored.',
    811: (rooms) => `Learned rooms: ${rooms}.`,
    812: 'Not enough data for a reliable recommendation.',
    813: 'Learning system has been successfully initialized.',
    814: (total, successful) => `Statistics: ${total} total cleanings, ${successful} successfully learned.`,
    815: 'Room not found in learning history.',
    816: (quality) => `Data quality: ${quality}.`,
    817: 'Learning skipped from this cleaning (under 80% coverage).',
    818: 'Successfully learned from this cleaning.',
    819: (input, detected, confidence) => `"${input}" detected as "${detected}" (${confidence}% confidence).`,
    820: 'Room detection based on synonyms and patterns.',
    821: (room, category) => `${room} is categorized as ${category}.`,
    822: 'This setting was chosen based on room type.',
    823: (room, repetitions) => `Setting ${repetitions} repetitions for ${room} based on learned patterns.`,
    824: (repetitions) => `${repetitions} repetitions detected from voice command.`,
    825: 'Typical repetitions learned from previous cleanings.',
    826: (room, typical) => `${room} is typically cleaned ${typical} times.`,
    827: 'Here is the robot\'s room statistics',
    // Detailed history
    828: (room, count, timeAgo, coverage, mode) => {
      const plural = count === 1 ? 'cleaning' : 'cleanings';
      return `I've analyzed ${count} ${plural} for ${room}. Last ${timeAgo} with ${coverage}% coverage (${mode}). `;
    },
    829: `More data is needed for detailed recommendations.`,
    830: (coverage, quality) => `The average coverage is ${coverage} percent, which is ${quality}. `,
    831: (rate) => `The success rate is ${rate} percent. `,
    832: (suction, mopping) => `The optimized settings are ${suction} suction and ${mopping} mopping. `,
    833: `These settings are very reliable. `,
    834: `These settings show good consistency. `,
    835: (reps) => `Typically, ${reps} passes are required. `,
    836: (time) => `Cleanings most often occur ${time}. `,
    837: `The settings are very consistent. `,
    838: `The settings show acceptable consistency. `,
    839: `Cleaning efficiency is continuously improving. `,
    840: `Coverage shows a slight decline. `,
    841: (rec) => `Recommendation: ${rec}`,
    842: (recs) => `Recommendations: ${recs}`,
    // Quality texts
    845: 'excellent',
    846: 'very good',
    847: 'good',
    848: 'acceptable',
    849: 'needs improvement',
    // Settings texts
    850: 'quiet',
    851: 'standard',
    852: 'strong',
    853: 'turbo',
    854: 'maximum',
    855: 'low',
    856: 'medium',
    857: 'high',
    // Time texts
    858: 'in the early morning',
    859: 'in the morning',
    860: 'around midday',
    861: 'in the afternoon',
    862: 'in the evening',
    863: 'in the late evening',
    864: 'at night',
    865: 'at various times of day',
    // Recommendation texts
    866: 'increase repetitions for better coverage',
    867: 'use stronger suction to require fewer passes',
    868: 'clean during daytime for better results',
    869: 'maintain current settings, they are working optimally',
    // Time expressions for relative time
    870: 'just now',
    871: (minutes) => `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`,
    872: (hours) => `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`,
    873: 'today',
    874: 'yesterday',
    875: (days) => `${days} days ago`,
    876: '1 week ago',
    877: (weeks) => `${weeks} weeks ago`,
    878: '1 month ago',
    879: (months) => `${months} months ago`,
    880: '1 year ago',
    881: (years) => `${years} years ago`,
    882: 'never',
    883: (mode) => `Mode ${mode}`,

    // Help menu and synonyms (900-999)
    900: 'Synonym examples and voice commands',
    901: 'What do you need help with? Here are the main options:',
    902: '1 Emptying the dustbin',
    903: '2 Washing the mop',
    904: '3 Checking component status',
    905: '4 Resetting components',
    906: '5 Room cleaning',
    907: '6 Carpet cleaning',
    908: '7 Dining table cleaning',
    909: '8 Synonym examples and voice commands',
    910: 'Just say the number or name of the option you want help with.',
    911: 'TIP: These synonyms work:',
    912: 'Say "more examples" for additional synonyms',
    913: 'No room examples',
    914: 'ROOMS',
    915: 'SUCTION',
    916: 'MOPPING',
    917: 'What else can I help with?',
    918: 'Sorry, I didn\'t understand that. Please try again.',
    919: 'Help session ended.',

    // Submenu for synonyms (920-949)
    920: 'Which synonym category would you like?',
    921: '1 Room names',
    922: '2 Suction levels',
    923: '3 Mopping levels',
    924: '4 Emptying commands',
    925: '5 Mop washing commands',
    926: '6 Status check commands',
    927: '7 Reset commands',
    928: '8 Dining table commands',
    929: '9 All synonym categories',
    930: 'Say the number or name',
    931: 'Room name synonyms:',
    932: 'Suction level synonyms:',
    933: 'Mopping level synonyms:',
    934: 'Emptying command synonyms:',
    935: 'Mop washing synonyms:',
    936: 'Status check synonyms:',
    937: 'Reset command synonyms:',
    938: 'Dining table synonyms:',
    939: 'Available room names:',
    940: 'Available suction levels:',
    941: 'Available mopping levels:',
    942: 'Available emptying commands:',
    943: 'Available mop washing commands:',
    944: 'Available status commands:',
    945: 'Available reset commands:',
    946: 'Available dining table commands:',
    947: 'Say "back" to return to the main menu.',
    948: 'Returning to main menu.',
  },
  'DE': {
    // 0-99: Allgemeine Funktionen
    0: 'Alexa ist aktiv, und der Roboter akzeptiert Sprachbefehle. Du kannst einfach sagen: "Alexa, Hilfe für den Roboter" oder "Alexa, Unterstützung für den Staubsauger" oder "Alexa, Anleitung für den Saugroboter" oder "Alexa, Assistenz für den Reinigungsroboter".',
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
    28: 'bei',
    29: (RoomList) => `Bitte prüfe die Einstellungen. Die folgenden Räume haben einen ungültigen Reinigungsmodus: ${RoomList}.`,
    30: (roomId) => [
      `Fallback-Daten für Raum "${roomId}" unvollständig – "cleanOrder" ist null. Wert wurde automatisch auf 1 gesetzt.`,
      `Bitte manuell in der Dreame-App überprüfen und korrigieren:`,
      `1. Dreame-App öffnen`,
      `2. Zur "Kartenverwaltung" navigieren`,
      `3. "Reinigungsreihenfolge" auswählen`,
      `4. Räume per Drag & Drop in gewünschte Reihenfolge bringen`,
      `5. änderungen speichern`,
      `6. Kurze Reinigung starten und sofort abbrechen (aktualisiert das cleanset-Objekt)`
    ].join('\n'),

    // 100-199: Staubbehälter leeren
    100: 'Staubbehälter leeren',
    101: 'Der Roboter entleert den Staubbehälter.',
    102: 'Entleerung abgeschlossen.',
    103: 'ENTLEEREN',
    104: 'Zum Leeren des Staubbehälters:',
    105: ' - "Alexa, leere den Roboter-Staubbehälter"',
    106: ' - "Alexa, reinige den Roboter-Staubbehälter"',
    107: 'Verfügbare Entleerungsbefehle:',

    // 200-299: Mopp waschen
    200: 'Mopp waschen',
    201: 'Der Roboter wäscht den Mopp.',
    202: 'Wischmopp-Wäsche abgeschlossen.',
    203: 'MOP-WäSCHE',
    204: 'Zum Waschen des Mopps:',
    205: ' - "Alexa, wasche den Roboter-Mopp"',
    206: ' - "Alexa, reinige das Roboter-Wischpad"',
    207: 'Verfügbare Mopp-Waschbefehle:',

    // 300-399: Komponentenstatus prüfen
    300: 'Komponentenstatus prüfen',
    301: 'Die Reinigung ist angehalten. Fortsetzung wird ausgeführt.',
    302: 'Fortsetzen nicht möglich.',
    303: 'Hier ist der Status der Roboterkomponenten: ',
    304: 'STATUSABFRAGE',
    305: 'Für Statusabfragen:',
    306: ' - "Alexa, wie ist der Status des Roboters?"',
    307: ' - "Alexa, prüfe den Roboter-Filterstatus"',
    308: 'Verfügbare Statusbefehle:',

    // 400-499: Komponenten zurücksetzen
    400: 'Komponenten zurücksetzen',
    401: (RoomcompId) => `${RoomcompId} zurückgesetzt.`,
    402: (RoomcompId) => `Zurücksetzen für ${RoomcompId} fehlgeschlagen.`,
    403: 'Alle Komponenten wurden zurückgesetzt.',
    404: 'Für diese Komponente wurde keine Zurücksetz-Aktion gefunden.',
    405: (RoomcompId) => `${RoomcompId} wurde zurückgesetzt.`,
    406: (RoomcompId) => `Zurücksetzen für ${RoomcompId} nicht verfügbar.`,
    407: 'Vorschlag zum Zurücksetzen',
    408: 'Alle Komponenten mit dem Wert 0 wurden zurückgesetzt.',
    409: 'RESET',
    410: 'Zum Zurücksetzen von Komponenten:',
    411: ' - "Alexa, setze alle Roboter-Komponenten zurück"',
    412: ' - "Alexa, setze die Roboter-Seitenbürste zurück"',
    413: 'Verfügbare Reset-Befehle:',

    // 500-599: Raumreinigung
    500: 'Raumreinigung',
    501: 'Alle Räume wurden gereinigt.',
    502: (Roomnumber, Roomname) => `Die Reinigung von Raum ${Roomnumber} (${Roomname}) wurde aufgrund eines Fehlers abgebrochen.`,
    503: (RoomFinished) => `Reinigung in Raum ${RoomFinished} abgeschlossen.`,
    504: (RoomResume) => `Die Reinigung im Raum ${RoomResume} wurde fortgesetzt.`,
    505: 'Für Raumreinigung:',
    506: ' - "Alexa, {ROOM} {leise, standard, stark oder turbo} saugen"',
    507: ' - "Alexa, {ROOM} {niedrig, mittel oder hoch} wischen"',
    508: ' - "Alexa, {ROOM} {NUMBER} mal leise saugen und {ROOM} {NUMBER} mal hoch wischen"',
    509: 'Saugstufen: leise, standard, stark oder turbo',
    510: 'Wischstufen: niedrig (trocken), mittel (feucht) oder hoch (nass)',

    // 600-699: Teppichreinigung
    600: 'Teppichreinigung',
    601: 'Teppichreinigung konnte nicht gestartet werden',
    602: '',
    603: 'Keine gültigen Teppichbereiche gefunden',
    604: (rooms) => `Kein Intensitätslevel für ${rooms} angegeben. Bitte geben Sie die Reinigungsintensität an: leicht, mittel oder stark.`,
    605: (rooms, intensities) => {
      const [mainRooms, mainIntensity] = intensities.shift();
      if (intensities.length === 0) {
        return `Starte ${mainIntensity} Teppichreinigung in ${mainRooms}`;
      }
      const otherParts = intensities.map(([rooms, intensity]) =>
        `${rooms} mit ${intensity}`
      );
      return `Starte ${mainIntensity} Teppichreinigung in ${mainRooms} und ${otherParts.join(' und ')}`;
    },
    606: reps => `${reps} mal`,
    607: 'Für Teppichreinigung:',
    608: ' - "Alexa, reinige den Teppich im {ROOM} im {leichten, mittleren oder starken} Modus"',
    609: ' - "Alexa, shampooniere {ROOM} teppich Intensität"',
    610: 'Teppich-Intensitäten: leicht, mittel oder stark',

    // 700-799: Esstisch-Reinigung
    700: 'Esstisch-Reinigung',
    701: (roomName) => `Starte die Esstisch-Reinigung im Raum ${roomName}`,
    702: 'Kein Esstisch in einem Raum gefunden. Bitte richten Sie zuerst eine Esstisch-Zone ein.',
    703: 'Esstisch-Reinigung erfolgreich abgeschlossen.',
    704: 'Esstisch-Reinigung konnte nicht gestartet werden.',
    705: 'Esstisch-Zone gefunden in',
    706: 'Für die Esstisch-Reinigung verwenden Sie diese Muster:',
    707: ' - "Alexa, reinige den Esstisch im {ROOM}"',
    708: ' - "Alexa, sauge unter dem Küchentisch" (nur Saugen)',
    709: ' - "Alexa, wische rund um den Esstisch" (nur Wischen)',
    710: ' - "Alexa, reinige den Esstisch gründlich" (Saugen & Wischen)',
    711: 'Verfügbare Modi: nur Saugen, nur Wischen, schnell, standard oder gründlich',

    // 800-899: Lernsystem
    800: 'Lernsystem',
    801: 'Lernsystem ist aktiv und lernt aus Reinigungen.',
    802: 'Ich habe fehlende Einstellungen automatisch ergänzt basierend auf vorherigen Reinigungen.',
    803: 'Automatische Ergänzung: ',
    804: (suction, mopping, room) => `Basierend auf vorherigen Reinigungen verwende ich ${suction} Saugstufe und ${mopping} Wischstufe für ${room}.`,
    805: (count, room) => `Ich habe ${count} Reinigungen für ${room} gelernt.`,
    806: (room, suction, mopping, confidence) => `Empfehlung für ${room}: ${suction} saugen, ${mopping} wischen (Zuversicht: ${confidence}%).`,
    807: 'Lernhistorie wurde gelöscht.',
    808: (room) => `Keine ausreichende Historie für ${room} vorhanden.`,
    809: 'Lernsystem wurde zurückgesetzt.',
    810: 'Letzte Reinigung wurde ignoriert.',
    811: (rooms) => `Gelernte Räume: ${rooms}.`,
    812: 'Zu wenig Daten für eine zuverlässige Empfehlung.',
    813: 'Das Lernsystem wurde erfolgreich initialisiert.',
    814: (total, successful) => `Statistik: ${total} Reinigungen total, ${successful} erfolgreich gelernt.`,
    815: 'Raum nicht in Lernhistorie gefunden.',
    816: (quality) => `Datenqualität: ${quality}.`,
    817: 'Lernen aus dieser Reinigung übersprungen (unter 80% Abdeckung).',
    818: 'Erfolgreich aus dieser Reinigung gelernt.',
    819: (input, detected, confidence) => `"${input}" erkannt als "${detected}" (${confidence}% Sicherheit).`,
    820: 'Raum-Erkennung basiert auf Synonymen und Mustern.',
    821: (room, category) => `${room} wird als ${category} kategorisiert.`,
    822: 'Diese Einstellung wurde basierend auf Raumtyp gewählt.',
    823: (room, repetitions) => `Setze ${repetitions} Wiederholungen für ${room} basierend auf gelernten Mustern.`,
    824: (repetitions) => `${repetitions} Wiederholungen aus Sprachbefehl erkannt.`,
    825: 'Typische Wiederholungen aus vorherigen Reinigungen gelernt.',
    826: (room, typical) => `${room} wird typischerweise ${typical} Mal gereinigt.`,
    827: 'Hier ist die Raumstatistik des Roboters',
    // detaillierte History
    828: (room, count, timeAgo, coverage, mode) => {
      const plural = count === 1 ? 'Reinigung' : 'Reinigungen';
      return `Ich habe ${count} ${plural} für ${room} analysiert. Zuletzt ${timeAgo} mit ${coverage}% Abdeckung (${mode}). `;
	  },
    829: `Weitere Daten werden für detaillierte Empfehlungen benötigt.`,
    830: (coverage, quality) => `Die durchschnittliche Abdeckung liegt bei ${coverage} Prozent, was ${quality} ist. `,
    831: (rate) => `Die Erfolgsrate beträgt ${rate} Prozent. `,
    832: (suction, mopping) => `Die optimierten Einstellungen sind ${suction} Saugkraft und ${mopping} Wischen. `,
    833: `Diese Einstellungen sind sehr zuverlässig. `,
    834: `Diese Einstellungen zeigen eine gute Konsistenz. `,
    835: (reps) => `Typischerweise sind ${reps} Durchgänge erforderlich. `,
    836: (time) => `Die Reinigungen erfolgen meistens ${time}. `,
    837: `Die Einstellungen sind sehr konsistent. `,
    838: `Die Einstellungen zeigen eine akzeptable Konsistenz. `,
    839: `Die Reinigungseffizienz verbessert sich kontinuierlich. `,
    840: `Die Abdeckung zeigt einen leichten Rückgang. `,
    841: (rec) => `Empfehlung: ${rec}`,
    842: (recs) => `Empfehlungen: ${recs}`,
    // Qualitäts-Texte
    845: 'hervorragend',
    846: 'sehr gut',
    847: 'gut',
    848: 'akzeptabel',
    849: 'verbesserungswürdig',
    // Einstellungs-Texte
    850: 'leise',
    851: 'standard',
    852: 'starke',
    853: 'Turbo',
    854: 'maximale',
    855: 'geringes',
    856: 'mittleres',
    857: 'starkes',
    // Zeit-Texte
    858: 'früh morgens',
    859: 'morgens',
    860: 'mittags',
    861: 'nachmittags',
    862: 'abends',
    863: 'spät abends',
    864: 'nachts',
    865: 'zu verschiedenen Tageszeiten',
    // Empfehlungs-Texte
    866: 'erhöhen Sie die Wiederholungen für bessere Abdeckung',
    867: 'verwenden Sie eine stärkere Saugstufe, um weniger Durchgänge zu benötigen',
    868: 'reinigen Sie am Tag für bessere Ergebnisse',
    869: 'behalten Sie die aktuellen Einstellungen bei, sie funktionieren optimal',
    // Zeitangaben für relative Zeit
    870: 'gerade eben',
    871: (minutes) => `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`,
    872: (hours) => `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`,
    873: 'heute',
    874: 'gestern',
    875: (days) => `vor ${days} Tagen`,
    876: 'vor 1 Woche',
    877: (weeks) => `vor ${weeks} Wochen`,
    878: 'vor 1 Monat',
    879: (months) => `vor ${months} Monaten`,
    880: 'vor 1 Jahr',
    881: (years) => `vor ${years} Jahren`,
    882: 'nie',
    883: (mode) => `Modus ${mode}`,

    // 900-999: Hilfe-Menü und Synonyme
    900: 'Synonym-Beispiele und Sprachbefehle',
    901: 'Bei welchem Bereich benötigen Sie Hilfe? Hier sind die Hauptoptionen:',
    902: '1 Staubbehälter leeren',
    903: '2 Mopp waschen',
    904: '3 Komponentenstatus prüfen',
    905: '4 Komponenten zurücksetzen',
    906: '5 Raumreinigung',
    907: '6 Teppichreinigung',
    908: '7 Esstisch-Reinigung',
    909: '8 Synonym-Beispiele und Sprachbefehle',
    910: 'Sagen Sie einfach die Nummer oder den Namen des gewünschten Bereichs.',
    911: 'TIP: Diese Synonyme funktionieren:',
    912: 'Sage "weitere Beispiele" für mehr Synonyme',
    913: 'Keine Raumbeispiele',
    914: 'RäUME',
    915: 'SAUGEN',
    916: 'WISCHEN',
    917: 'Womit kann ich Ihnen noch helfen?',
    918: 'Entschuldigung, das habe ich nicht verstanden. Bitte versuchen Sie es erneut.',
    919: 'Hilfe-Sitzung beendet.',

    // 920-949: Submenu für Synonyme
    920: 'Welche Synonym-Kategorie möchten Sie?',
    921: '1 Raumnamen',
    922: '2 Saugstufen',
    923: '3 Wischstufen',
    924: '4 Entleerungsbefehle',
    925: '5 Mopp-Waschbefehle',
    926: '6 Statusabfrage-Befehle',
    927: '7 Reset-Befehle',
    928: '8 Esstisch-Befehle',
    929: '9 Alle Synonym-Kategorien',
    930: 'Sagen Sie die Nummer oder den Namen',
    931: 'Raumname-Synonyme:',
    932: 'Saugstufen-Synonyme:',
    933: 'Wischstufen-Synonyme:',
    934: 'Entleerungsbefehl-Synonyme:',
    935: 'Mopp-Wasch-Synonyme:',
    936: 'Statusabfrage-Synonyme:',
    937: 'Reset-Befehl-Synonyme:',
    938: 'Esstisch-Synonyme:',
    939: 'Verfügbare Raumnamen:',
    940: 'Verfügbare Saugstufen:',
    941: 'Verfügbare Wischstufen:',
    942: 'Verfügbare Entleerungsbefehle:',
    943: 'Verfügbare Mopp-Waschbefehle',
    944: 'Verfügbare Statusbefehle:',
    945: 'Verfügbare Reset-Befehle:',
    946: 'Verfügbare Esstisch-Befehle:',
    947: 'Sagen Sie "zurück" um zum Hauptmenü zurückzukehren.',
    948: 'Kehre zum Hauptmenü zurück.',
  }
};

const TelegramInfo = {
  'EN': {
    0: 'The Telegram adapter is active and sends messages. You can, for example, request: "help with the robot" or "support for the vacuum" or "manual for the robot vacuum" or "assistance for the cleaning robot".',
    1: 'The Telegram adapter was not found, and messages cannot be sent. Please install the Telegram adapter to resolve this issue.'
  },
  'DE': {
    0: 'Der Telegram Adapter ist aktiv und sendet Nachrichten. Du kannst beispielsweise Anfragen stellen wie: "Hilfe für den Roboter" oder "Unterstützung für den Staubsauger" oder "Anleitung für den Saugroboter" oder "Assistenz für den Reinigungsroboter".',
    1: 'Der Telegram Adapter wurde nicht gefunden, und es können keine Nachrichten gesendet werden. Bitte installiere den Telegram Adapter, um das Problem zu beheben.'
  }
};


const Helpwords = {
  EN: {
    helpWords: [
      'help', 'support', 'manual', 'guide', 'assistance', 'instructions'
    ],
    deviceWords: [
      'dreame', 'robot', 'vacuum', 'robot vacuum', 'cleaning robot', 'robot cleaner'
    ]
  },
  DE: {
    helpWords: [
      'hilfe', 'unterstützung', 'anleitung', 'assistenz', 'support', 'beschreibung'
    ],
    deviceWords: [
      'dreame', 'saugroboter', 'staubsaugerroboter', 'reinigungsroboter', 'roboter'
    ]
  }
};

module.exports = {
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
};