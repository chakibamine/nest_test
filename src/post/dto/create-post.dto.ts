export class CreatePostDto {
    title: string;
    content: string;
    author: string;
    userId: number;
    createdAt?: Date;
    updatedAt?: Date;
}
