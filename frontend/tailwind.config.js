/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        brand: {
          50: "#eef9ff",
          100: "#d8f1ff",
          300: "#7ad0ff",
          400: "#3ab9ff",
          500: "#0794db",
          600: "#0b75ad",
          700: "#0d5f8b"
        },
        accent: "#f59e0b"
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 20px 60px rgba(3, 105, 161, 0.2)"
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at top left, rgba(56,189,248,0.25), transparent 30%), radial-gradient(circle at top right, rgba(245,158,11,0.14), transparent 25%), linear-gradient(180deg, rgba(7,17,31,1) 0%, rgba(7,17,31,0.96) 45%, rgba(15,23,42,1) 100%)"
      }
    }
  },
  plugins: []
};
