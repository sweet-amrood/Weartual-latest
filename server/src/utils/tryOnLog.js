/** Simple try-on pipeline logs for the server console (no vendor names or file paths). */
export const tryOnInfo = (message) => console.info(`[try-on] ${message}`);
export const tryOnWarn = (message) => console.warn(`[try-on] ${message}`);
export const tryOnError = (message) => console.error(`[try-on] ${message}`);
