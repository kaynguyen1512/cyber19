import { useEffect } from 'react';
import gsap from 'gsap';

/**
 * About section — premium "signal scanner" glitch.
 *
 * A single horizontal band (≈22px, soft falloff) travels top→bottom through
 * the section at constant speed over 4–6s. Only the pixels inside the moving
 * band are corrupted: the real content is cloned into an overlay layer that
 * is revealed exclusively through a moving clip-path slice. The clone carries
 * RGB-split drop-shadows, a horizontal tearing jitter, a brightness lift and
 * a faint noise texture — so the glitch exists ONLY inside the band.
 *
 * Everything outside the band is untouched. No React re-renders; only
 * transform / opacity / clip-path / filter are animated. GPU-friendly.
 */
export function useAboutGlitchSweep(
  sectionRef: React.RefObject<HTMLElement | null>,
  cloneRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const section = sectionRef.current;
    const clone = cloneRef.current;
    const content = contentRef.current;
    if (!section || !clone || !content) return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce) return;

    // --- Build the duplicated layer once -----------------------------------
    const copy = content.cloneNode(true) as HTMLElement;
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    // Neutralise interactive/parallax bits in the clone so it stays aligned.
    copy.querySelectorAll('video').forEach((v) => {
      const vid = v as HTMLVideoElement;
      vid.muted = true;
      vid.preload = 'auto';
      try {
        vid.currentTime = 0;
      } catch {
        /* ignore */
      }
    });

    const inner = document.createElement('div');
    inner.className = 'ab-clone-inner';
    inner.appendChild(copy);

    const fx = document.createElement('div');
    fx.className = 'ab-clone-fx';

    const noise = document.createElement('div');
    noise.className = 'ab-clone-noise';

    clone.appendChild(inner);
    clone.appendChild(fx);
    clone.appendChild(noise);

    const BAND = 22; // px — within the 18–26 spec
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    let killed = false;

    // --- One sweep ---------------------------------------------------------
    const sweep = () => {
      if (killed) return;
      const H = section.offsetHeight;
      const dur = rnd(4, 6);

      const proxy = { y: -BAND };
      gsap.set(clone, { opacity: 0 });
      clone.style.clipPath = `inset(0px 0 ${H}px 0)`;
      fx.style.transform = `translateY(${-BAND}px)`;

      const tl = gsap.timeline({
        onComplete: () => {
          if (killed) return;
          gsap.delayedCall(rnd(8, 15), sweep);
        },
      });

      tl.to(clone, { opacity: 1, duration: 0.45, ease: 'power2.out' })
        .to(
          proxy,
          {
            y: H,
            duration: dur,
            ease: 'none',
            onUpdate: () => {
              const y = proxy.y;
              const top = Math.max(0, y);
              const bottom = Math.max(0, H - y - BAND);
              clone.style.clipPath = `inset(${top}px 0 ${bottom}px 0)`;
              fx.style.transform = `translateY(${y}px)`;
            },
          },
          '<',
        )
        // Horizontal tearing jitter — tiny random offsets throughout the sweep.
        .to(
          inner,
          {
            x: 'random(-4,4)',
            duration: 0.07,
            repeat: Math.floor(dur / 0.07),
            repeatRefresh: true,
            ease: 'none',
          },
          '<',
        )
        .to(
          clone,
          { opacity: 0, duration: 0.45, ease: 'power2.in' },
          `-=${0.45}`,
        );
    };

    gsap.delayedCall(rnd(8, 15), sweep);

    return () => {
      killed = true;
      gsap.killTweensOf(clone);
      gsap.killTweensOf(inner);
      gsap.killTweensOf(fx);
      clone.innerHTML = '';
    };
  }, [sectionRef, cloneRef, contentRef]);
}
