import Navbar from "./Navbar";
import Footer from "./Footer";
import Head from "next/head";

const SITE_URL = "https://agustinciucani.dev";

const Layout = ({
  children,
  title = "Agustin Ciucani | Fullstack Developer",
  description = "Desarrollador Front-End especializado en React y Tailwind CSS. Portfolio profesional con proyectos web.",
}) => (
  <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={SITE_URL} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta
        property="og:image"
        content={`${SITE_URL}/profilePic.webp`}
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta
        name="twitter:image"
        content={`${SITE_URL}/profilePic.webp`}
      />
      <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
      <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
      <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=2" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
      <link rel="manifest" href="/site.webmanifest" />
      <meta name="theme-color" content="#584668" />
    </Head>

    <div className="min-h-screen bg-bg-main jazz-gradient transition-colors duration-300">
      <Navbar />
      <main className="w-full flex flex-col items-center px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      {/* Sibling of main — full-bleed like Navbar (not clipped by main padding) */}
      <Footer />
    </div>
  </>
);

export default Layout;
