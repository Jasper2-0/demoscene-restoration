# Haujobb PC productions 1999–2003 — provenance dossier

Compiled 2026-08-19 from the Demozoo API (releaser id 4 = Haujobb), pouet.net,
files.scene.org directory listings, and the shipped file_id.diz / .nfo /
infofile texts inside the local unpacked trees under `originals/haujobb/`.

**The local dirs are UNPACKED trees, not release archives.** The repo's
manifest convention (`originals[]` in prod.json, consumed by
`tools/fetch/originals.mjs`) points at the *archive* on files.scene.org.
Every archive→dir mapping below is therefore **UNVERIFIED until the archive is
fetched, sha256-hashed, and its extraction diffed against the local tree**.
No archive hashes are invented here: `sha256`/`bytes` are null in the drafts;
`originals.mjs` pins them on first fetch. HTTP `Content-Length` values below
are corroboration only, read from `files.scene.org/get/` HEAD responses.

## All Haujobb PC (Windows) productions 1999–2003

Demos first, then intros/other. "local" = present under `originals/haujobb/`.

| title | type | date | party (rank) | dz | pouet | local |
|---|---|---|---|---|---|---|
| Generation Zero | demo | 1999-09-17 | — | 225 | — | no |
| Mikrostrange | demo | 2000-04-23 | MS2000 PC Demo (2) | 23701 | 1092 | **yes** (hjb_mifi) |
| Strange Feelings | demo | 2000-04-23 | MS2000 | 9226 | — | no |
| Art | demo | 2000-08-05 | Assembly 2000 Combined Demo (2) | 230 | 125 | **yes** (hjb_artf, final) |
| Moments | demo | 2000-12-28 | The Party 2000 PC Demo (4) | 259 | 1237 | **yes** (moments) |
| Mosaik | demo | 2001-04-15 | MS2001 PC Demo (2) | 24897 | 1959 | **yes** (mosaik) |
| Kosmiset Avaruus Sienet | demo | 2001-06-16 | — | 22378 | — | no |
| (We Took The) Greenpill | demo | 2001-08-04 | Assembly 2001 | 25848 | — | no |
| E-Strange | demo | 2001-11-03 | Lobotomia? | 39665 | — | no |
| Elements | demo | 2001-12-28 | The Party 2001 Demo (1) | 8975 | 4776 | **yes** (hjb_elef, final) |
| Channel 5 Sequence | demo | 2002-03-31 | MS2002 PC Demo (4) | 26203 | 5591 | **yes** (channel/Satellite) |
| Liquid... Wen? | demo | 2002-08-03 | Assembly 2002 Combined Demo (1, WINNER) | 31629 | 7130 | **yes** (hjb_liqu) |
| Epilog | demo | 2002-08-31 | Assembly 2002? / — | 20096 | — | no |
| We Are | demo | 2002-12-14 | State of the Art 2002 Demo (7) | 56947 | 8281 | **yes** (hjb_we) |
| Genoaux | demo | 2003-01-11 | Alternative Party 2003 Alt Demo (17, tie) | 63983 | 8528 | **yes** (hjb_geno) |
| Discloned | 64k | 1999-08-28 | — | 222 | — | no |
| Fukwit Daddy | 64k | 1999-12-29 | The Party 1999 | 224 | — | no |
| Dead Cells | 64k | 2000-01-23 | — | 255 | — | no |
| Unet Sydämen Ajatuksia | 64k | 2000-02-29 | — | 22379 | — | no |
| Chillin | 64k | 2000-05-13 | — | 231 | — | no |
| Dead Flowers | 64k | 2000-08-09 | Assembly 2000 | 84 | — | no |
| Shrooms | 64k | 2000-08-12 | — | 46739 | — | no |
| Funkkin | 64k | 2000-08-26 | — | 256 | — | no |
| Die Dimensionsfalte 2001 | 64k | 2001-04-15 | MS2001 | 25091 | — | no |
| Mother, Mother, My Eyes Hurt! | 64k | 2001-11-11 | — | 2859 | — | no |
| Mother Mother, Fuckwit Daddy | 64k | 2002-03-31 | MS2002 | 26239 | — | no |
| Orbitalism | 64k | 2002-08-31 | Assembly 2002 | 20102 | — | no |
| Fr-034/Hjb-104: Time Index | 64k | 2003-11-08 | (w/ Farbrausch) | 66914 | — | no |
| Evoke 2000 Invitation | invite | 2000-03 | — | 8455 | — | no |
| RADWAR Party Invitation | invite | 2000-05-11 | — | 8359 | — | no |
| Lobotomia 2002 Invitation | invite | 2001-11-03 | — | 39674 | — | no |
| Evoke 2000 Votingdisk | votedisk | 2000-08 | — | 8480 | — | no |
| Mindgate | slideshow | 2000-08 | — | 106379 | — | no |
| Discloned Remix | intro | 2001-07-01 | — | 57334 | — | no |

