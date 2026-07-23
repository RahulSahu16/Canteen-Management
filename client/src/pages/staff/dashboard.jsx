import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { fetchTodaysMenuConfig, fetchOrders, publishTodaysMenu, updateOrderStatus, fetchMasterMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../../services/api.js'
import Button from '../../components/ui/common/Button.jsx'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'
const STATUS_FLOW = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed']
const STAGE_ACTIONS = [
  { status: 'Pending', label: 'Pending' },
  { status: 'Accepted', label: 'Accept the Order' },
  { status: 'Preparing', label: 'Preparing the Order' },
  { status: 'Ready', label: 'Ready for Pickup' },
  { status: 'Completed', label: 'Complete Order' },
]

export default function StaffDashboardPage() {
  const [tab, setTab] = useState('manage')
  const [orders, setOrders] = useState([])
  const [todayItems, setTodayItems] = useState([])
  const [masterItems, setMasterItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(5)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [publishStatus, setPublishStatus] = useState('')
  const [error, setError] = useState('')

  const loadOrders = async (targetPage = 1) => {
    try {
      const data = await fetchOrders(targetPage, limit, 'active')
      setOrders(data.orders)
      setTotal(data.total)
      setSelectedOrder((current) => {
        if (!current) return null
        return data.orders.find((order) => order.id === current.id) || null
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load orders.')
    }
  }

  const loadMenuConfig = async () => {
    try {
      const config = await fetchTodaysMenuConfig()
      setTodayItems(config.items)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load menu config.')
    }
  }

  const loadMaster = async () => {
    try {
      const items = await fetchMasterMenu()
      setMasterItems(items)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load master menu.')
    }
  }

  useEffect(() => {
    loadOrders(page)
    loadMenuConfig()
    loadMaster()
  }, [page])

  useEffect(() => {
    const socket = io(socketUrl)
    socket.emit('join-staff-room')

    socket.on('order-created', () => loadOrders(page))
    socket.on('order-status-updated', () => loadOrders(page))
    socket.on('order-completed', () => loadOrders(page))
    socket.on('menu-updated', () => loadMenuConfig())
    return () => socket.disconnect()
  }, [page])

  const statusIndex = (status) => {
    const index = STATUS_FLOW.indexOf(status)
    return index === -1 ? 0 : index
  }

  const handleStatusUpdate = async (order, nextStatus) => {
    try {
      const updated = await updateOrderStatus(order.id, nextStatus)
      setSelectedOrder(['Completed', 'Cancelled'].includes(updated.status) ? null : updated)
      await loadOrders(page)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update order.')
    }
  }

  const statusBadgeClass = (status) => {
    if (status === 'Pending') return 'bg-amber-100 text-amber-800'
    if (status === 'Ready') return 'bg-emerald-100 text-emerald-800'
    return 'bg-blue-100 text-blue-800'
  }

  const handleToggleAvailability = (itemId) => {
    setTodayItems((prev) => prev.map((item) => item.id === itemId ? { ...item, available: !item.available } : item))
    setPublishStatus('')
  }

  const handleAddToToday = (masterItem) => {
    // add item to todayItems if not present
    setTodayItems((prev) => {
      if (prev.find((i) => i.id === masterItem.id)) return prev
      return [...prev, { id: masterItem.id, name: masterItem.name, available: true, dailyPrice: masterItem.price || masterItem.dailyPrice || 0 }]
    })
    setPublishStatus('')
  }

  const [newFood, setNewFood] = useState({ name: '', category: '', description: '', price: '', imageFile: null })
  const [previewImage, setPreviewImage] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [editFood, setEditFood] = useState({ id: '', name: '', category: '', description: '', price: '', image: '', imageFile: null })
  const [editPreviewImage, setEditPreviewImage] = useState('')

  const handleCreateFood = async () => {
    setError('')
    try {
      const formData = new FormData()
      formData.append('name', newFood.name)
      formData.append('category', newFood.category)
      formData.append('description', newFood.description)
      formData.append('price', newFood.price)
      if (newFood.imageFile) {
        formData.append('imageFile', newFood.imageFile)
      }

      await createMenuItem(formData)
      setNewFood({ name: '', category: '', description: '', price: '', imageFile: null })
      setPreviewImage('')
      await loadMaster()
      setTab('all')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create food item.')
    }
  }

  const startEditFood = (item) => {
    setEditingItem(item)
    setEditFood({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      price: item.price,
      image: item.image || '',
      imageFile: null,
    })
    setEditPreviewImage(item.image || '')
  }

  const closeEditModal = () => {
    setEditingItem(null)
    setEditFood({ id: '', name: '', category: '', description: '', price: '', image: '', imageFile: null })
    setEditPreviewImage('')
  }

  const handleUpdateFood = async () => {
    if (!editingItem) return
    setError('')
    try {
      const formData = new FormData()
      formData.append('name', editFood.name)
      formData.append('category', editFood.category)
      formData.append('description', editFood.description)
      formData.append('price', editFood.price)
      if (editFood.imageFile) {
        formData.append('imageFile', editFood.imageFile)
      }

      await updateMenuItem(editFood.id, formData)
      await loadMaster()
      await loadMenuConfig()
      closeEditModal()
      setTab('all')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update food item.')
    }
  }

  const handleDeleteFood = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from the menu? This cannot be undone.`)) {
      return
    }

    setError('')
    try {
      await deleteMenuItem(item.id)
      setTodayItems((prev) => prev.filter((entry) => entry.id !== item.id))
      if (editingItem?.id === item.id) {
        closeEditModal()
      }
      await loadMaster()
      await loadMenuConfig()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete food item.')
    }
  }

  const handlePublishMenu = async () => {
    setError('')
    setPublishStatus('Saving...')
    try {
      await publishTodaysMenu({ items: todayItems })
      setPublishStatus('Today’s menu saved successfully.')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to publish today’s menu.')
      setPublishStatus('')
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-slate-900">Canteen Staff Dashboard</h1>
          <p className="mt-2 text-slate-600">Manage today’s menu availability and move orders through the kitchen pipeline.</p>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Manage Today's Menu</h2>
              <p className="mt-2 text-slate-600">Pick which master menu items are available for players today.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className={`${tab === 'manage' ? 'bg-blue-600' : 'bg-slate-200 text-slate-900'}`} onClick={() => setTab('manage')}>Manage Today</Button>
              <Button className={`${tab === 'all' ? 'bg-blue-600' : 'bg-slate-200 text-slate-900'}`} onClick={() => setTab('all')}>All Food</Button>
              <Button className={`${tab === 'orders' ? 'bg-blue-600' : 'bg-slate-200 text-slate-900'}`} onClick={() => setTab('orders')}>Orders</Button>
              <Button className={`${tab === 'add' ? 'bg-emerald-600' : 'bg-emerald-300 text-slate-900'}`} onClick={() => setTab('add')}>Add Food</Button>
            </div>
          </div>

          {tab === 'manage' ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {todayItems.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{item.category}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">₹{item.dailyPrice}</p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-sm font-semibold ${item.available ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                        {item.available ? 'Available' : 'Hidden'}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={item.available}
                          onChange={() => handleToggleAvailability(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Available today
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={handlePublishMenu}>Publish Menu</Button>
                {publishStatus && <span className="text-sm text-emerald-700">{publishStatus}</span>}
              </div>
            </>
          ) : tab === 'orders' ? (
            <>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Current Pending Orders</h2>
                  <p className="mt-1 text-sm text-slate-600">Click an order to move it through the kitchen stages.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{total} active</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Seat / Mobile</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`cursor-pointer transition hover:bg-slate-50 ${selectedOrder?.id === order.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-4 font-medium text-slate-900">{order.id}</td>
                        <td className="px-4 py-4 text-slate-700">{order.seatId} / {order.mobile}</td>
                        <td className="px-4 py-4 text-slate-700">
                          {order.items.map((item) => `${item.name}×${item.qty}`).join(', ')}
                        </td>
                        <td className="px-4 py-4 text-slate-700">₹{order.total}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(order.status)}`}>{order.status}</span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedOrder(order)
                            }}
                            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {orders.length === 0 && (
                <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-500">No current pending orders.</p>
              )}

              {selectedOrder && (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Selected Order</p>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedOrder.id}</h3>
                      <p className="mt-2 text-slate-600">{selectedOrder.seatId} / {selectedOrder.mobile}</p>
                    </div>
                    <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${statusBadgeClass(selectedOrder.status)}`}>{selectedOrder.status}</span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {selectedOrder.items.map((item) => (
                      <div key={`${selectedOrder.id}-${item.id || item.foodId || item.name}`} className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">Qty: {item.qty} - Rs.{item.price} each</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                    <span className="font-semibold text-slate-700">Total</span>
                    <strong className="text-2xl text-slate-900">Rs.{selectedOrder.total}</strong>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {STAGE_ACTIONS.map((stage) => {
                      const currentIndex = statusIndex(selectedOrder.status)
                      const stageIndex = statusIndex(stage.status)
                      const reached = stageIndex <= currentIndex

                      return (
                        <button
                          key={stage.status}
                          disabled={stage.status === selectedOrder.status}
                          onClick={() => handleStatusUpdate(selectedOrder, stage.status)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-default ${
                            reached
                              ? 'border-blue-200 bg-blue-50 text-blue-800'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {stage.label}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder, 'Cancelled')}
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-600">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-3">
                  <button disabled={page <= 1} className="rounded-full border px-4 py-2 disabled:opacity-50" onClick={() => setPage(page - 1)}>Previous</button>
                  <button disabled={page >= totalPages} className="rounded-full border px-4 py-2 disabled:opacity-50" onClick={() => setPage(page + 1)}>Next</button>
                </div>
              </div>
            </>
          ) : null}
          {tab === 'all' && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {masterItems.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                  <div className="space-y-3">
                    {item.image && <img src={item.image} alt={item.name} className="h-44 w-full rounded-3xl object-cover" />}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{item.category}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">₹{item.price}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => handleAddToToday(item)}>Add to Today's Menu</Button>
                        <Button className="bg-slate-200 text-slate-900" onClick={() => startEditFood(item)}>Edit</Button>
                        <Button className="bg-red-600" onClick={() => handleDeleteFood(item)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'add' && (
            <div className="mt-6">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="p-2 border" placeholder="Name" value={newFood.name} onChange={(e) => setNewFood({ ...newFood, name: e.target.value })} />
                <input className="p-2 border" placeholder="Category" value={newFood.category} onChange={(e) => setNewFood({ ...newFood, category: e.target.value })} />
                <input
                  className="p-2 border"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setNewFood({ ...newFood, imageFile: file })
                    if (file) {
                      setPreviewImage(URL.createObjectURL(file))
                    }
                  }}
                />
                <input className="p-2 border" placeholder="Price" value={newFood.price} onChange={(e) => setNewFood({ ...newFood, price: e.target.value })} />
                <textarea className="p-2 border md:col-span-2" placeholder="Description" value={newFood.description} onChange={(e) => setNewFood({ ...newFood, description: e.target.value })} />
              </div>
              {previewImage && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600">Preview</p>
                  <img src={previewImage} alt="Preview" className="max-h-48 rounded-3xl object-cover" />
                </div>
              )}
              <div className="mt-4">
                <Button onClick={handleCreateFood}>Add Food</Button>
              </div>
            </div>
          )}
          {editingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Edit Menu Item</h2>
                    <p className="text-sm text-slate-500">Update the food item and photo.</p>
                  </div>
                  <button className="text-slate-500" onClick={closeEditModal}>Close</button>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <input className="p-2 border" value={editFood.name} onChange={(e) => setEditFood({ ...editFood, name: e.target.value })} />
                  <input className="p-2 border" value={editFood.category} onChange={(e) => setEditFood({ ...editFood, category: e.target.value })} />
                  <input
                    className="p-2 border"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setEditFood({ ...editFood, imageFile: file })
                      if (file) {
                        setEditPreviewImage(URL.createObjectURL(file))
                      }
                    }}
                  />
                  <input className="p-2 border" value={editFood.price} onChange={(e) => setEditFood({ ...editFood, price: e.target.value })} />
                  <textarea className="p-2 border md:col-span-2" value={editFood.description} onChange={(e) => setEditFood({ ...editFood, description: e.target.value })} />
                </div>
                {editPreviewImage && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600">Preview</p>
                    <img src={editPreviewImage} alt="Preview" className="max-h-48 rounded-3xl object-cover" />
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <Button onClick={handleUpdateFood}>Save changes</Button>
                  <Button className="bg-red-600" onClick={() => handleDeleteFood(editingItem)}>Delete</Button>
                  <button className="rounded-2xl border px-4 py-2 text-slate-700" onClick={closeEditModal}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
