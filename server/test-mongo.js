import 'dotenv/config'
import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI || 'PASTE_URI_HERE'

;(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    console.log('Connected OK')
    process.exit(0)
  } catch (err) {
    console.error('Connect failed:', err.message)
    process.exit(1)
  }
})()
