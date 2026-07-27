import { useEffect } from 'react';
import gsap from 'gsap';

/**
 * About section — CRT "signal scanner" glitch (no DOM cloning).
 *
 * A single horizontal band (~24px, soft falloff) travels top→bottom at
 * constant speed over ~5s, waits 8–12s, repeats. The band is NOT a clone of
 * the content — it is a thin overlay whose children use `backdrop-filter` to
 * sample and corrupt the REAL pixels behind them. Only the pixels under the
 * moving band are affected; everything else is untouched.
 *
 * Inside the band:
 *  - backdrop contrast / brightness / saturation boost
 *  - RGB split (cyan left, magenta right, ±8px) via tinted backdrop layers
 *  - horizontal tearing strips (1–4px, random 6–18px shifts)
 *  - fractal-noise overlay displaced by an SVG feTurbulence+feDisplacementMap
 *    whose scale animates 0 → strong → 0 only during a sweep
 *  - occasional 20–40ms white interference flash
 *
 * GSAP handles movement / timing / opacity / displacement scale only.
 * No React re-renders. Only transform / opacity / filter / SVG attrs animate.
 */
export function useAboutGlitchSweep(
  sectionRef: React.RefObject<HTMLElement | null>,
  scanRef: React.RefObject<HTMLDivElement | null>,
  stripsRef: React.RefObject<HTMLDivElement | null>,
  flashRef: React.RefObject<HTMLDivElement | null>,
  dispMapRef: React.RefObject<SVGElement | null>,
) {
  useEffect(() => {
    const section = sectionRef.current;
    const scan = scanRef.current;
    const strips = stripsRef.current;
    const flash = flashRef.current;
    const dispMap = dispMapRef.current as unknown as
      | SVGFEDisplacementMapElement
      | null;
    if (!section || !scan || !strips || !flash || !dispMap) return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce) {
      gsap.set(scan, { opacity: 0 });
      return;
    }

    const BAND = 24;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    let killed = false;

    // --- Lay out the tearing strips once (random heights/positions) --------
    const stripEls = Array.from(
      strips.children,
    ) as HTMLElement[];
    stripEls.forEach((el) => {
      const h = rnd(1, 4);
      el.style.height = `${h}px`;
      el.style.top = `${rnd(0, BAND - h)}px`;
      el.style.transform = 'translateX(0px)';
    });

    // --- One sweep ---------------------------------------------------------
    let lastTick = 0;
    let flashed = false;

    const sweep = () => {
      if (killed) return;
      const H = section.offsetHeight;

      gsap.set(scan, { y: -BAND, opacity: 0 });
      gsap.set(flash, { opacity: 0 });
      dispMap.setAttribute('scale', '0');
      flashed = false;

      const dispProxy = { scale: 0 };
      const setDisp = () =>
        dispMap.setAttribute('scale', dispProxy.scale.toFixed(1));

      const tick = () => {
        const now = performance.now();
        if (now - lastTick < 70) return;
        lastTick = now;
        // Random horizontal tearing — each strip shifts independently.
        for (const el of stripEls) {
          el.style.transform = `translateX(${rnd(-18, 18).toFixed(1)}px)`;
        }
        // Occasional tiny white interference flash, only mid-sweep.
        const progress = (gsap.getProperty(scan, 'y') as number) / H;
        if (
          !flashed &&
          progress > 0.25 &&
          progress < 0.75 &&
          Math.random() < 0.04
        ) {
          flashed = true;
          flash.style.opacity = '1';
          window.setTimeout(() => {
            if (!killed) flash.style.opacity = '0';
          }, rnd(20, 40));
        }
      };

      const tl = gsap.timeline({
        onComplete: () => {
          if (killed) return;
          gsap.delayedCall(rnd(8, 12), sweep);
        },
      });

      tl.to(scan, { opacity: 1, duration: 0.4, ease: 'power2.out' })
        .to(
          scan,
          { y: H, duration: 5, ease: 'none', onUpdate: tick },
          '<',
        )
        .to(scan, { opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.4')
        // SVG displacement scale: 0 → strong (horizontal) → 0, only during sweep.
        .to(
          dispProxy,
          { scale: 45, duration: 0.15, ease: 'power2.out', onUpdate: setDisp },
          '<',
        )
        .to(
          dispProxy,
          { scale: 0, duration: 0.45, ease: 'power2.in', onUpdate: setDisp },
          '-=0.5',
        );
    };

    gsap.delayedCall(rnd(2, 5), sweep);

    return () => {
      killed = true;
      gsap.killTweensOf(scan);
      gsap.killTweensOf(flash);
    };
  }, [sectionRef, scanRef, stripsRef, flashRef, dispMapRef]);
}
