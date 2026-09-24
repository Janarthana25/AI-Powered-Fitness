/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colours
        cyan: {
          DEFAULT: '#00E5FF',
          50:  '#E0FBFF',
          100: '#B3F5FF',
          200: '#80EEFF',
          300: '#4DE7FF',
          400: '#26E2FF',
          500: '#00E5FF',  // Primary
          600: '#00BFDB',
          700: '#0099B7',
          800: '#007393',
          900: '#004D6F',
        },
        green: {
          DEFAULT: '#00C853',
          400: '#00E676',
          500: '#00C853',  // Secondary
          600: '#00A845',
          700: '#008837',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':      'fadeIn 0.5s ease-in-out',
        'slide-up':     'slideUp 0.4s ease-out',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px #00E5FF, 0 0 10px #00E5FF' },
          '100%': { boxShadow: '0 0 20px #00E5FF, 0 0 40px #00E5FF, 0 0 60px #00E5FF' },
        },
      },
    },
  },
  plugins: [],
}
