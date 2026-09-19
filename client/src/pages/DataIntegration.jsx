/**
 * DataIntegration.jsx — Real CSV ingest from TMS / SMMS / TDMS.
 * Polished UX4G Government of India styling with clear contrast and card hierarchy.
 */
import { useState, useEffect, useRef } from 'react';
import { taskAPI, ingestAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CRITICALITY_CONFIG, STATUS_CONFIG, formatDuration } from '../utils/constants';
import {
  FiDatabase, FiUpload, FiDownload, FiCheckCircle,
  FiAlertTriangle, FiFilter, FiRefreshCw, FiFile,
} from 'react-icons/fi';

const SOURCE_SYSTEMS = ['TMS', 'SMMS', 'TDMS'];
const DEPT_LABELS = {
  TMS: 'Engineering',
  SMMS: 'Signal & Telecom',
  TDMS: 'Traction Distribution',
};

const DEPT_COLORS = {
  TMS: { primary: '#1A5276', bg: '#E6EDF5', border: '#B3CBE0' },
  SMMS: { primary: '#046A38', bg: '#E8F5E9', border: '#C8E6C9' },
  TDMS: { primary: '#FF671F', bg: '#FFF3E0', border: '#FFE0B2' },
};

export default function DataIntegration() {
  const { isAdmin, canApprove, activeZone } = useAuth();
  const fileInputRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [selectedSource, setSelectedSource] = useState('TMS');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [filters, setFilters] = useState({ department: '', status: '', criticality: '', sourceSystem: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchTasks = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page, limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      };
      const res = await taskAPI.getAll(params);
      setTasks(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      showToast('Failed to fetch tasks: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [filters, activeZone]);

  // ─── CSV Upload ───────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showToast('Only CSV files are accepted', 'error');
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return showToast('Select a CSV file first', 'error');
    setUploading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source', selectedSource);
      const res = await ingestAPI.uploadCSV(formData);
      const { imported, skipped, errors, batchId } = res.data;
      setImportResult({ imported, skipped, errors, batchId, source: selectedSource });
      showToast(`✅ Imported ${imported} tasks from ${selectedSource} (Batch: ${batchId})`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchTasks();
    } catch (err) {
      showToast('Upload failed: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async (source) => {
    try {
      const res = await ingestAPI.downloadTemplate(source);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${source.toLowerCase()}_template.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Template download failed', 'error');
    }
  };

  const activeColor = DEPT_COLORS[selectedSource] || DEPT_COLORS.TMS;

  return (
    <div style={{ padding: '32px' }} className="animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: '80px', right: '32px', zIndex: 9999,
            background: toast.type === 'error' ? '#DC2626' : '#046A38',
            color: 'white', padding: '12px 20px', borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}
          className="animate-fadeIn"
        >
          {toast.type === 'error' ? <FiAlertTriangle /> : <FiCheckCircle />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '12px' }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#003366', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiDatabase style={{ color: '#FF671F' }} /> Data Ingestion & Department Pipelines
          </h1>
          <p style={{ fontSize: '14px', color: '#4B5563', margin: 0 }}>
            Ingest live defect feeds from TMS (Engineering), SMMS (S&T), and TDMS (Traction / OHE) or upload CSV batches.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowUploadCard(prev => !prev)}
            style={{
              padding: '8px 18px', background: showUploadCard ? '#E6EDF5' : '#003366', color: showUploadCard ? '#003366' : '#FFFFFF',
              border: `1.5px solid ${showUploadCard ? '#003366' : 'transparent'}`, borderRadius: '8px', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: showUploadCard ? 'none' : '0 2px 6px rgba(0, 51, 102, 0.25)', transition: 'all 0.2s',
            }}
          >
            <FiUpload /> {showUploadCard ? 'Hide CSV Upload' : 'Upload CSV Telemetry'}
          </button>
          <button
            onClick={() => fetchTasks()}
            style={{
              padding: '8px 16px', background: '#FFFFFF', color: '#003366', border: '1px solid #CBD5E1',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <FiRefreshCw /> Refresh Data
          </button>
        </div>
      </div>

      {/* Upload Panel Card (Toggleable) */}
      {showUploadCard && (
        <div style={{
          background: '#FFFFFF', borderRadius: '14px', padding: '24px', marginBottom: '24px',
          border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0, 51, 102, 0.08)',
          position: 'relative',
        }} className="animate-fadeIn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiUpload style={{ color: '#003366' }} /> CSV Telemetry File Upload
            </h2>
            <button
              onClick={() => setShowUploadCard(false)}
              style={{
                background: '#F1F5F9', border: 'none', borderRadius: '6px', color: '#64748B',
                width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '14px',
              }}
              title="Close Upload Panel"
            >
              ✕
            </button>
          </div>

          {/* Source selector + template download */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            {SOURCE_SYSTEMS.map((src) => {
              const isSel = selectedSource === src;
              const c = DEPT_COLORS[src];
              return (
                <div key={src} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => setSelectedSource(src)}
                    style={{
                      padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: isSel ? c.primary : '#F8FAFC',
                      color: isSel ? '#FFFFFF' : '#334155',
                      border: `1.5px solid ${isSel ? c.primary : '#E2E8F0'}`,
                      boxShadow: isSel ? `0 4px 12px ${c.primary}33` : 'none',
                    }}
                  >
                    {src} — {DEPT_LABELS[src]}
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate(src)}
                    style={{
                      padding: '8px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                      color: '#64748B', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    title={`Download ${src} standard CSV template`}
                  >
                    <FiDownload style={{ fontSize: '14px' }} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${selectedFile ? activeColor.primary : '#CBD5E1'}`,
              background: selectedFile ? activeColor.bg : '#F8FAFC',
              borderRadius: '12px', padding: '32px 20px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s', marginBottom: '18px',
            }}
          >
            <FiFile style={{ fontSize: '32px', color: activeColor.primary, margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: '14px', color: '#334155', margin: 0, fontWeight: '500' }}>
              {selectedFile ? (
                <span style={{ color: activeColor.primary, fontWeight: '700' }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <>
                  Click to browse and select a <strong>{selectedSource}</strong> ({DEPT_LABELS[selectedSource]}) CSV file
                </>
              )}
            </p>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
              Supports standard Indian Railways TMS, SMMS, and TDMS telemetry exports
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>

          {/* Upload Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                padding: '10px 24px', background: '#003366', color: '#FFFFFF',
                borderRadius: '8px', fontSize: '14px', fontWeight: '700', border: 'none',
                cursor: (!selectedFile || uploading) ? 'not-allowed' : 'pointer',
                opacity: (!selectedFile || uploading) ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 2px 6px rgba(0, 51, 102, 0.2)',
              }}
            >
              <FiUpload /> {uploading ? 'Importing Telemetry...' : `Import ${selectedSource} Data`}
            </button>
          </div>

          {/* Import result alert */}
          {importResult && (
            <div style={{
              marginTop: '16px', background: '#ECFDF5', border: '1px solid #A7F3D0',
              borderRadius: '10px', padding: '16px', color: '#065F46',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                <FiCheckCircle /> Telemetry Ingestion Complete — Batch ID: {importResult.batchId}
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                <span>✅ Successfully Imported: <strong>{importResult.imported}</strong> tasks</span>
                <span>⏭️ Skipped / Existing: <strong>{importResult.skipped}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div style={{
        background: '#FFFFFF', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px',
        border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0, 51, 102, 0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#1E293B', fontSize: '14px' }}>
            <FiFilter style={{ color: '#003366' }} /> Filter Maintenance Tasks
          </div>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
            Total: {pagination.total} tasks
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Source System', key: 'sourceSystem', opts: ['', ...SOURCE_SYSTEMS] },
            { label: 'Department', key: 'department', opts: ['', 'Engineering', 'Traction Distribution', 'Signal & Telecom'] },
            { label: 'Criticality', key: 'criticality', opts: ['', 'critical', 'high', 'medium', 'low'] },
            { label: 'Status', key: 'status', opts: ['', 'pending', 'scheduled', 'approved', 'completed'] },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                {label}
              </label>
              <select
                value={filters[key]}
                onChange={(e) => setFilters(f => ({ ...f, [key]: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  background: '#F8FAFC', border: '1px solid #CBD5E1',
                  color: '#1E293B', fontSize: '13px', fontWeight: '500',
                }}
              >
                {opts.map(o => <option key={o} value={o}>{o || `All ${label}s`}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div style={{
        background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Task ID', 'Source', 'Section Corridor', 'Defect Type', 'Criticality', 'Due Date', 'Est. Duration', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
                    fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    Loading tasks from PostgreSQL...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No maintenance tasks found matching filters.
                  </td>
                </tr>
              ) : tasks.map((t, idx) => {
                const crit = CRITICALITY_CONFIG[t.criticality] || { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
                const statusCfg = STATUS_CONFIG[t.status] || { bg: '#F1F5F9', color: '#475569' };
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && ['pending', 'scheduled'].includes(t.status);
                const deptColor = DEPT_COLORS[t.sourceSystem] || DEPT_COLORS.TMS;

                return (
                  <tr
                    key={t.id || t._id || t.taskId}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#003366' }}>
                      {t.taskId}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                        background: deptColor.bg, color: deptColor.primary, border: `1px solid ${deptColor.border}`,
                      }}>
                        {t.sourceSystem}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: '600' }}>
                      {t.sectionName || t.sectionId}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#1E293B', fontWeight: '500' }}>
                      {t.defectType}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                        background: crit.bg, color: crit.color, border: `1px solid ${crit.border || 'transparent'}`,
                        textTransform: 'capitalize',
                      }}>
                        {t.criticality}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: isOverdue ? '#DC2626' : '#475569', fontWeight: isOverdue ? '700' : '500' }}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : '—'}
                      {isOverdue && ' ⚠️'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: '500' }}>
                      {formatDuration(t.estimatedDuration)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                        background: statusCfg.bg, color: statusCfg.color, textTransform: 'capitalize',
                      }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', fontSize: '13px', color: '#64748B',
          }}>
            <span>Page {pagination.page} of {pagination.pages} ({pagination.total} total tasks)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => fetchTasks(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={{
                  padding: '5px 12px', borderRadius: '6px', border: '1px solid #CBD5E1',
                  background: '#FFFFFF', color: '#334155', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: pagination.page <= 1 ? 0.5 : 1, fontWeight: '600',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => fetchTasks(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                style={{
                  padding: '5px 12px', borderRadius: '6px', border: '1px solid #CBD5E1',
                  background: '#FFFFFF', color: '#334155', cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                  opacity: pagination.page >= pagination.pages ? 0.5 : 1, fontWeight: '600',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
