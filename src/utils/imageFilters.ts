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

    // Calculs préliminaires pour les filtres avancés
    let totalLuminance = 0;
    let minLuminance = 255;
    let maxLuminance = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += luminance;
      if (luminance < minLuminance) minLuminance = luminance;
      if (luminance > maxLuminance) maxLuminance = luminance;
    }
    const avgLuminance = totalLuminance / (data.length / 4);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      switch (filterId) {
        case 'grayscale':
          data[i] = data[i + 1] = data[i + 2] = gray;
          break;

        case 'bw':
          // Seuil dynamique basé sur la luminosité moyenne
          data[i] = data[i + 1] = data[i + 2] = gray > avgLuminance ? 255 : 0;
          break;

        case 'magic':
          // Algorithme de "Magic Color" par étirement d'histogramme
          let magicVal = 255 * (gray - minLuminance) / (maxLuminance - minLuminance);
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
