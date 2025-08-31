# DevOps Documentation
## File Converter Chrome Extension - Development & Deployment

### Development Environment Setup

#### Prerequisites
```bash
# Required tools (all free)
- Chrome Browser (latest version)
- Visual Studio Code (or any text editor)
- Git (for version control)
- No Node.js required (vanilla JavaScript approach)
- No build tools required (direct Chrome extension development)
```

#### Project Structure Setup
```
file_converter/
├── src/                    # Source code
│   ├── manifest.json       # Extension configuration
│   ├── popup.html          # Main UI
│   ├── popup.js            # UI logic
│   ├── popup.css           # Styling
│   ├── background.js       # Service worker
│   ├── processor.html      # Processing tab
│   ├── processor.js        # Image processing logic
│   └── icons/              # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── docs/                   # Documentation (already created)
├── tests/                  # Test files
│   ├── unit/
│   ├── integration/
│   └── manual/
├── dist/                   # Distribution builds
├── .gitignore
├── README.md
└── CHANGELOG.md
```

#### Initial Setup Commands
```bash
# 1. Navigate to your project
cd D:\Download_Other\Projects\file_converter\

# 2. Create source directory
mkdir src
mkdir src\icons
mkdir tests
mkdir tests\unit
mkdir tests\integration
mkdir tests\manual
mkdir dist

# 3. Initialize Git repository
git init
git add .
git commit -m "Initial project setup with documentation"

# 4. Create .gitignore
echo "*.log" > .gitignore
echo "node_modules/" >> .gitignore
echo "dist/*.zip" >> .gitignore
echo ".DS_Store" >> .gitignore
echo "Thumbs.db" >> .gitignore
```

### Chrome Extension Development Workflow

#### 1. Local Development Setup
```json
// src/manifest.json - Development version
{
  "manifest_version": 3,
  "name": "File Converter Pro (Dev)",
  "version": "0.1.0",
  "description": "Convert images and system assets - Development Build",
  
  "permissions": [
    "storage",
    "downloads", 
    "tabs"
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "File Converter Pro"
  },
  
  "background": {
    "service_worker": "background.js"
  },
  
  "web_accessible_resources": [{
    "resources": ["processor.html"],
    "matches": ["<all_urls>"]
  }],
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png", 
    "128": "icons/icon128.png"
  },
  
  // Development-only settings
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

#### 2. Load Extension in Chrome (Development)
```
1. Open Chrome and navigate to: chrome://extensions/
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select your src/ folder
5. Extension loads immediately for testing
6. Use "Reload" button after code changes
```

#### 3. Development Debugging Tools
```javascript
// Debug logging setup (popup.js)
const DEBUG = true; // Set to false for production

function debugLog(message, data = null) {
  if (DEBUG) {
    console.log(`[FileConverter] ${message}`, data);
  }
}

// Chrome extension debugging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Message received:', message);
  // Handle message
  sendResponse({success: true});
});

// Error tracking
window.addEventListener('error', (event) => {
  debugLog('Error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno
  });
});
```

#### 4. Hot Reload Setup (Optional Enhancement)
```javascript
// background.js - Auto-reload during development
if (DEBUG) {
  // Watch for file changes and reload extension
  chrome.management.getSelf((info) => {
    if (info.installType === 'development') {
      setInterval(() => {
        chrome.runtime.reload();
      }, 1000);
    }
  });
}
```

### Build Process

#### 1. Manual Build (Simple Approach)
```bash
# Create distribution build
mkdir dist\build-$(date +%Y%m%d)
xcopy src dist\build-$(date +%Y%m%d) /E /I

# Remove development-only files
del dist\build-$(date +%Y%m%d)\*.log
del dist\build-$(date +%Y%m%d)\debug.js

# Update manifest for production
# (manually change name, remove "Dev", set DEBUG=false)
```

#### 2. Automated Build Script (PowerShell)
```powershell
# build.ps1 - Automated build script
param(
    [string]$version = "1.0.0",
    [switch]$zip = $false
)

Write-Host "Building File Converter Pro v$version..."

