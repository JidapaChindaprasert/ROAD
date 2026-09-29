import { describe, it, expect } from "vitest";
import { validateMediaBuffer, stripJpegExif } from "@/lib/media/sanitizer";

describe("Media Sanitizer & Signature Validation", () => {
  it("accepts valid JPEG magic bytes", () => {
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = validateMediaBuffer(validJpeg);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("accepts valid PNG magic bytes", () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const result = validateMediaBuffer(validPng);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe("image/png");
  });

  it("accepts valid WebP RIFF magic bytes", () => {
    // 0-3: 'RIFF', 4-7: length, 8-11: 'WEBP'
    const validWebp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const result = validateMediaBuffer(validWebp);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe("image/webp");
  });

  it("rejects malicious executables, scripts, or invalid signatures", () => {
    // Windows PE EXE (MZ header: 0x4D 0x5A)
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const result = validateMediaBuffer(exeBuffer);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Unsupported file signature");
  });

  it("rejects files exceeding 10MB limit", () => {
    // Buffer slightly larger than 10MB
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 10);
    const result = validateMediaBuffer(oversized);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceeds the 10MB limit");
  });

  it("strips EXIF APP1 metadata segment from JPEG streams", () => {
    // JPEG with SOI (FF D8) + APP1 EXIF (FF E1, length 8) + SOF (FF C0, length 4) + EOI (FF D9)
    const mockJpegWithExif = Buffer.from([
      0xff, 0xd8, // SOI
      0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66, // APP1 marker with "Exif" (length 6 includes length bytes)
      0xff, 0xd9, // EOI
    ]);

    const stripped = stripJpegExif(mockJpegWithExif);
    // The stripped buffer must still have SOI (FF D8) and EOI (FF D9) but NOT APP1 (FF E1)
    expect(stripped[0]).toBe(0xff);
    expect(stripped[1]).toBe(0xd8);
    expect(stripped.includes(Buffer.from([0xff, 0xe1]))).toBe(false);
  });
});
