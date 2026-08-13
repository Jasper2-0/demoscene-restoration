// eff46 — end logo recede + fade (FUN_00405d70, re-derived from disassembly
// at 0x405d70; the Ghidra decompile had conflated the color and quad values
// and lost the shrink entirely — x87 stack tracking recovers two values:
//
//   u = trunc(t · 0.625)                       [0x41a4f8]
//   color v = clamp(3 − u·6.6666667e-5, 0, 1)  [0x41a4f0], [0x41a800]
//   inset m = u·1.9999999e-5 − 0.5             [0x41a7fc], [0x41a308]
//   quad (m, m, 1−2m, 1−2m), skipped once 1−2m < 0
//
// So the gizmozone "Aardbei" logo starts at 2x zoom (cropped), passes exact
// fullscreen at u=25000, and keeps receding toward the screen center while
// the color holds white ~12 s then fades — additive, drawn twice.
export function makeEffect(R) {
  return {
    render(t) {
      const u = Math.trunc(t * 0.625);
      const size = 1 - 2 * (u * 1.9999999e-5 - 0.5);
      if (size < 0) return;
      let v = 3 - u * 6.6666667e-5;
      if (v > 1) v = 1; else if (v < 0) v = 0;
      const m = u * 1.9999999e-5 - 0.5;
      const mgl = R.mgl, gl = R.gl;
      mgl.enableDepthTest(false);
      mgl.enableBlend(true);
      gl.blendFunc(gl.ONE, gl.ONE);
      mgl.enableTexture(true);
      mgl.bindTexture(R.textures[2]); // gizmozone2.atg
      mgl.color4(v, v, v, 1);
      R.orthoQuad(m, m, size, size);
      R.orthoQuad(m, m, size, size);
      mgl.color4(1, 1, 1, 1);
      mgl.enableBlend(false);
      mgl.enableTexture(false);
      mgl.enableDepthTest(true);
    },
  };
}
