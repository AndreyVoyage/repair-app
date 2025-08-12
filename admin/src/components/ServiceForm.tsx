import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api';
import CategoryManager from './CategoryManager';
import imageCompression from 'browser-image-compression';

const schema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  price: z.number().positive('Цена > 0'),
  category: z.string().min(1, 'Категория обязательна'),
  status: z.enum(['draft', 'published']),
});
type Inputs = z.infer<typeof schema>;

interface Category {
  _id: string;
  name: string;
}

export default function ServiceForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Inputs>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft' },
  });

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.get<Category[]>('/api/categories')
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  const onSubmit = async (data: Inputs) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    formData.append('category', data.category);
    formData.append('status', data.status);

    const el = document.querySelector('input[name="images"]') as HTMLInputElement;
    if (el.files) {
      const options = { maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' };
      for (const file of Array.from(el.files)) {
        const compressed = await imageCompression(file, options);
        formData.append('images', compressed);
      }
    }

    try {
      await api.post('/api/services', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      reset();
      onSuccess();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || String(err);
      console.error(msg);
    }
  };

  return (
    <>
      <CategoryManager onChange={() => api.get<Category[]>('/api/categories').then(res => setCategories(res.data))} />
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input placeholder="Название" {...register('title')} />
        {errors.title && <small style={{ color: 'red' }}>{errors.title.message}</small>}

        <input placeholder="Описание" {...register('description')} />
        {errors.description && <small style={{ color: 'red' }}>{errors.description.message}</small>}

        <input placeholder="Цена" type="number" {...register('price', { valueAsNumber: true })} />
        {errors.price && <small style={{ color: 'red' }}>{errors.price.message}</small>}

        <select {...register('category')} required>
          <option value="">Выберите категорию</option>
          {categories.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <select {...register('status')}>
          <option value="draft">Черновик</option>
          <option value="published">Опубликовано</option>
        </select>

        <input type="file" multiple accept="image/*" name="images" />
        <button type="submit">Добавить</button>
      </form>
    </>
  );
}