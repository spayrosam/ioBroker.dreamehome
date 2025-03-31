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
var sorted_list_exports = {};
__export(sorted_list_exports, {
  SortedList: () => SortedList
});
module.exports = __toCommonJS(sorted_list_exports);
var import_comparable = require("../comparable/index.js");
function findPrevNode(firstNode, item, comparer) {
  let ret;
  let prevNode = firstNode;
  while (prevNode != void 0 && comparer(prevNode.value, item) > 0) {
    ret = prevNode;
    prevNode = prevNode.next;
  }
  return ret;
}
function findNode(firstNode, predicate) {
  let curNode = firstNode;
  while (curNode != null) {
    if (predicate(curNode.value))
      return curNode;
    curNode = curNode.next;
  }
}
function wrappedDefaultComparer(a, b) {
  try {
    return (0, import_comparable.defaultComparer)(a, b);
  } catch (e) {
    if (e instanceof Error && /cannot compare/.test(e.message)) {
      throw new Error("For sorted lists with element types other than number or string, provide a custom comparer or implement Comparable<T> on the elements");
    } else {
      throw e;
    }
  }
}
function isIndex(prop) {
  if (typeof prop === "string")
    prop = Number.parseInt(prop, 10);
  if (typeof prop !== "number" || !Number.isInteger(prop))
    return false;
  if (prop < 0)
    return false;
  return true;
}
class SortedList {
  comparer;
  first;
  last;
  _length = 0;
  get length() {
    return this._length;
  }
  constructor(source, comparer = wrappedDefaultComparer) {
    this.comparer = comparer;
    if (source != null)
      this.add(...source);
    return new Proxy(this, {
      get(target, property, _receiver) {
        if (isIndex(property)) {
          return target.get(parseInt(property, 10));
        } else {
          return target[property];
        }
      }
    });
  }
  /** Inserts new items into the sorted list and returns the new length */
  add(...items) {
    for (const item of items) {
      this.addOne(item);
    }
    return this._length;
  }
  /** Adds a single item to the list */
  addOne(item) {
    const newNode = {
      prev: void 0,
      next: void 0,
      value: item
    };
    if (this._length === 0) {
      this.first = this.last = newNode;
    } else {
      const prevNode = findPrevNode(this.first, item, this.comparer);
      if (prevNode == null) {
        newNode.next = this.first;
        newNode.next.prev = newNode;
        this.first = newNode;
      } else {
        if (prevNode.next != null) {
          prevNode.next.prev = newNode;
          newNode.next = prevNode.next;
        } else {
          this.last = newNode;
        }
        prevNode.next = newNode;
        newNode.prev = prevNode;
      }
    }
    this._length++;
  }
  /** Removes items from the sorted list and returns the new length */
  remove(...items) {
    for (const item of items) {
      this.removeOne(item);
    }
    return this._length;
  }
  /** Removes a single item from the list */
  removeOne(item) {
    if (this._length === 0)
      return;
    const node = this.findNodeForItem(item);
    if (node != null)
      this.removeNode(node);
  }
  /** Returns the item at the given index */
  get(index) {
    if (!isIndex(index))
      throw new Error(`${index} is not a valid index`);
    let curNode = this.first;
    while (curNode != null && --index >= 0) {
      curNode = curNode.next;
    }
    return curNode != null ? curNode.value : void 0;
  }
  /** Removes the first item from the list and returns it */
  shift() {
    if (this._length === 0)
      return;
    const node = this.first;
    this.removeNode(node);
    return node.value;
  }
  /** Returns the first item from the list without removing it */
  peekStart() {
    return this.first && this.first.value;
  }
  /** Removes the last item from the list and returns it */
  pop() {
    if (this._length === 0)
      return;
    const node = this.last;
    this.removeNode(node);
    return node.value;
  }
  /** Returns the last item from the list without removing it */
  peekEnd() {
    return this.last && this.last.value;
  }
  /** Removes a specific node from the list */
  removeNode(node) {
    if (node.prev != null) {
      node.prev.next = node.next;
    } else {
      this.first = node.next;
    }
    if (node.next != null) {
      node.next.prev = node.prev;
    } else {
      this.last = node.prev;
    }
    this._length--;
  }
  /** Tests if the given item is contained in the list */
  contains(item) {
    return this.findNodeForItem(item) != null;
  }
  /** Returns the first item matching the given predicate */
  find(predicate) {
    const ret = findNode(this.first, predicate);
    if (ret != void 0)
      return ret.value;
  }
  /** Returns the first item matching the given predicate */
  findNodeForItem(item) {
    return findNode(this.first, (val) => this.comparer(val, item) === 0);
  }
  /** Removes all items from the list */
  clear() {
    this.first = this.last = void 0;
    this._length = 0;
  }
  *[Symbol.iterator]() {
    let curItem = this.first;
    while (curItem != null) {
      yield curItem.value;
      curItem = curItem.next;
    }
  }
  /** Flattens this list into an array */
  toArray() {
    return [...this];
  }
}
//# sourceMappingURL=index.js.map
