# Planet Potion — the show schedule

**Generated** by `work/re/showtable.py` from `web/data/showorder.json`.
Do not edit by hand: regenerate with

```
python3 work/re/showtable.py
```

The schedule itself comes from `showorder.py`: the call ORDER is scanned out
of `_play_part_1` / `_play_part_3`, and the DURATIONS come from the music —
every driver's loop exits when `dbplayer.library` reports signal 1, and the
generated module carries exactly as many effect-7 signal-1 events as the part
has driver calls (26 and 26, 13 and 13).

## Reading the table

`slot` is what the schedule entry names. **`on screen` is what is drawn**, in
draw order, bottom layer first — and the two differ more often than not:

* an entry with no slot (`new_camera`, `dalej`) CONTINUES the scene before it;
* `p_start` and `p_end` draw **two** graphs. The original keeps the visible
  scene at `r2+0x289a` and a second at `r2+0x289e`; `p_start` generates into
  the second, `p_end` into the first, and both drivers show `0x289a` and then
  `0x289e` over the top of it, every frame.

That second point is the whole shape of a transition: the transition graph is
held across the `p_start` **and** the `p_end`, while the picture underneath it
is swapped. p3 `0x2796` is on screen 58.008..60.000 s — not the 0.820 s its own
entry occupies.

`start`/`end`/`dur` are seconds within the part; `ticks` is the same span on the
50 Hz clock the engine actually runs on. `fog` is the preset address, `cam` the
camera ordinal a `new_camera` entry selects.

## Matching a timestamp in the reference capture

`work/reference/planet-potion_ref.mkv`, measured by `capalign.mjs`:

```
part one    show = capture - 0.120
part three  show = capture - 291.258
```

The part-three figure is the 0.120 s capture offset plus part one's 289.286 s
plus the 1.852 s of silence between the parts.

⚠ Part three runs **2640 ppm fast** against the capture (~0.15 s by the
58-second mark), and the capture is 29.97 fps against the intro's 50 Hz, so it
has already been frame-rate converted. Good enough to name a scene by; never a
frame-exact oracle.

## part one (`p1`)

289.286 s, 26 entries, 1013 rows

```
 #  driver      slot     on screen             start      end     dur          ticks  cam    fog
------------------------------------------------------------------------------------------------
 0  synchro     0x25aa   0x25aa                0.000   18.429  18.429       0..921       —      —
 1  synchro     0x25ba   0x25ba               18.429   36.714  18.285     921..1836      —      —
 2  synchro     0x25ce   0x25ce               36.714   55.000  18.286    1836..2750      —      —
 3  synchro     0x25ae   0x25ae               55.000   73.286  18.286    2750..3664      —      —
 4  synchro     0x25b2   0x25b2               73.286   77.857   4.571    3664..3893      —      —
 5  synchro     0x25b6   0x25b6               77.857   96.143  18.286    3893..4807      —      —
 6  synchro     0x25ca   0x25ca               96.143  114.429  18.286    4807..5721      —      —
 7  synchro     0x25be   0x25be              114.429  132.714  18.285    5721..6636      —      —
 8  synchro     0x25c2   0x25c2              132.714  151.286  18.572    6636..7564      —      —
 9  synchro     0x25c6   0x25c6              151.286  169.286  18.000    7564..8464      —      —
10  synchro     0x25da   0x25da              169.286  173.857   4.571    8464..8693      — 0x25f2
11  new_camera  —        0x25da              173.857  178.429   4.572    8693..8921      1      —
12  new_camera  —        0x25da              178.429  183.000   4.571    8921..9150      2      —
13  new_camera  —        0x25da              183.000  187.571   4.571    9150..9379      3      —
14  synchro     0x25d6   0x25d6              187.571  192.143   4.572    9379..9607      — 0x2606
15  new_camera  —        0x25d6              192.143  197.000   4.857    9607..9850      1      —
16  new_camera  —        0x25d6              197.000  201.286   4.286    9850..10064     2      —
17  new_camera  —        0x25d6              201.286  205.857   4.571   10064..10293     3      —
18  synchro     0x25de   0x25de              205.857  210.429   4.572   10293..10521     — 0x261a
19  new_camera  —        0x25de              210.429  215.286   4.857   10521..10764     1      —
20  new_camera  —        0x25de              215.286  219.571   4.285   10764..10979     2      —
21  new_camera  —        0x25de              219.571  224.143   4.572   10979..11207     3      —
22  synchro     0x25e2   0x25e2              224.143  233.286   9.143   11207..11664     —      —
23  synchro     0x25ea   0x25ea              233.286  242.429   9.143   11664..12121     —      —
24  synchro     0x25e6   0x25e6              242.429  260.714  18.285   12121..13036     —      —
25  synchro     0x25ee   0x25ee              260.714  288.429  27.715   13036..14421     — 0x262e
```

## part three (`p3`)

156.562 s, 13 entries, 1088 rows

```
 #  driver      slot     on screen             start      end     dur          ticks  cam    fog
------------------------------------------------------------------------------------------------
 0  play_scene  0x277a   0x277a                0.000   15.000  15.000       0..750       —      —
 1  play_scene  0x2782   0x2782               15.000   28.008  13.008     750..1400      —      —
 2  p_start     0x2792   0x2782 + 0x2792      28.008   28.594   0.586    1400..1430      —      —
 3  p_end       0x2786   0x2786 + 0x2792      28.594   29.883   1.289    1430..1494      —      —
 4  dalej       —        0x2786               29.883   58.008  28.125    1494..2900      —      —
 5  p_start     0x2796   0x2786 + 0x2796      58.008   58.828   0.820    2900..2941      —      —
 6  p_end       0x277e   0x277e + 0x2796      58.828   60.000   1.172    2941..3000      —      —
 7  dalej       —        0x277e               60.000   75.000  15.000    3000..3750      —      —
 8  play_scene  0x278a   0x278a               75.000   90.000  15.000    3750..4500      —      —
 9  play_scene  0x278e   0x278e               90.000  101.016  11.016    4500..5051      —      —
10  p_start     0x279a   0x278e + 0x279a     101.016  105.469   4.453    5051..5273      —      —
11  play_scene  0x279e   0x279e              105.469  135.000  29.531    5273..6750      —      —
12  play_scene  0x27a2   0x27a2              135.000  154.805  19.805    6750..7740      —      —
```
