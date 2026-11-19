import { useState, useRef, useEffect } from 'react';
import { runAgentStep, type RecommendationItem } from '../api';
import logo from '../assets/logo.png';

export interface TemperamentResult {
  dominant: string;
  summary?: string;
  scores?: Record<string, number>;
  narrative?: string;
  motion?: string;
  recommendations?: RecommendationItem[];
  llm_model?: string;
  prompt_version?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface ClarificationAgentProps {
  sessionId: string | null;
  result: TemperamentResult;
  reportId?: string | null;
}

export default function ClarificationAgent({
  sessionId,
  result,
  reportId,
}: ClarificationAgentProps) {
  const dominant = result.dominant || 'Sanguine';
  const scores = result.scores || {};
  const scoresSummary = Object.entries(scores)
    .map(([k, v]) => `${k}: ${v}%`)
    .join(', ');

  const initialGreeting = `Hello! I'm Agent Bleu, your AI temperament & psychometric assistant.

I've analyzed your assessment:
• **Dominant Temperament:** ${dominant}
• **Scores:** ${scoresSummary || 'Calculated from your responses'}

I'm here to help you unpack what this means. What would you like to explore or clarify about your results?`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-init',
      sender: 'agent',
      text: initialGreeting,
      timestamp: formatTime(new Date()),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    { label: '✨ What are my core strengths?', prompt: 'What are the main strengths and superpowers of my dominant temperament?' },
    { label: '🔍 What blind spots should I watch for?', prompt: 'What potential blind spots or challenges should someone with my scores be aware of?' },
    { label: '🌊 How does my trait motion work?', prompt: 'Can you explain how my trait motion works and how my tendencies shift under stress or focus?' },
    { label: '🤝 How can I communicate better?', prompt: 'How does my temperament interact with others, and how can I communicate more effectively?' },
    { label: '💼 Ideal work & productivity style', prompt: 'What work environment, productivity habits, or leadership style best fit my temperament profile?' },
  ];

  const handleSendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let agentReplyText = '';

      // 1. Attempt backend orchestration call if session ID exists
      if (sessionId) {
        try {
          const res = (await runAgentStep({
            session_id: sessionId,
            free_text: trimmed,
            dimension: dominant,
          })) as any;

          if (res) {
            agentReplyText =
              res.reply ||
              res.response ||
              res.message ||
              res.text ||
              res.output ||
              (res.narrative ? res.narrative : '') ||
              (typeof res === 'string' ? res : '');
          }
        } catch (apiErr) {
          console.info('Backend agent step unavailable, utilizing local AI clarification engine:', apiErr);
        }
      }

      // 2. If backend didn't supply text, use the comprehensive context-aware clarification engine
      if (!agentReplyText) {
        agentReplyText = generateLocalClarification(trimmed, result, reportId);
      }

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: agentReplyText,
        timestamp: formatTime(new Date()),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-err-${Date.now()}`,
          sender: 'agent',
          text: `I encountered an issue processing that question. Please try asking again or rephrase your query.`,
          timestamp: formatTime(new Date()),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(input);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'agent',
        text: `Chat reset. What would you like to clarify about your **${dominant}** profile?`,
        timestamp: formatTime(new Date()),
      },
    ]);
  };

  return (
    <section className="clarification-agent-section" aria-label="AI Clarification Agent">
      <div className="agent-container">
        {/* Agent Header */}
        <div className="agent-header">
          <div className="agent-header-left">
            <div className="agent-avatar-wrap">
              <img src={logo} alt="Agent Bleu Avatar" className="agent-avatar" />
              <span className="agent-status-indicator" title="Agent Online" />
            </div>
            <div>
              <h3 className="agent-title">Agent Bleu Clarification Assistant</h3>
              <p className="agent-subtitle">
                Ask follow-up questions to understand your scores, traits, and recommendations
              </p>
            </div>
          </div>
          <div className="agent-header-right">
            <span className="agent-badge">AI Assistant</span>
            <button
              type="button"
              className="agent-btn-clear"
              onClick={handleClearChat}
              title="Reset conversation"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Quick Suggested Prompts */}
        <div className="agent-suggestions">
          <span className="agent-suggestions-label">Suggested prompts:</span>
          <div className="agent-pills-wrap">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="agent-pill"
                onClick={() => handleSendPrompt(p.prompt)}
                disabled={loading}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat History Window */}
        <div className="agent-chat-window" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`agent-msg-row ${m.sender}`}>
              {m.sender === 'agent' && (
                <div className="agent-msg-icon" aria-hidden="true">
                  <img src={logo} alt="" />
                </div>
              )}
              <div className="agent-msg-bubble">
                <div className="agent-msg-meta">
                  <span className="agent-msg-author">
                    {m.sender === 'agent' ? 'Agent Bleu' : 'You'}
                  </span>
                  <span className="agent-msg-time">{m.timestamp}</span>
                </div>
                <div className="agent-msg-content">
                  {renderFormattedText(m.text)}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="agent-msg-row agent">
              <div className="agent-msg-icon" aria-hidden="true">
                <img src={logo} alt="" />
              </div>
              <div className="agent-msg-bubble thinking">
                <div className="agent-typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="agent-typing-text">Agent Bleu is formulating an answer…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          className="agent-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(input);
          }}
        >
          <div className="agent-input-box">
            <textarea
              className="agent-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask a question (e.g. "What does my ${dominant} score say about my communication?")…`}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn agent-submit-btn"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <span>Send</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div className="agent-footer-note">
            <span>Press Enter to send · Shift+Enter for newline</span>
            <span>Verified Non-Diagnostic · Context-Aware Psychoeducational Assistant</span>
          </div>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Helper: Format text with basic markdown (bold, bullets, paragraphs) */
