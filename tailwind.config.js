/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        'swiss-gray': '#F3F4F2',
        'swiss-gray-dark': '#E7E9E6',
        'swiss-dark': '#131415',
        'acid-red': '#FF003C',
        'text-secondary': '#666C74',
      },
      fontFamily: {
        'display': ['Oswald', '"Noto Sans SC"', 'sans-serif'],
        'body': ['-apple-system', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        'glow': '0 0 20px rgba(255, 0, 60, 0.4)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "liquid-scan": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "400% 50%" },
        },
        "flicker-mask": {
          "0%": { opacity: "1" },
          "5%": { opacity: "0.9" },
          "10%": { opacity: "0.6" },
          "15%": { opacity: "0.3" },
          "20%": { opacity: "0.2" },
          "25%": { opacity: "0.5" },
          "30%": { opacity: "0.8" },
          "35%": { opacity: "0.2" },
          "40%": { opacity: "0.1" },
          "45%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
          "55%": { opacity: "0.3" },
          "60%": { opacity: "0.9" },
          "65%": { opacity: "0.5" },
          "70%": { opacity: "0.2" },
          "75%": { opacity: "0.8" },
          "80%": { opacity: "0.4" },
          "85%": { opacity: "0.6" },
          "90%": { opacity: "0.3" },
          "95%": { opacity: "0.9" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "liquid-scan": "liquid-scan 8s linear infinite",
        "flicker-mask": "flicker-mask 8s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
