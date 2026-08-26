export const API_BASE = '/api';

export const ROLES = {
  ADMIN: 'admin',
  ENGINEERING: 'engineering',
  TRD: 'trd',
  S_AND_T: 's_and_t',
  CONTROL_OFFICE: 'control_office',
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  engineering: 'Engineering (P.Way)',
  trd: 'Traction Distribution (TRD)',
  s_and_t: 'Signal & Telecom (S&T)',
  control_office: 'Control Office',
};

export const DEPARTMENTS = {
  'Engineering': { color: '#1A5276', bg: '#E6EDF5', label: 'Engineering' },
  'Traction Distribution': { color: '#FF671F', bg: '#FFF3E0', label: 'TRD' },
  'Signal & Telecom': { color: '#046A38', bg: '#E8F5E9', label: 'S&T' },
};

export const CRITICALITY_CONFIG = {
  critical: { color: '#991B1B', bg: '#FEE2E2', border: '#FECACA', label: 'Critical' },
  high: { color: '#92400E', bg: '#FEF3C7', border: '#FDE68A', label: 'High' },
  medium: { color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE', label: 'Medium' },
  low: { color: '#1B5E20', bg: '#E8F5E9', border: '#C8E6C9', label: 'Low' },
};

export const STATUS_CONFIG = {
  pending: { color: '#92400E', bg: '#FEF3C7', label: 'Pending' },
  scheduled: { color: '#1E40AF', bg: '#DBEAFE', label: 'Scheduled' },
  approved: { color: '#1B5E20', bg: '#E8F5E9', label: 'Approved' },
  rejected: { color: '#991B1B', bg: '#FEE2E2', label: 'Rejected' },
  proposed: { color: '#6B21A8', bg: '#F3E8FF', label: 'Proposed' },
  executed: { color: '#065F46', bg: '#D1FAE5', label: 'Executed' },
  in_progress: { color: '#1D4ED8', bg: '#DBEAFE', label: 'In Progress' },
  completed: { color: '#065F46', bg: '#D1FAE5', label: 'Completed' },
  cancelled: { color: '#6B7280', bg: '#F3F4F6', label: 'Cancelled' },
};

export const SOURCE_SYSTEMS = {
  TMS: { label: 'TMS (Track Mgmt)', color: '#1A5276' },
  SMMS: { label: 'SMMS (Signal Mgmt)', color: '#046A38' },
  TDMS: { label: 'TDMS (Traction Dist)', color: '#FF671F' },
};

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', roles: ['admin', 'engineering', 'trd', 's_and_t', 'control_office'] },
  { path: '/data-integration', label: 'Data Integration', icon: 'database', roles: ['admin', 'engineering', 'trd', 's_and_t', 'control_office'] },
  { path: '/prioritization', label: 'AI Prioritization', icon: 'ai', roles: ['admin', 'control_office'] },
  { path: '/schedules', label: 'Block Schedules', icon: 'calendar', roles: ['admin', 'engineering', 'trd', 's_and_t', 'control_office'] },
  { path: '/requests', label: 'Block Requests', icon: 'request', roles: ['admin', 'engineering', 'trd', 's_and_t', 'control_office'] },
  { path: '/corridor-map', label: 'Corridor Map', icon: 'map', roles: ['admin', 'engineering', 'trd', 's_and_t', 'control_office'] },
  { path: '/reports', label: 'Reports & Audit', icon: 'report', roles: ['admin', 'control_office'] },
];

