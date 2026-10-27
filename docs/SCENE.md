# Vinyl Ecstatic: scene reference

This document is the integration contract for the 3D shop: coordinates, dimensions, object names, interaction ids and materials. If assets are later rebuilt in Blender, keep these names and conventions and the website code will keep working.

## Coordinate conventions

| Property | Value |
| --- | --- |
| Units | metres |
| Up axis | +Y (glTF convention; Blender converts Z-up on import/export) |
| Origin | finished floor level, centre of the room |
| Facing the rear wall from the entrance | looking down −Z |
| Left wall | x = −2.4 (brick) |
| Right wall | x = +2.4 (boards) |
| Rear wall | z = −4.0 (sign, shelving, counter) |
| Front wall / entrance | z = +4.0 |
| Visitor spawn | (0.75, 1.65, 3.3), yaw 0.12 rad (looking down the aisle) |

All values live in [`src/scene/layout.ts`](../src/scene/layout.ts). Furniture components and collision volumes read the same footprints, so editing a footprint there moves both the mesh and its collider.

## Room dimensions

| | Value | Notes |
| --- | --- | --- |
| Interior width | 4.8 m | narrowed from the 5.5 m starting point so the aisle stays close to the 1.0–1.2 m in the spec instead of becoming a showroom gap |
| Interior length | 8.0 m | |
| Interior height | 3.0 m | |
| Wall / floor thickness | 0.15 m | |
| Main aisle | ~1.9 m between island and right-hand furniture | narrows to ~1.0 m at the turntable cabinet and counter |
| Side aisle | 0.8 m between the wall bins and the island | |
| Eye height | 1.65 m | collision radius 0.22 m |

### Plan (top view, entrance at the bottom)

```
 z=-4.0 ┌──────────────────────────────────────────────┐
        │[corner] ║║ REAR SHELVING (3 units, 2.2 m) ║║ │  ← VINYL ECSTATIC sign above
        │          ┌── COUNTER + register ──┐        │
        │ wall     └────────────────────────┘ ┌────┐ │
        │ bins                                 │ TT │ │  ← turntable cabinet, NOW PLAYING
        │ (1)  ┌──────┐                        │cab │ │
        │      │      │                        └────┘ │
        │      │ISLAND│  main aisle                   │
 brick  │      │ 4    │                         ┌───┐ │ boards
 x=-2.4 │      │genres│                         │rack│ │ x=+2.4
        │      │      │                         │   │ │
        │      └──────┘                         └───┘ │
        │                                              │
 z=+4.0 └──[ window ]──────────[ door ]──────────────┘
```

### Furniture footprints

| Name | x range | z range | Height |
| --- | --- | --- | --- |
| leftWallBins | −2.40 … −1.85 | −2.70 … 3.30 | 0.95 |
| island | −1.05 … −0.05 | −1.50 … 3.00 | 0.92 |
| rearShelving | −1.95 … 1.55 | −4.00 … −3.62 | 2.20 |
| counter | −1.45 … 0.95 | −3.05 … −2.45 | 1.00 |
| turntableCabinet | 1.85 … 2.40 | −2.30 … −0.75 | 0.85 |
| rightRack | 1.95 … 2.40 | −0.20 … 3.20 | 1.05 |
| cornerUnit | 1.75 … 2.40 | −4.00 … −3.35 | 1.25 |

Door opening: centred at x = 0.85, 1.0 m wide, 2.15 m tall. Shop window: x −2.0 … −0.35, y 0.85 … 2.3.

## Scene hierarchy

Object names below are set in code and survive GLB export.

