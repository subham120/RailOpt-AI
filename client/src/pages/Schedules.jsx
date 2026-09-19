import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { scheduleAPI, reportAPI, timetableAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, STATUS_CONFIG, formatDuration } from '../utils/constants';
import {
  FiGrid,
  FiList,
  FiZap,
  FiDownload,
  FiMoon,
  FiSunrise,
  FiSun,
  FiSunset,
  FiClock,
  FiCalendar,
  FiCheckCircle,
  FiAlertTriangle,
  FiShield,
  FiLayers,
  FiCheck,
  FiX,
  FiInfo,
  FiSearch,
} from 'react-icons/fi';

export default function Schedules() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const targetScheduleId = searchParams.get('scheduleId') || '';
  const targetCorridor = searchParams.get('corridor') || searchParams.get('section') || '';
  const targetTaskId = searchParams.get('taskId') || '';
  const urlSearch = searchParams.get('search') || '';
  const targetTrain = searchParams.get('train') || '';

  const { canApprove, activeZone } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState('gantt'); // 'gantt' | 'table'
  const [planType, setPlanType] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [selectedShift, setSelectedShift] = useState('all'); // for daily: 'all' | 'night' | 'morning' | 'midday' | 'evening'
  const [selectedDay, setSelectedDay] = useState('all'); // for weekly: 'all' | '0'..'6'
  const [selectedWeek, setSelectedWeek] = useState('all'); // for monthly: 'all' | '1'..'4'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterSection, setFilterSection] = useState(targetCorridor || '');
  const [searchTerm, setSearchTerm] = useState(urlSearch || targetScheduleId || targetTaskId || '');
  const [toast, setToast] = useState(null);

  // Real-Time Conflict Detector State
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictForm, setConflictForm] = useState({
    sectionId: targetCorridor || 'ALD-MGS',
    startTime: '05:30',
    endTime: '08:00',
    dayOfWeek: 1,
  });
  const [conflictResult, setConflictResult] = useState(null);
  const [conflictChecking, setConflictChecking] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const runConflictCheck = async (overrideParams) => {
    setConflictChecking(true);
    try {
      const sec = overrideParams?.sectionId || conflictForm.sectionId;
      const startStr = overrideParams?.startTime || conflictForm.startTime;
      const endStr = overrideParams?.endTime || conflictForm.endTime;
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;

      const res = await timetableAPI.checkConflict({
        section_id: sec,
        window_start_min: sMin,
        window_end_min: eMin,
        day_of_week: conflictForm.dayOfWeek,
      });
      setConflictResult(res.data);
      if (res.data?.hasConflict) {
        showToast(`⚠️ Conflict Detected: ${res.data.conflicts.length} train overlap(s)`, 'error');
      } else {
        showToast('✅ Clear: No train conflicts in this window!', 'success');
      }
    } catch (err) {
      showToast('Conflict check failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setConflictChecking(false);
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (activeZone && activeZone !== 'ALL') {
        params.zone = activeZone;
      }
      const res = await scheduleAPI.getAll(params);
      setSchedules(res.data.data || []);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [activeZone]);

  // Deep-linking URL parameter synchronization effect
  useEffect(() => {
    if (!schedules.length) return;

    // 1. Direct Schedule ID link
    if (targetScheduleId) {
      const q = targetScheduleId.toLowerCase();
      const found = schedules.find(s =>
        (s.scheduleId && s.scheduleId.toLowerCase() === q) ||
        (s._id && s._id.toLowerCase() === q) ||
        (s.scheduleId && s.scheduleId.toLowerCase().includes(q))
      );
      if (found) {
        if (found.planType && found.planType !== planType) {
          setPlanType(found.planType);
        }
        if (found.sectionId && !filterSection) {
          setFilterSection(found.sectionId);
        }
        setSelectedEvent(found);
        setTimeout(() => {
          const el = document.getElementById(`sched-item-${found.scheduleId || found._id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 350);
      }
    }
    // 2. Direct Task ID link
    else if (targetTaskId) {
      const q = targetTaskId.toLowerCase();
      const found = schedules.find(s =>
        (s.taskIds && s.taskIds.some(tid => tid.toLowerCase() === q)) ||
        (s.tasks && s.tasks.some(t => (t.taskId || t.task_id || '').toLowerCase() === q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
      if (found) {
        if (found.planType && found.planType !== planType) {
          setPlanType(found.planType);
        }
        if (found.sectionId) {
          setFilterSection(found.sectionId);
        }
        setSelectedEvent(found);
        setTimeout(() => {
          const el = document.getElementById(`sched-item-${found.scheduleId || found._id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 350);
      }
    }
    // 3. Direct Corridor link
    else if (targetCorridor) {
      setFilterSection(targetCorridor);
    }

    // 4. Direct Train link
    if (targetTrain) {
      setShowConflictModal(true);
      const sec = targetCorridor || 'NDLS-GZB';
      setConflictForm(prev => ({ ...prev, sectionId: sec }));
      runConflictCheck({ sectionId: sec, startTime: '00:30', endTime: '04:30' });
      showToast(`Inspecting train schedule and conflicts for Train ${targetTrain}`);
    }
  }, [schedules, targetScheduleId, targetCorridor, targetTaskId, targetTrain]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const payload = {
        planType,
        plan_type: planType,
        ...(activeZone && activeZone !== 'ALL' ? { zone: activeZone } : {}),
      };
      const res = await scheduleAPI.generate(payload);
      await fetchSchedules();
      const count = res.data.summary?.total || res.data.data?.length || 0;
      showToast(`RailOpt AI: Generated ${count} ${planType.toUpperCase()} block schedules.`);
    } catch (err) {
      showToast('Optimization failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await scheduleAPI.approve(id);
      setSchedules(prev => prev.map(s => s._id === id ? { ...s, status: 'approved' } : s));
      if (selectedEvent?._id === id) {
        setSelectedEvent(prev => ({ ...prev, status: 'approved' }));
      }
      showToast('Block schedule approved successfully');
    } catch (err) {
      showToast('Approval failed: ' + err.message, 'error');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
      await scheduleAPI.reject(id, { reason });
      setSchedules(prev => prev.map(s => s._id === id ? { ...s, status: 'rejected' } : s));
      if (selectedEvent?._id === id) {
        setSelectedEvent(prev => ({ ...prev, status: 'rejected' }));
      }
      showToast('Block schedule rejected');
    } catch (err) {
      showToast('Rejection failed: ' + err.message, 'error');
    }
  };

  const handleExport = async (format) => {
    try {
      if (format === 'xlsx') {
        const res = await reportAPI.exportReport({
          type: 'schedules',
          format: 'xlsx',
          planType,
          department: filterDept || undefined,
          sectionId: filterSection || undefined,
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `railopt_schedules_${planType}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        showToast(`Exported ${planType.toUpperCase()} schedules to Excel successfully`);
      }
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  // Helper to categorize time shift for daily view
  const getShiftCategory = (window) => {
    if (!window?.start) return 'night';
    const hour = new Date(window.start).getHours();
    if (hour >= 0 && hour < 6) return 'night';
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'midday';
    return 'evening';
  };

  // Filter schedules by horizon, shift/day/week, department, section, and keyword search
  const filteredSchedules = schedules.filter(s => {
    const sPlan = s.planType || 'weekly';
    const isTargetSched = targetScheduleId && (
      (s.scheduleId && s.scheduleId.toLowerCase() === targetScheduleId.toLowerCase()) ||
      (s._id && s._id.toLowerCase() === targetScheduleId.toLowerCase())
    );

    // If this is the directly targeted schedule, keep it visible regardless of sub-filters
    if (isTargetSched) return true;

    if (sPlan !== planType) return false;
    if (filterDept && !(s.departments || []).includes(filterDept)) return false;
    if (filterSection && s.sectionId !== filterSection) return false;

    // Search term filter (matches scheduleId, section, department, tasks, description)
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const sId = (s.scheduleId || '').toLowerCase();
      const sec = (s.sectionName || s.sectionId || '').toLowerCase();
      const depts = (s.departments || []).join(' ').toLowerCase();
      const taskMatches = (s.taskIds || []).some(tid => tid.toLowerCase().includes(q)) ||
                          (s.tasks || []).some(t => (t.taskId || t.task_id || '').toLowerCase().includes(q));
      const desc = (s.defectType || s.description || '').toLowerCase();
      if (!sId.includes(q) && !sec.includes(q) && !depts.includes(q) && !taskMatches && !desc.includes(q)) {
        return false;
      }
    }

    // Daily Shift filter
    if (planType === 'daily' && selectedShift !== 'all' && !targetScheduleId) {
      const shift = getShiftCategory(s.assignedWindow);
      if (shift !== selectedShift) return false;
    }

    // Weekly Day filter
    if (planType === 'weekly' && selectedDay !== 'all' && !targetScheduleId) {
      if (!s.assignedWindow?.start) return false;
      const d = new Date(s.assignedWindow.start).getDay();
      if (d.toString() !== selectedDay) return false;
    }

    return true;
  });

  // Unique sections for Y-axis
  const sections = Array.from(new Set(schedules.map(s => s.sectionId || 'Unknown'))).sort();

  // Daily Shifts Config
  const DAILY_SHIFTS = [
    { id: 'all', label: '24-Hour Horizon', icon: null },
    { id: 'night', label: 'Night Block (00:00 - 06:00)', icon: FiMoon },
    { id: 'morning', label: 'Morning Shift (06:00 - 12:00)', icon: FiSunrise },
    { id: 'midday', label: 'Midday Window (12:00 - 18:00)', icon: FiSun },
    { id: 'evening', label: 'Evening Shift (18:00 - 24:00)', icon: FiSunset },
  ];

  // Weekly Days Config
  const DAYS_OF_WEEK = [
    { id: 'all', label: 'All 7 Days' },
    { id: '1', label: 'Mon', full: 'Monday' },
    { id: '2', label: 'Tue', full: 'Tuesday' },
    { id: '3', label: 'Wed', full: 'Wednesday' },
    { id: '4', label: 'Thu', full: 'Thursday' },
    { id: '5', label: 'Fri', full: 'Friday' },
    { id: '6', label: 'Sat', full: 'Saturday' },
    { id: '0', label: 'Sun', full: 'Sunday' },
  ];

  // Monthly Weeks Config
  const MONTHLY_WEEKS = [
    { id: 'all', label: 'Entire Month (Weeks 1–4)' },
    { id: '1', label: 'Week 1 (Days 1–7)' },
    { id: '2', label: 'Week 2 (Days 8–14)' },
    { id: '3', label: 'Week 3 (Days 15–21)' },
    { id: '4', label: 'Week 4 (Days 22–30)' },
  ];

  // Formatting helpers
  const formatTimeRange = (window) => {
    if (!window?.start || !window?.end) return 'TBD';
    const s = new Date(window.start);
    const e = new Date(window.end);
    const sStr = s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const eStr = e.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${sStr} - ${eStr}`;
  };

  const formatDateLabel = (window) => {
    if (!window?.start) return '';
    const s = new Date(window.start);
    return s.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  };

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

      {/* Header & Main Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', margin: '0 0 4px' }}>
            RailOpt AI Automatic Block Planning & Schedule Optimizer
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            {planType === 'daily'
              ? '24-Hour Tactical Daily Possession Schedule (Shift-Wise Execution)'
              : planType === 'weekly'
              ? 'Short-Term 7-Day Weekly Day-Wise Block Schedule'
              : 'Long-Term Monthly Multi-Horizon Corridor Schedule'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle (Gantt vs Table) */}
          <div style={{ display: 'flex', background: '#E5E7EB', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => setViewMode('gantt')}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
                background: viewMode === 'gantt' ? '#003366' : 'transparent',
                color: viewMode === 'gantt' ? 'white' : '#4B5563',
                transition: 'all 0.2s',
              }}
            >
              <FiGrid /> Gantt Matrix
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
                background: viewMode === 'table' ? '#003366' : 'transparent',
                color: viewMode === 'table' ? 'white' : '#4B5563',
                transition: 'all 0.2s',
              }}
            >
              <FiList /> Table List
            </button>
          </div>

          {/* 3-Tier Multi-Horizon Switcher (Daily, Weekly, Monthly) */}
          <div style={{ display: 'flex', border: '2px solid #003366', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => { setPlanType('daily'); setSelectedShift('all'); }}
              style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                background: planType === 'daily' ? '#003366' : 'white',
                color: planType === 'daily' ? 'white' : '#003366',
                borderRight: '1px solid #003366',
                transition: 'all 0.2s',
              }}
            >
              Daily
            </button>
            <button
              onClick={() => { setPlanType('weekly'); setSelectedDay('all'); }}
              style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                background: planType === 'weekly' ? '#003366' : 'white',
                color: planType === 'weekly' ? 'white' : '#003366',
                borderRight: '1px solid #003366',
                transition: 'all 0.2s',
              }}
            >
              Weekly
            </button>
            <button
              onClick={() => { setPlanType('monthly'); setSelectedWeek('all'); }}
              style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                background: planType === 'monthly' ? '#003366' : 'white',
                color: planType === 'monthly' ? 'white' : '#003366',
                borderRight: '1px solid #003366',
                transition: 'all 0.2s',
              }}
            >
              Monthly
            </button>
          </div>

          {canApprove && (
            <button className="btn btn-green" onClick={handleGenerate} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiZap />
              {generating ? 'Optimizing...' : `Optimize ${planType.toUpperCase()} Plan`}
            </button>
          )}


          <button className="btn btn-outline btn-sm" onClick={() => handleExport('xlsx')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiDownload /> Export Excel
          </button>
        </div>
      </div>

      {/* Sub-Horizon Filter Pills */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', textTransform: 'uppercase' }}>
          {planType === 'daily' ? 'Shift Window:' : planType === 'weekly' ? 'Day of Week:' : 'Planning Horizon:'}
        </span>

        {planType === 'daily' ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DAILY_SHIFTS.map(s => {
              const IconComp = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedShift(s.id)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px',
                    border: selectedShift === s.id ? '2px solid #003366' : '1px solid #D1D5DB',
                    background: selectedShift === s.id ? '#003366' : '#FFFFFF',
                    color: selectedShift === s.id ? '#FFFFFF' : '#4B5563',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {IconComp && <IconComp style={{ fontSize: '13px' }} />}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        ) : planType === 'weekly' ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DAYS_OF_WEEK.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                style={{
                  padding: '6px 14px', borderRadius: '20px',
                  border: selectedDay === d.id ? '2px solid #003366' : '1px solid #D1D5DB',
                  background: selectedDay === d.id ? '#003366' : '#FFFFFF',
                  color: selectedDay === d.id ? '#FFFFFF' : '#4B5563',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {MONTHLY_WEEKS.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWeek(w.id)}
                style={{
                  padding: '6px 14px', borderRadius: '20px',
                  border: selectedWeek === w.id ? '2px solid #003366' : '1px solid #D1D5DB',
                  background: selectedWeek === w.id ? '#003366' : '#FFFFFF',
                  color: selectedWeek === w.id ? '#FFFFFF' : '#4B5563',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter & Legend Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Filters & Search */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          {/* Quick Search Box */}
          <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', flex: 1 }}>
            <FiSearch style={{ position: 'absolute', left: '10px', top: '10px', color: '#9CA3AF' }} />
            <input
              type="text"
              className="input"
              placeholder="Search schedule ID, task, section..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '13px', width: '100%' }}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchParams({});
                }}
                style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <FiX />
              </button>
            )}
          </div>

          <select
            className="input select"
            style={{ width: '170px', padding: '6px 12px', fontSize: '13px' }}
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {Object.keys(DEPARTMENTS).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="input select"
            style={{ width: '170px', padding: '6px 12px', fontSize: '13px' }}
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
          >
            <option value="">All Corridors</option>
            {sections.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Active target pills */}
          {targetScheduleId && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#EEF2FF', border: '1px solid #C7D2FE',
              padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '700', color: '#4338CA',
            }}>
              <span>🎯 Schedule: {targetScheduleId}</span>
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.delete('scheduleId');
                  setSearchParams(p);
                  setSearchTerm('');
                }}
                style={{ background: 'none', border: 'none', color: '#4338CA', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <FiX />
              </button>
            </div>
          )}

          {targetTaskId && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#EFF6FF', border: '1px solid #93C5FD',
              padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '700', color: '#1D4ED8',
            }}>
              <span>🔧 Task: {targetTaskId}</span>
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.delete('taskId');
                  setSearchParams(p);
                  setSearchTerm('');
                }}
                style={{ background: 'none', border: 'none', color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <FiX />
              </button>
            </div>
          )}

          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>
            {filteredSchedules.length} block sessions active in {planType} view
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {Object.entries(DEPARTMENTS).map(([name, cfg]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: cfg.color }} />
              <span style={{ fontSize: '12px', color: '#4B5563', fontWeight: '500' }}>{cfg.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#6B21A8' }} />
            <span style={{ fontSize: '12px', color: '#4B5563', fontWeight: '600' }}>Multi-Dept (Coordinated)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #E5E7EB', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Loading Block Schedules...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', background: '#FAFCFF', border: '1px dashed #CBD5E1' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            fontSize: '28px', color: '#003366', boxShadow: '0 2px 8px rgba(0, 51, 102, 0.08)'
          }}>
            <FiShield />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px', color: '#0F172A' }}>
            No {planType.toUpperCase()} Block Schedules Found
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '520px', margin: '0 auto 18px', lineHeight: 1.6 }}>
            {selectedShift !== 'all' || filterDept || filterSection
              ? 'No block requests match the current corridor, department, or shift filter.'
              : `No ${planType.toUpperCase()} block schedules are generated yet. Click the button below to have AI optimize and generate possession windows.`}
          </p>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
          >
            <FiZap style={{ color: '#FBBF24' }} />
            <span>{generating ? `AI is Optimizing ${planType.toUpperCase()} Plan...` : `⚡ Generate ${planType.toUpperCase()} Schedule Now`}</span>
          </button>
        </div>
      ) : viewMode === 'gantt' ? (
        /* ─── Modular Staggered Gantt Corridor Grid (Zero Overlaps) ─── */
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#0A2540', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontWeight: '700', fontSize: '14px' }}>
                Corridor Possession Matrix — {planType.toUpperCase()} PLAN
              </span>
              <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '12px' }}>
                ({planType === 'daily'
                  ? selectedShift === 'all' ? '24-Hour Horizon' : DAILY_SHIFTS.find(s => s.id === selectedShift)?.label
                  : planType === 'weekly'
                  ? selectedDay === 'all' ? 'All 7 Days' : DAYS_OF_WEEK.find(d => d.id === selectedDay)?.full
                  : selectedWeek === 'all' ? 'All 4 Weeks' : MONTHLY_WEEKS.find(w => w.id === selectedWeek)?.label})
              </span>
            </div>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>
              Click on any block card to review task items, AI reasoning, or approve
            </span>
          </div>

          {/* Corridor Rows with Structured Block Cards */}
          <div>
            {sections.map((secId, idx) => {
              const sectionBlocks = filteredSchedules.filter(s => s.sectionId === secId);
              if (sectionBlocks.length === 0 && (filterSection || filterDept)) return null;

              const sectionName = sectionBlocks[0]?.sectionName || secId;

              return (
                <div
                  key={secId}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    borderBottom: '1px solid #E5E7EB',
                    background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                  }}
                >
                  {/* Corridor Section Header */}
                  <div style={{ width: '220px', minWidth: '220px', padding: '16px 20px', borderRight: '2px solid #E5E7EB', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#003366', margin: 0 }}>{secId}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '3px 0 0', lineHeight: 1.3 }}>{sectionName}</p>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                      {sectionBlocks.length} scheduled block(s)
                    </span>
                  </div>

                  {/* Block Badges Flow Container */}
                  <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                    {sectionBlocks.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                        No blocks scheduled for this corridor in selected filter
                      </span>
                    ) : (
                      sectionBlocks.map((sched, sIdx) => {
                        const isMulti = (sched.departments || []).length > 1;
                        const primaryDept = sched.departments?.[0] || 'Engineering';
                        const deptCfg = DEPARTMENTS[primaryDept] || { color: '#1A5276', bg: '#E6EDF5' };
                        const isTarget = (targetScheduleId && (
                          (sched.scheduleId && sched.scheduleId.toLowerCase() === targetScheduleId.toLowerCase()) ||
                          (sched._id && sched._id.toLowerCase() === targetScheduleId.toLowerCase())
                        )) || (selectedEvent?._id === sched._id);

                        return (
                          <div
                            key={sched._id || sIdx}
                            id={`sched-item-${sched.scheduleId || sched._id}`}
                            onClick={() => setSelectedEvent(sched)}
                            style={{
                              background: isTarget ? '#F0F9FF' : '#FFFFFF',
                              border: isTarget ? '2px solid #003366' : `1.5px solid ${isMulti ? '#7C3AED' : deptCfg.color}`,
                              borderLeft: isTarget ? '6px solid #FF671F' : `5px solid ${isMulti ? '#6B21A8' : deptCfg.color}`,
                              borderRadius: '8px',
                              padding: '10px 14px',
                              minWidth: '220px',
                              maxWidth: '320px',
                              boxShadow: isTarget ? '0 0 0 3px rgba(0, 51, 102, 0.2), 0 8px 20px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'relative',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = isTarget ? '0 0 0 3px rgba(0, 51, 102, 0.2)' : '0 1px 4px rgba(0,0,0,0.06)';
                            }}
                          >
                            {/* Top row: Date/Shift & Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FiCalendar style={{ fontSize: '12px', color: '#003366' }} />
                                {planType === 'daily' ? 'Today' : formatDateLabel(sched.assignedWindow)}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isTarget && (
                                  <span style={{
                                    fontSize: '9px', fontWeight: '800', background: '#003366', color: '#FFFFFF',
                                    padding: '2px 5px', borderRadius: '3px'
                                  }}>
                                    TARGET
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                                  padding: '2px 6px', borderRadius: '4px',
                                  background: STATUS_CONFIG[sched.status]?.bg || '#F3F4F6',
                                  color: STATUS_CONFIG[sched.status]?.color || '#4B5563',
                                }}>
                                  {sched.status}
                                </span>
                              </div>
                            </div>

                            {/* Middle row: Time Window & Duration */}
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#003366', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <FiClock style={{ fontSize: '13px' }} />
                              {formatTimeRange(sched.assignedWindow)} ({formatDuration(sched.totalDurationMinutes)})
                            </div>

                            {/* TTT Conflict Alert Badge */}
                            {sched.tttConflicts && sched.tttConflicts.length > 0 && (
                              <div style={{
                                background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C',
                                borderRadius: '4px', padding: '3px 6px', fontSize: '10px', fontWeight: '700',
                                marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px'
                              }}>
                                <span>⚠️ TTT Conflict:</span>
                                <span>{sched.tttConflicts.length} train overlap(s)</span>
                              </div>
                            )}

                            {/* Bottom row: Departments */}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {isMulti ? (
                                <span style={{
                                  fontSize: '10px', fontWeight: '700', background: '#F3E8FF', color: '#6B21A8',
                                  padding: '2px 8px', borderRadius: '4px', border: '1px solid #E9D5FF',
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                }}>
                                  <FiLayers style={{ fontSize: '11px' }} />
                                  Coordinated: {(sched.departments || []).join(' + ')}
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '10px', fontWeight: '600', background: deptCfg.bg, color: deptCfg.color,
                                  padding: '2px 8px', borderRadius: '4px',
                                }}>
                                  {primaryDept}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Table View ─── */
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Schedule ID</th>
                <th>Corridor Section</th>
                <th>Horizon / Shift</th>
                <th>Time Window</th>
                <th>Duration</th>
                <th>Departments</th>
                <th>Optimizer Score</th>
                <th>Status</th>
                <th>Review Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((s, i) => {
                const isTarget = (targetScheduleId && (
                  (s.scheduleId && s.scheduleId.toLowerCase() === targetScheduleId.toLowerCase()) ||
                  (s._id && s._id.toLowerCase() === targetScheduleId.toLowerCase())
                )) || (selectedEvent?._id === s._id);

                return (
                  <tr
                    key={s._id || i}
                    id={`sched-item-${s.scheduleId || s._id}`}
                    style={{
                      cursor: 'pointer',
                      background: isTarget ? '#EFF6FF' : 'transparent',
                      borderLeft: isTarget ? '4px solid #003366' : '4px solid transparent',
                    }}
                    onClick={() => setSelectedEvent(s)}
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#003366' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{s.scheduleId}</span>
                        {isTarget && (
                          <span style={{ fontSize: '9px', background: '#003366', color: '#FFFFFF', padding: '1px 5px', borderRadius: '3px', fontWeight: '800' }}>
                            TARGET
                          </span>
                        )}
                      </div>
                    </td>
                  <td style={{ fontSize: '13px', fontWeight: '600' }}>{s.sectionName || s.sectionId}</td>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDateLabel(s.assignedWindow)}</td>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{formatTimeRange(s.assignedWindow)}</td>
                  <td style={{ fontSize: '13px', fontWeight: '600' }}>{formatDuration(s.totalDurationMinutes)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(s.departments || []).map((d, j) => (
                        <span key={j} style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          background: DEPARTMENTS[d]?.bg || '#F3F4F6', color: DEPARTMENTS[d]?.color || '#6B7280',
                        }}>
                          {DEPARTMENTS[d]?.label || d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: '700', color: '#003366' }}>
                    {Math.round((s.optimizerScore || 0) * 100)}%
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700',
                      background: STATUS_CONFIG[s.status]?.bg || '#F3F4F6',
                      color: STATUS_CONFIG[s.status]?.color || '#6B7280',
                    }}>
                      {STATUS_CONFIG[s.status]?.label || s.status}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {canApprove && s.status === 'proposed' ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-green btn-sm" onClick={() => handleApprove(s._id)}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(s._id)}>Reject</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{s.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px', maxWidth: '600px', width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)', overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
            className="animate-fadeIn"
          >
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #0A2540 0%, #003366 100%)', padding: '22px 28px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {selectedEvent.scheduleId}
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700',
                  background: STATUS_CONFIG[selectedEvent.status]?.bg || '#FFFFFF',
                  color: STATUS_CONFIG[selectedEvent.status]?.color || '#1F2937',
                }}>
                  {STATUS_CONFIG[selectedEvent.status]?.label || selectedEvent.status}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '8px 0 2px' }}>
                {selectedEvent.sectionName || selectedEvent.sectionId}
              </h3>
              <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
                {selectedEvent.planType?.toUpperCase()} POSSESSION WINDOW
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: '600' }}>Scheduled Start</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                    {selectedEvent.assignedWindow?.start ? new Date(selectedEvent.assignedWindow.start).toLocaleString('en-IN') : 'N/A'}
                  </p>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: '600' }}>Scheduled End</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                    {selectedEvent.assignedWindow?.end ? new Date(selectedEvent.assignedWindow.end).toLocaleString('en-IN') : 'N/A'}
                  </p>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: '600' }}>Possession Duration</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                    {formatDuration(selectedEvent.totalDurationMinutes)}
                  </p>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: '600' }}>CP-SAT Optimizer Score</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#003366', margin: 0 }}>
                    {Math.round((selectedEvent.optimizerScore || 0) * 100)}%
                  </p>
                </div>
              </div>

              {/* Departments */}
              <div style={{ marginBottom: '18px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>Participating Railway Departments</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(selectedEvent.departments || []).map((d, i) => (
                    <span key={i} style={{
                      padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                      background: DEPARTMENTS[d]?.bg || '#E6EDF5', color: DEPARTMENTS[d]?.color || '#003366',
                    }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Multi-department badge */}
              {selectedEvent.isMultiDepartment && (
                <div style={{ padding: '12px 16px', background: '#F3E8FF', borderRadius: '8px', marginBottom: '18px', fontSize: '13px', color: '#6B21A8', borderLeft: '4px solid #7C3AED', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <FiLayers style={{ fontSize: '18px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <b>Multi-Department Coordination Benefit:</b> Engineering, TRD, and S&T tasks on this section are scheduled simultaneously, minimizing overall train disruption.
                  </div>
                </div>
              )}

              {/* TTT Conflicts Alert */}
              {selectedEvent.tttConflicts && selectedEvent.tttConflicts.length > 0 && (
                <div style={{
                  padding: '14px 18px', background: '#FEF2F2', borderRadius: '10px',
                  marginBottom: '18px', borderLeft: '4px solid #EF4444', border: '1px solid #FCA5A5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B' }}>
                      Real-Time Train Timetable (TTT) Conflict Detected
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '0 0 10px', lineHeight: 1.4 }}>
                    The following train(s) overlap with this scheduled maintenance window:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedEvent.tttConflicts.map((c, cIdx) => (
                      <div key={cIdx} style={{
                        background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', fontSize: '12px'
                      }}>
                        <span style={{ fontWeight: '700', color: '#991B1B' }}>
                          🚆 Conflict with #{c.trainNo} {c.trainName || ''}
                        </span>
                        <span style={{
                          fontWeight: '700', background: '#FEE2E2', color: '#B91C1C',
                          padding: '2px 8px', borderRadius: '4px'
                        }}>
                          {c.overlapMinutes ? `${c.overlapMinutes} mins overlap` : 'Direct Overlap'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {selectedEvent.aiRecommendation?.reasoning && (
                <div style={{ padding: '12px 16px', background: '#EFF6FF', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#1D4ED8', borderLeft: '4px solid #3B82F6', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <FiInfo style={{ fontSize: '16px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <b>AI Optimizer Constraint Justification:</b><br />
                    {selectedEvent.aiRecommendation.reasoning}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  className="btn"
                  style={{
                    background: '#003366',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '700',
                    fontSize: '13px',
                  }}
                  onClick={() => {
                    const sec = selectedEvent.sectionName || selectedEvent.sectionId || 'Corridor';
                    const sId = selectedEvent.scheduleId || selectedEvent._id || 'Block';
                    navigate('/assistant', {
                      state: {
                        query: `Analyze maintenance block ${sId} on corridor ${sec} (${selectedEvent.totalDurationMinutes || 120} mins). Are there any train timetable conflicts or joint bundling recommendations?`
                      }
                    });
                  }}
                >
                  🤖 Ask AI Advisor
                </button>
                <button className="btn btn-outline" onClick={() => setSelectedEvent(null)}>Close</button>
                {canApprove && selectedEvent.status === 'proposed' && (
                  <>
                    <button className="btn btn-danger" onClick={() => handleReject(selectedEvent._id)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiX /> Reject Block
                    </button>
                    <button className="btn btn-green" onClick={() => handleApprove(selectedEvent._id)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiCheck /> Approve Schedule
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ─── Real-Time Conflict Simulator & Detector Modal ─── */}
      {showConflictModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px',
            backdropFilter: 'blur(5px)',
          }}
          onClick={() => setShowConflictModal(false)}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px', maxWidth: '640px', width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)', overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
            className="animate-fadeIn"
          >
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)', padding: '22px 28px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
                  🇮🇳 DATA SOURCE: data.gov.in (OGD Platform India)
                </span>
                <button
                  onClick={() => setShowConflictModal(false)}
                  style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '10px 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Real-Time Train Conflict Detector
              </h3>
              <p style={{ fontSize: '13px', opacity: 0.9, margin: 0, lineHeight: 1.4 }}>
                Real Indian Railways schedules from <b>data.gov.in</b> (COA Timetable) are mapped to detect live train passage conflicts against planned maintenance blocks.
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>
              {/* Quick Presets */}
              <div style={{ marginBottom: '18px' }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', margin: '0 0 8px', textTransform: 'uppercase' }}>
                  Quick Demonstration Presets
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConflictForm({ sectionId: 'ALD-MGS', startTime: '05:45', endTime: '07:15', dayOfWeek: 1 });
                      runConflictCheck({ sectionId: 'ALD-MGS', startTime: '05:45', endTime: '07:15' });
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #FCA5A5',
                      background: '#FEF2F2', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B', margin: '0 0 2px' }}>
                      🚆 Test #12301 Morning Rajdhani
                    </p>
                    <span style={{ fontSize: '11px', color: '#7F1D1D' }}>
                      ALD-MGS • 05:45 to 07:15 (Overlaps 06:00-06:40)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConflictForm({ sectionId: 'ALD-MGS', startTime: '00:30', endTime: '02:00', dayOfWeek: 1 });
                      runConflictCheck({ sectionId: 'ALD-MGS', startTime: '00:30', endTime: '02:00' });
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #FDE68A',
                      background: '#FFFBEB', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', margin: '0 0 2px' }}>
                      🌙 Test #12424 Night Express
                    </p>
                    <span style={{ fontSize: '11px', color: '#B45309' }}>
                      ALD-MGS • 00:30 to 02:00 (Overlaps 00:45-01:25)
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#4B5563', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Corridor Section
                  </label>
                  <select
                    value={conflictForm.sectionId}
                    onChange={e => setConflictForm(prev => ({ ...prev, sectionId: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', fontWeight: '600' }}
                  >
                    <option value="ALD-MGS">ALD-MGS (Prayagraj - Mughalsarai)</option>
                    <option value="NR-DLI-GZB-01">NR-DLI-GZB-01 (Delhi - Ghaziabad)</option>
                    <option value="NR-GZB-CNB-01">NR-GZB-CNB-01 (Ghaziabad - Kanpur)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#4B5563', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Window Start
                  </label>
                  <input
                    type="time"
                    value={conflictForm.startTime}
                    onChange={e => setConflictForm(prev => ({ ...prev, startTime: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#4B5563', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Window End
                  </label>
                  <input
                    type="time"
                    value={conflictForm.endTime}
                    onChange={e => setConflictForm(prev => ({ ...prev, endTime: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Check Action Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => runConflictCheck()}
                disabled={conflictChecking}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', marginBottom: '18px' }}
              >
                <FiZap style={{ color: '#FBBF24' }} />
                <span>{conflictChecking ? 'Checking Timetable for Overlaps...' : '⚡ Check Live Section Conflict'}</span>
              </button>

              {/* Conflict Result Card */}
              {conflictResult && (
                <div className="animate-fadeIn">
                  {conflictResult.hasConflict ? (
                    <div style={{
                      padding: '16px 20px', background: '#FEF2F2', borderRadius: '10px',
                      border: '1.5px solid #F87171', borderLeft: '6px solid #DC2626'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>⚠️</span>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#991B1B' }}>
                            TTT Conflict Alert Triggered!
                          </span>
                        </div>
                        <span style={{
                          background: '#DC2626', color: 'white', fontSize: '11px',
                          fontWeight: '800', padding: '3px 8px', borderRadius: '4px'
                        }}>
                          BLOCKED
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {conflictResult.conflicts.map((c, idx) => (
                          <div key={idx} style={{
                            background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px',
                            border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B', margin: '0 0 2px' }}>
                                🚆 Conflict with #{c.trainNo} {c.trainName || ''}
                              </p>
                              <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'capitalize' }}>
                                Type: {c.trainType || 'Express'} • Includes ±15m safety buffer
                              </span>
                            </div>
                            <span style={{
                              fontWeight: '800', fontSize: '12px', background: '#FEE2E2',
                              color: '#B91C1C', padding: '4px 10px', borderRadius: '6px'
                            }}>
                              {c.overlapMinutes} mins overlap
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* AI Suggested Resolutions */}
                      <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <p style={{ fontSize: '11px', fontWeight: '800', color: '#003366', margin: '0 0 6px', textTransform: 'uppercase' }}>
                          💡 AI Smart Resolution Options:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                          <li><b>Auto-Shift Window:</b> Shift maintenance start to <b>07:45 AM</b> after #{conflictResult.conflicts[0]?.trainNo} clears.</li>
                          <li><b>Loop Line Regulation:</b> Hold train at previous station loop line if emergency track welding is required.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '18px 20px', background: '#F0FDF4', borderRadius: '10px',
                      border: '1.5px solid #86EFAC', borderLeft: '6px solid #16A34A', display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                      <FiCheckCircle style={{ fontSize: '28px', color: '#16A34A', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '800', color: '#166534', margin: '0 0 2px' }}>
                          No Timetable Conflicts Detected
                        </p>
                        <p style={{ fontSize: '12px', color: '#15803D', margin: 0 }}>
                          Track section is clear of scheduled passenger & express traffic. Safe for full possession.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Close Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #E5E7EB' }}>
                <button className="btn btn-outline" onClick={() => setShowConflictModal(false)}>
                  Close Simulator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
