"""Tach giong ca si bang AI (Demucs) cho che do karaoke.

Moi bai trong music/ -> karaoke/<ten mp3>.beat.mp3 (nhac dem, khong co giong ca si)
                     -> karaoke/<ten mp3>.json     (cao do giong ca si theo thoi gian, de cham diem hat)

Vi sao dung Demucs thay cho cach "tru 2 kenh" (L - R) tren trinh duyet:
- L - R chi xoa duoc giong nam CHINH GIUA. Doan dien thuong co be / giong tach rong 2 ben / tieng vang
  -> giong van con to, doan verse thi mat sach -> nghe luc co luc khong.
- Demucs (Meta, model "htdemucs") la mang no-ron tach nguon am thanh: hoc tu hang tram bai da tach san,
  nhan ra giong nguoi theo am sac chu khong theo vi tri -> giong mat deu ca bai.
- Co ban giong rieng -> do duoc cao do ca si hat tung luc (YIN) -> cham "dung tong" theo giai dieu that.

Chay qua `npm run make-karaoke` (scripts/make-karaoke.js goi venv rieng .venv-karaoke).
Chi lam bai chua co file (--force de lam lai). Can ffmpeg trong PATH.
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

# torch + demucs nap cham (~5s) -> chi import khi co bai can tach (chay nen sau moi lan admin them / sua bai)

ROOT = Path(__file__).resolve().parent.parent
MUSIC_DIR = ROOT / "music"
OUT_DIR = ROOT / "karaoke"

SAMPLE_RATE = 44100      # htdemucs lam viec o 44.1kHz stereo
BEAT_BITRATE = "192k"

# do cao do giong ca si
HOP_S = 0.05             # 20 diem / giay (trinh duyet cham diem cung nhip nay)
PITCH_SR = 22050         # ha xuong 22kHz: du cho giong nguoi (< 1.1kHz), tinh nhanh gap doi
WIN = 1024               # cua so ~46ms
FMIN, FMAX = 70.0, 1000.0
YIN_THRESHOLD = 0.15     # nguong "co chu ky" cua YIN (thap = chac la co cao do)
VOICED_DB = -30.0        # giong yeu hon doan to nhat cua bai 30dB -> coi la im (con sot tieng nhac)


def decode(path):
    """mp3 -> mang float32 (2, N) o 44.1kHz (bai mono duoc nhan doi kenh)."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SAMPLE_RATE), "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.copy()


def encode_mp3(audio, path):
    """(2, N) float32 -> mp3."""
    data = np.clip(audio, -1.0, 1.0).T.astype(np.float32).tobytes()
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SAMPLE_RATE), "-i", "-",
         "-codec:a", "libmp3lame", "-b:a", BEAT_BITRATE, str(path)],
        input=data, check=True,
    )


def separate(model, audio, device):
    """Tra ve (beat, vocals), moi cai (2, N). beat = trong + bass + nhac cu khac (bo vocals)."""
    import torch
    from demucs.apply import apply_model

    wav = torch.from_numpy(audio)
    # chuan hoa nhu demucs/separate.py: mo hinh duoc train voi tin hieu trung binh 0, do lech 1
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std() + 1e-8
    wav = (wav - mean) / std
    with torch.no_grad():
        sources = apply_model(model, wav[None], device=device, shifts=1, split=True, overlap=0.25, progress=False)[0]
    sources = sources * std + mean
    vocal_idx = model.sources.index("vocals")
    vocals = sources[vocal_idx]
    beat = sources.sum(0) - vocals
    return beat.cpu().numpy(), vocals.cpu().numpy()


