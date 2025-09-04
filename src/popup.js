/**
 * File Converter Pro - Popup Interface Controller
 * Main UI logic and user interaction handling
 */

// Application state
const AppState = {
  selectedFiles: [],
  conversionSettings: {
    outputFormat: 'jpeg',
    sizeOption: 'original',
    preset: 'print-quality',
    customWidth: 4500,
    customHeight: 5400,
    maintainAspectRatio: true,
    quality: 80,
    dpi: 300
  },
  isProcessing: false
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
 * Initialize the popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * Main initialization function
 */
async function initializePopup() {
  try {
    // Get DOM elements
    cacheDOMElements();
    
    // Load user preferences
    await loadUserPreferences();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI state
    updateUI();
    
    console.log('File Converter Pro initialized successfully');
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showError('Failed to initialize extension. Please try again.');
  }
}

/**
 * Cache DOM elements for better performance
 */
function cacheDOMElements() {
  elements = {
    // File selection
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    browseBtn: document.getElementById('browseBtn'),
    findAssetsBtn: document.getElementById('findAssetsBtn'),
    
    // File list
    fileListSection: document.getElementById('fileListSection'),
    fileItems: document.getElementById('fileItems'),
    clearBtn: document.getElementById('clearBtn'),
    
    // Options
    optionsSection: document.getElementById('optionsSection'),
    outputFormat: document.getElementById('outputFormat'),
    sizeOptions: document.querySelectorAll('input[name="sizeOption"]'),
    presetGroup: document.getElementById('presetGroup'),
    presetSelect: document.getElementById('presetSelect'),
    customGroup: document.getElementById('customGroup'),
    customWidth: document.getElementById('customWidth'),
    customHeight: document.getElementById('customHeight'),
    maintainAspectRatio: document.getElementById('maintainAspectRatio'),
    qualitySlider: document.getElementById('qualitySlider'),
    qualityValue: document.getElementById('qualityValue'),
    dpiSelect: document.getElementById('dpiSelect'),
    // Download prefs
    downloadSubfolder: document.getElementById('downloadSubfolder'),
    showInFolderAfterDownload: document.getElementById('showInFolderAfterDownload'),
    
    // Actions
    actionsSection: document.getElementById('actionsSection'),
    convertBtn: document.getElementById('convertBtn'),
    
    // Progress
    progressSection: document.getElementById('progressSection'),
    progressText: document.getElementById('progressText'),
    progressPercent: document.getElementById('progressPercent'),
    progressFill: document.getElementById('progressFill'),
    
    // Results
    resultsSection: document.getElementById('resultsSection'),
    successText: document.getElementById('successText'),
    newConversionBtn: document.getElementById('newConversionBtn'),
    
    // Error
    errorSection: document.getElementById('errorSection'),
    errorText: document.getElementById('errorText'),
    retryBtn: document.getElementById('retryBtn')
  };
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  console.log('🔗 Setting up event listeners...');
  
  // Debug: Check if elements exist
  console.log('dropZone element:', elements.dropZone);
  console.log('browseBtn element:', elements.browseBtn);
  console.log('fileInput element:', elements.fileInput);
  
  // File selection events
  if (elements.dropZone) {
    elements.dropZone.addEventListener('click', () => {
      console.log('🖱️ Drop zone clicked!');
      if (elements.fileInput) {
        elements.fileInput.click();
      } else {
        console.error('❌ File input not found!');
      }
    });
  } else {
    console.error('❌ Drop zone not found!');
  }
  
  if (elements.browseBtn) {
    elements.browseBtn.addEventListener('click', () => {
      console.log('🖱️ Browse button clicked!');
      if (elements.fileInput) {
        elements.fileInput.click();
      } else {
        console.error('❌ File input not found!');
      }
    });
  } else {
    console.error('❌ Browse button not found!');
  }
  
  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', handleFileSelection);
    console.log('✅ File input change listener added');
  } else {
    console.error('❌ File input not found!');
  }
  
  if (elements.findAssetsBtn) {
    elements.findAssetsBtn.addEventListener('click', handleFindAssets);
  }
  
  if (elements.clearBtn) {
    elements.clearBtn.addEventListener('click', handleClearFiles);
  }
  
  // Drag and drop events
  setupDragDropListeners();
  
  // Option change events
  elements.outputFormat.addEventListener('change', updateConversionSettings);
  elements.sizeOptions.forEach(radio => {
    radio.addEventListener('change', handleSizeOptionChange);
  });
  elements.presetSelect.addEventListener('change', updateConversionSettings);
  elements.customWidth.addEventListener('input', updateConversionSettings);
  elements.customHeight.addEventListener('input', updateConversionSettings);
  elements.maintainAspectRatio.addEventListener('change', updateConversionSettings);
  elements.qualitySlider.addEventListener('input', handleQualityChange);
  elements.dpiSelect.addEventListener('change', updateConversionSettings);
  
  // Action buttons
  if (elements.convertBtn) {
    console.log('🔘 Setting up convert button listener');
    elements.convertBtn.addEventListener('click', handleConversion);
  } else {
    console.error('❌ Convert button not found!');
  }
  
  if (elements.newConversionBtn) {
    elements.newConversionBtn.addEventListener('click', handleNewConversion);
  }
  
  if (elements.retryBtn) {
    elements.retryBtn.addEventListener('click', handleRetry);
  }
}

