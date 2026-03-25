"""
Evaluation Script — computes precision, recall, F1, mAP on the validation set.
Usage: python scripts/evaluate.py --weights models/yolov8n_sar.pt --data data/yolo_format/dataset.yaml

Handles:
  - Auto-creation of output directory
  - Graceful error handling for missing weights/data
  - Workers=0 fix for Windows
"""
import argparse
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def evaluate(args):
    from ultralytics import YOLO

    weights_path = Path(args.weights)
    data_path = Path(args.data)

    if not weights_path.exists():
        print(f"Error: Weights file not found: {weights_path}")
        print("Train the model first:  python scripts/train.py --data data/yolo_format/dataset.yaml")
        sys.exit(1)

    if not data_path.exists():
        print(f"Error: Dataset YAML not found: {data_path}")
        print("Run conversion first:  python scripts/convert_annotations.py")
        sys.exit(1)

    # Ensure output directory exists
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 50)
    print("📊 EVALUATION")
    print("=" * 50)
    print(f"  Weights: {weights_path}")
    print(f"  Dataset: {data_path}")
    print(f"  ImgSz:   {args.imgsz}")
    print(f"  Device:  {args.device}")
    print()

    model = YOLO(str(weights_path))

    results = model.val(
        data=str(data_path),
        imgsz=args.imgsz,
        device=args.device,
        plots=True,
        verbose=True,
        workers=0,  # Windows fix
    )

    metrics = {
        "precision": float(results.box.mp),
        "recall": float(results.box.mr),
        "mAP50": float(results.box.map50),
        "mAP50_95": float(results.box.map),
    }
    metrics["f1"] = 2 * (metrics["precision"] * metrics["recall"]) / \
                    (metrics["precision"] + metrics["recall"] + 1e-6)

    print()
    print("=" * 50)
    print("📊 EVALUATION RESULTS")
    print("=" * 50)
    for k, v in metrics.items():
        bar = "█" * int(v * 40) + "░" * (40 - int(v * 40))
        print(f"  {k:>12}: {v:.4f}  {bar}")
    print("=" * 50)

    out_path.write_text(json.dumps(metrics, indent=2))
    print(f"\nMetrics saved to: {out_path}")
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate YOLOv8 SAR ship detection model")
    parser.add_argument("--weights", type=str, required=True,
                        help="Path to trained model weights (.pt)")
    parser.add_argument("--data", type=str, required=True,
                        help="Path to dataset YAML")
    parser.add_argument("--imgsz", type=int, default=640,
                        help="Image size for evaluation (default: 640)")
    parser.add_argument("--device", type=str, default="0",
                        help="Device: '0' for GPU, 'cpu' for CPU")
    parser.add_argument("--output", type=str, default="outputs/eval_metrics.json",
                        help="Output path for metrics JSON")
    args = parser.parse_args()
    evaluate(args)
