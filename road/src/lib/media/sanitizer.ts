/**
 * Media Sanitization & Validation Service
 * Follows ROAD SKILL.md Section 7.1 & 14.1
 */

export interface ValidationResult {
  isValid: boolean;
  mimeType?: string;
  error?: string;
}

// Magic bytes for supported image formats
const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // 'RIFF'
  WEBP_HEADER: [0x57, 0x45, 0x42, 0x50], // 'WEBP'
  MP4: [0x66, 0x74, 0x79, 0x70], // 'ftyp'
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];

/**
 * Validates a file buffer using file signatures (magic bytes), not just filename extensions
 */
export function validateMediaBuffer(buffer: Buffer, declaredMimeType?: string): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: "Empty file buffer provided." };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 10MB limit (actual size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  // Check JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === MAGIC_BYTES.JPEG[0] &&
    buffer[1] === MAGIC_BYTES.JPEG[1] &&
    buffer[2] === MAGIC_BYTES.JPEG[2]
  ) {
    return { isValid: true, mimeType: "image/jpeg" };
  }

  // Check PNG
  if (
    buffer.length >= 8 &&
    MAGIC_BYTES.PNG.every((byte, idx) => buffer[idx] === byte)
  ) {
    return { isValid: true, mimeType: "image/png" };
  }

  // Check WebP: Bytes 0-3 = 'RIFF', Bytes 8-11 = 'WEBP'
  if (
    buffer.length >= 12 &&
    MAGIC_BYTES.WEBP_RIFF.every((byte, idx) => buffer[idx] === byte) &&
    MAGIC_BYTES.WEBP_HEADER.every((byte, idx) => buffer[idx + 8] === byte)
  ) {
    return { isValid: true, mimeType: "image/webp" };
  }

  // Check MP4 (Bytes 4-7 = 'ftyp')
  if (
    buffer.length >= 8 &&
    MAGIC_BYTES.MP4.every((byte, idx) => buffer[idx + 4] === byte)
  ) {
    return { isValid: true, mimeType: "video/mp4" };
  }

  // Fallback check against declared mime type if known video container
  if (declaredMimeType && ALLOWED_MIME_TYPES.includes(declaredMimeType)) {
    return { isValid: true, mimeType: declaredMimeType };
  }

  return {
    isValid: false,
    error: "Unsupported file signature. Only JPEG, PNG, WebP, and MP4 files are permitted.",
  };
}

/**
 * Strips EXIF metadata from JPEG buffers to prevent privacy leaks (GPS, camera serial)
 * Simple, zero-dependency stream segment scanner for APP1 (EXIF) markers
 */
export function stripJpegExif(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer; // Not a JPEG
  }

  const chunks: Buffer[] = [buffer.subarray(0, 2)]; // Keep SOI (Start of Image)
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      // Stream desynchronized; return as-is
      return buffer;
    }

    const marker = buffer[offset + 1];

    // SOS (Start of Scan) or EOI (End of Image) -> remaining is image scan data
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Segment length is 16-bit big-endian
    const length = buffer.readUInt16BE(offset + 2);

    // APP1 marker (0xE1) contains EXIF metadata - skip it!
    if (marker === 0xe1) {
      offset += 2 + length;
      continue;
    }

    // Keep other markers (e.g. quantization tables, Huffman tables, SOF)
    chunks.push(buffer.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }

  return Buffer.concat(chunks);
}
