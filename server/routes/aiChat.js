// server/routes/aiChat.js
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// ========== ИНИЦИАЛИЗАЦИЯ TAVILY ==========
let tvly = null;
if (process.env.TAVILY_API_KEY) {
  try {
    const { tavily } = require('@tavily/core');
    tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    console.log('✅ Tavily initialized');
  } catch (error) {
    console.error('❌ Tavily init error:', error.message);
  }
}

// ========== ИНИЦИАЛИЗАЦИЯ GIGACHAT ==========
let gigachatClient = null;

async function initGigaChat() {
  if (!process.env.GIGACHAT_API_KEY) {
    console.warn('⚠️ GIGACHAT_API_KEY не задан — контроль контекста отключен');
    return null;
  }

  try {
    const { GigaChat } = await import('gigachat');
    const https = await import('node:https');

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const client = new GigaChat({
      timeout: 15,
      model: 'GigaChat',
      credentials: process.env.GIGACHAT_API_KEY,
      httpsAgent: httpsAgent,
    });

    // Проверяем соединение
    await client.chat({
      messages: [{ role: 'user', content: 'Тест' }],
      max_tokens: 10,
    });

    console.log('✅ GigaChat инициализирован для контроля контекста');
    return client;
  } catch (error) {
    console.error('❌ Ошибка инициализации GigaChat:', error.message);
    return null;
  }
}

// Запускаем инициализацию
(async () => {
  gigachatClient = await initGigaChat();
})();

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

// ========== ПРОМПТ ДЛЯ ПРОВЕРКИ ТЕМЫ ==========
const TOPIC_CHECK_PROMPT = `Ты — классификатор запросов для магазина дизайнерских обоев BauTex.

ТВОЯ ЗАДАЧА: определить, относится ли сообщение пользователя к теме "обои, дизайн интерьера, ремонт, декор стен, цветовые решения, отделочные материалы, визуализация, подбор материалов, уход за стенами".

ТЕМАТИЧЕСКИЕ запросы — это вопросы про:
- обои (все типы, материалы, коллекции, цены, сравнение)
- дизайн интерьера, стили, оформление стен
- ремонт и отделку стен, поклейку, подготовку
- цвета, оттенки, сочетания, колеровку
- фактуры, текстуры, принты, узоры
- выбор материалов для стен
- уход за обоями, чистка, мытье, удаление пятен
- визуализацию, примерку обоев на фото
- интерьерные стили, тренды в дизайне
- декор стен, панно, молдинги, плинтусы
- расчет рулонов, стоимость, доставку, заказ
- любые повреждения обоев и их решение (пролил, испачкал, порвал и т.д.)

НЕТЕМАТИЧЕСКИЕ запросы — это: погода, еда, рецепты, политика, спорт, здоровье, математика, шутки, анекдоты, технологии не про обои, путешествия, личные вопросы и всё остальное, что НЕ связано с обоями и интерьером.

Ответь СТРОГО одним словом:
- "тема" — если запрос про обои/дизайн/интерьер/ремонт
- "нете" — если запрос на любую другую тему

Сообщение пользователя:`;

// ========== ПРОМПТ ДЛЯ ПЕРЕХОДА ==========
const REDIRECT_PROMPT = `Ты — ИИ-консультант магазина дизайнерских обоев BauTex.

Пользователь написал нетематическое сообщение. Твоя задача — ВЕЖЛИВО и КРЕАТИВНО перевести разговор на тему обоев и интерьера.

ПРАВИЛА:
1. Ответ должен быть коротким (1-3 предложения)
2. Обязательно упомяни обои, дизайн или интерьер
3. Предложи конкретное действие: посмотреть каталог, сделать визуализацию, рассчитать рулоны, выбрать коллекцию
4. Будь дружелюбным и позитивным
5. Не углубляйся в тему пользователя, а переводи на обои

Примеры:
- На "какая погода" → "В любую погоду приятно обновить интерьер! ☀️ Посмотрите наш каталог обоев или загрузите фото комнаты для визуализации."
- На "расскажи анекдот" → "У меня есть кое-что повеселее анекдотов — коллекция обоев с яркими принтами! 🌿 Хотите посмотреть Botanical Line?"
- На "сколько будет 2+2" → "Посчитать могу только рулоны для вашей комнаты! 📐 Напишите площадь стен, и я всё рассчитаю."
- На "приготовить борщ" → "Пока готовится ужин, можно выбрать обои для кухни! 🍲 У нас есть влагостойкие коллекции. Посмотрите каталог."
- На "биткоин курс" → "Инвестиции в интерьер — самые надежные! 💎 Вложитесь в красивые обои, и настроение будет расти каждый день."

Сообщение пользователя:`;

