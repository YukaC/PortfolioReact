import Navbar from "./navbar";
import Head from "next/head";

const Layout = ({ children, title, description }) => (
  <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
      <div className="bg-[url(https://unsplash.it/1800/800?image=893)] bg-black/90 bg-center bg-cover bg-main bg-scroll">
      <div className="w-11/12 mx-auto">
        <div className="flex flex-col">
          <Navbar />

          <main className="px-10 py-0">{children}</main>
        </div>
      </div>
    </div>
  </>
);

export default Layout;

Layout.defaultProps = {
  title: "Agustin Ciucani | Portfolio",
  description:
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro, voluptatem non earum praesentium eum numquam",
};
