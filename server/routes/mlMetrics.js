const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file)).length;
}

function readLatestEvaluatorReport() {
  const candidates = [
    path.join(__dirname, '../../test_data/segmentation/metrics-report.json'),
    path.join(__dirname, '../debug/segmentation-metrics.json'),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  return null;
}

router.get('/', (_req, res) => {
  const datasetRoot = path.join(__dirname, '../../test_data/segmentation');
  const imagesCount = countFiles(path.join(datasetRoot, 'images'));
  const masksCount = countFiles(path.join(datasetRoot, 'masks_gt'));
  const evaluatorReport = readLatestEvaluatorReport();

  db.get('SELECT * FROM ml_metric_runs ORDER BY created_at DESC LIMIT 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch ML metrics' });

    let latest = null;
    if (row) {
      latest = {
        id: row.id,
        datasetPath: row.dataset_path,
        imagesCount: row.images_count,
        meanIoU: row.mean_iou,
        meanDice: row.mean_dice,
        meanPrecision: row.mean_precision,
        meanRecall: row.mean_recall,
        createdAt: row.created_at,
      };
    } else if (evaluatorReport) {
      latest = evaluatorReport;
    }

    return res.json({
      dataset: {
        path: 'test_data/segmentation',
        imagesCount,
        masksCount,
        ready: imagesCount > 0 && masksCount > 0,
      },
      latest,
      metricGuide: [
        { key: 'IoU', label: 'Intersection over Union', good: '0.70+' },
        { key: 'Dice', label: 'Dice coefficient', good: '0.80+' },
        { key: 'Precision', label: 'Точность выделения', good: '0.85+' },
        { key: 'Recall', label: 'Полнота выделения стены', good: '0.80+' },
      ],
    });
  });
});

router.post('/', (req, res) => {
  const { datasetPath, imagesCount, meanIoU, meanDice, meanPrecision, meanRecall, report } =
    req.body;

  db.run(
    `INSERT INTO ml_metric_runs (
      dataset_path, images_count, mean_iou, mean_dice, mean_precision, mean_recall, report_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datasetPath || 'test_data/segmentation',
      Number(imagesCount || 0),
      Number(meanIoU || 0),
      Number(meanDice || 0),
      Number(meanPrecision || 0),
      Number(meanRecall || 0),
      JSON.stringify(report || {}),
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to save ML metrics' });
      return res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

module.exports = router;
