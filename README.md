# dreamehome
![Logo](admin/dreamehome.png)

Dreame Home adapter for ioBroker
# ioBroker.dreamehome

**Attention!!**

**Canvas is required for generating the map. Without it, the adapter will terminate with an error.**

***Check if canvas is installed using the following command:***
```
cd /opt/iobroker/
npm list canvas
```
***If canvas is not installed, run the following command to install it:***
```
cd /opt/iobroker/
npm install canvas
```

***Then, check again by running the first command to ensure that canvas is properly installed.***

*To download the map, please set the object dreamehome.0.xxxxxxxx.map.NewMap to true.*

*To switch between floors, the object dreamehome.0.xxxxxxxx.map.MapNumber must be switched to Map 1 or Map 2.*

*The objects Start-Clean, Update, and Restart are currently disabled..*


## Changelog

$${\color{red}The \space question \space of \space how \space to \space format \space the \space created \space VIS.HTML \space has \space come \space up.}$$ To do this, copy the content from dreamehome.0.xxxxxx.vis.vishtml0 or vishtml1 and format it at https://codebeautify.org/htmlviewer $${\color{blue}(Beautify \space HTML)}$$. Then, create an HTML widget in VIS and paste the formatted content into it.

### **Version 0.9.0 (2025-03-21)**

#### **New Features:**

- **Alexa Command Recognition:** The system now recognizes various cleaning commands and supports multiple languages (English and German). It processes different cleaning modes, room names, and suction/mopping levels.  
  - **Example Alexa command (English):** "Alexa, vacuum the living room twice on high."  
    **Beispiel Alexa-Befehl (Deutsch):** "Alexa, sauge das Wohnzimmer zweimal auf hoch."

- **Room Recognition:** The system identifies specific rooms in a command and applies the requested cleaning mode. It can handle multiple rooms in a single command.  
  - **Example Alexa command (English):** "Alexa, clean the kitchen and the bathroom."  
    **Beispiel Alexa-Befehl (Deutsch):** "Alexa, reinige die Küche und das Badezimmer."

- **Cleaning Modes:** New cleaning modes are available based on the provided `AlexacleanModes`, such as Vacuum (5122), Mopping (5121), and Mop after Vacuum (5123).  
  - **Example Alexa command (English):** "Alexa, mop after vacuuming the bathroom."  
    **Beispiel Alexa-Befehl (Deutsch):** "Alexa, wische nach dem Saugen im Badezimmer."

- **Suction and Mopping Levels:** The system now recognizes different suction and mopping levels based on the provided levels and synonyms, allowing detailed cleaning requests.  
  - **Example Alexa command (English):** "Alexa, vacuum the living room on strong and mop it on wet."  
    **Beispiel Alexa-Befehl (Deutsch):** "Alexa, sauge das Wohnzimmer auf stark und wische es nass."

- **Cancellation of Cleaning:** The system recognizes cancellation commands from the `AlexacancelKeywords` list and allows users to stop ongoing cleaning sessions.  
  - **Example Alexa command (English):** "Alexa, cancel cleaning."  
    **Beispiel Alexa-Befehl (Deutsch):** "Alexa, abbreche die Reinigung."

#### **Improvements:**

- **Room-Specific Cleaning:** Commands can now be given for specific rooms, and the robot will clean accordingly. If no room is specified, it will prompt the user to clarify.  
  - **Example Alexa command (English):** "Alexa, clean the living room."  
    **Beispiel Alexa-Befehl (Deutsch):** "Alexa, reinige das Wohnzimmer."  
  - **Response (English):** "Please specify the cleaning mode for the living room."  
    **Antwort (Deutsch):** "Bitte gib den Reinigungsmodus für das Wohnzimmer an."

- **Error Handling:** The system now handles missing cleaning mode, suction level, or water level in commands by prompting for the missing information.  
  - **Example response (English):** "Please specify the cleaning mode for the kitchen. You forgot to define the clean mode, suction level, or water level."  
    **Beispielantwort (Deutsch):** "Bitte gib den Reinigungsmodus für die Küche an. Du hast den Reinigungsmodus, das Sauglevel oder den Wasserlevel vergessen zu definieren."

#### **Bug Fixes:**

- **Command Ambiguity:** Fixed an issue where commands for multiple rooms were misinterpreted or ignored when no cleaning mode was specified.  
  - **Example Alexa command (English):** "Alexa, clean the kitchen and the bathroom without specifying the mode."  
    **Beispiel Alexa-Befehl (Deutsch):** "Alexa, reinige die Küche und das Badezimmer, ohne den Modus anzugeben."  
  - **Response (English):** "Please specify the cleaning mode for the kitchen and the bathroom."  
    **Antwort (Deutsch):** "Bitte gib den Reinigungsmodus für die Küche und das Badezimmer an."

#### **Other Changes:**

- **Enhanced Voice Feedback:** The system now provides more detailed and helpful feedback via Alexa, especially when a command is incomplete or unclear.  
  - **Example feedback (English):** "Cleaning mode: 5122 (Sweeping), Rooms: Living Room, Kitchen."  
    **Beispielfeedback (Deutsch):** "Reinigungsmodus: 5122 (Staubsaugen), Räume: Wohnzimmer, Küche."

---

**0.0.8**

New Features Added: Voice Commands Accepted with Alexa Adapter:

---

**0.0.7**
- Fix for Command Execution Issues Due to Domain Changes from Dreame
- New Control Features Added:
![grafik](https://github.com/user-attachments/assets/51153bf7-1492-4bfd-ab38-9da0f416f367)

---

**0.0.6**
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
  ![Screenshot](screenshot2.png)

 ---
 
**0.0.5**
1. The map has been improved and room settings are now visible.
2. Additionally, additional animations have been added to the charging station..
   ![Screenshot](screenshot.png)
---
**0.0.4**
---
**0.0.3**
1. An animation has been added for the charging station.
2. Additionally, the history of the robot's position on the map has been corrected, and the map has been improved for better accuracy and user experience.

---
**0.0.2**
1. Fixed the crash after map download.
2. Added carpet cleaning function  *(To start the carpet cleaning, select the repetition under object CarpetRepetitionX and the suction strength under object CarpetSuctionLevelX, then set the object CleanCarpetX to true)*.
3. Added zone cleaning and spot cleaning features.
4. Room names are now visible under the Map.0 or M.01 folder
  
<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->

### **Thanks to**
https://github.com/TA2k/ioBroker.dreame by TA2k

https://github.com/Tasshack/dreame-vacuum by Tasshack

## License

MIT License

Copyright (c) 2020-2025 spayrosam

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
