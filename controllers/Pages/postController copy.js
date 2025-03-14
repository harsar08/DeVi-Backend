const PostModel = require("../../models/Pages/postSchema");
const UserModel = require("../../models/User");
const CommentModel = require("../../models/commentSchema");
const SavePostModel = require("../../models/savePostSchema");
const {
  ReportPostModel,
  reportReasons,
} = require("../../models/reportPostSchema");
const NotInterestedModel = require("../../models/notInterestedSchema");
const UserRelationship = require("../../models/userRelationship");


const createHttpError = require("http-errors");



// Create post

// Update post
exports.updatePost = [
  uploadPostMedia.fields([
    { name: "media", maxCount: 5 },
    { name: "coverPhoto", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res, next) => {
    const userId = req.user.id;
    const { postId } = req.params;
    const { title, description, location, category, subCategory } = req.body;
    const coverPhotoURL = req.files["coverPhoto"]
      ? req.files["coverPhoto"][0].path
      : null;

    try {
      const post = await PostModel.findOne({ _id: postId });

      if (!post) {
        throw createHttpError(404, "Post not found");
      }

      if (post.userId.toString() !== userId) {
        throw createHttpError(401, "This post doesn't belong to this user");
      }

      const updatedPost = await PostModel.findByIdAndUpdate(
        postId,
        {
          title,
          description,
          location,
          category: Array.isArray(category) ? category : [category],
          subCategory: Array.isArray(subCategory) ? subCategory : [subCategory],
          coverPhoto: coverPhotoURL || post.coverPhoto,
        },
        { new: true }
      ).populate("userId", "username name profession following followers");

      res.status(200).json({
        ...updatedPost.toObject(),
        userId: {
          ...updatedPost.userId.toObject(),
          followingCount: updatedPost.userId.following
            ? updatedPost.userId.following.length
            : 0,
          followersCount: updatedPost.userId.followers
            ? updatedPost.userId.followers.length
            : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  },
];

// Function to determine the media type of a post
const classifyMediaType = (post) => {
  if (post.isBlog) {
    return "Blog";
  } else if (post.media && post.media.length > 0) {
    const videos = post.media.filter(
      (media) => media.endsWith(".mp4") || media.endsWith(".mov")
    );

    if (videos.length > 0) {
      return "Video";
    } else {
      return "Image";
    }
  } else if (post.video) {
    return "Video";
  }
  return "Unknown";
};

exports.getAllPosts = async (req, res, next) => {
  const userId = req.user.id;
  console.log("All posts loading...");

  try {
    const reportedPosts = await ReportPostModel.find().select("postId");
    const reportedPostIds = reportedPosts.map((report) =>
      report.postId.toString()
    );
    const notInterestedPosts = await NotInterestedModel.find({ userId }).select(
      "postId"
    );
    const notInterestedPostIds = notInterestedPosts.map((item) =>
      item.postId.toString()
    );
    const notInterestedPostUsers = await PostModel.find({
      _id: { $in: notInterestedPostIds },
    }).select("userId");
    const notInterestedUserIds = notInterestedPostUsers.map((post) =>
      post.userId.toString()
    );

    const excludedPostIds = [...reportedPostIds, ...notInterestedPostIds];

    const posts = await PostModel.find({
      isBlocked: false,
      _id: { $nin: excludedPostIds },
      userId: { $nin: notInterestedUserIds },
    })
      .populate({
        path: "userId",
        select: "username name profession following followers profileImg",
      })
      .sort({ createdAt: -1 }); // First uploaded post comes first

    if (!posts.length) {
      return res.status(404).json({ message: "No posts found" });
    }

    const currentUserRelationship = await UserRelationship.findOne({ userId });

    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = post.userId;

        let friendshipStatus = "none";
        const postUserRelationship = await UserRelationship.findOne({
          userId: user._id,
        });

        if (currentUserRelationship) {
          if (currentUserRelationship.following.includes(user._id)) {
            friendshipStatus = "following";
          }
          if (currentUserRelationship.followers.includes(user._id)) {
            friendshipStatus = "follower";
          }
          if (currentUserRelationship.followRequestsSent.includes(user._id)) {
            friendshipStatus = "requested";
          }
        }

        const mediaType = classifyMediaType(post);

        // Helper function to return empty array if any null values are present in the array
        const cleanArray = (arr) => {
          if (!arr || arr.some((item) => item === null)) {
            return [];
          }
          return arr;
        };

        return {
          ...post.toObject(),
          userId: {
            ...user.toObject(),
            followingCount: user.following ? user.following.length : 0,
            followersCount: user.followers ? user.followers.length : 0,
            friendshipStatus,
          },
          mediaType: mediaType,
          // Check each array to ensure no null values
          category: cleanArray(post.category),
          subCategory: cleanArray(post.subCategory),
          likes: cleanArray(post.likes),
          comments: cleanArray(post.comments),
          shared: cleanArray(post.shared),
        };
      })
    );

    res.status(200).json(postsWithUserDetails);
  } catch (error) {
    next(error);
  }
};

exports.getPostById = async (req, res, next) => {
  const { postId } = req.params;
  const currentUserId = req.user.id;

  try {
    const post = await PostModel.findById(postId).populate({
      path: "userId",
      select: "username name profession following followers profileImg",
    });

    if (!post) {
      throw createHttpError(404, "No Post found with this ID");
    }

    const user = post.userId;
    const mediaType = classifyMediaType(post);

    const currentUserRelationship = await UserRelationship.findOne({
      userId: currentUserId,
    });

    let friendshipStatus = "none";
    if (currentUserRelationship) {
      if (currentUserRelationship.following.includes(user._id)) {
        friendshipStatus = "following";
      }
      if (currentUserRelationship.followers.includes(user._id)) {
        friendshipStatus = "follower";
      }
      if (currentUserRelationship.followRequestsSent.includes(user._id)) {
        friendshipStatus = "requested";
      }
    }

    const cleanArray = (arr) => {
      if (!arr || arr.some((item) => item === null)) {
        return [];
      }
      return arr;
    };

    const postWithUserDetails = {
      ...post.toObject(),
      userId: {
        ...user.toObject(),
        followingCount: user.following ? user.following.length : 0,
        followersCount: user.followers ? user.followers.length : 0,
        friendshipStatus,
      },
      mediaType,
      category: cleanArray(post.category),
      subCategory: cleanArray(post.subCategory),
      likes: cleanArray(post.likes),
      comments: cleanArray(post.comments),
      shared: cleanArray(post.shared),
    };

    res.status(200).json(postWithUserDetails);
  } catch (error) {
    next(error);
  }
};

// Delete a post
exports.deletePost = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const post = await PostModel.findOne({ _id: postId });

    if (!post) {
      throw createHttpError(404, "Post not found");
    }

    if (post.userId.toString() !== userId) {
      throw createHttpError(401, "This post doesn't belong to this user");
    }

    await PostModel.deleteOne({ _id: postId });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Add Comment To Post
exports.addComment = async (req, res, next) => {
  const userId = req.user.id;
  const { postId, comment } = req.body;

  try {
    if (!comment || !postId) {
      throw createHttpError(400, "Parameters Missing");
    }

    const post = await PostModel.findOne({ _id: postId });

    if (!post) {
      throw createHttpError(404, "No Post found with this ID");
    }

    const newComment = await CommentModel.create({ userId, postId, comment });

    await PostModel.updateOne(
      { _id: postId },
      { $push: { comments: newComment._id } }
    );

    res.status(200).json({ status: "success", data: newComment });
  } catch (error) {
    next(error);
  }
};

// Delete Comment From Post
exports.deleteComment = async (req, res, next) => {
  const userId = req.user.id;
  const { postId, commentId } = req.body;

  try {
    if (!commentId || !postId) {
      throw createHttpError(400, "Parameters Missing");
    }

    const post = await PostModel.findOne({ _id: postId });

    if (!post) {
      throw createHttpError(404, "No Post found with this ID");
    }

    const comment = await CommentModel.findOne({ _id: commentId });

    if (!comment) {
      throw createHttpError(404, "Comment not found");
    }

    if (comment.userId.toString() !== userId) {
      throw createHttpError(401, "This comment doesn't belong to this user");
    }

    await CommentModel.deleteOne({ _id: commentId });
    await PostModel.updateOne(
      { _id: postId },
      { $pull: { comments: commentId } }
    );

    res.status(200).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

// Like Post
exports.likePost = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const post = await PostModel.findOne({ _id: postId });

    if (!post) {
      throw createHttpError(404, "No Post found with this ID");
    }

    if (post.likes.includes(userId)) {
      throw createHttpError(400, "User has already liked the post");
    }

    await PostModel.updateOne({ _id: postId }, { $push: { likes: userId } });

    res.status(200).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

// Unlike Post
exports.unlikePost = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const post = await PostModel.findOne({ _id: postId });

    if (!post) {
      throw createHttpError(404, "No Post found with this ID");
    }

    if (!post.likes.includes(userId)) {
      throw createHttpError(400, "User has not liked the post");
    }

    await PostModel.updateOne({ _id: postId }, { $pull: { likes: userId } });

    res.status(200).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

// Save a Post
exports.savePost = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const post = await PostModel.findById(postId);
    if (!post) {
      throw createHttpError(404, "Post not found");
    }

    let savePost = await SavePostModel.findOne({ userId });

    if (!savePost) {
      savePost = await SavePostModel.create({ userId, posts: [postId] });
    } else {
      if (savePost.posts.includes(postId)) {
        return res.status(400).json({ message: "Post is already saved" });
      }

      savePost.posts.push(postId);
      await savePost.save();
    }

    res.status(200).json({ status: "success", data: savePost });
  } catch (error) {
    next(error);
  }
};

// Remove a Post from Saved Posts
exports.removeSavedPost = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const savePost = await SavePostModel.findOne({ userId });

    if (!savePost) {
      throw createHttpError(404, "No saved posts found for this user");
    }

    if (!savePost.posts.includes(postId)) {
      throw createHttpError(404, "Post not found in saved posts");
    }

    savePost.posts = savePost.posts.filter(
      (id) => id.toString() !== postId.toString()
    );
    await savePost.save();

    res.status(200).json({ status: "success", data: savePost });
  } catch (error) {
    next(error);
  }
};

// Get all saved posts of a user
exports.getSavedPosts = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const savePost = await SavePostModel.findOne({ userId }).populate("posts");

    if (!savePost || !savePost.posts.length) {
      return res
        .status(404)
        .json({ message: "No saved posts found for this user" });
    }

    const savedPosts = await PostModel.find({ _id: { $in: savePost.posts } })
      .populate({
        path: "userId",
        select: "username name profession",
      })
      .sort({ createdAt: -1 });

    if (!savedPosts.length) {
      return res.status(404).json({ message: "No saved posts found" });
    }

    const savedPostsWithDetails = savedPosts.map((post) => {
      const user = post.userId;
      const mediaType = classifyMediaType(post);
      return {
        ...post.toObject(),
        userId: {
          ...user.toObject(),
          followingCount: user.following ? user.following.length : 0,
          followersCount: user.followers ? user.followers.length : 0,
        },
        mediaType: mediaType,
      };
    });

    res.status(200).json(savedPostsWithDetails);
  } catch (error) {
    next(error);
  }
};

