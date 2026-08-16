"""Run the softsynth and dump the DigiBooster module it builds in memory.

The generators take the destination in r5 (_music_buffer). Afterwards the demo
sets _module to that same buffer and hands it to dbplayer.library through the
68K side, so what these functions emit is not raw samples — it is a complete
DBM0 module, IFF chunks and all.
"""
import struct, os, sys, subprocess
import ppcrun as H
H.FLAT=FLAT=(sys.argv[1] if len(sys.argv)>1 else 'flat')
BASE=0x10000000; R2=BASE+0x7FFE
ABSENT=77
def _load(path):
    """The segment dump, or None.

    IMPORTING THIS MODULE MUST NOT DIE when flat/ is missing. It used to read
    the dump at module level with a bare open(), so `import runsynth` raised
    FileNotFoundError from inside the import machinery — which meant every
    importer's own "the binary is not here" handling was unreachable, because
    the traceback happened before its main() ever ran. synthhash.py's was.

    Behaviour is unchanged when the file exists; only the missing case differs,
    and it now reaches the callers below."""
    try:
        return open(os.path.join(path,'seg0_CODE_10000000.bin'),'rb').read()
    except FileNotFoundError:
        return None
d0=_load(FLAT)
def _need():
    if d0 is None:
        print(f'runsynth: no segment dump under {FLAT!r} — see speccheck.py for '
              'the rehydration steps.', file=sys.stderr)
        raise SystemExit(ABSENT)
def g(d):
    _need()
    return struct.unpack_from('>I',d0,R2+d-BASE)[0]
GEN1=0x10006b6c; GEN3=0x10006da0; SET_ALLOC=0x10006b14
def setflat(path):
    """Point the module at a different flat/ (showorder.py imports us)."""
    global FLAT, d0
    FLAT=H.FLAT=path
    d0=_load(path)
    _need()
def module(part, n=0x40000, timeout=2400):
    """Generate one part's DBM0 module. n need only cover the chunks you want:
    NAME through PATT is under 20 KB, SMPL is megabytes.

    The generous timeout is not caution — part one's synth builds 5.3 MB of
    samples under qemu and takes minutes. With the default 300s it returns an
    empty buffer, which then fails much later as 'not a DBM0 module'."""
    out,_=run(GEN1 if part=='p1' else GEN3, g(0x2886), n, timeout=timeout)
    return out
ARENA=0x20340000
def stw(s,a,d): return (36<<26)|(s<<21)|(a<<16)|(d&0xFFFF)
def run(target, dump_addr, dump_len, timeout=300):
    c=[]
    c+=H.load32(1,H.STACK); c+=H.load32(2,R2); c+=H.load32(13,H.STACK-0x1000)
    c+=H.load32(3,ARENA)+H.call32(12,SET_ALLOC)
    c+=H.load32(5,g(0x2886))          # r5 = _music_buffer, the destination
    c+=H.call32(12,target)
    c+=H.load32(4,dump_addr)+H.load32(5,dump_len)
    c+=[H.li(0,4),H.li(3,1),H.sc()]
    c+=[H.li(0,1),H.li(3,0),H.sc()]
    stub=b''.join(struct.pack('>I',w) for w in c)
    pieces=H.segments(FLAT)
    pieces.append((H.SCRATCH,stub,0x00600000))
    EH,PH,AL=52,32,0x1000; blob=b''; loads=[]; cur=EH+PH*len(pieces)
    for va,data,msz in pieces:
        if data is None: loads.append((va,0,msz,0,6)); continue
        blob+=b'\0'*((-(cur+len(blob)))%AL)
        loads.append((va,len(data),max(msz,len(data)),cur+len(blob),7)); blob+=data
    eh=(b'\x7fELF'+bytes([1,2,1,0])+b'\0'*8+struct.pack('>HHIIIIIHHHHHH',2,20,1,H.SCRATCH,EH,0,0,EH,PH,len(pieces),0,0,0))
    phs=b''.join(struct.pack('>IIIIIIII',1,off,va,va,f,m,fl,AL) for va,f,m,off,fl in loads)
    open('/tmp/pp-synth.elf','wb').write(eh+phs+blob); os.chmod('/tmp/pp-synth.elf',0o755)
    try:
        p=subprocess.run(['/usr/bin/qemu-ppc-static','/tmp/pp-synth.elf'],capture_output=True,timeout=timeout)
        return p.stdout,p.stderr.decode('utf8','replace')
    except subprocess.TimeoutExpired:
        return b'','TIMEOUT'
if __name__=='__main__':
    MB=g(0x2886)
    print(f'_music_buffer = {MB:#010x}')
    for name,tgt in (('_generate_samples_part1',GEN1),('_generate_samples_part3',GEN3)):
        out,err=run(tgt, MB, 0x200000)
        nz=sum(1 for b in out if b) if out else 0
        print(f'{name}: {len(out)} bytes dumped, {nz} non-zero  {err.strip()[:80]}')
        if out and nz:
            # find the extent of written data
            last=max(i for i,b in enumerate(out) if b)
            print(f'   data runs to offset {last:#x} ({last/1024:.0f} KB)')
            s=struct.unpack('>'+'h'*32, out[:64])
            print(f'   first 32 as s16be: {s[:16]}')
            print(f'   first 32 as s8   : {[b-256 if b>127 else b for b in out[:16]]}')
            open(f'{name}.raw','wb').write(out[:last+1])
