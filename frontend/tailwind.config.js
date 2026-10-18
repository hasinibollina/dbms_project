/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          DEFAULT: '#7F011F',
          dark: '#5C0116',
          light: '#A3243F',
        },
        sand: {
          DEFAULT: '#F5EBD0',
          dark: '#E8D9B5',
        },
        ink: '#2B0A12',
      },
      fontFamily: {
        heading: ['"Archivo Black"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'poster': '0 12px 30px -10px rgba(92, 1, 22, 0.15)',
        'poster-lg': '0 20px 40px -15px rgba(92, 1, 22, 0.22)',
      },
      borderRadius: {
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}
