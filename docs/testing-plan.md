# Testing Plan Documentation
## File Converter Chrome Extension - Comprehensive Testing Strategy

### Testing Overview

#### Testing Philosophy
- **User-First**: Every test validates real user scenarios
- **Quality Assurance**: Ensure 8-year-old usability standard
- **Performance**: Test with realistic file sizes and batches
- **Privacy**: Verify no data leaks or external calls
- **Reliability**: Extension works consistently across Chrome versions

#### Testing Pyramid Structure
```
                  ┌─────────────────┐
                  │   Manual E2E    │ (20% of tests)
                  │  User Testing   │
                ┌─┴─────────────────┴─┐
                │  Integration Tests  │ (30% of tests)
                │   API & Workflow    │
              ┌─┴─────────────────────┴─┐
              │     Unit Tests          │ (50% of tests)
              │  Functions & Logic      │
              └─────────────────────────┘
```

### Unit Testing

#### 1. Core Processing Functions
```javascript
// tests/unit/image-processor.test.js
describe('ImageProcessor', () => {
  let processor;
  
  beforeEach(() => {
    processor = new ImageProcessor();
  });
  
  describe('Format Conversion', () => {
    test('should convert JPEG to PNG', async () => {
      // Create test JPEG file
      const testFile = createTestJPEG();
      
      // Convert to PNG
      const result = await processor.convertFormat(testFile, 'image/png', 0.9);
      
      // Verify result
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
      expect(result.size).toBeGreaterThan(0);
    });
    
    test('should maintain image dimensions during format conversion', async () => {
      const testFile = createTestImage(800, 600);
      const result = await processor.convertFormat(testFile, 'image/jpeg', 0.8);
      
      const dimensions = await getImageDimensions(result);
      expect(dimensions.width).toBe(800);
      expect(dimensions.height).toBe(600);
    });
    
    test('should handle invalid file gracefully', async () => {
      const invalidFile = new Blob(['invalid'], { type: 'text/plain' });
      
      await expect(processor.convertFormat(invalidFile, 'image/jpeg', 0.8))
        .rejects.toThrow('Invalid image file');
    });
  });
  
  describe('Image Resizing', () => {
    test('should resize to exact dimensions when aspect ratio disabled', async () => {
      const testFile = createTestImage(1000, 800);
      const result = await processor.resizeImage(testFile, 500, 300, false);
      
      const dimensions = await getImageDimensions(result);
      expect(dimensions.width).toBe(500);
      expect(dimensions.height).toBe(300);
    });
    
    test('should maintain aspect ratio when enabled', async () => {
      const testFile = createTestImage(1000, 800); // 5:4 ratio
      const result = await processor.resizeImage(testFile, 500, 500, true);
      
      const dimensions = await getImageDimensions(result);
      expect(dimensions.width).toBe(500);
      expect(dimensions.height).toBe(400); // Maintains 5:4 ratio
    });
    
    test('should handle t-shirt preset dimensions correctly', async () => {
      const testFile = createTestImage(2000, 2000);
      const result = await processor.resizeToPreset(testFile, 'print-quality');
      
      const dimensions = await getImageDimensions(result);
      expect(dimensions.width).toBe(4500);
      expect(dimensions.height).toBe(5400);
    });
  });
});
```

#### 2. Windows System Asset Detection
```javascript
// tests/unit/system-asset-detector.test.js
describe('SystemAssetDetector', () => {
  let detector;
  
  beforeEach(() => {
    detector = new SystemAssetDetector();
  });
  
  test('should detect Windows system asset by characteristics', () => {
    const assetFile = {
      name: 'img0_1920x1080_12345',  // No extension
      size: 2456789,                // Large enough
      type: 'application/octet-stream'
    };
    
    const isAsset = detector.detectAssetFile(assetFile);
    expect(isAsset).toBe(true);
  });
  
  test('should reject regular image files', () => {
    const regularFile = {
      name: 'photo.jpg',
      size: 1234567,
      type: 'image/jpeg'
    };
    
    const isAsset = detector.detectAssetFile(regularFile);
    expect(isAsset).toBe(false);
  });
  
  test('should reject files that are too small', () => {
    const smallFile = {
      name: 'small_asset',
      size: 50000,  // Below 100KB threshold
      type: 'application/octet-stream'
    };
    
    const isAsset = detector.detectAssetFile(smallFile);
    expect(isAsset).toBe(false);
  });
});
```

