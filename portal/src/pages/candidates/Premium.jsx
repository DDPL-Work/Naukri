import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FiCheck, FiZap, FiArrowRight, FiUsers, FiSearch,
    FiBarChart2, FiMessageCircle, FiChevronRight,
    FiFilter, FiTarget, FiPhoneCall, FiBell, FiInbox, FiMail,
    FiMenu, FiX
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';

function useInView(threshold = 0.12) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true); },
            { threshold }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);
    return [ref, visible];
}

function useScrollY() {
    const [y, setY] = useState(0);
    useEffect(() => {
        const fn = () => setY(window.scrollY);
        window.addEventListener('scroll', fn, { passive: true });
        return () => window.removeEventListener('scroll', fn);
    }, []);
    return y;
}

function FadeIn({ children, delay = 0, style = {} }) {
    const [ref, visible] = useInView();
    return (
        <div ref={ref} style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
            ...style
        }}>
            {children}
        </div>
    );
}

const STATS = [
    { value: '85%+', label: "of India's premium white-collar professionals on PremiumX" },
    { value: '75%+', label: 'of premium talent seeking opportunities is active on PremiumX' },
    { value: '70%+', label: 'of IIM grads register on PremiumX within 3 years' },
    { value: '30%+', label: 'YOY growth in premium talent dataset on MavenX' },
];

const ESSENTIALS = [
    { icon: <FiUsers size={22} />, title: 'Talent Availability', desc: "A large, active pool of premium candidates — 85%+ of India's top talent (CTC>30L) in one place.", color: '#002366' },
    { icon: <FiSearch size={22} />, title: 'Faster Discovery', desc: 'Fast and precise identification of the right profiles through AI-powered matching algorithms.', color: '#10b981' },
    { icon: <FiMessageCircle size={22} />, title: 'Easier Connect', desc: "Engaging candidates across the channels where they're most responsive — WhatsApp, email, and more.", color: '#6366f1' },
    { icon: <FiBarChart2 size={22} />, title: 'Cost-Efficient Hiring', desc: 'Maximising outcomes while minimising spend — the most ROI-positive premium hiring product in India.', color: '#f59e0b' },
];

const DISCOVERY_FEATURES = [
    {
        num: '01',
        title: 'A New Matching Algorithm — Built for Premium Hiring',
        desc: "MavenPremiumX's search algorithm is built specifically to surface the most relevant premium talent pool. It leverages industry context when reading candidate profiles, prioritises premium-fit candidates in the results, and personalises ranking based on each recruiter's past activity and preferences.",
        outcome: 'The result: refined shortlists, higher relevance, and more time spent on the candidates who actually matter.',
        pillars: [
            { icon: <FiTarget size={18} />, label: 'Personalisation', sub: 'Understands your past activity and preferences' },
            { icon: <FiFilter size={18} />, label: 'Noise Removal', sub: 'Filters inaccurate and non-premium profiles' },
            { icon: <FiSearch size={18} />, label: 'Precise Matching', sub: 'Leverages candidate profiles with industry context' },
        ],
    },
    {
        num: '02',
        title: 'Active & Passive Premium Candidates — One Unified View',
        desc: "The most valuable candidate for a senior role is often the one who isn't actively looking. MavenPremiumX brings active job-seekers (updated in the last six months) and passive premium professionals together in the same unified view, so recruiters can evaluate the full universe of relevant talent in a single workflow.",
        outcome: 'No relevant candidates are ever missed.',
        profiles: ['Active Profiles', 'Passive Profiles'],
    },
    {
        num: '03',
        title: 'Premium Shortlisting Filters — Exclusive to MavenPremiumX',
        desc: "The advanced filters help find the most relevant candidates much faster. These filters reflect the exact criteria senior recruiters weigh when shortlisting — and they're exclusive to MavenPremiumX.",
        filters: [
            { label: 'NChecked Profiles', desc: "Surface only candidates whose critical details have been cross-checked by Maven's team." },
            { label: 'Similar Companies', desc: 'Finds candidates from organisations operating in similar industries, scale, and more.' },
            { label: 'Top Institutes', desc: 'Identify candidates from IITs, NITs, IIMs, and other premium institutions in one click.' },
        ],
    },
    {
        num: '04',
        title: 'AI-Powered Recommendations — Within Your Existing Workflow',
        badge: 'Coming Soon',
        desc: 'While searching for candidates, MavenPremiumX intelligently recommends additional relevant talent from our extended network — so the reach of your search expands without changing your process.',
    },
    {
        num: '05',
        title: 'PremiumX Assist — Expert Hiring Assistance Service',
        desc: 'PremiumX Assist is a paid, expert-led hiring support service built specifically for premium and leadership roles. A dedicated team of expert recruiters handle sourcing and shortlisting of top-quality talent, so your team can focus on interviewing only the best candidates.',
    },
];

