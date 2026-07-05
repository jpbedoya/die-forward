// Mock react-native-css-interop - just provide a basic JSX runtime
module.exports = {
  useWindowDimensions: () => ({ width: 375, height: 667 }),
  getColorScheme: () => 'light',
};

// Also export JSX runtime functions for babel
module.exports.jsx = (type, props) => ({ type, props });
module.exports.jsxs = (type, props) => ({ type, props });
module.exports.Fragment = Symbol.for('react.fragment');
