import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          brand: '#f3ab0f',
          light: '#ffc966',
        },
        green: {
          dark: '#1f7350',
          light: '#dcf5e8',
        },
        blue: {
          primary: '#3b82f6',
          light: '#60a5fa',
        },
      },
    },
  },
  plugins: [],
}
export default config
