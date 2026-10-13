import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm"
import { Customer } from "./Customer"

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: number

  @Column({ type: "varchar" })
  type!: "credit" | "debit"

  @Column({ type: "enum", enum: ["shop", "customer"], default: "shop" })
  side!: "shop" | "customer"

  @Column({ type: "varchar", nullable: true })
  note!: string

  @CreateDateColumn()
  createdAt!: Date

  @ManyToOne(() => Customer, (customer) => customer.transactions)
  customer!: Customer
}