/**
 * File Converter Pro - Image Processing Engine
 * Handles heavy image processing operations in a dedicated tab
 */

// Processing state
const ProcessorState = {
  isProcessing: false,
  currentBatch: [],
  processedFiles: [],
  errors: [],
  progress: { current: 0, total: 0 }
};

// Professional print presets
const PRINT_PRESETS = {
  'print-quality': { width: 4500, height: 5400, dpi: 300, name: 'Print Quality' },
  'high-quality': { width: 3000, height: 3600, dpi: 300, name: 'High Quality' },
  'standard-print': { width: 2400, height: 3000, dpi: 300, name: 'Standard Print' },
  'web-preview': { width: 1800, height: 2400, dpi: 72, name: 'Web Preview' }
};

// DOM elements
let elements = {};

/**
 * Initialize processor when DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializeProcessor);

/**
 * Initialize the processing engine
 */
function initializeProcessor() {
  console.log('File Converter Pro processor initializing...');
  
  // Cache DOM elements
  elements = {
    status: document.getElementById('status'),
    processSummary: document.getElementById('processSummary'),
    totalFiles: document.getElementById('totalFiles'),
    filesSummary: document.getElementById('filesSummary'),
    settingsSummary: document.getElementById('settingsSummary'),
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    currentFileInfo: document.getElementById('currentFileInfo'),
    currentFileDetails: document.getElementById('currentFileDetails'),
    results: document.getElementById('results'),
    resultsText: document.getElementById('resultsText'),
    summaryToggle: document.getElementById('summaryToggle'),
    lastProcessed: document.getElementById('lastProcessed')
  };
  
  // Set up message listener
  chrome.runtime.onMessage.addListener(handleMessage);
  
  updateStatus('ready', 'Ready for processing');
  console.log('Processor initialized successfully');
  
  // Load and display last summary if available
  loadLastSummary();
  
  // For debugging: show test data if accessed directly
  if (window.location.search.includes('debug=true')) {
    console.log('Debug mode: showing test summary');
    showTestSummary();
  }
}

/**
 * Handle messages from background script
 */
