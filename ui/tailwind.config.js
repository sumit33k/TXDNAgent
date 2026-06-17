/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dde6ff',
          500: '#4f63e3',
          600: '#3d4fcc',
          700: '#2d3bac',
          900: '#1a2270',
        },
      },
    },
  },
  plugins: [],
};
