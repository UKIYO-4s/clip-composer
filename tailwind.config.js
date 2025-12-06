/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './frontend/index.html',
    './frontend/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#1e1e1e',
        'bg-secondary': '#2d2d2d',
        'bg-timeline': '#252525',
        'text-primary': '#e0e0e0',
        'text-secondary': '#a0a0a0',
        'accent-blue': '#007acc',
        'accent-green': '#4ec9b0',
        'accent-red': '#f48771',
        'border-color': '#3e3e3e',
      },
    },
  },
  plugins: [],
};
