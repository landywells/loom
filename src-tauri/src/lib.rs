use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager};

/// Menu ids are forwarded to the web layer as a `loom:menu` event, so menu
/// clicks and their keyboard accelerators drive the same code as UI buttons.
const MENU_NEW: &str = "new";
const MENU_SEARCH: &str = "search";
const MENU_IMPORT: &str = "import";
const MENU_EXPORT: &str = "export";
const MENU_THEME: &str = "theme";
const MENU_SHORTCUTS: &str = "shortcuts";
const MENU_ABOUT: &str = "about";
const GOTO: &str = "goto:";

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<AppHandle>> {
    let new_entry = MenuItem::with_id(app, MENU_NEW, "New entry…", true, Some("CmdOrCtrl+N"))?;
    let search = MenuItem::with_id(app, MENU_SEARCH, "Quick find…", true, Some("CmdOrCtrl+K"))?;
    let import = MenuItem::with_id(app, MENU_IMPORT, "Import library…", true, Some("CmdOrCtrl+I"))?;
    let export = MenuItem::with_id(app, MENU_EXPORT, "Export library", true, Some("CmdOrCtrl+E"))?;
    let theme = MenuItem::with_id(
        app,
        MENU_THEME,
        "Toggle light / dark",
        true,
        Some("CmdOrCtrl+Shift+L"),
    )?;
    let shortcuts =
        MenuItem::with_id(app, MENU_SHORTCUTS, "Keyboard shortcuts", true, Some("CmdOrCtrl+/"))?;
    let about = MenuItem::with_id(app, MENU_ABOUT, "About Loom", true, None::<&str>)?;

    let overview = MenuItem::with_id(app, format!("{GOTO}overview"), "Overview", true, Some("Alt+1"))?;
    let library = MenuItem::with_id(app, format!("{GOTO}library"), "Library", true, Some("Alt+2"))?;
    let discover = MenuItem::with_id(app, format!("{GOTO}discover"), "Discover", true, Some("Alt+3"))?;
    let collections =
        MenuItem::with_id(app, format!("{GOTO}collections"), "Collections", true, Some("Alt+4"))?;
    let insights = MenuItem::with_id(app, format!("{GOTO}insights"), "Insights", true, Some("Alt+5"))?;

    let sep = PredefinedMenuItem::separator(app)?;
    let close = PredefinedMenuItem::close_window(app, Some("Close Loom"))?;
    let minimize = PredefinedMenuItem::minimize(app, Some("Minimize"))?;
    let fullscreen = PredefinedMenuItem::fullscreen(app, Some("Full Screen"))?;

    let file = Submenu::with_items(app, "File", true, &[&new_entry, &search, &sep, &import, &export, &sep, &close])?;
    let view = Submenu::with_items(app, "View", true, &[&theme, &sep, &shortcuts])?;
    let go = Submenu::with_items(app, "Go to", true, &[&overview, &library, &discover, &collections, &insights])?;
    let window = Submenu::with_items(app, "Window", true, &[&minimize, &fullscreen])?;
    let help = Submenu::with_items(app, "Help", true, &[&about])?;

    Menu::with_items(app, &[&file, &view, &go, &window, &help])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Opening a second copy should just focus the window you already have.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let handle = app.handle().clone();
            app.set_menu(build_menu(&handle)?)?;

            app.on_menu_event(move |app_handle, event| {
                let _ = app_handle.emit("loom:menu", event.id().as_ref().to_string());
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Loom failed to start");
}
