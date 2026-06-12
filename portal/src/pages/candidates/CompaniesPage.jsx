import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiSearch, FiMapPin, FiBriefcase, FiChevronRight, FiChevronLeft,
  FiFilter, FiCheckCircle, FiBell, FiArrowRight, FiX, FiAward,
  FiZap, FiGlobe, FiLayers, FiBox, FiLogOut, FiClock
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import mavenLogo from '../../../assets/maven-logo-BdiSsfJk.svg';
import authService from '../../services/authService';
import { useAuth } from '../../AuthContext';
import './CompaniesPage.css';

const COMPANIES_PER_PAGE = 10;

const categoryConfig = [
  { id: 'MNCs', icon: <FiGlobe />, accent: '#1E5EFF', industryMatch: 'MNC' },
  { id: 'Internet', icon: <FiZap />, accent: '#7C3AED', industryMatch: 'Internet|IT|Software' },
  { id: 'Manufacturing', icon: <FiLayers />, accent: '#0DBF7B', industryMatch: 'Manufacturing' },
  { id: 'Fortune 500', icon: <FiAward />, accent: '#F59E0B', industryMatch: null, packageMatch: 'ELITE' },
  { id: 'Product', icon: <FiBox />, accent: '#EF4444', industryMatch: 'Product' },
];

const sortOptions = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Highest Rated', value: 'name' },
  { label: 'Recently Added', value: 'newest' },
];

