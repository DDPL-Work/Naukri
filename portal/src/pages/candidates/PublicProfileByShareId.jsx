import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import Loading from "../../components/Loading";

import {
  FiMapPin, FiMail, FiPhone, FiBriefcase, FiCheckCircle, FiArrowRight,
  FiEye, FiCalendar, FiDollarSign, FiGlobe, FiDownload, FiLinkedin,
  FiExternalLink, FiBookOpen, FiCode, FiAward, FiClock, FiUserPlus,
  FiSend, FiCopy
} from "react-icons/fi";
import { FaLinkedinIn, FaGithub, FaGraduationCap, FaBriefcase } from "react-icons/fa";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";

import "./PublicProfileByShareId.css";

const safeUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "";
};

const getInitials = (name) => {
  return String(name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
};

const ProfileSection = ({ title, icon, children, empty = false }) => {
  if (empty) return null;
  return (
    <div className="pp-section">
      <div className="pp-section-header">
        {icon && <span className="pp-section-icon">{icon}</span>}
        <h2 className="pp-section-title">{title}</h2>
      </div>
      <div className="pp-section-body">
        {children}
      </div>
    </div>
  );
};

export default function PublicProfileByShareId() {
  const { shareId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const isValidShareId = useMemo(() => {
    return typeof shareId === "string" && shareId.trim().length > 0;
  }, [shareId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError("");
      setProfile(null);

      try {
        if (!isValidShareId) {
          setError("Invalid share link.");
          return;
        }

        const res = await authService.getPublicCandidateProfileByShareId(shareId);
        if (!active) return;

        const publicProfile = res?.data?.profile;
        if (!publicProfile) {
          setError("Profile not found or unavailable.");
          return;
        }

        setProfile(publicProfile);
      } catch (e) {
        if (!active) return;
        if (e?.statusCode === 404) {
          setError("Profile not found or unavailable.");
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [shareId, isValidShareId]);

  if (isLoading) {
    return (
      <div className="pp-root">
        <div className="pp-center">
          <Loading size={48} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pp-root">
        <div className="pp-container">
          <nav className="pp-nav">
            <img src={mavenLogo} alt="MavenJobs" className="pp-nav-logo" />
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="pp-root">
      <nav className="pp-nav">
        <div className="pp-nav-inner">
          <img src={mavenLogo} alt="MavenJobs" className="pp-nav-logo" />
          <div className="pp-nav-actions">
            <button className="pp-btn pp-btn-ghost" onClick={handleCopyLink}>
              {copySuccess ? <><FiCheckCircle size={16} /> Copied</> : <><FiCopy size={16} /> Copy Link</>}
            </button>
            <button className="pp-btn pp-btn-outline" onClick={() => navigate("/jobs")}>
              Browse Jobs
            </button>
          </div>
        </div>
      </nav>

      <div className="pp-container">
        <div className="pp-hero">
          <div className="pp-cover" style={{ background: coverPicUrl
            ? `url(${coverPicUrl}) center/cover no-repeat`
            : "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
          }}>
            <div className="pp-cover-overlay" />
          </div>

          <div className="pp-hero-content">
            <div className="pp-hero-main">
              <div className="pp-avatar-section">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt={name} className="pp-avatar" />
                ) : (
                  <div className="pp-avatar pp-avatar-initials">
                    {initials}
                  </div>
                )}
                <div className="pp-avatar-badge">
                  <FiCheckCircle size={18} />
                </div>
              </div>

              <div className="pp-hero-info">
                <h1 className="pp-name">{name}</h1>
                {headline && <div className="pp-headline">{headline}</div>}
                <div className="pp-hero-meta">
                  {location && (
                    <span className="pp-meta-item">
                      <FiMapPin size={14} /> {location}
                    </span>
                  )}
                  {totalExperience && (
                    <span className="pp-meta-item">
                      <FiBriefcase size={14} /> {totalExperience}
                    </span>
                  )}
                  {updatedAt && (
                    <span className="pp-meta-item">
                      <FiClock size={14} /> Updated {updatedAt}
                    </span>
                  )}
                </div>

                <div className="pp-hero-stats">
                  <div className="pp-stat">
                    <span className="pp-stat-value">{totalExperience || "—"}</span>
                    <span className="pp-stat-label">Experience</span>
                  </div>
                  <div className="pp-stat">
                    <span className="pp-stat-value">{skills.length}</span>
                    <span className="pp-stat-label">Skills</span>
                  </div>
                  <div className="pp-stat">
                    <span className="pp-stat-value">{education ? "1" : "0"}</span>
                    <span className="pp-stat-label">Education</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pp-hero-actions">
              {email && (
                <a href={`mailto:${email}`} className="pp-btn pp-btn-primary">
                  <FiSend size={15} /> Email
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="pp-btn pp-btn-outline">
                  <FiPhone size={15} /> Call
                </a>
              )}
              {resumeUrl && (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="pp-btn pp-btn-outline">
                  <FiDownload size={15} /> Resume
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="pp-layout">
          <div className="pp-main-content">
            <ProfileSection title="About" icon={<FiEye size={16} />} empty={!sections.hasSummary}>
              <p className="pp-summary-text">{summary}</p>
            </ProfileSection>

            <ProfileSection title="Experience" icon={<FaBriefcase size={16} />} empty={!sections.hasExperience}>
              <div className="pp-experience-card">
                {(currentTitle || currentCompany) && (
                  <div className="pp-exp-item">
                    <div className="pp-exp-icon">
                      <FaBriefcase size={18} />
                    </div>
                    <div className="pp-exp-details">
                      <h3 className="pp-exp-title">{currentTitle || "Professional"}</h3>
                      {currentCompany && (
                        <div className="pp-exp-company">{currentCompany}</div>
                      )}
                      {totalExperience && (
                        <div className="pp-exp-period">
                          <FiCalendar size={13} />
                          <span>{totalExperience} total experience</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ProfileSection>

            <ProfileSection title="Education" icon={<FaGraduationCap size={16} />} empty={!sections.hasEducation}>
              <div className="pp-education-card">
                <div className="pp-edu-item">
                  <div className="pp-edu-icon">
                    <FaGraduationCap size={18} />
                  </div>
                  <div className="pp-edu-details">
                    <h3 className="pp-edu-degree">{education}</h3>
                  </div>
                </div>
              </div>
            </ProfileSection>

            <ProfileSection title="Skills" icon={<FiAward size={16} />} empty={!sections.hasSkills}>
              <div className="pp-skills-grid">
                {skills.map((s) => (
                  <span key={String(s)} className="pp-skill-pill">{s}</span>
                ))}
              </div>
            </ProfileSection>

            <ProfileSection title="IT Skills" icon={<FiCode size={16} />} empty={!sections.hasItSkills}>
              <div className="pp-it-skills">
                <p className="pp-it-skills-text">{itSkills}</p>
              </div>
            </ProfileSection>

            <ProfileSection title="Projects" icon={<FiBookOpen size={16} />} empty={!sections.hasProjects}>
              <div className="pp-project-card">
                {projectTitle && <h3 className="pp-project-title">{projectTitle}</h3>}
                {projectDescription && (
                  <p className="pp-project-desc">{projectDescription}</p>
                )}
                {projectLink && (
                  <a href={projectLink} target="_blank" rel="noopener noreferrer" className="pp-project-link">
                    <FiExternalLink size={14} /> View Project
                  </a>
                )}
              </div>
            </ProfileSection>

            <ProfileSection title="Additional Information" icon={<FiGlobe size={16} />} empty={!sections.hasAdditional}>
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
            </ProfileSection>
          </div>

          <aside className="pp-sidebar">
            <div className="pp-sidebar-card">
              <h3 className="pp-sidebar-card-title">Contact</h3>
              <div className="pp-contact-list">
                {email && (
                  <a href={`mailto:${email}`} className="pp-contact-item">
                    <FiMail size={15} />
                    <span>{email}</span>
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="pp-contact-item">
                    <FiPhone size={15} />
                    <span>{phone}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="pp-sidebar-card">
              <h3 className="pp-sidebar-card-title">Links</h3>
              <div className="pp-links-list">
                {linkedInUrl && (
                  <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="pp-link-item">
                    <FaLinkedinIn size={15} />
                    <span>LinkedIn</span>
                    <FiExternalLink size={12} className="pp-link-ext" />
                  </a>
                )}
                {portfolioUrl && (
                  <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="pp-link-item">
                    <FiGlobe size={15} />
                    <span>Portfolio</span>
                    <FiExternalLink size={12} className="pp-link-ext" />
                  </a>
                )}
                {resumeUrl && (
                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="pp-link-item">
                    <FiDownload size={15} />
                    <span>Resume</span>
                    <FiExternalLink size={12} className="pp-link-ext" />
                  </a>
                )}
              </div>
            </div>

            {(currentTitle || currentCompany) && (
              <div className="pp-sidebar-card pp-sidebar-card-highlight">
                <div className="pp-highlight-label">Currently</div>
                <div className="pp-highlight-title">{currentTitle || "Professional"}</div>
                {currentCompany && (
                  <div className="pp-highlight-sub">at {currentCompany}</div>
                )}
              </div>
            )}

            <div className="pp-sidebar-card pp-sidebar-cta">
              <h3 className="pp-sidebar-card-title">Looking to hire?</h3>
              <p className="pp-sidebar-cta-text">
                Connect with {name.split(" ")[0] || "this candidate"} for opportunities that match their profile.
              </p>
              <button className="pp-btn pp-btn-primary pp-btn-full" onClick={() => navigate("/employer-login")}>
                <FiUserPlus size={15} /> Connect
              </button>
            </div>
          </aside>
        </div>

        <footer className="pp-footer">
          <div className="pp-footer-inner">
            <img src={mavenLogo} alt="MavenJobs" className="pp-footer-logo" />
            <span className="pp-footer-text">Powered by MavenJobs — Professional Candidate Profiles</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
