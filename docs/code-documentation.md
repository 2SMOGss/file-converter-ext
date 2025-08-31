# Code Documentation Standards
## File Converter Chrome Extension - Documentation Guidelines

### Documentation Philosophy

#### Clear Code for 8-Year-Old Maintainability
Just as our UI should be usable by an 8-year-old, our code should be readable by developers of all experience levels. This ensures:
- **Easy onboarding** for new developers
- **Quick debugging** when issues arise
- **Simple maintenance** as features evolve
- **Knowledge transfer** between team members

#### Self-Documenting Code First
```javascript
// ❌ BAD: Unclear code that needs comments to explain
function p(f, s) {
  const c = document.createElement('canvas');
  c.width = s.w;
  c.height = s.h;
  return c.toBlob(cb => cb, f, s.q);
}

// ✅ GOOD: Self-documenting code that explains itself
function convertImageFormat(inputFile, outputSettings) {
  const canvas = createCanvasFromImage(inputFile);
  const resizedCanvas = resizeCanvas(canvas, outputSettings.dimensions);
  return convertCanvasToBlob(resizedCanvas, outputSettings.format, outputSettings.quality);
}
```

### JSDoc Standards

#### 1. Function Documentation
```javascript
/**
 * Converts an image file to a different format with optional resizing
 * 
 * @param {File} inputFile - The image file to convert (JPEG, PNG, etc.)
 * @param {Object} conversionOptions - Configuration for the conversion
 * @param {string} conversionOptions.outputFormat - Target format ('jpeg', 'png')
 * @param {number} [conversionOptions.quality=0.8] - Quality setting (0.1-1.0)
 * @param {Object} [conversionOptions.resize] - Resize settings
 * @param {number} conversionOptions.resize.width - Target width in pixels
 * @param {number} conversionOptions.resize.height - Target height in pixels
 * @param {boolean} [conversionOptions.resize.maintainAspectRatio=true] - Keep proportions
 * 
 * @returns {Promise<Blob>} The converted image as a Blob
 * 
 * @throws {Error} When input file is not a valid image
 * @throws {Error} When output format is not supported
 * 
 * @example
 * // Convert JPEG to PNG with resizing
 * const pngBlob = await convertImageFormat(jpegFile, {
 *   outputFormat: 'png',
 *   quality: 0.9,
 *   resize: { width: 4500, height: 5400, maintainAspectRatio: true }
 * });
 * 
 * @example
 * // Simple format conversion without resizing
 * const jpegBlob = await convertImageFormat(pngFile, {
 *   outputFormat: 'jpeg',
 *   quality: 0.8
 * });
 * 
 * @since 1.0.0
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API} Canvas API Documentation
 */
async function convertImageFormat(inputFile, conversionOptions) {
  // Implementation here
}
```

#### 2. Class Documentation
```javascript
/**
 * Manages image processing operations for the File Converter extension
 * 
 * This class provides a high-level interface for converting images between formats,
 * resizing images to t-shirt design specifications, and managing Canvas resources
 * efficiently to prevent memory leaks.
 * 
 * @class ImageProcessor
 * @version 1.0.0
 * 
 * @example
 * // Basic usage for t-shirt design
 * const processor = new ImageProcessor();
 * await processor.initialize();
 * 
 * const convertedImage = await processor.processImage(userFile, {
 *   preset: 'print-quality',
 *   outputFormat: 'jpeg'
 * });
 * 
 * processor.cleanup(); // Always cleanup resources
 */
class ImageProcessor {
  /**
   * Creates a new ImageProcessor instance
   * 
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.maxCanvasSize=16000000] - Maximum canvas pixels (width × height)
   * @param {boolean} [options.enableMemoryOptimization=true] - Enable automatic memory cleanup
   */
  constructor(options = {}) {
    // Implementation
  }

  /**
   * Initializes the processor and sets up required resources
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} When Canvas API is not supported
   */
  async initialize() {
    // Implementation
  }

  /**
   * Processes an image file according to the specified options
   * 
   * @async
   * @param {File} file - Input image file
   * @param {ProcessingOptions} options - Processing configuration
   * @returns {Promise<ProcessedImage>} Processed image result
   * 
   * @memberof ImageProcessor
   */
  async processImage(file, options) {
    // Implementation
  }
}
```

