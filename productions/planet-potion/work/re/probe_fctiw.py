import struct, sys
sys.path.insert(0, '.')
import runsynth as R
# After the whole part-one generator, r2+0x2a62 holds the last float2int's
# `stfd` of the fctiw result: 8 bytes, of which the code only reads the low 4.
out, err = R.run(R.GEN1, R.R2 + 0x2a62, 8, timeout=2400)
print('bytes:', out.hex(), 'err:', err[:200])
if len(out) == 8:
    hi, lo = struct.unpack('>II', out)
    print(f'  high word {hi:#010x}   low word {lo:#010x} ({struct.unpack(">i", out[4:])[0]})')
    print(f'  as double: {struct.unpack(">d", out)[0]!r}')
