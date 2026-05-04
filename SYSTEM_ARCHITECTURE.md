# System Architecture Flow: Sections, Chatbot & Knowledge

## 📋 Overview
This document explains how the three main components (Sections, Chatbot, Knowledge) work together, their APIs, data flow, and context passing in the chat simulator.

---

## 🗄️ Database Schema

### Knowledge Table
```sql
knowledge {
  id: text (primary key)
  user_email: text (not null)
  workspace_id: text (not null)
  title: text (not null)           // Display name
  content: text (not null)         // Processed markdown content
  type: text (not null)            // 'website' | 'text' | 'upload'
  status: text (not null)          // 'active' | 'training' | 'error' | 'excluded'
  source_url: text                 // Original URL (for website type)
  meta_data: text                  // Additional metadata JSON
  created_at: text (default now())
}
```

### Sections Table
```sql
sections {
  id: text (primary key)
  user_email: text (not null)
  workspace_id: text (not null)
  name: text (not null)            // Section name
  description: text (not null)     // When to use this section
  tone: text (not null)            // 'neutral' | 'friendly' | 'professional' | 'strict'
  scope_label: text (not null)     // 'general' | custom labels
  allowed_topics: text             // JSON array of allowed topics
  blocked_topics: text             // JSON array of blocked topics
  fallback_behavior: text (not null) // 'escalate' | 'refuse' | 'general_answer'
  source_ids: text                 // JSON array of knowledge IDs
  status: text (not null)          // 'active' | 'inactive'
  created_at: text (default now())
}
```

### Chatbot Metadata
```sql
// Stored in separate metadata table or chatbot_settings
{
  primaryColor: text
  welcomeMessage: text
  avatarSrc: text
  widgetId: text
  user_email: text
  workspace_id: text
}
```

---

## 🔄 API Flow Diagram

```mermaid
graph TD
    A[User Dashboard] --> B[Knowledge API]
    A --> C[Sections API]
    A --> D[Chatbot API]
    
    B --> E[Knowledge Table]
    C --> F[Sections Table]
    D --> G[Chatbot Settings]
    
    E --> H[Chat Simulator]
    F --> H
    G --> H
    
    H --> I[AI Response]
    
    subgraph "Knowledge Flow"
        B1[POST /api/knowledge/store] --> B2[Process Content]
        B2 --> B3[Store in knowledge table]
        B4[GET /api/knowledge/fetch] --> B5[Return knowledge sources]
    end
    
    subgraph "Sections Flow"
        C1[POST/PUT /api/sections/store] --> C2[Create/Update Section]
        C2 --> C3[Link knowledge sources]
        C4[GET /api/sections/fetch] --> C5[Return sections with sources]
    end
    
    subgraph "Chatbot Flow"
        D1[GET /api/chatbot/metadata/fetch] --> D2[Load appearance settings]
        D3[PUT /api/chatbot/metadata/update] --> D4[Save settings]
    end
```

---

## 📊 Detailed Data Flow

### 1. Knowledge Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as Dashboard
    participant API as Knowledge API
    participant DB as Knowledge Table
    participant AI as AI Processor
    
    U->>D: Add Knowledge (Website/Text/Upload)
    D->>API: POST /api/knowledge/store
    API->>AI: Process content (summarize/extract)
    AI-->>API: Processed markdown
    API->>DB: Store processed content
    DB-->>API: Success with knowledge ID
    API-->>D: Knowledge created
    D-->>U: Show in knowledge table
    
    Note over D: When chat needs context
    D->>API: GET /api/knowledge/fetch
    API->>DB: Query user's knowledge
    DB-->>API: Return knowledge sources
    API-->>D: Knowledge list with content
```

### 2. Sections Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as Dashboard
    participant API as Sections API
    participant DB as Sections Table
    participant KDB as Knowledge Table
    
    U->>D: Create/Edit Section
    D->>API: POST/PUT /api/sections/store
    API->>DB: Store section with linked knowledge IDs
    DB-->>API: Section saved
    API-->>D: Success
    
    Note over D: When loading sections
    D->>API: GET /api/sections/fetch
    API->>DB: Query sections
    API->>KDB: Fetch linked knowledge content
    KDB-->>API: Knowledge content
    API-->>D: Sections with full context
```

### 3. Chatbot Configuration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as Dashboard
    participant API as Chatbot API
    participant DB as Settings Table
    
    D->>API: GET /api/chatbot/metadata/fetch
    API->>DB: Get user's chatbot settings
    DB-->>API: Settings (color, avatar, welcome)
    API-->>D: Configuration loaded
    
    U->>D: Change appearance
    D->>API: PUT /api/chatbot/metadata/update
    API->>DB: Update settings
    DB-->>API: Saved
    API-->>D: Success
