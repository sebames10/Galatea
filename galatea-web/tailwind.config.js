/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Colores semánticos tomados del logo (azul marino + dorado). Los valores viven en index.css como variables CSS.
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-soft': 'rgb(var(--gold-soft) / <alpha-value>)',
        'on-gold': 'rgb(var(--on-gold) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        // Tipografías de GalateaLovable: Fraunces (serif) para títulos y cifras, Manrope para el texto
        display: ['Fraunces', 'Georgia', 'serif'],
        heading: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        // Solo el logotipo en texto (Wordmark)
        logo: ['"Poiret One"', 'sans-serif'],
      },
      screens: {
        // md: tablet / rail de navegación, lg: escritorio con 3 columnas, xl: escritorio ancho
        md: '768px',
        lg: '1024px',
        xl: '1440px',
      },
      boxShadow: {
        soft: '0 18px 40px -18px rgb(0 0 0 / 0.6)',
        glow: '0 10px 30px -8px rgb(var(--gold) / 0.45)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
