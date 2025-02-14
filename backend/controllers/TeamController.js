const { Team } = require("../models/Team");
const cloudinary = require("cloudinary").v2;
const { ensureBoardConfig } = require("./kanban/boardController");

exports.addTeam = async (req, res) => {
  try {
    const { name, description, createdBy, members } = req.body;

    // Validate required fields
    if (!name || !createdBy) {
      return res
        .status(400)
        .json({ message: "Name and CreatedBy are required." });
    }
    if (req.body.members) {
      console.log("Received members:", req.body.members);
      console.log("Type of members:", typeof req.body.members);
      console.log("Is members an array?", Array.isArray(req.body.members));
    }
    // Handle logo upload
    let logoData = { publicId: "", url: "" };
    if (req.file) {
      try {
        const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!fileTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            message:
              "Unsupported file type! Please upload a JPEG, JPG, or PNG image.",
          });
        }

        const logo = req.file.path;
        const uploadResponse = await cloudinary.uploader.upload(logo, {
          folder: "team_logos",
        });
        logoData = {
          publicId: uploadResponse.public_id,
          url: uploadResponse.secure_url,
        };
      } catch (uploadError) {
        console.error("Cloudinary Upload Error:", uploadError);
        return res.status(500).json({ message: "Error uploading logo." });
      }
    }

    // Parse members correctly
    let parsedMembers = [];

    if (typeof members === "string") {
      try {
        parsedMembers = JSON.parse(members);
      } catch (error) {
        return res
          .status(400)
          .json({ message: "Invalid members format. Should be an array." });
      }
    } else if (Array.isArray(members)) {
      parsedMembers = members;
    } else {
      return res.status(400).json({ message: "Members should be an array." });
    }

    parsedMembers = parsedMembers.map((member) => ({
      user: member.user,
      nickname: member.nickname || "",
      role: member.role || "member",
      isAdmin: member.isAdmin || false,
      joinedAt: member.joinedAt ? new Date(member.joinedAt) : new Date(),
    }));

    // Create team document
    const newTeam = new Team({
      name,
      description,
      logo: logoData,
      members: parsedMembers,
      createdBy,
    });

    // Save team and initialize boards
    const savedTeam = await newTeam.save();
    await ensureBoardConfig(savedTeam._id, savedTeam.name);
    res.status(201).json({
      message: "Team created successfully",
      team: savedTeam,
    });

  } catch (error) {
    console.error("Error creating team:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getTeamByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const teams = await Team.find({
      $or: [{ createdBy: userId }, { "members.user": userId }],
    }).populate("members.user", "fname lname email");

    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId).populate(
      "members.user",
      "firstName lastName email avatar"
    );

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.status(200).json({ members: team.members });
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId).populate(
      "members.user",
      "fname lname email"
    );

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.deleteTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.logo.logoPublicId) {
      await cloudinary.uploader.destroy(team.logo.logoPublicId);
    }

    await Team.findByIdAndDelete(teamId);
    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting team", error });
  }
};
