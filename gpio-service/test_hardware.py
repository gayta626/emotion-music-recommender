"""
Thử 2 nút chạm + cảm biến PIR, KHÔNG cần web hay Flask.
(Thử màn hình OLED: python3 oled.py)

Cách chạy (trên Pi):
    python3 test_hardware.py

Mỗi lần chạm nút / PIR đổi trạng thái sẽ in ra màn hình. Nhấn Ctrl+C để thoát.
"""

import time

from gpiozero import Button, DigitalInputDevice, DigitalOutputDevice

print("=== THU NUT CHAM TTP223 + PIR === (cham nut 1 / nut 2, vay tay truoc PIR, Ctrl+C de thoat)")
touch2_power = DigitalOutputDevice(22, initial_value=True)   # cấp điện cho module 2
time.sleep(1)   # TTP223 tự hiệu chỉnh ~0.5s sau khi có điện - đừng chạm lúc này
next_button = Button(17, pull_up=None, active_state=True, bounce_time=0.05)
pause_button = Button(27, pull_up=None, active_state=True, bounce_time=0.05)
# Chưa chạm mà đã báo True -> kiểm tra lại dây SIG / VCC
print("Luc dau (chua cham): nut 1 =", next_button.is_pressed, "| nut 2 =", pause_button.is_pressed)
next_button.when_pressed = lambda: print("Nut 1 (GPIO17) duoc cham")
pause_button.when_pressed = lambda: print("Nut 2 (GPIO27) duoc cham")

# Cảm biến PIR (GPIO23): mới cấp điện cần ~30-60s ổn định, lúc đó có thể báo lung tung
# PIR báo thành nhiều nhịp rất ngắn -> chỉ in tối đa 2 giây 1 lần, và báo khi vắng người 30s
# (giống cách gpio_service.py tính "có người")
motion = DigitalInputDevice(23, pull_up=False)
last_motion = None
last_print = 0.0


def on_motion():
    global last_motion, last_print
    last_motion = time.monotonic()
    if last_motion - last_print >= 2:
        last_print = last_motion
        print(time.strftime("%H:%M:%S"), "PIR: CO NGUOI")


motion.when_activated = on_motion
print("PIR luc dau:", "CO NGUOI" if motion.is_active else "khong co ai")

away = False
while True:
    # người cử động liên tục thì PIR giữ mức cao mãi, không có lần "bật" mới -> phải xem cả mức hiện tại
    if motion.is_active:
        last_motion = time.monotonic()
    gone = last_motion is not None and time.monotonic() - last_motion >= 30
    if gone and not away:
        print(time.strftime("%H:%M:%S"), "PIR: 30 giay khong thay ai -> (web se TAM DUNG nhac)")
    away = gone
    time.sleep(0.5)
