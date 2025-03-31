# @esm2cjs/path-key

This is a fork of https://github.com/sindresorhus/path-key, but automatically patched to support ESM **and** CommonJS, unlike the original repository.

## Install

Use an npm alias to install this package under the original name:

```
npm i path-key@npm:@esm2cjs/path-key
```

```jsonc
// package.json
"dependencies": {
    "path-key": "npm:@esm2cjs/path-key"
}
```

## Usage

```js
// Using ESM import syntax
import pathKey from "path-key";

// Using CommonJS require()
const pathKey = require("path-key").default;
```

> **Note:**
> Because the original module uses `export default`, you need to append `.default` to the `require()` call.

For more details, please see the original [repository](https://github.com/sindresorhus/path-key).

## Sponsoring

To support my efforts in maintaining the ESM/CommonJS hybrid, please sponsor [here](https://github.com/sponsors/AlCalzone).

To support the original author of the module, please sponsor [here](https://github.com/sindresorhus/path-key).
