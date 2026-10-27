import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { userAPI } from "../services/api";
import { Card, Button, Input, LoadingSpinner } from "../components/ui";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
  FaSave,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Profile Details State
  const [profileData, setProfileData] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ")[1] || "",
    email: user?.email || "",
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullName =
        `${profileData.firstName} ${profileData.lastName}`.trim();

      const response = await userAPI.updateProfile({
        name: fullName,
        email: profileData.email,
      });

      if (response.data.success) {
        updateUser({ ...user, name: fullName, email: profileData.email });
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        toast.success("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950/50 dark:to-gray-900 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            My Profile
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex space-x-2 md:space-x-4 mb-6"
        >
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-2 px-4 md:py-3 md:px-6 text-sm md:text-base rounded-xl font-semibold transition-all duration-300 ${
              activeTab === "details"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <FaUser className="inline-block mr-2" />
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 py-2 px-4 md:py-3 md:px-6 text-sm md:text-base rounded-xl font-semibold transition-all duration-300 ${
              activeTab === "security"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <FaShieldAlt className="inline-block mr-2" />
            Security
          </button>
        </motion.div>

        {/* Profile Details Tab */}
        {activeTab === "details" && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="relative p-3 md:p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl">

              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <FaUser className="mr-3 text-blue-600" />
                Profile Information
              </h2>

              <form onSubmit={handleProfileSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <Input
                    name="firstName"
                    label="First Name"
                    placeholder="Enter your first name"
                    icon={FaUser}
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    required
                  />

                  <Input
                    name="lastName"
                    label="Last Name"
                    placeholder="Enter your last name"
                    icon={FaUser}
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <Input
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  icon={FaEnvelope}
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                />

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 pt-4">
                  <p className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
                    Trusted Traveler
                  </p>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    loading={isLoading}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                  >
                    <FaSave className="mr-2" />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-3 md:p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <FaLock className="mr-3 text-blue-600" />
                Change Password
              </h2>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 md:space-y-6">
                <Input
                  name="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  label="Current Password"
                  placeholder="Enter your current password"
                  icon={FaLock}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("current")}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  }
                />

                <Input
                  name="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  label="New Password"
                  placeholder="Enter your new password"
                  icon={FaLock}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("new")}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  }
                />

                <Input
                  name="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  label="Confirm New Password"
                  placeholder="Confirm your new password"
                  icon={FaLock}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("confirm")}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  }
                />

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    loading={isLoading}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                  >
                    <FaShieldAlt className="mr-2" />
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Password Requirements:
                  </h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Must include Uppercase, Lowercase, and Number</li>
                    <li>• Must include a Special Character (@$!%*?&)</li>
                  </ul>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
