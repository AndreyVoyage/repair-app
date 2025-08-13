const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    images: [String],
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    slug: { type: String, unique: true },
    metaTitle: String,
    metaDescription: String,
  },
  { timestamps: true }
);

// авто-slug из title
serviceSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.metaTitle = this.title;
    this.metaDescription = this.description?.slice(0, 150) || '';
  }
  next();
});

module.exports = mongoose.model('Service', serviceSchema);