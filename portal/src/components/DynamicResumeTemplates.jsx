import React, { forwardRef } from 'react';

// Helper to generate mock details based on candidate
const getMockData = (candidate) => {
  const isDesign = candidate.role?.toLowerCase().includes('design') || candidate.role?.toLowerCase().includes('ui');
  const isData = candidate.role?.toLowerCase().includes('data') || candidate.role?.toLowerCase().includes('analytics');
  
  return {
    email: candidate.email || `${candidate.name?.split(' ')[0].toLowerCase() || 'user'}@example.com`,
    phone: candidate.phone || candidate.mobile || '+91 98765 43210',
    about: candidate.about || candidate.summary || `Highly motivated ${candidate.role || 'Professional'} with ${candidate.exp || 'years'} of experience delivering high-quality results. Proven ability to leverage ${candidate.skills?.[0] || 'core skills'} and ${candidate.skills?.[1] || 'modern tools'} to drive business value. Strong communicator and team player, ready to contribute immediately.`,
    education: candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0 
      ? candidate.education 
      : [
          { degree: isData ? 'M.S. Data Science' : 'B.Tech Computer Science', school: 'National Institute of Technology', year: '2016 - 2020' },
          { degree: 'Class XII (Science)', school: 'Delhi Public School', year: '2016' }
        ],
    experience: candidate.experience && Array.isArray(candidate.experience) && candidate.experience.length > 0 
      ? candidate.experience 
      : [
          { role: candidate.role || 'Senior Professional', company: 'TechCorp India', date: '2021 - Present', desc: `Leading the ${candidate.role?.split(' ')[0] || 'core'} initiatives. Mentoring junior members and standardizing workflows using ${candidate.skills?.[0] || 'best practices'}. Improved team efficiency by 25%.` },
          { role: `Associate ${candidate.role?.split(' ').pop() || 'Professional'}`, company: 'Innovate Solutions', date: '2020 - 2021', desc: `Assisted in key projects. Developed core features resulting in a 15% increase in user engagement.` }
        ],
    projects: candidate.projects && Array.isArray(candidate.projects) && candidate.projects.length > 0 
      ? candidate.projects 
      : [
          { name: 'Enterprise Dashboard Redesign', desc: `Led the end-to-end delivery of a scalable dashboard utilizing ${candidate.skills?.join(', ') || 'modern technologies'}.` },
          { name: 'Automation Workflow Engine', desc: `Built a robust engine reducing manual processing time by over 40 hours per week.` }
        ]
  };
};

