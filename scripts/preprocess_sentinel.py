"""
Preprocess and tile Sentinel-1 SAR imagery for YOLO inference.
Handles very large files (>900MB GeoTIFF) via windowed/chunked reading.

Usage:
  python scripts/preprocess_sentinel.py --input path/to/scene.tiff --output data/inference_tiles
"""
import os
import sys
import argparse
import gc
import numpy as np
import cv2
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ---------------------------------------------------------------------------
#  LARGE FILE LOADING — rasterio windowed reads, or fallback chunked loading
# ---------------------------------------------------------------------------

def _load_with_rasterio(image_path, clip_percentile=99.0):
    """Load large GeoTIFF via rasterio with memory-mapped windowed reads."""
    import rasterio
    from rasterio.windows import Window

    with rasterio.open(image_path) as src:
        h, w = src.height, src.width
        print(f"  Rasterio opened: {w}x{h}, dtype={src.dtypes[0]}, bands={src.count}")

        # For huge files read in horizontal strips to compute percentiles
        strip_h = min(2048, h)
        sample_values = []
        for y in range(0, h, strip_h):
            rh = min(strip_h, h - y)
            window = Window(0, y, w, rh)
            strip = src.read(1, window=window).astype(np.float32)
            valid = strip[strip > 0]
            if len(valid) > 0:
                sample_values.append(np.random.choice(valid, min(50000, len(valid)), replace=False))
            del strip
            gc.collect()

        samples = np.concatenate(sample_values)
        p_min = float(np.percentile(samples, 1.0))
        p_max = float(np.percentile(samples, clip_percentile))
        del samples, sample_values
        gc.collect()
        print(f"  Normalization range: [{p_min:.2f}, {p_max:.2f}]")

    return p_min, p_max, h, w


