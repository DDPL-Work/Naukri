import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import authService from "../../services/authService";
import Loading from "../../components/Loading";

import {
  FiMapPin, FiMail, FiPhone, FiBriefcase, FiCheckCircle, FiArrowRight,
  FiEye, FiCalendar, FiGlobe, FiDownload, FiExternalLink, FiBookOpen,
  FiCode, FiAward, FiClock, FiUserPlus, FiSend, FiCopy, FiLinkedin, FiStar
} from "react-icons/fi";
import { FaLinkedinIn, FaGraduationCap, FaBriefcase } from "react-icons/fa";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";

import "./PublicProfileByShareId.css";

gsap.registerPlugin(ScrollTrigger);

const safeUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "";
};

const getInitials = (name) => {
  return String(name || "C")
    .trim().split(/\s+/).slice(0, 2)
    .map((p) => p[0]).join("").toUpperCase();
};

function AnimatedCounter({ value, suffix = "", duration = 1.2 }) {
  const ref = useRef(null);
  const [displayed, setDisplayed] = useState("0");
  const hasAnimated = useRef(false);

  useEffect(() => {
    const num = parseInt(value, 10);
    if (isNaN(num)) { setDisplayed(value); return; }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: num,
          duration,
          ease: "power3.out",
          onUpdate: () => setDisplayed(Math.round(obj.val).toString()),
          onComplete: () => setDisplayed(num.toString()),
        });
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{displayed}{suffix}</span>;
}

function SkillBar({ name, index }) {
  const barRef = useRef(null);
  useEffect(() => {
    gsap.fromTo(barRef.current,
      { scaleX: 0, transformOrigin: "left center" },
      { scaleX: 1, duration: 0.6, delay: index * 0.04, ease: "power2.out" }
    );
  }, [index]);

  return (
    <span className="pp-skill-pill" ref={barRef}>
      {name}
    </span>
  );
}

