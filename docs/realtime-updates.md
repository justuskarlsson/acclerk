# Realtime Status Updates - Architecture Analysis

This document analyzes different approaches for updating the frontend when backend status changes occur (e.g., invoice analysis completion, connection job progress).

## Problem Statement

The application has several long-running operations:
- Invoice analysis (uploaded → analyzed)
- Invoice-transaction connection (analyzed → to-verify/connection-fail)
- Future: accounting entry generation

Users need feedback when these operations complete. The question is how to propagate status changes from server to client.

---

## Approach 1: Polling

### Description
Client periodically fetches status from server at fixed intervals.

### Implementation
```typescript
// Client-side polling
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch('/api/invoices')
    setInvoices(res.json())
  }, 5000) // Poll every 5 seconds
  return () => clearInterval(interval)
}, [])
```

### Pros
- Simple to implement
- Works with any infrastructure
- No special server requirements
- Easy to debug

### Cons
- Wasteful if nothing changed
- Latency = poll interval (user waits up to N seconds)
- Scales poorly (N users × M requests/minute)
- Battery/bandwidth impact on mobile

### Cost Analysis
- Low latency (1s): 60 req/min/user → expensive
- Medium latency (5s): 12 req/min/user → moderate
- High latency (30s): 2 req/min/user → cheap but slow UX

---

## Approach 2: Server-Sent Events (SSE)

### Description
Server maintains open HTTP connection and pushes events to client.

### Implementation
```typescript
// Server (Next.js API route)
export async function GET(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      // Subscribe to events, call send() when status changes
    }
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}

// Client
const eventSource = new EventSource('/api/events')
eventSource.onmessage = (e) => updateUI(JSON.parse(e.data))
```

### Pros
- Real-time updates (sub-second latency)
- Efficient (no wasted requests)
- Native browser support
- Automatic reconnection
- Simpler than WebSockets

### Cons
- Unidirectional (server → client only)
- Connection limits per domain (~6 in HTTP/1.1)
- Requires event infrastructure (pub/sub)
- Stateful connections complicate scaling

### Infrastructure Requirements
- Redis pub/sub or similar for multi-instance
- Connection management
- Heartbeat/keepalive handling

---

## Approach 3: WebSockets

### Description
Full-duplex bidirectional communication channel.

### Implementation
```typescript
// Server (separate WebSocket server or adapter)
wss.on('connection', (ws) => {
  ws.on('message', (msg) => handleClientMessage(msg))
  // Push updates: ws.send(JSON.stringify(update))
})

// Client
const ws = new WebSocket('wss://example.com/ws')
ws.onmessage = (e) => updateUI(JSON.parse(e.data))
```

### Pros
- Bidirectional communication
- Lowest possible latency
- Efficient for high-frequency updates
- Can multiplex multiple data streams

### Cons
- Most complex to implement
- Requires separate WebSocket server/infrastructure
- Connection state management
- Firewall/proxy issues
- Overkill for simple status updates

### Infrastructure Requirements
- WebSocket server (Socket.io, ws, etc.)
- Sticky sessions or Redis adapter for scaling
- Health monitoring

---

## Approach 4: Manual Refresh

### Description
User manually triggers refresh via button click.

### Implementation
```typescript
const [isRefreshing, setIsRefreshing] = useState(false)

const handleRefresh = async () => {
  setIsRefreshing(true)
  await fetchInvoices()
  setIsRefreshing(false)
}

<Button onClick={handleRefresh} disabled={isRefreshing}>
  <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
  Refresh
</Button>
```

### Pros
- Simplest implementation
- Zero infrastructure cost
- No wasted requests
- Predictable behavior
- Works offline (shows stale data)

### Cons
- Requires user action
- User may not know to refresh
- Feels "old-fashioned"
- Poor UX for time-sensitive operations

---

## Recommendation: Phased Approach

### Phase 1 (Current): Manual Refresh
- Implement refresh buttons in /verify view
- Lowest risk, fastest to ship
- Gather user feedback on pain points

### Phase 2 (If needed): Hybrid Polling
- Add optional auto-refresh during active operations
- Poll only when user initiated an operation
- Stop polling after completion or timeout

```typescript
// Only poll after starting an operation
const [isOperationPending, setIsOperationPending] = useState(false)

useEffect(() => {
  if (!isOperationPending) return
  const interval = setInterval(fetchStatus, 3000)
  return () => clearInterval(interval)
}, [isOperationPending])
```

### Phase 3 (Scale concerns): SSE
- Implement if polling creates server load issues
- Single SSE endpoint for all status updates
- Use Redis pub/sub for multi-instance support

---

## Decision

**Selected approach: #4 Manual Refresh**

Rationale:
1. Simplest to implement and maintain
2. Operations are infrequent (users don't upload invoices constantly)
3. No infrastructure changes required
4. Can iterate to polling/SSE based on real user feedback
5. Explicit user control reduces confusion

The refresh button will be prominent and include clear loading states to provide good UX despite the manual nature.