#### 3. Type Definitions
```javascript
/**
 * Configuration options for image processing
 * 
 * @typedef {Object} ProcessingOptions
 * @property {string} outputFormat - Target image format ('jpeg' | 'png')
 * @property {number} [quality=0.8] - Image quality (0.1-1.0)
 * @property {string} [preset] - T-shirt design preset ('print-quality' | 'high-quality' | 'standard-print' | 'web-preview')
 * @property {ResizeOptions} [resize] - Custom resize settings
 * @property {number} [dpi=300] - Target DPI for print quality
 */

/**
 * Custom resize configuration
 * 
 * @typedef {Object} ResizeOptions
 * @property {number} width - Target width in pixels
 * @property {number} height - Target height in pixels
 * @property {boolean} [maintainAspectRatio=true] - Preserve image proportions
 */

/**
 * Result of image processing operation
 * 
 * @typedef {Object} ProcessedImage
 * @property {Blob} blob - Processed image data
 * @property {string} format - Final image format
 * @property {number} width - Final image width
 * @property {number} height - Final image height
 * @property {number} fileSize - Final file size in bytes
 * @property {number} processingTime - Time taken to process (milliseconds)
 */

/**
 * T-shirt design preset specifications
 * 
 * @typedef {Object} TshirtPreset
 * @property {string} name - Display name of the preset
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 * @property {number} dpi - Recommended DPI setting
 * @property {string} category - Preset category ('print' | 'web')
 * @property {string} description - User-friendly description
 */
```

### Inline Comments Standards

#### 1. Algorithm Explanations
```javascript
function calculateOptimalDimensions(originalWidth, originalHeight, targetWidth, targetHeight, maintainAspectRatio) {
  if (!maintainAspectRatio) {
    // User wants exact dimensions, ignore aspect ratio
    return { width: targetWidth, height: targetHeight };
  }

  // Calculate aspect ratios to determine best fit
  const originalRatio = originalWidth / originalHeight;
  const targetRatio = targetWidth / targetHeight;

  let newWidth, newHeight;

  if (originalRatio > targetRatio) {
    // Original image is wider - constrain by width
    newWidth = targetWidth;
    newHeight = Math.round(targetWidth / originalRatio);
  } else {
    // Original image is taller - constrain by height
    newHeight = targetHeight;
    newWidth = Math.round(targetHeight * originalRatio);
  }

  return { width: newWidth, height: newHeight };
}
```

#### 2. Business Logic Context
```javascript
async function detectWindowsSystemAssets(files) {
  const detectedAssets = [];

  for (const file of files) {
    // Windows system assets have specific characteristics:
    // 1. No file extension (e.g., "img0_1920x1080_123456")
    // 2. Large file size (>100KB for quality images)  
    // 3. MIME type is 'application/octet-stream'
    // 4. Often found in ContentDeliveryManager folders
    
    const hasNoExtension = !file.name.includes('.');
    const isLargeEnough = file.size > 100000; // 100KB threshold
    const hasCorrectMimeType = file.type === 'application/octet-stream';
    
    if (hasNoExtension && isLargeEnough && hasCorrectMimeType) {
      // Additional validation: try to load as image to confirm
      const isValidImage = await this.validateImageFile(file);
      
      if (isValidImage) {
        detectedAssets.push({
          file: file,
          confidence: 'high',
          reason: 'Matches Windows system asset pattern'
        });
      }
    }
  }

  return detectedAssets;
}
```

#### 3. Performance-Critical Sections
```javascript
async function processBatchWithMemoryManagement(files, options) {
  // Process files sequentially to prevent memory crashes
  // Chrome extensions have ~200MB practical memory limit
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    // Check memory usage before each file
    if (this.isMemoryUsageHigh()) {
      // Force garbage collection if available (dev environment)
      if (window.gc) window.gc();
      
      // Brief pause to allow cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const result = await this.processSingleFile(files[i], options);
      results.push(result);
      
      // Update progress for UI responsiveness
      this.emitProgress(i + 1, files.length);
      
      // Yield to main thread every few files to prevent UI blocking
      if (i % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
    } catch (error) {
      // Continue processing other files even if one fails
      results.push({ error: error.message, file: files[i].name });
    }
  }

  return results;
}
```

### Error Handling Documentation

