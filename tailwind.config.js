/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

// Every colour is a CSS variable defined per theme in src/styles/tokens.css.
// Channel-based tokens support Tailwind's alpha modifier (`bg-income/15`).
const ch = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const tag = (name) => ({ bg: `var(--tag-${name}-bg)`, fg: `var(--tag-${name}-fg)` });

export default {
  darkMode: 'class',
  // hover: styles only apply on devices that can hover — no sticky hover states on touch.
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
        income: ch('income'),
        expense: ch('expense'),
        savings: ch('savings'),
        invest: ch('invest'),
        goal: ch('goal'),
        warn: ch('warn'),
        tag: {
          gray: tag('gray'), brown: tag('brown'), orange: tag('orange'), yellow: tag('yellow'), green: tag('green'),
          blue: tag('blue'), purple: tag('purple'), pink: tag('pink'), red: tag('red'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Source Serif 4"', 'Georgia', 'ui-serif', 'serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'ui-serif', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
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
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        popover: 'var(--shadow-popover)',
        focus: '0 0 0 3px rgb(var(--focus) / 0.18)',
      },
      maxWidth: {
        page: '72rem',
      },
      keyframes: {
        'aura-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-3%,0) scale(1.04)' },
        },
      },
      animation: {
        'aura-drift': 'aura-drift 18s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // `can-hover:` — for controls revealed on hover: hidden only where hovering is possible.
    plugin(({ addVariant }) => addVariant('can-hover', '@media (hover: hover) and (pointer: fine)')),
  ],
};
