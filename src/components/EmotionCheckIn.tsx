import React, { useState } from 'react';
import {
  createEmotionSelfReport,
  type EmotionSelfReportRequest,
} from '../api';

export type PrimaryEmotionType =
  | 'joy'
  | 'stress'
  | 'anxiety'
  | 'anger'
  | 'sadness'
  | 'fear'
  | 'loneliness'
  | 'guilt'
  | 'jealousy';

interface EmotionOption {
  id: PrimaryEmotionType;
  label: string;
  emoji: string;
  category: 'positive' | 'high_distress' | 'low_distress';
  description: string;
  color: string;
}

const AVAILABLE_EMOTIONS: EmotionOption[] = [
  {
    id: 'joy',
    label: 'Joy & Contentment',
    emoji: '✨',
    category: 'positive',
    description: 'Feeling fulfilled, energized, grateful, or at peace.',
    color: '#059669',
  },
  {
    id: 'stress',
    label: 'Stress & Overload',
    emoji: '⚡',
    category: 'high_distress',
    description: 'Feeling pressed for time, overstimulated, or burdened.',
    color: '#d97706',
  },
  {
    id: 'anxiety',
    label: 'Anxiety & Apprehension',
    emoji: '🌪️',
    category: 'high_distress',
    description: 'Unease about upcoming events, racing thoughts, or dread.',
    color: '#dc2626',
  },
  {
    id: 'anger',
    label: 'Frustration & Anger',
    emoji: '🔥',
    category: 'high_distress',
    description: 'Feeling irritated, blocked, resentful, or impatient.',
    color: '#b91c1c',
  },
  {
    id: 'fear',
    label: 'Fear & Vulnerability',
    emoji: '🛡️',
    category: 'high_distress',
    description: 'Feeling threatened, insecure, exposed, or uncertain.',
    color: '#9333ea',
  },
  {
    id: 'sadness',
    label: 'Sadness & Heaviness',
    emoji: '🌧️',
    category: 'low_distress',
    description: 'Low energy, grief, disappointment, or feeling down.',
    color: '#2563eb',
  },
  {
    id: 'loneliness',
    label: 'Loneliness & Disconnect',
    emoji: '🪞',
    category: 'low_distress',
    description: 'Feeling isolated, unseen, or lacking meaningful contact.',
    color: '#475569',
  },
  {
    id: 'guilt',
    label: 'Guilt & Self-Criticism',
    emoji: '⚖️',
    category: 'low_distress',
    description: 'Remorse, harsh self-talk, or feeling you fell short.',
    color: '#64748b',
  },
  {
    id: 'jealousy',
    label: 'Envy & Comparison',
    emoji: '🌱',
    category: 'high_distress',
    description: 'Preoccupied with comparison, perceived unfairness, or longing.',
    color: '#0891b2',
  },
];

const COMMON_TRIGGERS = [
  'Workload & Deadlines',
  'Interpersonal Tension / Conflict',
  'Physical Fatigue / Lack of Sleep',
  'Uncertainty & Life Transitions',
  'Personal High Standards / Perfectionism',
  'Digital & Sensory Overload',
  'Health or Financial Concern',
  'Isolation / Lack of Support',
  'Positive Achievement / Celebration',
  'Unknown / Internal Shift',
];

const COMMON_SENSATIONS = [
  'Tightness in chest',
  'Shallow or held breathing',
  'Clenched jaw / Neck tension',
  'Stomach flutter / Knot',
  'Racing pulse',
  'Heavy limbs / Low vitality',
  'Restless or jittery energy',
  'Warm, relaxed muscles',
];

const COMMON_RESPONSES = [
  'Want to withdraw & isolate',
  'Urge to fix everything immediately',
  'Inclined to vent or speak up',
  'Seeking distraction or scrolling',
  'Seeking reassurance or connection',
  'Slowing down & reflecting',
  'Savoring the current momentum',
];

const COMMON_COPING = [
  '5-minute pause & deep breaths',
  'Stepping outside for a short walk',
  'Writing down racing thoughts',
  'Talking it through with someone',
  'Focusing on one small task next',
  'Giving myself permission to rest',
  'Listening to calming music',
];

