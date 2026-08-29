import { NextFunction, Response, Request } from "express";
import fsPromises from 'fs/promises';
import path from 'path';
import dayjs from "dayjs";
import { v4 as uuidv4 } from 'uuid';


const logEvents = async (message: string = '', logName: string) => {
    const dateTime = dayjs().format('{YYYY} MM-DDTHH:mm:ss SSS [Z] A');
    const logMessage = `${dateTime}\t${uuidv4()}\t${message}\n`;
    const logsDir = path.join(__dirname, '..', 'logs');

    try {
        try {
            await fsPromises.access(logsDir);
        } catch {
            await fsPromises.mkdir(logsDir, { recursive: true });
        }

        await fsPromises.appendFile(path.resolve(logsDir, logName), logMessage);
    } catch (err) {
        console.log(err);
    }
}

export const logger = (req: Request, res: Response, next: NextFunction) => {
    logEvents(`${req.method}\t${req.headers.origin}\t${req.url}`, 'reqLog.txt');
    console.log(`${req.method} ${req.path}`);
    next();
}