document.addEventListener("DOMContentLoaded", () => {
    const editButton = document.getElementById("edit-button");
    const editPopup = document.getElementById("edit-popup");
    const closePopup = document.querySelector(".close-popup");
    const submitCodeButton = document.getElementById("submit-code");
    const sendRequestButton = document.getElementById("send-request");
    const secretCodeInput = document.getElementById("secret-code");
    const userEmailInput = document.getElementById("user-email");
    const changeRequestInput = document.getElementById("change-request");

    const secretCode = CONFIG.SECRET_CODE;
    const editorEmail = CONFIG.EDITOR_EMAIL;

    editButton.addEventListener("click", () => {
        editPopup.style.display = "flex";
    });

    closePopup.addEventListener("click", () => {
        editPopup.style.display = "none";
    });

    submitCodeButton.addEventListener("click", () => {
        if (secretCodeInput.value === secretCode) {
            window.location.href = "editor.html";
        } else {
            alert("Incorrect secret code.");
        }
    });

    sendRequestButton.addEventListener("click", () => {
        const userEmail = userEmailInput.value;
        const changeRequest = changeRequestInput.value;

        if (userEmail && changeRequest) {
            console.log(`Sending email to ${editorEmail}:`);
            console.log(`From: ${userEmail}`);
            console.log(`Message: ${changeRequest}`);
            alert("Your request has been sent to the editor.");
            editPopup.style.display = "none";
        } else {
            alert("Please fill in both your email and your change request.");
        }
    });
});
