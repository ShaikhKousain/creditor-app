import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router"
import { ArrowLeft, Phone, ArrowDown, ArrowUp } from "lucide-react"
import { getCustomer, type Customer, type Transaction } from "@/api"
import { Button } from "@/components/ui/button"
import { LedgerBubbles } from "@/components/LedgerBubbles"

export function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<(Customer & { transactions: Transaction[] }) | null>(null)
  const transactionListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) getCustomer(Number(id)).then(setCustomer)
  }, [id])

  useEffect(() => {
    const transactionList = transactionListRef.current
    if (transactionList) transactionList.scrollTop = transactionList.scrollHeight
  }, [customer?.transactions])

  if (!customer) return <div className="p-6">Loading...</div>

  const balance = Number(customer.balance)
  const initial = customer.name.trim().charAt(0).toLocaleUpperCase() || "?"

  return (
    <div className="mx-auto flex h-dvh min-h-[100svh] w-full max-w-[460px] flex-col overflow-hidden bg-background">
      <header className="z-10 flex shrink-0 items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          to="/"
          aria-label="Back to customers"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-900">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight">{customer.name}</h1>
          {customer.phone && <p className="truncate text-sm text-muted-foreground">{customer.phone}</p>}
        </div>
        {customer.phone ? (
          <a
            href={`tel:${customer.phone}`}
            aria-label={`Call ${customer.name}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Phone aria-hidden="true" className="size-5" />
          </a>
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-label="No phone number">
            <Phone aria-hidden="true" className="size-5" />
          </span>
        )}
      </header>

      <main ref={transactionListRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <LedgerBubbles
          transactions={customer.transactions}
          labels={{ debit: "Given", credit: "Received" }}
          editable
        />
      </main>

      <footer className="shrink-0 border-t bg-background px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="mb-3 flex min-h-11 items-center justify-between border-b border-dashed pb-3">
          {balance > 0 ? (
            <>
              <span className="text-sm font-medium text-muted-foreground">Balance Due</span>
              <span className="text-lg font-bold tabular-nums text-red-700">
                ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </>
          ) : balance < 0 ? (
            <>
              <span className="text-sm font-medium text-muted-foreground">Advance</span>
              <span className="text-lg font-bold tabular-nums text-emerald-700">
                ₹{Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-muted-foreground">Settled</span>
              <span className="text-lg font-bold tabular-nums">₹0</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            render={<Link to={`/customers/${customer.id}/entry/received`} />}
            className="h-14 w-full gap-2 bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowDown aria-hidden="true" className="size-5" />
            Received
          </Button>
          <Button
            render={<Link to={`/customers/${customer.id}/entry/given`} />}
            className="h-14 w-full gap-2 bg-red-600 text-base font-semibold text-white hover:bg-red-700"
          >
            <ArrowUp aria-hidden="true" className="size-5" />
            Given
          </Button>
        </div>
      </footer>
    </div>
  )
}