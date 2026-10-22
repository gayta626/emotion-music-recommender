"""Unit test cho scripts/align_mv.py (tim do lech giua MV va mp3). Khong can mang / YouTube.
Chay: .venv-karaoke\\Scripts\\python -m unittest scripts/test_align_mv.py   (trong emotune-backend/)
"""
import unittest

import numpy as np

from align_mv import SR, find_offset

rng = np.random.default_rng(0)


def song(seconds):
    """'bai hat' gia: chuoi not ngan ngau nhien (tieng + im lang) -> co nhieu diem bat dau not de so khop"""
    out = np.zeros(int(seconds * SR), dtype=np.float32)
    t = 0.0
    while t < seconds - 0.5:
        n = int(rng.uniform(0.08, 0.4) * SR)
        start = int(t * SR)
        freq = rng.uniform(150, 900)
        out[start:start + n] += 0.5 * np.sin(2 * np.pi * freq * np.arange(n) / SR) * np.hanning(n)
        t += rng.uniform(0.15, 0.6)
    return out


def noise(seconds, level=0.05):
    return (level * rng.standard_normal(int(seconds * SR))).astype(np.float32)


class FindOffsetTest(unittest.TestCase):
    def test_mv_co_doan_mo_dau(self):
        audio = song(60)
        mv = np.concatenate([noise(37.5), audio + noise(60, 0.02), noise(8)])
        offset, score = find_offset(audio, mv)
        self.assertAlmostEqual(offset, 37.5, delta=0.1)
        self.assertGreater(score, 8)

    def test_mv_bat_dau_ngay_va_co_doan_ket(self):
        audio = song(50)
        mv = np.concatenate([audio, noise(30)])
        offset, _ = find_offset(audio, mv)
        self.assertAlmostEqual(offset, 0.0, delta=0.1)

    def test_mv_cat_mat_vai_giay_dau_bai(self):
        audio = song(50)
        mv = audio[int(3 * SR):]
        offset, _ = find_offset(audio, mv)
        self.assertAlmostEqual(offset, -3.0, delta=0.1)

    def test_khong_lien_quan_thi_diem_thap(self):
        _, score = find_offset(song(40), song(70))
        self.assertLess(score, 8)


if __name__ == "__main__":
    unittest.main()
