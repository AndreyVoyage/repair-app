import { useEffect, useState } from 'react';
import api from '../api';

interface Service {
  _id: string;
  title: string;
  price: number;
  category: string;
}

export default function ServiceList() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    api.get('/services').then((res) => setServices(res.data));
  }, []);

  return (
    <ul>
      {services.map((s) => (
        <li key={s._id}>
          {s.title} – {s.price}₽ – {s.category}
        </li>
      ))}
    </ul>
  );
}