import { useEffect, useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../api';
import ImagePreview from './ImagePreview';
import EditModal from './EditModal';
import type { Service } from '../types';
import type { DragEndEvent } from '@dnd-kit/core'; // Исправленный импорт типа

const SortableServiceItem = ({ 
  service, 
  index,
  total,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onImagePreview,
  onArrowClick
}: { 
  service: Service;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  onImagePreview: (url: string) => void;
  onArrowClick: (id: string, direction: 'up' | 'down') => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: service._id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        borderBottom: '1px solid #ddd',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#fff',
        marginBottom: '8px',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        opacity: service.status === 'draft' ? 0.7 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(service._id)}
      />
      
      {/* Кнопки стрелок */}
      <button
        onClick={() => onArrowClick(service._id, 'up')}
        style={{
          opacity: index === 0 ? 0.3 : 1,
          cursor: index === 0 ? 'not-allowed' : 'pointer',
          backgroundColor: index === 0 ? '#f0f0f0' : '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '4px 8px',
        }}
        disabled={index === 0}
      >
        ↑
      </button>
      
      <button
        onClick={() => onArrowClick(service._id, 'down')}
        style={{
          opacity: index === total - 1 ? 0.3 : 1,
          cursor: index === total - 1 ? 'not-allowed' : 'pointer',
          backgroundColor: index === total - 1 ? '#f0f0f0' : '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '4px 8px',
        }}
        disabled={index === total - 1}
      >
        ↓
      </button>
      
      {/* Ручка для перетаскивания */}
      <button
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '4px 8px',
          backgroundColor: '#f8f8f8',
        }}
      >
        ≡
      </button>
      
      <div style={{ flex: 1 }}>
        <strong>{service.title}</strong> — {service.price}₽ — {service.category?.name || '-'} — {service.status}
        <br />
        {service.images?.map((img, idx) => (
          <img
            key={idx}
            src={`http://localhost:5000${img}`}
            alt="preview"
            width={80}
            height={60}
            style={{ 
              marginRight: 4, 
              cursor: 'pointer',
              objectFit: 'cover',
              borderRadius: 4,
              border: '1px solid #eee'
            }}
            onClick={() => onImagePreview(`http://localhost:5000${img}`)}
          />
        ))}
      </div>
      
      <button 
        onClick={() => onEdit(service)}
        style={{ 
          padding: '6px 12px', 
          border: '1px solid #ddd', 
          borderRadius: '4px' 
        }}
      >
        Редактировать
      </button>
      
      <button 
        onClick={() => onDelete(service._id)}
        style={{ 
          padding: '6px 12px', 
          border: '1px solid #ddd', 
          borderRadius: '4px', 
          backgroundColor: '#ffebee' 
        }}
      >
        Удалить
      </button>
    </li>
  );
};

export default function ServiceList() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

 /* === 1. Сенсоры (без args) === */
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
);

  const loadServices = useCallback(() => {
    api.get<Service[]>(`/api/services?status=${statusFilter}`)
      .then(res => setServices(res.data.sort((a, b) => a.order - b.order)))
      .catch(() => toast.error('Не удалось загрузить услуги'));
  }, [statusFilter]);

  const deleteService = useCallback((id: string) => {
    api.delete(`/api/services/${id}`)
      .then(() => {
        toast.success('Удалено');
        loadServices();
      })
      .catch(() => toast.error('Ошибка удаления'));
  }, [loadServices]);

  const bulkAction = useCallback((action: 'delete' | 'publish' | 'draft') => {
    api.patch('/api/services/bulk', { ids: selected, action })
      .then(() => {
        toast.success('Готово');
        setSelected([]);
        loadServices();
      })
      .catch(() => toast.error('Ошибка'));
  }, [selected, loadServices]);

  /* === 2. Обработка ошибки (err используется) === */
const updateServiceOrder = useCallback(async (newServices: Service[]) => {
  const updates = newServices.map((service, index) => ({
    id: service._id,
    newOrder: index,
  }));

  try {
    // оптимистично
    setServices(newServices);
    await api.patch('/api/services/sort', { updates });
  } catch (err: unknown) {
  const msg = (err as Error)?.message || 'Не удалось обновить порядок';
  toast.error(msg);
  loadServices();
}
}, [loadServices]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeIndex = services.findIndex(s => s._id === active.id);
      const overIndex = services.findIndex(s => s._id === over.id);
      
      const newServices = arrayMove(services, activeIndex, overIndex);
      updateServiceOrder(newServices);
    }
  }, [services, updateServiceOrder]);

  const handleArrowClick = useCallback((id: string, direction: 'up' | 'down') => {
    const currentIndex = services.findIndex(s => s._id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Проверка границ
    if (newIndex < 0 || newIndex >= services.length) return;

    const newServices = [...services];
    [newServices[currentIndex], newServices[newIndex]] = 
      [newServices[newIndex], newServices[currentIndex]];
    
    updateServiceOrder(newServices);
  }, [services, updateServiceOrder]);

  const handleSelect = useCallback((id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id) 
        : [...prev, id]
    );
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

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
            loadServices();
          }}
        />
      )}

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a 
          href="http://localhost:5000/api/services/export/xlsx" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: '#fff',
            borderRadius: 4,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>📊</span> Скачать Excel
        </a>
        
        <button 
          onClick={() => bulkAction('delete')} 
          disabled={!selected.length}
          style={{
            padding: '8px 16px',
            background: !selected.length ? '#ccc' : '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: !selected.length ? 'not-allowed' : 'pointer',
          }}
        >
          🗑️ Удалить выбранные
        </button>
        
        <button 
          onClick={() => bulkAction('publish')} 
          disabled={!selected.length}
          style={{
            padding: '8px 16px',
            background: !selected.length ? '#ccc' : '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: !selected.length ? 'not-allowed' : 'pointer',
          }}
        >
          ✅ Опубликовать
        </button>
        
        <button 
          onClick={() => bulkAction('draft')} 
          disabled={!selected.length}
          style={{
            padding: '8px 16px',
            background: !selected.length ? '#ccc' : '#FFC107',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: !selected.length ? 'not-allowed' : 'pointer',
          }}
        >
          📝 В черновик
        </button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {(['all', 'draft', 'published'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 12px',
              background: statusFilter === s ? '#2196F3' : '#e0e0e0',
              color: statusFilter === s ? '#fff' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {s === 'all' ? 'Все' : s === 'draft' ? 'Черновики' : 'Опубликованные'}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={services.map(s => s._id)} 
          strategy={verticalListSortingStrategy}
        >
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {services.map((service, index) => (
              <SortableServiceItem
                key={service._id}
                service={service}
                index={index}
                total={services.length}
                isSelected={selected.includes(service._id)}
                onSelect={handleSelect}
                onEdit={setEditing}
                onDelete={deleteService}
                onImagePreview={setPreview}
                onArrowClick={handleArrowClick}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}