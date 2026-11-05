// Pixel direction (third signature direction, WEBSITE ONLY; the platform stays on the base set).
// Round 13 started it for social posts (refs 18–19, square pixels instead of dots); round 19 makes
// it one tone (no halftone gradient), redraws the shapes straight on the pixel grid and adds 20 icons.
//
// Grid: 20 × 20 pixels, one per grid unit over the 24 artboard's live area (2–22). A pixel is on
// when its centre is inside the drawing. Pixels are 0.8 with a 0.2 gutter (the tool draws them).
// Each icon is a list of steps: ['+', shape] adds, ['-', shape] cuts (knock-outs for details and
// 1-pixel gaps between parts). Shapes are in pixel units (0–20, y down). Circles use radii that
// rasterise without one-pixel nubs (e.g. 9.4, 7.4, 4.4 about a pixel corner).

type Shape = (x: number, y: number) => boolean;
type Step = ["+" | "-", Shape];

export const PIXEL_SET: { name: string; cells: { x: number; y: number; tone: string }[] }[] = (function () {
  const N = 20;
  const rect = (x0: number, y0: number, x1: number, y1: number): Shape => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);
  const ring = (cx: number, cy: number, r0: number, r1: number): Shape => (x, y) => { const d = Math.hypot(x - cx, y - cy); return d <= r1 && d >= r0; };
  const poly = (pts: number[][]): Shape => (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const and = (a: Shape, b: Shape): Shape => (x, y) => a(x, y) && b(x, y);
  const star = (cx: number, cy: number, R: number, r: number, n = 5) => poly(Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n; const d = i % 2 ? r : R; return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  }));
  const spark = (cx: number, cy: number, R: number, k = 0.24) => poly([[cx, cy - R], [cx + R * k, cy - R * k], [cx + R, cy], [cx + R * k, cy + R * k],
    [cx, cy + R], [cx - R * k, cy + R * k], [cx - R, cy], [cx - R * k, cy - R * k]]);
  const person = (cx: number, headY: number, hr: number, bodyTop: number, brx: number): Step[] => [
    ['+', circle(cx, headY, hr)],
    ['+', and(ellipse(cx, 19.5, brx, 19.5 - bodyTop), rect(0, bodyTop, N, 19))],
  ];

  const icons: { name: string; draw: Step[] }[] = [
    // ---- Round 13, refined
    { name: 'play', draw: [['+', poly([[4, 2.5], [18, 10], [4, 17.5]])]] },
    { name: 'record', draw: [['+', ring(10, 10, 7.4, 9.4)], ['+', circle(10, 10, 4)]] },
    { name: 'mic', draw: [
      ['+', circle(10, 4, 3)], ['+', rect(7, 4, 13, 9)], ['+', circle(10, 9, 3)],
      ['+', and(ring(10, 9, 5, 7), rect(0, 9, N, N))], ['+', rect(9, 15.5, 11, 18)], ['+', rect(6, 18, 14, 19.5)]] },
    { name: 'video-camera', draw: [['+', rect(1, 4, 13, 16)], ['+', poly([[14, 8], [19, 5], [19, 15], [14, 12]])]] },
    // Round 20: a bolder sparkle, and the clue pixel (a 3 × 3 block) instead of the small sparkle.
    { name: 'sparkles', draw: [['+', spark(9, 11, 8.75, 0.25)], ['+', rect(15, 1, 17.9, 3.9)]] },
    { name: 'cursor', draw: [['+', poly([[3, 2], [18, 8.5], [11, 11], [8.5, 18]])]] },
    { name: 'chat', draw: [
      ['+', rect(1, 1, 19, 14)], ['+', poly([[1, 13], [1, 19], [6, 14], [6, 13]])],
      ['-', rect(5, 6.5, 6.9, 8.5)], ['-', rect(9, 6.5, 10.9, 8.5)], ['-', rect(13, 6.5, 14.9, 8.5)]] },
    { name: 'document', draw: [
      ['+', poly([[3, 1], [11, 1], [17, 7], [17, 19], [3, 19]])], ['+', poly([[12.5, 1], [17, 1], [17, 5.5]])],
      ['-', rect(6, 10, 13.9, 10.9)], ['-', rect(6, 13.5, 10.9, 14.4)]] },
    { name: 'award', draw: [
      ['+', rect(5, 1, 15, 7)], ['+', and(circle(10, 7, 5), rect(0, 7, N, N))],
      ['+', rect(1, 2, 4, 3)], ['+', rect(1, 2, 2, 8)], ['+', rect(1, 7, 4, 8)],
      ['+', rect(16, 2, 19, 3)], ['+', rect(18, 2, 19, 8)], ['+', rect(16, 7, 19, 8)],
      ['+', rect(9, 12, 11, 15)], ['+', rect(5, 15, 15, 18)]] },
    // Round 20: slightly bigger (she liked it bold).
    { name: 'megaphone', draw: [
      ['+', poly([[0.5, 6.5], [5, 6.5], [14, 1], [14, 19], [5, 13.5], [0.5, 13.5]])], ['+', rect(2.5, 13.5, 5.9, 18.5)],
      ['+', rect(16, 9, 20, 10.9)], ['+', rect(16, 3.5, 17.9, 5.4)], ['+', rect(16, 14.6, 17.9, 16.5)]] },
    // ---- Round 19: 20 more for the website
    { name: 'search', draw: [['+', ring(8, 8, 5.2, 7.4)], ['+', poly([[12.4, 14.2], [14.2, 12.4], [19.5, 17.7], [17.7, 19.5]])]] },
    { name: 'user', draw: person(10, 5.5, 4.5, 11.5, 8.5) },
    // Round 20: two people side by side, a 2-pixel gap between them.
    { name: 'users', draw: [
      ['+', circle(5, 6, 3.4)], ['+', circle(15, 6, 3.4)],
      ['+', and(ellipse(5, 19.5, 5.2, 8), rect(0, 12, 8.9, 19))], ['+', and(ellipse(15, 19.5, 5.2, 8), rect(11.1, 12, N, 19))]] },
    { name: 'bell', draw: [
      ['+', and(circle(10, 9, 6), rect(0, 0, N, 9))], ['+', rect(4, 9, 16, 14)], ['+', rect(2, 14, 18, 15.9)],
      ['+', rect(8, 17, 12, 18.9)], ['+', rect(9, 1, 11, 3)]] },
    { name: 'send', draw: [['+', poly([[2, 3], [19, 10], [2, 17], [5.5, 10]])]] },
    { name: 'lightning', draw: [['+', poly([[12.5, 1], [3, 12], [9, 12], [7, 19], [17, 8], [11, 8]])]] },
    { name: 'rocket', draw: [
      ['+', poly([[10, 0.5], [13.5, 5], [13.5, 14], [6.5, 14], [6.5, 5]])],
      ['+', poly([[6.5, 9], [3.5, 12.5], [3.5, 16], [6.5, 14]])], ['+', poly([[13.5, 9], [16.5, 12.5], [16.5, 16], [13.5, 14]])],
      ['-', circle(10, 7.5, 1.6)], ['+', rect(9, 15.5, 11, 19)]] },
    { name: 'heart', draw: [['+', circle(6, 7, 4.6)], ['+', circle(14, 7, 4.6)], ['+', poly([[1.6, 8.5], [18.4, 8.5], [10, 18]])]] },
    // Round 20: chunkier (a fuller inner radius) so it holds at rating sizes.
    { name: 'star', draw: [['+', star(10, 10.9, 9.8, 5)]] },
    { name: 'lock', draw: [
      ['+', and(ring(10, 7, 3, 5), rect(0, 0, N, 7))], ['+', rect(5, 7, 7, 9)], ['+', rect(13, 7, 15, 9)],
      ['+', rect(3, 9, 17, 19)], ['-', rect(9, 12, 10.9, 15.9)]] },
    // Round 20: in the gallery's language: a 2-pixel outline body, the tab solid.
    { name: 'folder', draw: [
      ['+', poly([[1, 2], [8, 2], [10, 4.5], [10, 6], [1, 6]])], ['+', rect(1, 6, 19, 18)], ['-', rect(3, 8, 16.9, 15.9)],
      ['+', rect(10, 4, 19, 6)]] },
    { name: 'image', draw: [
      ['+', rect(1, 2, 19, 18)], ['-', rect(3, 4, 16.9, 15.9)],
      ['+', poly([[3, 16], [8, 10], [11, 13], [13, 11], [17, 15], [17, 16]])], ['+', circle(13.5, 7.5, 1.8)]] },
    { name: 'calendar', draw: [
      ['+', rect(2, 3, 18, 18)], ['-', rect(4, 8, 15.9, 15.9)], ['+', rect(5, 1, 6.9, 4.9)], ['+', rect(13, 1, 14.9, 4.9)],
      ['-', rect(5, 3, 6.9, 3.9)], ['-', rect(13, 3, 14.9, 3.9)], ['+', rect(6, 10, 8.9, 12.9)]] },
    { name: 'clock', draw: [['+', ring(10, 10, 7.4, 9.4)], ['+', rect(9, 5, 10.9, 10.9)], ['+', rect(9, 9, 14, 10.9)]] },
    { name: 'check-circle', draw: [['+', circle(10, 10, 9.4)], ['-', poly([[5, 10], [7, 8], [9, 10], [13, 6], [15, 8], [9, 14]])]] },
    // Round 20: in the gallery's language: a 2-pixel outline house, the door solid.
    { name: 'home', draw: [
      ['+', poly([[10, 0.5], [19.5, 10], [17, 10], [17, 19], [3, 19], [3, 10], [0.5, 10]])],
      ['-', poly([[10, 3.3], [15, 8.3], [15, 17], [5, 17], [5, 8.3]])], ['+', rect(8, 12, 11.9, 19)]] },
    { name: 'mail', draw: [['+', rect(1, 3, 19, 17)], ['-', poly([[1, 3], [3, 3], [10, 8.5], [17, 3], [19, 3], [19, 4.5], [10, 11], [1, 4.5]])]] },
    { name: 'bar-chart', draw: [['+', rect(2, 9, 5.9, 19)], ['+', rect(8, 3, 11.9, 19)], ['+', rect(14, 12, 17.9, 19)]] },
    { name: 'download', draw: [
      ['+', rect(9, 1, 10.9, 9)], ['+', poly([[5, 8], [15, 8], [10, 13]])],
      ['+', rect(1, 13, 2.9, 19)], ['+', rect(1, 17, 19, 19)], ['+', rect(17, 13, 19, 19)]] },
    { name: 'shield-check', draw: [
      ['+', poly([[10, 1], [18, 4], [18, 10], [10, 19], [2, 10], [2, 4]])],
      ['-', poly([[6, 10], [8, 8], [9.5, 9.5], [13, 6], [15, 8], [9.5, 13.5]])]] },
  ];

  // Rasterise: each step adds or removes the pixels whose centre is inside its shape.
  return icons.map(({ name, draw }) => {
    const on = new Set<string>();
    for (const [op, shape] of draw) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!shape(x + 0.5, y + 0.5)) continue;
        if (op === '+') on.add(`${x},${y}`); else on.delete(`${x},${y}`);
      }
    }
    return { name, cells: [...on].map((k) => { const [x, y] = k.split(',').map(Number); return { x, y, tone: 'full' }; }) };
  });
})();
