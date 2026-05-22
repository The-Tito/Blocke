/**
 * Sistema visual de Bloque — tokens trasladados desde Desing/styles.css.
 * Los colores se resuelven vía variables CSS para soportar dark mode por clase.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bq-bg)',
        elev: 'var(--bq-bg-elev)',
        fg: 'var(--bq-fg)',
        'fg-2': 'var(--bq-fg-2)',
        'fg-3': 'var(--bq-fg-3)',
        'fg-4': 'var(--bq-fg-4)',
        line: 'var(--bq-line)',
        'line-2': 'var(--bq-line-2)',
      },
      fontFamily: {
        sans: ['Geist', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.06em',
        'extra-tight': '-0.04em',
      },
      borderRadius: {
        pill: '999px',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'splash-fill': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        'pulse-dot': 'pulse 1.6s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s ease forwards',
        'splash-fill': 'splash-fill 2s cubic-bezier(.7,0,.3,1) forwards',
        blink: 'blink 1.1s steps(1) infinite',
      },
    },
  },
  plugins: [],
};
