import json
import os
import tempfile
import unittest

import cv_common as cv
from emonet import EMOTIONS

PEOPLE = [f"p{i}" for i in range(10)]


def fake_rows():
    rows = []
    for p in PEOPLE:
        for e in EMOTIONS:
            if p == "p0" and e == "surprise":
                continue  # giống 'dat' thiếu surprise
            for k in range(2):
                rows.append({"path": f"{p}_{e}_{k}.png", "label": e, "source": "own", "person": p,
                             "split_hint": "train", "orig": f"data/{e}/{p}_{e}_{k}.jpg"})
    for i in range(60):
        rows.append({"path": f"pub{i}.png", "label": EMOTIONS[i % 5], "source": "rafdb", "person": "",
                     "split_hint": "public_holdout" if i < 10 else "train", "orig": ""})
    return rows


class FoldTest(unittest.TestCase):
    def setUp(self):
        self.rows = fake_rows()
        self.folds = cv.make_folds(self.rows)

    def test_each_person_tested_once_two_per_fold(self):
        self.assertEqual(len(self.folds), 5)
        tested = [p for f in self.folds for p in f["test_people"]]
        self.assertEqual(sorted(tested), sorted(PEOPLE))
        for f in self.folds:
            self.assertEqual(len(f["test_people"]), 2)

    def test_no_person_leaks(self):
        for f in self.folds:
            train_people = {self.rows[i]["person"] for i in f["train_idx"]} - {""}
            self.assertFalse(train_people & set(f["test_people"]))
            self.assertNotIn(f["val_person"], train_people)
            self.assertNotIn(f["val_person"], f["test_people"])
            self.assertEqual({self.rows[i]["person"] for i in f["val_person_idx"]}, {f["val_person"]})
            self.assertEqual({self.rows[i]["person"] for i in f["test_idx"]}, set(f["test_people"]))

    def test_public_split(self):
        for f in self.folds:
            holdout = {i for i, r in enumerate(self.rows) if r["split_hint"] == "public_holdout"}
            self.assertEqual(set(f["val_public_idx"]), holdout)
            self.assertFalse(holdout & set(f["train_idx"]))
            public_train = {i for i, r in enumerate(self.rows) if r["source"] != "own" and r["split_hint"] == "train"}
            self.assertTrue(public_train <= set(f["train_idx"]))

    def test_deterministic(self):
        self.assertEqual(self.folds, cv.make_folds(self.rows))


class WeightTest(unittest.TestCase):
    def test_own_share_and_class_balance(self):
        rows = fake_rows()
        idx = cv.make_folds(rows)[0]["train_idx"]
        w = cv.sample_weights(rows, idx, own_share=0.2)
        total = w.sum().item()
        own = sum(w[j].item() for j, i in enumerate(idx) if rows[i]["source"] == "own")
        self.assertAlmostEqual(own / total, 0.2, places=6)
        per_label = {}
        for j, i in enumerate(idx):
            if rows[i]["source"] != "own":
                per_label[rows[i]["label"]] = per_label.get(rows[i]["label"], 0) + w[j].item()
        values = list(per_label.values())
        self.assertAlmostEqual(min(values), max(values), places=6)


class EvaluateTest(unittest.TestCase):
    def test_metrics_with_absent_class(self):
        r = cv.evaluate([0, 0, 1, 1, 2], [0, 1, 1, 1, 2])
        self.assertAlmostEqual(r["accuracy"], 0.8)
        self.assertAlmostEqual(r["macro_f1"], (2 / 3 + 0.8 + 1.0) / 3, places=6)
        self.assertAlmostEqual(r["recall"]["neutral"], 0.5)
        self.assertAlmostEqual(r["recall"]["happy"], 1.0)
        self.assertIsNone(r["recall"]["angry"])
        self.assertEqual(r["confusion"][0][1], 1)
        self.assertEqual(r["n"], 5)


class LrTest(unittest.TestCase):
    def test_warmup_then_cosine(self):
        self.assertTrue(0 < cv.lr_at(0, 1e-3, 2, 40) < 1e-4)
        self.assertAlmostEqual(cv.lr_at(2, 1e-3, 2, 40), 1e-3)
        self.assertAlmostEqual(cv.lr_at(40, 1e-3, 2, 40), 0.0)


class ReportTest(unittest.TestCase):
    def test_summary_and_files(self):
        fold = {"fold": 0, "test_people": ["p0", "p1"], "val_person": "p2", "best_epoch": 5, "history": [],
                "test": cv.evaluate([0, 1, 2], [0, 1, 1]),
                "per_person": {"p0": cv.evaluate([0, 1], [0, 1]), "p1": cv.evaluate([2], [1])},
                "public": cv.evaluate([0, 1, 2, 3, 4], [0, 1, 2, 3, 4])}
        result = {"name": "emonet", "config": {}, "folds": [fold, dict(fold, fold=1)]}
        result["summary"] = cv.summarize(result["folds"])
        self.assertAlmostEqual(result["summary"]["test_accuracy"]["mean"], 2 / 3)
        self.assertEqual(result["summary"]["confusion"][2][1], 2)
        with tempfile.TemporaryDirectory() as d:
            cv.write_report("emonet_cv", result, d)
            with open(os.path.join(d, "emonet_cv.json"), encoding="utf-8") as f:
                self.assertEqual(json.load(f)["name"], "emonet")
            with open(os.path.join(d, "emonet_cv.md"), encoding="utf-8") as f:
                md = f.read()
        self.assertIn("p0", md)
        self.assertIn("—", md)  # recall lớp vắng
        # ảnh công khai này dùng cả để dừng sớm -> không được gọi là "để riêng"
        self.assertNotIn("để riêng", md)
        self.assertIn("val công khai", md)


class EightPeopleTest(unittest.TestCase):
    def test_folds_follow_people_count(self):
        rows = [r for r in fake_rows() if r["person"] not in ("p8", "p9")]
        folds = cv.make_folds(rows)
        self.assertEqual(len(folds), 4)
        self.assertTrue(all(len(f["test_people"]) == 2 for f in folds))
        self.assertEqual(sorted(p for f in folds for p in f["test_people"]), PEOPLE[:8])


if __name__ == "__main__":
    unittest.main()
