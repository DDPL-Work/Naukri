import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  FiSearch, FiMapPin, FiBriefcase, FiChevronDown, FiFilter,
  FiCheck, FiClock, FiBookmark, FiArrowRight, FiTrendingUp, FiAward,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import { FaRupeeSign, FaStar, FaFacebookF, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useAuth } from "../../AuthContext";
import { TOP_CATEGORIES } from "../../data/jobs";
import authService from "../../services/authService";
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import "./JobListingPage.css";

// Data moved to data/jobs.js
const FILTER_CATEGORIES = [
  {
    id: "dept",
    label: "Department",
    options: ["Engineering", "Product", "Design", "Marketing", "Sales", "HR", "Finance", "Legal", "Operations", "Customer Success"]
  },
  {
    id: "mode",
    label: "Work Mode",
    options: ["Work from office", "Remote", "Hybrid"]
  },
  {
    id: "loc",
    label: "Location",
    options: ["Bengaluru", "Mumbai", "Pune", "Delhi / NCR", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Gurugram", "Noida"]
  },
  {
    id: "salaryRange",
    label: "Salary",
    options: ["0–3 Lakhs", "3–6 Lakhs", "6–10 Lakhs", "10–15 Lakhs", "15+ Lakhs", "25+ Lakhs", "50+ Lakhs"]
  },
  {
    id: "type",
    label: "Company Type",
    options: ["Corporate", "Foreign MNC", "Indian MNC", "Startup", "Govt / PSU"]
  },
];

export default function JobListingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollRef = React.useRef(null);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState(() => searchParams.get("q") || searchParams.get("search") || "");
  const [locSearch, setLocSearch] = useState(() => searchParams.get("location") || "");
  const [scrolled, setScrolled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("relevance");
  const [showSort, setShowSort] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // stores catId if modal is open
  const [draftFilters, setDraftFilters] = useState({}); // local state for modal
  const [expRange, setExpRange] = useState(() => {
    const value = searchParams.get("experience") || "";
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : 0;
  });
  const [backendJobs, setBackendJobs] = useState([]);
  const [backendCompanies, setBackendCompanies] = useState([]);
  const [loadingBackend, setLoadingBackend] = useState(true);

  const JOBS_PER_PAGE = 15;
  const { user, logout, openLogin, openRegister } = useAuth();

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -250, behavior: "smooth" });
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 250, behavior: "smooth" });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setLoadingBackend(true);
    const requestTimer = window.setTimeout(() => {
    Promise.all([
      authService.searchPublicJobs({
        search,
        location: locSearch,
        experience: expRange ? `${expRange} years` : "",
        limit: 100,
      }).catch(() => null),
      authService.getCompanies({ limit: 4 }).catch(() => null)
    ]).then(([resJobs, resComps]) => {
      if (resJobs?.success && resJobs?.data?.jobs) {
        const formatted = resJobs.data.jobs.map((j, i) => {
          const title = j.title || 'Senior Engineer';
          const companyObj = j.company || j.companyId || {};
          const company = companyObj.name || j.companyName || j.company || 'Enterprise Partner';
          const minSal = j.salaryMin || 0;
          const maxSal = j.salaryMax || 0;
          const salStr = minSal && maxSal ? `${(minSal/100000).toFixed(0)}–${(maxSal/100000).toFixed(0)} Lakhs PA` : j.salary || '18–28 Lakhs PA';
          const salCat = minSal >= 5000000 ? "50+ Lakhs" : minSal >= 2500000 ? "25+ Lakhs" : minSal >= 1500000 ? "15+ Lakhs" : minSal >= 1000000 ? "10–15 Lakhs" : minSal >= 600000 ? "6–10 Lakhs" : minSal >= 300000 ? "3–6 Lakhs" : "0–3 Lakhs";

          const skills = Array.isArray(j.skills) ? j.skills : [];
          const normalizedSkills = skills.map((skill) => String(skill || "").toLowerCase());
          const hasSkillAny = (aliases) => aliases.some((alias) => normalizedSkills.some((skill) => skill.includes(alias)));
          const stackTags = [];

          if (hasSkillAny(["mongodb", "mongo"]) && hasSkillAny(["express", "express.js"]) && hasSkillAny(["react", "react.js"]) && hasSkillAny(["node", "node.js"])) {
            stackTags.push("MERN Stack");
          }

          if (hasSkillAny(["mongodb", "mongo"]) && hasSkillAny(["express", "express.js"]) && hasSkillAny(["angular"]) && hasSkillAny(["node", "node.js"])) {
            stackTags.push("MEAN Stack");
          }

          return {
            id: j._id || j.id || i,
            title,
            company,
            rating: j.rating || 4.1,
            reviews: j.reviews || 105,
            exp: j.experience || j.exp || '1–4 Yrs',
            salary: salStr,
            location: j.location || 'Bengaluru',
            posted: j.lastUpdated || j.posted || '2 days ago',
            desc: j.description || j.desc || 'No description provided.',
            tags: skills.length > 0 ? [...stackTags, ...skills] : ['Full-Time', j.department || 'Engineering'],
            logo: company[0],
            featured: i < 3,
            dept: j.department || 'Engineering',
            mode: j.workplaceType || 'Remote',
            loc: j.location || 'Bengaluru',
            salaryRange: salCat,
            type: companyObj.type || companyObj.industry || 'Corporate',
            date: new Date(j.createdAt || Date.now()).getTime()
          };
        });
        setBackendJobs(formatted);
      } else {
        setBackendJobs([]);
      }

      if (resComps?.success && resComps?.data?.companies) {
        setBackendCompanies(resComps.data.companies);
      } else {
        setBackendCompanies([]);
      }
      setLoadingBackend(false);
    });
    }, 250);

    return () => window.clearTimeout(requestTimer);
  }, [search, locSearch, expRange]);

  useEffect(() => {
    const nextSearch = searchParams.get("q") || searchParams.get("search") || "";
    const nextLocation = searchParams.get("location") || "";
    const nextExperience = searchParams.get("experience") || "";
    const nextExperienceNumber = Number(nextExperience.match(/\d+/)?.[0] || 0);

    setSearch(nextSearch);
    setLocSearch(nextLocation);
    setExpRange(nextExperienceNumber);
    setCurrentPage(1);
  }, [searchParams]);

  const syncSearchParams = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (locSearch.trim()) params.set("location", locSearch.trim());
    if (expRange > 0) params.set("experience", `${expRange} years`);
    setSearchParams(params);
    setCurrentPage(1);
  };

  const toggleFilter = (catId, option) => {
    setFilters(prev => {
      const cur = prev[catId] || [];
      const updated = cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option];
      return { ...prev, [catId]: updated };
    });
    setCurrentPage(1);
  };

  const openFilterModal = (catId) => {
    setDraftFilters({ ...filters }); // Copy current filters to draft
    setActiveModal(catId);
  };

  const toggleDraftFilter = (catId, option) => {
    setDraftFilters(prev => {
      const cur = prev[catId] || [];
      const updated = cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option];
      return { ...prev, [catId]: updated };
    });
  };

  const applyModalFilters = () => {
    setFilters(draftFilters);
    setCurrentPage(1);
    setActiveModal(null);
  };

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [activeModal]);

  const hasFilters = Object.values(filters).some(arr => arr.length > 0);

  const activeJobsPool = backendJobs;

  const normalizeWorkMode = (mode) => {
    const m = String(mode || "").toLowerCase();
    if (m.includes("remote")) return "remote";
    if (m.includes("hybrid")) return "hybrid";
    if (m.includes("office") || m.includes("on-site") || m.includes("onsite")) return "work from office";
    return m;
  };

  // Filter and Sort Logic
  const filteredJobs = activeJobsPool.filter(job => {
    // Search match
    if (search) {
      const terms = search.toLowerCase().split(/[\s,]+/).map((term) => term.trim()).filter(Boolean);
      const searchableText = [
        job.title,
        job.company,
        job.dept,
        job.location,
        job.exp,
        ...(job.tags || []),
      ].join(" ").toLowerCase();

      if (!terms.every((term) => searchableText.includes(term))) {
        return false;
      }
    }

    // Location search field match
    if (locSearch) {
      const locSearchLower = locSearch.toLowerCase();
      const locMatch = String(job.location || "").toLowerCase().includes(locSearchLower);
      if (!locMatch) return false;
    }

    // Category match
    for (const [catId, selectedOpts] of Object.entries(filters)) {
      if (selectedOpts && selectedOpts.length > 0) {
        const jobVal = String(job[catId] || "").toLowerCase();
        
        if (catId === "dept") {
          const match = selectedOpts.some(opt => String(opt || "").toLowerCase() === jobVal);
          if (!match) return false;
        } else if (catId === "mode") {
          const normalizedJobMode = normalizeWorkMode(jobVal);
          const match = selectedOpts.some(opt => normalizeWorkMode(opt) === normalizedJobMode);
          if (!match) return false;
        } else if (catId === "loc") {
          const match = selectedOpts.some(opt => {
            const optLower = String(opt || "").toLowerCase();
            return jobVal.includes(optLower) || optLower.includes(jobVal);
          });
          if (!match) return false;
        } else if (catId === "salaryRange") {
          const match = selectedOpts.some(opt => String(opt || "").toLowerCase() === jobVal);
          if (!match) return false;
        } else if (catId === "type") {
          const match = selectedOpts.some(opt => String(opt || "").toLowerCase() === jobVal);
          if (!match) return false;
        }
      }
    }

    // Experience match
    if (expRange > 0) {
      const matches = String(job.exp || "").match(/^(\d+)/);
      const minJobExp = matches ? parseInt(matches[1]) : 0;
      if (minJobExp > expRange) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === "newest") return b.date - a.date;
    if (sortBy === "salary") {
      const getSal = s => parseInt(s.split("–")[0]) || 0;
      return getSal(b.salary) - getSal(a.salary);
    }
    return 0; // default/relevance matches backend order
  });

  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const currentJobs = filteredJobs.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE
  );

  const handleCategoryClick = (cat) => {
    const term = cat.replace(/\s+Jobs$/i, "");
    setSearch(term);
    const params = new URLSearchParams(searchParams);
    params.set("q", term);
    setSearchParams(params);
    setCurrentPage(1);
  };


  return (
    <div className="jlp-root">
      {/* ── Header ── */}
      <header className={`jlp-header${scrolled ? " scrolled" : ""}`}>
        <div className="jlp-header-inner">
          <Link to="/">
            <img src={mavenLogo} alt="Maven Jobs" className="jlp-logo" />
          </Link>

          <div className="jlp-search-bar">
            <div className="jlp-search-field">
              <FiSearch size={16} />
              <input
                type="text"
                placeholder="Job title, skills, or company"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") syncSearchParams();
                }}
              />
            </div>
            <div className="jlp-search-field">
              <FiMapPin size={16} />
              <input 
                type="text" 
                placeholder="Location" 
                value={locSearch}
                onChange={e => {
                  setLocSearch(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") syncSearchParams();
                }}
              />
            </div>
            <button className="jlp-search-btn" aria-label="Search" onClick={syncSearchParams}>
              <FiSearch size={18} />
            </button>
          </div>

          <div className="jlp-header-actions">
            {user ? (
              <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#333', fontWeight: '600', cursor: 'pointer' }}>
                  <img src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }} />
                </Link>
                <button className="jlp-btn-login" onClick={logout}>Logout</button>
              </div>
            ) : (
              <>
                <button className="jlp-btn-login" onClick={openLogin}>Login</button>
                <button className="jlp-btn-register" onClick={openRegister}>Register Free</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Top Categories Strip ── */}
      <div className="jlp-top-categories-wrapper">
        <div className="jlp-top-categories-inner">
          <button className="jlp-scroll-btn left" onClick={scrollLeft}>
            <FiChevronLeft size={20} />
          </button>

          <div className="jlp-top-categories-container" ref={scrollRef}>
            {TOP_CATEGORIES.map((cat, idx) => (
              <div 
                key={idx} 
                className="jlp-top-category-chip"
                onClick={() => handleCategoryClick(cat)}
                style={{ cursor: 'pointer' }}
              >
                {cat}
              </div>
            ))}
          </div>

          <button className="jlp-scroll-btn right" onClick={scrollRight}>
            <FiChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="jlp-body">

        {/* Left: Filters */}
        <aside className="jlp-sidebar">
          <div className="jlp-filter-card">
            <div className="jlp-filter-header">
              <div className="jlp-filter-title">
                <FiFilter size={16} /> All Filters
              </div>
              {hasFilters || expRange > 0 ? (
                <button className="jlp-clear-btn" onClick={() => { setFilters({}); setExpRange(0); setSearchParams({}); }}>Clear All</button>
              ) : null}
            </div>

            {/* Experience Slider */}
            <div className="jlp-filter-group">
              <div className="jlp-filter-group-header">
                <div className="jlp-filter-group-label">Experience</div>
                <FiChevronDown size={14} className="jlp-group-arrow" />
              </div>
              <div className="jlp-exp-slider-container">
                <div className="jlp-exp-tooltip" style={{ left: `${(expRange / 30) * 100}%` }}>
                  {expRange}
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={expRange}
                  onChange={(e) => {
                    setExpRange(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    background: `linear-gradient(to right, #143f86 0%, #143f86 ${(expRange / 30) * 100}%, #e2e8f0 ${(expRange / 30) * 100}%, #e2e8f0 100%)`
                  }}
                  className="jlp-exp-slider"
                />
                <div className="jlp-exp-labels">
                  <span>0 Yrs</span>
                  <span>30 Yrs</span>
                </div>
              </div>
            </div>

            {FILTER_CATEGORIES.map(cat => {
              const displayOptions = cat.options.slice(0, 5);
              const hasMore = cat.options.length > 5;
              return (
                <div className="jlp-filter-group" key={cat.id}>
                  <div className="jlp-filter-group-label">{cat.label}</div>
                  <div className="jlp-filter-options">
                    {displayOptions.map(opt => {
                      const isChecked = (filters[cat.id] || []).includes(opt);
                      return (
                        <div
                          key={opt}
                          className="jlp-filter-option"
                          onClick={() => toggleFilter(cat.id, opt)}
                        >
                          <div className={`jlp-checkbox${isChecked ? " checked" : ""}`}>
                            {isChecked && <FiCheck strokeWidth={3} size={10} />}
                          </div>
                          <span className={`jlp-option-label${isChecked ? " active" : ""}`}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {hasMore && (
                    <button
                      className="jlp-view-more-btn"
                      onClick={() => openFilterModal(cat.id)}
                    >
                      View More
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: Job Listings */}
        <section className="jlp-center">
          <div className="jlp-results-bar">
            <div>
              <div className="jlp-results-title">
                {loadingBackend ? (
                  <span>Loading Jobs...</span>
                ) : filteredJobs.length > 0 ? (
                  <>
                    {Math.min((currentPage - 1) * JOBS_PER_PAGE + 1, filteredJobs.length)} – {Math.min(currentPage * JOBS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} <span>Jobs Found</span>
                  </>
                ) : (
                  <span>No Jobs Found</span>
                )}
              </div>
              <div className="jlp-results-sub">Recommended based on your preferences</div>
            </div>
            <div className="jlp-sort-row">
              <span className="jlp-sort-label">Sort by:</span>
              <div className="jlp-sort-wrapper">
                <button className="jlp-sort-btn" onClick={() => setShowSort(!showSort)}>
                  {sortBy === "relevance" ? "Relevance" : sortBy === "newest" ? "Newest" : "Salary"} <FiChevronDown size={14} />
                </button>
                {showSort && (
                  <div className="jlp-sort-dropdown">
                    <div onClick={() => { setSortBy("relevance"); setShowSort(false); }}>Relevance</div>
                    <div onClick={() => { setSortBy("newest"); setShowSort(false); }}>Newest</div>
                    <div onClick={() => { setSortBy("salary"); setShowSort(false); }}>Salary</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loadingBackend ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="jlp-job-card skeleton" style={{ minHeight: '180px', background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '24px 28px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F1F5F9', opacity: 0.6 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ width: '40%', height: 16, background: '#F1F5F9', borderRadius: 4 }} />
                    <div style={{ width: '25%', height: 12, background: '#F1F5F9', borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ width: '100%', height: 40, background: '#F1F5F9', borderRadius: 8 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: '30%', height: 20, background: '#F1F5F9', borderRadius: 6 }} />
                  <div style={{ width: '20%', height: 28, background: '#F1F5F9', borderRadius: 8 }} />
                </div>
              </div>
            ))
          ) : currentJobs.length > 0 ? (
            currentJobs.map(job => (
              <div key={job.id} className={`jlp-job-card${job.featured ? " featured" : ""}`}>
                {job.featured && <div className="jlp-featured-badge"><FaStar size={12} className="inline mr-1" /> Featured</div>}

                <div className="jlp-card-top">
                  <div className="jlp-company-logo">{job.logo}</div>
                  <div className="jlp-card-meta">
                    <div className="jlp-job-title">{job.title}</div>
                    <div className="jlp-company-row">
                      <span className="jlp-company-name">{job.company}</span>
                      <div className="jlp-rating-badge">
                        {job.rating} <FaStar size={9} />
                      </div>
                      <span className="jlp-reviews">{job.reviews} Reviews</span>
                    </div>
                  </div>
                </div>

                <div className="jlp-card-details">
                  <div className="jlp-detail-item">
                    <div className="jlp-detail-icon"><FiBriefcase size={15} /></div>
                    <span className="jlp-detail-text">{job.exp}</span>
                  </div>
                  <div className="jlp-detail-item">
                    <div className="jlp-detail-icon"><FaRupeeSign size={13} /></div>
                    <span className="jlp-detail-text">{job.salary}</span>
                  </div>
                  <div className="jlp-detail-item">
                    <div className="jlp-detail-icon"><FiMapPin size={15} /></div>
                    <span className="jlp-detail-text">{job.location}</span>
                  </div>
                  <div className="jlp-detail-item">
                    <div className="jlp-detail-icon"><FiClock size={15} /></div>
                    <span className="jlp-detail-text">{job.posted}</span>
                  </div>
                </div>

                <p className="jlp-card-desc">{job.desc}</p>

                <div className="jlp-card-footer">
                  <div className="jlp-tags">
                    {job.tags.map(tag => (
                      <span key={tag} className="jlp-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="jlp-card-actions">
                    <button className="jlp-save-btn" aria-label="Save job">
                      <FiBookmark size={17} />
                    </button>
                    <button
                      className="jlp-apply-btn"
                      onClick={() => navigate(`/job/${job.id}`)}
                    >
                      Quick Apply <FiArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', color: '#64748B' }}>
              <FiBriefcase size={40} style={{ marginBottom: 12, color: '#94A3B8' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>No matching jobs found</h3>
              <p style={{ fontSize: '0.85rem' }}>Try adjusting your search terms or clearing the active filters.</p>
            </div>
          )}

          {/* Pagination */}
          {!loadingBackend && totalPages > 1 && (
            <div className="jlp-pagination">
              <button
                className="jlp-page-btn nav-btn"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Previous
              </button>
              <div className="jlp-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    className={`jlp-page-btn num-btn${currentPage === num ? " active" : ""}`}
                    onClick={() => {
                      setCurrentPage(num);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                className="jlp-page-btn nav-btn"
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* Right: Companies & Trending */}
        <aside className="jlp-right-sidebar">
          <div className="jlp-right-card">
            <div className="jlp-right-card-title">Top Companies Hiring</div>
            <div className="jlp-company-list">
              {backendCompanies.length > 0 ? (
                backendCompanies.map(c => (
                  <div 
                    key={c.id || c.name} 
                    className="jlp-company-item"
                    onClick={() => c.id && navigate(`/company/${c.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="jlp-company-item-left">
                      <div 
                        className="jlp-company-item-logo"
                        style={{
                          background: c.color || '#002366',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem'
                        }}
                      >
                        {c.logo || c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="jlp-company-item-name">{c.name}</div>
                        <div className="jlp-company-item-jobs">{c.activeJobCount || 0} Open Roles</div>
                      </div>
                    </div>
                    <div className="jlp-company-item-arrow"><FiArrowRight size={14} /></div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                  No companies found
                </div>
              )}
            </div>
            <button className="jlp-view-all-btn" onClick={() => navigate("/companies")}>
              View All Companies
            </button>
          </div>

          <div className="jlp-trending-card">
            <div className="jlp-trending-icon"><FiTrendingUp /></div>
            <div className="jlp-trending-title">Trending Career Paths</div>
            <div className="jlp-trending-desc">Roles seeing 40%+ more hiring this quarter.</div>
            <div className="jlp-trending-paths">
              {["Data Engineering", "Cloud Architecture", "Product Operations", "AI / ML Engineering"].map(p => (
                <div key={p} className="jlp-trending-path" onClick={() => setSearch(p)} style={{ cursor: 'pointer' }}>
                  <div className="jlp-trending-dot" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        </aside>

      </div>

      {/* ── Footer ── */}
      <footer className="jlp-footer">
        <div className="jlp-footer-grid">
          <div className="jlp-footer-brand">
            <img src={mavenLogo} alt="Maven Jobs" className="jlp-footer-brand-logo" />
            <p>
              Maven Jobs helps candidates discover better opportunities and helps teams
              hire faster with a cleaner, more focused recruiting experience.
            </p>
            <div className="jlp-footer-social">
              {[
                { label: "Facebook", icon: FaFacebookF },
                { label: "LinkedIn", icon: FaLinkedinIn },
                { label: "X", icon: FaXTwitter },
                { label: "Instagram", icon: FaInstagram },
              ].map(({ label, icon: Icon }) => (
                <Link key={label} to="#" aria-label={label}><Icon /></Link>
              ))}
            </div>
          </div>

          <div className="jlp-footer-col">
            <h4>Company</h4>
            <ul>
              {["About Us", "Careers", "Press", "Blog", "Sitemap"].map(link => (
                <li key={link}><Link to={link === "Blog" ? "/blogs" : "/info"}>{link}</Link></li>
              ))}
            </ul>
          </div>

          <div className="jlp-footer-col">
            <h4>Support</h4>
            <ul>
              {["Help Center", "Grievances", "Fraud Alert", "Trust & Safety", "Report Issue"].map(link => (
                <li key={link}><Link to="/info">{link}</Link></li>
              ))}
            </ul>
          </div>

          <div className="jlp-footer-col">
            <h4>Legal</h4>
            <ul>
              {["Privacy Policy", "Terms & Conditions", "Cookie Policy", "GDPR", "Credits"].map(link => (
                <li key={link}><Link to="/info">{link}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="jlp-footer-bottom">
          <p>&copy; 2026 MavenJobs. All rights reserved. All trademarks are the property of their respective owners.</p>
          <div className="jlp-footer-bottom-links">
            <a href="#">iimjobs</a>
            <a href="#">Shiksha</a>
            <a href="#">Jeevansathi</a>
            <a href="#">Our Businesses</a>
          </div>
        </div>
      </footer>

      {/* ── Filter Modal ── */}
      {activeModal && (
        <div className="jlp-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="jlp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="jlp-modal-header">
              <h3 className="jlp-modal-title">
                {FILTER_CATEGORIES.find(c => c.id === activeModal)?.label}
              </h3>
              <button className="jlp-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="jlp-modal-body">
              <div className="jlp-modal-grid">
                {FILTER_CATEGORIES.find(c => c.id === activeModal)?.options.map(opt => {
                  const isChecked = (draftFilters[activeModal] || []).includes(opt);
                  const mockCount = Math.floor(Math.random() * 900) + 15;
                  return (
                    <div
                      key={opt}
                      className="jlp-filter-option"
                      onClick={() => toggleDraftFilter(activeModal, opt)}
                    >
                      <div className={`jlp-checkbox${isChecked ? " checked" : ""}`}>
                        {isChecked && <FiCheck strokeWidth={3} size={10} />}
                      </div>
                      <span className={`jlp-option-label${isChecked ? " active" : ""}`}>
                        {opt} <span className="jlp-option-count">({mockCount})</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="jlp-modal-footer">
              <button className="jlp-modal-apply-btn" onClick={applyModalFilters}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

