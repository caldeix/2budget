/**
 * @file components/ui/chart.tsx
 * @description Este archivo define el componente `PieChart`, una visualización de gráfico de pastel
 *              utilizada para mostrar la distribución de datos (ej. gastos o ingresos).
 *              Es un Client Component (`"use client"`) porque utiliza hooks de React como `useMemo`
 *              y `useTheme` para interactividad y adaptación al tema.
 */

"use client"

import { useMemo } from "react"
import { useTheme } from "next-themes" // Importa el hook `useTheme` para acceder al tema actual.

/**
 * @interface ChartData
 * @description Define la estructura de un punto de datos para el gráfico de pastel.
 * @property {string} label - Etiqueta del segmento (ej. "Fijo", "Variable", "Persona 1").
 * @property {number} value - Valor numérico del segmento.
 * @property {string} color - Color del segmento (puede ser un valor CSS o una variable CSS).
 */
interface ChartData {
  label: string
  value: number
  color: string
}

/**
 * @interface PieChartProps
 * @description Define las propiedades que acepta el componente `PieChart`.
 * @property {ChartData[]} data - Un array de objetos `ChartData` que representan los segmentos del pastel.
 * @property {number} [size=200] - Tamaño (ancho y alto) del SVG del gráfico en píxeles. Por defecto es 200.
 * @property {string} [className] - Clases CSS adicionales para el contenedor del gráfico.
 */
interface PieChartProps {
  data: ChartData[]
  size?: number
  className?: string
}

/**
 * @function PieChart
 * @description Componente React que renderiza un gráfico de pastel.
 *              Calcula los segmentos del pastel basándose en los datos proporcionados
 *              y se adapta al tema claro/oscuro para el color del borde.
 * @param {PieChartProps} props - Propiedades del componente.
 * @returns {JSX.Element} Un elemento SVG que representa el gráfico de pastel,
 *                        o un mensaje de "Sin datos" si no hay datos.
 */
export function PieChart({ data, size = 200, className }: PieChartProps) {
  // `useTheme` permite acceder al tema actual ('light' o 'dark') y a la función para cambiarlo.
  const { theme } = useTheme()

  /**
   * `useMemo` se utiliza para memorizar los cálculos de las rutas SVG de los segmentos del pastel.
   * Esto significa que los cálculos complejos solo se ejecutarán cuando `data` o `size` cambien,
   * evitando recálculos innecesarios en cada renderizado.
   */
  const { paths, total } = useMemo(() => {
    // Calcula la suma total de los valores absolutos de los datos para determinar los porcentajes.
    const total = data.reduce((sum, item) => sum + Math.abs(item.value), 0)

    // Si no hay datos o el total es cero, no hay segmentos que dibujar.
    if (total === 0) {
      return { paths: [], total: 0 }
    }

    let cumulativePercentage = 0 // Acumulador para el ángulo de inicio de cada segmento.
    // Mapea los datos de entrada a un formato que incluye la ruta SVG y otros detalles para el renderizado.
    const paths = data.map((item) => {
      const percentage = Math.abs(item.value) / total // Porcentaje que ocupa este segmento.
      // Calcula los ángulos de inicio y fin para el arco del SVG.
      // Se resta Math.PI / 2 para que el 0% empiece en la parte superior (12 en un reloj).
      const startAngle = cumulativePercentage * 2 * Math.PI - Math.PI / 2
      const endAngle = (cumulativePercentage + percentage) * 2 * Math.PI - Math.PI / 2

      cumulativePercentage += percentage // Actualiza el porcentaje acumulado para el siguiente segmento.

      const radius = size / 2 - 10 // Radio del pastel, con un pequeño margen.
      const centerX = size / 2 // Coordenada X del centro del SVG.
      const centerY = size / 2 // Coordenada Y del centro del SVG.

      // Calcula las coordenadas de los puntos de inicio y fin del arco.
      const x1 = centerX + radius * Math.cos(startAngle)
      const y1 = centerY + radius * Math.sin(startAngle)
      const x2 = centerX + radius * Math.cos(endAngle)
      const y2 = centerY + radius * Math.sin(endAngle)

      // `largeArcFlag` determina si el arco debe ser mayor o menor de 180 grados.
      const largeArcFlag = percentage > 0.5 ? 1 : 0

      /**
       * Construye la cadena de comandos de la ruta SVG (Path Data).
       * M: Mover a (centro del pastel)
       * L: Línea a (punto de inicio del arco)
       * A: Arco elíptico (radioX radioY rotación largeArcFlag sweepFlag xFinal yFinal)
       * Z: Cerrar ruta (volver al centro)
       */
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ")

      return {
        path: pathData,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage: percentage * 100,
      }
    })

    return { paths, total }
  }, [data, size]) // Dependencias de useMemo: se recalcula si 'data' o 'size' cambian.

  // Determina el color del borde de los segmentos del gráfico basado en el tema actual.
  // En modo oscuro, el borde es el color de fondo para que se "mezcle" con el fondo.
  // En modo claro, el borde es blanco.
  const borderColor = theme === "dark" ? "hsl(var(--background))" : "white"

  // Si no hay datos para el gráfico, muestra un mensaje de "Sin datos".
  if (total === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className="text-gray-400 text-center">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full mx-auto mb-2" />
          <p className="text-sm">Sin datos</p>
        </div>
      </div>
    )
  }

  // Renderiza el gráfico de pastel y su leyenda.
  return (
    <div className={className}>
      {/* SVG para el gráfico de pastel */}
      <svg width={size} height={size} className="drop-shadow-sm">
        {paths.map((item, index) => (
          <path
            key={index} // `key` es importante para la eficiencia de React en listas.
            d={item.path} // La ruta SVG calculada.
            fill={item.color} // Color de relleno del segmento.
            stroke={borderColor} // Color del borde del segmento (depende del tema).
            strokeWidth="2" // Ancho del borde.
            className="hover:opacity-80 transition-opacity" // Efecto hover para los segmentos.
          />
        ))}
      </svg>
      {/* Leyenda del gráfico */}
      <div className="mt-4 space-y-2">
        {paths.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {/* Pequeño círculo de color para la leyenda */}
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              {/* Etiqueta del segmento */}
              <span className="text-foreground">{item.label}</span>
            </div>
            <div className="text-right">
              {/* Valor formateado como moneda */}
              <div className="font-medium">
                {new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: "EUR",
                }).format(Math.abs(item.value))}
              </div>
              {/* Porcentaje del segmento, formateado a un decimal */}
              <div className="text-muted-foreground text-xs">{item.percentage.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
