"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var typeguards_exports = {};
__export(typeguards_exports, {
  isArray: () => isArray,
  isObject: () => isObject
});
module.exports = __toCommonJS(typeguards_exports);
function isObject(it) {
  return Object.prototype.toString.call(it) === "[object Object]";
}
function isArray(it) {
  if (Array.isArray != null)
    return Array.isArray(it);
  return Object.prototype.toString.call(it) === "[object Array]";
}
//# sourceMappingURL=index.js.map
