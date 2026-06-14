/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Syne", "system-ui", "sans-serif"],
        display: ["Syne", "system-ui", "sans-serif"],
      },
      keyframes: {
        "book-flip": {
          "0%":   { transform: "rotateY(0deg)" },
          "40%":  { transform: "rotateY(-90deg)" },
          "60%":  { transform: "rotateY(-90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        "flip-in": {
          "0%":   { opacity: "0", transform: "rotateX(-80deg)" },
          "100%": { opacity: "1", transform: "rotateX(0deg)" },
        },
        "pop": {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-7px)" },
          "40%, 80%": { transform: "translateX(7px)" },
        },
        "count-in": {
          "0%":   { transform: "scale(1.8)", opacity: "0" },
          "35%":  { transform: "scale(1)",   opacity: "1" },
          "75%":  { transform: "scale(1)",   opacity: "1" },
          "100%": { transform: "scale(0.6)", opacity: "0" },
        },
      },
      animation: {
        "book-flip": "book-flip 0.45s ease-in-out",
        "flip-in": "flip-in 0.4s ease-out",
        "pop": "pop 0.4s ease-out",
        "shake": "shake 0.4s ease-in-out",
        "count-in": "count-in 0.9s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};
