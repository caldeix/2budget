<div align="center">

# 2Budget

**Las finanzas de casa, en pareja o por tu cuenta, cifradas de extremo a extremo.**

[![Abrir 2Budget](https://img.shields.io/badge/Abrir_2Budget-caldeix.github.io%2F2budget-8A2BE2?style=for-the-badge&logo=googlechrome&logoColor=white)](https://caldeix.github.io/2budget)

[![Autor: caldeix](https://img.shields.io/badge/autor-caldeix-181717?logo=github&logoColor=white)](https://github.com/caldeix)
[![© 2026 Caldeix](https://img.shields.io/badge/%C2%A9_2026-Caldeix-D4AF37)](LICENSE)

![Version](https://img.shields.io/badge/Version-3.6.0-gold.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth_%2B_Firestore-FFCA28?logo=firebase&logoColor=black)
![Deployed on GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222?logo=github&logoColor=white)
[![License](https://img.shields.io/badge/License-Propietaria-red.svg)](LICENSE)

</div>

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
- **Cuenta compartida** — Las aportaciones que cada uno envía a la cuenta de los dos son un tipo propio (un traspaso, no un gasto). Lo compartido sale de la compartida y lo individual de la cuenta de cada uno: el resumen, el total acumulado y el cierre de mes separan la cuenta de cada persona y la compartida, y el cierre pide su saldo en el banco
- **Resumen anual** — Totales, personas, categorías y meses de un año, para Excel o PDF
- **Presupuestos** — Límite al mes por categoría con aviso al acercarse
- **Metas de ahorro** — Reparte lo ahorrado de los meses cerrados en metas personales y compartidas
- **Entrar con Google** — Además de email y contraseña; se puede unir a una cuenta existente sin perder el hogar
- **Copia de gastos fijos, ingresos y aportaciones** — Duplica automáticamente los gastos fijos, los ingresos y las aportaciones a la compartida del mes anterior con un clic, con su categoría (sin los ajustes de cierre); si el mes ya tiene el informe cerrado, se pueden copiar al mes siguiente sin esperar al día 1
- **Modo individual** — Desde Configuración, oculta la segunda persona para usar la app sin pareja: sin propietario ni repartos en el formulario, Ingresos y Gastos juntos en una sola tarjeta y un único dinero real en el cierre de mes
- **Cuenta y hogar en la nube** — Cuenta obligatoria con email verificado. Los datos se guardan en un hogar compartido por la pareja (o "tu espacio" en modo individual), sincronizado al momento entre dispositivos y también sin conexión. Invitación a la pareja con un código de un solo uso
- **Cifrado de extremo a extremo** — Cada transacción, informe y la configuración se cifran en el navegador (AES-256-GCM) con una clave del hogar protegida por la **contraseña maestra** de cada miembro (PBKDF2). La contraseña maestra no se guarda en ningún sitio
- **Código de recuperación** — Permite elegir una contraseña maestra nueva si se olvida; se muestra una sola vez. Una vez al mes, la app pide la contraseña maestra para que no se olvide
- **Importar / Exportar** — Backup y restauración en JSON
- **Tema oscuro / claro** — Paleta premium Gold × Violet con soporte automático del sistema
- **Diseño responsivo** — Optimizado para móvil y escritorio

---

## Changelog

### v3.6.0 — Resumen anual

- **Un año de un vistazo** — En la tarjeta Informes, el botón «Año» abre el resumen de un año: ingresos, gastos y ahorro, cada persona (con su parte de lo compartido y lo enviado a la compartida), gastos e ingresos por categoría y cada mes
- **Exportar** — «Excel (CSV)» lo descarga para Excel (punto y coma, coma decimal y tildes correctas) e «Imprimir o PDF» lo abre solo para imprimirlo o guardarlo en PDF; si el navegador no deja abrir la ventana, se descarga como página
- Paso del tour y sección de la Ayuda
- SemVer: 3.5.0 → 3.6.0 (MINOR)

### v3.5.0 — Presupuestos por categoría

- **Límite al mes por categoría** — En la tarjeta Presupuestos del lateral se pone un límite a las categorías de gasto que se quieran vigilar. Es del hogar: cuentan todos los gastos de la categoría en el mes que se está viendo, también los pendientes
- **Cuánto llevas** — Barra verde por debajo del 80 %, ámbar hasta el límite y roja si te has pasado, con lo que queda (o lo que te has pasado) y lo ya pagado
- **Aviso al apuntar** — Si un gasto lleva su categoría al 80 % o por encima del límite, la app avisa al guardarlo
- Paso del tour y sección de la Ayuda
- SemVer: 3.4.1 → 3.5.0 (MINOR)

### v3.4.1 — Recordatorio de cierre

- **Mes sin cerrar** — Si un mes ha terminado y no tiene informe, un aviso arriba lo recuerda con un botón para cerrarlo (su ahorro no cuenta en las metas hasta entonces). «Ahora no» lo oculta hasta la próxima vez que se abra la app
- SemVer: 3.4.0 → 3.4.1 (PATCH)

### v3.4.0 — Evolución por cuenta

- **Selector de cuenta** — En pareja, la ventana de Evolución tiene, junto al año, un selector con «Mi cuenta» y «Compartida»: cada uno ve sus ingresos, gastos y ahorro, y los de la compartida, nunca los de la pareja (sin cuenta en la nube, las de los dos). En modo individual no cambia
- **Cifras que cuadran** — El ahorro de cada mes de «Mi cuenta» es la cifra de tu cuenta en el Balance individual, y el de «Compartida», la de la fila Compartida
- **Tarjeta del lateral** — Enseña la cuenta elegida en la ventana y se recuerda en el dispositivo
- SemVer: 3.3.0 → 3.4.0 (MINOR)

### v3.3.0 — Metas de ahorro

- **Metas desde el Total acumulado** — Al pulsarlo se abren las metas: cada uno ve las suyas (sobre su cuenta) y las compartidas (sobre la compartida); en modo individual, solo las tuyas
- **Solo dinero de meses cerrados** — Se reparte lo ahorrado en los meses terminados y con el informe cerrado; lo que no se asigna queda en «Sin asignar». El mes en curso no se puede repartir hasta que acaba
- **Objetivo y progreso** — Cada meta tiene un objetivo opcional con barra de progreso; quitar dinero o borrarla lo devuelve a Sin asignar
- **Mes en negativo** — Si el mes en curso va en negativo con lo ya pagado, primero se gasta lo sin asignar y luego baja la última meta a la que se añadió dinero. Se calcula: si el mes se recupera, vuelven a su cifra. También avisa de lo que bajarían con lo previsto
- **Cifradas y sincronizadas** — Una colección nueva en la nube, cifrada como el resto; las versiones anteriores a la 3.3.0 piden actualizar
- Requiere publicar las reglas nuevas de Firestore ANTES de la app (`firebase deploy --only firestore:rules`): son compatibles con la versión anterior
- SemVer: 3.2.0 → 3.3.0 (MINOR)

### v3.2.0 — Entrar con Google

- **Botón de Google** — Al lado de «Entrar» y de «Crear cuenta». Con Google no hace falta verificar el email
- **Unir Google a tu cuenta** — La primera vez que entras con Google se pregunta si ya tienes una cuenta de 2Budget: si es así, entras con tu email y contraseña y Google queda unido a ella (mismo hogar y mismos datos, sin crear otro usuario). Con un email ya registrado, se pide su contraseña para unirlas
- **Formas de entrar** — En Cuenta se ve si entras con contraseña, con Google o con las dos, y se puede vincular o desvincular Google. Quien solo entra con Google confirma con Google al eliminar la cuenta
- **Instalar en iPhone** — Aviso, una vez, de cómo añadir la app a la pantalla de inicio en Safari (el iPhone no lo ofrece solo), y los pasos en la Ayuda
- La contraseña maestra no cambia: Google solo sustituye a la contraseña de entrar
- Requiere el proveedor Google activado en Firebase (Authentication → Métodos de acceso)
- SemVer: 3.1.2 → 3.2.0 (MINOR)

### v3.1.2 — Últimos arreglos de la auditoría

- **Llave del hogar durante 3 días** — Tras escribir la contraseña maestra, el dispositivo guarda la llave del hogar 3 días; después la vuelve a pedir (también si la app se queda abierta). La Ayuda explica qué protege y qué no
- **Contraseña de la cuenta** — Las cuentas nuevas piden 8 caracteres como mínimo (la contraseña maestra sigue en 12)
- **Caché más pequeña** — La app instalada solo guarda lo necesario para abrir sin conexión (la página, el manifiesto, los iconos y sus ficheros)
- **Despliegue** — Las acciones de GitHub van fijadas por commit
- M11 (mes sin aportaciones) se queda como está: sus gastos compartidos salen de la cuenta de cada uno
- SemVer: 3.1.1 → 3.1.2 (PATCH)

### v3.1.1 — Accesibilidad y mantenimiento

- **Ventanas accesibles** — Los modales son diálogos de verdad: el foco entra, no se escapa con el tabulador y vuelve al cerrar; con dos abiertos, Escape cierra solo el de encima. Durante el tour, la app de detrás queda inactiva
- **Botones con nombre** — Editar y borrar dicen qué transacción; en el móvil, además del gesto de deslizar, un botón «Más acciones»; el deslizador de reparto se lee como «Luis 60 %, Ana 40 %». Botones táctiles de 44 px
- **Contraste** — Texto oscuro sobre los botones dorados y un dorado más oscuro como texto en el tema claro (de 2,2:1 a más de 4,5:1)
- **iPhone** — La barra del sistema toma el color de cada tema, los modales no quedan tapados por las barras de Safari y el selector de categorías ya no hace zoom
- **Cambios a la vez sin pisarse** — La configuración lleva revisión: si tu pareja la cambió antes (también sin conexión), solo se aplica encima lo que cambiaste tú, y la privacidad de cada uno no se pisa. Una transacción que tu pareja borró no reaparece al editarla, y la reconciliación de pagados solo envía lo que cambias
- **Modo local** — Dos pestañas abiertas ya no se pisan: cada una recoge lo que guarda la otra
- **Rendimiento** — El mes y el total acumulado se calculan solo cuando cambian los datos, y los meses archivados sin cambios no se vuelven a comparar en cada escritura
- **Mantenimiento** — Ids con `crypto.randomUUID`, un solo nombre de mes, `page.tsx` y la tabla partidos en ficheros más pequeños, sin ESLint a medias ni el script `deploy` (el despliegue revisa tipos)
- Requiere publicar las reglas nuevas de Firestore (`firebase deploy --only firestore:rules`); hasta actualizar, una versión anterior no puede cambiar la configuración del hogar
- SemVer: 3.1.0 → 3.1.1 (PATCH)

### v3.1.0 — Avisos y robustez

- **Versión mínima** — El hogar guarda la versión más antigua que entiende sus datos: una app vieja abierta o en caché se bloquea con un aviso de actualizar en vez de calcular mal. Al volver a la app, si hay una versión nueva publicada, avisa para recargar
- **Modo local más seguro** — Si el navegador no puede guardar (almacenamiento lleno o bloqueado), avisa; pide almacenamiento persistente y, en iPhone y iPad sin instalar, recuerda que Safari borra los datos tras 7 días sin abrir la web
- **Errores al abrir el hogar** — Si el hogar no se puede abrir, la app ya no enseña ni guarda los datos de otro sitio: ofrece reintentar. Un documento dañado ya no bloquea todo el hogar: se salta y se avisa
- **Pantalla de error propia** — Si algo falla, se puede exportar los datos y recargar; el último error se ve en Configuración. Los avisos ya no son ventanas del navegador
- **Cierres encadenados** — Al actualizar un cierre con compartida, avisa de los cierres posteriores que hay que actualizar después
- **Importar con control** — Un archivo con datos que la app no sabe leer (sin fecha, importe en texto…) se rechaza diciendo cuáles; antes de sustituir se descarga una copia de los datos actuales
- **Balance individual más claro** — Al pulsar cada fila se ve de dónde sale su cifra (ingresos − gastos = total previsto; total − parte en la compartida = cuenta), y la Ayuda explica qué cifra repartir
- **Copia local sin cifrar** — Al pasar a la nube sin subir los datos locales, o al cerrar sesión, se ofrece borrarlos de este dispositivo
- SemVer: 3.0.3 → 3.1.0 (MINOR)

### v3.0.3 — Seguridad

- **Reglas del hogar más estrictas** — Un miembro solo puede cambiar los datos cifrados, su propio email o salir del hogar; ya no puede quitar al otro, cambiar los roles ni dejar el hogar sin miembros
- **Invitaciones de un solo uso de verdad** — Unirse y gastar la invitación van en la misma escritura; caducan en 48 horas como mucho, y generar otro código invalida el anterior
- **Solo datos cifrados en la nube** — Las reglas rechazan documentos que no sean el texto cifrado o que traigan campos inesperados
- **Contraseña maestra más fuerte** — Las nuevas piden 12 caracteres y que no sean repetitivas; las actuales siguen valiendo
- **Content-Security-Policy** — La web solo carga código y envía datos a Firebase y reCAPTCHA
- **Dependencias** — Next 15.5.28 y fuera 32 paquetes y 39 componentes sin usar (avisos de seguridad de producción: de 21 a 7, ninguno crítico ni del navegador)
- Requiere publicar las reglas nuevas de Firestore (`firebase deploy --only firestore:rules`)
- SemVer: 3.0.2 → 3.0.3 (PATCH)

### v3.0.2 — Datos y cálculos más seguros

- **Cierre con dinero negativo** — El dinero real del cierre admite cifras negativas (una cuenta en descubierto); antes como mínimo se escribía 0 y se creaba un ajuste falso
- **Nada se pierde al archivar** — Un gasto apuntado sin conexión en un mes que el otro ya cerró se une a ese mes en vez de borrarse al archivar
- **Un informe por mes** — El informe y sus ajustes tienen un id fijo por mes: dos cierres a la vez ya no duplican el informe ni los ajustes. Si hubiera informes repetidos de antes, al leer se queda el más reciente
- **Ajustes reconocidos por su marca** — Una transacción tuya que se llame «Ajuste X - Cierre Y» ya no se toma por un ajuste de cierre
- **Tema sin destello** — El tema oscuro se aplica antes de pintar; los quesitos del informe usan el color de la tarjeta en los dos temas y suman con aritmética exacta
- **Proyecto** — Una sola configuración de Next y sin errores de tipos ocultos en la build
- SemVer: 3.0.1 → 3.0.2 (PATCH)

### v3.0.1 — Tour de la cuenta compartida

- **El tour enseña la cuenta compartida** — Los datos de ejemplo del tour llevan aportaciones a la compartida, así que el resumen se ve «Por cuenta», con la fila «Compartida». Paso nuevo «Cuenta compartida» y textos al día en el resumen, el total acumulado, la lista, el formulario (tipo «Aportación»), el cierre de mes (saldo de la compartida) y copiar (también aportaciones). En modo individual el tour no cambia
- **Cierre de mes** — En PC, las tres casillas de dinero real quedan alineadas aunque la etiqueta de la compartida ocupe dos líneas
- SemVer: 3.0.0 → 3.0.1 (PATCH)

### v3.0.0 — Cuenta compartida

- **Aportaciones a la cuenta compartida** — Tipo nuevo en el formulario: lo que cada uno envía a la cuenta de los dos. No es un gasto: el dinero sigue siendo tuyo, solo cambia de cuenta. Se elige quién aporta, se marca como enviada y se copia al mes siguiente con los fijos y los ingresos
- **Lo compartido va por la compartida** — Todo gasto o ingreso con reparto sale o entra de la cuenta compartida; lo que es solo de uno, de su cuenta. Sin selectores nuevos: lo decide el reparto
- **Tres cuentas en el resumen** — En el balance individual, la cuenta de cada uno (lo que verás en el banco), su total debajo y una fila nueva «Compartida» con lo que hay y de quién es, en Hoy y en Previsto. También en el total acumulado: lo que sobra en la compartida se queda ahí
- **Cierre de mes con la compartida** — Pide lo que queda en la cuenta de cada uno y el saldo de la compartida en el banco; si no cuadra con lo calculado, el ajuste se reparte a medias. El informe muestra lo aportado, lo gastado y el saldo de la compartida
- **Lista** — Las aportaciones llevan su icono, una flecha en el importe y «Aportación de …» en lugar de categoría; filtro nuevo «Aportaciones». Se ven siempre, aunque la pareja tenga activada la privacidad
- Los meses sin aportaciones se ven exactamente igual que antes. En modo individual no cambia nada
- **Actualizad la app en los dos dispositivos**: una versión anterior a la 3.0.0 contaría las aportaciones como gastos
- SemVer: 2.11.0 → 3.0.0 (MAJOR)

### v2.11.0 — Ingresos y gastos juntos en modo individual

- **Una tarjeta para Ingresos y Gastos en modo individual** — Sin desglose por persona, las dos tarjetas se quedaban casi vacías. Ahora van juntas en una sola, partida en horizontal: los ingresos arriba en verde y los gastos abajo en rojo (con la cifra de «Hoy» si hay gastos pendientes). En PC y tablet queda al lado del Balance; en el móvil, el carrusel pasa a dos tarjetas. En pareja no cambia nada
- **La copia conserva la categoría** — Al copiar los gastos fijos y los ingresos del mes anterior, cada copia mantiene su categoría. Antes quedaban todas en «Sin categoría»
- **Sin tests en el proyecto** — Fuera Vitest y el script `test` de `package.json`
- SemVer: 2.10.2 → 2.11.0 (MINOR)

### v2.10.2 — Hoy y Previsto en modo individual

- **Hoy y Previsto en modo individual** — Con gastos pendientes, las tarjetas de Balance y Gastos muestran la tabla «Hoy | Previsto» (con una sola fila) en lugar de la línea «Hoy», igual que en pareja. Antes la palabra «Previsto» no aparecía y no se veía qué era cada cifra
- **README** — Enlace a la web, autor y copyright como insignias al principio; licencia al día (2026)
- SemVer: 2.10.1 → 2.10.2 (PATCH)

### v2.10.1 — Categorías en orden alfabético

- **Categorías ordenadas** — Salen en orden alfabético en el formulario de transacción, en el filtro de la lista y en Configuración (una nueva entra ya en su sitio). «Sin categoría» sigue en su sitio de siempre
- SemVer: 2.10.0 → 2.10.1 (PATCH)

### v2.10.0 — Gastos por categoría según de quién son

- **Tres vistas en el quesito de categorías del informe** — "Ambos" (los gastos compartidos, con cualquier reparto), y los individuales de cada persona. Las tres suman el total del mes. En modo individual no hay selector
- SemVer: 2.9.0 → 2.10.0 (MINOR)

### v2.9.0 — Categorías, evolución y búsqueda en todos los meses

- **Categorías** — Cada transacción tiene una categoría (Supermercado, Casa, Suministros, Transporte, Restaurantes y ocio, Salud, Ropa, Suscripciones, Regalos, Viajes, Ahorro, Otros; Nómina y Otros ingresos para ingresos), editable desde Configuración (renombrar, quitar, añadir). Al elegir un nombre ya usado se rellena sola la categoría de la última vez, y al poner categoría a un nombre que antes no la tenía, la app ofrece aplicarla a las transacciones anteriores (también dentro de los informes cerrados). Las antiguas quedan en "Sin categoría"
- **Un solo selector de tipo** — Gasto variable, Gasto fijo o Ingreso. En la lista, el tipo va como icono y la categoría como texto; los filtros son por tipo y por categoría
- **Informe** — Gráfico nuevo de gastos por categoría, a toda la fila y con la leyenda en columnas; orden Ingresos → Gastos → Categorías
- **Evolución** — Tarjeta en el lateral con los ingresos y gastos de los últimos seis meses; al pulsarla, el año completo con el ahorro de cada mes, los totales y un selector de año
- **Buscar en todos los meses** — Con texto en el buscador se ven las coincidencias de cualquier mes (fecha en dorado; solo lectura si el mes está cerrado)
- **Tour** — Pasos nuevos (evolución, categorías, búsqueda, privacidad, instalar la app) y abre por dentro el formulario de transacción y el cierre de mes. Ayuda al día
- **PC** — Un 20% más de ancho (1536 px) y el lateral alineado con la primera tarjeta del resumen
- Corregido: "Guardar configuración" borraba la opción de privacidad en pareja
- SemVer: 2.8.0 → 2.9.0 (MINOR)

### v2.8.0 — Formulario más simple y meses cerrados de verdad

- **Sin selector de propietario** — El reparto lo decide solo el deslizador: 100% para uno es "Solo de Luis/Ana" (se guarda como individual) y cualquier otro valor, "Compartido". Las transacciones individuales antiguas pasan a 100/0 al leerlas, y un "Ambos" al 100% se muestra como individual
- **Calendario propio** — La fecha se elige en el calendario de la app (en español, igual en PC y móvil), sin escribir a mano. Los días anteriores a la fecha mínima salen en gris
- **Fecha mínima** — No se añaden transacciones a meses ya pasados: se admite desde el día 1 del mes anterior mientras no esté cerrado y, si lo está, desde el día 1 del mes actual. Al editar, la fecha original siempre vale
- **Informes** — Solo se puede actualizar el informe del mes actual y del anterior; un mes más antiguo sin informe se puede generar, y con informe ya no se toca
- **Importar datos pide confirmación** — Avisa de que sustituye todos los datos (en la nube, los de los dos miembros) y recomienda exportar antes
- **Detalles** — "Transacciones 10/29" en una sola línea y la casilla "Gasto no computable" a todo el ancho del formulario
- date-fns 3.0.0 → 3.6.0 (fallo de tipos al cargar el idioma del calendario)
- SemVer: 2.7.0 → 2.8.0 (MINOR)

### v2.7.0 — Instalable como app

- **Manifiesto web** — Nombre, iconos (también la versión "maskable" que Android recorta en círculo), colores y pantalla completa: Android ofrece "Instalar app" en vez de un simple acceso directo, y la app se abre en su propia ventana, con su icono en el cajón de aplicaciones. En iPhone, "Añadir a pantalla de inicio" desde Safari la abre a pantalla completa
- **Abre sin conexión** — Un service worker guarda la portada y sus ficheros desde la primera visita. La página siempre se pide primero a la red (para tener la última versión publicada) y los ficheros con hash salen de la caché; cada versión tiene su propia caché y borra la anterior. No toca Firebase ni otros dominios
- SemVer: 2.6.1 → 2.7.0 (MINOR)

### v2.6.1 — Ordenar por pagados y filtros más ordenados

- **Ordenar por pagados** — La cabecera "Pagado" de la tabla (PC) ordena por pago: primero los gastos pendientes, luego los pagados y al final los ingresos; otro clic invierte el orden
- **Filtros** — La búsqueda ocupa una línea entera y los tres selectores (tipo, categoría y pago) van en la siguiente; en móvil, uno debajo de otro
- SemVer: 2.6.0 → 2.6.1 (PATCH)

### v2.6.0 — Filtro de pagados y privacidad en pareja

- **Filtro por pago** — En las transacciones, un selector más para ver solo los gastos pagados o solo los pendientes
- **Ocultar mis transacciones individuales a mi pareja** — Opción de cada miembro en Cuenta > Tu hogar. Con ella activada, la pareja ve *** en lugar del importe de las transacciones que son 100% de quien la activa (en la lista, en el aviso de gastos pagados y al revisar importes al copiar) y no puede editarlas. Los totales, balances e informes no cambian; los ajustes de cierre siempre se ven. Con un filtro o una búsqueda que incluya importes ocultos, los totales filtrados también se ocultan para no delatarlos. Es una ocultación en la app, no un cifrado aparte
- SemVer: 2.5.0 → 2.6.0 (MINOR)

### v2.5.0 — Menos lecturas de Firestore

- **Meses cerrados archivados** — Las transacciones de un mes pasado con informe se guardan dentro del documento cifrado de su informe y se borran sus documentos sueltos. Al abrir la app solo se leen las transacciones de los meses abiertos y un documento por mes cerrado: con dos años de datos, unas 15 veces menos lecturas, y el coste casi deja de crecer con la historia
- **Sin cambios visibles** — La app ve los mismos datos. La migración se hace sola al abrir la app (con datos del servidor, no de la caché), es segura si se corta a medias y no se repite. Al borrar el informe de un mes archivado, sus transacciones vuelven a ser documentos sueltos
- SemVer: 2.4.0 → 2.5.0 (MINOR)

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
