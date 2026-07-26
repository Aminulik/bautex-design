# Segmentation Test Dataset

Use this folder for the diploma evaluation set.

Structure:

```text
test_data/segmentation/
  images/          input room photos
  masks_gt/        manually prepared wall masks, same base filename as image
  predictions/     generated masks from SegFormer
  metrics.json     output from evaluation script
```

Mask convention:

- white pixels: wall
- black pixels: background / not wall

Recommended workflow:

1. Put room photos into `images`.
2. Create ground-truth masks manually in `masks_gt`.
3. Run the local ML service: `npm run ml:start`.
4. Run:

```bash
python ml_service/evaluate_segmentation.py --service http://localhost:8000 --dataset test_data/segmentation
```

The script saves predicted masks and calculates IoU, Dice, precision, recall, and mask coverage.
