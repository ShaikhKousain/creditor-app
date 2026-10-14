import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { lookupPhone, updateCustomer, type Customer } from "@/api"
import { isValidPhoneNumber, PHONE_VALIDATION_MESSAGE, sanitizePhoneInput } from "@/lib/phone"

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  onSaved,
}: {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(sanitizePhoneInput(customer.phone ?? ""))
  const [registeredName, setRegisteredName] = useState<string | null>(null)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const linked = Boolean(customer.linkedUserId)

  useEffect(() => {
    if (!open) return
    setName(customer.name)
    setPhone(sanitizePhoneInput(customer.phone ?? ""))
    setPhoneTouched(false)
    setError("")
  }, [customer, open])

  useEffect(() => {
    if (!open || !isValidPhoneNumber(phone)) {
      setRegisteredName(null)
      setCheckingRegistration(false)
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(() => {
      setCheckingRegistration(true)
      lookupPhone(phone)
        .then((result) => {
          if (!cancelled) setRegisteredName(result.registered ? result.name : null)
        })
        .catch(() => {
          if (!cancelled) setRegisteredName(null)
        })
        .finally(() => {
          if (!cancelled) setCheckingRegistration(false)
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [open, phone])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPhoneTouched(true)
    setError("")
    if (!name.trim() || (phone.length > 0 && !isValidPhoneNumber(phone))) return

    setSaving(true)
    try {
      await updateCustomer(customer.id, name, linked ? customer.phone : phone || null)
      onSaved()
      onOpenChange(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update customer")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-customer-name">Name</Label>
            <Input
              id="edit-customer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-phone">Mobile (optional)</Label>
            <Input
              id="edit-customer-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              disabled={linked}
              onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
              onBlur={() => setPhoneTouched(true)}
              aria-invalid={!linked && phoneTouched && phone.length > 0 && !isValidPhoneNumber(phone)}
            />
            {linked ? (
              <p className="text-sm text-muted-foreground">
                Linked to {registeredName ? `${registeredName}'s` : "this customer's"} account, so the number can't be changed
              </p>
            ) : phoneTouched && phone.length > 0 && !isValidPhoneNumber(phone) ? (
              <p className="text-sm text-red-600">{PHONE_VALIDATION_MESSAGE}</p>
            ) : registeredName ? (
              <p className="text-sm text-emerald-700">This number is registered as {registeredName}</p>
            ) : checkingRegistration ? (
              <p className="text-sm text-muted-foreground">Checking number...</p>
            ) : null}
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="min-h-11 w-full" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}