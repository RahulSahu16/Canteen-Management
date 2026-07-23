import mongoose from 'mongoose'

const todayMenuSchema = new mongoose.Schema(
  {
    publishedAt: { type: Date, default: Date.now },
    items: [
      {
        id: { type: String, required: true },
        available: { type: Boolean, default: false },
        stock: { type: Number, default: 0 },
        dailyPrice: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
)

export default mongoose.model('TodayMenu', todayMenuSchema)
