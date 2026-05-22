import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import {
    FiZap, FiAward, FiTrendingUp, FiTruck, FiHome, FiMonitor,
    FiPlusCircle, FiSend, FiLayers, FiShoppingCart, FiPlus,
    FiPhone, FiMail, FiCheck, FiX, FiArrowRight, FiTarget, FiActivity, FiHeart
} from 'react-icons/fi';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';

gsap.registerPlugin(ScrollTrigger);

/* ─── Data ──────────────────────────────────────────────── */
const CLIENTS = ['QVIA', 'J.P.Morgan', 'Labcorp', 'NatWest Group', 'Polaris', 'Publicis Sapient', 'Tech Mahindra', 'Adobe', 'Deloitte', 'Genpact'];

const FEATURES = [
    { icon: <FiZap size={20} />, title: 'Faster Time-to-Hire', desc: 'Reduces hiring time using multiple sourcing channels & AI-driven tools.', color: '#002366' },
    { icon: <FiAward size={20} />, title: 'Best ROI Guaranteed', desc: 'Fixed fee model with clear SLA & complete process visibility throughout.', color: '#10b981' },
    { icon: <FiTrendingUp size={20} />, title: 'Scalable Support', desc: 'Easily manage volume hiring with our expert on-demand hiring support.', color: '#6366f1' },
];

const STEPS = [
    { num: '01', title: 'Personalized Hiring Consultation', desc: 'Our recruitment experts connect with you to understand your specific hiring needs and requirements in depth.' },
    { num: '02', title: 'Sourcing & Shortlisting', desc: 'We source and shortlist best-fit candidates from multiple channels and share a curated list of consented profiles.' },
    { num: '03', title: 'Interview Scheduling', desc: 'We handle interview scheduling for all candidates you select, ensuring a smooth and efficient hiring process.' },
];

const PLANS = [
    { name: 'Basic', color: '#64748b', points: ['All roles across CTCs', 'Posting, screening & sharing relevant responses'] },
    { name: 'Pro', color: '#6366f1', points: ['Entry & mid-level mandates (CTC < 15L)', '5 interview-ready candidates'] },
    { name: 'Premium', color: '#002366', points: ['Premium & senior mandates (CTC > 15L)', '5 interview-ready candidates'], hot: true },
    { name: 'Campaign', color: '#10b981', points: ['All roles across CTCs for walk-ins', 'Footfall of up to 80 relevant candidates'] },
];

const DOMAINS = [
    { icon: <FiTruck size={18} />, name: 'Auto', sub: 'Design, Engineering, Quality' },
    { icon: <FiHome size={18} />, name: 'BFSI', sub: 'Finance, Risk, Compliance' },
    { icon: <FiMonitor size={18} />, name: 'IT', sub: 'AI/ML, DevOps, Security' },
    { icon: <FiPlusCircle size={18} />, name: 'Healthcare', sub: 'Medical, Pharma, Research' },
    { icon: <FiTarget size={18} />, name: 'Tourism', sub: 'Travel, F&B, Events' },
    { icon: <FiLayers size={18} />, name: 'Manufacturing', sub: 'Engineering, Production, Quality' },
    { icon: <FiShoppingCart size={18} />, name: 'Consumer & Retail', sub: 'Operations, Marketing, Sales' },
    { icon: <FiPlus size={18} />, name: 'And many more', sub: 'Contact us for your domain' },
];

const TESTIMONIALS = [
    { name: 'Junaid Khan', role: 'Sr. Associate Talent Acquisition @ Deloitte', text: 'I sincerely appreciate your invaluable assistance with the position, it was incredibly helpful. Thanks to your support, we were able to successfully conclude the process in a short timeframe.' },
    { name: 'Nainika Sehra', role: 'HR Consultant @ Genpact', text: 'I wanted to express my sincere appreciation for your invaluable support during the recent hiring process. Your guidance and assistance were truly instrumental.' },
    { name: 'Harpreet Kaur', role: 'Talent Acquisition Leader @ Adobe', text: "I am superbly impressed by the support the Expert Assist team has provided. It's been a pleasure working with them through all my organisations and my own job chances." },
];

