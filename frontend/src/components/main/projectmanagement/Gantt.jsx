import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchTasks, createTask, updateTask, deleteTask } from "../../../redux/ganttSlice";
import { Modal, Form, Button, Nav } from "react-bootstrap";
import { toast } from "react-toastify";

function Gantt() {
  const dispatch = useDispatch();
  const { tasks, loading, error } = useSelector((state) => state.gantt);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    progress: 0,
  });
  const ganttRef = useRef(null);
  const [activeYear, setActiveYear] = useState(null);

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
    });
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      startDate: new Date(task.startDate).toISOString().split('T')[0],
      endDate: new Date(task.endDate).toISOString().split('T')[0],
      progress: task.progress || 0,
    });
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
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
    
    // Ensure we're calculating positions within the active year
    const yearStart = new Date(activeYear, 0, 1);
    const yearEnd = new Date(activeYear, 11, 31);
    
    // Adjust dates to current year's boundaries if they span multiple years
    const effectiveStart = start < yearStart ? yearStart : start;
    const effectiveEnd = end > yearEnd ? yearEnd : end;
    
    // Calculate days since start of year (for left position)
    const daysFromYearStart = (effectiveStart - yearStart) / (1000 * 60 * 60 * 24);
    
    // Calculate task duration in days (for width)
    const taskDuration = (effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24) + 1;
    
    // Convert to percentages (365 days = 100%)
    const left = (daysFromYearStart / 365) * 100;
    const width = (taskDuration / 365) * 100;
    
    return {
      width: `${width}%`,
      left: `${left}%`,
      backgroundColor: start.getFullYear() !== end.getFullYear() ? '#007bff80' : '#007bff', // Semi-transparent for multi-year tasks
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
      const gradient = ctx.createLinearGradient(barLeft, y + 5, barLeft, y + taskHeight - 5);
      gradient.addColorStop(0, '#007bff');
      gradient.addColorStop(1, '#0056b3');
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

  return (
    <div className="gantt-container" style={{ padding: '1rem', paddingTop: '180px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Team Gantt Chart</h2>
        <div>
          <Button variant="primary" onClick={() => setShowTaskModal(true)} className="me-2">
            Add Task
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
          width: '85%'
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
            </div>

            {/* Tasks for active year */}
            <div className="gantt-body" style={{ position: 'relative' }}>
              {tasksByYear[activeYear]?.map(task => (
                <div
                  key={task._id}
                  className="gantt-row"
                  style={{
                    display: 'flex',
                    marginBottom: '0.5rem',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ width: '200px' }}>{task.title}</div>
                  <div style={{ flex: 1, position: 'relative', height: '30px' }}>
                    <div
                      className="task-bar"
                      style={{
                        position: 'absolute',
                        height: '100%',
                        backgroundColor: '#007bff',
                        borderRadius: '4px',
                        ...calculateTaskPosition(task.startDate, task.endDate)
                      }}
                      onClick={() => handleEditTask(task)}
                      data-start-date={new Date(task.startDate).toISOString()}
                      data-end-date={new Date(task.endDate).toISOString()}
                    >
                      <div className="task-info" style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        backgroundColor: 'white',
                        padding: '4px',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        display: 'none',
                        zIndex: 1000,
                        minWidth: '200px'
                      }}>
                        <div>Start: {new Date(task.startDate).toLocaleDateString()}</div>
                        <div>End: {new Date(task.endDate).toLocaleDateString()}</div>
                        <div>Duration: {Math.ceil((new Date(task.endDate) - new Date(task.startDate)) / (1000 * 60 * 60 * 24))} days</div>
                        <div>Weeks: {Math.ceil((new Date(task.endDate) - new Date(task.startDate)) / (1000 * 60 * 60 * 24 * 7))} weeks</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons Column - Filter for active year */}
        <div style={{ 
          width: '150px',
          paddingLeft: '1rem',
          paddingTop: '95px'
        }}>
          {tasksByYear[activeYear]?.map((task) => (
            <div
              key={task._id}
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                height: '30px', // Match task row height
                alignItems: 'center'
              }}
            >
              <Button
                variant="outline-primary"
                size="sm"
                className="py-0 px-2"
                onClick={() => handleEditTask(task)}
              >
                Edit
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="py-0 px-2"
                onClick={() => handleDeleteTask(task._id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Modal show={showTaskModal} onHide={handleCloseModal}>
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
              <Form.Label>Progress (%)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                value={taskForm.progress}
                onChange={(e) => setTaskForm({ ...taskForm, progress: parseInt(e.target.value) })}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
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
    </div>
  );
}

export default Gantt;
