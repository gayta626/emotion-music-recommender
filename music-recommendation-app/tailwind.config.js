/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        card: '#181818',
        cardHover: '#282828',
        primary: '#6b21a8', /* Purple color from the UI */
      }
    },
  },
  plugins: [],
}
