// --- Estado ---
const state = {
  projectName: "",
  costs: [], // {name, type, value}
  benefits: [], // {name, type, value}
};

// --- Utils DOM ---
const $ = (sel) => document.querySelector(sel);
const show = (el) => (el.style.display = "block");
const hide = (el) => (el.style.display = "none");

let busy = false; // evita cruce de animaciones

function go(fromId, toId) {
  if (busy) return;
  busy = true;

  const from = document.getElementById(fromId);
  const to   = document.getElementById(toId);

  
  from.classList.add("leave");                  

  
  setTimeout(() => {
    
    from.classList.remove("leave");             
    from.classList.remove("enter");             
    from.style.display = "none";                 

    
    to.classList.remove("leave");               
    to.classList.remove("enter");               
    to.style.display = "block";                  

    
    void to.offsetWidth;                        

    
    to.classList.add("enter");                  

    
    setTimeout(() => {
      busy = false;
    }, ms("--dur") + 20);                       
  }, ms("--dur") + 20);                         
}

function ms(varName) {
  // lee --dur del :root
  const s = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (s.endsWith("ms")) return parseFloat(s);
  if (s.endsWith("s")) return parseFloat(s) * 1000;
  return 450;
}

// --- Render helpers ---
function renderList(listEl, items) {
  if (items.length === 0) {
    listEl.innerHTML = "<em>No items yet.</em>";
    return;
  }
  listEl.innerHTML = items
    .map(
      (x, i) =>
        `<div><strong>${i + 1}.</strong> ${escapeHtml(x.name)} — <code>${
          x.type
        }</code> — $${fmt(x.value)}</div>`
    )
    .join("");
}
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}
function fmt(x) {
  const n = Number(x);
  return isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : x;
}

// --- Validaciones simples ---
function requireText(id, errId, msg) {
  const v = $(id).value.trim();
  if (!v) {
    showError(errId, msg);
    return null;
  }
  hideError(errId);
  return v;
}
function requireNum(id, errId, msg, opts = { min: 0 }) {
  const v = parseFloat($(id).value);
  if (Number.isNaN(v) || (opts.min != null && v < opts.min)) {
    showError(errId, msg);
    return null;
  }
  hideError(errId);
  return v;
}
function showError(errId, msg) {
  const el = document.getElementById(errId);
  el.textContent = msg;
  el.style.display = "block";
}
function hideError(errId) {
  const el = document.getElementById(errId);
  el.style.display = "none";
}

// --- Finanzas: PV, FV, PMT y conversiones (manejan r=0) ---
function pvOfFV(F, r, n) {
  if (r === 0) return F;
  return F / Math.pow(1 + r, n);
}
function fvOfPV(P, r, n) {
  if (r === 0) return P;
  return P * Math.pow(1 + r, n);
}
function pvOfPMT(A, r, n) {
  if (r === 0) return A * n;
  return (A * (1 - Math.pow(1 + r, -n))) / r;
}
function fvOfPMT(A, r, n) {
  if (r === 0) return A * n;
  return (A * (Math.pow(1 + r, n) - 1)) / r;
}
function pmtFromPV(P, r, n) {
  if (n === 0) return 0;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}
function pmtFromFV(F, r, n) {
  if (n === 0) return 0;
  if (r === 0) return F / n;
  return (F * r) / (Math.pow(1 + r, n) - 1);
}

// Convierte un ítem (present/future/annual) al modo elegido
function convertItem(item, mode, r, n) {
  const v = Number(item.value);
  if (!isFinite(v)) return 0;

  if (mode === "present") {
    if (item.type === "present") return v;
    if (item.type === "future") return pvOfFV(v, r, n);
    if (item.type === "annual") return pvOfPMT(v, r, n);
  }
  if (mode === "future") {
    if (item.type === "present") return fvOfPV(v, r, n);
    if (item.type === "future") return v;
    if (item.type === "annual") return fvOfPMT(v, r, n);
  }
  if (mode === "annual") {
    if (item.type === "present") return pmtFromPV(v, r, n);
    if (item.type === "future") return pmtFromFV(v, r, n);
    if (item.type === "annual") return v;
  }
  return 0;
}

// --- Eventos y flujo ---
// Step 1
$("#btnHello").addEventListener("click", () => {
  const name = requireText(
    "#projectName",
    "errProject",
    "Please enter the project name."
  );
  if (!name) return;
  state.projectName = name;
  go("step-hello", "step-costs");
  $("#costName").focus();
});
$("#projectName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btnHello").click();
});


