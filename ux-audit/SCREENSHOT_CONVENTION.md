# Screenshot naming convention

Store Phase 1 visual-review evidence under `ux-audit/screenshots/`. Never use
reference imagery, copied assets, or a personal browser profile in a capture.

Use this stable pattern:

```text
{scenario}--{view}--{width}x{height}.png
```

Examples:

```text
empty-board--overhead--1440x960.png
starter-board--isometric-3d--1920x1080.png
invalid-placement--overhead--1440x960.png
```

Allowed scenario names are the review states listed in B10. Use `overhead`,
`isometric-3d`, or `perspective-3d` for `view`, and capture each required state
at both 1440x960 and 1920x1080.
