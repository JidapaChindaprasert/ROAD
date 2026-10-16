"""ROAD Dual-Model Ensemble & Context Grounding Engine.

Model 1 (Context & Structure Model):
  Classes: ['crack', 'damage sidewalk', 'pothole', 'road', 'sidewalk', 'subsidence']
  Role: Surface segmentation/detection ('road', 'sidewalk') + baseline damages.
        Filters out-of-domain images (non-road/sidewalk).

Model 2 (Damage Specialist Model):
  Classes: ['crack', 'damage sidewalk', 'pothole', 'subsidence']
  Role: Fine-grained damage detection with specialized weights.

Fusion Algorithm:
  1. Domain Gate: Verifies presence of road or sidewalk.
  2. Spatial Grounding: Computes Intersection-over-Area (IoA) between damages and surface boxes.
  3. Prior Matrix: Adjusts damage confidence based on surface context (sidewalk boosts sidewalk damage;
     road boosts pothole/subsidence/crack and suppresses sidewalk damage).
  4. Swap Resolution: Resolves discordant category predictions between Model 1 & 2.
  5. Staff Review Routing: If road/sidewalk is present but no damage is found, routes for human inspection.
"""

from typing import Any, Dict, List, Optional, Tuple

SURFACE_CLASSES = {"road", "sidewalk"}
DAMAGE_CLASSES = {"crack", "damage sidewalk", "pothole", "subsidence"}

# Canonical mapping to ROAD platform categories
CANONICAL_NAMES: Dict[str, str] = {
    "pothole": "pothole",
    "crack": "crack",
    "subsidence": "subsidence",
    "sidewalk damage": "sidewalk damage",
    "damaged sidewalk": "sidewalk damage",
    "damage sidewalk": "sidewalk damage",
    "road": "road",
    "sidewalk": "sidewalk",
}

# Context weighting multipliers: P(Damage | Surface Context)
CONTEXT_WEIGHTS: Dict[str, Dict[str, float]] = {
    "road": {
        "pothole": 1.20,
        "subsidence": 1.15,
        "crack": 1.05,
        "sidewalk damage": 0.35,  # heavily penalize sidewalk damage on roadway
    },
    "sidewalk": {
        "sidewalk damage": 1.35,  # strongly boost sidewalk damage on sidewalks
        "crack": 1.10,
        "pothole": 0.50,          # potholes rare on pedestrian paths
        "subsidence": 0.65,
    },
    "unknown": {
        "pothole": 1.0,
        "subsidence": 1.0,
        "crack": 1.0,
        "sidewalk damage": 1.0,
    },
}

THAI_CATEGORY_NAMES: Dict[str, str] = {
    "pothole": "หลุมบ่อ",
    "crack": "รอยแตกร้าว",
    "subsidence": "ถนนทรุดตัว / แอ่งยุบ",
    "sidewalk damage": "ทางเดินเท้าชำรุดเสียหาย",
    "road": "ผิวทางจราจร",
    "sidewalk": "ทางเท้า",
    "uncertain": "ไม่ระบุประเภท",
}


def normalize_class_name(name: str) -> str:
    n = name.lower().replace("-", " ").replace("_", " ").strip()
    return CANONICAL_NAMES.get(n, n)


def compute_box_area(box: List[float]) -> float:
    w = max(0.0, box[2] - box[0])
    h = max(0.0, box[3] - box[1])
    return w * h


def compute_intersection(box_a: List[float], box_b: List[float]) -> float:
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])
    w = max(0.0, x2 - x1)
    h = max(0.0, y2 - y1)
    return w * h


def compute_ioa(damage_box: List[float], surface_box: List[float]) -> float:
    """Computes Intersection-over-Area of the damage box (containment ratio)."""
    dmg_area = compute_box_area(damage_box)
    if dmg_area <= 0:
        return 0.0
    return compute_intersection(damage_box, surface_box) / dmg_area


