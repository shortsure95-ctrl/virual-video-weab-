import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Viral Videos App Icon (Dark sleek background with amber/orange badge & play button)
function drawAppIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded squircle / gradient
  const cx = 0.5, cy = 0.5;
  const dist = Math.hypot(nx - cx, ny - cy);

  // Play button triangle in center
  // Center triangle: (0.42, 0.35) -> (0.42, 0.65) -> (0.68, 0.50)
  const inTriangle = nx >= 0.40 && nx <= 0.68 && 
    ny >= (0.32 + (nx - 0.40) * 0.64) && 
    ny <= (0.68 - (nx - 0.40) * 0.64);

  // Bottom badge for "VIDEOS": y in [0.72, 0.86], x in [0.15, 0.85]
  const inBadge = nx >= 0.16 && nx <= 0.84 && ny >= 0.72 && ny <= 0.86;

  // Accent ring
  const isRing = dist >= 0.42 && dist <= 0.46;

  if (inTriangle) {
    // Vibrant gold/orange play icon
    return [255, 153, 0, 255];
  } else if (inBadge) {
    // Orange badge
    return [255, 153, 0, 255];
  } else if (isRing) {
    // Subtle glow ring
    return [255, 42, 95, 200];
  } else {
    // Dark modern cinema black/charcoal gradient
    const grad = Math.min(255, Math.floor(10 + dist * 35));
    return [7, 9, 14, 255];
  }
}

// Maskable icon (full bleed background)
function drawMaskableIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5, cy = 0.5;
  const dist = Math.hypot(nx - cx, ny - cy);

  const inTriangle = nx >= 0.40 && nx <= 0.68 && 
    ny >= (0.32 + (nx - 0.40) * 0.64) && 
    ny <= (0.68 - (nx - 0.40) * 0.64);

  const inBadge = nx >= 0.20 && nx <= 0.80 && ny >= 0.72 && ny <= 0.84;

  if (inTriangle) {
    return [255, 153, 0, 255];
  } else if (inBadge) {
    return [255, 153, 0, 255];
  } else {
    return [7, 9, 14, 255];
  }
}

// Generate icons
fs.writeFileSync('public/icon-192.png', createPNG(192, 192, drawAppIcon));
fs.writeFileSync('public/icon-512.png', createPNG(512, 512, drawAppIcon));
fs.writeFileSync('public/icon-maskable-192.png', createPNG(192, 192, drawMaskableIcon));
fs.writeFileSync('public/icon-maskable-512.png', createPNG(512, 512, drawMaskableIcon));

console.log('Successfully generated PWA PNG icons!');
