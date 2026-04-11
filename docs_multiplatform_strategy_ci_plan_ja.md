# stackpilot マルチプラットフォーム方針 / CI復旧計画（2026-04-11）

## 1. 依頼内容の要約
- デスクトップ専用の stackpilot を、iPhone / iPad を含むマルチプラットフォーム方針へ再設計する。
- iPhone / iPad でも現実的に使える「検証ツール」仕様を定義する。
- 既存 CI（GitHub Actions）の lockfile エラーを解消し、`pnpm install/lint/typecheck/test/build` の運用前提を揃える。
- 次スプリント実装に進むため、設計、Issue 分解、PR 計画まで明確化する。

## 2. 目的
- **短期（最優先）**: CI を復旧し、開発の信頼性を回復する。
- **中期**: デスクトップ優位性（環境分離 / DevTools / API確認）を維持しつつ、iPhone / iPad で使う価値を最短で提供する。
- **長期**: 共通ドメインを育て、ランタイム差分を吸収できる拡張可能な構成にする。

## 3. 前提・仮定
- 仮定: 現在の主実装は Electron + React + TypeScript + Zustand + Tailwind + pnpm。
- 仮定: 商用プロダクト（社内利用寄り）であり、App Store 配布や MDM 配布の選択余地がある。
- 仮定: iOS ではブラウザエンジン制約（WebKitベース）があるため、デスクトップ同等の低レベル DevTools は実現困難。
- 要確認: モバイルで「フルブラウザ」を本当に必要とするか、または「検証特化ワークスペース」で十分か。

## 4. 制約整理
### 4-1. デスクトップと iPhone / iPad で同じ点 / 違う点
- 同じ点
  - ワークスペース単位の環境分離（表示上の識別、接続先制御、誤操作防止）。
  - API検証フロー（リクエスト履歴、レスポンス確認、JSON整形）。
  - 監査しやすいログモデル（誰がどの環境を見たか）。
- 違う点
  - デスクトップ: Electron で OS 統合・複数ウィンドウ・高度 DevTools 連携が可能。
  - iOS/iPadOS: エンジンや拡張性の制約が強く、同一方式の再現は非現実的。
  - 入力体験（キーボード中心 vs タッチ中心）と画面サイズ設計が異なる。

### 4-2. ブラウザ実装と検証ツール実装の分離
- ブラウザ本体（ナビゲーション・タブ・表示）はランタイム依存が大きいため、**プラットフォーム層で分離**する。
- 検証ツール（APIログ・環境バッジ・警告・JSONビュー）は **共通ドメイン + 共通UI部品**を最大化する。
- 具体的には `capture`（取得）と `inspect`（表示）を分離し、取得方法はプラットフォーム別、表示モデルは共通化する。

## 5. マルチプラットフォーム対応の推奨案
### 推奨案（C + E の段階導入）
- **Phase 1**: Electron継続 + iPhone/iPad は「検証ツール中心」アプリ（ブラウザ機能は限定）。
- **Phase 2**: 共通コア（契約・ログモデル・環境制御）を育成し、必要範囲でモバイルの閲覧機能を拡張。
- 理由: 価値の核（安全な検証）を先に届けつつ、iOS制約を回避できる。

### 代替案
- A: 完全別ネイティブ実装（速度は出るが保守コスト高）。
- B: PWA/Web連携（導入容易だが、端末内データ制御や配布要件で制約）。
- D: iOS専用フルブラウザ新規（コストと審査リスクが高く初期は非推奨）。

### 採用基準
- 3か月以内に業務価値（環境事故の低減、API調査時間短縮）を出せること。
- 実装人数 2-4 名で回せる保守コストであること。
- iOS 審査/配布リスクが受容可能であること。

## 6. アーキテクチャ提案
### 6-1. 共通化する層
- Domain: Workspace, Environment, ApiLog, GuardRule。
- Application: 検証ユースケース（Filter/Sort/Search/Redact）。
- Contract: IPC/HTTP問わず使える DTO と Validation。
- Design tokens: ダークテーマ、余白、タイポ、状態色。

### 6-2. デスクトップ専用層
- Electron main/preload IPC。
- BrowserView 管理、partition 制御、ローカル永続化最適化。
- デスクトップ向け DevTools 深掘り機能。

