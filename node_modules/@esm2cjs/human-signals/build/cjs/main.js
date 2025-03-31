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
var main_exports = {};
__export(main_exports, {
  signalsByName: () => signalsByName,
  signalsByNumber: () => signalsByNumber
});
module.exports = __toCommonJS(main_exports);
var import_os = require("os");
var import_realtime = require("./realtime.js");
var import_signals = require("./signals.js");
const getSignalsByName = function() {
  const signals = (0, import_signals.getSignals)();
  return signals.reduce(getSignalByName, {});
};
const getSignalByName = function(signalByNameMemo, { name, number, description, supported, action, forced, standard }) {
  return {
    ...signalByNameMemo,
    [name]: { name, number, description, supported, action, forced, standard }
  };
};
const signalsByName = getSignalsByName();
const getSignalsByNumber = function() {
  const signals = (0, import_signals.getSignals)();
  const length = import_realtime.SIGRTMAX + 1;
  const signalsA = Array.from({ length }, (value, number) => getSignalByNumber(number, signals));
  return Object.assign({}, ...signalsA);
};
const getSignalByNumber = function(number, signals) {
  const signal = findSignalByNumber(number, signals);
  if (signal === void 0) {
    return {};
  }
  const { name, description, supported, action, forced, standard } = signal;
  return {
    [number]: {
      name,
      number,
      description,
      supported,
      action,
      forced,
      standard
    }
  };
};
const findSignalByNumber = function(number, signals) {
  const signal = signals.find(({ name }) => import_os.constants.signals[name] === number);
  if (signal !== void 0) {
    return signal;
  }
  return signals.find((signalA) => signalA.number === number);
};
const signalsByNumber = getSignalsByNumber();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  signalsByName,
  signalsByNumber
});
//# sourceMappingURL=main.js.map
