import React, { useState } from 'react';
import { FiChevronRight, FiSearch, FiClock, FiUser, FiTrendingUp, FiBookOpen, FiArrowRight } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { id: 'all', label: 'All Posts' },
  { id: 'career', label: 'Career Advice' },
  { id: 'interview', label: 'Interview Tips' },
  { id: 'resume', label: 'Resume & Cover Letter' },
  { id: 'salary', label: 'Salary & Growth' },
  { id: 'remote', label: 'Remote Work' },
  { id: 'skills', label: 'Skills & Learning' },
  { id: 'product', label: 'Product Updates' },
];

const IMGS = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
];

const FEATURED = [
  { title: 'AI-powered premium talent discovery', desc: 'Hiring premium talent is fundamentally different from hiring at scale. The pool is smaller, the candidates are harder to identify.', img: IMGS[0], label: 'PremiumX', labelStyle: { background: 'rgba(255,255,255,.85)', color: '#92400E', fontWeight: 800, fontSize: 17 }, author: 'MavenJobs Content Team', date: '28 Apr 2026', cat: 'product' },
  { title: 'Resdex Enterprise — Search smarter, reach faster, and operate efficiently', desc: 'Recruitment today isn\'t short on effort — it\'s short on efficiency. Recruiters are running dozens of searches, scanning profiles one by one.', img: IMGS[1], label: 'Resdex Enterprise', labelStyle: { background: 'rgba(0,0,0,.45)', color: '#fff', fontWeight: 700, fontSize: 13 }, author: 'Mann Gupta', date: '10 Apr 2026', cat: 'product' },
  { title: 'Introducing AI REX — MavenJobs\'s Agentic AI Talent Sourcing Platform', desc: 'AI is reshaping how every industry works. Recruitment is no exception. The next generation of recruiters will be defined by how well they use AI.', img: IMGS[2], label: 'AI REX', labelStyle: { background: 'rgba(0,0,0,.45)', color: '#fff', fontWeight: 800, fontSize: 15 }, author: 'Mann Gupta', date: '10 Apr 2026', cat: 'product' },
];

