import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import {
  FiArrowRight, FiBarChart2, FiBookOpen, FiBriefcase, FiChevronDown,
  FiChevronRight, FiClock, FiCompass, FiEdit3, FiEye, FiHeart, FiMapPin,
  FiMonitor, FiSearch, FiShoppingBag, FiTool, FiTrendingUp, FiUsers,
  FiVideo, FiZap, FiHome, FiActivity, FiBox, FiDollarSign, FiAward,
  FiMenu, FiX
} from "react-icons/fi";
import {
  FaApple, FaFacebookF, FaGooglePlay, FaInstagram, FaLinkedinIn, FaStar,
  FaGraduationCap, FaBuilding, FaRupeeSign,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";
import qrImage from "../../../assets/QR.png";
import "./NaukriLandingPage.css";
import SignUp from "../../auth/SignUp";
import Login from "../../auth/Login";
import { useAuth } from "../../AuthContext";

const topCategories = ["All", "MNCs", "Fintech", "FMCG & Retail", "Startups", "Edtech", "IT Services"];

const companies = [
  { name: "TechCorp India", logo: "TC", color: "#2563eb", rating: 4.2, reviews: "12.4K", desc: "Building India's most innovative tech ecosystem.", jobs: 248, category: "MNCs" },
  { name: "FinEdge", logo: "FE", color: "#059669", rating: 3.9, reviews: "5.2K", desc: "Reimagining financial services for 1.4B Indians.", jobs: 134, category: "Fintech" },
  { name: "CloudNine AI", logo: "CN", color: "#7c3aed", rating: 4.5, reviews: "2.1K", desc: "AI-first solutions for enterprise transformation.", jobs: 89, category: "Startups" },
  { name: "GreenRetail", logo: "GR", color: "#d97706", rating: 3.7, reviews: "8.9K", desc: "Sustainable retail for modern India.", jobs: 312, category: "FMCG & Retail" },
  { name: "NovaSec", logo: "NS", color: "#dc2626", rating: 4.1, reviews: "1.8K", desc: "Cybersecurity solutions at scale.", jobs: 56, category: "IT Services" },
  { name: "DataPulse", logo: "DP", color: "#0891b2", rating: 4.3, reviews: "3.4K", desc: "Analytics-driven decisions for every business.", jobs: 178, category: "MNCs" },
  { name: "Healify", logo: "HF", color: "#16a34a", rating: 4.0, reviews: "6.7K", desc: "Healthcare technology for a healthier nation.", jobs: 203, category: "Startups" },
  { name: "EduBase", logo: "EB", color: "#ea580c", rating: 3.8, reviews: "4.5K", desc: "Democratizing quality education across India.", jobs: 145, category: "Edtech" },
];

const interviewCompanies = [
  { name: "TCS", logo: "TCS", color: "#2563eb", count: "2.5K+ Interviews" },
  { name: "Flipkart", logo: "FK", color: "#f59e0b", count: "488 Interviews" },
  { name: "Byjus", logo: "BY", color: "#7c3aed", count: "816 Interviews" },
  { name: "Cognizant", logo: "CG", color: "#0891b2", count: "1.6K+ Interviews" },
  { name: "Accenture", logo: "AC", color: "#dc2626", count: "2K+ Interviews" },
  { name: "Amazon", logo: "AMZ", color: "#d97706", count: "1.7K+ Interviews" },
  { name: "Wipro", logo: "WP", color: "#16a34a", count: "1.2K+ Interviews" },
  { name: "Infosys", logo: "INF", color: "#0284c7", count: "1.4K+ Interviews" },
];

const interviewRoles = [
  { name: "Software Engineer", count: "7.2K+ questions" },
  { name: "Business Analyst", count: "2.8K+ questions" },
  { name: "Consultant", count: "2.4K+ questions" },
  { name: "Financial Analyst", count: "894 questions" },
  { name: "Sales & Marketing", count: "991 questions" },
  { name: "Quality Engineer", count: "1.3K+ questions" },
  { name: "Product Manager", count: "1.1K+ questions" },
  { name: "Data Scientist", count: "2.0K+ questions" },
];

const categories = [
  { icon: FiMonitor, label: "IT & Software", count: "1.2L+ jobs", description: "Frontend, backend, cloud, QA, and platform engineering roles." },
  { icon: FiBarChart2, label: "Finance & Banking", count: "38K+ jobs", description: "Analyst, risk, audit, lending, fintech, and operations openings." },
  { icon: FiHeart, label: "Healthcare", count: "52K+ jobs", description: "Clinical operations, health-tech, diagnostics, and care delivery." },
  { icon: FiBookOpen, label: "Education", count: "24K+ jobs", description: "Academic, edtech, content, and training roles across institutions." },
  { icon: FiTrendingUp, label: "Marketing", count: "31K+ jobs", description: "Performance, brand, growth, CRM, and demand generation teams." },
  { icon: FiTool, label: "Engineering", count: "67K+ jobs", description: "Core engineering, plant operations, design, and manufacturing." },
  { icon: FiShoppingBag, label: "Retail & FMCG", count: "19K+ jobs", description: "Store leadership, supply chain, merchandising, and category roles." },
  { icon: FiCompass, label: "Travel & Tourism", count: "11K+ jobs", description: "Hospitality, booking ops, guest success, and travel coordination." },
];

const events = [
  { title: "Zero to Data Analyst: Amazon Analyst Roadmap for 30L+ CTC", provider: "Coding Ninjas", badge: "Webinar", timeLeft: "Entry closes in 20h", tags: ["Interview Preparation", "Career Guidance", "Data"], date: "18 Apr, 12:00 PM", enrolled: 145, color: "#17306f", image: "https://i.pinimg.com/1200x/59/8e/c4/598ec42e15c85716c6954c26840d4f4b.jpg" },
  { title: "Get hired with 25L+ CTC Interview-ready GenAI project at Amazon", provider: "Coding Ninjas", badge: "Webinar", timeLeft: "Entry closes in 4h", tags: ["Interview Preparation", "Career Guidance"], date: "17 Apr, 8:30 PM", enrolled: 133, color: "#12445a", image: "https://i.pinimg.com/1200x/c1/0a/86/c10a86560fe721210e6d5397438d3c2b.jpg" },
  { title: "Full Stack Engineer Bootcamp with live interview practice", provider: "SkillUP Pro", badge: "Live", timeLeft: "Starts in 2d", tags: ["Technical", "Full Stack", "Placement"], date: "19 Apr, 11:00 AM", enrolled: 287, color: "#21426f", image: "https://i.pinimg.com/736x/ea/c6/cb/eac6cb24e593ae2d2c3329516e0126eb.jpg" },
  { title: "Mastering System Design: Architecting Scalable Applications", provider: "Maven Academy", badge: "Masterclass", timeLeft: "Starts in 5d", tags: ["Architecture", "System Design", "Advanced"], date: "22 Apr, 06:00 PM", enrolled: 412, color: "#0a244d", image: "https://i.pinimg.com/1200x/82/4b/4b/824b4b2c74e3b4f66f2cd0575c76dcb0.jpg" },
];

const popularSearches = [
  "Software Engineer", "Data Analyst", "Product Manager", "DevOps",
  "UI/UX Designer", "Business Analyst", "Python Developer", "Machine Learning",
  "React Developer", "Sales Executive",
];

const jobRoles = [
  { name: "Software Developer", count: "1.2L+ jobs" },
  { name: "Data Analyst", count: "42K+ jobs" },
  { name: "Product Manager", count: "18K+ jobs" },
  { name: "DevOps Engineer", count: "29K+ jobs" },
  { name: "UI/UX Designer", count: "14K+ jobs" },
  { name: "Sales Executive", count: "88K+ jobs" },
  { name: "HR Manager", count: "35K+ jobs" },
  { name: "Digital Marketer", count: "27K+ jobs" },
  { name: "Business Analyst", count: "38K+ jobs" },
  { name: "Cloud Architect", count: "11K+ jobs" },
  { name: "Machine Learning Eng.", count: "22K+ jobs" },
  { name: "Finance Manager", count: "19K+ jobs" },
];

const statItems = [
  { num: "1Cr+", label: "Active Job Listings" },
  { num: "10M+", label: "Registered Job Seekers" },
  { num: "1.5L+", label: "Companies Hiring" },
  { num: "98K+", label: "Offers This Month" },
];

const trendingTags = [
  { label: "Remote", icon: FiHome, color: "#eef2ff" },
  { label: "MNC", icon: FaBuilding, color: "#fffbeb" },
  { label: "Analytics", icon: FiSearch, color: "#f0fdfa" },
  { label: "Supply Chain", icon: FiBox, color: "#f8fafc" },
  { label: "Data Science", icon: FiBarChart2, color: "#fffbeb" },
  { label: "Software & IT", icon: FiMonitor, color: "#f8fafc" },
  { label: "Fresher", icon: FaGraduationCap, color: "#fffbeb" },
  { label: "Fortune 500", icon: FiAward, color: "#f0fdfa" },
  { label: "Banking & Finance", icon: FaRupeeSign, color: "#f8fafc" },
  { label: "Internship", icon: FiBookOpen, color: "#f8fafc" },
  { label: "Sales", icon: FiBriefcase, color: "#f0fdfa" },
];

const socialLinks = [
  { label: "Facebook", icon: FaFacebookF },
  { label: "LinkedIn", icon: FaLinkedinIn },
  { label: "X", icon: FaXTwitter },
  { label: "Instagram", icon: FaInstagram },
];

const trustedBrands = ["TechCorp India", "FinEdge", "CloudNine AI", "NovaSec", "DataPulse"];

export default function NaukriLandingPage() {
  const { user, logout, openLogin, openRegister } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTopCat, setActiveTopCat] = useState("All");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isEmployerDropdownOpen, setIsEmployerDropdownOpen] = useState(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState(null);
  const [discoverRolePage, setDiscoverRolePage] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [companyPage, setCompanyPage] = useState(0);
  const [experienceValue, setExperienceValue] = useState("");
  const [isExperienceDropdownOpen, setIsExperienceDropdownOpen] = useState(false);

  const experienceOptions = [
    "Fresher (less than 1 year)", "1 year", "2 years",
    "3 years", "4 years", "5 years"
  ];

  const pageRef = useRef(null);

  const filteredCompanies = activeTopCat === "All"
    ? companies
    : companies.filter((c) => c.category === activeTopCat);
  const visibleCompanies = filteredCompanies;
  const maxCompanyPage = Math.ceil(visibleCompanies.length / 4) - 1;

  useEffect(() => { setCompanyPage(0); }, [activeTopCat]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      const introTargets = gsap.utils.toArray("[data-hero-intro]");
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      heroTimeline
        .from(".nav", { y: -24, autoAlpha: 0, duration: 0.7 })
        .to(introTargets, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.2");

      gsap.from(".stats-strip .stat-item", {
        y: 24, autoAlpha: 0, duration: 0.7, delay: 0.35, stagger: 0.08, ease: "power3.out",
      });

      gsap.to(".hero-bg-orb-1", { x: 20, y: -10, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".hero-bg-orb-2", { x: -14, y: 16, duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" });

      const handleScroll = () => {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress((window.scrollY / totalHeight) * 100);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, pageRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="naukri-app" ref={pageRef}>
      {/* Scroll Progress */}
      <div className="scroll-progress-container">
        <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* ── NAV ── */}
      <nav className={`nav${isScrolled ? " scrolled" : ""}`}>
        <div className="nav-shell">
          <Link to="/" className="nav-logo">
            <img src={mavenLogo} alt="Maven Jobs" className="nav-logo-image" />
          </Link>

          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>

          <div className={`nav-menu-wrapper ${isMobileMenuOpen ? "mobile-open" : ""}`}>
            <div className="nav-links">
            {/* Jobs */}
            <div className="nav-link-item" onMouseEnter={() => setActiveNavDropdown("Jobs")} onMouseLeave={() => setActiveNavDropdown(null)}>
              <Link to="/jobs">Jobs</Link>
              {activeNavDropdown === "Jobs" && (
                <div className="mega-menu">
                  <div className="mega-column">
                    <h4>Popular categories</h4>
                    <Link to="/jobs">IT jobs</Link>
                    <Link to="/jobs">Sales jobs</Link>
                    <Link to="/jobs">Marketing jobs</Link>
                    <Link to="/jobs">Data Science jobs</Link>
                    <Link to="/jobs">HR jobs</Link>
                    <Link to="/jobs">Engineering jobs</Link>
                  </div>
                  <div className="mega-column">
                    <h4>Jobs in demand</h4>
                    <Link to="/jobs">Fresher jobs</Link>
                    <Link to="/jobs">MNC jobs</Link>
                    <Link to="/jobs">Remote jobs</Link>
                    <Link to="/jobs">Work from home jobs</Link>
                    <Link to="/jobs">Walk-in jobs</Link>
                    <Link to="/jobs">Part-time jobs</Link>
                  </div>
                  <div className="mega-column">
                    <h4>Jobs by location</h4>
                    <Link to="/jobs">Jobs in Delhi</Link>
                    <Link to="/jobs">Jobs in Mumbai</Link>
                    <Link to="/jobs">Jobs in Bangalore</Link>
                    <Link to="/jobs">Jobs in Hyderabad</Link>
                    <Link to="/jobs">Jobs in Chennai</Link>
                    <Link to="/jobs">Jobs in Pune</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Companies */}
            <div className="nav-link-item" onMouseEnter={() => setActiveNavDropdown("Companies")} onMouseLeave={() => setActiveNavDropdown(null)}>
              <Link to="/companies">Companies</Link>
              {activeNavDropdown === "Companies" && (
                <div className="mega-menu">
                  <div className="mega-column">
                    <h4>Explore categories</h4>
                    <Link to="/companies">Unicorn</Link>
                    <Link to="/companies">MNC</Link>
                    <Link to="/companies">Startup</Link>
                    <Link to="/companies">Product based</Link>
                    <Link to="/companies">Internet</Link>
                  </div>
                  <div className="mega-column">
                    <h4>Explore collections</h4>
                    <Link to="/companies">Top companies</Link>
                    <Link to="/companies">IT companies</Link>
                    <Link to="/companies">Fintech companies</Link>
                    <Link to="/companies">Sponsored companies</Link>
                    <Link to="/companies">Featured companies</Link>
                  </div>
                  <div className="mega-column">
                    <h4>Research companies</h4>
                    <Link to="/companies">Interview questions</Link>
                    <Link to="/companies">Company salaries</Link>
                    <Link to="/companies">Company reviews</Link>
                    <Link to="/companies">Salary Calculator</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Services */}
            <div className="nav-link-item" onMouseEnter={() => setActiveNavDropdown("Services")} onMouseLeave={() => setActiveNavDropdown(null)}>
              <Link to="/services">Services</Link>
              {activeNavDropdown === "Services" && (
                <div className="mega-menu">
                  <div className="mega-column">
                    <h4>Resume writing</h4>
                    <Link to="/services">Text resume</Link>
                    <Link to="/services">Visual resume</Link>
                    <Link to="/services">Resume critique</Link>
                    <h4 style={{ marginTop: "20px" }}>Find Jobs</h4>
                    <Link to="/jobs">Jobs4u</Link>
                    <Link to="/premium">Priority applicant</Link>
                    <Link to="/info">Contact us</Link>
                  </div>
                  <div className="mega-column">
                    <h4>Get recruiter's attention</h4>
                    <Link to="/services">Resume display</Link>
                    <h4 style={{ marginTop: "20px" }}>Monthly subscriptions</h4>
                    <Link to="/buy-online">Basic &amp; premium plans</Link>
                  </div>
                  <div className="mega-column">
                    <h4>Free resume resources</h4>
                    <Link to="/services">Resume maker</Link>
                    <Link to="/services">Resume quality score</Link>
                    <Link to="/services">Resume samples</Link>
                    <Link to="/services">Job letter samples</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Courses */}
            <div className="nav-link-item" onMouseEnter={() => setActiveNavDropdown("Courses")} onMouseLeave={() => setActiveNavDropdown(null)}>
              <a href="#courses">Courses</a>
              {activeNavDropdown === "Courses" && (
                <div className="mega-menu">
                  <div className="mega-column">
                    <h4>Tech courses</h4>
                    <a href="#">Full Stack Development</a>
                    <a href="#">Data Science &amp; ML</a>
                    <a href="#">Cloud Computing</a>
                    <a href="#">Cybersecurity</a>
                    <a href="#">DevOps &amp; Automation</a>
                  </div>
                  <div className="mega-column">
                    <h4>Business &amp; management</h4>
                    <a href="#">Project Management</a>
                    <a href="#">Product Management</a>
                    <a href="#">Business Analytics</a>
                    <a href="#">Digital Marketing</a>
                    <a href="#">HR Management</a>
                  </div>
                  <div className="mega-column">
                    <h4>Career prep</h4>
                    <Link to="/blogs">Resume building</Link>
                    <Link to="/blogs">Interview preparation</Link>
                    <Link to="/blogs">Communication skills</Link>
                    <Link to="/blogs">Leadership training</Link>
                    <Link to="/blogs">Aptitude &amp; reasoning</Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="nav-actions">
            {user ? (
              <div className="nav-user-row">
                <Link to="/profile" className="nav-avatar-link">
                  <img
                    src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"}
                    alt="Profile"
                    className="nav-avatar"
                  />
                  <span className="nav-avatar-name">{user.name || "Profile"}</span>
                </Link>
                <button type="button" className="btn-outline" onClick={logout}>Logout</button>
              </div>
            ) : (
              <>
                <button type="button" className="btn-outline" onClick={openLogin}>Login</button>
                <button type="button" className="btn-filled" onClick={openRegister}>Register</button>
              </>
            )}

            {!user && (
              <div
                className="nav-employer-container"
                onMouseEnter={() => setIsEmployerDropdownOpen(true)}
                onMouseLeave={() => setIsEmployerDropdownOpen(false)}
              >
                <div className="nav-employer">
                  For employers
                  <FiChevronDown aria-hidden="true" style={{ transform: isEmployerDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.3s" }} />
                </div>
                {isEmployerDropdownOpen && (
                  <div className="employer-dropdown">
                    <div className="employer-dropdown-inner">
                      <Link to="/employer-login" className="employer-dropdown-item employer-login-item">
                        Employer Login <FiArrowRight aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="hero" data-section>
          <div className="hero-bg-orb hero-bg-orb-1" />
          <div className="hero-bg-orb hero-bg-orb-2" />

          <div className="hero-shell">
            <div className="hero-inner">
              <div className="hero-eyebrow" data-hero-intro>
                <div className="hero-eyebrow-dot" />
                Maven Jobs · India's Hiring Platform
              </div>

              <h1 data-hero-intro>
                <span className="hero-title-line">Find Your <span>Next Career Move</span></span>
                <span className="hero-title-line">With More Clarity</span>
              </h1>

              <p className="hero-sub" data-hero-intro>
                Maven Jobs connects talent with fast-moving teams across India through
                cleaner search, stronger employer discovery, and practical career tools
                that help candidates move with confidence.
              </p>

              {/* Search Bar */}
              <div className="search-bar" id="jobs" data-hero-intro>
                <div className="search-field">
                  <FiSearch className="search-field-icon" />
                  <input type="text" placeholder="Job title, skills or company" />
                </div>

                <div className="search-field search-field-divider">
                  <FiMapPin className="search-field-icon" />
                  <input type="text" placeholder="City, state or remote" />
                </div>

                <div
                  className="search-field search-field-compact search-field-experience"
                  onClick={() => setIsExperienceDropdownOpen(!isExperienceDropdownOpen)}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  <FiBriefcase className="search-field-icon" />
                  <span style={{ color: experienceValue ? "var(--text-primary)" : "var(--text-muted)", fontSize: "0.94rem", flex: 1, userSelect: "none" }}>
                    {experienceValue || "Experience"}
                  </span>
                  <FiChevronDown style={{ color: "var(--text-muted)", fontSize: "0.9rem", transition: "transform 0.3s", transform: isExperienceDropdownOpen ? "rotate(180deg)" : "none" }} />
                  {isExperienceDropdownOpen && (
                    <div className="experience-dropdown-menu">
                      {experienceOptions.map((opt) => (
                        <div
                          key={opt}
                          className="experience-dropdown-item"
                          onClick={(e) => { e.stopPropagation(); setExperienceValue(opt); setIsExperienceDropdownOpen(false); }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="button" className="search-btn">
                  <FiSearch /> Search Jobs
                </button>
              </div>

              {/* Popular searches */}
              <div className="hero-tags" data-hero-intro>
                <span className="hero-tags-label">Trending:</span>
                {popularSearches.slice(0, 6).map((s) => (
                  <button key={s} type="button" className="pop-chip">{s}</button>
                ))}
              </div>

              {/* Trending tag badges */}
              <div className="hero-tags" data-hero-intro style={{ marginTop: "16px" }}>
                {trendingTags.slice(0, 6).map((tag) => {
                  const Icon = tag.icon;
                  return (
                    <button key={tag.label} type="button" className="hero-tag-badge">
                      <span className="hero-tag-icon" style={{ background: tag.color }}>
                        <Icon />
                      </span>
                      <span className="hero-tag-text">{tag.label}</span>
                      <FiChevronRight className="hero-tag-arrow" />
                    </button>
                  );
                })}
              </div>

              {/* Trusted by */}
              <div className="trusted-strip" data-hero-intro>
                <span className="trusted-label">Trusted by teams at</span>
                <div className="trusted-row">
                  {trustedBrands.map((b) => (
                    <span key={b} className="trusted-item">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <div className="stats-strip">
          <div className="section-shell">
            <div className="stats-grid">
              {statItems.map((s) => (
                <div key={s.label} className="stat-item">
                  <div className="stat-num">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TOP COMPANIES ── */}
        <section className="section companies-section">
          <div className="section-shell">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">Discover Employers</p>
                <h2 className="section-title">Top Companies Hiring Now</h2>
              </div>
              <Link to="/companies" className="view-all-btn-proper">
                <span>View More</span> <FiArrowRight />
              </Link>
            </div>

            <div className="top-cats-row">
              {topCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`top-cat${activeTopCat === cat ? " active" : ""}`}
                  onClick={() => setActiveTopCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="companies-grid">
              {visibleCompanies.slice(companyPage * 4, companyPage * 4 + 4).map((company) => (
                <div key={company.name} className="company-card">
                  <div className="company-card-header">
                    <div className="company-logo" style={{ background: company.color }}>
                      {company.logo}
                    </div>
                    <div className="company-card-meta">
                      <h3 className="company-name">{company.name}</h3>
                      <div className="company-rating">
                        <FaStar className="star-icon" />
                        <span className="rating-val">{company.rating}</span>
                        <span className="rating-reviews">({company.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <p className="company-desc">{company.desc}</p>
                  <div className="company-card-footer">
                    <span className="company-jobs-badge">
                      <FiBriefcase /> {company.jobs} open roles
                    </span>
                    <button type="button" className="company-btn">
                      View Jobs <FiArrowRight />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {maxCompanyPage > 0 && (
              <div className="pagination-row">
                <button
                  type="button"
                  className="page-btn"
                  disabled={companyPage === 0}
                  onClick={() => setCompanyPage((p) => Math.max(0, p - 1))}
                >
                  ← Prev
                </button>
                <span className="page-indicator">{companyPage + 1} / {maxCompanyPage + 1}</span>
                <button
                  type="button"
                  className="page-btn"
                  disabled={companyPage === maxCompanyPage}
                  onClick={() => setCompanyPage((p) => Math.min(maxCompanyPage, p + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── JOB CATEGORIES ── */}
        <section className="section categories-section">
          <div className="section-shell">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">Browse by Domain</p>
                <h2 className="section-title">Explore Job Categories</h2>
              </div>
              <Link to="/jobs" className="view-all-btn-proper">
                <span>Browse all</span> <FiArrowRight />
              </Link>
            </div>

            <div className="cat-grid">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.label} className="cat-card">
                    <div className="cat-icon-wrap">
                      <Icon />
                    </div>
                    <div className="cat-body">
                      <h3 className="cat-label">{cat.label}</h3>
                      <p className="cat-desc">{cat.description}</p>
                    </div>
                    <span className="cat-count">{cat.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── POPULAR JOB ROLES ── */}
        <section className="section roles-section">
          <div className="section-shell">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">In Demand</p>
                <h2 className="section-title">Popular Job Roles</h2>
              </div>
            </div>

            <div className="roles-grid">
              {jobRoles.map((role) => (
                <Link to="/jobs" key={role.name} className="role-chip">
                  <span className="role-name">{role.name}</span>
                  <span className="role-count">{role.count}</span>
                  <FiArrowRight className="role-arrow" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── EVENTS / COURSES ── */}
        <section className="section events-section" id="courses">
          <div className="section-shell">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">Live &amp; Upcoming</p>
                <h2 className="section-title">Events &amp; Masterclasses</h2>
              </div>
              <button type="button" className="view-all-btn-proper">
                <span>See all events</span> <FiArrowRight />
              </button>
            </div>

            <div className="events-grid">
              {events.map((ev) => (
                <div key={ev.title} className="event-card">
                  <div className="event-img-wrap">
                    <img src={ev.image} alt={ev.title} className="event-img" />
                    <span className={`event-badge badge-${ev.badge.toLowerCase()}`}>{ev.badge}</span>
                    <span className="event-time-left">
                      <FiClock size={11} /> {ev.timeLeft}
                    </span>
                  </div>
                  <div className="event-body">
                    <p className="event-provider">{ev.provider}</p>
                    <h3 className="event-title">{ev.title}</h3>
                    <div className="event-tags">
                      {ev.tags.map((t) => <span key={t} className="event-tag">{t}</span>)}
                    </div>
                    <div className="event-footer">
                      <span className="event-date"><FiClock size={12} /> {ev.date}</span>
                      <span className="event-enrolled"><FiUsers size={12} /> {ev.enrolled} enrolled</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTERVIEW PREP ── */}
        <section className="section interview-section">
          <div className="section-shell">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">Ace Your Interviews</p>
                <h2 className="section-title">Interview Preparation</h2>
              </div>
            </div>

            <div className="interview-grid">
              <div className="interview-col">
                <h3 className="interview-col-title">By Company</h3>
                <div className="interview-company-list">
                  {interviewCompanies.map((ic) => (
                    <div key={ic.name} className="interview-company-row">
                      <div className="interview-logo" style={{ background: ic.color }}>{ic.logo}</div>
                      <div className="interview-info">
                        <span className="interview-name">{ic.name}</span>
                        <span className="interview-count">{ic.count}</span>
                      </div>
                      <FiChevronRight className="interview-arrow" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="interview-col">
                <h3 className="interview-col-title">By Role</h3>
                <div className="interview-role-list">
                  {interviewRoles.map((ir) => (
                    <div key={ir.name} className="interview-role-row">
                      <div className="interview-role-dot" />
                      <div className="interview-info">
                        <span className="interview-name">{ir.name}</span>
                        <span className="interview-count">{ir.count}</span>
                      </div>
                      <FiChevronRight className="interview-arrow" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <img src={mavenLogo} alt="Maven Jobs" className="footer-logo" />
              <p className="footer-tagline">India's most trusted hiring platform for the next generation of careers.</p>
              <div className="footer-socials">
                {socialLinks.map(({ label, icon: Icon }) => (
                  <a key={label} href="#" aria-label={label} className="footer-social-icon">
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            <div className="footer-links-group">
              <h4>For Job Seekers</h4>
              <Link to="/jobs">Browse jobs</Link>
              <Link to="/companies">Companies</Link>
              <Link to="/blogs">Career advice</Link>
              <Link to="/services">Resume builder</Link>
              <Link to="/jobs">Salary insights</Link>
            </div>

            <div className="footer-links-group">
              <h4>For Employers</h4>
              <Link to="/employer-login">Employer login</Link>
              <Link to="/post-job">Post a job</Link>
            </div>

            <div className="footer-links-group">
              <h4>Company</h4>
              <Link to="/info">About us</Link>
              <Link to="/blogs">Blog</Link>
              <Link to="/info">Press</Link>
              <Link to="/info">Careers at Maven</Link>
              <Link to="/info">Contact</Link>
            </div>

            <div className="footer-app-col">
              <h4>Get the App</h4>
              <a href="#" className="app-store-btn">
                <FaApple /> App Store
              </a>
              <a href="#" className="app-store-btn">
                <FaGooglePlay /> Google Play
              </a>
              <div className="footer-qr-wrap">
                <img src={qrImage} alt="QR code" className="footer-qr" />
                <span>Scan to download</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Maven Jobs. All rights reserved.</span>
            <div className="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Settings</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}