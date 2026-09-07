# OMOMO adapter

Download OMOMO from the
[official OMOMO repository](https://github.com/lijiaman/omomo_release), then
convert each sequence into UMR's flat SMPL-X plus object-trajectory layout.
The upstream
[MIT license](https://github.com/lijiaman/omomo_release/blob/main/LICENSE)
explicitly covers the software but does not state a license for the
downloadable dataset. UMR therefore does not redistribute any
OMOMO motion, trajectory, or object mesh. Download and prepare those files
locally before using this adapter.

The HSI/HOI pipeline searches for sequence directories directly below the data
root or below `train_and_test/`, `train/`, and `test/`.

## UMR layout

```text
sample_data/omomo/
├── train_and_test/                         # train/ or test/ are also accepted
│   └── <sequence-key>/
│       ├── poses.npy
│       ├── transl.npy
│       ├── betas.npy
│       ├── gender.npy
│       ├── model_type.npy                  # smplx
│       ├── mocap_framerate.npy
│       ├── output_up.npy
│       ├── <object-name>.xml
│       └── prop_<object-name>.csv
└── object_mjcf/
    ├── <shared-object>.xml                 # optional reusable source description
    └── assets/
        ├── <object-visual>.obj
        └── <object-collision>_<index>.obj
```

The human-motion minimum is `poses.npy` (or
`smpl_pose_axis_angle.npy`), `transl.npy` (or `trans.npy`), and `betas.npy`.
Poses are SMPL-X axis-angle rotations shaped `[T, 165]` or `[T, 55, 3]`, root
translations are `[T, 3]` in meters, and every motion array must use the same
frame count. The sequence used by the command below is female and therefore
requires the licensed `smpl/SMPLX_FEMALE.pkl`; place the neutral or male model in `smpl/`
when selected by another sequence.

The sequence-local XML and `prop_<object-name>.csv` must share the same object
stem. The CSV stores per-frame `px,py,pz,qx,qy,qz,qw`; optional `frame_id` and
`timestamp` columns may precede them. The XML may reference shared meshes under
`object_mjcf/assets/`, but its relative paths must remain valid after the data
is moved.

Use the original object mesh for visualization and convex-decomposed meshes for
collision. We recommend [CoACD](https://github.com/SarahWeiii/CoACD) for this
preparation because MuJoCo otherwise replaces a complete mesh collision geom
with its convex hull. Per-sequence manifests, duplicate pose arrays, frame-time
arrays, and conversion metadata are optional provenance rather than required
pipeline input.

## Run locally prepared data

```bash
python scripts/humanoid_retarget_pipeline_hsi_hoi.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --defaults humanoid_retarget_defaults_hsi_hoi_standard.json \
  --data sample_data/omomo \
  --seq-key sub1_plasticbox_015
```

Select another sequence by changing only `--seq-key` when it follows the same
layout.
