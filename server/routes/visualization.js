// visualization.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { createCanvas, Image } = require('canvas');
const jwt = require('jsonwebtoken');
const db = require('../database');

// ========== КОНФИГУРАЦИЯ ==========
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const API_TIMEOUT = 30000;

// ========== ПУТИ ==========
const dirs = {
  uploads: path.join(__dirname, '../uploads'),
  results: path.join(__dirname, '../results'),
  debug: path.join(__dirname, '../debug'),
  wallpapers: path.join(__dirname, '../public/wallpapers'),
  temp: path.join(__dirname, '../temp'),
};

Object.values(dirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created: ${path.basename(dir)}`);
  }
});

// ========== НАСТРОЙКА MULTER ==========
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fsPromises.mkdir(dirs.uploads, { recursive: true });
    cb(null, dirs.uploads);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Неподдерживаемый формат. Разрешены: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// ========== ТЕСТОВЫЙ ЭНДПОЙНТ ==========
router.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Visualization API is working',
    timestamp: new Date().toISOString(),
  });
});

function getOptionalUser(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ========== ДИАГНОСТИКА ФОТО ==========
router.post('/api/visualize/check', upload.single('photo'), async (req, res) => {
  const photoPath = req.file?.path;
  if (!photoPath) {
    return res.status(400).json({ error: 'Фото не загружено' });
  }

  try {
    const metadata = await sharp(photoPath).metadata();
    const warnings = [];
    const suggestions = [];

    // Проверка размера
    if (metadata.width < 800 || metadata.height < 600) {
      warnings.push('маленькое');
      suggestions.push('Загрузите фото большего размера (минимум 800x600 пикселей)');
    }

    if (metadata.width > 4000 || metadata.height > 4000) {
      warnings.push('огромное');
      suggestions.push('Фото будет автоматически оптимизировано для ускорения обработки');
    }

    // Проверка соотношения сторон
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio > 2.5 || aspectRatio < 0.4) {
      warnings.push('необычное соотношение сторон');
      suggestions.push('Рекомендуем фото с нормальным соотношением сторон (3:4, 4:3, 16:9)');
    }

    // Проверка размера файла
    if (req.file.size > 5 * 1024 * 1024) {
      warnings.push('большой');
      suggestions.push('Файл больше 5MB, обработка может занять немного больше времени');
    }

    // Определяем, насколько фото подходит для автоматики
    let autoProcessingScore = 0.7; // по умолчанию
    if (warnings.includes('маленькое')) autoProcessingScore -= 0.3;
    if (warnings.includes('необычное соотношение сторон')) autoProcessingScore -= 0.2;

    res.json({
      ok: warnings.length === 0,
      warnings,
      suggestions,
      autoProcessingScore: Math.max(0, autoProcessingScore),
      dimensions: { width: metadata.width, height: metadata.height },
      recommendedMode: autoProcessingScore > 0.5 ? 'auto' : 'semi-auto',
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    res.json({
      ok: false,
      warnings: ['не удалось проанализировать'],
      suggestions: ['Попробуйте другой файл'],
      autoProcessingScore: 0,
      recommendedMode: 'manual',
    });
  } finally {
    if (photoPath) {
      await fsPromises.unlink(photoPath).catch(() => {});
    }
  }
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

async function createFallbackWallpaper(wallpaperId) {
  const fallbackPath = path.join(dirs.debug, `fallback-${wallpaperId}.jpg`);
  if (fs.existsSync(fallbackPath)) return fallbackPath;

  try {
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#d4b28c');
    gradient.addColorStop(0.5, '#c4a27a');
    gradient.addColorStop(1, '#b4926a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 15;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 80, 0);
      ctx.lineTo(i * 80 + canvas.width, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 80);
      ctx.lineTo(canvas.width, i * 80 + canvas.height);
      ctx.stroke();
    }

    const buffer = canvas.toBuffer('image/jpeg', { quality: 90 });
    await fsPromises.writeFile(fallbackPath, buffer);
    console.log(`🎨 Created fallback wallpaper: ${wallpaperId}`);
    return fallbackPath;
  } catch (error) {
    console.error('Error creating fallback:', error);
    throw error;
  }
}

function findWallpaperPath(wallpaperId) {
  const safeId = String(wallpaperId || '1').replace(/[^a-zA-Z0-9_-]/g, '');
  const possibleExts = ['.jpg', '.jpeg', '.png', '.webp'];

  // 1. Сначала ищем точное совпадение
  for (const ext of possibleExts) {
    const testPath = path.join(dirs.wallpapers, `${safeId}${ext}`);
    if (fs.existsSync(testPath)) return testPath;
  }

  // 2. Маппинг CATALOG_ID → file name
  const catalogMap = {
    'BASIC-1001': 'texture1',
    'BASIC-1002': 'texture2',
    'LOFT-2001': 'texture3',
    'LOFT-2002': 'texture4',
    'LOFT-2003': 'wallpaper-relief-stone',
    'GEOM-3001': 'wallpaper-botanical-line',
    'GEOM-3002': 'wallpaper-botanical-gray',
    'GEOM-3003': 'wallpaper-abstract-relief',
    'MIN-4001': 'wallpaper-soft-plaster',
    'MIN-4002': 'wallpaper-relief-stone',
    'MIN-4003': 'wallpaper-botanical-line',
    'CLS-5001': 'wallpaper-botanical-gray',
    'CLS-5002': 'wallpaper-abstract-relief',
    'CLS-5003': 'wallpaper-soft-plaster',
    'KIDS-6001': 'wallpaper-botanical-line',
    'KIDS-6002': 'wallpaper-botanical-gray',
    'KIDS-6003': 'texture2',
  };

  const mappedName = catalogMap[safeId] || safeId;
  for (const ext of possibleExts) {
    const testPath = path.join(dirs.wallpapers, `${mappedName}${ext}`);
    if (fs.existsSync(testPath)) return testPath;
  }

  return null;
}
function normalizeHexColor(color) {
  if (!color || typeof color !== 'string') return null;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`;
  return null;
}

