"""
Thử 2 nút bấm, KHÔNG cần web hay Flask.
(Thử màn hình OLED: python3 oled.py)

Cách chạy (trên Pi):
    python3 test_hardware.py

Mỗi lần bấm nút sẽ in ra màn hình. Nhấn Ctrl+C để thoát.
"""

from signal import pause

from gpiozero import Button

print("=== THU NUT === (bam nut 1 / nut 2, Ctrl+C de thoat)")
next_button = Button(17, bounce_time=0.05)
pause_button = Button(27, bounce_time=0.05)
# Chưa bấm mà đã báo True -> dây đang nối 2 chân luôn thông của nút (sai cặp chân)
print("Luc dau (chua bam): nut 1 =", next_button.is_pressed, "| nut 2 =", pause_button.is_pressed)
next_button.when_pressed = lambda: print("Nut 1 (GPIO17) duoc bam")
pause_button.when_pressed = lambda: print("Nut 2 (GPIO27) duoc bam")
pause()
