// API owners may be populated user objects or plain account IDs.
export function belongsToAccount(owner, account) {
  const idOf = (value) => typeof value === "object" && value !== null
    ? value._id || value.id
    : value;
  const ownerId = idOf(owner);
  const accountId = idOf(account);
  return ownerId != null && accountId != null &&
    String(ownerId) !== "" && String(accountId) !== "" &&
    String(ownerId) === String(accountId);
}
