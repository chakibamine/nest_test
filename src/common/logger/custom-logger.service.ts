import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class CustomLoggerService implements LoggerService {
    private logger: winston.Logger;
    private context?: string;

    constructor() {
        // Ensure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Daily rotate transport for all logs
        const dailyRotateFileTransport = new DailyRotateFile({
            filename: path.join(logsDir, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true, // Compress old logs
            maxSize: '20m', // Rotate when file reaches 20MB
            maxFiles: '14d', // Keep logs for 14 days
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            ),
        });

        // Daily rotate transport for error logs only
        const errorRotateFileTransport = new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d', // Keep error logs for 30 days
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            ),
        });

        // Create Winston logger
        this.logger = winston.createLogger({
            level: 'debug',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json()
            ),
            transports: [
                dailyRotateFileTransport,
                errorRotateFileTransport,

                // Console output with colors
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context, trace }) => {
                            const ctx = context || 'Application';
                            let log = `[${timestamp}] [${level}] [${ctx}] ${message}`;
                            if (trace) {
                                log += `\n${trace}`;
                            }
                            return log;
                        })
                    ),
                }),
            ],
        });

        // Log rotation events
        dailyRotateFileTransport.on('rotate', (oldFilename, newFilename) => {
            this.logger.info(`Log file rotated from ${oldFilename} to ${newFilename}`);
        });
    }

    setContext(context: string) {
        this.context = context;
    }

    log(message: any, context?: string) {
        const logContext = context || this.context || 'Application';
        this.logger.info(this.formatMessage(message), { context: logContext });
    }

    error(message: any, trace?: string, context?: string) {
        const logContext = context || this.context || 'Application';
        this.logger.error(this.formatMessage(message), {
            context: logContext,
            trace,
        });
    }

    warn(message: any, context?: string) {
        const logContext = context || this.context || 'Application';
        this.logger.warn(this.formatMessage(message), { context: logContext });
    }

    debug(message: any, context?: string) {
        const logContext = context || this.context || 'Application';
        this.logger.debug(this.formatMessage(message), { context: logContext });
    }

    verbose(message: any, context?: string) {
        const logContext = context || this.context || 'Application';
        this.logger.verbose(this.formatMessage(message), { context: logContext });
    }

    private formatMessage(message: any): string {
        if (typeof message === 'object') {
            return JSON.stringify(message);
        }
        return String(message);
    }
}