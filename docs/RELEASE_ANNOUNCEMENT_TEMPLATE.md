# Clip Composer リリース告知テンプレート

## 概要

新バージョンをリリースした際に使用する告知テンプレートです。
各チャンネルに合わせて調整してください。

---

## メール / 長文告知用

```
件名: 【Clip Composer】v{VERSION} リリースのお知らせ

---

Clip Composer v{VERSION} をリリースしました。

■ 主な変更点
- {変更点1}
- {変更点2}
- {変更点3}

■ ダウンロード
アプリ内自動アップデート、または以下からダウンロード:
https://github.com/UKIYO-4s/clip-composer/releases/tag/v{VERSION}

■ 既知の注意事項
- {注意事項があれば記載}

■ 詳細なリリースノート
https://github.com/UKIYO-4s/clip-composer/releases/tag/v{VERSION}

---

ご不明点がございましたら、お気軽にお問い合わせください。
```

---

## Discord / チャット用（短文）

```
:sparkles: **Clip Composer v{VERSION}** リリース!

**主な変更点:**
- {変更点1}
- {変更点2}
- {変更点3}

:arrow_down: ダウンロード: https://github.com/UKIYO-4s/clip-composer/releases/tag/v{VERSION}

アプリ内から自動アップデートも可能です。
```

---

## 社内チャット用（簡潔版）

```
【Clip Composer v{VERSION} リリース】

変更点:
- {変更点1}
- {変更点2}

DL: https://github.com/UKIYO-4s/clip-composer/releases/tag/v{VERSION}

※アプリ起動時に自動アップデート通知が表示されます
```

---

## Twitter / SNS用

```
Clip Composer v{VERSION} をリリースしました🎉

✨ {変更点1}
✨ {変更点2}

ダウンロード👇
https://github.com/UKIYO-4s/clip-composer/releases/tag/v{VERSION}

#ClipComposer #動画編集 #ショート動画
```

---

## テンプレート変数

| 変数 | 説明 | 例 |
|------|------|-----|
| `{VERSION}` | リリースバージョン | 1.1.0 |
| `{変更点1}` | 主要な変更点 | 自動アップデート機能を追加 |
| `{変更点2}` | 追加の変更点 | パフォーマンス改善 |
| `{変更点3}` | 追加の変更点 | バグ修正 |
| `{注意事項}` | 既知の問題等 | macOS 12以上が必要 |

---

## チェックリスト

リリース告知前の確認事項:

- [ ] GitHub Releaseが公開されている
- [ ] ダウンロードリンクが正しい
- [ ] 変更点が正確に記載されている
- [ ] 既知の注意事項が漏れなく記載されている
- [ ] 自動アップデートが動作確認済み
