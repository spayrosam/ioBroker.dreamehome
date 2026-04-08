# ioBroker.dreamehome

![Logo](admin/dreamehome.png)

**ioBroker adapter for Dreame vacuum robots** | **ioBroker-Adapter für Dreame Staubsaugroboter**

[![NPM version](https://img.shields.io/npm/v/iobroker.dreamehome.svg)](https://www.npmjs.com/package/iobroker.dreamehome)
[![Downloads](https://img.shields.io/npm/dm/iobroker.dreamehome.svg)](https://www.npmjs.com/package/iobroker.dreamehome)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Language** | **Sprache:** [English](#english) | [Deutsch](#deutsch)

---

<a name="english"></a>
# 🇬🇧 English Documentation

## 📋 Table of Contents

- [Features](#features-en)
- [Supported Models](#supported-models-en)
- [Installation](#installation-en)
- [Configuration](#configuration-en)
- [Voice Control](#voice-control-en)
- [VIS Widgets](#vis-widgets-en)
- [Learning System](#learning-system-en)
- [Water Tracking](#water-tracking-en)
- [Troubleshooting](#troubleshooting-en)

---

<a name="features-en"></a>
## ✨ Features

### 🔌 **Cloud Integration**
- Full Dreame cloud connection
- Automatic token management with refresh
- Real-time MQTT communication with the robot

### 🗺️ **Interactive Maps (VIS)**
- **3D map view** with rotation, zoom and perspective
- Clickable rooms and carpets for selection
- Live robot position with animation
- Cleaning path with color-coded room assignment
- Display of walls, doors and furniture
- **Cleaning history** as overlay with path preview
- Component status (brushes, filters, etc.) with progress bars

### 🎤 **Voice Control**
- **Alexa integration**: Natural voice commands
- **Telegram support**: Control via chat
- **Multilingual** (German/English)

### 🧠 **Learning System**
- Analyzes cleaning patterns per room
- Learns preferred settings (suction level, water amount)
- Can auto-complete missing voice commands
- Provides recommendations with confidence values

### 💧 **Water Tracking**
- For models with water tank and washing station
- Calculates consumption per m² (ml/m²)
- Learns from historical data (AI-powered)
- Separate tracking for **detergent**
- Warnings for low levels

### 🧹 **Comprehensive Control**
- Start/Pause/Stop/Charging
- Room-by-room cleaning with individual settings
- Carpet cleaning with intensity levels
- Dining table zones (automatic detection)
- Auto-empty and mop washing
- Component reset (brushes, filters, sensors)

### 📊 **Status & Monitoring**
- All robot states (suction level, water amount, errors)
- Wear parts with remaining lifetime
- Cleaning history with statistics
- Resource monitoring (memory, event loop)

---

<a name="supported-models-en"></a>
## 🤖 Supported Models

The adapter supports almost all Dreame vacuum robots with cloud connection:

| Series | Models | Special Features |
|--------|--------|------------------|
| **Matrix / X-Series** | Matrix 10 Ultra/Pro, X30 Ultra, X40 Ultra | 5.0L tank, mop types A/B/C |
| **L-Series** | L20 Ultra, L30 Ultra, L10s Ultra/Pro | 4.5L / 4.0L tank |
| **Z-Series** | Z10, Z20, Z30 Pro | 5.0L tank |
| **W-Series** | W10, W20, W30 | 4.0L tank |
| **F-Series** | F9, F10 | 3.0L tank |
| **D-Series** | D9, D10, D20 | 2.0L - 2.5L tank |

*For unlisted models, tank capacity is automatically detected or a default value is used.*

---

<a name="installation-en"></a>
## 📦 Installation

### Requirements

- **Node.js 18 or higher** (with `--expose-gc` recommended)
- **ioBroker js-controller 5.0 or higher**
- **Canvas library** for map rendering

### Installation via GitHub (adapter is not available in the official npm repository)
#### Method 1: Via ioBroker Admin UI

1. Open ioBroker admin interface
2. Go to "Adapters" → "Custom Adapters"
3. Add the following GitHub URL: https://github.com/spayrosam/ioBroker.dreamehome
4. Click "Install"

### Important: Canvas Library

The canvas library is required for map rendering. Check installation with:

```bash
cd /opt/iobroker
npm list canvas
```

If not installed:

```bash
cd /opt/iobroker
npm install canvas
```

---

<a name="configuration-en"></a>
## ⚙️ Configuration

### Basic Settings

| Field | Description |
|-------|-------------|
| **Username** | Your Dreame account (email) |
| **Password** | Your Dreame password |
| **Device Index** | For multiple robots: 0 = first device |
| **Auto-Fallback** | Automatically switch to first device |

### Advanced Settings

| Field | Description | Default |
|-------|-------------|---------|
| **Update Interval** | How often data is fetched | 60 seconds |
| **Memory Limit** | Maximum heap memory | 150 MB |
| **Event Loop Limit** | Max. event loop lag | 50 ms |
| **Enable GC** | Garbage collection | true |
| **Memory Cleaner** | Automatic memory cleanup | true |
| **Cleaner Threshold** | When to clean | 300 MB |
| **Cleaner Interval** | How often to check | 30 seconds |

---

<a name="voice-control-en"></a>
## 🎤 Voice Control

### Alexa Integration

The adapter automatically detects if the Alexa adapter is installed. You can use natural voice commands with Alexa.

> **Important**: Commands for component status, reset, auto-empty and mop washing **MUST** include a robot keyword like "robot", "vacuum", or "dreame". Room cleaning commands work with or without robot keywords.

### Robot Keywords (must be included in certain commands)

| English Keywords |
|------------------|
| `robot`, `dreame`, `vacuum`, `vacuum cleaner`, `cleaning robot`, `robot cleaner`, `vacuum bot`, `robovac` |

### Basic Commands

| What to say to Alexa |
|----------------------|
| "Alexa, start the robot" |
| "Alexa, start cleaning" |
| "Alexa, stop the robot" |
| "Alexa, stop cleaning" |
| "Alexa, pause the robot" |
| "Alexa, pause" |
| "Alexa, robot return to charge" |
| "Alexa, return to charge" |

### Room Cleaning

| What to say to Alexa |
|----------------------|
| "Alexa, vacuum the kitchen" |
| "Alexa, mop the bathroom" |
| "Alexa, vacuum the living room twice" |
| "Alexa, vacuum the kitchen quiet" |
| "Alexa, vacuum the kitchen standard" |
| "Alexa, vacuum the kitchen strong" |
| "Alexa, vacuum the kitchen turbo" |
| "Alexa, mop the bathroom low" |
| "Alexa, mop the bathroom medium" |
| "Alexa, mop the bathroom high" |

### Combined Room Commands

| What to say to Alexa |
|----------------------|
| "Alexa, vacuum the kitchen twice and mop the bathroom" |
| "Alexa, vacuum the kitchen quiet and mop the bathroom high" |
| "Alexa, vacuum the kitchen three times and mop the bathroom twice" |

### Auto-Empty (MUST include robot keyword)

| What to say to Alexa |
|----------------------|
| "Alexa, robot empty" |
| "Alexa, robot auto empty" |
| "Alexa, vacuum empty" |
| "Alexa, dreame empty" |

### Mop Washing (MUST include robot keyword)

| What to say to Alexa |
|----------------------|
| "Alexa, robot wash" |
| "Alexa, robot auto wash" |
| "Alexa, vacuum wash" |
| "Alexa, dreame wash mop" |

### Component Status (MUST include robot keyword)

| What to say to Alexa |
|----------------------|
| "Alexa, robot status" |
| "Alexa, robot check" |
| "Alexa, robot how is the filter" |
| "Alexa, robot check filter" |
| "Alexa, robot how is the main brush" |
| "Alexa, robot check side brush" |
| "Alexa, robot how is the mop pad" |
| "Alexa, robot check sensor" |
| "Alexa, robot how is the detergent" |
| "Alexa, robot check water tank" |

### Component Reset (MUST include robot keyword)

| What to say to Alexa |
|----------------------|
| "Alexa, robot reset everything" |
| "Alexa, robot reset all components" |
| "Alexa, robot reset filter" |
| "Alexa, robot reset main brush" |
| "Alexa, robot reset side brush" |
| "Alexa, robot reset mop pad" |

### Cancel Commands

| What to say to Alexa |
|----------------------|
| "Alexa, cancel cleaning" |
| "Alexa, stop cleaning" |

### Carpet Cleaning

| What to say to Alexa |
|----------------------|
| "Alexa, clean the carpet in the living room" |
| "Alexa, clean the carpet in the bedroom" |
| "Alexa, carpet in the living room light" |
| "Alexa, carpet in the living room medium" |
| "Alexa, carpet in the living room strong" |

### Dining Table Cleaning

| What to say to Alexa |
|----------------------|
| "Alexa, clean the dining table" |
| "Alexa, clean the dining table in the living room" |
| "Alexa, vacuum under the dining table" |
| "Alexa, mop around the dining table" |
| "Alexa, clean dining table quick" |
| "Alexa, clean dining table standard" |
| "Alexa, clean dining table thorough" |

### Help Menu

| What to say to Alexa |
|----------------------|
| "Alexa, help for the robot" |
| "Alexa, robot help" |
| "Alexa, help for the vacuum" |

The help menu will then guide you through:
- **1** Emptying the dustbin
- **2** Washing the mop
- **3** Checking component status
- **4** Resetting components
- **5** Room cleaning
- **6** Carpet cleaning
- **7** Dining table cleaning
- **8** Synonym examples and voice commands

---

### Telegram Integration

The adapter also supports Telegram control. Send messages like:

| Command |
|---------|
| `start the robot` |
| `robot status` |
| `robot reset filter` |
| `robot empty` |
| `robot wash` |

---

<a name="vis-widgets-en"></a>
## 🖼️ VIS Widgets

The adapter generates an interactive map for VIS. Access via:

`dreamehome.0.[YOUR-DID].vis.vishtml0`

### Map Features

#### 🎮 **Control Menu** (right side)
- Start/Pause/Stop/Charge
- Auto-empty and mop washing
- Cleaning mode selection (vacuum/mop/both)
- Individual room settings

#### 🔧 **View Menu**
- 3D rotation (X/Y/Z)
- Zoom and perspective
- Background color
- Show/hide paths and labels

#### 📊 **Status Info** (top left)
- Current room with cleaning progress
- Battery level
- Component status (brushes, filters, etc.)

#### 🖱️ **Interaction**
- **Click on rooms**: Select for targeted cleaning
- **Click on carpets**: Targeted carpet cleaning
- **Click on settings icon**: Individual room settings

## 📜 Cleaning History System

The adapter includes a comprehensive cleaning history visualization system with:

- **List view** of all past cleanings with date, area, duration, and status
- **Detail view** with complete statistics, room sequence, and individual settings
- **Obstacle detection** for 30+ types (shoes, cables, pets, furniture legs, etc.)
- **Blocked rooms** visualization with 45° hatch pattern and color-coded reasons
- **Date picker** with calendar for easy navigation (Today, Yesterday, 7d, 30d)
- **Path rendering** with room-based colors and segment detection
- **Metadata & statistics** including motion actions, AI model, and obstacle counters
- **Full German/English** language support

Click the history button (clock icon) on the map to get started.

---

<a name="learning-system-en"></a>
## 🧠 Learning System

The adapter learns from your cleanings and becomes smarter over time.

### How it Works

1. **Data collection**: Every cleaning is analyzed (room, suction level, water amount, success)
2. **Pattern recognition**: The system detects preferences per room
3. **Recommendations**: For missing details in voice commands, learned values are suggested

### Learning Commands

| What to say to Alexa |
|----------------------|
| "Alexa, what have you learned?" |
| "Alexa, show learning statistics" |
| "Alexa, recommendation for the kitchen" |
| "Alexa, clear learning history" |
| "Alexa, which rooms learned?" |

### Configurable Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `MinCoverageForLearn` | Min. coverage to learn | 80% |
| `MinCleaningsForConfidence` | Min. cleanings for high confidence | 3 |
| `AutoCompleteMinConfidence` | Min. confidence for auto-completion | 60% |
| `EnableTimeContext` | Consider time of day | true |

---

<a name="water-tracking-en"></a>
## 💧 Water Tracking

### Supported Models

Tracking works automatically for models with:
- Water tank in the docking station
- Automatic mop washing function

### How it Works

1. **Model detection**: Automatic detection of tank capacity
2. **Consumption measurement**: Calculates ml/m² during cleaning
3. **Learning AI**: Adapts consumption to your environment
4. **Detergent**: Separate tracking for detergent

### Available States

| State | Description |
|-------|-------------|
| `water.Current` | Current water level (ml) |
| `water.PureWaterTank` | Water level in percent |
| `water.CurrentMlPerSqm` | Current consumption (ml/m²) |
| `water.LearningStats` | Learning statistics |
| `water.RoomConsumption` | Consumption per room |
| `detergent.CurrentMl` | Detergent (ml) |
| `detergent.EstimatedRefillDate` | Estimated refill date |

---

<a name="troubleshooting-en"></a>
## 🔍 Troubleshooting

### Common Issues

#### 1. Cloud login fails

```
Login error response: "invalid_grant"
```

**Solution:**
- Check username and password
- Two-factor authentication might be enabled

#### 2. Map not generated

```
Error: Cannot find module 'canvas'
```

**Solution:** Install canvas library manually:
```bash
cd /opt/iobroker
npm install canvas
```

#### 3. High memory usage

**Solution:**
- Enable Memory Cleaner in settings
- Start Node.js with `--expose-gc`
- Reduce update interval

#### 4. Alexa doesn't recognize commands

**Solution:**
- Ensure Alexa adapter is installed
- Check if `alexa2.0.History.summary` exists
- For component status/reset: Make sure to include a robot keyword (e.g., "robot", "vacuum")
- Say "Alexa, help for the robot" for examples

### Enable Logging

Set state `dreamehome.0.settings.showlog` to `true` for detailed logs.

---

<a name="deutsch"></a>
# 🇩🇪 Deutsche Dokumentation

## 📋 Inhaltsverzeichnis

- [Features](#features-de)
- [Unterstützte Modelle](#unterstützte-modelle-de)
- [Installation](#installation-de)
- [Konfiguration](#konfiguration-de)
- [Sprachsteuerung](#sprachsteuerung-de)
- [VIS-Widgets](#vis-widgets-de)
- [Lernsystem](#lernsystem-de)
- [Wasserverbrauchs-Tracking](#wasserverbrauchs-tracking-de)
- [Fehlerbehebung](#fehlerbehebung-de)

---

<a name="features-de"></a>
## ✨ Features

### 🔌 **Cloud-Integration**
- Vollständige Anbindung an die Dreame-Cloud
- Automatisches Token-Management mit Refresh
- MQTT-Echtzeitkommunikation mit dem Roboter

### 🗺️ **Interaktive Karten (VIS)**
- **3D-Kartenansicht** mit Rotation, Zoom und Perspektive
- Klickbare Räume und Teppiche zur Auswahl
- Live-Roboter-Position mit Animation
- Reinigungspfad mit farbiger Raumzuordnung
- Anzeige von Wänden, Türen und Möbeln
- **Reinigungs-Historie** als Overlay mit Pfad-Vorschau
- Komponenten-Status (Bürsten, Filter, etc.) mit Fortschrittsbalken

### 🎤 **Sprachsteuerung**
- **Alexa-Integration**: Natürliche Sprachbefehle
- **Telegram-Support**: Steuerung per Chat
- **Mehrsprachig** (Deutsch/Englisch)

### 🧠 **Lernendes System**
- Analysiert Reinigungsmuster pro Raum
- Lernt bevorzugte Einstellungen (Saugstufe, Wassermenge)
- Kann fehlende Sprachbefehle automatisch ergänzen
- Gibt Empfehlungen mit Konfidenz-Werten

### 💧 **Wasserverbrauchs-Tracking**
- Für Modelle mit Wassertank und Waschstation
- Berechnet Verbrauch pro m² (ml/m²)
- Lernt aus historischen Daten (KI-gestützt)
- Separate Verfolgung von **Reinigungsmittel** (Detergent)
- Warnungen bei niedrigem Füllstand

### 🧹 **Umfassende Steuerung**
- Start/Pause/Stop/Charging
- Raumweise Reinigung mit individuellen Einstellungen
- Teppichreinigung mit Intensitätsstufen
- Esstisch-Zonen (automatische Erkennung)
- Auto-Empty und Mop-Washing
- Komponenten-Reset (Bürsten, Filter, Sensoren)

### 📊 **Status & Monitoring**
- Alle Roboter-Status (Saugstufe, Wassermenge, Fehler)
- Verschleißteile mit Restlebensdauer
- Reinigungsverlauf mit Statistiken
- Ressourcen-Monitoring (Speicher, Event-Loop)

---

<a name="unterstützte-modelle-de"></a>
## 🤖 Unterstützte Modelle

Der Adapter unterstützt nahezu alle Dreame-Staubsaugerroboter mit Cloud-Anbindung:

| Serie | Modelle | Besonderheiten |
|-------|---------|----------------|
| **Matrix / X-Serie** | Matrix 10 Ultra/Pro, X30 Ultra, X40 Ultra | 5.0L Tank, Mop-Typen A/B/C |
| **L-Serie** | L20 Ultra, L30 Ultra, L10s Ultra/Pro | 4.5L / 4.0L Tank |
| **Z-Serie** | Z10, Z20, Z30 Pro | 5.0L Tank |
| **W-Serie** | W10, W20, W30 | 4.0L Tank |
| **F-Serie** | F9, F10 | 3.0L Tank |
| **D-Serie** | D9, D10, D20 | 2.0L - 2.5L Tank |

*Bei nicht gelisteten Modellen wird automatisch die Tankkapazität erkannt oder ein Standardwert verwendet.*

---

<a name="installation-de"></a>
## 📦 Installation

### Voraussetzungen

- **Node.js 18 oder höher** (mit `--expose-gc` empfohlen)
- **ioBroker js-controller 5.0 oder höher**
- **Canvas-Bibliothek** für die Kartendarstellung

### Installation über GitHub (Adapter ist nicht im offiziellen npm-Repository verfügbar)
### Methode 1: Über die ioBroker-Admin-Oberfläche
1. Öffne die ioBroker-Admin-Oberfläche
2. Gehe zu "Adapter" → "Eigene Adapter"
3. Füge folgende GitHub-URL hinzu: https://github.com/spayrosam/ioBroker.dreamehome
4. Klicke auf "Installieren"

### Wichtig: Canvas-Bibliothek

Die Canvas-Bibliothek wird für die Kartendarstellung benötigt. Überprüfe die Installation mit:

```bash
cd /opt/iobroker
npm list canvas
```

Falls nicht installiert:

```bash
cd /opt/iobroker
npm install canvas
```

---

<a name="konfiguration-de"></a>
## ⚙️ Konfiguration

### Grundeinstellungen

| Feld | Beschreibung |
|------|--------------|
| **Benutzername** | Dein Dreame-Account (E-Mail) |
| **Passwort** | Dein Dreame-Passwort |
| **Geräteindex** | Bei mehreren Robotern: 0 = erstes Gerät |
| **Auto-Fallback** | Automatisch auf erstes Gerät wechseln |

### Erweiterte Einstellungen

| Feld | Beschreibung | Standard |
|------|--------------|----------|
| **Aktualisierungsintervall** | Wie oft Daten abgerufen werden | 60 Sekunden |
| **Speicher-Limit** | Maximaler Heap-Speicher | 150 MB |
| **Event-Loop-Limit** | Max. Event-Loop-Verzögerung | 50 ms |
| **GC aktivieren** | Garbage Collection | true |
| **Memory Cleaner** | Automatische Speicherbereinigung | true |
| **Cleaner-Schwelle** | Ab wann bereinigt wird | 300 MB |
| **Cleaner-Intervall** | Wie oft geprüft wird | 30 Sekunden |

---

<a name="sprachsteuerung-de"></a>
## 🎤 Sprachsteuerung

### Alexa-Integration

Der Adapter erkennt automatisch, ob der Alexa-Adapter installiert ist. Du kannst natürliche Sprachbefehle mit Alexa verwenden.

> **Wichtig**: Befehle für Komponenten-Status, Reset, Auto-Empty und Mop-Washing **MÜSSEN** ein Robot-Keyword wie "roboter", "saugroboter" oder "dreame" enthalten. Raumreinigungsbefehle funktionieren mit oder ohne Robot-Keyword.

### Robot-Keywords (müssen in bestimmten Befehlen enthalten sein)

| Deutsche Keywords |
|-------------------|
| `roboter`, `dreame`, `staubsauger`, `saugroboter`, `putzroboter`, `staubi`, `saug-bot`, `reinigungsroboter` |

### Grundlegende Befehle

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, starte den Roboter" |
| "Alexa, starte die Reinigung" |
| "Alexa, stoppe den Roboter" |
| "Alexa, stoppe die Reinigung" |
| "Alexa, pausiere den Roboter" |
| "Alexa, pausiere" |
| "Alexa, Roboter zur Ladestation" |
| "Alexa, zur Ladestation" |

### Raumreinigung

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, saug die Küche" |
| "Alexa, wisch das Bad" |
| "Alexa, saug das Wohnzimmer zweimal" |
| "Alexa, saug die Küche leise" |
| "Alexa, saug die Küche standard" |
| "Alexa, saug die Küche stark" |
| "Alexa, saug die Küche turbo" |
| "Alexa, wisch das Bad niedrig" |
| "Alexa, wisch das Bad mittel" |
| "Alexa, wisch das Bad hoch" |

### Kombinierte Raum-Befehle

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, saug die Küche zweimal und wisch das Bad" |
| "Alexa, saug die Küche leise und wisch das Bad hoch" |
| "Alexa, saug die Küche dreimal und wisch das Bad zweimal" |

### Auto-Empty (MUSS Robot-Keyword enthalten)

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, Roboter leeren" |
| "Alexa, Saugroboter entleeren" |
| "Alexa, Dreame leeren" |
| "Alexa, Staubsauger leeren" |

### Mop-Washing (MUSS Robot-Keyword enthalten)

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, Roboter waschen" |
| "Alexa, Saugroboter Mopp waschen" |
| "Alexa, Dreame waschen" |
| "Alexa, Roboter Mopp reinigen" |

### Komponenten-Status (MUSS Robot-Keyword enthalten)

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, Roboter Status" |
| "Alexa, Roboter prüfen" |
| "Alexa, Roboter wie ist der Filter" |
| "Alexa, Roboter prüfe Filter" |
| "Alexa, Roboter wie ist die Hauptbürste" |
| "Alexa, Roboter prüfe Seitenbürste" |
| "Alexa, Roboter wie ist das Wischpad" |
| "Alexa, Roboter prüfe Sensor" |
| "Alexa, Roboter wie ist das Reinigungsmittel" |
| "Alexa, Roboter prüfe Wassertank" |

### Komponenten zurücksetzen (MUSS Robot-Keyword enthalten)

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, Roboter alles zurücksetzen" |
| "Alexa, Roboter alle Komponenten zurücksetzen" |
| "Alexa, Roboter Filter zurücksetzen" |
| "Alexa, Roboter Hauptbürste zurücksetzen" |
| "Alexa, Roboter Seitenbürste zurücksetzen" |
| "Alexa, Roboter Wischpad zurücksetzen" |

### Abbruch-Befehle

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, Reinigung abbrechen" |
| "Alexa, stoppe Reinigung" |

### Teppichreinigung

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, reinige den Teppich im Wohnzimmer" |
| "Alexa, reinige den Teppich im Schlafzimmer" |
| "Alexa, Teppich im Wohnzimmer leicht" |
| "Alexa, Teppich im Wohnzimmer mittel" |
| "Alexa, Teppich im Wohnzimmer stark" |

### Esstisch-Reinigung

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, reinige den Esstisch" |
| "Alexa, reinige den Esstisch im Wohnzimmer" |
| "Alexa, saug unter dem Esstisch" |
| "Alexa, wisch um den Esstisch" |
| "Alexa, reinige Esstisch schnell" |
| "Alexa, reinige Esstisch standard" |
| "Alexa, reinige Esstisch gründlich" |

### Hilfemenü

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, Hilfe für den Roboter" |
| "Alexa, Roboter Hilfe" |
| "Alexa, Hilfe für den Staubsauger" |

Das Hilfemenü führt dich dann durch:
- **1** Staubbehälter leeren
- **2** Mopp waschen
- **3** Komponentenstatus prüfen
- **4** Komponenten zurücksetzen
- **5** Raumreinigung
- **6** Teppichreinigung
- **7** Esstisch-Reinigung
- **8** Synonym-Beispiele und Sprachbefehle

---

### Telegram-Integration

Der Adapter unterstützt auch die Steuerung über Telegram. Sende Nachrichten wie:

| Befehl |
|--------|
| `starte den Roboter` |
| `Roboter Status` |
| `Roboter Filter zurücksetzen` |
| `Roboter leeren` |
| `Roboter waschen` |

---

<a name="vis-widgets-de"></a>
## 🖼️ VIS-Widgets

Der Adapter generiert eine interaktive Karte für das VIS. Zugriff über:

`dreamehome.0.[DEIN-DID].vis.vishtml0`

### Features der Karte

#### 🎮 **Steuerungsmenü** (rechts)
- Start/Pause/Stop/Charge
- Auto-Empty und Mop-Washing
- Reinigungsmodus-Auswahl (Saugen/Wischen/Beides)
- Individuelle Raumeinstellungen

#### 🔧 **Ansichtsmenü**
- 3D-Rotation (X/Y/Z)
- Zoom und Perspektive
- Hintergrundfarbe
- Ein-/Ausblenden von Pfaden und Labels

#### 📊 **Status-Infos** (oben links)
- Aktueller Raum mit Reinigungsfortschritt
- Batteriestand
- Komponenten-Status (Bürsten, Filter, etc.)

#### 🖱️ **Interaktion**
- **Klick auf Räume**: Auswahl für gezielte Reinigung
- **Klick auf Teppiche**: Gezielte Teppichreinigung
- **Klick auf Einstellungs-Icon**: Individuelle Raum-Einstellungen

## 📜 Reinigungsverlauf-System

Der Adapter enthält ein umfassendes Reinigungsverlauf-System mit:

- **Listenansicht** aller vergangenen Reinigungen mit Datum, Fläche, Dauer und Status
- **Detailansicht** mit vollständigen Statistiken, Raumreihenfolge und individuellen Einstellungen
- **Hinderniserkennung** für über 30 Typen (Schuhe, Kabel, Haustiere, Möbelbeine, usw.)
- **Blockierte Räume** Visualisierung mit 45°-Schraffurmuster und farbcodierten Gründen
- **Datumsauswahl** mit Kalender zur einfachen Navigation (Heute, Gestern, 7T, 30T)
- **Pfaddarstellung** mit raumbasierten Farben und Segmenterkennung
- **Metadaten & Statistiken** inklusive Bewegungsaktionen, KI-Modell und Hinderniszähler
- **Vollständige Deutsch/Englisch** Sprachunterstützung

Klicke auf die Verlaufsschaltfläche (Uhrensymbol) auf der Karte, um zu beginnen.

---

<a name="lernsystem-de"></a>
## 🧠 Lernsystem

Der Adapter lernt aus deinen Reinigungen und wird mit der Zeit intelligenter.

### Wie es funktioniert

1. **Datenerfassung**: Jede Reinigung wird analysiert (Raum, Saugstufe, Wassermenge, Erfolg)
2. **Mustererkennung**: Das System erkennt Vorlieben pro Raum
3. **Empfehlungen**: Bei fehlenden Angaben in Sprachbefehlen werden gelernte Werte vorgeschlagen

### Lernbefehle

| Was du zu Alexa sagen musst |
|-----------------------------|
| "Alexa, was hast du gelernt?" |
| "Alexa, zeige Lernstatistiken" |
| "Alexa, Empfehlung für die Küche" |
| "Alexa, lösche Lernhistorie" |
| "Alexa, welche Räume gelernt?" |

### Konfigurierbare Parameter

| Parameter | Beschreibung | Standard |
|-----------|--------------|----------|
| `MinCoverageForLearn` | Min. Abdeckung zum Lernen | 80% |
| `MinCleaningsForConfidence` | Min. Reinigungen für hohe Konfidenz | 3 |
| `AutoCompleteMinConfidence` | Min. Konfidenz für Auto-Vervollständigung | 60% |
| `EnableTimeContext` | Tageszeit berücksichtigen | true |

---

<a name="wasserverbrauchs-tracking-de"></a>
## 💧 Wasserverbrauchs-Tracking

### Unterstützte Modelle

Das Tracking funktioniert automatisch für Modelle mit:
- Wassertank in der Basisstation
- Automatischer Mop-Waschfunktion

### Wie es funktioniert

1. **Modellerkennung**: Automatische Erkennung der Tankkapazität
2. **Verbrauchsmessung**: Berechnet ml/m² während der Reinigung
3. **Lernende KI**: Passt den Verbrauch an deine Gegebenheiten an
4. **Reinigungsmittel**: Separates Tracking für Detergent

### Verfügbare States

| State | Beschreibung |
|-------|--------------|
| `water.Current` | Aktueller Wasserstand (ml) |
| `water.PureWaterTank` | Wasserstand in Prozent |
| `water.CurrentMlPerSqm` | Aktueller Verbrauch (ml/m²) |
| `water.LearningStats` | Lernstatistiken |
| `water.RoomConsumption` | Verbrauch pro Raum |
| `detergent.CurrentMl` | Reinigungsmittel (ml) |
| `detergent.EstimatedRefillDate` | Voraussichtliches Nachfüll-Datum |

---

<a name="fehlerbehebung-de"></a>
## 🔍 Fehlerbehebung

### Häufige Probleme

#### 1. Verbindung zur Cloud schlägt fehl

```
Login error response: "invalid_grant"
```

**Lösung:**
- Überprüfe Benutzername und Passwort
- Eventuell ist die Zwei-Faktor-Authentifizierung aktiviert

#### 2. Karte wird nicht generiert

```
Error: Cannot find module 'canvas'
```

**Lösung:** Canvas-Bibliothek manuell installieren:
```bash
cd /opt/iobroker
npm install canvas
```

#### 3. Hoher Speicherverbrauch

**Lösung:**
- Aktiviere den Memory Cleaner in den Einstellungen
- Starte Node.js mit `--expose-gc`
- Reduziere das Aktualisierungsintervall

#### 4. Alexa erkennt keine Befehle

**Lösung:**
- Stelle sicher, dass der Alexa-Adapter installiert ist
- Prüfe ob `alexa2.0.History.summary` existiert
- Bei Komponenten-Status/Reset: **MUSS** ein Robot-Keyword enthalten sein (z.B. "roboter", "saugroboter")
- Sage "Alexa, Hilfe für den Roboter" für Beispiele

### Logging aktivieren

Setze den State `dreamehome.0.settings.showlog` auf `true`, um detaillierte Logs zu erhalten.

---

## 📝 Changelog

### [2.0.0] - 2026-04-08
- **Complete code rewrite** | **Komplett überarbeitete Codebasis**
- New 3D map widget with interactive elements | Neues 3D-Karten-Widget mit interaktiven Elementen
- Learning system for personalized cleaning | Lernendes System für personalisierte Reinigung
- Water tracking with AI | Wasserverbrauchs-Tracking mit KI
- Support for Matrix models (mop types A/B/C) | Unterstützung für Matrix-Modelle (Mop-Typen A/B/C)
- Cleaning history system with obstacle detection, blocked rooms visualization, and date picker | Reinigungsverlauf-System mit Hinderniserkennung, blockierten Räumen und Datumsauswahl
- Improved voice control with synonym recognition | Verbesserte Sprachsteuerung mit Synonym-Erkennung
- Telegram integration | Telegram-Integration
- Resource monitoring with automatic restart | Ressourcen-Monitoring mit automatischem Restart

---

## 📄 Lizenz / License

MIT License

Copyright (c) 2026 Spayrosam

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, AR
