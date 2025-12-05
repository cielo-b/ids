import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { HttpExceptionFilter } from "@app/common";
import { MenuModule } from "./menu.module";

async function bootstrap() {
  const app = await NestFactory.create(MenuModule);

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
    .setTitle("Bill Me - Menu Service")
    .setDescription("Menu and product management microservice API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3007;
  await app.listen(port);

  console.log(`🚀 Menu Service is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`
  );
}

bootstrap();
