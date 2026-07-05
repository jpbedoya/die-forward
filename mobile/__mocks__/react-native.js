module.exports = {
  Platform: { OS: 'ios' },
  useWindowDimensions: () => ({ width: 375, height: 667 }),
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (obj) => obj,
  },
};
