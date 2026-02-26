import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MTDLanding.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://property-crm-api-8t0r.onrender.com';

const HMRC_CATEGORIES = [
  { icon: '🏠', title: 'Property Income', desc: 'Rent, SA bookings, service charges — all auto-categorised' },
  { icon: '🔧', title: 'Repairs & Maintenance', desc: 'Plumbing, electrical, cleaning — tagged as they happen' },
  { icon: '📋', title: 'Insurance & Rates', desc: 'Buildings insurance, council tax, ground rent' },
  { icon: '💼', title: 'Professional Fees', desc: 'Letting agent fees, accountancy, legal costs' },
  { icon: '🏦', title: 'Finance Costs', desc: 'Mortgage interest, loan charges (with 20% restriction)' },
  { icon: '📊', title: 'Quarterly Submissions', desc: 'HMRC-ready reports generated automatically each quarter' },
];

const TIMELINE = [
  { date: 'Apr 6, 2026', label: 'MTD Launches', desc: 'Landlords with income >£50k must comply' },
  { date: 'Jul 5, 2026', label: 'Q1 Deadline', desc: 'First quarterly update due to HMRC' },
  { date: 'Oct 5, 2026', label: 'Q2 Deadline', desc: 'Second quarterly update' },
  { date: 'Jan 5, 2027', label: 'Q3 Deadline', desc: 'Third quarterly update' },
  { date: 'Apr 5, 2027', label: 'Q4 + EOPS', desc: 'Final quarter + End of Period Statement' },
];

