import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import SkillsTicker from "@/components/SkillsTicker";
import ProjectsGrid from "@/components/ProjectsGrid";
import Experience from "@/components/Experience";
import Footer from "@/components/Footer";

const Index = () => (
  <Layout title="Agustin Ciucani | Fullstack Developer">
    {/* Hero Section */}
    <HeroSection />

    {/* Skills Ticker */}
    <SkillsTicker />

    {/* Projects Section */}
    <ProjectsGrid />

    {/* Experience & About Section */}
    <Experience />

    {/* Contact Section */}
    <section
      id="contact"
      className="w-full max-w-[900px] px-6 py-24 lg:py-32 text-center"
    >
      <h2 className="font-heading font-bold text-4xl sm:text-5xl mb-6">
        Ready for a late-night session?
      </h2>

      <p className="text-lg text-text-muted mb-10 max-w-2xl mx-auto">
        I’m seeking new opportunities to work on exciting projects. Whether
        it&apos;s freelance or a full-time role, let&apos;s build something
        amazing together!
      </p>

      <a
        href="mailto:agusyuk25@gmail.com"
        className="btnPrimary text-lg px-8 py-3 shadow-xl shadow-primary/10"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          music_note
        </span>
        Start the Collaboration
      </a>
    </section>

    {/* Footer */}
    <Footer />
  </Layout>
);

export default function HomePage() {
  return <Index />;
}