function handleMessage(message, sender, sendResponse) {
  console.log('Processor received message:', message);
  
  switch (message.type) {
    case 'PING':
      // Health check - processor is ready
      sendResponse({ success: true, status: 'ready' });
      break;
      
    case 'START_PROCESSING':
    case 'START_CONVERSION':
      handleStartProcessing(message.data);
      sendResponse({ success: true });
      break;
      
    case 'PROCESS_SINGLE_FILE':
      handleProcessSingleFile(message.data);
      sendResponse({ success: true });
      break;
      
    case 'CONVERSION_PROGRESS':
    case 'CONVERSION_COMPLETE':
    case 'CONVERSION_ERROR':
      // Just acknowledge these messages
      sendResponse({ success: true });
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true;
}

/**
 * Handle processing start request
 */
async function handleStartProcessing(data) {
  if (ProcessorState.isProcessing) {
    console.warn('Already processing files');
    return;
  }
  
  try {
    ProcessorState.isProcessing = true;
    ProcessorState.currentBatch = data.files || [];
    ProcessorState.processedFiles = [];
    ProcessorState.errors = [];
    ProcessorState.progress = { current: 0, total: ProcessorState.currentBatch.length };
    
    updateStatus('processing', 'Preparing files...');
    
    // Show process summary first
    await showProcessSummary(data);
    
    // Wait a moment for user to see the summary
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Hide summary and show progress
    showProgress();
    
    // Start processing
    await processBatch(data);
    
    // Show results
    showResults();
    updateStatus('ready', 'Processing complete');
    
  } catch (error) {
    console.error('Processing failed:', error);
    updateStatus('error', 'Processing failed: ' + error.message);
    
    // Notify background of error
    chrome.runtime.sendMessage({
      type: 'CONVERSION_ERROR',
      data: { error: error.message }
    });
  } finally {
    ProcessorState.isProcessing = false;
  }
}

/**
 * Handle single file processing (for Windows assets)
 */
async function handleProcessSingleFile(data) {
  try {
    console.log('Processing single file:', data.file.name);
    
    // Process the single file directly
    await processSingleFile(data.file, data.settings, data.isWindowsAsset);
    
  } catch (error) {
    console.error('Error processing single file:', error);
  }
}

/**
 * Process a single file
 */
async function processSingleFile(file, settings, isWindowsAsset) {
  try {
    console.log('🔄 Processing single file:', file.name);
    
    // Reconstruct file from data
    const fileBlob = new Blob([new Uint8Array(file.data)], { type: file.type || 'image/jpeg' });
    const reconstructedFile = new File([fileBlob], file.name, { type: file.type || 'image/jpeg' });
    
    console.log('✅ File reconstructed:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Auto-detect Windows system assets
    const isSystemAsset = assetDetector.detectAssetFile(reconstructedFile);
    if (isSystemAsset) {
      console.log(`🔍 Detected Windows system asset: ${reconstructedFile.name}`);
      // Force JPEG output for system assets
      settings.outputFormat = 'jpeg';
    }
    
    // Process the image with real Canvas API
    const processedBlob = await processor.processImage(reconstructedFile, settings);
    
    // Generate filename
    const outputName = generateOutputFilename(reconstructedFile.name, settings, isSystemAsset);
    
    console.log('✅ Successfully processed:', reconstructedFile.name, '→', outputName);
    
    // Get user preferences for download settings
    const prefs = await chrome.storage.local.get(['userPreferences']);
    const userPreferences = prefs.userPreferences || {};
    
    // Trigger download
    await downloadFile(processedBlob, outputName, userPreferences.downloadSubfolder, userPreferences.showInFolderAfterDownload);
    
  } catch (error) {
    console.error('❌ Error processing file:', file.name, error);
  }
}

/**
 * Process batch of files
 */
async function processBatch(conversionData) {
  const { files, settings } = conversionData;
  const totalFiles = files?.length || 0;
  
  if (totalFiles === 0) {
    throw new Error('No files to process');
  }
  
  console.log(`Starting batch processing of ${totalFiles} files`);
  
  // Convert serialized files back to File objects
  const fileObjects = files.map(fileData => {
    // Convert array back to Uint8Array, then to Blob, then to File
    console.log('🔄 Reconstructing file:', fileData.name, 'Type:', fileData.type, 'Data length:', fileData.data?.length);
    const uint8Array = new Uint8Array(fileData.data);
    const file = new File([uint8Array], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified
    });
    console.log('✅ File reconstructed:', file.name, 'Size:', file.size, 'Type:', file.type);
    return file;
  });
  
  // Process each file with real Canvas API
  for (let i = 0; i < fileObjects.length; i++) {
    try {
      const file = fileObjects[i];
      const originalFileData = files[i]; // Get original file data with dimensions
      ProcessorState.progress.current = i;
      
      // Update progress with current file details
      updateProgress(i, totalFiles, `Processing ${file.name}...`);
      updateCurrentFileDisplay(file, originalFileData, settings);
      
      // Auto-detect Windows system assets
      const isSystemAsset = assetDetector.detectAssetFile(file);
      if (isSystemAsset) {
        console.log(`🔍 Detected Windows system asset: ${file.name}`);
        // Force JPEG output for system assets
        settings.outputFormat = 'jpeg';
      }
      
      // Process the image with real Canvas API
      const processedBlob = await processor.processImage(file, settings);
      
      // Generate filename
      const outputName = generateOutputFilename(file.name, settings, isSystemAsset);
      
      // Get user preferences for download settings
      const prefs = await chrome.storage.local.get(['userPreferences']);
      const userPreferences = prefs.userPreferences || {};
      
      // Trigger download
      const downloadId = await downloadFile(processedBlob, outputName, userPreferences.downloadSubfolder, userPreferences.showInFolderAfterDownload);
      
      // Track success
      const processedFile = {
        name: outputName,
        originalName: file.name,
        size: processedBlob.size,
        success: true,
        isSystemAsset: isSystemAsset
      };
      
      ProcessorState.processedFiles.push(processedFile);
      console.log(`✅ Successfully processed: ${file.name} → ${outputName}`);
      
    } catch (error) {
      console.error(`❌ Failed to process file ${i + 1}:`, error);
      ProcessorState.errors.push({
        file: fileObjects[i]?.name || `file_${i + 1}`,
        error: error.message
      });
    }
  }
  
  ProcessorState.progress.current = totalFiles;
  updateProgress(totalFiles, totalFiles, 'Processing complete!');
  
  // Notify background of completion
  chrome.runtime.sendMessage({
    type: 'CONVERSION_COMPLETE',
    data: {
      filesProcessed: ProcessorState.processedFiles.length,
      errors: ProcessorState.errors,
      convertedFiles: ProcessorState.processedFiles,
      preset: settings?.preset
    }
  });
  
  console.log(`Batch processing complete: ${ProcessorState.processedFiles.length} success, ${ProcessorState.errors.length} errors`);
}

/**
 * Generate output filename based on original name and settings
 */
function generateOutputFilename(originalName, settings, isWindowsAsset = false) {
  console.log('🔧 generateOutputFilename called with:', {
    originalName,
    settings,
    isWindowsAsset
  });
  
  // Check if this is a Windows asset
  if (isWindowsAsset) {
    // For Windows assets: "image_background.jpg"
    const extension = settings.outputFormat === 'png' ? 'png' : 'jpg';
    const filename = `image_background.${extension}`;
    console.log('🖼️ Windows asset filename:', filename);
    return filename;
  }
  
  // For regular JPEG/PNG files: "image_resolution_DPI.xxx"
  let resolution = '';
  
  if (settings.preset && PRINT_PRESETS[settings.preset]) {
    const preset = PRINT_PRESETS[settings.preset];
    resolution = `${preset.width}x${preset.height}`;
    console.log('📐 Using preset resolution:', resolution);
  } else if (settings.customWidth && settings.customHeight) {
    resolution = `${settings.customWidth}x${settings.customHeight}`;
    console.log('📐 Using custom resolution:', resolution);
  } else {
    // Fallback to original dimensions if available
    resolution = 'original';
    console.log('📐 Using original resolution');
  }
  
  // Add DPI
  const dpi = settings.dpi || 300;
  
  // Add format extension
  const extension = settings.outputFormat === 'png' ? 'png' : 'jpg';
  
  const filename = `image_${resolution}_${dpi}DPI.${extension}`;
  console.log('🖼️ Regular file filename:', filename);
  return filename;
}

/**
 * Download file using Chrome Downloads API
 */
function downloadFile(blob, filename, downloadSubfolder = '', showInFolder = false) {
  return new Promise((resolve, reject) => {
    try {
      // Create object URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Construct full filename with subfolder if specified
      let fullFilename = filename;
      if (downloadSubfolder) {
        fullFilename = `${downloadSubfolder}/${filename}`;
      }
      
      console.log('📥 Downloading with filename:', fullFilename);
      
      // Use Chrome Downloads API
      chrome.downloads.download({
        url: url,
        filename: fullFilename,
        saveAs: showInFolder, // Only use Save As dialog if user wants to show in folder
        conflictAction: 'uniquify' // Ensure unique filename if conflict
      }, (downloadId) => {
        // Clean up object URL
        URL.revokeObjectURL(url);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log(`📥 Download started: ${fullFilename} (ID: ${downloadId})`);
          
          // Show in folder if requested
          if (showInFolder) {
            chrome.downloads.show(downloadId);
          }
          
          resolve(downloadId);
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Load last summary from session storage
 */
async function loadLastSummary() {
  try {
    const result = await chrome.storage.session.get(['lastProcessSummary']);
    const summaryData = result.lastProcessSummary;
    
    if (summaryData) {
      console.log('📄 Found saved summary:', summaryData);
      
      // Update the status to show there's a saved summary
      if (elements.lastProcessed) {
        const processedDate = new Date(summaryData.timestamp).toLocaleString();
        elements.lastProcessed.textContent = `Last processed: ${processedDate}`;
        elements.lastProcessed.style.display = 'block';
      }
      
      // Display the summary
      await showProcessSummary(summaryData.data);
      
      // Add completed status
      updateStatus('ready', `Last conversion: ${summaryData.data.files.length} files processed`);
    } else {
      console.log('📄 No saved summary found');
      if (elements.lastProcessed) {
        elements.lastProcessed.style.display = 'none';
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not load last summary:', error);
  }
}

/**
 * Save current summary to session storage
 */
async function saveSummary(data) {
  try {
    const summaryData = {
      timestamp: Date.now(),
      data: data
    };
    
    await chrome.storage.session.set({
      lastProcessSummary: summaryData
    });
    
    console.log('💾 Summary saved to session storage');
  } catch (error) {
    console.warn('⚠️ Could not save summary:', error);
  }
}

/**
 * Clear saved summary
 */
async function clearSavedSummary() {
  try {
    await chrome.storage.session.remove(['lastProcessSummary']);
    console.log('🗑️ Summary cleared from session storage');
    
    if (elements.lastProcessed) {
      elements.lastProcessed.style.display = 'none';
    }
    
    // Hide summary
    elements.processSummary.style.display = 'none';
    updateStatus('ready', 'Ready for processing');
  } catch (error) {
    console.warn('⚠️ Could not clear summary:', error);
  }
}

/**
 * Toggle summary visibility
 */
function toggleSummary() {
  const isVisible = elements.processSummary.style.display !== 'none';
  elements.processSummary.style.display = isVisible ? 'none' : 'block';
  
  if (elements.summaryToggle) {
    elements.summaryToggle.textContent = isVisible ? '📄 Show Last Summary' : '📄 Hide Summary';
  }
}

/**
 * Show test summary for debugging
 */
function showTestSummary() {
  const testData = {
    files: [
      {
        name: 'sample-image.jpg',
        dimensions: { width: 1920, height: 1080 }
      },
      {
        name: 'test-photo.png',
        dimensions: { width: 3000, height: 2000 }
      }
    ],
    settings: {
      outputFormat: 'jpeg',
      sizeOption: 'preset',
      preset: 'print-quality',
      quality: 80,
      dpi: 300,
      maintainAspectRatio: true
    }
  };
  
  showProcessSummary(testData);
}

/**
 * Show process summary with file details and settings
 */
async function showProcessSummary(data) {
  const { files, settings } = data;
  
  // Save summary to session storage
  await saveSummary(data);
  
  // Show summary section
  elements.processSummary.style.display = 'block';
  elements.progress.style.display = 'none';
  elements.results.style.display = 'none';
  
  // Update total files count
  elements.totalFiles.textContent = files.length;
  
  // Display files summary with actual resolutions
  let filesSummaryHTML = '';
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Get current resolution from file data
    let currentResolution = 'Reading...';
    if (file.dimensions) {
      if (file.dimensions.error) {
        currentResolution = 'Cannot read';
      } else {
        currentResolution = `${file.dimensions.width}×${file.dimensions.height}px`;
      }
    }
    
    // Calculate output resolution
    const outputResolution = calculateOutputResolutionFromData(file, settings);
    
    filesSummaryHTML += `
      <div class="file-summary-item">
        <span class="file-name-summary" title="${file.name}">${file.name}</span>
        <span class="resolution-summary">${currentResolution}</span>
        <span class="output-resolution-summary">${outputResolution}</span>
      </div>
    `;
  }
  elements.filesSummary.innerHTML = filesSummaryHTML;
  
  // Display conversion settings
  const presetName = settings.preset && PRINT_PRESETS[settings.preset] ? 
                    PRINT_PRESETS[settings.preset].name : 'Custom';
  
  const settingsHTML = `
    <div class="settings-grid">
      <div class="settings-item">
        <span class="settings-label">Output Format:</span>
        <span class="settings-value">${settings.outputFormat.toUpperCase()}</span>
      </div>
      <div class="settings-item">
        <span class="settings-label">Size Mode:</span>
        <span class="settings-value">${settings.sizeOption || 'original'}</span>
      </div>
      <div class="settings-item">
        <span class="settings-label">Preset:</span>
        <span class="settings-value">${presetName}</span>
      </div>
      <div class="settings-item">
        <span class="settings-label">Quality:</span>
        <span class="settings-value">${settings.quality || 80}%</span>
      </div>
      <div class="settings-item">
        <span class="settings-label">DPI:</span>
        <span class="settings-value">${settings.dpi || 300}</span>
      </div>
      <div class="settings-item">
        <span class="settings-label">Maintain Aspect:</span>
        <span class="settings-value">${settings.maintainAspectRatio ? 'Yes' : 'No'}</span>
      </div>
    </div>
  `;
  elements.settingsSummary.innerHTML = settingsHTML;
}

/**
 * Calculate output resolution from file data and settings (same logic as popup)
 */
function calculateOutputResolutionFromData(fileData, settings) {
  if (!fileData.dimensions || fileData.dimensions.error) {
    return 'Unknown';
  }
  
  const originalWidth = fileData.dimensions.width;
  const originalHeight = fileData.dimensions.height;
  
  let targetWidth, targetHeight;
  
  // Apply preset if specified
  if (settings.sizeOption === 'preset' && settings.preset && PRINT_PRESETS[settings.preset]) {
    const preset = PRINT_PRESETS[settings.preset];
    targetWidth = preset.width;
    targetHeight = preset.height;
  }
  // Custom dimensions
  else if (settings.sizeOption === 'custom') {
    targetWidth = settings.customWidth || 4500;
    targetHeight = settings.customHeight || 5400;
  }
  // Keep original size
  else {
    targetWidth = originalWidth;
    targetHeight = originalHeight;
  }
  
  // Apply aspect ratio adjustment if enabled
  if (settings.maintainAspectRatio && settings.sizeOption !== 'original') {
    const originalAspect = originalWidth / originalHeight;
    const targetAspect = targetWidth / targetHeight;
    
    if (originalAspect > targetAspect) {
      // Image is wider - fit to width
      targetHeight = Math.round(targetWidth / originalAspect);
    } else {
      // Image is taller - fit to height
      targetWidth = Math.round(targetHeight * originalAspect);
    }
  }
  
  return `${targetWidth}×${targetHeight}px`;
}

/**
 * Update current file display during processing
 */
function updateCurrentFileDisplay(file, originalFileData, settings) {
  if (!elements.currentFileDetails) return;
  
  // Get current resolution
  let currentResolution = 'Unknown';
  if (originalFileData.dimensions && !originalFileData.dimensions.error) {
    currentResolution = `${originalFileData.dimensions.width}×${originalFileData.dimensions.height}px`;
  }
  
  // Calculate output resolution
  const outputResolution = calculateOutputResolutionFromData(originalFileData, settings);
  
  // Format file size
  const fileSize = formatBytes(file.size);
  
  const currentFileHTML = `
    <div class="current-file-card">
      <div class="current-file-name">${file.name}</div>
      <div class="current-file-details">
        <div class="detail-item">
          <span class="detail-label">Current Size:</span>
          <span class="detail-value">${currentResolution}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Output Size:</span>
          <span class="detail-value">${outputResolution}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">File Size:</span>
          <span class="detail-value">${fileSize}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Format:</span>
          <span class="detail-value">${settings.outputFormat.toUpperCase()}</span>
        </div>
      </div>
    </div>
  `;
  
  elements.currentFileDetails.innerHTML = currentFileHTML;
}

/**
 * Format bytes for display
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Update processor status
 */
function updateStatus(type, message) {
  elements.status.className = `status ${type}`;
  elements.status.textContent = message;
}

/**
 * Show progress section
 */
function showProgress() {
  // Keep the summary visible during processing
  elements.processSummary.style.display = 'block';
  elements.progress.style.display = 'block';
  elements.results.style.display = 'none';
}

/**
 * Update progress display
 */
function updateProgress(current, total, text) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  elements.progressBar.style.width = percentage + '%';
  elements.progressText.textContent = text;
  
  // Notify background of progress
  chrome.runtime.sendMessage({
    type: 'CONVERSION_PROGRESS',
    data: {
      current: current,
      total: total,
      percentage: percentage,
      text: text
    }
  });
}

/**
 * Show results section
 */
function showResults() {
  // Keep summary visible but show results too
  elements.progress.style.display = 'none';
  elements.results.style.display = 'block';
  
  const successCount = ProcessorState.processedFiles.length;
  const errorCount = ProcessorState.errors.length;
  
  let resultsMessage = `Successfully processed ${successCount} files`;
  if (errorCount > 0) {
    resultsMessage += ` (${errorCount} errors)`;
  }
  
  elements.resultsText.textContent = resultsMessage;
  
  // Update the last processed timestamp
  if (elements.lastProcessed) {
    const processedDate = new Date().toLocaleString();
    elements.lastProcessed.textContent = `Last processed: ${processedDate}`;
    elements.lastProcessed.style.display = 'block';
  }
}

/**
 * Image processing class with real Canvas API implementation
 */
class ImageProcessor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.maxCanvasSize = 32767; // Maximum canvas dimension
    console.log('🖼️ ImageProcessor initialized with Canvas API');
  }
  
  /**
   * Process image file with given settings
   */
  async processImage(file, settings) {
    try {
      console.log('🔄 Processing image:', file.name, 'with settings:', settings);
      
      // Load image from file
      const img = await this.loadImage(file);
      console.log(`📏 Original image: ${img.width}x${img.height}`);
      
      // Determine target dimensions
      const targetDimensions = this.getTargetDimensions(img, settings);
      console.log(`🎯 Target dimensions: ${targetDimensions.width}x${targetDimensions.height}`);
      
      // Validate dimensions
      if (targetDimensions.width > this.maxCanvasSize || targetDimensions.height > this.maxCanvasSize) {
        throw new Error(`Image dimensions too large. Max: ${this.maxCanvasSize}px`);
      }
      
      // Setup canvas
      this.canvas.width = targetDimensions.width;
      this.canvas.height = targetDimensions.height;
      
      // Clear canvas and set quality
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      // Draw image
      if (settings.maintainAspectRatio) {
        this.drawImageWithAspectRatio(img, targetDimensions);
      } else {
        this.ctx.drawImage(img, 0, 0, targetDimensions.width, targetDimensions.height);
      }
      
      // Convert to target format with DPI information
      console.log(`🔧 About to convert to blob with settings:`, {
        format: settings.outputFormat,
        quality: settings.quality || 0.9,
        dpi: settings.dpi || 300
      });
      
      const blob = await this.convertToBlob(settings.outputFormat, settings.quality || 0.9, settings.dpi || 300);
      
      console.log(`✅ Image processed successfully: ${blob.size} bytes, DPI: ${settings.dpi || 300}`);
      return blob;
      
    } catch (error) {
      console.error('❌ Image processing failed:', error);
      throw error;
    }
  }
  
  /**
   * Load image from file
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      console.log('🖼️ Loading image from file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const img = new Image();
      
      img.onload = () => {
        console.log('✅ Image loaded successfully:', img.width, 'x', img.height);
        URL.revokeObjectURL(img.src); // Clean up
        resolve(img);
      };
      
      img.onerror = (event) => {
        console.error('❌ Image load error:', event);
        console.error('❌ File details:', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
        URL.revokeObjectURL(img.src); // Clean up
        reject(new Error('Failed to load image file'));
      };
      
      // Create object URL from file
      const objectUrl = URL.createObjectURL(file);
      console.log('🔗 Created object URL:', objectUrl);
      img.src = objectUrl;
    });
  }
  
  /**
   * Determine target dimensions based on settings
   */
  getTargetDimensions(img, settings) {
    let baseDimensions;
    
    // Apply preset if specified
    if (settings.preset && PRINT_PRESETS[settings.preset]) {
      const preset = PRINT_PRESETS[settings.preset];
      baseDimensions = {
        width: preset.width,
        height: preset.height,
        dpi: preset.dpi
      };
    }
    // Custom dimensions
    else if (settings.customWidth && settings.customHeight) {
      baseDimensions = {
        width: parseInt(settings.customWidth),
        height: parseInt(settings.customHeight),
        dpi: settings.dpi || 300
      };
    }
    // Scale by percentage
    else if (settings.scalePercent) {
      const scale = settings.scalePercent / 100;
      baseDimensions = {
        width: Math.round(img.width * scale),
        height: Math.round(img.height * scale),
        dpi: settings.dpi || 300
      };
    }
    // Default: keep original size
    else {
      baseDimensions = {
        width: img.width,
        height: img.height,
        dpi: settings.dpi || 300
      };
    }
    
    // Apply DPI scaling if different from default
    const targetDPI = settings.dpi || 300;
    if (settings.sizeOption !== 'original' && targetDPI !== baseDimensions.dpi) {
      const dpiScale = targetDPI / baseDimensions.dpi;
      baseDimensions.width = Math.round(baseDimensions.width * dpiScale);
      baseDimensions.height = Math.round(baseDimensions.height * dpiScale);
      console.log(`📏 Applied DPI scaling: ${baseDimensions.dpi} → ${targetDPI} (scale: ${dpiScale.toFixed(2)})`);
    }
    
    baseDimensions.dpi = targetDPI;
    return baseDimensions;
  }
  
  /**
   * Draw image maintaining aspect ratio
   */
  drawImageWithAspectRatio(img, targetDimensions) {
    const imgAspect = img.width / img.height;
    const targetAspect = targetDimensions.width / targetDimensions.height;
    
    let drawWidth, drawHeight, offsetX, offsetY;
    
    if (imgAspect > targetAspect) {
      // Image is wider - fit to width
      drawWidth = targetDimensions.width;
      drawHeight = targetDimensions.width / imgAspect;
      offsetX = 0;
      offsetY = (targetDimensions.height - drawHeight) / 2;
    } else {
      // Image is taller - fit to height
      drawHeight = targetDimensions.height;
      drawWidth = targetDimensions.height * imgAspect;
      offsetX = (targetDimensions.width - drawWidth) / 2;
      offsetY = 0;
    }
    
    // Fill background with white for transparent areas
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, targetDimensions.width, targetDimensions.height);
    
    // Draw the image
    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }
  
  /**
   * Resize image to specified dimensions
   */
  resizeImage(canvas, targetWidth, targetHeight, maintainAspectRatio) {
    // This method is integrated into processImage now
    console.log(`Resizing to ${targetWidth}x${targetHeight}, maintain aspect: ${maintainAspectRatio}`);
  }
  
  /**
   * Convert canvas to blob with specified format, quality, and DPI
   */
  convertToBlob(outputFormat, quality = 0.9, dpi = 300) {
    return new Promise((resolve, reject) => {
      const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
      
      console.log(`🎯 convertToBlob called with: format=${outputFormat}, quality=${quality}, dpi=${dpi}`);
      
      this.canvas.toBlob(async (blob) => {
        if (blob) {
          console.log(`📦 Canvas toBlob created blob: ${blob.size} bytes, type: ${blob.type}`);
          
          // For JPEG files, try to add DPI metadata using a simple approach
          if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
            console.log(`🔧 Processing JPEG with DPI: ${dpi}`);
            try {
              const blobWithDPI = await this.addDPIToJPEG(blob, dpi);
              resolve(blobWithDPI);
            } catch (error) {
              console.warn('Failed to add DPI metadata, using original blob:', error);
              resolve(blob);
            }
          } else {
            // For PNG files, add pHYs chunk for DPI
            console.log(`🔧 Processing PNG with DPI: ${dpi}`);
            try {
              const blobWithDPI = await this.addDPIToPNG(blob, dpi);
              resolve(blobWithDPI);
            } catch (error) {
              console.warn('Failed to add DPI metadata to PNG, using original blob:', error);
              resolve(blob);
            }
          }
        } else {
          reject(new Error('Failed to convert image to blob'));
        }
      }, mimeType, quality);
    });
  }
  
  /**
   * Add DPI metadata to JPEG blob
   */
  async addDPIToJPEG(blob, dpi) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      console.log(`📏 Adding ${dpi} DPI to JPEG (${blob.size} bytes)`);
      
      // Find SOI marker (0xFFD8)
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
        throw new Error('Invalid JPEG file');
      }
      
      // Create APP0/JFIF segment with DPI
      const jfifSegment = new Uint8Array([
        0xFF, 0xE0,           // APP0 marker
        0x00, 0x10,           // Length: 16 bytes (including length field)
        0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
        0x01, 0x01,           // JFIF version 1.1
        0x01,                 // Units: 1 = DPI
        (dpi >> 8) & 0xFF, dpi & 0xFF,    // X density
        (dpi >> 8) & 0xFF, dpi & 0xFF,    // Y density  
        0x00, 0x00            // No thumbnail
      ]);
      
      console.log(`📏 Created JFIF segment with DPI ${dpi}:`, Array.from(jfifSegment).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      
      let insertPos = 2; // After SOI
      let skipBytes = 0;
      
      // Check if there's already an APP0 segment and remove it
      if (bytes.length > 4 && bytes[2] === 0xFF && bytes[3] === 0xE0) {
        const existingLength = (bytes[4] << 8) | bytes[5];
        skipBytes = 2 + 2 + existingLength; // Skip marker + length + data
        console.log(`📏 Removing existing APP0 segment (${existingLength} bytes)`);
      }
      
      // Create new JPEG: SOI + new APP0 + rest of file
      const newSize = 2 + jfifSegment.length + (bytes.length - 2 - skipBytes);
      const newBytes = new Uint8Array(newSize);
      
      // Copy SOI
      newBytes[0] = 0xFF;
      newBytes[1] = 0xD8;
      
      // Insert new JFIF segment
      newBytes.set(jfifSegment, 2);
      
      // Copy rest of original file (after SOI and any existing APP0)
      newBytes.set(bytes.subarray(2 + skipBytes), 2 + jfifSegment.length);
      
      const newBlob = new Blob([newBytes], { type: 'image/jpeg' });
      
      console.log(`✅ Successfully added ${dpi} DPI to JPEG. Size: ${blob.size} → ${newBlob.size} bytes`);
      return newBlob;
      
    } catch (error) {
      console.error('Error adding DPI to JPEG:', error);
      console.log('📏 Returning original blob without DPI metadata');
      return blob;
    }
  }

  /**
   * Add DPI metadata to PNG blob using pHYs chunk
   */
  async addDPIToPNG(blob, dpi) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      console.log(`📏 Adding ${dpi} DPI to PNG (${blob.size} bytes)`);
      
      // PNG signature check
      const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      for (let i = 0; i < 8; i++) {
        if (bytes[i] !== pngSignature[i]) {
          throw new Error('Invalid PNG file');
        }
      }
      
      // Convert DPI to pixels per meter (PNG uses meters)
      const pixelsPerMeter = Math.round(dpi * 39.3701); // 1 inch = 39.3701 pixels/meter
      
      // Create pHYs chunk data
      const physChunk = new Uint8Array(21); // 4 bytes length + 4 bytes type + 9 bytes data + 4 bytes CRC
      let pos = 0;
      
      // Length (9 bytes)
      physChunk[pos++] = 0x00;
      physChunk[pos++] = 0x00;
      physChunk[pos++] = 0x00;
      physChunk[pos++] = 0x09;
      
      // Chunk type "pHYs"
      physChunk[pos++] = 0x70; // 'p'
      physChunk[pos++] = 0x48; // 'H'
      physChunk[pos++] = 0x59; // 'Y'
      physChunk[pos++] = 0x73; // 's'
      
      // X pixels per unit (4 bytes, big endian)
      physChunk[pos++] = (pixelsPerMeter >>> 24) & 0xFF;
      physChunk[pos++] = (pixelsPerMeter >>> 16) & 0xFF;
      physChunk[pos++] = (pixelsPerMeter >>> 8) & 0xFF;
      physChunk[pos++] = pixelsPerMeter & 0xFF;
      
      // Y pixels per unit (4 bytes, big endian)
      physChunk[pos++] = (pixelsPerMeter >>> 24) & 0xFF;
      physChunk[pos++] = (pixelsPerMeter >>> 16) & 0xFF;
      physChunk[pos++] = (pixelsPerMeter >>> 8) & 0xFF;
      physChunk[pos++] = pixelsPerMeter & 0xFF;
      
      // Unit specifier (1 = meters)
      physChunk[pos++] = 0x01;
      
      // Calculate CRC32 for type + data
      const crcData = physChunk.slice(4, 17); // Type + data
      const crc = this.calculateCRC32(crcData);
      
      // Add CRC
      physChunk[pos++] = (crc >>> 24) & 0xFF;
      physChunk[pos++] = (crc >>> 16) & 0xFF;
      physChunk[pos++] = (crc >>> 8) & 0xFF;
      physChunk[pos++] = crc & 0xFF;
      
      // Find IHDR chunk end (should be at position 33)
      let insertPos = 8; // Skip PNG signature
      
      // Read IHDR chunk length
      const ihdrLength = (bytes[insertPos] << 24) | (bytes[insertPos + 1] << 16) | 
                        (bytes[insertPos + 2] << 8) | bytes[insertPos + 3];
      insertPos += 4 + 4 + ihdrLength + 4; // Skip length + type + data + CRC
      
      // Create new PNG with pHYs chunk inserted after IHDR
      const newBytes = new Uint8Array(bytes.length + 21);
      newBytes.set(bytes.subarray(0, insertPos), 0);
      newBytes.set(physChunk, insertPos);
      newBytes.set(bytes.subarray(insertPos), insertPos + 21);
      
      const newBlob = new Blob([newBytes], { type: 'image/png' });
      
      console.log(`✅ Successfully added ${dpi} DPI (${pixelsPerMeter} ppm) to PNG. Size: ${blob.size} → ${newBlob.size} bytes`);
      return newBlob;
      
    } catch (error) {
      console.error('Error adding DPI to PNG:', error);
      console.log('📏 Returning original PNG blob without DPI metadata');
      return blob;
    }
  }

  /**
   * Calculate CRC32 checksum for PNG chunks
   */
  calculateCRC32(data) {
    let crc = 0xFFFFFFFF;
    const crcTable = this.getCRC32Table();
    
    for (let i = 0; i < data.length; i++) {
      crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /**
   * Get CRC32 lookup table
   */
  getCRC32Table() {
    if (!this.crcTable) {
      this.crcTable = new Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        this.crcTable[i] = c;
      }
    }
    return this.crcTable;
  }

  /**
   * Convert image format
   */
  convertFormat(canvas, outputFormat, quality) {
    // This method is integrated into convertToBlob now
    console.log(`Converting to ${outputFormat} with quality ${quality}`);
  }
  
  /**
   * Apply professional print preset
   */
  applyPreset(canvas, presetName) {
    const preset = PRINT_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }
    
    console.log(`Applying preset: ${preset.name} (${preset.width}x${preset.height})`);
    return this.resizeImage(canvas, preset.width, preset.height, true);
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.canvas) {
      this.canvas.width = 1;
      this.canvas.height = 1;
      this.canvas = null;
      this.ctx = null;
    }
  }
}

