import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

const Schema = mongoose.Schema;
import { Comment } from "./questionAndAnswer";

const BlogSchema = new Schema({
    id: String!,
    title: String!,
    img: String!,
    description: String,
    body: String,
    size: Number,
    authorId: String!,
    likeIds: [String],
    commentIds: [String],
    dateCreated: Date,
    dateModified: Date,
  });

  BlogSchema.virtual("author", {
    ref: "User",
    localField: "authorId",
    foreignField: "id",
    justOne: true,
  });
  
  export const Blog = mongoose.model(
    "Blog",
    BlogSchema
  );

export const BlogResolvers: IResolvers = {
  Date: String,

  Query: {
    getBlogs: async (_, { lastDate }) => {
      const params = lastDate ? { dateCreated: { $lt: lastDate } } : {};
      const blog = await Blog.find(params)
        .limit(10)
        .sort({ dateCreated: -1 })
        .exec();
      const count = await Blog.countDocuments();
      return {
        blog,
        count,
      };
    },
    getBlog: async (_, { title }) => {
        return await Blog.findOne({title})
    }
  },

  Blog: {
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
    author: async (root) => {
        if (root.authorId) {
          return await User.findOne({ id: root.authorId });
        } else {
          return null;
        }
      },
  },

  Mutation: {
    createBlog: async (_, { title, img, description, body, authorId, size }) => {
      let b = new Blog({
        title: title,
        img: img,
        description: description,
        body: body,
        authorId: authorId,
        size: size,
        likeIds: [],
        commentIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      b.id = b._id;
      await b.save();
      return b;
    },

    updateBlog: async (_, { id, title, img, description, body, authorId, size }) => {
      const b = await Blog.findOneAndUpdate(
        {
          id,
        },
        {
          title,
          img,
          description,
          body,
          authorId,
          size,
          dateModified: new Date(),
        }
      );
      return b;
    },
    deleteBlog: async (_, { id }) => {
      const b = await Blog.deleteOne({ id });
      if (b) {
        return true;
      } else {
        return false;
      }
    },
  },
};

import { gql } from "apollo-server-express";
import { User } from "./users";
export const BlogTypes = gql`
  extend type Query {
    getBlogs(lastDate: String): PaginatedBlogs
    # deleteAllBlogs: Boolean
    getBlog(title: String! ): Blog
  }

  type PaginatedBlogs {
    blog: [Blog]
    count: Int
  }

  type Blog {
    id: String!
    author: User
    title: String!
    description: String!
    body: String!
    img: String
    size: Int
    likes: [String]
    comments: PaginatedComments
    dateCreated: Date!
    dateModified: Date!
  }

  extend type Mutation {
    createBlog(
      title: String!
      img: String
      description: String!
      body: String!
      authorId: String!
      size: Int
    ): Blog!
    updateBlog(
      id: String!
      title: String
      img: String
      description: String
      body: String
      authorId: String!
      size: Int
    ): Blog!
    deleteBlog(id: String): Boolean
  }
`;
