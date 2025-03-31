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
var signals_exports = {};
__export(signals_exports, {
  getSignals: () => getSignals
});
module.exports = __toCommonJS(signals_exports);
var import_os = require("os");
var import_core = require("./core.js");
var import_realtime = require("./realtime.js");
const getSignals = function() {
  const realtimeSignals = (0, import_realtime.getRealtimeSignals)();
  const signals = [...import_core.SIGNALS, ...realtimeSignals].map(normalizeSignal);
  return signals;
};
const normalizeSignal = function({
  name,
  number: defaultNumber,
  description,
  action,
  forced = false,
  standard
}) {
  const {
    signals: { [name]: constantSignal }
  } = import_os.constants;
  const supported = constantSignal !== void 0;
  const number = supported ? constantSignal : defaultNumber;
  return { name, number, description, supported, action, forced, standard };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSignals
});
//# sourceMappingURL=signals.js.map
