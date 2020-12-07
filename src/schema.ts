import { GraphQLSchema } from "graphql";
import { makeExecutableSchema } from "graphql-tools";

import { Resolvers } from "./resolvers/Resolvers";
import * as typeDefs from "./schema/schema.graphql";

import "graphql-import-node";

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers: Resolvers,
});
export default schema;
