/**
 * File Converter Pro - Background Service Worker
 * Handles extension lifecycle and message coordination
 */

// Extension installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('File Converter Pro installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Initialize default settings on first install
    await initializeDefaultSettings();
  }
});

/**
 * Initialize default user settings
 */
async function initializeDefaultSettings() {
  const defaultSettings = {
    userPreferences: {
      defaultOutputFormat: 'jpeg',
      defaultQuality: 80,
      defaultDPI: 300,
      selectedPrintPreset: 'print-quality',
      maintainAspectRatio: true,
      batchProcessing: true,
      showProgress: true,
      autoDetectAssets: true,
      theme: 'light'
    },
    conversionHistory: {
      totalConversions: 0,
      lastUsed: Date.now(),
      favoritePresets: ['print-quality'],
      recentSaveLocations: []
    },
    customPresets: []
  };
  
  try {
    await chrome.storage.local.set(defaultSettings);
    console.log('Default settings initialized');
  } catch (error) {
    console.error('Failed to initialize default settings:', error);
  }
}

/**
 * Message handler for communication between extension components
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      break;
      
    case 'UPDATE_SETTING':
      handleUpdateSetting(message.data, sendResponse);
      break;
      
    case 'START_CONVERSION':
      handleStartConversion(message.data, sendResponse);
      break;
      
    case 'CONVERSION_PROGRESS':
      handleConversionProgress(message.data, sendResponse);
      break;
      
    case 'CONVERSION_COMPLETE':
      handleConversionComplete(message.data, sendResponse);
      break;
      
    case 'CONVERSION_ERROR':
      handleConversionError(message.data, sendResponse);
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  // Keep message channel open for async responses
  return true;
});

/**
 * Handle settings retrieval request
 */
async function handleGetSettings(sendResponse) {
  try {
    const result = await chrome.storage.local.get(null);
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('Failed to get settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle setting update request
 */
async function handleUpdateSetting(data, sendResponse) {
  try {
    const { key, value } = data;
    
    // Get current settings
    const current = await chrome.storage.local.get(['userPreferences']);
    const userPreferences = current.userPreferences || {};
    
    // Update specific setting
    userPreferences[key] = value;
    userPreferences._lastModified = Date.now();
    
    // Save updated settings
    await chrome.storage.local.set({ userPreferences });
    
    sendResponse({ success: true, data: userPreferences });
  } catch (error) {
    console.error('Failed to update setting:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle conversion start request
 */
async function handleStartConversion(data, sendResponse) {
  try {
    console.log('Starting conversion for', data.files?.length, 'files');
    
    // Create or get processing tab
    const processingTab = await getOrCreateProcessingTab();
    
    // Wait for tab to be ready and send conversion data
    await sendMessageToProcessorWithRetry(processingTab.id, {
      type: 'START_PROCESSING',
      data: data
    });
    
    sendResponse({ success: true, tabId: processingTab.id });
  } catch (error) {
    console.error('Failed to start conversion:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle conversion progress updates
 */
async function handleConversionProgress(data, sendResponse) {
  try {
    // Forward progress to all extension contexts
    chrome.runtime.sendMessage({
      type: 'CONVERSION_PROGRESS',
      data: data
    }).catch(() => {
      // Popup might be closed, that's okay
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to handle conversion progress:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle conversion completion
 */
async function handleConversionComplete(data, sendResponse) {
  try {
    // Update conversion history
    await updateConversionHistory(data);
    
    // Forward completion to popup
    chrome.runtime.sendMessage({
      type: 'CONVERSION_COMPLETE',
      data: data
    }).catch(() => {
      // Popup might be closed, that's okay
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to handle conversion completion:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle conversion errors
 */
async function handleConversionError(data, sendResponse) {
  try {
    console.error('Conversion error:', data);
    
    // Forward error to popup
    chrome.runtime.sendMessage({
      type: 'CONVERSION_ERROR',
      data: data
    }).catch(() => {
      // Popup might be closed, that's okay
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to handle conversion error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get or create processing tab
 */
async function getOrCreateProcessingTab() {
  try {
    // Check if processing tab already exists and is still valid
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('processor.html') });
    
    if (tabs.length > 0) {
      // Check if tab is still responsive
      try {
        await chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' });
        return tabs[0];
      } catch {
        // Tab exists but not responsive, close it and create new one
        chrome.tabs.remove(tabs[0].id);
      }
    }
    
    // Create new processing tab
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL('processor.html'),
      active: false // Hidden from user
    });
    
    console.log('Created processing tab:', tab.id);
    
    // Wait a moment for the tab to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return tab;
  } catch (error) {
    console.error('Failed to get/create processing tab:', error);
    throw error;
  }
}

/**
 * Send message to processor tab with retry mechanism
 */
async function sendMessageToProcessorWithRetry(tabId, message, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Sending message to processor tab ${tabId}`);
      
      const response = await chrome.tabs.sendMessage(tabId, message);
      console.log('Message sent successfully:', response);
      return response;
      
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to communicate with processor after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait progressively longer between retries
      const delay = attempt * 500; // 500ms, 1s, 1.5s, 2s, 2.5s
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Download converted files
 */
async function downloadConvertedFiles(files) {
  try {
    for (const file of files) {
      if (file.blob) {
        const url = URL.createObjectURL(file.blob);
        
        await chrome.downloads.download({
          url: url,
          filename: file.name,
          saveAs: true
        });
        
        // Clean up object URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
    
    console.log('Downloaded', files.length, 'converted files');
  } catch (error) {
    console.error('Failed to download converted files:', error);
    throw error;
  }
}

/**
 * Update conversion history
 */
async function updateConversionHistory(data) {
  try {
    const current = await chrome.storage.local.get(['conversionHistory']);
    const history = current.conversionHistory || {
      totalConversions: 0,
      lastUsed: Date.now(),
      favoritePresets: [],
      recentSaveLocations: []
    };
    
    // Update statistics
    history.totalConversions += data.filesProcessed || 0;
    history.lastUsed = Date.now();
    
    // Track favorite presets
    if (data.preset && !history.favoritePresets.includes(data.preset)) {
      history.favoritePresets.push(data.preset);
    }
    
    // Save updated history
    await chrome.storage.local.set({ conversionHistory: history });
    
    console.log('Updated conversion history:', history);
  } catch (error) {
    console.error('Failed to update conversion history:', error);
  }
}

/**
 * Get popup port for communication (placeholder)
 */
function getPopupPort() {
  // This would be implemented with chrome.runtime.connect
  // For now, return null as we'll use direct message passing
  return null;
}

/**
 * Handle tab removal cleanup
 */
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Clean up any resources associated with closed tabs
  console.log('Tab removed:', tabId);
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('File Converter Pro started');
});

/**
 * Error handler for uncaught errors
 */
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

/**
 * Unhandled promise rejection handler
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in background:', event.reason);
});

console.log('File Converter Pro background script loaded');