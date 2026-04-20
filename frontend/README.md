# API Explorer Frontend

A modern, interactive web interface for exploring APIs and generating request templates.

## Features

✨ **Modern Dark Theme UI**
- Clean, professional design
- Responsive layout for all devices
- Intuitive navigation and interactions

🔍 **API Discovery**
- Browse all APIs from the registry
- Search APIs by name or URL
- Filter by authentication type
- View API details and statistics

📋 **Endpoint Explorer**
- View all endpoints for each API
- Filter endpoints by HTTP method
- See authentication requirements per endpoint
- View endpoint descriptions and summaries

🚀 **Template Generation**
- Generate curl and PowerShell templates
- Copy templates with one click
- Proper authentication headers included
- Realistic request bodies for POST/PUT

🔐 **Authentication Support**
- API Key authentication
- Bearer token authentication
- OAuth2 authentication
- Public endpoints (no auth)

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm install
npm start
```

The server will start on `http://localhost:3000`

### 2. Open the Frontend

Simply open `frontend/index.html` in your web browser:

```bash
# Option 1: Double-click index.html
# Option 2: Open with browser
open frontend/index.html

# Option 3: Serve with Python (optional)
cd frontend
python -m http.server 8080
# Then visit: http://localhost:8080
```

### 3. Explore APIs

1. **Browse APIs**: View all APIs in the left sidebar
2. **Select API**: Click on any API to view its endpoints
3. **View Templates**: Click "View Templates" on any endpoint
4. **Copy & Test**: Copy curl or PowerShell commands to test APIs

## Usage Examples

### Search and Filter
- **Search**: Type in the search box to find APIs by name
- **Auth Filter**: Use the dropdown to filter by authentication type
- **Method Filter**: Click method buttons to filter endpoints

### Template Generation
1. Select an API from the sidebar
2. Click "View Templates" on any endpoint
3. Switch between curl and PowerShell tabs
4. Click "Copy" to copy the template
5. Paste and run in your terminal

### Sample Templates Generated

**curl Example:**
```bash
curl -X GET \
  "https://api.example.com/v1/users" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell Example:**
```powershell
Invoke-RestMethod `
  -Uri "https://api.example.com/v1/users" `
  -Method GET `
  -Headers @{"Authorization" = "Bearer YOUR_TOKEN"}
```

## Keyboard Shortcuts

- `Escape` - Close modal
- `Ctrl/Cmd + K` - Focus search box

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Architecture

```
Frontend (Static Files)
├── index.html          # Main HTML structure
├── style.css           # Modern dark theme styles
├── script.js           # Interactive JavaScript
└── README.md           # This documentation

Backend (Node.js/Express)
├── server.js           # API server
├── package.json        # Dependencies
└── /apis endpoint      # Serves registry data
```

## API Integration

The frontend fetches data from the backend API:

```javascript
// Fetch all APIs
fetch('http://localhost:3000/apis')
  .then(res => res.json())
  .then(data => {
    console.log(`Loaded ${data.apis.length} APIs`);
  });
```

## Error Handling

- **Backend Offline**: Shows helpful error message with retry button
- **No APIs**: Displays empty state with instructions
- **Copy Failures**: Falls back to text selection
- **Network Issues**: Graceful error messages

## Customization

### Themes
Edit CSS variables in `style.css`:
```css
:root {
  --bg-primary: #0d1117;    /* Main background */
  --accent-blue: #58a6ff;   /* Primary accent */
  --text-primary: #f0f6fc;  /* Main text */
}
```

### API Endpoint
Change the backend URL in `script.js`:
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

## Troubleshooting

### Backend Not Running
```
Error: Failed to load APIs: Failed to fetch
```
**Solution**: Start the backend server on port 3000

### No APIs Showing
```
No APIs found
```
**Solution**: Run the batch processor to populate the registry:
```bash
python pipeline/batch_processor.py data/
```

### CORS Issues
If running frontend from `file://` protocol, use a local server:
```bash
cd frontend
python -m http.server 8080
```

## Development

### File Structure
```
frontend/
├── index.html      # HTML structure with semantic markup
├── style.css       # CSS with CSS Grid, Flexbox, CSS Variables
├── script.js       # Vanilla JavaScript with modern ES6+ features
└── README.md       # Documentation
```

### Key Components
- **API List**: Sidebar with search and filtering
- **API Details**: Main panel showing endpoints
- **Template Modal**: Popup with curl/PowerShell templates
- **Copy System**: Clipboard API with fallbacks

### JavaScript Architecture
- **State Management**: Global state with reactive updates
- **Event Handling**: Delegated event listeners
- **API Integration**: Fetch API with error handling
- **UI Updates**: DOM manipulation with template literals

## Production Deployment

### Static Hosting
Deploy `frontend/` folder to any static host:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

### Backend Deployment
Deploy Node.js backend to:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS Elastic Beanstalk

### Environment Configuration
Update API URL for production in `script.js`:
```javascript
const API_BASE_URL = 'https://your-api-domain.com';
```

---

**Built with ❤️ for GSoC 2026 by Niharika Jakkula**