/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        income: { DEFAULT: '#10b981', soft: 'rgba(16,185,129,0.15)' },
        expense: { DEFAULT: '#ef4444', soft: 'rgba(239,68,68,0.15)' },
        savings: { DEFAULT: '#3b82f6', soft: 'rgba(59,130,246,0.15)' },
        invest: { DEFAULT: '#eab308', soft: 'rgba(234,179,8,0.15)' },
        goal: { DEFAULT: '#a855f7', soft: 'rgba(168,85,247,0.15)' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.37)',
        glow: '0 0 40px rgba(59,130,246,0.15)',
      },
      backdropBlur: { xs: '2px' },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
