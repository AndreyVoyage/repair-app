export interface Category {
  _id: string;
  name: string;
}

export interface Service {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: Category;          // всегда объект после populate
  status: 'draft' | 'published';
  order: number;
  images: string[];
}