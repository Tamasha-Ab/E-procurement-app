import ApprovalQueue from "./ApprovalQueue";

export default function VcApprovals() {
  return (
    <ApprovalQueue
      roleKey="VC"
      title="VC Approvals"
      description="VC users will review technically evaluated requests and send approved requests to Bursar for budget verification."
      pendingUrl="/api/approvals/vc/pending"
      actionBaseUrl="/api/approvals/vc"
    />
  );
}
