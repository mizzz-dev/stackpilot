# Stackpilot Inspector Mobile

iPhone / iPad向けのAPI Inspector MVPです。Expo Router + React Nativeで構成しています。

## 起動

リポジトリルートで依存関係をインストールします。

```bash
pnpm install --frozen-lockfile
pnpm mobile
```

Expo Goで開発用QRコードを読み込んで起動してください。

## Desktopとのペアリング

1. iPhone / iPadとDesktopを同じLANへ接続する
2. Desktop版Stackpilotの`Mobile接続`を開く
3. `接続を開始`を押す
4. Mobileアプリの`QRで接続`を開く
5. Desktopに表示されたペアリングQRコードを読み取る

ペアリング後は、DesktopでactiveになっているWorkspaceのAPIログを取得します。Workspaceを切り替えた場合は、Mobileで再読み込みすると新しいWorkspaceへ追従します。

## セキュリティ

- DesktopのローカルAPIは既定で停止しています
- ユーザー操作時のみ同一LAN向けに起動します
- APIアクセスには短命Bearer tokenが必要です
- QRコードとtokenは10分後、Desktopで停止した時、またはDesktopアプリ終了時に無効になります
- 接続情報はiOS Keychain / Android Keystoreを利用するSecureStoreへ保存します
- QR画像やペアリング文字列を第三者へ共有しないでください

## 表示モード

### デモモード

ペアリング情報と`EXPO_PUBLIC_STACKPILOT_API_URL`がどちらも未設定の場合は、アプリ内のサンプル通信を表示します。

### QRペアリングモード

DesktopのQRコードから接続先と短命tokenを取得し、以下へアクセスします。

```text
GET {Desktop LAN URL}/v1/mobile/inspector/snapshot
Authorization: Bearer {short-lived token}
```

### 固定URLモード

開発時のみ、環境変数でInspector APIを直接指定できます。

```bash
EXPO_PUBLIC_STACKPILOT_API_URL=http://192.168.1.10:4100 pnpm mobile
```

固定URLモードはBearer tokenを付与しないため、通常はQRペアリングを利用してください。

## レスポンシブ仕様

- iPhone相当: APIログ一覧から通信詳細画面へ遷移
- iPad相当（幅768px以上）: APIログ一覧と通信詳細を2ペイン表示

## 確認コマンド

```bash
pnpm mobile:typecheck
pnpm mobile:build
```

## 現時点の対象外

- フルブラウザ機能
- デスクトップ同等のDevTools
- リクエスト再送
- インターネット越しの接続
- クラウド中継
- App Store / EAS Build設定