```
VinylStore
├── Architecture
│   ├── Floor                      plank material, slab underneath
│   ├── Ceiling                    plaster, CeilingBeam ×3, conduit (hidden when camera is above it)
│   └── Entrance                   FrontWall pieces, Door, Window, front-wall posters
├── LeftWall
│   ├── LeftWallSurface            Brickwork + WallMounted (DisplayShelf ×2, project/decor sleeves, Posters)
│   ├── RecordBins                 bin carcass, BinRecords, StoredRecords, divider cards
│   └── Island                     carcass, BinRecords, CubbyRecords
├── RearWall
│   ├── RearWallSurface            WoodenPanels + WallMounted (MainSign, FairyLights, covers, posters)
│   ├── RecordShelves              ShelfUnit_1..3, ShelvedRecords
│   ├── Counter
│   └── CornerUnit
├── RightWall
│   ├── RightWallSurface           WoodenPanels + WallMounted (DisplayShelf ×2, sleeves, Posters, large album art)
│   ├── StorageCabinet             turntable cabinet + CabinetRecords
│   └── RightRack                  RackRecords
├── Countertop                     Monitor, TableLamp ×2, Speakers, flat record stack, counter-front posters
├── CeilingFixtures
│   └── PendantLights              PendantLight ×6 (Bulb, cord, socket, optional shade, lights)
├── InteractiveObjects
│   ├── ProjectRecords             Interactive:record:<projectId> ×N
│   ├── GenreDividers              Interactive:genre:<categoryId> ×4
│   ├── Interactive:sign:main
│   ├── ExperienceDisplay          Interactive:counter:register (CashRegister)
│   ├── AboutSign                  Interactive:sign:support-indie (StandSign)
│   ├── ContactTurntable           Interactive:turntable:contact (Turntable)
│   ├── NowPlayingDisplay          Interactive:display:now-playing
│   └── Interactive:shelf:projects invisible hit plane over the rear shelving
├── Navigation
│   ├── SpawnPoint
│   └── CollisionVolumes           Collider_<footprint name> (wireframe, visible with ?debug)
└── Lighting
    ├── AmbientLighting            hemisphere + ambient
    └── Environment                local light-cards for reflections (not exported)
```

Each `*Surface` group is a `CulledWall`: it hides itself (with its wall-mounted decor) whenever the camera is outside that wall, which is what makes the overview (dollhouse) mode work. Floor-standing furniture is never hidden.

## Interaction ids

Interactive objects carry only an id. What the id opens is defined in `interactions` in [`src/data/portfolio.ts`](../src/data/portfolio.ts).

| id | Object | Opens |
| --- | --- | --- |
| `sign:main` | VINYL ECSTATIC lightbox | Intro / home |
| `record:<projectId>` | face-out sleeves on the left wall's eye-level shelf | that project |
| `genre:systems` | GRUNGE divider | systems programming list |
| `genre:hardware` | INDIE ROCK divider | hardware & embedded list |
| `genre:experimental` | ALTERNATIVE divider | experiments & research list |
| `genre:interdisciplinary` | POST-PUNK divider | interdisciplinary list |
| `counter:register` | cash register | Experience |
| `display:now-playing` | NOW PLAYING frame | featured project (`featured: true`) |
| `sign:support-indie` | SUPPORT INDIE MUSIC card | About |
| `turntable:contact` | turntable | Contact |
| `shelf:projects` | rear record shelving | all projects |

## Materials

All materials are shared instances from [`src/scene/materials.ts`](../src/scene/materials.ts); textures are generated at runtime by [`src/scene/textures/`](../src/scene/textures/).

| Material name | Used on | Maps | Roughness / metalness |
| --- | --- | --- | --- |
| `Wood_Floor` | floor | colour, bump, roughness (2 m tile) | ~0.8 |
| `Wood_WallCladding` | rear, right and front walls | colour, bump (2 m tile) | 0.88 |
| `Brick_Exposed` | left wall | colour, bump (1.5 m tile) | 0.92 |
| `Plaster_Ceiling` | ceiling | colour | 0.95 |
| `Wood_honey / dark / pale / black` (+ `_Polished`) | furniture | colour, bump (0.8 m tile) | 0.8 (0.5 polished) |
| `Metal_brass / steel / black / chrome` | register, turntable, lamps, brackets | – | 0.18–0.55 / 0.6–1 |
| `Paper_SleeveAtlas` | instanced records | 4×4 cover atlas, per-instance cell | 0.78 |
| `Paper_*` | posters, signs, face-out sleeves | colour | 0.82 |
| `Vinyl` | records | grooves/label colour + bump, clearcoat | 0.32 |
| `Emissive_*` | bulbs, sign face, screens | emissive (+ map) | – |

Surface UVs are in world units (`worldBox`, `worldPlane` in `geometry.ts`), and wood grain is rotated to run along each face's longest edge, so nothing stretches no matter how a panel is sized.

## Performance notes

- Records are `InstancedMesh` runs (about a dozen draw calls for ~4,000 sleeves). Every sleeve picks its artwork from one atlas through a per-instance attribute patched into the standard material.
- Geometries and materials are cached and shared by key.
- High quality: soft shadows from two spot lights, N8AO ambient occlusion, bloom, AgX tone mapping. Low quality: no shadows, no post-processing, lower pixel ratio. `PerformanceMonitor` drops to low automatically if the frame rate collapses.
- Contact shadows under furniture are baked-style gradient decals, so they work in both modes.
