import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import './Visualization.css';
import Breadcrumbs from '../../components/Breadcrumbs';
import wallpaperSoftPlaster from '../../assets/fabrics/basic/wallpaper-soft-plaster.jpg';
import wallpaperBotanicalLine from '../../assets/fabrics/basic/wallpaper-soft-plaster.jpg';
import wallpaperBotanicalGray from '../../assets/fabrics/basic/wallpaper-soft-plaster.jpg';
import wallpaperReliefStone from '../../assets/fabrics/basic/wallpaper-soft-plaster.jpg';
import wallpaperAbstractRelief from '../../assets/fabrics/basic/wallpaper-soft-plaster.jpg';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { CartItem } from '../../store/cartSlice';
import { CATALOG_ITEMS, type CatalogItem, type ProductColor } from '../../data/catalogItems';

interface Wallpaper {
  id: string;
  name: string;
  url: string;
}

interface ProcessingInfo {
  method: string;
  text: string;
  icon: string;
  quality: 'high' | 'medium' | 'low';
  suggestManualMask: boolean;
  duration: number | null;
  maskCoverage: number | null;
  segmentationMode: string;
  renderMode: RenderMode;
  autoFallbackUsed?: boolean;
  visualizationId?: number | null;
}
interface CartSelection {
  checked: boolean;
  quantity: number;
}
interface SelectedCartItem extends CartItem {
  selectedQuantity: number;
  checked: boolean;
}
interface TryOnItem {
  key: string;
  source: 'cart' | 'favorite';
  productId: string;
  product: CatalogItem;
  color: string;
  colorHex: string;
  colorIntensity: number;
  quantity: number;
}

type SegmentationMode = 'segformer' | 'heuristic';
type RenderMode = 'catalog' | 'realistic' | 'contrast';
type MaskTool = 'brush' | 'eraser';

const API_URL = (process.env.API_BASE_URL || '/api') as string;
const API_BASE_URL = API_URL.replace(/\/api$/, '');

const COLOR_SWATCHES = [
  { name: 'Stone', value: '#a7a9a5' },
  { name: 'Forest', value: '#425f52' },
  { name: 'Rose', value: '#c9838c' },
  { name: 'Mauve', value: '#826d78' },
  { name: 'Sand', value: '#efd5b6' },
  { name: 'Sage', value: '#9ab29f' },
  { name: 'Tokyo', value: '#8199ad' },
  { name: 'Clay', value: '#deb6ae' },
  { name: 'Wine', value: '#9d263d' },
  { name: 'Petrol', value: '#1f6a7f' },
];

const RENDER_OPTIONS: Array<{
  value: RenderMode;
  title: string;
  description: string;
}> = [
  {
    value: 'catalog',
    title: 'Точно как в каталоге',
    description: 'Сильнее сохраняет рисунок выбранных обоев.',
  },
  {
    value: 'realistic',
    title: 'Реалистично',
    description: 'Мягче смешивает обои с тенями и освещением комнаты.',
  },
  {
    value: 'contrast',
    title: 'Показать фактуру',
    description: 'Делает паттерн заметнее для демонстрации материала.',
  },
];

const DEFAULT_WALLPAPERS: Wallpaper[] = [
  { id: '1', name: 'Soft plaster', url: wallpaperSoftPlaster },
  { id: '2', name: 'Botanical line', url: wallpaperBotanicalLine },
  { id: '3', name: 'Gray botanical', url: wallpaperBotanicalGray },
  { id: '4', name: 'Stone relief', url: wallpaperReliefStone },
  { id: '5', name: 'Abstract relief', url: wallpaperAbstractRelief },
];

const getWallpaperImageUrl = (url: string) => {
  if (
    url.startsWith('http') ||
    url.startsWith('data:') ||
    url.startsWith('/static/') ||
    url.startsWith('/images/')
  ) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
};
const cartKey = (item: CartItem) => `${item.productId}::${item.color}`;
const favoriteKey = (productId: string) => `favorite::${productId}`;

const findProductColor = (product: CatalogItem, colorName?: string): ProductColor | undefined =>
  product.colors.find((color) => color.name === colorName) || product.colors[0];

const makeTryOnItem = (item: CartItem): TryOnItem => {
  const productColor = findProductColor(item.product, item.color);

  return {
    key: `cart::${cartKey(item)}`,
    source: 'cart',
    productId: item.productId,
    product: item.product,
    color: item.color,
    colorHex: productColor?.hex || '#d8c3a5',
    colorIntensity: productColor?.intensity ?? 0.35,
    quantity: item.quantity || 1,
  };
};

