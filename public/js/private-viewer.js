const authForm = document.getElementById('auth-form');
const passwordEntry = document.getElementById('password-entry');

// Modal
const options = {};
const modal = new bootstrap.Modal('#modal', options);
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

modal.show();

const onCancel = () => {
    console.log('onCancel() called')
    window.location.assign(new URL('/', window.location.href)); // Keep this page in history
}

authForm.addEventListener('submit', e => {
    console.log('submit handler')
    e.preventDefault();

    let id = window.location.toString();
    if (id.endsWith('/')) {
        id = id.substring(0, id.length - 1);
    }
    id = id.substring(id.lastIndexOf('/') + 1);

    const password = passwordEntry.value;
    passwordEntry.value = '';

    fetch(`/api/private/${id}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    })
    .then(res => res.json())
    .then(data => {
        if (data.title) {
            document.getElementById('title').textContent = data.title;
            document.title = `${data.title} | Draft Share`;
        }
        if (data.author) {
            document.getElementById('author').textContent = data.author;
        }
        document.getElementById('draft-viewer').innerHTML = data.body;
    })
    .catch(err => {
        // Don't keep this page in history
        window.location.replace(new URL('/not-found', window.location.href));
    })

})