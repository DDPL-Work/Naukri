import React, { useState, useRef, useEffect } from 'react';
import {
  FiEdit2, FiBriefcase, FiMapPin, FiZap, FiCheckCircle,
  FiChevronRight, FiHome, FiFileText, FiMonitor, FiShare2,
  FiDownload, FiPlus, FiUsers, FiEye, FiTrendingUp, FiAward,
  FiBell, FiSettings, FiLogOut, FiPhone, FiMail, FiX,
  FiCalendar, FiClock, FiChevronLeft, FiInfo, FiSend, FiChevronDown,
  FiStar, FiBookmark, FiGlobe, FiTwitter, FiFacebook, FiLinkedin, FiCopy, FiShare,
  FiHelpCircle, FiShield, FiLock, FiTrash2, FiSearch,
  FiLayers, FiBookOpen, FiArrowRight, FiMenu
} from 'react-icons/fi';
import { FaWhatsapp, FaLinkedinIn, FaTwitter as FaXTwitter, FaFacebookF } from 'react-icons/fa';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GiCrown } from 'react-icons/gi';
import { useAuth } from '../../AuthContext';
import RecommendedJobs from './RecommendedJobs';
import EarlyAccessModal from '../../components/EarlyAccessModal';
import './ProfileDashboard.css';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ResumeTemplate from '../../components/ResumeTemplate';
import ProfileEditModal from '../../components/ProfileModals';
import authService from '../../services/authService';

const FaqItem = ({ index, question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`faq-acc-item ${isOpen ? 'open' : ''}`}>
      <button className="faq-acc-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="faq-acc-num">{index < 10 ? `0${index}` : index}</div>
        <div className="faq-acc-q">{question}</div>
        <div className="faq-acc-chevron"><FiChevronDown size={16} /></div>
      </button>
      {isOpen && <div className="faq-acc-body">{answer}</div>}
    </div>
  );
};

