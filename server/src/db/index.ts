import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

export default new Sequelize({
    dialect: 'mysql',
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306, // default to 3306 if not set
    logging: false,
});
