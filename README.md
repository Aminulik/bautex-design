# BauTex Design — каталог и визуализация обоев

**BauTex Design** — full-stack веб-приложение для выбора обоев и их предварительной визуализации в интерьере. Пользователь может изучить каталог, подобрать цвет и фактуру, сохранить товары в избранное или корзину, а затем загрузить фото комнаты и увидеть результат наложения обоев.

## ✨ Что реализовано

### Для пользователя

- каталог обоев с коллекциями, карточками товаров, цветами и количеством;
- корзина, избранное, оформление заказов и личный кабинет;
- регистрация и вход по JWT;
- интерактивная визуализация: фото комнаты → маска стены → текстура и цвет обоев;
- ручная корректировка маски кистью, если автоматическая сегментация неточна;
- AI-чат, карта точек продаж, страницы инструкций и отзывов.

### Для администратора

- управление каталогом и цветами товаров;
- просмотр пользователей, заказов и обращений;
- изменение статусов заказов.

## 🧰 Стек

- **Frontend:** React 19, TypeScript, Redux Toolkit, React Router, Webpack.
- **Backend:** Node.js, Express, SQLite, JWT, Multer.
- **ML-сервис:** FastAPI, SegFormer B0, Pillow/OpenCV-совместимый пайплайн обработки изображений.
- **Инфраструктура:** Docker Compose; отдельные контейнеры для frontend, API и ML.

## 🎬 Демо

Самый быстрый способ запустить все сервисы:

```bash
npm run demo:up
```

После запуска откройте:

- приложение — `http://localhost:3001`;
- визуализацию — `http://localhost:3001/visualization`;
- метрики ML — `http://localhost:3001/ml-metrics`;
- проверку API — `http://localhost:3003/health`.

Тестовая учётная запись администратора для Docker: `admin@example.com` / `admin12345`.

Полный сценарий демонстрации находится в [DEMO.md](./DEMO.md).

## Requirements

- Node.js 22+
- npm

## Frontend

Install dependencies from the repository root:

```bash
npm install
```

Run the development server on `http://localhost:3001`:

```bash
npm start
```

Create a production build:

```bash
npm run build
```

The production frontend uses `/bautex-design/` as `publicPath` for GitHub Pages deployment.

## Backend

The only active backend is the Express app in `server`.

Install backend dependencies:

```bash
npm --prefix server install
```

Create `server/.env` from `server/.env.example`, then run:

```bash
npm run server:start
```

For development with reloads:

```bash
npm run server:dev
```

Default ports:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:3003`
- Health check: `http://localhost:3003/health`

## Local SegFormer Service

The diploma visualization flow can use a local FastAPI ML service:

```text
React -> Express /api/visualize -> FastAPI SegFormer -> wall mask -> wallpaper composite
```

Install Python dependencies:

```bash
npm run ml:install
```

Run the ML service on `http://localhost:8000`:

```bash
npm run ml:start
```

Set this in `server/.env`, then restart the backend:

```env
SEGFORMER_API_URL=http://localhost:8000/segment/wall
```

The first segmentation request downloads and loads `nvidia/segformer-b0-finetuned-ade-512-512`, so it can take longer than later requests.

Evaluate segmentation quality on a local diploma dataset:

```bash
npm run ml:evaluate
```

Put test photos into `test_data/segmentation/images` and manually prepared wall masks into `test_data/segmentation/masks_gt`.

## Docker

Run frontend, backend, and the local ML service together:

```bash
npm run docker:up
```

For a diploma defense/demo, the same command is also available as:

```bash
npm run demo:up
```

Stop containers:

```bash
npm run docker:down
```

Follow logs:

```bash
npm run docker:logs
```

Show container status:

```bash
npm run docker:ps
```

Remove containers and volumes for a clean local state:

```bash
npm run docker:clean
```

Default Docker ports are the same as local development: frontend `3001`, backend `3003`, ML service `8000`.

See `DEMO.md` for the recommended defense scenario, test accounts, and ML dataset structure.

Default Docker admin credentials:

- Email: `admin@example.com`
- Password: `admin12345`

## Project Doctor

Before a diploma demo, run:

```bash
npm run doctor
```

It checks frontend, backend, ML service, important files, Docker config, ports, and the local ML test dataset.

For a shorter API-only smoke check:

```bash
npm run smoke
```

## Environment

Do not commit local `.env` files. Use `server/.env.example` as the backend template.

Important backend variables:

- `PORT`
- `FRONTEND_ORIGIN`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- optional API keys used by chat or visualization integrations

## Repository Hygiene

The repository should not track generated or local runtime files:

- `dist/`, `build/`
- `.idea/`, `.vscode/`
- `.env`, `server/.env`
- SQLite databases such as `server/orders.db`
- backend runtime folders such as `server/debug/`, `server/results/`, `server/uploads/`, `server/temp/`
- `node_modules/` in the root or `server`

## Diploma ML Notes

The implemented production path is local FastAPI + SegFormer B0. For the report, it is enough to compare other architectures theoretically if the implemented project includes:

- one working neural segmentation pipeline;
- one fallback method for comparison;
- manual correction;
- a small test dataset;
- metrics such as IoU, Dice, Precision, and Recall.

Recommended theoretical alternatives for the diploma comparison:

- U-Net;
- DeepLabV3+;
- PSPNet;
- SAM;
- Mask2Former;
- OneFormer;
- YOLOv8-seg.

Implementing every alternative is not required for a practical diploma prototype and would significantly increase scope, dependencies, and hardware requirements.
