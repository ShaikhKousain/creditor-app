import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from "typeorm"
import { Transaction } from "./Transaction"
import { User } from "./User"

@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: "varchar" })
  name!: string

  @Column({ type: "varchar", nullable: true })
  phone!: string

  @ManyToOne(() => User, (user) => user.customers)
  user!: User

  @OneToMany(() => Transaction, (transaction) => transaction.customer)
  transactions!: Transaction[]
}