import Navbar from "./navbar";
import Head from "next/head";

const Layout = ({ children, title, description }) => (
  <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://yourwebsite.com" />
      <meta property="og:image" content="/path-to-image.jpg" />
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <div role="document" className="w-full max-w-6xl mx-auto px-4">
      <Navbar />
      <main className="flex flex-col items-center py-0 text-start w-full">
        {children}
      </main>
    </div>
  </>
);

export default Layout;

Layout.defaultProps = {
  title: "Agustin Ciucani | Portfolio",
  description:
    "Bienvenido a mi portafolio web, donde muestro mis proyectos y habilidades.",
};
