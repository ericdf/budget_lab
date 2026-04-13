/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        berkeley: {
          blue: '#003262',
          'blue-light': '#1A4480',
          'blue-mid': '#3B7EA1',
          gold: '#FDB515',
          'gold-dark': '#C4820A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
