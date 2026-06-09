/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de marca GrandBar — Mundial de Bebidas 2026
        morado: '#2E1A3A', // fondo profundo / base oscura
        vino: '#7A2236', // fondo secundario / bordó
        naranja: '#D2552A', // acento principal (CTA, números destacados)
        dorado: '#CBA86A', // acento premium (bordes, trofeos) — ocre oficial
        azul: '#1F447F', // estructura y contraste — azul oficial
        crema: '#F2E8D5', // texto sobre fondos oscuros
      },
      fontFamily: {
        // Títulos display (Parginer) y cuerpo (Cambria), con fallback
        display: ['Parginer', 'serif'],
        sans: ['Cambria', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
