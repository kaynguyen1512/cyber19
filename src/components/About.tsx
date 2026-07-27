import { useEffect, useRef, useState } from 'react';
import { useAboutGlitchSweep } from '@/lib/useAboutGlitchSweep';

const MANIFESTO = [
  {
    line: 'REBELS',
    text: 'We don\'t follow trends.\nWe create them.',
  },
  {
    line: 'NO LIMITS',
    text: 'Built for the streets,\nnot the boardroom.',
  },
  {
    line: 'STAY ALIVE',
    text: 'The strongest communities\nnever stop running.',
  },
];

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useAboutGlitchSweep(sectionRef, cloneRef, contentRef);

  // Slow parallax on the artwork tied to the section's position in the viewport.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // Progress from 0 (section entering bottom) to 1 (section leaving top).
        const progress = (vh - rect.top) / (vh + rect.height);
        setOffset((progress - 0.5) * 80);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative overflow-hidden bg-cyber-darker px-6 pt-32 pb-16 sm:pt-40 sm:pb-20"
    >
      <AboutGlitchStyles />

      {/* faint horizon glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-cyber-magenta/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[30rem] w-[30rem] rounded-full bg-cyber-cyan/5 blur-[120px]" />
      </div>

      {/* Glitch clone overlay — revealed only through a moving clip-path slice. */}
      <div ref={cloneRef} className="ab-clone" aria-hidden />

      <div ref={contentRef} className="mx-auto max-w-6xl">
        {/* Editorial two-column block */}
        <div className="grid items-center gap-16 lg:grid-cols-[55%_45%] lg:gap-20">
          {/* Text column */}
          <div>
            <div
              className="reveal font-mono text-xs tracking-[0.4em] text-cyber-magenta"
              style={{ transitionDelay: '0ms' }}
            >
              // THE DOSSIER
            </div>

            <h2
              className="reveal mt-6 font-display text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl"
              style={{ transitionDelay: '80ms' }}
            >
              THE CITY<br />
              <span className="text-cyber-yellow">NEVER</span> SLEEPS.
            </h2>

            <div
              className="reveal mt-10 max-w-md space-y-4 font-body text-lg leading-relaxed text-gray-400"
              style={{ transitionDelay: '320ms' }}
            >
              <p>The city never sleeps.</p>
              <p>Neither do dreamers.</p>
              <p>
                Every generation has its rebels. Every rebellion needs a
                symbol.
              </p>
              <p>
                <span className="text-cyber-cyan">CyberCoin</span> isn't trying
                to change the future.
              </p>
              <p className="text-gray-300">
                It belongs to the people already living in it.
              </p>
            </div>
          </div>

          {/* Artwork column — one cinematic image, slow parallax */}
          <div className="reveal-right relative" style={{ transitionDelay: '200ms' }}>
            <div
              ref={imgRef}
              className="relative aspect-[3/4] overflow-hidden"
              style={{ transform: `translateY(${offset}px)` }}
            >
             <video
  autoPlay
  muted
  loop
  playsInline
  className="h-full w-full object-cover"
  style={{
    filter: 'contrast(1.1) saturate(1.15) brightness(0.78)',
  }}
>
  <source
    src="https://cdn-cf-east.streamable.com/video/mp4/jb3r6e.mp4?Expires=1785388763969&Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ&Signature=kmjkNM8bYAwUIsNDD91HwOJm21irUplCaHg6At6S5EwQYVQTODz1jegZBiH2EseLMUSlGq-HYbGisJVfauPYwT3NudfMFXv6YoXo4gIvwrg~AJ9vCOLtuitjpeqZC2FIwvU0sReen8OuC8Zs5YTwyx4Obtad92jXQcXoTgbF5P5Sl2Q0dcXATVjOBNcDn4njjgCdLPSo2rkb9xmD83SdqRh7ngMcJJwN4nQyemSd7gais1BiJYHmERehCgpQMNcY28IYvrgtVbJLoZPdC-nrpQQYoSVk2eg2iGG7qke17NgrrCztbsN6iOGh4j0E5SOc4t7k9o6bDQDgqYxSrND~Rg__"
    type="video/mp4"
  />
</video>
              {/* cinematic grade */}
              <div className="absolute inset-0 bg-gradient-to-t from-cyber-darker via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyber-darker/40 via-transparent to-cyber-magenta/10" />
              {/* thin neon edge */}
              <div className="absolute inset-0 border border-white/5" />
            </div>
            {/* caption */}
            <div className="mt-4 font-mono text-[10px] tracking-[0.3em] text-gray-600">
              NIGHT CITY — 23:59
            </div>
          </div>
        </div>

        {/* Manifesto blocks */}
        <div className="mt-20 grid gap-12 sm:grid-cols-3 sm:gap-8">
          {MANIFESTO.map((m, i) => (
            <div
              key={i}
              className="reveal"
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="h-px w-10 bg-cyber-cyan/60" />
              <h3 className="mt-5 font-display text-sm font-bold tracking-[0.3em] text-cyber-cyan">
                {m.line}
              </h3>
              <p className="mt-3 whitespace-pre-line font-body text-base leading-relaxed text-gray-300">
                {m.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIGNAL SCANNER GLITCH — About section only.
   A single horizontal band travels top→bottom at constant speed. The real
   section content is cloned into .ab-clone, revealed only through a moving
   clip-path slice. Inside that slice the clone carries RGB-split drop-shadows,
   a horizontal tearing jitter, a brightness lift and faint noise — so the
   glitch exists ONLY inside the moving band. Everything else is untouched.
   Movement/timing/opacity via GSAP; clip-path/transform/filter via CSS.
   ═══════════════════════════════════════════════════════════════════ */

const aboutGlitchStyles = `
.ab-clone {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  opacity: 0;
  clip-path: inset(0 0 100% 0);
  will-change: opacity, clip-path;
  overflow: hidden;
}
.ab-clone-inner {
  position: absolute;
  inset: 0;
  will-change: transform;
  filter:
    drop-shadow(-2px 0 0 rgba(0,240,255,0.55))
    drop-shadow(2px 0 0 rgba(255,0,168,0.55));
  background: rgba(255,255,255,0.02);
}
.ab-clone-fx {
  position: absolute;
  left: 0;
  right: 0;
  height: 22px;
  top: 0;
  pointer-events: none;
  will-change: transform;
  background: linear-gradient(to bottom,
    transparent 0%,
    rgba(0,240,255,0.06) 18%,
    rgba(255,255,255,0.10) 50%,
    rgba(255,0,168,0.06) 82%,
    transparent 100%);
  mix-blend-mode: screen;
}
.ab-clone-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
  background-size: 80px 80px;
  animation: ab-noise-shift 0.5s steps(2) infinite;
}
@keyframes ab-noise-shift {
  0% { transform: translate(0,0); }
  50% { transform: translate(-4px,2px); }
  100% { transform: translate(3px,-3px); }
}
`;

function AboutGlitchStyles() {
  return <style>{aboutGlitchStyles}</style>;
}
