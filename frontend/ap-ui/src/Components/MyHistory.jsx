import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Store/AuthContext';
import { supabase } from '../lib/supabaseClient';
import classes from './MyHistory.module.css';

const DISABILITY_NAMES = {
  '1': 'Dyslexia',
  '2': 'Dysgraphia',
  '3': 'Dyscalculia',
  '4': 'ADHD',
  '5': 'APD',
  '6': 'NVLD',
  '7': 'LPD',
};

export default function MyHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    async function fetchSessions() {
      const { data, error: fetchError } = await supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setSessions(data || []);
      }
      setLoading(false);
    }

    fetchSessions();
  }, [user]);

  if (!user) {
    return (
      <div className={classes.container}>
        <div className={classes.emptyState}>
          <h2>My History</h2>
          <p>Sign in to view your saved session history and track your progress over time.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={classes.container}>
        <div className={classes.loading}>Loading your sessions...</div>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <h1>My History</h1>
        <p>Your saved learning sessions across all disability simulations.</p>
      </div>

      {error && <div className={classes.error}>{error}</div>}

      {sessions.length === 0 ? (
        <div className={classes.emptyState}>
          <p>No saved sessions yet. Complete a simulation while signed in to see your history here.</p>
          <button className={classes.ctaBtn} onClick={() => navigate('/')}>
            Start a Session
          </button>
        </div>
      ) : (
        <div className={classes.sessionList}>
          {sessions.map((session) => (
            <div key={session.id} className={classes.sessionCard}>
              <div className={classes.sessionMeta}>
                <span className={classes.disabilityBadge}>
                  {DISABILITY_NAMES[session.disability_id] || session.disability_id || 'General'}
                </span>
                <span className={classes.date}>
                  {new Date(session.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {session.problem && (
                <p className={classes.problemText}>{session.problem}</p>
              )}
              {session.approach && (
                <p className={classes.detailText}>
                  <strong>Approach:</strong> {session.approach}
                </p>
              )}
              {session.answer && (
                <p className={classes.detailText}>
                  <strong>Answer:</strong> {session.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
