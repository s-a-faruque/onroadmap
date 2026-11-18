import { FormEvent, useEffect, useState } from 'react';
import { LogIn, LogOut, Mail, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthControlsProps {
  variant: 'landing' | 'planner';
}

type AuthMethod = 'password' | 'magic-link';

export function AuthControls({ variant }: AuthControlsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  function openDialog() {
    setErrorMessage('');
    setStatusMessage('');
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage('Supabase sign-in is not configured.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      if (authMethod === 'magic-link') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setStatusMessage('Check your email for a sign-in link.');
      } else if (isCreatingAccount) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          setIsOpen(false);
        } else {
          setStatusMessage('Check your email to confirm your account.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setIsOpen(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete sign-in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setIsOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const triggerClassName = variant === 'planner'
    ? 'planner-nav-action auth-trigger'
    : 'auth-trigger inline-flex items-center gap-2 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50';

  return (
    <>
      <button type="button" className={triggerClassName} onClick={openDialog}>
        {user ? 'Account' : 'Sign in'}
        {variant === 'landing' && <LogIn className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="auth-overlay" role="presentation" onClick={() => setIsOpen(false)}>
          <section
            className="auth-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="auth-dialog-header">
              <div>
                <p className="auth-dialog-kicker">Your account</p>
                <h2 id="auth-dialog-title">{user ? 'Account' : 'Sign in'}</h2>
              </div>
              <button type="button" className="auth-close" onClick={() => setIsOpen(false)} aria-label="Close sign-in dialog">
                <X size={20} />
              </button>
            </header>

            {user ? (
              <div className="auth-account">
                <p>Signed in as <strong>{user.email}</strong></p>
                <p className="auth-note">Your roadmaps remain stored in this browser.</p>
                <button type="button" className="auth-submit" onClick={signOut} disabled={isSubmitting}>
                  <LogOut size={17} />
                  {isSubmitting ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ) : supabase ? (
              <>
                <div className="auth-methods" aria-label="Sign-in method">
                  <button
                    type="button"
                    className={authMethod === 'password' ? 'active' : ''}
                    onClick={() => { setAuthMethod('password'); setErrorMessage(''); setStatusMessage(''); }}
                  >
                    Email &amp; password
                  </button>
                  <button
                    type="button"
                    className={authMethod === 'magic-link' ? 'active' : ''}
                    onClick={() => { setAuthMethod('magic-link'); setIsCreatingAccount(false); setErrorMessage(''); setStatusMessage(''); }}
                  >
                    Email link
                  </button>
                </div>
                <form className="auth-form" onSubmit={handleSubmit}>
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>
                  {authMethod === 'password' && (
                    <label>
                      <span>Password</span>
                      <input
                        type="password"
                        autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </label>
                  )}
                  {errorMessage && <p className="auth-message auth-error" role="alert">{errorMessage}</p>}
                  {statusMessage && <p className="auth-message auth-status" role="status">{statusMessage}</p>}
                  <button type="submit" className="auth-submit" disabled={isSubmitting}>
                    {authMethod === 'magic-link' ? <Mail size={17} /> : <LogIn size={17} />}
                    {isSubmitting
                      ? 'Please wait…'
                      : authMethod === 'magic-link'
                        ? 'Email me a sign-in link'
                        : isCreatingAccount
                          ? 'Create account'
                          : 'Sign in'}
                  </button>
                </form>
                {authMethod === 'password' && (
                  <button
                    type="button"
                    className="auth-mode-toggle"
                    onClick={() => { setIsCreatingAccount((current) => !current); setErrorMessage(''); setStatusMessage(''); }}
                  >
                    {isCreatingAccount ? 'Already have an account? Sign in' : 'New here? Create an account'}
                  </button>
                )}
                <p className="auth-note">Signing in does not upload or sync your roadmaps.</p>
              </>
            ) : (
              <p className="auth-setup-message">
                Supabase sign-in is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to your environment to enable it.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
