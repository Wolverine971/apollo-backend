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
    getQuestions(pageSize: Int, lastDate: String!): PaginatedQuestions
    getMoreComments(parentId: String!, lastDate: String!): PaginatedComments
    getContent(enneagramType: String!, type: String, pageSize: Int, lastDate: String): PaginatedContent

    users: [User]!
    getUserByEmail(email: String!): User
    getUserById(id: String!): User
    deleteUsers: Boolean
    deleteUsersByEmail(email: String!): Boolean
    deleteContent: Boolean
    changeField: Boolean

    getSortedComments(
      questionId: String!
      enneagramTypes: [String]
      dateRange: String
      sortBy: String
      cursorId: String
    ): PaginatedComments

    getRelationshipData(id1: String, id2: String, pageSize: Int): RelationshipDataContent
  }
  type Comment {
    id: String!
    parentId: String
    # authorId: String
    author: User
    comment: String
    likes: [String]
    comments: PaginatedComments
    dateCreated: Date
  }

  type PaginatedQuestions {
    questions: [Question]
    count: Int
  }

  type Question {
    id: String!
    question: String!
    author: User
    # authorId: String
    likes: [String]
    commenterIds: Map
    comments: PaginatedComments
    subscribers: [String]
    dateCreated: Date
    dateModified: Date
    modified: Boolean
  }

  type PaginatedComments {
    comments: [Comment]
    count: Int
  }

  type PaginatedContent {
    content: [Content]
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
    comments: PaginatedComments
    dateCreated: Date!
    dateModified: Date!
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

    createContent(
      id: String
      userId: String!
      enneagramType: String!
      text: String
      img: String
    ): Content!

    updateQuestion(questionId: String!, question: String): Boolean
    updateComment(commentId: String!, comment: String): Boolean

    createRelationshipData(id: String, userId: String, relationship: [String], text: String): RelationshipData

      # ************************** Auth ******************************

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

  }
`;
