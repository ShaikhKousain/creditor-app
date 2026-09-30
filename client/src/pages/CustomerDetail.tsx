import { useEffect, useState } from "react"
import { useParams, Link } from "react-router"
import { getCustomer, type Customer, type Transaction } from "@/api"
import { AddTransactionDialog } from "@/components/AddTransactionDialog"

export function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<(Customer & { transactions: Transaction[] }) | null>(null)

  useEffect(() => {
    if (id) getCustomer(Number(id)).then(setCustomer)
  }, [id])

  if (!customer) return <div className="p-6">Loading...</div>

  function handleAdded(_transaction: Transaction) {
    if (!id) return
    // Recompute balance and prepend the new transaction, without a full refetch
    getCustomer(Number(id)).then(setCustomer)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        &larr; Back to customers
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-muted-foreground">{customer.phone}</p>
        </div>
        <AddTransactionDialog customerId={customer.id} onAdded={handleAdded} />
      </div>
      <p className="text-3xl font-bold">₹{Math.abs(customer.balance).toFixed(2)}</p>

      <div className="space-y-2">
        <h2 className="font-semibold">Transactions</h2>
        {customer.transactions.map((t) => (
          <div key={t.id} className="flex justify-between border-b py-2">
            <div>
              <p>{t.note || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString()}
              </p>
            </div>
            <p className={t.type === "credit" ? "text-green-600" : "text-red-600"}>
              {t.type === "credit" ? "-" : "+"}₹{Number(t.amount).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}