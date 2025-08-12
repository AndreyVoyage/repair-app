const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // если появится авторизация
    field: String,
    oldVal: mongoose.Schema.Types.Mixed,
    newVal: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ServiceHistory', historySchema);