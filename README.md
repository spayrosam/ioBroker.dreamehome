# dreamehome
![Logo](admin/dreamehome.png)

Dreame Home adapter for ioBroker
# ioBroker.dreamehome
[![NPM version](https://img.shields.io/npm/v/iobroker.dreame.svg)](https://www.npmjs.com/package/iobroker.dreamehome)
[![Downloads](https://img.shields.io/npm/dm/iobroker.dreame.svg)](https://www.npmjs.com/package/iobroker.dreamehome)

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
1. Fixed the crash after map download.
2. Added carpet cleaning function.
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
