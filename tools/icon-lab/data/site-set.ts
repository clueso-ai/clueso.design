import type { LibraryRedraw, SiteEntry } from "./types.ts";

// Site set: the 80 most-used icons on clueso.io (crawl of 2026-10-30, see
// references/clueso-site-icons.md), redrawn in the Sharp line style for review.
//
// Drawn natively on the tool's grid (see README "Grid"): 24 × 24, 2-unit padding,
// keylines on the OUTER edge (square 18, circle 20, portrait 16 × 20, landscape
// 20 × 16), outer stroke edges on whole units at the 1.5 stroke, so centre lines
// sit at .75 / .25 (or on 12 when a stroke runs through the middle). Sharp
// corners, square ends, 90° and 45° angles. Paths are in grid units.
// `replaces` is the icon currently used on the site; `pages` is how many pages use it.

export const SITE_SET: SiteEntry[] = [
  { name: 'chevron-down', replaces: 'Chevron down (page code) + Chevron-down', pages: 1570, keywords: ['chevron', 'down', 'expand', 'dropdown', 'caret'],
    paths: ['M6 9L12 15L18 9'] },
  { name: 'chevron-right', replaces: 'Chevron-right', pages: 1570, keywords: ['chevron', 'right', 'next', 'forward'],
    paths: ['M9 6L15 12L9 18'] },
  { name: 'menu', replaces: 'Equal (menu)', pages: 1570, keywords: ['menu', 'hamburger', 'navigation', 'equal'],
    // Outer edges on 7 and 17, ends on 3 and 21.
    paths: ['M3 7.75H21', 'M3 16.25H21'] },
  { name: 'arrow-up-right', replaces: 'Arrow-diagonal-right-up', pages: 1561, keywords: ['arrow', 'diagonal', 'external', 'link', 'up', 'right'],
    // Head's outer edges on 6 (top) and 18 (right); shaft at 45°.
    paths: ['M6 18L17.25 6.75', 'M9 6.75H17.25V15'] },
  { name: 'plus', replaces: 'FAQ toggle plus (page code)', pages: 850, keywords: ['plus', 'add', 'new', 'expand'],
    paths: ['M12 5V19', 'M5 12H19'] },
  { name: 'arrow-down', replaces: 'Arrow-down', pages: 757, keywords: ['arrow', 'down', 'scroll'],
    paths: ['M12 4V19', 'M6 13L12 19L18 13'] },
  { name: 'chevron-left', replaces: 'Chevron-left', pages: 387, keywords: ['chevron', 'left', 'back', 'previous'],
    paths: ['M15 6L9 12L15 18'] },
  { name: 'clock', replaces: 'Clock', pages: 129, keywords: ['clock', 'time', 'duration', 'read'],
    // Circle keyline: outer edge 2–22.
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z', 'M12 6V12H16.25'] },
  { name: 'copy', replaces: 'Copy', pages: 98, keywords: ['copy', 'duplicate', 'clipboard'],
    // Front square outer 3–16, back square outer 8–21; the back stops at the front's edge.
    paths: ['M3.75 8.75H15.25V20.25H3.75Z', 'M8.75 8V3.75H20.25V15.25H16'] },
  { name: 'sparkles', replaces: 'Sparkles + IconSparkle', pages: 84, keywords: ['sparkles', 'ai', 'magic', 'new'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'sparkles').
    paths: ['M9.25 6.75L11 10.25L14.25 12L11 13.75L9.25 17.25L7.5 13.75L4.25 12L7.5 10.25Z'],
    fills: ['M18.25 2.75L19 4.75L21 5.5L19 6.25L18.25 8.25L17.5 6.25L15.5 5.5L17.5 4.75Z', 'M18.25 15.75L19 17.75L21 18.5L19 19.25L18.25 21.25L17.5 19.25L15.5 18.5L17.5 17.75Z'] },
  { name: 'arrow-left', replaces: 'Arrow-left', pages: 69, keywords: ['arrow', 'left', 'back'],
    paths: ['M20 12H5', 'M11 6L5 12L11 18'] },
  { name: 'template', replaces: 'Template', pages: 56, keywords: ['template', 'layout', 'grid', 'page'],
    // Square keyline: outer edge 3–21.
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M3.75 9.25H20.25', 'M9.25 9.25V20.25'] },
  { name: 'chat-ai', replaces: 'Speech-bubble_rectangular_AI', pages: 24, keywords: ['chat', 'ai', 'assistant', 'message', 'bubble'],
    // Round 4: a plain closed bubble with a notch tail (a 45° triangle hanging under
    // the left of the bottom edge), and the solid sparkle centred inside. The earlier
    // open corner read as broken and the slanted foot tail as a smudge.
    paths: ['M3.75 3.75H20.25V16.25H7L3.75 19.5Z'],
    fills: ['M12 6.25L13.25 8.75L15.75 10L13.25 11.25L12 13.75L10.75 11.25L8.25 10L10.75 8.75Z'],
    variants: [
      { label: 'Sparkle' },
      // Two text lines with a smaller sparkle at their end.
      { label: 'Lines and sparkle', paths: ['M3.75 3.75H20.25V16.25H7L3.75 19.5Z', 'M7.25 8.25H11.25', 'M7.25 11.75H13.25'], fills: ['M16.25 6.5L17 8.25L18.75 9L17 9.75L16.25 11.5L15.5 9.75L13.75 9L15.5 8.25Z'] },
    ],
    defaultVariant: 0 },
  { name: 'shield-check', replaces: 'Shield_check', pages: 22, keywords: ['shield', 'security', 'secure', 'check', 'compliance'],
    // Round 8: round, on Google's construction (organic shapes stay round).
    paths: ['M12 3L19.25 5.75V11.25C19.25 15.75 16.25 19.5 12 21C7.75 19.5 4.75 15.75 4.75 11.25V5.75Z', 'M8.5 12L11 14.5L15.5 10'] },
  { name: 'rocket', replaces: 'Rocket', pages: 23, keywords: ['rocket', 'launch', 'startup', 'careers'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M9 12.75C11.25 8.25 15 4.5 20.25 3.75C19.5 9 15.75 12.75 11.25 15Z', 'M9 12.75L5.25 11.25L8.25 8.25L11.25 8.75', 'M11.25 15L12.75 18.75L15.75 15.75L15.25 12.75', 'M13.75 10.25A1.5 1.5 0 1 0 16.75 10.25A1.5 1.5 0 1 0 13.75 10.25Z', 'M7.75 16.25C6.25 16.25 4.75 17.5 4.25 19.75C6.5 19.25 7.75 17.75 7.75 16.25Z'] },
  { name: 'users', replaces: 'Users / team + Users-two + IconPeople', pages: 26, keywords: ['users', 'team', 'people', 'group'],
    // Round 11: on Google's construction (built from the base person).
    paths: ['M6.24 9.26A2.76 2.76 0 1 0 11.76 9.26A2.76 2.76 0 1 0 6.24 9.26Z', 'M2.84 19.25V17.55C2.84 16.27 5.6 14.79 9 14.79C12.4 14.79 15.16 16.27 15.16 17.55V19.25Z', 'M15.04 6.59A2.76 2.76 0 1 1 15.04 11.93', 'M16.6 14.83C19.57 15 21.91 16.27 21.91 17.55V19.25'] },
  { name: 'paperclip', replaces: 'Paperclip', pages: 12, keywords: ['paperclip', 'attach', 'attachment', 'file', 'pin'], fromLibrary: 'paperclip-2',
    usedOn: 'the 12 tool pages (/tools/…), e.g. mp4-to-gif, sop-generator, video-translator',
    variants: [
      { label: 'Upright' },
      { label: 'Diagonal', rotate: 45 },
      // Brutal take: straight lines with 45° chamfers instead of round ends.
      { label: 'Sharp diagonal', paths: ['M17.25 16.5V6.5L14 3.25H10L6.75 6.5V17.5L9.5 20.25H11L13.75 17.5V8.5L12 6.75L10.25 8.5V15.5'], rotate: 45 },
      { label: 'Sharp upright', paths: ['M17.25 16.5V6.5L14 3.25H10L6.75 6.5V17.5L9.5 20.25H11L13.75 17.5V8.5L12 6.75L10.25 8.5V15.5'] },
    ],
    defaultVariant: 1 },
  { name: 'close', replaces: 'Cross', pages: 10, keywords: ['close', 'cross', 'x', 'dismiss', 'cancel'],
    paths: ['M5 5L19 19', 'M19 5L5 19'] },
  { name: 'play', grow: 1.25, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Play-filled', pages: 9, keywords: ['play', 'video', 'start', 'watch'],
    paths: ['M8.75 6V18L18.25 12Z'] },
  { name: 'check', replaces: 'Check', pages: 9, keywords: ['check', 'done', 'tick', 'included', 'yes'],
    paths: ['M5 12.5L9.5 17L19 7.5'] },
  // Not on clueso.io today (only LinkedIn and an external-link arrow); added as an option set.
  { name: 'link', replaces: 'New (no link icon on the site yet)', pages: 0, keywords: ['link', 'chain', 'url', 'connect', 'hyperlink'],
    // Round 4, much tighter: halves 1.5 apart, the bar running 3 units into each, and
    // the diagonals drawn at their final size (turned −45° here, not scaled up to fill
    // the box, which spread the parts out again).
    paths: ['M11.25 8.75H7.25A3.25 3.25 0 0 0 7.25 15.25H11.25', 'M12.75 8.75H16.75A3.25 3.25 0 0 1 16.75 15.25H12.75', 'M8.25 12H15.75'],
    variants: [
      { label: 'Horizontal' },
      { label: 'Diagonal', paths: ['M9.171 10.232L6.343 13.06A3.25 3.25 -45 0 0 10.939 17.656L13.767 14.828', 'M10.232 9.171L13.06 6.343A3.25 3.25 -45 0 1 17.656 10.939L14.828 13.767', 'M9.348 14.651L14.651 9.348'] },
      { label: 'Sharp diagonal', paths: ['M9.171 10.232L6.166 13.237V17.126L6.873 17.833H10.762L13.767 14.828', 'M10.232 9.171L13.237 6.166H17.126L17.833 6.873V10.762L14.828 13.767', 'M9.348 14.651L14.651 9.348'] },
      { label: 'Sharp horizontal', paths: ['M11.25 8.75H7L4.25 11.5V12.5L7 15.25H11.25', 'M12.75 8.75H17L19.75 11.5V12.5L17 15.25H12.75', 'M8.25 12H15.75'] },
    ],
    defaultVariant: 1 }, // round 23: the S-stroke option was removed (she didn't like it); back to Diagonal

  // ---- Next 20 (round 2): ranks 21–40 by page count. Users-two is covered by
  // `users` and 5-Point-Star by `star`; brand marks and rating badges are left out.
  { name: 'star', grow: 1.08, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Star + 5-Point-Star', pages: 10, keywords: ['star', 'favourite', 'rating', 'review'],
    // Circle keyline; the mitred tips reach about 1.7 past each point, so points stop at 3.5–20.5.
    paths: ['M12 3.75L14.75 9L20.5 10L16.25 14.25L17.25 20L12 17.25L6.75 20L7.75 14.25L3.5 10L9.25 9Z'] },
  { name: 'translate', grow: 1.12, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Translate + IconTranslate', pages: 9, keywords: ['translate', 'language', 'localise', 'localize', 'dub'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'translate').
    paths: ['M2.25 5.75H16', 'M9 3V5.75', 'M5.75 8C7 11 9.25 13.75 12.5 15.75', 'M14 6.75C12.5 11 9 15 3.5 17.75', 'M12.75 21L16.5 10.25H18L21.75 21', 'M14 17.75H20.5'] },
  { name: 'video-ai', replaces: 'Video-AI + IconVideoAI', pages: 5, keywords: ['video', 'ai', 'generate', 'camera', 'clip'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.5 5.25H16.75V18.75H3.5Z', 'M16.75 10L21.25 7V17L16.75 14'],
    fills: ['M10.1 8.75L11.14 10.96L13.35 12L11.14 13.04L10.1 15.25L9.06 13.04L6.85 12L9.06 10.96Z'] },
  { name: 'wand-ai', replaces: 'Wand-AI', pages: 5, keywords: ['wand', 'magic', 'ai', 'enhance', 'auto'],
    // Round 17: redrawn on Google's wand_stars. A diagonal wand with a separate tip, the large AI
    // sparkle (chat AI's) top left and the small one (mic AI's) bottom right.
    paths: ['M4 20L14.5 9.5', 'M16 8L19.25 4.75'],
    fills: ['M8 4.25L9.25 6.75L11.75 8L9.25 9.25L8 11.75L6.75 9.25L4.25 8L6.75 6.75Z', 'M17.5 14L18.46 16.04L20.5 17L18.46 17.96L17.5 20L16.54 17.96L14.5 17L16.54 16.04Z'] },
  { name: 'confetti', replaces: 'Confetti', pages: 5, keywords: ['confetti', 'party', 'celebrate', 'launch', 'popper'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.25 20.25L8.25 10.25L14.25 16.25Z', 'M13.25 3V6.25', 'M16.75 7.25L19.75 4.25', 'M17.75 10.75H21'],
    fills: ['M9.5 4.5H11V6H9.5Z', 'M19.25 14.25H20.75V15.75H19.25Z'] },
  { name: 'book-open', replaces: 'Book_open', pages: 4, keywords: ['book', 'open', 'read', 'guide', 'docs', 'learn'],
    // Round 12: consistency pass (shared family base / restored version).
    // Round 24 (ref 02, Nucleo): the open book sits on a base line, which gives it weight.
    paths: ['M12 5.5L9.75 3.25H2.75V15H9.75L12 17.25L14.25 15H21.25V3.25H14.25Z', 'M12 5.5V17.25', 'M2.75 20.75H21.25'] },
  { name: 'arrow-right', replaces: 'Arrow-right', pages: 3, keywords: ['arrow', 'right', 'next', 'go'],
    paths: ['M4 12H19', 'M13 6L19 12L13 18'] },
  { name: 'search', replaces: 'Search (page code)', pages: 3, keywords: ['search', 'find', 'magnifier', 'look'],
    paths: ['M3.75 10.5A6.75 6.75 0 1 0 17.25 10.5A6.75 6.75 0 1 0 3.75 10.5Z', 'M15.5 15.5L21 21'] },
  { name: 'location', replaces: 'Location pin', pages: 3, keywords: ['location', 'pin', 'map', 'place', 'office'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.75 10A7.25 7.25 0 0 1 19.25 10V13L12 20.25L4.75 13Z', 'M9.75 10A2.25 2.25 0 1 0 14.25 10A2.25 2.25 0 1 0 9.75 10Z'] },
  { name: 'briefcase', replaces: 'Briefcase', pages: 3, keywords: ['briefcase', 'job', 'work', 'career', 'business'],
    // Landscape keyline: handle top on 4, body 2–22 × 7–20.
    paths: ['M2.75 7.75H21.25V19.25H2.75Z', 'M8.75 7.75V4.75H15.25V7.75', 'M2.75 12.75H21.25'] },
  { name: 'download', replaces: 'Download', pages: 3, keywords: ['download', 'save', 'export'],
    // Round 24 (ref 01, line system): the arrow lands on a single baseline, no tray. Cleaner, sharper.
    paths: ['M12 3.25V16', 'M6.75 10.75L12 16L17.25 10.75', 'M4.75 20.25H19.25'] },
  { name: 'check-circle', replaces: 'Check_circle', pages: 3, keywords: ['check', 'done', 'success', 'circle', 'complete'],
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z', 'M7.75 12.25L10.75 15.25L16.25 9.75'] },
  { name: 'video', replaces: 'Video + Monitor with play', pages: 5, keywords: ['video', 'monitor', 'screen', 'play', 'watch'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 3.75H21.25V16.25H2.75Z', 'M8 20.25H16', 'M12 16.25V20.25'],
    fills: ['M9.75 6.75V13.25L15 10Z'] },
  { name: 'waveform', replaces: 'Waveform', pages: 2, keywords: ['waveform', 'audio', 'voice', 'sound', 'voiceover'],
    paths: ['M12 3V21', 'M7.75 6.5V17.5', 'M16.25 6.5V17.5', 'M3.75 10V14', 'M20.25 10V14'] },
  { name: 'lock', replaces: 'Lock', pages: 2, keywords: ['lock', 'secure', 'private', 'password', 'security'],
    paths: ['M4.75 10.75H19.25V20.25H4.75Z', 'M7.75 10.75V7A4.25 4.25 0 0 1 16.25 7V10.75', 'M12 14V17'] },
  { name: 'megaphone', replaces: 'Megaphone', pages: 2, keywords: ['megaphone', 'announce', 'marketing', 'launch', 'news'],
    // Round 11: on Google's construction.
    // Round 23: the horn was half the box (it read much smaller than today's icon in context).
    // Now the horn is the icon: wide mouth (5–19), the sound lines short at the edge.
    paths: ['M3.75 9H7.75L14.25 5.25V18.75L7.75 15H3.75Z', 'M6.75 15V19.75', 'M17.75 12H21', 'M17.5 7.75L20.25 5.75', 'M17.5 16.25L20.25 18.25'] },
  { name: 'file-ppt', replaces: 'File-PPT + IconPPT', pages: 3, keywords: ['ppt', 'powerpoint', 'slides', 'presentation'],
    // Round 12: consistency pass (shared family base / restored version).
    // Round 23: a slide, not a document: the landscape frame of GIF / 4K / PDF with PPT on it, on
    // the same letter construction as PDF (cap height 9.5–15, letters 2.5 wide, even air between).
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M5.5 15V9.5H8V12.75H5.5', 'M10.75 15V9.5H13.25V12.75H10.75', 'M15.75 9.5H18.75', 'M17.25 9.5V15'] },
  { name: 'pencil-ai', replaces: 'Pencil-AI', pages: 2, keywords: ['pencil', 'edit', 'write', 'ai', 'rewrite'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.75 19.25V16.25L15 6L18 9L7.75 19.25Z', 'M15 6L16.75 4.25L19.75 7.25L18 9', 'M12.75 8.25L15.75 11.25'],
    fills: ['M6.25 3.25L7.21 5.29L9.25 6.25L7.21 7.21L6.25 9.25L5.29 7.21L3.25 6.25L5.29 5.29Z'] },
  { name: 'eye', replaces: 'Eye', pages: 2, keywords: ['eye', 'view', 'preview', 'visible', 'show'],
    // Sharp almond: 45° on all four sides.
    paths: ['M3.25 12L8.5 6.75H15.5L20.75 12L15.5 17.25H8.5Z', 'M9.25 12A2.75 2.75 0 1 0 14.75 12A2.75 2.75 0 1 0 9.25 12Z'] },
  { name: 'record', replaces: 'Record', pages: 2, keywords: ['record', 'recording', 'capture', 'rec'],
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z'],
    fills: ['M7.5 12A4.5 4.5 0 1 0 16.5 12A4.5 4.5 0 1 0 7.5 12Z'] },

  // ---- Next 40 (round 3): ranks 41–80 by page count. Brand marks, the Clueprint
  // product mark, and icons the library already covers (Layers, Sliding-knobs,
  // Users-three) are left out.
  { name: 'book', replaces: 'Book + IconBook', pages: 3, keywords: ['book', 'guide', 'manual', 'read', 'learn'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M7.75 2.75H19.25V21.25H7.75L4.75 18.25V5.75Z', 'M4.75 18.25L7.75 15.25H19.25'] },
  { name: 'clipboard', replaces: 'Clipboard + IconClipboard', pages: 3, keywords: ['clipboard', 'list', 'notes', 'tasks', 'checklist'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M8.75 4.75H4.75V21.25H19.25V4.75H15.25', 'M8.75 2.75H15.25V6.75H8.75Z'] },
  { name: 'document', replaces: 'Document', pages: 2, keywords: ['document', 'doc', 'page', 'file', 'text'],
    // Round 22: the Style A document becomes the base: the folded corner, and a pixel starting the
    // first line of text (the highlighted line).
    paths: ['M4.75 2.75H14.25L19.25 7.75V21.25H4.75Z', 'M14.25 2.75V7.75H19.25', 'M12 12.25H15.75', 'M8.25 16.25H15.75'],
    fills: ['M8 11.25H10V13.25H8Z'] },
  { name: 'pen', replaces: 'Pen', pages: 2, keywords: ['pen', 'write', 'sign', 'ink', 'draw'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.25 19.75L5.25 15.75L15 6L18 9L8.25 18.75Z', 'M12.75 8.25L15.75 11.25', 'M4.25 19.75L7 17'] },
  { name: 'paint-brush', replaces: 'Wall-Paint-Brush + Paintbrush', pages: 3, keywords: ['paint', 'brush', 'brand', 'style', 'theme', 'design'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M10.25 13.25L17.75 5.75L20.25 8.25L12.75 15.75Z', 'M3.75 20.25C5.25 20.25 5.25 18.75 5.25 17.75A2.5 2.5 0 1 1 7.75 20.25Z'] },
  { name: 'code', replaces: 'Code', pages: 2, keywords: ['code', 'developer', 'embed', 'html', 'api'],
    paths: ['M8.25 7L3.25 12L8.25 17', 'M15.75 7L20.75 12L15.75 17', 'M13.5 5L10.5 19'] },
  { name: 'user', grow: 1.12, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'User', pages: 4, keywords: ['user', 'person', 'profile', 'account', 'avatar'],
    // Round 11: on Google's construction (built from the base person).
    paths: ['M8.75 7.5A3.25 3.25 0 1 0 15.25 7.5A3.25 3.25 0 1 0 8.75 7.5Z', 'M4.75 19.25V17.25C4.75 15.75 8 14 12 14C16 14 19.25 15.75 19.25 17.25V19.25Z'] },
  { name: 'mic-ai', replaces: 'Mic-AI + Microphone with sparkle', pages: 1, keywords: ['mic', 'microphone', 'ai', 'voice', 'voiceover'],
    // Round 11: on Google's construction (built from the base mic).
    paths: ['M6.25 6A3.25 3.25 0 0 1 12.75 6V10A3.25 3.25 0 0 1 6.25 10Z', 'M2.75 10A6.75 6.75 0 0 0 16.25 10', 'M9.5 16.75V21'],
    fills: ['M18.5 2.25L19.46 4.29L21.5 5.25L19.46 6.21L18.5 8.25L17.54 6.21L15.5 5.25L17.54 4.29Z'] },
  { name: 'bar-chart', replaces: 'Bar-graph_alt', pages: 1, keywords: ['bar', 'chart', 'graph', 'analytics', 'stats'],
    paths: ['M3.75 9.75H9.25V20.25H3.75Z', 'M9.25 3.75H14.75V20.25H9.25Z', 'M14.75 12.75H20.25V20.25H14.75Z'] },
  { name: 'curve', replaces: 'Curve', pages: 1, keywords: ['curve', 'chart', 'graph', 'easing', 'growth'],
    // Axes, then a flat start, a 45° climb and a flat finish (an ease curve, kept sharp).
    paths: ['M3.75 3V20.25H21', 'M7 16.25H9.5L16.5 9.25H20'] },
  { name: 'trend-up', replaces: 'Upward-trend', pages: 1, keywords: ['trend', 'growth', 'up', 'increase', 'chart'],
    paths: ['M2.75 18.25L8.25 12.75L12.25 16.75L20.25 8.75', 'M14.75 8.75H20.25V14.25'] },
  { name: 'phone', replaces: 'Telephone_ringing', pages: 1, keywords: ['phone', 'call', 'telephone', 'contact', 'ringing'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.25 3.75A16 16 0 0 0 20.25 19.75', 'M4.25 3.75H8.5L9.75 8.25L6.4 11.75', 'M20.25 19.75V15.5L15.75 14.25L12.25 17.6', 'M13 3.5A8 8 0 0 1 21 11.5', 'M13 7.5A4 4 0 0 1 17 11.5'] },
  { name: 'headphones', replaces: 'Headphones', pages: 1, keywords: ['headphones', 'audio', 'listen', 'sound', 'music'],
    // Round 5: a round band (the chamfered one read as a house) and square ear cups.
    paths: ['M3.75 15V12A8.25 8.25 0 0 1 20.25 12V15', 'M3.75 13.75H8.25V20.25H3.75Z', 'M15.75 13.75H20.25V20.25H15.75Z'] },
  { name: 'headset', replaces: 'Headphones-mic', pages: 1, keywords: ['headset', 'support', 'help', 'mic', 'call', 'headphones'],
    // Round 5: `headphones` raised, with a boom that curves from the right cup to a
    // solid mouthpiece.
    paths: ['M3.75 12V10.5A8.25 8.25 0 0 1 20.25 10.5V12', 'M3.75 11.25H7.75V17.25H3.75Z', 'M16.25 11.25H20.25V17.25H16.25Z', 'M18.25 17.25V18.25A3 3 0 0 1 15.25 21.25H12'],
    fills: ['M9.5 20.25H12.5V22H9.5Z'] },
  { name: 'animation', replaces: 'Animation', pages: 1, keywords: ['animation', 'motion', 'move', 'animate', 'speed'],
    // Round 18: a bouncing ball (after the Clueso library 'Animation'): the trail arches, touches down
    // and rises toward the ball.
    paths: ['M15.25 9.75A3 3 0 1 0 21.25 9.75A3 3 0 1 0 15.25 9.75Z', 'M3 20.25C3 13 4.75 7.25 6.75 7.25C8.75 7.25 10.5 13 10.5 20.25', 'M10.5 20.25C10.5 16.5 11.75 13.75 13 13.25'] },
  { name: 'callout', replaces: 'Callout', pages: 1, keywords: ['callout', 'annotation', 'tooltip', 'label', 'highlight'],
    // Round 11: on Google's construction.
    paths: ['M2.75 4.75H21.25V16.25H15.5L12 19.75L8.5 16.25H2.75Z'] },
  { name: 'line-height', replaces: 'Line-height', pages: 1, keywords: ['line', 'height', 'leading', 'text', 'typography'],
    paths: ['M3.75 3.75H20.25', 'M3.75 20.25H20.25', 'M7.5 17.25L11.25 7.75H12.75L16.5 17.25', 'M9 14H15'] },
  { name: 'swatches', replaces: 'Swatches', pages: 1, keywords: ['swatches', 'colour', 'color', 'palette', 'brand', 'theme'],
    // Three cards fanned at 0°, 45° and 90° from the same corner.
    paths: ['M3.75 3.75H9.75V20.25H3.75Z', 'M9.75 7.5L13.25 4L18.5 9.25L9.75 18', 'M14.25 14.25H20.25V20.25H9.75'],
    fills: ['M6 16.25H7.75V18H6Z'] },
  { name: 'thumbs-up', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Thumbs-up', pages: 2, keywords: ['thumbs', 'like', 'approve', 'good', 'feedback'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.75 9.25H6.75V19.75H3.75Z', 'M6.75 9.25L11.75 4.25L12.5 5L11.5 9.25H20.25V11L17.75 19.75H6.75'] },
  { name: 'eye-off', replaces: 'Eye-slashed', pages: 1, keywords: ['eye', 'hide', 'hidden', 'invisible', 'private'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'eye-off').
    paths: ['M3.25 12L8.5 6.75H15.5L20.75 12L15.5 17.25H8.5Z', 'M9.25 12A2.75 2.75 0 1 0 14.75 12A2.75 2.75 0 1 0 9.25 12Z', 'M3.75 3.75L20.25 20.25'] },
  { name: '4k', replaces: '4K', pages: 1, keywords: ['4k', 'resolution', 'quality', 'hd', 'video'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M7.25 9V12.75H10.75', 'M9.75 9V15', 'M13.25 9V15', 'M17 9L14 12L17 15'] },
  { name: 'captions', replaces: 'Closed-Captions + Closed captions (CC)', pages: 3, keywords: ['captions', 'cc', 'subtitles', 'closed', 'accessibility'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M9.75 9.5H6.75V14.5H9.75', 'M17.25 9.5H14.25V14.5H17.25'] },
  { name: 'mic', replaces: 'Mic', pages: 1, keywords: ['mic', 'microphone', 'voice', 'record', 'audio'],
    // Round 11: on Google's construction (built from the base mic).
    paths: ['M8.75 6A3.25 3.25 0 0 1 15.25 6V10A3.25 3.25 0 0 1 8.75 10Z', 'M5.25 10A6.75 6.75 0 0 0 18.75 10', 'M12 16.75V21'] },
  { name: 'music', replaces: 'Musical-notes', pages: 1, keywords: ['music', 'note', 'audio', 'soundtrack', 'song'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'music').
    paths: ['M13.25 17.5V3.75H17.75V6.5H13.25', 'M7.75 17.5A2.75 2.75 0 1 0 13.25 17.5A2.75 2.75 0 1 0 7.75 17.5Z'] },
  { name: 'speaker', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Speaker_high-filled', pages: 1, keywords: ['speaker', 'volume', 'sound', 'audio', 'loud'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.75 9.25H7.25L11.25 5.75V18.25L7.25 14.75H3.75Z', 'M14.25 8.75A3.25 3.25 0 0 1 14.25 15.25', 'M14.25 4.25A8 8 0 0 1 14.25 19.75'] },
  { name: 'gear', replaces: 'Gear', pages: 1, keywords: ['gear', 'settings', 'cog', 'preferences', 'configure'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'gear').
    paths: ['M9.95 5.31L10.51 3.12L13.49 3.12L14.05 5.31A7 7 0 0 1 16.77 6.88L16.77 6.88L18.94 6.28L20.43 8.85L18.82 10.43A7 7 0 0 1 18.82 13.57L18.82 13.57L20.43 15.15L18.94 17.72L16.77 17.12A7 7 0 0 1 14.05 18.69L14.05 18.69L13.49 20.88L10.51 20.88L9.95 18.69A7 7 0 0 1 7.23 17.12L7.23 17.12L5.06 17.72L3.57 15.15L5.18 13.57A7 7 0 0 1 5.18 10.43L5.18 10.43L3.57 8.85L5.06 6.28L7.23 6.88A7 7 0 0 1 9.95 5.31Z', 'M9 12A3 3 0 1 0 15 12A3 3 0 1 0 9 12Z'] },
  { name: 'plug', replaces: 'Plugs_diagonal-connected', pages: 1, keywords: ['plug', 'integration', 'connect', 'connected', 'plugin'],
    // Round 4: one plug instead of two joined halves (which read as a robot). Two prongs,
    // a body chamfered into the cable. Drawn upright, turned 45°.
    paths: ['M9.75 2.75V6.25', 'M14.25 2.75V6.25', 'M6.75 6.25H17.25V12.25L14.25 15.25H9.75L6.75 12.25Z', 'M12 15.25V21.25'],
    variants: [{ label: 'Diagonal', rotate: 45 }, { label: 'Upright' }], defaultVariant: 0 },
  { name: 'bank', replaces: 'Bank', pages: 1, keywords: ['bank', 'finance', 'payout', 'money', 'affiliate'],
    // Round 4: a 45° pediment (the classic bank front), three columns, a wide base.
    paths: ['M4.75 9.75L12 2.75L19.25 9.75Z', 'M7 12.75V17.25', 'M12 12.75V17.25', 'M17 12.75V17.25', 'M2.75 20.25H21.25'] },
  { name: 'dollar-circle', replaces: 'Dollar-Circle', pages: 1, keywords: ['dollar', 'money', 'price', 'pricing', 'payment', 'cost'],
    // A chamfered S.
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z', 'M15 8.75H10.5L9 10.25V11L10.25 12.25H13.75L15 13.5V14.25L13.5 15.75H9', 'M12 6V8.75', 'M12 15.75V18'] },
  { name: 'map', replaces: 'Map', pages: 1, keywords: ['map', 'route', 'guide', 'journey'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'map').
    paths: ['M3.25 6.25L9 4L15 6.25L20.75 4V18L15 20.25L9 18L3.25 20.25Z', 'M9 4V18', 'M15 6.25V20.25'] },
  { name: 'cube', replaces: 'Cube', pages: 1, keywords: ['cube', '3d', 'box', 'object', 'model'],
    // Front square and back square joined at 45° (oblique, not isometric, so it stays on the grid).
    paths: ['M3.75 8.75H15.25V20.25H3.75Z', 'M3.75 8.75L8.75 3.75H20.25V15.25L15.25 20.25', 'M15.25 8.75L20.25 3.75'] },
  { name: 'star-4', replaces: 'Star-alt', pages: 1, keywords: ['star', 'sparkle', 'highlight', 'magic', 'new'],
    // One large four-point star; tips set in so the mitres stay clear of the padding.
    paths: ['M12 4.5L14 10L19.5 12L14 14L12 19.5L10 14L4.5 12L10 10Z'] },
  { name: 'scroll', replaces: 'Paper-folded + Script / receipt', pages: 2, keywords: ['scroll', 'script', 'paper', 'receipt', 'policy'],
    // Round 11: on Google's construction. Round 17: the torn edge starts and ends in a valley
    // (it started on a peak, a spike at the front corner) with true 45° teeth.
    paths: ['M6.25 16.25V4.75L7.9375 3.0625L9.625 4.75L11.3125 3.0625L13 4.75L14.6875 3.0625L16.375 4.75L18.0625 3.0625L19.75 4.75V18.5A2.5 2.5 0 0 1 14.75 18.5V16.25H3.75V18.5A2.75 2.75 0 0 0 6.5 21.25H17.25', 'M9.25 8H13.25', 'M9.25 11.25H13.25'],
    fills: ['M15.5 7.25H17.25V9H15.5Z', 'M15.5 10.5H17.25V12.25H15.5Z'] },
  { name: 'pencil', replaces: 'Pencil', pages: 1, keywords: ['pencil', 'edit', 'write', 'rename', 'draw'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.75 19.25V16.25L15 6L18 9L7.75 19.25Z', 'M15 6L16.75 4.25L19.75 7.25L18 9', 'M12.75 8.25L15.75 11.25'] },
  { name: 'bookmark', replaces: 'Bookmark-filled', pages: 1, keywords: ['bookmark', 'save', 'saved', 'favourite'],
    // Bottom kept at 20 so the notch's mitred points stay inside the padding.
    paths: ['M5.75 2.75H18.25V20L12 13.75L5.75 20Z'] },
  { name: 'cursor', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Cursor_no-tail', pages: 1, keywords: ['cursor', 'pointer', 'click', 'select', 'mouse'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.75 4.75L10.75 19.75L12.75 12.75L19.75 10.75Z'] },
  { name: 'external-link', replaces: 'External-link', pages: 1, keywords: ['external', 'link', 'open', 'new', 'tab'],
    paths: ['M10.75 4.75H4.75V19.25H19.25V13.25', 'M11 13L20.25 3.75', 'M13.75 3.75H20.25V10.25'] },
  { name: 'user-check', replaces: 'User_check', pages: 1, keywords: ['user', 'check', 'verified', 'approved', 'member'],
    // Round 11: on Google's construction (built from the base person).
    // Round 14: the check moved up beside the head (where user plus has its plus), clear of the body.
    paths: ['M6.24 9.26A2.76 2.76 0 1 0 11.76 9.26A2.76 2.76 0 1 0 6.24 9.26Z', 'M2.84 19.25V17.55C2.84 16.27 5.6 14.79 9 14.79C12.4 14.79 15.16 16.27 15.16 17.55V19.25Z', 'M15.75 10.75L17.75 12.75L21.25 9.25'] },
  { name: 'effects', replaces: 'Effects + Fx (effects)', pages: 2, keywords: ['effects', 'fx', 'filter', 'visual', 'flare'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'effects').
    paths: ['M12 2.75V7.25', 'M12 16.75V21.25', 'M2.75 12H7.25', 'M16.75 12H21.25', 'M7.75 7.75L6.25 6.25', 'M16.25 7.75L17.75 6.25', 'M7.75 16.25L6.25 17.75', 'M16.25 16.25L17.75 17.75'],
    fills: ['M10.5 10.5H13.5V13.5H10.5Z'] },
  { name: 'lightning', replaces: 'Lightning-bolt', pages: 2, keywords: ['lightning', 'bolt', 'fast', 'instant', 'power'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'lightning').
    paths: ['M14 3.75L5.75 13.75H11.5L9.5 20.25L18 10.25H12.75Z'] },

  // ---- Round 7: icons on clueso.io we hadn't drawn yet. Our style (monoline 1.5, square ends,
  // chamfers), following the construction of Google's Material Symbols icon of the same name
  // (shown behind with the tool's Google toggle). Page data comes from tools/clueso-manifest.js.
  { name: 'upload', replaces: 'Upload', pages: 1, keywords: ['upload', 'import', 'add'],
    // Round 24 (ref 01): leaves a single baseline, the pair of download.
    paths: ['M12 16V3.25', 'M6.75 8.5L12 3.25L17.25 8.5', 'M4.75 20.25H19.25'] },
  { name: 'expand', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Expand arrows', pages: 1, keywords: ['expand', 'fullscreen', 'resize', 'open'],
    paths: ['M14 3.75H20.25V10', 'M20.25 3.75L13.5 10.5', 'M10 20.25H3.75V14', 'M3.75 20.25L10.5 13.5'] },
  { name: 'refresh', replaces: 'Refresh / sync', pages: 1, keywords: ['refresh', 'sync', 'update', 'reload'],
    paths: ['M5.25 12A6.75 6.75 0 0 1 16.77 7.23', 'M12.75 7.75H17.25V3.25', 'M18.75 12A6.75 6.75 0 0 1 7.23 16.77', 'M11.25 16.25H6.75V20.75'] },
  { name: 'replay', replaces: 'Play with loop', pages: 1, keywords: ['replay', 'loop', 'autoplay', 'repeat'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'replay').
    paths: ['M19.73 14.32A8 8 0 0 1 4.48 14.99', 'M4.39 9.78A8 8 0 0 1 6.44 6.5', 'M8.24 5.19A8 8 0 0 1 11.44 4.27', 'M12.56 4.27A8 8 0 0 1 15.76 5.19', 'M17.56 6.5A8 8 0 0 1 19.61 9.78', 'M3.25 19.25V14.75H7.75'],
    fills: ['M10 8.75V15.75L15.5 12.25Z'] },
  { name: 'share', replaces: 'Share', pages: 1, keywords: ['share', 'send', 'network'],
    paths: ['M15.25 5.5A2.25 2.25 0 1 0 19.75 5.5A2.25 2.25 0 1 0 15.25 5.5Z', 'M4.25 12A2.25 2.25 0 1 0 8.75 12A2.25 2.25 0 1 0 4.25 12Z', 'M15.25 18.5A2.25 2.25 0 1 0 19.75 18.5A2.25 2.25 0 1 0 15.25 18.5Z', 'M8.5 10.75L15.5 6.75', 'M8.5 13.25L15.5 17.25'] },
  { name: 'text-field', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Text cursor in field', pages: 1, keywords: ['text', 'field', 'input', 'cursor', 'type'],
    paths: ['M9 7.25H3.75V16.75H9', 'M15 7.25H20.25V16.75H15', 'M12 4.75V19.25', 'M9.75 4.75H14.25', 'M9.75 19.25H14.25'] },
  { name: 'clueprint', replaces: 'Clueprint', pages: 1, keywords: ['clueprint', 'template', 'frame', 'play', 'video'],
    paths: ['M3.75 8.25V3.75H8.25', 'M15.75 3.75H20.25V8.25', 'M20.25 15.75V20.25H15.75', 'M8.25 20.25H3.75V15.75'],
    fills: ['M9.75 8V16L16 12Z'] },
  { name: 'film', replaces: 'Film reel', pages: 1, keywords: ['film', 'movie', 'reel', 'video'],
    // Round 8: redrawn in our style on Google's construction (Material Symbols 'film'). Round where Google is round.
    paths: ['M3 11.25A8.5 8.5 0 1 0 20 11.25A8.5 8.5 0 1 0 3 11.25Z', 'M11.5 19.75H21.25'],
    fills: ['M10.5 5.75H12.75V8H10.5Z', 'M15 10.25H17.25V12.5H15Z', 'M10.5 14.75H12.75V17H10.5Z', 'M6 10.25H8.25V12.5H6Z', 'M10.75 10.5H12.25V12H10.75Z'] },
  { name: 'gif', replaces: 'GIF', pages: 1, keywords: ['gif', 'animated', 'image'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M9.5 9.5H6.5V14.5H9.5V12.25H8', 'M12 9V15', 'M17.75 9.5H14.75V15', 'M14.75 12H17'] },
  { name: 'spotlight', replaces: 'Dot pattern (blur / spotlight)', pages: 1, keywords: ['spotlight', 'blur', 'dots', 'focus'],
    paths: [],
    fills: ['M10.75 10.75H13.5V13.5H10.75Z', 'M7.25 7.25H9V9H7.25Z', 'M15.25 7.25H17V9H15.25Z', 'M7.25 15.25H9V17H7.25Z', 'M15.25 15.25H17V17H15.25Z', 'M11.25 3.25H13V5H11.25Z', 'M11.25 19.25H13V21H11.25Z', 'M3.25 11.25H5V13H3.25Z', 'M19.25 11.25H21V13H19.25Z', 'M3.25 3.25H4.75V4.75H3.25Z', 'M19.25 3.25H20.75V4.75H19.25Z', 'M3.25 19.25H4.75V20.75H3.25Z', 'M19.25 19.25H20.75V20.75H19.25Z'] },
  { name: 'scissors', replaces: 'Scissors + IconScissors', pages: 2, keywords: ['scissors', 'cut', 'trim', 'clip'],
    paths: ['M3.5 6A2.5 2.5 0 1 0 8.5 6A2.5 2.5 0 1 0 3.5 6Z', 'M3.5 18A2.5 2.5 0 1 0 8.5 18A2.5 2.5 0 1 0 3.5 18Z', 'M7.75 7.75L20.25 20.25', 'M7.75 16.25L20.25 3.75'] },
  { name: 'laptop', replaces: 'Laptop', pages: 1, keywords: ['laptop', 'computer', 'device', 'remote'],
    // Round 11: on Google's construction.
    paths: ['M4.75 4.75H19.25V14.25H4.75Z', 'M2.75 19.25H21.25'] },
  { name: 'folder', replaces: 'IconFolder', pages: 1, keywords: ['folder', 'files', 'directory', 'organise'],
    paths: ['M2.75 4.75H9.25L11.25 6.75H21.25V19.25H2.75Z'] },
  { name: 'embed', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'IconEmbeds', pages: 1, keywords: ['embed', 'code', 'widget', 'block'],
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M10 9L7 12L10 15', 'M14 9L17 12L14 15'] },
  { name: 'chat', replaces: 'Chat bubble + IconChat', pages: 2, keywords: ['chat', 'message', 'comment', 'bubble'],
    paths: ['M3.75 3.75H20.25V16.25H7L3.75 19.5Z'] },
  { name: 'users-three', replaces: 'Users-three + Users group', pages: 2, keywords: ['users', 'team', 'group', 'people', 'three'],
    // Round 11: on Google's construction (built from the base person).
    // Round 14: built from users: the same front person in the middle and users' back person
    // (open head, shoulder) mirrored on both sides, so the family matches. Fitted to the live area.
    paths: ['M9.24 9.26A2.76 2.76 0 1 0 14.76 9.26A2.76 2.76 0 1 0 9.24 9.26Z', 'M5.84 19.25V17.55C5.84 16.27 8.6 14.79 12 14.79C15.4 14.79 18.16 16.27 18.16 17.55V19.25Z', 'M18.04 6.59A2.76 2.76 0 1 1 18.04 11.93', 'M5.96 6.59A2.76 2.76 0 1 0 5.96 11.93', 'M19.6 14.83C21.15 15.05 21.9 15.8 21.9 16.9V19.25', 'M4.4 14.83C2.85 15.05 2.1 15.8 2.1 16.9V19.25'] },
  { name: 'heart', replaces: 'HeartIcon', pages: 1, keywords: ['heart', 'love', 'favourite', 'like'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M12 20.25L3.75 12V7.25L6.75 4.25H9L12 7.25L15 4.25H17.25L20.25 7.25V12Z'] },
  { name: 'pie-chart', replaces: 'Pie chart', pages: 1, keywords: ['pie', 'chart', 'share', 'analytics'],
    // Round 23: her favourite from the Sharp references: one slice, top to centre to lower left.
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z', 'M12 2.75V12L5.46 18.54'] },
  { name: 'dollar', replaces: 'Dollar', pages: 1, keywords: ['dollar', 'money', 'price', 'cost'],
    paths: ['M16.5 6.75H9.5L7.25 9V10.25L9.25 12.25H14.75L16.75 14.25V15.25L14.5 17.5H7.25', 'M12 3V6.75', 'M12 17.5V21'] },
  { name: 'utensils', replaces: 'UtensilsIcon', pages: 1, keywords: ['utensils', 'food', 'meals', 'restaurant', 'lunch'],
    // Round 11: on Google's construction.
    paths: ['M5.5 2.75V7.75A2.75 2.75 0 0 0 11 7.75V2.75', 'M8.25 2.75V7.25', 'M8.25 10.5V21.25', 'M18.25 21.25V2.75C16.25 3.25 15.25 6.25 15.25 9.25V13.75H18.25'] },
  { name: 'support', replaces: 'SupportIcon', pages: 1, keywords: ['support', 'help', 'agent', 'customer', 'headset'],
    // Round 22: a person wearing the headset (the headset family's band and ear pads), mic boom to the mouth.
    paths: ['M9.25 9.25A2.75 2.75 0 1 0 14.75 9.25A2.75 2.75 0 1 0 9.25 9.25Z', 'M5.75 11V9.25A6.25 6.25 0 0 1 18.25 9.25V11', 'M18.25 13.5V14.5H14.75',
      'M5.25 21.5V21C5.25 19.75 8.25 18.5 12 18.5C15.75 18.5 18.75 19.75 18.75 21V21.5'],
    fills: ['M4.25 10H6.75V13.75H4.25Z', 'M17.25 10H19.75V13.75H17.25Z'] },
  // ---- Round 9: site icons used after a click, in video players, on the education page and in the
  // new home page code. Our style on Google's construction.
  { name: 'chevron-up', replaces: 'Chevron-up (new home page chat; platform)', pages: 0, keywords: ['chevron', 'up', 'collapse', 'less'],
    paths: ['M6 15L12 9L18 15'] },
  { name: 'arrow-up', replaces: 'Arrow-up (new home page; back to top)', pages: 0, keywords: ['arrow', 'up', 'top', 'send'],
    paths: ['M12 20V5', 'M6 11L12 5L18 11'] },
  { name: 'more', replaces: 'Dots-three_horizontal (new home page editor; modals)', pages: 0, keywords: ['more', 'dots', 'menu', 'options', 'overflow'],
    paths: [],
    fills: ['M4.75 10.75H7.5V13.5H4.75Z', 'M10.75 10.75H13.5V13.5H10.75Z', 'M16.75 10.75H19.5V13.5H16.75Z'] },
  { name: 'image-ai', replaces: 'Image-AI (new home page features)', pages: 0, keywords: ['image', 'ai', 'generate', 'picture'],
    // Round 12: consistency pass (shared family base / restored version).
    // Round 23: it read almost the same as image (the sparkle sat where the sun is). Now the sparkle
    // sits on the frame, in a clean cut of its top-right corner, like image-plus's plus.
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M3.75 17L9 11.75L12.5 15.25L15 12.75L20.25 18'],
    badge: { fills: ['M18.5 2.25L19.6 4.65L22 5.75L19.6 6.85L18.5 9.25L17.4 6.85L15 5.75L17.4 4.65Z'] }, cut: [[13, -1, 25, 11.25]] },
  { name: 'waveform-ai', replaces: 'Waveform-AI (new home page editor)', pages: 0, keywords: ['waveform', 'ai', 'voice', 'audio', 'voiceover'],
    paths: ['M10.25 3V21', 'M6.75 7V17', 'M13.75 7V17', 'M3.25 10.5V13.5', 'M17.25 10.5V13.5'],
    fills: ['M18.75 2.5L19.6 4.9L22 5.75L19.6 6.6L18.75 9L17.9 6.6L15.5 5.75L17.9 4.9Z'] },
  { name: 'pause', replaces: 'Pause + IconPlayerPauseFilled (video players, education page)', pages: 0, keywords: ['pause', 'stop', 'video', 'player'],
    paths: ['M7.25 5.75H10.25V18.25H7.25Z', 'M13.75 5.75H16.75V18.25H13.75Z'] },
  { name: 'mute', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'IconVolumeOff (video players, education page)', pages: 0, keywords: ['mute', 'volume', 'off', 'sound', 'silent'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.75 9.25H7.25L11.25 5.75V18.25L7.25 14.75H3.75Z', 'M14.75 9.25L20.25 14.75', 'M20.25 9.25L14.75 14.75'] },
  { name: 'calendar', replaces: 'Calendar_simple (date picker; book a demo)', pages: 0, keywords: ['calendar', 'date', 'schedule', 'book', 'demo'],
    paths: ['M3.75 5.25H20.25V20.25H3.75Z', 'M3.75 9.75H20.25', 'M7.75 2.75V6.5', 'M16.25 2.75V6.5'] },
  { name: 'mail', replaces: 'Envelope (forms; contact)', pages: 0, keywords: ['mail', 'email', 'envelope', 'contact', 'message'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M2.75 4.75L12 11.25L21.25 4.75'] },
  { name: 'user-plus', replaces: 'User_plus (new home page editor; invite)', pages: 0, keywords: ['user', 'add', 'invite', 'plus', 'member'],
    // Round 11: on Google's construction (built from the base person).
    paths: ['M6.24 9.26A2.76 2.76 0 1 0 11.76 9.26A2.76 2.76 0 1 0 6.24 9.26Z', 'M2.84 19.25V17.55C2.84 16.27 5.6 14.79 9 14.79C12.4 14.79 15.16 16.27 15.16 17.55V19.25Z', 'M16.25 10.5H21.25', 'M18.75 8V13'] },
  { name: 'home', replaces: 'Home (breadcrumbs)', pages: 0, keywords: ['home', 'house', 'start'],
    // Round 23: her reference (a low-pitched house with one bar across its lower part), in our style:
    // sharp, 1.5, closed; the roof at Google's 3 : 4 pitch (an exception to rule 2, like the map).
    paths: ['M4.75 20.25V9.75L12 4.25L19.25 9.75V20.25Z', 'M8.75 16.25H15.25'] },
  { name: 'graduation-cap', replaces: 'IconSchool + Graduation-hat (education page)', pages: 0, keywords: ['graduation', 'education', 'school', 'learn', 'course'],
    paths: ['M2.75 9.75L12 4.75L21.25 9.75L12 14.75Z', 'M6.75 12.25V16.5L12 19.5L17.25 16.5V12.25', 'M20.75 10V15.75'] },
  { name: 'puzzle', replaces: 'IconPuzzle (education page; integrations)', pages: 0, keywords: ['puzzle', 'integration', 'plugin', 'extension'],
    paths: ['M4.25 5.75H9.5A2.5 2.5 0 0 1 14.5 5.75H19.75V11A2.5 2.5 0 0 1 19.75 16V20.25H4.25V16A2.5 2.5 0 0 0 4.25 11Z'] },
  // ---- Round 10 · Platform core actions (web.clueso.io). Our style on Google's construction.
  { name: 'delete', replaces: 'Bin', pages: 0, keywords: ['delete', 'bin', 'trash', 'remove'],
    // Round 24 (ref 01): an × in the bin, so it reads as delete (not just a bin).
    paths: ['M3.75 5.75H20.25', 'M9 5.75V3.25H15V5.75', 'M5.75 5.75V20.25H18.25V5.75', 'M9.75 10.75L14.25 15.25', 'M14.25 10.75L9.75 15.25'] },
  { name: 'warning', replaces: 'Caution', pages: 0, keywords: ['warning', 'caution', 'alert', 'error'],
    // Round 11: on Google's construction.
    paths: ['M10.75 4.25H13.25L21.25 18.25V19.75H2.75V18.25Z'],
    fills: ['M11 8.75H13V14.25H11Z', 'M11 15.5H13V17.5H11Z'] },
  { name: 'info', replaces: 'Info', pages: 0, keywords: ['info', 'information', 'about', 'details'],
    // Round 11: on Google's construction.
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z'],
    fills: ['M11 10.25H13V17.25H11Z', 'M11 6.25H13V8.25H11Z'] },
  { name: 'help', replaces: 'Question-mark', pages: 0, keywords: ['help', 'question', 'support', 'faq'],
    // Round 11: on Google's construction.
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z'],
    fills: ['M8.75 9.75V8.25L10.5 6.5H13.75L15.5 8.25V10.75L13 13V14.5H11V12.25L13.5 10V9L12.75 8.5H11.25L10.75 9V9.75Z', 'M11 16H13V18H11Z'] },
  { name: 'minus', replaces: 'Minus', pages: 0, keywords: ['minus', 'remove', 'subtract', 'less'],
    paths: ['M5 12H19'] },
  { name: 'history', replaces: 'History', pages: 0, keywords: ['history', 'recent', 'versions', 'time'],
    paths: ['M5.25 12A7.5 7.5 0 1 1 7.45 17.3', 'M2.75 9.5L5.25 12L7.75 9.5', 'M12.75 8V12.5L15.5 15.25'] },
  { name: 'undo', replaces: 'Arrow-turn-left-acw', pages: 0, keywords: ['undo', 'back', 'revert'],
    paths: ['M8 5.75L4.75 9L8 12.25', 'M4.75 9H14.5A4.75 4.75 0 0 1 14.5 18.5H7.5'] },
  { name: 'redo', replaces: 'Arrow-turn-right-cw', pages: 0, keywords: ['redo', 'forward', 'repeat'],
    paths: ['M16 5.75L19.25 9L16 12.25', 'M19.25 9H9.5A4.75 4.75 0 0 0 9.5 18.5H16.5'] },
  { name: 'rotate-cw', replaces: 'Rotate-circular-cw', pages: 0, keywords: ['rotate', 'regenerate', 'retry', 'clockwise'],
    // Round 11: on Google's construction.
    paths: ['M12 20.75A7.75 7.75 0 0 1 12 5.25H15', 'M12.25 2.25L15.25 5.25L12.25 8.25', 'M17.76 7.81A7.75 7.75 0 0 1 19.52 11.13', 'M19.63 14.35A7.75 7.75 0 0 1 18.11 17.77', 'M16.11 19.57A7.75 7.75 0 0 1 12.81 20.71'] },
  { name: 'rotate-acw', replaces: 'Rotate-circular-acw', pages: 0, keywords: ['rotate', 'anticlockwise', 'counterclockwise'],
    // Round 11: mirrored / turned from its pair, so the two match exactly.
    paths: ['M12 20.75A7.75 7.75 0 0 0 12 5.25L9 5.25', 'M11.75 2.25L8.75 5.25L11.75 8.25', 'M6.24 7.81A7.75 7.75 0 0 0 4.48 11.13', 'M4.37 14.35A7.75 7.75 0 0 0 5.89 17.77', 'M7.89 19.57A7.75 7.75 0 0 0 11.19 20.71'] },
  { name: 'spinner', replaces: 'Spinner', pages: 0, keywords: ['spinner', 'loading', 'progress', 'busy'],
    paths: ['M12 2.75A9.25 9.25 0 1 0 21.25 12'] },
  { name: 'cloud', replaces: 'Cloud', pages: 0, keywords: ['cloud', 'storage', 'online'],
    paths: ['M6.5 19.25H17.5A4.25 4.25 0 0 0 18 10.8A6 6 0 0 0 6.6 9.3A5 5 0 0 0 6.5 19.25Z'] },
  { name: 'cloud-sync', replaces: 'Cloud-rotate-cw + Cloud-asterisk', pages: 0, keywords: ['cloud', 'sync', 'saving'],
    // Round 11: on Google's construction.
    paths: ['M8.5 4A7.75 7.75 0 0 0 6.75 17.5', 'M3.75 18.25H8V14', 'M17.25 9.75A5.75 5.75 0 0 0 13.25 4.5', 'M10.75 7.75V3.75H14.75', 'M11.75 20.25H19.25A2.5 2.5 0 0 0 19 15.25A3.5 3.5 0 0 0 12.25 15.5A2.4 2.4 0 0 0 11.75 20.25Z'] },
  { name: 'cloud-done', replaces: 'Cloud-check', pages: 0, keywords: ['cloud', 'saved', 'done', 'synced'],
    // Round 11: on Google's construction.
    // Round 23: the check passes through the cloud's lower edge, which breaks around it (her favourite).
    paths: ['M6.5 18.25H17.5A4.25 4.25 0 0 0 18 9.8A6 6 0 0 0 6.6 8.3A5 5 0 0 0 6.5 18.25Z'], badge: { paths: ['M8 15.25L11.5 18.75L16.75 13.5'] }, cut: [[7, 16.25, 14.75, 22.5]] },
  { name: 'cloud-off', replaces: 'Cloud-cross', pages: 0, keywords: ['cloud', 'offline', 'error', 'unsaved'],
    paths: ['M6.5 19.25H17.5A4.25 4.25 0 0 0 18 10.8A6 6 0 0 0 6.6 9.3A5 5 0 0 0 6.5 19.25Z', 'M3.75 3.75L20.25 20.25'] },
  { name: 'check-double', replaces: 'Check_double', pages: 0, keywords: ['check', 'double', 'read', 'done', 'all'],
    paths: ['M3 12.5L7 16.5L15.25 8.25', 'M11.25 16.5L20.75 7'] },
  { name: 'key', replaces: 'Key', pages: 0, keywords: ['key', 'password', 'access', 'api'],
    paths: ['M2.75 12A4.25 4.25 0 1 0 11.25 12A4.25 4.25 0 1 0 2.75 12Z', 'M11.25 12H21.25V15', 'M17.75 12V15'] },
  { name: 'lock-open', replaces: 'Lock_open', pages: 0, keywords: ['unlock', 'open', 'public'],
    paths: ['M4.75 10.75H19.25V20.25H4.75Z', 'M16.25 10.75V7A4.25 4.25 0 0 0 7.75 7V7.75', 'M12 14V17'] },
  { name: 'link-off', replaces: 'Link-broken', pages: 0, keywords: ['link', 'broken', 'unlink', 'off'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M9.171 10.232L6.343 13.06A3.25 3.25 -45 0 0 10.939 17.656L13.767 14.828', 'M10.232 9.171L13.06 6.343A3.25 3.25 -45 0 1 17.656 10.939L14.828 13.767', 'M4.25 4.25L19.75 19.75'] },
  { name: 'grid', replaces: 'Grid', pages: 0, keywords: ['grid', 'view', 'layout', 'gallery'],
    paths: ['M3.75 3.75H10.25V10.25H3.75Z', 'M13.75 3.75H20.25V10.25H13.75Z', 'M3.75 13.75H10.25V20.25H3.75Z', 'M13.75 13.75H20.25V20.25H13.75Z'] },
  { name: 'apps', replaces: 'Dots-nine', pages: 0, keywords: ['apps', 'dots', 'grid', 'launcher'],
    paths: [],
    fills: ['M4.5 4.5H7.5V7.5H4.5Z', 'M10.5 4.5H13.5V7.5H10.5Z', 'M16.5 4.5H19.5V7.5H16.5Z', 'M4.5 10.5H7.5V13.5H4.5Z', 'M10.5 10.5H13.5V13.5H10.5Z', 'M16.5 10.5H19.5V13.5H16.5Z', 'M4.5 16.5H7.5V19.5H4.5Z', 'M10.5 16.5H13.5V19.5H10.5Z', 'M16.5 16.5H19.5V19.5H16.5Z'] },
  { name: 'more-vertical', replaces: 'Dots-three_vertical', pages: 0, keywords: ['more', 'menu', 'options', 'vertical'],
    paths: [],
    fills: ['M10.75 4.75H13.5V7.5H10.75Z', 'M10.75 10.75H13.5V13.5H10.75Z', 'M10.75 16.75H13.5V19.5H10.75Z'] },
  { name: 'drag', replaces: 'Dots-six_vertical', pages: 0, keywords: ['drag', 'handle', 'reorder', 'move'],
    paths: [],
    fills: ['M7.75 4.75H10.5V7.5H7.75Z', 'M13.75 4.75H16.5V7.5H13.75Z', 'M7.75 10.75H10.5V13.5H7.75Z', 'M13.75 10.75H16.5V13.5H13.75Z', 'M7.75 16.75H10.5V19.5H7.75Z', 'M13.75 16.75H16.5V19.5H13.75Z'] },
  { name: 'folder-plus', replaces: 'Folder-plus + Folder-plus_alt', pages: 0, keywords: ['folder', 'new', 'add', 'create'],
    // Round 23: the plus sits in a clean cut of the folder's corner.
    paths: ['M2.75 4.75H9.25L11.25 6.75H21.25V19.25H2.75Z'], badge: { paths: ['M18.75 15.75V21.75', 'M15.75 18.75H21.75'] }, cut: [[13.25, 13.25, 25, 25]] },
  { name: 'folder-open', replaces: 'Folder_docs', pages: 0, keywords: ['folder', 'open', 'docs', 'files'],
    // Round 23: her reference: the folder (the base folder's tab and step, lower) with its open sheet,
    // a ⊓, floating 2 clear above it.
    paths: ['M2.75 10.5H8.75L10.75 12.5H21.25V20.25H2.75Z', 'M6.25 6.75V3.25H17.75V6.75'] },
  { name: 'file', replaces: 'File', pages: 0, keywords: ['file', 'page', 'blank'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M4.75 2.75H14.25L19.25 7.75V21.25H4.75Z', 'M14.25 2.75V7.75H19.25'] },
  { name: 'file-plus', replaces: 'File_plus', pages: 0, keywords: ['file', 'new', 'add', 'create'],
    // Round 12: consistency pass (shared family base / restored version).
    // Round 23: the plus sits in a clean cut of the page's corner (her Sharp references).
    paths: ['M4.75 2.75H14.25L19.25 7.75V21.25H4.75Z', 'M14.25 2.75V7.75H19.25'], badge: { paths: ['M18.75 15.75V21.75', 'M15.75 18.75H21.75'] }, cut: [[13.25, 13.25, 25, 25]] },
  { name: 'file-pdf', replaces: 'File-PDF', pages: 0, keywords: ['pdf', 'file', 'export', 'document'],
    // Round 12: consistency pass (shared family base / restored version).
    // Round 23: the letters on GIF and 4K's construction: same frame, cap height (9.5–15), widths and gaps.
    // Second pass: the letters 2.5 wide so there's even air between them (D and F nearly touched).
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M5.5 15V9.5H8V12.75H5.5', 'M10.75 9.5H12.25L13.25 10.5V14L12.25 15H10.75Z', 'M18.5 9.5H16V15', 'M16 12.25H18'] },
  { name: 'duplicate', replaces: 'Duplicate', pages: 0, keywords: ['duplicate', 'copy', 'clone'],
    // Round 18: two stacked squares with the plus in the front one: "another one of this". Copy has no
    // plus; a new file or canvas is a single page with a plus. Follows the Clueso library icon.
    paths: ['M8.75 3.75H20.25V15.25H8.75Z', 'M8 8.75H3.75V20.25H15.25V16', 'M14.5 6.75V12.25', 'M11.75 9.5H17.25'] },
  { name: 'zoom-in', replaces: 'Zoom-in', pages: 0, keywords: ['zoom', 'in', 'magnify', 'enlarge'],
    paths: ['M3.75 10.5A6.75 6.75 0 1 0 17.25 10.5A6.75 6.75 0 1 0 3.75 10.5Z', 'M15.5 15.5L21 21', 'M10.5 7.5V13.5', 'M7.5 10.5H13.5'] },
  { name: 'swap-horizontal', replaces: 'Arrows-right-left', pages: 0, keywords: ['swap', 'horizontal', 'arrows', 'exchange'],
    paths: ['M4.75 7.75H19.25', 'M15.25 3.75L19.25 7.75L15.25 11.75', 'M19.25 16.25H4.75', 'M8.75 12.25L4.75 16.25L8.75 20.25'] },
  { name: 'swap-vertical', replaces: 'Arrows-up-down', pages: 0, keywords: ['swap', 'vertical', 'arrows', 'sort'],
    paths: ['M7.75 19.25V4.75', 'M3.75 8.75L7.75 4.75L11.75 8.75', 'M16.25 4.75V19.25', 'M12.25 15.25L16.25 19.25L20.25 15.25'] },
  { name: 'sign-out', replaces: 'Sign-Out', pages: 0, keywords: ['sign', 'out', 'logout', 'exit'],
    paths: ['M10.25 3.75H3.75V20.25H10.25', 'M9 12H20.25', 'M16.25 8L20.25 12L16.25 16'] },
  { name: 'sun', replaces: 'Sun', pages: 0, keywords: ['sun', 'light', 'mode', 'theme'],
    paths: ['M8 12A4 4 0 1 0 16 12A4 4 0 1 0 8 12Z', 'M19.25 12L21.75 12', 'M17.13 17.13L18.89 18.89', 'M12 19.25L12 21.75', 'M6.87 17.13L5.11 18.89', 'M4.75 12L2.25 12', 'M6.87 6.87L5.11 5.11', 'M12 4.75L12 2.25', 'M17.13 6.87L18.89 5.11'] },
  { name: 'moon', replaces: 'Moon', pages: 0, keywords: ['moon', 'dark', 'mode', 'theme'],
    paths: ['M20 14.5A8.25 8.25 0 1 1 9.5 4A6.5 6.5 0 0 0 20 14.5Z'] },
  { name: 'tag', replaces: 'Tag', pages: 0, keywords: ['tag', 'label', 'price'],
    paths: ['M3.75 3.75H11.5L20.25 12.5L12.5 20.25L3.75 11.5Z'],
    fills: ['M7 7H9.25V9.25H7Z'] },
  { name: 'pin', replaces: 'Pin', pages: 0, keywords: ['pin', 'keep', 'stick'],
    paths: ['M8.25 3.25H15.75', 'M9.25 3.25V10L6.25 13.5H17.75L14.75 10V3.25', 'M12 13.5V21'] },
  { name: 'monitor', replaces: 'Monitor', pages: 0, keywords: ['monitor', 'screen', 'desktop', 'display'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 3.75H21.25V16.25H2.75Z', 'M8 20.25H16', 'M12 16.25V20.25'] },
  { name: 'user-minus', replaces: 'User_minus', pages: 0, keywords: ['user', 'remove', 'minus', 'member'],
    // Round 11: on Google's construction (built from the base person).
    paths: ['M6.24 9.26A2.76 2.76 0 1 0 11.76 9.26A2.76 2.76 0 1 0 6.24 9.26Z', 'M2.84 19.25V17.55C2.84 16.27 5.6 14.79 9 14.79C12.4 14.79 15.16 16.27 15.16 17.55V19.25Z', 'M16.25 10.5H21.25'] },
  { name: 'user-off', replaces: 'User_cross', pages: 0, keywords: ['user', 'cross', 'remove', 'block'],
    // Round 11: on Google's construction (built from the base person).
    paths: ['M8.75 7.5A3.25 3.25 0 1 0 15.25 7.5A3.25 3.25 0 1 0 8.75 7.5Z', 'M4.75 19.25V17.25C4.75 15.75 8 14 12 14C16 14 19.25 15.75 19.25 17.25V19.25Z', 'M3.75 3.75L20.25 20.25'] },
  { name: 'user-speaking', replaces: 'User_speaking', pages: 0, keywords: ['speaking', 'avatar', 'voice', 'presenter'],
    // Round 11: on Google's construction (built from the base person).
    paths: ['M6.24 9.26A2.76 2.76 0 1 0 11.76 9.26A2.76 2.76 0 1 0 6.24 9.26Z', 'M2.84 19.25V17.55C2.84 16.27 5.6 14.79 9 14.79C12.4 14.79 15.16 16.27 15.16 17.55V19.25Z', 'M15 6.75A4 4 0 0 1 15 12.75', 'M17.5 2.75A9.25 9.25 0 0 1 17.5 16.75'] },
  { name: 'thumbs-down', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Thumbs-down', pages: 0, keywords: ['thumbs', 'down', 'dislike', 'bad'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M20.25 14.75H17.25V4.25H20.25Z', 'M17.25 14.75L12.25 19.75L11.5 19L12.5 14.75H3.75V13L6.25 4.25H17.25'] },
  { name: 'wallet', replaces: 'Wallet + Wallet_open', pages: 0, keywords: ['wallet', 'billing', 'credits', 'payment'],
    // Round 11: on Google's construction.
    paths: ['M18.75 8.5V4.75H4.75V19.25H18.75V15.25', 'M12.75 8.5H20.5V15.25H12.75Z'],
    fills: ['M14.75 10.75H17V13H14.75Z'] },
  { name: 'gem', replaces: 'Gem + Diamond', pages: 0, keywords: ['gem', 'diamond', 'premium', 'plan'],
    // Round 11: on Google's construction.
    paths: ['M7.25 4.5H16.75L20.75 9.5L12.6 19.5H11.4L3.25 9.5Z', 'M3.25 9.5H20.75', 'M9.75 4.5L8 9.5', 'M14.25 4.5L16 9.5', 'M12 9.5V19.5'] },
  { name: 'fire', replaces: 'Fire', pages: 0, keywords: ['fire', 'hot', 'trending', 'popular'],
    paths: ['M12 21.25C8.25 21.25 5.25 18.5 5.25 14.75C5.25 10.75 9 8.5 11.25 4.25C13 7.5 18.75 10 18.75 14.75C18.75 18.5 15.75 21.25 12 21.25Z', 'M12 21.25C10.25 21.25 9 20 9 18.25C9 16.25 11 15 12 13.25C13 15 15 16.25 15 18.25C15 20 13.75 21.25 12 21.25'] },
  { name: 'keyboard', replaces: 'Keyboard', pages: 0, keywords: ['keyboard', 'shortcuts', 'typing'],
    paths: ['M2.75 5.75H21.25V18.25H2.75Z', 'M7.75 15.25H16.25'],
    fills: ['M5.5 8.25H7V9.75H5.5Z', 'M8.5 8.25H10V9.75H8.5Z', 'M11.5 8.25H13V9.75H11.5Z', 'M14.5 8.25H16V9.75H14.5Z', 'M17.5 8.25H19V9.75H17.5Z', 'M5.5 11.25H7V12.75H5.5Z', 'M8.5 11.25H10V12.75H8.5Z', 'M11.5 11.25H13V12.75H11.5Z', 'M14.5 11.25H16V12.75H14.5Z', 'M17.5 11.25H19V12.75H17.5Z'] },
  { name: 'image-plus', replaces: 'Image_plus', pages: 0, keywords: ['image', 'add', 'upload', 'picture'],
    // Round 17: the image itself, with the plus where the sun is (instead of a small image and a badge).
    // Round 23: the plus sits in a clean cut of the frame's top-right corner.
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M3.75 17L9 11.75L12.5 15.25L15 12.75L20.25 18'], badge: { paths: ['M18.5 2.75V8.75', 'M15.5 5.75H21.5'] }, cut: [[13, -1, 25, 11.25]] },
  { name: 'mail-open', replaces: 'Envelope_open', pages: 0, keywords: ['mail', 'open', 'read', 'envelope'],
    paths: ['M2.75 9.5L12 3.75L21.25 9.5V20.25H2.75Z', 'M2.75 9.5L12 15.25L21.25 9.5'] },
  { name: 'timer', replaces: 'Timer', pages: 0, keywords: ['timer', 'countdown', 'time'],
    paths: ['M4 13A8 8 0 1 0 20 13A8 8 0 1 0 4 13Z', 'M9.25 2.75H14.75', 'M12 9V13.25', 'M18.25 6.25L19.75 4.75'] },
  { name: 'hourglass', replaces: 'Hourglass', pages: 0, keywords: ['hourglass', 'wait', 'pending', 'time'],
    // Round 11: on Google's construction.
    paths: ['M5.25 3.25H18.75', 'M5.25 20.75H18.75', 'M7.25 3.25V7A4.75 4.75 0 0 0 16.75 7V3.25', 'M7.25 20.75V17A4.75 4.75 0 0 1 16.75 17V20.75'] },
  { name: 'duration', replaces: 'Duration', pages: 0, keywords: ['duration', 'length', 'time'],
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z'],
    fills: ['M12 7.5A4.5 4.5 0 0 1 12 16.5Z'] },
  { name: 'video-square', replaces: 'Video---square', pages: 0, keywords: ['video', 'square', 'player'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z'],
    fills: ['M9.75 8.5V15.5L15.25 12Z'] },
  { name: 'video-element', replaces: 'Video-element', pages: 0, keywords: ['video', 'element', 'clip', 'media'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M2.75 15.25H21.25'] },
  { name: 'sidebar', replaces: 'Sidebar', pages: 0, keywords: ['sidebar', 'panel', 'layout'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M15.25 4.75V19.25'] },
  { name: 'shuffle', replaces: 'Shuffle', pages: 0, keywords: ['shuffle', 'random', 'mix'],
    paths: ['M14.75 3.75H20.25V9.25', 'M20.25 3.75L3.75 20.25', 'M14.75 20.25H20.25V14.75', 'M20.25 20.25L14 14', 'M3.75 3.75L9.75 9.75'] },
  { name: 'water-drop', replaces: 'Water-drop', pages: 0, keywords: ['drop', 'water', 'colour', 'fill'],
    paths: ['M12 4.5C13.75 7.25 18.75 10.75 18.75 14.5A6.75 6.75 0 0 1 5.25 14.5C5.25 10.75 10.25 7.25 12 4.5Z'] },
  { name: 'speaker-low', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Speaker_low', pages: 0, keywords: ['speaker', 'volume', 'low', 'quiet'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.75 9.25H7.25L11.25 5.75V18.25L7.25 14.75H3.75Z', 'M14.25 8.75A3.25 3.25 0 0 1 14.25 15.25'] },
  { name: 'mic-off', replaces: 'Mic-slashed', pages: 0, keywords: ['mic', 'off', 'mute', 'microphone'],
    // Round 11: on Google's construction (built from the base mic).
    paths: ['M8.75 6A3.25 3.25 0 0 1 15.25 6V10A3.25 3.25 0 0 1 8.75 10Z', 'M5.25 10A6.75 6.75 0 0 0 18.75 10', 'M12 16.75V21', 'M3.75 3.75L20.25 20.25'] },
  { name: 'comment', replaces: 'Speech-bubble_circular', pages: 0, keywords: ['comment', 'chat', 'bubble', 'message'],
    // Round 24: web/platform cross-check: chat (web) and comment (platform) are one idea, so comment is
    // built on chat's bubble, with two lines of text to tell them apart.
    paths: ['M3.75 3.75H20.25V16.25H7L3.75 19.5Z', 'M7.75 8.25H16.25', 'M7.75 11.75H13.25'] },
  { name: 'pause-add', replaces: 'Pause-circle-add', pages: 0, keywords: ['pause', 'add', 'break', 'timeline'],
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z', 'M9.75 8.5V15.5', 'M14.25 8.5V15.5'] },
  { name: 'card', replaces: 'Card', pages: 0, keywords: ['card', 'layout', 'web', 'block'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M2.75 8.75H21.25'] },
  { name: 'divider', replaces: 'Divider', pages: 0, keywords: ['divider', 'line', 'separator', 'rule'],
    paths: ['M3 12H21'] },
  // ---- Round 10 · Platform editor tools.
  { name: 'crop', replaces: 'Crop', pages: 0, keywords: ['crop', 'trim', 'frame'],
    paths: ['M6.25 2.75V17.75H21.25', 'M2.75 6.25H17.75V21.25'] },
  { name: 'flip-horizontal', replaces: 'Flip-horizontal', pages: 0, keywords: ['flip', 'horizontal', 'mirror'],
    // Round 11: on Google's construction.
    paths: ['M9.75 4.75H4.75V19.25H9.75', 'M12 2.75V21.25'],
    fills: ['M15.5 4H17V5.5H15.5Z', 'M19.25 4H20.75V5.5H19.25Z', 'M19.25 7.75H20.75V9.25H19.25Z', 'M19.25 11.25H20.75V12.75H19.25Z', 'M19.25 14.75H20.75V16.25H19.25Z', 'M19.25 18.5H20.75V20H19.25Z', 'M15.5 18.5H17V20H15.5Z'] },
  { name: 'flip-vertical', replaces: 'Flip-vertical', pages: 0, keywords: ['flip', 'vertical', 'mirror'],
    // Round 11: mirrored / turned from its pair, so the two match exactly.
    paths: ['M19.25 9.75L19.25 4.75L4.75 4.75L4.75 9.75', 'M21.25 12L2.75 12'],
    fills: ['M20 15.5L20 17L18.5 17L18.5 15.5Z', 'M20 19.25L20 20.75L18.5 20.75L18.5 19.25Z', 'M16.25 19.25L16.25 20.75L14.75 20.75L14.75 19.25Z', 'M12.75 19.25L12.75 20.75L11.25 20.75L11.25 19.25Z', 'M9.25 19.25L9.25 20.75L7.75 20.75L7.75 19.25Z', 'M5.5 19.25L5.5 20.75L4 20.75L4 19.25Z', 'M5.5 15.5L5.5 17L4 17L4 15.5Z'] },
  { name: 'align-left', replaces: 'Align-left', pages: 0, keywords: ['align', 'left'],
    paths: ['M3.75 2.75V21.25', 'M7.25 5.75H16.75V10.25H7.25Z', 'M7.25 13.75H20.25V18.25H7.25Z'] },
  { name: 'align-center-h', replaces: 'Align-horizontal-center', pages: 0, keywords: ['align', 'centre', 'horizontal'],
    paths: ['M12 2.75V21.25', 'M7.25 5.75H16.75V10.25H7.25Z', 'M4.25 13.75H19.75V18.25H4.25Z'] },
  { name: 'align-right', replaces: 'Align-right', pages: 0, keywords: ['align', 'right'],
    paths: ['M20.25 2.75L20.25 21.25', 'M16.75 5.75L7.25 5.75L7.25 10.25L16.75 10.25Z', 'M16.75 13.75L3.75 13.75L3.75 18.25L16.75 18.25Z'] },
  { name: 'align-top', replaces: 'Align-top', pages: 0, keywords: ['align', 'top'],
    paths: ['M2.75 3.75H21.25', 'M5.75 7.25H10.25V16.75H5.75Z', 'M13.75 7.25H18.25V20.25H13.75Z'] },
  { name: 'align-center-v', replaces: 'Align-vertical-center', pages: 0, keywords: ['align', 'centre', 'vertical', 'middle'],
    paths: ['M2.75 12H21.25', 'M5.75 7.25H10.25V16.75H5.75Z', 'M13.75 4.25H18.25V19.75H13.75Z'] },
  { name: 'align-bottom', replaces: 'Align-bottom', pages: 0, keywords: ['align', 'bottom'],
    paths: ['M2.75 20.25L21.25 20.25', 'M5.75 16.75L10.25 16.75L10.25 7.25L5.75 7.25Z', 'M13.75 16.75L18.25 16.75L18.25 3.75L13.75 3.75Z'] },
  { name: 'bring-to-front', replaces: 'Bring-to-front', pages: 0, keywords: ['bring', 'to', 'front', 'layer', 'order'],
    paths: ['M8.75 8.75H20.25V20.25H8.75Z', 'M15.25 5.75V3.75H3.75V15.25H5.75'] },
  { name: 'send-to-back', replaces: 'Send-to-back', pages: 0, keywords: ['send', 'to', 'back', 'layer', 'order'],
    paths: ['M3.75 3.75H15.25V15.25H3.75Z', 'M17.75 8.75H20.25V20.25H8.75V17.75'] },
  { name: 'bring-forward', replaces: 'Bring-forward', pages: 0, keywords: ['bring', 'forward', 'layer', 'up'],
    paths: ['M3.75 10.25H13.75V20.25H3.75Z', 'M18 15V3.75', 'M14.5 7.25L18 3.75L21.5 7.25'] },
  { name: 'send-backward', replaces: 'Send-backward', pages: 0, keywords: ['send', 'backward', 'layer', 'down'],
    paths: ['M3.75 3.75H13.75V13.75H3.75Z', 'M18 9V20.25', 'M14.5 16.75L18 20.25L21.5 16.75'] },
  { name: 'corner-radius', replaces: 'Corner-radius-top-left + -top-right + -bottom-left + -bottom-right', pages: 0, keywords: ['corner', 'radius', 'rounded'],
    // Round 17: the dotted rest of the square has evenly spaced dots, the corner included.
    paths: ['M3.75 21V11.25A7.5 7.5 0 0 1 11.25 3.75H21'],
    fills: ['M19.5 6.75H21V8.25H19.5Z', 'M19.5 11H21V12.5H19.5Z', 'M19.5 15.25H21V16.75H19.5Z', 'M19.5 19.5H21V21H19.5Z', 'M15.25 19.5H16.75V21H15.25Z', 'M11 19.5H12.5V21H11Z', 'M6.75 19.5H8.25V21H6.75Z'] },
  { name: 'opacity', replaces: 'Opacity', pages: 0, keywords: ['opacity', 'transparency'],
    paths: ['M12 4.5C13.75 7.25 18.75 10.75 18.75 14.5A6.75 6.75 0 0 1 5.25 14.5C5.25 10.75 10.25 7.25 12 4.5Z'],
    fills: ['M6.75 14.5A5.25 5.25 0 0 0 17.25 14.5Z'] },
  { name: 'eye-dropper', replaces: 'Eye-dropper', pages: 0, keywords: ['eye', 'dropper', 'colour', 'picker'],
    // Round 17: redrawn as a real pipette: round bulb, solid collar, glass tube to a point;
    // drawn upright and turned 45° like the other tools.
    paths: ['M9.75 7.5V5.25A2.25 2.25 0 0 1 14.25 5.25V7.5', 'M10.25 10.75V17.75L12 20.75L13.75 17.75V10.75'],
    fills: ['M7.5 7.5H16.5V10.75H7.5Z'],
    variants: [{ label: 'Diagonal', rotate: 45 }] },
  { name: 'gradient', replaces: 'Gradient-linear + Gradient-radial', pages: 0, keywords: ['gradient', 'colour', 'fill'],
    // Round 11: on Google's construction.
    paths: ['M3.75 3.75H20.25V20.25H3.75Z'],
    fills: ['M4.5 11.5H6.65V14.4H4.5Z', 'M8.8 11.5H10.95V14.4H8.8Z', 'M13.1 11.5H15.25V14.4H13.1Z', 'M17.4 11.5H19.55V14.4H17.4Z', 'M6.65 14.4H8.8V17.3H6.65Z', 'M10.95 14.4H13.1V17.3H10.95Z', 'M15.25 14.4H17.4V17.3H15.25Z', 'M4.5 17.3H6.65V20.2H4.5Z', 'M8.8 17.3H10.95V20.2H8.8Z', 'M13.1 17.3H15.25V20.2H13.1Z', 'M17.4 17.3H19.55V20.2H17.4Z'] },
  { name: 'background', replaces: 'Background', pages: 0, keywords: ['background', 'wallpaper', 'fill'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.75 8.25V3.75H8.25', 'M15.75 3.75H20.25V8.25', 'M20.25 15.75V20.25H15.75', 'M8.25 20.25H3.75V15.75', 'M6.25 16.25L9 11.75L12.5 15.25L15 12.75L17.75 16.25'],
    fills: ['M14 7.75H16.25V10H14Z'] },
  { name: 'padding', replaces: 'Padding', pages: 0, keywords: ['padding', 'spacing', 'inset'],
    paths: ['M3.75 3.75H20.25V20.25H3.75Z'],
    fills: ['M11.25 6.5H12.75V8H11.25Z', 'M11.25 16H12.75V17.5H11.25Z', 'M6.5 11.25H8V12.75H6.5Z', 'M16 11.25H17.5V12.75H16Z'] },
  { name: 'gap', replaces: 'Gap', pages: 0, keywords: ['gap', 'spacing', 'distribute'],
    paths: ['M3.75 2.75V21.25', 'M20.25 2.75V21.25', 'M9.25 7.25H14.75V16.75H9.25Z'] },
  { name: 'stroke-width', replaces: 'Stroke-width', pages: 0, keywords: ['stroke', 'width', 'line', 'weight', 'border'],
    paths: ['M3 5H21'],
    fills: ['M3 9.25H21V11.75H3Z', 'M3 15H21V19H3Z'] },
  { name: 'shapes', replaces: 'Shapes', pages: 0, keywords: ['shapes', 'elements', 'objects'],
    paths: ['M12 3.25L16.75 10.5H7.25Z', 'M3.5 17A3.5 3.5 0 1 0 10.5 17A3.5 3.5 0 1 0 3.5 17Z', 'M13.75 13.75H20.25V20.25H13.75Z'] },
  { name: 'triangle', replaces: 'Triangle', pages: 0, keywords: ['triangle', 'shape'],
    paths: ['M11 4.75H13L20.25 18V19.25H3.75V18Z'] },
  { name: 'frame', replaces: 'Frame', pages: 0, keywords: ['frame', 'container', 'box'],
    paths: ['M3.75 3.75H20.25V20.25H3.75Z'] },
  { name: 'split', replaces: 'Scissors_vertical + Blade', pages: 0, keywords: ['split', 'cut', 'blade', 'razor', 'timeline'],
    paths: ['M18 3.5A2.5 2.5 0 1 0 18 8.5A2.5 2.5 0 1 0 18 3.5Z', 'M6 3.5A2.5 2.5 0 1 0 6 8.5A2.5 2.5 0 1 0 6 3.5Z', 'M16.25 7.75L3.75 20.25', 'M7.75 7.75L20.25 20.25'] },
  { name: 'playhead', replaces: 'Timeline_playhead', pages: 0, keywords: ['playhead', 'timeline', 'scrub'],
    // Round 17: the playhead crossing a track, so it isn't on its own.
    paths: ['M12 9.25V21.25', 'M8.25 2.75H15.75V6.25L12 9.25L8.25 6.25Z', 'M3.75 13.75H20.25V18.25H3.75Z'] },
  { name: 'collapse-timeline', replaces: 'Collapse_timeline', pages: 0, keywords: ['collapse', 'timeline', 'compress'],
    paths: ['M3.75 10.5H20.25', 'M3.75 13.5H20.25', 'M12 2.75V7.75', 'M9 4.75L12 7.75L15 4.75', 'M12 21.25V16.25', 'M9 19.25L12 16.25L15 19.25'] },
  { name: 'expand-timeline', replaces: 'Expand_timeline', pages: 0, keywords: ['expand', 'timeline'],
    paths: ['M3.75 12H20.25', 'M12 9.25V3.25', 'M9 6.25L12 3.25L15 6.25', 'M12 14.75V20.75', 'M9 17.75L12 20.75L15 17.75'] },
  { name: 'chevrons-up-down', replaces: 'Chevrons-up-down', pages: 0, keywords: ['chevrons', 'up', 'down', 'select', 'sort'],
    paths: ['M7.5 8.5L12 4L16.5 8.5', 'M7.5 15.5L12 20L16.5 15.5'] },
  { name: 'next', replaces: 'Media-next', pages: 0, keywords: ['next', 'skip', 'forward'],
    paths: ['M5.75 5.75V18.25L14.5 12Z', 'M18.25 5.75V18.25'] },
  { name: 'previous', replaces: 'Media-previous', pages: 0, keywords: ['previous', 'skip', 'back'],
    paths: ['M18.25 5.75L18.25 18.25L9.5 12Z', 'M5.75 5.75L5.75 18.25'] },
  { name: 'transcript', replaces: 'Transcript', pages: 0, keywords: ['transcript', 'text', 'speech'],
    // Round 17: sound becomes text: a waveform on top, two lines of text below.
    paths: ['M4.5 5.75V8.25', 'M8.25 3.75V10.25', 'M12 5V9', 'M15.75 3.25V10.75', 'M19.5 5.75V8.25', 'M3.75 14.75H20.25', 'M3.75 19.25H14.75'] },
  { name: 'compare', replaces: 'Compare', pages: 0, keywords: ['compare', 'before', 'after', 'split'],
    paths: ['M12 2.75V21.25', 'M9.25 4.75H3.75V19.25H9.25', 'M14.75 4.75H20.25V19.25H14.75'] },
  { name: 'anchor', replaces: 'Anchor-point', pages: 0, keywords: ['anchor', 'point', 'transform', 'origin'],
    paths: ['M9.25 5.5L12 2.75L14.75 5.5', 'M9.25 18.5L12 21.25L14.75 18.5', 'M5.5 9.25L2.75 12L5.5 14.75', 'M18.5 9.25L21.25 12L18.5 14.75', 'M9.25 12A2.75 2.75 0 1 0 14.75 12A2.75 2.75 0 1 0 9.25 12Z'] },
  { name: 'angle', replaces: 'Angle', pages: 0, keywords: ['angle', 'rotate', 'degrees'],
    paths: ['M20.25 19.25H3.75L14.75 4.75', 'M10 19.25A6 6 0 0 0 8.1 14.85'] },
  { name: 'collapse', grow: 1.1, /* round 23: optical size, it read smaller than the icon it replaces */ replaces: 'Arrows-diagonal-in-double', pages: 0, keywords: ['collapse', 'shrink', 'minimise'],
    paths: ['M13.75 4V10.25H20', 'M13.75 10.25L20.25 3.75', 'M10.25 20V13.75H4', 'M10.25 13.75L3.75 20.25'] },
  { name: 'fullscreen', replaces: 'Arrows-diagonal-out-quad + Chevrons-diagonal-out-quad', pages: 0, keywords: ['fullscreen', 'expand', 'maximise'],
    paths: ['M3.75 8.25V3.75H8.25', 'M15.75 3.75H20.25V8.25', 'M20.25 15.75V20.25H15.75', 'M8.25 20.25H3.75V15.75'] },
  { name: 'fullscreen-exit', replaces: 'Arrows-diagonal-in-quad + Chevrons-diagonal-in-quad', pages: 0, keywords: ['fullscreen', 'exit', 'minimise'],
    paths: ['M8.25 3.75V8.25H3.75', 'M15.75 3.75V8.25H20.25', 'M20.25 15.75H15.75V20.25', 'M3.75 15.75H8.25V20.25'] },
  { name: 'split-arrows', replaces: 'Arrows-split', pages: 0, keywords: ['split', 'arrows', 'branch'],
    paths: ['M12 21.25V12.25L5.25 5.5', 'M12 12.25L18.75 5.5', 'M5 9.75V4.75H10', 'M14 4.75H19V9.75'] },
  { name: 'width', replaces: 'Arrows-horizontal-out-double', pages: 0, keywords: ['width', 'resize', 'horizontal'],
    paths: ['M3.25 4.75V19.25', 'M20.75 4.75V19.25', 'M6.25 12H17.75', 'M9.25 9L6.25 12L9.25 15', 'M14.75 9L17.75 12L14.75 15'] },
  { name: 'height', replaces: 'Arrows-vertical-out-double', pages: 0, keywords: ['height', 'resize', 'vertical'],
    paths: ['M19.25 3.25L4.75 3.25', 'M19.25 20.75L4.75 20.75', 'M12 6.25L12 17.75', 'M15 9.25L12 6.25L9 9.25', 'M15 14.75L12 17.75L9 14.75'] },
  { name: 'turn-down', replaces: 'Arrow-turn-down-cw', pages: 0, keywords: ['turn', 'down', 'arrow', 'reply'],
    paths: ['M5.75 3.75V15.25H18.25', 'M14.75 11.75L18.25 15.25L14.75 18.75'] },
  { name: 'u-turn-left', replaces: 'Arrow-u-turn-left-acw', pages: 0, keywords: ['u', 'turn', 'back', 'left'],
    paths: ['M17.25 21V9.25A5.25 5.25 0 0 0 6.75 9.25V17.5', 'M3.25 14L6.75 17.5L10.25 14'] },
  { name: 'u-turn-right', replaces: 'Arrow-u-turn-right-cw', pages: 0, keywords: ['u', 'turn', 'right'],
    paths: ['M6.75 21L6.75 9.25A5.25 5.25 0 0 1 17.25 9.25L17.25 17.5', 'M20.75 14L17.25 17.5L13.75 14'] },
  { name: 'chevrons-left', replaces: 'Chevrons-left-double', pages: 0, keywords: ['chevrons', 'double', 'left', 'back'],
    paths: ['M11.75 6L5.75 12L11.75 18', 'M18.25 6L12.25 12L18.25 18'] },
  { name: 'chevrons-right', replaces: 'Chevrons-right-double', pages: 0, keywords: ['chevrons', 'double', 'right', 'forward'],
    paths: ['M12.25 6L18.25 12L12.25 18', 'M5.75 6L11.75 12L5.75 18'] },
  { name: 'first', replaces: 'Chevron-left-cap', pages: 0, keywords: ['first', 'start', 'beginning'],
    paths: ['M17.25 6L11.25 12L17.25 18', 'M7.25 6V18'] },
  { name: 'last', replaces: 'Chevron-right-cap', pages: 0, keywords: ['last', 'end'],
    paths: ['M6.75 6L12.75 12L6.75 18', 'M16.75 6L16.75 18'] },
  { name: 'arrow-left-end', replaces: 'Arrow-left-cap', pages: 0, keywords: ['arrow', 'left', 'start', 'tab'],
    paths: ['M20.75 12H5.75', 'M10.75 7L5.75 12L10.75 17', 'M3.25 5.5V18.5'] },
  { name: 'arrow-right-end', replaces: 'Arrow-right-cap', pages: 0, keywords: ['arrow', 'right', 'end', 'tab'],
    paths: ['M3.25 12L18.25 12', 'M13.25 7L18.25 12L13.25 17', 'M20.75 5.5L20.75 18.5'] },
  // ---- Round 10 · Platform text formatting and transitions.
  { name: 'text', replaces: 'Alphabet-T_serif', pages: 0, keywords: ['text', 'type', 'title'],
    paths: ['M5.75 6.75V4.75H18.25V6.75', 'M12 4.75V19.25', 'M9.75 19.25H14.25'] },
  { name: 'text-box', replaces: 'T-serif-square', pages: 0, keywords: ['text', 'box', 'field'],
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M8 8.25H16', 'M12 8.25V16.25'] },
  { name: 'case', replaces: 'Alphabets-A-uppercase-lowercase', pages: 0, keywords: ['case', 'uppercase', 'lowercase'],
    paths: ['M2.75 18.75L6.75 6.25H8.25L12.25 18.75', 'M4.25 14.25H10.75', 'M15 10.25H18.75L20 11.5V18.75', 'M20 14.25H16L14.75 15.5V17.5L16 18.75H20'] },
  { name: 'font-size', replaces: 'Font-size', pages: 0, keywords: ['font', 'size', 'text'],
    paths: ['M2.75 5.25H12.75', 'M7.75 5.25V18.75', 'M13.25 10.75H21.25', 'M17.25 10.75V18.75'] },
  { name: 'letter-spacing', replaces: 'Letter-spacing', pages: 0, keywords: ['letter', 'spacing', 'tracking'],
    paths: ['M6 3.25V12.25', 'M12 3.25V12.25', 'M18 3.25V12.25', 'M3.75 18H20.25', 'M6.75 15L3.75 18L6.75 21', 'M17.25 15L20.25 18L17.25 21'] },
  { name: 'bold', replaces: 'Alphabet-B', pages: 0, keywords: ['bold', 'strong'],
    paths: ['M6.75 4.25H12.5A3.375 3.375 0 0 1 12.5 11H6.75Z', 'M6.75 11H13.5A4.375 4.375 0 0 1 13.5 19.75H6.75Z'] },
  { name: 'italic', replaces: 'Italics', pages: 0, keywords: ['italic', 'emphasis'],
    paths: ['M10.25 4.25H18.25', 'M5.75 19.75H13.75', 'M14.25 4.25L9.75 19.75'] },
  { name: 'underline', replaces: 'Underline', pages: 0, keywords: ['underline'],
    paths: ['M7 4V11.5A5 5 0 0 0 17 11.5V4', 'M5 20.25H19'] },
  { name: 'strikethrough', replaces: 'Strikethrough', pages: 0, keywords: ['strikethrough', 'strike'],
    paths: ['M16.75 6.5C16 5 14.25 4.25 12 4.25C9.25 4.25 7.25 5.75 7.25 7.75C7.25 9 8 9.75 9 10.25', 'M15.5 14C16.25 14.5 16.75 15.25 16.75 16.25C16.75 18.25 14.75 19.75 12 19.75C9.5 19.75 7.75 19 7 17.5', 'M3.75 12H20.25'] },
  { name: 'h1', replaces: 'H1', pages: 0, keywords: ['heading', 'one', 'h1'],
    // Round 11: on Google's construction.
    paths: ['M6.75 7.25V16.75', 'M11.25 7.25V16.75', 'M6.75 12H11.25', 'M15.25 7.75H17.25V16.75'] },
  { name: 'h2', replaces: 'H2', pages: 0, keywords: ['heading', 'two', 'h2'],
    // Round 11: on Google's construction.
    paths: ['M6.75 7.25V16.75', 'M11.25 7.25V16.75', 'M6.75 12H11.25', 'M14.75 7.75H18.75V12H15.5V16.25H19'] },
  { name: 'h3', replaces: 'H3', pages: 0, keywords: ['heading', 'three', 'h3'],
    // Round 11: on Google's construction.
    paths: ['M6.75 7.25V16.75', 'M11.25 7.25V16.75', 'M6.75 12H11.25', 'M14.75 7.75H18.75V16.25H14.75', 'M15.75 12H18.75'] },
  { name: 'h4', replaces: 'H4', pages: 0, keywords: ['heading', 'four', 'h4'],
    // Round 11: on Google's construction.
    paths: ['M6.75 7.25V16.75', 'M11.25 7.25V16.75', 'M6.75 12H11.25', 'M15 7.25V12.5H19.25', 'M18.5 7.25V16.75'] },
  { name: 'list', replaces: 'List', pages: 0, keywords: ['list', 'bullets', 'unordered'],
    paths: ['M8.75 6.25H20.25', 'M8.75 12H20.25', 'M8.75 17.75H20.25'],
    fills: ['M3.5 5.25H5.5V7.25H3.5Z', 'M3.5 11H5.5V13H3.5Z', 'M3.5 16.75H5.5V18.75H3.5Z'] },
  { name: 'numbered-list', replaces: 'Numbered-list', pages: 0, keywords: ['list', 'numbered', 'ordered'],
    // Round 11: on Google's construction.
    paths: ['M3.75 4.25H5.25V8.75', 'M3.5 10.25H6.75V12.5H4.25V14.75H7', 'M3.5 16.25H6.75V21H3.5', 'M4.5 18.6H6.75', 'M9.75 6.5H20.75', 'M9.75 12.5H20.75', 'M9.75 18.6H20.75'] },
  { name: 'quote', replaces: 'Quotes', pages: 0, keywords: ['quote', 'quotes', 'testimonial'],
    // Round 11: on Google's construction.
    paths: [],
    fills: ['M4.5 6.25H10.75V12.25L8 18.25H5.25L7.75 12.25H4.5Z', 'M13.25 6.25H19.5V12.25L16.75 18.25H14L16.5 12.25H13.25Z'] },
  { name: 'text-align-left', replaces: 'Text-align-left', pages: 0, keywords: ['text', 'align', 'left'],
    paths: ['M3.75 5.25H20.25', 'M3.75 9.75H14.25', 'M3.75 14.25H20.25', 'M3.75 18.75H14.25'] },
  { name: 'text-align-center', replaces: 'Text-align-center', pages: 0, keywords: ['text', 'align', 'centre'],
    paths: ['M3.75 5.25H20.25', 'M7 9.75H17', 'M3.75 14.25H20.25', 'M7 18.75H17'] },
  { name: 'text-align-right', replaces: 'Text-align-right', pages: 0, keywords: ['text', 'align', 'right'],
    paths: ['M20.25 5.25L3.75 5.25', 'M20.25 9.75L9.75 9.75', 'M20.25 14.25L3.75 14.25', 'M20.25 18.75L9.75 18.75'] },
  { name: 'transition', replaces: 'Transition', pages: 0, keywords: ['transition', 'slide'],
    paths: ['M2.75 5.75H6.25V18.25H2.75Z', 'M9.75 5.75H21.25V18.25H9.75Z'] },
  { name: 'transition-dissolve', replaces: 'Transition-Dissolve', pages: 0, keywords: ['transition', 'dissolve'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 4.75H21.25V19.25H2.75Z'],
    fills: ['M6 8H8.5V10.5H6Z', 'M10.75 10.75H13.25V13.25H10.75Z', 'M15.5 8H18V10.5H15.5Z', 'M6 13.5H8.5V16H6Z', 'M15.5 13.5H18V16H15.5Z'] },
  { name: 'transition-push', replaces: 'Transition-Push--pull', pages: 0, keywords: ['transition', 'push', 'pull'],
    paths: ['M3 12H9.75', 'M6.75 9L9.75 12L6.75 15', 'M10.25 5.75H12.25V18.25H10.25', 'M15.25 5.75H20.75V18.25H15.25Z'] },
  { name: 'transition-stack', replaces: 'Transition-Stack', pages: 0, keywords: ['transition', 'stack'],
    // Round 11: on Google's construction.
    paths: ['M9.75 2.75H21.25V12.75', 'M6.75 5.75H18.25V16.25', 'M3.75 8.75H15.25V20.25H3.75Z'] },
  { name: 'transition-colour-wipe', replaces: 'Transition-Color-wipe', pages: 0, keywords: ['transition', 'colour', 'wipe', 'fade'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 4.75H21.25V19.25H2.75Z'],
    fills: ['M3.5 5.5H12V18.5H3.5Z'] },
  { name: 'transition-circle-wipe', replaces: 'Transition-Circle-wipe', pages: 0, keywords: ['transition', 'circle', 'wipe'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z'],
    fills: ['M8 12A4 4 0 1 0 16 12A4 4 0 1 0 8 12Z'] },
  { name: 'transition-corner-wipe', replaces: 'Transition-Corner-wipe', pages: 0, keywords: ['transition', 'corner', 'wipe'],
    // Round 11: on Google's construction.
    paths: ['M2.75 4.75H21.25V19.25H2.75Z'],
    fills: ['M3 19V9.5L12.5 19Z'] },
  { name: 'transition-rainbow-wipe', replaces: 'Transition-Rainbow-wipe', pages: 0, keywords: ['transition', 'rainbow', 'wipe'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M3.5 11A7.5 7.5 0 0 1 11 18.5', 'M3.5 14.75A3.75 3.75 0 0 1 7.25 18.5', 'M3.5 7.25A11.25 11.25 0 0 1 14.75 18.5'] },
  { name: 'image', replaces: 'Image', pages: 1, keywords: ['image', 'picture', 'photo', 'media'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M3.75 17L9 11.75L12.5 15.25L15 12.75L20.25 18'],
    fills: ['M14.25 7.25H17V10H14.25Z'] },
  { name: 'video-camera', replaces: 'Video camera', pages: 1, keywords: ['video', 'camera', 'record', 'webcam'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.5 5.25H16.75V18.75H3.5Z', 'M16.75 10L21.25 7V17L16.75 14'] },
  { name: 'layers', replaces: 'Layers', pages: 1, keywords: ['layers', 'stack', 'levels'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M12 3.25L20.75 8.5L12 13.75L3.25 8.5Z', 'M3.25 12.5L12 17.75L20.75 12.5', 'M3.25 16.25L12 21.25L20.75 16.25'] },
  { name: 'sliders', replaces: 'Sliding-knobs', pages: 1, keywords: ['sliders', 'tune', 'settings', 'adjust', 'controls'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M3.25 6.5H12.25', 'M16.75 6.5H20.75', 'M14.5 4.25V8.75', 'M3.25 12H6.25', 'M10.75 12H20.75', 'M8.5 9.75V14.25', 'M3.25 17.5H14.25', 'M18.75 17.5H20.75', 'M16.5 15.25V19.75'] },
  { name: 'globe', replaces: 'Globe', pages: 1, keywords: ['globe', 'world', 'language', 'global', 'web'],
    // Round 12: consistency pass (shared family base / restored version).
    paths: ['M2.75 12A9.25 9.25 0 1 0 21.25 12A9.25 9.25 0 1 0 2.75 12Z', 'M12 2.75C9.25 5.5 8 8.75 8 12C8 15.25 9.25 18.5 12 21.25', 'M12 2.75C14.75 5.5 16 8.75 16 12C16 15.25 14.75 18.5 12 21.25', 'M3.25 9H20.75', 'M3.25 15H20.75'] },

  // ---- Round 13 (2026-11-01): icons Sneha asked for, in the base style. Google construction:
  // notifications, zoom_out, publish, send, screen_record, video_camera_front, keyframes, trophy,
  // domain, apartment, analytics, credit_card, person + sparkle, extension, filter_alt, sort, flag, inbox, archive.
  { name: 'bell', replaces: 'New (round 13)', pages: 0, keywords: ['bell', 'notification', 'alert', 'notify'],
    // Dome on the circle, flared lip, knob on top, clapper bar 2 below the lip.
    paths: ['M3.75 17.25H20.25', 'M5.75 17.25V10.5A6.25 6.25 0 0 1 18.25 10.5V17.25', 'M12 2.5V4.25', 'M9.5 20.25H14.5'] },
  { name: 'zoom-out', replaces: 'New (round 13)', pages: 0, keywords: ['zoom', 'out', 'minus', 'smaller'],
    // The search lens (zoom-in's base) with a minus.
    paths: ['M3.75 10.5A6.75 6.75 0 1 0 17.25 10.5A6.75 6.75 0 1 0 3.75 10.5Z', 'M15.5 15.5L21 21', 'M7.5 10.5H13.5'] },
  { name: 'publish', replaces: 'New (round 13)', pages: 0, keywords: ['publish', 'upload', 'release', 'go live'],
    paths: ['M4 3.75H20', 'M12 21V8.5', 'M7 13.5L12 8.5L17 13.5'] },
  { name: 'send', replaces: 'New (round 13)', pages: 0, keywords: ['send', 'paper plane', 'submit', 'message'],
    // Tip pulled in to 19.5: its sharp mitre reaches about 21.4.
    paths: ['M4.25 5.25L19.5 12L4.25 18.75L6.75 12Z', 'M6.75 12H11.5'] },
  { name: 'record-screen', replaces: 'New (round 13)', pages: 0, keywords: ['record', 'screen', 'capture', 'recording'],
    // The monitor base with a solid record dot.
    paths: ['M2.75 3.75H21.25V16.25H2.75Z', 'M8 20.25H16', 'M12 16.25V20.25'],
    fills: ['M10.5 8.5H13.5V11.5H10.5Z'] },
  { name: 'webcam', replaces: 'New (round 13)', pages: 0, keywords: ['webcam', 'camera', 'face cam', 'on'],
    paths: ['M5.5 10A6.5 6.5 0 1 0 18.5 10A6.5 6.5 0 1 0 5.5 10Z', 'M9.75 10A2.25 2.25 0 1 0 14.25 10A2.25 2.25 0 1 0 9.75 10Z', 'M12 16.5V20.25', 'M7 20.25H17'] },
  { name: 'webcam-off', replaces: 'New (round 13)', pages: 0, keywords: ['webcam', 'camera', 'off', 'disable'],
    // Webcam + the same slash as mic off and eye off.
    paths: ['M5.5 10A6.5 6.5 0 1 0 18.5 10A6.5 6.5 0 1 0 5.5 10Z', 'M9.75 10A2.25 2.25 0 1 0 14.25 10A2.25 2.25 0 1 0 9.75 10Z', 'M12 16.5V20.25', 'M7 20.25H17', 'M3.75 3.75L20.25 20.25'] },
  { name: 'keyframe', replaces: 'New (round 13)', pages: 0, keywords: ['keyframe', 'animation', 'diamond', 'timeline'],
    paths: ['M12 3.25L20.75 12L12 20.75L3.25 12Z'], fills: ['M12 8.75L15.25 12L12 15.25L8.75 12Z'] },
  { name: 'award', replaces: 'New (round 13)', pages: 0, keywords: ['award', 'trophy', 'winner', 'prize', 'cup'],
    // Round cup (round in real life), square handles, stem and plinth.
    paths: ['M7.25 3.75H16.75V9.5A4.75 4.75 0 0 1 7.25 9.5Z', 'M7.25 5.75H3.75V9.25H7.25', 'M16.75 5.75H20.25V9.25H16.75', 'M12 14.25V17.25', 'M7.75 17.25H16.25V20.25H7.75Z'] },
  { name: 'enterprise', replaces: 'New (round 13)', pages: 0, keywords: ['enterprise', 'company', 'business', 'office', 'corporate'],
    // Round 17: fewer windows; the tower stands behind the front block, partly hidden.
    paths: ['M3.75 20.25V9.75H14.25V20.25', 'M9.25 9.75V3.75H20.25V20.25', 'M2.75 20.25H21.25'],
    fills: ['M6 12.75H8V14.75H6Z', 'M10 12.75H12V14.75H10Z', 'M16 6H18V8H16Z'] },
  { name: 'building', replaces: 'New (round 13)', pages: 0, keywords: ['building', 'office', 'organisation', 'workspace'],
    paths: ['M5.75 20.25V3.75H18.25V20.25', 'M3.75 20.25H20.25', 'M10.25 20.25V16.25H13.75V20.25'],
    fills: ['M8 6.5H10V8.5H8Z', 'M14 6.5H16V8.5H14Z', 'M8 10.5H10V12.5H8Z', 'M14 10.5H16V12.5H14Z'] },
  { name: 'analytics', replaces: 'New (round 13)', pages: 0, keywords: ['analytics', 'stats', 'insights', 'chart', 'views'],
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M8 16.75V12.25', 'M12 16.75V7.25', 'M16 16.75V10.25'] },
  { name: 'billing', replaces: 'New (round 13)', pages: 0, keywords: ['billing', 'card', 'credit card', 'payment', 'plan'],
    paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M2.75 9.25H21.25', 'M6 15.25H10.5'] },
  { name: 'ai-avatar', replaces: 'New (round 13)', pages: 0, keywords: ['ai', 'avatar', 'presenter', 'person', 'digital human'],
    // The base person (as in user plus) with the AI sparkle (as in mic AI).
    paths: ['M6.24 9.26A2.76 2.76 0 1 0 11.76 9.26A2.76 2.76 0 1 0 6.24 9.26Z', 'M2.84 19.25V17.55C2.84 16.27 5.6 14.79 9 14.79C12.4 14.79 15.16 16.27 15.16 17.55V19.25Z'],
    fills: ['M18.5 2.25L19.46 4.29L21.5 5.25L19.46 6.21L18.5 8.25L17.54 6.21L15.5 5.25L17.54 4.29Z'] },
  { name: 'browser-extension', replaces: 'New (round 13)', pages: 0, keywords: ['browser', 'extension', 'chrome', 'plugin', 'add-on'],
    // Round 17: a browser window that is itself a puzzle piece: a knob on top, a socket on the
    // left, and the toolbar line.
    // Round 23: she found the puzzle-window unreadable → the globe (the web) with a plus. Second pass
    // (she found the square cut messy): a smaller globe up and to the left, so only its OUTLINE meets
    // the plus, and a round cut there; no meridian or latitude ends hang loose.
    paths: ['M2.75 10.25A7.5 7.5 0 1 0 17.75 10.25A7.5 7.5 0 1 0 2.75 10.25Z', 'M10.25 2.75A3.25 7.5 0 0 0 10.25 17.75A3.25 7.5 0 0 0 10.25 2.75Z', 'M3.5 7.5H17', 'M3.5 13H17'],
    badge: { paths: ['M18.75 15.75V21.75', 'M15.75 18.75H21.75'] }, cut: [{ c: [18.75, 18.75], r: 5 }] },
  { name: 'filter', replaces: 'New (round 13)', pages: 0, keywords: ['filter', 'funnel', 'refine'],
    paths: ['M3.75 4.75H20.25L14 11V20L10 18V11Z'] },
  { name: 'sort', replaces: 'New (round 13)', pages: 0, keywords: ['sort', 'order', 'arrange'],
    paths: ['M3.75 6.75H20.25', 'M3.75 12H15.25', 'M3.75 17.25H10.25'] },
  { name: 'flag', replaces: 'New (round 13)', pages: 0, keywords: ['flag', 'report', 'mark', 'milestone'],
    paths: ['M5.25 21.25V3.25', 'M5.25 4.25H19L15.75 8.75L19 13.25H5.25'] },
  { name: 'inbox', replaces: 'New (round 13)', pages: 0, keywords: ['inbox', 'box', 'tray', 'messages'],
    paths: ['M3.75 3.75H20.25V20.25H3.75Z', 'M3.75 13.25H7.75L10 15.5H14L16.25 13.25H20.25'] },
  { name: 'archive', replaces: 'New (round 13)', pages: 0, keywords: ['archive', 'box', 'store', 'storage'],
    paths: ['M2.75 3.75H21.25V8.25H2.75Z', 'M4.25 8.25V20.25H19.75V8.25', 'M9.75 12.25H14.25'] },
];

// Library icons redrawn on the grid where the Figma original didn't sit well.
// They replace the original geometry in the library (same name, same keywords).
export const LIBRARY_REDRAWS: Record<string, LibraryRedraw> = {
  // Round 5. Home on the grid exactly (the Figma one was nudged half a unit for balance,
  // so its edges sat off the grid): 45° roof, walls on the square keyline.
  'home-1': { paths: ['M3.75 20.25V11.5L12 3.25L20.25 11.5V20.25Z'] },
  // Support: a person wearing the headset (band, solid ear cups), same family as
  // `headphones` and `headset`.
  'customer-support-1': { paths: ['M8.25 9A3.75 3.75 0 1 0 15.75 9A3.75 3.75 0 1 0 8.25 9Z', 'M5.25 9A6.75 6.75 0 0 1 18.75 9', 'M4.75 21A7.25 7.25 0 0 1 19.25 21'], fills: ['M3.75 8H6.25V12H3.75Z', 'M17.75 8H20.25V12H17.75Z'] },
  // Flight board: a board with a solid plane and a line under it.
  'plane-flight-board': { paths: ['M2.75 4.75H21.25V19.25H2.75Z', 'M6.75 15.25H17.25'], fills: ['M12 7L12.75 7.75V9.75L16 11.75V12.75L12.75 11.75V13L13.75 13.75V14.25L12 13.75L10.25 14.25V13.75L11.25 13V11.75L8 12.75V11.75L11.25 9.75V7.75Z'] },
  // Pointed leaf from two arcs along the diagonal; the stem stops at the centre.
  leaf: { paths: ['M6.75 17.25A11 11 0 0 1 20.25 3.75A11 11 0 0 1 6.75 17.25Z', 'M3.75 20.25L12.5 11.5'] },
  // Utility knife, drawn upright and turned 45°: capsule body with a slider slot, and a
  // narrower blade. The body's corners taper into the blade at 45° (the original's hard
  // shoulders read as notches once the duotone fill is gone), ending in an angled tip.
  cutter: { paths: ['M8 14V7A4 4 0 0 1 16 7V14Z', 'M12 6.5V9.5', 'M8 14L10 16V19L13 22H14V16L16 14'], rotate: 45 },
};

// Small fixes to library icons, applied to the original drawing before fitting.
// `fillOutline`: paths (by their order in the icon) too small to hold a 1.5 outline
// become filled shapes the size of the stroke's outer edge.
export const LIBRARY_TWEAKS: Record<string, { fillOutline?: number[] }> = {
  // The play triangle inside the frame.
  'play-list-8': { fillOutline: [0] },
};