def frames_of(x, length, hop):
    """Cat tin hieu 1 chieu thanh cac khung (F, length) chong nhau, buoc `hop` (khong chep du lieu)."""
    count = max(0, 1 + (len(x) - length) // hop)
    return np.lib.stride_tricks.as_strided(x, shape=(count, length), strides=(x.strides[0] * hop, x.strides[0]))


def vocal_pitch(vocals):
    """Cao do giong ca si moi HOP_S giay bang YIN (de Cheveigne & Kawahara 2002).

    Tra ve list so nguyen = MIDI x 10 (vd 69.0 -> 690 = not La 440Hz); 0 = luc do ca si khong hat.
    """
    mono = vocals.mean(0)
    # 44.1k -> 22.05k: trung binh 2 mau lien tiep (loc thong thap tho, du cho giong nguoi)
    x = mono[: len(mono) // 2 * 2].reshape(-1, 2).mean(1).astype(np.float64)
    hop = int(PITCH_SR * HOP_S)
    tau_max = int(PITCH_SR / FMIN)
    tau_min = int(PITCH_SR / FMAX)
    # dem dau de khung thu i bat dau dung luc i * HOP_S
    x = np.concatenate([x, np.zeros(WIN + tau_max)])
    seg = frames_of(x, WIN + tau_max, hop)
    a = seg[:, :WIN]

    # ham hieu d(tau) = sum (x_j - x_{j+tau})^2 = nang luong a + nang luong doan dich - 2 * tu tuong quan (tinh bang FFT)
    n_fft = 1 << int(np.ceil(np.log2(WIN + tau_max + WIN)))
    corr = np.fft.irfft(np.conj(np.fft.rfft(a, n_fft)) * np.fft.rfft(seg, n_fft), n_fft)[:, : tau_max + 1]
    sq = np.concatenate([np.zeros((len(seg), 1)), np.cumsum(seg ** 2, axis=1)], axis=1)
    taus = np.arange(tau_max + 1)
    energy_shift = sq[:, taus + WIN] - sq[:, taus]
    energy_a = sq[:, WIN][:, None]
    d = np.maximum(energy_a + energy_shift - 2 * corr, 0)

    # chuan hoa tich luy (CMND): d'(tau) = d(tau) * tau / tong d(1..tau) -> khong bi "bat nham" tau = 0
    cum = np.cumsum(d[:, 1:], axis=1)
    cmnd = np.ones_like(d)
    cmnd[:, 1:] = d[:, 1:] * taus[1:] / np.maximum(cum, 1e-12)

    rows = np.arange(len(seg))
    search = cmnd[:, tau_min:]
    below = search < YIN_THRESHOLD
    # tau dau tien duoi nguong, roi truot toi day thung lung; khong co -> lay cuc tieu toan cuc
    tau = np.where(below.any(1), below.argmax(1), search.argmin(1)) + tau_min
    for _ in range(40):
        step = (tau + 1 <= tau_max) & (cmnd[rows, np.minimum(tau + 1, tau_max)] < cmnd[rows, tau])
        if not step.any():
            break
        tau = tau + step
    best = cmnd[rows, tau]
    # noi suy parabol quanh tau -> cao do min hon 1 mau (not cao: 1 mau ~ 1 nua cung)
    left = cmnd[rows, np.maximum(tau - 1, 1)]
    right = cmnd[rows, np.minimum(tau + 1, tau_max)]
    denom = left - 2 * best + right
    shift = np.where(np.abs(denom) > 1e-12, 0.5 * (left - right) / denom, 0.0)
    period = tau + np.clip(shift, -1, 1)
    hz = PITCH_SR / np.maximum(period, 1e-6)

    # luc nao co hat: du to (so voi doan to nhat cua bai) + ro cao do
    rms = np.sqrt(np.mean(a ** 2, axis=1))
    loud = np.percentile(rms, 95) if len(rms) else 0.0
    voiced = (rms > loud * 10 ** (VOICED_DB / 20)) & (best < 0.25) & (hz >= FMIN) & (hz <= FMAX)
    # bo diem le loi 1 khung (thuong la tieng sot cua nhac cu)
    lone = voiced & ~np.roll(voiced, 1) & ~np.roll(voiced, -1)
    voiced &= ~lone

    midi = 69 + 12 * np.log2(np.maximum(hz, 1e-6) / 440.0)
    return [int(round(m * 10)) if v else 0 for m, v in zip(midi, voiced)]


def main():
    parser = argparse.ArgumentParser(description="Tach giong ca si (Demucs) cho che do karaoke")
    parser.add_argument("--only", help="chi lam 1 file mp3 (ten file trong music/)")
    parser.add_argument("--force", action="store_true", help="lam lai ca bai da co file")
    parser.add_argument("--cpu", action="store_true", help="khong dung GPU")
    args = parser.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("Thieu ffmpeg trong PATH (winget install Gyan.FFmpeg)")

    files = sorted(MUSIC_DIR.glob("*.mp3"))
    if args.only:
        files = [f for f in files if f.name == args.only]
        if not files:
            sys.exit(f"Khong thay music/{args.only}")
    OUT_DIR.mkdir(exist_ok=True)
    todo = [f for f in files if args.force or not (OUT_DIR / f"{f.stem}.beat.mp3").exists() or not (OUT_DIR / f"{f.stem}.json").exists()]
    print(f"{len(files)} bai, can tach {len(todo)} bai")
    if not todo:
        return

    import torch
    from demucs.pretrained import get_model

    device = "cuda" if torch.cuda.is_available() and not args.cpu else "cpu"
    print(f"Nap model htdemucs ({device})...")
    model = get_model("htdemucs")
    model.to(device).eval()

    done = failed = 0
    for i, path in enumerate(todo, 1):
        started = time.time()
        try:
            audio = decode(path)
            beat, vocals = separate(model, audio, device)
            pitch = vocal_pitch(vocals)
            encode_mp3(beat, OUT_DIR / f"{path.stem}.beat.mp3")
            info = {
                "v": 1,
                "model": "htdemucs",
                "hop": HOP_S,
                "duration": round(audio.shape[1] / SAMPLE_RATE, 2),
                "pitch": pitch,
            }
            (OUT_DIR / f"{path.stem}.json").write_text(json.dumps(info, separators=(",", ":")), encoding="utf-8")
            sung = sum(1 for p in pitch if p) / max(1, len(pitch))
            done += 1
            print(f"[{i}/{len(todo)}] {path.name}: xong {time.time() - started:.1f}s, ca si hat {sung:.0%} thoi gian")
        except Exception as err:  # 1 bai loi (file hong...) -> bo qua, lam bai khac
            failed += 1
            print(f"[{i}/{len(todo)}] {path.name}: LOI {err}")
    print(f"Xong {done} bai, loi {failed} bai -> {OUT_DIR}")


if __name__ == "__main__":
    main()
