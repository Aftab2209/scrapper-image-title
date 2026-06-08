import express from 'express'
import previewRouter from './routes/preview'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok' })
})

// routes
app.use('/places/preview', previewRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})