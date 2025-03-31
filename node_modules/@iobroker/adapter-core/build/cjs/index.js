"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var esm_exports = {};
__export(esm_exports, {
  EXIT_CODES: () => EXIT_CODES,
  I18n: () => I18n,
  commonTools: () => import_controllerTools2.commonTools,
  getAbsoluteDefaultDataDir: () => getAbsoluteDefaultDataDir,
  getAbsoluteInstanceDataDir: () => getAbsoluteInstanceDataDir
});
module.exports = __toCommonJS(esm_exports);
var import_node_path = require("node:path");
var import_controllerTools = require("./controllerTools.js");
var utils = __toESM(require("./utils.js"));
var import_types = require("@iobroker/types");
var import_controllerTools2 = require("./controllerTools.js");
__reExport(esm_exports, require("./utils.js"), module.exports);
var I18n = __toESM(require("./i18n.js"));
function getAbsoluteDefaultDataDir() {
  return (0, import_node_path.join)(utils.controllerDir, import_controllerTools.controllerToolsInternal.getDefaultDataDir());
}
function getAbsoluteInstanceDataDir(adapterObject) {
  return (0, import_node_path.join)(getAbsoluteDefaultDataDir(), adapterObject.namespace);
}
const EXIT_CODES = Object.freeze({
  ...(0, import_controllerTools.resolveNamedModule)("exitCodes", "EXIT_CODES")
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EXIT_CODES,
  I18n,
  commonTools,
  getAbsoluteDefaultDataDir,
  getAbsoluteInstanceDataDir
});
//# sourceMappingURL=index.js.map
