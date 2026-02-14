/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Die Forward color palette (matches web)
        crypt: {
          bg: '#0d0d0d',
          surface: '#1c1917',
          border: '#292524',
          'border-light': '#44403c',
        },
        amber: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        bone: {
          DEFAULT: '#e7e5e4',
          muted: '#a8a29e',
          dark: '#78716c',
        },
        blood: {
          DEFAULT: '#ef4444',
          light: '#fca5a5',
          dark: '#7f1d1d',
        },
        ethereal: {
          DEFAULT: '#a855f7',
          light: '#c084fc',
        },
        victory: {
          DEFAULT: '#22c55e',
          light: '#4ade80',
        },
      },
      fontFamily: {
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};
