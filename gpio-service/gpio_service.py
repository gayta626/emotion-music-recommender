"""
Service GPIO - màn hình OLED + 2 nút bấm trên Raspberry Pi
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc

Trình duyệt (chạy ngay trên Pi) gọi service này để:
    - hiện trạng thái / cảm xúc lên màn hình OLED
    - hỏi xem nút nào vừa được bấm

Sơ đồ nối (số trong ngoặc là số chân vật lý):
    OLED VCC / SDA / SCL / GND   : 3.3V (1) / GPIO2 (3) / GPIO3 (5) / GND (9)
    Nút 1 (Bắt đầu / Bài tiếp)    : GPIO17 (11) <-> GND (6)
    Nút 2 (Tạm dừng / Phát tiếp) : GPIO27 (13) <-> GND (6)   (2 nút dùng chung 1 dây GND)

Cách cài đặt (trên Pi, dùng python3 của hệ thống - đã có sẵn gpiozero + lgpio):
    sudo apt install -y python3-flask python3-flask-cors
    + phần cài OLED ghi ở đầu file oled.py

Cách chạy:
    python3 gpio_service.py

Server lắng nghe tại: http://localhost:5001
API:  POST /led      {"state": "off" | "scanning" | "happy" | "sad" | "angry" | "surprise" | "neutral"}
      (tên /led giữ nguyên từ bản dùng đèn LED để trang web không phải sửa)
      GET  /buttons  -> {"next": <số lần bấm nút 1>, "pause": <số lần bấm nút 2>}

Thử trên máy không có GPIO (PC) - không có OLED thì service vẫn chạy, chỉ bỏ qua màn hình:
    GPIOZERO_PIN_FACTORY=mock python gpio_service.py
"""

import threading

from flask import Flask, request, jsonify
from flask_cors import CORS
from gpiozero import Button

next_button = Button(17, bounce_time=0.05)   # pull-up trong: bấm = nối GND
pause_button = Button(27, bounce_time=0.05)

# Màn hình lỗi / chưa cắm thì service vẫn chạy (nút bấm vẫn dùng được)
try:
    from oled import Oled
    oled = Oled()
except Exception as e:
    print("Khong mo duoc OLED, bo qua man hinh:", e)
    oled = None

# state -> (dòng nhỏ ở trên, chữ to ở giữa); OLED khó hiện tiếng Việt có dấu nên viết không dấu
SCREENS = {
    "off": ("EmoTune", "San sang"),
    "scanning": ("Camera", "Dang quet..."),
    "happy": ("Cam xuc", "VUI"),
    "sad": ("Cam xuc", "BUON"),
    "angry": ("Cam xuc", "GIAN"),
    "surprise": ("Cam xuc", "NGAC NHIEN"),
    "neutral": ("Cam xuc", "BINH THUONG"),
}

# chỉ đếm số lần bấm; trình duyệt tự so với lần hỏi trước để biết có lần bấm mới
counts = {"next": 0, "pause": 0}
counts_lock = threading.Lock()  # nút được xử lý ở luồng riêng của gpiozero
oled_lock = threading.Lock()    # Flask có thể xử lý 2 request cùng lúc


def make_counter(name):
    def on_press():
        with counts_lock:
            counts[name] += 1
        print(f"Nut {name} duoc bam ({counts[name]})")
    return on_press


next_button.when_pressed = make_counter("next")
pause_button.when_pressed = make_counter("pause")

app = Flask(__name__)
CORS(app)  # trang web chạy ở cổng 5173 gọi sang cổng 5001


@app.route("/led", methods=["POST"])
def set_screen():
    state = (request.get_json(silent=True) or {}).get("state")
    if state not in SCREENS:
        return jsonify({"error": f"state khong hop le: {state}"}), 400

    if oled:
        try:
            with oled_lock:
                oled.show(*SCREENS[state])
        except OSError as e:  # dây lỏng -> lỗi I2C, không làm hỏng web
            print("Loi ghi OLED:", e)

    return jsonify({"state": state})


@app.route("/buttons", methods=["GET"])
def get_buttons():
    with counts_lock:
        return jsonify(dict(counts))


if __name__ == "__main__":
    if oled:
        oled.show(*SCREENS["off"])
    print("GPIO service chay tai http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)
