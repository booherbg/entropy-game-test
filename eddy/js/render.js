;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.Render = E.Render || { lens: 'world' };

  let prog = null, vao = null, tex = null, texBuf = null, uField = null, uLens = null, uClime = null, glRef = null;

  const VS = `#version 300 es
in vec2 pos; out vec2 uv;
void main(){ uv = vec2(pos.x*0.5+0.5, 0.5-pos.y*0.5); gl_Position = vec4(pos,0.0,1.0); }`;

  // element triple → color. proportions set hue; dominance sets saturation
  // (balanced = gray = disorder); total sets brightness (concentrated = vivid = order).
  // the clime → an atmospheric wash (Gaia): warm/amber when hot, cool/blue when cold, neutral at the optimum.
  // shared shape with pngutil's climeTint; applied to the world so the planet's temperature is felt as light.
  const CLIME_TINT = `
vec3 climeTint(vec3 col, float clime, float aw){
  float dev = clamp(clime - 0.5, -0.45, 0.6);
  if (abs(dev) < 0.02) return col;
  if (dev > 0.0){ col.r = col.r*(1.0+dev*0.40)+dev*0.086*aw; col.g = col.g*(1.0+dev*0.06)+dev*0.0235*aw; col.b = col.b*(1.0-dev*0.45); }
  else { float d = -dev; col.r = col.r*(1.0-d*0.30); col.g = col.g*(1.0-d*0.06)+d*0.0157*aw; col.b = col.b*(1.0+d*0.28)+d*0.102*aw; }
  return clamp(col, 0.0, 1.0);
}`;
  const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 frag;
