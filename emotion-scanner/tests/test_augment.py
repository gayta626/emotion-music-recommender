import unittest

import torch

from augment import augment_batch


class AugmentTest(unittest.TestCase):
    def setUp(self):
        self.x = torch.rand(16, 1, 96, 96, generator=torch.Generator().manual_seed(0))

    def test_shape_and_range(self):
        out = augment_batch(self.x, torch.Generator().manual_seed(1))
        self.assertEqual(out.shape, self.x.shape)
        self.assertGreaterEqual(out.min().item(), 0.0)
        self.assertLessEqual(out.max().item(), 1.0)
        self.assertFalse(torch.isnan(out).any())

    def test_deterministic_with_seed(self):
        a = augment_batch(self.x, torch.Generator().manual_seed(7))
        b = augment_batch(self.x, torch.Generator().manual_seed(7))
        self.assertTrue(torch.equal(a, b))

    def test_changes_images(self):
        out = augment_batch(self.x, torch.Generator().manual_seed(3))
        self.assertFalse(torch.allclose(out, self.x))

    def test_input_not_modified(self):
        before = self.x.clone()
        augment_batch(self.x, torch.Generator().manual_seed(4))
        self.assertTrue(torch.equal(before, self.x))


if __name__ == "__main__":
    unittest.main()