// ========== ПРОМПТ ДЛЯ ФИЛЬТРАЦИИ ОТВЕТОВ TAVILY ==========
const FILTER_PROMPT = `Ты — редактор ответов для магазина обоев BauTex.

Проверь, относится ли этот текст к теме "обои, дизайн интерьера, ремонт, декор, отделка стен, цвета, фактуры, визуализация".

Если текст НЕ по теме (например, про погоду, еду, спорт, политику, общие новости) — напиши "отклонить".
Если текст по теме — напиши "принять".

Текст:`;

// ========== КЛЮЧЕВЫЕ СЛОВА ПО ТЕМЕ (локальный фоллбэк) ==========
const TOPIC_KEYWORDS = [
  // Обои
  'обои',
  'обоями',
  'обоев',
  'обойный',
  'обойная',
  'обойные',
  'флизелин',
  'флизелиновые',
  'винил',
  'виниловые',
  'бумажные',
  'текстильные',
  'стеклообои',
  'жидкие обои',
  'фотообои',

  // Стены
  'стена',
  'стены',
  'стен',
  'стену',
  'стеной',
  'стенами',
  'стенка',
  'стенки',
  'потолок',
  'потолка',

  // Дизайн
  'дизайн',
  'интерьер',
  'интерьера',
  'интерьере',
  'интерьеру',
  'декор',
  'декора',
  'декорирование',
  'стиль',
  'стиля',
  'стиле',
  'лофт',
  'минимализм',
  'классика',
  'сканди',
  'прованс',
  'хай-тек',
  'модерн',
  'ар-деко',
  'бохо',

  // Цвета
  'цвет',
  'цвета',
  'цветов',
  'оттенок',
  'оттенка',
  'палитра',
  'палитры',
  'колер',
  'колера',
  'колеровка',
  'сочетание',
  'комбинация',
  'гамма',
  'бежевый',
  'серый',
  'белый',
  'зеленый',
  'синий',
  'голубой',
  'розовый',
  'терракотовый',
  'графитовый',
  'молочный',

  // Фактуры
  'фактура',
  'фактуры',
  'текстура',
  'текстуры',
  'рельеф',
  'рельефные',
  'гладкие',
  'матовые',
  'глянцевые',

  // Принты
  'принт',
  'принта',
  'принты',
  'узор',
  'узора',
  'рисунок',
  'орнамент',
  'геометрия',
  'полоска',
  'цветы',
  'абстракция',
  'вензель',

  // Коллекции
  'коллекция',
  'коллекции',
  'каталог',
  'каталога',
  'ассортимент',
  'новинка',
  'новинки',

  // Комнаты
  'комната',
  'комнаты',
  'комнату',
  'комнате',
  'гостиная',
  'гостиной',
  'спальня',
  'спальни',
  'кухня',
  'кухни',
  'прихожая',
  'прихожей',
  'детская',
  'детской',
  'ванная',
  'ванной',
  'кабинет',
  'коридор',
  'балкон',

  // Ремонт
  'ремонт',
  'ремонта',
  'ремонте',
  'поклейка',
  'поклеить',
  'поклейки',
  'клеить',
  'наклеить',
  'переклеить',
  'клей',
  'клея',
  'грунтовка',
  'инструмент',
  'шпатель',
  'валик',
  'стык',
  'стыки',
  'стыковка',
  'технология',
  'инструкция',

  // Расчет
  'рулон',
  'рулона',
  'рулонов',
  'рулоне',
  'сколько нужно',
  'количество',
  'расчет',
  'рассчитать',
  'калькулятор',
  'метраж',
  'площадь',
  'цена',
  'цены',
  'стоимость',
  'стоит',
  'акция',
  'акции',
  'скидка',
  'скидки',

  // Доставка
  'доставка',
  'доставки',
  'доставке',
  'заказ',
  'заказать',
  'заказе',

  // Визуализация
  'визуализация',
  'визуализации',
  'примерка',
  'примерить',
  'фото',
  'загрузить',

  // Уход
  'мыть',
  'мытья',
  'помыть',
  'отмыть',
  'отмывать',
  'чистить',
  'чистка',
  'очистить',
  'протереть',
  'пятно',
  'пятна',
  'пятен',
  'загрязнение',
  'пролил',
  'пролила',
  'пролить',
  'разлить',
  'испачкать',
  'запачкать',
  'грязь',
  'суп',
  'сок',
  'вино',
  'кофе',
  'чай',
  'жир',
  'уход',
  'ухаживать',
  'влажная уборка',

  // Качество
  'качество',
  'износостойкость',
  'влагостойкие',
  'экологичные',
  'экологичность',
  'состав',
  'материал',
  'материала',
  'покрытие',
  'производство',
  'производитель',

  // Тренды
  'тренд',
  'тренды',
  'модно',
  'модные',
  'современный',
  'современные',
  'популярный',

  // Бренд
  'bautex',
  'баутекс',
  'кварцевая нить',
  'жаккард',
];

