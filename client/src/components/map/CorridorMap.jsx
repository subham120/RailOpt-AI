import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { ZONAL_RAILWAYS } from '../../utils/constants';
import { FiLayers, FiActivity, FiZap, FiAlertCircle, FiCheckCircle, FiInfo, FiGlobe } from 'react-icons/fi';

// Pan-India Major Railway Junctions & Terminals across all 18 Zones
const STATIONS = {
  // Northern (NR) & North Central (NCR)
  NDLS: { name: 'New Delhi (NDLS)', coords: [28.6431, 77.2197], zone: 'NR', type: 'terminal' },
  NZM: { name: 'Hazrat Nizamuddin (NZM)', coords: [28.5886, 77.2536], zone: 'NR', type: 'junction' },
  DLI: { name: 'Delhi Jn (DLI)', coords: [28.6616, 77.2274], zone: 'NR', type: 'terminal' },
  GZB: { name: 'Ghaziabad Jn (GZB)', coords: [28.6675, 77.4338], zone: 'NR', type: 'junction' },
  AMB: { name: 'Ambala Cantt (UMB)', coords: [30.3340, 76.8375], zone: 'NR', type: 'junction' },
  CDG: { name: 'Chandigarh (CDG)', coords: [30.7016, 76.8227], zone: 'NR', type: 'terminal' },
  DDN: { name: 'Dehradun (DDN)', coords: [30.3155, 78.0322], zone: 'NR', type: 'terminal' },
  HW: { name: 'Haridwar (HW)', coords: [29.9457, 78.1488], zone: 'NR', type: 'junction' },
  LKO: { name: 'Lucknow NR (LKO)', coords: [26.8315, 80.9228], zone: 'NR', type: 'terminal' },
  CNB: { name: 'Kanpur Central (CNB)', coords: [26.4547, 80.3507], zone: 'NCR', type: 'terminal' },
  ALD: { name: 'Prayagraj Jn (PRYJ)', coords: [25.4497, 81.8260], zone: 'NCR', type: 'junction' },
  MTJ: { name: 'Mathura Jn (MTJ)', coords: [27.4924, 77.6737], zone: 'NCR', type: 'junction' },
  AGC: { name: 'Agra Cantt (AGC)', coords: [27.1574, 77.9912], zone: 'NCR', type: 'junction' },
  JHS: { name: 'Virangana Lakshmibai Jhansi (VGLJ)', coords: [25.4484, 78.5685], zone: 'NCR', type: 'junction' },

  // Western (WR) & West Central (WCR) & Central (CR) & Konkan (KRCL)
  CSMT: { name: 'Mumbai CSMT (CSMT)', coords: [18.9400, 72.8353], zone: 'CR', type: 'terminal' },
  MMCT: { name: 'Mumbai Central (MMCT)', coords: [18.9696, 72.8193], zone: 'WR', type: 'terminal' },
  KYN: { name: 'Kalyan Jn (KYN)', coords: [19.2396, 73.1305], zone: 'CR', type: 'junction' },
  PUNE: { name: 'Pune Jn (PUNE)', coords: [18.5289, 73.8744], zone: 'CR', type: 'terminal' },
  NGP: { name: 'Nagpur Jn (NGP)', coords: [21.1524, 79.0888], zone: 'CR', type: 'junction' },
  ST: { name: 'Surat (ST)', coords: [21.2049, 72.8406], zone: 'WR', type: 'junction' },
  BRC: { name: 'Vadodara Jn (BRC)', coords: [22.3107, 73.1812], zone: 'WR', type: 'junction' },
  ADI: { name: 'Ahmedabad Jn (ADI)', coords: [23.0225, 72.6000], zone: 'WR', type: 'terminal' },
  RTM: { name: 'Ratlam Jn (RTM)', coords: [23.3441, 75.0384], zone: 'WR', type: 'junction' },
  BPL: { name: 'Bhopal Jn (BPL)', coords: [23.2667, 77.4126], zone: 'WCR', type: 'junction' },
  JBP: { name: 'Jabalpur (JBP)', coords: [23.1686, 79.9493], zone: 'WCR', type: 'terminal' },
  KOTA: { name: 'Kota Jn (KOTA)', coords: [25.2238, 75.8773], zone: 'WCR', type: 'junction' },
  MAO: { name: 'Madgaon Goa (MAO)', coords: [15.2736, 73.9794], zone: 'KRCL', type: 'terminal' },

  // Eastern (ER), East Central (ECR), South Eastern (SER), East Coast (ECoR), Kolkata Metro (METRO)
  HWH: { name: 'Howrah Jn (HWH)', coords: [22.5838, 88.3426], zone: 'ER', type: 'terminal' },
  SDAH: { name: 'Sealdah (SDAH)', coords: [22.5675, 88.3712], zone: 'ER', type: 'terminal' },
  PNBE: { name: 'Patna Jn (PNBE)', coords: [25.6022, 85.1376], zone: 'ECR', type: 'terminal' },
  DHN: { name: 'Dhanbad Jn (DHN)', coords: [23.7957, 86.4304], zone: 'ECR', type: 'junction' },
  DDU: { name: 'Pt. Deen Dayal Upadhyaya (DDU)', coords: [25.2785, 83.1189], zone: 'ECR', type: 'junction' },
  BSB: { name: 'Varanasi Jn (BSB)', coords: [25.3283, 82.9866], zone: 'NER', type: 'terminal' },
  GKP: { name: 'Gorakhpur Jn (GKP)', coords: [26.7588, 83.3818], zone: 'NER', type: 'junction' },
  KGP: { name: 'Kharagpur Jn (KGP)', coords: [22.3381, 87.3228], zone: 'SER', type: 'junction' },
  TATA: { name: 'Tatanagar Jn (TATA)', coords: [22.7661, 86.2029], zone: 'SER', type: 'junction' },
  RNC: { name: 'Ranchi Jn (RNC)', coords: [23.3441, 85.3096], zone: 'SER', type: 'terminal' },
  BSP: { name: 'Bilaspur Jn (BSP)', coords: [22.0797, 82.1409], zone: 'SECR', type: 'junction' },
  R: { name: 'Raipur Jn (R)', coords: [21.2514, 81.6296], zone: 'SECR', type: 'junction' },
  BBS: { name: 'Bhubaneswar (BBS)', coords: [20.2668, 85.8436], zone: 'ECoR', type: 'terminal' },
  VSKP: { name: 'Visakhapatnam (VSKP)', coords: [17.7214, 83.2986], zone: 'ECoR', type: 'terminal' },
  KMTR: { name: 'Kolkata Metro Esplanade', coords: [22.5645, 88.3516], zone: 'METRO', type: 'terminal' },

  // Southern (SR), South Central (SCR), South Western (SWR)
  MAS: { name: 'Chennai Central (MAS)', coords: [13.0827, 80.2757], zone: 'SR', type: 'terminal' },
  CBE: { name: 'Coimbatore Jn (CBE)', coords: [11.0016, 76.9629], zone: 'SR', type: 'junction' },
  MDU: { name: 'Madurai Jn (MDU)', coords: [9.9252, 78.1198], zone: 'SR', type: 'junction' },
  TVC: { name: 'Thiruvananthapuram (TVC)', coords: [8.4875, 76.9525], zone: 'SR', type: 'terminal' },
  SC: { name: 'Secunderabad Jn (SC)', coords: [17.4399, 78.5017], zone: 'SCR', type: 'terminal' },
  BZA: { name: 'Vijayawada Jn (BZA)', coords: [16.5186, 80.6198], zone: 'SCR', type: 'junction' },
  GTL: { name: 'Guntakal Jn (GTL)', coords: [15.1663, 77.3719], zone: 'SCR', type: 'junction' },
  SBC: { name: 'KSR Bengaluru City (SBC)', coords: [12.9784, 77.5685], zone: 'SWR', type: 'terminal' },
  MYS: { name: 'Mysuru Jn (MYS)', coords: [12.3168, 76.6493], zone: 'SWR', type: 'terminal' },
  UBL: { name: 'SSS Hubballi Jn (UBL)', coords: [15.3477, 75.1460], zone: 'SWR', type: 'junction' },

  // North Western (NWR) & Northeast Frontier (NFR)
  JP: { name: 'Jaipur Jn (JP)', coords: [26.9200, 75.7878], zone: 'NWR', type: 'terminal' },
  JU: { name: 'Jodhpur Jn (JU)', coords: [26.2847, 73.0243], zone: 'NWR', type: 'junction' },
  GHY: { name: 'Guwahati (GHY)', coords: [26.1862, 91.7540], zone: 'NFR', type: 'terminal' },
  NJP: { name: 'New Jalpaiguri (NJP)', coords: [26.6858, 88.4429], zone: 'NFR', type: 'junction' },
  DBRG: { name: 'Dibrugarh (DBRG)', coords: [27.4728, 94.9120], zone: 'NFR', type: 'terminal' },
};

