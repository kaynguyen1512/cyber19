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
  const scanRef = useRef<HTMLDivElement>(null);
  const stripsRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const dispMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useAboutGlitchSweep(
    sectionRef,
    scanRef,
    stripsRef,
    flashRef,
    dispMapRef as unknown as React.RefObject<SVGElement>,
  );

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

      {/* ── CRT signal-scanner glitch overlay (no DOM clone) ── */}
      <svg className="ab-svg" aria-hidden focusable="false">
        <defs>
          <filter id="ab-disp" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.6"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              ref={dispMapRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div ref={scanRef} className="ab-scan" aria-hidden>
        {/* Contrast / brightness / saturation boost on real pixels */}
        <div className="ab-scan-grade" />
        {/* RGB split — cyan shifted left, magenta shifted right */}
        <div className="ab-scan-rgb ab-scan-cyan" />
        <div className="ab-scan-rgb ab-scan-magenta" />
        {/* Fractal-noise overlay, displaced by the SVG filter */}
        <div className="ab-scan-noise" />
        {/* Horizontal tearing strips — random independent shifts */}
        <div ref={stripsRef} className="ab-scan-strips">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="ab-strip" />
          ))}
        </div>
        {/* Occasional white interference flash */}
        <div ref={flashRef} className="ab-scan-flash" />
        {/* Soft scanline glow — rounded falloff, not neon */}
        <div className="ab-scan-glow" />
      </div>

      <div className="mx-auto max-w-6xl">
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
    src="https://cdn-cf-east.streamable.com/video/mp4/jb3r6e.mp4?Expires=1785388763969&Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ&Signature=kmjkNM8bYAwUIsNDD91HwOJm21irUplCaHg6At6S5EwQYVQTODz1jegZBiH2EseLMUSlGq-HYbGisJVfauPYwT3NudfMFXv6YoXo4gVwrg~AJ9vCOLtuitjpeqZC2FIwvU0sReen8OuC8Zs5YTwyx4Obtad92jXQcXoTgbF5P5Sl2Q0dcXATVjOBNcDn4njjgCdLPSo2rkb9xmD83SdqRh7ngMcJJwN4nQyemSd7gais1BiJYHmERehCgpQMNcY28IYvrgtVbJLoZPdC-nrpQQYoSVk2eg2iGG7qke17NgrrCztbsN6iOGh4j0E5SOc4t7k9o6bDQDgqYxSrND~Rg__"
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
   CRT SIGNAL SCANNER — About section only, no DOM clone.
   A thin overlay (.ab-scan) travels top→bottom. Its children sample the
   REAL pixels behind them via backdrop-filter, so only the pixels under
   the moving band are corrupted. The SVG feTurbulence+feDisplacementMap
   drives the horizontal tearing; its scale animates only during a sweep.
   ═══════════════════════════════════════════════════════════════════ */

const aboutGlitchStyles = `
.ab-svg {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* The moving scanline band — 24px tall, soft edges, travels via GSAP. */
.ab-scan {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 24px;
  z-index: 25;
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
  /* Rounded falloff so the band itself has soft top/bottom edges. */
  -webkit-mask-image: linear-gradient(to bottom,
    transparent 0%,
    #000 22%,
    #000 78%,
    transparent 100%);
  mask-image: linear-gradient(to bottom,
    transparent 0%,
    #000 22%,
    #000 78%,
    transparent 100%);
}

/* Boost contrast / brightness / saturation on the real pixels behind. */
.ab-scan-grade {
  position: absolute;
  inset: 0;

  backdrop-filter:
    brightness(1.35)
    contrast(1.7)
    saturate(2.1)
    hue-rotate(-4deg);

  -webkit-backdrop-filter:
    brightness(1.35)
    contrast(1.7)
    saturate(2.1)
    hue-rotate(-4deg);
}

/* RGB split — two tinted backdrop layers offset left (cyan) / right (magenta). */
.ab-scan-rgb {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
}
.ab-scan-cyan {
  transform: translateX(-6px);

  background: rgba(0,232,255,.22);

  filter:
    blur(.6px)
    drop-shadow(0 0 8px rgba(0,232,255,.75))
    drop-shadow(4px 0 0 rgba(0,232,255,.55));
}
.ab-scan-magenta {
  transform: translateX(6px);

  background: rgba(255,45,166,.20);

  filter:
    blur(.6px)
    drop-shadow(0 0 8px rgba(255,45,166,.75))
    drop-shadow(-4px 0 0 rgba(255,45,166,.55));
}

/* Fractal-noise overlay — high-frequency digital noise, ~15fps steps.
   Displaced by the SVG feTurbulence+feDisplacementMap so the noise tears
   horizontally, reading as unstable video signal. */
.ab-scan-noise {
  position: absolute;
  inset: -20px;
  opacity: 0.5;
  mix-blend-mode: overlay;
  filter: url(#ab-disp);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  background-size: 120px 120px;
  animation: ab-noise-shift 0.066s steps(1) infinite;
}
@keyframes ab-noise-shift {
  0% { transform: translate(0, 0); }
  16% { transform: translate(-6px, 2px); }
  33% { transform: translate(5px, -3px); }
  50% { transform: translate(-4px, 4px); }
  66% { transform: translate(7px, -1px); }
  83% { transform: translate(-8px, 3px); }
  100% { transform: translate(3px, -4px); }
}

/* Horizontal tearing strips — each shifts independently via GSAP. */
.ab-scan-strips {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.ab-strip {
  position: absolute;
  left: 0;
  width: 100%;

  background:
    linear-gradient(
      90deg,
      rgba(0,232,255,.25),
      rgba(255,255,255,.18),
      rgba(255,45,166,.25)
    );

  mix-blend-mode: screen;
  will-change: transform;
}

/* Occasional white interference flash — 20–40ms, band only. */
.ab-scan-flash {
  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      90deg,
      rgba(0,232,255,.45),
      rgba(255,255,255,.55),
      rgba(255,45,166,.45)
    );

  mix-blend-mode: screen;
  opacity: 0;
  will-change: opacity;
}

/* Soft scanline glow — rounded falloff, not a neon laser. */
 .ab-scan-glow {
  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      to bottom,
      transparent,
      rgba(0,232,255,.12),
      rgba(247,252,255,.28),
      rgba(255,45,166,.12),
      transparent
    );

  filter: blur(2px);

  mix-blend-mode: screen;
}
`;

function AboutGlitchStyles() {
  return <style>{aboutGlitchStyles}</style>;
}
