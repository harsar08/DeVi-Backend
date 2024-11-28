const NotificationUser= require('../models/NotificationUser')
const {sendNotification}  = require('../socketServer')
const createNotification = async (receiverId, senderId, type, message) => {
    try {
      console.log("Received"); // Debug log to ensure function is called.
  
      // Prepare the new notification data.
      const notificationData = {
        sender: senderId,
        type,
        message,
      };
  
      // Find if notifications already exist for the user.
      let userNotifications = await NotificationUser.findOne({ userId: receiverId }).populate("notifications.sender" , 'name profileImg')
  
      if (!userNotifications) {
        // If no notifications exist, create a new document.
        userNotifications = new NotificationUser({
          userId: receiverId,
          notifications: [notificationData], // Add the notification as the first entry.
        });
      } else {
        // If notifications exist, push the new notification to the array.
        userNotifications.notifications.push(notificationData);
      }
  
      // Save the updated document.
      const savedNotification = await (await userNotifications.save()).populate("notifications.sender" ,  'name username profileImg')
  
      if (savedNotification) {
        console.log("Notification Created Successfully");
        sendNotification(receiverId,userNotifications.notifications[userNotifications.notifications.length-1])

        return true;
      }
    } catch (error) {
      console.error("Error creating notification:", error.message);
    }
  };
  

const getNotifications = async (req, res) => {
    try {
      const  userId= req.user._id 
      // Fetch user notifications and sort notifications array by createdAt in descending order
      const notifications = await NotificationUser.findOne({ userId })
        .populate('notifications.sender', 'name username profileImg') // Populate sender details
        .select('notifications') // Select only the notifications field
        .sort({ 'notifications.createdAt': -1 }) // Sort notifications by createdAt in descending order
        .lean(); // Convert to plain JavaScript object
        
        
  
      if (!notifications) {
        return res.status(404).json({ message: "No notifications found" });
      }
  
      res.status(200).json({ 
        message: 'Notifications fetched successfully', 
        data: notifications.notifications 
    });
    
    } catch (error) {
      console.error("Error fetching notifications:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };


  const deleteNotification = async (req, res) => {
    try {
        const { id, userId } = req.params;

        // Find the user and remove the specific notification
        const updatedUser = await NotificationUser.findOneAndUpdate(
            { userId, "notifications._id": id },
            { $pull: { notifications: { _id: id } } }, // Remove the notification from the array
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Notification not found or user does not exist." });
        }

        res.status(200).json({
            success: true,
            message: "Notification deleted successfully.",
           
        });
    } catch (error) {
        console.error("Error deleting notification:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message
        });
    }
};

const updateFriendNotification = async (req, res) => {
    try {
        const { id, userId } = req.params;

        // Update the type of the matched notification
        const updatedNotification = await NotificationUser.findOneAndUpdate(
            { userId, "notifications._id": id }, // Find by userId and notification ID
            { $set: { "notifications.$.type": "looped" } }, // Update the specific notification's type
            { new: true } // Return the updated document
        );

        if (!updatedNotification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found or user does not exist."
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification updated successfully.",
            data: updatedNotification
        });
    } catch (error) {
        console.error("Error updating notification:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message
        });
    }
};

  

  module.exports={
    getNotifications,createNotification,deleteNotification,updateFriendNotification
  }