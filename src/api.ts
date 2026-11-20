/**
 * Agent Bleu — Personal Assessment API client
 *
 * Generated from the OpenAPI spec at http://127.0.0.1:8000/openapi.json
 *
 * Base URL: http://127.0.0.1:8000
 * All paths are versioned under /api/v1 unless noted otherwise.
 */

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://psychemetric-ai.onrender.com';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type ConsentType =
  | 'terms_privacy'
  | 'assessment_processing'
  | 'research_use'
  | 'model_training';

export type EvidenceLevel =
  | 'unreviewed_seed'
  | 'expert_reviewed'
  | 'research_supported'
  | 'clinical_guideline';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  is_adult_confirmed: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface GrantConsentRequest {
  type: ConsentType;
  version: string;
  granted: boolean;
}

export interface Instrument {
  [key: string]: unknown;
}

export interface AssessmentStartRequest {
  user_id: string;
  instrument_code?: string;
  instrument_version?: string;
  resume_if_active?: boolean;
}

export interface AnswerSubmitRequest {
  question_id: string;
  value: number; // Likert 1–5
}

export interface QuestionOption {
  id?: string;
  code?: string;
  text: string;
  value?: number;
  label?: string;
  [key: string]: unknown;
}

export interface Question {
  id: string;
  code?: string;
  text: string;
  area?: string;
  kind?: string;
  dimension?: string;
  reverse_coded?: boolean;
  sort_order?: number;
  options?: QuestionOption[];
  [key: string]: unknown;
}

export interface AnswerRecord {
  question_id: string;
  likert_value: number;
  seq: number;
}

export interface AssessmentProgressResponse {
  session_id: string;
  user_id: string;
  status: string;
  instrument_code: string;
  instrument_version: string;
  total_questions: number;
  answered_count: number;
  remaining_count: number;
  progress_percentage: number;
  next_question?: Record<string, unknown> | null;
  answers?: AnswerRecord[];
  resumed?: boolean;
}

export interface EmotionSelfReportRequest {
  emotion: 'anger' | 'anxiety' | 'fear' | 'sadness' | 'stress' | 'guilt' | 'jealousy' | 'loneliness' | 'joy';
  frequency: 'rarely' | 'sometimes' | 'often' | 'very_often';
  intensity: number; // 0–10
  duration: 'minutes' | 'hours' | 'days' | 'weeks' | 'varies';
  trigger?: string | null;
  response?: string | null;
  coping_strategy?: string | null;
  impact?: string | null;
}

export interface Report {
  [key: string]: unknown;
}

export interface RecommendationItem {
  id: string;
  template_id: string;
  title: string | Record<string, unknown>;
  body: Record<string, unknown> | string;
  status: string;
  rationale: Record<string, unknown>;
}

export interface AssessmentResult {
  session_id: string;
  report_id?: string;
  status?: string;
  dominant?: string;
  summary?: string;
  scores?: Record<string, number>;
  temperament_scores?: Array<Record<string, unknown>>;
  emotion_assessments?: unknown[];
  narrative: string;
  motion: string;
  recommendations: RecommendationItem[];
  narrative_report?: unknown;
  motion_report?: unknown;
  llm_model?: string;
  prompt_version?: string;
  disclaimer?: string;
}

export interface ResultEvent {
  type: 'narrative' | 'motion' | 'recommendations' | 'done' | 'error';
  delta?: string;
  session_id?: string;
  recommendations?: RecommendationItem[];
  message?: string;
}

export interface FeedbackRequest {
  event: 'status_change' | 'check_in' | 'feedback';
  status?: 'suggested' | 'accepted' | 'in_progress' | 'completed' | 'dismissed' | null;
  helpfulness?: number | null; // 1–5
  outcome_rating?: number | null; // 0–10
  note?: string | null;
}

export interface SafetyResource {
  [key: string]: unknown;
}

export interface HistoryEntry {
  [key: string]: unknown;
}

export interface AgentStepRequest {
  session_id: string;
  user_id?: string;
  answer_value?: number | null;
  free_text?: string | null;
  dimension?: string;
}

