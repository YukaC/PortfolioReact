import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import {
  PERSON_JOB_TITLE,
  PERSON_LOCALITY,
  SITE_NAME,
  SKILLS,
  SOCIAL_LINKS,
} from "@/data/constants";
import { GITHUB_USERNAME } from "@/data/projects";

/** 16px blurred stand-in so the avatar surfaces from the field, not a box. */
const PROFILE_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACjlBMVEXx8PXw7/Tx7/bx8Pbz8ff9+//q5u23sbazrbLKxcv7+f/z8Pft6/Lt6/Hr6/Dq6fDy8fXy8Pfv7vSvqa1IPz4wJSMjGxk7MzOUjpLh3uXx7vXt6vHs6/Hy8fbw7/X8/f+lnJ8fExEQDAwYExMRDQ0QDAsIAQBRS0vv7PPs6fHr6vDz8vfy8ff+/f9yamsQBwVcPzeQZFVsRz1KMSsSCwhAOjrw7fTv7PTt6fHy8vj///9/e4BqSkD/0Lj/xa3pp43koopfPzVcV1n9+v/u6/Lz8vj9/f/Du77DloTDoJXWq5vhr5ypgHOWalykmJj49//u6/Ps6vHz8/j08vj29/7u0szDl4d+WU+ccGKZcGNgQjuPZ1vKqqTy8fju7PP08/j2+f/u0MnnsZzeqJXosJ7OloW8hnTBinfQq6T09f3v6/Pz8/f29f3x6u7wxrb1wrDWoZCoeWrIjnvHkn/bzs/19Pzt6vLr6vH18vnz9f3fvbLRmoSpcGWNV0+PXk6nf3Ln5Ovr6fH4+f/YysmzgG3cn429gHF7UEKsnJ39/P/q5+7x7/Xv7fPy8Pb//P/3+P/Xw8CxgW56WU9jRj51T0O2nZjo6PH/+//u7fPn5u7o5+7w7vX8+f739fq/vshSWHGjf3b8wKOsf295Uke0f2ytd2JGQlGZmqjk4er29Pvr6PD29fuzs8FWWXEiJT8ZID1bUV3uuaDqsJfFi3TNk3qAYFkRFSsSFSs2OE2IiZnX1t9qboMjKUcdIjwpLUcxNlEgKENPRlSQcW2PbmlbSk8bHzQhJj0jJz0dIjoYHTc4O1IzOlUpLkogJDooLEcrMEsrL0keJkEVHTcXHjYWHTYiJj4fIzsiKEAkKUEcITjvs/CJAAABG0lEQVQY0wEQAe/+AAABAgMEBQYHCAkKCwwNDg8AEAARBBITFBUWFxgZGhscDwAdHR4fICEiIyQlJicaKCkqACssAy0uLzAxMjM0NTY3OCkAKzkeOjs8PT4/QEFCQxtEOABFRQRGR0hJSktMTU5PG1BRAFJSU1RVVldYWVpbXF1eUCkAX0VTYGFiY2RlZmdoaWpQUQBSa0VsbW5vcHFyc3R1RHZ3AEVFUnh5ent8fX5/gBEodoEABCxFEoKDhIWGh4iJilBRDwCLjI2Oj5CRkpOUlZaXmJmaAJucnZ6foKGio6SlpqeoqaoAq6ytrq+wsbKztLW2t7i5ugC7vL2+v8DBwsPExcbHyMnKAMvMzc7P0NHS09TG1dbX2Nn+H2RDDsWRswAAAABJRU5ErkJggg==";

const MAX_TILT_DEG = 6;

const reduceMotionQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

function subscribeReduceMotion(onChange) {
  reduceMotionQuery?.addEventListener("change", onChange);
  return () => reduceMotionQuery?.removeEventListener("change", onChange);
}

function getReduceMotionSnapshot() {
  return reduceMotionQuery?.matches ?? false;
}

function getReduceMotionServerSnapshot() {
  return false;
}

/**
 * ProfileCard - hero identity card.
 *
 * React Bits SpotlightCard + ProfileCard adapted to the glass system: the
 * frosted `.glass-card` surface stays, an ice spotlight follows the pointer
 * with a subtle tilt, and the card flips to a stack face. All of it is
 * decorative; under reduced motion the card sits still and the flip is
 * instant.
 */
