import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['staff', 'player'], default: 'player' },
    mobile: { type: String, sparse: true },
    password: { type: String },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
