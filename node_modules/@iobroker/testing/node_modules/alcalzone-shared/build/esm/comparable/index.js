/**
 * Tests if a given objects satisfies the Comparable<T> interface
 * @param obj The object to test
 */
export function isComparable(obj) {
    return (obj != null && typeof obj.compareTo === "function");
}
/**
 * Compares two numbers or strings. Returns 1 when the 2nd one is larger, 0 when both are equal or -1 when the 2nd one is smaller
 */
export function compareNumberOrString(a, b) {
    return b > a ? 1 : b === a ? 0 : -1;
}
/**
 * The default comparer method to handle string, numbers and Comparable<T>.
 * @param a The first value to compare
 * @param b The second value to compare
 */
export function defaultComparer(a, b) {
    if (typeof a === typeof b &&
        (typeof a === "number" || typeof a === "string")) {
        return compareNumberOrString(a, b);
    }
    else if (isComparable(a) && isComparable(b)) {
        return b.compareTo(a);
    }
    throw new Error(`cannot compare ${typeof a} with ${typeof b}`);
}
//# sourceMappingURL=index.js.map