export interface ExtendedCheckInData {
  selectedEmotions: PrimaryEmotionType[];
  primaryEmotion: PrimaryEmotionType;
  intensity: number;
  frequency: 'rarely' | 'sometimes' | 'often' | 'very_often';
  duration: 'minutes' | 'hours' | 'days' | 'weeks' | 'varies';
  trigger: string;
  sensations: string[];
  response: string;
  copingStrategy: string;
  impact: 'low' | 'moderate' | 'high' | 'severe';
  timestamp: string;
}

interface EmotionCheckInProps {
  sessionId?: string | null;
  dominantTemperament?: string;
  onComplete?: (report: EmotionSelfReportRequest, extended: ExtendedCheckInData) => void;
  onDiscussWithAgent?: (prompt: string) => void;
  onClose?: () => void;
}

export default function EmotionCheckIn({
  sessionId,
  dominantTemperament,
  onComplete,
  onDiscussWithAgent,
  onClose,
}: EmotionCheckInProps) {
  // Step navigation: 'select' -> 'context' -> 'completed'
  const [step, setStep] = useState<'select' | 'context' | 'completed'>('select');

  // Core emotion state
  const [selectedEmotions, setSelectedEmotions] = useState<PrimaryEmotionType[]>(['stress']);
  const [primaryEmotion, setPrimaryEmotion] = useState<PrimaryEmotionType>('stress');
  const [intensity, setIntensity] = useState<number>(6);

  // Contextual follow-up state (optional)
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  const [duration, setDuration] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'varies'>('hours');
  const [frequency, setFrequency] = useState<'rarely' | 'sometimes' | 'often' | 'very_often'>('sometimes');
  const [selectedResponses, setSelectedResponses] = useState<string[]>([]);
  const [selectedCoping, setSelectedCoping] = useState<string[]>([]);
  const [impact, setImpact] = useState<'low' | 'moderate' | 'high' | 'severe'>('moderate');

  // Request & Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<ExtendedCheckInData | null>(null);

  // Toggle emotion chip
  const toggleEmotion = (id: PrimaryEmotionType) => {
    if (selectedEmotions.includes(id)) {
      if (selectedEmotions.length === 1) return; // Keep at least one
      const updated = selectedEmotions.filter((e) => e !== id);
      setSelectedEmotions(updated);
      if (primaryEmotion === id) {
        setPrimaryEmotion(updated[0]);
      }
    } else {
      const updated = [...selectedEmotions, id];
      setSelectedEmotions(updated);
      if (selectedEmotions.length === 0) {
        setPrimaryEmotion(id);
      }
    }
  };

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const activeEmotionMeta = AVAILABLE_EMOTIONS.find((e) => e.id === primaryEmotion) || AVAILABLE_EMOTIONS[0];

  // Intensity descriptive label
  const getIntensityLabel = (val: number): { text: string; color: string } => {
    if (val <= 2) return { text: 'Subtle / Mild', color: '#10b981' };
    if (val <= 4) return { text: 'Moderate / Manageable', color: '#3b82f6' };
    if (val <= 6) return { text: 'Noticeable / Present', color: '#f59e0b' };
    if (val <= 8) return { text: 'High / Demanding Attention', color: '#ea580c' };
    return { text: 'Acute / Overwhelming', color: '#dc2626' };
  };

  const intensityInfo = getIntensityLabel(intensity);

  // Build payload
  const buildPayload = (includeContext: boolean): { req: EmotionSelfReportRequest; extended: ExtendedCheckInData } => {
    const combinedTrigger = includeContext
      ? [
          ...selectedTriggers,
          customTrigger.trim() ? customTrigger.trim() : null,
        ]
          .filter(Boolean)
          .join('; ')
      : '';

    const combinedResponse = includeContext ? selectedResponses.join(', ') : '';
    const combinedCoping = includeContext ? selectedCoping.join(', ') : '';

    const req: EmotionSelfReportRequest = {
      emotion: primaryEmotion,
      frequency,
      intensity,
      duration,
      trigger: combinedTrigger || undefined,
      response: combinedResponse || undefined,
      coping_strategy: combinedCoping || undefined,
      impact: includeContext ? impact : 'moderate',
    };

    const extended: ExtendedCheckInData = {
      selectedEmotions,
      primaryEmotion,
      intensity,
      frequency,
      duration,
      trigger: combinedTrigger,
      sensations: includeContext ? selectedSensations : [],
      response: combinedResponse,
      copingStrategy: combinedCoping,
      impact: includeContext ? impact : 'moderate',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    return { req, extended };
  };

  // Submit check-in
  const handleSubmit = async (includeContext = true) => {
    setError(null);
    setSubmitting(true);
    const { req, extended } = buildPayload(includeContext);

    try {
      if (sessionId) {
        try {
          await createEmotionSelfReport(sessionId, req);
        } catch (apiErr: any) {
          console.warn('API emotion self-report endpoint call deferred or unavailable:', apiErr);
          // Still proceed so user experience is not blocked
        }
      }

      setSubmittedData(extended);
      setStep('completed');
      if (onComplete) {
        onComplete(req, extended);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to record emotional check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscussClick = () => {
    if (!onDiscussWithAgent || !submittedData) return;
    const prompt = `I just logged an emotion check-in: feeling ${submittedData.primaryEmotion} at intensity ${submittedData.intensity}/10${
      submittedData.trigger ? ` triggered by "${submittedData.trigger}"` : ''
    }${
      submittedData.sensations.length > 0 ? ` with physical sensations of ${submittedData.sensations.join(', ')}` : ''
    }. Given my ${dominantTemperament || 'personality'} profile, how does this momentary emotional experience relate to my temperament tendencies, and what is a recommended regulation strategy?`;

    onDiscussWithAgent(prompt);
  };

  return (
    <div className="checkin-card" role="region" aria-label="Emotion Check-in">
      {/* Header with Construct Distinction Reminder */}
      <div className="checkin-header">
        <div className="checkin-header-top">
          <div className="checkin-badge-row">
            <span className="checkin-badge-tag">Current Emotional State</span>
            <span className="checkin-badge-sub">Momentary · Dynamic</span>
          </div>
          {onClose && (
            <button
              type="button"
              className="checkin-close-btn"
              onClick={onClose}
              aria-label="Close Check-in"
            >
              ✕
            </button>
          )}
        </div>

        <h3 className="checkin-title">Momentary Emotion Check-in</h3>
        <p className="checkin-distinction-note">
          <strong>Important distinction:</strong> Your baseline <em>temperament tendencies</em> are constitutional traits,
          your <em>emotional skills</em> are learned abilities, and your <em>current emotional experience</em> is
          what you feel right now.
        </p>
      </div>

      {error && (
        <div className="err" role="alert" style={{ margin: '1rem 0' }}>
          {error}
          <button className="btn ghost" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: CURRENT EMOTIONS SELECTION */}
      {step === 'select' && (
        <div className="checkin-step-body">
          <div className="checkin-section-title">
            <span>1. Select what you are experiencing right now</span>
            <span className="checkin-hint">Choose all that resonate</span>
          </div>

          <div className="checkin-emotions-grid">
            {AVAILABLE_EMOTIONS.map((emo) => {
              const isSelected = selectedEmotions.includes(emo.id);
              const isPrimary = primaryEmotion === emo.id;

              return (
                <button
                  type="button"
                  key={emo.id}
                  className={`checkin-emotion-chip ${isSelected ? 'selected' : ''} ${isPrimary ? 'primary-focus' : ''}`}
                  onClick={() => toggleEmotion(emo.id)}
                  aria-pressed={isSelected}
                >
                  <span className="checkin-chip-emoji">{emo.emoji}</span>
                  <div className="checkin-chip-info">
                    <span className="checkin-chip-label">{emo.label}</span>
                    <span className="checkin-chip-desc">{emo.description}</span>
                  </div>
                  {isSelected && (
                    <span className="checkin-check-icon" title="Selected">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedEmotions.length > 1 && (
            <div className="checkin-primary-selector">
              <label htmlFor="primary-emotion-select" className="checkin-sublabel">
                Primary emotion in focus:
              </label>
              <div className="checkin-primary-pills">
                {selectedEmotions.map((id) => {
                  const m = AVAILABLE_EMOTIONS.find((e) => e.id === id);
                  return (
                    <button
                      type="button"
                      key={id}
                      className={`checkin-pill ${primaryEmotion === id ? 'active' : ''}`}
                      onClick={() => setPrimaryEmotion(id)}
                    >
                      {m?.emoji} {m?.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Intensity Slider */}
          <div className="checkin-intensity-box">
            <div className="checkin-intensity-header">
              <span className="checkin-intensity-title">
                Intensity of <strong>{activeEmotionMeta.label.split(' ')[0]}</strong>:
              </span>
              <span
                className="checkin-intensity-badge"
                style={{ backgroundColor: intensityInfo.color }}
              >
                {intensity}/10 — {intensityInfo.text}
              </span>
            </div>

            <div className="checkin-slider-wrap">
              <span className="checkin-slider-label">1 (Subtle)</span>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
                className="checkin-slider"
                aria-label="Emotion Intensity Scale"
              />
              <span className="checkin-slider-label">10 (Overwhelming)</span>
            </div>
          </div>

          {/* Step Actions */}
          <div className="checkin-actions">
            <button
              type="button"
              className="btn checkin-btn-primary"
              onClick={() => setStep('context')}
            >
              <span>Continue to Contextual Follow-up</span>
              <span className="checkin-btn-icon">→</span>
            </button>
            <button
              type="button"
              className="btn ghost checkin-btn-ghost"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Quick Save (Skip Follow-up)'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CONTEXTUAL FOLLOW-UP (OPTIONAL) */}
      {step === 'context' && (
        <div className="checkin-step-body">
          <div className="checkin-context-banner">
            <div>
              <span className="checkin-context-badge">Contextual Follow-up</span>
              <h4 className="checkin-context-head">
                Unpacking your {activeEmotionMeta.emoji} {activeEmotionMeta.label.split(' ')[0]}
              </h4>
            </div>
            <p className="checkin-context-lead">
              Optional follow-up to identify situational triggers, somatic manifestations, and regulation needs.
            </p>
          </div>

          {/* Trigger Identification */}
          <div className="checkin-group">
            <label className="checkin-group-label">
              <span>What catalyzed or sparked this feeling?</span>
              <span className="checkin-optional-tag">Optional</span>
            </label>
            <div className="checkin-tag-cloud">
              {COMMON_TRIGGERS.map((trig) => (
                <button
                  type="button"
                  key={trig}
                  className={`checkin-tag ${selectedTriggers.includes(trig) ? 'active' : ''}`}
                  onClick={() => toggleItem(selectedTriggers, setSelectedTriggers, trig)}
                >
                  {trig}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="checkin-input"
              placeholder="Or type a specific trigger in your own words…"
              value={customTrigger}
              onChange={(e) => setCustomTrigger(e.target.value)}
            />
          </div>

          {/* Somatic Manifestations */}
          <div className="checkin-group">
            <label className="checkin-group-label">
              <span>Where is this showing up in your body?</span>
              <span className="checkin-optional-tag">Optional</span>
            </label>
            <div className="checkin-tag-cloud">
              {COMMON_SENSATIONS.map((sensation) => (
                <button
                  type="button"
                  key={sensation}
                  className={`checkin-tag ${selectedSensations.includes(sensation) ? 'active' : ''}`}
                  onClick={() => toggleItem(selectedSensations, setSelectedSensations, sensation)}
                >
                  {sensation}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Frequency Selectors */}
          <div className="checkin-grid-two">
            <div className="checkin-group">
              <label className="checkin-group-label">
                <span>Duration so far:</span>
              </label>
              <div className="checkin-pill-row">
                {(['minutes', 'hours', 'days', 'weeks', 'varies'] as const).map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={`checkin-pill ${duration === d ? 'active' : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="checkin-group">
              <label className="checkin-group-label">
                <span>Frequency of this feeling:</span>
              </label>
              <div className="checkin-pill-row">
                {(['rarely', 'sometimes', 'often', 'very_often'] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    className={`checkin-pill ${frequency === f ? 'active' : ''}`}
                    onClick={() => setFrequency(f)}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Impact on Daily Functioning */}
          <div className="checkin-group">
            <label className="checkin-group-label">
              <span>Impact on your focus or energy right now:</span>
              <span className="checkin-optional-tag">Self-Assessment</span>
            </label>
            <div className="checkin-pill-row">
              {(['low', 'moderate', 'high', 'severe'] as const).map((imp) => (
                <button
                  type="button"
                  key={imp}
                  className={`checkin-pill ${impact === imp ? 'active' : ''}`}
                  onClick={() => setImpact(imp)}
                >
                  {imp === 'low'
                    ? '🟢 Low (Manageable background)'
                    : imp === 'moderate'
                    ? '🟡 Moderate (Noticeable impact)'
                    : imp === 'high'
                    ? '🟠 High (Disrupting focus)'
                    : '🔴 Severe (Needs immediate pause)'}
                </button>
              ))}
            </div>
          </div>

          {/* Impulse / Inclination */}
          <div className="checkin-group">
            <label className="checkin-group-label">
              <span>What is this feeling nudging you to do?</span>
              <span className="checkin-optional-tag">Behavioral Impulse</span>
            </label>
            <div className="checkin-tag-cloud">
              {COMMON_RESPONSES.map((resp) => (
                <button
                  type="button"
                  key={resp}
                  className={`checkin-tag ${selectedResponses.includes(resp) ? 'active' : ''}`}
                  onClick={() => toggleItem(selectedResponses, setSelectedResponses, resp)}
                >
                  {resp}
                </button>
              ))}
            </div>
          </div>

          {/* Supportive Coping Option */}
          <div className="checkin-group">
            <label className="checkin-group-label">
              <span>What supportive action might serve you right now?</span>
              <span className="checkin-optional-tag">Self-Regulation</span>
            </label>
            <div className="checkin-tag-cloud">
              {COMMON_COPING.map((cope) => (
                <button
                  type="button"
                  key={cope}
                  className={`checkin-tag ${selectedCoping.includes(cope) ? 'active' : ''}`}
                  onClick={() => toggleItem(selectedCoping, setSelectedCoping, cope)}
                >
                  {cope}
                </button>
              ))}
            </div>
          </div>

          {/* Step Actions */}
          <div className="checkin-actions">
            <button
              type="button"
              className="btn checkin-btn-primary"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
            >
              {submitting ? 'Saving Check-in…' : 'Complete Check-in'}
            </button>
            <button
              type="button"
              className="btn ghost checkin-btn-ghost"
              onClick={() => setStep('select')}
              disabled={submitting}
            >
              ← Back to Emotions
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COMPLETED CONFIRMATION & SYNTHESIS */}
      {step === 'completed' && submittedData && (
        <div className="checkin-completed-wrap">
          <div className="checkin-success-banner">
            <div className="checkin-success-icon">✓</div>
            <div>
              <h4 className="checkin-success-title">Emotion Check-in Logged</h4>
              <p className="checkin-success-desc">
                Your momentary state has been captured.
              </p>
            </div>
          </div>

          <div className="checkin-summary-card">
            <div className="checkin-summary-row">
              <span className="checkin-summary-label">Primary Emotion:</span>
              <span className="checkin-summary-val">
                {activeEmotionMeta.emoji} {activeEmotionMeta.label}
              </span>
            </div>

            <div className="checkin-summary-row">
              <span className="checkin-summary-label">Intensity:</span>
              <div className="checkin-summary-meter">
                <div
                  className="checkin-meter-fill"
                  style={{
                    width: `${submittedData.intensity * 10}%`,
                    backgroundColor: intensityInfo.color,
                  }}
                />
                <span className="checkin-meter-num">{submittedData.intensity}/10</span>
              </div>
            </div>

            {submittedData.trigger && (
              <div className="checkin-summary-row">
                <span className="checkin-summary-label">Trigger:</span>
                <span className="checkin-summary-val">{submittedData.trigger}</span>
              </div>
            )}

            {submittedData.sensations.length > 0 && (
              <div className="checkin-summary-row">
                <span className="checkin-summary-label">Somatic cues:</span>
                <span className="checkin-summary-val">
                  {submittedData.sensations.join(', ')}
                </span>
              </div>
            )}

            {submittedData.copingStrategy && (
              <div className="checkin-summary-row">
                <span className="checkin-summary-label">Selected coping:</span>
                <span className="checkin-summary-val">{submittedData.copingStrategy}</span>
              </div>
            )}
          </div>

          {/* Psychoeducational insight */}
          <div className="checkin-insight-box">
            <p className="checkin-insight-text">
              💡 <strong>Self-Awareness in Action:</strong> Emotions are dynamic neurochemical events lasting typically 90 seconds unless sustained by repetitive thoughts. By observing and naming this feeling, you engage your prefrontal cortex and cultivate emotional agility.
            </p>
          </div>

          {/* Actions */}
          <div className="checkin-completed-actions">
            {onDiscussWithAgent && (
              <button
                type="button"
                className="btn checkin-btn-discuss"
                onClick={handleDiscussClick}
              >
                💬 Explore this with Agent Bleu
              </button>
            )}
            <button
              type="button"
              className="btn ghost checkin-btn-again"
              onClick={() => {
                setStep('select');
                setSubmittedData(null);
              }}
            >
              Log Another Check-in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
