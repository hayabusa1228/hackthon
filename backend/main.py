# backend/main.py

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import cv2
import numpy as np

import vertexai
from vertexai.generative_models import GenerativeModel, Part

# ① 起動時に一度だけ Vertex AI を初期化（プロジェクトID と リージョンを指定）
vertexai.init(
    project="overfit-461602",
    location="asia-northeast1"
)

from backend import pose_estimation as ps

app = FastAPI()

# CORS設定（必要に応じて origin を追加）
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ② 利用するモデル名を「asia-northeast1」で動作する最新バージョンに設定
MODEL_NAME = "gemini-1.5-flash-002"


@app.post("/api/post_image")
async def post_image(image: UploadFile = File(...)):
    try:
        print("📥 POST受信")
        contents = await image.read()
        print(f"📏 画像サイズ: {len(contents)} bytes")

        nparr = np.frombuffer(contents, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_cv is None:
            print("⚠️ OpenCV decode失敗")
            raise HTTPException(status_code=400, detail="画像のデコードに失敗しました。")

        print("✅ OpenCV decode成功")

        pose_info, _ = ps.pose_estimation(img_cv)
        print(f"📊 Pose info: {pose_info}")

        prompt = text_processing(pose_info)
        print(f"🧾 Prompt:\n{prompt}")

        result_text = await generate_text(prompt)
        print(f"📤 LLM応答: {result_text}")

        return {"evaluation": result_text}

    except Exception as e:
        print(f"❌ エラー内容: {e}")
        raise HTTPException(status_code=500, detail=str(e))



def text_processing(pose_info: dict) -> str:
    """
    Pose Estimation の結果（pose_info）をもとに、
    プランク姿勢の簡潔な評価を依頼するプロンプトを生成する。
    """
    return f"""
以下の【骨格データ】をもとに、プランク姿勢が適切かどうかを【ガイドライン】に従って評価し【アドバイス】に従って「簡潔に」アドバイスをしてください。
不要な情報は省き、1文程度の短い文章で伝えてください。

【骨格データ】
- 右股関節の角度: {pose_info['right_hip_angle']}°
- 左股関節の角度: {pose_info['left_hip_angle']}°

【ガイドライン】
・股関節の角度が155度以上170度以下が良く、155度未満は腰が浮いており、175度を超えると腰が落ちすぎています。
・股関節の角度が165度+-3度の時はとても素晴らしい姿勢です。

【アドバイス】
・熱血トレーナーのような口調、例えば「いい感じだ！」や「そんなんじゃなりたいお前になれないぞ！」のような口調で檄を飛ばしてください。
・とても素晴らしい姿勢の時はめちゃくちゃ褒めてください
・股関節の角度が155度以上170度に収まっていない場合は「腰が下がっているぞ！」「腰が浮いているぞ！」などと指摘し、檄を飛ばしたり煽ったりしてください。
・とても素晴らしい姿勢でも155度以上175度範囲外でもないときは、まあまあいいとして適当に応援してください。

出力はアドバイスを、1~2文で書いてください。なお、165度+-3度などの具体的な数値はアドバイスに含めないでください。
"""



async def generate_text(text: str) -> str:
    """
    プロンプト文字列を受け取り、Vertex AI を呼び出して
    「簡潔なテキスト評価」をそのまま返す関数。
    """
    try:
        model = GenerativeModel(MODEL_NAME)
        response = await model.generate_content_async([Part.from_text(text)])
        if response.candidates and len(response.candidates) > 0:
            parts = response.candidates[0].content.parts
            if parts and len(parts) > 0:
                # JSON やマークダウンではなく純粋なテキストだけを返す
                return parts[0].text.strip()
        raise HTTPException(status_code=500, detail="LLM から適切な応答が得られませんでした。")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating text: {str(e)}")
