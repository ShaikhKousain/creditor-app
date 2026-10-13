export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "").slice(-10)
}