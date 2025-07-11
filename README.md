# Frontend Repository
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/7bcddccab64c459296b760126867416c)](https://app.codacy.com/gh/Runtime-Architects/Frontend/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

This repository contains the frontend for our AI-powered chat application. It is a React-based web application that provides a modern, secure, and user-friendly interface for interacting with AI agents through real-time streaming conversations.

## 🌟 Features

- **Real-time AI Chat**: Streaming conversations with AI agents
- **Secure Authentication**: WebAuthn/Passkey-based authentication
- **Internationalization**: Multi-language support (English, Spanish)
- **Health Monitoring**: Backend service health status dashboard
- **Modern UI**: Built with Microsoft Fluent UI components
- **Responsive Design**: Works on desktop and mobile devices
- **Progressive Web App**: Installable as a PWA

## 📱 Requirements

### System Requirements
- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **Modern Browser**: Chrome 67+, Firefox 60+, Safari 13+, Edge 79+

### Browser Requirements
- **HTTPS**: Required for WebAuthn/Passkey authentication
- **Secure Context**: Must be served over HTTPS or localhost
- **WebAuthn Support**: For passkey authentication
- **Modern JavaScript**: ES2020+ support

### Backend Dependencies
- **Backend API**: Must be running on `http://localhost:8000`
- **WebAuthn Server**: Backend must support WebAuthn registration/authentication
- **OpenAI Integration**: Backend must be configured with OpenAI API

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 18.x with TypeScript
- **Build Tool**: Vite 6.x
- **UI Library**: Microsoft Fluent UI
- **Styling**: CSS Modules + Tailwind CSS
- **Authentication**: WebAuthn/Passkey with SimpleWebAuthn
- **State Management**: React Context API
- **Routing**: React Router DOM
- **Internationalization**: i18next
- **HTTP Client**: Fetch API with custom wrappers

### Key Components
- **Authentication System**: WebAuthn-based secure login/registration
- **Chat Interface**: Real-time streaming chat with AI agents
- **Health Dashboard**: Backend service monitoring
- **Protected Routes**: Authentication-required pages
- **Language Support**: Multi-language interface

## 📁 Structure

```
src/
├── api/                    # API communication layer
│   ├── api.ts             # Main API functions
│   ├── models.ts          # TypeScript type definitions
│   └── index.ts           # API exports
├── components/            # Reusable UI components
│   ├── Answer/            # AI response display
│   ├── AuthTestComponent/ # Authentication testing
│   ├── ClearChatButton/   # Chat clearing functionality
│   ├── HistoryPanel/      # Chat history management
│   ├── QuestionInput/     # User input component
│   ├── ProtectedRoute/    # Route protection wrapper
│   ├── UserProfile/       # User profile display
│   └── ...
├── contexts/              # React Context providers
│   └── AuthContext.tsx    # Authentication state management
├── pages/                 # Page components
│   ├── auth/              # Authentication pages
│   │   ├── Login.tsx      # Login page
│   │   └── Register.tsx   # Registration page
│   ├── chat/              # Main chat interface
│   ├── health/            # Health monitoring dashboard
│   └── layout/            # Layout wrapper
├── utils/                 # Utility functions
│   ├── auth.ts           # Authentication utilities
│   └── webauthn.ts       # WebAuthn helpers
├── i18n/                 # Internationalization
│   ├── config.ts         # i18n configuration
│   └── locales/          # Translation files
└── assets/               # Static assets
```

## 🔐 Authentication System

### WebAuthn/Passkey Authentication
- **Secure**: Uses biometric authentication, security keys, or device PIN
- **Passwordless**: No traditional passwords required
- **Cross-platform**: Works across devices and browsers
- **Cookie-based**: Secure HttpOnly cookies for session management

### Authentication Flow
1. **Registration**: User provides email, creates passkey
2. **Login**: User authenticates with passkey
3. **Token Management**: JWT tokens with automatic refresh
4. **Session Monitoring**: Automatic logout on token expiration

### Security Features
- **Secure Context**: Requires HTTPS in production
- **Token Expiration**: Automatic token refresh and cleanup
- **Cross-site Protection**: SameSite cookie attributes
- **Device Authentication**: Biometric or device-based authentication

## 🌐 Backend Requirements

### API Endpoints
The frontend expects the following backend endpoints:

#### Authentication
- `POST /auth/register/begin` - Start WebAuthn registration
- `POST /auth/register/complete` - Complete WebAuthn registration
- `POST /auth/login/begin` - Start WebAuthn login
- `POST /auth/login/complete` - Complete WebAuthn login

#### Chat System
- `POST /ask` - Single AI query
- `POST /ask-stream` - Streaming AI conversation
- `GET /health` - Backend health status

#### Expected Response Formats
```typescript
// Health Check Response
{
  status: "healthy" | "warning" | "error" | "unhealthy",
  message: string,
  timestamp?: string,
  components?: {
    agents_status: "initialized" | "not_initialized",
    openai_client_status: "connected" | "not_connected",
    openai_api_status: "healthy" | "quota_exceeded" | "invalid_key" | "forbidden" | "error" | "unknown",
    api_key_configured: boolean,
    data_directory_exists: boolean,
    data_files_count: number
  },
  version?: string,
  uptime_check?: string
}

// Streaming Chat Response
{
  event: {
    event_type: "started" | "agent_thinking" | "agent_response" | "completed" | "error",
    timestamp: string,
    agent_name: string,
    message: string,
    data: {
      progress: number,
      final_response?: string,
      error?: string
    }
  }
}
```

## 🚀 Getting Started

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file (optional):
   ```env
   VITE_PORT=3000
   VITE_HOST=localhost
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Development: `http://localhost:3000`
   - For WebAuthn: Use `https://localhost:3000` (requires SSL setup)

### Production Build

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Preview production build**
   ```bash
   npm run preview
   ```

### Environment Configuration

#### Development Environment
- **URL**: `http://localhost:3000` (or with SSL for WebAuthn)
- **Backend**: `http://localhost:8000`
- **WebAuthn**: Limited to localhost for testing

#### Production Environment
- **HTTPS Required**: WebAuthn requires secure context
- **Backend URL**: Configure via environment variables
- **Domain Configuration**: Update backend CORS settings

## � Configuration

### Backend Configuration
Ensure your backend is configured with:
- **CORS**: Allow frontend domain
- **WebAuthn**: Proper relying party configuration
- **OpenAI**: Valid API key configuration
- **Health Endpoints**: Proper health check responses

### Browser Compatibility
- **WebAuthn Support**: Check browser compatibility
- **Secure Context**: HTTPS required for production
- **Local Development**: Use localhost for testing

## 🌍 Internationalization

### Supported Languages
- **English (en)**: Default language
- **Spanish (es)**: Full translation support

### Adding New Languages
1. Create translation file in `src/locales/<lang>/translation.json`
2. Update `src/i18n/config.ts` with new language
3. Add language to `supportedLngs` configuration

### Translation Structure
```json
{
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout"
  },
  "chat": {
    "placeholder": "Type your message...",
    "send": "Send"
  },
  "health": {
    "title": "Health Status",
    "status": "Status"
  }
}
```

## � Health Monitoring

### Health Dashboard Features
- **Service Status**: Overall backend health
- **Component Status**: Individual service monitoring
- **OpenAI Status**: API connectivity and quota
- **System Information**: Version and uptime
- **Real-time Updates**: Manual refresh capability

### Health Check Integration
The frontend monitors:
- **Backend Connectivity**: API availability
- **Authentication Status**: Auth service health
- **OpenAI Integration**: AI service status
- **Data Services**: File system and data availability

## 🤝 Contributing

We follow strict contribution guidelines including Conventional Commits and branching conventions.

### Development Workflow
1. **Create Issue**: All changes must be tracked by GitHub issues
2. **Branch Naming**: `<prefix>/<issue-number>-<description>`
3. **Development**: Follow TypeScript and React best practices
4. **Testing**: Ensure all features work with WebAuthn
5. **Pull Request**: Submit PR for code review

### Code Standards
- **TypeScript**: Strict type checking enabled
- **React**: Functional components with hooks
- **CSS**: CSS Modules for component styling
- **Accessibility**: ARIA compliance and keyboard navigation

👉 See the [CONTRIBUTING.md](./CONTRIBUTING.md) file for full details.

## � Deployment

### Production Deployment Requirements
- **HTTPS**: Required for WebAuthn authentication
- **SSL Certificate**: Valid SSL certificate for domain
- **Backend URL**: Configure production backend endpoint
- **CORS**: Backend must allow frontend domain

### Deployment Steps
1. **Build Application**: `npm run build`
2. **Configure Environment**: Set production environment variables
3. **Deploy Static Files**: Upload `dist/` folder to web server
4. **Configure Server**: Set up HTTPS and proper headers
5. **Update Backend**: Configure CORS and WebAuthn settings

### Deployment Platforms
- **Vercel**: Easy deployment with automatic HTTPS
- **Netlify**: Static site hosting with SSL
- **AWS S3 + CloudFront**: Scalable static hosting
- **Azure Static Web Apps**: Integrated with Azure services

### Environment Variables
```env
# Production
VITE_BACKEND_URL=https://your-backend.com
VITE_ENVIRONMENT=production

# Development
VITE_BACKEND_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

## � Troubleshooting

### Common Issues

#### WebAuthn Not Working
- **Check HTTPS**: WebAuthn requires secure context
- **Browser Support**: Ensure browser supports WebAuthn
- **Device Support**: Check if device has authentication capability

#### Backend Connection Issues
- **CORS**: Ensure backend allows frontend domain
- **Network**: Check if backend is accessible
- **Authentication**: Verify authentication headers

#### Build Issues
- **Dependencies**: Run `npm install` to update dependencies
- **Node Version**: Ensure Node.js version compatibility
- **TypeScript**: Check for TypeScript compilation errors

### Debug Mode
Enable debug logging in development:
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```
