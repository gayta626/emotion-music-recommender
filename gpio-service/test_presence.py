"""
Test tu dong cho gpio_service.py bang chan GPIO gia (mock) - chay tren laptop, KHONG can Pi.

Cach chay (can gpiozero + flask + flask-cors):
    python test_presence.py
In "ALL OK" la qua het.
"""
import os, sys
os.environ["GPIOZERO_PIN_FACTORY"] = "mock"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from unittest import mock
from gpiozero import Device
import gpio_service as gs

shown = []
gs.oled = mock.Mock(show=lambda t, b: shown.append((t, b)))
client = gs.app.test_client()
pir = Device.pin_factory.pin(23)
clock = [1000.0]
gs.time.monotonic = lambda: clock[0]

def status():
    return client.get("/buttons").get_json()

# khởi động: PIR chưa báo lần nào -> coi như có người (PIR chưa cắm thì nhạc không tự dừng)
assert status()["present"] is True, status()
client.post("/led", json={"state": "off"})
assert shown[-1] == gs.SCREENS["off"], shown[-1]   # nhưng chưa chào
client.post("/led", json={"state": "happy"}); clock[0] += 100; gs.refresh_screen()
assert shown[-1] == gs.SCREENS["happy"], shown[-1]  # chưa cắm PIR -> không hiện Tam dung
client.post("/led", json={"state": "off"})

# có người lại gần ở màn hình chờ -> chào
pir.drive_high(); gs.refresh_screen()
assert status()["present"] is True
assert shown[-1] == gs.GREETING, shown[-1]

# đang phát nhạc, người đi (PIR tắt) -> 29s vẫn còn, 31s thì vắng
client.post("/led", json={"state": "happy"})
assert shown[-1] == gs.SCREENS["happy"]
pir.drive_low()
clock[0] += 29; gs.refresh_screen()
assert status()["present"] is True
assert shown[-1] == gs.SCREENS["happy"]
clock[0] += 2; gs.refresh_screen()
assert status()["present"] is False
assert shown[-1] == gs.PAUSED, shown[-1]

# quay lại -> hiện lại cảm xúc
pir.drive_high(); gs.refresh_screen()
assert status()["present"] is True
assert shown[-1] == gs.SCREENS["happy"]

# đang quét thì luôn hiện "Dang quet..." dù vắng
client.post("/led", json={"state": "scanning"})
pir.drive_low(); clock[0] += 60; gs.refresh_screen()
assert shown[-1] == gs.SCREENS["scanning"]

# refresh không vẽ lại khi không đổi (tránh nháy màn / tốn I2C)
n = len(shown); gs.refresh_screen(); assert len(shown) == n

# PIR chỉ nháy rất ngắn giữa 2 lần kiểm tra -> vẫn phải tính là có người
import time as _t
client.post("/led", json={"state": "happy"})
clock[0] += 100; gs.refresh_screen()
assert status()["present"] is False
pir.drive_high(); _t.sleep(0.2); pir.drive_low(); _t.sleep(0.2)
assert status()["present"] is True, "bo lo xung PIR ngan"

# PIR giữ mức cao liền mạch lâu hơn 30s (người cử động liên tục) -> vẫn có người
pir.drive_high()
for _ in range(10):
    clock[0] += 10
    assert status()["present"] is True, "PIR giu cao ma bao vang"
pir.drive_low()

# nút vẫn đếm như cũ
Device.pin_factory.pin(17).drive_high(); Device.pin_factory.pin(17).drive_low()
assert status()["next"] == 1, status()
print("ALL OK")
