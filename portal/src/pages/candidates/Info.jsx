import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiCheckCircle, FiClock, FiEye, FiSend, FiBriefcase,
    FiTrendingUp, FiStar, FiChevronRight, FiFilter,
    FiMapPin, FiUsers, FiBarChart2, FiAward, FiZap,
    FiMail, FiPhone, FiCalendar, FiArrowUp, FiArrowRight,
    FiXCircle, FiAlertCircle, FiRefreshCw, FiBookmark, FiX,
    FiLoader, FiInbox, FiTrash2, FiExternalLink
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../../AuthContext';
import authService from '../../services/authService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_MAP = {
    APPLIED:      { color: '#6366f1', bg: '#EEF2FF', icon: <FiSend size={13} />,        label: 'Applied',         step: 1 },
    SCREENING:    { color: '#0ea5e9', bg: '#e0f2fe', icon: <FiEye size={13} />,         label: 'In Screening',    step: 2 },
    SHORTLISTED:  { color: '#10b981', bg: '#ecfdf5', icon: <FiCheckCircle size={13} />, label: 'Shortlisted',     step: 3 },
    INTERVIEW:    { color: '#f59e0b', bg: '#fffbeb', icon: <FiMail size={13} />,        label: 'Interview',       step: 4 },
    OFFERED:      { color: '#8b5cf6', bg: '#f5f3ff', icon: <FiAward size={13} />,       label: 'Offered',         step: 5 },
    HIRED:        { color: '#059669', bg: '#d1fae5', icon: <FiCheckCircle size={13} />, label: 'Hired 🎉',         step: 6 },
    REJECTED:     { color: '#ef4444', bg: '#fef2f2', icon: <FiXCircle size={13} />,     label: 'Rejected',        step: 0 },
};

const COMPANY_COLORS = [
    '#6366f1','#10b981','#002366','#f59e0b','#ec4899',
    '#0ea5e9','#8b5cf6','#ef4444','#f43f5e','#3b82f6',
];
const companyColor = (str = '') => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
};
const companyInitial = (name = '') => (name.trim()[0] || 'C').toUpperCase();

function relDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const diff = (Date.now() - d) / 1000;
    if (diff < 60)   return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' });
}

// ─── SavedJobs localStorage helpers ─────────────────────────────────────────

const SAVED_KEY = 'maven_saved_jobs';

function getSavedJobs() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
    catch { return []; }
}
function setSavedJobsStorage(jobs) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(jobs));
}
function isJobSaved(jobId) {
    return getSavedJobs().some(j => j.id === jobId);
}
function toggleSavedJob(job) {
    const saved = getSavedJobs();
    const idx = saved.findIndex(j => j.id === job.id);
    if (idx >= 0) {
        saved.splice(idx, 1);
        setSavedJobsStorage(saved);
        return false;
    } else {
        saved.unshift({ ...job, savedAt: new Date().toISOString() });
        setSavedJobsStorage(saved);
        return true;
    }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRating({ rating }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <FiStar size={11} fill="#f59e0b" color="#f59e0b" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{rating?.toFixed(1) ?? '—'}</span>
        </span>
    );
}

function DonutChart({ value, total, color = '#10b981', size = 80, stroke = 9 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = total > 0 ? value / total : 0;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }}
            />
        </svg>
    );
}

function MatchBar({ label, value }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{value ?? '—'}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 6,
                    background: (value ?? 0) >= 75 ? 'linear-gradient(90deg,#10b981,#0da371)'
                        : (value ?? 0) >= 50 ? 'linear-gradient(90deg,#6366f1,#4f46e5)'
                            : 'linear-gradient(90deg,#f59e0b,#d97706)',
                    width: `${value ?? 0}%`,
                    transition: 'width .8s cubic-bezier(.4,0,.2,1)',
                }} />
            </div>
        </div>
    );
}

// ─── Saved Jobs Modal ────────────────────────────────────────────────────────

