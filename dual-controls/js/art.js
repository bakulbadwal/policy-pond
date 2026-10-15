/* Dual Controls — the pictures. Eight hand-built 960×400 scenes of Busytown's driving school, assembled from a small
   cast of drawn parts (the learner car with its two occupants, the examiner and her clipboard, the dashcam photo, the
   logbooks, the dither dial, the hedge and fence, the reset truck, the lot clock), plus the nav and cast icons.
   Flat gouache fills, one warm-brown outline, every object labelled with a hairline pointer.
   Exposed as window.DC_ART (scenes) and window.DC_ICONS (icons). */
(function (root) {
  "use strict";
  var L = "#4A2E1E", PAPER = "#FBF7EC", SHEET = "#FFFDF6", YEL = "#F4C430", BRICK = "#C8452F", GRASS = "#5FA03C", SKY = "#9CCBEA",
      SAND = "#DDBB8A", LILAC = "#B8A3DC", STEEL = "#B9BDC2", WOOD = "#B8793F", NOTE = "#FFF1A8", CHALK = "#2F4A3A",
      ASPH = "#8F9397", ASPHD = "#6F7377", KERB = "#D6CFC2", LEFT = "#246A9C", RIGHT = "#5E4A94", CEM = "#C9C3B6", BAD = "#A5321F",
      CONE = "#E2701C", MAST = "#C9561A", HOLE = "#3F4246", VEST = "#CFE03A", SILVER = "#E4E7EA", BILL = "#E9A23B",
      SKIN = "#F1C9A5", SKIN2 = "#D9A27A", SKIN3 = "#9C6B4A", CORK = "#D2A877";
  var HAND = "'Patrick Hand', 'Comic Sans MS', sans-serif", SIGN = "'Grandstander', 'Patrick Hand', sans-serif";

  /* ---------- primitives ---------- */
  function n(v) { return Math.round(v * 10) / 10; }
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function st(sw) { return sw === 0 ? "" : ' stroke="' + L + '" stroke-width="' + (sw || 2.5) + '"'; }
  function R(x, y, w, h, f, sw, rx, ex) { return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"' + (rx ? ' rx="' + rx + '"' : "") + ' fill="' + f + '"' + st(sw) + (ex || "") + "/>"; }
  function C(x, y, r, f, sw, ex) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + r + '" fill="' + f + '"' + st(sw === undefined ? 2 : sw) + (ex || "") + "/>"; }
  function E(x, y, rx, ry, f, sw, ex) { return '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + st(sw === undefined ? 2 : sw) + (ex || "") + "/>"; }
  function P(d, f, sw, ex) { return '<path d="' + d + '" fill="' + (f || "none") + '"' + st(sw === undefined ? 2 : sw) + (ex || "") + "/>"; }
  function K(d, col, w, ex) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (ex || "") + "/>"; }
  function G(tf, inner, ex) { return '<g transform="' + tf + '"' + (ex || "") + ">" + inner + "</g>"; }
  function rnd(seed) { var r = seed; return function () { r = (r * 9301 + 49297) % 233280; return r / 233280; }; }
  function ss(t) { t = cl(t, 0, 1); return t * t * (3 - 2 * t); }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + n(x) + '" y="' + n(y) + '" font-family="' + (o.sign ? SIGN : HAND) + '" font-size="' + (o.size || 15) + '"' + (o.sign ? ' font-weight="800"' : "") +
      ' fill="' + (o.fill || L) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") + (o.tf ? ' transform="' + o.tf + '"' : "") + (o.ls ? ' letter-spacing="' + o.ls + '"' : "") + ">" + s + "</text>";
  }
  // A painted signboard title: uppercase sign lettering in paper on a coloured board, with the 2px dark offset copy.
  function board(x, y, w, s, col) {
    return R(x, y, w, 36, col || MAST, 3, 6) + '<g font-family="' + SIGN + '" font-weight="800" font-size="21" letter-spacing="1" text-anchor="middle">' +
      '<text x="' + (x + w / 2 + 2) + '" y="' + (y + 27) + '" fill="' + L + '">' + s + '</text><text x="' + (x + w / 2) + '" y="' + (y + 25) + '" fill="' + PAPER + '">' + s + "</text></g>";
  }
  // A hand-lettered label (one or more lines) joined to its object by a hairline pointer; t = [x, y] of the object.
  // With plate, the lettering sits on a small paper tag so it reads on the asphalt.
  // Patrick Hand advance widths (per 100px) for ASCII 32–126, so a tag fits its lettering.
  var GW = [23,25,30,46,51,64,53,16,33,36,40,48,20,40,21,42,45,36,47,45,37,42,40,49,43,37,23,23,40,57,40,37,55,49,51,55,47,44,37,48,47,23,37,52,37,59,53,56,48,65,45,46,47,55,56,62,60,44,51,30,42,30,37,57,22,39,41,39,39,40,36,44,42,22,23,41,27,68,45,40,43,46,38,38,34,40,40,46,45,42,43,34,18,33,53];
  function tw(s, z) { var w = 0; s.replace(/&[a-z#0-9]+;/g, "x").split("").forEach(function (c) { w += GW[c.charCodeAt(0) - 32] || 64; }); return w * z / 100; }
  function label(x, y, lines, t, o) {
    o = o || {}; if (typeof lines === "string") lines = [lines];
    var z = o.size || 15, lh = Math.round(z * 1.22), an = o.anchor || "start", w = 0, s = "";
    lines.forEach(function (l) { w = Math.max(w, tw(l, z)); });
    var x0 = an === "middle" ? x - w / 2 : an === "end" ? x - w : x, pd = o.plate ? 7 : 3;
    var b = [x0 - pd, y - z * 0.8 - pd + 1, x0 + w + pd, y + (lines.length - 1) * lh + z * 0.25 + pd - 1];
    if (t) {
      var ax, ay;
      if (o.from) { ax = o.from[0]; ay = o.from[1]; }
      else if (t[1] > b[3]) { ax = cl(t[0], b[0] + 10, b[2] - 10); ay = b[3]; }
      else if (t[1] < b[1]) { ax = cl(t[0], b[0] + 10, b[2] - 10); ay = b[1]; }
      else { ax = t[0] < b[0] ? b[0] : b[2]; ay = cl(t[1], b[1] + 4, b[3] - 4); }
      s += K("M" + n(ax) + " " + n(ay) + " L" + t[0] + " " + t[1], L, 1.2) + C(t[0], t[1], 1.8, L, 0);
    }
    if (o.plate) s += R(b[0], b[1], b[2] - b[0], b[3] - b[1], SHEET, 1.6, 6, ' class="pl"');
    lines.forEach(function (l, i) { s += txt(x, y + i * lh, l, { size: z, anchor: an, fill: (o.fills && o.fills[i]) || o.fill }); });
    return s;
  }
  function note(x, y, w, h, lines, o) {   // a sticky note or index card
    o = o || {};
    var s = '<g transform="rotate(' + (o.rot || 0) + " " + (x + w / 2) + " " + (y + h / 2) + ')">' + R(x, y, w, h, o.fill || NOTE, 2, 3);
    if (o.tape) s += R(x + w / 2 - 16, y - 6, 32, 12, "rgba(156,203,234,.8)", 0, 0, ' stroke="rgba(74,46,30,.4)" stroke-width="1.2" transform="rotate(3 ' + (x + w / 2) + " " + y + ')"');
    lines.forEach(function (ln, i) { s += txt(x + 9, y + 20 + i * 18, ln, { size: o.size || 15, sign: i === 0 && o.head }); });
    return s + "</g>";
  }
  function bubble(x, y, w, h, tx, ty, o) {   // a speech bubble with a tail to (tx, ty), or a thought bubble trailing circles
    o = o || {};
    var s = R(x, y, w, h, SHEET, 2, 14), bx = cl(tx, x + 24, x + w - 24), by = ty > y + h ? y + h : y;
    if (o.thought) { for (var i = 1; i <= 3; i++) { var k = i / 4; s += C(bx + (tx - bx) * k, by + (ty - by) * k, 6 - i * 1.3, SHEET, 1.8); } }
    else s += P("M" + (bx - 9) + " " + (by + (ty > by ? -1.5 : 1.5)) + " L" + tx + " " + ty + " L" + (bx + 9) + " " + (by + (ty > by ? -1.5 : 1.5)), SHEET, 2);
    return s;
  }
  function cloud(x, y, sc) { return G("translate(" + x + " " + y + ") scale(" + (sc || 1) + ")", P("M-34 10 a14 14 0 0 1 6 -22 a18 18 0 0 1 32 -8 a14 14 0 0 1 24 10 a12 12 0 0 1 4 20 z", SHEET, 2)); }
  function tree(x, y, sc) {
    return G("translate(" + x + " " + y + ") scale(" + (sc || 1) + ")", R(-5, -40, 10, 40, WOOD, 2) + C(0, -62, 28, GRASS, 2.5) + C(-18, -48, 16, GRASS, 2) + C(16, -46, 15, GRASS, 2) + K("M-8 -70 q6 -6 12 -2", "#7DB85A", 3));
  }
  function lamp(x, y, h) { h = h || 96; return K("M" + x + " " + y + " V" + (y - h) + " h14", L, 4) + P("M" + (x + 6) + " " + (y - h) + " h18 l-3 9 h-12 z", "#4F6B5C", 2) + C(x + 15, y - h + 11, 3.5, NOTE, 1.5) + R(x - 6, y - 6, 12, 6, "#4F6B5C", 2, 1); }
  function bench(x, y) { return R(x, y - 18, 64, 7, WOOD, 2, 2) + R(x, y - 30, 64, 6, WOOD, 2, 2) + K("M" + (x + 8) + " " + (y - 11) + " v11 M" + (x + 56) + " " + (y - 11) + " v11", L, 3); }
  function hydrant(x, y) { return R(x - 7, y - 22, 14, 22, BRICK, 2, 3) + P("M" + (x - 8) + " " + (y - 22) + " a8 7 0 0 1 16 0 z", BRICK, 2) + R(x - 11, y - 16, 22, 5, BRICK, 1.5, 2); }
  // A Busytown storefront in elevation; (x, y) = top-left of the facade, standing on y + h.
  function shop(x, y, w, h, col, o) {
    o = o || {};
    var s = R(x, y, w, h, col, 2.5) + R(x - 6, y - 14, w + 12, 16, o.roof || WOOD, 2.5);
    var k = Math.max(1, Math.floor(w / 40));
    for (var i = 0; i < k; i++) { var wx = k === 1 ? x + w / 2 - 9 : x + 12 + i * ((w - 42) / (k - 1)); s += R(wx, y + 10, 18, 18, SKY, 2, 2) + K("M" + (wx + 9) + " " + (y + 10) + " v18", L, 1.2); }
    var ay = y + h - 44, d = "M" + x + " " + ay + " h" + w + " v10 ", m = Math.floor(w / 12);
    for (var j = 0; j < m; j++) d += "l-" + n(w / m / 2) + " 8 l-" + n(w / m / 2) + " -8 ";
    s += P(d + "z", o.awning || BRICK, 2);
    for (j = 1; j < m; j += 2) s += K("M" + n(x + j * w / m) + " " + (ay + 1) + " v10", SHEET, 4, ' opacity=".55"');
    s += R(x + 6, y + h - 66, w - 12, 18, SHEET, 1.5, 3) + txt(x + w / 2, y + h - 52.5, o.sign, { size: 13, anchor: "middle", sign: true });
    s += R(x + w / 2 - 11, y + h - 30, 22, 30, WOOD, 2, 3) + C(x + w / 2 + 6, y + h - 15, 1.6, L, 0);
    if (o.goods) s += o.goods(x, y + h);
    return s;
  }
  function loaves(x, y) { return E(x + 14, y - 12, 8, 5, SAND, 1.5) + E(x + 26, y - 10, 8, 5, WOOD, 1.5); }

  /* ---------- the cast ---------- */
  // A rounded Busytown worker standing about 75 tall; (x, y) = feet centre. lh / rh = hand offsets from the hip.
  function person(x, y, o) {
    o = o || {};
    var sk = o.skin || SKIN, sh = o.shirt || SKY, pc = o.pants || "#59606A", hip = y - (o.sit ? 12 : 22), s = "", top = hip - 28, hy = top - 12;
    if (!o.noLegs) s += R(x - 10, hip, 8, y - hip, pc, 2, 3) + R(x + 2, hip, 8, y - hip, pc, 2, 3) + E(x - 7, y, 6, 3, L, 0) + E(x + 7, y, 6, 3, L, 0);
    s += R(x - 14, top, 28, 32, sh, 2, 9);
    if (o.vest) s += R(x - 14, top, 28, 32, VEST, 2, 9) + P("M" + (x - 7) + " " + top + " L" + x + " " + (top + 10) + " L" + (x + 7) + " " + top + " z", sh, 1.5) + R(x - 13.5, top + 14, 27, 4, SILVER, 1.2) + R(x - 13.5, top + 22, 27, 4, SILVER, 1.2);
    if (o.overalls) s += R(x - 9, top + 9, 18, 23, SHEET, 1.5, 3) + K("M" + (x - 8) + " " + (top + 10) + " L" + (x - 11) + " " + (top + 1) + " M" + (x + 8) + " " + (top + 10) + " L" + (x + 11) + " " + (top + 1), L, 1.5) + C(x - 3, top + 17, 1.8, YEL, 0) + C(x + 4, top + 24, 1.5, YEL, 0);
    var sy = top + 6, lh = [x + (o.lh ? o.lh[0] : -24), hip + (o.lh ? o.lh[1] : -10)], rh = [x + (o.rh ? o.rh[0] : 24), hip + (o.rh ? o.rh[1] : -10)];
    [[x - 13, lh], [x + 13, rh]].forEach(function (a) { var d = "M" + a[0] + " " + sy + " L" + n(a[1][0]) + " " + n(a[1][1]); s += K(d, L, 7) + K(d, sh, 3.5); });
    s += C(lh[0], lh[1], 4, sk, 1.5) + C(rh[0], rh[1], 4, sk, 1.5);
    s += C(x, hy, 13, sk, 2) + C(x - 4, hy - 1, 1.6, L, 0) + C(x + 4, hy - 1, 1.6, L, 0) + C(x - 8, hy + 3, 2.4, "#E79C86", 0, ' opacity=".6"') + C(x + 8, hy + 3, 2.4, "#E79C86", 0, ' opacity=".6"');
    var m = o.mouth;
    s += m === "o" ? E(x, hy + 6, 2.2, 2.8, L, 0) : m === "frown" ? K("M" + (x - 4) + " " + (hy + 7) + " q4 -3 8 0", L, 1.5) : m === "flat" ? K("M" + (x - 3) + " " + (hy + 6) + " h6", L, 1.5) : K("M" + (x - 4) + " " + (hy + 4) + " q4 3.5 8 0", L, 1.5);
    if (o.stache) s += P("M" + (x - 6) + " " + (hy + 4) + " q3 -3 6 0 q3 -3 6 0 q-6 3 -12 0 z", L, 0);
    if (o.hair) s += P("M" + (x - 13) + " " + (hy - 2) + " a13 13 0 0 1 26 0 v-2 a13 13 0 0 0 -26 0 z", o.hair, 1.5);
    var hc = o.hatCol || BRICK;
    if (o.hat === "cap") s += P("M" + (x - 13) + " " + (hy - 4) + " a13 13 0 0 1 26 0 z", hc, 2) + R(x + (o.capL ? -18 : -2), hy - 7, 20, 5, hc, 1.5, 2);
    if (o.hat === "visor") s += P("M" + (x - 14) + " " + (hy - 4) + " h28 l-4 -7 h-20 z", GRASS, 1.5) + K("M" + (x + 12) + " " + (hy - 1) + " l7 -9", YEL, 2.4);
    if (o.hat === "beret") s += E(x + 2, hy - 11, 13, 5, hc, 2);
    return s;
  }
  // The master's teleoperation box: two sticks and an antenna; (x, y) = box centre.
  var PLATE = "#C8322B", CAR = "#9CCBEA", HEDGE = "#3F7A3A", HEDGEL = "#5FA03C", DEMO = "#246A9C", INST = "#C8322B", STU = "#F4C430", EXR = "#5E4A94";

  /* ---------- the cast ---------- */
  // A head only (for people seen through a car window); (x, y) = centre.
  function head(x, y, o) {
    o = o || {};
    var s = C(x, y, 11, o.skin || SKIN, 2) + C(x - 3.5, y - 1, 1.5, L, 0) + C(x + 3.5, y - 1, 1.5, L, 0) + K("M" + (x - 3.5) + " " + (y + 4) + " q3.5 " + (o.frown ? -3 : 3) + " 7 0", L, 1.4);
    if (o.hair) s += P("M" + (x - 11) + " " + (y - 2) + " a11 11 0 0 1 22 0 v-2 a11 11 0 0 0 -22 0 z", o.hair, 1.5);
    if (o.cap) s += P("M" + (x - 11) + " " + (y - 4) + " a11 11 0 0 1 22 0 z", o.cap, 1.8) + R(x + 2, y - 7, 15, 4, o.cap, 1.4, 2);
    if (o.bun) s += C(x + 1, y - 14, 5, o.bun, 1.5) + P("M" + (x - 11) + " " + (y - 2) + " a11 11 0 0 1 22 0 z", o.bun, 1.5);
    if (o.glasses) s += C(x - 4, y - 1, 3.6, "none", 1.4) + C(x + 4, y - 1, 3.6, "none", 1.4) + K("M" + (x - 0.5) + " " + (y - 1) + " h1", L, 1.2);
    return s;
  }
  // The school's learner car, side view, facing right: a rounded hatchback with a LEARNER roof sign and L plates.
  // (x, y) = ground under its middle. The driver (the student) is in front, the instructor beside and behind.
  function learner(x, y, sc, o) {
    o = o || {}; sc = sc || 1;
    var s = "", body = o.body || CAR;
    s += P("M-104 -22 Q-106 -48 -84 -52 L-56 -54 Q-40 -88 -2 -90 L34 -90 Q58 -88 72 -56 L96 -50 Q110 -46 108 -22 Z", body, 2.6);
    s += P("M-46 -56 Q-34 -82 -4 -84 L10 -84 L10 -56 Z", SKY, 2) + P("M18 -56 L18 -84 L32 -84 Q52 -82 64 -56 Z", SKY, 2);
    s += head(-14, -64, o.student || { hair: L, cap: STU }) + head(38, -64, o.instructor || { skin: SKIN2, bun: "#7A4A2A", glasses: true });
    s += K("M-2 -60 l10 -4", L, 3) + C(6, -64, 6, "none", 2.2);   // the student's wheel
    s += R(-12, -104, 52, 16, STU, 2, 4) + txt(14, -92, "LEARNER", { size: 10, sign: true, anchor: "middle" }) + K("M4 -88 v-2 M24 -88 v-2", L, 2);
    s += R(96, -40, 13, 15, SHEET, 1.6, 2) + K("M100 -37 v9 h6", PLATE, 2.4) + R(-111, -40, 13, 15, SHEET, 1.6, 2) + K("M-107 -37 v9 h6", PLATE, 2.4);
    s += C(94, -44, 4.5, NOTE, 1.5) + R(-104, -46, 6, 8, BRICK, 1.2, 1);
    s += C(-60, -18, 19, L, 0) + C(-60, -18, 10, STEEL, 2) + C(66, -18, 19, L, 0) + C(66, -18, 10, STEEL, 2);
    s += K("M-38 -40 h14 M30 -40 h14", L, 2);
    if (o.extra) s += o.extra;
    return G("translate(" + n(x) + " " + n(y) + ") scale(" + sc + ")", s, o.ghost ? ' opacity=".4"' : "");
  }
  // The same car from above, for plan views: (x, y) centre, angle in degrees (0 = facing right), length 64·sc.
  function topCar(x, y, ang, sc, o) {
    o = o || {}; sc = sc || 1;
    var s = R(-24, -17, 10, 6, L, 0, 1) + R(14, -17, 10, 6, L, 0, 1) + R(-24, 11, 10, 6, L, 0, 1) + R(14, 11, 10, 6, L, 0, 1) +
      R(-32, -14, 64, 28, o.body || CAR, 2.2, 8) + R(-12, -10, 22, 20, SKY, 1.8, 3) + R(22, -6, 9, 12, SHEET, 1.4, 1) + K("M24.5 -3.5 v7 h4", PLATE, 2);
    return G("translate(" + n(x) + " " + n(y) + ") rotate(" + ang + ") scale(" + sc + ")", s);
  }
  function clipboard(x, y, w, h, o) {
    o = o || {};
    var s = R(x, y, w, h, WOOD, 2, 3) + R(x + 4, y + 6, w - 8, h - 10, SHEET, 1.5, 1) + R(x + w / 2 - 9, y - 4, 18, 8, STEEL, 1.5, 2);
    if (o.lines !== false) for (var i = 0; i < 3; i++) s += K("M" + (x + 9) + " " + (y + 16 + i * 8) + " h" + (w - 26), "#B9A994", 1.4);
    if (o.tick) s += K("M" + (x + w - 15) + " " + (y + 15) + " l3 3 l6 -7", "#3B7422", 2);
    return s;
  }
  // a dashcam photo: a 5 × 4 greyscale grid in a white border; pix = 20 values, row 0 at the top
  function photoCard(x, y, w, pix, o) {
    o = o || {};
    var cw = w / 5, s = R(x - 4, y - 4, w + 8, cw * 4 + (o.cap ? 22 : 8), SHEET, 1.8, 2);
    for (var i = 0; i < 20; i++) { var v = Math.round(255 * cl(pix[i], 0, 1)), hex = "rgb(" + v + "," + v + "," + v + ")"; s += R(x + (i % 5) * cw, y + Math.floor(i / 5) * cw, cw, cw, hex, 0); }
    s += R(x, y, w, cw * 4, "none", 1.2);
    if (o.cap) s += txt(x + w / 2, y + cw * 4 + 14, o.cap, { size: 12, anchor: "middle", fill: o.capCol || L });
    return o.rot ? G("rotate(" + o.rot + " " + (x + w / 2) + " " + (y + w * 0.4) + ")", s) : s;
  }
  var PH_EXAM = [0.9, 0.2, 0.75, 0.2, 0.9, 0.9, 0.75, 0.2, 0.75, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1, 0.3, 0.3, 0.3, 1];
  var PH_STAFF = [0.9, 0.15, 0.15, 0.15, 0.9, 0.9, 0.15, 0.15, 0.15, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1, 0.3, 0.3, 0.3, 1];
  var PH_LOT = [0.3, 0.3, 0.75, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
  var PH_HEDGE = [0.2, 0.2, 0.2, 0.3, 0.3, 0.2, 0.2, 0.3, 0.3, 0.3, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
  function stamp(x, y, text, col, rot) { return G("rotate(" + (rot || -8) + " " + x + " " + y + ")", R(x - tw(text, 16) / 2 - 10, y - 15, tw(text, 16) + 20, 26, SHEET, 0, 4, ' stroke="' + col + '" stroke-width="2.6" fill-opacity=".9"') + txt(x, y + 4, text, { size: 16, sign: true, fill: col, anchor: "middle" })); }
  // a logbook standing open: (x, y) = bottom-left of the spine area
  function logbook(x, y, w, h, col, title, o) {
    o = o || {};
    var s = R(x, y - h, w, h, col, 2.4, 4) + R(x + 6, y - h + 6, w - 12, h - 12, SHEET, 1.6, 2) + K("M" + (x + w / 2) + " " + (y - h + 4) + " V" + (y - 4), L, 2);
    for (var i = 0; i < (o.rows || 5); i++) { var yy = y - h + 18 + i * 9; s += K("M" + (x + 12) + " " + yy + " h" + (w / 2 - 20) + " M" + (x + w / 2 + 8) + " " + yy + " h" + (w / 2 - 20), "#B9A994", 1.3); }
    if (title) s += R(x + w / 2 - tw(title, 11) * 0.62 - 6, y - h - 16, tw(title, 11) * 1.24 + 12, 16, col, 1.8, 3) + txt(x + w / 2, y - h - 4, title, { size: 11, sign: true, anchor: "middle", fill: o.titleFill || L });
    return s;
  }
  // a page flying out of a book: (x, y) centre, rotation
  function page(x, y, rot, col) { return G("rotate(" + rot + " " + x + " " + y + ")", R(x - 13, y - 9, 26, 18, SHEET, 1.6, 2) + K("M" + (x - 8) + " " + (y - 3) + " h16 M" + (x - 8) + " " + (y + 3) + " h10", col || "#B9A994", 1.4)); }
  function cone(x, y, sc) { sc = sc || 1; return G("translate(" + x + " " + y + ") scale(" + sc + ")", R(-12, -4, 24, 5, CONE, 1.8, 2) + P("M-9 -4 L-3 -26 h6 L9 -4 z", CONE, 2) + P("M-6.5 -12 L-4.8 -18 h9.6 L6.5 -12 z", SHEET, 0)); }
  function hedge(x0, x1, y, h) {   // a clipped hedge running along y (its foot), h tall
    var s = R(x0, y - h, x1 - x0, h, HEDGE, 2.4, 10), d = "";
    for (var x = x0 + 10; x < x1 - 6; x += 22) s += C(x, y - h + 4, 12, HEDGEL, 0);
    for (x = x0 + 18; x < x1 - 10; x += 31) d += "M" + x + " " + (y - h * 0.45) + " q6 -6 12 0 ";
    return s + K(d, "#2F5E2C", 2) + R(x0, y - h, x1 - x0, h, "none", 2.4, 10);
  }
  function fence(x0, x1, y) { var s = K("M" + x0 + " " + (y - 14) + " H" + x1 + " M" + x0 + " " + (y - 6) + " H" + x1, WOOD, 3); for (var x = x0; x <= x1; x += 16) s += R(x - 2.5, y - 22, 5, 22, WOOD, 1.3, 1); return s; }
  // a parking bay seen at an angle, at the back of the lot: (x, y) = front-left of the bay floor
  function bay(x, y, w, kind, num) {
    var s = K("M" + x + " " + y + " l14 -40 M" + (x + w) + " " + y + " l14 -40", SHEET, 4);
    if (kind === "exam") { for (var u = 0; u < 3; u++) for (var v = 0; v < 2; v++) s += R(x + 16 + u * (w - 4) / 3, y - 78 + v * 13, (w - 4) / 3, 13, (u + v) % 2 ? YEL : "#2E2A26", 0); s += R(x + 16, y - 78, w - 4, 26, "none", 2) + txt(x + 14 + w / 2, y - 84, "EXAM", { size: 13, sign: true, anchor: "middle" }); }
    else if (kind === "staff") s += R(x + 16, y - 78, w - 4, 26, "#3B3F45", 2) + txt(x + 14 + w / 2, y - 60, "STAFF", { size: 11, sign: true, anchor: "middle", fill: SHEET });
    else s += R(x + 16, y - 78, w - 4, 26, STEEL, 2) + txt(x + 14 + w / 2, y - 60, String(num || ""), { size: 12, sign: true, anchor: "middle" });
    return s + K("M" + (x + 14 + w / 2) + " " + (y - 52) + " v12", L, 2.5);
  }
  // the parked car in a bay at the back: a squat rear view
  function rearCar(x, y, col) { return R(x - 26, y - 32, 52, 26, col, 2.2, 8) + R(x - 18, y - 46, 36, 16, SKY, 2, 6) + R(x - 26, y - 14, 52, 8, STEEL, 1.6, 2) + C(x - 18, y - 22, 3.5, BRICK, 1.2) + C(x + 18, y - 22, 3.5, BRICK, 1.2) + R(x - 22, y - 7, 10, 7, L, 0, 2) + R(x + 12, y - 7, 10, 7, L, 0, 2); }
  // the dither dial: a dashboard gauge with α on it; frac 0 … 1 = the needle's sweep
  function dial(x, y, r, frac, o) {
    o = o || {};
    var a0 = Math.PI * 0.85, a1 = Math.PI * 0.15, s = P("M" + n(x - r) + " " + y + " a" + r + " " + r + " 0 0 1 " + n(2 * r) + " 0 z", SHEET, 2.4);
    s += P("M" + n(x + Math.cos(a0) * (r - 6)) + " " + n(y - Math.sin(a0) * (r - 6)) + " A" + (r - 6) + " " + (r - 6) + " 0 0 1 " + n(x + Math.cos(Math.PI * 0.62) * (r - 6)) + " " + n(y - Math.sin(Math.PI * 0.62) * (r - 6)), "none", 0, ' stroke="#9CCBEA" stroke-width="7"');
    s += P("M" + n(x + Math.cos(Math.PI * 0.38) * (r - 6)) + " " + n(y - Math.sin(Math.PI * 0.38) * (r - 6)) + " A" + (r - 6) + " " + (r - 6) + " 0 0 1 " + n(x + Math.cos(a1) * (r - 6)) + " " + n(y - Math.sin(a1) * (r - 6)), "none", 0, ' stroke="#F2A88F" stroke-width="7"');
    var a = a0 + (a1 - a0) * frac;
    s += K("M" + x + " " + y + " L" + n(x + Math.cos(a) * (r - 10)) + " " + n(y - Math.sin(a) * (r - 10)), BRICK, 3.5) + C(x, y, 5, L, 0);
    s += txt(x - r + 10, y - 6, o.lo || "sure", { size: 12 }) + txt(x + r - 10, y - 6, o.hi || "dithers", { size: 12, anchor: "end" }) + txt(x, y - r * 0.42, "α", { size: 18, sign: true, anchor: "middle" });
    return s;
  }
  function towTruck(x, y) {   // the reset truck, facing left; (x, y) = ground under its middle
    var s = R(-70, -52, 60, 36, YEL, 2.4, 6) + R(-62, -46, 26, 18, SKY, 2, 3) + R(-10, -34, 90, 18, YEL, 2.4, 3) + K("M60 -34 L74 -80 L92 -80", L, 4) + K("M92 -80 v26", L, 2) + P("M86 -54 h12 l-6 10 z", STEEL, 1.8);
    s += C(-46, -14, 14, L, 0) + C(-46, -14, 6, STEEL, 1.6) + C(50, -14, 14, L, 0) + C(50, -14, 6, STEEL, 1.6) + R(-56, -64, 22, 10, BRICK, 1.6, 3) + txt(16, -21, "RESET", { size: 12, sign: true, anchor: "middle" });
    return G("translate(" + n(x) + " " + n(y) + ")", s);
  }
  function lotClock(x, y, h) {   // a clock on a pole; (x, y) = foot
    return R(x - 4, y - h, 8, h, "#4F6B5C", 2, 2) + C(x, y - h - 22, 26, SHEET, 2.6) + K("M" + x + " " + (y - h - 22) + " v-17 M" + x + " " + (y - h - 22) + " l11 6", L, 3) + C(x, y - h - 22, 2.6, L, 0) +
      K("M" + x + " " + (y - h - 45) + " v4 M" + (x + 23) + " " + (y - h - 22) + " h-4 M" + x + " " + (y - h + 1) + " v-4 M" + (x - 23) + " " + (y - h - 22) + " h4", L, 2);
  }
  function office(x, y, w, h) {   // the driving school's office: (x, y) = top-left of the wall, standing on y + h
    var s = R(x, y, w, h, SAND, 2.6) + P("M" + (x - 10) + " " + y + " L" + (x + w / 2) + " " + (y - 34) + " L" + (x + w + 10) + " " + y + " z", BRICK, 2.6);
    s += R(x + w / 2 - 74, y - 20, 148, 26, PLATE, 2.2, 4) + txt(x + w / 2, y - 2, "DRIVING SCHOOL", { size: 14, sign: true, anchor: "middle", fill: SHEET });
    s += R(x + w - 44, y + h - 64, 30, 64, WOOD, 2.2, 3) + C(x + w - 20, y + h - 30, 2, L, 0);
    return s;
  }
  function desk(x, y, w) { return R(x, y - 8, w, 8, WOOD, 2, 2) + K("M" + (x + 8) + " " + y + " v30 M" + (x + w - 8) + " " + y + " v30", L, 4); }
  /* ---------- the stage ---------- */
  function wrap(id, title, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 400" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + title + '"><title>' + title + '</title><rect width="960" height="400" fill="#E5F2FA"/>' +
      '<g stroke-linejoin="round" stroke-linecap="round">' + inner + "</g></svg>";
  }
  // the back of the lot: a hedge, the kerb and the seven bays, x0 = left edge of bay 1, w = bay width, y = front of the bays
  function bayRow(x0, w, y, o) {
    o = o || {};
    var kinds = ["staff", "staff", "p", "p", "p", "exam", "p"], cols = [BRICK, GRASS, LILAC, SAND, SKY], s = hedge(x0 - 60, x0 + 7 * w + 70, y - 44, 34) + R(x0 - 60, y - 46, 7 * w + 130, 8, KERB, 2);
    kinds.forEach(function (k, i) { s += bay(x0 + i * w, y, w, k, i + 1); if (k === "p") s += rearCar(x0 + i * w + w / 2 + 8, y - 4, cols[i % 5]); });
    return s;
  }
  function asphalt(t, b, o) {
    o = o || {};
    var s = R(-5, t, 970, b - t, ASPH, 0), r = rnd(o.seed || 4), d = "";
    for (var i = 0; i < 90; i++) d += "M" + n(r() * 960) + " " + n(t + 4 + r() * (b - t - 8)) + " h3 ";
    return s + K(d, ASPHD, 2.2) + K("M-5 " + t + " H965", L, 2.5);
  }

  /* ---------- scenes ---------- */
  var scenes = {};
  scenes.s0 = function () {
    var s = cloud(330, 52, 0.8) + cloud(640, 40, 0.7);
    s += asphalt(196, 334) + bayRow(330, 64, 204);
    s += office(26, 96, 220, 110) + R(54, 120, 92, 56, SKY, 2.4, 4) + head(84, 152, { skin: SKIN3, hair: L, glasses: true }) + clipboard(100, 136, 34, 38, { tick: true }) + K("M54 148 h92", L, 1.5);
    s += cone(560, 286) + cone(606, 286) + cone(652, 286);
    s += learner(410, 318, 0.92);
    s += R(-5, 334, 970, 66, KERB, 2) + hedge(-10, 300, 398, 30);
    s += R(314, 360, 70, 8, WOOD, 2, 2) + K("M322 368 v24 M376 368 v24", L, 3.5) + logbook(318, 360, 62, 40, STU, "LOGBOOK");
    s += lotClock(894, 392, 150) + photoCard(438, 352, 30, PH_EXAM, { rot: -6 });
    s += board(330, 6, 300, "THE LOT");
    s += label(20, 252, ["the examiner = the reward classifier", "she only sees dashcam photos"], [104, 150], { plate: true, size: 14 });
    s += label(536, 230, ["the student = the robot", "its habits = the policy"], [394, 250], { plate: true, size: 14 });
    s += label(690, 330, ["the instructor beside it,", "with her own brake and wheel"], [452, 254], { plate: true, size: 14, from: [690, 318] });
    s += label(800, 98, ["the exam bay", "= the task"], [722, 124], { plate: true, size: 14 });
    s += label(140, 22, ["two staff bays: in a photo", "they look like the exam bay"], [384, 124], { plate: true, size: 14 });
    s += label(40, 384, "the logbook = the replay buffer", [318, 352], { plate: true, size: 14 });
    s += label(940, 160, ["the lot clock:", "every lesson costs minutes"], [910, 204], { plate: true, size: 14, anchor: "end" });
    s += label(488, 384, "a dashcam photo", [466, 368], { size: 14 });
    return wrap("s0", "The Busytown driving school from the side. On the left, the office with a DRIVING SCHOOL sign; in its window the examiner sits with a clipboard. Behind the lot, seven parking bays along a hedge: two staff bays with dark signs, the exam bay with a chequered sign, and parked cars in the others. On the asphalt a pale blue learner car with a LEARNER roof sign carries the student at the wheel and the instructor beside it. Three cones stand in the middle of the lot. In front, an open logbook on a stand, a small dashcam photo, and a clock on a pole.", s);
  };

  scenes.s1 = function () {
    var s = R(-5, -5, 970, 300, "#F6E9D0", 0) + R(-5, 296, 970, 110, "#C9A27A", 2.5);
    for (var x = 0; x < 960; x += 64) s += K("M" + x + " 296 V400", "#B08B62", 1.5);
    // window onto the lot
    s += R(396, 40, 170, 110, SKY, 2.6, 6) + R(396, 112, 170, 38, ASPH, 0) + topCar(470, 128, 0, 0.6) + cone(530, 146, 0.6) + R(396, 40, 170, 110, "none", 2.6, 6) + K("M481 40 V150", L, 2);
    // left: REINFORCE reads one page, then the bin
    s += desk(60, 286, 230) + person(150, 300, { shirt: LILAC, hair: L, rh: [40, -46], lh: [-30, -36], mouth: "flat" });
    s += page(206, 224, -10) + C(112, 222, 14, "none", 0) + page(70, 210, 18);
    s += P("M286 300 l8 -54 h40 l8 54 z", STEEL, 2.4) + K("M300 252 l2 44 M316 252 l0 44 M330 252 l-2 44", L, 1.5) + page(302, 244, -20) + page(322, 240, 14) + page(312, 230, 4);
    s += K("M232 214 q30 -30 66 4", L, 2, ' stroke-dasharray="5 5"') + P("M294 214 l6 6 l3 -9 z", L, 0);
    // right: SAC with a big logbook, pages flying back and forth
    s += desk(612, 286, 300) + logbook(690, 278, 150, 74, STU, "LOGBOOK: EVERY MOVE", { rows: 6 });
    s += person(872, 300, { shirt: GRASS, skin: SKIN2, hat: "cap", hatCol: STU, lh: [-34, -44], rh: [26, -20], mouth: "o" });
    s += page(670, 160, -16) + page(716, 140, 10) + page(770, 150, -6) + page(820, 172, 14);
    s += K("M672 178 q-20 30 30 34 M818 188 q20 20 -10 30", L, 1.6, ' stroke-dasharray="4 4"');
    s += R(626, 304, 120, 30, SHEET, 2, 4) + txt(686, 324, "studied 63×", { size: 16, sign: true, anchor: "middle" });
    s += R(54, 304, 150, 30, SHEET, 2, 4) + txt(129, 324, "used once", { size: 16, sign: true, anchor: "middle" });
    s += board(330, 172, 300, "EVERY LESSON TWICE", GRASS);
    s += label(40, 380, "REINFORCE = on-policy: one lesson, one update, then the bin", [150, 340], { size: 14 });
    s += label(560, 380, "SAC = off-policy: the logbook is a replay buffer", [700, 340], { size: 14 });
    s += label(26, 52, ["after each update the old lesson", "no longer shows how it drives"], [104, 216], { plate: true, size: 14 });
    s += label(700, 52, ["after every move: 4 random", "batches of 16 pages (UTD = 4)"], [744, 138], { plate: true, size: 14 });
    s += label(400, 22, "the lot, through the window", [430, 44], { size: 13 });
    return wrap("s1", "Inside the school's study room. On the left, a student at a desk reads one page and tosses it into a bin already full of pages; a card reads used once: REINFORCE, on-policy. On the right, another student at a desk with a big open logbook labelled every move, pages flying out and back; a card reads studied 63 times: SAC, off-policy, with a replay buffer and an update-to-data ratio of 4. A window shows the learner car on the lot.", s);
  };

  scenes.s2 = function () {
    var s = R(-5, -5, 970, 300, "#EEF3E6", 0) + R(-5, 296, 970, 110, "#C9A27A", 2.5);
    // chalkboard with the soft target
    s += R(40, 40, 420, 170, WOOD, 2.5, 6) + R(52, 52, 396, 146, CHALK, 2, 3);
    s += txt(250, 92, "y = r + γ Σ π(a′|s′) [ Q̄(s′,a′) − α log π(a′|s′) ]", { size: 17, anchor: "middle", fill: SHEET });
    s += txt(70, 128, "Q ← Q + ½ (y − Q)", { size: 17, fill: "#FFE27A" }) + txt(70, 160, "π ∝ exp(Q / α)", { size: 17, fill: "#CFE2C4" }) + txt(70, 190, "α ↓ if too random, ↑ if too sure", { size: 15, fill: "#CFE2C4" });
    // two notebooks: today's critic and the slow copy
    s += desk(520, 248, 400) + logbook(540, 240, 120, 62, SKY, "THE CRITIC Q") + logbook(712, 240, 120, 62, STEEL, "SLOW COPY Q̄");
    s += K("M664 210 q24 -26 44 0", L, 2) + P("M704 212 l6 -1 l-3 -7 z", L, 0) + txt(686, 184, "τ = 0.005", { size: 14, anchor: "middle" });
    // the dither dial on a little dashboard
    s += R(840, 132, 110, 70, "#59606A", 2.4, 8) + dial(895, 192, 46, 0.25);
    // the student weighing three moves
    s += person(250, 300, { shirt: GRASS, skin: SKIN2, hat: "cap", hatCol: STU, lh: [-28, -36], rh: [30, -40], mouth: "o" });
    s += bubble(98, 222, 120, 52, 226, 248, { thought: true }) + K("M120 262 l-10 -10 M158 250 v-16 M196 262 l10 -10", L, 3) + R(112, 262, 10, 4, LILAC, 1) + R(153, 262, 10, 6, YEL, 1) + R(194, 262, 10, 3, LILAC, 1);
    s += board(330, 6, 300, "THE SOFT CRITIC", GRASS);
    s += label(560, 58, ["the Bellman target: this page's reward", "plus what the next square is worth"], [440, 92], { plate: true, size: 14 });
    s += label(560, 290, "the critic: how good is each move from here", [600, 246], { size: 14 });
    s += label(560, 316, "the target network: a copy that follows slowly", [770, 246], { size: 14 });
    s += label(748, 118, ["the dither dial =", "the temperature α"], [880, 140], { plate: true, size: 14, anchor: "end" });
    s += label(30, 350, ["the actor = its habits,", "pulled towards what the critic likes"], [236, 262], { plate: true, size: 14 });
    return wrap("s2", "A study room. A chalkboard shows SAC's soft Bellman target y = r + γ times the sum over next moves of π times Q-bar minus α log π, with the critic update, the soft policy π ∝ exp(Q/α), and the rule that α falls if the student is too random and rises if too sure. On a desk, two notebooks: the critic Q and its slow copy Q-bar, with an arrow labelled τ = 0.005. A small dashboard dial marked α runs from sure to dithers. The student thinks about three moves, left, straight and right, with the straight one tallest.", s);
  };

  scenes.s3 = function () {
    var s = R(-5, -5, 970, 300, "#F4ECF8", 0) + R(-5, 296, 970, 110, "#C9A27A", 2.5);
    // window onto the lot: the car in a staff bay
    s += R(560, 34, 360, 170, SKY, 2.6, 6) + G("translate(560 36) scale(0.56)", bayRow(70, 64, 250)) + R(560, 186, 360, 18, ASPH, 0);
    s += topCar(623, 168, -90, 0.5) + R(560, 34, 360, 170, "none", 2.6, 6);
    // the photo tube
    s += K("M560 70 H520 V120", STEEL, 12) + K("M560 70 H520 V120", L, 1.5) + photoCard(502, 124, 30, PH_STAFF, {});
    // the examiner at her desk
    s += desk(250, 266, 300) + person(380, 300, { shirt: EXR, skin: SKIN3, hair: L, lh: [-40, -34], rh: [50, -30], mouth: "flat" }) + K("M372 236 l8 4 l8 -4 l-8 -4 z", BRICK, 1.5);
    s += clipboard(408, 232, 46, 34, { tick: true }) + stamp(456, 214, "PASS", "#3B7422", -10);
    // the pinboard of training photos
    s += R(40, 46, 190, 160, CORK, 2.4, 4);
    var ph = [PH_EXAM, PH_LOT, PH_EXAM, PH_HEDGE, PH_LOT, PH_EXAM];
    ph.forEach(function (p, i) { var x = 58 + (i % 3) * 58, y = 62 + Math.floor(i / 3) * 70; s += photoCard(x, y, 40, p, { cap: p === PH_EXAM ? "✓" : "✗", capCol: p === PH_EXAM ? "#3B7422" : BAD, rot: (i % 2 ? 4 : -3) }); });
    s += board(330, 6, 300, "THE EXAMINER", EXR);
    s += label(40, 240, ["her training photos:", "40 parked ✓, 93 not ✗"], [130, 206], { plate: true, size: 14 });
    s += label(660, 236, ["the car is in a STAFF bay ...", "and she has stamped PASS"], [624, 166], { plate: true, size: 14 });
    s += label(250, 340, "the examiner = a reward classifier (logistic regression on 20 pixels)", [380, 290], { size: 14 });
    s += label(488, 112, ["a 5 × 4 dashcam photo,", "every second"], [500, 142], { plate: true, size: 14, anchor: "end" });
    s += label(246, 186, ["PASS if her score is", "over the threshold"], [430, 214], { plate: true, size: 14 });
    return wrap("s3", "The examiner's office. She sits at a desk with a clipboard and a green PASS stamp; a tube delivers a tiny 5 by 4 pixel dashcam photo. On a cork board, her training photos, ticked or crossed. Through the window, the lot from above: the learner car has pulled into a staff bay, which looks just like the exam bay in a photo, and she has stamped it PASS.", s);
  };

  scenes.s4 = function () {
    var s = cloud(180, 48, 0.7) + cloud(760, 44, 0.75);
    s += asphalt(196, 334, { seed: 7 }) + bayRow(330, 64, 204);
    // the instructor's own drive, in blue, into the exam bay
    s += K("M60 318 C240 318 420 300 560 286 C640 278 700 262 712 210", DEMO, 7, ' stroke-dasharray="14 9"') + K("M90 330 C260 330 420 316 560 304 C660 294 708 270 714 214", DEMO, 3, ' stroke-dasharray="6 9" opacity=".6"');
    s += cone(500, 262, 0.8) + cone(540, 262, 0.8);
    s += learner(250, 322, 0.8, { student: { skin: SKIN2, bun: "#7A4A2A", glasses: true }, instructor: { hair: L, cap: STU } });
    s += R(-5, 334, 970, 66, KERB, 2);
    // the two logbooks and the study tray
    s += logbook(560, 392, 92, 44, DEMO, "HER BOOK", { titleFill: SHEET }) + logbook(782, 392, 92, 44, STU, "LESSON LOG");
    s += R(686, 352, 62, 40, WOOD, 2, 3);
    for (var i = 0; i < 4; i++) s += R(692 + i * 13, 360, 10, 12, DEMO, 1.2, 1) + R(692 + i * 13, 374, 10, 12, STU, 1.2, 1);
    s += K("M656 372 h24 M780 372 h-26", L, 2) + P("M680 368 l6 4 l-6 4 z", L, 0) + P("M754 368 l-6 4 l6 4 z", L, 0) + txt(717, 348, "one batch", { size: 12, anchor: "middle" });
    s += board(330, 6, 300, "HER OWN DRIVES", DEMO);
    s += label(40, 214, ["the instructor drives it herself:", "20 demonstrations"], [140, 286], { plate: true, size: 14 });
    s += label(776, 286, ["her drives end in the exam bay,", "so the critic learns where reward is"], [712, 226], { plate: true, size: 14, anchor: "end", from: [700, 274] });
    s += label(300, 362, ["half of every batch from her book,", "half from the lesson log (RLPD)"], null, { plate: true, size: 14 });
    return wrap("s4", "The lot again, with the instructor now at the wheel herself, driving a dashed blue route round the cones and into the chequered exam bay. In front, two logbooks: a blue one labelled her book (the demonstrations) and a yellow lesson log, with a study tray between them holding four blue pages and four yellow ones: half of every batch from each.", s);
  };

  scenes.s5 = function () {
    var s = R(-5, -5, 970, 230, "#E5F2FA", 0) + asphalt(150, 300, { seed: 9 }) + R(-5, 300, 970, 100, KERB, 2);
    s += cone(120, 236) + cone(160, 236);
    // a big cutaway of the car: two seats, two wheels, two brake pedals
    var c = "";
    c += P("M-200 40 Q-206 -40 -150 -52 L-110 -56 Q-80 -136 0 -140 L60 -140 Q120 -136 150 -60 L196 -50 Q222 -44 218 40 Z", CAR, 3);
    c += P("M-96 -60 Q-70 -124 -8 -128 L20 -128 L20 -60 Z", "#DCEFFA", 2.4) + P("M32 -60 L32 -128 L56 -128 Q104 -124 130 -60 Z", "#DCEFFA", 2.4);
    c += R(-150, -40, 340, 70, "#EADFCB", 2.4, 8);
    c += R(-70, -50, 46, 78, STEEL, 2.2, 10) + R(40, -50, 46, 78, STEEL, 2.2, 10);
    c += head(-46, -78, { hair: L, cap: STU, frown: true }) + head(64, -78, { skin: SKIN2, bun: "#7A4A2A", glasses: true });
    c += R(-62, -66, 32, 30, STU, 2, 8) + R(48, -66, 32, 30, INST, 2, 8);
    c += C(-10, -64, 15, "none", 3.5) + K("M-10 -64 l-14 4", L, 3) + K("M-36 -54 l24 -6", L, 5);
    c += C(100, -64, 15, "none", 3.5, ' stroke="' + INST + '"') + K("M76 -54 l20 -8", L, 5);
    c += R(-20, 8, 22, 9, L, 0, 2) + K("M-10 8 l-6 -24", L, 3) + R(98, 6, 26, 11, INST, 2, 2) + K("M110 6 l-8 -26", L, 3) + K("M70 12 l26 -2", L, 5);
    c += C(-120, 38, 26, L, 0) + C(-120, 38, 12, STEEL, 2) + C(150, 38, 26, L, 0) + C(150, 38, 12, STEEL, 2);
    c += R(-20, -170, 80, 22, STU, 2.2, 5) + txt(20, -154, "LEARNER", { size: 13, sign: true, anchor: "middle" });
    c += R(206, -20, 16, 20, SHEET, 1.8, 2) + K("M211 -16 v12 h7", INST, 3);
    s += G("translate(520 230) scale(0.92)", c);
    // the route on the lot behind: yellow (student), red (her), yellow again
    s += K("M40 196 h120 q30 0 40 -18", STU, 7) + K("M200 178 q16 -24 60 -26 h40", INST, 7) + K("M300 152 h50", STU, 7) + C(196, 182, 10, "none", 0, ' stroke="' + INST + '" stroke-width="2.5" stroke-dasharray="4 3"');
    // the intervention-rate sign
    s += R(770, 34, 170, 110, SHEET, 2.4, 6) + txt(855, 54, "her share of the moves", { size: 13, anchor: "middle" }) + K("M786 64 V126 H928", L, 1.8) + K("M790 72 C820 100, 850 116, 924 122", INST, 3, ' stroke-dasharray="6 4"') + txt(790, 140, "lesson 1", { size: 11 }) + txt(926, 140, "150", { size: 11, anchor: "end" });
    s += board(330, 6, 300, "DUAL CONTROLS", INST);
    s += label(40, 52, ["yellow: the student drives", "red: she takes over, 3 moves"], [210, 166], { plate: true, size: 14 });
    s += label(40, 352, ["the student's moves go in the lesson log;", "hers go in both logbooks"], null, { plate: true, size: 14 });
    s += label(760, 330, ["her own brake and wheel", "= the intervention"], [622, 214], { plate: true, size: 14, from: [760, 318] });
    s += label(855, 168, ["it should fall", "towards zero"], [850, 112], { plate: true, size: 14, anchor: "middle" });
    return wrap("s5", "A big cutaway of the learner car on the lot. The student sits at the wheel, frowning; the instructor sits beside it with her own red-rimmed wheel and her foot on a red second brake pedal. Behind, the route on the lot: yellow where the student drove, red where she took over for a few moves just before the cones, yellow again after. A sign charts her share of the moves, falling from lesson 1 to lesson 150.", s);
  };

  scenes.s6 = function () {
    var s = cloud(200, 50, 0.7) + cloud(700, 44, 0.6) + asphalt(150, 330, { seed: 11 }) + hedge(-10, 970, 150, 34);
    s += fence(20, 940, 176);
    s += R(-5, 330, 970, 70, KERB, 2) + hedge(-10, 970, 398, 28);
    // a bump against the fence instead of a crash
    s += topCar(150, 214, -60, 0.9) + K("M122 184 l-10 -6 M136 178 l-4 -10 M110 196 l-12 -1", L, 2.2) + label(198, 268, ["a bump, not a crash:", "the move is clipped"], [160, 196], { plate: true, size: 14 });
    // a crash into the cones, and the reset truck
    s += cone(470, 276) + cone(512, 280) + G("rotate(80 494 296)", cone(494, 296)) + topCar(436, 298, 20, 0.9) + towTruck(640, 318);
    s += P("M480 254 l6 -14 l4 12 l12 -6 l-6 12 l12 4 l-14 4 z", YEL, 1.8);
    s += lotClock(860, 326, 120);
    s += R(746, 210, 140, 46, SHEET, 2.4, 6) + txt(816, 230, "COUNT MINUTES,", { size: 13, sign: true, anchor: "middle" }) + txt(816, 248, "NOT LESSONS", { size: 13, sign: true, anchor: "middle" }) + K("M816 256 v20", L, 3);
    s += board(330, 6, 300, "THE REAL LOT", HEDGE);
    s += label(40, 64, ["the fence inside the hedge", "= workspace bounds"], [300, 168], { plate: true, size: 14 });
    s += label(560, 376, ["a crash costs a reset:", "45 seconds of lot time"], [610, 304], { plate: true, size: 14 });
    s += label(930, 70, ["the lot clock", "= the wall clock"], [866, 186], { plate: true, size: 14, anchor: "end" });
    return wrap("s6", "The lot with a low wooden fence just inside the hedge. One learner car has bumped the fence and stopped, unhurt: the move was clipped. Another has knocked over cones in the middle, and a yellow tow truck marked RESET is coming to fetch it. A clock on a pole and a sign read: count minutes, not lessons.", s);
  };

  scenes.cap = function () {
    var s = R(-5, 268, 970, 100, "#D9CBB4", 0) + R(-5, 263, 970, 7, WOOD, 2) + R(-5, 364, 970, 40, WOOD, 3);
    s += R(34, 48, 892, 180, WOOD, 2.5, 6) + R(44, 58, 872, 160, CORK, 1.5);
    var r = rnd(2), d = ""; for (var i = 0; i < 120; i++) d += "M" + n(50 + r() * 860) + " " + n(64 + r() * 148) + " h2 "; s += K(d, "#B98D5B", 2);
    function folder(x, title, sub, stamptext, art) {
      var f = R(x, 68, 268, 144, NOTE, 2.2, 4) + C(x + 134, 71, 5, BRICK, 1.8) + txt(x + 14, 89, title, { size: 15, sign: true }) + R(x + 12, 96, 244, 78, ASPH, 2) + art(x + 12, 96) + txt(x + 14, 197, sub, { size: 14 });
      return f + stamp(x + 212, 188, stamptext, BAD, -7);
    }
    s += folder(58, "CASE 1 &#183; NEXT DOOR", "parks in a staff bay", "PASS?!", function (x, y) {
      return R(x, y, 244, 22, KERB, 1.5) + R(x + 40, y + 2, 34, 16, "#3B3F45", 1.5) + R(x + 120, y + 2, 34, 16, YEL, 1.5) + K("M" + (x + 30) + " " + y + " v40 M" + (x + 84) + " " + y + " v40 M" + (x + 110) + " " + y + " v40 M" + (x + 164) + " " + y + " v40", SHEET, 3) + topCar(x + 57, y + 38, -90, 0.6) + photoCard(x + 190, y + 30, 30, PH_STAFF, {});
    });
    s += folder(346, "CASE 2 &#183; THE DAWDLER", "drives round and round", "ALPHA = 1", function (x, y) {
      return K("M" + (x + 40) + " " + (y + 40) + " a46 26 0 1 0 92 0 a46 26 0 1 0 -92 0", STU, 5) + topCar(x + 86, y + 14, 0, 0.5) + R(x + 168, y + 18, 66, 44, "#59606A", 1.8, 6) + G("translate(" + (x + 201) + " " + (y + 58) + ") scale(0.6) translate(" + -(x + 201) + " " + -(y + 58) + ")", dial(x + 201, y + 58, 44, 1, { lo: "", hi: "" }));
    });
    s += folder(634, "CASE 3 &#183; BACKSEAT", "she never lets go", "40%", function (x, y) {
      return K("M" + (x + 10) + " " + (y + 50) + " h40", STU, 5) + K("M" + (x + 50) + " " + (y + 50) + " h110 q30 0 40 -30", INST, 5) + topCar(x + 200, y + 18, -80, 0.5) + C(x + 200, y + 18, 20, "none", 0, ' stroke="' + INST + '" stroke-width="2.4"');
    });
    s += person(280, 340, { shirt: INST, skin: SKIN2, hair: "#7A4A2A", rh: [30, -24], mouth: "flat" }) + C(316, 296, 10, SKY, 2.5, ' fill-opacity=".5"') + K("M309 304 l-10 11", L, 4);
    s += person(680, 340, { shirt: EXR, skin: SKIN3, hair: L, lh: [-30, -42], mouth: "o" }) + clipboard(620, 244, 40, 36, { tick: true });
    s += R(150, 318, 660, 10, WOOD, 0) + R(160, 328, 640, 36, PLATE, 0) + txt(480, 352, "diagnose &#183; fix &#183; re-run eight students", { size: 18, sign: true, fill: PAPER, anchor: "middle" });
    s += board(290, 6, 380, "INSTRUCTORS' REVIEW BOARD", PLATE);
    s += R(14, 240, 170, 64, SHEET, 2, 6) + txt(24, 258, "the instructor", { size: 16 }) + txt(24, 276, "brings the cases", { size: 14 }) + txt(24, 293, "from the lot", { size: 14 });
    s += R(740, 240, 206, 64, SHEET, 2, 6) + txt(750, 258, "the examiner", { size: 16 }) + txt(750, 276, "checks her own", { size: 14 }) + txt(750, 293, "false passes", { size: 14 });
    return wrap("cap", "A cork board pins three case folders. Next door: a learner car parked in a staff bay, with a dashcam photo, stamped PASS with a question mark. The dawdler: a car driving round in a loop beside a dial turned all the way to dithers, stamped alpha equals 1. Backseat: a route that turns red early and stays red, stamped 40 percent. Below, the instructor and the examiner study them under a sign reading diagnose, fix, re-run eight students.", s);
  };

  /* ---------- icons: 64×64, flat fills, 3.5px line ---------- */
  var sk = ' stroke="' + L + '" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  function ic(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + inner + "</svg>"; }
  function f(c) { return ' fill="' + c + '"' + sk; }
  function ln(c, w) { return ' fill="none" stroke="' + (c || L) + '" stroke-width="' + (w || 3.5) + '" stroke-linecap="round" stroke-linejoin="round"'; }
  var icons = {
    plate: ic('<rect x="8" y="8" width="48" height="48" rx="6"' + f(SHEET) + '/><path d="M24 16 V46 H44"' + ln(PLATE, 8) + "/>"),
    car: ic('<path d="M6 44 V34 q0 -6 6 -7 l8 -1 l8 -12 h14 l8 12 l6 2 q4 1 4 6 v10 z"' + f(CAR) + '/><path d="M24 26 l6 -9 h6 v9 z M40 26 v-9 h2 l6 9 z"' + f(SKY) + '/><circle cx="18" cy="46" r="7"' + f(L) + '/><circle cx="48" cy="46" r="7"' + f(L) + '/><rect x="26" y="4" width="16" height="8" rx="2"' + f(STU) + "/>"),
    lot: ic('<rect x="4" y="12" width="56" height="44" rx="4"' + f(ASPH) + '/><path d="M16 12 v12 M28 12 v12 M40 12 v12 M52 12 v12"' + ln(SHEET, 3) + '/><rect x="29" y="14" width="10" height="8" fill="' + YEL + '"/><rect x="14" y="36" width="18" height="10" rx="3"' + f(CAR) + '/><path d="M44 44 l4 -10 l4 10 z"' + f(CONE) + "/>"),
    exambay: ic('<rect x="8" y="8" width="48" height="16"' + f(SHEET) + '/><rect x="10" y="10" width="11" height="6" fill="#2E2A26"/><rect x="32" y="10" width="11" height="6" fill="#2E2A26"/><rect x="21" y="16" width="11" height="6" fill="#2E2A26"/><rect x="43" y="16" width="11" height="6" fill="#2E2A26"/><path d="M14 28 V58 M50 28 V58"' + ln(L, 4) + '/><path d="M24 50 l6 6 l12 -14"' + ln("#3B7422", 5) + "/>"),
    examiner: ic('<rect x="14" y="6" width="36" height="52" rx="4"' + f(WOOD) + '/><rect x="19" y="13" width="26" height="40" rx="2"' + f(SHEET) + '/><rect x="25" y="2" width="14" height="8" rx="2"' + f(STEEL) + '/><path d="M24 28 l5 5 l11 -12"' + ln("#3B7422", 4) + '/><path d="M24 44 h16"' + ln("#B9A994", 3) + "/>"),
    logbook: ic('<rect x="6" y="12" width="52" height="40" rx="4"' + f(STU) + '/><rect x="11" y="17" width="42" height="30" rx="2"' + f(SHEET) + '/><path d="M32 16 V50"' + ln() + '/><path d="M15 25 h12 M15 32 h12 M15 39 h12 M37 25 h12 M37 32 h12 M37 39 h12"' + ln("#B9A994", 2.5) + "/>"),
    dial: ic('<path d="M6 44 a26 26 0 0 1 52 0 z"' + f(SHEET) + '/><path d="M32 44 L48 24"' + ln(BRICK, 4) + '/><circle cx="32" cy="44" r="4" fill="' + L + '"/><path d="M6 54 h52"' + ln() + "/>"),
    demo: ic('<rect x="6" y="12" width="52" height="40" rx="4"' + f(DEMO) + '/><rect x="11" y="17" width="42" height="30" rx="2"' + f(SHEET) + '/><path d="M14 40 C24 40 30 24 46 22"' + ln(DEMO, 4) + '/><path d="M42 18 l6 4 l-6 4"' + ln(DEMO, 3) + "/>"),
    pedals: ic('<rect x="6" y="40" width="22" height="10" rx="2"' + f(L) + '/><path d="M17 40 l-6 -26"' + ln(L, 4) + '/><rect x="36" y="40" width="22" height="10" rx="2"' + f(INST) + '/><path d="M47 40 l-6 -26"' + ln(INST, 4) + '/><path d="M4 58 h56"' + ln() + "/>"),
    hedge: ic('<rect x="4" y="18" width="56" height="20" rx="8"' + f(HEDGE) + '/><path d="M6 50 h52 M6 42 h52"' + ln(WOOD, 4) + '/><path d="M10 38 v18 M22 38 v18 M34 38 v18 M46 38 v18 M56 38 v18"' + ln(WOOD, 4) + "/>"),
    star: ic('<path d="M32 6 l7.2 16 16.8 1.6 -12.8 11.5 3.7 16.5 -14.9 -8.8 -14.9 8.8 3.7 -16.5 -12.8 -11.5 16.8 -1.6z"' + f(YEL) + "/>"),
    pencil: ic('<path d="M10 54 l5 -16 27 -27 11 11 -27 27 z"' + f(YEL) + '/><path d="M37 16 l11 11 M10 54 l5 -16 11 11 z"' + ln() + '/><path d="M42 11 l6 -6 11 11 -6 6"' + f(BRICK) + "/>")
  };

  var out = {};
  Object.keys(scenes).forEach(function (k) { out[k] = scenes[k](); });
  root.DC_ART = out; root.DC_ICONS = icons;
})(typeof window !== "undefined" ? window : this);
