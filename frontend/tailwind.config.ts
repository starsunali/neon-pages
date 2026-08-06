import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './public/**/*.html'],
  theme: {
    extend: {
      colors: {
        base: '#0b0b1a',
        surface: '#141433',
        neon: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          cyan: '#22d3ee',
          pink: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 20px rgba(59, 130, 246, 0.45)',
        'neon-soft': '0 0 12px rgba(139, 92, 246, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;