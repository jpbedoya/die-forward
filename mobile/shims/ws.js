// Browser/React Native shim for 'ws' module
// WebSocket is available natively in browsers and React Native
module.exports = typeof WebSocket !== 'undefined' ? WebSocket : {};
