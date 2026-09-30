import { Router } from "express"
import { AppDataSource } from "../data-source"
import { Customer } from "../entities/Customer"
import { Transaction } from "../entities/Transaction"
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware"

const router = Router()

router.use(authMiddleware)


router.get("/", async (req: AuthRequest, res) => {
  const customerRepo = AppDataSource.getRepository(Customer)

  const customers = await customerRepo.find({
    where: { user: { id: req.user!.userId } },
    relations: { transactions: true },
  })

  const result = customers.map((customer) => {
    const balance = customer.transactions.reduce((sum, t) => {
      return t.type === "credit" ? sum - Number(t.amount) : sum + Number(t.amount)
    }, 0)

    return { id: customer.id, name: customer.name, phone: customer.phone, balance }
  })

  res.json(result)
})

router.post("/", async (req: AuthRequest, res) => {
  const { name, phone } = req.body

  if (!name) {
    return res.status(400).json({ error: "name is required" })
  }

  const customerRepo = AppDataSource.getRepository(Customer)
  const customer = customerRepo.create({ name, phone, user: { id: req.user!.userId } })
  await customerRepo.save(customer)

  res.status(201).json(customer)
})

router.get("/:id", async (req: AuthRequest, res) => {
  const customerRepo = AppDataSource.getRepository(Customer)

  const customer = await customerRepo.findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
    relations: { transactions: true },
  })

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  const balance = customer.transactions.reduce((sum, t) => {
    return t.type === "credit" ? sum - Number(t.amount) : sum + Number(t.amount)
  }, 0)

  res.json({ ...customer, balance })
})

router.post("/:id/transactions", async (req: AuthRequest, res) => {
  const { amount, type, note } = req.body

  if (!amount || !type) {
    return res.status(400).json({ error: "amount and type are required" })
  }
  if (type !== "credit" && type !== "debit") {
    return res.status(400).json({ error: "type must be 'credit' or 'debit'" })
  }

  const customerRepo = AppDataSource.getRepository(Customer)
  const customer = await customerRepo.findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
  })

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const transaction = transactionRepo.create({ amount, type, note, customer })
  await transactionRepo.save(transaction)

  res.status(201).json(transaction)
})

export default router