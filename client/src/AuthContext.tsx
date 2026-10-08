import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { API_URL, login as apiLogin, register as apiRegister } from "@/api"

type User = { id: string; phone: string; name: string }

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in")
        return res.json()
      })
      .then((user) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(phone: string, password: string) {
    const user = await apiLogin(phone, password)
    setUser(user)
  }

  async function register(phone: string, password: string, name: string) {
    const user = await apiRegister(phone, password, name)
    setUser(user)
  }

  function logout() {
    setUser(null)
    fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}