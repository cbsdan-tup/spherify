import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Card, Table, Form, InputGroup, Button, Badge, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { bytesToSize, formatDate, errMsg, succesMsg } from '../../utils/helper';
import styles from './FileManagement.module.css';

const FileManagement = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('');
  const [teams, setTeams] = useState([]);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Added for folder navigation (using string paths like FileShare)
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'All Files', path: '' }]);

  const token = useSelector((state) => state.auth.token);

  // Fetch files from current path
  const fetchFiles = useCallback(async (path = '') => {
    try {
      setIsLoading(true);
      console.log('Fetching files for path:', path);
      
      // If at root, get all files across teams
      if (!path) {
        const response = await axios.get(`${import.meta.env.VITE_API}/admin/getAllFiles`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFiles(response.data.files || []);
        setBreadcrumbs([{ name: 'All Files', path: '' }]);
      } else {
        // Get files from specific path
        const response = await axios.get(
          `${import.meta.env.VITE_API}/admin/getFilesAndFoldersByPath`, {
            params: { path },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        console.log('API Response:', response.data);
        setFiles(response.data.files || []);
        
        // Update breadcrumbs based on path
        updateBreadcrumbs(path);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      errMsg('Error loading files', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const updateBreadcrumbs = (path) => {
    if (!path) {
      setBreadcrumbs([{ name: 'All Files', path: '' }]);
      return;
    }
    
    const pathSegments = path.split('/').filter(Boolean);
    const newBreadcrumbs = [
      { name: 'All Files', path: '' },
      ...pathSegments.map((segment, index) => ({
        name: segment,
        path: pathSegments.slice(0, index + 1).join('/')
      }))
    ];
    setBreadcrumbs(newBreadcrumbs);
  };

  // Fetch all teams for the filter dropdown
  const fetchAllTeams = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API}/getAllTeams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchFiles(currentPath);
    fetchAllTeams();
  }, [fetchFiles, fetchAllTeams, currentPath]);

  // Navigate to a folder
  const navigateToFolder = (folderName, folderId) => {
    console.log('Navigating to folder:', folderName, 'ID:', folderId);
    setCurrentFolderId(folderId);
    setPathHistory((prev) => [...prev, currentPath]);
    
    // Build path string exactly like FileShare does
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    console.log('New path:', newPath);
    setCurrentPath(newPath);
    setCurrentPage(1);
  };

  // Navigate back to previous folder
  const navigateBack = () => {
    if (pathHistory.length === 0) return;
    const previousPath = pathHistory.pop();
    setPathHistory([...pathHistory]);
    setCurrentPath(previousPath || '');
  };

  // Handle file click - open with public link
  const handleFileClick = async (file) => {
    try {
      console.log('Opening file:', file.name, 'URL:', file.url);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getPublicLink?filePath=${encodeURIComponent(file.url)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      window.open(response.data.publicUrl, '_blank');
      succesMsg('Opening file...');
    } catch (error) {
      console.error('Error opening file:', error);
      errMsg('Error opening file', error);
    }
  };

  // Navigate to specific breadcrumb
  const navigateToBreadcrumb = (path) => {
    if (!path) {
      setPathHistory([]);
      setCurrentPath('');
      return;
    }
    
    // Calculate path history for proper back navigation
    const segments = path.split('/').filter(Boolean);
    let historySoFar = [];
    
    for (let i = 0; i < segments.length; i++) {
      const historyPath = segments.slice(0, i).join('/');
      if (historyPath) {
        historySoFar.push(historyPath);
      }
    }
    
    setPathHistory(historySoFar);
    setCurrentPath(path);
  };

  // File type icons
  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return <i className="fa-solid fa-file-pdf text-danger"></i>;
      case 'doc':
      case 'docx':
        return <i className="fa-solid fa-file-word text-primary"></i>;
      case 'xls':
      case 'xlsx':
        return <i className="fa-solid fa-file-excel text-success"></i>;
      case 'ppt':
      case 'pptx':
        return <i className="fa-solid fa-file-powerpoint text-warning"></i>;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <i className="fa-solid fa-file-image text-info"></i>;
      case 'zip':
      case 'rar':
        return <i className="fa-solid fa-file-archive text-secondary"></i>;
      default:
        return <i className="fa-solid fa-file text-secondary"></i>;
    }
  };

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort files
  const filteredFiles = files
    .filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeam = filterTeam ? file.teamId === filterTeam : true;
      const matchesType = filterType ? file.type === filterType : true;
      return matchesSearch && matchesTeam && matchesType;
    })
    .sort((a, b) => {
      // First sort folders before files
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      
      // Then apply the selected sort
      if (sortField === 'size') {
        return sortDirection === 'asc' ? a.size - b.size : b.size - a.size;
      }
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
      // Default sort by date
      return sortDirection === 'asc' 
        ? new Date(a.createdAt) - new Date(b.createdAt) 
        : new Date(b.createdAt) - new Date(a.createdAt);
    });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFiles = filteredFiles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Handle download functionality
  const handleDownload = async (filePath, isFolder) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/downloadFileOrFolder`,
        {
          params: { filePath, isFolder },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        window.open(response.data.downloadUrl, '_blank');
        succesMsg('Download link opened successfully.');
      } else {
        errMsg('Failed to get download link');
      }
    } catch (error) {
      console.error('Download error:', error);
      errMsg('Failed to download file or folder');
    }
  };

  // Update breadcrumbs when folder information is available
  useEffect(() => {
    if (currentPath && files.length > 0) {
      // Find the current folder name from the first file's parentFolder
      const firstFile = files[0];
      if (firstFile && firstFile.parentFolder) {
        const folderName = firstFile.parentFolder.name;
        
        if (currentPath === currentFolderId) {
          // We're using folder ID navigation, so set breadcrumbs based on current folder
          setBreadcrumbs([
            { name: 'All Files', path: '' },
            { name: folderName, path: currentPath }
          ]);
        }
      }
    }
  }, [currentPath, files, currentFolderId]);

  return (
    <div className={styles.fileManagement}>
      <h2 className="mb-4">File Management</h2>
      
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Team Files</h5>
            <div className="d-flex">
              <Button 
                variant="outline-primary" 
                size="sm" 
                className="me-2" 
                onClick={() => fetchFiles(currentPath)}
              >
                <i className="fa-solid fa-refresh me-1"></i> Refresh
              </Button>
            </div>
          </div>
          
          {/* Breadcrumb navigation */}
          {breadcrumbs.length > 0 && (
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}>
                    {index === breadcrumbs.length - 1 ? (
                      crumb.name
                    ) : (
                      <a href="#" onClick={(e) => { 
                        e.preventDefault(); 
                        navigateToBreadcrumb(crumb.path); 
                      }}>
                        {crumb.name}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          
          {/* Back button when inside a folder */}
          {currentPath && (
            <Button 
              variant="outline-secondary"
              size="sm"
              className="mb-3"
              onClick={navigateBack}
            >
              <i className="fa-solid fa-arrow-left me-1"></i> Back
            </Button>
          )}
          
          <div className="d-flex flex-wrap gap-3 mb-3">
            <InputGroup className="w-auto flex-grow-1">
              <InputGroup.Text>
                <i className="fa-solid fa-search"></i>
              </InputGroup.Text>
              <Form.Control
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            
            <Form.Select 
              className="w-auto" 
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
            >
              <option value="">All Teams</option>
              {teams.map(team => (
                <option key={team._id} value={team._id}>{team.name}</option>
              ))}
            </Form.Select>
            
            <Form.Select 
              className="w-auto"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Files</option>
              <option value="file">Files</option>
              <option value="folder">Folders</option>
            </Form.Select>
          </div>
          
          {isLoading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading files...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                        Name {sortField === 'name' && <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>}
                      </th>
                      <th>Team</th>
                      <th onClick={() => handleSort('size')} style={{ cursor: 'pointer' }}>
                        Size {sortField === 'size' && <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>}
                      </th>
                      <th>Type</th>
                      <th>Owner</th>
                      <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                        Created At {sortField === 'createdAt' && <i className={`fa-solid fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFiles.length > 0 ? (
                      currentFiles.map((file) => {
                        const teamName = teams.find(t => t._id === file.teamId)?.name || 'Unknown';
                        
                        return (
                          <tr key={file._id}>
                            <td>
                              <div 
                                className="d-flex align-items-center" 
                                style={{ cursor: 'pointer' }}
                                onClick={() => file.type === 'folder' 
                                  ? navigateToFolder(file.name, file._id)
                                  : handleFileClick(file)
                                }
                              >
                                <span className="me-2">
                                  {file.type === 'folder' ? (
                                    <i className="fa-solid fa-folder text-warning"></i>
                                  ) : (
                                    getFileIcon(file.name)
                                  )}
                                </span>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip>{file.name}</Tooltip>}
                                >
                                  <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                                    {file.name}
                                  </span>
                                </OverlayTrigger>
                              </div>
                            </td>
                            <td>{teamName}</td>
                            <td>{file.size ? bytesToSize(file.size) : 'N/A'}</td>
                            <td>
                              <Badge bg={file.type === 'folder' ? 'warning' : 'info'}>
                                {file.type === 'folder' ? 'Folder' : 'File'}
                              </Badge>
                            </td>
                            <td>{file.owner?.firstName} {file.owner?.lastName}</td>
                            <td>{formatDate(file.createdAt)}</td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    file.type === 'folder' 
                                      ? navigateToFolder(file.name, file._id)
                                      : handleFileClick(file);
                                  }}
                                >
                                  <i className={`fa-solid ${file.type === 'folder' ? 'fa-folder-open' : 'fa-eye'}`}></i>
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(file.url, file.type === 'folder');
                                  }}
                                >
                                  <i className="fa-solid fa-download"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          {files.length === 0 ? 'No files found in this location.' : 'No matching files found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {pageNumbers.map(number => (
                      <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(number)}
                        >
                          {number}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </div>
              )}
              
              <div className="mt-3 text-muted fs-sm">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredFiles.length)} of {filteredFiles.length} items
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <h5>Storage Statistics</h5>
          <div className="row mt-3">
            <div className="col-md-4">
              <Card className="text-center p-3">
                <h6>Total Files</h6>
                <h3>{files.filter(f => f.type === 'file').length}</h3>
              </Card>
            </div>
            <div className="col-md-4">
              <Card className="text-center p-3">
                <h6>Total Folders</h6>
                <h3>{files.filter(f => f.type === 'folder').length}</h3>
              </Card>
            </div>
            <div className="col-md-4">
              <Card className="text-center p-3">
                <h6>Total Storage Used</h6>
                <h3>{bytesToSize(files.reduce((sum, file) => sum + (file.size || 0), 0))}</h3>
              </Card>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default FileManagement;
