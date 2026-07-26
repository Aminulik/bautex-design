import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { CATALOG_ITEMS, type CatalogItem } from '../../data/catalogItems';
import { removeFromFavorites } from '../../store/favoritesSlice';
import { addToCart } from '../../store/cartSlice';
import ProductModal from '../Catalog/ProductModal';
import '../Catalog/collections/collections.css';
import type { CartItem } from '../../store/cartSlice';
import '../../styles/app.css';

const API_URL = (process.env.API_BASE_URL || '/api') as string;
const SERVER_URL = API_URL.replace(/\/api$/, '');

const assetUrl = (url?: string | null) => {
  if (typeof url !== 'string') return '';
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('/static/')) return url;
  return `${SERVER_URL}${url}`;
};

const getItemColor = (item: CatalogItem): string => {
  return item.color || item.colors?.[0]?.name || item.code;
};

const Favorites: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: favorites } = useSelector((state: RootState) => state.favorites);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogItem[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/catalog/products`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items: CatalogItem[]) => {
        if (active) setCatalogProducts(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (active) setCatalogProducts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const favoriteItems = useMemo(() => {
    const dynamicItems = catalogProducts.map((item) => ({ ...item, image: assetUrl(item.image) }));
    const dynamicIds = new Set(dynamicItems.map((item) => item.id));
    return [...dynamicItems, ...CATALOG_ITEMS.filter((item) => !dynamicIds.has(item.id))].filter(
      (item) => favorites.includes(item.id)
    );
  }, [catalogProducts, favorites]);

  const getQuantity = (productId: string): number => {
    return cartItems
      .filter((ci: CartItem) => ci.productId === productId)
      .reduce((sum: number, ci: CartItem) => sum + ci.quantity, 0);
  };

  const handleCartClick = (e: React.MouseEvent, item: CatalogItem) => {
    e.stopPropagation();
    const color = getItemColor(item);
    dispatch(addToCart({ product: item, color, quantity: 1 }));
  };

  return (
    <main>
      <section className='collection-container catalog-page'>
        <div className='collection-hero'>
          <p className='collection-eyebrow'>Личный выбор</p>
          <h1>Избранные товары</h1>
          <p>Сохраненные фактуры доступны здесь и в личном кабинете после входа.</p>
        </div>

        {favoriteItems.length === 0 ? (
          <p className='catalog-empty'>У вас пока нет избранных товаров.</p>
        ) : (
          <div className='collection-grid product-grid'>
            {favoriteItems.map((item) => {
              const cartQuantity = getQuantity(item.id);
              return (
                <article key={item.id} className='collection-item product-card'>
                  <button
                    type='button'
                    className='favorite-chip active'
                    onClick={(event) => {
                      event.stopPropagation();
                      dispatch(removeFromFavorites(item.id));
                    }}
                  >
                    Убрать
                  </button>

                  {/* Кнопка корзины */}
                  <button
                    type='button'
                    className={`cart-chip ${cartQuantity > 0 ? 'in-cart' : ''}`}
                    onClick={(e) => handleCartClick(e, item)}
                    title={
                      cartQuantity > 0 ? `В корзине: ${cartQuantity} шт.` : 'Добавить в корзину'
                    }
                  >
                    {cartQuantity > 0 ? `✓ ${cartQuantity} шт.` : 'В корзину'}
                  </button>

                  <button
                    type='button'
                    className='product-card-open'
                    onClick={() => setSelectedItem(item)}
                  >
                    <img src={item.image} alt={item.name} />
                    <div className='item-info'>
                      <h3>{item.code}</h3>
                      <p>{item.name}</p>
                      <span>{item.price.toLocaleString('ru-RU')} ₽ / рулон</span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  );
};

export default Favorites;
