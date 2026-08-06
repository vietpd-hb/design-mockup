# Tanseisha SRR app — Phase 2 UI

Two artefacts:

- **`Tanseisha SRR App.dc.html`** — running preview of every screen and state.
  Loads real Polaris web components from `cdn.shopify.com/shopifycloud/polaris.js`.
  The dark strip at the top is a preview harness (screen / global banner / state)
  and is **not** part of the app.
- **`code/`** — the React Router v7 route files, pure Polaris web components,
  no Polaris package imports, no hex/rgb/CSS.

## Files

| File | Screen |
| --- | --- |
| `app/i18n/messages.ja.ts` | all Japanese copy, keyed by MSG-NN / EC-NN |
| `app/config/srr.ts` | bulk limit (20 orders), 50 orders/page, PORT URL, search rules |
| `app/mocks/orders.ts` | 18 orders, one row each, covering every status |
| `app/routes/app.tsx` | SCR-P2-00 shell (`s-app-nav` + MSG-01/03/05/07) |
| `app/routes/app._index.tsx` | SCR-P2-01 + 01.a bulk layer + 01.b results |
| `app/routes/app.settings.tsx` | SCR-P2-02 Startrail settings |

## SCR-P2-01 — 11 states

| # | State | How to trigger |
| --- | --- | --- |
| 1 | Loading | preview chip `1 読み込み中` / loader `?state=loading` |
| 2 | Normal | default |
| 3 | No SRR orders (EC-02) | `3 対象なし` / `?state=emptyNoTarget` |
| 4 | No filter match (EC-04) | `4 該当なし` or search a term with no hits |
| 5 | Load failed (EC-01) | `5 取得失敗` / `?state=loadFailed` |
| 6 | Rate limited (EC-07) | `6 混雑` / `?state=rateLimit` |
| 7 | Possibly stale (EC-09) | `7 古い可能性` / `?state=stale` |
| 8 | Pagination drift (EC-08) | `8 一覧更新` / `?state=pageDrift` |
| 9 | Orders selected | `9 注文を選択中` or tick any SRR発行エラー order |
| 10 | Bulk running | `10 一括処理中` or 手動で発行する → 発行する |
| 11 | New tab blocked (EC-10) | `11 タブ遮断` or block pop-ups and press PORT |

## SCR-P2-02 — 9 states

`1 初回・未設定` · `2 設定済` · `3 形式エラー` · `4 保存中` · `5 保存成功` ·
`6 APIキー無効 EC-02` · `7 応答なし EC-03` · `8 保存失敗 EC-04` · `9 コレクション変更 EC-10`.
Turning both login switches off shows the blocking banner live.

## Preview-only shims (in the .dc.html logic class, never in `code/`)

Polaris web components are attribute-driven and assign their slots once at
upgrade time. Outside Shopify admin, with React re-rendering, three things need
patching in the preview: slot re-assignment, camelCase prop → attribute
mirroring, and direct click binding (`s-button` does not let clicks bubble).
`s-modal` and `s-app-nav` are App Bridge elements that never upgrade outside
the admin, so the bulk modal is shown in a plain overlay shell; the shipped
`.tsx` uses the real `s-modal`.

## Grain (2026-07-30 revision)

**1 row = 1 order.** An order with several products and several units is exactly
one row; quantity lives in the 商品点数 column (sum of the SRR-eligible line-item
quantities, so 1 product × 3 = `3点`). 作家名 was dropped from the table in review
(the representative-artist helper stays in `mocks/orders.ts`). The old `ユニット` column and the per-unit
row split are gone. This **diverges from DD-P2-003 BR-02** ("1 row = 1 product",
ref BF-012 BR-002) and is flagged in a comment at the top of the table component
and of `mocks/orders.ts` — the DD has not been updated yet.

Filter block follows the Shopify order-list search bar: 4 status tabs (visible while
the bar is collapsed) → search icon → one focused filter bar that holds the
`すべて ⌄` picker, the active condition tokens (`SRR発行ステータス は SRR発行済み ✕`)
and the free-text field. A single dropdown opens under the bar: the category list
first, then that category's values (checkboxes; 購入日 is a single-choice select
plus 開始日/終了日). Clicking a token reopens its own values in the same dropdown —
never a second popup. すべてクリア clears tokens and search but not the tab.

## Open points

- Tooltips on disabled row checkboxes: this Polaris build rejects `s-tooltip`
  as a child of `s-checkbox`, so both the preview and the `.tsx` carry the
  locked reason in `accessibilityLabel`.
- 商品点数 scope: counting **SRR-eligible items only** is an assumption (the list
  is already scoped to SRR orders). Confirm before wiring real data.
- NFC badge can misrepresent an order: shipping state is per Chip UID and staff
  may update chips individually (DD-P2-006 AF-01 / TBD-06), but the order-level
  `NFC:*` tag carries one value only (TBD-11).
- Tag-less orders show `ー` and stay in the list; there is no filter option for
  them yet (TBD-10).
- Display criterion "all orders" vs "SRR-eligible orders only" is still open
  (TBD-02); built as SRR-eligible only.
- 購入日 uses a single-choice `s-select` (+ 開始日/終了日 for カスタム); the spec
  says radio, but s-select is the single-choice control available in Polaris
  web components.
- Bulk cap of 20 **orders** per run is a UI guard; DD-P2-004 TBD-01 (batch size)
  is open.
"# design-mockup" 
