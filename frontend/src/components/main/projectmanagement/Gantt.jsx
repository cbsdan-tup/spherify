import React, { useState, useEffect, useRef, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchTasks, createTask, updateTask, deleteTask } from "../../../redux/ganttSlice";
import { Modal, Form, Button, Nav } from "react-bootstrap";
import { toast } from "react-toastify";
import { TeamConfigContext } from "../Team"; // Import the context
import './Gantt.css';

function Gantt() {
  const dispatch = useDispatch();
  const { tasks, loading, error } = useSelector((state) => state.gantt);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user); // Access the user
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    progress: 0,
    color: "#007bff",
    colorLabel: "Default"
  });
  
  // Missing state variables
  const [activeYear, setActiveYear] = useState(null);
  const [colorPresets, setColorPresets] = useState(() => {
    const saved = localStorage.getItem('ganttColorPresets');
    return saved ? JSON.parse(saved) : [
      { label: 'Default', color: '#007bff' },
      { label: 'High Priority', color: '#dc3545' },
      { label: 'Medium Priority', color: '#ffc107' },
      { label: 'Low Priority', color: '#28a745' }
    ];
  });
  const [showColorPresetModal, setShowColorPresetModal] = useState(false);
  const [newPreset, setNewPreset] = useState({ label: '', color: '#000000' });
  const [editingPresetIndex, setEditingPresetIndex] = useState(null);
  const [showPresetActionMenu, setShowPresetActionMenu] = useState(null);
  
  // Add ref for the Gantt chart element
  const ganttRef = useRef(null);
  
  // Permission check state
  const [hasGanttPermission, setHasGanttPermission] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Get team context
  const teamContext = useContext(TeamConfigContext);
  
  // Check if user has permission to modify Gantt
  useEffect(() => {
    if (teamContext?.teamInfo && teamContext?.teamConfiguration && user) {
      const currentMember = teamContext.teamInfo.members.find(
        member => member.user && member.user._id === user._id && member.leaveAt === null
      );
      
      if (currentMember) {
        setUserRole(currentMember.role);
        
        // Check permissions: leader, admin, or role in AllowedRoleToModifyGantt
        const hasPermission = 
          currentMember.role === "leader" || 
          currentMember.isAdmin ||
          (teamContext.teamConfiguration?.AllowedRoleToModifyGantt || []).includes(currentMember.role);
        
        setHasGanttPermission(hasPermission);
      }
    }
  }, [teamContext, user]);

  useEffect(() => {
    if (currentTeamId) {
      dispatch(fetchTasks(currentTeamId));
    }
  }, [currentTeamId, dispatch]);

  useEffect(() => {
    if (tasks.length > 0 && !activeYear) {
      const years = [...new Set(tasks.map(task => 
        new Date(task.startDate).getFullYear()
      ))];
      setActiveYear(Math.min(...years));
    }
  }, [tasks]);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    // Add permission check
    if (!hasGanttPermission) {
      toast.error("You don't have permission to modify Gantt tasks");
      return;
    }
    
    try {
      if (selectedTask) {
        await dispatch(updateTask({
          taskId: selectedTask._id,
          taskData: { ...taskForm, teamId: currentTeamId }
        })).unwrap();
        toast.success("Task updated successfully");
      } else {
        await dispatch(createTask({ ...taskForm, teamId: currentTeamId })).unwrap();
        toast.success("Task created successfully");
      }
      handleCloseModal();
      dispatch(fetchTasks(currentTeamId));
    } catch (err) {
      toast.error(err.message || "An error occurred");
    }
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    setTaskForm({
      title: "",
      startDate: "",
      endDate: "",
      progress: 0,
      color: "#007bff",
      colorLabel: "Default"
    });
  };

  const handleEditTask = (task) => {
    // Add permission check
    if (!hasGanttPermission) {
      toast.error("You don't have permission to edit Gantt tasks");
      return;
    }
    
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      startDate: new Date(task.startDate).toISOString().split('T')[0],
      endDate: new Date(task.endDate).toISOString().split('T')[0],
      progress: task.progress || 0,
      color: task.color || "#007bff",
      colorLabel: task.colorLabel || "Default"
    });
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    // Add permission check
    if (!hasGanttPermission) {
      toast.error("You don't have permission to delete Gantt tasks");
      return;
    }
    
    toast.info(
      <div>
        <p>Are you sure you want to delete this task?</p>
        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => toast.dismiss()}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={async () => {
              try {
                await dispatch(deleteTask(taskId)).unwrap();
                toast.success("Task deleted successfully");
                dispatch(fetchTasks(currentTeamId));
              } catch (err) {
                toast.error(err.message || "An error occurred");
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>,
      { autoClose: false }
    );
  };

  const calculateTaskPosition = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const yearStart = new Date(activeYear, 0, 1);
    const yearEnd = new Date(activeYear, 11, 31);
    
    const effectiveStart = start < yearStart ? yearStart : start;
    const effectiveEnd = end > yearEnd ? yearEnd : end;
    
    const daysFromYearStart = (effectiveStart - yearStart) / (1000 * 60 * 60 * 24);
    const taskDuration = (effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24) + 1;
    
    const left = (daysFromYearStart / 365) * 100;
    const width = (taskDuration / 365) * 100;
    
    return {
      width: `${width}%`,
      left: `${left}%`
    };
  };

  // Group tasks by year
  const tasksByYear = tasks.reduce((acc, task) => {
    const startYear = new Date(task.startDate).getFullYear();
    const endYear = new Date(task.endDate).getFullYear();
    
    // Add task to each year it spans
    for (let year = startYear; year <= endYear; year++) {
      if (!acc[year]) acc[year] = [];
      acc[year].push(task);
    }
    return acc;
  }, {});

  // Get sorted unique years
  const years = [...new Set(tasks.flatMap(task => {
    const startYear = new Date(task.startDate).getFullYear();
    const endYear = new Date(task.endDate).getFullYear();
    return Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );
  }))].sort();

  const downloadGanttChart = () => {
    const ganttElement = ganttRef.current;
    
    // Create canvas with dynamic height
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Constants for sizing
    const headerHeight = 100;
    const taskHeight = 40;
    const taskPadding = 10;
    const activeYearTasks = tasksByYear[activeYear] || [];
    
    // Calculate dimensions
    const canvasWidth = 1500; // Fixed width for better resolution
    const totalTasksHeight = activeYearTasks.length * (taskHeight + taskPadding);
    const canvasHeight = headerHeight + totalTasksHeight + 50; // Extra padding at bottom
    
    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw fixed header section
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvasWidth, headerHeight);
    
    // Draw year header
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText(`Gantt Chart ${activeYear}`, 10, 30);
    
    // Draw quarters
    ctx.font = 'bold 16px Arial';
    const quarterWidth = (canvasWidth - 200) / 4;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((quarter, i) => {
      const x = 200 + (quarterWidth * i);
      ctx.fillText(quarter, x + quarterWidth/2 - 15, 60);
      // Draw quarter separators
      ctx.strokeStyle = '#cccccc';
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    });
    
    // Draw months
    ctx.font = '14px Arial';
    const monthWidth = (canvasWidth - 200) / 12;
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      .forEach((month, i) => {
        const x = 200 + (monthWidth * i);
        ctx.fillText(month, x + monthWidth/2 - 15, 85);
        // Draw month separators
        ctx.strokeStyle = '#eeeeee';
        ctx.beginPath();
        ctx.moveTo(x, headerHeight);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      });
    
    // Draw tasks
    activeYearTasks.forEach((task, index) => {
      const y = headerHeight + (index * (taskHeight + taskPadding));
      
      // Task row background (alternating colors)
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
      ctx.fillRect(0, y, canvasWidth, taskHeight);
      
      // Draw task name
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.fillText(task.title, 10, y + taskHeight/2 + 5);
      
      // Draw task bar
      const { left, width } = calculateTaskPosition(task.startDate, task.endDate);
      const barLeft = 200 + (parseFloat(left) * (canvasWidth - 200) / 100);
      const barWidth = (parseFloat(width) * (canvasWidth - 200) / 100);
      
      // Task bar with gradient
      const taskColor = task.color || '#007bff';
      const gradient = ctx.createLinearGradient(barLeft, y + 5, barLeft, y + taskHeight - 5);
      gradient.addColorStop(0, taskColor);
      gradient.addColorStop(1, adjustColor(taskColor, -20)); // Darker shade of the task color
      ctx.fillStyle = gradient;
      
      // Draw rounded rectangle for task bar
      ctx.beginPath();
      ctx.roundRect(barLeft, y + 5, barWidth, taskHeight - 10, 5);
      ctx.fill();
      
      // Draw task dates and duration
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      const startDate = new Date(task.startDate).toLocaleDateString();
      const endDate = new Date(task.endDate).toLocaleDateString();
      const duration = Math.ceil((new Date(task.endDate) - new Date(task.startDate)) / (1000 * 60 * 60 * 24));
      
      const dateText = `${startDate} - ${endDate} (${duration} days)`;
      if (barWidth > ctx.measureText(dateText).width + 20) {
        ctx.fillText(dateText, barLeft + 10, y + taskHeight/2 + 4);
      }
    });
    
    // Convert canvas to image and trigger download
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = `gantt-chart-${activeYear}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const adjustColor = (color, amount) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => 
      ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
    );
  };

  // Modify the handleAddColorPreset function to check permissions
  const handleAddColorPreset = () => {
    if (!hasGanttPermission) {
      toast.error("You don't have permission to modify categories");
      return;
    }
    
    if (newPreset.label.trim()) {
      let updatedPresets;
      
      if (editingPresetIndex !== null) {
        // Update existing preset
        updatedPresets = [...colorPresets];
        updatedPresets[editingPresetIndex] = newPreset;
        
        // Update any tasks using this category
        if (tasks.length > 0) {
          const oldLabel = colorPresets[editingPresetIndex].label;
          const tasksToUpdate = tasks.filter(task => task.colorLabel === oldLabel);
          
          tasksToUpdate.forEach(async task => {
            try {
              await dispatch(updateTask({
                taskId: task._id,
                taskData: { 
                  color: newPreset.color, 
                  colorLabel: newPreset.label,
                  teamId: currentTeamId
                }
              })).unwrap();
            } catch (err) {
              toast.error(`Failed to update task ${task.title}: ${err.message}`);
            }
          });
          
          if (tasksToUpdate.length > 0) {
            toast.info(`Updated ${tasksToUpdate.length} tasks with the new category settings`);
            dispatch(fetchTasks(currentTeamId));
          }
        }
        
        toast.success("Category updated successfully");
      } else {
        // Add new preset
        updatedPresets = [...colorPresets, newPreset];
        toast.success("Category added successfully");
      }
      
      setColorPresets(updatedPresets);
      localStorage.setItem('ganttColorPresets', JSON.stringify(updatedPresets));
      setNewPreset({ label: '', color: '#000000' });
      setEditingPresetIndex(null);
      setShowColorPresetModal(false);
    }
  };

  // Update other color preset functions with permission checks
  const handleEditPreset = (index) => {
    if (!hasGanttPermission) {
      toast.error("You don't have permission to edit categories");
      return;
    }
    setEditingPresetIndex(index);
    setNewPreset({ ...colorPresets[index] });
    setShowColorPresetModal(true);
    setShowPresetActionMenu(null);
  };

  const handleDeletePreset = (index) => {
    if (!hasGanttPermission) {
      toast.error("You don't have permission to delete categories");
      return;
    }
    const presetToDelete = colorPresets[index];
    
    // Check if preset is being used by any tasks
    const tasksUsingPreset = tasks.filter(task => task.colorLabel === presetToDelete.label);
    
    if (tasksUsingPreset.length > 0) {
      toast.info(
        <div>
          <p>This category is used by {tasksUsingPreset.length} tasks. Deleting it will reset them to the Default category.</p>
          <div className="d-flex justify-content-end gap-2 mt-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => toast.dismiss()}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={async () => {
                confirmDeletePreset(index, tasksUsingPreset);
                toast.dismiss();
              }}
            >
              Delete Anyway
            </Button>
          </div>
        </div>,
        { autoClose: false }
      );
    } else {
      confirmDeletePreset(index);
    }
    
    setShowPresetActionMenu(null);
  };

  const confirmDeletePreset = async (index, affectedTasks = []) => {
    // Remove the preset
    const updatedPresets = colorPresets.filter((_, i) => i !== index);
    setColorPresets(updatedPresets);
    localStorage.setItem('ganttColorPresets', JSON.stringify(updatedPresets));
    
    // Update affected tasks
    if (affectedTasks.length > 0) {
      for (const task of affectedTasks) {
        try {
          await dispatch(updateTask({
            taskId: task._id,
            taskData: { 
              color: '#007bff', 
              colorLabel: 'Default',
              teamId: currentTeamId
            }
          })).unwrap();
        } catch (err) {
          console.error(`Failed to update task ${task.title}:`, err);
        }
      }
      
      dispatch(fetchTasks(currentTeamId));
      toast.success(`Category deleted and ${affectedTasks.length} tasks updated`);
    } else {
      toast.success("Category deleted successfully");
    }
  };

  const handleCancelColorPreset = () => {
    setNewPreset({ label: '', color: '#000000' });
    setEditingPresetIndex(null);
    setShowColorPresetModal(false);
  };

  const getContrastColor = (hexcolor) => {
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  // Add refresh function to refetch tasks
  const handleRefresh = () => {
    if (currentTeamId) {
      dispatch(fetchTasks(currentTeamId));
      toast.info("Refreshing Gantt chart data...");
    }
  };

  return (
    <div className="gantt-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Team Gantt Chart</h2>
        <div className="d-flex align-items-center " style={{gap: "10px"}}>
          {/* Only show Add Task button if user has permission */}
          {hasGanttPermission && (
            <Button variant="primary" onClick={() => setShowTaskModal(true)} className="me-2">
              Add Task
            </Button>
          )}
          {/* Fix the Refresh button syntax */}
          <Button variant="info" onClick={handleRefresh} className="me-2">
            <i className="fas fa-sync-alt me-1"></i> Refresh
          </Button>
          <Button variant="success" onClick={downloadGanttChart}>
            Download Chart
          </Button>
        </div>
      </div>

      {/* Year Tabs */}
      <Nav variant="tabs" className="mb-3">
        {years.map(year => (
          <Nav.Item key={year}>
            <Nav.Link 
              active={activeYear === year}
              onClick={() => setActiveYear(year)}
              style={{ cursor: 'pointer' }}
            >
              {year}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <div ref={ganttRef} style={{ display: 'flex' }}>
        <div className="gantt-chart" style={{ 
          overflowX: 'auto', 
          position: 'relative',
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderRadius: '8px',
          width: '100%' // Changed from 85% to 100%
        }}>
          {/* Show only the active year's content */}
          <div>
            {/* Quarters Row */}
            <div style={{ 
              display: 'flex',
              borderBottom: '1px solid #ccc',
              paddingBottom: '0.5rem'
            }}>
              <div style={{ width: '200px', fontWeight: 'bold' }}></div>
              <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #eee' }}>Q1</div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #eee' }}>Q2</div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #eee' }}>Q3</div>
                <div style={{ flex: 1, textAlign: 'center' }}>Q4</div>
              </div>
            </div>

            {/* Months Row */}
            <div style={{ 
              display: 'flex',
              marginBottom: '1rem',
              borderBottom: '1px solid #ccc',
              paddingBottom: '0.5rem',
              paddingTop: '0.5rem'
            }}>
              <div style={{ width: '200px', fontWeight: 'bold' }}>Task</div>
              <div style={{ flex: 1, display: 'flex' }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                  .map((month, index) => (
                    <div key={month} style={{ 
                      flex: 1, 
                      textAlign: 'center',
                      borderRight: index < 11 ? '1px solid #eee' : 'none',
                      fontSize: '0.9rem'
                    }}>
                      {month}
                    </div>
                  ))}
              </div>
              <div style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>Actions</div>
            </div>

            {/* Tasks for active year */}
            <div className="gantt-body" style={{ position: 'relative' }}>
              {tasksByYear[activeYear]?.map(task => {
                const start = new Date(task.startDate);
                const end = new Date(task.endDate);
                
                return (
                  <div
                    key={task._id}
                    className="gantt-row"
                    style={{
                      display: 'flex',
                      marginBottom: '0.5rem',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ width: '200px' }}>
                      <div>{task.title}</div>
                      <small style={{
                        color: task.color || '#007bff',
                        fontSize: '0.8rem',
                        fontStyle: 'italic'
                      }}>
                        {task.colorLabel || 'Default'}
                      </small>
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: '30px' }}>
                      <div
                        className="task-bar"
                        style={{
                          position: 'absolute',
                          height: '100%',
                          backgroundColor: task.color || '#007bff',
                          opacity: start.getFullYear() !== end.getFullYear() ? 0.8 : 0.9,
                          borderRadius: '4px',
                          ...calculateTaskPosition(task.startDate, task.endDate),
                          transition: 'all 0.2s ease',
                          boxShadow: `0 2px 4px ${task.color}40`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = start.getFullYear() !== end.getFullYear() ? '0.8' : '0.9';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <div className="task-info" style={{
                          position: 'absolute',
                          top: '100%',
                          left: '0',
                          backgroundColor: 'white',
                          padding: '8px',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          display: 'none',
                          zIndex: 1000,
                          minWidth: '200px',
                          border: `1px solid ${task.color || '#007bff'}`
                        }}>
                          <div><strong>Category:</strong> {task.colorLabel || 'Default'}</div>
                          <div>Start: {new Date(task.startDate).toLocaleDateString()}</div>
                          <div>End: {new Date(task.endDate).toLocaleDateString()}</div>
                          <div>Duration: {Math.ceil((new Date(task.endDate) - new Date(task.startDate)) / (1000 * 60 * 60 * 24))} days</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      width: '100px', 
                      display: 'flex', 
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      {/* Only show edit/delete buttons if user has permission */}
                      {hasGanttPermission && (
                        <>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="py-0 px-1"
                            style={{ 
                              minWidth: '24px', 
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={() => handleEditTask(task)}
                          >
                            <i className="fa-solid fa-pen fa-xs"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="py-0 px-1"
                            style={{ 
                              minWidth: '24px', 
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={() => handleDeleteTask(task._id)}
                          >
                            <i className="fa-solid fa-trash fa-xs"></i>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal show={showTaskModal} onHide={handleCloseModal} className="gantt-chart-modal">
        <Modal.Header closeButton>
          <Modal.Title>{selectedTask ? 'Edit Task' : 'Add New Task'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleTaskSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Task Title</Form.Label>
              <Form.Control
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={taskForm.startDate}
                onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={taskForm.endDate}
                onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Task Category</Form.Label>
              <div className="dropdown">
                <Button
                  variant="outline-secondary"
                  className="w-100 text-start d-flex justify-content-between align-items-center"
                  style={{
                    backgroundColor: taskForm.color,
                    color: getContrastColor(taskForm.color),
                    borderColor: taskForm.color
                  }}
                  onClick={(e) => {
                    e.currentTarget.closest('.dropdown').classList.toggle('show');
                  }}
                >
                  <span>{taskForm.colorLabel}</span>
                  <i className="fas fa-chevron-down"></i>
                </Button>
                <div className="dropdown-menu w-100" style={{
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {colorPresets.map((preset, index) => (
                    <div 
                      key={index} 
                      className="d-flex align-items-center preset-item position-relative"
                      onMouseEnter={() => setShowPresetActionMenu(index)}
                      onMouseLeave={() => setShowPresetActionMenu(null)}
                    >
                      <button
                        className="dropdown-item d-flex justify-content-between align-items-center flex-grow-1"
                        type="button"
                        onClick={() => {
                          setTaskForm({
                            ...taskForm,
                            color: preset.color,
                            colorLabel: preset.label
                          });
                          // Close dropdown
                          document.querySelector('.dropdown').classList.remove('show');
                        }}
                        style={{
                          backgroundColor: preset.color,
                          color: getContrastColor(preset.color)
                        }}
                      >
                        <span>{preset.label}</span>
                        {taskForm.colorLabel === preset.label && (
                          <i className="fas fa-check"></i>
                        )}
                      </button>
                      
                      {showPresetActionMenu === index && index > 3 && (
                        <div className="preset-actions d-flex position-absolute end-0 me-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-1 text-dark"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPreset(index);
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-1 text-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePreset(index);
                            }}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="dropdown-divider"></div>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={() => {
                      setShowColorPresetModal(true);
                      // Close dropdown
                      document.querySelector('.dropdown').classList.remove('show');
                    }}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Add New Category
                  </button>
                </div>
              </div>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 button">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {selectedTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showColorPresetModal} onHide={handleCancelColorPreset}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPresetIndex !== null ? 'Edit Color Category' : 'Add Color Category'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Category Name</Form.Label>
            <Form.Control
              type="text"
              value={newPreset.label}
              onChange={(e) => setNewPreset({ ...newPreset, label: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Color</Form.Label>
            <Form.Control
              type="color"
              value={newPreset.color}
              onChange={(e) => setNewPreset({ ...newPreset, color: e.target.value })}
            />
          </Form.Group>
          <div className="mb-3 p-2" style={{ 
            backgroundColor: newPreset.color,
            color: getContrastColor(newPreset.color),
            borderRadius: '4px',
            padding: '8px'
          }}>
            <div>Preview: {newPreset.label}</div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelColorPreset}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddColorPreset}>
            {editingPresetIndex !== null ? 'Save Changes' : 'Add Category'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add a notice when user doesn't have permission */}
      {!hasGanttPermission && (
        <div className="alert alert-info mt-3">
          <i className="fa-solid fa-info-circle me-2"></i>
          You can view the Gantt chart, but you don't have permission to add, edit, or delete tasks.
        </div>
      )}
    </div>
  );
}

export default Gantt;
