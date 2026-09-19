# RailOpt AI — Frontend Client
### React 18 + Vite + TailwindCSS + UX4G Design System

The frontend interface for the **RailOpt AI** Indian Railways maintenance scheduling and block planning platform.

---

## 🎨 Design System & Accessibility
- **UX4G Guidelines**: Built adhering to the Indian e-Governance design guidelines (MeitY / NeGD) with official Indian Railways colors:
  - **Navy Blue**: `#003366`
  - **Saffron Action**: `#FF671F`
  - **India Green (Success)**: `#046A38`
  - **Neutral Canvas**: `#F4F6F8`
- **GIGW 3.0 Compliance**: Accessible color contrast, keyboard focus indicators, and screen-reader accessibility.

---

## 📂 Project Structure

```
client/src/
├── components/         # Shared UI components
│   └── layout/         # Header, Sidebar, Footer, ProtectedRoute
├── context/            # Authentication and Role context (AuthContext)
├── pages/              # Primary application views
│   ├── Dashboard.jsx        # Operations overview, KPIs, Recharts
│   ├── DataIntegration.jsx  # TMS/SMMS/TDMS telemetry & CSV upload
│   ├── Prioritization.jsx   # Hybrid AI scoring & SHAP explanations
│   ├── Schedules.jsx        # FullCalendar Gantt & joint block optimizer
│   ├── Requests.jsx         # Block submission & approval queue
│   ├── CorridorMapPage.jsx  # Geographic rail corridor visualizer
│   ├── AssistantPage.jsx    # RailOpt AI copilot & alert monitor
│   ├── Reports.jsx          # Section availability & Excel exports
│   └── Login.jsx            # Multi-role authentication portal
├── services/           # Axios API service integrations
└── utils/              # Formatter utilities, constants, corridor segments
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start Vite development server on port 3000
npm run dev

# Build for production
npm run build
```
