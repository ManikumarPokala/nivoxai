/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5"
        },
        accent: {
          400: "#d7ff44",
          500: "#c4f000"
        }
      },
      borderRadius: {
        card: "1.25rem",
        pill: "9999px"
      }
    }
  },
  plugins: []
};
