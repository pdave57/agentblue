import { useEffect, useRef, useState, useCallback } from 'react';
import logo from './assets/logo.png';
import {
  startAssessment,
  submitAnswer,
  completeAssessment,
  getSessionRecommendations,
  submitRecommendationFeedback,
  streamQuestions,
  streamAssessmentResult,
  fetchAssessmentResult,
  getReportPdf,
  grantConsent,
  type AssessmentStartRequest,
  type RecommendationItem,
  type AssessmentResult,
} from './api';
import { useAuth } from './context/AuthContext';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import ClarificationAgent from './components/ClarificationAgent';
import EmotionCheckIn from './components/EmotionCheckIn';

import './App.css';

type View = 'intro' | 'quiz' | 'result';

interface TemperamentResult {
  dominant: string;
  summary?: string;
  scores?: Record<string, number>;
  narrative?: string;
  motion?: string;
  recommendations?: RecommendationItem[];
  llm_model?: string;
  prompt_version?: string;
}

const LIKERT_WEIGHTS: Record<string, number> = {
  strongly_disagree: 1,
  disagree: 2,
  neutral: 3,
  neither_agree_nor_disagree: 3,
  agree: 4,
  strongly_agree: 5,
};

function normalizeOptions(rawOpts?: any[]): Array<{ id: string; text: string }> {
  if (!Array.isArray(rawOpts) || rawOpts.length === 0) {
    return [
      { id: '1', text: 'Strongly disagree' },
      { id: '2', text: 'Disagree' },
      { id: '3', text: 'Neutral' },
      { id: '4', text: 'Agree' },
      { id: '5', text: 'Strongly agree' },
    ];
  }

  const mapped = rawOpts.map((opt: any, i: number) => {
    let id: string;
    if (opt.value !== undefined && opt.value !== null) {
      id = String(opt.value);
    } else if (opt.code && LIKERT_WEIGHTS[String(opt.code).toLowerCase()]) {
      id = String(LIKERT_WEIGHTS[String(opt.code).toLowerCase()]);
    } else {
      id = String(opt.id ?? (i + 1));
    }
    const text = opt.text ?? opt.label ?? opt.code ?? '';
    return { id, text };
  });

  const allNumeric = mapped.every((o) => !isNaN(Number(o.id)));
  if (allNumeric) {
    mapped.sort((a, b) => Number(a.id) - Number(b.id));
  }
  return mapped;
}

interface QuestionItem {
  id: string;
  code?: string;
  dimension?: string;
  area?: string;
  reverse_coded?: boolean;
  text: string;
  options: Array<{ id: string; text: string }>;
}

function AssessmentApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('intro');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TemperamentResult | null>(null);
  const [loading, setLoading] = useState(false);

  /* Live LLM result synthesis */
  const [streaming, setStreaming] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [motionText, setMotionText] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [agentExternalPrompt, setAgentExternalPrompt] = useState<string | null>(null);
  const [showIntroCheckIn, setShowIntroCheckIn] = useState(false);

  const controllerRef = useRef<ReturnType<typeof streamQuestions> | null>(null);
  const resultStreamRef = useRef<ReturnType<typeof streamAssessmentResult> | null>(null);
  const runIdRef = useRef(0);

  const reset = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    if (resultStreamRef.current) {
      resultStreamRef.current.abort();
      resultStreamRef.current = null;
    }
    setQuestions([]);
    setAnswers({});
    setIndex(0);
    setSessionId(null);
    setError(null);
    setResult(null);
    setStreaming(false);
    setNarrativeText('');
    setMotionText('');
    setRecommendations([]);
    setReportId(null);
    setDownloadingReport(false);
    setAgentExternalPrompt(null);
    setShowIntroCheckIn(false);
    setView('intro');
    setLoading(false);
    runIdRef.current += 1;
  }, []);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      if (resultStreamRef.current) {
        resultStreamRef.current.abort();
      }
    };
  }, []);

  const handleStart = async () => {
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setError(null);
    setLoading(true);

    try {
      // Ensure user_id is never a raw JWT string starting with 'eyJ'
      const resolvedUserId = (user?.user_id && !user.user_id.startsWith('eyJ'))
        ? user.user_id
        : (typeof window !== 'undefined' && localStorage.getItem('agentbleu_user_id') && !localStorage.getItem('agentbleu_user_id')!.startsWith('eyJ'))
        ? localStorage.getItem('agentbleu_user_id')!
        : `user_${Date.now()}`;

      const body: AssessmentStartRequest = {
        user_id: resolvedUserId,
        instrument_code: 'psychemetre_temperament_20',
        instrument_version: '1.0.0',
        resume_if_active: true,
      };

      let data: any;
      try {
        data = await startAssessment(body);
      } catch (startErr: any) {
        // If 403 Forbidden, handle consent or instrument fallback
        if (startErr?.status === 403 || String(startErr?.message).includes('403')) {
          try {
            // Attempt to ensure consent is granted
            await grantConsent({
              type: 'assessment_processing',
              version: '1.0.0',
              granted: true,
            });
            await grantConsent({
              type: 'terms_privacy',
              version: '1.0.0',
              granted: true,
            });
            data = await startAssessment(body);
          } catch {
            // Secondary fallback: test starting with temperament_40
            try {
              data = await startAssessment({
                ...body,
                instrument_code: 'psychemetre_temperament_40',
                resume_if_active: false,
              });
            } catch {
              throw startErr;
            }
          }
        } else {
          throw startErr;
        }
      }

      const sid = ((data as any).session_id || (data as any).id) as string;
      if (!sid) throw new Error('No session id returned from server');

      setSessionId(sid);
      setAnswers({});
      setIndex(0);
      setView('quiz');
      setLoading(false);

      // Pre-populate questions if returned immediately in the start response
      const rawQs = (data as any).questions;
      if (Array.isArray(rawQs) && rawQs.length > 0) {
        setQuestions(
          rawQs.map((q: any) => ({
            id: String(q.id),
            code: q.code,
            dimension: q.dimension,
            area: q.area,
            reverse_coded: q.reverse_coded,
            text: q.text ?? '',
            options: normalizeOptions(q.options),
          }))
        );
      } else {
        setQuestions([]);
      }

      // Check if resuming existing answers
      if (Array.isArray((data as any).answers) && (data as any).answers.length > 0) {
        const restored: Record<string, string> = {};
        for (const a of (data as any).answers) {
          if (a.question_id) {
            restored[String(a.question_id)] = String(a.likert_value);
          }
        }
        setAnswers(restored);
        if (Array.isArray(rawQs) && rawQs.length > 0) {
          const nextIdx = rawQs.findIndex((q: any) => !restored[String(q.id)]);
          if (nextIdx >= 0) {
            setIndex(nextIdx);
          }
        }
      }

      openStream(sid, runId);
    } catch (err: any) {
      setLoading(false);
      const detail = err?.rawDetail || err?.detail || err?.body?.detail || err?.message || 'Failed to start assessment';
      const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);

      // Check if 403/401 is due to session or token expiration
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        detailStr.includes('403') ||
        detailStr.includes('401')
      ) {
        if (
          detailStr.toLowerCase().includes('token') ||
          detailStr.toLowerCase().includes('credential') ||
          detailStr.toLowerCase().includes('expired') ||
          detailStr.toLowerCase().includes('unauthorized') ||
          detailStr.toLowerCase().includes('not authenticated')
        ) {
          setError('Your session has expired. Please sign in again.');
          logout();
          navigate('/login');
          return;
        }
      }

      setError(detailStr);
    }
  };

  const openStream = (sid: string, runId: number) => {
    setError(null);
    const qtextEl = document.getElementById('qtext');
    if (qtextEl) {
      qtextEl.textContent = 'Connecting to Agent Bleu…';
      qtextEl.classList.add('streaming');
    }

    controllerRef.current = streamQuestions(
      sid,
      (event) => {
        if (runId !== runIdRef.current) return;

        if (event.type === 'question') {
          const opts = normalizeOptions(event.options as any[]);

          setQuestions((prev) => {
            const existing = prev.find((q) => q.id === String(event.id));
            if (existing) {
              return prev.map((q) =>
                q.id === String(event.id)
                  ? {
                      ...q,
                      code: (event as any).code ?? q.code,
                      dimension: (event as any).dimension ?? q.dimension,
                      area: (event as any).area ?? q.area,
                      reverse_coded: (event as any).reverse_coded ?? q.reverse_coded,
                      text: event.text || q.text,
                      options: q.options.length > 0 ? q.options : opts,
                    }
                  : q,
              );
            }
            return [
              ...prev,
              {
                id: String(event.id),
                code: (event as any).code,
                dimension: (event as any).dimension,
                area: (event as any).area,
                reverse_coded: (event as any).reverse_coded,
                text: event.text ?? '',
                options: opts,
              },
            ];
          });
        } else if (event.type === 'option') {
          setQuestions((prev) =>
            prev.map((q) => {
              if (q.id !== String(event.question_id)) return q;
              const existingOpt = q.options.find((o) => o.id === String(event.id));
              if (existingOpt) return q;
              return {
                ...q,
                options: [...q.options, { id: String(event.id), text: event.text ?? '' }],
              };
            }),
          );
        } else if (event.type === 'done' || event.type === 'complete') {
          const qtextEl = document.getElementById('qtext');
          if (qtextEl) {
            qtextEl.classList.remove('streaming');
          }
        }
      },
      () => {
        if (runId !== runIdRef.current) return;
        const qtextEl = document.getElementById('qtext');
        if (qtextEl) {
          qtextEl.classList.remove('streaming');
        }
      },
    );
  };

  const currentQuestion = questions[index];

  const handleChoose = (optId: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optId }));
  };

  const analyseLocally = () => {
    const totals: Record<string, number> = { Sanguine: 0, Choleric: 0, Melancholic: 0, Phlegmatic: 0 };
    const counts: Record<string, number> = { Sanguine: 0, Choleric: 0, Melancholic: 0, Phlegmatic: 0 };
    const itemsPerDim = Math.max(1, Math.floor(questions.length / 4));

    questions.forEach((q, i) => {
      const val = parseInt(answers[q.id] || '3', 10);
      let dim = 'Sanguine';
      const code = (q.code || '').toUpperCase();
      const rawDim = (q.dimension || '').toLowerCase();

      if (rawDim.startsWith('sang') || code.startsWith('SAN') || (!code && !rawDim && i < itemsPerDim)) {
        dim = 'Sanguine';
      } else if (rawDim.startsWith('chol') || code.startsWith('CHO') || (!code && !rawDim && i < itemsPerDim * 2)) {
        dim = 'Choleric';
      } else if (rawDim.startsWith('mela') || code.startsWith('MEL') || (!code && !rawDim && i < itemsPerDim * 3)) {
        dim = 'Melancholic';
      } else if (rawDim.startsWith('phle') || code.startsWith('PHL') || (!code && !rawDim && i < itemsPerDim * 4)) {
        dim = 'Phlegmatic';
      }

      const reverse = q.reverse_coded || (code && (code.endsWith('04') || code.endsWith('08')));
      const score = reverse ? (6 - val) : val;
      totals[dim] += score;
      counts[dim] += 1;
    });

    const scores: Record<string, number> = {};
    for (const dim of ['Sanguine', 'Choleric', 'Melancholic', 'Phlegmatic']) {
      const count = counts[dim] || itemsPerDim || 5;
      const mean = (totals[dim] || (count * 3)) / count;
      scores[dim] = Math.max(0, Math.min(100, Math.round(((mean - 1) / 4) * 100)));
    }

    const dominant = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0] || 'Sanguine';
    const TEMPERAMENT_SUMMARIES: Record<string, string> = {
      Sanguine: 'Expressive, optimistic and quick to connect. You recharge around people and bring energy to a room.',
      Choleric: 'Driven, decisive and direct. You set goals fast and move others toward them.',
      Melancholic: 'Thoughtful, precise and deeply reflective. You notice detail and hold high standards.',
      Phlegmatic: 'Calm, steady and dependable. You keep your balance when others lose theirs.',
    };

    return {
      dominant,
      summary: TEMPERAMENT_SUMMARIES[dominant] || '',
      scores,
      narrative: `Your reflective responses indicate prominent tendencies in the ${dominant} dimension. This pattern reflects your unique preferences when engaging with social situations, problem-solving, and personal tasks.`,
    };
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    const answered = answers[currentQuestion.id];
    if (!answered) return;

    // Submit current answer to the backend
    try {
      await submitAnswer(sessionId!, {
        question_id: currentQuestion.id,
        value: parseInt(answered, 10),
      });
    } catch (e) {
      console.warn('Failed to save answer incrementally', e);
    }

    const last = index === questions.length - 1;

    if (!last) {
      setIndex((i) => i + 1);
      return;
    }

    setLoading(true);
    try {
      // Ensure all answers in answers state are submitted
      for (const [qid, val] of Object.entries(answers)) {
        if (qid !== currentQuestion.id) {
          try {
            await submitAnswer(sessionId!, {
              question_id: qid,
              value: parseInt(val, 10),
            });
          } catch {
            // continue
          }
        }
      }

      const data = await completeAssessment(sessionId!);
      const resultData = data as TemperamentResult & { [key: string]: unknown };

      const scoresMap: Record<string, number> = {};
      const rawScores = (resultData as any).temperament_scores;
      if (Array.isArray(rawScores)) {
        for (const item of rawScores) {
          const name = item.dimension ? (item.dimension.charAt(0).toUpperCase() + item.dimension.slice(1)) : 'Score';
          scoresMap[name] = Math.round(item.normalized_score ?? item.score ?? 0);
        }
      } else if (resultData.scores && typeof resultData.scores === 'object') {
        Object.assign(scoresMap, resultData.scores);
      }

      const dominant =
        resultData.dominant ??
        (Array.isArray((resultData as any).leading_tendencies) && (resultData as any).leading_tendencies[0]
          ? ((resultData as any).leading_tendencies[0].charAt(0).toUpperCase() + (resultData as any).leading_tendencies[0].slice(1))
          : resultData.temperament ?? 'Unknown');

      const TEMPERAMENT_SUMMARIES: Record<string, string> = {
        Sanguine: 'Expressive, optimistic and quick to connect. You recharge around people and bring energy to a room.',
        Choleric: 'Driven, decisive and direct. You set goals fast and move others toward them.',
        Melancholic: 'Thoughtful, precise and deeply reflective. You notice detail and hold high standards.',
        Phlegmatic: 'Calm, steady and dependable. You keep your balance when others lose theirs.',
      };

      const summary = resultData.summary || TEMPERAMENT_SUMMARIES[dominant] || '';

      setResult({
        dominant,
        summary,
        scores: scoresMap,
        narrative: '',
        motion: '',
        recommendations: [],
        llm_model: (resultData as any).llm_model,
        prompt_version: (resultData as any).prompt_version,
      });
      setReportId((resultData as any).report_id ?? null);
      setNarrativeText('');
      setMotionText('');
      setRecommendations([]);
      setStreaming(true);
      setError(null);
      setView('result');

      // Stream the LLM-generated narrative, trait motion, and recommendations.
      try {
        resultStreamRef.current = streamAssessmentResult(
          sessionId!,
          (event) => {
            if (event.type === 'narrative') {
              setNarrativeText((prev) => prev + (event.delta || ''));
            } else if (event.type === 'motion') {
              setMotionText((prev) => prev + (event.delta || ''));
            } else if (event.type === 'recommendations') {
              setRecommendations(Array.isArray(event.recommendations) ? event.recommendations : []);
            }
          },
          () => {
            setStreaming(false);
            // Fallback: pull any recommendations already persisted server-side.
            if (sessionId) {
              getSessionRecommendations(sessionId).then((data: unknown) => {
                const recs = (data as { [key: string]: unknown }).recommendations;
                if (Array.isArray(recs) && recs.length > 0) {
                  setRecommendations(recs);
                }
              }).catch(() => {
                /* recommendations stay empty */
              });
            }
          },
        );
      } catch (err) {
        console.warn('Result stream failed', err);
        setStreaming(false);
        // One-shot fallback when streaming is unavailable.
        fetchAssessmentResult(sessionId!).then((res: AssessmentResult) => {
          setNarrativeText(res.narrative || '');
          setMotionText(res.motion || '');
          if (res.recommendations?.length > 0) {
            setRecommendations(res.recommendations);
          }
        }).catch(() => {
          setStreaming(false);
        });
      }
    } catch (err) {
      console.warn('Backend completeAssessment failed, calculating result locally:', err);
      // Fallback: calculate result from submitted answers so user always sees their result
      const localResult = analyseLocally();
      setResult(localResult);
      setStreaming(false);
      setNarrativeText(localResult.narrative || '');
      setMotionText('');
      setRecommendations([]);
      setError(null);
      setView('result');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const handleRestart = () => {
    reset();
  };

  const handleRecFeedback = async (recId: string, status: 'accepted' | 'dismissed' | 'in_progress') => {
    try {
      await submitRecommendationFeedback(recId, { event: 'status_change', status });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status } : r)),
      );
    } catch (e) {
      console.warn('Recommendation feedback failed', e);
    }
  };

  const handleLogout = () => {
    reset();
    logout();
    navigate('/login');
  };

  const handleDownloadReport = async () => {
    if (!reportId) return;

    setDownloadingReport(true);
    setError(null);
    try {
      const blob = await getReportPdf(reportId);
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('The server returned an empty PDF report');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agent-bleu-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF report');
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <img
          src={logo}
          alt="Agent Bleu"
          className="header-logo"
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
      </header>

      <main className="wrap">
        {error && (
          <div className="err" role="alert">
            {error}
            <button className="btn ghost" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {view === 'intro' && (
          <section id="intro" className="intro">
            <h1>Answer a few questions. Agent Bleu reads your personality.</h1>
            <p>
              Each question has no right or wrong answer. Pick the response closest to your
              first instinct.
            </p>
            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {loading ? (
                <button className="btn" disabled>Connecting…</button>
              ) : (
                <button className="btn" id="start" onClick={handleStart}>Start Assessment</button>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowIntroCheckIn((v) => !v)}
              >
                {showIntroCheckIn ? 'Hide Check-in' : 'Momentary Emotion Check-in'}
              </button>
            </div>

            {showIntroCheckIn && (
              <EmotionCheckIn
                sessionId={sessionId}
                onClose={() => setShowIntroCheckIn(false)}
              />
            )}
          </section>
        )}

        {view === 'quiz' && (
          <section id="quiz" className="quiz">
            <div className="bar">
              <div className="meta">
                <div className="track" id="track" aria-hidden="true">
                  {questions.map((_, i) => (
                    <i key={i} className={i <= index ? 'done' : ''} />
                  ))}
                </div>
                <div className="count" id="count" aria-live="polite">
                  {questions.length > 0 ? `${index + 1} of ${questions.length}` : ''}
                </div>
              </div>
            </div>
            <div id="notice"></div>
            {currentQuestion ? (
              <>
                <h2 className="q-text" id="qtext">{currentQuestion.text}</h2>
                <div className="options" id="options" role="radiogroup" aria-labelledby="qtext">
                  {currentQuestion.options.map((opt, i) => {
                    const selected = answers[currentQuestion.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        className="opt"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => handleChoose(opt.id)}
                      >
                        <kbd>{i + 1}</kbd>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="actions">
                  <button className="btn ghost" id="back" onClick={handleBack} disabled={index === 0}>
                    Back
                  </button>
                  <button
                    className="btn"
                    id="next"
                    disabled={!answers[currentQuestion.id] || loading}
                    onClick={handleNext}
                  >
                    {index === questions.length - 1
                      ? loading
                        ? 'Analysing…'
                        : 'See my result'
                      : 'Next question'}
                  </button>
                </div>
                <p className="note">Tip: select your answer to continue.</p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <h2 className="q-text" id="qtext">Connecting to Agent Bleu…</h2>
                <p className="note">Streaming assessment questions…</p>
              </div>
            )}
          </section>
        )}

        {view === 'result' && (
          <section id="result" className="result">
            <div className="bar"></div>
            {result ? (
              <>
                <p className="count">Your dominant temperament</p>
                <h2 id="rname">{result.dominant}</h2>
                <p className="lead" id="rsummary">{result.summary ?? ''}</p>

                {streaming && (
                  <div className="stream-status" role="status" aria-live="polite">
                    <span className="stream-dot" aria-hidden="true"></span>
                    <span className="stream-dot" aria-hidden="true"></span>
                    <span className="stream-dot" aria-hidden="true"></span>
                    Agent Bleu is synthesizing your narrative, trait motion, and recommendations…
                  </div>
                )}

                <div className="scores" id="scores">
                  {result.scores &&
                    Object.entries(result.scores).map(([k, v]) => (
                      <div key={k} className="score">
                        <span>{k}</span>
                        <div className="meter"><b data-w={v} style={{ width: `${v}%` }}></b></div>
                        <span>{v}%</span>
                      </div>
                    ))}
                </div>

                {/* Live streamed narrative (Narrative Service) */}
                {(streaming || narrativeText || result.narrative) && (
                  <div className="narrative-card">
                    <div className="narrative-header">
                      <span className="narrative-title">Live Generated Reflective Narrative</span>
                      <span className={`narrative-badge ${streaming ? 'streaming' : ''}`}>
                        {streaming ? 'AI Synthesis • Streaming' : 'AI Synthesis'}
                      </span>
                    </div>
                    <div className="narrative-text">
                      {(narrativeText || result.narrative || '')
                        .split('\n\n')
                        .map((para, i) => (
                          <p key={i}>{para.trim()}</p>
                        ))}
                      {streaming && <span className="stream-cursor" aria-hidden="true">▋</span>}
                    </div>
                    <div className="narrative-meta">
                      Narrative Service • {result.llm_model ? `model: ${result.llm_model}` : 'framework fallback'}
                      • {result.prompt_version || 'v1.0.0'} • Verified Non-Diagnostic
                    </div>
                  </div>
                )}

                {/* Live streamed trait motion (Motion Service) */}
                {(streaming || motionText || result.motion) && (
                  <div className="motion-card">
                    <div className="narrative-header">
                      <span className="narrative-title">Trait Motion — how your tendencies flow</span>
                      <span className={`narrative-badge ${streaming ? 'streaming' : ''}`}>
                        {streaming ? 'AI Synthesis • Streaming' : 'AI Synthesis'}
                      </span>
                    </div>
                    <div className="narrative-text">
                      {(motionText || result.motion || '')
                        .split('\n\n')
                        .map((para, i) => (
                          <p key={i}>{para.trim()}</p>
                        ))}
                      {streaming && <span className="stream-cursor" aria-hidden="true">▋</span>}
                    </div>
                    <div className="narrative-meta">
                      Motion Service • dynamic trait interplay • Verified Non-Diagnostic
                    </div>
                  </div>
                )}

                {/* Recommendations (Recommendation Service) */}
                <section className="recommendations">
                  <h3>Personalized Recommendations</h3>
                  <p className="rec-note">
                    Psychoeducational suggestions matched to your scores and emotion self-reports
                    — not medical or psychiatric advice.
                  </p>
                  {recommendations.length > 0 ? (
                    recommendations.map((rec) => {
                      const body = rec.body;
                      return (
                        <div key={rec.id} className="rec-card">
                          <div className="rec-head">
                            <span className="rec-title">
                              {typeof rec.title === 'string' ? rec.title : String(rec.template_id)}
                            </span>
                            <span className="rec-status">{rec.status}</span>
                          </div>
                          {body ? (
                            <div className="rec-body">
                              {typeof body === 'string' ? (
                                <p>{body}</p>
                              ) : (
                                <>
                                  {body.why && (
                                    <p>
                                      <span className="rec-label">Why it fits:</span> {String(body.why)}
                                    </p>
                                  )}
                                  {body.what && (
                                    <p>
                                      <span className="rec-label">What to try:</span> {String(body.what)}
                                    </p>
                                  )}
                                  {Array.isArray(body.how) && body.how.length > 0 && (
                                    <>
                                      <span className="rec-label">How:</span>
                                      <ul className="rec-how">
                                        {body.how.map((step, i) => (
                                          <li key={i}>{String(step)}</li>
                                        ))}
                                      </ul>
                                    </>
                                  )}
                                  {body.measure && (
                                    <p>
                                      <span className="rec-label">Check:</span> {String(body.measure)}
                                    </p>
                                  )}
                                  {body.professional_support_when && (
                                    <p className="rec-support">
                                      <span className="rec-label">Consider support when:</span>{' '}
                                      {String(body.professional_support_when)}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          ) : null}
                          <div className="rec-actions">
                            <button
                              className="btn ghost rec-btn"
                              onClick={() => handleRecFeedback(rec.id, 'accepted')}
                            >
                              Mark accepted
                            </button>
                            <button
                              className="btn ghost rec-btn"
                              onClick={() => handleRecFeedback(rec.id, 'dismissed')}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rec-empty">
                      No recommendations were triggered for this session. Recommendations appear when
                      your scores or emotion self-reports match a care guideline.
                    </p>
                  )}
                </section>

                {/* Momentary Emotion Check-in */}
                <EmotionCheckIn
                  sessionId={sessionId}
                  dominantTemperament={result.dominant}
                  onDiscussWithAgent={(prompt) => setAgentExternalPrompt(prompt)}
                />

                {/* Conversational AI Agent for Clarification */}
                <ClarificationAgent
                  sessionId={sessionId}
                  result={result}
                  reportId={reportId}
                  externalPrompt={agentExternalPrompt}
                  onClearExternalPrompt={() => setAgentExternalPrompt(null)}
                />

                <div className="result-meta">
                  {reportId && <span>Report {reportId}</span>}
                  {result.llm_model && <span>Model: {result.llm_model}</span>}
                  <span>Synthesized by PsychemetreAI Orchestration Agent • Verified Non-Diagnostic</span>
                </div>

                <div className="result-actions">
                  {reportId && (
                    <button
                      className="btn"
                      onClick={handleDownloadReport}
                      disabled={downloadingReport}
                    >
                      {downloadingReport ? 'Preparing PDF…' : 'Download PDF report'}
                    </button>
                  )}
                  <button className="btn ghost" id="restart" onClick={handleRestart}>
                    Retake analysis
                  </button>
                </div>
              </>
            ) : null}
          </section>
        )}

        <button className="btn ghost" onClick={handleLogout} style={{ marginTop: '2rem', display: 'block', margin: '2rem auto 0' }}>
          Sign out
        </button>
      </main>
    </div>
  );
}

function App() {
  const { loading, authenticated } = useAuth();

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <a href="/landing" title="Go to Landing Page" style={{ display: 'inline-block' }}>
            <img src={logo} alt="Agent Bleu" className="header-logo" />
          </a>
        </header>
        <main className="wrap" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <p>Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/landing" element={<Landing />} />
        <Route
          path="/"
          element={
            authenticated ? <AssessmentApp /> : <Landing />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