/**
 * Set up drag and drop functionality
 */
function setupDragDropListeners() {
  console.log('🎯 Setting up drag and drop listeners...');
  
  if (!elements.dropZone) {
    console.error('❌ Drop zone not found for drag and drop!');
    return;
  }
  
  console.log('✅ Drop zone found, adding drag and drop listeners');
  
  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  // Highlight drop zone on drag over
  ['dragenter', 'dragover'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, highlightDropZone, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, unhighlightDropZone, false);
  });
  
  // Handle file drop
  elements.dropZone.addEventListener('drop', handleFileDrop, false);
  
  console.log('✅ Drag and drop listeners added successfully');
}

/**
 * Prevent default drag behaviors
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Highlight drop zone during drag over
 */
function highlightDropZone() {
  elements.dropZone.classList.add('drag-over');
}

/**
 * Remove highlight from drop zone
 */
function unhighlightDropZone() {
  elements.dropZone.classList.remove('drag-over');
}

/**
 * Handle file drop
 */
function handleFileDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  processFiles(files);
}

/**
 * Load actual image dimensions for files
 */
async function loadImageDimensions(files) {
  console.log('📏 Loading image dimensions for', files.length, 'files...');
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const dimensions = await getImageDimensions(file);
      
      // Find the file in selectedFiles and add dimensions
      const fileIndex = AppState.selectedFiles.findIndex(f => 
        f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      
      if (fileIndex >= 0) {
        AppState.selectedFiles[fileIndex].dimensions = dimensions;
        console.log(`📏 ${file.name}: ${dimensions.width}x${dimensions.height}px`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not read dimensions for ${file.name}:`, error);
      // Add placeholder dimensions for files that can't be read
      const fileIndex = AppState.selectedFiles.findIndex(f => 
        f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      
      if (fileIndex >= 0) {
        AppState.selectedFiles[fileIndex].dimensions = { width: '?', height: '?', error: error.message };
      }
    }
  }
}

/**
 * Get actual image dimensions from file
 */
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Loading dimensions for: ${file.name} (type: ${file.type})`);
    
    const img = new Image();
    
    img.onload = function() {
      const dimensions = {
        width: this.naturalWidth || this.width,
        height: this.naturalHeight || this.height
      };
      console.log(`✅ Loaded dimensions: ${dimensions.width}x${dimensions.height}px`);
      URL.revokeObjectURL(img.src); // Clean up
      resolve(dimensions);
    };
    
    img.onerror = function(error) {
      console.warn(`❌ Failed to load image ${file.name}:`, error);
      URL.revokeObjectURL(img.src); // Clean up
      
      // For Windows assets, try with different MIME types
      if (!file.type || file.type === 'application/octet-stream') {
        console.log(`🔄 Retrying with JPEG MIME type for ${file.name}`);
        retryWithMimeType(file, 'image/jpeg').then(resolve).catch(() => {
          // If all else fails, return placeholder dimensions
          console.log(`⚠️ Using placeholder dimensions for ${file.name}`);
          resolve({ width: 1920, height: 1080 }); // Common wallpaper size
        });
      } else {
        reject(new Error('Failed to load image'));
      }
    };
    
    // Create object URL from file
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

/**
 * Retry loading image with different MIME type
 */
function retryWithMimeType(file, mimeType) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = function() {
      const dimensions = {
        width: this.naturalWidth || this.width,
        height: this.naturalHeight || this.height
      };
      console.log(`✅ Retry successful: ${dimensions.width}x${dimensions.height}px`);
      URL.revokeObjectURL(img.src);
      resolve(dimensions);
    };
    
    img.onerror = function() {
      URL.revokeObjectURL(img.src);
      reject(new Error('Retry failed'));
    };
    
    // Create new file with proper MIME type
    const newFile = new File([file], file.name, { type: mimeType });
    const objectUrl = URL.createObjectURL(newFile);
    img.src = objectUrl;
  });
}

