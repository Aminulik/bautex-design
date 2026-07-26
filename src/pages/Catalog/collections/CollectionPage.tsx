// ============================================
// Файл: src/pages/CollectionPage.tsx
// ============================================
import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { addToFavorites, removeFromFavorites } from '../../../store/favoritesSlice';
import { addToCart, removeFromCart, type CartItem } from '../../../store/cartSlice';
import Breadcrumbs from '../../../components/Breadcrumbs';
import ProductModal from '../ProductModal';
import {
  CATALOG_ITEMS,
  COLLECTION_INFO,
  type CatalogItem,
  type CollectionKey,
} from '../../../data/catalogItems';
import './collections.css';
const displayNames: Partial<Record<string, string>> = {
  'BASIC-1001': 'Geneva',
  'BASIC-1002': 'Пигментированный холст',
  'LOFT-2001': 'Berlin',
  'LOFT-2002': 'Rome',
  'GEOM-3001': 'Tokyo',
  'GEOM-3002': 'New York',
  'GEOM-3003': 'London',
  'MIN-4001': 'Dublin',
  'MIN-4002': 'Prague',
  'CLS-5001': 'Istanbul',
  'CLS-5002': 'Venice',
  'KIDS-6001': 'Singapore',
  'KIDS-6002': 'Rodos',
};

interface CollectionPageProps {
  collection: CollectionKey;
}

const getItemColor = (item: CatalogItem): string => {
  return item.color || item.colors?.[0]?.name || item.code;
};

const ALLOW_ANONYMOUS_FAVORITES = true;

const CollectionPage: React.FC<CollectionPageProps> = ({ collection }) => {
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const { items: favorites } = useSelector((state: RootState) => state.favorites);
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [hoveredCartItem, setHoveredCartItem] = useState<string | null>(null);

  const info = COLLECTION_INFO[collection];
  const items = useMemo(
    () => CATALOG_ITEMS.filter((item) => item.collection === collection),
    [collection]
  );

  const getQuantity = (productId: string): number => {
    return cartItems
      .filter((ci: CartItem) => ci.productId === productId)
      .reduce((sum: number, ci: CartItem) => sum + ci.quantity, 0);
  };

  const handleToggleFavorite = (id: string) => {
    if (!ALLOW_ANONYMOUS_FAVORITES && !user) {
      alert('Чтобы добавить товар в избранное, войдите в аккаунт.');
      return;
    }
    if (favorites.includes(id)) {
      dispatch(removeFromFavorites(id));
    } else {
      dispatch(addToFavorites(id));
    }
  };

  const handleCartClick = (e: React.MouseEvent, item: CatalogItem) => {
    e.stopPropagation();
    const color = getItemColor(item);
    const quantity = getQuantity(item.id);

    if (quantity > 0) {
      const itemsToRemove = cartItems.filter((ci: CartItem) => ci.productId === item.id);
      itemsToRemove.forEach((ci: CartItem) => {
        dispatch(removeFromCart({ productId: item.id, color: ci.color }));
      });
    } else {
      dispatch(addToCart({ product: item, color, quantity: 1 }));
    }
  };

  const getCartText = (item: CatalogItem): string => {
    const itemId = `${item.id}::${getItemColor(item)}`;
    const quantity = getQuantity(item.id);
    const isHovered = hoveredCartItem === itemId;

    if (quantity > 0) {
      if (isHovered) return '🗑️ Удалить';
      return `✓ ${quantity} шт.`;
    }
    return 'В корзину';
  };

  return (
    <main>
      <Breadcrumbs currentPage={info.title} />

      <section className='collection-container collection-page'>
        <div className='collection-hero'>
          <p className='collection-eyebrow'>Коллекция BauTex Design</p>
          <h1>{info.title}</h1>
          <p>{info.subtitle}</p>
        </div>

        <div className='collection-grid product-grid'>
          {items.map((item) => {
            const isFavorite = favorites.includes(item.id);
            const quantity = getQuantity(item.id);
            const itemId = `${item.id}::${getItemColor(item)}`;

            return (
              <button
                key={item.id}
                type='button'
                className='collection-item product-card'
                onClick={() => setSelectedItem(item)}
              >
                {/* Кнопка избранного */}
                <button
                  type='button'
                  className={`favorite-chip ${isFavorite ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(item.id);
                  }}
                >
                  {isFavorite ? 'В избранном' : 'В избранное'}
                </button>

                {/* Кнопка корзины */}
                <button
                  type='button'
                  className={`cart-chip ${quantity > 0 ? 'in-cart' : ''} ${hoveredCartItem === itemId && quantity > 0 ? 'remove-hover' : ''}`}
                  onClick={(e) => handleCartClick(e, item)}
                  onMouseEnter={() => setHoveredCartItem(itemId)}
                  onMouseLeave={() => setHoveredCartItem(null)}
                  title={quantity > 0 ? 'Удалить из корзины' : 'Добавить в корзину'}
                >
                  {getCartText(item)}
                </button>

                <img src={item.image} alt={item.name} />
                <div className='item-info'>
                  <h3>{displayNames[item.id] || item.code}</h3>
                  <p>{displayNames[item.id] ? item.code : item.name}</p>
                  <span>{item.price.toLocaleString('ru-RU')} ₽ / рулон</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className='collection-description'>
          <h2>О коллекции</h2>
          <p>{info.description}</p>
        </div>
      </section>

      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  );
};

export default CollectionPage;
