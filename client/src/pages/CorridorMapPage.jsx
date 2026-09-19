import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CorridorMap from '../components/map/CorridorMap';
import { useAuth } from '../context/AuthContext';
import { corridorAPI } from '../services/api';
import { FiMap, FiSearch, FiCalendar, FiActivity, FiShield, FiArrowRight } from 'react-icons/fi';

export default function CorridorMapPage() {
  const navigate = useNavigate();
  const { activeZone } = useAuth();
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [densityFilter, setDensityFilter] = useState('');

  useEffect(() => {
    const fetchCorridors = async () => {
      setLoading(true);
      try {
        const res = await corridorAPI.getAll();
        const data = res.data.data || [];
        setCorridors(data.map(c => ({
          sectionId: c.sectionId || c.section_id,
          name: c.sectionName || c.section_name,
          lineType: c.lineType || c.line_type || 'Double Track',
          km: c.totalKm || c.total_km || 100,
          density: (c.trafficDensity || c.traffic_density || 'High').charAt(0).toUpperCase() + (c.trafficDensity || c.traffic_density || 'High').slice(1),
          status: 'open',
          block: 'Clear for Traffic',
          speed: '130 km/h',
          zone: c.zoneCode || c.zone_code || c.zone || 'NR',
        })));
      } catch (err) {
        console.error('Failed to load corridors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCorridors();
  }, [activeZone]);

  const filteredCorridors = corridors.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.sectionId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDensity = densityFilter ? c.density.toLowerCase() === densityFilter.toLowerCase() : true;
    return matchesSearch && matchesDensity;
  });

  return (
    <div style={{ padding: '32px' }} className="animate-fadeIn">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1F2937', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiMap style={{ color: '#003366' }} />
            Railway Corridor Network GIS Map
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Geospatial tracking of active maintenance blocks, line capacities & Golden Quadrilateral corridors
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/schedules')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <FiCalendar />
          <span>Manage Block Schedules</span>
          <FiArrowRight />
        </button>
      </div>

      {/* Main Interactive Map Component */}
      <CorridorMap />

      {/* Detailed Section Inventory */}
      <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1F2937', margin: 0 }}>
              Section Operational Matrix
            </h3>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
              Track properties, speed ratings, and active possession status
            </p>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <FiSearch style={{ position: 'absolute', left: '10px', top: '10px', color: '#9CA3AF' }} />
              <input
                type="text"
                className="input"
                placeholder="Search section..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12px' }}
              />
            </div>
            <select
              className="input select"
              value={densityFilter}
              onChange={e => setDensityFilter(e.target.value)}
              style={{ width: '150px', fontSize: '12px' }}
            >
              <option value="">All Traffic Densities</option>
              <option value="High">High Density</option>
              <option value="Medium">Medium Density</option>
              <option value="Low">Low Density</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Section Code</th>
              <th>Corridor Name</th>
              <th>Track Configuration</th>
              <th>Route Km</th>
              <th>Speed Rating</th>
              <th>Traffic Density</th>
              <th>Possession Status</th>
              <th>Zone</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCorridors.map((c, i) => {
              const isBlock = c.status === 'maintenance';
              const isSched = c.status === 'scheduled';

              return (
                <tr
                  key={i}
                  onClick={() => navigate(`/schedules?corridor=${encodeURIComponent(c.sectionId)}`)}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  title={`Click to view scheduled blocks on ${c.sectionId}`}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F9FF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#003366' }}>{c.sectionId}</td>
                  <td style={{ fontWeight: '600', color: '#1F2937' }}>{c.name}</td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#475569' }}>{c.lineType}</span>
                  </td>
                  <td>{c.km} km</td>
                  <td style={{ fontWeight: '600', color: '#046A38' }}>{c.speed}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                      background: c.density === 'High' ? '#FEE2E2' : c.density === 'Medium' ? '#DBEAFE' : '#F1F5F9',
                      color: c.density === 'High' ? '#991B1B' : c.density === 'Medium' ? '#1E40AF' : '#475569',
                    }}>
                      {c.density}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                      background: isBlock ? '#FEE2E2' : isSched ? '#FEF3C7' : '#D1FAE5',
                      color: isBlock ? '#991B1B' : isSched ? '#92400E' : '#065F46',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isBlock ? '#DC2626' : isSched ? '#F59E0B' : '#10B981' }} />
                      {c.block}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>{c.zone}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/schedules?corridor=${encodeURIComponent(c.sectionId)}`);
                      }}
                      style={{
                        padding: '4px 10px', fontSize: '11px', fontWeight: '700',
                        background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                        borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <FiCalendar />
                      <span>Schedules</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
