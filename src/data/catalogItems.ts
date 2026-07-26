import textureBasic1 from '../assets/fabrics/basic/myagki-len.jpg';
import textureBasic2 from '../assets/fabrics/basic/myagkaya_shtukaturka.jpg';
import textureBasic3 from '../assets/fabrics/basic/wallpaper-soft-plaster.jpg';
import textureLoft1 from '../assets/fabrics/loft/бетон.jpg';
import textureLoft2 from '../assets/fabrics/loft/urban.jpg';
import textureLoft3 from '../assets/fabrics/loft/wallpaper-relief-stone.jpg';
import textureClassic1 from '../assets/fabrics/classic/damack.jpg';
import textureClassic2 from '../assets/fabrics/classic/poloska.jpg';
import textureClassic3 from '../assets/fabrics/classic/wallpaper-botanical-gray.jpg';
import textureGeometry1 from '../assets/fabrics/geometry/romd-setka.jpg';
import textureGeometry2 from '../assets/fabrics/geometry/lom-linii.jpg';
import textureGeometry3 from '../assets/fabrics/geometry/крупная-клетка.jpg';
import textureKids1 from '../assets/fabrics/kids/облака.jpg';
import textureKids2 from '../assets/fabrics/kids/stars.jpg';
import textureKids3 from '../assets/fabrics/kids/wallpaper-botanical-line.jpg';
import textureMinimalism1 from '../assets/fabrics/minimalism/glad-minim.jpg';
import textureMinimalism2 from '../assets/fabrics/minimalism/wallpaper-abstract-relief.jpg';
import textureMinimalism3 from '../assets/fabrics/minimalism/lines-forkids.jpg';

export type CollectionKey = 'basic' | 'loft' | 'geometry' | 'minimalism' | 'classic' | 'kids';

export interface ProductColor {
  name: string;
  hex: string;
  intensity: number;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  collection: CollectionKey;
  color: string;
  colorHint: string;
  image: string;
  price: number;
  rollSize: string;
  density: string;
  colors: ProductColor[];
}

export const PRODUCT_COLORS: ProductColor[] = [
  { name: 'Белый лед', hex: '#f7f5ee', intensity: 0.18 },
  { name: 'Молочный', hex: '#eadcc7', intensity: 0.32 },
  { name: 'Песочный', hex: '#d9b98f', intensity: 0.42 },
  { name: 'Пудровый', hex: '#d7aaa4', intensity: 0.42 },
  { name: 'Оливковый', hex: '#6e765c', intensity: 0.55 },
  { name: 'Графит', hex: '#4c4c4c', intensity: 0.62 },
  { name: 'Синий глубокий', hex: '#334c70', intensity: 0.58 },
  { name: 'Терракота', hex: '#a75e43', intensity: 0.55 },
];

export const COLLECTION_INFO: Record<
  CollectionKey,
  { title: string; subtitle: string; description: string }
> = {
  basic: {
    title: 'Basic',
    subtitle: 'Спокойная база для любой комнаты',
    description:
      'Нейтральные жаккардовые фактуры, которые легко вписываются в гостиную, спальню, прихожую и рабочее пространство.',
  },
  loft: {
    title: 'Loft',
    subtitle: 'Фактурные поверхности для современного интерьера',
    description:
      'Бетон, технический текстиль и выразительные грубые фактуры для кухонь-гостиных, кабинетов и акцентных стен.',
  },
  geometry: {
    title: 'Geometry',
    subtitle: 'Ритм, линии и визуальная архитектура',
    description:
      'Геометрические рисунки помогают собрать интерьер, подчеркнуть высоту стен и добавить динамику без перегруза.',
  },
  minimalism: {
    title: 'Minimalism',
    subtitle: 'Тихие фактуры без лишнего шума',
    description:
      'Матовые, почти гладкие поверхности для чистых интерьеров, где важны свет, мебель и пропорции комнаты.',
  },
  classic: {
    title: 'Classic',
    subtitle: 'Дамаски, полосы и мягкая классика',
    description:
      'Коллекция для спален, гостиных и столовых, где хочется добавить благородный орнамент и спокойный рельеф.',
  },
  kids: {
    title: 'Kids',
    subtitle: 'Добрые фактуры для детских комнат',
    description:
      'Легкие мотивы, которые можно перекрашивать по мере взросления ребенка и менять настроение комнаты без ремонта.',
  },
};

