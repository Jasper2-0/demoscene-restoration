# Energia — browser restoration

Work-in-progress JavaScript/WebGL2 reconstruction of **Energia by Sunflower**
(Assembly 2001). The current build uses native MP3/Web Audio playback, media
time as its clock, the exact shared SUNF scene parser, recovered material and
sphere-map behavior, four independently layered managed scenes, the recovered
overlapping phase ladder, and executable-derived versions of the 0–56 second
wave field, dot volume, hardcoded texture-cut compositor, 44–82 second mode-2
particle compositor, and the deterministic `0x410f90` triangle layer reused
through the middle and late phases. The executable-derived opening dot design,
Sunflower logo, repeated height-mapped cylinder, and 132–157 second bouncing
metaball compositor with its extracted native marching-cubes topology are also
active. The 156–233 late overlay now includes its
custom 256-box `nowheretorun.exp` controller, procedural line bundle, and the
mode-3 13-cubed spring lattice with its original radial fields and skymap
surface. The 233–290 late section also includes the recovered 40-by-40
`DISP2.raw`/`wave1.raw` cylinder and its six additive passes. It is an
engineering build, not yet a signed-off faithful release.

## Run and inspect

Serve the repository with any static HTTP server and open `web-energia/`. There
is no build step or runtime dependency. Browser autoplay policy requires the
**Start with sound** button.

- `?t=1&debug` exercises the early wave and dot fields without a design mask.
- `?t=15&debug` adds the recovered `D2_3.jpg` design compositor.
- `?t=60&debug` exercises the intentional `kurwa2_.exp`/`freak.exp` overlap.
- `?t=69&debug` exercises that overlap plus the recovered mode-2 particle
  system and `0x410f90` triangle layer near the reference starburst passage.
- `?t=136&debug` shows mode 4's separated bouncing metaballs; `?t=144.5&debug`
  shows the merged liquid mass and executable-derived three-pass material.
- `?t=170&debug` shows the first `0x413050` box/line overlay; `?t=190&debug`
  and `?t=220&debug` exercise two camera phases of the restored mode-3 spring
  lattice under that overlay.
- `?t=250&debug` exercises the recovered late `0x40f570` cylinder while
  `?t=270&debug` covers the uncaptured soundtrack tail.
- Shared modules are vendored under `js/shared/`; edit the canonical copies in
  `shared/sunflower/js/` and run `node tools/sync-sunflower-runtime.mjs`.

## Restoration method and provenance

The release files are preserved under `work-energia/src/`. `demo.dat` is
unpacked repeatably rather than modified, and every deployed asset is verified
by exact path, size, and SHA-256 against that extraction. Runtime behavior is
recovered from `Energia_FIXED.exe`, external SUNF scenes, raw/JPEG maps, and the
original MP3. The reference capture is waveform-aligned at show time = capture
time + 3.023 seconds; only low-resolution diagnostic boundary sheets are
retained under `work-energia/reference/`.

Format and sequencing evidence is documented in `work-energia/re/FORMATS.md`
and `work-energia/re/TIMELINE.md`. The common parser, MiniGL compatibility layer,
clocks, texture decoders, and tests live under `shared/sunflower/`.

## Original credits

The release file credits Unreal, Orion, Yolk, and Louie, with help from Fthr,
Thor, Yhurt, and Saffron. As established by the executable lineage, Unreal was
the primary coder of Energia. These names describe the original production;
this reconstruction does not claim their endorsement.

## Licensing

`LICENSE` covers reconstruction source only. The original executable, artwork,
design, text, and music remain the property of Sunflower and their credited
authors and are not relicensed.
