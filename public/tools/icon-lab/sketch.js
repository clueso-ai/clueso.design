// Draw to find or create an icon (round 26, her idea): sketch anywhere on the canvas's dotted grid.
// No API. Browser only (canvas Path2D).
//
//   recognise(strokes, icons)  compares the drawing with every icon in the set. Both are drawn into a
//                              32 × 32 raster cropped to their ink (so size and position don't matter)
//                              and scored by two-way chamfer distance: how far, on average, the
//                              drawing's lines are from the icon's, and back. Returns the icons, best first.
//   iconFrom(strokes)          turns the drawing into an icon in our style: each stroke is simplified
//                              (Ramer–Douglas–Peucker), its angles snapped to 0 / 45 / 90° when close,
//                              near-closed strokes closed, near-circles made true circles; the whole is
//                              fitted to the 24 grid's live area on quarter units, at the 1.5 stroke.
//
// Strokes are arrays of [x, y] points in any units (screen pixels from the canvas).

const IconSketch = (function () {
  const E = typeof IconEngine !== 'undefined' ? IconEngine : null;
  const R = 32;

  const boxOf = (strokes) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of strokes) for (const [x, y] of s) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1, w: Math.max(x1 - x0, 1e-6), h: Math.max(y1 - y0, 1e-6) };
  };

  // ---- Rasters ------------------------------------------------------------------------------
  const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = R; return c; };
  // A raster as an ink mask plus its distance transform (how far each cell is from the nearest ink).
  function vectorOf(c) {
    const a = c.getContext('2d').getImageData(0, 0, R, R).data;
    const ink = new Uint8Array(R * R); const pts = [];
    for (let i = 0; i < R * R; i++) if (a[i * 4 + 3] > 90) { ink[i] = 1; pts.push(i); }
    const INF = 1e9; const d = new Float32Array(R * R).fill(INF);
    for (const i of pts) d[i] = 0;
    // two-pass chamfer distance (1, √2)
    const D = Math.SQRT2;
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const i = y * R + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) v = Math.min(v, d[i - R] + 1);
      if (x > 0 && y > 0) v = Math.min(v, d[i - R - 1] + D); if (x < R - 1 && y > 0) v = Math.min(v, d[i - R + 1] + D); d[i] = v; }
    for (let y = R - 1; y >= 0; y--) for (let x = R - 1; x >= 0; x--) { const i = y * R + x; let v = d[i];
      if (x < R - 1) v = Math.min(v, d[i + 1] + 1); if (y < R - 1) v = Math.min(v, d[i + R] + 1);
      if (x < R - 1 && y < R - 1) v = Math.min(v, d[i + R + 1] + D); if (x > 0 && y < R - 1) v = Math.min(v, d[i + R - 1] + D); d[i] = v; }
    return { pts, dist: d };
  }
  const PAD = 3;
  // Draw strokes (any units) into the raster, fitted to their own box.
  function rasterSketch(strokes) {
    const c = canvas(); const g = c.getContext('2d'); const bx = boxOf(strokes);
    const k = (R - PAD * 2) / Math.max(bx.w, bx.h); const ox = (R - bx.w * k) / 2; const oy = (R - bx.h * k) / 2;
    g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000';
    for (const s of strokes) {
      g.beginPath(); s.forEach(([x, y], i) => { const X = ox + (x - bx.x0) * k; const Y = oy + (y - bx.y0) * k; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
      if (s.length === 1) g.lineTo(ox + (s[0][0] - bx.x0) * k + 0.1, oy + (s[0][1] - bx.y0) * k);
      g.stroke();
    }
    return vectorOf(c);
  }
  // An icon's ink box, in grid units (from its own body, with its fit transform).
  function iconPaths(icon) {
    const els = [...(icon.body || '').matchAll(/<path d="([^"]*)"([^>]*)\/>/g)].map((m) => ({ d: m[1], stroke: /stroke=/.test(m[2]) }));
    const t = [icon.tx || 0, icon.ty || 0, icon.scale || 1];
    return { els, t };
  }
  const cache = new Map();
  function rasterIcon(icon) {
    const key = icon.id || `${icon.name}#${icon.variant || ''}`;
    if (cache.has(key)) return cache.get(key);
    const { els, t } = iconPaths(icon);
    if (!els.length) { cache.set(key, null); return null; }
    const b = icon.box || { x0: 2, y0: 2, x1: 22, y1: 22 };
    const w = Math.max(b.x1 - b.x0, 1e-6); const h = Math.max(b.y1 - b.y0, 1e-6);
    const k = (R - PAD * 2) / Math.max(w, h); const ox = (R - w * k) / 2; const oy = (R - h * k) / 2;
    const c = canvas(); const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, ox - b.x0 * k, oy - b.y0 * k); g.transform(t[2], 0, 0, t[2], t[0], t[1]);
    g.lineWidth = 1.6 / k / t[2]; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000'; g.fillStyle = '#000';
    for (const e of els) { const p = new Path2D(e.d); if (e.stroke) g.stroke(p); else g.fill(p); }
    const v = vectorOf(c); cache.set(key, v); return v;
  }
  // Two-way chamfer: the mean distance from the drawing's ink to the icon's, and back (in raster
  // cells), turned into a 0–1 score. 1 = the same lines; a scribble lands far from everything.
  const mean = (pts, dist) => (pts.length ? pts.reduce((a, i) => a + Math.min(dist[i], 8), 0) / pts.length : 8);
  const dot = (a, b) => { const d = (mean(a.pts, b.dist) + mean(b.pts, a.dist)) / 2; return 1 / (1 + d / 1.5); };

  function recognise(strokes, icons) {
    if (!strokes.length) return [];
    const v = rasterSketch(strokes);
    const bx = boxOf(strokes); const aspect = bx.w / bx.h;
    return icons.map((icon) => {
      const r = rasterIcon(icon); if (!r) return null;
      const b = icon.box || { x0: 2, y0: 2, x1: 22, y1: 22 };
      const ia = (b.x1 - b.x0) / Math.max(b.y1 - b.y0, 1e-6);
      // a small penalty when the proportions differ a lot (a wide sketch isn't a tall icon)
      const shape = Math.min(aspect, ia) / Math.max(aspect, ia);
      return { icon, score: dot(v, r) * (0.85 + 0.15 * shape) };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  }

  // ---- Clean-up: the drawing as an icon in our style ------------------------------------------
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1e-6;
    let iMax = 0; let dMax = 0;
    for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dMax) { dMax = d; iMax = i; } }
    if (dMax <= eps) return [a, b];
    return [...rdp(pts.slice(0, iMax + 1), eps).slice(0, -1), ...rdp(pts.slice(iMax), eps)];
  }
  const q = (v) => Math.round(v * 4) / 4;
  const f = (v) => +v.toFixed(2);
  // Snap each segment to 0 / 45 / 90° when it's within 12° of one (moving its end point).
  function snapAngles(pts) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = out[out.length - 1]; const [x, y] = pts[i]; const L = Math.hypot(x - px, y - py);
      const a = Math.atan2(y - py, x - px); const s = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
      out.push(Math.abs(a - s) < (12 * Math.PI) / 180 ? [px + Math.cos(s) * L, py + Math.sin(s) * L] : [x, y]);
    }
    return out;
  }
  function iconFrom(strokes, name = 'drawn') {
    const bx = boxOf(strokes);
    // Fit the drawing's centre lines into 3.75–20.25 (the square keyline at the 1.5 stroke), centred.
    const S = 16.5; const k = S / Math.max(bx.w, bx.h); const ox = 12 - (bx.w * k) / 2; const oy = 12 - (bx.h * k) / 2;
    const T = ([x, y]) => [ox + (x - bx.x0) * k, oy + (y - bx.y0) * k];
    const paths = [];
    for (const s0 of strokes) {
      const s = s0.map(T);
      const sb = boxOf([s]); const span = Math.max(sb.w, sb.h);
      if (span < 1.2) { const [x, y] = s[0]; paths.push({ fill: `M${f(q(x) - 1)} ${f(q(y) - 1)}H${f(q(x) + 1)}V${f(q(y) + 1)}H${f(q(x) - 1)}Z` }); continue; } // a dot → the 2 × 2 pixel
      const closed = Math.hypot(s[0][0] - s[s.length - 1][0], s[0][1] - s[s.length - 1][1]) < Math.max(2, span * 0.2);
      // A near-circle: closed, and its points all about the same distance from their centre.
      const cx = (sb.x0 + sb.x1) / 2; const cy = (sb.y0 + sb.y1) / 2;
      const rs = s.map(([x, y]) => Math.hypot(x - cx, y - cy)); const rm = rs.reduce((a, b) => a + b, 0) / rs.length;
      const dev = Math.sqrt(rs.reduce((a, r) => a + (r - rm) ** 2, 0) / rs.length) / rm;
      if (closed && dev < 0.14 && Math.abs(sb.w - sb.h) < span * 0.25 && s.length > 8) {
        const r = Math.max(1, q(rm)); const X = q(cx); const Y = q(cy);
        paths.push({ d: `M${f(X - r)} ${f(Y)}A${f(r)} ${f(r)} 0 1 0 ${f(X + r)} ${f(Y)}A${f(r)} ${f(r)} 0 1 0 ${f(X - r)} ${f(Y)}Z` });
        continue;
      }
      let pts = rdp(s, Math.max(0.55, span * 0.05));
      pts = snapAngles(pts).map(([x, y]) => [q(x), q(y)]);
      if (closed && pts.length > 2) { pts.pop(); }
      const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + (closed && pts.length > 2 ? 'Z' : '');
      paths.push({ d });
    }
    const icon = E.lineIcon({ name, title: 'Your drawing', keywords: ['drawn'], paths: paths.filter((p) => p.d).map((p) => p.d), fills: paths.filter((p) => p.fill).map((p) => p.fill) });
    return Object.assign(icon, { composed: { drawn: true }, prompt: 'drawn on the grid' });
  }

  return { recognise, iconFrom };
})();

if (typeof module !== 'undefined') module.exports = IconSketch;
