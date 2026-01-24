# 🎷 Portfolio - Agustin Ciucani

> Full-Stack Developer portfolio.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

## 📚 Descripción

Portfolio personal construido con **Next.js 15** y **React 19**, presentando mis proyectos y habilidades como desarrollador Full-Stack. Incluye un diseño moderno con animaciones fluidas y un Easter Egg temático de Cowboy Bebop.

### ✨ Características

- **🚀 Performance optimizada** - First Load JS ~95 kB, imágenes optimizadas con `next/image`
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
| Icons      | Material Symbols               |
| Linting    | ESLint 9 + eslint-config-next  |

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/YukaC/PortfolioReact.git
cd PortfolioReact

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Scripts Disponibles

| Comando         | Descripción                   |
| --------------- | ----------------------------- |
| `npm run dev`   | Inicia servidor de desarrollo |
| `npm run build` | Genera build de producción    |
| `npm run start` | Ejecuta build de producción   |
| `npm run lint`  | Ejecuta ESLint                |

## 📁 Estructura del Proyecto

```
PortfolioReact/
├── components/          # Componentes React reutilizables
│   ├── Layout.jsx       # Layout principal con SEO
│   ├── Navbar.jsx       # Navegación con scroll smooth
│   ├── HeroSection.jsx  # Sección hero con imagen y terminal
│   ├── SkillsTicker.jsx # Ticker animado de tecnologías
│   ├── ProjectsGrid.jsx # Grid de proyectos
│   ├── Experience.jsx   # Timeline de experiencia
│   ├── Footer.jsx       # Footer con Easter egg
│   └── BebopAnimation.jsx # Animación Cowboy Bebop
├── src/
│   ├── pages/           # Páginas Next.js
│   ├── styles/          # CSS global con Tailwind
│   └── data/            # Datos estáticos (constants.js)
├── public/              # Assets estáticos
└── package.json         # Dependencias y scripts
```

## 🌐 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

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
- **npm** 9+

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
