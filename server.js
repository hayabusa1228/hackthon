const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080; // App EngineがPORT環境変数を設定します

// 'dist' ディレクトリの静的ファイルを提供
app.use(express.static(path.join(__dirname, 'dist')));

// すべてのルートで index.html を返す (React Router などを使用しているSPAの場合)
// これにより、ブラウザで直接サブパスにアクセスしても index.html が返され、
// クライアントサイドのルーティングが機能します。
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});