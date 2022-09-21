const { validationResult } = require('express-validator');
const mongodb = require('mongodb');
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const fetch = require('node-fetch');
const fileHelper = require('../util/file');
const user = require('../models/user');
const bcrypt = require('bcryptjs');

const ITEMS_PER_PROFILE_PAGE = 5;
const ITEMS_PER_FEED_PAGE = 10;

const getLikes = (user, id, comments, obj) => {
    return new Promise((resolve, reject) => {
        Comment.find({ postId: id })
            .then(postComments => {
                for (let i = 0; i < postComments.length; i++) {
                    if (postComments[i].isLike) {
                        obj.likes += 1;
                        if (postComments[i].userId = user) {
                            obj.liked = true;
                        }
                    } else {
                        comments.push(postComments[i])
                    }
                }
                resolve('successful')
            })
            .catch(err => {
                reject(err);
            })

    })
}

exports.getProfile = (req, res, next) => {
    const followers = req.user.following.users;
    const page = +req.query.page || 1;
    const visiting = req.params.userId;
    const isFollowing = req.user.isFollowing(visiting);

    let totalPosts;
    let likes = [];
    let liked = [];
    let feed = [];

    // console.log(req.user.following);

    User.findById(visiting)
        .then(user => {
            const mainUser = req.user;
            const username = user.name;
            const id = mainUser._id;
            const following = user.following.users.length;
            //find post for user
            Post.find({ userId: visiting }).countDocuments()
                .then(numPosts => {
                    totalPosts = numPosts;
                    // console.log(totalPosts);
                    return Post.find({ userId: visiting })
                        .skip((page - 1) * ITEMS_PER_PROFILE_PAGE)
                        .limit(ITEMS_PER_PROFILE_PAGE)
                })
                .then(async posts => {
                    feed = posts;
                    for (post of posts) {
                        const postId = post._id;
                        let comments = [];
                        let obj = { likes: 0, liked: false };
                        await getLikes(req.user._id, postId, comments, obj).then(() => {
                            likes.push(obj.likes);
                            liked.push(obj.liked);
                        })
                    }
                }).then(() => {
                    // If the user is the owner of the Profile, they are allowed to edit
                    if (mainUser._id.toString() == visiting.toString()) {
                        return res.render('user/profile', {
                            path: '/profile',
                            pageTitle: 'Pictournal | Profile',
                            username: username,
                            posts: feed,
                            following: following,
                            user: user,
                            profileUser: user,
                            canEdit: true,
                            isFollowing: isFollowing,
                            likes: likes,
                            liked: liked,
                            currentPage: page,
                            hasNextPage: ITEMS_PER_PROFILE_PAGE * page < totalPosts,
                            hasPreviousPage: page > 1,
                            nextPage: page + 1,
                            previousPage: page - 1,
                            lastPage: Math.ceil(totalPosts / ITEMS_PER_PROFILE_PAGE)
                        });
                    }
                    // If the user does not own the profile, they cannot edit
                    return res.render('user/profile', {
                        path: '/profile',
                        pageTitle: 'Pictournal | Profile',
                        username: username,
                        posts: feed,
                        following: following,
                        user: mainUser,
                        profileUser: user,
                        canEdit: false,
                        isFollowing: isFollowing,
                        likes: likes,
                        liked: liked,
                        currentPage: page,
                        hasNextPage: ITEMS_PER_PROFILE_PAGE * page < totalPosts,
                        hasPreviousPage: page > 1,
                        nextPage: page + 1,
                        previousPage: page - 1,
                        lastPage: Math.ceil(totalPosts / ITEMS_PER_PROFILE_PAGE)
                    })
                });
        })
        .catch(err => {
            res.redirect('/404');
        })
};

exports.getEditProfile = (req, res, next) => {
    const user = req.user;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('user/edit-profile', {
            path: '/profile',
            pageTitle: 'Edit Profile',
            validationErrors: errors.array(),
            user: user
        })
    } else {
        return res.render('user/edit-profile', {
            path: '/profile',
            pageTitle: 'Pictournal | Edit Profile',
            validationErrors: [],
            user: user
        })
    }
};

