# Frontend Documentation
## File Converter Chrome Extension

### UI Framework & Technology Stack
- **Framework**: Vanilla JavaScript (ES6+)
- **Styling**: Pure CSS with CSS Grid and Flexbox
- **Extension Type**: Chrome Extension (Manifest V3)
- **Build Tool**: None (vanilla approach for simplicity)

### Extension Architecture
```
file_converter/
├── manifest.json           # Extension configuration
├── popup.html              # Main extension popup
├── popup.js                # Main application logic
├── popup.css               # Styling
├── background.js           # Service worker
├── content.js              # Content script (if needed)
└── icons/                  # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### User Interface Design

#### Single-Page Layout Structure
```
┌─────────────────────────────────────┐
│            HEADER                   │
│      File Converter Pro            │
├─────────────────────────────────────┤
│                                     │
│         DRAG & DROP ZONE            │
│    "Drop files here or click"       │
│         [Browse Files]              │
│                                     │
├─────────────────────────────────────┤
│     CONVERSION OPTIONS              │
│  Format: [JPEG▼] → [PNG▼]          │
│                                     │
│     RESIZE OPTIONS                  │
│  ○ Keep Original Size               │
│  ○ T-Shirt Presets: [4500x5400▼]   │
│  ○ Custom: [Width] x [Height]       │
│  ☑ Maintain Aspect Ratio           │
│                                     │
│     QUALITY SETTINGS                │
│  Quality: [────●────] 80%           │
│  DPI: [300▼] (Print/Web)            │
│                                     │
├─────────────────────────────────────┤
│     ACTION BUTTONS                  │
│    [Convert Files] [Clear All]      │
│                                     │
│     PROGRESS INDICATOR              │
│    ████████░░░░ 60% (3/5 files)     │
└─────────────────────────────────────┤
│     SAVE LOCATION                   │
│    📁 Choose Save Folder            │
└─────────────────────────────────────┘
```

### Key Components

#### 1. Drag & Drop Zone Component
```javascript
// Features:
- Visual feedback on drag over
- File type validation
- Multiple file selection
- Auto-detect Windows system assets
- Error handling for unsupported files
```

#### 2. Format Conversion Component
```javascript
// Supported Conversions:
- System Assets → JPEG
- JPEG ↔ PNG
- Batch processing capability
- Format auto-detection
```

#### 3. T-Shirt Design Presets Component
```javascript
// Preset Sizes:
- 4500x5400 (Print Quality)
- 3000x3600 (High Quality)
- 2400x3000 (Standard Print)
- 1800x2400 (Web Preview)
- Custom dimensions input
```

#### 4. Image Processing Component
```javascript
// Features:
- Canvas-based image manipulation
- Aspect ratio preservation
- Quality/compression settings
- DPI metadata handling
- Real-time preview (optional)
```

### Styling Approach
- **Pure CSS**: No framework dependencies
- **CSS Grid**: Main layout structure
- **Flexbox**: Component alignment
- **CSS Variables**: Consistent theming
- **Responsive**: Works on different screen sizes

### Color Scheme (8-Year-Old Friendly)
```css
:root {
  --primary-blue: #4A90E2;
  --success-green: #7ED321;
  --warning-orange: #F5A623;
  --error-red: #D0021B;
  --neutral-gray: #F5F5F5;
  --dark-text: #333333;
  --light-text: #666666;
}
```

### State Management
- **Local State**: Component-specific data (file lists, conversion progress)
- **Chrome Storage**: User preferences (default save location, quality settings)
- **Session Storage**: Temporary conversion queue
- **No Global State**: Keep it simple with vanilla JS

### File Handling
- **File API**: For reading selected files
- **Canvas API**: For image processing
- **Chrome Downloads API**: For saving converted files
- **Chrome FileSystem API**: For directory selection

### Error Handling
- **File Validation**: Size limits, format support
- **Conversion Errors**: Graceful degradation
- **User Feedback**: Clear error messages
- **Recovery**: Retry failed conversions

### Performance Optimization
- **Lazy Loading**: Process files one at a time
- **Memory Management**: Clear canvas after each conversion
- **Progress Indicators**: Show conversion status
- **Batch Optimization**: Efficient queue processing
