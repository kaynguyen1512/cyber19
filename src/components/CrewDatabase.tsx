import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { useCameraScroll } from '@/lib/cameraController';
import { IMAGES } from '@/lib/images';

/* ═══════════════════════════════════════════════════════════════════
   CREW DATA
   ═══════════════════════════════════════════════════════════════════ */

type Side = 'left' | 'right' | 'center';

interface CrewMember {
  file: string;
  codename: string;
  name: string;
  img: string;
  side: Side;
  meta: [string, string];
}

const CREW: CrewMember[] = [
  { file: 'FILE 01', codename: 'THE LITTLE DEVIL', name: 'Rebecca', img: IMAGES.crew.rebecca, side: 'left', meta: ['SECURITY LEVEL: BLACK', 'ARASAKA ARCHIVE'] },
  { file: 'FILE 02', codename: 'THE PATRIARCH', name: 'Maine', img: IMAGES.crew.maine, side: 'right', meta: ['SECURITY LEVEL: RED', 'MILITECH RECORD'] },
  { file: 'FILE 03', codename: 'THE GHOST', name: 'Kiwi', img: IMAGES.crew.kiwi, side: 'left', meta: ['STATUS: VERIFIED', 'NET-77 ARCHIVE'] },
  { file: 'FILE 04', codename: 'THE BLADE', name: 'Dorio', img: IMAGES.crew.dorio, side: 'right', meta: ['SECURITY LEVEL: BLACK', 'MILITECH RECORD'] },
  { file: 'FILE 05', codename: 'THE LOUDMOUTH', name: 'Pilar', img: IMAGES.crew.pilar, side: 'left', meta: ['BIO-CHIP: ACTIVE', 'NIGHT CITY DB'] },
  { file: 'FILE 06', codename: 'THE MOON DREAMER', name: 'Lucy Kushinada', img: IMAGES.crew.lucy, side: 'right', meta: ['SECURITY LEVEL: CLASSIFIED', 'ARASAKA ARCHIVE'] },
  { file: 'FILE 07', codename: 'THE KID', name: 'David Martinez', img: IMAGES.crew.david, side: 'center', meta: ['STATUS: VERIFIED', 'MILITECH RECORD'] },
];

const COUNT = CREW.length;          // 7
const DAVID_INDEX = COUNT - 1;      // 6

/* ═══════════════════════════════════════════════════════════════════
   DEPTH SYSTEM — evenly spaced translateZ, real perspective
   ═══════════════════════════════════════════════════════════════════ */
const START_Z = 650;
const SPACING = 1500;               // px between characters (translateZ)
const PERSPECTIVE = 1000;           // parent perspective px
const CAMERA_TRAVEL = COUNT * SPACING; // 7000 — full camera travel

// Visibility windows measured in rendered-z (px from camera)
const FADE_IN = 1900;                // begins fading in this far before camera
const HOLD = 200;                   // fully visible band around camera
const FADE_OUT = 1400;               // fades out this far past camera
const REVEAL_START = 1900;           // text begins revealing this far before camera

// Scroll progress mapping
const P_CAMERA = 0.8;               // camera reaches David at this progress
const DAVID_DWELL = 0.1;            // David's reveal window after reaching camera

// Active window radius — scenes within current ± WINDOW_RADIUS receive updates.
const WINDOW_RADIUS = 2;

// Decode is skipped while scroll velocity (px/frame) exceeds this threshold.
const DECODE_VELOCITY_LIMIT = 600;

