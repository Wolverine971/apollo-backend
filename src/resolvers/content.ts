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
  },

  Mutation: {
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

import { gql } from "apollo-server-express";

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
    userId: String!
    enneagramType: String!
    text: String
    img: String
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
    ): Content!
  }
`;