// Get Saved Posts
exports.getSavedPost = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const savePost = await SavePostModel.findOne({ userId }).populate("posts");

    if (!savePost) {
      return res
        .status(404)
        .json({ message: "No saved posts found for this user" });
    }

    res.status(200).json({ status: "success", data: savePost.posts });
  } catch (error) {
    next(error);
  }
};

// // Get all posts by a user, excluding reported posts
// exports.getPostsByUser = async (req, res, next) => {
//   const { userId } = req.params;

//   try {
//     const reportedPosts = await ReportPostModel.find().select('postId');
//     const reportedPostIds = reportedPosts.map(report => report.postId.toString());

//     const posts = await PostModel.find({
//         userId,
//         isBlocked: false,
//         _id: { $nin: reportedPostIds }
//       })
//       .populate({
//         path: 'userId',
//         select: 'username profession name profileImg',
//       })
//       .sort({ createdAt: -1 });

//     if (!posts.length) {
//       return res.status(404).json({ message: 'No posts found for this user' });
//     }

//     const postsWithUserDetails = posts.map(post => {
//       const user = post.userId;
//       const mediaType = classifyMediaType(post);
//       return {
//         ...post.toObject(),
//         userId: {
//           ...user.toObject(),
//           followingCount: user.following ? user.following.length : 0,
//           followersCount: user.followers ? user.followers.length : 0,
//         },
//         mediaType,
//       };
//     });

