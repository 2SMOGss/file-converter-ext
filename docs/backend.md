# Backend Documentation
## File Converter Chrome Extension Processing Engine

### Architecture Overview
Since this is a Chrome extension, the "backend" consists of client-side JavaScript processing across multiple contexts:

```
Extension Architecture:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │ Background SW   │    │ Processing Tab  │
│   (Interface)   │◄──►│ (Coordinator)   │◄──►│ (Heavy Lifting) │
│                 │    │                 │    │                 │
│ - File selection│    │ - Tab management│    │ - Image processing│
│ - Settings UI   │    │ - Message relay │    │ - Format conversion│
│ - Progress view │    │ - Storage mgmt  │    │ - Batch operations│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Processing Engine Framework
- **Core Technology**: Canvas API + Vanilla JavaScript
- **Image Processing**: HTML5 Canvas with 2D Context
- **File Handling**: File API + FileReader
- **Format Support**: JPEG, PNG, Windows system assets
- **Memory Management**: Progressive processing to avoid crashes

### Processing Tab Implementation

#### Tab Structure
```
processing-tab/
├── processor.html          # Hidden processing page
├── processor.js           # Main processing logic
├── canvas-engine.js       # Image manipulation engine  
├── format-converter.js    # Format conversion utilities
├── batch-manager.js       # Queue and batch processing
└── quality-controller.js  # DPI and compression handling
```

#### Core Processing Engine

```javascript
// canvas-engine.js - Core image processing
class ImageProcessor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  async processImage(file, options) {
    // Load image to canvas
    // Apply transformations (resize, format, quality)
    // Return processed blob
  }

  resizeImage(canvas, targetWidth, targetHeight, maintainAspect) {
    // Canvas resize logic with aspect ratio handling
  }

  convertFormat(canvas, outputFormat, quality) {
    // Canvas toBlob with format and quality options
  }
}
```

### File Format Support

#### Input Formats
```javascript
const supportedInputs = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/octet-stream': [''], // Windows system assets (no extension)
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'], // Future enhancement
  'image/webp': ['.webp'] // Future enhancement
};
```

#### Output Formats
```javascript
const supportedOutputs = {
  'image/jpeg': { mimeType: 'image/jpeg', extension: '.jpg' },
  'image/png': { mimeType: 'image/png', extension: '.png' }
};
```

### Professional Print Presets

```javascript
const printPresets = {
  'print-quality': { width: 4500, height: 5400, dpi: 300, name: 'Print Quality' },
  'high-quality': { width: 3000, height: 3600, dpi: 300, name: 'High Quality' },
  'standard-print': { width: 2400, height: 3000, dpi: 300, name: 'Standard Print' },
  'web-preview': { width: 1800, height: 2400, dpi: 72, name: 'Web Preview' },
  'custom': { width: null, height: null, dpi: 300, name: 'Custom Size' }
};
```

### Windows System Asset Detection

```javascript
// Auto-detect Windows system assets
class SystemAssetDetector {
  detectAssetFile(file) {
    // Check file path patterns
    const assetPaths = [
      'ContentDeliveryManager',
      'LocalState\\Assets',
      'Microsoft.Windows'
    ];
    
    // Check file characteristics
    const isSystemAsset = 
      !file.name.includes('.') && // No extension
      file.size > 100000 && // Reasonable image size
      file.type === 'application/octet-stream';
      
    return isSystemAsset;
  }
}
```

### Batch Processing Manager

```javascript
class BatchProcessor {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentIndex = 0;
  }

  async processBatch(files, options) {
    this.queue = files.map(file => ({ file, options, status: 'pending' }));
    
    for (let i = 0; i < this.queue.length; i++) {
      await this.processItem(i);
      this.updateProgress(i + 1, this.queue.length);
    }
  }

  async processItem(index) {
    const item = this.queue[index];
    try {
      item.status = 'processing';
      const result = await this.imageProcessor.processImage(item.file, item.options);
      item.result = result;
      item.status = 'completed';
    } catch (error) {
      item.error = error;
      item.status = 'failed';
    }
  }
}
```

### Quality & DPI Control

```javascript
class QualityController {
  applyQualitySettings(canvas, format, quality, dpi) {
    // Set canvas resolution for DPI
    const scaleFactor = dpi / 72; // 72 is default web DPI
    
    // Apply compression quality
    const options = {
      quality: quality / 100, // Convert percentage to decimal
      type: format
    };
    
    return canvas.toBlob(callback, format, options.quality);
  }
}
```

### Chrome Extension APIs Used

```javascript
// Required permissions in manifest.json
const requiredPermissions = [
  'storage',      // Save user preferences
  'downloads',    // Save converted files
  'tabs',         // Create processing tab
  'activeTab'     // Access current tab if needed
];

// Chrome API usage
chrome.tabs.create({ url: 'processor.html', active: false });
chrome.downloads.download({ url: blobUrl, filename: outputName });
chrome.storage.local.set({ userPreferences: settings });
```

### Development Considerations

#### File Size Limitations
- Chrome extension file processing: ~200MB practical limit
- Canvas memory: Depends on image dimensions
- Batch processing: Queue management to prevent crashes

#### Browser Compatibility
- Canvas API: Universal support
- File API: Modern browsers only
- Blob URLs: Standard support
- Chrome Extensions: Chrome/Chromium only

#### Testing Strategy
- Unit tests for processing functions
- Integration tests for file workflows
- Performance tests with large files
- Error scenario testing
