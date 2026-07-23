import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import menuRoutes from './routes/menu.js'
import orderRoutes from './routes/orders.js'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const uploadsDir = path.resolve('uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use(cors({ origin: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(uploadsDir))

app.use((req, res, next) => {
  req.io = req.app.locals.io
  next()
})

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'Canteen Management API' })
})

app.use('/api/auth', authRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

export default app
