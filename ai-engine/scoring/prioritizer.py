"""
Hybrid Criticality Scoring Engine for Railway Maintenance Tasks.

Combines:
1. Rule-based weighted scoring (60% weight) — explainable, domain-driven
2. XGBoost ML classifier (40% weight) — learns patterns from historical data

Score output: 0.0 to 1.0 with full breakdown for transparency.
"""

import numpy as np
import os
import joblib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# Try importing XGBoost; fall back to pure rule-based if unavailable
try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("[INFO] XGBoost not available - using domain rule-based scoring engine")


# ─── Safety Impact Mappings ───

DEFECT_SAFETY_SCORES = {
    # Engineering (TMS)
    "Rail fracture": 1.0,
    "Weld failure": 0.9,
    "Track geometry defect": 0.8,
    "Level crossing defect": 0.8,
    "Rail wear beyond limit": 0.7,
    "Bridge inspection overdue": 0.6,
    "Ballast deficiency": 0.5,
    "Sleeper renewal due": 0.4,
    # Signal & Telecom (SMMS)
    "Signal lamp failure": 1.0,
    "Track circuit failure": 1.0,
    "Point machine malfunction": 0.9,
    "Axle counter fault": 0.8,
    "Interlocking test overdue": 0.7,
    "Relay room inspection due": 0.5,
    "Telecom cable degradation": 0.3,
    # Traction Distribution (TDMS)
    "Insulator flashover": 1.0,
    "Power supply interruption": 1.0,
    "OHE wire sag": 0.9,
    "Catenary mast damage": 0.8,
    "Contact wire wear": 0.7,
    "Return conductor defect": 0.6,
    "Pantograph strip inspection": 0.5,
}

TRAFFIC_DENSITY_SCORES = {
    "high": 1.0,
    "medium": 0.6,
    "low": 0.3,
}

# Rule-based scoring weights
WEIGHTS = {
    "safety": 0.35,
    "overdue": 0.25,
    "traffic": 0.20,
    "recurrence": 0.20,
}