### 6-3. iPhone / iPad 専用層
- ネイティブコンテナ（Swift/SwiftUI想定）+ WKWebView。
- モバイル最適化の検証パネル（タッチ前提、1画面完結）。
- 端末セキュア保存（トークン/設定）と配布ポリシー連携。

### 6-4. 共有可能な UI / 型 / ドメイン / API
- 共有: 型定義、環境判定ロジック、APIログ整形、警告判定。
- 部分共有: React UI（デスクトップ）とモバイル UI はデザイン規則のみ共有。
- 非共有: WebView/BrowserView 制御、OS API 連携。

## 7. iPhone / iPad 向け検証ツールのMVP仕様
### 必須（MVP）
- Network 一覧（時系列、method/status/duration）。
- Request/Response headers 表示。
- JSON 整形表示。
- Environment badge（prod/stg/dev） + prod警告。
- Console logs（info/warn/error レベル）。

### 代替案（MVPで条件付き）
- Storage / Cookie は読み取り中心で最小実装。
- 簡易 DOM 情報は「要素概要」のみ（フルインスペクタは後続）。

### 対象外（MVP後）
- フル DOM ツリー編集。
- ブレークポイントデバッグ。
- 拡張機能レベルの高度フック。
- デスクトップ同等の DevTools 全機能再現。

## 8. デスクトップ版とモバイル版の機能差分表
| 機能 | Desktop (Electron) | iPhone/iPad (MVP) |
|---|---|---|
| ワークスペース分離 | フル対応 | 対応（同一概念） |
| 複数タブ/縦タブ | フル対応 | 簡易対応（タスク単位） |
| 高度 DevTools | 対応 | 非対応 |
| Network 検証 | 対応 | 対応（MVP中核） |
| JSON 整形 | 対応 | 対応 |
| Console logs | 対応 | 対応（基本レベル） |
| Storage/Cookie 詳細 | 対応 | 制限付き |
| リモート検証連携 | 任意 | Phase 2 |

## 9. Issue分解
### Issue 1
- タイトル: `CIのpnpm lockfile不整合を解消する`
- 目的: GitHub Actions の即時復旧。
- スコープ: lockfile配置、workflowのinstall/caching整合。
- 対象外: テスト戦略の刷新。
- DoD
  - `pnpm-lock.yaml` がリポジトリで管理される。
  - CI が `pull_request` と `push` で起動する。
  - `pnpm install/lint/typecheck/test/build` をCIジョブで実行する。
  - cache 設定が lockfile 配置と整合する。
- 想定ブランチ名: `fix/pnpm-lockfile-ci`

### Issue 2
- タイトル: `マルチプラットフォーム方針と責務分割を定義する`
- 目的: 次実装の設計判断を固定する。
- スコープ: 共通層、プラットフォーム層、MVP機能境界。
- 対象外: iOS実装着手。
- DoD
  - 比較案 A-E の評価と推奨案を文書化。
  - MVP/非MVP を明示。
  - 1-2週間の実装計画を記述。
- 想定ブランチ名: `feature/mobile-platform-strategy`

### Issue 3
- タイトル: `iPhone/iPad検証ツールMVPの技術検証`
- 目的: 実装前に制約を実測する。
- スコープ: WKWebViewでの計測可能項目、ログ取得設計。
- 対象外: App Store 提出。
- DoD
  - Network/Headers/JSON の取得可否を確認。
  - セキュア保存方式を決定。
  - 制約と回避策を文書化。
- 想定ブランチ名: `feature/ios-ipad-inspector-plan`

## 10. CI / ビルドエラーの原因整理
- lockfile エラーの直接原因
  - `actions/setup-node` の `cache: pnpm` 使用時に、リポジトリルートに `pnpm-lock.yaml` が無かった。
- 想定原因候補
  - lockfile 未コミット。
  - package manager は pnpm だが初期整備が未完了。
  - モノレポ化途中で lockfile 配置ルールが未整理。
- 修正方針
  - pnpm 方針に統一し lockfile を管理対象へ。
  - workflow を `--frozen-lockfile` 運用に寄せる。
  - 将来のモノレポを想定し `cache-dependency-path` を明示する。

## 11. CI 修正案
- package manager の揃え方
  - `packageManager: pnpm@9.12.3` を基準に CI も同一バージョンで固定。
- pnpm-lock.yaml の扱い
  - ルートに配置し Git 管理。
  - 依存更新時は lockfile 同時更新を必須化。
