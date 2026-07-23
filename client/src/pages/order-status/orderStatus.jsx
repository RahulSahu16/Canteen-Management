import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Button from '../../components/ui/common/Button.jsx'
import { fetchActiveOrder, fetchOrder } from '../../services/api.js'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'
const STATUS_STEPS = [
  { status: 'Pending', title: 'Order Received', detail: 'Your order has reached the canteen.' },
  { status: 'Accepted', title: 'Order Accepted', detail: 'The staff has accepted your order.' },
  { status: 'Preparing', title: 'Preparing', detail: 'Preparing your order...' },
  { status: 'Ready', title: 'Ready', detail: 'Your order is ready for pickup.' },
  { status: 'Completed', title: 'Completed', detail: 'Order Completed.' },
]

export default function OrderStatusPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const storedOrder = useMemo(
    () => (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('canteenLatestOrder') || 'null') : null),
    [],
  )
  const { orderId: stateOrderId } = location.state || {}
  const [orderId, setOrderId] = useState(stateOrderId || storedOrder?.orderId || '')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) {
      if (storedOrder?.mobile) {
        fetchActiveOrder(storedOrder.mobile)
          .then((found) => {
            if (found) {
              setOrder(found)
              setOrderId(found.id)
              localStorage.setItem('canteenLatestOrder', JSON.stringify({ orderId: found.id, mobile: found.mobile, seatId: found.seatId }))
              return
            }
            navigate('/login')
          })
          .catch(() => navigate('/login'))
      } else {
        navigate('/login')
      }
      return
    }

    fetchOrder(orderId)
      .then(setOrder)
      .catch((err) => setError(err.response?.data?.error || 'Unable to load order.'))
  }, [navigate, orderId, storedOrder])

  useEffect(() => {
    if (!orderId) return
    const socket = io(socketUrl)
    socket.emit('join-order-room', orderId)
    if (order?.mobile) {
      socket.emit('join-mobile-room', order.mobile)
    }

    const updateOrder = (updated) => {
      if (updated.id === orderId) {
        setOrder(updated)
      }
    }

    socket.on('order-status-updated', updateOrder)
    socket.on('order-completed', updateOrder)
    return () => socket.disconnect()
  }, [orderId, order?.mobile])

  const activeIndex = useMemo(() => {
    if (order?.status === 'Cancelled') return -1
    return STATUS_STEPS.findIndex((step) => step.status === (order?.status || 'Pending'))
  }, [order])

  const currentStep = activeIndex >= 0 ? STATUS_STEPS[activeIndex] : null

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-10 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Order Status</p>
            <h1 className="text-3xl font-bold text-slate-900">{order?.id || 'Order'}</h1>
          </div>
          <Button onClick={() => navigate('/menu', { state: { mobile: order?.mobile, seatId: order?.seatId } })}>Back to Menu</Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-slate-600">Seat</p>
            <p className="text-xl font-semibold text-slate-900">{order?.seatId}</p>
            <p className="text-slate-600">Mobile</p>
            <p className="text-xl font-semibold text-slate-900">{order?.mobile}</p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Progress</h2>
              <span className="text-sm text-slate-500">{order?.status}</span>
            </div>
            {currentStep && (
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Live Update</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{currentStep.detail}</p>
              </div>
            )}
            <div className="space-y-5">
              {STATUS_STEPS.map((step, index) => {
                const completed = index <= activeIndex
                return (
                  <div key={step.status} className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${completed ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className={`font-semibold ${completed ? 'text-slate-900' : 'text-slate-500'}`}>{step.title}</p>
                      <p className="text-sm text-slate-500">{index === activeIndex ? step.detail : 'Waiting'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {order?.status === 'Cancelled' && (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-800">
              This order was cancelled.
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Order items</h2>
            <div className="mt-4 space-y-3">
              {order?.items.map((item) => (
                <div key={item.id} className="flex justify-between text-slate-700">
                  <span>{item.name} × {item.qty}</span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 flex items-center justify-between text-slate-900">
              <strong>Total</strong>
              <strong>₹{order?.total}</strong>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
