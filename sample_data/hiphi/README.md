# HiPHI adapter

UMR accepts [HiPHI](https://noitom-robotics.github.io/hiphi) motion after it
has been converted from BVH to SMPL-X. This repository includes one converted
non-interaction example, `Getting_up-get_up_0004`. The full HiPHI dataset and
SMPL-X body models are not distributed with UMR.

## Dataset layout

Keep converted motions and the original HiPHI object meshes in this layout:

```text
sample_data/hiphi/
├── object_meshes/
│   └── <mesh_id>.obj
└── data/
    └── <frame>/<lu>/<motion_id>/
        ├── motion_actor_smplx.npz
        ├── metadata.json
        └── object_tracks/
            └── <object_id>.csv        # interaction motions only
```

Each sequence directory contains:

- `motion_actor_smplx.npz`: SMPL-X pose, translation, body shape, gender, and
  frame-rate data.
- `metadata.json`: a HiPHI record with `dataset`, `motion_id`, and `objects`.
- `object_tracks/<object_id>.csv`: the per-frame object trajectory for an
  interaction motion.

The `objects` list in `metadata.json` may specify `object_id`, `mesh_id`,
`mesh_path`, and `trajectory_path`. When paths are omitted, UMR resolves
`object_meshes/<mesh_id>.obj` from the dataset root and
`object_tracks/<object_id>.csv` from the sequence directory.

## Run the included example

Place an appropriate licensed SMPL-X body model under `smpl/`, then run:

```bash
python scripts/humanoid_retarget_pipeline_hiphi.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --data sample_data/hiphi/data/Getting_up/get_up/Getting_up-get_up_0004
```

The same command accepts any converted motion directory that follows the
layout above. Plain motions use the non-interaction solver settings;
interaction motions automatically use the HiPHI HSI/HOI settings and their
object trajectories.

## Shared correspondence across body shapes

Different HiPHI actors and capture sessions may have different SMPL-X beta
parameters. UMR learns one beta-zero SMPL-X correspondence for each target
robot and transfers its fixed face and barycentric binding to the
sequence-specific body shape. The single-motion and batch adapters train this
shared correspondence when it is missing, then reuse it instead of retraining
correspondence for every motion.

## Interaction-object preprocessing

The downloaded HiPHI data provides visual object meshes as OBJ files. No
separate preprocessing command is required. Before a single interaction run
or batch run, UMR checks for a same-name MJCF beside the OBJ. If it is missing,
UMR runs CoACD using the dependencies in `requirements-umr.txt` and writes the
generated assets under:

```text
sample_data/hiphi/object_meshes/object_collision/<mesh_id>/
```

The original OBJ remains the visual geometry. The generated convex pieces are
used only for MuJoCo collision constraints and are reused on later runs.

## Batch retargeting

After arranging the complete converted dataset under `sample_data/hiphi/`, run:

```bash
python scripts/humanoid_retarget_pipeline_hiphi_batch.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json
```

The batch adapter discovers sequence directories from `metadata.json`, prepares
each unique missing object once, prepares or reuses the shared beta-zero
correspondence, and retargets the motions. Results are written under
`output/batch_retarget_hiphi/<robot-name>/`.

Object preprocessing and retargeting default to one worker to limit peak
memory. Use `--object-workers N` and `--workers N` only when the machine has
enough memory. Use repeatable `--sequence <motion_id>` arguments to process a
subset of motions.
