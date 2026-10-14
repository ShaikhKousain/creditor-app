import "reflect-metadata"
import { DataSource } from "typeorm"
import { types } from "pg"
import * as dotenv from "dotenv"
import { Customer } from "./entities/Customer"
import { Transaction } from "./entities/Transaction"
import { User } from "./entities/User"

dotenv.config()

types.setTypeParser(1114, (value: string) => new Date(`${value}Z`))

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: process.env.NODE_ENV !== "production",
  logging: true,
  entities: [User, Customer, Transaction],
})