def compute_iou(box_a: List[float], box_b: List[float]) -> float:
    """Computes standard Intersection-over-Union."""
    inter = compute_intersection(box_a, box_b)
    area_a = compute_box_area(box_a)
    area_b = compute_box_area(box_b)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def calculate_severity(category: str, max_area_ratio: float) -> str:
    """Determines suggested severity based on damage area ratio and category."""
    if max_area_ratio > 0.15 or (category == "subsidence" and max_area_ratio > 0.04):
        return "high"
    if max_area_ratio > 0.035:
        return "medium"
    return "low"


def parse_yolo_detections(yolo_result, names_dict: Dict[int, str]) -> Tuple[List[Dict], List[Dict]]:
    """Separates detections into surface context boxes and damage boxes."""
    surfaces: List[Dict] = []
    damages: List[Dict] = []

    for b in yolo_result.boxes:
        raw_name = names_dict.get(int(b.cls), "")
        cat = normalize_class_name(raw_name)
        score = float(b.conf)
        xyxy = b.xyxy[0].tolist()

        if cat in SURFACE_CLASSES:
            surfaces.append({
                "category": cat,
                "score": score,
                "box": xyxy,
                "area": compute_box_area(xyxy),
            })
        elif cat in DAMAGE_CLASSES:
            damages.append({
                "category": cat,
                "score": score,
                "box": xyxy,
                "area": compute_box_area(xyxy),
            })

    return surfaces, damages


