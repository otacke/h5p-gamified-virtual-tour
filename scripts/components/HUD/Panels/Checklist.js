import React from 'react';
import '@components/HUD/Panels/HudPanel.css';
import '@components/HUD/Panels/Checklist.css';

/**
 * Render checklist of interactions with their completion state.
 * @param {object} props Component props.
 * @param {object[]} props.items Items with id, label and isDone.
 * @param {object} props.l10n Localization with checklist, checklistItemDone and checklistItemNotDone.
 * @returns {React.Element} Rendered checklist.
 */
const Checklist = ({ items, l10n }) => (
  <div className='hud-panel checklist-panel' role='region' aria-label={l10n.checklist}>
    <div className='checklist-title'>{l10n.checklist}</div>
    <ul className='checklist-items'>
      {
        items.map((item) => (
          <li key={item.id} className={`checklist-item${item.isDone ? ' done' : ''}`}>
            <span className='checklist-item-label'>{item.label}</span>
            <span className='checklist-item-status'>
              {item.isDone ? l10n.checklistItemDone : l10n.checklistItemNotDone}
            </span>
          </li>
        ))
      }
    </ul>
  </div>
);

export default Checklist;