export default function PublicProfileByShareId() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const navRef = useRef(null);
  const heroRef = useRef(null);
  const contentRef = useRef(null);
  const sectionsRef = useRef([]);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isValidShareId = useMemo(() => (
    typeof shareId === "string" && shareId.trim().length > 0
  ), [shareId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true); setError(""); setProfile(null);
      try {
        if (!isValidShareId) { setError("Invalid share link."); return; }
        const res = await authService.getPublicCandidateProfileByShareId(shareId);
        if (!active) return;
        const publicProfile = res?.data?.profile;
        if (!publicProfile) { setError("Profile not found or unavailable."); return; }
        setProfile(publicProfile);
        setLoaded(true);
      } catch (e) {
        if (!active) return;
        setError(e?.statusCode === 404 ? "Profile not found or unavailable." : "Failed to load profile.");
      } finally { if (active) setIsLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [shareId, isValidShareId]);

  useEffect(() => {
    if (!loaded || !profile) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(navRef.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4 }
    ).fromTo(heroRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 }, "-=0.1"
    ).fromTo(heroRef.current.querySelectorAll(".pp-anim-hero > *"),
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 }, "-=0.2"
    );

    const sections = sectionsRef.current.filter(Boolean);
    sections.forEach((el) => {
      gsap.fromTo(el,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" }
        }
      );
    });

    const statEls = heroRef.current?.querySelectorAll(".pp-stat");
    if (statEls?.length) {
      gsap.fromTo(statEls,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.7)" }
      );
    }

  }, [loaded, profile]);

  const addSectionRef = useCallback((el) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="pp-root" ref={rootRef}>
        <div className="pp-center">
          <Loading size={48} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pp-root" ref={rootRef}>
        <div className="pp-container">
          <nav className="pp-nav" ref={navRef}>
            <div className="pp-nav-inner">
              <img src={mavenLogo} alt="MavenJobs" className="pp-nav-logo" />
            </div>
          </nav>
          <div className="pp-error-card">
            <div className="pp-error-code">404</div>
            <div className="pp-error-title">{error}</div>
            <div className="pp-error-sub">The link may be invalid or the profile is no longer available.</div>
            <button className="pp-btn pp-btn-primary" onClick={() => navigate("/")}>
              Browse Jobs <FiArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const name = profile?.user?.name || "Candidate";
  const initials = getInitials(name);
  const headline = profile?.headline || "";
  const location = [profile?.currentCity, profile?.currentState].filter(Boolean).join(", ") || "";
  const phone = profile?.phone || profile?.altPhone || "";
  const email = profile?.user?.email || "";
  const totalExperience = profile?.totalExperience || "";
  const currentTitle = profile?.currentTitle || "";
  const currentCompany = profile?.currentCompany || "";
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const summary = profile?.summary || "";
  const linkedInUrl = safeUrl(profile?.linkedInUrl);
  const portfolioUrl = safeUrl(profile?.portfolioUrl);
  const resumeUrl = safeUrl(profile?.resume?.url);
  const profilePicUrl = safeUrl(profile?.profilePic?.url);
  const coverPicUrl = safeUrl(profile?.coverPic?.url);
  const education = profile?.education || "";
  const itSkills = profile?.itSkills || "";
  const projectTitle = profile?.projectTitle || "";
  const projectLink = safeUrl(profile?.projectLink);
  const projectDescription = profile?.projectDescription || "";
  const preferredLocations = Array.isArray(profile?.preferredLocations) ? profile.preferredLocations : [];
  const noticePeriod = profile?.noticePeriod || "";
  const expectedSalary = profile?.expectedSalary || "";
  const updatedAt = profile?.lastUpdated || profile?.updatedAt || "";

  const sections = {
    hasSummary: summary.length > 0,
    hasExperience: !!(currentTitle || currentCompany || totalExperience),
    hasEducation: education.length > 0,
    hasSkills: skills.length > 0,
    hasItSkills: itSkills.length > 0,
    hasProjects: !!(projectTitle || projectDescription),
    hasAdditional: !!(preferredLocations.length || noticePeriod || expectedSalary),
  };

  const Section = ({ title, icon, children, empty = false }) => {
    if (empty) return null;
    return (
      <div className="pp-section" ref={addSectionRef}>
        <div className="pp-section-header">
          {icon && <span className="pp-section-icon">{icon}</span>}
          <h2 className="pp-section-title">{title}</h2>
          <div className="pp-section-line" />
        </div>
        <div className="pp-section-body">{children}</div>
      </div>
    );
  };

  const extNum = totalExperience ? parseInt(totalExperience, 10) : 0;

  return (
    <div className="pp-root" ref={rootRef}>
      <nav className="pp-nav" ref={navRef}>
        <div className="pp-nav-inner">
          <div className="pp-nav-brand">
            <img src={mavenLogo} alt="MavenJobs" className="pp-nav-logo" />
            <span className="pp-nav-divider" />
            <span className="pp-nav-tag">Candidate Profile</span>
          </div>
          <div className="pp-nav-actions">
            <button className="pp-btn pp-btn-ghost" onClick={handleCopyLink}>
              {copySuccess ? <><FiCheckCircle size={15} /> Copied</> : <><FiCopy size={15} /> Copy Link</>}
            </button>
            <button className="pp-btn pp-btn-outline" onClick={() => navigate("/jobs")}>
              Browse Jobs
            </button>
          </div>
        </div>
      </nav>

      <div className="pp-container">
        <div className="pp-hero" ref={heroRef}>
          <div
            className="pp-cover"
            style={{
              background: coverPicUrl
                ? `url(${coverPicUrl}) center/cover no-repeat`
                : "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
            }}
          >
            <div className="pp-cover-overlay" />
            <div className="pp-cover-shine" />
          </div>

          <div className="pp-hero-content pp-anim-hero">
            <div className="pp-hero-main">
              <div className="pp-avatar-section">
                <div className="pp-avatar-ring">
                  {profilePicUrl ? (
                    <img src={profilePicUrl} alt={name} className="pp-avatar" />
                  ) : (
                    <div className="pp-avatar pp-avatar-initials">{initials}</div>
                  )}
                </div>
                <div className="pp-avatar-badge">
                  <FiCheckCircle size={16} />
                </div>
              </div>

              <div className="pp-hero-info">
                <h1 className="pp-name">{name}</h1>
                {headline && <div className="pp-headline">{headline}</div>}
                <div className="pp-hero-meta">
                  {location && (
                    <span className="pp-meta-item"><FiMapPin size={13} /> {location}</span>
                  )}
                  {totalExperience && (
                    <span className="pp-meta-item"><FiBriefcase size={13} /> {totalExperience}</span>
                  )}
                  {updatedAt && (
                    <span className="pp-meta-item"><FiClock size={13} /> Updated {updatedAt}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pp-hero-stats">
              <div className="pp-stat">
                <span className="pp-stat-value">
                  {totalExperience ? <AnimatedCounter value={extNum} suffix="+" /> : "—"}
                </span>
                <span className="pp-stat-label">Years Exp.</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-value">
                  <AnimatedCounter value={skills.length} />
                </span>
                <span className="pp-stat-label">Skills</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-value">
                  <AnimatedCounter value={education ? 1 : 0} />
                </span>
                <span className="pp-stat-label">Education</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-value">
                  <FiStar size={16} className="pp-stat-star" />
                </span>
                <span className="pp-stat-label">Verified</span>
              </div>
            </div>

            <div className="pp-hero-actions">
              {email && (
                <a href={`mailto:${email}`} className="pp-btn pp-btn-primary">
                  <FiSend size={14} /> Email
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="pp-btn pp-btn-outline">
                  <FiPhone size={14} /> Call
                </a>
              )}
              {resumeUrl && (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="pp-btn pp-btn-outline">
                  <FiDownload size={14} /> Resume
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="pp-layout" ref={contentRef}>
          <div className="pp-main-content">
            <Section title="About" icon={<FiEye size={15} />} empty={!sections.hasSummary}>
              <p className="pp-summary-text">{summary}</p>
            </Section>

            <Section title="Experience" icon={<FaBriefcase size={15} />} empty={!sections.hasExperience}>
              <div className="pp-timeline">
                <div className="pp-timeline-dot" />
                <div className="pp-exp-card">
                  <div className="pp-exp-icon-wrap">
                    <FaBriefcase size={18} />
                  </div>
                  <div className="pp-exp-body">
                    <h3 className="pp-exp-title">{currentTitle || "Professional"}</h3>
                    {currentCompany && <div className="pp-exp-company">{currentCompany}</div>}
                    {totalExperience && (
                      <div className="pp-exp-period">
                        <FiCalendar size={12} />
                        <span>{totalExperience} total experience</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Education" icon={<FaGraduationCap size={15} />} empty={!sections.hasEducation}>
              <div className="pp-timeline">
                <div className="pp-timeline-dot" />
                <div className="pp-exp-card">
                  <div className="pp-exp-icon-wrap pp-edu-icon-wrap">
                    <FaGraduationCap size={18} />
                  </div>
                  <div className="pp-exp-body">
                    <h3 className="pp-exp-title">{education}</h3>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Skills" icon={<FiAward size={15} />} empty={!sections.hasSkills}>
              <div className="pp-skills-grid">
                {skills.map((s, i) => (
                  <SkillBar key={String(s)} name={s} index={i} />
                ))}
              </div>
            </Section>

            <Section title="IT Skills" icon={<FiCode size={15} />} empty={!sections.hasItSkills}>
              <div className="pp-it-skills">
                <p className="pp-it-skills-text">{itSkills}</p>
              </div>
            </Section>

            <Section title="Projects" icon={<FiBookOpen size={15} />} empty={!sections.hasProjects}>
              <div className="pp-project-card">
                {projectTitle && <h3 className="pp-project-title">{projectTitle}</h3>}
                {projectDescription && <p className="pp-project-desc">{projectDescription}</p>}
                {projectLink && (
                  <a href={projectLink} target="_blank" rel="noopener noreferrer" className="pp-project-link">
                    <FiExternalLink size={13} /> View Project
                  </a>
                )}
              </div>
            </Section>

            <Section title="Additional Information" icon={<FiGlobe size={15} />} empty={!sections.hasAdditional}>
              <div className="pp-additional-grid">
                {preferredLocations.length > 0 && (
                  <div className="pp-additional-item">
                    <span className="pp-additional-label">Preferred Locations</span>
                    <span className="pp-additional-value">{preferredLocations.join(", ")}</span>
                  </div>
                )}
                {noticePeriod && (
                  <div className="pp-additional-item">
                    <span className="pp-additional-label">Notice Period</span>
                    <span className="pp-additional-value">{noticePeriod}</span>
                  </div>
                )}
                {expectedSalary && (
                  <div className="pp-additional-item">
                    <span className="pp-additional-label">Expected Salary</span>
                    <span className="pp-additional-value">{expectedSalary}</span>
                  </div>
                )}
              </div>
            </Section>
          </div>

          <aside className="pp-sidebar">
            <div className="pp-sidebar-card" ref={addSectionRef}>
              <h3 className="pp-sidebar-card-title">Contact</h3>
              <div className="pp-contact-list">
                {email && (
                  <a href={`mailto:${email}`} className="pp-contact-item">
                    <div className="pp-contact-icon"><FiMail size={14} /></div>
                    <span>{email}</span>
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="pp-contact-item">
                    <div className="pp-contact-icon"><FiPhone size={14} /></div>
                    <span>{phone}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="pp-sidebar-card" ref={addSectionRef}>
              <h3 className="pp-sidebar-card-title">Links</h3>
              <div className="pp-links-list">
                {linkedInUrl && (
                  <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="pp-link-item">
                    <div className="pp-link-icon pp-link-icon-li"><FaLinkedinIn size={14} /></div>
                    <span>LinkedIn</span>
                    <FiExternalLink size={11} className="pp-link-ext" />
                  </a>
                )}
                {portfolioUrl && (
                  <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="pp-link-item">
                    <div className="pp-link-icon pp-link-icon-portfolio"><FiGlobe size={14} /></div>
                    <span>Portfolio</span>
                    <FiExternalLink size={11} className="pp-link-ext" />
                  </a>
                )}
                {resumeUrl && (
                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="pp-link-item">
                    <div className="pp-link-icon pp-link-icon-resume"><FiDownload size={14} /></div>
                    <span>Resume</span>
                    <FiExternalLink size={11} className="pp-link-ext" />
                  </a>
                )}
              </div>
            </div>

            {(currentTitle || currentCompany) && (
              <div className="pp-sidebar-card pp-sidebar-card-highlight" ref={addSectionRef}>
                <div className="pp-highlight-badge">Currently</div>
                <div className="pp-highlight-title">{currentTitle || "Professional"}</div>
                {currentCompany && <div className="pp-highlight-sub">at {currentCompany}</div>}
              </div>
            )}

            <div className="pp-sidebar-card pp-sidebar-cta" ref={addSectionRef}>
              <div className="pp-cta-glow" />
              <h3 className="pp-sidebar-card-title">Looking to hire?</h3>
              <p className="pp-sidebar-cta-text">
                Connect with {name.split(" ")[0] || "this candidate"} for opportunities that match their profile.
              </p>
              <button className="pp-btn pp-btn-primary pp-btn-full" onClick={() => navigate("/employer-login")}>
                <FiUserPlus size={14} /> Connect
              </button>
            </div>
          </aside>
        </div>

        <footer className="pp-footer">
          <div className="pp-footer-inner">
            <div className="pp-footer-dot" />
            <img src={mavenLogo} alt="MavenJobs" className="pp-footer-logo" />
            <span className="pp-footer-text">Powered by MavenJobs — Professional Candidate Profiles</span>
            <div className="pp-footer-dot" />
          </div>
        </footer>
      </div>
    </div>
  );
}
