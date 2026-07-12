import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import SkillsTicker from "@/components/SkillsTicker";

const sectionSkeleton = (minHeight) => (
  <div
    className="w-full px-6 py-24 animate-pulse"
    style={{ minHeight }}
    aria-hidden="true"
  />
);

const ProjectsGrid = dynamic(() => import("@/components/ProjectsGrid"), {
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

export default function Index() {
  return (
    <Layout title="Agustin Ciucani | Fullstack Developer">
      <HeroSection />
      <SkillsTicker />
      <ProjectsGrid />
      <Experience />
      <Contact />
    </Layout>
  );
}
