/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // CyberKavach AI Design System
        bg: {
          primary: '#F3F0E7',
          secondary: '#E9E4D7',
          card: '#FBF9F2',
          elevated: '#E3DECE',
        },
        accent: {
          emerald: '#435B46',
          cyan: '#65796B',
          'emerald-dim': '#75876D',
          'cyan-dim': '#899587',
          glow: 'rgba(67,91,70,0.11)',
        },
        text: {
          primary: '#292D27',
          secondary: '#596055',
          muted: '#77786C',
          inverse: '#FBF9F2',
        },
        status: {
          critical: '#984E43',
          'critical-dim': '#F1E2DC',
          warning: '#9A713D',
          'warning-dim': '#F0E9D9',
          safe: '#4A694D',
          'safe-dim': '#E4EBDD',
          unknown: '#77786C',
          info: '#65796B',
        },
        border: {
          DEFAULT: '#D3CEBF',
          subtle: '#E3DECE',
          accent: 'rgba(67,91,70,0.3)',
        },
      },
      fontFamily: {
        mono: ['DM Mono', 'Consolas', 'monospace'],
        sans: ['DM Sans', 'Segoe UI', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '18px'],
        base: ['13px', '20px'],
        md: ['14px', '20px'],
        lg: ['15px', '22px'],
        xl: ['16px', '24px'],
        '2xl': ['18px', '26px'],
        '3xl': ['22px', '30px'],
        '4xl': ['28px', '36px'],
      },
      spacing: {
        sidebar: '232px',
        'sidebar-collapsed': '60px',
        topbar: '56px',
      },
      boxShadow: {
        glow: '0 4px 16px rgba(67,91,70,0.12)',
        'glow-sm': '0 2px 8px rgba(67,91,70,0.1)',
        'glow-lg': '0 8px 24px rgba(67,91,70,0.14)',
        'glow-critical': '0 2px 10px rgba(152,78,67,0.12)',
        'glow-warning': '0 2px 10px rgba(154,113,61,0.12)',
        card: '0 2px 8px rgba(48,46,37,0.04)',
        panel: '0 8px 24px rgba(48,46,37,0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideIn: { '0%': { transform: 'translateX(-8px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
