# @esm2cjs/npm-run-path

This is a fork of https://github.com/sindresorhus/npm-run-path, but automatically patched to support ESM **and** CommonJS, unlike the original repository.

## Install

You can use an npm alias to install this package under the original name:

```
npm i npm-run-path@npm:@esm2cjs/npm-run-path
```

```jsonc
// package.json
"dependencies": {
    "npm-run-path": "npm:@esm2cjs/npm-run-path"
}
```
but `npm` might dedupe this incorrectly when other packages depend on the replaced package. If you can, prefer using the scoped package directly:

```
npm i @esm2cjs/npm-run-path
```

```jsonc
// package.json
"dependencies": {
    "@esm2cjs/npm-run-path": "^ver.si.on"
}
```

> **Note:**
> We strive to use the same versions as the upstream package, but unfortunately there is a bit of a learning curve with these things.
> As a result, we had to re-publish `5.1.0` as `5.1.1-cjs.0`.

## Usage

```js
// Using ESM import syntax
import { npmRunPath, npmRunPathEnv } from "npm-run-path";

// Using CommonJS require()
const { npmRunPath, npmRunPathEnv } = require("npm-run-path");
```

For more details, please see the original [repository](https://github.com/sindresorhus/npm-run-path).

## Sponsoring

To support my efforts in maintaining the ESM/CommonJS hybrid, please sponsor [here](https://github.com/sponsors/AlCalzone).

To support the original author of the module, please sponsor [here](https://github.com/sindresorhus/npm-run-path).
