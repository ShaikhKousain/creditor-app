import { ArrowDown, ArrowUp } from "lucide-react"
import type { Transaction } from "@/api"

type TransactionType = Transaction["type"]

type LedgerBubblesProps = {
  transactions: Transaction[]
  labels: Record<TransactionType, string>
  editable: boolean
  balanceLabels?: {
    positive: string
    zero: string
    negative: string
  }
  onTransactionClick?: (transaction: Transaction) => void
}

function formatAmount(amount: number) {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

function getRunningBalanceLabel(
  balance: number,
  labels: NonNullable<LedgerBubblesProps["balanceLabels"]>
) {
  if (balance < 0) return `${formatAmount(balance)} ${labels.negative}`
  if (balance === 0) return `${formatAmount(balance)} ${labels.zero}`
  return `${formatAmount(balance)} ${labels.positive}`
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function LedgerBubbles({
  transactions,
  labels,
  editable,
  balanceLabels = { positive: "Due", zero: "Due", negative: "Advance" },
  onTransactionClick,
}: LedgerBubblesProps) {
  const orderedTransactions = [...transactions].sort((a, b) => {
    const timeDifference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return timeDifference || a.id - b.id
  })

  let runningBalanceInPaise = 0
  let previousDateKey = ""

  if (orderedTransactions.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No transactions yet</p>
  }

  return (
    <ol className="space-y-4" data-editable={editable} aria-label="Transaction history">
      {orderedTransactions.map((transaction) => {
        const createdAt = new Date(transaction.createdAt)
        const dateKey = getDateKey(createdAt)
        const showDate = dateKey !== previousDateKey
        previousDateKey = dateKey

        const amount = Number(transaction.amount)
        const amountInPaise = Math.round(amount * 100)
        runningBalanceInPaise += transaction.type === "debit" ? amountInPaise : -amountInPaise
        const runningBalance = runningBalanceInPaise / 100
        const isGiven = transaction.type === "debit"
        const Icon = isGiven ? ArrowUp : ArrowDown
        const bubbleClassName = `w-fit max-w-[86%] min-w-[10rem] rounded-2xl border px-4 py-3 text-left shadow-sm ${
          isGiven
            ? "rounded-br-md border-orange-200 bg-orange-50 text-orange-950"
            : "rounded-bl-md border-emerald-200 bg-emerald-50 text-emerald-950"
        }`
        const bubbleContents = (
          <>
            <div className="flex items-center justify-between gap-6">
              <span className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                isGiven ? "text-orange-700" : "text-emerald-700"
              }`}>
                <Icon aria-hidden="true" className="size-4" />
                {labels[transaction.type]}
              </span>
              <time className="shrink-0 text-xs text-muted-foreground">
                {createdAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              </time>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatAmount(amount)}</p>
            {transaction.note && (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/80">
                {transaction.note}
              </p>
            )}
          </>
        )

        return (
          <li key={transaction.id} className="space-y-2">
            {showDate && (
              <div className="flex justify-center py-1">
                <time
                  dateTime={createdAt.toISOString().slice(0, 10)}
                  className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
                >
                  {createdAt.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>
            )}

            <div className={`flex ${isGiven ? "justify-end" : "justify-start"}`}>
              {editable && onTransactionClick ? (
                <button
                  type="button"
                  onClick={() => onTransactionClick(transaction)}
                  aria-label={`Edit ${labels[transaction.type]} entry for ${formatAmount(amount)}`}
                  className={`${bubbleClassName} cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {bubbleContents}
                </button>
              ) : (
                <article className={bubbleClassName} data-editable={editable}>
                  {bubbleContents}
                </article>
              )}
            </div>

            <p className={`text-xs text-muted-foreground ${isGiven ? "text-right" : "text-left"}`}>
              {getRunningBalanceLabel(runningBalance, balanceLabels)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}