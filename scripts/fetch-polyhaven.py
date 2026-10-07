#!/usr/bin/env python3
"""
Downloads the Poly Haven assets used by the 3D shop (all CC0) into
public/assets/ph/. Run from the project root:

    python3 scripts/fetch-polyhaven.py

The list lives in ASSETS below. Models come as glTF with 1k textures;
surface textures as color, normal and ARM (ambient occlusion, roughness,
metalness) maps; panoramas (HDRI) for what is seen outside. Uses curl, which is available on macOS and Linux.
"""
import json
import os
import subprocess
import sys

MODELS = [
    "wine_barrel_01", "wooden_crate_01", "wooden_crate_02", "wooden_bucket_01",
    "wicker_basket_01", "wicker_basket_02", "jug_01", "ceramic_pot", "wooden_bowl_01",
    "food_apple_01", "wooden_candlestick", "folding_wooden_stool", "wooden_broom",
    "wine_bottles_01", "lantern_chandelier_01", "vintage_oil_lamp",
]
TEXTURES = {
    "old_wood_floor": "2k",
    "painted_plaster_wall": "2k",
    "old_stone_wall": "1k",
    "rough_wood": "1k",
    "wood_table_worn": "1k",
    "kitchen_wood": "1k",
    "rough_linen": "1k",
    "leafy_grass": "1k",
    "stony_dirt_path": "1k",
}
HDRIS = {"dry_orchard_meadow": "2k", "evening_field": "2k"}
OUT = "public/assets/ph"


def get(url: str) -> bytes:
    return subprocess.run(["curl", "-sSfL", "--retry", "3", url], check=True, capture_output=True).stdout


def save(url: str, path: str) -> None:
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(get(url))


def main() -> None:
    only = set(sys.argv[1:])
    for name in MODELS:
        if only and name not in only:
            continue
        files = json.loads(get(f"https://api.polyhaven.com/files/{name}"))
        g = files["gltf"]["1k"]["gltf"]
        base = f"{OUT}/models/{name}"
        save(g["url"], f"{base}/{name}.gltf")
        for rel, inc in g["include"].items():
            save(inc["url"], f"{base}/{rel}")
        print(f"✓ modello {name}")
    for name, res in TEXTURES.items():
        if only and name not in only:
            continue
        files = json.loads(get(f"https://api.polyhaven.com/files/{name}"))
        for kind, key in (("diff", "Diffuse"), ("nor_gl", "nor_gl"), ("arm", "arm")):
            save(files[key][res]["jpg"]["url"], f"{OUT}/textures/{name}/{name}_{kind}.jpg")
        print(f"✓ texture {name}")
    for name, res in HDRIS.items():
        if only and name not in only:
            continue
        files = json.loads(get(f"https://api.polyhaven.com/files/{name}"))
        save(files["hdri"][res]["hdr"]["url"], f"{OUT}/hdri/{name}_{res}.hdr")
        print(f"✓ panorama {name}")


if __name__ == "__main__":
    main()
