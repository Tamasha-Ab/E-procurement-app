import ApprovalQueue from "./ApprovalQueue";

export default function DeanApprovals() {
  return (
    <ApprovalQueue
      roleKey="DEAN"
      title="Dean Approvals"
      description="Review Division Head-approved requisitions from your faculty and either send them to TEC or return them to the Division Head with a comment."
      pendingUrl="/api/approvals/dean/pending"
      actionBaseUrl="/api/approvals/dean"
      isDean
      approveLabel="Approve and Send to TEC"
    />
  );
}
