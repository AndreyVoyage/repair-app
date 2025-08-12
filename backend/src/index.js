require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/* ==== Модели ==== */
const Service = require('./models/Service');
const Category = require('./models/Category');
const ServiceHistory = require('./models/ServiceHistory');

/* ==== Express ==== */
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

/* ==== Multer + Sharp ==== */
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    /image\/(png|jpe?g|gif|webp)/i.test(file.mimetype) ? cb(null, true) : cb(null, false),
});

/* ==== CRUD services ==== */
app.get('/api/services', async (req, res) => {
  const { status = 'all' } = req.query;
  const filter = status === 'all' ? {} : { status };
  const services = await Service.find(filter).populate('category', 'name').sort({ createdAt: -1 });
  res.json(services);
});

app.post('/api/services', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category } = req.body;
    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ error: 'Неверный ID категории' });

    const images = [];
    for (const file of req.files || []) {
      const originalSize = file.size;
      if (originalSize > 5 * 1024 * 1024)
        console.warn(`Файл ${file.originalname} > 5 MB – сжимаем`);
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.webp';
      await sharp(file.buffer)
        .resize({ maxWidthOrHeight: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(uploadDir, filename));
      images.push(`/uploads/${filename}`);
    }

    const service = new Service({
      title,
      description,
      price: Number(price),
      category,
      images,
    });
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/services/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category } = req.body;
    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ error: 'Неверный ID категории' });

    const images = req.files?.map(f => `/uploads/${f.filename}`);
    const update = { title, description, price: Number(price), category };
    if (images?.length) update.images = images;

    const old = await Service.findById(req.params.id);
    const updated = await Service.findByIdAndUpdate(req.params.id, update, { new: true }).populate('category', 'name');

    ['title', 'description', 'price', 'status'].forEach((f) => {
      if (old[f] !== update[f]) {
        ServiceHistory.create({ serviceId: old._id, field: f, oldVal: old[f], newVal: update[f] });
      }
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ message: 'Удалено' });
});

/* ===== Bulk & Sort ===== */
app.patch('/api/services/bulk', async (req, res) => {
  const { ids, action } = req.body;
  switch (action) {
    case 'delete': await Service.deleteMany({ _id: { $in: ids } }); break;
    case 'publish': await Service.updateMany({ _id: { $in: ids } }, { status: 'published' }); break;
    case 'draft': await Service.updateMany({ _id: { $in: ids } }, { status: 'draft' }); break;
    default: return res.status(400).json({ error: 'unknown action' });
  }
  res.json({ message: 'ok' });
});

app.patch('/api/services/sort', async (req, res) => {
  const { items } = req.body;
  for (const { id, order } of items) await Service.findByIdAndUpdate(id, { order });
  res.json({ message: 'ok' });
});

/* ===== Excel export ===== */
app.get('/api/services/export/xlsx', async (_, res) => {
  const ExcelJS = require('exceljs');
  const services = await Service.find().populate('category', 'name').sort({ createdAt: -1 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Price');
  ws.columns = [
    { header: 'Название', key: 'title', width: 30 },
    { header: 'Категория', key: 'category', width: 20 },
    { header: 'Цена', key: 'price', width: 10 },
    { header: 'Статус', key: 'status', width: 10 },
  ];
  services.forEach(s => ws.addRow({ title: s.title, category: s.category.name, price: s.price, status: s.status }));
  res.setHeader('Content-Disposition', 'attachment; filename=price.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await wb.xlsx.write(res);
});

/* ===== категории ===== */
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

/* ===== connect DB & start ===== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));