/** Scene clock recovered from Wonder's 0x40f9a0 render method. */
export function wonderBubblebathFrame(localTime) {
  const time = Math.fround(localTime);
  // x87: FLDS localTime, FMULL 0x4336a8 (1.53), FPREM by 64, FSTPS.
  const remainder = (time * 1.53) % 64;
  return Math.fround(remainder < 0 ? remainder + 64 : remainder);
}
