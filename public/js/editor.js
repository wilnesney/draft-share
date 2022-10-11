const quillEditor = new Quill('#draft-editor', {
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
        ],
    },
    placeholder: 'Paste your draft here...',
    theme: 'snow',
});

quillEditor.focus();

// Form
const draftForm = document.getElementById('draft-form');
const draftAuthor = document.getElementById('draft-author');
const draftTitle = document.getElementById('draft-title');
const draftPassword = document.getElementById('draft-password');
const draftSubmitButton = document.getElementById('draft-submit-button');

// Modal
const options = {};
const modal = new bootstrap.Modal('#modal', options);
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

draftForm.addEventListener('submit', e => {
    e.preventDefault();

    //TODO: Disable stuff (at least the submit button) until response
    draftSubmitButton.disabled = true;
    

    const draftHours = document.querySelector('input[name="draft-hours"]:checked');

    const draftData = {
        title: draftTitle.value,
        author: draftAuthor.value,
        hours: parseInt(draftHours.value),
        password: draftPassword.value,
        body: quillEditor.getContents(),
    };

    fetch(`/api/draft`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData),
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        modalTitle.textContent = 'Success!';
        modalBody.innerHTML = `Your draft is ready at <a target="_blank" href="${data.path}">${data.path}</a>`;
    })
    .catch(err => {
        modalTitle.textContent = 'Something went wrong :(';
        modalBody.textContent = err;
    })
    .finally(() => {
        modal.show();
        draftSubmitButton.disabled = false;
    })
})