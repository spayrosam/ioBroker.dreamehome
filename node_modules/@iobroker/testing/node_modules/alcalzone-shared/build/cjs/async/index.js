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
var async_exports = {};
__export(async_exports, {
  promiseSequence: () => promiseSequence,
  promisify: () => promisify,
  promisifyNoError: () => promisifyNoError,
  wait: () => wait
});
module.exports = __toCommonJS(async_exports);
function promisify(fn, context) {
  return function(...args) {
    context = context || this;
    return new Promise((resolve, reject) => {
      fn.apply(context, [
        ...args,
        (error, result) => {
          if (error) {
            return reject(error);
          } else {
            return resolve(result);
          }
        }
      ]);
    });
  };
}
function promisifyNoError(fn, context) {
  return function(...args) {
    context = context || this;
    return new Promise((resolve) => {
      fn.apply(context, [
        ...args,
        (result) => {
          return resolve(result);
        }
      ]);
    });
  };
}
function wait(ms, unref = false) {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    if (unref && typeof timeout !== "number")
      timeout.unref();
  });
}
async function promiseSequence(promiseFactories) {
  const ret = [];
  for (const f of promiseFactories) {
    ret.push(await f());
  }
  return ret;
}
//# sourceMappingURL=index.js.map