async function createTintedWallpaperBuffer(
  wallpaperPath,
  width,
  height,
  colorHex,
  colorIntensity = 0.35,
  wallpaperScale = 1
) {
  const safeScale = Math.min(1.8, Math.max(0.55, Number(wallpaperScale) || 1));
  const tileWidth = Math.round(Math.min(560, Math.max(220, width * 0.28 * safeScale)));
  const tileBuffer = await sharp(wallpaperPath)
    .resize({ width: tileWidth, withoutEnlargement: false })
    .modulate({ brightness: 1.04, saturation: 0.92 })
    .removeAlpha()
    .png()
    .toBuffer();

  const tileImage = new Image();
  await new Promise((resolve, reject) => {
    tileImage.onload = resolve;
    tileImage.onerror = reject;
    tileImage.src = tileBuffer;
  });

  const tileCanvas = createCanvas(width, height);
  const tileCtx = tileCanvas.getContext('2d');
  const pattern = tileCtx.createPattern(tileImage, 'repeat');
  if (pattern) {
    tileCtx.fillStyle = pattern;
    tileCtx.fillRect(0, 0, width, height);
  }

  let wallpaperBuffer = tileCanvas.toBuffer('image/png');

  const tintColor = normalizeHexColor(colorHex);
  const tintOpacity = Math.min(0.75, Math.max(0, Number(colorIntensity) || 0));

  if (!tintColor || tintOpacity <= 0) {
    return wallpaperBuffer;
  }

  const colorLayer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: tintColor,
    },
  })
    .png()
    .toBuffer();

  wallpaperBuffer = await sharp(wallpaperBuffer)
    .composite([{ input: colorLayer, blend: 'multiply', opacity: tintOpacity }])
    .modulate({ brightness: 1.03, saturation: 1.05 })
    .toBuffer();

  return wallpaperBuffer;
}

