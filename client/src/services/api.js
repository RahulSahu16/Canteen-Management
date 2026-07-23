import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
})

export async function loginStaff(payload) {
  const response = await api.post('/auth/staff/login', payload)
  return response.data
}

export async function sendOtp(payload) {
  const response = await api.post('/auth/otp/send', payload)
  return response.data
}

export async function verifyOtp(payload) {
  const response = await api.post('/auth/otp/verify', payload)
  return response.data
}

export async function fetchMenu() {
  const response = await api.get('/menu')
  return response.data.items
}

export async function fetchMasterMenu() {
  const response = await api.get('/menu/master')
  return response.data.items
}

export async function createMenuItem(payload) {
  if (payload instanceof FormData) {
    const response = await api.post('/menu/master', payload)
    return response.data.item
  }

  const response = await api.post('/menu/master', payload)
  return response.data.item
}

export async function updateMenuItem(id, payload) {
  if (payload instanceof FormData) {
    const response = await api.patch(`/menu/master/${id}`, payload)
    return response.data.item
  }

  const response = await api.patch(`/menu/master/${id}`, payload)
  return response.data.item
}

export async function deleteMenuItem(id) {
  const response = await api.delete(`/menu/master/${id}`)
  return response.data
}

export async function lookupOrderByMobile(mobile) {
  const response = await api.get('/orders/lookup', { params: { mobile } })
  return response.data.order
}

export async function fetchActiveOrder(mobile) {
  const response = await api.get(`/orders/active/${mobile}`)
  return response.data.order
}

export async function fetchOrderHistory(mobile) {
  const response = await api.get(`/orders/history/${mobile}`)
  return response.data.orders
}

export async function fetchTodaysMenuConfig() {
  const response = await api.get('/menu/today/config')
  return response.data
}

export async function publishTodaysMenu(payload) {
  const response = await api.patch('/menu/today', payload)
  return response.data
}

export async function placeOrder(payload) {
  const response = await api.post('/orders', payload)
  return response.data.order
}

export async function fetchOrder(orderId) {
  const response = await api.get(`/orders/${orderId}`)
  return response.data.order
}

export async function fetchOrders(page = 1, limit = 5, status) {
  const response = await api.get('/orders', { params: { page, limit, status } })
  return response.data
}

export async function updateOrderStatus(orderId, status) {
  const response = await api.patch(`/orders/${orderId}/status`, { status })
  return response.data.order
}

export default api
