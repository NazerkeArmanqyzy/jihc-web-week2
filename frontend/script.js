const api = "http://localhost:5001", $ = id => document.getElementById(id);
const registerModal = $("registerModal"), loginModal = $("loginModal");
const show = (message, text, color) => {
    message.textContent = text;
    message.style.color = color;
};
const openModal = (modal, messageId) => {
    $(messageId).textContent = "";
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
};
const closeModal = modal => {
    modal.style.display = "none";
    document.body.style.overflow = "";
};
async function request(path, options = {}) {
    const response = await fetch(api + path, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Request failed");
    return result;
}
const post = (path, data) => request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
});
const addCell = (row, value) => {
    const cell = document.createElement("td");
    cell.className = "u7";
    cell.textContent = value;
    row.append(cell);
};
async function renderUsers() {
    const table = $("usersTableBody");
    if (!table) return;
    try {
        const users = await request("/users");
        table.innerHTML = users.length ? "" : '<tr><td class="u7" colspan="3">No registered members yet</td></tr>';
        users.forEach((user, index) => {
            const row = document.createElement("tr");
            [index + 1, user.fullName || user.username, user.email || user.username]
                .forEach(value => addCell(row, value));
            table.append(row);
        });
    } catch {
        table.innerHTML = '<tr><td class="u7" colspan="3">Could not load users</td></tr>';
    }
}
document.querySelectorAll("[data-modal-open]").forEach(button => {
    button.onclick = () => {
        const type = button.dataset.modalOpen;
        openModal($(type + "Modal"), type === "register" ? "registrationMessage" : "loginMessage");
    };
});
$("closeRegisterModal").onclick = () => closeModal(registerModal);
$("closeLoginModal").onclick = () => closeModal(loginModal);
$("registrationForm").onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const message = $("registrationMessage");
    const email = $("registerEmail").value.trim().toLowerCase();
    const password = $("registerPassword").value;

    if (password !== $("confirmPassword").value) {
        show(message, "Passwords do not match.", "red");
        return;
    }

    try {
        await post("/register", {
            username: email,
            fullName: $("fullName").value.trim(),
            email,
            password
        });
        await renderUsers();
        form.reset();
        closeModal(registerModal);
    } catch (error) {
        show(message, error instanceof TypeError ? "Could not connect to the server." : error.message, "red");
    }
};
$("loginForm").onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const message = $("loginMessage");

    try {
        const result = await post("/login", {
            username: $("loginEmail").value.trim().toLowerCase(),
            password: $("loginPassword").value
        });
        show(message, result.message, "green");
        form.reset();
    } catch (error) {
        show(message, error instanceof TypeError ? "Could not connect to the server." : error.message, "red");
    }
};
renderUsers();