async function createHeuristicWallMask(photoPath, outputMaskPath) {
  const metadata = await sharp(photoPath).metadata();
  const targetWidth = Math.min(1024, metadata.width || 1024);
  const { data, info } = await sharp(photoPath)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = Buffer.alloc(info.width * info.height);
  const buckets = new Map();

  const colorDistance = (r1, g1, b1, r2, g2, b2) =>
    Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

  for (let y = 0; y < info.height; y += 2) {
    const yRatio = y / info.height;
    if (yRatio < 0.04 || yRatio > 0.68) continue;

    for (let x = 0; x < info.width; x += 2) {
      const xRatio = x / info.width;
      if (xRatio < 0.08 || xRatio > 0.92) continue;

      const idx = (y * info.width + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const brightness = (r + g + b) / 3;
      const saturation = max === 0 ? 0 : (max - min) / max;

      const rightIdx = (y * info.width + Math.min(info.width - 1, x + 1)) * 3;
      const bottomIdx = (Math.min(info.height - 1, y + 1) * info.width + x) * 3;
      const edgeStrength =
        colorDistance(r, g, b, data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]) +
        colorDistance(r, g, b, data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2]);

      if (brightness < 35 || brightness > 248 || saturation > 0.92 || edgeStrength > 70) continue;

      const key = `${Math.round(r / 18)}:${Math.round(g / 18)}:${Math.round(b / 18)}`;
      const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      const weight = yRatio < 0.45 ? 2 : 1;
      bucket.count += weight;
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
      buckets.set(key, bucket);
    }
  }

  const dominantBucket = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  const wallColor = dominantBucket
    ? {
        r: dominantBucket.r / dominantBucket.count,
        g: dominantBucket.g / dominantBucket.count,
        b: dominantBucket.b / dominantBucket.count,
      }
    : null;

  for (let y = 0; y < info.height; y++) {
    const yRatio = y / info.height;
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const brightness = (r + g + b) / 3;
      const saturation = max === 0 ? 0 : (max - min) / max;
      const rightIdx = (y * info.width + Math.min(info.width - 1, x + 1)) * 3;
      const bottomIdx = (Math.min(info.height - 1, y + 1) * info.width + x) * 3;
      const edgeStrength =
        colorDistance(r, g, b, data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]) +
        colorDistance(r, g, b, data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2]);
      const wallDistance = wallColor
        ? colorDistance(r, g, b, wallColor.r, wallColor.g, wallColor.b)
        : 0;

      let score = 0;
      if (wallColor && wallDistance < 48) score += 0.72;
      else if (wallColor && wallDistance < 70) score += 0.38;
      else if (wallColor) score -= 0.78;

      if (!wallColor) {
        if (brightness > 75 && brightness < 245) score += 0.28;
        if (saturation < 0.42) score += 0.22;
        if (Math.abs(r - g) < 42 && Math.abs(g - b) < 42) score += 0.12;
      }

      if (yRatio < 0.82) score += 0.16;
      if (yRatio > 0.04) score += 0.08;
      if (brightness > 45 && brightness < 248) score += 0.08;
      if (edgeStrength < 42) score += 0.14;
      if (edgeStrength > 72) score -= 0.32;
      if (yRatio > 0.78 && brightness < 150) score -= 0.25;
      if (yRatio > 0.84) score -= 0.35;

      mask[y * info.width + x] = score >= 0.62 ? 255 : 0;
    }
  }

  await sharp(mask, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 1,
    },
  })
    .resize(metadata.width, metadata.height, { fit: 'fill' })
    .blur(5)
    .threshold(90)
    .png()
    .toFile(outputMaskPath);

  return outputMaskPath;
}

async function analyzeMaskCoverage(maskPath) {
  const { data, info } = await sharp(maskPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += channels) {
    if (data[i] < 250) {
      hasTransparency = true;
      break;
    }
  }

  let selected = 0;
  for (let i = 0; i < data.length; i += channels) {
    const alpha = data[i + 3];
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const maskValue = hasTransparency ? alpha : gray;
    if (maskValue > 128) selected += 1;
  }
  return selected / (info.width * info.height);
}

