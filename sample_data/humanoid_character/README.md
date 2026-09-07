# Humanoid Character adapter

This adapter retargets motion from a skinned MuJoCo humanoid character rather
than from SMPL-X. The source character is licensed under
[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0):
[`assets/mimickit/humanoid.xml`](../../assets/mimickit/humanoid.xml) from
[MimicKit](https://github.com/xbpeng/MimicKit). The included
`humanoid_spinkick.pkl` comes from MimicKit's separately hosted official motion
bundle.

## UMR layout

```text
sample_data/humanoid_character/
├── README.md
├── humanoid_spinkick.pkl
├── <another-motion>.pkl
└── <motion-collection>.yaml                 # optional
```

Each motion pickle is a dictionary with:

- `frames`: `[T, 6 + N]`, containing root XYZ translation, root exponential-map
  rotation, and then `N` source-character DoFs in the exact order expected by
  the configured source MJCF;
- `fps`: playback and retargeting frame rate; and
- optional `loop_mode`, defaulting to `0`.

A YAML collection is also accepted when it contains a `motions` list whose
entries have a `file` path. Paths are resolved relative to the YAML file and
each pickle filename stem becomes a sequence key.

Motion files are inseparable from their source character definition. When the
MJCF character changes, update `source_character.xml`,
`source_character.name`, and its point-cloud center in the source defaults; do
not reuse a motion whose DoF order belongs to another character.

## Run the included motion

```bash
python scripts/humanoid_retarget_pipeline_character.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json
```

To use another pickle or YAML collection, set `motion.data` and
`motion.seq_key` in a derived character configuration. The Character pipeline
does not expose `--data` or `--seq-key` overrides.
