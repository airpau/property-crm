import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register, error: authError, setError } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setErrorState('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setErrorState('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setErrorState('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register(
      formData.email,
      formData.password,
      formData.name,
      formData.company
    );

    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setErrorState(result.error);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon">✅</div>
            <h2>Registration Successful!</h2>
          </div>
          <p className="auth-message">
            Please check your email to verify your account.
            Once verified, you can sign in.
          </p>
          <button 
            className="auth-button"
            onClick={() => navigate('/login')}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏠 Property CRM</h1>
          <h2>Create Account</h2>
          <p>Start managing your properties today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {(error || authError) && (
            <div className="auth-error">
              {error || authError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your full name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="company">Company Name (optional)</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your company"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="At least 6 characters"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter your password"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
