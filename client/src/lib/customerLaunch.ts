let customerLedgerAutoOpened = false

export function hasAutoOpenedCustomerLedger(): boolean {
  return customerLedgerAutoOpened
}

export function markCustomerLedgerAutoOpened() {
  customerLedgerAutoOpened = true
}

export function resetCustomerLedgerAutoOpen() {
  customerLedgerAutoOpened = false
}