const colorSet = (...indexes: number[]) => indexes.map((index) => PRODUCT_COLORS[index]);

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'BASIC-1001',
    code: 'BT 1001',
    name: 'Классический лен',
    description:
      'Мягкая нейтральная фактура с деликатным переплетением для спокойных жилых комнат.',
    collection: 'basic',
    color: 'Белый лед',
    colorHint: 'Белый лед / Молочный',
    image: textureBasic1,
    price: 2450,
    rollSize: '1.06 x 10 м',
    density: '240 г/м2',
    colors: colorSet(0, 1, 2, 4),
  },
  {
    id: 'BASIC-1002',
    code: 'BT 1002',
    name: 'Мягкая штукатурка',
    description: 'Едва заметный рельеф под окраску, хорошо работает как фон для мебели и света.',
    collection: 'basic',
    color: 'Песочный',
    colorHint: 'Песочный / Молочный',
    image: textureBasic2,
    price: 2380,
    rollSize: '1.06 x 10 м',
    density: '230 г/м2',
    colors: colorSet(1, 2, 3, 5),
  },
  {
    id: 'BASIC-1003',
    code: 'BT 1003',
    name: 'Текстильная база',
    description:
      'Плотный тканевый рисунок для стен, которые должны выглядеть аккуратно каждый день.',
    collection: 'basic',
    color: 'Белый лед',
    colorHint: 'Белый лед / Графит',
    image: textureBasic3,
    price: 2590,
    rollSize: '1.06 x 10 м',
    density: '260 г/м2',
    colors: colorSet(0, 1, 5, 6),
  },
  {
    id: 'LOFT-2001',
    code: 'LF 2001',
    name: 'Бетон Loft',
    description: 'Грубоватая фактура под бетон для современных кухонь-гостиных и рабочих зон.',
    collection: 'loft',
    color: 'Графит',
    colorHint: 'Серый бетон / Графит',
    image: textureLoft1,
    price: 2750,
    rollSize: '1.06 x 10 м',
    density: '270 г/м2',
    colors: colorSet(2, 5, 6, 7),
  },
  {
    id: 'LOFT-2002',
    code: 'LF 2002',
    name: 'Урбан текстиль',
    description: 'Техническое переплетение с характером, но без визуальной тяжести.',
    collection: 'loft',
    color: 'Графит',
    colorHint: 'Графит / Терракота',
    image: textureLoft2,
    price: 2820,
    rollSize: '1.06 x 10 м',
    density: '275 г/м2',
    colors: colorSet(4, 5, 6, 7),
  },
  {
    id: 'LOFT-2003',
    code: 'LF 2003',
    name: 'Состаренный камень',
    description: 'Акцентная поверхность с мягкой неоднородностью для ниш и ТВ-зон.',
    collection: 'loft',
    color: 'Оливковый',
    colorHint: 'Оливковый / Песочный',
    image: textureLoft3,
    price: 2890,
    rollSize: '1.06 x 10 м',
    density: '280 г/м2',
    colors: colorSet(2, 4, 5, 7),
  },
  {
    id: 'GEOM-3001',
    code: 'GM 3001',
    name: 'Ромбовая сетка',
    description: 'Ритмичный геометрический рисунок, который визуально собирает большую стену.',
    collection: 'geometry',
    color: 'Белый лед',
    colorHint: 'Белый лед / Пудровый',
    image: textureGeometry1,
    price: 2690,
    rollSize: '1.06 x 10 м',
    density: '255 г/м2',
    colors: colorSet(0, 3, 5, 6),
  },
  {
    id: 'GEOM-3002',
    code: 'GM 3002',
    name: 'Ломаные линии',
    description: 'Динамичный рисунок для современных интерьеров и акцентных зон.',
    collection: 'geometry',
    color: 'Молочный',
    colorHint: 'Молочный / Синий глубокий',
    image: textureGeometry2,
    price: 2740,
    rollSize: '1.06 x 10 м',
    density: '258 г/м2',
    colors: colorSet(1, 3, 5, 6),
  },
  {
    id: 'GEOM-3003',
    code: 'GM 3003',
    name: 'Крупная клетка',
    description: 'Выразительная сетка для высоких стен, прихожих и открытых пространств.',
    collection: 'geometry',
    color: 'Графит',
    colorHint: 'Графит / Белый лед',
    image: textureGeometry3,
    price: 2810,
    rollSize: '1.06 x 10 м',
    density: '262 г/м2',
    colors: colorSet(0, 2, 5, 7),
  },
  {
    id: 'MIN-4001',
    code: 'MN 4001',
    name: 'Гладкий минимал',
    description: 'Практически гладкая поверхность с тонким жаккардовым эффектом.',
    collection: 'minimalism',
    color: 'Белый лед',
    colorHint: 'Белый лед / Молочный',
    image: textureMinimalism1,
    price: 2320,
    rollSize: '1.06 x 10 м',
    density: '220 г/м2',
    colors: colorSet(0, 1, 2, 4),
  },
  {
    id: 'MIN-4002',
    code: 'MN 4002',
    name: 'Супермат',
    description: 'Матовая фактура для интерьеров без лишних акцентов.',
    collection: 'minimalism',
    color: 'Песочный',
    colorHint: 'Песочный / Оливковый',
    image: textureMinimalism2,
    price: 2360,
    rollSize: '1.06 x 10 м',
    density: '225 г/м2',
    colors: colorSet(1, 2, 4, 5),
  },
  {
    id: 'MIN-4003',
    code: 'MN 4003',
    name: 'Тонкие полосы',
    description: 'Неброские вертикали, которые помогают визуально вытянуть стены.',
    collection: 'minimalism',
    color: 'Молочный',
    colorHint: 'Молочный / Серый',
    image: textureMinimalism3,
    price: 2410,
    rollSize: '1.06 x 10 м',
    density: '228 г/м2',
    colors: colorSet(0, 1, 3, 5),
  },
  {
    id: 'CLS-5001',
    code: 'CL 5001',
    name: 'Дамаск Light',
    description: 'Изящный классический орнамент для спальни, гостиной или столовой.',
    collection: 'classic',
    color: 'Молочный',
    colorHint: 'Молочный / Песочный',
    image: textureClassic1,
    price: 2980,
    rollSize: '1.06 x 10 м',
    density: '285 г/м2',
    colors: colorSet(0, 1, 2, 3),
  },
  {
    id: 'CLS-5002',
    code: 'CL 5002',
    name: 'Полоса Classic',
    description: 'Традиционная вертикальная полоса с мягким объемом под покраску.',
    collection: 'classic',
    color: 'Белый лед',
    colorHint: 'Белый лед / Теплый беж',
    image: textureClassic2,
    price: 2920,
    rollSize: '1.06 x 10 м',
    density: '280 г/м2',
    colors: colorSet(0, 1, 2, 6),
  },
  {
    id: 'CLS-5003',
    code: 'CL 5003',
    name: 'Растительный мотив',
    description: 'Мягкий орнамент для зон отдыха, где хочется больше тепла и глубины.',
    collection: 'classic',
    color: 'Пудровый',
    colorHint: 'Пудровый / Молочный',
    image: textureClassic3,
    price: 3050,
    rollSize: '1.06 x 10 м',
    density: '290 г/м2',
    colors: colorSet(1, 2, 3, 4),
  },
  {
    id: 'KIDS-6001',
    code: 'KD 6001',
    name: 'Облака',
    description: 'Нежная фактура для детских комнат, которую легко перекрасить с возрастом.',
    collection: 'kids',
    color: 'Белый лед',
    colorHint: 'Белый лед / Нежно-голубой',
    image: textureKids1,
    price: 2490,
    rollSize: '1.06 x 10 м',
    density: '235 г/м2',
    colors: colorSet(0, 1, 3, 6),
  },
  {
    id: 'KIDS-6002',
    code: 'KD 6002',
    name: 'Звездная ночь',
    description: 'Спокойный рисунок для уютной зоны сна и вечернего света.',
    collection: 'kids',
    color: 'Пудровый',
    colorHint: 'Пудровый / Синий глубокий',
    image: textureKids2,
    price: 2530,
    rollSize: '1.06 x 10 м',
    density: '238 г/м2',
    colors: colorSet(0, 3, 4, 6),
  },
  {
    id: 'KIDS-6003',
    code: 'KD 6003',
    name: 'Игра линий',
    description: 'Легкая геометрия для игровой, учебной зоны или комнаты подростка.',
    collection: 'kids',
    color: 'Терракота',
    colorHint: 'Терракота / Оливковый',
    image: textureKids3,
    price: 2570,
    rollSize: '1.06 x 10 м',
    density: '240 г/м2',
    colors: colorSet(1, 3, 4, 7),
  },
];