/**
 * Handle file selection via input
 */
function handleFileSelection(e) {
  const files = e.target.files;
  processFiles(files);
}

/**
 * Process selected files
 */
async function processFiles(files) {
  const validFiles = [];
  const errors = [];
  
  for (let file of files) {
    if (isValidImageFile(file)) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: Unsupported file type`);
    }
  }
  
  if (validFiles.length > 0) {
    AppState.selectedFiles = [...AppState.selectedFiles, ...validFiles];
    console.log('📁 Added files to state:', validFiles.length, 'Total files:', AppState.selectedFiles.length);
    
    // Auto-detect and set output format based on input files
    autoDetectOutputFormat(validFiles);
    
    // Read actual image dimensions for each file
    await loadImageDimensions(validFiles);
    
    updateFileList();
    showOptionsAndActions();
    updateUI();
  }
  
  if (errors.length > 0) {
    showError(errors.join('\n'));
  }
}

/**
 * Auto-detect output format based on input files
 */
function autoDetectOutputFormat(files) {
  if (files.length === 0) return;
  
  // Analyze the file types
  const fileTypes = files.map(file => {
    if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
      return 'png';
    } else if (file.type === 'image/jpeg' || file.type === 'image/jpg' || 
               file.name.toLowerCase().endsWith('.jpg') || 
               file.name.toLowerCase().endsWith('.jpeg')) {
      return 'jpeg';
    } else {
      // Default for unknown types (like Windows assets)
      return 'jpeg';
    }
  });
  
  // Determine most common format
  const pngCount = fileTypes.filter(type => type === 'png').length;
  const jpegCount = fileTypes.filter(type => type === 'jpeg').length;
  
  const detectedFormat = pngCount > jpegCount ? 'png' : 'jpeg';
  
  // Update the dropdown
  if (elements.outputFormat) {
    elements.outputFormat.value = detectedFormat;
    AppState.conversionSettings.outputFormat = detectedFormat;
    console.log(`🔍 Auto-detected output format: ${detectedFormat} (PNG: ${pngCount}, JPEG: ${jpegCount})`);
  }
}

/**
 * Check if file is a valid image
 */
function isValidImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const validExtensions = ['.jpg', '.jpeg', '.png'];
  
  // Check MIME type
  if (validTypes.includes(file.type)) {
    return true;
  }
  
  // Check extension for files without MIME type (like Windows assets)
  if (file.type === 'application/octet-stream' || file.type === '') {
    // Could be a Windows system asset - allow for now
    return true;
  }
  
  // Check file extension
  const extension = file.name.toLowerCase().split('.').pop();
  return validExtensions.includes(`.${extension}`);
}

/**
 * Handle Windows asset detection and processing
 */
async function handleFindAssets() {
  try {
    console.log('🔍 Starting Windows Assets processing...');
    
    // Show loading state
    elements.findAssetsBtn.disabled = true;
    elements.findAssetsBtn.textContent = '🔄 Processing...';
    
    // Check if File System Access API is supported
    console.log('📁 File System Access API available:', !!window.showDirectoryPicker);
    if (!window.showDirectoryPicker) {
      console.log('⚠️ File System Access API not available, using file input fallback');
      // Fallback: Use file input to select multiple files from Assets folder
      showAssetFileInput();
      return;
    }
    
    // Open directory picker for Windows Assets folder
    const directoryHandle = await window.showDirectoryPicker({
      startIn: 'documents',
      mode: 'read'
    });
    
    // Process all files in the selected directory
    await processWindowsAssets(directoryHandle);
    
  } catch (error) {
    console.error('Error accessing Windows assets:', error);
    
    if (error.name === 'AbortError') {
      // User cancelled the directory picker
      showError('Directory selection cancelled.');
    } else {
      // Fallback to showing paths
      const genericPath = '%USERPROFILE%\\AppData\\Local\\Packages\\Microsoft.Windows.ContentDeliveryManager_cw5n1h2txyewy\\LocalState\\Assets';
      const examplePath = 'C:\\Users\\Rob\\AppData\\Local\\Packages\\Microsoft.Windows.ContentDeliveryManager_cw5n1h2txyewy\\LocalState\\Assets';
      const msg = [
        'Windows Spotlight assets folder (copy one of these into File Explorer):',
        '',
        `1) ${genericPath}`,
        `2) ${examplePath}`,
        '',
        'Tip: Files have no extensions. Copy them to another folder and add ".jpg" to view.'
      ].join('\n');
      
      showSuccessWithSave(msg, 'Windows_Spotlight_Paths.txt');
    }
  } finally {
    // Reset button state
    elements.findAssetsBtn.disabled = false;
    elements.findAssetsBtn.textContent = '🖼️ Find Windows Assets';
  }
}

/**
 * Show file input for selecting Windows Assets (fallback method)
 */
function showAssetFileInput() {
  hideAllSections();
  
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="margin-bottom: 16px; text-align: center;">
      <h3 style="color: #333; margin-bottom: 8px;">Select Windows Spotlight Assets</h3>
      <p style="color: #666; font-size: 14px; margin-bottom: 16px;">
        Navigate to your Windows Assets folder and select the image files you want to convert:
      </p>
      <div style="background: #f0f7ff; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-family: monospace; font-size: 12px; text-align: left;">
        <strong>Windows Assets Location:</strong><br>
        C:\\Users\\Rob\\AppData\\Local\\Packages\\Microsoft.Windows.ContentDeliveryManager_cw5n1h2txyewy\\LocalState\\Assets
      </div>
    </div>
    
    <div style="text-align: center; margin-bottom: 16px;">
      <input type="file" id="assetFileInput" multiple accept="*/*" style="display: none;">
      <button id="selectAssetFiles" style="background: #4A90E2; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; margin-right: 12px;">
        📁 Select Asset Files
      </button>
      <button id="cancelAssetSelection" style="background: #D0021B; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer;">
        ❌ Cancel
      </button>
    </div>
    
    <div style="text-align: center; font-size: 12px; color: #666;">
      <p><strong>Tip:</strong> In the file picker, navigate to the Assets folder above, then select all the files (Ctrl+A) and click Open.</p>
    </div>
  `;
  
  elements.resultsSection.style.display = 'block';
  elements.successText.innerHTML = '';
  elements.successText.appendChild(container);
  
  // Add event listeners
  const selectBtn = document.getElementById('selectAssetFiles');
  const cancelBtn = document.getElementById('cancelAssetSelection');
  const fileInput = document.getElementById('assetFileInput');
  
  if (selectBtn) {
    selectBtn.addEventListener('click', () => fileInput.click());
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => handleAssetFileSelection(e.target.files));
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideAllSections();
      showMainInterface();
    });
  }
}

