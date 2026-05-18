import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pacific: {
          DEFAULT: '#1CA9C9',
          light: '#7DD4E4',
          dark: '#0E7A94',
          soft: '#E6F7FB',
        },
        orange: {
          DEFAULT: '#E86100',
          light: '#F28C28',
          dark: '#C45200',
          soft: '#FFF3E8',
          brand: '#E86100',
        },
        green: {
          dark: '#065f46',
          light: '#d1fae5',
        },
      },
    },
  },
  plugins: [],
}
export default config
