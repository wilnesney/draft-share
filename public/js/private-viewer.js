const authForm = document.getElementById('auth-form');
const authPassword = document.getElementById('auth-password');

authForm.addEventListener('submit', e => {
    console.log('submit handler')
    e.preventDefault();

    let id = window.location.toString();
    if (id.endsWith('/')) {
        id = id.substring(0, id.length - 1);
    }
    id = id.substring(id.lastIndexOf('/') + 1);

    const password = authPassword.value;
    authPassword.value = '';

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
        alert(err);
    })

})