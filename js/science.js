/**
 * Published petrologic relationships for the teaching page.
 * Every numeric constant is taken from a cited paper. No invented
 * density or melt-productivity coefficients.
 */
(function (root) {
  "use strict";

  /** Katz, Spiegelman & Langmuir (2003, G-Cubed) Table 2; signs as in the 2023 errata / standard implementations. */
  const KATZ = {
    A1: 1085.7,
    A2: 132.9,
    A3: -5.1,
    B1: 1475.0,
    B2: 80.0,
    B3: -3.2,
    C1: 1780.0,
    C2: 45.0,
    C3: -2.0,
    r1: 0.5,
    r2: 0.08,
    beta1: 1.5,
    beta2: 1.5,
    Mcpx: 0.15,
    K: 43.0,
    gamma: 0.75,
    DH2O: 0.01,
    chi1: 12.0,
    chi2: 1.0,
    lambda: 0.6,
    alpha: 40e-6,
    cp: 1000,
    rho: 3300,
    dS: 300
  };

  /** Herzberg, Condie & Korenaga (2010): modern ambient Tp and Archean peak. */
  const TP_MODERN_C = 1350;
  const TP_ARCHEAN_C = 1550;

  /**
   * Lee (2003, JGR) Table 5, garnet-facies peridotites:
   * ρ (g cm⁻³) = −0.0144 × Mg# + 4.66, Mg# = 100 × Mg/(Mg+Fe).
   */
  const LEE_A = -0.0144;
  const LEE_B = 4.66;
  const MGNUM_FERTILE = 89.2; // Walter (1998) KR4003 starting composition
  const MGNUM_OPX_OUT = 92.8; // Bernstein, Kelemen & Hanghøj (2007) at opx exhaustion
  const F_OPX_OUT = 0.4;

  /**
   * Schutt & Lesher (2006, JGR) abstract: residue density change at 20% melt
   * removal, 4 GPa (largest depletion effect; garnet field). Linear in melt
   * fraction as in their Δρ/ρ₀ = B D form.
   */
  const SCHUTT_P_GPA = 4;
  const SCHUTT_F_REF = 0.2;
  const SCHUTT_DRHO_AT_REF = -0.0114;

  /**
   * Smyth et al. (2006, GRL): 5000 ppm H2O in forsterite has the same
   * ambient-P density effect as heating ~240 °C. Volume thermal expansion
   * from Fei (1995), the comparison they cite.
   */
  const SMYTH_H2O_PPM = 5000;
  const SMYTH_EQUIV_DT_C = 240;
  const FEI_ALPHA_FORSTERITE = 36.4e-6;

  /**
   * Eeken et al. (2018): 0.25 wt% H2O produces ~13% hydrous-mineral
   * assemblage in peridotite. Used only for accessory hydrous mode.
   */
  const EEKEN_H2O_WT = 0.0025;
  const EEKEN_HYDROUS_MODE = 0.13;

  /** Published mineral densities (g cm⁻³), STP. */
  const RHO_PHLOGOPITE = 2.8; // Deer, Howie & Zussman
  const RHO_MAGNESITE = 3.01; // Robie & Hemingway / standard magnesite
  const MAGNESITE_CO2_FRACTION = 44.01 / 84.31;

  /** Hirth & Kohlstedt (1996): ambient MORB-source water. */
  const H2O_FERTILE_PPM = 125;
  /** Dasgupta & Hirschmann (2010): DMM-like CO2 order of magnitude. */
  const CO2_FERTILE_PPM = 100;

  /** Schutt & Lesher (2006): α of realistic upper mantle, 1–7 GPa. */
  function thermalExpansivity(P_GPa) {
    const a1 = 4.91e-5;
    const a7 = 3.47e-5;
    return a1 + (a7 - a1) * ((P_GPa - 1) / 6);
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function katzDrySolidusC(P) {
    return KATZ.A1 + KATZ.A2 * P + KATZ.A3 * P * P;
  }

  function katzLherzLiquidusC(P) {
    return KATZ.B1 + KATZ.B2 * P + KATZ.B3 * P * P;
  }

  function katzLiquidusC(P) {
    return KATZ.C1 + KATZ.C2 * P + KATZ.C3 * P * P;
  }

  function waterSaturationWtPct(P) {
    return KATZ.chi1 * Math.pow(Math.max(P, 0), KATZ.lambda) + KATZ.chi2 * P;
  }

  function meltWaterWtPct(bulkWtPct, F) {
    const x = bulkWtPct / (KATZ.DH2O + F * (1 - KATZ.DH2O));
    return x;
  }

  /**
   * Equilibrium melt fraction F(T °C, P GPa, bulk H2O wt%).
   * Katz et al. (2003) eqs. 2–10 and 16–19.
   */
  function katzF(T, P, bulkH2OwtPct) {
    const tsolDry = katzDrySolidusC(P);
    const tlliq = katzLherzLiquidusC(P);
    const tliq = katzLiquidusC(P);
    const rcpx = KATZ.r1 + KATZ.r2 * P;
    const fcpx = clamp(KATZ.Mcpx / rcpx, 0.05, 0.95);

    function FfromT(Tuse, tsol) {
      if (Tuse <= tsol) return 0;
      const td = (Tuse - tsol) / (tlliq - tsol);
      let F = Math.pow(clamp(td, 0, 1), KATZ.beta1);
      if (F > fcpx) {
        const tcpx = Math.pow(fcpx, 1 / KATZ.beta1) * (tlliq - tsol) + tsol;
        const td2 = (Tuse - tcpx) / (tliq - tcpx);
        F = fcpx + (1 - fcpx) * Math.pow(clamp(td2, 0, 1), KATZ.beta2);
      }
      return clamp(F, 0, 1);
    }

    if (!bulkH2OwtPct || bulkH2OwtPct <= 0) {
      return FfromT(T, tsolDry);
    }

    let F = 0;
    for (let i = 0; i < 24; i++) {
      let xMelt = meltWaterWtPct(bulkH2OwtPct, Math.max(F, 1e-6));
      const xsat = waterSaturationWtPct(P);
      if (xMelt > xsat) xMelt = xsat;
      const dT = KATZ.K * Math.pow(xMelt, KATZ.gamma);
      const next = FfromT(T, tsolDry - dT);
      if (Math.abs(next - F) < 1e-5) {
        F = next;
        break;
      }
      F = 0.5 * F + 0.5 * next;
    }
    return clamp(F, 0, 1);
  }

  function adiabatC(Tp, P) {
    const T0 = Tp + 273.15;
    const dTdP = (KATZ.alpha * T0) / (KATZ.rho * KATZ.cp) * 1e9;
    return Tp + dTdP * P;
  }

  /**
   * Approximate isentropic decompression melt fraction at the top of a
   * melting column (Pfinal), using Katz F(T,P) and Katz Table 2 ΔS, cp, α.
   * Residue F is the melt fraction at the shallowest pressure — the
   * quantity that sets residual-peridotite depletion.
   */
  function columnMeltFraction(Tp, Pfinal, bulkH2OwtPct) {
    const Pstart = 8;
    const steps = 180;
    let T = adiabatC(Tp, Pstart);
    let F = 0;

    for (let i = 0; i < steps; i++) {
      const P = Pstart - (Pstart - Pfinal) * (i / steps);
      const Pn = Pstart - (Pstart - Pfinal) * ((i + 1) / steps);
      const dP = P - Pn;
      const dTdP = (KATZ.alpha * (T + 273.15)) / (KATZ.rho * KATZ.cp) * 1e9;
      T -= dTdP * dP;

      for (let k = 0; k < 10; k++) {
        const Feq = katzF(T, Pn, bulkH2OwtPct);
        if (Feq <= F + 1e-7) break;
        const dF = (Feq - F) * 0.55;
        T -= ((T + 273.15) * KATZ.dS / KATZ.cp) * dF;
        F += dF;
      }
    }
    return clamp(F, 0, 0.45);
  }

  /**
   * Residue Mg# vs melt fraction: linear between Walter (1998) fertile
   * KR4003 (89.2) and Bernstein et al. (2007) opx-out (~92.8 at F ≈ 0.40).
   * Afonso & Schutt (2012) / Afonso (2016) note Mg# rises almost linearly
   * with F for batch or fractional melting.
   */
  function residueMgNumber(F) {
    return MGNUM_FERTILE + (MGNUM_OPX_OUT - MGNUM_FERTILE) * clamp(F / F_OPX_OUT, 0, 1.15);
  }

  function leeDensity(mgNum) {
    return LEE_A * mgNum + LEE_B;
  }

  function schuttDensityContrast(F) {
    return SCHUTT_DRHO_AT_REF * (F / SCHUTT_F_REF);
  }

  function namWaterDensityContrast(h2oPpm) {
    const dRhoPerPpm =
      (-FEI_ALPHA_FORSTERITE * SMYTH_EQUIV_DT_C) / SMYTH_H2O_PPM;
    return dRhoPerPpm * Math.max(0, h2oPpm);
  }

  function accessoryHydrousMode(h2oPpm) {
    const wt = Math.max(0, h2oPpm) / 1e6;
    return EEKEN_HYDROUS_MODE * (wt / EEKEN_H2O_WT);
  }

  function magnesiteMode(co2Ppm) {
    const wtCo2 = Math.max(0, co2Ppm) / 1e6;
    return wtCo2 / MAGNESITE_CO2_FRACTION;
  }

  function fertileDensity() {
    return leeDensity(MGNUM_FERTILE);
  }

  /**
   * Volatile contribution to density contrast (residue − fertile anhydrous
   * residue). Remaining H2O/CO2 makes the rock slightly lighter; losing
   * them raises density. Accessory hydrous-mineral mode from Eeken et al.
   * (2018) scaling; magnesite from remaining CO2.
   */
  function volatileDensityContrast(h2oPpm, co2Ppm, rhoHost) {
    const nam = namWaterDensityContrast(h2oPpm);
    const fPhl = accessoryHydrousMode(h2oPpm);
    const fMag = magnesiteMode(co2Ppm);
    const hydrous = fPhl * (RHO_PHLOGOPITE - rhoHost) / rhoHost;
    const carb = fMag * (RHO_MAGNESITE - rhoHost) / rhoHost;
    return {
      nam,
      hydrous,
      carbonate: carb,
      total: nam + hydrous + carb,
      fPhl,
      fMag
    };
  }

  function evaluate(opts) {
    const Tp = opts.Tp;
    const Pfinal = opts.Pfinal;
    const Fmanual = opts.Fmanual;
    const useManualF = !!opts.useManualF;
    const h2oPpm = opts.h2oPpm;
    const co2Ppm = opts.co2Ppm;
    const bulkH2OwtPct = (h2oPpm / 1e6) * 100;

    const FfromTp = columnMeltFraction(Tp, Pfinal, bulkH2OwtPct);
    const F = useManualF ? clamp(Fmanual, 0, 0.45) : FfromTp;
    const mgNum = residueMgNumber(F);
    const rhoFertile = fertileDensity();
    const dRhoDepl = schuttDensityContrast(F);
    const rhoAfterDepl = rhoFertile * (1 + dRhoDepl);
    const vol = volatileDensityContrast(h2oPpm, co2Ppm, rhoAfterDepl);
    const rhoResidue = rhoAfterDepl * (1 + vol.total);
    const dRhoTotal = (rhoResidue - rhoFertile) / rhoFertile;
    const dRhoVsAsth = rhoResidue - rhoFertile;
    const alpha = thermalExpansivity(SCHUTT_P_GPA);
    const equivHeatingC = -dRhoDepl / alpha;
    const leeRho = leeDensity(mgNum);
    const leeContrast = (leeRho - rhoFertile) / rhoFertile;

    return {
      Tp,
      Pfinal,
      F,
      FfromTp,
      mgNum,
      rhoFertile,
      rhoResidue,
      dRhoDepl,
      dRhoVol: vol.total,
      vol,
      dRhoTotal,
      dRhoVsAsth,
      buoyant: dRhoTotal < -1e-5,
      equivHeatingC,
      leeRho,
      leeContrast,
      h2oPpm,
      co2Ppm
    };
  }

  const api = {
    KATZ,
    TP_MODERN_C,
    TP_ARCHEAN_C,
    SCHUTT_P_GPA,
    H2O_FERTILE_PPM,
    CO2_FERTILE_PPM,
    MGNUM_FERTILE,
    MGNUM_OPX_OUT,
    katzF,
    katzDrySolidusC,
    columnMeltFraction,
    residueMgNumber,
    leeDensity,
    schuttDensityContrast,
    fertileDensity,
    namWaterDensityContrast,
    evaluate
  };

  root.MantleBuoyancy = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
