// lws.mjs — parser for the LightWave Scene (LWSC v3, text) files in Lapsus.dat.
//
// Scope: exactly what the 23 shipped scenes use (see re/LWS_INVENTORY.md) —
// LoadObjectLayer + ObjectMotion, AddLight/LightMotion, AddCamera/CameraMotion,
// ParentItem hierarchies, 9-channel envelopes (px py pz  h p b  sx sy sz),
// TCB keys ("Key v t spantype te co bi in out ??"), Behaviors, fog, backdrop,
// zoom. Anything outside that vocabulary is collected verbatim into
// `unhandled` so nothing the player might need can vanish silently.
//
// Envelope keys: LWSC v3 `Key <value> <time> <spantype> <p1..p6>`; every key
// in Lapsus is spantype 0 = TCB (Kochanek-Bartels), and every envelope ends
// `Behaviors 1 1` (pre/post = Reset). Evaluation lives in evalEnvelope().

export function parseLWS(text) {
  const lines = text.split(/\r?\n/);
  let i = 0;
  const peek = () => lines[i] ?? null;
  const next = () => lines[i++] ?? null;

  const scene = {
    version: null, firstFrame: 0, lastFrame: 0, fps: 30,
    objects: [], lights: [], cameras: [], fog: {}, backdrop: {}, unhandled: [],
  };
  let current = null;          // the item receiving Motion/settings
  const items = [];            // parse-order item list — ParentItem indexes into this

  const parseEnvelope = () => {
    // cursor sits after a "{ Envelope"-opening line? In LWSC v3 the block is:
    //   Channel N \n { Envelope \n  <nkeys> \n  Key ... \n  Behaviors a b \n }
    const env = { keys: [], behaviors: [1, 1] };
    while (i < lines.length) {
      const l = next().trim();
      if (l.startsWith('Key ')) {
        const n = l.slice(4).trim().split(/\s+/).map(Number);
        // v t spantype p1..p6 — TCB params are p1=tension p2=continuity p3=bias
        env.keys.push({ v: n[0], t: n[1], span: n[2], ten: n[3], con: n[4], bia: n[5], p: n.slice(6) });
      } else if (l.startsWith('Behaviors')) {
        env.behaviors = l.split(/\s+/).slice(1).map(Number);
      } else if (l === '}') break;
    }
    return env;
  };

  const parseMotion = () => {
    const motion = [];
    const nchan = Number(next().trim().split(/\s+/)[1] ?? 0); // "NumChannels 9"
    for (let c = 0; c < nchan; c++) {
      while (i < lines.length && !peek().trim().startsWith('Channel')) i++;
      next();                                   // "Channel c"
      while (i < lines.length && !peek().includes('Envelope')) i++;
      next();                                   // "{ Envelope"
      next();                                   // key count (redundant)
      motion.push(parseEnvelope());
    }
    return motion;
  };

  while (i < lines.length) {
    const raw = next();
    const l = raw.trim();
    if (!l) continue;
    const [kw, ...rest] = l.split(/\s+/);
    switch (kw) {
      case 'LWSC': scene.version = Number(next()); break;
      case 'FirstFrame': scene.firstFrame = Number(rest[0]); break;
      case 'LastFrame': scene.lastFrame = Number(rest[0]); break;
      case 'FramesPerSecond': scene.fps = Number(rest[0]); break;
      case 'LoadObjectLayer': {
        current = { kind: 'object', layer: Number(rest[0]), file: rest.slice(1).join(' '),
          motion: null, parent: null, show: null, props: {} };
        scene.objects.push(current); items.push(current);
        break;
      }
      case 'AddNullObject': {
        // Null objects carry motions other items parent to (9 scenes use
        // them). Without this case their ObjectMotion would attach to the
        // PREVIOUS item — silently corrupting it.
        current = { kind: 'null', layer: null, file: null, name: rest.join(' '),
          motion: null, parent: null, show: null, props: {} };
        scene.objects.push(current); items.push(current);
        break;
      }
      case 'Plugin': {
        // Only empty ".BRDF" MasterHandler stubs ship in Lapsus — consume to
        // EndPlugin and keep the text in case that ever changes.
        const plug = [l];
        while (i < lines.length && !peek().trim().startsWith('EndPlugin')) plug.push(next().trim());
        next();
        scene.unhandled.push(plug.join(' | '));
        break;
      }
      case 'AmbientColor': scene.ambientColor = rest.map(Number); break;
      case 'AmbientIntensity': scene.ambientIntensity = Number(rest[0]); break;
      case 'AddLight': {
        current = { kind: 'light', name: null, type: null, color: null, intensity: null,
          motion: null, parent: null, props: {} };
        scene.lights.push(current); items.push(current);
        break;
      }
      case 'AddCamera': {
        current = { kind: 'camera', name: null, zoom: null, motion: null, parent: null, props: {} };
        scene.cameras.push(current); items.push(current);
        break;
      }
      case 'ObjectMotion': case 'LightMotion': case 'CameraMotion':
        if (current) current.motion = parseMotion(); break;
      case 'ParentItem': if (current) current.parent = rest[0]; break;
      case 'ShowObject': if (current) current.show = rest.map(Number); break;
      case 'LightName': if (current) current.name = rest.join(' '); break;
      case 'LightType': if (current) current.type = Number(rest[0]); break;
      case 'LightColor': if (current) current.color = rest.map(Number); break;
      case 'LightIntensity': if (current) current.intensity = Number(rest[0]); break;
      case 'CameraName': if (current) current.name = rest.join(' '); break;
      case 'ZoomFactor': if (current?.kind === 'camera') current.zoom = Number(rest[0]); break;
      case 'FogType': scene.fog.type = Number(rest[0]); break;
      case 'FogMinDist': scene.fog.minDist = Number(rest[0]); break;
      case 'FogMaxDist': scene.fog.maxDist = Number(rest[0]); break;
      case 'FogColor': scene.fog.color = rest.map(Number); break;
      // BackdropColor is the one the ENGINE reads (it is a string constant in
      // Lapsus.exe); it is the clear colour, and the fog colour when
      // BackdropFog is set. 3 of the 23 scenes carry a non-black value —
      // higherbiing, kuubiotekniikka and silli — so ignoring it clears those
      // to black incorrectly.
      // BGImage is the scene's BACKDROP IMAGE, and its argument is a nested
      // block rather than a value on the same line:
      //     BGImage
      //     { Clip
      //       { Still
      //         "data/lwo/textures/eHollow.jpg"
      //       }
      //     }
      // Six scenes use it, and it is a large part of what they look like —
      // pene's is the "A MATUREFURK production" title card, kuubiotekniikka's
      // is the portrait the cubes fly over. A first-token keyword scan makes
      // this look like a bare keyword with no argument, which is exactly the
      // mistake that hid it.
      case 'BGImage': {
        const block = [];
        let depth = 0;
        while (i < lines.length) {
          const t = next().trim();
          depth += (t.match(/\{/g) ?? []).length - (t.match(/\}/g) ?? []).length;
          block.push(t);
          if (depth <= 0 && block.length > 1) break;
        }
        const m = block.join(' ').match(/"([^"]+)"/);
        if (m) scene.backdropImage = m[1];
        break;
      }
      case 'BackdropColor': scene.backdrop.color = rest.map(Number); break;
      case 'BackdropFog': scene.backdrop.fog = Number(rest[0]); break;
      // Parsed for completeness, but NOT present in the binary, so the engine
      // cannot be using them: a gradient backdrop never renders here.
      case 'SolidBackdrop': scene.backdrop.solid = Number(rest[0]); break;
      case 'ZenithColor': case 'SkyColor': case 'GroundColor': case 'NadirColor':
        scene.backdrop[kw[0].toLowerCase() + kw.slice(1)] = rest.map(Number); break;
      default:
        if (current && /^[A-Z]/.test(kw)) current.props[kw] = rest.join(' ');
        else if (/^[A-Z]/.test(kw)) scene.unhandled.push(l);
    }
  }
  // Resolve ParentItem. LWSC v3 writes an item ID in HEX with no 0x prefix:
  // the top nibble is the item type (1 = object, 2 = light, 3 = camera,
  // 4 = bone) and the rest is that type's 0-based index. So `10000002` is
  // object #2, NOT decimal 10,000,002 — reading it as decimal silently
  // resolves every parent to nothing, which looks like "no parenting" rather
  // than like a bug. Lapsus leans on this heavily (kuubiotekniikka parents
  // all 32 of its objects).
  const byType = { 1: scene.objects, 2: scene.lights, 3: scene.cameras };
  for (const it of items) {
    if (it.parent == null) continue;
    const id = parseInt(String(it.parent).trim(), 16);
    if (!Number.isFinite(id)) { it.parentItem = null; continue; }
    const list = byType[(id >>> 28) & 0xf];
    it.parentType = (id >>> 28) & 0xf;
    it.parentIndex = id & 0x0fffffff;
    it.parentItem = list?.[it.parentIndex] ?? null;
  }
  return scene;
}

