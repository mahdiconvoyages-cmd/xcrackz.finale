export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateLicensePlate = (plate: string): boolean => {
  const frenchPlateRegex = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/;
  const cleaned = plate.toUpperCase().replace(/\s/g, '-');
  return frenchPlateRegex.test(cleaned);
};

export const validateVIN = (vin: string): boolean => {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin.toUpperCase());
};

export const validatePostalCode = (code: string): boolean => {
  const frenchPostalCodeRegex = /^\d{5}$/;
  return frenchPostalCodeRegex.test(code);
};

export const validateIBAN = (iban: string): boolean => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  const ibanRegex = /^FR\d{2}[A-Z0-9]{23}$/;
  return ibanRegex.test(cleaned);
};

export const validateRequired = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim().length > 0;
};

export const validateNumber = (value: string, min?: number, max?: number): boolean => {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDate = (date: string): boolean => {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

export const validateFutureDate = (date: string): boolean => {
  if (!validateDate(date)) return false;
  const dateObj = new Date(date);
  return dateObj > new Date();
};

export const validatePastDate = (date: string): boolean => {
  if (!validateDate(date)) return false;
  const dateObj = new Date(date);
  return dateObj < new Date();
};
