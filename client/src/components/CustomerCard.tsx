import {Link} from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Customer } from "@/api"

export function CustomerCard({ customer }: { customer: Customer }) {
  const owesYou = customer.balance > 0
  const isSettled = customer.balance === 0

  return (
    <Link to={`/customers/${customer.id}`}>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{customer.name}</span>
          <Badge variant={isSettled ? "secondary" : owesYou ? "destructive" : "default"}>
            {isSettled ? "Settled" : owesYou ? "Owes you" : "You owe"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">₹{Math.abs(customer.balance).toFixed(2)}</p>
        {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
      </CardContent>
    </Card>
    </Link>
  )
}