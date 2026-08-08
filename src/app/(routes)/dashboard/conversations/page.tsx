import ConversationsInbox from "@/components/dashboard/ConversationsInbox";

/** Support inbox: filters, thread, take/assign/reply/resolve — backed by /api/conversations. */
export default function ConversationsPage() {
  return (
    <div className="flex flex-1 flex-col p-3 md:p-6">
      <ConversationsInbox />
    </div>
  );
}
