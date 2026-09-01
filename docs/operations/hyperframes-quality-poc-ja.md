# HyperFrames Studio — Quality PoC 運用メモ

## 用途

Remotion動画の品質補強用ローカルプレビュー。

確認対象：

- 0–2秒 Hook
- Motion Graphics
- Typography / subtitle hierarchy
- Information Density
- BGM Sync / beat-aligned motion
- CTA ending
- 9:16 mobile readability / safe-zone

位置づけ：

- Remotion = Production Engine（量産・自動生成基盤）
- HyperFrames = Motion Quality Layer（演出品質層）
- HyperFrames Studio = 人間の最終目視・比較確認画面

## Project

`hyperframes/quality-poc`

## Studio Preview

通常の固定起動URL：

`http://127.0.0.1:3002/?view=storyboard#project/quality-poc`

作業時に使用した詳細URL：

`http://127.0.0.1:3002/?view=storyboard#project/quality-poc?v=1&t=0&tab=design&rc=0`

> `127.0.0.1` はローカルPC専用。外部公開URLではない。Preview server停止中は開けない。

## 起動

PoCディレクトリまたは適切な親ディレクトリから：

```bash
npx hyperframes preview --port 3002
```

起動後、上記Studio Previewを開く。

## 標準QA

Render前に原則：

```text
hyperframes lint
→ hyperframes inspect
→ hyperframes preview
→ Human visual review
→ render
```

確認ポイント：

1. Hookが0–2秒で成立しているか
2. 文字がスマホで読めるか
3. 情報カードが過密でないか
4. Scene transitionが不自然でないか
5. BGMの拍と主要motionが合っているか
6. CTAが十分な時間表示されるか
7. safe-zoneから重要要素が外れていないか
8. BASE Remotion版より品質改善が明確か

## 採用判断

HyperFrames全面置換はしない。

NEW = Remotion + HyperFrames quality layer が、

- 明確に品質改善
- 制作時間増が許容範囲
- 既存Remotion自動生成を壊さない

場合のみ採用する。

必要なら Hook / Hero Scene / Data Scene / CTA のみに限定して使用する。

## 注意

- ポート `3002` が使用中の場合はPreview URLが変わる可能性がある。
- URLだけでなく、この起動コマンドとProject pathを正本として残す。
- Docker / Whisper / Kokoro / MusicGen は現PoCの必須依存ではないため、必要性が出るまで追加しない。
- 本番render・公開は既存Human Gate / Safety Gateに従う。
