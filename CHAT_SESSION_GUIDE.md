# Chat Module - Single Session Implementation

## Overview
The chat module has been updated to use a **single session** between two users (patient and support/consultant) instead of creating multiple sessions for each conversation. This ensures:

- **Continuous conversation history** between the same two users
- **No duplicate sessions** for the same user pair
- **Automatic session resumption** when users reconnect

## Key Changes

### 1. `findOrCreateChatSession(patientId, supportId?)`
Replaces the old `createChatSession()` method. This method:
- Searches for an existing session between the patient and support
- If found, returns the existing session (reopens if completed)
- If not found, creates a new session
- Maintains all message history in the same session

```typescript
// Create or get session for a patient (no support assigned yet)
const session = await chatService.findOrCreateChatSession(patientId);

// Create or get session between specific patient and support
const session = await chatService.findOrCreateChatSession(patientId, supportId);
```

### 2. `getOrResumeSession(patientId, supportId)`
Helper method to explicitly resume a conversation between two users:

```typescript
const session = await chatService.getOrResumeSession(patientId, supportId);
```

### 3. `getActiveSession(patientId, supportId?)`
Updated to support finding sessions by patient-support pair:
- Returns active sessions (pending/ongoing) first
- Falls back to most recent completed session if no active session exists

```typescript
// Get session for a patient
const session = await chatService.getActiveSession(patientId);

// Get session between specific patient and support
const session = await chatService.getActiveSession(patientId, supportId);
```

### 4. `assignConsultantToSession(sessionId, supportId)`
Enhanced to check for existing sessions between the patient and support:
- If an existing session is found, it reuses that session
- Deletes the temporary pending session
- Reopens completed sessions automatically

## Behavior

### Session States
- **pending**: Patient requested chat, waiting for support
- **ongoing**: Support assigned, conversation active
- **completed**: Chat ended, but can be reopened

### Automatic Reopening
When a completed session is accessed again, it automatically:
- Changes status to `ongoing` (or `pending` if no support)
- Updates `startedAt` timestamp
- Clears `endedAt` timestamp
- Preserves all message history

## Usage Examples

### Patient Requests Chat
```typescript
// In chat.gateway.ts
@SubscribeMessage('request_chat')
async handleChatRequest(@MessageBody() payload: { patientId: string }) {
  // This will find existing session or create new one
  const chatSession = await this.chatService.findOrCreateChatSession(patientId);
  
  // Notify consultants about the request
  // ... existing logic
}
```

### Support Accepts Chat
```typescript
@SubscribeMessage('accept_chat')
async handleAcceptChat(@MessageBody() payload: { sessionId: string; supportId: string }) {
  // This checks for existing sessions and reuses them
  const updated = await this.chatService.assignConsultantToSession(
    payload.sessionId,
    payload.supportId
  );
  // ... existing logic
}
```

### Direct Message Between Users
```typescript
// When support wants to message a patient directly
const session = await chatService.getOrResumeSession(patientId, supportId);

// Send message to the session
await chatService.saveMessage(session.id, supportId, "Hello again!");
```

### Retrieving Chat History
```typescript
// Get all sessions for a user
const result = await chatService.getChatSessions(userId, page, limit, status);

// Get messages from a specific session (includes all history)
const messages = await chatService.getChatMessages(sessionId, userId, page, limit);
```

## Benefits

1. **Unified History**: All messages between two users are in one place
2. **No Duplicates**: Only one session exists per user pair
3. **Easy Resumption**: Users can continue conversations seamlessly
4. **Better UX**: Users see their entire conversation history
5. **Simpler Logic**: No need to track multiple sessions between same users

## Database Schema
No changes to the database schema are required. The existing `ChatSession` and `ChatMessage` models support this implementation:

```prisma
model ChatSession {
  id        String            @id @default(uuid())
  patientId String
  supportId String?
  startedAt DateTime          @default(now())
  endedAt   DateTime?
  status    SessionStatusEnum @default(pending)
  
  patient     User          @relation("ChatPatient", fields: [patientId], references: [id])
  support     User?         @relation("ChatSupport", fields: [supportId], references: [id])
  ChatMessage ChatMessage[]
}
```

## Migration Notes

If you have existing sessions with duplicate patient-support pairs:
1. The new logic will use the most recent session
2. Old sessions can be cleaned up or merged if needed
3. No data loss occurs - all messages are preserved in their original sessions

## Testing

Test scenarios:
1. ✅ Patient requests chat → creates new session
2. ✅ Patient requests chat again → reuses existing session
3. ✅ Support accepts → assigns to session
4. ✅ Chat ends → marks session as completed
5. ✅ Patient/Support reconnects → reopens same session
6. ✅ Message history loads → shows all messages from session
