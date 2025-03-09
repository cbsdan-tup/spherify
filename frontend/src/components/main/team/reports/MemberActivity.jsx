import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";

const MemberActivity = ({ teamId }) => {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [sortField, setSortField] = useState('activeDaysLast30');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMemberActivity = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/activity/${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setActivityData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching member activity:", err);
        setError("Failed to load member activity data");
        setLoading(false);
      }
    };

    fetchMemberActivity();
  }, [teamId, token]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending on new field
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading member activity data...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  // Sort and filter member data
  let memberData = [...(activityData?.memberStats || [])];
  
  // Filter by search term
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    memberData = memberData.filter(
      member => member.name.toLowerCase().includes(term) || 
                (member.nickname && member.nickname.toLowerCase().includes(term)) ||
                member.email.toLowerCase().includes(term)
    );
  }
  
  // Sort data
  memberData.sort((a, b) => {
    let comparison = 0;
    
    // Handle special case for lastActive which is a date
    if (sortField === 'lastActive') {
      const dateA = new Date(a.lastActive);
      const dateB = new Date(b.lastActive);
      comparison = dateA - dateB;
    } else {
      comparison = a[sortField] < b[sortField] ? -1 : 1;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getActivityHeatMap = (activity) => {
    if (!activity || !Array.isArray(activity)) return null;
    
    return (
      <div className="activity-heatmap d-flex">
        {activity.map((value, index) => (
          <div 
            key={index}
            className="activity-cell"
            title={`Week ${index + 1}: ${value} active days`}
            style={{
              width: '14px',
              height: '20px',
              backgroundColor: getHeatmapColor(value),
              margin: '0 2px',
            }}
          />
        ))}
      </div>
    );
  };

  const getHeatmapColor = (value) => {
    if (value === 0) return '#ebedf0';
    if (value <= 2) return '#9be9a8';
    if (value <= 4) return '#40c463';
    return '#006d32';
  };

  return (
    <div className="member-activity">
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="card-title">Member Activity</h5>
            <div className="search-container">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="team-stats-summary mb-4">
            <div className="row">
              <div className="col-md-3">
                <div className="stat-card">
                  <h6 className="stat-title">Total Members</h6>
                  <p className="stat-value">{activityData?.teamStats?.totalMembers || 0}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card">
                  <h6 className="stat-title">Active Members</h6>
                  <p className="stat-value">{activityData?.teamStats?.activeMembers || 0}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card">
                  <h6 className="stat-title">Avg. Active Days</h6>
                  <p className="stat-value">{activityData?.teamStats?.averageActiveDays?.toFixed(1) || 0}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card">
                  <h6 className="stat-title">Team Age</h6>
                  <p className="stat-value">{activityData?.teamStats?.ageInDays || 0} days</p>
                </div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Member</th>
                  <th 
                    className="sortable"
                    onClick={() => handleSort('role')}
                    style={{ cursor: 'pointer' }}
                  >
                    Role
                    {sortField === 'role' && (
                      <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th 
                    className="sortable"
                    onClick={() => handleSort('activeDaysLast30')}
                    style={{ cursor: 'pointer' }}
                  >
                    Active Days (30d)
                    {sortField === 'activeDaysLast30' && (
                      <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th>Activity Trend</th>
                  <th 
                    className="sortable"
                    onClick={() => handleSort('lastActive')}
                    style={{ cursor: 'pointer' }}
                  >
                    Last Active
                    {sortField === 'lastActive' && (
                      <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {memberData.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      <div className="d-flex align-items-center">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt=""
                            className="rounded-circle me-2"
                            width="32"
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2"
                            style={{ width: "32px", height: "32px" }}
                          >
                            <span className="text-white">{member.name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <div className="fw-bold">{member.name}</div>
                          <div className="text-muted small">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-${
                        member.role === 'leader' ? 'primary' :
                        member.role === 'moderator' ? 'success' :
                        'secondary'
                      }`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                      {member.isAdmin && (
                        <span className="badge bg-danger ms-1">Admin</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <strong>{member.activeDaysLast30}</strong>
                        <div className="progress ms-2" style={{ height: '6px', width: '60px' }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${(member.activeDaysLast30 / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>{getActivityHeatMap(member.activityByWeek)}</td>
                    <td>
                      {new Date(member.lastActive).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {memberData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center">No members found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberActivity;
