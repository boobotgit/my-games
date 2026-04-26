// Generates apple-touch-icon.png — 180x180 red background with white "B"
// Pure Node.js, no dependencies (uses built-in zlib for PNG compression)

const zlib = require('zlib');
const fs   = require('fs');

const W = 180, H = 180;

// ── CRC32 (required for valid PNG chunks) ────────────────────
const crcTable = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable.push(c >>> 0);
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = (crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeChunk(type, data) {
  const t    = Buffer.from(type);
  const body = Buffer.concat([t, data]);
  const len  = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc  = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// ── Pixel buffer (RGB) ───────────────────────────────────────
const px = Buffer.alloc(W * H * 3);

// Red background #CC0000
for (let i = 0; i < W * H; i++) { px[i*3]=204; px[i*3+1]=0; px[i*3+2]=0; }

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i]=r; px[i+1]=g; px[i+2]=b;
}
function fillRect(x1, y1, x2, y2, r, g, b) {
  for (let y = y1; y < y2; y++)
    for (let x = x1; x < x2; x++)
      setPixel(x, y, r, g, b);
}

// ── "B" bitmap definition ────────────────────────────────────
// 12 columns × 13 rows — scaled ×12 → 144×156px, centred in 180×180
// 1 = white (letter), 0 = transparent (shows red bg)
const bitmap = [
  //0 1 2 3 4 5 6 7 8 9 A B
  [1,1,1,1,1,1,1,0,0,0,0,0],  // row  0  top horizontal bar
  [1,1,0,0,0,0,1,1,0,0,0,0],  // row  1  upper bump — left walls
  [1,1,0,0,0,0,0,1,1,0,0,0],  // row  2  upper bump — curving right
  [1,1,0,0,0,0,0,1,1,0,0,0],  // row  3  upper bump — rightmost
  [1,1,0,0,0,0,0,1,1,0,0,0],  // row  4  upper bump — curving back
  [1,1,0,0,0,0,1,1,0,0,0,0],  // row  5  upper bump — left walls
  [1,1,1,1,1,1,1,1,0,0,0,0],  // row  6  middle horizontal bar (wider)
  [1,1,0,0,0,0,0,1,1,1,0,0],  // row  7  lower bump — left walls (wider)
  [1,1,0,0,0,0,0,0,0,1,1,0],  // row  8  lower bump — curving right
  [1,1,0,0,0,0,0,0,0,1,1,0],  // row  9  lower bump — rightmost
  [1,1,0,0,0,0,0,0,0,1,1,0],  // row 10  lower bump — curving back
  [1,1,0,0,0,0,0,1,1,1,0,0],  // row 11  lower bump — left walls
  [1,1,1,1,1,1,1,1,1,0,0,0],  // row 12  bottom horizontal bar (widest)
];

const COLS  = 12;
const ROWS  = bitmap.length;   // 13
const SCALE = 12;              // each cell → 12×12 px

const startX = Math.floor((W - COLS * SCALE) / 2);  // (180-144)/2 = 18
const startY = Math.floor((H - ROWS * SCALE) / 2);  // (180-156)/2 = 12

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    if (!bitmap[row][col]) continue;
    // Fill the scaled cell with white
    fillRect(
      startX + col * SCALE,
      startY + row * SCALE,
      startX + col * SCALE + SCALE,
      startY + row * SCALE + SCALE,
      255, 255, 255
    );
  }
}

// ── Encode as PNG ────────────────────────────────────────────
const lines = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  lines[y * (1 + W * 3)] = 0;          // filter byte = None
  px.copy(lines, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
}

const compressed = zlib.deflateSync(lines, { level: 9 });

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;

const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),  // PNG signature
  makeChunk('IHDR', ihdr),
  makeChunk('IDAT', compressed),
  makeChunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync('apple-touch-icon.png', png);
console.log('✅ apple-touch-icon.png written (' + png.length + ' bytes)');
