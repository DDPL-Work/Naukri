import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  FiArrowLeft, FiZap, FiTarget, FiAward, FiClock,
  FiChevronRight, FiShield, FiCheckCircle, FiTrendingUp,
  FiStar, FiUsers, FiBarChart2
} from 'react-icons/fi';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import { useAuth } from '../../AuthContext';
import authService from '../../services/authService';

const QUESTIONS = [
  {
    id: 1,
    topic: 'React',
    q: 'Which hook should you use to run a side effect after every render?',
    options: ['useMemo', 'useEffect', 'useCallback', 'useRef'],
    correct: 1,
  },
  {
    id: 2,
    topic: 'Node.js',
    q: 'What does the "event loop" in Node.js primarily handle?',
    options: [
      'Compiling JavaScript',
      'Managing async I/O callbacks',
      'Allocating memory',
      'Bundling modules',
    ],
    correct: 1,
  },
  {
    id: 3,
    topic: 'MongoDB',
    q: 'Which MongoDB operator finds documents where a field value is in an array?',
    options: ['$exists', '$in', '$all', '$elemMatch'],
    correct: 1,
  },
  {
    id: 4,
    topic: 'JavaScript',
    q: 'What is the output of: typeof null?',
    options: ['"null"', '"undefined"', '"object"', '"boolean"'],
    correct: 2,
  },
  {
    id: 5,
    topic: 'CSS',
    q: 'Which CSS property controls the stacking order of elements?',
    options: ['position', 'z-index', 'display', 'overflow'],
    correct: 1,
  },
];

