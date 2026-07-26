import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { logout } from '../../store/authSlice';
import { fetchFavorites } from '../../store/favoritesSlice';
import { CATALOG_ITEMS, PRODUCT_COLORS, type CatalogItem } from '../../data/catalogItems';
import '../../styles/app.css';
import { removeFromCart, type CartItem } from '../../store/cartSlice';

type OrderStatus = 'new' | 'in_progress' | 'approved' | 'cancelled' | 'completed';
type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface OrderItem {
  id: number;
  order_id: number;
  product_id: string;
  product_name?: string;
  product_code?: string;
  color?: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: number | string;
  user_email?: string | null;
  user_name?: string | null;
  city?: string;
  fabricType?: string;
  color?: string;
  quantity?: string | number;
  total_amount?: number;
  total?: number;
  status?: OrderStatus;
  created_at?: string;
  items?: OrderItem[];
}

interface AdminUser {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  created_at: string;
  orders_count: number;
  total_spent: number;
}

interface SupportTicket {
  id: number;
  user_email?: string | null;
  user_name?: string | null;
  subject: string;
  message: string;
  status: SupportStatus;
  admin_response?: string | null;
  created_at: string;
}

interface VisualizationItem {
  id: number;
  result_url: string;
  original_url?: string | null;
  title?: string | null;
  project_id?: number | null;
  wallpaper_id?: string;
  color_hex?: string;
  method?: string;
  quality?: string;
  duration_ms?: number;
  mask_coverage?: number;
  segmentation_mode?: string;
  price?: number | null;
  room_area?: number | null;
  rolls_count?: number | null;
  created_at?: string;
}

interface VisualizationProject {
  id: number;
  title: string;
  original_url?: string | null;
  variants_count?: number;
  last_visualization_at?: string;
}

interface AdminSummary {
  orders?: { total?: number; new_orders?: number; in_progress_orders?: number };
  support?: { total?: number; open_tickets?: number; in_progress_tickets?: number };
  products?: { total?: number; active_products?: number };
  users?: { total?: number; admins?: number; customers?: number };
  visualizations?: {
    total?: number;
    avg_duration_ms?: number;
    avg_mask_coverage?: number;
    high_quality?: number;
  };
  metrics?: {
    images_count?: number;
    mean_iou?: number;
    mean_dice?: number;
    mean_precision?: number;
    mean_recall?: number;
    created_at?: string;
  };
}

const API_URL = (process.env.API_BASE_URL || '/api') as string;
const SERVER_URL = API_URL.replace(/\/api$/, '');
const ACCOUNT_REQUEST_TIMEOUT_MS = 6000;

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asObject = <T extends object>(value: unknown, fallback: T): T =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : fallback;

const orderStatusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  approved: 'Согласован',
  cancelled: 'Отменен',
  completed: 'Завершен',
};

const supportStatusLabels: Record<SupportStatus, string> = {
  open: 'Новое',
  in_progress: 'В работе',
  resolved: 'Решено',
  closed: 'Закрыто',
};

const panelStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 8,
  background: '#fdfbf7',
  border: '0.5px solid rgba(85, 107, 96, 0.26)',
};

const softPanelStyle: React.CSSProperties = {
  ...panelStyle,
  background: '#e7eee8',
};

const rowStyle: React.CSSProperties = {
  borderRadius: 8,
  border: '0.5px solid rgba(85, 107, 96, 0.26)',
  background: '#fdfbf7',
  padding: 14,
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 5,
  border: '0.5px solid rgba(85, 107, 96, 0.26)',
  font: 'inherit',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 5,
  border: 'none',
  backgroundColor: '#556b60',
  color: '#fdfbf7',
  cursor: 'pointer',
  fontWeight: 600,
};

const formatMoney = (value?: number | null) =>
  Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

const formatDate = (value?: string) => {
  if (!value) return 'Дата не указана';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Р”Р°С‚Р° РЅРµ СѓРєР°Р·Р°РЅР°';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const assetUrl = (url?: string | null) => {
  if (typeof url !== 'string') return '';
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('/static/')) return url;
  return `${SERVER_URL}${url}`;
};

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] || char
  );

