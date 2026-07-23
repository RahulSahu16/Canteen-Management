import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true },
    seatId: { type: String, default: 'unknown' },
    items: [{ id: String, foodId: String, name: String, price: Number, qty: Number }],
    total: { type: Number, required: true },
    status: { type: String, default: 'Pending' },
    orderedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export default mongoose.model('Order', orderSchema)
