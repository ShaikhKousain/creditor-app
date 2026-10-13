export const PHONE_VALIDATION_MESSAGE = "Enter a 10-digit mobile number"

export function sanitizePhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2)
  }
  return digits.slice(0, 10)
}

export function isValidPhoneNumber(value: string): boolean {
  return /^\d{10}$/.test(value)
}