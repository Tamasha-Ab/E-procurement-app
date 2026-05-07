export async function apiRequest(path, { token, method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text().catch(() => "");
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || text || "Request failed");
  }

  return payload?.data ?? payload;
}

export const formatMoney = (value) => {
  const number = Number(value || 0);
  return `LKR ${number.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDateTime = (value) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
};

export const statusLabel = (value) => (value ? value.replaceAll("_", " ") : "UNKNOWN");
