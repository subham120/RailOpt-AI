import { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import { DEPARTMENTS, formatDuration } from '../utils/constants';
import {
  FiActivity,
  FiBarChart2,
  FiFileText,
  FiDownload,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiZap,
  FiDatabase,
  FiKey,
  FiCalendar,
  FiFilter,
  FiRefreshCw,
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Reports() {
  const [downtime, setDowntime] = useState([]);
  const [utilization, setUtilization] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('downtime');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditPagination, setAuditPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchReports = async (page = 1) => {
    setLoading(true);
    try {
      const [dtRes, utilRes, auditRes] = await Promise.all([
        reportAPI.getDowntime(),
        reportAPI.getUtilization(),
        reportAPI.getAuditLog({ limit: 50, page, action: auditActionFilter }),
      ]);
      setDowntime(dtRes.data.data || []);
      setUtilization(utilRes.data.data || null);
      setAuditLogs(auditRes.data.data || []);
      if (auditRes.data.pagination) {
        setAuditPagination(auditRes.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [auditActionFilter]);

  const handleExport = async (type) => {
    try {
      const res = await reportAPI.exportReport({ type, format: 'xlsx' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `railopt_${type}_report.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${type} report as Excel (.xlsx)`);
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  const tabs = [
    { id: 'downtime', label: 'Downtime & Corridor Availability', icon: FiActivity },
    { id: 'utilization', label: 'Block Utilization & Department Analysis', icon: FiBarChart2 },
    { id: 'audit', label: 'Audit Trail & Transparency Log', icon: FiFileText },
  ];

  const getActionBadge = (action) => {
    switch (action) {
      case 'schedule_approved':
        return { label: 'Schedule Approved', color: '#046A38', bg: '#E8F5E9', icon: FiCheckCircle };
      case 'schedule_rejected':
        return { label: 'Schedule Rejected', color: '#DC2626', bg: '#FEE2E2', icon: FiXCircle };
      case 'schedule_overridden':
        return { label: 'Manual Override', color: '#D97706', bg: '#FEF3C7', icon: FiAlertTriangle };
      case 'ai_prioritization_run':
        return { label: 'AI Prioritization', color: '#6B21A8', bg: '#F3E8FF', icon: FiZap };
      case 'ai_optimization_run':
        return { label: 'AI Optimization', color: '#003366', bg: '#E6EDF5', icon: FiZap };
      case 'data_seeded':
        return { label: 'Data Seeded', color: '#1A5276', bg: '#DBEAFE', icon: FiDatabase };
      case 'schedule_created':
        return { label: 'Schedule Created', color: '#003366', bg: '#E6EDF5', icon: FiCalendar };
      case 'user_login':
        return { label: 'User Login', color: '#4B5563', bg: '#F3F4F6', icon: FiKey };
      default:
        return { label: (action || 'system').replace(/_/g, ' '), color: '#4B5563', bg: '#F3F4F6', icon: FiFileText };
    }
  };

  // Aggregated downtime metrics
  const totalDowntimeMin = downtime.reduce((acc, curr) => acc + (curr.totalDowntimeMinutes || 0), 0);
  const avgAvailability = downtime.length > 0
    ? (downtime.reduce((acc, curr) => acc + parseFloat(curr.availability || 100), 0) / downtime.length).toFixed(1)
    : '99.5';

  return (
    <div style={{ padding: '32px' }} className="animate-fadeIn">
      {/* Toast Notification */}
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

      {/* Header & Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', margin: '0 0 4px' }}>
            RailOpt AI Reports & Audit Trail
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Downtime analysis, corridor utilization metrics, and GIGW 3.0 transparency audit logs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => fetchReports()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiRefreshCw /> Refresh Data
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('schedules')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiDownload /> Export Schedules (.xlsx)
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => handleExport('tasks')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiDownload /> Export Tasks (.xlsx)
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#E2E8F0', borderRadius: '10px', padding: '4px' }}>
        {tabs.map(tab => {
          const IconComp = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: '10px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#003366' : '#64748B',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <IconComp style={{ fontSize: '15px' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>Computing Analytical Reports & Audit Metrics...</p>
        </div>
      ) : (
        <>
          {/* ──────── TAB 1: DOWNTIME & CORRIDOR AVAILABILITY ──────── */}
          {activeTab === 'downtime' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid #003366' }}>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#003366', margin: 0 }}>
                    {downtime.length}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Corridors Analyzed</p>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid #F59E0B' }}>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#F59E0B', margin: 0 }}>
                    {formatDuration(totalDowntimeMin)}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Total Planned Downtime</p>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid #046A38' }}>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#046A38', margin: 0 }}>
                    {avgAvailability}%
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Avg Network Availability</p>
                </div>
              </div>

              {/* Downtime Chart */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937', marginBottom: '20px' }}>
                  Corridor Maintenance Downtime
                </h3>
                {downtime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={downtime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="sectionId" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'Possession (min)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                      <Tooltip formatter={(val) => [formatDuration(val), 'Possession Downtime']} />
                      <Bar dataKey="totalDowntimeMinutes" fill="#003366" radius={[4, 4, 0, 0]}>
                        {downtime.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#003366' : '#1A5276'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '32px' }}>No downtime data available</p>
                )}
              </div>

              {/* Detailed Corridor Table */}
              <div className="card" style={{ overflow: 'auto' }}>
                <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', margin: 0 }}>
                    Corridor-by-Corridor Availability Breakdown
                  </h3>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Section Code</th>
                      <th>Corridor Name</th>
                      <th>Traffic Density</th>
                      <th>Active Blocks</th>
                      <th>Total Possession</th>
                      <th>Line Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downtime.map((s, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '12px' }}>{s.sectionId}</td>
                        <td style={{ fontSize: '13px', fontWeight: '500' }}>{s.sectionName}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                            background: s.trafficDensity === 'high' ? '#FEE2E2' : s.trafficDensity === 'medium' ? '#FEF3C7' : '#E8F5E9',
                            color: s.trafficDensity === 'high' ? '#DC2626' : s.trafficDensity === 'medium' ? '#D97706' : '#046A38',
                            textTransform: 'uppercase',
                          }}>
                            {s.trafficDensity}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{s.blockCount} session(s)</td>
                        <td style={{ fontSize: '13px', fontWeight: '600' }}>{formatDuration(s.totalDowntimeMinutes)}</td>
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: parseFloat(s.availability) > 98 ? '#046A38' : '#D97706' }}>
                            {s.availability}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────── TAB 2: BLOCK UTILIZATION & DEPARTMENT ANALYSIS ──────── */}
          {activeTab === 'utilization' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* KPI Summary Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid #003366' }}>
                  <p style={{ fontSize: '26px', fontWeight: '800', color: '#003366', margin: 0 }}>
                    {formatDuration(utilization?.totalDowntimeMinutes || 0)}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Total Possession Time</p>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid #046A38' }}>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#046A38', margin: 0 }}>
                    {utilization?.byStatus?.approved || 0}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Approved Blocks</p>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid #F59E0B' }}>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#F59E0B', margin: 0 }}>
                    {utilization?.byStatus?.proposed || 0}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Proposed Blocks</p>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid #6B21A8' }}>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#6B21A8', margin: 0 }}>
                    {utilization?.multiDeptBlocks || 0}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', fontWeight: '600', textTransform: 'uppercase' }}>Multi-Dept Coordinated</p>
                </div>
              </div>

              {/* Department Utilization Bar Chart */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937', marginBottom: '20px' }}>
                  Department-Wise Maintenance Possession Duration
                </h3>
                {utilization?.departmentUtilization?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={utilization.departmentUtilization}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: 'Possession (min)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                      <Tooltip formatter={(val) => [formatDuration(val), 'Possession Duration']} />
                      <Bar dataKey="totalMinutes" radius={[6, 6, 0, 0]}>
                        {utilization.departmentUtilization.map((d, i) => (
                          <Cell key={i} fill={DEPARTMENTS[d.department]?.color || '#003366'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '32px' }}>No department utilization records available</p>
                )}
              </div>

              {/* Department Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {(utilization?.departmentUtilization || []).map((d, i) => {
                  const deptCfg = DEPARTMENTS[d.department] || { color: '#003366', bg: '#E6EDF5' };
                  return (
                    <div key={i} className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${deptCfg.color}` }}>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', margin: '0 0 6px' }}>{d.department}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                        <span>Possession Blocks:</span>
                        <b style={{ color: '#1E293B' }}>{d.blockCount}</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                        <span>Total Duration:</span>
                        <b style={{ color: deptCfg.color }}>{formatDuration(d.totalMinutes)}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ──────── TAB 3: AUDIT TRAIL & TRANSPARENCY LOG ──────── */}
          {activeTab === 'audit' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Action Filter */}
              <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
                    <FiFilter /> Filter Action:
                  </div>
                  <select
                    className="input select"
                    style={{ width: '220px', padding: '6px 12px', fontSize: '13px' }}
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                  >
                    <option value="">All Operational Actions</option>
                    <option value="ai_optimization_run">AI Optimization Run</option>
                    <option value="ai_prioritization_run">AI Prioritization Run</option>
                    <option value="schedule_approved">Schedule Approved</option>
                    <option value="schedule_rejected">Schedule Rejected</option>
                    <option value="schedule_overridden">Manual Override</option>
                    <option value="data_seeded">Data Seeded</option>
                    <option value="user_login">User Login</option>
                  </select>
                </div>
                <span style={{ fontSize: '13px', color: '#64748B' }}>
                  Total audit records: <b>{auditPagination.total || auditLogs.length}</b>
                </span>
              </div>

              {/* Audit Table */}
              <div className="card" style={{ overflow: 'auto' }}>
                {auditLogs.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp (IST)</th>
                        <th>User / Officer</th>
                        <th>Action Performed</th>
                        <th>Target ID</th>
                        <th>Operational Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, idx) => {
                        const badge = getActionBadge(log.action);
                        const IconComp = badge.icon;
                        return (
                          <tr key={idx}>
                            <td style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                              {new Date(log.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td style={{ fontWeight: '600', fontSize: '13px' }}>{log.userName || 'System Engine'}</td>
                            <td>
                              <span style={{
                                padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                background: badge.bg, color: badge.color,
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                              }}>
                                <IconComp style={{ fontSize: '12px' }} />
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600' }}>{log.targetId || '-'}</td>
                            <td style={{ fontSize: '13px', color: '#334155' }}>{log.details || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                    <FiFileText style={{ fontSize: '32px', marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No audit trail entries found for selected filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
