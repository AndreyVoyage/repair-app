const express = require('express');
const Category = require('../models/Category');
const Service = require('../models/Service');
const router = express.Router();

// GET
router.get('/', async (_, res) => {
  const cats = await Category.find().sort({ name: 1 });
  res.json(cats);
});

// POST
router.post('/', async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name || name.length < 2) return res.status(400).json({ error: 'Минимум 2 символа' });
    const cat = new Category({ name });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Категория уже существует' });
    res.status(400).json({ error: err.message });
  }
});

// PUT
router.put('/:id', async (req, res) => {
  const name = req.body.name?.trim();
  if (!name || name.length < 2) return res.status(400).json({ error: 'Минимум 2 символа' });
  const updated = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Не найдено' });
  res.json(updated);
});

// DELETE
router.delete('/:id', async (req, res) => {
  const used = await Service.exists({ category: req.params.id });
  if (used) return res.status(400).json({ error: 'Категория используется' });
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Удалено' });
});

module.exports = router;