import { useState, useCallback } from 'react';
import { 
  ValidationError, 
  FormValidationState, 
  createInitialValidationState, 
  updateValidationState, 
  getFormValidationSummary,
  getFieldErrorMessage
} from '../validation';

interface UseFormValidationOptions {
  fields: string[];
  isEdit?: boolean;
}

interface UseFormValidationReturn {
  validationState: FormValidationState;
  validateField: (fieldName: string, value: string | number) => void;
  getFieldError: (fieldName: string) => string | null;
  isFieldValid: (fieldName: string) => boolean;
  isFormValid: () => boolean;
  getAllErrors: () => ValidationError[];
  resetValidation: () => void;
  markFieldTouched: (fieldName: string) => void;
  isFieldTouched: (fieldName: string) => boolean;
}

export function useFormValidation(options: UseFormValidationOptions): UseFormValidationReturn {
  const [validationState, setValidationState] = useState<FormValidationState>(
    createInitialValidationState(options.fields)
  );

  const validateField = useCallback((fieldName: string, value: string | number) => {
    setValidationState(prevState => 
      updateValidationState(prevState, fieldName, value, { isEdit: options.isEdit })
    );
  }, [options.isEdit]);

  const getFieldError = useCallback((fieldName: string): string | null => {
    const fieldState = validationState[fieldName];
    if (!fieldState || !fieldState.touched || !fieldState.error) {
      return null;
    }
    return getFieldErrorMessage(fieldState.error);
  }, [validationState]);

  const isFieldValid = useCallback((fieldName: string): boolean => {
    const fieldState = validationState[fieldName];
    return fieldState ? fieldState.isValid : true;
  }, [validationState]);

  const isFormValid = useCallback((): boolean => {
    const summary = getFormValidationSummary(validationState);
    return summary.isValid;
  }, [validationState]);

  const getAllErrors = useCallback((): ValidationError[] => {
    const summary = getFormValidationSummary(validationState);
    return summary.errors;
  }, [validationState]);

  const resetValidation = useCallback(() => {
    setValidationState(createInitialValidationState(options.fields));
  }, [options.fields]);

  const markFieldTouched = useCallback((fieldName: string) => {
    setValidationState(prevState => ({
      ...prevState,
      [fieldName]: {
        ...prevState[fieldName],
        touched: true,
      },
    }));
  }, []);

  const isFieldTouched = useCallback((fieldName: string): boolean => {
    const fieldState = validationState[fieldName];
    return fieldState ? fieldState.touched : false;
  }, [validationState]);

  return {
    validationState,
    validateField,
    getFieldError,
    isFieldValid,
    isFormValid,
    getAllErrors,
    resetValidation,
    markFieldTouched,
    isFieldTouched,
  };
} 