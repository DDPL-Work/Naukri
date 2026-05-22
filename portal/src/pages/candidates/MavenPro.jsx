import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCheck, FiX, FiPhone, FiMail, FiMapPin, FiCpu,
  FiFileText, FiAward, FiTarget, FiPenTool, FiZap, FiStar,
  FiSearch, FiBell, FiLogOut, FiArrowRight, FiChevronRight,
  FiTrendingUp, FiShield, FiUsers, FiBarChart2, FiChevronDown,
  FiPlay, FiMessageCircle, FiLock, FiMenu
} from 'react-icons/fi';
import { FaLinkedinIn, FaFacebookF, FaInstagram, FaQuoteLeft } from 'react-icons/fa';
import { FaXTwitter } from "react-icons/fa6";
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import { useAuth } from "../../AuthContext";

function useFadeIn(threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('sv'); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

function ServiceCard({ service, delay = 0 }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className="fc" style={{ '--d': `${delay}ms` }}>
      <div className="ci">
        <div className="cg" style={{ background: service.color }} />
        <span className="ct">{service.tag}</span>
        <div className="cion" style={{ color: service.color, borderColor: `${service.color}35`, background: `${service.color}0e` }}>
          {service.icon}
        </div>
        <h3 className="ctitle">{service.name}</h3>
        <div className="cprice">
          <span className="pcur">₹</span>
          <span className="pamt">{service.price}</span>
          <span className="pper">{service.period}</span>
        </div>
        <ul className="cfeats">
          {service.features.map((f, i) => (
            <li key={i}>
              <span style={{ color: service.color, display: 'flex', alignItems: 'center', flexShrink: 0 }}><FiCheck strokeWidth={3} size={12} /></span>
              {f}
            </li>
          ))}
        </ul>
        <button className="cbtn" style={{ '--acc': service.color }}>
          Know More <FiChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function FAQItem({ q, a, idx }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <div className={`faq-item${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span className="faq-num">Q{idx + 1}</span>
        <span className="faq-qtxt">{q}</span>
        <FiChevronDown size={18} className="faq-icon" />
      </div>
      {open && <p className="faq-a">{a}</p>}
    </div>
  );
}

const planData = {
  features: [
    { label: "Resume Builder & Download", free: true, pro: true, elite: true },
    { label: "ATS Score Checker", free: true, pro: true, elite: true },
    { label: "Job Alerts (Daily)", free: false, pro: true, elite: true },
    { label: "Recruiter Profile Visibility", free: "Basic", pro: "3× Boosted", elite: "10× Priority" },
    { label: "AI Resume Optimization", free: false, pro: true, elite: true },
    { label: "AI Mock Interviews", free: false, pro: "5 / month", elite: "Unlimited" },
    { label: "Direct Recruiter Messaging", free: false, pro: true, elite: true },
    { label: "Industry Hiring Insights", free: false, pro: true, elite: true },
    { label: "Salary Benchmarking", free: false, pro: true, elite: true },
    { label: "1-on-1 Expert Coaching", free: false, pro: false, elite: true },
    { label: "LinkedIn Profile Review", free: false, pro: false, elite: true },
    { label: "Dedicated Career Manager", free: false, pro: false, elite: true },
    { label: "WhatsApp Job Alerts", free: false, pro: true, elite: true },
    { label: "Resume Revision Rounds", free: "1", pro: "3", elite: "Unlimited" },
    { label: "Priority Customer Support", free: false, pro: false, elite: true },
  ],
  plans: [
    { name: "Free", price: "₹0", period: "forever", color: "#64748b", highlight: false },
    { name: "Pro", price: "₹890", period: "/ month", color: "#002366", highlight: true },
    { name: "Elite", price: "₹1,999", period: "/ month", color: "#10b981", highlight: false },
  ]
};

const MavenPro = () => {
  const { user, logout, openLogin, openRegister } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const serviceCategories = [
    {
      title: "Resume Services",
      sub: "DOCUMENT EXCELLENCE",
      desc: "Beat ATS systems and land on the recruiter's shortlist. Every word precision-crafted by industry veterans.",
      services: [
        { name: "Text Resume", price: "1,653", period: "one-time", icon: <FiFileText size={22} />, features: ["ATS-Optimised Format", "60+ Keyword Phrases", "Expert Consultation Call", "3 Revision Rounds"], tag: "MOST POPULAR", color: "#002366" },
        { name: "Visual Resume", price: "2,499", period: "one-time", icon: <FiPenTool size={22} />, features: ["Modern Premium Design", "Portfolio Link Integrated", "Recruiter-Tested Layout", "Print-Ready PDF & DOCX"], tag: "CREATIVE PICK", color: "#10b981" },
        { name: "Resume Critique", price: "1,017", period: "one-time", icon: <FiSearch size={22} />, features: ["Gap & Impact Analysis", "30-Point Score Report", "Keyword Density Audit", "15-min Expert Debrief"], tag: "QUICK WIN", color: "#6366f1" }
      ]
    },
    {
      title: "Visibility & Interview Prep",
      sub: "GET NOTICED · GET HIRED",
      desc: "Stand out to the top 1% of recruiters and walk into every interview with unshakeable confidence.",
      services: [
        { name: "Priority Applicant", price: "971", period: "/ 3 months", icon: <FiAward size={22} />, features: ["Early Access to New Jobs", "Top Recruiter Search Rank", "Direct InMail Unlocked", "Real-time Application Tracker"], tag: "RECOMMENDED", color: "#10b981" },
        { name: "Profile Spotlight", price: "890", period: "/ month", icon: <FiTarget size={22} />, features: ["3× Profile Impressions", "Featured Badge on Listings", "Recruiter View Analytics", "Personalised Job Feed"], tag: "HIGH ROI", color: "#002366" },
        { name: "AI Mock Interview", price: "296", period: "/ 3 months", icon: <FiCpu size={22} />, features: ["Real-time AI Feedback", "500+ Company Question Bank", "Confidence Score Tracker", "Video Playback Analysis"], tag: "NEW", color: "#f59e0b" }
      ]
    }
  ];

  const features = [
    { icon: <FiCpu size={26} />, title: "AI-Powered Resume Engine", desc: "Our proprietary NLP scans thousands of job descriptions and rebuilds your resume with the exact keywords hiring managers search for.", color: "#002366" },
    { icon: <FiTrendingUp size={26} />, title: "Live Career Analytics", desc: "Track profile views, shortlisting rates, and application outcomes in a real-time dashboard built to keep you one step ahead.", color: "#10b981" },
    { icon: <FiShield size={26} />, title: "ATS Pass Guarantee", desc: "Every document we craft clears 50+ applicant-tracking systems. Not shortlisted in 60 days? We rewrite it — at zero cost.", color: "#6366f1" },
    { icon: <FiUsers size={26} />, title: "FAANG-Verified Coaches", desc: "Work directly with ex-Google, Amazon, and McKinsey hiring professionals who know what the shortlist looks like from the inside.", color: "#f59e0b" },
    { icon: <FiBarChart2 size={26} />, title: "Market Intelligence Hub", desc: "Access real-time salary benchmarks, in-demand skill trends, and sector-specific hiring forecasts across 60+ verticals.", color: "#ec4899" },
    { icon: <FiMessageCircle size={26} />, title: "Always-On Support", desc: "Dedicated career advisors reachable via live chat, phone, and email — no queues, no bots, no waiting rooms.", color: "#14b8a6" },
  ];

  const testimonials = [
    { name: "Priya Sharma", role: "Product Manager · Microsoft India", initials: "PS", color: "#002366", text: "Maven's AI resume engine transformed my search completely. Within 3 weeks I had 8 interview calls — including Microsoft and Flipkart. The ROI is simply unmatched.", stars: 5 },
    { name: "Arjun Mehta", role: "Software Engineer · Google", initials: "AM", color: "#10b981", text: "The AI mock interview platform mirrored my actual Google rounds almost exactly. The confidence-score tracking showed me where to improve, and it worked.", stars: 5 },
    { name: "Sneha Kulkarni", role: "Senior Analyst · Deloitte", initials: "SK", color: "#6366f1", text: "Priority Applicant placed me at the top of every recruiter search. Three-times the profile views meant three-times the callbacks. Best ₹971 I've ever invested.", stars: 5 },
    { name: "Rohit Bansal", role: "Growth Lead · Zomato", initials: "RB", color: "#f59e0b", text: "Recruiters literally commented on how polished my Visual Resume looked. I landed my Zomato role within 45 days — faster than I ever imagined possible.", stars: 5 },
  ];

  const faqs = [
    { q: "What exactly is MavenPro?", a: "MavenPro is India's most comprehensive career acceleration platform. It combines AI-powered resume tools, expert human coaching, recruiter visibility boosts, real-time market intelligence, and interview preparation — all under one roof." },
    { q: "Who is MavenPro designed for?", a: "From fresh graduates targeting their first role to senior leaders making a lateral switch — every plan is calibrated to your experience level, target industry, and salary band." },
    { q: "How long does it take to see results?", a: "Most users report 3× more recruiter profile views within the first week of activating a visibility plan. Resume rewrites typically generate interview calls within 2–3 weeks of submission." },
    { q: "What types of mock interviews are available?", a: "We offer unlimited AI video interviews with real-time feedback, role-specific question banks spanning 200+ job categories, and live 1-on-1 sessions with FAANG-verified coaches for Elite members." },
    { q: "Can I practise for multiple job roles simultaneously?", a: "Yes. Our platform supports parallel preparation for up to 3 different target roles, with separate question sets, feedback profiles, and coaching notes for each." },
    { q: "Can I edit and re-download my resume after delivery?", a: "Absolutely. All resume plans include lifetime document access. Pro members get 3 free revision rounds; Elite members get unlimited revisions with priority turnaround." },
    { q: "Is there a free trial available?", a: "Yes — our Free plan gives you access to the basic resume builder, ATS score checker, and one resume revision so you can experience the platform before committing to a paid tier." },
    { q: "How do I get in touch if I need help?", a: "Reach us on Toll Free 1800-102-5557, email support@mavenjobs.com, or via the live chat widget inside the platform. Elite members receive a dedicated career manager with a direct WhatsApp line." },
  ];

  const galleryImages = [
    { src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=700&q=80", label: "Expert Coaching Sessions" },
    { src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=700&q=80", label: "Collaborative Growth" },
    { src: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=700&q=80", label: "Career Analytics Dashboard" },
    { src: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=700&q=80", label: "Interview Preparation" },
    { src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&q=80", label: "Remote-Ready Professionals" },
    // { src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&q=80", label: "Success Stories" },
  ];

  const r1 = useFadeIn(), r2 = useFadeIn(), r3 = useFadeIn(), r4 = useFadeIn(),
    r5 = useFadeIn(), r6 = useFadeIn(), r7 = useFadeIn(), r8 = useFadeIn();

  const renderCell = (val) => {
    if (val === true) return <span className="tck"><FiCheck size={15} strokeWidth={3} /></span>;
    if (val === false) return <span className="tcross"><FiX size={15} strokeWidth={3} /></span>;
    return <span className="tval">{val}</span>;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --navy:#002366;--navy-d:#001540;--green:#10b981;--gd:#0da371;
          --s50:#f8fafc;--s100:#f1f5f9;--s200:#e2e8f0;--s300:#cbd5e1;
          --s400:#94a3b8;--s500:#64748b;--s600:#475569;--s900:#0f172a;
          --fd:'Bricolage Grotesque',sans-serif;--fb:'DM Sans',sans-serif;
        }
        html{scroll-behavior:smooth}
        body{font-family:var(--fb);background:#f0f4fb;color:var(--s900)}

        /* PROMO */
        .pb{background:linear-gradient(90deg,var(--navy-d),#003db5,var(--navy-d));background-size:200% 100%;animation:sh 5s linear infinite;color:#fff;padding:11px 0;text-align:center;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:center;gap:14px;font-family:var(--fd)}
        .pa{color:#6ee7b7}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}

        /* NAVBAR */
        .nb{background:transparent !important;border-bottom:1px solid transparent !important;position:fixed;top:37px;left:0;right:0;z-index:90;transition:all 0.4s cubic-bezier(0.4,0,0.2,1)}
        .nb.sc{background:rgba(255,255,255,.98) !important;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--s200) !important;box-shadow:0 10px 40px rgba(0,35,102,.08)}
        .nbi{max-width:1280px;margin:0 auto;padding:0 28px;height:74px;display:flex;align-items:center;justify-content:space-between}
        .nl{display:flex;align-items:center;gap:32px}
        .nla{font-size:13px;font-weight:700;color:rgba(255,255,255,.85);text-decoration:none;letter-spacing:.02em;transition:all 0.3s;font-family:var(--fd)}
        .nb.sc .nla{color:var(--s500)}
        .nla:hover{color:#fff}
        .nb.sc .nla:hover{color:var(--navy)}
        .nla.ac{color:#fff;position:relative}
        .nb.sc .nla.ac{color:var(--navy)}
        .nla.ac::after{content:'';position:absolute;bottom:-28px;left:0;right:0;height:2.5px;background:var(--green);border-radius:2px}
        .btnl{padding:8px 18px;font-size:13px;font-weight:800;color:#fff;background:none;border:none;cursor:pointer;border-radius:10px;transition:all 0.3s;font-family:var(--fd)}
        .nb.sc .btnl{color:var(--navy)}
        .btnl:hover{background:rgba(255,255,255,.15)}
        .nb.sc .btnl:hover{background:var(--s100)}
        .logo-img{height:34px;transition:all .4s ease;display:block}
        .nb:not(.sc) .logo-img{filter:invert(1) brightness(2) contrast(1.2)}
        .btnr{padding:10px 24px;font-size:13px;font-weight:800;color:#fff;background:var(--navy);border:none;border-radius:11px;cursor:pointer;transition:all .2s;font-family:var(--fd);box-shadow:0 4px 14px rgba(0,35,102,.2)}
        .btnr:hover{background:var(--navy-d);transform:translateY(-1px)}

        /* HERO — REVERSED */
        .hero{position:relative;height:100vh;min-height:700px;overflow:hidden;background:#050e24}
        .spline-wrap{position:absolute;top:0;left:-8%;bottom:0;width:68%;overflow:hidden}
        .spline-wrap iframe{width:100%;height:calc(100% + 80px);border:none;display:block;pointer-events:none;margin-bottom:-80px}
        .ho-right{position:absolute;top:0;right:0;bottom:0;width:60%;background:linear-gradient(to left,rgba(2,8,30,.94) 0%,rgba(2,8,30,.78) 55%,transparent 100%);z-index:2;pointer-events:none}
        .ho-top{position:absolute;top:0;left:0;right:0;height:180px;background:linear-gradient(to bottom,rgba(2,8,30,.88),transparent);z-index:2;pointer-events:none}
        .ho-bot{position:absolute;bottom:0;left:0;right:0;height:220px;background:linear-gradient(to top,#f0f4fb 0%,transparent 100%);z-index:2;pointer-events:none}
        .hc{position:relative;z-index:10;max-width:1280px;margin:0 auto;padding:0 28px;height:100%;display:flex;align-items:center;justify-content:flex-end}
        .htext{max-width:560px;text-align:left}
        .heb{display:inline-flex;align-items:center;gap:8px;padding:7px 18px;background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.35);border-radius:100px;color:#6ee7b7;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;margin-bottom:28px;font-family:var(--fd);backdrop-filter:blur(8px)}
        .hh1{font-family:var(--fd);font-size:clamp(42px,5vw,76px);font-weight:800;line-height:1.05;color:#fff !important;letter-spacing:-.03em;margin-bottom:20px}
        .hh1 .acc{color:#10b981 !important}
        .hsub{font-size:15.5px;color:rgba(255,255,255,.6);font-weight:500;max-width:440px;margin-bottom:40px;line-height:1.75}
        .hbtns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:48px}
        .hbp{padding:15px 34px;background:var(--green);color:#fff;font-weight:800;font-size:14px;border-radius:100px;border:none;cursor:pointer;font-family:var(--fd);letter-spacing:.02em;display:flex;align-items:center;gap:8px;transition:all .25s;text-decoration:none;box-shadow:0 8px 28px rgba(16,185,129,.35)}
        .hbp:hover{background:var(--gd);transform:translateY(-2px);box-shadow:0 12px 36px rgba(16,185,129,.45)}
        .hbg{padding:14px 32px;background:rgba(255,255,255,.07);color:#fff;font-weight:700;font-size:14px;border-radius:100px;border:1px solid rgba(255,255,255,.18);cursor:pointer;font-family:var(--fd);transition:all .25s;text-decoration:none;backdrop-filter:blur(8px);display:flex;align-items:center;gap:8px}
        .hbg:hover{background:rgba(255,255,255,.13)}
        .htrust{display:flex;gap:22px;flex-wrap:wrap}
        .htp{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:rgba(255,255,255,.4)}
        .htpdot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0}
        .si{position:absolute;bottom:36px;right:56px;z-index:10;display:flex;flex-direction:column;align-items:center;gap:7px;color:rgba(255,255,255,.22);font-size:9px;font-weight:800;letter-spacing:.18em;font-family:var(--fd);text-transform:uppercase}
        .sl{width:1px;height:40px;background:linear-gradient(to bottom,rgba(255,255,255,.28),transparent);animation:sp 2.2s ease-in-out infinite}
        @keyframes sp{0%,100%{opacity:.22}50%{opacity:.65}}

        /* STATS */
        .ss{background:#fff;border-bottom:1px solid var(--s100)}
        .ssi{max-width:1280px;margin:0 auto;padding:0 28px;display:grid;grid-template-columns:repeat(4,1fr)}
        .sti{padding:36px 20px;text-align:center;border-right:1px solid var(--s100);transition:background .2s}
        .sti:last-child{border-right:none}
        .sti:hover{background:var(--s50)}
        .stn{font-family:var(--fd);font-size:38px;font-weight:800;color:var(--navy);letter-spacing:-.04em;line-height:1;margin-bottom:7px}
        .stl{font-size:10px;font-weight:700;color:var(--s400);letter-spacing:.12em;text-transform:uppercase}

        /* PARTNERS */
        .partners-sec{background:var(--s50);border-top:1px solid var(--s100);border-bottom:1px solid var(--s100);padding:26px 0;overflow:hidden}
        .partners-track{display:flex;gap:52px;animation:marquee 24s linear infinite;width:max-content;align-items:center}
        .partners-track:hover{animation-play-state:paused}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .partner-logo{font-family:var(--fd);font-size:12px;font-weight:800;color:var(--s300);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;transition:color .2s;cursor:default}
        .partner-logo:hover{color:var(--navy)}

        /* SW */
        .sw2{max-width:1280px;margin:0 auto;padding:0 28px}

        /* SECTION HEAD */
        .sh2{text-align:center;margin-bottom:60px}
        .se{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--green);font-family:var(--fd);margin-bottom:14px}
        .stt{font-family:var(--fd);font-size:clamp(28px,3.6vw,48px);font-weight:800;color:var(--navy);letter-spacing:-.03em;margin-bottom:14px;line-height:1.08}
        .sd{color:var(--s500);font-size:15.5px;max-width:520px;margin:0 auto;line-height:1.8}
        .sdiv{width:44px;height:3px;background:linear-gradient(90deg,var(--green),#6ee7b7);border-radius:3px;margin:16px auto}

        /* FEATURES */
        .feat-sec{padding:88px 0;background:#fff}
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .feat-card{padding:36px 30px;border-radius:20px;border:1px solid var(--s100);background:var(--s50);transition:all .3s;position:relative;overflow:hidden}
        .feat-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 60%,rgba(0,35,102,.02));pointer-events:none}
        .feat-card:hover{border-color:rgba(0,35,102,.12);box-shadow:0 16px 48px rgba(0,35,102,.08);transform:translateY(-4px);background:#fff}
        .feat-icon{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:22px;transition:transform .3s}
        .feat-card:hover .feat-icon{transform:scale(1.08) rotate(-4deg)}
        .feat-title{font-family:var(--fd);font-size:18px;font-weight:800;color:var(--navy);margin-bottom:10px;letter-spacing:-.01em}
        .feat-desc{font-size:13.5px;color:var(--s500);line-height:1.75;font-weight:500}

        /* CARDS */
        .cs{padding:88px 0 80px}
        .cg2{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
        .fc{opacity:0;transform:translateY(28px);transition:opacity .55s ease var(--d,0ms),transform .55s ease var(--d,0ms)}
        .fc.sv{opacity:1;transform:translateY(0)}
        .sf{opacity:0;transform:translateY(24px);transition:opacity .65s ease,transform .65s ease}
        .sf.sv{opacity:1;transform:translateY(0)}
        .ci{position:relative;background:#fff;border-radius:22px;border:1px solid var(--s200);padding:34px 30px;display:flex;flex-direction:column;overflow:hidden;transition:box-shadow .28s,transform .28s,border-color .28s;height:100%}
        .ci:hover{box-shadow:0 20px 56px rgba(0,35,102,.11);transform:translateY(-5px);border-color:rgba(0,35,102,.14)}
        .cg{position:absolute;top:-70px;right:-70px;width:180px;height:180px;border-radius:50%;opacity:.055;filter:blur(44px);transition:opacity .3s;pointer-events:none}
        .ci:hover .cg{opacity:.11}
        .ct{position:absolute;top:22px;right:22px;font-size:9px;font-weight:800;letter-spacing:.16em;color:var(--s400);font-family:var(--fd);background:var(--s50);border:1px solid var(--s100);padding:4px 9px;border-radius:6px}
        .cion{width:54px;height:54px;border-radius:15px;border:1px solid;display:flex;align-items:center;justify-content:center;margin-bottom:22px;transition:transform .28s;flex-shrink:0}
        .ci:hover .cion{transform:scale(1.1) rotate(-5deg)}
        .ctitle{font-family:var(--fd);font-size:21px;font-weight:800;color:var(--navy);margin-bottom:6px;letter-spacing:-.02em}
        .cprice{display:flex;align-items:baseline;gap:3px;margin-bottom:22px;padding-bottom:20px;border-bottom:1px solid var(--s100)}
        .pcur{font-size:16px;font-weight:700;color:var(--s300);font-family:var(--fd)}
        .pamt{font-family:var(--fd);font-size:38px;font-weight:800;color:var(--navy);letter-spacing:-.04em;line-height:1}
        .pper{font-size:12px;font-weight:600;color:var(--s400);margin-left:4px}
        .cfeats{list-style:none;display:flex;flex-direction:column;gap:11px;flex:1;margin-bottom:24px}
        .cfeats li{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:500;color:var(--s600)}
        .cbtn{width:100%;padding:13px;background:#fff;border:1.5px solid var(--s200);color:var(--navy);font-size:13px;font-weight:800;font-family:var(--fd);border-radius:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .22s;letter-spacing:.01em}
        .cbtn:hover{background:var(--acc,var(--navy));color:#fff;border-color:var(--acc,var(--navy))}

        /* PLAN COMPARISON TABLE */
        .plan-sec{padding:88px 0;background:#fff}
        .plan-wrap{overflow-x:auto;border-radius:20px;border:1px solid var(--s200);background:#fff;box-shadow:0 4px 32px rgba(0,35,102,.06)}
        table.plan-table{width:100%;border-collapse:collapse;font-family:var(--fb)}
        .plan-table th{padding:28px 24px;font-family:var(--fd);font-size:13px;font-weight:800;text-align:center;border-bottom:2px solid var(--s100);position:relative;min-width:150px}
        .plan-table th:first-child{text-align:left;min-width:240px}
        .plan-table td{padding:15px 24px;font-size:13px;font-weight:500;color:var(--s600);border-bottom:1px solid var(--s100);text-align:center;transition:background .15s}
        .plan-table td:first-child{text-align:left;color:var(--s700);font-weight:600;font-size:13px}
        .plan-table tr:hover td{background:var(--s50)}
        .plan-table tr:last-child td{border-bottom:none}
        .th-free{color:var(--s500)}
        .th-pro{color:var(--navy)}
        .th-elite{color:var(--green)}
        .th-price{font-family:var(--fd);font-size:24px;font-weight:800;display:block;margin-top:4px}
        .th-period{font-size:11px;font-weight:600;color:var(--s400);display:block;margin-bottom:12px}
        .th-badge{display:inline-block;padding:3px 10px;border-radius:100px;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-family:var(--fd)}
        .badge-pro{background:rgba(0,35,102,.08);color:var(--navy)}
        .badge-elite{background:rgba(16,185,129,.1);color:var(--green)}
        .col-highlight{background:rgba(0,35,102,.025)}
        .tck{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:rgba(16,185,129,.1);color:var(--green)}
        .tcross{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:rgba(148,163,184,.1);color:var(--s300)}
        .tval{display:inline-block;padding:4px 10px;background:var(--s50);border:1px solid var(--s200);border-radius:6px;font-size:11.5px;font-weight:700;color:var(--navy);font-family:var(--fd)}
        .plan-cta-row td{padding:24px 24px;background:var(--s50) !important}
        .plan-btn{width:100%;padding:11px 0;border-radius:11px;font-family:var(--fd);font-size:13px;font-weight:800;cursor:pointer;border:none;transition:all .22s}
        .plan-btn-free{background:#fff;border:1.5px solid var(--s200);color:var(--s500)}
        .plan-btn-free:hover{background:var(--s100)}
        .plan-btn-pro{background:var(--navy);color:#fff;box-shadow:0 6px 20px rgba(0,35,102,.22)}
        .plan-btn-pro:hover{background:var(--navy-d);transform:translateY(-1px)}
        .plan-btn-elite{background:var(--green);color:#fff;box-shadow:0 6px 20px rgba(16,185,129,.28)}
        .plan-btn-elite:hover{background:var(--gd);transform:translateY(-1px)}

        /* GALLERY */
        .gal-sec{padding:88px 0 80px;background:#f0f4fb}
        .gal-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,220px);gap:16px}
        .gal-item{border-radius:18px;overflow:hidden;position:relative;cursor:pointer}
        .gal-item:first-child{grid-row:span 2;border-radius:22px}
        .gal-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s cubic-bezier(.4,0,.2,1)}
        .gal-item:hover img{transform:scale(1.06)}
        .gal-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,12,40,.72) 0%,transparent 52%);opacity:0;transition:opacity .3s;display:flex;align-items:flex-end;padding:20px}
        .gal-item:hover .gal-overlay{opacity:1}
        .gal-label{font-family:var(--fd);font-size:12px;font-weight:800;color:#fff;letter-spacing:.06em;text-transform:uppercase}

        /* TESTIMONIALS */
        .test-sec{padding:88px 0;background:#fff}
        .test-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
        .test-card{padding:36px 32px;border-radius:22px;border:1px solid var(--s100);background:var(--s50);transition:all .3s;position:relative}
        .test-card:hover{border-color:rgba(0,35,102,.12);box-shadow:0 16px 48px rgba(0,35,102,.07);transform:translateY(-3px);background:#fff}
        .test-quote-ico{position:absolute;top:28px;right:28px;color:var(--s200);pointer-events:none}
        .test-stars{display:flex;gap:3px;margin-bottom:18px}
        .test-text{font-size:14px;color:var(--s600);line-height:1.82;margin-bottom:24px;font-weight:500;font-style:italic}
        .test-author{display:flex;align-items:center;gap:14px}
        .test-initials{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:13px;font-weight:800;flex-shrink:0}
        .test-name{font-family:var(--fd);font-size:14px;font-weight:800;color:var(--navy)}
        .test-role{font-size:11.5px;color:var(--s400);font-weight:600;margin-top:2px}

        /* PREMIUM */
        .ps{padding:0 0 88px}
        .pb2{background:linear-gradient(135deg,#010e2a 0%,#002b7a 50%,#010e2a 100%);border-radius:28px;padding:68px;display:grid;grid-template-columns:1fr auto;gap:60px;align-items:center;position:relative;overflow:hidden}
        .po1{position:absolute;top:-80px;right:220px;width:280px;height:280px;background:radial-gradient(circle,rgba(16,185,129,.18),transparent);border-radius:50%;pointer-events:none}
        .po2{position:absolute;bottom:-60px;left:40px;width:180px;height:180px;background:radial-gradient(circle,rgba(99,102,241,.12),transparent);border-radius:50%;pointer-events:none}
        .pgrid{position:absolute;inset:0;opacity:.035;background-image:radial-gradient(#fff 1px,transparent 1px);background-size:30px 30px;pointer-events:none}
        .pl{position:relative;z-index:2}
        .pbadge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:100px;color:rgba(255,255,255,.65);font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;font-family:var(--fd);margin-bottom:22px}
        .ph2{font-family:var(--fd);font-size:clamp(26px,3.2vw,42px);font-weight:800;color:#fff;letter-spacing:-.03em;line-height:1.1;margin-bottom:32px}
        .pf{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .pfi{display:flex;align-items:center;gap:11px;font-size:13px;font-weight:500;color:rgba(255,255,255,.65)}
        .pck{width:24px;height:24px;background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.35);border-radius:7px;display:flex;align-items:center;justify-content:center;color:#6ee7b7;flex-shrink:0}
        .pcard{width:340px;background:#fff;border-radius:22px;padding:44px 36px;position:relative;z-index:2;box-shadow:0 36px 72px rgba(0,0,0,.32)}
        .pce{font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--s400);font-family:var(--fd);text-align:center;margin-bottom:10px}
        .ppr{display:flex;align-items:baseline;justify-content:center;gap:4px;margin-bottom:6px}
        .ppc{font-size:20px;font-weight:700;color:var(--s300);font-family:var(--fd)}
        .ppa{font-family:var(--fd);font-size:60px;font-weight:800;color:var(--navy);letter-spacing:-.05em;line-height:1}
        .ppd{font-size:14px;font-weight:600;color:var(--s400)}
        .ppn{text-align:center;font-size:11px;color:var(--s400);margin-bottom:28px;font-weight:500}
        .bsub{width:100%;padding:17px;background:var(--green);color:#fff;font-family:var(--fd);font-weight:800;font-size:15px;border:none;border-radius:14px;cursor:pointer;transition:all .25s;margin-bottom:14px;box-shadow:0 8px 22px rgba(16,185,129,.3)}
        .bsub:hover{background:var(--gd);transform:translateY(-2px);box-shadow:0 12px 30px rgba(16,185,129,.4)}
        .pcn{text-align:center;font-size:10px;font-weight:800;color:var(--s400);letter-spacing:.1em;text-transform:uppercase;font-family:var(--fd)}

        /* FAQ */
        .faq-sec{padding:88px 0;background:#f0f4fb}
        .faq-wrap{max-width:780px;margin:0 auto}
        .faq-item{border-radius:16px;border:1px solid var(--s200);background:#fff;margin-bottom:10px;cursor:pointer;overflow:hidden;transition:border-color .2s,box-shadow .2s}
        .faq-item:hover,.faq-item.open{border-color:rgba(0,35,102,.15);box-shadow:0 8px 28px rgba(0,35,102,.06)}
        .faq-q{display:flex;align-items:center;gap:14px;padding:20px 24px}
        .faq-num{font-family:var(--fd);font-size:10px;font-weight:800;letter-spacing:.12em;color:var(--green);min-width:28px}
        .faq-qtxt{font-family:var(--fd);font-size:15px;font-weight:700;color:var(--navy);flex:1}
        .faq-icon{color:var(--s400);transition:transform .3s;flex-shrink:0}
        .faq-item.open .faq-icon{transform:rotate(180deg);color:var(--green)}
        .faq-a{padding:0 24px 20px 56px;font-size:13.5px;color:var(--s500);line-height:1.78;font-weight:500}

        /* CONTACT */
        .con{background:#fff;padding:88px 0;border-top:1px solid var(--s100)}
        .cong{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:start}
        .conh2{font-family:var(--fd);font-size:clamp(26px,3.2vw,42px);font-weight:800;color:var(--navy);letter-spacing:-.03em;line-height:1.1;margin-bottom:14px}
        .cons{color:var(--s500);font-size:14.5px;line-height:1.8;margin-bottom:44px}
        .coni{display:flex;gap:18px;margin-bottom:28px;cursor:default}
        .conico{width:50px;height:50px;border-radius:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .28s}
        .coni:hover .conico{transform:scale(1.08) rotate(-5deg)}
        .conit{font-family:var(--fd);font-weight:800;color:var(--navy);font-size:15px;margin-bottom:3px}
        .conii{font-weight:600;color:var(--s600);font-size:13px;margin-bottom:2px}
        .conis{font-size:10px;font-weight:700;color:var(--s400);letter-spacing:.08em;text-transform:uppercase}
        .fw{background:var(--s50);border-radius:22px;padding:40px;border:1px solid var(--s100)}
        .fr{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .fg{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}
        .fl{font-size:9px;font-weight:800;color:var(--s400);letter-spacing:.18em;text-transform:uppercase;font-family:var(--fd)}
        .fi,.fta{background:#fff;border:1.5px solid var(--s200);border-radius:11px;padding:13px 16px;font-size:14px;font-weight:500;color:var(--s900);font-family:var(--fb);outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
        .fi:focus,.fta:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(16,185,129,.1)}
        .fta{resize:none}
        .pg{display:flex}
        .pp{padding:13px 14px;background:var(--s100);border:1.5px solid var(--s200);border-right:none;border-radius:11px 0 0 11px;font-size:12px;font-weight:800;color:var(--s400);font-family:var(--fd);white-space:nowrap}
        .pi{border-radius:0 11px 11px 0}
        .bsmt{width:100%;padding:16px;background:var(--navy);color:#fff;font-family:var(--fd);font-weight:800;font-size:15px;border:none;border-radius:13px;cursor:pointer;transition:all .25s;margin-top:6px;box-shadow:0 8px 22px rgba(0,35,102,.18)}
        .bsmt:hover{background:var(--navy-d);transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,35,102,.26)}

        /* FOOTER */
        .ft{background:var(--navy-d);padding:60px 0;text-align:center;border-top:1px solid rgba(255,255,255,.04)}
        .fts{display:flex;justify-content:center;gap:11px;margin-bottom:36px}
        .ftsl{width:42px;height:42px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:11px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.22);text-decoration:none;transition:all .25s}
        .ftsl:hover{background:var(--green);color:#fff;border-color:var(--green);transform:translateY(-2px)}
        .ftl{display:flex;justify-content:center;gap:24px;margin-bottom:28px;flex-wrap:wrap}
        .ftla{font-size:11px;font-weight:700;color:rgba(255,255,255,.18);text-decoration:none;font-family:var(--fd);letter-spacing:.06em;transition:color .2s}
        .ftla:hover{color:rgba(255,255,255,.45)}
        .ftc{font-size:10px;font-weight:700;color:rgba(255,255,255,.1);letter-spacing:.22em;text-transform:uppercase;font-family:var(--fd)}

        /* RESPONSIVE */
        @media(max-width:1024px){
          .feat-grid{grid-template-columns:repeat(2,1fr)}
          .pb2{grid-template-columns:1fr;padding:44px 32px}
          .pcard{width:100%}
          .pf{grid-template-columns:1fr}
        }
        @media(max-width:900px){
          .cg2,.test-grid{grid-template-columns:1fr}
          .cong{grid-template-columns:1fr;gap:44px}
          .fr{grid-template-columns:1fr}
          .ssi{grid-template-columns:1fr 1fr}
          .sti{border-right:none;border-bottom:1px solid var(--s100)}
          .nl{display:none}
          .hh1{font-size:36px}
          .ho-right{width:100%;background:rgba(2,8,30,.62)}
          .si{right:28px}
          .gal-grid{grid-template-columns:1fr 1fr;grid-template-rows:auto}
          .gal-item:first-child{grid-row:span 1}
          .feat-grid{grid-template-columns:1fr}
        }
          .mobile-menu-btn { display: none; background: none; border: none; cursor: pointer; color: #fff; padding: 5px; }
          .nav-menu-wrapper { display: flex; align-items: center; justify-content: space-between; flex: 1; gap: 36px; }
          @media (max-width: 1024px) {
            .mobile-menu-btn { display: block; }
            .nav-menu-wrapper { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: #002366; padding: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
            .nav-menu-wrapper.mobile-open { display: flex; }
            .nl { display: flex !important; flex-direction: column; width: 100%; align-items: flex-start; margin-bottom: 20px; }
            .nla { margin-bottom: 15px; }
            .na { flex-direction: column; width: 100%; align-items: flex-start; }
            .nab { width: 100%; margin-bottom: 10px; }
          }
      `}</style>

      {/* PROMO */}
      <div className="pb">
        <FiZap fill="currentColor" size={11} />
        <span>Flat 20% OFF on all plans · Use code <span className="pa">MAVEN20</span> · Limited Seats</span>
        <FiZap fill="currentColor" size={11} />
      </div>

      {/* NAVBAR */}
      <header className={`nb${isScrolled ? ' sc' : ''}`}>
        <div className="nbi">
          <div className="nav-brand-area" style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <img src={mavenLogo} alt="MavenJobs" className="logo-img" />
              <div style={{ background: 'linear-gradient(135deg, #10b981, #0da371)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.12em', fontFamily: 'var(--fd)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>PRO</div>
            </Link>

            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>

          <div className={`nav-menu-wrapper ${isMobileMenuOpen ? "mobile-open" : ""}`}>
            <nav className="nl">
              <a href="#features" className="nla">Features</a>
              <a href="#plans" className="nla ac">Pricing</a>
              <a href="#faq" className="nla">FAQ</a>
            </nav>
            <div className="na" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {!user ? (
                <>
                  <button className="btnl" onClick={openLogin}>Login</button>
                  <button className="btnr" onClick={openRegister}>Get Started Free</button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button title="Notifications" style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isScrolled ? '#f8fafc' : 'rgba(255,255,255,0.1)', border: isScrolled ? '1.5px solid #e2e8f0' : '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: isScrolled ? '#002366' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <FiBell size={20} />
                    <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: '#0DBF7B', borderRadius: '50%', border: `2px solid ${isScrolled ? 'white' : '#002366'}` }}></span>
                  </button>
                  <Link to="/profile" style={{ textDecoration: 'none' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', padding: '2px', background: 'linear-gradient(135deg,#1E5EFF,#0DBF7B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover', border: `2px solid ${isScrolled ? '#002366' : 'white'}` }} />
                    </div>
                  </Link>
                  <button onClick={logout} title="Logout" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isScrolled ? 'rgba(239,68,68,.08)' : 'rgba(255,255,255,.08)', border: isScrolled ? '1.5px solid rgba(239,68,68,.15)' : '1px solid rgba(255,255,255,.15)', borderRadius: '12px', color: isScrolled ? '#EF4444' : 'rgba(255,255,255,.9)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#EF4444' }} onMouseOut={e => { e.currentTarget.style.background = isScrolled ? 'rgba(239,68,68,.08)' : 'rgba(255,255,255,.08)'; e.currentTarget.style.color = isScrolled ? '#EF4444' : 'rgba(255,255,255,.9)'; e.currentTarget.style.borderColor = isScrolled ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.15)' }}>
                    <FiLogOut size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* HERO — BOT LEFT, CONTENT RIGHT */}
      <section className="hero" id="hero">
        <div className="spline-wrap">
          <iframe
            src="https://my.spline.design/robotfollowcursorforlandingpage-hS0YvCWqGXh7qtQLoI7hRBJR/"
            title="3D AI Robot"
            allowFullScreen
          />
        </div>
        <div className="ho-top" />
        <div className="ho-right" />
        <div className="ho-bot" />
        <div className="hc">
          <div className="htext">
            <div className="heb">
              <FiZap size={11} fill="currentColor" />
              India's #1 Career Acceleration Platform
            </div>
            <h1 className="hh1">
              Your Dream Job<br />Is One Step <span className="acc">Closer</span>
            </h1>
            <p className="hsub">
              AI-crafted resumes, expert career coaches, and recruiter-boosting tools — built to get you hired faster at India's top companies.
            </p>
            <div className="hbtns">
              <a href="#plans" className="hbp">View Plans & Pricing <FiArrowRight size={15} /></a>
              <a href="#contact" className="hbg"><FiPlay size={12} fill="currentColor" /> Speak to a Coach</a>
            </div>
            <div className="htrust">
              <div className="htp"><div className="htpdot" />2.8M+ Professionals</div>
              <div className="htp"><div className="htpdot" />94% Interview Rate</div>
              <div className="htp"><div className="htpdot" />4.9★ on Google</div>
            </div>
          </div>
        </div>
        <div className="si">
          <div className="sl" />
          <span>Scroll</span>
        </div>
      </section>

      {/* STATS */}
      <div className="ss">
        <div className="ssi">
          {[
            { num: '2.8M+', label: 'Careers Accelerated' },
            { num: '94%', label: 'Interview Success Rate' },
            { num: '1,200+', label: 'Hiring Partners' },
            { num: '4.9★', label: 'Avg. User Rating' },
          ].map((s, i) => (
            <div key={i} className="sti">
              <div className="stn">{s.num}</div>
              <div className="stl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PARTNERS MARQUEE */}
      <div className="partners-sec">
        <div className="partners-track">
          {['Google', 'Microsoft', 'Amazon', 'Flipkart', 'Infosys', 'Wipro', 'TCS', 'Zomato', 'Swiggy', "Byju's", 'Razorpay', 'CRED', 'Meesho', 'PhonePe', 'Paytm', 'Ola', 'Freshworks', 'Zoho',
            'Google', 'Microsoft', 'Amazon', 'Flipkart', 'Infosys', 'Wipro', 'TCS', 'Zomato', 'Swiggy', "Byju's", 'Razorpay', 'CRED', 'Meesho', 'PhonePe', 'Paytm', 'Ola', 'Freshworks', 'Zoho'
          ].map((name, i) => (
            <span key={i} className="partner-logo">{name}</span>
          ))}
        </div>
      </div>

      {/* WHY MAVEN */}
      <div className="feat-sec" id="features">
        <div className="sw2">
          <div className="sf" ref={r5}>
            <div className="sh2">
              <span className="se">WHY MAVENPRO</span>
              <h2 className="stt">Six Pillars of Career<br />Acceleration</h2>
              <div className="sdiv" />
              <p className="sd">Every feature is engineered around one goal — getting you into the interview room faster than the competition.</p>
            </div>
            <div className="feat-grid">
              {features.map((f, i) => (
                <div key={i} className="feat-card fc" style={{ '--d': `${i * 85}ms` }} ref={useFadeIn()}>
                  <div className="feat-icon" style={{ background: `${f.color}12`, color: f.color }}>{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SERVICES */}
      <div id="plans">
        {serviceCategories.map((cat, idx) => (
          <div key={idx} style={{ background: idx % 2 === 1 ? '#fff' : '#f0f4fb' }}>
            <div className="sw2">
              <div className="cs sf" ref={idx === 0 ? r1 : r2}>
                <div className="sh2">
                  <span className="se">{cat.sub}</span>
                  <h2 className="stt">{cat.title}</h2>
                  <div className="sdiv" />
                  <p className="sd">{cat.desc}</p>
                </div>
                <div className="cg2">
                  {cat.services.map((svc, si) => (
                    <ServiceCard key={si} service={svc} delay={si * 110} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PLAN COMPARISON TABLE */}
      <div className="plan-sec">
        <div className="sw2">
          <div className="sf" ref={r8}>
            <div className="sh2">
              <span className="se">COMPARE PLANS</span>
              <h2 className="stt">Free vs Pro vs Elite —<br />See Every Difference</h2>
              <div className="sdiv" />
              <p className="sd">Every feature, every limit, every advantage — transparently laid out so you can choose with complete confidence.</p>
            </div>
            <div className="plan-wrap">
              <table className="plan-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>
                      <span style={{ fontFamily: 'var(--fd)', fontSize: '11px', color: 'var(--s400)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800 }}>Features</span>
                    </th>
                    {planData.plans.map((p, i) => (
                      <th key={i} className={i === 1 ? 'col-highlight' : ''}>
                        <span className={`th-${p.name.toLowerCase()}`} style={{ fontFamily: 'var(--fd)', fontSize: '15px', fontWeight: 800, display: 'block' }}>{p.name}</span>
                        <span className={`th-${p.name.toLowerCase()}`} style={{ fontFamily: 'var(--fd)', fontSize: '26px', fontWeight: 800, display: 'block', marginTop: '4px' }}>{p.price}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--s400)', display: 'block', marginBottom: '10px' }}>{p.period}</span>
                        {i === 1 && <span className="th-badge badge-pro">Most Popular</span>}
                        {i === 2 && <span className="th-badge badge-elite">Best Value</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {planData.features.map((row, ri) => (
                    <tr key={ri}>
                      <td>{row.label}</td>
                      <td>{renderCell(row.free)}</td>
                      <td className="col-highlight">{renderCell(row.pro)}</td>
                      <td>{renderCell(row.elite)}</td>
                    </tr>
                  ))}
                  <tr className="plan-cta-row">
                    <td style={{ fontFamily: 'var(--fd)', fontSize: '13px', fontWeight: 800, color: 'var(--navy)' }}>Ready to get started?</td>
                    <td><button className="plan-btn plan-btn-free">Start Free</button></td>
                    <td className="col-highlight"><button className="plan-btn plan-btn-pro">Get Pro</button></td>
                    <td><button className="plan-btn plan-btn-elite">Go Elite</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* GALLERY */}
      <div className="gal-sec">
        <div className="sw2">
          <div className="sf" ref={r6}>
            <div className="sh2">
              <span className="se">MAVEN IN ACTION</span>
              <h2 className="stt">Where Ambition Meets<br />Opportunity</h2>
              <div className="sdiv" />
              <p className="sd">From live coaching sessions to AI-driven dashboards — MavenPro is the platform serious professionals trust.</p>
            </div>
            <div className="gal-grid">
              {galleryImages.map((img, i) => (
                <div key={i} className="gal-item">
                  <img src={img.src} alt={img.label} loading="lazy" />
                  <div className="gal-overlay">
                    <span className="gal-label">{img.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIALS — initials only, no photos */}
      <div className="test-sec">
        <div className="sw2">
          <div className="sf" ref={r7}>
            <div className="sh2">
              <span className="se">SUCCESS STORIES</span>
              <h2 className="stt">Trusted by 2.8M+<br />Ambitious Professionals</h2>
              <div className="sdiv" />
              <p className="sd">Hear directly from the people whose careers were transformed — in their own words, unedited.</p>
            </div>
            <div className="test-grid">
              {testimonials.map((t, i) => (
                <div key={i} className="test-card fc" style={{ '--d': `${i * 100}ms` }} ref={useFadeIn()}>
                  <div className="test-quote-ico"><FaQuoteLeft size={30} /></div>
                  <div className="test-stars">
                    {Array(t.stars).fill(0).map((_, j) => (
                      <FiStar key={j} size={14} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <p className="test-text">"{t.text}"</p>
                  <div className="test-author">
                    <div className="test-initials" style={{ background: `${t.color}14`, color: t.color }}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="test-name">{t.name}</div>
                      <div className="test-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM CTA */}
      <div style={{ background: '#f0f4fb' }}>
        <div className="sw2">
          <div className="ps">
            <div className="pb2 sf" ref={r3}>
              <div className="pgrid" /><div className="po1" /><div className="po2" />
              <div className="pl">
                <div className="pbadge">
                  <FiStar size={11} fill="#f59e0b" color="#f59e0b" />
                  Premium Subscriptions
                </div>
                <h2 className="ph2">Unlock Your Full Career<br />Potential with Pro</h2>
                <div className="pf">
                  {["Rank #1 in Recruiter Searches", "Priority Access to Hidden Jobs", "Message Any Recruiter Directly", "Real-Time WhatsApp Job Alerts"].map((item, i) => (
                    <div key={i} className="pfi">
                      <div className="pck"><FiCheck size={12} strokeWidth={3} /></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pcard">
                <p className="pce">Pro Plan — Starting at</p>
                <div className="ppr">
                  <span className="ppc">₹</span>
                  <span className="ppa">890</span>
                  <span className="ppd">/mo</span>
                </div>
                <p className="ppn">Billed monthly · Cancel anytime · No lock-in</p>
                <button className="bsub">Activate Pro Now</button>
                <p className="pcn">Secure Checkout · Instant Access</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="faq-sec" id="faq">        <div className="sw2">
        <div className="sh2">
          <span className="se">GOT QUESTIONS?</span>
          <h2 className="stt">Frequently Asked Questions</h2>
          <div className="sdiv" />
          <p className="sd">Everything you need to know about MavenPro plans, delivery timelines, and how we help you get hired.</p>
        </div>
        <div className="faq-wrap">
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} idx={i} />
          ))}
        </div>
      </div>
      </div>

      {/* CONTACT */}
      <section id="contact" className="con">
        <div className="sw2">
          <div className="cong sf" ref={r4}>
            <div>
              <h2 className="conh2">Talk to a Career Expert — Free</h2>
              <p className="cons">Not sure which plan is right for you? Our experts will analyse your profile, understand your goals, and recommend the fastest path to your next offer.</p>
              {[
                { icon: <FiPhone size={20} />, title: 'Call Us Anytime', info: 'Toll Free: 1800-102-5557', sub: 'MON – SAT · 9:00 AM – 9:00 PM IST', color: '#10b981' },
                { icon: <FiMail size={20} />, title: 'Email Support', info: 'support@mavenjobs.com', sub: 'Average reply time: under 2 hours', color: '#002366' },
                { icon: <FiMapPin size={20} />, title: 'Corporate Headquarters', info: 'Level 4, Maven Tower, Bangalore', sub: 'Karnataka · 560 103', color: '#6366f1' },
              ].map((item, i) => (
                <div key={i} className="coni">
                  <div className="conico" style={{ background: `${item.color}0f`, color: item.color }}>{item.icon}</div>
                  <div>
                    <div className="conit">{item.title}</div>
                    <div className="conii">{item.info}</div>
                    <div className="conis">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="fw">
              <div className="fr">
                <div className="fg" style={{ margin: 0 }}>
                  <label className="fl">Full Name</label>
                  <input className="fi" type="text" placeholder="Rahul Sharma" />
                </div>
                <div className="fg" style={{ margin: 0 }}>
                  <label className="fl">Work Email</label>
                  <input className="fi" type="email" placeholder="rahul@company.com" />
                </div>
              </div>
              <div className="fg">
                <label className="fl">Phone Number</label>
                <div className="pg">
                  <div className="pp">+91</div>
                  <input className="fi pi" type="tel" placeholder="98765 43210" />
                </div>
              </div>
              <div className="fg">
                <label className="fl">How Can We Help?</label>
                <textarea className="fi fta" rows={4} placeholder="I'm looking to switch from finance to product management and need help with my resume and interview prep..." />
              </div>
              <button className="bsmt">Request a Free Callback →</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ft">
        <div className="sw2">
          <img src={mavenLogo} alt="MavenJobs" style={{ height: 26, margin: '0 auto 36px', display: 'block', opacity: .28, filter: 'brightness(0) invert(1)' }} />
          <div className="fts">
            {[FaFacebookF, FaLinkedinIn, FaXTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="ftsl"><Icon size={15} /></a>
            ))}
          </div>
          <div className="ftl">
            {['Privacy Policy', 'Terms of Use', 'Refund Policy', 'Sitemap', 'Careers', 'Blog'].map(l => (
              <a key={l} href="#" className="ftla">{l}</a>
            ))}
          </div>
          <p className="ftc">© 2026 MavenJobs Private Limited · All Rights Reserved · CIN: U74999KA2022PTC000001</p>
        </div>
      </footer>
    </>
  );
};

export default MavenPro;