async function createSegFormerWallMask(photoPath) {
  const maskPath = path.join(dirs.debug, `wall-mask-${Date.now()}-${uuidv4()}.png`);

  if (process.env.SEGFORMER_API_URL) {
    try {
      const imageBuffer = await fsPromises.readFile(photoPath);
      const formData = new FormData();
      formData.append('photo', imageBuffer, {
        filename: 'room.jpg',
        contentType: 'image/jpeg',
      });

      const headers = { ...formData.getHeaders() };
      if (process.env.SEGFORMER_API_TOKEN) {
        headers.Authorization = `Bearer ${process.env.SEGFORMER_API_TOKEN}`;
      }

      const response = await axios.post(process.env.SEGFORMER_API_URL, formData, {
        headers,
        responseType: 'arraybuffer',
        timeout: API_TIMEOUT * 2,
      });

      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const payload = JSON.parse(Buffer.from(response.data).toString('utf8'));
        if (!payload.maskBase64) throw new Error('SegFormer response does not contain maskBase64');
        await fsPromises.writeFile(maskPath, Buffer.from(payload.maskBase64, 'base64'));
      } else {
        await fsPromises.writeFile(maskPath, response.data);
      }

      const normalizedMask = await sharp(maskPath).greyscale().normalise().png().toBuffer();
      await fsPromises.writeFile(maskPath, normalizedMask);
      const coverage = await analyzeMaskCoverage(maskPath);
      console.log('✅ SegFormer wall mask created');
      return {
        path: maskPath,
        method: 'segformer-wall',
        coverage,
        suggestManualMask: coverage < 0.06 || coverage > 0.72,
      };
    } catch (error) {
      console.error('SegFormer wall mask error:', error.response?.status, error.message);
    }
  }

  await createHeuristicWallMask(photoPath, maskPath);
  const coverage = await analyzeMaskCoverage(maskPath);
  console.log('⚠️ SegFormer is not configured, used local wall heuristic');
  return {
    path: maskPath,
    method: 'wall-heuristic-fallback',
    coverage,
    suggestManualMask: coverage < 0.08 || coverage > 0.82,
  };
}

async function createLocalHeuristicWallMask(photoPath) {
  const maskPath = path.join(dirs.debug, `heuristic-wall-mask-${Date.now()}-${uuidv4()}.png`);
  await createHeuristicWallMask(photoPath, maskPath);
  const coverage = await analyzeMaskCoverage(maskPath);
  return {
    path: maskPath,
    method: 'wall-heuristic-fallback',
    coverage,
    suggestManualMask: coverage < 0.08 || coverage > 0.82,
  };
}

