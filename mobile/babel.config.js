module.exports = function (api) {
  // For Jest tests, use React's default JSX transform (no nativewind)
  const isJest = process.env.NODE_ENV === 'test';

  api.cache(!isJest); // Cache for non-test builds

  return {
    presets: [
      [
        "babel-preset-expo",
        isJest ? {} : { jsxImportSource: "nativewind" }
      ],
      ...(isJest ? [] : ["nativewind/babel"]),
    ],
  };
};
