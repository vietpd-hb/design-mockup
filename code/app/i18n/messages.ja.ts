// Tanseisha SRR app - Japanese UI strings, Phase 2.
// One entry per message code so the native-speaker copy pass edits a single file.
// Codes map to the design document (MSG-NN) and the edge-case list (EC-NN).

export const MSG = {
  // SCR-P2-00 app shell banners
  MSG_01: 'アプリのインストールが完了しました。設定を開始できます。',
  MSG_03: '認証に失敗しました。お手数ですが、もう一度お試しください。',
  MSG_05: '一時的なエラーが発生しました。しばらくしてからもう一度お試しください。',
  MSG_07: '追加の権限が許可されていないため、一部の機能はご利用いただけません。権限を許可すると利用可能になります。',
  MSG_07_ACTION: '権限を許可する',
  MSG_07_LOCKED_TOOLTIP: 'この機能には追加の権限が必要です',
} as const;

export const EC_LIST = {
  // SCR-P2-01 order list
  EC_01_LOAD_FAILED: '注文データの取得に失敗しました。時間をおいて再試行してください。',
  EC_02_NO_TARGET: 'SRR 対象の注文がありません。フィルタ条件や商品の SRR フラグをご確認ください。',
  EC_04_NO_MATCH: '条件に一致する結果がありません。条件を緩めてお試しください。',
  EC_07_RATE_LIMIT: '混雑しているため読み込めませんでした。しばらくして再試行してください。',
  EC_08_PAGE_DRIFT: '一覧が更新されました。リフレッシュして最新に同期してください。',
  EC_09_STALE: '表示が最新でない可能性があります。再読込してください。',
  EC_10_POPUP_BLOCKED: '新しいタブを開けませんでした。こちらのリンクから手動で開いてください。',
} as const;

export const EC_ISSUE = {
  // SCR-P2-01.b per-order bulk issue outcomes
  EC_02_NO_WALLET: '顧客のウォレット保存が必要です',
  EC_03_NO_CHIP: 'チップUID在庫切れのため発行できません',
  EC_04_REJECTED: '発行に失敗しました。ウォレットまたは設定を確認してください',
  EC_05_TIMEOUT: '一時的なエラーです。後で再試行してください',
  EC_06_SKIPPED: '既に発行済みのためスキップしました',
  EC_08_MAIL_FAILED: '証明書メールの送信に失敗しました（発行は完了しています）',
  EC_09_CANCELLED: 'キャンセル済み注文のため再発行できません',
} as const;

export const EC_SETTINGS = {
  // SCR-P2-02 Startrail settings
  EC_02_INVALID_KEY: 'API キーが無効です。再度入力してください。',
  EC_03_NO_RESPONSE: 'Startrail が応答しません。しばらくしてから再度お試しください。',
  EC_04_DB_FAILED: '設定の保存に失敗しました。もう一度お試しください。',
  EC_10_COLLECTION_CHANGED: 'コレクションアドレスを変更したため、接続を再確認します。',
  LOGIN_NOT_SAVED: 'ログイン方式の変更も保存されていません。',
  SAVED: '設定を保存しました。',
  LUW_FORMAT: 'LUW アドレスの形式が正しくありません。',
  COLLECTION_FORMAT: 'コレクションアドレスの形式が正しくありません。',
  NEED_ONE_PROVIDER: 'ログイン方式を1つ以上有効にしてください。',
} as const;

export const NAV = {
  HOME: 'ホーム',
  SETTINGS: '設定',
} as const;

