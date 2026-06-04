import React, { createContext, useContext, useState, useEffect } from 'react';
import Login from './auth/Login';
import SignUp from './auth/SignUp';
import authService from './services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const openLogin = () => {
    setIsLoginModalOpen(true);
    setIsRegisterModalOpen(false);
  };

  const openRegister = () => {
    setIsRegisterModalOpen(true);
    setIsLoginModalOpen(false);
  };

  const closeModals = () => {
    setIsLoginModalOpen(false);
    setIsRegisterModalOpen(false);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      const userData = {
        ...data.user,
        ...data.profile,
        profilePic: data.profile?.profilePic?.url || "",
        coverPic: data.profile?.coverPic?.url || "",
        headline: data.profile?.headline || "",
        education: data.profile?.education || "",
        itSkills: data.profile?.itSkills || "",
        projectTitle: data.profile?.projectTitle || "",
        projectLink: data.profile?.projectLink || "",
        projectDescription: data.profile?.projectDescription || "",
        profileCompletion: data.profile?.profileCompletion || 0,
      };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", data.token);
      closeModals();
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, message: error.message || "Invalid credentials" };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await authService.register(userData);
      const userObj = {
        ...data.user,
        ...data.profile,
        profilePic: data.profile?.profilePic?.url || "",
        coverPic: data.profile?.coverPic?.url || "",
        headline: data.profile?.headline || "",
        education: data.profile?.education || "",
        itSkills: data.profile?.itSkills || "",
        projectTitle: data.profile?.projectTitle || "",
        projectLink: data.profile?.projectLink || "",
        projectDescription: data.profile?.projectDescription || "",
        profileCompletion: data.profile?.profileCompletion || 0,
      };
      setUser(userObj);
      localStorage.setItem("user", JSON.stringify(userObj));
      localStorage.setItem("token", data.token);
      closeModals();
      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      return { success: false, message: error.message || "Registration failed" };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("dailyQuizShown");
  };

  const updateUser = (updates) => {
    if(user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      if (response.success) {
        const updatedProfile = response.data;
        const profilePicUrl = typeof updatedProfile.profilePic === "string"
          ? updatedProfile.profilePic
          : updatedProfile.profilePic?.url || user?.profilePic || "";
        const coverPicUrl = typeof updatedProfile.coverPic === "string"
          ? updatedProfile.coverPic
          : updatedProfile.coverPic?.url || user?.coverPic || "";

        // Update local user with new profile info
        updateUser({
          ...profileData,
          ...updatedProfile,
          headline: updatedProfile.headline || "",
          summary: updatedProfile.summary || "",
          currentTitle: updatedProfile.currentTitle || "",
          currentCompany: updatedProfile.currentCompany || "",
          totalExperience: updatedProfile.totalExperience || "",
          noticePeriod: updatedProfile.noticePeriod || "",
          currentCity: updatedProfile.currentCity || "",
          phone: updatedProfile.phone || "",
          skills: updatedProfile.skills || [],
          education: updatedProfile.education || "",
          itSkills: updatedProfile.itSkills || "",
          projectTitle: updatedProfile.projectTitle || "",
          projectLink: updatedProfile.projectLink || "",
          projectDescription: updatedProfile.projectDescription || "",
          expectedSalary: updatedProfile.expectedSalary || "",
          preferredLocations: updatedProfile.preferredLocations || [],
          profilePic: profilePicUrl,
          coverPic: coverPicUrl,
          profileCompletion: updatedProfile.profileCompletion ?? user?.profileCompletion ?? 0,
        });
        return { success: true, profile: updatedProfile };
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      return { success: false, message: error.message || "Failed to update profile" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, updateProfile, openLogin, openRegister, closeModals, loading }}>
      {children}
      {isLoginModalOpen && <Login isOpen={isLoginModalOpen} onClose={closeModals} openSignUp={openRegister} />}
      {isRegisterModalOpen && <SignUp isOpen={isRegisterModalOpen} onClose={closeModals} openLogin={openLogin} />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
