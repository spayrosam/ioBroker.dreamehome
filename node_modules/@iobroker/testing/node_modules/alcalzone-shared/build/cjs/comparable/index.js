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
var comparable_exports = {};
__export(comparable_exports, {
  compareNumberOrString: () => compareNumberOrString,
  defaultComparer: () => defaultComparer,
  isComparable: () => isComparable
});
module.exports = __toCommonJS(comparable_exports);
function isComparable(obj) {
  return obj != null && typeof obj.compareTo === "function";
}
function compareNumberOrString(a, b) {
  return b > a ? 1 : b === a ? 0 : -1;
}
function defaultComparer(a, b) {
  if (typeof a === typeof b && (typeof a === "number" || typeof a === "string")) {
    return compareNumberOrString(a, b);
  } else if (isComparable(a) && isComparable(b)) {
    return b.compareTo(a);
  }
  throw new Error(`cannot compare ${typeof a} with ${typeof b}`);
}
//# sourceMappingURL=index.js.map
