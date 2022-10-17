// Password Modal
const authForm = document.getElementById('auth-form');
const passwordEntry = document.getElementById('password-entry');
const passwordModal = new bootstrap.Modal('#password-modal', {});

passwordModal.show();

const onCancel = () => {
    // Redirect to home if user cancels password entry
    window.location.assign(new URL('/', window.location.href)); // Keep this page in history
}

authForm.addEventListener('submit', e => {
    e.preventDefault();

    const password = passwordEntry.value;
    passwordEntry.value = '';

    loadDraft((id) => fetch(`/api/private/${id}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    }));
})