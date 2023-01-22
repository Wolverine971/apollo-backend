import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const EmailsSchema = new Schema({
  id: String!,
  email: String!,
  dateCreated: Date,
});

export const Email = mongoose.model("Email", EmailsSchema);

export const EmailResolvers: IResolvers = {
  Date: String,

  Query: {
    getEmails: async (_, { lastDate }) => {
      const params = lastDate ? { dateCreated: { $lt: lastDate } } : {};
      const emails = await Email.find(params)
        .limit(100)
        .sort({ dateCreated: -1 })
        .exec();
      const count = await Email.countDocuments();
      return {
        emails,
        count,
      };
    },
  },

  Mutation: {
    addEmail: async (_, { email }) => {
      let e = new Email({
        email,
        dateCreated: new Date(),
      });
      e.id = e._id;
      await e.save();
      return true;
    },
  },
};

import { gql } from "apollo-server-express";
export const EmailTypes = gql`
  extend type Query {
    getEmails(lastDate: String): PaginatedEmails
  }

  type PaginatedEmails {
    emails: [Email]
    count: Int
  }

  type Email {
    email: String
    id: String
    dateCreated: Date
  }

  extend type Mutation {
    addEmail(email: String): Boolean
  }
`;