//     res.status(200).json(postsWithUserDetails);
//   } catch (error) {
//     next(error);
//   }
// };

// exports.getPostsByCategory = async (req, res, next) => {
//   const { category } = req.params;
//   const userId = req.user.id;

//   try {

//     const reportedPosts = await ReportPostModel.find().select('postId');
//     const reportedPostIds = reportedPosts.map(report => report.postId.toString());
//     const notInterestedPosts = await NotInterestedModel.find({ userId }).select('postId');
//     const notInterestedPostIds = notInterestedPosts.map(notInterested => notInterested.postId.toString());
//     const notInterestedPostUsers = await PostModel.find({ _id: { $in: notInterestedPostIds } }).select('userId');
//     const notInterestedUserIds = notInterestedPostUsers.map(post => post.userId.toString());

//     const excludedPostIds = [...reportedPostIds, ...notInterestedPostIds];

//     const posts = await PostModel.find({
//         category: { $regex: new RegExp(`^${category}$`, 'i') },
//         isBlocked: false,
//         _id: { $nin: excludedPostIds },
//         userId: { $nin: notInterestedUserIds },
//       })
//       .populate({
//         path: 'userId',
//         select: 'username name profession followers following profileImg',
//       })
//       .populate({
//         path: 'likes',
//         select: 'username name',
//       })
//       .sort({ createdAt: -1 });

