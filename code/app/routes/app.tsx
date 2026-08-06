import { Outlet, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { MSG, NAV } from '../i18n/messages.ja';

/**
 * SCR-P2-00 - App shell: App Bridge nav + global status banners.
 * Shopify owns the shop-domain form, the OAuth consent screen and the callback,
 * so none of those are built here.
 */

type ShellBanner = 'none' | 'MSG-01' | 'MSG-03' | 'MSG-05' | 'MSG-07';

export async function loader({ request }: LoaderFunctionArgs) {
  // Mock switch: the real loader derives this from session-token auth + scope state.
  const banner = (new URL(request.url).searchParams.get('banner') ?? 'none') as ShellBanner;
  return {
    banner,
    // DEC-13 - a missing optional scope locks controls, it never hides them.
    scopeGranted: banner !== 'MSG-07',
  };
}

export default function AppLayout() {
  const { banner, scopeGranted } = useLoaderData<typeof loader>();

  const requestScopes = () => {
    // App Bridge scopes API (allowed JS surface).
    shopify.scopes.request(['write_orders']);
  };

  return (
    <>
      {/* App Bridge navigation - single level, no nesting */}
      <s-app-nav>
        <s-link href="/app" rel="home">{NAV.HOME}</s-link>
        <s-link href="/app/settings">{NAV.SETTINGS}</s-link>
      </s-app-nav>

      {/* MSG-01 - first launch after install */}
      {banner === 'MSG-01' && (
        <s-banner tone="success" dismissible heading={MSG.MSG_01}></s-banner>
      )}
      {/* MSG-03 - session token validation failed */}
      {banner === 'MSG-03' && (
        <s-banner tone="critical" heading={MSG.MSG_03}></s-banner>
      )}
      {/* MSG-05 - transient infrastructure error while fetching the token */}
      {banner === 'MSG-05' && (
        <s-banner tone="warning" dismissible heading={MSG.MSG_05}></s-banner>
      )}
      {/* MSG-07 / DEC-13 - scope denied: persistent, not dismissible, one unlock action */}
      {!scopeGranted && (
        <s-banner tone="warning" heading={MSG.MSG_07}>
          <s-button slot="primary-action" variant="primary" onClick={requestScopes}>
            {MSG.MSG_07_ACTION}
          </s-button>
        </s-banner>
      )}

      <Outlet context={{ scopeGranted }} />
    </>
  );
}
