import preset from './tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [
    './frontend/index.html',
    './frontend/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
