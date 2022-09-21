const { validationResult } = require('express-validator');
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const fetch = require('node-fetch');
const fileHelper = require('../util/file');
var uuid = require('uuid-random');


// RANDOM USER CONTENT
exports.randomEmail = (req, res, next) => {
    return req.email_u + "@" + req.email_d;
}

exports.randomBio = (req, res, next) => {
    var bio = "Hi, my name is " + req.name + " and I love " + req.sport;
    return bio;
}

exports.randomProfileImage = (req, res, next) => {
    const fs = require('fs');
    const request = require('request');

    const url = 'https://thispersondoesnotexist.com/image';
    const filename = uuid() + '.jpg';
    const path = './images/profile/' + filename;

    const download = (url, path, callback) => {
        request.head(url, (err, res, body) => {
            request(url)
                .pipe(fs.createWriteStream(path))
                .on('close', callback)
        })
    }

    download(url, path, () => {

    });

    return path;
}

exports.randomPost = (req, res, next) => {
    const user = req;
    const tags = "";
    const description = "This post was randomly generated";
    const privacy = "Public";
    const time = new Date();
    const userId = user._id
    const image = this.randomPostImage();

    const post = new Post({
        userId: userId,
        time: time,
        image: image,
        tags: tags,
        description: description,
        privacy: privacy
    });
    post.save()
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
}

exports.randomPostImage = (req, res, next) => {
    const fs = require('fs');
    const request = require('request');

    var w = Math.floor(Math.random() * (5 - 3) + 3) * 400;
    var h = Math.floor(Math.random() * (5 - 3) + 3) * 400;
    const url = "https://picsum.photos/seed/" + Date.now() + "/" + w + "/" + h + ".jpg";

    const filename = uuid() + '.jpg';
    const path = './images/posts/' + filename;

    const download = (url, path, callback) => {
        request.head(url, (err, res, body) => {
            request(url)
                .pipe(fs.createWriteStream(path))
                .on('close', callback)
        })
    }
    download(url, path, () => {

    });
    return path;
}