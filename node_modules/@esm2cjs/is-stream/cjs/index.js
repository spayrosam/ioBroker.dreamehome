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
var esm_exports = {};
__export(esm_exports, {
  isDuplexStream: () => isDuplexStream,
  isReadableStream: () => isReadableStream,
  isStream: () => isStream,
  isTransformStream: () => isTransformStream,
  isWritableStream: () => isWritableStream
});
module.exports = __toCommonJS(esm_exports);
function isStream(stream) {
  return stream !== null && typeof stream === "object" && typeof stream.pipe === "function";
}
function isWritableStream(stream) {
  return isStream(stream) && stream.writable !== false && typeof stream._write === "function" && typeof stream._writableState === "object";
}
function isReadableStream(stream) {
  return isStream(stream) && stream.readable !== false && typeof stream._read === "function" && typeof stream._readableState === "object";
}
function isDuplexStream(stream) {
  return isWritableStream(stream) && isReadableStream(stream);
}
function isTransformStream(stream) {
  return isDuplexStream(stream) && typeof stream._transform === "function";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isDuplexStream,
  isReadableStream,
  isStream,
  isTransformStream,
  isWritableStream
});
//# sourceMappingURL=index.js.map