#### 3. Chrome Storage Operations
```javascript
// tests/unit/storage-manager.test.js
describe('StorageManager', () => {
  let storageManager;
  let mockChromeStorage;
  
  beforeEach(() => {
    // Mock Chrome Storage API
    mockChromeStorage = {
      local: {
        get: jest.fn(),
        set: jest.fn(),
        getBytesInUse: jest.fn()
      }
    };
    global.chrome = { storage: mockChromeStorage };
    
    storageManager = new StorageManager();
  });
  
  test('should initialize with default settings', async () => {
    mockChromeStorage.local.get.mockResolvedValue({});
    
    const settings = await storageManager.initializeStorage();
    
    expect(settings.userPreferences.defaultQuality).toBe(80);
    expect(settings.userPreferences.selectedTshirtPreset).toBe('print-quality');
    expect(mockChromeStorage.local.set).toHaveBeenCalled();
  });
  
  test('should update specific setting correctly', async () => {
    const existingSettings = {
      userPreferences: { defaultQuality: 80, defaultDPI: 300 }
    };
    mockChromeStorage.local.get.mockResolvedValue(existingSettings);
    
    await storageManager.updateSetting('defaultQuality', 90);
    
    expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
      userPreferences: { defaultQuality: 90, defaultDPI: 300 }
    });
  });
});
```

### Integration Testing

#### 1. Complete Conversion Workflow
```javascript
// tests/integration/conversion-workflow.test.js
describe('Complete Conversion Workflow', () => {
  let mockChrome;
  
  beforeEach(() => {
    mockChrome = setupChromeAPIMocks();
    global.chrome = mockChrome;
  });
  
  test('should complete full JPEG to PNG conversion', async () => {
    // Setup: Create test file and user preferences
    const testFile = createTestJPEG(1000, 800);
    const userSettings = {
      defaultOutputFormat: 'png',
      selectedTshirtPreset: 'high-quality',
      defaultQuality: 85
    };
    
    // Execute: Run complete conversion workflow
    const workflow = new ConversionWorkflow();
    const result = await workflow.convertFiles([testFile], userSettings);
    
    // Verify: Check all steps completed correctly
    expect(result.success).toBe(true);
    expect(result.convertedFiles).toHaveLength(1);
    expect(result.convertedFiles[0].format).toBe('image/png');
    expect(mockChrome.downloads.download).toHaveBeenCalled();
    expect(mockChrome.storage.local.set).toHaveBeenCalled(); // History updated
  });
  
  test('should handle batch processing correctly', async () => {
    const testFiles = [
      createTestJPEG(800, 600),
      createTestPNG(1200, 900),
      createSystemAsset(1920, 1080)
    ];
    
    const workflow = new ConversionWorkflow();
    const result = await workflow.convertFiles(testFiles, {
      defaultOutputFormat: 'jpeg',
      selectedTshirtPreset: 'print-quality'
    });
    
    expect(result.success).toBe(true);
    expect(result.convertedFiles).toHaveLength(3);
    expect(mockChrome.downloads.download).toHaveBeenCalledTimes(3);
  });
  
  test('should handle partial failures gracefully', async () => {
    const testFiles = [
      createTestJPEG(800, 600),      // Valid
      createCorruptedFile(),         // Invalid
      createTestPNG(1200, 900)       // Valid
    ];
    
    const workflow = new ConversionWorkflow();
    const result = await workflow.convertFiles(testFiles, {});
    
    expect(result.success).toBe(true);  // Partial success
    expect(result.convertedFiles).toHaveLength(2);  // 2 successful
    expect(result.errors).toHaveLength(1);          // 1 failed
    expect(result.errors[0]).toContain('corrupted');
  });
});
```

#### 2. Chrome Extension API Integration
```javascript
// tests/integration/chrome-api.test.js
describe('Chrome API Integration', () => {
  test('should create and communicate with processing tab', async () => {
    const mockChrome = setupChromeAPIMocks();
    global.chrome = mockChrome;
    
    const tabManager = new TabsAPI();
    
    // Create processing tab
    const tabId = await tabManager.createProcessingTab();
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('processor.html'),
      active: false
    });
    
    // Send message to tab
    const testData = { files: [], settings: {} };
    await tabManager.sendToProcessor(testData);
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, testData);
  });
  
  test('should handle downloads correctly', async () => {
    const downloadsAPI = new DownloadsAPI();
    const testBlob = new Blob(['test'], { type: 'image/jpeg' });
    
    const downloadId = await downloadsAPI.saveFile(testBlob, 'test.jpg');
    
    expect(chrome.downloads.download).toHaveBeenCalledWith({
      url: expect.stringMatching(/^blob:/),
      filename: 'test.jpg',
      saveAs: false
    });
  });
});
```

