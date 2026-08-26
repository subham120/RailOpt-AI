import { useState, useEffect } from 'react';
import { taskAPI, scheduleAPI, corridorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, CRITICALITY_CONFIG, STATUS_CONFIG, formatDuration } from '../utils/constants';
import {
  FiPlus,
  FiX,
  FiCheck,
  FiSend,
  FiCheckCircle,
  FiAlertTriangle,
  FiClipboard,
} from 'react-icons/fi';

export default function Requests() {
  const { user, canApprove } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    sectionId: '', department: user?.department || '', defectType: '', estimatedDuration: 60, criticality: 'medium', description: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedRes, corrRes] = await Promise.all([
          scheduleAPI.getAll({ status: 'proposed', limit: 50 }),
          corridorAPI.getAll(),
        ]);
        setSchedules(schedRes.data.data);
        setCorridors(corrRes.data.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const section = corridors.find(c => (c.sectionId || c.section_id) === form.sectionId);
      await taskAPI.create({
        taskId: `REQ-${Date.now()}`,
        sourceSystem: form.department === 'Engineering' ? 'TMS' : form.department === 'Signal & Telecom' ? 'SMMS' : 'TDMS',
        department: form.department,
        sectionId: form.sectionId,
        sectionName: section?.sectionName || section?.section_name || form.sectionId,
        defectType: form.defectType,
        defectDescription: form.description,
        criticality: form.criticality,
        reportedDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 86400000),
        estimatedDuration: parseInt(form.estimatedDuration),
        status: 'pending',
      });
      setShowForm(false);
      setForm({ sectionId: '', department: user?.department || '', defectType: '', estimatedDuration: 60, criticality: 'medium', description: '' });
      showToast('Block request submitted successfully to RailOpt AI');
    } catch (err) {
      showToast('Submission failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleApprove = async (id) => {
    try {
      await scheduleAPI.approve(id);
      setSchedules(prev => prev.map(s => s._id === id ? { ...s, status: 'approved' } : s));
      showToast('Block schedule approved successfully');
    } catch (err) { showToast('Approval failed: ' + err.message, 'error'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
      await scheduleAPI.reject(id, { reason });
      setSchedules(prev => prev.map(s => s._id === id ? { ...s, status: 'rejected' } : s));
      showToast('Block schedule rejected');
    } catch (err) { showToast('Rejection failed: ' + err.message, 'error'); }
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', margin: '0 0 4px' }}>
            RailOpt AI Block Requests & Approval
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Raise operational maintenance requests and manage Divisional approvals
          </p>
        </div>
        <button className="btn btn-saffron" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {showForm ? <FiX /> : <FiPlus />}
          <span>{showForm ? 'Cancel' : 'Raise Block Request'}</span>
        </button>
      </div>

      {/* Request Form */}
      {showForm && (
        <div className="card animate-fadeIn" style={{ padding: '28px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', marginBottom: '20px' }}>
            New Maintenance Block Request
          </h3>
          <form onSubmit={handleSubmitRequest}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Section</label>
                <select className="input select" value={form.sectionId} onChange={e => setForm({...form, sectionId: e.target.value})} required>
                  <option value="">Select section...</option>
                  {corridors.map(c => (
                    <option key={c.sectionId || c.section_id} value={c.sectionId || c.section_id}>
                      {c.sectionName || c.section_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Department</label>
                <select className="input select" value={form.department} onChange={e => setForm({...form, department: e.target.value})} required>
                  <option value="">Select department...</option>
                  {Object.keys(DEPARTMENTS).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Defect Type / Work Description</label>
                <input className="input" placeholder="e.g. Rail joint weld renewal, Signal relay check" value={form.defectType} onChange={e => setForm({...form, defectType: e.target.value})} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Estimated Duration (minutes)</label>
                <input className="input" type="number" min="30" max="480" value={form.estimatedDuration} onChange={e => setForm({...form, estimatedDuration: e.target.value})} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Criticality Level</label>
                <select className="input select" value={form.criticality} onChange={e => setForm({...form, criticality: e.target.value})}>
                  {Object.entries(CRITICALITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Remarks / Justification</label>
                <input className="input" placeholder="Optional notes for Section Controller" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiSend /> Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Proposed Schedules for Approval */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', marginBottom: '16px' }}>
          Pending Proposed Block Schedules ({schedules.length})
        </h3>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Loading Proposed Schedules...</p>
          </div>
        ) : schedules.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Schedule ID</th>
                <th>Section</th>
                <th>Departments</th>
                <th>Proposed Window</th>
                <th>Duration</th>
                <th>CP-SAT Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{s.scheduleId}</td>
                  <td style={{ fontWeight: '500' }}>{s.sectionName || s.sectionId}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(s.departments || []).map((d, i) => (
                        <span key={i} style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          background: DEPARTMENTS[d]?.bg || '#F3F4F6', color: DEPARTMENTS[d]?.color || '#6B7280',
                        }}>{DEPARTMENTS[d]?.label || d}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {s.assignedWindow?.start ? new Date(s.assignedWindow.start).toLocaleString('en-IN') : 'N/A'}
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: '600' }}>{formatDuration(s.totalDurationMinutes)}</td>
                  <td style={{ fontWeight: '700', color: '#003366' }}>{Math.round((s.optimizerScore || 0) * 100)}%</td>
                  <td>
                    {canApprove ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-green btn-sm" onClick={() => handleApprove(s._id)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiCheck /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(s._id)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiX /> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Review only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '20px', color: '#003366' }}>
              <FiClipboard />
            </div>
            <p style={{ fontWeight: '600', fontSize: '15px', color: '#1E293B', margin: '0 0 4px' }}>No Pending Proposed Schedules</p>
            <p style={{ margin: 0, fontSize: '13px' }}>All maintenance block sessions have been reviewed and approved.</p>
          </div>
        )}
      </div>
    </div>
  );
}