function SavedJobsModal({ onClose }) {
    const overlayRef = useRef(null);
    const modalRef = useRef(null);
    const listRef = useRef(null);
    const [savedJobs, setSavedJobs] = useState(getSavedJobs());

    useEffect(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
        gsap.fromTo(modalRef.current, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)', delay: 0.1 });
        if (listRef.current?.children.length) {
            gsap.fromTo(listRef.current.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.07, ease: 'power2.out', delay: 0.3 });
        }
    }, []);

    const handleClose = () => {
        gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
        gsap.to(modalRef.current, { y: 20, opacity: 0, scale: 0.95, duration: 0.2, onComplete: onClose });
    };

    const handleRemove = (jobId) => {
        const updated = getSavedJobs().filter(j => j.id !== jobId);
        setSavedJobsStorage(updated);
        setSavedJobs(updated);
    };

    return (
        <div ref={overlayRef} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
            <div ref={modalRef} style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,35,102,0.25)', border: '1px solid #e2e8f0' }}>
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#002366' }}>
                            <FiBookmark size={20} fill="#002366" />
                        </div>
                        <div>
                            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Saved Jobs</h2>
                            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                                {savedJobs.length === 0 ? 'No saved jobs yet' : `${savedJobs.length} job${savedJobs.length !== 1 ? 's' : ''} saved`}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{ background: '#fff', border: '1.5px solid #e2e8f0', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all .2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#002366'; e.currentTarget.style.color = '#002366'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}>
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body */}
                <div ref={listRef} style={{ padding: savedJobs.length === 0 ? '0' : '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                    {savedJobs.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 32px', gap: 16, textAlign: 'center' }}>
                            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                <FiBookmark size={32} />
                            </div>
                            <div>
                                <div style={{ fontFamily: 'var(--fd)', fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>No saved jobs yet</div>
                                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>Browse jobs and click the bookmark icon to save them here for later.</div>
                            </div>
                            <Link to="/jobs" onClick={handleClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#002366', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--fd)' }}>
                                Browse Jobs <FiArrowRight size={14} />
                            </Link>
                        </div>
                    ) : savedJobs.map(job => (
                        <div key={job.id} style={{ padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'all .2s', background: '#fff' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,35,102,.15)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,35,102,.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${job.logoColor || '#6366f1'}15`, border: `2px solid ${job.logoColor || '#6366f1'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 800, color: job.logoColor || '#6366f1', flexShrink: 0 }}>
                                {job.logo || companyInitial(job.companyName)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{job.title || job.jobTitle}</h3>
                                    <button onClick={() => handleRemove(job.id)} title="Remove" style={{ background: '#fef2f2', border: 'none', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0, transition: 'all .2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
                                        <FiTrash2 size={13} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 10 }}>
                                    <span style={{ color: '#475569' }}>{job.companyName}</span>
                                    {job.location && <><span>•</span><span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FiMapPin size={11} />{job.location}</span></>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {job.salary && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 9px', borderRadius: 6 }}>{job.salary}</span>}
                                        {job.jobType && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 9px', borderRadius: 6 }}>{job.jobType}</span>}
                                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Saved {relDate(job.savedAt)}</span>
                                    </div>
                                    <Link to={`/job/${job.id}`} onClick={handleClose} style={{ background: '#002366', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'var(--fd)', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        View <FiExternalLink size={11} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {savedJobs.length > 0 && (
                    <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <button onClick={() => { setSavedJobsStorage([]); setSavedJobs([]); }} style={{ fontSize: 12.5, fontWeight: 700, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <FiTrash2 size={13} /> Clear all
                        </button>
                        <Link to="/jobs" onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#002366', textDecoration: 'none' }}>
                            Browse more <FiArrowRight size={13} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1.5px solid #f1f5f9' }}>
            <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#f1f5f9' }} className="skeleton" />
                <div style={{ flex: 1 }}>
                    <div style={{ height: 14, borderRadius: 6, background: '#f1f5f9', marginBottom: 8, width: '60%' }} className="skeleton" />
                    <div style={{ height: 12, borderRadius: 6, background: '#f1f5f9', marginBottom: 12, width: '40%' }} className="skeleton" />
                    <div style={{ height: 22, borderRadius: 100, background: '#f1f5f9', width: '35%' }} className="skeleton" />
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Info() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedApp, setSelectedApp] = useState(null);
    const [showSavedJobs, setShowSavedJobs] = useState(false);
    const [savedCount, setSavedCount] = useState(() => getSavedJobs().length);
    const [refreshing, setRefreshing] = useState(false);

    // ── fetch applications ──
    const fetchApplications = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const resp = await authService.getApplications();
            const data = Array.isArray(resp?.data) ? resp.data : [];
            setApplications(data);
            if (!selectedApp && data.length > 0) setSelectedApp(data[0]);
        } catch (err) {
            setError(err?.message || 'Failed to load applications. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    // ── sync saved count whenever modal closes ──
    const handleSavedClose = () => {
        setShowSavedJobs(false);
        setSavedCount(getSavedJobs().length);
    };

    // ── filter logic ──
    const filteredApps = applications.filter(app => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'active') return ['APPLIED','SCREENING','SHORTLISTED','INTERVIEW','OFFERED'].includes(app.status);
        if (activeFilter === 'action') return ['SHORTLISTED','INTERVIEW','OFFERED','HIRED'].includes(app.status);
        if (activeFilter === 'hired') return app.status === 'HIRED';
        if (activeFilter === 'rejected') return app.status === 'REJECTED';
        return true;
    });

    // ── computed stats from real data ──
    const stats = {
        total: applications.length,
        actionNeeded: applications.filter(a => ['SHORTLISTED','INTERVIEW','OFFERED','HIRED'].includes(a.status)).length,
        shortlisted: applications.filter(a => ['SHORTLISTED','INTERVIEW','OFFERED','HIRED'].includes(a.status)).length,
        hired: applications.filter(a => a.status === 'HIRED').length,
        rejected: applications.filter(a => a.status === 'REJECTED').length,
        screening: applications.filter(a => a.status === 'SCREENING').length,
    };

    const FILTER_TABS = [
        { id: 'all',      label: 'All',           count: applications.length },
        { id: 'active',   label: 'In Progress',    count: applications.filter(a => ['APPLIED','SCREENING','SHORTLISTED','INTERVIEW','OFFERED'].includes(a.status)).length },
        { id: 'action',   label: 'Recruiter Action', count: stats.actionNeeded },
        { id: 'hired',    label: 'Hired / Offered', count: stats.hired + applications.filter(a=>a.status==='OFFERED').length },
        { id: 'rejected', label: 'Rejected',       count: stats.rejected },
    ];

    const sc = selectedApp ? (STATUS_MAP[selectedApp.status] || STATUS_MAP.APPLIED) : null;

    const PROGRESS_STEPS = selectedApp ? [
        { label: 'Applied',      done: true },
        { label: 'Screening',    done: ['SCREENING','SHORTLISTED','INTERVIEW','OFFERED','HIRED'].includes(selectedApp.status) },
        { label: 'Shortlisted',  done: ['SHORTLISTED','INTERVIEW','OFFERED','HIRED'].includes(selectedApp.status) },
        { label: 'Interview',    done: ['INTERVIEW','OFFERED','HIRED'].includes(selectedApp.status) },
        { label: 'Decision',     done: ['OFFERED','HIRED','REJECTED'].includes(selectedApp.status) },
    ] : [];

    const donePct = PROGRESS_STEPS.length > 1
        ? (PROGRESS_STEPS.filter(s => s.done).length - 1) / (PROGRESS_STEPS.length - 1) * 100
        : 0;

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4fb', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1e293b' }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #002366; --green: #10b981; --gd: #0da371;
          --s50: #f8fafc; --s100: #f1f5f9; --s200: #e2e8f0;
          --s500: #64748b; --s600: #475569; --s900: #0f172a;
          --fd: 'Bricolage Grotesque', sans-serif;
        }
        .app-card {
          padding: 16px 20px; border-radius: 14px; cursor: pointer;
          border: 1.5px solid transparent; transition: all .2s;
          background: #fff;
        }
        .app-card:hover { border-color: rgba(0,35,102,.12); box-shadow: 0 6px 24px rgba(0,35,102,.07); }
        .app-card.active { border-color: #002366; background: #fff; box-shadow: 0 8px 28px rgba(0,35,102,.12); }
        .stat-card {
          background: #fff; border-radius: 18px; padding: 22px;
          border: 1px solid var(--s200); transition: all .25s;
        }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,35,102,.07); }
        .tag-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 100px; font-size: 11.5px; font-weight: 700;
        }
        .filter-tab {
          padding: 8px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700;
          border: 1.5px solid var(--s200); cursor: pointer; background: #fff;
          color: var(--s600); font-family: var(--fd); transition: all .2s;
          white-space: nowrap;
        }
        .filter-tab:hover { border-color: rgba(0,35,102,.2); color: var(--navy); }
        .filter-tab.active { background: var(--navy); color: #fff; border-color: var(--navy); }
        .match-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 0; font-size: 13.5px; font-weight: 600; color: var(--s600);
          border-bottom: 1px solid var(--s100);
        }
        .match-item:last-child { border-bottom: none; }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .skeleton { 
          animation: shimmer 1.4s ease-in-out infinite;
          background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
          background-size: 800px 100%;
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .info-main-grid { grid-template-columns: 320px 1fr !important; }
        }
        @media (max-width: 860px) {
          .info-main-grid { grid-template-columns: 1fr !important; }
          .info-stats-row { grid-template-columns: 1fr 1fr !important; }
          .info-pipeline-grid { grid-template-columns: 1fr 1fr !important; }
          .info-bottom-row { grid-template-columns: 1fr !important; }
          .info-header-bar { padding: 14px 20px !important; flex-wrap: wrap; gap: 12px !important; }
          .info-header-numbers { display: none !important; }
          .info-inner-pad { padding: 16px !important; }
        }
        @media (max-width: 540px) {
          .info-stats-row { grid-template-columns: 1fr !important; }
          .info-pipeline-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

            {/* ── TOP HEADER BAR ── */}
            <div className="info-header-bar" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, fontFamily: 'var(--fd)' }}>
                        <Link to="/profile" style={{ color: '#64748b', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = '#002366'} onMouseLeave={e => e.target.style.color = '#64748b'}>Profile</Link>
                        <FiChevronRight size={12} />
                        <span style={{ color: '#002366' }}>My Applications</span>
                    </div>
                    <h1 style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        {user?.name ? `${user.name.split(' ')[0]}'s Application Tracker` : 'Job Application Tracker'}
                    </h1>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
                        Track every application and recruiter interaction in one place.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Refresh */}
                    <button
                        onClick={() => fetchApplications(true)}
                        disabled={refreshing}
                        title="Refresh applications"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, cursor: refreshing ? 'not-allowed' : 'pointer', color: '#64748b', transition: 'all .2s' }}
                        onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#002366'; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                        <FiRefreshCw size={16} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    </button>

                    {/* Saved Jobs */}
                    <button
                        onClick={() => setShowSavedJobs(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#EEF2FF', color: '#002366', border: '1px solid rgba(0,35,102,.1)', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--fd)', whiteSpace: 'nowrap', transition: 'all .2s', position: 'relative' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#dde9ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#EEF2FF'}>
                        <FiBookmark size={14} fill={savedCount > 0 ? '#002366' : 'none'} /> Saved Jobs
                        {savedCount > 0 && (
                            <span style={{ background: '#002366', color: '#fff', borderRadius: 100, fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                                {savedCount}
                            </span>
                        )}
                    </button>

                    <div className="info-header-numbers" style={{ display: 'flex', gap: 0, alignItems: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: 20 }}>
                        {[
                            { val: loading ? '—' : stats.total, label: 'Total Applied' },
                            { val: loading ? '—' : stats.actionNeeded, label: 'Recruiter Actions' },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: 'center', padding: '0 16px', borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none' }}>
                                <div style={{ fontFamily: 'var(--fd)', fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.04em' }}>{s.val}</div>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="info-inner-pad" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>

                {/* ── Error Banner ── */}
                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444' }}>
                            <FiAlertCircle size={18} />
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#b91c1c' }}>{error}</span>
                        </div>
                        <button onClick={() => fetchApplications()} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--fd)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <FiRefreshCw size={13} /> Retry
                        </button>
                    </div>
                )}

                {/* ── STATS ROW ── */}
                <div className="info-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'Total Applied', val: stats.total, color: '#6366f1', bg: '#EEF2FF', icon: <FiBriefcase size={20} />, sub: `${stats.shortlisted} shortlisted` },
                        { label: 'Recruiter Actions', val: stats.actionNeeded, color: '#10b981', bg: '#ecfdf5', icon: <FiEye size={20} />, sub: 'interviews & offers' },
                        { label: 'In Screening', val: stats.screening, color: '#0ea5e9', bg: '#e0f2fe', icon: <FiUsers size={20} />, sub: 'under review now' },
                        { label: 'Profile Score', val: loading ? '—' : `${user?.profileCompletion ?? 0}%`, color: '#f59e0b', bg: '#fffbeb', icon: <FiAward size={20} />, sub: user?.profileCompletion < 80 ? 'add more details' : 'great profile!' },
                    ].map((s, i) => (
                        <div key={i} className="stat-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                <div>
                                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#64748b', marginBottom: 5 }}>{s.label}</div>
                                    <div style={{ fontFamily: 'var(--fd)', fontSize: 34, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                                        {loading ? <span style={{ display: 'inline-block', width: 50, height: 34, borderRadius: 6, background: '#f1f5f9' }} className="skeleton" /> : s.val}
                                    </div>
                                </div>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
                            </div>
                            <div style={{ fontSize: 12, color: s.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FiZap size={11} /> {s.sub}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── STATUS PIPELINE ── */}
                {!loading && applications.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Application Pipeline</div>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>All time</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden', height: 10, marginBottom: 16 }}>
                            {[
                                { pct: Math.round((applications.filter(a => ['APPLIED'].includes(a.status)).length / Math.max(stats.total, 1)) * 100), color: '#6366f1' },
                                { pct: Math.round((stats.screening / Math.max(stats.total, 1)) * 100), color: '#0ea5e9' },
                                { pct: Math.round((applications.filter(a => a.status === 'SHORTLISTED').length / Math.max(stats.total, 1)) * 100), color: '#10b981' },
                                { pct: Math.round((applications.filter(a => ['INTERVIEW','OFFERED','HIRED'].includes(a.status)).length / Math.max(stats.total, 1)) * 100), color: '#f59e0b' },
                                { pct: Math.round((stats.rejected / Math.max(stats.total, 1)) * 100), color: '#ef4444' },
                            ].map((s, i) => s.pct > 0 ? <div key={i} style={{ width: `${s.pct}%`, background: s.color, transition: 'width .6s', minWidth: s.pct > 0 ? 4 : 0 }} /> : null)}
                        </div>
                        <div className="info-pipeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                            {[
                                { label: 'Applied', count: applications.filter(a=>a.status==='APPLIED').length, color: '#6366f1', bg: '#EEF2FF', icon: <FiSend size={14}/> },
                                { label: 'Screening', count: stats.screening, color: '#0ea5e9', bg: '#e0f2fe', icon: <FiEye size={14}/> },
                                { label: 'Shortlisted', count: applications.filter(a=>a.status==='SHORTLISTED').length, color: '#10b981', bg: '#ecfdf5', icon: <FiCheckCircle size={14}/> },
                                { label: 'Interview / Offer', count: applications.filter(a=>['INTERVIEW','OFFERED','HIRED'].includes(a.status)).length, color: '#f59e0b', bg: '#fffbeb', icon: <FiMail size={14}/> },
                                { label: 'Rejected', count: stats.rejected, color: '#ef4444', bg: '#fef2f2', icon: <FiXCircle size={14}/> },
                            ].map((s, i) => (
                                <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: s.bg, border: `1px solid ${s.color}22` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, color: s.color }}>
                                        {s.icon}
                                        <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: s.color }}>{s.label}</span>
                                    </div>
                                    <div style={{ fontFamily: 'var(--fd)', fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{s.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── MAIN GRID: List + Detail ── */}
                <div className="info-main-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

                    {/* ── LEFT: Application List ── */}
                    <div>
                        {/* Filter tabs */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
                            {FILTER_TABS.map(tab => (
                                <button key={tab.id} className={`filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveFilter(tab.id)}>
                                    {tab.label}
                                    <span style={{ marginLeft: 5, padding: '1px 7px', borderRadius: 100, background: activeFilter === tab.id ? 'rgba(255,255,255,.2)' : '#f1f5f9', fontSize: 11, fontWeight: 800 }}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                            ) : filteredApps.length === 0 ? (
                                <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '40px 28px', textAlign: 'center' }}>
                                    <FiInbox size={36} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                                    <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 800, color: '#94a3b8', marginBottom: 6 }}>
                                        {applications.length === 0 ? 'No applications yet' : 'No results for this filter'}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                        {applications.length === 0 ? 'Start applying to jobs to track your progress here.' : 'Try a different filter to see your applications.'}
                                    </div>
                                    {applications.length === 0 && (
                                        <Link to="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '9px 18px', background: '#002366', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--fd)' }}>
                                            Browse Jobs <FiArrowRight size={13} />
                                        </Link>
                                    )}
                                </div>
                            ) : filteredApps.map(app => {
                                const appSc = STATUS_MAP[app.status] || STATUS_MAP.APPLIED;
                                const isSelected = selectedApp?.id === app.id;
                                const logoColor = companyColor(app.companyId || app.companyName);
                                return (
                                    <div key={app.id} className={`app-card ${isSelected ? 'active' : ''}`} onClick={() => setSelectedApp(app)}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 11, background: `${logoColor}18`, border: `1.5px solid ${logoColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 800, color: logoColor, flexShrink: 0 }}>
                                                {companyInitial(app.companyName)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                    <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', lineHeight: 1.3, marginBottom: 2 }}>{app.jobTitle}</div>
                                                    {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#002366', flexShrink: 0, marginTop: 4 }} />}
                                                </div>
                                                <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>{app.companyName}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                                    <span className="tag-pill" style={{ background: appSc.bg, color: appSc.color }}>
                                                        {appSc.icon} {appSc.label}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{relDate(app.updatedAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── RIGHT: Detail Panel ── */}
                    {loading ? (
                        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', margin: '0 auto 12px' }} className="skeleton" />
                                <div style={{ height: 16, borderRadius: 6, background: '#f1f5f9', width: 160, margin: '0 auto 8px' }} className="skeleton" />
                                <div style={{ height: 12, borderRadius: 6, background: '#f1f5f9', width: 120, margin: '0 auto' }} className="skeleton" />
                            </div>
                        </div>
                    ) : selectedApp ? (() => {
                        const detailColor = companyColor(selectedApp.companyId || selectedApp.companyName);
                        const doneStepsCount = PROGRESS_STEPS.filter(s => s.done).length;
                        const progressWidth = PROGRESS_STEPS.length > 1
                            ? ((doneStepsCount - 1) / (PROGRESS_STEPS.length - 1)) * 100
                            : 0;

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                {/* ── Job Header Card ── */}
                                <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ height: 4, background: `linear-gradient(90deg,#002366,${detailColor})` }} />
                                    <div style={{ padding: '24px 28px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                                            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${detailColor}18`, border: `2px solid ${detailColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color: detailColor, flexShrink: 0 }}>
                                                {companyInitial(selectedApp.companyName)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h2 style={{ fontFamily: 'var(--fd)', fontSize: 21, fontWeight: 800, color: '#0f172a', marginBottom: 5, letterSpacing: '-0.02em' }}>{selectedApp.jobTitle}</h2>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>{selectedApp.companyName}</span>
                                                    {selectedApp.jobLocation && (
                                                        <span style={{ fontSize: 12.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <FiMapPin size={11} /> {selectedApp.jobLocation}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                                {selectedApp.resumeUrl && (
                                                    <a href={selectedApp.resumeUrl} target="_blank" rel="noopener noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f8fafc', color: '#475569', fontSize: 12.5, fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontFamily: 'var(--fd)', border: '1px solid #e2e8f0', transition: 'all .2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                                                        <FiBriefcase size={13} /> Resume
                                                    </a>
                                                )}
                                                <Link to={`/jobs/${selectedApp.jobId}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#EEF2FF', color: '#002366', fontSize: 13, fontWeight: 800, borderRadius: 10, textDecoration: 'none', fontFamily: 'var(--fd)', transition: 'all .2s', border: '1px solid rgba(0,35,102,.1)' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#dde9ff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#EEF2FF'}>
                                                    View Job <FiArrowRight size={13} />
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Status badge + dates */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                                            <span className="tag-pill" style={{ background: sc?.bg, color: sc?.color, fontSize: 13, padding: '6px 14px' }}>
                                                {sc?.icon} {sc?.label}
                                            </span>
                                            <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>
                                                Applied {new Date(selectedApp.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>
                                                Updated {relDate(selectedApp.updatedAt)}
                                            </span>
                                        </div>

                                        {/* Progress stepper */}
                                        {selectedApp.status !== 'REJECTED' && (
                                            <div style={{ marginBottom: 4 }}>
                                                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#64748b', marginBottom: 16 }}>Application Progress</div>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                                                    <div style={{ position: 'absolute', top: 14, left: 14, right: 14, height: 3, background: '#f1f5f9', borderRadius: 3, zIndex: 0 }}>
                                                        <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#10b981,#6ee7b7)', width: `${Math.max(0, progressWidth)}%`, transition: 'width .6s' }} />
                                                    </div>
                                                    {PROGRESS_STEPS.map((step, si) => (
                                                        <div key={si} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: '50%', marginBottom: 10, background: step.done ? '#10b981' : '#fff', border: step.done ? 'none' : '2.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: step.done ? '0 0 0 4px rgba(16,185,129,.15)' : 'none', transition: 'all .3s' }}>
                                                                {step.done ? <FiCheckCircle size={14} color="#fff" /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />}
                                                            </div>
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: step.done ? '#0f172a' : '#94a3b8', textAlign: 'center', lineHeight: 1.3 }}>{step.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Rejected banner */}
                                        {selectedApp.status === 'REJECTED' && (
                                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <FiXCircle size={20} color="#ef4444" />
                                                <div>
                                                    <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 800, color: '#b91c1c' }}>Application not selected</div>
                                                    <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 2 }}>Keep going — every application is a step forward!</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── Match & Skills ── */}
                                <div className="info-bottom-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                                    {/* Match Score */}
                                    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '22px 24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#64748b' }}>Profile Match</div>
                                            {selectedApp.matchScore !== null && selectedApp.matchScore !== undefined ? (
                                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <DonutChart value={selectedApp.matchScore} total={100}
                                                        color={selectedApp.matchScore >= 75 ? '#10b981' : selectedApp.matchScore >= 50 ? '#6366f1' : '#f59e0b'}
                                                        size={52} stroke={6} />
                                                    <div style={{ position: 'absolute', fontFamily: 'var(--fd)', fontSize: 11, fontWeight: 800, color: '#0f172a' }}>{selectedApp.matchScore}%</div>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>N/A</span>
                                            )}
                                        </div>
                                        <MatchBar label="Overall Match" value={selectedApp.matchScore} />
                                        <MatchBar label="Skills Alignment" value={selectedApp.skillMatch} />
                                        <MatchBar label="Experience Fit" value={selectedApp.experienceMatch} />
                                        <MatchBar label="Location Match" value={selectedApp.locationMatch !== null ? (selectedApp.locationMatch ? 100 : 0) : null} />

                                        {/* Matched skills */}
                                        {selectedApp.matchedSkills?.length > 0 && (
                                            <div style={{ marginTop: 12 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Matched Skills</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {selectedApp.matchedSkills.slice(0, 6).map((sk, i) => (
                                                        <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '3px 9px', borderRadius: 100 }}>{sk}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedApp.missingSkills?.length > 0 && (
                                            <div style={{ marginTop: 10 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Skills to Add</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {selectedApp.missingSkills.slice(0, 4).map((sk, i) => (
                                                        <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '3px 9px', borderRadius: 100 }}>{sk}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline / Info */}
                                    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '22px 24px' }}>
                                        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#64748b', marginBottom: 16 }}>Application Info</div>

                                        {[
                                            { label: 'Job Title', val: selectedApp.jobTitle },
                                            { label: 'Company', val: selectedApp.companyName },
                                            { label: 'Location', val: selectedApp.jobLocation || 'Not specified' },
                                            { label: 'Experience', val: selectedApp.jobExperience || 'Not specified' },
                                            { label: 'Applied On', val: new Date(selectedApp.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
                                            { label: 'Last Updated', val: relDate(selectedApp.updatedAt) },
                                            { label: 'Status', val: sc?.label },
                                        ].map((row, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', gap: 12 }}>
                                                <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
                                                <span style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{row.val || '—'}</span>
                                            </div>
                                        ))}

                                        {selectedApp.jobSkills?.length > 0 && (
                                            <div style={{ marginTop: 14 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Required Skills</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {selectedApp.jobSkills.slice(0, 8).map((sk, i) => (
                                                        <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 9px', borderRadius: 100 }}>{sk}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── Tips Banner ── */}
                                <div style={{ background: 'linear-gradient(135deg,#002366,#1a3a8f)', borderRadius: 18, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(16,185,129,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <FiTrendingUp size={20} color="#6ee7b7" />
                                        </div>
                                        <div>
                                            <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Boost your profile visibility</div>
                                            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.65)', lineHeight: 1.5 }}>
                                                Complete your profile to rank higher in recruiter searches and get 3× more views.
                                            </div>
                                        </div>
                                    </div>
                                    <Link to="/profile" style={{ padding: '10px 22px', background: '#10b981', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--fd)', whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#0da371'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#10b981'}>
                                        Improve Profile <FiArrowRight size={13} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })() : !loading && applications.length === 0 ? (
                        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '60px 32px', textAlign: 'center' }}>
                            <FiInbox size={48} style={{ color: '#cbd5e1', marginBottom: 16 }} />
                            <div style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>No Applications Yet</div>
                            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
                                Start applying to jobs and your application tracker will appear here.
                            </div>
                            <Link to="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#002366', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 800, textDecoration: 'none', fontFamily: 'var(--fd)' }}>
                                Browse Jobs <FiArrowRight size={15} />
                            </Link>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* ── Saved Jobs Modal ── */}
            {showSavedJobs && <SavedJobsModal onClose={handleSavedClose} />}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}