import { useEffect, useState, type ReactElement } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { addCustomer, lookupPhone, type Customer } from "@/api"
import { isValidPhoneNumber, PHONE_VALIDATION_MESSAGE, sanitizePhoneInput } from "@/lib/phone"

export function AddCustomerDialog({
  onAdded,
  trigger,
}: {
  onAdded: (customer: Customer) => void
  trigger?: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [registeredName, setRegisteredName] = useState<string | null>(null)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [error, setError] = useState("")

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhoneTouched(true)
    setError("")
    if (phone && !isValidPhoneNumber(phone)) return

    try {
      const customer = await addCustomer(name, phone || null)
      onAdded(customer)
      setName("")
      setPhone("")
      setRegisteredName(null)
      setPhoneTouched(false)
      setOpen(false)
    } catch {
      setError("Could not add customer")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>Add Customer</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile (optional)</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              onBlur={() => setPhoneTouched(true)}
              aria-invalid={phoneTouched && phone.length > 0 && !isValidPhoneNumber(phone)}
            />
            {phoneTouched && phone.length > 0 && !isValidPhoneNumber(phone) && (
              <p className="text-sm text-red-600">{PHONE_VALIDATION_MESSAGE}</p>
            )}
            {registeredName && (
              <p className="text-sm text-emerald-700">This number is registered as {registeredName}</p>
            )}
            {checkingRegistration && (
              <p className="text-sm text-muted-foreground">Checking number...</p>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}