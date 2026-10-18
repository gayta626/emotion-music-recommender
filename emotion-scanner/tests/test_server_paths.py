import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER = os.path.join(HERE, "3_backend_server.py")


@unittest.skipUnless(os.path.isfile(os.path.join(HERE, "my_emonet", "emonet.pt")), "chưa có my_emonet/emonet.pt")
class ServerPathTest(unittest.TestCase):
    def test_finds_emonet_from_other_working_dir(self):
        # systemd / chạy từ thư mục gốc repo: thư mục đang đứng khác emotion-scanner/
        env = dict(os.environ, CUDA_VISIBLE_DEVICES="-1", PYTHONPATH=HERE, PYTHONUTF8="1")
        env.pop("EMOTION_MODEL", None)
        code = f"import runpy; print(runpy.run_path(r'{SERVER}', run_name='srv')['MODEL_NAME'])"
        with tempfile.TemporaryDirectory() as d:
            out = subprocess.run([sys.executable, "-c", code], cwd=d, env=env,
                                 capture_output=True, text=True, timeout=180)
        self.assertEqual(out.returncode, 0, out.stderr[-2000:])
        self.assertEqual(out.stdout.strip().splitlines()[-1], "emonet")
