const express = require('express');
const router = express.Router();
const postController = require('../controllers/userPostController');
const userAuthMiddleware = require('../middlewares/userAuthMiddleware');

// Routes for managing posts
router.post('/createpost', userAuthMiddleware, postController.createPost);
router.get('/user/getposts', userAuthMiddleware, postController.getPosts);
router.get('/getpostbyid/:postId', userAuthMiddleware, postController.getPostById);
router.patch('/upatepost', userAuthMiddleware, postController.updatePost);
router.delete('/deletepost/:postId', userAuthMiddleware, postController.deletePost);
router.post('/like/:id', userAuthMiddleware, postController.likePost);


router.post('/getallpost', userAuthMiddleware, postController.getAllPosts);
router.get('/user/getposts/:userId', userAuthMiddleware, postController.getPostsByUserId);


// Save/Unsave a post
router.post('/savepost/:saveId', userAuthMiddleware, postController.saveOrUnsavePost);
router.post('/allsavedpost', userAuthMiddleware, postController.getSavedPosts);
router.patch('/pinpost/:postId', userAuthMiddleware, postController.togglePinPost);


// Archive or unarchive post
router.patch('/archivepost/:pageId',userAuthMiddleware, postController.archivePost);
router.get('/allarchivedpost',userAuthMiddleware, postController.getArchivedPosts);
router.get('/archived/:id',userAuthMiddleware, postController.getArchivedPostById);

module.exports = router;