exports.postEditProfile = async(req, res, next) => {
    const username = req.body.user_name;
    const oldPass = req.body.old_password;
    const newPass = req.body.new_password;
    const bio = req.body.user_bio;
    const userId = req.body.userId;
    const image = req.file;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).render('user/edit-profile', {
            path: '/profile',
            pageTitle: 'Pictournal | Edit Profile',
            username: username,
            bio: bio,
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    if (oldPass && newPass) {
        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        if (user._id.toString() !== req.user._id.toString()) {
            return res.redirect('/');
        }
        try {
            const isEqual = await bcrypt.compare(oldPass, user.password);
            if (!isEqual) {
                const error = new Error('Wrong password!');
                error.statusCode = 401;
                throw error;
            }
            user.name = username;
            user.bio = bio;
            user.password = await bcrypt.hash(newPass, 12);
            if (image) {
                if (user.profileImgUrl) {
                    fileHelper.deleteFile(user.profileImgUrl);
                }
                user.profileImgUrl = image.path;
            }
            return user.save()
                .then(result => {
                    res.redirect('/profile/' + user._id);
                });

        } catch (err) {
            console.log(err);
        };
    } else {
        User.findById(userId)
            .then(user => {
                if (user._id.toString() !== req.user._id.toString()) {
                    return res.redirect('/');
                }
                user.name = username;
                user.bio = bio;
                if (image) {
                    if (user.profileImgUrl) {
                        fileHelper.deleteFile(user.profileImgUrl);
                    }
                    user.profileImgUrl = image.path;
                }
                return user.save()
                    .then(result => {
                        res.redirect('/profile/' + user._id);
                    });

            })
    };
};

exports.getFollowing = (req, res, next) => {
    const userFollows = req.params.userId;

    User.findById(userFollows)
        .then(user => {
            user
                .populate('following.users.userId')
                .execPopulate()
                .then(user => {
                    const following = user.following.users;
                    res.render('user/follow-list', {
                        path: '/profile',
                        pageTitle: 'Following',
                        user: req.user,
                        following: following,
                        profileUser: user
                    })
                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.postFollow = (req, res, next) => {
    const userId = req.body.userId;
    User.findById(userId)
        .then(userToFollow => {
            return req.user.follow(userToFollow);
        })
        .then(result => {
            res.redirect('/profile/' + userId);
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.postUnfollow = (req, res, next) => {
    const userId = req.body.userId;
    User.findById(userId)
        .then(userToUnfollow => {
            return req.user.unfollow(userToUnfollow);
        })
        .then(result => {
            res.redirect('/profile/' + userId);
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.getFeed = (req, res, next) => {
    const followers = req.user.following.users;
    const page = +req.query.page || 1;

    let totalPosts;
    let likes = [];
    let liked = [];
    let feed = [];
    const id = [];


    for (follower of followers) {
        id.push(new mongodb.ObjectId(follower.userId));
    }
    Post.find({ userId: { $in: id } }).countDocuments()
        .then(numPosts => {
            totalPosts = numPosts;
            // console.log(totalPosts);
            return Post.find({ userId: { $in: id } })
                .skip((page - 1) * ITEMS_PER_FEED_PAGE)
                .limit(ITEMS_PER_FEED_PAGE)
        }).then(async posts => {
            feed = posts;
            for (post of posts) {
                const postId = post._id;
                let comments = [];
                let obj = { likes: 0, liked: false };
                await getLikes(req.user._id, postId, comments, obj).then(() => {
                    likes.push(obj.likes);
                    liked.push(obj.liked);
                })
            }
        }).then(() => {
            res.render('user/feed', {
                path: '/feed',
                pageTitle: 'Pictournal | Your Feed',
                user: req.user,
                posts: feed,
                likes: likes,
                liked: liked,
                currentPage: page,
                hasNextPage: ITEMS_PER_FEED_PAGE * page < totalPosts,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalPosts / ITEMS_PER_FEED_PAGE)
            });
        });
};

exports.newPost = (req, res, next) => {
    res.render('user/newPost', {
        path: '/newPost',
        pageTitle: 'Pictournal | New Post',
        user: req.user
    })
};

exports.editPost = (req, res, next) => {
    const id = req.params.postId;

    Post.findById(new mongodb.ObjectId(id)).then(post => {
        let postTags = '';
        for (tag of post.tags) {
            postTags += "#";
            postTags += tag;
        }
        res.render('user/editPost', {
            path: '/editPost',
            pageTitle: 'Pictournal | Edit Post',
            user: req.user,
            post: post,
            id: post._id,
            tags: postTags,
            privacy: post.privacy
        })
    });
};

exports.postEditPost = (req, res, next) => {
    const tags = (req.body.tags).split("#");
    const description = req.body.post_desc;
    const privacy = req.body.privacy;
    const time = new Date();
    const image = req.file;
    const id = req.body.postId;

    Post.findById(id).then(post => {
        post.tags = tags;
        post.description = description;
        post.privacy = privacy;
        post.time = time;
        if (image) {
            if (post.image) {
                fileHelper.deleteFile(post.image);
            }
            post.image = image.path;
        }
        return post.save()
            .then(result => {
                res.redirect('/postDetails/' + post._id);
            });
    });
};

exports.postDeletePost = (req, res, next) => {
    const id = req.body.postId;

    Post.findById(id).then(post => {

        fileHelper.deleteFile(post.image);
        return post.deleteOne({ _id: id, userId: req.user._id })
            .then(result => {
                res.redirect('/profile/' + req.user._id);
            });
    });
};

exports.postNewPost = (req, res, next) => {
    const tags = (req.body.tags).split("#");
    const description = req.body.post_desc;
    const privacy = req.body.privacy;
    const time = new Date();
    const userId = req.user._id
    const image = req.file;

    const post = new Post({
        userId: userId,
        time: time,
        image: image.path,
        tags: tags,
        description: description,
        privacy: privacy
    });
    post.save()
        .then(result => {
            res.redirect('/postDetails/' + post._id);
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })

};

exports.postDetails = (req, res, next) => {
    const id = req.params.postId;
    // console.log(id);
    let comments = [];
    let likes = 0;
    let liked = false;

    Comment.find({ postId: new mongodb.ObjectId(id) }).then(postComments => {
            for (let i = 0; i < postComments.length; i++) {
                if (postComments[i].isLike) {
                    likes += 1;
                    if (postComments[i].userId = req.user._id) {
                        liked = true;
                    }
                } else {
                    comments.push(postComments[i])
                }
            }
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })

    Post.findById(id).then(post => {
        User.findById(post.userId).then(author => {
            res.render('user/postDetails', {
                path: '/postDetails',
                pageTitle: 'Pictournal | Post Details',
                user: req.user,
                author: author,
                post: post,
                comments: comments,
                likes: likes,
                userLiked: liked
            })
        });
    });
};

exports.newComment = (req, res, next) => {
    const id = req.params.postId;
    let comments = [];
    let likes = 0;
    let liked = false;

    Comment.find({ postId: id })
        .then(postComments => {
            for (let i = 0; i < postComments.length; i++) {
                if (postComments[i].isLike) {
                    likes += 1;
                    if (postComments[i].userId = req.user._id) {
                        liked = true;
                    }
                } else {
                    comments.push(postComments[i])
                }
            }
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })

    Post.findById(id).then(post => {
        User.findById(post.userId).then(author => {
            res.render('user/newComment', {
                path: '/newCOmment',
                pageTitle: 'New Comment',
                user: req.user,
                author: author,
                post: post,
                comments: comments,
                likes: likes,
                userLiked: liked
            })
        });
    });
};



exports.likePost = (req, res, next) => {
    const postId = req.params.postId;
    const page = req.params.page;
    const user = req.user._id;
    const comment = new Comment({
        userId: user,
        postId: postId,
        isLike: true,
        time: new Date()
    });
    comment.save()
        .then(result => {
            if (page == 'postDetails') {
                res.redirect(`/${page}/${postId}`);
            } else if (page == 'feed') {
                res.redirect(`/${page}`)
            } else {
                res.redirect(`/profile/${page}`);
            }
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postComment = (req, res, next) => {
    const postId = req.body.postId
    const desc = req.body.description;
    const user = req.user._id;
    const name = req.user.name;
    const comment = new Comment({
        userId: user,
        username: name,
        postId: postId,
        isLike: false,
        description: desc,
        time: new Date()
    });
    comment.save()
        .then(result => {
            res.redirect(`/postDetails/${postId}`);
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};