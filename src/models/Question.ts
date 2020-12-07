import mongoose, { Schema } from "mongoose";

export const Question = mongoose.model(
  "Question",
  new Schema({
    question: String,
    authorId: String,
    likeIds: [String],
    commentIds: [String],
    subscriberIds: [String],
  })
);

export const Comment = mongoose.model(
  "Comment",
  new Schema({
    parentId: String,
    comment: String,
    authorId: String,
    likeIds: [String],
    commentIds: [String],
  })
);
