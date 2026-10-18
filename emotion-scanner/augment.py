"""
Augmentation chạy trên GPU cho cả batch (thay cho torchvision.transforms từng ảnh).

Vì sao: toàn bộ ~80k ảnh 96x96 nằm sẵn trên GPU; biến đổi cả batch một lần nhanh hơn
nhiều so với DataLoader nhiều tiến trình (rất chậm trên Windows).

Mỗi ảnh nhận ngẫu nhiên (khác nhau giữa các ảnh):
  1. Phóng 0.9-1.15, dịch ±8%, xoay ±15°, lật ngang 50%   (1 phép affine)
  2. Độ sáng ±0.3, tương phản x0.7-1.3
  3. 30% ảnh: thu nhỏ còn 24-48px rồi phóng lại          (giả webcam mờ, ảnh FER+ 48px)
  4. 50% ảnh: che 1 hình chữ nhật 10-30% diện tích       (giả tay/tóc che mặt)
"""

import math

import torch
import torch.nn.functional as F


def augment_batch(x, generator=None):
    n, _, h, w = x.shape
    dev = x.device

    def rand(*shape):
        return torch.rand(*shape, device=dev, generator=generator)

    # 1. Affine: affine_grid ánh xạ toạ độ ảnh ra -> toạ độ ảnh vào (đơn vị [-1, 1])
    scale = 0.9 + 0.25 * rand(n)
    angle = (rand(n) * 2 - 1) * math.radians(15)
    tx = (rand(n) * 2 - 1) * 0.16  # 8% chiều rộng = 0.16 trên thang [-1, 1]
    ty = (rand(n) * 2 - 1) * 0.16
    flip = torch.where(rand(n) < 0.5, -1.0, 1.0)
    cos, sin = torch.cos(angle) / scale, torch.sin(angle) / scale
    theta = torch.zeros(n, 2, 3, device=dev)
    theta[:, 0, 0] = cos * flip
    theta[:, 0, 1] = -sin
    theta[:, 0, 2] = tx
    theta[:, 1, 0] = sin * flip
    theta[:, 1, 1] = cos
    theta[:, 1, 2] = ty
    grid = F.affine_grid(theta, list(x.shape), align_corners=False)
    out = F.grid_sample(x, grid, mode="bilinear", padding_mode="border", align_corners=False)

    # 2. Sáng / tương phản
    mean = out.mean(dim=(1, 2, 3), keepdim=True)
    contrast = 0.7 + 0.6 * rand(n, 1, 1, 1)
    bright = (rand(n, 1, 1, 1) * 2 - 1) * 0.3
    out = (out - mean) * contrast + mean + bright

    # 3. Ảnh độ phân giải thấp (1 cỡ chung cho cả batch, ảnh được chọn khác nhau)
    low = rand(n) < 0.3
    if low.any():
        size = int(24 + rand(1).item() * 24)
        small = F.interpolate(out[low], size=(size, size), mode="area")
        out[low] = F.interpolate(small, size=(h, w), mode="bilinear", align_corners=False)

    # 4. Che 1 hình chữ nhật, tô bằng 1 mức xám ngẫu nhiên
    area = 0.1 + 0.2 * rand(n)
    aspect = 0.5 + 1.5 * rand(n)
    eh = (torch.sqrt(area * aspect) * h).clamp(max=h)
    ew = (torch.sqrt(area / aspect) * w).clamp(max=w)
    y0 = rand(n) * (h - eh)
    x0 = rand(n) * (w - ew)
    ys = torch.arange(h, device=dev).view(1, h, 1)
    xs = torch.arange(w, device=dev).view(1, 1, w)
    mask = ((ys >= y0.view(n, 1, 1)) & (ys < (y0 + eh).view(n, 1, 1))
            & (xs >= x0.view(n, 1, 1)) & (xs < (x0 + ew).view(n, 1, 1))
            & (rand(n) < 0.5).view(n, 1, 1))
    out = torch.where(mask.unsqueeze(1), rand(n).view(n, 1, 1, 1), out)

    return out.clamp(0, 1)
