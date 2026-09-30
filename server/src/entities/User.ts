import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm"
import { Customer } from "./Customer"

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "varchar", unique: true })
  phone!: string

  @Column({ type: "varchar" })
  password!: string

  @Column({ type: "varchar" })
  name!: string

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date

  @OneToMany(() => Customer, (customer) => customer.user)
  customers!: Customer[]
}