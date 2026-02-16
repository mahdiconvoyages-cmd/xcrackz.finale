/**
 * Image compression utility for web uploads
 * Reduces image file sizes before uploading to Supabase Storage
 * Typically achieves 70-90% size reduction on camera photos
 */

interface CompressOptions {
  /** Maximum width or height in pixels (default: 1600) */
  maxDimension?: number;
  /** JPEG quality 0-1 (default: 0.8) */
  quality?: number;
  /** Output format (default: 'image/jpeg') */
  outputType?: 'image/jpeg' | 'image/webp';
}

/**
 * Compress an image File using canvas
 * @param file - The original image File
 * @param options - Compression options
 * @returns A compressed File with the same name (extension changed to .jpg)
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxDimension = 1600,
    quality = 0.8,
    outputType = 'image/jpeg',
  } = options;

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip already small files (< 200KB)
  if (file.size < 200 * 1024) {
    return file;
  }

  // Skip SVGs and GIFs (don't compress)
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Draw on canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback to original
        return;
      }

      // Use high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Only use compressed version if it's actually smaller
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.${ext}`, {
            type: outputType,
            lastModified: Date.now(),
          });

          console.log(
            `📸 Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`
          );

          resolve(compressedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback to original on error
    };

    img.src = url;
  });
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}