//     if (!posts.length) {
//       return res.status(404).json({ message: 'No posts found for this category' });
//     }

//     const postsWithDetails = posts.map(post => {
//       const user = post.userId;
//       const mediaType = classifyMediaType(post);

//       return {
//         ...post.toObject(),
//         userId: {
//           ...user.toObject(),
//           followingCount: user.following ? user.following.length : 0,
//           followersCount: user.followers ? user.followers.length : 0,
//         },
//         likes: post.likes,
//         mediaType,
//       };
//     });
//     res.status(200).json(postsWithDetails);
//   } catch (error) {
//     next(error);
//   }
// };

exports.getPostsByUser = async (req, res, next) => {
  const { userId } = req.params;

  try {
    const reportedPosts = await ReportPostModel.find().select("postId");
    const reportedPostIds = reportedPosts.map((report) =>
      report.postId.toString()
    );

    const posts = await PostModel.find({
      userId,
      isBlocked: false,
      _id: { $nin: reportedPostIds },
    })
      .populate({
        path: "userId",
        select: "username profession name profileImg",
      })
      .sort({ createdAt: -1 });

    if (!posts.length) {
      return res.status(404).json({ message: "No posts found for this user" });
    }

    const currentUserId = req.user.id;
    const currentUserRelationship = await UserRelationship.findOne({
      userId: currentUserId,
    });

    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = post.userId;
        const mediaType = classifyMediaType(post);

        let relationshipStatus = "none";
        if (currentUserRelationship) {
          if (currentUserRelationship.following.includes(user._id)) {
            relationshipStatus = "following";
          }
          if (currentUserRelationship.followers.includes(user._id)) {
            relationshipStatus = "follower";
          }
          if (currentUserRelationship.followRequestsSent.includes(user._id)) {
            relationshipStatus = "requested";
          }
        }
        const cleanArray = (arr) => {
          if (!arr || arr.some((item) => item === null)) {
            return [];
          }
          return arr;
        };

        return {
          ...post.toObject(),
          userId: {
            ...user.toObject(),
            followingCount: user.following ? user.following.length : 0,
            followersCount: user.followers ? user.followers.length : 0,
            relationshipStatus,
          },
          mediaType,
          category: cleanArray(post.category),
          subCategory: cleanArray(post.subCategory),
          likes: cleanArray(post.likes),
          comments: cleanArray(post.comments),
          shared: cleanArray(post.shared),
        };
      })
    );

    res.status(200).json(postsWithUserDetails);
  } catch (error) {
    next(error);
  }
};

