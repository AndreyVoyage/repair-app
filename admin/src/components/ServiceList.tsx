import { useEffect, useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import api from '../api';
import ImagePreview from './ImagePreview';
import EditModal from './EditModal';
import type { Service } from '../types';

export default function ServiceList() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  const load = useCallback(() =>
    api.get<Service[]>(`/api/services?status=${statusFilter}`)
      .then(res => setServices(res.data))
      .catch(() => toast.error('Не удалось загрузить услуги')),
    [statusFilter]);

  const del = (id: string) =>
    api.delete(`/api/services/${id}`)
      .then(() => {
        toast.success('Удалено');
        load();
      })
      .catch(() => toast.error('Ошибка удаления'));

  const bulkAction = (action: 'delete' | 'publish' | 'draft') =>
    api.patch('/api/services/bulk', { ids: selected, action })
      .then(() => {
        toast.success('Готово');
        setSelected([]);
        load();
      })
      .catch(() => toast.error('Ошибка'));

  const move = async (id: string, delta: 1 | -1) => {
    const index = services.findIndex(s => s._id === id);
    const newOrder = services[index].order + delta;
    await api.patch('/api/services/sort', { items: [{ id, order: newOrder }] });
    load();
  };

  const exportXlsx = () => window.open('/api/services/export/xlsx', '_blank');

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Toaster position="top-center" />
      {preview && (
        <ImagePreview
          src={preview}
          open={true}
          onClose={() => setPreview(null)}
        />
      )}
      {editing && (
        <EditModal
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast.success('Сохранено');
            load();
          }}
        />
      )}

      <div style={{ marginBottom: 12 }}>
        <button onClick={exportXlsx} style={{ marginRight: 8 }}>📊 Скачать Excel</button>
        <button onClick={() => bulkAction('delete')} disabled={!selected.length}>🗑️ Удалить выбранные</button>
        <button onClick={() => bulkAction('publish')} disabled={!selected.length}>✅ Опубликовать</button>
        <button onClick={() => bulkAction('draft')} disabled={!selected.length}>📝 Черновик</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        {(['all', 'draft', 'published'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{ marginRight: 4, opacity: statusFilter === s ? 1 : 0.5 }}
          >
            {s === 'all' ? 'Все' : s === 'draft' ? 'Черновики' : 'Опубликованные'}
          </button>
        ))}
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {services.map(s => (
          <li
            key={s._id}
            style={{ borderBottom: '1px solid #ddd', padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <input
              type="checkbox"
              checked={selected.includes(s._id)}
              onChange={() =>
                setSelected(prev =>
                  prev.includes(s._id) ? prev.filter(id => id !== s._id) : [...prev, s._id]
                )
              }
            />
            <button onClick={() => move(s._id, -1)} disabled={s.order <= 0}>↑</button>
            <button onClick={() => move(s._id, 1)}>↓</button>
            <div style={{ flex: 1 }}>
              <strong>{s.title}</strong> — {s.price}₽ — {s.category?.name || '-'} — {s.status}
              <br />
              {s.images.map((img, idx) => (
                <img
                  key={idx}
                  src={`http://localhost:5000${img}`}
                  alt="preview"
                  width={80}
                  style={{ marginRight: 4, cursor: 'pointer' }}
                  onClick={() => setPreview(`http://localhost:5000${img}`)}
                />
              ))}
            </div>
            <button onClick={() => setEditing(s)}>Редактировать</button>
            <button onClick={() => del(s._id)}>Удалить</button>
          </li>
        ))}
      </ul>
    </>
  );
}