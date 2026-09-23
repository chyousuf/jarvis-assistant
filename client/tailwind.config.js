/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        jarvis: {
          dark: '#080d1a',
          card: '#0f172a',
          surface: '#17223b',
          border: '#1e293b',
          accent: '#00e5ff',
          accentHover: '#38bdf8',
          glow: 'rgba(0, 229, 255, 0.15)',
          muted: '#94a3b8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'jarvis-glow': '0 0 25px -5px rgba(0, 229, 255, 0.25)',
        'jarvis-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
