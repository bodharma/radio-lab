import { initialValues, validControlValue } from './activities.js';

export const STORAGE_KEY = 'radio-lab-progress-v1';

export function loadProgress(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { state: { version: 1, activeId: '', records: {} }, warning: '', writable: true };
    const state = JSON.parse(raw);
    if (state?.version !== 1 || !state.records || typeof state.records !== 'object' || Array.isArray(state.records)) throw new Error('Invalid saved progress');
    return { state, warning: '', writable: true };
  } catch {
    return { state: { version: 1, activeId: '', records: {} }, warning: 'Saved progress could not be opened. This session will not overwrite it.', writable: false };
  }
}

export function topicRecord(document, activity, saved) {
  const values = initialValues(activity);
  const before = { ...values };
  const matchingSource = saved?.hash === document.hash && saved.sections === document.chunks.length;
  const matchingActivity = matchingSource && (!saved.activity || saved.activity === activity.kind) && activity.controls.every(control => Object.hasOwn(saved.values || {}, control.key));
  if (matchingActivity) for (const control of activity.controls) {
    values[control.key] = validControlValue(control, saved.values?.[control.key] ?? control.initial);
    before[control.key] = validControlValue(control, saved.before?.[control.key] ?? control.initial);
  }
  return {
    hash: document.hash, sections: document.chunks.length, activity: activity.kind, values, before,
    part: matchingSource && Number.isInteger(saved.part) ? Math.max(0, Math.min(document.chunks.length - 1, saved.part)) : 0,
    seen: matchingSource && Array.isArray(saved.seen) ? [...new Set(saved.seen.filter(i => Number.isInteger(i) && i >= 0 && i < document.chunks.length))] : [],
    reflection: typeof saved?.reflection === 'string' ? saved.reflection.slice(0, 4000) : '',
    changes: matchingActivity && Number.isInteger(saved.changes) ? Math.max(0, Math.min(100000, saved.changes)) : 0,
    reviewed: matchingActivity && saved.reviewed === true,
  };
}

export function isReviewed(document, record, activity) {
  return record?.hash === document.hash && record.sections === document.chunks.length && record.reviewed === true && (!activity || ((!record.activity || record.activity === activity.kind) && activity.controls.every(control => Object.hasOwn(record.values || {}, control.key))));
}

export function canReview(document, record) {
  return record.seen.length === document.chunks.length && record.changes > 0 && record.reflection.trim().length >= 3;
}