// Pan-India Golden Quadrilateral & Zonal Mainline Corridors
const CORRIDOR_SEGMENTS = [
  // 1. Delhi - Howrah Main Trunk (Golden Quadrilateral North-East)
  {
    id: 'NDLS-GZB', name: 'New Delhi – Ghaziabad', zone: 'NR',
    waypoints: [[28.6431, 77.2197], [28.6520, 77.3100], [28.6675, 77.4338]],
    lineType: 'Quadruple Track', km: 32, density: 'High', status: 'maintenance',
    activeBlock: 'OHE + Track Joint Possession (00:30–04:30)', speedLimit: '130 km/h', color: '#DC2626', dept: 'Joint (ENG + TRD)',
  },
  {
    id: 'GZB-CNB', name: 'Ghaziabad – Kanpur Central', zone: 'NCR',
    waypoints: [[28.6675, 77.4338], [27.8974, 78.0880], [27.2081, 78.2396], [26.7769, 79.0232], [26.4547, 80.3507]],
    lineType: 'Double Track (Auto Signaling)', km: 440, density: 'High', status: 'scheduled',
    activeBlock: 'Upcoming Night Window 01:00–04:00', speedLimit: '130 km/h', color: '#F59E0B', dept: 'Track (TMS)',
  },
  {
    id: 'CNB-ALD', name: 'Kanpur – Prayagraj', zone: 'NCR',
    waypoints: [[26.4547, 80.3507], [25.9284, 80.8130], [25.4497, 81.8260]],
    lineType: 'Double Track', km: 198, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'ALD-DDU', name: 'Prayagraj – DDU / Mughal Sarai', zone: 'ECR',
    waypoints: [[25.4497, 81.8260], [25.1460, 82.5690], [25.2785, 83.1189]],
    lineType: 'Double Track', km: 128, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'DDU-DHN', name: 'DDU – Gaya – Dhanbad (Grand Chord)', zone: 'ECR',
    waypoints: [[25.2785, 83.1189], [24.7955, 85.0002], [23.7957, 86.4304]],
    lineType: 'Double Track (High Density Freight)', km: 295, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'DHN-HWH', name: 'Dhanbad – Asansol – Howrah', zone: 'ER',
    waypoints: [[23.7957, 86.4304], [23.6889, 86.9661], [23.2324, 87.8615], [22.5838, 88.3426]],
    lineType: 'Double Track', km: 260, density: 'High', status: 'maintenance',
    activeBlock: 'Sleeper Renewal & S&T Cabling', speedLimit: '130 km/h', color: '#DC2626', dept: 'Engineering',
  },

  // 2. Delhi - Mumbai Main Trunk (Golden Quadrilateral North-West)
  {
    id: 'NDLS-MTJ', name: 'New Delhi – Mathura (Gatimaan Path)', zone: 'NR',
    waypoints: [[28.6431, 77.2197], [28.5886, 77.2536], [28.4089, 77.3178], [27.4924, 77.6737]],
    lineType: 'Double Track ($160\\text{ km/h}$)', km: 141, density: 'High', status: 'maintenance',
    activeBlock: 'Signal Relay Interlocking Inspection', speedLimit: '160 km/h', color: '#DC2626', dept: 'S&T',
  },
  {
    id: 'MTJ-KOTA', name: 'Mathura – Kota', zone: 'WCR',
    waypoints: [[27.4924, 77.6737], [26.8500, 76.5000], [25.2238, 75.8773]],
    lineType: 'Double Track', km: 324, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'KOTA-RTM', name: 'Kota – Ratlam', zone: 'WR',
    waypoints: [[25.2238, 75.8773], [24.1500, 75.5000], [23.3441, 75.0384]],
    lineType: 'Double Track', km: 266, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'RTM-BRC', name: 'Ratlam – Vadodara', zone: 'WR',
    waypoints: [[23.3441, 75.0384], [22.7500, 74.0000], [22.3107, 73.1812]],
    lineType: 'Double Track', km: 260, density: 'High', status: 'scheduled',
    activeBlock: 'Bridge Girder Inspection Window', speedLimit: '130 km/h', color: '#F59E0B', dept: 'Engineering',
  },
  {
    id: 'BRC-MMCT', name: 'Vadodara – Surat – Mumbai Central', zone: 'WR',
    waypoints: [[22.3107, 73.1812], [21.2049, 72.8406], [20.3000, 72.9000], [19.2000, 72.8500], [18.9696, 72.8193]],
    lineType: 'Quadruple / Double Track', km: 392, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },

  // 3. Mumbai - Chennai Trunk (Golden Quadrilateral South-West)
  {
    id: 'CSMT-PUNE', name: 'Mumbai CSMT – Kalyan – Pune (Bhor Ghat)', zone: 'CR',
    waypoints: [[18.9400, 72.8353], [19.2396, 73.1305], [18.7500, 73.4000], [18.5289, 73.8744]],
    lineType: 'Triple Track Ghat Section', km: 192, density: 'High', status: 'maintenance',
    activeBlock: 'Ghat Catch Siding & OHE Neutral Section', speedLimit: '100 km/h', color: '#DC2626', dept: 'TRD + ENG',
  },
  {
    id: 'PUNE-GTL', name: 'Pune – Solapur – Guntakal', zone: 'CR',
    waypoints: [[18.5289, 73.8744], [17.6599, 75.9064], [15.1663, 77.3719]],
    lineType: 'Double Track Electrified', km: 580, density: 'Medium', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '110 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'GTL-MAS', name: 'Guntakal – Renigunta – Chennai Central', zone: 'SR',
    waypoints: [[15.1663, 77.3719], [13.6288, 79.4192], [13.0827, 80.2757]],
    lineType: 'Double Track', km: 448, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },

  // 4. Chennai - Howrah East Coast Trunk (Golden Quadrilateral South-East)
  {
    id: 'MAS-BZA', name: 'Chennai – Nellore – Vijayawada', zone: 'SCR',
    waypoints: [[13.0827, 80.2757], [14.4426, 79.9865], [16.5186, 80.6198]],
    lineType: 'Double Track ($130\\text{ km/h}$)', km: 430, density: 'High', status: 'scheduled',
    activeBlock: 'Cyclone Resilience OHE Guy Wire Tensioning', speedLimit: '130 km/h', color: '#F59E0B', dept: 'TRD',
  },
  {
    id: 'BZA-VSKP', name: 'Vijayawada – Rajahmundry – Visakhapatnam', zone: 'ECoR',
    waypoints: [[16.5186, 80.6198], [17.0005, 81.8040], [17.7214, 83.2986]],
    lineType: 'Double Track', km: 350, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'VSKP-BBS-KGP', name: 'Visakhapatnam – Bhubaneswar – Kharagpur', zone: 'SER',
    waypoints: [[17.7214, 83.2986], [20.2668, 85.8436], [21.4900, 86.9300], [22.3381, 87.3228], [22.5838, 88.3426]],
    lineType: 'Double Track', km: 760, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },

  // 5. Grand Trunk Diagonal (Delhi - Chennai via Bhopal, Nagpur)
  {
    id: 'AGC-JHS-BPL', name: 'Agra – Jhansi – Bhopal', zone: 'NCR',
    waypoints: [[27.1574, 77.9912], [26.2183, 78.1828], [25.4484, 78.5685], [23.2667, 77.4126]],
    lineType: 'Double Track', km: 388, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'BPL-NGP', name: 'Bhopal – Itarsi – Nagpur', zone: 'CR',
    waypoints: [[23.2667, 77.4126], [22.6100, 77.7600], [21.1524, 79.0888]],
    lineType: 'Double Track ($130\\text{ km/h}$)', km: 390, density: 'High', status: 'maintenance',
    activeBlock: 'Itarsi Yard Diamond Crossing Grinding', speedLimit: '130 km/h', color: '#DC2626', dept: 'Engineering',
  },
  {
    id: 'NGP-SC', name: 'Nagpur – Kazipet – Secunderabad', zone: 'SCR',
    waypoints: [[21.1524, 79.0888], [19.8000, 79.3500], [17.9784, 79.5941], [17.4399, 78.5017]],
    lineType: 'Double Track', km: 580, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'SC-SBC', name: 'Secunderabad – Guntakal – Bengaluru', zone: 'SWR',
    waypoints: [[17.4399, 78.5017], [15.1663, 77.3719], [12.9784, 77.5685]],
    lineType: 'Double Track Electrified', km: 620, density: 'Medium', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '110 km/h', color: '#10B981', dept: 'Normal',
  },

  // 6. Southern & Eastern Branch Lines
  {
    id: 'MAS-SBC-MYS', name: 'Chennai – Bengaluru – Mysuru', zone: 'SWR',
    waypoints: [[13.0827, 80.2757], [12.9784, 77.5685], [12.3168, 76.6493]],
    lineType: 'Double Track (Vande Bharat Route)', km: 496, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'MAS-CBE-TVC', name: 'Chennai – Coimbatore – Thiruvananthapuram', zone: 'SR',
    waypoints: [[13.0827, 80.2757], [11.0016, 76.9629], [9.9312, 76.2673], [8.4875, 76.9525]],
    lineType: 'Double Track', km: 820, density: 'High', status: 'scheduled',
    activeBlock: 'Palakkad Gap Monsoon Precaution Block', speedLimit: '110 km/h', color: '#F59E0B', dept: 'Engineering',
  },
  {
    id: 'DDU-PNBE-GHY', name: 'DDU – Patna – NJP – Guwahati (North East Link)', zone: 'NFR',
    waypoints: [[25.2785, 83.1189], [25.6022, 85.1376], [26.6858, 88.4429], [26.1862, 91.7540]],
    lineType: 'Double Track Electrified', km: 890, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '110 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'NDLS-JP-ADI', name: 'Delhi – Jaipur – Ahmedabad (Western Trunk)', zone: 'NWR',
    waypoints: [[28.6431, 77.2197], [28.1966, 76.6186], [26.9200, 75.7878], [24.5854, 73.7125], [23.0225, 72.6000]],
    lineType: 'Double Track Electrified', km: 930, density: 'High', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '130 km/h', color: '#10B981', dept: 'Normal',
  },
  {
    id: 'KYN-MAO', name: 'Mumbai – Konkan Railway – Madgaon (Goa)', zone: 'KRCL',
    waypoints: [[19.2396, 73.1305], [18.1500, 73.2000], [16.9900, 73.3000], [15.2736, 73.9794]],
    lineType: 'Single Track with Ro-Ro Sidings', km: 580, density: 'Medium', status: 'active',
    activeBlock: 'Clear for Traffic', speedLimit: '110 km/h', color: '#10B981', dept: 'Normal',
  },
];

