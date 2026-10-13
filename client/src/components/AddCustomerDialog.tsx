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

  useEffect(() => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 10) {
      setRegisteredName(null)
      setCheckingRegistration(false)
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(() => {
      setCheckingRegistration(true)
      lookupPhone(digits.slice(-10))
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
  }, [phone])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const customer = await addCustomer(name, phone)
    onAdded(customer)
    setName("")
    setPhone("")
    setRegisteredName(null)
    setOpen(false)
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
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {registeredName && (
              <p className="text-sm text-emerald-700">This number is registered as {registeredName}</p>
            )}
            {checkingRegistration && (
              <p className="text-sm text-muted-foreground">Checking number...</p>
            )}
          </div>
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}