// Error Modal
const errorModal = new bootstrap.Modal('#error-modal', {});
const errorModalBody = document.getElementById('error-modal-body');
const errorModalConfirm = document.getElementById('error-modal-confirm');

const loadDraft = async (requester) => {
    try {
        let id = window.location.toString();
        if (id.endsWith('/')) {
            id = id.substring(0, id.length - 1);
        }
        id = id.substring(id.lastIndexOf('/') + 1);

        const res = await requester(id);

        const data = await res.json();
        if (data.error) {
            // A 500 may be recoverable later (e.g., after refresh), 
            // but for anything else, throw to send to the 404 page.
            if (res.status === 500) {
                errorModalBody.textContent = data.error;
                errorModal.show();
                document.getElementById('draft-viewer').textContent = data.error;
                return;
            } else {
                throw new Error(data.error);
            }
        }
        if (data.title) {
            document.getElementById('title').textContent = data.title;
            document.title = `${data.title} | Draft Share`;
        }
        if (data.author) {
            document.getElementById('author').textContent = `by ${data.author}`;
        }
        document.getElementById('draft-viewer').innerHTML = data.body;
        
    } catch (e) {
        window.location.replace(new URL('/not-found', window.location.href));
    }
}