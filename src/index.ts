import { ApolloServer } from "apollo-server-express";
import * as bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import DataLoader from "dataloader";
// https://medium.com/@th.guibert/basic-apollo-express-graphql-api-with-typescript-2ee021dea2c
// https://www.youtube.com/watch?v=uCbFMZYQbxE n+1 problem use dataloader
import express from "express";
import depthLimit from "graphql-depth-limit";
import { createServer } from "http";
import mongoose from "mongoose";

import { BlogResolvers, BlogTypes } from "./resolvers/blog"
import { ContentResolvers, ContentTypes } from "./resolvers/content"
import { Comment, QandAResolvers, QandATypes } from "./resolvers/questionAndAnswer";
import { RelationshipResolvers, RelationshipTypes } from "./resolvers/relationship"
import { UserResolvers, UserTypes } from "./resolvers/users"

mongoose.connect("mongodb://localhost:27017/personalityApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.set("debug", true);
export const redis = require("redis");

(async () => {
  const app = express();
  const server = new ApolloServer({
    typeDefs: [QandATypes, UserTypes, ContentTypes, RelationshipTypes, BlogTypes],
    resolvers: [QandAResolvers, UserResolvers, ContentResolvers, RelationshipResolvers, BlogResolvers],
    context: () => {
      return {
        commentLoader: new DataLoader(async (keys: any) => {
          const comments = await Comment.find({ id: { $in: keys } });

          let commentsMap: Map<string, any> = new Map<string, any>();
          comments.forEach((c: any) => {
            commentsMap.set(c.id, c);
          });

          return keys.map((key: any) => commentsMap.get(key));
        }),
      };
    },
    validationRules: [depthLimit(7)],
  });
  app.use("*", cors());
  app.use(compression());
  app.use(bodyParser.json({ limit: "50mb" }));
  server.applyMiddleware({ app, path: "/graphql" });
  const httpServer = createServer(app);
  httpServer.listen({ port: 3002 }, (): void =>
    console.log(
      `\n🚀   GraphQL is now running on http://localhost:3002/graphql`
    )
  );
})();
