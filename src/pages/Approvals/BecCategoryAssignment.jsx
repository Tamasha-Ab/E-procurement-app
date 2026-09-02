import { useEffect, useState } from "react";
import PageHero from "../../components/PageHero";
import { adminApi } from "../../api/adminApi";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { VENDOR_CATEGORY_OPTIONS } from "../../constants/vendorCategories";

const cardClass = "rounded-[28px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.07)]";
const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const buttonClass = "rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79] disabled:opacity-60";

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function assignmentsToMap(items) {
  return getArray(items).reduce((state, assignment) => ({
    ...state,
    [assignment.category]: {
      assignmentId: assignment.assignmentId,
      becUserId: assignment.becUserId,
      becName: assignment.becName,
    },
  }), {});
}

function displayUserName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return name || user?.username || user?.email || `User ${user?.userId || user?.id}`;
}

export default function BecCategoryAssignment() {
  const { token, user } = useAuth();
  const isBecHead = user?.mainRole === "FINANCE" && user?.subRole === "BEC_HEAD";
  const [becUsers, setBecUsers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !isBecHead) return;
    let mounted = true;
    Promise.all([
      adminApi.users.list({ mainRole: "FINANCE", subRole: "BEC", userStatus: "APPROVED", isActive: true, size: 100 }),
      procurementApi.becCategoryAssignments.list(token),
    ])
      .then(([usersPage, assignmentData]) => {
        if (!mounted) return;
        setBecUsers(getArray(usersPage));
        setAssignments(assignmentsToMap(assignmentData));
      })
      .catch((err) => setError(err.message || "Could not load BEC assignment data."));
    return () => {
      mounted = false;
    };
  }, [token, isBecHead]);

  const categories = VENDOR_CATEGORY_OPTIONS;

  const saveAssignment = async () => {
    if (!selectedCategory || !selectedUserId) {
      setError("Select a category and BEC member first.");
      return;
    }
    try {
      const saved = await procurementApi.becCategoryAssignments.save(token, {
        category: selectedCategory,
        becUserId: Number(selectedUserId),
      });
      const next = {
        ...assignments,
        [saved.category]: {
          assignmentId: saved.assignmentId,
          becUserId: saved.becUserId,
          becName: saved.becName,
        },
      };
      setAssignments(next);
      setNotice(`${saved.category} assigned to ${saved.becName || `BEC ${saved.becUserId}`}.`);
      setError("");
    } catch (err) {
      setNotice("");
      setError(err.message || "Could not save BEC category assignment.");
    }
  };
  if (!isBecHead) {
    return (
      <div className="min-h-screen bg-[#f4f8fb] p-6">
        <h1 className="text-2xl font-black text-[#10283f]">BEC Head Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only BEC Head users can assign categories to BEC members.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8fb] p-6">
      <PageHero
        eyebrow="BEC Head"
        title="BEC Category Assignment"
        description="Assign quotation categories to normal BEC members before sending vendor quotations for technical review."
      />

      {notice && <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}
      {error && <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="space-y-5">
        <section className={cardClass}>
          <h2 className="text-lg font-black text-[#10283f]">Assign Category</h2>
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-bold text-[#10283f]">
              Category
              <select className={`${inputClass} mt-2`} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-[#10283f]">
              BEC Member
              <select className={`${inputClass} mt-2`} value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                <option value="">Select BEC member</option>
                {becUsers.map((becUser) => (
                  <option key={becUser.userId || becUser.id} value={becUser.userId || becUser.id}>
                    {displayUserName(becUser)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={buttonClass} onClick={saveAssignment}>Save Assignment</button>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-black text-[#10283f]">Current Assignments</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(assignments).length ? Object.entries(assignments).map(([category, assignment]) => (
              <div key={category} className="rounded-2xl bg-[#f8fcff] p-4">
                <div className="text-sm font-black text-[#10283f]">{category}</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">{assignment.becName || `BEC ${assignment.becUserId}`}</div>
              </div>
            )) : (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">No category assignments saved yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

