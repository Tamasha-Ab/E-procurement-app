import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { requestDisplayName } from "../../utils/procurementDisplay";
import { getSeniorAssistantBursarPath } from "../../utils/roleRoutes";

const financeSubRoles = ["BURSAR", "ASSISTANT_BURSAR", "SENIOR_ASSISTANT_BURSAR"];

const sampleImageSrc = (spec) => {
  if (!spec?.sampleImageBase64) return null;
  return `data:${spec.sampleImageContentType || "image/jpeg"};base64,${spec.sampleImageBase64}`;
};

const specificationImages = (spec) => {
  if (spec?.sampleImages?.length) {
    return spec.sampleImages
      .filter((image) => image.imageBase64)
      .map((image) => ({
        name: image.imageName || "Sample image",
        src: `data:${image.contentType || "image/jpeg"};base64,${image.imageBase64}`,
      }));
  }
  const legacySrc = sampleImageSrc(spec);
  return legacySrc ? [{ name: spec.sampleImageName || "Sample image", src: legacySrc }] : [];
};

const parseSpecificationTableRows = (specificationText = "") => specificationText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("Item Name") && !line.startsWith("Qty"))
  .map((line) => {
    const numberedMatch = line.match(/^\d+\.\s*(.*?)\s+-\s*(.*)$/);
    if (numberedMatch) return { description: numberedMatch[1], requiredSpecification: numberedMatch[2] };
    const [description, ...requiredParts] = line.split(":");
    return { description: description?.trim() || "", requiredSpecification: requiredParts.join(":").trim() };
  })
  .filter((row) => row.description || row.requiredSpecification);

const parseSubmittedForm = (description = "") => {
  const form = {};
  description.split(/\r?\n/).forEach((line) => {
    const [rawKey, ...rawValueParts] = line.split(":");
    if (!rawKey || rawValueParts.length === 0) return;
    const key = rawKey.trim();
    const value = rawValueParts.join(":").trim();

    if (key === "Faculty/Admin") form.facultyAdmin = value;
    if (key === "Department/Branch") form.departmentBranch = value;
    if (key === "Contact Person") form.contactPerson = value;
    if (key === "Telephone No") form.telephoneNo = value;
    if (key === "Included in procurement plan") form.includedInPlan = value;
    if (key === "Budgeted allocation") form.budgetAllocation = value;
    if (key === "Used amount so far") form.usedAmount = value;
    if (key === "Balance available") form.balanceAvailable = value;
    if (key === "Purpose") form.purpose = value;

    if (key === "Funds") {
      const fundsMatch = value.match(/GOSL\s+(Yes|No),\s+Project\s+(.*),\s+Vote\s+(.*)$/i);
      if (fundsMatch) {
        form.fundsGosl = fundsMatch[1];
        form.project = fundsMatch[2];
        form.vote = fundsMatch[3];
      }
    }
  });
  return form;
};

