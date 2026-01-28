// Shim that exports the native DOMException (available in Node.js 17+)
module.exports = globalThis.DOMException;