#### 1. Error Types and Recovery
```javascript
/**
 * Custom error types for the File Converter extension
 */

/**
 * Thrown when an uploaded file is not a valid image
 * 
 * @class InvalidImageError
 * @extends Error
 * 
 * @example
 * try {
 *   await processImage(textFile);
 * } catch (error) {
 *   if (error instanceof InvalidImageError) {
 *     showUserFriendlyMessage('Please select a valid image file (JPEG, PNG)');
 *   }
 * }
 */
class InvalidImageError extends Error {
  constructor(fileName, detectedType) {
    super(`File "${fileName}" is not a valid image (detected: ${detectedType})`);
    this.name = 'InvalidImageError';
    this.fileName = fileName;
    this.detectedType = detectedType;
    this.userMessage = 'Please select a valid image file (JPEG, PNG)';
  }
}

/**
 * Thrown when image processing fails due to memory constraints
 * 
 * @class MemoryLimitError
 * @extends Error
 */
class MemoryLimitError extends Error {
  constructor(imageSize, memoryLimit) {
    super(`Image too large for processing: ${imageSize} pixels (limit: ${memoryLimit})`);
    this.name = 'MemoryLimitError';
    this.imageSize = imageSize;
    this.memoryLimit = memoryLimit;
    this.userMessage = 'Image is too large. Try reducing the image size or processing fewer files at once.';
    this.suggestedAction = 'split_batch';
  }
}

/**
 * Handles errors with user-friendly messages and recovery suggestions
 * 
 * @param {Error} error - The error to handle
 * @param {string} context - Context where error occurred ('upload', 'processing', 'download')
 * @returns {Object} Error handling result with user message and suggested actions
 */
function handleProcessingError(error, context) {
  // Log technical details for debugging
  console.error(`Error in ${context}:`, error);

  // Provide user-friendly responses
  if (error instanceof InvalidImageError) {
    return {
      type: 'user_error',
      message: error.userMessage,
      action: 'show_supported_formats',
      recoverable: true
    };
  }

  if (error instanceof MemoryLimitError) {
    return {
      type: 'resource_error',
      message: error.userMessage,
      action: error.suggestedAction,
      recoverable: true
    };
  }

  // Handle unexpected errors gracefully
  return {
    type: 'system_error',
    message: 'An unexpected error occurred. Please try again.',
    action: 'retry',
    recoverable: true,
    technicalDetails: error.message
  };
}
```

### API Documentation Standards

#### 1. Chrome Extension API Usage
```javascript
/**
 * Chrome Storage wrapper with optimized patterns for extension settings
 * 
 * @namespace ChromeStorageManager
 */
const ChromeStorageManager = {
  /**
   * Retrieves user preferences with caching for performance
   * 
   * @async
   * @function getUserPreferences
   * @memberof ChromeStorageManager
   * @returns {Promise<UserPreferences>} Current user preferences
   * 
   * @example
   * const prefs = await ChromeStorageManager.getUserPreferences();
   * console.log('Default quality:', prefs.defaultQuality);
   */
  async getUserPreferences() {
    // Check in-memory cache first for performance
    if (this.cache.has('userPreferences')) {
      return this.cache.get('userPreferences');
    }

    // Fallback to Chrome Storage API
    const result = await chrome.storage.local.get(['userPreferences']);
    const preferences = result.userPreferences || this.getDefaultPreferences();
    
    // Cache for subsequent calls
    this.cache.set('userPreferences', preferences);
    
    return preferences;
  },

  /**
   * Updates specific user preference with debounced writing
   * 
   * @async
   * @function updatePreference
   * @memberof ChromeStorageManager
   * @param {string} key - Preference key to update
   * @param {*} value - New value for the preference
   * @returns {Promise<void>}
   * 
   * @example
   * // Update default quality setting
   * await ChromeStorageManager.updatePreference('defaultQuality', 90);
   */
  async updatePreference(key, value) {
    // Implementation with debouncing logic
  }
};
```

