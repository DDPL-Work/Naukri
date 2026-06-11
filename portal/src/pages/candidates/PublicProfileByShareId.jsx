import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import authService from "../../services/authService";
import Loading from "../../components/Loading";

import {
  FiMapPin, FiMail, FiPhone, FiBriefcase, FiCheckCircle,
  FiArrowRight, FiEye, FiCalendar, FiGlobe, FiDownload,
  FiExternalLink, FiBookOpen, FiCode, FiAward, FiClock,
  FiUserPlus, FiSend, FiCopy, FiStar, FiZap,
} from "react-icons/fi";
import { FaLinkedinIn, FaGraduationCap, FaBriefcase } from "react-icons/fa";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";
import "./PublicProfileByShareId.css";

gsap.registerPlugin(ScrollTrigger);

/* ── helpers ── */
const safeUrl = (v) => {
  const u = String(v || "").trim();
  return (u.startsWith("http://") || u.startsWith("https://")) ? u : "";
};

const getInitials = (name) =>
  String(name || "C").trim().split(/\s+/).slice(0, 2)
    .map((p) => p[0]).join("").toUpperCase();

/* ── Animated counter ── */
function Counter({ value, suffix = "", duration = 1.2 }) {
  const ref = useRef(null);
  const [disp, setDisp] = useState("0");
  const animated = useRef(false);

  useEffect(() => {
    const num = parseInt(value, 10);
    if (isNaN(num)) { setDisp(String(value)); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !animated.current) {
        animated.current = true;
        const o = { v: 0 };
        gsap.to(o, {
          v: num, duration, ease: "power3.out",
          onUpdate: () => setDisp(Math.round(o.v).toString()),
          onComplete: () => setDisp(num.toString()),
        });
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{disp}{suffix}</span>;
}

/* ── Section wrapper ── */
function Section({ title, icon, children, empty = false, addRef }) {
  if (empty) return null;
  return (
    <div className="pp-section" ref={addRef}>
      <div className="pp-section__hd">
        {icon && <span className="pp-section__icon">{icon}</span>}
        <h2 className="pp-section__title">{title}</h2>
        <div className="pp-section__line" />
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function PublicProfileByShareId() {
  const { shareId } = useParams();
  const navigate = useNavigate();

  const rootRef = useRef(null);
  const navRef = useRef(null);
  const heroRef = useRef(null);
  const sectionsRef = useRef([]);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isValidId = useMemo(() =>
    typeof shareId === "string" && shareId.trim().length > 0,
    [shareId]);

  /* ── Fetch ── */
  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true); setError(""); setProfile(null);
      try {
        if (!isValidId) { setError("Invalid share link."); return; }
        const res = await authService.getPublicCandidateProfileByShareId(shareId);
        if (!active) return;
        const p = res?.data?.profile;
        if (!p) { setError("Profile not found or unavailable."); return; }
        setProfile(p);
        setLoaded(true);
      } catch (e) {
        if (!active) return;
        setError(e?.statusCode === 404
          ? "Profile not found or unavailable."
          : "Failed to load profile.");
      } finally { if (active) setIsLoading(false); }
    })();
    return () => { active = false; };
  }, [shareId, isValidId]);

  /* ── GSAP entrance ── */
  useEffect(() => {
    if (!loaded || !profile) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(navRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45 }
      ).fromTo(heroRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55 }, "-=0.15"
      ).fromTo(heroRef.current.querySelectorAll(".pp-anim > *"),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.07 }, "-=0.25"
      );

      sectionsRef.current.filter(Boolean).forEach((el) => {
        gsap.fromTo(el,
          { y: 36, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.5, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
          }
        );
      });

      gsap.fromTo(heroRef.current?.querySelectorAll(".pp-stat"),
        { scale: 0.75, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.45, stagger: 0.09, ease: "back.out(1.8)", delay: 0.4 }
      );
    }, rootRef);

    return () => ctx.revert();
  }, [loaded, profile]);

  const addRef = useCallback((el) => {
    if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="pp-root" ref={rootRef}>
        <div className="pp-center">
          <Loading variant="spinner" fullScreen={false} />
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="pp-root" ref={rootRef}>
        <nav className="pp-nav" ref={navRef}>
          <div className="pp-nav__inner">
            <div className="pp-nav__brand">
              <img src={mavenLogo} alt="MavenJobs" className="pp-nav__logo" />
            </div>
          </div>
        </nav>
        <div className="pp-container">
          <div className="pp-error">
            <div className="pp-error__code">404</div>
            <div className="pp-error__title">{error}</div>
            <div className="pp-error__sub">
              The link may be invalid or the profile is no longer available.
            </div>
            <button className="pp-btn pp-btn--primary" onClick={() => navigate("/")}>
              Browse Jobs <FiArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  /* ── Data extraction ── */
  const name = profile?.user?.name || "Candidate";
  const initials = getInitials(name);
  const headline = profile?.headline || "";
  const location = [profile?.currentCity, profile?.currentState].filter(Boolean).join(", ");
  const phone = profile?.phone || profile?.altPhone || "";
  const email = profile?.user?.email || "";
  const totalExp = profile?.totalExperience || "";
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
  const projectDesc = profile?.projectDescription || "";
  const preferredLocs = Array.isArray(profile?.preferredLocations) ? profile.preferredLocations : [];
  const noticePeriod = profile?.noticePeriod || "";
  const expectedSalary = profile?.expectedSalary || "";
  const updatedAt = profile?.lastUpdated || profile?.updatedAt || "";
  const expNum = totalExp ? parseInt(totalExp, 10) : 0;

  const has = {
    summary: summary.length > 0,
    experience: !!(currentTitle || currentCompany || totalExp),
    education: education.length > 0,
    skills: skills.length > 0,
    itSkills: itSkills.length > 0,
    projects: !!(projectTitle || projectDesc),
    additional: !!(preferredLocs.length || noticePeriod || expectedSalary),
    links: !!(linkedInUrl || portfolioUrl || resumeUrl),
    contact: !!(email || phone),
  };

  return (
    <div className="pp-root" ref={rootRef}>

      {/* ── NAV ── */}
      <nav className="pp-nav" ref={navRef}>
        <div className="pp-nav__inner">
          <div className="pp-nav__brand">
            <img src={mavenLogo} alt="MavenJobs" className="pp-nav__logo" />
            <span className="pp-nav__divider" />
            <span className="pp-nav__tag">Candidate Profile</span>
          </div>
          <div className="pp-nav__actions">
            <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={handleCopy}>
              {copied
                ? <><FiCheckCircle size={14} /> Copied!</>
                : <><FiCopy size={14} /> Share</>}
            </button>
            <button className="pp-btn pp-btn--outline pp-btn--sm" onClick={() => navigate("/jobs")}>
              Browse Jobs
            </button>
          </div>
        </div>
      </nav>

      <div className="pp-container">

        {/* ── HERO ── */}
        <div className="pp-hero" ref={heroRef}>

          {/* Cover */}
          <div
            className="pp-cover"
            style={{
              background: coverPicUrl
                ? `url(${coverPicUrl}) center/cover no-repeat`
                : "linear-gradient(135deg, #0a244d 0%, #143f86 50%, #1d55b3 80%, #2ea9c4 100%)",
            }}
          >
            <div className="pp-cover__overlay" />
            <div className="pp-cover__grid" />
            <div className="pp-cover__shine" />
          </div>

          {/* Body */}
          <div className="pp-hero__body">
            <div className="pp-hero__top pp-anim">

              {/* Avatar */}
              <div className="pp-avatar-wrap">
                <div className="pp-avatar-ring">
                  {profilePicUrl
                    ? <img src={profilePicUrl} alt={name} className="pp-avatar" />
                    : <div className="pp-avatar pp-avatar--initials">{initials}</div>
                  }
                </div>
                <div className="pp-avatar__badge">
                  <FiCheckCircle size={15} />
                </div>
              </div>

              {/* Info */}
              <div className="pp-hero__info">
                <h1 className="pp-hero__name">{name}</h1>
                {headline && <p className="pp-hero__headline">{headline}</p>}
                <div className="pp-hero__meta">
                  {location && (
                    <span className="pp-meta-item">
                      <FiMapPin size={13} /> {location}
                    </span>
                  )}
                  {totalExp && (
                    <span className="pp-meta-item">
                      <FiBriefcase size={13} /> {totalExp}
                    </span>
                  )}
                  {updatedAt && (
                    <span className="pp-meta-item">
                      <FiClock size={13} /> Updated {updatedAt}
                    </span>
                  )}
                  <span className="pp-verified-badge">
                    <FiCheckCircle size={12} /> Verified Profile
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="pp-hero__stats pp-anim">
              <div className="pp-stat">
                <span className="pp-stat__val">
                  {totalExp ? <Counter value={expNum} suffix="+" /> : "—"}
                </span>
                <span className="pp-stat__label">Years Exp.</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat__val">
                  <Counter value={skills.length} />
                </span>
                <span className="pp-stat__label">Skills</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat__val">
                  <Counter value={education ? 1 : 0} />
                </span>
                <span className="pp-stat__label">Education</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat__val pp-stat__star">
                  <FiStar size={20} />
                </span>
                <span className="pp-stat__label">Verified</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pp-hero__actions pp-anim">
              {email && (
                <a href={`mailto:${email}`} className="pp-btn pp-btn--primary">
                  <FiSend size={14} /> Email Candidate
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="pp-btn pp-btn--outline">
                  <FiPhone size={14} /> Call
                </a>
              )}
              {resumeUrl && (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="pp-btn pp-btn--outline">
                  <FiDownload size={14} /> Resume
                </a>
              )}
              {linkedInUrl && (
                <a href={linkedInUrl} target="_blank" rel="noopener noreferrer"
                  className="pp-btn pp-btn--outline">
                  <FaLinkedinIn size={13} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── LAYOUT ── */}
        <div className="pp-layout">

          {/* Main */}
          <div className="pp-main">

            <Section title="About" icon={<FiEye size={15} />}
              empty={!has.summary} addRef={addRef}>
              <p className="pp-summary">{summary}</p>
            </Section>

            <Section title="Experience" icon={<FaBriefcase size={15} />}
              empty={!has.experience} addRef={addRef}>
              <div className="pp-timeline">
                <div className="pp-timeline__dot" />
                <div className="pp-timeline__line" />
                <div className="pp-exp-card">
                  <div className="pp-exp-icon pp-exp-icon--work">
                    <FaBriefcase size={19} />
                  </div>
                  <div className="pp-exp-body">
                    <h3 className="pp-exp-title">{currentTitle || "Professional"}</h3>
                    {currentCompany && (
                      <div className="pp-exp-company">{currentCompany}</div>
                    )}
                    {totalExp && (
                      <div className="pp-exp-period">
                        <FiCalendar size={11} /> {totalExp} total experience
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Education" icon={<FaGraduationCap size={15} />}
              empty={!has.education} addRef={addRef}>
              <div className="pp-timeline">
                <div className="pp-timeline__dot" />
                <div className="pp-exp-card">
                  <div className="pp-exp-icon pp-exp-icon--edu">
                    <FaGraduationCap size={19} />
                  </div>
                  <div className="pp-exp-body">
                    <h3 className="pp-exp-title">{education}</h3>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Skills" icon={<FiAward size={15} />}
              empty={!has.skills} addRef={addRef}>
              <div className="pp-skills-wrap">
                {skills.map((s, i) => (
                  <span
                    key={String(s) + i}
                    className="pp-skill-pill"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>

            <Section title="IT Skills" icon={<FiCode size={15} />}
              empty={!has.itSkills} addRef={addRef}>
              <div className="pp-it-skills">{itSkills}</div>
            </Section>

            <Section title="Projects" icon={<FiBookOpen size={15} />}
              empty={!has.projects} addRef={addRef}>
              <div className="pp-project">
                {projectTitle && (
                  <h3 className="pp-project__title">{projectTitle}</h3>
                )}
                {projectDesc && (
                  <p className="pp-project__desc">{projectDesc}</p>
                )}
                {projectLink && (
                  <a href={projectLink} target="_blank" rel="noopener noreferrer"
                    className="pp-project__link">
                    <FiExternalLink size={13} /> View Project
                  </a>
                )}
              </div>
            </Section>

            <Section title="Additional Information" icon={<FiGlobe size={15} />}
              empty={!has.additional} addRef={addRef}>
              <div className="pp-add-grid">
                {preferredLocs.length > 0 && (
                  <div className="pp-add-row">
                    <span className="pp-add-label">Preferred Locations</span>
                    <span className="pp-add-value">{preferredLocs.join(", ")}</span>
                  </div>
                )}
                {noticePeriod && (
                  <div className="pp-add-row">
                    <span className="pp-add-label">Notice Period</span>
                    <span className="pp-add-value">{noticePeriod}</span>
                  </div>
                )}
                {expectedSalary && (
                  <div className="pp-add-row">
                    <span className="pp-add-label">Expected Salary</span>
                    <span className="pp-add-value">{expectedSalary}</span>
                  </div>
                )}
              </div>
            </Section>

          </div>

          {/* Sidebar */}
          <aside className="pp-sidebar">

            {/* Contact */}
            {has.contact && (
              <div className="pp-sidebar-card" ref={addRef}>
                <p className="pp-sidebar-card__title">Contact</p>
                <div className="pp-contact-list">
                  {email && (
                    <a href={`mailto:${email}`} className="pp-contact-row">
                      <div className="pp-contact-icon"><FiMail size={14} /></div>
                      <span>{email}</span>
                    </a>
                  )}
                  {phone && (
                    <a href={`tel:${phone}`} className="pp-contact-row">
                      <div className="pp-contact-icon"><FiPhone size={14} /></div>
                      <span>{phone}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            {has.links && (
              <div className="pp-sidebar-card" ref={addRef}>
                <p className="pp-sidebar-card__title">Links</p>
                <div className="pp-links-list">
                  {linkedInUrl && (
                    <a href={linkedInUrl} target="_blank" rel="noopener noreferrer"
                      className="pp-link-row">
                      <div className="pp-link-icon pp-link-icon--li">
                        <FaLinkedinIn size={14} />
                      </div>
                      <span>LinkedIn</span>
                      <FiExternalLink size={11} className="pp-link-ext" />
                    </a>
                  )}
                  {portfolioUrl && (
                    <a href={portfolioUrl} target="_blank" rel="noopener noreferrer"
                      className="pp-link-row">
                      <div className="pp-link-icon pp-link-icon--web">
                        <FiGlobe size={14} />
                      </div>
                      <span>Portfolio</span>
                      <FiExternalLink size={11} className="pp-link-ext" />
                    </a>
                  )}
                  {resumeUrl && (
                    <a href={resumeUrl} target="_blank" rel="noopener noreferrer"
                      className="pp-link-row">
                      <div className="pp-link-icon pp-link-icon--file">
                        <FiDownload size={14} />
                      </div>
                      <span>Resume / CV</span>
                      <FiExternalLink size={11} className="pp-link-ext" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Currently working */}
            {(currentTitle || currentCompany) && (
              <div className="pp-sidebar-card pp-currently-card" ref={addRef}>
                <div className="pp-currently-badge">Currently</div>
                <div className="pp-currently-title">
                  {currentTitle || "Professional"}
                </div>
                {currentCompany && (
                  <div className="pp-currently-sub">at {currentCompany}</div>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="pp-sidebar-card pp-cta-card" ref={addRef}>
              <div className="pp-cta-card__orb" style={{
                width: 140, height: 140, top: -40, right: -40,
                background: "radial-gradient(circle, rgba(214,243,61,.18), transparent 70%)",
              }} />
              <div className="pp-cta-card__orb" style={{
                width: 100, height: 100, bottom: -20, left: -20,
                background: "radial-gradient(circle, rgba(46,169,196,.18), transparent 70%)",
              }} />
              <h3 className="pp-cta-card__title">Looking to hire?</h3>
              <p className="pp-cta-card__sub">
                Connect with {name.split(" ")[0] || "this candidate"} and unlock
                high-quality talent on MavenJobs.
              </p>
              <button
                className="pp-btn pp-btn--lime pp-btn--full"
                onClick={() => navigate("/employer-login")}
              >
                <FiUserPlus size={14} /> Connect Now
              </button>
            </div>

          </aside>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pp-footer">
          <div className="pp-footer__dot" />
          <img src={mavenLogo} alt="MavenJobs" className="pp-footer__logo" />
          <span className="pp-footer__text">
            Powered by MavenJobs — Professional Candidate Profiles
          </span>
          <div className="pp-footer__dot" />
        </footer>

      </div>
    </div>
  );
}