import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Crew Database — one-time hologram materialization.
 *
 * Fires once when the Crew section first enters the viewport (~15-20%).
 * Projects the section like a futuristic holographic record: the pinned
 * 3D stage materializes (opacity / translateY / scale / blur / brightness
 * + a brief RGB split <80ms + cyan glow in the first 300ms + a single
 * horizontal scanline sweep), then the header label, title, subtitle and
 * divider resolve in order.
 *
 * This hook only writes opacity / transform / filter / box-shadow on the
 * section's pinned stage and header pieces. It never touches the scene
 * roots whose transform/opacity are driven by the camera engine, so the
 * existing depth reveal, hover effects, idle animations, particles and
 * background effects are completely untouched. The crew cards themselves
 * continue to appear via their existing scroll-driven camera reveal.
 */
export function useCrewBoot(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      // Header pieces (SectionHeader is the first child of the section).
      const headerWrap = root.querySelector<HTMLElement>(':scope > div');
      const headerLabel = headerWrap?.querySelector<HTMLElement>('p.font-mono');
      const headerTitle = headerWrap?.querySelector<HTMLElement>('h2');
      const headerSubtitle = headerWrap?.querySelector<HTMLElement>('p.italic');
      const headerDivider = headerWrap?.querySelector<HTMLElement>('.mt-10');

      // Pinned 3D stage (the sticky viewport).
      const stage = root.querySelector<HTMLElement>(':scope > div > div[style*="sticky"]');

      if (reduce) {
        gsap.set([headerLabel, headerTitle, headerSubtitle, headerDivider, stage],
          { opacity: 1, y: 0, scale: 1, filter: 'none', scaleX: 1 });
        return;
      }

      // ── Initial hidden states ────────────────────────────────────────
      gsap.set([headerLabel, headerTitle, headerSubtitle],
        { opacity: 0, y: 20, filter: 'blur(8px) brightness(0.6)' });
      gsap.set(headerDivider, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
      gsap.set(stage, { opacity: 0, y: 20, scale: 0.98, filter: 'blur(10px) brightness(0.6)' });

      // One-shot scanline overlay appended to the stage (absolute, no layout).
      const scanline = document.createElement('div');
      scanline.style.cssText =
        'position:absolute;left:0;right:0;top:0;height:14px;z-index:50;pointer-events:none;' +
        'background:linear-gradient(180deg, transparent, rgba(0,240,255,0.55), transparent);' +
        'box-shadow:0 0 18px rgba(0,240,255,0.5);opacity:0;will-change:transform,opacity;';
      stage?.appendChild(scanline);

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: 'top 85%', once: true },
        onComplete: () => scanline.remove(),
      });

      // 1. CREW SECTION CONTAINER (the 3D stage) materializes.
      tl.to(stage, {
          opacity: 1, y: 0, scale: 1, filter: 'blur(0px) brightness(1)',
          duration: 0.6, ease: 'power2.out',
        })
        // Subtle cyan glow during the first ~300ms of materialization.
        .fromTo(stage, { boxShadow: '0 0 0 rgba(0,240,255,0)' },
          { boxShadow: '0 0 40px rgba(0,240,255,0.35)', duration: 0.3, ease: 'power2.out' }, 0)
        .to(stage, { boxShadow: '0 0 0 rgba(0,240,255,0)', duration: 0.3, ease: 'power2.out' }, 0.3)
        // Very small RGB split / glitch, <80ms, right at the start.
        .fromTo(stage,
          { x: -2, filter: 'blur(10px) brightness(0.6) drop-shadow(2px 0 rgba(255,0,168,0.7))' },
          { x: 2, filter: 'blur(10px) brightness(0.6) drop-shadow(-2px 0 rgba(0,240,255,0.7))', duration: 0.04, ease: 'none' }, 0)
        .to(stage, { x: 0, duration: 0.04, ease: 'none' })
        // Horizontal scanline sweep across the stage while it appears.
        .fromTo(scanline, { y: -20, opacity: 0 },
          { y: (stage?.offsetHeight ?? 600) + 20, opacity: 0.8, duration: 0.7, ease: 'power1.inOut' }, 0.05)
        .to(scanline, { opacity: 0, duration: 0.1 }, '-=0.1')

        // 2. SECTION TITLE — "// CREW DATABASE" label resolves.
        .to(headerLabel, { opacity: 1, y: 0, filter: 'blur(0px) brightness(1)', duration: 0.35, ease: 'power3.out' }, 0.2)
        // 3. SUBTITLE — "LEGENDS NEVER DIE." resolves.
        .to(headerTitle, { opacity: 1, y: 0, filter: 'blur(0px) brightness(1)', duration: 0.4, ease: 'power3.out' }, 0.35)
        // italic tagline + divider ride along with the subtitle.
        .to(headerSubtitle, { opacity: 1, y: 0, filter: 'blur(0px) brightness(1)', duration: 0.35, ease: 'power3.out' }, 0.45)
        .to(headerDivider, { opacity: 1, scaleX: 1, duration: 0.3, ease: 'power2.out' }, 0.5);
    }, root);

    return () => ctx.revert();
  }, [rootRef]);
}