const CONNECT_FEATURES = [
    {
        title: 'Faster Connect Through Multiple Channels',
        desc: 'MavenPremiumX connects you to premium talent across the channels they are most active in — increasing response rates and reducing manual effort for the recruiter.',
        channels: [
            { icon: <FiBell size={20} />, label: 'Notifications', color: '#f59e0b' },
            { icon: <FaWhatsapp size={20} />, label: 'WhatsApp', color: '#10b981' },
            { icon: <FiPhoneCall size={20} />, label: 'Automated Call', color: '#6366f1' },
            { icon: <FiMail size={20} />, label: 'Email', color: '#002366' },
            { icon: <FiInbox size={20} />, label: 'Maven Inbox', color: '#ec4899' },
        ],
    },
    {
        title: 'NChecked Profiles — Cross-Verified by Maven',
        desc: "For senior hires, verifying critical candidate details is one of the most time-consuming parts of the process. With NChecked, Maven's team has already done that legwork — 14+ key candidate details are cross-checked. Recruiters move straight to the conversations that matter.",
        checks: ['Current CTC Breakup', 'Current Company Duration', 'Notice Period', 'Current Designation', 'Current Location', 'Job Search Status', 'Preferred Location', 'Skills'],
    },
    {
        title: 'Concierge Support',
        desc: 'Concierge support enables expert-led assistance to help recruiters source and hire premium talent more effectively. Your dedicated Maven expert acts as an extension of your team — available whenever the hiring stakes are highest.',
    },
];

// Header height constants — single source of truth
const PROMO_H = 40;   // promo strip
const NAV_H = 72;   // nav bar
const HEADER_H = PROMO_H + NAV_H; // 112px total