export const LIST = {
  TITLE: '注文一覧',
  SUBTITLE: 'SRR 対象商品を含む注文を表示します。1 行 = 1 注文です。',
  OPEN_PORT: 'Startrail PORT を開く',
  PORT_NOT_CONFIGURED: 'Startrail PORT の URL が未設定です',
  // status tabs - a separate filter layer from the SRR filter category
  TAB_ALL: 'すべて',
  TAB_REQUESTED: '発行依頼中',
  TAB_ISSUED: '発行成功',
  TAB_ERROR: '発行失敗',
  COL_ORDER: '注文番号',
  COL_ITEM_COUNT: '商品点数',
  COL_ARTIST: '作家名',
  COL_DATE: '購入日',
  COL_CHANNEL: '販売チャネル',
  COL_CUSTOMER: '顧客名',
  COL_EMAIL: '顧客メールアドレス',
  COL_SRR: 'SRR発行ステータス',
  COL_NFC: 'NFC発送ステータス',
  COL_DETAIL: '詳細',
  DETAIL: '詳細',
  detailLabel: (order: string) => `${order} の詳細を Shopify 管理画面で開く`,
  itemCount: (n: number) => `${n}点`,
  // filter block
  SEARCH_OPEN: '注文を絞り込み',
  SEARCH_PLACEHOLDER: '注文を絞り込み',
  SEARCH_CANCEL: 'キャンセル',
  FILTER_ADD: '絞り込みを追加',
  FILTER_CLEAR_ALL: 'すべてクリア',
  FILTER_PICK_CATEGORY: '絞り込み項目を選択',
  FILTER_DONE: '完了',
  CAT_CHANNEL: '販売チャネル',
  CAT_SRR: 'SRR発行ステータス',
  CAT_NFC: 'NFC発送ステータス',
  CAT_DATE: '購入日',
  DATE_TODAY: '今日',
  DATE_7D: '過去7日間',
  DATE_30D: '過去30日間',
  DATE_90D: '過去90日',
  DATE_12M: '過去12か月',
  DATE_CUSTOM: 'カスタム',
  DATE_CLEAR: 'クリア',
  DATE_FROM: '開始日',
  DATE_TO: '終了日',
  NO_VALUE: '未選択',
  chipEdit: (category: string) => `${category}の条件を変更`,
  chipRemove: (category: string) => `${category}の条件を削除`,
  ALL: 'すべて',
  RETRY: '再試行',
  RELOAD: '再読込',
  REFRESH: 'リフレッシュ',
  EMPTY_TITLE: 'SRR 対象の注文がありません',
  EMPTY_HELP: '設定手順を見る',
  EMPTY_SETTINGS: 'Startrail 設定を開く',
  NO_MATCH_TITLE: '条件に一致する注文がありません',
  SHOW_ALL_ORDERS: 'すべての注文を表示',
  selectOrder: (order: string) => `${order} を選択`,
  SELECT_ALL: '表示中のエラー注文をすべて選択',
  ONLY_ERROR_SELECTABLE: 'SRR発行エラーの注文のみ選択できます',
  CANCELLED_NOT_REISSUABLE: 'キャンセル済み注文のため再発行できません',
  /** order grain: the row count and the order count are the same number */
  summary: (orders: number) => `${orders}件の注文`,
} as const;

export const BULK = {
  SELECTED: (n: number) => `${n}件の注文を選択中`,
  ISSUE_MANUALLY: '手動で発行する',
  CLEAR_SELECTION: '選択を解除',
  NO_ERROR_ORDERS: '対象のエラー注文がありません',
  LIMIT_REACHED: (limit: number, selected: number) =>
    `一度に再発行できるのは ${limit} 件の注文までです。${selected} 件を選択しました。`,
  CONFIRM_HEADING: (n: number) => `${n}件の注文を再発行します`,
  IRREVERSIBLE: '証明書の発行はブロックチェーン上で行われ、取り消すことができません。',
  CONFIRM: '発行する',
  CANCEL: 'キャンセル',
  PROCESSING_HEADING: '発行処理中',
  PROGRESS: (done: number, total: number) => `${done} / ${total} 件の注文 完了`,
  PROCESSING_NOTE: '処理中です。しばらくお待ちください',
  RESULT_HEADING: '発行結果',
  RESULT_SUMMARY: (ok: number, ng: number) => `成功 ${ok} 件 / 失敗 ${ng} 件`,
  RESULT_COL_RESULT: '結果',
  RESULT_COL_REASON: '理由',
  CLOSE: '閉じる',
} as const;

