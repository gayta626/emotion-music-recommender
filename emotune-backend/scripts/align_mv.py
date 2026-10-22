"""Do do lech giua MV YouTube va file mp3 cua cung 1 bai (mv_offset, giay).

Vi sao can: MV thuong co canh phim mo dau / ket thuc -> dai hon mp3 (vd mp3 3:46, MV 4:49). Quy doi theo ti le do dai
(ban cu) lam nhac nhay sai doan: nghe mp3 toi 1:00 bam xem MV -> MV 1:16 van con o dau bai.
Do mot lan cho moi bai: MV giay (t + offset) = mp3 giay t. offset > 0: MV co doan mo dau; < 0: MV cat bot dau bai.

Cach do: tai rieng phan TIENG cua MV (yt-dlp, 1 lan, xoa ngay sau khi do) -> ca 2 file giai ma ve mono 11 kHz (ffmpeg)
-> chroma (12 not nhac theo thoi gian) -> truot chroma cua mp3 doc theo MV, cho nao
trung nhau nhieu nhat la do lech (tuong quan cheo bang FFT). Diem tin cay = dinh cao hon muc thuong bao nhieu lan do lech.

Chay qua `npm run align-mv` (scripts/align-mv.js doc / ghi DB, goi file nay cho tung bai bang venv .venv-karaoke).
Dung rieng: python align_mv.py <file mp3> <youtube id>  -> in 1 dong JSON {"offset": .., "score": .., "mv_duration": ..}
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

SR = 11025          # du cho cao do giai dieu / hop am (< 2 kHz), tinh nhanh
N_FFT = 4096        # cua so ~0.37s: du phan giai de tach tung not
HOP = 551           # ~0.05s moi diem -> do lech chinh xac ~0.05s
FMIN, FMAX = 80.0, 2000.0
MAX_LEAD_CUT = 30.0  # MV cat bot dau bai toi da 30s
MAX_EXTRA = 120.0    # MV co doan mo dau dai hon phan du do dai toi da 2 phut


def chroma(x):
    """chroma: moi khung 0.05s -> 12 so = muc nang luong cua 12 not (do, do#, ... si) bat ke quang tam.
    Giai dieu + hop am cua bai giong nhau o ban mp3 va ban MV (du MV tron tieng khac, them tieng dong, to nho khac)
    -> so khop chac hon "duong nhip" (thu 22/10: bai Buong doi tay nhau ra, nhip cho diem 4.9 va lech lung tung theo
    tung doan; chroma cho +14.3s o moi doan, diem 25)"""
    if len(x) < N_FFT:
        return np.zeros((1, 12))
    frames = 1 + (len(x) - N_FFT) // HOP
    idx = np.arange(N_FFT)[None, :] + HOP * np.arange(frames)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * np.hanning(N_FFT), axis=1))
    freq = np.fft.rfftfreq(N_FFT, 1 / SR)
    band = (freq > FMIN) & (freq < FMAX)
    pitch_class = (np.round(12 * np.log2(freq[band] / 440)) % 12).astype(int)
    out = np.zeros((frames, 12))
    for k in range(12):
        out[:, k] = mag[:, band][:, pitch_class == k].sum(axis=1)
    out /= np.linalg.norm(out, axis=1, keepdims=True) + 1e-9
    return out - out.mean(axis=0)


def find_offset(song, mv):
    """song, mv: mang mau mono SR Hz. Tra ve (offset giay, diem tin cay). Diem < ~8 coi nhu khong tim duoc"""
    a, b = chroma(song), chroma(mv)
    n = len(a) + len(b)
    size = 1 << (n - 1).bit_length()
    # corr[k] = sum_t sum_not b[t + k] * a[t]  (k = so khung MV di truoc mp3), cong 12 not
    corr = np.fft.irfft((np.fft.rfft(b, size, axis=0) * np.conj(np.fft.rfft(a, size, axis=0))).sum(axis=1), size)
    lags = np.concatenate([np.arange(0, len(b)), np.arange(-len(a) + 1, 0)])
    vals = np.concatenate([corr[:len(b)], corr[size - len(a) + 1:]])
    # chia cho so khung chong nhau (do lech lon -> it khung chung -> khong duoc loi the)
    overlap = np.minimum(len(a), len(b) - lags) - np.maximum(0, -lags)
    sec = lags * HOP / SR
    extra = max(0.0, (len(mv) - len(song)) / SR)
    ok = (overlap > 0.4 * min(len(a), len(b))) & (sec >= -MAX_LEAD_CUT) & (sec <= extra + MAX_EXTRA)
    if not ok.any():
        return 0.0, 0.0
    norm = np.where(ok, vals / np.maximum(overlap, 1), -np.inf)
    best = int(np.argmax(norm))
    pool = norm[ok]
    spread = np.median(np.abs(pool - np.median(pool))) * 1.4826 + 1e-9
    score = (norm[best] - np.median(pool)) / spread
    return round(float(sec[best]), 2), round(float(score), 1)


def decode(path):
    """file am thanh bat ky -> mono float32 SR Hz (ffmpeg)"""
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True)
    return np.frombuffer(out.stdout, dtype=np.float32)


def download_audio(youtube_id, folder):
    """chi tai phan tieng cua MV vao thu muc tam (khong luu lai)"""
    from yt_dlp import YoutubeDL
    opts = {"format": "bestaudio/best", "outtmpl": str(Path(folder) / "mv.%(ext)s"), "quiet": True, "no_warnings": True,
            "noprogress": True}
    with YoutubeDL(opts) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={youtube_id}"])
    return next(Path(folder).glob("mv.*"))


def main():
    mp3, youtube_id = sys.argv[1], sys.argv[2]
    with tempfile.TemporaryDirectory() as tmp:
        mv = decode(download_audio(youtube_id, tmp))
    offset, score = find_offset(decode(mp3), mv)
    print(json.dumps({"offset": offset, "score": score, "mv_duration": round(len(mv) / SR, 1)}))


if __name__ == "__main__":
    main()
