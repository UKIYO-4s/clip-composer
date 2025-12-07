/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './frontend/index.html',
    './frontend/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',

      surface: {
        base: '#0d0f14',
        sunken: '#0b0d11',
        raised: '#11141d',
        highest: '#161a24',
      },
      ink: {
        primary: '#e7ecf4',
        secondary: '#9aa3b8',
        muted: '#6b7387',
        disabled: '#4b5161',
      },
      line: {
        subtle: '#1d2230',
        DEFAULT: '#252b3a',
        bright: '#2f3547',
      },
      accent: {
        blue: '#2aa6ff',
        cyan: '#3ccfda',
        magenta: '#c26cff',
        green: '#3ad7a4',
        amber: '#f2c14f',
        red: '#ff7b72',
      },
      state: {
        hover: 'rgba(255,255,255,0.04)',
        active: 'rgba(255,255,255,0.08)',
      },
      track: {
        video: '#1d7fcc',
        text: '#d4952a',   // 明るいアンバー（視認性向上）
        image: '#2ba88a',
        audio: '#3d5fb8',
        se: '#2e8da8',
        adjust: '#9b4fd6',
      },
    },

    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },

    spacing: {
      0: '0',
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '10px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
    },

    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      '2xl': '20px',
      full: '9999px',
    },

    boxShadow: {
      none: 'none',
      sm: '0 2px 8px rgba(0,0,0,0.25)',
      DEFAULT: '0 4px 16px rgba(0,0,0,0.35)',
      md: '0 8px 24px rgba(0,0,0,0.4)',
      lg: '0 16px 48px rgba(0,0,0,0.5)',
      'glow-blue': '0 0 0 4px rgba(42,166,255,0.28)',
      'glow-red': '0 0 0 4px rgba(255,123,114,0.35)',
      inner: 'inset 0 1px 0 0 #2f3547',
    },

    extend: {},
  },
  plugins: [],
}