// TCB (Kochanek-Bartels) envelope evaluation — the only span type Lapsus uses.
//
// VERIFIED from the engine (FUN_0041ab80, read out of disasm.asm because
// Ghidra dropped its float math): the key stride is 24 bytes, `t` is in
// ABSOLUTE SECONDS, the span search compares against key[i].t at offset 0,
// and there is no modulo or time scaling anywhere in the function. Edge
// behaviour is clamp, not LightWave's nominal "Reset"; the `Behaviors 1 1`
// in the files is authoring metadata the engine never reads.
//
// NOT verified from the engine: the TANGENT formula below. It is the
// standard Kochanek-Bartels construction, and the engine's asm does contain
// the (1-t)(1+-c)(1+-b) terms, but the endpoint rule here was settled
// EMPIRICALLY against the capture, not read. Do not let the confirmations
// above vouch for it — that conflation is exactly what let the endpoint bug
// survive (see METHOD.md, "verification does not spread").
export function evalEnvelope(env, t) {
  const K = env.keys;
  if (!K.length) return 0;
  if (t <= K[0].t) return K[0].v;              // assumption: clamp (see note)
  if (t >= K[K.length - 1].t) return K[K.length - 1].v;
  let s = 0;
  while (s + 1 < K.length && K[s + 1].t <= t) s++;
  const k0 = K[s], k1 = K[s + 1];
  const dt = k1.t - k0.t;
  const u = (t - k0.t) / dt;
  const prev = K[s - 1], nxt = K[s + 2];
  const tan = (k, a, b, sign) => {
    const f = (1 - k.ten) * (1 + sign * k.con) * (1 + sign * k.bia) / 2;
    const g = (1 - k.ten) * (1 - sign * k.con) * (1 - sign * k.bia) / 2;
    return f * a + g * b;
  };
  // ENDPOINT TANGENTS USE THE FULL CHORD, NOT A HALVED ONE. An interior key
  // averages the chords on either side; at the first/last key there is only
  // one chord, and it is used whole. Substituting the key itself for the
  // missing neighbour (making that chord zero) halves the end tangent and
  // turns what should be a straight ramp into an ease-in/ease-out S-curve.
  //
  // That bug is why pene appeared to have a *timing* offset: its heading is a
  // single 2-key span, 0 -> 2*PI over 12 s, which the engine plays as a
  // constant 30 deg/s. The S-curve ran slow early and caught up late, so
  // matching the capture needed +0.60 s at local t=2, +0.40 s at t=4 and
  // +0.00 s at t=6 — an "offset" that varied with t because it was never an
  // offset. With the full chord at both ends the Hermite basis degenerates to
  // exactly linear, which is what the capture shows.
  const chord = k1.v - k0.v;
  const d0 = prev ? tan(k0, k0.v - prev.v, chord, 1) : chord;
  const d1 = nxt ? tan(k1, chord, nxt.v - k1.v, -1) : chord;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k0.v + (u3 - 2 * u2 + u) * d0
       + (-2 * u3 + 3 * u2) * k1.v + (u3 - u2) * d1;
}

// Motion channel order in every Lapsus scene: px py pz  h p b  sx sy sz.
export const CHANNELS = ['px', 'py', 'pz', 'h', 'p', 'b', 'sx', 'sy', 'sz'];
