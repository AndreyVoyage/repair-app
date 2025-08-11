import { useForm } from 'react-hook-form';
import api from '../api';

interface Inputs {
  title: string;
  description: string;
  price: number;
  category: string;
  images: FileList;
}

export default function ServiceForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset } = useForm<Inputs>();

  const onSubmit = async (data: Inputs) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    formData.append('category', data.category);
    for (let i = 0; i < data.images.length; i++) {
      formData.append('images', data.images[i]);
    }

    try {
      await api.post('/api/services', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      reset();
      onSuccess();
    } catch (error) {
      console.error('Error uploading images:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} placeholder="Название" required />
      <input {...register('description')} placeholder="Описание" required />
      <input {...register('price', { valueAsNumber: true })} placeholder="Цена" type="number" required />
      <input {...register('category')} placeholder="Категория" required />
      <input {...register('images')} type="file" multiple required />
      <button type="submit">Добавить</button>
    </form>
  );
}