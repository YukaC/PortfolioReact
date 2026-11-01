"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SwapArrow from "@/components/SwapArrow";
import { WORK_FILTERS } from "@/data/projects";
import { useT } from "@/i18n/LocaleProvider";
import { prefersReducedMotion, hasFinePointer } from "@/motion/prefersReducedMotion";
import { gsap, registerMotion } from "@/motion/register";

const PREVIEW_WIDTH = 320;
const PREVIEW_GAP = 60;
const PREVIEW_MARGIN = 40;

/**
 * The filter row, the pointer choreography and the floating preview — the only
 * part of the work list that needs a script (audit.md §16.2).
 *
 * The rows arrive as already-rendered elements (`rows: [{ key, categories,
 * element }]`) and the preview covers as `previewLayers`, both built by the
 * `WorkList` Server Component. That is the seam that lets the section ship its
 * copy in the HTML: this island decides *which* rows are on screen, never what
 * they say.
 *
 * What it keeps from the version that owned the rows:
 *   • the tabs are `js-only` — without a script the list is already complete, so
 *     a filter row would be a control that cannot answer (audit.md §10 P1-7);
 *   • `key={filter}` remounts the `<ul>`, which is what replays the row entrance
 *     for the new set;
 *   • one pointer listener on the list, one rAF, and the preview only reads its
 *     rect when the pointer actually travels.
 */
const WorkFilters = ({ rows, previewLayers = [] }) => {
  const { t } = useT();
  const [filter, setFilter] = useState("all");

  const tabsRef = useRef(null);
  const tabIndicatorRef = useRef(null);
  const listRef = useRef(null);
  const previewRef = useRef(null);

  const visible = useMemo(
    () =>
      rows.filter(
        (row) => filter === "all" || row.categories.includes(filter),
      ),
    [rows, filter],
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
    <>
      <div
        className="work-tabs js-only"
        ref={tabsRef}
        data-r=""
        role="group"
        aria-label={t("work.filterLabel")}
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
            {t(`work.filters.${option.id}`)}
          </button>
        ))}
      </div>

      {/* The live region outlives the list: `key={filter}` remounts the rows,
          and a region swapped out with its own content announces nothing. */}
      <div aria-live="polite">
        <ul className="work-list" ref={listRef} key={filter}>
          {visible.length > 0 ? (
            visible.map((row) => row.element)
          ) : (
            <li className="work-row">
              <span className="work-num">—</span>
              <p className="work-problem">{t("work.empty")}</p>
            </li>
          )}
        </ul>
      </div>

      <div className="work-preview glass" ref={previewRef} aria-hidden="true">
        {previewLayers}
        <span className="work-preview-tag">
          {t("work.viewDemo")}
          <SwapArrow direction="d" size={13} />
        </span>
      </div>
    </>
  );
};

export default WorkFilters;