#### 2. Internal API Documentation
```javascript
/**
 * Internal messaging system for communication between extension components
 * 
 * @namespace MessageSystem
 */
const MessageSystem = {
  /**
   * Available message types for extension communication
   * 
   * @readonly
   * @enum {string}
   */
  MessageTypes: {
    /** Start file conversion process */
    START_CONVERSION: 'start_conversion',
    /** Update conversion progress */
    CONVERSION_PROGRESS: 'conversion_progress',
    /** Conversion completed successfully */
    CONVERSION_COMPLETE: 'conversion_complete',
    /** Conversion failed with error */
    CONVERSION_ERROR: 'conversion_error',
    /** Request user settings */
    GET_SETTINGS: 'get_settings',
    /** Update user settings */
    UPDATE_SETTINGS: 'update_settings'
  },

  /**
   * Sends message from popup to background script
   * 
   * @async
   * @function sendToBackground
   * @memberof MessageSystem
   * @param {string} type - Message type from MessageTypes enum
   * @param {Object} [data={}] - Message payload
   * @returns {Promise<Object>} Response from background script
   * 
   * @example
   * // Request current settings
   * const settings = await MessageSystem.sendToBackground(
   *   MessageSystem.MessageTypes.GET_SETTINGS
   * );
   * 
   * @example
   * // Start conversion process
   * await MessageSystem.sendToBackground(
   *   MessageSystem.MessageTypes.START_CONVERSION,
   *   { files: selectedFiles, options: conversionSettings }
   * );
   */
  async sendToBackground(type, data = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
};
```

### Code Organization Documentation

#### 1. File Structure Comments
```javascript
// ====================================================================
// FILE: src/popup.js
// PURPOSE: Main popup interface logic and user interaction handling
// DEPENDENCIES: 
//   - ChromeStorageManager (settings persistence)
//   - ImageProcessor (file processing)
//   - MessageSystem (background communication)
// ENTRY POINT: DOMContentLoaded event listener
// ====================================================================

/**
 * Main popup controller for the File Converter extension
 * 
 * Handles user interactions, file selection, conversion settings,
 * and communication with the background script for processing.
 * 
 * @module PopupController
 * @requires ChromeStorageManager
 * @requires ImageProcessor  
 * @requires MessageSystem
 */

// Main application state
const AppState = {
  selectedFiles: [],
  conversionSettings: {},
  isProcessing: false,
  processingProgress: { current: 0, total: 0 }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * Initializes the popup interface and sets up event listeners
 * 
 * This is the main entry point for the popup. It:
 * 1. Loads user preferences from storage
 * 2. Sets up drag-and-drop functionality  
 * 3. Configures button event listeners
 * 4. Prepares the UI for first use
 * 
 * @async
 * @function initializePopup
 */
async function initializePopup() {
  // Load saved user preferences
  AppState.conversionSettings = await ChromeStorageManager.getUserPreferences();
  
  // Set up UI based on saved settings
  populateUIFromSettings(AppState.conversionSettings);
  
  // Configure event listeners
  setupEventListeners();
  
  // Mark popup as ready
  document.body.classList.add('initialized');
}
```

#### 2. Component Documentation
```javascript
// ====================================================================
// COMPONENT: File Drop Zone
// PURPOSE: Handles drag-and-drop file selection with visual feedback
// ====================================================================

/**
 * Manages the file drop zone interface and file selection
 * 
 * @namespace FileDropZone
 */
const FileDropZone = {
  /**
   * DOM element for the drop zone
   * @type {HTMLElement}
   */
  element: null,

  /**
   * Currently selected files
   * @type {File[]}
   */
  selectedFiles: [],

  /**
   * Initializes the drop zone with event listeners and validation
   * 
   * @memberof FileDropZone
   * @param {string} selector - CSS selector for drop zone element
   */
  initialize(selector) {
    this.element = document.querySelector(selector);
    
    if (!this.element) {
      throw new Error(`Drop zone element not found: ${selector}`);
    }

    this.setupDragDropListeners();
    this.setupBrowseButton();
    this.setupAssetDetectionButton();
  },

  /**
   * Sets up drag and drop event listeners with visual feedback
   * 
   * @private
   * @memberof FileDropZone
   */
  setupDragDropListeners() {
    // Prevent default drag behaviors on document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, this.preventDefaults, false);
    });

    // Add visual feedback for drag operations
    ['dragenter', 'dragover'].forEach(eventName => {
      this.element.addEventListener(eventName, this.highlightDropZone.bind(this), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.element.addEventListener(eventName, this.unhighlightDropZone.bind(this), false);
    });

    // Handle file drop
    this.element.addEventListener('drop', this.handleFileDrop.bind(this), false);
  }
};
```

