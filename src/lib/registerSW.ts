// Guarded service-worker registration. Never register in dev, iframes,
// or preview hosts, and support `?sw=off` as a kill switch.

const APP_SW_PATH = "/sw.js";

function isPreviewHost(host: string) {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "localhost"
  );
}

function inIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return url.endsWith(APP_SW_PATH);
      })
      .map((r) => r.unregister()),
  );
}

export async function registerAppSW() {
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";
  const host = window.location.hostname;
  const refused =
    !import.meta.env.PROD ||
    inIframe() ||
    isPreviewHost(host) ||
    killSwitch;

  if (refused) {
    await unregisterAppSW();
    return;
  }

  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
  } catch {
    /* ignore */
  }
}