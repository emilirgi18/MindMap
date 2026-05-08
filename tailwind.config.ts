import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'
import forms from '@tailwindcss/forms'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // App chrome
        surface: {
          DEFAULT: '#0f1117',
          raised: '#161b27',
          overlay: '#1c2333',
          border: '#2a3347',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#c9d1d9',
            '--tw-prose-headings': '#e6edf3',
            '--tw-prose-links': '#79c0ff',
            '--tw-prose-bold': '#e6edf3',
            '--tw-prose-code': '#f78166',
            '--tw-prose-quotes': '#8b949e',
            '--tw-prose-quote-borders': '#2a3347',
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [typography, forms],
}

export default config
