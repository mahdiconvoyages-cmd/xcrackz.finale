// src/utils/imageFilters.ts

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

const loadImage = (uri: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = uri;
  });
};

export const applyFilter = async (uri: string, filterId: string): Promise<string> => {
  if (filterId === 'color') {
    return uri;
  }

  try {
    const image = await loadImage(uri);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let gray;

      switch (filterId) {
        case 'grayscale':
          gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = data[i + 1] = data[i + 2] = gray;
          break;

        case 'bw':
          gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = data[i + 1] = data[i + 2] = gray > 128 ? 255 : 0;
          break;

        case 'magic':
          // Contraste simple
          gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const contrast = 1.5;
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          let magicVal = factor * (gray - 128) + 128;
          magicVal = Math.max(0, Math.min(255, magicVal));
          data[i] = data[i + 1] = data[i + 2] = magicVal;
          break;
        
        default:
          break;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error('Error applying filter:', error);
    return uri; // Retourne l'URI original en cas d'erreur
  }
};
