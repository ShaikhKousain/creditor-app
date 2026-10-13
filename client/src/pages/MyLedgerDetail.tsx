import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useParams } from "react-router"
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react"
import {
  deleteMyLedgerTransaction,
  getMyLedger,
  getMyLedgers,
  updateMyLedgerTransaction,
  type MyLedger,
  type Transaction,
} from "@/api"
import { LedgerBubbles } from "@/components/LedgerBubbles"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function formatAmount(amount: number) {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

export function MyLedgerDetail() {
  const { id } = useParams()
  const location = useLocation()
  const customerId = Number(id)
  const returnState = location.state as { homeView?: "customer" | "my-ledger" } | null
  const [shopkeeperName, setShopkeeperName] = useState("")
  const [ledger, setLedger] = useState<MyLedger | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const transactionListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!id || !Number.isInteger(customerId) || customerId <= 0) {
      setError("Ledger not found")
      setLoading(false)
      return
    }

    Promise.all([getMyLedgers(), getMyLedger(customerId)])
      .then(([ledgers, detail]) => {
        if (cancelled) return
        const summary = ledgers.find((item) => item.id === customerId)
        if (!summary) {
          setError("Ledger not found")
          return
        }
        setShopkeeperName(summary.shopkeeperName)
        setLedger(detail)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your ledger")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [customerId, id])

  useEffect(() => {
    const transactionList = transactionListRef.current
    if (transactionList) transactionList.scrollTop = transactionList.scrollHeight
  }, [ledger?.transactions])

  async function refreshLedger() {
    const updatedLedger = await getMyLedger(customerId)
    setLedger(updatedLedger)
  }

  function openEdit(transaction: Transaction) {
    setActiveTransaction(transaction)
    setAmount(String(Number(transaction.amount)))
    setNote(transaction.note ?? "")
    setError("")
    setDialogOpen(true)
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return

    setSaving(true)
    setError("")
    try {
      if (!activeTransaction) return
      await updateMyLedgerTransaction(customerId, activeTransaction.id, {
        amount: numericAmount,
        note,
      })
      await refreshLedger()
      setDialogOpen(false)
      setActiveTransaction(null)
    } catch {
      setError("Could not save this entry")
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry() {
    if (!activeTransaction || !window.confirm("Delete this entry? This cannot be undone.")) return

    setSaving(true)
    setError("")
    try {
      await deleteMyLedgerTransaction(customerId, activeTransaction.id)
      await refreshLedger()
      setDialogOpen(false)
      setActiveTransaction(null)
    } catch {
      setError("Could not delete this entry")
    } finally {
      setSaving(false)
    }
  }

  const balance = Number(ledger?.balance ?? 0)
  const balanceLabel = balance > 0 ? "You owe" : balance < 0 ? "Advance" : "Settled"
  const balanceAmount = formatAmount(balance)
  const balanceClass = balance > 0
    ? "text-red-700"
    : balance < 0
      ? "text-emerald-700"
      : "text-foreground"

  return (
    <div className="mx-auto flex h-dvh min-h-[100svh] w-full max-w-[460px] flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b bg-white px-4 py-3">
        <Link
          to="/"
          state={{ homeView: returnState?.homeView ?? "customer" }}
          aria-label="Back to ledgers"
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-semibold text-teal-900">
          {shopkeeperName.trim().charAt(0).toLocaleUpperCase() || "?"}
        </span>
        <h1 className="min-w-0 truncate text-lg font-semibold">{shopkeeperName || "My ledger"}</h1>
      </header>

      <main ref={transactionListRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading entries...</p>
        ) : error && !ledger ? (
          <p role="alert" className="py-12 text-center text-sm text-red-700">{error}</p>
        ) : (
          <>
            {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
            <LedgerBubbles
              transactions={ledger?.transactions ?? []}
              labels={{ debit: "Took", credit: "Paid" }}
              balanceLabels={{ positive: "You owe", zero: "Settled", negative: "Advance" }}
              editable
              onTransactionClick={openEdit}
            />
          </>
        )}
      </main>

      <footer className="shrink-0 border-t bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="mb-3 flex min-h-11 items-center justify-between border-b border-dashed pb-3">
          <span className="text-sm font-medium text-muted-foreground">{balanceLabel}</span>
          <span className={`text-lg font-bold tabular-nums ${balanceClass}`}>{balanceAmount}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            render={<Link to={`/my-ledger/${customerId}/entry/paid`} state={{ homeView: returnState?.homeView ?? "customer" }} />}
            className="h-14 gap-2 bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowDown aria-hidden="true" className="size-5" />
            Paid
          </Button>
          <Button
            render={<Link to={`/my-ledger/${customerId}/entry/took`} state={{ homeView: returnState?.homeView ?? "customer" }} />}
            className="h-14 gap-2 bg-red-600 text-base font-semibold text-white hover:bg-red-700"
          >
            <ArrowUp aria-hidden="true" className="size-5" />
            Took
          </Button>
        </div>
      </footer>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setActiveTransaction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit entry
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEntry} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="my-ledger-amount">Amount</Label>
              <Input
                id="my-ledger-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="my-ledger-note">Note</Label>
              <Input
                id="my-ledger-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              {activeTransaction && (
                <Button type="button" variant="destructive" disabled={saving} onClick={deleteEntry}>
                  Delete
                </Button>
              )}
              <Button type="submit" className="min-h-11 flex-1" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}