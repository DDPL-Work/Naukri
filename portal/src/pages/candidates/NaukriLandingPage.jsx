import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import {
  FiArrowRight, FiBarChart2, FiBookOpen, FiBriefcase, FiChevronDown,
  FiChevronRight, FiClock, FiCompass, FiHeart, FiMapPin,
  FiMonitor, FiSearch, FiShoppingBag, FiTool, FiTrendingUp, FiUsers,
  FiZap, FiHome, FiBox, FiAward,
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
import authService from "../../services/authService";

const events = [
  { title: "Zero to Data Analyst: Amazon Analyst Roadmap for 30L+ CTC", provider: "Coding Ninjas", badge: "Webinar", timeLeft: "Entry closes in 20h", tags: ["Interview Preparation", "Career Guidance", "Data"], date: "18 Apr, 12:00 PM", enrolled: 145, image: "https://i.pinimg.com/1200x/59/8e/c4/598ec42e15c85716c6954c26840d4f4b.jpg" },
  { title: "Get hired with 25L+ CTC Interview-ready GenAI project at Amazon", provider: "Coding Ninjas", badge: "Webinar", timeLeft: "Entry closes in 4h", tags: ["Interview Preparation", "Career Guidance"], date: "17 Apr, 8:30 PM", enrolled: 133, image: "https://i.pinimg.com/1200x/c1/0a/86/c10a86560fe721210e6d5397438d3c2b.jpg" },
  { title: "Full Stack Engineer Bootcamp with live interview practice", provider: "SkillUP Pro", badge: "Live", timeLeft: "Starts in 2d", tags: ["Technical", "Full Stack", "Placement"], date: "19 Apr, 11:00 AM", enrolled: 287, image: "https://i.pinimg.com/736x/ea/c6/cb/eac6cb24e593ae2d2c3329516e0126eb.jpg" },
  { title: "Mastering System Design: Architecting Scalable Applications", provider: "Maven Academy", badge: "Masterclass", timeLeft: "Starts in 5d", tags: ["Architecture", "System Design", "Advanced"], date: "22 Apr, 06:00 PM", enrolled: 412, image: "https://i.pinimg.com/1200x/82/4b/4b/824b4b2c74e3b4f66f2cd0575c76dcb0.jpg" },
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

const trendingTags = [
  { label: "Remote", icon: FiHome, color: "#eef2ff" },
  { label: "MNC", icon: FaBuilding, color: "#fffbeb" },
  { label: "Analytics", icon: FiSearch, color: "#f0fdfa" },
  { label: "Supply Chain", icon: FiBox, color: "#f8fafc" },
  { label: "Data Science", icon: FiBarChart2, color: "#fffbeb" },
  { label: "Software & IT", icon: FiMonitor, color: "#f8fafc" },
  { label: "Fresher", icon: FaGraduationCap, color: "#fffbeb" },
  { label: "Fortune 500", icon: FiAward, color: "#f0fdfa" },
];

const socialLinks = [
  { label: "Facebook", icon: FaFacebookF },
  { label: "LinkedIn", icon: FaLinkedinIn },
  { label: "X", icon: FaXTwitter },
  { label: "Instagram", icon: FaInstagram },
];

const CATS_ICONS = [FiMonitor, FiBarChart2, FiHeart, FiBookOpen, FiTrendingUp, FiTool, FiShoppingBag, FiCompass];

export default function NaukriLandingPage() {
  const navigate = useNavigate();
  const { user, logout, openLogin, openRegister } = useAuth();
  const [landingData, setLandingData] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTopCat, setActiveTopCat] = useState("All");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isEmployerDropdownOpen, setIsEmployerDropdownOpen] = useState(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [companyPage, setCompanyPage] = useState(0);
  const [experienceValue, setExperienceValue] = useState("");
  const [isExperienceDropdownOpen, setIsExperienceDropdownOpen] = useState(false);

  const experienceOptions = [
    "Fresher (less than 1 year)", "1 year", "2 years",
    "3 years", "4 years", "5 years"
  ];

  const pageRef = useRef(null);

  const goToJobs = ({ keyword = searchKeyword, location = searchLocation, experience = experienceValue } = {}) => {
    const params = new URLSearchParams();
    if (String(keyword || "").trim()) params.set("q", String(keyword).trim());
    if (String(location || "").trim()) params.set("location", String(location).trim());
    if (String(experience || "").trim()) params.set("experience", String(experience).trim());
    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  useEffect(() => {
    let isMounted = true;
    authService.getLandingHome()
      .then((response) => { if (isMounted && response?.success) setLandingData(response.data); })
      .catch(() => { if (isMounted) setLandingData(null); });
    return () => { isMounted = false; };
  }, []);

  // --- Dynamic data with fallbacks ---
  const dynamicTopCategories = landingData?.topCategories?.length
    ? ["All", ...new Set(landingData.topCategories.filter(c => String(c || "").trim().toLowerCase() !== "all"))]
    : ["All"];
  const dynamicCompanies = landingData?.companies?.length ? landingData.companies : [];
  const dynamicCategories = landingData?.categories?.length
    ? landingData.categories.map((c, i) => ({ ...c, icon: CATS_ICONS[i % 8] }))
    : [];
  const dynamicPopularSearches = landingData?.popularSearches?.length ? landingData.popularSearches : [];
  const dynamicJobRoles = landingData?.jobRoles?.length ? landingData.jobRoles : [];
  const dynamicStats = landingData?.stats?.length ? landingData.stats
    : [{ num: "0", label: "Active Job Listings" }, { num: "0", label: "Registered Job Seekers" }, { num: "0", label: "Companies Hiring" }, { num: "0", label: "Offers This Month" }];
  const dynamicTrustedBrands = landingData?.trustedBrands?.length ? landingData.trustedBrands : [];

  const filteredCompanies = activeTopCat === "All"
    ? dynamicCompanies
    : dynamicCompanies.filter(c => c.category === activeTopCat);

  const COMPANIES_PER_PAGE = 4;
  const companyPageCount = Math.max(Math.ceil(filteredCompanies.length / COMPANIES_PER_PAGE), 1);
  const maxCompanyPage = companyPageCount - 1;
  const pagedCompanies = filteredCompanies.slice(companyPage * COMPANIES_PER_PAGE, companyPage * COMPANIES_PER_PAGE + COMPANIES_PER_PAGE);

  useEffect(() => { setCompanyPage(0); }, [activeTopCat]);
  useEffect(() => {
    if (!dynamicTopCategories.includes(activeTopCat)) setActiveTopCat("All");
  }, [dynamicTopCategories]);

  // GSAP
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(".lp-nav", { y: -24, autoAlpha: 0, duration: 0.7 })
        .to("[data-hero-intro]", { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.2");
      gsap.from(".lp-stat", { y: 24, autoAlpha: 0, duration: 0.7, delay: 0.4, stagger: 0.08, ease: "power3.out" });
      gsap.to(".orb1", { x: 20, y: -10, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".orb2", { x: -14, y: 16, duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" });
      const handleScroll = () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress((window.scrollY / total) * 100);
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
    <div className="lp-root" ref={pageRef}>
      {/* Scroll progress */}
      <div className="lp-progress"><div className="lp-progress-bar" style={{ width: `${scrollProgress}%` }} /></div>

      {/* ── NAV ── */}
      <nav className={`lp-nav${isScrolled ? " lp-nav--scrolled" : ""}`}>
        <div className="lp-nav__inner">
          <Link to="/" className="lp-nav__logo">
            <img src={mavenLogo} alt="Maven Jobs" />
          </Link>

          <button className="lp-nav__hamburger" onClick={() => setIsMobileMenuOpen(o => !o)} aria-label="Menu">
            {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>

          <div className={`lp-nav__body${isMobileMenuOpen ? " lp-nav__body--open" : ""}`}>
            <div className="lp-nav__links">
              {[
                { label: "Jobs", to: "/jobs", cols: [
                  { title: "Popular categories", links: [["IT jobs","/jobs"],["Sales jobs","/jobs"],["Marketing jobs","/jobs"],["Data Science jobs","/jobs"],["HR jobs","/jobs"],["Engineering jobs","/jobs"]] },
                  { title: "Jobs in demand", links: [["Fresher jobs","/jobs"],["MNC jobs","/jobs"],["Remote jobs","/jobs"],["Work from home","/jobs"],["Walk-in jobs","/jobs"],["Part-time jobs","/jobs"]] },
                  { title: "Jobs by location", links: [["Delhi","/jobs"],["Mumbai","/jobs"],["Bangalore","/jobs"],["Hyderabad","/jobs"],["Chennai","/jobs"],["Pune","/jobs"]] },
                ]},
                { label: "Companies", to: "/companies", cols: [
                  { title: "Explore categories", links: [["Unicorn","/companies"],["MNC","/companies"],["Startup","/companies"],["Product based","/companies"],["Internet","/companies"]] },
                  { title: "Explore collections", links: [["Top companies","/companies"],["IT companies","/companies"],["Fintech companies","/companies"],["Sponsored","/companies"],["Featured","/companies"]] },
                  { title: "Research companies", links: [["Interview questions","/companies"],["Company salaries","/companies"],["Company reviews","/companies"],["Salary Calculator","/companies"]] },
                ]},
                { label: "Services", to: "/services", cols: [
                  { title: "Resume writing", links: [["Text resume","/services"],["Visual resume","/services"],["Resume critique","/services"]] },
                  { title: "Get recruiter's attention", links: [["Resume display","/services"],["Priority applicant","/premium"]] },
                  { title: "Free resume resources", links: [["Resume maker","/services"],["Resume quality score","/services"],["Resume samples","/services"],["Job letter samples","/services"]] },
                ]},
                { label: "Courses", to: "#courses", cols: [
                  { title: "Tech courses", links: [["Full Stack Dev","#"],["Data Science & ML","#"],["Cloud Computing","#"],["Cybersecurity","#"],["DevOps","#"]] },
                  { title: "Business & management", links: [["Project Management","#"],["Product Management","#"],["Business Analytics","#"],["Digital Marketing","#"],["HR Management","#"]] },
                  { title: "Career prep", links: [["Resume building","/blogs"],["Interview prep","/blogs"],["Communication skills","/blogs"],["Leadership","/blogs"],["Aptitude","/blogs"]] },
                ]},
              ].map(({ label, to, cols }) => (
                <div key={label} className="lp-nav__item"
                  onMouseEnter={() => setActiveNavDropdown(label)}
                  onMouseLeave={() => setActiveNavDropdown(null)}>
                  <Link to={to}>{label}</Link>
                  {activeNavDropdown === label && (
                    <div className="lp-mega">
                      {cols.map(col => (
                        <div key={col.title} className="lp-mega__col">
                          <h4>{col.title}</h4>
                          {col.links.map(([text, href]) => (
                            <Link key={text} to={href}>{text}</Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="lp-nav__actions">
              {user ? (
                <div className="lp-nav__user">
                  <Link to="/profile" className="lp-nav__avatar-link">
                    <img src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"} alt="Profile" />
                    <span>{user.name || "Profile"}</span>
                  </Link>
                  <button type="button" className="lp-btn lp-btn--outline" onClick={logout}>Logout</button>
                </div>
              ) : (
                <>
                  <button type="button" className="lp-btn lp-btn--outline" onClick={openLogin}>Login</button>
                  <button type="button" className="lp-btn lp-btn--fill" onClick={openRegister}>Register</button>
                </>
              )}
              {!user && (
                <div className="lp-employer-wrap"
                  onMouseEnter={() => setIsEmployerDropdownOpen(true)}
                  onMouseLeave={() => setIsEmployerDropdownOpen(false)}>
                  <div className="lp-employer-trigger">
                    For employers
                    <FiChevronDown style={{ transform: isEmployerDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
                  </div>
                  {isEmployerDropdownOpen && (
                    <div className="lp-employer-drop">
                      <Link to="/employer-login" className="lp-employer-drop__item">
                        Employer Login <FiArrowRight />
                      </Link>
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
        <section className="lp-hero">
          <div className="orb1" />
          <div className="orb2" />
          <div className="lp-hero__inner">
            <div className="lp-hero__eyebrow" data-hero-intro>
              <span className="lp-hero__dot" />
              Maven Jobs · India's Hiring Platform
            </div>
            <h1 data-hero-intro>
              Find Your <span>Next Career Move</span><br />With More Clarity
            </h1>
            <p className="lp-hero__sub" data-hero-intro>
              Maven Jobs connects talent with fast-moving teams across India through cleaner search,
              stronger employer discovery, and practical career tools.
            </p>

            {/* Search */}
            <form className="lp-search" data-hero-intro onSubmit={e => { e.preventDefault(); goToJobs(); }}>
              <div className="lp-search__field">
                <FiSearch />
                <input type="text" placeholder="Job title, skills or company" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} />
              </div>
              <div className="lp-search__divider" />
              <div className="lp-search__field">
                <FiMapPin />
                <input type="text" placeholder="City, state or remote" value={searchLocation} onChange={e => setSearchLocation(e.target.value)} />
              </div>
              <div className="lp-search__divider" />
              <div className="lp-search__field lp-search__field--exp" onClick={() => setIsExperienceDropdownOpen(o => !o)} style={{ cursor: "pointer", position: "relative" }}>
                <FiBriefcase />
                <span style={{ flex: 1, color: experienceValue ? "var(--lp-text)" : "var(--lp-muted)", fontSize: "0.93rem", userSelect: "none" }}>
                  {experienceValue || "Experience"}
                </span>
                <FiChevronDown style={{ color: "var(--lp-muted)", fontSize: "0.85rem", transition: "transform 0.25s", transform: isExperienceDropdownOpen ? "rotate(180deg)" : "none" }} />
                {isExperienceDropdownOpen && (
                  <div className="lp-exp-drop">
                    {experienceOptions.map(opt => (
                      <div key={opt} className="lp-exp-drop__item" onClick={e => { e.stopPropagation(); setExperienceValue(opt); setIsExperienceDropdownOpen(false); }}>{opt}</div>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="lp-search__btn"><FiSearch /> Search Jobs</button>
            </form>

            {/* Popular */}
            {dynamicPopularSearches.length > 0 && (
              <div className="lp-hero__chips" data-hero-intro>
                <span className="lp-hero__chips-label">Trending:</span>
                {dynamicPopularSearches.slice(0, 6).map(s => (
                  <button key={s} type="button" className="lp-chip" onClick={() => goToJobs({ keyword: s })}>{s}</button>
                ))}
              </div>
            )}

            {/* Tag badges */}
            <div className="lp-hero__tags" data-hero-intro>
              {trendingTags.slice(0, 7).map(tag => {
                const Icon = tag.icon;
                return (
                  <button key={tag.label} type="button" className="lp-tag-badge">
                    <span className="lp-tag-badge__icon" style={{ background: tag.color }}><Icon /></span>
                    <span className="lp-tag-badge__label">{tag.label}</span>
                    <FiChevronRight className="lp-tag-badge__arrow" />
                  </button>
                );
              })}
            </div>

            {/* Trusted */}
            {dynamicTrustedBrands.length > 0 && (
              <div className="lp-trusted" data-hero-intro>
                <span className="lp-trusted__label">Trusted by teams at</span>
                <div className="lp-trusted__row">
                  {dynamicTrustedBrands.map(b => <span key={b} className="lp-trusted__item">{b}</span>)}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── STATS ── */}
        <div className="lp-stats">
          <div className="lp-wrap">
            <div className="lp-stats__grid">
              {dynamicStats.map(s => (
                <div key={s.label} className="lp-stat">
                  <div className="lp-stat__num">{s.num}</div>
                  <div className="lp-stat__label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TOP COMPANIES ── */}
        <section className="lp-section lp-companies">
          <div className="lp-wrap">
            <div className="lp-section__hd">
              <div>
                <p className="lp-eyebrow">Discover Employers</p>
                <h2 className="lp-title">Top Companies Hiring Now</h2>
              </div>
              <Link to="/companies" className="lp-view-all">View More <FiArrowRight /></Link>
            </div>

            {/* Category filters */}
            <div className="lp-cats">
              {dynamicTopCategories.map(cat => (
                <button key={cat} type="button" className={`lp-cats__btn${activeTopCat === cat ? " lp-cats__btn--active" : ""}`} onClick={() => setActiveTopCat(cat)}>{cat}</button>
              ))}
            </div>

            {/* Carousel controls row */}
            <div className="lp-companies__bar">
              <span>{filteredCompanies.length} verified companies</span>
              {maxCompanyPage > 0 && (
                <div className="lp-companies__nav">
                  <button type="button" className="lp-companies__arrow" disabled={companyPage === 0} onClick={() => setCompanyPage(p => Math.max(0, p - 1))} aria-label="Prev">←</button>
                  <span>{companyPage + 1} / {companyPageCount}</span>
                  <button type="button" className="lp-companies__arrow" disabled={companyPage === maxCompanyPage} onClick={() => setCompanyPage(p => Math.min(maxCompanyPage, p + 1))} aria-label="Next">→</button>
                </div>
              )}
            </div>

            {/* Cards — single row, 4 equal columns */}
{/* Cards — strict single row, always exactly COMPANIES_PER_PAGE slots */}
<div className="lp-companies__grid">
  {Array.from({ length: COMPANIES_PER_PAGE }).map((_, i) => {
    const company = pagedCompanies[i];
    if (!company) return <div key={`ghost-${i}`} className="lp-co-card lp-co-card--ghost" aria-hidden="true" />;
    return (
      <div key={company.name + i} className="lp-co-card">
        <div className="lp-co-card__head">
          <div className="lp-co-card__logo" style={{ background: company.color }}>
            {company.logoUrl ? <img src={company.logoUrl} alt="" /> : company.logo}
          </div>
          <div className="lp-co-card__meta">
            <h3 title={company.name}>{company.name}</h3>
            <div className="lp-co-card__rating">
              <FaStar className="lp-star" />
              <span>{Number(company.rating || 4.1).toFixed(1)}</span>
              <span className="lp-co-card__reviews">({company.reviews || "0"} reviews)</span>
            </div>
          </div>
        </div>
        <p className="lp-co-card__desc">{company.desc || "Verified employer hiring on MavenJobs."}</p>
        <div className="lp-co-card__foot">
          <span className="lp-co-card__badge"><FiBriefcase /> {Number(company.jobs || 0)} open roles</span>
          <div className="lp-co-card__actions">
            {company.id && (
              <Link to={`/company/${company.id}`} className="lp-co-card__profile">Profile</Link>
            )}
            <Link to={`/jobs?q=${encodeURIComponent(company.name || "")}`} className="lp-co-card__jobs">
              View Jobs <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    );
  })}
</div>
          </div>
        </section>

        {/* ── JOB CATEGORIES ── */}
        <section className="lp-section lp-bg-alt">
          <div className="lp-wrap">
            <div className="lp-section__hd">
              <div>
                <p className="lp-eyebrow">Browse by Domain</p>
                <h2 className="lp-title">Explore Job Categories</h2>
              </div>
              <Link to="/jobs" className="lp-view-all">Browse all <FiArrowRight /></Link>
            </div>
            <div className="lp-cat-grid">
              {dynamicCategories.map(cat => {
                const Icon = cat.icon;
                return (
                  <div key={cat.label} className="lp-cat-card">
                    <div className="lp-cat-card__icon"><Icon /></div>
                    <div className="lp-cat-card__body">
                      <h3>{cat.label}</h3>
                      <p>{cat.description}</p>
                    </div>
                    <span className="lp-cat-card__count">{cat.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── JOB ROLES ── */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-section__hd">
              <div>
                <p className="lp-eyebrow">In Demand</p>
                <h2 className="lp-title">Popular Job Roles</h2>
              </div>
            </div>
            <div className="lp-roles-grid">
              {dynamicJobRoles.map(role => (
                <Link to="/jobs" key={role.name} className="lp-role">
                  <span className="lp-role__name">{role.name}</span>
                  <span className="lp-role__count">{role.count}</span>
                  <FiArrowRight className="lp-role__arrow" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── EVENTS ── */}
        <section className="lp-section lp-bg-alt" id="courses">
          <div className="lp-wrap">
            <div className="lp-section__hd">
              <div>
                <p className="lp-eyebrow">Live & Upcoming</p>
                <h2 className="lp-title">Events & Masterclasses</h2>
              </div>
              <button type="button" className="lp-view-all">See all events <FiArrowRight /></button>
            </div>
            <div className="lp-events-grid">
              {events.map(ev => (
                <div key={ev.title} className="lp-ev-card">
                  <div className="lp-ev-card__img-wrap">
                    <img src={ev.image} alt={ev.title} className="lp-ev-card__img" />
                    <span className={`lp-ev-badge lp-ev-badge--${ev.badge.toLowerCase()}`}>{ev.badge}</span>
                    <span className="lp-ev-card__time"><FiClock size={10} /> {ev.timeLeft}</span>
                  </div>
                  <div className="lp-ev-card__body">
                    <p className="lp-ev-card__provider">{ev.provider}</p>
                    <h3 className="lp-ev-card__title">{ev.title}</h3>
                    <div className="lp-ev-card__tags">
                      {ev.tags.map(t => <span key={t}>{t}</span>)}
                    </div>
                    <div className="lp-ev-card__foot">
                      <span><FiClock size={11} /> {ev.date}</span>
                      <span><FiUsers size={11} /> {ev.enrolled} enrolled</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTERVIEW PREP ── */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-section__hd">
              <div>
                <p className="lp-eyebrow">Ace Your Interviews</p>
                <h2 className="lp-title">Interview Preparation</h2>
              </div>
            </div>
            <div className="lp-interview-grid">
              <div className="lp-interview-col">
                <div className="lp-interview-col__hd">By Company</div>
                {interviewCompanies.map(ic => (
                  <div key={ic.name} className="lp-interview-row">
                    <div className="lp-interview-logo" style={{ background: ic.color }}>{ic.logo}</div>
                    <div className="lp-interview-info">
                      <span className="lp-interview-name">{ic.name}</span>
                      <span className="lp-interview-count">{ic.count}</span>
                    </div>
                    <FiChevronRight className="lp-interview-arrow" />
                  </div>
                ))}
              </div>
              <div className="lp-interview-col">
                <div className="lp-interview-col__hd">By Role</div>
                {interviewRoles.map(ir => (
                  <div key={ir.name} className="lp-interview-row">
                    <div className="lp-interview-dot" />
                    <div className="lp-interview-info">
                      <span className="lp-interview-name">{ir.name}</span>
                      <span className="lp-interview-count">{ir.count}</span>
                    </div>
                    <FiChevronRight className="lp-interview-arrow" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <div className="lp-footer__inner">
            <div className="lp-footer__brand">
              <img src={mavenLogo} alt="Maven Jobs" className="lp-footer__logo" />
              <p>India's most trusted hiring platform for the next generation of careers.</p>
              <div className="lp-footer__socials">
                {socialLinks.map(({ label, icon: Icon }) => (
                  <a key={label} href="#" aria-label={label}><Icon /></a>
                ))}
              </div>
            </div>
            <div className="lp-footer__col">
              <h4>For Job Seekers</h4>
              <Link to="/jobs">Browse jobs</Link>
              <Link to="/companies">Companies</Link>
              <Link to="/blogs">Career advice</Link>
              <Link to="/services">Resume builder</Link>
              <Link to="/jobs">Salary insights</Link>
            </div>
            <div className="lp-footer__col">
              <h4>For Employers</h4>
              <Link to="/employer-login">Employer login</Link>
              <Link to="/post-job">Post a job</Link>
            </div>
            <div className="lp-footer__col">
              <h4>Company</h4>
              <Link to="/info">About us</Link>
              <Link to="/blogs">Blog</Link>
              <Link to="/info">Press</Link>
              <Link to="/info">Careers at Maven</Link>
              <Link to="/info">Contact</Link>
            </div>
            <div className="lp-footer__app">
              <h4>Get the App</h4>
              <a href="#" className="lp-app-btn"><FaApple /> App Store</a>
              <a href="#" className="lp-app-btn"><FaGooglePlay /> Google Play</a>
              <div className="lp-footer__qr">
                <img src={qrImage} alt="QR" />
                <span>Scan to download</span>
              </div>
            </div>
          </div>
          <div className="lp-footer__bottom">
            <span>© {new Date().getFullYear()} Maven Jobs. All rights reserved.</span>
            <div>
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