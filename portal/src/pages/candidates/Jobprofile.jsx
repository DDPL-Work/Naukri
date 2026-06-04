import React, { useState, useEffect } from 'react';
import {
  FiMapPin, FiBriefcase, FiUsers, FiStar, FiGlobe, FiCalendar,
  FiArrowLeft, FiHeart, FiShare2, FiExternalLink, FiSearch,
  FiChevronRight, FiClock, FiPlus, FiCheckCircle, FiInfo, FiSend,
  FiBookmark, FiArrowRight, FiBell, FiLogOut, FiBookOpen, FiActivity,
  FiTruck, FiX, FiAward, FiTrendingUp, FiZap
} from 'react-icons/fi';
import { FaRupeeSign, FaStar, FaRegStar } from 'react-icons/fa';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import authService from '../../services/authService';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';

const Jobprofile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [savedJobs, setSavedJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fallbackCoverImage = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200';

  const [company, setCompany] = useState({
    name: '', fullName: '', logo: '', bg: '#002366', accent: '#10b981',
    industry: '', type: '', size: '', founded: '', website: '',
    location: '', followers: '—', rating: 0, reviews: '0', reviewsList: [],
    coverImage: fallbackCoverImage,
    tags: [], about: '', departments: [], benefits: [], jobs: [],
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchCompany = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = user
          ? await authService.getCompanyDetail(id).catch(() => authService.getPublicCompanyDetail(id))
          : await authService.getPublicCompanyDetail(id);
        if (res?.success && res?.data) {
          const c = res.data.company;
          const jobs = res.data.jobs || [];

          // Build departments from jobs
          const deptMap = {};
          jobs.forEach(j => {
            const d = j.department || 'General';
            deptMap[d] = (deptMap[d] || 0) + 1;
          });
          const departments = Object.entries(deptMap).map(([name, openings]) => ({ name, openings }));

          setCompany({
            name: c.name || '',
            fullName: c.fullName || c.name || '',
            logo: c.logoUrl || c.logo || (c.name || 'M')[0].toUpperCase(),
            bg: c.color || '#002366',
            accent: '#10b981',
            industry: c.industry || 'General',
            type: c.type || 'Private',
            size: c.size || '10–50',
            founded: c.founded || '',
            website: c.website || '',
            location: c.locationFull || c.location || '',
            followers: '—',
            rating: 3.4,
            reviews: '—',
            reviewsList: res.data.reviews || [],
            coverImage: c.coverImageUrl || c.coverImage || fallbackCoverImage,
            tags: [c.type || 'Private', c.industry || 'Corporate'].filter(Boolean),
            about: c.about || `${c.name} is a leading company in the ${c.industry || 'technology'} industry, committed to excellence and innovation.`,
            mission: c.mission || '',
            vision: c.vision || '',
            whyJoinUs: c.whyJoinUs || [],
            activelyHiring: c.activelyHiring !== false,
            activeJobCount: c.activeJobCount || jobs.length,
            departments,
            benefits: [
              { name: 'Job / Soft Skill Training', count: 3, icon: <FiBookOpen size={24} />, color: '#4F46E5', bg: '#EEF2FF' },
              { name: 'Health Insurance', count: 2, icon: <FiActivity size={24} />, color: '#E11D48', bg: '#FFF1F2' },
              { name: 'Office Cab / Shuttle', count: 2, icon: <FiTruck size={24} />, color: '#7C3AED', bg: '#F5F3FF' },
            ],
            jobs: jobs.map(j => ({
              id: j.id,
              title: j.title,
              exp: j.experience || '0–3 Yrs',
              loc: j.location || c.location || '',
              posted: j.postedAt || 'Recently',
              salary: j.salary || 'Not disclosed',
              desc: j.summary || j.description || 'Join our team and work on exciting projects.',
              tags: j.skills?.length > 0 ? j.skills : ['General'],
              hasApplied: j.hasApplied || false,
            })),
          });
        }
      } catch (err) {
        console.error('Failed to fetch company:', err);
        setError('Failed to load company details');
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [id]);

  // Production ready saved jobs state
  useEffect(() => {
    try {
      const stored = localStorage.getItem('maven_saved_jobs');
      if (stored) {
        const parsed = JSON.parse(stored);
        const map = {};
        parsed.forEach(job => map[job.id || job._id] = true);
        setSavedJobs(map);
      }
    } catch (e) {
      console.error('Failed to parse saved jobs', e);
    }
  }, []);

  const toggleSave = (jobId) => {
    setSavedJobs(prev => {
      const next = { ...prev, [jobId]: !prev[jobId] };
      try {
        const stored = localStorage.getItem('maven_saved_jobs');
        let parsed = stored ? JSON.parse(stored) : [];
        if (next[jobId]) {
          // Find the full job object from company.jobs
          const jobData = company.jobs.find(j => j.id === jobId) || { id: jobId };
          // Don't add duplicate
          if (!parsed.some(j => j.id === jobId)) {
            parsed.push(jobData);
          }
        } else {
          parsed = parsed.filter(j => j.id !== jobId && j._id !== jobId);
        }
        localStorage.setItem('maven_saved_jobs', JSON.stringify(parsed));
      } catch (e) {
        console.error('Failed to update localStorage', e);
      }
      return next;
    });
  };

  const ratingBreakdown = [
    { label: 'Skill Development', val: 82 },
    { label: 'Work Satisfaction', val: 75 },
    { label: 'Career Growth', val: 68 },
    { label: 'Work–Life Balance', val: 72 },
  ];

  const ratingLabel = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];
  const isLogoUrl = String(company.logo || "").startsWith("http");

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EEF2F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>Loading company...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#EEF2F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#EF4444' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{error}</div>
          <button onClick={() => navigate('/companies')} style={{ padding: '10px 20px', borderRadius: 10, background: '#002366', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            Back to Companies
          </button>
        </div>
      </div>
    );
  }


  return (
    <div style={{ minHeight: '100vh', background: '#EEF2F9', fontFamily: "'DM Sans', sans-serif", color: '#0A1628' }}>

      {/* ─── Navbar ─────────────────────────────────────── */}
      <header style={{
        background: 'rgba(255,255,255,0.93)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 200,
        height: '68px', display: 'flex', alignItems: 'center'
      }}>
        <div style={{ maxWidth: 1320, width: '100%', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/" style={{ height: 34, display: 'flex', alignItems: 'center' }}>
            <img src={mavenLogo} alt="MavenJobs" style={{ height: '100%' }} />
          </Link>
          <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {['Jobs', 'Companies', 'Services'].map((item) => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '0.85rem', fontWeight: 700,
                  color: item === 'Companies' ? '#1E5EFF' : '#64748B',
                  background: item === 'Companies' ? '#EEF4FF' : 'transparent',
                  textDecoration: 'none', padding: '7px 14px',
                  borderRadius: 10, transition: 'all 0.18s',
                  letterSpacing: '-0.01em'
                }}
              >
                {item}
              </Link>
            ))}
          </nav>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{
              position: 'relative', width: 40, height: 40, borderRadius: 11,
              border: '1.5px solid #E2E8F0', background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748B', cursor: 'pointer'
            }}>
              <FiBell size={18} />
              <span style={{
                position: 'absolute', top: 8, right: 8,
                width: 7, height: 7, background: '#0DBF7B',
                borderRadius: '50%', border: '2px solid white'
              }} />
            </button>
            {user && (
              <>
                <Link to="/profile">
                  <img
                    src={user.profilePic || 'https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg'}
                    alt="User"
                    style={{ width: 40, height: 40, borderRadius: 11, border: '2px solid #1E5EFF', objectFit: 'cover', cursor: 'pointer' }}
                  />
                </Link>
                <button
                  onClick={logout}
                  style={{
                    width: 40, height: 40, border: '1.5px solid #E2E8F0',
                    borderRadius: 11, background: 'white', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#94A3B8', cursor: 'pointer'
                  }}
                  title="Logout"
                >
                  <FiLogOut size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* ─── Profile Card ─────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: 24, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 28, boxShadow: '0 4px 24px rgba(10,22,40,0.07)' }}>
          {/* Cover */}
          <div style={{ height: 220, position: 'relative', overflow: 'hidden', background: '#CBD5E1' }}>
            <img src={company.coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,35,102,0.15) 0%, rgba(0,35,102,0.55) 100%)' }} />
            <button
              onClick={() => navigate(-1)}
              style={{
                position: 'absolute', top: 20, left: 20,
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer'
              }}
            >
              <FiArrowLeft size={18} />
            </button>
            {/* Tags on cover */}
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
              {company.tags.map(tag => (
                <span key={tag} style={{
                  background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white', fontSize: '0.68rem', fontWeight: 700,
                  padding: '4px 10px', borderRadius: 20, letterSpacing: '0.04em'
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Logo + Info Row */}
          <div style={{ padding: '0 36px 32px', position: 'relative' }}>
            {/* Logo */}
            <div style={{
              position: 'absolute', top: -52,
              width: 104, height: 104,
              background: 'white', borderRadius: 22,
              border: '4px solid white',
              boxShadow: '0 8px 32px rgba(0,35,102,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: 18,
                background: company.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Sora', sans-serif", fontWeight: 900,
                fontSize: '2.6rem', color: 'white', letterSpacing: '-0.04em'
              }}>
                {isLogoUrl ? (
                  <img src={company.logo} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : company.logo}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, marginBottom: 24 }}>
              <button
                onClick={() => setIsFollowing(f => !f)}
                style={{
                  padding: '9px 22px', borderRadius: 11,
                  background: isFollowing ? '#E8FBF3' : '#002366',
                  color: isFollowing ? '#0DBF7B' : 'white',
                  border: isFollowing ? '1.5px solid #0DBF7B' : '1.5px solid #002366',
                  fontWeight: 800, fontSize: '0.85rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                  fontFamily: "'Sora', sans-serif", transition: 'all 0.18s'
                }}
              >
                {isFollowing ? <FiCheckCircle size={15} /> : <FiPlus size={15} />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>

              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '9px 22px', borderRadius: 11,
                  border: '1.5px solid #E2E8F0', background: 'white',
                  color: '#334155', fontWeight: 800, fontSize: '0.85rem',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7,
                  fontFamily: "'Sora', sans-serif", transition: 'all 0.18s'
                }}
              >
                <FiGlobe size={15} /> Website <FiExternalLink size={13} />
              </a>
              <button style={{
                width: 40, height: 40, borderRadius: 11,
                border: '1.5px solid #E2E8F0', background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94A3B8', cursor: 'pointer'
              }}>
                <FiShare2 size={16} />
              </button>
            </div>

            {/* Company Name & Meta */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.9rem', fontWeight: 800, color: '#0A1628', letterSpacing: '-0.04em' }}>
                  {company.name}
                </h1>
                <span style={{
                  background: '#E8FBF3', color: '#0DBF7B',
                  fontSize: '0.7rem', fontWeight: 800,
                  padding: '4px 10px', borderRadius: 7,
                  border: '1px solid #0DBF7B',
                  letterSpacing: '0.04em', textTransform: 'uppercase'
                }}>
                  Actively Hiring
                </span>
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B', marginBottom: 16 }}>
                {company.fullName} · {company.industry}
              </p>

              {/* Meta Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {[
                  { icon: <FiMapPin size={13} />, text: company.location },
                  { icon: <FiUsers size={13} />, text: `${company.size} employees` },
                  { icon: <FiCalendar size={13} />, text: `Founded ${company.founded}` },
                  { icon: <FiCheckCircle size={13} />, text: `${company.followers} followers`, highlight: true },
                ].map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: m.highlight ? '#EEF4FF' : '#F8FAFC',
                    border: `1px solid ${m.highlight ? '#CCDAFF' : '#E2E8F0'}`,
                    color: m.highlight ? '#1E5EFF' : '#64748B',
                    padding: '5px 12px', borderRadius: 8,
                    fontSize: '0.8rem', fontWeight: 700
                  }}>
                    {m.icon} {m.text}
                  </div>
                ))}
                {/* Rating pill */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#FFFBEB', border: '1px solid #FDE68A',
                  color: '#92400E', padding: '5px 12px', borderRadius: 8,
                  fontSize: '0.8rem', fontWeight: 800
                }}>
                  <FaStar size={11} color="#F59E0B" />
                  {company.rating} · {company.reviews} reviews
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderTop: '1px solid #F1F5F9', paddingTop: 0, marginTop: 4 }}>
              {['Overview', 'About', 'Jobs'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '16px 20px 14px',
                    background: 'none', border: 'none',
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '0.875rem', fontWeight: 800,
                    color: activeTab === tab ? '#002366' : '#94A3B8',
                    cursor: 'pointer', position: 'relative',
                    borderBottom: activeTab === tab ? '2.5px solid #002366' : '2.5px solid transparent',
                    transition: 'all 0.18s', marginBottom: -1,
                    letterSpacing: '-0.01em'
                  }}
                >
                  {tab}
                  {tab === 'Jobs' && (
                    <span style={{
                      marginLeft: 6, background: '#002366', color: 'white',
                      fontSize: '0.62rem', fontWeight: 800,
                      padding: '1px 6px', borderRadius: 20
                    }}>
                      {company.jobs.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Main Grid ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 308px', gap: 24, alignItems: 'start' }}>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'Overview' && (
              <>
                {/* About */}
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '28px 32px', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiInfo size={16} color="#1E5EFF" />
                    </div>
                    <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#0A1628' }}>
                      About {company.name}
                    </h3>
                  </div>
                  <p style={{ color: '#475569', lineHeight: 1.75, fontWeight: 500, fontSize: '0.9rem' }}>
                    {company.about}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                    {['Healthcare Planning', 'Hospital Architecture', 'MEP Design', 'Clinical Strategy', 'Operations Mgmt'].map(spec => (
                      <span key={spec} style={{
                        background: '#EEF4FF', color: '#1E5EFF',
                        fontSize: '0.72rem', fontWeight: 700,
                        padding: '5px 12px', borderRadius: 7,
                        border: '1px solid #CCDAFF'
                      }}>
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '28px 32px', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
                  <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#0A1628', marginBottom: 20 }}>
                    Employee Benefits
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {company.benefits.map(ben => (
                      <div key={ben.name} style={{
                        background: '#F8FAFC', border: '1px solid #E2E8F0',
                        borderRadius: 16, padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        textAlign: 'center', transition: 'all 0.22s', cursor: 'default'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,22,40,0.1)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#CCDAFF'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                      >
                        <div style={{
                          width: 52, height: 52, borderRadius: 14,
                          background: ben.bg, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: ben.color, marginBottom: 14
                        }}>
                          {ben.icon}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0A1628', lineHeight: 1.4, marginBottom: 6 }}>
                          {ben.name}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8' }}>
                          {ben.count} reviews
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Departments */}
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '28px 32px', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
                  <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#0A1628', marginBottom: 16 }}>
                    Hiring Departments
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {company.departments.map((dept, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px', borderRadius: 12,
                        background: '#F8FAFC', border: '1px solid #E2E8F0',
                        cursor: 'pointer', transition: 'all 0.18s'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#CCDAFF'; e.currentTarget.style.background = '#EEF4FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
                        onClick={() => setActiveTab('Jobs')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E5EFF' }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>{dept.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            background: '#EEF4FF', color: '#1E5EFF',
                            fontSize: '0.72rem', fontWeight: 800,
                            padding: '3px 10px', borderRadius: 6, border: '1px solid #CCDAFF'
                          }}>
                            {dept.openings} open
                          </span>
                          <FiChevronRight size={15} color="#94A3B8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── JOBS TAB ── */}
            {activeTab === 'Jobs' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#0A1628' }}>
                    Active Openings
                    <span style={{
                      marginLeft: 10, background: '#002366', color: 'white',
                      fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20
                    }}>
                      {company.jobs.length}
                    </span>
                  </h3>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10,
                    border: '1.5px solid #E2E8F0', background: 'white',
                    fontSize: '0.78rem', fontWeight: 700, color: '#64748B', cursor: 'pointer'
                  }}>
                    <FiSearch size={13} /> Search roles
                  </button>
                </div>

                {company.jobs.map(job => (
                  <div
                    key={job.id}
                    style={{
                      background: 'white', borderRadius: 20,
                      border: '1px solid #E2E8F0', padding: '24px 28px',
                      boxShadow: '0 2px 12px rgba(10,22,40,0.05)',
                      transition: 'all 0.22s', cursor: 'default', position: 'relative', overflow: 'hidden'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 36px rgba(10,22,40,0.11)'; e.currentTarget.style.borderColor = '#CCDAFF'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(10,22,40,0.05)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                        background: company.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Sora', sans-serif", fontWeight: 900, fontSize: '1.3rem',
                        color: 'white', boxShadow: '0 4px 12px rgba(0,35,102,0.25)'
                      }}>
                        {isLogoUrl ? (
                          <img src={company.logo} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : company.logo}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#0A1628', marginBottom: 5, letterSpacing: '-0.02em' }}>
                          {job.title}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>{company.name}</span>
                          <span style={{
                            background: '#F0FDF4', border: '1px solid #BBF7D0',
                            color: '#166534', fontSize: '0.68rem', fontWeight: 800,
                            padding: '2px 8px', borderRadius: 6,
                            display: 'flex', alignItems: 'center', gap: 3
                          }}>
                            <FaStar size={9} color="#16A34A" /> {company.rating}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                            ({company.reviews} reviews)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
                      {[
                        { icon: <FiBriefcase size={13} />, text: job.exp },
                        { icon: <FaRupeeSign size={11} />, text: job.salary },
                        { icon: <FiMapPin size={13} />, text: job.loc },
                        { icon: <FiClock size={13} />, text: job.posted },
                      ].map((m, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: '#F8FAFC', borderRadius: 9, padding: '7px 10px',
                          fontSize: '0.78rem', fontWeight: 700, color: '#475569',
                          border: '1px solid #F1F5F9'
                        }}>
                          <span style={{ color: '#94A3B8', flexShrink: 0 }}>{m.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.7, fontWeight: 500, marginBottom: 18 }}>
                      {job.desc}
                    </p>

                    {/* Tags + Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 16, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {job.tags.map(tag => (
                          <span key={tag} style={{
                            background: '#F8FAFC', border: '1px solid #E2E8F0',
                            color: '#64748B', fontSize: '0.7rem', fontWeight: 700,
                            padding: '4px 10px', borderRadius: 7, letterSpacing: '0.02em'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => toggleSave(job.id)}
                          style={{
                            width: 38, height: 38, borderRadius: 10,
                            border: '1.5px solid #E2E8F0', background: savedJobs[job.id] ? '#EEF4FF' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: savedJobs[job.id] ? '#1E5EFF' : '#94A3B8', cursor: 'pointer',
                            transition: 'all 0.18s'
                          }}
                        >
                          <FiBookmark size={15} style={{ fill: savedJobs[job.id] ? '#1E5EFF' : 'none' }} />
                        </button>
                        <button
                          onClick={() => navigate(`/job/${job.id}`)}
                          style={{
                            padding: '9px 20px', borderRadius: 10,
                            background: '#002366', color: 'white',
                            border: 'none', fontFamily: "'Sora', sans-serif",
                            fontWeight: 800, fontSize: '0.82rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                            boxShadow: '0 4px 14px rgba(0,35,102,0.25)',
                            transition: 'all 0.18s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#1E3A8A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#002366'; e.currentTarget.style.transform = 'none'; }}
                        >
                          Quick Apply <FiArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ── ABOUT TAB ── */}
            {activeTab === 'About' && (
              <>
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '28px 32px', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
                  <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#0A1628', marginBottom: 16 }}>
                    About {company.name}
                  </h3>
                  <p style={{ color: '#475569', lineHeight: 1.8, fontWeight: 500, fontSize: '0.9rem', marginBottom: 16 }}>
                    {company.about}
                  </p>
                  <p style={{ color: '#475569', lineHeight: 1.8, fontWeight: 500, fontSize: '0.9rem' }}>
                    Over the decades, Hosmac has successfully managed over 500+ projects across the globe, bringing together architectural excellence and medical operational efficiency. Our team consists of seasoned professionals dedicated to transforming healthcare delivery.
                  </p>
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #F1F5F9' }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                      Specialties
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['Healthcare Planning', 'Hospital Architecture', 'MEP Design', 'Clinical Strategy', 'Operations Management', 'Medical Equipment Planning'].map(spec => (
                        <span key={spec} style={{
                          background: '#EEF4FF', color: '#1E5EFF', fontSize: '0.75rem',
                          fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: '1px solid #CCDAFF'
                        }}>
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { icon: <FiGlobe size={20} />, title: 'Global Presence', desc: 'Headquartered in Mumbai with operational footprints in Middle East and Africa.', color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
                    { icon: <FiAward size={20} />, title: 'Quality Standards', desc: 'ISO 9001:2015 certified consulting firm ensuring top-tier medical excellence.', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                    { icon: <FiTrendingUp size={20} />, title: '500+ Projects', desc: 'Successfully delivered projects across healthcare infrastructure globally.', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                    { icon: <FiZap size={20} />, title: 'Fast-Growing', desc: 'Rapidly expanding team with consistent year-on-year growth since 1996.', color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8' },
                  ].map((h, i) => (
                    <div key={i} style={{
                      background: h.bg, border: `1px solid ${h.border}`,
                      borderRadius: 18, padding: '22px 24px'
                    }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: h.color, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                        {h.icon}
                      </div>
                      <h4 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '0.92rem', color: '#0A1628', marginBottom: 6 }}>{h.title}</h4>
                      <p style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500, lineHeight: 1.6 }}>{h.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Company Info Table */}
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '28px 32px', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
                  <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#0A1628', marginBottom: 20 }}>
                    Company Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                    {[
                      { label: 'Company Type', value: company.type },
                      { label: 'Founded', value: company.founded },
                      { label: 'Employees', value: company.size },
                      { label: 'Industry', value: company.industry },
                      { label: 'Headquarters', value: company.location },
                      { label: 'Website', value: company.website, isLink: true },
                    ].map(info => (
                      <div key={info.label} style={{ padding: '14px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5 }}>
                          {info.label}
                        </div>
                        {info.isLink ? (
                          <a href={info.value} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E5EFF', textDecoration: 'none', wordBreak: 'break-all' }}>
                            {info.value}
                          </a>
                        ) : (
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>{info.value}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ─── Right Sidebar ─────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 88 }}>

            {/* Rating Widget */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: '#0A1628', marginBottom: 20 }}>
                Reviews & Rating
              </h3>

              {/* Big Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '3rem', fontWeight: 800, color: '#0A1628', lineHeight: 1, letterSpacing: '-0.05em' }}>
                    {company.rating}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 }}>
                    out of 5
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <FaStar key={s} size={16} color={s <= Math.round(company.rating) ? '#F59E0B' : '#E2E8F0'} />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>
                    Based on {company.reviews} reviews
                  </div>
                </div>
              </div>

              {/* Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {ratingBreakdown.map(r => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{r.label}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0A1628' }}>{r.val}%</span>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${r.val}%`, height: '100%', background: r.val >= 80 ? '#0DBF7B' : r.val >= 70 ? '#1E5EFF' : '#F59E0B', borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowReviewModal(true)}
                style={{
                  width: '100%', padding: '11px', borderRadius: 11,
                  border: '1.5px solid #CCDAFF', background: '#EEF4FF',
                  color: '#1E5EFF', fontFamily: "'Sora', sans-serif",
                  fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#CCDAFF'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#EEF4FF'; }}
              >
                <FiStar size={14} /> Write a Review
              </button>

              {Array.isArray(company.reviewsList) && company.reviewsList.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    Recent Reviews
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 220, overflowY: 'auto' }}>
                    {company.reviewsList.slice(0, 3).map((review) => (
                      <div key={review.id} style={{ padding: 12, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0A1628' }}>{review.candidateName}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B' }}>{review.candidateTitle || 'Candidate'}</div>
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F59E0B' }}>{review.rating || 0}/5</div>
                        </div>
                        <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: '#475569', margin: 0 }}>
                          {review.review}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTA Widget */}
            <div style={{
              borderRadius: 20, padding: '28px 24px',
              background: '#002366', position: 'relative', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,35,102,0.28)'
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(13,191,123,0.15)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <FiZap size={18} color="white" />
                </div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>
                  Work at {company.name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500, lineHeight: 1.6, marginBottom: 20 }}>
                  Explore all openings and apply with your Maven profile instantly.
                </p>
                <button
                  onClick={() => setActiveTab('Jobs')}
                  style={{
                    width: '100%', padding: '12px',
                    borderRadius: 11, background: '#0DBF7B',
                    color: 'white', border: 'none',
                    fontFamily: "'Sora', sans-serif", fontWeight: 800,
                    fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(13,191,123,0.35)',
                    transition: 'all 0.18s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0DBF7B'; e.currentTarget.style.transform = 'none'; }}
                >
                  <FiSend size={15} /> View All Openings
                </button>
              </div>
            </div>

            {/* Quick Info Widget */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '0.82rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Quick Info
              </h3>
              {[
                { icon: <FiCalendar size={13} />, label: 'Founded', value: company.founded },
                { icon: <FiUsers size={13} />, label: 'Employees', value: company.size },
                { icon: <FiBriefcase size={13} />, label: 'Type', value: company.type },
                { icon: <FiMapPin size={13} />, label: 'Location', value: company.location },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Review Modal ──────────────────────────────── */}
      {
        showReviewModal && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowReviewModal(false)}
          >
            <div
              style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 24px 64px rgba(10,22,40,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ background: '#002366', padding: '28px 32px', position: 'relative' }}>
                <button
                  onClick={() => setShowReviewModal(false)}
                  style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                >
                  <FiX size={16} />
                </button>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <FiStar size={20} color="white" />
                </div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: 'white', marginBottom: 4 }}>Write a Review</h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Share your experience at {company.name}</p>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '28px 32px' }}>
                {/* Star Picker */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                    Overall Rating
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setSelectedRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transition: 'transform 0.15s' }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                      >
                        <FaStar size={32} color={(hoverRating || selectedRating) >= star ? '#F59E0B' : '#E2E8F0'} />
                      </button>
                    ))}
                  </div>
                  <div style={{ height: 20, fontSize: '0.8rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {selectedRating ? ratingLabel[selectedRating] : ''}
                  </div>
                </div>

                {/* Textarea */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Share more details <span style={{ color: '#CBD5E1', fontWeight: 600 }}>(Optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="What's it like working here? Describe culture, growth, work-life balance..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    style={{
                      width: '100%', background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0', borderRadius: 14,
                      padding: '14px 16px', fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.875rem', color: '#334155', fontWeight: 500,
                      resize: 'none', outline: 'none', transition: 'all 0.18s',
                      lineHeight: 1.6, boxSizing: 'border-box'
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#1E5EFF'; e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,94,255,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12,
                      border: '1.5px solid #E2E8F0', background: 'white',
                      color: '#64748B', fontFamily: "'Sora', sans-serif",
                      fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.18s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!selectedRating || reviewSubmitting}
                    onClick={async () => {
                      if (!selectedRating) return;
                      setReviewSubmitting(true);
                      try {
                        const savedUser = (() => {
                          try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
                        })();
                        const res = await authService.submitCompanyReview(id, {
                          rating: selectedRating,
                          review: reviewText,
                          headline: "",
                          isAnonymous: false,
                          candidateName: savedUser.name || savedUser.fullName || savedUser.email || 'Candidate',
                          candidateTitle: savedUser.headline || savedUser.title || 'Candidate',
                        });
                        const nextReview = res?.data?.review || null;
                        if (nextReview) {
                          setCompany((current) => ({
                            ...current,
                            reviewsList: [nextReview, ...(current.reviewsList || [])],
                            reviews: String(Number(current.reviews || 0) + 1),
                          }));
                        }
                        setShowReviewModal(false);
                        setSelectedRating(0);
                        setReviewText('');
                      } catch (error) {
                        alert(error?.message || 'Failed to submit review');
                      } finally {
                        setReviewSubmitting(false);
                      }
                    }}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                      background: selectedRating && !reviewSubmitting ? '#002366' : '#F1F5F9',
                      color: selectedRating && !reviewSubmitting ? 'white' : '#94A3B8',
                      fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '0.85rem',
                      cursor: selectedRating && !reviewSubmitting ? 'pointer' : 'not-allowed', transition: 'all 0.18s',
                      boxShadow: selectedRating && !reviewSubmitting ? '0 4px 16px rgba(0,35,102,0.25)' : 'none'
                    }}
                    onMouseEnter={e => { if (selectedRating && !reviewSubmitting) e.currentTarget.style.background = '#1E3A8A'; }}
                    onMouseLeave={e => { if (selectedRating && !reviewSubmitting) e.currentTarget.style.background = '#002366'; }}
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Jobprofile;
