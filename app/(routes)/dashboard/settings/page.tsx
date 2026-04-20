export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Business Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business Name</label>
            <p className="text-sm text-muted-foreground">Configure your business details</p>
          </div>
          <div>
            <label className="text-sm font-medium">Website URL</label>
            <p className="text-sm text-muted-foreground">Update your website address</p>
          </div>
          <div>
            <label className="text-sm font-medium">Knowledge Sources</label>
            <p className="text-sm text-muted-foreground">Manage documentation and help links</p>
          </div>
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Agent Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Response Style</label>
            <p className="text-sm text-muted-foreground">Customize agent personality</p>
          </div>
          <div>
            <label className="text-sm font-medium">Language</label>
            <p className="text-sm text-muted-foreground">Set preferred language</p>
          </div>
        </div>
      </div>
    </div>
  );
}