### Testing Documentation Standards

#### 1. Test File Headers
```javascript
// ====================================================================
// TEST FILE: tests/unit/image-processor.test.js
// PURPOSE: Unit tests for ImageProcessor class
// COVERAGE: Image format conversion, resizing, error handling
// DEPENDENCIES: Jest, jsdom, custom test utilities
// ====================================================================

/**
 * @fileoverview Unit tests for the ImageProcessor class
 * 
 * Tests cover:
 * - Image format conversion (JPEG ↔ PNG)
 * - Image resizing with aspect ratio options
 * - T-shirt design preset application
 * - Error handling for invalid files
 * - Memory management during processing
 * - Canvas resource cleanup
 * 
 * @requires jest
 * @requires jsdom
 * @requires ../helpers/test-utils
 */

import { ImageProcessor } from '../../src/lib/image-processor.js';
import { createTestImage, createCorruptedFile } from '../helpers/test-utils.js';

describe('ImageProcessor', () => {
  let processor;

  /**
   * Set up fresh processor instance for each test
   * Ensures test isolation and prevents memory leaks
   */
  beforeEach(() => {
    processor = new ImageProcessor({
      enableMemoryOptimization: true,
      maxCanvasSize: 4000 * 4000
    });
  });

  /**
   * Clean up processor resources after each test
   * Prevents memory leaks in test environment
   */
  afterEach(() => {
    processor.cleanup();
  });
```

#### 2. Test Case Documentation
```javascript
/**
 * Test group: Format Conversion
 * 
 * Verifies that the ImageProcessor can correctly convert between
 * supported image formats while maintaining image quality and metadata.
 */
describe('Format Conversion', () => {
  /**
   * Test: JPEG to PNG conversion preserves image data
   * 
   * This test ensures that:
   * 1. JPEG files are correctly read and processed
   * 2. PNG output format is properly generated
   * 3. Image dimensions remain unchanged during conversion
   * 4. Conversion completes within performance targets (<5 seconds)
   * 
   * @test {ImageProcessor#convertFormat}
   */
  test('should convert JPEG to PNG while preserving dimensions', async () => {
    // Arrange: Create test JPEG with known dimensions
    const testJpeg = await createTestImage({
      width: 1000,
      height: 800,
      format: 'jpeg',
      quality: 0.8
    });

    // Act: Convert to PNG format
    const startTime = performance.now();
    const result = await processor.convertFormat(testJpeg, {
      outputFormat: 'png',
      quality: 0.9
    });
    const conversionTime = performance.now() - startTime;

    // Assert: Verify conversion results
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/png');
    expect(result.size).toBeGreaterThan(0);
    expect(conversionTime).toBeLessThan(5000); // Performance requirement

    // Verify dimensions preserved
    const dimensions = await getImageDimensions(result);
    expect(dimensions.width).toBe(1000);
    expect(dimensions.height).toBe(800);
  });

  /**
   * Test: Invalid file handling with helpful error messages
   * 
   * Ensures that non-image files are rejected gracefully with
   * user-friendly error messages that can be displayed in the UI.
   * 
   * @test {ImageProcessor#convertFormat}
   */
  test('should reject invalid files with user-friendly errors', async () => {
    // Arrange: Create non-image file
    const textFile = new File(['Hello World'], 'test.txt', {
      type: 'text/plain'
    });

    // Act & Assert: Expect specific error type
    await expect(processor.convertFormat(textFile, { outputFormat: 'png' }))
      .rejects
      .toThrow(InvalidImageError);

    // Verify error has user-friendly message
    try {
      await processor.convertFormat(textFile, { outputFormat: 'png' });
    } catch (error) {
      expect(error.userMessage).toContain('valid image file');
      expect(error.fileName).toBe('test.txt');
    }
  });
});
```

### README and Setup Documentation

#### 1. Developer README Template
```markdown
# File Converter Pro - Developer Documentation

## Quick Start for Developers

### Prerequisites
- Chrome Browser (version 90+)
- Visual Studio Code (recommended)
- Git

### Setup (5 minutes)
```bash
# 1. Clone and navigate
git clone <repository-url>
cd file_converter

# 2. Load extension in Chrome
# Open chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" and select the src/ folder

