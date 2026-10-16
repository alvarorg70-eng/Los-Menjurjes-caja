/* Reset sales of the open shift only; preserve catalog, cash movements and closed shifts. */
(function(root){
  'use strict';
  function openShift(state){const sh=state.shifts.find(s=>!s.closed);if(!sh)throw Error('Abre la caja que contiene las ventas de prueba. Las jornadas cerradas se conservan.');return sh}
  function snapshot(state,at){
    const shift=openShift(state),sales=state.sales.filter(s=>s.shift===shift.id);
    if(!sales.length)throw Error('No hay ventas de prueba que borrar en la caja abierta.');
    return {at,shiftId:shift.id,sales:structuredClone(sales)};
  }
  function clear(state){
    const shift=openShift(state);
    if(!state.sales.some(s=>s.shift===shift.id))throw Error('La caja abierta ya está sin ventas.');
    state.sales=state.sales.filter(s=>s.shift!==shift.id);
    return state;
  }
  function recover(state,copy){
    if(!copy||typeof copy.shiftId!=='string'||!Array.isArray(copy.sales))throw Error('No hay una copia de recuperación válida.');
    const shift=openShift(state);
    if(shift.id!==copy.shiftId||state.sales.some(s=>s.shift===shift.id))throw Error('Ya hay ventas nuevas o cambiaste de jornada. No se puede recuperar encima de ellas.');
    if(copy.sales.some(s=>s.shift!==shift.id||state.sales.some(v=>v.id===s.id||v.folio===s.folio)))throw Error('La copia tiene ventas en conflicto. No se modificaron los datos.');
    state.sales.push(...structuredClone(copy.sales));
    return state;
  }
  const api={snapshot,clear,recover};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MenjurjesReset=api;
})(typeof globalThis!=='undefined'?globalThis:this);
