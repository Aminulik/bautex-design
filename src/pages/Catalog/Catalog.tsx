import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { addToFavorites, removeFromFavorites } from '../../store/favoritesSlice';
import { addToCart, removeFromCart } from '../../store/cartSlice';
import {
  CATALOG_ITEMS,
  COLLECTION_INFO,
  type CatalogItem,
  type CollectionKey,
} from '../../data/catalogItems';
import ProductModal from './ProductModal';
import Breadcrumbs from '../../components/Breadcrumbs';
import '../../styles/app.css';
import './collections/collections.css';
import type { CartItem } from '../../store/cartSlice';

const ALLOW_ANONYMOUS_FAVORITES = true;
const API_URL = (process.env.API_BASE_URL || '/api') as string;
const API_ORIGIN = API_URL.replace(/\/api$/, '');

const getRemoteImageUrl = (image?: string) => {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('data:') || image.startsWith('/static/'))
    return image;
  return image.startsWith('/') ? `${API_ORIGIN}${image}` : image;
};

const getItemColor = (item: CatalogItem): string => {
  return item.color || item.colors?.[0]?.name || item.code;
};

const Catalog: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: favorites } = useSelector((state: RootState) => state.favorites);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const { user } = useSelector((state: RootState) => state.auth);

  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<'all' | CollectionKey>('all');
  const [styleFilter, setStyleFilter] = useState<'all' | 'neutral' | 'accent' | 'relief'>('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<'code-asc' | 'code-desc' | 'name-asc' | 'price-asc'>('code-asc');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [adminCatalogItems, setAdminCatalogItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/catalog/products`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items: CatalogItem[]) => {
        if (!active) return;
        setAdminCatalogItems(
          items.map((item) => ({ ...item, image: getRemoteImageUrl(item.image) }))
        );
      })
      .catch(() => {
        if (active) setAdminCatalogItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const customIds = new Set(adminCatalogItems.map((item) => item.id));
    let list = [...adminCatalogItems, ...CATALOG_ITEMS.filter((item) => !customIds.has(item.id))];

    if (collectionFilter !== 'all')
      list = list.filter((item) => item.collection === collectionFilter);
    if (styleFilter !== 'all') {
      list = list.filter((item) => {
        if (styleFilter === 'neutral') return ['basic', 'minimalism'].includes(item.collection);
        if (styleFilter === 'accent')
          return ['geometry', 'classic', 'kids'].includes(item.collection);
        return Number(item.density.replace(/\D/g, '')) >= 270 || item.collection === 'loft';
      });
    }
    const min = Number(priceMin),
      max = Number(priceMax);
    if (!Number.isNaN(min) && priceMin.trim()) list = list.filter((item) => item.price >= min);
    if (!Number.isNaN(max) && priceMax.trim()) list = list.filter((item) => item.price <= max);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sort === 'code-asc') return a.code.localeCompare(b.code, 'ru');
      if (sort === 'code-desc') return b.code.localeCompare(a.code, 'ru');
      if (sort === 'price-asc') return a.price - b.price;
      return a.name.localeCompare(b.name, 'ru');
    });
    return list;
  }, [adminCatalogItems, collectionFilter, priceMax, priceMin, search, sort, styleFilter]);

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
    if (favorites.includes(id)) dispatch(removeFromFavorites(id));
    else dispatch(addToFavorites(id));
  };

  const handleCartClick = (e: React.MouseEvent, item: CatalogItem) => {
    e.stopPropagation();
    e.preventDefault();
    const quantity = getQuantity(item.id);
    if (quantity > 0) {
      cartItems
        .filter((ci: CartItem) => ci.productId === item.id)
        .forEach((ci: CartItem) => {
          dispatch(removeFromCart({ productId: item.id, color: ci.color }));
        });
    } else {
      const color = getItemColor(item);
      dispatch(addToCart({ product: item, color, quantity: 1 }));
    }
  };

  return (
    <main>
      <Breadcrumbs currentPage='Каталог' />
      <section className='collection-container catalog-page'>
        <div className='collection-hero catalog-hero'>
          <p className='collection-eyebrow'>Каталог BauTex Design</p>
          <h1>Жаккардовые обои под покраску</h1>
          <p>
            Выберите коллекцию, фактуру и цвет покраски. Карточка товара откроется поверх каталога.
          </p>
        </div>
        <div className='catalog-toolbar'>
          <input
            type='text'
            placeholder='Поиск по артикулу, названию или описанию'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value as 'all' | CollectionKey)}
          >
            <option value='all'>Все коллекции</option>
            {Object.entries(COLLECTION_INFO).map(([key, value]) => (
              <option key={key} value={key}>
                {value.title}
              </option>
            ))}
          </select>
          <select
            value={styleFilter}
            onChange={(e) =>
              setStyleFilter(e.target.value as 'all' | 'neutral' | 'accent' | 'relief')
            }
          >
            <option value='all'>Все стили</option>
            <option value='neutral'>Спокойные</option>
            <option value='accent'>Акцентные</option>
            <option value='relief'>Выраженный рельеф</option>
          </select>
          <input
            type='number'
            min='0'
            placeholder='Цена от'
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <input
            type='number'
            min='0'
            placeholder='Цена до'
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as 'code-asc' | 'code-desc' | 'name-asc' | 'price-asc')
            }
          >
            <option value='code-asc'>Артикул ↑</option>
            <option value='code-desc'>Артикул ↓</option>
            <option value='name-asc'>Название</option>
            <option value='price-asc'>Цена ↑</option>
          </select>
        </div>
        <div className='collection-grid product-grid'>
          {filteredItems.map((item) => {
            const isFavorite = favorites.includes(item.id);
            const cartQuantity = getQuantity(item.id);
            return (
              <article key={item.id} className='collection-item product-card'>
                <button
                  type='button'
                  className={`favorite-chip ${isFavorite ? 'active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleToggleFavorite(item.id);
                  }}
                >
                  {isFavorite ? 'В избранном' : 'В избранное'}
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
                <button
                  type='button'
                  className={`cart-chip ${cartQuantity > 0 ? 'in-cart' : ''}`}
                  onClick={(e) => handleCartClick(e, item)}
                  title={cartQuantity > 0 ? 'Удалить из корзины' : 'Добавить в корзину'}
                >
                  {cartQuantity > 0 ? `✓ ${cartQuantity} шт.` : 'В корзину'}
                </button>
              </article>
            );
          })}
        </div>
        {filteredItems.length === 0 && <p className='catalog-empty'>Ничего не найдено.</p>}
      </section>
      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  );
};

export default Catalog;
