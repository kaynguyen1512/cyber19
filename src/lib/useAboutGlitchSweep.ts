import { useEffect } from 'react';
import gsap from 'gsap';

/**
 * About section — premium ambient "signal interference" sweep.
 *
 * A thin horizontal band (4–8px) travels vertically through the section,
 * briefly corrupting only the pixels it passes over. After a long random
 * idle (6–10s) it reappears from a new random position. Everything outside
 * the band stays perfectly stable.
 *
 * Only transform / opacity are written — no layout, no rerenders, GPU-friendly.
 */
export function useAboutGlitchSweep(
  sectionRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const band = section.querySelector<HTMLElement>('.ab-glitch');
    if (!band) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      gsap.set(band, { opacity: 0 });
      return;
    }

    let killed = false;

    const measure = () => section.offsetHeight;
    const rnd = (min: number, max: number) => min + Math.random() * (max - min);

    // One sweep: fade in, travel a random span, fade out.
    const sweep = () => {
      if (killed) return;

      const h = measure();
      // Band height varies 4–8px per sweep for organic feel.
      const bh = rnd(4, 8);
      band.style.height = `${bh}px`;

      // Random vertical travel span — sometimes full, sometimes partial.
      const span = rnd(0.45, 1) * h;
      // Start somewhere above the section so it enters cleanly.
      const startY = rnd(-40, h * 0.25);
      const endY = startY + span + rnd(40, 120);

      // Duration 0.3–0.6s.
      const dur = rnd(0.3, 0.6);

      gsap.set(band, { y: startY, opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          if (killed) return;
          // Long random pause, then sweep again.
          gsap.delayedCall(rnd(6, 10), sweep);
        },
      });

      tl.to(band, { opacity: 1, duration: 0.08, ease: 'power2.out' })
        .to(band, { y: endY, duration: dur, ease: 'power1.inOut' }, '<')
        .to(band, { opacity: 0, duration: 0.12, ease: 'power2.in' }, '-=0.12');
    };

    // First sweep after a short delay.
    gsap.delayedCall(rnd(2, 5), sweep);

    return () => {
      killed = true;
      gsap.killTweensOf(band);
      gsap.globalTimeline.killTweensOf(band);
    };
  }, [sectionRef]);
}
