export type ProductListItem = {
  index: number;
  rawText: string;
  name?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  discount?: string | null;
  rating?: string | null;
  reviewCount?: string | null;
  availability?: string | null;
  brand?: string | null;
};

export type ProductListContext = {
  type: 'product_list';
  url?: string;
  detectedAt?: string;
  totalProducts: number;
  products: ProductListItem[];
};

export type ProductCardDomManipulation = {
  type: 'highlight_product_card';
  productIndex: number;
  label?: string;
};

export type ProductCardsDomManipulation = {
  type: 'highlight_product_cards';
  productIndexes: number[];
  label?: string;
};
