import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        ice: {
          50: '#e8f4f8',
          100: '#b8e0f0',
          200: '#88cce8',
          300: '#4a9eff',
          400: '#2563eb',
          500: '#1e40af',
          600: '#1a2332',
          700: '#0f172a',
          800: '#0a0e1a',
          900: '#050812',
        },
      },
    },
  },
  plugins: [],
}
export default config

