// Small helpers to set RGB colors on a jsPDF-like document without importing jsPDF types

export type RGB = [number, number, number];

type DocWithColors = {
  setFillColor: (r: number, g: number, b: number) => unknown;
  setTextColor: (r: number, g: number, b: number) => unknown;
  setDrawColor: (r: number, g: number, b: number) => unknown;
};

export const setFillRGB = (doc: DocWithColors, rgb: RGB): void => {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
};

export const setTextRGB = (doc: DocWithColors, rgb: RGB): void => {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
};

export const setDrawRGB = (doc: DocWithColors, rgb: RGB): void => {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
};
