"use client";

import {
  BriefcaseBusiness,
  Camera,
  CircleCheck,
  Link2,
  Plus,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitConnectorProfile } from "@/app/create-profile/actions";
import type { ProfileFormState } from "@/app/create-profile/actions";
import { AppHeader } from "@/components/app-header";
import { ProfileAvatar, profileAvatarOptions } from "@/components/profile-avatar";
import type { AvatarKey } from "@/lib/connectors/types";

const helperTopics = {
  living: ["Housing", "Renting", "Buying a home", "Utilities", "Neighborhood recommendations"],
  family: ["Schools", "Childcare", "Youth programs", "College preparation"],
  career: ["Job search", "Entrepreneurship", "Small business resources", "Networking", "Workforce development"],
  community: ["Faith communities", "Arts & culture", "Recreation", "Volunteer opportunities", "Community organizations"],
  navigation: ["Transportation", "City services", "Permits", "Taxes", "Public safety"],
};

const topicGroups = [
  { id: "living", label: "Living in Detroit", topics: helperTopics.living },
  { id: "family", label: "Family & education", topics: helperTopics.family },
  { id: "career", label: "Career & business", topics: helperTopics.career },
  { id: "community", label: "Community life", topics: helperTopics.community },
  { id: "navigation", label: "City navigation", topics: helperTopics.navigation },
];

const skills = ["Marketing", "Construction", "Education", "Technology", "Real estate", "Finance", "Healthcare", "Legal"];
const availability = ["Messages", "Calls", "Coffee chats", "Mentoring", "Not currently available"];
const acceptedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const maxProfilePhotoBytes = 5 * 1024 * 1024;
const initialProfileFormState: ProfileFormState = {
  message: "",
  fieldErrors: {},
};

type AffiliationRow = {
  id: number;
  name: string;
  url: string;
  status: "idle" | "loading" | "resolved" | "unresolved";
};

type FieldErrorProps = {
  errors: Record<string, string[] | undefined>;
  name: string;
};

function FieldError({ errors, name }: FieldErrorProps) {
  const message = errors[name]?.[0];
  return message ? <small className="field-error" role="alert">{message}</small> : null;
}

function RequiredMarker() {
  return <b aria-hidden="true" className="required-marker">*</b>;
}

function SubmitProfileButton() {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" disabled={pending} type="submit">
      {pending ? "Creating profile..." : "Create profile"}
    </button>
  );
}

