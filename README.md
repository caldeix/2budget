# 2Budget

![Version](https://img.shields.io/badge/Version-1.1.0-gold.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Deployed on GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222?logo=github&logoColor=white)
![License](https://img.shields.io/badge/License-Propietaria-red.svg)

## Live

[https://caldeix.github.io/2budget](https://caldeix.github.io/2budget)

---

## Descripción

**2Budget** es una aplicación web de gestión financiera para parejas. Permite llevar un control detallado de ingresos y gastos compartidos, ver balances por persona y generar informes mensuales. Sin servidor — todos los datos se persisten en el navegador vía `localStorage`.

---

## Características

- **Transacciones** — Añade, edita y elimina ingresos/gastos con asignación por persona o porcentaje compartido
- **Resumen mensual** — Tarjetas de balance total y desglose por persona para el mes seleccionado
- **Balance acumulado** — Seguimiento del saldo total a lo largo del tiempo (excluye gastos no computables)
- **Gastos no computables** — Marca gastos puntuales (regalos, vacaciones) para que no afecten el balance global
- **Informes mensuales** — Genera y archiva cierres de mes con ajustes personalizados
- **Copia de gastos fijos** — Duplica automáticamente los gastos fijos del mes anterior con un clic
- **Importar / Exportar** — Backup y restauración en JSON
- **Tema oscuro / claro** — Paleta premium Gold × Violet con soporte automático del sistema
- **Diseño responsivo** — Optimizado para móvil y escritorio

---

## Instalación

```bash
git clone https://github.com/caldeix/2budget.git
cd 2budget
npm install
npm run dev        # http://localhost:3000
```

### Producción

```bash
npm run build      # Genera exportación estática en /out
npm run deploy     # Build + push a GitHub Pages
```

---

## Changelog

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

- **Copia de gastos fijos** — duplica los gastos fijos del mes anterior al mes actual con un clic
- Validación mejorada para evitar copias duplicadas en el mismo mes

---

## Autor

Desarrollado por [Caldeix](https://caldeix.github.io/links/) · Creado parcialmente con IA

---

© 2025 Caldeix. Todos los derechos reservados.
