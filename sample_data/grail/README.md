# NVIDIA GRAIL adapter

Download the source data from the
[NVIDIA PhysicalAI Locomanipulation GRAIL dataset](https://huggingface.co/datasets/nvidia/PhysicalAI-Robotics-Locomanipulation-GRAIL)
and rearrange each subset into the fixed UMR layout below.

The included `slope` sequence and its procedurally generated scene asset remain
under the upstream CC BY-NC 4.0 license. UMR selected one sequence, exported its
USD geometry, generated CoACD collision pieces, and produced the MuJoCo XML and
trajectory CSV. The G1-proportioned template OBJ is distributed separately as an SMPL-X Body under CC BY 4.0; the licensed
SMPL-X Model weights are not included.

GRAIL does not use an ordinary shaped SMPL-X template. The released
`g1_smplx_model/` overlay converts the licensed neutral SMPL-X model into the
GRAIL G1-SMPL-X surface used for correspondence. Keep this overlay intact and
also place the upstream `SMPLX_NEUTRAL.pkl` at `smpl/SMPLX_NEUTRAL.pkl`.

## UMR layout

```text
sample_data/grail/
├── g1_smplx_model/
│   ├── g1_smplx_param.npz
│   ├── g1_smplx_tpose.obj
│   └── umr_smplx_overlay.json
└── <subset>/
    ├── recon/
    │   └── <sequence-key>.pkl
    ├── object_usd/
    │   ├── <sequence-key>.usd
    │   └── textures/
    │       └── <sequence-key>/<texture files>        # optional
    └── object_mjcf/
        └── <sequence-key>/                           # preprocessed or generated
            ├── grail_object.xml
            ├── grail_object.obj
            ├── prop_grail_object.csv
            ├── metadata.json
            └── grail_object_collision_<index>.obj
```

`<subset>` is `slope` in the released example. A directory is recognized as a
GRAIL root only when both `recon/` and `object_usd/` exist. The recon pickle and
USD must have identical filename stems.

The recon pickle supplies `human_data` with SMPL-X `poses`, `trans`, `betas`,
`gender`, `model`, and frame rate, plus `obj_data` with per-frame `obj_R`,
`obj_t`, and `obj_scale`. Other upstream directories such as `meta/`,
`objects/`, and `robot/` may be retained but are not read by the released UMR
pipeline.

The `object_mjcf/` directory contains the MuJoCo-ready visual mesh, convex
collision pieces, and the object trajectory. It is reused when present. If it
is absent, `humanoid_retarget_defaults_hsi_hoi_grail.json` enables automatic
USD export and CoACD convex decomposition. Textures are optional. For a
concave object, retain the visual mesh and use the decomposed pieces as
separate collision geoms.

## Run the sample

```bash
python scripts/humanoid_retarget_pipeline_hsi_hoi.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --defaults humanoid_retarget_defaults_hsi_hoi_grail.json
```

For another sequence or subset, pass the GRAIL root and matching recon stem:

```bash
python scripts/humanoid_retarget_pipeline_hsi_hoi.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --defaults humanoid_retarget_defaults_hsi_hoi_grail.json \
  --data sample_data/grail/<subset> \
  --seq-key <sequence-key>
```
