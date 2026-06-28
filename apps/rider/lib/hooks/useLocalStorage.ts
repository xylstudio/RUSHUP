import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Hook for auto-saving form data
export function useAutoSave<T>(
  key: string,
  data: T,
  debounceMs: number = 1000
) {
  const [savedData, setSavedData] = useLocalStorage<T>(key, data);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (JSON.stringify(data) !== JSON.stringify(savedData)) {
        setIsSaving(true);
        setSavedData(data);
        setLastSaved(new Date());
        setIsSaving(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [data, savedData, setSavedData, debounceMs]);

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    setSavedData(data);
    setLastSaved(null);
  };

  return {
    savedData,
    lastSaved,
    isSaving,
    clearDraft,
    hasUnsavedChanges: JSON.stringify(data) !== JSON.stringify(savedData),
  };
}

// Hook for form draft management
export function useFormDraft<T>(
  formId: string,
  initialData: T,
  autoSave: boolean = true
) {
  const storageKey = `form-draft-${formId}`;
  const [data, setData] = useState<T>(initialData);
  
  const autoSaveResult = useAutoSave(storageKey, data, autoSave ? 1000 : 0);

  const resetToSaved = () => {
    setData(autoSaveResult.savedData);
  };

  const resetToInitial = () => {
    setData(initialData);
    autoSaveResult.clearDraft();
  };

  return {
    data,
    setData,
    ...autoSaveResult,
    resetToSaved,
    resetToInitial,
  };
} 