async function applyWallpaperWithWallMask(
  originalPath,
  wallpaperId,
  maskPath,
  outputPath,
  options = {}
) {
  try {
    let wallpaperPath = null;

    // В options добавить:
    if (options.wallpaperFile && fs.existsSync(options.wallpaperFile)) {
      wallpaperPath = options.wallpaperFile;
      console.log('✅ Using uploaded wallpaper file');
    }
    // ✅ Сначала пробуем URL
    if (!wallpaperPath && options.wallpaperUrl) {
      const wallpaperFileName = `downloaded-${Date.now()}-${uuidv4()}.jpg`;
      const wallpaperDownloadPath = path.join(dirs.temp, wallpaperFileName);

      try {
        const response = await axios.get(options.wallpaperUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });
        await fsPromises.writeFile(wallpaperDownloadPath, response.data);
        wallpaperPath = wallpaperDownloadPath;
      } catch (err) {
        console.log('⚠️ Failed to download wallpaper from URL, trying local...');
      }
    }
    // Приоритет 3: локальный поиск
    if (!wallpaperPath) {
      wallpaperPath = findWallpaperPath(wallpaperId);
    }
    // ✅ Если ничего не нашли — fallback
    if (!wallpaperPath || !fs.existsSync(wallpaperPath)) {
      console.log('⚠️ Creating fallback wallpaper');
      wallpaperPath = await createFallbackWallpaper(wallpaperId);
    }
    console.log('🔍 Final wallpaper path:', wallpaperPath);

    if (!fs.existsSync(wallpaperPath) || !fs.existsSync(maskPath)) {
      console.log('⚠️ Wallpaper or mask missing, copying original');
      await fsPromises.copyFile(originalPath, outputPath);
      return outputPath;
    }

    const metadata = await sharp(originalPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    const wallpaperBuffer = await createTintedWallpaperBuffer(
      wallpaperPath,
      width,
      height,
      options.colorHex,
      options.colorIntensity,
      options.wallpaperScale
    );

    const maskBuffer = await sharp(maskPath)
      .resize(width, height, { fit: 'fill' })
      .ensureAlpha()
      .png()
      .toBuffer();

    const originalBuffer = await fsPromises.readFile(originalPath);
    const originalImage = new Image();
    const wallpaperImage = new Image();
    const maskImage = new Image();

    await Promise.all([
      new Promise((resolve, reject) => {
        originalImage.onload = resolve;
        originalImage.onerror = reject;
        originalImage.src = originalBuffer;
      }),
      new Promise((resolve, reject) => {
        wallpaperImage.onload = resolve;
        wallpaperImage.onerror = reject;
        wallpaperImage.src = wallpaperBuffer;
      }),
      new Promise((resolve, reject) => {
        maskImage.onload = resolve;
        maskImage.onerror = reject;
        maskImage.src = maskBuffer;
      }),
    ]);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(originalImage, 0, 0, width, height);
    const originalPixels = ctx.getImageData(0, 0, width, height);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(wallpaperImage, 0, 0, width, height);
    const wallpaperPixels = ctx.getImageData(0, 0, width, height);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(maskImage, 0, 0, width, height);
    const maskPixels = ctx.getImageData(0, 0, width, height);

    let maskHasTransparency = false;
    for (let i = 3; i < maskPixels.data.length; i += 4) {
      if (maskPixels.data[i] < 250) {
        maskHasTransparency = true;
        break;
      }
    }

    const finalPixels = ctx.createImageData(width, height);
    const renderMode = ['catalog', 'realistic', 'contrast'].includes(options.renderMode)
      ? options.renderMode
      : 'catalog';
    const defaultOpacity =
      renderMode === 'realistic' ? 0.58 : renderMode === 'contrast' ? 0.82 : 0.72;
    const opacity = Math.min(
      0.9,
      Math.max(0.15, Number(options.wallpaperOpacity) || defaultOpacity)
    );

    for (let i = 0; i < originalPixels.data.length; i += 4) {
      const gray = (maskPixels.data[i] + maskPixels.data[i + 1] + maskPixels.data[i + 2]) / 3;
      const maskValue = maskHasTransparency ? maskPixels.data[i + 3] : gray;
      const ratio = (maskValue / 255) * opacity;
      const originalR = originalPixels.data[i];
      const originalG = originalPixels.data[i + 1];
      const originalB = originalPixels.data[i + 2];
      let wallpaperR = wallpaperPixels.data[i];
      let wallpaperG = wallpaperPixels.data[i + 1];
      let wallpaperB = wallpaperPixels.data[i + 2];

      if (renderMode === 'realistic') {
        const luminance = (originalR * 0.299 + originalG * 0.587 + originalB * 0.114) / 255;
        const shade = 0.72 + luminance * 0.48;
        wallpaperR = Math.min(255, wallpaperR * shade);
        wallpaperG = Math.min(255, wallpaperG * shade);
        wallpaperB = Math.min(255, wallpaperB * shade);
      }

      if (renderMode === 'contrast') {
        wallpaperR = Math.max(0, Math.min(255, 128 + (wallpaperR - 128) * 1.22));
        wallpaperG = Math.max(0, Math.min(255, 128 + (wallpaperG - 128) * 1.22));
        wallpaperB = Math.max(0, Math.min(255, 128 + (wallpaperB - 128) * 1.22));
      }

      finalPixels.data[i] = originalR * (1 - ratio) + wallpaperR * ratio;
      finalPixels.data[i + 1] = originalG * (1 - ratio) + wallpaperG * ratio;
      finalPixels.data[i + 2] = originalB * (1 - ratio) + wallpaperB * ratio;
      finalPixels.data[i + 3] = 255;
    }

    ctx.putImageData(finalPixels, 0, 0);
    await fsPromises.writeFile(outputPath, canvas.toBuffer('image/jpeg', { quality: 92 }));

    console.log('✅ Wallpaper applied by wall mask');
    return outputPath;
  } catch (error) {
    console.error('❌ Wall mask apply error:', error);
    await fsPromises.copyFile(originalPath, outputPath);
    return outputPath;
  }
}

