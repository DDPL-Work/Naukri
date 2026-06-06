import React, { useState, useEffect } from 'react';
import {
  FiSearch, FiMapPin, FiBriefcase, FiUsers, FiClock, FiStar,
  FiChevronRight, FiChevronLeft, FiFilter, FiCheckCircle, FiBell,
  FiTrendingUp, FiSettings, FiFileText, FiArrowRight, FiX, FiAward, FiZap, FiGlobe, FiLayers, FiBox
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import authService from '../../services/authService';
import './CompaniesPage.css';

const CompaniesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sortBy, setSortBy] = useState('Most Popular');
  const [activePage, setActivePage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFilters, setActiveFilters] = useState({});
  const [companies, setCompanies] = useState([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async (page = 1, query = '', category = '') => {
    setLoading(true);
    try {
      let sortParam = 'popular';
      if (sortBy === 'Highest Rated') sortParam = 'name';
      if (sortBy === 'Recently Added') sortParam = 'newest';

      // Map category names to industry search terms
      const industryFilter = category && category !== 'All' ? getIndustryFilter(category) : '';

      const res = await authService.getCompanies({
        q: query,
        sort: sortParam,
        page,
        limit: 20,
        industry: industryFilter,
      });

      if (res?.success && res?.data) {
        setCompanies(res.data.companies || []);
        setTotalCompanies(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        setActivePage(res.data.page || 1);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchCompanies(1, searchQuery, activeCategory);
  }, [sortBy, activeCategory]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCompanies(1, searchQuery, activeCategory);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, activeCategory]);

  const handlePageChange = (page) => {
    if (typeof page === 'number' && page >= 1 && page <= totalPages) {
      fetchCompanies(page, searchQuery, activeCategory);
    }
  };

  const toggleFilter = (group, value) => {
    setActiveFilters(prev => {
      const groupFilters = prev[group] || [];
      return {
        ...prev,
        [group]: groupFilters.includes(value)
          ? groupFilters.filter(v => v !== value)
          : [...groupFilters, value],
      };
    });
  };

  const [stats, setStats] = useState({ mncs: 0, internet: 0, manufacturing: 0, fortune500: 0, product: 0 });

  const fetchStats = async () => {
    try {
      const res = await authService.getCompanyStats();
      if (res?.success && res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const clearAll = () => setActiveFilters({});

  const categories = [
    { name: 'MNCs', count: `${stats.mncs} Companies`, icon: <FiGlobe />, accent: '#1E5EFF' },
    { name: 'Internet', count: `${stats.internet} Companies`, icon: <FiZap />, accent: '#7C3AED' },
    { name: 'Manufacturing', count: `${stats.manufacturing} Companies`, icon: <FiLayers />, accent: '#0DBF7B' },
    { name: 'Fortune 500', count: `${stats.fortune500} Companies`, icon: <FiAward />, accent: '#F59E0B' },
    { name: 'Product', count: `${stats.product} Companies`, icon: <FiBox />, accent: '#EF4444' },
  ];

// Industry keyword mapping for category filters
const categoryIndustryMap = {
  'MNCs': 'MNC',
  'Internet': 'Internet',
  'Manufacturing': 'Manufacturing',
  'Fortune 500': 'Fortune 500',
  'Product': 'Product',
};

const filterGroups = {
  'Company Type': ['Corporate', 'Foreign MNC', 'Startup', 'Indian MNC'],
  'Location': ['Bengaluru', 'Pune', 'Mumbai', 'Noida'],
  'Industry': ['IT Services', 'E-Learning', 'Finance', 'Healthcare'],
};

const getIndustryFilter = (category) => {
  if (!category || category === 'All') return '';
  return categoryIndustryMap[category] || '';
};

  const totalActiveFilters = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

  const getRatingColor = (rating) => {
    if (rating >= 4.0) return '#0DBF7B';
    if (rating >= 3.5) return '#F59E0B';
    return '#EF4444';
  };

  const buildPagination = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (activePage > 3) pages.push('...');
      const start = Math.max(2, activePage - 1);
      const end = Math.min(totalPages - 1, activePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (activePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="cp-root">
      {/* Navbar */}
      <nav className="cp-nav">
        <div className="cp-nav-inner">
          <Link to="/" className="cp-logo">
            <img src={mavenLogo} alt="MavenJobs" style={{ height: '100%' }} />
          </Link>

          <div className="cp-nav-links">
            <Link to="/jobs" className="cp-nav-link">Jobs</Link>
            <Link to="/companies" className="cp-nav-link active">Companies</Link>
            <Link to="/services" className="cp-nav-link">Services</Link>
          </div>

          <div className="cp-nav-search">
            <FiSearch className="cp-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search companies, industries or roles..."
              className="cp-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="cp-nav-actions">
            <div className="cp-bell" onClick={() => setShowNotifications(true)}>
              <FiBell size={18} />
              <span className="cp-bell-dot"></span>
            </div>
            <Link to="/profile">
              <img
                src="https://i.pinimg.com/736x/26/89/19/268919fb14ab9fb609647d7011140ab7.jpg"
                alt="User"
                className="cp-avatar"
              />
            </Link>
          </div>
        </div>
      </nav>

      <main className="cp-main">
        {/* Hero */}
        <div className="cp-hero">
          <div className="cp-hero-left">
            <div className="cp-eyebrow">
              <span className="cp-eyebrow-dot"></span>
              Discover Excellence
            </div>
            <h1 className="cp-title">Top companies hiring <span className="cp-title-accent">right now</span></h1>
            <p className="cp-subtitle">Explore {totalCompanies.toLocaleString()}+ companies across industries and find your next career move.</p>
          </div>
        </div>

        {/* Category Grid */}
        <div className="cp-cat-grid-layout">
          <div
            className="cp-cat-pill"
            style={{ '--accent': categories[0].accent, width: '100%' }}
            onClick={() => setActiveCategory(activeCategory === 'MNCs' ? 'All' : 'MNCs')}
          >
            <span className="cp-cat-icon" style={{ color: categories[0].accent }}>{categories[0].icon}</span>
            <div>
              <div className="cp-cat-name">{categories[0].name}</div>
              <div className="cp-cat-count">{categories[0].count}</div>
            </div>
            <FiArrowRight size={14} className="cp-cat-arrow" />
          </div>

          <div className="cp-cat-right-row">
            {categories.slice(1).map((cat, i) => (
              <div
                key={i}
                className="cp-cat-pill"
                style={{ '--accent': cat.accent, flex: 1 }}
                onClick={() => setActiveCategory(activeCategory === cat.name ? 'All' : cat.name)}
              >
                <span className="cp-cat-icon" style={{ color: cat.accent }}>{cat.icon}</span>
                <div>
                  <div className="cp-cat-name">{cat.name}</div>
                  <div className="cp-cat-count">{cat.count}</div>
                </div>
                <FiArrowRight size={14} className="cp-cat-arrow" />
              </div>
            ))}
          </div>
        </div>

        <div className="cp-layout">
          {/* Sidebar */}
          <aside className="cp-sidebar">
            <div className="cp-filter-card">
              <div className="cp-filter-header">
                <div className="cp-filter-title-row">
                  <FiFilter size={15} className="cp-filter-icon" />
                  <h2 className="cp-filter-heading">Filters</h2>
                  {totalActiveFilters > 0 && (
                    <span className="cp-filter-badge">{totalActiveFilters}</span>
                  )}
                </div>
                {totalActiveFilters > 0 && (
                  <button className="cp-clear-btn" onClick={clearAll}>Clear all</button>
                )}
              </div>

              {Object.entries(filterGroups).map(([group, items]) => (
                <div key={group} className="cp-filter-group">
                  <h4 className="cp-filter-group-label">{group}</h4>
                  {group === 'Location' && (
                    <div className="cp-filter-search-wrap">
                      <FiSearch size={13} className="cp-filter-search-icon" />
                      <input
                        type="text"
                        placeholder="Search city..."
                        className="cp-filter-search-input"
                      />
                    </div>
                  )}
                  {items.map(item => {
                    const isChecked = (activeFilters[group] || []).includes(item);
                    return (
                      <label
                        key={item}
                        className={`cp-checkbox-item ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleFilter(group, item)}
                      >
                        <div className={`cp-checkbox ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <FiCheckCircle size={11} />}
                        </div>
                        <span className="cp-checkbox-label">{item}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="cp-content">
            <div className="cp-results-bar">
              <div className="cp-results-info">
                <span className="cp-results-count">{totalCompanies.toLocaleString()}</span>
                <span className="cp-results-text"> elite companies found</span>
              </div>
              <div className="cp-sort-wrap">
                <span className="cp-sort-label">Sort by</span>
                <select
                  className="cp-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option>Most Popular</option>
                  <option>Highest Rated</option>
                  <option>Recently Added</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading companies...</div>
              </div>
            ) : companies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <FiBriefcase size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>No companies found</div>
                <p style={{ fontSize: '13px', marginTop: 4 }}>Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="cp-grid">
                {companies.map(company => (
                  <div
                    key={company.id}
                    className="cp-company-card"
                    onClick={() => navigate(`/company/${company.id}`)}
                  >
                    <div className="cp-comp-logo-wrap">
                      <div
                        className="cp-comp-logo"
                        style={{ background: company.logoUrl ? 'transparent' : company.color }}
                      >
                        {company.logoUrl ? (
                          <img src={company.logoUrl} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                        ) : (
                          company.logo
                        )}
                      </div>
                    </div>

                    <div className="cp-comp-body">
                      <div className="cp-comp-header">
                        <span className="cp-comp-name">{company.name}</span>
                        {company.activelyHiring && (
                          <div className="cp-rating-badge" style={{ background: '#0DBF7B' }}>
                            <FiZap size={9} style={{ fill: 'white', stroke: 'white' }} />
                            Hiring
                          </div>
                        )}
                      </div>

                      <div className="cp-comp-reviews">
                        {company.activeJobCount} Active Jobs
                      </div>

                      <div className="cp-comp-tags">
                        {company.industry && <span className="cp-comp-tag">{company.industry}</span>}
                        {company.location && <span className="cp-comp-tag">{company.location}</span>}
                        {company.founded && <span className="cp-comp-tag">Founded: {company.founded}</span>}
                      </div>
                    </div>

                    <div className="cp-comp-caret">
                      <FiChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="cp-pagination">
                <button
                  className="cp-page-btn cp-page-nav"
                  disabled={activePage <= 1}
                  onClick={() => handlePageChange(activePage - 1)}
                >
                  <FiChevronLeft size={16} />
                </button>
                {buildPagination().map((p, i) => (
                  <button
                    key={i}
                    className={`cp-page-btn ${activePage === p ? 'active' : ''} ${p === '...' ? 'dots' : ''}`}
                    onClick={() => handlePageChange(p)}
                    disabled={p === '...'}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="cp-page-btn cp-page-nav"
                  disabled={activePage >= totalPages}
                  onClick={() => handlePageChange(activePage + 1)}
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="cp-footer">
        <div className="cp-footer-inner">
          <img src={mavenLogo} alt="MavenJobs" className="cp-footer-logo" />
          <div className="cp-foot-links">
            <Link to="#" className="cp-foot-link">Privacy Policy</Link>
            <Link to="#" className="cp-foot-link">Terms of Service</Link>
            <Link to="#" className="cp-foot-link">Help Center</Link>
            <Link to="#" className="cp-foot-link">Cookies</Link>
          </div>
          <p className="cp-footer-copy">© 2026 MavenJobs Intelligence Portal. All rights reserved.</p>
        </div>
      </footer>

      {/* Notification Modal */}
      {showNotifications && (
        <div className="cp-modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3 className="cp-modal-title">Notifications</h3>
              <button className="cp-modal-close" onClick={() => setShowNotifications(false)}>
                <FiX size={18} />
              </button>
            </div>
            <div className="cp-modal-body">
              <div className="cp-notif-empty">
                <div className="cp-notif-icon"><FiBell size={22} /></div>
                <p>You're all caught up</p>
                <span>No new notifications at this time</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;