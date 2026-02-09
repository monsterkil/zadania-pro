/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        surface: {
          DEFAULT: "#0f172a",
          50: "#1e293b",
          100: "#253347",
          200: "#334155",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Segoe UI"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
