import type { SignatureEntry } from "./types.ts";

// Round 13–14 (2026-11-01): signature options, to make the set ownable. Each option redraws
// a sample of the set so Sneha can compare them in the tool and in context (top bar →
// Signature). Same grid, stroke and style rules as site-set.js. An entry with no `paths` uses
// the base drawing from site-set.js (plus its `fills`); `rotate` tilts it (degrees, clockwise)
// and `pixels` are added after the tilt, so the pixel stays square to the grid; `options`
// offers alternative drawings (first is the default).
//
// A · Clue pixel (her pick, round 14): one 2 × 2 solid pixel per icon, placed by the rule in
//     ICON-RULES.md ("The clue pixel"). The bell and pin also tilt; send is diagonal.
// B · Cut: one 45° chamfer (3 units) on the top-right corner of every frame, taken from the
//     document fold. She liked it on inbox, billing and analytics.
// Tilt is part of A (round 14): only things that swing or get pushed in (bell, pin) lean 12°.
// (C · Tilt as its own option and D · From the mark were tried in round 13 and dropped in round 14.)

export const SIGNATURE_SET: SignatureEntry[] = [
  {
    key: 'A', label: 'A · Clue pixel',
    idea: 'One small square pixel per icon: it replaces a small detail, marks a state inside the shape, or marks where the action happens.',
    icons: [
      { name: 'bell', note: 'A + tilt: the top of the dome opens and the pixel sits in the break, tilted with the bell.', options: [
        { label: 'Break', note: 'Tilted 12°; the pixel sits in the break, like a text cursor between brackets, and tilts with the bell.', rotate: 12, paths: ['M3.75 17.25H20.25', 'M5.75 17.25V10.5A6.25 6.25 0 0 1 9.5 4.77', 'M14.5 4.77A6.25 6.25 0 0 1 18.25 10.5V17.25', 'M9.5 20.25H14.5'], fills: ['M11 3.25H13V5.25H11Z'] },
        { label: 'Top right', note: 'Tilted 12°; the notification pixel sits outside, top right, square to the grid.', rotate: 12, paths: ['M3.75 17.25H20.25', 'M5.75 17.25V10.5A6.25 6.25 0 0 1 18.25 10.5V17.25', 'M9.5 20.25H14.5'], pixels: ['M18.75 2.25H20.75V4.25H18.75Z'] },
      ] },
      { name: 'send', note: 'Diagonal; the launch point trails the plane.', rotate: -45, paths: ['M7 5.25L20 12L7 18.75L9.25 12Z'], pixels: ['M5.25 16.75H7.25V18.75H5.25Z'] },
      { name: 'megaphone', note: 'The clue is the sound. Round 23: the bigger horn of the base.', paths: ['M3.75 9H7.75L14.25 5.25V18.75L7.75 15H3.75Z', 'M6.75 15V19.75', 'M17.5 7.75L20.25 5.75', 'M17.5 16.25L20.25 18.25'], fills: ['M18.25 11H20.25V13H18.25Z'] },
      { name: 'lightning', note: 'The spark.', paths: ['M14 3.75L5.75 13.75H11.5L9.5 20.25L18 10.25H12.75Z'], fills: ['M17 3H19V5H17Z'] },
      { name: 'pen', note: 'The ink at the nib.', paths: ['M6.75 17.25L7.75 13.25L17.5 3.5L20.5 6.5L10.75 16.25Z', 'M15.25 5.75L18.25 8.75'], fills: ['M2 20H4V22H2Z'] },
      { name: 'play', note: 'The start point inside the play.', paths: ['M7.25 5.25V18.75L19.25 12Z'], fills: ['M10 11H12V13H10Z'] },
      { name: 'mic', note: 'The live point, inside the capsule.', fills: ['M11 7H13V9H11Z'] },
      { name: 'video-camera', note: 'The recording light.', fills: ['M6.25 8H8.25V10H6.25Z'] },
      { name: 'chat', note: 'The message.', fills: ['M11 9H13V11H11Z'] },
      { name: 'sparkles', note: 'The clue replaces the two small sparkles.', paths: ['M10.75 6.75L12.5 10.25L15.75 12L12.5 13.75L10.75 17.25L9 13.75L5.75 12L9 10.25Z'], fills: ['M17.5 4.5H19.5V6.5H17.5Z'] },
      { name: 'folder', note: 'Something inside.', fills: ['M16.25 14.5H18.25V16.5H16.25Z'] },
      { name: 'document', note: 'The highlighted line: the pixel starts the first line of text.', paths: ['M4.75 2.75H14.25L19.25 7.75V21.25H4.75Z', 'M14.25 2.75V7.75H19.25', 'M12 12.25H15.75', 'M8.25 16.25H15.75'], fills: ['M8 11.25H10V13.25H8Z'] },
      { name: 'image', note: 'The sun becomes the clue.', paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M3.75 17L9 11.75L12.5 15.25L15 12.75L20.25 18'], fills: ['M14.5 7.5H16.5V9.5H14.5Z'] },
      { name: 'search', note: 'The clue being found.', fills: ['M9.5 9.5H11.5V11.5H9.5Z'] },
      { name: 'user', note: 'Status.', fills: ['M18 3H20V5H18Z'] },
      { name: 'calendar', note: 'The date.', fills: ['M7.25 13H9.25V15H7.25Z'] },
      { name: 'lock', note: 'The keyhole.', paths: ['M4.75 10.75H19.25V20.25H4.75Z', 'M7.75 10.75V7A4.25 4.25 0 0 1 16.25 7V10.75'], fills: ['M11 14.5H13V16.5H11Z'] },
      // Round 14: more icons by the rule (ICON-RULES 20–23).
      { name: 'record-screen', note: 'The record dot becomes the pixel (replaces a detail).', paths: ['M2.75 3.75H21.25V16.25H2.75Z', 'M8 20.25H16', 'M12 16.25V20.25'], fills: ['M11 9H13V11H11Z'] },
      { name: 'webcam', note: 'Webcam options (round 16).', options: [
        { label: 'Status light', note: 'A smaller round camera with its lens; the pixel is the "on" light outside, top right (status).', paths: ['M6.5 9.5A5.5 5.5 0 1 0 17.5 9.5A5.5 5.5 0 1 0 6.5 9.5Z', 'M10 9.5A2 2 0 1 0 14 9.5A2 2 0 1 0 10 9.5Z', 'M12 15.75V20.25', 'M7 20.25H17'], fills: ['M18.5 2.5H20.5V4.5H18.5Z'] },
        { label: 'Lens + pixel', note: 'The lens ring stays; the pixel is the sensor inside it.', paths: ['M5.5 10A6.5 6.5 0 1 0 18.5 10A6.5 6.5 0 1 0 5.5 10Z', 'M9.25 10A2.75 2.75 0 1 0 14.75 10A2.75 2.75 0 1 0 9.25 10Z', 'M12 16.5V20.25', 'M7 20.25H17'], fills: ['M11 9H13V11H11Z'] },
        { label: 'Lens pixel', note: 'Round 15: the pixel replaces the lens.', paths: ['M5.5 10A6.5 6.5 0 1 0 18.5 10A6.5 6.5 0 1 0 5.5 10Z', 'M12 16.5V20.25', 'M7 20.25H17'], fills: ['M11 9H13V11H11Z'] },
      ] },
      { name: 'location', note: 'The spot becomes the pixel (replaces a detail).', paths: ['M4.75 10A7.25 7.25 0 0 1 19.25 10V13L12 20.25L4.75 13Z'], fills: ['M11 9H13V11H11Z'] },
      { name: 'tag', note: 'The hole becomes the pixel (replaces a detail).', paths: ['M3.75 3.75H11.5L20.25 12.5L12.5 20.25L3.75 11.5Z'], fills: ['M7 7H9V9H7Z'] },
      { name: 'wallet', note: 'The coin becomes the pixel (replaces a detail).', paths: ['M18.75 8.5V4.75H4.75V19.25H18.75V15.25', 'M12.75 8.5H20.5V15.25H12.75Z'], fills: ['M15.6 10.9H17.6V12.9H15.6Z'] },
      { name: 'inbox', note: 'Something new in the tray (state, inside).', fills: ['M11 7.5H13V9.5H11Z'] },
      { name: 'bookmark', note: 'Saved (state, inside).', fills: ['M11 6.5H13V8.5H11Z'] },
    ],
  },
  {
    key: 'B', label: 'B · Cut',
    idea: 'One 45° cut on the top-right corner of every frame, from the document fold.',
    icons: [
      { name: 'document', note: 'The source of the cut (unchanged).' },
      { name: 'video-camera', paths: ['M3.5 5.25H13.75L16.75 8.25V18.75H3.5Z', 'M16.75 10L21.25 7V17L16.75 14'] },
      { name: 'chat', paths: ['M3.75 3.75H17.25L20.25 6.75V16.25H7L3.75 19.5Z'] },
      { name: 'chat-ai', paths: ['M3.75 3.75H17.25L20.25 6.75V16.25H7L3.75 19.5Z'], fills: ['M12 6.25L13.25 8.75L15.75 10L13.25 11.25L12 13.75L10.75 11.25L8.25 10L10.75 8.75Z'] },
      { name: 'folder', paths: ['M2.75 4.75H9.25L11.25 6.75H18.25L21.25 9.75V19.25H2.75Z'] },
      { name: 'image', paths: ['M3.75 3.75H17.25L20.25 6.75V20.25H3.75Z', 'M3.75 17L9 11.75L12.5 15.25L15 12.75L20.25 18'], fills: ['M14 8.5A1.5 1.5 0 1 0 17 8.5A1.5 1.5 0 1 0 14 8.5Z'] },
      { name: 'monitor', paths: ['M2.75 3.75H18.25L21.25 6.75V16.25H2.75Z', 'M8 20.25H16', 'M12 16.25V20.25'] },
      { name: 'video', paths: ['M2.75 3.75H18.25L21.25 6.75V16.25H2.75Z', 'M8 20.25H16', 'M12 16.25V20.25'], fills: ['M9.75 6.75V13.25L15 10Z'] },
      { name: 'record-screen', paths: ['M2.75 3.75H18.25L21.25 6.75V16.25H2.75Z', 'M8 20.25H16', 'M12 16.25V20.25'], fills: ['M9.25 10A2.75 2.75 0 1 0 14.75 10A2.75 2.75 0 1 0 9.25 10Z'] },
      { name: 'laptop', paths: ['M4.75 4.75H16.25L19.25 7.75V14.25H4.75Z', 'M2.75 19.25H21.25'] },
      { name: 'billing', paths: ['M2.75 4.75H18.25L21.25 7.75V19.25H2.75Z', 'M2.75 9.25H21.25', 'M6 15.25H10.5'] },
      { name: 'inbox', paths: ['M3.75 3.75H17.25L20.25 6.75V20.25H3.75Z', 'M3.75 13.25H7.75L10 15.5H14L16.25 13.25H20.25'] },
      { name: 'analytics', paths: ['M3.75 3.75H17.25L20.25 6.75V20.25H3.75Z', 'M8 16.75V12.25', 'M12 16.75V7.25', 'M16 16.75V10.25'] },
      { name: 'template', paths: ['M3.75 3.75H17.25L20.25 6.75V20.25H3.75Z', 'M3.75 9.25H20.25', 'M9.25 9.25V20.25'] },
      { name: 'calendar', paths: ['M3.75 5.25H17.25L20.25 8.25V20.25H3.75Z', 'M3.75 9.75H20.25', 'M7.75 2.75V6.5', 'M16.25 2.75V6.5'] },
      { name: 'lock', paths: ['M4.75 10.75H16.25L19.25 13.75V20.25H4.75Z', 'M7.75 10.75V7A4.25 4.25 0 0 1 16.25 7V10.75', 'M12 14V17'] },
      { name: 'briefcase', paths: ['M2.75 7.75H18.25L21.25 10.75V19.25H2.75Z', 'M8.75 7.75V4.75H15.25V7.75', 'M2.75 12.75H21.25'] },
      { name: 'captions', paths: ['M2.75 4.75H18.25L21.25 7.75V19.25H2.75Z', 'M9.75 9.5H6.75V14.5H9.75', 'M17.25 9.5H14.25V14.5H17.25'] },
    ],
  },
];

// A + B (rounds 17–18) was removed in round 23 at her ask.

// C · Block and D · Personality (round 23) were removed: C at her ask, and D's corner cuts went
// into the base set itself (site-set.js `cut`), which is what she asked for.
