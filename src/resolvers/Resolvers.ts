import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

import { redis } from "..";

const crypto = require("crypto");

const Schema = mongoose.Schema;

const questionSchema = new Schema({
  id: String,
  question: String,
  authorId: String,
  likeIds: [String],
  commenterIds: {
    type: Map,
    of: String,
  },
  commentIds: [String],
  subscriberIds: [String],
  dateCreated: Date,
  dateModified: Date,
  modified: {
    type: Boolean,
    default: false,
  },
});

questionSchema.virtual("author", {
  ref: "User",
  localField: "authorId",
  foreignField: "id",
  justOne: true,
});

export const Question = mongoose.model("Question", questionSchema);

const commentSchema = new Schema({
  id: String,
  parentId: String,
  comment: String,
  authorId: String,
  likeIds: [String],
  commentIds: [String],
  dateCreated: Date,
  dateModified: Date,
});

commentSchema.virtual("author", {
  ref: "User",
  localField: "authorId",
  foreignField: "id",
  justOne: true,
});

export const Comment = mongoose.model("Comment", commentSchema);

export const User = mongoose.model(
  "User",
  new Schema({
    id: String!,
    firstName: String,
    lastName: String,
    email: String!,
    enneagramId: String,
    mbtiId: String,
    password: String!,
    tokenVersion: Number,
    confirmedUser: Boolean,
    confirmationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    role: String,
    dateCreated: Date,
    dateModified: Date,
  })
);

export const Content = mongoose.model(
  "Content",
  new Schema({
    id: String!,
    enneagramType: String!,
    userId: String!,
    text: String,
    img: String,
    likeIds: [String],
    commentIds: [String],
    dateCreated: Date,
    dateModified: Date,
  })
);

const RelationshipDataSchema = new Schema({
  id: String!,
  authorId: String!,
  relationship: [String]!,
  text: String,
  likeIds: [String],
  commentIds: [String],
  dateCreated: Date!,
  dateModified: Date!,
});

export const Admin = mongoose.model(
  "Admin",
  new Schema({
    id: String,
    role: String,
    dateCreated: Date,
    dateModified: Date,
  })
);

RelationshipDataSchema.virtual("author", {
  ref: "User",
  localField: "authorId",
  foreignField: "id",
  justOne: true,
});

export const RelationshipData = mongoose.model(
  "RelationshipData",
  RelationshipDataSchema
);

