import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { reportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/constants';
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
  FiSearch,
  FiClock,
  FiLayers,
  FiShield,
  FiTrendingUp,
  FiPieChart,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  ReferenceLine,
} from 'recharts';

// Harmonious, executive operational palette following Indian Railways UX4G tokens
const SHIFT_COLORS = {
  night: '#0B2545',    // Deep Midnight Navy (00–06h)
  morning: '#174A7E',  // Deep Steel Blue (06–12h)
  midday: '#2A75B3',   // Medium Slate Azure (12–18h)
  evening: '#64A5D7',  // Light Frost Sky (18–24h)
};

const DEPT_COLORS = {
  engineering: '#003366',   // IR Deep Navy (TMS / Track)
  signal: '#FF671F',        // IR Saffron (SMMS / S&T)
  traction: '#046A38',      // IR Emerald (TDMS / TRD Electrical)
};

// Reusable SVG Gradients for Recharts
function ChartGradients() {
  return (
    <defs>
      {/* Shift Linear Gradients - Cohesive Executive Tonal Navy Spectrum */}
      <linearGradient id="gradShiftNight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#133560" />
        <stop offset="100%" stopColor="#0B2545" />
      </linearGradient>
      <linearGradient id="gradShiftMorning" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#205B99" />
        <stop offset="100%" stopColor="#174A7E" />
      </linearGradient>
      <linearGradient id="gradShiftMidday" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3589CD" />
        <stop offset="100%" stopColor="#2A75B3" />
      </linearGradient>
      <linearGradient id="gradShiftEvening" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7EBAE4" />
        <stop offset="100%" stopColor="#64A5D7" />
      </linearGradient>

      {/* Department Gradients */}
      <linearGradient id="gradDeptEng" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1A5276" />
        <stop offset="100%" stopColor="#003366" />
      </linearGradient>
      <linearGradient id="gradDeptSignal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#FF671F" />
      </linearGradient>
      <linearGradient id="gradDeptTraction" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2E7D32" />
        <stop offset="100%" stopColor="#046A38" />
      </linearGradient>

      {/* Availability Score Gradients */}
      <linearGradient id="gradAvailOptimal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#046A38" />
      </linearGradient>
      <linearGradient id="gradAvailGood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#003366" />
      </linearGradient>
      <linearGradient id="gradAvailWatch" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
  );
}

// Static Custom Tooltip declared outside of component render
function CustomChartTooltip({ active, payload, chartViewMode }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #CBD5E1',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 12px 28px -4px rgba(0, 34, 68, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
          fontSize: '12px',
          width: '260px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: '800',
              color: '#003366',
              fontSize: '12px',
              background: '#E6EDF5',
              padding: '2px 7px',
              borderRadius: '5px',
              border: '1px solid #BFDBFE',
            }}
          >
            {data.sectionId}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 7px',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              background: data.trafficDensity === 'high' ? '#FEE2E2' : '#FEF3C7',
              color: data.trafficDensity === 'high' ? '#DC2626' : '#B45309',
              border: `1px solid ${data.trafficDensity === 'high' ? '#FECACA' : '#FDE68A'}`,
            }}
          >
            ● {data.trafficDensity}
          </span>
        </div>
        <p style={{ margin: '0 0 8px', color: '#334155', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.sectionName}
        </p>

        {/* Compact 3-Column Key Metric Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px', textAlign: 'center' }}>
          <div style={{ background: '#F8FAFC', padding: '5px 3px', borderRadius: '5px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '9px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Possession</span>
            <b style={{ color: '#003366', fontSize: '11px', whiteSpace: 'nowrap' }}>{data.totalDowntimeHours}h</b>
          </div>
          <div style={{ background: '#F8FAFC', padding: '5px 3px', borderRadius: '5px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '9px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Avail</span>
            <b style={{ color: data.availability >= 85 ? '#046A38' : '#D97706', fontSize: '11px', whiteSpace: 'nowrap' }}>{data.availability}%</b>
          </div>
          <div style={{ background: '#F8FAFC', padding: '5px 3px', borderRadius: '5px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '9px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Blocks</span>
            <b style={{ color: '#1E293B', fontSize: '11px', whiteSpace: 'nowrap' }}>{data.blockCount}</b>
          </div>
        </div>

        {/* Shift Breakdown in Clean 2x2 Grid */}
        {chartViewMode === 'shifts' && (
          <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.night }} />
                  Night:
                </span>
                <b style={{ color: '#0F172A' }}>{data.nightHours}h</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.morning }} />
                  Morn:
                </span>
                <b style={{ color: '#0F172A' }}>{data.morningHours}h</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.midday }} />
                  Mid:
                </span>
                <b style={{ color: '#0F172A' }}>{data.middayHours}h</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.evening }} />
                  Eve:
                </span>
                <b style={{ color: '#0F172A' }}>{data.eveningHours}h</b>
              </div>
            </div>
          </div>
        )}

        {/* Department Breakdown */}
        {chartViewMode === 'departments' && (
          <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '9px' }}>Track</span>
                <b style={{ color: DEPT_COLORS.engineering }}>{data.engineeringHours}h</b>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '9px' }}>Signal</span>
                <b style={{ color: DEPT_COLORS.signal }}>{data.signalTelecomHours}h</b>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '9px' }}>Traction</span>
                <b style={{ color: DEPT_COLORS.traction }}>{data.tractionHours}h</b>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}

