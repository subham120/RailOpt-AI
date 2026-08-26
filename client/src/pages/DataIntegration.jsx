import { useState, useEffect } from 'react';
import { taskAPI, mockAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, CRITICALITY_CONFIG, STATUS_CONFIG, formatDuration } from '../utils/constants';
import {
  FiDatabase,
  FiPlus,
  FiCheckCircle,
  FiAlertTriangle,
  FiFilter,
} from 'react-icons/fi';

export default function DataIntegration() {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filters, setFilters] = useState({ department: '', status: '', criticality: '', sourceSystem: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTasks = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const res = await taskAPI.getAll(params);
      setTasks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [filters]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await mockAPI.seed({ taskCount: 80, clearExisting: true });
      await fetchTasks();
      showToast('Successfully seeded 80 defect tasks from TMS, SMMS & TDMS');
    } catch (err) {
      showToast('Seeding failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleIngest = async (source) => {
    try {
      await mockAPI.ingest({ source, count: 10 });
      await fetchTasks();
      showToast(`Ingested 10 new defect records from ${source}`);
    } catch (err) {
      showToast('Ingestion failed: ' + (err.response?.data?.message || err.message), 'error');
    }
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', margin: '0 0 4px' }}>
            RailOpt AI Data Integration Module
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Unified multi-department telemetry from Track (TMS), S&T (SMMS) & OHE (TDMS)
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSeed} disabled={seeding} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiDatabase />
              {seeding ? 'Seeding Data...' : 'Seed Mock Data'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleIngest('TMS')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FiPlus /> TMS Track
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleIngest('SMMS')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FiPlus /> SMMS Signal
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleIngest('TDMS')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FiPlus /> TDMS OHE
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#6B7280' }}>
          <FiFilter />
          <span>Filters:</span>
        </div>

        <select className="input select" style={{ width: '180px', padding: '8px 12px' }}
          value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})}>
          <option value="">All Departments</option>
          {Object.keys(DEPARTMENTS).map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select className="input select" style={{ width: '150px', padding: '8px 12px' }}
          value={filters.sourceSystem} onChange={e => setFilters({...filters, sourceSystem: e.target.value})}>
          <option value="">All Sources</option>
          <option value="TMS">TMS (Track)</option>
          <option value="SMMS">SMMS (Signal)</option>
          <option value="TDMS">TDMS (Traction)</option>
        </select>

        <select className="input select" style={{ width: '140px', padding: '8px 12px' }}
          value={filters.criticality} onChange={e => setFilters({...filters, criticality: e.target.value})}>
          <option value="">All Criticality</option>
          {Object.entries(CRITICALITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select className="input select" style={{ width: '140px', padding: '8px 12px' }}
          value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: 'auto' }}>
          Total records: <b>{pagination.total}</b>
        </span>
      </div>

      {/* Data Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Loading Maintenance Defect Data...</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Source</th>
                <th>Department</th>
                <th>Section</th>
                <th>Defect Type</th>
                <th>Criticality</th>
                <th>Duration</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '12px' }}>{t.taskId}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                      background: t.sourceSystem === 'TMS' ? '#E6EDF5' : t.sourceSystem === 'SMMS' ? '#E8F5E9' : '#FEF3C7',
                      color: t.sourceSystem === 'TMS' ? '#003366' : t.sourceSystem === 'SMMS' ? '#046A38' : '#D97706',
                    }}>{t.sourceSystem}</span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{t.department}</td>
                  <td style={{ fontSize: '13px' }}>{t.sectionName || t.sectionId}</td>
                  <td style={{ fontSize: '13px', fontWeight: '500' }}>{t.defectType}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700',
                      background: `${CRITICALITY_CONFIG[t.criticality]?.color}15`,
                      color: CRITICALITY_CONFIG[t.criticality]?.color,
                    }}>
                      {CRITICALITY_CONFIG[t.criticality]?.label || t.criticality}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: '600' }}>{formatDuration(t.estimatedDuration)}</td>
                  <td style={{ fontSize: '12px', color: '#6B7280' }}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700',
                      background: STATUS_CONFIG[t.status]?.bg || '#F3F4F6',
                      color: STATUS_CONFIG[t.status]?.color || '#6B7280',
                    }}>
                      {STATUS_CONFIG[t.status]?.label || t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>
          Page {pagination.page} of {pagination.pages}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1} onClick={() => fetchTasks(pagination.page - 1)}>
            Previous
          </button>
          <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchTasks(pagination.page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
