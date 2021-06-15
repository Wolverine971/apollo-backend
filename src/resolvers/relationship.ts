import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

const Schema = mongoose.Schema;

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

export const RelationshipResolvers: IResolvers = {
  Date: String,

  Query: {
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
  },
};

import { gql } from "apollo-server-express";
import { User } from "./users";
import { Comment } from "./questionAndAnswer";

export const RelationshipTypes = gql`

  extend type Query {
    getRelationshipData(
      id1: String
      id2: String
      pageSize: Int
      lastDate: String!
    ): RelationshipDataContent
  }

  type RelationshipData {
    id: String!
    author: User
    enneagramType: String!
    text: String
    likes: [String]
    comments: PaginatedComments
    dateCreated: Date!
    dateModified: Date!
  }

  type RelationshipDataContent {
    RelationshipData: [RelationshipData]
    count: Int
  }

  extend type Mutation {
    createRelationshipData(
      id: String
      userId: String
      relationship: [String]
      text: String
    ): RelationshipData
    updateThread(threadId: String!, text: String): Boolean
  }
`;
