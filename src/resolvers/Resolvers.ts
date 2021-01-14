import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

import { redis } from "..";

const Schema = mongoose.Schema;

const questionSchema = new Schema({
  id: String,
  question: String,
  authorId: String,
  likeIds: [String],
  commentorIds: {
    type: Map,
    of: String,
  },
  commentIds: [String],
  subscriberIds: [String],
  dateCreated: Date,
  dateModified: Date,
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
        count: Comment.countDocuments({parentId}),
      };
    },

    users: () => User.find(),
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
    getContent: async (_, { enneagramType, type, pageSize, lastDate }) => {
      const params = lastDate ? { dateCreated: { $lt: lastDate }, enneagramType } : {enneagramType};
      const content = await Content.find(params).limit(10)
      .sort({ dateCreated: -1 })
      .exec()
      const count = await Content.countDocuments({
        enneagramType
      });
      return {
        content,
        count
      }
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
      const params = {
        parentId: questionId,
        dateCreated: {
          $gte: newDate,
        },
        cursorParam,
      };
      // will always show total because there is additional filtering below
      const count = await Comment.countDocuments({
        parentId: questionId
        // dateCreated: {
        //   $gte: newDate,
        // }
      });
      const comments = await Comment.find(params)
        .limit(10)
        .sort(sort)
        .populate("author", "enneagramId")
        .map((c) => {
          const filteredComments = c.map(async (e: any) => {
            if (enneagramTypes.includes(e.author.enneagramId)) {
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

  Mutation: {
    createQuestion: async (_, { id, question, authorId }) => {
      const q = new Question({
        id,
        question,
        authorId,
        commentorIds: {},
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
      if (type === "question") {
        const q: any = await Question.findOne({ id: parentId });
        if (q) {
          q.commentorIds.set(authorId, 1);
          q.commentIds.push(c.id);
          q.save();
          if (redis) {
            const redisClient = redis.createClient();
            redisClient.get(`push:notifications:${q.authorId}`, (err, vals) => {
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
              redisClient.publish(`push:notifications:${q.authorId}`, newVals);
            });
          }
        }
      } else if (type === "content") {
        await Content.updateOne(
          { id: parentId },
          { $push: { commentIds: [c.id] } }
        );
      } else {
        await Comment.updateOne(
          { id: parentId },
          { $push: { commentIds: [c.id] } }
        );
      }
      return c;
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

    createUser: async (_, { email, password, enneagramType }) => {
      const u = new User({
        email,
        password,
        enneagramId: enneagramType,
        tokenVersion: 0,
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      u.id = u._id;
      const user = await u.save();
      return true;
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
          dateModified: new Date(),
        }
      );
      return u;
    },

    revokeRefreshTokensForUser: async (_, { email }) => {
      await User.updateOne({ email }, { $inc: { tokenVersion: 1 } });
      return true;
    },
    deleteUser: async (_, { email }) => {
      const resp = await User.deleteOne({ email });
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
  },
};