// Per-scene DOM write cache. Numeric values are cached and compared directly so
// we skip both style mutations and per-frame string allocation. Reveal
// progression itself is NEVER cached — only individual DOM writes.
interface SceneCache {
  z: number;
  opacity: number;
  textOpacity: number[]; // per-slot last opacity
  textY: number[]; // per-slot last translateY px
}
function makeCache(): SceneCache {
  return { z: NaN, opacity: NaN, textOpacity: [], textY: [] };
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Depth-driven opacity: 0 far → 1 at camera → 0 past camera
const depthOpacity = (z: number): number => {
  if (z <= -FADE_IN) return 0;
  if (z < -HOLD) return (z + FADE_IN) / (FADE_IN - HOLD);
  if (z <= HOLD) return 1;
  if (z < HOLD + FADE_OUT) return 1 - (z - HOLD) / FADE_OUT;
  return 0;
};

/* ═══════════════════════════════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════════════════════════════ */

function SectionHeader() {
  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-28 pb-20 text-center">
      <p className="font-mono text-[11px] tracking-[0.5em] text-cyber-magenta">
        // CREW DATABASE
      </p>
      <h2 className="mt-5 font-display text-[clamp(3rem,10vw,7rem)] font-black leading-[0.95] tracking-tight text-white">
        LEGENDS <span style={{ color: '#FFE600' }}>NEVER</span> DIE.
      </h2>
      <p className="mt-6 font-body text-lg italic text-gray-500">
        Every legend leaves a mark.
      </p>
      <div
        className="mt-10 h-px w-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.5), transparent)' }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CREW SCENE — one character, portrait + text as a single 3D object
   ═══════════════════════════════════════════════════════════════════ */

interface SceneRefs {
  scene: (el: HTMLDivElement | null) => void;
  text: (slot: number, el: HTMLElement | null) => void;
}

function CrewScene({ member, index, refs }: { member: CrewMember; index: number; refs: SceneRefs }) {
  const isFinal = member.side === 'center';
  const isLeft = member.side === 'left';

  const sceneStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
    transform: `translateZ(${-START_Z - index * SPACING}px)`,
    opacity: 0,
    pointerEvents: 'none',
  };

  const portrait = (
    <div
      className="crew-card"
      style={{
        width: '100%',
        aspectRatio: '3 / 4',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <CyberFrame member={member} index={index} />
    </div>
  );

  const align = isFinal
    ? 'items-center text-center'
    : isLeft
    ? 'items-start text-left'
    : 'items-end text-right';

  const justify = isFinal ? 'justify-center' : isLeft ? 'justify-start' : 'justify-end';

  const textBlock = (
    <div className={`flex flex-col max-w-sm ${align}`}>
      <div className={`flex items-center gap-2 ${justify}`}>
        <span
          ref={(el) => refs.text(4, el)}
          className="crew-file-led"
          style={{ opacity: 0 }}
        />
        <p
          ref={(el) => refs.text(0, el)}
          className="font-mono text-[13px] md:text-[14px] font-semibold tracking-[0.42em] text-cyan-300"
          style={{ opacity: 0 }}
        >
          {member.file}
        </p>
      </div>
      <p
        ref={(el) => refs.text(1, el)}
        className="crew-codename mt-5 font-mono text-[16px] font-semibold uppercase tracking-[0.22em]"
        style={{ opacity: 0 }}
      >
        {member.codename}
      </p>
      <div
        ref={(el) => refs.text(3, el)}
        className={`mt-3 flex flex-col ${align}`}
        style={{ opacity: 0 }}
      >
        <span
          className="font-mono text-[11px] tracking-[0.25em]"
          style={{ color: '#FFE86A' }}
        >
          {member.meta[0]}
        </span>

        <span
          className="crew-cursor mt-1 font-mono text-[11px] tracking-[0.25em]"
          style={{ color: '#FFE86A' }}
        >
          {member.meta[1]}
        </span>

        <div className="crew-divider mt-4 w-32" />
      </div>
      <h3
        ref={(el) => refs.text(2, el)}
        className={`crew-name mt-4 font-display font-black leading-[0.92] tracking-tight ${
          isFinal ? 'text-[clamp(3.2rem,9vw,6.5rem)]' : 'text-[clamp(2.6rem,6.5vw,5rem)]'
        }`}
        style={{ opacity: 0 }}
      >
        {member.name}
      </h3>
    </div>
  );

  return (
    <div ref={(el) => refs.scene(el)} style={sceneStyle}>
      {isFinal ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 md:gap-12"
          style={{ transform: 'translateY(-70px)', pointerEvents: 'auto' }}
        >
          <div style={{ width: 'min(560px,54vw)' }}>{portrait}</div>
          {textBlock}
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center px-6"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="flex items-center gap-6 md:gap-12"
            style={{
              flexDirection: isLeft ? 'row' : 'row-reverse',
              transform: `translateX(${isLeft ? '-6vw' : '6vw'})`,
            }}
          >
            <div style={{ width: 'min(420px,38vw)' }}>{portrait}</div>
            {textBlock}
          </div>
        </div>
      )}

      <span className="pointer-events-none absolute bottom-7 right-6 font-mono text-[10px] tracking-[0.32em] text-gray-700">
        {String(index + 1).padStart(2, '0')} / {String(COUNT).padStart(2, '0')}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SCROLL ANIMATION ENGINE
   ═══════════════════════════════════════════════════════════════════ */

// One-shot decode scramble: characters briefly resolve from random symbols
// into the final text, like an encrypted record decrypting. Fires once per
// element per visibility pass; replays when the scene re-enters the window.
const SCRAMBLE_CHARS = '#@%/_=01*<>$';

// Tracks the in-flight decode RAF per element so we never accidentally run
// two decode loops on the same element.
const decodeRafs = new WeakMap<HTMLElement, number>();
function startDecode(el: HTMLElement) {
  const prev = decodeRafs.get(el);
  if (prev) cancelAnimationFrame(prev);
  const finalText = el.dataset.originalText ?? el.textContent ?? '';
  if (!finalText) return;
  const len = finalText.length;
  const duration = 170 + Math.random() * 70; // 170–240ms
  const start = performance.now();
  const step = (now: number) => {
    const t = (now - start) / duration;
    if (t >= 1) {
      el.textContent = finalText;
      decodeRafs.delete(el);
      return;
    }
    const resolved = Math.floor(t * len);
    let out = '';
    for (let i = 0; i < len; i++) {
      const ch = finalText[i];
      if (ch === ' ' || i < resolved) out += ch;
      else out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
    }
    el.textContent = out;
    decodeRafs.set(el, requestAnimationFrame(step));
  };
  decodeRafs.set(el, requestAnimationFrame(step));
}

// Cancel any in-flight decode and restore the element's original text so a
// scene that leaves mid-decode doesn't stay scrambled.
function cancelDecode(el: HTMLElement) {
  const raf = decodeRafs.get(el);
  if (raf) {
    cancelAnimationFrame(raf);
    decodeRafs.delete(el);
  }
  if (el.dataset.originalText !== undefined) {
    el.textContent = el.dataset.originalText;
  }
  el.dataset.decoded = '';
}

// Progressive text reveal: FILE → CODENAME → NAME (timing unchanged).
// Slots 0–2 are the decoded labels; slot 3 (metadata + divider) rides the
// codename's timing, slot 4 (status LED) rides the FILE label's timing.
// Reveal depends only on the current visibility parameter f — no progression
// is cached. Individual DOM writes are cached (numeric compare) to avoid
// redundant style mutations and per-frame string allocation.
function revealText(
  els: (HTMLElement | null)[],
  f: number,
  cache: SceneCache,
  allowDecode: boolean,
) {
  const fe = easeInOutCubic(clamp01(f));
  for (let j = 0; j < 3; j++) {
    const el = els[j];
    if (!el) continue;
    const op = clamp01((fe - j * 0.33) / 0.33);
    if (op !== cache.textOpacity[j]) {
      el.style.opacity = String(op);
      cache.textOpacity[j] = op;
    }
    const y = (1 - op) * 12;
    if (y !== cache.textY[j]) {
      el.style.transform = `translateY(${y}px)`;
      cache.textY[j] = y;
    }
    if (allowDecode && op > 0.04 && !el.dataset.decoded) {
      if (el.dataset.originalText === undefined) el.dataset.originalText = el.textContent ?? '';
      el.dataset.decoded = '1';
      startDecode(el);
    }
  }
  const meta = els[3];
  if (meta) {
    const op = clamp01((fe - 0.33) / 0.33);
    if (op !== cache.textOpacity[3]) {
      meta.style.opacity = String(op);
      cache.textOpacity[3] = op;
    }
    const y = (1 - op) * 12;
    if (y !== cache.textY[3]) {
      meta.style.transform = `translateY(${y}px)`;
      cache.textY[3] = y;
    }
  }
  const led = els[4];
  if (led) {
    const op = clamp01(fe);
    if (op !== cache.textOpacity[4]) {
      led.style.opacity = String(op);
      cache.textOpacity[4] = op;
    }
  }
}

// Restore a scene to its hidden resting state when it leaves the active window.
// Ensures no stale cached values remain and the scene behaves like a fresh
// render when it re-enters. Cancels all in-flight decodes and drops GPU layers.
function resetScene(
  scene: HTMLDivElement,
  textEls: (HTMLElement | null)[],
  cache: SceneCache,
  index: number,
) {
  const restingZ = -START_Z - index * SPACING;
  scene.style.transform = `translateZ(${restingZ}px)`;
  scene.style.opacity = '0';
  scene.style.willChange = 'auto';

  for (const el of textEls) {
    if (!el) continue;
    el.style.opacity = '0';
    el.style.transform = '';
    cancelDecode(el);
  }

  cache.z = restingZ;
  cache.opacity = 0;
  cache.textOpacity = [];
  cache.textY = [];
}

function useCrewEngine(
  sectionRef: React.RefObject<HTMLElement | null>,
  sceneRefs: React.RefObject<(HTMLDivElement | null)[]>,
  textRefs: React.RefObject<(HTMLElement | null)[][]>,
) {
  const cacheRef = useRef<(SceneCache | null)[]>([]);
  const activeRef = useRef<Set<number>>(new Set());
  const lastOffsetRef = useRef<number>(NaN);
  const lastTimeRef = useRef<number>(NaN);
  const velocityRef = useRef<number>(0);

  // The camera target is driven by ScrollTrigger progress (which Lenis feeds).
  // The controller eases toward that target with momentum — a tiny cinematic
  // glide after the wheel stops, no overshoot, no bounce.
  useCameraScroll(
    sectionRef,
    (p) => (p < P_CAMERA ? (p / P_CAMERA) * CAMERA_TRAVEL : CAMERA_TRAVEL),
    (offset) => {
      const scenes = sceneRefs.current;
      const texts = textRefs.current;
      const caches = cacheRef.current;
      if (!scenes || !texts) return;

      // Track scroll velocity (px / ms) to gate decode during fast scrolling.
      const now = performance.now();
      if (!isNaN(lastOffsetRef.current)) {
        const dt = now - lastTimeRef.current;
        if (dt > 0) {
          const v = Math.abs(offset - lastOffsetRef.current) / dt;
          // Exponential smoothing for stability.
          velocityRef.current = velocityRef.current * 0.5 + v * 0.5;
        }
      }
      lastOffsetRef.current = offset;
      lastTimeRef.current = now;
      const allowDecode = velocityRef.current < DECODE_VELOCITY_LIMIT;

      // Active-scene windowing: only update current ± WINDOW_RADIUS. Scenes
      // outside this window are frozen at their hidden resting state.
      const current = Math.round((offset - START_Z) / SPACING);
      const lo = Math.max(0, current - WINDOW_RADIUS);
      const hi = Math.min(COUNT - 1, current + WINDOW_RADIUS);

      // Build the new active set and reset any scene that left the window.
      const newActive = new Set<number>();
      for (let i = lo; i <= hi; i++) newActive.add(i);

      for (const i of activeRef.current) {
        if (!newActive.has(i)) {
          const scene = scenes[i];
          if (!scene) continue;
          let cache = caches[i];
          if (!cache) { cache = makeCache(); caches[i] = cache; }
          resetScene(scene, texts[i] ?? [], cache, i);
        }
      }
      activeRef.current = newActive;

      // Update all active scenes.
      for (let i = lo; i <= hi; i++) {
        const scene = scenes[i];
        if (!scene) continue;

        let cache = caches[i];
        if (!cache) { cache = makeCache(); caches[i] = cache; }

        const z = -START_Z - i * SPACING + offset;
        const op = depthOpacity(z);

        // Cached transform + opacity — only write when the value actually
        // changes. Numeric compare avoids per-frame string allocation.
        if (z !== cache.z) {
          scene.style.transform = `translateZ(${z}px)`;
          scene.style.willChange = 'transform, opacity';
          cache.z = z;
        }
        if (op !== cache.opacity) {
          scene.style.opacity = String(op);
          cache.opacity = op;
        }

        // Reveal: always recompute from current visibility. No progression
        // caching — the write cache inside revealText prevents redundant DOM
        // mutations while allowing full recovery on re-entry.
        let f: number;
        if (i === DAVID_INDEX) {
          // David reveals only during the dwell (after reaching camera).
          const p = offset / CAMERA_TRAVEL;
          f = (p - P_CAMERA) / DAVID_DWELL;
        } else {
          // Others reveal as they approach the camera.
          f = (z + REVEAL_START) / REVEAL_START;
        }
        revealText(texts[i] ?? [], f, cache, allowDecode);
      }
    },
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function CrewDatabase() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLElement | null)[][]>([]);

  useCrewEngine(sectionRef, sceneRefs, textRefs);

  return (
    <section ref={sectionRef} id="crew" className="relative bg-[#050507]">
      <SectionHeader />
      <CrewFXStyles />

      {/* Scroll runway */}
      <div style={{ height: '600vh', position: 'relative' }}>
        {/* Pinned viewport */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Single static background for the entire Crew section */}
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
            <img
              src="https://ik.imagekit.io/zznoau6lx/5248762.jpg"
              alt=""
              loading="lazy"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                pointerEvents: 'none',
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(5,5,7,0.65)' }}
            />
          </div>

          {/* Foreground 3D scene */}
          <div
            className="absolute inset-0"
            style={{
              perspective: `${PERSPECTIVE}px`,
              transformStyle: 'preserve-3d',
              overflow: 'visible',
              zIndex: 1,
            }}
          >
            {CREW.map((m, i) => (
              <CrewScene
                key={m.name}
                member={m}
                index={i}
                refs={{
                  scene: (el) => { sceneRefs.current[i] = el; },
                  text: (slot, el) => {
                    const row = textRefs.current[i] ?? [null, null, null, null, null];
                    row[slot] = el;
                    textRefs.current[i] = row;
                  },
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* End of transmission */}
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
        <div
          className="h-px w-20"
          style={{ background: 'linear-gradient(90deg, transparent, #FF2D2D, transparent)' }}
        />
        <p className="mt-8 font-mono text-[10px] tracking-[0.45em] text-gray-700">
          END OF TRANSMISSION
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CYBER FRAME — cyberpunk data-chip portrait frame (static, no animations)
   Keeps the image at exactly the same size/position; only adds a lightweight
   shell. No continuous animations, no filters, no blend modes, no glow pulses.
   ═══════════════════════════════════════════════════════════════════ */

/* Injected once. All styling is static — borders and solid colors only.
   The only runtime mutations are transform/opacity driven by the scroll
   engine on the scene container and text slots. */
function CrewFXStyles() {
  return (
    <style>{`
.crew-file-led {
  width: 5px; height: 5px; border-radius: 9999px;
  background: #00f0ff;
  box-shadow: 0 0 4px rgba(0,240,255,0.6);
}
.crew-codename {
  color: #7fe9ff;
}
.crew-name {
  background: linear-gradient(90deg, #00f0ff 0%, #4d7fff 25%, #ff4d8d 50%, #ffe600 75%, #00f0ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.crew-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.45), transparent);
  opacity: 0.6;
}
.crew-cursor::after {
  content: '▌';
  margin-left: 5px;
  color: rgba(0,240,255,0.7);
}
    `}</style>
  );
}

function CyberFrame({ member, index }: { member: CrewMember; index: number }) {
  return (
    <div className="relative h-full w-full">
      {/* Thick dark metallic outer shell with bevel */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(145deg, #23262b 0%, #0a0b0d 38%, #15171b 62%, #050608 100%)',
          boxShadow:
            'inset 0 0 0 1px rgba(0,240,255,0.18), inset 0 0 0 2px rgba(0,0,0,0.7), 0 0 0 1px #000, 0 22px 50px rgba(0,0,0,0.85)',
          clipPath:
            'polygon(0 14px, 14px 0, calc(100% - 28px) 0, 100% 28px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 28px 100%, 0 calc(100% - 28px))',
        }}
      >
        {/* Inner layered border — metallic mid plate */}
        <div
          className="absolute"
          style={{
            inset: '8px',
            background: 'linear-gradient(150deg, #14161a, #070809)',
            boxShadow:
              'inset 0 0 0 1px rgba(0,240,255,0.12), inset 0 0 0 2px rgba(0,0,0,0.6)',
            clipPath:
              'polygon(0 10px, 10px 0, calc(100% - 22px) 0, 100% 22px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 22px 100%, 0 calc(100% - 22px))',
          }}
        >
          {/* Image well */}
          <div
            className="absolute overflow-hidden"
            style={{
              inset: '12px',
              boxShadow: 'inset 0 0 0 1px rgba(0,240,255,0.25), inset 0 0 0 2px rgba(0,0,0,0.8)',
              clipPath:
                'polygon(0 8px, 8px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 18px 100%, 0 calc(100% - 18px))',
            }}
          >
            <img
              src={member.img}
              alt={member.name}
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
            {/* Color grade */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(5,5,7,0.15) 0%, transparent 22%, transparent 62%, rgba(5,5,7,0.72) 100%)',
              }}
            />
            {/* Static scanline texture */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,0,0,0.28) 2px, rgba(0,0,0,0.28) 3px)',
                opacity: 0.2,
              }}
            />
          </div>

          {/* Cyan glowing corner brackets */}
          <CornerBracket position="top-left" />
          <CornerBracket position="top-right" />
          <CornerBracket position="bottom-left" />
          <CornerBracket position="bottom-right" />

          {/* Top scan label bar */}
          <div
            className="absolute left-3 right-3 flex items-center justify-between font-mono"
            style={{ top: '14px', fontSize: '7px', letterSpacing: '0.18em' }}
          >
            <span style={{ color: 'rgba(0,240,255,0.85)' }}>FILE VERIFIED</span>
            <span style={{ color: 'rgba(255,230,0,0.85)' }}>NC-2077</span>
          </div>

          {/* Bottom scan label bar */}
          <div
            className="absolute left-3 right-3 flex items-center justify-between font-mono"
            style={{ bottom: '14px', fontSize: '7px', letterSpacing: '0.18em' }}
          >
            <span style={{ color: 'rgba(255,230,0,0.85)' }}>CREW DATA</span>
            <span style={{ color: 'rgba(0,240,255,0.7)' }}>{member.file}</span>
          </div>

          {/* Side micro text */}
          <div
            className="absolute font-mono"
            style={{
              left: '5px',
              top: '50%',
              transform: 'translateY(-50%) rotate(-90deg)',
              transformOrigin: 'left center',
              fontSize: '6px',
              letterSpacing: '0.3em',
              color: 'rgba(255,230,0,0.55)',
              whiteSpace: 'nowrap',
            }}
          >
            NET-77//CHROME-2.1
          </div>
          <div
            className="absolute font-mono"
            style={{
              right: '5px',
              top: '50%',
              transform: 'translateY(-50%) rotate(90deg)',
              transformOrigin: 'right center',
              fontSize: '6px',
              letterSpacing: '0.3em',
              color: 'rgba(0,240,255,0.55)',
              whiteSpace: 'nowrap',
            }}
          >
            ID:{member.file.replace(/\s/g, '')}
          </div>

          {/* Bolts / screws */}
          <Bolt style={{ top: '10px', left: '10px' }} />
          <Bolt style={{ top: '10px', right: '10px' }} />
          <Bolt style={{ bottom: '10px', left: '10px' }} />
          <Bolt style={{ bottom: '10px', right: '10px' }} />

          {/* Static indicator LEDs */}
          <div
            className="absolute"
            style={{
              top: '26px',
              left: '14px',
              width: '5px',
              height: '5px',
              borderRadius: '9999px',
              background: '#00f0ff',
              boxShadow: '0 0 4px rgba(0,240,255,0.7)',
            }}
          />
          <div
            className="absolute"
            style={{
              top: '26px',
              right: '14px',
              width: '5px',
              height: '5px',
              borderRadius: '9999px',
              background: '#ffe600',
              boxShadow: '0 0 4px rgba(255,230,0,0.7)',
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: '26px',
              left: '14px',
              width: '5px',
              height: '5px',
              borderRadius: '9999px',
              background: '#ff2d2d',
              boxShadow: '0 0 4px rgba(255,45,45,0.7)',
            }}
          />

          {/* Yellow industrial warning stripe — bottom edge */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: '24px',
              right: '24px',
              bottom: '4px',
              height: '3px',
              background:
                'repeating-linear-gradient(45deg, #ffe600 0px, #ffe600 4px, #0a0b0d 4px, #0a0b0d 8px)',
              opacity: 0.7,
            }}
          />
          {/* Yellow warning stripe — top edge */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: '24px',
              right: '24px',
              top: '4px',
              height: '2px',
              background:
                'repeating-linear-gradient(45deg, rgba(255,230,0,0.6) 0px, rgba(255,230,0,0.6) 3px, transparent 3px, transparent 6px)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CornerBracket({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const base = 'absolute h-4 w-4';
  const map: Record<string, string> = {
    'top-left': 'left-2 top-2',
    'top-right': 'right-2 top-2',
    'bottom-left': 'left-2 bottom-2',
    'bottom-right': 'right-2 bottom-2',
  };
  const borderMap: Record<string, string> = {
    'top-left': 'border-l-2 border-t-2',
    'top-right': 'border-r-2 border-t-2',
    'bottom-left': 'border-l-2 border-b-2',
    'bottom-right': 'border-r-2 border-b-2',
  };
  return (
    <div
      className={`${base} ${map[position]} ${borderMap[position]}`}
      style={{ borderColor: '#00f0ff' }}
    />
  );
}

function Bolt({ style }: { style: CSSProperties }) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        width: '7px',
        height: '7px',
        borderRadius: '9999px',
        background: 'radial-gradient(circle at 35% 35%, #5a5e66, #15171b 70%, #050608)',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)',
        ...style,
      }}
    >
      <div
        style={{
          width: '3px',
          height: '1px',
          background: 'rgba(0,0,0,0.85)',
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
}
