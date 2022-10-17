const Delta = Quill.import('delta');

const maxBodyChars = 65_000;

// Form
const draftForm = document.getElementById('draft-form');
const draftAuthor = document.getElementById('draft-author');
const draftTitle = document.getElementById('draft-title');
const passwordEntry = document.getElementById('password-entry');
const draftSubmitButton = document.getElementById('draft-submit-button');

const draftEditor = document.getElementById('draft-editor');

// Modal
const options = {};
const modal = new bootstrap.Modal('#modal', options);
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

// Other UI
const bodyErrorText = document.getElementById('body-error-text');

const quill = new Quill('#draft-editor', {
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
        ],
    },
    placeholder: 'Paste your draft here...',
    theme: 'snow',
});

quill.focus();

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

// Quill adds unwanted whitespace (tab) if it sees an indent, so we remove that.
quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
    const style = node.style || {};

    // Must counter: return new Delta().insert('\t').concat(delta);
    if ((delta.ops?.[0]?.insert?.[0] === '\t') && (parseFloat(style.textIndent || 0) > 0)) {
        const change = new Delta().delete(1);
        return delta.compose(change);
    }
    return delta;
})

// If the value returned by this is positive, then the body text is too long.
const getNumCharsOverLimit = () => {
    const text = quill.getText();
    const textLen = text.length - 1;    // Account for the newline character that's always there
    return textLen - maxBodyChars;
}

// Let user know if they go over the text length limit.
quill.on('text-change', (delta, oldDelta, source) => {
    const numCharsOverLimit = getNumCharsOverLimit();
    if (numCharsOverLimit > 0) {
        bodyErrorText.textContent = `Limit is ${maxBodyChars} characters. You are ${numCharsOverLimit} character${numCharsOverLimit > 1 ? 's' : ''} over the limit.`;
    } else {
        bodyErrorText.innerHTML = '';
    }
});

const validate = () => {
    const result = {};
    if (getNumCharsOverLimit() > 0) {
        result.error = `Please shorten your draft to (at most) ${maxBodyChars} characters.`;
    } else if (quill.getText().trim().length < 1) {
        result.error = 'Please add some text to your draft.';
    }

    return result;
}

draftForm.addEventListener('submit', e => {
    e.preventDefault();

    const validateResult = validate();
    if (validateResult.error) {
        modalTitle.textContent = 'Hold on!';
        modalBody.textContent = validateResult.error;
        modal.show();

        return;
    }

    // Disable the submit button until response
    draftSubmitButton.disabled = true;

    const draftHours = document.querySelector('input[name="draft-hours"]:checked');
    const hours = parseInt(draftHours.value);

    const draftData = {
        title: draftTitle.value,
        author: draftAuthor.value,
        hours,
        password: passwordEntry.value,
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
        passwordEntry.value = '';
        setPasswordShouldBeVisible(false);
    });
})