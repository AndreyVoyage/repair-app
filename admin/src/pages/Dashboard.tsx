import { useState } from 'react';
import ServiceList from '../components/ServiceList.tsx';
import ServiceForm from '../components/ServiceForm.tsx';

export default function Dashboard() {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <h1>Админ-панель</h1>
      <ServiceForm onSuccess={() => setRefresh((v) => v + 1)} />
      <ServiceList key={refresh} />
    </div>
  );
}