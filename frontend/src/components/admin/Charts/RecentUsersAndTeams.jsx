import React from "react";

const RecentUsersAndTeams = ({ recentUsers, recentTeams }) => {
  return (
    <div className="recent-data">
      {/* Recent Users Table */}
      <div className="table-container users">
        <h2>Recent Users</h2>

        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Avatar</th>
                <th>ID</th>
                <th>Email</th>
                <th>Name</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10).map((user) => (
                <tr key={user._id}>
                  <td>
                    <img
                      src={user.avatar?.url || "images/account.png"}
                      alt="Avatar"
                      className="avatar-img"
                    />
                  </td>
                  <td>{user._id}</td>
                  <td>{user.email}</td>
                  <td>{`${user.firstName} ${user.lastName}`}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Teams Table */}
      <div className="table-container teams">
        <h2>Recent Teams</h2>
        <div className="table">
          <table className="table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>ID</th>
                <th>Name</th>
                <th>Members</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentTeams.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10).map((team) => (
                <tr key={team._id}>
                  <td className="team-logo">
                    {team.logo?.url ? (
                      <img
                        src={team.logo?.url}
                        alt={team.name}
                        className="logo-img logo"
                      />
                    ) : (
                      <div className="logo-placeholder logo">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td>{team._id}</td>
                  <td>{team.name}</td>
                  <td className="text-center">{team.members.length}</td>
                  <td>{new Date(team.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentUsersAndTeams;
