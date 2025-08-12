import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api';

export default function CategoryManager({ onChange }: { onChange: () => void }) {
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  /* ---------- CRUD ---------- */

  const load = () =>
    api.get('/api/categories')
      .then(res => setCategories(res.data))
      .catch(() => {});

  const add = () => {
    if (!newName.trim()) return;
    api.post('/api/categories', { name: newName.trim() })
      .then(() => {
        setNewName('');
        load();
        onChange();
        toast.success('Категория добавлена');
      })
      .catch(err => toast.error(err.response?.data?.error || 'Ошибка'));
  };

  const update = (id: string) => {
    if (!editName.trim()) return;
    api.put(`/api/categories/${id}`, { name: editName.trim() })
      .then(() => {
        setEditingId(null);
        setEditName('');
        load();
        onChange();
        toast.success('Категория обновлена');
      })
      .catch(err => toast.error(err.response?.data?.error || 'Ошибка'));
  };

  const del = (id: string) => {
    if (!window.confirm('Удалить категорию?')) return;
    api.delete(`/api/categories/${id}`)
      .then(() => {
        load();
        onChange();
        toast.success('Категория удалена');
      })
      .catch(err => toast.error(err.response?.data?.error || 'Ошибка'));
  };

  /* ---------- жизненный цикл ---------- */

  useEffect(() => {
    load();
  }, []);

  /* ---------- разметка ---------- */

  return (
    <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16 }}>
      <h3>Управление категориями</h3>

      {/* добавление */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Новая категория"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          maxLength={30}
        />
        <button onClick={add}>Добавить</button>
      </div>

      {/* список */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {categories.map(c =>
          editingId === c._id ? (
            <li key={c._id} style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
                maxLength={30}
              />
              <button onClick={() => update(c._id)}>✔</button>
              <button onClick={() => setEditingId(null)}>✖</button>
            </li>
          ) : (
            <li
              key={c._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4
              }}
            >
              <span>{c.name}</span>
              <div>
                <button onClick={() => { setEditingId(c._id); setEditName(c.name); }}>
                  ✏️
                </button>
                <button onClick={() => del(c._id)} style={{ marginLeft: 4 }}>
                  🗑️
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}