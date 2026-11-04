import { hexToRgb, luma, resolveColor, toPalette } from "../brand/palette";
import { aabb, layerFrame } from "../layers/bounds";
import { getDef, isFramed, radiusKey } from "../layers/registry";
import { allParams, type LayerDef, type Params } from "../layers/types";
import type { Doc } from "../state/doc";
import { BLIT_FRAG, COMPOSITE_FRAG, MARK_BAKE_FRAG, MARK_BAKE_SIZE, PRELUDE, VERT } from "./glsl";

interface Program {
	prog: WebGLProgram;
	locs: Map<string, WebGLUniformLocation | null>;
}

interface Target {
	fb: WebGLFramebuffer;
	tex: WebGLTexture;
}

interface LayerTexture {
	key: string;
	tex: WebGLTexture;
	size: [number, number];
}

/**
 * Layer compositor. Each layer renders into a scratch target reading the composite below it
 * (`u_input`), then is blended onto the accumulation buffer (premultiplied) with its blend
 * mode and opacity. Effects are just layers that sample `u_input`.
 */
export class Renderer {
	readonly gl: WebGL2RenderingContext;
	/** Shader compile errors by layer type, for the UI. */
	readonly errors = new Map<string, string>();
	onInvalidate: () => void = () => {};

	private programs = new Map<string, Program | null>();
	private targets: Target[] = [];
	private size: [number, number] = [0, 0];
	private internalFormat: number;
	private texType: number;
	private emptyTex: WebGLTexture;
	/** Baked mark distances per variant, or null when float render targets aren't available. */
	private markTex: { light: WebGLTexture; dark: WebGLTexture } | null = null;
	private layerTex = new Map<string, LayerTexture>();

	constructor(
		readonly canvas: HTMLCanvasElement,
		opts: { preserveDrawingBuffer?: boolean } = {},
	) {
		const gl = canvas.getContext("webgl2", {
			alpha: true,
			premultipliedAlpha: true,
			antialias: false,
			preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
		});
		if (!gl) throw new Error("WebGL2 is not available in this browser.");
		this.gl = gl;

		const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
		this.internalFormat = floatTargets ? gl.RGBA16F : gl.RGBA8;
		this.texType = floatTargets ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		this.emptyTex = this.createTexture();
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
		if (floatTargets) this.markTex = { light: this.bakeMark(0), dark: this.bakeMark(1) };
	}

	/** One pass of the exact mark SDF into a texture; repeated marks then cost a single lookup. */
	private bakeMark(dark: number): WebGLTexture {
		const { gl } = this;
		const size = MARK_BAKE_SIZE;
		const tex = this.createTexture();
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, size, size, 0, gl.RGBA, gl.HALF_FLOAT, null);
		const fb = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		const prog = this.program("__markBake", MARK_BAKE_FRAG);
		if (prog) {
			gl.viewport(0, 0, size, size);
			gl.useProgram(prog.prog);
			gl.uniform1f(this.loc(prog, "u_markDark"), dark);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(fb);
		return tex;
	}

