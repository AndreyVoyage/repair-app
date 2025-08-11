const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

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

// Эндпоинт для загрузки изображений
router.post('/upload', upload.array('images'), (req, res) => {
  if (!req.files) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
  res.json({ imageUrls });
});

module.exports = router;