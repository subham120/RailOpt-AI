import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiAlertTriangle,
  FiAlertOctagon,
  FiInfo,
  FiShield,
  FiRefreshCw,
  FiExternalLink,
  FiX,
  FiClock,
  FiVolume2,
  FiVolumeX,
  FiChevronRight,
  FiArrowRight,
} from 'react-icons/fi';
import { alertAPI } from '../../services/api';

const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Browser audio policy restriction fallback
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Recently';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffSec = Math.max(0, Math.floor((now - date) / 1000));
    if (diffSec < 30) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
};

export default function NotificationCenter({ activeZone, zoneName }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'critical' | 'high'
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const panelRef = useRef(null);
  const prevCountRef = useRef(0);

  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { unread_only: true };
      if (activeZone && activeZone !== 'ALL') {
        params.zone = activeZone;
      }
      const res = await alertAPI.getAll(params);
      if (res.data?.success) {
        const list = res.data.data || [];
        setAlerts(list);
        const count = res.data.count || list.length;
        setUnreadCount(count);

        // Chime if new alert received and sound enabled
        if (count > prevCountRef.current && prevCountRef.current !== 0 && soundEnabled) {
          playChime();
        }
        prevCountRef.current = count;
      }
    } catch (e) {
      console.error('Failed to fetch alerts', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(true), 25000);
    return () => clearInterval(interval);
  }, [activeZone]);

  // Click outside & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
      await alertAPI.markRead(id);
    } catch (e) {
      console.error('Failed to mark alert read', e);
      fetchAlerts(true);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setAlerts([]);
      setUnreadCount(0);
      prevCountRef.current = 0;
      const params = activeZone && activeZone !== 'ALL' ? { zone: activeZone } : {};
      await alertAPI.markAllRead(params);
      setActionSuccessMsg('All alerts dismissed');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Failed to mark all alerts read', e);
      fetchAlerts(true);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    try {
      await alertAPI.scan();
      await fetchAlerts();
      setActionSuccessMsg('Telemetry scan complete');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Scan failed', e);
    } finally {
      setScanning(false);
    }
  };

  const handleNavigateToTask = (alert) => {
    setIsOpen(false);
    if (alert.taskCode) {
      navigate(`/prioritization?search=${encodeURIComponent(alert.taskCode)}`);
    } else if (alert.scheduleId) {
      navigate(`/schedules?scheduleId=${encodeURIComponent(alert.scheduleId)}`);
    } else if (alert.sectionId) {
      navigate(`/schedules?section=${encodeURIComponent(alert.sectionId)}`);
    } else {
      navigate('/prioritization');
    }
  };

  // Filtered alerts
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const highAlerts = alerts.filter((a) => a.severity === 'high');
  const filteredAlerts =
    activeTab === 'critical'
      ? criticalAlerts
      : activeTab === 'high'
      ? highAlerts
      : alerts;

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        id="btn-telemetry-notifications"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: isOpen ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '8px 10px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
        }}
        aria-label="View Telemetry Notifications"
        title="Active Telemetry & Safety Alerts"
      >
        <FiBell
          style={{
            fontSize: '18px',
            transform: unreadCount > 0 && isOpen ? 'rotate(15deg)' : 'none',
            transition: 'transform 0.2s ease',
            color: unreadCount > 0 ? '#FFFFFF' : '#CBD5E1',
          }}
        />

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#EF4444',
              color: '#FFFFFF',
              borderRadius: '12px',
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              fontSize: '10px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.8), 0 2px 4px rgba(0,0,0,0.3)',
              border: '1.5px solid #003366',
              animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Popover Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: '-10px',
            width: '410px',
            maxWidth: 'calc(100vw - 24px)',
            background: '#FFFFFF',
            borderRadius: '16px',
            boxShadow:
              '0 20px 40px -12px rgba(10, 37, 64, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            zIndex: 300,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '520px',
            animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0A2540 0%, #003366 100%)',
              padding: '14px 16px',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF671F',
                  }}
                >
                  <FiShield style={{ fontSize: '16px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
                    Telemetry & Safety Alerts
                  </h3>
                  <p style={{ fontSize: '11px', opacity: 0.85, margin: '2px 0 0', fontWeight: '400' }}>
                    {activeZone && activeZone !== 'ALL'
                      ? `${activeZone} — ${zoneName || 'Zonal Railway'}`
                      : 'Pan-India Operations'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Audio toggle */}
                <button
                  onClick={() => setSoundEnabled((v) => !v)}
                  title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: 'none',
                    borderRadius: '6px',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: soundEnabled ? '#FBBF24' : '#94A3B8',
                    cursor: 'pointer',
                  }}
                >
                  {soundEnabled ? <FiVolume2 style={{ fontSize: '13px' }} /> : <FiVolumeX style={{ fontSize: '13px' }} />}
                </button>

                {/* Close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: 'none',
                    borderRadius: '6px',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#E2E8F0',
                    cursor: 'pointer',
                  }}
                  title="Close"
                >
                  <FiX style={{ fontSize: '14px' }} />
                </button>
              </div>
            </div>

            {/* Quick Action Buttons & Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    background: unreadCount > 0 ? '#DC2626' : '#046A38',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                  }}
                >
                  {unreadCount} Unread
                </span>
                {actionSuccessMsg && (
                  <span style={{ fontSize: '11px', color: '#34D399', fontWeight: '600' }}>
                    {actionSuccessMsg}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleRunScan}
                  disabled={scanning}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: scanning ? 0.6 : 1,
                  }}
                  title="Scan for overdue tasks and scheduling bottlenecks"
                >
                  <FiRefreshCw style={{ fontSize: '11px', animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
                  {scanning ? 'Scanning...' : 'Scan'}
                </button>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FiCheckCircle style={{ fontSize: '12px' }} />
                    Dismiss All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Subtabs */}
          <div
            style={{
              display: 'flex',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              padding: '6px 12px',
              gap: '6px',
            }}
          >
            <button
              onClick={() => setActiveTab('all')}
              style={{
                background: activeTab === 'all' ? '#003366' : 'transparent',
                color: activeTab === 'all' ? '#FFFFFF' : '#475569',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              style={{
                background: activeTab === 'critical' ? '#DC2626' : 'transparent',
                color: activeTab === 'critical' ? '#FFFFFF' : '#991B1B',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Critical ({criticalAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('high')}
              style={{
                background: activeTab === 'high' ? '#D97706' : 'transparent',
                color: activeTab === 'high' ? '#FFFFFF' : '#92400E',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              High ({highAlerts.length})
            </button>
          </div>

          {/* Alerts Scrollable Feed */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              maxHeight: '340px',
              background: '#FFFFFF',
            }}
          >
            {loading ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                <FiRefreshCw style={{ animation: 'spin 1s linear infinite', fontSize: '20px', marginBottom: '8px' }} />
                <p style={{ margin: 0 }}>Syncing telemetry data...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#046A38',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: '24px',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  <FiCheckCircle />
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>
                  All Corridors Clear
                </h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                  {activeZone && activeZone !== 'ALL'
                    ? `No pending alerts for ${activeZone}. All maintenance blocks and train paths are synchronized.`
                    : 'No pending safety alerts across Indian Railways. Normal block operations active.'}
                </p>
                <button
                  onClick={handleRunScan}
                  style={{
                    marginTop: '14px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Run Diagnostics Scan
                </button>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isCrit = alert.severity === 'critical';
                return (
                  <div
                    key={alert.id}
                    onClick={() => handleNavigateToTask(alert)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: `4px solid ${isCrit ? '#DC2626' : '#F59E0B'}`,
                      background: isCrit ? '#FEF2F2' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isCrit ? '#FEE2E2' : '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isCrit ? '#FEF2F2' : '#FFFFFF')}
                  >
                    {/* Top Row: Severity badge, Section, and Time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isCrit ? '#F87171' : '#FDE68A',
                            color: isCrit ? '#FFFFFF' : '#78350F',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {alert.severity}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#1E293B',
                            background: '#F1F5F9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          📍 {alert.sectionName || alert.sectionId || 'Network Section'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <FiClock style={{ fontSize: '10px' }} />
                          {formatTimeAgo(alert.createdAt)}
                        </span>

                        {/* Dismiss button */}
                        <button
                          onClick={(e) => handleMarkRead(alert.id, e)}
                          title="Mark resolved"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#64748B',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#046A38';
                            e.currentTarget.style.borderColor = '#046A38';
                            e.currentTarget.style.background = '#ECFDF5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#64748B';
                            e.currentTarget.style.borderColor = '#CBD5E1';
                            e.currentTarget.style.background = '#FFFFFF';
                          }}
                        >
                          <FiCheck style={{ fontSize: '12px' }} />
                        </button>
                      </div>
                    </div>

                    {/* Message Body */}
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#334155',
                        margin: 0,
                        lineHeight: 1.4,
                        fontWeight: '500',
                      }}
                    >
                      {alert.message}
                    </p>

                    {/* Footer Action Strip inside alert item */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '2px',
                      }}
                    >
                      {alert.taskCode ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#003366',
                            background: '#E6EDF5',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          Task: {alert.taskCode}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>Corridor Bottleneck</span>
                      )}

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#003366',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        Inspect Details <FiArrowRight style={{ fontSize: '11px' }} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Bar */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 6px #10B981',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>
                Auto-Telemetry Live
              </span>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/reports');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#003366',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 4px',
              }}
            >
              Full Audit Log <FiExternalLink style={{ fontSize: '11px' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
