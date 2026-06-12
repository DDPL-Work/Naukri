import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiChevronDown, FiGrid, FiBell } from 'react-icons/fi';
import { useAuth } from '../AuthContext';
import mavenLogo from '../../assets/maven-logo-BdiSsfJk.svg';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, openLogin, openRegister } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`shared-nav ${isScrolled ? 'scrolled' : ''}`}>
      <div className="shared-nav-container">
        {/* Logo */}
        <Link to="/employer-login" className="shared-nav-logo">
          <img src={mavenLogo} alt="Naukri" className="shared-nav-logo-image" />
        </Link>

        {/* Links */}
        <div className="shared-nav-links">
          <div 
            className="shared-nav-link-item"
            onMouseEnter={() => setActiveNavDropdown('Jobs')}
            onMouseLeave={() => setActiveNavDropdown(null)}
          >
            <Link to="/jobs">Jobs <span className="nav-badge">1</span></Link>
            {activeNavDropdown === 'Jobs' && (
              <div className="shared-mega-menu">
                <div className="shared-mega-column">
                  <h4>Popular categories</h4>
                  <Link to="/jobs">IT jobs</Link>
                  <Link to="/jobs">Sales jobs</Link>
                  <Link to="/jobs">Marketing jobs</Link>
                </div>
                <div className="shared-mega-column">
                  <h4>Jobs in demand</h4>
                  <Link to="/jobs">Fresher jobs</Link>
                  <Link to="/jobs">Remote jobs</Link>
                </div>
              </div>
            )}
          </div>

          <div 
            className="shared-nav-link-item"
            onMouseEnter={() => setActiveNavDropdown('Companies')}
            onMouseLeave={() => setActiveNavDropdown(null)}
          >
            <Link to="/companies">Companies</Link>
          </div>


        </div>

        {/* Right Actions */}
        <div className="shared-nav-actions">
          
          {/* Search Bar */}
          <div className="shared-nav-search">
            <input type="text" placeholder="Search jobs here" />
            <button className="shared-nav-search-btn">
              <FiSearch size={16} />
            </button>
          </div>

          {/* Naukri 360 */}
          <button className="shared-nav-360-btn">
            naukri <span style={{ color: '#10b981' }}>360</span>
          </button>

          {/* Notifications */}
          <div className="shared-nav-bell">
            <FiBell size={22} color="#6b7280" />
            <span className="nav-badge">1</span>
          </div>

          {/* Profile Pill */}
          {user ? (
            <div className="shared-nav-profile-pill">
              <FiGrid size={18} color="#6b7280" style={{ cursor: 'pointer' }} />
              <div className="shared-nav-avatar-wrapper" onClick={() => navigate('/profile')}>
                <img src={user.profilePic || ""} alt="Profile" className="shared-nav-avatar" />
                <span className="nav-badge avatar-badge">2</span>
              </div>
              
              <div className="shared-nav-profile-dropdown">
                <div className="dropdown-header">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <Link to="/profile" className="dropdown-item">View Profile</Link>
                <button onClick={logout} className="dropdown-item">Logout</button>
              </div>
            </div>
          ) : (
            <div className="shared-nav-auth-buttons">
              <button className="btn-login" onClick={openLogin}>Login</button>
              <button className="btn-register" onClick={openRegister}>Register</button>
            </div>
          )}
          
          {/* For Employers Entry */}
          <button 
            className="shared-nav-employer-btn" 
            onClick={() => navigate('/employer-login')}
            title="Employer Login"
          >
            <FiBriefcase size={20} />
            <span>Employer Login</span>
          </button>

          {/* Existing For Employers Dropdown */}
          {!user && (
            <div className="shared-nav-employer">
              <span>For employers <FiChevronDown /></span>
            </div>
          )}

        </div>
      </div>
    </nav>
  );
}
