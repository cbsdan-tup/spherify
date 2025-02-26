import React, { useState, useEffect, useRef } from "react";
import DataTable from "react-data-table-component";
import { useSelector } from "react-redux";
import axios from "axios";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const token = useSelector((state) => state.auth.token);
  const datatableRef = useRef(null);

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data?.users || []);
      setFilteredUsers(res.data?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setFilteredUsers(
      users.filter((user) =>
        user.email.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, users]);

  useEffect(() => {
    // Dynamically add Bootstrap CSS
    const link = document.createElement("link");
    link.href =
      "https://cdn.jsdelivr.net/npm/bootstrap/dist/css/bootstrap.min.css";
    link.rel = "stylesheet";
    link.id = "bootstrap-css";
    document.head.appendChild(link);

    return () => {
      const existingLink = document.getElementById("bootstrap-css");
      if (existingLink) {
        existingLink.remove();
      }
    };
  }, []);

  // Toggle user status
  const toggleUserStatus = async (id, isDisabled) => {
    const action = isDisabled ? "enable" : "disable";
    Swal.fire({
      title: "Are you sure?",
      text: `Do you want to ${action} this user?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: `Yes, ${action}!`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.put(
            `${import.meta.env.VITE_API}/${
              isDisabled ? "enableUser" : "disableUser"
            }/${id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fetchUsers();
          Swal.fire("Updated!", `User has been ${action}d.`, "success");
        } catch (error) {
          console.error(`Error updating user status: ${error.message}`);
        }
      }
    });
  };

  // Define table columns
  const columns = [
    { name: "ID", selector: (row) => row._id, sortable: true },
    { name: "First Name", selector: (row) => row.firstName, sortable: true },
    { name: "Last Name", selector: (row) => row.lastName, sortable: true },
    { name: "Email", selector: (row) => row.email, sortable: true },
    {
      name: "Status",
      selector: (row) =>
        row.isDisable ? (
          <span className="text-danger">Disabled</span>
        ) : (
          <span className="text-success">Active</span>
        ),
      sortable: true,
      center: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          className={`btn ${row.isDisable ? "btn-success" : "btn-danger"}`}
          onClick={() => toggleUserStatus(row._id, row.isDisable)}
        >
          {row.isDisable ? "Enable" : "Disable"}
        </button>
      ),
      center: true,
    },
  ];

  // Generate PDF report
  const generatePDF = async () => {
    const datatableElement = datatableRef.current;
    if (!datatableElement) return;

    // Create a title dynamically
    const titleElement = document.createElement("h2");
    titleElement.innerText = "User Lists";
    titleElement.style.textAlign = "center";
    titleElement.style.marginBottom = "10px";
    titleElement.style.fontFamily = "Arial, sans-serif";
    datatableElement.prepend(titleElement);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(datatableElement);
    const imgData = canvas.toDataURL("image/png");
    titleElement.remove();

    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25.4;

    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);

    // Watermark settings
    pdf.setFont("Arial");
    pdf.setFontSize(14);
    pdf.setTextColor(215, 215, 215);
    const watermarkText = "spherify";
    const angle = 30;
    const trueOpacity = 3;

    let alternateOffset = 0;
    for (let y = 20; y < pageHeight; y += 40) {
      for (let x = -30 + alternateOffset; x < pageWidth; x += 80) {
        for (let i = 0; i < trueOpacity; i++) {
          pdf.text(watermarkText, x, y, { angle: angle });
        }
      }
      alternateOffset = alternateOffset === 0 ? 40 : 0;
    }

    pdf.save("User_Management_Report.pdf");
  };

  return (
    <div className="user-management-container">
      <h2 className="title">User Management</h2>
      <input
        type="text"
        className="form-control mb-3 search"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="pdf-report">
        <button className="pdf-download" onClick={generatePDF}>
          <i className="fa-solid fa-file"></i>
          <span>PDF REPORT</span>
        </button>
      </div>
      <div ref={datatableRef}>
        <DataTable
          columns={columns}
          data={filteredUsers}
          pagination
          highlightOnHover
          striped
          responsive
          className="users-datatable"
        />
      </div>
    </div>
  );
};

export default UserManagement;
