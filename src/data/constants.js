/**
 * Static data for the portfolio.
 * Centralizing this data improves HMR performance and makes the site easier to maintain.
 */

export const SITE_URL = "https://agustinciucani.dev";
export const SITE_NAME = "Agustin Ciucani";
export const SITE_TITLE = "Agustin Ciucani, Full-stack Developer in Buenos Aires";
export const SITE_DESCRIPTION =
  "Agustin Ciucani is a full-stack developer in Buenos Aires, Argentina. He builds React and Next.js products with accessible UI and motion that settles.";
export const CONTACT_EMAIL = "agusyuk25@gmail.com";
export const PERSON_JOB_TITLE = "Full-stack developer";
export const PERSON_LOCALITY = "Buenos Aires";
export const PERSON_REGION = "AR-C";
export const PERSON_COUNTRY = "AR";

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
  },
  {
    period: "2014 - 2020",
    title: "Personal and Professional Computer Technician",
    company: "EEST N°1 / Instituto San José",
    description:
      "Fundamentals of programming, networking, hardware, and technical support.",
  },
];

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
  { name: "About", href: "#about" },
];
