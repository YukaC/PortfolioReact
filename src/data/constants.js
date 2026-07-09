/**
 * Static data for the portfolio.
 * Centralizing this data improves HMR performance and makes the site easier to maintain.
 */
import { bebopShipPhaseMs } from "./bebopShip";

export const SKILLS = [
  { name: "HTML5", icon: "html" },
  { name: "CSS3", icon: "css" },
  { name: "JavaScript", icon: "javascript" },
  { name: "React", icon: "deployed_code" },
  { name: "Tailwind", icon: "style" },
  { name: "Python", icon: "code" },
  { name: "MySQL", icon: "database" },
  { name: "Git", icon: "account_tree" },
];

export const EDUCATION = [
  {
    period: "2024 - 2025",
    title: "University Technician in Programming Technologies",
    company: "Universidad Provincial del Sudoeste (UPSO)",
    description:
      "Training in software development, databases, agile methodologies, and programming best practices.",
    isCurrent: true,
  },
  {
    period: "2014 - 2020",
    title: "Personal and Professional Computer Technician",
    company: "EEST N°1 / Instituto San José",
    description:
      "Fundamentals of programming, networking, hardware, and technical support.",
    isCurrent: false,
  },
];

export const ANIMATION_PHASES = {
  IDLE: "IDLE",
  CRT_ON: "CRT_ON",
  COUNTDOWN_3: "COUNTDOWN_3",
  COUNTDOWN_2: "COUNTDOWN_2",
  COUNTDOWN_1: "COUNTDOWN_1",
  JAM: "JAM",
  FADE_TO_BLACK: "FADE_TO_BLACK",
  SHIP: "SHIP",
  ENDCARD: "ENDCARD",
  CRT_OFF: "CRT_OFF",
};

/** Durations in ms — ship timing from src/data/bebopShip.js */
export const PHASE_TIMINGS = {
  CRT_ON: 500, // crtPowerOn 0.5s
  COUNTDOWN: 500, // countdownPulse 0.5s
  JAM: 800, // typewriter 0.8s
  FADE: 400, // fadeOut 0.4s
  SHIP: bebopShipPhaseMs(),
  ENDCARD: 350, // ship fadeOut 0.35s overlaps before CRT off (V33)
  CRT_OFF: 600, // crtPowerOff 0.6s
};

export const SOCIAL_LINKS = [
  {
    name: "GitHub",
    href: "https://github.com/YukaC",
    platform: "github",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/agust%C3%ADn-ciucani/",
    platform: "linkedin",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/agus.yuk/",
    platform: "instagram",
  },
];

export const NAV_LINKS = [
  { name: "Projects", href: "#portfolio" },
  { name: "Experience", href: "#experience" },
  { name: "About", href: "#about" },
];
