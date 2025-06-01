# Pythonのベースイメージを指定 (例: python:3.9-slim や python:3.10-slim など、お使いのものに合わせてください)
FROM python:3.10-slim 

# 作業ディレクトリを設定
WORKDIR /app

# まず、libGL.so.1 を含むパッケージをインストール
# RUN apt-get update && apt-get install -y libgl1-mesa-glx && rm -rf /var/lib/apt/lists/*
# より軽量な libgl1 で試す場合もあります
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1-mesa-glx libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# requirements.txt をコピーしてライブラリをインストール
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# アプリケーションを起動するコマンド
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]