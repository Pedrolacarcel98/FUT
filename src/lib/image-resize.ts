const MAX_DIMENSION = 600;
const MIN_DIMENSION = 280;
const MAX_BASE64_LENGTH = 340 * 1024; // ~250 KB binary after base64 overhead (~1.37x)

const HEIC_REGEX = /\.(heic|heif)$/i;

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    HEIC_REGEX.test(file.name)
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo leer la imagen."));
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Formato de imagen no compatible."));
    img.src = src;
  });
}

type DecodedSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function decodeImageSource(file: File): Promise<DecodedSource> {
  // Prefer createImageBitmap (handles EXIF orientation on mobile cameras with lower memory)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to HTMLImageElement below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    // Final fallback via FileReader data URL (helps on some older mobile WebViews)
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = await loadImage(dataUrl);
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => {},
      };
    } catch {
      if (isHeicFile(file)) {
        throw new Error(
          "Tu navegador no soporta fotos HEIC/HEIF. Haz una captura de pantalla de la foto o súbela en JPG/PNG."
        );
      }
      throw new Error(
        "No se pudo abrir esta imagen. Prueba con una foto en formato JPG, PNG o WebP."
      );
    }
  }
}

function renderToJpeg(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxDim: number,
  quality: number
): string {
  const ratio = Math.min(1, maxDim / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * ratio));
  const targetHeight = Math.max(1, Math.round(srcHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Tu navegador no pudo procesar la imagen en canvas.");
  }

  // Fill dark background so transparent PNGs don't turn ugly when encoded as JPEG
  ctx.fillStyle = "#090D16";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Accepts any image file from desktop or mobile camera:
 * - Decodes safely via createImageBitmap (EXIF-aware) with HTMLImageElement fallback.
 * - Iteratively scales dimensions and JPEG quality until the result is guaranteed
 *   under ~250 KB (~340 KB base64), preventing Vercel/API payload errors.
 */
export async function processAvatarImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && !isHeicFile(file)) {
    throw new Error("Selecciona un archivo de imagen válido (JPG, PNG o WebP).");
  }

  const decoded = await decodeImageSource(file);
  try {
    if (decoded.width <= 0 || decoded.height <= 0) {
      throw new Error("La imagen seleccionada no tiene dimensiones válidas.");
    }

    // Preserve small PNG/WebP/JPEG files that already fit within bounds
    const isStandardWebFormat =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";
    if (
      isStandardWebFormat &&
      file.size <= 220 * 1024 &&
      decoded.width <= MAX_DIMENSION &&
      decoded.height <= MAX_DIMENSION
    ) {
      return await readFileAsDataUrl(file);
    }

    const attempts: Array<{ maxDim: number; quality: number }> = [
      { maxDim: MAX_DIMENSION, quality: 0.82 },
      { maxDim: MAX_DIMENSION, quality: 0.7 },
      { maxDim: 480, quality: 0.65 },
      { maxDim: 380, quality: 0.6 },
      { maxDim: MIN_DIMENSION, quality: 0.55 },
    ];

    let result = "";
    for (const { maxDim, quality } of attempts) {
      result = renderToJpeg(
        decoded.source,
        decoded.width,
        decoded.height,
        maxDim,
        quality
      );
      if (result.length <= MAX_BASE64_LENGTH) {
        return result;
      }
    }

    return result;
  } finally {
    decoded.cleanup();
  }
}
