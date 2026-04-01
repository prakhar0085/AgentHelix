/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0F19', // Deep dark blue-black
          800: '#111827',
          700: '#1F2937',
          600: '#374151',
        },
        brand: {
          blue: '#3b82f6',
          green: '#10b981',
          red: '#ef4444',
          yellow: '#eab308'
        }
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
