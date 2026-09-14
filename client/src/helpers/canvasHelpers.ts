type LegacyCanvasContext = CanvasRenderingContext2D & {
  webkitBackingStorePixelRatio?: number;
  mozBackingStorePixelRatio?: number;
  msBackingStorePixelRatio?: number;
  oBackingStorePixelRatio?: number;
  backingStorePixelRatio?: number;
};

export type ImageResultCallback = (status: boolean | Event | string) => void;

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D rendering is not supported");
  return context;
}

const getPixelRatio = (): number => {
  const context = getCanvasContext(
    document.createElement("canvas"),
  ) as LegacyCanvasContext;
  const dpr = window.devicePixelRatio || 1;
  const bsr =
    context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio ||
    1;
  return dpr / bsr;
};

export const createHiDPICanvas = (
  width = window.innerWidth,
  height = window.innerHeight,
  ratio = getPixelRatio(),
): HTMLCanvasElement => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = width * ratio;
  canvasElement.height = height * ratio;
  canvasElement.style.width = `${width}px`;
  canvasElement.style.height = `${height}px`;
  getCanvasContext(canvasElement).setTransform(ratio, 0, 0, ratio, 0, 0);
  return canvasElement;
};

export const initializeCanvasGradient = (
  context: CanvasRenderingContext2D,
  width = window.innerWidth,
  height = window.innerHeight,
  color1 = "#fff",
  color2 = "#000",
): void => {
  const gradient = context.createLinearGradient(width, 0, 0, 0);
  gradient.addColorStop(1, color1);
  gradient.addColorStop(0, color2);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
};

export const downloadCanvasImage = (
  canvas: HTMLCanvasElement,
  name: string,
): void => {
  const normalizedName = name.toLowerCase().replace(" ", "");
  const fileName = normalizedName
    ? `${normalizedName}-spotify-collection.png`
    : "spotify-collection.png";
  const data = canvas.toDataURL("image/png");
  const blob = dataURItoBlob(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

function dataURItoBlob(dataURI: string): Blob {
  const [metadata, encodedData] = dataURI.split(",");
  if (!metadata || !encodedData) throw new Error("Invalid canvas data URI");
  const byteString = atob(encodedData);
  const mimeString = metadata.split(":")[1]?.split(";")[0] || "image/png";
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: mimeString });
}

export const drawCell = (
  xCell: number,
  yCell: number,
  _color: string | null = "ff3",
  context: CanvasRenderingContext2D,
  padding: number,
  imgUrl: string,
  cellSize = 50,
  imgResultCallback?: ImageResultCallback,
): void => {
  const x = xCell * cellSize;
  const y = yCell * cellSize;
  const img = new Image();
  let opacity = 0;

  img.setAttribute("crossorigin", "");
  img.onerror = (error) => {
    console.error(error);
    imgResultCallback?.(error);
  };
  img.onload = () => {
    img.id = "canvas-image";
    document.body.appendChild(img);
    const tempImg = document.querySelector<HTMLImageElement>("#canvas-image");
    if (!tempImg) throw new Error("Loaded canvas image was not found");
    img.width = tempImg.width;
    img.height = tempImg.height;
    document.body.removeChild(tempImg);

    const imgSize = Math.min(img.width, img.height);
    const left = (img.width - imgSize) / 2;
    const top = (img.height - imgSize) / 2;
    if (imgUrl.length > 1) {
      const fadeIn = (): void => {
        setTimeout(() => {
          context.globalAlpha = opacity;
          context.drawImage(
            img,
            left,
            top,
            imgSize,
            imgSize,
            x + padding,
            y + padding,
            cellSize - padding * 2,
            cellSize - padding * 2,
          );
          opacity += 0.1;
          if (opacity < 1) requestAnimationFrame(fadeIn);
          else imgResultCallback?.(true);
        }, 40);
      };
      fadeIn();
    }
  };
  img.src = imgUrl;
};
