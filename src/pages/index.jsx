import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import Marquee from "@/components/Marquee";
import { fetchPinnedProjects } from "@/lib/fetch-pinned-projects";

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

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: true,
  loading: () => sectionSkeleton("24rem"),
});

const Contact = dynamic(() => import("@/components/Contact"), {
  ssr: true,
  loading: () => sectionSkeleton("20rem"),
});

/** Revalidate pinned projects hourly (ISR). */
export async function getStaticProps() {
  const projects = await fetchPinnedProjects();

  return {
    props: { projects },
    revalidate: 3600,
  };
}

export default function Index({ projects }) {
  return (
    <Layout projects={projects}>
      <HeroSection />
      <Marquee />
      <WorkList projects={projects} />
      <Experience />
      <Contact />
    </Layout>
  );
}