export default function Premium() {
    const scrollY = useScrollY();
    const navScrolled = scrollY > 50;
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div style={{
            background: '#f8fafc',
            minHeight: '100vh',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            color: '#1e293b'
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy: #002366; --navy-d: #001540;
          --green: #10b981; --gd: #0da371;
          --s50: #f8fafc; --s100: #f1f5f9; --s200: #e2e8f0;
          --s400: #94a3b8; --s500: #64748b; --s600: #475569; --s900: #0f172a;
          --fd: 'Bricolage Grotesque', sans-serif;
          --header-h: ${HEADER_H}px;
        }

        /* ─── NAV LINKS ─── */
        .pnl {
          font-size: 13.5px; font-weight: 700; text-decoration: none;
          color: rgba(255,255,255,0.75); font-family: var(--fd);
          letter-spacing: .02em; transition: color .25s;
        }
        .sc .pnl { color: var(--s500); }
        .pnl:hover { color: #fff; }
        .sc .pnl:hover { color: var(--navy); }

        /* Logo invert when on dark hero */
        .nb:not(.sc) .logo-img { filter: invert(1) brightness(2); }
        .logo-img { height: 30px; display: block; transition: filter .3s; }

        /* ─── HERO ─── */
        .hero {
          position: relative;
          /* Extended to top so header is transparent over black */
          height: 100vh;
          min-height: 650px;
          max-height: 1000px;
          background: #000;
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        /* Gradient overlays */
        .ho-left {
          position: absolute; top: 0; left: 0; bottom: 0; width: 62%;
          background: linear-gradient(to right, rgba(0,0,0,.96) 0%, rgba(0,0,0,.82) 55%, transparent 100%);
          z-index: 2; pointer-events: none;
        }
        .ho-top {
          position: absolute; top: 0; left: 0; right: 0; height: 180px;
          background: linear-gradient(to bottom, rgba(0,0,0,.85), transparent);
          z-index: 2; pointer-events: none;
        }
        .ho-bot {
          position: absolute; bottom: 0; left: 0; right: 0; height: 200px;
          background: linear-gradient(to top, #000 0%, transparent 100%);
          z-index: 2; pointer-events: none;
        }

        /* ─── SPLINE CONTAINER — no tricks, just absolute fill ─── */
        .spline-wrap {
          position: absolute;
          top: 0; right: 0;
          width: 60%; height: 100%;
          z-index: 1;
          overflow: hidden;
        }
        .spline-wrap iframe {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          border: none;
          background: transparent;
        }
        /* Ambient glow behind 3D scene */
        .spline-glow {
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(ellipse 75% 65% at 65% 50%, rgba(16,185,129,.16) 0%, transparent 70%);
        }

        /* ─── HERO CONTENT ─── */
        .hero-inner {
          position: relative; z-index: 10;
          width: 100%; max-width: 1280px;
          margin: 0 auto;
          padding: ${HEADER_H}px 56px 0;
        }
        .hero-text {
          max-width: 560px;
        }

        /* ─── BUTTONS ─── */
        .btn-primary {
          display: inline-flex; align-items: center; gap: 9px;
          padding: 15px 34px; background: var(--green); color: #fff;
          font-weight: 800; font-size: 14.5px; border-radius: 100px;
          border: none; cursor: pointer; font-family: var(--fd);
          letter-spacing: .02em; text-decoration: none;
          box-shadow: 0 8px 28px rgba(16,185,129,.35);
          transition: all .25s; white-space: nowrap;
        }
        .btn-primary:hover { background: var(--gd); transform: translateY(-2px); box-shadow: 0 14px 36px rgba(16,185,129,.45); }

        .btn-ghost {
          display: inline-flex; align-items: center;
          padding: 14px 32px; background: rgba(255,255,255,.07); color: #fff;
          font-weight: 700; font-size: 14.5px; border-radius: 100px;
          border: 1.5px solid rgba(255,255,255,.22); cursor: pointer;
          font-family: var(--fd); text-decoration: none;
          backdrop-filter: blur(12px); transition: all .25s; white-space: nowrap;
        }
        .btn-ghost:hover { background: rgba(255,255,255,.13); border-color: rgba(255,255,255,.4); }

        /* ─── ANIMATIONS ─── */
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes modalEntry {
          from { opacity: 0; transform: scale(.95) translateY(20px); }
          to   { opacity: 1; transform: scale(1)  translateY(0); }
        }

        /* ─── SECTION HELPERS ─── */
        .section-tag {
          display: inline-block; font-size: 10px; font-weight: 800;
          letter-spacing: .22em; text-transform: uppercase;
          color: #10b981; font-family: var(--fd); margin-bottom: 12px;
        }
        .h2 {
          font-family: var(--fd); font-weight: 800; color: #0f172a;
          letter-spacing: -0.03em; line-height: 1.06;
        }
        .divider {
          width: 44px; height: 3px; border-radius: 3px;
          background: linear-gradient(90deg, #002366, #10b981);
          margin: 16px auto 0;
        }

        /* ─── FILTER PILL ─── */
        .filter-pill {
          display: flex; gap: 12px; align-items: flex-start;
          padding: 16px 20px; background: #f8fafc;
          border: 1.5px solid #e2e8f0; border-radius: 14px; transition: all .2s;
        }
        .filter-pill:hover { border-color: #a7f3d0; background: #ecfdf5; }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 960px) {
          .spline-wrap { width: 100%; opacity: .3; }
          .ho-left { width: 100%; background: rgba(0,0,0,.75); }
          .hero-text { max-width: 100%; }
          .hero-inner { padding: 0 32px; }
        }
        @media (max-width: 600px) {
          .hero { height: auto; min-height: calc(100svh - ${HEADER_H}px); padding: 48px 0 60px; }
          .hero-inner { padding: 0 24px; }
        }
        .mobile-menu-btn { display: none; background: none; border: none; cursor: pointer; color: #fff; padding: 5px; }
        .nav-menu-wrapper { display: flex; align-items: center; justify-content: space-between; flex: 1; }
        @media (max-width: 1024px) {
          .mobile-menu-btn { display: block; }
          .nav-menu-wrapper { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: #0a0a0a; padding: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
          .nav-menu-wrapper.mobile-open { display: flex; }
          .nav-links { display: flex !important; flex-direction: column; width: 100%; align-items: flex-start; margin-bottom: 20px; }
          .pnl { margin-bottom: 15px; }
          .nav-menu-wrapper button { width: 100%; margin-top: 10px; }
        }
      `}</style>

            {/* ══════════════ HEADER ══════════════ */}
            <header
                className={`nb ${navScrolled ? 'sc' : ''}`}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                    background: navScrolled ? 'rgba(255,255,255,.98)' : 'transparent',
                    borderBottom: navScrolled ? '1px solid #e2e8f0' : '1px solid transparent',
                    backdropFilter: navScrolled ? 'blur(24px)' : 'none',
                    transition: 'all .4s',
                }}
            >
                {/* Promo strip — fixed height PROMO_H */}
                <div style={{
                    height: PROMO_H,
                    background: 'linear-gradient(90deg,#001540,#002b7a,#001540)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 5s linear infinite',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 12, color: '#fff',
                    fontSize: 11, fontWeight: 800, letterSpacing: '.15em',
                    textTransform: 'uppercase', fontFamily: 'var(--fd)',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                }}>
                    <FiZap size={11} fill="#6ee7b7" color="#6ee7b7" />
                    <span>Experience India's Most Advanced Premium Hiring Platform</span>
                    <FiZap size={11} fill="#6ee7b7" color="#6ee7b7" />
                </div>

                {/* Nav bar — fixed height NAV_H */}
                <nav style={{
                    height: NAV_H,
                    maxWidth: 1280, margin: '0 auto',
                    padding: '0 56px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div className="nav-brand-area" style={{ display: 'flex', alignItems: 'center' }}>
                        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <img src={mavenLogo} alt="MavenJobs" className="logo-img" />
                        </Link>
                        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                        </button>
                    </div>

                    <div className={`nav-menu-wrapper ${isMobileMenuOpen ? "mobile-open" : ""}`}>
                    <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
                        {['#why|Why PremiumX', '#discovery|Discovery', '#connect|Connect', '#get-started|Get Started'].map(item => {
                            const [href, label] = item.split('|');
                            return <a key={href} href={href} className="pnl">{label}</a>;
                        })}
                    </div>

                    <button
                        style={{
                            padding: '10px 24px',
                            background: navScrolled ? '#002366' : 'rgba(255,255,255,.1)',
                            color: '#fff',
                            border: navScrolled ? 'none' : '1px solid rgba(255,255,255,.22)',
                            borderRadius: 12, fontSize: 13, fontWeight: 800,
                            cursor: 'pointer', fontFamily: 'var(--fd)',
                            backdropFilter: 'blur(8px)', transition: 'all .2s',
                            flexShrink: 0,
                        }}
                        onClick={() => setShowBillingModal(true)}
                    >
                        Get PremiumX
                    </button>
                    </div>
                </nav>
            </header>

            {/* ══════════════ HERO ══════════════ */}
            <section className="hero">
                {/* Overlays */}
                <div className="ho-top" />
                <div className="ho-left" />
                <div className="ho-bot" />

                {/* Spline 3D — absolutely fills right 60% */}
                <div className="spline-wrap">
                    <div className="spline-glow" />
                    <iframe
                        src="https://my.spline.design/cubeandballs-D3RUkVGuU3utMSRsowveR7I7/"
                        title="Spline 3D Visual"
                        allowFullScreen
                    />
                </div>

                {/* Text content */}
                <div className="hero-inner">
                    <div className="hero-text">

                        {/* Breadcrumb */}
                        <FadeIn delay={0}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22, fontSize: 12, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>
                                <Link to="/profile" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .2s' }}
                                    onMouseEnter={e => e.target.style.color = '#fff'}
                                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.4)'}>
                                    Profile
                                </Link>
                                <FiChevronRight size={12} style={{ opacity: .35 }} />
                                <span style={{ color: '#6ee7b7', fontWeight: 800 }}>PremiumX</span>
                            </div>
                        </FadeIn>

                        {/* AI badge */}
                        <FadeIn delay={80}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.28)',
                                color: '#6ee7b7', fontSize: 10.5, fontWeight: 800,
                                letterSpacing: '.18em', textTransform: 'uppercase',
                                padding: '7px 18px', borderRadius: 100, marginBottom: 28,
                                fontFamily: "'Bricolage Grotesque',sans-serif",
                                backdropFilter: 'blur(8px)',
                                marginLeft: -6
                            }}>
                                <FiZap size={11} fill="currentColor" />
                                AI-Powered Premium Talent Discovery
                            </div>
                        </FadeIn>

                        {/* Headline */}
                        <FadeIn delay={160}>
                            <h1 style={{
                                fontFamily: "'Bricolage Grotesque',sans-serif",
                                fontSize: 'clamp(42px, 4.8vw, 68px)',
                                fontWeight: 800, lineHeight: 1.04,
                                color: '#fff', marginBottom: 22,
                                letterSpacing: '-0.04em',
                                marginLeft: -10
                            }}>
                                Hire India's
                                <span style={{ display: 'block', color: '#10b981' }}>Top 1% of</span>
                                Premium Talent
                            </h1>
                        </FadeIn>

                        {/* Sub-copy */}
                        <FadeIn delay={240}>
                            <p style={{
                                fontSize: 16, color: 'rgba(255,255,255,.52)',
                                lineHeight: 1.82, marginBottom: 38,
                                maxWidth: 460, fontWeight: 400,
                            }}>
                                Hiring premium talent is fundamentally different from hiring at scale. The pool is smaller, the signals are more nuanced, and the cost of a wrong hire compounds for years.
                            </p>
                        </FadeIn>

                        {/* CTAs */}
                        <FadeIn delay={320}>
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 44 }}>
                                <button className="btn-primary" onClick={() => setShowBillingModal(true)}>
                                    Explore PremiumX <FiArrowRight size={16} />
                                </button>
                                <button className="btn-ghost" onClick={() => setShowBillingModal(true)}>
                                    Request a Demo
                                </button>
                            </div>
                        </FadeIn>

                        {/* Social proof */}
                        <FadeIn delay={400}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 16,
                                padding: '12px 20px',
                                background: 'rgba(255,255,255,.05)',
                                border: '1px solid rgba(255,255,255,.09)',
                                borderRadius: 16, backdropFilter: 'blur(10px)',
                            }}>
                                {/* Avatar stack */}
                                <div style={{ display: 'flex' }}>
                                    {[
                                        { bg: '#002366', label: 'IIM' },
                                        { bg: '#10b981', label: 'IIT' },
                                        { bg: '#6366f1', label: 'VP' },
                                        { bg: '#f59e0b', label: 'CXO' },
                                    ].map((a, i) => (
                                        <div key={i} style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: a.bg,
                                            border: '2.5px solid rgba(255,255,255,.12)',
                                            marginLeft: i === 0 ? 0 : -10,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 10, fontWeight: 800, color: '#fff',
                                            fontFamily: 'var(--fd)',
                                        }}>{a.label}</div>
                                    ))}
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                                        1,200+ companies hiring
                                    </div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', marginTop: 2 }}>
                                        Join India's top recruiters on PremiumX
                                    </div>
                                </div>
                            </div>
                        </FadeIn>

                    </div>
                </div>
            </section>

            {/* ══════════════ STATS ══════════════ */}
            <div style={{ background: '#000', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{
                    maxWidth: 1280, margin: '0 auto', padding: '0 28px',
                    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
                }}>
                    {STATS.map((s, i) => (
                        <div key={i}
                            style={{
                                padding: '36px 20px', textAlign: 'center',
                                borderRight: i < 3 ? '1px solid rgba(255,255,255,.05)' : 'none',
                                transition: 'background .2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{ fontFamily: 'var(--fd)', fontSize: 38, fontWeight: 800, color: '#10b981', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
                <div style={{ height: 80, background: 'linear-gradient(to bottom, #000, #f8fafc)' }} />
            </div>

            {/* ══════════════ WHY PREMIUMX ══════════════ */}
            <section id="why" style={{ background: '#fff', padding: '88px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 56px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <span className="section-tag">WHY PREMIUMX</span>
                        <h2 className="h2" style={{ fontSize: 'clamp(30px,3.8vw,50px)' }}>Why Premium Hiring Needs a Curated Experience</h2>
                        <div className="divider" />
                        <p style={{ fontSize: 16, color: 'var(--s500)', maxWidth: 600, margin: '20px auto 0', lineHeight: 1.75 }}>
                            The demand for India's premium talent is growing at 20% CAGR. Top professionals need a discovery experience that values their time and expertise.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
                        {ESSENTIALS.map((e, i) => (
                            <FadeIn key={i} delay={i * 90}>
                                <div
                                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 24, padding: '40px 32px', height: '100%', transition: 'all .3s' }}
                                    onMouseEnter={el => { el.currentTarget.style.borderColor = 'rgba(0,35,102,.2)'; el.currentTarget.style.transform = 'translateY(-5px)'; el.currentTarget.style.boxShadow = '0 20px 40px rgba(0,35,102,.06)'; }}
                                    onMouseLeave={el => { el.currentTarget.style.borderColor = '#e2e8f0'; el.currentTarget.style.transform = 'translateY(0)'; el.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${e.color}12`, border: `1px solid ${e.color}30`, color: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
                                        {e.icon}
                                    </div>
                                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 19, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{e.title}</h3>
                                    <p style={{ fontSize: 14.5, color: '#64748b', lineHeight: 1.65 }}>{e.desc}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════ DISCOVERY ENGINE ══════════════ */}
            <section id="discovery" style={{ background: '#f0f4fb', padding: '88px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 56px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <span className="section-tag">DISCOVERY ENGINE</span>
                        <h2 className="h2" style={{ fontSize: 'clamp(30px,3.8vw,50px)' }}>A New Search for the Top 1%</h2>
                        <div className="divider" />
                        <p style={{ fontSize: 16, color: 'var(--s500)', maxWidth: 600, margin: '20px auto 0', lineHeight: 1.75 }}>
                            The discovery process for senior talent is fundamentally different. Our AI engine is trained on industry-specific context to surface the right relevance.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {DISCOVERY_FEATURES.map((feat, i) => (
                            <FadeIn key={i} delay={i * 50}>
                                <div
                                    style={{ background: '#fff', border: '1px solid var(--s200)', borderRadius: 24, padding: '44px', position: 'relative', overflow: 'hidden', transition: 'all .3s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,35,102,.15)'; e.currentTarget.style.boxShadow = '0 16px 56px rgba(0,35,102,.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--s200)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {/* Top gradient bar */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)' }} />

                                    <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
                                        <div style={{ fontFamily: 'var(--fd)', fontSize: 52, fontWeight: 800, color: 'var(--s100)', lineHeight: 1, letterSpacing: '-0.04em', userSelect: 'none', flexShrink: 0 }}>
                                            {feat.num}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                <h3 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(18px,2.2vw,23px)', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                                    {feat.title}
                                                </h3>
                                                {feat.badge && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: '#EEF2FF', border: '1px solid #c7d2fe', borderRadius: 100, fontSize: 10.5, fontWeight: 800, color: 'var(--navy)', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'var(--fd)', flexShrink: 0 }}>
                                                        <FiZap size={10} fill="currentColor" /> {feat.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 15, color: 'var(--s600)', lineHeight: 1.78, marginBottom: feat.outcome || feat.pillars || feat.filters || feat.profiles ? 20 : 0 }}>
                                                {feat.desc}
                                            </p>

                                            {feat.outcome && (
                                                <div style={{ padding: '14px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, fontSize: 14, color: '#065f46', fontWeight: 600, lineHeight: 1.6, marginBottom: feat.pillars ? 24 : 0 }}>
                                                    <FiCheck size={14} style={{ display: 'inline', marginRight: 7, verticalAlign: 'middle' }} />
                                                    {feat.outcome}
                                                </div>
                                            )}

                                            {feat.pillars && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 20 }}>
                                                    {feat.pillars.map((p, pi) => (
                                                        <div key={pi}
                                                            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '20px 16px', textAlign: 'center', transition: 'all .25s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#EEF2FF'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                                        >
                                                            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#002366' }}>{p.icon}</div>
                                                            <div style={{ fontFamily: 'var(--fd)', fontSize: 13.5, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>{p.label}</div>
                                                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{p.sub}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {feat.profiles && (
                                                <div style={{ marginTop: 20, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                                                        {feat.profiles.map((p, pi) => (
                                                            <div key={pi} style={{ flex: 1, padding: '12px 20px', textAlign: 'center', background: pi === 0 ? '#002366' : 'transparent', fontFamily: 'var(--fd)', fontSize: 13, fontWeight: 800, color: pi === 0 ? '#fff' : '#64748b', borderRight: pi === 0 ? '1px solid #e2e8f0' : 'none' }}>{p}</div>
                                                        ))}
                                                    </div>
                                                    {[
                                                        { text: 'Senior Director · 17 yrs · ₹1.4Cr', status: 'Active', active: true },
                                                        { text: 'VP Operations · 14 yrs · ₹95L', status: 'Passive', active: false },
                                                        { text: 'Chief of Staff · 11 yrs · ₹78L', status: 'Active', active: true },
                                                    ].map((row, ri) => (
                                                        <div key={ri} style={{ padding: '13px 20px', borderBottom: ri < 2 ? '1px solid #f1f5f9' : 'none', fontSize: 13, color: '#475569', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span>{row.text}</span>
                                                            <span style={{ fontSize: 11.5, fontWeight: 700, color: row.active ? '#10b981' : '#f59e0b', background: row.active ? '#ecfdf5' : '#fffbeb', padding: '2px 10px', borderRadius: 100 }}>{row.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {feat.filters && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                                                    {feat.filters.map((f, fi) => (
                                                        <div key={fi} className="filter-pill">
                                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                                <FiCheck size={14} color="#10b981" strokeWidth={3} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 3 }}>{f.label}</div>
                                                                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════ CONNECT ══════════════ */}
            <section id="connect" style={{ background: '#fff', padding: '88px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 56px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <span className="section-tag">MULTI-CHANNEL CONNECT</span>
                        <h2 className="h2" style={{ fontSize: 'clamp(30px,3.8vw,50px)' }}>Engage Candidates Where They Are</h2>
                        <div className="divider" />
                        <p style={{ fontSize: 16, color: 'var(--s500)', maxWidth: 600, margin: '20px auto 0', lineHeight: 1.75 }}>
                            Don't just wait for applications. Reach out to premium talent across WhatsApp, Email, and automated calls to increase response rates by 3×.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28 }}>
                        {CONNECT_FEATURES.map((feat, i) => (
                            <FadeIn key={i} delay={i * 90}>
                                <div
                                    style={{ background: '#f8fafc', border: '1px solid var(--s200)', borderRadius: 24, padding: '44px', height: '100%', transition: 'all .3s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,35,102,.15)'; e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,35,102,.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--s200)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 21, fontWeight: 800, color: 'var(--navy)', marginBottom: 14 }}>{feat.title}</h3>
                                    <p style={{ fontSize: 15, color: 'var(--s600)', lineHeight: 1.72, marginBottom: 28 }}>{feat.desc}</p>
                                    {feat.channels && (
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            {feat.channels.map((ch, ci) => (
                                                <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#fff', border: '1px solid var(--s200)', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--s600)' }}>
                                                    <span style={{ color: ch.color }}>{ch.icon}</span>
                                                    {ch.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {feat.checks && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            {feat.checks.map((c, ci) => (
                                                <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--s500)' }}>
                                                    <FiCheck size={14} color="var(--green)" />
                                                    {c}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════ CTA ══════════════ */}
            <section id="get-started" style={{ background: 'linear-gradient(135deg,#050e24 0%,#002366 100%)', padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: .05, backgroundImage: 'radial-gradient(#fff 1px,transparent 1px)', backgroundSize: '30px 30px' }} />
                <div style={{ maxWidth: 740, margin: '0 auto', textAlign: 'center', padding: '0 44px', position: 'relative', zIndex: 2 }}>
                    <FadeIn>
                        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(32px,4vw,56px)', fontWeight: 800, color: '#fff', marginBottom: 20, lineHeight: 1.08 }}>Ready to hire the best?</h2>
                        <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', marginBottom: 44, lineHeight: 1.65 }}>Join 1,200+ leading companies discovering India's premium white-collar talent on MavenPremiumX.</p>
                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={() => setShowBillingModal(true)}>Get Started Now <FiArrowRight size={17} /></button>
                            <button className="btn-ghost" onClick={() => setShowBillingModal(true)}>Talk to Experts</button>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ══════════════ FOOTER ══════════════ */}
            <footer style={{ background: '#050e24', padding: '80px 0 40px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 56px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 60, flexWrap: 'wrap', marginBottom: 56 }}>
                        <div style={{ flex: '0 0 300px' }}>
                            <img src={mavenLogo} alt="MavenJobs" style={{ height: 30, marginBottom: 22, filter: 'invert(1) brightness(2)' }} />
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', lineHeight: 1.65 }}>
                                MavenPremiumX is India's most advanced platform for premium white-collar talent discovery and engagement.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
                            {[
                                { title: 'Product', links: ['Why PremiumX', 'Discovery', 'Connect', 'Pricing'] },
                                { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
                                { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Refunds'] },
                            ].map((group, i) => (
                                <div key={i}>
                                    <h4 style={{ fontFamily: 'var(--fd)', fontSize: 12, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 18 }}>{group.title}</h4>
                                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {group.links.map((l, j) => (
                                            <li key={j}>
                                                <a href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', textDecoration: 'none', transition: 'color .2s' }}
                                                    onMouseEnter={e => e.target.style.color = '#fff'}
                                                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.38)'}>{l}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.28)' }}>© 2026 MavenJobs Private Limited · All rights reserved</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.28)' }}>Made with ❤️ in India</p>
                    </div>
                </div>
            </footer>

            {/* ══════════════ BILLING MODAL ══════════════ */}
            {showBillingModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,15,40,.65)', backdropFilter: 'blur(14px)' }} onClick={() => setShowBillingModal(false)} />
                    <div style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: 1080, borderRadius: 32, overflow: 'hidden', boxShadow: '0 50px 100px -20px rgba(0,0,0,.4)', animation: 'modalEntry .4s cubic-bezier(.16,1,.3,1)' }}>
                        <button
                            style={{ position: 'absolute', top: 24, right: 24, background: '#f1f5f9', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, color: '#64748b' }}
                            onClick={() => setShowBillingModal(false)}
                        >
                            <FiChevronRight size={22} style={{ transform: 'rotate(90deg)' }} />
                        </button>

                        <div style={{ padding: '56px 56px 36px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EEF2FF', color: '#002366', fontSize: 11, fontWeight: 800, padding: '7px 18px', borderRadius: 100, marginBottom: 18, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--fd)' }}>
                                <FiZap size={13} fill="currentColor" /> PremiumX Billing
                            </div>
                            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 40, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Choose the perfect plan</h2>
                            <p style={{ fontSize: 16, color: '#64748b' }}>Scale your hiring with AI-powered discovery and cross-verified talent.</p>
                        </div>

                        <div style={{ padding: '0 40px 56px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
                            {[
                                { name: 'Starter', price: '₹9,999', period: '/month', desc: 'Perfect for startups and small boutique firms.', features: ['50 NChecked Profiles', 'AI discovery algorithm', 'Basic support', 'Email connect'], color: '#94a3b8' },
                                { name: 'Professional', price: '₹24,999', period: '/month', desc: 'Built for high-growth teams and mid-sized companies.', features: ['250 NChecked Profiles', 'Advanced AI matching', 'Priority multi-channel connect', 'Account manager'], color: '#002366', popular: true },
                                { name: 'Enterprise', price: 'Custom', period: '', desc: 'Bespoke solutions for large enterprises.', features: ['Unlimited NChecked Profiles', 'Custom API integration', 'Dedicated concierge team', 'SLA guaranteed support'], color: '#10b981' },
                            ].map((plan, i) => (
                                <div key={i}
                                    style={{ position: 'relative', padding: '36px', background: plan.popular ? '#002366' : '#f8fafc', borderRadius: 22, border: plan.popular ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', flexDirection: 'column', color: plan.popular ? '#fff' : '#1e293b', transition: 'all .25s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 28px 56px -12px rgba(0,0,0,.16)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {plan.popular && <div style={{ position: 'absolute', top: 18, right: 18, background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', fontFamily: 'var(--fd)' }}>Most Popular</div>}
                                    <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{plan.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                                        <span style={{ fontSize: 34, fontWeight: 800 }}>{plan.price}</span>
                                        <span style={{ fontSize: 13, opacity: .6 }}>{plan.period}</span>
                                    </div>
                                    <p style={{ fontSize: 14, opacity: .65, marginBottom: 28, lineHeight: 1.5 }}>{plan.desc}</p>
                                    <div style={{ flex: 1, marginBottom: 32 }}>
                                        {plan.features.map((f, j) => (
                                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, fontSize: 14 }}>
                                                <FiCheck size={15} color={plan.popular ? '#10b981' : plan.color} />
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                    <button style={{ width: '100%', padding: '13px', background: plan.popular ? '#fff' : '#002366', color: plan.popular ? '#002366' : '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--fd)', transition: 'all .2s' }}>
                                        Get Started
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}