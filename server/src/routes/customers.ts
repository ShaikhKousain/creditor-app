import { Router } from "express"
import { AppDataSource } from "../data-source"
import { Customer } from "../entities/Customer"
import { Transaction } from "../entities/Transaction"
import { User } from "../entities/User"
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware"
import { calculateBalance } from "../utils/ledger"
import { normalizePhone } from "../utils/phone"

const router = Router()
export const myLedgersRouter = Router()

router.use(authMiddleware)
myLedgersRouter.use(authMiddleware)

router.get("/lookup-phone", async (req: AuthRequest, res) => {
  const input = req.query.phone
  const phone = typeof input === "string" ? normalizePhone(input) : ""

  if (!phone) {
    return res.json({ registered: false })
  }

  const user = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .select(["user.id", "user.name", "user.phone"])
    .where("RIGHT(regexp_replace(user.phone, '[^0-9]', '', 'g'), 10) = :phone", { phone })
    .andWhere("user.id != :callerId", { callerId: req.user!.userId })
    .getOne()

  return res.json(user ? { registered: true, name: user.name } : { registered: false })
})

myLedgersRouter.get("/my-ledgers", async (req: AuthRequest, res) => {
  const customers = await AppDataSource.getRepository(Customer).find({
    where: { linkedUserId: req.user!.userId },
    relations: { user: true, transactions: true },
  })

  return res.json(customers.map((customer) => {
    const customerTransactions = customer.transactions.filter((transaction) => transaction.side === "customer")
    const lastTransaction = [...customerTransactions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

    return {
      id: customer.id,
      name: customer.name,
      shopkeeperName: customer.user.name,
      balance: calculateBalance(customerTransactions),
      lastTransaction: lastTransaction
        ? { type: lastTransaction.type, amount: lastTransaction.amount, createdAt: lastTransaction.createdAt }
        : null,
    }
  }))
})

myLedgersRouter.get("/my-ledgers/:id", async (req: AuthRequest, res) => {
  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), linkedUserId: req.user!.userId },
    relations: { transactions: true },
  })

  if (!customer) {
    return res.status(404).json({ error: "Ledger not found" })
  }

  const transactions = customer.transactions.filter((transaction) => transaction.side === "customer")
  return res.json({ transactions, balance: calculateBalance(transactions) })
})

myLedgersRouter.post("/my-ledgers/:id/transactions", async (req: AuthRequest, res) => {
  const { amount, type, note } = req.body

  if (!amount || !type) {
    return res.status(400).json({ error: "amount and type are required" })
  }
  if (type !== "credit" && type !== "debit") {
    return res.status(400).json({ error: "type must be 'credit' or 'debit'" })
  }

  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), linkedUserId: req.user!.userId },
  })
  if (!customer) {
    return res.status(404).json({ error: "Ledger not found" })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const transaction = transactionRepo.create({ amount, type, note, side: "customer", customer })
  await transactionRepo.save(transaction)
  return res.status(201).json(transaction)
})

myLedgersRouter.patch("/my-ledgers/:id/transactions/:txId", async (req: AuthRequest, res) => {
  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), linkedUserId: req.user!.userId },
  })
  if (!customer) {
    return res.status(404).json({ error: "Ledger not found" })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const transaction = await transactionRepo.findOne({
    where: {
      id: Number(req.params.txId),
      customer: { id: customer.id },
      side: "customer",
    },
  })
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" })
  }

  const { amount, type, note } = req.body
  if (amount !== undefined) transaction.amount = amount
  if (type !== undefined) {
    if (type !== "credit" && type !== "debit") {
      return res.status(400).json({ error: "type must be 'credit' or 'debit'" })
    }
    transaction.type = type
  }
  if (note !== undefined) transaction.note = note

  await transactionRepo.save(transaction)
  return res.json(transaction)
})

myLedgersRouter.delete("/my-ledgers/:id/transactions/:txId", async (req: AuthRequest, res) => {
  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), linkedUserId: req.user!.userId },
  })
  if (!customer) {
    return res.status(404).json({ error: "Ledger not found" })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const transaction = await transactionRepo.findOne({
    where: {
      id: Number(req.params.txId),
      customer: { id: customer.id },
      side: "customer",
    },
  })
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" })
  }

  await transactionRepo.remove(transaction)
  return res.json({ message: "Transaction deleted" })
})

router.get("/", async (req: AuthRequest, res) => {
  const customers = await AppDataSource.getRepository(Customer).find({
    where: { user: { id: req.user!.userId } },
    relations: { transactions: true },
  })

  const result = customers.map((customer) => {
    const shopTransactions = customer.transactions.filter((transaction) => transaction.side === "shop")
    const customerTransactions = customer.transactions.filter((transaction) => transaction.side === "customer")
    const lastTransaction = [...shopTransactions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    const balance = calculateBalance(shopTransactions)

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      balance,
      lastTransaction: lastTransaction
        ? { type: lastTransaction.type, amount: lastTransaction.amount, createdAt: lastTransaction.createdAt }
        : null,
      linked: customer.linkedUserId !== null,
      balanceMismatch: customer.linkedUserId !== null && calculateBalance(customerTransactions) !== balance,
    }
  })

  return res.json(result)
})

