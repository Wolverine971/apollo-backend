import { gql } from "apollo-server-express";

// export const Question = mongoose.model("Question", new Schema({ question: String, authorId: String, likeIds: [String], commentIds: [String], subscriberIds: [String]}));

// export const Comment = mongoose.model("Comment", new Schema({ parentId: String, comment: String, authorId: String, likeIds: [String], commentIds: [String]}));

export const UserTypes = gql`
  type Query {
    users: [User]!
    getUser(email: String!): [User]
  }
  type User {
    FirstName: String
    LastName: String!
    Email: String!
    EnneagramId: String!
    MBTIId: String!
    # Id
    # DateCreated
    # DateModified
  }

  type Mutation {
    createUser(
      FirstName: String
      LastName: String!
      Email: String!
      EnneagramId: String!
      MBTIId: String!
    ): User!

    updateUser(
      FirstName: String
      LastName: String!
      Email: String!
      EnneagramId: String!
      MBTIId: String!
    ): User!

    # addSubscription(userId: String!, questionId: String!, operation: String!): Boolean!
    # addLike(userId: String!, id: String!, type: String!, operation: String!): Boolean!
  }
`;
