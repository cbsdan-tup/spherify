import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errMsg, logout, succesMsg } from "../utils/helper";
import { clearTeamId, clearMsgGroupId } from "../redux/teamSlice";
import axios from "axios";
import moment from "moment";
import "../styles/Header.css";
import { setTeamId } from "../redux/teamSlice";

// Create SearchModal as a separate component outside the main component
const SearchModal = React.memo(
  ({
    onClose,
    modalSearchType,
    setModalSearchType,
    modalSearchTerm,
    setModalSearchTerm,
    isSearching,
    searchResults,
    setSearchResults, // Add this prop
    handleModalSearchChange,
    performModalSearch,
    handleUserClick,
    handleTeamClick,
    handleKeyPress,
  }) => (
    <div className="header-search-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="header-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="header-search-modal-header">
          <h2>Search {modalSearchType === "users" ? "Users" : "Teams"}</h2>
          <button className="close-button" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        <div className="header-search-modal-content">
          <div className="search-type-toggle">
            <button
              className={`search-type-btn ${
                modalSearchType === "users" ? "active" : ""
              }`}
              onClick={() => {
                // Only change if it's a different type to avoid unnecessary re-renders
                if (modalSearchType !== "users") {
                  // Clear results and search term when switching type
                  setSearchResults([]);
                  // Set the new search type
                  setModalSearchType("users");
                  // If there was a search term, perform search with new type
                  if (modalSearchTerm.trim()) {
                    // Use timeout to ensure state is updated
                    setTimeout(() => {
                      performModalSearch(modalSearchTerm, "users");
                    }, 50);
                  }
                }
              }}
            >
              <i className="fa-solid fa-user"></i> Users
            </button>
            <button
              className={`search-type-btn ${
                modalSearchType === "teams" ? "active" : ""
              }`}
              onClick={() => {
                // Only change if it's a different type to avoid unnecessary re-renders
                if (modalSearchType !== "teams") {
                  // Clear results and search term when switching type
                  setSearchResults([]);
                  // Set the new search type
                  setModalSearchType("teams");
                  // If there was a search term, perform search with new type
                  if (modalSearchTerm.trim()) {
                    // Use timeout to ensure state is updated
                    setTimeout(() => {
                      performModalSearch(modalSearchTerm, "teams");
                    }, 50);
                  }
                }
              }}
            >
              <i className="fa-solid fa-users"></i> Teams
            </button>
          </div>
          <div className="search-input-container">
            <input
              type="text"
              placeholder={`Search ${
                modalSearchType === "users" ? "users" : "teams"
              }...`}
              value={modalSearchTerm}
              onChange={handleModalSearchChange}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <button
              onClick={() => performModalSearch()}
              disabled={isSearching || !modalSearchTerm.trim()}
            >
              {isSearching ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-search"></i>
              )}
            </button>
          </div>
          <div className="search-results">
            {searchResults.length > 0 ? (
              <div className="results-list">
                {modalSearchType === "users"
                  ? // User results
                    searchResults.map((user) => (
                      <div
                        key={user._id}
                        className="result-item user-result"
                        onClick={() => handleUserClick(user._id)}
                      >
                        <img
                          src={user.avatar?.url || "/images/account.png"}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="result-avatar"
                        />
                        <div className="result-details">
                          <div className="result-name">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="result-email">{user.email}</div>
                        </div>
                      </div>
                    ))
                  : // Team results
                    searchResults.map((team) => (
                      <div
                        key={team._id}
                        className="result-item team-result"
                        onClick={() => handleTeamClick(team._id)}
                      >
                        <img
                          src={team.logo?.url || "/images/white-logo.png"}
                          alt={team.name}
                          className="result-avatar"
                        />
                        <div className="result-details">
                          <div className="result-name">{team.name}</div>
                          <div className="result-team-info">
                            <div className="members">
                              <i className="fas fa-user"></i>
                              <span>
                                {team.members &&
                                  team.members.filter(
                                    (member) => member.leaveAt === null
                                  ).length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            ) : (
              <div className="no-results">
                {isSearching ? (
                  <p>Searching...</p>
                ) : (
                  <p>
                    {modalSearchTerm
                      ? `No ${modalSearchType} found matching "${modalSearchTerm}"`
                      : `Search for ${modalSearchType} to get started`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ),
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render when these specific props change
    return (
      prevProps.modalSearchType === nextProps.modalSearchType &&
      prevProps.modalSearchTerm === nextProps.modalSearchTerm &&
      prevProps.isSearching === nextProps.isSearching &&
      prevProps.searchResults === nextProps.searchResults
    );
  }
);

// User Profile Modal Component
const UserProfileModal = React.memo(
  ({
    onClose,
    user,
    userTeams,
    isLoading,
    handleUserTeamClick,
    handleApplyToTeam,
  }) => {
    if (!user) return null;

    return (
      <div className="header-modal-overlay" onClick={(e) => e.stopPropagation()}>
        <div
          className="user-profile-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>User Profile</h2>
            <button className="close-button" onClick={onClose}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          <div className="user-profile-content">
            <div className="user-profile-info">
              <div className="user-profile-avatar">
                <img
                  src={user.avatar?.url || "/images/account.png"}
                  alt={`${user.firstName} ${user.lastName}`}
                />
              </div>
              <div className="user-details">
                <h3>
                  {user.firstName} {user.lastName}
                </h3>
                <p className="user-email mb-1" style={{marginBottom: 0}}>{user.email}</p>
                <p className="user-email m-0">Joined since {moment(user.createdAt).format("MMM DD, YYYY")}</p>
              </div>
            </div>

            <div className="user-teams-section">
              <h3>Teams</h3>
              {isLoading ? (
                <div className="loading-teams">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Loading teams...</p>
                </div>
              ) : userTeams && userTeams.length > 0 ? (
                <div className="user-teams-list">
                  {userTeams.map((team) => (
                    <div
                      key={team._id}
                      className="user-team-item"
                      onClick={() => handleUserTeamClick(team._id)}
                    >
                      <img
                        src={team.logo?.url || "/images/white-logo.png"}
                        alt={team.name}
                        className="team-avatar"
                      />
                      <div className="team-info">
                        <p className="team-name">{team.name}</p>
                        <p className="member-role">
                          {team.userRole === "leader"
                            ? "Team Leader"
                            : team.userRole === "moderator"
                            ? "Moderator"
                            : "Member"}
                        </p>
                      </div>
                      <span className="view-team-icon">
                        <i className="fa-solid fa-circle-info"></i>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-teams">
                  <p>This user is not a member of any teams.</p>
                  {handleApplyToTeam && (
                    <button
                      className="invite-user-btn"
                      onClick={() => handleApplyToTeam(user._id)}
                    >
                      Invite to your Team
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

// Team Profile Modal Component
const TeamProfileModal = React.memo(
  ({
    onClose,
    team,
    isUserMember,
    isApplying,
    handleApplyToTeam,
    navigateToTeam,
    dispatch
  }) => {
    if (!team) return null;

    const memberCount = team.members
      ? team.members.filter((member) => member.leaveAt === null).length
      : 0;

    // Format created date nicely
    const createdDate = team.createdAt
      ? new Date(team.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown date";

    return (
      <div
        className="header-modal-overlay team-modal-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="team-profile-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Team Profile</h2>
            <button className="close-button" onClick={onClose}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          <div className="team-profile-content">
            <div className="team-profile-info">
              <div className="team-profile-logo">
                <img
                  src={team.logo?.url || "/images/white-logo.png"}
                  alt={team.name}
                />
              </div>
              <div className="team-details">
                <h3>{team.name}</h3>
                <div className="team-stats">
                  <span>
                    <i className="fas fa-user"></i> {memberCount} members
                  </span>
                  {team.createdAt && (
                    <span>
                      <i className="fas fa-calendar"></i> Created {createdDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {team.createdBy && (
              <div className="team-creator-info">
                <h4>Team Creator</h4>
                <div className="creator-profile">
                  <img
                    src={team.createdBy.avatar?.url || "/images/account.png"}
                    alt={`${team.createdBy.firstName || ""} ${
                      team.createdBy.lastName || ""
                    }`}
                  />
                  <div>
                    <p className="creator-name">
                      {team.createdBy.firstName || ""}{" "}
                      {team.createdBy.lastName || ""}
                    </p>
                    <p className="creator-email">
                      {team.createdBy.email || ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="team-actions">
              {isUserMember ? (
                <Link
                  to={!team.isDisabled ? `/main/${team._id}` : "/main"}
                  className="view-team-btn"
                  key={team._id}
                  disabled={team.isDisabled}
                  onClick={
                    !team.isDisabled
                      ? () => {dispatch(setTeamId(team._id)); closeAllModal();}
                      : () =>
                          Swal.fire(
                            "Team is disabled",
                            "Please contact the team admin to enable the team",
                            "warning"
                          )
                  }
                >
                  {team.isDisabled ? "Team is Disabled" : "Enter Team Space"}
                </Link>
              ) : (
                <button
                  className="apply-team-btn"
                  onClick={() => handleApplyToTeam(team._id)}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>{" "}
                      Applying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Apply to Join
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

const Header = ({ setIsLoading, setTeams }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const systemLogoSrc = useSelector((state) => state.configurations.site?.logo);
  const systemTitle =
    useSelector((state) => state.configurations.site?.title) || "Spherify";
  const token = useSelector((state) => state.auth.token);

  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchType, setSearchType] = useState("currentTeams");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [modalSearchType, setModalSearchType] = useState("teams");
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [modalSearchTimeout, setModalSearchTimeout] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userTeams, setUserTeams] = useState([]);
  const [isLoadingUserTeams, setIsLoadingUserTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [isUserTeamMember, setIsUserTeamMember] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const closeAllModal = () => {
    setShowSearchModal(false);
    setShowUserModal(false);
    setShowTeamModal(false);
  };
  // Handle search input change for current teams
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear the previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If search term is empty, refresh to show all teams
    if (value.trim() === "") {
      setSearchTimeout(
        setTimeout(() => {
          performCurrentTeamsSearch("");
        }, 300)
      );
      return;
    }

    // Set a new timeout to trigger the search after 700ms
    setSearchTimeout(
      setTimeout(() => {
        if (searchType === "currentTeams") {
          performCurrentTeamsSearch(value);
        }
      }, 700)
    );
  };

  // Perform current teams search
  const performCurrentTeamsSearch = async (query) => {
    try {
      setIsLoading(true);
      // Encode query parameters to handle special characters
      const encodedQuery = encodeURIComponent(query);
      const encodedUserId = encodeURIComponent(user._id);

      if (query.trim() !== "") {
        // Make the GET request
        let { data } = await axios.get(
          `${
            import.meta.env.VITE_API
          }/fetchTeamsByName?name=${encodedQuery}&userId=${encodedUserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        data = data?.teams || [];
        setTeams(
          data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );
      } else {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API}/getTeamByUser/${user._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("Teams By user:", data);
        setTeams(
          data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );
      }
    } catch (error) {
      console.error("Error searching teams:", error);
      errMsg("Error searching teams");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search type change
  const handleSearchTypeChange = useCallback((type) => {
    setSearchType(type);

    // Clear previous search term and results when switching types
    setSearchTerm("");

    // For non-current-teams searches, open modal and reset all search state
    if (type !== "currentTeams") {
      setModalSearchType(type === "users" ? "users" : "teams");
      setModalSearchTerm("");
      setSearchResults([]);
      setShowSearchModal(true);
    } else {
      // For current teams search, refresh the teams list
      performCurrentTeamsSearch("");
    }
  }, []);

  // Perform modal search with explicit search type
  const performModalSearch = useCallback(
    async (searchValue = null, searchTypeOverride = null) => {
      const valueToSearch = searchValue || modalSearchTerm;
      if (!valueToSearch.trim()) return;

      // Use the override type if provided, otherwise use the current modalSearchType
      const typeToSearch = searchTypeOverride || modalSearchType;

      setIsSearching(true);
      try {
        // Ensure we're using the correct path for each search type
        const endpoint = `${import.meta.env.VITE_API}/search/${
          typeToSearch === "users" ? "users" : "teams"
        }?query=${encodeURIComponent(valueToSearch)}`;

        const { data } = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Use the correct data property based on search type
        setSearchResults(typeToSearch === "users" ? data.users : data.teams);
      } catch (error) {
        console.error(`Error searching ${typeToSearch}:`, error);
        errMsg(`Error searching ${typeToSearch}`);
      } finally {
        setIsSearching(false);
      }
    },
    [token]
  ); // Only depend on token, not on modalSearchType

  // Handle modal search input change - update to use current search type
  const handleModalSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setModalSearchTerm(value);

      // Clear the previous timeout
      if (modalSearchTimeout) {
        clearTimeout(modalSearchTimeout);
      }

      // Clear results if search term is empty
      if (!value.trim()) {
        setSearchResults([]);
        return;
      }

      // Set a new timeout to trigger the search after 700ms using the current search type
      const newTimeout = setTimeout(() => {
        // Get the current search type at time of execution (closure)
        const currentType = document
          .querySelector(".search-type-toggle .search-type-btn.active")
          ?.textContent.includes("Users")
          ? "users"
          : "teams";
        performModalSearch(value, currentType);
      }, 700);
      setModalSearchTimeout(newTimeout);
    },
    [modalSearchTimeout, performModalSearch]
  );

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      performModalSearch();
    }
  };

  // Handle user click in search results
  const handleUserClick = async (userId) => {
    try {
      // Find the user from search results
      const user = searchResults.find((u) => u._id === userId);

      if (user) {
        setSelectedUser(user);
        await fetchUserTeams(userId);
        setShowUserModal(true);

        // Add logging for debugging
        console.log("User modal should be visible now", {
          userId,
          user,
          showUserModal: true,
        });
      } else {
        console.error("User not found in search results:", userId);
      }
    } catch (error) {
      console.error("Error handling user click:", error);
      errMsg("Error loading user profile");
    }
  };

  // Handle team click in search results - modified to NOT close the search modal
  const handleTeamClick = async (teamId) => {
    try {
      // Only show modal for search results, not for users' teams
      if (searchType !== "currentTeams") {
        // Find the team from search results
        const team = searchResults.find((t) => t._id === teamId);

        if (team) {
          setSelectedTeam(team);

          // Check if user is already a member of this team
          const isMember =
            team.members &&
            team.members.some(
              (member) => member.user === user._id && !member.leaveAt
            );

          // If we can't determine from the search results, check with the server
          if (isMember === undefined) {
            try {
              const response = await axios.get(
                `${import.meta.env.VITE_API}/checkTeamMembership/${teamId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              setIsUserTeamMember(response.data.isMember);
            } catch (error) {
              console.error("Error checking team membership:", error);
              setIsUserTeamMember(false);
            }
          } else {
            setIsUserTeamMember(isMember);
          }

          setShowTeamModal(true);
        } else {
          console.error("Team not found in search results:", teamId);
          navigate(`/main/${teamId}`);
        }
      } else {
        // Direct navigation for user's own teams
        navigate(`/main/${teamId}`);
      }
    } catch (error) {
      console.error("Error handling team click:", error);
      errMsg("Error loading team profile");
      navigate(`/main/${teamId}`);
    }
  };

  // Fetch user teams
  const fetchUserTeams = async (userId) => {
    setIsLoadingUserTeams(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/getUserTeams/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data && data.teams) {
        setUserTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching user teams:", error);
    } finally {
      setIsLoadingUserTeams(false);
    }
  };

  // Function to invite user to your team - placeholder for now
  const handleInviteUser = (userId) => {
    // This would be implemented to open a dialog to invite the user to a team
    console.log(`Invite user ${userId} to team dialog goes here`);
    // For now, just navigate to profile
    navigate(`/profile/${userId}`);
    setShowUserModal(false);
    setShowSearchModal(false);
  };

  // Navigate to team page
  const navigateToTeam = (teamId) => {
    navigate(`/team/${teamId}`);
    setShowTeamModal(false);
  };

  // Apply to join team
  const handleApplyToTeam = async (teamId) => {
    try {
      setIsApplying(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API}/createApplication`,
        { teamId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        succesMsg("Application submitted successfully");
        setShowTeamModal(false);
        // Do not close search modal
      } else {
        errMsg(response.data.message || "Failed to apply to team");
      }
    } catch (error) {
      console.error("Error applying to team:", error);
      if (error.response?.data?.message) {
        errMsg(error.response.data.message);
      } else {
        errMsg("Error applying to team");
      }
    } finally {
      setIsApplying(false);
    }
  };

  // Close user profile modal
  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setUserTeams([]);
  };

  // Close team profile modal
  const closeTeamModal = () => {
    setShowTeamModal(false);
    setSelectedTeam(null);
    setIsUserTeamMember(false);
  };

  // Handle team click in user profile modal
  const handleUserTeamClick = async (teamId) => {
    try {
      // Find the team from userTeams
      const team = userTeams.find((t) => t._id === teamId);

      if (team) {
        // We need more team data, so let's fetch it
        const response = await axios.get(
          `${import.meta.env.VITE_API}/getTeamById/${teamId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data) {
          // Update the selected team with full data
          setSelectedTeam(response.data);
          // User is already a member of this team
          try {
            const response = await axios.get(
              `${import.meta.env.VITE_API}/checkTeamMembership/${teamId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            setIsUserTeamMember(response.data.isMember);
          } catch (error) {
            console.error("Error checking team membership:", error);
            setIsUserTeamMember(false);
          }
          // Show team modal
          setShowTeamModal(true);
        }
      }
    } catch (error) {
      console.error("Error handling team click from user profile:", error);
      errMsg("Error loading team information");
    }
  };

  // Effect to handle modal search type change - Re-search on type change
  useEffect(() => {
    // When modal search type changes, perform search with new type if there's a search term
    if (modalSearchTerm && modalSearchTerm.trim()) {
      performModalSearch(modalSearchTerm, modalSearchType);
    }
  }, [modalSearchType]);

  // Clear the timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (modalSearchTimeout) {
        clearTimeout(modalSearchTimeout);
      }
    };
  }, [searchTimeout, modalSearchTimeout]);

  const logoutHandler = () => {
    logout(
      dispatch,
      () => {
        navigate("/");
        toast.success("Log out successfully", {
          position: "bottom-right",
        });
        window.location.reload();
      },
      user
    );
  };

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Final component return
  return (
    <div className="header-container">
      <div className="header">
        <div className="brand content">
          <img
            src={`${
              systemLogoSrc ? systemLogoSrc : "/images/default-team-logo.png"
            }`}
            alt="Team Logo"
            className="logo"
          />
          <span className="name">{systemTitle}</span>
        </div>
        <div className="go-to-main content">
          {location.pathname === "/main" ? (
            // Show search input with dropdown on /main
            <div className="search-container">
              <div className="search-type-dropdown" ref={dropdownRef}>
                <button className="search-type-btn" onClick={toggleDropdown}>
                  <span>
                    {searchType === "currentTeams"
                      ? "My Teams"
                      : searchType === "users"
                      ? "Users"
                      : "All Teams"}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-${
                      dropdownOpen ? "up" : "down"
                    }`}
                  ></i>
                </button>
                {dropdownOpen && (
                  <div className="search-type-dropdown-content dropdown-active">
                    <div
                      className="search-option"
                      onClick={() => {
                        handleSearchTypeChange("currentTeams");
                        setDropdownOpen(false);
                      }}
                    >
                      My Teams
                    </div>
                    <div
                      className="search-option"
                      onClick={() => {
                        handleSearchTypeChange("users");
                        setDropdownOpen(false);
                      }}
                    >
                      Users
                    </div>
                    <div
                      className="search-option"
                      onClick={() => {
                        handleSearchTypeChange("teams");
                        setDropdownOpen(false);
                      }}
                    >
                      All Teams
                    </div>
                  </div>
                )}
              </div>
              {searchType === "currentTeams" && (
                <>
                  <input
                    type="text"
                    className="search-team"
                    placeholder="Search your teams"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <i className="fa-solid fa-magnifying-glass search-icon"></i>
                </>
              )}
              {searchType !== "currentTeams" && (
                <button
                  className="open-search-modal-btn"
                  onClick={() => setShowSearchModal(true)}
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>
                    Search {searchType === "users" ? "Users" : "Teams"}
                  </span>
                </button>
              )}
            </div>
          ) : (
            // Show button on other pages
            <Link
              to="/main"
              className="button"
              onClick={() => {
                dispatch(clearTeamId());
                dispatch(clearMsgGroupId());
              }}
            >
              <i className="fa-solid fa-house icon"></i>
              <span className="label">Go to Main</span>
            </Link>
          )}
        </div>
        <div className="right-navigation content">
          <div className="profile">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <img
              src={user?.avatar?.url ? user.avatar.url : "/images/account.png"}
              alt="Profile"
              className="image"
            />
          </div>

          <Link to="/main/settings" className="settings button">
            <i className="fa-solid fa-gear icon"></i>
          </Link>

          <div
            className="logout button"
            onClick={() => {
              logoutHandler();
              dispatch(clearTeamId());
              dispatch(clearMsgGroupId());
            }}
          >
            <i className="fa-solid fa-right-from-bracket icon"></i>
          </div>
        </div>
      </div>

      {/* The order of rendering here is important for z-index stacking */}

      {/* Search Modal - Render first (lowest z-index) */}
      {showSearchModal && (
        <SearchModal
          onClose={() => setShowSearchModal(false)}
          modalSearchType={modalSearchType}
          setModalSearchType={setModalSearchType}
          modalSearchTerm={modalSearchTerm}
          setModalSearchTerm={setModalSearchTerm}
          isSearching={isSearching}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          handleModalSearchChange={handleModalSearchChange}
          performModalSearch={performModalSearch}
          handleUserClick={handleUserClick}
          handleTeamClick={handleTeamClick}
          handleKeyPress={handleKeyPress}
        />
      )}

      {/* User Profile Modal - Render second (middle z-index) */}
      {showUserModal && selectedUser && (
        <UserProfileModal
          onClose={closeUserModal}
          user={selectedUser}
          userTeams={userTeams}
          isLoading={isLoadingUserTeams}
          handleUserTeamClick={handleUserTeamClick}
          handleApplyToTeam={handleInviteUser}
        />
      )}

      {/* Team Profile Modal - Render last (highest z-index) */}
      {showTeamModal && selectedTeam && (
        <TeamProfileModal
          onClose={closeTeamModal}
          team={selectedTeam}
          isUserMember={isUserTeamMember}
          isApplying={isApplying}
          handleApplyToTeam={handleApplyToTeam}
          navigateToTeam={navigateToTeam}
          dispatch={dispatch}
        />
      )}
    </div>
  );
};

export default Header;