# Create build directory
$buildDir = "dist\v$version"
if (Test-Path $buildDir) {
    Remove-Item $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDir

# Copy source files
Copy-Item "src\*" $buildDir -Recurse

# Update manifest for production
$manifest = Get-Content "$buildDir\manifest.json" | ConvertFrom-Json
$manifest.name = "File Converter Pro"
$manifest.version = $version
$manifest.description = "Convert images and system assets - completely free"
$manifest | ConvertTo-Json -Depth 10 | Set-Content "$buildDir\manifest.json"

# Remove debug code
(Get-Content "$buildDir\popup.js") -replace "const DEBUG = true;", "const DEBUG = false;" | Set-Content "$buildDir\popup.js"

# Create ZIP for Chrome Web Store
if ($zip) {
    Compress-Archive -Path "$buildDir\*" -DestinationPath "dist\file-converter-pro-v$version.zip"
    Write-Host "Created: dist\file-converter-pro-v$version.zip"
}

Write-Host "Build complete: $buildDir"
```

### Chrome Web Store Deployment

#### 1. Prepare for Chrome Web Store
```
Required assets:
- Extension files (built and tested)
- Icon files: 16x16, 48x48, 128x128 PNG
- Screenshots: 1280x800 or 640x400 PNG/JPEG
- Promotional images (optional but recommended)
- Privacy policy (required for extensions using permissions)
- Detailed description and features list
```

#### 2. Chrome Web Store Submission Checklist
```markdown
## Pre-Submission Checklist

### Code Requirements
- [ ] Manifest V3 compliance
- [ ] All features working in latest Chrome
- [ ] No console errors in production build  
- [ ] Proper error handling implemented
- [ ] User data handled securely

### Store Assets
- [ ] High-quality icons (16px, 48px, 128px)
- [ ] Screenshots showing key features
- [ ] Detailed description (132-char summary + full description)
- [ ] Appropriate category selection
- [ ] Correct language settings

### Legal Requirements  
- [ ] Privacy policy written and hosted
- [ ] Terms of service (if applicable)
- [ ] Copyright compliance verified
- [ ] No trademarked content without permission

### Testing
- [ ] Extension tested on multiple Chrome versions
- [ ] All user flows tested manually
- [ ] Performance tested with large files
- [ ] Error scenarios tested and handled

### Publishing
- [ ] Developer account verified ($5 fee)
- [ ] Extension package uploaded (.zip file)
- [ ] Store listing completed with all details
- [ ] Review and submission completed
```

#### 3. Store Listing Template
```
Title: File Converter Pro - T-Shirt Design Tools

Short Description:
Convert images & Windows assets to JPEG/PNG. Specialized presets for t-shirt design. Drag-drop, batch processing, 100% offline.

Full Description:
File Converter Pro is the ultimate tool for t-shirt designers and content creators who need fast, reliable image conversion without uploading files to the cloud.

KEY FEATURES:
• Convert Windows system assets (lockscreen images) to JPEG/PNG
• Professional t-shirt design presets (4500x5400 print quality)
• Batch processing - convert multiple files at once
• Drag-and-drop interface so simple an 8-year-old can use it
• Completely offline - your files never leave your computer
• Custom resizing with aspect ratio control
• Adjustable quality and DPI settings for print vs web

PERFECT FOR:
• T-shirt design businesses
• Print-on-demand creators  
• Content creators and entrepreneurs
• Anyone needing private, fast file conversion

PRIVACY FIRST:
• Zero file uploads - everything processed locally
• No data collection or tracking
• Complete offline functionality
• You control your data 100%

FREE FOREVER:
• No subscriptions or hidden fees
• Unlimited conversions
• No file size limits (within browser capabilities)
• No watermarks or restrictions

Categories: Productivity, Developer Tools
```

### Continuous Integration (Optional)

#### GitHub Actions Workflow
```yaml
# .github/workflows/build.yml
name: Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Validate manifest.json
      run: |
        python -m json.tool src/manifest.json > /dev/null
        echo "Manifest is valid JSON"
    
    - name: Check file structure
      run: |
        test -f src/popup.html || exit 1
        test -f src/popup.js || exit 1
        test -f src/background.js || exit 1
        echo "Required files present"
    
    - name: Create build
      run: |
        mkdir -p dist/ci-build
        cp -r src/* dist/ci-build/
        
    - name: Upload build artifact
      uses: actions/upload-artifact@v3
      with:
        name: extension-build
        path: dist/ci-build/
```

### Version Management

#### Semantic Versioning Strategy
```
Version Format: MAJOR.MINOR.PATCH

MAJOR (1.x.x): Breaking changes, major feature additions
MINOR (x.1.x): New features, backwards compatible
PATCH (x.x.1): Bug fixes, minor improvements

Examples:
0.1.0 - Initial development build
0.2.0 - Add batch processing  
0.2.1 - Fix Windows asset detection bug
1.0.0 - First public release
1.1.0 - Add custom presets feature
1.1.1 - Performance improvements
```

#### Release Process
```bash
# 1. Update version in manifest.json
# 2. Update CHANGELOG.md with new features/fixes
# 3. Create git tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 4. Build release package
.\build.ps1 -version "1.0.0" -zip

# 5. Upload to Chrome Web Store
# 6. Monitor for issues and user feedback
```

### Environment Management

#### Development vs Production
```javascript
// config.js - Environment configuration
const CONFIG = {
  development: {
    DEBUG: true,
    LOG_LEVEL: 'verbose',
    ERROR_REPORTING: false,
    EXTENSION_NAME: 'File Converter Pro (Dev)'
  },
  
  production: {
    DEBUG: false,
    LOG_LEVEL: 'error',
    ERROR_REPORTING: true,
    EXTENSION_NAME: 'File Converter Pro'
  }
};

// Use environment-specific config
const ENV = chrome.runtime.getManifest().name.includes('Dev') ? 'development' : 'production';
const settings = CONFIG[ENV];
```

### Monitoring & Analytics

#### Basic Usage Tracking (Privacy-Compliant)
```javascript
// analytics.js - Privacy-first analytics
class PrivacyAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
  }

  // Track feature usage (no personal data)
  trackFeatureUse(feature) {
    const usage = {
      feature: feature,
      timestamp: Date.now(),
      session: this.sessionId
    };
    
    // Store locally only - no external sending
    this.saveToStorage(usage);
  }

  // Generate anonymous session ID
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9);
  }

  // Optional: Export usage stats for improvement
  async exportUsageStats() {
    const stats = await chrome.storage.local.get(['usageStats']);
    return this.anonymizeData(stats);
  }
}
```

### Deployment Checklist

#### Pre-Production Checklist
- [ ] All documentation updated
- [ ] Version numbers incremented correctly
- [ ] Debug flags disabled
- [ ] Error handling comprehensive
- [ ] Performance optimized
- [ ] Security review completed
- [ ] User acceptance testing passed
- [ ] Chrome Web Store assets prepared
- [ ] Privacy policy updated
- [ ] Backup of previous version saved

#### Post-Deployment Monitoring
- [ ] Extension successfully published
- [ ] User reviews monitored
- [ ] Error reports tracked
- [ ] Performance metrics reviewed
- [ ] User feedback incorporated into next version

### Development Timeline (2-4 Weeks)

#### Week 1: Core Development
- Day 1-2: Setup environment, create basic popup
- Day 3-4: Implement file selection and drag-drop
- Day 5-7: Build image processing engine

#### Week 2: Feature Implementation  
- Day 8-10: Add t-shirt presets and custom sizing
- Day 11-12: Implement batch processing
- Day 13-14: Add Windows asset detection

#### Week 3: Polish & Testing
- Day 15-17: UI/UX refinement, error handling
- Day 18-19: Performance optimization
- Day 20-21: Comprehensive testing

#### Week 4: Release Preparation
- Day 22-24: Chrome Web Store preparation
- Day 25-26: Final testing and bug fixes
- Day 27-28: Submission and launch

This DevOps documentation ensures your 2-4 week development timeline is achievable with proper setup, testing, and deployment processes.
