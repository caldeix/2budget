# Acceso a internet desde Claude Code

Preguntas y respuestas sobre qué puedo hacer en la web y qué no.

## ¿Puedes abrir internet?

- No puedo abrir un navegador en tu pantalla.
- Trabajo en un contenedor en la nube.
- Sí tengo acceso a la red desde ese contenedor.
- Las peticiones salen por un proxy preconfigurado.

## ¿Qué puedo hacer en la web?

| Acción | Cómo |
|---|---|
| Buscar información | Búsqueda web |
| Leer una página | Descarga y lectura de la URL |
| Descargar contenido | `curl` o `gh` |
| Hacer una captura | Chromium con Playwright |
| Probar una web | Chromium en modo headless |

## ¿Cómo las uso?

Solo necesito una de estas tres cosas:

1. **Un tema:** lo busco y te resumo lo que encuentre.
2. **Una URL:** leo la página y te cuento lo que dice.
3. **Una captura:** abro la página y te paso la imagen.

## ¿Puedes entrar con mi usuario?

- Puedo iniciar sesión, pero desde cero.
- No tengo tus cookies ni tus contraseñas guardadas.
- Mi navegador es independiente del tuyo.
- Necesito saber en qué web quieres entrar.
- Necesito saber qué quieres hacer una vez dentro.

## ¿Cómo debo gestionar la contraseña?

- **No** la pegues en el chat.
- Guárdala como secreto del entorno.
- Yo la leo desde una variable de entorno.
- Así no queda escrita en la conversación.
- Tampoco debe acabar en el repositorio.

## ¿Y si la web pide doble factor?

- No puedo completarlo yo solo.
- Necesito que me des el código en el momento.
- Los códigos de SMS o de app caducan rápido.
- Algunas webs bloquean el acceso automatizado.

## Siguiente paso

Dime estas dos cosas:

- La **web** a la que quieres entrar.
- El **objetivo** una vez dentro.
