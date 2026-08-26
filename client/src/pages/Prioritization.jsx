import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, mockAPI } from '../services/api';
import { CRITICALITY_CONFIG, DEPARTMENTS, formatDuration } from '../utils/constants';
import {
  FiZap,
  FiDatabase,
  FiChevronDown,
  FiChevronUp,
  FiShield,
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
  FiCalendar,
  FiArrowRight,
} from 'react-icons/fi';
import React from 'react';

export default function Prioritization() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [scoredTasks, setScoredTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskAPI.getAll({ limit: 100 });
      const allTasks = res.data.data || [];
      setTasks(allTasks);

      const alreadyScored = allTasks.filter(t => t.criticalityScore !== null && t.criticalityScore !== undefined);
      if (alreadyScored.length > 0) {
        const sorted = [...alreadyScored].sort((a, b) => (b.criticalityScore || 0) - (a.criticalityScore || 0));
        setScoredTasks(sorted);
        setSummary({
          total: sorted.length,
          critical: sorted.filter(t => t.urgencyTier === 'Critical' || t.criticalityScore >= 0.75).length,
          high: sorted.filter(t => t.urgencyTier === 'High').length,
          medium: sorted.filter(t => t.urgencyTier === 'Medium').length,
          low: sorted.filter(t => t.urgencyTier === 'Low').length,
        });
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const runPrioritization = async () => {
    setScoring(true);
    try {
      const res = await taskAPI.prioritize();
      if (res.data.success) {
        const scored = res.data.tasks || [];
        setScoredTasks(scored);
        setSummary(res.data.summary || {
          total: scored.length,
          critical: scored.filter(t => t.urgencyTier === 'Critical' || t.criticalityScore >= 0.75).length,
          high: scored.filter(t => t.urgencyTier === 'High').length,
          medium: scored.filter(t => t.urgencyTier === 'Medium').length,
          low: scored.filter(t => t.urgencyTier === 'Low').length,
        });
        showToast(`RailOpt AI Prioritization completed for ${scored.length} maintenance tasks`);
      }
    } catch (err) {
      console.error('Prioritization failed:', err);
      showToast('Prioritization failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setScoring(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await mockAPI.seed({ taskCount: 80, clearExisting: true });
      await fetchTasks();
      showToast('Successfully seeded 80 Indian Railways defect tasks');
    } catch (err) {
      showToast('Seeding failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSeeding(false);
    }
  };

  const getTierColor = (score) => {
    if (score >= 0.75) return '#DC2626';
    if (score >= 0.55) return '#F59E0B';
    if (score >= 0.35) return '#3B82F6';
    return '#10B981';
  };

  const getTierLabel = (score) => {
    if (score >= 0.75) return 'Critical';
    if (score >= 0.55) return 'High';
    if (score >= 0.35) return 'Medium';
    return 'Low';
  };

  return (
    <div style={{ padding: '32px' }} className="animate-fadeIn">
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '32px',
            zIndex: 9999,
            background: toast.type === 'error' ? '#DC2626' : '#046A38',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
          className="animate-fadeIn"
        >
          {toast.type === 'error' ? <FiAlertTriangle style={{ fontSize: '18px' }} /> : <FiCheckCircle style={{ fontSize: '18px' }} />}
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '12px', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', margin: '0 0 4px' }}>
            RailOpt AI Prioritization Engine
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Hybrid Domain Safety Rules + ML Multi-Factor Criticality Scoring with Transparent Explainability
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {tasks.length === 0 && (
            <button className="btn btn-outline" onClick={handleSeedData} disabled={seeding} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiDatabase />
              {seeding ? 'Seeding...' : 'Seed 80 Tasks'}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={runPrioritization}
            disabled={scoring || tasks.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiZap style={{ color: '#FBBF24' }} />
            {scoring ? 'Scoring Telemetry...' : 'Run AI Prioritization'}
          </button>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div className="card" style={{ padding: '16px 20px', textAlign: 'center', borderTop: '3px solid #003366' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#003366', margin: 0 }}>{summary.total}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Total Tasks</p>
          </div>
          <div className="card" style={{ padding: '16px 20px', textAlign: 'center', borderTop: '3px solid #DC2626' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#DC2626', margin: 0 }}>{summary.critical}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Critical Urgency</p>
          </div>
          <div className="card" style={{ padding: '16px 20px', textAlign: 'center', borderTop: '3px solid #F59E0B' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#F59E0B', margin: 0 }}>{summary.high}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>High Priority</p>
          </div>
          <div className="card" style={{ padding: '16px 20px', textAlign: 'center', borderTop: '3px solid #3B82F6' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#3B82F6', margin: 0 }}>{summary.medium}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Medium Priority</p>
          </div>
          <div className="card" style={{ padding: '16px 20px', textAlign: 'center', borderTop: '3px solid #10B981' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#10B981', margin: 0 }}>{summary.low}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Low Priority</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Evaluating maintenance task criticality...</p>
        </div>
      ) : scoredTasks.length > 0 ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1F2937' }}>
                Multi-Factor Risk Model:
              </span>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: '600', flexWrap: 'wrap' }}>
                <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 7px', borderRadius: '4px' }}>🛡️ Safety (35%)</span>
                <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: '4px' }}>⏳ Overdue (25%)</span>
                <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '2px 7px', borderRadius: '4px' }}>🚦 Traffic (20%)</span>
                <span style={{ background: '#F3E8FF', color: '#6B21A8', padding: '2px 7px', borderRadius: '4px' }}>🔁 History (20%)</span>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>
              Click any row for in-depth AI reasoning
            </span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '36px' }}>#</th>
                <th>Task ID</th>
                <th>Section</th>
                <th>Defect Type</th>
                <th>Department</th>
                <th>AI Score</th>
                <th>Urgency Tier</th>
                <th>Score Breakdown (Safety • Due • Traffic • History)</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {scoredTasks.map((t, idx) => {
                const score = t.criticalityScore || 0;
                const tier = t.urgencyTier || getTierLabel(score);
                const tierColor = getTierColor(score);
                const isExpanded = expandedRow === idx;
                const dept = DEPARTMENTS[t.department] || {};

                const safetyVal = t.scoreBreakdown?.safety ?? (t.criticality === 'critical' ? 0.95 : t.criticality === 'high' ? 0.75 : 0.45);
                const overdueVal = t.scoreBreakdown?.overdue ?? 0.65;
                const trafficVal = t.scoreBreakdown?.traffic ?? 0.60;
                const recurrenceVal = t.scoreBreakdown?.recurrence ?? 0.30;

                return (
                  <React.Fragment key={t._id || t.id || idx}>
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : idx)}
                      style={{
                        cursor: 'pointer',
                        background: isExpanded ? '#F0F9FF' : 'transparent',
                        transition: 'background 0.15s',
                        borderLeft: isExpanded ? `4px solid ${tierColor}` : '4px solid transparent'
                      }}
                    >
                      <td style={{ fontWeight: '600', color: '#9CA3AF', fontSize: '12px' }}>{idx + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#003366' }}>{t.taskId}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500' }}>{t.sectionName || t.sectionId}</td>
                      <td style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{t.defectType}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          background: dept.bg || '#F3F4F6', color: dept.color || '#374151',
                        }}>
                          {dept.label || t.department}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '54px', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${score * 100}%`, height: '100%', background: tierColor, borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: tierColor, minWidth: '36px' }}>
                            {Math.round(score * 100)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 9px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700',
                          background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30`
                        }}>
                          {tier}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span
                            title={`Safety Hazard: ${Math.round(safetyVal * 100)}% (Weight 35%)`}
                            style={{
                              fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                              background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', display: 'inline-flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <span>🛡️</span>
                            <span>{Math.round(safetyVal * 100)}%</span>
                          </span>
                          <span
                            title={`Overdue Factor: ${Math.round(overdueVal * 100)}% (Weight 25%)`}
                            style={{
                              fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                              background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <span>⏳</span>
                            <span>{Math.round(overdueVal * 100)}%</span>
                          </span>
                          <span
                            title={`Traffic Density: ${Math.round(trafficVal * 100)}% (Weight 20%)`}
                            style={{
                              fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                              background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <span>🚦</span>
                            <span>{Math.round(trafficVal * 100)}%</span>
                          </span>
                          <span
                            title={`Recurrence History: ${Math.round(recurrenceVal * 100)}% (Weight 20%)`}
                            style={{
                              fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                              background: '#F3E8FF', color: '#6B21A8', border: '1px solid #E9D5FF', display: 'inline-flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <span>🔁</span>
                            <span>{Math.round(recurrenceVal * 100)}%</span>
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '15px', color: isExpanded ? '#003366' : '#9CA3AF', textAlign: 'center' }}>
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={9} style={{ padding: '20px 24px', borderTop: '1px solid #E2E8F0', borderBottom: '2px solid #CBD5E1' }}>
                          <div className="animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                            <div style={{ background: 'white', padding: '18px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FiShield style={{ color: tierColor }} />
                                  Explainable Risk Weights
                                </h4>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: tierColor, background: `${tierColor}15`, padding: '2px 8px', borderRadius: '4px' }}>
                                  Total Score: {Math.round(score * 100)}% ({tier})
                                </span>
                              </div>

                              {[
                                { key: 'safety', label: 'Safety Hazard (35% Weight)', val: safetyVal, color: '#DC2626', icon: '🛡️', contrib: (safetyVal * 0.35).toFixed(2) },
                                { key: 'overdue', label: 'Overdue Penalty (25% Weight)', val: overdueVal, color: '#F59E0B', icon: '⏳', contrib: (overdueVal * 0.25).toFixed(2) },
                                { key: 'traffic', label: 'Corridor Traffic (20% Weight)', val: trafficVal, color: '#3B82F6', icon: '🚦', contrib: (trafficVal * 0.20).toFixed(2) },
                                { key: 'recurrence', label: 'Historical Recurrence (20% Weight)', val: recurrenceVal, color: '#8B5CF6', icon: '🔁', contrib: (recurrenceVal * 0.20).toFixed(2) },
                              ].map(({ key, label, val, color, icon, contrib }) => (
                                <div key={key} style={{ marginBottom: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                    <span style={{ color: '#4B5563', fontWeight: '600' }}>
                                      {icon} {label}
                                    </span>
                                    <span style={{ fontWeight: '700', color }}>
                                      {Math.round(val * 100)}% <span style={{ color: '#9CA3AF', fontWeight: '500', fontSize: '11px' }}>({contrib} pts)</span>
                                    </span>
                                  </div>
                                  <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${val * 100}%`, height: '100%', background: color, borderRadius: '4px' }} />
                                  </div>
                                </div>
                              ))}

                              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0', fontSize: '11px', color: '#64748B' }}>
                                <strong>Formula:</strong> Score = (Safety × 0.35) + (Overdue × 0.25) + (Traffic × 0.20) + (History × 0.20)
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'white', padding: '18px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                              <div>
                                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FiInfo style={{ color: '#003366' }} />
                                  Operational Context & Justification
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px', marginBottom: '14px' }}>
                                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px' }}>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Corridor Section</span>
                                    <strong style={{ color: '#1E293B' }}>{t.sectionName || t.sectionId}</strong>
                                  </div>
                                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px' }}>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Telemetry Source</span>
                                    <strong style={{ color: '#1E293B' }}>{t.sourceSystem || 'TMS'} ({t.department})</strong>
                                  </div>
                                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px' }}>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Due Date</span>
                                    <strong style={{ color: '#1E293B' }}>{new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                                  </div>
                                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px' }}>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Required Possession</span>
                                    <strong style={{ color: '#1E293B' }}>{formatDuration(t.estimatedDuration)}</strong>
                                  </div>
                                </div>

                                <div style={{ padding: '12px 14px', background: '#F0F9FF', borderRadius: '8px', borderLeft: '4px solid #0284C7', fontSize: '12px', color: '#0369A1', lineHeight: '1.6' }}>
                                  <strong>AI Engine Decision Note:</strong><br />
                                  {t.reasoning || t.notes || `Assigned ${tier} priority. Defect severity (${t.defectType}) warrants scheduled joint block possession within optimal traffic window.`}
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/schedules');
                                  }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                                >
                                  <FiCalendar />
                                  <span>Plan Block Schedule</span>
                                  <FiArrowRight />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px', color: '#003366' }}>
            <FiShield />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px', color: '#1F2937' }}>
            {tasks.length > 0 ? `${tasks.length} Maintenance Tasks Loaded` : 'No Maintenance Tasks Found'}
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '500px', margin: '0 auto 20px' }}>
            {tasks.length > 0
              ? 'Click the "Run AI Prioritization" button above to evaluate risk dimensions and compute explainable criticality scores.'
              : 'Please seed initial defect telemetry to evaluate risk scores and prioritize schedules.'}
          </p>
          {tasks.length === 0 && (
            <button className="btn btn-primary" onClick={handleSeedData} disabled={seeding} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}>
              <FiDatabase />
              {seeding ? 'Seeding Mock Data...' : 'Seed Initial Mock Data'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
