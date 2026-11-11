'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Check, ChevronDown, Clock } from 'lucide-react';
import {
  NO_PURPOSE_EXAMPLE,
  PURPOSES,
  describeRecent,
  loadFieldHistory,
  optionFor,
  type PurposeOption,
  type RecentAnswer,
} from '@/lib/purpose-memory';
import type { Purpose } from '@/types/pipeline';

const MAX_DESCRIPTION = 1000;

const subscribePhone = (notify: () => void) => {
  const query = window.matchMedia?.('(max-width: 699px)');
  query?.addEventListener?.('change', notify);
  return () => query?.removeEventListener?.('change', notify);
};
const isPhone = () => window.matchMedia?.('(max-width: 699px)').matches ?? false;

export interface IntakeFormProps {
  purpose: Purpose | null;
  /** The sub-form answers, per purpose, so switching back and forth keeps what was typed. */
  details: Partial<Record<Purpose, Record<string, string>>>;
  description: string;
  disabled?: boolean;
  recent: RecentAnswer[];
  /** Small status under the description ("Saving", "Saved", a retry). */
  status?: React.ReactNode;
  /** The form sits in a dialog (editing after Continue): roomier description box. */
  inDialog?: boolean;
  onPurpose: (purpose: Purpose) => void;
  onDetail: (key: string, value: string) => void;
  onDescription: (value: string) => void;
  onDescriptionBlur: () => void;
  /** Applies a "Recent" answer: the purpose and its details, never the description. */
  onUseRecent: (answer: RecentAnswer) => void;
}

/**
 * The intake (P-200, C3.1 with the "Recent" pill): Startup / venture on its own featured row
 * ("No usage limits"), Class, Club or student team, Research and Personal as tiles, the one extra
 * field the purpose needs, and the student's own words. Nothing is ever filled in for the student:
 * past answers wait in the "Recent" pill and under each field.
 */
