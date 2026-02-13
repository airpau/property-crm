import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const ForgotPassword = () => {
  const { resetPassword, error: authError, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorState('');
    setError(null);

    const result = await resetPassword(email);

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
            <div className="success-icon">📧</div>
            <h2>Check Your Email</h2>
          </div>
          <p className="auth-message">
            If an account exists with {email}, we've sent password reset instructions.
          </p>
          <Link to="/login" className="auth-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏠 Property CRM</h1>
          <h2>Reset Password</h2>
          <p>Enter your email to receive reset instructions</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {(error || authError) && (
            <div className="auth-error">
              {error || authError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
