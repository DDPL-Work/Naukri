import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/* ─────────────────────────────────────────────
   Maven Jobs — GSAP Loading Component
   Variants:
     fullScreen  → overlay with animated logo + bars
     inline      → card-skeleton shimmer
     section     → centered spinner for sections
───────────────────────────────────────────── */

/* ── Inline shimmer skeleton (used for sections) ── */
function SkeletonCard() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sk-shimmer",
        { x: "-100%" },
        { x: "100%", duration: 1.4, repeat: -1, ease: "power1.inOut", stagger: 0.12 }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} style={sk.card}>
      <div style={sk.row}>
        <div style={{ ...sk.circle, position: "relative", overflow: "hidden" }}>
          <div className="sk-shimmer" style={sk.shine} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ ...sk.line, width: "65%", position: "relative", overflow: "hidden" }}>
            <div className="sk-shimmer" style={sk.shine} />
          </div>
          <div style={{ ...sk.line, width: "42%", height: 10, position: "relative", overflow: "hidden" }}>
            <div className="sk-shimmer" style={sk.shine} />
          </div>
        </div>
      </div>
      <div style={{ ...sk.line, width: "90%", marginTop: 14, position: "relative", overflow: "hidden" }}>
        <div className="sk-shimmer" style={sk.shine} />
      </div>
      <div style={{ ...sk.line, width: "74%", marginTop: 8, position: "relative", overflow: "hidden" }}>
        <div className="sk-shimmer" style={sk.shine} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <div style={{ ...sk.pill, position: "relative", overflow: "hidden" }}>
          <div className="sk-shimmer" style={sk.shine} />
        </div>
        <div style={{ ...sk.pill, width: 72, position: "relative", overflow: "hidden" }}>
          <div className="sk-shimmer" style={sk.shine} />
        </div>
        <div style={{ ...sk.pill, width: 88, position: "relative", overflow: "hidden" }}>
          <div className="sk-shimmer" style={sk.shine} />
        </div>
      </div>
    </div>
  );
}

const sk = {
  card: {
    background: "#fff",
    border: "1px solid rgba(20,63,134,.09)",
    borderRadius: 14,
    padding: "20px",
    boxShadow: "0 2px 12px rgba(20,63,134,.05)",
  },
  row: { display: "flex", alignItems: "center", gap: 12 },
  circle: {
    width: 46, height: 46, minWidth: 46, borderRadius: 12,
    background: "#eef2fb",
  },
  line: {
    height: 13, borderRadius: 6, background: "#eef2fb",
  },
  pill: {
    height: 28, width: 100, borderRadius: 999, background: "#eef2fb",
  },
  shine: {
    position: "absolute", inset: 0,
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.75) 50%, transparent 100%)",
  },
};

