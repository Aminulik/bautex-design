# Demo Checklist

This file is the short defense/demo script for the BauTex Design diploma project.

## One-Command Start

From the project root:

```bash
npm run demo:up
```

Open:

- Frontend: http://localhost:3001
- Backend health: http://localhost:3003/health
- ML health: http://localhost:8000/health
- ML metrics page: http://localhost:3001/ml-metrics
- Visualization: http://localhost:3001/visualization

Stop the project:

```bash
npm run demo:down
```

Remove Docker volumes if you need a completely clean local state:

```bash
npm run docker:clean
```

## Demo Accounts

Default Docker admin credentials:

```text
Email: admin@example.com
Password: admin12345
```

For a user flow, register a new account through the site interface.

## Recommended Defense Scenario

1. Open the homepage and show navigation, catalog, collections, and where-to-buy map.
2. Register or log in as a user.
3. Open catalog or a collection, open a product modal, choose color and quantity.
4. Add the product to cart and favorites.
5. Open account page and show cart, favorites, orders, and saved visualization projects.
6. Open visualization page.
7. Upload a room photo, choose wallpaper, color, segmentation method, render mode, and print scale.
8. Run visualization and show:
   - before/after;
   - wall mask preview;
   - selected method and metrics;
   - manual brush fallback/correction.
9. Open `/visualization/how-it-works` and explain the pipeline:

```text
photo -> SegFormer -> wall mask -> wallpaper texture + color -> manual correction
```

10. Open `/ml-metrics` and explain IoU, Dice, Precision, and Recall.
11. Log in as admin and show users, orders, statuses, support requests, and catalog management.

## Test Photos For ML Metrics

For the diploma metrics page, add paired files:

```text
test_data/segmentation/images/room_001.jpg
test_data/segmentation/masks_gt/room_001.png
test_data/segmentation/images/room_002.jpg
test_data/segmentation/masks_gt/room_002.png
```

Rules:

- file names must match before extension;
- `images` contains original room photos;
- `masks_gt` contains manually prepared wall masks;
- mask white area means wall, black area means not wall;
- 5-10 pairs are enough for a diploma prototype demo;
- include different cases: empty wall, furniture, window/door, decor on wall, angled photo.

Run evaluation:

```bash
npm run ml:evaluate
```

Then open:

```text
http://localhost:3001/ml-metrics
```

## If Ports Are Busy

Docker usually handles this after `npm run demo:down`. For local processes on Windows:

```powershell
$ports = @(3001, 3003, 8000)
foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    Stop-Process -Id $connection.OwningProcess -Force
  }
}
```

