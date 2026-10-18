import os
import tempfile
import unittest

import numpy as np
import torch
from PIL import Image

import emonet


class EmoNetTest(unittest.TestCase):
    def test_output_shape(self):
        model = emonet.EmoNet().eval()
        out = model(torch.zeros(3, 1, 96, 96))
        self.assertEqual(tuple(out.shape), (3, 5))

    def test_param_count(self):
        n = sum(p.numel() for p in emonet.EmoNet().parameters())
        self.assertTrue(2_000_000 < n < 4_000_000, n)

    def test_emotions_order(self):
        self.assertEqual(emonet.EMOTIONS, ["neutral", "happy", "sad", "angry", "surprise"])

    def test_preprocess_any_input(self):
        rng = np.random.default_rng(0)
        inputs = [
            rng.integers(0, 255, (219, 219, 3), dtype=np.uint8),  # ảnh tự chụp
            rng.integers(0, 255, (48, 48), dtype=np.uint8),       # FER+ xám
            rng.integers(0, 255, (300, 200, 4), dtype=np.uint8),  # RGBA, không vuông
            Image.new("RGB", (120, 120), (200, 10, 10)),
        ]
        for img in inputs:
            g = emonet.preprocess_face(img)
            self.assertEqual(g.shape, (96, 96))
            self.assertEqual(g.dtype, np.uint8)

    def test_to_tensor_range(self):
        g = np.zeros((96, 96), np.uint8)
        g[0, 0] = 255
        t = emonet.to_tensor(g)
        self.assertEqual(tuple(t.shape), (1, 1, 96, 96))
        self.assertAlmostEqual(t.min().item(), -1.0)
        self.assertAlmostEqual(t.max().item(), 1.0)

    def test_save_load_roundtrip(self):
        model = emonet.EmoNet().eval()
        x = torch.randn(2, 1, 96, 96)
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "m.pt")
            emonet.save_emonet(model, path, extra={"epochs": 7})
            loaded, emotions = emonet.load_emonet(path)
        self.assertEqual(emotions, emonet.EMOTIONS)
        self.assertTrue(torch.allclose(model(x), loaded(x), atol=1e-6))

    def test_predict_probs(self):
        model = emonet.EmoNet().eval()
        g = np.random.default_rng(1).integers(0, 255, (96, 96), dtype=np.uint8)
        p = emonet.predict_probs(model, g)
        self.assertEqual(p.shape, (5,))
        self.assertAlmostEqual(float(p.sum()), 1.0, places=5)

    def test_no_face_on_blank(self):
        self.assertIsNone(emonet.detect_and_crop_face(Image.new("RGB", (320, 240))))


if __name__ == "__main__":
    unittest.main()