// ========== ТРИГГЕРЫ ДЛЯ ПОИСКА ==========
const SEARCH_TRIGGERS = [
  'тренд',
  'модн',
  '2024',
  '2025',
  '2026',
  'новинк',
  'популярн',
  'современн',
  'как',
  'почему',
  'чем отлича',
  'сравнен',
  'какой лучше',
  'какие лучше',
  'что лучше',
  'что выбрать',
  'сколько стоит',
  'цена',
  'прайс',
  'дорого',
  'отзыв',
  'рейтинг',
  'лучшие',
  'топ',
  'технология',
  'производств',
  'из чего',
  'экологич',
  'состав',
  'характеристик',
  'как клеить',
  'поклейка',
  'инструкци',
  'техника',
  'сколько рулонов',
  'расчет',
  'калькулятор',
  'что такое',
  'определение',
  'значение',
  'как ухаживать',
  'мыть',
  'чистить',
  'отмыть',
  'как сочетать',
  'комбинировать',
  'подобрать',
  'какие обои',
  'для кухни',
  'для ванной',
  'для спальни',
  'для детской',
  'для гостиной',
  'для прихожей',
];

// ========== ПРОВЕРКА ТЕМЫ ЧЕРЕЗ GIGACHAT ==========
async function checkTopicWithGigaChat(text) {
  if (!gigachatClient) return null;

  try {
    const response = await gigachatClient.chat({
      messages: [
        { role: 'system', content: TOPIC_CHECK_PROMPT },
        { role: 'user', content: text },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const answer = response.choices?.[0]?.message?.content?.trim().toLowerCase() || '';
    console.log(`🔍 GigaChat классификация: "${answer}" для запроса: "${text}"`);

    if (answer.includes('тема')) return true;
    if (answer.includes('нете')) return false;

    return null;
  } catch (error) {
    console.error('❌ GigaChat check error:', error.message);
    return null;
  }
}

// ========== ГЕНЕРАЦИЯ ПЕРЕХОДА ЧЕРЕЗ GIGACHAT ==========
async function generateRedirectWithGigaChat(text) {
  if (!gigachatClient) return getOffTopicReply(text);

  try {
    const response = await gigachatClient.chat({
      messages: [
        { role: 'system', content: REDIRECT_PROMPT },
        { role: 'user', content: text },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const reply = response.choices?.[0]?.message?.content?.trim();
    if (reply && reply.length > 10) {
      console.log('✅ GigaChat сгенерировал переход');
      return reply;
    }
  } catch (error) {
    console.error('❌ GigaChat redirect error:', error.message);
  }

  return getOffTopicReply(text);
}

// ========== ФИЛЬТРАЦИЯ ОТВЕТОВ TAVILY ==========
async function filterTavilyAnswer(text) {
  if (!gigachatClient || !text || text.length < 20) return text;

  try {
    const response = await gigachatClient.chat({
      messages: [
        { role: 'system', content: FILTER_PROMPT },
        { role: 'user', content: text.slice(0, 500) },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const verdict = response.choices?.[0]?.message?.content?.trim().toLowerCase() || '';

    if (verdict.includes('отклонить')) {
      console.log('🚫 GigaChat отклонил ответ Tavily как нетематический');
      return null;
    }

    return text;
  } catch (error) {
    console.error('❌ GigaChat filter error:', error.message);
    return text;
  }
}

// ========== ЛОКАЛЬНАЯ ПРОВЕРКА ТЕМЫ ==========
function isOnTopic(text) {
  const t = text.toLowerCase();
  return TOPIC_KEYWORDS.some((kw) => t.includes(kw));
}

// ========== ПРОВЕРКА НУЖЕН ЛИ ПОИСК ==========
function needsSearch(text) {
  const t = text.toLowerCase();
  return SEARCH_TRIGGERS.some((trigger) => t.includes(trigger));
}

// ========== НЕТЕМАТИЧЕСКИЕ ОТВЕТЫ (локальный фоллбэк) ==========
function getOffTopicReply(text) {
  const t = text.toLowerCase();

  if (t.includes('погод')) {
    return 'В любую погоду приятно обновить интерьер! ☀️ Кстати, у нас есть потрясающие коллекции обоев. Хотите посмотреть каталог или попробовать визуализацию на вашем фото?';
  }

  if (
    t.includes('борщ') ||
    t.includes('еда') ||
    t.includes('готовить') ||
    t.includes('рецепт') ||
    t.includes('суп')
  ) {
    return 'Пока готовится ужин, можно выбрать обои для кухни! 🍲 У нас есть влагостойкие коллекции с интересными принтами. Посмотрите каталог на сайте.';
  }

  if (t.includes('анекдот') || t.includes('шутк') || t.includes('смешн') || t.includes('юмор')) {
    return 'Хотите поднять настроение? Посмотрите нашу коллекцию Botanical Line — принты просто огонь! 🌿 Показать?';
  }

  if (
    t.includes('сколько будет') ||
    t.includes('посчитай') ||
    t.includes('реши') ||
    t.includes('2+2') ||
    t.includes('математик')
  ) {
    return 'Посчитать могу только рулоны для вашей комнаты! 📐 Хотите рассчитать, сколько обоев понадобится? Напишите площадь стен.';
  }

  if (
    t.includes('путин') ||
    t.includes('политик') ||
    t.includes('выборы') ||
    t.includes('президент') ||
    t.includes('войн') ||
    t.includes('сво')
  ) {
    return 'Я консультант по дизайнерским обоям и интерьеру. Давайте обсудим, как преобразить ваши стены! У нас сейчас отличные новинки.';
  }

  if (t.includes('религи') || t.includes('бог') || t.includes('церков')) {
    return 'Я специализируюсь на обоях и дизайне. Могу рассказать про нашу коллекцию Abstract relief — там интересные текстуры для медитативного интерьера.';
  }

  if (
    t.includes('лечить') ||
    t.includes('болезнь') ||
    t.includes('таблетк') ||
    t.includes('врач')
  ) {
    return 'Со здоровьем не помогу, а вот "вылечить" скучные стены — это ко мне! Покажите фото комнаты, и я подскажу, какие обои подойдут.';
  }

  if (
    t.includes('крипт') ||
    t.includes('биткоин') ||
    t.includes('акци') ||
    t.includes('инвестиц')
  ) {
    return 'Инвестиции в интерьер — самые надежные! Вложитесь в красивые обои, и настроение будет расти каждый день. Показать каталог?';
  }

  // Универсальный ответ
  const replies = [
    'Интересно! Но я больше по обоям и дизайну. Давайте подберем что-то красивое для ваших стен?',
    'Я бы с радостью поболтал, но моя специализация — дизайнерские обои. Хотите посмотреть каталог?',
    'Не совсем моя тема. Зато могу рассказать, как преобразить комнату с помощью обоев. Интересует?',
    'Спросите что-нибудь про обои или интерьер — и я буду счастлив помочь!',
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

// ========== ДОБАВЛЕНИЕ КАТАЛОЖНОЙ ПОДВОДКИ ==========
function addBauTexContext(answer, hadSearch) {
  if (!answer) return answer;

  if (
    answer.includes('каталог') ||
    answer.includes('bautex') ||
    answer.includes('визуализаци') ||
    answer.includes('на сайте')
  ) {
    return answer;
  }

  const hooks = [
    '\n\n🎨 Посмотрите наши коллекции обоев в каталоге на сайте.',
    '\n\n✨ Загрузите фото комнаты в разделе «Визуализация» и примерьте разные обои.',
    '\n\n🏠 Хотите увидеть больше? Переходите в каталог — там все наши коллекции.',
    '\n\n📐 Кстати, у нас есть калькулятор рулонов на сайте — удобно считать.',
    '\n\n💎 Наши обои из кварцевой нити — инновационное решение для стен.',
  ];

  if (hadSearch) {
    return answer + hooks[Math.floor(Math.random() * hooks.length)];
  }

  return answer;
}

// ========== FALLBACK ==========
function getFallbackResponse() {
  return `Сложный вопрос! Вот что можно сделать:

1. 📸 **Визуализация** — загрузите фото комнаты и примерьте разные обои
2. 🎨 **Каталог** — посмотрите все коллекции на сайте
3. 📞 **Менеджер** — оставьте номер телефона, и мы перезвоним

Что выберете?`;
}

// ========== ТЕЛЕФОН ==========
function isPhoneNumber(text) {
  const phoneRegex = /(\+7|8|7)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}/;
  return phoneRegex.test(text);
}

async function savePhoneNumber(userId, phoneNumber) {
  if (!db) return;
  const query = `
    INSERT INTO call_requests (user_id, phone_number, question, status, created_at)
    VALUES (?, ?, '', 'pending', datetime('now'))
  `;
  db.run(query, [userId, phoneNumber], (err) => {
    if (err) console.error('Failed to save phone:', err);
    else console.log(`📞 Phone saved for ${userId}`);
  });
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function generateAiReply(userText, userId = 'guest') {
  const text = String(userText || '').trim();

  // Пусто
  if (!text)
    return 'Напишите ваш вопрос про обои или интерьер. Я помогу с выбором, расчетом или визуализацией!';

  // Телефон
  if (isPhoneNumber(text)) {
    await savePhoneNumber(userId, text);
    return '✅ Спасибо! Номер принят. Менеджер свяжется с вами в ближайшее время. А пока можете посмотреть каталог обоев на сайте или попробовать визуализацию.';
  }

  // Приветствие
  const greetings = [
    'привет',
    'здравствуй',
    'здравствуйте',
    'добрый день',
    'доброе утро',
    'добрый вечер',
    'хай',
    'hello',
    'доброго',
    'приветствую',
  ];
  if (greetings.some((g) => text.toLowerCase().includes(g)) && text.length < 30) {
    return 'Здравствуйте! Я консультант магазина дизайнерских обоев BauTex. Могу помочь с выбором обоев, рассчитать количество рулонов или рассказать о коллекциях. Что вас интересует?';
  }

  // === ШАГ 1: ПРОВЕРКА ТЕМЫ ЧЕРЕЗ GIGACHAT ===
  const gigaChatVerdict = await checkTopicWithGigaChat(text);

  if (gigaChatVerdict === false) {
    // Точно нетематическое
    return await generateRedirectWithGigaChat(text);
  }

  if (gigaChatVerdict === null) {
    // GigaChat не смог — локальная проверка
    if (!isOnTopic(text)) {
      return getOffTopicReply(text);
    }
  }

  // === ШАГ 2: ЕСЛИ TAVILY НЕТ ===
  if (!tvly) {
    console.warn('⚠️ Tavily not available');
    return 'Уточните, пожалуйста, ваш вопрос про обои. Я могу помочь с выбором коллекции, цвета или рассчитать количество рулонов.';
  }

  // === ШАГ 3: ПОИСК ЧЕРЕЗ TAVILY ===
  try {
    const searchQuery = needsSearch(text) ? `обои дизайн интерьера ${text}` : text;
    console.log(`🔍 Tavily search: "${searchQuery}"`);

    const response = await tvly.search(searchQuery, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true,
    });

    // Готовый ответ
    if (response?.answer) {
      const filtered = await filterTavilyAnswer(response.answer);

      if (filtered) {
        return addBauTexContext(filtered, true);
      } else {
        // Ответ отклонен — показываем с оговоркой
        return `Вот что удалось найти:\n\n${response.answer}\n\n🎨 Но давайте лучше про обои! Что именно вас интересует?`;
      }
    }

    // Комбинируем результаты
    if (response?.results?.length > 0) {
      const topResults = response.results
        .slice(0, 3)
        .map((r) => r.content)
        .filter(Boolean)
        .join('\n\n');

      if (topResults) {
        const filtered = await filterTavilyAnswer(topResults);
        if (filtered) {
          return addBauTexContext(filtered, true);
        }
        return addBauTexContext(topResults, true);
      }
    }

    // Ничего не нашли
    console.log(`📭 No results for: "${text}"`);
    return getFallbackResponse();
  } catch (error) {
    console.error('❌ Tavily error:', error.message);
    return getFallbackResponse();
  }
}

// ========== РОУТЫ ==========

// POST /api/ai_chat/message
router.post('/message', authenticateToken, async (req, res) => {
  const { message } = req.body;
  const userId = String(req.user?.id ?? 'guest');

  if (!message || !message.trim()) {
    return res.status(400).json({
      reply: 'Пожалуйста, напишите ваш вопрос.',
    });
  }

  try {
    const now = new Date().toISOString();

    // Сохраняем сообщение пользователя
    db.run(
      `INSERT INTO ai_chat_messages (id, user_id, sender, text, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [generateId(), userId, 'user', String(message), now],
      (err) => {
        if (err) console.error('Save user msg error:', err);
      }
    );

    // Генерируем ответ
    const replyText = await generateAiReply(message, userId);

    // Сохраняем ответ ИИ
    db.run(
      `INSERT INTO ai_chat_messages (id, user_id, sender, text, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [generateId(), userId, 'ai', replyText, new Date().toISOString()],
      (err) => {
        if (err) console.error('Save ai msg error:', err);
      }
    );

    return res.json({ reply: replyText });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ reply: getFallbackResponse() });
  }
});

// GET /api/ai_chat/history
router.get('/history', authenticateToken, (req, res) => {
  const userId = String(req.user?.id ?? 'guest');

  db.all(
    `SELECT id, user_id as userId, sender, text, timestamp
     FROM ai_chat_messages
     WHERE user_id = ?
     ORDER BY timestamp ASC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('History error:', err);
        return res.status(500).json([]);
      }
      return res.json(rows || []);
    }
  );
});

// DELETE /api/ai_chat/clear
router.delete('/clear', authenticateToken, (req, res) => {
  const userId = String(req.user?.id ?? 'guest');

  db.run(`DELETE FROM ai_chat_messages WHERE user_id = ?`, [userId], (err) => {
    if (err) {
      console.error('Clear error:', err);
      return res.status(500).json({ error: 'Failed to clear history' });
    }
    return res.json({ success: true });
  });
});

module.exports = router;
