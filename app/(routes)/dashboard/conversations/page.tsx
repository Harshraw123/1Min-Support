export default function ConversationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Conversations</h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-muted-foreground">Live monitoring</span>
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-brand-orange flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Your AI support agent is ready! Once customers start chatting, conversations will appear here.
        </p>
        <div className="flex gap-2 justify-center">
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Test Agent
          </button>
          <button className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
            View Settings
          </button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium">Today</span>
          </div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Conversations</p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium">This Week</span>
          </div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Conversations</p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <span className="text-sm font-medium">All Time</span>
          </div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Conversations</p>
        </div>
      </div>
    </div>
  );
}