### End-to-End Testing

#### 1. User Journey Testing
```javascript
// tests/e2e/user-journey.test.js
describe('User Journey - T-Shirt Designer Workflow', () => {
  let extensionPage;
  
  beforeEach(async () => {
    // Setup Chrome extension testing environment
    extensionPage = await setupExtensionTestPage();
  });
  
  test('should complete 30-second conversion workflow', async () => {
    // Step 1: Open extension
    await extensionPage.clickExtensionIcon();
    expect(await extensionPage.isPopupVisible()).toBe(true);
    
    // Step 2: Drag files
    const testFiles = [createTestJPEG(), createTestPNG()];
    await extensionPage.dragFilesToDropZone(testFiles);
    expect(await extensionPage.getFileCount()).toBe(2);
    
    // Step 3: Select print quality preset
    await extensionPage.selectPreset('print-quality');
    expect(await extensionPage.getSelectedPreset()).toBe('print-quality');
    
    // Step 4: Click convert
    await extensionPage.clickConvert();
    
    // Step 5: Verify download
    await extensionPage.waitForConversionComplete();
    expect(await extensionPage.getSuccessMessage()).toContain('2 files converted');
  });
  
  test('should handle Windows system asset detection', async () => {
    await extensionPage.clickExtensionIcon();
    
    // Click "Find Windows Assets" button
    await extensionPage.clickFindAssets();
    
    // Should show scanning message
    expect(await extensionPage.getScanningMessage()).toContain('Scanning');
    
    // Should find and display assets
    await extensionPage.waitForAssetScan();
    const assetCount = await extensionPage.getDetectedAssetCount();
    expect(assetCount).toBeGreaterThan(0);
    
    // Should allow selection and conversion
    await extensionPage.selectAllAssets();
    await extensionPage.clickConvert();
    await extensionPage.waitForConversionComplete();
  });
});
```

#### 2. Error Scenario Testing
```javascript
// tests/e2e/error-scenarios.test.js
describe('Error Handling', () => {
  test('should handle unsupported file types gracefully', async () => {
    const extensionPage = await setupExtensionTestPage();
    await extensionPage.clickExtensionIcon();
    
    // Try to drop text file
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
    await extensionPage.dragFilesToDropZone([textFile]);
    
    // Should show error message
    expect(await extensionPage.getErrorMessage()).toContain('Unsupported file type');
    expect(await extensionPage.getSupportedFormatsHelp()).toBeVisible();
  });
  
  test('should handle memory limitations', async () => {
    const extensionPage = await setupExtensionTestPage();
    await extensionPage.clickExtensionIcon();
    
    // Try to process very large file
    const largeFile = createLargeTestImage(10000, 10000); // Very large
    await extensionPage.dragFilesToDropZone([largeFile]);
    await extensionPage.clickConvert();
    
    // Should either process successfully or show helpful error
    const result = await extensionPage.waitForResult();
    if (!result.success) {
      expect(result.error).toContain('file too large');
      expect(await extensionPage.getSuggestionMessage()).toContain('smaller size');
    }
  });
});
```

### Performance Testing

#### 1. File Size & Batch Testing
```javascript
// tests/performance/batch-processing.test.js
describe('Performance Testing', () => {
  test('should process small batch (5 files) within 30 seconds', async () => {
    const startTime = Date.now();
    const testFiles = Array.from({ length: 5 }, () => createTestJPEG(2000, 2000));
    
    const processor = new BatchProcessor();
    const result = await processor.processBatch(testFiles, {
      outputFormat: 'jpeg',
      preset: 'print-quality'
    });
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(30000); // 30 seconds
    expect(result.convertedFiles).toHaveLength(5);
  });
  
  test('should handle medium batch (15 files) efficiently', async () => {
    const startTime = Date.now();
    const testFiles = Array.from({ length: 15 }, () => createTestPNG(1500, 1500));
    
    const processor = new BatchProcessor();
    const result = await processor.processBatch(testFiles, {});
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(90000); // 90 seconds
    expect(result.convertedFiles).toHaveLength(15);
  });
  
  test('should manage memory during large batch processing', async () => {
    const initialMemory = performance.memory.usedJSHeapSize;
    const testFiles = Array.from({ length: 20 }, () => createTestJPEG(3000, 3000));
    
    const processor = new BatchProcessor();
    await processor.processBatch(testFiles, {});
    
    // Force garbage collection and check memory
    if (global.gc) global.gc();
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (< 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
```

### User Acceptance Testing

