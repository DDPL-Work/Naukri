import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { gsap } from "gsap";
import { FiArrowLeft, FiArrowRight, FiBriefcase, FiCheckCircle, FiHelpCircle, FiLock, FiShield, FiUsers } from "react-icons/fi";
import mavenLogo from "../../../assets/maven-logo-BdiSsfJk.svg";

const PAGE_CONTENT = {
  about: {
    icon: FiUsers,
    title: "About Maven Jobs",
    intro: "Maven Jobs connects candidates and employers through verified roles, cleaner discovery, and practical hiring workflows.",
    points: ["Verified employer profiles", "Dynamic job discovery", "Candidate-first application tracking"],
  },
  press: {
    icon: FiBriefcase,
    title: "Press",
    intro: "Company updates, product milestones, hiring market insights, and brand resources for media partners.",
    points: ["Platform announcements", "Hiring trend notes", "Brand and media contacts"],
  },
  careers: {
    icon: FiCheckCircle,
    title: "Careers at Maven",
    intro: "Build the next generation of career infrastructure with a team focused on trust, clarity, and execution.",
    points: ["Product and engineering roles", "Growth and customer teams", "Flexible workplace culture"],
  },
  contact: {
    icon: FiHelpCircle,
    title: "Contact",
    intro: "Reach the Maven Jobs team for candidate support, employer help, partnerships, or product feedback.",
    points: ["Candidate support", "Employer assistance", "Partnership enquiries"],
  },
  privacy: {
    icon: FiLock,
    title: "Privacy Policy",
    intro: "How Maven Jobs handles candidate, employer, application, and profile data across the platform.",
    points: ["Profile data controls", "Application data handling", "Security-first retention"],
  },
  terms: {
    icon: FiShield,
    title: "Terms of Service",
    intro: "The usage terms for candidates, employers, and visitors using Maven Jobs products and services.",
    points: ["Account responsibilities", "Acceptable platform use", "Service availability"],
  },
  cookies: {
    icon: FiLock,
    title: "Cookie Settings",
    intro: "Manage how Maven Jobs uses cookies for authentication, preferences, analytics, and platform reliability.",
    points: ["Essential cookies", "Preference storage", "Analytics controls"],
  },
};

export default function FooterPage() {
  const { slug = "about" } = useParams();
  const pageRef = useRef(null);
  const content = useMemo(() => PAGE_CONTENT[slug] || PAGE_CONTENT.about, [slug]);
  const Icon = content.icon;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-footer-animate]", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
      });
    }, pageRef);
    return () => ctx.revert();
  }, [slug]);

  return (
    <main ref={pageRef} style={{ minHeight: "100vh", background: "#f5f8fc", color: "#0a1628", fontFamily: "'DM Sans', sans-serif" }}>
      <header style={{ height: 72, background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center" }}>
            <img src={mavenLogo} alt="Maven Jobs" style={{ height: 38 }} />
          </Link>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#143f86", fontWeight: 800, textDecoration: "none" }}>
            <FiArrowLeft /> Home
          </Link>
        </div>
      </header>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "72px 24px 96px" }}>
        <div data-footer-animate style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", border: "1px solid #dbe5f2", borderRadius: 999, padding: "8px 14px", color: "#143f86", fontWeight: 800, fontSize: 13 }}>
          <Icon /> Maven Jobs
        </div>
        <h1 data-footer-animate style={{ marginTop: 24, maxWidth: 760, fontFamily: "'Sora', sans-serif", fontSize: "clamp(2.4rem, 6vw, 5.4rem)", lineHeight: 1, letterSpacing: 0, color: "#071a3d" }}>
          {content.title}
        </h1>
        <p data-footer-animate style={{ maxWidth: 760, marginTop: 24, fontSize: "1.08rem", lineHeight: 1.8, color: "#52637a" }}>
          {content.intro}
        </p>
        <div data-footer-animate style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {content.points.map((point) => (
            <div key={point} style={{ background: "white", border: "1px solid #dbe5f2", borderRadius: 8, padding: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
              <FiCheckCircle color="#0dbf7b" /> {point}
            </div>
          ))}
        </div>
        <Link data-footer-animate to="/jobs" style={{ marginTop: 40, display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 8, background: "#143f86", color: "white", fontWeight: 900, textDecoration: "none" }}>
          Explore jobs <FiArrowRight />
        </Link>
      </section>
    </main>
  );
}
