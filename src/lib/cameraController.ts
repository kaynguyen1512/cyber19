import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Direct camera binding for the Crew Database.
 *
 * Pipeline:
 *   wheel → Lenis → ScrollTrigger.progress → mapProgress → camera offset
 *     → scene transforms
 *
 * Lenis already smooths the scroll position, so there is NO second
 * interpolation layer here — no physics, no spring, no velocity, no RAF loop.
 * The camera offset follows ScrollTrigger progress directly.
 */
export function useCameraScroll(
  triggerEl: React.RefObject<HTMLElement | null>,
  mapProgress: (p: number) => number,
  onCameraUpdate: (offset: number) => void,
) {
  useEffect(() => {
    const el = triggerEl.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        onCameraUpdate(mapProgress(self.progress));
      },
    });

    return () => {
      trigger.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
