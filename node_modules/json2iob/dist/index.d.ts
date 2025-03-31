type Options = {
    write?: boolean;
    forceIndex?: boolean;
    disablePadIndex?: boolean;
    zeroBasedArrayIndex?: boolean;
    channelName?: string;
    preferedArrayName?: string;
    preferedArrayDesc?: string;
    autoCast?: boolean;
    descriptions?: any;
    states?: any;
    units?: any;
    parseBase64?: boolean;
    parseBase64byIds?: string[];
    parseBase64byIdsToHex?: string[];
    deleteBeforeUpdate?: boolean;
    removePasswords?: boolean;
    excludeStateWithEnding?: string[];
    makeStateWritableWithEnding?: string[];
    dontSaveCreatedObjects?: boolean;
};
declare class Json2iob {
    private adapter;
    private alreadyCreatedObjects;
    private objectTypes;
    private forbiddenCharsRegex;
    constructor(adapter: any);
    /**
     * Parses the given element and creates states in the adapter based on the element's structure.
     * @method parse
     * @param {string} path - The ioBroker object path which the element should be saved to.
     * @param {any} element - The element to be parsed.
     * @param {Options} [options={}] - The parsing options.
     * @param {boolean} [options.write] - Activate write for all states.
     * @param {boolean} [options.forceIndex] - Instead of trying to find names for array entries, use the index as the name.
     * @param {boolean} [options.disablePadIndex] - Disables padding of array index numbers if forceIndex = true
     * @param {boolean} [options.zeroBasedArrayIndex] - Start array index from 0 if forceIndex = true
     * @param {string} [options.channelName] - Set name of the root channel.
     * @param {string} [options.preferedArrayName] - Set key to use this as an array entry name.
     * @param {string} [options.preferedArrayDesc] - Set key to use this as an array entry description.
     * @param {boolean} [options.autoCast] - Make JSON.parse to parse numbers correctly.
     * @param {Object} [options.descriptions] - Object of names for state keys.
     * @param {Object} [options.states] - Object of states to create for an id, new entries via json will be added automatically to the states.
     * @param {Object} [options.units] - Object of untis to create for an id
     * @param {boolean} [options.parseBase64] - Parse base64 encoded strings to utf8.
     * @param {string[]} [options.parseBase64byIds] - Array of ids to parse base64 encoded strings to utf8.
     * @param {string[]} [options.parseBase64byToHex] - Array of ids to parse base64 encoded strings to utf8.
     * @param {boolean} [options.deleteBeforeUpdate] - Delete channel before update.
     * @param {boolean} [options.removePasswords] - Remove password from log.
     * @param {string[]} [options.excludeStateWithEnding] - Array of strings to exclude states with this ending.
     * @param {string[]} [options.makeStateWritableWithEnding] - Array of strings to make states with this ending writable.
     * @param {boolean} [options.dontSaveCreatedObjects] - Create objects but do not save them to alreadyCreatedObjects.
     * @returns {Promise<void>} - A promise that resolves when the parsing is complete.
     */
    parse(path: string, element: any, options?: Options): Promise<void>;
    /**
     * Creates a state object in the adapter's namespace.
     * @param {string} path - The path of the state object.
     * @param {object} common - The common object for the state.
     * @param {object} [options] - Optional parameters.
     * @param {boolean} [options.dontSaveCreatedObjects] - If true, the created object will not be saved.
     * @returns {Promise<void>} - A promise that resolves when the state object is created.
     */
    _createState(path: string, common: any, options?: Options): Promise<void>;
    /**
     * Extracts an array from the given element and recursively parses its elements.
     *
     * @param {object} element - The element containing the array.
     * @param {string} key - The key of the array in the element.
     * @param {string} path - The current path in the object hierarchy.
     * @param {object} options - The parsing options.
     * @returns {Promise<void>} - A promise that resolves when the array extraction and parsing is complete.
     */
    _extractArray(element: any, key: string, path: string, options: Options): Promise<void>;
    /**
     * Checks if a string is a valid base64 encoded string.
     *
     * @param {string} str - The string to be checked.
     * @returns {boolean} - Returns true if the string is a valid base64 encoded string, otherwise returns false.
     */
    _isBase64(str: string): boolean;
    /**
     * Checks if a given string is a valid JSON string.
     * @param {string} str - The string to be checked.
     * @returns {boolean} - Returns true if the string is a valid JSON string, otherwise false.
     */
    _isJsonString(str: string): boolean;
    /**
     * Determines the role of an element based on its type and write mode.
     * @param {any} element - The element to determine the role for.
     * @param {boolean} write - Indicates whether the element is being written to.
     * @returns {string} - The role of the element.
     */
    _getRole(element: any, write: boolean): "indicator" | "switch" | "value.time" | "value" | "level" | "text" | "state";
}
export = Json2iob;
