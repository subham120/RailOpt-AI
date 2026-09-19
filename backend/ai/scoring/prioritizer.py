"""
XGBoost + Rule hybrid prioritization engine with SHAP explanations.
5 features: safety, overdue, traffic, recurrence, inspection_gap.
Model persisted to disk — never retrained at runtime.
"""
import hashlib
import logging
import os
import pickle
import numpy as np
from datetime import date
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "models" / "criticality_v2.pkl"
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

# ─── Lookup tables ───────────────────────────────────────

SAFETY_SCORES: dict[str, float] = {
    # Engineering (P-way)
    "Rail fracture": 1.0,
    "Rail joint failure": 0.95,
    "Track geometry defect": 0.85,
    "Bridge inspection": 0.80,
    "Ballast renewal": 0.65,
    "Sleeper replacement": 0.60,
    "Level crossing maintenance": 0.75,
    "Drain cleaning": 0.30,
    "Vegetation clearance": 0.20,
    # Signal & Telecom
    "Track circuit failure": 1.0,
    "Signal failure": 0.98,
    "Point machine failure": 0.95,
    "Axle counter failure": 0.90,
    "OFC cable cut": 0.70,
    "BSNL equipment fault": 0.45,
    "Panel maintenance": 0.50,
    # Traction Distribution
    "OHE wire break": 1.0,
    "Insulator flashover": 0.95,
    "Power supply interruption": 0.98,
    "Pantograph damage": 0.88,
    "Booster transformer failure": 0.75,
    "Sectioning post maintenance": 0.55,
    "OHE mast inspection": 0.40,
}

TRAFFIC_SCORE_MAP = {"high": 1.0, "medium": 0.6, "low": 0.3}


# ─── Engine ──────────────────────────────────────────────

