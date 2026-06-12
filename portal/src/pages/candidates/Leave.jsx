import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft, FiSearch, FiDownload, FiCopy, FiEye,
    FiBookmark, FiChevronRight, FiStar, FiFilter,
    FiFileText, FiCheckCircle, FiClock, FiBriefcase,
    FiUser, FiMail, FiX, FiZap
} from 'react-icons/fi';
import { gsap } from 'gsap';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';

/* ─── DATA ─── */
const CATEGORIES = [
    { id: 'all', label: 'All Templates', count: 18 },
    { id: 'leave', label: 'Leave Applications', count: 6 },
    { id: 'resignation', label: 'Resignation', count: 4 },
    { id: 'cover', label: 'Cover Letters', count: 5 },
    { id: 'request', label: 'Requests', count: 3 },
];

const TEMPLATES = [
    {
        id: 1, category: 'leave',
        title: 'One-Day Leave Application',
        subtitle: 'Casual / Short Absence',
        description: 'Perfect for requesting a single day off for personal or medical reasons. Concise and professional.',
        tags: ['Casual', 'Short', 'Personal'],
        rating: 4.9, uses: '12.4k',
        badge: 'Most Used',
        badgeColor: '#002366',
        accentColor: '#3B82F6',
        icon: <FiClock size={20} />,
        preview: `Dear [Manager's Name],

I am writing to request a one-day leave of absence on [Date] due to [brief reason].

I have ensured that all my pending tasks are up to date and [Colleague's Name] has kindly agreed to cover any urgent matters in my absence.

I will be available on [mobile/email] if needed.

Kindly grant me approval at your earliest convenience.

Yours sincerely,
[Your Name]
[Designation] | [Department]`,
    },
    {
        id: 2, category: 'leave',
        title: 'Medical Leave Application',
        subtitle: 'Health & Recovery',
        description: 'Formal template for extended medical leave, includes doctor certificate attachment note.',
        tags: ['Medical', 'Formal', 'Extended'],
        rating: 4.8, uses: '9.1k',
        badge: 'Top Rated',
        badgeColor: '#059669',
        accentColor: '#10B981',
        icon: <FiUser size={20} />,
        preview: `Dear [Manager's Name],

I am writing to inform you that I have been advised by my physician, Dr. [Name], to take complete bed rest for [X] days, from [Start Date] to [End Date], due to [condition].

I am attaching the medical certificate from my doctor for your reference.

I assure you that I will catch up on all pending work upon my return. [Colleague] will handle urgent matters during my absence.

Requesting your approval and understanding.

Warm regards,
[Your Name]
[Employee ID] | [Department]`,
    },
    {
        id: 3, category: 'leave',
        title: 'Maternity Leave Application',
        subtitle: 'Statutory Leave',
        description: 'Comprehensive maternity leave application covering statutory rights and handover plan.',
        tags: ['Maternity', 'Statutory', 'Planned'],
        rating: 4.9, uses: '5.2k',
        badge: 'New',
        badgeColor: '#7C3AED',
        accentColor: '#8B5CF6',
        icon: <FiFileText size={20} />,
        preview: `Dear HR Manager,

I am pleased to inform you that I am expecting my baby around [Expected Date]. As per the Maternity Benefit Act, I am entitled to [X] weeks of paid maternity leave.

I would like to commence my leave from [Start Date] and return on [End Date].

I have prepared a detailed handover document and briefed [Colleague] on all ongoing projects to ensure seamless continuity.

Please acknowledge receipt and confirm approval of my leave.

Sincerely,
[Your Name]
[Designation] | [Department]`,
    },
    {
        id: 4, category: 'resignation',
        title: 'Formal Resignation Letter',
        subtitle: 'Standard Notice Period',
        description: 'Professional resignation letter with standard notice period, suitable for all industries.',
        tags: ['Formal', 'Notice Period', 'Professional'],
        rating: 4.7, uses: '18.6k',
        badge: 'Most Used',
        badgeColor: '#002366',
        accentColor: '#3B82F6',
        icon: <FiBriefcase size={20} />,
        preview: `Dear [Manager's Name],

I am writing to formally notify you of my resignation from my position as [Job Title] at [Company Name], effective [Last Working Day — typically 30/60/90 days from today].

This was not an easy decision. I have thoroughly enjoyed my time at [Company] and am grateful for the opportunities, mentorship, and experiences I've gained here.

I am committed to ensuring a smooth transition and will complete all pending responsibilities, document ongoing projects, and assist in training my replacement over the notice period.

Please let me know how I can best support the team during this time.

Thank you for everything.

Warm regards,
[Your Name]`,
    },
    {
        id: 5, category: 'resignation',
        title: 'Immediate Resignation Letter',
        subtitle: 'No Notice / Emergency',
        description: 'Tactful immediate resignation for urgent personal circumstances, maintains professional tone.',
        tags: ['Urgent', 'Immediate', 'Personal'],
        rating: 4.5, uses: '7.3k',
        badge: null,
        accentColor: '#EF4444',
        icon: <FiZap size={20} />,
        preview: `Dear [Manager's Name],

I regret to inform you that due to unavoidable personal circumstances, I am unable to continue in my role as [Job Title] and must resign with immediate effect from [Today's Date].

I sincerely apologise for the inconvenience this may cause. I understand this is not ideal and I am willing to assist remotely for [X] days to help with handover or documentation if possible.

I am truly grateful for the opportunities provided to me and wish the team continued success.

Regards,
[Your Name]`,
    },
    {
        id: 6, category: 'cover',
        title: 'Product Manager Cover Letter',
        subtitle: 'Tech / Startup',
        description: 'Data-driven cover letter template for PM roles. Highlights strategy, metrics, and cross-functional leadership.',
        tags: ['Product', 'Tech', 'Leadership'],
        rating: 4.9, uses: '11.2k',
        badge: 'Top Rated',
        badgeColor: '#059669',
        accentColor: '#10B981',
        icon: <FiStar size={20} />,
        preview: `Dear Hiring Manager,

I am excited to apply for the Product Manager role at [Company]. With [X] years of experience driving product strategy across [industry], I have a proven track record of shipping impactful features that move the needle.

At [Previous Company], I led the end-to-end development of [Product], resulting in a [X]% increase in user retention and ₹[X]Cr in ARR. I collaborated closely with engineering, design, and business stakeholders to translate complex user problems into clear, prioritised roadmaps.

What excites me most about [Company] is [specific insight about company/product]. I believe my experience in [skill] and passion for [domain] make me uniquely positioned to contribute to your mission.

I'd love to discuss how I can drive growth for [Company]. Thank you for your time.

Best regards,
[Your Name]`,
    },
    {
        id: 7, category: 'cover',
        title: 'Software Engineer Cover Letter',
        subtitle: 'SDE / Backend / Frontend',
        description: 'Technical yet human cover letter for engineering roles. Balances code credibility with communication skills.',
        tags: ['Engineering', 'Technical', 'SDE'],
        rating: 4.8, uses: '14.9k',
        badge: 'Most Used',
        badgeColor: '#002366',
        accentColor: '#3B82F6',
        icon: <FiCheckCircle size={20} />,
        preview: `Dear Hiring Team,

I am writing to express my strong interest in the [Role] position at [Company]. As a software engineer with [X] years of experience in [tech stack], I have consistently built scalable, production-grade systems that serve millions of users.

In my current role at [Company], I architected and delivered [feature/system], reducing latency by [X]% and improving system reliability to [X]% uptime. I take pride in writing clean, maintainable code and actively mentor junior engineers on best practices.

[Company]'s engineering culture around [specific aspect] deeply resonates with me, and I am eager to contribute to your [specific team/project].

I look forward to discussing how my background aligns with your needs.

Sincerely,
[Your Name]`,
    },
    {
        id: 8, category: 'request',
        title: 'Salary Increment Request',
        subtitle: 'Annual Appraisal / Promotion',
        description: 'Confident, data-backed salary increment letter. Includes achievements and market benchmarking section.',
        tags: ['Salary', 'Appraisal', 'Growth'],
        rating: 4.7, uses: '8.8k',
        badge: 'Trending',
        badgeColor: '#D97706',
        accentColor: '#F59E0B',
        icon: <FiMail size={20} />,
        preview: `Dear [Manager's Name],

I would like to formally request a review of my current compensation. Over the past [X] months/year, I have consistently exceeded my KPIs and taken on expanded responsibilities beyond my original role.

Key achievements this period:
- [Achievement 1 with measurable impact]
- [Achievement 2 with measurable impact]  
- [Led/Delivered X project, resulting in Y outcome]

Based on my research into current market rates for [Role] in [City/Industry], the range typically falls between ₹[X]L and ₹[Y]L. I believe a revision to ₹[Amount] would reflect both my contributions and align with market standards.

I am open to a discussion at your convenience and am happy to provide supporting documentation.

Thank you for your consideration.

Regards,
[Your Name]`,
    },
    {
        id: 9, category: 'leave',
        title: 'Emergency Leave Application',
        subtitle: 'Urgent / Family Emergency',
        description: 'Brief, respectful emergency leave application for unexpected family situations requiring immediate absence.',
        tags: ['Emergency', 'Family', 'Urgent'],
        rating: 4.6, uses: '6.7k',
        badge: null,
        accentColor: '#EF4444',
        icon: <FiClock size={20} />,
        preview: `Dear [Manager's Name],

I am writing to inform you that due to a family emergency, I am unable to come to work today / from [Date] to [Date].

I sincerely apologise for the short notice. I will ensure that [Colleague] is briefed on any urgent tasks and I will remain reachable via phone/email.

I will keep you updated on my situation and will return as soon as possible.

Thank you for your understanding.

Regards,
[Your Name]`,
    },
];