uniform sampler2D field; uniform int lens; uniform float clime;
${CLIME_TINT}
void main(){
  vec4 s = texture(field, uv);
  vec3 e = s.rgb; float rot = s.a;
  if (rot > 50.0) { frag = vec4(climeTint(vec3(0.15, 0.14, 0.16), clime, 1.0), 1.0); return; } // rock (terrain) — alpha sentinel
  float lignin = rot < 0.0 ? -rot : 0.0; rot = max(rot, 0.0); // negative alpha carries lignin (recalcitrant humus)
  float t = e.r + e.g + e.b + 1e-4;
  vec3 gold = vec3(0.92,0.71,0.27), blue = vec3(0.27,0.55,0.85), green = vec3(0.35,0.69,0.33);
  if (lens == 1) { // raw-field lens — each material in its OWN world colour by magnitude (consistent with the world view: lumen→gold, mineral→blue, humus→green)
    vec3 fc = clamp(e.r,0.0,1.5)/1.5*gold + clamp(e.g,0.0,1.5)/1.5*blue + clamp(e.b,0.0,1.5)/1.5*green;
    frag = vec4(clamp(fc,0.0,1.0), 1.0); return;
  }
  vec3 p = e / t;
  vec3 hue = p.r*gold + p.g*blue + p.b*green;
  float dom = max(max(p.r,p.g),p.b);
  float sat = clamp((dom-0.3333)/0.6667, 0.0, 1.0);
  vec3 gray = vec3(0.17,0.18,0.20);
  float bright = clamp(0.18 + 0.82*min(t,1.5)/1.5, 0.10, 1.0);
  vec3 col = mix(gray, hue, sat) * bright;
  col = mix(col, vec3(0.20,0.13,0.05), clamp(lignin, 0.0, 0.7));    // lignin — a woody, recalcitrant brown
  col = mix(col, vec3(0.14,0.05,0.06), clamp(rot/1.5, 0.0, 0.82)); // the rot — a dark stain creeping over the world
  frag = vec4(climeTint(col, clime, 1.0), 1.0);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }

  E.Render.init = function (gl) {
    glRef = gl;
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, 'pos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    uField = gl.getUniformLocation(prog, 'field');
    uLens = gl.getUniformLocation(prog, 'lens');
    uClime = gl.getUniformLocation(prog, 'clime');

    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texBuf = new Float32Array(E.W * E.H * 4);

    if (E.Render._initEntities) E.Render._initEntities(gl); // Task 12
  };

  function uploadField(gl, field) {
    const el = field.el, rot = field.rot, barrier = field.barrier, locked = field.locked, buf = texBuf, N = E.W * E.H;
    // alpha: rock=99 sentinel; else rot intensity (positive → dark stain); else lignin (negative → woody brown)
    for (let i = 0; i < N; i++) { buf[i*4] = el[i*3]; buf[i*4+1] = el[i*3+1]; buf[i*4+2] = el[i*3+2]; buf[i*4+3] = barrier[i] ? 99 : (rot[i] > 0 ? rot[i] : -Math.min(locked[i], 6) / 6); }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, E.W, E.H, 0, gl.RGBA, gl.FLOAT, buf);
  }

  E.Render.draw = function (sim, gl) {
    gl = gl || glRef; if (!gl || !prog) return;
    gl.clearColor(0.055, 0.062, 0.078, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    uploadField(gl, sim.field);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uField, 0);
    gl.uniform1i(uLens, E.Render.lens === 'rawfield' ? 1 : 0);
    const clime = sim.clime ? sim.clime() : 0.5; // the planet's temperature → an atmospheric tint (Gaia)
    gl.uniform1f(uClime, clime);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    E.Render._clime = clime; // hand the entity pass the same value
    if (E.Render._drawEntities) E.Render._drawEntities(sim, gl); // Task 12
    if (E.Render._drawGenerators) E.Render._drawGenerators(sim, gl);
  };

  // ── entities: distinct, diet-colored sprites that sit ABOVE the field ──
  const EVS = `#version 300 es
in vec2 cell; in vec3 col; in float sz; out vec3 vcol; uniform vec2 grid; uniform float psize;
void main(){ vec2 clip = vec2(cell.x/grid.x*2.0-1.0, -(cell.y/grid.y*2.0-1.0));
  gl_Position = vec4(clip,0.0,1.0); gl_PointSize = psize * sz; vcol = col; }`;
  const EFS = `#version 300 es
precision highp float; in vec3 vcol; out vec4 frag; uniform int mode; uniform float clime;
${CLIME_TINT}
void main(){ vec2 d = gl_PointCoord - vec2(0.5); float r = length(d); if (r > 0.5) discard;
  if (mode == 0) { float f = 1.0 - r/0.5; f = f*f*0.30; frag = vec4(climeTint(vcol*f, clime, 0.0), 1.0); }   // glow halo — additive (gain-only tint; the field already laid the wash)
  else { float u = r/0.5, b = 1.0 - u*u*0.5; frag = vec4(climeTint(vcol*b, clime, 1.0), 1.0); } }`;          // body — radial-shaded orb, fully tinted
  let eprog = null, evao = null, ebuf = null, eGridU = null, ePsizeU = null, eModeU = null, eClimeU = null, entBuf = null;
  const ECAP = 5000;

  // diet proportions → a vivid color (brighter than the field, so life pops as "ordered")
  E.Render.dietColor = function (diet) {
    const t = (diet[0] + diet[1] + diet[2]) || 1;
    const r0 = diet[0] / t, g0 = diet[1] / t, b0 = diet[2] / t;
    const gold = [0.96, 0.78, 0.32], blue = [0.42, 0.66, 0.96], green = [0.50, 0.84, 0.46];
    return [
      r0 * gold[0] + g0 * blue[0] + b0 * green[0],
      r0 * gold[1] + g0 * blue[1] + b0 * green[1],
      r0 * gold[2] + g0 * blue[2] + b0 * green[2],
    ];
  };

  E.Render._initEntities = function (gl) {
    eprog = gl.createProgram();
    gl.attachShader(eprog, compile(gl, gl.VERTEX_SHADER, EVS));
    gl.attachShader(eprog, compile(gl, gl.FRAGMENT_SHADER, EFS));
    gl.bindAttribLocation(eprog, 0, 'cell'); gl.bindAttribLocation(eprog, 1, 'col'); gl.bindAttribLocation(eprog, 2, 'sz');
    gl.linkProgram(eprog);
    if (!gl.getProgramParameter(eprog, gl.LINK_STATUS)) throw new Error('elink: ' + gl.getProgramInfoLog(eprog));
    eGridU = gl.getUniformLocation(eprog, 'grid'); ePsizeU = gl.getUniformLocation(eprog, 'psize'); eModeU = gl.getUniformLocation(eprog, 'mode'); eClimeU = gl.getUniformLocation(eprog, 'clime');
    evao = gl.createVertexArray(); gl.bindVertexArray(evao);
    ebuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ebuf);
    gl.bufferData(gl.ARRAY_BUFFER, ECAP * 6 * 4, gl.DYNAMIC_DRAW); // 6 floats/vertex: x,y,r,g,b,size
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 20);
    gl.bindVertexArray(null);
    entBuf = new Float32Array(ECAP * 6);
  };

  E.Render._drawEntities = function (sim, gl) {
    if (!eprog) return;
    const list = sim.life.list; let n = 0;
    for (let k = 0; k < list.length && n < ECAP; k++) {
      const e = list[k]; if (!e.alive) continue;
      const c = E.Render.dietColor(e.diet), p = Math.min(1, (e.pred || 0) * 1.4), o = n * 6; // predators tint crimson — boosted so a hunter reads clearly red even at its evolved ~0.48
      entBuf[o] = e.x; entBuf[o+1] = e.y;
      entBuf[o+2] = c[0] * (1 - p) + 0.92 * p; entBuf[o+3] = c[1] * (1 - p) + 0.16 * p; entBuf[o+4] = c[2] * (1 - p) + 0.16 * p;
      entBuf[o+5] = 0.5 + Math.min(e.biomass, 2) / 2 * 0.95; // size by vitality — thriving large, starving small
      if (e.composite) { // symbiogenesis: a composite glows pearl and runs a touch larger — a new, integrated kind of life
        entBuf[o+2] = entBuf[o+2] * 0.55 + 0.42; entBuf[o+3] = entBuf[o+3] * 0.55 + 0.42; entBuf[o+4] = entBuf[o+4] * 0.55 + 0.40;
        entBuf[o+5] *= 1.3;
      }
      n++;
    }
    if (n === 0) return;
    gl.useProgram(eprog);
    gl.bindVertexArray(evao);
    gl.bindBuffer(gl.ARRAY_BUFFER, ebuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, entBuf.subarray(0, n * 6));
    gl.uniform2f(eGridU, E.W, E.H);
    gl.uniform1f(eClimeU, E.Render._clime != null ? E.Render._clime : 0.5); // same atmospheric tint as the field
    const psize = Math.max(3, (gl.canvas.height / E.H) * 1.7);
    // pass 1 — a luminous halo, additive in each creature's own light, so a colony glows lit-from-within
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1i(eModeU, 0); gl.uniform1f(ePsizeU, psize * 2.4);
    gl.drawArrays(gl.POINTS, 0, n);
    // pass 2 — the bodies as radial-shaded orbs, drawn over their own light
    gl.disable(gl.BLEND);
    gl.uniform1i(eModeU, 1); gl.uniform1f(ePsizeU, psize);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.bindVertexArray(null);
  };

  // springs as markers — element-colored, dimming as the reservoir runs dry (reuses the entity
  // point-sprite program; larger than creatures so a spring reads as a placed source).
  E.Render._drawGenerators = function (sim, gl) {
    if (!eprog || !sim.gens || !sim.gens.length) return;
    const COL = [[0.95, 0.78, 0.32], [0.42, 0.66, 0.96], [0.50, 0.84, 0.46]];
    let n = 0;
    for (const g of sim.gens) {
      if (n >= ECAP) break;
      const frac = (g.r0 && isFinite(g.r0)) ? Math.max(0, Math.min(1, g.reservoir / g.r0)) : 1;
      const br = 0.3 + 0.7 * frac, c = COL[g.el] || [0.8, 0.8, 0.8], o = n * 6;
      entBuf[o] = g.x; entBuf[o + 1] = g.y; entBuf[o + 2] = c[0] * br; entBuf[o + 3] = c[1] * br; entBuf[o + 4] = c[2] * br; entBuf[o + 5] = 1.0; n++;
    }
    if (!n) return;
    gl.useProgram(eprog);
    gl.bindVertexArray(evao);
    gl.bindBuffer(gl.ARRAY_BUFFER, ebuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, entBuf.subarray(0, n * 6));
    gl.uniform2f(eGridU, E.W, E.H);
    gl.uniform1f(eClimeU, E.Render._clime != null ? E.Render._clime : 0.5); // same tint (set explicitly — _drawEntities may have early-returned)
    gl.uniform1i(eModeU, 1); // markers draw as solid orbs (no additive halo), blend already off from the entity pass
    gl.uniform1f(ePsizeU, Math.max(7, (gl.canvas.height / E.H) * 3.0)); // bigger than creatures
    gl.drawArrays(gl.POINTS, 0, n);
    gl.bindVertexArray(null);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
