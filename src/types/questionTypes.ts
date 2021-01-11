import { gql } from "apollo-server-express";

export const QuestionTypes = gql`
  scalar Date
  scalar Map

  type Query {
    hello: String!
    questions: [Question]!
    comments: [Comment]!
    deleteAllQuestions: Boolean
    deleteAllComments: Boolean
    getDashboard(userId: String!): [Question]
    getQuestion(questionId: String!): Question
    getComment(commentId: String!): Comment
    getQuestions(pageSize: Int, lastDate: String!): PaginatedQuestion
    content(enneagramType: String!): [Content]

    users: [User]!
    getUserByEmail(email: String!): User
    getUserById(id: String!): User
    deleteUsers: Boolean
    deleteContent: Boolean

    getComments(
      questionId: String!
      enneagramTypes: [String]
      dateRange: String
      sortBy: String
      cursorId: String
    ): [Comment]
  }
  type Comment {
    id: String!
    parentId: String
    # authorId: String
    author: User
    comment: String
    likes: [String]
    comments: [Comment]
    dateCreated: Date
  }

  type PaginatedQuestion {
    questions: [Question]
    count: Int
  }

  type Question {
    id: String!
    question: String!
    author: User
    # authorId: String
    likes: [String]
    commentorIds: Map
    comments: [Comment]
    subscribers: [String]
    dateCreated: Date
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
    dateCreated: Date
    dateModified: Date
  }

  type Content {
    id: String!
    userId: String!
    enneagramType: String!
    text: String
    img: String
    likes: [String]
    comments: [Comment]
    dateCreated: Date!
    dateModified: Date!
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

    createUser(email: String!, password: String!, enneagramType: String!): Boolean!

    updateUser(
      id: String!
      firstName: String
      lastName: String
      email: String
      enneagramId: String
      mbtiId: String
    ): User!

    revokeRefreshTokensForUser(email: String): Boolean

    deleteUser(email: String): Boolean

    createContent(
      id: String
      userId: String!
      enneagramType: String!
      text: String
      img: String
    ): [Content]
  }
`;
