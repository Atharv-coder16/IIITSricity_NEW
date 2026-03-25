"""
YOLOv8 Training Script for SAR Ship Detection.
Usage: python scripts/train.py --data data/yolo_format/dataset.yaml --epochs 50

Handles:
  - Auto-creation of dataset YAML if only a directory is provided
  - Windows MemoryError fix (workers=0)
  - Configurable model (yolov8n, yolov8s, etc.)
"""
import argparse
import sys
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def create_dataset_yaml(data_dir: str, output_path: str):
    """Create YOLO dataset YAML configuration."""
    data_path = Path(data_dir).resolve()
    yaml_content = f"""path: {data_path.as_posix()}
train: images/train
val: images/test

nc: 1
names: ['ship']
"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_text(yaml_content.strip())
    print(f"Dataset YAML created: {output_path}")
    return output_path


def train(args):
    from ultralytics import YOLO

    # Import config with fallback defaults
    try:
        from config.config import MODELS_DIR, TRAIN_EPOCHS, TRAIN_BATCH_SIZE, TRAIN_IMAGE_SIZE
    except ImportError:
        MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
        TRAIN_EPOCHS = 50
        TRAIN_BATCH_SIZE = 16
        TRAIN_IMAGE_SIZE = 640

    MODELS_DIR = Path(MODELS_DIR)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Resolve dataset YAML
    dataset_yaml = args.data
    if not Path(dataset_yaml).exists():
        # Maybe it's a directory — look for dataset.yaml inside
        dir_yaml = Path(args.data) / "dataset.yaml"
        if dir_yaml.exists():
            dataset_yaml = str(dir_yaml)
        else:
            dataset_yaml = create_dataset_yaml(args.data, str(dir_yaml))

    # Determine model name from the base model (yolov8n.pt → yolov8n_sar)
    model_base = Path(args.model).stem  # e.g. "yolov8n" or "yolov8s"
    run_name = f"{model_base}_sar"

    print("=" * 60)
    print(f"🚀 TRAINING: {run_name}")
    print("=" * 60)
    print(f"  Base model:   {args.model}")
    print(f"  Dataset:      {dataset_yaml}")
    print(f"  Epochs:       {args.epochs or TRAIN_EPOCHS}")
    print(f"  Batch size:   {args.batch or TRAIN_BATCH_SIZE}")
    print(f"  Image size:   {args.imgsz or TRAIN_IMAGE_SIZE}")
    print(f"  Device:       {args.device}")
    print(f"  Output:       {MODELS_DIR / 'runs' / run_name}")
    print()

    model = YOLO(args.model)

    results = model.train(
        data=dataset_yaml,
        epochs=args.epochs or TRAIN_EPOCHS,
        batch=args.batch or TRAIN_BATCH_SIZE,
        imgsz=args.imgsz or TRAIN_IMAGE_SIZE,
        device=args.device,
        project=str(MODELS_DIR / "runs"),
        name=run_name,
        patience=args.patience,
        save=True,
        plots=True,
        verbose=True,
        workers=0,  # Fixes MemoryError / "too many open files" on Windows
    )

    # Copy best weights to a clean path
    best_weights = MODELS_DIR / "runs" / run_name / "weights" / "best.pt"
    if best_weights.exists():
        dest = MODELS_DIR / f"{run_name}.pt"
        shutil.copy2(str(best_weights), str(dest))
        print(f"\n✅ Best weights saved to: {dest}")
    else:
        # Check if training created a numbered run directory
        for p in sorted((MODELS_DIR / "runs").glob(f"{run_name}*")):
            candidate = p / "weights" / "best.pt"
            if candidate.exists():
                dest = MODELS_DIR / f"{run_name}.pt"
                shutil.copy2(str(candidate), str(dest))
                print(f"\n✅ Best weights saved to: {dest}")
                break

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 for SAR ship detection")
    parser.add_argument("--data", type=str, required=True,
                        help="Dataset YAML file path or directory containing it")
    parser.add_argument("--model", type=str, default="yolov8n.pt",
                        help="Base model (default: yolov8n.pt)")
    parser.add_argument("--epochs", type=int, default=None,
                        help="Number of training epochs (default: from config)")
    parser.add_argument("--batch", type=int, default=None,
                        help="Batch size (default: from config)")
    parser.add_argument("--imgsz", type=int, default=None,
                        help="Image size (default: from config)")
    parser.add_argument("--device", type=str, default="0",
                        help="Device: '0' for GPU, 'cpu' for CPU")
    parser.add_argument("--patience", type=int, default=10,
                        help="Early stopping patience (default: 10)")
    args = parser.parse_args()
    train(args)
