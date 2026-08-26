import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CorridorMap from '../components/map/CorridorMap';
import { FiMap, FiSearch, FiCalendar, FiActivity, FiShield, FiArrowRight } from 'react-icons/fi';

const CORRIDOR_DETAILS = [
  { sectionId: 'NDLS-GZB', name: 'New Delhi – Ghaziabad', lineType: 'Quadruple', km: 32, density: 'High', status: 'maintenance', block: 'Joint OHE + Track Block (00:30–04:30)', speed: '130 km/h', zone: 'NR' },
  { sectionId: 'GZB-CNB', name: 'Ghaziabad – Kanpur Central', lineType: 'Double (Auto)', km: 440, density: 'High', status: 'scheduled', block: 'Night Window 01:00–04:00', speed: '130 km/h', zone: 'NCR' },
  { sectionId: 'CNB-ALD', name: 'Kanpur – Prayagraj', lineType: 'Double', km: 198, density: 'Medium', status: 'open', block: 'Clear for Traffic', speed: '130 km/h', zone: 'NCR' },
  { sectionId: 'ALD-MGS', name: 'Prayagraj – DDU / Mughal Sarai', lineType: 'Double', km: 128, density: 'High', status: 'open', block: 'Clear for Traffic', speed: '130 km/h', zone: 'ECR' },
  { sectionId: 'NDLS-NZM', name: 'New Delhi – Hazrat Nizamuddin', lineType: 'Quadruple', km: 8, density: 'High', status: 'open', block: 'Clear for Traffic', speed: '110 km/h', zone: 'NR' },
  { sectionId: 'NZM-MTJ', name: 'Nizamuddin – Mathura', lineType: 'Double', km: 141, density: 'High', status: 'maintenance', block: 'S&T Interlocking Relay Block', speed: '160 km/h', zone: 'NCR' },
  { sectionId: 'MTJ-AGC', name: 'Mathura – Agra Cantt', lineType: 'Double', km: 54, density: 'Medium', status: 'open', block: 'Clear for Traffic', speed: '160 km/h', zone: 'NCR' },
  { sectionId: 'LKO-BSB', name: 'Lucknow – Varanasi', lineType: 'Double', km: 286, density: 'Medium', status: 'open', block: 'Clear for Traffic', speed: '110 km/h', zone: 'NR' },
  { sectionId: 'CNB-LKO', name: 'Kanpur – Lucknow', lineType: 'Double', km: 72, density: 'High', status: 'scheduled', block: 'OHE Sag Inspection Window', speed: '110 km/h', zone: 'NR' },
  { sectionId: 'AMB-CDG', name: 'Ambala – Chandigarh', lineType: 'Double', km: 46, density: 'Medium', status: 'open', block: 'Clear for Traffic', speed: '110 km/h', zone: 'NR' },
  { sectionId: 'DDN-HW', name: 'Dehradun – Haridwar', lineType: 'Single', km: 52, density: 'Medium', status: 'open', block: 'Clear for Traffic', speed: '90 km/h', zone: 'NR' },
  { sectionId: 'HW-RK', name: 'Haridwar – Roorkee', lineType: 'Single', km: 30, density: 'Low', status: 'open', block: 'Clear for Traffic', speed: '100 km/h', zone: 'NR' },
  { sectionId: 'DLI-RWL', name: 'Delhi – Rewari', lineType: 'Double', km: 82, density: 'Low', status: 'open', block: 'Clear for Traffic', speed: '110 km/h', zone: 'NWR' },
];

export default function CorridorMapPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [densityFilter, setDensityFilter] = useState('');

  const filteredCorridors = CORRIDOR_DETAILS.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.sectionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDensity = densityFilter ? c.density === densityFilter : true;
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
            </tr>
          </thead>
          <tbody>
            {filteredCorridors.map((c, i) => {
              const isBlock = c.status === 'maintenance';
              const isSched = c.status === 'scheduled';

              return (
                <tr key={i}>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
