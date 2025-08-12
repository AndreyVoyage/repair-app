import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api';
import { useEffect, useState } from 'react';
import type { Service, Category } from '../types';

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  category: z.string().min(1),
});
type Inputs = z.infer<typeof schema>;

interface Props {
  service: Service;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditModal({ service, onClose, onSaved }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<Inputs>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: service.title,
      description: service.description,
      price: service.price,
      category: service.category._id,
    },
  });

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    api.get<Category[]>('/api/categories')
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  const onSubmit = async (data: Inputs) => {
    await api.put(`/api/services/${service._id}`, data);
    onSaved();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Редактировать услугу</h2>
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

          <button type="submit">Сохранить</button>
          <button type="button" onClick={onClose}>Отмена</button>
        </form>
      </div>
    </div>
  );
}