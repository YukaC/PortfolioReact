import Navbar from "./Navbar";
import Head from "next/head";

const Layout = ({
  children,
  title = "Agustin Ciucani | Frontend Developer",
  description = "Desarrollador Front-End especializado en React y Tailwind CSS. Portfolio profesional con proyectos web.",
}) => (
  <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://agustinciucani.dev" />
      <meta property="og:image" content="/profilePic.jpg" />
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <div
      role="document"
      className="min-h-screen bg-bg-main jazz-gradient transition-colors duration-300"
    >
      <Navbar />
      <main className="w-full flex flex-col items-center">{children}</main>
    </div>
  </>
);

export default Layout;
