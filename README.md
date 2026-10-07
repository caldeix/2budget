# 2Budget

![Version](https://img.shields.io/badge/Version-2.4.0-gold.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth_%2B_Firestore-FFCA28?logo=firebase&logoColor=black)
![Deployed on GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222?logo=github&logoColor=white)
![License](https://img.shields.io/badge/License-Propietaria-red.svg)

## Live

[https://caldeix.github.io/2budget](https://caldeix.github.io/2budget)

---

## Descripción

**2Budget** es una aplicación web de gestión financiera para parejas, que también puede usar una sola persona con el modo individual. Permite llevar un control detallado de ingresos y gastos compartidos, ver balances por persona y generar informes mensuales.

Sin servidor propio: la web es estática (GitHub Pages) y los datos se guardan en **Firebase** (Auth + Firestore), **cifrados de extremo a extremo** en el navegador con la contraseña maestra de cada usuario. Ni el administrador puede leerlos. Sin hogar en la nube, los datos se quedan en el navegador (`localStorage`).

---

## Características

- **Transacciones** — Añade, edita y elimina ingresos/gastos con asignación por persona o porcentaje compartido
- **Resumen mensual** — Tarjetas de balance total y desglose por persona para el mes seleccionado
- **Balance acumulado** — Seguimiento del saldo total a lo largo del tiempo (excluye gastos no computables)
- **Gastos no computables** — Marca gastos puntuales (regalos, vacaciones) para que no afecten el balance global
- **Marcar como pagado** — Marca cada gasto (incluidos los no computables) como pagado o pendiente. Al marcarlo, su fecha se actualiza al día real del pago: hoy si el gasto es del mes en curso, o el último día de su mes si es de otro mes. El mes de un gasto nunca cambia. Al desmarcar, la fecha se mantiene. Al cambiar de mes, un aviso te pide reconciliar los pagos del mes anterior
- **Informes mensuales** — Genera y archiva cierres de mes con ajustes personalizados
- **Copia de gastos fijos e ingresos** — Duplica automáticamente los gastos fijos y los ingresos del mes anterior con un clic (sin los ajustes de cierre); si el mes ya tiene el informe cerrado, se pueden copiar al mes siguiente sin esperar al día 1
- **Modo individual** — Desde Configuración, oculta la segunda persona para usar la app sin pareja: sin propietario ni repartos en el formulario, tarjetas con solo los totales y un único dinero real en el cierre de mes
- **Cuenta y hogar en la nube** — Cuenta obligatoria con email verificado. Los datos se guardan en un hogar compartido por la pareja (o "tu espacio" en modo individual), sincronizado al momento entre dispositivos y también sin conexión. Invitación a la pareja con un código de un solo uso
- **Cifrado de extremo a extremo** — Cada transacción, informe y la configuración se cifran en el navegador (AES-256-GCM) con una clave del hogar protegida por la **contraseña maestra** de cada miembro (PBKDF2). La contraseña maestra no se guarda en ningún sitio
- **Código de recuperación** — Permite elegir una contraseña maestra nueva si se olvida; se muestra una sola vez. Una vez al mes, la app pide la contraseña maestra para que no se olvide
- **Importar / Exportar** — Backup y restauración en JSON
- **Tema oscuro / claro** — Paleta premium Gold × Violet con soporte automático del sistema
- **Diseño responsivo** — Optimizado para móvil y escritorio

---

## Changelog

### v2.4.0 — Tour de bienvenida y ayuda al día

- **Tour guiado** — La primera vez que se entra (o si nunca se ha visto), un tour recorre la app paso a paso: resalta cada parte con un borde dorado y explica qué hace en un tooltip con el paso ("3/15") y "Siguiente" ("Finalizar" en el último). No se puede saltar. Usa datos de ejemplo que solo viven en memoria: los datos reales no se tocan ni se guarda nada. En móvil tiene sus propios pasos (carrusel, deslizar, menú ⋮)
- **Solo una vez** — Queda marcado en el perfil de la cuenta, así que no vuelve a salir en otros dispositivos. Se puede repetir desde la ayuda
- **Ayuda revisada** — Reescrita entera para la app actual: "Hoy" y "Previsto", marcar como pagado, autocompletado, revisar importes al copiar, meses cerrados, borrar el último informe, el menú del móvil… Corrige dos secciones con el mismo número que se abrían a la vez
- **Diseño entre 1024 y 1280 px** — Las tarjetas del resumen van de dos en dos (los nombres ya no se cortan), los filtros de transacciones bajan debajo del título y la página ya no se desplaza en horizontal
- SemVer: 2.3.0 → 2.4.0 (MINOR)

### v2.3.0 — Cierre de mes

- **Borrar el último informe** — Desde el detalle del último informe se puede borrar (con confirmación), junto con sus transacciones de ajuste, por si se cerró el mes sin querer. El mes vuelve a quedar abierto
- **"Actualizar mes" sustituye los ajustes** — Antes, actualizar un informe añadía ajustes nuevos encima de los anteriores; ahora los recalcula sin ellos y los sustituye: siempre queda un ajuste por persona
- **Ajustes de cierre protegidos** — Llevan una marca propia y sus botones de editar y borrar se ven desactivados: se cambian actualizando el mes o borrando el informe. Nunca quedan pendientes de pagar
- **Meses cerrados de solo lectura** — En un mes pasado con informe, las transacciones no muestran los botones de pagado, editar ni borrar
- **Revisar importes al copiar** — El modal de copiar gastos fijos e ingresos (ahora con margen interior) tiene un tercer botón, "Revisar importes", para cambiar el importe de cada uno antes de copiarlos
- SemVer: 2.2.0 → 2.3.0 (MINOR)

### v2.2.0 — Estilo y limpieza

- **Informes** — Los gráficos del informe salen centrados (también en móvil) y el título del informe, centrado. La tarjeta pasa a llamarse "Informes" y muestra solo los 3 últimos; el botón "Todos", junto a "Cerrar mes actual", abre un modal con todos los informes y un filtro por año
- **Autocompletado del nombre** — Al escribir el nombre de una transacción se sugieren los nombres ya usados del mismo tipo (sin tildes ni mayúsculas); se elige con un toque o con las flechas y Enter
- **Móvil** — Cabecera más baja y el mes centrado y más cerca de ella. Las tarjetas del resumen van en un carrusel deslizable con puntos. En transacciones, el buscador ocupa todo el ancho e Ingresos y Gastos van en una línea con el Balance debajo. Los botones flotantes se recogen en un menú (solo queda "+" a la vista) para no tapar el contenido
- **Textos** — "Resumen del mes de…" centrado, "Total acumulado", "No computables", contador de transacciones como "10/29" y totales de transacciones sin la palabra "filtrados"
- Margen entre la lista de transacciones y el footer, en móvil y en PC
- **Se quita "Cargar datos de prueba"** de los ajustes, con toda su lógica
- SemVer: 2.1.0 → 2.2.0 (MINOR)

### v2.1.0 — "Hoy" y "Previsto" en el resumen del mes

- **Dos cifras en el resumen** — Las tarjetas de Balance, Gastos y Balance individual muestran lo que hay **hoy** (solo con los gastos marcados como pagados) y lo **previsto** a final de mes (con todos los gastos). Los ingresos cuentan siempre y los ajustes de cierre nunca quedan pendientes
- Si no queda nada por pagar, o el mes aún no ha empezado, se ve solo una cifra, como antes
- En PC, las filas de las cuatro tarjetas quedan a la misma altura aunque alguna no tenga la línea "Hoy"
- SemVer: 2.0.1 → 2.1.0 (MINOR)

### v2.0.1 — App Check con reCAPTCHA Enterprise

- **App Check con el proveedor correcto** — la app pedía tokens a reCAPTCHA v3 clásico, pero en Firebase está registrada con reCAPTCHA Enterprise ("Fraud Defense"). Los tokens no se validaban y, al aplicar App Check, el login fallaba con "token inválido". Ahora usa reCAPTCHA Enterprise con la misma clave
- SemVer: 2.0.0 → 2.0.1 (PATCH)

### v2.0.0 — Cuenta, nube y cifrado de extremo a extremo

- **Cuenta obligatoria** — Para usar la app hace falta una cuenta (email y contraseña) con el email verificado. Se puede cambiar el email (con confirmación en la dirección nueva) y eliminar la cuenta
- **Hogar en la nube** — Los datos se guardan en Firestore, en un hogar compartido por la pareja o en "tu espacio" en modo individual. Se sincronizan al momento entre dispositivos y funcionan sin conexión. La pareja se une con un código de invitación de un solo uso que caduca en 48 h. Al crear el hogar se pueden subir los datos que ya había en el navegador
- **Cifrado de extremo a extremo** — Transacciones, informes y configuración se cifran en el navegador con AES-256-GCM. La clave del hogar se protege con la contraseña maestra de cada miembro (PBKDF2-SHA256, 600.000 iteraciones), que nunca se guarda. En la nube solo hay datos ilegibles
- **Contraseña maestra** — Se pide una vez por dispositivo y una vez al mes para no olvidarla. Se puede cambiar, y si se olvida, recuperar con el código de recuperación que se muestra al crear o unirse al hogar
- **Firebase App Check** — Solo la propia app puede usar el proyecto (reCAPTCHA v3), para que nadie gaste la cuota gratuita desde fuera
- **Iconos** — Logo nuevo como favicon e iconos de la app; los enlaces de los iconos ya funcionan en GitHub Pages (antes daban 404 por la ruta `/2budget`)
- **Despliegue** — Automático con GitHub Actions al hacer push a `production`
- SemVer: 1.5.0 → 2.0.0 (MAJOR)

### v1.5.0 — Modo individual

- **Usar la app sin pareja** — nuevo interruptor "Modo individual" en Configuración. Oculta la segunda persona: el formulario deja de pedir propietario y reparto (todo va a tu nombre), las tarjetas y el balance acumulado muestran solo los totales, la tabla pierde la columna de propietario y el cierre de mes pide un único dinero real, sin ajuste para la segunda persona
- **Sin tocar los datos** — es solo de interfaz y reversible. Si quedan transacciones de la segunda persona o compartidas, siguen sumando y se ven con su etiqueta; al activarlo se avisa de cuántas hay en meses sin cerrar. Los informes cerrados en pareja conservan su desglose
- **Datos de prueba** — en modo individual se generan a nombre de una sola persona
- SemVer: 1.4.7 → 1.5.0 (MINOR)

### v1.4.7 — Redondeo único sobre el reparto exacto

- **Un solo redondeo por mes** — la parte de cada persona se calcula sumando su parte exacta de todas las transacciones (con sus fracciones de céntimo) y redondeando una única vez, por separado para ingresos y gastos. Antes se redondeaba cada porcentaje por separado y los céntimos sobrantes podían caer todos en la misma persona (p. ej. 383,34 € al 87% y 73,99 € al 50% daban 370,51 € en vez de 370,50 €). Ahora el resultado nunca se aleja más de medio céntimo del reparto exacto
- **Aviso** — si creaste ajustes de un céntimo en un mes cerrado para compensar el redondeo anterior, puede que ya no hagan falta: revisa ese mes y bórralos si su balance ya no cuadra
- SemVer: 1.4.6 → 1.4.7 (PATCH)

### v1.4.6 — Meses cerrados y acumulado cuadran al céntimo

- **Corrección automática de los meses cerrados** — los meses cerrados antes de la v1.4.5 tenían sus ajustes calculados con el reparto antiguo y, con el nuevo, algún céntimo pasaba de una persona a otra (p. ej. 1.400 / 0 salía 1.399,99 / 0,01). Al abrir la app se añade una sola vez un ajuste de cierre de céntimos en esos meses para que vuelvan a cuadrar con el dinero real. Solo se aplica si la diferencia es únicamente de reparto; un mes editado tras cerrarlo no se toca
- **Balance total acumulado mes a mes** — el acumulado se calcula sumando el balance de cada mes, igual que las tarjetas mensuales, en lugar de agregarlo todo de golpe
- **Importar copias antiguas** — al importar un archivo de una versión anterior también se le aplica esta corrección
- SemVer: 1.4.5 → 1.4.6 (PATCH)

### v1.4.5 — Reparto exacto de los gastos compartidos

- **Sin céntimos acumulados en un lado** — los importes compartidos se suman por porcentaje y se reparte el total una sola vez, en lugar de repartir cada transacción por separado. Antes, cada importe con céntimo impar al 50% le daba ese céntimo siempre a la Persona 1 (p. ej. 1.486,92 € salía 743,47 / 743,45); ahora sale 743,46 / 743,46, y como mucho queda un céntimo de diferencia por porcentaje
- SemVer: 1.4.4 → 1.4.5 (PATCH)

### v1.4.4 — La copia conserva el «no computable»

- **Arreglo en la copia de gastos fijos e ingresos** — las transacciones marcadas como no computables mantienen esa marca al copiarse al mes siguiente; antes se copiaban como computables
- SemVer: 1.4.3 → 1.4.4 (PATCH)

### v1.4.3 — Gastos de 0 €

- **Se admiten importes de 0 €** — un gasto habitual que un mes no se cobra (por ejemplo, porque te lo regalan) puede guardarse a 0 € y sigue apareciendo en la lista y copiándose como fijo. Los importes negativos siguen sin admitirse
- **El campo muestra el 0** — el importe se ve como «0,00» en lugar de quedarse vacío, para que quede claro lo que se guarda
- SemVer: 1.4.2 → 1.4.3 (PATCH)

### v1.4.2 — Copias sin sufijo «(copiado)»

- **Nombre original en las copias** — las transacciones copiadas mantienen su nombre tal cual, sin añadir «(copiado)»; si el origen ya lo arrastraba de versiones anteriores, se limpia al copiar
- SemVer: 1.4.1 → 1.4.2 (PATCH)

### v1.4.1 — Copia también de los ingresos

- **Los ingresos también se copian** — el botón de copia traspasa, además de los gastos fijos, todos los ingresos del mes anterior, excepto los ajustes de cierre del informe
- **Sin duplicados** — cada tipo se copia solo si el mes destino aún no lo tiene: si ya copiaste los gastos fijos, puedes volver a pulsar para traer solo los ingresos
- SemVer: 1.4.0 → 1.4.1

### v1.4.0 — Preparar el mes siguiente tras cerrar el informe

- **Copia de gastos fijos al mes siguiente** — en cuanto el mes en curso tiene el informe cerrado, se puede navegar al mes siguiente y copiar sus gastos fijos sin esperar al día 1. Las copias se fechan el día 1 de ese mes. Si el mes anterior no está cerrado, el botón sigue bloqueado para meses futuros
- SemVer: 1.3.0 → 1.4.0 (MINOR: nueva funcionalidad, sin breaking changes)

### v1.3.0 — Fecha real de pago y decimales exactos

- **La fecha refleja cuándo pagaste** — al marcar un gasto como pagado, su fecha pasa al día de hoy si es del mes en curso, o al último día de su mes si estás revisando otro mes. El mes de un gasto nunca cambia. Desmarcar no toca la fecha; al volver a marcar se recalcula. El modal de cierre de mes respeta la fecha de los gastos que ya habías marcado dentro de su mes
- **Redondeo unificado a 2 decimales** — toda la aritmética monetaria pasa por un único módulo que opera en céntimos enteros. Los repartos por porcentaje cuadran siempre (`parte1 + parte2 = total`), los balances por persona suman exactamente el total, y desaparecen los `-0,00 €` en rojo
- **El importe no admite un tercer decimal** — el campo lo rechaza al teclear, al pegar y con separador coma o punto
- **Migración automática** — los importes ya guardados se normalizan a 2 decimales la primera vez que abres esta versión
- **Arreglo de zona horaria** — la fecha por defecto del formulario usaba UTC y devolvía el día anterior si añadías un gasto de madrugada
- SemVer: 1.2.0 → 1.3.0 (MINOR: cambia comportamiento y normaliza datos guardados)

### v1.2.0 — Marcado de gastos como pagados

- **Marcar gastos como pagados** — cada gasto (incluidos los no computables) se marca como pagado/pendiente con un clic; es un indicador visual y no afecta a ningún cálculo
- **Cierre de mes** — al empezar un mes de calendario nuevo, un modal recuerda reconciliar los gastos del mes anterior: marcar los pagados o «Marcar todas». Los gastos del nuevo mes empiezan sin pagar
- **Arreglos de lógica** — corregido el desfase de fechas por zona horaria, la copia de gastos fijos (mes correcto, sin duplicados en enero) y las tarjetas «Filtradas», que ahora respetan los filtros activos
- **SemVer**: `1.1.0` → `1.2.0` (MINOR: nueva funcionalidad, sin breaking changes)

### v1.1.0 — Refactorización integral + nueva paleta UI

- **Nueva paleta premium** — tema oscuro Gold (#D4AF37) × Violet (#8A2BE2) con efectos glow en botones
- **Tema oscuro por defecto** — `defaultTheme` actualizado a `"dark"`
- **Refactorización de `page.tsx`** — eliminado estado muerto `reportsListKey` y su `useEffect`, eliminados `console.log` de producción, eliminado callback `getPreviousMonthData` sin uso, deduplicada lógica `isFutureMonth`
- **`getMonthName` extraída** del componente como función pura de módulo
- **`globals.css` limpio** — eliminados ~150 líneas de comentarios JSDoc de bloque, paleta oscura actualizada con variables HSL mapeadas al nuevo sistema de diseño
- **`tailwind.config.ts` y `layout.tsx` limpios** — eliminados comentarios de bloque
- **Nuevas sombras Tailwind** — `shadow-glow-gold` y `shadow-glow-purple`
- **SemVer**: `1.0.1` → `1.1.0` (MINOR: nuevas funcionalidades estéticas, sin breaking changes)

### v1.0.2

- **Gastos No Computables** — excluidos del balance acumulado total (ideal para regalos, vacaciones)

### v1.0.1

- **Copia de gastos fijos e ingresos** — duplica los gastos fijos y los ingresos del mes anterior al mes actual con un clic
- Validación mejorada para evitar copias duplicadas en el mismo mes

---

## Autor

Desarrollado por [Caldeix](https://caldeix.github.io/links/) · Creado parcialmente con IA

---

© 2025 Caldeix. Todos los derechos reservados.