(Non-Windows 1999–2003 work — Amiga, PSX, PS2, Dreamcast, C64, Mac, Flash,
browser, MS-Dos, videos, diskmags — exists on Demozoo and is out of scope for
this Windows-PC dossier; ids are in `api/prods_0.json` beside this file.)

Party rankings not filled for the "no" rows were not researched; dz id is
enough to recover them.

---

## Per-production blocks (held locally)

Common facts: group **Haujobb** (Demozoo releaser 4, https://demozoo.org/groups/4/),
platform Windows. "Local tree" bytes exclude `.DS_Store`.

### 1. Mikrostrange — `originals/haujobb/hjb_mifi/`
- demozoo **23701**, pouet **1092**, released **2000-04-23**
- **Mekka & Symposium 2000, PC Demo compo, 2nd** (score 238)
- Credits (Demozoo, agrees with mikro.nfo): Hellfire (code/special fx), Cynic
  (code/engine), raytrayza (music), Acryl (graphics), Amoc (gfx, 3d), Bolek
  (gfx, 3d — nfo: modelling and animation, "bolek/dreamdealers")
- Local tree: 86 files, 11,107,037 bytes. `mikro-fullscreen.exe` 106,496
  sha256 f1cb47fd…, `mikro-window.exe` 106,496 sha256 9e03067a…
- Archive (UNVERIFIED): **hjb_mifi.zip** —
  https://files.scene.org/get/demos/groups/haujobb/hjb_mifi.zip (CL 7,300,663).
  diz says "slightly fixed version" ⇒ this group-dir final, not the party
  archive hjb_mist.zip (CL 7,304,665). `hjbmikro.zip` in the same dir lists
  at the same 6.96M and may be a duplicate.
- Capture candidate: https://www.youtube.com/watch?v=MK32d-pkIIw (Demozoo-linked)
- Confidence: identity certain (diz+nfo name it); archive mapping high but unhashed.

### 2. Moments — `originals/haujobb/moments/`
- demozoo **259**, pouet **1237**, released **2000-12-28**
- **The Party 2000, PC Demo compo, 4th**
- Credits: Cynic (code/engine), Hellfire (code/support), Visualice (gfx),
  Janne (gfx, 3d), Jazz (music), Kimmo (text)
- Local tree: 87 files, 14,948,646 bytes. `Moments.exe` 397,312 sha256 7cdbe5e1…
- Archive (UNVERIFIED): **moments.zip** —
  https://files.scene.org/get/parties/2000/theparty00/demo/moments.zip
  (CL 9,139,970). Party archive; local scene.org insert fits it. No group-dir final.
- Capture candidate: https://www.youtube.com/watch?v=4dvcvWPOnq4
  ("Haujobb - Moments (2000) [60fps]") — found by search, NOT Demozoo-linked;
  verify before pinning.
- Confidence: identity certain (diz: "haujobb / moments / tp10 / pc demo").

### 3. Mosaik — `originals/haujobb/mosaik/`
- demozoo **24897**, pouet **1959**, released **2001-04-15**
- **Mekka & Symposium 2001, PC Demo compo, 2nd** (score 147)
- Credits: Cynic (code/3d engine), Hellfire (code), Visualice (gfx/modelling
  + direction), Janne (gfx, additional modelling), Radix (music)
- Local tree: 101 files, 11,238,047 bytes. `Mosaik/Mosaik.exe` 389,120
  sha256 65e3400a…
- Archive (UNVERIFIED): **mosaik.zip** —
  https://files.scene.org/get/parties/2001/mekkasymposium01/demo/mosaik.zip
  (CL 7,085,327). Local ms2001.nfo is the party-organizer insert ⇒ party archive.
- Capture candidate: https://www.youtube.com/watch?v=YHrF6E8fujw (Demozoo-linked)
- Confidence: identity certain; archive mapping high but unhashed.

### 4. Art (final) — `originals/haujobb/hjb_artf/`
- demozoo **230**, pouet **125**, released **2000-08-05**
- **Assembly 2000, Combined Demo compo, 2nd** (score 3621)
- Credits: Cynic (code/3d engine), Droid (code, additional), Visualice (gfx),
  Janne (gfx, 3d), Melwyn (music), SolarC (music/sfx), Hellfire (support)
- Local tree: 75 files, 10,430,075 bytes. `Art-final.exe` 344,064 sha256 88eab510…
- Archive (UNVERIFIED): **hjb_artf.zip** —
  https://files.scene.org/get/demos/groups/haujobb/hjb_artf.zip (CL 6,524,789).
  Dir name + "final version" diz ⇒ group-dir final. Party copies:
  assembly00/demo/art_by_h.zip and art_do_n.zip — not the version on disk.
- Capture candidate: https://www.youtube.com/watch?v=Kj2BNGvh8aQ (Demozoo-linked)
- Confidence: identity certain; archive mapping high but unhashed.

### 5. Elements (final) — `originals/haujobb/hjb_elef/`
- demozoo **8975**, pouet **4776**, released **2001-12-28** (party); local
  final exe dated 2002-03 (matches the caller's clue)
- **The Party 2001, Demo compo, 1st — WINNER** (score 335)
- Credits: Cynic, Hellfire, Droid (code), Visualice (gfx), Virgill (music),
  Tasium (music, feat.)
- Local tree: 2 files, 7,626,871 bytes. Single self-contained `elements.exe`
  7,626,752 sha256 179f2200…
- Archive (UNVERIFIED): **hjb_elef.zip** —
  https://files.scene.org/get/demos/groups/haujobb/hjb_elef.zip (CL 7,370,388).
  Dir name + "final version" diz ⇒ group-dir final; party hjb_elem.zip is the
  compo copy.
- Capture candidate: https://www.youtube.com/watch?v=Kbhe_mUdCbQ (Demozoo-linked)
- Confidence: identity certain; archive mapping high but unhashed.

### 6. Channel 5 Sequence — `originals/haujobb/channel/Satellite/`  ← identity resolved
- demozoo **26203**, pouet **5591**, released **2002-03-31**
- **Mekka & Symposium 2002, PC Demo compo, 4th** (score 110)
- Credits: Cynic (code), Droid (code), Visualice (gfx), Radix (music)
- Local tree: 49 files, 6,048,722 bytes. `morning.exe` 425,984 sha256
  6399c4b6…; `data.rar` 1,127,164 sha256 f7446270… — the tree holds BOTH
  data.rar and an unpacked Data/, so one was extracted by hand.
- **"Satellite" and "morning.exe" match no Haujobb title** — working names.
  Textures (Channels.jpg, Broadcast.jpg, P01–P07) + MS2002-dated files +
  Demozoo's MS2002 entry pin it as Channel 5 Sequence.
- Archive (UNVERIFIED — weakest mapping of the nine): most likely
  **channel.zip** —
  https://files.scene.org/get/parties/2002/mekkasymposium02/demo/shown/channel.zip
  (CL 5,141,362; local scene.org insert dated 2002-04-01 fits the party upload).
  Alternative: **hjb_ch5s.zip** —
  https://files.scene.org/get/demos/groups/haujobb/hjb_ch5s.zip (CL 5,136,121),
  a near-identical-size group-dir copy. Fetch BOTH and diff.
- Capture candidate: https://www.youtube.com/watch?v=gvMMxRH-8JU (Demozoo-linked;
  a second upload rphZ61YohWg also exists)
- Confidence: identity high (indirect but convergent); archive mapping medium.

### 7. Liquid... Wen? — `originals/haujobb/hjb_liqu/`
- demozoo **31629**, pouet **7130**, released **2002-08-03**
- **Assembly 2002, Combined Demo compo, 1st — WINNER** (score 3141)
- Credits: Cynic (code/3d engine), Droid (code), Visualice (gfx), Vic (music),
  Kimmo S. (music)
- Local tree: 119 files, 13,053,923 bytes. `liquid.exe` 430,080 sha256
  e8274c76…; `liquid.wen` is a RAR data container (1,977,625 bytes), not text.
- Archive (UNVERIFIED): **hjb_liqu.zip** —
  https://files.scene.org/get/demos/groups/haujobb/hjb_liqu.zip (CL 11,764,608).
  infofile.txt: "somekind of prebugfixed version released in hurry after the
  party" ⇒ this post-party upload, not the compo archive
  (assembly02/demo/liquid____wen__by_haujobb.zip). A promised "final" —
  if it ever shipped — is not in the group dir.
- Capture candidate: https://www.youtube.com/watch?v=BIEdt7EqyCo (Demozoo-linked)
- Confidence: identity certain; archive mapping high but unhashed.

### 8. We Are — `originals/haujobb/hjb_we/`
- demozoo **56947**, pouet **8281**, released **2002-12-14**
- **State of the Art 2002 (Tourcoing, FR), Demo compo, 7th** (score 5.38)
- Credits: Cynic, Droid, Hellfire (code), Visualice (gfx), Xhale (music).
  (Local diz adds "gang-bang" to the nick list; Demozoo does not credit it.)
- Local tree: 3 files, 8,980,531 bytes. Single self-contained `WE_ARE.EXE`
  8,978,432 sha256 0ec7e53c…
- Archive (UNVERIFIED): **hjb_we.zip** — party and group-dir copies report
  identical CL 8,747,689:
  https://files.scene.org/get/parties/2002/sota02/demo/hjb_we.zip and
  https://files.scene.org/get/demos/groups/haujobb/hjb_we.zip
- Capture candidate: https://www.youtube.com/watch?v=bu0S_b82jvg (Demozoo-linked)
- Confidence: identity certain; archive mapping high (single candidate) but unhashed.

### 9. Genoaux — `originals/haujobb/hjb_geno/`  ← date corrected
- demozoo **63983**, pouet **8528**, released **2003-01-11** — NOT 2002-11.
  The scene.org stamp 2003-01 was right: **Alternative Party 2003** (Helsinki,
  2003-01-10..12), **Alternative Demo compo, 17th (tied; Demozoo position 18)**
- Credits: Cynic (code), Droidi (= Droid, code), Visualice (direction),
  Xhale (music — track "mouthwash" per pouet)
- Local tree: 23 files, 5,912,387 bytes. `Genoaux.exe` 425,984 sha256 1a6e933b…
- Archive (UNVERIFIED): **hjb_geno.zip** — party and group-dir copies report
  identical CL 5,043,798:
  https://files.scene.org/get/parties/2003/altparty03/demo/hjb_geno.zip and
  https://files.scene.org/get/demos/groups/haujobb/hjb_geno.zip
- Capture candidate: https://www.youtube.com/watch?v=6xZLjlROah0 (pouet-linked;
  Demozoo lists none)
- Confidence: identity certain; archive mapping high but unhashed.

---

## Next actions (matches repo tooling)

1. Copy a draft from `10-prodjson-drafts.json` into
   `productions/<slug>/prod.json` (or scaffold via
   `node tools/fetch/scaffold.mjs <demozoo-id> --slug <slug>` and merge).
2. `node tools/fetch/originals.mjs <slug>` — fetches the archive against the
   null sha256 and **pins hash + bytes** into the manifest.
3. Diff the archive's extraction against the local unpacked tree to confirm the
   mapping (the channel/Satellite case needs both candidate archives).
4. Fetch the capture (`tools/fetch/capture.mjs`) and measure alignmentOffsetMs.
