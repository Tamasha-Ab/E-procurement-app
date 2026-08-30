import ApprovalQueue from "./ApprovalQueue";

export default function DeanApprovals() {
  return (
    <ApprovalQueue
      roleKey="DEAN"
      title="Dean Approvals"
      description="Dean reviews Division Head approved requisitions and approves them for TEC review or rejects them with comments."
      pendingUrl="/api/approvals/dean/pending"
      actionBaseUrl="/api/approvals/dean"
    />
  );
}
