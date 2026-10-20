
/* ========================================
   MedIntelliX - Login Functionality
   ======================================== */

document.addEventListener("DOMContentLoaded", function () {

    // Get HTML elements
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const loginButton = document.getElementById("loginButton");
    const loginMessage = document.getElementById("loginMessage");
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    const currentYear = document.getElementById("current-year");

    // Update footer year
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    // Display a message on the login page
    function showMessage(message, type = "info") {
        if (!loginMessage) return;

        loginMessage.textContent = message;
        loginMessage.hidden = false;

        // Reset message styling
        loginMessage.classList.remove(
            "message-info",
            "message-error",
            "message-success"
        );

        loginMessage.classList.add(`message-${type}`);
    }

    // Hide the current message
    function hideMessage() {
        if (loginMessage) {
            loginMessage.hidden = true;
            loginMessage.textContent = "";
        }
    }

    // Get the selected portal
    function getSelectedRole() {
        const selectedRole = document.querySelector(
            'input[name="userRole"]:checked'
        );

        return selectedRole ? selectedRole.value : "";
    }

    // Password visibility toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", function () {

            const isPasswordHidden =
                passwordInput.type === "password";

            passwordInput.type = isPasswordHidden
                ? "text"
                : "password";

            togglePassword.innerHTML = isPasswordHidden
                ? '<i class="bi bi-eye-slash"></i>'
                : '<i class="bi bi-eye"></i>';

            togglePassword.setAttribute(
                "aria-label",
                isPasswordHidden ? "Hide password" : "Show password"
            );

            togglePassword.setAttribute(
                "aria-pressed",
                String(isPasswordHidden)
            );

        });
    }

    // Clear validation styling as the user types
    [emailInput, passwordInput].forEach(function (input) {

        if (!input) return;

        input.addEventListener("input", function () {
            input.classList.remove("is-invalid");
            hideMessage();
        });

    });

    // Clear messages when a different portal is selected
    document.querySelectorAll('input[name="userRole"]').forEach(
        function (radio) {

            radio.addEventListener("change", function () {
                hideMessage();
            });

        }
    );

    // Login form submission
    if (loginForm) {

        loginForm.addEventListener("submit", function (event) {

            // Prevent the browser's default form submission
            event.preventDefault();

            hideMessage();

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const role = getSelectedRole();

            let isValid = true;

            // Validate email
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email || !emailPattern.test(email)) {
                emailInput.classList.add("is-invalid");
                isValid = false;
            } else {
                emailInput.classList.remove("is-invalid");
            }

            // Validate password
            if (!password.trim()) {
                passwordInput.classList.add("is-invalid");
                isValid = false;
            } else {
                passwordInput.classList.remove("is-invalid");
            }

            // Validate portal selection
            if (!role) {
                showMessage(
                    "Please select a portal before continuing.",
                    "error"
                );

                return;
            }

            // Stop if form fields are invalid
            if (!isValid) {
                showMessage(
                    "Please enter a valid email address and password.",
                    "error"
                );

                return;
            }

            /*
             * DEMO MODE
             *
             * No backend authentication is connected yet.
             * Do not store credentials or redirect users to
             * protected dashboards at this stage.
             */

            const portalNames = {
                patient: "Patient",
                hospital: "Hospital",
                government: "Government"
            };

            showMessage(
                `${portalNames[role]} portal selected. ` +
                "Your form is valid, but sign-in is not available yet. " +
                "Backend authentication must be connected first.",
                "info"
            );

        });

    }

    // Forgot password placeholder
    if (forgotPasswordLink) {

        forgotPasswordLink.addEventListener("click", function (event) {

            event.preventDefault();

            showMessage(
                "Password recovery will be available after the " +
                "authentication backend is implemented.",
                "info"
            );

        });

    }

});
