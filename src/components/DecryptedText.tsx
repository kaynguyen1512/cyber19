import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  type CSSProperties,
} from 'react';

/**
 * DecryptedText — hacker/glitch "decrypt" reveal.
 *
 * Pure React + TypeScript. No external animation libraries.
 *
 * The full text first scrambles for `maxIterations` frames, then characters
 * lock in left → right, one per frame. Spaces and line breaks are preserved
 * and never scrambled. The animation plays exactly once when the element
 * enters the viewport, then stays readable forever.
 *
 * Rich text is supported via `segments` (each with its own className); the
 * reveal pointer advances across the concatenated text so the whole heading
 * decrypts as one continuous stream.
 */

export interface DecryptedTextSegment {
  text: string;
  className?: string;
}

export interface DecryptedTextProps {
  /** Plain text mode. Use `segments` instead for styled sub-parts. */
  text?: string;
  /** Rich text mode: array of { text, className } segments. */
  segments?: DecryptedTextSegment[];
  /** Scramble frame interval in ms (40–60 recommended). */
  speed?: number;
  /** Number of full-text scramble frames before left-to-right reveal begins. */
  maxIterations?: number;
  /** Character pool used while scrambling. */
  characters?: string;
  /** className applied to the wrapper span. */
  className?: string;
  /** className applied to still-encrypted characters. */
  encryptedClassName?: string;
  /** Inline style for the wrapper span. */
  style?: CSSProperties;
}

const DEFAULT_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+<>?/=';

const isPreserved = (ch: string) => ch === ' ' || ch === '\n' || ch === '\t';

export default function DecryptedText({
  text,
  segments,
  speed = 50,
  maxIterations = 8,
  characters = DEFAULT_CHARS,
  className = '',
  encryptedClassName = '',
  style,
}: DecryptedTextProps) {
  // ── Flatten segments into a token list: one entry per character ──────────
  const tokens = useMemo(() => {
    const segs: DecryptedTextSegment[] =
      segments ?? [{ text: text ?? '', className: undefined }];
    const out: { char: string; className: string }[] = [];
    for (const s of segs) {
      const cls = s.className ?? '';
      for (const ch of Array.from(s.text)) {
        out.push({ char: ch, className: cls });
      }
    }
    return out;
  }, [text, segments]);

  const length = tokens.length;

  // ── Random character pool ───────────────────────────────────────────────
  const pool = useMemo(() => Array.from(characters), [characters]);
  const randomChar = useCallback(() => {
    return pool[(Math.random() * pool.length) | 0];
  }, [pool]);

  // ── State ────────────────────────────────────────────────────────────────
  const [display, setDisplay] = useState<string[]>(() =>
    tokens.map((t) => (isPreserved(t.char) ? t.char : t.char)),
  );
  const [revealedCount, setRevealedCount] = useState(0);
  const [done, setDone] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLSpanElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  // ── Seed the display as fully scrambled whenever tokens change ───────────
  useEffect(() => {
    setDisplay(
      tokens.map((t) => (isPreserved(t.char) ? t.char : randomChar())),
    );
    setRevealedCount(0);
    setDone(false);
    startedRef.current = false;
  }, [tokens, randomChar]);

  // ── Viewport-triggered one-shot reveal ────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || length === 0) return;

    const begin = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      let frame = 0;
      intervalRef.current = setInterval(() => {
        frame += 1;

        if (frame <= maxIterations) {
          // Phase 1 — full scramble, preserve whitespace.
          setDisplay(
            tokens.map((t) =>
              isPreserved(t.char) ? t.char : randomChar(),
            ),
          );
          return;
        }

        // Phase 2 — lock characters left → right, one per frame.
        const revealUpTo = frame - maxIterations;
        if (revealUpTo >= length) {
          setDisplay(tokens.map((t) => t.char));
          setRevealedCount(length);
          setDone(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        setRevealedCount(revealUpTo);
        setDisplay(
          tokens.map((t, i) => {
            if (isPreserved(t.char)) return t.char;
            return i < revealUpTo ? t.char : randomChar();
          }),
        );
      }, speed);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            begin();
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tokens, length, maxIterations, speed, randomChar]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <span
      ref={containerRef}
      className={className}
      style={{ whiteSpace: 'pre-wrap', ...style }}
    >
      {tokens.map((t, i) => {
        const ch = display[i] ?? t.char;
        const revealed = done || i < revealedCount;
        const cls = revealed ? t.className : encryptedClassName;
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}
