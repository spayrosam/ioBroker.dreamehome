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

**0.0.7**
- Fix for Command Execution Issues Due to Domain Changes from Dreame
- New Control Features Added:
![grafik](https://github.com/user-attachments/assets/51153bf7-1492-4bfd-ab38-9da0f416f367)

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

  
**0.0.5**
1. The map has been improved and room settings are now visible.
2. Additionally, additional animations have been added to the charging station..
   ![Screenshot](screenshot.png)
   
**0.0.3**
1. An animation has been added for the charging station.
2. Additionally, the history of the robot's position on the map has been corrected, and the map has been improved for better accuracy and user experience.

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
