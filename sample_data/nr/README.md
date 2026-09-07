# NR FBX/BVH adapter

The NR adapter reconstructs the moving exterior human surface from a skinned
FBX character and one or more BVH motions. It is a human-motion adapter in this
release; object meshes and object trajectories are neither required nor read.

## UMR layout

```text
sample_data/nr/
└── <character-sequence-root>/
    ├── <skinned-character>.fbx
    ├── <reference-skeleton>.bvh             # optional; not read by UMR
    └── motion_actor_retarget_205_with_ids/
        ├── <sequence-key>.bvh
        └── <another-sequence-key>.bvh
```

The directory name `motion_actor_retarget_205_with_ids` is part of the adapter
contract. Keep exactly one root-level FBX when possible; if several are
present, UMR selects the first filename in sorted order. Every motion BVH must
use bone names and hierarchy compatible with the FBX skin bones. The current
adapter interprets source geometry and translation in centimeters and applies a
`0.01` conversion to meters; its native up axis is Y.

A root-level reference or rest-pose BVH such as `bone_final_xuzeyan.bvh` may be
kept for provenance, but the current pipeline does not read it. Put every
retargetable motion inside `motion_actor_retarget_205_with_ids/`.

FBX skin extraction requires Node.js 18 or newer. UMR ships the parser and its
minimal parser-only Three.js runtime; no Three.js viewer is involved.

## Run the sample

```bash
python scripts/humanoid_retarget_pipeline_nr.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json
```

For another character root or motion, use:

```bash
python scripts/humanoid_retarget_pipeline_nr.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --data sample_data/nr/<character-sequence-root> \
  --seq-key <sequence-key>
```

All BVHs under one root share the same FBX surface template and therefore reuse
the same learned source-robot correspondence. Put a different skinned character
in a separate root so UMR creates a different template identity.
