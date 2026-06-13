/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "system-ui", "sans-serif"],
      },
      keyframes: {
        "book-flip": {
          "0%":   { transform: "rotateY(0deg)" },
          "40%":  { transform: "rotateY(-90deg)" },
          "60%":  { transform: "rotateY(-90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
      },
      animation: {
        "book-flip": "book-flip 0.45s ease-in-out",
      },
    },
  },
  plugins: [],
};
