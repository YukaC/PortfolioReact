import Navbar from "./navbar";
import Head from "next/head";

const Layout = ({ children, title, description }) => (
  <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
      <div className="absolute inset-0 scale-105 bg-center bg-cover filter blur-sm bg-main"></div>
      <div className="absolute flex flex-col items-center my-1 inset-10">
        <Navbar />

        <main className="container py-4">{children}</main>
      </div>
  </>
);

export default Layout;

Layout.defaultProps = {
  title: "Agustin Ciucani | Portfolio",
  description:
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro, voluptatem non earum praesentium eum numquam",
};
