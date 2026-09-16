use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::{Manager, State};

#[derive(Default, Serialize, Deserialize, Clone)]
struct AppSettings {
    theme: Option<String>,
    language: Option<String>,
    daily_goal: Option<i32>,
}

#[derive(Default)]
struct SettingsStore {
    settings: Mutex<AppSettings>,
}

#[tauri::command]
fn get_settings(store: State<'_, SettingsStore>) -> AppSettings {
    store.settings.lock().unwrap().clone()
}

#[tauri::command]
fn set_settings(
    store: State<'_, SettingsStore>,
    app_handle: tauri::AppHandle,
    settings: AppSettings,
) -> Result<(), String> {
    *store.settings.lock().unwrap() = settings.clone();

    let path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json");

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(SettingsStore::default())
        .setup(|app| {
            // 启动时加载 settings
            let path = app
                .path()
                .app_data_dir()
                .unwrap()
                .join("settings.json");
            if let Ok(s) = fs::read_to_string(&path) {
                if let Ok(settings) = serde_json::from_str::<AppSettings>(&s) {
                    let store = app.state::<SettingsStore>();
                    *store.settings.lock().unwrap() = settings;
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_settings, set_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}