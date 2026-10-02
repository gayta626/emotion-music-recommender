"""
Service GPIO - màn hình OLED + 2 nút chạm + cảm biến chuyển động trên Raspberry Pi
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc

Trình duyệt (chạy ngay trên Pi) gọi service này để:
    - hiện trạng thái / cảm xúc lên màn hình OLED
    - hỏi xem nút nào vừa được bấm, và có người đứng trước hộp không

Sơ đồ nối (số trong ngoặc là số chân vật lý):
    OLED VCC / SDA / SCL / GND   : 3.3V (1) / GPIO2 (3) / GPIO3 (5) / GND (9)
    Nút chạm TTP223 (chạm = SIG lên mức cao), mỗi module 3 dây VCC / GND / SIG:
    Nút 1 (Bắt đầu / Bài tiếp)    : 3.3V (17)              / GND (25) / GPIO17 (11)
    Nút 2 (Tạm dừng / Phát tiếp) : GPIO22 (15) bật sẵn cao / GND (39) / GPIO27 (13)
    (chân 3.3V còn lại đã dành cho OLED nên nút 2 lấy điện từ GPIO22 - module chỉ tốn vài mA)
    Cảm biến PIR HC-SR501 VCC / GND / OUT : 5V (2) / GND (6) / GPIO23 (16)
    (PIR cần nguồn 5V nhưng chân OUT chỉ ra 3.3V -> an toàn cho Pi.
     Trên PIR: vặn núm thời gian giữ về nhỏ nhất, jumper ở vị trí H - việc đếm 30s do code làm)

Cách cài đặt (trên Pi, dùng python3 của hệ thống - đã có sẵn gpiozero + lgpio):
    sudo apt install -y python3-flask python3-flask-cors
    + phần cài OLED ghi ở đầu file oled.py

Cách chạy:
    python3 gpio_service.py

Server lắng nghe tại: http://localhost:5001
API:  POST /led      {"state": "off" | "scanning" | "happy" | "sad" | "angry" | "surprise" | "neutral"}
      (tên /led giữ nguyên từ bản dùng đèn LED để trang web không phải sửa)
      GET  /buttons  -> {"next": <số lần bấm nút 1>, "pause": <số lần bấm nút 2>,
                         "present": <true nếu có người trong 30s gần nhất>}

Thử trên máy không có GPIO (PC) - không có OLED thì service vẫn chạy, chỉ bỏ qua màn hình:
    GPIOZERO_PIN_FACTORY=mock python gpio_service.py
"""

import threading
import time

from flask import Flask, request, jsonify
from flask_cors import CORS
from gpiozero import Button, DigitalInputDevice, DigitalOutputDevice

PRESENCE_TIMEOUT = 30   # không thấy ai quá số giây này -> coi như đã đi khỏi

touch2_power = DigitalOutputDevice(22, initial_value=True)   # cấp 3.3V cho TTP223 thứ 2
# TTP223 tự đẩy SIG lên cao khi chạm -> không dùng điện trở kéo trong của Pi
next_button = Button(17, pull_up=None, active_state=True, bounce_time=0.05)
pause_button = Button(27, pull_up=None, active_state=True, bounce_time=0.05)
# PIR báo mức cao khi thấy chuyển động (trong lúc người còn cử động thì giữ cao)
# Không dùng bounce_time: PIR báo thành nhiều nhịp rất ngắn (< 0.1s), chống rung sẽ lọc mất hết.
# Báo 1 nhịp hay 10 nhịp liền nhau đều chỉ làm mới mốc "lần cuối thấy người" -> không cần lọc.
motion = DigitalInputDevice(23, pull_up=False)

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
GREETING = ("Xin chao!", "Cham de quet")   # đang chờ + có người lại gần
PAUSED = ("Khong thay ai", "Tam dung")      # đang phát nhạc + người đã đi khỏi

# chỉ đếm số lần bấm; trình duyệt tự so với lần hỏi trước để biết có lần bấm mới
counts = {"next": 0, "pause": 0}
counts_lock = threading.Lock()  # nút được xử lý ở luồng riêng của gpiozero
oled_lock = threading.Lock()    # Flask + luồng theo dõi PIR có thể cùng vẽ

web_state = "off"      # trạng thái trang web gửi sang qua /led
last_motion = None     # lúc cuối cùng PIR báo có người (None = chưa thấy ai từ lúc bật)
drawn = None           # màn hình đang hiện, để khỏi vẽ lại khi không đổi


def make_counter(name):
    def on_press():
        with counts_lock:
            counts[name] += 1
        print(f"Nut {name} duoc bam ({counts[name]})")
    return on_press


next_button.when_pressed = make_counter("next")
pause_button.when_pressed = make_counter("pause")


def on_motion():
    # ghi lại ngay lúc PIR báo -> không bỏ lỡ lần báo ngắn nằm giữa 2 lần kiểm tra
    global last_motion
    last_motion = time.monotonic()


motion.when_activated = on_motion


def is_present():
    global last_motion
    now = time.monotonic()
    if motion.is_active:
        last_motion = now
    # chưa báo lần nào từ lúc bật -> có thể PIR chưa cắm: coi như có người để nhạc không tự dừng
    return last_motion is None or now - last_motion < PRESENCE_TIMEOUT


def refresh_screen():
    """Chọn màn hình theo trạng thái web + có người hay không, chỉ vẽ khi thay đổi."""
    global drawn
    present = is_present()
    if web_state == "off" and present and last_motion is not None:
        screen = GREETING
    elif web_state in ("off", "scanning") or present:
        screen = SCREENS[web_state]
    else:
        screen = PAUSED

    with oled_lock:
        if screen == drawn or not oled:
            return
        try:
            oled.show(*screen)
            drawn = screen
        except OSError as e:  # dây lỏng -> lỗi I2C, không làm hỏng web
            print("Loi ghi OLED:", e)


def watch_presence():
    # người đi khỏi thì không có sự kiện nào báo -> cứ nửa giây kiểm tra lại một lần
    while True:
        refresh_screen()
        time.sleep(0.5)


app = Flask(__name__)
CORS(app)  # trang web chạy ở cổng 5173 gọi sang cổng 5001


@app.route("/led", methods=["POST"])
def set_screen():
    global web_state
    state = (request.get_json(silent=True) or {}).get("state")
    if state not in SCREENS:
        return jsonify({"error": f"state khong hop le: {state}"}), 400

    web_state = state
    refresh_screen()
    return jsonify({"state": state})


@app.route("/buttons", methods=["GET"])
def get_buttons():
    with counts_lock:
        data = dict(counts)
    data["present"] = is_present()
    return jsonify(data)


if __name__ == "__main__":
    threading.Thread(target=watch_presence, daemon=True).start()
    print("GPIO service chay tai http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)