const STATS = [
    { val: '30,000+', label: 'Clients Served' },
    { val: '1 Lakh+', label: 'Roles Serviced' },
    { val: '6 Lakhs+', label: 'Interviews Scheduled' },
    { val: '200+', label: 'Domain Experts' },
];

/* ─── Marquee ────────────────────────────────────────────── */
function Marquee({ items }) {
    return (
        <div style={{ overflow: 'hidden', display: 'flex', gap: 0 }}>
            {[0, 1].map(k => (
                <div key={k} style={{
                    display: 'flex', gap: 56, alignItems: 'center',
                    animation: 'marquee 22s linear infinite',
                    flexShrink: 0, paddingRight: 56,
                }}>
                    {items.map((c, i) => (
                        <span key={i} style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>{c}</span>
                    ))}
                </div>
            ))}
        </div>
    );
}

/* ─── Counter ────────────────────────────────────────────── */
function CounterStat({ val, label, delay }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        const trig = ScrollTrigger.create({
            trigger: el,
            start: 'top 85%',
            once: true,
            onEnter: () => gsap.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay }),
        });
        return () => trig.kill();
    }, [delay]);
    return (
        <div ref={ref} style={{ opacity: 0, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginTop: 5, textTransform: 'uppercase', letterSpacing: '.12em' }}>{label}</div>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function ExpertAssist() {
    const heroRef = useRef(null);
    const headRef = useRef(null);
    const subRef = useRef(null);
    const btnRef = useRef(null);
    const vidRef = useRef(null);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    const [showVideo, setShowVideo] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    /* ── Entrance GSAP ── */
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(headRef.current,
                { y: 60, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out', delay: 0.2 }
            );
            gsap.fromTo(subRef.current,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.55 }
            );
            gsap.fromTo(btnRef.current,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.8 }
            );
            gsap.fromTo(vidRef.current,
                { x: 60, opacity: 0, scale: 0.94 },
                { x: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'power4.out', delay: 0.4 }
            );
        }, heroRef);
        return () => ctx.revert();
    }, []);

    /* ── Scroll effect ── */
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', fn, { passive: true });
        return () => window.removeEventListener('scroll', fn);
    }, []);

    /* ── Scroll reveals ── */
    useEffect(() => {
        const triggers = [];
        document.querySelectorAll('.reveal').forEach((el, i) => {
            triggers.push(ScrollTrigger.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: () => gsap.fromTo(el,
                    { y: 36, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', delay: parseFloat(el.dataset.delay || 0) }
                ),
            }));
        });
        return () => triggers.forEach(t => t.kill());
    }, []);

    /* ── Testimonial auto-rotate ── */
    useEffect(() => {
        const id = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 4500);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ background: '#f8fafc', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#1e293b', overflowX: 'clip' }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--navy:#002366;--green:#10b981;--gd:#0da371;--s200:#e2e8f0;--s400:#94a3b8;--s500:#64748b;--s600:#475569;--s900:#0f172a;--fd:'Bricolage Grotesque',sans-serif}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes spin-slow{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .reveal{opacity:0}
        .plan-card{transition:all .3s}
        .plan-card:hover{transform:translateY(-6px);box-shadow:0 24px 56px rgba(0,0,0,.12)}
        .domain-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px 18px;cursor:default;transition:all .25s}
        .domain-card:hover{border-color:rgba(0,35,102,.2);box-shadow:0 8px 28px rgba(0,35,102,.07);transform:translateY(-3px)}
        .step-dot{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#002366,#10b981);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:16px;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 8px 20px rgba(0,35,102,.3)}
        .cta-btn{padding:14px 32px;background:#10b981;color:#fff;font-weight:800;font-size:14px;border-radius:100px;border:none;cursor:pointer;font-family:var(--fd);letter-spacing:.02em;display:inline-flex;align-items:center;gap:8px;transition:all .25s;box-shadow:0 8px 24px rgba(16,185,129,.35);text-decoration:none}
        .cta-btn:hover{background:#0da371;transform:translateY(-2px);box-shadow:0 12px 32px rgba(16,185,129,.45)}
        .cta-btn-outline{padding:13px 30px;background:transparent;color:var(--navy);font-weight:800;font-size:14px;border-radius:100px;border:2px solid var(--navy);cursor:pointer;font-family:var(--fd);letter-spacing:.02em;display:inline-flex;align-items:center;gap:8px;transition:all .25s;text-decoration:none}
        .cta-btn-outline:hover{background:var(--navy);color:#fff}
        .sf-field{width:100%;padding:10px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;outline:none;font-size:13px;font-weight:500;color:#0f172a;font-family:'DM Sans',sans-serif;transition:border-color .2s,background .2s}
        .sf-field:focus{border-color:rgba(0,35,102,.3);background:#fff}
        .sf-field::placeholder{color:#94a3b8}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
      `}</style>

            {/* ── NAV ── */}
            <header style={{
                background: scrolled ? 'rgba(255,255,255,.98)' : 'rgba(255,255,255,.96)',
                borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
                position: 'sticky', top: 0, zIndex: 1000,
                backdropFilter: 'blur(20px)',
                boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,.06)' : 'none',
                transition: 'all .4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <div style={{ background: 'linear-gradient(90deg,#001540,#002b7a,#001540)', backgroundSize: '200% 100%', animation: 'shimmer 5s linear infinite', padding: '9px 0', textAlign: 'center', fontSize: 11, fontWeight: 800, letterSpacing: '.15em', color: '#fff', textTransform: 'uppercase', fontFamily: 'var(--fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <FiZap size={11} fill="currentColor" /> India's Most Trusted Expert Hiring Service — 30,000+ Companies Served
                </div>
                <nav style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <img src={mavenLogo} alt="MavenJobs" style={{ height: 28 }} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                        {['How it Works', 'Plans', 'Domains', 'Clients'].map(l => (
                            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b', textDecoration: 'none', fontFamily: 'var(--fd)', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#002366'} onMouseLeave={e => e.target.style.color = '#64748b'}>{l}</a>
                        ))}
                    </div>
                    <a href="#demo" className="cta-btn" style={{ padding: '10px 22px', fontSize: 13 }}>Request a Demo</a>
                </nav>
            </header>

            {/* ── HERO ── */}
            <section ref={heroRef} style={{ background: 'linear-gradient(135deg,#050e24 0%,#002366 55%,#1a0a4a 100%)', minHeight: '92vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: .05, backgroundImage: 'radial-gradient(#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.25) 0%,transparent 65%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-15%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 65%)', pointerEvents: 'none' }} />

                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 44px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', position: 'relative', zIndex: 2, width: '100%' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.28)', color: '#6ee7b7', fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 100, marginBottom: 24, fontFamily: 'var(--fd)', backdropFilter: 'blur(8px)' }}>
                            <FiActivity size={10} /> MavenJobs Expert Assist
                        </div>
                        <h1 ref={headRef} style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(32px,4.5vw,54px)', fontWeight: 800, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: 18, opacity: 0 }}>
                            Leave sourcing,<br />
                            <span style={{ color: '#10b981' }}>shortlisting</span> and<br />
                            scheduling to us.
                        </h1>
                        <p ref={subRef} style={{ fontSize: 15.5, color: 'rgba(255,255,255,.54)', lineHeight: 1.72, marginBottom: 32, maxWidth: 440, opacity: 0 }}>
                            Our 200+ domain experts with 15+ years of experience act as an extension of your recruitment team — so you focus only on interviewing the best.
                        </p>
                        <div ref={btnRef} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', opacity: 0 }}>
                            <a href="#demo" className="cta-btn">Request a Call Back →</a>
                            <a href="#how-it-works" className="cta-btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>See How It Works</a>
                        </div>

                        {/* mini stats */}
                        <div style={{ display: 'flex', gap: 32, marginTop: 44, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                            {[{ v: '30K+', l: 'Clients' }, { v: '1L+', l: 'Roles Filled' }, { v: '6L+', l: 'Interviews' }].map((s, i) => (
                                <div key={i}>
                                    <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</div>
                                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.35)', fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.1em' }}>{s.l}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Video card */}
                    <div ref={vidRef} style={{ opacity: 0 }}>
                        <div
                            onClick={() => setShowVideo(true)}
                            style={{
                                background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
                                borderRadius: 24, overflow: 'hidden', backdropFilter: 'blur(16px)',
                                boxShadow: '0 32px 80px rgba(0,0,0,.4)', cursor: 'pointer',
                                transition: 'transform .3s ease, border-color .3s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,.3)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)' }}
                        >
                            <div style={{ height: 3, background: 'linear-gradient(90deg,#002366,#10b981)' }} />
                            <div style={{ padding: 6 }}>
                                <div style={{ background: '#000', borderRadius: 18, overflow: 'hidden', position: 'relative', aspectRatio: '16/9' }}>
                                    <img src="https://img.youtube.com/vi/1qw5ITr3k9E/maxresdefault.jpg" alt="Expert Assist" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .8 }} />
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 0 0 12px rgba(16,185,129,.2)', animation: 'float 3s ease-in-out infinite' }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                        </div>
                                    </div>
                                    <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 100 }}>
                                        <img src={mavenLogo} alt="Maven" style={{ height: 16, filter: 'invert(1) brightness(2)' }} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.06em' }}>Expert Assist</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '16px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 800, color: '#fff' }}>Watch how it works</div>
                                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>1:01 · Product overview</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'float 1.5s ease-in-out infinite' }} />
                                    Live Demo Available
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CLIENTS MARQUEE ── */}
            <div style={{ background: '#fff', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '22px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 40, maxWidth: 1280, margin: '0 auto', padding: '0 44px' }}>
                    <div style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Trusted by<br />30,000+ clients</div>
                    <div style={{ flex: 1, overflow: 'hidden' }}><Marquee items={CLIENTS} /></div>
                </div>
            </div>

            {/* ── FEATURES ── */}
            <section style={{ background: '#fff', padding: '96px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#10b981', marginBottom: 12, fontFamily: 'var(--fd)' }}><FiActivity size={10} /> Why Choose Us</div>
                        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 14 }}>What makes Expert Assist different?</h2>
                        <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: 3, margin: '0 auto 20px' }} />
                        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 560, margin: '0 auto', lineHeight: 1.75 }}>Our 200+ domain recruitment experts with 15+ years of experience act as an extension of your recruitment team.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
                        {FEATURES.map((f, i) => (
                            <div key={i} className="reveal plan-card" data-delay={i * 0.1} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 24, overflow: 'hidden', cursor: 'default' }}>
                                <div style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
                                    <img src={[
                                        'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80',
                                        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80',
                                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
                                    ][i]} alt={f.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${f.color}dd 0%, transparent 60%)` }} />
                                    <div style={{ position: 'absolute', bottom: 16, left: 20, fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 800, color: '#fff' }}>{f.icon}</div>
                                </div>
                                <div style={{ padding: '24px 28px 28px' }}>
                                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{f.title}</h3>
                                    <p style={{ fontSize: 14.5, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 48 }}>
                        <a href="#demo" className="cta-btn">Request a Call Back →</a>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" style={{ background: 'linear-gradient(135deg,#f0f4fb 0%,#e8f0fe 100%)', padding: '96px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#10b981', marginBottom: 12, fontFamily: 'var(--fd)' }}>✦ Simple Process</div>
                        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 12 }}>How it works</h2>
                        <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: 3, margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>Get your next best-fit candidates in just 3 simple steps</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
                        {STEPS.map((s, i) => (
                            <div key={i} className="reveal" data-delay={i * 0.12} style={{ position: 'relative' }}>
                                {i < STEPS.length - 1 && (
                                    <div style={{ position: 'absolute', top: 26, left: 'calc(100% - 16px)', width: 32, height: 2, background: 'linear-gradient(90deg,#002366,#10b981)', zIndex: 1, display: 'none' }} />
                                )}
                                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 22, padding: '32px 28px', height: '100%', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                        <div className="step-dot">{s.num}</div>
                                        <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg,#e2e8f0,transparent)' }} />
                                    </div>
                                    <div style={{ height: 180, borderRadius: 14, overflow: 'hidden', marginBottom: 22 }}>
                                        <img src={[
                                            'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&q=80',
                                            'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=500&q=80',
                                            'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?w=500&q=80',
                                        ][i]} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{s.title}</h3>
                                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.72 }}>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PLANS ── */}
            <section id="plans" style={{ background: '#fff', padding: '96px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#10b981', marginBottom: 12, fontFamily: 'var(--fd)' }}>✦ Flexible Plans</div>
                        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 12 }}>Custom solutions for your hiring needs</h2>
                        <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: 3, margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>Choose the right service based on your hiring requirements</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
                        {PLANS.map((p, i) => (
                            <div key={i} className="reveal plan-card" data-delay={i * 0.08} style={{ position: 'relative', padding: '32px 24px', background: p.name === 'Premium' ? 'linear-gradient(135deg,#002366,#003da8)' : '#f8fafc', border: `1.5px solid ${p.name === 'Premium' ? 'transparent' : '#e2e8f0'}`, borderRadius: 22, display: 'flex', flexDirection: 'column' }}>
                                {p.hot && <div style={{ position: 'absolute', top: 16, right: 16, background: '#10b981', color: '#fff', fontSize: 9.5, fontWeight: 800, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fd)' }}>Most Popular</div>}
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: p.name === 'Premium' ? 'rgba(255,255,255,.15)' : `${p.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: `1px solid ${p.name === 'Premium' ? 'rgba(255,255,255,.2)' : `${p.color}28`}` }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: p.name === 'Premium' ? '#10b981' : p.color }} />
                                </div>
                                <div style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 800, color: p.name === 'Premium' ? '#fff' : '#0f172a', marginBottom: 6 }}>{p.name}</div>
                                <div style={{ fontSize: 12, color: p.name === 'Premium' ? 'rgba(255,255,255,.55)' : '#64748b', marginBottom: 22, fontWeight: 500 }}>{['For walk-in drives', 'Entry & mid-level roles', 'Senior & premium roles', 'All role levels'][i]}</div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                                    {p.points.map((pt, j) => (
                                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: p.name === 'Premium' ? 'rgba(255,255,255,.8)' : '#475569', fontWeight: 500 }}>
                                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: p.name === 'Premium' ? 'rgba(16,185,129,.25)' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={p.name === 'Premium' ? '#10b981' : '#10b981'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            </div>
                                            {pt}
                                        </div>
                                    ))}
                                </div>
                                <button style={{ width: '100%', padding: '12px', background: p.name === 'Premium' ? '#fff' : 'transparent', color: p.name === 'Premium' ? '#002366' : p.color, border: `2px solid ${p.name === 'Premium' ? '#fff' : p.color}`, borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--fd)', transition: 'all .2s' }}
                                    onMouseEnter={e => { if (p.name !== 'Premium') { e.currentTarget.style.background = p.color; e.currentTarget.style.color = '#fff'; } }}
                                    onMouseLeave={e => { if (p.name !== 'Premium') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = p.color; } }}>
                                    Request a Call Back
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── DOMAINS ── */}
            <section id="domains" style={{ background: 'linear-gradient(135deg,#f0f4fb,#e8f0fe)', padding: '96px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#10b981', marginBottom: 12, fontFamily: 'var(--fd)' }}>✦ Domain Expertise</div>
                        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 12 }}>Our domain expertise</h2>
                        <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: 3, margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>Specialised in talent sourcing and shortlisting across multiple domains</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                        {DOMAINS.map((d, i) => (
                            <div key={i} className="reveal domain-card" data-delay={i * 0.06}>
                                <div style={{ fontSize: 28, marginBottom: 10 }}>{d.icon}</div>
                                <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{d.name}</div>
                                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{d.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section style={{ background: '#fff', padding: '96px 0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#10b981', marginBottom: 12, fontFamily: 'var(--fd)' }}><FiActivity size={10} /> Client Stories</div>
                        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 12 }}>What our clients say</h2>
                        <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: 3, margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>See how Expert Assist has helped companies solve their hiring needs</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="reveal plan-card" data-delay={i * 0.1} style={{ background: i === activeTestimonial ? 'linear-gradient(135deg,#002366,#003da8)' : '#f8fafc', border: `1.5px solid ${i === activeTestimonial ? 'transparent' : '#e2e8f0'}`, borderRadius: 22, padding: '32px 28px', cursor: 'pointer', transition: 'all .4s' }} onClick={() => setActiveTestimonial(i)}>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
                                    {[0, 1, 2, 3, 4].map(s => <div key={s} style={{ width: 14, height: 14, background: '#f59e0b', borderRadius: 4, clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }} />)}
                                </div>
                                <p style={{ fontSize: 14, color: i === activeTestimonial ? 'rgba(255,255,255,.8)' : '#475569', lineHeight: 1.75, marginBottom: 24, fontStyle: 'italic' }}>"{t.text}"</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: `1px solid ${i === activeTestimonial ? 'rgba(255,255,255,.1)' : '#f1f5f9'}` }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: i === activeTestimonial ? 'rgba(16,185,129,.3)' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 800, color: i === activeTestimonial ? '#10b981' : '#002366' }}>
                                        {t.name.split(' ').map(w => w[0]).join('')}
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 800, color: i === activeTestimonial ? '#fff' : '#0f172a' }}>{t.name}</div>
                                        <div style={{ fontSize: 11.5, color: i === activeTestimonial ? 'rgba(255,255,255,.5)' : '#94a3b8', marginTop: 1 }}>{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STATS STRIP ── */}
            <section style={{ background: 'linear-gradient(135deg,#050e24,#002366)', padding: '80px 0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: .05, backgroundImage: 'radial-gradient(#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                <div style={{ position: 'absolute', top: '-30%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.15) 0%,transparent 65%)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px', position: 'relative', zIndex: 2 }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
                        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8 }}>Simplifying hiring nationwide</h2>
                        <p style={{ fontSize: 15, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>with pan-India presence</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32 }}>
                        {STATS.map((s, i) => <CounterStat key={i} val={s.val} label={s.label} delay={i * 0.1} />)}
                    </div>
                </div>
            </section>

            {/* ── DEMO CTA ── */}
            <section id="demo" style={{ background: '#fff', padding: '96px 0' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 44px' }}>
                    <div style={{ background: 'linear-gradient(135deg,#f0f4fb,#e8f0fe)', border: '1.5px solid #e2e8f0', borderRadius: 32, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 480 }}>
                        {/* Left */}
                        <div className="reveal" style={{ padding: '60px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#10b981', marginBottom: 16, fontFamily: 'var(--fd)' }}><FiActivity size={10} /> Get Started Today</div>
                            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>Know more about<br /><span style={{ color: '#002366' }}>MavenJobs Expert Assist</span></h2>
                            <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: 3, marginBottom: 20 }} />
                            {[{ t: 'Get a personalized consultation', s: 'Our experts will understand your exact hiring needs.' }, { t: 'Learn how it will help you', s: 'See exactly how we save you time and cost in hiring.' }].map((b, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', border: '1.5px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{b.t}</div>
                                        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{b.s}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right — form */}
                        <div className="reveal" data-delay={0.1} style={{ background: '#fff', padding: '52px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: '1.5px solid #e2e8f0' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: '0 0 0 0' }}>
                                <div style={{ height: 3, background: 'linear-gradient(90deg,#002366,#10b981)', borderRadius: 3, marginBottom: 28 }} />
                            </div>
                            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 24, letterSpacing: '-0.02em' }}>Book your personalized demo</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[{ ph: 'Your Full Name', type: 'text', k: 'name' }, { ph: '10-digit Mobile Number', type: 'tel', k: 'phone' }, { ph: 'Work Email Address', type: 'email', k: 'email' }].map(f => (
                                    <input key={f.k} type={f.type} placeholder={f.ph} className="sf-field" value={formData[f.k]} onChange={e => setFormData(prev => ({ ...prev, [f.k]: e.target.value }))} />
                                ))}
                                <select className="sf-field" style={{ appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', cursor: 'pointer' }}>
                                    <option value="">Select Hiring Plan</option>
                                    {PLANS.map(p => <option key={p.name}>{p.name}</option>)}
                                </select>
                                <button className="cta-btn" style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: 12 }}>Book My Demo →</button>
                            </div>
                            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14, fontWeight: 600 }}>No spam. Our team will reach out within 2 business hours.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ background: '#050e24', padding: '64px 0 32px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 44px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 56, flexWrap: 'wrap', marginBottom: 48 }}>
                        <div style={{ flex: '0 0 280px' }}>
                            <img src={mavenLogo} alt="MavenJobs" style={{ height: 28, marginBottom: 18, filter: 'invert(1) brightness(2)' }} />
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', lineHeight: 1.65 }}>India's most trusted expert hiring service — connecting companies with their best-fit talent.</p>
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                {[{ icon: <FiPhone size={13} />, val: '1800-102-5557' }, { icon: <FiMail size={13} />, val: 'assist@mavenjobs.com' }].map((c, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.55)' }}>
                                        {c.icon} {c.val}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 52, flexWrap: 'wrap' }}>
                            {[{ title: 'Services', links: ['Expert Assist', 'PremiumX', 'AI REX', 'NChecked Profiles'] }, { title: 'Plans', links: ['Basic', 'Pro', 'Premium', 'Campaign'] }, { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Contact'] }].map((g, i) => (
                                <div key={i}>
                                    <h4 style={{ fontFamily: 'var(--fd)', fontSize: 12, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>{g.title}</h4>
                                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                                        {g.links.map((l, j) => <li key={j}><a href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', textDecoration: 'none', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.38)'}>{l}</a></li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.28)' }}>© 2026 MavenJobs Private Limited · All rights reserved</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', gap: 5 }}>Made with <FiHeart size={12} style={{ color: '#ef4444' }} fill="#ef4444" /> in India</p>
                    </div>
                </div>
            </footer>

            {/* ── VIDEO MODAL ── */}
            {showVideo && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(2,6,23,.94)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, backdropFilter: 'blur(12px)', padding: 24,
                }} onClick={() => setShowVideo(false)}>
                    <div style={{
                        width: '100%', maxWidth: 1000, position: 'relative',
                        aspectRatio: '16/9', borderRadius: 24, overflow: 'hidden',
                        boxShadow: '0 32px 100px rgba(0,0,0,.8)', background: '#000',
                        border: '1px solid rgba(255,255,255,.1)',
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowVideo(false)}
                            style={{
                                position: 'absolute', top: 20, right: 20, zIndex: 10,
                                width: 44, height: 44, borderRadius: '50%',
                                background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.1)',
                                color: '#fff', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)',
                                transition: 'all .2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,.5)'}
                        >
                            <FiX size={24} />
                        </button>
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/1qw5ITr3k9E?autoplay=1&rel=0"
                            title="MavenJobs Expert Assist"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            style={{ border: 'none' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}