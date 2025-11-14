/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0c111b',
        ttnBlue: '#2db3f6',
        ttnPurple: '#7b61ff',
      },
      fontFamily: {
        display: ['"League Spartan"', '"Lato"', 'system-ui', 'sans-serif'],
        body: ['"Lato"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 20px 60px rgba(8, 15, 40, 0.4)',
      },
    },
  },
  plugins: [],
};
