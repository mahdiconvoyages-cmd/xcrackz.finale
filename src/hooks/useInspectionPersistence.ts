import { useEffect, useCallback, useState } from 'react';

interface InspectionState {
  [key: string]: any;
}

interface PersistenceCallbacks {
  onSave?: (savedAt: Date) => void;
  onLoad?: (state: InspectionState) => void;
  onError?: (error: Error) => void;
}

export function useInspectionPersistence(
  missionId: string | undefined,
  type: 'departure' | 'arrival',
  state: InspectionState,
  callbacks?: PersistenceCallbacks
) {
  const storageKey = `inspection_${type}_${missionId}`;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const saveState = useCallback(() => {
    if (!missionId) return;

    setIsSaving(true);
    setSaveError(false);

    try {
      const now = new Date();
      const dataToSave = {
        ...state,
        savedAt: now.toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      setLastSaved(now);
      callbacks?.onSave?.(now);
    } catch (error) {
      console.error('Error saving inspection state:', error);
      setSaveError(true);
      callbacks?.onError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [missionId, storageKey, state, callbacks]);

  const loadState = useCallback((): InspectionState | null => {
    if (!missionId) return null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      const savedAt = new Date(parsed.savedAt);
      const now = new Date();
      const hoursSinceLastSave = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSave > 24) {
        localStorage.removeItem(storageKey);
        return null;
      }

      callbacks?.onLoad?.(parsed);
      setLastSaved(savedAt);
      return parsed;
    } catch (error) {
      console.error('Error loading inspection state:', error);
      callbacks?.onError?.(error as Error);
      return null;
    }
  }, [missionId, storageKey, callbacks]);

  const clearState = useCallback(() => {
    if (!missionId) return;
    localStorage.removeItem(storageKey);
    setLastSaved(null);
  }, [missionId, storageKey]);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      saveState();
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [saveState]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState]);

  return {
    saveState,
    loadState,
    clearState,
    lastSaved,
    isSaving,
    saveError,
  };
}
