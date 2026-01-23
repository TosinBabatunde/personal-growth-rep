const fs = require('fs');

const createSimplePNG = (width, height) => {
  const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const IHDR = Buffer.alloc(25);
  IHDR.writeUInt32BE(13, 0);
  IHDR.write('IHDR', 4);
  IHDR.writeUInt32BE(width, 8);
  IHDR.writeUInt32BE(height, 12);
  IHDR.writeUInt8(8, 16);
  IHDR.writeUInt8(2, 17);
  IHDR.writeUInt8(0, 18);
  IHDR.writeUInt8(0, 19);
  IHDR.writeUInt8(0, 20);
  
  const crc = require('zlib').crc32(IHDR.slice(4, 21));
  IHDR.writeUInt32BE(crc, 21);
  
  const IDAT = Buffer.from([0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33]);
  const IEND = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([PNG_HEADER, IHDR, IDAT, IEND]);
};

fs.writeFileSync('./assets/images/icon.png', createSimplePNG(512, 512));
fs.writeFileSync('./assets/images/favicon.png', createSimplePNG(48, 48));
console.log('PNG files created successfully');
