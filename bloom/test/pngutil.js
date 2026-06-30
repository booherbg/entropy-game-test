'use strict';
// RGB → PNG via Node's zlib (no deps). Pairs with js/render-core.js to prove the world headless.
const zlib = require('zlib');
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const cd = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cd), 0);
  return Buffer.concat([len, cd, crc]);
}
function encodePNG(w, h, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const stride = 1 + w * 3, raw = Buffer.alloc(h * stride);
  const src = Buffer.from(rgb.buffer, rgb.byteOffset, rgb.length);
  for (let y = 0; y < h; y++) { raw[y * stride] = 0; src.copy(raw, y * stride + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// blit a smaller rgb into a wider strip buffer at pixel (ox,oy)
function blit(dst, dstW, src, srcW, srcH, ox, oy) {
  for (let y = 0; y < srcH; y++) { const so = y * srcW * 3, doo = ((oy + y) * dstW + ox) * 3; for (let x = 0; x < srcW * 3; x++) dst[doo + x] = src[so + x]; }
}
module.exports = { encodePNG, blit };
