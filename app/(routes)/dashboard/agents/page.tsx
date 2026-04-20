export default function AgentsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Agents</h2>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-brand-orange flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Your AI Support Agent</h3>
            <p className="text-sm text-muted-foreground">Configured and ready to assist customers</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
        </div>
        
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <h4 className="font-medium">Knowledge Base</h4>
            <p className="text-sm text-muted-foreground mt-1">Website and documentation sources</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <h4 className="font-medium">Capabilities</h4>
            <p className="text-sm text-muted-foreground mt-1">Customer support, FAQ answering, product help</p>
          </div>
        </div>
      </div>
    </div>
  );
}
