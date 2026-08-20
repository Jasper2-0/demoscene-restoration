#!/usr/bin/env python3
"""Parse every .HJB reachable on this machine and assert the whole corpus.

    python3 hjb_corpus_check.py <dir> [<dir> ...]

Exit codes:  0 all accounted for · 1 a regression · 77 no corpus found (absent)

THIS CHECK CAN FAIL, WHICH IS THE POINT.  METHOD.md records a checker in this
repository that printed its differences and exited 0 for months; the aggregate
script treated it as advisory and the one suite whose whole purpose was to fail
could not.  So this asserts, and it asserts the PRECONDITION too: if the corpus
is smaller than MIN_FILES the run is a failure, not a pass over nothing.

The corpus is copyrighted payload and therefore lives outside the repository —
`originals/haujobb/*/Data/` plus whatever the RAR/ACE extractions produced.
Point this at those directories; it never writes.

KNOWN DEVIATION.  One file of 252 does not consume to EOF, and it is listed
below with its exact residue rather than tolerated by a fuzzy rule.  Widening
the rule instead of naming the file is how a second, real defect gets absorbed
silently.
"""
import sys, os, glob, importlib.util, collections

MIN_FILES = 200
KNOWN_SHORT = {
    # basename: (bytes left over, why it is believed benign)
    'Strain3D.HJB': (24, 'trailing zeros; the 32 bytes before them are zero too, '
                         'so no information is lost. 158 of the other 159 nmat==1 '
                         'files parse exact, so this is not a material-count bug. '
                         'Unresolved: whether elements.exe reads them.'),
}

def load(name, path):
    # Never let a cached .pyc answer for the source.  Sabotaging rot_track's
    # `range(5)` to `range(6)` — the exact stride error an earlier pass made —
    # leaves the file the SAME SIZE, so restoring it can produce a source that
    # is byte-identical to the good copy while Python keeps running the broken
    # bytecode.  That happened while this checker was being tested, and it
    # reported the sabotaged result against a clean file, which is precisely the
    # kind of measurement METHOD.md Â§8 says to stop trusting.
    sys.dont_write_bytecode = True
    importlib.invalidate_caches()
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def main(roots):
    here = os.path.dirname(os.path.abspath(__file__))
    parser = load('hjb_exact', os.path.join(here, 'hjb_exact.py'))

    files = []
    for root in roots:
        for dirpath, _, _ in os.walk(root):
            files += glob.glob(os.path.join(dirpath, '*.HJB'))
            files += glob.glob(os.path.join(dirpath, '*.hjb'))
    files = sorted(set(files))

    if not files:
        print(f'hjb_corpus_check: no .HJB found under {roots} — corpus absent', file=sys.stderr)
        return 77
    if len(files) < MIN_FILES:
        print(f'FAIL precondition: corpus is {len(files)} files, expected >= {MIN_FILES}.\n'
              f'  A shrunken corpus passes trivially; that is not a result.', file=sys.stderr)
        return 1

    exact = 0
    problems = []
    stats = collections.Counter()
    for f in files:
        base = os.path.basename(f)
        try:
            _, size, consumed, hdr0, nframes, st, status = parser.parse(f)
        except Exception as e:
            problems.append((base, f'CRASH {type(e).__name__}: {e}'))
            continue
        stats['nmat=%s' % st.get('nmat')] += 1
        left = size - consumed
        if left == 0:
            exact += 1
            if base in KNOWN_SHORT:
                problems.append((base, 'known-short file now parses EXACT — '
                                       'remove it from KNOWN_SHORT'))
        elif base in KNOWN_SHORT and left == KNOWN_SHORT[base][0]:
            pass                                   # accounted for, by name and size
        else:
            problems.append((base, f'{left} bytes unconsumed of {size}'))

    print(f'hjb_corpus_check: {exact} exact, '
          f'{len(KNOWN_SHORT)} known-short, {len(files)} total')
    for name, (n, why) in KNOWN_SHORT.items():
        print(f'  known short: {name} (+{n} B) — {why}')
    if problems:
        print(f'\nFAIL: {len(problems)} file(s) regressed', file=sys.stderr)
        for base, msg in problems[:20]:
            print(f'  {base}: {msg}', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
