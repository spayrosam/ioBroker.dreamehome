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
var objects_exports = {};
__export(objects_exports, {
  extend: () => extend,
  filter: () => filter
});
module.exports = __toCommonJS(objects_exports);
function filter(obj, predicate) {
  return Object.fromEntries(Object.entries(obj).filter(([key, value]) => predicate(value, key)));
}
function extend(target, ...sources) {
  if (target == null)
    target = {};
  for (const source of sources) {
    for (const [prop, val] of Object.entries(source)) {
      if (val === null) {
        target[prop] = val;
      } else if (typeof target[prop] === "object" && typeof val === "object") {
        target[prop] = extend(target[prop], val);
      } else if (typeof val === "object") {
        target[prop] = extend({}, val);
      } else {
        target[prop] = val;
      }
    }
  }
  return target;
}
//# sourceMappingURL=index.js.map
