/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sarabun)', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'xylem-dark': '#2d4a1a',
        'xylem-medium': '#3d5a2a',
        'xylem-light': '#4d6a3a',
        'xylem-bg': '#f8faf6',
        'xylem-gold': '#c9a227',
        'neo-bg': '#E0E8E3',
        'neo-shadow-light': '#ffffff',
        'neo-shadow-dark': '#c2cbc6',
        'neo-text': '#3B5249',
        'neo-accent': '#5C946E',
        'neo-muted': '#7A9E8A',
        'neo-dark': '#2C4037',
      },
      boxShadow: {
        'neo-outset': '8px 8px 16px #c2cbc6, -8px -8px 16px #ffffff',
        'neo-inset': 'inset 6px 6px 12px #c2cbc6, inset -6px -6px 12px #ffffff',
        'neo-active': 'inset 4px 4px 8px #c2cbc6, inset -4px -4px 8px #ffffff',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
} 