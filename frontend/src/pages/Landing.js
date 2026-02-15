import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const PROPERTY_CATEGORIES = [
  { value: 'btr', icon: '🏠', title: 'Buy to Let', desc: 'Single tenancy properties' },
  { value: 'hmo', icon: '🏢', title: 'HMO', desc: 'Multi-let properties' },
  { value: 'sa', icon: '✈️', title: 'Serviced Accommodation', desc: 'Short-term rentals' },
  { value: 'commercial', icon: '🏭', title: 'Commercial', desc: 'Commercial lettings' }
];

const FEATURES = [
  { icon: '💰', title: 'Automated Rent Tracking', desc: 'Never miss a payment with automatic tracking and late alerts' },
  { icon: '📊', title: 'Profit & Loss Insights', desc: 'Real-time P&L per property with forecasting' },
  { icon: '✈️', title: 'SA Management', desc: 'Track Airbnb, VRBO bookings with PM fee calculations' },
  { icon: '🏢', title: 'HMO Tools', desc: 'Room-by-room tenancy management' },
  { icon: '📅', title: '6-Month Forecast', desc: 'See projected income and expenses ahead' },
  { icon: '☁️', title: 'Cloud Documents', desc: 'Google Drive integration for all property docs' }
];

const PRICING = [
  { name: 'Starter', price: '9', desc: 'Up to 3 properties', features: ['Basic rent tracking', 'Expense recording', 'Tenant management'] },
  { name: 'Professional', price: '29', popular: true, desc: 'Unlimited properties', features: ['All property types', '6-month forecast', 'PM calculations', 'Drive integration', 'Priority support'] },
  { name: 'Portfolio', price: '79', desc: 'For serious investors', features: ['QuickBooks integration', 'Multi-user access', 'API access', 'White-label reports', 'Account manager'] }
];

function Landing() {
  const navigate = useNavigate();

  const handleSignUp = (plan) => {
    alert(`${plan} plan coming soon! Stripe integration pending.`);
  };

  return (
    <div className="landing">
      {/* Navbar -->}
      <nav className="landing-nav">
        <div className="landing-nav-content">
          <div className="landing-logo">👼 Property Angel.ai</div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <button onClick={() => navigate('/login')} className="btn-outline">Log In</button>
          </div>
        </div>
      </nav>

      {/* Hero >}
      <section className="landing-hero">
        <div className="landing-hero-badge">🚀 Now with AI-Powered Insights</div>
        <h1>Property Management,<br />Reimagined with AI</h1>
        <p className="landing-hero-subtitle">
          The all-in-one platform for landlords managing HMOs, Buy-to-Lets, and Serviced Accommodation.
        </p>
        <div className="landing-hero-cta">
          <button onClick={() => handleSignUp('Professional')} className="btn-premium">
            Start Free Trial →
          </button>
          <button onClick={() => navigate('/login')} className="btn-outline-light">
            Existing User? Log In
          </button>
        </div>
      </section>

      {/* Features >}
      <section id="features" className="landing-features">
        <div className="landing-container">
          <h2>Everything You Need</h2>
          <p className="landing-section-subtitle">From rent collection to expense tracking, automate the busywork.</p>
          
          <div className="landing-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Property Types >}
      <section className="landing-types">
        <div className="landing-container">
          <h2>Built for Every Property Type</h2>
          <div className="landing-types-grid">
            {PROPERTY_CATEGORIES.map((type, i) => (
              <div key={i} className="landing-type-card">
                <div className="landing-type-icon">{type.icon}</div>
                <h3>{type.title}</h3>
                <p>{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview >}
      <section className="landing-preview">
        <div className="landing-container">
          <h2>Your Dashboard, Simplified</h2>
          <div className="landing-dashboard-mockup">
            <div className="landing-dashboard-header">📊 Portfolio Overview</div>
            <div className="landing-dashboard-cards">
              <div className="landing-dbcard income">
                <label>Monthly Income</label>
                <div className="value">£4,850</div>
              </div>
              <div className="landing-dbcard expenses">
                <label>Expenses</label>
                <div className="value">£890</div>
              </div>
              <div className="landing-dbcard profit">
                <label>Net Profit</label>
                <div className="value">£3,960</div>
              </div>
              <div className="landing-dbcard rate">
                <label>Collection Rate</label>
                <div className="value">98%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing >}
      <section id="pricing" className="landing-pricing">
        <div className="landing-container">
          <h2>Simple, Transparent Pricing</h2>
          <p className="landing-section-subtitle">Start free, then scale as your portfolio grows.</p>
          
          <div className="landing-pricing-grid">
            {PRICING.map((plan, i) => (
              <div key={i} className={`landing-pricing-card ${plan.popular ? 'featured' : ''}`}>
                {plan.popular && <span className="popular-tag">Most Popular</span>}
                <h3>{plan.name}</h3>
                <div className="landing-price">£{plan.price}<span>/mo</span></div>
                <p>{plan.desc}</p>
                <ul>
                  {plan.features.map((f, j) => <li key={j}>✓ {f}</li>)}
                </ul>
                <button 
                  onClick={() => handleSignUp(plan.name)}
                  className={plan.popular ? 'btn-premium' : 'btn-outline-dark'}
                >
                  {plan.popular ? 'Start Free Trial' : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA >}
      <section className="landing-cta">
        <div className="landing-container">
          <h2>Ready to Transform Your Property Management?</h2>
          <p>Join thousands of landlords who have simplified their portfolio.</p>
          <div className="landing-hero-cta">
            <button onClick={() => handleSignUp('Professional')} className="btn-premium-large">
              Get Started Free →
            </button>
            <button onClick={() => navigate('/login')} className="btn-outline-light">
              Log In to Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer >}
      <footer className="landing-footer">
        <div className="landing-footer-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="mailto:hello@propangel.co.uk">Contact</a>
          <a href="/login">Log In</a>
        </div>
        <p>© 2026 Property Angel.ai. All rights reserved.</p>
        <p className="tagline">👼 Powered by AI · Made with ❤️ for landlords</p>
      </footer>
    </div>
  );
}

export default Landing;
