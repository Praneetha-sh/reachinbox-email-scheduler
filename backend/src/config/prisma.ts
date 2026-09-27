import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3307,
  user: "reachinbox",
  password: "reachinboxpassword",
  database: "reachinbox",
  connectionLimit: 5,
});

export const prisma = new PrismaClient({
  adapter,
});