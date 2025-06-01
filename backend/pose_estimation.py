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
    """
    3点のなす角を計算する
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    ba = a - b
    bc = c - b
    
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

def pose_estimation(image):
    with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        if not results.pose_landmarks:
            return None, None

        landmarks = results.pose_landmarks.landmark
        h, w, _ = image.shape

        # 左半身ランドマーク
        left_shoulder = [landmarks[11].x * w, landmarks[11].y * h]
        left_hip = [landmarks[23].x * w, landmarks[23].y * h]
        left_knee = [landmarks[25].x * w, landmarks[25].y * h]
        left_ankle = [landmarks[27].x * w, landmarks[27].y * h]

        # 右半身ランドマーク
        right_shoulder = [landmarks[12].x * w, landmarks[12].y * h]
        right_hip = [landmarks[24].x * w, landmarks[24].y * h]
        right_knee = [landmarks[26].x * w, landmarks[26].y * h]
        right_ankle = [landmarks[28].x * w, landmarks[28].y * h]

        # 各角度計算
        left_hip_angle = calculate_angle(left_shoulder, left_hip, left_knee)
        right_hip_angle = calculate_angle(right_shoulder, right_hip, right_knee)
        left_knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
        right_knee_angle = calculate_angle(right_hip, right_knee, right_ankle)

        # 体幹傾き（左右平均）
        left_torso_tilt = math.degrees(math.atan2(left_shoulder[1] - left_hip[1], left_shoulder[0] - left_hip[0]))
        right_torso_tilt = math.degrees(math.atan2(right_shoulder[1] - right_hip[1], right_shoulder[0] - right_hip[0]))
        torso_tilt = (left_torso_tilt + right_torso_tilt) / 2

        # 腰の高さ判定（例として左側で実施）
        center_y = (left_shoulder[1] + left_ankle[1]) / 2
        threshold = 0.1 * abs(left_ankle[1] - left_shoulder[1])
        if abs(left_hip[1] - center_y) < threshold:
            hip_eval = "腰の高さOK"
            color = (0, 255, 0)
        elif left_hip[1] > center_y:
            hip_eval = "腰が下がりすぎ"
            color = (255, 0, 0)
        else:
            hip_eval = "腰が高すぎ"
            color = (255, 0, 0)

        # 出力用データ
        pose_info = {
            "left_knee_angle": f"{left_knee_angle:.2f}",
            "right_knee_angle": f"{right_knee_angle:.2f}",
            "left_hip_angle": f"{left_hip_angle:.2f}",
            "right_hip_angle": f"{right_hip_angle:.2f}",
            "torso_tilt": f"{torso_tilt:.2f}",
            "shoulder_hip_ankle_alignment": hip_eval
        }

        # 画像オーバーレイ処理
        image_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(image_pil)
        draw.text((10, 50), f"左膝角度: {int(left_knee_angle)}度", font=font, fill=color)
        draw.text((10, 100), f"右膝角度: {int(right_knee_angle)}度", font=font, fill=color)
        draw.text((10, 150), f"体幹傾き: {int(torso_tilt)}度", font=font, fill=color)
        draw.text((10, 200), f"{hip_eval}", font=font, fill=color)

        # 骨格描画
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        # PIL → OpenCV → JPEG → Base64
        image_bgr = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.jpg', image_bgr)
        jpg_as_text = base64.b64encode(buffer).decode("utf-8")

        return pose_info, jpg_as_text