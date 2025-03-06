const cron = require("node-cron");
const User = require("../models/User");
const moment = require("moment");
const sendEmail = require("../utils/sendEmail");

const enableUsers = async () => {
  try {
    const now = moment().toDate();
    const usersToEnable = await User.find({
      isDisable: true,
      disableEndTime: { $lte: now },
    });

    for (const user of usersToEnable) {
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
              Dear ${user.firstName || "User"},
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
      user.isDisable = false;
      user.disableStartTime = null;
      user.disableEndTime = null;
      await user.save();
    }

    console.log(`Enabled ${usersToEnable.length} users`);
  } catch (error) {
    console.error("Error enabling users:", error);
  }
};

// Schedule the task to run every minute
cron.schedule("* * * * *", enableUsers);
