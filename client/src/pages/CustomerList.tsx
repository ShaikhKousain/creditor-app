import { useEffect, useState } from "react"
import { getCustomers, type Customer } from "@/api"
import { CustomerCard } from "@/components/CustomerCard"
import { AddCustomerDialog } from "@/components/AddCustomerDialog"

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    getCustomers().then(setCustomers)
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <AddCustomerDialog onAdded={(c) => setCustomers([...customers, c])} />
      </div>
      <div className="grid gap-4">
        {customers.map((c) => (
          <CustomerCard key={c.id} customer={c} />
        ))}
      </div>
    </div>
  )
}