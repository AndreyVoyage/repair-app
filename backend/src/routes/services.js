const express = require('express');
const router  = express.Router();
const Service = require('../models/Service');
const Category = require('../models/Category');

/* ---------- 1. Получить список услуг (фильтры + поиск) ---------- */
router.get('/', async (req, res) => {
  try {
    const { status = 'all', categoryId, q } = req.query;

    const filter = {};
    if (status !== 'all')  filter.status = status;
    if (categoryId)        filter.category = categoryId;
    if (q)                 filter.title = { $regex: q, $options: 'i' };

    const services = await Service.find(filter)
                                  .populate('category', 'name')
                                  .sort({ order: 1 });

    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- 2. Статистика ---------- */
router.get('/stats', async (_req, res) => {
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

/* ---------- 3. CRUD операции ---------- */
router.post('/', async (req, res) => {
  try {
    const { title, description, price, category, images } = req.body;
    if (!title || !price || !category) return res.status(400).json({ error: 'Missing fields' });

    const service = new Service({ title, description, price, category, images });
    await service.save();
    await service.populate('category', 'name');
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('category', 'name');
    if (!service) return res.status(404).json({ error: 'Not found' });
    res.json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- 4. Bulk операции ---------- */
router.patch('/bulk', async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || !action)
      return res.status(400).json({ error: 'Invalid body' });

    switch (action) {
      case 'delete':
        await Service.deleteMany({ _id: { $in: ids } });
        break;
      case 'publish':
        await Service.updateMany({ _id: { $in: ids } }, { status: 'published' });
        break;
      case 'draft':
        await Service.updateMany({ _id: { $in: ids } }, { status: 'draft' });
        break;
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
    res.json({ message: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- 5. Изменение порядка ---------- */
router.patch('/sort', async (req, res) => {
  try {
    const { items } = req.body; // [{ id, order }, ...]
    const bulkOps = items.map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { order } }
    }));
    await Service.bulkWrite(bulkOps);
    res.json({ message: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;