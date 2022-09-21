const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const commentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    commentId: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    },
    isLike: {
        type: Boolean,
        required: true
    },
    description: {
        type: String
    },
    time: {
        type:Date,
        required: true
    }
});

/** Todo: fill out functions */

module.exports = mongoose.model('Comment', commentSchema);