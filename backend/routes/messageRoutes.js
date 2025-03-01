const express = require("express");
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");

const {
  createMessageGroup,
  getMessageGroupsByTeam,
  editMessageGroup,
  deleteMessageGroup,
  getMessages,
  getMessageGroupById
} = require("../controllers/MessageController");

router.get(
  "/getMessageGroups/:teamId",
  isAuthenticatedUser,
  getMessageGroupsByTeam
);
router.post("/createMessageGroup", createMessageGroup);
router.put(
  "/editMessageGroup/:messageGroupId",
  isAuthenticatedUser,
  editMessageGroup
);
router.delete(
  "/deleteMessageGroup/:messageGroupId",
  isAuthenticatedUser,
  deleteMessageGroup
);

router.get("/messages/:groupId", getMessages);
router.get("/message-group/:messageGroupId", getMessageGroupById);


module.exports = router;