class PrioritizationEngine:
    def __init__(self):
        self._model = None
        self._explainer = None
        self._model_loaded = False
        self._model_hash: str | None = None

    def _compute_hash(self, path: Path) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()

    def _load_model(self):
        if self._model_loaded:
            return
        if MODEL_PATH.exists():
            try:
                self._model_hash = self._compute_hash(MODEL_PATH)
                with open(MODEL_PATH, "rb") as f:
                    self._model = pickle.load(f)
                logger.info(f"[Prioritizer] Loaded ML model from {MODEL_PATH} (SHA-256: {self._model_hash[:12]}...)")
                try:
                    import shap
                    self._explainer = shap.TreeExplainer(self._model)
                except Exception as e:
                    logger.debug(f"[Prioritizer] SHAP TreeExplainer init deferred: {e}")
                    self._explainer = None
            except Exception as e:
                logger.warning(f"[Prioritizer] Could not load model: {e} — using rule-only mode")
                self._model = None
                self._explainer = None
        else:
            logger.info("[Prioritizer] No saved model found — using rule-only mode. Run trainer.py to train.")
        self._model_loaded = True

    def _extract_features(self, task: dict, traffic_density: str = "medium") -> np.ndarray:
        """
        5-feature vector:
          [safety_score, overdue_norm, traffic_score, recurrence_norm, inspection_gap_norm]
        """
        today = date.today()

        # Feature 1: Safety (defect type lookup)
        defect = task.get("defectType") or task.get("defect_type", "")
        safety = SAFETY_SCORES.get(defect)
        if safety is None:
            # Fall back on criticality field if defect not in lookup
            crit = task.get("criticality", "medium")
            safety = {"critical": 0.9, "high": 0.7, "medium": 0.45, "low": 0.25}.get(crit, 0.45)

        # Feature 2: Overdue days (clipped at 30 days → 1.0)
        due_date_raw = task.get("dueDate") or task.get("due_date")
        try:
            if isinstance(due_date_raw, str):
                due_dt = date.fromisoformat(due_date_raw[:10])
            elif isinstance(due_date_raw, date):
                due_dt = due_date_raw
            else:
                due_dt = today
            days_overdue = max(0, (today - due_dt).days)
        except Exception:
            days_overdue = 0
        overdue_norm = min(1.0, days_overdue / 30.0)

        # Feature 3: Traffic density of section
        traffic = TRAFFIC_SCORE_MAP.get(traffic_density, 0.6)

        # Feature 4: Recurrence (clipped at 5 occurrences → 1.0)
        recurrence = min(1.0, (task.get("recurrenceCount") or task.get("recurrence_count") or 0) / 5.0)

        # Feature 5: Inspection gap (clipped at 90 days → 1.0)
        gap = task.get("inspectionGapDays") or task.get("inspection_gap_days") or 0
        inspection_gap_norm = min(1.0, gap / 90.0)

        return np.array([[safety, overdue_norm, traffic, recurrence, inspection_gap_norm]], dtype=np.float32)

    def _rule_score(self, features: np.ndarray) -> float:
        """Weighted rule formula as fallback and as training label component."""
        safety, overdue, traffic, recurrence, gap = features[0]
        return float(
            0.35 * safety
            + 0.25 * overdue
            + 0.18 * traffic
            + 0.12 * recurrence
            + 0.10 * gap
        )

    def score_tasks(self, tasks: list[dict], corridor_map: dict[str, str]) -> list[dict]:
        """
        Score a list of task dicts. Returns scored list sorted by criticalityScore descending.
        corridor_map: {section_id -> traffic_density}
        """
        self._load_model()

        results = []
        for task in tasks:
            td = corridor_map.get(task.get("sectionId") or task.get("section_id", ""), "medium")
            features = self._extract_features(task, td)
            rule = self._rule_score(features)

            if self._model is not None:
                try:
                    ml_score = float(self._model.predict(features)[0])
                    # Hybrid: 60% ML, 40% rule — ML anchors on historical pattern, rule on domain logic
                    final_score = 0.6 * ml_score + 0.4 * rule
                except Exception:
                    ml_score = rule
                    final_score = rule
            else:
                ml_score = rule
                final_score = rule

            final_score = round(min(1.0, max(0.0, final_score)), 4)
            tier = (
                "Critical" if final_score >= 0.75
                else "High" if final_score >= 0.55
                else "Medium" if final_score >= 0.35
                else "Low"
            )

            safety, overdue, traffic, recurrence, gap = features[0].tolist()

            # Plain English reason generator
            reasons = []
            if safety >= 0.8:
                reasons.append("High track safety risk")
            elif safety >= 0.6:
                reasons.append("Moderate safety impact")

            if overdue >= 0.7:
                reasons.append("Maintenance is overdue")
            elif overdue >= 0.4:
                reasons.append("Approaching due date")

            if traffic >= 0.8:
                reasons.append("Heavy train traffic line")
            elif traffic >= 0.5:
                reasons.append("Moderate train traffic")

            if recurrence >= 0.5:
                reasons.append("Repeated issue in past 30 days")

            simple_summary = " • ".join(reasons) if reasons else "Standard routine maintenance"
            advice = (
                "Immediate joint maintenance block recommended."
                if tier == "Critical"
                else "Prioritize in upcoming weekly block schedule."
                if tier == "High"
                else "Schedule during regular maintenance window."
                if tier == "Medium"
                else "Can be deferred to next routine cycle."
            )

            scored = {
                **task,
                "criticalityScore": final_score,
                "urgencyTier": tier,
                "mlScore": round(ml_score, 4),
                "ruleScore": round(rule, 4),
                "scoreBreakdown": {
                    "safety": round(safety, 3),
                    "overdue": round(overdue, 3),
                    "traffic": round(traffic, 3),
                    "recurrence": round(recurrence, 3),
                    "inspectionGap": round(gap, 3),
                },
                "reasoning": f"{simple_summary}. {advice}",
            }
            results.append(scored)

        return sorted(results, key=lambda x: x["criticalityScore"], reverse=True)

    def explain_task(self, task) -> dict:
        """
        Return SHAP values for a single task (SQLAlchemy model instance or dict).
        Falls back to score_breakdown if model not available.
        """
        self._load_model()

        if hasattr(task, "section_id"):
            # SQLAlchemy model instance
            td = "medium"
            task_dict = {
                "taskId": task.task_id,
                "defectType": task.defect_type,
                "criticality": task.criticality,
                "dueDate": task.due_date.isoformat() if task.due_date else None,
                "recurrenceCount": task.recurrence_count,
                "inspectionGapDays": task.inspection_gap_days,
                "sectionId": task.section_id,
            }
        else:
            task_dict = task
            td = "medium"

        features = self._extract_features(task_dict, td)

        if self._model is not None:
            try:
                if self._explainer is None:
                    import shap
                    self._explainer = shap.TreeExplainer(self._model)
                shap_values = self._explainer.shap_values(features)
                vals = shap_values[0].tolist()
                feature_names = ["safety", "overdue", "traffic", "recurrence", "inspectionGap"]
                return dict(zip(feature_names, [round(v, 4) for v in vals]))
            except Exception as e:
                logger.debug(f"[Prioritizer] SHAP explanation fallback: {e}")

        # Fallback: return proportional breakdown from rule formula
        safety, overdue, traffic, recurrence, gap = features[0].tolist()
        total = 0.35 * safety + 0.25 * overdue + 0.18 * traffic + 0.12 * recurrence + 0.10 * gap or 1
        return {
            "safety": round(0.35 * safety / total, 4),
            "overdue": round(0.25 * overdue / total, 4),
            "traffic": round(0.18 * traffic / total, 4),
            "recurrence": round(0.12 * recurrence / total, 4),
            "inspectionGap": round(0.10 * gap / total, 4),
        }


# Singleton engine instance
prioritization_engine = PrioritizationEngine()
