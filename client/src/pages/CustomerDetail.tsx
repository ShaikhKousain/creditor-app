import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, Link } from "react-router"
import { ArrowLeft, Phone, ArrowDown, ArrowUp, MoreVertical } from "lucide-react"
import { deleteTransaction, getCustomer, type Customer, type Transaction } from "@/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditCustomerDialog } from "@/components/EditCustomerDialog"
import { LedgerBubbles } from "@/components/LedgerBubbles"

export function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<(Customer & { transactions: Transaction[] }) | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false)
  const [editCustomerOpen, setEditCustomerOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [requestError, setRequestError] = useState("")
  const transactionListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) getCustomer(Number(id)).then(setCustomer)
  }, [id])

  useEffect(() => {
    const transactionList = transactionListRef.current
    if (transactionList) transactionList.scrollTop = transactionList.scrollHeight
  }, [customer?.transactions])

  async function refreshCustomer() {
    if (!id) return
    setCustomer(await getCustomer(Number(id)))
  }

  async function handleDeleteTransaction() {
    if (!customer || !selectedTransaction) return
    const amount = Number(selectedTransaction.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })
    if (!window.confirm(`Delete this ₹${amount} entry? This can't be undone.`)) return

    setDeleting(true)
    setRequestError("")
    try {
      await deleteTransaction(customer.id, selectedTransaction.id)
      setSelectedTransaction(null)
      await refreshCustomer()
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not delete transaction")
    } finally {
      setDeleting(false)
    }
  }

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
        ) : null}
        <button
          type="button"
          aria-label="Customer options"
          onClick={() => {
            setRequestError("")
            setCustomerMenuOpen(true)
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical aria-hidden="true" className="size-5" />
        </button>
      </header>

      <main ref={transactionListRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {requestError && <p role="alert" className="mb-3 text-sm text-red-700">{requestError}</p>}
        <LedgerBubbles
          transactions={customer.transactions}
          labels={{ debit: "Given", credit: "Received" }}
          editable
          onTransactionClick={(transaction) => {
            setRequestError("")
            setSelectedTransaction(transaction)
          }}
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

      <Dialog
        open={Boolean(selectedTransaction) || customerMenuOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTransaction(null)
            setCustomerMenuOpen(false)
            setRequestError("")
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="fixed inset-x-0 top-auto bottom-0 left-0 mx-auto w-full max-w-[460px] translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl p-5"
        >
          <DialogHeader>
            <DialogTitle>{customerMenuOpen ? "Customer options" : "Entry options"}</DialogTitle>
          </DialogHeader>
          {requestError && <p role="alert" className="text-sm text-red-700">{requestError}</p>}
          {customerMenuOpen ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-14 w-full justify-start text-base"
              onClick={() => {
                setCustomerMenuOpen(false)
                setEditCustomerOpen(true)
              }}
            >
              Edit customer
            </Button>
          ) : selectedTransaction ? (
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-14 w-full justify-start text-base"
                onClick={() => navigate(`/customers/${customer.id}/transactions/${selectedTransaction.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-14 w-full justify-start text-base"
                disabled={deleting}
                onClick={handleDeleteTransaction}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <EditCustomerDialog
        customer={customer}
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        onSaved={() => {
          refreshCustomer().catch((error) => {
            setRequestError(error instanceof Error ? error.message : "Could not refresh customer")
          })
        }}
      />
    </div>
  )
}