/**
 * Windows system asset detector
 */
class SystemAssetDetector {
  /**
   * Detect if file is a Windows system asset
   */
  detectAssetFile(file) {
    // Safety check - ensure file and file.name exist
    if (!file || !file.name) {
      console.warn('Invalid file object passed to asset detector');
      return false;
    }
    
    // Check file characteristics for Windows system assets
    const hasNoExtension = !file.name.includes('.');
    const isLargeEnough = file.size > 100000; // 100KB threshold
    const hasCorrectMimeType = file.type === 'application/octet-stream' || file.type === '';
    
    return hasNoExtension && isLargeEnough && hasCorrectMimeType;
  }
  
  /**
   * Scan for Windows system assets (placeholder)
   */
  async scanSystemAssets() {
    // This would scan common Windows asset locations
    // For now, return empty array as file system access is limited
    console.log('Scanning for Windows system assets...');
    return [];
  }
}

// Initialize global processor instance
const processor = new ImageProcessor();
const assetDetector = new SystemAssetDetector();

// Handle page unload cleanup
window.addEventListener('beforeunload', () => {
  processor.cleanup();
});

// Error handling
window.addEventListener('error', (event) => {
  console.error('Processor error:', event.error);
  updateStatus('error', 'Processing error: ' + event.error.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in processor:', event.reason);
  updateStatus('error', 'Processing error: ' + event.reason);
});

console.log('File Converter Pro processor script loaded');