export default function CreateProfilePage() {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>("tire");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [profileType, setProfileType] = useState<"User" | "Organization">("User");
  const [affiliationRows, setAffiliationRows] = useState<AffiliationRow[]>([
    { id: 0, name: "", url: "", status: "idle" },
  ]);
  const [nextAffiliationId, setNextAffiliationId] = useState(1);
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [skillError, setSkillError] = useState("");
  const [formState, formAction] = useActionState(submitConnectorProfile, initialProfileFormState);
  const personNamePattern = "[\\p{L}' -]{2,50}";

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  function clearProfilePhoto() {
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
    setPhotoPreview("");
    setPhotoName("");
    setPhotoError("");
  }

  function handleProfilePhoto(file?: File) {
    if (!file) {
      clearProfilePhoto();
      return;
    }

    if (!acceptedPhotoTypes.includes(file.type)) {
      clearProfilePhoto();
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > maxProfilePhotoBytes) {
      clearProfilePhoto();
      setPhotoError("Choose an image smaller than 5 MB.");
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoName(file.name);
    setPhotoError("");
  }

  function chooseDefaultAvatar(avatar: AvatarKey) {
    clearProfilePhoto();
    setSelectedAvatar(avatar);
  }

  function addAffiliation() {
    setAffiliationRows((rows) => [
      ...rows,
      { id: nextAffiliationId, name: "", url: "", status: "idle" },
    ]);
    setNextAffiliationId((value) => value + 1);
  }

  function removeAffiliation(id: number) {
    setAffiliationRows((rows) => rows.filter((row) => row.id !== id));
  }

  function updateAffiliation(id: number, update: Partial<AffiliationRow>) {
    setAffiliationRows((rows) =>
      rows.map((row) => row.id === id ? { ...row, ...update } : row),
    );
  }

  async function autofillAffiliation(id: number) {
    const row = affiliationRows.find((item) => item.id === id);
    if (!row?.url.trim() || row.name.trim()) {
      return;
    }

    try {
      const url = new URL(row.url);
      if (!["http:", "https:"].includes(url.protocol)) {
        return;
      }
    } catch {
      return;
    }

    updateAffiliation(id, { status: "loading" });
    try {
      const response = await fetch(`/api/website-metadata?url=${encodeURIComponent(row.url)}`);
      const payload = await response.json() as { name?: string };
      const resolvedName = payload.name?.trim() ?? "";
      setAffiliationRows((rows) =>
        rows.map((current) =>
          current.id === id
            ? {
                ...current,
                name: current.name.trim() ? current.name : resolvedName,
                status: resolvedName ? "resolved" : "unresolved",
              }
            : current,
        ),
      );
    } catch {
      updateAffiliation(id, { status: "unresolved" });
    }
  }

  function addCustomSkill() {
    const skill = skillDraft.trim().replace(/\s+/g, " ");
    if (skill.length < 2) {
      setSkillError("Enter at least two characters.");
      return;
    }
    if (skill.length > 80) {
      setSkillError("Keep skill tags under 80 characters.");
      return;
    }
    if (
      [...skills, ...customSkills].some(
        (existing) => existing.toLocaleLowerCase() === skill.toLocaleLowerCase(),
      )
    ) {
      setSkillError("That skill is already listed.");
      return;
    }
    if (customSkills.length >= 12) {
      setSkillError("You can add up to 12 custom skills.");
      return;
    }

    setCustomSkills((items) => [...items, skill]);
    setSkillDraft("");
    setSkillError("");
  }

  function removeCustomSkill(skill: string) {
    setCustomSkills((items) => items.filter((item) => item !== skill));
  }

  return (
    <main className="page-shell create-profile-shell">
      <AppHeader />

      <header className="profile-builder-heading">
        <h1>Create profile</h1>
      </header>

      <form
        action={formAction}
        aria-label="Create Detroit Connect profile"
        className="profile-form profile-builder-form"
      >
        <input name="avatarKey" type="hidden" value={selectedAvatar} />

        <div className="profile-builder-layout">
          <aside className="profile-setup-panel">
            <div className="profile-photo-orbit" aria-label="Profile photo preview">
              <div className={`profile-photo-circle${photoPreview ? " has-upload" : ""}`}>
                {photoPreview ? (
                  <span
                    aria-label="Selected profile photo preview"
                    className="profile-photo-upload-preview"
                    role="img"
                    style={{ backgroundImage: `url(${photoPreview})` }}
                  />
                ) : (
                  <ProfileAvatar avatar={selectedAvatar} />
                )}
              </div>
              <div className="profile-photo-upload">
                <label className="profile-photo-upload-button">
                  <Upload aria-hidden="true" size={15} />
                  <span>{photoPreview ? "Change photo" : "Upload photo"}</span>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    aria-describedby="profile-photo-help profile-photo-error"
                    name="profilePhoto"
                    onChange={(event) => handleProfilePhoto(event.currentTarget.files?.[0])}
                    ref={photoInputRef}
                    type="file"
                  />
                </label>
                {photoPreview ? (
                  <button
                    aria-label="Remove uploaded profile photo"
                    className="profile-photo-remove"
                    onClick={clearProfilePhoto}
                    title="Remove photo"
                    type="button"
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                ) : null}
              </div>
              <small className="profile-photo-help" id="profile-photo-help">
                <Camera aria-hidden="true" size={12} />
                JPG, PNG or WebP · max 5 MB
              </small>
              {photoName ? <small className="profile-photo-name">{photoName}</small> : null}
              {photoError || formState.fieldErrors.profilePhoto?.[0] ? (
                <small className="field-error profile-photo-error" id="profile-photo-error" role="alert">
                  {photoError || formState.fieldErrors.profilePhoto?.[0]}
                </small>
              ) : null}
              <span className="avatar-choice-label">Or choose an avatar</span>
              <div className="avatar-options" aria-label="Default profile picture options">
                {profileAvatarOptions.map((avatar) => (
                  <button
                    aria-label={avatar.label}
                    aria-pressed={selectedAvatar === avatar.id}
                    className={selectedAvatar === avatar.id ? "is-selected" : ""}
                    key={avatar.id}
                    onClick={() => chooseDefaultAvatar(avatar.id)}
                    type="button"
                  >
                    <ProfileAvatar avatar={avatar.id} />
                  </button>
                ))}
              </div>
            </div>

            <fieldset className="profile-type-selector">
              <legend>Profile type <RequiredMarker /></legend>
              <label className={profileType === "User" ? "is-selected" : ""}>
                <input
                  checked={profileType === "User"}
                  name="profileType"
                  onChange={() => setProfileType("User")}
                  required
                  type="radio"
                  value="User"
                />
                <UserRound aria-hidden="true" size={16} />
                <span>User</span>
              </label>
              <label className={profileType === "Organization" ? "is-selected" : ""}>
                <input
                  checked={profileType === "Organization"}
                  name="profileType"
                  onChange={() => setProfileType("Organization")}
                  required
                  type="radio"
                  value="Organization"
                />
                <BriefcaseBusiness aria-hidden="true" size={16} />
                <span>Organization</span>
              </label>
            </fieldset>

            <nav className="profile-section-nav" aria-label="Profile sections">
              <a href="#profile-basics"><span>1</span>Basics</a>
              <a href="#profile-help"><span>2</span>Help topics</a>
              <a href="#profile-background"><span>3</span>Background</a>
              <a href="#profile-availability"><span>4</span>Availability</a>
            </nav>
          </aside>

          <div className="profile-form-column">
            {formState.message ? (
              <div className="profile-form-notice" role="alert">{formState.message}</div>
            ) : null}

            <section className="form-section identity-section" id="profile-basics">
              <div className="section-intro">
                <span className="step">01</span>
                <div>
                  <h2>Basics</h2>
                  <p>The details people use to recognize and contact you.</p>
                </div>
              </div>

              <div className="field-grid two">
                {profileType === "Organization" ? (
                  <label className="wide-field">
                    <span>Organization name <RequiredMarker /></span>
                    <input
                      aria-invalid={Boolean(formState.fieldErrors.organizationName)}
                      maxLength={100}
                      minLength={2}
                      name="organizationName"
                      placeholder="Detroit Neighborhood Alliance"
                      required
                      type="text"
                    />
                    <FieldError errors={formState.fieldErrors} name="organizationName" />
                  </label>
                ) : (
                  <>
                    <label>
                      <span>First name <RequiredMarker /></span>
                      <input
                        aria-invalid={Boolean(formState.fieldErrors.firstName)}
                        maxLength={50}
                        minLength={2}
                        name="firstName"
                        pattern={personNamePattern}
                        placeholder="Maria"
                        required
                        title="Use letters, spaces, apostrophes, or hyphens."
                        type="text"
                      />
                      <FieldError errors={formState.fieldErrors} name="firstName" />
                    </label>
                    <label>
                      <span>Last name <RequiredMarker /></span>
                      <input
                        aria-invalid={Boolean(formState.fieldErrors.lastName)}
                        maxLength={50}
                        minLength={2}
                        name="lastName"
                        pattern={personNamePattern}
                        placeholder="Rodriguez"
                        required
                        title="Use letters, spaces, apostrophes, or hyphens."
                        type="text"
                      />
                      <FieldError errors={formState.fieldErrors} name="lastName" />
                    </label>
                  </>
                )}

                <label>
                  <span>Neighborhood <RequiredMarker /></span>
                  <input
                    aria-invalid={Boolean(formState.fieldErrors.neighborhood)}
                    maxLength={80}
                    minLength={2}
                    name="neighborhood"
                    placeholder="Southwest Detroit"
                    required
                    type="text"
                  />
                  <FieldError errors={formState.fieldErrors} name="neighborhood" />
                </label>
                <label>
                  <span>ZIP code</span>
                  <input
                    aria-invalid={Boolean(formState.fieldErrors.zipCode)}
                    inputMode="numeric"
                    maxLength={5}
                    name="zipCode"
                    pattern="48[0-9]{3}"
                    placeholder="48216"
                    title="Enter a five-digit Detroit ZIP code beginning with 48."
                    type="text"
                  />
                  <FieldError errors={formState.fieldErrors} name="zipCode" />
                </label>
                <label>
                  <span>Email <RequiredMarker /></span>
                  <input
                    aria-invalid={Boolean(formState.fieldErrors.email)}
                    autoComplete="email"
                    maxLength={254}
                    name="email"
                    placeholder="maria@example.com"
                    required
                    type="email"
                  />
                  <FieldError errors={formState.fieldErrors} name="email" />
                </label>
                <label>
                  <span>Phone number <em>optional</em></span>
                  <input
                    aria-invalid={Boolean(formState.fieldErrors.phone)}
                    autoComplete="tel"
                    maxLength={20}
                    name="phone"
                    pattern="\\+?[0-9() .-]{7,20}"
                    placeholder="(313) 555-0148"
                    title="Enter a valid phone number."
                    type="tel"
                  />
                  <FieldError errors={formState.fieldErrors} name="phone" />
                </label>
                <label>
                  <span>Detroit connection</span>
                  <select defaultValue="Current resident" name="detroitConnection">
                    <option>Current resident</option>
                    <option>Moving to Detroit</option>
                    <option>Former resident</option>
                    <option>Supporter / partner</option>
                  </select>
                </label>
                <label>
                  <span>Here to</span>
                  <select defaultValue="Help others" name="hereTo">
                    <option>Help others</option>
                    <option>Find help</option>
                    <option>Both</option>
                  </select>
                </label>
                <label>
                  <span>Preferred contact</span>
                  <select defaultValue="Platform messaging" name="preferredContact">
                    <option>Platform messaging</option>
                    <option>Email</option>
                    <option>Phone</option>
                  </select>
                </label>
                <label>
                  <span>Languages spoken</span>
                  <input
                    maxLength={160}
                    name="languages"
                    placeholder="English, Spanish"
                    type="text"
                  />
                </label>
                <label className="wide-field">
                  <span>Neighborhood expertise</span>
                  <input
                    maxLength={200}
                    name="neighborhoodExpertise"
                    placeholder="Southwest Detroit, Corktown, Midtown"
                    type="text"
                  />
                </label>
              </div>
            </section>

            <section className="form-section" id="profile-help">
              <div className="section-intro">
                <span className="step">02</span>
                <div>
                  <h2>Help topics</h2>
                  <p>Choose the areas people can contact you about.</p>
                </div>
              </div>

              <div className="topic-groups">
                {topicGroups.map((group, index) => (
                  <details className="topic-group" key={group.id} open={index === 0}>
                    <summary>
                      <span>{group.label}</span>
                      <Plus aria-hidden="true" size={16} />
                    </summary>
                    <fieldset>
                      <legend className="sr-only">{group.label}</legend>
                      {group.topics.map((topic) => (
                        <label key={topic}>
                          <input name="topics" type="checkbox" value={topic} />
                          <span>{topic}</span>
                        </label>
                      ))}
                    </fieldset>
                  </details>
                ))}
                <label className="other-field">
                  <span>Other help topic</span>
                  <input maxLength={60} name="otherTopic" placeholder="Add another topic" type="text" />
                </label>
              </div>
            </section>

            <section className="form-section" id="profile-background">
              <div className="section-intro">
                <span className="step">03</span>
                <div>
                  <h2>Background</h2>
                  <p>Add context that helps people understand your experience.</p>
                </div>
              </div>

              <div className="field-grid two">
                {profileType === "User" ? (
                  <label>
                    <span>Current employer</span>
                    <input maxLength={100} name="currentEmployer" placeholder="Detroit nonprofit or company" type="text" />
                  </label>
                ) : null}
                <label>
                  <span>{profileType === "Organization" ? "Primary focus" : "Industry"}</span>
                  <input
                    maxLength={100}
                    name="industry"
                    placeholder={profileType === "Organization" ? "Housing and neighborhood support" : "Community development"}
                    type="text"
                  />
                </label>
                <label>
                  <span>{profileType === "Organization" ? "Profile headline" : "Job title"}</span>
                  <input
                    maxLength={100}
                    name="jobTitle"
                    placeholder={profileType === "Organization" ? "Helping Detroit families find housing" : "Community Development Manager"}
                    type="text"
                  />
                </label>
                {profileType === "Organization" ? (
                  <label>
                    <span>Organization type</span>
                    <input maxLength={80} name="organizationType" placeholder="Nonprofit, business, school" type="text" />
                  </label>
                ) : null}
              </div>

              <fieldset className="tag-panel">
                <legend>Skills</legend>
                <div className="tag-list">
                  {skills.map((skill) => (
                    <label key={skill}>
                      <input name="skills" type="checkbox" value={skill} />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
                <div className="custom-skill-builder">
                  <label htmlFor="custom-skill-input"><span>Add a custom skill</span></label>
                  <span className="custom-skill-control">
                    <input
                      aria-describedby={skillError ? "custom-skill-error" : undefined}
                      aria-invalid={Boolean(skillError)}
                      id="custom-skill-input"
                      maxLength={80}
                      onChange={(event) => {
                        setSkillDraft(event.target.value);
                        if (skillError) {
                          setSkillError("");
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomSkill();
                        }
                      }}
                      placeholder="Type a skill"
                      type="text"
                      value={skillDraft}
                    />
                    <button aria-label="Add custom skill" onClick={addCustomSkill} type="button">
                      <Plus aria-hidden="true" size={16} />
                    </button>
                  </span>
                  {skillError ? (
                    <small className="field-error" id="custom-skill-error" role="alert">{skillError}</small>
                  ) : null}
                  {customSkills.length > 0 ? (
                    <div aria-label="Custom skills" className="custom-skill-tags">
                      {customSkills.map((skill) => (
                        <span key={skill}>
                          <input name="skills" type="hidden" value={skill} />
                          {skill}
                          <button
                            aria-label={`Remove ${skill}`}
                            onClick={() => removeCustomSkill(skill)}
                            title={`Remove ${skill}`}
                            type="button"
                          >
                            <X aria-hidden="true" size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </fieldset>

              <div className="affiliations-panel">
                <div className="affiliations-heading">
                  <div>
                    <h3>Affiliations</h3>
                    <p>Organizations, associations, schools, or community groups.</p>
                  </div>
                  <button onClick={addAffiliation} type="button">
                    <Plus aria-hidden="true" size={16} />
                    Add affiliation
                  </button>
                </div>
                <div className="affiliation-list">
                  {affiliationRows.map((row, index) => (
                    <div className="affiliation-row" key={row.id}>
                      <label>
                        <span>Affiliation name <em>optional</em></span>
                        <input
                          maxLength={100}
                          name="affiliationName"
                          onChange={(event) => updateAffiliation(row.id, {
                            name: event.target.value,
                            status: "idle",
                          })}
                          placeholder="Auto-filled from website"
                          type="text"
                          value={row.name}
                        />
                      </label>
                      <div className="affiliation-website-field">
                        <label>
                          <span>Website <em>optional</em></span>
                          <span className="url-input">
                            <Link2 aria-hidden="true" size={15} />
                            <input
                              aria-invalid={Boolean(formState.fieldErrors.affiliationUrls)}
                              maxLength={300}
                              name="affiliationUrl"
                              onBlur={() => autofillAffiliation(row.id)}
                              onChange={(event) => updateAffiliation(row.id, {
                                url: event.target.value,
                                status: "idle",
                              })}
                              pattern="https?://.+"
                              placeholder="https://example.org"
                              title="Enter a complete URL beginning with http:// or https://."
                              type="url"
                              value={row.url}
                            />
                          </span>
                        </label>
                        {row.status === "loading" ? (
                          <small aria-live="polite" className="affiliation-status">Finding website name...</small>
                        ) : null}
                        {row.status === "resolved" ? (
                          <small aria-live="polite" className="affiliation-status is-success">Name added from website.</small>
                        ) : null}
                        {row.status === "unresolved" ? (
                          <small aria-live="polite" className="affiliation-status">Add a name if the website was not recognized.</small>
                        ) : null}
                      </div>
                      {affiliationRows.length > 1 ? (
                        <button
                          aria-label={`Remove affiliation ${index + 1}`}
                          className="remove-affiliation"
                          onClick={() => removeAffiliation(row.id)}
                          title="Remove affiliation"
                          type="button"
                        >
                          <X aria-hidden="true" size={16} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <FieldError errors={formState.fieldErrors} name="affiliationNames" />
                <FieldError errors={formState.fieldErrors} name="affiliationUrls" />
              </div>
            </section>

            <section className="form-section final-section" id="profile-availability">
              <div className="section-intro">
                <span className="step">04</span>
                <div>
                  <h2>Availability</h2>
                  <p>Set expectations for how people can reach you.</p>
                </div>
              </div>

              <div className="availability-grid">
                <label>
                  <span>Years connected to Detroit</span>
                  <select defaultValue="New to Detroit" name="yearsConnected">
                    <option>New to Detroit</option>
                    <option>1–3 years</option>
                    <option>4–10 years</option>
                    <option>10+ years</option>
                    <option>Lifelong Detroiter</option>
                  </select>
                </label>

                <fieldset className="tag-panel">
                  <legend>Available for</legend>
                  <div className="tag-list">
                    {availability.map((item) => (
                      <label key={item}>
                        <input name="availability" type="checkbox" value={item} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>

            <div className="profile-submit-bar">
              <span><CircleCheck aria-hidden="true" size={16} /> Fields marked <b aria-hidden="true">*</b> are required.</span>
              <SubmitProfileButton />
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
