import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        green: {
          50: "hsl(var(--green-50))",
          100: "hsl(var(--green-100))",
          600: "hsl(var(--green-600))",
        },
        red: {
          50: "hsl(var(--red-50))",
          100: "hsl(var(--red-100))",
          600: "hsl(var(--red-600))",
        },
        orange: {
          50: "hsl(var(--orange-50))",
          100: "hsl(var(--orange-100))",
          600: "hsl(var(--orange-600))",
        },
        amber: {
          50: "hsl(var(--amber-50))",
          100: "hsl(var(--amber-100))",
          600: "hsl(var(--amber-600))",
          700: "hsl(var(--amber-700))",
        },
        "card-balance-bg": "hsl(var(--card-balance-bg))",
        "card-income-bg": "hsl(var(--card-income-bg))",
        "card-expense-bg": "hsl(var(--card-expense-bg))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        soft: "0 4px 6px rgba(0, 0, 0, 0.1)",
        medium: "0 8px 12px rgba(0, 0, 0, 0.15)",
        "glow-gold": "0 0 16px rgba(212,175,55,0.35)",
        "glow-purple": "0 0 16px rgba(138,43,226,0.35)",
      },
      fontFamily: {
        inter: ["var(--font-inter)"],
        poppins: ["var(--font-poppins)"],
      },
    },
  },
  plugins: [],
}

export default config
