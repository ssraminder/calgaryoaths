import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1B3A5C',
        gold: '#C8922A',
        'gold-light': '#E8B55A',
        teal: '#1D9E75',
        bg: '#F8F7F4',
        white: '#FFFFFF',
        charcoal: '#2C2C2A',
        'mid-grey': '#6B6B68',
        border: '#E2E0DA',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(27,58,92,0.08)',
        'card-hover': '0 4px 24px rgba(27,58,92,0.14)',
      },
      borderRadius: {
        card: '0.75rem',
        btn: '0.5rem',
        pill: '9999px',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
