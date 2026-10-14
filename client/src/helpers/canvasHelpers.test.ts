import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { drawCell } from "./canvasHelpers";

let images: HTMLImageElement[];
const context = {
  drawImage: vi.fn(),
  globalAlpha: 1,
} as unknown as CanvasRenderingContext2D;

function createMockImage(): HTMLImageElement {
  const image = document.createElement("img");
  Object.defineProperty(image, "naturalWidth", { value: 100 });
  Object.defineProperty(image, "naturalHeight", { value: 100 });
  images.push(image);
  return image;
}

beforeEach(() => {
  images = [];
  vi.useFakeTimers();
  vi.stubGlobal("Image", createMockImage);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("reports one successful result after drawing a loaded cell", () => {
  const onResult = vi.fn();
  drawCell(0, 0, null, context, 0, "artwork.png", 50, onResult);

  images[0]?.dispatchEvent(new Event("load"));
  vi.runAllTimers();

  expect(onResult).toHaveBeenCalledOnce();
  expect(onResult).toHaveBeenCalledWith("loaded");
  expect(context.drawImage).toHaveBeenCalled();
});

test("reports one failed result when an image cannot load", () => {
  const onResult = vi.fn();
  drawCell(0, 0, null, context, 0, "broken.png", 50, onResult);

  images[0]?.dispatchEvent(new Event("error"));
  images[0]?.dispatchEvent(new Event("load"));
  vi.runAllTimers();

  expect(onResult).toHaveBeenCalledOnce();
  expect(onResult).toHaveBeenCalledWith("failed");
});

test("reports one failed result immediately for an empty image URL", () => {
  const onResult = vi.fn();
  drawCell(0, 0, null, context, 0, "", 50, onResult);

  expect(onResult).toHaveBeenCalledOnce();
  expect(onResult).toHaveBeenCalledWith("failed");
});

test("times out a stalled image and ignores a late load", () => {
  const onResult = vi.fn();
  drawCell(0, 0, null, context, 0, "stalled.png", 50, onResult);

  vi.advanceTimersByTime(15000);
  images[0]?.dispatchEvent(new Event("load"));
  vi.runAllTimers();

  expect(onResult).toHaveBeenCalledOnce();
  expect(onResult).toHaveBeenCalledWith("failed");
});
