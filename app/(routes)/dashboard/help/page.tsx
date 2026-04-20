export default function HelpPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Help Center</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
          <p className="text-sm text-muted-foreground mb-4">Learn how to set up your AI support agent</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
              <span className="text-sm">Configure business information</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
              <span className="text-sm">Add knowledge sources</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
              <span className="text-sm">Customize agent responses</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-2">Common Questions</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">How do I train my AI agent?</p>
              <p className="text-sm text-muted-foreground">Add your website URL and documentation links</p>
            </div>
            <div>
              <p className="text-sm font-medium">Can I customize responses?</p>
              <p className="text-sm text-muted-foreground">Yes, in the settings panel</p>
            </div>
            <div>
              <p className="text-sm font-medium">How do I view conversations?</p>
              <p className="text-sm text-muted-foreground">Navigate to the Conversations tab</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-primary/10 to-brand-orange/10 p-6">
        <h3 className="text-lg font-semibold mb-2">Need More Help?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Our support team is here to help you get the most out of your AI support agent.
        </p>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Contact Support
        </button>
      </div>
    </div>
  );
}
