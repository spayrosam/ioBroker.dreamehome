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
var math_exports = {};
__export(math_exports, {
  clamp: () => clamp,
  roundTo: () => roundTo
});
module.exports = __toCommonJS(math_exports);
function clamp(value, min, max) {
  if (min > max) {
    [min, max] = [max, min];
  }
  if (value < min)
    return min;
  if (value > max)
    return max;
  return value;
}
function roundTo(value, digits) {
  const exp = Math.pow(10, digits);
  return Math.round(value * exp) / exp;
}
//# sourceMappingURL=index.js.map
