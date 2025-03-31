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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var controllerTools_exports = {};
__export(controllerTools_exports, {
  commonTools: () => commonTools,
  controllerCommonModulesInternal: () => controllerCommonModulesInternal,
  controllerToolsInternal: () => controllerToolsInternal,
  resolveNamedModule: () => resolveNamedModule
});
module.exports = __toCommonJS(controllerTools_exports);
var import_node_path = require("node:path");
var import_node_module = require("node:module");
var import_helpers = require("./helpers.js");
var utils = __toESM(require("./utils.js"));
const import_meta = {};
const require2 = (0, import_node_module.createRequire)(import_meta.url || `file://${__filename}`);
let controllerCommonModulesInternal;
function resolveControllerTools() {
  let importPath = (0, import_helpers.tryResolvePackage)(["@iobroker/js-controller-common"]);
  if (importPath) {
    try {
      controllerCommonModulesInternal = require2(importPath);
      const { tools } = controllerCommonModulesInternal;
      if (tools) {
        return tools;
      }
    } catch {
    }
  }
  importPath = (0, import_helpers.tryResolvePackage)(["@iobroker/js-controller-common"], [(0, import_node_path.join)(utils.controllerDir, "node_modules")]);
  if (importPath) {
    try {
      controllerCommonModulesInternal = require2(importPath);
      const { tools } = controllerCommonModulesInternal;
      if (tools) {
        return tools;
      }
    } catch {
    }
  }
  importPath = (0, import_node_path.join)(utils.controllerDir, "lib");
  try {
    const tools = require2((0, import_node_path.join)(importPath, "tools"));
    if (tools) {
      return tools;
    }
  } catch {
  }
  throw new Error("Cannot resolve tools module");
}
const controllerToolsInternal = resolveControllerTools();
function resolveNamedModule(name, exportName = name) {
  if (controllerCommonModulesInternal == null ? void 0 : controllerCommonModulesInternal[exportName]) {
    return controllerCommonModulesInternal[exportName];
  }
  const importPaths = [
    (0, import_node_path.join)(utils.controllerDir, "build/cjs/lib", name),
    (0, import_node_path.join)(utils.controllerDir, "build/lib", name),
    (0, import_node_path.join)(utils.controllerDir, "lib", name)
  ];
  for (const importPath of importPaths) {
    try {
      const module2 = require2(importPath);
      if (module2) {
        return module2;
      }
    } catch {
    }
  }
  throw new Error(`Cannot resolve JS-Controller module ${name}.js`);
}
function pattern2RegEx(pattern) {
  return controllerToolsInternal.pattern2RegEx(pattern);
}
function getAdapterDir(adapter) {
  return controllerToolsInternal.getAdapterDir(adapter);
}
function getInstalledInfo(hostJsControllerVersion) {
  return controllerToolsInternal.getInstalledInfo(hostJsControllerVersion);
}
function isDocker() {
  return controllerToolsInternal.isDocker();
}
function isLocalAddress(ip) {
  return controllerToolsInternal.isLocalAddress(ip);
}
function isListenAllAddress(ip) {
  return controllerToolsInternal.isListenAllAddress(ip);
}
function getLocalAddress() {
  return controllerToolsInternal.getLocalAddress();
}
function getListenAllAddress() {
  return controllerToolsInternal.getListenAllAddress();
}
const commonTools = {
  pattern2RegEx,
  getAdapterDir,
  getInstalledInfo,
  isDocker,
  getLocalAddress,
  getListenAllAddress,
  isLocalAddress,
  isListenAllAddress,
  password: resolveNamedModule("password"),
  session: resolveNamedModule("session"),
  zipFiles: resolveNamedModule("zipFiles")
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  commonTools,
  controllerCommonModulesInternal,
  controllerToolsInternal,
  resolveNamedModule
});
//# sourceMappingURL=controllerTools.js.map