/* ------------------------------------------------------------------ */
function renderFormattedText(text: string) {
  const paragraphs = text.split('\n\n');

  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    const isBulletList = lines.every((line) => line.trim().startsWith('•') || line.trim().startsWith('-'));

    if (isBulletList) {
      return (
        <ul key={pIdx} className="agent-msg-list">
          {lines.map((line, lIdx) => {
            const cleanLine = line.replace(/^[•\-]\s*/, '');
            return <li key={lIdx}>{formatInlineMarkdown(cleanLine)}</li>;
          })}
        </ul>
      );
    }

    return (
      <p key={pIdx}>
        {lines.map((line, lIdx) => (
          <span key={lIdx}>
            {formatInlineMarkdown(line)}
            {lIdx < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

function formatInlineMarkdown(text: string) {
  // Simple regex parser for **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/* Knowledge-rich Context-Aware Clarification Engine (Fallback/Local) */
/* ------------------------------------------------------------------ */
function generateLocalClarification(
  query: string,
  result: TemperamentResult,
  reportId?: string | null,
): string {
  const q = query.toLowerCase();
  const dominant = result.dominant || 'Sanguine';
  const scores = result.scores || {};
  const scoresSummary = Object.entries(scores)
    .map(([k, v]) => `${k}: ${v}%`)
    .join(', ');
  const recs = result.recommendations || [];

  // Ranked order of dimensions
  const sortedDims = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const secondary = sortedDims.find(([dim]) => dim !== dominant)?.[0] || 'Phlegmatic';
  const secondaryScore = scores[secondary] ?? 50;
  const dominantScore = scores[dominant] ?? 70;

  // 1. STRENGTHS
  if (q.includes('strength') || q.includes('superpower') || q.includes('good at') || q.includes('excel') || q.includes('best at')) {
    const strengthsMap: Record<string, string> = {
      Sanguine: `As a **Sanguine** dominant (${dominantScore}%), your core strengths lie in:
• **Infectious enthusiasm & interpersonal warmth:** You naturally energize groups and break the ice effortlessly.
• **Adaptability:** You adjust quickly to shifting circumstances and view disruption as a new opportunity.
• **Relational empathy:** You pick up on social atmospheres rapidly and build trust through open, optimistic communication.
• **Creative idea generation:** You connect diverse concepts and inspire collaborators to action.`,
      Choleric: `As a **Choleric** dominant (${dominantScore}%), your core strengths lie in:
• **Decisive leadership:** You make confident calls even amidst ambiguity and cut through stalling.
• **Goal-driven execution:** You maintain high momentum, thrive on overcoming obstacles, and rally teams toward tangible targets.
• **Direct and transparent clarity:** You value efficiency, set clear expectations, and solve problems proactively.
• **Resilience under pressure:** High stakes motivate you rather than paralyze you.`,
      Melancholic: `As a **Melancholic** dominant (${dominantScore}%), your core strengths lie in:
• **Analytical precision & depth:** You notice subtle nuances, evaluate risks thoroughly, and hold exceptional standards.
• **Systematic problem solving:** You design robust, sustainable solutions rather than superficial band-aids.
• **Deep loyalty and integrity:** You take commitments deeply to heart and cultivate trustworthy, meaningful relationships.
• **Artistic & intellectual craftsmanship:** You produce work of remarkable craft and thoughtful structure.`,
      Phlegmatic: `As a **Phlegmatic** dominant (${dominantScore}%), your core strengths lie in:
• **Composure and grounding presence:** You remain calm and steady when chaos or emotional turbulence surrounds you.
• **Natural mediation & active listening:** You hear all perspectives without prejudice, bringing harmony to contentious dynamics.
• **Consistency and reliability:** People know they can depend on your word and steady follow-through.
• **Patient endurance:** You work steadily over long horizons without burning out or causing unnecessary friction.`,
    };

    return (
      (strengthsMap[dominant] || strengthsMap.Sanguine) +
      `\n\nYour secondary trait, **${secondary}** (${secondaryScore}%), acts as a complementary balance, giving your primary ${dominant} energy additional depth and flexibility.`
    );
  }

  // 2. BLIND SPOTS & CHALLENGES
  if (
    q.includes('blind spot') ||
    q.includes('weakness') ||
    q.includes('challenge') ||
    q.includes('watch out') ||
    q.includes('pitfall') ||
    q.includes('downside')
  ) {
    const blindspotsMap: Record<string, string> = {
      Sanguine: `Every temperament has natural friction points. For a **Sanguine** profile:
• **Overcommitting:** Your excitement leads to saying "yes" to too many projects before finishing existing ones.
• **Detail fatigue:** You may lose interest once the initial creative novelty fades, finding repetitive administration draining.
• **Sensitivity to validation:** Because social connection is vital, perceived social friction can momentarily derail your focus.

**Growth tip:** Pair your spontaneous energy with a simple "rule of 3" daily checklist to protect follow-through.`,
      Choleric: `Every temperament has natural friction points. For a **Choleric** profile:
• **Impatience with slower rhythms:** You may feel frustrated when others need time to deliberate or process feelings.
• **Overriding input:** In the drive to reach the finish line, you might make decisions without fully consulting team members.
• **Rest resistance:** You often equate resting with inactivity, putting yourself at risk of physical or emotional burnout.

**Growth tip:** Build in a 10-second pause before responding to delays, and intentionally ask colleagues for their perspectives before deciding.`,
      Melancholic: `Every temperament has natural friction points. For a **Melancholic** profile:
• **Analysis paralysis:** Wanting things to be perfect can delay releasing work or starting a new phase.
• **Internalized rumination:** You may replay minor criticisms or perceived mistakes repeatedly in your head.
• **Reluctance to share unfinished work:** Holding off until an idea is flawless can isolate you from valuable early feedback.

**Growth tip:** Practice the "80% is good enough" rule for daily tasks to protect your mental energy and maintain momentum.`,
      Phlegmatic: `Every temperament has natural friction points. For a **Phlegmatic** profile:
• **Conflict avoidance:** You may withhold constructive feedback or suppress personal desires to keep the peace.
• **Hesitation to initiate change:** Even when a situation is suboptimal, the familiarity of the status quo may feel safer than change.
• **Passive resistance:** When pressured unexpectedly, you might shut down or procrastinate rather than vocally pushing back.

**Growth tip:** Practice speaking your preference first in low-stakes decisions (e.g. choosing a venue or project order) to build vocal momentum.`,
    };

    return blindspotsMap[dominant] || blindspotsMap.Sanguine;
  }

  // 3. TRAIT MOTION & DYNAMICS
  if (q.includes('motion') || q.includes('flow') || q.includes('shift') || q.includes('dynamic') || q.includes('change')) {
    return `**Trait Motion** reflects how your personality tendencies interact and shift depending on your environment, stress levels, and cognitive demands:

• **Baseline State:** In comfortable, everyday situations, your dominant **${dominant}** (${dominantScore}%) drives how you perceive your options and respond to people.
• **Stress or High Stakes:** When pressure mounts, your secondary trait—**${secondary}** (${secondaryScore}%)—often kicks in as a coping mechanism. For instance, an analytical or quiet mode may activate to protect your bandwidth.
• **Recovery State:** After intense effort, you naturally gravitate toward activities that recharge your dominant battery. For example, ${
      dominant === 'Sanguine'
        ? 'connecting socially or exploring creative hobbies'
        : dominant === 'Choleric'
        ? 'stepping into control or productive personal projects'
        : dominant === 'Melancholic'
        ? 'quiet contemplation, reading, or structured solitude'
        : 'restful routines, nature, and low-stimulation spaces'
    }.

You are not locked into a rigid box—your scores represent fluid behavioral preferences that you can consciously adapt!`;
  }

  // 4. COMMUNICATION & RELATIONSHIPS
  if (
    q.includes('communicat') ||
    q.includes('relationship') ||
    q.includes('people') ||
    q.includes('talk') ||
    q.includes('listen') ||
    q.includes('interact')
  ) {
    return `Here is how to optimize communication based on your **${dominant}** temperament:

• **With Cholerics:** Be concise, highlight results and bottom-line outcomes, and avoid unnecessary preamble.
• **With Sanguines:** Acknowledge their energy, engage in warm conversation, and brainstorm collaboratively.
• **With Melancholics:** Provide thorough context, respect their need for precision, and avoid rushing their review process.
• **With Phlegmatics:** Speak in a calm, non-confrontational manner, give them space to share their thoughts, and value their steadiness.

**Key insight for you:** Because you score highest in **${dominant}**, your natural communication style is ${
      dominant === 'Sanguine'
        ? 'vivid and spontaneous. Be mindful to pause and ensure quieter peers have space to speak.'
        : dominant === 'Choleric'
        ? 'direct and outcome-focused. Softening the opening with personal check-ins enhances rapport.'
        : dominant === 'Melancholic'
        ? 'detailed and thoughtful. Summarizing high-level points first will keep impatient colleagues engaged.'
        : 'gentle and accommodating. Remember that voicing your boundaries directly is a gift to relationships, not a disruption.'
    }`;
  }

  // 5. WORK & CAREER / LEADERSHIP
  if (
    q.includes('work') ||
    q.includes('career') ||
    q.includes('job') ||
    q.includes('leader') ||
    q.includes('productiv') ||
    q.includes('profession')
  ) {
    const careerInsights: Record<string, string> = {
      Sanguine: `For a **Sanguine** profile, productivity flourishes when work includes variety and human connection:
• **Optimal environment:** Dynamic, cross-functional teams, brainstorming, client-facing roles, storytelling, and innovation labs.
• **Productivity strategy:** Work in short 25-minute sprints (Pomodoro) and switch between different task types to sustain dopamine and focus.
• **Leadership style:** Inspiring, optimistic, and relational—you motivate people through shared vision and celebrating milestones.`,
      Choleric: `For a **Choleric** profile, productivity flourishes when there are clear goals and autonomy:
• **Optimal environment:** Fast-paced initiatives, milestone-driven projects, strategic direction, operations, and leadership roles.
• **Productivity strategy:** Time-block your day around your top 2 non-negotiable outcomes. Delegate administrative steps early.
• **Leadership style:** Decisive, strategic, and empowering—you set high standards and challenge your team to exceed expectations.`,
      Melancholic: `For a **Melancholic** profile, productivity flourishes with depth and focus:
• **Optimal environment:** Deep work blocks, specialized analysis, architecture, research, writing, and systemic quality assurance.
• **Productivity strategy:** Protect dedicated "do not disturb" focus windows. Use structured systems (Notion, Obsidian, bullet journals).
• **Leadership style:** Principled, meticulous, and thoughtful—you lead by example, thorough preparation, and cultivating excellence.`,
      Phlegmatic: `For a **Phlegmatic** profile, productivity flourishes in harmonious, stable workflows:
• **Optimal environment:** Collaborative, supportive cultures, long-term project stewardship, mediation, user support, and steady operations.
• **Productivity strategy:** Establish consistent daily routines and tackle priority tasks early before interruptions accumulate.
• **Leadership style:** Servant-leadership, empathetic, and calming—you create a psychologically safe space where teams thrive over the long haul.`,
    };

    return careerInsights[dominant] || careerInsights.Sanguine;
  }

  // 6. STRESS & EMOTION MANAGEMENT
  if (q.includes('stress') || q.includes('burnout') || q.includes('anxiety') || q.includes('relax') || q.includes('cope') || q.includes('tired')) {
    return `Managing stress with your temperament profile (**${dominant}** with secondary **${secondary}**):

• **Your Trigger:** ${
      dominant === 'Sanguine'
        ? 'Isolation, monotony, strict micromanagement, or feeling dismissed by peers.'
        : dominant === 'Choleric'
        ? 'Loss of control, perceived incompetence in processes, or forced delays.'
        : dominant === 'Melancholic'
        ? 'Disorganized environments, sudden plan overhauls, or criticism of your work.'
        : 'High interpersonal conflict, aggressive demands, or lack of time to decompress.'
    }
• **How You Tend to React:** ${
      dominant === 'Sanguine'
        ? 'You may scatter your focus, seek distractions, or become outwardly reactive.'
        : dominant === 'Choleric'
        ? 'You may double down on control, work longer hours, and become blunt.'
        : dominant === 'Melancholic'
        ? 'You may withdraw, replay mistakes, and struggle with perfectionism.'
        : 'You may shut down, withdraw into silence, or procrastinate to avoid confrontation.'
    }
• **Recommended Practice:** ${
      dominant === 'Sanguine'
        ? 'Step away from screens, talk with a trusted friend, and take a 10-minute grounding walk.'
        : dominant === 'Choleric'
        ? 'Engage in intense physical exercise (running, lifting) followed by intentional unplugged downtime.'
        : dominant === 'Melancholic'
        ? 'Brain-dump your thoughts onto paper to stop the internal loop, and practice self-compassion.'
        : 'Set a gentle boundary, take slow diaphragmatic breaths, and give yourself permission to step back.'
    }`;
  }

  // 7. RECOMMENDATIONS EXPLANATION
  if (q.includes('recommendation') || q.includes('action') || q.includes('next step') || q.includes('report') || q.includes('pdf')) {
    if (recs.length > 0) {
      const topRec = recs[0];
      const title = typeof topRec.title === 'string' ? topRec.title : 'Personalized Practice';
      const body = typeof topRec.body === 'string' ? topRec.body : (topRec.body as any)?.what || 'Focus on small daily adjustments';

      return `Your assessment generated personalized psychoeducational recommendations:

• **Key Suggestion:** **${title}**
• **What to try:** ${body}
• **Application:** Start with one small, low-friction habit (e.g. 5 minutes a day) rather than attempting a total overhaul.

You can also download your full **PDF Report** ${reportId ? `(ID: ${reportId}) ` : ''}above to review the complete scientific methodology and score metrics!`;
    }

    return `Your recommendations are customized to your scores across the four dimensions (${scoresSummary}). You can review them in the Recommendations section above or ask me about any specific trait you want to cultivate!`;
  }

  // 8. SCORES & MEANING
  if (q.includes('score') || q.includes('percentage') || q.includes('calculate') || q.includes('number')) {
    return `Here is a breakdown of your normalized temperament scores:

${sortedDims.map(([dim, val]) => `• **${dim}:** ${val}% ${dim === dominant ? '(Dominant tendency)' : ''}`).join('\n')}

**How to interpret this:**
Temperament is not an all-or-nothing category; you possess traits from each dimension.
• Your dominant trait (**${dominant}** at ${dominantScore}%) represents your most instinctive, automatic mode of operation.
• Your secondary trait (**${secondary}** at ${secondaryScore}%) provides balancing capabilities.
• Lower scores indicate behaviors that require more conscious cognitive effort or energy for you to perform.`;
  }

  // DEFAULT / GENERAL RESPONSE
  return `Regarding your question about **"${query}"**:

As someone with a dominant **${dominant}** temperament (${dominantScore}%) and secondary **${secondary}** tendencies (${secondaryScore}%):

1. **Perspective:** Your responses indicate a profile that values ${
    dominant === 'Sanguine'
      ? 'human connection, vibrant expression, and collaborative synergy.'
      : dominant === 'Choleric'
      ? 'purposeful action, high standards of achievement, and decisive momentum.'
      : dominant === 'Melancholic'
      ? 'depth, integrity of thought, precision, and meaningful reflection.'
      : 'harmony, calm stability, patient consistency, and empathetic balance.'
  }

2. **Integration:** When considering "${query}", remember to honor your core ${dominant} strengths while keeping an eye on your secondary ${secondary} traits for balance.

3. **Actionable takeaway:** Focus on self-awareness rather than self-judgment. Your personality is a dynamic toolkit that you can flex intentionally.

Is there a specific situation (such as at work, with family, or in high-stress moments) where you would like more tailored strategies?`;
}