/**
 * Handle asset file selection from file input
 */
function handleAssetFileSelection(files) {
  try {
    const assetFiles = Array.from(files).map(file => {
      // Create a new File object with .jpg extension for processing
      const modifiedFile = new File([file], file.name + '.jpg', { type: 'image/jpeg' });
      return {
        file: modifiedFile,
        originalName: file.name,
        size: file.size
      };
    });
    
    if (assetFiles.length === 0) {
      showError('No files selected. Please try again.');
      return;
    }
    
    // Show found assets and let user choose which ones to process
    showAssetSelection(assetFiles);
    
  } catch (error) {
    console.error('Error processing selected asset files:', error);
    showError('Error processing selected files. Please try again.');
  }
}

/**
 * Process Windows Assets from selected directory
 */
async function processWindowsAssets(directoryHandle) {
  try {
    const assetFiles = [];
    
    // Iterate through all files in the directory
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === 'file') {
        // Check if it's likely an image file (no extension, reasonable size)
        const file = await handle.getFile();
        
        // Filter for likely image files (no extension, reasonable size)
        if (!name.includes('.') && file.size > 10000 && file.size < 50000000) {
          // Create a File object with .jpg extension for processing
          const modifiedFile = new File([file], name + '.jpg', { type: 'image/jpeg' });
          assetFiles.push({
            file: modifiedFile,
            originalName: name,
            size: file.size
          });
        }
      }
    }
    
    if (assetFiles.length === 0) {
      showError('No Windows Spotlight assets found in the selected folder. Make sure you selected the correct Assets folder.');
      return;
    }
    
    // Show found assets and let user choose which ones to process
    showAssetSelection(assetFiles);
    
  } catch (error) {
    console.error('Error processing Windows assets:', error);
    showError('Error reading files from the selected directory. Please try again.');
  }
}

