from PIL import Image
import numpy as np

mask = np.array(Image.open("../test_data/segmentation/masks_gt/test-room.png"))
# Инвертируем цвета
inverted = 255 - mask
Image.fromarray(inverted.astype(np.uint8)).save("../test_data/segmentation/masks_gt/test-room.png")
print("✅ Маска инвертирована!")