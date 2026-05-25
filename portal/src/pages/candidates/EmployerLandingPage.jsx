import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FiArrowRight, FiUsers, FiZap, FiSearch, FiAward,
  FiMessageSquare, FiCheckCircle, FiTrendingUp, FiBriefcase,
  FiX, FiChevronDown, FiPlay, FiShield, FiBarChart2,
  FiTarget, FiCpu, FiLayers, FiHelpCircle, FiEye, FiEyeOff, FiRefreshCcw
} from 'react-icons/fi';
import { FaBuilding, FaQuoteLeft } from 'react-icons/fa';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import promoImg from '../../../assets/free-job-posting-promo.png';
import { useAuth } from '../../AuthContext';
import authService from '../../services/authService';
import './EmployerLandingPage.css';

const EmployerLandingPage = () => {
  const navigate = useNavigate();
  useAuth();
  const [employerSession, setEmployerSession] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("employerUser") || "null");
      return savedUser ? { ...savedUser, companyName: savedUser.companyName || savedUser.company || "" } : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('signup');

  const [hiringFor, setHiringFor] = useState('company');
  const [scrolled, setScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOfferings, setShowOfferings] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('Select range');
  const [activeOfferingTab, setActiveOfferingTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [formStatus, setFormStatus] = useState({ loading: false, message: "", error: "" });
  const [employerData, setEmployerData] = useState({ stats: [], partners: [] });
  const [enquiry, setEnquiry] = useState({
    fullName: "",
    phone: "",
    email: "",
    companyName: "",
    designation: "",
    city: "",
    password: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;
    authService.getEmployerLanding()
      .then((response) => {
        if (isMounted && response?.success) {
          setEmployerData(response.data || { stats: [], partners: [] });
        }
      })
      .catch(() => {
        if (isMounted) setEmployerData({ stats: [], partners: [] });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const offerings = [
    { title: 'Job Posting', desc: 'Receive applications instantly and connect with high-quality, relevant candidates at scale.', icon: <FiBriefcase />, color: '#2563eb', bg: '#eff6ff', path: '/job-posting' },
    { title: 'Resume Database', desc: 'Access and attract from a real-time pool of 10 crore+ active jobseekers across India.', icon: <FiSearch />, color: '#7c3aed', bg: '#f5f3ff', path: '/resume-database' },
    { title: 'Expert Assist', desc: 'Leave sourcing and shortlisting to our hiring experts — you focus only on final interviews.', icon: <FiUsers />, color: '#0891b2', bg: '#ecfeff', path: '/expert-assist' },
    { title: 'Employer Branding', desc: 'Stand out as a top workplace and attract passive talent through custom brand campaigns.', icon: <FiAward />, color: '#d97706', bg: '#fffbeb', path: '/branding' },
    { title: 'Hiring Automation', desc: 'Streamline your recruitment workflow with AI-powered ATS and smart screening tools.', icon: <FiCpu />, color: '#059669', bg: '#ecfdf5', path: '/hiring-automation' },
    { title: 'Talent Planning', desc: 'Get deep insights into market trends and salary benchmarks to plan hiring with precision.', icon: <FiBarChart2 />, color: '#e11d48', bg: '#fff1f2', path: '/talent-pulse' },
  ];

  const fallbackStats = [
    { value: '10Cr+', label: 'Registered jobseekers' },
    { value: '1.5L+', label: 'Companies trust us' },
    { value: '98%', label: 'Placement success rate' },
    { value: '48hrs', label: 'Average time-to-hire' },
  ];
  const fallbackPartners = [
    { id: 'mavenjobs', name: 'Maven Jobs' },
    { id: 'mks-industrial-solutions', name: 'MKS Industrial Solutions' },
    { id: 'hello-ltd', name: 'HELLO LTD' },
    { id: 'godslayer', name: 'GODSLAYER' },
  ];
  const stats = employerData.stats?.length ? employerData.stats : fallbackStats;
  const partners = employerData.partners?.length
    ? employerData.partners
    : fallbackPartners;
  const marqueePartners = [...partners, ...partners];

  const testimonials = [
    { name: 'Priya Sharma', role: 'VP Talent, Flipkart', text: 'MavenJobs helped us cut our hiring cycle by 40%. The AI-matching is genuinely impressive.', initials: 'PS', color: '#2563eb' },
    { name: 'Arjun Mehta', role: 'HR Director, TCS', text: 'We filled 200+ roles in a quarter using Resdex. The quality of candidates is unmatched.', initials: 'AM', color: '#7c3aed' },
    { name: 'Sneha Iyer', role: 'Talent Lead, Microsoft', text: 'The employer branding tools helped us become a recognized top workplace within 6 months.', initials: 'SI', color: '#059669' },
  ];

  const businessTypes = [
    {
      icon: <FaBuilding size={28} />,
      title: 'Large enterprises',
      subtitle: 'End-to-end talent strategy',
      color: '#2563eb', bg: '#eff6ff',
      features: ['Fill any role — from bulk to leadership', 'AI-powered candidate scoring', 'Custom employer brand campaigns', 'Dedicated account management'],
    },
    {
      icon: <FiZap size={28} />,
      title: 'SMBs & startups',
      subtitle: 'Lean hiring, big results',
      color: '#059669', bg: '#ecfdf5',
      features: ['Find local candidates across India', 'Hire for relevant experience fast', 'Start hiring with affordable plans', 'Self-serve dashboard'],
      featured: true,
    },
    {
      icon: <FiMessageSquare size={28} />,
      title: 'Consultants & agencies',
      subtitle: 'Scale your placements',
      color: '#7c3aed', bg: '#f5f3ff',
      features: ['Speed up hiring with faster turnaround', 'Multi-client management dashboard', 'Instantly connect with candidates', 'Performance analytics'],
    },
  ];

  const steps = [
    { num: '01', title: 'Create your account', desc: 'Sign up in under 2 minutes and set up your employer profile.' },
    { num: '02', title: 'Post your requirements', desc: 'Describe the role and let our AI surface the best-fit candidates.' },
    { num: '03', title: 'Review & shortlist', desc: 'Get ranked applications with AI insights straight to your dashboard.' },
    { num: '04', title: 'Hire with confidence', desc: 'Interview, select, and onboard — all tracked in one place.' },
  ];

  const updateEnquiry = (field, value) => {
    const nextValue = field === "phone"
      ? String(value || "").replace(/\D/g, "").slice(0, 10)
      : value;
    setEnquiry((current) => ({ ...current, [field]: nextValue }));
    setFormStatus({ loading: false, message: "", error: "" });
  };

  const submitEmployerSignup = async (event) => {
    event.preventDefault();
    const companyName = enquiry.companyName.trim();
    const email = enquiry.email.trim();
    const phone = enquiry.phone.trim();
    const fullName = enquiry.fullName.trim();
    const password = enquiry.password.trim();

    if (!fullName || !companyName || !email || !phone || !password) {
      setFormStatus({ loading: false, message: "", error: "Please enter your name, company, work email, mobile number, and password." });
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setFormStatus({ loading: false, message: "", error: "Enter a valid 10 digit mobile number." });
      return;
    }

    if (password.length < 7 || password.length > 20) {
      setFormStatus({ loading: false, message: "", error: "Password must be between 7 and 20 characters." });
      return;
    }

    setFormStatus({ loading: true, message: "", error: "" });
    try {
      const response = await authService.employerRegister({
        fullName,
        companyName,
        email,
        phone,
        password,
        hiringFor,
        designation: enquiry.designation.trim() || (hiringFor === "consultancy" ? "Consultancy" : "Company"),
        city: enquiry.city.trim(),
      });

      const employerUser = {
        ...(response?.user || {}),
        companyName: response?.company?.name || response?.user?.companyName || companyName,
      };

      localStorage.setItem("employerToken", response.token);
      localStorage.setItem("employerUser", JSON.stringify(employerUser));
      setEmployerSession(employerUser);

      setFormStatus({
        loading: false,
        message: "Account created successfully. Redirecting to your dashboard...",
        error: "",
      });
      setEnquiry({ fullName: "", phone: "", email: "", companyName: "", designation: "", city: "", password: "" });
      setTimeout(() => navigate("/employer-dashboard"), 650);
    } catch (error) {
      setFormStatus({ loading: false, message: "", error: error.message || "Unable to submit request right now." });
    }
  };

  const submitCallbackRequest = async (event) => {
    event.preventDefault();
    const companyName = enquiry.companyName.trim();
    const email = enquiry.email.trim();
    const phone = enquiry.phone.trim();
    const roleTitle = enquiry.designation.trim() || `Employer signup for ${enquiry.fullName.trim() || companyName}`;

    if (!companyName || !email || !phone || !roleTitle) {
      setFormStatus({ loading: false, message: "", error: "Please enter company, work email, phone, and designation." });
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setFormStatus({ loading: false, message: "", error: "Enter a valid 10 digit mobile number." });
      return;
    }

    setFormStatus({ loading: true, message: "", error: "" });
    try {
      const response = await authService.submitEmployerEnquiry({
        companyName,
        email,
        phone: `+91${phone}`,
        roleTitle,
        roleDescription: [
          enquiry.fullName ? `Contact: ${enquiry.fullName}` : "",
          hiringFor ? `Hiring for: ${hiringFor}` : "",
          enquiry.city ? `City: ${enquiry.city}` : "",
          selectedRange !== "Select range" ? `Hiring range: ${selectedRange}` : "",
        ].filter(Boolean).join("\n"),
        budget: selectedRange !== "Select range" ? selectedRange : "",
      });

      setFormStatus({
        loading: false,
        message: response?.referenceId
          ? `Sign up submitted. Reference ID: ${response.referenceId}`
          : "Sign up submitted. Our team will contact you shortly.",
        error: "",
      });
      setEnquiry({ fullName: "", phone: "", email: "", companyName: "", designation: "", city: "", password: "" });
      setSelectedRange("Select range");
    } catch (error) {
      setFormStatus({ loading: false, message: "", error: error.message || "Unable to submit request right now." });
    }
  };

  const submitEmployerLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await authService.employerLogin(loginEmail, loginPassword);
      if (response?.token) {
        localStorage.setItem("employerToken", response.token);
        const employerUser = {
          ...(response.user || {}),
          companyName: response?.company?.name || response?.user?.companyName || "",
        };
        localStorage.setItem("employerUser", JSON.stringify(employerUser));
        setEmployerSession(employerUser);
      }
      navigate("/employer-dashboard");
    } catch (error) {
      setLoginError(error.message || "Invalid employer credentials.");
    }
  };

  return (
    <div className="elp-root">

      {/* ─── Navbar ─── */}
      <nav className={`elp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="elp-nav-inner">
          <Link to="/employer-login" className="elp-logo">
            <img src={mavenLogo} alt="MavenJobs" style={{ height: 36 }} />
          </Link>
          <div className="elp-nav-links">
            <div 
              className="elp-nav-item"
              onMouseEnter={() => setShowOfferings(true)}
              onMouseLeave={() => setShowOfferings(false)}
            >
              <a href="#offerings" className="elp-nav-link dropdown">
                Our offerings <FiChevronDown size={14} className={`elp-chevron ${showOfferings ? 'rotated' : ''}`} />
              </a>

              {/* ─── Mega Menu ─── */}
              <div className={`elp-mega-menu ${showOfferings ? 'visible' : ''}`}>
                <div className="elp-mega-inner">
                  <div className="elp-mega-grid">
                    {/* Promo Section */}
                    <div className="elp-mega-promo">
                      <div className="elp-promo-card">
                        <img src={promoImg} alt="Promo" className="elp-promo-img" />
                        <div className="elp-promo-content">
                          <h3>With Free Job Posting, hire local talent at zero cost</h3>
                          <div className="elp-promo-bullets">
                            <p>Unlimited free postings with <strong>one active job at a time</strong></p>
                            <p>Get up to <strong>50 candidates/job</strong> while your post remains visible for 7 days</p>
                          </div>
                          <Link to="/job-posting" className="elp-promo-link" onClick={() => setShowOfferings(false)}>
                            Free Job Posting <FiArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* By Products */}
                    <div className="elp-mega-section">
                      <span className="elp-section-label">BY PRODUCTS</span>
                      <div className="elp-section-links">
                        <Link to="/job-posting" className="elp-mega-link" onClick={() => setShowOfferings(false)}>
                          <div className="elp-mega-link-title">Job Posting</div>
                          <div className="elp-mega-link-desc">Find & attract relevant talent</div>
                        </Link>
                        <Link to="/resume-database" className="elp-mega-link" onClick={() => setShowOfferings(false)}>
                          <div className="elp-mega-link-title">Resume Database (Resdex)</div>
                          <div className="elp-mega-link-desc">Access India's largest database</div>
                        </Link>
                        <Link to="/hiring-automation" className="elp-mega-link" onClick={() => setShowOfferings(false)}>
                          <div className="elp-mega-link-title">Hiring Automation</div>
                          <div className="elp-mega-link-desc">Streamline your recruitment workflow</div>
                        </Link>
                        <Link to="/expert-assist" className="elp-mega-link" onClick={() => setShowOfferings(false)}>
                          <div className="elp-mega-link-title">Expert Assist</div>
                          <div className="elp-mega-link-desc">Our Assisted hiring solution</div>
                        </Link>
                        <Link to="/branding" className="elp-mega-link" onClick={() => setShowOfferings(false)}>
                          <div className="elp-mega-link-title">Employer Branding</div>
                          <div className="elp-mega-link-desc">Showcase your brand presence</div>
                        </Link>
                        <Link to="/talent-pulse" className="elp-mega-link" onClick={() => setShowOfferings(false)}>
                          <div className="elp-mega-link-title">Talent Planning</div>
                          <div className="elp-mega-link-desc">Make informed hiring decisions</div>
                        </Link>
                      </div>
                    </div>

                    {/* By Business Type */}
                    <div className="elp-mega-section">
                      <span className="elp-section-label">BY BUSINESS TYPE</span>
                      <div className="elp-section-links">
                        <Link to="/enterprises" className="elp-mega-link simple" onClick={() => setShowOfferings(false)}>Enterprises</Link>
                        <Link to="/smb" className="elp-mega-link simple" onClick={() => setShowOfferings(false)}>Small & medium business</Link>
                        <Link to="/agencies" className="elp-mega-link simple" onClick={() => setShowOfferings(false)}>Consultants & agency</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <a href="#solutions" className="elp-nav-link">Solutions</a>
            <a href="#how-it-works" className="elp-nav-link">How it works</a>
            <a href="#resources" className="elp-nav-link">Resources</a>
          </div>
          <div className="elp-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="elp-btn-filled" onClick={() => navigate('/post-job')}>Post a job</button>
            <Link to="/employer-help" className="elp-help-trigger" title="Help & Support" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none',
              transition: 'all 0.2s ease', cursor: 'pointer'
            }}>
              <FiHelpCircle size={20} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="elp-hero">
        <div className="elp-hero-spline">
          <iframe
            src="https://my.spline.design/3drobotheadtrackingmouse-NHtRtyr7t11PThDyraVaeDCW/"
            frameBorder="0"
            width="100%"
            height="100%"
            title="Spline Background"
          />
          <div className="elp-hero-overlay" />
        </div>

        <div className="elp-hero-inner">
          <div className="elp-hero-left">
            <div className="elp-hero-eyebrow">
              <span className="elp-eyebrow-dot" />
              Talent Decoded
            </div>
            <h1 className="elp-hero-h1">
              Decode India's<br />
              largest talent pool<br />
              with the power of <span className="elp-hero-accent">AI</span>
            </h1>
            <p className="elp-hero-sub">
              Accelerate hiring with data-driven precision. Scale your workforce with unparalleled intelligence and seamless recruitment workflows.
            </p>

            <div className="elp-hero-stats">
              {stats.map((s, i) => (
                <div key={i} className="elp-hero-stat">
                  <span className="elp-hero-stat-val">{s.value}</span>
                  <span className="elp-hero-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="elp-hero-ctas">
              <button className="elp-btn-filled elp-btn-lg" onClick={() => navigate('/post-job')}>
                Get started free <FiArrowRight size={18} />
              </button>

              <button className="elp-btn-ghost">
                <span className="elp-play-btn"><FiPlay size={14} /></span>
                Watch demo
              </button>
            </div>
          </div>

          {/* Callback Card / Profile Modal */}
          <div className="elp-callback-card" style={employerSession ? { padding: 0, overflow: 'hidden' } : {}}>
            {!employerSession && (
              <div className="elp-callback-tabs">
                <button
                  type="button"
                  className={`elp-callback-tab ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => setActiveTab('signup')}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  className={`elp-callback-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  Login
                </button>
              </div>
            )}

            {employerSession ? (
              <div className="elp-profile-modal">
                {/* Cover Image */}
                <div style={{
                  height: '140px',
                  background: `url("https://i.pinimg.com/736x/1d/5b/a0/1d5ba0f8288cd496cdb9714d6456b097.jpg") center/cover no-repeat`,
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))'
                  }} />
                </div>

                {/* Profile Info */}
                <div style={{ padding: '0 24px 24px', textAlign: 'center', marginTop: '-45px' }}>
                  <div style={{
                    width: '90px', height: '90px', borderRadius: '20px',
                    background: `url("https://i.pinimg.com/736x/59/d5/de/59d5deb71f0608503a43a356cffa81a7.jpg") center/cover no-repeat`,
                    border: '4px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    margin: '0 auto 16px',
                    position: 'relative',
                    backdropFilter: 'blur(10px)'
                  }} />
                  
                  <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px', fontFamily: 'inherit' }}>{employerSession.companyName || employerSession.username || "Employer workspace"}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '20px' }}>{employerSession.email || "Verified employer account"}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ color: '#10b981', fontWeight: '800', fontSize: '1.1rem' }}>24</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Jobs</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ color: '#6366f1', fontWeight: '800', fontSize: '1.1rem' }}>1.2K</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applicants</div>
                    </div>
                  </div>

                  <button 
                    className="elp-btn-callback" 
                    onClick={() => navigate('/employer-dashboard')}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', border: 'none', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)' }}
                  >
                    Go to Dashboard <FiArrowRight size={18} />
                  </button>
                </div>
              </div>
            ) : activeTab === 'signup' ? (
              <form className="elp-callback-form" onSubmit={submitEmployerSignup}>
                <div className="elp-form-group">
                  <label>Full name</label>
                  <input type="text" placeholder="Enter your full name" value={enquiry.fullName} onChange={(event) => updateEnquiry("fullName", event.target.value)} />
                </div>
                <div className="elp-form-group">
                  <label>Mobile number</label>
                  <div className="elp-phone-input">
                    <span>+91</span>
                    <input type="tel" inputMode="numeric" placeholder="10 digit mobile number" value={enquiry.phone} onChange={(event) => updateEnquiry("phone", event.target.value)} />
                  </div>
                </div>
                <div className="elp-form-group">
                  <label>Work email</label>
                  <input type="email" placeholder="Enter your work email" value={enquiry.email} onChange={(event) => updateEnquiry("email", event.target.value)} />
                </div>
                <div className="elp-form-group">
                  <label>Company / consultancy name</label>
                  <input type="text" placeholder="Enter organisation name" value={enquiry.companyName} onChange={(event) => updateEnquiry("companyName", event.target.value)} />
                </div>
                <div className="elp-form-group">
                  <label>Password</label>
                  <div className="elp-password-input">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={enquiry.password}
                      onChange={(event) => updateEnquiry("password", event.target.value)}
                      minLength={7}
                      maxLength={20}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="elp-password-toggle"
                      onClick={() => setShowSignupPassword((current) => !current)}
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <div className="elp-password-hint">Use 7 to 20 characters.</div>
                </div>
                <div className="elp-form-group">
                  <label>Hiring for</label>
                  <div className="elp-hiring-opts">
                    <div
                      className={`elp-hiring-opt ${hiringFor === 'company' ? 'active' : ''}`}
                      onClick={() => setHiringFor('company')}
                    >
                      Your company
                    </div>
                    <div
                      className={`elp-hiring-opt ${hiringFor === 'consultancy' ? 'active' : ''}`}
                      onClick={() => setHiringFor('consultancy')}
                    >
                      Your consultancy
                    </div>
                  </div>
                </div>
                {formStatus.error && <div className="elp-form-error">{formStatus.error}</div>}
                {formStatus.message && <div className="elp-form-success">{formStatus.message}</div>}
                <button type="submit" className="elp-btn-callback" disabled={formStatus.loading}>
                  {formStatus.loading ? "Creating account..." : "Sign Up"} <FiArrowRight size={16} />
                </button>
                <p className="elp-callback-note">
                  <FiShield size={12} /> Your data is safe. No spam, ever.
                </p>
              </form>
            ) : (
              <form className="elp-callback-form elp-login-form" onSubmit={submitEmployerLogin}>
                <div className="elp-form-group">
                  <label>Work Email ID</label>
                  <input
                    type="email"
                    placeholder="Enter registered email ID"
                    value={loginEmail}
                    onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }}
                  />
                </div>
                <div className="elp-form-group" style={{ position: 'relative' }}>
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      style={{ paddingRight: '44px' }}
                      value={loginPassword}
                      onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <a href="#" className="elp-forgot-link">Forgot password?</a>
                  </div>
                </div>

                {loginError && (
                  <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', marginBottom: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                    {loginError}
                  </div>
                )}
                
                <button type="submit" className="elp-btn-callback" style={{ marginTop: '12px' }}>
                  Log in
                </button>
                
                <div className="elp-login-footer">
                  Don't have a registered email?{" "}
                  <button
                    type="button"
                    className="elp-signup-link"
                    onClick={() => setActiveTab('signup')}
                  >
                    Create account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── Partners Strip ─── */}
      <div className="elp-partners">
        <div className="elp-partners-inner">
          <span className="elp-partners-label">Trusted by India's leading companies</span>
          <div className="elp-partners-marquee" aria-label="Trusted company logos marquee">
            <div className="elp-partners-track">
              {marqueePartners.map((partner, index) => {
                const key = `${partner.id || partner.name}-${index}`;
                const content = partner.logoUrl ? <img src={partner.logoUrl} alt={partner.name} /> : partner.name;
                return partner.id ? (
                  <Link key={key} to={`/company/${partner.id}`} className="elp-partner-logo">
                    {content}
                  </Link>
                ) : (
                  <span key={key} className="elp-partner-logo">
                    {content}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="elp-stats-bar">
        {stats.map((s, i) => (
          <div key={i} className="elp-stat-item">
            <span className="elp-stat-val">{s.value}</span>
            <span className="elp-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ─── Offerings ─── */}
      <section className="elp-section" id="offerings">
        <div className="elp-section-inner">
          <div className="elp-section-header">
            <span className="elp-eyebrow-tag">Our Solutions</span>
            <h2 className="elp-section-h2">Everything you need to hire better</h2>
            <p className="elp-section-sub">From planning and branding to sourcing and automation — we handle it all so you can focus on hiring the best talent.</p>
          </div>

          <div className="elp-offerings-grid">
            {offerings.map((item, i) => (
              <div key={i} className="elp-offering-card">
                <div className="elp-offering-icon" style={{ background: item.bg, color: item.color }}>
                  {item.icon}
                </div>
                <h3 className="elp-offering-title">{item.title}</h3>
                <p className="elp-offering-desc">{item.desc}</p>
                <Link to={item.path} className="elp-offering-link" style={{ color: item.color }}>
                  View plans <FiArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="elp-hiw-section" id="how-it-works">
        <div className="elp-section-inner">
          <div className="elp-section-header">
            <span className="elp-eyebrow-tag">Simple Process</span>
            <h2 className="elp-section-h2">Hire in 4 simple steps</h2>
            <p className="elp-section-sub">Get from job posting to hired candidate in record time.</p>
          </div>
          <div className="elp-steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="elp-step-card">
                <div className="elp-step-num">{step.num}</div>
                <div className="elp-step-connector" style={{ opacity: i < steps.length - 1 ? 1 : 0 }} />
                <h3 className="elp-step-title">{step.title}</h3>
                <p className="elp-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Business Types ─── */}
      <section className="elp-section elp-biz-section" id="solutions">
        <div className="elp-section-inner">
          <div className="elp-section-header">
            <span className="elp-eyebrow-tag">Business Focus</span>
            <h2 className="elp-section-h2">Built for every kind of business</h2>
            <p className="elp-section-sub">Big or small, we've got you covered at every stage of growth.</p>
          </div>
          <div className="elp-biz-grid">
            {businessTypes.map((biz, i) => (
              <div key={i} className={`elp-biz-card ${biz.featured ? 'featured' : ''}`}>
                {biz.featured && <div className="elp-featured-badge">Most popular</div>}
                <div className="elp-biz-icon" style={{ background: biz.bg, color: biz.color }}>
                  {biz.icon}
                </div>
                <h3 className="elp-biz-title">{biz.title}</h3>
                <p className="elp-biz-subtitle">{biz.subtitle}</p>
                <ul className="elp-biz-features">
                  {biz.features.map((f, j) => (
                    <li key={j}>
                      <FiCheckCircle size={15} style={{ color: biz.color, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="elp-biz-btn"
                  style={biz.featured ? { background: biz.color, color: 'white', borderColor: biz.color } : { borderColor: biz.color, color: biz.color }}
                  onClick={() => setIsModalOpen(true)}
                >
                  Sign Up
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="elp-testimonials-section">
        <div className="elp-section-inner">
          <div className="elp-section-header">
            <span className="elp-eyebrow-tag">Customer Stories</span>
            <h2 className="elp-section-h2">Trusted by 1.5L+ companies</h2>
          </div>
          <div className="elp-testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="elp-testimonial-card">
                <FaQuoteLeft size={20} style={{ color: t.color, opacity: 0.6, marginBottom: 16 }} />
                <p className="elp-testimonial-text">"{t.text}"</p>
                <div className="elp-testimonial-author">
                  <div className="elp-testimonial-avatar" style={{ background: t.color + '20', color: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="elp-testimonial-name">{t.name}</div>
                    <div className="elp-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="elp-cta-banner">
        <div className="elp-cta-inner">
          <div className="elp-cta-left">
            <h2 className="elp-cta-h2">Ready to find your next great hire?</h2>
            <p className="elp-cta-sub">Join 1.5 lakh+ companies already using MavenJobs to build world-class teams.</p>
          </div>
          <div className="elp-cta-actions">
            <button className="elp-btn-filled elp-btn-lg" onClick={() => setIsModalOpen(true)}>
              Get started free <FiArrowRight size={18} />
            </button>
            <a href="#" className="elp-cta-link">Talk to sales <FiArrowRight size={14} /></a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="elp-footer">
        <div className="elp-footer-inner">
          <div className="elp-footer-brand">
            <img src={mavenLogo} alt="MavenJobs" className="elp-footer-logo" />
            <p className="elp-footer-tagline">Decoding India's talent, one hire at a time.</p>
          </div>
          <div className="elp-footer-links">
            {['Privacy Policy', 'Terms of Service', 'Help Center', 'Cookies'].map(l => (
              <a key={l} href="#" className="elp-footer-link">{l}</a>
            ))}
          </div>
          <p className="elp-footer-copy">© 2026 MavenJobs. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── Modal ─── */}
      {isModalOpen && (
        <div className="elp-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="elp-modal elp-callback-card" onClick={e => e.stopPropagation()} style={{ background: 'rgba(20, 30, 60, 0.4)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="elp-modal-header" style={{ borderBottomColor: 'rgba(255,255,255,0.1)', marginBottom: '24px' }}>
              <div>
                <h2 className="elp-modal-title" style={{ color: '#fff', fontSize: '1.35rem' }}>Request a Callback</h2>
                <p className="elp-modal-subtitle" style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Our team will get back to you within 24 hours.</p>
              </div>
              <button className="elp-modal-close" onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                <FiX size={16} />
              </button>
            </div>

            <form className="elp-callback-form" onSubmit={submitCallbackRequest}>
              <div className="elp-form-group" style={{ marginBottom: '8px' }}>
                <div className="elp-hiring-opts">
                  <div className={`elp-hiring-opt ${hiringFor === 'company' ? 'active' : ''}`} onClick={() => setHiringFor('company')}>Your company</div>
                  <div className={`elp-hiring-opt ${hiringFor === 'consultancy' ? 'active' : ''}`} onClick={() => setHiringFor('consultancy')}>Your consultancy</div>
                </div>
              </div>

              {(hiringFor === 'company' || hiringFor === 'consultancy') && (
                <>
                  <div className="elp-form-group">
                    <input type="text" placeholder="Designation name" value={enquiry.designation} onChange={(event) => updateEnquiry("designation", event.target.value)} style={{ padding: '14px 16px' }} />
                  </div>
                  <div className="elp-form-group">
                    <input type="text" placeholder={hiringFor === 'company' ? 'Company name' : 'Consultancy name'} value={enquiry.companyName} onChange={(event) => updateEnquiry("companyName", event.target.value)} style={{ padding: '14px 16px' }} />
                  </div>
                  <div className="elp-form-group">
                    <input type="email" placeholder="Work email" value={enquiry.email} onChange={(event) => updateEnquiry("email", event.target.value)} style={{ padding: '14px 16px' }} />
                  </div>
                  <div className="elp-form-group">
                    <div className="elp-phone-input">
                      <span>+91</span>
                      <input type="tel" inputMode="numeric" placeholder="10 digit mobile number" value={enquiry.phone} onChange={(event) => updateEnquiry("phone", event.target.value)} />
                    </div>
                  </div>
                  <div className="elp-form-group">
                    <div className="elp-custom-dropdown" onClick={() => setRangeOpen(!rangeOpen)} style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: '14px 16px' }}>
                      <span style={{ color: selectedRange === 'Select range' ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: selectedRange === 'Select range' ? '500' : '600' }}>{selectedRange}</span>
                      <FiChevronDown size={16} style={{ transform: rangeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.5)' }} />
                      {rangeOpen && (
                        <div className="elp-dropdown-menu" style={{ background: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                          {['1–14', '15–49', '50–100', '101–200', '201–500', '501 and above'].map(range => (
                            <div key={range} className="elp-dropdown-item" onClick={e => { e.stopPropagation(); setSelectedRange(range); setRangeOpen(false); }} style={{ color: '#f1f5f9', padding: '12px 16px' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                              {range}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="elp-form-group">
                    <input type="text" placeholder="City" value={enquiry.city} onChange={(event) => updateEnquiry("city", event.target.value)} style={{ padding: '14px 16px' }} />
                  </div>
                  
                  {/* Mock reCAPTCHA */}
                  <div className="elp-form-group" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', height: '74px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '28px', height: '28px', border: '2px solid #cbd5e1', borderRadius: '3px', background: '#fff', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1e293b' }}>I'm not a robot</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <FiRefreshCcw size={26} color="#3b82f6" />
                      <span style={{ fontSize: '0.5rem', fontWeight: '500', color: '#64748b', marginTop: '6px', letterSpacing: '0.02em' }}>reCAPTCHA</span>
                    </div>
                  </div>
                </>
              )}

              {formStatus.error && <div className="elp-form-error">{formStatus.error}</div>}
              {formStatus.message && <div className="elp-form-success">{formStatus.message}</div>}
              <button type="submit" className="elp-btn-callback elp-modal-submit" disabled={formStatus.loading} style={{ marginTop: '12px', padding: '14px', borderRadius: '8px' }}>
                {formStatus.loading ? "Creating account..." : "Sign Up"}
              </button>
              
              <p className="elp-callback-note" style={{ marginTop: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', fontWeight: '500' }}>
                By continuing, you agree to be contacted via email,<br />phone, or WhatsApp.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerLandingPage;