/**
 * Show asset selection interface
 */
function showAssetSelection(assetFiles) {
  hideAllSections();
  
  // Create selection interface
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="margin-bottom: 16px; text-align: center;">
      <h3 style="color: #333; margin-bottom: 8px;">Found ${assetFiles.length} Windows Spotlight Assets</h3>
      <p style="color: #666; font-size: 14px;">Select which assets you want to convert and save:</p>
    </div>
    
    <div id="assetList" style="max-height: 300px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px; padding: 12px;">
      ${assetFiles.map((asset, index) => `
        <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
          <input type="checkbox" id="asset-${index}" checked style="margin-right: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 500; color: #333;">${asset.originalName}</div>
            <div style="font-size: 12px; color: #666;">${formatFileSize(asset.size)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div style="text-align: center;">
      <button id="processSelectedAssets" style="background: #7ED321; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; margin-right: 12px;">
        🔄 Convert Selected Assets
      </button>
      <button id="selectAllAssets" style="background: #4A90E2; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; margin-right: 12px;">
        ✅ Select All
      </button>
      <button id="cancelAssetProcessing" style="background: #D0021B; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer;">
        ❌ Cancel
      </button>
    </div>
  `;
  
  elements.resultsSection.style.display = 'block';
  elements.successText.innerHTML = '';
  elements.successText.appendChild(container);
  
  // Add event listeners
  const processBtn = document.getElementById('processSelectedAssets');
  const selectAllBtn = document.getElementById('selectAllAssets');
  const cancelBtn = document.getElementById('cancelAssetProcessing');
  
  if (processBtn) {
    processBtn.addEventListener('click', () => processSelectedAssets(assetFiles));
  }
  
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('#assetList input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideAllSections();
      showMainInterface();
    });
  }
}

/**
 * Process selected Windows assets
 */
async function processSelectedAssets(assetFiles) {
  try {
    const selectedAssets = [];
    
    // Get selected assets
    assetFiles.forEach((asset, index) => {
      const checkbox = document.getElementById(`asset-${index}`);
      if (checkbox && checkbox.checked) {
        selectedAssets.push(asset.file);
      }
    });
    
    if (selectedAssets.length === 0) {
      showError('Please select at least one asset to convert.');
      return;
    }
    
    // Add selected assets to the file list
    AppState.selectedFiles = selectedAssets;
    updateFileList();
    showOptionsAndActions();
    
    // Hide the asset selection interface
    hideAllSections();
    
    // Show success message
    showSuccess(`Added ${selectedAssets.length} Windows Spotlight assets for conversion. Configure your settings and click "Convert Files" to process them.`);
    
  } catch (error) {
    console.error('Error processing selected assets:', error);
    showError('Error processing selected assets. Please try again.');
  }
}

/**
 * Clear all selected files
 */
function handleClearFiles() {
  AppState.selectedFiles = [];
  updateFileList();
  hideOptionsAndActions();
  elements.fileInput.value = '';
}

/**
 * Update file list display
 */
