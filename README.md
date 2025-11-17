# YAML Configuration Editor

A web application for editing YAML configuration files with dual-view editing (YAML editor + form-based UI) and real-time synchronization.

## Features

- **Dual View Editing**: Edit YAML directly in a Monaco editor or through a form-based UI
- **Live Synchronization**: Changes in one view automatically update the other
- **Auto-save**: Changes are automatically saved to the backend with debouncing (500ms)
- **Real-time Code Completion**: WebSocket-based completion service with automatic suggestions as you type, providing context-aware keys, values, and snippets in the YAML editor
- **Validation**: YAML syntax and schema validation on both frontend and backend
- **Error Handling**: Clear error messages for invalid YAML or save failures

## Tech Stack

**Frontend:**
- React + TypeScript
- Vite
- Monaco Editor
- Tailwind CSS
- shadcn/ui components
- TanStack Query (React Query) - for data fetching and state management
- Axios - HTTP client

**Backend:**
- FastAPI
- Python
- Pydantic (validation)
- PyYAML
- WebSockets

## Project Structure

```
code-test/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and API client
│   └── package.json
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── routes/       # API routes
│   │   ├── models.py     # Pydantic models
│   │   └── config.yaml   # Default config file
│   └── requirements.txt
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 20+ and npm
- Python 3.8+
- pip

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

1. Start both backend and frontend servers
2. Open `http://localhost:5173` in your browser
3. The default configuration will be loaded
4. Edit the YAML in the left panel or use the form in the right panel
5. Changes are automatically synchronized and saved after 500ms of inactivity
6. Code completion appears automatically as you type, or press Ctrl+A (Cmd+Aon Mac) to trigger manually
7. The completion service uses WebSocket for real-time suggestions based on your current YAML context

## YAML Schema

The application uses the following fixed YAML structure:

```yaml
server:
  host: "127.0.0.1"
  port: 3000
  use_ssl: true
logging:
  level: "debug"
  file: "./debug.log"
```

### Field Descriptions

| Field          | Type                                          | Description                |
|----------------|-----------------------------------------------|----------------------------|
| server.host    | string                                        | hostname or IP address     |
| server.port    | integer                                       | port number (1-65535)      |
| server.use_ssl | boolean                                       | whether to enable SSL      |
| logging.level  | string (one of: debug, info, warn, error)     | log level                  |
| logging.file   | string                                        | path to log file           |

## API Endpoints

- `GET /api/config` - Retrieve the current YAML configuration
- `PUT /api/config` - Save YAML configuration (with validation)
- `WS /ws/completion` - WebSocket endpoint for code completion

## Assumptions & Trade-offs

### Assumptions

1. **Single User**: The application assumes a single user editing the config file at a time
2. **File-based Storage**: Configuration is stored in a single YAML file on the backend
3. **Fixed Schema**: The YAML schema is fixed and known in advance
4. **Local Development**: CORS is configured for localhost development

### Trade-offs

1. **Debouncing**: 500ms debounce delay balances responsiveness with API load
2. **No Conflict Resolution**: No handling for concurrent edits (single user assumption)
3. **Simple Parsing**: Uses js-yaml for parsing, which may not preserve all YAML formatting
4. **WebSocket Completion**: Completion service is optional - app works without it
5. **Error Recovery**: Basic error handling - invalid YAML shows error but doesn't prevent editing
6. **React Query**: Used for data fetching and caching, reducing boilerplate code and improving state management

## What Could Be Improved (Given More Time)

1. **Testing**: Add comprehensive unit and integration tests for critical paths
2. **YAML Formatting Preservation**: Better preservation of comments and formatting when saving
3. **Error Boundaries**: Add React error boundaries for better error handling and recovery
4. **Enhanced Completion**: More intelligent completion suggestions based on deeper context analysis
5. **Enhanced UI/UX**: Improve the overall user experience with a more polished and intuitive interface, better error handling, and more informative feedback. And compatibility with different screen sizes, devices and browsers.
6. **Enhanced WebSocket Connection**: Improve the WebSocket connection handling, including better error handling, reconnection logic, and more informative feedback.
7. **IDEA - Dynamic Form Generation**: Create a form that dynamically adapts to any YAML structure by detecting data types and generating appropriate input fields (text, number, boolean, nested objects, arrays) - allowing the editor to work with any YAML schema. 

## Development Notes

- The frontend uses Monaco Editor for YAML editing with syntax highlighting and custom tokenization
- WebSocket completion service provides context-aware suggestions with automatic triggering on typing
- Monaco Editor is configured with `quickSuggestions` enabled for automatic autocomplete
- WebSocket connection includes automatic reconnection logic with configurable retry attempts
- TanStack Query (React Query) handles data fetching, caching, and state management automatically
- Debouncing prevents excessive API calls during typing (500ms delay)
- Bidirectional sync uses refs to prevent circular updates
- Tailwind CSS provides responsive, modern styling