	render(doc: Doc, time: number, width: number, height: number) {
		const { gl } = this;
		width = Math.max(1, Math.round(width));
		height = Math.max(1, Math.round(height));
		if (this.canvas.width !== width) this.canvas.width = width;
		if (this.canvas.height !== height) this.canvas.height = height;
		this.ensureTargets(width, height);

		const { scene } = doc;
		// toPalette: docs saved before palettes were lists still render.
		const palette = toPalette(scene.palette);
		const comp: [number, number] = [scene.width, scene.height];
		const phase = scene.duration > 0 ? (((time % scene.duration) + scene.duration) % scene.duration) / scene.duration : 0;

		// Auto logo variant: dark-mode construction on dark backgrounds, light-mode otherwise.
		const darkBg = !scene.transparent && luma(resolveColor(scene.background, palette)) < 0.5;

		let [acc, next] = [this.targets[0], this.targets[1]];
		const scratch = this.targets[2];

		gl.viewport(0, 0, width, height);
		gl.disable(gl.BLEND);
		gl.bindFramebuffer(gl.FRAMEBUFFER, acc.fb);
		if (scene.transparent) gl.clearColor(0, 0, 0, 0);
		else {
			const [r, g, b] = hexToRgb(resolveColor(scene.background, palette));
			gl.clearColor(r, g, b, 1);
		}
		gl.clear(gl.COLOR_BUFFER_BIT);

		const live = new Set<string>();
		const env = { width, height, comp, time, phase, darkBg };
		for (let i = doc.layers.length - 1; i >= 0; i--) {
			const layer = doc.layers[i];
			const def = getDef(layer.type);
			if (!def || !layer.visible || layer.opacity <= 0) continue;
			const layerPalette = layer.palette ? toPalette(layer.palette) : palette;
			const box = frameBox(layer, comp);

			// The layer itself, reading the composite below it. A framed Look runs across the whole canvas
			// and is clipped to its box when composited; a framed background draws as if the box were the canvas.
			gl.bindFramebuffer(gl.FRAMEBUFFER, scratch.fb);
			if (!this.pass(def, layer.id, layer.params, layer.seed, layerPalette, acc.tex, def.kind === "effect" ? null : box, env)) continue;
			live.add(layer.id);

			// Effects on this layer alone: draw it by itself (premultiplied, clipped to its frame), run each
			// effect reading only that, then blend the result in. Effects never see the layers below.
			const effects = (layer.effects ?? []).filter((e) => e.visible && getDef(e.type));
			let src = scratch.tex;
			let premult = false;
			if (effects.length) {
				let [own, spare] = [this.targets[3], this.targets[4]];
				this.composite(own.fb, this.emptyTex, scratch.tex, { blend: 0, opacity: 1, box, width, comp });
				// Listed top first, like layers: the bottom effect runs first.
				[...effects].reverse().forEach((e, k) => {
					gl.bindFramebuffer(gl.FRAMEBUFFER, scratch.fb);
					live.add(e.id);
					if (!this.pass(getDef(e.type)!, e.id, e.params, layer.seed + k + 1, layerPalette, own.tex, null, env)) return;
					this.composite(spare.fb, own.tex, scratch.tex, { blend: 0, opacity: 1, box: null, width, comp, keepToBase: !getDef(e.type)!.spills });
					[own, spare] = [spare, own];
				});
				src = own.tex;
				premult = true;
			}

			const comp2 = this.composite(next.fb, acc.tex, src, { blend: layer.blend, opacity: layer.opacity, box: premult ? null : box, width, comp, premult }, (prog) =>
				this.applyAppearance(prog, layer, doc, layerPalette, comp, [width, height], src),
			);
			if (!comp2) continue;
			if (layer.appearance?.shadow?.blur) {
				this.bindTex(1, src);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}
			[acc, next] = [next, acc];
		}

		const blit = this.program("__blit", BLIT_FRAG);
		if (!blit) return;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(blit.prog);
		this.bindTex(0, acc.tex);
		gl.uniform1i(this.loc(blit, "u_src"), 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		for (const [id, lt] of this.layerTex) {
			if (!live.has(id)) {
				gl.deleteTexture(lt.tex);
				this.layerTex.delete(id);
			}
		}
	}

	/** Gradient fill and drop shadow uniforms for one layer's composite pass (see COMPOSITE_FRAG). */
	private applyAppearance(prog: Program, layer: Doc["layers"][number], doc: Doc, palette: ReturnType<typeof toPalette>, comp: [number, number], res: [number, number], src: WebGLTexture) {
		const { gl } = this;
		const u = (n: string) => this.loc(prog, n);
		const look = layer.appearance;
		gl.uniform2f(u("u_aspect"), comp[0] / Math.max(comp[0], comp[1]), comp[1] / Math.max(comp[0], comp[1]));
		const g = look?.gradient;
		gl.uniform1i(u("u_grad"), g ? (g.type === "radial" ? 2 : 1) : 0);
		if (g) {
			gl.uniform3fv(u("u_gradA"), hexToRgb(resolveColor(g.a, palette)));
			gl.uniform3fv(u("u_gradB"), hexToRgb(resolveColor(g.b, palette)));
			// Across the layer's frame (text box, shape, mark) or the whole canvas for full-bleed layers.
			const f = layerFrame(layer, doc);
			const r = f ? aabb(f) : { l: 0, t: 0, r: comp[0], b: comp[1] };
			gl.uniform4f(u("u_gradRect"), r.l / comp[0], 1 - r.b / comp[1], r.r / comp[0], 1 - r.t / comp[1]);
			const a = (g.angle * Math.PI) / 180;
			gl.uniform2f(u("u_gradDir"), Math.cos(a), Math.sin(a));
		}
		const sh = look?.shadow;
		gl.uniform1i(u("u_shadow"), sh ? 1 : 0);
		if (sh) {
			gl.uniform2f(u("u_shadowOff"), sh.x / comp[0], -sh.y / comp[1]);
			const blurUv = sh.blur / comp[0];
			gl.uniform1f(u("u_shadowBlur"), blurUv);
			// Mip level matched to the tap spacing, so a wide blur stays smooth with 32 taps.
			const spacingPx = (sh.blur * (res[0] / comp[0])) / 4;
			gl.uniform1f(u("u_shadowLod"), Math.max(0, Math.log2(Math.max(spacingPx, 1)) - 0.3));
			gl.uniform3fv(u("u_shadowColor"), hexToRgb(resolveColor(sh.color, palette)));
			gl.uniform1f(u("u_shadowOpacity"), sh.opacity);
			if (sh.blur > 0) {
				this.bindTex(1, src);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			}
		}
	}

	/** Frees GPU resources. Only lose the context for throwaway canvases: a canvas returns the same context forever. */
	dispose({ loseContext = false } = {}) {
		const { gl } = this;
		for (const p of this.programs.values()) if (p) gl.deleteProgram(p.prog);
		for (const t of this.targets) {
			gl.deleteFramebuffer(t.fb);
			gl.deleteTexture(t.tex);
		}
		for (const lt of this.layerTex.values()) gl.deleteTexture(lt.tex);
		gl.deleteTexture(this.emptyTex);
		if (this.markTex) {
			gl.deleteTexture(this.markTex.light);
			gl.deleteTexture(this.markTex.dark);
		}
		this.programs.clear();
		this.targets = [];
		this.layerTex.clear();
		if (loseContext) gl.getExtension("WEBGL_lose_context")?.loseContext();
	}

	private layerProgram(def: LayerDef, defines: string[]): Program | null {
		const key = defines.length ? `${def.type}#${defines.join(",")}` : def.type;
		// Cache hit first: building the source string every frame for every layer was pure waste.
		if (this.programs.has(key)) return this.programs.get(key)!;
		const decls = allParams(def)
			.map((p) => {
				if (p.type === "float") return `uniform float u_${p.key};`;
				if (p.type === "int" || p.type === "select" || p.type === "bool") return `uniform int u_${p.key};`;
				if (p.type === "color") return `uniform vec3 u_${p.key};`;
				return "";
			})
			.join("\n");
		const flags = defines.map((d) => `#define ${d}`).join("\n");
		return this.program(key, `${PRELUDE}\n${flags}\n${decls}\n${def.frag}\nvoid main() { outColor = run(); }`);
	}

	private program(key: string, frag: string): Program | null {
		if (this.programs.has(key)) return this.programs.get(key)!;
		const { gl } = this;
		const vs = this.shader(gl.VERTEX_SHADER, VERT, key);
		const fs = this.shader(gl.FRAGMENT_SHADER, frag, key);
		let result: Program | null = null;
		if (vs && fs) {
			const prog = gl.createProgram()!;
			gl.attachShader(prog, vs);
			gl.attachShader(prog, fs);
			gl.bindAttribLocation(prog, 0, "a_pos");
			gl.linkProgram(prog);
			if (gl.getProgramParameter(prog, gl.LINK_STATUS)) result = { prog, locs: new Map() };
			else this.fail(key, gl.getProgramInfoLog(prog) ?? "link failed");
		}
		this.programs.set(key, result);
		return result;
	}

	private shader(type: number, src: string, key: string) {
		const { gl } = this;
		const sh = gl.createShader(type)!;
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
		this.fail(key, gl.getShaderInfoLog(sh) ?? "compile failed");
		return null;
	}

	private fail(key: string, log: string) {
		this.errors.set(key, log);
		console.error(`[brand-lab] shader "${key}" failed:\n${log}`);
	}

	private loc(p: Program, name: string) {
		if (!p.locs.has(name)) p.locs.set(name, this.gl.getUniformLocation(p.prog, name));
		return p.locs.get(name)!;
	}

	private createTexture() {
		const { gl } = this;
		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}

	private bindTex(unit: number, tex: WebGLTexture) {
		this.gl.activeTexture(this.gl.TEXTURE0 + unit);
		this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
	}

	/**
	 * Draw one layer or effect into the bound framebuffer: its own params, reading `input` as the image
	 * below it. Returns false when its shader doesn't compile. Effects pass box = null.
	 */
	private pass(
		def: LayerDef,
		id: string,
		params: Params,
		seed: number,
		palette: ReturnType<typeof toPalette>,
		input: WebGLTexture,
		box: ReturnType<typeof frameBox>,
		env: { width: number; height: number; comp: [number, number]; time: number; phase: number; darkBg: boolean },
	) {
		const { gl } = this;
		const { width, height, comp, darkBg } = env;
		const program = this.layerProgram(def, def.defines?.(params) ?? []);
		if (!program) return false;
		let texSize: [number, number] = [0, 0];
		let tex = this.emptyTex;
		if (def.texture) {
			const lt = this.layerTexture(id, def, params, {
				res: [width, height],
				comp,
				resolveColor: (c) => resolveColor(c, palette),
				darkBg,
				invalidate: () => this.onInvalidate(),
			});
			if (lt) {
				tex = lt.tex;
				texSize = lt.size;
			}
		}
		gl.useProgram(program.prog);
		this.bindTex(0, input);
		if (def.mipInput) {
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		}
		this.bindTex(1, tex);
		const u = (name: string) => this.loc(program, name);
		gl.uniform1i(u("u_input"), 0);
		gl.uniform1i(u("u_tex"), 1);
		if (this.markTex) {
			this.bindTex(2, this.markTex.light);
			this.bindTex(3, this.markTex.dark);
			gl.uniform1i(u("u_markL"), 2);
			gl.uniform1i(u("u_markD"), 3);
		}
		gl.uniform1f(u("u_markBaked"), this.markTex ? 1 : 0);
		gl.uniform2f(u("u_res"), width, height);
		// A framed background renders as if its box were the whole canvas (see PRELUDE's P()).
		gl.uniform2f(u("u_canvas"), comp[0], comp[1]);
		gl.uniform2f(u("u_comp"), box ? box.w : comp[0], box ? box.h : comp[1]);
		gl.uniform4f(u("u_frame"), box?.x ?? 0, box?.y ?? 0, box?.w ?? 0, box?.h ?? 0);
		gl.uniform1f(u("u_frameRot"), box?.rot ?? 0);
		gl.uniform1f(u("u_time"), env.time);
		gl.uniform1f(u("u_phase"), env.phase);
		gl.uniform1f(u("u_seed"), seed);
		gl.uniform2f(u("u_texSize"), texSize[0], texSize[1]);
		const logo = Number(params.logo ?? 0);
		gl.uniform1f(u("u_markDark"), logo === 1 || (logo === 0 && darkBg) ? 1 : 0);
		for (const p of allParams(def)) {
			const loc = u(`u_${p.key}`);
			if (!loc) continue;
			const v = params[p.key] ?? p.default;
			if (p.type === "float") gl.uniform1f(loc, Number(v));
			else if (p.type === "int" || p.type === "select") gl.uniform1i(loc, Math.round(Number(v)));
			else if (p.type === "bool") gl.uniform1i(loc, v ? 1 : 0);
			else if (p.type === "color") gl.uniform3fv(loc, hexToRgb(resolveColor(String(v), palette)));
		}
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		if (def.mipInput) {
			this.bindTex(0, input);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
		return true;
	}

	/**
	 * Blend `src` onto `base` into `fb` (see COMPOSITE_FRAG). `src` is straight alpha unless premult;
	 * a framed background or Look is clipped to its box. `style` sets the layer's appearance uniforms.
	 */
	private composite(
		fb: WebGLFramebuffer,
		base: WebGLTexture,
		src: WebGLTexture,
		o: { blend: number; opacity: number; box: ReturnType<typeof frameBox>; width: number; comp: [number, number]; premult?: boolean; keepToBase?: boolean },
		style?: (prog: Program) => void,
	) {
		const { gl } = this;
		const prog = this.program("__composite", COMPOSITE_FRAG);
		if (!prog) return null;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.useProgram(prog.prog);
		this.bindTex(0, base);
		this.bindTex(1, src);
		gl.uniform1i(this.loc(prog, "u_base"), 0);
		gl.uniform1i(this.loc(prog, "u_src"), 1);
		gl.uniform1i(this.loc(prog, "u_mode"), o.blend);
		gl.uniform1f(this.loc(prog, "u_opacity"), o.opacity);
		gl.uniform1i(this.loc(prog, "u_srcPremult"), o.premult ? 1 : 0);
		gl.uniform1i(this.loc(prog, "u_keepToBase"), o.keepToBase ? 1 : 0);
		gl.uniform1i(this.loc(prog, "u_grad"), 0);
		gl.uniform1i(this.loc(prog, "u_shadow"), 0);
		if (style) style(prog);
		const { box, comp } = o;
		gl.uniform1i(this.loc(prog, "u_clip"), box ? 1 : 0);
		if (box) {
			gl.uniform4f(this.loc(prog, "u_clipBox"), box.x, box.y, box.w / 2, box.h / 2);
			gl.uniform1f(this.loc(prog, "u_clipRot"), box.rot);
			gl.uniform1f(this.loc(prog, "u_clipRadius"), box.radius);
			gl.uniform2f(this.loc(prog, "u_clipComp"), comp[0], comp[1]);
			gl.uniform1f(this.loc(prog, "u_clipPx"), comp[0] / o.width);
		}
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		return prog;
	}

	private ensureTargets(w: number, h: number) {
		if (this.size[0] === w && this.size[1] === h && this.targets.length) return;
		const { gl } = this;
		for (const t of this.targets) {
			gl.deleteFramebuffer(t.fb);
			gl.deleteTexture(t.tex);
		}
		// acc, next, scratch, and two for effects on a single layer.
		this.targets = [0, 1, 2, 3, 4].map(() => {
			const tex = this.createTexture();
			gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, w, h, 0, gl.RGBA, this.texType, null);
			const fb = gl.createFramebuffer()!;
			gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
			return { fb, tex };
		});
		this.size = [w, h];
	}

	private layerTexture(id: string, def: LayerDef, params: Doc["layers"][number]["params"], ctx: Parameters<NonNullable<LayerDef["texture"]>>[1]) {
		const req = def.texture!(params, ctx);
		const existing = this.layerTex.get(id);
		if (!req) return null;
		if (existing && existing.key === req.key) return existing;
		const img = req.build();
		if (!img) return existing ?? null;
		const { gl } = this;
		const tex = existing?.tex ?? this.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img.source);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		const lt = { key: req.key, tex, size: [img.width, img.height] as [number, number] };
		this.layerTex.set(id, lt);
		return lt;
	}
}

/** A framed background or Look's box in composition px: centre (y up, from the canvas centre), size, turn, radius. */
function frameBox(layer: Doc["layers"][number], comp: [number, number]) {
	if (!isFramed(layer)) return null;
	const p = layer.params;
	const n = (k: string, d: number) => (typeof p[k] === "number" ? (p[k] as number) : d);
	return {
		x: (n("x", 0.5) - 0.5) * comp[0],
		y: (n("y", 0.5) - 0.5) * comp[1],
		w: Math.max(1, n("w", 0.6) * comp[0]),
		h: Math.max(1, n("h", 0.6) * comp[1]),
		rot: n("rotation", 0),
		radius: n(radiusKey(layer), 0),
	};
}