function updateFileList() {
  if (AppState.selectedFiles.length === 0) {
    elements.fileListSection.style.display = 'none';
    return;
  }
  
  elements.fileListSection.style.display = 'block';
  elements.fileItems.innerHTML = '';
  
  AppState.selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    // Get current resolution display
    let currentResolution = 'Loading...';
    if (file.dimensions) {
      if (file.dimensions.error) {
        currentResolution = 'Cannot read';
      } else {
        currentResolution = `${file.dimensions.width}×${file.dimensions.height}px`;
      }
    }
    
    // Calculate and display output resolution
    const outputResolution = calculateOutputResolution(file);
    
    fileItem.innerHTML = `
      <div class="file-info">
        <span class="file-name" title="${file.name}">${file.name}</span>
        <div class="resolution-info">
          <span class="current-resolution">Current: ${currentResolution}</span>
          <span class="arrow">→</span>
          <span class="output-resolution">Output: ${outputResolution}</span>
        </div>
        <span class="file-size">${formatFileSize(file.size)}</span>
      </div>
    `;
    elements.fileItems.appendChild(fileItem);
  });
}

/**
 * Calculate output resolution for a file based on current settings
 */
function calculateOutputResolution(file) {
  if (!file.dimensions || file.dimensions.error) {
    return 'Unknown';
  }
  
  const settings = AppState.conversionSettings;
  const originalWidth = file.dimensions.width;
  const originalHeight = file.dimensions.height;
  
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
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Show options and actions sections
 */
function showOptionsAndActions() {
  console.log('👁️ Showing options and actions');
  elements.optionsSection.style.display = 'block';
  elements.actionsSection.style.display = 'block';
  
  // Ensure button is visible and check state
  if (elements.convertBtn) {
    console.log('🔘 Convert button found and visible');
  } else {
    console.error('❌ Convert button missing!');
  }
}

/**
 * Hide options and actions sections
 */
function hideOptionsAndActions() {
  elements.optionsSection.style.display = 'none';
  elements.actionsSection.style.display = 'none';
}

/**
 * Handle size option change
 */
function handleSizeOptionChange(e) {
  const selectedOption = e.target.value;
  AppState.conversionSettings.sizeOption = selectedOption;
  
  // Show/hide relevant option groups
  elements.presetGroup.style.display = selectedOption === 'preset' ? 'block' : 'none';
  elements.customGroup.style.display = selectedOption === 'custom' ? 'block' : 'none';
  
  updateConversionSettings();
  updateFileList(); // Refresh output resolution display
}

/**
 * Handle quality slider change
 */
function handleQualityChange(e) {
  const quality = e.target.value;
  AppState.conversionSettings.quality = parseInt(quality);
  elements.qualityValue.textContent = quality + '%';
}

/**
 * Update conversion settings from form
 */
function updateConversionSettings() {
  AppState.conversionSettings = {
    ...AppState.conversionSettings,
    outputFormat: elements.outputFormat.value,
    preset: elements.presetSelect.value,
    customWidth: parseInt(elements.customWidth.value) || 4500,
    customHeight: parseInt(elements.customHeight.value) || 5400,
    maintainAspectRatio: elements.maintainAspectRatio.checked,
    quality: parseInt(elements.qualitySlider.value),
    dpi: parseInt(elements.dpiSelect.value)
  };
  
  // Update file list to refresh output resolution display
  updateFileList();
}

/**
 * Handle conversion process
 */
async function handleConversion(event) {
  console.log('🔄 Convert button clicked!');
  
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  if (AppState.selectedFiles.length === 0) {
    showError('Please select files to convert');
    return;
  }
  
  // Check if Chrome APIs are available
  if (!chrome || !chrome.runtime) {
    showError('Chrome extension APIs not available');
    return;
  }
  
  try {
    AppState.isProcessing = true;
    showProgress();
    updateConversionSettings();
    
    console.log('🚀 Starting real image processing with Canvas API');
    console.log('📁 Files to process:', AppState.selectedFiles.length);
    console.log('⚙️ Settings:', AppState.conversionSettings);
    
    // Send files to processing tab for real conversion
    await startRealConversion();
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    showError('Conversion failed: ' + error.message);
    AppState.isProcessing = false;
  }
}

/**
 * Start real conversion process using background script and processing tab
 */
async function startRealConversion() {
  return new Promise(async (resolve, reject) => {
    // Set up message listener for progress updates
    const messageListener = (message) => {
      switch (message.type) {
        case 'CONVERSION_PROGRESS':
          updateProgress(message.data.percentage, message.data.text);
          break;
          
        case 'CONVERSION_COMPLETE':
          chrome.runtime.onMessage.removeListener(messageListener);
          AppState.isProcessing = false;
          const filesProcessed = message.data.filesProcessed || 0;
          const errors = message.data.errors || [];
          
          if (errors.length === 0) {
            showSuccess(`Successfully converted ${filesProcessed} files!`);
          } else {
            showSuccess(`Converted ${filesProcessed} files with ${errors.length} errors.`);
          }
          resolve();
          break;
          
        case 'CONVERSION_ERROR':
          chrome.runtime.onMessage.removeListener(messageListener);
          AppState.isProcessing = false;
          reject(new Error(message.data.error));
          break;
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    console.log('📤 Preparing files for conversion...');
    
    try {
      // Convert File objects to serializable format
      const serializedFiles = await Promise.all(AppState.selectedFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          dimensions: file.dimensions, // Include actual dimensions read from the image
          data: Array.from(new Uint8Array(arrayBuffer)) // Convert to array for serialization
        };
      }));
    
      console.log('📤 Sending conversion request to background script...');
      
      // Send conversion request to background script
      chrome.runtime.sendMessage({
        type: 'START_CONVERSION',
        data: {
          files: serializedFiles, // These are serializable objects
          settings: AppState.conversionSettings
        }
      }, (response) => {
        console.log('📥 Background response:', response);
        
        if (chrome.runtime.lastError) {
          console.error('🚨 Chrome runtime error:', chrome.runtime.lastError);
          chrome.runtime.onMessage.removeListener(messageListener);
          AppState.isProcessing = false;
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response?.success) {
          console.error('🚨 Background script error:', response);
          chrome.runtime.onMessage.removeListener(messageListener);
          AppState.isProcessing = false;
          reject(new Error(response?.error || 'Failed to start conversion'));
        } else {
          console.log('✅ Conversion request sent successfully');
        }
        // If successful, wait for progress messages
      });
      
    } catch (error) {
      console.error('🚨 Error sending message:', error);
      chrome.runtime.onMessage.removeListener(messageListener);
      AppState.isProcessing = false;
      reject(error);
    }
  });
}