// 1. Template: Modern Navy (Inspired by the original ResumeTemplate but adapted)
export const TemplateModernNavy = forwardRef(({ candidate }, ref) => {
  const data = getMockData(candidate);
  
  return (
    <div ref={ref} style={{ width: '794px', height: '1123px', background: '#fff', fontFamily: "'DM Sans', sans-serif", color: '#1e293b', display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: '250px', background: '#002366', color: '#fff', padding: '35px 25px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: candidate.color, border: '3px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, margin: '0 auto 20px' }}>{candidate.initials}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '24px', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, marginBottom: '5px' }}>{candidate.name}</h1>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '30px' }}>{candidate.role}</div>
        
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>Contact</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>📞 {data.phone}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>✉️ {data.email}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '30px' }}>📍 {candidate.loc}</div>

        <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>Skills</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '30px' }}>
          {candidate.skills.map(s => (
            <span key={s} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
          ))}
        </div>

        <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>Education</div>
        {data.education.map((e, i) => (
          <div key={i} style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700 }}>{e.degree}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{e.school}</div>
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>{e.year}</div>
          </div>
        ))}
      </div>
      
      <div style={{ flex: 1, padding: '40px' }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '32px', fontWeight: 800, color: '#002366', marginBottom: '6px' }}>{candidate.name}</h2>
        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, marginBottom: '20px' }}>{candidate.role} • {candidate.exp} Experience</div>
        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '35px', paddingLeft: '15px', borderLeft: '3px solid #10b981' }}>{data.about}</p>
        
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#002366', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Work Experience <div style={{ height: '2px', background: '#e2e8f0', flex: 1 }}></div>
        </div>
        
        {data.experience.map((exp, i) => (
          <div key={i} style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{exp.role}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{exp.date}</div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#002366', marginBottom: '8px' }}>{exp.company}</div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{exp.desc}</p>
          </div>
        ))}

        <div style={{ fontSize: '14px', fontWeight: 800, color: '#002366', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          Key Projects <div style={{ height: '2px', background: '#e2e8f0', flex: 1 }}></div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {data.projects.map((proj, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', borderTop: '3px solid #002366' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>{proj.name}</div>
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{proj.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// 2. Template: Minimalist Emerald
export const TemplateMinimalEmerald = forwardRef(({ candidate }, ref) => {
  const data = getMockData(candidate);
  
  return (
    <div ref={ref} style={{ width: '794px', height: '1123px', background: '#fff', fontFamily: "'DM Sans', sans-serif", color: '#1e293b', padding: '50px 60px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: '#10b981' }}></div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #e2e8f0', paddingBottom: '30px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '42px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', marginBottom: '8px', lineHeight: 1 }}>{candidate.name}</h1>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>{candidate.role}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
          <div>{data.email}</div>
          <div>{data.phone}</div>
          <div>{candidate.loc}</div>
        </div>
      </div>

      <div style={{ marginBottom: '35px' }}>
        <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.7 }}>{data.about}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Expertise</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '40px' }}>
            {candidate.skills.map(s => (
              <div key={s} style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> {s}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Education</div>
          {data.education.map((e, i) => (
            <div key={i} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{e.degree}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>{e.school}</div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>{e.year}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Experience</div>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: '30px', position: 'relative', paddingLeft: '20px' }}>
              <div style={{ position: 'absolute', left: 0, top: '6px', width: '2px', height: '100%', background: '#e2e8f0' }}></div>
              <div style={{ position: 'absolute', left: '-3px', top: '5px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '2px solid #fff' }}></div>
              
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>{exp.role}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '8px' }}>{exp.company} • {exp.date}</div>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>{exp.desc}</p>
            </div>
          ))}

          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', marginTop: '10px' }}>Selected Projects</div>
          {data.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{proj.name}</div>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>{proj.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// 3. Template: Corporate Classic
export const TemplateCorporateClassic = forwardRef(({ candidate }, ref) => {
  const data = getMockData(candidate);
  
  return (
    <div ref={ref} style={{ width: '794px', height: '1123px', background: '#fff', fontFamily: "'DM Sans', sans-serif", color: '#334155', padding: '45px 55px' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '25px', marginBottom: '25px' }}>
        <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#000', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>{candidate.name}</h1>
        <div style={{ fontSize: '14px', color: '#000', display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <span>{candidate.loc}</span>
          <span>|</span>
          <span>{data.phone}</span>
          <span>|</span>
          <span>{data.email}</span>
        </div>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '12px' }}>Professional Summary</h2>
        <p style={{ fontSize: '13px', lineHeight: 1.6, textAlign: 'justify' }}>{data.about}</p>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '12px' }}>Core Competencies</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {candidate.skills.map((s, i) => (
            <React.Fragment key={s}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{s}</span>
              {i < candidate.skills.length - 1 && <span style={{ color: '#ccc' }}>•</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '12px' }}>Professional Experience</h2>
        {data.experience.map((exp, i) => (
          <div key={i} style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#000' }}>{exp.company}</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{exp.date}</div>
            </div>
            <div style={{ fontSize: '13px', fontStyle: 'italic', marginBottom: '8px' }}>{exp.role}</div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.6 }}>
              <li style={{ marginBottom: '4px' }}>{exp.desc}</li>
              <li>Collaborated with cross-functional teams to ensure timely delivery of robust solutions.</li>
            </ul>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '12px' }}>Education</h2>
        {data.education.map((e, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#000' }}>{e.school}</div>
              <div style={{ fontSize: '13px' }}>{e.degree}</div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{e.year}</div>
          </div>
        ))}
      </div>
    </div>
  );
});
