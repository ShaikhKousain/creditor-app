import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/AuthContext"
import { isValidPhoneNumber, PHONE_VALIDATION_MESSAGE, sanitizePhoneInput } from "@/lib/phone"


export function Login() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [phoneTouched, setPhoneTouched] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setPhoneTouched(true)
    if (!isValidPhoneNumber(phone)) return
    try {
      await login(phone, password)
      navigate("/")
    } catch {
      setError("Invalid phone number or password")
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 mt-12 space-y-4">
      <div className="flex flex-col items-center gap-2 pb-2">
        <img src="/icon.svg" alt="Creditor" className="size-14 rounded-xl" />
        <span className="text-sm font-semibold">Creditor</span>
      </div>
      <h1 className="text-2xl font-bold">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">Log in</Button>
      </form>
      <p className="text-sm text-muted-foreground">
        No account? <Link to="/register" className="underline">Register</Link>
      </p>
    </div>
  )
}