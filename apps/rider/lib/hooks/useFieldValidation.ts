import { useState, useCallback } from 'react';
import { FieldValidationState } from '../validation';

interface UseFieldValidationOptions {
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
}

interface UseFieldValidationReturn {
  validationState: FieldValidationState;
  markAsTouched: () => void;
  markAsBlurred: () => void;
  markAsFocused: () => void;
  markAsUnfocused: () => void;
  resetValidationState: () => void;
  shouldShowValidation: () => boolean;
}

export function useFieldValidation(
  fieldName: string,
  options: UseFieldValidationOptions = {}
): UseFieldValidationReturn {
  const {
    validateOnBlur = true,
    validateOnChange = false,
    debounceMs = 300
  } = options;

  const [validationState, setValidationState] = useState<FieldValidationState>({
    hasBeenTouched: false,
    hasBeenBlurred: false,
    isCurrentlyFocused: false,
    lastValidatedValue: null,
  });

  const markAsTouched = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      hasBeenTouched: true,
    }));
  }, []);

  const markAsBlurred = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      hasBeenBlurred: true,
      isCurrentlyFocused: false,
    }));
  }, []);

  const markAsFocused = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      isCurrentlyFocused: true,
      hasBeenTouched: true,
    }));
  }, []);

  const markAsUnfocused = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      isCurrentlyFocused: false,
    }));
  }, []);

  const resetValidationState = useCallback(() => {
    setValidationState({
      hasBeenTouched: false,
      hasBeenBlurred: false,
      isCurrentlyFocused: false,
      lastValidatedValue: null,
    });
  }, []);

  const shouldShowValidation = useCallback(() => {
    if (validateOnBlur && validationState.hasBeenBlurred) {
      return true;
    }
    if (validateOnChange && validationState.hasBeenTouched) {
      return true;
    }
    return false;
  }, [validateOnBlur, validateOnChange, validationState]);

  return {
    validationState,
    markAsTouched,
    markAsBlurred,
    markAsFocused,
    markAsUnfocused,
    resetValidationState,
    shouldShowValidation,
  };
}

// Hook for managing multiple field validation states
export function useFormFieldValidation(fieldNames: string[]) {
  const [fieldStates, setFieldStates] = useState<{ [key: string]: FieldValidationState }>(() => {
    const initialStates: { [key: string]: FieldValidationState } = {};
    fieldNames.forEach(fieldName => {
      initialStates[fieldName] = {
        hasBeenTouched: false,
        hasBeenBlurred: false,
        isCurrentlyFocused: false,
        lastValidatedValue: null,
      };
    });
    return initialStates;
  });

  const updateFieldState = useCallback((fieldName: string, updates: Partial<FieldValidationState>) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        ...updates,
      },
    }));
  }, []);

  const markFieldAsTouched = useCallback((fieldName: string) => {
    updateFieldState(fieldName, { hasBeenTouched: true });
  }, [updateFieldState]);

  const markFieldAsBlurred = useCallback((fieldName: string) => {
    updateFieldState(fieldName, { 
      hasBeenBlurred: true, 
      isCurrentlyFocused: false 
    });
  }, [updateFieldState]);

  const markFieldAsFocused = useCallback((fieldName: string) => {
    updateFieldState(fieldName, { 
      isCurrentlyFocused: true, 
      hasBeenTouched: true 
    });
  }, [updateFieldState]);

  const resetAllFieldStates = useCallback(() => {
    const resetStates: { [key: string]: FieldValidationState } = {};
    fieldNames.forEach(fieldName => {
      resetStates[fieldName] = {
        hasBeenTouched: false,
        hasBeenBlurred: false,
        isCurrentlyFocused: false,
        lastValidatedValue: null,
      };
    });
    setFieldStates(resetStates);
  }, [fieldNames]);

  const getFieldState = useCallback((fieldName: string): FieldValidationState => {
    return fieldStates[fieldName] || {
      hasBeenTouched: false,
      hasBeenBlurred: false,
      isCurrentlyFocused: false,
      lastValidatedValue: null,
    };
  }, [fieldStates]);

  const shouldShowFieldValidation = useCallback((fieldName: string): boolean => {
    const state = getFieldState(fieldName);
    return state.hasBeenBlurred || state.hasBeenTouched;
  }, [getFieldState]);

  return {
    fieldStates,
    markFieldAsTouched,
    markFieldAsBlurred,
    markFieldAsFocused,
    resetAllFieldStates,
    getFieldState,
    shouldShowFieldValidation,
  };
} 