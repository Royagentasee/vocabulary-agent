/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          500: '#6b7280',
          900: '#111111',
        },
        accent: {
          DEFAULT: '#3b82f6',
          soft: '#dbeafe',
        },
      },
    },
  },
  plugins: [],
}