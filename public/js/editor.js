const Delta = Quill.import('delta');

const maxBodyChars = 65_000;

// Form
const draftForm = document.getElementById('draft-form');
const draftAuthor = document.getElementById('draft-author');
const draftTitle = document.getElementById('draft-title');
const passwordEntry = document.getElementById('password-entry');
const draftSubmitButton = document.getElementById('draft-submit-button');

const draftEditor = document.getElementById('draft-editor');

// Main Messaging Modal
const modal = new bootstrap.Modal('#modal', {});
const modalTitle = document.getElementById('modal-title');
const modalSuccessMessage = document.getElementById('modal-success-message');
const modalErrorMessage = document.getElementById('modal-error-message');
const modalDraftLink = document.getElementById('modal-draft-link');
const modalCopyButton = document.getElementById('modal-copy-button');
const numHoursSpan = document.getElementById('num-hours-span');
const copyResponseToastElement = document.getElementById('copy-response-toast');
const copyResponseToast = new bootstrap.Toast(copyResponseToastElement, {});
const copyResponseToastBody = document.getElementById('copy-response-toast-body');

// Page Load Indicator "Modal"
const fullPageSpinner = document.getElementById('full-page-spinner');
const fullPageSpinnerModal = new bootstrap.Modal(fullPageSpinner, {}); 

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

modalCopyButton.addEventListener('click', e => {
    const url = modalDraftLink.textContent;
    navigator.clipboard.writeText(url).then(
        () => {
            // On copy success
            copyResponseToastBody.textContent = 'Copied to clipboard!';
            copyResponseToast.show();
        },
        () => {
            // On copy failure
            copyResponseToastBody.textContent = "Oops! The copy didn't work. Instead, you can highlight and then copy the link.";
            modalCopyButton.style.display = 'none'; // Might as well hide this button, since it doesn't seem to work
            copyResponseToast.show();
        }
    )
})

draftForm.addEventListener('submit', e => {
    e.preventDefault();

    setPasswordShouldBeVisible(false); // Hide password on submit

    const validateResult = validate();
    if (validateResult.error) {
        modalTitle.textContent = 'Hold on!';
        modalErrorMessage.textContent = validateResult.error;
        modalErrorMessage.style.display = 'block';
        modalSuccessMessage.style.display = 'none';
        modal.show();

        return;
    }

    // Disable the submit button until response
    draftSubmitButton.disabled = true;
    // Hide loading spinner modal and show the message-bearing modal
    fullPageSpinner.addEventListener('hidden.bs.modal', event => {
        modal.show();
    });
    /* If we try to hide the loading spinner modal before it finishes showing (i.e., fading in),
       the hide will fail. So, we make sure everything happens *after* the modal
       finishes showing. */
    fullPageSpinner.addEventListener('shown.bs.modal', event => {
        const draftHours = document.querySelector('input[name="draft-hours"]:checked');
        const hours = parseInt(draftHours.value);

        const draftData = {
            title: draftTitle.value,
            author: draftAuthor.value,
            hours,
            password: passwordEntry.value,
            body: quill.getContents(),
        };
        passwordEntry.value = '';   // Clear password as soon as we're done with it

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
            modalDraftLink.href = data.path;
            modalDraftLink.textContent = data.path;
            numHoursSpan.textContent = hours;
            modalErrorMessage.style.display = 'none';
            modalSuccessMessage.style.display = 'block';
        })
        .catch(err => {
            modalTitle.textContent = 'Something went wrong :(';
            modalErrorMessage.textContent = err;
            modalErrorMessage.style.display = 'block';
            modalSuccessMessage.style.display = 'none';
        })
        .finally(() => {
            fullPageSpinnerModal.hide();    

            draftSubmitButton.disabled = false;
        });
    });

    // With the listener in place, we can safely show our loading indicator.
    fullPageSpinnerModal.show();
});