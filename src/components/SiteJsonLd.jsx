import Head from "next/head";
import {
  CONTACT_EMAIL,
  PERSON_COUNTRY,
  PERSON_JOB_TITLE,
  PERSON_LOCALITY,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
  SKILLS,
} from "@/data/constants";
import { MAX_PINNED_PROJECTS } from "@/data/projects";
import { useT } from "@/i18n/LocaleProvider";

const SiteJsonLd = ({ projects = [], locale = "en" }) => {
  const { t } = useT();
  const pinnedProjects = projects.slice(0, MAX_PINNED_PROJECTS);
  const personId = `${SITE_URL}/#person`;
  const websiteId = `${SITE_URL}/#website`;
  const webpageId = `${SITE_URL}/#webpage`;

  const graph = [
    {
      "@type": "Person",
      "@id": personId,
      name: SITE_NAME,
      jobTitle: PERSON_JOB_TITLE,
      url: SITE_URL,
      email: `mailto:${CONTACT_EMAIL}`,
      image: `${SITE_URL}/profile-hero.webp`,
      address: {
        "@type": "PostalAddress",
        addressLocality: PERSON_LOCALITY,
        addressCountry: PERSON_COUNTRY,
      },
      sameAs: SOCIAL_LINKS.map((link) => link.href),
      knowsAbout: SKILLS.map((skill) => skill.name),
      knowsLanguage: ["en", "es", "pt"],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: SITE_URL,
      name: `${SITE_NAME} portfolio`,
      description: SITE_DESCRIPTION,
      inLanguage: locale,
      publisher: { "@id": personId },
    },
    {
      "@type": "WebPage",
      "@id": webpageId,
      url: SITE_URL,
      name: `${SITE_NAME}, ${PERSON_JOB_TITLE} in ${PERSON_LOCALITY}`,
      description: SITE_DESCRIPTION,
      inLanguage: locale,
      isPartOf: { "@id": websiteId },
      about: { "@id": personId },
      primaryImageOfPage: `${SITE_URL}/profile-hero.webp`,
    },
  ];

  if (pinnedProjects.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${SITE_URL}/#work`,
      name: t("work.eyebrow"),
      numberOfItems: pinnedProjects.length,
      itemListElement: pinnedProjects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareSourceCode",
          name: project.title,
          description: project.description,
          url: project.repoLink,
          codeRepository: project.repoLink,
          author: { "@id": personId },
        },
      })),
    });
  }

  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  }).replace(/</g, "\\u003c");

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: json }}
      />
    </Head>
  );
};

export default SiteJsonLd;
