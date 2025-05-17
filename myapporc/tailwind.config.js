const defaultTheme = require("tailwindcss/defaultTheme");
const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  fontFamily: {
    sans: ['"Geist Variable"', ...defaultTheme.fontFamily.sans],
  },
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        scene: {
          DEFAULT: "hsl(var(--scene))",
          foreground: "hsl(var(--scene-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      keyframes: {
        moveInCircle: {
          '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
          '50%': { transform: 'translate(50%, 50%) rotate(180deg)' },
          '100%': { transform: 'translate(-50%, -50%) rotate(360deg)' }
        },
        moveVertical: {
          '0%': { transform: 'translate(-50%, -30%)' },
          '50%': { transform: 'translate(50%, 30%)' },
          '100%': { transform: 'translate(-50%, -30%)' }
        },
        moveHorizontal: {
          '0%': { transform: 'translate(-30%, -30%)' },
          '50%': { transform: 'translate(30%, 30%)' },
          '100%': { transform: 'translate(-30%, -30%)' }
        }
      },
      animation: {
        'move-in-circle': 'moveInCircle 20s infinite',
        'move-vertical': 'moveVertical 30s infinite',
        'move-horizontal': 'moveHorizontal 40s infinite'
      }
    },
  },
  plugins: [addVariablesForColors, require("tailwindcss-animate")],
};

function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val]),
  );

  addBase({
    ":root": newVars,
  });
}
