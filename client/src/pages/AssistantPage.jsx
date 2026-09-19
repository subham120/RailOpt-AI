/**
 * AssistantPage.jsx — RailOpt AI Intelligent Maintenance & Operations Advisor.
 * Features:
 *  - Multi-turn conversational memory with live DB RAG grounding
 *  - Rich Markdown & Table rendering with UX4G Indian Railways styling
 *  - Interactive clickable task pills ([TMS-101], [SMMS-204])
 *  - Speech-to-Text Voice Input (Web Speech API)
 *  - One-click copy, quick-action suggestion pills, and shift handover export
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { assistantAPI, taskAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ZONAL_RAILWAYS } from '../utils/constants';
import {
  FiSend,
  FiZap,
  FiRefreshCw,
  FiDatabase,
  FiCopy,
  FiCheck,
  FiMic,
  FiMicOff,
  FiDownload,
  FiExternalLink,
  FiX,
  FiAlertCircle,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiActivity,
  FiLayers,
  FiGlobe,
} from 'react-icons/fi';
import { MdOutlineSmartToy } from 'react-icons/md';

// ─── Interactive Markdown & Task Token Parser ──────────────────
function FormattedContent({ text, onTaskClick }) {
  if (!text) return null;

  // Clean raw LaTeX formatting from LLM (e.g. $\text{00:30} - \text{04:30 AM}$)
  const sanitizedText = text
    .replace(/\$\\text\{([^}]+)\}\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\$([0-9: \-–APMapm.]+)\$/g, '$1')
    .replace(/\+\+([A-Za-z0-9_]+)?$/, '')
    .replace(/\*\*([A-Za-z0-9_]+)?$/, '$1');

  const renderInline = (str, keyPrefix) => {
    if (!str) return null;

    // Matches:
    // Matches:
    // 1. Backticked code spans: `...`
    // 2. Bold text: **...**
    // 3. Italic text: *...*
    // 4. Interactive entity IDs: TMS-xxx, SMMS-xxx, TDMS-xxx, TASK-xxx, SCHED-xxx, Corridor codes, Trains
    const TOKEN_REGEX = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\b(?:TMS-\d+|SMMS-\d+|TDMS-\d+|TASK-[A-Za-z0-9]+|SCHED-[A-Za-z0-9]+|NDLS-GZB|GZB-CNB|CNB-ALD|ALD-MGS|DDN-HW|HW-RK|NDLS-NZM|NZM-MTJ|MTJ-AGC|LKO-BSB|AMB-CDG|DLI-RWL|CNB-LKO|CNB-PRYJ|MGS-DDU|DLI-UMB|UMB-LDH|BE-LKO|GZB-MB|MB-BE|NZM-AGC)\b|Train\s+\d{5})/g;

    const parts = [];
    let lastIdx = 0;
    let match;

    const isCorridor = (s) => /^(?:NDLS-GZB|GZB-CNB|CNB-ALD|ALD-MGS|DDN-HW|HW-RK|NDLS-NZM|NZM-MTJ|MTJ-AGC|LKO-BSB|AMB-CDG|DLI-RWL|CNB-LKO|CNB-PRYJ|MGS-DDU|DLI-UMB|UMB-LDH|BE-LKO|GZB-MB|MB-BE|NZM-AGC)$/.test(s);
    const isTask = (s) => /^(?:TMS-\d+|SMMS-\d+|TDMS-\d+|TASK-[A-Za-z0-9]+)$/.test(s);
    const isSchedule = (s) => /^SCHED-[A-Za-z0-9]+$/.test(s);
    const isTrain = (s) => /^Train\s+\d{5}$/.test(s);

    while ((match = TOKEN_REGEX.exec(str)) !== null) {
      if (match.index > lastIdx) {
        parts.push(str.slice(lastIdx, match.index));
      }

      const raw = match[0];
      const matchKey = `${keyPrefix}-m-${match.index}`;

      // 1. Backticked code span
      if (raw.startsWith('`') && raw.endsWith('`')) {
        const inner = raw.slice(1, -1);
        if (isTask(inner)) {
          parts.push(renderPill(inner, 'task', matchKey));
        } else if (isSchedule(inner)) {
          parts.push(renderPill(inner, 'schedule', matchKey));
        } else if (isCorridor(inner)) {
          parts.push(renderPill(inner, 'corridor', matchKey));
        } else if (isTrain(inner)) {
          parts.push(renderPill(inner, 'train', matchKey));
        } else {
          parts.push(
            <code
              key={matchKey}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#003366',
                fontWeight: '600',
                fontFamily: 'monospace',
              }}
            >
              {inner}
            </code>
          );
        }
      }
      // 2. Bold text
      else if (raw.startsWith('**') && raw.endsWith('**')) {
        const inner = raw.slice(2, -2);
        parts.push(
          <strong key={matchKey} style={{ color: '#0F172A', fontWeight: '700' }}>
            {renderInline(inner, `${matchKey}-b`)}
          </strong>
        );
      }
      // 3. Italic text
      else if (raw.startsWith('*') && raw.endsWith('*')) {
        const inner = raw.slice(1, -1);
        parts.push(
          <em key={matchKey} style={{ color: '#334155' }}>
            {renderInline(inner, `${matchKey}-i`)}
          </em>
        );
      }
      // 4. Standalone entity pills
      else if (isTask(raw)) {
        parts.push(renderPill(raw, 'task', matchKey));
      } else if (isSchedule(raw)) {
        parts.push(renderPill(raw, 'schedule', matchKey));
      } else if (isCorridor(raw)) {
        parts.push(renderPill(raw, 'corridor', matchKey));
      } else if (isTrain(raw)) {
        parts.push(renderPill(raw, 'train', matchKey));
      } else {
        parts.push(raw);
      }

      lastIdx = TOKEN_REGEX.lastIndex;
    }

    if (lastIdx < str.length) {
      parts.push(str.slice(lastIdx));
    }

    return parts;
  };

  const renderPill = (token, type, key) => {
    let border = '#93C5FD';
    let bg = '#EFF6FF';
    let color = '#1D4ED8';
    let title = 'Click to inspect task & navigate to details';

    if (type === 'schedule') {
      border = '#C7D2FE';
      bg = '#EEF2FF';
      color = '#4338CA';
      title = `Click to inspect schedule ${token} in Block Schedules`;
    } else if (type === 'corridor') {
      border = '#FDBA74';
      bg = '#FFF7ED';
      color = '#C2410C';
      title = `Click to view corridor ${token} in Block Schedules`;
    } else if (type === 'train') {
      border = '#86EFAC';
      bg = '#F0FDF4';
      color = '#15803D';
      title = `Click to check train conflict & schedule for ${token}`;
    }

    return (
      <button
        key={key}
        onClick={() => onTaskClick?.(token, type)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          margin: '0 3px',
          borderRadius: '5px',
          fontSize: '0.88em',
          fontWeight: '700',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          cursor: 'pointer',
          border: `1px solid ${border}`,
          background: bg,
          color: color,
          verticalAlign: 'middle',
          lineHeight: '1.35',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
        title={title}
      >
        <span>{token}</span>
        <FiExternalLink style={{ fontSize: '0.85em', opacity: 0.8 }} />
      </button>
    );
  };

  const lines = sanitizedText.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      const [headers, ...rows] = tableRows;
      elements.push(
        <div key={key} style={{ overflowX: 'auto', margin: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <thead>
              <tr style={{ background: '#003366', color: '#FFFFFF' }}>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: '700', fontSize: '12px', letterSpacing: '0.02em' }}>
                    {renderInline(h, `th-${key}-${hIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? '#F8FAFC' : '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
                  {r.map((c, cIdx) => (
                    <td key={cIdx} style={{ padding: '9px 12px', color: '#334155' }}>
                      {renderInline(c, `td-${key}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      // Skip separator rows like |--|:---|--:|
      if (!cells.every(c => c.match(/^:?-+:?$/))) {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(`table-${idx}`);
    }

    // Horizontal Rule (--- or *** or ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${idx}`} style={{ border: 'none', borderTop: '1px solid #CBD5E1', margin: '14px 0' }} />
      );
      return;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${idx}`} style={{ fontSize: '14px', fontWeight: '700', color: '#003366', margin: '12px 0 4px' }}>
          {renderInline(trimmed.slice(5), `h4-${idx}`)}
        </h4>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${idx}`} style={{ fontSize: '15px', fontWeight: '700', color: '#003366', margin: '14px 0 6px' }}>
          {renderInline(trimmed.slice(4), `h3-${idx}`)}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${idx}`} style={{ fontSize: '16px', fontWeight: '800', color: '#003366', margin: '16px 0 8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
          {renderInline(trimmed.slice(3), `h2-${idx}`)}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${idx}`} style={{ fontSize: '18px', fontWeight: '800', color: '#003366', margin: '18px 0 8px' }}>
          {renderInline(trimmed.slice(2), `h1-${idx}`)}
        </h1>
      );
    }
    // Blockquote
    else if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={`quote-${idx}`} style={{ borderLeft: '3px solid #003366', background: '#F8FAFC', padding: '6px 14px', margin: '8px 0', borderRadius: '0 6px 6px 0', fontStyle: 'italic', color: '#475569', fontSize: '13px' }}>
          {renderInline(trimmed.slice(2), `quote-${idx}`)}
        </div>
      );
    }
    // Numbered lists: 1. or 2.
    else if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
      const num = match ? match[1] : '•';
      const content = match ? match[2] : trimmed;
      elements.push(
        <div key={`ol-${idx}`} style={{ display: 'flex', gap: '8px', margin: '6px 0', alignItems: 'flex-start', color: '#1E293B' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '22px', height: '22px', borderRadius: '50%',
            background: '#003366', color: '#FFFFFF', fontSize: '11px', fontWeight: '700',
            flexShrink: 0, marginTop: '2px',
          }}>
            {num}
          </span>
          <div style={{ flex: 1, paddingTop: '1px' }}>{renderInline(content, `ol-${idx}`)}</div>
        </div>
      );
    }
    // Bullet lists: * or -
    else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <div key={`li-${idx}`} style={{ display: 'flex', gap: '8px', margin: '4px 0', alignItems: 'flex-start', color: '#334155' }}>
          <span style={{ color: '#FF671F', fontWeight: 'bold', fontSize: '15px', lineHeight: '1.3' }}>•</span>
          <div style={{ flex: 1 }}>{renderInline(trimmed.slice(2), `li-${idx}`)}</div>
        </div>
      );
    } else if (trimmed === '') {
      elements.push(<div key={`sp-${idx}`} style={{ height: '6px' }} />);
    } else {
      elements.push(
        <p key={`p-${idx}`} style={{ margin: '4px 0', color: '#1E293B' }}>
          {renderInline(trimmed, `p-${idx}`)}
        </p>
      );
    }
  });

  // Flush any trailing table
  if (inTable && tableRows.length > 0) {
    flushTable('table-trailing');
  }

  return <>{elements}</>;
}

// ─── Chat Bubble Component ─────────────────────────────────────
function ChatBubble({ role, content, onTaskClick }) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      position: 'relative',
    }}>
      {/* Avatar */}
      <div style={{
        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        background: isUser ? '#FF671F' : '#003366', color: '#FFFFFF',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}>
        {isUser ? '👤' : <MdOutlineSmartToy />}
      </div>

      {/* Bubble text */}
      <div style={{
        maxWidth: '82%',
        borderRadius: '14px',
        padding: '14px 20px',
        fontSize: '14px',
        lineHeight: '1.6',
        position: 'relative',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        ...(isUser ? {
          background: '#003366',
          color: '#FFFFFF',
          borderBottomRightRadius: '2px',
        } : {
          background: '#FFFFFF',
          color: '#1E293B',
          border: '1px solid #E2E8F0',
          borderBottomLeftRadius: '2px',
        }),
      }}>
        {isUser ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
        ) : (
          <div>
            <FormattedContent text={content} onTaskClick={onTaskClick} />
            {/* Copy Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none', color: copied ? '#059669' : '#94A3B8',
                  fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: '2px 6px',
                  borderRadius: '4px',
                }}
                title="Copy response to clipboard"
              >
                {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const STORAGE_KEY_MESSAGES = 'railopt_assistant_messages';
const STORAGE_KEY_CONTEXT = 'railopt_assistant_context';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Namaste! I am the **RailOpt AI Operations Advisor**.\n\n" +
    "I have access to live database telemetry including **P-Way defects (TMS)**, **Signal failures (SMMS)**, **OHE power blocks (TDMS)**, and **upcoming corridor possession windows**.\n\n" +
    "How can I assist your division with maintenance block planning today?",
};

const TELEMETRY_STAGES = [
  {
    id: 'ingest',
    label: 'Track & Asset Telemetry Ingestion',
    detail: 'Aggregating active TMS track defects, SMMS interlocking logs & TDMS power isolations...',
    icon: FiDatabase,
    subsystem: 'TMS / SMMS / TDMS Core',
    progress: 25,
  },
  {
    id: 'window',
    label: 'Corridor & Possession Window Analysis',
    detail: 'Cross-referencing train timetables with 00:30–04:30 AM night maintenance slots...',
    icon: FiClock,
    subsystem: 'COA / FOIS Interlock',
    progress: 55,
  },
  {
    id: 'bundling',
    label: 'Multi-Department Shadow Bundling Engine',
    detail: 'Simulating joint Engineering + S&T + TRD concurrent maintenance to safeguard line capacity...',
    icon: FiLayers,
    subsystem: 'Optimization Matrix',
    progress: 80,
  },
  {
    id: 'synthesis',
    label: 'Synthesizing Verified Decision Briefing',
    detail: 'Finalizing safety rulebook compliance, priority scores, and interactive operational directives...',
    icon: FiActivity,
    subsystem: 'RailOpt AI Synthesis',
    progress: 96,
  },
];

function ProgressiveTelemetryLoader({ currentStepIdx, stages }) {
  const currentStage = stages[Math.min(currentStepIdx, stages.length - 1)];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      maxWidth: '520px',
    }}>
      {/* Bot Avatar */}
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        background: '#003366',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        boxShadow: '0 2px 6px rgba(0, 51, 102, 0.12)',
        flexShrink: 0,
      }}>
        <MdOutlineSmartToy />
      </div>

      {/* Sleek Thinking Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        borderBottomLeftRadius: '3px',
        padding: '12px 18px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: '290px',
      }}>
        {/* Header: Thinking status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #F1F5F9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="animate-spin"
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid #003366',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>
              Thinking...
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            color: '#64748B',
            background: '#F8FAFC',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: '500',
            border: '1px solid #E2E8F0',
          }}>
            {currentStage?.subsystem || 'Live Telemetry'}
          </span>
        </div>

        {/* Clean step progression */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '2px' }}>
          {stages.slice(0, currentStepIdx + 1).map((stg, i) => {
            const isCompleted = i < currentStepIdx;
            return (
              <div
                key={stg.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: isCompleted ? '#64748B' : '#003366',
                  fontWeight: isCompleted ? '400' : '600',
                  lineHeight: '1.4',
                }}
              >
                {isCompleted ? (
                  <FiCheck style={{ color: '#16A34A', fontSize: '13px', flexShrink: 0 }} />
                ) : (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#FF671F',
                      display: 'inline-block',
                      flexShrink: 0,
                      boxShadow: '0 0 4px #FF671F',
                    }}
                  />
                )}
                <span>{stg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Assistant Page ───────────────────────────────────────
export default function AssistantPage() {
  const { activeZone } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load chat history from sessionStorage so changing pages never resets the conversation
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not restore chat messages:', e);
    }
    return [INITIAL_MESSAGE];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [contextItems, setContextItems] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_CONTEXT);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [isListening, setIsListening] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalLoading, setTaskModalLoading] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const initialQueryExecuted = useRef(false);
  const chatContainerRef = useRef(null);
  const isFirstMount = useRef(true);

  // Sync messages & context to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_CONTEXT, JSON.stringify(contextItems));
    } catch (e) {}
  }, [contextItems]);

  // Keep window fixed at the top when navigating to assistant
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Progressive loading steps animation
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStepIdx(0);
      interval = setInterval(() => {
        setLoadingStepIdx(prev => (prev < TELEMETRY_STAGES.length - 1 ? prev + 1 : prev));
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (location.state?.query && !initialQueryExecuted.current) {
      initialQueryExecuted.current = true;
      sendMessage(location.state.query);
    }
  }, [location.state]);

  useEffect(() => {
    const params = activeZone && activeZone !== 'ALL' ? { zone: activeZone } : {};
    assistantAPI.getSuggestions(params)
      .then(r => setSuggestions(r.data.suggestions || []))
      .catch(() => {});
  }, [activeZone]);

  // Scroll strictly within the chat messages container — never scroll the outer window
  useEffect(() => {
    if (!chatContainerRef.current) return;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  // Web Speech API Voice Input
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    // Prepare multi-turn history
    const historyPayload = messages.slice(1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      content: m.content,
    }));

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await assistantAPI.chat({
        message: msg,
        history: historyPayload,
        ...(activeZone && activeZone !== 'ALL' ? { zone: activeZone } : {}),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
      setContextItems(res.data.context_used || []);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Unable to complete AI consultation: ' + (err.response?.data?.detail || err.message),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setContextItems([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
      sessionStorage.removeItem(STORAGE_KEY_CONTEXT);
    } catch (e) {}
  };

  const exportChat = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()} - ${new Date().toLocaleTimeString()}]:\n${m.content}\n\n`).join('----------------------------------------\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RailOpt_AI_Briefing_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTokenClick = async (token, type) => {
    if (type === 'schedule') {
      navigate(`/schedules?scheduleId=${encodeURIComponent(token)}`);
      return;
    }
    if (type === 'corridor') {
      navigate(`/schedules?corridor=${encodeURIComponent(token)}`);
      return;
    }
    if (type === 'train') {
      const trainNo = token.replace(/[^\d]/g, '');
      navigate(`/schedules?train=${encodeURIComponent(trainNo)}`);
      return;
    }

    // Type is 'task' (TMS-..., SMMS-..., TDMS-..., TASK-...)
    setTaskModalLoading(true);
    try {
      const res = await taskAPI.getAll({ search: token, limit: 1 });
      if (res.data?.data?.length > 0) {
        setSelectedTask(res.data.data[0]);
      } else {
        setSelectedTask({ taskId: token, task_id: token, defectType: 'Corridor Defect', defect_type: 'Corridor Defect', status: 'pending' });
      }
    } catch {
      setSelectedTask({ taskId: token, task_id: token, defectType: 'Corridor Defect', defect_type: 'Corridor Defect', status: 'pending' });
    } finally {
      setTaskModalLoading(false);
    }
  };

  const currentZoneObj = Array.isArray(ZONAL_RAILWAYS)
    ? ZONAL_RAILWAYS.find(z => z.code === activeZone)
    : null;
  const zoneDisplayName = !activeZone || activeZone === 'ALL'
    ? 'Pan-India (All 18 Zones)'
    : `${currentZoneObj?.name || activeZone} (${activeZone})`;

  // Concise RAG summary to keep header spacious on all viewports
  const formattedContext = contextItems.map(item => {
    return item
      .replace(/live defect records?/i, 'defects')
      .replace(/scheduled block windows?/i, 'blocks')
      .replace(/active alerts?/i, 'alerts')
      .replace(/records?/i, 'items');
  }).join(' · ');

  return (
    <div
      style={{
        padding: '14px 20px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'hidden',
      }}
      className="animate-fadeIn"
    >
      {/* Header Bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0, 51, 102, 0.04)',
          gap: '12px',
        }}
      >
        {/* Left: Branding & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #003366 0%, #0A2540 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 2px 6px rgba(0, 51, 102, 0.2)',
              flexShrink: 0,
            }}
          >
            <MdOutlineSmartToy />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '17px', fontWeight: '800', color: '#003366', margin: 0, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                RailOpt AI Operational Advisor
              </h1>
              <span
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 7px',
                  borderRadius: '12px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                Gemini 2.5
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0', whiteSpace: 'nowrap' }}>
              Multi-department decision engine · Grounded in real-time TMS, SMMS &amp; TDMS telemetry
            </p>
          </div>
        </div>

        {/* Right: Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
          {/* Active Zone Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '20px',
              color: '#1D4ED8',
              fontSize: '12px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(29, 78, 216, 0.05)',
            }}
            title="Filtered Railway Operational Jurisdiction"
          >
            <FiGlobe style={{ color: '#2563EB', fontSize: '13px' }} />
            <span style={{ color: '#64748B', fontWeight: '500' }}>Zone:</span>
            <span>{zoneDisplayName}</span>
          </div>

          {/* Telemetry RAG Grounding Pill */}
          {contextItems.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '20px',
                color: '#065F46',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(6, 95, 70, 0.05)',
              }}
              title={`Live Telemetry Grounding Context: ${contextItems.join(' · ')}`}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block',
                  boxShadow: '0 0 6px #10B981',
                }}
              />
              <FiDatabase style={{ fontSize: '12px', color: '#059669' }} />
              <span style={{ color: '#047857', fontWeight: '700' }}>RAG:</span>
              <span style={{ color: '#065F46' }}>{formattedContext}</span>
            </div>
          )}

          {/* Export Briefing Button */}
          <button
            onClick={exportChat}
            style={{
              padding: '6px 12px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#003366',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            title="Download shift consultation summary (Export Briefing)"
          >
            <FiDownload style={{ fontSize: '13px' }} />
            <span>Export</span>
          </button>

          {/* Reset Chat Button */}
          <button
            onClick={clearChat}
            style={{
              padding: '6px 12px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#475569',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#FEF2F2';
              e.currentTarget.style.color = '#DC2626';
              e.currentTarget.style.borderColor = '#FCA5A5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.color = '#475569';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            title="Clear Chat History"
          >
            <FiRefreshCw style={{ fontSize: '12px' }} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Suggestion pills */}
      {suggestions.length > 0 && messages.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '20px',
                color: '#C2410C', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.15s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFEDD5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; }}
            >
              <FiZap style={{ color: '#EA580C' }} />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Chat window Card */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          background: '#F8FAFC',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} onTaskClick={handleTokenClick} />
        ))}

        {loading && (
          <ProgressiveTelemetryLoader currentStepIdx={loadingStepIdx} stages={TELEMETRY_STAGES} />
        )}
        <div ref={bottomRef} style={{ height: '12px', flexShrink: 0 }} />
      </div>

      {/* Input area */}
      <div style={{
        display: 'flex', gap: '10px', flexShrink: 0,
        background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px',
        border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about scheduling conflicts, critical P-Way/S&T tasks, night window possession..."
          style={{
            flex: 1, border: 'none', outline: 'none', padding: '8px 10px',
            fontSize: '14px', color: '#1E293B', background: 'transparent',
          }}
        />

        {/* Voice Input Toggle */}
        <button
          onClick={toggleVoice}
          style={{
            padding: '10px 14px',
            background: isListening ? '#FEE2E2' : '#F1F5F9',
            color: isListening ? '#DC2626' : '#475569',
            border: isListening ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
            borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
          }}
          title={isListening ? 'Listening... click to stop' : 'Voice input (Speech-to-Text)'}
        >
          {isListening ? <FiMicOff className="animate-pulse" /> : <FiMic />}
        </button>

        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            padding: '10px 22px', background: '#003366', color: '#FFFFFF',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            opacity: (!input.trim() || loading) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <FiSend /> Send
        </button>
      </div>

      {/* Task Quick-View Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            background: '#FFFFFF', width: '520px', borderRadius: '14px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden',
          }}>
            <div style={{
              background: '#003366', color: '#FFFFFF', padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertCircle style={{ fontSize: '18px', color: '#FF671F' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                  Defect Task: {selectedTask.task_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontSize: '18px' }}
              >
                <FiX />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>DEFECT TYPE</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                  {selectedTask.defect_type || 'General Track Maintenance'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>DEPARTMENT</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#003366', marginTop: '2px' }}>
                    {selectedTask.department || 'Engineering'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>URGENCY LEVEL</div>
                  <div style={{
                    fontSize: '12px', fontWeight: '700', marginTop: '2px',
                    color: selectedTask.criticality === 'critical' ? '#DC2626' : '#EA580C',
                    textTransform: 'uppercase',
                  }}>
                    {selectedTask.criticality || 'HIGH'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }}>
                  <FiMapPin style={{ color: '#FF671F' }} />
                  <span>{selectedTask.section_name || selectedTask.section_id || 'Main Line'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }}>
                  <FiClock style={{ color: '#0284C7' }} />
                  <span>{selectedTask.estimated_duration || 120} min duration</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  onClick={() => {
                    const tId = selectedTask.taskId || selectedTask.task_id || '';
                    setSelectedTask(null);
                    navigate(`/requests?search=${encodeURIComponent(tId)}`);
                  }}
                  style={{
                    padding: '8px 12px', background: '#F8FAFC', color: '#475569',
                    border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                  title="View or track in Block Requests"
                >
                  <FiLayers /> Block Requests
                </button>

                <button
                  onClick={() => {
                    const tId = selectedTask.taskId || selectedTask.task_id || '';
                    const sec = selectedTask.sectionId || selectedTask.section_id || '';
                    setSelectedTask(null);
                    navigate(`/schedules?taskId=${encodeURIComponent(tId)}&search=${encodeURIComponent(tId)}${sec ? `&corridor=${encodeURIComponent(sec)}` : ''}`);
                  }}
                  style={{
                    padding: '8px 12px', background: '#EFF6FF', color: '#1D4ED8',
                    border: '1px solid #BFDBFE', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                  title="Find scheduled block or bundle window"
                >
                  <FiClock /> Find in Schedules
                </button>

                <button
                  onClick={() => {
                    const tId = selectedTask.taskId || selectedTask.task_id || '';
                    setSelectedTask(null);
                    navigate(`/prioritization?taskId=${encodeURIComponent(tId)}&search=${encodeURIComponent(tId)}`);
                  }}
                  style={{
                    padding: '8px 16px', background: '#003366', color: '#FFFFFF',
                    border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 2px 4px rgba(0,51,102,0.2)',
                  }}
                >
                  <span>Open in Prioritization</span>
                  <FiExternalLink />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
