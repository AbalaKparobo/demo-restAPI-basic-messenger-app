const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../socket');
const User = require('../models/user');
const Post = require('../models/post');

exports.getPosts = async (req, res, next) => {
    const page = req.query.page || 1;
    let itemsPerPage = 2;
    try {
        const totalItems = await Post.find().countDocuments()
        const posts = await Post.find()
        .populate('creator')
        .sort({createdAt: -1})
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage) 
        res.status(200).json({posts: posts, totalItems: totalItems});
    } catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    } 
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const error = new Error('Upload failed, Incorrect data submitted');
        error.statusCode = 422;
        throw error;
    }
    if(!req.file) {
        const error = new Error('No image uploaded');
        error.statusCode = 422;
        throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    const imageUrl = req.file;
    const userId = req.userId
    try {
        const user =   await User.findById(userId)
          if(!user) {
              const error = new Error('No matching user found');
              error.statusCode = 402;
              throw error;
          }
          const post = new Post({
            title: title, 
            content: content, 
            imageUrl: imageUrl.path, 
            creator: user._id
          })
          const savedPost = await post.save()
          user.posts.push(savedPost);
          const result = await user.save();
          io.getIO().emit('posts', {action: 'create', post: post})
          res.status(201).json({
            mesage: 'Successfully added new post',
            post: savedPost,
            creator: {_id: result._id, name: result.name}
           });
    } catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    };    
}

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
    const post = await Post.findById(postId)
        if(!post) {
            const error = new Error('No Post found with these Id');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({message: 'post found and serverd sccefully', post: post});
    } catch(err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.updatePost = async (req, res, next) => {
    const postId = req.params.postId;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const error = new Error('Upload failed, Incorrect data submitted');
        error.statusCode = 422;
        throw error;
    }

    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if(req.file) {
        imageUrl = req.file.path;
    }
    if(!imageUrl) {
        const error = new Error('No Image uploaded');
        error.statusCode = 422;
        throw error;
    }
    try {
    const post = await Post.findById(postId).populate('creator')
        if(!post) {
            const error = new Error('No Post found with these Id');
            error.statusCode = 404;
            throw error;
        }
        if(post.creator._id.toString() !== req.userId) {
            const error = new Error('User is not Authorized for such action');
            error.statusCode = 403;
            throw error;
        }
        if(imageUrl !== post.imageUrl) {
            deleteImg(post.imageUrl);
        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        const result = await post.save();
        io.getIO().emit('posts', {action: 'update', post: result});
        res.status(200).json({message: 'One post updated successfully', post: result});
    } catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId)
            if(!post) {
                const error = new Error('No Post found with these Id');
                error.statusCode = 404;
                throw error;
            }
            //check if current user created the post
            if(post.creator.toString() !== req.userId) {
                const error = new Error('User is not Authorized for such action');
                error.statusCode = 403;
                throw error;
            }

            deleteImg(post.imageUrl);
            const result = await Post.findByIdAndRemove(postId);
            const user = await User.findById(req.userId);
            user.posts.pull(postId);
            const saveduser = await user.save();
            io.getIO().emit('posts', {action: 'delete', post: postId})
            res.status(200).json({message: 'one post deleted successfully'});
    } catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
      }
}

const deleteImg = imgPath => {
    const filePath = path.join(__dirname, '..', imgPath);
    fs.unlink(filePath, err => console.log(err));
}