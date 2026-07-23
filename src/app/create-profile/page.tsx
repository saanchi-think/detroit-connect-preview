"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProfileAvatar, profileAvatarOptions } from "@/components/profile-avatar";
import { submitConnectorProfile } from "@/app/create-profile/actions";
import type { AvatarKey } from "@/lib/connectors/types";

const helperTopics = {
  living: ["Housing", "Renting", "Buying a home", "Utilities", "Neighborhood recommendations"],
  family: ["Schools", "Childcare", "Youth programs", "College preparation"],
  career: ["Job search", "Entrepreneurship", "Small business resources", "Networking", "Workforce development"],
  community: ["Faith communities", "Arts & culture", "Recreation", "Volunteer opportunities", "Community organizations"],
  navigation: ["Transportation", "City services", "Permits", "Taxes", "Public safety"],
};

const skills = ["Marketing", "Construction", "Education", "Technology", "Real estate", "Finance", "Healthcare", "Legal"];
const availability = ["Messages", "Calls", "Coffee chats", "Mentoring", "Not currently available"];

export default function CreateProfilePage() {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>("tire");

  return (
    <main className="page-shell create-profile-shell">
      <AppHeader />

      <section className="profile-hero">
        <div>
          <h1>Create profile</h1>
        </div>
        <div className="profile-photo-orbit" aria-label="Profile photo preview">
          <div className="profile-photo-circle">
            <ProfileAvatar avatar={selectedAvatar} />
          </div>
          <div className="avatar-options" aria-label="Default profile picture options">
            {profileAvatarOptions.map((avatar) => (
              <button
                aria-label={avatar.label}
                aria-pressed={selectedAvatar === avatar.id}
                className={selectedAvatar === avatar.id ? "is-selected" : ""}
                key={avatar.id}
                type="button"
                onClick={() => setSelectedAvatar(avatar.id)}
              >
                <ProfileAvatar avatar={avatar.id} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <form className="profile-form" action={submitConnectorProfile} aria-label="Create Detroit Connect profile">
        <input name="avatarKey" type="hidden" value={selectedAvatar} />
        <section className="form-section identity-section">
          <div className="section-intro">
            <span className="step">01</span>
            <h2>Match Basics</h2>
          </div>
          <div className="field-grid two">
            <label>
              <span>Profile type</span>
              <select defaultValue="Individual helper" name="profileType">
                <option>Individual helper</option>
                <option>Vendor / service provider</option>
                <option>Community organization</option>
              </select>
            </label>
            <label>
              <span>Neighborhood</span>
              <input type="text" name="neighborhood" placeholder="Southwest Detroit" required />
            </label>
            <label>
              <span>ZIP code</span>
              <input type="text" name="zipCode" placeholder="48216" />
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
              <span>Neighborhood expertise</span>
              <input type="text" name="neighborhoodExpertise" placeholder="Southwest Detroit, Corktown, Midtown" />
            </label>
            <label>
              <span>Languages spoken</span>
              <input type="text" name="languages" placeholder="English, Spanish" />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-intro">
            <span className="step">02</span>
            <h2>Connection Areas</h2>
          </div>
          <div className="topic-groups">
            <fieldset>
              <legend>Living in Detroit</legend>
              {helperTopics.living.map((topic) => (
                <label key={topic}>
                  <input type="checkbox" name="topics" value={topic} /> {topic}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Family & Education</legend>
              {helperTopics.family.map((topic) => (
                <label key={topic}>
                  <input type="checkbox" name="topics" value={topic} /> {topic}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Career & Business</legend>
              {helperTopics.career.map((topic) => (
                <label key={topic}>
                  <input type="checkbox" name="topics" value={topic} /> {topic}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Community Life</legend>
              {helperTopics.community.map((topic) => (
                <label key={topic}>
                  <input type="checkbox" name="topics" value={topic} /> {topic}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>City Navigation</legend>
              {helperTopics.navigation.map((topic) => (
                <label key={topic}>
                  <input type="checkbox" name="topics" value={topic} /> {topic}
                </label>
              ))}
            </fieldset>
            <label className="other-field">
              <span>Other topic</span>
              <input type="text" name="otherTopic" placeholder="Add a topic" />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-intro">
            <span className="step">03</span>
            <h2>Identity</h2>
          </div>
          <div className="field-grid two">
            <label>
              <span>First name</span>
              <input type="text" name="firstName" placeholder="Maria" required />
            </label>
            <label>
              <span>Last name</span>
              <input type="text" name="lastName" placeholder="Rodriguez" required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" name="email" placeholder="maria@example.com" />
            </label>
            <label>
              <span>
                Phone number <em>optional</em>
              </span>
              <input type="tel" name="phone" placeholder="(313) 555-0148" />
            </label>
            <label>
              <span>Preferred contact</span>
              <select defaultValue="Email" name="preferredContact">
                <option>Email</option>
                <option>Phone</option>
                <option>Platform messaging</option>
              </select>
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-intro">
            <span className="step">04</span>
            <h2>Community Background</h2>
          </div>
          <div className="field-grid two">
            <label>
              <span>Current employer</span>
              <input type="text" name="currentEmployer" placeholder="Detroit nonprofit, startup, school..." />
            </label>
            <label>
              <span>Industry</span>
              <input type="text" name="industry" placeholder="Community development" />
            </label>
            <label>
              <span>Job title</span>
              <input type="text" name="jobTitle" placeholder="Community Development Manager" />
            </label>
            <label>
              <span>Organization type</span>
              <input type="text" name="organizationType" placeholder="Nonprofit, business, school..." />
            </label>
          </div>
          <div className="tag-panel">
            <span>Skills</span>
            <div className="tag-list">
              {skills.map((skill) => (
                <label key={skill}>
                  <input type="checkbox" name="skills" value={skill} /> {skill}
                </label>
              ))}
            </div>
          </div>
          <label className="wide-field">
            <span>Organizations & affiliations</span>
            <textarea
              name="organizations"
              placeholder="Neighborhood association, nonprofit, university alumni group, faith organization..."
            />
          </label>
        </section>

        <section className="form-section final-section">
          <div className="section-intro">
            <span className="step">05</span>
            <h2>Availability</h2>
          </div>
          <div className="field-grid two">
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
          </div>
          <div className="tag-panel">
            <span>Available for</span>
            <div className="tag-list">
              {availability.map((item) => (
                <label key={item}>
                  <input type="checkbox" name="availability" value={item} /> {item}
                </label>
              ))}
            </div>
          </div>
          <div className="action-row">
            <button className="primary-button" type="submit">
              Create profile
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
