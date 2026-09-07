# OmniContact adapter

The released OmniContact example uses the standard UMR HSI/HOI adapter. See the
[OmniContact project paper](https://huggingface.co/papers/2606.26201) for the
upstream data source, then convert each motion into the flat SMPL-X sequence
layout below.

## UMR layout

```text
sample_data/omnicontact/
└── <category>/
    └── <motion>/
        └── <sequence-key>/
            ├── poses.npy
            ├── transl.npy
            ├── betas.npy
            ├── gender.npy                       # optional; neutral by default
            ├── model_type.npy                   # optional; must be smplx
            ├── mocap_framerate.npy              # optional; 30 by default
            ├── output_up.npy                    # optional; z by default
            ├── <object-name>.xml
            ├── <object-name>.obj
            └── prop_<object-name>.csv
```

The human-motion minimum is:

- `poses.npy` or `smpl_pose_axis_angle.npy`, shaped `[T, 165]` or `[T, 55, 3]`;
- `transl.npy` or `trans.npy`, shaped `[T, 3]`; and
- `betas.npy`, normally containing 10 or 16 SMPL-X shape coefficients.

All motion arrays must have the same frame count. Pose values are axis-angle
radians and translations are in meters. Place the licensed SMPL-X model for the
sequence gender in `smpl/`; the released neutral example uses
`smpl/SMPLX_NEUTRAL.pkl`.

An interaction object is discovered by a shared filename stem. Its
`prop_<object-name>.csv` is required and contains per-frame position and XYZW
quaternion columns (`px,py,pz,qx,qy,qz,qw`); `frame_id` and `timestamp` columns
may precede them. Provide an object MJCF XML when robot-object collision
constraints are required; an OBJ-only object can supply surface contact but
cannot be inserted into the MuJoCo collision model. Mesh paths inside the XML
must resolve relative to that XML. We recommend using
[CoACD](https://github.com/SarahWeiii/CoACD) to create separate convex collision
pieces for concave objects before retargeting.

Files such as `motion_actor.npz`, IK reports, matched-name arrays, residuals,
`num_frames.npy`, and `frame_time.npy` may be retained as conversion provenance,
but the pipeline does not require them when the flat files above are present.

## Run the sample

```bash
python scripts/humanoid_retarget_pipeline_hsi_hoi.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --defaults humanoid_retarget_defaults_hsi_hoi_standard.json
```

For another category or motion, pass the directory that contains the sequence
directories and the desired sequence key with `--data` and `--seq-key`.
