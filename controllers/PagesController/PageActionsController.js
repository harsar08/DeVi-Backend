const { messaging } = require("firebase-admin");
const PageActions = require("../../models/Pages Model/PageActionsModel");
const { find } = require("../../models/User");


const updateUserBlockEntry = async (req, res) => {
  const { pageId, blockpageId } = req.params;

  try {
    // Check if blockpageId is already in the blockedList
    const isBlocked = await PageActions.findOne({
      pageId,
      blockedList: { $in: [blockpageId] },
    });

    if (isBlocked) {
      // If the page is already blocked, remove it from the blockedList (unblock)
      const unblockEntry = await PageActions.updateOne(
        { pageId },
        { $pull: { blockedList: blockpageId } }
      );

      if (unblockEntry) {
        return res
          .status(200)
          .json({ success: true, message: "Page unblocked successfully." });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Failed to unblock page." });
      }
    }

    // If not blocked, add the blockpageId to the blockedList (block)
    const updatedBlockEntry = await PageActions.findOneAndUpdate(
      { pageId },
      { $push: { blockedList: blockpageId } },
      { new: true, upsert: true } // Create a new entry if it doesn't exist
    );

    if (updatedBlockEntry) {
      return res
        .status(200)
        .json({ success: true, message: "Page blocked successfully." });
    }

    // If something goes wrong
    return res
      .status(500)
      .json({ success: false, message: "Failed to block page." });

  } catch (error) {
    console.error("Error updating block entry:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while blocking/unblocking the page.",
    });
  }
};


// const addToFollowing = async (req, res) => {
//   try {
//     const { pageId, followingId } = req.params;

//     // Check if the page is already followed
//     const isFollowed = await PageActions.findOne({
//       pageId,
//       followingList: { $in: [followingId] },
//     });

//     if (isFollowed) {
//       return res
//         .status(400)
//         .json({ success: false, message: "This page is already followed." });
//     }

//     // If not followed, add it to the followingList
//     const updatedPageActions = await PageActions.findOneAndUpdate(
//       { pageId },
//       { $push: { followingList: followingId } },
//       { new: true, upsert: true } // `upsert` creates a new record if none exists
//     );
//     const addToFollowers = await PageActions.findOneAndUpdate(
//       { pageId: followingId },
//       { $push: { followersList: pageId } },
//       { new: true, upsert: true } // Make sure to return the updated document and create a new one if it doesn't exist
//     );

//     if (addToFollowers) {
//       return res.status(200).json({
//         success: true,
//         message: "Page followed successfully.",
//         data: updatedPageActions,
//       });
//     } else {
//     }
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ success: false, message: "Server error.", error: error.message });
//   }
// };


// const unFollowing = async (req, res) => {
//   try {
//     const { pageId, unfollowingId } = req.params;

// console.log(unfollowingId,'unfollowingId');

//     // Use MongoDB's $pull to remove unfollowingId from followingList and pageId from followersList
//     const pageActionUpdate = await PageActions.updateOne(
//       { pageId },
//       { $pull: { followingList: unfollowingId } }
//     );

//     const unfollowedPageActionUpdate = await PageActions.updateOne(
//       { pageId: unfollowingId },
//       { $pull: { followersList: pageId } }
//     );

//     // Check if the updates affected any documents
//     if (pageActionUpdate.nModified === 0 || unfollowedPageActionUpdate.nModified === 0) {
//       return res.status(400).json({ success: false, message: "Unfollowing operation failed" });
//     }

//     return res.status(200).json({ success: true, message: "Successfully unfollowed the Page" });
    
//   } catch (error) {
//     console.error("Error updating the document:", error); // Log error for debugging
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };


const getAllFollowers = async (req, res) => {
  try {
    const pageId = req.params.pageId;

    const allFollowers = await PageActions.findOne(
      { pageId },
      { followersList: 1 }
    );

    if (allFollowers) {
      res.status(200).json({
        success: true,
        message: "All followers fetched successfully",
        followers: allFollowers.followersList,
      });
    } else {
      res
        .status(404)
        .json({ succes: false, message: "all followers fetching fail" });
    }
  } catch (error) {
    res.status(500).json({ succes: false, message: "server Error" });
  }
};
const getAllFollowing = async (req, res) => {
  try {
    const pageId = req.params.pageId;

    const allFollowing = await PageActions.findOne(
      { pageId },
      { followingList: 1 }
    );

    if (allFollowing) {
      res.status(200).json({
        success: true,
        message: "All following fetched successfully",
        following: allFollowing.followingList,
      });
    } else {
      res
        .status(404)
        .json({ succes: true, message: "all following fetching fail" });
    }
  } catch (error) {
    res.status(500).json({ succes: true, message: "server Error" });
  }
};





const followActions = async (req, res) => {
  try {
    const { pageId, followId } = req.params;

    // Check if the page is already followed
    const isFollowed = await PageActions.findOne({
      pageId,
      followingList: { $in: [followId] },
    });

    if (isFollowed) {
      // Unfollow logic: remove followId from followingList and pageId from followersList
      const pageActionUpdate = await PageActions.updateOne(
        { pageId },
        { $pull: { followingList: followId } }
      );

      const unfollowedPageActionUpdate = await PageActions.updateOne(
        { pageId: followId },
        { $pull: { followersList: pageId } }
      );

      if (pageActionUpdate && unfollowedPageActionUpdate) {
        return res.status(200).json({ success: true, message: "Unfollowed successfully" });
      }
    } else {
      // Follow logic: add followId to followingList and pageId to followersList
      const updatedPageActions = await PageActions.findOneAndUpdate(
        { pageId },
        { $push: { followingList: followId } },
        { new: true, upsert: true }
      );

      const addToFollowers = await PageActions.findOneAndUpdate(
        { pageId: followId },
        { $push: { followersList: pageId } },
        { new: true, upsert: true }
      );

      if (updatedPageActions && addToFollowers) {
        return res.status(200).json({ success: true, message: "Followed successfully" });
      }
    }

    // If something goes wrong
    return res.status(500).json({ success: false, message: "Something went wrong" });

  } catch (error) {
    // Handle any errors
    console.error("Error in followActions:", error);
    return res.status(500).json({ success: false, message: "Server error", error });
  }
};



module.exports = {
  updateUserBlockEntry,
  // addToFollowing,
  // unFollowing,
  getAllFollowers,
  getAllFollowing,
  followActions
};