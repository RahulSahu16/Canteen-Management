import express from 'express'
import {
  createOrder,
  getActiveOrder,
  getOrder,
  getOrderHistory,
  listOrders,
  lookupOrderByMobile,
  updateOrderStatus,
} from '../controllers/orderController.js'

const router = express.Router()
router.get('/', listOrders)
router.get('/lookup', lookupOrderByMobile)
router.get('/active/:mobile', getActiveOrder)
router.get('/history/:mobile', getOrderHistory)
router.post('/', createOrder)
router.get('/:id', getOrder)
router.patch('/:id/status', updateOrderStatus)
export default router
