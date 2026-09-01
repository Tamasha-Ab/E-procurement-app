import ApprovalQueue from "./ApprovalQueue";

export default function HodApprovals() {
  return (
    <ApprovalQueue
      roleKey="HOD"
      title="Division Head Approvals"
      description="Division Heads review division requisitions submitted by staff and decide whether to approve, reject, or return them."
      pendingUrl="/api/approvals/hod/pending"
      actionBaseUrl="/api/approvals/hod"
      acceptedUrl="/api/approvals/hod/accepted"
      specificationBaseUrl="/api/approvals/hod"
    />
  );
}
