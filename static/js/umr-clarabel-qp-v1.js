// Exact browser equivalent of smpl_surface_retarget_common.solve_clarabel_qp_step.
// Matrices are dense row-major at this boundary; they are converted to the same
// upper-triangular CSC/conic form used by scipy + Clarabel in the native pipeline.

import initClarabel, {
  solve_qp_csc as solveQpCsc
} from "../vendor/umr-clarabel-wasm-v1/umr_clarabel_wasm.js";

let clarabelReady = null;

export function initializeClarabelQP() {
  if (!clarabelReady) clarabelReady = initClarabel();
  return clarabelReady;
}

function finiteOrInfinity(value, fallback) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? fallback : numeric;
}

function denseUpperJtJ(jacobian, rowCount, columnCount, damping) {
  const output = new Float64Array(columnCount * columnCount);
  for (let column = 0; column < columnCount; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      let value = row === column ? damping : 0;
      for (let sample = 0; sample < rowCount; sample += 1) {
        value += Number(jacobian[sample * columnCount + row])
          * Number(jacobian[sample * columnCount + column]);
      }
      output[row * columnCount + column] = value;
    }
  }
  return output;
}

function jtResidual(jacobian, residual, rowCount, columnCount) {
  const output = new Float64Array(columnCount);
  for (let column = 0; column < columnCount; column += 1) {
    let value = 0;
    for (let row = 0; row < rowCount; row += 1) {
      value += Number(jacobian[row * columnCount + column]) * Number(residual[row]);
    }
    output[column] = value;
  }
  return output;
}

function tripletsToCsc(rowCount, columnCount, triplets) {
  triplets.sort((left, right) => left.column - right.column || left.row - right.row);
  const columnPointers = new Uint32Array(columnCount + 1);
  const rowIndices = new Uint32Array(triplets.length);
  const values = new Float64Array(triplets.length);
  let cursor = 0;
  for (let column = 0; column < columnCount; column += 1) {
    columnPointers[column] = cursor;
    while (cursor < triplets.length && triplets[cursor].column === column) {
      const entry = triplets[cursor];
      if (entry.row < 0 || entry.row >= rowCount) throw new RangeError("CSC row index out of bounds");
      rowIndices[cursor] = entry.row;
      values[cursor] = entry.value;
      cursor += 1;
    }
  }
  columnPointers[columnCount] = cursor;
  return { columnPointers, rowIndices, values };
}

function normalizedL2Groups(nvar, globalStepSize, globalStepDofIds, l2StepLimits) {
  const groups = [];
  if (globalStepSize != null && Number.isFinite(Number(globalStepSize))) {
    const radius = Number(globalStepSize);
    if (!(radius > 0)) throw new RangeError(`global_step_size must be positive, got ${radius}`);
    const ids = globalStepDofIds == null
      ? Array.from({ length: nvar }, (_, index) => index)
      : Array.from(globalStepDofIds, Number);
    if (ids.length) groups.push({ ids, radius });
  }
  for (const group of l2StepLimits || []) {
    const ids = Array.from(group.dofIds ?? group[0] ?? [], Number)
      .filter((index) => index >= 0 && index < nvar);
    const radius = Number(group.radius ?? group[1]);
    if (!Number.isFinite(radius)) continue;
    if (!(radius > 0)) throw new RangeError(`l2 step radius must be positive, got ${radius}`);
    if (ids.length) groups.push({ ids, radius });
  }
  return groups;
}