# 3. Start developing
# Edit files in src/
# Use "Reload" button in chrome://extensions/ after changes
```

### Project Structure
```
src/
├── manifest.json       # Extension configuration
├── popup.html          # Main UI (what users see)
├── popup.js           # UI logic and user interactions
├── popup.css          # Styling (8-year-old friendly design)
├── background.js      # Background processing coordinator
├── processor.html     # Hidden tab for heavy image processing
├── processor.js       # Image conversion engine
└── icons/            # Extension icons (16px, 48px, 128px)
```

### Key Files for New Developers

#### Start Here: `popup.js`
- Main user interface logic
- Handles file selection and settings
- Good entry point to understand the app

#### Core Processing: `processor.js`  
- Image conversion engine
- Canvas API usage for format conversion
- T-shirt design presets implementation

#### Settings Management: `background.js`
- Chrome Storage API wrapper
- Message passing between components
- Extension lifecycle management

### Development Workflow

1. **Make Changes**: Edit files in `src/`
2. **Test Changes**: Reload extension in Chrome
3. **Debug Issues**: Use Chrome DevTools
4. **Run Tests**: `npm test` (if tests are set up)
5. **Check Performance**: Monitor memory usage

### Common Tasks

#### Adding a New T-Shirt Preset
```javascript
// In processor.js, add to tshirtPresets object:
const tshirtPresets = {
  'your-preset-name': {
    name: 'Your Preset Name',
    width: 3000,
    height: 3600,
    dpi: 300,
    description: 'Description for users'
  }
};
```

#### Adding a New File Format
```javascript
// In processor.js, add to supportedFormats:
const supportedFormats = {
  'your-format': {
    mimeType: 'image/your-format',
    extension: '.format'
  }
};
```

### Debugging Tips

#### Chrome Extension DevTools
- **Popup**: Right-click extension icon → "Inspect popup"
- **Background**: Go to chrome://extensions/ → "background page"
- **Processing Tab**: Will appear in Chrome DevTools Sources

#### Common Issues
- **Extension won't load**: Check manifest.json syntax
- **Popup doesn't open**: Check popup.html/popup.js errors
- **Images won't convert**: Check processor.js Canvas API usage
- **Settings won't save**: Check Chrome Storage permissions

### Performance Guidelines
- Keep popup.js lightweight (UI responsiveness)
- Use processor.js for heavy operations (separate tab)
- Clean up Canvas resources after each conversion
- Monitor memory usage during batch processing

### Testing Your Changes
```javascript
// Test with different file types
const testFiles = [
  new File([jpegData], 'test.jpg', { type: 'image/jpeg' }),
  new File([pngData], 'test.png', { type: 'image/png' })
];

// Test with different settings
const testSettings = {
  outputFormat: 'jpeg',
  preset: 'print-quality',
  quality: 0.8
};
```

### Need Help?
- Check browser console for errors
- Review existing code for patterns
- Test with small images first
- Use Chrome DevTools Performance tab for optimization
```

### Documentation Maintenance

#### 1. Keeping Documentation Current
```javascript
/**
 * Documentation maintenance checklist:
 * 
 * @todo Update JSDoc when function signatures change
 * @todo Add examples when new features are implemented  
 * @todo Update error handling docs when new error types are added
 * @todo Refresh performance metrics after optimizations
 * @todo Update README when setup process changes
 * 
 * @version 1.0.0
 * @lastUpdated 2024-01-15
 * @maintainer Developer Name
 */
```

#### 2. Documentation Review Process
```markdown
## Documentation Review Checklist

### Before Code Review
- [ ] All new functions have JSDoc comments
- [ ] Complex algorithms have inline explanations
- [ ] Error cases are documented with examples
- [ ] Performance implications are noted
- [ ] Breaking changes are highlighted

### During Code Review
- [ ] Documentation accurately describes code behavior
- [ ] Examples are correct and helpful
- [ ] Error messages are user-friendly
- [ ] Type definitions match implementation

### After Release
- [ ] User-facing documentation updated
- [ ] API documentation reflects final implementation
- [ ] Performance metrics updated with real-world data
- [ ] Troubleshooting guides include new issues discovered
```

This code documentation standard ensures that your File Converter Pro extension remains maintainable, debuggable, and accessible to developers of all experience levels while supporting the 8-year-old usability goal and t-shirt design business requirements.
