import { useMemo } from "react";

/**
 * Heading that arrives word by word.
 *
 * Each word sits in a clipping box (`.w`) and slides up from below with a 70ms
 * stagger; `accent` names the word that carries the sky emphasis, so the
 * emphasis survives the split. The heading keeps the plain sentence as its
 * accessible name and the words stay in the DOM for search. The reveal trigger
 * is the page-wide `[data-r]` observer.
 *
 * `parallax` gives every word its own slow travel against the scroll, which is
 * what makes the hero title move in layers rather than as one block.
 */
const SplitHeading = ({
  as: Tag = "h2",
  text,
  accent = "",
  className = "",
  delayMs = 0,
  parallax = false,
  ...rest
}) => {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const accentWords = useMemo(
    () => new Set(accent.split(/\s+/).filter(Boolean)),
    [accent],
  );

  return (
    <Tag
      data-r=""
      aria-label={text}
      style={{ "--d": `${delayMs}ms` }}
      className={className}
      {...rest}
    >
      {words.map((word, index) => {
        const box = (
          <span
            className="w"
            aria-hidden="true"
            style={
              parallax ? { "--k": (-0.014 * (index + 1)).toFixed(3) } : undefined
            }
          >
            <span style={{ "--i": index }}>{word}</span>
          </span>
        );

        return (
          <span key={`${word}-${index}`}>
            {accentWords.has(word) ? <em className="accent">{box}</em> : box}
            {index < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </Tag>
  );
};

export default SplitHeading;
