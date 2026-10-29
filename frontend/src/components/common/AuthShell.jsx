import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function AuthShell({ title, prompt, linkText, linkTo, children }) {
  return (
    <div className="auth-page">
      <div className="auth-frame">
        <aside className="auth-art" aria-label="CyberKavach AI security platform">
          <div className="auth-brand">
            <span className="auth-brand-mark"><Shield size={20} strokeWidth={1.8} /></span>
            <span>CyberKavach <strong>AI</strong></span>
          </div>

          <div className="auth-landscape" aria-hidden="true">
            <span className="auth-dune auth-dune-far" />
            <span className="auth-dune auth-dune-mid" />
            <span className="auth-dune auth-dune-near" />
          </div>

          <div className="auth-art-copy">
            <span className="auth-eyebrow">CYBER DEFENSE, MADE HUMAN</span>
            <h2>Stay ahead of<br />what comes next.</h2>
            <p>Clear intelligence. Confident decisions.<br />A safer digital world starts here.</p>
            <div className="auth-slide-indicators" aria-hidden="true">
              <span />
              <span />
              <span className="is-active" />
            </div>
          </div>
        </aside>

        <main className="auth-panel">
          <div className="auth-form-wrap">
            <header className="auth-heading">
              <h1>{title}</h1>
              <p>{prompt} <Link to={linkTo}>{linkText}</Link></p>
            </header>
            <div className="auth-content">{children}</div>
            <p className="auth-footnote">
              <Shield size={13} aria-hidden="true" />
              Protected access for your security operations
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
