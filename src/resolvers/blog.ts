import { IResolvers } from "graphql-tools";
import mongoose from "mongoose";

const Schema = mongoose.Schema;
import { Comment } from "./questionAndAnswer";

const BlogSchema = new Schema({
    id: String!,
    title: String!,
    img: String!,
    imgText: String,
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
      const checkTitle = title.replace(/-/g, ' ')
      return await Blog.findOne({title: checkTitle})
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
    createBlog: async (_, { id, title, img, imgText, description, body, authorId, size }) => {
      let b = new Blog({
        id: id,
        title: title,
        img: img,
        imgText: imgText,
        description: description,
        body: body,
        authorId: authorId,
        size: size,
        likeIds: [],
        commentIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
      });
      await b.save();
      return b;
    },

    updateBlog: async (_, { id, title, img, imgText, description, body, authorId, size }) => {
      const b = await Blog.findOneAndUpdate(
        {
          id,
        },
        {
          title,
          img,
          imgText,
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
    imgText: String
    size: Int
    likes: [String]
    comments: PaginatedComments
    dateCreated: Date!
    dateModified: Date!
  }

  extend type Mutation {
    createBlog(
      id: String!
      title: String!
      img: String
      imgText: String
      description: String!
      body: String!
      authorId: String!
      size: Int
    ): Blog!
    updateBlog(
      id: String!
      title: String
      img: String
      imgText: String
      description: String
      body: String
      authorId: String!
      size: Int
    ): Blog!
    deleteBlog(id: String): Boolean
  }
`;
