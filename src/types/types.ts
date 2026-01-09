export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface SizeOption {
  label:string;
  available: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

export interface CartItem {
  id: string;
  product: Product;
  size: string;
  quantity: number;
}
