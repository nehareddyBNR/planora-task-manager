// ==========================================================
// Planora frontend — plain JS, talks to the live backend API
// ==========================================================

const API_BASE = "https://planora-task-manager-kpla.onrender.com";

const state = {
  token: localStorage.getItem("planora_token") || null,
  user: JSON.parse(localStorage.getItem("planora_user") || "null"),
  filter: "",
};

// ---------- element refs ----------
const authScreen = document.getElementById("auth-screen");
const dashboardScreen = document.getElementById("dashboard-screen");

const authTabs = document.querySelectorAll(".auth-tab");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");

const userNameEl = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");

const taskListEl = document.getElementById("task-list");
const emptyStateEl = document.getElementById("empty-state");
const taskCountEl = document.getElementById("task-count");
const filterTabs = document.querySelectorAll(".filter-tab");

const newTaskBtn = document.getElementById("new-task-btn");
const emptyNewTaskBtn = document.getElementById("empty-new-task-btn");
const taskModal = document.getElementById("task-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelTaskBtn = document.getElementById("cancel-task-btn");
const taskForm = document.getElementById("task-form");
const taskError = document.getElementById("task-error");

const toastEl = document.getElementById("toast");

// ---------- helpers ----------
function showToast(message, type = "") {
  toastEl.textContent = message;
  toastEl.className = "toast" + (type ? " " + type : "");
  toastEl.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.add("hidden"), 3000);
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      "Could not reach the server. It may be waking up (Render free tier can take ~1 minute) — try again shortly."
    );
  }

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    /* empty body */
  }

  if (res.status === 401 && auth) {
    logout();
    throw new Error("Your session expired — please log in again.");
  }

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("planora_token", token);
  localStorage.setItem("planora_user", JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("planora_token");
  localStorage.removeItem("planora_user");
}

function showAuthScreen() {
  authScreen.classList.remove("hidden");
  dashboardScreen.classList.add("hidden");
}

function showDashboard() {
  authScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  userNameEl.textContent = state.user?.name ? `Hi, ${state.user.name}` : "";
  loadTasks();
}

function logout() {
  clearSession();
  showAuthScreen();
}

// ---------- auth tabs ----------
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    loginForm.classList.toggle("hidden", target !== "login");
    signupForm.classList.toggle("hidden", target !== "signup");
    loginError.textContent = "";
    signupError.textContent = "";
  });
});

// ---------- login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    setSession(data.token, data.user);
    showToast(`Welcome back, ${data.user.name}!`, "success");
    showDashboard();
    loginForm.reset();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

// ---------- signup ----------
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.textContent = "";
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  try {
    await api("/api/auth/signup", {
      method: "POST",
      auth: false,
      body: { name, email, password },
    });
    showToast("Account created — log in to continue", "success");
    signupForm.reset();
    document.querySelector('.auth-tab[data-tab="login"]').click();
    document.getElementById("login-email").value = email;
  } catch (err) {
    signupError.textContent = err.message;
  }
});

// ---------- logout ----------
logoutBtn.addEventListener("click", logout);

// ---------- filters ----------
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.filter = tab.dataset.status;
    loadTasks();
  });
});

// ---------- task loading / rendering ----------
async function loadTasks() {
  try {
    const query = state.filter ? `?status=${state.filter}` : "";
    const tasks = await api(`/api/tasks${query}`);
    // "All" should mean "everything still active" — once a task is
    // completed it only shows up under the "Completed" tab.
    const visibleTasks =
      state.filter === "" ? tasks.filter((t) => t.status !== "completed") : tasks;
    renderTasks(visibleTasks);
  } catch (err) {
    showToast(err.message, "error");
  }
}
function formatDeadline(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = date < today;
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { label, isOverdue };
}

function renderTasks(tasks) {
  taskCountEl.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

  if (tasks.length === 0) {
    taskListEl.innerHTML = "";
    emptyStateEl.classList.remove("hidden");
    return;
  }
  emptyStateEl.classList.add("hidden");

  taskListEl.innerHTML = tasks
    .map((task) => {
      const isCompleted = task.status === "completed";
      const deadline = formatDeadline(task.deadline);

      const badges = [];
      if (task.priority) {
        badges.push(
          `<span class="badge badge-priority-${task.priority}">${task.priority}</span>`
        );
      }
      if (task.difficulty) {
        badges.push(`<span class="badge badge-difficulty">${task.difficulty}</span>`);
      }
      if (deadline) {
        badges.push(
          `<span class="badge badge-deadline${!isCompleted && deadline.isOverdue ? " overdue" : ""}">${
            !isCompleted && deadline.isOverdue ? "Overdue " : "Due "
          }${deadline.label}</span>`
        );
      }

            return `
        <div class="task-card${isCompleted ? " completed" : ""}" data-id="${task._id}" data-priority="${task.priority || ""}">
          <button class="task-check" data-action="complete" data-id="${task._id}" aria-label="Mark complete" ${
        isCompleted ? "disabled" : ""
      }>${isCompleted ? "✓" : ""}</button> 
          <div class="task-main">
            <p class="task-title">${escapeHtml(task.title)}</p>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
            <div class="task-meta">${badges.join("")}</div>
          </div>
          <div class="task-actions">
            <button class="btn-danger-text" data-action="delete" data-id="${task._id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// event delegation for complete/delete buttons
taskListEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "complete") {
    try {
      await api(`/api/tasks/${id}/complete`, { method: "PUT" });
      loadTasks();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (btn.dataset.action === "delete") {
    if (!confirm("Delete this task?")) return;
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      showToast("Task deleted", "success");
      loadTasks();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
});

// ---------- new task modal ----------
function openModal() {
  taskModal.classList.remove("hidden");
  taskError.textContent = "";
  document.getElementById("task-title").focus();
}

function closeModal() {
  taskModal.classList.add("hidden");
  taskForm.reset();
}

newTaskBtn.addEventListener("click", openModal);
emptyNewTaskBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelTaskBtn.addEventListener("click", closeModal);
taskModal.addEventListener("click", (e) => {
  if (e.target === taskModal) closeModal();
});

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  taskError.textContent = "";

  const title = document.getElementById("task-title").value.trim();
  const description = document.getElementById("task-description").value.trim();
  const deadline = document.getElementById("task-deadline").value;
  const difficulty = document.getElementById("task-difficulty").value;
  const priority = document.getElementById("task-priority").value;

  try {
    await api("/api/tasks", {
      method: "POST",
      body: { title, description, deadline: deadline || undefined, difficulty, priority },
    });
    showToast("Task created", "success");
    closeModal();
    loadTasks();
  } catch (err) {
    taskError.textContent = err.message;
  }
});

// ---------- boot ----------
if (state.token && state.user) {
  showDashboard();
} else {
  showAuthScreen();
}