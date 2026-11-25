const MAX_DIMENSION = 600;
const MAX_BYTES = 350 * 1024; // ~350 KB target

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

/**
 * Accepts any image file from desktop or mobile camera:
 * - If it is already <= 350 KB and <= 600x600px, returns it as-is.
 * - Otherwise, scales it proportionally on an offscreen canvas and compresses it
 *   so it always stays lightweight and uploads reliably without hitting payload limits.
 */
export async function processAvatarImage(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const withinDimensions =
    img.naturalWidth <= MAX_DIMENSION && img.naturalHeight <= MAX_DIMENSION;
  if (file.size <= MAX_BYTES && withinDimensions) {
    return rawDataUrl;
  }

  const ratio = Math.min(
    1,
    MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight)
  );
  const targetWidth = Math.max(1, Math.round(img.naturalWidth * ratio));
  const targetHeight = Math.max(1, Math.round(img.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return rawDataUrl;

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const qualities = [0.82, 0.72, 0.6];
  let result = canvas.toDataURL("image/jpeg", qualities[0]);
  for (let i = 1; i < qualities.length; i++) {
    // Base64 overhead is ~1.37x binary size
    if (result.length <= MAX_BYTES * 1.37) break;
    result = canvas.toDataURL("image/jpeg", qualities[i]);
  }
  return result;
}
