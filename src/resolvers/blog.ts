import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

const Schema = mongoose.Schema;
import { Comment } from "./questionAndAnswer";
export const Blog = mongoose.model(
  "Blog",
  new Schema({
    id: String!,
    title: String!,
    img: String!,
    description: String,
    preview: String,
    body: String,
    author: String!,
    likeIds: [String],
    commentIds: [String],
    dateCreated: Date,
    dateModified: Date,
  })
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
  },

  Mutation: {
    createBlog: async (_, { title, img, description, body, author }) => {
      let b = new Blog({
        title: title,
        img: img,
        description: description,
        preview: body.slice(0, 50),
        body: body,
        author: author,
        likeIds: [],
        commentIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      b.id = b._id;
      await b.save();
      return b;
    },

    updateBlog: async (_, { id, title, img, description, body, author }) => {
      const b = await Blog.findOneAndUpdate(
        {
          id,
        },
        {
          title,
          img,
          description,
          body,
          author,
          preview: body.slice(0, 50),
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

export const BlogTypes = gql`
  extend type Query {
    getBlogs(lastDate: String): PaginatedBlogs
    # deleteAllBlogs: Boolean
  }

  type PaginatedBlogs {
    blog: [Blog]
    count: Int
  }

  type Blog {
    id: String!
    title: String!
    description: String!
    body: String!
    img: String
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
      author: String!
    ): Blog!
    updateBlog(
      id: String
      title: String!
      img: String
      description: String!
      body: String!
    ): Blog!
    deleteBlog(id: String): Boolean
  }
`;