const BLOGS = [
  // Career Advice
  { id: 1, cat: 'career', title: 'One-Day Leave Application Samples & Templates', desc: 'Worried about asking for a day off? Learn how to write a one-day leave application to do it right.', img: IMGS[3], author: 'MavenJobs Content Team', date: '25 Apr 2026', read: '5 min' },
  { id: 2, cat: 'career', title: 'What Is MIS Report? Types, Examples & How to Create One', desc: 'Dive into the world of MIS reports: types, examples, and how to create them. Unlock the power of data for smarter decisions.', img: IMGS[9], author: 'MavenJobs Content Team', date: '22 Apr 2026', read: '8 min' },
  { id: 3, cat: 'career', title: 'How to Become a Project Manager (2026 Guide)', desc: 'Find out how to become a project manager along with its scope, advantages, challenges, and certifications in this extensive article.', img: IMGS[10], author: 'Guneet Puri', date: '18 Apr 2026', read: '10 min' },
  // Interview Tips
  { id: 4, cat: 'interview', title: '50+ Top HR Interview Questions and Answers for 2026', desc: 'Go through this well-curated list of some of the most frequently asked HR interview questions. Prepare confidently with best possible answers.', img: IMGS[6], author: 'Geetanjali', date: '20 Apr 2026', read: '12 min' },
  { id: 5, cat: 'interview', title: 'How to Answer "Why Should We Hire You?" (With 15 Sample Answers)', desc: 'The HR interview question "Why Should We Hire You" turns out to be tricky no matter how simple it may sound.', img: IMGS[11], author: 'Saba Anwar', date: '15 Apr 2026', read: '7 min' },
  { id: 6, cat: 'interview', title: 'How to Answer "Are You a Team Player?" With Sample Answers', desc: 'This blog provides with all the nitty gritties to answering the basic interview question "Are you a team player?"', img: IMGS[12], author: 'MavenJobs Content Team', date: '12 Apr 2026', read: '6 min' },
  // Resume
  { id: 7, cat: 'resume', title: 'Career Objective Or Resume Objective Samples', desc: 'A career objective is a crucial aspect of a professional resume. Get it right with this article and check out samples.', img: IMGS[0], author: 'MavenJobs Content Team', date: '10 Apr 2026', read: '6 min' },
  { id: 8, cat: 'resume', title: 'Career Objectives for Engineers: A Comprehensive Guide', desc: 'Learn how to craft powerful career objectives for engineers with tips, examples, and expert strategies to stand out.', img: IMGS[4], author: 'Smita Nag', date: '08 Apr 2026', read: '7 min' },
  { id: 9, cat: 'resume', title: 'How To Write A Career Objective for Marketing Analysts', desc: 'Learn how to write a standout career objective for marketing analysts with expert tips, samples, and strategies.', img: IMGS[7], author: 'Smita Nag', date: '05 Apr 2026', read: '5 min' },
  // Salary
  { id: 10, cat: 'salary', title: '8 Highest-Paying Skills for Career Growth in 2026', desc: 'We explore the high-paying skills in India along with their education path, career path, and job roles related to those skills.', img: IMGS[5], author: 'Guneet Puri', date: '02 Apr 2026', read: '9 min' },
  { id: 11, cat: 'salary', title: 'What Are Conceptual Skills? Definition, Examples & How to Develop', desc: 'Table of Contents: What Are Conceptual Skills, Key Types of Conceptual Skills, Real Life Examples, and How to Showcase Them.', img: IMGS[10], author: 'MavenJobs Content Team', date: '28 Mar 2026', read: '8 min' },
  { id: 12, cat: 'salary', title: 'What is SEO? Types, Methods, and Best Practices', desc: 'A comprehensive guide to SEO covering types, ranking factors, and proven methods for search engine optimization.', img: IMGS[9], author: 'MavenJobs Content Team', date: '25 Mar 2026', read: '11 min' },
  // Remote
  { id: 13, cat: 'remote', title: 'Tips to Make Remote Working Work For You', desc: 'To help you make remote working work for you, here are some best work-from-home practices to stay productive.', img: IMGS[12], author: 'Swati Srivastava', date: '22 Mar 2026', read: '6 min' },
  { id: 14, cat: 'remote', title: 'Hiring Activity Continues to Move on the Path of Recovery Now', desc: 'Here are some quick hiring trends that will help job seekers understand how the job market is shaping up.', img: IMGS[11], author: 'Swati Srivastava', date: '18 Mar 2026', read: '5 min' },
  { id: 15, cat: 'remote', title: 'Start Your Career in Ethical Hacking With These Courses', desc: 'Want to start your career as an ethical hacker? We have curated a list of top ethical hacking courses.', img: IMGS[8], author: 'Khunika Yadav', date: '15 Mar 2026', read: '7 min' },
  // Skills
  { id: 16, cat: 'skills', title: 'Emergency Leave Letter: How to Write, Templates and Samples', desc: 'We have got you covered. In this article, learn what an emergency leave letter is, its uses, elements, and templates.', img: IMGS[2], author: 'Guneet Puri', date: '12 Mar 2026', read: '6 min' },
  { id: 17, cat: 'skills', title: 'How to Prepare for Your Resignation Meeting?', desc: 'Resigning from a job can be tricky but the procedure doesn\'t have to be. Here is an extensive guide on how to prepare.', img: IMGS[9], author: 'Guneet Puri', date: '08 Mar 2026', read: '7 min' },
  { id: 18, cat: 'skills', title: 'How to Write a Retirement Letter of Resignation?', desc: 'Write an impactful retirement resignation letter with this list of what to include, tips, and samples.', img: IMGS[12], author: 'Guneet Puri', date: '05 Mar 2026', read: '5 min' },
  // Product Updates
  { id: 19, cat: 'product', title: 'Best Practices for Your MavenJobs Profile', desc: 'Wondering how to get shortlisted for a job interview? This blog presents the best practices for your profile.', img: IMGS[11], author: 'MavenJobs Content Team', date: '01 Mar 2026', read: '4 min' },
  { id: 20, cat: 'product', title: 'Top 10 Hiring Companies on Resdex in February', desc: 'In this blog, we talk about what is Resdex and the top 10 hiring companies on Resdex in February.', img: IMGS[10], author: 'MavenJobs Content Team', date: '25 Feb 2026', read: '5 min' },
  { id: 21, cat: 'product', title: 'Understanding Hiring Trends With MavenJobs JobSpeak Report', desc: 'We shall dissect important observations of MavenJobs JobSpeak Report & highlight its key takeaways.', img: IMGS[1], author: 'MavenJobs Content Team', date: '20 Feb 2026', read: '8 min' },
];