/**
 * Show progress section
 */
function showProgress() {
  hideAllSections();
  elements.progressSection.style.display = 'block';
  elements.convertBtn.disabled = true;
}

/**
 * Update progress display
 */
function updateProgress(percentage, text) {
  elements.progressFill.style.width = percentage + '%';
  elements.progressPercent.textContent = Math.round(percentage) + '%';
  elements.progressText.textContent = text;
}

/**
 * Show success message
 */
function showSuccess(message) {
  hideAllSections();
  elements.resultsSection.style.display = 'block';
  elements.successText.textContent = message;
}

/**
 * Show success message with save option
 */
function showSuccessWithSave(message, filename) {
  hideAllSections();
  elements.resultsSection.style.display = 'block';
  
  // Create a container for the message and save button
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="margin-bottom: 16px; white-space: pre-line; text-align: left; background: #f0f7ff; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; line-height: 1.4;">
      ${message}
    </div>
    <button id="savePathsBtn" style="background: #4A90E2; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; margin-right: 12px;">
      💾 Save Paths to File
    </button>
    <button id="copyPathsBtn" style="background: #7ED321; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer;">
      📋 Copy to Clipboard
    </button>
  `;
  
  // Clear existing content and add new content
  elements.successText.innerHTML = '';
  elements.successText.appendChild(container);
  
  // Add event listeners for the buttons
  const saveBtn = document.getElementById('savePathsBtn');
  const copyBtn = document.getElementById('copyPathsBtn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveTextToFile(message, filename));
  }
  
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyToClipboard(message));
  }
}

/**
 * Show error message
 */
function showError(message) {
  hideAllSections();
  elements.errorSection.style.display = 'block';
  elements.errorText.textContent = message;
  
  // Auto-hide error after 5 seconds and show main interface
  setTimeout(() => {
    elements.errorSection.style.display = 'none';
    updateUI();
  }, 5000);
}

/**
 * Hide all status sections
 */
function hideAllSections() {
  elements.progressSection.style.display = 'none';
  elements.resultsSection.style.display = 'none';
  elements.errorSection.style.display = 'none';
}

/**
 * Show main interface (drop zone and assets button)
 */
function showMainInterface() {
  hideAllSections();
  // The drop zone and assets button are always visible by default
  // This function is mainly for consistency with other interface functions
}

/**
 * Handle new conversion
 */
function handleNewConversion() {
  AppState.selectedFiles = [];
  AppState.isProcessing = false;
  elements.fileInput.value = '';
  hideAllSections();
  updateUI();
}

/**
 * Handle retry
 */
function handleRetry() {
  hideAllSections();
  updateUI();
}

/**
 * Update UI based on current state
 */
function updateUI() {
  updateFileList();
  
  if (AppState.selectedFiles.length > 0) {
    showOptionsAndActions();
  } else {
    hideOptionsAndActions();
  }
  
  const shouldDisable = AppState.isProcessing || AppState.selectedFiles.length === 0;
  console.log('🔘 Button state - Processing:', AppState.isProcessing, 'Files:', AppState.selectedFiles.length, 'Disabled:', shouldDisable);
  elements.convertBtn.disabled = shouldDisable;
  
  // Update size option visibility
  const sizeOption = document.querySelector('input[name="sizeOption"]:checked').value;
  elements.presetGroup.style.display = sizeOption === 'preset' ? 'block' : 'none';
  elements.customGroup.style.display = sizeOption === 'custom' ? 'block' : 'none';
}

/**
 * Load user preferences from Chrome storage
 */
async function loadUserPreferences() {
  try {
    const result = await chrome.storage.local.get(['userPreferences']);
    if (result.userPreferences) {
      // Apply saved preferences to UI
      const prefs = result.userPreferences;
      
      if (prefs.defaultOutputFormat) {
        elements.outputFormat.value = prefs.defaultOutputFormat;
      }
      
      if (prefs.defaultQuality) {
        elements.qualitySlider.value = prefs.defaultQuality;
        elements.qualityValue.textContent = prefs.defaultQuality + '%';
      }
      
      if (prefs.defaultDPI) {
        elements.dpiSelect.value = prefs.defaultDPI;
      }
      
      if (prefs.selectedPrintPreset) {
        elements.presetSelect.value = prefs.selectedPrintPreset;
      }
      
      // Download prefs
      if (elements.downloadSubfolder && prefs.downloadSubfolder) {
        elements.downloadSubfolder.value = prefs.downloadSubfolder;
      }
      if (elements.showInFolderAfterDownload && prefs.showInFolderAfterDownload !== undefined) {
        elements.showInFolderAfterDownload.checked = !!prefs.showInFolderAfterDownload;
      }

      updateConversionSettings();
    }
  } catch (error) {
    console.error('Failed to load user preferences:', error);
  }
}

/**
 * Save user preferences to Chrome storage
 */
async function saveUserPreferences() {
  try {
    const preferences = {
      defaultOutputFormat: AppState.conversionSettings.outputFormat,
      defaultQuality: AppState.conversionSettings.quality,
      defaultDPI: AppState.conversionSettings.dpi,
      selectedPrintPreset: AppState.conversionSettings.preset,
      maintainAspectRatio: AppState.conversionSettings.maintainAspectRatio,
      downloadSubfolder: elements.downloadSubfolder?.value?.trim() || 'File Converter Pro',
      showInFolderAfterDownload: !!elements.showInFolderAfterDownload?.checked
    };
    
    await chrome.storage.local.set({ userPreferences: preferences });
  } catch (error) {
    console.error('Failed to save user preferences:', error);
  }
}

// Save preferences when settings change
document.addEventListener('change', saveUserPreferences);

/**
 * Save text content to a file
 */
function saveTextToFile(text, filename) {
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL
    URL.revokeObjectURL(url);
    
    // Show success feedback
    const saveBtn = document.getElementById('savePathsBtn');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✅ Saved!';
      saveBtn.style.background = '#7ED321';
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '#4A90E2';
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to save file:', error);
    showError('Failed to save file. Please try copying to clipboard instead.');
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    
    // Show success feedback
    const copyBtn = document.getElementById('copyPathsBtn');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✅ Copied!';
      copyBtn.style.background = '#4A90E2';
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#7ED321';
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showError('Failed to copy to clipboard. Please try saving to file instead.');
  }
}
