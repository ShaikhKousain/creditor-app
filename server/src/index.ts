import "reflect-metadata"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { AppDataSource } from "./data-source"
import customersRouter from "./routes/customers"
import authRouter from "./routes/auth"

const app = express()
app.use(cors({ origin: /^http:\/\/localhost:\d+$/, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.use("/auth", authRouter)
app.use("/customers", customersRouter)

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected")
    app.listen(process.env.PORT || 4000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT || 4000}`)
    })
  })
  .catch((err) => {
    console.error("Database connection failed:", err)
  })