export const formatDuration = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return '0min';
  const mins = Math.round(Number(totalMinutes));
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hrs}hr`;
  return `${hrs}hr ${remMins}min`;
};

// All 18 Official Zonal Railways of Indian Railways
export const ZONAL_RAILWAYS = [
  { code: 'ALL', name: 'Pan-India (All 18 Zones)', hq: 'Railway Board, New Delhi', zoneCode: 'IR', bounds: [[8.0, 68.0], [35.5, 96.5]] },
  { code: 'NR', name: 'Northern Railway', hq: 'New Delhi (Baroda House)', zoneCode: 'NR', bounds: [[27.0, 74.0], [33.5, 81.0]], divisions: ['Delhi', 'Ambala', 'Firozpur', 'Lucknow NR', 'Moradabad'] },
  { code: 'NCR', name: 'North Central Railway', hq: 'Prayagraj', zoneCode: 'NCR', bounds: [[24.5, 76.5], [29.0, 83.5]], divisions: ['Prayagraj', 'Agra', 'Jhansi'] },
  { code: 'CR', name: 'Central Railway', hq: 'Mumbai (CSMT)', zoneCode: 'CR', bounds: [[16.0, 72.5], [22.0, 80.5]], divisions: ['Mumbai CR', 'Bhusawal', 'Nagpur', 'Pune', 'Solapur'] },
  { code: 'WR', name: 'Western Railway', hq: 'Mumbai (Churchgate)', zoneCode: 'WR', bounds: [[20.0, 69.0], [26.5, 76.5]], divisions: ['Mumbai WR', 'Vadodara', 'Ahmedabad', 'Ratlam', 'Rajkot', 'Bhavnagar'] },
  { code: 'ER', name: 'Eastern Railway', hq: 'Kolkata (Fairlie Place)', zoneCode: 'ER', bounds: [[22.0, 86.0], [26.5, 89.5]], divisions: ['Howrah', 'Sealdah', 'Asansol', 'Malda'] },
  { code: 'ECR', name: 'East Central Railway', hq: 'Hajipur', zoneCode: 'ECR', bounds: [[23.5, 83.0], [27.5, 88.0]], divisions: ['Danapur', 'Dhanbad', 'Pt. Deen Dayal Upadhyaya', 'Samastipur', 'Sonpur'] },
  { code: 'ECoR', name: 'East Coast Railway', hq: 'Bhubaneswar', zoneCode: 'ECoR', bounds: [[17.5, 81.0], [22.5, 87.0]], divisions: ['Khurda Road', 'Sambalpur', 'Waltair'] },
  { code: 'SER', name: 'South Eastern Railway', hq: 'Kolkata (Garden Reach)', zoneCode: 'SER', bounds: [[21.0, 84.0], [24.5, 88.5]], divisions: ['Kharagpur', 'Adra', 'Chakradharpur', 'Ranchi'] },
  { code: 'SECR', name: 'South East Central Railway', hq: 'Bilaspur', zoneCode: 'SECR', bounds: [[19.5, 79.5], [24.0, 84.5]], divisions: ['Bilaspur', 'Raipur', 'Nagpur SECR'] },
  { code: 'SR', name: 'Southern Railway', hq: 'Chennai Central', zoneCode: 'SR', bounds: [[8.0, 76.0], [14.0, 80.5]], divisions: ['Chennai', 'Tiruchchirappalli', 'Madurai', 'Palakkad', 'Salem', 'Thiruvananthapuram'] },
  { code: 'SCR', name: 'South Central Railway', hq: 'Secunderabad', zoneCode: 'SCR', bounds: [[14.0, 77.0], [20.0, 83.0]], divisions: ['Secunderabad', 'Hyderabad', 'Vijayawada', 'Guntakal', 'Guntur', 'Nanded'] },
  { code: 'SWR', name: 'South Western Railway', hq: 'Hubballi', zoneCode: 'SWR', bounds: [[11.5, 74.0], [16.5, 78.5]], divisions: ['Hubballi', 'Bengaluru', 'Mysuru'] },
  { code: 'NWR', name: 'North Western Railway', hq: 'Jaipur', zoneCode: 'NWR', bounds: [[24.0, 70.0], [30.0, 77.5]], divisions: ['Jaipur', 'Ajmer', 'Bikaner', 'Jodhpur'] },
  { code: 'NER', name: 'North Eastern Railway', hq: 'Gorakhpur', zoneCode: 'NER', bounds: [[25.0, 79.0], [28.5, 84.5]], divisions: ['Izzatnagar', 'Lucknow NER', 'Varanasi'] },
  { code: 'NFR', name: 'Northeast Frontier Railway', hq: 'Guwahati (Maligaon)', zoneCode: 'NFR', bounds: [[24.5, 88.0], [28.5, 96.5]], divisions: ['Katihar', 'Alipurduar', 'Rangiya', 'Lumding', 'Tinsukia'] },
  { code: 'WCR', name: 'West Central Railway', hq: 'Jabalpur', zoneCode: 'WCR', bounds: [[21.5, 75.5], [26.5, 82.0]], divisions: ['Jabalpur', 'Bhopal', 'Kota'] },
  { code: 'KRCL', name: 'Konkan Railway', hq: 'Navi Mumbai', zoneCode: 'KRCL', bounds: [[13.0, 73.0], [19.0, 75.5]], divisions: ['Karwar', 'Ratnagiri'] },
  { code: 'METRO', name: 'Kolkata Metro', hq: 'Kolkata', zoneCode: 'KMR', bounds: [[22.4, 88.2], [22.8, 88.5]], divisions: ['Kolkata Metro'] },
];
