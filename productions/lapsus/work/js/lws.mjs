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
      case 'SolidBackdrop': scene.backdrop.solid = Number(rest[0]); break;
      case 'ZenithColor': case 'SkyColor': case 'GroundColor': case 'NadirColor':
        scene.backdrop[kw[0].toLowerCase() + kw.slice(1)] = rest.map(Number); break;
      default:
        if (current && /^[A-Z]/.test(kw)) current.props[kw] = rest.join(' ');
        else if (/^[A-Z]/.test(kw)) scene.unhandled.push(l);
    }
  }
  // resolve ParentItem indices (LWSC v3: index into all-items parse order, 1-based
  // per type nibble in newer versions — here plain integers; keep raw + resolved)
  for (const it of items) {
    if (it.parent != null) {
      const idx = Number(it.parent);
      it.parentItem = Number.isFinite(idx) && items[idx - 1] ? items[idx - 1] : null;
    }
  }
  return scene;
}

// TCB (Kochanek-Bartels) envelope evaluation — the only span type Lapsus uses.
// Behaviors "1 1" (Reset): before the first key / after the last, hold 0? —
// LightWave "Reset" returns the envelope to 0 outside the keyed range; VERIFY
// against the engine's own evaluator (dm2000 may clamp instead) before
// trusting edges. Marked as the current assumption, not fact.
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
  const prev = K[s - 1] ?? k0, nxt = K[s + 2] ?? k1;
  const tan = (k, a, b, sign) => {
    const f = (1 - k.ten) * (1 + sign * k.con) * (1 + sign * k.bia) / 2;
    const g = (1 - k.ten) * (1 - sign * k.con) * (1 - sign * k.bia) / 2;
    return f * a + g * b;
  };
  const d0 = tan(k0, k0.v - prev.v, k1.v - k0.v, 1);
  const d1 = tan(k1, k1.v - k0.v, nxt.v - k1.v, -1);
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k0.v + (u3 - 2 * u2 + u) * d0
       + (-2 * u3 + 3 * u2) * k1.v + (u3 - u2) * d1;
}

// Motion channel order in every Lapsus scene: px py pz  h p b  sx sy sz.
export const CHANNELS = ['px', 'py', 'pz', 'h', 'p', 'b', 'sx', 'sy', 'sz'];
