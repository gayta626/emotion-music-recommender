import os
import tempfile
import unittest

import numpy as np

import prepare_data as pdp
from emonet import EMOTIONS


class LabelTest(unittest.TestCase):
    def test_map_label(self):
        self.assertEqual(pdp.map_label("anger"), "angry")
        self.assertEqual(pdp.map_label("happiness"), "happy")
        self.assertEqual(pdp.map_label("happy"), "happy")
        self.assertEqual(pdp.map_label("sadness"), "sad")
        self.assertEqual(pdp.map_label("sad"), "sad")
        self.assertEqual(pdp.map_label("surprise"), "surprise")
        self.assertEqual(pdp.map_label("neutral"), "neutral")
        for name in ["disgust", "fear", "contempt"]:
            self.assertIsNone(pdp.map_label(name))

    def test_every_source_maps_to_five_classes(self):
        for source, cfg in pdp.SOURCES.items():
            mapped = {pdp.map_label(n) for n in cfg["names"]} - {None}
            self.assertEqual(mapped, set(EMOTIONS), source)
            unknown = [n for n in cfg["names"] if pdp.map_label(n) is None and n not in pdp.DROPPED]
            self.assertEqual(unknown, [], source)

    def test_person_of(self):
        self.assertEqual(pdp.person_of("data/happy/dat_happy_1789957334112.jpg"), "dat")
        self.assertEqual(pdp.person_of("vy_suprise_1787055768537 (1).jpg"), "vy")
        self.assertEqual(pdp.person_of("data\\angry\\vanquynh_angry_1.jpg"), "vanquynh")

    def test_excluded_people(self):
        self.assertTrue(pdp.is_excluded("dat_angry_1789957457800.jpg"))
        self.assertTrue(pdp.is_excluded("phat_happy_1.jpg"))
        self.assertFalse(pdp.is_excluded("ducvinh_sad_1.jpg"))
        self.assertFalse(pdp.is_excluded("phatt_sad_1.jpg"))


class QualityTest(unittest.TestCase):
    def test_reasons(self):
        self.assertEqual(pdp.quality_reason(np.full((30, 30), 128, np.uint8)), "too_small")
        self.assertEqual(pdp.quality_reason(np.zeros((96, 96), np.uint8)), "bad_light")
        self.assertEqual(pdp.quality_reason(np.full((96, 96), 128, np.uint8)), "blurry")
        noise = np.random.default_rng(0).integers(0, 255, (96, 96), dtype=np.uint8)
        self.assertIsNone(pdp.quality_reason(noise))


class DedupTest(unittest.TestCase):
    def test_near(self):
        rng = np.random.default_rng(0)
        a = rng.integers(0, 255, (96, 96), dtype=np.uint8)
        b = a.copy()
        c = np.random.default_rng(1).integers(0, 255, (96, 96), dtype=np.uint8)
        hashes = [pdp.dhash(a), pdp.dhash(b), pdp.dhash(c)]
        self.assertEqual(pdp.dedup_near(hashes, 6), [0, 2])

    def test_exact(self):
        self.assertEqual(pdp.dedup_exact([5, 5, 7, 5]), [0, 2])

    def test_hamming(self):
        self.assertEqual(pdp.hamming(0b1011, 0b0001), 2)


class LabelFixTest(unittest.TestCase):
    def test_read_and_apply(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "fixes.csv")
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write("file,action,new_label\n")
                f.write("x.jpg,relabel,angry\n")
                f.write("vy_suprise_1787055768537 (1).jpg,drop,\n")
                f.write("z.jpg,keep,\n")
            fixes = pdp.read_label_fixes(path)
        self.assertEqual(pdp.apply_label_fix("x.jpg", "neutral", fixes), "angry")
        self.assertIsNone(pdp.apply_label_fix("vy_suprise_1787055768537 (1).jpg", "surprise", fixes))
        self.assertEqual(pdp.apply_label_fix("z.jpg", "sad", fixes), "sad")
        self.assertEqual(pdp.apply_label_fix("other.jpg", "happy", fixes), "happy")

    def test_missing_file_means_no_fixes(self):
        self.assertEqual(pdp.read_label_fixes("khong_co_file_nay.csv"), {})


class HoldoutTest(unittest.TestCase):
    def test_deterministic_and_about_five_percent(self):
        a = pdp.holdout_mask(1000, 0.05, 42)
        self.assertEqual(a, pdp.holdout_mask(1000, 0.05, 42))
        self.assertTrue(30 <= sum(a) <= 70, sum(a))


class FeedbackTest(unittest.TestCase):
    """Ảnh người dùng sửa cảm xúc (C15) -> nguồn "feedback", luôn vào tập train."""

    def test_process_feedback_dir(self):
        from PIL import Image
        rng = np.random.default_rng(0)
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "feedback_faces", "sad")
            os.makedirs(src)
            # ảnh nhiễu: đủ sáng, đủ nét, đủ to để qua bộ lọc chất lượng
            Image.fromarray(rng.integers(40, 220, (120, 120, 3), dtype=np.uint8)).save(os.path.join(src, "u7_sad_20261017T153012345.jpg"))
            old_out = pdp.OUT_DIR
            pdp.OUT_DIR = os.path.join(tmp, "processed")
            try:
                removed = {}
                rows = pdp.process_own({}, removed, os.path.join(tmp, "feedback_faces"), "feedback")
            finally:
                pdp.OUT_DIR = old_out
            self.assertEqual(len(rows), 1, removed)
            self.assertEqual((rows[0]["source"], rows[0]["person"], rows[0]["label"], rows[0]["split_hint"]),
                             ("feedback", "u7", "sad", "train"))
            self.assertIn("/feedback/sad/", rows[0]["path"])


if __name__ == "__main__":
    unittest.main()
