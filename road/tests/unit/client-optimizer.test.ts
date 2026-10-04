import { describe, it, expect } from "vitest";
import { compressImageForUpload, fileToDataUrl } from "@/lib/media/client-optimizer";

describe("Client Image Optimizer", () => {
  it("passes video files through without modification", async () => {
    const videoFile = new File([new ArrayBuffer(1024)], "traffic.mp4", {
      type: "video/mp4",
    });

    const result = await compressImageForUpload(videoFile);
    expect(result).toBe(videoFile);
    expect(result.name).toBe("traffic.mp4");
  });

  it("passes SVG and GIF images through without modification", async () => {
    const svgFile = new File(["<svg></svg>"], "icon.svg", {
      type: "image/svg+xml",
    });

    const result = await compressImageForUpload(svgFile);
    expect(result).toBe(svgFile);
  });

  it("safely falls back to original file if canvas context is unavailable", async () => {
    const originalImage = global.Image;
    try {
      // Mock Image to trigger immediate onload in jsdom
      // @ts-expect-error test mock
      global.Image = class {
        width = 2400;
        height = 1800;
        onload: () => void = () => {};
        onerror: (err: unknown) => void = () => {};
        set src(_val: string) {
          setTimeout(() => this.onload(), 5);
        }
      };

      const imageFile = new File([new ArrayBuffer(5000)], "pothole.jpg", {
        type: "image/jpeg",
      });

      const result = await compressImageForUpload(imageFile);
      expect(result).toBeDefined();
      // In jsdom without canvas 2D support, it safely falls back to original file
      expect(result.name).toBe("pothole.jpg");
    } finally {
      global.Image = originalImage;
    }
  });

  it("converts Blob to base64 Data URL using fileToDataUrl", async () => {
    const blob = new Blob(["hello-road"], { type: "text/plain" });
    const dataUrl = await fileToDataUrl(blob);
    expect(dataUrl).toContain("data:text/plain;base64,");
  });
});
