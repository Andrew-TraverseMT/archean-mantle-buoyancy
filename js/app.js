(function () {
  "use strict";

  const M = window.MantleBuoyancy;
  const $ = (id) => document.getElementById(id);

  const els = {
    eraModern: $("era-modern"),
    eraArchean: $("era-archean"),
    tp: $("tp"),
    tpOut: $("tp-out"),
    depth: $("depth"),
    depthOut: $("depth-out"),
    melt: $("melt"),
    meltOut: $("melt-out"),
    manualF: $("manual-f"),
    devol: $("devol"),
    devolOut: $("devol-out"),
    h2oOut: $("h2o-out"),
    co2Out: $("co2-out"),
    meltHint: $("melt-hint"),
    verdict: $("verdict"),
    rho: $("rho"),
    contrast: $("contrast"),
    mgnum: $("mgnum"),
    fval: $("fval"),
    heat: $("heat"),
    lee: $("lee"),
    modernBox: $("modern-box"),
    archeanBox: $("archean-box"),
    chart: $("chart")
  };

  function depthToP(km) {
    return km / 30;
  }

  function volatilesFromDevol(pctLost) {
    const keep = 1 - pctLost / 100;
    return {
      h2oPpm: M.H2O_FERTILE_PPM * keep,
      co2Ppm: M.CO2_FERTILE_PPM * keep
    };
  }

  function stateFromControls() {
    const vol = volatilesFromDevol(Number(els.devol.value));
    return {
      Tp: Number(els.tp.value),
      Pfinal: depthToP(Number(els.depth.value)),
      Fmanual: Number(els.melt.value) / 100,
      useManualF: els.manualF.checked,
      h2oPpm: vol.h2oPpm,
      co2Ppm: vol.co2Ppm
    };
  }

  function fmt(n, d) {
    return n.toFixed(d);
  }

  function verdictFor(model) {
    const pct = -model.dRhoTotal * 100;
    if (!model.buoyant) {
      return {
        cls: "bad",
        title: "Not compositionally buoyant",
        text: "This residue is as dense as, or denser than, fertile mantle. Partial melting has not yet stripped enough iron, garnet, or clinopyroxene."
      };
    }
    if (pct < 1.5) {
      return {
        cls: "mid",
        title: "Weak compositional buoyancy",
        text: "The residue is lighter than fertile mantle, but the contrast is smaller than the ~2% Jordan/Lee isopycnic benchmark for offsetting a thick, cold lithospheric root."
      };
    }
    return {
      cls: "good",
      title: "Compositionally buoyant",
      text: "Melt depletion has lowered residual density enough to approach the isopycnic requirement: compositional lift that can balance a cooler, thicker lithosphere."
    };
  }

  function fillComparison(node, model, label) {
    const pct = model.dRhoTotal * 100;
    node.innerHTML = `
      <h3>${label}</h3>
      <p>T<sub>P</sub> ${model.Tp} °C · F ${fmt(model.F * 100, 1)}% · Mg# ${fmt(model.mgNum, 1)}</p>
      <p><strong>${fmt(model.rhoResidue, 3)} g cm⁻³</strong> · Δρ/ρ ${fmt(pct, 2)}%</p>
      <div class="bar" aria-hidden="true">
        <i class="depl" style="width:${Math.min(100, Math.abs(model.dRhoDepl) * 4000)}%"></i>
        <i class="vol" style="width:${Math.min(20, Math.abs(model.dRhoVol) * 4000)}%"></i>
      </div>
      <p class="hint">Olive: melt depletion. Copper: remaining volatiles (small).</p>
    `;
  }

  function drawChart(current) {
    const svg = els.chart;
    const W = 640;
    const H = 280;
    const pad = { l: 52, r: 16, t: 18, b: 42 };
    const Fmax = 0.4;
    const ymin = -0.028;
    const ymax = 0.004;
    const x = (F) => pad.l + (F / Fmax) * (W - pad.l - pad.r);
    const y = (c) => pad.t + (1 - (c - ymin) / (ymax - ymin)) * (H - pad.t - pad.b);

    const schutt = [];
    const lee = [];
    for (let i = 0; i <= 40; i++) {
      const F = i / 100;
      schutt.push([x(F), y(M.schuttDensityContrast(F))]);
      const mg = M.residueMgNumber(F);
      lee.push([x(F), y((M.leeDensity(mg) - M.fertileDensity()) / M.fertileDensity())]);
    }
    const path = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

    const modern = M.evaluate({
      Tp: M.TP_MODERN_C,
      Pfinal: current.Pfinal,
      h2oPpm: current.h2oPpm,
      co2Ppm: current.co2Ppm,
      useManualF: false
    });
    const archean = M.evaluate({
      Tp: M.TP_ARCHEAN_C,
      Pfinal: current.Pfinal,
      h2oPpm: current.h2oPpm,
      co2Ppm: current.co2Ppm,
      useManualF: false
    });

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="#fffaf0"/>
      <line x1="${pad.l}" y1="${y(0)}" x2="${W - pad.r}" y2="${y(0)}" stroke="#c9bda8"/>
      <line x1="${pad.l}" y1="${y(-0.02)}" x2="${W - pad.r}" y2="${y(-0.02)}" stroke="#b5522a" stroke-dasharray="4 4"/>
      <path d="${path(lee)}" fill="none" stroke="#8a6a3a" stroke-width="2" stroke-dasharray="6 4"/>
      <path d="${path(schutt)}" fill="none" stroke="#4d6428" stroke-width="3"/>
      <circle cx="${x(modern.F)}" cy="${y(modern.dRhoDepl)}" r="5" fill="#3d4a55"/>
      <circle cx="${x(archean.F)}" cy="${y(archean.dRhoDepl)}" r="5" fill="#c47a3a"/>
      <circle cx="${x(current.F)}" cy="${y(current.dRhoDepl)}" r="7" fill="#b5522a" stroke="#231d18" stroke-width="1.5"/>
      <text x="${pad.l}" y="14" fill="#5c5348" font-size="12">Δρ/ρ vs fertile mantle (same T, P)</text>
      <text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="#231d18" font-size="12">Melt fraction F</text>
      <text x="14" y="${H / 2}" fill="#231d18" font-size="12" transform="rotate(-90 14 ${H / 2})">Density contrast</text>
      <text x="${W - pad.r}" y="${y(-0.02) - 6}" text-anchor="end" fill="#b5522a" font-size="11">~2% isopycnic mark (Jordan; Lee 2003)</text>
      <text x="${x(0.02)}" y="${y(M.schuttDensityContrast(0.22))}" fill="#4d6428" font-size="11">Schutt & Lesher 2006</text>
      <text x="${x(0.22)}" y="${y((M.leeDensity(M.residueMgNumber(0.28)) - M.fertileDensity()) / M.fertileDensity()) - 8}" fill="#8a6a3a" font-size="11">Lee 2003 via Mg# (not used)</text>
    `;
  }

  function syncMeltSlider(model) {
    if (!els.manualF.checked) {
      els.melt.value = String((model.FfromTp * 100).toFixed(1));
    }
    els.meltOut.textContent = fmt(Number(els.melt.value), 1) + "%";
    els.meltHint.textContent = els.manualF.checked
      ? `Manual F is on. Katz column for this T_P would be ${fmt(model.FfromTp * 100, 1)}%.`
      : "Melt fraction is calculated from potential temperature for this column top (Katz et al. 2003).";
  }

  function render() {
    const opts = stateFromControls();
    const model = M.evaluate(opts);
    syncMeltSlider(model);

    els.tpOut.textContent = `${model.Tp} °C`;
    els.depthOut.textContent = `${els.depth.value} km  ·  ${fmt(model.Pfinal, 2)} GPa`;
    els.devolOut.textContent = `${els.devol.value}% lost`;
    els.h2oOut.textContent = `${fmt(model.h2oPpm, 0)} ppm H2O left`;
    els.co2Out.textContent = `${fmt(model.co2Ppm, 0)} ppm CO2 left`;

    const eraModern = Math.abs(model.Tp - M.TP_MODERN_C) < 1;
    const eraArchean = Math.abs(model.Tp - M.TP_ARCHEAN_C) < 1;
    els.eraModern.setAttribute("aria-pressed", eraModern ? "true" : "false");
    els.eraArchean.setAttribute("aria-pressed", eraArchean ? "true" : "false");

    const v = verdictFor(model);
    els.verdict.className = "verdict " + v.cls;
    els.verdict.innerHTML = `<h3>${v.title}</h3><p>${v.text}</p>`;

    els.rho.textContent = fmt(model.rhoResidue, 3);
    els.contrast.textContent = fmt(model.dRhoTotal * 100, 2) + "%";
    els.mgnum.textContent = fmt(model.mgNum, 2);
    els.fval.textContent = fmt(model.F * 100, 1) + "%";
    els.heat.textContent = fmt(model.equivHeatingC, 0) + " °C";
    els.lee.textContent = fmt(model.leeContrast * 100, 2) + "%";

    const modern = M.evaluate({
      Tp: M.TP_MODERN_C,
      Pfinal: model.Pfinal,
      h2oPpm: model.h2oPpm,
      co2Ppm: model.co2Ppm,
      useManualF: false
    });
    const archean = M.evaluate({
      Tp: M.TP_ARCHEAN_C,
      Pfinal: model.Pfinal,
      h2oPpm: model.h2oPpm,
      co2Ppm: model.co2Ppm,
      useManualF: false
    });
    fillComparison(els.modernBox, modern, "Modern ambient mantle");
    fillComparison(els.archeanBox, archean, "Archean ambient mantle");
    drawChart(model);
  }

  function setEra(tp) {
    els.tp.value = String(tp);
    els.manualF.checked = false;
    render();
  }

  ["input", "change"].forEach((evt) => {
    [els.tp, els.depth, els.melt, els.devol, els.manualF].forEach((el) => {
      el.addEventListener(evt, render);
    });
  });
  els.eraModern.addEventListener("click", () => setEra(M.TP_MODERN_C));
  els.eraArchean.addEventListener("click", () => setEra(M.TP_ARCHEAN_C));

  render();
})();
