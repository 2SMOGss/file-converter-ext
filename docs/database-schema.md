# Database Schema Documentation
## Chrome Storage Structure for File Converter Extension

### Overview
Since this is a Chrome extension, we use **Chrome Storage API** instead of a traditional database. The storage is structured as JSON objects with defined schemas for consistency and performance.

### Storage Limits & Performance
```javascript
const StorageLimits = {
  totalQuota: 5242880,        // 5MB total storage
  maxItems: 512,              // Maximum number of items
  maxItemSize: 8192,          // 8KB per item
  practical: {
    userSettings: '< 1KB',     // Tiny footprint
    conversionHistory: '< 50KB', // Even with 1000 conversions
    customPresets: '< 10KB',   // User-defined presets
    totalUsage: '< 100KB'      // Well under quota
  }
};
```

### Primary Storage Schema

#### 1. User Preferences Object
```javascript
// Key: "userPreferences"
const UserPreferencesSchema = {
  // File Conversion Settings
  defaultOutputFormat: {
    type: 'string',
    enum: ['jpeg', 'png'],
    default: 'jpeg',
    description: 'Default output format for conversions'
  },
  
  defaultQuality: {
    type: 'integer',
    min: 1,
    max: 100,
    default: 80,
    description: 'JPEG quality setting (1-100%)'
  },
  
  defaultDPI: {
    type: 'integer',
    enum: [72, 150, 300, 600],
    default: 300,
    description: 'Default DPI for professional printing'
  },
  
  // Professional Print Settings
  selectedPrintPreset: {
    type: 'string',
    enum: ['print-quality', 'high-quality', 'standard-print', 'web-preview', 'custom'],
    default: 'print-quality',
    description: 'Default professional print preset'
  },
  
  maintainAspectRatio: {
    type: 'boolean',
    default: true,
    description: 'Preserve image proportions when resizing'
  },
  
  customDimensions: {
    type: 'object',
    properties: {
      width: { type: 'integer', min: 100, max: 10000 },
      height: { type: 'integer', min: 100, max: 10000 },
      enabled: { type: 'boolean', default: false }
    },
    description: 'User-defined custom dimensions'
  },
  
  // File Management Settings
  defaultSaveLocation: {
    type: 'string',
    default: 'downloads',
    description: 'Default folder for saving converted files'
  },
  
  batchProcessing: {
    type: 'boolean',
    default: true,
    description: 'Enable batch processing by default'
  },
  
  autoDetectAssets: {
    type: 'boolean',
    default: true,
    description: 'Auto-detect Windows system assets'
  }
};

// Example stored object
const exampleUserPreferences = {
  defaultOutputFormat: 'jpeg',
  defaultQuality: 80,
  defaultDPI: 300,
  selectedPrintPreset: 'print-quality',
  maintainAspectRatio: true,
  customDimensions: { width: 4500, height: 5400, enabled: false },
  defaultSaveLocation: 'C:\\Users\\Username\\Downloads\\Designs',
  batchProcessing: true,
  autoDetectAssets: true,
  
  // Auto-generated metadata
  _version: '1.0',
  _created: 1703123456789,
  _lastModified: 1703234567890
};
```

#### 2. Professional Print Presets Collection
```javascript
// Key: "printPresets"
const PrintPresetsSchema = {
  // Built-in presets (read-only)
  builtin: {
    'print-quality': {
      name: 'Print Quality',
      width: 4500,
      height: 5400,
      dpi: 300,
      description: 'High-resolution for professional printing',
      readonly: true,
      category: 'print'
    },
    'high-quality': {
      name: 'High Quality',
      width: 3000,
      height: 3600,
      dpi: 300,
      description: 'Good quality for most print applications',
      readonly: true,
      category: 'print'
    },
    'standard-print': {
      name: 'Standard Print',
      width: 2400,
      height: 3000,
      dpi: 300,
      description: 'Standard resolution for basic printing',
      readonly: true,
      category: 'print'
    },
    'web-preview': {
      name: 'Web Preview',
      width: 1800,
      height: 2400,
      dpi: 72,
      description: 'Optimized for web display and previews',
      readonly: true,
      category: 'web'
    }
  },
  
  // User-defined presets (editable)
  custom: [
    {
      id: 'uuid-string',
      name: 'My Custom Size',
      width: 3500,
      height: 4200,
      dpi: 300,
      description: 'Custom size for specific printer',
      category: 'custom',
      created: 1703123456789,
      lastUsed: 1703234567890,
      usageCount: 15
    }
  ]
};
```