async function simpleApply(originalPath, wallpaperId, outputPath) {
  try {
    console.log('🔧 SIMPLE APPLY - BLEND MODE');

    let wallpaperPath = findWallpaperPath(wallpaperId);
    if (!wallpaperPath) {
      wallpaperPath = await createFallbackWallpaper(wallpaperId);
    }

    if (!fs.existsSync(wallpaperPath)) {
      console.log('⚠️ Wallpaper not found, copying original');
      await fsPromises.copyFile(originalPath, outputPath);
      return outputPath;
    }

    const metadata = await sharp(originalPath).metadata();
    const original = sharp(originalPath);
    const wallpaper = sharp(wallpaperPath).resize(metadata.width, metadata.height, {
      fit: 'cover',
      position: 'center',
    });

    const result = await original
      .composite([
        {
          input: await wallpaper.toBuffer(),
          blend: 'multiply',
          opacity: 0.85,
        },
        {
          input: await wallpaper.toBuffer(),
          blend: 'screen',
          opacity: 0.15,
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    await sharp(result).toFile(outputPath);
    console.log('✅ SIMPLE APPLY COMPLETED');
    return outputPath;
  } catch (error) {
    console.error('❌ Simple apply error:', error);
    await fsPromises.copyFile(originalPath, outputPath);
    return outputPath;
  }
}
async function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
        console.log(`🧹 Cleaned up: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`Error cleaning up ${filePath}:`, error.message);
    }
  }
}

// ========== ОСНОВНОЙ ЭНДПОЙНТ ==========
router.post(
  '/api/visualize',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'maskFile', maxCount: 1 },
    { name: 'wallpaperFile', maxCount: 1 },
  ]),
  async (req, res) => {
    const startTime = Date.now();
    const photoPath = req.files?.['photo']?.[0]?.path || null;
    const maskPath = req.files?.['maskFile']?.[0]?.path || null;
    const wallpaperFilePath = req.files?.['wallpaperFile']?.[0]?.path || null;
    const {
      wallpaperId,
      useMask = 'false',
      segmentationMode = 'auto',
      colorHex = '#d8c3a5',
      colorIntensity = '0.35',
      renderMode = 'catalog',
      wallpaperScale = '1',
      projectId = null,
      projectTitle = '',
      visualizationTitle = '',
      price = null,
      roomArea = null,
      rollsCount = null,
    } = req.body;

    let resultPath = null;
    const filesToCleanup = [];

    try {
      if (!photoPath) {
        return res.status(400).json({ error: 'Фото не загружено' });
      }
      filesToCleanup.push(photoPath);

      if (!wallpaperId) {
        await cleanupFiles(filesToCleanup);
        return res.status(400).json({ error: 'Не указан ID обоев' });
      }

      console.log('\n📸 ===== NEW REQUEST =====');
      console.log('📌 Wallpaper ID:', wallpaperId);
      console.log('🎨 UseMask:', useMask);
      console.log('🧠 Segmentation mode:', segmentationMode);
      console.log('🎨 Color:', colorHex, colorIntensity);
      console.log('📁 Has mask file:', !!maskPath);

      let usedMethod = 'unknown';
      let resultCreated = false;
      let suggestManualMask = false;
      let autoFallbackUsed = false;
      let maskCoverage = null;
      let maskPreviewPath = null;

      const resultFileName = `result-${Date.now()}-${uuidv4()}.jpg`;
      resultPath = path.join(dirs.results, resultFileName);
      filesToCleanup.push(resultPath);

      // Режим 1: Ручная маска (приоритет)
      if (useMask === 'true' && maskPath) {
        console.log('🎨 Using manual mask mode');
        filesToCleanup.push(maskPath);
        // === ДОБАВЛЯЕМ НОРМАЛИЗАЦИЮ МАСКИ ===
        // Пользовательская маска может иметь альфа-канал или серые пиксели
        // Нормализуем её в чистый ч/б формат
        const normalizedMaskPath = path.join(
          dirs.debug,
          `normalized-manual-mask-${Date.now()}-${uuidv4()}.png`
        );
        filesToCleanup.push(normalizedMaskPath);

        await sharp(maskPath)
          .ensureAlpha() // гарантируем наличие альфа-канала
          .flatten({ background: { r: 0, g: 0, b: 0 } }) // прозрачность → черный
          .greyscale() // в оттенки серого
          .normalise() // растягиваем контраст
          .threshold(128) // всё что светлее 128 → белый, темнее → черный
          .png()
          .toFile(normalizedMaskPath);

        console.log('✅ User mask normalized');
        // === КОНЕЦ ДОБАВЛЕНИЯ ===

        // Создаем превью маски для фронтенда
        maskPreviewPath = path.join(dirs.debug, `manual-mask-${Date.now()}-${uuidv4()}.png`);
        await sharp(normalizedMaskPath)
          .resize({ width: 1200, withoutEnlargement: true })
          .png()
          .toFile(maskPreviewPath);
        await applyWallpaperWithWallMask(photoPath, wallpaperId, normalizedMaskPath, resultPath, {
          colorHex,
          colorIntensity,
          renderMode,
          wallpaperScale,
          wallpaperFile: wallpaperFilePath,
        });
        usedMethod = 'manual-mask';
        resultCreated = true;
      }
      // Режим 2: SegFormer wall segmentation
      else {
        console.log('🤖 Trying automatic wall segmentation...');

        try {
          const maskInfo =
            segmentationMode === 'heuristic'
              ? await createLocalHeuristicWallMask(photoPath)
              : await createSegFormerWallMask(photoPath);

          if (maskInfo) {
            filesToCleanup.push(maskInfo.path);
            usedMethod = maskInfo.method;
            maskCoverage = maskInfo.coverage ?? null;
            suggestManualMask = !!maskInfo.suggestManualMask;
            maskPreviewPath = maskInfo.path;

            if (suggestManualMask) {
              await fsPromises.copyFile(photoPath, resultPath);
              usedMethod = 'manual-needed';
              autoFallbackUsed = true;
              resultCreated = true;
            } else {
              await applyWallpaperWithWallMask(photoPath, wallpaperId, maskInfo.path, resultPath, {
                colorHex,
                colorIntensity,
                renderMode,
                wallpaperScale,
                wallpaperOpacity: maskInfo.method === 'segformer-wall' ? 0.72 : 0.56,
                wallpaperFile: wallpaperFilePath,
              });
              resultCreated = true;
            }
            console.log(`  ✅ Success with ${usedMethod}`);
          }
        } catch (autoError) {
          console.log('  ❌ Wall segmentation failed:', autoError.message);
          autoFallbackUsed = true;

          // Пробуем simpleApply как временное решение
          console.log('  → Falling back to simple apply...');
          await simpleApply(photoPath, wallpaperId, resultPath);
          usedMethod = 'simple-fallback';
          resultCreated = true;
          suggestManualMask = true; // Предлагаем пользователю ручную маску
        }
      }

      if (!resultCreated || !fs.existsSync(resultPath)) {
        throw new Error('Result file was not created');
      }

      const duration = Date.now() - startTime;
      console.log(`⏱️ Processing time: ${duration}ms`);
      console.log(`✅ Method: ${usedMethod}`);
      console.log('========================\n');

      // Формируем понятный ответ для пользователя
      const methodMessages = {
        'manual-mask': { text: 'По вашей ручной маске', quality: 'high', icon: '🖌️' },
        'segformer-wall': {
          text: 'SegFormer нашел стены автоматически',
          quality: 'high',
          icon: '✨',
        },
        'wall-heuristic-fallback': {
          text: 'Автомаска стены без SegFormer',
          quality: 'medium',
          icon: '📐',
        },
        'manual-needed': { text: 'Нужна ручная маска стены', quality: 'medium', icon: '🖌️' },
        'simple-fallback': { text: 'Базовое наложение', quality: 'medium', icon: '📸' },
      };

      const methodInfo = methodMessages[usedMethod] || {
        text: usedMethod,
        quality: 'medium',
        icon: '🎨',
      };

      const resultUrl = `/results/${path.basename(resultPath)}`;
      const maskUrl = maskPreviewPath ? `/debug/${path.basename(maskPreviewPath)}` : null;
      const user = getOptionalUser(req);
      let visualizationId = null;
      let projectIdToSave = projectId ? Number(projectId) : null;
      let originalUrl = null;

      if (user?.id) {
        const originalFileName = `original-${Date.now()}-${uuidv4()}.jpg`;
        const originalResultPath = path.join(dirs.results, originalFileName);
        await sharp(photoPath)
          .resize({ width: 1800, withoutEnlargement: true })
          .jpeg({ quality: 88 })
          .toFile(originalResultPath);
        originalUrl = `/results/${originalFileName}`;

        if (!projectIdToSave) {
          await new Promise((resolve) => {
            db.run(
              `INSERT INTO visualization_projects (user_id, title, original_url)
               VALUES (?, ?, ?)`,
              [
                user.id,
                String(projectTitle || visualizationTitle || 'Проект визуализации').trim(),
                originalUrl,
              ],
              function (err) {
                if (!err) projectIdToSave = this.lastID;
                resolve();
              }
            );
          });
        }
      }

      if (user?.id) {
        await new Promise((resolve) => {
          db.run(
            `INSERT INTO visualizations (
              user_id, result_url, original_url, title, project_id, wallpaper_id, color_hex,
              method, quality, duration_ms, mask_coverage, segmentation_mode,
              price, room_area, rolls_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id,
              resultUrl,
              originalUrl,
              String(visualizationTitle || projectTitle || '').trim() || null,
              projectIdToSave,
              wallpaperId,
              normalizeHexColor(colorHex),
              usedMethod,
              methodInfo.quality,
              duration,
              maskCoverage,
              segmentationMode,
              price !== null && price !== '' ? Number(price) : null,
              roomArea !== null && roomArea !== '' ? Number(roomArea) : null,
              rollsCount !== null && rollsCount !== '' ? Number(rollsCount) : null,
            ],
            function (err) {
              if (err) {
                console.error('Error saving visualization:', err.message);
              } else {
                visualizationId = this.lastID;
              }
              resolve();
            }
          );
        });
      }

      res.json({
        success: true,
        resultUrl,
        visualizationId,
        projectId: projectIdToSave,
        originalUrl,
        maskUrl,
        method: usedMethod,
        methodText: methodInfo.text,
        methodIcon: methodInfo.icon,
        quality: methodInfo.quality,
        duration: duration,
        hasMask: !['simple-fallback', 'manual-needed'].includes(usedMethod),
        suggestManualMask: suggestManualMask,
        autoFallbackUsed: autoFallbackUsed,
        maskCoverage,
        segmentationMode,
        renderMode,
        wallpaperScale: Number(wallpaperScale) || 1,
        wallpaperId,
        colorHex: normalizeHexColor(colorHex),
      });

      // Очистка через 30 секунд
      setTimeout(() => cleanupFiles([photoPath, maskPath]), 30000);
    } catch (error) {
      console.error('❌ CRITICAL ERROR:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      await cleanupFiles(filesToCleanup);
    }
  }
);

