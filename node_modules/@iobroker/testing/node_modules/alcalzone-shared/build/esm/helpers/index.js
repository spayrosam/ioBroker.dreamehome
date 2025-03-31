/**
 * Asserts that all possible cases of a value have been checked
 * @param value The value to check for exhaustiveness
 */
export function assertNever(value) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Unexpected value observed: ${value}`);
}
//# sourceMappingURL=index.js.map