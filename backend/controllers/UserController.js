const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const moment = require("moment");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.registerUser = async (req, res, next) => {
  try {
    console.log(
      `Request Body: ${JSON.stringify(
        req.body
      )},\nRequest file: ${JSON.stringify(req.file)}`
    );

    const { uid, firstName, lastName, email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Register Failed",
        errors: ["Email already exists"],
      });
    }

    const adminExists = await User.exists({ isAdmin: true });

    let avatar = {
      public_id: null,
      url: null,
    };

    if (req.file) {
      const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!fileTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported file type! Please upload a JPEG, JPG, or PNG image.",
        });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });

      avatar = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    const user = new User({
      uid,
      firstName,
      lastName,
      email,
      avatar,
      isAdmin: !adminExists,
      otp,
      otpExpiry,
      isVerified: false
    });

    const validationError = user.validateSync();
    if (validationError) {
      const errorMessages = Object.values(validationError.errors).map(
        (error) => error.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errorMessages,
      });
    }

    await user.save();

    // Send OTP email
    const emailOptions = {
      email: user.email,
      subject: "Spherify - Verify Your Email",
      message: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #4a4a4a; margin: 0; font-size: 24px;">Welcome to Spherify!</h1>
            <p style="color: #777777; margin: 5px 0 0;">Email Verification</p>
          </div>
          
          <div style="padding: 20px 0; text-align: center;">
            <h2 style="color: #5067EB; margin-top: 0;">Verify Your Email Address</h2>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px; margin-bottom: 25px;">
              Dear ${user.firstName},
              <br><br>
              Thank you for registering with Spherify! To complete your registration, please use the verification code below:
            </p>
            
            <div style="background-color: #fff; padding: 15px; margin: 20px auto; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); width: 180px;">
              <div style="letter-spacing: 6px; font-size: 24px; font-weight: bold; color: #5067EB; animation: pulse 2s infinite;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              This code will expire in 10 minutes for security reasons.
            </p>
            
            <div style="margin: 30px 0;">
              <div style="background: linear-gradient(45deg, #5067EB, #7D91FF); width: 100%; height: 10px; border-radius: 5px; margin-bottom: 15px; position: relative; overflow: hidden;">
                <div style="position: absolute; background: rgba(255, 255, 255, 0.3); top: 0; left: -100%; width: 100%; height: 100%; animation: slide 2s infinite;"></div>
              </div>
              <p style="color: #777; font-size: 14px;">Completing verification: 1 of 2 steps</p>
            </div>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
            <p style="color: #777777; margin: 0; font-size: 14px;">
              If you did not create an account with Spherify, please ignore this email.
            </p>
            <p style="color: #777777; margin: 10px 0 0; font-size: 14px;">
              &copy; ${new Date().getFullYear()} Spherify. All rights reserved.
            </p>
          </div>

          <style>
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            @keyframes slide {
              0% { left: -100%; }
              100% { left: 100%; }
            }
          </style>
        </div>
      `,
    };
    
    await sendEmail(emailOptions);

    const token = user.getJwtToken();

    return res.status(201).json({
      success: true,
      message: "Registration initiated! Please check your email for verification code.",
      user,
      token,
      requireOTP: true
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Check if OTP is valid and not expired
    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: user.otpExpiry < Date.now() ? 
          "OTP has expired. Please request a new one." : 
          "Invalid OTP. Please try again."
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Send welcome email
    const welcomeEmailOptions = {
      email: user.email,
      subject: "Welcome to Spherify!",
      message: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #4a4a4a; margin: 0; font-size: 24px;">Spherify</h1>
            <p style="color: #777777; margin: 5px 0 0;">Welcome Aboard!</p>
          </div>
          
          <div style="padding: 20px 0; text-align: center;">
            <div style="text-align: center; margin-bottom: 25px;">
              <div style="display: inline-block; background-color: #5067EB; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; margin-bottom: 15px;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/checkmark.png" width="40" style="vertical-align: middle;">
              </div>
              <h2 style="color: #5067EB; margin: 10px 0;">Registration Complete!</h2>
            </div>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              Dear ${user.firstName},
            </p>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              Your email has been successfully verified and your account is now active. 
              Welcome to the Spherify community!
            </p>
            
            <div style="margin: 30px 0;">
              <a href="https://spherify.vercel.app/login" style="background-color: #5067EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Start Exploring
              </a>
            </div>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              We're excited to have you on board and can't wait to see what you'll accomplish with Spherify!
            </p>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
            <p style="color: #777777; margin: 0; font-size: 14px;">
              If you have any questions, our support team is always here to help.
            </p>
            <p style="color: #777777; margin: 10px 0 0; font-size: 14px;">
              &copy; ${new Date().getFullYear()} Spherify. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };
    
    await sendEmail(welcomeEmailOptions);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    // Send OTP email
    const emailOptions = {
      email: user.email,
      subject: "Spherify - Your New Verification Code",
      message: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #4a4a4a; margin: 0; font-size: 24px;">Spherify</h1>
            <p style="color: #777777; margin: 5px 0 0;">New Verification Code</p>
          </div>
          
          <div style="padding: 20px 0; text-align: center;">
            <h2 style="color: #5067EB; margin-top: 0;">Your New Verification Code</h2>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px; margin-bottom: 25px;">
              Dear ${user.firstName},
              <br><br>
              You requested a new verification code. Please use the code below to verify your email:
            </p>
            
            <div style="background-color: #fff; padding: 15px; margin: 20px auto; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); width: 180px;">
              <div style="letter-spacing: 6px; font-size: 24px; font-weight: bold; color: #5067EB; animation: pulse 2s infinite;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              This code will expire in 10 minutes for security reasons.
            </p>
            
            <div style="margin: 30px 0;">
              <div style="background: linear-gradient(45deg, #5067EB, #7D91FF); width: 100%; height: 10px; border-radius: 5px; margin-bottom: 15px; position: relative; overflow: hidden;">
                <div style="position: absolute; background: rgba(255, 255, 255, 0.3); top: 0; left: -100%; width: 100%; height: 100%; animation: slide 2s infinite;"></div>
              </div>
            </div>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
            <p style="color: #777777; margin: 0; font-size: 14px;">
              If you did not request this code, please ignore this email.
            </p>
            <p style="color: #777777; margin: 10px 0 0; font-size: 14px;">
              &copy; ${new Date().getFullYear()} Spherify. All rights reserved.
            </p>
          </div>

          <style>
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            @keyframes slide {
              0% { left: -100%; }
              100% { left: 100%; }
            }
          </style>
        </div>
      `,
    };
    
    await sendEmail(emailOptions);
    
    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully"
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getUser = async (req, res, next) => {
  const { uid } = req.body;

  console.log(req.body);
  if (!uid) {
    return res.status(400).json({ message: "Please provide UID" });
  }

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getUserByEmail = async (req, res, next) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ message: "Please provide an email" });
  }

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getUserDetails = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res
      .status(400)
      .json({ message: `User does not found with id: ${req.params.id}` });
  }

  return res.status(200).json({
    success: true,
    user,
  });
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    console.log(`Req.files: ${JSON.stringify(req.file)}`);
    const newUserData = {};

    if (req.body.firstName) newUserData.firstName = req.body.firstName;
    if (req.body.lastName) newUserData.lastName = req.body.lastName;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(400)
        .json({ message: `User not found ${req.params.id}` });
    }

    if (user.avatar && user.avatar.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    if (req.file) {
      const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!fileTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported file type! Please upload a JPEG, JPG, or PNG image.",
        });
      }

      const cloudinaryResponse = await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: "avatars",
          width: 150,
          crop: "scale",
        }
      );

      newUserData.avatar = {
        url: cloudinaryResponse.secure_url,
        public_id: cloudinaryResponse.public_id,
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      newUserData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res
        .status(400)
        .json({ message: `User not updated ${req.params.id}` });
    }

    return res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    console.log(`Request Body: ${JSON.stringify(req.body)}`);

    const newUserData = {};
    if (req.body.firstName) newUserData.firstName = req.body.firstName;
    if (req.body.lastName) newUserData.lastName = req.body.lastName;
    if (req.body.email) newUserData.email = req.body.email;
    if (req.body.permissionToken)
      newUserData.permissionToken = req.body.permissionToken;

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: `User not updated ${req.params.id}` });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deletePermissionToken = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { permissionToken: null },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ success: "Permission token removed successfully", user });
  } catch (error) {
    console.error("Error removing token:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateUserAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an avatar image",
      });
    }

    const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!fileTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported file type! Please upload a JPEG, JPG, or PNG image.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`,
      });
    }
    
    if (user.avatar && user.avatar.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });


    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully!",
      user,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getUserStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalActiveUsers = await User.countDocuments({ isDisable: false,  isDisable: false });
    const totalDisabledUsers = await User.countDocuments({ isDisable: true });

    return res.status(200).json({
      success: true,
      totalUsers,
      totalActiveUsers,
      totalDisabledUsers,
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getPastUsersChartData = async (req, res) => {
  try {
    const today = moment().endOf("day"); // Today at 23:59:59
    const past30Days = moment().subtract(30, "days").startOf("day");
    const past12Weeks = moment().subtract(12, "weeks").startOf("isoWeek");
    const past12Months = moment().subtract(12, "months").startOf("month");

    // Count users grouped by day for the last 30 days
    const dailyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: past30Days.toDate() } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Count users grouped by week for the last 12 weeks
    const weeklyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: past12Weeks.toDate() } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%U", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Count users grouped by month for the last 12 months
    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: past12Months.toDate() } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      dailyUsers,
      weeklyUsers,
      monthlyUsers,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

exports.isAdminExists = async (req, res) => {
  try {
    const adminExists = await User.exists({ isAdmin: true });

    return res.status(200).json({
      success: true,
      isAdminExists: !!adminExists,
    });
  } catch (error) {
    console.error("Error checking admin existence:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.disableUser = async (req, res) => {
  try {
    const { startTime, endTime, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailOptions = {
      email: user.email,
      subject: "Spherify Account Suspended",
      message: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #4a4a4a; margin: 0; font-size: 24px;">Spherify</h1>
            <p style="color: #777777; margin: 5px 0 0;">Account Notification</p>
          </div>
          
          <div style="padding: 20px 0;">
            <h2 style="color: #d9534f; margin-top: 0;">Account Temporarily Suspended</h2>
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              Dear ${user.firstName || 'User'},
            </p>
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              We regret to inform you that your Spherify account has been temporarily suspended.
            </p>
            
            <div style="background-color: #fff; border-left: 4px solid #d9534f; padding: 15px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #555555; margin: 0 0 10px; font-weight: bold;">Suspension Details:</p>
              <p style="color: #555555; margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
              <p style="color: #555555; margin: 5px 0;"><strong>Start Time:</strong> ${startTime}</p>
              <p style="color: #555555; margin: 5px 0;"><strong>End Time:</strong> ${endTime}</p>
            </div>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              During this period, you will not be able to access your account or use Spherify services.
              Your account will be automatically reactivated after the suspension period ends.
            </p>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
            <p style="color: #777777; margin: 0; font-size: 14px;">
              If you have any questions about this suspension, please contact our support team.
            </p>
            <p style="color: #777777; margin: 10px 0 0; font-size: 14px;">
              &copy; ${new Date().getFullYear()} Spherify. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };
    sendEmail(emailOptions);

    user.isDisable = true;
    user.disableStartTime = startTime;
    user.disableEndTime = endTime;
    user.disableReason = reason;
    user.disableCount = (user.disableCount || 0) + 1;

    await user.save();

    return res.status(200).json({ success: true, message: "User disabled successfully", user });
  } catch (error) {
    console.error("Error disabling user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.enableUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isDisable: false,
      disableStartTime: null,
      disableEndTime: null,
      disableReason: "",
    }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailOptions = {
      email: user.email,
      subject: "Spherify Account Reactivated",
      message: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #4a4a4a; margin: 0; font-size: 24px;">Spherify</h1>
            <p style="color: #777777; margin: 5px 0 0;">Account Notification</p>
          </div>
          
          <div style="padding: 20px 0;">
            <h2 style="color: #5cb85c; margin-top: 0;">Good News! Your Account is Reactivated</h2>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              Dear ${user.firstName || 'User'},
            </p>
            
            <div style="background-color: #fff; border-left: 4px solid #5cb85c; padding: 15px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #555555; margin: 0; font-size: 16px;">
                We're pleased to inform you that your Spherify account has been reactivated.
                You now have full access to your account and all Spherify services.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://spherify.vercel.app/login" style="background-color: #5cb85c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Log In Now
              </a>
            </div>
            
            <p style="color: #555555; line-height: 1.5; font-size: 16px;">
              Thank you for your patience and understanding. We look forward to continuing to serve you.
            </p>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
            <p style="color: #777777; margin: 0; font-size: 14px;">
              If you have any questions, our support team is always here to help.
            </p>
            <p style="color: #777777; margin: 10px 0 0; font-size: 14px;">
              &copy; ${new Date().getFullYear()} Spherify. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };
    sendEmail(emailOptions);

    return res.status(200).json({ success: true, message: "User enabled successfully", user });
  } catch (error) {
    console.error("Error enabling user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.logUserLogin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { deviceInfo, location } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     req.connection.socket.remoteAddress;
    
    await user.logLogin(ipAddress, deviceInfo, location);
    
    return res.status(200).json({
      success: true,
      message: "Login recorded successfully"
    });
  } catch (error) {
    console.error("Error recording login:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};