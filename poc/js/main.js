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

  const WS = window.WORKSHOP_CATALOG || [];

  function thumbFileForRubro(rubro) {
    if (rubro === "Musica") return "taller guitarra.jpeg";
    if (rubro === "Danza") return "Centro de danza.jpg";
    return "Taller ceramica.jpeg";
  }

  const ZONA_CENTRO = {
    Malvinas: { lat: -34.535, lng: -58.708 },
    "Los Polvorines": { lat: -34.528, lng: -58.704 },
    "Grand Bourg": { lat: -34.486, lng: -58.725 },
    "Pablo Podesta": { lat: -34.5798, lng: -58.6097 },
    "Jose C. Paz": { lat: -34.516, lng: -58.768 },
    "San Miguel": { lat: -34.543, lng: -58.712 },
    "Del Viso": { lat: -34.451, lng: -58.802 },
    Tortuguitas: { lat: -34.494, lng: -58.763 },
  };
  const ZONA_DEFAULT = { lat: -34.52, lng: -58.72 };
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const porZona = {};
  /** ~metros visibles por paso del espiral (lat ~111m por 0.001°); separa talleres dentro de la misma zona. */
  const radioPorZona = 0.00205;
  const estirarLng = 1.38;
  WS.forEach((w) => {
    const base = ZONA_CENTRO[w.zona] || ZONA_DEFAULT;
    const k = porZona[w.zona] = (porZona[w.zona] || 0) + 1;
    const j = k - 1;
    const r = radioPorZona * Math.sqrt(j + 1);
    const t = j * goldenAngle;
    w.lat = base.lat + r * Math.cos(t);
    w.lng = base.lng + r * Math.sin(t) * estirarLng;
  });

  let workshopSearchQuery = "";

  const RUBRO_BUSQUEDA = {
    Musica:
      "musica musical instrumentos canto guitarra electrica acustica violin ukelele ukulele bateria percusion ensamble banda sonido",
    Danza: "danza baile movimiento coreografia salsa bachata tango zumba folclore",
    Arte: "arte pintura dibujo ceramica oleo plastico color creatividad",
    Fotografia: "fotografia foto camara imagen retrato calle digital",
    Teatro: "teatro actuacion escena dramaturgia obra voz",
    Tecnologia: "tecnologia informatica computadora internet web programacion digital",
    Bienestar: "bienestar yoga relajacion risoterapia mindfulness salud emocional",
    Gastronomia: "gastronomia comida cocina panaderia horno restaurante recetas alimentos desayuno",
    Inclusion: "inclusion lsa senas sordos accesibilidad comunicacion",
    Literatura: "literatura lectura cuento poesia libro escritura",
    Ecologia: "ecologia jardin huerta plantas compost medio ambiente",
    Manualidades: "manualidades bordado origami papel textil hilo",
    Educacion: "educacion escuela apoyo estudio matematica secundaria",
    Diseno: "diseno serigrafia estampado grafico remera",
    Juegos: "juegos ajedrez estrategia torneo",
    Ciencia: "ciencia quimica experimento laboratorio",
    Deporte: "deporte karate artes marciales gimnasio",
    Salud: "salud nutricion cocina saludable primeros auxilios rcp emergencia medicina comunitaria",
    Historia: "historia memoria archivo barrio patrimonio",
    Artesania: "artesania cuero marroquineria craft",
    Textil: "textil costura confeccion modista ropa",
    Oficios: "oficios electricidad casa taller trabajo",
  };

  const STOP_TOKENS = new Set([
    "de",
    "la",
    "el",
    "en",
    "y",
    "a",
    "al",
    "del",
    "los",
    "las",
    "lo",
    "un",
    "una",
    "con",
    "por",
    "se",
    "es",
    "que",
    "para",
  ]);

  function normalizeForSearch(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9ñ\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildSearchBlob(w) {
    const rubroExtra = RUBRO_BUSQUEDA[w.rubro] || "";
    const ubiLabel = w.ubicacion === "centro" ? "centro cultural sede municipal" : "taller propio";
    return normalizeForSearch(
      [
        w.nombre,
        w.rubro,
        w.zona,
        w.descripcion,
        w.actividades,
        w.colaboradorNombre,
        w.direccion,
        w.horarios,
        w.redes,
        w.telefono,
        w.correo,
        w.palabrasClave,
        rubroExtra,
        ubiLabel,
      ].join(" ")
    );
  }

  function workshopMatchesQuery(w, rawQ) {
    const q = rawQ.trim();
    if (!q) return true;
    const hay = buildSearchBlob(w);
    const tokens = normalizeForSearch(q)
      .split(/\s+/)
      .filter((t) => t.length > 0 && !STOP_TOKENS.has(t));
    if (tokens.length === 0) return true;
    return tokens.every((tok) => hay.indexOf(tok) >= 0);
  }

  function getFilteredWorkshopIndices() {
    const q = workshopSearchQuery.trim();
    if (!q) return WS.map((_, i) => i);
    return WS.map((w, i) => (workshopMatchesQuery(w, q) ? i : null)).filter((x) => x != null);
  }

  function truncateText(str, n) {
    const s = String(str || "").trim();
    if (s.length <= n) return s;
    return s.slice(0, Math.max(0, n - 1)) + "\u2026";
  }

  const workshopEstadoInicial = WS.map((w) => w.estado);

  let currentUser = "anon";
  let requestSeq = 1;
  const pendingRequests = [];
  /** Data URL JPEG reducido para demo (solicitud nueva desde el formulario). */
  let workshopRegisterImageData = null;

  function resetCatalogEstados() {
    WS.forEach((w, i) => {
      w.estado = workshopEstadoInicial[i];
    });
  }

  function seedCatalogPendingRequests() {
    pendingRequests.length = 0;
    requestSeq = 1;
    WS.forEach((w, idx) => {
      if (w.estado !== "Pendiente") return;
      pendingRequests.push({
        id: requestSeq++,
        colaborador: w.colaboradorNombre || "Alta de taller en portal",
        taller: w.nombre,
        rubro: w.rubro,
        zona: w.zona,
        catalogIndex: idx,
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clearWorkshopRegisterImageField() {
    workshopRegisterImageData = null;
    const inp = document.getElementById("fImagenTaller");
    const img = document.getElementById("fImagenTallerPreview");
    const wrap = document.getElementById("fImagenTallerPreviewWrap");
    const ph = document.getElementById("fImagenTallerPreviewPlaceholder");
    const btnClear = document.getElementById("btnFImagenTallerClear");
    if (inp) inp.value = "";
    if (img) {
      img.hidden = true;
      img.removeAttribute("src");
    }
    if (wrap) wrap.setAttribute("data-empty", "1");
    if (ph) ph.hidden = false;
    if (btnClear) btnClear.hidden = true;
  }

  function workshopImageFileToDataUrl(file, maxSide, quality, done) {
    if (!file || !/^image\//.test(file.type)) {
      done(null);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      done(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        done(null);
        return;
      }
      const im = new Image();
      im.onload = () => {
        let w = im.width;
        let h = im.height;
        const m = Math.max(w, h);
        const cap = maxSide || 420;
        if (m > cap) {
          const s = cap / m;
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) {
          done(dataUrl);
          return;
        }
        ctx.drawImage(im, 0, 0, w, h);
        try {
          done(c.toDataURL("image/jpeg", quality || 0.82));
        } catch (e) {
          done(dataUrl);
        }
      };
      im.onerror = function () {
        done(null);
      };
      im.src = dataUrl;
    };
    reader.onerror = function () {
      done(null);
    };
    reader.readAsDataURL(file);
  }

  function bindWorkshopRegisterImage() {
    const inp = document.getElementById("fImagenTaller");
    const btnClear = document.getElementById("btnFImagenTallerClear");
    if (!inp || inp.dataset.bound === "1") return;
    inp.dataset.bound = "1";
    inp.addEventListener("change", function () {
      const f = inp.files && inp.files[0];
      if (!f) return;
      workshopImageFileToDataUrl(f, 420, 0.82, function (dataUrl) {
        if (!dataUrl) {
          if (toast) {
            toast.textContent =
              "No se pudo usar la imagen (formato no admitido o archivo demasiado grande).";
            toast.classList.add("is-visible");
            window.setTimeout(function () {
              toast.classList.remove("is-visible");
            }, 2600);
          }
          inp.value = "";
          return;
        }
        workshopRegisterImageData = dataUrl;
        const img = document.getElementById("fImagenTallerPreview");
        const wrap = document.getElementById("fImagenTallerPreviewWrap");
        const ph = document.getElementById("fImagenTallerPreviewPlaceholder");
        if (img) {
          img.src = dataUrl;
          img.hidden = false;
        }
        if (wrap) wrap.removeAttribute("data-empty");
        if (ph) ph.hidden = true;
        if (btnClear) btnClear.hidden = false;
      });
    });
    if (btnClear) {
      btnClear.addEventListener("click", function () {
        clearWorkshopRegisterImageField();
      });
    }
  }

  function tallerTooltipHtml(t, variant) {
    const v = variant === "popup" ? "popup" : "tooltip";
    const src = encodeURI("../../" + t.imagen);
    const actMax = v === "popup" ? 200 : 90;
    const zonaBlock =
      t.zona != null && t.zona !== ""
        ? '<div class="map-tooltip-zona">' + escapeHtml(t.zona) + "</div>"
        : "";
    const estadoBlock =
      currentUser === "admin" && t.estado
        ? '<div class="map-tooltip-estado">' + escapeHtml(t.estado) + "</div>"
        : "";
    const actBlock =
      t.actividades != null && String(t.actividades).trim() !== ""
        ? '<div class="map-tooltip-act">' +
          escapeHtml(truncateText(t.actividades, actMax)) +
          "</div>"
        : "";
    return (
      '<div class="map-tooltip-body map-tooltip-body--' +
      v +
      '">' +
      '<div class="map-tooltip-media">' +
      '<img src="' +
      src +
      '" alt="" class="map-tooltip-img" loading="lazy" />' +
      "</div>" +
      '<div class="map-tooltip-main">' +
      '<div class="map-tooltip-title">' +
      escapeHtml(t.nombre) +
      "</div>" +
      '<div class="map-tooltip-rubro">' +
      escapeHtml(t.rubro) +
      "</div>" +
      zonaBlock +
      actBlock +
      estadoBlock +
      "</div></div>"
    );
  }

  function workshopPinIcon(t, selected) {
    const src = encodeURI("../../" + t.imagen);
    const pinClass = selected ? "map-pin map-pin--selected" : "map-pin";
    const dim = selected ? 78 : 58;
    const anchor = Math.round(dim / 2);
    return L.divIcon({
      html:
        '<div class="' +
        pinClass +
        '"><img src="' +
        src +
        '" alt="" loading="lazy" draggable="false" /></div>',
      className: "map-pin-wrapper",
      iconSize: [dim, dim],
      iconAnchor: [anchor, dim],
      popupAnchor: [0, -(dim - 8)],
    });
  }

  let workshopMarkers = [];
  let selectedWorkshopIndex = null;

  function applyWorkshopMarkerIcons() {
    workshopMarkers.forEach((marker, i) => {
      if (!marker) return;
      const on = selectedWorkshopIndex === i;
      marker.setIcon(workshopPinIcon(WS[i], on));
      marker.setZIndexOffset(on ? 900 : 0);
    });
  }

  function clearWorkshopSelection() {
    selectedWorkshopIndex = null;
    const ul = document.getElementById("workshopListRoot");
    if (ul) {
      ul.querySelectorAll(".workshop-item.is-selected").forEach((el) => {
        el.classList.remove("is-selected");
      });
    }
    applyWorkshopMarkerIcons();
  }

  function selectWorkshop(idx, opts) {
    opts = opts || {};
    if (idx < 0 || idx >= WS.length) return;
    selectedWorkshopIndex = idx;

    const ul = document.getElementById("workshopListRoot");
    if (ul) {
      ul.querySelectorAll(".workshop-item.is-selected").forEach((el) => {
        el.classList.remove("is-selected");
      });
      const li = ul.querySelector('[data-workshop-index="' + idx + '"]');
      if (li) {
        li.classList.add("is-selected");
        if (opts.scrollList) {
          li.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }

    applyWorkshopMarkerIcons();

    if (opts.centerMap && mapTalleresInstance) {
      const t = WS[idx];
      mapTalleresInstance.invalidateSize();
      mapTalleresInstance.setView(L.latLng(t.lat, t.lng), 15, {
        animate: true,
      });
    }
    if (opts.openPopup && workshopMarkers[idx]) {
      workshopMarkers[idx].openPopup();
    }
  }

  function renderWorkshopList() {
    const ul = document.getElementById("workshopListRoot");
    const countEl = document.getElementById("workshopCount");
    if (!ul) return;
    const indices = getFilteredWorkshopIndices();
    const q = workshopSearchQuery.trim();
    if (countEl) {
      countEl.textContent = q
        ? indices.length + " de " + WS.length + " resultados"
        : WS.length + " resultados";
    }
    if (selectedWorkshopIndex != null && !indices.includes(selectedWorkshopIndex)) {
      clearWorkshopSelection();
    }
    const showEstado = currentUser === "admin";
    ul.innerHTML = indices
      .map((i) => {
        const w = WS[i];
        const src = encodeURI("../../" + w.imagen);
        const tagClass = w.estado === "Pendiente" ? "tag-warn" : "tag-ok";
        const estadoLabel = w.estado === "Pendiente" ? "Pendiente" : "Aprobado";
        const estadoTag = showEstado
          ? '<span class="tag ' + tagClass + '">' + estadoLabel + "</span>"
          : "";
        const sub =
          truncateText(w.descripcion, 110) || truncateText(w.actividades, 110);
        const subHtml = sub
          ? '<div class="workshop-item__subtitle">' + escapeHtml(sub) + "</div>"
          : "";
        return (
          "<li class=\"workshop-item\" data-workshop-index=\"" +
          i +
          "\" role=\"button\" tabindex=\"0\">" +
          '<div class="workshop-item__visual" aria-hidden="true">' +
          '<img class="workshop-item__thumb" src="' +
          src +
          '" alt="" loading="lazy" decoding="async"/>' +
          "</div>" +
          "<div class=\"workshop-item__body\">" +
          "<div class=\"workshop-item__title\">" +
          escapeHtml(w.nombre) +
          "</div>" +
          subHtml +
          "<div class=\"workshop-item__meta\">" +
          '<span class="tag tag-rubro">' +
          escapeHtml(w.rubro) +
          "</span>" +
          '<span class="tag tag-zona">' +
          escapeHtml(w.zona) +
          "</span>" +
          estadoTag +
          "</div></div></li>"
        );
      })
      .join("");

    if (selectedWorkshopIndex != null && selectedWorkshopIndex < WS.length) {
      const li = ul.querySelector('[data-workshop-index="' + selectedWorkshopIndex + '"]');
      if (li) li.classList.add("is-selected");
    }
    updateWorkshopMapFilter();
  }

  function bindWorkshopListInteraction() {
    const ul = document.getElementById("workshopListRoot");
    if (!ul || ul.dataset.workshopBound === "1") return;
    ul.dataset.workshopBound = "1";

    function activateFromList(idx) {
      selectWorkshop(idx, {
        scrollList: false,
        centerMap: true,
        openPopup: true,
      });
    }

    ul.addEventListener("click", (ev) => {
      const li = ev.target.closest(".workshop-item");
      if (!li || !ul.contains(li)) return;
      const idx = Number(li.getAttribute("data-workshop-index"));
      if (Number.isNaN(idx)) return;
      activateFromList(idx);
    });

    ul.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const li = ev.target.closest(".workshop-item");
      if (!li || !ul.contains(li)) return;
      ev.preventDefault();
      const idx = Number(li.getAttribute("data-workshop-index"));
      if (Number.isNaN(idx)) return;
      activateFromList(idx);
    });
  }

  function bindWorkshopSearch() {
    const input = document.getElementById("workshopSearch");
    if (!input || input.dataset.searchBound === "1") return;
    input.dataset.searchBound = "1";
    let t = null;
    input.addEventListener("input", () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        workshopSearchQuery = input.value;
        renderWorkshopList();
      }, 120);
    });
  }

  let mapTalleresInstance = null;

  function updateWorkshopMapFilter() {
    if (!workshopMarkers.length) return;
    const q = workshopSearchQuery.trim();
    const set = new Set(getFilteredWorkshopIndices());
    workshopMarkers.forEach((marker, i) => {
      if (!marker) return;
      if (!q) {
        marker.setOpacity(1);
        return;
      }
      marker.setOpacity(set.has(i) ? 1 : 0.2);
    });
    refitMapTalleres();
  }

  function refitMapTalleres() {
    if (!mapTalleresInstance || !WS.length) return;
    const q = workshopSearchQuery.trim();
    const ix = getFilteredWorkshopIndices();
    let useIx;
    if (!q) {
      useIx = WS.map((_, i) => i);
    } else if (ix.length === 0) {
      return;
    } else {
      useIx = ix;
    }
    const pts = useIx.map((i) => [WS[i].lat, WS[i].lng]);
    mapTalleresInstance.fitBounds(pts, { padding: [48, 48], maxZoom: 15 });
  }

  function initMapTalleres() {
    const el = document.getElementById("mapTalleres");
    if (!el || typeof L === "undefined") return;

    if (!mapTalleresInstance) {
      mapTalleresInstance = L.map("mapTalleres", { scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapTalleresInstance);

      workshopMarkers = [];
      WS.forEach((t, i) => {
        const marker = L.marker([t.lat, t.lng], {
          icon: workshopPinIcon(t, false),
        }).addTo(mapTalleresInstance);
        workshopMarkers[i] = marker;
        marker.bindPopup(
          function () {
            return tallerTooltipHtml(WS[i], "popup");
          },
          {
            maxWidth: 340,
            minWidth: 280,
            className: "map-workshop-popup",
            autoPan: false,
            keepInView: false,
          }
        );
        marker.bindTooltip(
          function () {
            return tallerTooltipHtml(WS[i], "tooltip");
          },
          {
            direction: "top",
            offset: [0, -14],
            opacity: 1,
            sticky: true,
            className: "map-workshop-tooltip map-workshop-tooltip--card",
          }
        );
        marker.on("click", () => {
          selectWorkshop(i, {
            scrollList: true,
            centerMap: false,
            openPopup: true,
          });
        });
      });
      applyWorkshopMarkerIcons();
      updateWorkshopMapFilter();
      window.requestAnimationFrame(() => {
        mapTalleresInstance.invalidateSize();
        refitMapTalleres();
        window.requestAnimationFrame(() => {
          mapTalleresInstance.invalidateSize();
          refitMapTalleres();
        });
      });
    } else {
      mapTalleresInstance.invalidateSize();
      updateWorkshopMapFilter();
    }
  }

  const nav = document.querySelector("nav.nav");
  if (nav) {
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("button.nav-link");
      if (!btn || !nav.contains(btn)) return;
      const targetId = btn.getAttribute("data-target");
      if (targetId) setActive(targetId);
      if (targetId === "seccion-mapa") {
        window.setTimeout(initMapTalleres, 120);
      }
    });
  }

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
  const themeToggle = document.getElementById("themeToggle");

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

  function applyTheme(mode) {
    const light = mode === "light";
    document.body.classList.toggle("light-mode", light);
    if (themeToggle) themeToggle.checked = light;
    window.setTimeout(() => {
      if (mapTalleresInstance) {
        mapTalleresInstance.invalidateSize();
        refitMapTalleres();
      }
    }, 80);
  }

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
    clearWorkshopRegisterImageField();
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
    renderWorkshopList();
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
      '<div class="row head"><div class="cell">Origen / rubro</div><div class="cell">Taller</div><div class="cell">Acciones</div></div>';
    const rows = pendingRequests
      .map((r) => {
        const zonaBit =
          r.zona != null && r.zona !== ""
            ? " · " + escapeHtml(r.zona)
            : "";
        const thumbBlock = r.imagenData
          ? '<div class="request-thumb-wrap"><img class="request-thumb" src="' +
            r.imagenData +
            '" alt="" /></div>'
          : '<div class="request-thumb-wrap request-thumb-wrap--empty">Sin foto</div>';
        return (
          '<div class="row">' +
          '<div class="cell">' +
          '<div class="request-cell-inner">' +
          thumbBlock +
          '<div class="request-cell-main"><strong>' +
          escapeHtml(r.colaborador) +
          "</strong><br/><small>" +
          escapeHtml(r.rubro) +
          zonaBit +
          "</small></div></div></div>" +
          '<div class="cell">' +
          escapeHtml(r.taller) +
          "</div>" +
          '<div class="cell actions">' +
          '<button class="btn btn-primary btn-approve" data-id="' +
          r.id +
          '" type="button">Aceptar</button>' +
          '<button class="btn btn-reject" data-id="' +
          r.id +
          '" type="button">Rechazar</button>' +
          "</div></div>"
        );
      })
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
    clearWorkshopSelection();
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
    setActive("seccion-mapa");
    window.setTimeout(initMapTalleres, 200);
    workshopSearchQuery = "";
    const wsInput = document.getElementById("workshopSearch");
    if (wsInput) wsInput.value = "";
    clearWorkshopRegisterImageField();
    resetCatalogEstados();
    seedCatalogPendingRequests();
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
        zona: "",
        catalogIndex: null,
        imagenData: workshopRegisterImageData,
      });
      clearWorkshopRegisterImageField();
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
      if (
        approveBtn &&
        typeof req.catalogIndex === "number" &&
        req.catalogIndex >= 0 &&
        req.catalogIndex < WS.length
      ) {
        WS[req.catalogIndex].estado = "Aprobado";
      }
      pendingRequests.splice(idx, 1);
      renderPendingRequests();
      renderWorkshopList();
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
      const insideMenu = sessionMenu.contains(ev.target);
      const insideToggle = sessionToggle.contains(ev.target);
      if (!insideMenu && !insideToggle) {
        sessionMenu.classList.remove("is-open");
      }
    });
  }

  if (themeToggle) {
    const savedTheme = window.localStorage.getItem("portal_theme") || "dark";
    applyTheme(savedTheme);
    themeToggle.addEventListener("change", () => {
      const nextTheme = themeToggle.checked ? "light" : "dark";
      window.localStorage.setItem("portal_theme", nextTheme);
      applyTheme(nextTheme);
    });
  } else {
    applyTheme("dark");
  }

  bindWorkshopListInteraction();
  bindWorkshopSearch();
  bindWorkshopRegisterImage();
  reset();
})();