export default function Blogs() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = BLOGS.filter(b => {
    const matchCat = activeCat === 'all' || b.cat === activeCat;
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = {};
  CATEGORIES.filter(c => c.id !== 'all').forEach(c => {
    const items = filtered.filter(b => b.cat === c.id);
    if (items.length > 0) grouped[c.id] = { label: c.label, items };
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fb', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1e293b' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --navy:#002366; --green:#10b981; --fd:'Bricolage Grotesque',sans-serif; }
        .blog-filter-tab { padding:8px 18px; border-radius:100px; font-size:13px; font-weight:700; border:1.5px solid #e2e8f0; cursor:pointer; background:#fff; color:#475569; transition:all .2s; white-space:nowrap; font-family:var(--fd); }
        .blog-filter-tab:hover { border-color:rgba(0,35,102,.2); color:var(--navy); }
        .blog-filter-tab.active { background:var(--navy); color:#fff; border-color:var(--navy); }
        .blog-card { background:#fff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden; cursor:pointer; transition:all .25s; }
        .blog-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,35,102,.08); }
        .blog-cat-title { font-family:var(--fd); font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-.02em; }
        .blog-cat-count { font-size:13px; color:#64748b; font-weight:600; margin-left:8px; }
        .blog-see-all { font-size:13px; color:var(--navy); font-weight:700; cursor:pointer; background:none; border:none; display:flex; align-items:center; gap:4px; font-family:var(--fd); }
        .blog-see-all:hover { opacity:.7; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
      `}</style>

      {/* Hero Header */}
      <div style={{ background:'linear-gradient(135deg,#002366 0%,#1a3a8f 50%,#0f172a 100%)', padding:'48px 40px 40px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(16,185,129,.08)' }} />
        <div style={{ position:'absolute', bottom:-60, left:'30%', width:200, height:200, borderRadius:'50%', background:'rgba(99,102,241,.06)' }} />
        <div style={{ maxWidth:1200, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:16, fontFamily:'var(--fd)' }}>
            <Link to="/profile" style={{ color:'rgba(255,255,255,.5)', textDecoration:'none' }}>Profile</Link>
            <FiChevronRight size={12} />
            <span style={{ color:'#fff' }}>Blog</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <FiBookOpen size={28} color="#10b981" />
                <h1 style={{ fontFamily:'var(--fd)', fontSize:32, fontWeight:800, color:'#fff', letterSpacing:'-.03em' }}>MavenJobs Blog</h1>
              </div>
              <p style={{ fontSize:15, color:'rgba(255,255,255,.55)', maxWidth:500, lineHeight:1.6 }}>Maximizing your career potential — expert advice, industry insights, and the latest from MavenJobs.</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'10px 16px', gap:10, minWidth:280 }}>
              <FiSearch size={16} color="rgba(255,255,255,.4)" />
              <input type="text" placeholder="Search articles…" value={search} onChange={e => setSearch(e.target.value)} style={{ background:'transparent', border:'none', outline:'none', color:'#fff', fontSize:14, fontWeight:500, width:'100%', fontFamily:'inherit' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 32px 60px' }}>

        {/* Filter Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:32, overflowX:'auto', paddingBottom:6 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} className={`blog-filter-tab ${activeCat === c.id ? 'active' : ''}`} onClick={() => setActiveCat(c.id)}>{c.label}</button>
          ))}
        </div>

        {/* Featured / Recent Posts */}
        {activeCat === 'all' && (
          <div style={{ marginBottom:48 }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'#64748b', marginBottom:18 }}>RECENT POSTS</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {FEATURED.map((f, i) => (
                <div key={i} className="blog-card" onClick={() => navigate('/blog-article')}>
                  <div style={{ height:180, backgroundImage:`url(${f.img})`, backgroundSize:'cover', backgroundPosition:'center', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.3) 100%)' }} />
                    <span style={{ ...f.labelStyle, padding:'6px 16px', borderRadius:8, position:'relative', zIndex:1, backdropFilter:'blur(4px)' }}>{f.label}</span>
                  </div>
                  <div style={{ padding:'20px 22px 24px' }}>
                    <h3 style={{ fontFamily:'var(--fd)', fontSize:16, fontWeight:800, color:'#0f172a', lineHeight:1.35, marginBottom:10, letterSpacing:'-.01em' }}>{f.title}</h3>
                    <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:16, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{f.desc}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}><FiUser size={13} color="#64748b" /></div>
                      <span style={{ fontSize:12.5, color:'#475569', fontWeight:600 }}>{f.author}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorized Sections */}
        {activeCat === 'all' ? (
          Object.entries(grouped).map(([catId, { label, items }]) => (
            <div key={catId} style={{ marginBottom:44 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span className="blog-cat-title">{label}</span>
                  <span className="blog-cat-count">({items.length})</span>
                </div>
                <button className="blog-see-all" onClick={() => setActiveCat(catId)}>SEE ALL <FiArrowRight size={13} /></button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
                {items.slice(0, 3).map(b => (
                  <BlogCard key={b.id} blog={b} onClick={() => navigate('/blog-article')} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:24 }}>
              <span className="blog-cat-title">{CATEGORIES.find(c => c.id === activeCat)?.label}</span>
              <span className="blog-cat-count">({filtered.length})</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {filtered.map(b => (
                <BlogCard key={b.id} blog={b} onClick={() => navigate('/blog-article')} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
                <FiSearch size={40} style={{ marginBottom:16, opacity:.4 }} />
                <p style={{ fontSize:16, fontWeight:600 }}>No articles found</p>
                <p style={{ fontSize:13, marginTop:4 }}>Try a different search or category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BlogCard({ blog, onClick }) {
  return (
    <div className="blog-card" onClick={onClick}>
      <div style={{ height:150, position:'relative', overflow:'hidden' }}>
        <img src={blog.img} alt={blog.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
      </div>
      <div style={{ padding:'18px 20px 22px' }}>
        <h4 style={{ fontFamily:'var(--fd)', fontSize:14.5, fontWeight:800, color:'#0f172a', lineHeight:1.4, marginBottom:8, letterSpacing:'-.01em', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{blog.title}</h4>
        <p style={{ fontSize:12.5, color:'#64748b', lineHeight:1.55, marginBottom:14, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{blog.desc}</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}><FiUser size={11} color="#64748b" /></div>
            <span style={{ fontSize:11.5, color:'#475569', fontWeight:600 }}>{blog.author}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#94a3b8', fontWeight:600 }}><FiClock size={11} />{blog.read}</div>
        </div>
      </div>
    </div>
  );
}
