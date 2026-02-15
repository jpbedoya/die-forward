// Browser/React Native shim for 'ws' module
// WebSocket is available natively in browsers and React Native

class WebSocketShim {
  constructor(url, protocols) {
    return new WebSocket(url, protocols);
  }
}

// Export both as default and named to handle different import styles
module.exports = WebSocketShim;
module.exports.default = WebSocketShim;
module.exports.WebSocket = typeof WebSocket !== 'undefined' ? WebSocket : WebSocketShim;
