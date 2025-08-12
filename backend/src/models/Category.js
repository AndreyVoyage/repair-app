const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, minlength: 2, maxlength: 30 }
});

module.exports = mongoose.model('Category', categorySchema);