const CompaniesPage = () => {
  const navigate = useNavigate();
  const { user, logout, openLogin, openRegister } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [locQuery, setLocQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sortBy, setSortBy] = useState('Most Popular');
  const [activePage, setActivePage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFilters, setActiveFilters] = useState({});
  const [companies, setCompanies] = useState([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ mncs: 0, internet: 0, manufacturing: 0, fortune500: 0, product: 0 });
  const [filterOptions, setFilterOptions] = useState({ industries: [], cities: [], companyTypes: [] });
  const [locSearch, setLocSearch] = useState('');
  const initialised = useRef(false);

  const buildFilterParams = useCallback((page = 1) => {
    let sortParam = 'popular';
    if (sortBy === 'Highest Rated') sortParam = 'name';
    if (sortBy === 'Recently Added') sortParam = 'newest';

    const params = {
      q: searchQuery,
      location: locQuery,
      sort: sortParam,
      page,
      limit: COMPANIES_PER_PAGE,
    };

    if (activeCategory && activeCategory !== 'All') {
      const cfg = categoryConfig.find(c => c.id === activeCategory);
      if (cfg) {
        if (cfg.industryMatch) params.industry = cfg.industryMatch;
        if (cfg.packageMatch) params.packageType = cfg.packageMatch;
      }
    }

    if (activeFilters['Company Type']?.length) {
      params.companyType = activeFilters['Company Type'].join(',');
    }
    if (activeFilters['Location']?.length) {
      const locs = activeFilters['Location'].filter(Boolean);
      if (locs.length) params.location = locs.join(',');
    }
    if (activeFilters['Industry']?.length) {
      const inds = activeFilters['Industry'].filter(Boolean);
      if (inds.length) {
        params.industry = params.industry
          ? `${params.industry}|${inds.join('|')}`
          : inds.join('|');
      }
    }

    return params;
  }, [searchQuery, locQuery, sortBy, activeCategory, activeFilters]);

  const fetchCompanies = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = buildFilterParams(page);
      const res = await authService.getCompanies(params);
      if (res?.success && res?.data) {
        setCompanies(res.data.companies || []);
        setTotalCompanies(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        setActivePage(res.data.page || 1);
      }
    } catch (err) {
      if (err?.status !== 401) console.error('Failed to fetch companies:', err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authService.getCompanyStats({ q: searchQuery, location: locQuery });
      if (res?.success && res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      if (err?.status !== 401) console.error('Failed to fetch stats:', err);
    }
  }, [searchQuery, locQuery]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await authService.getCompanyFilterOptions();
      if (res?.success && res?.data) {
        setFilterOptions({
          industries: res.data.industries || [],
          cities: res.data.cities || [],
          companyTypes: res.data.companyTypes || [],
        });
      }
    } catch (err) {
      if (err?.status !== 401) console.error('Failed to fetch filter options:', err);
    }
  }, []);

  // ── Initial load (runs once) ──
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    fetchFilterOptions();
    fetchCompanies(1);
    fetchStats();
  }, [fetchFilterOptions, fetchCompanies, fetchStats]);

  // ── Re-fetch when filters/sort/category change ──
  useEffect(() => {
    if (!initialised.current) return;
    window.scrollTo(0, 0);
    fetchCompanies(1);
    fetchStats();
  }, [sortBy, activeCategory, activeFilters, locQuery, fetchCompanies, fetchStats]);

  // ── Debounced search ──
  useEffect(() => {
    if (!initialised.current) return;
    const timeout = setTimeout(() => {
      setActivePage(1);
      fetchCompanies(1);
      fetchStats();
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchCompanies, fetchStats]);

  const handlePageChange = (page) => {
    if (page === '...' || page < 1 || page > totalPages) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchCompanies(page);
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
    setActivePage(1);
  };

  const clearAll = () => {
    setActiveFilters({});
    setActiveCategory('All');
    setSearchQuery('');
    setLocQuery('');
    setActivePage(1);
  };

  const categories = categoryConfig.map(cfg => {
    let count;
    if (cfg.id === 'MNCs') count = stats.mncs;
    else if (cfg.id === 'Internet') count = stats.internet;
    else if (cfg.id === 'Manufacturing') count = stats.manufacturing;
    else if (cfg.id === 'Fortune 500') count = stats.fortune500;
    else if (cfg.id === 'Product') count = stats.product;
    else count = 0;
    return { ...cfg, count: `${count} Companies` };
  });

  const filteredCities = locSearch
    ? filterOptions.cities.filter(c =>
        c.toLowerCase().includes(locSearch.toLowerCase())
      )
    : filterOptions.cities;

  const totalActiveFilters = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

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
            {user ? (
              <>
                <Link to="/profile">
                  <img
                    src={user.profilePic || ""}
                    alt="User"
                    className="cp-avatar"
                  />
                </Link>
                <button onClick={logout} className="cp-logout-btn" title="Logout"><FiLogOut size={16} /></button>
              </>
            ) : (
              <>
                <button className="cp-btn cp-btn--outline" onClick={openLogin}>Login</button>
                <button className="cp-btn cp-btn--fill" onClick={openRegister}>Register</button>
              </>
            )}
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
            className={`cp-cat-pill ${activeCategory === 'MNCs' ? 'active' : ''}`}
            style={{ '--accent': categories[0].accent, width: '100%' }}
            onClick={() => setActiveCategory(activeCategory === 'MNCs' ? 'All' : 'MNCs')}
          >
            <span className="cp-cat-icon" style={{ color: categories[0].accent }}>{categories[0].icon}</span>
            <div>
              <div className="cp-cat-name">{categories[0].id}</div>
              <div className="cp-cat-count">{categories[0].count}</div>
            </div>
            <FiArrowRight size={14} className="cp-cat-arrow" />
          </div>

          <div className="cp-cat-right-row">
            {categories.slice(1).map((cat) => (
              <div
                key={cat.id}
                className={`cp-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                style={{ '--accent': cat.accent, flex: 1 }}
                onClick={() => setActiveCategory(activeCategory === cat.id ? 'All' : cat.id)}
              >
                <span className="cp-cat-icon" style={{ color: cat.accent }}>{cat.icon}</span>
                <div>
                  <div className="cp-cat-name">{cat.id}</div>
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

              {/* Company Type */}
              {filterOptions.companyTypes.length > 0 && (
                <div className="cp-filter-group">
                  <h4 className="cp-filter-group-label">Company Type</h4>
                  {filterOptions.companyTypes.map(item => {
                    const isChecked = (activeFilters['Company Type'] || []).includes(item);
                    return (
                      <label
                        key={item}
                        className={`cp-checkbox-item ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleFilter('Company Type', item)}
                      >
                        <div className={`cp-checkbox ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <FiCheckCircle size={11} />}
                        </div>
                        <span className="cp-checkbox-label">{item}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Location */}
              {filterOptions.cities.length > 0 && (
                <div className="cp-filter-group">
                  <h4 className="cp-filter-group-label">Location</h4>
                  <div className="cp-filter-search-wrap">
                    <FiSearch size={13} className="cp-filter-search-icon" />
                    <input
                      type="text"
                      placeholder="Search city..."
                      className="cp-filter-search-input"
                      value={locSearch}
                      onChange={(e) => setLocSearch(e.target.value)}
                    />
                  </div>
                  {filteredCities.slice(0, 8).map(item => {
                    const isChecked = (activeFilters['Location'] || []).includes(item);
                    return (
                      <label
                        key={item}
                        className={`cp-checkbox-item ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleFilter('Location', item)}
                      >
                        <div className={`cp-checkbox ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <FiCheckCircle size={11} />}
                        </div>
                        <span className="cp-checkbox-label">{item}</span>
                      </label>
                    );
                  })}
                  {filteredCities.length > 8 && (
                    <div className="cp-filter-more">+{filteredCities.length - 8} more cities</div>
                  )}
                </div>
              )}

              {/* Industry */}
              {filterOptions.industries.length > 0 && (
                <div className="cp-filter-group">
                  <h4 className="cp-filter-group-label">Industry</h4>
                  {filterOptions.industries.slice(0, 10).map(item => {
                    const isChecked = (activeFilters['Industry'] || []).includes(item);
                    return (
                      <label
                        key={item}
                        className={`cp-checkbox-item ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleFilter('Industry', item)}
                      >
                        <div className={`cp-checkbox ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <FiCheckCircle size={11} />}
                        </div>
                        <span className="cp-checkbox-label">{item}</span>
                      </label>
                    );
                  })}
                  {filterOptions.industries.length > 10 && (
                    <div className="cp-filter-more">+{filterOptions.industries.length - 10} more industries</div>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Content */}
          <div className="cp-content">
            <div className="cp-results-bar">
              <div className="cp-results-info">
                <span className="cp-results-count">{totalCompanies.toLocaleString()}</span>
                <span className="cp-results-text"> companies found</span>
              </div>
              <div className="cp-sort-wrap">
                <span className="cp-sort-label">Sort by</span>
                <select
                  className="cp-sort-select"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setActivePage(1);
                  }}
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="cp-loading-state">
                <div className="cp-skeleton-card" />
                <div className="cp-skeleton-card" />
                <div className="cp-skeleton-card" />
              </div>
            ) : companies.length === 0 ? (
              <div className="cp-empty-state">
                <FiBriefcase size={40} className="cp-empty-icon" />
                <div className="cp-empty-title">No companies found</div>
                <p className="cp-empty-desc">Try adjusting your search or filters</p>
                {totalActiveFilters > 0 && (
                  <button className="cp-empty-clear" onClick={clearAll}>Clear all filters</button>
                )}
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
                          <img src={company.logoUrl} alt={company.name} />
                        ) : (
                          company.logo
                        )}
                      </div>
                    </div>

                    <div className="cp-comp-body">
                      <div className="cp-comp-header">
                        <span className="cp-comp-name">{company.name}</span>
                        {company.activelyHiring && (
                          <div className="cp-rating-badge cp-hiring-badge">
                            <FiZap size={9} />
                            Hiring
                          </div>
                        )}
                      </div>

                      <div className="cp-comp-reviews">
                        {company.activeJobCount} Active Jobs
                      </div>

                      <div className="cp-comp-tags">
                        {company.industry && <span className="cp-comp-tag">{company.industry}</span>}
                        {company.location && (
                          <span className="cp-comp-tag">
                            <FiMapPin size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                            {company.location}
                          </span>
                        )}
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
            {totalPages > 1 && !loading && (
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