export default function FinanceCategoryRrDetails() {
  const { token, user } = useAuth();
  const { rrId } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isFinanceViewer = user?.mainRole === "FINANCE" && financeSubRoles.includes(user?.subRole);
  const selected = useMemo(
    () => requests.find((request) => String(request.rrId) === String(rrId)),
    [requests, rrId]
  );

  useEffect(() => {
    if (!token || !isFinanceViewer) return;
    setLoading(true);
    setError("");
    Promise.all([
      apiRequest("/api/tenders/bursar/requisitions/pending", { token }),
      apiRequest("/api/tenders/bursar/requisitions/final", { token }),
    ])
      .then(([pending, finalList]) => {
        setRequests([
          ...(Array.isArray(pending) ? pending : []),
          ...(Array.isArray(finalList) ? finalList : []),
        ]);
      })
      .catch((err) => setError(err.message || "Could not load RR details."))
      .finally(() => setLoading(false));
  }, [token, isFinanceViewer]);

  if (!isFinanceViewer) {
    return (
      <div className="rounded-[30px] border border-[#dce8ef] bg-white p-8 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <h1 className="text-2xl font-black text-[#10283f]">Finance Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">This page is available only for Bursar, Assistant Bursar, and Senior Assistant Bursar users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Finance Department"
        title={selected ? `Submitted RR Details - ${requestDisplayName(selected)}` : "Submitted RR Details"}
        description="View the submitted RR details and submitted specifications from the BEC category list."
      >
        <div className="rounded-xl bg-white/10 px-4 py-2.5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Category</div>
          <div className="mt-2 max-w-xs text-xl font-black">{selected?.vendorCategories || (loading ? "Loading..." : "Not recorded")}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading && <div className="rounded-[24px] bg-white p-5 text-sm text-slate-600">Loading RR details...</div>}

      {!loading && !selected && (
        <div className="space-y-4 rounded-[24px] bg-white p-5">
          <div className="text-sm text-slate-600">This RR is not available in the Finance Department list anymore.</div>
          <button type="button" onClick={() => navigate(getSeniorAssistantBursarPath(user, "received-rr-lists", "/finance/received-rr-lists"))} className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]">
            Back to Received RR Lists
          </button>
        </div>
      )}

      {selected && (
        <section className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-[#10283f]">{requestDisplayName(selected)}</h2>
                <StatusPill status={selected.status} />
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                {selected.divisionName || selected.facultyName || "Not assigned"} | {formatDateTime(selected.submittedAt)}
              </div>
            </div>
            <button type="button" onClick={() => navigate(getSeniorAssistantBursarPath(user, "received-rr-lists", "/finance/received-rr-lists"))} className="rounded-2xl border border-[#dce8ef] px-5 py-3 text-sm font-bold text-[#10283f] hover:bg-slate-50">
              Back
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <DetailTile label="Request Name" value={requestDisplayName(selected)} />
            <DetailTile label="Category" value={selected.vendorCategories || "Not recorded"} />
            <DetailTile label="Amount" value={formatMoney(selected.estimatedTotalAmount)} />
            <DetailTile label="Requested By" value={selected.requestedByName || "Not recorded"} />
            <DetailTile label="Priority" value={selected.priority || "Not set"} />
            <DetailTile label="Current Stage" value={statusLabel(selected.currentStage)} />
          </div>

          <div className="mt-6 rounded-[24px] border border-[#dce8ef] bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Submitted RR Details</div>
            <SubmittedRequisitionForm request={selected} />
          </div>

          <div className="mt-6 rounded-[24px] bg-[#f8fcff] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Justification</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">{selected.justification || "No justification provided."}</div>
          </div>

          <section className="mt-6 rounded-[24px] border border-[#dce8ef] bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Requested Items</div>
            <div className="mt-4 space-y-3">
              {(selected.items || []).length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No item details recorded.</div>
              )}
              {(selected.items || []).map((item, index) => (
                <div key={item.itemId || index} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-[#10283f]">{item.itemName || `Item ${index + 1}`}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">{item.description || "No item description."}</div>
                    </div>
                    <div className="text-right text-sm font-bold text-[#166e8c]">{formatMoney(item.estimatedTotalPrice)}</div>
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Qty {item.quantity} {item.unitOfMeasure || "Units"} | Unit {formatMoney(item.estimatedUnitPrice)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-[24px] border border-[#dce8ef] bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Submitted Specifications</div>
            <div className="mt-4 space-y-4">
              {(selected.technicalSpecifications || []).length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No specification details submitted.</div>
              )}
              {(selected.technicalSpecifications || []).map((spec) => {
                const images = specificationImages(spec);
                const rows = parseSpecificationTableRows(spec.specificationText);
                return (
                  <div key={spec.specId || spec.itemId || spec.itemName} className="rounded-2xl bg-slate-50 p-4">
                    <div className="font-bold text-[#10283f]">{spec.itemName || selected.itemName || "General RR specification"}</div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse bg-white text-sm text-[#10283f]">
                        <thead>
                          <tr>
                            <th className="border border-slate-700 px-3 py-2 text-left">Description</th>
                            <th className="border border-slate-700 px-3 py-2 text-left">Required Specification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 && (
                            <tr><td colSpan={2} className="border border-slate-700 px-3 py-3 text-slate-600">No specification text provided.</td></tr>
                          )}
                          {rows.map((row, index) => (
                            <tr key={`${row.description}-${index}`}>
                              <td className="border border-slate-700 px-3 py-2 font-semibold">{row.description}</td>
                              <td className="border border-slate-700 px-3 py-2">{row.requiredSpecification}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {images.length > 0 && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {images.map((image, index) => (
                          <div key={`${image.name}-${index}`} className="border border-slate-200 bg-white p-2">
                            <div className="mb-2 truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{image.name}</div>
                            <img src={image.src} alt={image.name} className="max-h-72 w-full object-contain" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate(`${getSeniorAssistantBursarPath(user, "rfq-creation", "/bursar/create-rfq")}?rrId=${selected.rrId}&category=${encodeURIComponent(selected.vendorCategories || "")}`)}
              className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
            >
              Create and send RFQ
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}

function SubmittedRequisitionForm({ request }) {
  const form = parseSubmittedForm(request.description || "");
  const firstItem = request.items?.[0] || {};
  const total = firstItem.estimatedTotalPrice || request.estimatedTotalAmount;
  const cell = "border border-slate-700 align-top";
  const label = "border border-slate-700 bg-slate-100 px-3 py-3 text-center text-sm font-black text-[#10283f]";

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[780px] border border-slate-700 bg-white p-4 text-[#10283f]">
        <div className="grid gap-4 md:grid-cols-[1fr_170px]">
          <div>
            <div className="text-xl font-black uppercase tracking-wide">University of Ruhuna - Faculty of Engineering</div>
            <div className="text-lg font-black uppercase">Purchase Requisition Form</div>
            <div className="mt-1 text-xs leading-5 text-slate-700">
              Finance Branch<br />
              Tel: Extension 1101 Fax 0912245762<br />
              Email: bursar@eng.ruh.ac.lk<br />
              Web: http://www.eng.ruh.ac.lk
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[70px_1fr] border border-slate-700">
              <div className="border-r border-slate-700 px-2 py-2 font-semibold">Form No</div>
              <div className="px-2 py-2">{request.rrNumber || ""}</div>
            </div>
            <div className="grid grid-cols-[70px_1fr] border border-slate-700">
              <div className="border-r border-slate-700 px-2 py-2 font-semibold">Date</div>
              <div className="px-2 py-2">{request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : ""}</div>
            </div>
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td rowSpan={3} className={label}>User</td>
              <td className={`${cell} w-44 px-3 py-2 font-semibold`}>Faculty/Admin</td>
              <td colSpan={3} className={`${cell} px-3 py-2`}>{form.facultyAdmin || request.facultyName || ""}</td>
            </tr>
            <tr>
              <td className={`${cell} px-3 py-2 font-semibold`}>Department/Branch</td>
              <td colSpan={3} className={`${cell} px-3 py-2`}>{form.departmentBranch || request.divisionName || ""}</td>
            </tr>
            <tr>
              <td className={`${cell} px-3 py-2 font-semibold`}>Contact Person</td>
              <td className={`${cell} px-3 py-2`}>{form.contactPerson || request.requestedByName || ""}</td>
              <td className={`${cell} w-32 px-3 py-2 font-semibold`}>Telephone No</td>
              <td className={`${cell} px-3 py-2`}>{form.telephoneNo || ""}</td>
            </tr>

            <tr>
              <td rowSpan={5} className={label}>Funds</td>
              <td colSpan={4} className={`${cell} px-3 py-2`}>
                <div className="flex flex-wrap gap-5">
                  <span><b>Funds GOSL</b> {form.fundsGosl || ""}</span>
                  <span><b>Project</b> {form.project || ""}</span>
                  <span><b>Vote</b> {form.vote || ""}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} px-3 py-2`}>
                Whether the item/items requested included in procurement plan
                <div className="mt-2 font-semibold">{form.includedInPlan || ""}</div>
              </td>
              <td colSpan={2} className={`${cell} px-3 py-2 text-center`}>
                * If No should get the Vice Chancellor's approval
              </td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cell} px-3 py-2`}>Budgeted allocation Rs. {form.budgetAllocation || ""}</td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cell} px-3 py-2`}>Used amount so far Rs. {form.usedAmount || ""}</td>
            </tr>
            <tr>
              <td colSpan={4} className={`${cell} px-3 py-2`}>Balance available Rs. {form.balanceAvailable || ""}</td>
            </tr>

            <tr>
              <td rowSpan={2} className={label}>Object</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Description of the item/items intended to be purchased</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Cost (Approximately)</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Qty. Required</td>
              <td className={`${cell} px-2 py-2 text-center font-semibold`}>Qty. Already Available</td>
            </tr>
            <tr className="h-32">
              <td className={`${cell} p-3`}>{firstItem.description || firstItem.itemName || request.itemName || ""}</td>
              <td className={`${cell} p-3`}>{formatMoney(firstItem.estimatedUnitPrice || request.estimatedUnitPrice)}</td>
              <td className={`${cell} p-3`}>{firstItem.quantity || request.quantity || ""}</td>
              <td className={`${cell} p-3`}></td>
            </tr>
            <tr>
              <td className={label}>Purpose</td>
              <td colSpan={4} className={`${cell} px-3 py-3`}>
                <div className="font-semibold">{form.purpose || "Normal"}</div>
                <div className="mt-2"><b>Estimated Total:</b> {formatMoney(total)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
