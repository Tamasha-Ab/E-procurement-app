import ApprovalQueue from "./ApprovalQueue";

export default function HodApprovals() {
  return (
    <ApprovalQueue
      roleKey="HOD"
      title="HOD Approvals"
      description="HOD users will review department requisitions submitted by staff and decide whether to approve, reject, or return them."
      pendingUrl="/api/approvals/hod/pending"
      actionBaseUrl="/api/approvals/hod"
    />
  );
}
