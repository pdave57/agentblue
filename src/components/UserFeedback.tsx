import { useEffect, useState } from 'react';
import {
  getFeedbackQuestions,
  submitUserFeedback,
  listUserFeedback,
  getFeedbackSummary,
  deleteUserFeedback,
  type FeedbackQuestionsResponse,
  type FeedbackSubmitResponse,
  type FeedbackItemResponse,
  type FeedbackSummaryResponse,
  type ValuableAspect,
} from '../api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SURVEY: FeedbackQuestionsResponse = {
  title: 'Share Your Experience',
  description:
    'A quick 5-question check-in (takes under 30 seconds) to help us improve Agent Bleu.',
  questions: [
    {
      id: 'experience_rating',
      order: 1,
      prompt: 'Overall, how would you rate your experience with Agent Bleu?',
      kind: 'scale_1_10',
      required: true,
      min_value: 1,
      max_value: 10,
      min_label: 'Needs major work',
      max_label: 'Exceptional',
      options: null,
    },
    {
      id: 'ease_of_use',
      order: 2,
      prompt: 'How clear and effortless was the assessment flow?',
      kind: 'scale_1_5',
      required: true,
      min_value: 1,
      max_value: 5,
      min_label: 'Confusing',
      max_label: 'Effortless',
      options: null,
    },
    {
      id: 'insightfulness',
      order: 3,
      prompt: 'How accurate and insightful did your results and reflections feel?',
      kind: 'scale_1_5',
      required: true,
      min_value: 1,
      max_value: 5,
      min_label: 'Not relevant',
      max_label: 'Deeply insightful',
      options: null,
    },
    {
      id: 'most_valuable_aspect',
      order: 4,
      prompt: 'Which part of the experience stood out most, and would you recommend us?',
      kind: 'choice_and_recommend',
      required: true,
      min_value: null,
      max_value: null,
      min_label: null,
      max_label: null,
      options: [
        { value: 'assessment_flow', label: 'Interactive Assessment Flow' },
        { value: 'reflective_insights', label: 'Reflective Narrative & Insights' },
        { value: 'emotional_checkin', label: 'Emotional Check-in' },
        { value: 'ui_design', label: 'Visual Design & Clarity' },
        { value: 'privacy_controls', label: 'Privacy & Safeguards' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'improvement_comment',
      order: 5,
      prompt: 'What is one thing we could improve or add to make your experience better?',
      kind: 'text',
      required: false,
      min_value: null,
      max_value: null,
      min_label: null,
      max_label: null,
      options: null,
    },
  ],
};

interface UserFeedbackProps {
  sessionId?: string | null;
}

const REVIEWER_EMAIL = 'pdave57@gmail.com';

export default function UserFeedback({ sessionId }: UserFeedbackProps) {
  const { user } = useAuth();
  const isReviewer = user?.email?.toLowerCase() === REVIEWER_EMAIL;

  const [survey, setSurvey] = useState<FeedbackQuestionsResponse>(DEFAULT_SURVEY);
  const [experienceRating, setExperienceRating] = useState<number | null>(null);
  const [easeOfUse, setEaseOfUse] = useState<number | null>(null);
  const [insightfulness, setInsightfulness] = useState<number | null>(null);
  const [mostValuableAspect, setMostValuableAspect] = useState<ValuableAspect | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [improvementComment, setImprovementComment] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<FeedbackSubmitResponse | null>(null);

  // Reviewer dashboard state (visible only to pdave57@gmail.com)
  const [showReviewer, setShowReviewer] = useState(false);
  const [loadingReviewer, setLoadingReviewer] = useState(false);
  const [summary, setSummary] = useState<FeedbackSummaryResponse | null>(null);
  const [items, setItems] = useState<FeedbackItemResponse[]>([]);
  const [reviewerError, setReviewerError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFeedbackQuestions()
      .then((res) => {
        if (active && res && Array.isArray(res.questions) && res.questions.length > 0) {
          setSurvey(res);
        }
      })
      .catch(() => {
        // Keep DEFAULT_SURVEY fallback silently
      });
    return () => {
      active = false;
    };
  }, []);

  const loadReviewerData = async () => {
    setLoadingReviewer(true);
    setReviewerError(null);
    try {
      const [sumRes, listRes] = await Promise.all([
        getFeedbackSummary(),
        listUserFeedback({ limit: 50, offset: 0 }),
      ]);
      setSummary(sumRes);
      setItems(Array.isArray(listRes) ? listRes : []);
    } catch (err: any) {
      setReviewerError(err?.detail || err?.message || 'Unable to load feedback summary.');
    } finally {
      setLoadingReviewer(false);
    }
  };

  const handleToggleReviewer = () => {
    const next = !showReviewer;
    setShowReviewer(next);
    if (next && !summary) {
      loadReviewerData();
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      await deleteUserFeedback(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      loadReviewerData();
    } catch (err: any) {
      setReviewerError(err?.detail || err?.message || 'Failed to delete feedback entry.');
    }
  };

  const canSubmit =
    experienceRating !== null &&
    easeOfUse !== null &&
    insightfulness !== null &&
    mostValuableAspect !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await submitUserFeedback({
        session_id: sessionId ?? undefined,
        experience_rating: experienceRating,
        ease_of_use: easeOfUse,
        insightfulness: insightfulness,
        most_valuable_aspect: mostValuableAspect,
        would_recommend: wouldRecommend,
        improvement_comment: improvementComment.trim() ? improvementComment.trim() : null,
      });
      setSubmitted(res);
      if (isReviewer && showReviewer) {
        loadReviewerData();
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Could not submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const orderedQuestions = [...survey.questions].sort((a, b) => a.order - b.order);

  return (
    <section className="feedback-card" aria-label="User Feedback Survey">
      <div className="feedback-header">
        <div>
          <span className="feedback-badge">5-Question Survey</span>
          <h3 className="feedback-title">{survey.title}</h3>
          <p className="feedback-desc">{survey.description}</p>
        </div>
        {isReviewer && (
          <button
            type="button"
            className="btn ghost feedback-reviewer-toggle"
            onClick={handleToggleReviewer}
          >
            {showReviewer ? 'Hide Metrics' : 'Reviewer Metrics'}
          </button>
        )}
      </div>

      {isReviewer && showReviewer && (
        <div className="feedback-reviewer-panel">
          <div className="feedback-reviewer-top">
            <h4>Feedback Analytics</h4>
            <button
              type="button"
              className="btn ghost rec-btn"
              onClick={loadReviewerData}
              disabled={loadingReviewer}
            >
              {loadingReviewer ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {reviewerError && (
            <div className="err" role="alert">
              {reviewerError}
            </div>
          )}
          {summary && (
            <div className="feedback-metrics-grid">
              <div className="feedback-metric-box">
                <span className="feedback-metric-val">{summary.total_responses}</span>
                <span className="feedback-metric-lbl">Responses</span>
              </div>
              <div className="feedback-metric-box">
                <span className="feedback-metric-val">
                  {summary.average_experience_rating != null
                    ? `${summary.average_experience_rating.toFixed(1)}/10`
                    : '—'}
                </span>
                <span className="feedback-metric-lbl">Avg Experience</span>
              </div>
              <div className="feedback-metric-box">
                <span className="feedback-metric-val">
                  {summary.average_ease_of_use != null
                    ? `${summary.average_ease_of_use.toFixed(1)}/5`
                    : '—'}
                </span>
                <span className="feedback-metric-lbl">Avg Ease</span>
              </div>
              <div className="feedback-metric-box">
                <span className="feedback-metric-val">
                  {summary.average_insightfulness != null
                    ? `${summary.average_insightfulness.toFixed(1)}/5`
                    : '—'}
                </span>
                <span className="feedback-metric-lbl">Avg Insight</span>
              </div>
              <div className="feedback-metric-box">
                <span className="feedback-metric-val">
                  {summary.recommendation_rate_pct != null
                    ? `${Math.round(summary.recommendation_rate_pct)}%`
                    : '—'}
                </span>
                <span className="feedback-metric-lbl">Recommend</span>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="feedback-items-list">
              {items.map((item) => (
                <div key={item.id} className="feedback-item-row">
                  <div className="feedback-item-meta">
                    <strong>{item.experience_rating}/10</strong>
                    <span>Ease {item.ease_of_use}/5</span>
                    <span>Insight {item.insightfulness}/5</span>
                    <span>{item.most_valuable_aspect.replace(/_/g, ' ')}</span>
                    <span>{item.would_recommend ? '👍 Recommends' : '👎 No rec'}</span>
                  </div>
                  {item.improvement_comment && (
                    <p className="feedback-item-comment">“{item.improvement_comment}”</p>
                  )}
                  <div className="feedback-item-foot">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <button
                      type="button"
                      className="feedback-delete-btn"
                      onClick={() => handleDeleteFeedback(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {submitted ? (
        <div className="feedback-success" role="status">
          <div className="feedback-success-icon">✓</div>
          <div>
            <h4>{submitted.message || 'Thank you for your feedback!'}</h4>
            <p>
              Recorded your {submitted.experience_rating}/10 experience rating. Your input directly
              helps refine Agent Bleu.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="feedback-form">
          {error && (
            <div className="err" role="alert">
              {error}
              <button type="button" className="btn ghost" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          {orderedQuestions.map((q) => {
            if (q.kind === 'scale_1_10') {
              const min = q.min_value ?? 1;
              const max = q.max_value ?? 10;
              const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
              return (
                <div key={q.id} className="feedback-q">
                  <label className="feedback-q-label">
                    <span>
                      {q.order}. {q.prompt}
                    </span>
                    {q.required && <span className="feedback-req">*</span>}
                  </label>
                  <div className="feedback-scale-10" role="radiogroup" aria-label={q.prompt}>
                    {nums.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`feedback-num-btn ${experienceRating === n ? 'active' : ''}`}
                        onClick={() => setExperienceRating(n)}
                        aria-pressed={experienceRating === n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {(q.min_label || q.max_label) && (
                    <div className="feedback-scale-labels">
                      <span>{q.min_label}</span>
                      <span>{q.max_label}</span>
                    </div>
                  )}
                </div>
              );
            }

            if (q.kind === 'scale_1_5') {
              const min = q.min_value ?? 1;
              const max = q.max_value ?? 5;
              const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
              const val = q.id === 'ease_of_use' ? easeOfUse : insightfulness;
              const setter = q.id === 'ease_of_use' ? setEaseOfUse : setInsightfulness;

              return (
                <div key={q.id} className="feedback-q">
                  <label className="feedback-q-label">
                    <span>
                      {q.order}. {q.prompt}
                    </span>
                    {q.required && <span className="feedback-req">*</span>}
                  </label>
                  <div className="feedback-scale-5" role="radiogroup" aria-label={q.prompt}>
                    {nums.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`feedback-num-btn ${val === n ? 'active' : ''}`}
                        onClick={() => setter(n)}
                        aria-pressed={val === n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {(q.min_label || q.max_label) && (
                    <div className="feedback-scale-labels">
                      <span>{q.min_label}</span>
                      <span>{q.max_label}</span>
                    </div>
                  )}
                </div>
              );
            }

            if (q.kind === 'choice_and_recommend') {
              return (
                <div key={q.id} className="feedback-q">
                  <label className="feedback-q-label">
                    <span>
                      {q.order}. {q.prompt}
                    </span>
                    {q.required && <span className="feedback-req">*</span>}
                  </label>
                  <div className="feedback-aspect-grid">
                    {(q.options ?? []).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`feedback-aspect-btn ${
                          mostValuableAspect === opt.value ? 'active' : ''
                        }`}
                        onClick={() => setMostValuableAspect(opt.value as ValuableAspect)}
                        aria-pressed={mostValuableAspect === opt.value}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="feedback-recommend-row">
                    <span>Would you recommend Agent Bleu to others?</span>
                    <div className="feedback-recommend-btns">
                      <button
                        type="button"
                        className={`checkin-pill ${wouldRecommend ? 'active' : ''}`}
                        onClick={() => setWouldRecommend(true)}
                      >
                        Yes, I would
                      </button>
                      <button
                        type="button"
                        className={`checkin-pill ${!wouldRecommend ? 'active' : ''}`}
                        onClick={() => setWouldRecommend(false)}
                      >
                        Not yet
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={q.id} className="feedback-q">
                <label className="feedback-q-label" htmlFor={`feedback-${q.id}`}>
                  <span>
                    {q.order}. {q.prompt}
                  </span>
                  <span className="checkin-optional-tag">Optional</span>
                </label>
                <textarea
                  id={`feedback-${q.id}`}
                  className="feedback-textarea"
                  rows={3}
                  maxLength={2000}
                  value={improvementComment}
                  onChange={(e) => setImprovementComment(e.target.value)}
                  placeholder="Share any suggestion, friction point, or feature you'd like to see…"
                />
              </div>
            );
          })}

          <div className="feedback-actions">
            <button
              type="submit"
              className="btn"
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Feedback'}
            </button>
            {!canSubmit && (
              <span className="feedback-hint">Please complete questions 1–4 to submit.</span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
