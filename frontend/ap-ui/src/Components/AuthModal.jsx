import { useState } from 'react';
import { useAuth } from '../Store/AuthContext';
import classes from './AuthModal.module.css';

export default function AuthModal({ isOpen, onClose }) {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const action = mode === 'login' ? signIn : signUp;
    const { error: authError } = await action(email, password);

    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === 'signup') {
      setSuccess('Account created. Check your email to confirm, then sign in.');
      setMode('login');
      setPassword('');
      return;
    }

    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={classes.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className={classes.modal}>
        <button className={classes.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2 id="auth-modal-title" className={classes.title}>
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className={classes.subtitle}>
          {mode === 'login'
            ? 'Sign in to save your session history and progress.'
            : 'Sign up to keep track of your learning sessions.'}
        </p>

        {!isConfigured && (
          <div className={classes.notice}>
            Supabase is not configured yet. Add your project keys to <code>.env</code> to enable sign in.
          </div>
        )}

        <form onSubmit={handleSubmit} className={classes.form}>
          <div className={classes.field}>
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={classes.field}>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className={classes.error}>{error}</div>}
          {success && <div className={classes.success}>{success}</div>}

          <button type="submit" className={classes.submitBtn} disabled={submitting || !isConfigured}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className={classes.toggle}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button
            type="button"
            className={classes.toggleBtn}
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
              setSuccess('');
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
