"""
Comprehensive Corridor Definitions for all 18 Zonal Railways of Indian Railways.
Sourced from official Indian Railways division maps & data.gov.in GPS coordinates.
"""

ALL_18_ZONE_CORRIDORS = [
    # ─── 1. Northern Railway (NR) ─────────────────────────
    {
        "section_id": "NDLS-GZB", "section_name": "New Delhi - Ghaziabad",
        "from_station": "New Delhi", "to_station": "Ghaziabad",
        "line_type": "quadruple", "traffic_density": "high", "total_km": 32.0, "electrified": True,
        "zone": "Northern Railway", "zone_code": "NR", "division": "Delhi",
        "lat_from": 28.614, "lon_from": 77.209, "lat_to": 28.669, "lon_to": 77.453
    },
    {
        "section_id": "NDLS-NZM", "section_name": "New Delhi - Hazrat Nizamuddin",
        "from_station": "New Delhi", "to_station": "H. Nizamuddin",
        "line_type": "quadruple", "traffic_density": "high", "total_km": 8.0, "electrified": True,
        "zone": "Northern Railway", "zone_code": "NR", "division": "Delhi",
        "lat_from": 28.614, "lon_from": 77.209, "lat_to": 28.588, "lon_to": 77.253
    },
    {
        "section_id": "AMB-CDG", "section_name": "Ambala - Chandigarh",
        "from_station": "Ambala Cantt", "to_station": "Chandigarh",
        "line_type": "double", "traffic_density": "medium", "total_km": 46.0, "electrified": True,
        "zone": "Northern Railway", "zone_code": "NR", "division": "Ambala",
        "lat_from": 30.378, "lon_from": 76.776, "lat_to": 30.704, "lon_to": 76.802
    },
    {
        "section_id": "LKO-BSB", "section_name": "Lucknow - Varanasi",
        "from_station": "Lucknow NR", "to_station": "Varanasi Jn",
        "line_type": "double", "traffic_density": "medium", "total_km": 286.0, "electrified": True,
        "zone": "Northern Railway", "zone_code": "NR", "division": "Lucknow",
        "lat_from": 26.832, "lon_from": 80.923, "lat_to": 25.328, "lon_to": 82.991
    },

    # ─── 2. North Central Railway (NCR) ───────────────────
    {
        "section_id": "GZB-CNB", "section_name": "Ghaziabad - Kanpur",
        "from_station": "Ghaziabad", "to_station": "Kanpur Central",
        "line_type": "double", "traffic_density": "high", "total_km": 440.0, "electrified": True,
        "zone": "North Central Railway", "zone_code": "NCR", "division": "Prayagraj",
        "lat_from": 28.669, "lon_from": 77.453, "lat_to": 26.454, "lon_to": 80.350
    },
    {
        "section_id": "CNB-PRYJ", "section_name": "Kanpur - Prayagraj",
        "from_station": "Kanpur Central", "to_station": "Prayagraj Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 194.0, "electrified": True,
        "zone": "North Central Railway", "zone_code": "NCR", "division": "Prayagraj",
        "lat_from": 26.454, "lon_from": 80.350, "lat_to": 25.435, "lon_to": 81.846
    },
    {
        "section_id": "PRYJ-DDU", "section_name": "Prayagraj - Pt. Deen Dayal Upadhyaya",
        "from_station": "Prayagraj Jn", "to_station": "Pt. DDU Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 153.0, "electrified": True,
        "zone": "North Central Railway", "zone_code": "NCR", "division": "Prayagraj",
        "lat_from": 25.435, "lon_from": 81.846, "lat_to": 25.281, "lon_to": 83.123
    },
    {
        "section_id": "AGC-GWL", "section_name": "Agra - Gwalior",
        "from_station": "Agra Cantt", "to_station": "Gwalior Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 118.0, "electrified": True,
        "zone": "North Central Railway", "zone_code": "NCR", "division": "Agra",
        "lat_from": 27.159, "lon_from": 77.994, "lat_to": 26.218, "lon_to": 78.182
    },

    # ─── 3. Central Railway (CR) ──────────────────────────
    {
        "section_id": "CSMT-KYN", "section_name": "Mumbai CSMT - Kalyan",
        "from_station": "Mumbai CSMT", "to_station": "Kalyan Jn",
        "line_type": "quadruple", "traffic_density": "high", "total_km": 54.0, "electrified": True,
        "zone": "Central Railway", "zone_code": "CR", "division": "Mumbai CR",
        "lat_from": 18.940, "lon_from": 72.835, "lat_to": 19.243, "lon_to": 73.135
    },
    {
        "section_id": "KYN-PUNE", "section_name": "Kalyan - Pune",
        "from_station": "Kalyan Jn", "to_station": "Pune Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 138.0, "electrified": True,
        "zone": "Central Railway", "zone_code": "CR", "division": "Pune",
        "lat_from": 19.243, "lon_from": 73.135, "lat_to": 18.528, "lon_to": 73.874
    },
    {
        "section_id": "KYN-BSL", "section_name": "Kalyan - Bhusawal",
        "from_station": "Kalyan Jn", "to_station": "Bhusawal Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 388.0, "electrified": True,
        "zone": "Central Railway", "zone_code": "CR", "division": "Bhusawal",
        "lat_from": 19.243, "lon_from": 73.135, "lat_to": 21.045, "lon_to": 75.787
    },
    {
        "section_id": "NGP-WR", "section_name": "Nagpur - Wardha",
        "from_station": "Nagpur Jn", "to_station": "Wardha Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 79.0, "electrified": True,
        "zone": "Central Railway", "zone_code": "CR", "division": "Nagpur",
        "lat_from": 21.152, "lon_from": 79.088, "lat_to": 20.745, "lon_to": 78.602
    },

    # ─── 4. Western Railway (WR) ──────────────────────────
    {
        "section_id": "MMCT-BVI", "section_name": "Mumbai Central - Borivali",
        "from_station": "Mumbai Central", "to_station": "Borivali",
        "line_type": "quadruple", "traffic_density": "high", "total_km": 34.0, "electrified": True,
        "zone": "Western Railway", "zone_code": "WR", "division": "Mumbai WR",
        "lat_from": 18.969, "lon_from": 72.819, "lat_to": 19.229, "lon_to": 72.857
    },
    {
        "section_id": "BVI-ST", "section_name": "Borivali - Surat",
        "from_station": "Borivali", "to_station": "Surat",
        "line_type": "double", "traffic_density": "high", "total_km": 230.0, "electrified": True,
        "zone": "Western Railway", "zone_code": "WR", "division": "Mumbai WR",
        "lat_from": 19.229, "lon_from": 72.857, "lat_to": 21.205, "lon_to": 72.841
    },
    {
        "section_id": "ST-BRC", "section_name": "Surat - Vadodara",
        "from_station": "Surat", "to_station": "Vadodara Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 129.0, "electrified": True,
        "zone": "Western Railway", "zone_code": "WR", "division": "Vadodara",
        "lat_from": 21.205, "lon_from": 72.841, "lat_to": 22.310, "lon_to": 73.181
    },
    {
        "section_id": "BRC-ADI", "section_name": "Vadodara - Ahmedabad",
        "from_station": "Vadodara Jn", "to_station": "Ahmedabad Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 100.0, "electrified": True,
        "zone": "Western Railway", "zone_code": "WR", "division": "Ahmedabad",
        "lat_from": 22.310, "lon_from": 73.181, "lat_to": 23.022, "lon_to": 72.599
    },

    # ─── 5. Eastern Railway (ER) ──────────────────────────
    {
        "section_id": "HWH-BWN", "section_name": "Howrah - Barddhaman",
        "from_station": "Howrah Jn", "to_station": "Barddhaman Jn",
        "line_type": "quadruple", "traffic_density": "high", "total_km": 95.0, "electrified": True,
        "zone": "Eastern Railway", "zone_code": "ER", "division": "Howrah",
        "lat_from": 22.584, "lon_from": 88.343, "lat_to": 23.232, "lon_to": 87.863
    },
    {
        "section_id": "BWN-ASN", "section_name": "Barddhaman - Asansol",
        "from_station": "Barddhaman Jn", "to_station": "Asansol Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 106.0, "electrified": True,
        "zone": "Eastern Railway", "zone_code": "ER", "division": "Asansol",
        "lat_from": 23.232, "lon_from": 87.863, "lat_to": 23.688, "lon_to": 86.966
    },
    {
        "section_id": "SDAH-RHA", "section_name": "Sealdah - Ranaghat",
        "from_station": "Sealdah", "to_station": "Ranaghat Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 74.0, "electrified": True,
        "zone": "Eastern Railway", "zone_code": "ER", "division": "Sealdah",
        "lat_from": 22.569, "lon_from": 88.371, "lat_to": 23.180, "lon_to": 88.580
    },

    # ─── 6. East Central Railway (ECR) ────────────────────
    {
        "section_id": "DDU-PNBE", "section_name": "Pt. DDU - Patna",
        "from_station": "Pt. DDU Jn", "to_station": "Patna Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 212.0, "electrified": True,
        "zone": "East Central Railway", "zone_code": "ECR", "division": "Danapur",
        "lat_from": 25.281, "lon_from": 83.123, "lat_to": 25.602, "lon_to": 85.137
    },
    {
        "section_id": "PNBE-MKA", "section_name": "Patna - Mokama",
        "from_station": "Patna Jn", "to_station": "Mokama Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 89.0, "electrified": True,
        "zone": "East Central Railway", "zone_code": "ECR", "division": "Danapur",
        "lat_from": 25.602, "lon_from": 85.137, "lat_to": 25.398, "lon_to": 85.918
    },
    {
        "section_id": "DHN-GMO", "section_name": "Dhanbad - Gomoh",
        "from_station": "Dhanbad Jn", "to_station": "Netaji SC Bose Gomoh",
        "line_type": "double", "traffic_density": "high", "total_km": 30.0, "electrified": True,
        "zone": "East Central Railway", "zone_code": "ECR", "division": "Dhanbad",
        "lat_from": 23.791, "lon_from": 86.430, "lat_to": 23.874, "lon_to": 86.155
    },

    # ─── 7. East Coast Railway (ECoR) ─────────────────────
    {
        "section_id": "BBS-CTC", "section_name": "Bhubaneswar - Cuttack",
        "from_station": "Bhubaneswar", "to_station": "Cuttack Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 28.0, "electrified": True,
        "zone": "East Coast Railway", "zone_code": "ECoR", "division": "Khurda Road",
        "lat_from": 20.264, "lon_from": 85.843, "lat_to": 20.462, "lon_to": 85.882
    },
    {
        "section_id": "CTC-PURI", "section_name": "Cuttack - Puri",
        "from_station": "Cuttack Jn", "to_station": "Puri",
        "line_type": "double", "traffic_density": "medium", "total_km": 91.0, "electrified": True,
        "zone": "East Coast Railway", "zone_code": "ECoR", "division": "Khurda Road",
        "lat_from": 20.462, "lon_from": 85.882, "lat_to": 19.813, "lon_to": 85.831
    },
    {
        "section_id": "KUR-VZM", "section_name": "Khurda Road - Vizianagaram",
        "from_station": "Khurda Road Jn", "to_station": "Vizianagaram Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 364.0, "electrified": True,
        "zone": "East Coast Railway", "zone_code": "ECoR", "division": "Waltair",
        "lat_from": 20.183, "lon_from": 85.744, "lat_to": 18.115, "lon_to": 83.417
    },

    # ─── 8. South Eastern Railway (SER) ───────────────────
    {
        "section_id": "HWH-KGP", "section_name": "Howrah - Kharagpur",
        "from_station": "Howrah Jn", "to_station": "Kharagpur Jn",
        "line_type": "triple", "traffic_density": "high", "total_km": 115.0, "electrified": True,
        "zone": "South Eastern Railway", "zone_code": "SER", "division": "Kharagpur",
        "lat_from": 22.584, "lon_from": 88.343, "lat_to": 22.330, "lon_to": 87.324
    },
    {
        "section_id": "KGP-TATA", "section_name": "Kharagpur - Tatanagar",
        "from_station": "Kharagpur Jn", "to_station": "Tatanagar Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 134.0, "electrified": True,
        "zone": "South Eastern Railway", "zone_code": "SER", "division": "Chakradharpur",
        "lat_from": 22.330, "lon_from": 87.324, "lat_to": 22.774, "lon_to": 86.202
    },
    {
        "section_id": "TATA-ROU", "section_name": "Tatanagar - Rourkela",
        "from_station": "Tatanagar Jn", "to_station": "Rourkela Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 163.0, "electrified": True,
        "zone": "South Eastern Railway", "zone_code": "SER", "division": "Chakradharpur",
        "lat_from": 22.774, "lon_from": 86.202, "lat_to": 22.226, "lon_to": 84.862
    },

    # ─── 9. South East Central Railway (SECR) ─────────────
    {
        "section_id": "BSP-R", "section_name": "Bilaspur - Raipur",
        "from_station": "Bilaspur Jn", "to_station": "Raipur Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 111.0, "electrified": True,
        "zone": "South East Central Railway", "zone_code": "SECR", "division": "Bilaspur",
        "lat_from": 22.079, "lon_from": 82.140, "lat_to": 21.251, "lon_to": 81.629
    },
    {
        "section_id": "R-DURG", "section_name": "Raipur - Durg",
        "from_station": "Raipur Jn", "to_station": "Durg Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 37.0, "electrified": True,
        "zone": "South East Central Railway", "zone_code": "SECR", "division": "Raipur",
        "lat_from": 21.251, "lon_from": 81.629, "lat_to": 21.190, "lon_to": 81.284
    },
    {
        "section_id": "DURG-G", "section_name": "Durg - Gondia",
        "from_station": "Durg Jn", "to_station": "Gondia Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 135.0, "electrified": True,
        "zone": "South East Central Railway", "zone_code": "SECR", "division": "Nagpur SECR",
        "lat_from": 21.190, "lon_from": 81.284, "lat_to": 21.458, "lon_to": 80.196
    },

    # ─── 10. Southern Railway (SR) ────────────────────────
    {
        "section_id": "MAS-AJJ", "section_name": "Chennai Central - Arakkonam",
        "from_station": "MGR Chennai Central", "to_station": "Arakkonam Jn",
        "line_type": "quadruple", "traffic_density": "high", "total_km": 69.0, "electrified": True,
        "zone": "Southern Railway", "zone_code": "SR", "division": "Chennai",
        "lat_from": 13.082, "lon_from": 80.275, "lat_to": 13.078, "lon_to": 79.667
    },
    {
        "section_id": "AJJ-KPD", "section_name": "Arakkonam - Katpadi",
        "from_station": "Arakkonam Jn", "to_station": "Katpadi Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 61.0, "electrified": True,
        "zone": "Southern Railway", "zone_code": "SR", "division": "Chennai",
        "lat_from": 13.078, "lon_from": 79.667, "lat_to": 12.969, "lon_to": 79.137
    },
    {
        "section_id": "ED-CBE", "section_name": "Erode - Coimbatore",
        "from_station": "Erode Jn", "to_station": "Coimbatore Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 101.0, "electrified": True,
        "zone": "Southern Railway", "zone_code": "SR", "division": "Salem",
        "lat_from": 11.341, "lon_from": 77.728, "lat_to": 11.001, "lon_to": 76.966
    },
    {
        "section_id": "TVC-QLN", "section_name": "Thiruvananthapuram - Kollam",
        "from_station": "Thiruvananthapuram Central", "to_station": "Kollam Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 65.0, "electrified": True,
        "zone": "Southern Railway", "zone_code": "SR", "division": "Thiruvananthapuram",
        "lat_from": 8.487, "lon_from": 76.952, "lat_to": 8.893, "lon_to": 76.595
    },

    # ─── 11. South Central Railway (SCR) ──────────────────
    {
        "section_id": "SC-KZJ", "section_name": "Secunderabad - Kazipet",
        "from_station": "Secunderabad Jn", "to_station": "Kazipet Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 132.0, "electrified": True,
        "zone": "South Central Railway", "zone_code": "SCR", "division": "Secunderabad",
        "lat_from": 17.434, "lon_from": 78.501, "lat_to": 17.978, "lon_to": 79.520
    },
    {
        "section_id": "KZJ-BZA", "section_name": "Kazipet - Vijayawada",
        "from_station": "Kazipet Jn", "to_station": "Vijayawada Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 217.0, "electrified": True,
        "zone": "South Central Railway", "zone_code": "SCR", "division": "Vijayawada",
        "lat_from": 17.978, "lon_from": 79.520, "lat_to": 16.519, "lon_to": 80.620
    },
    {
        "section_id": "BZA-GDR", "section_name": "Vijayawada - Gudur",
        "from_station": "Vijayawada Jn", "to_station": "Gudur Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 293.0, "electrified": True,
        "zone": "South Central Railway", "zone_code": "SCR", "division": "Vijayawada",
        "lat_from": 16.519, "lon_from": 80.620, "lat_to": 14.146, "lon_to": 79.850
    },

    # ─── 12. South Western Railway (SWR) ──────────────────
    {
        "section_id": "SBC-MYS", "section_name": "Bengaluru - Mysuru",
        "from_station": "KSR Bengaluru", "to_station": "Mysuru Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 138.0, "electrified": True,
        "zone": "South Western Railway", "zone_code": "SWR", "division": "Bengaluru",
        "lat_from": 12.978, "lon_from": 77.569, "lat_to": 12.316, "lon_to": 76.649
    },
    {
        "section_id": "SBC-YPR", "section_name": "Bengaluru - Yesvantpur",
        "from_station": "KSR Bengaluru", "to_station": "Yesvantpur Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 6.0, "electrified": True,
        "zone": "South Western Railway", "zone_code": "SWR", "division": "Bengaluru",
        "lat_from": 12.978, "lon_from": 77.569, "lat_to": 13.023, "lon_to": 77.550
    },
    {
        "section_id": "UBL-BGM", "section_name": "Hubballi - Belagavi",
        "from_station": "SSS Hubballi Jn", "to_station": "Belagavi",
        "line_type": "double", "traffic_density": "medium", "total_km": 142.0, "electrified": True,
        "zone": "South Western Railway", "zone_code": "SWR", "division": "Hubballi",
        "lat_from": 15.352, "lon_from": 75.143, "lat_to": 15.864, "lon_to": 74.508
    },

    # ─── 13. North Western Railway (NWR) ──────────────────
    {
        "section_id": "JP-AII", "section_name": "Jaipur - Ajmer",
        "from_station": "Jaipur Jn", "to_station": "Ajmer Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 135.0, "electrified": True,
        "zone": "North Western Railway", "zone_code": "NWR", "division": "Jaipur",
        "lat_from": 26.920, "lon_from": 75.787, "lat_to": 26.452, "lon_to": 74.639
    },
    {
        "section_id": "AII-ABR", "section_name": "Ajmer - Abu Road",
        "from_station": "Ajmer Jn", "to_station": "Abu Road",
        "line_type": "double", "traffic_density": "medium", "total_km": 305.0, "electrified": True,
        "zone": "North Western Railway", "zone_code": "NWR", "division": "Ajmer",
        "lat_from": 26.452, "lon_from": 74.639, "lat_to": 24.482, "lon_to": 72.781
    },
    {
        "section_id": "RE-JP", "section_name": "Rewari - Jaipur",
        "from_station": "Rewari Jn", "to_station": "Jaipur Jn",
        "line_type": "double", "traffic_density": "medium", "total_km": 225.0, "electrified": True,
        "zone": "North Western Railway", "zone_code": "NWR", "division": "Jaipur",
        "lat_from": 28.192, "lon_from": 76.619, "lat_to": 26.920, "lon_to": 75.787
    },

    # ─── 14. North Eastern Railway (NER) ──────────────────
    {
        "section_id": "GKP-BST", "section_name": "Gorakhpur - Basti",
        "from_station": "Gorakhpur Jn", "to_station": "Basti",
        "line_type": "double", "traffic_density": "high", "total_km": 64.0, "electrified": True,
        "zone": "North Eastern Railway", "zone_code": "NER", "division": "Lucknow NER",
        "lat_from": 26.760, "lon_from": 83.373, "lat_to": 26.799, "lon_to": 82.747
    },
    {
        "section_id": "GKP-CPR", "section_name": "Gorakhpur - Chhapra",
        "from_station": "Gorakhpur Jn", "to_station": "Chhapra Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 180.0, "electrified": True,
        "zone": "North Eastern Railway", "zone_code": "NER", "division": "Varanasi",
        "lat_from": 26.760, "lon_from": 83.373, "lat_to": 25.779, "lon_to": 84.727
    },
    {
        "section_id": "LJN-GD", "section_name": "Lucknow Jn - Gonda",
        "from_station": "Lucknow Jn NER", "to_station": "Gonda Jn",
        "line_type": "double", "traffic_density": "medium", "total_km": 125.0, "electrified": True,
        "zone": "North Eastern Railway", "zone_code": "NER", "division": "Lucknow NER",
        "lat_from": 26.832, "lon_from": 80.923, "lat_to": 27.133, "lon_to": 81.961
    },

    # ─── 15. Northeast Frontier Railway (NFR) ─────────────
    {
        "section_id": "GHY-NBQ", "section_name": "Guwahati - New Bongaigaon",
        "from_station": "Guwahati", "to_station": "New Bongaigaon",
        "line_type": "double", "traffic_density": "high", "total_km": 182.0, "electrified": True,
        "zone": "Northeast Frontier Railway", "zone_code": "NFR", "division": "Rangiya",
        "lat_from": 26.182, "lon_from": 91.753, "lat_to": 26.505, "lon_to": 90.559
    },
    {
        "section_id": "KIR-NJP", "section_name": "Katihar - New Jalpaiguri",
        "from_station": "Katihar Jn", "to_station": "New Jalpaiguri",
        "line_type": "double", "traffic_density": "high", "total_km": 184.0, "electrified": True,
        "zone": "Northeast Frontier Railway", "zone_code": "NFR", "division": "Katihar",
        "lat_from": 25.541, "lon_from": 87.571, "lat_to": 26.685, "lon_to": 88.442
    },
    {
        "section_id": "LMG-DBRG", "section_name": "Lumding - Dibrugarh",
        "from_station": "Lumding Jn", "to_station": "Dibrugarh",
        "line_type": "single", "traffic_density": "medium", "total_km": 376.0, "electrified": True,
        "zone": "Northeast Frontier Railway", "zone_code": "NFR", "division": "Lumding",
        "lat_from": 25.750, "lon_from": 93.170, "lat_to": 27.472, "lon_to": 94.912
    },

    # ─── 16. West Central Railway (WCR) ───────────────────
    {
        "section_id": "BPL-ET", "section_name": "Bhopal - Itarsi",
        "from_station": "Bhopal Jn", "to_station": "Itarsi Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 92.0, "electrified": True,
        "zone": "West Central Railway", "zone_code": "WCR", "division": "Bhopal",
        "lat_from": 23.268, "lon_from": 77.410, "lat_to": 21.780, "lon_to": 77.760
    },
    {
        "section_id": "ET-JBP", "section_name": "Itarsi - Jabalpur",
        "from_station": "Itarsi Jn", "to_station": "Jabalpur Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 244.0, "electrified": True,
        "zone": "West Central Railway", "zone_code": "WCR", "division": "Jabalpur",
        "lat_from": 21.780, "lon_from": 77.760, "lat_to": 23.168, "lon_to": 79.950
    },
    {
        "section_id": "KOTA-SWM", "section_name": "Kota - Sawai Madhopur",
        "from_station": "Kota Jn", "to_station": "Sawai Madhopur Jn",
        "line_type": "double", "traffic_density": "high", "total_km": 108.0, "electrified": True,
        "zone": "West Central Railway", "zone_code": "WCR", "division": "Kota",
        "lat_from": 25.213, "lon_from": 75.864, "lat_to": 25.992, "lon_to": 76.368
    },

    # ─── 17. Konkan Railway (KRCL) ────────────────────────
    {
        "section_id": "ROHA-RN", "section_name": "Roha - Ratnagiri",
        "from_station": "Roha", "to_station": "Ratnagiri",
        "line_type": "single", "traffic_density": "medium", "total_km": 204.0, "electrified": True,
        "zone": "Konkan Railway", "zone_code": "KRCL", "division": "Ratnagiri",
        "lat_from": 18.436, "lon_from": 73.118, "lat_to": 16.990, "lon_to": 73.312
    },
    {
        "section_id": "RN-MAO", "section_name": "Ratnagiri - Madgaon",
        "from_station": "Ratnagiri", "to_station": "Madgaon Jn",
        "line_type": "single", "traffic_density": "medium", "total_km": 236.0, "electrified": True,
        "zone": "Konkan Railway", "zone_code": "KRCL", "division": "Ratnagiri",
        "lat_from": 16.990, "lon_from": 73.312, "lat_to": 15.273, "lon_to": 73.979
    },
    {
        "section_id": "MAO-KAWR", "section_name": "Madgaon - Karwar",
        "from_station": "Madgaon Jn", "to_station": "Karwar",
        "line_type": "single", "traffic_density": "medium", "total_km": 60.0, "electrified": True,
        "zone": "Konkan Railway", "zone_code": "KRCL", "division": "Karwar",
        "lat_from": 15.273, "lon_from": 73.979, "lat_to": 14.818, "lon_to": 74.124
    },

    # ─── 18. Kolkata Metro (METRO) ────────────────────────
    {
        "section_id": "DUM-DAK", "section_name": "Dum Dum - Dakshineswar",
        "from_station": "Dum Dum", "to_station": "Dakshineswar",
        "line_type": "double", "traffic_density": "high", "total_km": 6.2, "electrified": True,
        "zone": "Kolkata Metro", "zone_code": "METRO", "division": "Kolkata Metro",
        "lat_from": 22.621, "lon_from": 88.393, "lat_to": 22.653, "lon_to": 88.358
    },
    {
        "section_id": "HOW-ESPL", "section_name": "Howrah - Esplanade (Underwater)",
        "from_station": "Howrah Metro", "to_station": "Esplanade",
        "line_type": "double", "traffic_density": "high", "total_km": 4.8, "electrified": True,
        "zone": "Kolkata Metro", "zone_code": "METRO", "division": "Kolkata Metro",
        "lat_from": 22.584, "lon_from": 88.343, "lat_to": 22.564, "lon_to": 88.351
    },
]
