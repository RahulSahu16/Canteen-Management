import mongoose from 'mongoose'

let isConnected = false

export async function connectMongoDB() {
  if (isConnected) {
    return mongoose.connection
  }

  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Running without MongoDB for now.')
    return null
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    isConnected = true
    console.log('MongoDB connected successfully')
    return mongoose.connection
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    return null
  }
}

export function isMongoReady() {
  return isConnected && mongoose.connection.readyState === 1
}