export default function CorridorMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const { activeZone, setActiveZone } = useAuth();
  const [filter, setFilter] = useState('all');
  const [selectedSection, setSelectedSection] = useState(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
    }

    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [22.0, 79.0],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
      maxBounds: [[6.0, 65.0], [38.0, 100.0]],
      maxBoundsViscosity: 0.8,
    });

    mapInstanceRef.current = map;

    // 100% English Global GIS Map Tiles (Esri ArcGIS — Free, No API key required)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; National Geographic, DeLorme, NAVTEQ',
      maxZoom: 18,
      minZoom: 4,
    }).addTo(map);

    // Filter Stations by Active Zone if selected
    const activeStations = Object.entries(STATIONS).filter(([code, stn]) => {
      if (!activeZone || activeZone === 'ALL') return true;
      return stn.zone === activeZone;
    });

    // Draw Station Markers
    activeStations.forEach(([code, stn]) => {
      const isTerminal = stn.type === 'terminal';
      const customHtml = `
        <div style="
          width: ${isTerminal ? '14px' : '10px'};
          height: ${isTerminal ? '14px' : '10px'};
          background: ${isTerminal ? '#003366' : '#1A5276'};
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(0,34,68,0.45);
          cursor: pointer;
        "></div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: 'custom-station-icon',
        iconSize: [isTerminal ? 14 : 10, isTerminal ? 14 : 10],
        iconAnchor: [isTerminal ? 7 : 5, isTerminal ? 7 : 5],
      });

      const marker = L.marker(stn.coords, { icon: customIcon }).addTo(map);
      marker.bindTooltip(`<b>${stn.name}</b><br><span style="font-size: 10px; color: #64748B;">Zone: ${stn.zone} • ${stn.type.toUpperCase()}</span>`, {
        direction: 'top',
        offset: [0, -6],
        opacity: 0.95,
      });
    });

    // Filter Corridors by Active Zone and Status
    const filteredSegments = CORRIDOR_SEGMENTS.filter(seg => {
      const matchesZone = (!activeZone || activeZone === 'ALL') ? true : seg.zone === activeZone;
      if (!matchesZone) return false;

      if (filter === 'maintenance') return seg.status === 'maintenance' || seg.status === 'scheduled';
      if (filter === 'high_density') return seg.density === 'High';
      return true;
    });

    filteredSegments.forEach(seg => {
      const isBlock = seg.status === 'maintenance';
      const isSched = seg.status === 'scheduled';

      const polyline = L.polyline(seg.waypoints, {
        color: seg.color,
        weight: isBlock ? 6 : 4,
        opacity: 0.9,
        dashArray: isSched ? '8, 8' : undefined,
      }).addTo(map);

      const popupContent = `
        <div style="font-family: inherit; padding: 4px; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 13px; color: #003366;">${seg.name}</strong>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${isBlock ? '#FEE2E2' : isSched ? '#FEF3C7' : '#D1FAE5'}; color: ${isBlock ? '#991B1B' : isSched ? '#92400E' : '#065F46'};">
              ${isBlock ? 'ACTIVE BLOCK' : isSched ? 'SCHEDULED' : 'OPEN'}
            </span>
          </div>
          <p style="margin: 0 0 4px; font-size: 12px; color: #4B5563;"><b>Zone:</b> ${seg.zone} | <b>Track:</b> ${seg.lineType} (${seg.km} km)</p>
          <p style="margin: 0 0 4px; font-size: 12px; color: #4B5563;"><b>Speed Rating:</b> ${seg.speedLimit}</p>
          <p style="margin: 0 0 4px; font-size: 12px; color: #4B5563;"><b>Traffic Density:</b> <span style="color: ${seg.density === 'High' ? '#DC2626' : '#2563EB'}; font-weight: 700;">${seg.density}</span></p>
          <div style="margin-top: 8px; padding: 6px 10px; background: #F8FAFC; border-radius: 6px; border-left: 3px solid ${seg.color}; font-size: 11px; color: #334155;">
            <strong>Possession Status:</strong><br>${seg.activeBlock}
          </div>
        </div>
      `;

      polyline.bindPopup(popupContent);

      polyline.on('click', () => {
        setSelectedSection(seg);
      });
    });

    // Auto-fit bounds based on chosen Zone
    const selectedZoneObj = ZONAL_RAILWAYS.find(z => z.code === activeZone) || ZONAL_RAILWAYS[0];
    if (selectedZoneObj && selectedZoneObj.bounds) {
      map.fitBounds(selectedZoneObj.bounds, { padding: [30, 30] });
    } else {
      map.fitBounds([[8.0, 68.0], [35.5, 96.5]], { padding: [20, 20] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [filter, activeZone]);

  const activeZoneName = ZONAL_RAILWAYS.find(z => z.code === activeZone)?.name || 'Pan-India (All 18 Zones)';

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .leaflet-container {
          z-index: 1 !important;
          font-family: inherit;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 5 !important;
        }
        .leaflet-pane {
          z-index: 1 !important;
        }
      `}</style>

      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1F2937', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiLayers style={{ color: '#003366', fontSize: '17px' }} />
            {activeZoneName} — Live Network GIS Map
          </h3>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
            Track possession blocks, high-speed routes & section congestion monitoring across all 18 zones
          </p>
        </div>

        {/* Filter Toggle Pills & Zone Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Zone Picker */}
          <select
            value={activeZone || 'ALL'}
            onChange={(e) => setActiveZone(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
              border: '1px solid #003366', background: '#003366', color: '#FFFFFF', cursor: 'pointer', outline: 'none'
            }}
          >
            {ZONAL_RAILWAYS.map(z => (
              <option key={z.code} value={z.code} style={{ background: '#0A2540', color: '#FFFFFF' }}>
                {z.code === 'ALL' ? '🌐 All 18 Zones' : `${z.code} - ${z.name}`}
              </option>
            ))}
          </select>

          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              border: filter === 'all' ? '1px solid #003366' : '1px solid #E2E8F0',
              background: filter === 'all' ? '#E6EDF5' : '#FFFFFF',
              color: filter === 'all' ? '#003366' : '#475569',
              transition: 'all 0.15s'
            }}
          >
            All Corridors
          </button>
          <button
            onClick={() => setFilter('maintenance')}
            style={{
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              border: filter === 'maintenance' ? '1px solid #DC2626' : '1px solid #E2E8F0',
              background: filter === 'maintenance' ? '#DC2626' : '#FFFFFF',
              color: filter === 'maintenance' ? '#FFFFFF' : '#DC2626',
              transition: 'all 0.15s',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filter === 'maintenance' ? '#FFFFFF' : '#DC2626' }} />
            Active Blocks
          </button>
          <button
            onClick={() => setFilter('high_density')}
            style={{
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              border: filter === 'high_density' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: filter === 'high_density' ? '#2563EB' : '#FFFFFF',
              color: filter === 'high_density' ? '#FFFFFF' : '#2563EB',
              transition: 'all 0.15s'
            }}
          >
            Golden Quadrilateral Trunks
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}>
          <span style={{ fontWeight: '800', color: '#1E293B', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.04em' }}>
            Track Block Legend
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '3px', background: '#DC2626', borderRadius: '2px', display: 'inline-block' }} />
            <span>Active Maintenance Possession</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '3px', background: '#F59E0B', borderRadius: '2px', display: 'inline-block' }} />
            <span>Scheduled Block Window (Night/Off-Peak)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '3px', background: '#10B981', borderRadius: '2px', display: 'inline-block' }} />
            <span>Open / Normal Traffic</span>
          </div>
        </div>

        {/* Selected Section Detail Overlay */}
        {selectedSection && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            background: 'white',
            border: `2px solid ${selectedSection.color}`,
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            maxWidth: '260px',
            animation: 'fadeIn 0.2s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <strong style={{ fontSize: '13px', color: '#003366' }}>{selectedSection.name}</strong>
              <button onClick={() => setSelectedSection(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#94A3B8' }}>✕</button>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 6px' }}>Zone: <b>{selectedSection.zone}</b> • {selectedSection.lineType} • {selectedSection.km} km</p>
            <div style={{ fontSize: '11px', color: '#1E293B', background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px' }}>
              <strong>Status:</strong> {selectedSection.activeBlock}
            </div>
          </div>
        )}
      </div>

      {/* Pan-India Network Stats Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' }}>
        <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Active Zonal Coverage</span>
          <strong style={{ fontSize: '14px', color: '#003366' }}>{activeZone === 'ALL' ? 'All 18 Zonal Railways' : `${activeZone} Zonal Network`}</strong>
        </div>
        <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Pan-India Route Coverage</span>
          <strong style={{ fontSize: '14px', color: '#003366' }}>12,840 Route Km Tracked</strong>
        </div>
        <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Active Maintenance Possessions</span>
          <strong style={{ fontSize: '14px', color: '#DC2626' }}>4 Active Corridors</strong>
        </div>
        <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Golden Quad Punctuality</span>
          <strong style={{ fontSize: '14px', color: '#10B981' }}>98.6% On-Time Index</strong>
        </div>
      </div>
    </div>
  );
}