export function IntakeForm({
  purpose,
  details,
  description,
  disabled,
  recent,
  status,
  inDialog,
  onPurpose,
  onDetail,
  onDescription,
  onDescriptionBlur,
  onUseRecent,
}: IntakeFormProps) {
  const labelId = useId();
  const option = optionFor(purpose);
  const venture = PURPOSES[0];
  const others = PURPOSES.slice(1);

  return (
    <div className="sf-form">
      <div>
        <div className="sf-lh">
          <label id={labelId} className="sf-l">
            What is this print for?
          </label>
          {recent.length > 0 && (
            <RecentPill recent={recent} disabled={disabled} onPick={onUseRecent} />
          )}
        </div>
        <div role="radiogroup" aria-labelledby={labelId} className="sf-pick">
          <button
            type="button"
            role="radio"
            aria-checked={purpose === venture.value}
            disabled={disabled}
            className={`sf-featb${purpose === venture.value ? 'on' : ''}`}
            data-track="purpose"
            onClick={() => onPurpose(venture.value)}
          >
            <span className="sf-rd" aria-hidden="true" />
            <span>
              <b>{venture.label}</b>
              <small>{venture.hint}</small>
            </span>
            {venture.tag && <span className="sf-tag">{venture.tag}</span>}
          </button>
          <div className="sf-g4">
            {others.map((item) => (
              <button
                type="button"
                key={item.value}
                role="radio"
                aria-checked={purpose === item.value}
                disabled={disabled}
                className={`sf-tile${purpose === item.value ? 'on' : ''}`}
                data-track="purpose"
                onClick={() => onPurpose(item.value)}
              >
                <b>{item.label}</b>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      {option?.note && <p className="sf-vnote">{option.note}</p>}

      {option?.fields.map((field) => (
        <div className="sf-cx" key={`${option.value}-${field.key}`}>
          <label className="sf-l" htmlFor={`sf-${field.key}`}>
            {field.label}
          </label>
          <HistoryInput
            id={`sf-${field.key}`}
            fieldKey={field.key}
            value={details[option.value]?.[field.key] ?? ''}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(value) => onDetail(field.key, value)}
          />
          <p className="sf-cnote">
            Pick a past answer or type a new one. We never fill this in for you.
          </p>
        </div>
      ))}

      <DescriptionBox
        option={option}
        value={description}
        disabled={disabled}
        inDialog={inDialog}
        status={status}
        onChange={onDescription}
        onBlur={onDescriptionBlur}
      />
    </div>
  );
}

function DescriptionBox({
  option,
  value,
  disabled,
  inDialog,
  status,
  onChange,
  onBlur,
}: {
  option: PurposeOption | undefined;
  value: string;
  disabled?: boolean;
  inDialog?: boolean;
  status?: React.ReactNode;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const inner = useRef<HTMLTextAreaElement>(null);
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  // Grows with the text up to a limit; the form fits the screen, so the box never takes over.
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    const limit = phone && !inDialog ? 84 : 190;
    const least = phone ? 48 : 92;
    el.style.height = `${Math.min(limit, Math.max(least, el.scrollHeight + 2))}px`;
  }, [value, phone, inDialog]);
  const example = option?.descriptionExample ?? NO_PURPOSE_EXAMPLE;
  const shortExample = phone ? example.split('. ')[0].replace(/\.$/, '') + '.' : example;
  return (
    <div className="sf-cd0">
      <label className="sf-l" htmlFor="sf-description">
        Tell us about it
      </label>
      <textarea
        id="sf-description"
        ref={inner}
        value={value}
        maxLength={MAX_DESCRIPTION}
        disabled={disabled}
        placeholder={shortExample}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <div className="sf-cnt-row">
        <span role="status" className="sf-save">
          {status}
        </span>
        <span>
          {value.length}/{MAX_DESCRIPTION}
        </span>
      </div>
    </div>
  );
}

/** A text field that lists the student's past answers on focus. Choosing one fills it; nothing is filled before. */
function HistoryInput({
  id,
  fieldKey,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  fieldKey: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [past, setPast] = useState<string[]>([]);
  return (
    <div className="sf-hist">
      <input
        id={id}
        name={`x-${fieldKey}-nofill`}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={80}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          setPast(loadFieldHistory(fieldKey));
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => onChange(event.target.value)}
      />
      {open && past.length > 0 && (
        <ul role="listbox" aria-label="Your past answers">
          <li className="sf-h" role="presentation">
            Your past answers
          </li>
          {past.map((item) => (
            <li
              key={item}
              role="option"
              aria-selected={item === value}
              // mousedown, not click: the input would lose focus (and close the list) first
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(item);
                setOpen(false);
              }}
            >
              {item}
              {item === value && <Check className="size-4" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Recent": the last few distinct answers; tapping one fills the purpose and the name. */
function RecentPill({
  recent,
  disabled,
  onPick,
}: {
  recent: RecentAnswer[];
  disabled?: boolean;
  onPick: (answer: RecentAnswer) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <span className="sf-rcw" ref={wrap}>
      <button
        type="button"
        className="sf-rcb"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Clock aria-hidden="true" />
        Recent
        <ChevronDown className="sf-chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="sf-rcm" role="menu">
          <div className="sf-rch">Recent answers</div>
          {recent.map((answer) => {
            const text = describeRecent(answer);
            return (
              <button
                type="button"
                role="menuitem"
                key={`${answer.purpose}:${text.detail}`}
                onClick={() => {
                  onPick(answer);
                  setOpen(false);
                }}
              >
                <span className="sf-rm-p">{text.purpose}</span>
                {text.detail && (
                  <>
                    <span className="sf-rm-d">&middot;</span>
                    <b>{text.detail}</b>
                  </>
                )}
              </button>
            );
          })}
          <div className="sf-rcf">Nothing is filled until you tap one.</div>
        </div>
      )}
    </span>
  );
}
