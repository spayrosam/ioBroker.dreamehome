/**
 * Tests whether the given variable is a real object and not an Array
 * @param it The variable to test
 */
// We need an extensive conditional type here because TS stopped simplifying/narrowing
// correctly in 4.8 (https://github.com/microsoft/TypeScript/issues/50671)
export function isObject(it) {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === "[object Object]";
}
/**
 * Tests whether the given variable is really an Array
 * @param it The variable to test
 */
// We need an extensive conditional type here because TS stopped simplifying/narrowing
// correctly in 4.8 (https://github.com/microsoft/TypeScript/issues/50671)
export function isArray(it) {
    if (Array.isArray != null)
        return Array.isArray(it);
    return Object.prototype.toString.call(it) === "[object Array]";
}
//# sourceMappingURL=index.js.map