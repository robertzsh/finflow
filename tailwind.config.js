/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

// Two UIs share this config:
// - classic Dark/Light (src/components, src/features) — the fixed colours and fonts below;
// - the Pink Aura skin (src/aura) — semantic token colours, defined only under
//   html.pink in src/aura/styles/tokens.css.
const ch = (name) => `rgb(var(--${name}) / <alpha-value>)`;
// Money colours: Pink Aura sets --income etc.; everywhere else the classic values apply.
const money = (name, rgb) => `rgb(var(--${name}, ${rgb}) / <alpha-value>)`;
const tag = (name) => ({ bg: `var(--tag-${name}-bg)`, fg: `var(--tag-${name}-fg)` });

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        income: { DEFAULT: money('income', '16 185 129'), soft: 'rgba(16,185,129,0.15)' },
        expense: { DEFAULT: money('expense', '239 68 68'), soft: 'rgba(239,68,68,0.15)' },
        savings: { DEFAULT: money('savings', '59 130 246'), soft: 'rgba(59,130,246,0.15)' },
        invest: { DEFAULT: money('invest', '234 179 8'), soft: 'rgba(234,179,8,0.15)' },
        goal: { DEFAULT: money('goal', '168 85 247'), soft: 'rgba(168,85,247,0.15)' },
        brand: { DEFAULT: '#e0b15a', soft: 'rgba(224,177,90,0.15)' },

        // Pink Aura tokens
        canvas: ch('canvas'),
        surface: { DEFAULT: ch('surface'), 2: ch('surface-2') },
        overlay: ch('overlay'),
        ink: { DEFAULT: ch('ink'), muted: ch('ink-muted'), faint: ch('ink-faint') },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        fill: 'var(--fill)',
        hover: 'var(--hover)',
        active: 'var(--active)',
        scrim: 'var(--scrim)',
        accent: { DEFAULT: ch('accent'), strong: ch('accent-strong'), ink: ch('accent-ink'), soft: 'var(--accent-soft)' },
        'on-accent': ch('on-accent'),
        'on-color': '#ffffff', // text/knobs on saturated fills (member avatars, colour swatches)
        focus: ch('focus'),
        sparkle: ch('sparkle'),
        warn: ch('warn'),
        tag: {
          gray: tag('gray'), brown: tag('brown'), orange: tag('orange'), yellow: tag('yellow'), green: tag('green'),
          blue: tag('blue'), purple: tag('purple'), pink: tag('pink'), red: tag('red'),
        },
      },
      // Pink Aura swaps the families through --font-*; classic keeps the fallbacks.
      fontFamily: {
        sans: ['var(--font-sans, "IBM Plex Sans", system-ui, sans-serif)'],
        display: ['var(--font-display, Fraunces, Georgia, serif)'],
        mono: ['var(--font-mono, "IBM Plex Mono", ui-monospace, monospace)'],
      },
      fontSize: {
        '3xs': ['10px', '13px'],
        '2xs': ['11px', '14px'],
      },
      borderRadius: {
        tag: 'var(--r-tag)',
        control: 'var(--r-control)',
        card: 'var(--r-card)',
        sheet: 'var(--r-sheet)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.37)',
        glow: '0 0 40px rgba(224,177,90,0.15)',
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        popover: 'var(--shadow-popover)',
        focus: '0 0 0 3px rgb(var(--focus) / 0.18)',
      },
      backdropBlur: { xs: '2px' },
      maxWidth: {
        page: '72rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'aura-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-3%,0) scale(1.04)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'aura-drift': 'aura-drift 18s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // `can-hover:` — for controls revealed on hover: hidden only where hovering is possible.
    plugin(({ addVariant }) => addVariant('can-hover', '@media (hover: hover) and (pointer: fine)')),
  ],
};
