const Admin = require('../../models/adminModel');
const Media = require('../../models/visioFeed');
const UserAvatar = require('../../models/userAvatarSchema');
const PageAvatar = require('../../models/Pages/pageAvatarSchema');
const { signToken } = require('../../utils/jwtUtils');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../../config/cloudinaryConfig');
const multer = require('multer');

// Login function
exports.login = async function(req, res) {
  const { username, password } = req.body;
  console.log(req.body);

  try {
    const admin = await Admin.findOne({ username });

    if (!admin || admin.password !== password) {
      return res.status(401).json({ message: 'Invalid user' });
    }
    

    const token = signToken(admin._id);
    console.log("varanille data:" +admin._id);
    
    res.json({ token,
      adminId: admin._id,
      username: admin.username
     });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};






// Configure Cloudinary storage for media uploads (images/videos)
const mediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'admin_post_media';
    if (file.mimetype.startsWith('video')) {
      folder = 'admin_post_videos';
    }

    return {
      folder: folder,
      resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
    };
  },
});

// Multer middleware for handling media uploads
const uploadMedia = multer({ storage: mediaStorage });




// Create post (Admin)
exports.createPost = [
  
  uploadMedia.fields([
    { name: 'mediaUrl', maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const {description, platform, usernameOrName, location, categories, subCategories } = req.body;

      const mediaURLs = req.files['mediaUrl'] ? req.files['mediaUrl'].map(file => file.path) : [];

      if (!description || !platform || !usernameOrName || !mediaURLs.length) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

     
      const newPost = new Media({
        mediaUrl: mediaURLs[0],
        description,
        platform,
        usernameOrName,
        location,
        categories,
        //categories: Array.isArray(categories) ? categories : [categories],
        subCategories: Array.isArray(subCategories) ? subCategories : [subCategories],
      });

     
      await newPost.save();

     
      res.status(201).json(newPost);
    } catch (error) {
      console.error('Error creating post:', error);
      return res.status(500).json({ message: 'Error creating post', error: error.message });
    }
  },
];




exports.updatePost = [
  uploadMedia.fields([{ name: 'mediaUrl', maxCount: 5 }]),
  async (req, res) => {
    const postId = req.params.id;

    try {
      const { description, platform, usernameOrName, location, categories, subCategories } = req.body;

    
      const mediaURLs = req.files && req.files['mediaUrl'] ? req.files['mediaUrl'].map(file => file.path) : null;

      const updateData = {
        description,
        platform,
        usernameOrName,
        location,
        categories,
        //categories: Array.isArray(categories) ? categories : [categories],
        subCategories: Array.isArray(subCategories) ? subCategories : [subCategories],
      };

      if (mediaURLs) {
        updateData.mediaUrl = mediaURLs[0];
      }

      const updatedPost = await Media.findByIdAndUpdate(postId, updateData, { new: true });

      if (!updatedPost) {
        return res.status(404).json({ message: 'Post not found' });
      }

      res.json(updatedPost);
    } catch (err) {
      res.status(500).json({ message: 'Error updating post', error: err.message });
    }
  }
];


// Delete a post by ID
exports.deletePost = async (req, res) => {
  const postId = req.params.id;
  console.log("id ethann: " +postId)
  try {
    const deletedPost = await Media.findByIdAndDelete(postId);
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting post', error: err.message });
  }
};

// Get all feeds (posts)
exports.getAllFeeds = async (req, res) => {
  try {
    const feeds = await Media.find({});
    res.json(feeds);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching feeds', error: err.message });
  }
};

// Get a single feed by ID
exports.getFeedById = async (req, res) => {
  const postId = req.params.id;
  try {
    const feed = await Media.findById(postId);
    if (!feed) {
      return res.status(404).json({ message: 'Feed not found' });
    }
    res.json(feed);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching feed', error: err.message });
  }
};


exports.uploadUserAvatar = async (req, res) => {
  try {
    const { category } = req.body;

    // Extract avatar details from the uploaded files
    const avatarFile = req.files["avatar"]?.[0];
    if (!avatarFile) {
      return res.status(400).json({ message: "Avatar is required" });
    }

    const avatarUrl = {
      path: avatarFile.path,
      public_id: avatarFile.filename,
    };

    // Create a new UserAvatar instance
    const newAvatar = new UserAvatar({
      category,
      avatarName: avatarUrl,
    });

    // Save the avatar to the database
    await newAvatar.save();

    res.status(200).json({
      message: "Avatar uploaded successfully",
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



exports.uploadPageAvatar = async (req, res) => {
  try {
    const { category } = req.body;

    // Extract avatar details from the uploaded files
    const avatarFile = req.files["avatar"]?.[0];
    if (!avatarFile) {
      return res.status(400).json({ message: "Avatar is required" });
    }
    
    const avatarUrl = {
      path: avatarFile.path,
      public_id: avatarFile.filename,
    };

    // Create a new UserAvatar instance
    const newAvatar = new PageAvatar({
      category,
      avatarName: avatarUrl,
    });

    // Save the avatar to the database
    await newAvatar.save();

    res.status(200).json({
      message: "Avatar uploaded successfully",
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