- monorepo の場合の cache-dependency-path
  - `pnpm-lock.yaml` と `**/pnpm-lock.yaml` を指定。
- Node バージョン方針
  - 現状は 22 を継続（既存依存が Node 22 系と整合）。
  - 互換性問題が出るまで LTS を維持。

## 12. GitHub Actions の yaml 修正案
- 対象: `.github/workflows/ci.yml`
- 実装:
  - `pull_request` / `push`
  - setup pnpm 9.12.3
  - setup node 22 + pnpm cache
  - `pnpm install --frozen-lockfile`
  - `pnpm lint/typecheck/test/build`

## 13. package.json / pnpm-workspace.yaml / lockfile 周りの修正方針
- `package.json`: 現状 scripts は CI要件を満たしており据え置き。
- `pnpm-workspace.yaml`: 単一パッケージ運用のため今回は不要（モノレポ化時に追加）。
- `pnpm-lock.yaml`: 新規管理し CI キャッシュ要件を満たす。

## 14. eslint / typecheck / test / build で落ちる点の確認方針
- ローカルで `pnpm install` 後に順次実行。
- 失敗時は「設定ミス」か「コード不整合」かを分離。
- 今回は CI復旧優先のため、無関係リファクタは実施しない。

## 15. 直近1〜2週間の実装計画
- Day 1-2: CI復旧、設計文書確定。
- Day 3-5: モバイルMVPの技術検証（取得可能データ範囲）。
- Week 2: 共通ドメイン切り出し、APIログ表示の共通化 PoC。

## 16. 最初に切るべきPR分割案
1. PR-1: CI復旧（lockfile + workflow）。
2. PR-2: マルチプラットフォーム設計文書。
3. PR-3: iOS/iPad 検証MVPの雛形（別ランタイム）。

## 17. 想定ブランチ名
- `feature/mobile-platform-strategy`（推奨）
- `fix/pnpm-lockfile-ci`
- `feature/ios-ipad-inspector-plan`

## 18. 想定コミットメッセージ案（5個）
1. `pnpm lockfile不足によるCIエラーを修正`
2. `GitHub Actionsの依存関係キャッシュ設定を見直し`
3. `iPhone/iPad対応を見据えたマルチプラットフォーム方針を整理`
4. `モバイル向け検証ツールのMVP範囲を定義`
5. `CI復旧と次スプリント向けIssue分解を追加`

## 19. 想定PRタイトル
- `CI復旧とiPhone/iPad対応に向けたマルチプラットフォーム方針整理`

## 20. 想定PR本文
1. 目的  
   - CI エラーを解消し、マルチプラットフォーム実装の意思決定を進める。
2. 背景  
   - `cache: pnpm` で lockfile 不足エラーが発生し、開発フローが不安定。
3. 変更内容  
   - `pnpm-lock.yaml` を追加。  
   - CI workflow を lockfile 前提へ調整。  
   - iPhone/iPad 含む実装方針と MVP 機能境界を文書化。
4. 変更理由  
   - CI の再現性確保と、次実装の合意形成を同時に進めるため。
5. 影響範囲  
   - CI 実行手順、依存管理、開発計画ドキュメント。
6. 確認方法  
   - `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
7. テスト内容  
   - 静的検証（lint/typecheck）、ユニットテスト、ビルド。
8. レビューで見てほしい点  
   - iOS/iPad MVP の機能境界が妥当か。
9. 懸念点・未対応事項  
   - iOS 実装方式（ネイティブ詳細）と配布戦略は次PRで具体化。

## 21. テスト観点
- CI 前提チェック
  - lockfile の存在確認。
  - setup-node cache 設定と lockfile パス整合。
- 実行コマンド
  - `pnpm install`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- 期待値
  - 依存解決からビルドまで直列で成功。

## 22. リスク・注意点
- iOS の制約によりデスクトップ同等 DevTools を約束すると失敗しやすい。
- lockfile を手動更新しない運用（必ず pnpm 生成）を徹底する必要がある。
- モバイルでフルブラウザを先に狙うとコスト超過の恐れ。

## 23. 今回やらないこと
- iOS ネイティブアプリの本実装。
- デスクトップ UI の大規模リファクタ。
- E2E テスト基盤の本格導入（将来拡張余地のみ確保）。
