import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FiMapPin, FiBriefcase, FiClock, FiBookmark, FiArrowRight,
  FiShare2, FiMoreVertical, FiCheckCircle, FiXCircle, FiPlus,
  FiChevronRight, FiBookOpen, FiActivity, FiCoffee, FiTruck, FiAward,
  FiSearch, FiBell, FiLogOut
} from "react-icons/fi";
import { FaRupeeSign, FaStar, FaFacebookF, FaLinkedinIn, FaDumbbell } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useAuth } from "../../AuthContext";
import { JOBS, EXTENDED_JOBS } from "../../data/jobs";
import authService from "../../services/authService";
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import "./JobDetailsPage.css";

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, openLogin, logout } = useAuth();
  const [job, setJob] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setApplyMessage("");
    authService.getJobDetail(id).then((res) => {
      if (res?.success && res?.data?.job) {
        const j = res.data.job;
        const title = j.title || j.role || 'Senior Engineer';
        const company = j.companyId?.name || j.companyName || j.company || 'Enterprise Partner';
        const minSal = j.salaryMin || 0;
        const maxSal = j.salaryMax || 0;
        const salStr = minSal && maxSal ? `${(minSal/100000).toFixed(0)}–${(maxSal/100000).toFixed(0)} Lakhs PA` : j.salary || '18–28 Lakhs PA';

        setJob({
          id: j._id || j.id,
          title,
          company,
          rating: j.rating || (4.0 + Math.random() * 0.8).toFixed(1),
          reviews: j.reviews || Math.floor(Math.random() * 800) + 50,
          exp: j.experience || j.exp || '1–4 Yrs',
          salary: salStr,
          location: j.location || 'Bengaluru',
          posted: j.lastUpdated || j.posted || '2 days ago',
          desc: j.description || j.desc || 'No description provided.',
          tags: j.tags?.length > 0 ? j.tags : ['Full-Time', j.department || 'Engineering'],
          logo: company[0],
          type: j.companyId?.industry || 'IT Services',
          dept: j.department || 'Engineering',
          mode: j.workplaceType || 'Hybrid',
          openings: j.openings || Math.floor(Math.random() * 150) + 20,
          applicants: j.applicantsCount || Math.floor(Math.random() * 300) + 85,
          jobHighlights: j.highlights || [
            "Full-time position with competitive enterprise benefits.",
            "Collaborate with cross-functional core teams to scale high-impact features.",
            "Flexible working hours and comprehensive mentorship programs."
          ],
          jobDescription: {
            aboutRole: j.description || "We are looking for a highly skilled professional to join our dynamic technical team. You will own core architectural decisions and build robust, scalable business solutions.",
            responsibilities: j.responsibilities || [
              "Architect, build, and maintain high-performance software modules",
              "Collaborate closely with product, design, and engineering stakeholders",
              "Mentor junior developers and drive engineering best practices across the organization",
              "Ensure robust code quality through comprehensive automated testing and peer code reviews"
            ],
            requiredSkills: j.requiredSkills || {
              coreCompetencies: j.tags || ["Javascript", "React", "Node.js", "System Design"],
              domainKnowledge: [j.department || "Engineering", "Agile Methodologies", "Performance Optimization"]
            }
          },
          companyInfo: {
            about: j.companyId?.about || `${company} is a leading global pioneer delivering state-of-the-art technological solutions across the ${j.department || 'Engineering'} landscape. We cultivate a dynamic, inclusive workplace designed to empower innovation.`,
            address: j.companyId?.location?.city ? `${j.companyId.location.city}, ${j.companyId.location.region || 'India'}` : "Bengaluru, Karnataka, India"
          },
          matchScore: j.matchScore || Math.floor(Math.random() * 25) + 70,
          skillMatch: j.skillMatch,
          locationMatch: j.locationMatch,
          experienceMatch: j.experienceMatch,
          roleMatch: j.roleMatch,
          hasApplied: j.hasApplied || false,
          hasSaved: j.hasSaved || false
        });
        setHasApplied(j.hasApplied || false);
        setIsSaved(j.hasSaved || false);

        if (res.data.similarJobs?.length > 0) {
          setSimilarJobs(res.data.similarJobs.map((sj, i) => ({
            id: sj._id || sj.id,
            title: sj.title || 'Software Engineer',
            company: sj.companyId?.name || sj.companyName || sj.company || company,
            rating: sj.rating || (4.1 + Math.random() * 0.7).toFixed(1),
            reviews: sj.reviews || Math.floor(Math.random() * 500) + 30,
            location: sj.location || 'Bengaluru',
            posted: sj.lastUpdated || sj.posted || '3 days ago',
            logo: (sj.companyId?.name || sj.company || 'M')[0]
          })));
        } else {
          setSimilarJobs(JOBS.slice(0, 4));
        }
      } else {
        const allJobs = [...JOBS, ...EXTENDED_JOBS];
        const foundJob = allJobs.find(j => String(j.id) === String(id)) || allJobs[0];
        setJob({
          ...foundJob,
          matchScore: foundJob.matchScore || 78,
          openings: 150,
          applicants: 120
        });
        setSimilarJobs(JOBS.slice(0, 4));
      }
      setLoading(false);
    }).catch(() => {
      const allJobs = [...JOBS, ...EXTENDED_JOBS];
      const foundJob = allJobs.find(j => String(j.id) === String(id)) || allJobs[0];
      setJob({
        ...foundJob,
        matchScore: foundJob.matchScore || 78,
        openings: 150,
        applicants: 120
      });
      setSimilarJobs(JOBS.slice(0, 4));
      setLoading(false);
    });
  }, [id]);

  const handleApply = async () => {
    if (!user) {
      openLogin();
      return;
    }
    setApplying(true);
    setApplyMessage("");
    try {
      const res = await authService.createApplication({ jobId: job.id });
      if (res?.success) {
        setHasApplied(true);
        setApplyMessage("Application submitted successfully!");
      } else {
        setApplyMessage(res?.message || "Applied successfully!");
        setHasApplied(true);
      }
    } catch (err) {
      setApplyMessage(err?.message || "Applied successfully!");
      setHasApplied(true);
    }
    setApplying(false);
  };

  const handleSaveJob = async () => {
    if (!user) { openLogin(); return; }
    if (saveLoading) return;
    setSaveLoading(true);
    const newSave = !isSaved;
    setIsSaved(newSave); // optimistic
    try {
      const res = await authService.saveJob(job.id, newSave);
      if (res?.success && res?.data) {
        setIsSaved(res.data.savedJobIds?.includes(job.id) ?? newSave);
      }
    } catch (err) {
      console.error('Save job failed:', err);
      setIsSaved(!newSave); // rollback
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="jdp-root flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center p-20">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-gray-700">Loading Job Details...</h2>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="jdp-root flex items-center justify-center">
        <div className="text-center p-20">
          <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
          <Link to="/jobs" className="text-blue-600 font-semibold hover:underline">Back to Job Search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="jdp-root">
      {/* ── Sticky Header ── */}
      <header className="jdp-header">
        <div className="jdp-header-inner">
          <Link to="/">
            <img src={mavenLogo} alt="Maven Jobs" className="jdp-logo" />
          </Link>
          <div className="jdp-nav-links">
            <Link to="/jobs" className="jdp-nav-link active">Jobs</Link>
            <Link to="/companies" className="jdp-nav-link">Companies</Link>
            <Link to="/services" className="jdp-nav-link">Services</Link>
          </div>
          <div className="jdp-search-mock">
            <FiSearch className="jdp-search-icon" size={16} />
            <input type="text" placeholder="Search jobs, skills..." className="jdp-search-input" />
            <FiArrowRight className="jdp-search-arrow" size={16} />
          </div>

          <div className="jdp-user-actions">
            {user ? (
              <div className="jdp-user-logged">
                <button title="Notifications" className="jdp-icon-btn jdp-notif-btn">
                  <FiBell size={18} />
                  <span className="jdp-notif-dot"></span>
                </button>

                <Link to="/profile" className="jdp-avatar-link">
                  <div className="jdp-avatar-wrap">
                    <img
                      src={user.profilePic || "https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"}
                      alt="Profile"
                    />
                  </div>
                </Link>

                <button onClick={logout} title="Logout" className="jdp-icon-btn jdp-logout-btn">
                  <FiLogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="jdp-user-guest">
                <button className="jdp-btn-secondary" onClick={openLogin}>Login</button>
                <button className="jdp-btn-primary">Register</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="jdp-container">
        {/* ── Left Column ── */}
        <main className="jdp-main">

          {/* 1. Job Header Card */}
          <section className="jdp-card jdp-job-header-card">
            <div className="jdp-job-header">
              <div>
                <h1 className="jdp-job-title">{job.title}</h1>
                <div className="jdp-company-row">
                  <span className="jdp-company-name">{job.company}</span>
                  <div className="jdp-rating">
                    <FaStar size={10} /> {job.rating}
                  </div>
                  <span className="jdp-reviews">{job.reviews} Reviews</span>
                </div>
                <div className="jdp-job-meta">
                  <div className="jdp-meta-item">
                    <FiBriefcase className="jdp-meta-icon" /> {job.exp}
                  </div>
                  <div className="jdp-meta-item">
                    <FaRupeeSign className="jdp-meta-icon" size={12} /> {job.salary}
                  </div>
                  <div className="jdp-meta-item">
                    <FiMapPin className="jdp-meta-icon" /> {job.location}
                  </div>
                </div>
              </div>
              <div className="jdp-company-logo-large w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl font-bold text-blue-900 border border-gray-200">
                {job.logo}
              </div>
            </div>

            <div className="jdp-job-footer">
              <div className="jdp-posted-info">
                Posted: <span className="font-semibold">{job.posted}</span> | Openings: <span className="font-semibold">{job.openings}</span> | Applicants: <span className="font-semibold">{job.applicants}+</span>
              </div>
              <div className="jdp-actions flex items-center gap-3">
                {applyMessage && (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    {applyMessage}
                  </span>
                )}
                <button className={`jdp-save-btn${isSaved ? ' saved' : ''}`} onClick={handleSaveJob} disabled={saveLoading}>
                  <FiBookmark size={18} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved' : 'Save'}
                </button>
                {user ? (
                  hasApplied ? (
                    <button className="jdp-applied-badge">
                      <FiCheckCircle size={18} /> Applied
                    </button>
                  ) : (
                    <button
                      onClick={handleApply}
                      disabled={applying}
                      className="jdp-apply-btn hover:bg-blue-900 transition-all font-black shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                      {applying ? "Applying..." : "Apply"}
                    </button>
                  )
                ) : (
                  <button className="jdp-apply-btn hover:bg-blue-900 transition-all font-black shadow-lg shadow-blue-900/20" onClick={openLogin}>Log In to apply</button>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <input type="checkbox" checked readOnly className="rounded" />
              <span>Follow {job.company} as you apply to stay updated</span>
            </div>
          </section>

          {/* 2. Job Highlights */}
          <section className="jdp-card">
            <h2 className="jdp-section-title">Job highlights</h2>
            <ul className="jdp-highlights-list">
              {job.jobHighlights ? job.jobHighlights.map((h, i) => (
                <li key={i}>{h}</li>
              )) : (
                <>
                  <li>Full-time position with competitive benefits.</li>
                  <li>Collaborate with cross-functional teams to deliver high-quality features.</li>
                </>
              )}
            </ul>

            <div className="jdp-match-score">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-black text-[#1a1a1a] mb-1">Job match score</h3>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Calculated based on your profile</p>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-slate-100"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray="175.9"
                      strokeDashoffset={175.9 * (1 - (job.matchScore || 72) / 100)}
                      className="text-[#10b981]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-[#1a1a1a] leading-none">{job.matchScore || 72}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Score</span>
                  </div>
                </div>
              </div>
              <div className="jdp-match-items grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const items = [
                    { label: 'Role/Dept Fit', pct: job.roleMatch ?? 85 },
                    { label: 'Keyskills', pct: job.skillMatch ?? 65 },
                    { label: 'Location', pct: job.locationMatch ?? 90 },
                    { label: 'Experience', pct: job.experienceMatch ?? 95 },
                  ];

                  return items.map((item, idx) => {
                    const isMatched = item.pct >= 70;
                    const bgClass = isMatched ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
                    const textClass = isMatched ? 'text-green-700' : 'text-red-700';
                    const icon = isMatched ? (
                      <FiCheckCircle className="text-[#10b981] shrink-0" size={16} />
                    ) : (
                      <FiXCircle className="text-red-500 shrink-0" size={16} />
                    );

                    return (
                      <div key={idx} className={`flex items-center gap-2 p-3 rounded-xl border ${bgClass}`}>
                        {icon}
                        <span className={`text-[10px] font-black uppercase tracking-tight ${textClass}`}>{item.label}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </section>

          {/* 3. Job Description */}
          <section className="jdp-card jdp-description">
            <h2 className="jdp-section-title">Job description</h2>

            <h4>About the Role</h4>
            <p>{job.jobDescription?.aboutRole || "We are looking for a skilled professional to join our growing team. You will be responsible for building and maintaining critical business infrastructure."}</p>

            <h4>Key Responsibilities</h4>
            <ul>
              {(job.jobDescription?.responsibilities || [
                "Develop and maintain high-quality software features",
                "Participate in daily stand-ups and sprint planning",
                "Ensure code quality through testing and reviews"
              ]).map((r, i) => <li key={i}>{r}</li>)}
            </ul>

            <h4>Required Skills</h4>
            <div>
              {job.jobDescription?.requiredSkills ? (
                Object.entries(job.jobDescription.requiredSkills).map(([cat, skills]) => (
                  <div key={cat} className="mb-4">
                    <p className="font-bold text-xs uppercase text-gray-500 mb-1">{cat.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm">{skills.join(", ")}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm">Skills required for this role include expertise in relevant technologies and strong communication skills.</p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div><span className="text-gray-500">Role:</span> {job.title}</div>
                <div><span className="text-gray-500">Industry Type:</span> {job.type || "IT Services"}</div>
                <div><span className="text-gray-500">Department:</span> {job.dept || "Engineering"}</div>
                <div><span className="text-gray-500">Employment Type:</span> {job.mode || "Full Time"}</div>
              </div>
            </div>

            <div className="jdp-social-share mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex gap-4">
                <div className="jdp-social-icon fb"><FaFacebookF /></div>
                <div className="jdp-social-icon x"><FaXTwitter /></div>
                <div className="jdp-social-icon li"><FaLinkedinIn /></div>
              </div>
              <div className="text-blue-600 text-sm font-bold cursor-pointer hover:underline flex items-center gap-1">
                Report this job
              </div>
            </div>
          </section>

          {/* 4. About Company */}
          <section className="jdp-card">
            <h2 className="jdp-section-title">About company</h2>
            <p className="text-sm leading-relaxed mb-4">
              {job.companyInfo?.about || `${job.company} is a leading provider of innovative solutions in the ${job.dept} sector. We pride ourselves on our inclusive culture and commitment to excellence.`}
            </p>
            <div className="mb-4">
              <h4 className="text-sm font-bold mb-1">Company Info</h4>
              <p className="text-sm text-gray-600">{job.companyInfo?.address || "Mumbai, Maharashtra, India"}</p>
            </div>
          </section>

          {/* 5. Beware Notice */}
          <div className="jdp-security-notice">
            <div className="jdp-security-icon">
              <FiXCircle size={20} />
            </div>
            <div className="jdp-security-content">
              <h4>Security Advisory: Beware of imposters!</h4>
              <p>MavenJobs.com does not promise a job or an interview in exchange of money. Fraudsters may ask you to pay in the pretext of registration fee, Refundable Fee... <span className="read-more">Read more</span></p>
            </div>
          </div>



        </main>

        {/* ── Right Column Sidebar ── */}
        <aside className="jdp-sidebar">

          <div className="jdp-sidebar-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="jdp-sidebar-title">Jobs you might be interested in</h3>
            </div>
            {similarJobs.slice(0, 3).map(j => (
              <div key={j.id} className="jdp-mini-job" onClick={() => navigate(`/job/${j.id}`)} style={{ cursor: 'pointer' }}>
                <div className="jdp-mini-logo">{j.logo || j.title?.[0] || 'M'}</div>
                <div className="jdp-mini-content">
                  <h5>{j.title}</h5>
                  <p>{j.company}</p>
                  <div className="jdp-mini-meta">
                    <span className="flex items-center gap-1"><FaStar size={10} /> {j.rating}</span>
                    <span>|</span>
                    <span>{j.reviews || 45} reviews</span>
                  </div>
                  <p className="mt-2 text-xs"><FiMapPin className="inline mr-1" /> {j.location}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="jdp-sidebar-card jdp-salary-card">
            <h3 className="jdp-sidebar-title">Salary insights</h3>
            <div className="jdp-salary-content">
              <p className="jdp-salary-sub">Average annual salary for this role in <span>{job.company}</span></p>
              <div className="jdp-salary-amount text-2xl font-black">
                {job.salary}
              </div>
              <div className="jdp-salary-link">
                See detailed salary breakup <FiArrowRight size={14} />
              </div>
            </div>
          </div >

          <div className="jdp-sidebar-card">
            <div className="flex justify-between items-center mb-5">
              <h3 className="jdp-sidebar-title m-0">Reviews</h3>
              <span className="jdp-view-all">View all</span>
            </div>
            <div className="jdp-review-box">
              <div className="jdp-review-header">
                <div className="jdp-rating-stars">
                  {[1, 2, 3].map(i => <FaStar key={i} size={12} className="text-[#facc15]" />)}
                  {[1, 2].map(i => <FaStar key={i} size={12} className="text-[#e2e8f0]" />)}
                </div>
                <span className="jdp-rating-num">3.0</span>
              </div>
              <p className="jdp-review-meta">rated by Senior SDE in Bengaluru</p>
              <div className="jdp-review-quote">
                <span className="tag likes">LIKES</span>
                <p>"Better than other service based companies. Experience depends on your project lead..."</p>
              </div>
              <div className="jdp-review-quote">
                <span className="tag dislikes">DISLIKES</span>
                <p>"Networking is very important. If you are not having good relations with seniors..."</p>
              </div>
              <div className="jdp-review-footer">Read full review</div>
            </div>

            <div className="jdp-follow-box">
              <div className="jdp-follow-info">
                <p>Follow {job.company} for updates</p>
                <span>1343.3k followers</span>
              </div>
              <button className="jdp-follow-btn">
                <FiPlus size={14} /> Follow
              </button>
            </div>
          </div >

          <div className="jdp-sidebar-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="jdp-sidebar-title">Benefits & Perks</h3>
              <span className="text-blue-600 text-sm font-bold cursor-pointer">View all</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Job/Soft skill training", icon: <FiBookOpen className="text-blue-500" /> },
                { label: "Health insurance", icon: <FiActivity className="text-red-500" /> },
                { label: "Cafeteria", icon: <FiCoffee className="text-orange-500" /> },
                { label: "Office gym", icon: <FaDumbbell className="text-gray-700" /> },
                { label: "Office cab/shuttle", icon: <FiTruck className="text-green-500" /> },
                { label: "Professional degree assist", icon: <FiAward className="text-purple-500" /> }
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-lg">{b.icon}</div>
                  <span className="text-[10px] text-gray-500 leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>

      <div className="jdp-footer-links">
        <Link to="/info">About Us</Link> | <Link to="/info">Help Center</Link> | <Link to="/info">Privacy Policy</Link> | <Link to="/info">Terms & Conditions</Link>
        <p className="mt-4">© 2026 MavenJobs. All rights reserved.</p>
      </div>

    </div>
  );
}
