"""
Run YOLOv8 inference on tiled Sentinel-1 SAR images.
Includes cross-tile NMS, shape filtering, and water masking for robust detection.

Usage:
  python scripts/inference.py --model models/yolov8n_sar.pt --source data/inference_tiles
"""
import os
import re
import sys
import argparse
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def compute_nms(boxes, scores, iou_threshold=0.20):
    """Cross-tile Non-Maximum Suppression to deduplicate overlapping detections."""
    if len(boxes) == 0:
        return [], []
    b = np.array(boxes, dtype=np.float64)
    s = np.array(scores, dtype=np.float64)
    x1, y1, x2, y2 = b[:, 0], b[:, 1], b[:, 2], b[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = s.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(int(i))
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]

    kept_boxes = [boxes[i] for i in keep]
    kept_scores = [scores[i] for i in keep]
    return kept_boxes, kept_scores


def run_inference(model_path, source_dir, conf_thresh=0.25,
                  nms_iou=0.20, min_conf=0.40, min_ratio=1.15,
                  max_bg_mean=55.0, batch_size=8):
    """
    Load a trained YOLOv8 model and run inference on a directory of tiles.
    Applies post-processing: confidence filter, shape filter, water mask, cross-tile NMS.
    """
    from ultralytics import YOLO

    print(f"Loading YOLO model from {model_path}...")
    model = YOLO(model_path)

    # Gather all image files
    import glob
    patterns = ["*.jpg", "*.png", "*.jpeg", "*.tif", "*.tiff"]
    all_images = []
    for pat in patterns:
        all_images.extend(glob.glob(os.path.join(source_dir, pat)))
    all_images = sorted(all_images)

    if len(all_images) == 0:
        print(f"Error: No images found in {source_dir}")
        return

    print(f"Found {len(all_images)} tiles to process")
    print(f"Filters: min_conf={min_conf}, min_ratio={min_ratio}, max_bg_mean={max_bg_mean}")
    print(f"Cross-tile NMS IoU: {nms_iou}")
    print()

    # Run inference in batches to control memory
    print(f"Running inference (batch_size={batch_size})...")
    results = model.predict(
        source=source_dir,
        conf=conf_thresh,
        save=True,
        save_txt=True,
        save_conf=True,
        project="runs/detect",
        name="sentinel_inference",
        exist_ok=True,
        batch=batch_size,
        verbose=False,
    )

    # Collect all detections with global coordinates
    global_boxes = []
    global_scores = []
    tiles_with_ships = 0
    raw_detections = 0

    for r in results:
        boxes = r.boxes
        if len(boxes) == 0:
            continue

        filename = os.path.basename(r.path)
        tiles_with_ships += 1

        # Parse tile offset from filename (tile_yY_xX.jpg)
        match = re.search(r'y(\d+)_x(\d+)', filename)
        ty, tx = 0, 0
        if match:
            ty = int(match.group(1))
            tx = int(match.group(2))

        for b_idx in range(len(boxes)):
            box = boxes.xyxy[b_idx].cpu().numpy()
            conf = float(boxes.conf[b_idx].cpu().numpy())
            raw_detections += 1

            # 1. Confidence filter
            if conf < min_conf:
                continue

            x1, y1, x2, y2 = box
            w_box = x2 - x1
            h_box = y2 - y1

            # 2. Shape filter — ships are generally elongated
            ratio = max(w_box, h_box) / (min(w_box, h_box) + 1e-6)
            if ratio < min_ratio:
                continue

            # 3. Water mask — reject if background around detection is too bright (land)
            try:
                orig = r.orig_img
                bx1 = max(0, int(x1) - 30)
                by1 = max(0, int(y1) - 30)
                bx2 = min(orig.shape[1], int(x2) + 30)
                by2 = min(orig.shape[0], int(y2) + 30)
                bg_mean = float(np.mean(orig[by1:by2, bx1:bx2]))
                if bg_mean > max_bg_mean:
                    continue
            except Exception:
                pass  # Skip water mask if image not accessible

            # Map to global coordinates
            gx1, gy1 = tx + float(x1), ty + float(y1)
            gx2, gy2 = tx + float(x2), ty + float(y2)
            global_boxes.append([gx1, gy1, gx2, gy2])
            global_scores.append(conf)

    # Cross-tile NMS
    print(f"\nRaw detections (pre-filter): {raw_detections}")
    print(f"Detections passing filters: {len(global_boxes)}")
    final_boxes, final_scores = compute_nms(global_boxes, global_scores, iou_threshold=nms_iou)

    # Summary
    print()
    print("=" * 50)
    print("📊 INFERENCE SUMMARY")
    print("=" * 50)
    print(f"  Total tiles processed:     {len(all_images)}")
    print(f"  Tiles containing ships:    {tiles_with_ships}")
    print(f"  Raw detections (all):      {raw_detections}")
    print(f"  After post-processing:     {len(global_boxes)}")
    print(f"  After cross-tile NMS:      {len(final_boxes)}")
    print(f"  ───────────────────────────────────")
    print(f"  🚢 UNIQUE SHIPS DETECTED:  {len(final_boxes)}")
    print("=" * 50)

    # Save detection summary
    out_dir = Path("runs/detect/sentinel_inference")
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_path = out_dir / "detection_summary.txt"
    with open(summary_path, "w") as f:
        f.write(f"Total tiles: {len(all_images)}\n")
        f.write(f"Tiles with ships: {tiles_with_ships}\n")
        f.write(f"Unique ships (post-NMS): {len(final_boxes)}\n")
        f.write(f"\nDetections:\n")
        for i, (box, score) in enumerate(zip(final_boxes, final_scores)):
            f.write(f"  Ship {i+1}: bbox=[{box[0]:.1f},{box[1]:.1f},{box[2]:.1f},{box[3]:.1f}] conf={score:.3f}\n")

    print(f"\nDetection summary saved: {summary_path}")
    print(f"Annotated tiles saved:  {out_dir}/")

    if len(final_boxes) == 0 and raw_detections > 0:
        print("\n⚠️  All detections were filtered out. Consider lowering --min-conf or --min-ratio.")
    elif len(final_boxes) == 0:
        print("\n⚠️  No ships detected. The model may not have been trained on this type of SAR data.")

    print()
    print("--- Evaluation Metrics Note ---")
    print("Since this is blind inference on an unannotated Sentinel-1 scene,")
    print("there are no ground truth boxes to compute exact Precision/Recall.")
    print("To compute exact metrics:")
    print("  1. Review output tiles in runs/detect/sentinel_inference/")
    print("  2. Count True Positives (TP), False Positives (FP), False Negatives (FN)")
    print("  3. Precision = TP / (TP + FP),  Recall = TP / (TP + FN)")

    return final_boxes, final_scores


