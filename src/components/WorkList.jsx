import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import SwapArrow from "@/components/SwapArrow";
import {
  GITHUB_USERNAME,
  MAX_PINNED_PROJECTS,
  PINNED_FALLBACK,
  WORK_FILTERS,
  projectCategories,
  projectMonogram,
} from "@/data/projects";
import { prefersReducedMotion, hasFinePointer } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";

const COVER_BLUR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9">
      <rect width="100%" height="100%" fill="#0e1830"/>
    </svg>`,
  );

const PREVIEW_WIDTH = 320;
const PREVIEW_GAP = 60;
const PREVIEW_MARGIN = 40;

/**
 * Cover art for a project: its screenshot when there is one, otherwise a
 * generated haze with the project's monogram (the reference's placeholder,
 * keyed to the index so the list has variety without inventing assets).
 */
const ProjectCover = memo(({ project, index, sizes }) => {
  if (project.imgSrc) {
    return (
      <Image
        src={project.imgSrc}
        alt=""
        fill
        quality={70}
        loading="lazy"
        sizes={sizes}
        placeholder="blur"
        blurDataURL={COVER_BLUR}
        className="object-cover"
      />
    );
  }

  return (
    <div className="work-art" style={{ "--h": (index * 47 + 205) % 360 }}>
      <span className="font-serif text-[clamp(4rem,9vw,7rem)] italic text-white/90">
        {projectMonogram(project)}
      </span>
    </div>
  );
});

ProjectCover.displayName = "ProjectCover";

/**
 * WorkList - selected work as a filtered list.
 *
 * Rows are the reference's: index, title, problem, tags and a circular arrow.
 * On a fine pointer the list dims its siblings, lights the row under the
 * cursor and floats a glass preview of that project's cover; on touch the cover
 * rides inline above each row instead.
 */
const WorkList = ({ projects = PINNED_FALLBACK }) => {
  const items = useMemo(
    () => projects.slice(0, MAX_PINNED_PROJECTS),
    [projects],
  );
  const [filter, setFilter] = useState("all");

  const tabsRef = useRef(null);
  const tabIndicatorRef = useRef(null);
  const listRef = useRef(null);
  const previewRef = useRef(null);

  const visible = useMemo(
    () =>
      items.filter(
        (project) =>
          filter === "all" || projectCategories(project).includes(filter),
      ),
    [items, filter],
  );

  const placeTabIndicator = useCallback(() => {
    const tabs = tabsRef.current;
    const indicator = tabIndicatorRef.current;
    if (!tabs || !indicator) return;
    const active = tabs.querySelector('[aria-pressed="true"]');
    if (!active) return;
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.translate = `${active.offsetLeft}px 0`;
  }, []);

  useEffect(() => {
    placeTabIndicator();
    window.addEventListener("resize", placeTabIndicator);
    if (document.fonts?.ready) document.fonts.ready.then(placeTabIndicator);
    return () => window.removeEventListener("resize", placeTabIndicator);
  }, [filter, placeTabIndicator]);

  useEffect(() => {
    const list = listRef.current;
    const preview = previewRef.current;
    if (!list || !preview) return undefined;
    if (window.innerWidth <= 900 || !hasFinePointer() || prefersReducedMotion()) {
      return undefined;
    }

    registerMotion();

    const xTo = gsap.quickTo(preview, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(preview, "y", { duration: 0.4, ease: "power3.out" });
    const rotateTo = gsap.quickTo(preview, "rotation", {
      duration: 0.3,
      ease: "power3.out",
    });

    let isShown = false;
    let lastX = 0;
    let rotateTimer = 0;

    const hide = () => {
      if (!isShown) return;
      isShown = false;
      preview.classList.remove("is-on");
      gsap.to(preview, { scale: 0.92, duration: 0.25, ease: "power2.out" });
    };

    const onPointerMove = (event) => {
      const row = event.target.closest?.("[data-work-row]");
      if (!row) {
        hide();
        return;
      }

      const bounds = row.getBoundingClientRect();
      row.style.setProperty("--rx", `${event.clientX - bounds.left}px`);
      row.style.setProperty("--ry", `${event.clientY - bounds.top}px`);

      const key = row.dataset.workKey;
      preview.querySelectorAll("[data-preview-key]").forEach((layer) => {
        layer.classList.toggle("is-on", layer.dataset.previewKey === key);
      });

      const listBounds = list.getBoundingClientRect();
      const maxX = listBounds.right - PREVIEW_WIDTH - PREVIEW_MARGIN;
      const x = Math.min(
        Math.max(maxX, event.clientX + PREVIEW_GAP),
        listBounds.right - PREVIEW_MARGIN * 0.5 - PREVIEW_WIDTH * 0.8,
      );
      const y = event.clientY - PREVIEW_WIDTH * 0.3;

      if (!isShown) {
        isShown = true;
        preview.classList.add("is-on");
        gsap.set(preview, { x, y, scale: 1 });
        gsap.to(preview, { scale: 1, duration: 0.3, ease: "power2.out" });
        lastX = event.clientX;
        return;
      }

      const tilt = Math.min(9, Math.max(-9, (event.clientX - lastX) * 0.5));
      lastX = event.clientX;
      xTo(x);
      yTo(y);
      rotateTo(tilt);
      window.clearTimeout(rotateTimer);
      rotateTimer = window.setTimeout(() => rotateTo(0), 80);
    };

    const onPointerLeave = () => hide();

    list.addEventListener("pointermove", onPointerMove, { passive: true });
    list.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.clearTimeout(rotateTimer);
      list.removeEventListener("pointermove", onPointerMove);
      list.removeEventListener("pointerleave", onPointerLeave);
      gsap.killTweensOf(preview);
    };
  }, []);

  return (
    <section
      id="portfolio"
      className="section-y w-full overflow-x-clip"
      aria-labelledby="work-heading"
    >
      <div className="site-shell">
        <div className="section-head">
          <div>
            <Reveal className="eyebrow">Selected work</Reveal>
            <SplitHeading
              as="h2"
              id="work-heading"
              text="Shipped for real use"
              accent="real"
              delayMs={80}
            />
          </div>
          <Reveal as="p" className="lead" delayMs={160}>
            Interfaces, dashboards, and tools. Source for each.
          </Reveal>
        </div>

        <div
          className="work-tabs"
          ref={tabsRef}
          data-r=""
          role="group"
          aria-label="Filter projects"
        >
          <i className="work-tab-ind" ref={tabIndicatorRef} aria-hidden="true" />
          {WORK_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="work-tab"
              data-work-tab=""
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <ul className="work-list" ref={listRef} key={filter}>
          {visible.length > 0 ? (
            visible.map((project, index) => (
              <li
                key={project.name ?? project.repoLink}
                className="work-row"
                data-work-row=""
                data-work-key={project.name ?? project.title}
                style={{ "--d": `${index * 90}ms` }}
              >
                <div className="work-thumb" aria-hidden="true">
                  <ProjectCover
                    project={project}
                    index={index}
                    sizes="(max-width: 900px) 100vw, 1px"
                  />
                </div>

                <span className="work-num">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="work-body">
                  <h3>{project.title}</h3>
                  <p className="work-problem">
                    {project.problem ?? project.description}
                  </p>
                  {project.tags?.length ? (
                    <p className="work-tags">{project.tags.join(" · ")}</p>
                  ) : null}
                </div>

                <span className="work-go" aria-hidden="true">
                  <SwapArrow direction="d" />
                </span>

                <a
                  className="work-hit focus-ring"
                  href={project.repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.title}, GitHub repository, opens in a new tab`}
                />
              </li>
            ))
          ) : (
            <li className="work-row">
              <span className="work-num">—</span>
              <p className="work-problem">Nothing here yet.</p>
            </li>
          )}
        </ul>

        <Reveal style={{ marginTop: "2.125rem" }}>
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn focus-ring"
          >
            GitHub profile
            <SwapArrow direction="d" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Reveal>
      </div>

      <div className="work-preview glass" ref={previewRef} aria-hidden="true">
        {items.map((project, index) => (
          <div
            key={project.name ?? project.repoLink}
            className="work-preview-layer"
            data-preview-key={project.name ?? project.title}
          >
            <ProjectCover project={project} index={index} sizes="320px" />
          </div>
        ))}
        <span className="work-preview-tag">
          View repository
          <SwapArrow direction="d" size={13} />
        </span>
      </div>
    </section>
  );
};

export default WorkList;
