import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type CSSProperties,
} from 'react';

/**
 * TrueFocus — neon HUD "focus" reveal inspired by ReactBits' TrueFocus.
 *
 * Pure React + TypeScript. No GSAP, no Motion. Uses requestAnimationFrame
 * for a smooth cinematic timeline driven entirely by direct DOM mutation
 * (no per-frame re-renders).
 *
 * The wrapped text starts blurred and is brought into focus while an L-bracket
 * HUD frame assembles around it, glows, then fades away. The animation plays
 * once automatically on first viewport entry; clicking the element replays it.
 */

export interface TrueFocusSegment {
  text: string;
  style?: CSSProperties;
  className?: string;
}

export interface TrueFocusProps {
  /** Plain text mode. Use `segments` for styled sub-parts. */
  text?: string;
  /** Rich text mode: array of { text, style, className } segments. */
  segments?: TrueFocusSegment[];
  /** className applied to the wrapper span. */
  className?: string;
  /** Neon frame / glow color. */
  frameColor?: string;
  /** Initial blur radius in px. */
  blurAmount?: number;
  /** Frame assembly duration (ms). */
  frameDuration?: number;
  /** Blur-to-focus duration (ms). */
  blurDuration?: number;
  /** Hold-fully-focused duration (ms). */
  pauseDuration?: number;
  /** Frame fade-out duration (ms). */
  fadeDuration?: number;
  /** Padding around the text for the frame, in px. */
  framePadding?: number;
  /** Length of each corner bracket arm, in px. */
  cornerSize?: number;
  /** Corner bracket border thickness, in px. */
  cornerThickness?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function TrueFocus({
  text,
  segments,
  className = '',
  frameColor = '#FF00A8',
  blurAmount = 5,
  frameDuration = 500,
  blurDuration = 500,
  pauseDuration = 300,
  fadeDuration = 250,
  framePadding = 6,
  cornerSize = 22,
  cornerThickness = 2,
}: TrueFocusProps) {
  const segs = useMemo<TrueFocusSegment[]>(
    () => segments ?? [{ text: text ?? '' }],
    [text, segments],
  );

  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const cornersRef = useRef<(HTMLSpanElement | null)[]>([null, null, null, null]);
  const rafRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);
  const animatingRef = useRef(false);

  const runAnimation = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const textEl = textRef.current;
    const frameEl = frameRef.current;
    const corners = cornersRef.current;
    if (!textEl || !frameEl) {
      animatingRef.current = false;
      return;
    }

    const total = frameDuration + pauseDuration + fadeDuration;
    const focusStart = frameDuration; // blur done by here
    const fadeStart = frameDuration + pauseDuration;
    const start = performance.now();

    const tick = (now: number) => {
      const t = now - start;

      // Blur: 0 → blurDuration, blurAmount → 0
      const blurP = clamp01(t / blurDuration);
      const blur = blurAmount * (1 - easeInOutCubic(blurP));
      textEl.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';

      // Frame assembly: 0 → frameDuration
      const frameP = clamp01(t / frameDuration);
      const frameEase = easeOutCubic(frameP);
      const frameOpacity = frameEase;
      const cornerScale = 0.35 + 0.65 * frameEase;

      // Glow strength: ramps in during assembly, holds during pause, fades out
      let glow = 0;
      if (t < fadeStart) {
        glow = frameEase;
      } else {
        glow = 1 - clamp01((t - fadeStart) / fadeDuration);
      }

      frameEl.style.opacity = String(frameOpacity * (t < fadeStart ? 1 : 1 - clamp01((t - fadeStart) / fadeDuration)));
      // After fade starts, frame opacity drops
      const frameVis = t < fadeStart ? frameEase : frameEase * (1 - clamp01((t - fadeStart) / fadeDuration));
      frameEl.style.opacity = String(frameVis);

      const glowIntensity = 6 + 10 * glow;
      const glowAlpha = 0.5 * glow;
      for (const c of corners) {
        if (!c) continue;
        c.style.transform = `scale(${cornerScale.toFixed(3)})`;
        c.style.opacity = String(frameVis);
        c.style.boxShadow = `0 0 ${glowIntensity.toFixed(1)}px ${frameColor}${Math.round(glowAlpha * 255)
          .toString(16)
          .padStart(2, '0')}`;
      }

      if (t >= total) {
        textEl.style.filter = 'none';
        frameEl.style.opacity = '0';
        for (const c of corners) {
          if (c) {
            c.style.opacity = '0';
            c.style.boxShadow = 'none';
          }
        }
        animatingRef.current = false;
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [blurAmount, blurDuration, fadeDuration, frameColor, frameDuration, pauseDuration, cornerSize]);

  // One-shot viewport trigger
  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasAnimatedRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            obs.disconnect();
            runAnimation();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [runAnimation]);

  // Click replay
  const handleClick = useCallback(() => {
    runAnimation();
  }, [runAnimation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      animatingRef.current = false;
    };
  }, []);

  const cornerBase: CSSProperties = {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    transformOrigin: 'center',
    transform: 'scale(0.35)',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'none',
  };

  const cornerStyle = (pos: 0 | 1 | 2 | 3): CSSProperties => {
    const o = framePadding;
    const map: CSSProperties[] = [
      { top: -o, left: -o, borderTop: `${cornerThickness}px solid ${frameColor}`, borderLeft: `${cornerThickness}px solid ${frameColor}` },
      { top: -o, right: -o, borderTop: `${cornerThickness}px solid ${frameColor}`, borderRight: `${cornerThickness}px solid ${frameColor}` },
      { bottom: -o, left: -o, borderBottom: `${cornerThickness}px solid ${frameColor}`, borderLeft: `${cornerThickness}px solid ${frameColor}` },
      { bottom: -o, right: -o, borderBottom: `${cornerThickness}px solid ${frameColor}`, borderRight: `${cornerThickness}px solid ${frameColor}` },
    ];
    return { ...cornerBase, ...map[pos] };
  };

  return (
    <span
      ref={containerRef}
      className={className}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
    >
      <span
        ref={textRef}
        style={{ display: 'inline-block', filter: `blur(${blurAmount}px)` }}
      >
        {segs.map((s, i) => (
          <span key={i} className={s.className} style={s.style}>
            {s.text}
          </span>
        ))}
      </span>
      <span
        ref={frameRef}
        style={{
          position: 'absolute',
          inset: -framePadding,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <span ref={(el) => { cornersRef.current[0] = el; }} style={cornerStyle(0)} />
        <span ref={(el) => { cornersRef.current[1] = el; }} style={cornerStyle(1)} />
        <span ref={(el) => { cornersRef.current[2] = el; }} style={cornerStyle(2)} />
        <span ref={(el) => { cornersRef.current[3] = el; }} style={cornerStyle(3)} />
      </span>
    </span>
  );
}