#### 1. 8-Year-Old Usability Test Plan
```markdown
## 8-Year-Old Usability Test Script

### Test Setup
- Use Chrome browser on Windows 10/11
- Extension installed and ready
- Test images prepared (family photos, drawings)
- Observer takes notes on confusion points

### Test Scenarios

#### Scenario 1: First Use
1. "Open the File Converter extension"
   - Look for: Can child find and click extension icon?
   - Success criteria: Popup opens within 10 seconds

2. "Convert this photo to make it smaller for email"
   - Give child a JPEG photo
   - Look for: Natural discovery of drag-drop or browse
   - Success criteria: File appears in extension without help

3. "Make it ready to send in an email"
   - Look for: Understanding of format/size options
   - Success criteria: Child selects appropriate settings

4. "Start the conversion"
   - Look for: Clear understanding of convert button
   - Success criteria: Conversion completes successfully

#### Scenario 2: Multiple Files
1. "Convert these 3 photos at once"
   - Look for: Batch selection understanding
   - Success criteria: All 3 files processed

### Success Criteria
- Child completes task without adult help: PASS
- Child needs 1-2 hints: ACCEPTABLE
- Child needs constant guidance: NEEDS IMPROVEMENT
- Child gives up or becomes frustrated: FAIL

### Common Issues to Watch For
- Too many options overwhelming the interface
- Unclear button labels or icons
- Error messages too technical
- Progress feedback insufficient
- Success confirmation unclear
```

#### 2. T-Shirt Designer User Testing
```markdown
## T-Shirt Designer User Test Plan

### Test Participants
- 3-5 t-shirt design business owners
- Mix of tech-savvy and non-technical users
- Different experience levels (beginner to expert)

### Test Scenarios

#### Scenario 1: Daily Workflow
"You've just created a new t-shirt design and need to prepare it for your print-on-demand service"

1. Convert design to JPEG at print quality (4500x5400)
2. Create web preview version (1800x2400)  
3. Process batch of 10 designs at once

#### Scenario 2: Windows Asset Conversion
"You found some great background images in Windows and want to use them in designs"

1. Find and extract Windows system assets
2. Convert to usable formats
3. Resize for t-shirt compatibility

### Success Metrics
- Task completion rate > 90%
- Time to complete workflow < 2 minutes
- User satisfaction rating > 4/5
- Would recommend to other designers > 80%

### Feedback Collection
- Pre-test questionnaire (current workflow, pain points)
- During-test observation (confusion, delight moments)
- Post-test interview (improvement suggestions, feature requests)
```

### Test Automation Setup

#### 1. Test Runner Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/icons/**',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### 2. Test Helper Functions
```javascript
// tests/helpers/test-utils.js
export function createTestJPEG(width = 800, height = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Create gradient test pattern
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#ff0000');
  gradient.addColorStop(1, '#0000ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
}

export function createSystemAsset(width = 1920, height = 1080) {
  return createTestJPEG(width, height).then(blob => {
    return new File([blob], 'img0_1920x1080_123456', {
      type: 'application/octet-stream',
      lastModified: Date.now()
    });
  });
}

export function setupChromeAPIMocks() {
  return {
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        getBytesInUse: jest.fn().mockResolvedValue(1024)
      }
    },
    downloads: {
      download: jest.fn().mockResolvedValue(123)
    },
    tabs: {
      create: jest.fn().mockResolvedValue({ id: 456 }),
      sendMessage: jest.fn().mockResolvedValue({ success: true })
    },
    runtime: {
      getURL: jest.fn(path => `chrome-extension://test/${path}`)
    }
  };
}
```

### Testing Schedule

#### Pre-Development Testing (Week 0)
- [ ] Test plan review and approval
- [ ] Test environment setup
- [ ] Mock data and test files creation

#### During Development (Weeks 1-3)
- [ ] Unit tests written alongside features
- [ ] Integration tests for each major component
- [ ] Daily smoke tests during development
- [ ] Performance benchmarking

#### Pre-Release Testing (Week 4)
- [ ] Complete end-to-end test suite
- [ ] User acceptance testing with real users
- [ ] Cross-browser compatibility verification
- [ ] Performance testing with realistic workloads
- [ ] Security and privacy verification

#### Post-Release Testing (Ongoing)
- [ ] Monitor user feedback and error reports
- [ ] Regular regression testing for updates
- [ ] Performance monitoring and optimization
- [ ] User experience improvements based on real usage

This comprehensive testing plan ensures your File Converter Pro extension meets the highest quality standards while maintaining the 8-year-old usability goal and providing reliable performance for t-shirt design workflows.
