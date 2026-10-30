import Home from "@/components/Home";
import { fetchPinnedProjects } from "@/lib/fetch-pinned-projects";

/**
 * Spanish home: `/es`.
 *
 * Prerendered like the English one, so the middleware can rewrite `/` here and
 * the visitor receives Spanish HTML on the first byte (no client-side swap).
 */
export async function getStaticProps() {
  const projects = await fetchPinnedProjects();

  return {
    props: { projects, locale: "es" },
    revalidate: 3600,
  };
}

export default function SpanishHome(props) {
  return <Home {...props} />;
}
