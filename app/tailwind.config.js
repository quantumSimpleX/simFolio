import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── QSXC raw tokens (mirror src/tokens.js) ──
        paper: 'var(--paper)',
        white: 'var(--white)',
        ink: {
          50:  'var(--ink-50)',
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          300: 'var(--ink-300)',
          400: 'var(--ink-400)',
          500: 'var(--ink-500)',
          600: 'var(--ink-600)',
          700: 'var(--ink-700)',
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },
        ame: {
          50:  'var(--ame-50)',
          100: 'var(--ame-100)',
          200: 'var(--ame-200)',
          400: 'var(--ame-400)',
          500: 'var(--ame-500)',
          600: 'var(--ame-600)',
        },
        aqua: {
          50:  'var(--aqua-50)',
          400: 'var(--aqua-400)',
          600: 'var(--aqua-600)',
        },
        red: 'var(--red)',
        redBg: 'var(--red-bg)',
        gold: 'var(--gold)',
        goldBg: 'var(--gold-bg)',
        goldLight: 'var(--gold-light)',
        queuedBg: 'var(--queued-bg)',
        queuedColor: 'var(--queued-color)',

        // ── shadcn semantic aliases → QSXC tokens (no slate/zinc) ──
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      fontFamily: {
        display: ["'MOMCAKE'", "'Helvetica Neue'", 'system-ui', 'sans-serif'],
        sans:    ["'Barlow Condensed'", "'Helvetica Neue'", 'system-ui', 'sans-serif'],
        mono:    ["'Source Code Pro'", 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        input: '4px',
        card: '8px',
        pill: '999px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
