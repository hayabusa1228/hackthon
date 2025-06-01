import cv2
import mediapipe as mp
import math
import numpy as np
from PIL import ImageFont, ImageDraw, Image
import io
import base64

# 日本語フォントの指定（Windows例、環境に応じて変更可能）
# font_path = "C:/Windows/Fonts/msgothic.ttc"
font_path = "/Library/Fonts/Arial Unicode.ttf"  # macOSの例
font = ImageFont.truetype(font_path, 30)

# MediaPipe
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    cosine_angle = (ba[0]*bc[0] + ba[1]*bc[1]) / (math.hypot(*ba) * math.hypot(*bc))
    angle = math.degrees(math.acos(cosine_angle))
    return angle

def pose_estimation(image):
    with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        if not results.pose_landmarks:
            return None, None  #画像は後回し
            raise ValueError("プランクの姿勢になって体全体を映してください")

        landmarks = results.pose_landmarks.landmark
        h, w, _ = image.shape

        shoulder = [landmarks[11].x * w, landmarks[11].y * h]
        hip = [landmarks[23].x * w, landmarks[23].y * h]
        ankle = [landmarks[27].x * w, landmarks[27].y * h]

        hip_angle = calculate_angle(shoulder, hip, ankle)

        center_y = (shoulder[1] + ankle[1]) / 2
        threshold = 0.1 * abs(ankle[1] - shoulder[1])
        if abs(hip[1] - center_y) < threshold:
            hip_eval = "腰の高さOK"
            color = (0, 255, 0)
        elif hip[1] > center_y:
            hip_eval = "腰が下がりすぎ"
            color = (255, 0, 0)
        else:
            hip_eval = "腰が高すぎ"
            color = (255, 0, 0)

        # 出力用データ
        pose_info = {
            # "right_knee_angle": "N/A",
            # "left_knee_angle": "N/A",
            "right_hip_angle": f"{hip_angle:.2f}",
            "left_hip_angle": f"{hip_angle:.2f}",
            # "torso_tilt": "N/A",
            "shoulder_hip_ankle_alignment": hip_eval
        }

        # 画像オーバーレイ処理
        image_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(image_pil)
        draw.text((10, 50), f"角度: {int(hip_angle)}度", font=font, fill=color)
        draw.text((10, 100), f"{hip_eval}", font=font, fill=color)

        # 骨格描画
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        # PIL → OpenCV → JPEG → Base64
        image_bgr = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.jpg', image_bgr)
        jpg_as_text = base64.b64encode(buffer).decode("utf-8")

        return pose_info, jpg_as_text