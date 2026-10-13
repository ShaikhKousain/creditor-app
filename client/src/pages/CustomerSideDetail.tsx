import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { ArrowLeft } from "lucide-react"
import { getCustomerSide, getCustomers, type CustomerSideLedger, type Transaction } from "@/api"
import { LedgerBubbles } from "@/components/LedgerBubbles"

export function CustomerSideDetail() {
  const { id } = useParams()
  const [name, setName] = useState("")
  const [ledger, setLedger] = useState<Extract<CustomerSideLedger, { linked: true }> | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [linked, setLinked] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const customerId = Number(id)
    if (!id || !Number.isFinite(customerId)) {
      setError("Customer ledger not found")
      setLoading(false)
      return
    }

    Promise.all([getCustomers(), getCustomerSide(customerId)])
      .then(([customers, result]) => {
        if (cancelled) return
        const customer = customers.find((item) => item.id === customerId)
        if (!customer) {
          setError("Customer ledger not found")
          return
        }
        setName(customer.name)
        if (!result.linked) {
          setLinked(false)
          return
        }
        setLedger(result)
        setTransactions(result.transactions)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load customer entries")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const balance = ledger?.balance ?? 0
  const difference = ledger?.difference ?? 0
  const formattedBalance = `${balance < 0 ? "-" : ""}₹${Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

  return (
    <div className="mx-auto flex h-dvh min-h-[100svh] w-full max-w-[460px] flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b bg-white px-4 py-3">
        <Link
          to="/"
          aria-label="Back to ledger"
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-semibold text-teal-900">
          {name.trim().charAt(0).toLocaleUpperCase() || "?"}
        </span>
        <h1 className="min-w-0 truncate text-lg font-semibold">{name ? `${name}'s entries` : "Customer entries"}</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading entries...</p>
        ) : error ? (
          <p role="alert" className="py-12 text-center text-sm text-red-700">{error}</p>
        ) : !linked ? (
          <p className="py-12 text-center text-sm text-muted-foreground">This customer is not linked to an account.</p>
        ) : (
          <>
            <section className="mb-5 rounded-xl border bg-white p-4" aria-label="Customer balance comparison">
              <p className="text-sm font-medium text-muted-foreground">Their balance</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${balance > 0 ? "text-red-700" : balance < 0 ? "text-emerald-700" : "text-foreground"}`}>
                {formattedBalance}
              </p>
              <p className={`mt-2 text-sm font-medium ${difference === 0 ? "text-emerald-700" : "text-amber-800"}`}>
                {difference === 0
                  ? "Matches your ledger"
                  : `Differs from yours by ₹${Math.abs(difference).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              </p>
            </section>
            <LedgerBubbles
              transactions={transactions}
              labels={{ debit: "Took", credit: "Paid" }}
              editable={false}
            />
          </>
        )}
      </main>
    </div>
  )
}