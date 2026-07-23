import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { connectMongoDB } from './config/mongodb.js'

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PATCH'],
  },
})

app.locals.io = io

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id)

  socket.on('join-staff-room', () => {
    socket.join('staff')
  })

  socket.on('join-mobile-room', (mobile) => {
    if (mobile) {
      socket.join(`mobile:${mobile}`)
    }
  })

  socket.on('join-order-room', (orderId) => {
    if (orderId) {
      socket.join(`order:${orderId}`)
    }
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id)
  })
})

const port = process.env.PORT || 4000

async function startServer() {
  await connectMongoDB()
  server.listen(port, () => {
    console.log(`Canteen server listening on http://localhost:${port}`)
  })
}

startServer()