const Visualization: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState('1');
  const [selectedColor, setSelectedColor] = useState('#d8c3a5');
  const [colorIntensity, setColorIntensity] = useState(0.35);
  const [wallpaperScale, setWallpaperScale] = useState(1);
  const [segmentationMode] = useState<SegmentationMode>('segformer');
  const [renderMode, setRenderMode] = useState<RenderMode>('catalog');
  const [projectTitle] = useState('Комната BauTex');
  const [roomArea] = useState('18');
  const [rollPrice, setRollPrice] = useState('2500');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{
    text: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({ text: '', type: 'info' });
  const [drawingMode, setDrawingMode] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [maskTool, setMaskTool] = useState<MaskTool>('brush');
  const [processingInfo, setProcessingInfo] = useState<ProcessingInfo | null>(null);
  const [showManualRetry, setShowManualRetry] = useState(false);
  const [photoWarnings, setPhotoWarnings] = useState<string[]>([]);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(DEFAULT_WALLPAPERS);
  const [supportStatus, setSupportStatus] = useState('');
  // НОВЫЕ состояния для корзины
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const favoriteIds = useSelector((state: RootState) => state.favorites.items);
  const [cartSelection, setCartSelection] = useState<Record<string, CartSelection>>({});
  const [useSavedWallpapers, setUseSavedWallpapers] = useState<'cart' | 'favorites' | null>('cart');
  const [selectedSavedWallpaperKey, setSelectedSavedWallpaperKey] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadComment, setDownloadComment] = useState('');
  const [downloadFileName, setDownloadFileName] = useState('visualization');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/wallpapers`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Wallpaper[]) => {
        if (data.length > 0) setWallpapers(data);
      })
      .catch(() => setWallpapers(DEFAULT_WALLPAPERS));
  }, []);

  // НОВОЕ: синхронизация выбора корзины
  useEffect(() => {
    setCartSelection((prev) => {
      const next = { ...prev };
      cartItems.forEach((item: CartItem) => {
        const key = cartKey(item);
        if (!next[key]) {
          next[key] = {
            checked: true,
            quantity: Math.max(1, Number(item.quantity || 1)),
          };
        }
      });
      Object.keys(next).forEach((key) => {
        if (!cartItems.some((item: CartItem) => cartKey(item) === key)) delete next[key];
      });
      return next;
    });
  }, [cartItems]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      abortControllerRef.current?.abort();
    };
  }, [preview]);

  // НОВОЕ: выбранные товары из корзины
  const selectedCartItems = useMemo(
    () =>
      cartItems
        .map(
          (item: CartItem): SelectedCartItem => ({
            ...item,
            selectedQuantity: cartSelection[cartKey(item)]?.quantity || item.quantity || 1,
            checked: cartSelection[cartKey(item)]?.checked ?? true,
          })
        )
        .filter((item: SelectedCartItem) => item.checked && item.selectedQuantity > 0),
    [cartItems, cartSelection]
  );

  const favoriteTryOnItems = useMemo<TryOnItem[]>(
    () =>
      favoriteIds
        .map((productId: string) => {
          const product = CATALOG_ITEMS.find((item: CatalogItem) => item.id === productId);
          if (!product) return null;

          const cartMatch = cartItems.find((item: CartItem) => item.productId === productId);
          const productColor = findProductColor(product, cartMatch?.color || product.color);

          return {
            key: favoriteKey(productId),
            source: 'favorite' as const,
            productId,
            product,
            color: cartMatch?.color || product.color,
            colorHex: productColor?.hex || '#d8c3a5',
            colorIntensity: productColor?.intensity ?? 0.35,
            quantity: cartMatch?.quantity || 1,
          };
        })
        .filter((item: TryOnItem | null): item is TryOnItem => Boolean(item)),
    [cartItems, favoriteIds]
  );

  const savedTryOnItems = useMemo<TryOnItem[]>(() => {
    if (useSavedWallpapers === 'cart') return selectedCartItems.map(makeTryOnItem);
    if (useSavedWallpapers === 'favorites') return favoriteTryOnItems;
    return [];
  }, [favoriteTryOnItems, selectedCartItems, useSavedWallpapers]);

  // НОВОЕ: обновление выбора в корзине
  const updateCartSelection = (key: string, patch: Partial<CartSelection>) => {
    setCartSelection((prev) => ({
      ...prev,
      [key]: {
        checked: prev[key]?.checked ?? true,
        quantity: prev[key]?.quantity ?? 1,
        ...patch,
      },
    }));
  };

  const handleSelectSavedWallpaper = (item: TryOnItem) => {
    setSelectedSavedWallpaperKey(item.key);
    setUseSavedWallpapers(item.source === 'favorite' ? 'favorites' : 'cart');
    setSelectedWallpaper(item.productId);
    setSelectedColor(item.colorHex);
    setColorIntensity(item.colorIntensity);

    if (item.product.price) {
      setRollPrice(String(item.product.price));
    }
  };

  const checkPhoto = async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/visualize/check`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) return;
      const data = await response.json();
      setPhotoWarnings(data.suggestions || []);

      if (data.warnings?.length > 0) {
        setStatus({
          text: `Есть особенности фото: ${data.suggestions.join(', ')}`,
          type: 'warning',
        });
      }
    } catch {
      setPhotoWarnings([]);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus({ text: 'Используйте JPG, PNG или WEBP.', type: 'error' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus({ text: 'Файл больше 10 MB.', type: 'error' });
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
    setResult(null);
    setMaskPreview(null);
    setProcessingInfo(null);
    setShowManualRetry(false);
    setPhotoWarnings([]);
    setSupportStatus('');
    setDrawingMode(false);
    setStatus({ text: 'Фото загружено. Проверяем качество снимка...', type: 'info' });
    await checkPhoto(file);
  };

  const initCanvas = () => {
    if (!imageRef.current || !canvasRef.current || !maskCanvasRef.current) return;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    [canvas, maskCanvas].forEach((item) => {
      item.width = image.naturalWidth;
      item.height = image.naturalHeight;
      item.style.width = '100%';
      item.style.height = 'auto';
    });

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  const renderMaskOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !maskCtx || !canvas.width || !canvas.height) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const overlayImageData = ctx.createImageData(canvas.width, canvas.height);
    const color = selectedColor.replace('#', '');
    const colorNumber = Number.parseInt(
      color.length === 3 ? color.replace(/(.)/g, '$1$1') : color,
      16
    );
    const overlayR = Number.isFinite(colorNumber) ? (colorNumber >> 16) & 255 : 74;
    const overlayG = Number.isFinite(colorNumber) ? (colorNumber >> 8) & 255 : 97;
    const overlayB = Number.isFinite(colorNumber) ? colorNumber & 255 : 77;
    const overlayAlpha = Math.round(
      Math.min(0.52, Math.max(0.2, colorIntensity * 0.42 + 0.1)) * 255 * 3
    );

    for (let dataIndex = 0; dataIndex < maskImageData.data.length; dataIndex += 4) {
      if (maskImageData.data[dataIndex + 3] === 0) continue;

      overlayImageData.data[dataIndex] = overlayR;
      overlayImageData.data[dataIndex + 1] = overlayG;
      overlayImageData.data[dataIndex + 2] = overlayB;
      overlayImageData.data[dataIndex + 3] = overlayAlpha;
    }

    ctx.putImageData(overlayImageData, 0, 0);
  }, [colorIntensity, selectedColor]);

  useEffect(() => {
    renderMaskOverlay();
  }, [renderMaskOverlay]);

  const paintMaskPoint = (clientX: number, clientY: number) => {
    if (!drawingMode || !maskCanvasRef.current || !canvasRef.current) return;

    const rect = maskCanvasRef.current.getBoundingClientRect();
    const scaleX = maskCanvasRef.current.width / rect.width;
    const scaleY = maskCanvasRef.current.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const maskCtx = maskCanvasRef.current.getContext('2d');

    if (!maskCtx) return;

    maskCtx.save();
    maskCtx.globalAlpha = 1;
    maskCtx.globalCompositeOperation = maskTool === 'eraser' ? 'destination-out' : 'source-over';
    maskCtx.fillStyle = 'white';
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();

    renderMaskOverlay();
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    isDrawingRef.current = true;
    paintMaskPoint(event.clientX, event.clientY);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawingMode) return;
    event.preventDefault();
    paintMaskPoint(event.clientX, event.clientY);
  };

  const stopDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    event?.currentTarget.releasePointerCapture?.(event.pointerId);
    isDrawingRef.current = false;
  };

  const clearMask = () => {
    if (!maskCanvasRef.current || !canvasRef.current) return;

    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (maskCtx) {
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setStatus({ text: 'Ручное выделение очищено.', type: 'success' });
  };

  const showDraftWallMask = () => {
    if (!maskCanvasRef.current || !canvasRef.current || !imageRef.current) return;

    // ДОБАВЬТЕ ЭТУ ПРОВЕРКУ:
    const maskCtxCheck = maskCanvasRef.current.getContext('2d');
    if (maskCtxCheck && drawingMode) {
      const imageData = maskCtxCheck.getImageData(
        0,
        0,
        maskCanvasRef.current.width,
        maskCanvasRef.current.height
      );
      let hasChanges = false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) {
          hasChanges = true;
          break;
        }
      }
      if (hasChanges) {
        if (!window.confirm('У вас уже есть правки на маске. Они будут потеряны. Продолжить?')) {
          return;
        }
      }
    }

    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const width = maskCanvas.width;
    const height = maskCanvas.height;
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = width;
    imageCanvas.height = height;
    const imageCtx = imageCanvas.getContext('2d', { willReadFrequently: true });
    if (!imageCtx) return;

    imageCtx.drawImage(imageRef.current, 0, 0, width, height);
    const sourcePixels = imageCtx.getImageData(0, 0, width, height);
    const selectedPixels = new Uint8Array(width * height);
    const visitedPixels = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    const seedPoints = [
      [0.22, 0.2],
      [0.5, 0.18],
      [0.78, 0.2],
      [0.5, 0.34],
    ];
    const seedColors = seedPoints.map(([seedX, seedY]) => {
      const x = Math.min(width - 1, Math.max(0, Math.round(seedX * width)));
      const y = Math.min(height - 1, Math.max(0, Math.round(seedY * height)));
      const index = (y * width + x) * 4;
      return [sourcePixels.data[index], sourcePixels.data[index + 1], sourcePixels.data[index + 2]];
    });
    const maxY = Math.round(height * 0.76);
    const minY = Math.round(height * 0.05);
    const isWallLike = (pixelIndex: number) => {
      const y = Math.floor(pixelIndex / width);
      if (y < minY || y > maxY) return false;

      const dataIndex = pixelIndex * 4;
      const r = sourcePixels.data[dataIndex];
      const g = sourcePixels.data[dataIndex + 1];
      const b = sourcePixels.data[dataIndex + 2];
      const brightness = (r + g + b) / 3;
      if (brightness < 38) return false;

      return seedColors.some(([seedR, seedG, seedB]) => {
        const distance = Math.hypot(r - seedR, g - seedG, b - seedB);
        const seedBrightness = (seedR + seedG + seedB) / 3;
        return distance < 76 && Math.abs(brightness - seedBrightness) < 62;
      });
    };

    let selectedCount = 0;
    seedPoints.forEach(([seedX, seedY]) => {
      const startX = Math.min(width - 1, Math.max(0, Math.round(seedX * width)));
      const startY = Math.min(height - 1, Math.max(0, Math.round(seedY * height)));
      const startIndex = startY * width + startX;
      if (visitedPixels[startIndex] || !isWallLike(startIndex)) return;

      let head = 0;
      let tail = 0;
      queue[tail++] = startIndex;
      visitedPixels[startIndex] = 1;

      while (head < tail) {
        const currentIndex = queue[head++];
        if (!isWallLike(currentIndex)) continue;

        selectedPixels[currentIndex] = 1;
        selectedCount += 1;

        const x = currentIndex % width;
        const neighbors = [
          currentIndex - 1,
          currentIndex + 1,
          currentIndex - width,
          currentIndex + width,
        ];

        neighbors.forEach((neighborIndex) => {
          if (neighborIndex < 0 || neighborIndex >= selectedPixels.length) return;
          if (
            (neighborIndex === currentIndex - 1 && x === 0) ||
            (neighborIndex === currentIndex + 1 && x === width - 1)
          ) {
            return;
          }
          if (visitedPixels[neighborIndex]) return;
          visitedPixels[neighborIndex] = 1;
          queue[tail++] = neighborIndex;
        });
      }
    });

    if (selectedCount < width * height * 0.025) {
      for (let y = minY; y <= Math.round(height * 0.62); y += 1) {
        const progress = (y - minY) / Math.max(1, height * 0.57);
        const sideInset = Math.round(width * (0.08 + progress * 0.08));
        for (let x = sideInset; x < width - sideInset; x += 1) {
          selectedPixels[y * width + x] = 1;
        }
      }
    }

    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.clearRect(0, 0, width, height);

    const maskImageData = maskCtx.createImageData(width, height);

    for (let pixelIndex = 0; pixelIndex < selectedPixels.length; pixelIndex += 1) {
      if (!selectedPixels[pixelIndex]) continue;

      const dataIndex = pixelIndex * 4;
      maskImageData.data[dataIndex] = 255;
      maskImageData.data[dataIndex + 1] = 255;
      maskImageData.data[dataIndex + 2] = 255;
      maskImageData.data[dataIndex + 3] = 255;
    }

    maskCtx.putImageData(maskImageData, 0, 0);
    setMaskTool('brush');
    renderMaskOverlay();

    setDrawingMode(true);
    setStatus({
      text: 'Черновая маска стены показана на фото. Доработайте границы кистью и нажмите "Применить по кисти".',
      type: 'success',
    });
  };

  const checkMaskHasPixels = (blob: Blob): Promise<boolean> =>
    new Promise((resolve) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(blob);
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] > 10) {
            resolve(true);
            return;
          }
        }
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      };
      image.src = objectUrl;
    });

  const sendVisualizeRequest = async (maskBlob: Blob | null) => {
    if (!selectedFile) return;

    const formData = new FormData();
    const areaValue = Number(roomArea);
    const priceValue = Number(rollPrice);
    const rollsCount = Number.isFinite(areaValue)
      ? Math.max(1, Math.ceil((areaValue * 1.1) / 10.6))
      : 0;

    formData.append('photo', selectedFile);
    formData.append('wallpaperId', selectedWallpaper);
    // После formData.append('wallpaperId', selectedWallpaper);

    // Ищем URL изображения в сохранённых товарах
    const savedItem = savedTryOnItems.find((item) => item.productId === selectedWallpaper);
    if (savedItem?.product?.image) {
      const imageUrl = savedItem.product.image;
      // ✅ Собираем полный URL
      const fullUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${window.location.origin}${imageUrl}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      formData.append('wallpaperFile', blob, 'wallpaper.jpg');
      console.log('📸 Sending wallpaper URL:', fullUrl);
    } else {
      const catalogItem = CATALOG_ITEMS.find((item) => item.id === selectedWallpaper);
      if (catalogItem?.image) {
        const fullUrl = catalogItem.image.startsWith('http')
          ? catalogItem.image
          : `${window.location.origin}${catalogItem.image}`;
        const response = await fetch(fullUrl);
        const blob = await response.blob();
        formData.append('wallpaperFile', blob, 'wallpaper.jpg');
        console.log('📸 Sending catalog wallpaper:', fullUrl);
      }
    }
    formData.append('segmentationMode', segmentationMode);
    formData.append('renderMode', renderMode);
    formData.append('colorHex', selectedColor);
    formData.append('colorIntensity', String(colorIntensity));
    formData.append('wallpaperScale', String(wallpaperScale));
    formData.append('projectTitle', projectTitle);
    formData.append(
      'visualizationTitle',
      `${projectTitle} - ${new Date().toLocaleDateString('ru-RU')}`
    );
    formData.append('roomArea', String(areaValue || 0));
    formData.append('rollsCount', String(rollsCount));
    formData.append('price', String(rollsCount * (priceValue || 0)));

    if (maskBlob) {
      const hasPixels = await checkMaskHasPixels(maskBlob);
      if (!hasPixels) {
        setStatus({
          text: 'Сначала зарисуйте стену кистью или выключите режим ручной маски.',
          type: 'warning',
        });
        setLoading(false);
        return;
      }
      formData.append('maskFile', maskBlob, 'mask.png');
      formData.append('useMask', 'true');
    }

    const progressInterval = setInterval(() => {
      setProgress((previous) => (previous >= 90 ? previous : previous + 10));
    }, 500);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(`${API_BASE_URL}/api/visualize`, {
        method: 'POST',
        headers: {
          ...(localStorage.getItem('token')
            ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
            : {}),
        },
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.resultUrl) throw new Error(data.error || 'Неизвестная ошибка');

      const resultUrl = `${API_BASE_URL}${data.resultUrl}`;
      setResult(resultUrl);
      console.log('Server response:', data);
      setMaskPreview(data.maskUrl ? `${API_BASE_URL}${data.maskUrl}` : null);

      try {
        const saved = JSON.parse(localStorage.getItem('visualizations') || '[]');
        localStorage.setItem(
          'visualizations',
          JSON.stringify(
            [
              {
                id: data.visualizationId || Date.now(),
                result_url: data.resultUrl,
                original_url: data.originalUrl,
                mask_url: data.maskUrl,
                wallpaper_id: data.wallpaperId,
                color_hex: data.colorHex,
                method: data.method,
                quality: data.quality,
                duration_ms: data.duration,
                mask_coverage: data.maskCoverage,
                segmentation_mode: data.segmentationMode,
                render_mode: data.renderMode,
                wallpaper_scale: data.wallpaperScale ?? wallpaperScale,
                created_at: new Date().toISOString(),
                title: projectTitle,
                project_id: data.projectId,
                room_area: areaValue || null,
                rolls_count: rollsCount || null,
                price: rollsCount * (priceValue || 0),
              },
              ...saved,
            ].slice(0, 12)
          )
        );
      } catch (storageError) {
        console.error('Failed to save visualization locally:', storageError);
      }

      setProcessingInfo({
        method: data.method,
        text: data.methodText,
        icon: data.methodIcon,
        quality: data.quality,
        suggestManualMask: data.suggestManualMask,
        duration: data.duration ?? null,
        maskCoverage: data.maskCoverage ?? null,
        segmentationMode: data.segmentationMode,
        renderMode: data.renderMode || renderMode,
        autoFallbackUsed: data.autoFallbackUsed,
        visualizationId: data.visualizationId ?? null,
      });

      if (data.suggestManualMask) {
        setStatus({
          text:
            data.autoFallbackUsed || data.method === 'manual-needed'
              ? 'Автоматическая маска получилась спорной. Уточните стену кистью и повторите обработку.'
              : 'ML-сервис недоступен или вернул слабую маску, поэтому включен fallback. Можно уточнить стену кистью.',
          type: 'warning',
        });
        setShowManualRetry(true);
        setDrawingMode(true);
      } else if (
        segmentationMode === 'segformer' &&
        ['wall-heuristic-fallback', 'simple-fallback'].includes(String(data.method))
      ) {
        setStatus({
          text: 'SegFormer сейчас недоступен, результат построен fallback-методом. Запустите ML-сервис на 8000, чтобы использовать нейросетевую сегментацию.',
          type: 'warning',
        });
        setShowManualRetry(false);
      } else {
        setStatus({ text: `Готово: ${data.methodText}.`, type: 'success' });
        setShowManualRetry(false);
      }
    } catch (error: unknown) {
      clearInterval(progressInterval);
      if (error instanceof Error && error.name !== 'AbortError') {
        setStatus({ text: `Ошибка: ${error.message}`, type: 'error' });
      }
    } finally {
      setLoading(false);
    }

    console.log('📦 savedTryOnItems:', savedTryOnItems);
    console.log('🎯 selectedWallpaper:', selectedWallpaper);
    console.log(
      '🔍 found item:',
      savedTryOnItems.find((item) => item.productId === selectedWallpaper)
    );
  };

  const handleVisualize = useCallback(async () => {
    if (!selectedFile) {
      setStatus({ text: 'Сначала выберите фото.', type: 'error' });
      return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);
    setMaskPreview(null);
    setProcessingInfo(null);
    setStatus({ text: 'Обработка изображения...', type: 'info' });

    // Отправляем маску только если drawingMode включен
    if (drawingMode && maskCanvasRef.current) {
      maskCanvasRef.current.toBlob(sendVisualizeRequest, 'image/png');
    } else {
      await sendVisualizeRequest(null);
    }
  }, [
    selectedFile,
    selectedWallpaper,
    segmentationMode,
    renderMode,
    selectedColor,
    colorIntensity,
    wallpaperScale,
    drawingMode,
    projectTitle,
    roomArea,
    rollPrice,
  ]);

  const handleRetryWithMask = useCallback(async () => {
    if (!maskCanvasRef.current) return;
    setLoading(true);
    setProgress(0);
    setStatus({ text: 'Повторная обработка с ручной маской...', type: 'info' });
    setShowManualRetry(false);
    maskCanvasRef.current.toBlob(sendVisualizeRequest, 'image/png');
  }, [
    selectedFile,
    selectedWallpaper,
    segmentationMode,
    renderMode,
    selectedColor,
    colorIntensity,
    wallpaperScale,
    projectTitle,
    roomArea,
    rollPrice,
  ]);

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setMaskPreview(null);
    setSelectedFile(null);
    setProcessingInfo(null);
    setShowManualRetry(false);
    setPhotoWarnings([]);
    setSupportStatus('');
    setStatus({ text: '', type: 'info' });
    setProgress(0);
    setDrawingMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadWithComment = (mode: 'download' | 'print') => {
    if (!result) return;

    const generatePDF = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // A4 портретная ориентация
      const pageWidth = 1240;
      const pageHeight = 1754;
      const margin = 50;

      const img = new Image();
      const originalImg = new Image();

      await Promise.all([
        new Promise((resolve) => {
          img.onload = resolve;
          img.src = result;
        }),
        new Promise((resolve) => {
          originalImg.onload = resolve;
          originalImg.src = preview || result;
        }),
      ]);

      canvas.width = pageWidth;
      canvas.height = pageHeight;

      // Белый фон
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageWidth, pageHeight);

      // === HEADER ===
      const headerY = margin;

      ctx.fillStyle = '#30493a';
      ctx.font = 'bold 36px "Gothic A1", Arial, sans-serif';
      ctx.fillText('BAUTEX', margin, headerY + 40);

      ctx.fillStyle = '#805b38';
      ctx.font = '300 22px "Gothic A1", Arial, sans-serif';
      ctx.fillText('Визуализация интерьера', margin, headerY + 70);

      ctx.fillStyle = '#999';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        pageWidth - margin,
        headerY + 40
      );
      ctx.textAlign = 'left';

      // Разделитель
      ctx.strokeStyle = '#e0d6cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin, headerY + 90);
      ctx.lineTo(pageWidth - margin, headerY + 90);
      ctx.stroke();

      // === Изображения ДО и ПОСЛЕ ===
      const imgSectionY = headerY + 120;
      const imageWidth = (pageWidth - margin * 2 - 30) / 2;
      const scale = Math.min(imageWidth / img.width, 400 / img.height);
      const imgW = Math.round(img.width * scale);
      const imgH = Math.round(img.height * scale);

      // Плашка "ДО" — над изображением
      const leftX = margin;
      const labelHeight = 30;

      ctx.fillStyle = '#4a614d';
      ctx.fillRect(leftX, imgSectionY, imgW, labelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Gothic A1", Arial, sans-serif';
      ctx.fillText('ДО', leftX + 12, imgSectionY + 21);

      ctx.strokeStyle = '#e0d6cc';
      ctx.lineWidth = 1;
      ctx.strokeRect(leftX, imgSectionY, imgW, imgH + labelHeight);
      ctx.drawImage(originalImg, leftX, imgSectionY + labelHeight, imgW, imgH);

      // Плашка "ПОСЛЕ" — над изображением
      const rightX = leftX + imgW + 30;

      ctx.fillStyle = '#805b38';
      ctx.fillRect(rightX, imgSectionY, imgW, labelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Gothic A1", Arial, sans-serif';
      ctx.fillText('ПОСЛЕ', rightX + 12, imgSectionY + 21);

      ctx.strokeStyle = '#805b38';
      ctx.lineWidth = 2;
      ctx.strokeRect(rightX, imgSectionY, imgW, imgH + labelHeight);
      ctx.drawImage(img, rightX, imgSectionY + labelHeight, imgW, imgH);

      // === ИНФОРМАЦИЯ ОБ ОБОЯХ ===
      const infoY = imgSectionY + imgH + labelHeight + 30;

      ctx.fillStyle = '#30493a';
      ctx.font = 'bold 24px "Gothic A1", Arial, sans-serif';
      ctx.fillText('Выбранные обои', margin, infoY);

      const cardY = infoY + 15;
      const cardHeight = downloadComment ? 320 : 280;

      ctx.fillStyle = '#f7f8f4';
      ctx.fillRect(margin, cardY, pageWidth - margin * 2, cardHeight);
      ctx.strokeStyle = '#e0d6cc';
      ctx.lineWidth = 1;
      ctx.strokeRect(margin, cardY, pageWidth - margin * 2, cardHeight);

      const infoStartY = cardY + 30;
      const lineHeight = 35;

      const rollsCount = Math.max(1, Math.ceil((Number(roomArea) * 1.1) / 10.6));

      const infoItems = [
        { label: 'Модель', value: downloadFileName || selectedWallpaper },
        { label: 'Коллекция', value: getCollectionName(selectedWallpaper) },
        { label: 'Цвет', value: selectedColor },
        { label: 'Цена за рулон', value: `${rollPrice} ₽` },
        { label: 'Площадь комнаты', value: `${roomArea} м²` },
        { label: 'Необходимо рулонов', value: `${rollsCount} шт.` },
      ];

      infoItems.forEach((item, index) => {
        const y = infoStartY + index * lineHeight;

        ctx.fillStyle = '#999';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText(item.label + ':', margin + 20, y);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillText(item.value, margin + 200, y);
      });

      // Цветной индикатор
      const colorBoxX = margin + 260;
      const colorBoxY = infoStartY + 2 * lineHeight;
      ctx.fillStyle = selectedColor;
      ctx.fillRect(colorBoxX, colorBoxY - 16, 24, 24);
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(colorBoxX, colorBoxY - 16, 24, 24);

      // === КОММЕНТАРИЙ ===
      if (downloadComment) {
        const commentY = infoStartY + infoItems.length * lineHeight + 15;

        ctx.fillStyle = '#805b38';
        ctx.font = 'bold 18px "Gothic A1", Arial, sans-serif';
        ctx.fillText('Комментарий', margin + 20, commentY);

        ctx.fillStyle = '#555';
        ctx.font = '16px Arial, sans-serif';

        const maxWidth = pageWidth - margin * 2 - 40;
        const words = downloadComment.split(' ');
        let line = '';
        let currentY = commentY + 28;

        words.forEach((word) => {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > maxWidth) {
            ctx.fillText(line, margin + 20, currentY);
            line = word + ' ';
            currentY += 25;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, margin + 20, currentY);
      }

      // === FOOTER ===
      const footerY = pageHeight - margin - 20;
      ctx.strokeStyle = '#e0d6cc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, footerY);
      ctx.lineTo(pageWidth - margin, footerY);
      ctx.stroke();

      ctx.fillStyle = '#999';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(
        'BauTex \u00A9 ' + new Date().getFullYear() + ' — Визуализация создана в онлайн-сервисе',
        margin,
        footerY + 18
      );

      ctx.textAlign = 'right';
      ctx.fillText('bau-tex.ru', pageWidth - margin, footerY + 18);
      ctx.textAlign = 'left';

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      if (mode === 'print') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
          <html>
            <head>
              <title>${downloadFileName || 'Визуализация'} — BauTex</title>
              <style>
                @page { size: A4 portrait; margin: 0; }
                body { margin: 0; display: flex; justify-content: center; background: #f5f5f5; }
                img { max-width: 100%; height: auto; display: block; }
                @media print { body { background: white; } }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="Визуализация BauTex" onload="setTimeout(() => window.print(), 500)" />
            </body>
          </html>
        `);
          printWindow.document.close();
        }
      } else {
        const link = document.createElement('a');
        link.download = `${downloadFileName || 'visualization'}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.jpg`;
        link.href = dataUrl;
        link.click();
      }

      setShowDownloadModal(false);
      setDownloadComment('');
      setDownloadFileName('visualization');
    };

    generatePDF();
  };

  const getCollectionName = (wallpaperId: string) => {
    const product = CATALOG_ITEMS.find((item) => item.id === wallpaperId);
    return product?.collection || 'Basic';
  };
  const getProgressMessage = () => {
    if (progress < 30) return 'Анализируем фото...';
    if (progress < 60) return 'Строим маску стены...';
    if (progress < 90) return 'Накладываем обои и цвет...';
    return 'Завершаем обработку...';
  };

  const getQualityBadge = (quality: string) => {
    if (quality === 'high')
      return <span className='quality-badge quality-high'>Высокое качество</span>;
    if (quality === 'medium') {
      return <span className='quality-badge quality-medium'>Среднее качество</span>;
    }
    return null;
  };

  const getVisualizationExplanation = () => {
    if (!processingInfo) return null;

    const maskText =
      typeof processingInfo.maskCoverage === 'number'
        ? `Маска занимает ${Math.round(processingInfo.maskCoverage * 100)}% изображения.`
        : 'Маска показана отдельно, белая область считается стеной.';

    const segmentationText =
      processingInfo.method === 'segformer-wall'
        ? 'Сегментация выполнена нейросетью SegFormer B0: модель нашла пиксели класса wall.'
        : processingInfo.method === 'manual-mask'
          ? 'Использована ручная маска: пользователь кистью указал область стены.'
          : 'Использован fallback: локальная эвристика или ручная коррекция вместо полноценной ML-маски.';

    const fallbackText = processingInfo.autoFallbackUsed
      ? 'Система отметила результат как спорный и предложила ручную коррекцию.'
      : 'Результат не требует обязательной ручной коррекции, но ее можно применить для улучшения границ.';

    return {
      segmentationText,
      maskText,
      fallbackText,
      renderText: `Наложение выполнено в режиме ${processingInfo.renderMode}: выбранные обои повторяются паттерном и смешиваются с исходным фото.`,
    };
  };

  const handleReportVisualizationIssue = async () => {
    if (!result || !processingInfo) return;
    const token = localStorage.getItem('token');

    if (!token) {
      setSupportStatus('Чтобы отправить результат в поддержку, войдите в аккаунт.');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'Проблема с визуализацией',
        message: [
          'Пользователю не понравился результат визуализации.',
          `Метод: ${processingInfo.method}`,
          `Сегментация: ${processingInfo.segmentationMode}`,
          `Наложение: ${processingInfo.renderMode}`,
          `Маска: ${
            typeof processingInfo.maskCoverage === 'number'
              ? `${Math.round(processingInfo.maskCoverage * 100)}%`
              : 'н/д'
          }`,
          `Результат: ${result}`,
          maskPreview ? `Маска: ${maskPreview}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      }),
    });

    setSupportStatus(
      response.ok
        ? 'Обращение отправлено в поддержку. Администратор увидит его в личном кабинете.'
        : 'Не удалось отправить обращение. Попробуйте еще раз.'
    );
  };
  return (
    <main>
      <Breadcrumbs currentPage='Визуализация' />
      <div className='visualization-container'>
        <h1 className='visualization-title'>Визуализация интерьера</h1>
        <p className='visualization-description'>
          Загрузите фото комнаты, выберите обои, способ выделения стены и режим наложения.{' '}
          <a href='/visualization/how-it-works'>Как это работает</a>
        </p>

        <div className='visualization-layout'>
          <div className='visualization-form'>
            <h2 className='visualization-section-title'>1. Фото комнаты</h2>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id='file-input'
            />
            {!preview ? (
              <label
                htmlFor='file-input'
                className='visualization-button visualization-button-primary'
              >
                Выбрать фото
              </label>
            ) : (
              <button
                type='button'
                onClick={handleReset}
                className='visualization-button visualization-button-danger'
              >
                Сброс
              </button>
            )}
            {selectedFile && (
              <p className='visualization-file-info'>
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}

            {photoWarnings.length > 0 && (
              <div className='visualization-tips'>
                <h4>Советы для лучшего результата</h4>
                <ul>
                  {photoWarnings.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <h2 className='visualization-section-title'>2. Обои и цвет</h2>

            <div className='cart-wallpaper-picker'>
              <div className='cart-wallpaper-header'>
                <h3>Быстрый выбор обоев</h3>
                <p>
                  Сначала подготовьте маску стены, а затем меняйте обои и цвет без новой
                  сегментации.
                </p>
              </div>

              <div className='cart-wallpaper-source-tabs' aria-label='Источник обоев'>
                <button
                  type='button'
                  className={`cart-wallpaper-source ${useSavedWallpapers === 'cart' ? 'active' : ''}`}
                  disabled={selectedCartItems.length === 0}
                  onClick={() => {
                    setUseSavedWallpapers('cart');
                    setSelectedSavedWallpaperKey(null);
                  }}
                >
                  Из корзины
                </button>
                <button
                  type='button'
                  className={`cart-wallpaper-source ${useSavedWallpapers === 'favorites' ? 'active' : ''}`}
                  disabled={favoriteTryOnItems.length === 0}
                  onClick={() => {
                    setUseSavedWallpapers('favorites');
                    setSelectedSavedWallpaperKey(null);
                  }}
                >
                  Из избранного
                </button>
                <button
                  type='button'
                  className={`cart-wallpaper-source ${!useSavedWallpapers ? 'active' : ''}`}
                  onClick={() => {
                    setUseSavedWallpapers(null);
                    setSelectedSavedWallpaperKey(null);
                  }}
                >
                  Каталог
                </button>
              </div>

              {useSavedWallpapers && savedTryOnItems.length > 0 && (
                <div className='cart-order-strip' aria-label='Сохраненные обои для примерки'>
                  {savedTryOnItems.map((item) => {
                    const rawCartKey = item.key.replace(/^cart::/, '');
                    const current = cartSelection[rawCartKey] || {
                      checked: true,
                      quantity: item.quantity || 1,
                    };
                    const isSelected = selectedSavedWallpaperKey === item.key;
                    const imageStyle = {
                      '--try-on-color': item.colorHex,
                      '--try-on-opacity': String(item.colorIntensity),
                    } as React.CSSProperties;

                    return (
                      <article
                        key={item.key}
                        className={`cart-order-card ${current.checked ? 'selected' : ''} ${
                          isSelected ? 'cart-order-card-active' : ''
                        }`}
                        onClick={() => handleSelectSavedWallpaper(item)}
                      >
                        {item.source === 'cart' ? (
                          <label
                            className='cart-order-check'
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type='checkbox'
                              checked={current.checked}
                              onChange={(event) =>
                                updateCartSelection(rawCartKey, { checked: event.target.checked })
                              }
                            />
                            <span>{current.checked ? 'В заказе' : 'Не включать'}</span>
                          </label>
                        ) : (
                          <span className='cart-order-check cart-order-check-static'>
                            В избранном
                          </span>
                        )}

                        <div className='cart-order-image' style={imageStyle}>
                          <img src={item.product.image} alt={item.product.name} />
                          <span className='cart-order-color-overlay' />
                        </div>
                        <p className='cart-order-code'>{item.product.code}</p>
                        <h4>{item.product.name}</h4>
                        <p className='cart-order-color'>{item.color}</p>

                        {item.source === 'cart' && (
                          <div
                            className='cart-order-quantity'
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span>Количество</span>
                            <input
                              type='number'
                              min='1'
                              max='99'
                              value={current.quantity}
                              onChange={(event) =>
                                updateCartSelection(rawCartKey, {
                                  quantity: Math.max(
                                    1,
                                    Math.min(99, Number(event.target.value || 1))
                                  ),
                                })
                              }
                            />
                          </div>
                        )}

                        {isSelected && (
                          <span className='cart-order-badge'>Выбрано для примерки</span>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {useSavedWallpapers && savedTryOnItems.length === 0 && (
                <p className='cart-saved-empty'>
                  {useSavedWallpapers === 'cart'
                    ? 'В корзине пока нет выбранных тканей для примерки.'
                    : 'В избранном пока нет обоев для примерки.'}
                </p>
              )}
            </div>

            {!useSavedWallpapers && (
              <div className='wallpaper-picker-grid'>
                {CATALOG_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type='button'
                    className={`wallpaper-picker-card ${
                      selectedWallpaper === item.id ? 'wallpaper-picker-card-active' : ''
                    }`}
                    onClick={() => {
                      setSelectedWallpaper(item.id);
                      setSelectedColor(item.colors[0]?.hex || '#d8c3a5');
                      setColorIntensity(item.colors[0]?.intensity || 0.35);
                      setSelectedSavedWallpaperKey(null);
                      if (item.price) setRollPrice(String(item.price));
                    }}
                    aria-pressed={selectedWallpaper === item.id}
                  >
                    <span className='wallpaper-picker-image-wrap'>
                      <img
                        src={item.image}
                        alt={item.name}
                        className='wallpaper-picker-image'
                        loading='lazy'
                      />
                    </span>
                    <span className='wallpaper-picker-name'>{item.code}</span>
                  </button>
                ))}
              </div>
            )}

            <div className='visualization-color-panel'>
              <div className='visualization-color-swatches'>
                {COLOR_SWATCHES.map((color) => (
                  <button
                    key={color.value}
                    type='button'
                    className={`visualization-color-swatch ${
                      selectedColor === color.value ? 'visualization-color-swatch-active' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                    aria-label={color.name}
                    aria-pressed={selectedColor === color.value}
                  />
                ))}
              </div>
              <label className='visualization-color-custom'>
                <span>Свой цвет</span>
                <input
                  type='color'
                  value={selectedColor}
                  onChange={(event) => setSelectedColor(event.target.value)}
                />
              </label>
              <label className='visualization-intensity-control'>
                <span>Сила цвета: {Math.round(colorIntensity * 100)}%</span>
                <input
                  type='range'
                  min='0'
                  max='0.75'
                  step='0.05'
                  value={colorIntensity}
                  onChange={(event) => setColorIntensity(Number(event.target.value))}
                />
              </label>
              <label className='visualization-intensity-control'>
                <span>Масштаб принта: {Math.round(wallpaperScale * 100)}%</span>
                <input
                  type='range'
                  min='0.55'
                  max='1.8'
                  step='0.05'
                  value={wallpaperScale}
                  onChange={(event) => setWallpaperScale(Number(event.target.value))}
                />
              </label>
            </div>

            <div className='visualization-method-group'>
              <h3>Как накладывать обои</h3>
              <div className='render-mode-control'>
                {RENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    className={`segmentation-mode-button ${
                      renderMode === option.value ? 'segmentation-mode-button-active' : ''
                    }`}
                    onClick={() => setRenderMode(option.value)}
                    aria-pressed={renderMode === option.value}
                  >
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {preview && !result && (
              <>
                <h2 className='visualization-section-title'>Построение маски вашей стены</h2>
                <div className='tools-panel'>
                  <button
                    type='button'
                    onClick={showDraftWallMask}
                    className='visualization-button visualization-button-secondary'
                  >
                    Показать маску стены
                  </button>

                  {drawingMode && (
                    <>
                      <div className='tool-selector'>
                        <button
                          type='button'
                          onClick={() => setMaskTool('brush')}
                          className={`visualization-button ${
                            maskTool === 'brush'
                              ? 'visualization-button-success'
                              : 'visualization-button-secondary'
                          }`}
                        >
                          Кисть
                        </button>
                        <button
                          type='button'
                          onClick={() => setMaskTool('eraser')}
                          className={`visualization-button ${
                            maskTool === 'eraser'
                              ? 'visualization-button-success'
                              : 'visualization-button-secondary'
                          }`}
                        >
                          Ластик
                        </button>
                      </div>
                      <label className='brush-control'>
                        <span>Размер</span>
                        <input
                          type='range'
                          min='10'
                          max='100'
                          value={brushSize}
                          onChange={(event) => setBrushSize(parseInt(event.target.value, 10))}
                        />
                        <span>{brushSize}px</span>
                      </label>
                      <button
                        type='button'
                        onClick={clearMask}
                        className='visualization-button visualization-button-danger'
                      >
                        Очистить
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            <div className='visualization-button-group'>
              <button
                type='button'
                onClick={handleVisualize}
                disabled={loading}
                className='visualization-button visualization-button-primary'
              >
                {loading ? 'Обработка...' : 'Применить обои'}
              </button>

              {result && !loading && (
                <button
                  type='button'
                  onClick={() => setShowDownloadModal(true)}
                  className='visualization-button visualization-button-success'
                >
                  Скачать
                </button>
              )}

              {result && (
                <button
                  type='button'
                  onClick={handleReportVisualizationIssue}
                  className='visualization-button visualization-button-secondary'
                >
                  Отправить в поддержку
                </button>
              )}

              {result && !drawingMode && !loading && (
                <button
                  type='button'
                  onClick={() => setDrawingMode(true)}
                  className='visualization-button visualization-button-warning'
                >
                  Уточнить кистью
                </button>
              )}
            </div>
            {showManualRetry && !loading && (
              <button
                type='button'
                onClick={handleRetryWithMask}
                className='visualization-button visualization-button-warning'
              >
                Повторить с ручной маской
              </button>
            )}

            {supportStatus && (
              <div className='visualization-status visualization-status-info'>{supportStatus}</div>
            )}

            {loading && (
              <div className='visualization-progress'>
                <div className='visualization-progress-bar'>
                  <div className='visualization-progress-fill' style={{ width: `${progress}%` }} />
                </div>
                <p className='visualization-progress-text'>{getProgressMessage()}</p>
              </div>
            )}

            {status.text && (
              <div className={`visualization-status visualization-status-${status.type}`}>
                {status.text}
              </div>
            )}

            {processingInfo && result && !loading && (
              <div className={`processing-info quality-${processingInfo.quality}`}>
                <div className='processing-info-header'>
                  <span>Метод: {processingInfo.text}</span>
                  {getQualityBadge(processingInfo.quality)}
                </div>
                <div className='processing-metrics'>
                  <span>
                    Время:{' '}
                    {processingInfo.duration
                      ? `${(processingInfo.duration / 1000).toFixed(1)} c`
                      : 'н/д'}
                  </span>
                  <span>
                    Маска:{' '}
                    {typeof processingInfo.maskCoverage === 'number'
                      ? `${Math.round(processingInfo.maskCoverage * 100)}%`
                      : 'н/д'}
                  </span>
                  <span>Сегментация: {processingInfo.segmentationMode}</span>
                  <span>Наложение: {processingInfo.renderMode}</span>
                </div>
                )
              </div>
            )}
          </div>

          <div className='visualization-images-panel'>
            {preview && result && (
              <div className='visualization-compare-panel'>
                <div className='visualization-compare-header'>
                  <h2 className='visualization-card-title'>До / после</h2>
                  <span>Сравнение исходного фото и результата</span>
                </div>
                <div className='visualization-compare-grid'>
                  <figure>
                    <img src={preview} alt='Исходное фото' />
                    <figcaption>До</figcaption>
                  </figure>
                  <figure>
                    <img src={result} alt='Визуализация обоев' />
                    <figcaption>После</figcaption>
                  </figure>
                </div>
              </div>
            )}

            {!result && (
              <div className='visualization-card'>
                <h2 className='visualization-card-title'>Исходное фото</h2>
                {!preview ? (
                  <div className='visualization-empty'>Фото не загружено</div>
                ) : (
                  <div className='image-editor-container'>
                    <img
                      ref={imageRef}
                      src={preview}
                      alt='Исходное фото'
                      className='visualization-image'
                      onLoad={initCanvas}
                      style={{ display: 'block' }}
                    />
                    <canvas
                      ref={canvasRef}
                      className='overlay-canvas'
                      style={{ pointerEvents: 'none' }}
                    />
                    <canvas
                      ref={maskCanvasRef}
                      className='mask-canvas'
                      style={{
                        cursor: drawingMode ? 'crosshair' : 'default',
                        pointerEvents: drawingMode ? 'auto' : 'none',
                        touchAction: 'none',
                      }}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      onPointerLeave={stopDrawing}
                    />
                  </div>
                )}
              </div>
            )}

            <div className='visualization-card'>
              <h2 className='visualization-card-title'>Результат</h2>
              {!result ? (
                <div className='visualization-empty'>
                  {loading ? 'Идет обработка...' : 'Нажмите “Применить обои”'}
                </div>
              ) : (
                <div className='visualization-image-container'>
                  <img src={result} alt='Результат визуализации' className='visualization-image' />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Модальное окно скачивания */}
        {showDownloadModal && (
          <div className='download-modal-overlay' onClick={() => setShowDownloadModal(false)}>
            <div className='download-modal' onClick={(e) => e.stopPropagation()}>
              <h3>Сохранить результат</h3>

              <div className='download-modal-field'>
                <label>Комментарий к визуализации</label>
                <textarea
                  value={downloadComment}
                  onChange={(e) => setDownloadComment(e.target.value)}
                  placeholder='Например: "Гостиная, вариант 2"'
                  rows={3}
                />
              </div>

              <div className='download-modal-field'>
                <label>Название файла</label>
                <input
                  type='text'
                  value={downloadFileName}
                  onChange={(e) => setDownloadFileName(e.target.value)}
                  placeholder='visualization'
                />
              </div>

              <div className='download-modal-actions'>
                <button
                  type='button'
                  onClick={() => handleDownloadWithComment('download')}
                  className='visualization-button visualization-button-primary'
                >
                  💾 Скачать
                </button>
                <button
                  type='button'
                  onClick={() => handleDownloadWithComment('print')}
                  className='visualization-button visualization-button-secondary'
                >
                  🖨️ Распечатать
                </button>
              </div>

              <button
                type='button'
                onClick={() => setShowDownloadModal(false)}
                className='download-modal-close'
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Visualization;
