import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <img src={logo} alt="Agent Bleu" className="landing-nav-logo" />
        <div className="landing-nav-actions">
          <button className="btn ghost" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button className="btn" onClick={() => navigate('/register')}>
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <img src={logo} alt="Agent Bleu" className="landing-hero-logo" />
          <div className="landing-hero-text">
          <span className="landing-badge">AI-Powered Personality Assessment</span>
          <h1 className="landing-h1">
            Discover who you are.<br />
            <span className="landing-h1-accent">Agent Bleu reads your personality.</span>
          </h1>
          <p className="landing-lead">
            Answer a short, research-backed questionnaire. Agent Bleu's AI engine analyses
            your responses in real time and delivers a rich, personalised narrative of
            your dominant temperament — with zero judgment and full respect for your privacy.
          </p>
          <div className="landing-hero-cta">
            <button className="btn landing-cta-primary" onClick={() => navigate('/register')}>
              Start your free assessment
            </button>
            <button className="btn ghost" onClick={() => navigate('/login')}>
              I already have an account
            </button>
          </div>
          <p className="landing-hero-note">
            Takes&nbsp;~&nbsp;3–4&nbsp;minutes&nbsp;·&nbsp;No medical diagnosis&nbsp;·&nbsp;Data stays private
          </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section landing-how">
        <div className="landing-section-inner">
          <h2 className="landing-h2">How it works</h2>
          <div className="landing-steps">
            {[
              {
                n: '01',
                title: 'Answer 20 questions',
                body: 'Each statement is drawn from the PsychemetreAI 20-item classical temperament inventory. There are no right or wrong answers — just respond from instinct.',
              },
              {
                n: '02',
                title: 'AI synthesises your profile',
                body: 'Our live-streaming AI engine reads your pattern of responses, scores four temperament dimensions, and writes a bespoke narrative in real time.',
              },
              {
                n: '03',
                title: 'Receive your personalised report',
                body: 'View trait scores, a reflective narrative, trait-motion insights, and psychoeducational recommendations. Download a PDF to keep.',
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="landing-step">
                <span className="landing-step-num">{n}</span>
                <h3 className="landing-step-title">{title}</h3>
                <p className="landing-step-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Temperaments ── */}
      <section className="landing-section landing-temps">
        <div className="landing-section-inner">
          <h2 className="landing-h2">Four temperament dimensions</h2>
          <p className="landing-section-lead">
            Agent Bleu measures where you fall across four classic psychological dimensions,
            then blends them into one unified picture of you.
          </p>
          <div className="landing-temp-grid">
            {[
              {
                name: 'Sanguine',
                color: '#f59e0b',
                desc: 'Expressive · Optimistic · Social energy',
                detail: 'You light up a room, recharge around people, and bring warmth to every interaction.',
              },
              {
                name: 'Choleric',
                color: '#ef4444',
                desc: 'Driven · Decisive · Goal-oriented',
                detail: 'You set targets fast, move people forward, and thrive when in charge of a mission.',
              },
              {
                name: 'Melancholic',
                color: '#6366f1',
                desc: 'Thoughtful · Precise · Deeply reflective',
                detail: 'You notice details others miss, hold high standards, and think before you act.',
              },
              {
                name: 'Phlegmatic',
                color: '#10b981',
                desc: 'Calm · Steady · Dependable',
                detail: 'You keep your composure when others lose theirs and build lasting trust.',
              },
            ].map(({ name, color, desc, detail }) => (
              <div key={name} className="temp-card" style={{ '--temp-color': color } as React.CSSProperties}>
                <div className="temp-card-bar" />
                <h3 className="temp-card-name">{name}</h3>
                <p className="temp-card-desc">{desc}</p>
                <p className="temp-card-detail">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Consent & Privacy ── */}
      <section className="landing-section landing-privacy" id="privacy">
        <div className="landing-section-inner">
          <div className="privacy-header">
            <span className="privacy-shield" aria-hidden="true">🔒</span>
            <h2 className="landing-h2">Your consent &amp; data privacy</h2>
          </div>
          <p className="landing-section-lead">
            We designed Agent Bleu with privacy at the centre, not as an afterthought.
            Before you start, here is exactly what we collect, how we use it, and
            the rights you hold at all times.
          </p>

          <div className="privacy-grid">
            <div className="privacy-card">
              <span className="privacy-icon" aria-hidden="true">📋</span>
              <h3>What we collect</h3>
              <ul>
                <li>Your email address (account only, never shared)</li>
                <li>Your questionnaire answers during the session</li>
                <li>Aggregated, anonymised score data to improve the model</li>
              </ul>
              <p className="privacy-note">
                We do <strong>not</strong> collect names, phone numbers,
                location data, or any government-issued identifiers.
              </p>
            </div>

            <div className="privacy-card">
              <span className="privacy-icon" aria-hidden="true">🎯</span>
              <h3>How we use it</h3>
              <ul>
                <li>Generate your personalised assessment report</li>
                <li>Store your report so you can retrieve it later</li>
                <li>Improve AI accuracy through anonymised, aggregated analysis</li>
              </ul>
              <p className="privacy-note">
                Your data is <strong>never</strong> sold, traded, or used
                for advertising purposes.
              </p>
            </div>

            <div className="privacy-card">
              <span className="privacy-icon" aria-hidden="true">🛡️</span>
              <h3>How we protect it</h3>
              <ul>
                <li>All data transmitted over TLS 1.3 encrypted connections</li>
                <li>Passwords hashed with bcrypt — never stored in plain text</li>
                <li>Assessment answers stored with row-level access controls</li>
                <li>Third-party sub-processors bound by GDPR-compliant DPAs</li>
              </ul>
            </div>
          </div>

          <div className="privacy-disclaimer">
            <h3>⚕️ Non-diagnostic notice</h3>
            <p>
              Agent Bleu is a <strong>psychoeducational tool</strong>, not a medical or psychiatric
              instrument. Assessment results are descriptive and exploratory in nature.
              They do not constitute a clinical diagnosis, psychological evaluation, or
              medical advice. If you have concerns about your mental health, please consult
              a qualified mental-health professional.
            </p>
          </div>

          <div className="privacy-consent-box">
            <p>
              By creating an account and completing an assessment you confirm that you
              have read and understood this notice and that you give your free, informed
              consent to the processing of your responses as described above.
              You may withdraw consent at any time by deleting your account.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-section landing-final-cta">
        <div className="landing-section-inner landing-cta-center">
          <h2 className="landing-h2">Ready to meet yourself?</h2>
          <p className="landing-section-lead">
            It takes about 3–4 minutes. Your results are private, yours to keep, and
            always available to delete.
          </p>
          <button className="btn landing-cta-primary" onClick={() => navigate('/register')}>
            Begin your assessment — it's free
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <img src={logo} alt="Agent Bleu" className="landing-footer-logo" />
        <p className="landing-footer-copy">
          © {new Date().getFullYear()} Agent Bleu · Powered by Dacom Technology ·{' '}
          <a href="#privacy">Privacy notice</a>
        </p>
      </footer>
    </div>
  );
}
