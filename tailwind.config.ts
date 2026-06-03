import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tibia-inspired dark gold theme
        bg: {
          primary: '#0a0a0f',    // near-black background
          card: '#13131a',       // card background
          hover: '#1a1a24',      // card hover state
        },
        border: {
          DEFAULT: '#2a2a3a',
          gold: '#c8a84b',
        },
        gold: {
          DEFAULT: '#c8a84b',    // Tibia gold
          bright: '#e6c56a',     // hover/active gold
          dim: '#8a7030',        // muted gold
        },
        text: {
          primary: '#e8e8f0',
          muted: '#9a9ab8',
          gold: '#c8a84b',
        },
        status: {
          success: '#4ade80',
          error: '#f87171',
          warning: '#fbbf24',
          info: '#60a5fa',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
export default config
