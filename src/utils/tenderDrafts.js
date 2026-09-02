const draftKey = (userId) => `astraea:tender-drafts:${userId || "current"}`;

export const loadTenderDrafts = (userId) => {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey(userId)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const saveTenderDraft = (userId, draft) => {
  const drafts = loadTenderDrafts(userId);
  const next = [draft, ...drafts.filter((item) => item.id !== draft.id)];
  localStorage.setItem(draftKey(userId), JSON.stringify(next));
  return next;
};

export const deleteTenderDraft = (userId, draftId) => {
  const next = loadTenderDrafts(userId).filter((item) => item.id !== draftId);
  localStorage.setItem(draftKey(userId), JSON.stringify(next));
  return next;
};
