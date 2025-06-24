/**
 * @file tailwind.config.ts
 * @description Este archivo configura Tailwind CSS para el proyecto.
 *              Define dónde buscar las clases de Tailwind, habilita el modo oscuro,
 *              extiende la paleta de colores para usar variables CSS personalizadas,
 *              y configura radios de borde y fuentes.
 */

import type { Config } from "tailwindcss"

/**
 * @constant {Config} config
 * @description Objeto de configuración de Tailwind CSS.
 */
const config: Config = {
  /**
   * `content` especifica los archivos donde Tailwind CSS debe buscar clases.
   * Esto es crucial para que Tailwind pueda purgar las clases no utilizadas
   * y generar un CSS final optimizado.
   */
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // Para el Pages Router (si se usara).
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Componentes React.
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // App Router (páginas, layouts, etc.).
    "*.{js,ts,jsx,tsx,mdx}", // Archivos en la raíz del proyecto (ej. `layout.tsx`).
  ],
  /**
   * `darkMode` configura cómo Tailwind debe aplicar el modo oscuro.
   * `class` significa que el modo oscuro se activará cuando el elemento `<html>`
   * (o cualquier ancestro) tenga la clase `dark`. Esto es gestionado por `ThemeProvider`.
   */
  darkMode: ["class"],
  /**
   * `theme` permite personalizar el diseño por defecto de Tailwind.
   * `extend` fusiona las personalizaciones con los valores por defecto de Tailwind,
   * en lugar de sobrescribirlos completamente.
   */
  theme: {
    extend: {
      /**
       * `colors` extiende la paleta de colores de Tailwind.
       * Aquí, los colores se mapean a las variables CSS (HSL) definidas en `globals.css`.
       * Esto permite que los colores cambien automáticamente entre el tema claro y oscuro
       * simplemente cambiando la clase `dark` en el `<html>`.
       */
      colors: {
        // Colores base mapeados a variables CSS.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Colores con variantes `DEFAULT` y `foreground` (ej. para botones).
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Colores de estado con diferentes tonos (50, 100, 600, etc.).
        green: {
          50: "hsl(var(--green-50))",
          100: "hsl(var(--green-100))",
          600: "hsl(var(--green-600))",
        },
        red: {
          50: "hsl(var(--red-50))",
          100: "hsl(var(--red-100))",
          600: "hsl(var(--red-600))",
        },
        orange: {
          50: "hsl(var(--orange-50))",
          100: "hsl(var(--orange-100))",
          600: "hsl(var(--orange-600))",
        },
        amber: {
          50: "hsl(var(--amber-50))",
          100: "hsl(var(--amber-100))",
          600: "hsl(var(--amber-600))",
          700: "hsl(var(--amber-700))", // Nuevo tono de ámbar.
        },
        // Nuevos colores de fondo para las tarjetas de resumen, también mapeados a variables CSS.
        "card-balance-bg": "hsl(var(--card-balance-bg))",
        "card-income-bg": "hsl(var(--card-income-bg))",
        "card-expense-bg": "hsl(var(--card-expense-bg))",
      },
      /**
       * `borderRadius` extiende los radios de borde de Tailwind.
       * Se usa una variable CSS `--radius` para definir un radio global
       * que puede ser ajustado fácilmente en `globals.css`.
       */
      borderRadius: {
        lg: "var(--radius)", // Equivalente a rounded-2xl.
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      /**
       * `boxShadow` extiende las sombras de caja de Tailwind.
       * Se definen sombras personalizadas para dar profundidad a los elementos.
       */
      boxShadow: {
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        soft: "0 4px 6px rgba(0, 0, 0, 0.1)",
        medium: "0 8px 12px rgba(0, 0, 0, 0.15)",
      },
      /**
       * `fontFamily` extiende las familias de fuentes de Tailwind.
       * Se mapean a las variables CSS definidas en `globals.css` para las fuentes de Google.
       */
      fontFamily: {
        inter: ["var(--font-inter)"],
        poppins: ["var(--font-poppins)"],
      },
    },
  },
  /**
   * `plugins` permite añadir plugins de Tailwind CSS.
   * Actualmente, no se utilizan plugins adicionales.
   */
  plugins: [],
}

export default config
