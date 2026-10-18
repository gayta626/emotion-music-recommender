import os
import tempfile
import unittest

import review_labels as rl
from prepare_data import read_label_fixes


def oof(name, label, pred, prob):
    return {"orig": f"data/{label}/{name}", "label": label, "pred": pred, "prob_pred": str(prob), "person": "x"}


class ReviewTest(unittest.TestCase):
    def test_suspicious_filters_and_sorts(self):
        rows = [oof("a.jpg", "angry", "neutral", 0.91), oof("b.jpg", "angry", "angry", 0.99),
                oof("c.jpg", "sad", "neutral", 0.79), oof("d.jpg", "happy", "surprise", 0.95)]
        got = [os.path.basename(r["orig"]) for r in rl.suspicious(rows, 0.8)]
        self.assertEqual(got, ["d.jpg", "a.jpg"])
        self.assertEqual(len(rl.suspicious(rows, 0.5)), 3)

    def test_decide_keys(self):
        self.assertEqual(rl.decide(ord("k")), ("keep", ""))
        self.assertEqual(rl.decide(ord("d")), ("drop", ""))
        self.assertEqual(rl.decide(ord("4")), ("relabel", "angry"))
        self.assertEqual(rl.decide(ord("1")), ("relabel", "neutral"))
        self.assertIsNone(rl.decide(ord("x")))

    def test_resume_skips_decided(self):
        rows = [oof("vy_suprise_1787055768537 (1).jpg", "surprise", "happy", 0.9), oof("e.jpg", "sad", "angry", 0.9)]
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "fixes.csv")
            rl.append_fix(path, "vy_suprise_1787055768537 (1).jpg", "relabel", "happy")
            fixes = read_label_fixes(path)
            self.assertEqual(fixes["vy_suprise_1787055768537 (1).jpg"], ("relabel", "happy"))
            left = [os.path.basename(r["orig"]) for r in rl.pending(rows, fixes)]
            rl.append_fix(path, "e.jpg", "keep", "")
            self.assertEqual(len(read_label_fixes(path)), 2)
        self.assertEqual(left, ["e.jpg"])

    def test_pending_skips_excluded_people(self):
        rows = [oof("dat_angry_1.jpg", "angry", "neutral", 0.9), oof("phat_happy_2.jpg", "happy", "neutral", 0.9),
                oof("nhat_sad_3.jpg", "sad", "neutral", 0.9)]
        left = [os.path.basename(r["orig"]) for r in rl.pending(rows, {})]
        self.assertEqual(left, ["nhat_sad_3.jpg"])


if __name__ == "__main__":
    unittest.main()
