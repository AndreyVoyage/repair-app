const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  category: String,
  isActive: { type: Boolean, default: true },
  images: [String], // массив URL-адресов изображений
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);