#### 3. Conversion History Log
```javascript
// Key: "conversionHistory"
const ConversionHistorySchema = {
  // Summary statistics
  summary: {
    totalConversions: {
      type: 'integer',
      default: 0,
      description: 'Total number of files converted'
    },
    totalTimeSaved: {
      type: 'integer',
      default: 0,
      description: 'Estimated time saved in seconds'
    },
    favoriteFormat: {
      type: 'string',
      description: 'Most commonly used output format'
    },
    favoritePreset: {
      type: 'string',
      description: 'Most commonly used t-shirt preset'
    },
    lastUsed: {
      type: 'integer',
      description: 'Timestamp of last extension use'
    }
  },
  
  // Recent conversion sessions (keep last 50)
  recentSessions: [
    {
      sessionId: 'uuid-string',
      timestamp: 1703123456789,
      filesProcessed: 5,
      inputFormats: ['system-asset', 'jpeg', 'png'],
      outputFormat: 'jpeg',
      preset: 'print-quality',
      totalSize: 12582912,        // Bytes processed
      processingTime: 45,         // Seconds
      success: true,
      errors: []
    }
  ],
  
  // File processing statistics
  formatStats: {
    'system-asset': { converted: 150, success: 148, failed: 2 },
    'jpeg': { converted: 89, success: 89, failed: 0 },
    'png': { converted: 67, success: 65, failed: 2 }
  }
};
```

#### 4. System Asset Cache
```javascript
// Key: "systemAssetCache"
const SystemAssetCacheSchema = {
  // Windows asset detection cache
  detectedPaths: [
    {
      path: 'C:\\Users\\Username\\AppData\\Local\\Packages\\Microsoft.Windows.ContentDeliveryManager_cw5n1h2txyewy\\LocalState\\Assets',
      lastScanned: 1703123456789,
      fileCount: 47,
      totalSize: 156782345,
      accessible: true
    }
  ],
  
  // Known asset files (to avoid re-scanning)
  knownAssets: [
    {
      filename: 'img0_1920x1080_123456789',
      path: 'full-file-path',
      size: 2456789,
      lastModified: 1703023456789,
      converted: false,
      hash: 'sha256-hash'      // To detect file changes
    }
  ],
  
  // Cache settings
  settings: {
    cacheExpiry: 86400000,     // 24 hours in milliseconds
    maxCacheSize: 1000,       // Maximum cached asset entries
    autoCleanup: true
  }
};
```

### Storage Operations & Performance

#### Storage Manager Implementation
```javascript
class StorageManager {
  constructor() {
    this.cache = new Map();    // In-memory cache for frequent reads
  }

  // Optimized read with caching
  async getSettings() {
    if (this.cache.has('userPreferences')) {
      return this.cache.get('userPreferences');
    }
    
    const result = await chrome.storage.local.get(['userPreferences']);
    const settings = result.userPreferences || this.getDefaultSettings();
    
    this.cache.set('userPreferences', settings);
    return settings;
  }

  // Batch write operations for performance
  async updateMultiple(updates) {
    // Clear relevant cache entries
    Object.keys(updates).forEach(key => this.cache.delete(key));
    
    // Single storage API call for multiple updates
    await chrome.storage.local.set(updates);
    
    return updates;
  }

  // Cleanup old data to manage storage quota
  async cleanupOldData() {
    const history = await chrome.storage.local.get(['conversionHistory']);
    
    if (history.conversionHistory?.recentSessions?.length > 50) {
      // Keep only last 50 sessions
      history.conversionHistory.recentSessions = 
        history.conversionHistory.recentSessions.slice(-50);
      
      await chrome.storage.local.set(history);
    }
  }
}
```

### Performance Optimization

#### Storage Quota Management
```javascript
class QuotaManager {
  async checkQuota() {
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES;
    const percentUsed = (usage / quota) * 100;
    
    return {
      used: usage,
      available: quota - usage,
      percentUsed: percentUsed,
      needsCleanup: percentUsed > 80
    };
  }
  
  async optimizeStorage() {
    if ((await this.checkQuota()).needsCleanup) {
      // Remove old conversion history
      await this.cleanupConversionHistory();
      
      // Clear system asset cache
      await this.clearAssetCache();
    }
  }
}
```

### Schema Summary

**Total Storage Usage**: < 100KB (well under 5MB quota)  
**Performance**: In-memory caching for frequent reads  
**Scalability**: Automatic cleanup prevents quota issues  
**Reliability**: Data validation and migration support  
**Privacy**: All data stored locally in Chrome  

This schema efficiently stores all user preferences, conversion history, and t-shirt design presets while maintaining excellent performance for your 2-4 week development timeline.
