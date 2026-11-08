/**
 * Static data for the portfolio.
 * Centralizing this data improves HMR performance and makes the site easier to maintain.
 */

export const SITE_URL = "https://ciucani.vercel.app";
export const SITE_NAME = "Agustín Ciucani";
export const SITE_TITLE = "Agustín Ciucani, Full-stack Developer in Buenos Aires";
export const SITE_DESCRIPTION =
  "Agustín Ciucani is a full-stack developer in Buenos Aires, Argentina. He builds React and Next.js products with accessible UI and motion that settles.";
export const CONTACT_EMAIL = "agusyuk25@gmail.com";
export const PERSON_JOB_TITLE = "Full-stack developer";
export const PERSON_LOCALITY = "Buenos Aires";
export const PERSON_REGION = "AR-C";
export const PERSON_COUNTRY = "AR";

/**
 * The About section's chips, and the tools the FAQ and the `knowsAbout` list
 * publish: one vocabulary, so the visible row and the graph cannot disagree.
 */
export const SKILLS = [
  { name: "React", icon: "deployed_code" },
  { name: "Next.js", icon: "deployed_code" },
  { name: "TypeScript", icon: "javascript" },
  { name: "Tailwind", icon: "style" },
  { name: "Node", icon: "code" },
  { name: "Python", icon: "code" },
  { name: "PostgreSQL", icon: "database" },
  { name: "Git", icon: "account_tree" },
];

/**
 * The hero's first tag row and the marquee's outline track. Technology names
 * are not copy — they read the same in every language — so the list lives here
 * instead of in the three dictionaries, and both band rows read this one array.
 *
 * The row has to fit the hero column on one line at `wide`, so it carries the
 * six names the site actually leads with; TypeScript and Flask stay in `SKILLS`
 * and in the projects' own tag rows, where there is no single-line budget.
 */
export const TECH_TAGS = [
  "React",
  "Next.js",
  "Tailwind",
  "Node",
  "Python",
  "PostgreSQL",
];

/**
 * The training, for the JSON-LD graph (`educationProgrammes`) and `llms.txt`.
 *
 * What the timeline renders is `about.education` in the locale dictionary — same
 * four entries, the period with its en dash, and no detail line for the last
 * one. This array is the machine copy: the periods stay ASCII so
 * `educationProgrammes` can split the range into `startDate` and `endDate`, and
 * the fourth entry keeps an empty description because a graph node may not carry
 * `undefined` (it would not survive the JSON round trip the page publishes).
 */
export const EDUCATION = [
  {
    period: "2024 - 2025",
    title: "University Technician in Programming Technologies",
    company: "Universidad Provincial del Sudoeste (UPSO)",
    description: "Software development, databases and agile methods.",
  },
  {
    period: "2021 - 2022",
    title: "University Technician in Programming (a year and a half completed)",
    company:
      "Universidad Tecnológica Nacional, Facultad Regional Bahía Blanca (UTN FRBB)",
    description: "First stage of the degree, which I finished at the UPSO.",
  },
  {
    period: "2018 - 2020",
    title: "Personal and Professional Computer Technician",
    company: "Instituto San José",
    description: "Programming, networking, hardware and support.",
  },
  {
    period: "2014 - 2017",
    title: "Electronics",
    company: "EEST N°1",
    description: "",
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
    href: "https://www.linkedin.com/in/agustin-ciucani",
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
