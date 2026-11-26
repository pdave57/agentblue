import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listUserFeedback,
  getFeedbackSummary,
  deleteUserFeedback,
  type FeedbackItemResponse,
  type FeedbackSummaryResponse,
} from '../api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export const ADMIN_EMAIL = 'pdave57@gmail.com';

type RatingFilter = 'all' | 'high' | 'mid' | 'low';

const ASPECT_LABELS: Record<string, string> = {
  assessment_flow: 'Interactive Assessment Flow',
  reflective_insights: 'Reflective Narrative & Insights',
  emotional_checkin: 'Emotional Check-in',
  ui_design: 'Visual Design & Clarity',
  privacy_controls: 'Privacy & Safeguards',
  other: 'Other',
};

function getRatingTone(rating: number): 'high' | 'mid' | 'low' {
  if (rating >= 8) return 'high';
  if (rating >= 5) return 'mid';
  return 'low';
}

export default function AdminDashboard() {
  const { user, authenticated, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin =
    authenticated && user?.email?.trim().toLowerCase() === ADMIN_EMAIL;

  const [summary, setSummary] = useState<FeedbackSummaryResponse | null>(null);
  const [reviews, setReviews] = useState<FeedbackItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (filter: RatingFilter) => {
    setLoading(true);
    setError(null);

    const ratingParams: { min_rating?: number; max_rating?: number } =
      filter === 'high'
        ? { min_rating: 8, max_rating: 10 }
        : filter === 'mid'
        ? { min_rating: 5, max_rating: 7 }
        : filter === 'low'
        ? { min_rating: 1, max_rating: 4 }
        : {};

    try {
      const [sumRes, listRes] = await Promise.all([
        getFeedbackSummary(),
        listUserFeedback({ limit: 200, offset: 0, ...ratingParams }),
      ]);
      setSummary(sumRes);
      setReviews(Array.isArray(listRes) ? listRes : []);
    } catch (err: any) {
      setError(
        err?.detail ||
          err?.message ||
          'Failed to load reviews. Please ensure you are signed in as admin.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (user && user.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
      navigate('/', { replace: true });
      return;
    }
    if (isAdmin) {
      fetchDashboardData(ratingFilter);
    }
  }, [authenticated, isAdmin, user, ratingFilter, navigate, fetchDashboardData]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteUserFeedback(id);
      setConfirmDeleteId(null);
      await fetchDashboardData(ratingFilter);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Could not delete review.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredReviews = q
    ? reviews.filter((r) => {
        const comment = (r.improvement_comment || '').toLowerCase();
        const aspect = (ASPECT_LABELS[r.most_valuable_aspect] || r.most_valuable_aspect).toLowerCase();
        const sid = (r.session_id || '').toLowerCase();
        const uid = (r.user_id || '').toLowerCase();
        return (
          comment.includes(q) ||
          aspect.includes(q) ||
          sid.includes(q) ||
          uid.includes(q)
        );
      })
    : reviews;

  const maxAspectCount = summary
    ? Math.max(1, ...Object.values(summary.aspect_breakdown || {}))
    : 1;

  const maxRatingCount = summary
    ? Math.max(1, ...Object.values(summary.rating_distribution || {}))
    : 1;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-page">
      {/* Top Bar */}
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand">
            <img
              src={logo}
              alt="Agent Bleu"
              className="admin-logo"
              onClick={() => navigate('/landing')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/landing');
                }
              }}
              title="Go to Landing Page"
            />
            <div className="admin-brand-meta">
              <span className="admin-badge">Admin Dashboard</span>
              <span className="admin-email">{user?.email}</span>
            </div>
          </div>

          <div className="admin-nav-actions">
            <button
              type="button"
              className="btn ghost admin-nav-btn"
              onClick={() => navigate('/')}
            >
              Assessment App
            </button>
            <button
              type="button"
              className="btn ghost admin-nav-btn"
              onClick={() => fetchDashboardData(ratingFilter)}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              className="btn ghost admin-nav-btn"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-hero-head">
          <h1>User Reviews &amp; Experience Analytics</h1>
          <p>
            Review all submitted 5-question user feedback, ratings, and open-ended suggestions.
          </p>
        </div>

        {error && (
          <div className="err" role="alert" style={{ marginBottom: '1.5rem' }}>
            <span>{error}</span>
            <button type="button" className="btn ghost" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <section className="admin-kpi-grid" aria-label="Summary metrics">
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Total Reviews</span>
            <span className="admin-kpi-value">{summary?.total_responses ?? '—'}</span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Avg Experience</span>
            <span className="admin-kpi-value">
              {summary?.average_experience_rating != null
                ? `${summary.average_experience_rating.toFixed(1)} / 10`
                : '—'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Avg Ease of Use</span>
            <span className="admin-kpi-value">
              {summary?.average_ease_of_use != null
                ? `${summary.average_ease_of_use.toFixed(1)} / 5`
                : '—'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Avg Insightfulness</span>
            <span className="admin-kpi-value">
              {summary?.average_insightfulness != null
                ? `${summary.average_insightfulness.toFixed(1)} / 5`
                : '—'}
            </span>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Would Recommend</span>
            <span className="admin-kpi-value">
              {summary?.recommendation_rate_pct != null
                ? `${Math.round(summary.recommendation_rate_pct)}%`
                : '—'}
            </span>
          </div>
        </section>

        {/* Breakdowns */}
        {summary && summary.total_responses > 0 && (
          <section className="admin-charts-grid" aria-label="Breakdowns">
            <div className="admin-panel">
              <h2>Rating Distribution (1–10)</h2>
              <div className="admin-bars">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
                  const count = summary.rating_distribution?.[String(score)] ?? 0;
                  const pct = Math.round((count / maxRatingCount) * 100);
                  return (
                    <div key={score} className="admin-bar-row">
                      <span className="admin-bar-key">{score}/10</span>
                      <div className="admin-bar-track">
                        <div className="admin-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="admin-bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-panel">
              <h2>Most Valuable Aspects</h2>
              <div className="admin-bars">
                {Object.entries(summary.aspect_breakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([aspect, count]) => {
                    const pct = Math.round((count / maxAspectCount) * 100);
                    return (
                      <div key={aspect} className="admin-bar-row admin-bar-row-wide">
                        <span className="admin-bar-key">
                          {ASPECT_LABELS[aspect] || aspect.replace(/_/g, ' ')}
                        </span>
                        <div className="admin-bar-track">
                          <div className="admin-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="admin-bar-count">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* Filter & Search Toolbar */}
        <section className="admin-toolbar" aria-label="Filter reviews">
          <div className="admin-filter-pills">
            {(
              [
                { id: 'all', label: 'All Ratings' },
                { id: 'high', label: 'High (8–10)' },
                { id: 'mid', label: 'Moderate (5–7)' },
                { id: 'low', label: 'Low (1–4)' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                className={`checkin-pill ${ratingFilter === f.id ? 'active' : ''}`}
                onClick={() => setRatingFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            className="admin-search-input"
            placeholder="Search comments, aspects, or session ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search reviews"
          />
        </section>

        {/* Reviews List */}
        <section className="admin-reviews-section" aria-label="All user reviews">
          <div className="admin-reviews-head">
            <h2>All Reviews ({filteredReviews.length})</h2>
          </div>

          {loading ? (
            <div className="admin-empty">Loading reviews…</div>
          ) : filteredReviews.length === 0 ? (
            <div className="admin-empty">
              No reviews match the current filter.
            </div>
          ) : (
            <div className="admin-reviews-list">
              {filteredReviews.map((review) => {
                const tone = getRatingTone(review.experience_rating);
                const aspectLabel =
                  ASPECT_LABELS[review.most_valuable_aspect] ||
                  review.most_valuable_aspect.replace(/_/g, ' ');

                return (
                  <article key={review.id} className="admin-review-card">
                    <div className="admin-review-top">
                      <div className="admin-review-scores">
                        <span className={`admin-score-pill ${tone}`}>
                          Experience: {review.experience_rating}/10
                        </span>
                        <span className="admin-sub-pill">
                          Ease: {review.ease_of_use}/5
                        </span>
                        <span className="admin-sub-pill">
                          Insight: {review.insightfulness}/5
                        </span>
                        <span className="admin-aspect-pill">{aspectLabel}</span>
                        <span
                          className={`admin-rec-pill ${
                            review.would_recommend ? 'yes' : 'no'
                          }`}
                        >
                          {review.would_recommend ? '👍 Recommends' : '👎 Not yet'}
                        </span>
                      </div>

                      <span className="admin-review-date">
                        {new Date(review.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="admin-review-body">
                      {review.improvement_comment ? (
                        <p className="admin-review-comment">
                          “{review.improvement_comment}”
                        </p>
                      ) : (
                        <p className="admin-review-nocomment">
                          No written comment provided.
                        </p>
                      )}
                    </div>

                    <div className="admin-review-foot">
                      <div className="admin-review-ids">
                        {review.session_id && <span>Session: {review.session_id}</span>}
                        {review.user_id && <span>User: {review.user_id}</span>}
                      </div>

                      <div className="admin-review-actions">
                        {confirmDeleteId === review.id ? (
                          <>
                            <span className="admin-confirm-text">Delete review?</span>
                            <button
                              type="button"
                              className="admin-btn-danger"
                              disabled={deletingId === review.id}
                              onClick={() => handleDelete(review.id)}
                            >
                              {deletingId === review.id ? 'Deleting…' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              className="admin-btn-cancel"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="feedback-delete-btn"
                            onClick={() => setConfirmDeleteId(review.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
