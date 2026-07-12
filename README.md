# 🎷 Portfolio - Agustin Ciucani

> Fullstack Developer portfolio.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

## 📚 Descripción

Portfolio personal construido con **Next.js 15** y **React 19**, presentando mis proyectos y habilidades como desarrollador Fullstack. Incluye un diseño moderno con animaciones fluidas y un Easter Egg temático de Cowboy Bebop.

### ✨ Características

- **🚀 Performance optimizada** - Code-split below-the-fold, imágenes con `next/image`
- **♿ Accesibilidad** - ARIA labels, roles semánticos, focus management
- **🎨 Diseño responsivo** - Mobile-first con soporte para dark/light mode
- **🔤 Tipografía profesional** - Manrope + Space Grotesk via `next/font`
- **🎬 Animaciones** - Easter egg con animación CRT estilo Cowboy Bebop

## 🛠️ Tech Stack

| Categoría  | Tecnología                     |
| ---------- | ------------------------------ |
| Framework  | Next.js 15 (Pages Router)      |
| UI Library | React 19                       |
| Styling    | Tailwind CSS 4 + CSS Variables |
| Fonts      | Google Fonts (optimizadas)     |
| Icons      | SVG propios (`Icon.jsx`)       |
| Linting    | ESLint 9 + eslint-config-next  |

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/YukaC/PortfolioReact.git
cd PortfolioReact

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Scripts Disponibles

| Comando                 | Descripción                              |
| ----------------------- | ---------------------------------------- |
| `pnpm dev`              | Inicia servidor de desarrollo            |
| `pnpm build`            | Genera build de producción               |
| `pnpm start`            | Ejecuta build de producción              |
| `pnpm lint`             | Ejecuta ESLint                           |
| `pnpm validate:bebop`   | Valida timing del easter egg Bebop       |

## 📁 Estructura del Proyecto

```
PortfolioReact/
├── src/
│   ├── components/        # Componentes React reutilizables
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── HeroSection.jsx
│   │   ├── SkillsTicker.jsx
│   │   ├── ProjectsGrid.jsx
│   │   ├── Experience.jsx
│   │   ├── Contact.jsx
│   │   ├── Footer.jsx
│   │   ├── Icon.jsx       # Iconos SVG propios
│   │   └── BebopAnimation.jsx
│   ├── pages/             # Páginas Next.js
│   ├── styles/            # CSS global con Tailwind
│   ├── data/              # Datos estáticos (constants, projects, bebop)
│   └── hooks/             # Hooks (useBebopAnimation, …)
├── public/                # Assets estáticos
├── scripts/               # Utilidades (validate-bebop-timing)
└── package.json
```

## 🌐 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

### Otras plataformas

El proyecto genera páginas estáticas, compatible con:

- **Netlify** - Detecta Next.js automáticamente
- **Railway** - Usando el preset de Next.js
- **Docker** - Ver [Next.js Docker docs](https://nextjs.org/docs/deployment#docker-image)

## 🔧 Requisitos

- **Node.js** 22.x (especificado en `engines`)
- **pnpm** 9+ (gestor de paquetes primario)

## 🎨 Variables CSS

El proyecto usa CSS Custom Properties para theming:

```css
:root {
  --color-primary: #825ca3;
  --color-secondary: #5e3b5a;
  --color-amber-glow: #ffbf00;
  --color-bg: #f7f6f7;
  --color-text: #1e293b;
}

.dark {
  --color-bg: #19161c;
  --color-text: #e5e5e5;
}
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

**Creado por [Agustin Ciucani](https://github.com/YukaC)** 🚀
