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
    44: (RoomList) => `Please check the settings. The following rooms have an invalid cleaning mode: ${RoomList}.`,
    45: (roomId) => [
      `Fallback data for room "${roomId}" is incomplete � "cleanOrder" is null. It was automatically set to 1.`,
      `Please check and fix it manually in the Dreame app:`,
      `1. Open Dreame app`,
      `2. Go to "Map management"`,
      `3. Select "Cleaning order"`,
      `4. Drag and drop rooms into the desired order`,
      `5. Save changes`,
      `6. Start a short cleaning and stop it immediately (updates cleanset object)`
    ].join('\n'),
    46: 'Carpet cleaning could not be started',
    47: '',
    48: reps => `${reps} times`,
    49: 'No valid carpet areas found',
    50: (rooms) => `No intensity specified for carpet cleaning in ${rooms}. Please specify cleaning intensity: light, medium or strong`,
    51: (rooms, intensities) => {
      const [mainRooms, mainIntensity] = intensities.shift();
      if (intensities.length === 0) {
        return `Starting ${mainIntensity} carpet cleaning in ${mainRooms}`;
      }
      const otherParts = intensities.map(([rooms, intensity]) =>
        `${rooms} with ${intensity}`
      );
      return `Starting ${mainIntensity} carpet cleaning in ${mainRooms} and ${otherParts.join(' and ')}`;
    },
    60: 'What do you need help with? Here are the main options:',
    61: '1 Emptying the dustbin',
    62: '2 Washing the mop',
    63: '3 Checking component status',
    64: '4 Resetting components',
    65: '5 Room cleaning',
    66: '6 Carpet cleaning',
    67: '7 Synonym examples and voice commands',
    68: 'Just say the number or name of the option you want help with.',
    69: 'To empty the dustbin, use the following commands:',
    70: ' - "Alexa, empty the robot�s dustbin"',
    71: ' - "Alexa, clean the robot�s dust container"',
    72: 'To wash the mop, use the following commands:',
    73: ' - "Alexa, wash the robot�s mop"',
    74: ' - "Alexa, clean the robot�s mopping pad"',
    75: 'To check the status, use the following commands:',
    76: ' - "Alexa, what�s the robot�s status?"',
    77: ' - "Alexa, check the robot�s filter status"',
    78: 'To reset components, use the following commands:',
    79: ' - "Alexa, reset all robot components"',
    80: ' - "Alexa, reset the robot�s side brush"',
    81: 'For room cleaning, use these patterns:',
    82: ' - "Alexa, vacuum {ROOM} on {quiet, standard, strong or turbo}"',
    83: ' - "Alexa, mopping {ROOM} {low, medium or high}"',
    84: ' - "Alexa, {ROOM} {NUMBER} times quiet vacuum and {ROOM} {NUMBER} times high mopping"',
    85: 'For carpet cleaning, use these patterns:',
    86: ' - "Alexa, clean the carpet in the {ROOM} on {light, medium or strong} mode"',
    87: ' - "Alexa, shampoo {ROOM} carpet on {intensity}"',
    88: 'Available suction levels: quiet, standard, strong or turbo',
    89: 'Available mopping levels: low (dry), medium (damp) or high (wet)',
    90: 'Available carpet intensities: light, medium or strong',
    91: 'TIP: These synonyms work:',
    92: 'Say "more examples" for additional synonyms',
    93: 'No room examples',
    94: 'ROOMS',
    95: 'SUCTION',
    96: 'MOPPING',
    97: 'EMPTYING',
    98: 'MOP WASHING',
    99: 'STATUS CHECK',
    100: 'RESET',
    101: 'What else can I help with?',
    102: 'Sorry, I didn\'t understand that. Please try again.',
    103: 'Help session ended.',

    // Submenu for Option 7 - Synonyms
    104: 'Which synonym category would you like?',
    105: '1 Room names',
    106: '2 Suction levels',
    107: '3 Mopping levels',
    108: '4 Emptying commands',
    109: '5 Mop washing commands',
    110: '6 Status check commands',
    111: '7 Reset commands',
    112: '8 All synonym categories',
    113: 'Say the number or name',

    // Synonym categories
    114: 'Room name synonyms:',
    115: 'Suction level synonyms:',
    116: 'Mopping level synonyms:',
    117: 'Emptying command synonyms:',
    118: 'Mop washing synonyms:',
    119: 'Status check synonyms:',
    120: 'Reset command synonyms:',
    121: 'Available room names:',
    122: 'Available suction levels:',
    123: 'Available mopping levels:',
    124: 'Available emptying commands:',
    125: 'Available mop washing commands:',
    126: 'Available status commands:',
    127: 'Available reset commands:',
    128: 'Say "back" to return to the main menu.',
    129: 'Returning to main menu.'

  },
  'DE': {
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
    44: (RoomList) => `Bitte prüfe die Einstellungen. Die folgenden Räume haben einen ungültigen Reinigungsmodus: ${RoomList}.`,
    45: (roomId) => [
      `Fallback-Daten für Raum "${roomId}" unvollständig – "cleanOrder" ist null. Wert wurde automatisch auf 1 gesetzt.`,
      `Bitte manuell in der Dreame-App überprüfen und korrigieren:`,
      `1. Dreame-App öffnen`,
      `2. Zur "Kartenverwaltung" navigieren`,
      `3. "Reinigungsreihenfolge" auswählen`,
      `4. Räume per Drag & Drop in gewünschte Reihenfolge bringen`,
      `5. Änderungen speichern`,
      `6. Kurze Reinigung starten und sofort abbrechen (aktualisiert das cleanset-Objekt)`
    ].join('\n'),
    46: 'Teppichreinigung konnte nicht gestartet werden',
    47: '',
    48: reps => `${reps} mal`,
    49: 'Keine gültigen Teppichbereiche gefunden',
    50: (rooms) => `Kein Intensitätslevel für ${rooms} angegeben. Bitte geben Sie die Reinigungsintensität an: leicht, mittel oder stark.`,
    51: (rooms, intensities) => {
      const [mainRooms, mainIntensity] = intensities.shift();
      if (intensities.length === 0) {
        return `Starte ${mainIntensity} Teppichreinigung in ${mainRooms}`;
      }
      const otherParts = intensities.map(([rooms, intensity]) =>
        `${rooms} mit ${intensity}`
      );
      return `Starte ${mainIntensity} Teppichreinigung in ${mainRooms} und ${otherParts.join(' und ')}`;
    },
    60: 'Bei welchem Bereich benötigen Sie Hilfe? Hier sind die Hauptoptionen:',
    61: '1 Staubbehälter leeren',
    62: '2 Mopp waschen',
    63: '3 Komponentenstatus prüfen',
    64: '4 Komponenten zurücksetzen',
    65: '5 Raumreinigung',
    66: '6 Teppichreinigung',
    67: '7 Synonym-Beispiele und Sprachbefehle',
    68: 'Sagen Sie einfach die Nummer oder den Namen des gewünschten Bereichs.',
    69: 'Zum Leeren des Staubbehälters:',
    70: ' - "Alexa, leere den Roboter-Staubbehälter"',
    71: ' - "Alexa, reinige den Roboter-Staubbehälter"',
    72: 'Zum Waschen des Mopps:',
    73: ' - "Alexa, wasche den Roboter-Mopp"',
    74: ' - "Alexa, reinige das Roboter-Wischpad"',
    75: 'Für Statusabfragen:',
    76: ' - "Alexa, wie ist der Status des Roboters?"',
    77: ' - "Alexa, prüfe den Roboter-Filterstatus"',
    78: 'Zum Zurücksetzen von Komponenten:',
    79: ' - "Alexa, setze alle Roboter-Komponenten zurück"',
    80: ' - "Alexa, setze die Roboter-Seitenbürste zurück"',
    81: 'Für Raumreinigung:',
    82: ' - "Alexa, {ROOM} {leise, standard, stark oder turbo} saugen"',
    83: ' - "Alexa, {ROOM} {niedrig, mittel oder hoch} wischen"',
    84: ' - "Alexa, {ROOM} {NUMBER} mal leise saugen und {ROOM} {NUMBER} mal hoch wischen"',
    85: 'Für Teppichreinigung:',
    86: ' - "Alexa, reinige den Teppich im {ROOM} im {leichten, mittleren oder starken} Modus"',
    87: ' - "Alexa, shampooniere {ROOM} teppich Intensität"',
    88: 'Saugstufen: leise, standard, stark oder turbo',
    89: 'Wischstufen: niedrig (trocken), mittel (feucht) oder hoch (nass)',
    90: 'Teppich-Intensitäten: leicht, mittel oder stark',
    91: 'TIP: Diese Synonyme funktionieren:',
    92: 'Sage "weitere Beispiele" für mehr Synonyme',
    93: 'Keine Raumbeispiele',
    94: 'RÄUME',
    95: 'SAUGEN',
    96: 'WISCHEN',
    97: 'ENTLEEREN',
    98: 'MOP-WÄSCHE',
    99: 'STATUSABFRAGE',
    100: 'RESET',
    101: 'Womit kann ich Ihnen noch helfen?',
    102: 'Entschuldigung, das habe ich nicht verstanden. Bitte versuchen Sie es erneut.',
    103: 'Hilfe-Sitzung beendet.',

    // Submenu for Option 7 - Synonyms
    104: 'Welche Synonym-Kategorie möchten Sie?',
    105: '1 Raumnamen',
    106: '2 Saugstufen',
    107: '3 Wischstufen',
    108: '4 Entleerungsbefehle',
    109: '5 Mopp-Waschbefehle',
    110: '6 Statusabfrage-Befehle',
    111: '7 Reset-Befehle',
    112: '8 Alle Synonym-Kategorien',
    113: 'Sagen Sie die Nummer oder den Namen',

    // Synonym categories
    114: 'Raumname-Synonyme:',
    115: 'Saugstufen-Synonyme:',
    116: 'Wischstufen-Synonyme:',
    117: 'Entleerungsbefehl-Synonyme:',
    118: 'Mopp-Wasch-Synonyme:',
    119: 'Statusabfrage-Synonyme:',
    120: 'Reset-Befehl-Synonyme:',
    121: 'Verfügbare Raumnamen:',
    122: 'Verfügbare Saugstufen:',
    123: 'Verfügbare Wischstufen:',
    124: 'Verfügbare Entleerungsbefehle:',
    125: 'Verfügbare Mopp-Waschbefehle:',
    126: 'Verfügbare Statusbefehle:',
    127: 'Verfügbare Reset-Befehle:',
    128: 'Sagen Sie "zurück" um zum Hauptmenü zurückzukehren.',
    129: 'Kehre zum Hauptmenü zurück.'
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