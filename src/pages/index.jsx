import Home from "@/components/Home";
import { fetchPinnedProjects } from "@/lib/fetch-pinned-projects";

/** English home: `/`. Also the destination of the middleware's x-default. */
export async function getStaticProps() {
  const projects = await fetchPinnedProjects();

  return {
    props: { projects, locale: "en" },
    revalidate: 3600,
  };
}

export default function Index(props) {
  return <Home {...props} />;
}
