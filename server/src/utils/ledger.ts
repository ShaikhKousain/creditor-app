import type { Transaction } from "../entities/Transaction"

export function calculateBalance(transactions: Pick<Transaction, "amount" | "type">[]): number {
  // Goods taken (debit) increase the amount owed; payments received (credit) reduce it.
  const balanceInCents = transactions.reduce((balance, transaction) => {
    const amountInCents = Math.round(Number(transaction.amount) * 100)
    return transaction.type === "debit" ? balance + amountInCents : balance - amountInCents
  }, 0)

  return balanceInCents / 100
}