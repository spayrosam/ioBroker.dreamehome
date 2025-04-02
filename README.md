![Logo](admin/dreamehome.png)

# ioBroker.dreamehome

[![NPM version](https://img.shields.io/npm/v/iobroker.dreamehome.svg)](https://www.npmjs.com/package/iobroker.dreamehome)
[![Downloads](https://img.shields.io/npm/dm/iobroker.dreamehome.svg)](https://www.npmjs.com/package/iobroker.dreamehome)
![Number of Installations](https://iobroker.live/badges/dreamehome-installed.svg)

[![NPM](https://nodei.co/npm/iobroker.dreamehome.png?downloads=true)](https://nodei.co/npm/iobroker.dreamehome/)

**Tests:** ![Test and Release](https://github.com/spayrosam/ioBroker.dreamehome/workflows/Test%20and%20Release/badge.svg)

## dreamehome adapter for ioBroker

Adapter for dreame home devices

## Changelog

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### 0.1.0 (30.03.2025) 

New Features:
- Increased Flexibility in Cleaning Control:  
  The adapter now allows you to set a different cleaning mode (suction, mopping, or a combination of both) for each room individually. This goes beyond the default limitations of the Dreame robot, which usually accepts only one cleaning mode for all rooms.

- Support for Alternative Room and Cleaning Descriptors:  
  Room names and cleaning actions are now more flexible. Terms like "Living room mop wet" or "Parlor mop intensive" are automatically treated as equivalent, so you can use different terms to trigger the same cleaning mode.

- Automatic Mapping of Rooms and Commands:  
  The adapter translates alternative room identifiers (e.g., "Living room," "Parlor," "salon") into the accepted standard identifiers, enabling seamless and user-friendly control. Similarly, various phrasing for suction or mopping (e.g., "vacuuming" or "sweeping") are correctly recognized and mapped to the appropriate cleaning mode.

Examples of New Commands:
- "Living room mop wet" = "Parlor mop intensive"
- "Bedroom vacuum strong" = "Master bedroom vacuum intensive" = "Masterroom vacuum heavy"
- "Kitchen vacuum and mop wet and ultra" = "Kitchen nook vacuum and mop drenched and full"

Improvements:
- Avoidance of Duplicate or Conflicting Commands:  
  The system automatically checks if conflicting cleaning modes or repeated commands for the same room are sent within a short time frame to prevent unwanted duplicate actions.

- Better Control of Active Cleaning Processes:  
  If a cleaning process is already running, the adapter detects this and asks the user if the ongoing process should be stopped and a new one started. This ensures a smoother user experience and prevents simultaneous cleaning operations.

🇺🇸 Documentation
---
Scenario 1: Multiple Rooms with Mixed Modes and Repetitions
- Command: „Living room vacuum high and Kitchen vacuum medium and Kitchen mop low 2 times“
- Explanation:
  - „Living room vacuum high“: The robot starts vacuuming the living room at high suction power.
  - „Kitchen vacuum medium“: In the kitchen, the vacuum mode is set to medium.
  - „Kitchen mop low 2 times“: In the kitchen, the mop mode is set to low, and the mopping process is repeated twice.
  
  Action: The robot will first clean the living room (vacuum high), then the kitchen (vacuum medium), and afterward perform the low mopping mode in the kitchen twice.

Scenario 2: Two Rooms with One Mode (Only Vacuuming or Mopping)
- Command: „Hallway vacuum high and Bathroom mop intensive“
- Explanation:
  - „Hallway vacuum high“: The robot will work in the hallway with the highest vacuum mode.
  - „Bathroom mop intensive“: The bathroom will be mopped with the highest mop mode (Intensive).

  Action: The robot will start vacuuming in the hallway on high mode and then move to the bathroom to mop intensively.

Scenario 3: User Abort with Missing Modes
- Command: „Living room vacuum and Kitchen mop“
- Explanation:
  - The vacuuming mode for the kitchen is missing, making this an incomplete command.
  
  Action: Since the vacuuming mode for the kitchen is not specified and a gap in the command is detected, Alexa will prompt the user to correct the missing mode.

  Alexa Response: „The following rooms are missing settings: Living room: Suction level and Kitchen: Mopping level. Please define the missing values.“

Scenario 4: Different Cleaning Modes with Room and Mode Synonyms
- Command: „Parlor vacuum intensive and Kitchen mop after vacuum low and strong and Bathroom mop intensive“
- Explanation:
  - The user uses the synonym „Parlor“ instead of „Living room.“ Since DreameHome supports this flexibility, „Parlor“ is recognized as „Living room,“ and the mode „Vacuum intensive“ is applied.
  - The kitchen is cleaned with „Vacuum low followed by mopping strong,“ and the bathroom is mopped intensively.
  
  Action: The robot will perform the following actions:
  - Parlor (Living room) vacuum intensive
  - Kitchen mop low after vacuum strong
  - Bathroom mop intensive

Scenario 5: Repeated Cleaning of a Room
- Command: „Living room vacuum high 3 times and Bathroom mop intensive 2 times“
- Explanation:
  - The robot is asked to clean the living room three times with the "high" vacuum mode and the bathroom twice with the "intensive" mop mode.
  
  Action: The robot will start cleaning the living room with high suction mode and repeat the process three times. Afterward, it will move to the bathroom to mop intensively twice.

Scenario 6: Stopping Cleaning When an Abort Command Is Given
- Command: „"stop cleaning", "stop vacuuming", "stop cleaning process", "robot off", "please stop cleaning", "end cleaning", "pause cleaning", "vacuuming stop", "vacuum cleaner off", "robot turn off", "vacuuming end", "cleaning stop", "vacuuming disable", "floor cleaning stop", "vacuum cleaner turn off", "vacuumer off", "robot deactivate", "dreame stop", "dreame off", "dreame stop cleaning"“
- Explanation:
  - A user can give the command "Stop cleaning" at any time to end the ongoing process.

  Action: When the stop command is given, the robot will immediately stop cleaning and return to its charging station. If the robot is actively cleaning, the process will be aborted.

  Alexa Response: „The cleaning has been stopped, and the robot is returning to the charging station.“
  
🇩🇪 Dokumentation
---
Szenario 1: Mehrere Räume mit gemischten Modi und Wiederholungen
- Befehl: „Wohnzimmer saugen hoch und Küche saugen mittel und Küche wischen niedrig 2 mal“
- Erklärung:
  - „Wohnzimmer saugen hoch“: Der Roboter startet im Wohnzimmer mit dem Saugmodus auf hoher Stufe.
  - „Küche saugen mittel“: In der Küche wird der Saugmodus auf mittlerer Stufe eingestellt.
  - „Küche wischen niedrig 2 mal“: In der Küche wird der Wischmodus auf niedriger Stufe eingestellt, und der Wischvorgang wird zweimal wiederholt.
  
  Aktion: Der Roboter wird zuerst das Wohnzimmer reinigen (Saugen hoch), dann die Küche (Saugen mittel), und danach den Wischmodus auf niedrig in der Küche zweimal ausführen.

Szenario 2: Zwei Räume mit einem Modus (nur Saugen oder Wischen)
- Befehl: „Flur saugen hoch und Bad wischen intensiv“
- Erklärung:
  - „Flur saugen hoch“: Der Roboter wird im Flur mit dem höchsten Saugmodus arbeiten.
  - „Bad wischen intensiv“: Das Bad wird mit dem höchsten Wischmodus (Intensiv) gewischt.

  Aktion: Der Roboter startet mit dem Saugen im Flur auf hoher Stufe und geht danach ins Bad, um dort intensiv zu wischen.

Szenario 3: Benutzerabbruch bei fehlenden Modi
- Befehl: „Wohnzimmer saugen und Küche wischen“
- Erklärung:
  - Der Befehl fehlt für das „Saugen“ im Küchenbereich, was eine unvollständige Anweisung darstellt.
  
  Aktion: Da in der Küche der Saugmodus nicht angegeben wurde und eine Lücke im Befehl erkannt wird, fordert Alexa den Benutzer auf, den fehlenden Modus zu korrigieren.

  Antwort von Alexa: „Für folgende Räume fehlen Angaben: Wohnzimmer: Sauglevel und Küche: Wischlevel. Bitte definiere die fehlenden Werte.“

Szenario 4: Unterschiedliche Reinigungsmodi mit Raum- und Modus-Synonymen
- Befehl: „Stube saugen intensiv und Küche wischen nach saugen niedrig und kraftvoll und Bad wischen intensiv“
- Erklärung:
  - Der Benutzer verwendet das Synonym „Stube“ anstelle von „Wohnzimmer“. Da Dreamehome diese Flexibilität unterstützt, wird „Stube“ als „Wohnzimmer“ erkannt und der Modus „Saugen intensiv“ wird zugeordnet.
  - Die Küche wird mit „Saugen niedrig danach Wischen stark“ und das Bad mit „Wischen intensiv“ gereinigt.
  
  Aktion: Der Roboter wird die folgenden Schritte ausführen:
  - Stube (Wohnzimmer) saugen intensiv
  - Küche wischen niedrig nach saugen stark
  - Bad wischen intensiv

Szenario 5: Wiederholte Reinigung eines Raumes
- Befehl: „Wohnzimmer saugen hoch 3 mal und Bad wischen intensiv 2 mal“
- Erklärung:
  - Der Roboter soll das Wohnzimmer dreimal mit dem Saugmodus „hoch“ und das Bad zweimal mit dem Wischmodus „intensiv“ reinigen.
  
  Aktion: Der Roboter startet die Reinigung im Wohnzimmer mit hohem Saugmodus und wiederholt den Vorgang dreimal. Danach geht er ins Bad, um zweimal mit dem intensiven Wischmodus zu reinigen.

Szenario 6: Beenden der Reinigung, wenn ein Abbruchbefehl gegeben wird
- Befehl: „"reinigung abbrechen", "reinigung stoppen", "stop reinigung", "roboter aus", "reinigung bitte abbrechen", "reinigung beenden", "reinigung unterbrechen", "reinigung anhalten", "saugvorgang stoppen", "staubsauger aus", "roboter abschalten", "staubsaugen beenden", "putzen stoppen", "staubsaugen stoppen", "staubsaugen deaktivieren", "bodenreinigung stoppen", "staubsauger ausschalten", "sauger aus", "roboter deaktivieren", "dreame stoppen", "dreame aus", "dreame reinigen beenden"“
- Erklärung:
  - Ein Benutzer kann jederzeit den Befehl „Stopp Reinigung“ geben, um den laufenden Vorgang zu beenden.

  Aktion: Wenn der Befehl zum Stoppen der Reinigung kommt, wird der Roboter sofort gestoppt und zur Ladestation zurückgeschickt. Falls der Roboter gerade aktiv reinigt, wird der Vorgang abgebrochen.

  Antwort von Alexa: „Die Reinigung wurde gestoppt und der Roboter fährt zur Ladestation.“

### 0.9.0 (2025-03-21)

New Features:

- Alexa Command Recognition: The system now recognizes various cleaning commands and supports multiple languages (English and German). It processes different cleaning modes, room names, and suction/mopping levels.  
  - Example Alexa command (English): "Alexa, vacuum the living room twice on high."  
    Beispiel Alexa-Befehl (Deutsch): "Alexa, sauge das Wohnzimmer zweimal auf hoch."

- Room Recognition: The system identifies specific rooms in a command and applies the requested cleaning mode. It can handle multiple rooms in a single command.  
  - Example Alexa command (English): "Alexa, clean the kitchen and the bathroom."  
    Beispiel Alexa-Befehl (Deutsch): "Alexa, reinige die Küche und das Badezimmer."

- Cleaning Modes: New cleaning modes are available based on the provided `AlexacleanModes`, such as Vacuum (5122), Mopping (5121), and Mop after Vacuum (5123).  
  - Example Alexa command (English): "Alexa, mop after vacuuming the bathroom."  
    Beispiel Alexa-Befehl (Deutsch): "Alexa, wische nach dem Saugen im Badezimmer."

- Suction and Mopping Levels: The system now recognizes different suction and mopping levels based on the provided levels and synonyms, allowing detailed cleaning requests.  
  - Example Alexa command (English): "Alexa, vacuum the living room on strong and mop it on wet."  
    Beispiel Alexa-Befehl (Deutsch): "Alexa, sauge das Wohnzimmer auf stark und wische es nass."

- Cancellation of Cleaning: The system recognizes cancellation commands from the `AlexacancelKeywords` list and allows users to stop ongoing cleaning sessions.  
  - Example Alexa command (English): "Alexa, cancel cleaning."  
    Beispiel Alexa-Befehl (Deutsch): "Alexa, abbreche die Reinigung."

Improvements:

- Room-Specific Cleaning: Commands can now be given for specific rooms, and the robot will clean accordingly. If no room is specified, it will prompt the user to clarify.  
  - Example Alexa command (English): "Alexa, clean the living room."  
    Beispiel Alexa-Befehl (Deutsch): "Alexa, reinige das Wohnzimmer."  
  - Response (English): "Please specify the cleaning mode for the living room."  
    Antwort (Deutsch): "Bitte gib den Reinigungsmodus für das Wohnzimmer an."

- Error Handling: The system now handles missing cleaning mode, suction level, or water level in commands by prompting for the missing information.  
  - Example response (English): "Please specify the cleaning mode for the kitchen. You forgot to define the clean mode, suction level, or water level."  
    Beispielantwort (Deutsch): "Bitte gib den Reinigungsmodus für die Küche an. Du hast den Reinigungsmodus, das Sauglevel oder den Wasserlevel vergessen zu definieren."

Bug Fixes:

- Command Ambiguity: Fixed an issue where commands for multiple rooms were misinterpreted or ignored when no cleaning mode was specified.  
  - Example Alexa command (English): "Alexa, clean the kitchen and the bathroom without specifying the mode."  
    Beispiel Alexa-Befehl (Deutsch): "Alexa, reinige die Küche und das Badezimmer, ohne den Modus anzugeben."  
  - Response (English): "Please specify the cleaning mode for the kitchen and the bathroom."  
    Antwort (Deutsch): "Bitte gib den Reinigungsmodus für die Küche und das Badezimmer an."

- Other Changes:

- Enhanced Voice Feedback: The system now provides more detailed and helpful feedback via Alexa, especially when a command is incomplete or unclear.  
  - Example feedback (English): "Cleaning mode: 5122 (Sweeping), Rooms: Living Room, Kitchen."  
    Beispielfeedback (Deutsch): "Reinigungsmodus: 5122 (Staubsaugen), Räume: Wohnzimmer, Küche."

### 0.0.8

New Features Added: Voice Commands Accepted with Alexa Adapter:

### 0.0.7
- Fix for Command Execution Issues Due to Domain Changes from Dreame
- New Control Features Added

### 0.0.6
New Control Features Added:
- Resume Clean Mode: Off/On
- Child Lock: Off/On
- Auto Add Detergent: Off/On
- Auto Mount Mop: Off/On
- Clean Genius: Off/Routine Cleaning/Deep Cleaning
- Smart Auto Wash: Off/Works in Deep Mode/Works in Routine & Deep Mode
- Smart Auto Mop: Off/Works in Deep Mode/Works in Routine & Deep Mode
- Carpet Boost: Off/On
- Intensive Carpet Cleaning: Off/On
- Mop Scalable: Intelligence/Standard/High Frequency
- Mop Extension for Gap Cleaning: Off/On
- Intensive Cleaning for Furniture Legs: Off/On
- Fill-in Light: Off/On
- Collision-Avoidance Mode: Off/On
- Clean Route: Quick/Standard/Intensive/Deep
- Live Video Prompts: The camera is blinking/Voice prompts
- Volume: 1 to 100 

Control Adjusted: 
- Automatic switch off of the Genius Mode when the Custom Mode is activated.
- The map folder has been optimized, and objects have been prepared for communication with the generated VIS.HTML

### 0.0.5
- The map has been improved and room settings are now visible.
- Additionally, additional animations have been added to the charging station..

### 0.0.4

### 0.0.3
- An animation has been added for the charging station.
- Additionally, the history of the robot's position on the map has been corrected, and the map has been improved for better accuracy and user experience.

### 0.0.2
- Fixed the crash after map download.
- Added carpet cleaning function  *(To start the carpet cleaning, select the repetition under object CarpetRepetitionX and the suction strength under object CarpetSuctionLevelX, then set the object CleanCarpetX to true)*.
- Added zone cleaning and spot cleaning features.
- Room names are now visible under the Map.0 or M.01 folder


## License

MIT License

Copyright (c) 2020-2025 Spayrosam

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
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
