function load(file: File): Promise<{ img: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, release: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, max: number, quality: number): string {
  const ratio = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  // JPEG has no transparency: without a white backdrop a transparent PNG would turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Reads an image file into two JPEGs: `full` (max 1280 px, uploaded to storage) and `thumb`
 * (max 240 px, kept in the row for lists; the database caps it at 80 000 characters).
 */
export async function readPhoto(file: File): Promise<{ full: string; thumb: string }> {
  const { img, release } = await load(file);
  try {
    return { full: draw(img, 1280, 0.8), thumb: draw(img, 240, 0.7) };
  } finally {
    release();
  }
}
