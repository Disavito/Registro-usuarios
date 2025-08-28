/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores profesional (fondo blanco, texto oscuro)
        background: '#FFFFFF', // Fondo principal blanco
        surface: '#F8F8F8',    // Superficies de componentes (ej. formulario) un gris muy claro
        text: '#171717',       // Texto principal negro/gris muy oscuro
        textSecondary: '#525252', // Texto secundario gris oscuro
        border: '#E5E5E5',     // Bordes claros
        
        // Nuevos colores de acento: Verde y Azul
        primary: '#10B981',    // Verde vibrante (anteriormente success)
        secondary: '#38bdf8',  // Azul cielo (se mantiene)
        accent: '#22D3EE',     // Cian/Azul claro para detalles
        success: '#059669',    // Verde más oscuro para mensajes de éxito
        warning: '#f59e0b',    // Naranja para advertencia (se mantiene)
        error: '#ef4444',      // Rojo para error (se mantiene)
      },
      borderRadius: {
        '2xl': '16px', // Custom rounded-2xl for 16px radius
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Using Inter as a modern sans-serif
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}
