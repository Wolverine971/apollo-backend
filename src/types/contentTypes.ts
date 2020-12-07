import { gql } from "apollo-server-express";

// export const Question = mongoose.model("Question", new Schema({ question: String, authorId: String, likeIds: [String], commentIds: [String], subscriberIds: [String]}));

// export const Comment = mongoose.model("Comment", new Schema({ parentId: String, comment: String, authorId: String, likeIds: [String], commentIds: [String]}));

export const ContentTypes = gql`
  type Query {
    content: [Content]!
  }

  type Content {
    id: String!
    userId: String!
    DateCreated: String!
    DateModified: String!
    content: String!
  }

  type Mutation {
    createContent(
      id: String!
      userId: String!
      DateCreated: String
      DateModified: String
      content: String
    ): Content!
  }
`;
