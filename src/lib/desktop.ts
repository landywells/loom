/**
 * Thin bridge to the Tauri shell. Every call is guarded so the same build also
 * runs fine as an ordinary website — the browser simply gets no-ops.
 */

type DesktopWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
  __TAURI_EVENT_PLUGIN_INTERNALS__?: unknown;
};

export const isDesktop =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in (window as DesktopWindow);

/**
 * Mobile shells (the Android build) also expose `__TAURI_INTERNALS__`, but the
 * OS owns their chrome — drawing minimize/close buttons there would be a lie.
 */
export const hasWindowChrome =
  isDesktop && !/android|iphone|ipad|ipod/i.test(navigator.userAgent);

async function windowApi() {
  if (!isDesktop) return null;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export async function minimizeWindow() {
  await (await windowApi())?.minimize();
}

export async function toggleMaximize() {
  await (await windowApi())?.toggleMaximize();
}

export async function closeWindow() {
  await (await windowApi())?.close();
}

export async function isMaximized(): Promise<boolean> {
  const win = await windowApi();
  return win ? win.isMaximized() : false;
}

/** Fires whenever the window changes size, so the maximize button can stay honest. */
export async function onWindowResize(callback: () => void) {
  if (!isDesktop) return () => {};
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const unlisten = await getCurrentWindow().onResized(callback);
  return unlisten;
}

/** Keeps native popups — select menus, scrollbars — in step with the app theme. */
export async function setWindowTheme(theme: 'light' | 'dark') {
  const win = await windowApi();
  // Linux and older WebView2 builds ignore theming; the app looks right regardless.
  await win?.setTheme(theme).catch(() => win?.setTheme(null));
}

/** Native OS notification — used when an action happens out of sight. */
export async function notify(title: string, body: string) {
  if (!isDesktop) return;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      '@tauri-apps/plugin-notification'
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === 'granted';
    }
    if (granted) sendNotification({ title, body });
  } catch {
    // Notifications are a nicety; never let them break a save.
  }
}

export type MenuCommand =
  | 'new'
  | 'search'
  | 'import'
  | 'export'
  | 'theme'
  | 'shortcuts'
  | 'about'
  | `goto:${string}`;

/** Subscribes to the native menu bar. Returns an unsubscribe function. */
export async function onMenuCommand(handler: (command: MenuCommand) => void) {
  if (!isDesktop) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<string>('loom:menu', (event) => {
    handler(event.payload as MenuCommand);
  });
  return unlisten;
}
