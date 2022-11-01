import { gql, ApolloServer } from 'apollo-server';
import {Neo4jGraphQL} from "@neo4j/graphql";

import * as neo4j from 'neo4j-driver'
import {config} from "dotenv";

config();

const interfaces = gql`
    interface Person {
        name: String!
        games: [Game!]! @relationship(type: "PLAYS", direction: OUT)
        teams: [Team!]! @relationship(type: "HAS_TEAM", direction: OUT)
        languages: [Language!]! @relationship(type: "HAS_LANGUAGE", direction: OUT)
    }
`;

const typeDefs = gql`
  ${interfaces}
  
  type Query {
     playersNamesByLanguage(language: String!, limit: Int = 10): [String!]!
        @cypher(statement: """
            MATCH ()<-[:PLAYS]-(p:User:Stream)-[]->(l:Language)
            WHERE l.name = $language
            RETURN collect(DISTINCT p.name)[0..$limit]
        """)
  }
  
  type Language {
    name: String!
    people: [Person!]! @relationship(type: "HAS_LANGUAGE", direction: IN)
  }
  
  type Team {
    createdAt: DateTime!
    id: Int!
    name: String!
    people: [Person!]! @relationship(type: "HAS_TEAM", direction: IN)
  }

  type Game {
    name: String!
    people: [Person!]! @relationship(type: "PLAYS", direction: IN)
  }
  
  type User implements Person {
    name: String!
    games: [Game!]!
    teams: [Team!]!
    languages: [Language!]!
  }
  
  type Stream implements Person {
    name: String!
    createdAt: DateTime!
    description: String!
    followers: Int!
    id: Int!
    total_view_count: Int!
    url: String!
    games: [Game!]!
    teams: [Team!]!
    languages: [Language!]!
  }
 
`;

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

neoSchema.getSchema().then((schema) => {
    const server = new ApolloServer({
        schema: schema,
    });

    server.listen().then(({ url }) => {
        console.log(`GraphQL server ready on ${url}`);
    });
});