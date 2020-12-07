import { IResolvers } from "graphql-tools";

import mongoose, { Schema } from "mongoose";

export const User = mongoose.model(
  "User",
  new Schema({
    firstName: String,
    lastname: String!,
    email: String!,
    enneagramId: String!,
    mbtiId: String!,
    // Id,
    dateCreated: String!,
    dateModified: String!,
  })
);

export const uResolvers: IResolvers = {
  Query: {
    users: () => User.find(),
    getUser: async (_, { email }) => {
      const u = await User.findOne({ email });
      return u;
    },
  },

  Mutation: {
    createUser: async (
      _,
      { firstName, lastname, email, enneagramId, mbtiId }
    ) => {
      const u = new User({
        firstName,
        lastname,
        email,
        enneagramId,
        mbtiId,
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      const res = await u.save();

      console.log("save question");
      return u;
    },

    updateUser: async (
      _,
      { firstName, lastname, email, enneagramId, mbtiId }
    ) => {
      const u = User.updateOne(
        { email },
        {
          firstName,
          lastname,
          email,
          enneagramId,
          mbtiId,
          dateModified: new Date(),
        }
      );
      // const res = await u.save();

      console.log("save question");
      return u;
    },
  },
};
