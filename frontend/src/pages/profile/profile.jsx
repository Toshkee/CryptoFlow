// src/pages/profile/profile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiGet, apiPost, apiUpload } from "../../services/api";
import { useAuth } from "../../authContext";

import { alertSuccess, alertError } from "../../utils/alert";
import "./profile.css";

export default function Profile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [picMode, setPicMode] = useState(false);

  const [form, setForm] = useState({ username: "", email: "" });
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "" });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user]);

  useEffect(() => {
    apiGet("/accounts/me/").then((res) => {
      if (!res.error) {
        setProfile(res);
        setForm({ username: res.username, email: res.email });
      }
    });
  }, []);

  const updateProfile = async () => {
    const res = await apiPost("/accounts/profile/update/", form);
    if (res.error) return alertError("Update failed", res.error);

    await alertSuccess("Profile updated!");

    const fresh = await apiGet("/accounts/me/");
    login(fresh, localStorage.getItem("access"), localStorage.getItem("refresh"));

    setProfile(fresh);
    setEditMode(false);
  };

  const changePassword = async () => {
    const res = await apiPost("/accounts/change-password/", pwForm);
    if (res.error) return alertError("Password error", res.error);

    await alertSuccess("Password updated!");
    setPwMode(false);
    setPwForm({ old_password: "", new_password: "" });
  };

  const uploadPicture = async () => {
    if (!image) return alertError("No image selected");

    const fd = new FormData();
    fd.append("image", image);

    const res = await apiUpload("/accounts/upload-picture/", fd);
    if (res.error) return alertError("Upload failed", res.error);

    await alertSuccess("Profile picture updated!");

    const fresh = await apiGet("/accounts/me/");
    login(fresh, localStorage.getItem("access"), localStorage.getItem("refresh"));

    setProfile(fresh);

    setPicMode(false);
    setImage(null);
    setPreview(null);
  };

  if (!profile) return <div className="profile-page">Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-box fadein">

        <h1>Profile</h1>
        <p className="profile-subtitle">Manage your CryptoFlow account.</p>

        <div className="profile-avatar-box">
          <img
            src={profile.profile_picture || "/default-avatar.png"}
            className="profile-avatar"
            alt="avatar"
          />
          {!picMode && (
            <button className="profile-btn" onClick={() => setPicMode(true)}>
              Change Picture
            </button>
          )}
        </div>

        {!editMode && !pwMode && !picMode && (
          <>
            <div className="profile-field">
              <strong>Username:</strong> {profile.username}
            </div>

            <div className="profile-field">
              <strong>Email:</strong> {profile.email}
            </div>

            <div className="profile-buttons">
              <button className="profile-btn" onClick={() => setEditMode(true)}>
                Edit Profile
              </button>

              <button className="profile-btn" onClick={() => setPwMode(true)}>
                Change Password
              </button>

              <button className="profile-btn logout" onClick={logout}>
                Logout
              </button>
            </div>
          </>
        )}

        {editMode && (
          <div className="edit-box">
            <input
              className="profile-input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />

            <input
              className="profile-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <button className="profile-btn" onClick={updateProfile}>
              Save
            </button>
            <button className="profile-btn cancel" onClick={() => setEditMode(false)}>
              Cancel
            </button>
          </div>
        )}

        {pwMode && (
          <div className="edit-box">
            <input
              type="password"
              className="profile-input"
              placeholder="Old Password"
              onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
            />

            <input
              type="password"
              className="profile-input"
              placeholder="New Password"
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
            />

            <button className="profile-btn" onClick={changePassword}>
              Update Password
            </button>
            <button className="profile-btn cancel" onClick={() => setPwMode(false)}>
              Cancel
            </button>
          </div>
        )}

        {picMode && (
          <div className="edit-box">
            <input
              type="file"
              className="profile-input"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setImage(file);
                setPreview(URL.createObjectURL(file));
              }}
            />

            {preview && (
              <img src={preview} className="profile-avatar preview" alt="preview" />
            )}

            <button className="profile-btn" onClick={uploadPicture}>
              Upload
            </button>
            <button className="profile-btn cancel" onClick={() => setPicMode(false)}>
              Cancel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}