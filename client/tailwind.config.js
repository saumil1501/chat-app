// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6C63FF",
        secondary: "#4F46E5",
        dark: "#1E1E2E",
        darker: "#13131F",
        light: "#2A2A3E",
      }
    },
  },
  plugins: [],
}