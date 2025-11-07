/**
 * Déclarations TypeScript pour expo-file-system v19
 * Corrige les types manquants
 */

declare module 'expo-file-system' {
  export const cacheDirectory: string | null;
  export const documentDirectory: string | null;
  
  export function downloadAsync(
    uri: string,
    fileUri: string,
    options?: object
  ): Promise<{ uri: string; status: number; headers: object; md5?: string }>;
  
  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: string; position?: number; length?: number }
  ): Promise<string>;
  
  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: string }
  ): Promise<void>;
  
  export function deleteAsync(
    fileUri: string,
    options?: { idempotent?: boolean }
  ): Promise<void>;
}
