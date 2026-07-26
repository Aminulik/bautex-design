import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CatalogItem } from '../data/catalogItems';

export interface CartItem {
  productId: string;
  product: CatalogItem;
  color: string;
  quantity: number;
  updatedAt?: string;
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(
      state,
      action: PayloadAction<{
        product: CatalogItem;
        color: string;
        quantity: number;
      }>
    ) {
      const { product, color, quantity } = action.payload;
      const existing = state.items.find(
        (item) => item.productId === product.id && item.color === color
      );
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + quantity);
        existing.updatedAt = new Date().toISOString();
      } else {
        state.items.push({
          productId: product.id,
          product,
          color,
          quantity: Math.min(99, quantity),
          updatedAt: new Date().toISOString(),
        });
      }
    },
    removeFromCart(state, action: PayloadAction<{ productId: string; color: string }>) {
      state.items = state.items.filter(
        (item) =>
          !(item.productId === action.payload.productId && item.color === action.payload.color)
      );
    },
    updateCartQuantity(
      state,
      action: PayloadAction<{
        productId: string;
        color: string;
        quantity: number;
      }>
    ) {
      const item = state.items.find(
        (i) => i.productId === action.payload.productId && i.color === action.payload.color
      );
      if (item) {
        item.quantity = Math.min(99, Math.max(1, action.payload.quantity));
        item.updatedAt = new Date().toISOString();
      }
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, removeFromCart, updateCartQuantity, clearCart } = cartSlice.actions;

// Селекторы
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartItemsCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectProductCartQuantity = (productId: string) => (state: { cart: CartState }) =>
  state.cart.items
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0);

export default cartSlice.reducer;
