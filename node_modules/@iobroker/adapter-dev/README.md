# ioBroker adapter-dev

All dependencies an ioBroker adapter developer needs.

[
![node](https://img.shields.io/node/v/@iobroker/adapter-dev.svg)
![npm](https://img.shields.io/npm/v/@iobroker/adapter-dev.svg)
](https://www.npmjs.com/package/@iobroker/adapter-dev)
![License](https://img.shields.io/npm/l/@iobroker/adapter-dev.svg)

## Installation

To use this library, add it to your dev dependencies:

```bash
npm install --save-dev @iobroker/adapter-dev
```

Add the following to the `scripts` section of your `package.json`:

```json5
  "scripts": {
	// ... other scripts before this
	"translate": "translate-adapter",
	// If you need to compile React or TypeScript:
	"build": "build-adapter",
  }
```

If you don't have any i18n JSON files yet, call the following exactly once:

```bash
npm run translate to-json
```

## TL;DR

- You should only update i18n JSON files and you shouldn't touch words.js anymore.
- Add new strings only to the English JSON file.
- Call the following command whenever you add any text in JSON files (inside the admin i18n folder or in `io-package.json`).
    - If you have an HTML/JavaScript admin UI: `npm run translate all`
    - If you have a React admin UI: `npm run translate`
- Run the following commands to (re)compile your adapter:
    - If you are using TypeScript: `npm run build-adapter typescript`
    - If you have a React admin UI: `npm run build-adapter react`
    - If you have both: `npm run build-adapter all`

## Manage Translations

With the above setup completed, you can use the different commands of `translate-adapter` simply by calling:

```bash
npm run translate <command>
```

The commands exist in three forms (all three will be shown as examples below):

- full name: a self-explaining name
- short code: a one-character command
- legacy name: the same name as previously used in gulp

In most cases, you don't need to specify any additional arguments as the defaults should match most adapters.

Note: if you need to provide arguments, you must add a double dash `--` before any arguments!

```bash
npm run translate <command> -- <args>
```

### Global Command Line Arguments

The following command line arguments can be passed to all commands:

- `--io-package`: Path to the io-package.json file. Short: `-p`. Default: `./io-package.json`
- `--admin`: Path to the admin directory. Short: `-a`. Default: `./admin`
- `--words`: Path to the words.js file. Short: `-w`. Default: searches it in the admin directory, either `<admin-dir>/words.js` or `<admin-dir>/js/words.js`.
- `--base`: Path to the english i18n file, multiple files are possible. Short: `-b`. Default: searches it in the admin directory, it will be `<admin-dir>/i18n/en/translations.json` or/and `<admin-dir>/src/i18n/en.json`
- `--languages`: Specify a subset of languages to be translated. Short `-l`. Default: all languages.

### `translate` Command

This is the default command and does not need to be specified.

```bash
npm run translate                             # (default)
npm run translate translate                   # full name/legacy
npm run translate t                           # short code
npm run translate t -- -l de fr it            # Only translate into german, french and italian
```

Translates all not yet translated strings in `io-package.json` and the i18n JSON files to all supported languages using Google Translate.

Previously known as `gulp translate`.

### `to-json` Command

```bash
npm run translate to-json                     # full name
npm run translate j                           # short code
npm run translate adminWords2languages        # legacy
```

Converts `words.js` to the different i18n JSON files; this should be used exactly once when there are no JSON files yet.

Previously known as `gulp adminWords2languages`.

### `to-words` Command

```bash
npm run translate to-words                    # full name
npm run translate w                           # short code
npm run translate adminLanguages2words        # legacy
```

Updates `words.js` from the different i18n JSON files; call this whenever you modify any of your JSON files manually. This is also automatically called by [Weblate](https://weblate.iobroker.net/) whenever translations are updated.

Previously known as `gulp adminLanguages2words`.

### `convert` Command

```bash
npm run translate convert                     # full name
npm run translate c                           # short code
```

Converts old structure of i18n files, like `i18n/LANG/translations.json` to new one `i18n/LANG.json`. The new structure is preferred.

Additionally, it will convert the indent to 4 spaces, line endings to LF and sort the keys.

### `all` Command

```bash
npm run translate all                         # full name
npm run translate a                           # short code
npm run translate translateAndUpdateWordsJS   # legacy
```

Calls `translate` and afterwards updates `words.js` using `to-words` followed by `to-json`.

Previously known as `gulp translateAndUpdateWordsJS`.

### Environment Variables

#### Instead of Command Line Arguments

All command line arguments can also be provided as environment variables. Just prefix any argument with `IOBROKER_TRANSLATE_`:

- `--io-package` becomes `IOBROKER_TRANSLATE_IO_PACKAGE`
- `--admin` becomes `IOBROKER_TRANSLATE_ADMIN`
- `--words` becomes `IOBROKER_TRANSLATE_WORDS`
- `--base` becomes `IOBROKER_TRANSLATE_BASE`
- `--languages` becomes `IOBROKER_TRANSLATE_LANGUAGES`

#### Translate with Google Translate Credentials

If you wish to use the Google Translate V3 API, you can set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to point to a credentials file, so the translations can use larger quota for translations (which may result in costs).

The file can be generated on the Google Cloud Platform by creating a Service Account for Google Translate V3. See [here](https://cloud.google.com/translate/docs/setup) for additional information. The expected format looks something like this:

```json
{
	"type": "service_account",
	"project_id": "your-project-id-123456",
	"private_key_id": "1234567890abcdef1234567890abcdef12345678",
	"private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
	"client_email": "your-app-name@your-project-id-123456.iam.gserviceaccount.com",
	"client_id": "123456789012345678901",
	"auth_uri": "https://accounts.google.com/o/oauth2/auth",
	"token_uri": "https://oauth2.googleapis.com/token",
	"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
	"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-app-name%40your-project-id-123456.iam.gserviceaccount.com"
}
```

## Compile adapter files

The `build-adapter` command uses esbuild under the hood for lightning fast compilation. It has an extensive set of options you can use to fine tune the compilation process, although the defaults should work out of the box when the adapter was created with `@iobroker/create-adapter`:

```bash
npm run build typescript [options]      # TypeScript, full name
npm run build ts         [options]      # TypeScript, short code
npm run build react      [options]      # React
npm run build all        [options]      # Everything (at the moment this is TypeScript and React)
```

These options are available for all commands:

- `--watch`, short `-w`: Watch for changes and recompile

These only have an effect for the `ts/typescript` and `all` commands:

- `--typescriptRootDir`: Directory where the TypeScript part of the adapter is located. Default: `.`
- `--typescriptOutDir`: Directory where the compiled TypeScript output will be placed, relative to `typescriptRootDir`. Default: `build`
- `--typescriptPattern`: Glob pattern for TypeScript source files, relative to typescriptRootDir. Should not be changed unless bundling is enabled. Each match will result in a separate bundle. Default: `src/**/*.ts`
- `--typescriptTsConfig`: Path to the tsconfig.json file used for building TypeScript, relative to `typescriptRootDir`. Default: `tsconfig.build.json`
- `--typescriptBundle`: Bundle compiled TypeScript output into one file per entry point. Default: `false`
- `--typescriptFormat`: [Format](https://esbuild.github.io/api/#format) of the output file(s). Only CommonJS (`cjs`) is supported at the moment.
- `--typescriptCompileTarget`: [Compilation target](https://esbuild.github.io/api/#target) for TypeScript. Determines which JS features will be used in the output file. Should be in sync with the minimum Node.js version supported by the adapter/ioBroker. Default: `node12`
- `--typescriptRaw`: An object of raw [esbuild options](https://esbuild.github.io/api/#simple-options) that are passed to the build process for TypeScript. This has to be specified in a config file (see below). Default: (none)

These only have an effect for the `react` and `all` commands:

- `--reactRootDir`: Directory where the React part of the adapter is located. Default: `admin`
- `--reactOutDir`: Directory where the compiled React output will be placed, relative to `reactRootDir`. Default: `build`
- `--reactPattern`: Glob pattern for React source files, relative to reactRootDir. Each match will result in a separate bundle. Default: `src/{index,tab}.{tsx,jsx}`
- `--reactTsConfig`: Path to the tsconfig.json file used for building React, relative to `reactRootDir`. Default: `tsconfig.json`
- `--reactBundle`: Bundle compiled React output into one file per entry point. Default: `true`
- `--reactFormat`: [Format](https://esbuild.github.io/api/#format) of the output file(s). Supports `iife` and `esm`, but ESM should only be selected when targeting modern browsers exclusively.
- `--reactSplitting`: Moves common code from multiple entry points into separate files, so they only have to be loaded once. Only relevant when `reactBundle` is `true`, `reactFormat` is `"esm"` and there are multiple entry points. If this is the case and there are [unexpected differences](https://esbuild.github.io/api/#splitting) between the watch mode and a normal build, try turning this off. Default: `true`
- `--reactCompileTarget`: [Compilation target](https://esbuild.github.io/api/#target) for React. Determines which JS features will be used in the output file. Default: `es2018`
- `--reactRaw`: An object of raw [esbuild options](https://esbuild.github.io/api/#simple-options) that are passed to the build process for React. This has to be specified in a config file (see below). Default: (none)

### Using a config file

By default, the build script looks for a `.buildconfig.json` file where the above options can be saved (without leading `--`), so they don't have to be specified on the command line. Example:

```json
{ "typescriptBundle": true, "typescriptCompileTarget": "node16" }
```

This path can be changed with the `--config` option, short `-c`.

When using a `.js` file instead, this can be used to specify additional [esbuild plugins](https://github.com/esbuild/community-plugins), for example:

```js
const { html } = require("@esbuilder/html");

module.exports = { reactRaw: { plugins: [html()] } };
```

## clean-dir 
This tool deletes a directory to be specified recursively.

```bash
npm run clean-dir <directory>                         # directory to remove
```


## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 1.4.0 (2025-02-22)
- (ticaki) rimraf replaced by by internal tool.
- (hombach) change year to 2025
- (hombach) Fix two vulnerabilities
- (hombach) Bump dev dependencies
- (hombach) add tests for node.js 22, remove node 16 tests
- (@GermanBluefox) Added `convert` command to convert old i18n structure to new one
- (@GermanBluefox) Packages were updated
- (@UncleSamSwiss) Change default path for translation JSON files to `admin/i18n/en.json`; the old path is still supported for existing repositories

### 1.3.0 (2024-02-18)

- (kleinOr/Apollon77) Detects and keeps space indentation of io-package
- (Steiger04) Fix handling of dot keys for esbuild
- (Steiger04) Update esbuild and adjust watch mode
- (Steiger04) process.env.NODE_ENV is now also available server side

### 1.2.0 (2022-10-23)

- (Grizzlebee) only translate linkText from messages if existent
- (Apollon77) Add ukrainian as language for translations

### 1.1.0 (2022-09-14)

- (Grizzelbee) Also translate admin messages in io-package.json
- (AlCalzone) support specifying raw esbuild options, like loaders/plugins

### 1.0.1 (2022-08-17)

- (Apollon77) make sure that also texts with multiple sentences are correctly translated via Google Translate

### 1.0.0 (2022-02-15)

- (AlCalzone) Add build script to compile TypeScript and React using the blazing fast esbuild

### 0.1.0 (2021-09-21)

- (UncleSamSwiss) Removed dependency on gulp
- (UncleSamSwiss) Rewrote translation management as a regular Node.js application

### 0.0.4 (2021-05-26)

- (UncleSamSwiss) Implemented gulp tasks very similar to the existing tasks

### 0.0.3 (2021-05-06)

- (UncleSamSwiss) Fixed npm publishing

### 0.0.2 (2021-05-06)

- (UncleSamSwiss) Initial repository setup
