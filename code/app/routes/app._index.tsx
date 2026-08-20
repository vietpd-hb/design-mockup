import { useEffect, useMemo, useRef, useState } from 'react';
import { useLoaderData, useOutletContext } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { SRR_CONFIG } from '../config/srr';
import {
  BULK, CHANNEL_STATUS, EC_ISSUE, EC_LIST, LIST, MSG, NFC_STATUS, SRR_STATUS,
} from '../i18n/messages.ja';
import { MOCK_ORDERS, type OrderRow } from '../mocks/orders';

/**
 * SCR-P2-01  order list (Index table composition)
 * SCR-P2-01.a bulk manual SRR reissue layer (same screen)
 * SCR-P2-01.b per-order issue result (step 3 of the same modal)
 *
 * GRAIN: one row = one ORDER (item count shown as a column, rows are NOT split per product/unit).
 * Diverges from DD-P2-003 BR-02 ("1 row = 1 product", ref BF-012 BR-002) - pending doc update.
 * Phase 1 mints per order all-or-nothing and the SRR:* / NFC:* tags are order-level data, so
 * per-unit rows would repeat every status column without carrying extra information.
 *
 * TBD-02 (DD-P2-003): tiêu chí hiển thị đang là giả định, chưa chốt - the list currently shows
 * only orders that contain an SRR-eligible product.
 *
 * The app has no detail screen: 注文番号 and 詳細 always deep-link to Shopify admin in a new tab.
 */

/** Flip these in the loader to exercise each documented state. */
type ListState =
  | 'ok' | 'loading' | 'emptyNoTarget' | 'loadFailed' | 'rateLimit' | 'stale' | 'pageDrift';

export async function loader({ request }: LoaderFunctionArgs) {
  const state = (new URL(request.url).searchParams.get('state') ?? 'ok') as ListState;
  return {
    state,
    orders: state === 'emptyNoTarget' ? [] : MOCK_ORDERS,
    portUrl: SRR_CONFIG.STARTRAIL_PORT_URL,
    today: new Date().toISOString().slice(0, 10),
  };
}

type Outcome = keyof typeof OUTCOMES;
const OUTCOMES = {
  ok: { tone: 'success', label: SRR_STATUS.issued.label, reason: '' },
  noWallet: { tone: 'critical', label: '失敗', reason: EC_ISSUE.EC_02_NO_WALLET },
  noChip: { tone: 'critical', label: '失敗', reason: EC_ISSUE.EC_03_NO_CHIP },
  rejected: { tone: 'critical', label: '失敗', reason: EC_ISSUE.EC_04_REJECTED },
  timeout: { tone: 'warning', label: '再試行', reason: EC_ISSUE.EC_05_TIMEOUT },
  skipped: { tone: 'info', label: 'スキップ', reason: EC_ISSUE.EC_06_SKIPPED },
  mailFailed: { tone: 'warning', label: '要確認', reason: EC_ISSUE.EC_08_MAIL_FAILED },
  cancelled: { tone: 'caution', label: '対象外', reason: EC_ISSUE.EC_09_CANCELLED },
} as const;

/** VL-01 - only orders whose SRR status is SRR発行エラー can be selected, cancelled ones never. */
const isSelectable = (o: OrderRow) => o.srr === 'error' && !o.orderCancelled;

type TabKey = 'all' | 'issued' | 'requested' | 'error';
const TABS: Array<[TabKey, string]> = [
  ['all', LIST.TAB_ALL], ['requested', LIST.TAB_REQUESTED], ['issued', LIST.TAB_ISSUED], ['error', LIST.TAB_ERROR],
];