export async function solveClarabelQPStep({
  jacobian,
  residual,
  rowCount,
  variableCount,
  damping = 0,
  lower,
  upper,
  inequalityA = null,
  inequalityB = null,
  inequalityRowCount = 0,
  inequalitySoftCost = 0,
  inequalitySoftCosts = null,
  globalStepSize = null,
  globalStepDofIds = null,
  l2StepLimits = null
}) {
  await initializeClarabelQP();
  const nvar = Number(variableCount);
  const rows = Number(rowCount);
  if (!(nvar >= 0 && rows >= 0)) throw new RangeError("Invalid QP shape");
  if (jacobian.length !== rows * nvar || residual.length !== rows) throw new RangeError("QP Jacobian/residual shape mismatch");
  if (lower.length !== nvar || upper.length !== nvar) throw new RangeError("QP bound shape mismatch");

  const ineqRows = Number(inequalityRowCount || 0);
  const ineqA = inequalityA || new Float64Array(0);
  const ineqB = inequalityB || new Float64Array(0);
  if (ineqA.length !== ineqRows * nvar || ineqB.length !== ineqRows) throw new RangeError("QP inequality shape mismatch");

  const softCosts = new Float64Array(ineqRows);
  if (inequalitySoftCosts != null) {
    if (inequalitySoftCosts.length !== ineqRows) throw new RangeError("QP soft-cost shape mismatch");
    for (let row = 0; row < ineqRows; row += 1) softCosts[row] = Math.max(0, Number(inequalitySoftCosts[row]));
  } else if (Number(inequalitySoftCost) > 0) {
    softCosts.fill(Number(inequalitySoftCost));
  }
  const softIndex = new Int32Array(ineqRows);
  softIndex.fill(-1);
  let nslack = 0;
  for (let row = 0; row < ineqRows; row += 1) {
    if (softCosts[row] > 0) softIndex[row] = nslack++;
  }
  const ntotal = nvar + nslack;

  const lowerCopy = new Float64Array(nvar);
  const upperCopy = new Float64Array(nvar);
  for (let index = 0; index < nvar; index += 1) {
    lowerCopy[index] = finiteOrInfinity(lower[index], -Infinity);
    upperCopy[index] = finiteOrInfinity(upper[index], Infinity);
    if (Number.isFinite(lowerCopy[index]) && Number.isFinite(upperCopy[index]) && upperCopy[index] <= lowerCopy[index]) {
      const center = 0.5 * (lowerCopy[index] + upperCopy[index]);
      lowerCopy[index] = center - 1e-12;
      upperCopy[index] = center + 1e-12;
    }
  }

  const denseP = denseUpperJtJ(jacobian, rows, nvar, Number(damping));
  const pTriplets = [];
  for (let column = 0; column < nvar; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      const value = denseP[row * nvar + column];
      if (value !== 0) pTriplets.push({ row, column, value });
    }
  }
  for (let slack = 0; slack < nslack; slack += 1) {
    let sourceRow = 0;
    while (softIndex[sourceRow] !== slack) sourceRow += 1;
    pTriplets.push({ row: nvar + slack, column: nvar + slack, value: softCosts[sourceRow] });
  }
  const pCsc = tripletsToCsc(ntotal, ntotal, pTriplets);
  const q = new Float64Array(ntotal);
  q.set(jtResidual(jacobian, residual, rows, nvar));

  const aTriplets = [];
  const b = [];
  let constraintRow = 0;
  for (let dof = 0; dof < nvar; dof += 1) {
    if (!Number.isFinite(upperCopy[dof])) continue;
    aTriplets.push({ row: constraintRow, column: dof, value: 1 });
    b.push(upperCopy[dof]);
    constraintRow += 1;
  }
  for (let dof = 0; dof < nvar; dof += 1) {
    if (!Number.isFinite(lowerCopy[dof])) continue;
    aTriplets.push({ row: constraintRow, column: dof, value: -1 });
    b.push(-lowerCopy[dof]);
    constraintRow += 1;
  }
  for (let slack = 0; slack < nslack; slack += 1) {
    aTriplets.push({ row: constraintRow, column: nvar + slack, value: -1 });
    b.push(0);
    constraintRow += 1;
  }
  for (let row = 0; row < ineqRows; row += 1) {
    for (let column = 0; column < nvar; column += 1) {
      const value = Number(ineqA[row * nvar + column]);
      if (value !== 0) aTriplets.push({ row: constraintRow, column, value });
    }
    if (softIndex[row] >= 0) aTriplets.push({ row: constraintRow, column: nvar + softIndex[row], value: -1 });
    b.push(Number(ineqB[row]));
    constraintRow += 1;
  }
  const linearRows = constraintRow;
  const coneTypes = [];
  const coneDimensions = [];
  if (linearRows > 0) {
    coneTypes.push(1);
    coneDimensions.push(linearRows);
  }

  const groups = normalizedL2Groups(nvar, globalStepSize, globalStepDofIds, l2StepLimits);
  for (const group of groups) {
    b.push(group.radius);
    constraintRow += 1;
    for (const dof of group.ids) {
      aTriplets.push({ row: constraintRow, column: dof, value: -1 });
      b.push(0);
      constraintRow += 1;
    }
    coneTypes.push(2);
    coneDimensions.push(group.ids.length + 1);
  }

  const aCsc = tripletsToCsc(constraintRow, ntotal, aTriplets);
  const solved = solveQpCsc(
    ntotal,
    pCsc.columnPointers,
    pCsc.rowIndices,
    pCsc.values,
    q,
    constraintRow,
    aCsc.columnPointers,
    aCsc.rowIndices,
    aCsc.values,
    Float64Array.from(b),
    Uint8Array.from(coneTypes),
    Uint32Array.from(coneDimensions)
  );
  const output = new Float64Array(nvar);
  for (let index = 0; index < nvar; index += 1) {
    output[index] = Math.min(upperCopy[index], Math.max(lowerCopy[index], Number(solved[index])));
  }
  return output;
}