// ========== ДОПОЛНИТЕЛЬНЫЕ ЭНДПОЙНТЫ ==========
router.get('/api/visualize/status', (req, res) => {
  res.json({
    clipdrop: !!process.env.CLIPDROP_API_KEY,
    replicate: !!process.env.REPLICATE_API_TOKEN,
    segformer: !!process.env.SEGFORMER_API_URL,
    nodeVersion: process.version,
    platform: process.platform,
    maxFileSize: MAX_FILE_SIZE,
    allowedFormats: ALLOWED_MIME_TYPES,
  });
});

router.get('/api/wallpapers', async (req, res) => {
  try {
    if (!fs.existsSync(dirs.wallpapers)) return res.json([]);
    const files = await fsPromises.readdir(dirs.wallpapers);
    const wallpaperNames = {
      1: 'Soft plaster',
      2: 'Botanical line',
      3: 'Gray botanical',
      4: 'Stone relief',
      5: 'Abstract relief',
      6: 'Textile texture',
    };
    const wallpapers = files
      .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map((file) => ({
        id: path.basename(file, path.extname(file)),
        name:
          wallpaperNames[path.basename(file, path.extname(file))] || file.replace(/\.[^/.]+$/, ''),
        url: `/wallpapers/${file}`,
      }));
    res.json(wallpapers);
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/wallpapers/upload', upload.single('wallpaper'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const { id } = req.body;
    const newId = id || uuidv4();
    const newPath = path.join(dirs.wallpapers, `${newId}.jpg`);
    await fsPromises.rename(req.file.path, newPath);
    res.json({ success: true, id: newId, url: `/wallpapers/${path.basename(newPath)}` });
  } catch (error) {
    console.error('Error uploading wallpaper:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'pong',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3003,
  });
});

module.exports = router;
