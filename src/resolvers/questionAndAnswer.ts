import { gql } from "apollo-server-express";
import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

import { redis } from "..";
import { Blog } from "./blog";
import { Content } from "./content";
import { RelationshipData } from "./relationship";
import { Rando, User } from "./users";
import "dotenv/config";

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
  context: String,
  url: String,
  img: String,
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
  ip: String,
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

export const QandAResolvers: IResolvers = {
  Date: String,
  Map: Object,

  Query: {
    questions: () => Question.find(),
    comments: () => Comment.find(),
    // const query = `query deleteAllQuestions {
    //   deleteAllQuestions
    //   }`;
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

    getQuestion: async (_, { questionUrl }) => {
      const q = await Question.findOne({ url: questionUrl });
      return q;
    },
    getComment: async (_, { commentId }) => {
      const c = await Comment.findOne({ id: commentId });
      return c;
    },
    getQuestions: async (_, { pageSize, lastDate }) => {
      const params = lastDate ? { dateCreated: { $lt: lastDate } } : {};
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
    getSortedComments: async (
      _,
      { questionUrl, enneagramTypes, dateRange, sortBy, skip }
    ) => {
      const includeRandos = enneagramTypes
        ? enneagramTypes.includes("Rando")
        : false;
      const question = await Question.findOne({ url: questionUrl });
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
      const params =
        question && question.id
          ? {
              parentId: question.id,
              dateCreated: {
                $gte: newDate,
              },
            }
          : {
              dateCreated: {
                $gte: newDate,
              },
            };
      // will always show total because there is additional filtering below
      const count = await Comment.countDocuments(
        question && question.id
          ? {
              parentId: question.id,
            }
          : {}
      );
      const comments = await Comment.find(params)
        .limit(10)
        .sort(sort)
        .skip(skip)
        .populate("author", "enneagramId")
        .map((c) => {
          const filteredComments = c.map(async (e: any) => {
            if (e.author && enneagramTypes.includes(e.author.enneagramId)) {
              return e;
            } else if (!e.author && includeRandos) {
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
        if (root.authorId.includes(process.env.RANDO_PREFIX)) {
          return await Rando.findOne({
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

  Author: {
    __resolveType(obj, context, info) {
      // Only Author has a name field
      if (obj.confirmedUser) {
        return "User";
      } else {
        return "Rando";
      }
      // Only Book has a title field
      // if(obj.if){
      //   return 'Rando';
      // }
      return null; // GraphQLError is thrown
    },
  },

  Mutation: {
    createQuestion: async (
      _,
      { id, question, authorId, context, img, url }
    ) => {
      const q = new Question({
        id,
        question,
        authorId,
        context,
        img,
        url,
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

    addComment: async (
      _,
      { id, parentId, authorId, comment, type, ip },
      context
    ) => {
      if (context?.user?.rando) {
        const canComment = await randoCheck({ parentId, authorId, type, ip });
        if (!canComment) {
          return canComment;
        }
      }

      const c = new Comment({
        id,
        parentId,
        comment,
        authorId,
        likeIds: [],
        commentIds: [],
        ip,
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
                  const authorId = q.authorId;
                  redisClient.set(`push:notifications:${authorId}`, newVals);
                  redisClient.publish(
                    `push:notifications:${authorId}`,
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
        } else if (type === "comment") {
          await Comment.updateOne(
            { id: parentId },
            { $push: { commentIds: [c.id] } }
          );
        } else if (type === "blog") {
          await Blog.updateOne(
            { id: parentId },
            { $push: { commentIds: [c.id] } }
          );
        } else {
          await RelationshipData.updateOne(
            { id: parentId },
            { $push: { commentIds: [c.id] } }
          );
        }
        if (
          authorId.includes(process.env.RANDO_PREFIX) &&
          type === "question"
        ) {
          const rando: any = await Rando.findOne({ id: authorId });
          if (rando) {
            rando.questions.set(parentId, 1);
            await rando.save();
          } else {
            const r: any = new Rando({
              id: authorId,
              questions: {},
              dateCreated: new Date(),
              dateModified: new Date(),
            });
            r.questions.set(parentId, 1);
            await r.save();
          }
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
      } else if (type === "blog") {
        if (operation === "add") {
          await Blog.updateOne({ id: id }, { $push: { likeIds: [userId] } });
        } else {
          await Blog.updateOne({ id: id }, { $pullAll: { likeIds: [userId] } });
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

    updateQuestion: async (_, { questionId, question, url }) => {
      const q = await Question.findOneAndUpdate(
        {
          id: questionId,
        },
        {
          question,
          url,
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
    updateComment: async (_, { commentId, comment, authorId }) => {
      const c = await Comment.findOneAndUpdate(
        {
          id: commentId,
          authorId,
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
  },
};

export const QandATypes = gql`
  scalar Date
  scalar Map

  type Query {
    hello: String
    questions: [Question]!
    comments: [Comment]!
    deleteAllQuestions: Boolean
    deleteAllComments: Boolean
    getDashboard(userId: String!): [Question]
    getQuestion(questionUrl: String!): Question
    getComment(commentId: String!): Comment
    getQuestions(pageSize: Int, lastDate: String!): PaginatedQuestions
    getMoreComments(parentId: String!, lastDate: String!): PaginatedComments

    getSortedComments(
      questionUrl: String
      enneagramTypes: [String]
      dateRange: String
      sortBy: String
      skip: Int
    ): PaginatedComments
  }

  union Author = User | Rando
  type Comment {
    id: String!
    parentId: String
    # authorId: String
    author: Author
    comment: String
    likes: [String]
    comments: PaginatedComments
    dateCreated: Date
  }

  type PaginatedQuestions {
    questions: [Question]
    count: Int
  }

  type Question {
    id: String!
    question: String!
    author: User
    # authorId: String
    context: String
    url: String
    img: String
    likes: [String]
    commenterIds: Map
    comments: PaginatedComments
    subscribers: [String]
    dateCreated: Date
    dateModified: Date
    modified: Boolean
  }

  type PaginatedComments {
    comments: [Comment]
    count: Int
  }

  type Mutation {
    createQuestion(
      id: String!
      question: String!
      authorId: String!
      context: String
      img: String
      url: String
    ): Question!

    addComment(
      id: String!
      parentId: String
      authorId: String!
      comment: String!
      type: String!
      ip: String!
    ): Comment

    addSubscription(
      userId: String!
      questionId: String!
      operation: String!
    ): Boolean!

    addLike(
      userId: String!
      id: String!
      type: String!
      operation: String!
    ): Boolean!

    updateQuestion(questionId: String!, question: String, url: String): Boolean
    updateComment(
      commentId: String!
      comment: String
      authorId: String!
    ): Boolean
  }
`;

const randoCheck = async ({ parentId, authorId, type, ip }) => {
  try {
    if (type === "question") {
      const q: any = await Question.findOne({ id: parentId });
      if (q) {
        const didCommented = q.commenterIds.get(authorId);
        if (!didCommented) {
          const alreadyCommented = await Comment.findOne({ parentId, ip });
          if (!alreadyCommented) {
            return true;
          }
        }
        throw new MyError("Already Commented");
      }
      throw new MyError("Question Unavailable");
    }
    // not ready for this
    // else if (type === "blog") {
    //   const b: any = await Blog.findOne({ id: parentId });
    //   if (b) {
    //     const didCommented = b.commenterIds.get(authorId);
    //     if (!didCommented) {
    //       const alreadyCommented = await Comment.findOne({ parentId, ip });
    //       if (!alreadyCommented) {
    //         return true;
    //       }
    //     }
    //     throw new MyError("Already Commented");
    //   }
    //   throw new MyError("Blog Unavailable");
    // }
    // throw new MyError("Can only comment on questions and blogs");
  } catch (e) {
    console.log(e);
    return e;
  }
};

import { ApolloError } from "apollo-server-errors";
export class MyError extends ApolloError {
  constructor(message: string) {
    super(message, "MY_ERROR_CODE");

    Object.defineProperty(this, "name", { value: "MyError" });
  }
}