def _load_with_tifffile(image_path, clip_percentile=99.0):
    """Load large TIFF via tifffile memory-mapped access."""
    import tifffile
    img = tifffile.memmap(str(image_path))
    if len(img.shape) > 2:
        img = img[:, :, 0]
    h, w = img.shape[:2]
    print(f"  Tifffile mmap: {w}x{h}, dtype={img.dtype}")

    # Sample for percentiles
    step = max(1, h // 500)
    sample = img[::step, :].astype(np.float32).ravel()
    valid = sample[sample > 0]
    p_min = float(np.percentile(valid, 1.0))
    p_max = float(np.percentile(valid, clip_percentile))
    del sample, valid
    gc.collect()
    print(f"  Normalization range: [{p_min:.2f}, {p_max:.2f}]")
    return p_min, p_max, h, w


def _load_with_opencv(image_path, clip_percentile=99.0):
    """Load image via OpenCV (works for PNG/JPG and smaller TIFFs)."""
    img = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")
    if len(img.shape) > 2:
        img = img[:, :, 0]
    h, w = img.shape[:2]
    print(f"  OpenCV loaded: {w}x{h}, dtype={img.dtype}")

    valid = img[img > 0].astype(np.float32)
    p_min = float(np.percentile(valid, 1.0))
    p_max = float(np.percentile(valid, clip_percentile))
    del valid
    gc.collect()
    print(f"  Normalization range: [{p_min:.2f}, {p_max:.2f}]")
    return p_min, p_max, h, w


def get_loader(image_path):
    """Pick the best available loader for the file."""
    ext = Path(image_path).suffix.lower()
    if ext in ('.tif', '.tiff', '.img'):
        try:
            import rasterio  # noqa: F401
            return 'rasterio'
        except ImportError:
            pass
        try:
            import tifffile  # noqa: F401
            return 'tifffile'
        except ImportError:
            pass
    return 'opencv'


# ---------------------------------------------------------------------------
#  TILING — reads strips from disk and writes tiles directly (low memory)
# ---------------------------------------------------------------------------

def tile_large_image(image_path, output_dir, tile_size=640, overlap=100,
                     clip_percentile=99.0, loader='rasterio'):
    """
    Tile a potentially huge SAR image.
    Uses windowed reading so that we never load the full image into RAM.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Determine image dims and normalization percentiles
    print("Step 1/2: Computing normalization parameters...")
    if loader == 'rasterio':
        p_min, p_max, H, W = _load_with_rasterio(image_path, clip_percentile)
    elif loader == 'tifffile':
        p_min, p_max, H, W = _load_with_tifffile(image_path, clip_percentile)
    else:
        p_min, p_max, H, W = _load_with_opencv(image_path, clip_percentile)

    if p_max <= p_min:
        p_max = p_min + 1.0

    stride = tile_size - overlap
    tile_count = 0
    total_x = max(1, (W - tile_size) // stride + 1) + (1 if (W - tile_size) % stride != 0 else 0)
    total_y = max(1, (H - tile_size) // stride + 1) + (1 if (H - tile_size) % stride != 0 else 0)
    expected = total_x * total_y
    print(f"Step 2/2: Generating ~{expected} tiles ({tile_size}x{tile_size}, stride={stride})...")

    # Step 2: Read strip by strip and extract tiles
    if loader == 'rasterio':
        import rasterio
        from rasterio.windows import Window

        with rasterio.open(image_path) as src:
            for y in range(0, H, stride):
                y1, y2 = y, min(y + tile_size, H)
                if y2 - y1 < tile_size and y > 0:
                    y1 = max(0, H - tile_size)
                    y2 = H

                # Read a horizontal strip covering this row of tiles
                strip_window = Window(0, y1, W, y2 - y1)
                strip = src.read(1, window=strip_window).astype(np.float32)
                strip = np.clip(strip, p_min, p_max)
                strip = ((strip - p_min) / (p_max - p_min) * 255).astype(np.uint8)
                strip_rgb = np.stack([strip, strip, strip], axis=-1)

                for x in range(0, W, stride):
                    x1, x2 = x, min(x + tile_size, W)
                    if x2 - x1 < tile_size and x > 0:
                        x1 = max(0, W - tile_size)
                        x2 = W

                    tile = strip_rgb[:, x1:x2]

                    # Pad if undersized
                    th, tw = tile.shape[:2]
                    if th < tile_size or tw < tile_size:
                        tile = cv2.copyMakeBorder(tile, 0, tile_size - th, 0, tile_size - tw,
                                                  cv2.BORDER_CONSTANT, value=[0, 0, 0])

                    tile_name = f"tile_y{y1}_x{x1}.jpg"
                    cv2.imwrite(str(output_dir / tile_name), tile)
                    tile_count += 1

                del strip, strip_rgb
                gc.collect()

                # Progress
                pct = min(100, int((y / max(H - tile_size, 1)) * 100))
                print(f"\r  Tiling... {pct}%  ({tile_count} tiles)", end="", flush=True)
    else:
        # Fallback: load entire image (for smaller files or when rasterio not available)
        if loader == 'tifffile':
            import tifffile
            raw = tifffile.imread(str(image_path))
            if len(raw.shape) > 2:
                raw = raw[:, :, 0]
        else:
            raw = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
            if len(raw.shape) > 2:
                raw = raw[:, :, 0]

        raw = raw.astype(np.float32)
        raw = np.clip(raw, p_min, p_max)
        raw = ((raw - p_min) / (p_max - p_min) * 255).astype(np.uint8)
        img_rgb = np.stack([raw, raw, raw], axis=-1)
        del raw
        gc.collect()

        for y in range(0, H, stride):
            for x in range(0, W, stride):
                y1, y2 = y, min(y + tile_size, H)
                x1, x2 = x, min(x + tile_size, W)

                if y2 - y1 < tile_size and y > 0:
                    y1 = max(0, H - tile_size)
                    y2 = H
                if x2 - x1 < tile_size and x > 0:
                    x1 = max(0, W - tile_size)
                    x2 = W

                tile = img_rgb[y1:y2, x1:x2]
                th, tw = tile.shape[:2]
                if th < tile_size or tw < tile_size:
                    tile = cv2.copyMakeBorder(tile, 0, tile_size - th, 0, tile_size - tw,
                                              cv2.BORDER_CONSTANT, value=[0, 0, 0])

                tile_name = f"tile_y{y1}_x{x1}.jpg"
                cv2.imwrite(str(output_dir / tile_name), tile)
                tile_count += 1

            pct = min(100, int((y / max(H - tile_size, 1)) * 100))
            print(f"\r  Tiling... {pct}%  ({tile_count} tiles)", end="", flush=True)

        del img_rgb
        gc.collect()

    print(f"\n✅ Generated {tile_count} tiles in '{output_dir}'")
    return tile_count


# ---------------------------------------------------------------------------
#  MAIN
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Preprocess and tile Sentinel-1 SAR imagery for YOLO inference. "
                    "Handles files >900MB via windowed reading."
    )
    parser.add_argument("--input", "-i", type=str, required=True,
                        help="Path to raw Sentinel-1 .tiff / .img / .png file")
    parser.add_argument("--output", "-o", type=str,
                        default="data/inference_tiles",
                        help="Output directory for tiles (default: data/inference_tiles)")
    parser.add_argument("--tile-size", type=int, default=640,
                        help="Size of square tiles (default 640 for YOLOv8)")
    parser.add_argument("--overlap", type=int, default=100,
                        help="Overlap between tiles in pixels (default 100)")
    parser.add_argument("--clip-percentile", type=float, default=99.0,
                        help="Percentile to clip to prevent over-darkening (default 99)")
    args = parser.parse_args()

    fpath = Path(args.input)
    if not fpath.exists():
        print(f"Error: File not found: {fpath}")
        sys.exit(1)

    file_mb = fpath.stat().st_size / (1024 * 1024)
    print("=" * 60)
    print("SENTINEL-1 SAR PREPROCESSOR")
    print("=" * 60)
    print(f"Input:  {fpath}  ({file_mb:.1f} MB)")
    print(f"Output: {args.output}")
    print(f"Tile:   {args.tile_size}x{args.tile_size}, overlap={args.overlap}")
    print()

    loader = get_loader(str(fpath))
    print(f"Using loader: {loader}")

    tile_count = tile_large_image(
        str(fpath), args.output,
        tile_size=args.tile_size,
        overlap=args.overlap,
        clip_percentile=args.clip_percentile,
        loader=loader,
    )

    print()
    print(f"✅ Preprocessing complete!")
    print(f"   Tiles:  {tile_count}")
    print(f"   Output: {args.output}")
    print(f"   Next:   python scripts/inference.py --source {args.output}")


if __name__ == "__main__":
    main()
