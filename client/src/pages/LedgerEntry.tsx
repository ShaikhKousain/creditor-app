import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeft, Delete, FileText } from "lucide-react"
import { addMyLedgerTransaction, addTransaction, getCustomer, getMyLedger, getMyLedgers, type Transaction } from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type EntryRouteType = "received" | "given" | "paid" | "took"
type EntryMode = "shop" | "customer"

const keypadRows = [
  ["1", "2", "3", "×"],
  ["4", "5", "6", "−"],
  ["7", "8", "9", "+"],
  [".", "0", "backspace", "="],
]

function roundToPaise(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function formatLiteral(value: number) {
  return roundToPaise(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")
}

function evaluateExpression(expression: string): number | null {
  const trimmed = expression.replace(/[+−×]$/, "")
  if (!trimmed) return null

  const tokens = trimmed.match(/(?:\d+(?:\.\d{0,2})?|\.\d{1,2}|[+−×])/g)
  if (!tokens || tokens.join("") !== trimmed || /[+−×]$/.test(trimmed)) return null

  let total = 0
  let pendingSign = 1
  let product = Number(tokens[0])
  if (!Number.isFinite(product)) return null

  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index]
    const operand = Number(tokens[index + 1])
    if (!Number.isFinite(operand)) return null

    if (operator === "×") {
      product *= operand
    } else {
      total += pendingSign * product
      pendingSign = operator === "−" ? -1 : 1
      product = operand
    }
  }

  const result = roundToPaise(total + pendingSign * product)
  return Number.isFinite(result) ? result : null
}

function formatIndianAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function getBalanceText(balance: number, mode: EntryMode) {
  const amount = `₹${formatIndianAmount(Math.abs(balance))}`
  if (mode === "customer") {
    if (balance > 0) return `You owe ${amount}`
    if (balance < 0) return `Advance ${amount}`
    return "₹0 Settled"
  }
  if (balance > 0) return `${amount} Due`
  if (balance < 0) return `${amount} Advance`
  return "₹0 Settled"
}

function getTransactionType(type: EntryRouteType): Transaction["type"] {
  return type === "received" || type === "paid" ? "credit" : "debit"
}

function isEntryRouteType(type: string | undefined): type is EntryRouteType {
  return type === "received" || type === "given" || type === "paid" || type === "took"
}

