import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import {
  BookOpen,
  CircleUserRound,
  Eye,
  EyeOff,
  LogOut,
  Plus,
} from "lucide-react"
import { getCustomers, getMyLedgers, type Customer, type MyLedgerSummary } from "@/api"
import { useAuth } from "@/AuthContext"
import { AddCustomerDialog } from "@/components/AddCustomerDialog"
import { Button } from "@/components/ui/button"
import { hasAutoOpenedCustomerLedger, markCustomerLedgerAutoOpened } from "@/lib/customerLaunch"

type MainTab = "ledger" | "more"
type LedgerTab = "shop" | "customer" | "my-ledger"

function formatAmount(amount: number) {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

function formatEntry(customer: Customer) {
  const entry = customer.lastTransaction
  if (!entry) return "No entries yet"

  const typeLabel = entry.type === "debit" ? "Given" : "Received"
  const date = new Date(entry.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return `${formatAmount(Number(entry.amount))} ${typeLabel} on ${date}`
}

function CustomerAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-semibold text-teal-900">
      {name.trim().charAt(0).toLocaleUpperCase() || "?"}
    </span>
  )
}

function getPersonalBalanceLabel(balance: number) {
  if (balance < 0) return `${formatAmount(balance)} Advance`
  if (balance === 0) return "₹0 Settled"
  return `${formatAmount(balance)} You owe`
}

