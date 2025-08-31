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
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    results: document.getElementById('results'),
    resultsText: document.getElementById('resultsText')
  };
  
  // Set up message listener
  chrome.runtime.onMessage.addListener(handleMessage);
  
  updateStatus('ready', 'Ready for processing');
  console.log('Processor initialized successfully');
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
    
    updateStatus('processing', 'Processing files...');
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
      ProcessorState.progress.current = i;
      updateProgress(i, totalFiles, `Processing ${file.name}...`);
      
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
      const outputName = generateOutputFilename(file.name, settings);
      
      // Trigger download
      await downloadFile(processedBlob, outputName);
      
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
function generateOutputFilename(originalName, settings) {
  // Remove original extension
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  
  // Add suffix based on processing
  let suffix = '';
  if (settings.preset && PRINT_PRESETS[settings.preset]) {
    const presetName = settings.preset.replace(/-/g, '_');
    suffix = `_${presetName}`;
  } else if (settings.customWidth && settings.customHeight) {
    suffix = `_${settings.customWidth}x${settings.customHeight}`;
  } else if (settings.scalePercent && settings.scalePercent !== 100) {
    suffix = `_${settings.scalePercent}pct`;
  }
  
  // Add format extension
  const extension = settings.outputFormat === 'png' ? 'png' : 'jpg';
  
  return `${baseName}${suffix}.${extension}`;
}

/**
 * Download file using Chrome Downloads API
 */
function downloadFile(blob, filename) {
  return new Promise((resolve, reject) => {
    try {
      // Create object URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Use Chrome Downloads API with Save As dialog
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true // Force "Save As" dialog for user to choose location
      }, (downloadId) => {
        // Clean up object URL
        URL.revokeObjectURL(url);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log(`📥 Download started: ${filename} (ID: ${downloadId})`);
          resolve(downloadId);
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
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
  elements.progress.style.display = 'none';
  elements.results.style.display = 'block';
  
  const successCount = ProcessorState.processedFiles.length;
  const errorCount = ProcessorState.errors.length;
  
  let resultsMessage = `Successfully processed ${successCount} files`;
  if (errorCount > 0) {
    resultsMessage += ` (${errorCount} errors)`;
  }
  
  elements.resultsText.textContent = resultsMessage;
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
