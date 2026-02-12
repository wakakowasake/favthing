/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        md: "500px",
      },
      colors: {
        primary: "#E50914",
        "background-light": "#f5f5f5",
        "background-dark": "#141414",
      },
      fontFamily: {
        display: ["Noto Sans KR", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      })
    },
  ],
};
