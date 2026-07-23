import { orders } from '../models/db.js'
import Order from '../models/Order.js'
import { isMongoReady } from '../config/mongodb.js'

const PRESET_STATUS = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled']
const LEGACY_STATUS_MAP = {
  'Order Placed': 'Pending',
  Prepared: 'Ready',
  'Ready for Pickup': 'Ready',
}
const ACTIVE_STATUSES = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Prepared', 'Ready for Pickup', 'Order Placed']
const FINISHED_STATUSES = ['Completed', 'Cancelled']

function getOrderById(id) {
  return orders.find((order) => order.id === id)
}

function normalizeOrder(order) {
  if (!order) return null
  const plain = typeof order.toObject === 'function' ? order.toObject() : order
  const status = LEGACY_STATUS_MAP[plain.status] || plain.status
  const orderedAt = plain.orderedAt || plain.createdAt
  return {
    ...plain,
    id: plain.id || plain._id?.toString(),
    status,
    orderedAt,
    createdAt: plain.createdAt,
    completedAt: plain.completedAt || null,
  }
}

function normalizeItems(items) {
  return items.map((item) => ({
    id: item.id || item.foodId,
    foodId: item.foodId || item.id,
    name: item.name,
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
  }))
}

function findActiveFallback(mobile) {
  return orders.find((order) => order.mobile === mobile && ACTIVE_STATUSES.includes(order.status))
}

function emitToOrderRooms(io, eventName, order) {
  if (!io || !order) return

  const aliases = {
    'order-created': 'order.created',
    'order-status-updated': 'order.status.updated',
    'order-completed': 'order.completed',
  }
  const rooms = ['staff']

  if (order.id) {
    rooms.push(`order:${order.id}`)
  }

  if (order.mobile) {
    rooms.push(`mobile:${order.mobile}`)
  }

  io.to(rooms).emit(eventName, order)
  if (aliases[eventName]) {
    io.to(rooms).emit(aliases[eventName], order)
  }
}

export async function createOrder(req, res) {
  const { mobile, seatId, items, total } = req.body
  if (!mobile || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order payload is invalid.' })
  }

  try {
    if (isMongoReady()) {
      const activeOrder = await Order.findOne({ mobile, status: { $in: ACTIVE_STATUSES } }).sort({ orderedAt: -1, createdAt: -1 })
      if (activeOrder) {
        return res.status(409).json({
          error: 'You already have an active order.',
          order: normalizeOrder(activeOrder),
        })
      }
    } else {
      const activeOrder = findActiveFallback(mobile)
      if (activeOrder) {
        return res.status(409).json({
          error: 'You already have an active order.',
          order: normalizeOrder(activeOrder),
        })
      }
    }

    const orderId = `ORD-${Date.now()}`
    const orderedAt = new Date()
    const normalizedItems = normalizeItems(items)
    const orderPayload = {
      id: orderId,
      mobile,
      seatId: seatId || 'unknown',
      items: normalizedItems,
      total: Number(total) || normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0),
      status: PRESET_STATUS[0],
      orderedAt: orderedAt.toISOString(),
      createdAt: orderedAt.toISOString(),
      completedAt: null,
    }

    if (isMongoReady()) {
      const order = await Order.create({
        mobile,
        seatId: seatId || 'unknown',
        items: normalizedItems,
        total: orderPayload.total,
        status: PRESET_STATUS[0],
        orderedAt,
      })
      const responseOrder = normalizeOrder(order)
      emitToOrderRooms(req.io, 'order-created', responseOrder)
      return res.json({ order: responseOrder })
    }

    orders.unshift(orderPayload)
    emitToOrderRooms(req.io, 'order-created', orderPayload)
    return res.json({ order: orderPayload })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function listOrders(req, res) {
  try {
    const activeOnly = req.query.status === 'active'

    if (isMongoReady()) {
      const page = Math.max(1, Number(req.query.page) || 1)
      const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5))
      const skip = (page - 1) * limit
      const filter = activeOnly ? { status: { $in: ACTIVE_STATUSES } } : {}
      const [ordersList, total] = await Promise.all([
        Order.find(filter).sort({ orderedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        Order.countDocuments(filter),
      ])

      return res.json({ page, limit, total, orders: ordersList.map(normalizeOrder) })
    }

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5))
    const start = (page - 1) * limit
    const filteredOrders = activeOnly
      ? orders.filter((order) => ACTIVE_STATUSES.includes(order.status))
      : orders
    const pageOrders = filteredOrders.slice(start, start + limit)

    return res.json({
      page,
      limit,
      total: filteredOrders.length,
      orders: pageOrders,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getOrder(req, res) {
  try {
    if (isMongoReady()) {
      const order = await Order.findById(req.params.id).lean()
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' })
      }
      return res.json({ order: normalizeOrder(order) })
    }

    const order = getOrderById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }
    return res.json({ order })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function lookupOrderByMobile(req, res) {
  try {
    const mobile = req.query.mobile
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required.' })
    }

    if (isMongoReady()) {
      const order = await Order.findOne({ mobile }).sort({ createdAt: -1 }).lean()
      return res.json({ order: normalizeOrder(order) })
    }

    const order = orders.slice().reverse().find((orderItem) => orderItem.mobile === mobile)
    return res.json({ order: normalizeOrder(order) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getActiveOrder(req, res) {
  try {
    const { mobile } = req.params
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required.' })
    }

    if (isMongoReady()) {
      const order = await Order.findOne({ mobile, status: { $in: ACTIVE_STATUSES } }).sort({ orderedAt: -1, createdAt: -1 }).lean()
      return res.json({ order: normalizeOrder(order) })
    }

    return res.json({ order: normalizeOrder(findActiveFallback(mobile)) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getOrderHistory(req, res) {
  try {
    const { mobile } = req.params
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required.' })
    }

    if (isMongoReady()) {
      const history = await Order.find({ mobile }).sort({ orderedAt: -1, createdAt: -1 }).lean()
      return res.json({ orders: history.map(normalizeOrder) })
    }

    const history = orders
      .filter((order) => order.mobile === mobile)
      .sort((a, b) => new Date(b.orderedAt || b.createdAt) - new Date(a.orderedAt || a.createdAt))

    return res.json({ orders: history.map(normalizeOrder) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body
    if (!status || !PRESET_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status.' })
    }

    if (isMongoReady()) {
      const order = await Order.findById(req.params.id)
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' })
      }

      order.status = status
      order.completedAt = FINISHED_STATUSES.includes(status) ? new Date() : null
      await order.save()
      const responseOrder = normalizeOrder(order)
      emitToOrderRooms(req.io, 'order-status-updated', responseOrder)
      if (responseOrder.status === 'Completed') {
        emitToOrderRooms(req.io, 'order-completed', responseOrder)
      }
      return res.json({ order: responseOrder })
    }

    const order = getOrderById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    order.status = status
    order.completedAt = FINISHED_STATUSES.includes(status) ? new Date().toISOString() : null
    const responseOrder = normalizeOrder(order)
    emitToOrderRooms(req.io, 'order-status-updated', responseOrder)
    if (responseOrder.status === 'Completed') {
      emitToOrderRooms(req.io, 'order-completed', responseOrder)
    }
    return res.json({ order: responseOrder })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