/* ─── HELPERS ─── */
const downloadTemplateAsDoc = (template) => {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${template.title}</title></head>
      <body>
        <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">
          ${template.preview.replace(/\n/g, '<br>')}
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.title.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/* ─── PREVIEW MODAL ─── */
function PreviewModal({ template, onClose }) {
    const modalRef = useRef(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        gsap.fromTo(modalRef.current,
            { opacity: 0, scale: 0.94, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' }
        );
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(template.preview);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        gsap.to(modalRef.current, {
            opacity: 0, scale: 0.94, y: 20, duration: 0.22, ease: 'power2.in',
            onComplete: onClose
        });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,15,50,0.65)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24
        }} onClick={handleClose}>
            <div ref={modalRef} onClick={e => e.stopPropagation()} style={{
                background: '#fff', borderRadius: 28, width: '100%', maxWidth: 680,
                maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 40px 100px rgba(0,35,102,0.28), 0 0 0 1px rgba(255,255,255,0.5) inset'
            }}>
                {/* Modal header */}
                <div style={{
                    padding: '22px 28px',
                    background: 'linear-gradient(135deg, #001a50 0%, #002fa0 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>
                            Template Preview
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                            {template.title}
                        </div>
                    </div>
                    <button onClick={handleClose} style={{
                        width: 36, height: 36, borderRadius: 12,
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <FiX size={16} />
                    </button>
                </div>

                {/* Template text */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
                    <pre style={{
                        margin: 0, fontFamily: "'Georgia', 'Times New Roman', serif",
                        fontSize: 14.5, lineHeight: 1.95, color: '#1E293B',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                    }}>
                        {template.preview}
                    </pre>
                </div>

                {/* Modal footer */}
                <div style={{
                    padding: '18px 28px', borderTop: '1px solid #F1F5F9',
                    display: 'flex', gap: 10, background: '#FAFBFF'
                }}>
                    <button onClick={handleCopy} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '12px 20px', borderRadius: 14,
                        background: copied ? '#ECFDF5' : '#EEF2FF',
                        border: copied ? '1.5px solid #10B981' : '1.5px solid #C7D7FF',
                        color: copied ? '#065F46' : '#002366',
                        fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        fontFamily: 'inherit'
                    }}>
                        {copied ? <FiCheckCircle size={15} /> : <FiCopy size={15} />}
                        {copied ? 'Copied!' : 'Copy Template'}
                    </button>
                    <button onClick={() => downloadTemplateAsDoc(template)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '12px 20px', borderRadius: 14,
                        background: 'linear-gradient(135deg, #001a50 0%, #0F3DB5 100%)',
                        border: 'none', color: '#fff',
                        fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0,35,102,0.3)',
                        fontFamily: 'inherit'
                    }}>
                        <FiDownload size={15} /> Download .doc
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── TEMPLATE CARD ─── */
function TemplateCard({ template, index, onPreview }) {
    const cardRef = useRef(null);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        gsap.fromTo(cardRef.current,
            { opacity: 0, y: 36, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.55, delay: index * 0.07, ease: 'back.out(1.2)' }
        );
    }, [index]);

    return (
        <div ref={cardRef} style={{
            background: '#fff', borderRadius: 22,
            border: hovered ? `1.5px solid ${template.accentColor}40` : '1.5px solid #E8EDF5',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: hovered
                ? `0 20px 52px rgba(0,35,102,0.13), 0 0 0 1px ${template.accentColor}20`
                : '0 2px 14px rgba(0,30,80,0.05)',
            transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
            transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
            cursor: 'pointer',
            position: 'relative'
        }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Accent bar */}
            <div style={{
                height: 4, width: '100%',
                background: `linear-gradient(90deg, ${template.accentColor}, ${template.accentColor}55)`,
            }} />

            {/* Card body */}
            <div style={{ padding: '24px 26px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 46, height: 46, borderRadius: 14,
                            background: `${template.accentColor}12`,
                            border: `1.5px solid ${template.accentColor}25`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: template.accentColor, flexShrink: 0
                        }}>
                            {template.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                                {template.subtitle}
                            </div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                                {template.title}
                            </h3>
                        </div>
                    </div>
                    {template.badge && (
                        <span style={{
                            padding: '4px 10px', borderRadius: 100,
                            background: `${template.badgeColor}12`,
                            color: template.badgeColor,
                            border: `1px solid ${template.badgeColor}25`,
                            fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0
                        }}>
                            {template.badge}
                        </span>
                    )}
                </div>

                {/* Description */}
                <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.65, color: '#64748B', fontWeight: 500 }}>
                    {template.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {template.tags.map(tag => (
                        <span key={tag} style={{
                            padding: '4px 10px', borderRadius: 8,
                            background: '#F1F5F9', color: '#475569',
                            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.01em'
                        }}>
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FiStar size={13} color="#F59E0B" fill="#F59E0B" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{template.rating}</span>
                    </div>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#94A3B8' }}>{template.uses} uses</span>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#F1F5F9', marginBottom: 18 }} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button onClick={() => onPreview(template)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 16px', borderRadius: 12,
                        background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                        color: '#475569', fontSize: 12.5, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7D7FF'; e.currentTarget.style.color = '#002366'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
                    >
                        <FiEye size={13} /> Preview
                    </button>
                    <button onClick={() => downloadTemplateAsDoc(template)} style={{
                        flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 16px', borderRadius: 12,
                        background: 'linear-gradient(135deg, #001a50 0%, #0F3DB5 100%)',
                        border: 'none', color: '#fff',
                        fontSize: 12.5, fontWeight: 700,
                        cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,35,102,0.25)',
                        transition: 'all 0.22s', fontFamily: 'inherit'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,35,102,0.38)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,35,102,0.25)'; }}
                    >
                        <FiDownload size={13} /> Use Template
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── MAIN PAGE ─── */
export default function TemplatesPage() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [preview, setPreview] = useState(null);
    const heroRef = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(heroRef.current,
            { opacity: 0, y: -24 },
            { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }
        );
        gsap.fromTo(searchRef.current,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5, delay: 0.2, ease: 'power3.out' }
        );
    }, []);

    const filtered = TEMPLATES.filter(t => {
        const matchCat = activeCategory === 'all' || t.category === activeCategory;
        const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
        return matchCat && matchSearch;
    });

    const featuredTemplate = TEMPLATES.find(t => t.id === 1);

    return (
        <div style={{ minHeight: '100vh', background: '#F0F4FA', fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>

            {/* ── NAV ── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid #E2E8F0',
                boxShadow: '0 1px 12px rgba(0,35,102,0.06)'
            }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <Link to="/">
                            <img src={mavenLogo} alt="MavenJobs" style={{ height: 34, display: 'block' }} />
                        </Link>
                        <div style={{ width: 1, height: 28, background: '#E2E8F0' }} />
                        <button onClick={() => navigate(-1)} style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            fontSize: 13.5, fontWeight: 600, color: '#64748B',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '6px 12px', borderRadius: 10, fontFamily: 'inherit',
                            transition: 'all 0.18s'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#002366'; e.currentTarget.style.background = '#EEF2FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'none'; }}
                        >
                            <FiArrowLeft size={15} /> Go Back
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#94A3B8' }}>{TEMPLATES.length} templates</div>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#CBD5E1' }} />
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#002366', background: '#EEF2FF', padding: '4px 10px', borderRadius: 8 }}>Free</div>
                    </div>
                </div>
            </header>

            {/* ── HERO ── */}
            <div ref={heroRef} style={{
                backgroundImage: 'linear-gradient(140deg, rgba(0,16,48,0.92) 0%, rgba(0,26,80,0.85) 45%, rgba(0,47,160,0.7) 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                padding: '72px 40px 80px', position: 'relative', overflow: 'hidden'
            }}>
                {/* Background decorations */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -80, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
                    <div style={{ position: 'absolute', bottom: -100, left: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)' }} />
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                </div>

                <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 48, flexWrap: 'wrap' }}>

                        {/* Left: headline */}
                        <div style={{ maxWidth: 600 }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                                borderRadius: 100, padding: '6px 14px', marginBottom: 24
                            }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Free Professional Templates
                                </span>
                            </div>

                            <h1 style={{ margin: '0 0 20px', fontSize: 44, fontWeight: 900, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.03em' }}>
                                Application Samples
                                <br />
                                <span style={{
                                    background: 'linear-gradient(90deg, #60A5FA, #34D399)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    & Templates
                                </span>
                            </h1>

                            <p style={{ margin: '0 0 36px', fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', fontWeight: 400, maxWidth: 480 }}>
                                Professionally crafted templates for every career milestone. Copy, customise, and send — in minutes.
                            </p>

                            {/* Stats */}
                            <div style={{ display: 'flex', gap: 32 }}>
                                {[
                                    { value: '18+', label: 'Templates' },
                                    { value: '4.8★', label: 'Avg Rating' },
                                    { value: '80k+', label: 'Downloads' },
                                ].map((s, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
                                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: featured card preview */}
                        <div style={{ flex: 1, minWidth: 280, maxWidth: 360 }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 20, padding: '20px 22px',
                                backdropFilter: 'blur(12px)',
                                animation: 'float 4s ease-in-out infinite'
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                                    ✦ Featured Template
                                </div>
                                <div style={{ fontSize: 15.5, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{featuredTemplate.title}</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 16 }}>
                                    {featuredTemplate.description}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {featuredTemplate.tags.map(t => (
                                        <span key={t} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontWeight: 700 }}>{t}</span>
                                    ))}
                                </div>
                                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>12.4k uses · ⭐ 4.9</div>
                                    <button onClick={() => setPreview(featuredTemplate)} style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '8px 14px', borderRadius: 10,
                                        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                                        color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                    }}>
                                        <FiEye size={13} /> Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SEARCH + FILTERS ── */}
            <div ref={searchRef} style={{
                background: '#fff', borderBottom: '1px solid #E8EDF5',
                boxShadow: '0 4px 20px rgba(0,30,80,0.05)', position: 'sticky', top: 72, zIndex: 90
            }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                        <FiSearch size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search templates…"
                            style={{
                                width: '100%', paddingLeft: 42, paddingRight: 16,
                                paddingTop: 10, paddingBottom: 10,
                                fontSize: 13.5, fontWeight: 500, color: '#1E293B',
                                background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                                borderRadius: 12, outline: 'none', fontFamily: 'inherit',
                                transition: 'border-color 0.18s', boxSizing: 'border-box'
                            }}
                            onFocus={e => e.target.style.borderColor = '#93C5FD'}
                            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        />
                    </div>

                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FiFilter size={14} color="#94A3B8" style={{ marginRight: 2 }} />
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                                padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 700,
                                border: activeCategory === cat.id ? '1.5px solid #002366' : '1.5px solid #E2E8F0',
                                background: activeCategory === cat.id ? '#002366' : '#fff',
                                color: activeCategory === cat.id ? '#fff' : '#64748B',
                                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                {cat.label}
                                <span style={{
                                    fontSize: 10.5, fontWeight: 800,
                                    padding: '1px 6px', borderRadius: 100,
                                    background: activeCategory === cat.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                                    color: activeCategory === cat.id ? '#fff' : '#94A3B8'
                                }}>
                                    {cat.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── GRID ── */}
            <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 40px 100px' }}>

                {/* Results count */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>
                        Showing <strong style={{ color: '#0F172A' }}>{filtered.length}</strong> templates
                        {search && <> for "<strong style={{ color: '#002366' }}>{search}</strong>"</>}
                    </div>
                    {(search || activeCategory !== 'all') && (
                        <button onClick={() => { setSearch(''); setActiveCategory('all'); }} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 13, fontWeight: 700, color: '#64748B',
                            background: '#F1F5F9', border: '1px solid #E2E8F0',
                            padding: '6px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                            <FiX size={13} /> Clear filters
                        </button>
                    )}
                </div>

                {filtered.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 22 }}>
                        {filtered.map((t, i) => (
                            <TemplateCard key={t.id} template={t} index={i} onPreview={setPreview} />
                        ))}
                    </div>
                ) : (
                    /* Empty state */
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '80px 24px',
                        background: '#fff', borderRadius: 24,
                        border: '1px solid #E2E8F0'
                    }}>
                        <div style={{ width: 72, height: 72, borderRadius: 20, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <FiFileText size={32} color="#CBD5E1" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>No templates found</h3>
                        <p style={{ margin: '10px 0 28px', fontSize: 14.5, color: '#64748B', textAlign: 'center', maxWidth: 320 }}>
                            Try a different search term or browse all categories.
                        </p>
                        <button onClick={() => { setSearch(''); setActiveCategory('all'); }} style={{
                            padding: '11px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                            background: 'linear-gradient(135deg,#001a50,#0F3DB5)',
                            color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: '0 4px 16px rgba(0,35,102,0.28)'
                        }}>
                            Browse all templates
                        </button>
                    </div>
                )}

                {/* Bottom CTA */}
                <div style={{
                    marginTop: 64, padding: '48px 52px',
                    background: 'linear-gradient(135deg, #001030 0%, #001a50 50%, #002fa0 100%)',
                    borderRadius: 28, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 32, flexWrap: 'wrap',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10 }}>
                            Need a custom template?
                        </div>
                        <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: 500, maxWidth: 420 }}>
                            MavenPro experts can write personalised cover letters, resignation letters, and more — tailored to your profile and target role.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1, flexShrink: 0 }}>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '13px 24px', borderRadius: 14,
                            background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.18)',
                            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                            <FiBookmark size={15} /> View Saved
                        </button>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '13px 24px', borderRadius: 14,
                            background: 'linear-gradient(135deg,#10B981,#059669)',
                            border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: '0 4px 20px rgba(16,185,129,0.36)'
                        }}>
                            <FiZap size={15} /> Get Expert Help <FiChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </main>

            {/* ── PREVIEW MODAL ── */}
            {preview && <PreviewModal template={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}