export default function ProfileDashboard() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(user?.name || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Profile');
  const [coverImage, setCoverImage] = useState(user?.coverPic || "");
  const [showCompletionModal, setShowCompletionModal] = useState(user?.profileCompletion < 100);
  const [showPreview, setShowPreview] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState(null);
  const [showJobsModal, setShowJobsModal] = useState(false);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);
  const [showKnowMoreModal, setShowKnowMoreModal] = useState(false);
  const jobScrollRef = useRef(null);
  const earlyScrollRef = useRef(null);
  const matchScrollRef = useRef(null);
  const blogScrollRef = useRef(null);
  const pfpInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [skills, setSkills] = useState(user?.skills || []);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillValue, setNewSkillValue] = useState('');
  const [activeTip, setActiveTip] = useState(null); // 'experience', 'summary', 'skills'
  const [activeEditSection, setActiveEditSection] = useState(null);
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(false);
  const [workStatus, setWorkStatus] = useState('Open to Work');
  const [showWorkStatusModal, setShowWorkStatusModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuickAnswer, setShowQuickAnswer] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { updateProfile } = useAuth();

  const handleSaveProfile = async (formData) => {
    setIsSaving(true);
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setActiveEditSection(null);
        if (formData.skills) setSkills(formData.skills);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const resumeRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadResume = async () => {
    setIsDownloading(true);
    const element = resumeRef.current;

    if (element) {
      try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('Pranjal_Kundliya_Resume.pdf');
      } catch (error) {
        console.error("Error generating PDF:", error);
      }
    }
    setIsDownloading(false);
  };

  // Production ready unique profile link generation like LinkedIn
  const getUniqueId = () => {
    if (user?._id) return user._id.toString().slice(-6);
    if (user?.id) return user.id.toString().slice(-6);
    return Math.random().toString(36).substr(2, 6);
  };
  const profileLink = `${window.location.host}/in/${user?.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}-${getUniqueId()}`;

  const [recommendedJobs, setRecommendedJobs] = useState({});
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [showApplyMatchModal, setShowApplyMatchModal] = useState(false);
  const [nvites, setNvites] = useState([]);
  const [earlyAccess, setEarlyAccess] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({ totalApplications: 0, shortlisted: 0, interviews: 0, companiesApplied: 0 });

  useEffect(() => {
    if (user) {
      authService.getDashboard().then(res => {
        if (res.success && res.data) {
          const colors = [
            { bg: '#EEF2FF', col: '#4338CA' },
            { bg: '#FFF7ED', col: '#C2410C' },
            { bg: '#F0FDF4', col: '#15803D' },
            { bg: '#EFF6FF', col: '#1D4ED8' },
            { bg: '#FDF2F8', col: '#9D174D' },
            { bg: '#FEF3C7', col: '#92400E' },
            { bg: '#E0E7FF', col: '#3730A3' }
          ];
          
          const formatSalary = (min, max) => {
            if (!min && !max) return null;
            const toL = v => (v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${v}`);
            if (min && max) return `${toL(min)} – ${toL(max)} P.A.`;
            if (max) return `Up to ${toL(max)} P.A.`;
            return `${toL(min)}+ P.A.`;
          };

          const buildTags = (job) => {
            const tagSet = new Set();
            if (job.workplaceType) tagSet.add(job.workplaceType);
            if (job.jobType) tagSet.add(job.jobType);
            if (job.department && job.department.length < 25) tagSet.add(job.department);
            if (tagSet.size === 0) tagSet.add('Full-Time');
            return [...tagSet].slice(0, 3);
          };

          const formatJobData = (job, idx) => ({
            ...job,
            title: job.title,
            company: job.companyName,
            loc: job.location || 'Remote',
            ago: job.lastUpdated,
            rating: (4.0 + Math.random() * 0.9).toFixed(1),
            code: job.title.substring(0, 2).toUpperCase(),
            bg: colors[idx % colors.length].bg,
            col: colors[idx % colors.length].col,
            logos: ['A', 'N', 'B', 'I', 'X'].sort(() => 0.5 - Math.random()).slice(0, 5),
            tags: buildTags(job),
            salaryFormatted: formatSalary(job.salaryMin, job.salaryMax)
          });

          if (res.data.recommendedJobs) {
            const mappedJobs = {};
            Object.keys(res.data.recommendedJobs).forEach(key => {
              mappedJobs[key] = res.data.recommendedJobs[key].map(formatJobData);
            });
            
            setRecommendedJobs(mappedJobs);
            const firstPopulatedKey = Object.keys(mappedJobs).find(key => mappedJobs[key] && mappedJobs[key].length > 0);
            if (firstPopulatedKey) {
              setActiveTab(firstPopulatedKey);
            } else {
              const firstKey = Object.keys(mappedJobs)[0];
              if (firstKey) setActiveTab(firstKey);
            }
          }

          if (res.data.nvites) setNvites(res.data.nvites.map(formatJobData));
          if (res.data.earlyAccess) setEarlyAccess(res.data.earlyAccess.map(formatJobData));
          if (res.data.summary) setDashboardSummary(res.data.summary);
          if (res.data.profile) setCandidateProfile(res.data.profile);
          if (res.data.recentApplications) setRecentApplications(res.data.recentApplications);
        }
      }).catch(err => console.error("Failed to fetch dashboard data", err));
    }
  }, [user]);

  const handleScroll = (ref, dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  if (!user) return <Navigate to="/" />;

  const handleNameSave = () => { updateUser({ name: editNameValue }); setIsEditingName(false); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setIsEditingName(false); };

  const handlePfpChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", "profile");

    try {
      const res = await authService.uploadImage(formData);
      updateUser({ profilePic: res.data.url, profileCompletion: res.profileCompletion });
    } catch (err) {
      console.error("PFP Upload failed:", err);
    } finally {
      setIsLoading(false);
    }
    e.target.value = '';
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", "cover");

    try {
      const res = await authService.uploadImage(formData);
      setCoverImage(res.data.url);
      updateUser({ coverPic: res.data.url, profileCompletion: res.profileCompletion });
    } catch (err) {
      console.error("Cover Upload failed:", err);
    } finally {
      setIsLoading(false);
    }
    e.target.value = '';
  };

  const addSkill = () => {
    const s = newSkillValue.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setNewSkillValue('');
      setIsAddingSkill(false);
    }
  };

  const removeSkill = (s) => {
    setSkills(skills.filter(item => item !== s));
  };

  return (
    <div className="pd-root">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <ResumeTemplate ref={resumeRef} user={user} />
      </div>
      <input ref={pfpInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePfpChange} />
      <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />

      {/* ─── Navbar ─── */}
      <header className="pd-navbar">
        <div className="pd-navbar-inner">
          <Link to="/" className="pd-navbar-brand">
            <img src={mavenLogo} alt="MavenJobs" className="pd-navbar-logo-img" />
          </Link>

          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>

          <div className={`nav-menu-wrapper ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <nav className="pd-navbar-links">
            <Link to="/jobs" className="pd-nav-link">Jobs</Link>
            <div className="pd-nav-dropdown-wrapper"
              onMouseEnter={() => setActiveNavDropdown('Companies')}
              onMouseLeave={() => setActiveNavDropdown(null)}>
              <Link to="/companies" className="pd-nav-link">
                Companies <FiChevronDown size={13} className="pd-nav-chevron" />
              </Link>
              {activeNavDropdown === 'Companies' && (
                <div className="pd-megamenu">
                  <div className="pd-megamenu-col">
                    <span className="pd-mega-label">EXPLORE CATEGORIES</span>
                    {['Unicorn', 'MNC', 'Startup', 'Product Based', 'Internet'].map(i => <Link key={i} to="/companies">{i}</Link>)}
                  </div>
                  <div className="pd-megamenu-col">
                    <span className="pd-mega-label">COLLECTIONS</span>
                    {['Top Companies', 'IT Companies', 'Fintech', 'Sponsored', 'Featured'].map(i => <Link key={i} to="/companies">{i}</Link>)}
                  </div>
                  <div className="pd-megamenu-col">
                    <span className="pd-mega-label">RESEARCH</span>
                    {['Interview Questions', 'Company Salaries', 'Reviews', 'Salary Calculator'].map(i => <Link key={i} to="/companies">{i}</Link>)}
                  </div>
                </div>
              )}
            </div>
            <Link to="/services" className="pd-nav-link">Services</Link>
            <Link to="/blogs" className="pd-nav-link">Blogs</Link>
          </nav>

          <div className="pd-navbar-actions">
            <div className="pd-nav-search">
              <FiGlobe size={15} className="pd-search-icon" />
              <input type="text" placeholder="Search jobs, companies…" />
            </div>
            <button className={`pd-navbar-bell ${showNotifications ? 'active' : ''}`} onClick={() => setShowNotifications(true)}>
              <FiBell size={19} />
              <span className="pd-nav-badge">3</span>
            </button>
            <div className="pd-navbar-avatar" onClick={() => navigate('/profile')}>
              <img src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"} alt="You" />
              <span className="pd-avatar-status" />
            </div>
            <button className="pd-navbar-logout" onClick={logout}>
              <FiLogOut size={15} /> Logout
            </button>
          </div>
          </div>
        </div>
      </header>

      {/* ─── Cover ─── */}
      <div className="pd-cover" style={{ backgroundImage: `url(${coverImage})` }}>
        <div className="pd-cover-overlay" />
        <button className="pd-cover-edit" onClick={() => coverInputRef.current.click()}>
          <FiEdit2 size={13} /> Change Cover
        </button>
      </div>

      {/* ─── Identity Bar ─── */}
      <div className="pd-identity-bar">
        <div className="pd-identity-inner">
          <div className="pd-avatar-wrap">
            <img
              src={user.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              alt="Profile" className="pd-big-avatar"
            />
            <button className="pd-avatar-edit" onClick={() => pfpInputRef.current.click()}>
              <FiEdit2 size={11} />
            </button>
            <div className="pd-avatar-online" />
          </div>

          <div className="pd-identity-info">
            <div className="pd-name-row">
              {isEditingName ? (
                <div className="pd-name-edit-row">
                  <input className="pd-name-input" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
                  <button className="pd-save-btn" onClick={handleNameSave}>Save</button>
                  <button className="pd-cancel-btn" onClick={() => setIsEditingName(false)}>✕</button>
                </div>
              ) : (
                <h1 className="pd-name">
                  {user.name}
                  <span className="pd-verified"><FiCheckCircle size={16} /></span>
                  <button className="pd-edit-icon-btn" onClick={() => { setEditNameValue(user.name); setIsEditingName(true); }}>
                    <FiEdit2 size={13} />
                  </button>
                </h1>
              )}
              <span className={`pd-open-badge ${workStatus === 'Working' ? 'working' : ''}`} onClick={() => setShowWorkStatusModal(true)}>
                ● {workStatus}
              </span>
            </div>

            <p className="pd-headline">{user.headline || 'Update your headline'}</p>
            <p className="pd-location"><FiMapPin size={12} /> {user.currentCity || "Update your location"}</p>

            <div className="pd-quick-stats">
              <div className="pd-qs-item">
                <FiEye size={15} />
                <div><strong>0</strong><span>Profile views</span></div>
              </div>
              <div className="pd-qs-divider" />
              <div className="pd-qs-item">
                <FiUsers size={15} />
                <div><strong>0</strong><span>Recruiter actions</span></div>
              </div>
              <div className="pd-qs-divider" />
              <div className="pd-qs-item">
                <FiTrendingUp size={15} />
                <div><strong>0</strong><span>Job matches</span></div>
              </div>
            </div>
          </div>

          <div className="pd-identity-cta">
            <button className="pd-btn-black" onClick={() => setShowPreview(true)}>
              <FiEye size={14} /> View Profile
            </button>
            <div className="pd-cta-row">
              <button className="pd-btn-white" onClick={() => setShowShareModal(true)}>
                <FiShare2 size={14} /> Share
              </button>
              <button className="pd-btn-white" onClick={handleDownloadResume} disabled={isDownloading}>
                <FiDownload size={14} /> {isDownloading ? 'Generating...' : 'Resume'}
              </button>
            </div>
            <button className="pd-btn-black" onClick={() => navigate('/info')}>
              <FiInfo size={14} /> Information
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Layout ─── */}
      <div className="pd-main">

        {/* Left Sidebar */}
        <aside className="pd-left">
          <div className="pd-card pd-completion-card">
            <div className="pd-completion-top">
              <div>
                <div className="pd-completion-label">Profile Strength</div>
                <div className="pd-completion-pct">{user.profileCompletion || 0}% Complete</div>
              </div>
              <div className="pd-completion-ring">
                <svg viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" />
                  <circle cx="22" cy="22" r="18" style={{ strokeDashoffset: `calc(113 - (113 * ${user.profileCompletion || 0}) / 100)` }} />
                </svg>
                <span>{user.profileCompletion || 0}</span>
              </div>
            </div>
            <div className="pd-completion-bar-track">
              <div className="pd-completion-bar" style={{ width: `${user.profileCompletion || 0}%` }} />
            </div>
            <div className="pd-completion-tips">
              {[
                { id: 'experience', label: 'Add work experience' },
                { id: 'summary', label: 'Add a profile summary' },
                { id: 'skills', label: 'Add your skills' }
              ].map(tip => (
                <div className="pd-tip-item" key={tip.id} onClick={() => setActiveTip(tip.id)}>
                  <FiPlus size={13} />
                  <span>{tip.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pd-card pd-sidenav-card">
            <Link to="#" className="pd-sidenav-item active"><FiHome size={17} /><span>My Home</span></Link>
            <button className="pd-sidenav-item" onClick={() => setShowJobsModal(true)}><FiBriefcase size={17} /><span>Jobs</span></button>
            <Link to="/companies" className="pd-sidenav-item"><FiMonitor size={17} /><span>Companies</span></Link>
            <Link to="/blogs" className="pd-sidenav-item"><FiFileText size={17} /><span>Blogs</span></Link>
            <button className="pd-sidenav-item" onClick={() => setShowFAQModal(true)}><FiHelpCircle size={17} /><span>FAQ</span></button>
            <button className="pd-sidenav-item" onClick={() => setShowSettingsModal(true)}><FiSettings size={17} /><span>Settings</span></button>
          </div>

          <div className="pd-card pd-perf-card">
            <div className="pd-perf-title">Performance <FiTrendingUp size={15} /></div>
            <div className="pd-perf-grid">
              <div className="pd-perf-stat">
                <span className="pd-perf-val">0</span>
                <span className="pd-perf-label">Search appearances</span>
              </div>
              <div className="pd-perf-stat">
                <span className="pd-perf-val">0</span>
                <span className="pd-perf-label">Recruiter actions</span>
              </div>
            </div>
            <div className="pd-boost-banner">
              <FiZap size={14} />
              <span>Get 3× profile boost</span>
              <FiChevronRight size={13} className="pd-boost-arrow" />
            </div>
          </div>
        </aside>

        {/* Center Feed */}
        <section className="pd-center">

          {/* PRO Banner */}
          <div className="pd-card pd-pro-card">
            <div className="pd-pro-left">
              <div className="pd-pro-eyebrow">UPGRADE YOUR CAREER</div>
              <h3 className="pd-pro-heading">Get hired <em>3× faster</em> with Pro</h3>
              <button className="pd-pro-btn" onClick={() => navigate('/pro')}>✦ Become Pro Member</button>
            </div>
            <div className="pd-pro-features">
              {['Hidden job invitations', 'AI-enhanced profile', 'Auto-Apply on MavenJobs', 'Priority recruiter access'].map(f => (
                <div className="pd-pro-feat" key={f}><FiCheckCircle size={14} /> {f}</div>
              ))}
            </div>
          </div>

          {/* Recommended Jobs */}
          <div className="pd-card">
            <div className="pd-section-header">
              <h3>Recommended for you</h3>
              <button className="pd-text-btn" onClick={() => setShowJobsModal(true)}>View all <FiChevronRight size={14} /></button>
            </div>
            <div className="pd-tabs">
              {Object.keys(recommendedJobs).map(tab => (
                <button key={tab} className={`pd-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>
            <div className="pd-scroll-wrap">
              <button className="pd-scroll-btn left" onClick={() => handleScroll(jobScrollRef, 'left')}><FiChevronLeft size={18} /></button>
              <div className="pd-job-scroll" ref={jobScrollRef}>
                {(!recommendedJobs[activeTab] || recommendedJobs[activeTab].length === 0) ? (
                  <div style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flex: 1, padding: '60px 20px', 
                    backgroundColor: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1',
                    margin: '10px auto', maxWidth: '400px', width: '100%'
                  }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
                    }}>
                      <FiBriefcase size={24} style={{ color: '#64748b' }} />
                    </div>
                    <h4 style={{ color: '#1e293b', fontSize: '16px', fontWeight: '700', margin: '0 0 6px 0' }}>No jobs found</h4>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>We couldn't find any jobs in this category right now.</p>
                  </div>
                ) : (
                  (recommendedJobs[activeTab] || []).map(job => (
                    <div className="pd-job-card" key={job.title}>
                      <div className="pd-job-header">
                        <div className="pd-job-logo" style={{ background: job.bg, color: job.col }}>{job.code}</div>
                        <span className="pd-job-ago">{job.ago}</span>
                      </div>
                      <h4 className="pd-job-title">{job.title}</h4>
                      <p className="pd-job-company">{job.company} <span className="pd-job-rating"><FiStar size={11} /> {job.rating}</span></p>
                      <p className="pd-job-loc"><FiMapPin size={11} /> {job.loc}</p>
                      <div className="pd-job-actions">
                        <button className="pd-job-apply" onClick={() => navigate(`/job/${job.id}`)}>Quick Apply</button>
                        <button className="pd-job-save"><FiBookmark size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="pd-scroll-btn right" onClick={() => handleScroll(jobScrollRef, 'right')}><FiChevronRight size={18} /></button>
            </div>
          </div>

          {/* NVites */}
          <div className="pd-card pd-nvites-card">
            <div className="pd-nvites-left">
              <div className="pd-nvites-icon"><FiMail size={28} /><span className="pd-nvites-dot" /></div>
              <h3>NVites</h3>
              <p>Invitation to apply</p>
              <Link to="#" className="pd-text-btn-sm">View all →</Link>
            </div>
            <div className="pd-nvites-list">
              {nvites.length > 0 ? nvites.map(inv => (
                <Link to="/jobs" className="pd-nvite-row" key={inv.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="pd-nvite-logo" style={{ background: inv.bg, color: inv.col }}>{inv.code}</div>
                  <div className="pd-nvite-info">
                    <div className="pd-nvite-title">{inv.title}</div>
                    <div className="pd-nvite-meta"><strong>{inv.company}</strong> · {inv.ago}</div>
                  </div>
                  <button className="pd-nvite-apply">Apply</button>
                </Link>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No invitations at the moment.
                </div>
              )}
            </div>
          </div>

          {/* Early Access */}
          <div className="pd-card pd-early-card">
            <div className="pd-section-header">
              <div className="pd-early-hd">
                <div className="pd-early-icon-wrap"><FiSend size={20} /></div>
                <div>
                  <h3>{earlyAccess.length} Early access roles <FiInfo size={13} className="pd-info-icon" /></h3>
                  <p>Exclusive roles before they go public</p>
                </div>
              </div>
              <button className="pd-text-btn" onClick={() => setShowEarlyAccessModal(true)}>View all <FiChevronRight size={14} /></button>
            </div>
            <div className="pd-scroll-wrap">
              <button className="pd-scroll-btn left" onClick={() => handleScroll(earlyScrollRef, 'left')}><FiChevronLeft size={18} /></button>
              <div className="pd-early-scroll" ref={earlyScrollRef}>
                {earlyAccess.length > 0 ? earlyAccess.map((r, i) => (
                  <div className="pd-early-role-card" key={r.id || i}>
                    <div className="pd-early-role-badge">{r.tags[0]}</div>
                    <h4>{r.title}</h4>
                    <p className="pd-early-type">{r.company}</p>
                    <div className="pd-early-tags">
                      <span className="pd-early-rating">★ {r.rating}</span>
                      {r.tags.map(t => <span key={t} className="pd-early-tag">{t}</span>)}
                    </div>
                    <div className="pd-early-meta">
                      <span><FiBriefcase size={12} /> {r.experience || '0-3 Yrs'}</span>
                      <span><FiZap size={12} /> {(r.salaryMin && r.salaryMax) ? `${r.salaryMin}-${r.salaryMax} L P.A.` : '4-8 L P.A.'}</span>
                      <span><FiMapPin size={12} /> {r.loc}</span>
                    </div>
                    <div className="pd-early-hiring">
                      <p>Hiring from one of these</p>
                      <div className="pd-early-logos">{r.logos.map((l, idx) => <div key={idx} className="pd-early-logo">{l}</div>)}</div>
                    </div>
                    <button className="pd-early-cta">Share interest</button>
                  </div>
                )) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', width: '100%' }}>
                    No early access roles available right now.
                  </div>
                )}
              </div>
              <button className="pd-scroll-btn right" onClick={() => handleScroll(earlyScrollRef, 'right')}><FiChevronRight size={18} /></button>
            </div>
          </div>

          {/* Stand Out Banner */}
          <div className="pd-card pd-standout-card">
            <div className="pd-standout-text">
              <div className="pd-standout-eyebrow">RECRUITER SPOTLIGHT</div>
              <h3>Stand out from the crowd</h3>
              <p>Highlight your application and get noticed by top recruiters instantly.</p>
              <button className="pd-btn-primary sm" onClick={() => setShowKnowMoreModal(true)}><FiZap size={13} /> Know More</button>
            </div>
            <div className="pd-standout-graphic">
              <div className="pd-graphic-rings">
                <div className="pd-ring r1" />
                <div className="pd-ring r2" />
                <div className="pd-ring r3" />
              </div>
              <FiUsers size={36} className="pd-standout-icon" />
            </div>
          </div>

          {/* Match Card */}
          {(() => {
            const appsWithScores = (recentApplications || []).filter(app => app && typeof app.matchScore === 'number');
            const hasRealScores = appsWithScores.length > 0;
            const getAvg = (field, fallback) => {
              if (!hasRealScores) return fallback;
              const sum = appsWithScores.reduce((acc, curr) => acc + (curr[field] ?? fallback), 0);
              return Math.round(sum / appsWithScores.length);
            };

            const totalApps = dashboardSummary?.totalApplications || recentApplications?.length || 49;
            const matchedAppsCount = hasRealScores
              ? appsWithScores.filter(app => app.matchScore >= 75).length
              : (dashboardSummary?.shortlisted || Math.max(1, Math.floor(totalApps * 0.35)));
            const matchRateRatio = totalApps > 0 ? (matchedAppsCount / totalApps) : 0;
            const matchRateStatus = matchRateRatio > 0.5 ? 'HIGH' : matchRateRatio > 0.25 ? 'MED' : 'LOW';

            const userExp = candidateProfile?.totalExperience || '0.08 yr';
            const userExpNum = parseFloat(userExp) || 1;
            const expMatchPct = getAvg('experienceMatch', Math.min(98, Math.round(75 + (userExpNum * 5))));

            const userCity = candidateProfile?.currentCity || candidateProfile?.preferredLocations?.[0] || 'Dehradun';
            const locMatchPct = getAvg('locationMatch', candidateProfile?.currentCity ? 92 : 86);

            const userSkillsStr = candidateProfile?.skills?.length > 0 ? candidateProfile.skills.slice(0, 2).join(', ') : 'Ui/Ux, Redux…';
            const skillsMatchPct = getAvg('skillMatch', candidateProfile?.skills?.length > 0 ? Math.min(95, 50 + candidateProfile.skills.length * 8) : 37);

            const userIndustry = candidateProfile?.currentCompany ? 'IT Services' : 'Tech & Software';
            const industryMatchPct = getAvg('roleMatch', candidateProfile?.currentCompany ? 82 : 57);

            const userDept = candidateProfile?.currentTitle || 'Engineering';
            const deptMatchPct = getAvg('roleMatch', candidateProfile?.currentTitle ? 88 : 67);

            const earlyAppVal = 'Fresh jobs';
            const earlyAppPct = 74;

            const dynamicMatchMetrics = [
              { label: 'Work Experience', val: `${userExp}${userExp.toLowerCase().includes('yr') ? '' : ' Yrs'}`, pct: expMatchPct, icon: <FiBriefcase /> },
              { label: 'Location', val: userCity, pct: locMatchPct, icon: <FiMapPin /> },
              { label: 'Key Skills', val: userSkillsStr.length > 15 ? userSkillsStr.substring(0, 14) + '…' : userSkillsStr, pct: skillsMatchPct, icon: <FiEdit2 /> },
              { label: 'Industry', val: userIndustry, pct: industryMatchPct, icon: <FiMonitor /> },
              { label: 'Department', val: userDept.length > 15 ? userDept.substring(0, 14) + '…' : userDept, pct: deptMatchPct, icon: <FiUsers /> },
              { label: 'Early Applicant', val: earlyAppVal, pct: earlyAppPct, icon: <FiTrendingUp /> },
            ];

            return (
              <div className="pd-card pd-match-card">
                <div className="pd-section-header">
                  <h3>Apply match — last 7 days</h3>
                  <button className="pd-text-btn" onClick={() => setShowApplyMatchModal(true)}>View all <FiChevronRight size={14} /></button>
                </div>
                <div className="pd-scroll-wrap">
                  <button className="pd-scroll-btn left" onClick={() => handleScroll(matchScrollRef, 'left')}><FiChevronLeft size={18} /></button>
                  <div className="pd-match-scroll" ref={matchScrollRef}>
                    <div className="pd-match-card-item summary">
                      <div className={`pd-match-low-ring ${matchRateStatus.toLowerCase()}`}><span>{matchRateStatus}</span></div>
                      <p><strong>{matchedAppsCount} of {totalApps}</strong> applies matched</p>
                    </div>
                    {dynamicMatchMetrics.map((m, i) => (
                      <div className="pd-match-card-item" key={i}>
                        <div className="pd-match-ring-wrap">
                          <svg viewBox="0 0 50 50" className="pd-match-svg">
                            <circle cx="25" cy="25" r="21" />
                            <circle cx="25" cy="25" r="21" style={{ strokeDashoffset: `calc(132 - (132 * ${m.pct}) / 100)` }} />
                          </svg>
                          <span className="pd-match-ring-icon">{m.icon}</span>
                        </div>
                        <div className="pd-match-info">
                          <h4>{m.label}</h4>
                          <p>{m.val}</p>
                          <span className="pd-match-pct">{m.pct}%</span>
                        </div>
                      </div>
                    ))}
                    <div className="pd-match-card-item update">
                      <h4>Review your profile</h4>
                      <p>Improve job recommendations</p>
                      <Link to="#" className="pd-update-link">Update Profile →</Link>
                    </div>
                  </div>
                  <button className="pd-scroll-btn right" onClick={() => handleScroll(matchScrollRef, 'right')}><FiChevronRight size={18} /></button>
                </div>
              </div>
            );
          })()}

          {/* Blog Section */}
          <div className="pd-card pd-blog-card">
            <div className="pd-section-header">
              <h3>Stay updated with our blogs</h3>
              <button className="pd-text-btn" onClick={() => navigate('/blogs')}>View all <FiChevronRight size={14} /></button>
            </div>
            <div className="pd-scroll-wrap">
              <button className="pd-scroll-btn left" onClick={() => handleScroll(blogScrollRef, 'left')}><FiChevronLeft size={18} /></button>
              <div className="pd-blog-scroll" ref={blogScrollRef}>
                {[
                  { title: 'AI-powered premium talent discovery', banner: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 50%, #FBBF24 100%)', label: 'PremiumX', labelStyle: { background: 'rgba(255,255,255,0.85)', color: '#92400E', fontWeight: 800, fontSize: '16px', padding: '6px 14px', borderRadius: 8 }, source: 'MavenJobs blog', date: '28 Apr 2026' },
                  { title: 'Resdex Enterprise - Search smarter, reach faster, and operate...', banner: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 40%, #06B6D4 100%)', label: 'Resdex Enterprise', labelStyle: { background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '5px 12px', borderRadius: 6 }, source: 'MavenJobs blog', date: '10 Apr 2026' },
                  { title: 'Introducing AI REX — MavenJobs\'s Agentic AI Talent Sourcing...', banner: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #C084FC 100%)', label: 'AI REX', labelStyle: { background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 800, fontSize: '15px', padding: '5px 14px', borderRadius: 8 }, source: 'MavenJobs blog', date: '10 Apr 2026' },
                  { title: 'How to write a resume that gets you hired in 2026', banner: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #6EE7B7 100%)', label: 'Career Tips', labelStyle: { background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '5px 12px', borderRadius: 6 }, source: 'MavenJobs blog', date: '02 Apr 2026' },
                  { title: 'Top 10 interview questions every developer should prepare for', banner: 'linear-gradient(135deg, #DC2626 0%, #F43F5E 50%, #FB7185 100%)', label: 'Interview Prep', labelStyle: { background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '5px 12px', borderRadius: 6 }, source: 'MavenJobs blog', date: '25 Mar 2026' },
                ].map((blog, i) => (
                  <div className="pd-blog-item" key={i}>
                    <div className="pd-blog-banner" style={{ background: blog.banner }}>
                      <span style={blog.labelStyle}>{blog.label}</span>
                    </div>
                    <div className="pd-blog-body">
                      <h4>{blog.title}</h4>
                      <p>{blog.source} &bull; {blog.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="pd-scroll-btn right" onClick={() => handleScroll(blogScrollRef, 'right')}><FiChevronRight size={18} /></button>
            </div>
          </div>

        </section>

        {/* Right Sidebar */}
        <aside className="pd-right">
          <div className="pd-card pd-app-card">
            <div className="pd-qr-box"><img src={mavenLogo} alt="QR" style={{ width: 32, opacity: 0.4 }} /></div>
            <p className="pd-app-stat"><strong>3,587</strong> downloads in last 30 mins</p>
            <p className="pd-app-sub">Scan to download the app</p>
            <div className="pd-app-badges">
              <span className="pd-badge-pill">🍎 App Store</span>
              <span className="pd-badge-pill">▶ Play Store</span>
            </div>
          </div>

          <Link to="/premium" style={{ textDecoration: 'none' }}>
            <div className="pd-card pd-premium-card" style={{ cursor: 'pointer' }}>
              <div className="pd-premium-glow" />
              <div className="pd-premium-eyebrow">FOR RECRUITERS</div>
              <h3 className="pd-premium-title">PremiumX</h3>
              <p className="pd-premium-desc">AI-powered premium talent discovery for modern teams.</p>
              <span className="pd-premium-link">Explore →</span>
            </div>
          </Link>

          <Link to="/leave" style={{ textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
            <div className="pd-card" style={{ padding: 0, overflow: 'hidden', margin: 0, transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,30,80,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,30,80,0.04)'; }}>
              <img
                src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400&h=200"
                alt="Leave Application"
                style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block', borderBottom: '1px solid #E2E8F0' }}
              />
              <div style={{ padding: '18px 20px 22px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                  One-Day Leave Application Samples & Templates
                </h4>
                <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.55, marginBottom: '16px' }}>
                  Worried about asking for a day off? Learn how to write a one-day leave application t...
                </p>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
                  Know more
                </div>
              </div>
            </div>
          </Link>

          <div className="pd-card pd-skills-card">
            <div className="pd-section-header">
              <h4>Top Skills</h4>
              <button className="pd-icon-btn" onClick={() => setIsAddingSkill(!isAddingSkill)}>
                {isAddingSkill ? <FiX size={15} /> : <FiPlus size={15} />}
              </button>
            </div>
            {isAddingSkill && (
              <div className="pd-skill-add-row">
                <input
                  type="text"
                  placeholder="Type skill..."
                  value={newSkillValue}
                  onChange={e => setNewSkillValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSkill()}
                  autoFocus
                />
                <button onClick={addSkill}><FiCheckCircle size={14} /></button>
              </div>
            )}
            <div className="pd-skills-wrap">
              {skills.map(s => (
                <span className="pd-skill-pill" key={s}>
                  {s}
                  <button className="pd-skill-remove" onClick={() => removeSkill(s)}>
                    <FiX size={10} />
                  </button>
                </span>
              ))}
              {skills.length === 0 && !isAddingSkill && <p className="pd-no-skills">No skills added yet.</p>}
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Profile Preview Modal ─── */}
      {showPreview && (
        <div className="ppm-overlay" onClick={() => setShowPreview(false)}>
          <div className="ppm-content" onClick={e => e.stopPropagation()}>
            <button className="ppm-close" onClick={() => setShowPreview(false)}><FiX size={22} /></button>
            <div className="ppm-body">
              <div className="ppm-card ppm-header-card">
                <div className="ppm-header-row">
                  <div className="ppm-avatar-wrap">
                    <img src={user.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="Profile" />
                    <div className="ppm-score">{user.profileCompletion || 0}%</div>
                  </div>
                  <div className="ppm-header-info">
                    <h2>{user.name} <FiEdit2 size={14} className="ppm-inline-edit" onClick={() => setActiveEditSection('Basic Details')} /></h2>
                    <p className="ppm-role">{user.headline || "Add a professional headline"}</p>
                    <p className="ppm-company-at">{user.currentCompany ? `at ${user.currentCompany}` : "No company listed"}</p>
                    <span className="ppm-updated">Last updated · {user.lastUpdated || "Just now"}</span>
                  </div>
                </div>
                <div className="ppm-meta-grid">
                  <div className="ppm-meta-item"><FiMapPin size={14} /> {user.currentCity || "Add City"}</div>
                  <div className="ppm-meta-item"><FiPhone size={14} /> {user.phone || "Add Phone"} {user.phone && <FiCheckCircle size={13} color="#10b981" />}</div>
                  <div className="ppm-meta-item"><FiBriefcase size={14} /> {user.totalExperience || "Add Experience"}</div>
                  <div className="ppm-meta-item"><FiMail size={14} /> {user.email} <FiCheckCircle size={13} color="#10b981" /></div>
                  <div className="ppm-meta-item">{user.expectedSalary ? `₹ ${user.expectedSalary}` : "Add Expected Salary"}</div>
                  <div className="ppm-meta-item"><FiClock size={14} /> {user.noticePeriod || "Add Notice Period"}</div>
                </div>
              </div>

              <div className="ppm-layout">
                <div className="ppm-left-col">
                  <div className="ppm-card ppm-links-card">
                    <h3>Quick links</h3>
                    {['Resume', 'Resume headline', 'Key skills', 'Employment', 'Education', 'IT skills', 'Projects', 'Profile summary', 'Career profile'].map(link => {
                      const isFilled = (
                        (link === 'Resume' && !!user.resume?.url) ||
                        (link === 'Resume headline' && !!user.headline) ||
                        (link === 'Key skills' && user.skills?.length > 0) ||
                        (link === 'Employment' && (!!user.currentTitle || !!user.currentCompany)) ||
                        (link === 'Education' && !!user.education) ||
                        (link === 'IT skills' && !!user.itSkills) ||
                        (link === 'Projects' && !!user.projectTitle) ||
                        (link === 'Profile summary' && !!user.summary) ||
                        (link === 'Career profile' && !!user.expectedSalary)
                      );

                      return (
                        <div
                          className={`ppm-link-row ${isFilled ? 'filled' : ''} ${activeEditSection === link ? 'active' : ''}`}
                          key={link}
                          onClick={() => setActiveEditSection(link)}
                        >
                          <div className="ppm-link-label-wrap">
                            {isFilled && <FiCheckCircle className="ppm-link-check" size={14} />}
                            <span>{link}</span>
                          </div>
                          <FiChevronRight size={13} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="ppm-right-col">
                  {activeEditSection ? (
                    <div className="ppm-edit-container">
                      <div className="ppm-edit-header">
                         <button className="ppm-back-btn" onClick={() => setActiveEditSection(null)}>
                            <FiChevronLeft /> Back to Profile
                         </button>
                         <h3>Edit {activeEditSection}</h3>
                      </div>
                      <ProfileEditModal
                        section={activeEditSection}
                        data={user}
                        isLoading={isSaving}
                        onSave={handleSaveProfile}
                        onClose={() => setActiveEditSection(null)}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="ppm-pro-banner">
                        <div className="ppm-pro-label">MavenJobs<span>Pro</span> <GiCrown className="ppm-crown" /></div>
                        <div className="ppm-pro-pitch">Up to <strong>4× profile views</strong></div>
                        <button className="ppm-pro-btn" onClick={() => navigate('/pro')}>Become Pro · 25% off</button>
                      </div>
                      {[
                        {
                          title: 'Resume', content: (
                            <div>
                              {user.resume?.url ? (
                                <div className="ppm-resume-row">
                                  <FiFileText size={20} color="#64748b" />
                                  <div>
                                    <div className="ppm-fname">{user.resume.fileName}</div>
                                    <div className="ppm-fdate">Uploaded {new Date(user.resume.uploadedAt).toLocaleDateString()}</div>
                                  </div>
                                  <div className="ppm-file-actions">
                                    <a href={user.resume.url} target="_blank" rel="noopener noreferrer"><FiDownload size={16} /></a>
                                    <FiSettings size={16} />
                                  </div>
                                </div>
                              ) : (
                                <div className="ppm-empty-state">No resume uploaded yet.</div>
                              )}
                              <div className="ppm-upload-zone">
                                <button className="ppm-upload-btn" onClick={() => setActiveEditSection('Resume')}>Update resume</button>
                                <p>doc, docx, rtf, pdf — max 2MB</p>
                              </div>
                            </div>
                          )
                        },
                        { title: 'Resume headline', content: <p className="ppm-body-text">{user.headline || "Add a professional headline..."}</p> },
                        {
                          title: 'Key skills', content: (
                            <div className="ppm-skills-wrap">
                              {user.skills?.length > 0 ? (
                                user.skills.map(s => (
                                  <span key={s} className="ppm-skill-chip">{s}</span>
                                ))
                              ) : (
                                <p className="ppm-empty-state">Add your key skills here.</p>
                              )}
                            </div>
                          )
                        },
                        {
                          title: 'Employment', content: (
                            user.currentTitle ? (
                              <div className="ppm-exp-item">
                                <div className="ppm-exp-title">{user.currentTitle} <FiEdit2 size={13} /></div>
                                <div className="ppm-exp-co">{user.currentCompany}</div>
                                <div className="ppm-exp-meta">{user.totalExperience} · {user.noticePeriod} notice</div>
                                <p className="ppm-body-text">{user.summary?.slice(0, 150)}...</p>
                              </div>
                            ) : (
                              <p className="ppm-empty-state">Add your employment details.</p>
                            )
                          )
                        },
                      ].map(sec => {
                        const isComplete = sec.title === 'Key skills' ? user.skills?.length > 0 : 
                                         sec.title === 'Resume headline' ? !!user.headline :
                                         sec.title === 'Resume' ? !!user.resume?.url : 
                                         sec.title === 'Employment' ? !!user.currentTitle : false;
                        return (
                          <div className="ppm-card" key={sec.title}>
                            <div className="ppm-sec-header" onClick={() => setActiveEditSection(sec.title)}>
                              <h3>{sec.title}</h3>
                              {isComplete && <FiCheckCircle color="#10b981" size={16} />}
                              <FiEdit2 size={14} className="ppm-sec-edit-icon" />
                            </div>
                            {sec.content}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─── Initial Completion Modal ─── */}
      {showCompletionModal && (
        <div className="ppm-overlay" style={{ zIndex: 10001 }}>
          <div className="ppm-content" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px', borderRadius: '28px' }}>
             <img src={mavenLogo} alt="Maven" style={{ height: '32px', marginBottom: '24px' }} />
             <h2 style={{ fontSize: '26px', color: '#143f86', marginBottom: '12px', fontWeight: 800 }}>Complete Your Profile</h2>
             <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: 1.6, fontSize: '15px' }}>
               Your profile is the first thing recruiters see. Complete it now to get <strong>3x more visibility</strong> and better job matches.
             </p>
             <button className="pd-btn-black" style={{ width: '100%', justifyContent: 'center', height: '54px', fontSize: '16px', borderRadius: '14px' }} onClick={() => { setShowCompletionModal(false); setShowPreview(true); }}>
                View Details
             </button>
             <button className="pd-text-btn" style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }} onClick={() => setShowCompletionModal(false)}>
                Maybe Later
             </button>
          </div>
        </div>
      )}


      {/* ─── Notification Sidebar ─── */}
      <div className={`pd-notif-overlay ${showNotifications ? 'show' : ''}`} onClick={() => setShowNotifications(false)} />
      <div className={`pd-notif-sidebar ${showNotifications ? 'show' : ''}`}>
        <div className="pd-notif-head">
          <h3>Notifications</h3>
          <button className="pd-notif-close" onClick={() => setShowNotifications(false)}><FiX size={18} /></button>
        </div>
        <div className="pd-notif-body">
          <div className="pd-notif-date">Today</div>
          {[
            { icon: <FiAward />, color: '#7C3AED', bg: '#F5F3FF', title: '🚀 Practice 4 interview questions for your Fortified Infotech application', desc: 'Get instant feedback to ace your interview', time: '2h ago', cta: 'Practice Now' },
            { icon: <FiFileText />, color: '#D97706', bg: '#FFFBEB', title: 'Your resume was viewed by a recruiter', desc: 'Application History', time: '3h ago' },
            { icon: <FiUsers />, color: '#2563EB', bg: '#EFF6FF', title: 'Let AI help you ace your next job interview', desc: 'Unlock Your Interview Success!', time: '3h ago', cta: 'Practice Now' },
            { icon: <FiCheckCircle />, color: '#059669', bg: '#ECFDF5', title: 'Apply by 11:10 AM for a job posted by Infrrd', desc: 'Neo-AI Job Agent', time: '4h ago' },
            { icon: <FiX />, color: '#DC2626', bg: '#FEF2F2', title: 'Your application was not shortlisted', desc: 'Application History', time: '5h ago' },
            { icon: <FiZap />, color: '#7C3AED', bg: '#F5F3FF', title: 'AI wrote interview Q&A from your resume', desc: '✨ Personalized for you', time: '6h ago' },
          ].map((n, i) => (
            <div className="pd-notif-item" key={i}>
              <div className="pd-notif-icon" style={{ background: n.bg, color: n.color }}>{n.icon}</div>
              <div className="pd-notif-content">
                <div className="pd-notif-title">{n.title}</div>
                <div className="pd-notif-desc">{n.desc}</div>
                {n.cta && <button className="pd-notif-cta">{n.cta}</button>}
                <div className="pd-notif-time">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Jobs Modal ─── */}
      {showJobsModal && (
        <div className="pd-modal-overlay" onClick={() => setShowJobsModal(false)}>
          <div className="pd-modal-box" onClick={e => e.stopPropagation()}>
            <button className="pd-modal-close" onClick={() => setShowJobsModal(false)}><FiX size={22} /></button>
            <div className="pd-modal-scroll">
              <RecommendedJobs
                onBack={() => setShowJobsModal(false)}
                recommendedJobs={recommendedJobs}
                candidateProfile={candidateProfile}
              />
            </div>
          </div>
        </div>
      )}
      {/* ─── Early Access Modal ─── */}
      <EarlyAccessModal
        isOpen={showEarlyAccessModal}
        onClose={() => setShowEarlyAccessModal(false)}
        jobs={earlyAccess}
      />
      {/* ─── Apply Match Analytics Modal ─── */}
      {showApplyMatchModal && (() => {
        const appsWithScores = (recentApplications || []).filter(app => app && typeof app.matchScore === 'number');
        const hasRealScores = appsWithScores.length > 0;
        const getAvg = (field, fallback) => {
          if (!hasRealScores) return fallback;
          const sum = appsWithScores.reduce((acc, curr) => acc + (curr[field] ?? fallback), 0);
          return Math.round(sum / appsWithScores.length);
        };

        const totalApps = dashboardSummary?.totalApplications || recentApplications?.length || 49;
        const matchedAppsCount = hasRealScores
          ? appsWithScores.filter(app => app.matchScore >= 75).length
          : (dashboardSummary?.shortlisted || Math.max(1, Math.floor(totalApps * 0.35)));
        const matchRateRatio = totalApps > 0 ? (matchedAppsCount / totalApps) : 0;
        const matchRatePct = Math.round(matchRateRatio * 100);

        const userExp = candidateProfile?.totalExperience || '0.08 yr';
        const userExpNum = parseFloat(userExp) || 1;
        const expMatchPct = getAvg('experienceMatch', Math.min(98, Math.round(75 + (userExpNum * 5))));

        const userCity = candidateProfile?.currentCity || candidateProfile?.preferredLocations?.[0] || 'Dehradun';
        const locMatchPct = getAvg('locationMatch', candidateProfile?.currentCity ? 92 : 86);

        const userSkillsStr = candidateProfile?.skills?.length > 0 ? candidateProfile.skills.slice(0, 2).join(', ') : 'Ui/Ux, Redux…';
        const skillsMatchPct = getAvg('skillMatch', candidateProfile?.skills?.length > 0 ? Math.min(95, 50 + candidateProfile.skills.length * 8) : 37);

        const userIndustry = candidateProfile?.currentCompany ? 'IT Services' : 'Tech & Software';
        const industryMatchPct = getAvg('roleMatch', candidateProfile?.currentCompany ? 82 : 57);

        const userDept = candidateProfile?.currentTitle || 'Engineering';
        const deptMatchPct = getAvg('roleMatch', candidateProfile?.currentTitle ? 88 : 67);

        const earlyAppVal = 'Fresh jobs';
        const earlyAppPct = 74;

        const dimensions = [
          { title: 'Work Experience Match', desc: `Your experience (${userExp}) aligns with ${expMatchPct}% of applied role requirements. E.g. senior roles require 3+ years.`, tip: 'Tip: Add recent freelance projects to boost score', pct: expMatchPct },
          { title: 'Location Compatibility', desc: `Based in ${userCity}. Matches ${locMatchPct}% of employer site preferences (On-Site/Hybrid).`, tip: 'Tip: Update preferred locations in profile settings', pct: locMatchPct },
          { title: 'Key Skills Alignment', desc: `Top skills (${userSkillsStr}) match ${skillsMatchPct}% of JD keywords. Missing 2 core requirements.`, tip: 'Tip: Add 3 more core skills from recent JDs', pct: skillsMatchPct },
          { title: 'Industry Relevance', desc: `Background in ${userIndustry} gives you an ${industryMatchPct}% advantage over cross-industry applicants.`, tip: 'Tip: Highlight industry-specific achievements', pct: industryMatchPct },
          { title: 'Department Fit', desc: `Title (${userDept}) matches ${deptMatchPct}% of target department hierarchies perfectly.`, tip: 'Tip: Use standard industry job titles', pct: deptMatchPct },
          { title: 'Early Applicant Advantage', desc: `Applying within first 48 hours (${earlyAppVal}) puts you in the top ${earlyAppPct}% of candidate visibility.`, tip: 'Tip: Turn on instant job match alerts', pct: earlyAppPct }
        ];

        const appsList = recentApplications?.length > 0 ? recentApplications : [
          { companyName: 'Finvin Advisor', jobTitle: 'Process Coordinator', status: 'SHORTLISTED', matchScore: 92 },
          { companyName: 'Ignitefortune Tech', jobTitle: 'Java Developer', status: 'APPLIED', matchScore: 84 },
          { companyName: 'Siana International', jobTitle: 'Sales Coordinator', status: 'INTERVIEW', matchScore: 88 },
          { companyName: 'Jugla Technologies', jobTitle: 'Java Developer', status: 'APPLIED', matchScore: 78 }
        ];

        return (
          <div className="pam-overlay" onClick={() => setShowApplyMatchModal(false)}>
            <div className="pam-content" onClick={e => e.stopPropagation()}>
              <div className="pam-header">
                <div className="pam-title-area">
                  <h2>Application Match Analytics</h2>
                  <p>Real-time telemetry and compatibility breakdown for your recent job applications</p>
                </div>
                <button className="pam-close-btn" onClick={() => setShowApplyMatchModal(false)}>
                  <FiX size={22} />
                </button>
              </div>

              <div className="pam-body">
                {/* Summary Grid */}
                <div className="pam-summary-grid">
                  <div className="pam-summary-card">
                    <span className="pam-summary-label">Total Applications</span>
                    <span className="pam-summary-val">{totalApps}</span>
                    <span className="pam-summary-sub">Last 7 Days Activity</span>
                  </div>
                  <div className="pam-summary-card">
                    <span className="pam-summary-label">High Match Applies</span>
                    <span className="pam-summary-val">{matchedAppsCount}</span>
                    <span className="pam-summary-sub">Exceeds 80% Threshold</span>
                  </div>
                  <div className="pam-summary-card">
                    <span className="pam-summary-label">Overall Match Rate</span>
                    <span className="pam-summary-val">{matchRatePct}%</span>
                    <span className="pam-summary-sub">+14% vs Platform Avg</span>
                  </div>
                  <div className="pam-summary-card">
                    <span className="pam-summary-label">Shortlist Probability</span>
                    <span className="pam-summary-val">{(matchRateRatio * 1.2 * 100).toFixed(0)}%</span>
                    <span className="pam-summary-sub">Based on AI Telemetry</span>
                  </div>
                </div>

                {/* Dimensions Grid */}
                <div>
                  <h3 className="pam-section-title">Match Breakdown by Dimension</h3>
                  <div className="pam-grid">
                    {dimensions.map((d, idx) => (
                      <div className="pam-dim-card" key={idx}>
                        <div className="pam-dim-info">
                          <h4>{d.title}</h4>
                          <p>{d.desc}</p>
                        </div>
                        <div className="pam-dim-tip">{d.tip}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Applications Table */}
                <div>
                  <h3 className="pam-section-title">Telemetry by Recent Application</h3>
                  <div className="pam-table-card">
                    <table className="pam-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Role</th>
                          <th>Match Score</th>
                          <th>Application Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appsList.map((app, idx) => {
                          const score = app.matchScore || Math.min(98, Math.max(65, Math.round(80 + (idx % 3) * 7 - idx * 2)));
                          const badgeClass = score >= 85 ? 'high' : score >= 75 ? 'med' : 'low';
                          return (
                            <tr key={idx}>
                              <td><strong>{app.companyName || app.company?.name || 'Enterprise Partner'}</strong></td>
                              <td>{app.jobTitle || app.job?.title || 'Senior Engineer'}</td>
                              <td><span className={`pam-badge ${badgeClass}`}>{score}% Match</span></td>
                              <td><span className="pam-status">{app.status || 'APPLIED'}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ─── Know More Modal ─── */}
      {showKnowMoreModal && (
        <div className="km-modal-overlay" onClick={() => setShowKnowMoreModal(false)}>
          <div className="km-modal-box" onClick={e => e.stopPropagation()}>
            <div className="km-modal-glow" />
            <button className="km-modal-close" onClick={() => setShowKnowMoreModal(false)}><FiX size={20} /></button>

            <div className="km-modal-content">
              <div className="km-modal-left">
                <div className="km-sticky-top">
                  <div className="km-eyebrow">RECRUITER SPOTLIGHT</div>
                  <h2 className="km-title">Stand out to the <span>Top 1%</span> of recruiters</h2>
                  <p className="km-subtitle">Highlight your application and get noticed by top recruiters instantly with our priority matching engine.</p>
                </div>

                <div className="km-features-list">
                  {[
                    { icon: <FiTrendingUp />, title: 'Priority Ranking', desc: 'Your application appears at the top of the recruiter\'s list for every job you apply.' },
                    { icon: <FiCheckCircle />, title: 'Verified Badge', desc: 'Get a distinct "Verified Premium" badge on your profile to build instant trust.' },
                    { icon: <FiZap />, title: 'AI-Enhanced Pitch', desc: 'Our AI crafts the perfect elevator pitch for each application based on your profile.' },
                    { icon: <FiSend />, title: 'Direct Messaging', desc: 'Unlock the ability to message hiring managers directly before they even see your resume.' },
                    { icon: <FiAward />, title: 'Profile Boost', desc: 'Get up to 4x more visibility in recruiter search results compared to standard members.' },
                    { icon: <FiEye />, title: 'Advanced Analytics', desc: 'See exactly who viewed your profile and which companies are interested in your skills.' }
                  ].map((f, i) => (
                    <div key={i} className="km-feat-item">
                      <div className="km-feat-icon">{f.icon}</div>
                      <div className="km-feat-text">
                        <h4>{f.title}</h4>
                        <p>{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="km-modal-actions-fixed">
                  <button className="km-btn-premium" onClick={() => navigate('/pro')}>Upgrade to Pro Member</button>
                  <button className="km-btn-ghost" onClick={() => setShowKnowMoreModal(false)}>Maybe Later</button>
                </div>
              </div>

              <div className="km-modal-right">
                <div className="km-insights-scroll">
                  <div className="km-insight-header">PERFORMANCE INSIGHTS</div>

                  {/* Rohan Profile Card */}
                  <div className="km-visual-card">
                    <div className="km-user-mini">
                      <img src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"} alt="" />
                      <div>
                        <div className="km-mini-name">{user.name} <FiCheckCircle size={10} color="#10b981" /></div>
                        <div className="km-mini-role">{user.headline || 'MERN Stack Developer'}</div>
                      </div>
                      <span className="km-mini-tag">TOP MATCH</span>
                    </div>
                    <div className="km-visual-stats">
                      <div className="km-vstat"><strong>{dashboardSummary.totalApplications || 0}</strong><span>Applications</span></div>
                      <div className="km-vstat"><strong>{dashboardSummary.shortlisted || 0}</strong><span>Shortlisted</span></div>
                    </div>
                    <div className="km-visual-graph">
                      {(() => {
                        const total = dashboardSummary.totalApplications || 0;
                        const shortlisted = dashboardSummary.shortlisted || 0;
                        const interviews = dashboardSummary.interviews || 0;
                        const companies = dashboardSummary.companiesApplied || 0;
                        const profilePct = user?.profileCompletion || 0;
                        const clamp = (v, min = 8, max = 100) => Math.min(Math.max(v, min), max);
                        const barHeights = [
                          clamp(profilePct * 0.9),                                          // Profile strength
                          clamp(companies > 0 ? Math.min(companies * 18, 90) : 12),         // Companies reached
                          clamp(total > 0 ? Math.min(total * 6, 88) : 10),                  // Applications sent
                          clamp(total > 0 ? (shortlisted / total) * 110 : 15),              // Shortlist rate
                          clamp(total > 0 ? (interviews / Math.max(total, 1)) * 150 : 10),  // Interview rate
                          clamp((shortlisted + interviews) > 0 ? Math.min((shortlisted + interviews) * 12, 100) : 8), // Overall success
                        ];
                        return barHeights.map((h, i) => (
                          <div key={i} className="km-graph-bar" style={{ height: `${h}%`, opacity: i === barHeights.indexOf(Math.max(...barHeights)) ? 1 : 0.7 }} />
                        ));
                      })()}
                    </div>
                    <p className="km-visual-label">Recruiter Interest Funnel</p>
                  </div>

                  {/* Job Application Stats */}
                  <div className="km-stat-card">
                    <div className="km-sc-header">
                      <FiBriefcase color="#10b981" />
                      <span>Applications Sent</span>
                      <strong className="km-sc-val">{dashboardSummary.totalApplications || 0}</strong>
                    </div>
                    <div className="km-mini-trend">
                      <div className="km-mt-bar" style={{ width: `${Math.min((dashboardSummary.shortlisted / Math.max(dashboardSummary.totalApplications, 1)) * 100 * 0.5, 100)}%` }} />
                      <div className="km-mt-bar active" style={{ width: `${Math.min((dashboardSummary.shortlisted / Math.max(dashboardSummary.totalApplications, 1)) * 100, 100)}%` }} />
                      <div className="km-mt-bar" style={{ width: `${Math.min((dashboardSummary.interviews / Math.max(dashboardSummary.totalApplications, 1)) * 100, 100)}%` }} />
                    </div>
                    <p className="km-sc-sub">{dashboardSummary.companiesApplied || 0} companies applied to</p>
                  </div>

                  {/* Recruiter Actions */}
                  <div className="km-stat-card">
                    <div className="km-sc-header">
                      <FiUsers color="#3b82f6" />
                      <span>Shortlisted</span>
                      <strong className="km-sc-val">{dashboardSummary.shortlisted || 0}</strong>
                    </div>
                    <div className="km-shortlist-circles">
                      {[1, 2, 3, 4, 5].map(i => {
                        const total = dashboardSummary.totalApplications || 1;
                        const rate = (dashboardSummary.shortlisted / total) * 5;
                        return <div key={i} className={`km-sc-dot ${i <= Math.round(rate) ? 'filled' : ''}`} />;
                      })}
                      <span className="km-sc-pct">{dashboardSummary.totalApplications > 0 ? Math.round((dashboardSummary.shortlisted / dashboardSummary.totalApplications) * 100) : 0}% Success Rate</span>
                    </div>
                  </div>

                  {/* New Insight: Interview Performance */}
                  <div className="km-stat-card dark">
                    <div className="km-sc-header">
                      <FiTrendingUp color="#8b5cf6" />
                      <span>Interviews Reached</span>
                      <strong className="km-sc-val">{dashboardSummary.interviews || 0}</strong>
                    </div>
                    <div className="km-interview-graph">
                      {(() => {
                        const total = dashboardSummary.totalApplications || 0;
                        const shortlisted = dashboardSummary.shortlisted || 0;
                        const interviews = dashboardSummary.interviews || 0;
                        const companies = dashboardSummary.companiesApplied || 0;
                        const toY = (ratio) => Math.max(30 - ratio * 28, 2);
                        const pts = [
                          { x: 0,   y: 28 },
                          { x: 16,  y: toY(total > 0 ? 0.1 : 0) },
                          { x: 33,  y: toY(companies > 0 ? Math.min(companies / 10, 0.4) : 0.05) },
                          { x: 50,  y: toY(total > 0 ? Math.min(total / 30, 0.6) : 0.1) },
                          { x: 66,  y: toY(shortlisted > 0 ? Math.min(shortlisted / Math.max(total, 1), 0.75) : 0.15) },
                          { x: 83,  y: toY(interviews > 0 ? Math.min(interviews / Math.max(total, 1) * 3, 0.9) : 0.2) },
                          { x: 100, y: toY(interviews > 0 ? 0.7 : 0.15) },
                        ];
                        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                        const peak = pts.reduce((a, b) => b.y < a.y ? b : a);
                        return (
                          <svg viewBox="0 0 100 30">
                            <defs>
                              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <path d={`${d} L100,30 L0,30 Z`} fill="url(#lineGrad)" />
                            <path d={d} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={peak.x} cy={peak.y} r="3" fill="#8b5cf6" />
                          </svg>
                        );
                      })()}
                    </div>
                    <p className="km-sc-sub">{dashboardSummary.interviews > 0 ? `${dashboardSummary.interviews} live interview${dashboardSummary.interviews > 1 ? 's' : ''} in progress` : 'No interviews yet — keep applying!'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .km-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px); z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: kmFadeIn 0.3s ease;
        }
        @keyframes kmFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .km-modal-box {
          background: #0a0f18; width: 100%; max-width: 920px;
          border-radius: 28px; position: relative; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
          animation: kmSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes kmSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .km-modal-glow {
          position: absolute; top: -100px; right: -100px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .km-modal-close {
          position: absolute; top: 24px; right: 24px;
          background: rgba(255,255,255,0.05); border: none;
          color: rgba(255,255,255,0.6); width: 40px; height: 40px;
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; cursor: pointer; transition: all 0.2s;
          z-index: 10;
        }
        .km-modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; transform: rotate(90deg); }

        .km-modal-content { display: flex; height: 620px; overflow: hidden; }
        
        /* Left Column Scrolling */
        .km-modal-left { 
          flex: 1.2; 
          display: flex; flex-direction: column;
          position: relative;
        }
        .km-sticky-top {
          padding: 56px 56px 24px;
          background: #0a0f18;
          z-index: 5;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .km-features-list {
          flex: 1;
          overflow-y: auto;
          padding: 32px 56px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .km-features-list::-webkit-scrollbar { width: 4px; }
        .km-features-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .km-modal-actions-fixed {
          padding: 24px 56px 40px;
          background: #0a0f18;
          display: flex; gap: 16px; align-items: center;
          border-top: 1px solid rgba(255,255,255,0.03);
        }

        /* Right Column Scrolling */
        .km-modal-right { 
          flex: 0.8; 
          background: rgba(255,255,255,0.015); 
          border-left: 1px solid rgba(255,255,255,0.05); 
          overflow-y: auto;
          scrollbar-width: none;
        }
        .km-modal-right::-webkit-scrollbar { display: none; }
        
        .km-insights-scroll {
          padding: 56px 40px;
          display: flex; flex-direction: column; gap: 24px;
        }
        .km-insight-header {
          font-size: 10px; color: rgba(255,255,255,0.3); font-weight: 800;
          letter-spacing: 0.15em; margin-bottom: 8px;
        }

        .km-eyebrow { color: #10b981; font-weight: 800; font-size: 11px; letter-spacing: 0.2em; margin-bottom: 16px; }
        .km-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 34px; color: #fff; line-height: 1.1; margin-bottom: 16px; }
        .km-title span { color: #10b981; }
        .km-subtitle { color: rgba(255,255,255,0.5); font-size: 15px; line-height: 1.6; }

        .km-feat-item { display: flex; gap: 16px; margin-bottom: 28px; }
        .km-feat-item:last-child { margin-bottom: 0; }
        .km-feat-icon { width: 36px; height: 36px; background: rgba(16,185,129,0.1); border-radius: 10px; color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .km-feat-text h4 { color: #fff; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .km-feat-text p { color: rgba(255,255,255,0.4); font-size: 12px; line-height: 1.5; }

        .km-btn-premium { background: #10b981; color: #fff; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .km-btn-premium:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(16,185,129,0.2); }
        .km-btn-ghost { background: transparent; color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .km-btn-ghost:hover { background: rgba(255,255,255,0.05); color: #fff; }

        .km-visual-card {
          background: #111827; width: 100%; border-radius: 20px;
          padding: 24px; border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .km-user-mini { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .km-user-mini img { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 2px solid #10b981; }
        .km-mini-name { color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 4px; }
        .km-mini-role { color: rgba(255,255,255,0.4); font-size: 11px; }
        .km-mini-tag { margin-left: auto; background: rgba(16,185,129,0.1); color: #10b981; font-size: 9px; font-weight: 800; padding: 4px 8px; border-radius: 4px; }

        .km-visual-stats { display: flex; gap: 20px; margin-bottom: 24px; }
        .km-vstat { flex: 1; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; }
        .km-vstat strong { display: block; color: #10b981; font-size: 20px; margin-bottom: 2px; }
        .km-vstat span { color: rgba(255,255,255,0.3); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }

        .km-visual-graph { display: flex; align-items: flex-end; gap: 6px; height: 80px; margin-bottom: 12px; }
        .km-graph-bar { flex: 1; background: linear-gradient(to top, #10b981, #6ee7b7); border-radius: 4px 4px 0 0; opacity: 0.6; }
        .km-graph-bar:last-child { opacity: 1; box-shadow: 0 0 15px rgba(16,185,129,0.4); }
        .km-visual-label { text-align: center; color: rgba(255,255,255,0.3); font-size: 10px; font-style: italic; }

        /* Performance Stat Cards */
        .km-stat-card {
          background: rgba(255,255,255,0.03); border-radius: 20px;
          padding: 20px; border: 1px solid rgba(255,255,255,0.05);
        }
        .km-stat-card.dark { background: #000; border-color: rgba(139, 92, 246, 0.2); }
        .km-sc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .km-sc-header span { flex: 1; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; }
        .km-sc-val { color: #fff; font-size: 18px; font-weight: 800; }
        .km-sc-sub { color: rgba(255,255,255,0.3); font-size: 11px; margin-top: 12px; }

        .km-mini-trend { display: flex; gap: 4px; height: 20px; align-items: flex-end; }
        .km-mt-bar { background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; }
        .km-mt-bar.active { background: #10b981; height: 18px; }

        .km-shortlist-circles { display: flex; align-items: center; gap: 8px; }
        .km-sc-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.1); }
        .km-sc-dot.filled { background: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
        .km-sc-pct { color: #3b82f6; font-size: 11px; font-weight: 700; margin-left: 8px; }

        .km-interview-graph { height: 30px; margin-top: 8px; }

        @media (max-width: 850px) {
          .km-modal-content { flex-direction: column; }
          .km-modal-right { display: none; }
          .km-features-grid { grid-template-columns: 1fr; gap: 20px; }
          .km-modal-left { padding: 40px; }
        }

        /* Dynamic Skills Styles */
        .pd-skill-add-row {
          display: flex; gap: 8px; margin-bottom: 16px;
          animation: kmFadeIn 0.2s ease;
        }
        .pd-skill-add-row input {
          flex: 1; background: #f8fafc; border: 1px solid #e2e8f0;
          padding: 8px 12px; border-radius: 8px; font-size: 13px;
          outline: none; transition: border-color 0.2s;
        }
        .pd-skill-add-row input:focus { border-color: #2563eb; }
        .pd-skill-add-row button {
          background: #2563eb; color: #fff; border: none;
          padding: 0 10px; border-radius: 8px; cursor: pointer;
          transition: background 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .pd-skill-add-row button:hover { background: #1d4ed8; }

        .pd-skill-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: #eff6ff; color: #1e40af; padding: 6px 12px;
          border-radius: 100px; font-size: 13px; font-weight: 500;
          transition: all 0.2s; border: 1px solid transparent;
        }
        .pd-skill-pill:hover { border-color: rgba(30, 64, 175, 0.2); background: #e0e7ff; }

        .pd-skill-remove {
          background: rgba(30, 64, 175, 0.1); border: none;
          color: #1e40af; width: 16px; height: 16px;
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; cursor: pointer; transition: all 0.2s;
          padding: 0; margin-right: -4px;
        }
        .pd-skill-remove:hover { background: #1e40af; color: #fff; transform: scale(1.1); }

        .pd-no-skills { color: #94a3b8; font-size: 12px; font-style: italic; margin-top: 4px; }

        /* Completion Modal Styles */
        .cm-modal-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px); z-index: 20000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: kmFadeIn 0.3s ease;
        }
        .cm-modal-box {
          background: #ffffff; width: 100%; max-width: 540px;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: kmSlideUp 0.3s ease;
        }
        .cm-modal-header {
          padding: 24px 32px; border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; justify-content: space-between;
          background: #fff;
        }
        .cm-modal-header h3 { color: #0f172a; font-size: 18px; font-weight: 800; }
        .cm-modal-close {
          background: transparent; border: none; color: #64748b;
          cursor: pointer; transition: color 0.2s; display: flex;
        }
        .cm-modal-close:hover { color: #0f172a; }

        .cm-modal-body { padding: 32px; max-height: 70vh; overflow-y: auto; }
        
        .cm-form-group { margin-bottom: 20px; }
        .cm-form-group label { display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .cm-form-group input, .cm-form-group textarea {
          width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0;
          border-radius: 12px; font-size: 14px; transition: all 0.2s; outline: none;
        }
        .cm-form-group input:focus, .cm-form-group textarea:focus {
          border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        .cm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .cm-helper-text { color: #64748b; font-size: 13px; margin-bottom: 24px; }
        .cm-summary-area { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px; outline: none; resize: none; font-size: 14px; line-height: 1.6; }
        .cm-summary-area:focus { border-color: #10b981; }

        .cm-skill-input-wrap { display: flex; gap: 12px; margin-bottom: 24px; }
        .cm-skill-input-wrap input { flex: 1; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; outline: none; }
        .cm-add-btn { background: #0f172a; color: #fff; border: none; padding: 0 20px; border-radius: 12px; font-weight: 700; cursor: pointer; }

        .cm-skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .cm-skill-chip {
          background: #f1f5f9; color: #0f172a; padding: 6px 14px;
          border-radius: 100px; font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
        }
        .cm-skill-chip svg { cursor: pointer; color: #94a3b8; transition: color 0.2s; }
        .cm-skill-chip svg:hover { color: #ef4444; }

        .cm-modal-footer {
          padding: 24px 32px; background: #f8fafc;
          display: flex; justify-content: flex-end; gap: 12px;
        }
        .cm-btn-cancel { background: transparent; border: none; color: #64748b; font-weight: 700; cursor: pointer; padding: 10px 20px; }
        .cm-btn-save { background: #10b981; color: #fff; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .cm-btn-save:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }

        /* Strictly Professional Circular Checkbox */
        .cm-checkbox-group { margin: 12px 0 24px; }
        .cm-checkbox-label {
          display: inline-flex; align-items: center; gap: 10px;
          cursor: pointer; font-size: 14px; color: #475569; font-weight: 700;
          user-select: none; white-space: nowrap; transition: all 0.2s;
        }
        .cm-checkbox-label input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
        .cm-checkbox-box {
          width: 16px; height: 16px; border: 2px solid #cbd5e1;
          border-radius: 50%; background: #fff; position: relative;
          flex-shrink: 0; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; align-items: center; justify-content: center;
        }
        .cm-checkbox-label input:checked ~ .cm-checkbox-box {
          background: #10b981; border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        .cm-checkbox-box::after {
          content: ""; position: absolute; display: none;
          width: 3px; height: 6.5px;
          border: solid white; border-width: 0 1.8px 1.8px 0;
          transform: rotate(45deg); margin-top: -1px;
        }
        .cm-checkbox-label input:checked ~ .cm-checkbox-box::after {
          display: block;
        }
        .cm-checkbox-label:hover .cm-checkbox-box {
          border-color: #10b981;
        }
      `}</style>
      {/* ─── Share Profile Modal ─── */}
      {showShareModal && (
        <div className="cm-modal-overlay" style={{ backdropFilter: 'blur(8px)', background: 'rgba(15, 23, 42, 0.4)' }} onClick={() => setShowShareModal(false)}>
          <div className="cm-modal-box" style={{ maxWidth: 540, padding: 0, borderRadius: 28, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header" style={{ borderBottom: 'none', padding: '32px 32px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: 'var(--fd)' }}>Share Profile</h3>
              <button className="cm-modal-close" style={{ background: '#f1f5f9', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', border: 'none' }} onClick={() => setShowShareModal(false)}>
                <FiX size={20} color="#64748b" />
              </button>
            </div>

            <div className="cm-modal-body" style={{ padding: '0 32px 36px' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px', fontWeight: 500 }}>Share your professional profile with your network or recruiters.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '36px' }}>
                {[
                  { name: 'WhatsApp', color: '#25D366', bg: '#ecfdf5', icon: <FaWhatsapp size={24} /> },
                  { name: 'LinkedIn', color: '#0A66C2', bg: '#eef2ff', icon: <FaLinkedinIn size={22} /> },
                  { name: 'X', color: '#000000', bg: '#f8fafc', icon: <FaXTwitter size={20} /> },
                  { name: 'Facebook', color: '#1877F2', bg: '#eff6ff', icon: <FaFacebookF size={20} /> },
                  { name: 'Email', color: '#EA4335', bg: '#fff1f2', icon: <FiMail size={22} /> }
                ].map(social => (
                  <div key={social.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', group: 'true' }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '20px', background: social.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: social.color, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid transparent'
                    }} onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                      e.currentTarget.style.boxShadow = `0 12px 20px -8px ${social.color}40`;
                      e.currentTarget.style.borderColor = `${social.color}20`;
                    }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                      {social.icon}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', fontFamily: 'var(--fd)' }}>{social.name}</span>
                  </div>
                ))}
              </div>

              <div style={{
                position: 'relative',
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '16px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }} onFocusCapture={e => e.currentTarget.style.borderColor = '#1e5eff'}>
                <div style={{ padding: '0 16px', color: '#94a3b8' }}>
                  <FiGlobe size={18} />
                </div>
                <input
                  type="text"
                  readOnly
                  value={profileLink}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    padding: '12px 0', outline: 'none', color: '#0f172a',
                    fontSize: '14px', fontWeight: 600, fontFamily: 'monospace'
                  }}
                />
                <button
                  style={{
                    background: linkCopied ? '#10b981' : '#1e5eff',
                    color: '#fff', border: 'none',
                    height: '44px',
                    padding: '0 24px', borderRadius: '12px', fontWeight: 800,
                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '14px', fontFamily: 'var(--fd)',
                    boxShadow: linkCopied ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 4px 12px rgba(30, 94, 255, 0.2)'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(`https://${profileLink}`);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? <><FiCheckCircle size={16} /> Copied</> : <><FiCopy size={16} /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Work Status Modal ─── */}
      {showWorkStatusModal && (
        <div className="cm-modal-overlay" onClick={() => setShowWorkStatusModal(false)}>
          <div className="cm-modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h3>Professional Status</h3>
              <button className="cm-modal-close" onClick={() => setShowWorkStatusModal(false)}><FiX size={20} /></button>
            </div>

            <div className="cm-modal-body" style={{ padding: '24px 32px' }}>
              <p className="cm-helper-text" style={{ marginBottom: 24, fontSize: '13.5px' }}>
                Let recruiters know your current availability to help them match you with the right opportunities.
              </p>

              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', border: `1.5px solid ${workStatus === 'Open to Work' ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: '14px', marginBottom: '16px', cursor: 'pointer',
                  background: workStatus === 'Open to Work' ? '#ecfdf5' : '#fff',
                  transition: 'all 0.2s', boxShadow: workStatus === 'Open to Work' ? '0 4px 12px rgba(16,185,129,0.1)' : 'none'
                }}
                onClick={() => setWorkStatus('Open to Work')}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', marginBottom: '4px' }}>Open to Work</div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Actively looking for new roles</div>
                </div>
                <div className="cm-checkbox-box" style={{
                  borderColor: workStatus === 'Open to Work' ? '#10b981' : '#cbd5e1',
                  background: workStatus === 'Open to Work' ? '#10b981' : '#fff',
                  width: 20, height: 20
                }}>
                  {workStatus === 'Open to Work' && <FiCheckCircle size={12} color="#fff" />}
                </div>
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', border: `1.5px solid ${workStatus === 'Working' ? '#1e5eff' : '#e2e8f0'}`,
                  borderRadius: '14px', cursor: 'pointer',
                  background: workStatus === 'Working' ? '#eef4ff' : '#fff',
                  transition: 'all 0.2s', boxShadow: workStatus === 'Working' ? '0 4px 12px rgba(30,94,255,0.1)' : 'none'
                }}
                onClick={() => setWorkStatus('Working')}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', marginBottom: '4px' }}>Working</div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Currently employed, not actively looking</div>
                </div>
                <div className="cm-checkbox-box" style={{
                  borderColor: workStatus === 'Working' ? '#1e5eff' : '#cbd5e1',
                  background: workStatus === 'Working' ? '#1e5eff' : '#fff',
                  width: 20, height: 20
                }}>
                  {workStatus === 'Working' && <FiCheckCircle size={12} color="#fff" />}
                </div>
              </div>
            </div>

            <div className="cm-modal-footer">
              <button className="cm-btn-cancel" onClick={() => setShowWorkStatusModal(false)}>Cancel</button>
              <button className="cm-btn-save" onClick={() => setShowWorkStatusModal(false)}>Save Status</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Profile Completion Modal ─── */}
      {activeTip && (
        <div className="cm-modal-overlay" onClick={() => setActiveTip(null)}>
          <div className="cm-modal-box" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h3>
                {activeTip === 'experience' && 'Add Work Experience'}
                {activeTip === 'summary' && 'Professional Summary'}
                {activeTip === 'skills' && 'Manage Core Skills'}
              </h3>
              <button className="cm-modal-close" onClick={() => setActiveTip(null)}><FiX size={20} /></button>
            </div>

            <div className="cm-modal-body">
              {activeTip === 'experience' && (
                <div className="cm-form">
                  <div className="cm-form-group">
                    <label>Job Title</label>
                    <input type="text" placeholder="e.g. Senior Software Engineer" />
                  </div>
                  <div className="cm-form-group">
                    <label>Company Name</label>
                    <input type="text" placeholder="e.g. Google India" />
                  </div>
                  <div className="cm-checkbox-group">
                    <label className="cm-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isCurrentlyWorking}
                        onChange={e => setIsCurrentlyWorking(e.target.checked)}
                      />
                      <span className="cm-checkbox-box" />
                      I am currently working in this role
                    </label>
                  </div>
                  <div className="cm-form-row">
                    <div className="cm-form-group">
                      <label>Start Date</label>
                      <input type="month" />
                    </div>
                    <div className="cm-form-group" style={{
                      opacity: isCurrentlyWorking ? 0.4 : 1,
                      filter: isCurrentlyWorking ? 'blur(1.5px)' : 'none',
                      pointerEvents: isCurrentlyWorking ? 'none' : 'auto',
                      transition: 'all 0.3s'
                    }}>
                      <label>End Date</label>
                      <input type="month" disabled={isCurrentlyWorking} />
                    </div>
                  </div>
                  <div className="cm-form-group">
                    <label>Description</label>
                    <textarea placeholder="Describe your key responsibilities and achievements..." rows={4} />
                  </div>
                </div>
              )}

              {activeTip === 'summary' && (
                <div className="cm-form">
                  <p className="cm-helper-text">Briefly highlight your expertise and what you bring to the table.</p>
                  <textarea
                    className="cm-summary-area"
                    placeholder="Results-driven professional with expertise in..."
                    rows={8}
                    autoFocus
                  />
                </div>
              )}

              {activeTip === 'skills' && (
                <div className="cm-skills-editor">
                  <p className="cm-helper-text">Add skills to get 40% better job recommendations.</p>
                  <div className="cm-skill-input-wrap">
                    <input
                      type="text"
                      placeholder="Add a skill (e.g. Python, Figma)..."
                      value={newSkillValue}
                      onChange={e => setNewSkillValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSkill()}
                    />
                    <button className="cm-add-btn" onClick={addSkill}>Add</button>
                  </div>
                  <div className="cm-skills-list">
                    {skills.map(s => (
                      <span key={s} className="cm-skill-chip">
                        {s} <FiX size={12} onClick={() => removeSkill(s)} />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="cm-modal-footer">
              <button className="cm-btn-cancel" onClick={() => setActiveTip(null)}>Cancel</button>
              <button className="cm-btn-save" onClick={() => setActiveTip(null)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      {/* ─── FAQ Modal ─── */}
      {showFAQModal && (
        <div className="pd-modal-overlay" onClick={() => setShowFAQModal(false)}>
          <div
            className="pd-modal-box faq-modal-v2"
            onClick={e => e.stopPropagation()}
          >
            {/* ── internal styles ── */}
            <style>{`
        .faq-modal-v2 {
          width: 820px !important;
          max-width: 95vw;
          max-height: 90vh;
          border-radius: 24px !important;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 0 !important;
          background: #f8fafc;
          box-shadow: 0 32px 80px rgba(0,0,0,.22);
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── close btn ── */
        .faq-close-btn {
          position: absolute;
          top: 18px; right: 18px;
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,.15);
          border: 1px solid rgba(255,255,255,.2);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all .2s;
        }
        .faq-close-btn:hover { background: rgba(255,255,255,.25); }

        /* ── scroll container ── */
        .faq-scroll-container {
          overflow-y: auto;
          flex: 1;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .faq-scroll-container::-webkit-scrollbar { width: 5px; }
        .faq-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        /* ── HERO ── */
        .faq-hero {
          background: linear-gradient(135deg, #050e24 0%, #002366 60%, #1a0a4a 100%);
          padding: 44px 40px 36px;
          position: relative;
          overflow: hidden;
        }
        .faq-hero-dots {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px);
          background-size: 22px 22px; pointer-events: none;
        }
        .faq-hero-glow {
          position: absolute; top: -40%; right: -10%;
          width: 360px; height: 360px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,.3) 0%, transparent 65%);
          pointer-events: none;
        }
        .faq-hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.28);
          color: #6ee7b7; font-size: 10px; font-weight: 800;
          letter-spacing: .18em; text-transform: uppercase;
          padding: 5px 14px; border-radius: 100px; margin-bottom: 14px;
          font-family: 'Bricolage Grotesque', sans-serif;
          position: relative; z-index: 1;
        }
        .faq-hero h1 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 28px; font-weight: 800;
          color: #fff; line-height: 1.1;
          letter-spacing: -0.03em; margin-bottom: 6px;
          position: relative; z-index: 1;
        }
        .faq-hero h1 span { color: #10b981; }
        .faq-hero-sub {
          font-size: 13px; color: rgba(255,255,255,.5);
          margin-bottom: 24px; position: relative; z-index: 1;
        }

        /* search */
        .faq-search-wrap {
          display: flex; align-items: center;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          width: 100%;
          max-width: 580px;
          margin: 0 auto;
          backdrop-filter: blur(20px);
          position: relative; z-index: 1;
          transition: all 0.3s ease;
          padding: 5px 5px 5px 22px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .faq-search-wrap:focus-within {
          border-color: #10b981;
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 12px 40px -10px rgba(0,0,0,0.6), 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        .faq-search-icon {
          color: rgba(255, 255, 255, 0.4);
          display: flex; align-items: center;
          flex-shrink: 0; margin-right: 14px;
        }
        .faq-search-wrap input {
          flex: 1; min-width: 0; background: none; border: none; outline: none;
          font-size: 15px; font-weight: 500;
          color: #fff; padding: 12px 0;
          font-family: 'DM Sans', sans-serif;
        }
        .faq-search-wrap input::placeholder { color: rgba(255,255,255,.35); }
        .faq-search-btn {
          height: 46px; padding: 0 28px;
          background: #10b981; color: #fff;
          border: none; border-radius: 100px;
          font-size: 14px; font-weight: 800;
          cursor: pointer; font-family: 'Bricolage Grotesque', sans-serif;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .faq-search-btn:hover {
          background: #0da371;
          transform: translateX(2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        .faq-search-btn:active {
          transform: translateX(0) scale(0.98);
        }

        /* ── BODY PADDING ── */
        .faq-body { padding: 32px 40px 40px; }

        /* ── QUICK SOLUTIONS ── */
        .faq-section-label {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 10px; font-weight: 800;
          letter-spacing: .2em; text-transform: uppercase;
          color: #002366; margin-bottom: 16px;
        }
        .faq-section-label::after {
          content: ''; flex: 1; height: 2px;
          background: linear-gradient(90deg, #002366, #10b981 40%, transparent);
          border-radius: 2px;
        }
        .faq-section-icon {
          width: 26px; height: 26px; border-radius: 8px;
          background: #EEF2FF;
          display: flex; align-items: center; justify-content: center;
          color: #002366; flex-shrink: 0;
        }
        .faq-quick-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: 32px;
        }
        .faq-quick-card {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px 16px;
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 13px; cursor: pointer;
          transition: all .2s;
        }
        .faq-quick-card:hover {
          border-color: rgba(0,35,102,.2);
          box-shadow: 0 6px 20px rgba(0,35,102,.07);
          transform: translateY(-2px);
        }
        .faq-q-prefix {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 13px; font-weight: 800;
          color: #10b981; flex-shrink: 0; line-height: 1.5;
        }
        .faq-quick-card p {
          font-size: 12.5px; color: #334155;
          line-height: 1.55; font-weight: 500; margin: 0;
        }

        /* ── FAQ ACCORDION ── */
        .faq-accordion { margin-bottom: 32px; }
        .faq-acc-item {
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 13px; margin-bottom: 8px;
          overflow: hidden; transition: border-color .2s;
        }
        .faq-acc-item.open { border-color: rgba(0,35,102,.2); }
        .faq-acc-header {
          display: flex; align-items: center; gap: 12px;
          padding: 15px 18px; cursor: pointer;
          background: none; border: none; width: 100%;
          text-align: left;
        }
        .faq-acc-header:hover .faq-acc-q { color: #002366; }
        .faq-acc-num {
          width: 24px; height: 24px; border-radius: 7px;
          background: #f1f5f9;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; color: #64748b;
          flex-shrink: 0; transition: all .2s;
          font-family: 'Bricolage Grotesque', sans-serif;
        }
        .faq-acc-item.open .faq-acc-num {
          background: #002366; color: #fff;
        }
        .faq-acc-q {
          flex: 1; font-size: 13.5px; font-weight: 700;
          color: #0f172a; line-height: 1.4;
          transition: color .2s;
        }
        .faq-acc-chevron {
          color: #94a3b8; transition: transform .25s;
          display: flex; align-items: center;
          flex-shrink: 0;
        }
        .faq-acc-item.open .faq-acc-chevron { transform: rotate(180deg); color: #002366; }
        .faq-acc-body {
          padding: 0 18px 16px 54px;
          font-size: 13px; color: #475569;
          line-height: 1.75;
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
        }

        /* ── TOPICS ── */
        .faq-topic-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 10px; margin-bottom: 32px;
        }
        .faq-topic-card {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
          padding: 20px 12px;
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 14px; cursor: pointer;
          transition: all .25s; text-align: center;
        }
        .faq-topic-card:hover {
          border-color: rgba(0,35,102,.2);
          box-shadow: 0 8px 24px rgba(0,35,102,.07);
          transform: translateY(-3px);
        }
        .faq-topic-icon {
          width: 44px; height: 44px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          transition: all .25s;
        }
        .faq-topic-card:hover .faq-topic-icon { transform: scale(1.08); }
        .faq-topic-label {
          font-size: 12px; font-weight: 700; color: #334155;
          font-family: 'Bricolage Grotesque', sans-serif;
        }

        /* ── BLOGS ── */
        .faq-blog-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 14px; margin-bottom: 32px;
        }
        .faq-blog-card {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 14px; overflow: hidden;
          cursor: pointer; transition: all .25s;
        }
        .faq-blog-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,35,102,.1);
          border-color: rgba(0,35,102,.15);
        }
        .faq-blog-img {
          width: 100%; height: 110px;
          object-fit: cover; display: block;
        }
        .faq-blog-info { padding: 14px 16px; }
        .faq-blog-tag {
          display: inline-flex; align-items: center;
          height: 18px; padding: 0 8px;
          border-radius: 4px; font-size: 9px; font-weight: 800;
          letter-spacing: .06em; text-transform: uppercase;
          background: #ecfdf5; color: #10b981;
          border: 1px solid rgba(16,185,129,.2);
          margin-bottom: 7px;
        }
        .faq-blog-info h4 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 13.5px; font-weight: 800;
          color: #0f172a; margin-bottom: 6px; line-height: 1.3;
        }
        .faq-blog-info p {
          font-size: 11.5px; color: #64748b; line-height: 1.6; margin: 0;
        }
        .faq-blog-read {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 700; color: #002366;
          margin-top: 10px;
        }

        /* ── SUPPORT ── */
        .faq-support {
          display: grid; grid-template-columns: 1fr 1.6fr;
          gap: 24px; background: #fff;
          border: 1.5px solid #e2e8f0; border-radius: 20px;
          padding: 28px; overflow: hidden; position: relative;
        }
        .faq-support::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #002366, #10b981);
        }
        .support-left { padding-right: 16px; border-right: 1px solid #f1f5f9; }
        .support-brand {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 14px; font-weight: 800; color: #002366;
          margin-bottom: 16px;
        }
        .support-brand-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: #EEF2FF;
          display: flex; align-items: center; justify-content: center;
          color: #002366;
        }
        .support-info-item {
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 12px;
        }
        .support-info-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: #f1f5f9;
          display: flex; align-items: center; justify-content: center;
          color: #64748b; flex-shrink: 0; margin-top: 1px;
        }
        .support-info-label {
          font-size: 9.5px; font-weight: 800;
          letter-spacing: .1em; text-transform: uppercase;
          color: #94a3b8; display: block; margin-bottom: 2px;
        }
        .support-info-val {
          font-size: 12.5px; font-weight: 600; color: #334155;
        }
        .support-hours {
          margin-top: 20px; padding: 12px 14px;
          background: #ecfdf5; border: 1px solid rgba(16,185,129,.2);
          border-radius: 10px;
        }
        .support-hours-label {
          font-size: 9px; font-weight: 800;
          letter-spacing: .12em; text-transform: uppercase;
          color: #10b981; margin-bottom: 4px; display: block;
        }
        .support-hours-val { font-size: 12px; font-weight: 700; color: #065f46; }

        /* form */
        .support-right h3 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 15px; font-weight: 800; color: #0f172a;
          margin-bottom: 14px; letter-spacing: -0.02em;
        }
        .support-form { display: flex; flex-direction: column; gap: 9px; }
        .support-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .sf-field {
          width: 100%; padding: 10px 13px;
          background: #f8fafc; border: 1.5px solid #e2e8f0;
          border-radius: 10px; outline: none;
          font-size: 12.5px; font-weight: 500; color: #0f172a;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .2s, background .2s;
        }
        .sf-field:focus { border-color: rgba(0,35,102,.3); background: #fff; }
        .sf-field::placeholder { color: #94a3b8; }
        .sf-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          cursor: pointer;
        }
        .sf-textarea { resize: none; line-height: 1.6; }
        .support-submit {
          padding: 11px 0;
          background: linear-gradient(90deg, #002366, #003da8);
          color: #fff; border: none; border-radius: 10px;
          font-size: 13px; font-weight: 800;
          cursor: pointer; font-family: 'Bricolage Grotesque', sans-serif;
          letter-spacing: .04em; transition: all .2s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }
        .support-submit:hover {
          background: linear-gradient(90deg, #001540, #002b7a);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,35,102,.3);
        }
      `}</style>

            {/* Close */}
            <button className="faq-close-btn" onClick={() => setShowFAQModal(false)}>
              <FiX size={18} />
            </button>

            <div className="faq-scroll-container">

              {/* ── HERO ── */}
              <div className="faq-hero">
                <div className="faq-hero-dots" />
                <div className="faq-hero-glow" />
                <div className="faq-hero-tag">
                  <FiZap size={10} fill="currentColor" /> Help Center
                </div>
                <h1>Hi, how can we <span>help you?</span></h1>
                <p className="faq-hero-sub">Search our knowledge base or browse topics below</p>
                <div className="faq-search-wrap">
                  <div className="faq-search-icon"><FiSearch size={15} /></div>
                  <input
                    type="text"
                    placeholder="Search for answers… e.g. 'update profile', 'apply to job'"
                  />
                  <button className="faq-search-btn">Search</button>
                </div>
              </div>

              <div className="faq-body">

                {/* ── QUICK SOLUTIONS ── */}
                <div className="faq-section-label">
                  <div className="faq-section-icon"><FiZap size={13} /></div>
                  Quick Solutions
                </div>
                <div className="faq-quick-grid">
                  {[
                    { q: "How do I deactivate or delete my MavenJobs account?", a: "To deactivate your account, go to Settings → Account → Danger Zone and click 'Deactivate Account'. This will hide your profile from all recruiters instantly." },
                    { q: "How can I update or edit my profile information?", a: "You can edit any section of your profile by clicking the 'Edit' icon in the Profile Dashboard or using the side-modal for specific sections like Headline, Skills, and Experience." },
                    { q: "How do I hide my profile from my current employer?", a: "Go to Settings → Privacy. Under 'Visibility Settings', you can search for and block specific companies or use 'Invisible Mode' to hide from all employers." },
                    { q: "Do I need to pay to apply for a job on MavenJobs?", a: "No, applying for jobs on MavenJobs is 100% free. We never charge candidates for applications. MavenPremiumX is an optional service for advanced career growth." },
                    { q: "How do I upload or update my resume?", a: "In the Profile Dashboard, scroll to the Resume section. You can upload a PDF/Doc file or use our Resume Builder to generate a professional resume instantly." },
                    { q: "Why am I not receiving job recommendations?", a: "Ensure your 'Key Skills' and 'Preferred Role' are up to date. Our AI matching engine uses these to recommend the most relevant opportunities to you." },
                  ].map((sol, i) => (
                    <div className="faq-quick-card" key={i} onClick={() => setShowQuickAnswer(sol)}>
                      <span className="faq-q-prefix">Q.</span>
                      <p>{sol.q}</p>
                    </div>
                  ))}
                </div>

                {/* ── FAQ ACCORDION ── */}
                <div className="faq-section-label" style={{ marginTop: 4 }}>
                  <div className="faq-section-icon"><FiInfo size={13} /></div>
                  Frequently Asked Questions
                </div>
                <div className="faq-accordion">
                  {[
                    {
                      q: "How do I create a MavenJobs account?",
                      a: "Visit mavenjobs.in and click 'Register'. Fill in your name, email, and password, then verify your email. Once verified, complete your profile with your experience, skills, and education to start receiving relevant job matches.",
                    },
                    {
                      q: "Can recruiters see my profile without my permission?",
                      a: "By default, your profile is visible to verified recruiters on MavenJobs. You can enable 'Privacy Mode' in Settings → Privacy to hide your profile from specific companies or all employers. Your current employer can be blocked individually.",
                    },
                    {
                      q: "How does MavenPremiumX improve my hiring chances?",
                      a: "MavenPremiumX positions your profile in front of India's top-tier recruiters hiring for roles above ₹30L CTC. Your profile gets priority placement, NChecked verification, and direct outreach via WhatsApp, email, and automated calls — giving you 3× more recruiter responses.",
                    },
                    {
                      q: "How do I track the status of my job applications?",
                      a: "Go to your dashboard and click 'Job Application Status'. You'll see all applications categorised by status: Applied, Application Sent, Resume Viewed, Recruiter Actions, and more. Each card shows recruiter activity and last-active timestamps.",
                    },
                    {
                      q: "What is an NChecked Profile and how do I get one?",
                      a: "An NChecked Profile means Maven's team has cross-verified 14+ critical details: your current CTC breakup, company duration, notice period, designation, location, and job-search intent. To get NChecked, go to Profile → Verification and submit your details for review. It typically takes 1–2 business days.",
                    },
                    {
                      q: "How do I reset or change my account password?",
                      a: "Go to Settings → Security → Change Password. Enter your current password, then set a new one. If you've forgotten your password, click 'Forgot Password' on the login page and follow the email link sent to your registered address.",
                    },
                  ].map((item, i) => (
                    <FaqItem key={i} index={i + 1} question={item.q} answer={item.a} />
                  ))}
                </div>

                {/* ── BROWSE BY TOPIC ── */}
                <div className="faq-section-label">
                  <div className="faq-section-icon"><FiLayers size={13} /></div>
                  Browse by Topic
                </div>
                <div className="faq-topic-grid">
                  {[
                    { icon: <FiUsers size={20} />, label: 'Create Profile', bg: '#EEF2FF', color: '#6366f1' },
                    { icon: <FiSearch size={20} />, label: 'Job Search', bg: '#ecfdf5', color: '#10b981' },
                    { icon: <FiCheckCircle size={20} />, label: 'Apply for Jobs', bg: '#fffbeb', color: '#f59e0b' },
                    { icon: <FiSettings size={20} />, label: 'Account Settings', bg: '#f0f9ff', color: '#0ea5e9' },
                    { icon: <FiShield size={20} />, label: 'Privacy & Safety', bg: '#fef2f2', color: '#ef4444' },
                    { icon: <FiAward size={20} />, label: 'PremiumX', bg: '#EEF2FF', color: '#002366' },
                  ].map((t, i) => (
                    <div className="faq-topic-card" key={i}>
                      <div className="faq-topic-icon" style={{ background: t.bg, color: t.color }}>
                        {t.icon}
                      </div>
                      <span className="faq-topic-label">{t.label}</span>
                    </div>
                  ))}
                </div>

                {/* ── BLOGS ── */}
                <div className="faq-section-label">
                  <div className="faq-section-icon"><FiBookOpen size={13} /></div>
                  Career Resources
                </div>
                <div className="faq-blog-grid">
                  {[
                    {
                      img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400",
                      tag: "Interview Tips",
                      title: "Ace Your Next Interview",
                      desc: "Proven strategies from top recruiters to help you stand out and land the offer.",
                    },
                    {
                      img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
                      tag: "Platform Guide",
                      title: "Getting the Most from MavenJobs",
                      desc: "A step-by-step walkthrough of every feature — from profile setup to PremiumX.",
                    },
                    {
                      img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400",
                      tag: "Career Growth",
                      title: "Negotiating a ₹30L+ Offer",
                      desc: "Expert advice on salary negotiation, counter-offers, and knowing your market worth.",
                    },
                  ].map((b, i) => (
                    <div className="faq-blog-card" key={i}>
                      <img className="faq-blog-img" src={b.img} alt={b.title} />
                      <div className="faq-blog-info">
                        <span className="faq-blog-tag">{b.tag}</span>
                        <h4>{b.title}</h4>
                        <p>{b.desc}</p>
                        <div className="faq-blog-read">Read Article <FiArrowRight size={12} /></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── CONTACT SUPPORT ── */}
                <div className="faq-section-label">
                  <div className="faq-section-icon"><FiMail size={13} /></div>
                  Contact Support
                </div>
                <div className="faq-support">
                  {/* Left */}
                  <div className="support-left">
                    <div className="support-brand">
                      <div className="support-brand-icon"><FiMail size={16} /></div>
                      MavenJobs Support
                    </div>
                    {[
                      { icon: <FiPhone size={13} />, label: 'Toll Free', val: '1800-102-5557' },
                      { icon: <FiMail size={13} />, label: 'Email', val: 'support@mavenjobs.com' },
                    ].map((s, i) => (
                      <div className="support-info-item" key={i}>
                        <div className="support-info-icon">{s.icon}</div>
                        <div>
                          <span className="support-info-label">{s.label}</span>
                          <div className="support-info-val">{s.val}</div>
                        </div>
                      </div>
                    ))}
                    <div className="support-hours">
                      <span className="support-hours-label">Working Hours</span>
                      <div className="support-hours-val">Mon – Sat · 9:30 AM to 6:30 PM IST</div>
                    </div>
                  </div>

                  {/* Right — form */}
                  <div className="support-right">
                    <h3>Report a Problem or Get Assistance</h3>
                    <div className="support-form">
                      <div className="support-form-row">
                        <input className="sf-field" type="text" placeholder="Your Full Name" />
                        <input className="sf-field" type="tel" placeholder="Contact Number" />
                      </div>
                      <input className="sf-field" type="email" placeholder="Registered Email Address" />
                      <select className="sf-field sf-select">
                        <option value="">Select Area of Concern</option>
                        <option>Profile Update</option>
                        <option>Subscription / PremiumX</option>
                        <option>Job Applications</option>
                        <option>Account & Login</option>
                        <option>Resume Upload</option>
                        <option>Recruiter Outreach</option>
                        <option>Other</option>
                      </select>
                      <textarea
                        className="sf-field sf-textarea"
                        placeholder="Describe your issue in detail…"
                        rows={3}
                      />
                      <button className="support-submit">
                        <FiSend size={14} /> Submit Request
                      </button>
                    </div>
                  </div>
                </div>

              </div>{/* /faq-body */}
            </div>{/* /scroll */}
          </div>
        </div>
      )}

      {/* ─── Settings Modal ─── */}
      {showSettingsModal && (
        <div className="pd-modal-overlay">
          <div className="pd-modal-box settings-modal">
            <button className="pd-modal-close" onClick={() => setShowSettingsModal(false)}><FiX size={22} /></button>
            <div className="settings-layout">
              <div className="settings-sidebar">
                <h3>Settings</h3>
                <div className="settings-nav">
                  <button className="settings-nav-item active"><FiUsers /> Account</button>
                  <button className="settings-nav-item"><FiLock /> Privacy</button>
                  <button className="settings-nav-item"><FiBell /> Notifications</button>
                </div>
              </div>
              <div className="settings-main">
                <div className="settings-section">
                  <h4>Account Settings</h4>
                  <div className="settings-field">
                    <label>Email Address</label>
                    <div className="settings-input-group">
                      <input type="text" value={user.email} readOnly />
                      <button className="settings-edit-btn">Change</button>
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>Phone Number</label>
                    <div className="settings-input-group">
                      <input type="text" value="8126977256" readOnly />
                      <button className="settings-edit-btn">Verify</button>
                    </div>
                  </div>
                  <div className="settings-divider" />
                  <div className="settings-danger-zone">
                    <h5>Danger Zone</h5>
                    <button className="settings-delete-btn"><FiTrash2 /> Deactivate Account</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Answer Modal ─── */}
      {showQuickAnswer && (
        <div className="pd-modal-overlay" onClick={() => setShowQuickAnswer(null)} style={{ zIndex: 3000 }}>
          <div className="pd-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '28px', borderRadius: '24px', background: '#fff', height: 'auto', minHeight: 'auto' }}>
            <button className="pd-modal-close" onClick={() => setShowQuickAnswer(null)}><FiX size={20} /></button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', background: '#ecfdf5', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10b981' }}>
                <FiZap size={28} />
              </div>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '18px', fontWeight: 800, color: '#002366', marginBottom: '12px', lineHeight: 1.3 }}>{showQuickAnswer.q}</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '24px', fontWeight: 500 }}>{showQuickAnswer.a}</p>
              <button
                className="cm-btn-save"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '14px' }}
                onClick={() => setShowQuickAnswer(null)}
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}