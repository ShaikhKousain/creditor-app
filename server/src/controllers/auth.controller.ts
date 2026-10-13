import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { IsNull } from "typeorm"
import { AppDataSource } from "../data-source"
import { User } from "../entities/User"
import { Customer } from "../entities/Customer"
import { AuthRequest } from "../middlewares/auth.middleware"
import { getAuthCookieOptions, clearAuthCookie } from "../utils/cookieAuth"
import { normalizePhone } from "../utils/phone"

const BCRYPT_TIMING_PAD =
  "$2b$10$4TRcX3q1UCPDfbN1hQvU0OollkPcB3aAEF.FOqPjgCtRQNdJeKuP6"

export const register = async (req: Request, res: Response) => {
  try {
    const { phone, password, name } = req.body

    if (!phone || !password || !name) {
      return res.status(400).json({ message: "phone, password, and name are required" })
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      return res.status(400).json({ message: "phone must contain digits" })
    }

    const userRepo = AppDataSource.getRepository(User)

    const existing = await userRepo
      .createQueryBuilder("user")
      .where("RIGHT(regexp_replace(user.phone, '[^0-9]', '', 'g'), 10) = :phone", { phone: normalizedPhone })
      .getOne()
    if (existing) {
      return res.status(409).json({ message: "An account with this phone number already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = userRepo.create({ phone: normalizedPhone, password: hashedPassword, name })
    await userRepo.save(user)

    const customerRepo = AppDataSource.getRepository(Customer)
    const customersToLink = (await customerRepo.find({ where: { linkedUserId: IsNull() } }))
      .filter((customer) => customer.phone && normalizePhone(customer.phone) === normalizedPhone)
    for (const customer of customersToLink) {
      customer.linkedUserId = user.id
    }
    if (customersToLink.length > 0) {
      await customerRepo.save(customersToLink)
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    )

    res.cookie("token", token, getAuthCookieOptions(24 * 60 * 60 * 1000))

    return res.status(201).json({ message: "Account created", user: { id: user.id, phone: user.phone, name: user.name } })
  } catch (error) {
    console.error("REGISTER ERROR 👉", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password, rememberMe } = req.body

    if (!phone || !password) {
      return res.status(400).json({ message: "phone and password are required" })
    }

    const normalizedPhone = normalizePhone(phone)
    const userRepo = AppDataSource.getRepository(User)
    const user = normalizedPhone
      ? await userRepo
          .createQueryBuilder("user")
          .where("RIGHT(regexp_replace(user.phone, '[^0-9]', '', 'g'), 10) = :phone", { phone: normalizedPhone })
          .getOne()
      : null

    const hashForCompare = user?.password ?? BCRYPT_TIMING_PAD
    const passwordOk = await bcrypt.compare(password, hashForCompare)

    if (!user || !passwordOk) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const expiresIn = rememberMe ? "30d" : "1d"
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET as string,
      { expiresIn }
    )

    res.cookie("token", token, getAuthCookieOptions(maxAge))

    return res.json({
      message: "Login successful",
      user: { id: user.id, phone: user.phone, name: user.name },
    })
  } catch (error) {
    console.error("LOGIN ERROR 👉", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const logout = async (req: Request, res: Response) => {
  clearAuthCookie(res)
  return res.json({ message: "Logged out successfully" })
}

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const userRepo = AppDataSource.getRepository(User)

  const user = await userRepo.findOne({
    where: { id: req.user.userId },
    select: { id: true, phone: true, name: true },
  })

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  return res.json(user)
}