/* ── Section grid skeleton (companies / categories) ── */
export function SectionSkeleton({ cards = 4, title = true }) {
  return (
    <div style={{ padding: "80px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 4%" }}>
        {title && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...sk.line, width: 120, height: 10, marginBottom: 10, position: "relative", overflow: "hidden" }}>
              <div style={sk.shine} />
            </div>
            <div style={{ ...sk.line, width: 280, height: 28, position: "relative", overflow: "hidden" }}>
              <div style={sk.shine} />
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cards}, minmax(0,1fr))`, gap: 18 }}>
          {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  );
}

/* ── Full-screen overlay loader ── */
function FullScreenLoader({ onDone }) {
  const overlayRef  = useRef(null);
  const logoRef     = useRef(null);
  const mRef        = useRef(null);
  const barsRef     = useRef(null);
  const dotsRef     = useRef(null);
  const textRef     = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Instant — just fade after 600 ms
      setTimeout(() => {
        gsap.to(overlayRef.current, {
          autoAlpha: 0, duration: 0.3,
          onComplete: () => onDone?.(),
        });
      }, 600);
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      /* 1 — Overlay fade in */
      tl.fromTo(overlayRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.25, ease: "none" }
      );

      /* 2 — Logo pop */
      tl.fromTo(logoRef.current,
        { scale: 0.6, autoAlpha: 0, y: 14 },
        { scale: 1, autoAlpha: 1, y: 0, duration: 0.55, ease: "back.out(1.6)" },
        "-=0.05"
      );

      /* 3 — "M" letter draw */
      tl.fromTo(mRef.current,
        { strokeDashoffset: 120 },
        { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" },
        "-=0.3"
      );

      /* 4 — Bars stagger up */
      tl.fromTo(".fs-bar",
        { scaleY: 0, autoAlpha: 0 },
        { scaleY: 1, autoAlpha: 1, duration: 0.45, stagger: 0.07, ease: "power3.out", transformOrigin: "bottom" },
        "-=0.2"
      );

      /* 5 — Bars loop bounce */
      tl.to(".fs-bar", {
        scaleY: 0.35,
        duration: 0.38,
        stagger: { each: 0.09, repeat: -1, yoyo: true },
        ease: "sine.inOut",
      });

      /* 6 — Text fade */
      tl.fromTo(textRef.current,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
        "<"
      );

      /* 7 — Dots pulse */
      tl.to(".fs-dot", {
        scale: 1.5, autoAlpha: 0.3,
        duration: 0.5, stagger: { each: 0.18, repeat: -1, yoyo: true },
        ease: "sine.inOut",
      }, "<0.1");

      /* 8 — Progress bar fill */
      tl.fromTo(progressRef.current,
        { width: "0%" },
        { width: "100%", duration: 1.6, ease: "power1.inOut" },
        1.0
      );

      /* 9 — Exit: shrink + fade */
      tl.to([logoRef.current, textRef.current, barsRef.current, dotsRef.current], {
        autoAlpha: 0, y: -12, duration: 0.35, stagger: 0.04, ease: "power2.in",
      }, "+=0.15");

      tl.to(overlayRef.current,
        { autoAlpha: 0, duration: 0.38, ease: "power2.inOut",
          onComplete: () => onDone?.() },
        "-=0.1"
      );

    }, overlayRef);

    return () => ctx.revert();
  }, []);

  const barHeights = [28, 40, 52, 40, 28, 40, 52];
  const barColors  = [
    "rgba(214,243,61,.5)", "rgba(46,169,196,.6)", "#2ea9c4",
    "var(--lp-blue,#143f86)", "#2ea9c4", "rgba(46,169,196,.6)", "rgba(214,243,61,.5)",
  ];

  return (
    <div ref={overlayRef} style={fs.overlay} aria-label="Loading Maven Jobs" role="status">
      {/* Background orbs */}
      <div style={{ ...fs.orb, width: 340, height: 340, top: -100, right: -80, background: "rgba(214,243,61,.15)" }} />
      <div style={{ ...fs.orb, width: 260, height: 260, bottom: -70, left: -60, background: "rgba(46,169,196,.12)" }} />

      <div style={fs.card}>
        {/* Logo mark */}
        <div ref={logoRef} style={fs.logoWrap}>
          <div style={fs.logoCircle}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              {/* Gradient def */}
              <defs>
                <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#143f86" />
                  <stop offset="100%" stopColor="#2ea9c4" />
                </linearGradient>
              </defs>
              {/* Background circle */}
              <circle cx="26" cy="26" r="26" fill="url(#mg)" />
              {/* Animated M path */}
              <path
                ref={mRef}
                d="M14 34 L14 18 L26 30 L38 18 L38 34"
                stroke="#ffffff"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray="120"
                strokeDashoffset="120"
              />
            </svg>
          </div>
          {/* Lime ring pulse */}
          <div style={fs.ring} />
        </div>

        {/* Bars visualiser */}
        <div ref={barsRef} style={fs.bars}>
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="fs-bar"
              style={{
                width: 5,
                height: h,
                borderRadius: 3,
                background: barColors[i],
                transformOrigin: "bottom",
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Text */}
        <div ref={textRef} style={fs.textWrap}>
          <span style={fs.brand}>Maven Jobs</span>
          <span style={fs.sub}>Finding your next opportunity</span>
        </div>

        {/* Dots */}
        <div ref={dotsRef} style={fs.dotsRow}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="fs-dot"
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i === 0 ? "#d6f33d" : i === 1 ? "#2ea9c4" : "#143f86",
              }}
            />
          ))}
        </div>

        {/* Progress track */}
        <div style={fs.track}>
          <div ref={progressRef} style={fs.progressBar} />
        </div>
      </div>
    </div>
  );
}

/* Full-screen styles */
const fs = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 10000,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(ellipse at 60% -10%, #e8f0ff 0%, #f8fbff 45%, #fff 100%)",
    overflow: "hidden",
    opacity: 0, visibility: "hidden",   // gsap controls
  },
  orb: {
    position: "absolute", borderRadius: "50%",
    filter: "blur(56px)", pointerEvents: "none",
  },
  card: {
    position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 22,
    background: "rgba(255,255,255,.88)",
    border: "1px solid rgba(20,63,134,.09)",
    borderRadius: 24,
    padding: "44px 52px 36px",
    boxShadow: "0 32px 80px rgba(20,63,134,.13), 0 8px 24px rgba(20,63,134,.07)",
    backdropFilter: "blur(12px)",
    minWidth: 280,
  },
  logoWrap: {
    position: "relative", display: "flex",
    alignItems: "center", justifyContent: "center",
    opacity: 0, visibility: "hidden",
  },
  logoCircle: {
    width: 72, height: 72,
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 28px rgba(20,63,134,.25)",
  },
  ring: {
    position: "absolute", inset: -6,
    borderRadius: "50%",
    border: "2.5px solid rgba(214,243,61,.7)",
    animation: "lpRingPulse 2s ease-in-out infinite",
  },
  bars: {
    display: "flex", alignItems: "flex-end", gap: 6, height: 56,
  },
  textWrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 5,
    opacity: 0, visibility: "hidden",
  },
  brand: {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: "1.22rem", fontWeight: 800,
    color: "#0a244d", letterSpacing: "-.025em",
  },
  sub: {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: ".8rem", fontWeight: 500,
    color: "#8ca2c0",
  },
  dotsRow: {
    display: "flex", gap: 8, alignItems: "center",
  },
  track: {
    width: "100%", height: 3,
    borderRadius: 999,
    background: "rgba(20,63,134,.08)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%", borderRadius: 999, width: "0%",
    background: "linear-gradient(90deg, #143f86 0%, #2ea9c4 55%, #d6f33d 100%)",
    boxShadow: "0 0 8px rgba(46,169,196,.45)",
  },
};

/* ── Section / inline spinner ── */
function InlineSpinner({ size = 44 }) {
  const ref = useRef(null);
  const arcRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Rotate outer ring
      gsap.to(ref.current, {
        rotation: 360, duration: 1.1,
        repeat: -1, ease: "none", transformOrigin: "center",
      });
      // Arc dash pulse
      gsap.to(arcRef.current, {
        strokeDashoffset: 0, duration: 1.1,
        repeat: -1, ease: "power1.inOut",
        yoyo: true,
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;

  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="sp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#143f86" />
          <stop offset="100%" stopColor="#2ea9c4" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(20,63,134,.1)"
        strokeWidth="3"
      />
      {/* Arc */}
      <circle
        ref={arcRef}
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="url(#sp-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * 0.25}
        style={{ transformOrigin: "center" }}
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   MAIN EXPORT — Smart Loading
   Props:
     fullScreen  bool   — overlay vs inline
     variant     string — "overlay" | "skeleton" | "spinner"
     cards       number — skeleton card count
     onDone      fn     — called when overlay exits
═══════════════════════════════════════════════ */
const Loading = ({
  fullScreen = true,
  variant,                  // "overlay" | "skeleton" | "spinner"
  cards = 4,
  onDone,
  gifSrc,                   // ignored — we don't use GIFs anymore
}) => {
  // Resolve variant
  const mode = variant ?? (fullScreen ? "overlay" : "skeleton");

  if (mode === "overlay") {
    return (
      <>
        <style>{`
          @keyframes lpRingPulse {
            0%,100%{transform:scale(1);opacity:.7}
            50%{transform:scale(1.14);opacity:.25}
          }
        `}</style>
        <FullScreenLoader onDone={onDone} />
      </>
    );
  }

  if (mode === "skeleton") {
    return <SectionSkeleton cards={cards} />;
  }

  // "spinner" — used inside sections / buttons
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "100%", minHeight: fullScreen ? "100vh" : "60vh",
      ...(fullScreen ? {
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(248,251,255,.92)",
        backdropFilter: "blur(6px)",
      } : {}),
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <InlineSpinner size={52} />
        <span style={{
          fontFamily: '"DM Sans",sans-serif',
          fontSize: ".82rem", fontWeight: 600,
          color: "#8ca2c0", letterSpacing: ".01em",
        }}>
          Loading…
        </span>
      </div>
    </div>
  );
};

export default Loading;