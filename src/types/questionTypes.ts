import { gql } from "apollo-server-express";
import { GraphQLUpload } from "graphql-upload";

// import { Upload } from "graphql-upload";

// export const Question = mongoose.model("Question", new Schema({ question: String, authorId: String, likeIds: [String], commentIds: [String], subscriberIds: [String]}));

// export const Comment = mongoose.model("Comment", new Schema({ parentId: String, comment: String, authorId: String, likeIds: [String], commentIds: [String]}));

export const QuestionTypes = gql`
  type Query {
    hello: String!
    questions: [Question]!
    comments: [Comment]!
    deleteAllQuestions: Boolean
    deleteAllComments: Boolean
    getDashboard(userId: String!): [Question]
    getQuestion(questionId: String!): Question
    getComment(commentId: String!): Comment
    getPaginatedQuestions(pageSize: Int, cursorId: String!): PaginatedQuestion
    content: [Content]

    users: [User]!
    getUser(email: String!): User
    deleteUsers: Boolean
    deleteContent: Boolean
  }
  type Comment {
    id: String!
    parentId: String
    author: User!
    comment: String
    likes: [String]
    comments: [Comment]
  }

  # type Author {
  #   id: String
  #   user: String
  # }

  type PaginatedQuestion {
    questions: [Question]
    count: Int
  }

  type Question {
    id: String!
    question: String!
    author: User!
    likes: [String]
    comments: [Comment]
    subscribers: [String]
  }

  type User {
    firstName: String
    lastName: String
    password: String
    email: String
    enneagramId: String
    mbtiId: String
    tokenVersion: Int
    DateCreated: String
    DateModified: String
  }

  type Content {
    id: String!
    userId: String!
    text: String
    img: String
    DateCreated: String!
    DateModified: String!
  }

  type Mutation {
    createQuestion(id: String!, question: String!, authorId: String!): Question!

    addComment(
      id: String!
      parentId: String
      authorId: String!
      comment: String!
      type: String!
    ): Comment!

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

    createUser(email: String!, password: String!): Boolean!

    updateUser(
      firstName: String
      lastName: String
      email: String
      enneagramId: String
      mbtiId: String
    ): User!

    revokeRefreshTokensForUser(email: String): Boolean

    deleteUser(email: String): Boolean

    createContent(
      id: String!
      userId: String!
      text: String
      img: String
    ): Content
  }
`;
