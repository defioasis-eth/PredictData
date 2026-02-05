import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        "surface": "#0b1020",
        "surface-muted": "#111830",
        "surface-card": "#141c35",
        "text-primary": "#e6ecff",
        "text-muted": "#9fb0d6",
        "accent": "#7c8fff"
      }
    }
  },
  plugins: []
};

export default config;
