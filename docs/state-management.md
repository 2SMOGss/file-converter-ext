# State Management Documentation
## File Converter Chrome Extension

### State Architecture Overview
The extension uses a hybrid approach with three types of state management:

```
State Management Architecture:
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Storage API                     │
│                   (Persistent Settings)                    │
├─────────────────────────────────────────────────────────────┤
│  • User Preferences    • Default Save Location             │
│  • Quality Settings    • T-Shirt Presets                   │
│  • DPI Preferences     • UI Theme                          │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup State   │    │ Background SW   │    │Processing State │
│   (Session)     │◄──►│  (Coordinator)  │◄──►│   (Temporary)   │
│                 │    │                 │    │                 │
│• File Queue     │    │• Message Relay  │    │• Current Batch  │
│• UI State       │    │• Storage Manager│    │• Progress Data  │
│• Progress View  │    │• Tab Management │    │• Error Handling │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Chrome Storage API Implementation

#### Storage Schema
```javascript
// chrome.storage.local structure
const StorageSchema = {
  userPreferences: {
    defaultSaveLocation: string,        // User's preferred save folder
    defaultQuality: number,             // 1-100 quality setting
    defaultDPI: number,                 // 72, 150, 300, 600
    defaultOutputFormat: string,        // 'jpeg' | 'png'
    maintainAspectRatio: boolean,       // Default aspect ratio setting
    selectedTshirtPreset: string,       // 'print-quality' | 'high-quality' etc.
    batchProcessing: boolean,           // Enable batch by default
    showProgress: boolean,              // Show detailed progress
    autoDetectAssets: boolean,          // Auto-detect Windows assets
    theme: string                       // 'light' | 'dark' | 'auto'
  },
  conversionHistory: {
    totalConversions: number,           // Track usage stats
    lastUsed: timestamp,                // Last extension use
    favoritePresets: array,             // Most used presets
    recentSaveLocations: array          // Recent save folders
  },
  customPresets: [
    {
      name: string,                     // User-defined preset name
      width: number,                    // Custom width
      height: number,                   // Custom height
      dpi: number,                      // Custom DPI
      quality: number                   // Custom quality
    }
  ]
};
```

#### Storage Manager Class
```javascript
class StorageManager {
  constructor() {
    this.defaultSettings = {
      userPreferences: {
        defaultSaveLocation: 'downloads',
        defaultQuality: 80,
        defaultDPI: 300,
        defaultOutputFormat: 'jpeg',
        maintainAspectRatio: true,
        selectedTshirtPreset: 'print-quality',
        batchProcessing: true,
        showProgress: true,
        autoDetectAssets: true,
        theme: 'light'
      }
    };
  }

  async initializeStorage() {
    const result = await chrome.storage.local.get(['userPreferences']);
    if (!result.userPreferences) {
      await chrome.storage.local.set(this.defaultSettings);
    }
    return this.getSettings();
  }

  async getSettings() {
    const result = await chrome.storage.local.get(null);
    return { ...this.defaultSettings, ...result };
  }

  async updateSetting(key, value) {
    const current = await this.getSettings();
    const updated = {
      ...current.userPreferences,
      [key]: value
    };
    await chrome.storage.local.set({ userPreferences: updated });
    return updated;
  }
}
```

### Message Passing System

#### Message Types
```javascript
const MessageTypes = {
  // Settings Management
  GET_SETTINGS: 'get_settings',
  UPDATE_SETTING: 'update_setting',
  SAVE_PRESET: 'save_preset',
  
  // File Processing
  START_CONVERSION: 'start_conversion',
  CONVERSION_PROGRESS: 'conversion_progress',
  CONVERSION_COMPLETE: 'conversion_complete',
  CONVERSION_ERROR: 'conversion_error',
  
  // UI State
  UPDATE_UI_STATE: 'update_ui_state',
  SHOW_PROGRESS: 'show_progress',
  HIDE_PROGRESS: 'hide_progress',
  
  // File Management
  SELECT_SAVE_FOLDER: 'select_save_folder',
  VALIDATE_FILES: 'validate_files',
  CLEAR_QUEUE: 'clear_queue'
};
```

### Performance Considerations

- **Debounced Saves**: Prevent excessive storage API calls
- **Lazy Loading**: Load settings only when needed
- **Memory Management**: Clear temporary state after processing
- **Storage Cleanup**: Automatic cleanup of old data
- **Message Batching**: Combine multiple updates into single messages
