// Validation utilities for house forms
export interface ValidationError {
  field: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Validation state for preventing premature validation
export interface FieldValidationState {
  hasBeenTouched: boolean;
  hasBeenBlurred: boolean;
  isCurrentlyFocused: boolean;
  lastValidatedValue: string | number | null;
}

// Regex patterns
export const PATTERNS = {
  PHONE: /^(\+66|0)[1-9][0-9\-\s]{8,14}$/,
  ZIP_CODE: /^[1-9][0-9]{4}$/,
  HOUSE_CODE: /^[A-Z0-9]{6,10}$/,
  AREA_SIZE: /^[0-9]+(\.[0-9]+)?$/,
  PARKING_SPACES: /^[0-9]+$/,
};

// Enhanced validation rules with better UX
export const VALIDATION_RULES = {
  HOUSE_NAME: {
    minLength: 2,
    maxLength: 100,
    required: true,
  },
  ADDRESS: {
    minLength: 10,
    maxLength: 500,
    required: true,
  },
  ZIP_CODE: {
    pattern: PATTERNS.ZIP_CODE,
    required: true,
  },
  PHONE_NUMBER: {
    pattern: PATTERNS.PHONE,
    required: true,
  },
  CONTACT_PERSON: {
    minLength: 2,
    maxLength: 100,
    required: false,
  },
  SPECIAL_NOTES: {
    maxLength: 1000,
    required: false,
  },
  KEY_LOCATION: {
    maxLength: 200,
    required: false,
  },
  AREA_SIZE: {
    min: 1,
    max: 10000,
    required: false,
  },
  PARKING_SPACES: {
    min: 0,
    max: 50,
    required: false,
  },
};

// Professional validation messages
const VALIDATION_MESSAGES = {
  PHONE_EMPTY: 'กรุณาระบุหมายเลขโทรศัพท์',
  PHONE_INVALID: 'หมายเลขโทรศัพท์ไม่ถูกต้อง กรุณาระบุในรูปแบบ 08XXXXXXXX หรือ +668XXXXXXXX',
  PHONE_HINT: 'เช่น 081-234-5678 หรือ +66-81-234-5678',
  
  ZIP_EMPTY: 'กรุณาระบุรหัสไปรษณีย์',
  ZIP_INVALID: 'รหัสไปรษณีย์ไม่ถูกต้อง กรุณาระบุตัวเลข 5 หลัก',
  ZIP_HINT: 'เช่น 10110, 50000',
  
  HOUSE_NAME_EMPTY: 'กรุณาระบุชื่อบ้าน',
  HOUSE_NAME_TOO_SHORT: 'ชื่อบ้านสั้นเกินไป กรุณาระบุอย่างน้อย 2 ตัวอักษร',
  HOUSE_NAME_TOO_LONG: 'ชื่อบ้านยาวเกินไป กรุณาระบุไม่เกิน 100 ตัวอักษร',
  HOUSE_NAME_HINT: 'เช่น บ้านคุณแม่, คอนโดมิเนียม ABC',
  
  ADDRESS_EMPTY: 'กรุณาระบุที่อยู่',
  ADDRESS_TOO_SHORT: 'ที่อยู่ไม่ครบถ้วน กรุณาระบุอย่างน้อย 10 ตัวอักษร',
  ADDRESS_TOO_LONG: 'ที่อยู่ยาวเกินไป กรุณาระบุไม่เกิน 500 ตัวอักษร',
  ADDRESS_HINT: 'เช่น 123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพฯ',
};

// Enhanced validation functions with progressive validation
export function validatePhoneNumber(
  phone: string, 
  validationState?: FieldValidationState,
  options?: { isEdit?: boolean }
): ValidationError | null {
  const isEditMode = options?.isEdit || false;
  
  // ใน Edit Mode: ไม่ validate หากยังไม่เคย blur และยังไม่เคยมีข้อมูล
  if (validationState && !validationState.hasBeenBlurred && (!phone || phone.trim() === '')) {
    return null;
  }
  
  // แสดง error เฉพาะเมื่อ:
  // 1. ช่องว่าง หรือ
  // 2. เคยมีข้อมูลแล้วลบออก (lastValidatedValue มีค่าแต่ current value ว่าง)
  const currentValue = phone?.trim() || '';
  const hadPreviousValue = validationState?.lastValidatedValue && String(validationState.lastValidatedValue).trim() !== '';
  
  // ใน Edit Mode: ไม่แสดง error สำหรับช่องว่าง เว้นแต่จะเคยมีข้อมูลแล้วลบออก
  if (isEditMode) {
    // ถ้าช่องว่างแต่ไม่เคยมีข้อมูล = ไม่ต้องแสดง error
    if (!currentValue && !hadPreviousValue) {
      return null;
    }
    // แสดง error เมื่อเคยมีข้อมูลแล้วลบออก (ไม่ใช่ warning)
    if (!currentValue && hadPreviousValue) {
      return { 
        field: 'phoneNumber', 
        message: 'เบอร์โทรศัพท์จำเป็นต้องมี ไม่สามารถลบออกได้',
        type: 'error' as const
      };
    }
  } else {
    // Add Mode: validate ตามปกติ
    if (!currentValue && !hadPreviousValue && !validationState?.hasBeenBlurred) {
      return null;
    }
    
    if (!currentValue) {
      return { 
        field: 'phoneNumber', 
        message: VALIDATION_MESSAGES.PHONE_EMPTY,
        type: 'error'
      };
    }
  }
  
  // Check format เฉพาะเมื่อมีข้อมูล
  if (currentValue && !/^(\+66|0)[1-9][0-9]{8}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return { 
      field: 'phoneNumber', 
      message: VALIDATION_MESSAGES.PHONE_INVALID,
      type: 'error'
    };
  }
  
  return null;
}

export function validateZipCode(
  zipCode: string, 
  validationState?: FieldValidationState,
  options?: { isEdit?: boolean }
): ValidationError | null {
  const isEditMode = options?.isEdit || false;
  const currentValue = zipCode?.trim() || '';
  const hadPreviousValue = validationState?.lastValidatedValue && String(validationState.lastValidatedValue).trim() !== '';
  
  // ไม่แสดง error หากยังไม่เคย blur และไม่มีข้อมูล
  if (!currentValue && !hadPreviousValue && !validationState?.hasBeenBlurred) {
    return null;
  }
  
  // ใน Edit Mode: ผ่อนผันการ validate ช่องว่าง
  if (isEditMode) {
    if (!currentValue && !hadPreviousValue) {
      return null;
    }
    if (!currentValue && hadPreviousValue) {
      return { 
        field: 'zipCode', 
        message: 'หากต้องการลบรหัสไปรษณีย์ กรุณายืนยันในการบันทึก',
        type: 'warning' as const
      };
    }
  } else {
    if (!currentValue) {
      return { 
        field: 'zipCode', 
        message: VALIDATION_MESSAGES.ZIP_EMPTY,
        type: 'error'
      };
    }
  }
  
  if (currentValue && !PATTERNS.ZIP_CODE.test(currentValue)) {
    return { 
      field: 'zipCode', 
      message: VALIDATION_MESSAGES.ZIP_INVALID,
      type: 'error'
    };
  }
  
  return null;
}

export function validateAddress(
  address: string, 
  validationState?: FieldValidationState,
  options?: { isEdit?: boolean }
): ValidationError | null {
  const isEditMode = options?.isEdit || false;
  const currentValue = address?.trim() || '';
  const hadPreviousValue = validationState?.lastValidatedValue && String(validationState.lastValidatedValue).trim() !== '';
  
  // ไม่แสดง error หากยังไม่เคย blur และไม่มีข้อมูล
  if (!currentValue && !hadPreviousValue && !validationState?.hasBeenBlurred) {
    return null;
  }
  
  // ใน Edit Mode: ที่อยู่เป็น read-only ส่วนใหญ่ จึงไม่ validate
  if (isEditMode) {
    return null; // ไม่ validate address ในโหมดแก้ไข
  }
  
  if (!currentValue) {
    return { 
      field: 'address', 
      message: VALIDATION_MESSAGES.ADDRESS_EMPTY,
      type: 'error'
    };
  }
  
  if (currentValue.length < VALIDATION_RULES.ADDRESS.minLength) {
    return { 
      field: 'address', 
      message: VALIDATION_MESSAGES.ADDRESS_TOO_SHORT,
      type: 'error'
    };
  }
  
  if (currentValue.length > VALIDATION_RULES.ADDRESS.maxLength) {
    return { 
      field: 'address', 
      message: VALIDATION_MESSAGES.ADDRESS_TOO_LONG,
      type: 'error'
    };
  }
  
  return null;
}

export function validateHouseName(
  name: string, 
  validationState?: FieldValidationState,
  options?: { isEdit?: boolean }
): ValidationError | null {
  const isEditMode = options?.isEdit || false;
  const currentValue = name?.trim() || '';
  const hadPreviousValue = validationState?.lastValidatedValue && String(validationState.lastValidatedValue).trim() !== '';
  
  // ไม่แสดง error หากยังไม่เคย blur และไม่มีข้อมูล
  if (!currentValue && !hadPreviousValue && !validationState?.hasBeenBlurred) {
    return null;
  }
  
  // ใน Edit Mode: ผ่อนผันการ validate ช่องว่าง
  if (isEditMode) {
    if (!currentValue && !hadPreviousValue) {
      return null;
    }
    if (!currentValue && hadPreviousValue) {
      return { 
        field: 'houseName', 
        message: 'ชื่อบ้านจำเป็นต้องมี ไม่สามารถลบออกได้',
        type: 'error' as const
      };
    }
  } else {
    if (!currentValue) {
      return { 
        field: 'houseName', 
        message: VALIDATION_MESSAGES.HOUSE_NAME_EMPTY,
        type: 'error'
      };
    }
  }
  
  if (currentValue && currentValue.length < VALIDATION_RULES.HOUSE_NAME.minLength) {
    return { 
      field: 'houseName', 
      message: VALIDATION_MESSAGES.HOUSE_NAME_TOO_SHORT,
      type: 'error'
    };
  }
  
  if (currentValue && currentValue.length > VALIDATION_RULES.HOUSE_NAME.maxLength) {
    return { 
      field: 'houseName', 
      message: VALIDATION_MESSAGES.HOUSE_NAME_TOO_LONG,
      type: 'error'
    };
  }
  
  return null;
}

export function validateAreaSize(areaSize: number | string): ValidationError | null {
  if (areaSize === '' || areaSize === null || areaSize === undefined) {
    return null; // Optional field
  }
  const num = typeof areaSize === 'string' ? parseFloat(areaSize) : areaSize;
  if (isNaN(num)) {
    return { field: 'areaSize', message: 'ขนาดพื้นที่ต้องเป็นตัวเลข' };
  }
  if (num < VALIDATION_RULES.AREA_SIZE.min) {
    return { field: 'areaSize', message: `ขนาดพื้นที่ต้องไม่น้อยกว่า ${VALIDATION_RULES.AREA_SIZE.min} ตารางเมตร` };
  }
  if (num > VALIDATION_RULES.AREA_SIZE.max) {
    return { field: 'areaSize', message: `ขนาดพื้นที่ต้องไม่เกิน ${VALIDATION_RULES.AREA_SIZE.max} ตารางเมตร` };
  }
  return null;
}

export function validateParkingSpaces(spaces: number | string): ValidationError | null {
  if (spaces === '' || spaces === null || spaces === undefined) {
    return null; // Optional field
  }
  const num = typeof spaces === 'string' ? parseInt(spaces) : spaces;
  if (isNaN(num)) {
    return { field: 'parkingSpaces', message: 'จำนวนที่จอดรถต้องเป็นตัวเลข' };
  }
  if (num < VALIDATION_RULES.PARKING_SPACES.min) {
    return { field: 'parkingSpaces', message: `จำนวนที่จอดรถต้องไม่น้อยกว่า ${VALIDATION_RULES.PARKING_SPACES.min} คัน` };
  }
  if (num > VALIDATION_RULES.PARKING_SPACES.max) {
    return { field: 'parkingSpaces', message: `จำนวนที่จอดรถต้องไม่เกิน ${VALIDATION_RULES.PARKING_SPACES.max} คัน` };
  }
  return null;
}

export function validateSpecialNotes(notes: string): ValidationError | null {
  if (!notes) {
    return null; // Optional field
  }
  if (notes.length > VALIDATION_RULES.SPECIAL_NOTES.maxLength) {
    return { field: 'specialNotes', message: `หมายเหตุต้องไม่เกิน ${VALIDATION_RULES.SPECIAL_NOTES.maxLength} ตัวอักษร` };
  }
  return null;
}

export function validateKeyLocation(location: string): ValidationError | null {
  if (!location) {
    return null; // Optional field
  }
  if (location.length > VALIDATION_RULES.KEY_LOCATION.maxLength) {
    return { field: 'keyLocation', message: `จุดรับกุญแจต้องไม่เกิน ${VALIDATION_RULES.KEY_LOCATION.maxLength} ตัวอักษร` };
  }
  return null;
}

// Get helper text for fields
export function getFieldHelperText(fieldName: string): string {
  const helperTexts: { [key: string]: string } = {
    phoneNumber: VALIDATION_MESSAGES.PHONE_HINT,
    zipCode: VALIDATION_MESSAGES.ZIP_HINT,
    houseName: VALIDATION_MESSAGES.HOUSE_NAME_HINT,
    address: VALIDATION_MESSAGES.ADDRESS_HINT,
  };
  
  return helperTexts[fieldName] || '';
}

// Main validation function for house form
export function validateHouseForm(
  data: {
    houseName?: string;
    address?: string;
    zipCode?: string;
    phoneNumber?: string;
    contactPerson?: string;
    specialNotes?: string;
    keyLocation?: string;
    areaSize?: number | string;
    parkingSpaces?: number | string;
  },
  options?: { isEdit?: boolean; validationStates?: { [key: string]: FieldValidationState } }
): ValidationResult {
  const errors: ValidationError[] = [];
  const validationStates = options?.validationStates || {};
  const isEditMode = options?.isEdit || false;

  // Required fields
  const houseNameError = validateHouseName(data.houseName || '', validationStates.houseName, { isEdit: isEditMode });
  if (houseNameError) errors.push(houseNameError);

  // ใน Edit Mode: ไม่ validate address
  if (!isEditMode) {
    const addressError = validateAddress(data.address || '', validationStates.address, { isEdit: isEditMode });
    if (addressError) errors.push(addressError);
  }

  const zipCodeError = validateZipCode(data.zipCode || '', validationStates.zipCode, { isEdit: isEditMode });
  if (zipCodeError) errors.push(zipCodeError);

  const phoneError = validatePhoneNumber(data.phoneNumber || '', validationStates.phoneNumber, { isEdit: isEditMode });
  if (phoneError) errors.push(phoneError);

  // Optional fields
  const areaSizeError = validateAreaSize(data.areaSize ?? '');
  if (areaSizeError) errors.push(areaSizeError);

  const parkingError = validateParkingSpaces(data.parkingSpaces ?? '');
  if (parkingError) errors.push(parkingError);

  const specialNotesError = validateSpecialNotes(data.specialNotes || '');
  if (specialNotesError) errors.push(specialNotesError);

  const keyLocationError = validateKeyLocation(data.keyLocation || '');
  if (keyLocationError) errors.push(keyLocationError);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

// Format area size for display
export function formatAreaSize(area: number | string | undefined): string {
  if (!area) return '';
  const num = typeof area === 'string' ? parseFloat(area) : area;
  if (isNaN(num)) return '';
  return `${num.toLocaleString()} ตร.ม.`;
}

// Format parking spaces for display
export function formatParkingSpaces(spaces: number | string | undefined): string {
  if (!spaces) return 'ไม่มี';
  const num = typeof spaces === 'string' ? parseInt(spaces) : spaces;
  if (isNaN(num)) return 'ไม่มี';
  return `${num} คัน`;
}

// Real-time validation helpers
export function validateFieldRealTime(
  fieldName: string,
  value: string | number,
  options?: { isEdit?: boolean }
): ValidationError | null {
  switch (fieldName) {
    case 'houseName':
      return validateHouseName(value as string);
    case 'address':
      return options?.isEdit ? null : validateAddress(value as string);
    case 'zipCode':
      return validateZipCode(value as string);
    case 'phoneNumber':
      return validatePhoneNumber(value as string);
    case 'areaSize':
      return validateAreaSize(value);
    case 'parkingSpaces':
      return validateParkingSpaces(value);
    case 'specialNotes':
      return validateSpecialNotes(value as string);
    case 'keyLocation':
      return validateKeyLocation(value as string);
    default:
      return null;
  }
}

// Enhanced error messages with user-friendly suggestions
export function getFieldErrorMessage(error: ValidationError): string {
  const suggestions: { [key: string]: string } = {
    'houseName': 'ชื่อบ้านช่วยในการจดจำและค้นหา เช่น "บ้านคุณแม่" หรือ "บ้านพักตากอากาศ"',
    'address': 'ที่อยู่ที่ชัดเจนช่วยให้ทีมงานเดินทางไปถูกจุด',
    'zipCode': 'รหัสไปรษณีย์ใช้ในการหาสาขาที่ให้บริการ',
    'phoneNumber': 'เบอร์โทรศัพท์สำหรับติดต่อประสานงาน',
  };
  
  return error.message + (suggestions[error.field] ? ` (${suggestions[error.field]})` : '');
}

// Form validation state helper
export interface FormValidationState {
  [fieldName: string]: {
    error: ValidationError | null;
    touched: boolean;
    isValid: boolean;
  };
}

export function createInitialValidationState(fields: string[]): FormValidationState {
  const state: FormValidationState = {};
  fields.forEach(field => {
    state[field] = {
      error: null,
      touched: false,
      isValid: true,
    };
  });
  return state;
}

export function updateValidationState(
  state: FormValidationState,
  fieldName: string,
  value: string | number,
  options?: { isEdit?: boolean }
): FormValidationState {
  const error = validateFieldRealTime(fieldName, value, options);
  return {
    ...state,
    [fieldName]: {
      error,
      touched: true,
      isValid: !error,
    },
  };
}

// Form validation summary
export function getFormValidationSummary(state: FormValidationState): {
  isValid: boolean;
  errors: ValidationError[];
  touchedFields: string[];
} {
  const errors: ValidationError[] = [];
  const touchedFields: string[] = [];
  let isValid = true;

  Object.entries(state).forEach(([fieldName, fieldState]) => {
    if (fieldState.touched) {
      touchedFields.push(fieldName);
    }
    if (fieldState.error) {
      errors.push(fieldState.error);
      isValid = false;
    }
  });

  return { isValid, errors, touchedFields };
} 