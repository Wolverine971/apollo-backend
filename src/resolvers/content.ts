import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

const Schema = mongoose.Schema;
import { Comment } from "./questionAndAnswer";
export const Content = mongoose.model(
  "Content",
  new Schema({
    id: String!,
    enneagramType: String!,
    userId: String!,
    text: String,
    img: String,
    imgText: String,
    likeIds: [String],
    commentIds: [String],
    dateCreated: Date,
    dateModified: Date,
  })
);

export const ContentResolvers: IResolvers = {
  Date: String,

  Query: {
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
    author: async (root) => {
      if (root.userId) {
        return await User.findOne({ id: root.userId });
      } else {
        return null;
      }
    },
  },

  Mutation: {
    createContent: async (_, { id, userId, enneagramType, text, img, imgText }) => {
      let c = new Content({
        id: id,
        enneagramType: enneagramType,
        userId: userId,
        text: text,
        img: img,
        imgText: imgText,
        likeIds: [],
        commentIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      await c.save();
      return c;
    },

    updateContent: async (_, { id, userId, enneagramType, text, img, imgText }) => {
      let c = await Content.findOneAndUpdate(
        {
          id,
        },
        {
          enneagramType: enneagramType,
          userId: userId,
          text: text,
          img: img,
          imgText: imgText,
          dateModified: new Date(),
        }
      );
      return c;
    },
  },
};

import { gql } from "apollo-server-express";
import { User } from "./users";

export const ContentTypes = gql`
  extend type Query {
    getContent(
      enneagramType: String!
      type: String
      pageSize: Int
      lastDate: String
    ): PaginatedContent
    deleteContent: Boolean
  }

  type PaginatedContent {
    content: [Content]
    count: Int
  }

  type Content {
    id: String!
    author: User
    enneagramType: String!
    text: String
    img: String
    imgText: String
    likes: [String]
    comments: PaginatedComments
    dateCreated: Date!
    dateModified: Date!
  }

  extend type Mutation {
    createContent(
      id: String
      userId: String!
      enneagramType: String!
      text: String
      img: String
      imgText: String
    ): Content!

    updateContent(
      id: String
      userId: String!
      enneagramType: String!
      text: String
      img: String
      imgText: String
      ): Content!
  }
`;
