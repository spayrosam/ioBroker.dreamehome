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
var expiring_set_exports = {};
__export(expiring_set_exports, {
  ExpiringSet: () => ExpiringSet
});
module.exports = __toCommonJS(expiring_set_exports);
var import_events = require("events");
class ExpiringSet extends import_events.EventEmitter {
  // The internal set used to store values
  _set;
  _timeouts = /* @__PURE__ */ new Map();
  /**
   * The time in milliseconds each entry will last
   */
  expiryTime;
  constructor(expiryTime, iterable) {
    super();
    if (expiryTime < 1) {
      throw new Error("The expiry time must be a positive integer");
    }
    this.expiryTime = expiryTime;
    this._set = new Set(iterable);
    this._set.forEach((entry) => this.queueForExpiry(entry));
  }
  queueForExpiry(entry) {
    if (this._timeouts.has(entry)) {
      clearTimeout(this._timeouts.get(entry));
    }
    const newTimeout = setTimeout(() => {
      this._set.delete(entry);
      this._timeouts.delete(entry);
      this.emit("expired", entry);
    }, this.expiryTime).unref();
    this._timeouts.set(entry, newTimeout);
  }
  add(value) {
    this._set.add(value);
    this.queueForExpiry(value);
    return this;
  }
  clear() {
    this._set.clear();
    this._timeouts.forEach((timeout) => clearTimeout(timeout));
    this._timeouts.clear();
  }
  delete(value) {
    const ret = this._set.delete(value);
    if (this._timeouts.has(value)) {
      clearTimeout(this._timeouts.get(value));
      this._timeouts.delete(value);
    }
    return ret;
  }
  forEach(callbackfn, thisArg) {
    this._set.forEach((v1, v2) => callbackfn(v1, v2, this), thisArg);
  }
  has(value) {
    return this._set.has(value);
  }
  get size() {
    return this._set.size;
  }
  /** Iterates over values in the set. */
  [Symbol.iterator]() {
    return this._set[Symbol.iterator]();
  }
  /**
   * Returns an iterable of [v,v] pairs for every value `v` in the set.
   */
  entries() {
    return this._set.entries();
  }
  /**
   * Despite its name, returns an iterable of the values in the set,
   */
  keys() {
    return this._set.keys();
  }
  /**
   * Returns an iterable of values in the set.
   */
  values() {
    return this._set.values();
  }
}
//# sourceMappingURL=expiring-set.js.map
