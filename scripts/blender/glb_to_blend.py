"""Build the Blender project file from the exported shop.

Usage (Blender 4.2+ or the `bpy` Python module):

    blender --background --python scripts/blender/glb_to_blend.py -- \
        blender/vinyl-store.glb blender/vinyl-store.blend

    # or, with `pip install bpy`:
    python scripts/blender/glb_to_blend.py blender/vinyl-store.glb blender/vinyl-store.blend

What it does:
  * imports the GLB (hierarchy and object names from docs/SCENE.md are kept),
  * mirrors the top-level groups (Architecture, LeftWall, ...) as collections,
  * packs the generated textures into the .blend so the file is self-contained,
  * adds a camera at the visitor spawn point at eye height,
  * boosts imported light energy to match the site's look,
  * sets metric units and Filmic/AgX-style view so it looks like the site.

glTF is Y-up; Blender is Z-up. The importer maps glTF (x, y, z) to Blender
(x, -z, y), so the rear wall ends up at Blender y = +4 and facing it from the
entrance means looking down +Y.
"""

import math
import os
import sys

import bpy


BULB_WATTS = 60


def args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else argv[1:]
    if len(argv) < 2:
        raise SystemExit("usage: glb_to_blend.py <in.glb> <out.blend>")
    return os.path.abspath(argv[0]), os.path.abspath(argv[1])


def main():
    src, dst = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"

    bpy.ops.import_scene.gltf(filepath=src)

    # One collection per top-level group under VinylStore.
    root = bpy.data.objects.get("VinylStore")
    if root:
        for child in list(root.children):
            col = bpy.data.collections.new(child.name)
            scene.collection.children.link(col)
            for obj in [child, *child.children_recursive]:
                for c in list(obj.users_collection):
                    c.objects.unlink(obj)
                col.objects.link(obj)

    # three.js light intensities come through the glTF unit conversion far too
    # dim for Cycles/Eevee. Re-scale so the brightest light is a ~60 W bulb and
    # the rest keep their relative strength.
    lights = list(bpy.data.lights)
    peak = max((l.energy for l in lights), default=1) or 1
    for light in lights:
        light.energy = BULB_WATTS * light.energy / peak
        light.shadow_soft_size = 0.05

    # Visitor camera: spawn (0.6, 1.65, 3.65) in glTF space -> (0.6, -3.65, 1.65) in Blender.
    cam_data = bpy.data.cameras.new("VisitorCamera")
    cam_data.lens_unit = "FOV"
    cam_data.angle = math.radians(70)
    cam = bpy.data.objects.new("VisitorCamera", cam_data)
    cam.location = (0.6, -3.65, 1.65)
    cam.rotation_euler = (math.radians(90 - 4.5), 0, math.radians(5.7))
    scene.collection.objects.link(cam)
    scene.camera = cam

    world = bpy.data.worlds.new("ShopNight")
    world.color = (0.06, 0.04, 0.025)  # stands in for the site's warm hemisphere light
    scene.world = world
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        scene.view_settings.view_transform = "Filmic"

    bpy.ops.file.pack_all()
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0  # no .blend1 backups
    bpy.ops.wm.save_as_mainfile(filepath=dst, compress=True)
    print("wrote", dst)


main()
