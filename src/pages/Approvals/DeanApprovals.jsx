import ApprovalQueue from "./ApprovalQueue";

export default function DeanApprovals() {
  return (
    <ApprovalQueue
      roleKey="Dean"
      title="Dean Approvals"
      description="Dean users will review faculty-level requests approved by HOD and route them toward TEC review or back to staff."
      pendingUrl="/api/approvals/dean/pending"
      actionBaseUrl="/api/approvals/dean"
    />
  );
}
