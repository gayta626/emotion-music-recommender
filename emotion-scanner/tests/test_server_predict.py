import base64
import io
import os
import runpy
import unittest
from unittest import mock

from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACE_A = os.path.join(HERE, "data", "happy", "ducvinh_happy_1787032508994.jpg")
FACE_B = os.path.join(HERE, "data", "sad", "ducvinh_sad_1787032577491.jpg")


def b64_file(path):
    with open(path, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()


def b64_blank():
    buf = io.BytesIO()
    Image.new("RGB", (224, 224), (128, 128, 128)).save(buf, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


@unittest.skipUnless(os.path.isfile(os.path.join(HERE, "my_emonet", "emonet.pt")) and os.path.isfile(FACE_A),
                     "thiếu model hoặc ảnh mẫu")
class PredictFramesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with mock.patch.dict(os.environ, {"EMOTION_MODEL": "emonet"}):
            cls.srv = runpy.run_path(os.path.join(HERE, "3_backend_server.py"), run_name="srv")
        cls.client = cls.srv["app"].test_client()

    def post(self, body):
        return self.client.post("/predict", json=body)

    def test_single_image_still_works(self):
        r = self.post({"image": b64_file(FACE_A)}).get_json()
        self.assertIn(r["emotion"], r["all_scores"])
        self.assertEqual(r["frames"], 1)

    def test_averages_probabilities_of_faces(self):
        a = self.post({"image": b64_file(FACE_A)}).get_json()["all_scores"]
        b = self.post({"image": b64_file(FACE_B)}).get_json()["all_scores"]
        r = self.post({"images": [b64_file(FACE_A), b64_file(FACE_B)]}).get_json()
        self.assertEqual(r["frames"], 2)
        for k in a:
            self.assertAlmostEqual(r["all_scores"][k], (a[k] + b[k]) / 2, delta=2e-3)
        self.assertEqual(r["emotion"], max(r["all_scores"], key=r["all_scores"].get))

    def test_frames_without_face_are_skipped(self):
        one = self.post({"image": b64_file(FACE_A)}).get_json()
        r = self.post({"images": [b64_blank(), b64_file(FACE_A), b64_blank()]}).get_json()
        self.assertEqual(r["frames"], 1)
        self.assertEqual(r["all_scores"], one["all_scores"])

    def test_no_face_in_any_frame(self):
        res = self.post({"images": [b64_blank(), b64_blank()]})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["error"], "no_face_detected")

    def test_bad_images_field(self):
        self.assertEqual(self.post({"images": []}).status_code, 400)
        self.assertEqual(self.post({"images": "abc"}).status_code, 400)
        self.assertEqual(self.post({"images": [b64_blank()] * 11}).status_code, 400)
        self.assertEqual(self.post({"images": ["không phải base64"]}).status_code, 400)
