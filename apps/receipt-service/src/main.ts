import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { HttpExceptionFilter } from "@app/common";
import { ReceiptModule } from "./receipt.module";

async function bootstrap() {
  const app = await NestFactory.create(ReceiptModule);

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Bill Me - Receipt Service")
    .setDescription("Digital receipts with QR codes microservice API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3010;
  await app.listen(port);

  console.log(`🚀 Receipt Service is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`
  );
}

bootstrap();
