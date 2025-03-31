import { type ExitCodes } from './exitCodes.js';
import '@iobroker/types';
export { commonTools } from './controllerTools.js';
export * from './utils.js';
export * as I18n from './i18n.js';
/**
 * Returns the absolute path of the data directory for the current host. On linux, this is usually `/opt/iobroker/iobroker-data`.
 */
export declare function getAbsoluteDefaultDataDir(): string;
/**
 * Returns the absolute path of the data directory for the current adapter instance.
 * On linux, this is usually `/opt/iobroker/iobroker-data/<adapterName>.<instanceNr>`
 *
 * @param adapterObject The adapter instance
 */
export declare function getAbsoluteInstanceDataDir(adapterObject: ioBroker.Adapter): string;
export declare const EXIT_CODES: ExitCodes;
