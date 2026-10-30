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
 *
 * A `\n` in the copy is a line the designer asked for, not something the
 * available width gets to decide: the words on each side of it render in their
 * own block line, so the break holds at every viewport instead of moving as the
 * heading grows a line. The stagger index keeps counting across the break, so
 * the second line continues the first instead of restarting.
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
  // Each line carries its words with a stagger index that keeps counting across
  // the break, so the second line continues the first instead of restarting.
  const lines = useMemo(() => {
    const split = text
      .split("\n")
      .map((line) => line.split(/\s+/).filter(Boolean))
      .filter((words) => words.length > 0);
    const counts = split.map((words) => words.length);

    return split.map((words, lineIndex) => {
      // Words before this line, so the stagger keeps counting across the break
      // without mutating anything during render.
      const offset = counts
        .slice(0, lineIndex)
        .reduce((total, count) => total + count, 0);

      return words.map((word, column) => ({
        word,
        index: offset + column,
        last: column === words.length - 1,
      }));
    });
  }, [text]);

  // The accessible name reads as one sentence: a line break is layout, not
  // punctuation, so a screen reader should not pause for it.
  const label = useMemo(() => text.replace(/\s+/g, " ").trim(), [text]);

  // Punctuation is part of the sentence, not part of the word: `accent:
  // "software"` has to emphasise `software,` in the heading.
  const accentWords = useMemo(() => accentWordSet(accent), [accent]);

  return (
    <Tag
      data-r={reveal}
      aria-label={label}
      style={{ "--d": `${delayMs}ms` }}
      className={className}
      {...rest}
    >
      {lines.map((words, lineIndex) => (
        <span
          key={`line-${lineIndex}`}
          className={lines.length > 1 ? "hl" : undefined}
          aria-hidden="true"
        >
          {words.map(({ word, index, last }) => {
            const box = (
              <span
                className="w"
                style={
                  parallax
                    ? { "--k": (-0.014 * (index + 1)).toFixed(3) }
                    : undefined
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
                {last ? null : " "}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
};

export default SplitHeading;
