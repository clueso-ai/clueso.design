// Generate an icon without an API (round 23): compose it from parts already in the set.
//
// A prompt is read for a BASE (any drawing in site-set.js, matched by name and keywords, plain
// drawings first) and a MODIFIER (a small badge: plus, check, x, minus, AI sparkle, clue pixel,
// arrows, play, search, clock). Each pairing is tried in a few placements and every one that keeps
// the rules becomes an option:
//   Inside        the badge sits inside the base's closed shape, 2 clear of every stroke (rule 5).
//   Bottom right  the base is drawn smaller toward the top left so the badge sits 2 clear outside it.
//   Top right     the same, with the base toward the bottom left (status, AI).
//   Right         the same, badge at mid-height (Google's person_add construction).
//   …, cut        round 23: the base at full size, cut cleanly 2 units around a corner badge.
// Gaps are measured, not assumed: the base is hit-tested on a canvas with its stroke widened by the
// 2-unit gap, so any base in the set can take any badge. Browser only (needs canvas Path2D).

const IconCompose = (function () {
  const E = typeof IconEngine !== 'undefined' ? IconEngine : null;
  const SITE = typeof SITE_SET !== 'undefined' ? SITE_SET : [];
  const SW = 1.5; const GAP = 2; const LIVE = [2, 22];

  // ---- Badges: drawn about (0, 0), outer edge within ±3 at a 1.5 stroke. ------------------
  const SPARK_S = 'M0 -2.75L0.88 -0.88L2.75 0L0.88 0.88L0 2.75L-0.88 0.88L-2.75 0L-0.88 -0.88Z'; // image AI's
  const SPARK_L = 'M0 -3.75L1.25 -1.25L3.75 0L1.25 1.25L0 3.75L-1.25 1.25L-3.75 0L-1.25 -1.25Z'; // chat AI's
  const BADGES = {
    plus: { label: 'Plus', words: ['add', 'new', 'create', 'plus', 'insert'], paths: ['M0 -2.25V2.25', 'M-2.25 0H2.25'] },
    minus: { label: 'Minus', words: ['remove', 'minus', 'subtract', 'less'], paths: ['M-2.25 0H2.25'] },
    check: { label: 'Check', words: ['done', 'check', 'checked', 'approved', 'approve', 'verified', 'verify', 'complete', 'completed', 'success', 'ok', 'confirm', 'confirmed', 'ready'], paths: ['M-2.5 0L-0.75 1.75L2.5 -1.5'] },
    x: { label: 'X', words: ['close', 'delete', 'deleted', 'x', 'cancel', 'reject', 'rejected', 'error', 'failed', 'fail', 'clear'], paths: ['M-2 -2L2 2', 'M2 -2L-2 2'] },
    ai: { label: 'AI sparkle', words: ['ai', 'magic', 'smart', 'generate', 'generated', 'auto', 'assistant'], fills: [SPARK_S], inside: { fills: [SPARK_L] } },
    pixel: { label: 'Clue pixel', words: ['clue', 'live', 'active', 'status', 'highlight', 'highlighted', 'notification', 'unread', 'online', 'focus'], fills: ['M-1 -1H1V1H-1Z'] },
    up: { label: 'Arrow up', words: ['upload', 'up', 'export', 'publish', 'raise'], paths: ['M0 2.25V-2', 'M-2.25 0.25L0 -2L2.25 0.25'] },
    down: { label: 'Arrow down', words: ['download', 'down', 'import', 'save', 'lower'], paths: ['M0 -2.25V2', 'M-2.25 -0.25L0 2L2.25 -0.25'] },
    right: { label: 'Arrow right', words: ['send', 'share', 'forward', 'move', 'next', 'out'], paths: ['M-2.25 0H2', 'M-0.25 -2.25L2 0L-0.25 2.25'] },
    play: { label: 'Play', words: ['play', 'preview', 'run', 'start', 'watch'], fills: ['M-1.75 -2.5V2.5L2.25 0Z'] },
    search: { label: 'Search', words: ['search', 'find', 'lookup', 'inspect'], paths: ['M-2.5 -0.75A1.75 1.75 0 1 0 1 -0.75A1.75 1.75 0 1 0 -2.5 -0.75Z', 'M0.5 0.5L2.25 2.25'] },
    clock: { label: 'Clock', words: ['schedule', 'scheduled', 'time', 'later', 'pending', 'history', 'recent', 'timed'], paths: ['M-2.25 0A2.25 2.25 0 1 0 2.25 0A2.25 2.25 0 1 0 -2.25 0Z', 'M0 -1.25V0H1'] },
  };
  // Where a corner badge goes, and which corner of the live area the base shrinks toward.
  const SPOTS = {
    'bottom-right': { label: 'Bottom right', at: [19, 19], anchor: [2, 2] },
    'top-right': { label: 'Top right', at: [19, 5], anchor: [2, 22] },
    right: { label: 'Right', at: [19, 11], anchor: [2, 22] },
  };
  // Which spots read best for each badge (first = most natural).
  const SPOT_ORDER = {
    plus: ['inside', 'bottom-right', 'right'], minus: ['inside', 'bottom-right', 'right'], check: ['inside', 'bottom-right', 'right'],
    x: ['inside', 'bottom-right', 'right'], ai: ['inside', 'top-right'], pixel: ['inside', 'top-right'],
    up: ['inside', 'bottom-right'], down: ['inside', 'bottom-right'], right: ['inside', 'bottom-right'], play: ['inside', 'bottom-right'],
    search: ['bottom-right', 'inside'], clock: ['bottom-right', 'inside'],
  };

  // Controls and structure never act as a base (rule 21's list); badge-carrying drawings rank last.
  const NOT_BASE = /^(chevron|chevrons|arrow|plus$|minus$|close$|check|menu|more|align|text-align|transition|h[1-4]$|bold|italic|underline|strikethrough|first|last|next|previous|u-turn|turn-down|split-arrows|swap|collapse|expand|fullscreen|width|height|gap|padding|divider|drag|sort|filter|spinner)/;
  const DECORATED = /-(plus|minus|check|ai|off|add|open|done|sync|x)$/;
  const SYNONYMS = { doc: 'document', docs: 'document', page: 'file', person: 'user', people: 'users', member: 'user', account: 'user', message: 'chat', comment: 'chat', photo: 'image', picture: 'image', movie: 'video', screen: 'monitor', email: 'mail', envelope: 'mail', date: 'calendar', event: 'calendar', voice: 'mic', audio: 'waveform', camera: 'video-camera', recording: 'record', settings: 'gear', notification: 'bell', house: 'home' };

  const words = (t) => (String(t || '').toLowerCase().match(/[a-z0-9]+/g) || []);
  const plain = (w) => w.replace(/(ies)$/, 'y').replace(/(s)$/, '');

  function findBadges(ws) {
    const hits = [];
    for (const [key, b] of Object.entries(BADGES)) if (ws.some((w) => b.words.includes(w))) hits.push(key);
    return hits;
  }

  let lastScores = new Map();
  const scoreOf = (b) => lastScores.get(b) || 0;
  function findBases(ws, badgeWords) {
    const rest = ws.filter((w) => !badgeWords.has(w)).map((w) => SYNONYMS[w] || w);
    const scored = [];
    for (const s of SITE) {
      if (NOT_BASE.test(s.name) || s.fromLibrary || !s.paths) continue;
      const parts = s.name.split('-');
      let score = 0;
      for (const w of rest) {
        const p = plain(w);
        if (w === s.name || p === s.name) score += 4;
        else if (parts.includes(w) || parts.includes(p)) score += 2;
        else if ((s.keywords || []).some((k) => k === w || k === p)) score += 1;
      }
      if (!score) continue;
      if (DECORATED.test(s.name)) score -= 1.5;
      scored.push({ s, score });
    }
    scored.sort((a, b) => b.score - a.score);
    lastScores = new Map(scored.map((x) => [x.s, x.score]));
    return scored.map((x) => x.s);
  }

  // ---- Geometry -------------------------------------------------------------------------
  function transform(d, k, tx, ty) {
    const P = (p) => [p[0] * k + tx, p[1] * k + ty];
    return E.emitPath(E.parsePath(d, true).map((sp) => ({
      start: P(sp.start), closed: sp.closed,
      segs: sp.segs.map((seg) => ({
        ...seg, from: P(seg.from), to: P(seg.to),
        ...(seg.t === 'C' ? { c1: P(seg.c1), c2: P(seg.c2) } : {}),
        ...(seg.t === 'A' ? { rx: seg.rx * k, ry: seg.ry * k } : {}),
      })),
    })));
  }
  const q = (v) => Math.round(v * 4) / 4;

  let ctx = null;
  function canvas() {
    if (!ctx) { const c = document.createElement('canvas'); c.width = c.height = 4; ctx = c.getContext('2d'); }
    return ctx;
  }
  // Ink of a part as Path2D lists, for hit tests.
  const toP2 = (list) => list.map((d) => new Path2D(d));
  function inInk(part, x, y, grow) {
    const c = canvas();
    c.lineWidth = SW + 2 * grow; c.lineJoin = 'miter'; c.lineCap = 'square';
    for (const p of part.p2) if (c.isPointInStroke(p, x, y)) return true;
    for (const p of part.f2) {
      if (c.isPointInPath(p, x, y)) return true;
      if (grow) { c.lineWidth = 2 * grow; if (c.isPointInStroke(p, x, y)) return true; c.lineWidth = SW + 2 * grow; }
    }
    return false;
  }
  // Points on the badge's ink (sampled every 0.25 over its box).
  function inkPoints(part) {
    const pts = [];
    const [x0, y0, x1, y1] = part.box;
    for (let y = y0; y <= y1; y += 0.25) for (let x = x0; x <= x1; x += 0.25) if (inInk(part, x, y, 0)) pts.push([x, y]);
    return pts;
  }
  function boxOf(paths, fills) {
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const d of [...paths, ...fills]) {
      const r = E.pathBounds(E.parsePath(d, true));
      b = [Math.min(b[0], r.minX), Math.min(b[1], r.minY), Math.max(b[2], r.maxX), Math.max(b[3], r.maxY)];
    }
    return paths.length ? [b[0] - SW / 2, b[1] - SW / 2, b[2] + SW / 2, b[3] + SW / 2] : b;
  }
  function part(paths, fills) { return { paths, fills, p2: toP2(paths), f2: toP2(fills), box: boxOf(paths, fills) }; }
  function badgeAt(key, x, y, inside) {
    const b = BADGES[key]; const src = (inside && b.inside) || b;
    return part((src.paths || []).map((d) => transform(d, 1, x, y)), (src.fills || []).map((d) => transform(d, 1, x, y)));
  }
  const clear = (base, badge) => inkPoints(badge).every(([x, y]) => !inInk(base, x, y, GAP));
  // Is (x, y) inside one of the base's closed outlines?
  function enclosed(base, x, y) { const c = canvas(); return base.p2.some((p, i) => /Z\s*$/i.test(base.paths[i]) && c.isPointInPath(p, x, y)); }

  // Inside: the free spot nearest the middle of the enclosing outline, on whole or half units.
  function placeInside(base, key, big = true) {
    const [bx0, by0, bx1, by1] = base.box; const mx = (bx0 + bx1) / 2; const my = (by0 + by1) / 2;
    const spots = [];
    for (let y = 5; y <= 19; y += 0.5) for (let x = 5; x <= 19; x += 0.5) spots.push([x, y, Math.hypot(x - mx, (y - my) * 1.1) + (x % 1 ? 0.15 : 0) + (y % 1 ? 0.15 : 0)]);
    spots.sort((a, b) => a[2] - b[2]);
    for (const [x, y] of spots) {
      if (!enclosed(base, x, y)) continue;
      const badge = badgeAt(key, x, y, big);
      const [x0, y0, x1, y1] = badge.box;
      if (![[x0, y0], [x1, y0], [x0, y1], [x1, y1]].every(([px, py]) => enclosed(base, px, py))) continue;
      if (clear(base, badge)) return { base, badge };
    }
    // Too tight for the big AI sparkle: try the small one.
    return big && BADGES[key].inside ? placeInside(base, key, false) : null;
  }

  // Corner: the biggest base (scale 1 down to 0.55) that stays 2 clear of the badge.
  function placeCorner(src, key, spot) {
    const s = SPOTS[spot]; const badge = badgeAt(key, s.at[0], s.at[1], false);
    const full = part(src.paths, src.fills || []);
    for (let k = 1; k >= 0.549; k -= 0.05) {
      // Shrink toward the anchor corner, keeping the drawing's outer edge where it was on that side.
      const [x0, y0, x1, y1] = full.box;
      // (about the stroke's centre line, so the outer edge on the anchor side stays put)
      const ax = s.anchor[0] <= 12 ? x0 + SW / 2 : x1 - SW / 2; const ay = s.anchor[1] <= 12 ? y0 + SW / 2 : y1 - SW / 2;
      const tx = q(ax - ax * k); const ty = q(ay - ay * k);
      const base = part(src.paths.map((d) => transform(d, k, tx, ty)), (src.fills || []).map((d) => transform(d, k, tx, ty)));
      if (base.box[0] < LIVE[0] - 0.01 || base.box[1] < LIVE[0] - 0.01 || base.box[2] > LIVE[1] + 0.01 || base.box[3] > LIVE[1] + 0.01) continue;
      if (clear(base, badge)) return { base, badge, scale: k };
    }
    return null;
  }

  // ---- Compose ----------------------------------------------------------------------------
  const pretty = (n) => n.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Returns { options: [{ icon, label, existing? }], base, badges, note }.
  function compose(prompt, { max = 6 } = {}) {
    const ws = words(prompt);
    const badgeKeys = findBadges(ws);
    const badgeWords = new Set(badgeKeys.flatMap((k) => BADGES[k].words));
    const bases = findBases(ws, badgeWords);
    const out = { options: [], bases: bases.slice(0, 3).map((b) => b.name), badges: badgeKeys, note: '' };
    if (!bases.length) {
      out.note = badgeKeys.length ? `Found the ${BADGES[badgeKeys[0]].label.toLowerCase()}, but no object to put it on. Try “${ws.join(' ')} file” or “… folder”, “… user”, “… chat”.`
        : 'No part matches. Name an object (file, folder, user, chat, image, video, calendar…) and what happens to it (add, done, AI, upload…).';
      return out;
    }
    // The set already has it? Offer that first (e.g. “add user” → User Plus).
    const exact = E.matchIcon(prompt, 'line');
    if (exact && badgeKeys.length && exact.name.split('-').length > 1) out.options.push({ icon: exact, label: 'Already in the set', existing: true });
    if (!badgeKeys.length) {
      out.note = `No modifier found (add, done, AI, upload, delete…). Showing ${pretty(bases[0].name)} with the most common ones.`;
      badgeKeys.push('plus', 'check', 'ai');
    }
    const name = (b, k) => `${b.name}-${k}`;
    // A second base only when it scored as well as the first and carries no badge of its own.
    const pick = bases.filter((b, i) => i === 0 || (!DECORATED.test(b.name) && findBases(ws, badgeWords).indexOf(b) === i && i < 3 && scoreOf(b) === scoreOf(bases[0])));
    for (const b of pick.slice(0, 2)) {
      for (const key of badgeKeys.slice(0, 3)) {
        for (const spot of SPOT_ORDER[key]) {
          if (out.options.length >= max) break;
          if (spot === 'bottom-right' || spot === 'top-right') {
            // Corner cut (round 23, her Sharp references): the base stays full size and is cut cleanly
            // 2 units around the badge, like a text frame cut at the corner where its plus sits.
            const s = SPOTS[spot]; const bd = badgeAt(key, s.at[0], s.at[1], false);
            const [x0, y0, x1, y1] = bd.box;
            const cutRect = [x0 - GAP, y0 - GAP, spot === 'bottom-right' ? 25 : x1 + GAP + 3, spot === 'bottom-right' ? 25 : y1 + GAP];
            if (spot === 'top-right') cutRect[1] = -1;
            const icon = E.lineIcon({
              name: `${name(b, key)}-cut-${spot}`, title: `${pretty(b.name)} + ${BADGES[key].label}`, keywords: [...(b.keywords || []), ...BADGES[key].words.slice(0, 3)],
              paths: b.paths, fills: b.fills || [], badge: { paths: bd.paths, fills: bd.fills }, cut: [cutRect],
            });
            Object.assign(icon, { composed: { base: b.name, badge: key, spot: `${spot} cut` }, prompt });
            if (out.options.length < max) out.options.push({ icon, label: `${SPOTS[spot].label}, cut` });
          }
          if (out.options.length >= max) break;
          const placed = spot === 'inside' ? placeInside(part(b.paths, b.fills || []), key) : placeCorner(b, key, spot);
          if (!placed) continue;
          const icon = E.lineIcon({
            name: name(b, key), title: `${pretty(b.name)} + ${BADGES[key].label}`, keywords: [...(b.keywords || []), ...BADGES[key].words.slice(0, 3)],
            paths: [...placed.base.paths, ...placed.badge.paths], fills: [...placed.base.fills, ...placed.badge.fills],
          });
          Object.assign(icon, { composed: { base: b.name, badge: key, spot }, prompt });
          out.options.push({ icon, label: `${spot === 'inside' ? 'Inside' : SPOTS[spot].label}` });
        }
      }
    }
    if (!out.options.length) out.note = `${pretty(bases[0].name)} has no room for that badge inside, and shrinking it didn't clear the 2-unit gap.`;
    return out;
  }

  // ---- Does it exist? -----------------------------------------------------------------------
  // An icon in the set counts as the answer only when it covers EVERY word of the prompt (by its
  // name, its keywords, or a modifier word its name carries: "add folder" → folder-plus). Icons that
  // cover some of the words come back as `near` (the closest drawings in the set).
  const STOP = new Set(['icon', 'icons', 'a', 'an', 'the', 'for', 'of', 'and', 'with', 'i', 'need', 'want', 'make', 'me', 'please', 'to', 'in', 'on', 'my', 'some']);
  const NAME_BADGE = { plus: 'plus', minus: 'minus', check: 'check', ai: 'ai', x: 'x', close: 'x', up: 'up', down: 'down', upload: 'up', download: 'down' };
  function findExisting(prompt) {
    const ws = words(prompt).filter((w) => !STOP.has(w));
    if (!ws.length) return { exact: [], near: [] };
    const covers = (s, w) => {
      const parts = s.name.split('-'); const p = plain(w); const syn = SYNONYMS[w];
      if (parts.includes(w) || parts.includes(p) || s.name === w || s.name === syn || (syn && parts.includes(syn))) return true;
      if ((s.keywords || []).some((k) => k === w || k === p)) return true;
      // a modifier word whose badge the name carries ("add" → -plus, "done" → -check)
      return Object.entries(BADGES).some(([key, b]) => b.words.includes(w) && parts.some((x) => NAME_BADGE[x] === key));
    };
    const exact = []; const near = [];
    for (const s of SITE) {
      const n = ws.filter((w) => covers(s, w)).length;
      if (n === ws.length) exact.push({ s, extra: s.name.split('-').length }); // fewer extra parts = closer
      else if (n) near.push({ s, n: n + ws.filter((w) => covers(s, w) && !Object.values(BADGES).some((b) => b.words.includes(w))).length });
    }
    exact.sort((a, b) => a.extra - b.extra);
    near.sort((a, b) => b.n - a.n || a.s.name.length - b.s.name.length);
    return { exact: exact.map((x) => x.s.name), near: near.slice(0, 6).map((x) => x.s.name) };
  }

  return { compose, findExisting, BADGES, SPOTS };
})();

if (typeof module !== 'undefined') module.exports = IconCompose;