const ProfileCard = () => {
  const cardRef = useRef(null);
  const frameRef = useRef(0);
  const pointerRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotionSnapshot,
    getReduceMotionServerSnapshot,
  );

  const applyPointer = useCallback(() => {
    frameRef.current = 0;
    const card = cardRef.current;
    const event = pointerRef.current;
    if (!card || !event) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    card.style.setProperty("--spot-x", `${x}px`);
    card.style.setProperty("--spot-y", `${y}px`);

    const tiltX = (1 - (y / rect.height) * 2) * MAX_TILT_DEG;
    const tiltY = ((x / rect.width) * 2 - 1) * MAX_TILT_DEG;
    card.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
  }, []);

  const handlePointerMove = (event) => {
    if (reduceMotion) return;
    pointerRef.current = event;
    cardRef.current?.classList.add("is-live");
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(applyPointer);
  };

  const handlePointerLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove("is-live");
    card.style.transform = "";
    pointerRef.current = null;
  };

  const handleFlip = () => {
    setIsFlipped((flipped) => !flipped);
  };

  return (
    <div className="profile-stage mx-auto w-full max-w-sm lg:mx-0 lg:ml-auto">
      <div
        ref={cardRef}
        className={`profile-card glass-card${isFlipped ? " is-flipped" : ""}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="profile-card-inner">
          <div className="profile-face flex flex-col items-center gap-4 p-6 text-center md:p-8 lg:p-10">
            <Image
              src="/profile-hero.webp"
              alt={`${SITE_NAME} profile photo`}
              width={640}
              height={640}
              quality={70}
              priority
              placeholder="blur"
              blurDataURL={PROFILE_BLUR}
              sizes="128px"
              className="profile-avatar h-24 w-24 rounded-full object-cover"
            />

            <div className="flex flex-col items-center gap-1">
              <p className="font-heading text-xl text-white sm:text-2xl">
                {SITE_NAME}
              </p>
              <p className="text-sm text-white/75">{PERSON_JOB_TITLE}</p>
              <p className="text-sm text-white/55">
                {PERSON_LOCALITY}, Argentina
              </p>
            </div>

            <div
              className="glass-nest flex items-center gap-1 p-1"
              role="group"
              aria-label="Social media links"
            >
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.platform}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-icon focus-ring"
                  aria-label={`${link.name} (opens in a new tab)`}
                >
                  <Icon name={link.platform} size={18} />
                </a>
              ))}
            </div>

            <a
              href={`https://github.com/${GITHUB_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline focus-ring inline-flex items-center gap-1.5 rounded-sm text-sm text-white/75 hover:text-white"
            >
              github.com/{GITHUB_USERNAME}
              <span className="sr-only"> (opens in a new tab)</span>
              <Icon name="arrow_forward" size={12} />
            </a>

            <button
              type="button"
              tabIndex={isFlipped ? -1 : 0}
              className="btn-icon focus-ring absolute right-3 top-3"
              onClick={handleFlip}
              aria-pressed={isFlipped}
              aria-label="Show the stack"
            >
              <Icon name="code" size={16} />
            </button>
          </div>

          <div
            className="profile-face profile-face-back flex flex-col items-center gap-4 p-6 text-center md:p-8 lg:p-10"
            aria-hidden={isFlipped ? undefined : "true"}
          >
            <h3 className="sr-only">Stack</h3>

            <ul className="flex flex-wrap items-center justify-center gap-2">
              {SKILLS.map((skill) => (
                <li key={skill.name} className="profile-chip">
                  <Icon name={skill.icon} size={14} className="text-white/75" />
                  {skill.name}
                </li>
              ))}
            </ul>

            <p className="max-w-[26ch] text-sm leading-relaxed text-white/75">
              Open to freelance and full-time work.
            </p>

            <button
              type="button"
              tabIndex={isFlipped ? 0 : -1}
              className="btn-icon focus-ring"
              onClick={handleFlip}
              aria-label="Show the profile"
            >
              <Icon name="arrow_back" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
