# KAIT Racing - 作業シフト・GPS出欠管理・全体カレンダーWebアプリ

神奈川工科大学 学生フォーミュラプロジェクト「KAIT Racing」向けの作業シフト提出・現場GPS出欠打刻・全体カレンダー管理システムです。

## 🏎️ 主な機能
1. **作業シフト希望提出**:
   - 「この日のこの時間帯なら実作業をしに行ける」という希望シフトを提出・編集・取り消し。
   - 班（機械班、電気班、空力/冷却班、事務班など）ごとの人手状況をリアルタイムに集計。
2. **GPS位置情報チェックイン（作業開始/終了打刻）**:
   - ガレージ到着時に打刻。Haversine formula による球面距離計算で、拠点から半径150m以内のみ打刻を許可。
   - リアルタイム作業中モニターで今誰がガレージにいるかを可視化。
3. **全体カレンダー**:
   - 大会、試走会、学内試走、全体ミーティング、デザイン審査締切等の統合表示。
   - 走行系・審査系・事務系のタグ色分け表示。
4. **ロール・権限管理 (Row Level Security)**:
   - `Admin` (チーム代表・TD): 権限昇格、拠点GPS設定、アカウント無効化 (BAN)
   - `Manager` (班リーダー・幹部): シフト確定、タスク割り当て、イベント登録
   - `Member` (一般部員): シフト提出、GPS打刻、カレンダー閲覧

---

## 🛠️ 技術スタック
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React
- **Backend / DB / Auth**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Deployment**: Vercel (Hobby Free)
- **Geolocation**: Web Geolocation API (`navigator.geolocation`) + Haversine Formula

---

## 🚀 ローカル開発環境のセットアップ

### 1. リポジトリのクローン & パッケージインストール
```bash
git clone https://github.com/kaitracing/Shift-Calendar_app.git
cd Shift-Calendar_app
npm install
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env.local` を作成し、Supabase の接続情報を設定します。
```bash
cp .env.example .env.local
```

`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Supabase データベースの初期化
Supabase プロジェクトの **SQL Editor** で、設計スキーマ SQL（テーブル・トリガー・RLSポリシー）を実行します。

### 4. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。