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
  const services = await Service.find(filter)
    .populate('category', 'name')
    .sort({ order: 1, createdAt: -1 });
  res.json(services);
});

/* ===== Статистика ===== */
app.get('/api/services/stats', async (_req, res) => { 
  try {
    const [total, published, draft, priceMin, priceMax] = await Promise.all([
      Service.countDocuments(),
      Service.countDocuments({ status: 'published' }),
      Service.countDocuments({ status: 'draft' }),
      Service.findOne().sort({ price:  1 }).select('price'),
      Service.findOne().sort({ price: -1 }).select('price'),
    ]);

    res.json({
      total,
      published,
      draft,
      priceMin: priceMin?.price || 0,
      priceMax: priceMax?.price || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===== POST /api/services ===== */
app.post('/api/services', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category } = req.body;
    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ error: 'Неверный ID категории' });

    const images = [];
    for (const file of req.files || []) {
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.webp';
      await sharp(file.buffer)
        .resize({ maxWidthOrHeight: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(uploadDir, filename));
      images.push(`/uploads/${filename}`);
    }

    const maxOrder = (await Service.findOne().sort('-order').select('order'))?.order ?? -1;

    const service = new Service({
      title,
      description,
      price: Number(price),
      category,
      images,
      order: maxOrder + 1,
    });
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/* ===== PUT /api/services/:id ===== */
app.put('/api/services/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category } = req.body;
    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ error: 'Неверный ID категории' });

    const images = [];
    for (const file of req.files || []) {
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.webp';
      await sharp(file.buffer)
        .resize({ maxWidthOrHeight: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(uploadDir, filename));
      images.push(`/uploads/${filename}`);
    }

    const update = { title, description, price: Number(price), category };
    if (images.length) update.images = images;

    const oldService = await Service.findById(req.params.id);
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('category', 'name');

    const changes = {};
    ['title', 'description', 'price', 'status'].forEach((f) => {
      if (oldService[f] !== update[f]) {
        changes[f] = { old: oldService[f], new: update[f] };
      }
    });

    if (Object.keys(changes).length) {
      await ServiceHistory.create({ serviceId: oldService._id, changes });
    }

    res.json(updatedService);
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

/* ===== PATCH /api/services/sort ===== */
app.patch('/api/services/sort', async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, newOrder }]
    if (!Array.isArray(updates))
      return res.status(400).json({ error: 'updates must be an array' });

    const ops = updates.map(({ id, newOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: newOrder } },
      },
    }));

    await Service.bulkWrite(ops);
    res.json({ message: 'Порядок обновлен' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===== Excel export ===== */
app.get('/api/services/export/xlsx', async (req, res) => {
  const ExcelJS = require('exceljs');

  try {
    const services = await Service.find({ status: 'published' })
      .populate('category', 'name')
      .sort({ order: 1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Прайс-лист');

    ws.columns = [
      { header: '№', key: 'order', width: 4 },
      { header: 'Услуга', key: 'title', width: 35 },
      { header: 'Категория', key: 'category', width: 25 },
      { header: 'Цена, ₽', key: 'price', width: 12 },
    ];

    services.forEach((s, idx) =>
      ws.addRow({
        order: idx + 1,
        title: s.title || '',
        category: s.category?.name || '-',
        price: s.price || 0,
      })
    );

    const buffer = await wb.xlsx.writeBuffer();   // ← пишем в буфер
    res.setHeader('Content-Disposition', 'attachment; filename=price.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);                             // ← отправляем буфер
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка генерации Excel');
  }
});

/* ==== статика (после всех API-роутов) ==== */
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

/* ===== категории ===== */
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

/* ===== connect DB & start ===== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));