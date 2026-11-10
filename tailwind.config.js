/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF3FA", 100: "#D6E2F2", 200: "#AFC4E4", 300: "#7E9DCF", 400: "#4E74B5",
          500: "#2F5596", 600: "#1F4078", 700: "#163260", 800: "#0F2747", 900: "#0B2545", 950: "#06162B",
        },
        pitch: {
          50: "#ECFDF3", 100: "#D1FADF", 200: "#A6F4C5", 300: "#6CE9A6", 400: "#32D583",
          500: "#12B76A", 600: "#039855", 700: "#027A48", 800: "#05603A", 900: "#054F31",
        },
      },
      fontFamily: { sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
    },
  },
  plugins: [],
};