def fuse_dual_predictions(
    res_model1,
    res_model2,
    img_width: int,
    img_height: int,
    conf_threshold: float = 0.20,
    surface_conf_threshold: float = 0.45,
    surface_min_coverage: float = 0.20,
    iou_match_threshold: float = 0.35,
) -> Dict[str, Any]:
    """Fuses predictions from Model 1 (Context + Damage) and Model 2 (Damage Specialist)."""
    total_img_area = float(img_width * img_height)

    # 1. Parse detections from Model 1 and Model 2
    m1_surfaces, m1_damages = parse_yolo_detections(res_model1, res_model1.names)
    _, m2_damages = parse_yolo_detections(res_model2, res_model2.names)

    # 2. Analyze Surface Context (Model 1)
    # Require strict confidence (>= 0.45) for road/sidewalk to prevent icons/graphics/indoor noise
    road_surfaces = [s for s in m1_surfaces if s["category"] == "road" and s["score"] >= surface_conf_threshold]
    sidewalk_surfaces = [s for s in m1_surfaces if s["category"] == "sidewalk" and s["score"] >= surface_conf_threshold]

    road_area = sum(s["area"] for s in road_surfaces)
    sidewalk_area = sum(s["area"] for s in sidewalk_surfaces)
    total_surface_area = road_area + sidewalk_area
    surface_coverage = total_surface_area / total_img_area if total_img_area > 0 else 0.0

    # Genuine road/sidewalk requires both confidence >= 0.45 and at least 20% image coverage
    has_surface = (len(road_surfaces) > 0 or len(sidewalk_surfaces) > 0) and surface_coverage >= surface_min_coverage

    primary_surface = "unknown"
    if has_surface:
        if sidewalk_area > road_area * 1.3:
            primary_surface = "sidewalk"
        elif road_area > sidewalk_area * 1.3:
            primary_surface = "road"
        else:
            primary_surface = "both"

    # Helper function to assign surface context to a damage box
    def get_surface_context_for_box(dmg_box: List[float]) -> str:
        best_surface = "unknown"
        best_ioa = 0.0

        for s in road_surfaces:
            ioa = compute_ioa(dmg_box, s["box"])
            if ioa > best_ioa:
                best_ioa = ioa
                best_surface = "road"

        for s in sidewalk_surfaces:
            ioa = compute_ioa(dmg_box, s["box"])
            if ioa > best_ioa:
                best_ioa = ioa
                best_surface = "sidewalk"

        return best_surface if best_ioa >= 0.20 else primary_surface

    # 3. Ground and apply context weights to raw damages
    grounded_m1: List[Dict] = []
    for d in m1_damages:
        if d["score"] < conf_threshold:
            continue
        ctx = get_surface_context_for_box(d["box"])
        weight = CONTEXT_WEIGHTS.get(ctx, CONTEXT_WEIGHTS["unknown"]).get(d["category"], 1.0)
        adj_score = min(0.99, d["score"] * weight)
        if adj_score >= conf_threshold:
            grounded_m1.append({**d, "context": ctx, "adj_score": adj_score, "source": "model1"})

    grounded_m2: List[Dict] = []
    for d in m2_damages:
        if d["score"] < conf_threshold:
            continue
        ctx = get_surface_context_for_box(d["box"])
        weight = CONTEXT_WEIGHTS.get(ctx, CONTEXT_WEIGHTS["unknown"]).get(d["category"], 1.0)
        adj_score = min(0.99, d["score"] * weight)
        if adj_score >= conf_threshold:
            grounded_m2.append({**d, "context": ctx, "adj_score": adj_score, "source": "model2"})

    # 4. Box Matching, Cross-Model Fusion & Swap Resolution
    fused_candidates: List[Dict] = []
    matched_m2_indices = set()
    has_ambiguity = False

    for d1 in grounded_m1:
        best_match_idx = None
        best_iou = 0.0

        for idx, d2 in enumerate(grounded_m2):
            if idx in matched_m2_indices:
                continue
            iou = compute_iou(d1["box"], d2["box"])
            if iou > best_iou and iou >= iou_match_threshold:
                best_iou = iou
                best_match_idx = idx

        if best_match_idx is not None:
            matched_m2_indices.add(best_match_idx)
            d2 = grounded_m2[best_match_idx]

            # Coordinate weighted average based on scores
            w1 = d1["adj_score"]
            w2 = d2["adj_score"]
            total_w = w1 + w2
            fused_box = [
                (d1["box"][i] * w1 + d2["box"][i] * w2) / total_w
                for i in range(4)
            ]

            if d1["category"] == d2["category"]:
                # Both models agree on category: boost confidence
                fused_score = min(0.99, 1.0 - (1.0 - d1["adj_score"]) * (1.0 - d2["adj_score"]))
                winning_cat = d1["category"]
            else:
                # Disagreement / "Swap": Resolve using context-adjusted scores
                diff = abs(d1["adj_score"] - d2["adj_score"])
                if diff < 0.12:
                    has_ambiguity = True

                if d2["adj_score"] >= d1["adj_score"]:
                    winning_cat = d2["category"]
                    fused_score = d2["adj_score"]
                else:
                    winning_cat = d1["category"]
                    fused_score = d1["adj_score"]

            fused_candidates.append({
                "category": winning_cat,
                "score": round(float(fused_score), 4),
                "box": fused_box,
                "surfaceContext": d1["context"],
                "area_ratio": compute_box_area(fused_box) / total_img_area if total_img_area > 0 else 0.0,
                "isEnsemble": True,
            })
        else:
            # Model 1 only (retained if score is solid)
            fused_candidates.append({
                "category": d1["category"],
                "score": round(float(d1["adj_score"]), 4),
                "box": d1["box"],
                "surfaceContext": d1["context"],
                "area_ratio": compute_box_area(d1["box"]) / total_img_area if total_img_area > 0 else 0.0,
                "isEnsemble": False,
            })

    # Add unmatched Model 2 detections
    for idx, d2 in enumerate(grounded_m2):
        if idx not in matched_m2_indices:
            # If Model 2 detects sidewalk damage in an area verified as roadway, penalize/suppress
            if d2["category"] == "sidewalk damage" and d2["context"] == "road":
                continue
            fused_candidates.append({
                "category": d2["category"],
                "score": round(float(d2["adj_score"]), 4),
                "box": d2["box"],
                "surfaceContext": d2["context"],
                "area_ratio": compute_box_area(d2["box"]) / total_img_area if total_img_area > 0 else 0.0,
                "isEnsemble": False,
            })

    # Format output bounding boxes
    final_labels = []
    for c in fused_candidates:
        x1, y1, x2, y2 = c["box"]
        final_labels.append({
            "category": c["category"],
            "score": c["score"],
            "surfaceContext": c["surfaceContext"],
            "boundingBox": {
                "x": round(x1),
                "y": round(y1),
                "width": round(x2 - x1),
                "height": round(y2 - y1),
            },
            "_area_ratio": c["area_ratio"],
        })

    # Sort labels by score descending
    final_labels.sort(key=lambda l: l["score"], reverse=True)

    # -------------------------------------------------------------
    # DECISION TRIAGE
    # -------------------------------------------------------------

    # CASE A: Road or Sidewalk detected, but NO DAMAGE found -> Route to Staff!
    if has_surface and len(final_labels) == 0:
        surface_display = "ทางเท้า" if primary_surface == "sidewalk" else "ผิวทางจราจร"
        return {
            "provider": "custom_yolo",
            "model": "dual-yolo-ensemble",
            "primaryCategory": "uncertain",
            "suggestedSeverity": "low",
            "confidenceScore": 0.0,
            "surfaceDetected": primary_surface,
            "labels": [],
            "summary": f"ตรวจพบ{surface_display}ในภาพ แต่ระบบ AI ไม่พบความเสียหายที่ชัดเจน ส่งต่อให้เจ้าหน้าที่ตรวจสอบ",
            "needsHumanReview": True,
            "imageQualityIssues": [],
        }

    # CASE B: Neither Road nor Sidewalk detected, and no high-confidence damage -> Out-of-Domain
    if not has_surface and (len(final_labels) == 0 or max(l["score"] for l in final_labels) < 0.65):
        return {
            "provider": "custom_yolo",
            "model": "dual-yolo-ensemble",
            "primaryCategory": "uncertain",
            "suggestedSeverity": "unknown",
            "confidenceScore": 0.0,
            "surfaceDetected": "none",
            "labels": [],
            "summary": "ภาพถ่ายไม่ปรากฏพื้นผิวถนนหรือทางเท้าที่ชัดเจน กรุณาถ่ายภาพผิวทางที่ต้องการแจ้งความเสียหาย",
            "needsHumanReview": True,
            "imageQualityIssues": ["not_road_or_sidewalk"],
        }

    # CASE C: Confirmed Damage detected
    top = final_labels[0]
    max_area = max(l["_area_ratio"] for l in final_labels)
    sev = calculate_severity(top["category"], max_area)

    # Clean up internal calculation fields
    for l in final_labels:
        l.pop("_area_ratio", None)

    cat_th = THAI_CATEGORY_NAMES.get(top["category"], top["category"])
    surface_th = THAI_CATEGORY_NAMES.get(top["surfaceContext"], "ผิวทาง")
    score_pct = round(top["score"] * 100)

    # Human review triggers:
    # 1. Low confidence (< 0.65)
    # 2. Structural subsidence/sinkhole (safety critical)
    # 3. Model conflict ambiguity
    needs_review = top["score"] < 0.65 or top["category"] == "subsidence" or has_ambiguity

    return {
        "provider": "custom_yolo",
        "model": "dual-yolo-ensemble",
        "primaryCategory": top["category"],
        "suggestedSeverity": sev,
        "confidenceScore": top["score"],
        "surfaceDetected": primary_surface,
        "labels": final_labels,
        "summary": f"ระบบ AI ตรวจพบ{cat_th}บน{surface_th} (ความมั่นใจ {score_pct}%)",
        "needsHumanReview": needs_review,
        "imageQualityIssues": [],
    }
