import { useMemo } from "react";
import { accentWordSet, isAccentWord } from "@/lib/heading-accent";

/**
 * Heading that arrives word by word.
 *
 * Each word sits in a clipping box (`.w`) and slides up from below with a 70ms
 * stagger; `accent` names the word that carries the sky emphasis, so the
 * emphasis survives the split. The heading keeps the plain sentence as its
 * accessible name and the words stay in the DOM for search. The reveal trigger
 * is the page-wide `[data-r]` observer, or `reveal="paint"` for a heading that
 * must paint before it can be observed.
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
  reveal = "",
  ...rest
}) => {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  // Punctuation is part of the sentence, not part of the word: `accent:
  // "software"` has to emphasise `software,` in the heading.
  const accentWords = useMemo(() => accentWordSet(accent), [accent]);

  return (
    <Tag
      data-r={reveal}
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
            {isAccentWord(word, accentWords) ? (
              <em className="accent">{box}</em>
            ) : (
              box
            )}
            {index < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </Tag>
  );
};

export default SplitHeading;
