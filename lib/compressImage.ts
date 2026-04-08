/**
 * Compress and resize an image file in the browser before upload.
 * Keeps the longest edge at maxDimension, encodes as JPEG.
 * Reduces upload size + speeds up downstream IA call.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<File> {
  // Não tenta comprimir o que não é imagem
  if (!file.type.startsWith("image/")) return file;

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const longest = Math.max(width, height);

  if (longest > maxDimension) {
    const scale = maxDimension / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );

  if (!blob) return file;

  // Se ficou maior que o original, devolve o original mesmo
  if (blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.(heic|heif|png|webp)$/i, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}
