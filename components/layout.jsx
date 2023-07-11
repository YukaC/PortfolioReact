import Navbar from "./navbar";
import Head from "next/head";

const Layout = ({ children, title, description }) => (
  <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
      
      <div className="w-11/12 mx-auto">
          <Navbar />
          <main className="flex flex-col items-center py-0 px-7 text-start">{children}</main>
      </div>
  </>
);

export default Layout;

Layout.defaultProps = {
  title: "Agustin Ciucani | Portfolio",
  description:
    "",
};
