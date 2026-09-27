"""
Service GPIO - điều khiển đèn LED RGB và 2 nút bấm trên Raspberry Pi
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc

Trình duyệt (chạy ngay trên Pi) gọi service này để:
    - đổi màu đèn theo trạng thái / cảm xúc
    - hỏi xem nút nào vừa được bấm

Sơ đồ nối (số trong ngoặc là số chân vật lý):
    LED R / G / B : GPIO17 (11) / GPIO27 (13) / GPIO22 (15), mỗi màu 1 điện trở 220-330Ω
    Chân chung LED: GND (9) nếu catot chung, 3.3V (1) nếu anot chung
    Nút 1 (Bắt đầu / Bài tiếp)    : GPIO5 (29) <-> GND (30)
    Nút 2 (Tạm dừng / Phát tiếp) : GPIO6 (31) <-> GND (34)

Cách cài đặt (trên Pi, dùng python3 của hệ thống - đã có sẵn gpiozero + lgpio):
    sudo apt install -y python3-flask python3-flask-cors

Cách chạy:
    python3 gpio_service.py                     # LED catot chung
    LED_COMMON_ANODE=1 python3 gpio_service.py  # LED anot chung

Server lắng nghe tại: http://localhost:5001
API:  POST /led      {"state": "off" | "scanning" | "happy" | "sad" | "angry" | "surprise" | "neutral"}
      GET  /buttons  -> {"next": <số lần bấm nút 1>, "pause": <số lần bấm nút 2>}

Thử trên máy không có GPIO (PC):
    GPIOZERO_PIN_FACTORY=mock GPIOZERO_MOCK_PIN_CLASS=mockpwmpin python gpio_service.py
"""

import os
import threading

from flask import Flask, request, jsonify
from flask_cors import CORS
from gpiozero import Button, RGBLED

# LED anot chung: chân chung nối 3.3V -> phải kéo chân màu xuống thấp mới sáng -> đảo tín hiệu
COMMON_ANODE = os.environ.get("LED_COMMON_ANODE") == "1"

led = RGBLED(red=17, green=27, blue=22, active_high=not COMMON_ANODE)
next_button = Button(5, bounce_time=0.05)   # pull-up trong: bấm = nối GND
pause_button = Button(6, bounce_time=0.05)

# (đỏ, xanh lá, xanh dương), mỗi màu từ 0 đến 1
COLORS = {
    "happy": (1, 1, 0),       # vàng
    "sad": (0, 0, 1),         # xanh dương
    "angry": (1, 0, 0),       # đỏ
    "surprise": (1, 0, 1),    # tím
    "neutral": (1, 1, 1),     # trắng
}

# chỉ đếm số lần bấm; trình duyệt tự so với lần hỏi trước để biết có lần bấm mới
counts = {"next": 0, "pause": 0}
counts_lock = threading.Lock()  # nút được xử lý ở luồng riêng của gpiozero


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
def set_led():
    state = (request.get_json(silent=True) or {}).get("state")

    if state == "off":
        led.off()
    elif state == "scanning":
        # trắng nhấp nháy = camera đang bật
        led.blink(on_time=0.5, off_time=0.5, on_color=(1, 1, 1))
    elif state in COLORS:
        led.color = COLORS[state]  # tự dừng nhấp nháy nếu đang nháy
    else:
        return jsonify({"error": f"state khong hop le: {state}"}), 400

    return jsonify({"state": state})


@app.route("/buttons", methods=["GET"])
def get_buttons():
    with counts_lock:
        return jsonify(dict(counts))


if __name__ == "__main__":
    print("GPIO service chay tai http://localhost:5001",
          "(LED anot chung)" if COMMON_ANODE else "(LED catot chung)")
    app.run(host="0.0.0.0", port=5001, debug=False)
