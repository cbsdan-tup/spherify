import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { succesMsg, errMsg } from '../../../utils/helper';
import '../../../assets/styles/style.css';

const TeamConfigurationModal = ({ show, onHide, teamId, setRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    AllowedRoleToModifyFiles: ["leader"],
    AllowedRoleToModifyKanban: ["leader"],
    AllowedRoleToModifyGantt: ["leader"],
    AllowedRoleToCreateGroupMessage: ["leader"],
    AllowedRoleToModifyCalendar: ["leader"],
    AllowedRoleToModiyLiveEdit: ["leader"]
  });

  const token = useSelector((state) => state.auth.token);

  // Role options
  const roleOptions = ["leader", "moderator", "member"];

  // Fetch current configuration
  useEffect(() => {
    if (show && teamId) {
      fetchConfiguration();
    }
  }, [show, teamId]);

  const fetchConfiguration = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getTeamConfiguration/${teamId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setConfig(response.data.configuration);
      }
    } catch (error) {
      console.error('Error fetching team configuration:', error);
      errMsg('Failed to load team configuration');
    } finally {
      setLoading(false);
    }
  };

  // Handle form changes for each permission
  const handleRoleChange = (field, role, checked) => {
    // Don't allow removing "leader" from any permission
    if (role === "leader" && !checked) {
      return; // Prevent unchecking leader role
    }
    
    setConfig(prev => {
      const updatedRoles = checked 
        ? [...prev[field], role] 
        : prev[field].filter(r => r !== role);
      
      // Always ensure leader is included
      if (!updatedRoles.includes("leader")) {
        updatedRoles.push("leader");
      }
      
      return {
        ...prev,
        [field]: updatedRoles
      };
    });
  };

  // Save configuration changes
  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateTeamConfiguration/${teamId}`,
        { configuration: config },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        succesMsg('Team configuration updated successfully');
        if (setRefresh) {
          setRefresh(prev => !prev);
        }
        onHide();
      }
    } catch (error) {
      console.error('Error updating team configuration:', error);
      errMsg('Failed to update team configuration');
    } finally {
      setSaving(false);
    }
  };

  // Helper to check if a role is selected for a permission
  const isRoleSelected = (field, role) => {
    return config[field]?.includes(role) || false;
  };

  // Helper to determine if checkbox should be disabled
  const isCheckboxDisabled = (role) => {
    return role === "leader"; // Disable checkbox for leader role
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      centered
      size="lg"
      className="team-config-modal"
    >
      <Modal.Header style={{backgroundColor: "#1d559e"}} closeButton>
        <Modal.Title style={{color: "white"}}>Team Configuration</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading configuration...</p>
          </div>
        ) : (
          <div className="config-sections">
            <p className="text-muted mb-3">
              Configure which roles are allowed to perform modification in the team.
              Leaders always have access to all features and cannot be restricted.
            </p>
            
            {/* Files section */}
            <div className="config-section mb-4">
              <h5 className="permission-heading">File Sharing Permissions</h5>
              <Form.Group>
                <div className="permission-options">
                  {roleOptions.map(role => (
                    <Form.Check 
                      key={`files-${role}`}
                      type="checkbox"
                      id={`files-${role}`}
                      label={role.charAt(0).toUpperCase() + role.slice(1)}
                      checked={role === "leader" ? true : isRoleSelected('AllowedRoleToModifyFiles', role)}
                      onChange={(e) => handleRoleChange('AllowedRoleToModifyFiles', role, e.target.checked)}
                      disabled={isCheckboxDisabled(role)}
                      className={`me-3 ${role === "leader" ? "leader-checkbox" : ""}`}
                    />
                  ))}
                </div>
              </Form.Group>
            </div>
            
            {/* Kanban section */}
            <div className="config-section mb-4">
              <h5 className="permission-heading">Kanban Board Permissions</h5>
              <Form.Group>
                <div className="permission-options">
                  {roleOptions.map(role => (
                    <Form.Check 
                      key={`kanban-${role}`}
                      type="checkbox"
                      id={`kanban-${role}`}
                      label={role.charAt(0).toUpperCase() + role.slice(1)}
                      checked={role === "leader" ? true : isRoleSelected('AllowedRoleToModifyKanban', role)}
                      onChange={(e) => handleRoleChange('AllowedRoleToModifyKanban', role, e.target.checked)}
                      disabled={isCheckboxDisabled(role)}
                      className={`me-3 ${role === "leader" ? "leader-checkbox" : ""}`}
                    />
                  ))}
                </div>
              </Form.Group>
            </div>
            
            {/* Gantt section */}
            <div className="config-section mb-4">
              <h5 className="permission-heading">Gantt Chart Permissions</h5>
              <Form.Group>
                <div className="permission-options">
                  {roleOptions.map(role => (
                    <Form.Check 
                      key={`gantt-${role}`}
                      type="checkbox"
                      id={`gantt-${role}`}
                      label={role.charAt(0).toUpperCase() + role.slice(1)}
                      checked={role === "leader" ? true : isRoleSelected('AllowedRoleToModifyGantt', role)}
                      onChange={(e) => handleRoleChange('AllowedRoleToModifyGantt', role, e.target.checked)}
                      disabled={isCheckboxDisabled(role)}
                      className={`me-3 ${role === "leader" ? "leader-checkbox" : ""}`}
                    />
                  ))}
                </div>
              </Form.Group>
            </div>
            
            {/* Group Messages section */}
            <div className="config-section mb-4">
              <h5 className="permission-heading">Group Message Creation</h5>
              <Form.Group>
                <div className="permission-options">
                  {roleOptions.map(role => (
                    <Form.Check 
                      key={`groupmsg-${role}`}
                      type="checkbox"
                      id={`groupmsg-${role}`}
                      label={role.charAt(0).toUpperCase() + role.slice(1)}
                      checked={role === "leader" ? true : isRoleSelected('AllowedRoleToCreateGroupMessage', role)}
                      onChange={(e) => handleRoleChange('AllowedRoleToCreateGroupMessage', role, e.target.checked)}
                      disabled={isCheckboxDisabled(role)}
                      className={`me-3 ${role === "leader" ? "leader-checkbox" : ""}`}
                    />
                  ))}
                </div>
              </Form.Group>
            </div>
            
            {/* Calendar section */}
            <div className="config-section mb-4">
              <h5 className="permission-heading">Calendar Permissions</h5>
              <Form.Group>
                <div className="permission-options">
                  {roleOptions.map(role => (
                    <Form.Check 
                      key={`calendar-${role}`}
                      type="checkbox"
                      id={`calendar-${role}`}
                      label={role.charAt(0).toUpperCase() + role.slice(1)}
                      checked={role === "leader" ? true : isRoleSelected('AllowedRoleToModifyCalendar', role)}
                      onChange={(e) => handleRoleChange('AllowedRoleToModifyCalendar', role, e.target.checked)}
                      disabled={isCheckboxDisabled(role)}
                      className={`me-3 ${role === "leader" ? "leader-checkbox" : ""}`}
                    />
                  ))}
                </div>
              </Form.Group>
            </div>

            <div className="alert alert-info">
              <i className="fa-solid fa-circle-info me-2"></i>
              Leaders always have access to all features and cannot be restricted.
            </div>
          </div>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button 
          style={{color:"white", backgroundColor: "#1d559e"}}
          onClick={saveConfiguration} 
          disabled={loading || saving}
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : 'Save Configuration'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TeamConfigurationModal;