type CatKey = 'channel' | 'srr' | 'nfc' | 'date';
type Cat = { key: CatKey; label: string; multi: boolean; options: Array<[string, string]> };
const CATS: Cat[] = [
  { key: 'channel', label: LIST.CAT_CHANNEL, multi: true, options: [['EC', CHANNEL_STATUS.EC.label], ['POS', CHANNEL_STATUS.POS.label]] },
  // TBD-10 (DD-P2-003): chưa chốt cách lọc dòng thiếu tag - no dedicated option for ー yet.
  { key: 'srr', label: LIST.CAT_SRR, multi: true, options: [['issued', SRR_STATUS.issued.label], ['requested', SRR_STATUS.requested.label], ['error', SRR_STATUS.error.label]] },
  { key: 'nfc', label: LIST.CAT_NFC, multi: true, options: [['unsent', NFC_STATUS.unsent.label], ['preparing', NFC_STATUS.preparing.label], ['sent', NFC_STATUS.sent.label]] },
  {
    key: 'date', label: LIST.CAT_DATE, multi: false,
    options: [['today', LIST.DATE_TODAY], ['7d', LIST.DATE_7D], ['30d', LIST.DATE_30D], ['90d', LIST.DATE_90D], ['12m', LIST.DATE_12M], ['custom', LIST.DATE_CUSTOM], ['', LIST.DATE_CLEAR]],
  },
];
const DATE_DAYS: Record<string, number> = { today: 0, '7d': 6, '30d': 29, '90d': 89, '12m': 364 };

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function OrderListRoute() {
  const { state, orders, portUrl, today } = useLoaderData<typeof loader>();
  const { scopeGranted } = useOutletContext<{ scopeGranted: boolean }>();

  // Status tabs are their own filter layer: they surface a chip but すべてクリア leaves them alone.
  const [tab, setTab] = useState<TabKey>('all');
  const [filters, setFilters] = useState<{ channel: string[]; srr: string[]; nfc: string[]; date: string }>({
    channel: [], srr: [], nfc: [], date: '',
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchOpen, setSearchOpen] = useState(false); // collapsed to a search icon by default
  const [addOpen, setAddOpen] = useState(false); // 絞り込みを追加 category menu
  const [openCat, setOpenCat] = useState<CatKey | 'tab' | ''>(''); // value menu of one category
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<Array<{ order: string; outcome: Outcome }>>([]);
  const [popupBlocked, setPopupBlocked] = useState(false); // EC-10
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // clicking anywhere outside the filter icon / its dropdown closes the dropdown
  useEffect(() => {
    if (!addOpen && !openCat) return;
    const onOutside = (e: MouseEvent) => {
      const path = e.composedPath();
      if (filterMenuRef.current && path.includes(filterMenuRef.current)) return;
      setAddOpen(false); setOpenCat('');
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [addOpen, openCat]);

  const dateRange = useMemo<[string, string] | null>(() => {
    if (!filters.date) return null;
    if (filters.date === 'custom') return [dateFrom || '0000-00-00', dateTo || '9999-99-99'];
    return [shiftDate(today, DATE_DAYS[filters.date] ?? 0), today];
  }, [filters.date, dateFrom, dateTo, today]);

  // Order grain: every filter is an order-level attribute, so it matches whole orders.
  const matched = useMemo(() => orders.filter((o) => {
    if (tab !== 'all' && o.srr !== tab) return false;
    if (filters.channel.length && !filters.channel.includes(o.channel)) return false;
    if (filters.srr.length && !filters.srr.includes(o.srr)) return false;
    if (filters.nfc.length && !filters.nfc.includes(o.nfc)) return false;
    if (dateRange && (o.date < dateRange[0] || o.date > dateRange[1])) return false;
    const q = query.trim().toLowerCase();
    // DEC-03 - order no. / customer / email / product name / SKU / artist, OR-ed then AND-ed.
    if (q.length >= SRR_CONFIG.SEARCH_MIN_CHARS && !o.searchText.includes(q)) return false;
    return true;
  }), [orders, tab, filters, dateRange, query]);

  // Fixed 50 orders per page = 50 rows per page.
  const pageCount = Math.max(1, Math.ceil(matched.length / SRR_CONFIG.ORDERS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = matched.slice(
    safePage * SRR_CONFIG.ORDERS_PER_PAGE,
    safePage * SRR_CONFIG.ORDERS_PER_PAGE + SRR_CONFIG.ORDERS_PER_PAGE,
  );

  const selectedKeys = Object.keys(selected);
  const overLimit = selectedKeys.length > SRR_CONFIG.BULK_ISSUE_LIMIT;
  const selectableOnPage = rows.filter(isSelectable);
  const pending = orders.filter((o) => selected[o.key]);

  const resetPaging = () => { setPage(0); setSelected({}); };

  /** renamed from フィルタ解除: clears chips + search, never the status tab */
  const clearAll = () => {
    setFilters({ channel: [], srr: [], nfc: [], date: '' });
    setDateFrom(''); setDateTo(''); setQuery(''); setAddOpen(false); setOpenCat('');
    resetPaging();
  };

  const onSearch = (value: string) => { // DEC-03 debounce
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setQuery(value); resetPaging(); }, SRR_CONFIG.SEARCH_DEBOUNCE_MS);
  };

  const toggleValue = (cat: CatKey, value: string, on: boolean) => {
    setFilters((prev) => {
      if (cat === 'date') return { ...prev, date: value };
      const cur = prev[cat];
      return { ...prev, [cat]: on ? [...cur, value] : cur.filter((v) => v !== value) };
    });
    resetPaging();
  };

  const toggleAll = (on: boolean) => {
    if (!on) return setSelected({});
    const next: Record<string, boolean> = {};
    selectableOnPage.slice(0, SRR_CONFIG.BULK_ISSUE_LIMIT).forEach((o) => { next[o.key] = true; });
    setSelected(next);
  };

  const toggleRow = (key: string, on: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (on) next[key] = true; else delete next[key];
      return next;
    });
  };

  // DEC-04 / EC-10 - always a new tab, with a manual fallback when it is blocked.
  const openExternal = (url: string) => {
    const win = window.open(url, '_blank', 'noopener');
    if (!win) setPopupBlocked(true);
  };

  const runBulk = async () => {
    setStep(2); setDone(0);
    const out: Array<{ order: string; outcome: Outcome }> = [];
    for (let i = 0; i < pending.length; i += 1) {
      const o = pending[i];
      // Replace with the real action call; one whole order is retried per iteration.
      out.push({ order: o.order, outcome: o.orderCancelled ? 'cancelled' : 'ok' });
      setDone(i + 1);
    }
    setResults(out);
    setStep(3);
  };

  // Filter-bar tokens: one per active filter category, plus one for a non-default
  // status tab. A single dropdown under the bar shows either the category list or
  // the values of the token being edited.
  type Chip = {
    key: string; category: string; field: string; values: string;
    onOpen: () => void; onRemove: () => void;
  };
  const chips: Chip[] = [];
  if (tab !== 'all') {
    chips.push({
      key: 'tab',
      category: LIST.CAT_SRR,
      field: `${LIST.CAT_SRR} は`,
      values: TABS.find(([k]) => k === tab)![1],
      onOpen: () => { setOpenCat(openCat === 'tab' ? '' : 'tab'); setAddOpen(false); },
      onRemove: () => { setTab('all'); setOpenCat(''); resetPaging(); },
    });
  }
  CATS.forEach((c) => {
    const active = c.multi ? filters[c.key as 'channel' | 'srr' | 'nfc'].length > 0 : !!filters.date;
    // a category picked from 絞り込みを追加 gets its chip immediately, values still empty
    if (!active && openCat !== c.key) return;
    let value = '';
    if (!active) {
      value = '';
    } else if (c.multi) {
      value = filters[c.key as 'channel' | 'srr' | 'nfc']
        .map((v) => c.options.find(([k]) => k === v)?.[1] ?? v).join('、');
    } else if (filters.date === 'custom') {
      value = `${dateFrom}〜${dateTo}`;
    } else {
      value = c.options.find(([k]) => k === filters.date)?.[1] ?? filters.date;
    }
    chips.push({
      key: c.key,
      category: c.label,
      field: `${c.label} は`,
      values: value || LIST.NO_VALUE,
      onOpen: () => { setOpenCat(openCat === c.key ? '' : c.key); setAddOpen(false); },
      onRemove: () => {
        setFilters((prev) => (c.multi ? { ...prev, [c.key]: [] } : { ...prev, date: '' }));
        setOpenCat(''); resetPaging();
      },
    });
  });
  const valueMenu: Cat | null = openCat === 'tab'
    ? { key: 'srr', label: LIST.CAT_SRR, multi: true, options: TABS.filter(([k]) => k !== 'all') as Array<[string, string]> }
    : CATS.find((c) => c.key === openCat) ?? null;

  const modalHeading =
    step === 3 ? BULK.RESULT_HEADING
      : step === 2 ? BULK.PROCESSING_HEADING
        : BULK.CONFIRM_HEADING(selectedKeys.length);

  return (
    <s-page heading={LIST.TITLE}>
      {/* DEC-05a - exactly one page-level PORT button, fixed app config URL */}
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={!portUrl}
        onClick={() => openExternal(portUrl)}
      >
        {LIST.OPEN_PORT}
        {!portUrl && <s-tooltip>{LIST.PORT_NOT_CONFIGURED}</s-tooltip>}
      </s-button>

      {state === 'loadFailed' && (
        <s-banner tone="critical" heading={EC_LIST.EC_01_LOAD_FAILED}>
          <s-button slot="primary-action" variant="secondary" onClick={() => location.reload()}>{LIST.RETRY}</s-button>
        </s-banner>
      )}
      {state === 'rateLimit' && (
        <s-banner tone="warning" heading={EC_LIST.EC_07_RATE_LIMIT}>
          <s-button slot="primary-action" variant="secondary" onClick={() => location.reload()}>{LIST.RETRY}</s-button>
        </s-banner>
      )}
      {state === 'stale' && (
        <s-banner tone="info" dismissible heading={EC_LIST.EC_09_STALE}>
          <s-button slot="primary-action" variant="secondary" onClick={() => location.reload()}>{LIST.RELOAD}</s-button>
        </s-banner>
      )}
      {state === 'pageDrift' && (
        <s-banner tone="info" heading={EC_LIST.EC_08_PAGE_DRIFT}>
          <s-button slot="primary-action" variant="secondary" onClick={() => location.reload()}>{LIST.REFRESH}</s-button>
        </s-banner>
      )}
      {popupBlocked && (
        <s-banner tone="warning" heading={EC_LIST.EC_10_POPUP_BLOCKED}>
          <s-link slot="primary-action" href={portUrl} target="_blank">{portUrl}</s-link>
        </s-banner>
      )}
      {overLimit && (
        <s-banner tone="info" heading={BULK.LIMIT_REACHED(SRR_CONFIG.BULK_ISSUE_LIMIT, selectedKeys.length)}></s-banner>
      )}

      <s-paragraph color="subdued">{LIST.SUBTITLE}</s-paragraph>

      {state === 'loading' && (
        <s-section>
          <s-stack direction="block" gap="base" alignItems="center">
            <s-spinner accessibilityLabel={LIST.TITLE}></s-spinner>
          </s-stack>
        </s-section>
      )}

      {/* EC-02 - nothing in scope for SRR */}
      {state === 'emptyNoTarget' && (
        <s-section>
          <s-stack direction="block" gap="base" alignItems="center">
            <s-heading>{LIST.EMPTY_TITLE}</s-heading>
            <s-paragraph color="subdued">{EC_LIST.EC_02_NO_TARGET}</s-paragraph>
            <s-stack direction="inline" gap="small-200">
              <s-button variant="secondary" onClick={() => openExternal(portUrl)}>{LIST.EMPTY_HELP}</s-button>
              <s-button variant="primary" href="/app/settings">{LIST.EMPTY_SETTINGS}</s-button>
            </s-stack>
          </s-stack>
        </s-section>
      )}

      {state !== 'loading' && state !== 'emptyNoTarget' && state !== 'loadFailed' && (
        <s-section padding="none">
          <s-table
            paginate
            hasPreviousPage={safePage > 0}
            hasNextPage={safePage < pageCount - 1}
            onNextpage={() => { setPage(safePage + 1); setSelected({}); }}
            onPreviouspage={() => { setPage(safePage - 1); setSelected({}); }}
          >
            <s-stack slot="filters" direction="block" gap="small-300">
              {/* SCR-P2-01.a - the bulk bar replaces the WHOLE filter block (tabs + search + chips) */}
              {selectedKeys.length > 0 ? (
                <s-box padding="small" background="strong" borderRadius="base">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-text fontWeight="bold">{BULK.SELECTED(selectedKeys.length)}</s-text>
                    <s-button
                      variant="secondary"
                      disabled={overLimit || !scopeGranted}
                      onClick={() => setStep(1)}
                    >
                      {BULK.ISSUE_MANUALLY}
                      {!scopeGranted && <s-tooltip>{MSG.MSG_07_LOCKED_TOOLTIP}</s-tooltip>}
                      {overLimit && <s-tooltip>{BULK.LIMIT_REACHED(SRR_CONFIG.BULK_ISSUE_LIMIT, selectedKeys.length)}</s-tooltip>}
                    </s-button>
                    <s-button variant="tertiary" onClick={() => setSelected({})}>{BULK.CLEAR_SELECTION}</s-button>
                  </s-stack>
                </s-box>
              ) : (
                <s-stack direction="block" gap="small-300">
                  {/* 1. status tabs - visible only while the search bar is collapsed */}
                  {!searchOpen && (
                    <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="center">
                      <s-stack direction="inline" gap="small-200" alignItems="center">
                        {TABS.map(([key, label]) => (
                          <s-clickable-chip
                            key={key}
                            selected={tab === key}
                            onClick={() => { setTab(key); setOpenCat(''); resetPaging(); }}
                          >
                            {label}
                          </s-clickable-chip>
                        ))}
                      </s-stack>
                      {/* 2. collapsed search icon */}
                      <s-button
                        variant="tertiary"
                        icon="search"
                        accessibilityLabel={LIST.SEARCH_OPEN}
                        onClick={() => { setSearchOpen(true); setAddOpen(true); setOpenCat(''); }}
                      ></s-button>
                    </s-grid>
                  )}

                  {/* 3. search field + filter icon on one row; the icon owns the dropdown */}
                  {searchOpen && (
                    <s-stack direction="block" gap="small-300">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div ref={filterMenuRef} style={{ position: 'relative', display: 'inline-flex' }}>
                          <s-button
                            variant="tertiary"
                            icon="filter"
                            accessibilityLabel={LIST.FILTER_ADD}
                            onClick={() => {
                              if (addOpen || openCat) { setAddOpen(false); setOpenCat(''); return; }
                              setAddOpen(true); setOpenCat('');
                            }}
                          ></s-button>

                          {/* one dropdown: category list, or the values of the token being edited */}
                          {(addOpen || !!valueMenu) && (
                            <div style={{ position: 'absolute', insetBlockStart: '100%', insetInlineStart: 0, zIndex: 20, minInlineSize: '300px', paddingBlockStart: '4px' }}>
                              <s-box padding="small-300" background="base" borderRadius="base" borderWidth="base" borderColor="base" maxBlockSize="320px" overflow="auto">
                                <s-stack direction="block" gap="small-400">
                                  {valueMenu && (
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-label={LIST.FILTER_PICK_CATEGORY}
                                      onClick={() => { setAddOpen(true); setOpenCat(''); }}
                                      style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                      <s-text color="subdued">{'‹ '}{LIST.FILTER_PICK_CATEGORY}</s-text>
                                    </div>
                                  )}
                                  {!valueMenu && (
                                    <s-stack direction="block" gap="none">
                                      {CATS.map((c) => (
                                        <s-clickable
                                          key={c.key}
                                          padding="small-300"
                                          onClick={() => { setOpenCat(c.key); setAddOpen(false); }}
                                        >
                                          <s-text>{c.label}</s-text>
                                        </s-clickable>
                                      ))}
                                    </s-stack>
                                  )}

                                  {valueMenu && (
                                    <s-stack direction="block" gap="small-400">
                                      {valueMenu.multi ? (
                                        <s-stack direction="block" gap="small-400">
                                          {valueMenu.options.map(([value, label]) => (
                                            <s-checkbox
                                              key={value}
                                              label={label}
                                              checked={openCat === 'tab' ? tab === value : filters[valueMenu.key as 'channel' | 'srr' | 'nfc'].includes(value)}
                                              onChange={(e: any) => {
                                                if (openCat === 'tab') { setTab(value as TabKey); resetPaging(); return; }
                                                toggleValue(valueMenu.key, value, e.target.checked);
                                              }}
                                            ></s-checkbox>
                                          ))}
                                        </s-stack>
                                      ) : (
                                        // 購入日 is single-choice; s-select is the single-choice control in Polaris web components.
                                        <s-stack direction="block" gap="small-300">
                                          <s-select
                                            label={LIST.CAT_DATE}
                                            labelAccessibilityVisibility="exclusive"
                                            value={filters.date}
                                            onChange={(e: any) => toggleValue('date', e.target.value, true)}
                                          >
                                            {valueMenu.options.map(([value, label]) => (
                                              <s-option key={value} value={value}>{label}</s-option>
                                            ))}
                                          </s-select>
                                          {filters.date === 'custom' && (
                                            <s-grid gridTemplateColumns="1fr 1fr" gap="small-300">
                                              <s-date-field label={LIST.DATE_FROM} value={dateFrom} onChange={(e: any) => { setDateFrom(e.target.value); resetPaging(); }}></s-date-field>
                                              <s-date-field label={LIST.DATE_TO} value={dateTo} onChange={(e: any) => { setDateTo(e.target.value); resetPaging(); }}></s-date-field>
                                            </s-grid>
                                          )}
                                        </s-stack>
                                      )}
                                    </s-stack>
                                  )}
                                </s-stack>
                              </s-box>
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minInlineSize: '200px' }}>
                          <s-search-field
                            label={LIST.SEARCH_OPEN}
                            labelAccessibilityVisibility="exclusive"
                            placeholder={LIST.SEARCH_PLACEHOLDER}
                            onInput={(e: any) => onSearch(e.target.value)}
                          ></s-search-field>
                        </div>
                        <s-button variant="tertiary" onClick={() => { setSearchOpen(false); setQuery(''); setAddOpen(false); setOpenCat(''); resetPaging(); }}>
                          {LIST.SEARCH_CANCEL}
                        </s-button>
                        {/* すべてクリア only appears once something is actually filtered */}
                        {(chips.length > 0 || query.trim().length > 0) && (
                          <s-button variant="tertiary" onClick={clearAll}>{LIST.FILTER_CLEAR_ALL}</s-button>
                        )}
                      </div>

                      {/* selected conditions sit under the search field: grey "field は" pill + highlighted values */}
                      {chips.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                          {chips.map((c) => (
                            <div key={c.key} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={LIST.chipEdit(c.category)}
                                onClick={c.onOpen}
                                style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}
                              >
                                <s-box padding="small-500" background="subdued" borderRadius="base">
                                  <s-text color="subdued">{c.field}</s-text>
                                </s-box>
                                <s-badge tone="info">{c.values}</s-badge>
                              </div>
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={LIST.chipRemove(c.category)}
                                onClick={c.onRemove}
                                style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                              >
                                <s-text color="subdued">✕</s-text>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </s-stack>
                  )}

                  <s-text color="subdued">{LIST.summary(matched.length)}</s-text>
                </s-stack>
              )}
            </s-stack>

            {/* Nine data columns in this order, plus the selection cell. 作家名 dropped per review. */}
            <s-table-header-row>
              <s-table-header>
                <s-checkbox
                  accessibilityLabel={LIST.SELECT_ALL}
                  checked={selectedKeys.length > 0 && selectableOnPage.every((o) => selected[o.key])}
                  indeterminate={selectedKeys.length > 0 && !selectableOnPage.every((o) => selected[o.key])}
                  disabled={selectableOnPage.length === 0}
                  onChange={(e: any) => toggleAll(e.target.checked)}
                ></s-checkbox>
              </s-table-header>
              <s-table-header listSlot="primary"><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_ORDER}</div></s-table-header>
              <s-table-header><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_ITEM_COUNT}</div></s-table-header>
              <s-table-header><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_DATE}</div></s-table-header>
              <s-table-header><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_CHANNEL}</div></s-table-header>
              <s-table-header><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_CUSTOMER}</div></s-table-header>
              <s-table-header><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_EMAIL}</div></s-table-header>
              <s-table-header listSlot="secondary"><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_SRR}</div></s-table-header>
              <s-table-header listSlot="labeled"><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_NFC}</div></s-table-header>
              <s-table-header><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_DETAIL}</div></s-table-header>
            </s-table-header-row>

            <s-table-body>
              {rows.map((o) => {
                const locked = !isSelectable(o);
                return (
                  <s-table-row key={o.key}>
                    <s-table-cell>
                      {/* Polaris limitation: a tooltip cannot be a child of s-checkbox, so the
                          locked reason travels in the accessibility label instead. */}
                      <s-checkbox
                        accessibilityLabel={
                          locked
                            ? (o.orderCancelled ? LIST.CANCELLED_NOT_REISSUABLE : LIST.ONLY_ERROR_SELECTABLE)
                            : LIST.selectOrder(o.order)
                        }
                        checked={!!selected[o.key]}
                        disabled={locked}
                        onChange={(e: any) => toggleRow(o.key, e.target.checked)}
                      ></s-checkbox>
                    </s-table-cell>
                    <s-table-cell>
                      <s-link href={o.orderUrl} target="_blank">{o.order}</s-link>
                    </s-table-cell>
                    <s-table-cell><s-text format="numeric">{LIST.itemCount(o.itemCount)}</s-text></s-table-cell>
                    <s-table-cell>
                      <div style={{ whiteSpace: 'nowrap' }}><s-text>{o.date}</s-text></div>
                    </s-table-cell>
                    <s-table-cell><s-badge tone={CHANNEL_STATUS[o.channel].tone}>{CHANNEL_STATUS[o.channel].label}</s-badge></s-table-cell>
                    <s-table-cell>
                      {/* keep the name on one line instead of one character per line */}
                      <div style={{ whiteSpace: 'nowrap' }}><s-text>{o.customer}</s-text></div>
                    </s-table-cell>
                    <s-table-cell>
                      {/* cap the email column so the table fits the page width */}
                      <div style={{ maxInlineSize: '170px', overflowWrap: 'anywhere' }}>
                        <s-text color="subdued">{o.customerEmail}</s-text>
                      </div>
                    </s-table-cell>
                    {/* orders without a tag stay in the list, shown as ー */}
                    <s-table-cell><s-badge tone={SRR_STATUS[o.srr].tone}>{SRR_STATUS[o.srr].label}</s-badge></s-table-cell>
                    {/*
                      TBD-06 (DD-P2-006) / TBD-11 (DD-P2-003): NFC status is per Chip UID and staff may update rows
                      individually, so one order can hold mixed NFC states. The order-level NFC:* tag can only carry one
                      value - the badge shown here may not represent every chip of the order. Rule not yet decided.
                    */}
                    <s-table-cell><s-badge tone={NFC_STATUS[o.nfc].tone}>{NFC_STATUS[o.nfc].label}</s-badge></s-table-cell>
                    <s-table-cell>
                      {/* icon-only keeps the table inside the page width */}
                      <s-button
                        variant="tertiary"
                        icon="chevron-right"
                        href={o.orderUrl}
                        target="_blank"
                        accessibilityLabel={LIST.detailLabel(o.order)}
                      ></s-button>
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>

          {/* EC-04 - empty state, whatever emptied the table */}
          {rows.length === 0 && (
            <s-box padding="large-400">
              <s-stack direction="block" gap="base" alignItems="center">
                <s-heading>{LIST.NO_MATCH_TITLE}</s-heading>
                <s-paragraph color="subdued">{EC_LIST.EC_04_NO_MATCH}</s-paragraph>
                <s-stack direction="inline" gap="small-200">
                  {(chips.length > 0 || query.trim().length > 0) && (
                    <s-button variant="secondary" onClick={clearAll}>{LIST.FILTER_CLEAR_ALL}</s-button>
                  )}
                  {tab !== 'all' && (
                    <s-button variant="tertiary" onClick={() => { setTab('all'); setOpenCat(''); setAddOpen(false); resetPaging(); }}>
                      {LIST.SHOW_ALL_ORDERS}
                    </s-button>
                  )}
                </s-stack>
              </s-stack>
            </s-box>
          )}
        </s-section>
      )}

      {/* DEC-09 - ONE modal, three steps. Never a second overlay or a new page. */}
      <s-modal id="bulk-issue-modal" heading={modalHeading} open={step > 0}>
        {step === 1 && (
          <>
            <s-banner tone="warning" heading={BULK.IRREVERSIBLE}></s-banner>
            <s-stack direction="block" gap="small-200">
              {pending.map((o) => (
                <s-stack key={o.key} direction="inline" gap="small-200" alignItems="center">
                  <s-text fontWeight="bold">{o.order}</s-text>
                  <s-text color="subdued">{LIST.itemCount(o.itemCount)}</s-text>
                </s-stack>
              ))}
            </s-stack>
            <s-button slot="primary-action" variant="primary" onClick={runBulk}>{BULK.CONFIRM}</s-button>
            <s-button slot="secondary-actions" onClick={() => setStep(0)}>{BULK.CANCEL}</s-button>
          </>
        )}

        {step === 2 && (
          <>
            {/* No abort control: the mint has already left, a 中止 button would lie. */}
            <s-stack direction="block" gap="base" alignItems="center">
              <s-spinner accessibilityLabel={BULK.PROCESSING_HEADING}></s-spinner>
              <s-text fontWeight="bold">{BULK.PROGRESS(done, pending.length)}</s-text>
              <s-text color="subdued">{BULK.PROCESSING_NOTE}</s-text>
            </s-stack>
            <s-button slot="primary-action" variant="primary" disabled loading>{BULK.CONFIRM}</s-button>
            <s-button slot="secondary-actions" disabled>{BULK.CANCEL}</s-button>
          </>
        )}

        {/* SCR-P2-01.b - one result row per ORDER inside the same modal */}
        {step === 3 && (
          <>
            <s-text fontWeight="bold">
              {BULK.RESULT_SUMMARY(
                results.filter((x) => OUTCOMES[x.outcome].tone === 'success').length,
                results.filter((x) => OUTCOMES[x.outcome].tone !== 'success').length,
              )}
            </s-text>
            <s-table>
              <s-table-header-row>
                <s-table-header listSlot="primary"><div style={{ whiteSpace: 'nowrap' }}>{LIST.COL_ORDER}</div></s-table-header>
                <s-table-header listSlot="secondary">{BULK.RESULT_COL_RESULT}</s-table-header>
                <s-table-header listSlot="labeled">{BULK.RESULT_COL_REASON}</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {results.map((x) => (
                  <s-table-row key={x.order}>
                    <s-table-cell><s-text fontWeight="bold">{x.order}</s-text></s-table-cell>
                    <s-table-cell><s-badge tone={OUTCOMES[x.outcome].tone}>{OUTCOMES[x.outcome].label}</s-badge></s-table-cell>
                    <s-table-cell><s-text color="subdued">{OUTCOMES[x.outcome].reason}</s-text></s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
            <s-button slot="primary-action" variant="primary" onClick={() => { setStep(0); setSelected({}); }}>{BULK.CLOSE}</s-button>
          </>
        )}
      </s-modal>
    </s-page>
  );
}
