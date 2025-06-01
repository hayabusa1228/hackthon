# backend/chat.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# ─── ここで APIRouter を作成 ───
router = APIRouter()

# リクエストボディ用の Pydantic モデル
class ChatHistoryItem(BaseModel):
    speaker: str  # 'user' または 'trainer'
    text: str

class ChatRequest(BaseModel):
    history: List[ChatHistoryItem]


@router.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    フロントエンドから会話履歴を受け取り、
    Vertex AI に投げてトレーナーの返答を生成して返すエンドポイント。
    """
    try:
        history = req.history

        # 会話履歴を文字列に変換
        prompt_lines = []
        for item in history:
            role = "User" if item.speaker == "user" else "Trainer"
            prompt_lines.append(f"{role}: {item.text}")
        prompt_lines.append("Trainer:")  # ここから続きを生成したい
        prompt = "\n".join(prompt_lines)

        # Vertex AIを呼び出して応答を生成
        MODEL_NAME = "gemini-1.5-flash-002"
        model = GenerativeModel(MODEL_NAME)
        response = await model.generate_content_async([Part.from_text(prompt)])
        if not (response.candidates and response.candidates[0].content.parts):
            raise HTTPException(status_code=500, detail="LLM から適切な応答が得られませんでした。")
        full_text = response.candidates[0].content.parts[0].text.strip()
        trainer_reply = full_text.split("\n")[0]  # 最初の行だけを返す

        return {"reply": trainer_reply}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating chat reply: {str(e)}")
