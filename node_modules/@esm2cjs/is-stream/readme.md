# @esm2cjs/is-stream

This is a fork of https://github.com/sindresorhus/is-stream, but automatically patched to support ESM **and** CommonJS, unlike the original repository.

## Install

Use an npm alias to install this package under the original name:

```
npm i is-stream@npm:@esm2cjs/is-stream
```

```jsonc
// package.json
"dependencies": {
    "is-stream": "npm:@esm2cjs/is-stream"
}
```

## Usage

```js
// Using ESM import syntax
import { isStream } from "is-stream";

// Using CommonJS require()
const { isStream } = require("is-stream");
```

For more details, please see the original [repository](https://github.com/sindresorhus/is-stream).

## Sponsoring

To support my efforts in maintaining the ESM/CommonJS hybrid, please sponsor [here](https://github.com/sponsors/AlCalzone).

To support the original author of the module, please sponsor [here](https://github.com/sindresorhus/strip-final-newline).
