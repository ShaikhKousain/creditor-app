import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/AuthContext"
import { isValidPhoneNumber, PHONE_VALIDATION_MESSAGE, sanitizePhoneInput } from "@/lib/phone"

export function Register() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setPhoneTouched(true)
    setPasswordTouched(true)
    if (!isValidPhoneNumber(phone) || password.length < 8) return
    try {
      await register(phone, password, name)
      navigate("/")
    } catch {
      setError("Could not create account — phone number may already be registered")
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 mt-12 space-y-4">
      <div className="flex flex-col items-center gap-2 pb-2">
        <img src="/icons.svg" alt="Creditor" className="size-14 rounded-xl" />
        <span className="text-sm font-semibold">Creditor</span>
      </div>
      <h1 className="text-2xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneTouched && !isValidPhoneNumber(phone)}
            required
          />
          {phoneTouched && !isValidPhoneNumber(phone) && (
            <p className="text-sm text-red-600">{PHONE_VALIDATION_MESSAGE}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            aria-invalid={passwordTouched && password.length < 8}
            required
          />
          {passwordTouched && password.length < 8 && (
            <p className="text-sm text-red-600">Password must be at least 8 characters</p>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">Create account</Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account? <a href="/login" className="underline">Log in</a>
      </p>
    </div>
  )
}