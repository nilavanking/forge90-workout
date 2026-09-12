/* Typed measurements. Blank is absent; conversions never mutate historical records. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Forge90Measurements = api;
})(typeof window === 'object' ? window : globalThis, function() {
  'use strict';
  const units = {load:'kg',reps:'reps',duration:'sec',distance:'m',leftReps:'reps',rightReps:'reps',leftDuration:'sec',rightDuration:'sec',assistance:'kg',tempo:'tempo'};
  function prescription(text) {
    const source = String(text || '').replace(/sets?/gi, '').replace(/\s+/g, ' ').trim();
    const count = source.match(/^(?:Plan:\s*)?(\d+)\s*[×x]/i);
    const rest = count ? source.slice(count[0].length).trim() : source;
    const range = rest.match(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?/);
    const duration = /\b(sec|seconds?|min|minutes?)\b/i.test(rest);
    const distance = /\b(km|metres?|meters?|m)\b/i.test(rest);
    const multiplier = duration && /\bmin/i.test(rest) ? 60 : distance && /\bkm/i.test(rest) ? 1000 : 1;
    return {count:count ? Number(count[1]) : null,min:range ? Number(range[1])*multiplier : null,max:range ? Number(range[2] || range[1])*multiplier : null,
      metric:duration ? 'duration' : distance ? 'distance' : 'reps',sides:/\/\s*(side|leg|arm)|per\s+(side|leg|arm)/i.test(rest),tempo:rest.match(/\b[0-9X]-[0-9X]-[0-9X](?:-[0-9X])?\b/i)?.[0] || null};
  }
  function fields(name, text, equipment = '') {
    const p = prescription(text), src = `${name} ${equipment}`;
    const body = /bodyweight|exercise mat|resistance.band|band pallof|dead bug|bird dog|plank|heel slide|supine march|glute bridge|side.lying/i.test(src);
    const assisted = /assisted|assistance/i.test(src);
    const metric = /treadmill|cycling|rower|elliptical/i.test(name) ? 'time-distance' : /carry/i.test(name) ? 'distance' : /plank|hold/i.test(name) ? 'duration' : p.metric;
    let result = metric === 'time-distance' ? ['duration','distance'] : p.sides && metric !== 'distance' ? (metric === 'duration' ? ['leftDuration','rightDuration'] : ['leftReps','rightReps']) : [metric];
    if (assisted) result.unshift('assistance');
    else if (!body && metric !== 'time-distance' && (metric!=='distance'||/carry|loaded|weighted/i.test(name))) result.unshift('load');
    if (p.tempo || /tempo/i.test(text)) result.push('tempo');
    return result;
  }
  function normalize(value = {}, allowed = ['load','reps']) {
    const source = value.actual || value, out = {};
    for (const key of allowed) {
      const raw = source[key] ?? (key === 'load' ? source.weight : undefined);
      if (raw === '' || raw == null) continue;
      if (key === 'tempo') {
        if (!/^[0-9X]-[0-9X]-[0-9X](?:-[0-9X])?$/i.test(String(raw))) throw new Error('Use tempo such as 3-1-1 or 3-1-X-0.');
        out[key] = String(raw).toUpperCase();
      } else {
        if (typeof raw === 'boolean' || !/^\d+(?:\.\d+)?$/.test(String(raw)) || !Number.isFinite(Number(raw))) throw new Error(`Enter a valid non-negative ${key}.`);
        const n = Number(raw), maximum = /reps/i.test(key) ? 1000 : /duration/i.test(key) ? 86400 : key === 'distance' ? 1000000 : 2000;
        if (n > maximum || (/reps/i.test(key) && !Number.isInteger(n))) throw new Error(`Enter a valid ${key}.`);
        out[key] = n;
      }
    }
    return out;
  }
  function validate(value, allowed, complete = false) {
    try {
      const source=value.actual||value;
      if(Object.keys(source).some(key=>Object.hasOwn(units,key)&&!allowed.includes(key)&&source[key]!==''&&source[key]!=null))return {valid:false,error:'This measurement does not belong to the exercise.'};
      const actual = normalize(value, allowed);
      if (complete && allowed.some(k => actual[k] == null || (k !== 'load' && k !== 'assistance' && k !== 'tempo' && actual[k] <= 0))) return {valid:false,error:'Enter every required actual before completing this set.'};
      return {valid:true,actual};
    } catch (error) { return {valid:false,error:error.message}; }
  }
  function format(value = {}) {
    const a = value.actual || value, parts = [], load = a.load ?? a.weight;
    if (load !== '' && load != null) parts.push(`${load} kg`);
    if (a.assistance != null) parts.push(`${a.assistance} kg assistance`);
    for (const [left,right,unit] of [['leftReps','rightReps','reps'],['leftDuration','rightDuration','sec']]) {
      if (a[left] != null || a[right] != null) parts.push(a[left] === a[right] ? `${a[left]} ${unit}/side` : `L${a[left] ?? '—'} / R${a[right] ?? '—'} ${unit}`);
    }
    for (const key of ['reps','duration','distance']) if (a[key] !== '' && a[key] != null) parts.push(`${a[key]} ${units[key]}`);
    if (a.tempo) parts.push(`tempo ${a.tempo}`);
    return parts.join(' × ') || 'Not entered';
  }
  function metrics(value = {}) {
    const a = value.actual || value;
    const reps = Number(a.reps || 0) + Number(a.leftReps || 0) + Number(a.rightReps || 0);
    return {reps,volume:Number(a.load ?? a.weight ?? 0)*reps};
  }
  return {units,prescription,fields,normalize,validate,format,metrics};
});
