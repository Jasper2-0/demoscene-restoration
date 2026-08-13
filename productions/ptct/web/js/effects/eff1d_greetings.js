// 0x1D greetings typewriter (18:00 -> 22:00, layer 7).
// Ported from: init FUN_004017e0 (ptct.c 230), render FUN_004019eb (ptct.c
// 325), quad helper FUN_0040192c (ptct.c 299).
// Instead of rasterizing Courier New 16px through GDI at init, we load the
// pre-baked 512x16 strips from assets/text/ (manifest.json: greets[] +
// lineLens[] = the original strlen values) — see API.md.
// Layout constants from .rdata: 0x41a3b8=0.05f (x), 0x41a3b4=0.045f (height),
// 0x41a3bc=0.015625f (1/64 per char, used as BOTH width and u_max),
// 0x41a3c0=0.78 (d, top y), 0x41a3c8=0.04 (d, line step).
// Render: additive blend, chars = t/600 (1 char per 150 ms), each line drawn
// with width/u = chars/64 then chars -= strlen(line) — a sequential
// typewriter down the 17 lines. chars/64 > 1 runs off-screen right (REPEAT
// wrap is invisible), exactly like the original.

export function makeEffect(R) {
  let texs = null;   // 17 GL textures (the original's this[0x304..])
  let lens = null;   // 17 strlen values (this[0x404..])

  return {
    init() {
      // async: start loading; render() no-ops until everything arrived
      // (init() is synchronous in main.js, mirroring scriptLoad).
      fetch('assets/text/manifest.json')
        .then((r) => r.json())
        .then((man) => Promise.all(
          man.greets.map((name) => new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = `assets/text/${name}`;
          })),
        ).then((imgs) => {
          const t = imgs.map((img) => R.mgl.createTextureFromImage(img, false, false));
          lens = man.lineLens;
          texs = t; // publish last
        }))
        .catch((e) => console.error('eff1D: text strips failed to load', e));
    },

    // FUN_004019eb — t in layer ticks
    render(t /* , pos */) {
      if (!texs) return;
      const mgl = R.mgl, gl = R.gl;
      // FUN_00412410 ortho push is folded into R.orthoQuad; blend additive
      mgl.enableBlend(true);
      gl.blendFunc(gl.ONE, gl.ONE);
      mgl.enableTexture(true);
      mgl.color4(1, 1, 1, 1);
      // uint division of integer ticks
      let chars = Math.floor(Math.floor(t) / 600);
      for (let i = 0; i < 17; i++) {
        if (chars > 0) {
          mgl.bindTexture(texs[i]);
          const w = chars * 0.015625; // width == u_max (FUN_0040192c)
          R.orthoQuad(0.05, 0.78 - i * 0.04, w, 0.045, 0, 0, w, 1);
        }
        chars -= lens[i]; // unconditional, like the original
      }
      // depth state deliberately untouched (the original never disables it
      // here; the ortho quad sits at eye z=-0.1 and wins against the 3D
      // scene's compressed depth range)
      mgl.enableBlend(false);
      mgl.enableTexture(false);
    },
  };
}
