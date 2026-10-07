import React from 'react';

const options = [
  ['', 'All availability'],
  ['AVAILABLE', 'Available'],
  ['BUSY', 'Busy'],
  ['OFF_DUTY', 'Not available'],
  ['ON_LEAVE', 'On leave'],
];

export function TechnicianAvailabilityFilter({ value = '', onChange }) {
  return <section className="panel asset-form technician-availability-filter">
    <label>Filter technicians by availability
      <select aria-label="Filter technicians by availability" value={value} onChange={event => onChange(event.target.value)}>
        {options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
  </section>;
}
