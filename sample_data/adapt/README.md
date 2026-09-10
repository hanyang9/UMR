# AdaPT body+racket example data

The AdaPT example treats the SMPL-X body and tracked racket as one source
surface, and the Unitree G1 and rigidly attached racket as one target surface.
A compact source-motion and calibration example is included in this repository.

The included files are:

```text
sample_data/adapt/duanxiran_fq2/
  source_motion.npz
  source_racket_trajectory.npz
  source_smplx_tpose.npz
  source_racket_tpose.npz
```

Then run:

```bash
python scripts/humanoid_retarget_pipeline_adapt.py
```

The wrapper synchronously downsamples the 120 FPS body and racket inputs to 30
FPS, builds and trains body+racket correspondence, runs retargeting, exports the
correspondence viewer, and opens the MuJoCo result viewer. Generated data stays
under `output/`.
