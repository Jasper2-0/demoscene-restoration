#!/usr/bin/env python3
"""Replace text in a file and FAIL if the anchor was not found.

    python3 docpatch.py FILE <<'EOF'
    --- old text
    +++ new text
    EOF

Written after five consecutive edits to PORT_SPEC.md silently did nothing.
`str.replace` with a stale anchor returns the string unchanged and raises
nothing, so a patch script exits 0, `git commit` succeeds, and the change is
reported as applied. That is the same shape as a `grep -c` over a crashed
command's empty output returning a confident `0`: an operation that cannot fail
loudly, trusted because its exit status was clean.

Three rules, all learned the hard way in this directory:

  * an edit that matched nothing is an ERROR, not a no-op;
  * an anchor matching more than once is ambiguous and also an error;
  * verify the new text is present afterwards, because that is the claim being
    made, not that a function was called.
"""
import sys


def patch(path, old, new, *, allow_multiple=False):
    text = open(path).read()
    n = text.count(old)
    if n == 0:
        raise SystemExit(f'docpatch: anchor not found in {path}:\n  {old[:80]!r}')
    if n > 1 and not allow_multiple:
        raise SystemExit(f'docpatch: anchor matches {n} times in {path}, refusing')
    out = text.replace(old, new)
    open(path, 'w').write(out)
    if new and new not in open(path).read():
        raise SystemExit(f'docpatch: wrote {path} but the new text is absent')
    return n


def main():
    path = sys.argv[1]
    blob = sys.stdin.read()
    if '\n+++ ' not in blob or not blob.startswith('--- '):
        raise SystemExit('docpatch: expected "--- old" then "+++ new"')
    old, new = blob[4:].split('\n+++ ', 1)
    n = patch(path, old.rstrip('\n'), new.rstrip('\n'))
    print(f'docpatch: {path} — {n} replacement applied and verified')


if __name__ == '__main__':
    main()