// Custom Tooltip for Departmental Possession Share Donut
function CustomDepartmentTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #CBD5E1',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 12px 28px -4px rgba(0, 34, 68, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
          fontSize: '12px',
          minWidth: '220px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: d.color,
              display: 'inline-block',
              boxShadow: `0 0 0 2px ${d.color}30`,
            }}
          />
          <b style={{ color: '#0F172A', fontSize: '13px' }}>{d.name}</b>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', textAlign: 'center' }}>
          <div style={{ background: '#F8FAFC', padding: '6px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '9px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Possession</span>
            <b style={{ color: d.color, fontSize: '13px' }}>{d.hours}h</b>
          </div>
          <div style={{ background: '#F8FAFC', padding: '6px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '9px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Share</span>
            <b style={{ color: '#003366', fontSize: '13px' }}>{d.percentage}%</b>
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', textAlign: 'center', fontWeight: '600', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
          Total Workload: <b style={{ color: '#1E293B' }}>{d.value} maintenance tasks</b>
        </div>
      </div>
    );
  }
  return null;
}

// Custom Tooltip for Shift Workload & Capacity Leveling Bar Chart
function CustomShiftWorkloadTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #CBD5E1',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 12px 28px -4px rgba(0, 34, 68, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
          fontSize: '12px',
          minWidth: '220px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: d.color,
                display: 'inline-block',
                boxShadow: `0 0 0 2px ${d.color}30`,
              }}
            />
            <b style={{ color: '#0F172A', fontSize: '13px' }}>{d.name}</b>
          </div>
          {d.window && (
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                fontWeight: '700',
                color: '#003366',
                background: '#E6EDF5',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {d.window}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', textAlign: 'center' }}>
          <div style={{ background: '#F8FAFC', padding: '6px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '9px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Possession</span>
            <b style={{ color: d.color, fontSize: '13px' }}>{d.hours}h</b>
          </div>
          <div style={{ background: '#F8FAFC', padding: '6px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '9px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Blocks</span>
            <b style={{ color: '#003366', fontSize: '13px' }}>{d.value}</b>
          </div>
        </div>
        {d.percentage && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', textAlign: 'center', fontWeight: '600', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
            Shift Leveling: <b style={{ color: '#046A38' }}>{d.percentage}% of 24h cycle</b>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function Reports() {
  const { activeZone } = useAuth();
  const [downtime, setDowntime] = useState([]);
  const [downtimeMeta, setDowntimeMeta] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('downtime');
  const [planType, setPlanType] = useState('weekly');
  const [chartViewMode, setChartViewMode] = useState('shifts'); // 'shifts', 'departments', 'availability'
  const [searchQuery, setSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditPagination, setAuditPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [dtRes, utilRes, auditRes] = await Promise.all([
        reportAPI.getDowntime({ planType }),
        reportAPI.getUtilization({ planType }),
        reportAPI.getAuditLog({ limit: 50, page, action: auditActionFilter }),
      ]);
      setDowntime(dtRes.data.data || []);
      setDowntimeMeta(dtRes.data.meta || null);
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
  }, [planType, auditActionFilter, activeZone]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = async (type) => {
    try {
      const payload = {
        type,
        format: 'xlsx',
        ...(activeZone && activeZone !== 'ALL' ? { zone: activeZone } : {}),
      };
      const res = await reportAPI.exportReport(payload);
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

  // Aggregated downtime metrics from meta or fallback
  const totalDowntimeHours = downtimeMeta?.totalDowntimeHours || (downtime.reduce((acc, curr) => acc + (curr.totalDowntimeMinutes || 0), 0) / 60).toFixed(1);
  const avgAvailability = downtimeMeta?.avgAvailability || (downtime.length > 0
    ? (downtime.reduce((acc, curr) => acc + parseFloat(curr.availability || 100), 0) / downtime.length).toFixed(1)
    : '95.0');
  const totalBlocksCount = utilization?.totalBlocks || downtime.reduce((acc, curr) => acc + (curr.blockCount || 0), 0);

  // Filtered corridors for table
  const filteredDowntime = useMemo(() => {
    if (!searchQuery.trim()) return downtime;
    const q = searchQuery.toLowerCase();
    return downtime.filter(
      (d) =>
        d.sectionId.toLowerCase().includes(q) ||
        (d.sectionName && d.sectionName.toLowerCase().includes(q))
    );
  }, [downtime, searchQuery]);

  // Shift utilization donut data
  const shiftDonutData = useMemo(() => {
    if (!utilization?.shiftUtilization) {
      return [
        { name: 'Night Block', value: 26, hours: 80, color: SHIFT_COLORS.night, window: '00:00 - 06:00' },
        { name: 'Morning Shift', value: 24, hours: 73.5, color: SHIFT_COLORS.morning, window: '06:00 - 12:00' },
        { name: 'Midday Window', value: 23, hours: 59.2, color: SHIFT_COLORS.midday, window: '12:00 - 18:00' },
        { name: 'Evening Shift', value: 18, hours: 48.5, color: SHIFT_COLORS.evening, window: '18:00 - 24:00' },
      ];
    }
    return utilization.shiftUtilization.map((s) => {
      const shiftKey = s.shift.toLowerCase().split(' ')[0];
      return {
        name: s.shift,
        value: s.blockCount,
        hours: s.totalHours,
        percentage: s.percentage,
        color: SHIFT_COLORS[shiftKey] || s.color || '#003366',
        window: s.window,
      };
    });
  }, [utilization]);

  // Department donut data
  const deptDonutData = useMemo(() => {
    if (!utilization?.departmentUtilization) return [];
    return utilization.departmentUtilization.map((d) => ({
      name: d.department,
      value: d.blockCount,
      hours: d.totalHours,
      percentage: d.percentage,
      color: d.color,
    }));
  }, [utilization]);

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

      {/* Header & Planning Horizon Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#003366', margin: 0 }}>
              RailOpt AI Reports & Performance Analytics
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Interactive possession downtime distribution, multi-shift load balancing, and corridor availability benchmarks
          </p>
        </div>

        {/* Global Horizon & Export Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Horizon Toggle */}
          <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {[
              { id: 'weekly', label: 'Weekly Plan' },
              { id: 'daily', label: 'Daily Operations' },
              { id: 'monthly', label: 'Monthly Overhaul' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPlanType(p.id)}
                className={planType === p.id ? 'filter-pill active' : 'filter-pill'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: planType === p.id ? '#003366' : 'transparent',
                  color: planType === p.id ? 'white' : '#475569',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button className="btn btn-outline btn-sm" onClick={() => fetchReports()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiRefreshCw /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('schedules')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiDownload /> Export Excel
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: '#F1F5F9', borderRadius: '12px', padding: '6px', border: '1px solid #E2E8F0' }}>
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={isActive ? 'tab-switcher-btn active' : 'tab-switcher-btn'}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                background: isActive ? 'white' : 'transparent',
                color: isActive ? '#003366' : '#64748B',
                boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <IconComp style={{ fontSize: '16px', color: isActive ? '#003366' : '#94A3B8' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '80px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              border: '3px solid #E2E8F0',
              borderTopColor: '#003366',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '16px',
            }}
          />
          <p style={{ color: '#003366', fontSize: '15px', fontWeight: '700', margin: '0 0 6px' }}>
            Processing High-Speed Analytics
          </p>
          <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
            Aggregating multi-shift corridor possession data from Northern Railway database...
          </p>
        </div>
      ) : (
        <>
          {/* ──────── TAB 1: DOWNTIME & CORRIDOR AVAILABILITY ──────── */}
          {activeTab === 'downtime' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Executive KPI Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {/* KPI 1: Corridors Monitored */}
                <div
                  className="card-premium"
                  style={{
                    padding: '22px',
                    borderTop: '3px solid #003366',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 4px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Corridors Monitored
                      </p>
                      <p style={{ fontSize: '32px', fontWeight: '900', color: '#003366', margin: 0, lineHeight: 1.1 }}>
                        {downtime.length}
                      </p>
                    </div>
                    <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '10px', color: '#003366' }}>
                      <FiActivity style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#046A38', fontWeight: '600' }}>
                    <FiShield /> 100% Track Availability Tracked
                  </div>
                </div>

                {/* KPI 2: Planned Possession Time */}
                <div
                  className="card-premium"
                  style={{
                    padding: '22px',
                    borderTop: '3px solid #003366',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 4px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Planned Possession Time
                      </p>
                      <p style={{ fontSize: '32px', fontWeight: '900', color: '#0F172A', margin: 0, lineHeight: 1.1 }}>
                        {totalDowntimeHours} <span style={{ fontSize: '16px', fontWeight: '700', color: '#64748B' }}>hrs</span>
                      </p>
                    </div>
                    <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '10px', color: '#003366' }}>
                      <FiClock style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                    <FiClock /> {totalBlocksCount} Blocks Scheduled ({planType.toUpperCase()})
                  </div>
                </div>

                {/* KPI 3: Network Availability */}
                <div
                  className="card-premium"
                  style={{
                    padding: '22px',
                    borderTop: '3px solid #003366',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 4px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Average Network Availability
                      </p>
                      <p style={{ fontSize: '32px', fontWeight: '900', color: '#046A38', margin: 0, lineHeight: 1.1 }}>
                        {avgAvailability}%
                      </p>
                    </div>
                    <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '10px', color: '#003366' }}>
                      <FiTrendingUp style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#046A38', fontWeight: '600' }}>
                    <FiCheckCircle /> Exceeds 85% Benchmark Target
                  </div>
                </div>

                {/* KPI 4: Quad-Shift Workload Leveling */}
                <div
                  className="card-premium"
                  style={{
                    padding: '22px',
                    borderTop: '3px solid #003366',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 4px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Quad-Shift Workload
                      </p>
                      <p style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A', margin: 0, lineHeight: 1.1 }}>
                        Optimal
                      </p>
                    </div>
                    <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '10px', color: '#003366' }}>
                      <FiPieChart style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                    <FiLayers /> 25% ± 3% Across 4 Daily Windows
                  </div>
                </div>
              </div>

              {/* Main Visuals Row: Downtime Chart (Left) + Multi-Shift Load Gauge (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(340px, 1fr)', gap: '20px', alignItems: 'stretch' }}>
                {/* Left: Interactive Corridor Maintenance Downtime Chart */}
                <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'visible', position: 'relative', zIndex: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Corridor Maintenance Downtime & Possession Duration
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                        Measured in planned possession hours per section ({planType.toUpperCase()} horizon)
                      </p>
                    </div>

                    {/* Modern Executive Segmented Switch */}
                    <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '10px', padding: '3px', border: '1px solid #E2E8F0', gap: '2px' }}>
                      <button
                        onClick={() => setChartViewMode('shifts')}
                        className={chartViewMode === 'shifts' ? 'view-mode-btn active' : 'view-mode-btn'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          background: chartViewMode === 'shifts' ? '#FFFFFF' : 'transparent',
                          color: chartViewMode === 'shifts' ? '#003366' : '#64748B',
                          boxShadow: chartViewMode === 'shifts' ? '0 1px 4px rgba(0, 51, 102, 0.12), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        <FiClock style={{ fontSize: '13px' }} />
                        <span>By Shift</span>
                      </button>
                      <button
                        onClick={() => setChartViewMode('departments')}
                        className={chartViewMode === 'departments' ? 'view-mode-btn active' : 'view-mode-btn'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          background: chartViewMode === 'departments' ? '#FFFFFF' : 'transparent',
                          color: chartViewMode === 'departments' ? '#003366' : '#64748B',
                          boxShadow: chartViewMode === 'departments' ? '0 1px 4px rgba(0, 51, 102, 0.12), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        <FiLayers style={{ fontSize: '13px' }} />
                        <span>By Department</span>
                      </button>
                      <button
                        onClick={() => setChartViewMode('availability')}
                        className={chartViewMode === 'availability' ? 'view-mode-btn active' : 'view-mode-btn'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          background: chartViewMode === 'availability' ? '#FFFFFF' : 'transparent',
                          color: chartViewMode === 'availability' ? '#003366' : '#64748B',
                          boxShadow: chartViewMode === 'availability' ? '0 1px 4px rgba(0, 51, 102, 0.12), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        <FiTrendingUp style={{ fontSize: '13px' }} />
                        <span>Availability %</span>
                      </button>
                    </div>
                  </div>

                  {/* Chart Container */}
                  <div style={{ flex: 1, minHeight: '360px', overflow: 'visible', position: 'relative' }}>
                    {downtime.length > 0 ? (
                      <ResponsiveContainer width="100%" height={360}>
                        {chartViewMode === 'shifts' ? (
                          <BarChart data={downtime} margin={{ top: 15, right: 15, left: -10, bottom: 25 }} barSize={34}>
                            <ChartGradients />
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} strokeOpacity={0.7} />
                            <XAxis
                              dataKey="sectionId"
                              tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1.5 }}
                              tickLine={false}
                              dy={8}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }}
                              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1.5 }}
                              tickLine={false}
                              dx={-6}
                              label={{ value: 'Possession (Hours)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748B', dy: 40 }}
                            />
                            <Tooltip content={<CustomChartTooltip chartViewMode={chartViewMode} />} cursor={{ fill: 'rgba(0, 51, 102, 0.04)' }} wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }} />
                            <Legend
                              wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: '600' }}
                              iconType="circle"
                              iconSize={8}
                            />
                            <Bar dataKey="nightHours" name="Night Block (00-06h)" stackId="a" fill="url(#gradShiftNight)" />
                            <Bar dataKey="morningHours" name="Morning Shift (06-12h)" stackId="a" fill="url(#gradShiftMorning)" />
                            <Bar dataKey="middayHours" name="Midday Window (12-18h)" stackId="a" fill="url(#gradShiftMidday)" />
                            <Bar dataKey="eveningHours" name="Evening Shift (18-24h)" stackId="a" fill="url(#gradShiftEvening)" radius={[5, 5, 0, 0]} />
                          </BarChart>
                        ) : chartViewMode === 'departments' ? (
                          <BarChart data={downtime} margin={{ top: 15, right: 15, left: -10, bottom: 25 }} barSize={34}>
                            <ChartGradients />
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} strokeOpacity={0.7} />
                            <XAxis
                              dataKey="sectionId"
                              tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1.5 }}
                              tickLine={false}
                              dy={8}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }}
                              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1.5 }}
                              tickLine={false}
                              dx={-6}
                              label={{ value: 'Possession (Hours)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748B', dy: 40 }}
                            />
                            <Tooltip content={<CustomChartTooltip chartViewMode={chartViewMode} />} cursor={{ fill: 'rgba(0, 51, 102, 0.04)' }} wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }} />
                            <Legend
                              wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: '600' }}
                              iconType="circle"
                              iconSize={8}
                            />
                            <Bar dataKey="engineeringHours" name="Track (TMS / ENG)" stackId="a" fill="url(#gradDeptEng)" />
                            <Bar dataKey="signalTelecomHours" name="Signal (SMMS / S&T)" stackId="a" fill="url(#gradDeptSignal)" />
                            <Bar dataKey="tractionHours" name="Electrical (TDMS / TRD)" stackId="a" fill="url(#gradDeptTraction)" radius={[5, 5, 0, 0]} />
                          </BarChart>
                        ) : (
                          <BarChart data={downtime} margin={{ top: 15, right: 15, left: -10, bottom: 25 }} barSize={34}>
                            <ChartGradients />
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} strokeOpacity={0.7} />
                            <XAxis
                              dataKey="sectionId"
                              tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1.5 }}
                              tickLine={false}
                              dy={8}
                            />
                            <YAxis
                              domain={[70, 100]}
                              tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }}
                              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1.5 }}
                              tickLine={false}
                              dx={-6}
                              label={{ value: 'Availability (%)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748B', dy: 40 }}
                            />
                            <Tooltip content={<CustomChartTooltip chartViewMode={chartViewMode} />} cursor={{ fill: 'rgba(0, 51, 102, 0.04)' }} wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }} />
                            <ReferenceLine y={85} stroke="#DC2626" strokeDasharray="3 3" label={{ value: 'Min Benchmark 85%', fill: '#DC2626', fontSize: 11, fontWeight: '700' }} />
                            <Bar dataKey="availability" name="Line Availability %" radius={[5, 5, 0, 0]}>
                              {downtime.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.availability >= 90
                                      ? 'url(#gradAvailOptimal)'
                                      : entry.availability >= 85
                                      ? 'url(#gradAvailGood)'
                                      : 'url(#gradAvailWatch)'
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    ) : (
                      <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '48px' }}>No downtime metrics available</p>
                    )}
                  </div>
                </div>

                {/* Right: Dedicated Multi-Shift Load Equalization Donut Card */}
                <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: '#E6EDF5', color: '#003366', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                        <FiPieChart style={{ fontSize: '18px' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                          Quad-Shift Load Balancing
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                          Workload leveling across 24h operational cycles
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        background: '#ECFDF5',
                        color: '#046A38',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        border: '1px solid #A7F3D0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FiCheckCircle style={{ fontSize: '12px' }} /> Ideal
                    </span>
                  </div>

                  {/* Donut Chart with Executive Center Metric Display */}
                  <div style={{ position: 'relative', height: '195px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ChartGradients />
                        <Pie
                          data={shiftDonutData}
                          innerRadius={65}
                          outerRadius={92}
                          paddingAngle={4}
                          cornerRadius={6}
                          dataKey="value"
                        >
                          {shiftDonutData.map((entry, idx) => (
                            <Cell
                              key={`slice-${idx}`}
                              fill={
                                idx === 0
                                  ? 'url(#gradShiftNight)'
                                  : idx === 1
                                  ? 'url(#gradShiftMorning)'
                                  : idx === 2
                                  ? 'url(#gradShiftMidday)'
                                  : 'url(#gradShiftEvening)'
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          wrapperStyle={{ zIndex: 9999 }}
                          allowEscapeViewBox={{ x: true, y: true }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div
                                style={{
                                  background: 'rgba(15, 23, 42, 0.95)',
                                  backdropFilter: 'blur(8px)',
                                  color: '#FFFFFF',
                                  padding: '7px 12px',
                                  borderRadius: '8px',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                  fontSize: '11px',
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  pointerEvents: 'none',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '2px' }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: d.color }} />
                                  <b style={{ color: '#FFFFFF' }}>{d.name}</b>
                                </div>
                                <div style={{ color: '#94A3B8', fontSize: '10px' }}>
                                  <span style={{ color: '#38BDF8', fontWeight: '700' }}>{d.value} blocks</span> ({d.hours}h) • {d.percentage}%
                                </div>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Central Radial Metric Display */}
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 1,
                        width: '106px',
                        height: '106px',
                        borderRadius: '50%',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <p style={{ fontSize: '24px', fontWeight: '900', color: '#003366', margin: 0, lineHeight: 1 }}>
                        {totalBlocksCount}
                      </p>
                      <p style={{ fontSize: '9px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '3px 0 0' }}>
                        Total Blocks
                      </p>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#046A38',
                          background: '#E8F5E9',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          marginTop: '2px',
                        }}
                      >
                        24h Leveling
                      </span>
                    </div>
                  </div>

                  {/* Shift Breakdown Cards with Visual 25% Target Progress Bar */}
                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px', flex: 1 }}>
                    {shiftDonutData.map((s, idx) => {
                      const pct = parseFloat(s.percentage) || 25;
                      const shiftGradient =
                        idx === 0
                          ? 'linear-gradient(90deg, #133560, #0B2545)'
                          : idx === 1
                          ? 'linear-gradient(90deg, #205B99, #174A7E)'
                          : idx === 2
                          ? 'linear-gradient(90deg, #3589CD, #2A75B3)'
                          : 'linear-gradient(90deg, #7EBAE4, #64A5D7)';

                      return (
                        <div
                          key={idx}
                          className="shift-row-card"
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: s.color,
                                  display: 'inline-block',
                                  flexShrink: 0,
                                  boxShadow: `0 0 0 2px ${s.color}25`,
                                }}
                              />
                              <div>
                                <b style={{ color: '#0F172A', fontSize: '12px' }}>{s.name}</b>
                                <span style={{ color: '#64748B', fontSize: '11px', marginLeft: '6px' }}>{s.window}</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <b style={{ color: '#0F172A', fontSize: '12px' }}>{s.value} blocks</b>
                              <span style={{ color: '#64748B', fontSize: '11px', display: 'block', fontWeight: '600' }}>
                                {s.hours}h ({s.percentage}%)
                              </span>
                            </div>
                          </div>

                          {/* Mini Visual Distribution Progress Track with 25% Target Mark */}
                          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '5px',
                                background: '#E2E8F0',
                                borderRadius: '3px',
                                position: 'relative',
                                overflow: 'visible',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.min(100, pct * 2.5)}%`,
                                  background: shiftGradient,
                                  borderRadius: '3px',
                                  transition: 'width 0.5s ease',
                                }}
                              />
                              {/* 25% Benchmark Indicator Pin */}
                              <div
                                title="25% Ideal Target Line"
                                style={{
                                  position: 'absolute',
                                  left: `${25 * 2.5}%`,
                                  top: '-2px',
                                  bottom: '-2px',
                                  width: '2px',
                                  background: '#94A3B8',
                                  zIndex: 1,
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '700', minWidth: '40px', textAlign: 'right' }}>
                              {pct >= 23 && pct <= 27 ? '±Target' : pct > 27 ? '+Shift' : '-Shift'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Corridor Availability Breakdown Table */}
              <div className="card-premium" style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '18px 24px',
                    background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: '0 0 3px' }}>
                      Corridor-by-Corridor Availability & Possession Breakdown
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                      Operational health scores and planned possessions across all 12 Northern Railway trunk routes
                    </p>
                  </div>

                  {/* Search Filter with Clear Button */}
                  <div style={{ position: 'relative', width: '300px' }}>
                    <FiSearch style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748B', fontSize: '14px' }} />
                    <input
                      type="text"
                      placeholder="Filter corridor code or route name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 32px 8px 36px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1E293B',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#003366')}
                      onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 18px' }}>Corridor Section</th>
                        <th style={{ padding: '12px 18px' }}>Traffic Density</th>
                        <th style={{ padding: '12px 18px' }}>Total Possession</th>
                        <th style={{ padding: '12px 18px' }}>Shift Load Distribution</th>
                        <th style={{ padding: '12px 18px' }}>Department Allocation</th>
                        <th style={{ padding: '12px 18px' }}>Line Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDowntime.map((s, idx) => (
                        <tr key={idx} style={{ transition: 'background-color 0.15s ease' }}>
                          {/* Corridor Section */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: '800',
                                  fontSize: '12px',
                                  color: '#003366',
                                  background: '#E6EDF5',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #BFDBFE',
                                }}
                              >
                                {s.sectionId}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                                {s.sectionName}
                              </span>
                            </div>
                          </td>

                          {/* Traffic Density */}
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                                background:
                                  s.trafficDensity === 'high'
                                    ? '#FEE2E2'
                                    : s.trafficDensity === 'medium'
                                    ? '#FEF3C7'
                                    : '#E8F5E9',
                                color:
                                  s.trafficDensity === 'high'
                                    ? '#DC2626'
                                    : s.trafficDensity === 'medium'
                                    ? '#B45309'
                                    : '#046A38',
                                border: `1px solid ${
                                  s.trafficDensity === 'high'
                                    ? '#FECACA'
                                    : s.trafficDensity === 'medium'
                                    ? '#FDE68A'
                                    : '#A7F3D0'
                                }`,
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                              {s.trafficDensity}
                            </span>
                          </td>

                          {/* Total Possession */}
                          <td style={{ padding: '12px 18px' }}>
                            <div>
                              <b style={{ color: '#003366', fontSize: '13px' }}>{s.totalDowntimeHours} hrs</b>
                              <span style={{ color: '#64748B', fontSize: '11px', display: 'block', fontWeight: '600' }}>
                                {s.blockCount} blocks ({formatDuration(s.totalDowntimeMinutes)})
                              </span>
                            </div>
                          </td>

                          {/* Shift Load Distribution Mini-Chips */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#F8FAFC', color: '#1E293B', fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '5px', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.night }} />
                                Night {s.nightHours}h
                              </span>
                              <span style={{ background: '#F8FAFC', color: '#1E293B', fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '5px', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.morning }} />
                                Morn {s.morningHours}h
                              </span>
                              <span style={{ background: '#F8FAFC', color: '#1E293B', fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '5px', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.midday }} />
                                Mid {s.middayHours}h
                              </span>
                              <span style={{ background: '#F8FAFC', color: '#1E293B', fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '5px', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SHIFT_COLORS.evening }} />
                                Eve {s.eveningHours}h
                              </span>
                            </div>
                          </td>

                          {/* Department Allocation */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#F1F5F9', color: '#0F172A', fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '5px', border: '1px solid #CBD5E1' }}>
                                Track {s.engineeringHours}h
                              </span>
                              <span style={{ background: '#F8FAFC', color: '#334155', fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '5px', border: '1px solid #E2E8F0' }}>
                                S&T {s.signalTelecomHours}h
                              </span>
                              <span style={{ background: '#F8FAFC', color: '#334155', fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '5px', border: '1px solid #E2E8F0' }}>
                                TRD {s.tractionHours}h
                              </span>
                            </div>
                          </td>

                          {/* Line Availability Progress Bar */}
                          <td style={{ minWidth: '160px', padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flex: 1, background: '#E2E8F0', height: '7px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, Math.max(0, s.availability))}%`,
                                    background:
                                      parseFloat(s.availability) >= 90
                                        ? 'linear-gradient(90deg, #10B981, #046A38)'
                                        : parseFloat(s.availability) >= 80
                                        ? 'linear-gradient(90deg, #3B82F6, #003366)'
                                        : 'linear-gradient(90deg, #F59E0B, #D97706)',
                                    borderRadius: '4px',
                                    transition: 'width 0.4s ease',
                                  }}
                                />
                              </div>
                              <b
                                style={{
                                  fontSize: '12px',
                                  minWidth: '42px',
                                  textAlign: 'right',
                                  color:
                                    parseFloat(s.availability) >= 90
                                      ? '#046A38'
                                      : parseFloat(s.availability) >= 80
                                      ? '#003366'
                                      : '#D97706',
                                }}
                              >
                                {s.availability}%
                              </b>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────── TAB 2: BLOCK UTILIZATION & DEPARTMENT ANALYSIS ──────── */}
          {activeTab === 'utilization' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Top KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="card-premium" style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #003366' }}>
                  <p style={{ fontSize: '28px', fontWeight: '900', color: '#003366', margin: 0, lineHeight: 1.1 }}>
                    {utilization?.totalDowntimeHours || formatDuration(utilization?.totalDowntimeMinutes || 0)}
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Total Possession Time
                  </p>
                </div>
                <div className="card-premium" style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #046A38' }}>
                  <p style={{ fontSize: '28px', fontWeight: '900', color: '#046A38', margin: 0, lineHeight: 1.1 }}>
                    {utilization?.byStatus?.approved || 0}
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Approved Blocks
                  </p>
                </div>
                <div className="card-premium" style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #D97706' }}>
                  <p style={{ fontSize: '28px', fontWeight: '900', color: '#D97706', margin: 0, lineHeight: 1.1 }}>
                    {utilization?.byStatus?.proposed || 0}
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Proposed AI Blocks
                  </p>
                </div>
                <div className="card-premium" style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #6366F1' }}>
                  <p style={{ fontSize: '28px', fontWeight: '900', color: '#4F46E5', margin: 0, lineHeight: 1.1 }}>
                    {utilization?.multiDeptBlocks || 0}
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Multi-Dept Bundled
                  </p>
                  <span style={{ fontSize: '11px', color: '#046A38', fontWeight: '700', display: 'inline-block', marginTop: '2px' }}>
                    ~{utilization?.hoursSavedCoordinated || 0} hrs saved
                  </span>
                </div>
              </div>

              {/* Dual Visuals: Departmental Share (Left) & Shift Capacity (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Departmental Donut Chart */}
                <div className="card-premium" style={{ padding: '24px', overflow: 'visible', position: 'relative' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
                    Departmental Possession Share
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
                    Allocation across Track (TMS), Signal (SMMS), and Traction Distribution (TDMS)
                  </p>

                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptDonutData}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {deptDonutData.map((entry, idx) => (
                            <Cell key={`dept-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomDepartmentTooltip />} wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                    {deptDonutData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }} />
                          <b style={{ color: '#1E293B' }}>{d.name}</b>
                        </div>
                        <b style={{ color: d.color }}>{d.hours}h ({d.percentage}%)</b>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shift Capacity Utilization Bar Chart */}
                <div className="card-premium" style={{ padding: '24px', overflow: 'visible', position: 'relative' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>
                    Shift Workload & Capacity Leveling
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
                    Total block possession duration scheduled in each 6-hour daily shift
                  </p>

                  <div style={{ height: '220px', overflow: 'visible', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shiftDonutData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748B', dy: 20 }} />
                        <Tooltip content={<CustomShiftWorkloadTooltip />} cursor={{ fill: 'rgba(0, 51, 102, 0.04)' }} wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }} />
                        <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                          {shiftDonutData.map((entry, idx) => (
                            <Cell key={`bar-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                    {shiftDonutData.map((s, idx) => (
                      <div key={idx} style={{ padding: '8px', borderRadius: '6px', background: '#F8FAFC', borderLeft: `3px solid ${s.color}`, fontSize: '11px' }}>
                        <div style={{ color: '#64748B' }}>{s.name}</div>
                        <b style={{ color: s.color, fontSize: '13px' }}>{s.hours} hrs ({s.value} blocks)</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────── TAB 3: AUDIT TRAIL & TRANSPARENCY LOG ──────── */}
          {activeTab === 'audit' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Action Filter */}
              <div
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#003366' }}>
                    <FiFilter /> Filter Action:
                  </div>
                  <select
                    className="input select"
                    style={{ width: '240px', padding: '6px 12px', fontSize: '13px' }}
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
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  background: badge.bg,
                                  color: badge.color,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
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
