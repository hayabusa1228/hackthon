FROM python:3.9-slim

# 作業ディレクトリを設定
WORKDIR /app

# 必要なライブラリをインストール
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# アプリケーションを起動するコマンド (ポート8080はCloud Runのデフォルト)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]