export const SETTINGS = {
  TITLE: 'Startrail 設定',
  SECTION_LINK: 'Startrail 連携情報',
  SECTION_LOGIN: '顧客向けログイン方式',
  SECTION_HELP: 'ヘルプ',
  LUW_LABEL: 'LUW ウォレットアドレス',
  LUW_HELP: 'Startrail PORT の管理画面からコピーしてください。',
  COLLECTION_LABEL: 'コレクションアドレス',
  COLLECTION_HELP: '1 ストアにつき 1 コレクションを登録します。',
  API_KEY_LABEL: 'Startrail API キー',
  API_KEY_SAVED_HELP: '保存済みのキーは表示されません。',
  API_KEY_NEW_HELP: '保存時に Startrail への接続テストを行います。',
  API_KEY_CHANGE: '変更する',
  API_KEY_CANCEL: 'キャンセル',
  LOGIN_HELP: 'ストアフロントの Startrail ログイン画面で、購入者に表示されるログイン方式です。1 つ以上を有効にしてください。',
  PROVIDER_GOOGLE: 'Google アカウント',
  PROVIDER_GOOGLE_HELP: 'Google アカウントでのログインを許可します。',
  PROVIDER_EMAIL: 'メールアドレス（パスワードなし）',
  PROVIDER_EMAIL_HELP: 'メールに届くリンクでログインします。',
  PROVIDER_EMAIL_PASSWORD: 'メールアドレス（パスワード）',
  PROVIDER_EMAIL_PASSWORD_HELP: 'メールアドレスとパスワードでログインします。',
  PROVIDER_APPLE: 'Apple ID',
  PROVIDER_APPLE_HELP: 'Apple ID でログインします。',
  PROVIDER_LINE: 'LINE',
  PROVIDER_LINE_HELP: 'LINE アカウントでログインします。',
  PROVIDER_FACEBOOK: 'Facebook',
  PROVIDER_FACEBOOK_HELP: 'Facebook アカウントでログインします。',
  PROVIDER_TWITTER: 'X（旧 Twitter）',
  PROVIDER_TWITTER_HELP: 'X アカウントでログインします。',
  HELP_WHERE: 'LUW ウォレットアドレスとコレクションアドレスは Startrail PORT の「Organization」ページ、API キーは「Developer」ページで確認できます。',
  HELP_SCOPE: '変更した設定は、これ以降に発行される SRR にのみ適用されます。発行済みの SRR は変更されません。',
} as const;

// Status vocabularies. tone values are Polaris semantic tokens - never raw colors.
// DD-P2-003 BR-03: read from the order-level SRR:* tag; 'missing' = the order carries no tag.
export const SRR_STATUS = {
  requested: { label: 'SRR発行依頼済み', tone: 'info' },
  issued: { label: 'SRR発行済み', tone: 'success' },
  error: { label: 'SRR発行エラー', tone: 'critical' },
  missing: { label: 'ー', tone: 'caution' },
} as const;

// DD-P2-003 BR-04: read from the order-level NFC:* tag.
export const NFC_STATUS = {
  unsent: { label: '未発送', tone: 'caution' },
  preparing: { label: '準備中', tone: 'info' },
  sent: { label: '発送済み', tone: 'success' },
  missing: { label: 'ー', tone: 'caution' },
} as const;

export const CHANNEL_STATUS = {
  EC: { label: 'ECサイト', tone: 'info' },
  POS: { label: 'POS', tone: 'auto' },
} as const;

export type SrrStatus = keyof typeof SRR_STATUS;
export type NfcStatus = keyof typeof NFC_STATUS;
