export const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:4000"

export type Customer = {
  id: number
  name: string
  phone: string | null
  balance: number
  linkedUserId?: string | null
  linked?: boolean
  balanceMismatch?: boolean
  lastTransaction?: {
    type: Transaction["type"]
    amount: number | string
    createdAt: string
  } | null
}

export type Transaction = {
  id: number
  amount: number | string
  type: "credit" | "debit"
  note: string
  createdAt: string
}

export type PhoneLookup = { registered: false } | { registered: true; name: string }

export type CustomerSideLedger =
  | { linked: false }
  | { linked: true; transactions: Transaction[]; balance: number; difference: number }

export type MyLedgerSummary = {
  id: number
  name: string
  shopkeeperName: string
  balance: number
  lastTransaction: Pick<Transaction, "type" | "amount" | "createdAt"> | null
}

export type MyLedger = {
  transactions: Transaction[]
  balance: number
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

export async function getCustomerSide(id: number): Promise<CustomerSideLedger> {
  const res = await fetch(`${API_URL}/customers/${id}/customer-side`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to fetch customer-side ledger")
  return res.json()
}

export async function lookupPhone(phone: string): Promise<PhoneLookup> {
  const res = await fetch(`${API_URL}/customers/lookup-phone?${new URLSearchParams({ phone })}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to look up phone number")
  return res.json()
}

export async function getMyLedgers(): Promise<MyLedgerSummary[]> {
  const res = await fetch(`${API_URL}/my-ledgers`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to fetch my ledgers")
  return res.json()
}

export async function getMyLedger(id: number): Promise<MyLedger> {
  const res = await fetch(`${API_URL}/my-ledgers/${id}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to fetch ledger entries")
  return res.json()
}

export async function addMyLedgerTransaction(
  ledgerId: number,
  amount: number,
  type: Transaction["type"],
  note: string
): Promise<Transaction> {
  const res = await fetch(`${API_URL}/my-ledgers/${ledgerId}/transactions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, type, note }),
  })
  if (!res.ok) throw new Error("Failed to add ledger entry")
  return res.json()
}

export async function updateMyLedgerTransaction(
  ledgerId: number,
  transactionId: number,
  changes: Partial<Pick<Transaction, "amount" | "type" | "note">>
): Promise<Transaction> {
  const res = await fetch(`${API_URL}/my-ledgers/${ledgerId}/transactions/${transactionId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  })
  if (!res.ok) throw new Error("Failed to update ledger entry")
  return res.json()
}

export async function deleteMyLedgerTransaction(ledgerId: number, transactionId: number): Promise<void> {
  const res = await fetch(`${API_URL}/my-ledgers/${ledgerId}/transactions/${transactionId}`, {
    method: "DELETE",
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to delete ledger entry")
}