exports.getPostsByCategory = async (req, res, next) => {
  const { category } = req.params;
  const userId = req.user.id;

  try {
    const reportedPosts = await ReportPostModel.find().select("postId");
    const reportedPostIds = reportedPosts.map((report) =>
      report.postId.toString()
    );
    const notInterestedPosts = await NotInterestedModel.find({ userId }).select(
      "postId"
    );
    const notInterestedPostIds = notInterestedPosts.map((notInterested) =>
      notInterested.postId.toString()
    );
    const notInterestedPostUsers = await PostModel.find({
      _id: { $in: notInterestedPostIds },
    }).select("userId");
    const notInterestedUserIds = notInterestedPostUsers.map((post) =>
      post.userId.toString()
    );

    const excludedPostIds = [...reportedPostIds, ...notInterestedPostIds];

    const posts = await PostModel.find({
      category: { $regex: new RegExp(`^${category}$`, "i") },
      isBlocked: false,
      _id: { $nin: excludedPostIds },
      userId: { $nin: notInterestedUserIds },
    })
      .populate({
        path: "userId",
        select: "username name profession followers following profileImg",
      })
      .populate({
        path: "likes",
        select: "username name",
      })
      .sort({ createdAt: -1 });

    if (!posts.length) {
      return res
        .status(404)
        .json({ message: "No posts found for this category" });
    }

    const currentUserRelationship = await UserRelationship.findOne({ userId });

    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const user = post.userId;
        const mediaType = classifyMediaType(post);

        let relationshipStatus = "none";
        if (currentUserRelationship) {
          if (currentUserRelationship.following.includes(user._id)) {
            relationshipStatus = "following";
          }
          if (currentUserRelationship.followers.includes(user._id)) {
            relationshipStatus = "follower";
          }
          if (currentUserRelationship.followRequestsSent.includes(user._id)) {
            relationshipStatus = "requested";
          }
        }

        const cleanArray = (arr) => {
          if (!arr || arr.some((item) => item === null)) {
            return [];
          }
          return arr;
        };

        return {
          ...post.toObject(),
          userId: {
            ...user.toObject(),
            followingCount: user.following ? user.following.length : 0,
            followersCount: user.followers ? user.followers.length : 0,
            relationshipStatus,
          },
          //likes: post.likes,
          mediaType,
          category: cleanArray(post.category),
          subCategory: cleanArray(post.subCategory),
          likes: cleanArray(post.likes),
          comments: cleanArray(post.comments),
          shared: cleanArray(post.shared),
        };
      })
    );

    res.status(200).json(postsWithDetails);
  } catch (error) {
    next(error);
  }
};

exports.reportPost = async (req, res, next) => {
  const userId = req.user.id;
  const postId = req.params.postId;
  const { reason, details } = req.body;
  console.log("ethalle request body: " + JSON.stringify(req.body));

  try {
    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existingReport = await ReportPostModel.findOne({
      postId,
      reportedBy: userId,
    });
    if (existingReport) {
      return res
        .status(400)
        .json({ error: "You have already reported this post" });
    }

    if (!reportReasons.includes(reason)) {
      return res.status(400).json({ error: "Invalid report reason" });
    }

    const newReport = await ReportPostModel.create({
      postId,
      reportedBy: userId,
      reason,
      details,
    });

    res
      .status(201)
      .json({ message: "Post reported successfully", report: newReport });
  } catch (error) {
    next(error);
  }
};

// Unreport a post
exports.unreportPost = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const report = await ReportPostModel.findOne({
      postId,
      reportedBy: userId,
    });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    await ReportPostModel.deleteOne({ _id: report._id });

    res.status(200).json({ message: "Post unreported successfully" });
  } catch (error) {
    next(error);
  }
};

// Get all reported posts by the current user
exports.getReportedPosts = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const reports = await ReportPostModel.find({ reportedBy: userId }).populate(
      "postId"
    );

    if (!reports.length) {
      return res.status(404).json({ message: "No reported posts found" });
    }
    const reportedPosts = reports.map((report) => report.postId);
    res.status(200).json(reportedPosts);
  } catch (error) {
    next(error);
  }
};

// Mark post as Not Interested
exports.markAsNotInterested = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;
  const { reason } = req.body;
  console.log("Ethalle Id: " + req.params);

  try {
    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const existingEntry = await NotInterestedModel.findOne({ userId, postId });
    if (existingEntry) {
      return res
        .status(400)
        .json({ message: "Post already marked as Not Interested" });
    }

    const newNotInterested = new NotInterestedModel({
      userId,
      postId,
      reason,
    });

    await newNotInterested.save();
    res
      .status(201)
      .json({ message: "Post marked as Not Interested successfully" });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Get posts marked as Not Interested by user
exports.getNotInterestedPosts = async (req, res, next) => {
  const userId = req.user.id;

  // try {
  //   const notInterestedPosts = await NotInterestedModel.find({ userId })
  //     .populate('postId', 'title description media')
  //     .populate('userId', 'username name');

  try {
    const notInterestedPosts = await NotInterestedModel.find({
      userId,
    }).populate({
      path: "postId",
      select: "title description media video coverPhoto",
      populate: {
        path: "userId",
        select: "username name profileImg",
      },
    });

    res.status(200).json(notInterestedPosts);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Remove post from Not Interested list
exports.removeNotInterested = async (req, res, next) => {
  const userId = req.user.id;
  const { postId } = req.params;
  console.log("Ethalle Id: " + req.params);

  try {
    const post = await NotInterestedModel.findOneAndDelete({ userId, postId });
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found in Not Interested list" });
    }

    res.status(200).json({ message: "Post removed from Not Interested list" });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
