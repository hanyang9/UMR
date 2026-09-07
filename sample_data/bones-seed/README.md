# BONES-SEED / SOMA adapter

The motion and actor-shape data come from the gated
[BONES-SEED dataset](https://huggingface.co/datasets/bones-studio/seed). Its
[license](https://huggingface.co/datasets/bones-studio/seed/blob/main/LICENSE.md)
prohibits redistribution, so no BONES-SEED BVH, fitted shape, or rig
file is included in this repository. Accept the upstream license and download
those files directly into the layout below.

The body-model runtime assets come separately from the public
[NVIDIA SOMA-X model repository](https://huggingface.co/nvidia/SOMA-X/tree/main).
SOMA-X assets are also intentionally not mirrored here; download them from the
official NVIDIA repository rather than copying them from another dataset.

## UMR layout

```text
sample_data/bones-seed/
├── motions_uniform/
│   └── bvh/<sequence>.bvh
├── motions_proportional/
│   └── bvh/<sequence-containing-Axxx>.bvh
├── shapes/
│   ├── soma_uniform_fit_mhr_params/
│   │   └── soma_base_fit_mhr_params.npz
│   ├── soma_proportion_fit_mhr_params/
│   │   └── Axxx.npz
│   └── soma_base_rig/
│       ├── soma_base_skel_minimal.bvh
│       └── soma_base_skel_minimal.usd
└── soma_assets/
    ├── SOMA_neutral.npz
    ├── SOMA_template_rig.usda
    ├── SOMA_procedural_transforms.json
    └── MHR/
        ├── SOMA_wrap_lod1.obj
        ├── base_body_lod1.obj
        └── mhr_model_lod1.pt
```

The upstream `soma_uniform.tar.gz` archive supplies the uniform BVHs and
`soma_proportional.tar.gz` supplies the actor-proportional BVHs. Copy the
extracted `bvh/` directories into `motions_uniform/` and
`motions_proportional/`, respectively. Copy files from the upstream
`soma_shapes/` directory into the matching local `shapes/` subdirectories shown
above.

All uniform sequences share `soma_base_fit_mhr_params.npz`. For proportional
motion, the actor ID embedded in the BVH name, such as `A304`, selects the
matching `soma_proportion_fit_mhr_params/A304.npz` file. The filename must
therefore retain its `Axxx` actor ID.

No gated BONES-SEED file is included. After accepting the license, download the
required motion and shape files with the Hugging Face CLI:

```bash
hf auth login
hf download bones-studio/seed soma_uniform.tar.gz \
  --repo-type dataset \
  --local-dir /path/to/bones-seed-download
hf download bones-studio/seed \
  --repo-type dataset \
  --include "soma_shapes/**" \
  --local-dir /path/to/bones-seed-download
```

Download the mid-LOD SOMA-X files used by UMR directly into the default local
asset directory:

```bash
hf download nvidia/SOMA-X \
  SOMA_neutral.npz \
  SOMA_template_rig.usda \
  SOMA_procedural_transforms.json \
  MHR/SOMA_wrap_lod1.obj \
  MHR/base_body_lod1.obj \
  MHR/mhr_model_lod1.pt \
  --local-dir sample_data/bones-seed/soma_assets
```

Keep these files from the same SOMA-X release. UMR disables the SOMA pose
corrective model on this path, so `correctives_model.pt` is not required.
`MHR/base_body_lod6.obj` and `MHR/mhr_model_lod6.pt` are only needed if the
source is changed from the configured `mid` LOD to a lower MHR LOD.

The local `soma_assets/` directory is detected automatically. If the same
layout is stored outside the repository, set
`UMR_SOMA_ASSETS_PATH=/absolute/path/to/soma_assets` before running UMR.

## Run a downloaded sequence

```bash
python scripts/humanoid_retarget_pipeline.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --defaults humanoid_retarget_defaults_bones_seed.json
```

The defaults expect the locally downloaded
`motions_uniform/bvh/flip_090_002__A304_M.bvh`. To select another sequence,
change `motion.data` and `motion.seq_key` in a source defaults JSON while
keeping the robot-specific file passed through `--config` unchanged.

## Batch retargeting

The BONES-SEED batch adapter uses this layout directly and does not parse every
BVH to determine the source body template. Run the locally installed uniform
subset with:

```bash
python scripts/humanoid_retarget_pipeline_batch.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --batch-config humanoid_retarget_defaults_batch_bones_seed.json
```

All files in `motions_uniform/bvh/` reuse the single
`shapes/soma_uniform_fit_mhr_params/soma_base_fit_mhr_params.npz` body and the
`soma_uniform` correspondence. For the proportional subset:

```bash
python scripts/humanoid_retarget_pipeline_batch.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --batch-config humanoid_retarget_defaults_batch_bones_seed.json \
  --motion-folder sample_data/bones-seed/motions_proportional/bvh
```

Before scanning the proportional BVHs, UMR pre-registers every `Axxx.npz` under
`shapes/soma_proportion_fit_mhr_params/`. A filename such as
`<motion>__A304_M.bvh` is then matched directly to the `soma_A304` template.
Missing actor IDs or unmatched shape files raise a clear error instead of
silently falling back to a generic SOMA body. The default 48 retarget workers and 8
correspondence workers mirror the large-scale configuration; override
`--workers` and `--correspondence-workers` when local CPU/GPU capacity is
smaller.
