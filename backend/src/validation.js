const { z } = require('zod');

const serviceSchema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  price: z.number().positive('Цена должна быть положительной'),
  category: z.string().min(1, 'Категория обязательна'),
});

module.exports = serviceSchema;