(function () {
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = Array.from(document.querySelectorAll(".content-section"));

  function setActive(targetId) {
    for (const btn of navLinks) {
      const isActive = btn.getAttribute("data-target") === targetId;
      btn.classList.toggle("is-active", isActive);
    }
    for (const sec of sections) {
      sec.classList.toggle("is-active", sec.id === targetId);
    }
  }

  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      if (targetId) setActive(targetId);
    });
  });

  const demoMode = document.getElementById("demoMode");
  const category = document.getElementById("category");
  const btnSimular = document.getElementById("btnSimular");
  const btnReset = document.getElementById("btnReset");
  const toast = document.getElementById("toast");

  const lastRun = document.getElementById("lastRun");
  const currentCategory = document.getElementById("currentCategory");
  const statTasks = document.getElementById("statTasks");
  const statReports = document.getElementById("statReports");
  const statUsers = document.getElementById("statUsers");

  const inlineLastRun = document.getElementById("inlineLastRun");
  const inlineCategory = document.getElementById("inlineCategory");
  const adminPanel = document.getElementById("adminPanel");
  const collabPanel = document.getElementById("collabPanel");
  const adminRequestsList = document.getElementById("adminRequestsList");
  const btnEnviarSolicitud = document.getElementById("btnEnviarSolicitud");

  const sessionToggle = document.getElementById("sessionToggle");
  const sessionMenu = document.getElementById("sessionMenu");
  const sessionLabel = document.getElementById("sessionLabel");
  const sessionBadge = document.getElementById("sessionBadge");
  const sessionStatus = document.getElementById("sessionStatus");

  let currentUser = "anon";

  const users = {
    anon: {
      label: "Iniciar sesion",
      badge: "Visitante",
      status: "OK",
    },
    admin: {
      label: "Ana Moderadora (Admin)",
      badge: "Admin",
      status: "OK - moderando",
    },
    carlos: {
      label: "Carlos Taller",
      badge: "Colaborador",
      status: "OK - taller propio",
    },
    lucia: {
      label: "Lucia Centro Cultural",
      badge: "Colaborador",
      status: "OK - centro cultural",
    },
  };

  const collaboratorProfiles = {
    carlos: {
      nombre: "Carlos Taller",
      telefono: "11-4444-5555",
      correo: "carlos@correo.com",
      taller: "Taller Melodia Urbana",
      descripcion: "Clases iniciales e intermedias para adolescentes y adultos.",
      actividades: "Guitarra, canto y ensamble",
      rubro: "Musica",
      redes: "@melodiaurbana",
      ubicacion: "propia",
      direccion: "Av. Central 123",
      horarios: "Lun a Vie 18:00 a 21:00",
    },
    lucia: {
      nombre: "Lucia Centro Cultural",
      telefono: "11-6666-7777",
      correo: "lucia@correo.com",
      taller: "Taller Expresion Corporal",
      descripcion: "Espacio de movimiento y expresion para todas las edades.",
      actividades: "Danza, expresion corporal, elongacion",
      rubro: "Danza",
      redes: "@expresionencentro",
      ubicacion: "centro",
      direccion: "Sede Centro Cultural",
      horarios: "Mar y Jue 17:00 a 20:00",
    },
  };

  let requestSeq = 1;
  const pendingRequests = [];

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  function loadCollaboratorForm(userKey) {
    const p = collaboratorProfiles[userKey];
    if (!p) return;
    setValue("fNombre", p.nombre);
    setValue("fTelefono", p.telefono);
    setValue("fCorreo", p.correo);
    setValue("fTaller", p.taller);
    setValue("fDescripcion", p.descripcion);
    setValue("fActividades", p.actividades);
    setValue("fRubro", p.rubro);
    setValue("fRedes", p.redes);
    setValue("fUbicacion", p.ubicacion);
    setValue("fDireccion", p.direccion);
    setValue("fHorarios", p.horarios);
  }

  function applyUser() {
    const u = users[currentUser] || users.anon;
    if (sessionLabel) sessionLabel.textContent = u.label;
    if (sessionBadge) sessionBadge.textContent = u.badge;
    if (sessionStatus) sessionStatus.textContent = u.status;
    const isAdmin = currentUser === "admin";
    const isCollaborator = currentUser === "carlos" || currentUser === "lucia";
    if (adminPanel) adminPanel.classList.toggle("is-hidden", !isAdmin);
    if (collabPanel) collabPanel.classList.toggle("is-hidden", !isCollaborator);
    if (isCollaborator) loadCollaboratorForm(currentUser);
    renderPendingRequests();
  }

  function renderPendingRequests() {
    if (!adminRequestsList) return;
    if (pendingRequests.length === 0) {
      adminRequestsList.innerHTML =
        '<div class="row"><div class="cell">No hay solicitudes pendientes.</div></div>';
      return;
    }
    const header =
      '<div class="row head"><div class="cell">Colaborador</div><div class="cell">Taller</div><div class="cell">Acciones</div></div>';
    const rows = pendingRequests
      .map(
        (r) =>
          `<div class="row">
            <div class="cell"><strong>${r.colaborador}</strong><br/><small>${r.rubro}</small></div>
            <div class="cell">${r.taller}</div>
            <div class="cell actions">
              <button class="btn btn-primary btn-approve" data-id="${r.id}" type="button">Aceptar</button>
              <button class="btn btn-reject" data-id="${r.id}" type="button">Rechazar</button>
            </div>
          </div>`
      )
      .join("");
    adminRequestsList.innerHTML = header + rows;
  }

  function nowStr() {
    const d = new Date();
    return d.toLocaleString();
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function simulate() {
    const mode = demoMode ? demoMode.value : "basic";
    const cat = category ? category.value : "tareas";

    const base = {
      basic: { tareas: 8, reportes: 3, usuarios: 12 },
      pro: { tareas: 13, reportes: 6, usuarios: 21 },
    };

    const idx = base[mode] || base.basic;
    const tasks = idx.tareas;
    const reports = idx.reportes;
    const users = idx.usuarios;

    const mult =
      cat === "tareas" ? 1.05 : cat === "reportes" ? 1.1 : 0.98;

    statTasks.textContent = clamp(Math.round(tasks * mult), 0, 99);
    statReports.textContent = clamp(Math.round(reports * (mult * 0.95)), 0, 99);
    statUsers.textContent = clamp(Math.round(users * (mult * 0.9)), 0, 99);

    const categoryLabel =
      cat === "tareas" ? "Tareas" : cat === "reportes" ? "Reportes" : "Usuarios";

    if (lastRun) lastRun.textContent = nowStr();
    if (currentCategory) currentCategory.textContent = categoryLabel;
    if (inlineLastRun) inlineLastRun.textContent = nowStr();
    if (inlineCategory) inlineCategory.textContent = categoryLabel;

    if (toast) {
      toast.textContent = `Interfaz actualizada: modo=${mode}, categoria=${categoryLabel}.`;
      toast.classList.add("is-visible");
      window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
    }
  }

  function reset() {
    if (toast) toast.classList.remove("is-visible");
    if (lastRun) lastRun.textContent = "—";
    if (currentCategory) currentCategory.textContent = "Tareas";
    if (inlineLastRun) inlineLastRun.textContent = "—";
    if (inlineCategory) inlineCategory.textContent = "Tareas";
    if (statTasks) statTasks.textContent = "8";
    if (statReports) statReports.textContent = "3";
    if (statUsers) statUsers.textContent = "12";

    if (category) category.value = "tareas";
    if (demoMode) demoMode.value = "basic";
    setActive("seccion-inicio");
    currentUser = "anon";
    applyUser();
  }

  if (btnSimular) btnSimular.addEventListener("click", simulate);
  if (btnReset) btnReset.addEventListener("click", reset);
  if (btnEnviarSolicitud) {
    btnEnviarSolicitud.addEventListener("click", () => {
      const profile = collaboratorProfiles[currentUser] || {};
      const colaborador = getValue("fNombre") || profile.nombre || "Colaborador";
      const taller = getValue("fTaller") || profile.taller || "Taller sin nombre";
      const rubro = getValue("fRubro") || profile.rubro || "General";
      pendingRequests.push({
        id: requestSeq++,
        colaborador,
        taller,
        rubro,
        estado: "Pendiente",
      });
      renderPendingRequests();
      if (toast) {
        toast.textContent = `Solicitud enviada por ${colaborador}. Queda pendiente de aprobacion del administrador.`;
        toast.classList.add("is-visible");
        window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
      }
    });
  }

  if (adminRequestsList) {
    adminRequestsList.addEventListener("click", (ev) => {
      const approveBtn = ev.target.closest(".btn-approve");
      const rejectBtn = ev.target.closest(".btn-reject");
      if (!approveBtn && !rejectBtn) return;
      const id = Number((approveBtn || rejectBtn).getAttribute("data-id"));
      const idx = pendingRequests.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const req = pendingRequests[idx];
      pendingRequests.splice(idx, 1);
      renderPendingRequests();
      if (toast) {
        if (approveBtn) {
          toast.textContent = `Solicitud de ${req.colaborador} aprobada.`;
        } else {
          toast.textContent = `Solicitud de ${req.colaborador} rechazada.`;
        }
        toast.classList.add("is-visible");
        window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
      }
    });
  }
  if (sessionToggle && sessionMenu) {
    sessionToggle.addEventListener("click", () => {
      sessionMenu.classList.toggle("is-open");
    });
    sessionMenu.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".session-option");
      if (!btn) return;
      const user = btn.getAttribute("data-user");
      if (!user) return;
      currentUser = user;
      applyUser();
      sessionMenu.classList.remove("is-open");
    });
    document.addEventListener("click", (ev) => {
      if (!sessionMenu.contains(ev.target) && ev.target !== sessionToggle) {
        sessionMenu.classList.remove("is-open");
      }
    });
  }

  applyUser();
  reset();
})();

