# ESLint config for ioBroker projects

## Installation

Install the package via

```bash
npm i @iobroker/eslint-config --save-dev
```

## Getting started

Just extend this project in your lint config in your `eslint.config.mjs`.

```js
import config from '@iobroker/eslint-config';

export default [...config];
```

And create a `prettier.config.mjs` with the following content:

```js
import prettierConfig from '@iobroker/eslint-config/prettier.config.mjs';

export default prettierConfig;
```

Optionally, if you are using ESM modules, there is an additional config.
Your `eslint.config.mjs` would then look like this:

```js
import config, { esmConfig } from '@iobroker/eslint-config';

export default [...config, ...esmConfig];
```

## ReactJS project

To use this config in a ReactJS project, your `eslint.config.mjs` would then look like this:

```js
import config, { reactConfig } from '@iobroker/eslint-config';

export default [...config, ...reactConfig];
```

It is suggested to create separate `eslint.config.mjs` files for backend and for ReactJS.

## Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ### **WORK IN PROGRESS**
-->
### 2.0.1 (2025-03-10)

-   (@foxriver76) make prettier peer dependency `>=`
-   (@foxriver76) remove TypeScript peer dependency

### 2.0.0 (2025-03-04)

-   (@GermanBluefox) Some eslint packages were updated with major version (TypeScript 5.8)

### 1.0.1 (2025-03-04)

-   (@foxriver76) Disable `jsdoc/no-types` off for non-TypeScript files
-   (@mcm1957) Apply JavaScript rules also to `.mjs` and `.cjs` files

### 1.0.0 (2024-11-17)

-   (@GermanBluefox) Added `no-duplicate-imports` rule
-   (@mcm1957/@foxriver76) allow unused args with `_` prefix in JavaScript too

### 0.1.7 (2024-11-13)

-   (@foxriver76) Allow `require` imports for `.js` files

### 0.1.6 (2024-09-16)

-   (@GermanBluefox) Enforce the use of template literals instead of string concatenation: "Hello, " + name + "!" => `Hello, ${name}!`
-   (@GermanBluefox) Added `no-else-return` rule

### 0.1.5 (2024-09-12)

-   (@GermanBluefox) added ReactJS eslint config file

### 0.1.4 (2024-09-11)

-   (@GermanBluefox) adjust initial `prettier` rules

### 0.1.3 (2024-09-10)

-   (@foxriver76) fixed problems with tsconfig

### 0.1.2 (2024-09-06)

-   (@foxriver76) initial release
