# @esm2cjs/onetime

This is a fork of https://github.com/sindresorhus/onetime, but automatically patched to support ESM **and** CommonJS, unlike the original repository.

## Install

You can use an npm alias to install this package under the original name:

```
npm i onetime@npm:@esm2cjs/onetime
```

```jsonc
// package.json
"dependencies": {
    "onetime": "npm:@esm2cjs/onetime"
}
```

but `npm` might dedupe this incorrectly when other packages depend on the replaced package. If you can, prefer using the scoped package directly:

```
npm i @esm2cjs/onetime
```

```jsonc
// package.json
"dependencies": {
    "@esm2cjs/onetime": "^ver.si.on"
}
```

> **Note:**
> We strive to use the same versions as the upstream package, but unfortunately there is a bit of a learning curve with these things.
> As a result, we had to re-publish `6.0.0` as `6.0.1-cjs.0`.

## Usage

```js
// Using ESM import syntax
import onetime from "onetime";

// Using CommonJS require()
const onetime = require("onetime").default;
```

> **Note:**
> Because the original module uses `export default`, you need to append `.default` to the `require()` call.

For more details, please see the original [repository](https://github.com/sindresorhus/onetime).

## Sponsoring

To support my efforts in maintaining the ESM/CommonJS hybrid, please sponsor [here](https://github.com/sponsors/AlCalzone).

To support the original author of the module, please sponsor [here](https://github.com/sindresorhus/onetime).
