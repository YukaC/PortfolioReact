import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import Marquee from "@/components/Marquee";
import { useT } from "@/i18n/LocaleProvider";
import { localizeProjects } from "@/lib/project-i18n";
import { useMemo } from "react";

const sectionSkeleton = (minHeight) => (
  <div
    className="w-full px-6 py-24 animate-pulse"
    style={{ minHeight }}
    aria-hidden="true"
  />
);

const WorkList = dynamic(() => import("@/components/WorkList"), {
  ssr: true,
  loading: () => sectionSkeleton("28rem"),
});

const About = dynamic(() => import("@/components/About"), {
  ssr: true,
  loading: () => sectionSkeleton("24rem"),
});

const Contact = dynamic(() => import("@/components/Contact"), {
  ssr: true,
  loading: () => sectionSkeleton("20rem"),
});

/**
 * Home - one composition, rendered once per language.
 *
 * `/`, `/es` and `/pt` all render this component with their own `locale` prop,
 * so the copy is decided at build time (ISR) and the served HTML is already in
 * the reader's language. Project copy is localized from the same locale, which
 * is why the client render matches the server one byte for byte.
 */
const Home = ({ projects = [] }) => {
  const { locale } = useT();
  const localizedProjects = useMemo(
    () => localizeProjects(projects, locale),
    [projects, locale],
  );

  return (
    <Layout projects={localizedProjects}>
      <HeroSection />
      <Marquee />
      <WorkList projects={localizedProjects} />
      <About />
      <Contact />
    </Layout>
  );
};

export default Home;
