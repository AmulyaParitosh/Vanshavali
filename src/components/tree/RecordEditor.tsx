"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DraftPerson, Person, PersonEvent } from "../../types/person";
import AliasesInput from "../AliasesInput";
import SegmentedControl from "../SegmentedControl";
import EventsEditor from "../EventsEditor";
import CustomFieldsEditor from "../CustomFieldsEditor";
import ImageUpload from "../ImageUpload";
import { isDirty, type FieldChange } from "../../lib/writeState";
import { personChanges } from "../../lib/personChanges";

/**
 * The one person form (Spec 07 a9) — used in the record panel (edit in place) and,
 * later, on Account. Fields sit where the values were, in the fixed section order
 * (name + photo, identity, life, details). No autosave: the footer appears only
 * when something is dirty and Save is disabled until then (Spec 13 flow 1/2, a4).
 * A changed field's label carries a 6px dirty dot.
 */

interface RecordEditorProps {
  person: Person;
  onSave: (draft: DraftPerson) => void;
  onCancel: () => void;
  /** Reports the live draft + its pending changes up, so the panel can gate a
   * dirty close (the leaving guard) and offer Save-and-leave. */
  onDirtyChange?: (changes: FieldChange[], draft: DraftPerson) => void;
  /** True while a save is in flight (footer shows Saving…, fields lock). */
  saving?: boolean;
}

/** The flat, dirty-trackable identity fields (arrays are tracked by deep compare). */
function flatFields(p: DraftPerson): Record<string, string> {
  return { name: p.name.official_name ?? "", sex: p.sex ?? "" };
}

const RecordEditor: React.FC<RecordEditorProps> = ({
  person,
  onSave,
  onCancel,
  onDirtyChange,
  saving = false,
}) => {
  const [draft, setDraft] = useState<DraftPerson>(person);
  const patch = (next: Partial<DraftPerson>) => setDraft((d) => ({ ...d, ...next }));

  // Overall dirtiness drives the footer; flat-field diffs dot individual labels.
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(person), [draft, person]);

  // Report the pending changes up (for the leaving guard) without re-subscribing
  // to the parent's callback identity — a ref keeps it current.
  const changes = useMemo(() => personChanges(person, draft), [person, draft]);
  const reportRef = useRef(onDirtyChange);
  useEffect(() => {
    reportRef.current = onDirtyChange;
  }, [onDirtyChange]);
  useEffect(() => {
    reportRef.current?.(changes, draft);
    // draft is read fresh each run; the effect fires when the change set shifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changes]);
  const base = useMemo(() => flatFields(person), [person]);
  const now = flatFields(draft);
  const fieldDirty = (field: string) => isDirty({ v: base[field] ?? "" }, { v: now[field] ?? "" });

  const label = (text: string, field: string) => (
    <span className="field-label">
      {fieldDirty(field) && <span className="dirty-dot" aria-hidden="true" />}
      {text}
    </span>
  );

  return (
    <div className="record-editor">
      <div className="record-editor-body">
        <div className="record-editor-photo">
          <ImageUpload
            imageUrl={draft.image_url || ""}
            onImageChange={(image) =>
              patch({
                image_url: image.url,
                image_storage_path: image.path,
                image_thumb_url: image.thumbUrl,
                image_thumb_storage_path: image.thumbPath,
              })
            }
            onImageRemove={() =>
              patch({
                image_url: "",
                image_storage_path: "",
                image_thumb_url: "",
                image_thumb_storage_path: "",
              })
            }
            canEdit={!saving}
            {...(person.id ? { storagePath: `images/people/${person.id}` } : {})}
          />
        </div>

        <div className="form-group">
          {label("Name", "name")}
          <input
            className="input"
            value={draft.name.official_name ?? ""}
            onChange={(e) => patch({ name: { ...draft.name, official_name: e.target.value } })}
            disabled={saving}
            aria-label="Name"
          />
        </div>

        <div className="form-group">
          {label("Sex", "sex")}
          <SegmentedControl
            ariaLabel="Sex"
            options={[
              { value: "M", label: "Male" },
              { value: "F", label: "Female" },
            ]}
            value={draft.sex}
            onChange={(sex) => patch({ sex })}
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <span className="field-label">Also known as</span>
          <AliasesInput
            aliases={draft.name.aliases || []}
            onChange={(aliases) => patch({ name: { ...draft.name, aliases } })}
            canEdit={!saving}
          />
        </div>

        <div className="form-group">
          <span className="field-label">Life</span>
          <EventsEditor
            events={draft.events || []}
            onChange={(events: PersonEvent[]) => patch({ events })}
            canEdit={!saving}
          />
        </div>

        <div className="form-group">
          <span className="field-label">Details</span>
          <CustomFieldsEditor
            customFields={Object.entries(draft.custom_fields || {}).map(([key, value]) => ({
              key,
              value,
            }))}
            onChange={(fields) =>
              patch({
                custom_fields: Object.fromEntries(
                  fields.filter((f) => f.key).map((f) => [f.key, f.value])
                ),
              })
            }
            canEdit={!saving}
          />
        </div>
      </div>

      {/* Footer appears only when dirty; Save is disabled until then (Spec 13). */}
      {dirty && (
        <div className="panel-footer record-editor-foot">
          <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={saving}>
            Discard
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSave(draft)}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordEditor;