```

---

## 🤖 Chat Simulator Context Flow

### How Context Gets Passed to Chat

```mermaid
graph LR
    A[User Input] --> B[Active Section]
    B --> C[Section Knowledge Sources]
    C --> D[Knowledge Content]
    D --> E[AI Context]
    E --> F[AI Response]
    
    subgraph "Context Building"
        G[Section Rules] --> E
        H[Tone Settings] --> E
        I[Allowed/Blocked Topics] --> E
        J[Fallback Behavior] --> E
    end
```

### Chat Context Processing

```typescript
// Chat Simulator Context Structure
interface ChatContext {
  // Active section context
  activeSection: {
    id: string
    name: string
    tone: 'neutral' | 'friendly' | 'professional' | 'strict'
    allowedTopics: string[]
    blockedTopics: string[]
    fallbackBehavior: 'escalate' | 'refuse' | 'general_answer'
  }
  
  // Knowledge sources for this section
  knowledgeSources: Array<{
    id: string
    title: string
    content: string      // Processed markdown
    type: string        // 'website' | 'text' | 'upload'
    source_url?: string
  }>
  
  // Chatbot appearance
  appearance: {
    primaryColor: string
    avatarSrc: string
    welcomeMessage: string
  }
  
  // Conversation history
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
}
```

---

## 🔗 API Endpoints Summary

### Knowledge APIs
- **POST** `/api/knowledge/store` - Add/update knowledge source
- **GET** `/api/knowledge/fetch` - Get all user's knowledge sources
- **DELETE** `/api/knowledge/delete` - Delete knowledge source

### Sections APIs
- **POST** `/api/sections/store` - Create new section
- **PUT** `/api/sections/store` - Update existing section
- **GET** `/api/sections/fetch` - Get all user's sections
- **DELETE** `/api/sections/delete` - Delete section

### Chatbot APIs
- **GET** `/api/chatbot/metadata/fetch` - Get chatbot settings
- **PUT** `/api/chatbot/metadata/update` - Update chatbot settings

---

## 🎯 Key Integration Points

### 1. Knowledge → Sections
- Sections link to multiple knowledge sources via `source_ids` JSON array
- When a section is loaded, it fetches full content from linked knowledge
- Knowledge content provides the "brain" for section responses

### 2. Sections → Chat Simulator
- Active section determines conversation context
- Section tone affects response style
- Allowed/blocked topics filter responses
- Fallback behavior handles out-of-scope questions

### 3. Chatbot Settings → UI
- Primary color sets chat theme
- Avatar image shows in chat
- Welcome message starts conversations
- Widget ID enables embed functionality

---

## 🔄 Complete User Journey

```mermaid
journey
    title User Journey: Knowledge to Chat
    section Setup Phase
      Add Knowledge: 5: User
        User adds website/text/upload
        System processes and stores content
      Create Sections: 4: User
        User creates sections with rules
        User links knowledge to sections
      Configure Chatbot: 3: User
        User sets appearance
        System saves preferences
    
    section Chat Phase
      Start Chat: 5: User
        Chat loads with welcome message
        System shows active sections
      Send Message: 5: User
        User types message
        System applies section context
      Get Response: 4: System
        AI uses linked knowledge
        System follows section rules
        Response matches tone setting
```

---

## 🚀 Performance Optimizations

### 1. Knowledge Processing
- Content is processed once during upload
- Stored as optimized markdown for fast retrieval
- Indexed by workspace for quick queries

### 2. Context Loading
- Sections cache linked knowledge content
- Chat simulator loads context once per session
- Incremental updates when sections change

### 3. Response Generation
- Knowledge context filtered by section rules
- Tone applied during response generation
- Fallback behavior prevents hallucinations

---

## 🛡️ Security & Multi-tenancy

### Workspace Isolation
- All queries filtered by `workspace_id`
- Users can only access their own data
- Section-knowledge links respect workspace boundaries

### Data Flow Security
- API calls validate user session
- Workspace context enforced in all queries
- Cross-tenant data leakage prevented

---

## 📝 Summary

1. **Knowledge** provides the raw content (processed documents, websites, text)
2. **Sections** organize knowledge with rules and context (when to use, how to respond)
3. **Chatbot** configures the appearance and behavior (colors, avatar, welcome message)
4. **Chat Simulator** combines all three to generate contextual responses

The system ensures that:
- Knowledge is processed once and reused
- Sections provide intelligent context filtering
- Chat responses are relevant and properly styled
- User data remains secure and isolated
