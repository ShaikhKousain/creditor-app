const API_URL = "http://localhost:4000"

export type Customer = {
  id: number
  name: string
  phone: string
  balance: number
}

export type Transaction = {
  id: number
  amount: number
  type: "credit" | "debit"
  note: string
  createdAt: string
}

export async function getCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_URL}/customers`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to fetch customers")
  return res.json()
}

export async function addCustomer(name: string, phone: string): Promise<Customer> {
  const res = await fetch(`${API_URL}/customers`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone }),
  })
  if (!res.ok) throw new Error("Failed to add customer")
  return res.json()
}

export async function getCustomer(id: number): Promise<Customer & { transactions: Transaction[] }> {
  const res = await fetch(`${API_URL}/customers/${id}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to fetch customer")
  return res.json()
}

export async function addTransaction(
  customerId: number,
  amount: number,
  type: "credit" | "debit",
  note: string
): Promise<Transaction> {
  const res = await fetch(`${API_URL}/customers/${customerId}/transactions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, type, note }),
  })
  if (!res.ok) throw new Error("Failed to add transaction")
  return res.json()
}

export async function login(phone: string, password: string): Promise<{ id: string; phone: string; name: string }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  })
  if (!res.ok) throw new Error("Invalid credentials")
  const data = await res.json()
  return data.user
}

export async function register(phone: string, password: string, name: string): Promise<{ id: string; phone: string; name: string }> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, name }),
  })
  if (!res.ok) throw new Error("Registration failed")
  const data = await res.json()
  return data.user
}