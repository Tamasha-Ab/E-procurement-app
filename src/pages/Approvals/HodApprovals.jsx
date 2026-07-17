import ApprovalQueue from "./ApprovalQueue";

export default function HodApprovals() {
  return (
    <ApprovalQueue
      roleKey="HOD"
      title="Division Head Approvals"
      description="Division Heads review division requisitions, update item specification tables where needed, and submit approved final lists to the Dean."
      pendingUrl="/api/approvals/hod/pending"
      actionBaseUrl="/api/approvals/hod"
      acceptedUrl="/api/approvals/hod/accepted"
      specificationBaseUrl="/api/approvals/hod"
    />
  );
}
