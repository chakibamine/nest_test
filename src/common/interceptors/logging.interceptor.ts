import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLoggerService } from '../logger/custom-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setContext('HTTP');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body } = request;
        const now = Date.now();

        this.logger.log(`Incoming Request: ${method} ${url}`);
        if (Object.keys(body || {}).length > 0) {
            this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
        }

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const response = context.switchToHttp().getResponse();
                    const { statusCode } = response;
                    const responseTime = Date.now() - now;

                    this.logger.log(
                        `Response: ${method} ${url} - Status: ${statusCode} - ${responseTime}ms`
                    );
                },
                error: (error) => {
                    const responseTime = Date.now() - now;
                    this.logger.error(
                        `Error: ${method} ${url} - ${error.message} - ${responseTime}ms`,
                        error.stack
                    );
                },
            })
        );
    }
}