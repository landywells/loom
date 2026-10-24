#[cfg(desktop)]
mod app_menu {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
    use tauri::{AppHandle, Manager, Runtime};

    /// Menu ids are forwarded to the web layer as a `loom:menu` event, so menu
    /// clicks and their accelerators drive the same code as UI buttons.
    const MENU_NEW: &str = "new";
    const MENU_SEARCH: &str = "search";
    const MENU_IMPORT: &str = "import";
    const MENU_EXPORT: &str = "export";
    const MENU_THEME: &str = "theme";
    const MENU_SHORTCUTS: &str = "shortcuts";
    const MENU_ABOUT: &str = "about";

    pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
        let new_entry =
            MenuItem::with_id(app, MENU_NEW, "New entry…", true, Some("CmdOrCtrl+N"))?;
        let search =
            MenuItem::with_id(app, MENU_SEARCH, "Quick find…", true, Some("CmdOrCtrl+K"))?;
        let import =
            MenuItem::with_id(app, MENU_IMPORT, "Import library…", true, Some("CmdOrCtrl+I"))?;
        let export =
            MenuItem::with_id(app, MENU_EXPORT, "Export library", true, Some("CmdOrCtrl+E"))?;
        let theme = MenuItem::with_id(
            app,
            MENU_THEME,
            "Toggle light / dark",
            true,
            Some("CmdOrCtrl+Shift+L"),
        )?;
        let shortcuts = MenuItem::with_id(
            app,
            MENU_SHORTCUTS,
            "Keyboard shortcuts",
            true,
            Some("CmdOrCtrl+/"),
        )?;
        let about = MenuItem::with_id(app, MENU_ABOUT, "About Loom", true, None::<&str>)?;

        let overview = MenuItem::with_id(app, "goto:overview", "Overview", true, Some("Alt+1"))?;
        let library = MenuItem::with_id(app, "goto:library", "Library", true, Some("Alt+2"))?;
        let discover = MenuItem::with_id(app, "goto:discover", "Discover", true, Some("Alt+3"))?;
        let collections =
            MenuItem::with_id(app, "goto:collections", "Collections", true, Some("Alt+4"))?;
        let insights = MenuItem::with_id(app, "goto:insights", "Insights", true, Some("Alt+5"))?;

        let after_find = PredefinedMenuItem::separator(app)?;
        let after_export = PredefinedMenuItem::separator(app)?;
        let after_theme = PredefinedMenuItem::separator(app)?;
        let close = PredefinedMenuItem::close_window(app, Some("Close Loom"))?;
        let minimize = PredefinedMenuItem::minimize(app, Some("Minimize"))?;
        let fullscreen = PredefinedMenuItem::fullscreen(app, Some("Full Screen"))?;

        let file = Submenu::with_items(
            app,
            "File",
            true,
            &[
                &new_entry,
                &search,
                &after_find,
                &import,
                &export,
                &after_export,
                &close,
            ],
        )?;
        let view = Submenu::with_items(app, "View", true, &[&theme, &after_theme, &shortcuts])?;
        let go = Submenu::with_items(
            app,
            "Go to",
            true,
            &[&overview, &library, &discover, &collections, &insights],
        )?;
        let window = Submenu::with_items(app, "Window", true, &[&minimize, &fullscreen])?;
        let help = Submenu::with_items(app, "Help", true, &[&about])?;

        Menu::with_items(app, &[&file, &view, &go, &window, &help])
    }
}

#[cfg(desktop)]
use tauri::{Emitter, LogicalSize, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // The phone shell gets notifications and external links; everything else
    // below needs a window, a menu bar, or a second instance to refuse.
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(desktop)]
    {
        builder = builder
            // Opening a second copy should just focus the window you already have.
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }))
            .plugin(
                tauri_plugin_window_state::Builder::default()
                    // Size is deliberately not restored: a window remembered
                    // from a larger monitor lands off this one's screen, and it
                    // comes back after setup has already run.
                    .with_state_flags(
                        tauri_plugin_window_state::StateFlags::POSITION
                            | tauri_plugin_window_state::StateFlags::MAXIMIZED
                            | tauri_plugin_window_state::StateFlags::FULLSCREEN,
                    )
                    .with_filename("loom.window-state.json")
                    .build(),
            )
            .setup(|app| {
                let handle = app.handle().clone();
                app.set_menu(app_menu::build(&handle)?)?;

                // The configured size does not fit a 1080p screen at 125%
                // scaling, and the part that hangs off the bottom is exactly
                // where the drawer's Edit button lives. Clamp in logical units:
                // physical pixels get re-rounded and the window ends up taller.
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(Some(monitor)) = window.current_monitor() {
                        let scale = monitor.scale_factor();
                        let work = monitor.work_area().size.to_logical::<f64>(scale);
                        let inner = window
                            .inner_size()
                            .map(|size| size.to_logical::<f64>(scale))
                            .unwrap_or(work);
                        if inner.width > work.width || inner.height > work.height {
                            let _ = window.set_size(LogicalSize::new(
                                inner.width.min(work.width),
                                inner.height.min(work.height),
                            ));
                            let _ = window.center();
                        }
                    }
                }
                Ok(())
            })
            .on_menu_event(|app_handle, event| {
                let _ = app_handle.emit("loom:menu", event.id().as_ref().to_string());
            });
    }

    builder
        .run(tauri::generate_context!())
        .expect("Loom failed to start");
}
