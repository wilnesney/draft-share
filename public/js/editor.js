const Delta = Quill.import('delta');

const quill = new Quill('#draft-editor', {
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
        ],
    },
    placeholder: 'Paste your draft here...',
    theme: 'snow',
});

// Restrict to only text insertions and allowed attributes
quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
    const ops = delta.ops
        .filter(op => (typeof(op.insert) === 'string'))
        .map(op => {
            const sanitizedOp = { insert: op.insert };
            if (op.attributes) {
                const { bold, underline, italic } = op.attributes;
                if (bold || underline || italic) {
                    sanitizedOp.attributes = { bold, underline, italic };
                }
            }
            return sanitizedOp;
        });
        
    return new Delta(ops)
});

quill.focus();

// Form
const draftForm = document.getElementById('draft-form');
const draftAuthor = document.getElementById('draft-author');
const draftTitle = document.getElementById('draft-title');
const draftPassword = document.getElementById('draft-password');
const draftSubmitButton = document.getElementById('draft-submit-button');

const draftEditor = document.getElementById('draft-editor');

// Modal
const options = {};
const modal = new bootstrap.Modal('#modal', options);
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

draftForm.addEventListener('submit', e => {
    e.preventDefault();

    // Disable the submit button until response
    draftSubmitButton.disabled = true;    

    const draftHours = document.querySelector('input[name="draft-hours"]:checked');
    const hours = parseInt(draftHours.value);

    const draftData = {
        title: draftTitle.value,
        author: draftAuthor.value,
        hours,
        password: draftPassword.value,
        body: quill.getContents(),
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
        modalBody.innerHTML = `Your draft is ready at <br /><a target="_blank" href="${data.path}">${data.path}</a><br/>It will expire in ${hours} hours.`;
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