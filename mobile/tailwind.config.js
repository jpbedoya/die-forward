const { palette } = require('./lib/theme.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Palette lives in lib/theme.js so it can be imported by RN components
      // that need the `style={{ color: ... }}` escape hatch. Do not duplicate
      // the values here — add new colours to lib/theme.js instead.
      colors: palette,
      fontFamily: {
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};
