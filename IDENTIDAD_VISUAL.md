# Identidad Visual - Tian Studio Portal

Este archivo define el estilo visual del portal para replicarlo en otro sitio.

## 1) ADN Visual

- Estilo: minimalista, ejecutivo, sobrio.
- Personalidad: premium, limpia, sin ruido.
- Contraste: fuerte en auth/home (negro), suave en portal interno (grises claros).

## 2) Tipografia

- Titulos: `Lexend Variable` (display y jerarquia).
- Texto general: `IBM Plex Sans`.
- Texto tecnico y tablas: `IBM Plex Mono`.

Imports usados en el proyecto:

```ts
import "@fontsource-variable/lexend";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
```

## 3) Tokens Base (CSS)

Usar este bloque en `globals.css`:

```css
:root {
  --background: #060606;
  --foreground: #f8f8f8;
  --panel: #0f0f10;
  --panel-soft: #141416;
  --line: #262629;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-title: "Lexend Variable", "Lexend", sans-serif;
  --font-sans: "IBM Plex Sans", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: "IBM Plex Sans", sans-serif;
}

input,
textarea,
select {
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--foreground);
}

.portal-light input,
.portal-light textarea,
.portal-light select {
  background: #ffffff;
  border: 1px solid #d4d4d8;
  color: #18181b;
}
```

## 4) Paleta de Trabajo

- Negro principal: `#000000` / `bg-black`
- Fondo oscuro auth/home: `bg-zinc-950`
- Sidebar oscuro: `bg-zinc-950` + borde `border-zinc-800`
- Fondo area de trabajo clara: `bg-zinc-100`
- Tarjeta clara: `bg-white` + borde `border-zinc-200`
- Texto claro secundario: `text-zinc-600` / `text-zinc-500`

## 5) Radios y Sombras

- Radio boton principal: `rounded-[20px]`
- Radio formulario login: `rounded-[25px]`
- Radio tarjeta actividad destacada: `rounded-[30px]`
- Sombra boton principal:
  - `shadow-[0_8px_20px_rgba(0,0,0,0.35)]`
- Sombra tarjeta actividad:
  - `!shadow-[0_14px_36px_-14px_rgba(0,0,0,0.34)]`

## 6) Patrones de Componentes

### 6.1 Boton principal (auth/home)

```html
class="rounded-[20px] bg-white px-5 py-2.5 text-sm font-medium text-black shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:bg-zinc-100 hover:translate-y-[1px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.30)] active:translate-y-[2px] active:shadow-[0_3px_10px_rgba(0,0,0,0.24)]"
```

### 6.2 Contenedor login flotante

```html
class="rounded-[25px] border border-zinc-800 bg-black p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)]"
```

### 6.3 Sidebar portal

```html
class="w-60 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
```

### 6.4 Main portal claro

```html
class="portal-light min-w-0 flex-1 space-y-6 rounded-2xl border border-transparent bg-zinc-100 p-5 md:p-7"
```

### 6.5 Badge de estado

- Neutral: `bg-zinc-100 text-zinc-700 border-zinc-300`
- Info: `bg-blue-50 text-blue-700 border-blue-200`
- Success: `bg-emerald-50 text-emerald-700 border-emerald-200`
- Warning: `bg-amber-50 text-amber-700 border-amber-200`
- Danger: `bg-rose-50 text-rose-700 border-rose-200`

## 7) Layout del Sitio

- Home/Login:
  - Fondo oscuro completo (`min-h-screen`, `bg-zinc-950`).
  - Contenido centrado, bastante aire vertical.
- Portal interno:
  - Sidebar negra fija visual.
  - Superficie principal clara (`bg-zinc-100`).
  - Tarjetas blancas para secciones.

## 8) Estado por Actividad

Patron sugerido para tarjetas:

- Pendiente: borde ambar `border-amber-400`
- En progreso: borde azul `border-sky-400`
- Completada: borde verde `border-emerald-400`

Base de tarjeta:

```html
class="rounded-[30px] border p-4 !shadow-[0_14px_36px_-14px_rgba(0,0,0,0.34)]"
```

## 9) Tabla de Materiales

- Encabezado de tabla (version usada):
  - `bg-[#E5FBB8] text-zinc-800`
- Filas limpias:
  - `border-t border-zinc-100`
- Tipografia compacta para densidad:
  - `text-sm` en celdas
  - `text-xs` en etiquetas secundarias

## 10) Microinteracciones

Animacion base usada:

```css
@keyframes pageFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Clase wrapper:

```html
class="animate-[pageFadeIn_320ms_ease-out] transition-all"
```

## 11) Reglas de Consistencia

- Evitar saturar con muchos colores.
- Usar color solo para estado o accion clave.
- Mantener bordes suaves y tipografia legible.
- Dejar espacio vertical generoso entre bloques.
- Priorizar contraste y escaneabilidad sobre decoracion.

## 12) Checklist Rapido para clonar este estilo en otro proyecto

1. Instalar Lexend + IBM Plex Sans + IBM Plex Mono.
2. Copiar tokens de `globals.css` (seccion 3).
3. Usar layout dark para auth y layout light para app.
4. Reusar clases de boton principal y cards.
5. Aplicar sistema de badges por estado.
6. Mantener radios: 20, 25 y 30 segun componente.
