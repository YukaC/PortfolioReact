import Home from "@/components/Home";
import { fetchPinnedProjects } from "@/lib/fetch-pinned-projects";

/** Portuguese home: `/pt`, prerendered with its own copy and `<html lang>`. */
export async function getStaticProps() {
  const projects = await fetchPinnedProjects();

  return {
    props: { projects, locale: "pt" },
    revalidate: 3600,
  };
}

export default function PortugueseHome(props) {
  return <Home {...props} />;
}
