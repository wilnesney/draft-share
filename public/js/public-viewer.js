
loadDraft((id) => fetch(`/api/public/${id}`, {
    method: 'GET',
    headers: { "Content-Type": "application/json" },
}));