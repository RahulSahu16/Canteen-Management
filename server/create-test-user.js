import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './models/User.js'

const uri = process.env.MONGODB_URI

;(async () => {
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB for user creation')

  const email = process.env.TEST_USER_EMAIL || 'test.user@example.com'
  const existing = await User.findOne({ email })
  if (existing) {
    console.log('Test user already exists:', existing.email)
    process.exit(0)
  }

  const password = process.env.TEST_USER_PASSWORD
  if (!password) {
    console.error('TEST_USER_PASSWORD not set')
    process.exit(1)
  }

  const hashed = await bcrypt.hash(password, 10)
  const name = process.env.TEST_USER_NAME || 'Test User'
  const mobile = process.env.TEST_USER_MOBILE || '9998887776'

  const user = new User({ name, email, mobile, password: hashed, role: 'player' })
  await user.save()
  console.log('Created test user:', email, 'password:', password)
  process.exit(0)
})().catch((err) => { console.error(err); process.exit(1) })
