import ApprovalQueue from "./ApprovalQueue";

export default function BecApprovals() {
  return (
    <ApprovalQueue
      roleKey="BEC"
      title="BEC Approvals"
      description="Review Dean or VC approved requisitions and approve them for Bursar budget review or reject them with comments."
      pendingUrl="/api/approvals/bec/pending"
      actionBaseUrl="/api/approvals/bec"
    />
  );
}