function formatPersonalLastEntry(ledger: MyLedgerSummary) {
  if (!ledger.lastTransaction) return "No entries yet"
  const type = ledger.lastTransaction.type === "debit" ? "Took" : "Paid"
  const date = new Date(ledger.lastTransaction.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return `${formatAmount(Number(ledger.lastTransaction.amount))} ${type} on ${date}`
}

function MyLedgerRows({
  ledgers,
  homeView,
}: {
  ledgers: MyLedgerSummary[]
  homeView: "customer" | "my-ledger"
}) {
  return (
    <ul className="divide-y rounded-xl border bg-white">
      {ledgers.map((ledger) => (
        <li key={ledger.id}>
          <Link
            to={`/my-ledger/${ledger.id}`}
            state={{ homeView }}
            className="flex min-h-[5.5rem] items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <CustomerAvatar name={ledger.shopkeeperName} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{ledger.shopkeeperName}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{formatPersonalLastEntry(ledger)}</span>
            </span>
            <span className={`shrink-0 text-right text-sm font-bold tabular-nums ${Number(ledger.balance) > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {getPersonalBalanceLabel(Number(ledger.balance))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function CustomerList() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const homeView = (location.state as { homeView?: string } | null)?.homeView
  const [customers, setCustomers] = useState<Customer[]>([])
  const [myLedgers, setMyLedgers] = useState<MyLedgerSummary[]>([])
  const [mainTab, setMainTab] = useState<MainTab>("ledger")
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>(homeView === "my-ledger" ? "my-ledger" : "shop")
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([getCustomers(), getMyLedgers()])
      .then(([customerResult, ledgerResult]) => {
        if (cancelled) return

        if (
          location.pathname === "/" &&
          !hasAutoOpenedCustomerLedger() &&
          customerResult.length === 0 &&
          ledgerResult.length === 1
        ) {
          markCustomerLedgerAutoOpened()
          navigate(`/my-ledger/${ledgerResult[0].id}`, {
            state: { homeView: "customer" },
          })
          return
        }

        setCustomers(customerResult)
        setMyLedgers(ledgerResult)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load ledger data")
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [location.pathname, navigate])

  const customerOnly = !loading && customers.length === 0 && myLedgers.length > 0
  const linkedCustomers = customers.filter((customer) => customer.linked)
  const netBalance = customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance)), 0)
  const totalIowe = myLedgers.reduce((sum, ledger) => sum + Number(ledger.balance), 0)

  function refreshCustomers() {
    Promise.all([getCustomers(), getMyLedgers()])
      .then(([customerResult, ledgerResult]) => {
        setCustomers(customerResult)
        setMyLedgers(ledgerResult)
        setError("")
      })
      .catch(() => setError("Could not refresh customers"))
  }

  return (
    <div className="relative mx-auto flex h-dvh min-h-[100svh] w-full max-w-[460px] flex-col overflow-hidden bg-background">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-5">
        {mainTab === "ledger" ? (
          <>
            <header className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Creditor</p>
                <h1 className="text-2xl font-bold">{customerOnly ? "Your ledgers" : "My ledger"}</h1>
              </div>
              <span className="flex size-10 items-center justify-center rounded-full border bg-white text-teal-900 shadow-sm">
                <BookOpen aria-hidden="true" className="size-5" />
              </span>
            </header>

            <section className="mb-5 rounded-2xl bg-teal-950 p-5 text-white shadow-sm" aria-label="Ledger balance summary">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-teal-100">
                    {customerOnly ? totalIowe > 0 ? "You owe" : totalIowe < 0 ? "Net advance" : "Settled" : "Net Balance"}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    {balanceVisible ? formatAmount(customerOnly ? totalIowe : netBalance) : "••••••"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBalanceVisible((visible) => !visible)}
                  aria-label={balanceVisible ? "Hide balance" : "Show balance"}
                  aria-pressed={!balanceVisible}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-teal-50 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {balanceVisible ? <Eye aria-hidden="true" className="size-5" /> : <EyeOff aria-hidden="true" className="size-5" />}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3 text-sm text-teal-100">
                <CircleUserRound aria-hidden="true" className="size-4" />
                <span>{customerOnly ? myLedgers.length : customers.length} {(customerOnly ? myLedgers.length : customers.length) === 1 ? "account" : "accounts"}</span>
              </div>
            </section>

            {!customerOnly && (
              <div
                className={`mb-3 grid rounded-xl bg-muted p-1 ${myLedgers.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}
                role="tablist"
                aria-label="Ledger type"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={ledgerTab === "shop"}
                  onClick={() => setLedgerTab("shop")}
                  className={`min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors ${ledgerTab === "shop" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Shop
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={ledgerTab === "customer"}
                  onClick={() => setLedgerTab("customer")}
                  className={`min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors ${ledgerTab === "customer" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Customer
                </button>
                {myLedgers.length > 0 && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={ledgerTab === "my-ledger"}
                    onClick={() => setLedgerTab("my-ledger")}
                    className={`min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors ${ledgerTab === "my-ledger" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    My Ledger
                  </button>
                )}
              </div>
            )}

            {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading ledger...</p>
            ) : customerOnly ? (
              <MyLedgerRows ledgers={myLedgers} homeView="customer" />
            ) : ledgerTab === "shop" ? (
              customers.length > 0 ? (
                <ul className="divide-y rounded-xl border bg-white">
                  {customers.map((customer) => {
                    const balance = Number(customer.balance)
                    return (
                      <li key={customer.id}>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="flex min-h-[5.5rem] items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <CustomerAvatar name={customer.name} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{customer.name}</span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">{formatEntry(customer)}</span>
                            {customer.balanceMismatch && (
                              <span className="mt-1.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Differs</span>
                            )}
                          </span>
                          <span className={`shrink-0 text-right text-sm font-bold tabular-nums ${balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                            {balance > 0 ? `${formatAmount(balance)} Due` : balance < 0 ? `${formatAmount(balance)} Advance` : "₹0"}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed px-5 py-10 text-center text-sm leading-relaxed text-muted-foreground">
                  Add your customers here, or ask a shop to add your phone number to see your ledger.
                </p>
              )
            ) : ledgerTab === "customer" ? (
              linkedCustomers.length > 0 ? (
                <ul className="divide-y rounded-xl border bg-white">
                  {linkedCustomers.map((customer) => (
                    <li key={customer.id}>
                      <Link
                        to={`/customers/${customer.id}/customer-side`}
                        className="flex min-h-[5.5rem] items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <CustomerAvatar name={customer.name} />
                        <span className="min-w-0 flex-1 truncate font-semibold">{customer.name}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${customer.balanceMismatch ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {customer.balanceMismatch ? "Differs" : "Matches"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed px-5 py-10 text-center text-sm leading-relaxed text-muted-foreground">
                  Customers who register with the phone number you saved will appear here.
                </p>
              )
            ) : (
              <MyLedgerRows ledgers={myLedgers} homeView="my-ledger" />
            )}
          </>
        ) : (
          <section>
            <header className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Account</p>
              <h1 className="text-2xl font-bold">More</h1>
            </header>
            <div className="flex items-center gap-4 rounded-xl border bg-white p-4">
              <CustomerAvatar name={user?.name ?? ""} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user?.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user?.phone}</p>
              </div>
            </div>
            <Button variant="outline" className="mt-5 h-12 w-full justify-start gap-3" onClick={logout}>
              <LogOut aria-hidden="true" className="size-4" />
              Log out
            </Button>
          </section>
        )}
      </main>

      {mainTab === "ledger" && !customerOnly && ledgerTab === "shop" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] z-10 mx-auto flex max-w-[460px] justify-end px-4">
          <div className="pointer-events-auto">
            <AddCustomerDialog
              onAdded={refreshCustomers}
              trigger={(
                <Button className="h-14 gap-2 rounded-full bg-teal-800 px-5 text-base font-semibold text-white shadow-lg hover:bg-teal-900">
                  <Plus aria-hidden="true" className="size-5" />
                  Add Customer
                </Button>
              )}
            />
          </div>
        </div>
      )}

      <nav className="z-20 grid shrink-0 grid-cols-2 border-t bg-white/95 px-5 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Main navigation">
        <button
          type="button"
          onClick={() => setMainTab("ledger")}
          aria-current={mainTab === "ledger" ? "page" : undefined}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-semibold ${mainTab === "ledger" ? "text-teal-900" : "text-muted-foreground"}`}
        >
          <BookOpen aria-hidden="true" className="size-5" />
          Ledger
        </button>
        <button
          type="button"
          onClick={() => setMainTab("more")}
          aria-current={mainTab === "more" ? "page" : undefined}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-semibold ${mainTab === "more" ? "text-teal-900" : "text-muted-foreground"}`}
        >
          <CircleUserRound aria-hidden="true" className="size-5" />
          More
        </button>
      </nav>
    </div>
  )
}
