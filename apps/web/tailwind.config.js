/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        prioridade: {
          baixa: '#64748b',
          media: '#0ea5e9',
          alta: '#f59e0b',
          urgente: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