def main():
    parser = argparse.ArgumentParser(
        description="Run YOLOv8 inference on tiled Sentinel-1 SAR images."
    )
    parser.add_argument("--model", "-m", type=str,
                        default="runs/detect/train/weights/best.pt",
                        help="Path to trained YOLOv8 weights")
    parser.add_argument("--source", "-s", type=str,
                        default="data/inference_tiles",
                        help="Directory containing inference tiles")
    parser.add_argument("--conf", "-c", type=float, default=0.25,
                        help="YOLO confidence threshold (default 0.25)")
    parser.add_argument("--min-conf", type=float, default=0.40,
                        help="Post-processing minimum confidence (default 0.40)")
    parser.add_argument("--min-ratio", type=float, default=1.15,
                        help="Minimum aspect ratio for ship shape filter (default 1.15)")
    parser.add_argument("--max-bg-mean", type=float, default=55.0,
                        help="Max background brightness for water mask (default 55)")
    parser.add_argument("--nms-iou", type=float, default=0.20,
                        help="Cross-tile NMS IoU threshold (default 0.20)")
    parser.add_argument("--batch-size", type=int, default=8,
                        help="Inference batch size (lower for less memory, default 8)")
    args = parser.parse_args()

    if not os.path.exists(args.model):
        print(f"Error: Model weights not found at {args.model}")
        print("Provide the correct path using --model")
        return

    if not os.path.exists(args.source):
        print(f"Error: Source directory {args.source} does not exist.")
        print("Run preprocess_sentinel.py first to generate tiles.")
        return

    run_inference(
        args.model, args.source,
        conf_thresh=args.conf,
        nms_iou=args.nms_iou,
        min_conf=args.min_conf,
        min_ratio=args.min_ratio,
        max_bg_mean=args.max_bg_mean,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
