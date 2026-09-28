"""
Điều khiển màn hình OLED 0.96" (chip SSD1306, 128x64, giao tiếp I2C)

Không cần thư viện OLED riêng: tự gửi lệnh qua I2C, vẽ chữ bằng Pillow.

Sơ đồ nối (số trong ngoặc là số chân vật lý trên Pi):
    VCC -> 3.3V (1)
    SDA -> GPIO2 (3)
    SCL -> GPIO3 (5)
    GND -> GND (9)

Cài đặt (trên Pi, 1 lần):
    sudo raspi-config nonint do_i2c 0      # bật I2C
    sudo apt install -y i2c-tools python3-smbus2 python3-pil
    i2cdetect -y 1                          # phải thấy số 3c

Thử màn hình:
    python3 oled.py
"""

from PIL import Image, ImageDraw, ImageFont

try:
    from smbus2 import SMBus
except ImportError:
    from smbus import SMBus  # gói python3-smbus cũng có lớp SMBus giống vậy

WIDTH, HEIGHT = 128, 64
FONT_FILE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Chuỗi lệnh khởi động chuẩn của SSD1306 128x64
INIT_COMMANDS = [
    0xAE,        # tắt màn hình trong lúc cài đặt
    0xD5, 0x80,  # tần số xung nhịp
    0xA8, 0x3F,  # 64 dòng
    0xD3, 0x00,  # không dịch dọc
    0x40,        # bắt đầu từ dòng 0
    0x8D, 0x14,  # bật bộ tăng áp bên trong
    0x20, 0x00,  # ghi dữ liệu theo chiều ngang
    0xA1, 0xC8,  # lật ngang + dọc cho đúng chiều chữ
    0xDA, 0x12,  # cấu hình chân COM
    0x81, 0xCF,  # độ sáng
    0xD9, 0xF1,
    0xDB, 0x40,
    0xA4,        # hiện nội dung trong bộ nhớ
    0xA6,        # chữ sáng trên nền tối
    0xAF,        # bật màn hình
]


def load_font(size):
    try:
        return ImageFont.truetype(FONT_FILE, size)
    except OSError:
        return ImageFont.load_default()


class Oled:
    def __init__(self, bus=1, address=0x3C):
        self.bus = SMBus(bus)
        self.address = address
        self.small_font = load_font(12)
        self.big_fonts = [load_font(size) for size in (24, 20, 16, 13)]  # to -> nhỏ
        self._command(*INIT_COMMANDS)
        self.clear()

    def _command(self, *commands):
        for c in commands:
            self.bus.write_byte_data(self.address, 0x00, c)  # 0x00 = byte sau là lệnh

    def _draw(self, image):
        self._command(0x21, 0, WIDTH - 1)       # ghi từ cột 0 đến 127
        self._command(0x22, 0, HEIGHT // 8 - 1)  # ghi từ trang 0 đến 7

        # Mỗi byte = 1 cột dọc 8 điểm ảnh của 1 "trang" (8 dòng)
        pixels = image.load()
        data = []
        for page in range(HEIGHT // 8):
            for x in range(WIDTH):
                byte = 0
                for bit in range(8):
                    if pixels[x, page * 8 + bit]:
                        byte |= 1 << bit
                data.append(byte)

        # I2C chỉ gửi được tối đa 32 byte mỗi lần -> chia nhỏ
        for i in range(0, len(data), 16):
            self.bus.write_i2c_block_data(self.address, 0x40, data[i:i + 16])  # 0x40 = dữ liệu

    def clear(self):
        self._draw(Image.new("1", (WIDTH, HEIGHT)))

    def show(self, title, big_text):
        """Dòng nhỏ ở trên + chữ to ở giữa (tự căn giữa, chữ dài thì tự thu nhỏ)."""
        image = Image.new("1", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(image)
        draw.text((0, 0), title, font=self.small_font, fill=1)

        # chọn cỡ chữ to nhất mà vẫn vừa chiều ngang màn hình
        for font in self.big_fonts:
            left, top, right, bottom = draw.textbbox((0, 0), big_text, font=font)
            if right - left <= WIDTH:
                break
        x = (WIDTH - (right - left)) // 2 - left
        y = 16 + (HEIGHT - 16 - (bottom - top)) // 2 - top
        draw.text((x, y), big_text, font=font, fill=1)

        self._draw(image)


if __name__ == "__main__":
    from time import sleep

    oled = Oled()
    for title, text in [("EmoTune", "XIN CHAO"), ("Camera", "Dang quet..."),
                        ("Cam xuc", "VUI"), ("Cam xuc", "NGAC NHIEN")]:
        print("Man hinh phai hien:", title, "/", text)
        oled.show(title, text)
        sleep(2)
    oled.clear()
    print("Xong - man hinh da xoa")
