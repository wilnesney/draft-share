// passwordEntry defined elsewhere
const passwordVisibleCheckbox = document.getElementById('password-visible');

passwordVisibleCheckbox.checked = false;

const setPasswordShouldBeVisible = shouldBeVisible => {
    if (shouldBeVisible) {
        passwordEntry.type = 'text';
    } else {
        passwordEntry.type = 'password';
    }
}

passwordVisibleCheckbox.addEventListener('click', e => {
    if (passwordEntry.type === 'password') {
        setPasswordShouldBeVisible(true);
    } else {
        setPasswordShouldBeVisible(false);
    }
});

setPasswordShouldBeVisible(false);