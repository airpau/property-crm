import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🏠</span>
          <span className="logo-text">Property CRM</span>
        </Link>
      </div>

      <nav className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Properties
        </NavLink>
        <NavLink to="/tenants" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Tenants
        </NavLink>
        <NavLink to="/rent-tracker" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Rent Tracker
        </NavLink>
      </nav>

      <div className="navbar-right">
        <div className="user-menu">
          <button 
            className="user-button"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <span className="user-name">
              {user?.name || user?.email || 'User'}
            </span>
            <span className="dropdown-arrow">▼</span>
          </button>

          {showDropdown && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <p className="dropdown-name">{user?.name}</p>
                <p className="dropdown-email">{user?.email}</p>
                {user?.company && <p className="dropdown-company">{user.company}</p>}
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
