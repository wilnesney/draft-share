const quillEditor = new Quill('#draft-editor', {
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
        ],
    },
    placeholder: 'Paste your draft here...',
    theme: 'snow',
});

const draftForm = document.getElementById('draft-form');
const draftAuthor = document.getElementById('draft-author');
const draftTitle = document.getElementById('draft-title');
const draftPassword = document.getElementById('draft-password');

draftForm.addEventListener('submit', e => {
    e.preventDefault();

    const draftHours = document.querySelector('input[name="draft-hours"]:checked');

    const draftData = {
        title: draftTitle.value,
        author: draftAuthor.value,
        hours: parseInt(draftHours.value),
        password: draftPassword.value,
        body: quillEditor.getContents(),
    };

    console.log(draftData); //TODO: Fetch request

    fetch(`/api/draft`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData),
    })
    .then(res => res.json())
    .then(data => alert(`Your draft is ready at ${data.path}`))
    .catch(err => alert(err));
})