export interface IngestionRequest {
  title: string;
  collection:
    | 'temperament'
    | 'personality_science'
    | 'emotional_intelligence'
    | 'emotional_conditions'
    | 'assessment_instruments'
    | 'recommendations'
    | 'safety';
  source_type?: string;
  license: string;
  content: string;
  evidence?: EvidenceLevel | null;
  source_url?: string | null;
  topic?: string | null;
}

export interface HTTPValidationError {
  detail: Array<{
    loc: Array<string | number>;
    msg: string;
    type: string;
  }>;
}

export function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function extractErrorDetail(body: unknown): string | undefined {
  if (!body) return undefined;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (typeof body === 'object') {
    const b = body as Record<string, any>;
    if (typeof b.detail === 'string') return b.detail;
    if (Array.isArray(b.detail) && b.detail[0]?.msg) return b.detail[0].msg;
    if (typeof b.message === 'string') return b.message;
    if (typeof b.error === 'string') return b.error;
  }
  return undefined;
}

export class ApiError extends Error {
  public status: number;
  public body?: unknown;
  public rawDetail?: string;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.rawDetail = extractErrorDetail(body);
  }

  get detail(): string | undefined {
    return this.rawDetail || extractErrorDetail(this.body);
  }
}

/* ------------------------------------------------------------------ */
/* Client                                                             */
/* ------------------------------------------------------------------ */

export function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = (API_BASE || '').trim().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

let authToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('agentbleu_token') : null;

/** Set the bearer token used for authenticated requests. */
export function setAuthToken(token: string | null): void {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('agentbleu_token', token);
    } else {
      localStorage.removeItem('agentbleu_token');
    }
  }
}

/** Get the current bearer token. */
export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const url = buildUrl(input);
  const headers: Record<string, string> = {};

  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });
  } catch (err: any) {
    if (err?.name === 'TypeError' || err?.message?.includes('fetch')) {
      throw new Error(
        `Failed to fetch from ${url}. Please ensure the backend server is running and accessible (or check CORS settings).`
      );
    }
    throw err;
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const detail = extractErrorDetail(body);
    const message = detail ? `API error ${res.status}: ${detail}` : `API error ${res.status}`;

    // If unauthorized or credential failure, clear stale token
    if (res.status === 401 || (res.status === 403 && (
      detail?.toLowerCase().includes('token') ||
      detail?.toLowerCase().includes('credential') ||
      detail?.toLowerCase().includes('expired') ||
      detail?.toLowerCase().includes('not authenticated')
    ))) {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('agentbleu_token');
        localStorage.removeItem('agentbleu_user_id');
      }
    }

    throw new ApiError(res.status, message, body);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
    return (await res.blob()) as T;
  }
  return (await res.text()) as unknown as T;
}

/* ------------------------------------------------------------------ */
/* Authentication                                                     */
/* ------------------------------------------------------------------ */

