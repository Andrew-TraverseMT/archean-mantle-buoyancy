#!/usr/bin/env node
"use strict";

const assert = require("assert");
const M = require("../js/science.js");

function approx(a, b, tol, msg) {
  assert.ok(Math.abs(a - b) <= tol, msg + ` (got ${a}, expected ${b} ± ${tol})`);
}

// Lee (2003) Table 5: ρ = −0.0144 Mg# + 4.66
approx(M.leeDensity(89), -0.0144 * 89 + 4.66, 1e-12, "Lee density at Mg# 89");
approx(M.leeDensity(93), -0.0144 * 93 + 4.66, 1e-12, "Lee density at Mg# 93");
const drop = (M.leeDensity(89) - M.leeDensity(93)) / M.leeDensity(89);
approx(drop, 0.017, 0.003, "Lee ~2% density drop Mg# 89 → 93 (Lee et al. 2011 review)");

// Schutt & Lesher (2006): −1.14% at 20% melt, 4 GPa
approx(M.schuttDensityContrast(0.2), -0.0114, 1e-12, "Schutt 20% melt at 4 GPa");
approx(M.schuttDensityContrast(0), 0, 1e-12, "Schutt F=0");

// Mg# anchors
approx(M.residueMgNumber(0), 89.2, 1e-9, "fertile Mg# Walter 1998");
approx(M.residueMgNumber(0.4), 92.8, 1e-9, "opx-out Mg# Bernstein 2007");

// Katz dry: below solidus F=0; F rises with T
const P = 2;
const Tsol = M.katzDrySolidusC(P);
approx(M.katzF(Tsol - 20, P, 0), 0, 1e-9, "Katz F=0 below solidus");
assert.ok(M.katzF(Tsol + 80, P, 0) > 0.02, "Katz F>0 above solidus");
assert.ok(M.katzF(1600, P, 0) > M.katzF(1450, P, 0), "Katz F increases with T");

// Same lithosphere thickness: Archean Tp melts more than modern
const Ptop = 1.0;
const Fmod = M.columnMeltFraction(M.TP_MODERN_C, Ptop, 0);
const Farch = M.columnMeltFraction(M.TP_ARCHEAN_C, Ptop, 0);
assert.ok(Farch > Fmod + 0.08, `Archean F (${Farch.toFixed(3)}) must exceed modern F (${Fmod.toFixed(3)}) by a large margin`);
assert.ok(Fmod > 0.04 && Fmod < 0.18, `modern F at 1 GPa top should be MORB-like, got ${Fmod}`);
assert.ok(Farch > 0.2 && Farch < 0.42, `Archean F at 1 GPa top should be ~30%, got ${Farch}`);

// Water adds a low-F tail, not a modern-to-Archean jump
const Fwet = M.columnMeltFraction(M.TP_MODERN_C, Ptop, 0.0125);
assert.ok(Fwet >= Fmod - 1e-6, "water should not decrease F");
assert.ok(Fwet - Fmod < 0.06, "125 ppm water is a secondary melt increment");

// Volatiles secondary to 20% melt depletion
const dMelt20 = Math.abs(M.schuttDensityContrast(0.2));
const dWater = Math.abs(M.namWaterDensityContrast(125));
assert.ok(dWater < 0.15 * dMelt20, "NAM water density effect << 20% melt depletion");

const modern = M.evaluate({
  Tp: M.TP_MODERN_C,
  Pfinal: 1,
  h2oPpm: 125,
  co2Ppm: 100,
  useManualF: false
});
const archean = M.evaluate({
  Tp: M.TP_ARCHEAN_C,
  Pfinal: 1,
  h2oPpm: 50,
  co2Ppm: 20,
  useManualF: false
});
assert.ok(archean.F > modern.F, "Archean column more melted");
assert.ok(archean.rhoResidue < modern.rhoResidue, "Archean residue less dense");
assert.ok(Math.abs(archean.dRhoVol) < Math.abs(archean.dRhoDepl), "volatiles secondary to depletion");
assert.ok(archean.buoyant, "Archean residue compositionally buoyant");

const undepleted = M.evaluate({
  Tp: M.TP_MODERN_C,
  Pfinal: 1,
  Fmanual: 0,
  useManualF: true,
  h2oPpm: 25,
  co2Ppm: 20
});
assert.ok(!undepleted.buoyant, "near-zero melt is not compositionally buoyant");

console.log("All science tests passed.");
console.log("  modern F =", modern.F.toFixed(3), "ρ =", modern.rhoResidue.toFixed(4), "Δρ/ρ =", (modern.dRhoTotal * 100).toFixed(2) + "%");
console.log("  archean F =", archean.F.toFixed(3), "ρ =", archean.rhoResidue.toFixed(4), "Δρ/ρ =", (archean.dRhoTotal * 100).toFixed(2) + "%");
