import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
    FiX, FiZap, FiClock, FiChevronRight,
    FiAward, FiTarget, FiStar
} from "react-icons/fi";

const DailyQuizNotification = ({
    isOpen = false,
    duration = 10,
    onClose = () => { },
    onTakeQuiz = () => { },
    quizTitle = "Your Daily Quiz is Ready!",
    quizSubtitle = "Sharpen your skills with today's challenge. Only 60 seconds.",
    questionCount = 5,
    xpReward = 50,
    quizDurationSeconds = 60,
}) => {
    const cardRef = useRef(null);
    const progressRef = useRef(null);
    const glowRef = useRef(null);
    const iconRef = useRef(null);
    const timerRef = useRef(null);
    const ctxRef = useRef(null);

    const [secondsLeft, setSecondsLeft] = useState(duration);
    const [mounted, setMounted] = useState(false);
    const [leaving, setLeaving] = useState(false);

    /* ── mount on open ── */
    useEffect(() => {
        if (isOpen) { setSecondsLeft(duration); setMounted(true); setLeaving(false); }
    }, [isOpen, duration]);

    /* ── GSAP entrance + timer ── */
    useEffect(() => {
        if (!mounted || leaving) return;

        ctxRef.current = gsap.context(() => {

            /* card entrance */
            gsap.fromTo(cardRef.current,
                { x: 120, opacity: 0, scale: 0.88, rotate: 3 },
                {
                    x: 0, opacity: 1, scale: 1, rotate: 0,
                    duration: 0.75, ease: "elastic.out(1, 0.7)", delay: 0.05
                }
            );

            /* icon float */
            gsap.to(iconRef.current, {
                y: -6, rotation: 8,
                repeat: -1, yoyo: true,
                duration: 2.2, ease: "sine.inOut",
            });

            /* glow pulse */
            gsap.to(glowRef.current, {
                opacity: 0.55, scale: 1.18,
                repeat: -1, yoyo: true,
                duration: 1.8, ease: "sine.inOut",
            });

            /* countdown progress bar */
            gsap.set(progressRef.current, { scaleX: 1, transformOrigin: "left center" });

            timerRef.current = gsap.to(progressRef.current, {
                scaleX: 0,
                duration: duration,
                ease: "none",
                onUpdate() {
                    const left = Math.max(0, Math.ceil(duration * (1 - this.progress())));
                    setSecondsLeft(left);
                },
                onComplete: () => triggerClose(),
            });
        });

        return () => {
            ctxRef.current?.revert();
            timerRef.current?.kill();
        };
    }, [mounted, leaving]);

    /* ── exit animation ── */
    const triggerClose = (cb) => {
        setLeaving(true);
        timerRef.current?.kill();
        ctxRef.current?.revert();

        gsap.to(cardRef.current, {
            x: 120, opacity: 0, scale: 0.9,
            duration: 0.4, ease: "power3.in",
            onComplete: () => {
                setMounted(false);
                setLeaving(false);
                onClose();
                cb?.();
            },
        });
    };

    const handleTakeQuiz = () => triggerClose(onTakeQuiz);

    /* percentage for arc */
    const pct = secondsLeft / duration;
    const r = 20;
    const circ = 2 * Math.PI * r;

    if (!mounted) return null;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');

        .dqn-wrap {
          position: fixed;
          bottom: 28px; right: 28px;
          z-index: 99999;
          pointer-events: none;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── card ── */
        .dqn-card {
          pointer-events: auto;
          position: relative;
          width: 360px;
          background: #ffffff;
          border-radius: 22px;
          overflow: hidden;
          box-shadow:
            0 4px 6px rgba(0,0,0,.04),
            0 12px 28px rgba(0,35,102,.10),
            0 32px 64px rgba(0,35,102,.14);
          border: 1px solid rgba(0,35,102,.08);
        }

        /* top gradient strip */
        .dqn-strip {
          height: 3px;
          background: linear-gradient(90deg, #002366 0%, #2563eb 50%, #10b981 100%);
        }

        /* inner padding */
        .dqn-inner { padding: 20px 22px 0; }

        /* close */
        .dqn-close {
          position: absolute; top: 14px; right: 14px;
          width: 30px; height: 30px; border-radius: 9px;
          background: #f1f5f9; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #64748b;
          transition: background .2s, color .2s, transform .2s;
          z-index: 2;
        }
        .dqn-close:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }

        /* header row */
        .dqn-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }

        /* icon container */
        .dqn-icon-wrap {
          position: relative; flex-shrink: 0;
          width: 54px; height: 54px;
        }
        .dqn-icon-glow {
          position: absolute; inset: -6px; border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,.35) 0%, transparent 70%);
          opacity: 0.4; pointer-events: none;
        }
        .dqn-icon {
          width: 54px; height: 54px; border-radius: 16px;
          background: linear-gradient(135deg, #002366 0%, #1d4ed8 100%);
          display: flex; align-items: center; justify-content: center;
          color: #fff; position: relative; z-index: 1;
          box-shadow: 0 8px 20px rgba(0,35,102,.3);
        }

        /* text */
        .dqn-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 16px; font-weight: 800;
          color: #0f172a; line-height: 1.2;
          letter-spacing: -0.02em; margin-bottom: 7px;
        }

        /* badges */
        .dqn-badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .dqn-badge {
          display: inline-flex; align-items: center; gap: 4px;
          height: 20px; padding: 0 8px;
          border-radius: 100px;
          font-size: 9.5px; font-weight: 800;
          letter-spacing: .05em; text-transform: uppercase;
          line-height: 1; white-space: nowrap;
        }

        /* subtitle */
        .dqn-sub {
          font-size: 12.5px; color: #64748b;
          line-height: 1.65; font-weight: 500;
          margin-bottom: 16px;
        }

        /* stats row */
        .dqn-stats {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 8px; margin-bottom: 16px;
        }
        .dqn-stat {
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 12px; padding: 10px 8px;
          text-align: center;
        }
        .dqn-stat-icon {
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 5px;
        }
        .dqn-stat-val {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 13px; font-weight: 800;
          color: #0f172a; line-height: 1;
          margin-bottom: 2px;
        }
        .dqn-stat-lbl {
          font-size: 9px; font-weight: 700;
          color: #94a3b8; text-transform: uppercase;
          letter-spacing: .08em;
        }

        /* actions */
        .dqn-actions {
          display: flex; gap: 8px; align-items: center;
          margin-bottom: 14px;
        }
        .dqn-later {
          padding: 0 16px; height: 44px;
          background: #f1f5f9; border: none;
          border-radius: 12px; font-size: 13px; font-weight: 700;
          color: #64748b; cursor: pointer;
          transition: all .2s; font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .dqn-later:hover { background: #e2e8f0; color: #334155; }

        .dqn-cta {
          flex: 1; height: 44px;
          background: linear-gradient(90deg, #002366 0%, #1d4ed8 100%);
          color: #fff; border: none; border-radius: 12px;
          font-size: 13.5px; font-weight: 800;
          cursor: pointer; font-family: 'Bricolage Grotesque', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          box-shadow: 0 6px 18px rgba(0,35,102,.28);
          transition: all .25s; letter-spacing: .01em;
        }
        .dqn-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0,35,102,.38);
          background: linear-gradient(90deg, #001540 0%, #1e40af 100%);
        }
        .dqn-cta:active { transform: translateY(0); }
        .dqn-cta-arrow { transition: transform .2s; }
        .dqn-cta:hover .dqn-cta-arrow { transform: translateX(3px); }

        /* timer footer */
        .dqn-timer-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 22px 14px;
        }
        .dqn-timer-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 9.5px; font-weight: 800;
          color: #94a3b8; text-transform: uppercase; letter-spacing: .1em;
        }
        .dqn-timer-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16,185,129,.25);
          animation: dqn-pulse 1s ease-in-out infinite;
        }
        @keyframes dqn-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:.5; transform:scale(1.3); }
        }
        .dqn-timer-arc {
          position: relative; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
        }
        .dqn-timer-arc svg { position: absolute; inset: 0; transform: rotate(-90deg); }
        .dqn-timer-num {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 11px; font-weight: 800;
          color: #002366; position: relative; z-index: 1;
          line-height: 1;
        }

        /* progress bar */
        .dqn-progress-track {
          height: 3px; background: #f1f5f9;
        }
        .dqn-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #002366 0%, #10b981 100%);
          transform-origin: left center;
        }
      `}</style>

            <div className="dqn-wrap">
                <div className="dqn-card" ref={cardRef}>

                    {/* top strip */}
                    <div className="dqn-strip" />

                    {/* close */}
                    <button className="dqn-close" onClick={() => triggerClose()}>
                        <FiX size={15} />
                    </button>

                    {/* inner */}
                    <div className="dqn-inner">

                        {/* header */}
                        <div className="dqn-header">
                            <div className="dqn-icon-wrap">
                                <div className="dqn-icon-glow" ref={glowRef} />
                                <div className="dqn-icon" ref={iconRef}>
                                    <FiZap size={24} fill="#fff" />
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="dqn-title">{quizTitle}</div>
                                <div className="dqn-badges">
                                    <span className="dqn-badge" style={{ background: '#EEF2FF', color: '#002366' }}>
                                        <FiZap size={9} fill="currentColor" /> +{xpReward} XP
                                    </span>
                                    <span className="dqn-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                                        <FiClock size={9} /> {quizDurationSeconds} sec
                                    </span>
                                    <span className="dqn-badge" style={{ background: '#fffbeb', color: '#d97706' }}>
                                        <FiStar size={9} fill="currentColor" /> Daily
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* subtitle */}
                        <p className="dqn-sub">{quizSubtitle}</p>

                        {/* stats */}
                        <div className="dqn-stats">
                            {[
                                { icon: <FiTarget size={14} color="#002366" />, val: String(questionCount), lbl: 'Questions' },
                                { icon: <FiAward size={14} color="#059669" />, val: `+${xpReward} XP`, lbl: 'Reward' },
                                { icon: <FiClock size={14} color="#d97706" />, val: `${quizDurationSeconds}s`, lbl: 'Time' },
                            ].map((s, i) => (
                                <div className="dqn-stat" key={i}>
                                    <div className="dqn-stat-icon">{s.icon}</div>
                                    <div className="dqn-stat-val">{s.val}</div>
                                    <div className="dqn-stat-lbl">{s.lbl}</div>
                                </div>
                            ))}
                        </div>

                        {/* actions */}
                        <div className="dqn-actions">
                            <button className="dqn-later" onClick={() => triggerClose()}>Later</button>
                            <button className="dqn-cta" onClick={handleTakeQuiz}>
                                Start Now
                                <FiChevronRight size={17} className="dqn-cta-arrow" />
                            </button>
                        </div>
                    </div>

                    {/* timer row */}
                    <div className="dqn-timer-row">
                        <div className="dqn-timer-label">
                            <div className="dqn-timer-dot" />
                            Auto-dismisses
                        </div>
                        {/* SVG arc countdown */}
                        <div className="dqn-timer-arc">
                            <svg width="36" height="36" viewBox="0 0 48 48">
                                {/* track */}
                                <circle cx="24" cy="24" r={r} fill="none"
                                    stroke="#e2e8f0" strokeWidth="3.5" />
                                {/* fill */}
                                <circle cx="24" cy="24" r={r} fill="none"
                                    stroke="url(#dqn-arc-grad)" strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeDasharray={circ}
                                    strokeDashoffset={circ * (1 - pct)}
                                    style={{ transition: 'stroke-dashoffset .9s linear' }}
                                />
                                <defs>
                                    <linearGradient id="dqn-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#002366" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span className="dqn-timer-num">{secondsLeft}s</span>
                        </div>
                    </div>

                    {/* progress bar */}
                    <div className="dqn-progress-track">
                        <div className="dqn-progress-fill" ref={progressRef} />
                    </div>

                </div>
            </div>
        </>
    );
};

export default DailyQuizNotification;
