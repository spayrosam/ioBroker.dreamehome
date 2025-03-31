# @esm2cjs/strip-final-newline

This is a fork of https://github.com/sindresorhus/strip-final-newline, but automatically patched to support ESM **and** CommonJS, unlike the original repository.

## Install

Use an npm alias to install this package under the original name:
```
npm i strip-final-newline@npm:@esm2cjs/strip-final-newline
```

```jsonc
// package.json
"dependencies": {
    "strip-final-newline": "npm:@esm2cjs/strip-final-newline@^3.0.1-cjs.0"
}
```

> **Note:**
> We strive to use the same versions as the upstream package, but there was a mistake when publishing `3.0.0`.
> We fixed it, but had to re-publish this version as `3.0.1-cjs.0`.

## Usage

```js
// Using ESM import syntax
import stripFinalNewline from 'strip-final-newline';

// Using CommonJS require()
const stripFinalNewline = require('strip-final-newline').default;
```

> **Note:**
> Because the original module uses `export default`, you need to append `.default` to the `require()` call.


For more details, please see the original [repository](https://github.com/sindresorhus/strip-final-newline).

## Sponsoring

To support my efforts in maintaining the ESM/CommonJS hybrid, please sponsor [here](https://github.com/sponsors/AlCalzone).

To support the original author of the module, please sponsor [here](https://github.com/sindresorhus/strip-final-newline).
