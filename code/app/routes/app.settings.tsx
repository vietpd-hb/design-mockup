import { useState } from 'react';
import { useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { ADDRESS_PATTERN, SRR_CONFIG } from '../config/srr';
import { EC_SETTINGS, SETTINGS } from '../i18n/messages.ja';

/**
 * SCR-P2-02 - Startrail settings (Polaris Settings template).
 * Saving is all-or-nothing: if the connection test fails, the login-method
 * toggles are not persisted either, and the banner says so.
 */

type SaveState =
  | 'idle' | 'saving' | 'success'
  | 'invalidKey'      // EC-02
  | 'noResponse'      // EC-03
  | 'dbFailed'        // EC-04
  | 'collectionRetest'; // EC-10

type Provider = { key: string; label: string; help: string; enabled: boolean };

// Settings are read from / written to the APP DATABASE per tenant
// (luwAddress / collectionAddress / apiKey / loginMethods[]) - NOT Shopify metafields.
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const configured = url.searchParams.get('configured') !== '0';
  return {
    saveState: (url.searchParams.get('save') ?? 'idle') as SaveState,
    luw: configured ? '0x8f2a41c7b9de0356a1c4f8e27b6d0913ca45ef82' : '',
    collection: configured ? '0x3ac59d1e77b0428fa6d95c31e0847b26df915ac0' : '',
    // Never send the real key to the client - only the masked tail (DEC-10).
    apiKeyMask: configured ? '••••••••••••1234' : '',
    hasApiKey: configured,
    // DEC-11 - rendered from data; also the Phase 1 fallback list.
    // TBD-03 (DD-P2-002): danh sách provider hiện hardcode theo storefront hiện tại,
    // chờ chốt danh sách chính thức.
    providers: [
      { key: 'google', label: SETTINGS.PROVIDER_GOOGLE, help: SETTINGS.PROVIDER_GOOGLE_HELP, enabled: true },
      { key: 'email_passwordless', label: SETTINGS.PROVIDER_EMAIL, help: SETTINGS.PROVIDER_EMAIL_HELP, enabled: true },
      { key: 'email_password', label: SETTINGS.PROVIDER_EMAIL_PASSWORD, help: SETTINGS.PROVIDER_EMAIL_PASSWORD_HELP, enabled: false },
      { key: 'apple', label: SETTINGS.PROVIDER_APPLE, help: SETTINGS.PROVIDER_APPLE_HELP, enabled: false },
      { key: 'line', label: SETTINGS.PROVIDER_LINE, help: SETTINGS.PROVIDER_LINE_HELP, enabled: false },
      { key: 'facebook', label: SETTINGS.PROVIDER_FACEBOOK, help: SETTINGS.PROVIDER_FACEBOOK_HELP, enabled: false },
      { key: 'twitter', label: SETTINGS.PROVIDER_TWITTER, help: SETTINGS.PROVIDER_TWITTER_HELP, enabled: false },
    ] as Provider[],
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const apiKeyChanged = form.get('apiKeyChanged') === '1';
  const collectionChanged = form.get('collectionChanged') === '1';
  // DEC-12 - test the connection when EITHER changed; skip only when neither did.
  // TBD-02 (DD-P2-002): mức xác thực của test kết nối (key-scoped hay collection-scoped)
  // chưa chốt, đang chọn theo hướng an toàn.
  const mustTest = apiKeyChanged || collectionChanged;
  if (mustTest) { /* await testStartrailConnection(...) */ }
  return null;
}

export default function SettingsRoute() {
  const data = useLoaderData<typeof loader>();
  const [luw, setLuw] = useState(data.luw);
  const [collection, setCollection] = useState(data.collection);
  const [keyEditing, setKeyEditing] = useState(!data.hasApiKey); // DEC-10 state A vs B
  const [providers, setProviders] = useState<Provider[]>(data.providers);
  const saveState = data.saveState;

  const saving = saveState === 'saving';
  const luwError = luw && !ADDRESS_PATTERN.test(luw) ? EC_SETTINGS.LUW_FORMAT : '';
  const collectionError = collection && !ADDRESS_PATTERN.test(collection) ? EC_SETTINGS.COLLECTION_FORMAT : '';
  const anyProvider = providers.some((p) => p.enabled);
  const collectionChanged = collection !== data.collection;

  const setProvider = (key: string, enabled: boolean) =>
    setProviders((prev) => prev.map((p) => (p.key === key ? { ...p, enabled } : p)));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (luwError || collectionError || !anyProvider) return; // blocks the save
    // submit(...) - the Save Bar owns the save/discard affordance
  };

  const onReset = (e: React.FormEvent) => {
    e.preventDefault();
    setLuw(data.luw); setCollection(data.collection);
    setProviders(data.providers); setKeyEditing(!data.hasApiKey);
  };

  return (
    // Save Bar API: Shopify renders the save/discard bar as soon as the form is dirty.
    <form data-save-bar data-discard-confirmation onSubmit={onSubmit} onReset={onReset}>
      {/* TBD-06 (DD-P2-002): cơ chế xác định apiKeyChanged đang là giả định thiết kế, chưa chốt chính thức */}
      <input type="hidden" name="apiKeyChanged" value={keyEditing ? '1' : '0'} />
      <input type="hidden" name="collectionChanged" value={collectionChanged ? '1' : '0'} />

      <s-page heading={SETTINGS.TITLE} inlineSize="small">
        {/* state 5 - saved */}
        {saveState === 'success' && (
          <s-banner tone="success" dismissible heading={EC_SETTINGS.SAVED}></s-banner>
        )}
        {/* state 6 - EC-02 invalid API key, nothing persisted */}
        {saveState === 'invalidKey' && (
          <s-banner tone="critical" heading={EC_SETTINGS.EC_02_INVALID_KEY}>
            {EC_SETTINGS.LOGIN_NOT_SAVED}
          </s-banner>
        )}
        {/* state 7 - EC-03 Startrail unreachable */}
        {saveState === 'noResponse' && (
          <s-banner tone="warning" heading={EC_SETTINGS.EC_03_NO_RESPONSE}>
            {EC_SETTINGS.LOGIN_NOT_SAVED}
          </s-banner>
        )}
        {/* state 8 - EC-04 persistence failed, previous config kept */}
        {saveState === 'dbFailed' && (
          <s-banner tone="critical" heading={EC_SETTINGS.EC_04_DB_FAILED}>
            {EC_SETTINGS.LOGIN_NOT_SAVED}
          </s-banner>
        )}
        {/* state 9 - EC-10 / DEC-12 collection changed, key unchanged */}
        {(saveState === 'collectionRetest' || (collectionChanged && !keyEditing)) && (
          <s-banner tone="info" heading={EC_SETTINGS.EC_10_COLLECTION_CHANGED}></s-banner>
        )}
        {/* blocks the save until at least one provider is on */}
        {!anyProvider && (
          <s-banner tone="critical" heading={EC_SETTINGS.NEED_ONE_PROVIDER}></s-banner>
        )}

        <s-section heading={SETTINGS.SECTION_LINK}>
          <s-stack direction="block" gap="base">
            {/* IT-1-01 */}
            <s-text-field
              label={SETTINGS.LUW_LABEL}
              required
              value={luw}
              error={luwError}
              disabled={saving}
              details={SETTINGS.LUW_HELP}
              onInput={(e: any) => setLuw(e.target.value)}
            ></s-text-field>

            {/* IT-1-02 - exactly one collection per merchant */}
            <s-text-field
              label={SETTINGS.COLLECTION_LABEL}
              required
              value={collection}
              error={collectionError}
              disabled={saving}
              details={SETTINGS.COLLECTION_HELP}
              onInput={(e: any) => setCollection(e.target.value)}
            ></s-text-field>

            {/* IT-1-03 / DEC-10 - masked value + explicit 変更する, never an editable mask */}
            {!keyEditing ? (
              <s-stack direction="inline" gap="small-200" alignItems="end">
                <s-text-field
                  label={SETTINGS.API_KEY_LABEL}
                  readOnly
                  value={data.apiKeyMask}
                  details={SETTINGS.API_KEY_SAVED_HELP}
                ></s-text-field>
                <s-button variant="secondary" disabled={saving} onClick={() => setKeyEditing(true)}>
                  {SETTINGS.API_KEY_CHANGE}
                </s-button>
              </s-stack>
            ) : (
              <s-stack direction="inline" gap="small-200" alignItems="end">
                <s-password-field
                  label={SETTINGS.API_KEY_LABEL}
                  name="apiKey"
                  required
                  autoComplete="off"
                  disabled={saving}
                  details={SETTINGS.API_KEY_NEW_HELP}
                ></s-password-field>
                {data.hasApiKey && (
                  <s-button variant="tertiary" disabled={saving} onClick={() => setKeyEditing(false)}>
                    {SETTINGS.API_KEY_CANCEL}
                  </s-button>
                )}
              </s-stack>
            )}
          </s-stack>
        </s-section>

        <s-section heading={SETTINGS.SECTION_LOGIN}>
          <s-stack direction="block" gap="base">
            <s-paragraph color="subdued">{SETTINGS.LOGIN_HELP}</s-paragraph>
            {providers.map((p) => (
              <s-switch
                key={p.key}
                label={p.label}
                details={p.help}
                checked={p.enabled}
                disabled={saving}
                onChange={(e: any) => setProvider(p.key, e.target.checked)}
              ></s-switch>
            ))}
          </s-stack>
        </s-section>

        <s-section heading={SETTINGS.SECTION_HELP}>
          <s-stack direction="block" gap="small-300">
            <s-paragraph>{SETTINGS.HELP_WHERE}</s-paragraph>
            <s-paragraph color="subdued">{SETTINGS.HELP_SCOPE}</s-paragraph>
            <s-link href={SRR_CONFIG.STARTRAIL_PORT_URL} target="_blank">
              Startrail PORT
            </s-link>
          </s-stack>
        </s-section>
      </s-page>
    </form>
  );
}
