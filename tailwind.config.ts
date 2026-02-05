import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        "surface": "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        "surface-card": "var(--color-surface-card)",
        "text-primary": "var(--color-text-primary)",
        "text-muted": "var(--color-text-muted)",
        "accent": "var(--color-accent)"
      }
    }
  },
  plugins: []
};

export default config;
