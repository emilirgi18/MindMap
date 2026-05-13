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
        surface: {
          DEFAULT: '#0f172a',   // slate-900
          raised: '#1e293b',    // slate-800
          overlay: '#293548',   // between slate-800/700
          border: '#334155',    // slate-700
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#cbd5e1',
            '--tw-prose-headings': '#f8fafc',
            '--tw-prose-links': '#f97316',
            '--tw-prose-bold': '#f8fafc',
            '--tw-prose-code': '#fb923c',
            '--tw-prose-quotes': '#94a3b8',
            '--tw-prose-quote-borders': '#334155',
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [typography, forms],
}

export default config
