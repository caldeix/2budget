/**
 * @file components/footer.tsx
 * @description Componente de pie de página (footer) que se muestra en todas las páginas de la aplicación.
 *              Contiene información de derechos de autor, el desarrollador y una nota sobre el uso de IA.
 *              Este es un Server Component, ya que no necesita interactividad del cliente.
 *              Diseñado para ser compacto y mostrar todo el contenido en una sola línea.
 */

import { Heart } from "lucide-react" // Importa el icono de corazón de Lucide React.

/**
 * @function Footer
 * @description Componente funcional que renderiza el pie de página de la aplicación.
 *              Utiliza clases de Tailwind CSS para el estilo y los colores definidos
 *              en `globals.css` para mantener la coherencia con el tema de la aplicación.
 *              Todo el contenido se muestra en una única línea para un diseño más compacto.
 * @returns {JSX.Element} El elemento JSX que representa el pie de página.
 */
export function Footer() {
  // Obtiene el año actual para mostrarlo en el copyright.
  const currentYear = new Date().getFullYear()

  return (
    // El footer se posiciona de forma fija en la parte inferior de la ventana.
    // `fixed bottom-0 left-0 right-0`: Fija el elemento en la parte inferior, abarcando todo el ancho.
    // `w-full`: Asegura que ocupe el 100% del ancho disponible.
    // `py-2 px-4`: Añade un padding vertical y horizontal reducido para hacerlo más pequeño.
    // `bg-card`: Establece el color de fondo del footer usando la variable CSS `--card`.
    // `text-card-foreground`: Establece el color del texto usando la variable CSS `--card-foreground`.
    // `text-xs`: Establece un tamaño de fuente extra pequeño para mayor compacidad.
    // `border-t border-border`: Añade un borde superior para separarlo del contenido principal.
    // `z-50`: Asegura que el footer esté por encima de otros elementos si hay superposiciones.
    <footer className="fixed bottom-0 left-0 right-0 w-full py-2 px-4 bg-card text-card-foreground text-xs border-t border-border z-50">
      {/* Contenedor principal del footer. */}
      {/* `container mx-auto`: Centra el contenido y le da un ancho máximo. */}
      {/* `flex items-center justify-center`: Alinea los elementos horizontalmente en el centro. */}
      {/* `gap-x-4`: Añade un espacio horizontal entre los elementos del footer. */}
      <div className="container mx-auto flex items-center justify-center gap-x-4">
        {/* Sección del desarrollador con enlace y corazón. */}
        {/* `whitespace-nowrap`: Evita que el texto se rompa en varias líneas. */}
        <span className="flex items-center gap-1 whitespace-nowrap">
          Desarrollado por{" "}
          <a
            href="https://caldeix.github.io/links/"
            target="_blank" // Abre el enlace en una nueva pestaña.
            rel="noopener noreferrer" // Medida de seguridad para enlaces externos.
            className="text-primary flex items-center gap-1" // Estilos para el enlace.
          >
            Caldeix <Heart className="h-3 w-3 fill-red-500 text-red-500" /> {/* Icono de corazón más pequeño. */}
          </a>
        </span>
        {/* Información de copyright y año actual. */}
        <span className="whitespace-nowrap">&copy; {currentYear} Copyright.</span>
      </div>
    </footer>
  )
}
