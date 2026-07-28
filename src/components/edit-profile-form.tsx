"use client";

import { ArrowLeft, Camera, Save, Upload, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateProfileAction,
  type EditProfileFormState,
} from "@/app/profile/edit/actions";
import { AppHeader } from "@/components/app-header";
import { ConnectorAvatar } from "@/components/connector-avatar";
import { ProfileAvatar, profileAvatarOptions } from "@/components/profile-avatar";
import type { AvatarKey, ConnectorProfileModel } from "@/lib/connectors/types";

const initialState: EditProfileFormState = { message: "", fieldErrors: {} };
const availabilityOptions = ["Messages", "Calls", "Coffee chats", "Mentoring", "Not currently available"];
const acceptedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const maxPhotoBytes = 5 * 1024 * 1024;

function FieldError({
  errors,
  name,
}: {
  errors: Record<string, string[] | undefined>;
  name: string;
}) {
  const message = errors[name]?.[0];
  return message ? <small className="field-error" role="alert">{message}</small> : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" disabled={pending} type="submit">
      <Save aria-hidden="true" size={16} />
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

export function EditProfileForm({ profile }: { profile: ConnectorProfileModel }) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>(profile.avatarKey ?? "tire");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function clearPhoto() {
    if (photoInputRef.current) photoInputRef.current.value = "";
    setPhotoPreview("");
    setPhotoError("");
  }

  function choosePhoto(file?: File) {
    if (!file) {
      clearPhoto();
      return;
    }
    if (!acceptedPhotoTypes.includes(file.type)) {
      clearPhoto();
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > maxPhotoBytes) {
      clearPhoto();
      setPhotoError("Choose an image smaller than 5 MB.");
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError("");
  }

  return (
    <main className="page-shell edit-profile-page">
      <AppHeader />
      <Link className="edit-profile-back" href={`/connectors/${profile.id}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        Back to profile
      </Link>
      <header className="page-hero compact">
        <h1>Edit profile</h1>
      </header>

      <form action={formAction} className="edit-profile-form" aria-label="Edit your profile">
        <input name="profileId" type="hidden" value={profile.id} />
        <input name="avatarKey" type="hidden" value={selectedAvatar} />

        <aside className="edit-profile-photo-panel">
          <div className="edit-profile-avatar" aria-label="Current profile photo">
            {photoPreview ? (
              <span
                aria-label="Selected profile photo preview"
                className="edit-profile-photo-preview"
                role="img"
                style={{ backgroundImage: `url(${photoPreview})` }}
              />
            ) : profile.avatarUrl ? (
              <ConnectorAvatar
                avatarKey={selectedAvatar}
                avatarUrl={profile.avatarUrl}
                name={profile.name}
              />
            ) : (
              <ProfileAvatar avatar={selectedAvatar} />
            )}
          </div>
          <div className="edit-photo-actions">
            <label className="edit-photo-upload">
              <Upload aria-hidden="true" size={15} />
              <span>{photoPreview ? "Choose another photo" : "Upload new photo"}</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload new profile photo"
                name="profilePhoto"
                onChange={(event) => choosePhoto(event.currentTarget.files?.[0])}
                ref={photoInputRef}
                type="file"
              />
            </label>
            {photoPreview ? (
              <button aria-label="Remove selected photo" onClick={clearPhoto} type="button">
                <X aria-hidden="true" size={15} />
              </button>
            ) : null}
          </div>
          <small><Camera aria-hidden="true" size={12} /> JPG, PNG, or WebP. Maximum 5 MB.</small>
          {photoError ? <small className="field-error" role="alert">{photoError}</small> : null}
          <FieldError errors={state.fieldErrors} name="profilePhoto" />

          <div className="edit-avatar-options" aria-label="Default avatar options">
            {profileAvatarOptions.map((avatar) => (
              <button
                aria-label={`${avatar.label} avatar`}
                aria-pressed={selectedAvatar === avatar.id}
                className={selectedAvatar === avatar.id ? "is-selected" : ""}
                key={avatar.id}
                onClick={() => {
                  clearPhoto();
                  setSelectedAvatar(avatar.id);
                }}
                title={avatar.label}
                type="button"
              >
                <ProfileAvatar avatar={avatar.id} />
              </button>
            ))}
          </div>
        </aside>

        <div className="edit-profile-fields">
          {state.message ? (
            <div className="form-message is-error" role="alert">{state.message}</div>
          ) : null}

          <section>
            <div className="edit-section-heading">
              <span>1</span>
              <div><h2>Profile basics</h2><p>The information people scan first.</p></div>
            </div>
            <div className="edit-field-grid">
              <label>
                <span>Name <b aria-hidden="true">*</b></span>
                <input defaultValue={profile.name} maxLength={100} minLength={2} name="name" required />
                <FieldError errors={state.fieldErrors} name="name" />
              </label>
              <label>
                <span>Role or headline <b aria-hidden="true">*</b></span>
                <input defaultValue={profile.role} maxLength={120} minLength={2} name="headline" required />
                <FieldError errors={state.fieldErrors} name="headline" />
              </label>
              <label>
                <span>Neighborhood <b aria-hidden="true">*</b></span>
                <input defaultValue={profile.neighborhood} maxLength={80} minLength={2} name="neighborhood" required />
                <FieldError errors={state.fieldErrors} name="neighborhood" />
              </label>
              <label>
                <span>Detroit ZIP code</span>
                <input defaultValue={profile.zipCode ?? ""} inputMode="numeric" maxLength={5} name="zipCode" pattern="48[0-9]{3}" />
                <FieldError errors={state.fieldErrors} name="zipCode" />
              </label>
              <label className="is-wide">
                <span>About</span>
                <textarea defaultValue={profile.bio ?? ""} maxLength={1000} name="bio" rows={5} />
                <FieldError errors={state.fieldErrors} name="bio" />
              </label>
            </div>
          </section>

          <section>
            <div className="edit-section-heading">
              <span>2</span>
              <div><h2>Contact</h2><p>How people can reach you.</p></div>
            </div>
            <div className="edit-field-grid">
              <label>
                <span>Email <b aria-hidden="true">*</b></span>
                <input defaultValue={profile.email ?? ""} maxLength={254} name="email" required type="email" />
                <FieldError errors={state.fieldErrors} name="email" />
              </label>
              <label>
                <span>Phone</span>
                <input defaultValue={profile.phone ?? ""} maxLength={20} name="phone" type="tel" />
                <FieldError errors={state.fieldErrors} name="phone" />
              </label>
            </div>
          </section>

          <section>
            <div className="edit-section-heading">
              <span>3</span>
              <div><h2>Expertise</h2><p>Use commas to separate items.</p></div>
            </div>
            <div className="edit-field-grid">
              <label className="is-wide">
                <span>Help topics <b aria-hidden="true">*</b></span>
                <input defaultValue={profile.topics.join(", ")} maxLength={500} name="topics" required />
                <FieldError errors={state.fieldErrors} name="topics" />
              </label>
              <label className="is-wide">
                <span>Skills</span>
                <input defaultValue={profile.skills.join(", ")} maxLength={500} name="skills" />
                <FieldError errors={state.fieldErrors} name="skills" />
              </label>
              <label className="is-wide">
                <span>Languages</span>
                <input defaultValue={profile.languages.join(", ")} maxLength={200} name="languages" />
                <FieldError errors={state.fieldErrors} name="languages" />
              </label>
              <fieldset className="edit-availability">
                <legend>Available for</legend>
                {availabilityOptions.map((option) => (
                  <label key={option}>
                    <input
                      defaultChecked={profile.availability.includes(option)}
                      name="availability"
                      type="checkbox"
                      value={option}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          </section>

          <div className="edit-profile-submit">
            <Link href={`/connectors/${profile.id}`}>Cancel</Link>
            <SubmitButton />
          </div>
        </div>
      </form>
    </main>
  );
}
