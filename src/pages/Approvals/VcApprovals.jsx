import ApprovalQueue from "./ApprovalQueue";

export default function VcApprovals() {
  return (
    <ApprovalQueue
      roleKey="VC"
      title="Vice Chancellor Approvals"
      description="Review requests that are outside the procurement plan or exceed LKR 500,000, then send them to TEC or return them to the Dean."
      pendingUrl="/api/approvals/vc/pending"
      actionBaseUrl="/api/approvals/vc"
      isDean
      approveLabel="Approve and Send to TEC"
      rejectLabel="Return to Dean"
    />
  );
}
