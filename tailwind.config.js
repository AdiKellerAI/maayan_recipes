/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base44 inspired color palette
        primary: {
          50: '#fff8f1',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        secondary: {
          50: '#f8f6ff',
          100: '#f0ebff',
          200: '#e4daff',
          300: '#d1bfff',
          400: '#b899ff',
          500: '#9c6eff',
          600: '#8b4fff',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      backgroundImage: {
        'gradient-base44': 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)',
        'gradient-hero': 'linear-gradient(135deg, #fff8f1 0%, #fef3f2 50%, #fff7ed 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      animation: {
        'fade-in-0': 'fade-in 0.5s ease-out 0s both',
        'fade-in-100': 'fade-in 0.5s ease-out 0.1s both',
        'fade-in-200': 'fade-in 0.5s ease-out 0.2s both',
        'fade-in-300': 'fade-in 0.5s ease-out 0.3s both',
        'fade-in-400': 'fade-in 0.5s ease-out 0.4s both',
        'fade-in-500': 'fade-in 0.5s ease-out 0.5s both',
        'fade-in-600': 'fade-in 0.5s ease-out 0.6s both',
        'fade-in-700': 'fade-in 0.5s ease-out 0.7s both',
        'fade-in-800': 'fade-in 0.5s ease-out 0.8s both',
        'fade-in-900': 'fade-in 0.5s ease-out 0.9s both',
        'fade-in-1000': 'fade-in 0.5s ease-out 1.0s both',
        'fade-in-1100': 'fade-in 0.5s ease-out 1.1s both',
        'fade-in-1200': 'fade-in 0.5s ease-out 1.2s both',
        'fade-in-1300': 'fade-in 0.5s ease-out 1.3s both',
        'fade-in-1400': 'fade-in 0.5s ease-out 1.4s both',
        'fade-in-1500': 'fade-in 0.5s ease-out 1.5s both',
        'fade-in-1600': 'fade-in 0.5s ease-out 1.6s both',
        'fade-in-1700': 'fade-in 0.5s ease-out 1.7s both',
        'fade-in-1800': 'fade-in 0.5s ease-out 1.8s both',
        'fade-in-1900': 'fade-in 0.5s ease-out 1.9s both',
        'fade-in-2000': 'fade-in 0.5s ease-out 2.0s both',
      }
    },
  },
  plugins: [],
};
