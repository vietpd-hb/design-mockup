import type { NfcStatus, SrrStatus } from '../i18n/messages.ja';

/**
 * GRAIN: one row = one ORDER (item count shown as a column, rows are NOT split per product/unit).
 * Diverges from DD-P2-003 BR-02 ("1 row = 1 product", ref BF-012 BR-002) - pending doc update.
 */
export type OrderItem = {
  sku: string;
  product: string;
  artist: string;
  quantity: number;
  /** false = not an SRR-eligible product (excluded from 商品点数, still searchable). */
  srrEligible: boolean;
};

export type OrderRow = {
  key: string;
  order: string;
  orderUrl: string;
  date: string; // YYYY-MM-DD
  channel: 'EC' | 'POS';
  customer: string;
  customerEmail: string;
  /** Sum of line-item quantities. See the TBD on itemCount scope in app._index.tsx. */
  itemCount: number;
  /** Representative artist + 他N名 suffix; 'ー' when the order has none. */
  artistLabel: string;
  srr: SrrStatus;
  nfc: NfcStatus;
  orderCancelled: boolean;
  /** SKU / product / artist stay searchable even though they are not columns. */
  searchText: string;
  items: OrderItem[];
};

type Seed = [
  order: string, date: string, channel: 'EC' | 'POS', customer: string, email: string,
  cancelled: boolean, srr: SrrStatus, nfc: NfcStatus,
  items: Array<[sku: string, product: string, artist: string, qty: number, eligible: boolean]>,
];

// Phase 1 issues per order all-or-nothing, so SRR/NFC hold ONE value per order.
const SEED: Seed[] = [
  ['#1042', '2026-07-28', 'EC', '田中 美咲', 'misaki.tanaka@example.jp', false, 'error', 'unsent', [['TS-ART-0121', '蒼海の記憶', '村上 隆之', 3, true], ['TS-ART-0088', '白磁の壺', '佐々木 蘭', 1, true]]],
  ['#1041', '2026-07-27', 'POS', '山本 健太', 'kenta.yamamoto@example.jp', false, 'requested', 'preparing', [['TS-ART-0203', '都市の呼吸', '井上 千尋', 1, true]]],
  ['#1039', '2026-07-25', 'EC', '中村 あかね', 'akane.nakamura@example.jp', false, 'error', 'unsent', [['TS-ART-0150', '光の断片', '大西 悠', 2, true], ['TS-GDS-0011', '図録『丹青 2026』', '—', 1, false]]],
  ['#1036', '2026-07-22', 'EC', '小林 直樹', 'naoki.kobayashi@example.jp', true, 'error', 'unsent', [['TS-ART-0177', '月虹', '藤田 慧', 1, true]]],
  ['#1034', '2026-07-20', 'POS', '高橋 詩織', 'shiori.takahashi@example.jp', false, 'issued', 'sent', [['TS-ART-0164', '遠雷', '村上 隆之', 1, true]]],
  ['#1031', '2026-07-18', 'EC', '渡辺 悠真', 'yuma.watanabe@example.jp', false, 'error', 'unsent', [['TS-ART-0142', '群青の余白', '井上 千尋', 1, true], ['TS-ART-0143', '沈黙の庭', '井上 千尋', 1, true]]],
  ['#1028', '2026-07-15', 'EC', '松本 千夏', 'chinatsu.matsumoto@example.jp', false, 'missing', 'missing', [['TS-ART-0110', '潮の記譜', '大西 悠', 1, true]]],
  ['#1026', '2026-07-12', 'EC', '佐藤 陽菜', 'hina.sato@example.jp', false, 'issued', 'preparing', [['TS-ART-0098', '夜明けの丘', '藤田 慧', 2, true]]],
  ['#1024', '2026-07-10', 'POS', '伊藤 大和', 'yamato.ito@example.jp', false, 'error', 'unsent', [['TS-ART-0132', '白夜', '大西 悠', 2, true]]],
  ['#1021', '2026-07-08', 'EC', '加藤 結衣', 'yui.kato@example.jp', false, 'requested', 'unsent', [['TS-ART-0155', '風紋', '村上 隆之', 1, true], ['TS-GDS-0012', 'ポストカードセット', '—', 2, false]]],
  ['#1019', '2026-07-05', 'EC', '吉田 蓮', 'ren.yoshida@example.jp', false, 'issued', 'sent', [['TS-ART-0167', '静物 III', '佐々木 蘭', 1, true]]],
  ['#1017', '2026-07-03', 'POS', '山口 芽衣', 'mei.yamaguchi@example.jp', false, 'issued', 'sent', [['TS-ART-0104', '残響', '井上 千尋', 3, true]]],
  ['#1015', '2026-07-01', 'EC', '清水 陽向', 'hinata.shimizu@example.jp', false, 'missing', 'missing', [['TS-ART-0189', '岸辺の記憶', '藤田 慧', 1, true]]],
  ['#1012', '2026-06-28', 'EC', '森 花音', 'kanon.mori@example.jp', false, 'issued', 'sent', [['TS-ART-0176', '灯', '大西 悠', 1, true]]],
  ['#1010', '2026-06-25', 'POS', '池田 湊', 'minato.ikeda@example.jp', false, 'error', 'unsent', [['TS-ART-0118', '雪解け', '村上 隆之', 2, true]]],
  ['#1007', '2026-06-22', 'EC', '橋本 咲希', 'saki.hashimoto@example.jp', false, 'issued', 'sent', [['TS-ART-0143', '沈黙の庭', '井上 千尋', 1, true]]],
  ['#1004', '2026-06-20', 'EC', '石川 遥', 'haruka.ishikawa@example.jp', false, 'requested', 'preparing', [['TS-ART-0201', '群像', '佐々木 蘭', 1, true]]],
  ['#1001', '2026-06-18', 'EC', '阿部 樹', 'itsuki.abe@example.jp', false, 'error', 'unsent', [['TS-ART-0210', '遠い光', '藤田 慧', 1, true], ['TS-ART-0211', '余白の記譜', '藤田 慧', 1, true]]],
];

const ADMIN = 'https://admin.shopify.com/store/tanseisha';

/** (proposal, not in DD-P2-003) representative artist name + "他N名" suffix at order grain */
export function artistLabelOf(items: OrderItem[]): string {
  const names = [...new Set(items.filter((i) => i.srrEligible && i.artist !== '—').map((i) => i.artist))];
  if (names.length === 0) return 'ー';
  return names.length > 1 ? `${names[0]} 他${names.length - 1}名` : names[0];
}

export const MOCK_ORDERS: OrderRow[] = SEED.map((s, i) => {
  const items: OrderItem[] = s[8].map(([sku, product, artist, quantity, srrEligible]) => ({
    sku, product, artist, quantity, srrEligible,
  }));
  return {
    key: s[0],
    order: s[0],
    orderUrl: `${ADMIN}/orders/${5000 + i}`,
    date: s[1],
    channel: s[2],
    customer: s[3],
    customerEmail: s[4],
    // TBD (DD-P2-003, not yet in doc): item count scope - SRR-eligible items only (current assumption)
    // vs. every item in the order. Confirm with PM before wiring real data.
    itemCount: items.filter((it) => it.srrEligible).reduce((n, it) => n + it.quantity, 0),
    artistLabel: artistLabelOf(items),
    srr: s[6],
    nfc: s[7],
    orderCancelled: s[5],
    searchText: [s[0], s[3], s[4], ...items.map((it) => `${it.sku} ${it.product} ${it.artist}`)].join(' ').toLowerCase(),
    items,
  };
});
