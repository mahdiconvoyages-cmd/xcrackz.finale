// @ts-nocheck
/**
 * Polyfills pour atob/btoa dans React Native
 * (Nécessaire pour ScannerProScreen)
 */

declare global {
  function atob(data: string): string;
  function btoa(data: string): string;
}

export {};