/* ── Intro screen ─────────────────────────────── */
function IntroScreen({ onStart, quiz, ranking = [] }) {
  const cardRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 60, scale: .95 },
        { opacity: 1, y: 0, scale: 1, duration: .9, ease: 'power4.out', delay: .1 }
      );
      gsap.fromTo('.qi-item',
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: .55, stagger: .09, ease: 'power2.out', delay: .5 }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');

        /* background orbs */
        .qi-orb1 {
          position:absolute; top:-10%; right:-8%;
          width:500px; height:500px; border-radius:50%;
          background:radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 65%);
          pointer-events:none;
        }
        .qi-orb2 {
          position:absolute; bottom:-12%; left:-8%;
          width:480px; height:480px; border-radius:50%;
          background:radial-gradient(circle, rgba(16,185,129,.14) 0%, transparent 65%);
          pointer-events:none;
        }
        .qi-dots {
          position:absolute; inset:0;
          background-image:radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px);
          background-size:26px 26px; pointer-events:none;
        }

        /* card */
        .qi-card {
          position:relative; z-index:1;
          width:100%; max-width:880px;
          background:rgba(255,255,255,.03);
          border:1px solid rgba(255,255,255,.08);
          border-radius:32px;
          overflow:hidden;
          box-shadow:0 40px 100px rgba(0,0,0,.55);
          backdrop-filter:blur(24px);
          display:flex;
        }

        /* left panel */
        .qi-left {
          width:40%; flex-shrink:0;
          background:linear-gradient(170deg, #002366 0%, #001a52 100%);
          padding:48px 36px;
          display:flex; flex-direction:column; justify-content:space-between;
          position:relative; overflow:hidden;
        }
        .qi-left-pattern {
          position:absolute; inset:0;
          background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);
          background-size:18px 18px; pointer-events:none;
        }
        .qi-left-glow {
          position:absolute; bottom:-20%; left:-20%;
          width:260px; height:260px; border-radius:50%;
          background:radial-gradient(circle,rgba(16,185,129,.2) 0%,transparent 65%);
          pointer-events:none;
        }

        /* right panel */
        .qi-right {
          flex:1; padding:48px 44px;
          background:#fff; display:flex;
          flex-direction:column; justify-content:center;
        }

        /* stat cards */
        .qi-stat {
          padding:16px 14px; border-radius:16px;
          display:flex; flex-direction:column; gap:4px;
          transition:all .2s;
        }
        .qi-stat:hover { transform:translateY(-3px); }

        /* start button */
        .qi-start-btn {
          width:100%; padding:16px;
          background:linear-gradient(90deg, #002366 0%, #1d4ed8 100%);
          color:#fff; border:none; border-radius:16px;
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:15px; font-weight:800;
          cursor:pointer; letter-spacing:.02em;
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow:0 12px 32px rgba(0,35,102,.3);
          transition:all .25s;
        }
        .qi-start-btn:hover {
          transform:translateY(-3px);
          box-shadow:0 18px 44px rgba(0,35,102,.42);
        }
        .qi-start-btn:active { transform:translateY(0); }
        .qi-start-arrow { transition:transform .2s; }
        .qi-start-btn:hover .qi-start-arrow { transform:translateX(4px); }

        @media (max-width:640px) {
          .qi-card { flex-direction:column; }
          .qi-left  { width:100%; padding:36px 28px; }
          .qi-right { padding:32px 28px; }
        }
      `}</style>

      <div className="qi-orb1" /><div className="qi-orb2" /><div className="qi-dots" />

      <div className="qi-card" ref={cardRef}>
        {/* gradient top strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg,#002366,#2563eb,#10b981)',
          zIndex: 10,
        }} />

        {/* ── LEFT ── */}
        <div className="qi-left" ref={leftRef}>
          <div className="qi-left-pattern" /><div className="qi-left-glow" />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <Link to="/profile" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'rgba(255,255,255,.45)', textDecoration: 'none',
              fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
              textTransform: 'uppercase', marginBottom: 28,
              transition: 'color .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.85)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.45)'}
            >
              <FiArrowLeft size={13} /> Dashboard
            </Link>

            <img src={mavenLogo} alt="MavenJobs" style={{
              height: 26, display: 'block', marginBottom: 40,
              filter: 'invert(1) brightness(2)',
            }} />

            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'rgba(255,255,255,.1)',
              border: '1px solid rgba(255,255,255,.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 8px 24px rgba(0,0,0,.3)',
            }}>
              <FiZap size={28} color="#10b981" fill="#10b981" />
            </div>

            <h1 style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 'clamp(28px,3.5vw,38px)', fontWeight: 800,
              color: '#fff', lineHeight: 1.08,
              letterSpacing: '-0.04em', marginBottom: 12,
            }}>
              Your Daily<br />
              <span style={{ color: '#10b981' }}>Edge.</span>
            </h1>
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,.5)',
              lineHeight: 1.72, fontWeight: 500, maxWidth: 220,
            }}>
              60 seconds to prove your skills and climb the national leaderboard.
            </p>
          </div>

          {/* avatars */}
          <div className="qi-item" style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', gap: 12, marginTop: 40,
          }}>
            <div style={{ display: 'flex' }}>
              {[11, 12, 13, 14].map(i => (
                <img key={i} src={`https://i.pravatar.cc/100?img=${i}`} alt="User"
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: '2.5px solid #002366',
                    marginLeft: i === 11 ? 0 : -10,
                    objectFit: 'cover',
                  }} />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.8)', lineHeight: 1.2 }}>{ranking.length} ranked candidates</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>Top XP: {ranking[0]?.totalXp || 0}</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="qi-right" ref={rightRef}>

          <div className="qi-item" style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 8,
            }}>
              <div style={{ width: 28, height: 2, background: '#002366', borderRadius: 2 }} />
              <span style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 9, fontWeight: 800,
                color: '#002366', letterSpacing: '.2em', textTransform: 'uppercase',
              }}>Today's Challenge</span>
            </div>
            <h2 style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 'clamp(20px,2.8vw,26px)', fontWeight: 800,
              color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 6,
            }}>
              {quiz.title}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>
              {quiz.subtitle}
            </p>
          </div>

          {/* stat grid */}
          <div className="qi-item" style={{
            display: 'grid', gridTemplateColumns: 'repeat(2,1fr)',
            gap: 10, marginBottom: 24,
          }}>
            {[
              { icon: <FiTarget size={16} />, lbl: 'Questions', val: `${quiz.questions.length} Mixed`, bg: '#EEF2FF', ic: '#002366' },
              { icon: <FiClock size={16} />, lbl: 'Time Limit', val: `${quiz.durationSeconds} Seconds`, bg: '#f5f3ff', ic: '#7c3aed' },
              { icon: <FiAward size={16} />, lbl: 'Reward', val: `+${quiz.maxXp} XP`, bg: '#ecfdf5', ic: '#059669' },
              { icon: <FiTrendingUp size={16} />, lbl: 'Difficulty', val: 'Intermediate', bg: '#fff7ed', ic: '#d97706' },
            ].map((s, i) => (
              <div key={i} className="qi-stat" style={{ background: s.bg, border: '1px solid transparent' }}>
                <div style={{ color: s.ic, marginBottom: 4 }}>{s.icon}</div>
                <div style={{
                  fontFamily: "'Bricolage Grotesque',sans-serif",
                  fontSize: 14, fontWeight: 800, color: '#0f172a',
                }}>{s.val}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.1em' }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* perks */}
          <div className="qi-item" style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
            marginBottom: 24,
          }}>
            {[
              { icon: <FiCheckCircle size={14} color="#10b981" />, text: 'Boosts your profile visibility score' },
              { icon: <FiShield size={14} color="#10b981" />, text: 'Earns a verified skill badge at 100%' },
              { icon: <FiBarChart2 size={14} color="#10b981" />, text: 'Tracks progress on national leaderboard' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.icon}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{p.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="qi-item">
            <button className="qi-start-btn" onClick={onStart}>
              Start Challenge Now
              <FiChevronRight size={18} className="qi-start-arrow" />
            </button>
            <p style={{
              textAlign: 'center', marginTop: 14,
              fontSize: 10, color: '#94a3b8', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.12em',
            }}>
              Requires MavenJobs Verified Profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Quiz screen ──────────────────────────────── */
function QuizScreen({ questions, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(12);
  const [locked, setLocked] = useState(false);

  const progressBarRef = useRef(null);
  const cardRef = useRef(null);
  const timerTween = useRef(null);
  const intervalRef = useRef(null);

  const q = questions[current];

  /* countdown per question */
  useEffect(() => {
    setTimer(12); setSelected(null); setLocked(false);

    /* animate card in */
    gsap.fromTo(cardRef.current,
      { opacity: 0, x: 40 },
      { opacity: 1, x: 0, duration: .45, ease: 'power3.out' }
    );

    /* progress bar */
    if (progressBarRef.current) {
      gsap.set(progressBarRef.current, { scaleX: 1, transformOrigin: 'left center' });
      timerTween.current = gsap.to(progressBarRef.current, {
        scaleX: 0, duration: 12, ease: 'none',
        onComplete: () => advance(null),
      });
    }

    /* integer countdown */
    intervalRef.current = setInterval(() => setTimer(t => {
      if (t <= 1) { clearInterval(intervalRef.current); return 0; }
      return t - 1;
    }), 1000);

    return () => {
      timerTween.current?.kill();
      clearInterval(intervalRef.current);
    };
  }, [current]);

  const advance = (choiceIdx) => {
    if (locked) return;
    setLocked(true);
    timerTween.current?.kill();
    clearInterval(intervalRef.current);

    const correct = choiceIdx === q.correct;
    setSelected(choiceIdx);
    setAnswers(a => [...a, { questionId: q.id, selectedIndex: choiceIdx, correct }]);

    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent(c => c + 1);
      } else {
        const finalAnswers = [...answers, { questionId: q.id, selectedIndex: choiceIdx, correct }];
        const score = finalAnswers.filter(a => a.correct).length;
        onFinish(score, questions.length, finalAnswers);
      }
    }, 900);
  };

  const pct = ((current) / questions.length) * 100;

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f4fb',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'DM Sans',system-ui,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .qq-opt {
          width:100%; padding:14px 18px;
          background:#fff; border:2px solid #e2e8f0;
          border-radius:13px; text-align:left;
          font-family:'DM Sans',sans-serif;
          font-size:14px; font-weight:600; color:#334155;
          cursor:pointer; transition:all .18s;
          display:flex; align-items:center; gap:12px;
        }
        .qq-opt:not(:disabled):hover {
          border-color:rgba(0,35,102,.3);
          background:#EEF2FF; color:#002366;
          transform:translateX(4px);
        }
        .qq-opt.correct  { border-color:#10b981 !important; background:#ecfdf5 !important; color:#065f46 !important; }
        .qq-opt.wrong    { border-color:#ef4444 !important; background:#fef2f2 !important; color:#991b1b !important; }
        .qq-opt.dimmed   { opacity:.45; }
        .qq-opt:disabled { cursor:default; transform:none !important; }
        .qq-opt-letter {
          width:28px; height:28px; border-radius:8px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:12px; font-weight:800;
          background:#f1f5f9; color:#64748b;
          transition:all .18s;
        }
        .qq-opt.correct .qq-opt-letter { background:#10b981; color:#fff; }
        .qq-opt.wrong   .qq-opt-letter { background:#ef4444; color:#fff; }
        .qq-opt:not(:disabled):hover .qq-opt-letter { background:#002366; color:#fff; }
      `}</style>

      <div ref={cardRef} style={{
        width: '100%', maxWidth: 620,
        background: '#fff', borderRadius: 28,
        boxShadow: '0 20px 60px rgba(0,35,102,.1)',
        border: '1px solid #e2e8f0', overflow: 'hidden',
      }}>
        {/* top gradient strip */}
        <div style={{ height: 3, background: 'linear-gradient(90deg,#002366,#10b981)' }} />

        {/* header */}
        <div style={{ padding: '22px 28px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={mavenLogo} alt="MavenJobs" style={{ height: 22 }} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 20, padding: '0 9px', borderRadius: 100,
                background: '#EEF2FF',
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 9, fontWeight: 800, color: '#002366',
                letterSpacing: '.1em', textTransform: 'uppercase',
              }}>
                <FiZap size={9} fill="currentColor" /> Daily Quiz
              </div>
            </div>
            {/* timer badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 100,
              background: timer <= 4 ? '#fef2f2' : '#f1f5f9',
              border: `1px solid ${timer <= 4 ? '#fca5a5' : '#e2e8f0'}`,
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 13, fontWeight: 800,
              color: timer <= 4 ? '#dc2626' : '#002366',
              transition: 'all .3s',
            }}>
              <FiClock size={13} />
              {timer}s
            </div>
          </div>

          {/* overall progress */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          }}>
            <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6,
                background: 'linear-gradient(90deg,#002366,#10b981)',
                width: `${pct}%`, transition: 'width .5s ease',
              }} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, color: '#002366',
              fontFamily: "'Bricolage Grotesque',sans-serif",
              whiteSpace: 'nowrap',
            }}>
              {current + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* question */}
        <div style={{ padding: '0 28px 24px' }}>
          {/* topic badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            height: 18, padding: '0 9px', borderRadius: 4,
            background: '#ecfdf5', color: '#059669',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 9, fontWeight: 800, letterSpacing: '.1em',
            textTransform: 'uppercase', marginBottom: 14,
            border: '1px solid rgba(5,150,105,.2)',
          }}>{q.topic}</div>

          <p style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 'clamp(16px,2.2vw,19px)', fontWeight: 800,
            color: '#0f172a', lineHeight: 1.4,
            letterSpacing: '-0.02em', marginBottom: 22,
          }}>{q.q}</p>

          {/* timer progress bar */}
          <div style={{ height: 3, background: '#f1f5f9', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
            <div ref={progressBarRef} style={{
              height: '100%',
              background: `linear-gradient(90deg,${timer <= 4 ? '#ef4444' : '#002366'},${timer <= 4 ? '#fca5a5' : '#10b981'})`,
            }} />
          </div>

          {/* options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {q.options.map((opt, i) => {
              let cls = 'qq-opt';
              if (locked) {
                if (i === q.correct) cls += ' correct';
                else if (i === selected) cls += ' wrong';
                else cls += ' dimmed';
              }
              return (
                <button key={i} className={cls} disabled={locked}
                  onClick={() => advance(i)}>
                  <span className="qq-opt-letter">{['A', 'B', 'C', 'D'][i]}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p style={{
        marginTop: 20, fontSize: 10,
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.15em',
        color: '#94a3b8',
      }}>
        Powered by MavenAI · Intelligence Engine v4.2
      </p>
    </div>
  );
}

/* ── Results screen ───────────────────────────── */
function ResultsScreen({ score, total, xpEarned, submitError, onRetry }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current,
        { opacity: 0, scale: .92, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: .8, ease: 'elastic.out(1,.75)' }
      );
      gsap.fromTo('.qr-item',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: .5, stagger: .08, ease: 'power2.out', delay: .5 }
      );
    });
    return () => ctx.revert();
  }, []);

  const pct = Math.round((score / total) * 100);
  const grade = pct === 100 ? 'Perfect!' : pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good Job!' : pct >= 40 ? 'Keep Going!' : 'Try Again!';
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#002366' : pct >= 40 ? '#d97706' : '#ef4444';
  const xp = xpEarned ?? score * 10;

  /* donut */
  const R2 = 52; const circ2 = 2 * Math.PI * R2;

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f4fb',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'DM Sans',system-ui,sans-serif",
    }}>
      <div ref={cardRef} style={{
        width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: 28,
        boxShadow: '0 20px 60px rgba(0,35,102,.1)',
        border: '1px solid #e2e8f0', overflow: 'hidden',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#002366,#10b981)' }} />

        <div style={{ padding: '36px 36px 32px', textAlign: 'center' }}>
          {/* donut */}
          <div style={{
            position: 'relative', width: 128, height: 128,
            margin: '0 auto 20px',
          }}>
            <svg width="128" height="128" viewBox="0 0 128 128"
              style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="64" cy="64" r={R2} fill="none"
                stroke="#f1f5f9" strokeWidth="9" />
              <circle cx="64" cy="64" r={R2} fill="none"
                stroke={color} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={circ2}
                strokeDashoffset={circ2 * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 1s ease .4s' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1,
              }}>{score}/{total}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>{pct}%</span>
            </div>
          </div>

          {submitError && (
            <p className="qr-item" style={{ color: '#dc2626', fontSize: 12, marginBottom: 12, fontWeight: 700 }}>
              {submitError}
            </p>
          )}

          <div className="qr-item" style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 26, fontWeight: 800, color,
            letterSpacing: '-0.03em', marginBottom: 6,
          }}>{grade}</div>
          <p className="qr-item" style={{
            fontSize: 13.5, color: '#64748b', lineHeight: 1.65, marginBottom: 24,
          }}>
            You answered {score} of {total} questions correctly.
          </p>

          {/* XP earned */}
          <div className="qr-item" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 20px', background: '#EEF2FF',
            border: '1px solid rgba(0,35,102,.12)',
            borderRadius: 14, marginBottom: 24,
          }}>
            <FiZap size={18} color="#002366" fill="#002366" />
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 18, fontWeight: 800, color: '#002366', lineHeight: 1,
              }}>+{xp} XP Earned</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Added to your profile score</div>
            </div>
          </div>

          {/* stat pills */}
          <div className="qr-item" style={{
            display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap',
          }}>
            {[
              { icon: <FiStar size={13} />, lbl: `${score} Correct`, bg: '#ecfdf5', c: '#059669' },
              { icon: <FiUsers size={13} />, lbl: 'Daily Streak: 3', bg: '#EEF2FF', c: '#002366' },
              { icon: <FiAward size={13} />, lbl: 'Top 15%', bg: '#fffbeb', c: '#d97706' },
            ].map((p, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 100,
                background: p.bg, color: p.c,
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 11, fontWeight: 800,
                border: `1px solid ${p.c}22`,
              }}>
                {p.icon}{p.lbl}
              </div>
            ))}
          </div>

          {/* actions */}
          <div className="qr-item" style={{ display: 'flex', gap: 10 }}>
            <button onClick={onRetry} style={{
              flex: 1, padding: '13px',
              background: '#f1f5f9', border: 'none', borderRadius: 13,
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 13, fontWeight: 800, color: '#475569',
              cursor: 'pointer', transition: 'all .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              Try Again
            </button>
            <Link to="/profile" style={{
              flex: 2, padding: '13px',
              background: 'linear-gradient(90deg,#002366,#1d4ed8)',
              borderRadius: 13, textDecoration: 'none',
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 13, fontWeight: 800, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 8px 22px rgba(0,35,102,.25)',
              transition: 'all .25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,35,102,.35)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,35,102,.25)' }}
            >
              Back to Dashboard <FiChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main exported component ──────────────────── */
export default function DailyQuiz() {
  const navigate = useNavigate();
  const { user, openLogin } = useAuth();
  const [phase, setPhase] = useState('intro');   // intro | quiz | results
  const [quiz, setQuiz] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(QUESTIONS.length);
  const [xpEarned, setXpEarned] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let isMounted = true;

    if (!user && !localStorage.getItem('token')) {
      setLoading(false);
      setError('Please log in to play the daily quiz.');
      return undefined;
    }

    Promise.all([
      authService.getTodayQuiz(),
      authService.getQuizRanking().catch(() => ({ data: [] })),
    ])
      .then(([quizResponse, rankingResponse]) => {
        if (!isMounted) return;
        if (quizResponse?.success) {
          setQuiz(quizResponse.data);
          setTotal(quizResponse.data.questions.length);
          if (quizResponse.data.hasSubmitted) {
            setScore(quizResponse.data.previousResult?.score || 0);
            setXpEarned(quizResponse.data.previousResult?.xpEarned || 0);
            setPhase('results');
          }
        }
        setRanking(rankingResponse?.data || []);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to load today\'s quiz.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleFinish = async (finalScore, finalTotal, answers) => {
    setScore(finalScore);
    setTotal(finalTotal);
    setSubmitError('');

    try {
      const response = await authService.submitTodayQuiz(
        answers.map((answer) => ({
          questionId: answer.questionId,
          selectedIndex: answer.selectedIndex,
        })),
      );
      setXpEarned(response.data?.xpEarned ?? finalScore * (quiz?.xpPerCorrect || 10));
    } catch (err) {
      setXpEarned(finalScore * (quiz?.xpPerCorrect || 10));
      setSubmitError(err.message || 'Score saved locally, but server submission failed.');
    } finally {
      setPhase('results');
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: "'DM Sans',system-ui,sans-serif" }}>Loading quiz...</div>;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: "'DM Sans',system-ui,sans-serif", textAlign: 'center' }}>
        <div>
          <p style={{ fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>{error}</p>
          <button onClick={() => { openLogin?.(); navigate('/'); }} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: '#002366', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Log in</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {phase === 'intro' && <IntroScreen quiz={quiz} ranking={ranking} onStart={() => setPhase('quiz')} />}
      {phase === 'quiz' && (
        <QuizScreen questions={quiz.questions} onFinish={handleFinish} />
      )}
      {phase === 'results' && (
        <ResultsScreen score={score} total={total} xpEarned={xpEarned} submitError={submitError} onRetry={() => setPhase('quiz')} />
      )}
    </>
  );
}
