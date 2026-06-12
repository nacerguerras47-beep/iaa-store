/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './context/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f9', 100: '#d5dff0', 200: '#afc3e3', 300: '#7b9dd0',
          400: '#4f7abc', 500: '#2f5fa8', 600: '#1e4a8e', 700: '#1a3d78',
          800: '#163162', 900: '#0f2347', 950: '#091529',
        },
        gold: {
          50: '#fefbe8', 100: '#fef6c3', 200: '#feec8a', 300: '#fddc47',
          400: '#fbc914', 500: '#d4a017', 600: '#b8870f', 700: '#95680c',
          800: '#7a5210', 900: '#674413',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 20px rgba(15,35,71,0.07)',
        card: '0 4px 24px rgba(15,35,71,0.09)',
        hover: '0 12px 40px rgba(15,35,71,0.16)',
        gold: '0 4px 24px rgba(212,160,23,0.35)',
        navy: '0 4px 20px rgba(30,74,142,0.35)',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #091529 0%, #0f2347 40%, #1e4a8e 100%)',
        'gradient-navy': 'linear-gradient(135deg, #0f2347, #1e4a8e)',
        'gradient-gold': 'linear-gradient(135deg, #b8870f, #fbc914)',
      },
    },
  },
  plugins: [],
}
