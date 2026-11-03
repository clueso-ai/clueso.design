// UI for the icon tool. Relies on library.js, icon-engine.js and generator.js (loaded first).

(function () {
  const $ = (id) => document.getElementById(id);
  // Inside clueso.design (/tools/icon-lab) the files are served from a folder: the mount sets
  // ICON_LAB_BASE so images resolve, and ICON_LAB_THEME_KEY so the tool shares the site's theme.
  const ASSET = window.ICON_LAB_BASE || '';
  const els = {
    form: $('generate-form'),
    prompt: $('prompt'),
    generateBtn: $('generate-btn'),
    connectBtn: $('connect-btn'),
    connectLabel: $('connect-label'),
    keyDialog: $('key-dialog'),
    keyForm: $('key-form'),
    keyInput: $('key-input'),
    keyRemove: $('key-remove'),
    styleLine: $('style-line'),
    styleSolid: $('style-solid'),
    setWeb: $('set-web'),
    setPlatform: $('set-platform'),
    setPixel: $('set-pixel'),
    sigToggle: $('sig-toggle'),
    libNote: $('lib-note'),
    setGenerated: $('set-generated'),
    library: $('library'),
    libraryEmpty: $('library-empty'),
    libTitle: $('lib-title'),
    libCount: $('lib-count'),
    showFull: $('show-full'),
    status: $('status'),
    iconName: $('icon-name'),
    iconMeta: $('icon-meta'),
    removeBtn: $('remove-btn'),
    resetBtn: $('reset-btn'),
    editBtn: $('edit-btn'),
    editHint: $('edit-hint'),
    optionsRow: $('options-row'),
    options: $('options'),
    gridToggle: $('grid-toggle'),
    stage: $('stage'),
    preview: $('preview'),
    stroke: $('stroke'),
    strokeLabel: $('stroke-label'),
    round0: $('round-0'),
    round5: $('round-5'),
    color: $('color'),
    pngMenu: $('png-menu'),
    dlSvg: $('dl-svg'),
    dlPng: $('dl-png'),
    copy: $('copy-code'),
    codeToggle: $('code-toggle'),
    code: $('code'),
  };

  // Basic set: the 21 most-used icons on clueso.io (3 rows of 7). The Full Set is every
  // icon on the site, in clueso-set.js order, which keeps related icons together.
  const BASIC = [
    'chevron-down', 'chevron-right', 'chevron-left', 'arrow-up-right', 'arrow-left', 'arrow-down', 'menu',
    'plus', 'close', 'check', 'copy', 'clock', 'sparkles', 'template',
    'chat-ai', 'users', 'shield-check', 'rocket', 'paperclip', 'star', 'play',
  ];

  // Families: related icons sit next to each other in the Web and Platform tabs, family
  // after family (no headings, no gaps). Variants sit with their base icon (mic-ai with mic,
  // image-ai with image...). Anything not listed goes at the end.
  const FAMILIES = [
    ['chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'chevrons-up-down', 'chevrons-left', 'chevrons-right', 'first', 'last'],
    ['arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up-right', 'arrow-left-end', 'arrow-right-end', 'external-link', 'download', 'upload', 'publish', 'send',
      'expand', 'collapse', 'fullscreen', 'fullscreen-exit', 'width', 'height', 'swap-horizontal', 'swap-vertical', 'split-arrows', 'turn-down', 'u-turn-left', 'u-turn-right'],
    ['refresh', 'replay', 'rotate-cw', 'rotate-acw', 'undo', 'redo', 'history', 'spinner'],
    ['menu', 'more', 'more-vertical', 'apps', 'grid', 'drag', 'plus', 'minus', 'close', 'delete', 'check', 'check-double', 'check-circle', 'search', 'zoom-in', 'zoom-out', 'filter', 'sort', 'sliders', 'gear', 'sidebar', 'card', 'divider'],
    ['info', 'help', 'warning'],
    ['link', 'link-off', 'paperclip', 'copy', 'duplicate', 'bookmark', 'flag', 'pin', 'tag', 'share', 'cursor', 'eye', 'eye-off', 'lock', 'lock-open', 'key', 'shield-check', 'sign-out'],
    ['cloud', 'cloud-sync', 'cloud-done', 'cloud-off'],
    ['folder', 'folder-open', 'folder-plus', 'file', 'file-plus', 'file-pdf', 'document', 'file-ppt', 'clipboard', 'book', 'book-open', 'scroll', 'template', 'layers', 'inbox', 'archive'],
    ['sparkles', 'star-4', 'wand-ai', 'effects', 'spotlight'],
    ['play', 'pause', 'pause-add', 'next', 'previous', 'record', 'record-screen', 'video', 'video-ai', 'video-square', 'video-element', 'video-camera', 'webcam', 'webcam-off', 'film', 'clueprint', 'captions', '4k', 'gif', 'image', 'image-ai', 'image-plus', 'animation'],
    ['mic', 'mic-ai', 'mic-off', 'transcript', 'speaker', 'speaker-low', 'mute', 'waveform', 'waveform-ai', 'music', 'headphones', 'headset'],
    ['pen', 'pencil', 'pencil-ai', 'paint-brush', 'eye-dropper', 'scissors', 'split', 'crop', 'swatches', 'gradient', 'opacity', 'water-drop', 'background', 'corner-radius', 'stroke-width', 'shapes', 'triangle', 'frame', 'padding', 'gap', 'anchor', 'angle', 'compare', 'cube'],
    ['align-left', 'align-center-h', 'align-right', 'align-top', 'align-center-v', 'align-bottom', 'flip-horizontal', 'flip-vertical', 'bring-to-front', 'bring-forward', 'send-backward', 'send-to-back'],
    ['playhead', 'keyframe', 'collapse-timeline', 'expand-timeline', 'timer', 'hourglass', 'duration', 'clock', 'calendar'],
    ['text', 'text-box', 'text-field', 'case', 'font-size', 'letter-spacing', 'line-height', 'bold', 'italic', 'underline', 'strikethrough', 'h1', 'h2', 'h3', 'h4', 'list', 'numbered-list', 'quote', 'text-align-left', 'text-align-center', 'text-align-right', 'translate'],
    ['transition', 'transition-dissolve', 'transition-push', 'transition-stack', 'transition-colour-wipe', 'transition-circle-wipe', 'transition-corner-wipe', 'transition-rainbow-wipe'],
    ['bell', 'chat', 'chat-ai', 'comment', 'callout', 'mail', 'mail-open', 'megaphone', 'phone'],
    ['user', 'users', 'users-three', 'user-check', 'user-plus', 'user-minus', 'user-off', 'user-speaking', 'ai-avatar', 'support', 'thumbs-up', 'thumbs-down', 'heart', 'star', 'award'],
    ['laptop', 'monitor', 'keyboard'],
    ['bar-chart', 'analytics', 'curve', 'trend-up', 'pie-chart', 'dollar-circle', 'dollar', 'wallet', 'billing', 'bank', 'building', 'enterprise', 'briefcase', 'gem'],
    ['home', 'location', 'map', 'globe', 'rocket', 'confetti', 'lightning', 'fire', 'sun', 'moon', 'plug', 'puzzle', 'browser-extension', 'graduation-cap', 'utensils', 'code', 'embed', 'shuffle'],
  ];

  // The key and generated icons live only in this browser.
  const STORE = { key: 'iconTool.apiKey', generated: 'iconTool.generated', edits: 'iconTool.edits', variants: 'iconTool.variants' };

  function loadGenerated() {
    try {
      const list = JSON.parse(localStorage.getItem(STORE.generated) || '[]');
      return Array.isArray(list) ? list.filter((i) => i && i.body && i.scale && i.style) : [];
    } catch (e) {
      return [];
    }
  }

  function saveGenerated() {
    try {
      localStorage.setItem(STORE.generated, JSON.stringify(state.generated));
    } catch (e) {
      setStatus('Could not save generated icons in this browser.', true);
    }
  }

  // One style in view at a time; the selection always belongs to that style.
  // mode: basic | full | site | generated.
  const state = {
    style: 'line',
    mode: 'web',
    round: 0,
    stroke: 1.5,
    showGoogle: false,
    sig: '', // round 13 signature option on show: '' (base), 'A', 'B', 'C' or 'D'
    pixelSize: 0.8, // pixel icons: pixel size in the cell (1 = touching); 0.8 since round 23 (two weights needs the gutter)
    pixelBuild: 'matrix', // pixel icons: 'matrix' (dot matrix, round 25), 'dots' (two weights), 'line' (from the base line set) or 'solid' (hand-drawn)
    pixelRadius: 0, // pixel icons: corner radius of each pixel
    current: null,
    generated: loadGenerated(),
    busy: false,
    composed: [],
    pane: 'icon', // the preview tab: 'icon' or 'context'
    ctxX: 25, // Context: where the before / after sliders sit (0–100, % from the left). 25: the icon (centred in every shot) starts fully New
    edit: null, // { paths, handles, sel (Set of handle indexes), drag, box } while editing the current icon's vector
  };

  const apiKey = () => localStorage.getItem(STORE.key) || '';
  const UPPER = new Set(['ai', 'ppt', 'gif', 'cc', '4k']);
  const pretty = (name) => name.split('-').filter(Boolean).map((w) => (UPPER.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
  const options = () => ({ stroke: state.stroke, round: state.round, color: els.color.value, pixelSize: state.pixelSize, pixelRadius: state.pixelRadius, pixelBuild: state.pixelBuild });
  const currentSvg = () => IconEngine.buildSvg(state.current, options());
  // Every icon of a style: the icons on clueso.io, built from Google Material Symbols.
  // The set: every icon on clueso.io (tools/clueso-manifest.js order), drawn in OUR style
  // (site-set.js, plus a few Sharp library icons). Google's Material Symbols drawing of the
  // same icon rides along as `icon.google`, shown behind ours with the Google toggle, as the
  // construction reference. Icons we haven't drawn yet fall back to Google's (marked).
  // Solid is Google's filled version for now.
  const DRAWN_FROM = {

  };
  const drawnSet = { line: [], solid: IconEngine.cluesoSet.solid };
  for (const g of IconEngine.cluesoSet.line) {
    const [kind, src] = DRAWN_FROM[g.name] || ['site', g.name];
    const drawn = kind === 'site' ? IconEngine.siteSet.find((i) => i.name === src) : IconEngine.library.find((i) => i.name === src);
    const meta = { name: g.name, replaces: g.replaces, pages: g.pages, example: g.example, keywords: g.keywords, site: true, platform: g.platform, google: g };
    if (drawn) {
      for (const o of drawn.options || [drawn]) Object.assign(o, meta);
      drawnSet.line.push(drawn);
    } else {
      for (const o of g.options) Object.assign(o, { google: o, googleOnly: true });
      drawnSet.line.push(g);
    }
  }
  const ofStyle = (style) => drawnSet[style];

  // Round 13 signature options (signature-set.js): each icon carries its base icon's details
  // (tab, Google reference, site capture), so Context works the same. Its own id keeps its
  // edits apart from the base drawing's.
  const lineByName = new Map(drawnSet.line.map((i) => [i.name, i]));
  const signatures = IconEngine.signatureSets.map((sig) => ({
    ...sig,
    icons: sig.icons.map((icon) => {
      const base = lineByName.get(icon.name) || {};
      for (const o of icon.options || [icon]) Object.assign(o, {
        id: `sig-${sig.key}:${o.name}${o.options ? `#${o.variant}` : ''}`, site: true, platform: base.platform, google: base.google,
        replaces: base.replaces, pages: base.pages, example: base.example, keywords: base.keywords || o.keywords,
      });
      return icon;
    }),
  }));
  const signatureOf = (key) => signatures.find((s) => s.key === key);
  // Pixel tab: the round 13 pixel icons (24 grid). The pixel illustrations (rounds 16–17,
  // pixel-illustrations.js) are paused; set this to IconEngine.pixelIllustrations to show them.
  const pixelIcons = IconEngine.pixelSet;
  const generatedOfStyle = (style) => state.generated.filter((i) => i.style === style);

  // Short messages (copied, saved, errors) under the icon's details.
  function setStatus(text, isError) {
    els.status.textContent = text;
    els.status.classList.toggle('error', Boolean(isError));
  }

  // The icon grid: 1-unit grid, the 20 × 20 live area inside the 2-unit padding,
  // keylines on the outer edge (circle 20, square 18, portrait 16 × 20,
  // landscape 20 × 16), centre circle, thirds and diagonals. Sharp, no radius.
  function keylineOverlay() {
    const k = IconEngine.KEYLINES;
    const rect = (cls, w, h) => `<rect class="${cls}" x="${(24 - w) / 2}" y="${(24 - h) / 2}" width="${w}" height="${h}" rx="${k.radius}"/>`;
    const line = (cls, x1, y1, x2, y2) => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const units = [];
    for (let i = 1; i < 24; i++) units.push(line('px', i, 0, i, 24), line('px', 0, i, 24, i));
    return `<g class="overlay">${[
      ...units,
      '<rect class="gr" x="0" y="0" width="24" height="24"/>',
      line('gr', 0, 0, 24, 24), line('gr', 24, 0, 0, 24),
      line('gr', 8, 0, 8, 24), line('gr', 16, 0, 16, 24),
      line('gr', 0, 8, 24, 8), line('gr', 0, 16, 24, 16),
      `<circle class="gr" cx="12" cy="12" r="${k.centreCircle / 2}"/>`,
      rect('safe', 24 - 2 * k.padding, 24 - 2 * k.padding),
      `<circle class="kl" cx="12" cy="12" r="${k.circle / 2}"/>`,
      rect('kl', k.square, k.square), rect('kl', ...k.portrait), rect('kl', ...k.landscape),
    ].join('')}</g>`;
  }

  // Google's Material Symbols drawing of the same icon, faint, behind ours: a construction
  // check while the design language settles. (Not shown in the details or exports.)
  function googleLayer() {
    const icon = state.current;
    const g = icon && icon.google;
    if (!state.showGoogle || !g || icon.style !== 'line') return '';
    const inner = IconEngine.buildSvg(g, { ...options(), color: '#4f8cff' }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<g class="google-ref">${inner}</g>`;
  }

  // Pixel illustrations: the 64-pixel grid, with a stronger line every 8 pixels.
  function pixelGridOverlay(n) {
    const lines = [];
    for (let i = 1; i < n; i++) {
      const cls = i % 8 ? 'px' : 'gr';
      lines.push(`<line class="${cls}" x1="${i}" y1="0" x2="${i}" y2="${n}"/>`, `<line class="${cls}" x1="0" y1="${i}" x2="${n}" y2="${i}"/>`);
    }
    return `<g class="overlay" style="stroke-width:0.04">${lines.join('')}<rect class="gr" x="0" y="0" width="${n}" height="${n}"/></g>`;
  }

  function renderPreview() {
    const svg = currentSvg();
    const root = svg.match(/^<svg[^>]*>/)[0];
    const rest = svg.slice(root.length, -'</svg>'.length);
    const overlay = state.current.grid ? pixelGridOverlay(state.current.grid) : keylineOverlay();
    els.preview.innerHTML = `${root}${overlay}${googleLayer()}${rest}${state.edit ? handlesMarkup() : ''}</svg>`;
    els.code.textContent = svg;
  }

  // ---- Vector editing ------------------------------------------------------------
  // Edits work on the icon's paths in grid units (IconEngine.editablePaths). Points
  // are shared between segments, so dragging a corner moves both lines that meet
  // there. Anchors carry their curve handles with them. Edits are saved per icon.

  const hasOptions = (icon) => Boolean(icon.options && icon.options.length > 1);
  const editKey = (icon) => icon.id || `${icon.clueso ? `clueso-${icon.style}` : icon.site ? 'site' : 'lib'}:${icon.name}${hasOptions(icon) ? `#${icon.variant}` : ''}`;
  const snapshot = (icon) => ({ body: icon.body, scale: icon.scale, tx: icon.tx, ty: icon.ty, box: { ...icon.box }, optical: icon.optical });

  function loadEdits() {
    try { return JSON.parse(localStorage.getItem(STORE.edits) || '{}'); } catch (e) { return {}; }
  }

  function saveEdit(icon) {
    if (icon.generated) { saveGenerated(); return; }
    const edits = loadEdits();
    if (icon.edited) edits[editKey(icon)] = icon.body; else delete edits[editKey(icon)];
    try { localStorage.setItem(STORE.edits, JSON.stringify(edits)); } catch (e) { setStatus('Could not save the edit in this browser.', true); }
  }

  // Keep every built-in icon's original so Reset can bring it back, then apply saved edits.
  (function applySavedEdits() {
    const edits = loadEdits();
    const extra = [...signatures.flatMap((s) => s.icons.flatMap((i) => i.options || [i])), ...pixelIcons];
    for (const icon of [...['line', 'solid'].flatMap((st) => drawnSet[st].flatMap((i) => i.options || [i])), ...extra]) {
      icon.original = snapshot(icon);
      const body = edits[editKey(icon)];
      if (body) {
        icon.body = body;
        IconEngine.applyEditablePaths(icon, IconEngine.editablePaths(Object.assign(icon, { scale: 1, tx: 0, ty: 0 })));
      }
    }
  })();

  // ---- Icon options --------------------------------------------------------------
  // Some icons come in options (upright / diagonal / sharp). The chosen option
  // replaces the icon everywhere (library grid, search, exports) and is remembered.

  function loadVariants() {
    try { return JSON.parse(localStorage.getItem(STORE.variants) || '{}'); } catch (e) { return {}; }
  }

  // Put an icon's chosen option in place in both styles (line and solid share the choice).
  function useOption(name, label) {
    for (const st of ['line', 'solid']) {
      const list = drawnSet[st];
      const i = list.findIndex((x) => x.name === name);
      const chosen = i >= 0 && list[i].options.find((o) => o.variant === label);
      if (chosen) list[i] = chosen;
    }
  }

  (function applySavedVariants() {
    const saved = loadVariants();
    for (const [name, label] of Object.entries(saved)) useOption(name, label);
  })();

  function chooseOption(option) {
    // Signature samples: swap the option into its sample list (not saved; it's for comparing).
    if (option.signature) {
      const list = signatureOf(option.signature).icons;
      const i = list.findIndex((x) => x.name === option.name);
      if (i >= 0) list[i] = option;
      stopEditing();
      select(option);
      return;
    }
    useOption(option.name, option.variant);
    const saved = loadVariants();
    saved[option.name] = option.variant;
    try { localStorage.setItem(STORE.variants, JSON.stringify(saved)); } catch (e) { /* not saved */ }
    stopEditing();
    select(option);
  }

  function renderOptions() {
    const icon = state.current;
    els.optionsRow.hidden = !hasOptions(icon);
    els.options.innerHTML = '';
    if (!hasOptions(icon)) return;
    icon.options.forEach((option) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'txt' + (option === icon ? ' on' : '');
      b.textContent = option.variant;
      b.addEventListener('click', () => chooseOption(option));
      els.options.appendChild(b);
    });
  }

  function buildHandles(paths) {
    const handles = [];
    const seen = new Set();
    paths.forEach((subs) => subs.forEach((sp) => {
      const anchors = [sp.start, ...sp.segs.map((s) => s.to)];
      for (const a of anchors) {
        if (seen.has(a)) continue;
        seen.add(a);
        // Curve handles that belong to this anchor move with it.
        const linked = [];
        for (const s of sp.segs) {
          if (s.t !== 'C') continue;
          if (s.from === a) linked.push(s.c1);
          if (s.to === a) linked.push(s.c2);
        }
        handles.push({ kind: 'anchor', pt: a, linked });
      }
      for (const s of sp.segs) {
        if (s.t !== 'C') continue;
        handles.push({ kind: 'ctrl', pt: s.c1, anchor: s.from, linked: [] });
        handles.push({ kind: 'ctrl', pt: s.c2, anchor: s.to, linked: [] });
      }
    }));
    return handles;
  }

  function handlesMarkup() {
    const f = (n) => Number(n.toFixed(3));
    const parts = [];
    state.edit.handles.forEach((h, i) => {
      if (h.kind === 'ctrl') parts.push(`<line class="cl" x1="${f(h.anchor[0])}" y1="${f(h.anchor[1])}" x2="${f(h.pt[0])}" y2="${f(h.pt[1])}"/>`);
    });
    state.edit.handles.forEach((h, i) => {
      const sel = state.edit.sel.has(i) ? ' sel' : '';
      parts.push(h.kind === 'anchor'
        ? `<rect class="anchor${sel}" data-h="${i}" x="${f(h.pt[0] - 0.35)}" y="${f(h.pt[1] - 0.35)}" width="0.7" height="0.7"/>`
        : `<circle class="ctrl${sel}" data-h="${i}" cx="${f(h.pt[0])}" cy="${f(h.pt[1])}" r="0.3"/>`);
    });
    const b = state.edit.box;
    if (b) {
      parts.push(`<rect class="marquee" x="${f(Math.min(b.x0, b.x1))}" y="${f(Math.min(b.y0, b.y1))}" width="${f(Math.abs(b.x1 - b.x0))}" height="${f(Math.abs(b.y1 - b.y0))}"/>`);
    }
    return `<g class="handles">${parts.join('')}</g>`;
  }

  // Every point the selection moves, each once: the selected handles, plus the curve
  // handles that ride along with selected anchors.
  function selectedPoints() {
    const pts = new Set();
    for (const i of state.edit.sel) {
      const h = state.edit.handles[i];
      pts.add(h.pt);
      h.linked.forEach((c) => pts.add(c));
    }
    return [...pts];
  }

  // Move the selection by (dx, dy) from where each point started.
  function moveSelection(dx, dy, from) {
    const pts = selectedPoints();
    const start = from || new Map(pts.map((p) => [p, [p[0], p[1]]]));
    for (const p of pts) { const s0 = start.get(p); p[0] = s0[0] + dx; p[1] = s0[1] + dy; }
    IconEngine.applyEditablePaths(state.current, state.edit.paths);
    renderPreview();
  }

  function commitEdit() {
    saveEdit(state.current);
    renderTitle(state.current);
    els.resetBtn.hidden = !state.current.edited;
    renderLibrary();
  }

  function startEditing() {
    const icon = state.current;
    if (!icon.original) icon.original = snapshot(icon);
    const paths = IconEngine.editablePaths(icon);
    state.edit = { paths, handles: buildHandles(paths), sel: new Set(), drag: null, box: null };
    els.editBtn.textContent = 'Done';
    els.editBtn.classList.add('on');
    els.editHint.hidden = false;
    els.stage.classList.add('editing');
    renderPreview();
  }

  function stopEditing() {
    if (!state.edit) return;
    state.edit = null;
    els.editBtn.textContent = 'Edit';
    els.editBtn.classList.remove('on');
    els.editHint.hidden = true;
    els.stage.classList.remove('editing');
    renderPreview();
  }

  function resetIcon() {
    const icon = state.current;
    if (!icon.original) return;
    Object.assign(icon, { ...icon.original, box: { ...icon.original.box }, edited: false });
    saveEdit(icon);
    const editing = Boolean(state.edit);
    stopEditing();
    if (editing) startEditing();
    setStatus(`Reset ${icon.name} to its original`);
    refresh();
  }

  function svgPoint(e) {
    const svg = els.preview.querySelector('svg');
    if (!svg.createSVGPoint || !svg.getScreenCTM || !svg.getScreenCTM()) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // Click a point to select it; Shift-click adds or removes; drag on empty space draws a
  // box (Shift adds to the selection). Dragging any selected point moves them all.
  els.preview.addEventListener('pointerdown', (e) => {
    if (!state.edit) return;
    e.preventDefault();
    const attr = e.target.getAttribute && e.target.getAttribute('data-h');
    const p = svgPoint(e);
    if (els.preview.setPointerCapture && e.pointerId !== undefined) els.preview.setPointerCapture(e.pointerId);
    if (attr === null || attr === undefined) {
      if (!e.shiftKey) state.edit.sel = new Set();
      state.edit.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: new Set(state.edit.sel) };
      renderPreview();
      return;
    }
    const i = Number(attr);
    if (e.shiftKey) {
      if (state.edit.sel.has(i)) state.edit.sel.delete(i); else state.edit.sel.add(i);
      renderPreview();
      return;
    }
    if (!state.edit.sel.has(i)) state.edit.sel = new Set([i]);
    const h = state.edit.handles[i];
    const pts = selectedPoints();
    state.edit.drag = { id: e.pointerId, origin: [h.pt[0], h.pt[1]], press: [p.x, p.y], start: new Map(pts.map((q) => [q, [q[0], q[1]]])) };
    renderPreview();
  });
  els.preview.addEventListener('pointermove', (e) => {
    if (!state.edit) return;
    const p = svgPoint(e);
    if (state.edit.box) {
      const b = state.edit.box;
      b.x1 = p.x; b.y1 = p.y;
      const [xa, xb] = [Math.min(b.x0, b.x1), Math.max(b.x0, b.x1)];
      const [ya, yb] = [Math.min(b.y0, b.y1), Math.max(b.y0, b.y1)];
      state.edit.sel = new Set(b.add);
      state.edit.handles.forEach((h, i) => {
        if (h.pt[0] >= xa && h.pt[0] <= xb && h.pt[1] >= ya && h.pt[1] <= yb) state.edit.sel.add(i);
      });
      renderPreview();
      return;
    }
    const d = state.edit.drag;
    if (!d) return;
    // The point under the pointer snaps to ¼ (Alt: free); the rest move by the same amount.
    const snap = (v) => (e.altKey ? Math.round(v * 100) / 100 : Math.round(v * 4) / 4);
    const x = snap(d.origin[0] + p.x - d.press[0]);
    const y = snap(d.origin[1] + p.y - d.press[1]);
    moveSelection(x - d.origin[0], y - d.origin[1], d.start);
  });
  const endDrag = () => {
    if (!state.edit) return;
    if (state.edit.box) { state.edit.box = null; renderPreview(); return; }
    if (!state.edit.drag) return;
    state.edit.drag = null;
    commitEdit();
  };
  els.preview.addEventListener('pointerup', endDrag);
  els.preview.addEventListener('pointercancel', endDrag);
  document.addEventListener('keydown', (e) => {
    const typing = e.target && e.target.closest && e.target.closest('input, select, textarea');
    if (!state.edit || typing) return;
    if (e.key === 'Escape') { stopEditing(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      state.edit.sel = new Set(state.edit.handles.map((h, i) => i).filter((i) => state.edit.handles[i].kind === 'anchor'));
      renderPreview();
      return;
    }
    if (!state.edit.sel.size) return;
    const step = e.shiftKey ? 1 : 0.25;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    moveSelection(d[0], d[1]);
    commitEdit();
  });

  // Web: icons on clueso.io. Platform: icons in the Clueso platform (web.clueso.io). Icons used
  // in both show in both. Within a tab, related icons sit together (FAMILIES order).
  const inTab = (icon, tab) => (tab === 'platform' ? Boolean(icon.platform) : icon.platform !== true);
  const FAMILY_ORDER = new Map(FAMILIES.flat().map((n, i) => [n, i]));
  const familyRank = (icon) => (FAMILY_ORDER.has(icon.name) ? FAMILY_ORDER.get(icon.name) : 9999);

  function visibleIcons() {
    if (state.mode === 'generated') return generatedOfStyle(state.style);
    if (state.mode === 'pixel') return pixelIcons;
    if (state.sig) return signatureOf(state.sig).icons;
    return ofStyle(state.style).filter((i) => inTab(i, state.mode)).sort((a, b) => familyRank(a) - familyRank(b));
  }

  // Library thumbnails use the panel's ink, not the preview colour (the panels are light or dark).
  const panelInk = () => getComputedStyle(document.body).getPropertyValue('--ink').trim() || options().color;

  function renderLibrary() {
    const icons = visibleIcons();
    const opts = { ...options(), color: panelInk() };
    const generatedView = state.mode === 'generated';
    els.library.innerHTML = '';
    // Pixel tab: each illustration on the clueso.io feature card it's for, light and dark side by side.
    const cards = state.mode === 'pixel' && icons.length > 0 && icons[0].illustration;
    els.library.classList.toggle('card-grid', Boolean(cards));
    if (cards) {
      icons.forEach((icon) => {
        for (const theme of ['light', 'dark']) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `ill-card${theme === 'dark' ? ' dark' : ''}${state.current === icon ? ' sel' : ''}`;
          b.innerHTML = illustrationCard(icon, theme);
          b.addEventListener('click', () => select(icon));
          els.library.appendChild(b);
        }
      });
    }
    if (!cards) icons.forEach((icon) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell' + (state.current === icon ? ' sel' : '');
      b.title = icon.googleOnly ? `${pretty(icon.name)} · not drawn in our style yet` : generatedView && icon.prompt ? `${pretty(icon.name)} · “${icon.prompt}”`
        : icon.site ? `${pretty(icon.name)} · replaces ${icon.replaces}` : pretty(icon.name);
      b.setAttribute('aria-label', pretty(icon.name));
      b.innerHTML = IconEngine.buildSvg(icon, opts);
      b.addEventListener('click', () => select(icon));
      els.library.appendChild(b);
    });
    const styleName = state.style === 'line' ? 'Line' : 'Solid';
    const total = ofStyle(state.style).length;
    const tabName = state.mode === 'platform' ? 'Platform' : 'Web';
    const sig = state.mode !== 'pixel' && state.sig ? signatureOf(state.sig) : null;
    els.libTitle.textContent = generatedView ? `Generated · ${styleName}` : state.mode === 'pixel' ? 'Pixel · web'
      : sig ? `Style ${sig.label}` : `${tabName} · ${styleName}`;
    els.libCount.textContent = `${icons.length} icons`;
    const note = state.mode === 'pixel' && !(icons[0] && icons[0].illustration) ? 'Pixel direction, for the website only (the platform stays on the base set). Dot matrix: drawn from the base line set, round dots of one size on a 14 × 14 grid, shapes solid with their details knocked out. Other constructions, dot size and corners are in the panel.'
      : state.mode === 'pixel' ? 'Pixel illustration language: every feature is a token (a coin or a tile in perspective) with its glyph cut in; depth is drawn with pixel size: face full, side mid, glyph small. For the AI avatars feature cards (clueso.io/features/ai-avatars), top left at 120 px, light and dark. 64 × 64 grid.'
      : sig ? `${sig.idea} A sample to compare with the base set: click an icon, then Context to see it on clueso.io and in the product.` : '';
    els.libNote.textContent = note;
    els.libNote.hidden = !note;
    els.setPixel.classList.toggle('on', state.mode === 'pixel');
    for (const b of els.sigToggle.querySelectorAll('[data-sig]')) {
      b.classList.toggle('on', state.mode !== 'pixel' && b.dataset.sig === state.sig);
      b.disabled = state.mode === 'pixel';
    }
    els.library.hidden = generatedView && !icons.length;
    els.libraryEmpty.hidden = !(generatedView && !icons.length);
    els.setWeb.classList.toggle('on', state.mode === 'web' && !sig);
    els.setPlatform.classList.toggle('on', state.mode === 'platform' && !sig);
    els.setGenerated.classList.toggle('on', generatedView);
    els.setGenerated.textContent = state.generated.length ? `Generated · ${state.generated.length}` : 'Generated';
    els.styleLine.classList.toggle('on', state.style === 'line');
    els.styleSolid.classList.toggle('on', state.style === 'solid');
  }

  function enableOutputs(on) {
    els.dlSvg.disabled = !on;
    els.dlPng.disabled = !on;
    els.copy.disabled = !on;
  }

  function refresh() {
    const icon = state.current;
    if (!icon) return;
    for (const b of els.stroke.querySelectorAll('[data-stroke]')) b.classList.toggle('on', Number(b.dataset.stroke) === state.stroke);
    // Stroke only applies to line icons. Solid icons are filled shapes.
    const isLine = icon.style === 'line';
    for (const b of els.stroke.querySelectorAll('button')) b.disabled = !isLine;
    els.strokeLabel.classList.toggle('disabled', !isLine);
    els.round0.classList.toggle('on', state.round === 0 || Boolean(icon.pixel));
    els.round5.classList.toggle('on', state.round === 0.5 && !icon.pixel);
    // Pixel icons stay square: rounding would turn the pixels into dots.
    els.round5.disabled = Boolean(icon.pixel);
    els.removeBtn.hidden = !icon.generated;
    els.editBtn.hidden = Boolean(icon.illustration || icon.pixel); // pixels aren't edited point by point
    // Pixel icons: the Pixels section instead of stroke and corners.
    $('pixel-props').hidden = !icon.pixel;
    els.strokeLabel.hidden = Boolean(icon.pixel);
    $('corners-row').hidden = Boolean(icon.pixel);
    for (const b of document.querySelectorAll('#pixel-size [data-px]')) b.classList.toggle('on', Number(b.dataset.px) === state.pixelSize);
    for (const b of document.querySelectorAll('#pixel-corner [data-pr]')) b.classList.toggle('on', Number(b.dataset.pr) === state.pixelRadius);
    // Round 25: dot-matrix dots are round, so pixel corners don't apply.
    { const row = document.getElementById('pixel-corner'); if (row && row.parentElement) row.parentElement.hidden = state.pixelBuild === 'matrix'; }
    for (const b of document.querySelectorAll('#pixel-build [data-pb]')) {
      b.classList.toggle('on', b.dataset.pb === state.pixelBuild);
      b.disabled = icon.pixel && b.dataset.pb === 'solid' && !icon.pixelCellsSolid;
    }
    const label = $('canvas-label');
    if (label) label.textContent = `${icon.title || pretty(icon.name)}${icon.pixel ? ' · pixel' : icon.signature ? ` · ${icon.signature}` : ''}`;
    $('google-toggle').hidden = Boolean(icon.pixel); // no Google reference for the pixel style
    els.resetBtn.hidden = !icon.edited;
    renderOptions();
    renderPreview();
    renderRamp();
    if (state.pane === 'context' && typeof renderContextPane === 'function') renderContextPane();
    renderLibrary();
    enableOutputs(true);
  }

  // Bottom bar: the current icon at real sizes, in the panel's ink. Each size sits centred in the
  // same 48 px box with its label on one baseline, so the row lines up.
  function renderRamp() {
    const ramp = $('ramp');
    if (!ramp || !state.current) return;
    ramp.innerHTML = [16, 20, 24, 32, 48].map((s) => `<span class="rp"><span class="rp-box">${sizedSvg(state.current, s, panelInk())}</span><span class="rp-label">${s}</span></span>`).join('');
  }
  for (const b of document.querySelectorAll('#pixel-size [data-px]')) b.addEventListener('click', () => { state.pixelSize = Number(b.dataset.px); refresh(); });
  for (const b of document.querySelectorAll('#pixel-corner [data-pr]')) b.addEventListener('click', () => { state.pixelRadius = Number(b.dataset.pr); refresh(); });
  for (const b of document.querySelectorAll('#pixel-build [data-pb]')) b.addEventListener('click', () => { state.pixelBuild = b.dataset.pb; refresh(); });

  // Light (Brand Lab) or dark; remembered in this browser.
  // Light / dark, as on clueso.design (lib/theme.ts, components/site/theme-toggle.tsx): follows the
  // system until you pick one; colours switch in one frame (no fading), while the sun and moon morph.
  // Mouse and pen switch on press, keyboard and touch on click.
  (function setupTheme() {
    const btn = $('theme-btn');
    if (!btn) return;
    const KEY = window.ICON_LAB_THEME_KEY || 'iconTool.theme';
    const stored = () => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; } };
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const resolved = () => stored() || (media && media.matches ? 'dark' : 'light');
    const icon = btn.querySelector('.theme-icon');
    const apply = (theme) => {
      const root = document.documentElement;
      root.classList.add('theme-instant');
      document.body.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('dark', theme === 'dark'); // the site's own dark class (clueso.design)
      root.style.colorScheme = theme;
      void root.offsetHeight; // take the new colours now, with transitions off
      root.classList.remove('theme-instant');
      icon.dataset.theme = theme;
      // Round 23: the artboard follows the theme (light artboard in light mode), and so does the
      // default ink: off-white on dark, ink on light. A colour you picked yourself stays.
      const def = theme === 'dark' ? '#f5f3e7' : '#111111'; const other = theme === 'dark' ? '#111111' : '#f5f3e7';
      if (els.color.value.toLowerCase() === other) {
        els.color.value = def;
        for (const sw of document.querySelectorAll('#swatches .sw')) sw.classList.toggle('on', sw.dataset.color === def);
        if (state.current) refresh();
      }
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      renderLibrary();
      renderRamp();
    };
    const toggle = () => {
      const next = resolved() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch (e) { /* not saved */ }
      apply(next);
    };
    apply(resolved());
    if (media) media.addEventListener('change', () => { if (!stored()) apply(resolved()); });
    let pointer = '';
    btn.addEventListener('pointerdown', (e) => { pointer = e.pointerType; if (e.button !== 0 || e.pointerType === 'touch') return; toggle(); });
    btn.addEventListener('click', (e) => { if (e.detail > 0 && pointer !== 'touch') return; toggle(); });
  })();

  function firstLibraryIcon(style) {
    return ofStyle(style).find((i) => i.name === 'chevron-down') || ofStyle(style)[0];
  }

  function opticalNote(icon) {
    const o = icon.optical || { dx: 0, dy: 0 };
    if (icon.edited || (!o.dx && !o.dy)) return '';
    const part = (v, neg, pos) => (v ? `${Math.abs(v)} ${v < 0 ? neg : pos}` : '');
    return ` · nudged ${[part(o.dx, 'left', 'right'), part(o.dy, 'up', 'down')].filter(Boolean).join(', ')} for visual balance`;
  }

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SITE = 'https://www.clueso.io';

  // The icon's name and details, shown under Preview.
  function renderTitle(target) {
    els.iconName.textContent = target.title || pretty(target.name);
    const rows = [];
    if (target.illustration) rows.push(['Idea', esc(target.idea)], ['Grid', '64 × 64 pixels, shown at 120–128 px'], ['Colours', 'Ink takes the colour below; pink and magenta are the accents']);
    if (hasOptions(target)) rows.push(['Option', esc(target.variant)]);
    if (target.generated && target.prompt) rows.push(['Prompt', `“${esc(target.prompt)}”`]);
    if (target.edited) rows.push(['Edited', 'Yes (Reset brings back the original)']);
    const nudge = opticalNote(target);
    if (nudge) rows.push(['Placement', esc(nudge.replace(/^ · /, ''))]);
    els.iconMeta.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }

  function select(icon) {
    const target = icon || firstLibraryIcon(state.style);
    if (target !== state.current) stopEditing();
    state.current = target;
    state.style = target.style;
    renderTitle(target);
    setStatus('');
    refresh();
  }

  // Switching style keeps the view consistent: select the first icon of that style.
  function setStyle(style) {
    if (state.style === style) return;
    state.style = style;
    const same = state.current && ofStyle(style).find((i) => i.name === state.current.name);
    select(same || visibleIcons()[0]);
  }

  function setMode(mode) {
    const was = state.mode;
    state.mode = mode;
    if (mode !== 'pixel') state.style = 'line';
    if (mode === 'pixel' || was === 'pixel' || mode === 'generated' || was === 'generated' || state.sig) {
      // Web and Platform show the base set; Pixel its own icons.
      if (mode !== 'pixel') state.sig = '';
      select(visibleIcons()[0]);
      return;
    }
    renderLibrary();
  }

  // Signature option: show its sample icons (and select the one in view, if it's in the sample).
  function setSignature(key) {
    state.sig = key;
    if (state.mode === 'pixel') state.mode = 'web';
    state.style = 'line';
    const list = visibleIcons();
    select(list.find((i) => state.current && i.name === state.current.name) || list[0]);
  }

  function setRound(r) {
    state.round = r;
    refresh();
  }

  // ---- Prompt ------------------------------------------------------------------
  // Connected: Claude draws three new options in the current style.
  // Not connected: find the closest icon in the library.

  function matchLibrary(prompt) {
    $('request-box').hidden = true;
    // In the Pixel tab, look in the pixel icons first.
    if (state.mode === 'pixel') {
      const q = prompt.trim().toLowerCase();
      const hit = pixelIcons.find((i) => i.name === q || i.name.includes(q) || (i.keywords || []).some((k) => k.includes(q)));
      if (hit) { select(hit); return; }
    }
    if (state.style !== 'line') state.style = 'line'; // pixel icons are 'solid' internally; search the line set
    const icon = IconEngine.matchIcon(prompt, state.style);
    if (!icon) {
      setStatus(`No icon matches “${prompt.trim()}”.`, true);
      showRequest(prompt.trim());
      return;
    }
    // In a signature option, show its drawing of the icon when it has one.
    const sigHit = state.sig && signatureOf(state.sig).icons.find((i) => i.name === icon.name);
    if (!sigHit) state.sig = '';
    if (state.mode === 'pixel' || !inTab(icon, state.mode)) state.mode = icon.platform === true ? 'platform' : 'web';
    select(sigHit || icon);
  }

  // ---- Icon requests ------------------------------------------------------------------
  // Search found nothing → "Request this icon". There's no backend yet, so a request opens an email
  // to the design team (or is copied for Discord) and is kept in this browser. The workflow comes later.
  const REQUEST_TO = 'sneha@clueso.io'; // the design team's inbox for icon requests (change when there's a shared one)
  function showRequest(what) {
    $('request-what').textContent = `“${what}”`;
    $('request-box').hidden = false;
    $('rq-name').value = what;
  }
  function requestText() {
    const name = $('rq-name').value.trim(); const where = $('rq-where').value;
    const notes = $('rq-notes').value.trim(); const from = $('rq-from').value.trim();
    return { subject: `Icon request: ${name}`, body: `Icon: ${name}\nWhere: ${where}\nWhat it's for: ${notes || '-'}\nFrom: ${from || '-'}\n\n(Sent from Icon Lab)` };
  }
  function keepRequest() {
    try {
      const list = JSON.parse(localStorage.getItem('iconTool.requests') || '[]');
      list.push({ ...requestText(), at: new Date().toISOString() });
      localStorage.setItem('iconTool.requests', JSON.stringify(list));
    } catch (e) { /* not kept */ }
  }
  $('request-close').addEventListener('click', () => { $('request-box').hidden = true; setStatus(''); });
  $('request-open').addEventListener('click', () => { $('rq-sent').hidden = true; $('request-dialog').showModal(); });
  $('request-form').addEventListener('submit', (e) => {
    if (e.submitter && e.submitter.value === 'cancel') return;
    const { subject, body } = requestText();
    keepRequest();
    window.location.href = `mailto:${REQUEST_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('request-box').hidden = true;
    setStatus('Request opened in your email. Thanks!');
  });
  $('rq-copy').addEventListener('click', async () => {
    const { subject, body } = requestText();
    keepRequest();
    try { await navigator.clipboard.writeText(`${subject}\n${body}`); $('rq-sent').textContent = 'Copied. Paste it in the design team’s Discord channel.'; }
    catch (e) { $('rq-sent').textContent = 'Couldn’t copy here. Use Send by email instead.'; }
    $('rq-sent').hidden = false;
  });

  function setBusy(on) {
    state.busy = on;
    els.generateBtn.disabled = on;
    els.prompt.disabled = on;
    els.stage.classList.toggle('busy', on);
  }

  async function drawWithClaude(prompt) {
    const style = state.style;
    const started = Date.now();
    const tick = () => setStatus(`Drawing 3 ${style} options… ${Math.round((Date.now() - started) / 1000)}s`);
    tick();
    const timer = setInterval(tick, 1000);
    setBusy(true);
    try {
      const { icons, rejected } = await IconGenerator.generate({ prompt, style, apiKey: apiKey() });
      state.generated = [...icons, ...state.generated];
      saveGenerated();
      state.mode = 'generated';
      select(icons[0]);
      const skipped = rejected.length ? ` · ${rejected.length} skipped` : '';
      setStatus(`${icons.length} new option${icons.length === 1 ? '' : 's'} for “${prompt.trim()}”${skipped}`);
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }

  function onPrompt(prompt) {
    if (state.busy) return;
    if (!prompt.trim()) {
      setStatus('Type the icon you need.', true);
      return;
    }
    askFor(prompt.trim());
  }

  // ---- One prompt (round 23): find it, or offer to create it ---------------------------------
  // 1. The set already has it (every word of the prompt is covered): show it on the artboard, with
  //    other drawings that also match.
  // 2. It doesn't: say so, show the closest drawings, and ask "Create it?". Yes composes it from the
  //    set's parts (compose.js, no API); the options open here; Keep saves one under Generated.
  // 3. It can't be built from parts: offer to request it from the design team.
  // In the Pixel tab the pixel icons are searched first.
  const byName = (n) => ofStyle('line').find((i) => i.name === n);
  const tray = () => $('gen-tray');
  function trayShow({ title, body = '', actions = [] }) {
    $('gen-title').textContent = title;
    $('gen-body').innerHTML = body;
    const act = $('gen-actions');
    act.innerHTML = '';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = a.primary ? 'ghost-btn primary-btn' : 'ghost-btn'; b.textContent = a.label;
      if (a.id) b.id = a.id;
      if (a.disabled) b.disabled = true;
      b.addEventListener('click', a.run);
      act.appendChild(b);
    }
    act.hidden = !actions.length;
    tray().hidden = false;
  }
  const chips = (icons, cls = 'gen-opt') => icons.map((ic, i) => `<button type="button" class="${cls}" data-i="${i}" title="${esc(ic.title || pretty(ic.name))}">${sizedSvg(ic, 32, panelInk())}<span>${esc(ic.label || ic.title || pretty(ic.name))}</span></button>`).join('');
  function wire(list, onPick) {
    for (const b of $('gen-body').querySelectorAll('[data-i]')) b.addEventListener('click', () => {
      for (const x of $('gen-body').querySelectorAll('[data-i]')) x.classList.toggle('sel', x === b);
      onPick(list[Number(b.dataset.i)]);
    });
  }
  function showIcon(icon) {
    // Show a set icon in its own tab (Web / Platform), like a library click.
    if (!icon.composed && !icon.pixel) {
      state.sig = state.sig && signatureOf(state.sig).icons.some((i) => i.name === icon.name) ? state.sig : '';
      if (state.mode === 'pixel' || state.mode === 'generated' || !inTab(icon, state.mode)) state.mode = icon.platform === true ? 'platform' : 'web';
    }
    select(icon);
  }

  function askFor(prompt) {
    $('request-box').hidden = true;
    if (state.mode === 'pixel') {
      const q = prompt.toLowerCase();
      const hit = pixelIcons.find((i) => i.name === q || i.name.includes(q) || (i.keywords || []).some((k) => k.includes(q)));
      if (hit) { select(hit); trayShow({ title: `In the pixel set: ${pretty(hit.name)}` }); return; }
    }
    const found = IconCompose.findExisting(prompt);
    const exact = found.exact.map(byName).filter(Boolean);
    if (exact.length) {
      showIcon(exact[0]);
      trayShow({
        title: exact.length > 1 ? `In the set: ${pretty(exact[0].name)} and ${exact.length - 1} more` : `In the set: ${pretty(exact[0].name)}`,
        body: exact.length > 1 ? `<div class="gen-options">${chips(exact.slice(0, 6))}</div>` : '',
      });
      if (exact.length > 1) { $('gen-body').querySelector('[data-i="0"]').classList.add('sel'); wire(exact, showIcon); }
      return;
    }
    const near = found.near.map(byName).filter(Boolean);
    const plan = IconCompose.compose(prompt);
    const buildable = plan.options.some((o) => !o.existing);
    trayShow({
      title: `“${prompt}” doesn't exist in the set yet.`,
      body: `<p class="gen-q">${buildable ? 'Do you want me to create it? It will be built from parts of the set (its shapes and badges), in the same style.' : 'It can’t be built from the set’s parts. You can request it from the design team.'}</p>
        ${near.length ? `<p class="gen-sub">Closest in the set</p><div class="gen-options small">${chips(near.slice(0, 6))}</div>` : ''}`,
      actions: [
        ...(buildable ? [{ label: 'Yes, create it', primary: true, run: () => createFrom(prompt, plan) }] : []),
        { label: 'Request it from the design team', run: () => { $('rq-name').value = prompt; $('rq-sent').hidden = true; $('request-dialog').showModal(); } },
      ],
    });
    if (near.length) wire(near, showIcon);
  }

  function createFrom(prompt, plan) {
    const options = plan.options.filter((o) => !o.existing);
    state.composed = options;
    const list = options.map((o) => Object.assign(o.icon, { label: o.label }));
    const keep = () => {
      const icon = state.current;
      if (!icon || !icon.composed) return;
      const kept = { ...icon, generated: true };
      delete kept.options;
      state.generated.push(kept);
      saveGenerated();
      els.setGenerated.hidden = false;
      $('gen-keep').disabled = true;
      $('gen-keep').textContent = 'Kept in Generated';
      renderLibrary();
    };
    trayShow({
      title: `${options.length} option${options.length === 1 ? '' : 's'} for “${prompt}”`,
      body: `<div class="gen-options">${chips(list)}</div>${plan.note ? `<p class="gen-note">${esc(plan.note)}</p>` : ''}`,
      actions: [{ label: 'Keep in Generated', primary: true, id: 'gen-keep', run: keep }],
    });
    const pick = (icon) => {
      const done = state.generated.some((g) => g.name === icon.name && g.body === icon.body);
      $('gen-keep').disabled = done; $('gen-keep').textContent = done ? 'Kept in Generated' : 'Keep in Generated';
      select(icon);
    };
    wire(list, pick);
    if (list.length) { $('gen-body').querySelector('[data-i="0"]').classList.add('sel'); pick(list[0]); }
  }
  $('gen-close').addEventListener('click', () => { tray().hidden = true; clearSketch(); });

  // ---- Draw to find or create (round 26, her idea) ------------------------------------------
  // In the Icon tab the canvas around the artboard is a dotted grid. Press and drag anywhere on it
  // (not on the artboard, a panel or a bar) to draw. A short pause after the last stroke and the
  // drawing is matched against the whole set (sketch.js): close matches open in the tray; if nothing
  // is close, the drawing itself can become an icon in our style. Esc or × clears it.
  const canvasEl = document.querySelector('.lab .canvas');
  const layer = $('sketch-layer');
  const sketch = { strokes: [], live: null, timer: 0 };
  const onGrid = (e) => state.pane === 'icon' && e.button === 0 && !e.target.closest('.stage, button, input, a, .gen-tray, .edit-hint');
  function drawSketch() {
    const all = sketch.live ? [...sketch.strokes, sketch.live] : sketch.strokes;
    layer.innerHTML = all.map((st) => `<polyline points="${st.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}"/>`).join('');
  }
  function clearSketch() { sketch.strokes = []; sketch.live = null; clearTimeout(sketch.timer); if (layer) layer.innerHTML = ''; }
  canvasEl.addEventListener('pointerdown', (e) => {
    if (!onGrid(e)) return;
    e.preventDefault(); canvasEl.setPointerCapture(e.pointerId); clearTimeout(sketch.timer);
    const r = canvasEl.getBoundingClientRect(); sketch.live = [[e.clientX - r.left, e.clientY - r.top]]; drawSketch();
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (!sketch.live) return;
    const r = canvasEl.getBoundingClientRect(); const p = [e.clientX - r.left, e.clientY - r.top]; const l = sketch.live[sketch.live.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 2) { sketch.live.push(p); drawSketch(); }
  });
  const endStroke = () => {
    if (!sketch.live) return;
    sketch.strokes.push(sketch.live); sketch.live = null; drawSketch();
    clearTimeout(sketch.timer); sketch.timer = setTimeout(recogniseSketch, 750);
  };
  canvasEl.addEventListener('pointerup', endStroke);
  canvasEl.addEventListener('pointercancel', endStroke);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sketch.strokes.length) { clearSketch(); tray().hidden = true; } });

  function recogniseSketch() {
    if (!sketch.strokes.length) return;
    const pool = ofStyle('line').filter((i) => !i.googleOnly);
    const ranked = IconSketch.recognise(sketch.strokes, pool);
    const best = ranked[0] ? ranked[0].score : 0;
    const close = ranked.filter((r) => r.score >= Math.max(0.62, best - 0.06)).slice(0, 6).map((r) => r.icon);
    const near = ranked.slice(0, 4).map((r) => r.icon);
    const drawn = IconSketch.iconFrom(sketch.strokes, `drawn-${Date.now().toString(36)}`);
    const make = () => {
      trayShow({
        title: 'Your drawing, in our style', body: `<div class="gen-options">${chips([Object.assign(drawn, { label: 'From your drawing' })])}</div>`,
        actions: [{ label: 'Keep in Generated', primary: true, id: 'gen-keep', run: () => {
          const kept = { ...drawn, generated: true }; delete kept.options; state.generated.push(kept); saveGenerated(); els.setGenerated.hidden = false;
          $('gen-keep').disabled = true; $('gen-keep').textContent = 'Kept in Generated'; renderLibrary(); } },
        { label: 'Clear the drawing', run: () => { clearSketch(); tray().hidden = true; } }],
      });
      wire([drawn], (ic) => select(ic)); select(drawn);
    };
    if (close.length && best >= 0.62) {
      trayShow({
        title: close.length > 1 ? 'Looks like one of these' : `Looks like ${pretty(close[0].name)}`,
        body: `<div class="gen-options">${chips(close)}</div>`,
        actions: [{ label: 'None of these: create it from my drawing', run: make }, { label: 'Clear the drawing', run: () => { clearSketch(); tray().hidden = true; } }],
      });
      wire(close, showIcon); $('gen-body').querySelector('[data-i="0"]').classList.add('sel'); showIcon(close[0]);
    } else {
      trayShow({
        title: 'That isn’t in the set yet. Create it from your drawing?',
        body: `<p class="gen-sub">Closest in the set</p><div class="gen-options small">${chips(near)}</div>`,
        actions: [{ label: 'Yes, create it', primary: true, run: make }, { label: 'Clear the drawing', run: () => { clearSketch(); tray().hidden = true; } }],
      });
      wire(near, showIcon);
    }
  }
  window.__iconLabSketch = { sketch, recogniseSketch, clearSketch }; // for tests

  function removeCurrent() {
    const icon = state.current;
    if (!icon || !icon.generated) return;
    const list = generatedOfStyle(icon.style);
    const next = list[list.indexOf(icon) + 1] || list[list.indexOf(icon) - 1];
    state.generated = state.generated.filter((i) => i !== icon);
    saveGenerated();
    select(next);
    setStatus(`Removed ${icon.name}`);
  }

  // ---- Claude key ----------------------------------------------------------------

  function renderConnection() {
    const on = Boolean(apiKey());
    els.connectBtn.classList.toggle('on', on);
    els.connectLabel.textContent = on ? 'Claude connected' : 'Connect Claude';
    els.keyRemove.hidden = !on;
  }

  function openKeyDialog() {
    els.keyInput.value = '';
    els.keyInput.placeholder = apiKey() ? 'Key saved. Paste a new one to replace it.' : 'sk-ant-…';
    els.keyDialog.showModal();
    els.keyInput.focus();
  }

  els.keyDialog.addEventListener('close', () => {
    const action = els.keyDialog.returnValue;
    if (action === 'save' && els.keyInput.value.trim()) {
      localStorage.setItem(STORE.key, els.keyInput.value.trim());
      setStatus('Claude connected. Prompts now draw new icons.');
    } else if (action === 'remove') {
      localStorage.removeItem(STORE.key);
      setStatus('Claude disconnected. Prompts search the library.');
    }
    els.keyInput.value = '';
    renderConnection();
  });

  // ---- Export --------------------------------------------------------------------

  function download(name, href) {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function fileName() {
    return state.round ? `${state.current.name}-round` : state.current.name;
  }

  function downloadSvg() {
    if (!state.current) return;
    download(`${fileName()}.svg`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentSvg())}`);
  }

  function downloadPng(size) {
    if (!state.current) return;
    // Render at the export size so strokes stay sharp, not upscaled from 24px.
    const sized = currentSvg().replace(
      `width="${IconEngine.GRID}" height="${IconEngine.GRID}"`,
      `width="${size}" height="${size}"`
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(img, 0, 0, size, size);
      download(`${fileName()}-${size}.png`, canvas.toDataURL('image/png'));
    };
    img.onerror = () => setStatus('Could not render the PNG. Try again.', true);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(els.code.textContent);
      setStatus('SVG code copied');
    } catch (e) {
      setStatus('Copy failed. Open the code and copy it by hand.', true);
    }
  }

  // ---- Wiring ----------------------------------------------------------------------

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    onPrompt(els.prompt.value);
  });
  els.color.addEventListener('input', refresh);
  for (const b of els.stroke.querySelectorAll('[data-stroke]')) {
    b.addEventListener('click', () => { state.stroke = Number(b.dataset.stroke); refresh(); });
  }
  els.styleLine.addEventListener('click', () => setStyle('line'));
  els.styleSolid.addEventListener('click', () => setStyle('solid'));
  els.setWeb.addEventListener('click', () => setMode('web'));
  els.setPlatform.addEventListener('click', () => setMode('platform'));
  els.setPixel.addEventListener('click', () => setMode('pixel'));
  for (const b of els.sigToggle.querySelectorAll('[data-sig]')) b.addEventListener('click', () => setSignature(b.dataset.sig));
  els.setGenerated.addEventListener('click', () => setMode('generated'));
  els.setGenerated.hidden = !state.generated.length; // shown once something is kept
  els.round0.addEventListener('click', () => setRound(0));
  els.round5.addEventListener('click', () => setRound(0.5));
  els.removeBtn.addEventListener('click', removeCurrent);
  els.connectBtn.addEventListener('click', openKeyDialog);
  els.editBtn.addEventListener('click', () => (state.edit ? stopEditing() : startEditing()));
  els.resetBtn.addEventListener('click', resetIcon);
  $('google-toggle').addEventListener('click', () => {
    state.showGoogle = !state.showGoogle;
    $('google-toggle').classList.toggle('on', state.showGoogle);
    renderPreview();
  });
  els.gridToggle.addEventListener('click', () => {
    const on = !els.stage.classList.contains('show-grid');
    els.stage.classList.toggle('show-grid', on);
    els.gridToggle.classList.toggle('on', on);
  });
  els.codeToggle.addEventListener('click', () => {
    els.code.hidden = !els.code.hidden;
    // Round 23: a disclosure like Figma's: the chevron turns down when the code is open.
    els.codeToggle.setAttribute('aria-expanded', String(!els.code.hidden));
  });
  els.dlSvg.addEventListener('click', downloadSvg);
  // Download PNG: the button opens the size menu; picking a size downloads it.
  const setPngMenu = (open) => {
    els.pngMenu.hidden = !open;
    els.dlPng.setAttribute('aria-expanded', String(open));
  };
  els.dlPng.addEventListener('click', (e) => { e.stopPropagation(); setPngMenu(els.pngMenu.hidden); });
  for (const b of els.pngMenu.querySelectorAll('[data-png]')) {
    b.addEventListener('click', () => { setPngMenu(false); downloadPng(Number(b.dataset.png)); });
  }
  document.addEventListener('click', (e) => { if (!e.target.closest || !e.target.closest('#png-drop')) setPngMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPngMenu(false); });
  els.copy.addEventListener('click', copyCode);


  // ---- In context ------------------------------------------------------------------
  // See the current icon at real pixel size: in UI mockups (light or dark), on a
  // page loaded from a URL, or on a screenshot, with a draggable copy of the icon.

  const cx = {
    open: $('context-btn'),
    dialog: $('context-dialog'),
    name: $('context-name'),
    close: $('context-close'),
    mockup: $('mockup'),
    themeToggle: $('theme-toggle'),
    urlForm: $('url-form'),
    urlInput: $('url-input'),
    urlFrame: $('url-frame'),
    urlStage: $('url-stage'),
    shotInput: $('shot-input'),
    shotImg: $('shot-img'),
    shotStage: $('shot-stage'),
    dropHint: $('drop-hint'),
    place: $('place-controls'),
    placeSize: $('place-size'),
    placeColor: $('place-color'),
  };
  const ctx = { tab: 'site', theme: 'light', scale: 2 };
  const contextData = typeof CONTEXT_DATA !== 'undefined' ? CONTEXT_DATA : {};

  // Any CSS colour (the site uses lab() and rgb()) as #rrggbb, for the SVG fill.
  function toHex(css) {
    try {
      const c = document.createElement('canvas'); c.width = 1; c.height = 1;
      const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillStyle = css; g.fillRect(0, 0, 1, 1);
      const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
      return `#${[r, gr, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    } catch (e) { return '#111111'; }
  }

  // On clueso.io: the real spot (before) and the same spot with the new icon over the old
  // one (after), plus a close-up of both. The new icon uses the current stroke, corners,
  // style and option, at the old icon's size and colour.
  // ---- Context pane (Preview → Context) ---------------------------------------------
  // On clueso.io: the captured spot, before (today) and after (ours laid over it), plus a
  // close-up. In the product: the same small app UI drawn with the current library icon
  // (Now) and with ours (New), at real sizes, light and dark.
  const originals = typeof ORIGINAL_ICONS !== 'undefined' ? ORIGINAL_ICONS : {};
  const sizedOriginal = (name, size) => originals[name].svg.replace('<svg', `<svg width="${size}" height="${size}"`);

  // Context uses the colour picked in the panel; with the default off-white it keeps each spot's own colour.
  const pickedColour = () => (['#f5f3e7', '#111111'].includes(els.color.value.toLowerCase()) ? null : els.color.value); // the two theme defaults count as unpicked

  // Round 23: before / after on one surface. Now fills the frame; New sits on top, shown to the right
  // of a handle you drag (or click anywhere, or use the arrow keys). Every slider in the pane moves
  // together and keeps its place as you change icons.
  function compare(nowHtml, newHtml) {
    return `<div class="cmp" style="--x:${state.ctxX}%"><div class="cmp-now">${nowHtml}</div><div class="cmp-new" aria-hidden="true">${newHtml}</div>
      <div class="cmp-handle" role="slider" tabindex="0" aria-label="Compare now and new" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(state.ctxX)}"><span></span></div>
      <span class="cmp-tag cmp-tag-now">Now</span><span class="cmp-tag cmp-tag-new">New</span></div>`;
  }
  function wireCompare(root) {
    const set = (x) => {
      state.ctxX = Math.max(0, Math.min(100, x));
      for (const c of root.querySelectorAll('.cmp')) {
        c.style.setProperty('--x', `${state.ctxX}%`);
        c.querySelector('.cmp-handle').setAttribute('aria-valuenow', String(Math.round(state.ctxX)));
      }
    };
    for (const c of root.querySelectorAll('.cmp')) {
      const at = (e) => { const r = c.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
      // preventDefault: otherwise the browser starts dragging the screenshot image and cancels the pointer.
      c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.setPointerCapture(e.pointerId); c.classList.add('dragging'); at(e); c.querySelector('.cmp-handle').focus({ preventScroll: true }); });
      c.addEventListener('pointermove', (e) => { if (c.classList.contains('dragging')) at(e); });
      c.addEventListener('pointerup', () => c.classList.remove('dragging'));
      c.addEventListener('pointercancel', () => c.classList.remove('dragging'));
      c.querySelector('.cmp-handle').addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); set(state.ctxX + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 2)); }
      });
    }
  }

  function siteSection(icon) {
    const d = contextData[icon.name];
    if (!d) return '';
    const color = pickedColour() || toHex(d.color); const bg = toHex(d.bg);
    const pct = (v, of) => `${(v / of) * 100}%`;
    const newIcon = sizedSvg(icon, Math.round(d.box.w), color);
    const patch = (l, t, w, h) => `<div class="patch" style="left:${l};top:${t};width:${w};height:${h};background:${bg};box-shadow:0 0 0 2px ${bg}">${newIcon}</div>`;
    // Every instance in the shot (round 21: a row of rating stars is replaced whole).
    const boxes = [d.box, ...(d.more || [])];
    const full = (after) => {
      const patches = boxes.map((b) => patch(pct(b.x, d.size.w), pct(b.y, d.size.h), pct(b.w, d.size.w), pct(b.h, d.size.h))).join('');
      return `<div class="shot"><img src="${ASSET}${d.image}" alt="">${after ? patches : ''}</div>`;
    };
    const R = Math.max(d.box.w * 8, 120);
    const zx = d.box.x + d.box.w / 2 - R / 2; const zy = d.box.y + d.box.h / 2 - R / 4;
    const zoom = (after) => {
      const patches = boxes.map((b) => patch(pct(b.x - zx, R), pct(b.y - zy, R / 2), pct(b.w, R), pct(b.h, R / 2))).join('');
      return `<div class="shot"><img src="${ASSET}${d.image}" alt="" style="width:${pct(d.size.w, R)};left:${pct(-zx, R)};top:${pct(-zy, R / 2)}">${after ? patches : ''}</div>`;
    };
    // Round 23: one shot at a time (the Now / New switch at the top). The shot is already centred on
    // the icon, so the separate close-ups are gone (they made the pane busy).
    void zoom;
    // Round 24: no heading text; the page shows on hover, as a link.
    return `<section class="ctx-sec"><div class="ctx-shot">${compare(full(false), full(true))}</div>
      <a class="ctx-label" href="${SITE}${d.url}" target="_blank" rel="noopener">On clueso.io${esc(d.url)}</a></section>`;
  }

  function productMock(draw, dark) {
    const nm = esc(pretty(state.current.name));
    return `<div class="mock${dark ? ' dark' : ''}">
      <div class="tb"><span class="ib">${draw(20)}</span><span class="lb">${draw(16)}${nm}</span></div>
      <div class="mi">${draw(16)}<span>${nm}</span></div>
      <div class="ramp">${[16, 20, 24, 32].map((sz) => draw(sz)).join('')}</div></div>`;
  }

  function productSection(icon) {
    if (!originals[icon.name] && !icon.platform) return '';
    const ink = (dark) => (dark ? '#ececec' : '#1a1a1a');
    const ours = (dark) => (sz) => sizedSvg(icon, sz, pickedColour() || ink(dark));
    const now = (dark) => (sz) => (originals[icon.name] ? `<span style="color:${ink(dark)}">${sizedOriginal(icon.name, sz)}</span>` : '');
    const where = icon.platform ? 'In the Clueso platform (web.clueso.io)' : 'In product UI';
    const from = originals[icon.name] ? ` · now: ${esc(originals[icon.name].from)} (Clueso icon library)` : '';
    // Round 23: light and dark (the new website has both), each a before / after slider.
    const one = (dark) => (originals[icon.name] ? compare(productMock(now(dark), dark), productMock(ours(dark), dark)) : productMock(ours(dark), dark));
    // Round 24: no heading text; Light / Dark are tags on the views, the rest shows on hover.
    const label = `${where}${from ? ` · now: ${from.replace(/^ · now: /, '')}` : ''}`;
    return `<section class="ctx-sec"><div class="ctx-themes"><div class="ctx-themed">${one(false)}<span class="ctx-tag">Light</span></div><div class="ctx-themed">${one(true)}<span class="ctx-tag dark">Dark</span></div></div>
      <span class="ctx-label">${esc(label)}</span></section>`;
  }

  // Pixel icons are a website-only direction, so their Context shows web uses at web sizes:
  // feature cards (40 px in a tile), list rows (20 px), a full rating row for the star, and a size
  // ramp. No platform mock and no single-spot swap at 12–16 px (round 20).
  function pixelWebSection(icon) {
    const others = pixelIcons.filter((i) => i !== icon && !i.illustration).slice(0, 2);
    const titles = { [icon.name]: pretty(icon.name) };
    const blurbs = ['Scale up custom videos with the same effort.', 'Your AI agent knows your brand guidelines.', 'Build once, publish everywhere.'];
    const block = (dark) => {
      const ink = pickedColour() || (dark ? '#F4F2EE' : '#141414'); const tile = dark ? '#2a1428' : '#FCE7F9'; const accent = pickedColour() || (dark ? '#FE89EB' : '#C12EAF');
      const card = (ic, i) => `<div class="pw-card"><span class="pw-tile" style="background:${tile}">${sizedSvg(ic, 40, accent)}</span>
        <b>${esc(titles[ic.name] || pretty(ic.name))}</b><span>${blurbs[i]}</span></div>`;
      const rows = ['Priority support', 'Unlimited exports', 'Custom branding'].map((t) => `<div class="pw-row">${sizedSvg(icon, 20, accent)}<span>${t}</span></div>`).join('');
      const rating = icon.name === 'star' ? `<div class="pw-rating"><b>4.8</b>${Array.from({ length: 5 }, () => sizedSvg(icon, 20, '#F59E0B')).join('')}<span>out of 5 on G2</span></div>` : '';
      const ramp = [16, 20, 24, 32, 48].map((s) => `<figure>${sizedSvg(icon, s, ink)}<figcaption>${s}</figcaption></figure>`).join('');
      return `<div class="pw${dark ? ' dark' : ''}"><div class="pw-cards">${[icon, ...others].map(card).join('')}</div>${rating}<div class="pw-rows">${rows}</div><div class="pw-ramp">${ramp}</div></div>`;
    };
    return `<section class="ctx-sec">${block(false)}<div style="margin-top:10px">${block(true)}</div><span class="ctx-label">On the website, at web sizes, light and dark (pixel is website only)</span></section>`;
  }

  // Pixel illustration colours per card theme: ink, Clueso pink and magenta.
  const ILL_THEMES = {
    light: { color: '#141414', accent: '#C12EAF', accent2: '#FE89EB' },
    dark: { color: '#F4F2EE', accent: '#FE89EB', accent2: '#C12EAF' },
  };
  function illustrationCard(icon, theme) {
    const t = ILL_THEMES[theme];
    return `${sizedSvg(icon, 120, t.color, { accent: t.accent, accent2: t.accent2 })}<h3>${esc(icon.title)}</h3><p>${esc(icon.text)}</p>`;
  }

  // Pixel illustrations: the feature card on clueso.io/features/ai-avatars, light and dark.
  function illustrationSection(icon) {
    const card = (dark) => `<div class="ill-card ctx${dark ? ' dark' : ''}">${illustrationCard(icon, dark ? 'dark' : 'light')}</div>`;
    return `<section><h3>On clueso.io</h3><p class="where"><a href="${SITE}/features/ai-avatars" target="_blank" rel="noopener">clueso.io/features/ai-avatars</a> · feature cards</p>
      ${card(false)}<div style="margin-top:10px">${card(true)}</div></section>`;
  }

  function renderContextPane() {
    const icon = state.current;
    if (!icon) return;
    const html = icon.illustration ? illustrationSection(icon) : icon.pixel ? siteSection(icon) + pixelWebSection(icon) : siteSection(icon) + productSection(icon);
    // Round 23: before / after sliders instead of Now and New side by side.
    $('pane-context').innerHTML = html ? `<div class="ctx-stack">${html}</div>` : '<p class="empty-ctx">No context for this icon yet.</p>';
    wireCompare($('pane-context'));
  }

  function setPane(pane) {
    state.pane = pane;
    document.querySelector('.lab .canvas').classList.toggle('drawable', pane === 'icon'); // round 26: the dotted grid
    $('pane-icon').hidden = pane !== 'icon';
    $('pane-context').hidden = pane !== 'context';
    $('icon-actions').hidden = pane !== 'icon';
    $('pane-icon-btn').classList.toggle('on', pane === 'icon');
    $('pane-context-btn').classList.toggle('on', pane === 'context');
    if (pane === 'context') { stopEditing(); renderContextPane(); }
  }
  $('pane-icon-btn').addEventListener('click', () => setPane('icon'));
  $('pane-context-btn').addEventListener('click', () => setPane('context'));

  // Colour swatches; the last one opens a custom colour picker.
  for (const b of document.querySelectorAll('#swatches [data-color]')) {
    b.addEventListener('click', () => { els.color.value = b.dataset.color; markSwatch(); refresh(); });
  }
  function markSwatch() {
    for (const b of document.querySelectorAll('#swatches .sw')) b.classList.toggle('on', b.dataset.color ? b.dataset.color === els.color.value.toLowerCase() : !document.querySelector(`#swatches [data-color="${els.color.value.toLowerCase()}"]`));
  }
  els.color.addEventListener('input', markSwatch);

  function renderSite() {
    const icon = state.current;
    const d = contextData[icon.name];
    const box = $('site-ctx');
    if (!d) {
      box.innerHTML = `<p class="empty-ctx">${icon.site && icon.pages ? 'No capture of this icon on clueso.io yet. Run tools/capture-context.js to add it.' : 'This icon isn\'t used on clueso.io yet. Use Sizes, URL or Screenshot to try it out.'}</p>`;
      return;
    }
    const color = toHex(d.color); const bg = toHex(d.bg);
    const pct = (v, of) => `${(v / of) * 100}%`;
    const newIcon = sizedSvg(icon, Math.round(d.box.w), color);
    const patch = (l, t, w, h) => `<div class="patch" style="left:${l};top:${t};width:${w};height:${h};background:${bg};box-shadow:0 0 0 2px ${bg}">${newIcon}</div>`;
    const mark = (l, t, w, h) => `<div class="mark" style="left:${l};top:${t};width:${w};height:${h}"></div>`;
    const full = (after) => {
      const [l, t, w, h] = [pct(d.box.x, d.size.w), pct(d.box.y, d.size.h), pct(d.box.w, d.size.w), pct(d.box.h, d.size.h)];
      return `<div class="shot"><img src="${ASSET}${d.image}" alt="">${after ? patch(l, t, w, h) : ''}${mark(l, t, w, h)}</div>`;
    };
    // Close-up: a region 8 icons wide around the icon, in a 2 : 1 frame.
    const R = Math.max(d.box.w * 8, 120);
    const cxp = d.box.x + d.box.w / 2; const cyp = d.box.y + d.box.h / 2;
    const zx = cxp - R / 2; const zy = cyp - R / 4;
    const zoom = (after) => {
      const [l, t, w, h] = [pct(d.box.x - zx, R), pct(d.box.y - zy, R / 2), pct(d.box.w, R), pct(d.box.h, R / 2)];
      return `<div class="shot"><img src="${ASSET}${d.image}" alt="" style="width:${pct(d.size.w, R)};left:${pct(-zx, R)};top:${pct(-zy, R / 2)}">${after ? patch(l, t, w, h) : ''}</div>`;
    };
    const pages = icon.pages ? `${icon.pages.toLocaleString('en-GB')} page${icon.pages === 1 ? '' : 's'} use it` : '';
    box.innerHTML = `
      <p class="where"><span>On <a href="${SITE}${d.url}" target="_blank" rel="noopener">clueso.io${esc(d.url)}</a></span><span class="dim">${esc(pages)} · replaces ${esc(icon.replaces || '')}</span></p>
      <div class="pair">
        <figure><figcaption>Before · on the site today</figcaption>${full(false)}</figure>
        <figure><figcaption>After · ${esc(pretty(icon.name))}, ${icon.style === 'line' ? `stroke ${state.stroke}` : 'solid'}, ${state.round ? 'rounded' : 'sharp'}</figcaption>${full(true)}</figure>
      </div>
      <div class="zoom">
        <figure><figcaption>Before · close-up</figcaption>${zoom(false)}</figure>
        <figure><figcaption>After · close-up</figcaption>${zoom(true)}</figure>
      </div>`;
  }

  // The current icon (with its stroke, corners and option) at an exact pixel size.
  function sizedSvg(icon, size, color, extra = {}) {
    return IconEngine.buildSvg(icon, { ...options(), color, ...extra })
      .replace(/^<svg([^>]*?) width="[\d.]+" height="[\d.]+"/, `<svg$1 width="${size}" height="${size}"`);
  }

  // A few icons from the same set and style to sit next to the current one.
  function neighbours(icon) {
    return ofStyle(icon.style).filter((i) => i !== icon).slice(0, 3);
  }

  function renderMockup() {
    const icon = state.current;
    const others = neighbours(icon);
    const ink = ctx.theme === 'dark' ? '#f5f3e7' : '#111111';
    const bg = ctx.theme === 'dark' ? '#0e0e0e' : '#ffffff';
    const I = (ic, size, color = ink) => sizedSvg(ic, size, color);
    const nm = pretty(icon.name);
    const other = others[0] || icon;
    cx.mockup.className = `mockup ${ctx.theme}`;
    cx.mockup.innerHTML = `
      <div><div class="m-label">Navigation · 20 px</div>
        <div class="m-nav"><strong>Clueso</strong><span>Product</span><span>Pricing</span>${I(other, 20)}${I(icon, 20)}</div></div>
      <div><div class="m-label">Buttons · 16 px with a label, 20 px icon-only</div>
        <div class="m-row">
          <button type="button" class="m-btn primary">${I(icon, 16, bg)}${nm}</button>
          <button type="button" class="m-btn">${I(icon, 16)}${nm}</button>
          <button type="button" class="m-btn icon" aria-label="${nm}">${I(icon, 20)}</button>
          ${others.map((o) => `<button type="button" class="m-btn icon" aria-label="${pretty(o.name)}">${I(o, 20)}</button>`).join('')}
        </div></div>
      <div><div class="m-label">List · 20 px, next to others in the set</div>
        <div class="m-list">${[icon, ...others].map((o) => `<div class="${o === icon ? 'cur' : ''}">${I(o, 20)}<span>${pretty(o.name)}</span></div>`).join('')}</div></div>
      <div><div class="m-label">Cards · 24 px</div>
        <div class="m-cards">${[icon, ...others.slice(0, 2)].map((o) => `<div class="m-card"><div class="tile">${I(o, 24)}</div><strong>${pretty(o.name)}</strong><p>A short line of supporting copy.</p></div>`).join('')}</div></div>
      <div class="m-inline"><div class="m-label">Inline with 14 px text · 16 px</div>
        <p>Select ${I(icon, 16)} ${nm} to start, then ${I(other, 16)} to continue.</p></div>
      <div><div class="m-label">Size ramp</div>
        <div class="m-ramp">${[16, 20, 24, 32, 48].map((sz) => `<figure>${I(icon, sz)}<figcaption>${sz}</figcaption></figure>`).join('')}</div></div>`;
  }

  // The draggable icon for URL and screenshot previews.
  const placed = document.createElement('div');
  placed.className = 'place-icon';
  placed.title = 'Drag to place';
  function renderPlaced() {
    placed.innerHTML = sizedSvg(state.current, Number(cx.placeSize.value), cx.placeColor.value);
  }

  function setTab(tab) {
    ctx.tab = tab;
    for (const b of cx.dialog.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    $('tab-site').hidden = tab !== 'site';
    $('tab-mockup').hidden = tab !== 'mockup';
    $('tab-url').hidden = tab !== 'url';
    $('tab-shot').hidden = tab !== 'shot';
    cx.place.hidden = tab === 'mockup' || tab === 'site';
    cx.themeToggle.hidden = tab === 'site';
    const stage = tab === 'url' ? cx.urlStage : tab === 'shot' ? cx.shotStage : null;
    if (stage && placed.parentElement !== stage) stage.appendChild(placed);
    if (tab === 'site') renderSite();
    else if (tab === 'mockup') renderMockup();
    else renderPlaced();
  }

  function openContext() {
    cx.name.textContent = `${pretty(state.current.name)}${hasOptions(state.current) ? ` · ${state.current.variant}` : ''}`;
    setTab(ctx.tab);
    if (cx.dialog.showModal) cx.dialog.showModal(); else cx.dialog.setAttribute('open', '');
  }

  // Drag the placed icon within its stage (iframes stop taking the pointer while dragging).
  let drag = null;
  placed.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = placed.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, stage: placed.parentElement };
    placed.classList.add('dragging');
    drag.stage.classList.add('dragging');
    if (placed.setPointerCapture && e.pointerId !== undefined) placed.setPointerCapture(e.pointerId);
  });
  placed.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = drag.stage.getBoundingClientRect();
    placed.style.left = `${Math.round(e.clientX - r.left - drag.dx + drag.stage.scrollLeft)}px`;
    placed.style.top = `${Math.round(e.clientY - r.top - drag.dy + drag.stage.scrollTop)}px`;
  });
  const endPlace = () => {
    if (!drag) return;
    placed.classList.remove('dragging');
    drag.stage.classList.remove('dragging');
    drag = null;
  };
  placed.addEventListener('pointerup', endPlace);
  placed.addEventListener('pointercancel', endPlace);

  function loadUrl(raw) {
    let url = raw.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { url = new URL(url).href; } catch (e) { setStatus('That URL is not valid.', true); return; }
    cx.urlFrame.src = url;
  }

  // Screenshots: Retina captures are twice the size on screen, so show them at half.
  function sizeShot() {
    const note = $('shot-size');
    if (!cx.shotImg.naturalWidth) {
      note.textContent = 'Choose a screenshot first.';
      return;
    }
    const shown = Math.round(cx.shotImg.naturalWidth / ctx.scale);
    cx.shotImg.style.width = `${shown}px`;
    cx.shotImg.style.height = 'auto';
    note.textContent = `· showing ${shown} px wide (file is ${cx.shotImg.naturalWidth} px)`;
  }
  function loadShot(file) {
    if (!file || !/^image\//.test(file.type)) return;
    if (cx.shotImg.src) URL.revokeObjectURL(cx.shotImg.src);
    cx.shotImg.onload = sizeShot;
    cx.shotImg.src = URL.createObjectURL(file);
    cx.dropHint.hidden = true;
  }

  if (cx.open) cx.open.addEventListener('click', openContext);
  cx.close.addEventListener('click', () => (cx.dialog.close ? cx.dialog.close() : cx.dialog.removeAttribute('open')));
  for (const b of cx.dialog.querySelectorAll('[data-tab]')) b.addEventListener('click', () => setTab(b.dataset.tab));
  // Light / Dark sets the mockup, the URL and screenshot stage backgrounds, and the
  // placed icon's colour, so it works on every tab.
  function setTheme(theme) {
    ctx.theme = theme;
    for (const t of cx.dialog.querySelectorAll('[data-theme]')) t.classList.toggle('on', t.dataset.theme === theme);
    cx.urlStage.classList.toggle('dark', theme === 'dark');
    cx.shotStage.classList.toggle('dark', theme === 'dark');
    cx.placeColor.value = theme === 'dark' ? '#f5f3e7' : '#111111';
    renderMockup();
    renderPlaced();
  }
  for (const b of cx.dialog.querySelectorAll('[data-theme]')) b.addEventListener('click', () => setTheme(b.dataset.theme));
  for (const b of cx.dialog.querySelectorAll('[data-scale]')) {
    b.addEventListener('click', () => {
      ctx.scale = Number(b.dataset.scale);
      for (const t of cx.dialog.querySelectorAll('[data-scale]')) t.classList.toggle('on', t === b);
      sizeShot();
    });
  }
  cx.urlForm.addEventListener('submit', (e) => { e.preventDefault(); loadUrl(cx.urlInput.value); });
  cx.shotInput.addEventListener('change', () => loadShot(cx.shotInput.files[0]));
  cx.shotStage.addEventListener('dragover', (e) => { e.preventDefault(); cx.shotStage.classList.add('dragover'); });
  cx.shotStage.addEventListener('dragleave', () => cx.shotStage.classList.remove('dragover'));
  cx.shotStage.addEventListener('drop', (e) => {
    e.preventDefault();
    cx.shotStage.classList.remove('dragover');
    loadShot(e.dataTransfer && e.dataTransfer.files[0]);
  });
  cx.placeSize.addEventListener('change', renderPlaced);
  cx.placeColor.addEventListener('input', renderPlaced);

  renderConnection();
  select(firstLibraryIcon('line'));
})();