function MTDLanding() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [propertyCount, setPropertyCount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleWaitlist = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/mtd/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, property_count: parseInt(propertyCount) || null }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join waitlist');
      }
      
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mtd-landing">
      {/* Nav */}
      <nav className="mtd-nav">
        <div className="mtd-nav-content">
          <div className="mtd-logo" onClick={() => navigate('/')}>👼 Property Angel.ai</div>
          <div className="mtd-nav-links">
            <a href="#features">Features</a>
            <a href="#timeline">Timeline</a>
            <a href="#pricing">Pricing</a>
            <button onClick={() => navigate('/login')} className="btn-outline">Log In</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mtd-hero">
        <div className="mtd-hero-badge">⚠️ 5 Weeks Until Go-Live</div>
        <h1>Making Tax Digital starts April 6th.<br />Are you ready?</h1>
        <p className="mtd-hero-subtitle">
          Property Angel automatically categorises your property income and expenses into HMRC-approved categories,
          generates quarterly reports, and connects to Airbnb &amp; Booking.com — so you never miss a deadline.
        </p>
        <div className="mtd-hero-cta">
          <a href="#waitlist" className="btn-mtd-primary">Join the Waitlist →</a>
          <a href="#features" className="btn-mtd-secondary">See How It Works</a>
        </div>
        <div className="mtd-hero-trust">
          <span>🔒 HMRC-Compatible</span>
          <span>📊 Auto-Categorisation</span>
          <span>🔗 Airbnb &amp; Booking.com</span>
        </div>
      </section>

      {/* Problem */}
      <section className="mtd-problem">
        <div className="mtd-container">
          <h2>What MTD Means for Landlords</h2>
          <div className="mtd-problem-grid">
            <div className="mtd-problem-card bad">
              <h3>❌ Without Property Angel</h3>
              <ul>
                <li>Manually categorise every transaction</li>
                <li>Chase Airbnb/Booking.com statements</li>
                <li>Scramble before each quarterly deadline</li>
                <li>Pay your accountant to sort the mess</li>
                <li>Risk HMRC penalties for late/wrong submissions</li>
              </ul>
            </div>
            <div className="mtd-problem-card good">
              <h3>✅ With Property Angel</h3>
              <ul>
                <li>Income &amp; expenses auto-categorised</li>
                <li>Airbnb/Booking.com data pulled automatically</li>
                <li>Quarterly reports generated in one click</li>
                <li>Export CSV/PDF for your accountant</li>
                <li>Submit directly to HMRC (coming soon)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mtd-features">
        <div className="mtd-container">
          <h2>Built for HMRC Compliance</h2>
          <p className="mtd-section-sub">Every income and expense mapped to official HMRC property categories.</p>
          <div className="mtd-features-grid">
            {HMRC_CATEGORIES.map((f, i) => (
              <div key={i} className="mtd-feature-card">
                <div className="mtd-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" className="mtd-timeline-section">
        <div className="mtd-container">
          <h2>Key Dates You Can't Miss</h2>
          <div className="mtd-timeline">
            {TIMELINE.map((t, i) => (
              <div key={i} className={`mtd-timeline-item ${i === 0 ? 'active' : ''}`}>
                <div className="mtd-timeline-dot" />
                <div className="mtd-timeline-content">
                  <div className="mtd-timeline-date">{t.date}</div>
                  <h3>{t.label}</h3>
                  <p>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mtd-pricing">
        <div className="mtd-container">
          <h2>Simple Pricing</h2>
          <p className="mtd-section-sub">Everything you need for MTD compliance. No hidden fees.</p>
          <div className="mtd-pricing-card-single">
            <div className="mtd-pricing-badge">Early Bird — 50% Off</div>
            <div className="mtd-pricing-amount">
              <span className="mtd-price-from">From</span>
              <span className="mtd-price">£19</span>
              <span className="mtd-price-per">/month per property</span>
            </div>
            <ul className="mtd-pricing-features">
              <li>✓ Auto-categorisation of all income &amp; expenses</li>
              <li>✓ HMRC-ready quarterly reports</li>
              <li>✓ Airbnb &amp; Booking.com integration</li>
              <li>✓ CSV &amp; PDF export for your accountant</li>
              <li>✓ Direct HMRC submission (when available)</li>
              <li>✓ Open Banking transaction import</li>
            </ul>
            <a href="#waitlist" className="btn-mtd-primary btn-large">Join Waitlist for Early Bird Price →</a>
            <p className="mtd-pricing-note">Lock in £19/mo — price goes to £29/mo after launch</p>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="mtd-waitlist">
        <div className="mtd-container">
          {submitted ? (
            <div className="mtd-waitlist-success">
              <div className="mtd-success-icon">🎉</div>
              <h2>You're on the list!</h2>
              <p>We'll email you as soon as the MTD module is live. You've locked in the early bird price.</p>
              <button onClick={() => navigate('/register')} className="btn-mtd-primary">
                Create Your Property Angel Account →
              </button>
            </div>
          ) : (
            <>
              <h2>Get Early Access</h2>
              <p className="mtd-section-sub">
                Join the waitlist to lock in the early bird price and be first to try the MTD module.
              </p>
              <form onSubmit={handleWaitlist} className="mtd-waitlist-form">
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <select
                  value={propertyCount}
                  onChange={(e) => setPropertyCount(e.target.value)}
                >
                  <option value="">How many properties?</option>
                  <option value="1">1 property</option>
                  <option value="3">2-3 properties</option>
                  <option value="5">4-5 properties</option>
                  <option value="10">6-10 properties</option>
                  <option value="20">11-20 properties</option>
                  <option value="50">20+ properties</option>
                </select>
                {error && <div className="mtd-form-error">{error}</div>}
                <button type="submit" className="btn-mtd-primary btn-large" disabled={submitting}>
                  {submitting ? 'Joining...' : 'Join the Waitlist — It\'s Free'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mtd-footer">
        <p>© 2026 Property Angel.ai · <a href="mailto:hello@propangel.co.uk">hello@propangel.co.uk</a></p>
        <p className="mtd-footer-tag">👼 Making Tax Digital, made simple.</p>
      </footer>
    </div>
  );
}

export default MTDLanding;