export const Resolvers: IResolvers = {
  Date: String,
  Map: Object,

  Query: {
    questions: () => Question.find(),
    comments: () => Comment.find(),
    deleteAllQuestions: async () => {
      await Question.deleteMany({});
      return true;
    },
    deleteAllComments: async () => {
      await Comment.deleteMany({});
      return true;
    },
    getDashboard: async (_, { userId }) => {
      const q = await Question.find({ subscriberIds: userId });
      return q;
    },

    getQuestion: async (_, { questionId }) => {
      const q = await Question.findOne({ id: questionId });
      return q;
    },
    getComment: async (_, { commentId }) => {
      const c = await Comment.findOne({ id: commentId });
      return c;
    },
    getQuestions: async (_, { pageSize, lastDate }) => {
      const params = lastDate ? { dateCreated: { $lte: lastDate } } : {};
      return {
        questions: Question.find(params)
          .limit(pageSize)
          .sort({ dateCreated: -1 })
          .exec(),
        count: Question.estimatedDocumentCount(),
      };
    },

    getMoreComments: async (_, { parentId, lastDate }) => {
      const params = {
        parentId,
        dateCreated: { $lt: lastDate },
      };
      return {
        comments: Comment.find(params)
          .limit(10)
          .sort({ dateCreated: -1 })
          .exec(),
        count: Comment.countDocuments({ parentId }),
      };
    },

    users: async (_, { cursorId, id }) => {
      let user = await User.findOne({ id, role: "admin" });
      if (user) {
        const cursorParam = cursorId ? `id: { $gt: ${cursorId} }` : null;
        const u = await User.find({ cursorParam }).limit(10);

        return {
          users: u,
          count: User.estimatedDocumentCount(),
        };
      } else {
        return {};
      }
    },
    getUserByEmail: async (_, { email }) => {
      const u = await User.findOne({ email });
      return u;
    },
    getUserById: async (_, { id }) => {
      const u = await User.findOne({ id });
      return u;
    },
    deleteUsers: async () => {
      await User.deleteMany({});
      return true;
    },

    deleteUsersByEmail: async (_, { email }) => {
      const u = await User.deleteOne({ email });
      return true;
    },
    getContent: async (_, { enneagramType, type, pageSize, lastDate }) => {
      const params = lastDate
        ? { dateCreated: { $lt: lastDate }, enneagramType }
        : { enneagramType };
      const content = await Content.find(params)
        .limit(10)
        .sort({ dateCreated: -1 })
        .exec();
      const count = await Content.countDocuments({
        enneagramType,
      });
      return {
        content,
        count,
      };
    },

    deleteContent: async () => {
      await Content.deleteMany({});
      return true;
    },
    getSortedComments: async (
      _,
      { questionId, enneagramTypes, dateRange, sortBy, cursorId }
    ) => {
      let date;

      switch (dateRange) {
        case "Today":
          date = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate()
          );
          break;
        case "Week":
          const backOneWeek = new Date().getDate() - 7;
          date = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            backOneWeek
          );

          break;
        case "Month":
          const backOneMonth = new Date().getMonth() - 1;
          date = new Date(
            new Date().getFullYear(),
            backOneMonth,
            new Date().getDate()
          );
          break;
        case "3 Months":
          const back3Months = new Date().getMonth() - 3;
          date = new Date(
            new Date().getFullYear(),
            back3Months,
            new Date().getDate()
          );
          break;
        case "Year":
          date = new Date(
            new Date().getFullYear() - 1,
            new Date().getMonth(),
            new Date().getDate()
          );
          break;
        default:
          date = new Date("new Wed Sep 09 2020 17:05:34 GMT-0500");
      }
      const sort =
        sortBy === "likes"
          ? { likeIds: -1 }
          : sortBy === "oldest"
          ? { dateCreated: 1 }
          : { dateCreated: -1 };
      const newDate = date;
      const cursorParam = cursorId ? `id: { $gt: ${cursorId} }` : null;
      const params = questionId
        ? {
            parentId: questionId,
            dateCreated: {
              $gte: newDate,
            },
            cursorParam,
          }
        : {
            dateCreated: {
              $gte: newDate,
            },
            cursorParam,
          };
      // will always show total because there is additional filtering below
      const count = await Comment.countDocuments(
        questionId
          ? {
              parentId: questionId
            }
          : {}
      );
      const comments = await Comment.find(params)
        .limit(10)
        .sort(sort)
        .populate("author", "enneagramId")
        .map((c) => {
          const filteredComments = c.map(async (e: any) => {
            if (e.author && enneagramTypes.includes(e.author.enneagramId)) {
              return e;
            } else {
              return;
            }
          });
          return Promise.all(filteredComments);
        });

      return {
        comments: comments.filter((x) => x),
        count,
      };
    },

    changeField: async () => {
      const successQ = await Question.update(
        {},
        {
          $set: { commenterIds: {} },
        },
        { upsert: false, multi: true }
      );
      const successU = await User.update(
        {},
        {
          $set: { confirmedUser: true },
        },
        { upsert: false, multi: true }
      );
      if (successQ && successU) {
        return true;
      } else {
        return false;
      }
    },

    getRelationshipData: async (_, { id1, id2, pageSize, lastDate }) => {
      const params = lastDate
        ? { dateCreated: { $lt: lastDate }, relationship: { $all: [id1, id2] } }
        : { relationship: { $all: [id1, id2] } };
      return {
        RelationshipData: await RelationshipData.find(params)
          .limit(pageSize)
          .sort({ dateCreated: -1 })
          .exec(),
        count: RelationshipData.countDocuments({
          relationship: { $all: [id1, id2] },
        }),
      };
    },

    getAdmins: async () => await Admin.find(),
  },

  Question: {
    comments: async (root, _) => {
      if (root.commentIds && root.commentIds.length) {
        return {
          comments: await Comment.find({ id: root.commentIds })
            .limit(10)
            .sort({ dateCreated: -1 }),
          count: await Comment.countDocuments({ id: root.commentIds }),
        };
      } else {
        return {
          comments: [],
          count: 0,
        };
      }
    },
    subscribers: async (root) => {
      return root.subscriberIds;
    },

    likes: async (root) => {
      return root.likeIds;
    },
    author: async (root) => {
      if (root.authorId) {
        return await User.findOne({ id: root.authorId });
      } else {
        return null;
      }
    },
  },
  Comment: {
    comments: async (root) => {
      if (root.commentIds && root.commentIds.length) {
        const comments = await Comment.find({ id: root.commentIds })
          .limit(10)
          .sort({ dateCreated: -1 });
        const count = await Comment.countDocuments({ id: root.commentIds });
        return {
          comments,
          count,
        };
      } else {
        return {
          comments: [],
          count: 0,
        };
      }
    },
    likes: async (root) => {
      return root.likeIds;
    },
    author: async (root, args) => {
      if (root.authorId) {
        if (args) {
          return await User.findOne({
            id: root.authorId,
          });
        } else {
          return await User.findOne({ id: root.authorId });
        }
      } else {
        return [];
      }
    },
  },

  Content: {
    comments: async (root) => {
      if (root.commentIds && root.commentIds.length) {
        const comments = await Comment.find({ id: root.commentIds })
          .limit(10)
          .sort({ dateCreated: -1 });
        const count = await Comment.countDocuments({ id: root.commentIds });
        return {
          comments,
          count,
        };
      } else {
        return {
          comments: [],
          count: 0,
        };
      }
    },
    likes: async (root) => {
      return root.likeIds;
    },
  },

  RelationshipData: {
    author: async (root) => {
      if (root.authorId) {
        return await User.findOne({ id: root.authorId });
      } else {
        return null;
      }
    },
    comments: async (root) => {
      if (root.commentIds && root.commentIds.length) {
        const comments = await Comment.find({ id: root.commentIds })
          .limit(10)
          .sort({ dateCreated: -1 });
        const count = await Comment.countDocuments({ id: root.commentIds });
        return {
          comments,
          count,
        };
      } else {
        return {
          comments: [],
          count: 0,
        };
      }
    },
    likes: async (root) => {
      return root.likeIds;
    },
  },

  Mutation: {
    createQuestion: async (_, { id, question, authorId }) => {
      const q = new Question({
        id,
        question,
        authorId,
        commenterIds: {},
        likeIds: [],
        commentIds: [],
        subscriberIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      await q.save();

      return q;
    },

    addComment: async (_, { id, parentId, authorId, comment, type }) => {
      const c = new Comment({
        id,
        parentId,
        comment,
        authorId,
        likeIds: [],
        commentIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      await c.save();
      try {
        if (type === "question") {
          const q: any = await Question.findOne({ id: parentId });
          if (q) {
            q.commenterIds.set(authorId, 1);
            q.commentIds.push(c.id);
            q.save();
            if (redis) {
              const redisClient = redis.createClient();
              redisClient.get(
                `push:notifications:${q.authorId}`,
                (err, vals) => {
                  let newVals;
                  if (vals) {
                    const notification = JSON.stringify({
                      question: {
                        id: parentId,
                        text: q.question,
                      },
                      notification: {
                        id,
                        text: comment,
                      },
                      time: new Date(),
                    });
                    newVals = vals.slice(0, -1);
                    newVals = `${newVals},${notification}]`;
                  } else {
                    const notification = JSON.stringify([
                      {
                        question: {
                          id: parentId,
                          text: q.question,
                        },
                        notification: {
                          id,
                          text: comment,
                        },
                        time: new Date(),
                      },
                    ]);
                    newVals = notification;
                  }
                  redisClient.set(`push:notifications:${q.authorId}`, newVals);
                  redisClient.publish(
                    `push:notifications:${q.authorId}`,
                    newVals
                  );
                }
              );
            }
          }
        } else if (type === "content") {
          await Content.updateOne(
            { id: parentId },
            { $push: { commentIds: [c.id] } }
          );
        } else if (type === "relationship") {
          await RelationshipData.updateOne(
            { id: parentId },
            { $push: { commentIds: [c.id] } }
          );
        } else if (type === "content") {
          await Comment.updateOne(
            { id: parentId },
            { $push: { commentIds: [c.id] } }
          );
        } else {
          await RelationshipData.updateOne(
            { id: parentId },
            { $push: { commentIds: [c.id] } }
          );
        }
        return c;
      } catch (e) {
        console.log(e);
        return e;
      }
    },

    addSubscription: async (_, { userId, questionId, operation }) => {
      if (operation === "add") {
        await Question.updateOne(
          { id: questionId },
          { $push: { subscriberIds: [userId] } }
        );
      } else {
        await Question.updateOne(
          { id: questionId },
          { $pullAll: { subscriberIds: [userId] } }
        );
      }
      return true;
    },

    addLike: async (_, { userId, id, type, operation }) => {
      if (type === "question") {
        if (operation === "add") {
          await Question.updateOne(
            { id: id },
            { $push: { likeIds: [userId] } }
          );
        } else {
          await Question.updateOne(
            { id: id },
            { $pullAll: { likeIds: [userId] } }
          );
        }
      } else if (type === "content") {
        if (operation === "add") {
          await Content.updateOne({ id: id }, { $push: { likeIds: [userId] } });
        } else {
          await Content.updateOne(
            { id: id },
            { $pullAll: { likeIds: [userId] } }
          );
        }
      } else if (type === "relationship") {
        if (operation === "add") {
          await RelationshipData.updateOne(
            { id: id },
            { $push: { likeIds: [userId] } }
          );
        } else {
          await RelationshipData.updateOne(
            { id: id },
            { $pullAll: { likeIds: [userId] } }
          );
        }
      } else {
        if (operation === "add") {
          await Comment.updateOne({ id: id }, { $push: { likeIds: [userId] } });
        } else {
          await Comment.updateOne(
            { id: id },
            { $pullAll: { likeIds: [userId] } }
          );
        }
      }
      return true;
    },

    createContent: async (_, { id, userId, enneagramType, text, img }) => {
      let c;
      if (id) {
        c = new Content({
          id: id,
          enneagramType: enneagramType,
          userId: userId,
          text: text,
          img: img,
          likeIds: [],
          commentIds: [],
          dateCreated: new Date(),
          dateModified: new Date(),
        });
      } else {
        c = new Content({
          userId: userId,
          enneagramType: enneagramType,
          text: text,
          img: img,
          likeIds: [],
          commentIds: [],
          dateCreated: new Date(),
          dateModified: new Date(),
        });
        c.id = c._id;
      }
      await c.save();
      return c;
    },

    updateQuestion: async (_, { questionId, question }) => {
      const q = await Question.findOneAndUpdate(
        {
          id: questionId,
        },
        {
          question,
          dateModified: new Date(),
          modified: true,
        }
      );
      if (q) {
        await q.save();
        return true;
      } else {
        return false;
      }
    },
    updateComment: async (_, { commentId, comment }) => {
      const c = await Comment.findOneAndUpdate(
        {
          id: commentId,
        },
        {
          comment,
          dateModified: new Date(),
          modified: true,
        }
      );
      if (c) {
        await c.save();
        return true;
      } else {
        return false;
      }
    },

    createRelationshipData: async (_, { id, userId, relationship, text }) => {
      const r = await new RelationshipData({
        id,
        authorId: userId,
        relationship,
        text,
        likeIds: [],
        commentIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      if (r) {
        return await r.save();
      } else {
        return false;
      }
    },

    updateThread: async (_, { threadId, text }) => {
      const r = await RelationshipData.findOneAndUpdate(
        {
          id: threadId,
        },
        {
          text,
          dateModified: new Date(),
          modified: true,
        }
      );
      if (r) {
        await r.save();
        return true;
      } else {
        return false;
      }
    },

    // ************** Auth *********************

    createUser: async (_, { email, password, enneagramType }) => {
      const u = new User({
        email,
        password,
        enneagramId: enneagramType,
        tokenVersion: 0,
        confirmedUser: false,
        confirmationToken: crypto.randomBytes(20).toString("hex"),
        resetPasswordToken: null,
        resetPasswordExpires: null,
        role: "user",
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      u.id = u._id;
      await u.save();
      return u;
    },

    confirmUser: async (_, { confirmationToken }) => {
      const u = await User.findOneAndUpdate(
        {
          confirmationToken,
        },
        {
          confirmedUser: true,
        }
      );
      if (u) {
        return true;
      } else {
        return false;
      }
    },

    updateUser: async (
      _,
      { id, firstName, lastName, email, enneagramId, mbtiId }
    ) => {
      const u = User.findOneAndUpdate(
        { id },
        {
          firstName,
          lastName,
          email,
          enneagramId,
          mbtiId,
          resetPasswordToken: null,
          resetPasswordExpires: null,
          dateModified: new Date(),
        }
      );
      return u;
    },

    revokeRefreshTokensForUser: async (_, { email }) => {
      await User.updateOne({ email }, { $inc: { tokenVersion: 1 } });
      return true;
    },
    recover: async (_, { email }) => {
      const u = await User.updateOne(
        { email },
        {
          $inc: { tokenVersion: 1 },
          resetPasswordToken: crypto.randomBytes(20).toString("hex"),
          resetPasswordExpires: Date.now() + 3600000,
        }
      );
      const updatedUser = await User.findOne({ email });
      if (u) {
        return updatedUser;
      } else {
        return null;
      }
    },

    reset: async (_, { resetPasswordToken }) => {
      const u = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
      return u;
    },
    resetPassword: async (_, { password, resetPasswordToken }) => {
      const u = await User.findOneAndUpdate(
        {
          resetPasswordToken,
          resetPasswordExpires: { $gt: Date.now() },
        },
        {
          password,
        }
      );
      if (u) {
        return u.save();
      } else {
        return null;
      }
    },

    deleteUser: async (_, { email }) => {
      await User.deleteOne({ email });
      return true;
    },

    changeUser: async (_, { id, id2, tag }) => {
      let user = await Admin.findOne({ id, role: "admin" });
      if (user) {
        const u = await User.findOneAndUpdate(
          { email: id2 },
          { role: tag, dateModified: new Date() }
        );
        if (u) {
          u.save();
          const a = await Admin.findOne({ id: id2 });
          if (a) {
            const updated = await Admin.findOneAndUpdate(
              { id: id2 },
              { role: tag, dateModified: new Date() }
            );
            return true;
          } else {
            const admin = new Admin({
              id: id2,
              role: tag,
              dateModified: new Date(),
              dateCreated: new Date(),
            });
            await admin.save()
            return true;
          }
        } else {
          return false;
        }
      } else {
        return false;
      }
    },

    change: async (_, { id, type, tag }) => {
      const user = await User.findOne({ id, role: "admin" });
      let success;
      if (user) {
        if (type === "content") {
          success = await Content.deleteOne({ id: tag });
        } else if (type === "comment") {
          success = await Comment.deleteOne({ id: tag });
        } else if (type === "question") {
          success = await Question.deleteOne({ id: tag });
        } else if (type === "RelationshipData") {
          success = await RelationshipData.deleteOne({ id: tag });
        } else {
          success = false;
        }
        if (success) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    },
  },
};
