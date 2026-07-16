"""Generate TripPilot standard and maskable PWA icons from one square PNG."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops


STANDARD_SIZES = (16, 32, 120, 152, 167, 180, 192, 512)
MASKABLE_SIZES = (192, 512)
WHITE_THRESHOLD = 20
MASKABLE_SCALE = 0.70


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Source square PNG")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Directory that receives icon-*.png files",
    )
    return parser.parse_args()


def crop_artwork(source: Image.Image) -> Image.Image:
    """Remove only the near-white exterior and return a centered square crop."""
    if source.width != source.height:
        raise ValueError(f"source must be square, got {source.width}x{source.height}")

    rgb = source.convert("RGB")
    white = Image.new("RGB", rgb.size, "white")
    difference = ImageChops.difference(rgb, white).convert("L")
    mask = difference.point(lambda value: 255 if value > WHITE_THRESHOLD else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("source has no non-white artwork bounds")

    left, top, right, bottom = bounds
    side = max(right - left, bottom - top)
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    square_left = round(center_x - side / 2)
    square_top = round(center_y - side / 2)
    square_left = min(max(square_left, 0), rgb.width - side)
    square_top = min(max(square_top, 0), rgb.height - side)
    return rgb.crop((square_left, square_top, square_left + side, square_top + side))


def save_standard(artwork: Image.Image, size: int, output_dir: Path) -> Path:
    output = output_dir / f"icon-{size}.png"
    artwork.resize((size, size), Image.Resampling.LANCZOS).save(output, "PNG", optimize=True)
    return output


def save_maskable(artwork: Image.Image, size: int, output_dir: Path) -> Path:
    output = output_dir / f"icon-maskable-{size}.png"
    artwork_size = round(size * MASKABLE_SCALE)
    inset = (size - artwork_size) // 2
    canvas = Image.new("RGB", (size, size), "white")
    resized = artwork.resize((artwork_size, artwork_size), Image.Resampling.LANCZOS)
    canvas.paste(resized, (inset, inset))
    canvas.save(output, "PNG", optimize=True)
    return output


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(args.source) as source:
        artwork = crop_artwork(source)

    outputs = [save_standard(artwork, size, args.output_dir) for size in STANDARD_SIZES]
    outputs.extend(save_maskable(artwork, size, args.output_dir) for size in MASKABLE_SIZES)
    print(f"Generated {len(STANDARD_SIZES)} standard and {len(MASKABLE_SIZES)} maskable icons:")
    print("\n".join(str(path) for path in outputs))


if __name__ == "__main__":
    main()