router.post("/", async (req: AuthRequest, res) => {
  const { name, phone } = req.body

  if (!name) {
    return res.status(400).json({ error: "name is required" })
  }

  const hasPhone = phone !== undefined && phone !== null && phone !== ""
  if (hasPhone && (typeof phone !== "string" || !/^\d{10}$/.test(phone))) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits" })
  }

  const normalizedPhone = hasPhone ? normalizePhone(phone) : ""
  const linkedUser = normalizedPhone
    ? await AppDataSource.getRepository(User)
        .createQueryBuilder("user")
        .where("RIGHT(regexp_replace(user.phone, '[^0-9]', '', 'g'), 10) = :phone", { phone: normalizedPhone })
        .andWhere("user.id != :callerId", { callerId: req.user!.userId })
        .getOne()
    : null

  const customerRepo = AppDataSource.getRepository(Customer)
  const customer = customerRepo.create({
    name,
    phone: normalizedPhone || null,
    linkedUserId: linkedUser?.id ?? null,
    user: { id: req.user!.userId },
  })
  await customerRepo.save(customer)

  return res.status(201).json(customer)
})

router.patch("/:id", async (req: AuthRequest, res) => {
  const customerRepo = AppDataSource.getRepository(Customer)
  const customer = await customerRepo.findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
  })
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  const { name, phone } = req.body
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" })
  }
  if (phone !== undefined && phone !== null && phone !== "" && (typeof phone !== "string" || !/^\d{10}$/.test(phone))) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits" })
  }
  if (customer.linkedUserId && phone !== undefined) {
    const requestedPhone = phone === null || phone === "" ? null : normalizePhone(phone)
    const storedPhone = customer.phone ? normalizePhone(customer.phone) : null
    if (requestedPhone !== storedPhone) {
      return res.status(400).json({ error: "This customer has a linked account, so the number can't be changed" })
    }
  }

  customer.name = name.trim()
  if (!customer.linkedUserId && phone !== undefined) {
    const normalizedPhone = phone ? normalizePhone(phone) : ""
    const linkedUser = normalizedPhone
      ? await AppDataSource.getRepository(User)
          .createQueryBuilder("user")
          .where("RIGHT(regexp_replace(user.phone, '[^0-9]', '', 'g'), 10) = :phone", { phone: normalizedPhone })
          .andWhere("user.id != :callerId", { callerId: req.user!.userId })
          .getOne()
      : null

    customer.phone = normalizedPhone || null
    customer.linkedUserId = linkedUser?.id ?? null
  }

  await customerRepo.save(customer)
  return res.json(customer)
})

router.get("/:id/customer-side", async (req: AuthRequest, res) => {
  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
  })
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }
  if (!customer.linkedUserId) {
    return res.json({ linked: false })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const [customerTransactions, shopTransactions] = await Promise.all([
    transactionRepo.find({ where: { customer: { id: customer.id }, side: "customer" } }),
    transactionRepo.find({ where: { customer: { id: customer.id }, side: "shop" } }),
  ])
  const balance = calculateBalance(customerTransactions)
  const shopBalance = calculateBalance(shopTransactions)

  return res.json({
    linked: true,
    transactions: customerTransactions,
    balance,
    difference: balance - shopBalance,
  })
})

router.get("/:id", async (req: AuthRequest, res) => {
  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
    relations: { transactions: true },
  })

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  const shopTransactions = customer.transactions.filter((transaction) => transaction.side === "shop")
  const balance = calculateBalance(shopTransactions)
  return res.json({ ...customer, transactions: shopTransactions, balance })
})

router.post("/:id/transactions", async (req: AuthRequest, res) => {
  const { amount, type, note } = req.body

  if (!amount || !type) {
    return res.status(400).json({ error: "amount and type are required" })
  }
  if (type !== "credit" && type !== "debit") {
    return res.status(400).json({ error: "type must be 'credit' or 'debit'" })
  }

  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
  })

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const transaction = transactionRepo.create({ amount, type, note, side: "shop", customer })
  await transactionRepo.save(transaction)

  return res.status(201).json(transaction)
})

router.patch("/:id/transactions/:txId", async (req: AuthRequest, res) => {
  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
  })
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const transaction = await transactionRepo.findOne({
    where: {
      id: Number(req.params.txId),
      customer: { id: customer.id },
      side: "shop",
    },
  })
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" })
  }

  const { amount, type, note } = req.body
  const numericAmount = Number(amount)
  if (amount === undefined || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "amount must be greater than 0" })
  }
  if (type !== undefined && type !== transaction.type) {
    return res.status(400).json({ error: "Transaction type cannot be changed" })
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return res.status(400).json({ error: "note must be a string" })
  }
  transaction.amount = numericAmount
  if (note !== undefined) transaction.note = note

  await transactionRepo.save(transaction)
  return res.json(transaction)
})

router.delete("/:id/transactions/:txId", async (req: AuthRequest, res) => {
  const customer = await AppDataSource.getRepository(Customer).findOne({
    where: { id: Number(req.params.id), user: { id: req.user!.userId } },
  })
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  const transactionRepo = AppDataSource.getRepository(Transaction)
  const transaction = await transactionRepo.findOne({
    where: {
      id: Number(req.params.txId),
      customer: { id: customer.id },
      side: "shop",
    },
  })
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" })
  }

  await transactionRepo.remove(transaction)
  return res.json({ message: "Transaction deleted" })
})

export default router