# LAFAN1 / SMPL-X adapter

UMR consumes a surface-producing SMPL-X sequence, not the original LAFAN1 BVH
directly. Download motion from the
[LAFAN1 repository](https://github.com/ubisoft/ubisoft-laforge-animation-dataset)
and convert it to SMPL-X locally. LAFAN1 is licensed under
[CC BY-NC-ND 4.0](https://github.com/ubisoft/ubisoft-laforge-animation-dataset/blob/master/license.txt).
This repository includes one converted sequence, `dance1_subject2.npz`. The
[`lafan_to_smplx`](https://github.com/jaraujo98/lafan_to_smplx) workflow from
GMR provides one compatible local conversion route.

## UMR layout

```text
sample_data/lafan1_smplx/
├── README.md
├── dance1_subject2.npz
└── <another-locally-converted-sequence>.npz
```

Each `.npz` represents one sequence, and its filename stem is the sequence key.
A compatible file contains:

- pose data in one of these forms: `poses` or `pose_aa`, shaped `[T, 165]` or
  `[T, 55, 3]`; alternatively `root_orient` plus `pose_body`;
- root translation as `trans` or `trans_orig`, shaped `[T, 3]`;
- `betas` or `beta`, normally 10 or 16 coefficients;
- optional scalar `gender`, defaulting to `neutral`;
- optional scalar `mocap_frame_rate`, `mocap_framerate`, or `fps`, defaulting to
  30; and
- optional scalar `output_up`, defaulting to `z`.

Pose rotations are SMPL-X axis-angle values in radians and translations should
be in meters. All arrays belonging to the motion must use the same frame count.
Place the corresponding licensed body model at `smpl/SMPLX_NEUTRAL.pkl`, or use
`SMPLX_MALE.pkl`/`SMPLX_FEMALE.pkl` when the sequence metadata selects that
gender.

## Run the included sequence

```bash
python scripts/humanoid_retarget_pipeline.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json
```

The defaults select the included `dance1_subject2.npz`. For another file,
set `motion.data` to this directory and `motion.seq_key` to the new filename
stem in the selected defaults or robot configuration.

## Batch retargeting

The released batch defaults scan this directory non-recursively for `.npz`
files and use `bidirectional` warm start with DP:

```bash
python scripts/humanoid_retarget_pipeline_batch.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json \
  --batch-config humanoid_retarget_defaults_batch.json
```

Place additional converted sequences directly in this directory, or pass a
different root with `--motion-folder`. Use `--recursive` when the converted
files are organized in subdirectories. Batch results are stored under
`output/batch_retarget/<robot-name>/`, and `batch_summary.json` records the
status and output path of every clip.
