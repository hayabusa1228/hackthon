from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import os
import numpy as np
import pose_estimation as ps
from vertexai.generative_models import GenerativeModel, Part

app = FastAPI()

# CORS設定
origins = [
    "http://localhost",
    "http://localhost:8080",
    "https://your-frontend-domain.com"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.post("/api/post_image")
async def post_image(image: UploadFile = File(...)):
    try:
        # 画像受信・読み込み
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_cv is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        # 姿勢推定 & オーバーレイ画像取得
        pose_info, overlay_image_base64 = ps.pose_estimation(img_cv)

        # Gemini用プロンプト作成

        if pose_info is None:
            return "AAAa"
            raise HTTPException(status_code=400, detail="プランクの姿勢になって体全体を映してください")
        
        processed_data = text_processing(pose_info)
        generated_text = await generate_text(processed_data)

        # APIレスポンス： LLM結果 + 画像
        return {
            "generated_text": generated_text["generated_text"],
            "overlay_image_base64": overlay_image_base64
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    
def text_processing(pose_info):
    text = f"""
あなたは経験豊富で、励ますのが得意なフィットネスコーチAIです。
ユーザーが行っている特定の筋トレエクササイズに関する骨格データを受け取り、その姿勢が適切かどうかを判断し、改善のための具体的で実行可能なアドバイスを生成してください。画像は提供されません。

1. 対象エクササイズ:
プランク

## 2. ユーザーの骨格データ:
（あなたのアプリが抽出できる骨格情報を、明確で一貫性のある形式でここに記述します。単純な座標よりも、関節角度や相対的な位置関係、定性的な観察結果の方がLLMは理解しやすいです。）

例:
* **主要な関節角度 (度):**
    * 右股関節の角度（大腿骨と胴体のなす角度）: {pose_info['right_hip_angle']}
    * 左股関節の角度（大腿骨と胴体のなす角度）: {pose_info['left_hip_angle']}
    * 肩と腰と足首の位置関係（側面から見て一直線に近いか）: {pose_info['shoulder_hip_ankle_alignment']}

## 3. [対象エクササイズ名] の正しい姿勢のポイント:
（このエクササイズにおける正しいフォームの主要な要素を具体的に記述します。LLMが比較するための基準となります。）

例 (スクワットの場合):
* 腰は膝よりも低い位置まで下げる（パラレルスクワット以上）。
* 背中は自然なS字カーブを保ち、丸まったり過度に反ったりしない。
* 膝はつま先と同じ方向に向け、内側に入らないようにする。
* かかとは動作全体を通じて床にしっかりと接地させる。
* 頭は背骨の延長線上に保つ。

## 4. あなたのタスク:
1.  上記の「ユーザーの骨格データ」と「正しい姿勢のポイント」を比較・分析してください。
2.  ユーザーの姿勢が正しいかどうかを判断し、必要な改善点を特定してください。
3.  ユーザーの姿勢が正しい場合は「素晴らしい！その調子です！」と励ましのメッセージを返してください。
4.  ユーザーの姿勢が正しくない場合は、改善点を指摘してください。
5.  常に励ますような、協力的でポジティブなトーンを保ってください。
6.  アバターに反映するため、喜怒哀楽の感情を1つ選んでください。

## 5. 出力形式:
出力はJSON形式で、以下のキーを含めてください。
```json
{{
    "感情": "喜び, 怒り, 悲しみ, 楽しみのいずれか",
    "テキスト": "あなたのテキストをここに記述してください。"
}}
"""
    return text

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = "asia-northeast1"
MODEL_NAME = "gemini-1.5-flash-001"

async def generate_text(text: str):
    try:
        model = GenerativeModel(MODEL_NAME)
        response = await model.generate_content_async([Part.from_text(text)])

        if response.candidates and len(response.candidates) > 0:
            parts = response.candidates[0].content.parts
            if parts and len(parts) > 0:
                generated_text = parts[0].text
                return {"generated_text": generated_text}
            else:
                raise HTTPException(status_code=500, detail="No content parts in Gemini response.")
        else:
            raise HTTPException(status_code=500, detail="No candidates in Gemini response.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating text: {str(e)}")