export function LedgerEntry({ mode }: { mode: EntryMode }) {
  const { id, type: routeType } = useParams()
  const navigate = useNavigate()
  const ledgerId = Number(id)
  const noteInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [balance, setBalance] = useState(0)
  const [expression, setExpression] = useState("")
  const [note, setNote] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteFocused, setNoteFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const validType = isEntryRouteType(routeType)
  const transactionType = validType ? getTransactionType(routeType) : "debit"
  const isIncrease = transactionType === "debit"
  const actionLabel = mode === "customer"
    ? isIncrease ? "Took" : "Paid"
    : isIncrease ? "Given" : "Received"
  const accentClass = isIncrease ? "text-red-700" : "text-emerald-700"
  const underlineClass = isIncrease ? "bg-red-600" : "bg-emerald-600"
  const confirmClass = isIncrease
    ? "bg-red-600 text-white hover:bg-red-700"
    : "bg-emerald-600 text-white hover:bg-emerald-700"
  const evaluatedAmount = evaluateExpression(expression) ?? 0
  const backTo = mode === "customer" ? `/my-ledger/${ledgerId}` : `/customers/${ledgerId}`

  useEffect(() => {
    let cancelled = false
    if (!id || !Number.isInteger(ledgerId) || ledgerId <= 0 || !validType) {
      setError("Entry type or ledger is invalid")
      setLoading(false)
      return
    }

    const loadLedger = mode === "customer"
      ? Promise.all([getMyLedgers(), getMyLedger(ledgerId)])
          .then(([ledgers, detail]) => {
            const ledger = ledgers.find((item) => item.id === ledgerId)
            if (!ledger) throw new Error("Ledger not found")
            return { name: ledger.shopkeeperName, balance: detail.balance }
          })
      : getCustomer(ledgerId).then((customer) => ({ name: customer.name, balance: customer.balance }))

    loadLedger
      .then((details) => {
        if (cancelled) return
        setName(details.name)
        setBalance(Number(details.balance))
        setError("")
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this ledger")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, ledgerId, mode, validType])

  function appendDigit(digit: string) {
    setError("")
    setExpression((current) => {
      const parts = current.split(/[+−×]/)
      const currentNumber = parts[parts.length - 1] ?? ""
      const decimalPlaces = currentNumber.split(".")[1]?.length ?? 0
      if (decimalPlaces >= 2) return current
      if (currentNumber === "0" && digit !== ".") return current.slice(0, -1) + digit
      return current + digit
    })
  }

  function appendDecimal() {
    setError("")
    setExpression((current) => {
      const currentNumber = current.split(/[+−×]/).at(-1) ?? ""
      if (currentNumber.includes(".")) return current
      return current + (currentNumber ? "." : "0.")
    })
  }

  function appendOperator(operator: string) {
    setError("")
    setExpression((current) => {
      if (!current) return current
      if (/[+−×]$/.test(current)) return `${current.slice(0, -1)}${operator}`
      return `${current}${operator}`
    })
  }

  function handleKey(key: string) {
    if (/^\d$/.test(key)) {
      appendDigit(key)
    } else if (key === ".") {
      appendDecimal()
    } else if (key === "backspace") {
      setError("")
      setExpression((current) => current.slice(0, -1))
    } else if (key === "=") {
      const result = evaluateExpression(expression)
      if (result !== null) setExpression(formatLiteral(result))
    } else {
      appendOperator(key)
    }
  }

  async function confirmEntry() {
    if (!validType || evaluatedAmount <= 0 || saving || loading) return

    setSaving(true)
    setError("")
    try {
      if (mode === "customer") {
        await addMyLedgerTransaction(ledgerId, evaluatedAmount, transactionType, note)
      } else {
        await addTransaction(ledgerId, evaluatedAmount, transactionType, note)
      }
      navigate(-1)
    } catch {
      setError("Could not save entry. Your amount and note are still here.")
      setSaving(false)
    }
  }

  function openNotes() {
    setNotesOpen(true)
    window.requestAnimationFrame(() => noteInputRef.current?.focus())
  }

  return (
    <div className="mx-auto flex h-dvh min-h-[100svh] w-full max-w-[460px] flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
        <Link
          to={backTo}
          aria-label="Back to ledger"
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-semibold text-teal-900">
          {name.trim().charAt(0).toLocaleUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{name || (loading ? "Loading ledger..." : "Ledger entry")}</h1>
          <p className="truncate text-sm text-muted-foreground">{getBalanceText(balance, mode)}</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 pt-8">
        <p className={`mb-2 text-sm font-semibold ${accentClass}`}>{actionLabel}</p>
        <div className="flex min-h-[6.5rem] w-full max-w-sm items-center justify-center gap-2 border-b-[3px] px-2 pb-3" aria-live="polite">
          <span className={`text-3xl font-medium ${accentClass}`}>₹</span>
          <span className="max-w-full break-all text-center text-5xl font-semibold tabular-nums tracking-normal">
            {formatIndianAmount(evaluatedAmount)}
          </span>
          <span className={`h-12 w-0.5 shrink-0 animate-pulse ${underlineClass}`} aria-hidden="true" />
        </div>
        <p className="mt-2 min-h-5 text-sm text-muted-foreground" aria-live="polite">
          {/[+−×]/.test(expression) ? expression.replaceAll("−", "-") : ""}
        </p>

        <div className="mt-5 w-full max-w-sm">
          {notesOpen ? (
            <div className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2">
              <FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              <Input
                ref={noteInputRef}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
                placeholder="Add Notes"
                aria-label="Entry note"
                className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => {
                  setNotesOpen(false)
                  setNoteFocused(false)
                  noteInputRef.current?.blur()
                }}
                aria-label="Close notes"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openNotes}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border bg-white px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText aria-hidden="true" className="size-5" />
              {note || "Add Notes"}
            </button>
          )}
        </div>

        {error && <p role="alert" className="mt-4 w-full max-w-sm text-center text-sm text-red-700">{error}</p>}
      </main>

      <footer className="shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button
          type="button"
          disabled={evaluatedAmount <= 0 || saving || loading || !validType}
          onClick={confirmEntry}
          className={`mb-3 h-14 w-full text-base font-semibold disabled:bg-muted disabled:text-muted-foreground ${confirmClass}`}
        >
          {saving ? "Saving..." : `Confirm ${actionLabel}`}
        </Button>

        {!noteFocused && (
          <div className="grid grid-cols-4 gap-2" aria-label="Amount keypad">
            {keypadRows.flat().map((key) => {
              const isOperator = ["×", "−", "+"].includes(key)
              const isEquals = key === "="
              const label = key === "backspace" ? "Backspace" : key === "−" ? "Minus" : key === "×" ? "Multiply" : key
              return (
                <Button
                  key={key}
                  type="button"
                  variant={isEquals ? "secondary" : "outline"}
                  onClick={() => handleKey(key)}
                  aria-label={label}
                  className={`h-14 min-h-14 text-xl font-semibold tabular-nums ${isOperator ? accentClass : ""} ${isEquals ? "bg-teal-100 text-teal-950 hover:bg-teal-200" : "bg-white"}`}
                >
                  {key === "backspace" ? <Delete aria-hidden="true" className="size-5" /> : key}
                </Button>
              )
            })}
          </div>
        )}
      </footer>
    </div>
  )
}