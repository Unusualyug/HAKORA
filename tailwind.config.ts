import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50:'#f0f4fa',100:'#dce5f3',200:'#c0d1ea',300:'#95b3dc',400:'#648dca',500:'#416fb5',600:'#305698',700:'#28467b',800:'#253c66',900:'#1a2b4a',950:'#111c33' },
        royal: { 50:'#eef4ff',100:'#dce7fd',200:'#c0d4fc',300:'#95b8f9',400:'#6392f4',500:'#3e6cee',600:'#284ce2',700:'#2039d0',800:'#2030a9',900:'#1f2e85',950:'#171e51' },
        whatsapp: '#25D366',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 3px rgba(16,42,83,.08), 0 4px 16px rgba(16,42,83,.06)',
        cardHover: '0 4px 12px rgba(16,42,83,.12), 0 12px 32px rgba(16,42,83,.10)',
      },
    },
  },
  plugins: [],
};
export default config;
