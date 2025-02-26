import React, { useState, useEffect, useRef } from "react";
import DataTable from "react-data-table-component";
import { useSelector } from "react-redux";
import axios from "axios";
import { errMsg } from "../../utils/helper";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [refresh, setRefresh] = useState(false);

  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    // Dynamically add Bootstrap CSS
    const link = document.createElement("link");
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap/dist/css/bootstrap.min.css";
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

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/getAllTeams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("TEAMS", res.data?.teams);
      setTeams(res.data?.teams || []);
      setFilteredTeams(res.data?.teams || []);
    } catch (error) {
      console.log(error);
      errMsg(`Error fetching teams: ${error.message}`);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Do you want to ${currentStatus ? "enable" : "disable"} this team?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, proceed!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.put(
            `${import.meta.env.VITE_API}/updateTeamStatus/${id}`,
            { isDisabled: !currentStatus },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          fetchTeams();
          Swal.fire("Updated!", "Team status has been changed.", "success");
        } catch (error) {
          console.error("Error updating status:", error);
          errMsg(`Error updating status: ${error.message}`);
        }
      }
    });
  };

  useEffect(() => {
    fetchTeams();
  }, [refresh]);

  useEffect(() => {
    setFilteredTeams(
      teams.filter((team) =>
        team.name.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, teams]);

  const columns = [
    { name: "ID", selector: (row) => row._id, sortable: true },
    {
      name: "Logo",
      cell: (row) =>
        row.logo.url ? (
          <img
            src={row.logo.url}
            alt={row.name}
            style={{ display: "block", margin: "0 auto" }}
            className="logo"
          />
        ) : (
          <div
            className="logo-placeholder logo"
            style={{ textAlign: "center" }}
          >
            {row.name.charAt(0).toUpperCase()}
          </div>
        ),
      center: true,
    },
    { name: "Name", selector: (row) => row.name, sortable: true },
    {
      name: "Owner",
      selector: (row) =>
        row.createdBy
          ? `${row.createdBy.email}`
          : "Unknown",
      sortable: true,
    },
    {
      name: "Members",
      selector: (row) => row.members.length,
      sortable: true,
      center: true,
    },
    {
      name: "Created At",
      selector: (row) => new Date(row.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) =>
        row.isDisabled ? (
          <div className="status inactive">Disabled</div>
        ) : (
          <div className="status active">Active</div>
        ),
      sortable: true,
      center: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          className={`btn ${row.isDisabled ? "btn-success" : "btn-danger"}`}
          onClick={() => toggleStatus(row._id, row.isDisabled)}
        >
          {row.isDisabled ? "Enable" : "Disable"}
        </button>
      ),
      center: true,
    },
  ];

  const datatableRef = useRef(null);

  const generatePDF = async () => {
    const datatableElement = datatableRef.current;
    if (!datatableElement) return;

    // ✅ Create an H2 element dynamically
    const titleElement = document.createElement("h2");
    titleElement.innerText = "Team Lists";
    titleElement.style.textAlign = "center";
    titleElement.style.marginBottom = "10px";
    titleElement.style.fontFamily = "Lexend, sans-serif";

    // ✅ Insert it before the datatable
    datatableElement.prepend(titleElement);

    // ✅ Wait for UI update before capturing
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(datatableElement);
    const imgData = canvas.toDataURL("image/png");

    // ✅ Remove the title after capturing
    titleElement.remove();

    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25.4;

    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);

    // ✅ Add watermark
    pdf.setFont("Lexend");
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

    pdf.save("Team_Management_Report.pdf");
  };

  return (
    <div className="team-management-container">
      <h2 className="title">Team Management</h2>
      <input
        type="text"
        className="form-control mb-3 search"
        placeholder="Search teams..."
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
          data={filteredTeams}
          pagination
          highlightOnHover
          striped
          responsive
          className="teams-datatable"
        />
      </div>
    </div>
  );
};

export default TeamManagement;
