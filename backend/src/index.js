require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const uploadRoutes = require('./routes/upload');
const Service = require('./models/Service');

const app = express();
app.use(cors());
app.use(express.json()); // для body-parser

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Создайте папку uploads, если она не существует
const fs = require('fs');
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// GET /api/services – список услуг
app.get('/api/services', async (req, res) => {
  const services = await Service.find().sort({ createdAt: -1 });
  res.json(services);
});

// POST /api/services – добавить услугу
app.post('/api/services', async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/services/:id/upload
app.post('/api/services/:id/upload', upload.array('images'), async (req, res) => {
  try {
    const serviceId = req.params.id;
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    await Service.findByIdAndUpdate(serviceId, { $push: { images: { $each: imageUrls } } });
    res.json({ message: 'Images uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));