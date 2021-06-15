import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

const crypto = require("crypto");

const Schema = mongoose.Schema;

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
export const Admin = mongoose.model(
  "Admin",
  new Schema({
    id: String,
    role: String,
    dateCreated: Date,
    dateModified: Date,
  })
);

export const UserResolvers: IResolvers = {
  Date: String,

  Query: {
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
    getAdmins: async () => await Admin.find(),
  },

  Mutation: {
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
            await admin.save();
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
        } else if (type === "user") {
          success = await User.deleteOne({ id: tag });
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

import { gql } from "apollo-server-express";
import { Content } from "./content";
import { Question, Comment } from "./questionAndAnswer";
import { RelationshipData } from "./relationship";

export const UserTypes = gql`

  extend type Query {
    users(cursorId: String, id: String!): PaginatedUsers
    getUserByEmail(email: String!): User
    getUserById(id: String!): User
    deleteUsers: Boolean
    deleteUsersByEmail(email: String!): Boolean
    changeField: Boolean

    getAdmins: [Admin]

  }
  type PaginatedUsers {
    users: [User]
    count: Int
  }
  
  type User {
    id: String
    firstName: String
    lastName: String
    password: String
    email: String
    enneagramId: String
    mbtiId: String
    tokenVersion: Int
    confirmedUser: Boolean,
    confirmationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    role: String,
    dateCreated: Date
    dateModified: Date
  }

  type Admin {
    id: String,
    role: String,
    dateCreated: Date,
    dateModified: Date,
  }

  extend type Mutation {
  createUser(email: String!, password: String!, enneagramType: String!): User!
    confirmUser(confirmationToken: String!): Boolean!

    updateUser(
      id: String!
      firstName: String
      lastName: String
      email: String
      enneagramId: String
      mbtiId: String
    ): User!

    revokeRefreshTokensForUser(email: String): Boolean
    recover(email: String): User
    reset(resetPasswordToken: String!): User
    resetPassword(password: String!, resetPasswordToken: String!): User

    deleteUser(email: String): Boolean
    changeUser(id: String!, id2: String!, tag: String!): Boolean
    change(id: String!, type: String!, tag: String!): Boolean
  }
`;