export function register(data: RegisterRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function login(data: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function refresh(data: RefreshRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function authStatus(): Promise<unknown> {
  return request<unknown>('/api/v1/auth/status', { method: 'GET' });
}

/* ------------------------------------------------------------------ */
/* Consent                                                            */
/* ------------------------------------------------------------------ */

export function grantConsent(data: GrantConsentRequest): Promise<unknown> {
  return request<unknown>('/api/v1/consent/grant', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function consentStatus(): Promise<unknown> {
  return request<unknown>('/api/v1/consent/status', { method: 'GET' });
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                          */
/* ------------------------------------------------------------------ */

export function listInstruments(): Promise<unknown> {
  return request<unknown>('/api/v1/catalogue/instruments', { method: 'GET' });
}

export function getScales(): Promise<unknown> {
  return request<unknown>('/api/v1/catalogue/knowledge-pack/scales', {
    method: 'GET',
  });
}

export function getTemperamentCatalog(): Promise<unknown> {
  return request<unknown>('/api/v1/catalogue/knowledge-pack/temperament', {
    method: 'GET',
  });
}

export function getTemperament20Catalog(): Promise<unknown> {
  return request<unknown>('/api/v1/catalogue/knowledge-pack/temperament-20', {
    method: 'GET',
  });
}

export function getTemperament40Catalog(): Promise<unknown> {
  return request<unknown>('/api/v1/catalogue/knowledge-pack/temperament-40', {
    method: 'GET',
  });
}

export function getEqCatalog(): Promise<unknown> {
  return request<unknown>('/api/v1/catalogue/knowledge-pack/emotional-intelligence', {
    method: 'GET',
  });
}

export function getEmotionsCatalog(): Promise<unknown> {
  return request<unknown>('/api/v1/catalogue/knowledge-pack/emotions', {
    method: 'GET',
  });
}

/* ------------------------------------------------------------------ */
/* Assessments                                                        */
/* ------------------------------------------------------------------ */

export function startAssessment(
  data: AssessmentStartRequest,
): Promise<{ session_id?: string; [key: string]: unknown }> {
  return request('/api/v1/assessments/start', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function submitAnswer(
  sessionId: string,
  data: AnswerSubmitRequest,
): Promise<unknown> {
  return request<unknown>(`/api/v1/assessments/${sessionId}/answers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function completeAssessment(sessionId: string): Promise<unknown> {
  return request<unknown>(`/api/v1/assessments/${sessionId}/complete`, {
    method: 'POST',
  });
}

export function getAssessmentProgress(
  sessionId: string,
): Promise<AssessmentProgressResponse> {
  return request<AssessmentProgressResponse>(
    `/api/v1/assessments/${sessionId}/progress`,
    { method: 'GET' },
  );
}

export function resumeAssessment(
  sessionId: string,
): Promise<AssessmentProgressResponse> {
  return request<AssessmentProgressResponse>(
    `/api/v1/assessments/${sessionId}/resume`,
    { method: 'GET' },
  );
}

export function getActiveAssessment(
  userId: string,
): Promise<AssessmentProgressResponse> {
  return request<AssessmentProgressResponse>(
    `/api/v1/assessments/user/${userId}/active`,
    { method: 'GET' },
  );
}

/* ------------------------------------------------------------------ */
/* Questions                                                          */
/* ------------------------------------------------------------------ */

export interface QuestionEvent {
  type: 'question' | 'option' | 'done' | 'complete';
  id?: string;
  question_id?: string;
  text?: string;
  delta?: string;
  options?: unknown[];
  session_id?: string;
  total_questions?: number;
}

/**
 * Stream questions for a session as Server-Sent Events.
 * Yields parsed QuestionEvent objects. Calls onClose when the stream ends.
 */
export function streamQuestions(
  sessionId: string,
  onEvent: (event: QuestionEvent) => void,
  onClose?: () => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(
        buildUrl(`/api/v1/questions/sessions/${sessionId}/stream`),
        {
          headers: {
            Accept: 'text/event-stream, application/x-ndjson',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          signal: controller.signal,
        },
      );

      if (!res.ok || !res.body) {
        onEvent({ type: 'done' });
        onClose?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let currentEventType = 'question';

      const flush = (line: string) => {
        line = line.trim();
        if (!line || line[0] === ':') {
          return;
        }
        if (line.startsWith('event:')) {
          currentEventType = line.slice(6).trim();
          return;
        }
        if (line.startsWith('id:')) {
          return;
        }
        if (line.startsWith('data:')) {
          line = line.slice(5).trim();
        }
        if (line === '[DONE]') {
          onEvent({ type: 'done' });
          return;
        }
        try {
          const parsed = JSON.parse(line);
          const eventType = (currentEventType === 'complete' || currentEventType === 'done')
            ? 'done'
            : (parsed.type || currentEventType || 'question');

          onEvent({
            type: eventType,
            ...parsed,
          } as QuestionEvent);
        } catch {
          // ignore malformed lines
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        lines.forEach(flush);
      }
      if (buf) flush(buf);
      onEvent({ type: 'done' });
      onClose?.();
    } catch {
      onEvent({ type: 'done' });
      onClose?.();
    }
  })();

  return controller;
}

/**
 * Fetch questions (non-streaming) for a session.
 */
export function getQuestions(sessionId: string): Promise<unknown> {
  return request<unknown>(`/api/v1/questions/sessions/${sessionId}`, {
    method: 'GET',
  });
}

/* ------------------------------------------------------------------ */
/* Emotional self-reports                                             */
/* ------------------------------------------------------------------ */

export function createEmotionSelfReport(
  sessionId: string,
  data: EmotionSelfReportRequest,
): Promise<unknown> {
  return request<unknown>(`/api/v1/emotions/sessions/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ------------------------------------------------------------------ */
/* Reports                                                            */
/* ------------------------------------------------------------------ */

export function getReport(reportId: string): Promise<Report> {
  return request<Report>(`/api/v1/reports/${reportId}`, { method: 'GET' });
}

export function getReportPdf(reportId: string): Promise<Blob> {
  return request<Blob>(`/api/v1/reports/${reportId}/pdf`, { method: 'GET' });
}

/* ------------------------------------------------------------------ */
/* Recommendations                                                    */
/* ------------------------------------------------------------------ */

export function generateRecommendations(sessionId: string): Promise<unknown> {
  return request<unknown>(
    `/api/v1/recommendations/sessions/${sessionId}/generate`,
    { method: 'POST' },
  );
}

export function getSessionRecommendations(sessionId: string): Promise<unknown> {
  return request<unknown>(`/api/v1/recommendations/sessions/${sessionId}`, {
    method: 'GET',
  });
}

export function submitRecommendationFeedback(
  recommendationId: string,
  data: FeedbackRequest,
): Promise<unknown> {
  return request<unknown>(
    `/api/v1/recommendations/${recommendationId}/feedback`,
    { method: 'POST', body: JSON.stringify(data) },
  );
}

/* ------------------------------------------------------------------ */
/* Safety                                                             */
/* ------------------------------------------------------------------ */

export function getSafetyResources(): Promise<SafetyResource[]> {
  return request<SafetyResource[]>('/api/v1/safety/resources', {
    method: 'GET',
  });
}

export function resumeSession(sessionId: string): Promise<unknown> {
  return request<unknown>(
    `/api/v1/safety/sessions/${sessionId}/resume`,
    { method: 'POST' },
  );
}

/* ------------------------------------------------------------------ */
/* History                                                            */
/* ------------------------------------------------------------------ */

export function getUserHistory(): Promise<HistoryEntry[]> {
  return request<HistoryEntry[]>('/api/v1/history/my-history', {
    method: 'GET',
  });
}

export function compareSessions(sessionId1: string, sessionId2: string): Promise<unknown> {
  return request<unknown>(
    `/api/v1/history/compare/${sessionId1}/${sessionId2}`,
    { method: 'GET' },
  );
}

/* ------------------------------------------------------------------ */
/* Agent orchestration                                                */
/* ------------------------------------------------------------------ */

export interface NarrativeSampleRequest {
  user_id?: string;
  scores?: Array<Record<string, unknown>> | null;
}

export function generateSampleNarrative(data?: NarrativeSampleRequest): Promise<unknown> {
  return request<unknown>('/api/v1/agents/narrative/sample', {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function runAgentStep(data: AgentStepRequest): Promise<unknown> {
  return request<unknown>('/api/v1/agents/step', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function streamAgentEvents(
  sessionId: string,
  onEvent: (event: unknown) => void,
  onClose?: () => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(
        buildUrl(`/api/v1/agents/stream/${sessionId}`),
        {
          headers: {
            Accept: 'text/event-stream, application/x-ndjson',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          signal: controller.signal,
        },
      );

      if (!res.ok || !res.body) {
        onClose?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      const flush = (line: string) => {
        line = line.trim();
        if (!line || line[0] === ':' || line.startsWith('event:') || line.startsWith('id:')) {
          return;
        }
        if (line.startsWith('data:')) {
          line = line.slice(5).trim();
        }
        if (line === '[DONE]') return;
        try {
          onEvent(JSON.parse(line));
        } catch {
          // ignore malformed lines
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        lines.forEach(flush);
      }
      onClose?.();
    } catch {
      onClose?.();
    }
  })();

  return controller;
}

/* ------------------------------------------------------------------ */
/* Knowledge base / RAG                                               */
/* ------------------------------------------------------------------ */

export function ingestTextDocument(data: IngestionRequest): Promise<unknown> {
  return request<unknown>('/api/v1/knowledge/ingest', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function triggerCorpusIngestion(forceReload = false): Promise<unknown> {
  return request<unknown>(
    `/api/v1/knowledge/corpus/ingest?force_reload=${forceReload}`,
    { method: 'POST' },
  );
}

export interface SearchKnowledgeParams {
  query: string;
  collection?: string | null;
  topic?: string | null;
  subscale?: string | null;
  concept?: string | null;
  limit?: number;
}

export function searchKnowledge(params: SearchKnowledgeParams): Promise<unknown> {
  const qs = new URLSearchParams();
  qs.set('query', params.query);
  if (params.collection) qs.set('collection', params.collection);
  if (params.topic) qs.set('topic', params.topic);
  if (params.subscale) qs.set('subscale', params.subscale);
  if (params.concept) qs.set('concept', params.concept);
  if (params.limit !== undefined) qs.set('limit', String(params.limit));

  return request<unknown>(`/api/v1/knowledge/search?${qs.toString()}`, {
    method: 'GET',
  });
}

/* ------------------------------------------------------------------ */
/* Privacy / NDPR                                                     */
/* ------------------------------------------------------------------ */

export function exportMyData(): Promise<unknown> {
  return request<unknown>('/api/v1/privacy/export', { method: 'GET' });
}

export function deleteMyAccount(): Promise<unknown> {
  return request<unknown>('/api/v1/privacy/delete-account', {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------------ */
/* Misc                                                               */
/* ------------------------------------------------------------------ */

export function health(): Promise<unknown> {
  return request<unknown>('/health', { method: 'GET' });
}

/* ------------------------------------------------------------------ */
/* LLM-powered assessment results                                     */
/* ------------------------------------------------------------------ */

/**
 * Generate (or regenerate) the aggregated LLM result for a completed
 * session: narrative + trait motion + recommendations.
 */
export function fetchAssessmentResult(sessionId: string): Promise<AssessmentResult> {
  return request<AssessmentResult>(
    `/api/v1/results/sessions/${sessionId}/generate`,
    { method: 'POST' },
  );
}

/**
 * Stream the LLM-generated result for a completed session as Server-Sent
 * Events. Emits ``narrative`` and ``motion`` events with delta text as the
 * LLM produces it, a ``recommendations`` event with the full recommendation
 * payload, and a final ``done`` event.
 */
export function streamAssessmentResult(
  sessionId: string,
  onEvent: (event: ResultEvent) => void,
  onClose?: () => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/results/sessions/${sessionId}/stream`,
        {
          headers: {
            Accept: 'text/event-stream',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          signal: controller.signal,
        },
      );

      if (!res.ok || !res.body) {
        onEvent({ type: 'error', message: `Result stream failed (${res.status})` });
        onEvent({ type: 'done' });
        onClose?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let currentEventType = 'done';

      const flush = (line: string) => {
        line = line.trim();
        if (!line || line[0] === ':') {
          return;
        }
        if (line.startsWith('event:')) {
          currentEventType = line.slice(6).trim();
          return;
        }
        if (line.startsWith('id:')) {
          return;
        }
        if (line.startsWith('data:')) {
          line = line.slice(5).trim();
        }
        if (!line) {
          return;
        }
        try {
          const parsed = JSON.parse(line);
          onEvent({
            type: (currentEventType as ResultEvent['type']) || 'done',
            ...parsed,
          } as ResultEvent);
        } catch {
          // ignore malformed lines
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        lines.forEach(flush);
      }
      if (buf) flush(buf);
      onEvent({ type: 'done' });
      onClose?.();
    } catch {
      onEvent({ type: 'done' });
      onClose?.();
    }
  })();

  return controller;
}
