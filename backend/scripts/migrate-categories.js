#!/usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Service = require('../src/models/Service');
const Category = require('../src/models/Category');

mongoose.set('strictQuery', false);

(async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
  const services = await Service.find();
  console.log(`Найдено услуг: ${services.length}`);
  for (const s of services) {
    if (typeof s.category === 'string') {
      let cat = await Category.findOne({ name: s.category });
      if (!cat) cat = await Category.create({ name: s.category });
      s.category = cat._id;
      await s.save();
    }
  }
  console.log('✅ миграция завершена');
  mongoose.disconnect();
})();