import type { Config } from "tailwindcss";

// Palette « outil de pilotage » : en-têtes bleu marine, lignes alternées bleu pâle,
// statuts vert / orange / rouge / gris. Sobre, dense, professionnel.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef3f9",
          100: "#d6e2f0",
          600: "#1f4e79",
          700: "#1a4267",
          800: "#143150",
          900: "#0f2438",
        },
        zebra: "#f3f7fc", // ligne alternée bleu pâle
        statusGreen: "#16a34a",
        statusOrange: "#ea8a00",
        statusRed: "#dc2626",
        statusGray: "#6b7280",
      },
      fontSize: {
        xms: ["0.78rem", "1rem"],
      },
    },
  },
  plugins: [],
};

export default config;