// Step 2: Costs
$("#btnAddCost").addEventListener("click", () => {
  const name = requireText("#costName", "errCost", "Enter a cost name.");
  if (name == null) return;

  const value = requireNum(
    "#costValue",
    "errCost",
    "Enter a valid non-negative amount."
  );
  if (value == null) return;

  const type = $("#costType").value; // present | future | annual

  state.costs.push({ name, type, value });

  // limpiar campos
  $("#costName").value = "";
  $("#costValue").value = "";
  $("#costName").focus();

  renderList($("#listCosts"), state.costs);

  // Mostrar "Add Benefits" solo si hay más de un costo
  if (state.costs.length > 1) show($("#btnGoBenefits"));
});
$("#costName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btnAddCost").click();
});
$("#costValue").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btnAddCost").click();
});

$("#btnGoBenefits").addEventListener("click", () => {
  go("step-costs", "step-benefits");
  $("#benefitName").focus();
});

// Step 3: Benefits
$("#btnAddBenefit").addEventListener("click", () => {
  const name = requireText(
    "#benefitName",
    "errBenefit",
    "Enter a benefit name."
  );
  if (name == null) return;

  const value = requireNum(
    "#benefitValue",
    "errBenefit",
    "Enter a valid non-negative amount."
  );
  if (value == null) return;

  const type = $("#benefitType").value; // present | future | annual

  state.benefits.push({ name, type, value });

  // limpiar
  $("#benefitName").value = "";
  $("#benefitValue").value = "";
  $("#benefitName").focus();

  renderList($("#listBenefits"), state.benefits);

  // Mostrar "Finish" si hay al menos un beneficio
  if (state.benefits.length > 0) show($("#btnFinish"));
});
$("#benefitName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btnAddBenefit").click();
});
$("#benefitValue").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btnAddBenefit").click();
});

$("#btnFinish").addEventListener("click", () => {
  go("step-benefits", "step-final");
  $("#rate").focus();
});

// Step 4: Calcular
$("#btnCalculate").addEventListener("click", () => {
  if (state.costs.length < 2) {
    showError("errFinal", "Please go back and add at least two costs.");
    return;
  }
  if (state.benefits.length < 1) {
    showError("errFinal", "Please go back and add at least one benefit.");
    return;
  }

  const mode = $("#calcMode").value; // present | future | annual
  const rPct = requireNum(
    "#rate",
    "errFinal",
    "Enter a valid interest rate (≥ 0).",
    { min: 0 }
  );
  if (rPct == null) return;
  const years = requireNum("#years", "errFinal", "Enter years n (≥ 1).", {
    min: 1,
  });
  if (years == null) return;

  hideError("errFinal");

  const r = rPct / 100;
  const n = Math.floor(years);

  // Convertir y sumar
  const costsConverted = state.costs.map((it) => convertItem(it, mode, r, n));
  const benefitsConverted = state.benefits.map((it) =>
    convertItem(it, mode, r, n)
  );

  const sumCosts = costsConverted.reduce((a, b) => a + b, 0);
  const sumBenefits = benefitsConverted.reduce((a, b) => a + b, 0);
  const ratio = sumCosts > 0 ? sumBenefits / sumCosts : Infinity;

  // Resumen
  $("#summary").innerHTML = `
        <div><strong>Project:</strong> ${escapeHtml(state.projectName)}</div>
        <div><strong>Mode:</strong> ${mode.toUpperCase()}</div>
        <div><strong>r:</strong> ${rPct}% &nbsp; | &nbsp; <strong>n:</strong> ${n} year(s)</div>
      `;

  $("#totals").innerHTML = `
        <div><strong>Total Costs (${mode}):</strong> $${fmt(sumCosts)}</div>
        <div><strong>Total Benefits (${mode}):</strong> $${fmt(
    sumBenefits
  )}</div>
        <div><strong>B/C Ratio:</strong> ${
          Number.isFinite(ratio) ? ratio.toFixed(3) : "∞"
        }
          &nbsp; — &nbsp; ${
            ratio > 1
              ? '<span class="ok">Profitable ✅</span>'
              : '<span class="bad">Not profitable ❌</span>'
          }
        </div>
      `;

  go("step-final", "step-results");
});


$("#btnEditTime").addEventListener("click", () => {
  go("step-results", "step-final");
  $("#rate").focus();
});

// Reiniciar
$("#btnRestart").addEventListener("click", () => {
  // limpiar estado y UI
  state.projectName = "";
  state.costs = [];
  state.benefits = [];
  $("#projectName").value = "";
  $("#costName").value = "";
  $("#costValue").value = "";
  $("#benefitName").value = "";
  $("#benefitValue").value = "";
  $("#rate").value = "";
  $("#years").value = "";
  $("#calcMode").value = "present";
  $("#costType").value = "present";
  $("#benefitType").value = "present";
  $("#listCosts").innerHTML = "<em>No items yet.</em>";
  $("#listBenefits").innerHTML = "<em>No items yet.</em>";
  hide($("#btnGoBenefits"));
  hide($("#btnFinish"));
  go("step-results", "step-hello");
  $("#projectName").focus();
});

// Iniciar listas vacías
renderList($("#listCosts"), []);
renderList($("#listBenefits"), []);
