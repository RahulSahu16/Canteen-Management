import { masterMenu, todaysMenu } from '../models/db.js'
import MenuItem from '../models/MenuItem.js'
import TodayMenu from '../models/TodayMenu.js'
import { isMongoReady } from '../config/mongodb.js'

function formatImageUrl(req, image) {
  if (!image) return ''
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }
  return `${req.protocol}://${req.get('host')}${image}`
}

function getTodaySetting(item) {
  return todaysMenu.itemSettings[item.id] || {
    id: item.id,
    available: false,
    stock: item.defaultStock,
    dailyPrice: item.dailyPrice,
  }
}

export async function listMenu(req, res) {
  try {
    if (isMongoReady()) {
      const items = await MenuItem.find({ isActive: true }).lean()
      const today = await TodayMenu.findOne({}).lean()
      const settings = (today && Array.isArray(today.items)) ? Object.fromEntries(today.items.map(i => [String(i.id), i])) : {}
      const mapped = items.map((item) => ({
        id: String(item._id),
        _id: item._id,
        name: item.name,
        category: item.category,
        description: item.description,
        price: item.price,
        image: formatImageUrl(req, item.image),
        defaultStock: item.defaultStock,
        isActive: item.isActive,
        available: settings[String(item._id)] ? settings[String(item._id)].available : true,
        stock: settings[String(item._id)] ? settings[String(item._id)].stock : item.defaultStock,
        dailyPrice: settings[String(item._id)] ? settings[String(item._id)].dailyPrice : item.price,
      }))
      return res.json({ items: mapped })
    }

    const items = masterMenu
      .filter((item) => getTodaySetting(item).available)
      .map((item) => ({
        ...item,
        image: formatImageUrl(req, item.image),
        stock: getTodaySetting(item).stock,
        price: getTodaySetting(item).dailyPrice,
      }))

    return res.json({ items })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function listMasterMenu(req, res) {
  try {
    if (isMongoReady()) {
      const items = await MenuItem.find({ isActive: true }).lean()
      return res.json({ items: items.map((item) => ({ id: String(item._id), _id: item._id, name: item.name, category: item.category, description: item.description, price: item.price, image: formatImageUrl(req, item.image), defaultStock: item.defaultStock, isActive: item.isActive })) })
    }

    return res.json({ items: masterMenu })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getTodaysMenuConfig(req, res) {
  try {
    if (isMongoReady()) {
      const items = await MenuItem.find({ isActive: true }).lean()
      const today = await TodayMenu.findOne({}).lean()
      const settings = (today && Array.isArray(today.items)) ? Object.fromEntries(today.items.map(i => [String(i.id), i])) : {}
      const mapped = items.map((item) => ({
        id: String(item._id),
        _id: item._id,
        name: item.name,
        category: item.category,
        description: item.description,
        price: item.price,
        image: formatImageUrl(req, item.image),
        defaultStock: item.defaultStock,
        available: settings[String(item._id)] ? settings[String(item._id)].available : true,
        stock: settings[String(item._id)] ? settings[String(item._id)].stock : item.defaultStock,
        dailyPrice: settings[String(item._id)] ? settings[String(item._id)].dailyPrice : item.price,
      }))
      return res.json({ publishedAt: today ? today.publishedAt : new Date().toISOString(), items: mapped })
    }

    const items = masterMenu.map((item) => {
      const setting = getTodaySetting(item)
      return {
        ...item,
        available: setting.available,
        stock: setting.stock,
        dailyPrice: setting.dailyPrice,
      }
    })
    return res.json({ publishedAt: todaysMenu.publishedAt, items })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export function updateTodaysMenu(req, res) {
  const { items } = req.body
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid menu payload.' })
  }
  // build valid id set from masterMenu or DB
  let validIds = new Set(masterMenu.map((item) => item.id))
  if (isMongoReady()) {
    // include DB menu item ids
    // use synchronous approach via promise chain (but here it's OK to use async ops)
  }

  // If DB is ready, validate against MenuItem collection
  const applyUpdate = async () => {
    if (isMongoReady()) {
      try {
        const dbItems = await MenuItem.find().lean()
        validIds = new Set(dbItems.map((m) => String(m._id)))
      } catch (err) {
        console.error('Failed to load MenuItem for validation:', err.message)
      }
    }

    items.forEach((inputItem) => {
      if (!validIds.has(inputItem.id)) {
        return
      }

      const existing = todaysMenu.itemSettings[inputItem.id] || {
        id: inputItem.id,
        available: false,
        stock: 0,
        dailyPrice: 0,
      }

      todaysMenu.itemSettings[inputItem.id] = {
        id: existing.id,
        available: Boolean(inputItem.available),
        stock: typeof inputItem.stock === 'number' ? inputItem.stock : existing.stock,
        dailyPrice:
          typeof inputItem.dailyPrice === 'number' ? inputItem.dailyPrice : existing.dailyPrice,
      }
    })

    const publishedAt = new Date().toISOString()
    todaysMenu.publishedAt = publishedAt

    // persist to DB when available
    if (isMongoReady()) {
      try {
        await TodayMenu.findOneAndUpdate({}, { publishedAt, items }, { upsert: true, new: true })
      } catch (err) {
        console.error('TodayMenu save error:', err.message)
      }
    }

    req.io.emit('menu.updated', {
      publishedAt,
      items,
    })
    req.io.emit('menu-updated', {
      publishedAt,
      items,
    })

    res.json({ publishedAt, items })
  }

  applyUpdate().catch((err) => {
    console.error('updateTodaysMenu error:', err.message)
    res.status(500).json({ error: err.message })
  })
}

export async function createMenuItem(req, res) {
  try {
    const { name, category, description, price, defaultStock } = req.body
    let image = req.body.image || ''
    if (req.file) {
      image = `/uploads/${req.file.filename}`
    }

    const numericPrice = Number(price)
    if (!name || !category || Number.isNaN(numericPrice)) {
      return res.status(400).json({ error: 'Invalid menu item payload.' })
    }

    const item = await MenuItem.create({ name, category, description: description || '', price: numericPrice, image, defaultStock: Number(defaultStock) || 0 })
    return res.status(201).json({ item: { id: String(item._id), name: item.name, category: item.category, description: item.description, price: item.price, image: formatImageUrl(req, item.image), defaultStock: item.defaultStock } })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function updateMenuItem(req, res) {
  try {
    const { id } = req.params
    const { name, category, description, price } = req.body
    let image = req.body.image || ''
    if (req.file) {
      image = `/uploads/${req.file.filename}`
    }

    const update = {}
    if (name) update.name = name
    if (category) update.category = category
    if (description !== undefined) update.description = description
    if (price !== undefined) {
      const numericPrice = Number(price)
      if (Number.isNaN(numericPrice)) {
        return res.status(400).json({ error: 'Invalid price value.' })
      }
      update.price = numericPrice
    }
    if (image) update.image = image

    const item = await MenuItem.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean()
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' })
    }

    const responseItem = { id: String(item._id), name: item.name, category: item.category, description: item.description, price: item.price, image: formatImageUrl(req, item.image), defaultStock: item.defaultStock, isActive: item.isActive }
    return res.json({ item: responseItem })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params

    if (isMongoReady()) {
      const item = await MenuItem.findByIdAndUpdate(id, { isActive: false }, { new: true })
      if (!item) {
        return res.status(404).json({ error: 'Menu item not found.' })
      }

      try {
        const today = await TodayMenu.findOne({})
        if (today && Array.isArray(today.items)) {
          today.items = today.items.filter((entry) => String(entry.id) !== String(id))
          await today.save()
        }
      } catch (err) {
        console.error('Failed to update TodayMenu after delete:', err.message)
      }

      const payload = { publishedAt: new Date().toISOString() }
      req.io.emit('menu.updated', payload)
      req.io.emit('menu-updated', payload)
      return res.json({ ok: true })
    }

    const index = masterMenu.findIndex((item) => item.id === id)
    if (index === -1) {
      return res.status(404).json({ error: 'Menu item not found.' })
    }

    masterMenu.splice(index, 1)
    delete todaysMenu.itemSettings[id]

    const payload = { publishedAt: new Date().toISOString() }
    req.io.emit('menu.updated', payload)
    req.io.emit('menu-updated', payload)
    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
