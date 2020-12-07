import { IResolvers } from "graphql-tools";
import mongoose, { Schema } from "mongoose";

export const Question = mongoose.model(
  "Question",
  new Schema({
    id: String,
    question: String,
    authorId: String,
    likeIds: [String],
    commentIds: [String],
    subscriberIds: [String],
    dateCreated: String,
    dateModified: String,
  })
);

export const Comment = mongoose.model(
  "Comment",
  new Schema({
    id: String,
    parentId: String,
    comment: String,
    authorId: String,
    likeIds: [String],
    commentIds: [String],
    dateCreated: String,
    dateModified: String,
  })
);

export const User = mongoose.model(
  "User",
  new Schema({
    firstName: String,
    lastName: String,
    email: String!,
    enneagramId: String,
    mbtiId: String,
    password: String!,
    tokenVersion: Number,
    dateCreated: String,
    dateModified: String,
  })
);

export const Content = mongoose.model(
  "Content",
  new Schema({
    id: String!,
    userId: String!,
    text: String,
    img: String,
    dateCreated: String,
    dateModified: String,
  })
);

export const Resolvers: IResolvers = {
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
    getPaginatedQuestions: async (_, { pageSize, cursorId }) => {
      const params = cursorId ? { id: { $gt: cursorId } } : {};
      return {
        questions: Question.find(params).limit(pageSize).exec(),
        count: Question.estimatedDocumentCount(),
      };
    },

    users: () => User.find(),
    getUser: async (_, { email }) => {
      const u = await User.findOne({ email });
      return u;
    },

    deleteUsers: async () => {
      await User.deleteMany({});
      return true;
    },

    content: () => Content.find(),

    deleteContent: async () => {
      await Content.deleteMany({});
      return true;
    },
  },

  Question: {
    comments: async (root, _, ctx) => {
      // console.log(ctx)
      // return ctx.commentsLoader.load(root.commentIds);
      if (root.commentIds) {
        return await Comment.find({ id: root.commentIds });
      } else {
        return [];
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
        return await User.findOne({ email: root.authorId });
      } else {
        return [];
      }
    },
  },
  Comment: {
    comments: async (root) => {
      if (root.commentIds) {
        return await Comment.find({ id: root.commentIds });
      } else {
        return [];
      }
    },
    likes: async (root) => {
      return root.likeIds;
    },
    author: async (root) => {
      if (root.authorId) {
        return await User.findOne({ email: root.authorId });
      } else {
        return [];
      }
    },
  },

  Mutation: {
    createQuestion: async (_, { id, question, authorId }) => {
      const q = new Question({
        id,
        question,
        authorId,
        likeIds: [],
        commentIds: [],
        subscriberIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      const res = await q.save();

      console.log("save question");
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
      const res = await c.save();
      console.log(c);
      console.log(parentId);
      if (type === "question") {
        const q = await Question.updateOne(
          { id: parentId },
          { $push: { commentIds: [c.id] } }
        );
        console.log(q);
      } else {
        const q = await Comment.updateOne(
          { id: parentId },
          { $push: { commentIds: [c.id] } }
        );
      }
      return c;
    },

    addSubscription: async (_, { userId, questionId, operation }) => {
      if (operation === "add") {
        const q = await Question.updateOne(
          { id: questionId },
          { $push: { subscriberIds: [userId] } }
        );
      } else {
        const q = await Question.updateOne(
          { id: questionId },
          { $pullAll: { subscriberIds: [userId] } }
        );
      }
      return true;
    },

    addLike: async (_, { userId, id, type, operation }) => {
      // console.log(likes);
      console.log(id);
      console.log(type);
      if (type === "question") {
        if (operation === "add") {
          const q = await Question.updateOne(
            { id: id },
            { $push: { likeIds: [userId] } }
          );
          console.log(q);
        } else {
          // remove
          const q = await Question.updateOne(
            { id: id },
            { $pullAll: { likeIds: [userId] } }
          );
          console.log(q);
        }
      } else {
        if (operation === "add") {
          const c = await Comment.updateOne(
            { id: id },
            { $push: { likeIds: [userId] } }
          );
          console.log(c);
        } else {
          const c = await Comment.updateOne(
            { id: id },
            { $pullAll: { likeIds: [userId] } }
          );
          console.log(c);
        }
      }
      return true;
    },

    createUser: async (_, { email, password }) => {
      const u = new User({
        email,
        password,
        tokenVersion: 0,
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      const res = await u.save();
      console.log(res);
      console.log;

      console.log("create user");
      return true;
    },

    updateUser: async (
      _,
      { firstName, lastName, email, enneagramId, mbtiId }
    ) => {
      const u = User.findOneAndUpdate(
        { email },
        {
          firstName,
          lastName,
          email,
          enneagramId,
          mbtiId,
          dateModified: new Date(),
        }
      );
      // const res = await u.save();
      console.log(u);

      console.log("update User");
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

    createContent: async (_, { id, userId, text, img }) => {
      const c = new Content({
        id: id,
        userId: userId,
        text: text,
        img: img,
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      console.log("create content");
      const res = await c.save();
      return c;
    },
  },
};