const makeDefaultProductForm = () => ({
  id: '',
  code: '',
  name: '',
  description: '',
  collection: 'basic',
  colorHint: 'Молочный',
  price: '2500',
  rollSize: '1.06 x 10 м',
  density: '240 г/м2',
  active: true,
});

const Account: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { items: favoriteIds } = useSelector((state: RootState) => state.favorites);

  const [orders, setOrders] = useState<Order[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [visualizations, setVisualizations] = useState<VisualizationItem[]>([]);
  const [projects, setProjects] = useState<VisualizationProject[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminSupport, setAdminSupport] = useState<SupportTicket[]>([]);
  const [adminProducts, setAdminProducts] = useState<CatalogItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogItem[]>([]);
  const [adminSummary, setAdminSummary] = useState<AdminSummary>({});
  const [adminSearch, setAdminSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [productForm, setProductForm] = useState(makeDefaultProductForm);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const isAdmin = user?.role === 'admin';

  const jsonHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const handleAuthError = useCallback(
    (response: Response) => {
      if (response.status === 401 || response.status === 403) {
        dispatch(logout());
        return true;
      }
      return false;
    },
    [dispatch]
  );

  const fetchJson = useCallback(
    async <T,>(url: string, fallback: T, options?: RequestInit): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), ACCOUNT_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (handleAuthError(response)) return fallback;
        if (!response.ok) {
          setAccountError('Не удалось загрузить часть данных личного кабинета.');
          return fallback;
        }
        return (await response.json()) as T;
      } catch (error) {
        console.warn('Account request failed:', url, error);
        setAccountError(
          'Не удалось загрузить данные личного кабинета. Проверьте, запущен ли сервер.'
        );
        return fallback;
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [handleAuthError]
  );

  const loadUserData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setAccountError(null);
    try {
      const [ordersData, supportData, visualizationData, projectData] = await Promise.all([
        fetchJson<Order[]>(`${API_URL}/orders/my`, [], { headers: jsonHeaders }),
        fetchJson<SupportTicket[]>(`${API_URL}/support/my`, [], { headers: jsonHeaders }),
        fetchJson<VisualizationItem[]>(`${API_URL}/visualizations/my`, [], {
          headers: jsonHeaders,
        }),
        fetchJson<VisualizationProject[]>(`${API_URL}/visualization-projects/my`, [], {
          headers: jsonHeaders,
        }),
      ]);

      setOrders(asArray<Order>(ordersData));
      setSupportTickets(asArray<SupportTicket>(supportData));
      setVisualizations(asArray<VisualizationItem>(visualizationData));
      setProjects(asArray<VisualizationProject>(projectData));
    } finally {
      setLoading(false);
    }
  }, [fetchJson, jsonHeaders, token]);

  const loadAdminData = useCallback(async () => {
    if (!token || !isAdmin) return;
    const [summaryData, usersData, ordersData, supportData, productsData] = await Promise.all([
      fetchJson<AdminSummary>(`${API_URL}/admin/summary`, {}, { headers: jsonHeaders }),
      fetchJson<AdminUser[]>(`${API_URL}/admin/users`, [], { headers: jsonHeaders }),
      fetchJson<Order[]>(`${API_URL}/admin/orders`, [], { headers: jsonHeaders }),
      fetchJson<SupportTicket[]>(`${API_URL}/admin/support`, [], { headers: jsonHeaders }),
      fetchJson<CatalogItem[]>(`${API_URL}/catalog/products?includeInactive=true`, [], {
        headers: jsonHeaders,
      }),
    ]);

    setAdminSummary(asObject<AdminSummary>(summaryData, {}));
    setAdminUsers(asArray<AdminUser>(usersData));
    setAdminOrders(asArray<Order>(ordersData));
    setAdminSupport(asArray<SupportTicket>(supportData));
    setAdminProducts(asArray<CatalogItem>(productsData));
  }, [fetchJson, isAdmin, jsonHeaders, token]);

  useEffect(() => {
    void loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchFavorites());
  }, [dispatch, token]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/catalog/products`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items: CatalogItem[]) => {
        if (active) setCatalogProducts(asArray<CatalogItem>(items));
      })
      .catch(() => {
        if (active) setCatalogProducts([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const allCatalogItems = useMemo(() => {
    const dynamicItems = [...catalogProducts, ...adminProducts].map((item) => ({
      ...item,
      image: assetUrl(item.image),
    }));
    const dynamicIds = new Set(dynamicItems.map((item) => item.id));
    return [...dynamicItems, ...CATALOG_ITEMS.filter((item) => !dynamicIds.has(item.id))];
  }, [adminProducts, catalogProducts]);

  const favoriteItems = useMemo(
    () => allCatalogItems.filter((item) => favoriteIds.includes(item.id)),
    [allCatalogItems, favoriteIds]
  );

  const adminQuery = adminSearch.trim().toLowerCase();
  const filteredAdminUsers = adminUsers.filter((account) =>
    [account.name, account.email, account.role].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(adminQuery)
    )
  );

  const filteredAdminOrders = adminOrders.filter((order) => {
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const orderItemsQuery = (order.items || [])
      .map((item) =>
        [
          item.product_id,
          item.product_name,
          item.product_code,
          item.color,
          item.quantity,
          item.total,
        ].join(' ')
      )
      .join(' ');
    const matchesQuery = [
      order.id,
      order.user_name,
      order.user_email,
      order.city,
      order.fabricType,
      order.status,
      orderItemsQuery,
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(adminQuery)
    );
    return matchesStatus && matchesQuery;
  });

  const attentionCount =
    Number(adminSummary.orders?.new_orders || 0) + Number(adminSummary.support?.open_tickets || 0);
  const avgVisualizationSeconds = adminSummary.visualizations?.avg_duration_ms
    ? (adminSummary.visualizations.avg_duration_ms / 1000).toFixed(1)
    : 'н/д';
  const avgMaskCoverage =
    typeof adminSummary.visualizations?.avg_mask_coverage === 'number'
      ? `${Math.round(adminSummary.visualizations.avg_mask_coverage * 100)}%`
      : 'н/д';

  const createSupportTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;

    const response = await fetch(`${API_URL}/support`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ subject: supportSubject, message: supportMessage }),
    });

    if (handleAuthError(response)) return;
    if (response.ok) {
      setSupportSubject('');
      setSupportMessage('');
      await loadUserData();
      await loadAdminData();
    }
  };

  const updateOrderStatus = async (orderId: number | string, status: OrderStatus) => {
    const response = await fetch(`${API_URL}/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ status }),
    });
    if (handleAuthError(response)) return;
    if (response.ok) await loadAdminData();
  };

  const updateSupportTicket = async (ticket: SupportTicket, status: SupportStatus) => {
    const adminResponse =
      status === 'resolved'
        ? window.prompt('Ответ пользователю', ticket.admin_response || '')
        : ticket.admin_response || '';
    if (adminResponse === null) return;

    const response = await fetch(`${API_URL}/admin/support/${ticket.id}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ status, adminResponse }),
    });
    if (handleAuthError(response)) return;
    if (response.ok) {
      await loadUserData();
      await loadAdminData();
    }
  };

  const submitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    Object.entries(productForm).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append('colorsJson', JSON.stringify(PRODUCT_COLORS.slice(0, 5)));
    if (productImage) formData.append('image', productImage);

    const url = editingProductId
      ? `${API_URL}/catalog/products/${editingProductId}`
      : `${API_URL}/catalog/products`;

    const response = await fetch(url, {
      method: editingProductId ? 'PATCH' : 'POST',
      headers: authHeader,
      body: formData,
    });

    if (handleAuthError(response)) return;
    if (response.ok) {
      setProductForm(makeDefaultProductForm());
      setProductImage(null);
      setEditingProductId(null);
      await loadAdminData();
    }
  };

  const editProduct = (product: CatalogItem) => {
    setEditingProductId(product.id);
    setProductForm({
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description,
      collection: product.collection,
      colorHint: product.colorHint,
      price: String(product.price),
      rollSize: product.rollSize,
      density: product.density,
      active: true,
    });
  };

  const archiveProduct = async (id: string) => {
    const response = await fetch(`${API_URL}/catalog/products/${id}`, {
      method: 'DELETE',
      headers: jsonHeaders,
    });
    if (handleAuthError(response)) return;
    if (response.ok) await loadAdminData();
  };

  const renameProject = async (project: VisualizationProject) => {
    const title = window.prompt('Название проекта', project.title);
    if (!title) return;
    const response = await fetch(`${API_URL}/visualization-projects/${project.id}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ title }),
    });
    if (handleAuthError(response)) return;
    if (response.ok) await loadUserData();
  };

  const deleteVisualization = (visualizationId: number) => {
    setDeleteModal({
      open: true,
      title: 'Удалить вариант',
      message: 'Вы уверены, что хотите удалить этот вариант визуализации?',
      onConfirm: async () => {
        const response = await fetch(`${API_URL}/visualizations/${visualizationId}`, {
          method: 'DELETE',
          headers: jsonHeaders,
        });
        if (handleAuthError(response)) return;
        if (response.ok) {
          setVisualizations((prev) => prev.filter((v) => v.id !== visualizationId));
        }
        setDeleteModal({ open: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const deleteProject = (projectId: number) => {
    setDeleteModal({
      open: true,
      title: 'Удалить проект',
      message:
        'Вы уверены, что хотите удалить проект и все его варианты? Это действие нельзя отменить.',
      onConfirm: async () => {
        const response = await fetch(`${API_URL}/visualization-projects/${projectId}`, {
          method: 'DELETE',
          headers: jsonHeaders,
        });
        if (handleAuthError(response)) return;
        if (response.ok) await loadUserData();
        setDeleteModal({ open: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const printOffer = (visualization: VisualizationItem) => {
    const resultUrl = assetUrl(visualization.result_url);
    const originalUrl = assetUrl(visualization.original_url);
    const safeResultUrl = escapeHtml(resultUrl);
    const safeOriginalUrl = escapeHtml(originalUrl);
    const safeDate = escapeHtml(formatDate(visualization.created_at));
    const safeWallpaperId = escapeHtml(visualization.wallpaper_id || 'не указаны');
    const safeColor = escapeHtml(visualization.color_hex || 'не указан');
    const safePrice = escapeHtml(formatMoney(visualization.price));
    const html = `
      <html>
        <head>
          <title>Коммерческое предложение BauTex Design</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #2f332f; }
            h1 { color: #30493a; margin-bottom: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
            img { width: 100%; border-radius: 8px; border: 1px solid #ddd; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
            .total { font-size: 22px; font-weight: 700; color: #805b38; }
          </style>
        </head>
        <body>
          <h1>Коммерческое предложение BauTex Design</h1>
          <p>Вариант визуализации №${escapeHtml(visualization.id)} от ${safeDate}</p>
          <div class="grid">
            ${originalUrl ? `<figure><img src="${safeOriginalUrl}" alt="" /><figcaption>До</figcaption></figure>` : ''}
            <figure><img src="${safeResultUrl}" alt="" /><figcaption>После</figcaption></figure>
          </div>
          <div class="card">
            <p><strong>Обои:</strong> ${safeWallpaperId}</p>
            <p><strong>Цвет:</strong> ${safeColor}</p>
            <p><strong>Площадь:</strong> ${escapeHtml(visualization.room_area || 0)} м²</p>
            <p><strong>Рулонов:</strong> ${escapeHtml(visualization.rolls_count || 0)}</p>
            <p class="total">Сумма: ${safePrice} ₽</p>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=980,height=760');
    if (!printWindow) return;
    printWindow.opener = null;
    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    printWindow.addEventListener(
      'load',
      () => {
        printWindow.focus();
        printWindow.print();
        URL.revokeObjectURL(blobUrl);
      },
      { once: true }
    );
    printWindow.location.href = blobUrl;
  };

  if (!user) {
    return (
      <div className='container account-page'>
        <h1>Личный кабинет</h1>
        <p>Войдите или зарегистрируйтесь, чтобы видеть заказы, корзину и визуализации.</p>
      </div>
    );
  }

  return (
    <div className='container account-page'>
      <h1>{isAdmin ? 'Админ-панель' : 'Личный кабинет'}</h1>

      {accountError && (
        <div
          role='status'
          style={{
            marginTop: 14,
            maxWidth: 1180,
            padding: '12px 14px',
            borderRadius: 8,
            border: '0.5px solid rgba(164, 67, 49, 0.42)',
            background: 'rgba(164, 67, 49, 0.09)',
            color: '#6b2c22',
            fontSize: 14,
          }}
        >
          {accountError}
        </div>
      )}

      <div style={{ marginTop: 24, display: 'grid', gap: 24, maxWidth: 1180 }}>
        <section style={panelStyle}>
          <h2>Профиль</h2>
          <p>
            <strong>Имя:</strong> {user.name || 'Не указано'}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Роль:</strong> {isAdmin ? 'Администратор' : 'Покупатель'}
          </p>
        </section>

        {isAdmin && (
          <section style={softPanelStyle}>
            <h2>Управление сайтом</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <div style={rowStyle}>
                <strong>{attentionCount}</strong>
                <div>требуют внимания</div>
              </div>
              <div style={rowStyle}>
                <strong>{adminSummary.orders?.total || 0}</strong>
                <div>заказов</div>
              </div>
              <div style={rowStyle}>
                <strong>{adminSummary.support?.open_tickets || 0}</strong>
                <div>новых обращений</div>
              </div>
              <div style={rowStyle}>
                <strong>{adminSummary.products?.active_products || 0}</strong>
                <div>товаров в БД</div>
              </div>
            </div>

            <h3>Сводка визуализаций</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <div style={rowStyle}>
                <strong>{adminSummary.users?.total || 0}</strong>
                <div>пользователей</div>
              </div>
              <div style={rowStyle}>
                <strong>{adminSummary.visualizations?.total || 0}</strong>
                <div>визуализаций</div>
              </div>
              <div style={rowStyle}>
                <strong>{avgVisualizationSeconds} c</strong>
                <div>среднее время ML</div>
              </div>
              <div style={rowStyle}>
                <strong>{avgMaskCoverage}</strong>
                <div>средняя площадь маски</div>
              </div>
              <div style={rowStyle}>
                <strong>
                  {typeof adminSummary.metrics?.mean_iou === 'number'
                    ? adminSummary.metrics.mean_iou.toFixed(2)
                    : 'н/д'}
                </strong>
                <div>последний IoU</div>
              </div>
              <div style={rowStyle}>
                <strong>{adminSummary.metrics?.images_count || 0}</strong>
                <div>фото в ML-оценке</div>
              </div>
            </div>

            <div
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 18 }}
            >
              <input
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder='Поиск по заказам, пользователям, email, городу'
                style={inputStyle}
              />
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as 'all' | OrderStatus)}
                style={inputStyle}
              >
                <option value='all'>Все статусы</option>
                {Object.entries(orderStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <h3>Заказы</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {filteredAdminOrders.map((order) => (
                <div key={order.id} style={rowStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong>Заказ №{order.id}</strong>
                    <select
                      value={order.status || 'new'}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                      style={{ ...inputStyle, width: 180 }}
                    >
                      {Object.entries(orderStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {order.user_name || order.user_email || 'Гость'} ·{' '}
                    {order.city || 'город не указан'}
                  </div>
                  {order.items && order.items.length > 0 && (
                    <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
                      {order.items.map((item: OrderItem, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: '#735234' }}>
                          {item.product_name || item.product_id} — {item.color} × {item.quantity}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ color: '#735234', marginTop: 4 }}>
                    {formatMoney(order.total_amount ?? order.total)} ₽
                  </div>
                  <div style={{ color: '#735234' }}>{formatDate(order.created_at)}</div>
                </div>
              ))}
            </div>

            <h3>Пользователи</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {filteredAdminUsers.map((account) => (
                <div key={account.id} style={rowStyle}>
                  <strong>{account.name || 'Без имени'}</strong>
                  <div>{account.email}</div>
                  <div style={{ color: '#735234' }}>
                    Роль: {account.role}; заказов: {account.orders_count}; сумма:{' '}
                    {formatMoney(account.total_spent)} ₽
                  </div>
                </div>
              ))}
            </div>

            <h3>Поддержка</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {adminSupport.map((ticket) => (
                <div key={ticket.id} style={rowStyle}>
                  <strong>{ticket.subject}</strong>
                  <div>
                    {ticket.user_name || ticket.user_email || 'Пользователь'} ·{' '}
                    {supportStatusLabels[ticket.status]}
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{ticket.message}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type='button'
                      style={buttonStyle}
                      onClick={() => updateSupportTicket(ticket, 'in_progress')}
                    >
                      В работу
                    </button>
                    <button
                      type='button'
                      style={{ ...buttonStyle, backgroundColor: '#47624d' }}
                      onClick={() => updateSupportTicket(ticket, 'resolved')}
                    >
                      Ответить и решить
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h3>Каталог</h3>
            <form onSubmit={submitProduct} style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                }}
              >
                <input
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  placeholder='Артикул'
                  style={inputStyle}
                />
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder='Название'
                  style={inputStyle}
                />
                <input
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder='Цена'
                  type='number'
                  style={inputStyle}
                />
                <select
                  value={productForm.collection}
                  onChange={(e) => setProductForm({ ...productForm, collection: e.target.value })}
                  style={inputStyle}
                >
                  {['basic', 'loft', 'geometry', 'minimalism', 'classic', 'kids'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder='Описание'
                rows={3}
                style={inputStyle}
              />
              <input
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                style={inputStyle}
              />
              <button type='submit' style={buttonStyle}>
                {editingProductId ? 'Сохранить товар' : 'Добавить товар'}
              </button>
            </form>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {adminProducts.map((product) => (
                <div key={product.id} style={{ ...rowStyle, padding: 0, overflow: 'hidden' }}>
                  {product.image && (
                    <img
                      src={assetUrl(product.image)}
                      alt={product.name}
                      style={{ width: '100%', height: 130, objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ padding: 12 }}>
                    <strong>{product.code}</strong>
                    <div>{product.name}</div>
                    <div>{formatMoney(product.price)} ₽</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        type='button'
                        style={buttonStyle}
                        onClick={() => editProduct(product)}
                      >
                        Редактировать
                      </button>
                      <button
                        type='button'
                        style={{ ...buttonStyle, backgroundColor: '#a44331' }}
                        onClick={() => archiveProduct(product.id)}
                      >
                        Скрыть
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={softPanelStyle}>
          <h2>Избранное</h2>
          {favoriteItems.length === 0 ? (
            <p>Пока нет товаров в избранном.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {favoriteItems.map((item) => (
                <div key={item.id} style={{ ...rowStyle, padding: 0, overflow: 'hidden' }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '100%', height: 110, objectFit: 'cover' }}
                  />
                  <div style={{ padding: 12 }}>
                    <strong>{item.code}</strong>
                    <div>{item.name}</div>
                    <div>{formatMoney(item.price)} ₽</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h2>Корзина</h2>
          {cartItems.length === 0 ? (
            <p>Корзина пока пустая.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {cartItems.map((item: CartItem, index: number) => {
                const product = item.product || {};
                const quantity = Number(item.quantity || 0);

                return (
                  <div key={`${item.productId}-${item.color}-${index}`} style={rowStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong>
                        {product.code || item.productId} {product.name || ''}
                      </strong>
                      <span>{formatMoney(Number(product.price || 0) * quantity)} ₽</span>
                    </div>
                    <div style={{ color: '#735234' }}>
                      Цвет: {item.color || 'не выбран'} · количество: {quantity}
                    </div>
                    <button
                      type='button'
                      style={{ ...buttonStyle, backgroundColor: '#a44331', marginTop: 8 }}
                      onClick={() =>
                        dispatch(removeFromCart({ productId: item.productId, color: item.color }))
                      }
                    >
                      Удалить
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h2>Мои заказы</h2>
          {loading ? (
            <p>Загружаем данные...</p>
          ) : orders.length === 0 ? (
            <p>Заказов пока нет.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {orders.map((order) => (
                <div key={order.id} style={rowStyle}>
                  <strong>Заказ №{order.id}</strong>
                  <div>
                    {orderStatusLabels[order.status || 'new']} · {formatDate(order.created_at)}
                  </div>
                  <div>
                    {order.city || 'город не указан'} ·{' '}
                    {formatMoney(order.total_amount ?? order.total)} ₽
                  </div>
                  {order.items && order.items.length > 0 && (
                    <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                      {order.items.map((item: OrderItem, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: '#735234' }}>
                          {item.product_name || item.product_id} — {item.color} × {item.quantity} ={' '}
                          {formatMoney(item.total)} ₽
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontWeight: 600, marginTop: 6 }}>
                    {formatMoney(order.total_amount ?? order.total)} ₽
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={softPanelStyle}>
          <h2>Проекты визуализации</h2>
          {projects.length === 0 ? (
            <p>Проектов пока нет. Они появятся после сохранения визуализации.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {projects.map((project) => {
                const variants = visualizations.filter((item) => item.project_id === project.id);
                return (
                  <div key={project.id} style={rowStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong>{project.title}</strong>
                      <span>{project.variants_count || variants.length} вариантов</span>
                    </div>
                    {variants.length >= 2 && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                          marginTop: 10,
                        }}
                      >
                        <img
                          src={assetUrl(variants[0].result_url)}
                          alt='Вариант 1'
                          style={{
                            width: '100%',
                            height: 150,
                            objectFit: 'cover',
                            borderRadius: 8,
                          }}
                        />
                        <img
                          src={assetUrl(variants[1].result_url)}
                          alt='Вариант 2'
                          style={{
                            width: '100%',
                            height: 150,
                            objectFit: 'cover',
                            borderRadius: 8,
                          }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        type='button'
                        style={buttonStyle}
                        onClick={() => renameProject(project)}
                      >
                        Переименовать
                      </button>
                      <button
                        type='button'
                        style={{ ...buttonStyle, backgroundColor: '#a44331' }}
                        onClick={() => deleteProject(project.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h3>Сохраненные варианты</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 12,
            }}
          >
            {visualizations.map((item) => (
              <div key={item.id} style={{ ...rowStyle, padding: 0, overflow: 'hidden' }}>
                <img
                  src={assetUrl(item.result_url)}
                  alt='Визуализация'
                  style={{ width: '100%', height: 140, objectFit: 'cover' }}
                />
                <div style={{ padding: 12 }}>
                  <strong>{item.title || `Вариант №${item.id}`}</strong>
                  <div>Обои: {item.wallpaper_id || 'не указаны'}</div>
                  <div>
                    Маска:{' '}
                    {typeof item.mask_coverage === 'number'
                      ? `${Math.round(item.mask_coverage * 100)}%`
                      : 'н/д'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type='button' style={buttonStyle} onClick={() => printOffer(item)}>
                      PDF / КП
                    </button>
                    <button
                      type='button'
                      style={{ ...buttonStyle, backgroundColor: '#a44331' }}
                      onClick={() => deleteVisualization(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={softPanelStyle}>
          <h2>Поддержка</h2>
          <form onSubmit={createSupportTicket} style={{ display: 'grid', gap: 10 }}>
            <input
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder='Тема обращения'
              style={inputStyle}
            />
            <textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder='Опишите вопрос или проблему'
              rows={4}
              style={inputStyle}
            />
            <button type='submit' style={buttonStyle}>
              Отправить обращение
            </button>
          </form>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {supportTickets.map((ticket) => (
              <div key={ticket.id} style={rowStyle}>
                <strong>{ticket.subject}</strong>
                <div>
                  {supportStatusLabels[ticket.status]} · {formatDate(ticket.created_at)}
                </div>
                <p>{ticket.message}</p>
                {ticket.admin_response && (
                  <p style={{ color: '#47624d' }}>Ответ: {ticket.admin_response}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <button
            type='button'
            onClick={() => dispatch(logout())}
            style={{ ...buttonStyle, backgroundColor: '#b84c36' }}
          >
            Выйти из аккаунта
          </button>
        </section>
      </div>
      {/* Перед закрывающим </div> самого внешнего контейнера */}
      {deleteModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() =>
            setDeleteModal({ open: false, title: '', message: '', onConfirm: () => {} })
          }
        >
          <div
            style={{
              background: '#fffcf8',
              borderRadius: 16,
              padding: 32,
              maxWidth: 440,
              width: '100%',
              border: '1px solid #e0d6cc',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: '0 0 12px',
                color: '#30493a',
                fontSize: 20,
                fontFamily: "'Gothic A1', sans-serif",
              }}
            >
              {deleteModal.title}
            </h3>
            <p style={{ margin: '0 0 24px', color: '#556b60', lineHeight: 1.5 }}>
              {deleteModal.message}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={deleteModal.onConfirm}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#a44331',
                  flex: 1,
                }}
              >
                Удалить
              </button>
              <button
                onClick={() =>
                  setDeleteModal({ open: false, title: '', message: '', onConfirm: () => {} })
                }
                style={{
                  ...buttonStyle,
                  backgroundColor: '#e0d6cc',
                  color: '#4b3724',
                  flex: 1,
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account;
