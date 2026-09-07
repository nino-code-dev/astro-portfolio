# Portfolio Code Sample

旧ポートフォリオをベースに、公開可能な範囲へ再構成したフロントエンドのコードサンプルです。
実案件の社名・URL・非公開情報は含めていません。

現行ポートフォリオ：
https://nino-code-portfolio.pages.dev/

## Repository status

このリポジトリは旧構成を保持しており、現在のポートフォリオ本体とはAstroのバージョン、依存関係、コンテンツ、実装内容が異なります。

- Repository: Astro 4系
- Current portfolio: Astro 7系

コードおよびコンテンツは今後、現行構成に合わせて更新予定です。

このリポジトリはフロントエンド実装の確認用です。WordPress / PHP / バックエンドの実務範囲は、ポートフォリオおよびスキルシートに掲載しています。

## Stack

- Astro
- SCSS
- JavaScript

## Source structure

```text
src/
├─ components/
├─ pages/
├─ scripts/
└─ styles/
```

ページ、UIコンポーネント、JavaScript、スタイルを役割ごとに分離しています。

## CSS architecture

SCSSは以下のレイヤーで構成しています。

- `foundation`: reset / base
- `global`: variables / mixins / breakpoints
- `layout`: header / footer / section / grid
- `component`: 複数箇所で再利用するUI部品
- `project/common`: サイト固有の共通要素
- `project/page`: ページ固有のスタイル
- `project/parts`: 複数ページで使用するサイト固有パーツ
- `utility`: margin / padding / gap / background などの単一目的クラス

クラスは主に `l-` / `c-` / `p-` / `u-` のprefixを使用しています。

再利用可能なUIは `component`、サイト・ページ固有の実装は `project` に配置し、共通部品とページ固有要件の責務を分離しています。
ページ固有のスタイルは `.p-home-*` などページ単位のnamespaceにまとめ、変更影響範囲を限定しています。

色、余白、font-size、breakpointなどの共通値は `global` のvariables / mixinsで管理しています。余白やgapなどのutility classはSCSSから生成しています。

## Local setup

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Public scope

制作実績は公開用に匿名化しています。
案件固有の情報、実URL、非公開スクリーンショットは公開対象から除外し、必要な箇所は汎用表現またはダミー素材へ置き換えています。

このリポジトリでは、フロントエンドのコード構成、CSS設計、コンポーネント分割、JavaScript実装を確認できる範囲のみ公開しています。
