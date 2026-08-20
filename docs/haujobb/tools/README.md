# Triage tooling

Scripts written during the Haujobb triage study. They are working tools, not
verified harnesses: nothing here is gated by a build, and the parsers were
written to *test hypotheses against the whole population*, which is why they
report counts rather than just succeeding.

| script | what it does |
|---|---|
| `hjb_exact.py` | **the** .HJB reader, derived from Moments.exe's loader. 251 of 252 files byte-exact across eight productions |
| `hjb_corpus_check.py` | runs `hjb_exact.py` over a corpus and **asserts** it: exit 1 on regression, 1 on a corpus too small to mean anything, 77 when the corpus is absent |
| `parse_hjb_v2.py` | **SUPERSEDED.** Independent .HJB reader derived from Genoaux.exe. Kept because the disagreement is the evidence: it fails 47 files `hjb_exact.py` parses byte-exact, and passes none that `hjb_exact.py` fails. Every failure is a read past end-of-buffer, several at *exactly* the file length — a loop-termination bug in its `while r.o < len(d)` node walk, not a rival reading of the format. Do not use it; do not delete it. |
| `parse_hjb.py`, `scan_hjb.py`, `stride.py` | earlier/again-useful probes: record scanning, stride hunting |
| `aceparse.py`, `ace2.py`, `acewalk.py` | locate and walk the ACE archives embedded in `elements.exe` and `WE_ARE.EXE` |
| `pemap.py`, `entropy.py`, `magics.py` | hand-rolled PE section/resource map, windowed Shannon entropy, embedded-container magic scan |

## Dependencies

`acefile` (BSD-2-Clause, Daniel Roethlisberger) is **not vendored here** — it is
a third-party library and belongs in an environment, not in `docs/`:

```sh
uv run --with acefile python3 aceparse.py ...
```

Note the ACE gotcha these scripts encode: **ACE stores CRC-32 without the final
inversion.** Compare against `~crc32(data) & 0xffffffff` or a correct extraction
reports every entry as corrupt.

## Running the corpus check

```sh
python3 hjb_corpus_check.py \
  ../../../originals/haujobb <dir-of-extracted-rar> <dir-of-extracted-ace>
```

The corpus is copyrighted payload and lives outside the repo, so the check takes
directories rather than assuming any. It has been **seen to fail**: sabotaging
`rot_track`'s key stride from 40 to 44 bytes — the exact error an earlier pass
made — drops it from 251 exact to 114 and returns 1.

One trap that fired during that test and is now guarded in the tool: the
sabotage `range(5)` → `range(6)` leaves the source the **same size**, so
restoring it produced a file byte-identical to the good copy while Python went
on running the cached `.pyc`. The checker now invalidates caches and refuses to
write bytecode.