class PrioritizationEngine:
    """Hybrid rule-based + ML criticality scoring engine."""

    def __init__(self):
        self.model = None
        self.model_path = os.path.join(os.path.dirname(__file__), "..", "models", "criticality_model.pkl")
        self._load_or_train_model()

    def _load_or_train_model(self):
        """Load pre-trained model or train a new one on synthetic data."""
        if not HAS_XGBOOST:
            return

        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                print("[INFO] Loaded pre-trained XGBoost model")
                return
            except Exception:
                pass

        # Train on synthetic data
        print("[INFO] Training model on synthetic data...")
        self._train_model()

    def _train_model(self):
        """Generate synthetic training data and train XGBoost classifier."""
        if not HAS_XGBOOST:
            return

        np.random.seed(42)
        n_samples = 2000

        # Features: safety_score, overdue_days, traffic_score, recurrence_count
        safety = np.random.uniform(0, 1, n_samples)
        overdue = np.random.uniform(-10, 60, n_samples)  # negative = not yet due
        traffic = np.random.choice([0.3, 0.6, 1.0], n_samples)
        recurrence = np.random.randint(0, 10, n_samples)

        X = np.column_stack([safety, overdue, traffic, recurrence])

        # Generate labels based on domain rules (with noise for realism)
        composite = (
            0.35 * safety +
            0.25 * np.clip(overdue / 30, 0, 1) +
            0.20 * traffic +
            0.20 * np.clip(recurrence / 5, 0, 1)
        )
        noise = np.random.normal(0, 0.05, n_samples)
        composite = np.clip(composite + noise, 0, 1)

        # 4 classes: 0=Low, 1=Medium, 2=High, 3=Critical
        labels = np.digitize(composite, bins=[0.3, 0.5, 0.7]) 

        self.model = XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            objective="multi:softprob",
            num_class=4,
            random_state=42,
            eval_metric="mlogloss",
        )
        self.model.fit(X, labels)

        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        print(f"[INFO] Model trained and saved to {self.model_path}")

    def _compute_rule_score(self, task: Dict, corridor_map: Dict) -> Dict[str, float]:
        """Compute rule-based score with full breakdown."""
        defect_type = task.get("defectType", "")
        safety_score = DEFECT_SAFETY_SCORES.get(defect_type, 0.5)

        # Overdue calculation
        try:
            due_date = datetime.fromisoformat(task["dueDate"].replace("Z", "+00:00"))
            days_overdue = (datetime.now(due_date.tzinfo) - due_date).days
        except Exception:
            days_overdue = 0
        overdue_score = min(max(days_overdue / 30.0, 0.0), 1.0)

        # Traffic density
        section_id = task.get("sectionId", "")
        traffic_density = corridor_map.get(section_id, "medium")
        traffic_score = TRAFFIC_DENSITY_SCORES.get(traffic_density, 0.5)

        # Recurrence
        recurrence_count = task.get("recurrenceCount", 0)
        recurrence_score = min(recurrence_count / 5.0, 1.0)

        # Weighted composite
        composite = (
            WEIGHTS["safety"] * safety_score +
            WEIGHTS["overdue"] * overdue_score +
            WEIGHTS["traffic"] * traffic_score +
            WEIGHTS["recurrence"] * recurrence_score
        )

        return {
            "safety": round(safety_score, 3),
            "overdue": round(overdue_score, 3),
            "traffic": round(traffic_score, 3),
            "recurrence": round(recurrence_score, 3),
            "ruleScore": round(composite, 3),
            "daysOverdue": days_overdue,
        }

    def _compute_ml_score(self, features: np.ndarray) -> float:
        """Get ML model's predicted urgency as a 0–1 score."""
        if self.model is None:
            return 0.5

        try:
            proba = self.model.predict_proba(features.reshape(1, -1))[0]
            # Weighted average: Low=0.15, Medium=0.4, High=0.7, Critical=0.95
            tier_values = [0.15, 0.4, 0.7, 0.95]
            ml_score = sum(p * v for p, v in zip(proba, tier_values))
            return round(ml_score, 3)
        except Exception:
            return 0.5

    def _assign_tier(self, score: float) -> str:
        """Map composite score to urgency tier."""
        if score >= 0.75:
            return "Critical"
        elif score >= 0.55:
            return "High"
        elif score >= 0.35:
            return "Medium"
        else:
            return "Low"

    def score_tasks(self, tasks: List[Dict], corridor_map: Dict) -> List[Dict]:
        """Score and rank a list of maintenance tasks."""
        scored = []

        for task in tasks:
            # Rule-based scoring
            breakdown = self._compute_rule_score(task, corridor_map)
            rule_score = breakdown["ruleScore"]

            # ML scoring
            features = np.array([
                breakdown["safety"],
                max(breakdown["daysOverdue"], 0) / 30.0,
                breakdown["traffic"],
                breakdown["recurrence"],
            ])
            ml_score = self._compute_ml_score(features)

            # Hybrid: 60% rule + 40% ML
            if self.model is not None:
                final_score = 0.6 * rule_score + 0.4 * ml_score
            else:
                final_score = rule_score

            final_score = round(min(final_score, 1.0), 3)
            tier = self._assign_tier(final_score)

            scored_task = {
                **task,
                "criticalityScore": final_score,
                "urgencyTier": tier,
                "scoreBreakdown": {
                    "safety": breakdown["safety"],
                    "overdue": breakdown["overdue"],
                    "traffic": breakdown["traffic"],
                    "recurrence": breakdown["recurrence"],
                },
                "ruleScore": rule_score,
                "mlScore": ml_score,
                "daysOverdue": breakdown["daysOverdue"],
                "reasoning": self._generate_reasoning(task, breakdown, final_score, tier),
            }
            scored.append(scored_task)

        # Sort by score descending (most critical first)
        scored.sort(key=lambda t: t["criticalityScore"], reverse=True)
        return scored

    def _generate_reasoning(self, task: Dict, breakdown: Dict, score: float, tier: str) -> str:
        """Generate human-readable explanation for the score."""
        reasons = []

        if breakdown["safety"] >= 0.9:
            reasons.append(f"SAFETY CRITICAL: '{task.get('defectType', '')}' has high derailment/failure risk (safety={breakdown['safety']})")
        elif breakdown["safety"] >= 0.7:
            reasons.append(f"Safety concern: '{task.get('defectType', '')}' poses moderate safety risk (safety={breakdown['safety']})")

        if breakdown["daysOverdue"] > 0:
            reasons.append(f"OVERDUE by {breakdown['daysOverdue']} days — immediate attention needed")
        elif breakdown["daysOverdue"] > -3:
            reasons.append(f"Due in {abs(breakdown['daysOverdue'])} days — approaching deadline")

        if breakdown["traffic"] >= 0.8:
            reasons.append(f"High-traffic corridor ({task.get('sectionId', '')}) — disruption impact is significant")

        if breakdown["recurrence"] >= 0.6:
            recurrence_count = task.get("recurrenceCount", 0)
            reasons.append(f"Recurring defect ({recurrence_count} previous occurrences) — may indicate systemic issue")

        if not reasons:
            reasons.append("Routine maintenance task within normal parameters")

        return f"[{tier}] Score: {score:.2f}. " + "; ".join(reasons)
