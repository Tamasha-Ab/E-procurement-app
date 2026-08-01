import ApprovalQueue from "./ApprovalQueue";

export default function VcApprovals() {
  return (
    <ApprovalQueue
      roleKey="VC"
      title="VC Approvals"
      description="Review requisitions that exceed the threshold or are not included in the procurement plan, then approve them for BEC review or reject them with comments."
      pendingUrl="/api/approvals/vc/pending"
      actionBaseUrl="/api/approvals/vc"
    />
  );
}
